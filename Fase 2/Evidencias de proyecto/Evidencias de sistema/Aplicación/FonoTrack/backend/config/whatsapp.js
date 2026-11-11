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

  return {
    nombrePaciente,
    rutPaciente,
    proximasCitas,
    evoluciones,
    mapaCitas,
    mapaFonos,
    mapaServicios,
    listaProximasTexto,
    listaObservacionesTexto
  };
};

// Encabezado fijo de presentación de FonoBot y todas sus funciones disponibles
const construirEncabezadoPresentacionBot = (nombrePaciente, rutPaciente = '') => {
  const saludoNombre = nombrePaciente && nombrePaciente !== 'Paciente' ? ` *${nombrePaciente}*` : '';
  const lineaFicha = rutPaciente
    ? `👤 *Ficha consultada:* ${nombrePaciente} (RUT: *${rutPaciente}*)\n_(Si deseas consultar otro RUT, escríbelo en cualquier momento)_\n`
    : '';
  return (
    `🤖 *¡Hola${saludoNombre}! Soy FonoBot, tu asistente virtual de FonoTrack.*\n\n` +
    `*¿En qué te puedo ayudar?*\n` +
    `• 📅 *Próximas sesiones:* Consultar fechas, horarios, especialista y estado de tus citas.\n` +
    `• 🩺 *Observaciones y tareas:* Revisar las observaciones clínicas y ejercicios indicados en tus sesiones.\n` +
    `• 🗣️ *Orientación de especialidad:* Recomendarte a qué fonoaudiólogo/a acudir según tus síntomas.\n` +
    `• ✅ *Confirmar o anular citas:* Responder con *1* para CONFIRMAR o con *2* para ANULAR tu próxima atención.\n` +
    (lineaFicha ? `\n${lineaFicha}` : '') +
    `────────────────────\n\n`
  );
};

// Respuesta de respaldo directa desde la base de datos si Gemini no está disponible
const generarRespuestaRespaldoBot = (textoUsuario, ctx) => {
  const t = textoUsuario.toLowerCase();
  const preguntaCitas = /cita|sesi[oó]n|sesiones|hora|agenda|cu[aá]ndo|pr[oó]xim/.test(t);
  const preguntaObservaciones = /observaci[oó]n|observaciones|ficha|tarea|ejercicio|evoluci[oó]n|indicaci[oó]n|resumen|nota/.test(t);

  if (preguntaCitas && !preguntaObservaciones) {
    if (ctx.proximasCitas.length === 0) {
      return `*Respuesta a tu consulta:*\nEl paciente *${ctx.nombrePaciente}* (RUT *${ctx.rutPaciente}*) no tiene próximas sesiones agendadas actualmente en FonoTrack.`;
    }
    return `*Respuesta a tu consulta (Próximas sesiones de ${ctx.nombrePaciente}):*\n\n${ctx.listaProximasTexto}\n\n💡 _Recuerda que puedes responder con *1* para confirmar o *2* para anular tu próxima cita._`;
  }

  if (preguntaObservaciones && !preguntaCitas) {
    if (ctx.evoluciones.length === 0) {
      return `*Respuesta a tu consulta:*\nEl paciente *${ctx.nombrePaciente}* (RUT *${ctx.rutPaciente}*) aún no tiene observaciones clínicas ni tareas registradas en su ficha de FonoTrack.`;
    }
    return `*Respuesta a tu consulta (Observaciones y tareas de ${ctx.nombrePaciente}):*\n\n${ctx.listaObservacionesTexto}`;
  }

  return (
    `*Resumen actual de la ficha de ${ctx.nombrePaciente} (RUT ${ctx.rutPaciente}):*\n\n` +
    `📅 *Próximas sesiones:*\n${ctx.listaProximasTexto}\n\n` +
    `🩺 *Últimas observaciones y tareas:*\n${ctx.listaObservacionesTexto}`
  );
};

