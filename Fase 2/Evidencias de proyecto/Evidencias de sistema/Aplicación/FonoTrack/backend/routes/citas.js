const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const transporter = require('../config/mailer');

// GET PACIENTES NO LOGEADOS (POR RUT)
router.get('/rut/:rut', async (req, res) => {
  try {
    const rutLimpio = req.params.rut.trim();

    // se verifica que el paciente haya guardado una cita previa
    const paciente = await prisma.pacientes.findFirst({
      where: { rut: rutLimpio }
    });

    if (!paciente) {
      return res.status(404).json({ mensaje: "Este Rut no cuenta con datos de citas" });
    }

    // Busqueda de cita registradas 
    const ahora = new Date();
    const inicioDeHoy = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));
    const proximaCita = await prisma.citas.findFirst({
      where: {
        id_paciente: paciente.id_paciente,
        fecha: { gte: inicioDeHoy },
        OR: [
          { estado_asistencia: { not: 'Anulada' } },
          { estado_asistencia: null }
        ]
      },
      orderBy: [
        { fecha: 'asc' },
        { hora_inicio: 'asc' }
      ]
    });

    if (!proximaCita) {
      return res.status(404).json({ mensaje: "No hay citas programadas." });
    }

    // Buscamos los datos del fonoaudiólogo y del servicio
    const fonoaudiologo = await prisma.fonoaudiologos.findUnique({
      where: { id_fonoaudiologo: proximaCita.id_fonoaudiologo },
      include: { ubicacion: true }
    });

    const servicio = await prisma.servicios.findUnique({
      where: { id_servicios: proximaCita.id_servicio }
    });

    // Se mandan los datos correspondientes al frontend de React
    res.status(200).json({
      id_citas: proximaCita.id_citas,
      fecha: proximaCita.fecha,
      hora_inicio: proximaCita.hora_inicio,
      estado_asistencia: proximaCita.estado_asistencia,
      nombre_fono: fonoaudiologo?.nombre_completo || 'Especialista',
      especialidad_fono: fonoaudiologo?.subespecialidad || 'Fonoaudiología',
      direccion_fono: fonoaudiologo?.id_ubicacion ? 'Ver ubicación en panel' : 'Presencial',
      nombre_servicio: servicio?.nombre_servicio || 'Atención Fonoaudiológica',
      id_fonoaudiologo: proximaCita.id_fonoaudiologo,
      id_servicio: proximaCita.id_servicio
    });

  } catch (error) {
    console.error(" Error al buscar cita con ese RUT:", error);
    res.status(500).json({ mensaje: "Error interno del servidor." });
  }
});

// GET CITAS OCUPADAS
router.get('/ocupadas', async (req, res) => {
  try {
    const { fecha, id_fonoaudiologo } = req.query;
    if (!fecha || !id_fonoaudiologo) return res.status(400).json({ mensaje: "Faltan parámetros" });

    const soloFecha = String(fecha).split('T')[0];
    const citasOcupadas = await prisma.citas.findMany({
      where: {
        fecha: new Date(`${soloFecha}T00:00:00.000Z`),
        id_fonoaudiologo: Number(id_fonoaudiologo),
        estado_asistencia: { not: 'Anulada' },
        estado_pago: { in: ['Pagado', 'Pendiente'] } // Si una cita pasa a 'Cancelado', libera la hora
      },
      select: { hora_inicio: true }
    });

    // Extraemos los 5 caracteres de la hora ("HH:MM") de forma estándar (en vez de la del equipo local)
    const horasOcupadas = citasOcupadas.map(cita => {
      return cita.hora_inicio ? cita.hora_inicio.toISOString().substring(11, 16) : null;
    }).filter(Boolean);

    res.json(horasOcupadas);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al consultar horas ocupadas", detalle: error.message });
  }
});

