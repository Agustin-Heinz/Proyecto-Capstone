const path = require('path');
const os = require('os');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const prisma = require('./prisma');

// Configuración del cliente de WhatsApp Web para envío de recordatorios
let whatsappListo = false;

const whatsappClient = new Client({
  authStrategy: new LocalAuth({
    dataPath: path.join(os.homedir(), '.fonotrack_wwebjs_auth')
  }),
  webVersionCache: {
    type: 'local',
    path: path.join(os.homedir(), '.fonotrack_wwebjs_cache')
  },
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

whatsappClient.on('qr', (qr) => {
  console.log('\nEscanea este código QR con tu WhatsApp para vincular FonoTrack:');
  qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
  whatsappListo = true;
  console.log('Cliente de WhatsApp conectado y listo para enviar recordatorios.');
});

whatsappClient.on('authenticated', () => {
  console.log('Sesión de WhatsApp autenticada correctamente.');
});

whatsappClient.on('auth_failure', (msg) => {
  whatsappListo = false;
  console.error('Error de autenticación en WhatsApp:', msg);
});

whatsappClient.on('disconnected', (reason) => {
  whatsappListo = false;
  console.warn('Cliente de WhatsApp desconectado:', reason);
});

// Función auxiliar para normalizar números telefónicos al formato de WhatsApp (ej: +56 9 1234 5678 -> 56912345678)
const formatearNumeroWhatsApp = (telefono) => {
  if (!telefono) return null;
  let limpio = String(telefono).replace(/\D/g, '').replace(/^0+/, '');
  if (!limpio) return null;

  if (limpio.length === 8) {
    limpio = `569${limpio}`;
  } else if (limpio.length === 9 && limpio.startsWith('9')) {
    limpio = `56${limpio}`;
  }

  return limpio;
};

// Función enviar mensajes por WhatsApp asegurando formato
const enviarMensajeWhatsApp = async (telefono, mensaje) => {
  const numeroWhatsApp = formatearNumeroWhatsApp(telefono);
  if (!numeroWhatsApp) {
    console.warn("No se encontró teléfono válido para enviar el mensaje de WhatsApp.");
    return false;
  }

  if (!whatsappListo) {
    console.warn("El cliente de WhatsApp aún no está vinculado o listo para enviar a:", numeroWhatsApp);
    return false;
  }

  try {
    const contactoRegistrado = await whatsappClient.getNumberId(numeroWhatsApp);
    const chatId = (contactoRegistrado && contactoRegistrado._serialized && contactoRegistrado._serialized.endsWith('@c.us'))
      ? contactoRegistrado._serialized
      : `${numeroWhatsApp}@c.us`;

    const msgEnviado = await whatsappClient.sendMessage(chatId, mensaje, { sendSeen: false });
    console.log("Mensaje de WhatsApp enviado exitosamente a:", chatId, "| ID:", msgEnviado?.id?._serialized || 'enviado');
    return true;
  } catch (errorWhatsApp) {
    console.error("Error enviando el mensaje por WhatsApp:", errorWhatsApp);
    return false;
  }
};

// Escuchar respuestas de pacientes por WhatsApp ("1" para confirmar, "2" para anular)
const mensajesProcesados = new Set();

const procesarRespuestaCitaWhatsApp = async (msg) => {
  try {
    const idMsg = msg.id?._serialized;
    if (idMsg && mensajesProcesados.has(idMsg)) return;

    const texto = (msg.body || '').trim().toLowerCase();
    if (!['1', '2', 'confirmar', 'anular'].includes(texto)) return;

    if (idMsg) {
      if (mensajesProcesados.size > 1000) mensajesProcesados.clear();
      mensajesProcesados.add(idMsg);
    }

    // Resolver el número telefónico real del remitente (soporta @c.us, @lid y pruebas desde el mismo número)
    let numeroRemitente = null;
    const origenId = msg.from || '';

    if (origenId.endsWith('@c.us')) {
      numeroRemitente = formatearNumeroWhatsApp(origenId.split('@')[0]);
    } else if (origenId.endsWith('@lid')) {
      try {
        const mapeo = await whatsappClient.getContactLidAndPhone([origenId]);
        if (mapeo && mapeo[0] && mapeo[0].pn) {
          numeroRemitente = formatearNumeroWhatsApp(mapeo[0].pn.split('@')[0]);
        }
      } catch (e) {
        // Ignorar error de mapeo LID
      }
      if (!numeroRemitente) {
        try {
          const contacto = await msg.getContact();
          if (contacto && contacto.number) {
            numeroRemitente = formatearNumeroWhatsApp(contacto.number);
          }
        } catch (e) {
          // Ignorar error de contacto
        }
      }
    }

    if (!numeroRemitente && msg.fromMe && whatsappClient.info?.wid?.user) {
      numeroRemitente = formatearNumeroWhatsApp(whatsappClient.info.wid.user);
    }

    if (!numeroRemitente) return;

    // Buscar todos los registros de paciente que coincidan con ese teléfono
    const todosPacientes = await prisma.pacientes.findMany();
    const idsPacientes = todosPacientes
      .filter(p => formatearNumeroWhatsApp(p.telefono) === numeroRemitente)
      .map(p => p.id_paciente);

    if (idsPacientes.length === 0) {
      await enviarMensajeWhatsApp(numeroRemitente, "No encontramos un perfil de paciente asociado a este número en FonoTrack.");
      return;
    }

    const ahora = new Date();
    const inicioDeHoy = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));

    // Buscar la próxima cita activa del paciente
    const proximaCita = await prisma.citas.findFirst({
      where: {
        id_paciente: { in: idsPacientes },
        fecha: { gte: inicioDeHoy },
        OR: [
          { estado_asistencia: { notIn: ['Anulada', 'Asistió', 'Faltó'] } },
          { estado_asistencia: null }
        ]
      },
      orderBy: [
        { fecha: 'asc' },
        { hora_inicio: 'asc' }
      ]
    });

    if (!proximaCita) {
      await enviarMensajeWhatsApp(numeroRemitente, "No tienes citas pendientes por confirmar o anular en FonoTrack.");
      return;
    }

    const fechaCita = proximaCita.fecha ? proximaCita.fecha.toISOString().split('T')[0] : '';
    const horaCita = proximaCita.hora_inicio ? proximaCita.hora_inicio.toISOString().substring(11, 16) : '00:00';

    if (texto === '1' || texto === 'confirmar') {
      await prisma.citas.update({
        where: { id_citas: proximaCita.id_citas },
        data: { estado_asistencia: 'Confirmada' }
      });

      await enviarMensajeWhatsApp(
        numeroRemitente,
        `Tu cita del *${fechaCita}* a las *${horaCita} hrs* ha sido *CONFIRMADA* exitosamente. Te esperamos en FonoTrack.`
      );
      console.log(`Cita #${proximaCita.id_citas} confirmada vía WhatsApp por ${numeroRemitente}`);
    } else if (texto === '2' || texto === 'anular') {
      await prisma.citas.update({
        where: { id_citas: proximaCita.id_citas },
        data: {
          estado_asistencia: 'Anulada',
          estado_pago: 'Cancelado'
        }
      });

      await enviarMensajeWhatsApp(
        numeroRemitente,
        `Tu cita del *${fechaCita}* a las *${horaCita} hrs* ha sido *ANULADA* correctamente. La hora ha quedado liberada en la agenda.`
      );
      console.log(`Cita #${proximaCita.id_citas} anulada vía WhatsApp por ${numeroRemitente}`);
    }
  } catch (error) {
    console.error("Error procesando respuesta de WhatsApp:", error);
  }
};

