const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const transporter = require('../config/mailer');
const { enviarMensajeWhatsApp } = require('../config/whatsapp');

// FICHAS CLÍNICAS: Guardar y anotar observaciones

router.post('/', async (req, res) => {
  try {
    const { id_cita, id_paciente, telefono, observaciones_clinicas, actividades_hogar, pacienteEmail, pacienteNombre, fonoaudiologoNombre } = req.body;

    // Guardamos la ficha en la base de datos
    const nuevaFicha = await prisma.evoluciones_sesion.create({
      data: {
        id_cita: parseInt(id_cita),
        observaciones_clinicas: observaciones_clinicas,
        actividades_hogar: actividades_hogar || ""
      }
    });

    // Primero, buscamos la cita para saber qué paciente y especialista corresponden
    const cita = await prisma.citas.findUnique({
      where: { id_citas: parseInt(id_cita) }
    });

    const idPacienteBusqueda = cita ? cita.id_paciente : (id_paciente ? parseInt(id_paciente) : null);
    const paciente = idPacienteBusqueda
      ? await prisma.pacientes.findUnique({ where: { id_paciente: idPacienteBusqueda } })
      : null;

    let nombreEspecialista = null;
    if (cita && cita.id_fonoaudiologo) {
      const fono = await prisma.fonoaudiologos.findUnique({
        where: { id_fonoaudiologo: cita.id_fonoaudiologo }
      });
      nombreEspecialista = fono?.nombre_completo;
    }
    if (!nombreEspecialista) {
      nombreEspecialista = fonoaudiologoNombre || 'tu especialista';
    }

    let whatsappEnviado = false;

    if (paciente) {
      // Extrae el correo en la tabla 'usuarios'
      const usuarioPaciente = await prisma.usuarios.findUnique({
        where: { id_usuario: paciente.id_usuario }
      });

      const emailDestino = (usuarioPaciente && usuarioPaciente.email) || pacienteEmail;

      // Extrae el mail del paciente para saber donde enviar la ficha
      if (emailDestino) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: emailDestino,
          subject: `FonoTrack - Resumen de tu sesión con ${nombreEspecialista}`,
          text: `Hola ${paciente.nombre_completo},\n\nEl/La especialista ${nombreEspecialista} ha registrado el resumen de tu última sesión:\n\nObservaciones Clínicas:\n${observaciones_clinicas}\n\nTareas Asignadas:\n${actividades_hogar || 'Sin tareas adicionales.'}\n\nEste es un mensaje automático generado por FonoTrack.`
        };

        // Enviamos el correo
        transporter.sendMail(mailOptions)
          .then(() => console.log(` Correo enviado a: ${emailDestino}`))
          .catch(err => console.error("Error enviando correo a paciente:", err));
      } else {
        console.log(" Ficha guardada sin correo: El usuario no tiene email registrado.");
      }

      // Enviamos el resumen de las observaciones clínicas y tareas al WhatsApp del paciente
      const telefonoDestino = paciente.telefono || telefono;
      if (telefonoDestino) {
        const fechaSesion = cita?.fecha ? String(cita.fecha.toISOString()).split('T')[0] : null;
        const lineaFecha = fechaSesion ? `📅 *Fecha de sesión:* ${fechaSesion}\n` : '';

        const mensajeFichaWhatsApp =
          `¡Hola *${paciente.nombre_completo}*! 👋\n\n` +
          `El/La especialista *${nombreEspecialista}* ha registrado las observaciones de tu sesión en *FonoTrack*:\n\n` +
          lineaFecha +
          `🩺 *Observaciones Clínicas:*\n${observaciones_clinicas || 'Sin observaciones registradas.'}\n\n` +
          `📝 *Tareas Asignadas:*\n${actividades_hogar || 'Sin tareas asignadas.'}\n\n` +
          `Puedes revisar el historial completo en tu portal de paciente de FonoTrack.`;

        whatsappEnviado = await enviarMensajeWhatsApp(telefonoDestino, mensajeFichaWhatsApp);
      }
    } else if (telefono) {
      const mensajeFichaWhatsApp =
        `¡Hola *${pacienteNombre || 'Paciente'}*! 👋\n\n` +
        `El/La especialista *${nombreEspecialista}* ha registrado las observaciones de tu sesión en *FonoTrack*:\n\n` +
        `🩺 *Observaciones Clínicas:*\n${observaciones_clinicas || 'Sin observaciones registradas.'}\n\n` +
        `📝 *Tareas Asignadas:*\n${actividades_hogar || 'Sin tareas asignadas.'}`;

      whatsappEnviado = await enviarMensajeWhatsApp(telefono, mensajeFichaWhatsApp);
    }

    res.status(201).json({ ...nuevaFicha, whatsappEnviado });
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