// Consulta a FonoBot (Gemini IA) con los datos reales del paciente en WhatsApp
const responderConFonoBotWhatsApp = async (textoUsuario, ctx) => {
  const encabezado = construirEncabezadoPresentacionBot(ctx.nombrePaciente, ctx.rutPaciente);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

    const promptContexto = `Eres FonoBot, el asistente virtual de FonoTrack en WhatsApp.
Estás atendiendo exclusivamente la ficha del paciente: "${ctx.nombrePaciente}" (RUT: "${ctx.rutPaciente}").
NOTA IMPORTANTE: El sistema YA agregó arriba de tu mensaje tu saludo de presentación y la lista de todo lo que puedes hacer, por lo tanto NO repitas "Hola soy FonoBot" ni vuelvas a listar tus funciones generales; ve directo a responder la pregunta puntual del paciente usando únicamente los datos de este RUT.

DATOS REALES DEL PACIENTE (RUT ${ctx.rutPaciente}) EN FONOTRACK:

[PRÓXIMAS SESIONES AGENDADAS]
${ctx.listaProximasTexto}

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
1. Sé muy amable, claro y conciso. Usa formato apto para WhatsApp (*negritas* con un asterisco y viñetas simples).
2. Si el paciente consulta por sus próximas sesiones, citas, fechas u horarios, responde directamente con los datos exactos de [PRÓXIMAS SESIONES AGENDADAS] para este RUT e indícale que puede responder *1* para confirmar o *2* para anular su próxima cita.
3. Si el paciente consulta por sus observaciones clínicas, qué le dijo el especialista, ficha médica, evolución, ejercicios o tareas para la casa, responde directamente con los datos exactos de [HISTORIAL DE OBSERVACIONES CLÍNICAS Y TAREAS ASIGNADAS] para este RUT.
4. Si el paciente describe síntomas o pregunta a qué especialista acudir, oriéntalo sin dar diagnóstico médico y recomiéndale la subespecialidad de la lista que corresponda.
5. Si el paciente solo envió su RUT o un saludo general, muéstrale un resumen breve de sus próximas sesiones y últimas observaciones registradas para su RUT.
6. No inventes citas ni observaciones que no aparezcan en los datos reales del paciente.

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

// Escuchar mensajes de pacientes por WhatsApp ("1"/"2" para citas, o consultas a FonoBot)
const mensajesProcesados = new Set();

const procesarRespuestaCitaWhatsApp = async (msg) => {
  try {
    // Ignorar estados de WhatsApp, mensajes de grupos o mensajes vacíos
    const origenId = typeof msg.from === 'object' ? (msg.from?._serialized || '') : String(msg.from || '');
    const destinoId = typeof msg.to === 'object' ? (msg.to?._serialized || '') : String(msg.to || '');
    const esFromMe = Boolean(msg.fromMe ?? msg.id?.fromMe);

    if (
      msg.isStatus ||
      origenId === 'status@broadcast' ||
      origenId.endsWith('@g.us') ||
      destinoId.endsWith('@g.us')
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
    }
    if (!numeroRemitente && ultimoTelefonoEnviado) {
      numeroRemitente = ultimoTelefonoEnviado;
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

    // CASO 2: Verificar si el mensaje incluye un RUT (para iniciar o cambiar el RUT consultado)
    const { rutDetectado, paciente: pacientePorRut, preguntaAdicional } = buscarRutEnMensaje(textoOriginal, todosPacientes);

    if (rutDetectado) {
      if (!pacientePorRut) {
        const msgNoEncontrado =
          construirEncabezadoPresentacionBot(null) +
          `⚠️ No encontramos ningún paciente registrado en *FonoTrack* con el RUT *${rutDetectado}*.\n\n` +
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
        timestamp: Date.now()
      });

      const consultaFinal =
        preguntaAdicional ||
        preguntaPrevia ||
        'Muéstrame el resumen de mis próximas sesiones agendadas y mis últimas observaciones clínicas y tareas.';

      const contextoClinico = await obtenerContextoClinicoPaciente([pacientePorRut]);
      const respuestaBot = await responderConFonoBotWhatsApp(consultaFinal, contextoClinico);
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
        preguntaPendiente: esSoloSaludo ? null : textoOriginal,
        timestamp: Date.now()
      });

      const mensajePedirRut =
        construirEncabezadoPresentacionBot(null) +
        `🔒 *Validación de RUT requerida:*\n` +
        `Para proteger tu privacidad y brindarte únicamente la información personal de tu ficha (próximas sesiones, observaciones clínicas y tareas), *por favor ingresa tu RUT* (ejemplo: *21.570.782-2*).`;

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
    const respuestaBot = await responderConFonoBotWhatsApp(textoOriginal, contextoClinico);
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

