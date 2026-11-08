const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const transporter = require('../config/mailer');
const { enviarMensajeWhatsApp } = require('../config/whatsapp');

// FICHAS CLÍNICAS: Guardar y anotar observaciones

router.post('/', async (req, res) => {
  try {
    const { id_cita, observaciones_clinicas, actividades_hogar, pacienteEmail, pacienteNombre, fonoaudiologoNombre } = req.body;

    // Guardamos la ficha en la base de datos
    const nuevaFicha = await prisma.evoluciones_sesion.create({
      data: {
        id_cita: parseInt(id_cita),
        observaciones_clinicas: observaciones_clinicas,
        actividades_hogar: actividades_hogar || ""
      }
    });

    // Primero, buscamos la cita para saber qué paciente es
    const cita = await prisma.citas.findUnique({
      where: { id_citas: parseInt(id_cita) }
    });

    if (cita) {
      // Ahora buscamos los datos del paciente en la tabla 'pacientes'
      const paciente = await prisma.pacientes.findUnique({
        where: { id_paciente: cita.id_paciente }
      });

      if (paciente) {
        // Extrae el correo en la tabla 'usuarios'
        const usuarioPaciente = await prisma.usuarios.findUnique({
          where: { id_usuario: paciente.id_usuario }
        });

        // Extrae el mail del paciente para saber donde enviar la ficha
        if (usuarioPaciente && usuarioPaciente.email) {
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: usuarioPaciente.email,
            subject: `FonoTrack - Resumen de tu sesión con ${fonoaudiologoNombre || 'tu especialista'}`,
            text: `Hola ${paciente.nombre_completo},\n\nEl/La especialista ${fonoaudiologoNombre || 'tu especialista'} ha registrado el resumen de tu última sesión:\n\nObservaciones Clínicas:\n${observaciones_clinicas}\n\nActividades e Indicaciones:\n${actividades_hogar}\n\nEste es un mensaje automático generado por FonoTrack.`
          };

          // Enviamos el correo
          transporter.sendMail(mailOptions)
            .then(() => console.log(` Correo enviado a: ${usuarioPaciente.email}`))
            .catch(err => console.error("Error enviando correo a paciente:", err));
        } else {
          console.log(" Ficha guardada sin correo: El usuario no tiene email registrado.");
        }

        // Enviamos también el resumen de la ficha clínica y actividades al WhatsApp del paciente
        if (paciente.telefono) {
          let nombreEspecialista = fonoaudiologoNombre;
          if (!nombreEspecialista && cita.id_fonoaudiologo) {
            const fono = await prisma.fonoaudiologos.findUnique({
              where: { id_fonoaudiologo: cita.id_fonoaudiologo }
            });
            nombreEspecialista = fono?.nombre_completo;
          }

          const mensajeFichaWhatsApp =
            `¡Hola *${paciente.nombre_completo}*!\n\n` +
            `El/La especialista *${nombreEspecialista || 'tu especialista'}* ha registrado el resumen de tu última sesión en *FonoTrack*:\n\n` +
            `*Observaciones Clínicas:*\n${observaciones_clinicas || 'Sin observaciones registradas.'}\n\n` +
            `*Actividades e Indicaciones para el Hogar:*\n${actividades_hogar || 'Sin actividades adicionales.'}\n\n` +
            `Puedes revisar el detalle completo en tu portal de paciente de FonoTrack.`;

          await enviarMensajeWhatsApp(paciente.telefono, mensajeFichaWhatsApp);
        }
      }
    }

    res.status(201).json(nuevaFicha);
  } catch (error) {
    console.error("Error al guardar la ficha:", error);
    res.status(500).json({ mensaje: "Error al guardar la ficha", detalle: error.message });
  }
});

router.get('/:id_paciente', async (req, res) => {
  try {
    const idPaciente = parseInt(req.params.id_paciente);

    const historialCitas = await prisma.citas.findMany({
      where: { id_paciente: idPaciente },
      orderBy: { fecha: 'desc' }
    });

    if (historialCitas.length === 0) return res.status(200).json([]);

    const idsCitas = historialCitas.map(c => c.id_citas);

    const evoluciones = await prisma.evoluciones_sesion.findMany({
      where: { id_cita: { in: idsCitas } }
    });

    const citasConFicha = historialCitas.map(cita => {
      const evolucionesDeEstaCita = evoluciones.filter(evo => evo.id_cita === cita.id_citas);

      return {
        ...cita,
        evoluciones_Sesion: evolucionesDeEstaCita
      };
    }).filter(cita => cita.evoluciones_Sesion.length > 0);

    res.status(200).json(citasConFicha);
  } catch (error) {
    console.error("Error al cargar el historial:", error);
    res.status(500).json({ mensaje: "Error al cargar el historial", detalle: error.message });
  }
});

module.exports = router;

