const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const transporter = require('../config/mailer');
const { enviarMensajeWhatsApp } = require('../config/whatsapp');

// FICHAS CLÍNICAS: Guardar y anotar observaciones

router.post('/', async (req, res) => {
  try {
    const {
      id_cita,
      id_paciente,
      id_fonoaudiologo,
      telefono,
      observaciones_clinicas,
      actividades_hogar,
      pacienteEmail,
      pacienteNombre,
      fonoaudiologoNombre
    } = req.body;

    let idCitaFinal = id_cita ? parseInt(id_cita) : null;

    // Si el paciente fue ingresado manualmente y aún no tiene una cita asociada, creamos una sesión clínica base
    if (!idCitaFinal && id_paciente) {
      const fonoId = id_fonoaudiologo ? parseInt(id_fonoaudiologo) : 2;
      const servicioFono = await prisma.servicios.findFirst({
        where: { id_fonoaudiologo: fonoId }
      });

      const ahora = new Date();
      const soloFecha = ahora.toISOString().split('T')[0];
      const hh = String(ahora.getHours()).padStart(2, '0');
      const mm = String(ahora.getMinutes()).padStart(2, '0');

      const citaBase = await prisma.citas.create({
        data: {
          id_paciente: parseInt(id_paciente),
          id_fonoaudiologo: fonoId,
          id_servicio: servicioFono ? servicioFono.id_servicios : 1,
          fecha: new Date(`${soloFecha}T00:00:00.000Z`),
          hora_inicio: new Date(`${soloFecha}T${hh}:${mm}:00.000Z`),
          duracion_minutos: 50,
          precio: servicioFono ? servicioFono.precio : 25000,
          estado_asistencia: 'Asistió',
          estado_pago: 'Pagado'
        }
      });

      idCitaFinal = citaBase.id_citas;
    }

    if (!idCitaFinal) {
      return res.status(400).json({ mensaje: 'No se pudo determinar la cita o el paciente para guardar la evolución.' });
    }

    // Guardamos la ficha en la base de datos
    const nuevaFicha = await prisma.evoluciones_sesion.create({
      data: {
        id_cita: idCitaFinal,
        observaciones_clinicas: observaciones_clinicas,
        actividades_hogar: actividades_hogar || ""
      }
    });

    // Al registrar la evolución de la sesión, marcamos la cita como "Asistió" (Atendida)
    const cita = await prisma.citas.update({
      where: { id_citas: idCitaFinal },
      data: { estado_asistencia: 'Asistió' }
    }).catch(async () => {
      return prisma.citas.findUnique({ where: { id_citas: idCitaFinal } });
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

// EDITAR UNA EVOLUCIÓN EXISTENTE
router.put('/:id_fichas', async (req, res) => {
  try {
    const idFicha = parseInt(req.params.id_fichas);
    const {
      observaciones_clinicas,
      actividades_hogar,
      reenviarWhatsApp,
      telefono,
      pacienteNombre,
      fonoaudiologoNombre
    } = req.body;

    const fichaActualizada = await prisma.evoluciones_sesion.update({
      where: { id_fichas: idFicha },
      data: {
        ...(observaciones_clinicas !== undefined && { observaciones_clinicas }),
        ...(actividades_hogar !== undefined && { actividades_hogar })
      }
    });

    let whatsappEnviado = false;

    if (reenviarWhatsApp) {
      const cita = await prisma.citas.findUnique({
        where: { id_citas: fichaActualizada.id_cita }
      });
      const paciente = cita
        ? await prisma.pacientes.findUnique({ where: { id_paciente: cita.id_paciente } })
        : null;
      const fono = (cita && cita.id_fonoaudiologo)
        ? await prisma.fonoaudiologos.findUnique({ where: { id_fonoaudiologo: cita.id_fonoaudiologo } })
        : null;

      const telefonoDestino = paciente?.telefono || telefono;
      const nombrePac = paciente?.nombre_completo || pacienteNombre || 'Paciente';
      const nombreEsp = fono?.nombre_completo || fonoaudiologoNombre || 'tu especialista';

      if (telefonoDestino) {
        const fechaSesion = cita?.fecha ? String(cita.fecha.toISOString()).split('T')[0] : null;
        const lineaFecha = fechaSesion ? `📅 *Fecha de sesión:* ${fechaSesion}\n` : '';
        const mensajeActualizado =
          `¡Hola *${nombrePac}*! 👋\n\n` +
          `El/La especialista *${nombreEsp}* ha actualizado las observaciones de tu sesión en *FonoTrack*:\n\n` +
          lineaFecha +
          `🩺 *Observaciones Clínicas:*\n${fichaActualizada.observaciones_clinicas || 'Sin observaciones registradas.'}\n\n` +
          `📝 *Tareas Asignadas:*\n${fichaActualizada.actividades_hogar || 'Sin tareas asignadas.'}`;

        whatsappEnviado = await enviarMensajeWhatsApp(telefonoDestino, mensajeActualizado);
      }
    }

    res.status(200).json({ ...fichaActualizada, whatsappEnviado });
  } catch (error) {
    console.error("Error al actualizar la evolución:", error);
    res.status(500).json({ mensaje: "Error al actualizar la evolución", detalle: error.message });
  }
});

module.exports = router;