// POST CITAS
router.post('/', async (req, res) => {
  try {
    const { id_paciente, id_fonoaudiologo, id_servicio, fecha, hora_inicio, duracion_minutos, precio, email } = req.body;

    const soloFecha = String(fecha).split('T')[0];
    let horaLimpia = "00:00";
    if (hora_inicio) {
      const coincidencia = String(hora_inicio).match(/\d{2}:\d{2}/);
      if (coincidencia) horaLimpia = coincidencia[0];
    }
    const fechaHoraInicio = new Date(`${soloFecha}T${horaLimpia}:00.000Z`);

    let idPacienteFinal = Number(id_paciente);
    if ((!idPacienteFinal || isNaN(idPacienteFinal)) && email) {
      const usuarioPorEmail = await prisma.usuarios.findUnique({ where: { email } });
      if (usuarioPorEmail) {
        const pacPorUsuario = await prisma.pacientes.findFirst({
          where: { id_usuario: usuarioPorEmail.id_usuario },
          orderBy: { id_paciente: 'desc' }
        });
        if (pacPorUsuario) idPacienteFinal = pacPorUsuario.id_paciente;
      }
    }

    const nuevaCita = await prisma.citas.create({
      data: {
        id_paciente: idPacienteFinal || 1,
        id_fonoaudiologo: Number(id_fonoaudiologo),
        id_servicio: Number(id_servicio),
        fecha: new Date(`${soloFecha}T00:00:00.000Z`),
        hora_inicio: fechaHoraInicio,
        duracion_minutos: Number(duracion_minutos),
        precio: Number(precio),
        estado_pago: "Pagado",
        estado_asistencia: "Pendiente"
      }
    });

    const pacienteInfo = await prisma.pacientes.findUnique({
      where: { id_paciente: idPacienteFinal || 1 }
    });

    let usuarioInfo = null;
    if (pacienteInfo && pacienteInfo.id_usuario) {
      usuarioInfo = await prisma.usuarios.findUnique({
        where: { id_usuario: pacienteInfo.id_usuario }
      });
    }

    const destinatarioEmail = email || (usuarioInfo && usuarioInfo.email);

    // 2. Armamos y enviamos el correo electrónico
    if (destinatarioEmail) {
      const nombrePaciente = pacienteInfo?.nombre_completo || "Paciente";
      const remitente = process.env.EMAIL_USER || 'diegosepulveda6721@gmail.com';
      const opcionesCorreo = {
        from: `"FonoTrack Clínico" <${remitente}>`,
        to: destinatarioEmail,
        subject: "Confirmación de Cita Médica - FonoTrack",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #E2E6EF; border-radius: 14px;">
            <h2 style="color: #4F46E5;">¡Hola ${nombrePaciente}!</h2>
            <p>Tu hora ha sido confirmada exitosamente en FonoTrack.</p>
            <ul>
              <li><strong>Fecha:</strong> ${String(fecha).split('T')[0]}</li>
              <li><strong>Hora:</strong> ${hora_inicio || '00:00'}</li>
            </ul>
            <p>¡Te esperamos!</p>
          </div>
        `
      };

      try {
        await transporter.sendMail(opcionesCorreo);
        console.log("Correo de confirmación enviado exitosamente a:", destinatarioEmail);
      } catch (errorCorreo) {
        console.error("Error enviando el correo:", errorCorreo);
      }
    } else {
      console.warn("No se encontró correo para enviar la confirmación de la cita.");
    }
    res.status(201).json(nuevaCita);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al guardar la cita", detalle: error.message });
  }
});

// PUT CITAS: CONFIRMAR O ANULAR
router.put('/:id/estado', async (req, res) => {
  try {
    const idCita = Number(req.params.id);
    const { estado_asistencia } = req.body; // Recibirá 'Confirmada' o 'Anulada'

    // Si el paciente anula, cambiamos el pago a Cancelado para liberar la hora en el directorio
    const estadoPago = estado_asistencia === 'Anulada' ? 'Cancelado' : undefined;

    const citaActualizada = await prisma.citas.update({
      where: { id_citas: idCita },
      data: {
        estado_asistencia: estado_asistencia,
        ...(estadoPago && { estado_pago: estadoPago })
      }
    });

    res.status(200).json(citaActualizada);
  } catch (error) {
    console.error(" Error al actualizar estado de la cita:", error);
    res.status(500).json({ mensaje: "Error al actualizar la cita", detalle: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const idBuscado = parseInt(req.params.id);

    const citaActualizada = await prisma.citas.update({
      where: { id_citas: idBuscado },
      data: { estado_pago: 'Pagado' }
    });

    console.log(`Pago actualizado para la cita ID: ${idBuscado}`);
    res.status(200).json(citaActualizada);
  } catch (error) {
    console.error("Error al actualizar pago:", error);
    res.status(500).json({ mensaje: "Error al actualizar la cita", detalle: error.message });
  }
});

// GET CITAS
router.get('/', async (req, res) => {
  try {
    const { id_fonoaudiologo } = req.query;
    const condicion = {
      where: {
        ...(id_fonoaudiologo ? { id_fonoaudiologo: parseInt(id_fonoaudiologo) } : {}),
        OR: [
          { estado_asistencia: { not: 'Anulada' } },
          { estado_asistencia: null }
        ]
      }
    };

    const historialCitas = await prisma.citas.findMany(condicion);
    const listaPacientes = await prisma.pacientes.findMany();
    const listaServicios = await prisma.servicios.findMany();

    const citasCompletas = historialCitas.map(cita => {
      const paciente = listaPacientes.find(p => p.id_paciente === cita.id_paciente);
      const servicio = listaServicios.find(s => s.id_servicios === cita.id_servicio);

      return {
        ...cita,
        nombre_paciente: paciente ? paciente.nombre_completo : `Paciente #${cita.id_paciente}`,
        nombre_servicio: servicio ? servicio.nombre_servicio : `Servicio #${cita.id_servicio}`
      };
    });

    res.status(200).json(citasCompletas);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al buscar citas", detalle: error.message });
  }
});

router.put('/:id/pago', async (req, res) => {
  try {
    const idCita = parseInt(req.params.id);
    const citaActualizada = await prisma.citas.update({
      where: { id_citas: idCita },
      data: { estado_pago: 'Pagado' }
    });
    res.status(200).json(citaActualizada);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar pago", detalle: error.message });
  }
});

module.exports = router;

