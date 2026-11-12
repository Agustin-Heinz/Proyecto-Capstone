const path = require('path');
const os = require('os');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { LoadUtils } = require('whatsapp-web.js/src/util/Injected/Utils');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const prisma = require('./prisma');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuración del cliente de WhatsApp Web para envío de recordatorios
let whatsappListo = false;
let whatsappAutenticado = false;
let ultimoTelefonoEnviado = null;

const whatsappClient = new Client({
  authStrategy: new LocalAuth({
    dataPath: path.join(os.homedir(), '.fonotrack_wwebjs_auth')
  }),
  webVersionCache: {
    type: 'none'
  },
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Registra un listener directo sobre WAWebCollections.Msg en la página de Puppeteer
const registrarListenerMensajesDirecto = async () => {
  if (!whatsappClient.pupPage || whatsappClient.pupPage.isClosed()) return;

  try {
    await whatsappClient.pupPage.exposeFunction('onFonoTrackMensajeEntrante', (msgSerializado) => {
      procesarRespuestaCitaWhatsApp(msgSerializado);
    });
  } catch (e) {
    // La función ya fue expuesta previamente en la página
  }

  try {
    await whatsappClient.pupPage.evaluate(() => {
      if (window.__fonoTrackListenerActivo) return true;
      const colecciones = window.require && window.require('WAWebCollections');
      const Msg = colecciones?.Msg;
      if (!Msg || typeof Msg.on !== 'function') return false;

      window.__fonoTrackListenerActivo = true;

      const construirPayload = (msg) => {
        try {
          if (window.WWebJS && typeof window.WWebJS.getMessageModel === 'function') {
            return window.WWebJS.getMessageModel(msg);
          }
        } catch (e) {}
        return {
          id: msg.id,
          body: msg.body || '',
          type: msg.type || 'chat',
          from: msg.from?._serialized || msg.from || msg.id?.remote?._serialized || msg.id?.remote || '',
          to: msg.to?._serialized || msg.to || '',
          fromMe: Boolean(msg.id?.fromMe ?? msg.fromMe),
          isStatus: Boolean(msg.isStatusV3 || msg.isStatus)
        };
      };

      Msg.on('add', (msg) => {
        try {
          if (!msg.isNewMsg) return;
          if (msg.type === 'ciphertext') {
            msg.once('change:type', () => {
              if (msg.type !== 'revoked' && typeof window.onFonoTrackMensajeEntrante === 'function') {
                window.onFonoTrackMensajeEntrante(construirPayload(msg));
              }
            });
            return;
          }
          if (typeof window.onFonoTrackMensajeEntrante === 'function') {
            window.onFonoTrackMensajeEntrante(construirPayload(msg));
          }
        } catch (err) {}
      });

      return true;
    });
  } catch (err) {
    // Ignorar si aún no cargan las colecciones
  }
};

// Verifica e inyecta WWebJS si la sesión ya autenticó pero el evento 'ready' no se disparó
const asegurarClienteListo = async () => {
  if (whatsappListo && whatsappClient.pupPage && !whatsappClient.pupPage.isClosed()) {
    try {
      const tieneWWebJS = await whatsappClient.pupPage.evaluate(() => typeof window.WWebJS !== 'undefined');
      await registrarListenerMensajesDirecto();
      if (tieneWWebJS) return true;
    } catch (e) {
      // Continuar a verificación completa
    }
  }

  if (!whatsappClient.pupPage || whatsappClient.pupPage.isClosed()) {
    return false;
  }

  try {
    const estado = await whatsappClient.pupPage.evaluate(() => {
      try {
        const sock = window.require && window.require('WAWebSocketModel')?.Socket;
        const wid = window.require && (
          window.require('WAWebUserPrefsMeUser')?.getMaybeMePnUser() ||
          window.require('WAWebUserPrefsMeUser')?.getMaybeMeLidUser()
        );
        return {
          hasSynced: Boolean(sock?.hasSynced),
          state: sock?.state || null,
          hasWid: Boolean(wid),
          hasWWebJS: typeof window.WWebJS !== 'undefined'
        };
      } catch (err) {
        return { error: err.message };
      }
    });

    if (estado && (estado.hasSynced || estado.hasWid || whatsappAutenticado)) {
      if (!estado.hasWWebJS) {
        await whatsappClient.pupPage.evaluate(LoadUtils);
      }
      try {
        await whatsappClient.attachEventListeners();
      } catch (e) {
        // Ignorar si falla algún módulo secundario de attachEventListeners
      }
      await registrarListenerMensajesDirecto();

      const verificado = await whatsappClient.pupPage.evaluate(() => typeof window.WWebJS !== 'undefined');
      if (verificado) {
        if (!whatsappListo) {
          whatsappListo = true;
          console.log('Cliente de WhatsApp conectado y listo para enviar recordatorios.');
        }
        return true;
      }
    }
  } catch (err) {
    // La página puede estar navegando aún
  }
  return false;
};

whatsappClient.on('qr', (qr) => {
  console.log('\nEscanea este código QR con tu WhatsApp para vincular FonoTrack:');
  qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
  whatsappListo = true;
  whatsappAutenticado = true;
  registrarListenerMensajesDirecto();
  console.log('Cliente de WhatsApp conectado y listo para enviar recordatorios.');
});

whatsappClient.on('authenticated', () => {
  whatsappAutenticado = true;
  console.log('Sesión de WhatsApp autenticada correctamente.');
  setTimeout(() => {
    if (!whatsappListo) {
      asegurarClienteListo();
    }
  }, 4000);
});

whatsappClient.on('auth_failure', (msg) => {
  whatsappListo = false;
  whatsappAutenticado = false;
  console.error('Error de autenticación en WhatsApp:', msg);
});

whatsappClient.on('disconnected', (reason) => {
  whatsappListo = false;
  whatsappAutenticado = false;
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

// Registro de mensajes enviados automáticamente por el bot para evitar bucles en pruebas desde el mismo número
const mensajesEnviadosPorBotIds = new Set();
const mensajesEnviadosPorBotTexto = new Map();

// Función enviar mensajes por WhatsApp asegurando formato
const enviarMensajeWhatsApp = async (telefono, mensaje) => {
  const numeroWhatsApp = formatearNumeroWhatsApp(telefono);
  if (!numeroWhatsApp) {
    console.warn("No se encontró teléfono válido para enviar el mensaje de WhatsApp.");
    return false;
  }

  if (!whatsappListo) {
    for (let i = 0; i < 15; i++) {
      const listo = await asegurarClienteListo();
      if (listo) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (!whatsappListo) {
    console.warn("El cliente de WhatsApp aún no está vinculado o listo para enviar a:", numeroWhatsApp);
    return false;
  }

  try {
    let chatId = `${numeroWhatsApp}@c.us`;
    try {
      const contactoRegistrado = await whatsappClient.getNumberId(numeroWhatsApp);
      if (contactoRegistrado && contactoRegistrado._serialized && contactoRegistrado._serialized.endsWith('@c.us')) {
        chatId = contactoRegistrado._serialized;
      }
    } catch (e) {
      // Usar chatId por defecto si getNumberId falla
    }

    const textoLimpio = String(mensaje || '').trim();
    if (textoLimpio) {
      if (mensajesEnviadosPorBotTexto.size > 500) mensajesEnviadosPorBotTexto.clear();
      mensajesEnviadosPorBotTexto.set(textoLimpio, Date.now());
    }

    const msgEnviado = await whatsappClient.sendMessage(chatId, mensaje, { sendSeen: false });
    const idEnviado = msgEnviado?.id?._serialized;
    if (idEnviado) {
      if (mensajesEnviadosPorBotIds.size > 1000) mensajesEnviadosPorBotIds.clear();
      mensajesEnviadosPorBotIds.add(idEnviado);
    }

    ultimoTelefonoEnviado = numeroWhatsApp;
    console.log("Mensaje de WhatsApp enviado exitosamente a:", chatId, "| ID:", idEnviado || 'enviado');
    return true;
  } catch (errorWhatsApp) {
    console.error("Error enviando el mensaje por WhatsApp:", errorWhatsApp);
    return false;
  }
};

// Verifica si un mensaje entrante fue generado por el propio bot de FonoTrack
const esMensajePropioDelBot = (msg) => {
  const idMsg = msg.id?._serialized;
  if (idMsg && mensajesEnviadosPorBotIds.has(idMsg)) return true;

  const textoOriginal = (msg.body || '').trim();
  if (!textoOriginal) return true;

  const marcaTiempo = mensajesEnviadosPorBotTexto.get(textoOriginal);
  if (marcaTiempo && Date.now() - marcaTiempo < 60000) return true;

  const prefijosBot = [
    '🤖',
    '¡Hola *',
    'Tu cita del *',
    'No encontramos un perfil de paciente',
    'No tienes citas pendientes por confirmar'
  ];
  return prefijosBot.some((prefijo) => textoOriginal.startsWith(prefijo));
};

// Normaliza un RUT eliminando puntos, guiones y espacios para comparación exacta
const normalizarRut = (rut) => {
  if (!rut) return '';
  return String(rut).replace(/[^0-9kK]/g, '').toUpperCase();
};

// Detecta si el texto del usuario contiene un RUT y busca el paciente correspondiente
const buscarRutEnMensaje = (texto, todosPacientes) => {
  const textoLimpio = (texto || '').trim();
  if (!textoLimpio) return { rutDetectado: null, paciente: null, preguntaAdicional: '' };

  // 1. Buscar coincidencia mediante expresión regular de RUT chileno (con o sin puntos/guión)
  const regexRut = /\b(\d{1,2}\.\d{3}\.?\d{3}-?[\dkK]|\d{6,9}-[\dkK]|\d{7,9}[\dkK])\b/i;
  const match = textoLimpio.match(regexRut);

  if (match) {
    const rutTexto = match[1];
    const rutNorm = normalizarRut(rutTexto);
    const paciente = todosPacientes.find((p) => normalizarRut(p.rut) === rutNorm) || null;
    const preguntaAdicional = textoLimpio.replace(match[0], '').replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, '');
    return { rutDetectado: rutTexto, paciente, preguntaAdicional };
  }

  // 2. Verificar si el mensaje completo normalizado coincide con algún RUT registrado en la BD
  const msgNorm = normalizarRut(textoLimpio);
  if (msgNorm.length >= 5 && /^[\dK]+$/.test(msgNorm)) {
    const pacienteDirecto = todosPacientes.find((p) => normalizarRut(p.rut) === msgNorm);
    if (pacienteDirecto) {
      return { rutDetectado: pacienteDirecto.rut, paciente: pacienteDirecto, preguntaAdicional: '' };
    }
  }

  return { rutDetectado: null, paciente: null, preguntaAdicional: textoLimpio };
};

// Sesiones verificadas por RUT para cada teléfono de WhatsApp
const sesionesRutPorTelefono = new Map();

// Obtiene únicamente los horarios libres reales creados por el fonoaudiólogo en prisma.disponibilidad (descartando los ya ocupados en prisma.citas)
const obtenerHorariosDisponiblesEspecialista = async (idFonoaudiologo = null, idServicio = null) => {
  const ahora = new Date();
  const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  const inicioDeHoy = new Date(`${hoyStr}T00:00:00.000Z`);

  const [todosFonos, todosServicios, todaDisponibilidad, citasOcupadasBD] = await Promise.all([
    prisma.fonoaudiologos.findMany(),
    prisma.servicios.findMany(),
    prisma.disponibilidad.findMany({ orderBy: { id_disponibilidad: 'desc' } }),
    prisma.citas.findMany({
      where: {
        fecha: { gte: inicioDeHoy },
        AND: [
          {
            OR: [
              { estado_asistencia: { not: 'Anulada' } },
              { estado_asistencia: null }
            ]
          },
          {
            OR: [
              { estado_pago: { not: 'Cancelado' } },
              { estado_pago: null }
            ]
          }
        ]
      }
    })
  ]);

  const mapaFonos = new Map(todosFonos.map((f) => [f.id_fonoaudiologo, f]));
  const mapaServicios = new Map(todosServicios.map((s) => [s.id_servicios, s]));

  // Conjunto de bloques ya reservados en prisma.citas: "id_fonoaudiologo|YYYY-MM-DD|HH:MM"
  const ocupadosSet = new Set(
    citasOcupadasBD.map((c) => {
      const fStr = c.fecha ? c.fecha.toISOString().split('T')[0] : '';
      let hStr = '';
      if (c.hora_inicio) {
        const iso = c.hora_inicio instanceof Date ? c.hora_inicio.toISOString() : String(c.hora_inicio);
        const match = iso.match(/(\d{2}:\d{2})/);
        hStr = match ? match[1] : iso.substring(11, 16);
      }
      return `${c.id_fonoaudiologo}|${fStr}|${hStr}`;
    })
  );

  const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const formatearEtiquetaSlot = (fechaStr, horaStr) => {
    const [yyyy, mm, dd] = fechaStr.split('-').map(Number);
    const dObj = new Date(yyyy, mm - 1, dd, 12, 0, 0);
    const diaSem = diasNombres[dObj.getDay()] || '';
    return `${diaSem} ${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yyyy} a las ${horaStr} hrs`;
  };

  // Extrae únicamente bloques reales de prisma.disponibilidad que estén libres y vigentes
  const extraerSlotsDeDisponibilidad = (bloques) => {
    const mapa = new Map();
    for (const d of bloques) {
      const fechaCand = d.dia_semana ? String(d.dia_semana).split('T')[0] : '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaCand) || fechaCand < hoyStr) continue;

      let horaCand = '';
      if (d.hora_inicio) {
        const iso = d.hora_inicio instanceof Date ? d.hora_inicio.toISOString() : String(d.hora_inicio);
        const match = iso.match(/(\d{2}:\d{2})/);
        horaCand = match ? match[1] : iso.substring(11, 16);
      }
      if (!horaCand) continue;

      const claveOcupado = `${d.id_fonoaudiologo}|${fechaCand}|${horaCand}`;
      if (!ocupadosSet.has(claveOcupado) && !mapa.has(claveOcupado)) {
        const fonoSlot = mapaFonos.get(d.id_fonoaudiologo) || null;
        const servSlot = mapaServicios.get(d.id_servicio) || null;
        mapa.set(claveOcupado, {
          fecha: fechaCand,
          hora: horaCand,
          id_fonoaudiologo: d.id_fonoaudiologo,
          nombre_fono: fonoSlot?.nombre_completo || 'Especialista FonoTrack',
          id_servicio: d.id_servicio,
          nombre_servicio: servSlot?.nombre_servicio || 'Atención Fonoaudiológica',
          precio: servSlot?.precio || 25000
        });
      }
    }
    return Array.from(mapa.values());
  };

  const fonoIdNum = idFonoaudiologo ? Number(idFonoaudiologo) : null;
  // El fonoaudiólogo que configuró horarios más recientemente en el panel
  const fonoMasRecienteId = todaDisponibilidad.length > 0 ? Number(todaDisponibilidad[0].id_fonoaudiologo) : null;
  const fonoObjetivoId = fonoMasRecienteId || fonoIdNum;

  // 1. Buscar los horarios libres creados en prisma.disponibilidad por el fonoaudiólogo activo
  let slotsLibres = [];
  if (fonoObjetivoId) {
    slotsLibres = extraerSlotsDeDisponibilidad(
      todaDisponibilidad.filter((d) => Number(d.id_fonoaudiologo) === fonoObjetivoId)
    );
  }

  // 2. Si ese fonoaudiólogo no tiene bloques futuros libres, revisar el resto de prisma.disponibilidad
  if (slotsLibres.length === 0) {
    slotsLibres = extraerSlotsDeDisponibilidad(todaDisponibilidad);
  }

  const listaOrdenada = slotsLibres
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`))
    .slice(0, 10)
    .map((slot, idx) => ({
      indice: idx + 1,
      fecha: slot.fecha,
      hora: slot.hora,
      id_fonoaudiologo: slot.id_fonoaudiologo,
      nombre_fono: slot.nombre_fono,
      id_servicio: slot.id_servicio,
      nombre_servicio: slot.nombre_servicio,
      precio: slot.precio,
      etiqueta: `${formatearEtiquetaSlot(slot.fecha, slot.hora)} — ${slot.nombre_servicio}`
    }));

  const primerSlot = listaOrdenada[0] || null;
  const fonoElegido =
    (primerSlot && mapaFonos.get(primerSlot.id_fonoaudiologo)) ||
    (fonoIdNum && mapaFonos.get(fonoIdNum)) ||
    todosFonos[0] ||
    null;

  const servicioElegido =
    (primerSlot && mapaServicios.get(primerSlot.id_servicio)) ||
    (servIdNum && mapaServicios.get(servIdNum)) ||
    (fonoElegido && todosServicios.find((s) => s.id_fonoaudiologo === fonoElegido.id_fonoaudiologo)) ||
    todosServicios[0] ||
    null;

  return {
    fonoaudiologo: fonoElegido,
    servicio: servicioElegido,
    opciones: listaOrdenada
  };
};

// Obtiene el contexto clínico completo únicamente para el paciente del RUT verificado
const obtenerContextoClinicoPaciente = async (pacientesCoincidentes) => {
  const idsPacientes = pacientesCoincidentes.map((p) => p.id_paciente);
  const nombrePaciente = pacientesCoincidentes[0]?.nombre_completo || 'Paciente';
  const rutPaciente = pacientesCoincidentes[0]?.rut || '';

  const ahora = new Date();
  const inicioDeHoy = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));

  const [todasCitas, fonoaudiologos, servicios] = await Promise.all([
    prisma.citas.findMany({
      where: { id_paciente: { in: idsPacientes } },
      orderBy: [{ fecha: 'asc' }, { hora_inicio: 'asc' }]
    }),
    prisma.fonoaudiologos.findMany(),
    prisma.servicios.findMany()
  ]);

  const mapaFonos = new Map(fonoaudiologos.map((f) => [f.id_fonoaudiologo, f]));
  const mapaServicios = new Map(servicios.map((s) => [s.id_servicios, s]));

  const proximasCitas = todasCitas.filter((c) => {
    const esFuturaOHoy = c.fecha && c.fecha >= inicioDeHoy;
    const noAnulada = c.estado_asistencia !== 'Anulada' && c.estado_asistencia !== 'Faltó';
    const noCancelada = c.estado_pago !== 'Cancelado';
    return esFuturaOHoy && noAnulada && noCancelada;
  });

  const idsTodasCitas = todasCitas.map((c) => c.id_citas);
  const evoluciones = idsTodasCitas.length > 0
    ? await prisma.evoluciones_sesion.findMany({
        where: { id_cita: { in: idsTodasCitas } },
        orderBy: { id_fichas: 'desc' }
      })
    : [];

  const mapaCitas = new Map(todasCitas.map((c) => [c.id_citas, c]));

  // Determinar especialista y servicio de referencia para consultar disponibilidad
  const citaRef = proximasCitas[0] || todasCitas[todasCitas.length - 1] || null;
  const idFonoRef = citaRef?.id_fonoaudiologo || 2;
  const idServRef = citaRef?.id_servicio || null;
  const disponibilidadEspecialista = await obtenerHorariosDisponiblesEspecialista(idFonoRef, idServRef);

  const listaProximasTexto = proximasCitas.length > 0
    ? proximasCitas.map((c, idx) => {
        const fechaStr = c.fecha ? c.fecha.toISOString().split('T')[0] : 'Sin fecha';
        const horaStr = c.hora_inicio ? c.hora_inicio.toISOString().substring(11, 16) : '00:00';
        const fono = mapaFonos.get(c.id_fonoaudiologo);
        const serv = mapaServicios.get(c.id_servicio);
        const estado = c.estado_asistencia || 'Pendiente por confirmar';
        return `${idx + 1}. Fecha: ${fechaStr} | Hora: ${horaStr} hrs | Especialista: ${fono?.nombre_completo || 'Especialista FonoTrack'} (${fono?.subespecialidad || 'Fonoaudiología'}) | Servicio: ${serv?.nombre_servicio || 'Sesión Fonoaudiológica'} | Estado: ${estado}`;
      }).join('\n')
    : 'No tiene próximas sesiones agendadas actualmente.';

  const listaObservacionesTexto = evoluciones.length > 0
    ? evoluciones.slice(0, 5).map((evo, idx) => {
        const cita = mapaCitas.get(evo.id_cita);
        const fechaStr = cita?.fecha ? cita.fecha.toISOString().split('T')[0] : 'Fecha no registrada';
        const horaStr = cita?.hora_inicio ? cita.hora_inicio.toISOString().substring(11, 16) : '';
        const fono = cita ? mapaFonos.get(cita.id_fonoaudiologo) : null;
        const serv = cita ? mapaServicios.get(cita.id_servicio) : null;
        return `${idx + 1}. Sesión del ${fechaStr}${horaStr ? ` (${horaStr} hrs)` : ''} con ${fono?.nombre_completo || 'Especialista FonoTrack'} (${serv?.nombre_servicio || 'Atención Fonoaudiológica'}):\n   - Observaciones Clínicas: ${evo.observaciones_clinicas || 'Sin observaciones.'}\n   - Tareas Asignadas para el Hogar: ${evo.actividades_hogar || 'Sin tareas adicionales.'}`;
      }).join('\n\n')
    : 'Aún no tiene observaciones clínicas ni tareas registradas en su ficha.';

  const listaHorariosDisponiblesTexto = disponibilidadEspecialista.opciones.length > 0
    ? disponibilidadEspecialista.opciones.map((op) => `*Opción ${op.indice}:* ${op.etiqueta}`).join('\n')
    : 'No hay bloques horarios libres configurados próximamente.';

  return {
    nombrePaciente,
    rutPaciente,
    proximasCitas,
    evoluciones,
    mapaCitas,
    mapaFonos,
    mapaServicios,
    listaProximasTexto,
    listaObservacionesTexto,
    disponibilidadEspecialista,
    listaHorariosDisponiblesTexto
  };
};

// Detecta si la persona pregunta qué puede hacer el bot / pide el menú de ayuda
const esPreguntaQuePuedeHacerBot = (texto = '') => {
  const limpio = String(texto || '').trim().toLowerCase();
  if (['menu', 'menú', 'ayuda', 'opciones', 'funciones', 'comandos', 'que haces', 'qué haces'].includes(limpio)) {
    return true;
  }
  return /(qu[eé]\s+(puedes?|puede|sabes?|sabe)\s+hacer|qu[eé]\s+hace\s+el\s+bot|en\s+qu[eé]\s+(me\s+)?(puedes?|puede|pude)\s+ayudar|cu[aá]les\s+son\s+tus\s+funciones|qu[eé]\s+funciones\s+tienes|para\s+qu[eé]\s+sirves|c[oó]mo\s+funcionas|qu[eé]\s+opciones\s+(tienes|hay))/i.test(
    limpio
  );
};

// Encabezado de presentación de FonoBot y todas sus funciones disponibles (solo para el 1er mensaje o cuando pregunten qué hace el bot)
const construirEncabezadoPresentacionBot = (nombrePaciente, rutPaciente = '') => {
  const saludoNombre = nombrePaciente && nombrePaciente !== 'Paciente' ? ` ${nombrePaciente}` : '';
  const lineaFicha = rutPaciente
    ? `👤 *Ficha consultada:* ${nombrePaciente} (RUT: *${rutPaciente}*)\n_(Si deseas consultar otro RUT, escríbelo en cualquier momento)_\n`
    : '';
  return (
    `🤖 *¡Hola${saludoNombre}! Soy FonoBot, tu asistente virtual de FonoTrack.*\n\n` +
    `*¿En qué te puedo ayudar?*\n` +
    `• 📅 *Próximas sesiones:* Consultar fechas, horarios, especialista y estado de tus citas.\n` +
    `• 🔄 *Disponibilidad y Reagendar:* Ver horarios libres de tu especialista y cambiar tu hora (escribe *3* o *"reagendar"*).\n` +
    `• 🩺 *Observaciones y tareas:* Revisar las observaciones clínicas y ejercicios indicados en tus sesiones.\n` +
    `• 🗣️ *Orientación de especialidad:* Recomendarte a qué fonoaudiólogo/a acudir según tus síntomas.\n` +
    `• ✅ *Confirmar o anular citas:* Responder con *1* para CONFIRMAR, *2* para ANULAR o *3* para REAGENDAR.\n` +
    (lineaFicha ? `\n${lineaFicha}` : '') +
    `────────────────────\n\n`
  );
};

// Respuesta de respaldo directa desde la base de datos si Gemini no está disponible
const generarRespuestaRespaldoBot = (textoUsuario, ctx) => {
  const t = textoUsuario.toLowerCase();
  const preguntaDisponibilidad = /reagend|cambiar.*(cita|hora|fecha|sesi[oó]n)|horarios?\s*(disponibles?|libres?)|disponibilidad|qu[eé]\s*horas?\s*tiene/.test(t);
  const preguntaCitas = /cita|sesi[oó]n|sesiones|hora|agenda|cu[aá]ndo|pr[oó]xim/.test(t);
  const preguntaObservaciones = /observaci[oó]n|observaciones|ficha|tarea|ejercicio|evoluci[oó]n|indicaci[oó]n|resumen|nota/.test(t);

  if (preguntaDisponibilidad) {
    const nombreEsp = ctx.disponibilidadEspecialista?.fonoaudiologo?.nombre_completo || 'tu especialista';
    return (
      `*Horarios disponibles con ${nombreEsp}:*\n\n` +
      `${ctx.listaHorariosDisponiblesTexto}\n\n` +
      `🔄 _Para reagendar o tomar una de estas horas, escribe *3* o *"reagendar"* y luego indica el número de la opción._`
    );
  }

  if (preguntaCitas && !preguntaObservaciones) {
    if (ctx.proximasCitas.length === 0) {
      return `*Próximas sesiones de ${ctx.nombrePaciente} (RUT ${ctx.rutPaciente}):*\nNo tiene próximas sesiones agendadas actualmente en FonoTrack.\n\n💡 _Si deseas ver horarios disponibles para agendar con tu especialista, escribe *3* o *"horarios disponibles"*._`;
    }
    return `*Próximas sesiones de ${ctx.nombrePaciente} (RUT ${ctx.rutPaciente}):*\n\n${ctx.listaProximasTexto}\n\n💡 _Puedes responder con *1* para confirmar, *2* para anular o *3* para reagendar tu próxima cita._`;
  }

  if (preguntaObservaciones && !preguntaCitas) {
    if (ctx.evoluciones.length === 0) {
      return `*Observaciones y tareas de ${ctx.nombrePaciente} (RUT ${ctx.rutPaciente}):*\nAún no tiene observaciones clínicas ni tareas registradas en su ficha de FonoTrack.`;
    }
    return `*Observaciones y tareas de ${ctx.nombrePaciente} (RUT ${ctx.rutPaciente}):*\n\n${ctx.listaObservacionesTexto}`;
  }

  return (
    `*Resumen actual de la ficha de ${ctx.nombrePaciente} (RUT ${ctx.rutPaciente}):*\n\n` +
    `📅 *Próximas sesiones:*\n${ctx.listaProximasTexto}\n\n` +
    `🩺 *Últimas observaciones y tareas:*\n${ctx.listaObservacionesTexto}\n\n` +
    `💡 _Escribe *1* para confirmar, *2* para anular o *3* para consultar disponibilidad y reagendar._`
  );
};

// Consulta a FonoBot (Gemini IA) con los datos reales del paciente en WhatsApp
const responderConFonoBotWhatsApp = async (textoUsuario, ctx, incluirPresentacion = false) => {
  const pidioMenuFunciones = esPreguntaQuePuedeHacerBot(textoUsuario);
  const encabezado =
    incluirPresentacion || pidioMenuFunciones
      ? construirEncabezadoPresentacionBot(ctx.nombrePaciente, ctx.rutPaciente)
      : '';

  // Si la persona preguntó específicamente qué puede hacer el bot, mostrar solo la presentación de funciones
  if (pidioMenuFunciones) {
    return construirEncabezadoPresentacionBot(ctx.nombrePaciente, ctx.rutPaciente).trim();
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    const nombreEspDisp = ctx.disponibilidadEspecialista?.fonoaudiologo?.nombre_completo || 'Especialista FonoTrack';

    const promptContexto = `Eres FonoBot, el asistente virtual de FonoTrack en WhatsApp.
Estás atendiendo exclusivamente la ficha del paciente: "${ctx.nombrePaciente}" (RUT: "${ctx.rutPaciente}").
NOTA ESTRICTA: NO saludes diciendo "Hola soy FonoBot", NO listes tus funciones generales y NO agregues al final frases como "¿En qué te gustaría que te ayude hoy?" o "¿En qué te puedo ayudar?"; ve directo al grano y responde únicamente la consulta puntual del paciente usando los datos reales de este RUT.

DATOS REALES DEL PACIENTE (RUT ${ctx.rutPaciente}) EN FONOTRACK:

[PRÓXIMAS SESIONES AGENDADAS]
${ctx.listaProximasTexto}

[HORARIOS DISPONIBLES DE ${nombreEspDisp.toUpperCase()} PARA AGENDAR O REAGENDAR]
${ctx.listaHorariosDisponiblesTexto}

[HISTORIAL DE OBSERVACIONES CLÍNICAS Y TAREAS ASIGNADAS]
${ctx.listaObservacionesTexto}

[SUBESPECIALIDADES FONOAUDIOLÓGICAS DE FONOTRACK PARA ORIENTACIÓN POR SÍNTOMAS]
- Evaluación del lenguaje infantil (Infantil)
- Terapia de Trastorno del Espectro Autista (TEA) (Infantil)
- Evaluación y terapia de frenillo lingual (Infantil)
- Terapia de motricidad orofacial infantil (Infantil)
- Terapia de habla y articulación (Dislalia) (Infantil)
- Evaluación y rehabilitación vocal (Voz) (Adultos)
- Rehabilitación cognitiva y lenguaje post ACV (Adultos)
- Evaluación y terapia de deglución (Disfagia) (Adultos)
- Rehabilitación auditiva y vestibular (Adultos)
- Terapia de fluidez verbal / Tartamudez (Adultos)
- Lavado de oídos infantil y adultos (Extracción de cerumen)

REGLAS DE RESPUESTA:
1. Sé amable, claro y conciso. Usa formato apto para WhatsApp (*negritas* con un asterisco y viñetas simples).
2. NO incluyas saludos de presentación ni cierres preguntando "¿En qué te puedo ayudar hoy?".
3. Si el paciente consulta por sus próximas sesiones, citas, fechas u horarios agendados, responde directamente con los datos exactos de [PRÓXIMAS SESIONES AGENDADAS] e indícale que puede responder *1* para confirmar, *2* para anular o *3* para reagendar.
4. Si el paciente pregunta por horarios disponibles, disponibilidad del especialista o cambiar/reagendar hora, muéstrale la lista de [HORARIOS DISPONIBLES] e indícale que escriba *3* o *"reagendar"* para elegir una opción.
5. Si el paciente consulta por sus observaciones clínicas, qué le dijo el especialista, ficha médica, evolución, ejercicios o tareas para la casa, responde directamente con los datos exactos de [HISTORIAL DE OBSERVACIONES CLÍNICAS Y TAREAS ASIGNADAS] para este RUT.
6. Si el paciente describe síntomas o pregunta a qué especialista acudir, oriéntalo sin dar diagnóstico médico y recomiéndale la subespecialidad de la lista que corresponda.
7. Si el paciente solo envió su RUT, muéstrale un resumen breve de sus próximas sesiones y últimas observaciones registradas para su RUT sin agregar preguntas de "¿En qué te puedo ayudar?" al final.
8. No inventes citas ni observaciones que no aparezcan en los datos reales del paciente.

Mensaje del paciente en WhatsApp: "${textoUsuario}"`;

    const result = await model.generateContent(promptContexto);
    const respuestaIA = (result.response.text() || '').trim();
    if (!respuestaIA) {
      return `${encabezado}${generarRespuestaRespaldoBot(textoUsuario, ctx)}`;
    }
    return `${encabezado}${respuestaIA}`;
  } catch (errorIA) {
    console.error('Error en FonoBot WhatsApp (usando respaldo directo):', errorIA.message);
    return `${encabezado}${generarRespuestaRespaldoBot(textoUsuario, ctx)}`;
  }
};

// Resolver teléfono desde un JID (@c.us o @lid)
const resolverNumeroJid = async (jidInput, msgFallback = null) => {
  const jid = typeof jidInput === 'object' ? (jidInput?._serialized || '') : String(jidInput || '');
  if (!jid) return null;

  if (jid.endsWith('@c.us')) {
    return formatearNumeroWhatsApp(jid.split('@')[0]);
  }

  if (jid.endsWith('@lid')) {
    try {
      const mapeo = await whatsappClient.getContactLidAndPhone([jid]);
      if (mapeo && mapeo[0] && mapeo[0].pn) {
        return formatearNumeroWhatsApp(mapeo[0].pn.split('@')[0]);
      }
    } catch (e) {
      // Ignorar error de mapeo LID
    }

    if (whatsappClient.pupPage && !whatsappClient.pupPage.isClosed()) {
      try {
        const numEnPagina = await whatsappClient.pupPage.evaluate((lidJid) => {
          try {
            const Contact = window.require && window.require('WAWebCollections')?.Contact;
            const c = Contact?.get?.(lidJid);
            if (c?.phoneNumber?.user) return c.phoneNumber.user;
            if (c?.id?.user && !String(c.id._serialized).endsWith('@lid')) return c.id.user;

            const meUser = window.require && window.require('WAWebUserPrefsMeUser');
            const myLid = meUser?.getMaybeMeLidUser?.();
            const myPn = meUser?.getMaybeMePnUser?.();
            if (myLid && myLid._serialized === lidJid && myPn?.user) {
              return myPn.user;
            }
          } catch (err) {}
          return null;
        }, jid);

        if (numEnPagina) {
          return formatearNumeroWhatsApp(numEnPagina);
        }
      } catch (e) {}
    }

    if (msgFallback && typeof msgFallback.getContact === 'function') {
      try {
        const contacto = await msgFallback.getContact();
        if (contacto && contacto.number) {
          return formatearNumeroWhatsApp(contacto.number);
        }
      } catch (e) {
        // Ignorar error de contacto
      }
    }
  }
  return null;
};

// Obtener el número propio de la sesión vinculada en WhatsApp Web
const obtenerNumeroPropioSesion = async () => {
  if (whatsappClient.info?.wid?.user) {
    return formatearNumeroWhatsApp(whatsappClient.info.wid.user);
  }
  if (whatsappClient.pupPage && !whatsappClient.pupPage.isClosed()) {
    try {
      const userPn = await whatsappClient.pupPage.evaluate(() => {
        try {
          const meUser = window.require && window.require('WAWebUserPrefsMeUser');
          return meUser?.getMaybeMePnUser?.()?.user || null;
        } catch (e) {
          return null;
        }
      });
      if (userPn) return formatearNumeroWhatsApp(userPn);
    } catch (e) {}
  }
  return null;
};

// Escuchar mensajes de pacientes por WhatsApp ("1"/"2"/"3" para citas, o consultas a FonoBot)
const mensajesProcesados = new Set();

// Detecta si el mensaje solicita reagendar o consultar horarios disponibles de forma interactiva
const esSolicitudReagendar = (texto = '') => {
  const limpio = String(texto || '').trim().toLowerCase();
  if (
    [
      '3',
      'reagendar',
      'reagendar cita',
      'cambiar hora',
      'cambiar cita',
      'cambiar fecha',
      'mover cita',
      'horarios',
      'horarios disponibles',
      'horas disponibles',
      'disponibilidad',
      'consultar disponibilidad',
      'ver disponibilidad'
    ].includes(limpio)
  ) {
    return true;
  }
  return /\b(reagendar|cambiar\s+(mi\s+)?(hora|cita|fecha)|mover\s+(mi\s+)?cita|disponibilidad|(horarios?|horas?)\s+(disponibles?|libres?)|qu[eé]\s+horas?\s+tiene)\b/i.test(limpio);
};

// Inicia el flujo interactivo de reagendamiento por WhatsApp mostrando opciones numeradas
const iniciarFlujoReagendarWhatsApp = async (numeroRemitente, pacienteObjetivo) => {
  const ahora = new Date();
  const inicioDeHoy = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));

  const todasCitasPaciente = await prisma.citas.findMany({
    where: { id_paciente: pacienteObjetivo.id_paciente },
    orderBy: [{ fecha: 'asc' }, { hora_inicio: 'asc' }]
  });

  const proximaCita = todasCitasPaciente.find((c) => {
    const esFuturaOHoy = c.fecha && c.fecha >= inicioDeHoy;
    const noAnulada = !['Anulada', 'Asistió', 'Faltó'].includes(c.estado_asistencia || '');
    const noCancelada = c.estado_pago !== 'Cancelado';
    return esFuturaOHoy && noAnulada && noCancelada;
  });

  const ultimaCita = todasCitasPaciente.length > 0 ? todasCitasPaciente[todasCitasPaciente.length - 1] : null;
  const idFonoReferencia = proximaCita?.id_fonoaudiologo || ultimaCita?.id_fonoaudiologo || null;
  const idServReferencia = proximaCita?.id_servicio || ultimaCita?.id_servicio || null;

  const disp = await obtenerHorariosDisponiblesEspecialista(idFonoReferencia, idServReferencia);

  if (!disp.opciones || disp.opciones.length === 0) {
    await enviarMensajeWhatsApp(
      numeroRemitente,
      `⚠️ En este momento el fonoaudiólogo no tiene horas libres disponibles configuradas en la agenda.`
    );
    return;
  }

  const fechaAnterior = proximaCita?.fecha ? proximaCita.fecha.toISOString().split('T')[0] : null;
  const horaAnterior = proximaCita?.hora_inicio ? proximaCita.hora_inicio.toISOString().substring(11, 16) : null;
  const nombreFono = disp.fonoaudiologo?.nombre_completo || 'Especialista FonoTrack';
  const nombreServicio = disp.servicio?.nombre_servicio || 'Atención Fonoaudiológica';

  const sesionPrevia = sesionesRutPorTelefono.get(numeroRemitente) || {};
  sesionesRutPorTelefono.set(numeroRemitente, {
    ...sesionPrevia,
    id_paciente: pacienteObjetivo.id_paciente,
    rut: pacienteObjetivo.rut,
    nombre_completo: pacienteObjetivo.nombre_completo,
    preguntaPendiente: null,
    timestamp: Date.now(),
    reagendando: {
      id_cita: proximaCita ? proximaCita.id_citas : null,
      fecha_anterior: fechaAnterior,
      hora_anterior: horaAnterior,
      id_fonoaudiologo: disp.fonoaudiologo?.id_fonoaudiologo || idFonoReferencia || 2,
      nombre_fono: nombreFono,
      id_servicio: disp.servicio?.id_servicios || idServReferencia || 1,
      nombre_servicio: nombreServicio,
      precio: proximaCita?.precio || disp.servicio?.precio || 25000,
      duracion_minutos: proximaCita?.duracion_minutos || disp.servicio?.duracion_minutos || 50,
      opciones: disp.opciones
    }
  });

  const textoCitaActual = proximaCita
    ? `📌 *Tu cita actual programada:*\n` +
      `- *Fecha:* ${fechaAnterior} a las ${horaAnterior} hrs\n` +
      `- *Especialista:* ${nombreFono}\n` +
      `- *Servicio:* ${nombreServicio}\n\n`
    : `📌 *No tienes una cita futura activa*, por lo que puedes tomar una de las horas creadas por *${nombreFono}* (*${nombreServicio}*).\n\n`;

  const textoOpciones = disp.opciones
    .map((op) => `*Opción ${op.indice}:* ${op.etiqueta}`)
    .join('\n');

  const instruccionSeleccion =
    disp.opciones.length === 1
      ? `👉 *Responde con 1* para agendar/reagendar tu cita a este horario inmediatamente, o escribe *cancelar* para mantener tu hora sin cambios.`
      : `👉 *Responde con el número de la opción* (del *1* al *${disp.opciones.length}*) para cambiar tu cita a ese horario inmediatamente, o escribe *cancelar* para mantener tu hora sin cambios.`;

  const mensajeReagendar =
    `🗓️ *Disponibilidad y Reagendamiento — FonoTrack*\n` +
    `👤 *Paciente:* ${pacienteObjetivo.nombre_completo} (RUT: *${pacienteObjetivo.rut}*)\n\n` +
    textoCitaActual +
    `✨ *Horas disponibles creadas por ${nombreFono}:*\n` +
    `${textoOpciones}\n\n` +
    instruccionSeleccion;

  await enviarMensajeWhatsApp(numeroRemitente, mensajeReagendar);
};

const procesarRespuestaCitaWhatsApp = async (msg) => {
  try {
    // Ignorar estados de WhatsApp, canales (@newsletter), difusiones (@broadcast), grupos (@g.us) o mensajes vacíos
    const origenId = typeof msg.from === 'object' ? (msg.from?._serialized || '') : String(msg.from || '');
    const destinoId = typeof msg.to === 'object' ? (msg.to?._serialized || '') : String(msg.to || '');
    const esFromMe = Boolean(msg.fromMe ?? msg.id?.fromMe);

    if (
      msg.isStatus ||
      origenId === 'status@broadcast' ||
      origenId.endsWith('@g.us') ||
      destinoId.endsWith('@g.us') ||
      origenId.endsWith('@newsletter') ||
      destinoId.endsWith('@newsletter') ||
      origenId.endsWith('@broadcast') ||
      destinoId.endsWith('@broadcast')
    ) {
      return;
    }

    // Evitar procesar mensajes enviados por el propio bot
    if (esMensajePropioDelBot(msg)) return;

    const idMsg = msg.id?._serialized || msg.id?.id;
    if (idMsg) {
      if (mensajesProcesados.has(idMsg)) return;
      if (mensajesProcesados.size > 1000) mensajesProcesados.clear();
      mensajesProcesados.add(idMsg);
    }

    const textoOriginal = (msg.body || '').trim();
    if (!textoOriginal) return;
    const texto = textoOriginal.toLowerCase();

    // Resolver el número telefónico real del remitente
    let numeroRemitente = await resolverNumeroJid(origenId, msg);
    if (!numeroRemitente && esFromMe) {
      numeroRemitente = await obtenerNumeroPropioSesion();
      if (!numeroRemitente && ultimoTelefonoEnviado) {
        numeroRemitente = ultimoTelefonoEnviado;
      }
    }

    // Si el mensaje fue enviado desde el teléfono vinculado (fromMe), solo responder si es el chat consigo mismo (pruebas)
    if (esFromMe) {
      let numeroDestino = await resolverNumeroJid(destinoId);
      if (!numeroDestino && (!destinoId || destinoId === origenId)) {
        numeroDestino = numeroRemitente;
      }
      if (numeroRemitente && numeroDestino && numeroRemitente !== numeroDestino) {
        return;
      }
    }

    if (!numeroRemitente) return;

    console.log(`Mensaje recibido en WhatsApp de ${numeroRemitente}: "${textoOriginal}"`);

    const todosPacientes = await prisma.pacientes.findMany();
    const pacientesDelTelefono = todosPacientes.filter(
      (p) => formatearNumeroWhatsApp(p.telefono) === numeroRemitente
    );

    const sesionActual = sesionesRutPorTelefono.get(numeroRemitente) || null;

    // Opción para cambiar/cerrar el RUT activo en la sesión de WhatsApp
    if (['cambiar rut', 'otro rut', 'salir', 'cerrar sesion', 'cerrar sesión'].includes(texto)) {
      sesionesRutPorTelefono.delete(numeroRemitente);
      const mensajeCambioRut =
        construirEncabezadoPresentacionBot(null) +
        `🔒 *Por favor ingresa el RUT del paciente que deseas consultar* (ejemplo: *21.570.782-2*).`;
      await enviarMensajeWhatsApp(numeroRemitente, mensajeCambioRut);
      return;
    }

    // CASO 0: Flujo interactivo activo de Reagendamiento de cita (el paciente está eligiendo una opción numerada)
    if (sesionActual?.reagendando) {
      const estadoReag = sesionActual.reagendando;

      if (['cancelar', 'no', '0', 'mantener', 'volver'].includes(texto)) {
        sesionesRutPorTelefono.set(numeroRemitente, {
          ...sesionActual,
          reagendando: null
        });
        await enviarMensajeWhatsApp(
          numeroRemitente,
          `👍 Hemos cancelado el reagendamiento. Tu cita actual se mantiene sin cambios.`
        );
        return;
      }

      // Detectar selección por número de opción (ej: "1", "opcion 2", "opción 3", "#1") o por fecha/hora
      const matchOpcion = texto.match(/^(?:opci[oó]n\s*|#\s*)?([1-9]|10)\.?$/i);
      let slotElegido = null;

      if (matchOpcion) {
        const numOpcion = Number(matchOpcion[1]);
        slotElegido = (estadoReag.opciones || []).find((op) => op.indice === numOpcion) || null;
      } else {
        // También permitir que escriba la fecha y hora directamente (ej: "2026-11-19 09:00" o "19/11/2026 09:00")
        const matchFechaIso = textoOriginal.match(/(\d{4}-\d{2}-\d{2}).*?(\d{2}:\d{2})/);
        const matchFechaLatam = textoOriginal.match(/(\d{2})\/(\d{2})\/(\d{4}).*?(\d{2}:\d{2})/);
        if (matchFechaIso) {
          slotElegido = {
            fecha: matchFechaIso[1],
            hora: matchFechaIso[2],
            etiqueta: `${matchFechaIso[1]} a las ${matchFechaIso[2]} hrs`
          };
        } else if (matchFechaLatam) {
          const fIso = `${matchFechaLatam[3]}-${matchFechaLatam[2]}-${matchFechaLatam[1]}`;
          slotElegido = {
            fecha: fIso,
            hora: matchFechaLatam[4],
            etiqueta: `${matchFechaLatam[1]}/${matchFechaLatam[2]}/${matchFechaLatam[3]} a las ${matchFechaLatam[4]} hrs`
          };
        }
      }

      if (slotElegido) {
        const inicioDia = new Date(`${slotElegido.fecha}T00:00:00.000Z`);
        const finDia = new Date(`${slotElegido.fecha}T23:59:59.999Z`);
        const nuevaHoraInicio = new Date(`${slotElegido.fecha}T${slotElegido.hora}:00.000Z`);
        const idFonoDestino = Number(slotElegido.id_fonoaudiologo || estadoReag.id_fonoaudiologo);
        const idServDestino = Number(slotElegido.id_servicio || estadoReag.id_servicio);
        const nombreFonoDestino = slotElegido.nombre_fono || estadoReag.nombre_fono;
        const nombreServDestino = slotElegido.nombre_servicio || estadoReag.nombre_servicio;
        const precioDestino = Number(slotElegido.precio || estadoReag.precio) || 25000;

        // Verificar que el bloque elegido siga libre en la base de datos
        const citasDiaFono = await prisma.citas.findMany({
          where: {
            id_fonoaudiologo: idFonoDestino,
            fecha: { gte: inicioDia, lte: finDia },
            AND: [
              {
                OR: [
                  { estado_asistencia: { not: 'Anulada' } },
                  { estado_asistencia: null }
                ]
              },
              {
                OR: [
                  { estado_pago: { not: 'Cancelado' } },
                  { estado_pago: null }
                ]
              }
            ]
          }
        });

        const ocupadoPorOtraCita = citasDiaFono.some((c) => {
          if (estadoReag.id_cita && c.id_citas === estadoReag.id_cita) return false;
          const h = c.hora_inicio ? c.hora_inicio.toISOString().substring(11, 16) : '';
          return h === slotElegido.hora;
        });

        if (ocupadoPorOtraCita) {
          const dispActualizada = await obtenerHorariosDisponiblesEspecialista(
            idFonoDestino,
            idServDestino
          );
          sesionesRutPorTelefono.set(numeroRemitente, {
            ...sesionActual,
            reagendando: {
              ...estadoReag,
              opciones: dispActualizada.opciones
            }
          });
          const nuevasOpcionesTxt = dispActualizada.opciones
            .map((op) => `*Opción ${op.indice}:* ${op.etiqueta}`)
            .join('\n');
          await enviarMensajeWhatsApp(
            numeroRemitente,
            `⚠️ Ese bloque horario acaba de ocuparse. Por favor elige uno de estos horarios actualizados:\n\n${nuevasOpcionesTxt}\n\nResponde con el número de la opción o escribe *cancelar*.`
          );
          return;
        }

        if (estadoReag.id_cita) {
          await prisma.citas.update({
            where: { id_citas: estadoReag.id_cita },
            data: {
              id_fonoaudiologo: idFonoDestino,
              id_servicio: idServDestino,
              fecha: inicioDia,
              hora_inicio: nuevaHoraInicio,
              estado_asistencia: 'Confirmada'
            }
          });
        } else {
          await prisma.citas.create({
            data: {
              id_paciente: sesionActual.id_paciente,
              id_fonoaudiologo: idFonoDestino,
              id_servicio: idServDestino,
              fecha: inicioDia,
              hora_inicio: nuevaHoraInicio,
              duracion_minutos: Number(estadoReag.duracion_minutos) || 50,
              precio: precioDestino,
              estado_pago: 'Pendiente',
              estado_asistencia: 'Confirmada'
            }
          });
        }

        sesionesRutPorTelefono.set(numeroRemitente, {
          ...sesionActual,
          reagendando: null
        });

        const detalleAnterior = estadoReag.fecha_anterior
          ? `🔄 *Hora anterior liberada:* ${estadoReag.fecha_anterior} a las ${estadoReag.hora_anterior} hrs\n`
          : '';

        const mensajeExitoReagendar =
          `✅ *¡Tu cita ha sido reagendada exitosamente en FonoTrack!*\n\n` +
          `👤 *Paciente:* ${sesionActual.nombre_completo} (RUT: *${sesionActual.rut}*)\n` +
          detalleAnterior +
          `📅 *Nueva Fecha y Hora:* ${slotElegido.etiqueta}\n` +
          `👩‍⚕️ *Especialista:* ${nombreFonoDestino}\n` +
          `🩺 *Servicio:* ${nombreServDestino}\n` +
          `📌 *Estado:* Confirmada\n\n` +
          `💡 _En cualquier momento puedes responder *1* (Confirmar), *2* (Anular), *3* (Reagendar de nuevo) o hacerme consultas sobre tus sesiones y tareas._`;

        await enviarMensajeWhatsApp(numeroRemitente, mensajeExitoReagendar);
        console.log(
          `Cita reagendada vía WhatsApp para RUT ${sesionActual.rut} al ${slotElegido.fecha} ${slotElegido.hora} hrs`
        );
        return;
      }

      // Si el usuario escribió otra cosa que no es opción ni otro comando, sacamos del modo reagendando o si pidió reagendar de nuevo refrescamos
      sesionesRutPorTelefono.set(numeroRemitente, {
        ...sesionActual,
        reagendando: null
      });
    }

    // CASO 1: Confirmar ("1") o Anular ("2") la próxima cita
    if (['1', '2', 'confirmar', 'anular'].includes(texto)) {
      // Si ya verificó un RUT en la conversación, operar únicamente sobre ese RUT; de lo contrario usar el teléfono
      const idsObjetivo = sesionActual?.id_paciente
        ? [sesionActual.id_paciente]
        : pacientesDelTelefono.map((p) => p.id_paciente);

      if (idsObjetivo.length === 0) {
        await enviarMensajeWhatsApp(
          numeroRemitente,
          `${construirEncabezadoPresentacionBot(null)}🔒 Para confirmar o anular tu cita, primero *ingresa tu RUT* (ejemplo: *21.570.782-2*).`
        );
        return;
      }

      const ahora = new Date();
      const inicioDeHoy = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));

      const proximaCita = await prisma.citas.findFirst({
        where: {
          id_paciente: { in: idsObjetivo },
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
      return;
    }

    const esPrimerMensaje = !sesionActual?.saludoEnviado;
    const pidioQueHaceElBot = esPreguntaQuePuedeHacerBot(textoOriginal);
    const mostrarEncabezado = esPrimerMensaje || pidioQueHaceElBot;

    // CASO 1.5: Solicitud de Reagendar ("3", "reagendar", "cambiar hora", "horarios disponibles")
    if (esSolicitudReagendar(textoOriginal)) {
      if (sesionActual?.id_paciente) {
        const pacienteObj =
          todosPacientes.find((p) => p.id_paciente === sesionActual.id_paciente) || {
            id_paciente: sesionActual.id_paciente,
            rut: sesionActual.rut,
            nombre_completo: sesionActual.nombre_completo
          };
        await iniciarFlujoReagendarWhatsApp(numeroRemitente, pacienteObj);
        return;
      } else {
        sesionesRutPorTelefono.set(numeroRemitente, {
          id_paciente: null,
          rut: null,
          nombre_completo: null,
          preguntaPendiente: 'reagendar',
          saludoEnviado: true,
          timestamp: Date.now(),
          reagendando: null
        });
        const prefijo = mostrarEncabezado ? construirEncabezadoPresentacionBot(null) : '';
        await enviarMensajeWhatsApp(
          numeroRemitente,
          `${prefijo}🔒 Para consultar horarios disponibles y reagendar tu cita, primero *ingresa tu RUT* (ejemplo: *21.570.782-2*).`
        );
        return;
      }
    }

    // CASO 2: Verificar si el mensaje incluye un RUT (para iniciar o cambiar el RUT consultado)
    const { rutDetectado, paciente: pacientePorRut, preguntaAdicional } = buscarRutEnMensaje(textoOriginal, todosPacientes);

    if (rutDetectado) {
      if (!pacientePorRut) {
        sesionesRutPorTelefono.set(numeroRemitente, {
          ...(sesionActual || {}),
          id_paciente: null,
          rut: null,
          nombre_completo: null,
          saludoEnviado: true,
          timestamp: Date.now(),
          reagendando: null
        });
        const prefijo = mostrarEncabezado ? construirEncabezadoPresentacionBot(null) : '';
        const msgNoEncontrado =
          `${prefijo}⚠️ No encontramos ningún paciente registrado en *FonoTrack* con el RUT *${rutDetectado}*.\n\n` +
          `Por favor verifica el RUT e ingrésalo nuevamente (ejemplo: *21.570.782-2*).`;
        await enviarMensajeWhatsApp(numeroRemitente, msgNoEncontrado);
        return;
      }

      // Guardamos el RUT verificado en la sesión de este número y recuperamos si tenía una pregunta pendiente
      const preguntaPrevia = sesionActual?.preguntaPendiente || '';
      sesionesRutPorTelefono.set(numeroRemitente, {
        id_paciente: pacientePorRut.id_paciente,
        rut: pacientePorRut.rut,
        nombre_completo: pacientePorRut.nombre_completo,
        preguntaPendiente: null,
        saludoEnviado: true,
        timestamp: Date.now(),
        reagendando: null
      });

      const consultaFinal =
        preguntaAdicional ||
        preguntaPrevia ||
        'Muéstrame el resumen de mis próximas sesiones agendadas y mis últimas observaciones clínicas y tareas.';

      // Si la consulta pendiente o adicional era reagendar / ver horarios disponibles, iniciar flujo interactivo de inmediato
      if (esSolicitudReagendar(consultaFinal)) {
        await iniciarFlujoReagendarWhatsApp(numeroRemitente, pacientePorRut);
        console.log(`FonoBot verificó RUT ${pacientePorRut.rut} e inició reagendamiento para ${numeroRemitente}`);
        return;
      }

      const contextoClinico = await obtenerContextoClinicoPaciente([pacientePorRut]);
      const respuestaBot = await responderConFonoBotWhatsApp(consultaFinal, contextoClinico, mostrarEncabezado);
      await enviarMensajeWhatsApp(numeroRemitente, respuestaBot);
      console.log(`FonoBot verificó RUT ${pacientePorRut.rut} y respondió consulta a ${numeroRemitente}`);
      return;
    }

    // CASO 3: El usuario hace una pregunta pero aún NO ha ingresado su RUT en la conversación
    if (!sesionActual || !sesionActual.id_paciente) {
      const esSoloSaludo = /^(hola|buenas|buenos dias|buenos días|buenas tardes|buenas noches|menu|menú|ayuda|hi)\b[!.,?\s]*$/i.test(textoOriginal);
      sesionesRutPorTelefono.set(numeroRemitente, {
        id_paciente: null,
        rut: null,
        nombre_completo: null,
        preguntaPendiente: esSoloSaludo || pidioQueHaceElBot ? null : textoOriginal,
        saludoEnviado: true,
        timestamp: Date.now(),
        reagendando: null
      });

      const prefijo = mostrarEncabezado ? construirEncabezadoPresentacionBot(null) : '';
      const mensajePedirRut =
        `${prefijo}` +
        `🔒 *Validación de RUT requerida:*\n` +
        `Para proteger tu privacidad y brindarte únicamente la información personal de tu ficha (próximas sesiones, observaciones clínicas, tareas y reagendamiento), *por favor ingresa tu RUT* (ejemplo: *21.570.782-2*).`;

      await enviarMensajeWhatsApp(numeroRemitente, mensajePedirRut);
      console.log(`FonoBot solicitó RUT a ${numeroRemitente}`);
      return;
    }

    // CASO 4: El usuario YA tiene su RUT verificado en la sesión; respondemos solo con la información de ese RUT
    const pacienteVerificado =
      todosPacientes.find((p) => p.id_paciente === sesionActual.id_paciente) || {
        id_paciente: sesionActual.id_paciente,
        rut: sesionActual.rut,
        nombre_completo: sesionActual.nombre_completo
      };

    const contextoClinico = await obtenerContextoClinicoPaciente([pacienteVerificado]);
    const respuestaBot = await responderConFonoBotWhatsApp(textoOriginal, contextoClinico, mostrarEncabezado);
    await enviarMensajeWhatsApp(numeroRemitente, respuestaBot);
    console.log(`FonoBot respondió consulta de WhatsApp para RUT ${pacienteVerificado.rut} a ${numeroRemitente}`);
  } catch (error) {
    console.error("Error procesando mensaje de WhatsApp:", error);
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
          `Responde con *1* para CONFIRMAR tu asistencia, con *2* para ANULAR o con *3* para REAGENDAR tu cita.`;

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
  obtenerHorariosDisponiblesEspecialista,
  iniciarWhatsApp
};