whatsappClient.on('message', (msg) => {
  if (!msg.fromMe) procesarRespuestaCitaWhatsApp(msg);
});

whatsappClient.on('message_create', (msg) => {
  if (msg.fromMe) procesarRespuestaCitaWhatsApp(msg);
});

// Función para enviar recordatorios automáticos de las citas del día siguiente (24 horas antes)
const enviarRecordatoriosManana = async () => {
  try {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const anio = manana.getFullYear();
    const mes = String(manana.getMonth() + 1).padStart(2, '0');
    const dia = String(manana.getDate()).padStart(2, '0');
    const fechaMananaStr = `${anio}-${mes}-${dia}`;

    const citasManana = await prisma.citas.findMany({
      where: {
        fecha: new Date(`${fechaMananaStr}T00:00:00.000Z`),
        OR: [
          { estado_asistencia: { not: 'Anulada' } },
          { estado_asistencia: null }
        ],
        estado_pago: { not: 'Cancelado' }
      }
    });

    if (citasManana.length === 0) {
      console.log(`Tarea programada: No hay citas agendadas para mañana (${fechaMananaStr}).`);
      return { fecha: fechaMananaStr, enviados: 0 };
    }

    let enviados = 0;
    for (const cita of citasManana) {
      const [paciente, fonoaudiologo, servicio] = await Promise.all([
        prisma.pacientes.findUnique({ where: { id_paciente: cita.id_paciente } }),
        prisma.fonoaudiologos.findUnique({ where: { id_fonoaudiologo: cita.id_fonoaudiologo } }),
        prisma.servicios.findUnique({ where: { id_servicios: cita.id_servicio } })
      ]);

      if (paciente && paciente.telefono) {
        const horaCita = cita.hora_inicio ? cita.hora_inicio.toISOString().substring(11, 16) : '00:00';
        const nombreEspecialista = fonoaudiologo?.nombre_completo || 'Especialista FonoTrack';
        const nombreServicio = servicio?.nombre_servicio || 'Atención Fonoaudiológica';

        const mensajeRecordatorio =
          `¡Hola *${paciente.nombre_completo}*!\n\n` +
          `Te recordamos que mañana tienes una cita programada en *FonoTrack*:\n\n` +
          `- *Fecha:* ${fechaMananaStr}\n` +
          `- *Hora:* ${horaCita} hrs\n` +
          `- *Especialista:* ${nombreEspecialista}\n` +
          `- *Servicio:* ${nombreServicio}\n\n` +
          `Responde con *1* para CONFIRMAR tu asistencia o con *2* para ANULAR tu cita.`;

        const ok = await enviarMensajeWhatsApp(paciente.telefono, mensajeRecordatorio);
        if (ok) enviados++;
      }
    }

    console.log(`Tarea programada: Se enviaron ${enviados} recordatorios para mañana (${fechaMananaStr}).`);
    return { fecha: fechaMananaStr, enviados };
  } catch (error) {
    console.error("Error ejecutando envío de recordatorios de mañana:", error);
    return { error: error.message };
  }
};

// Función para inicializar WhatsApp y el cron diario
const iniciarWhatsApp = () => {
  whatsappClient.initialize().catch((err) => {
    console.error('Error al inicializar WhatsApp Web:', err);
  });

  // Programación automática todos los días a las 09:00 AM
  cron.schedule('0 9 * * *', () => {
    console.log("Ejecutando revisión diaria de recordatorios de citas para mañana...");
    enviarRecordatoriosManana();
  });
};

module.exports = {
  whatsappClient,
  formatearNumeroWhatsApp,
  enviarMensajeWhatsApp,
  enviarRecordatoriosManana,
  iniciarWhatsApp
};

