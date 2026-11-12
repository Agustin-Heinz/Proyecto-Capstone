const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const prisma = require('../config/prisma');
const { obtenerHorariosDisponiblesEspecialista } = require('../config/whatsapp');

// POST PARA EL CHATBOT WEB (FONOBOT CON VALIDACIÓN DE RUT Y CONSULTA CLÍNICA)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ESPECIALIDADES_FONOTRACK = [
  "Lactancia y frenillo lingual",
  "Deglución infantil",
  "Rehabilitación post ACV",
  "Deglución (disfagia)",
  "Voz",
  "Tartamudez",
  "Espectro autista (TEA)",
  "Lenguaje infantil",
  "Motricidad orofacial"
];

const normalizarRut = (rut) => {
  if (!rut) return '';
  return String(rut).replace(/[^0-9kK]/g, '').toUpperCase();
};

const buscarRutEnMensaje = (texto, todosPacientes) => {
  const textoLimpio = (texto || '').trim();
  if (!textoLimpio) return { rutDetectado: null, paciente: null, preguntaAdicional: '' };

  const regexRut = /\b(\d{1,2}\.\d{3}\.?\d{3}-?[\dkK]|\d{6,9}-[\dkK]|\d{7,9}[\dkK])\b/i;
  const match = textoLimpio.match(regexRut);

  if (match) {
    const rutTexto = match[1];
    const rutNorm = normalizarRut(rutTexto);
    const paciente = todosPacientes.find((p) => normalizarRut(p.rut) === rutNorm) || null;
    const preguntaAdicional = textoLimpio.replace(match[0], '').replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, '');
    return { rutDetectado: rutTexto, paciente, preguntaAdicional };
  }

  const msgNorm = normalizarRut(textoLimpio);
  if (msgNorm.length >= 5 && /^[\dK]+$/.test(msgNorm)) {
    const pacienteDirecto = todosPacientes.find((p) => normalizarRut(p.rut) === msgNorm);
    if (pacienteDirecto) {
      return { rutDetectado: pacienteDirecto.rut, paciente: pacienteDirecto, preguntaAdicional: '' };
    }
  }

  return { rutDetectado: null, paciente: null, preguntaAdicional: textoLimpio };
};

const esPreguntaQuePuedeHacerBotWeb = (texto = '') => {
  const limpio = String(texto || '').trim().toLowerCase();
  if (['menu', 'menú', 'ayuda', 'opciones', 'funciones', 'comandos', 'que haces', 'qué haces'].includes(limpio)) {
    return true;
  }
  return /(qu[eé]\s+(puedes?|puede|sabes?|sabe)\s+hacer|qu[eé]\s+hace\s+el\s+bot|en\s+qu[eé]\s+(me\s+)?(puedes?|puede|pude)\s+ayudar|cu[aá]les\s+son\s+tus\s+funciones|qu[eé]\s+funciones\s+tienes|para\s+qu[eé]\s+sirves|c[oó]mo\s+funcionas|qu[eé]\s+opciones\s+(tienes|hay))/i.test(
    limpio
  );
};

const construirEncabezadoPresentacionWeb = (nombrePaciente = '', rutPaciente = '') => {
  const saludoNombre = nombrePaciente && nombrePaciente !== 'Paciente' ? ` ${nombrePaciente}` : '';
  const lineaFicha = rutPaciente
    ? `👤 *Ficha consultada:* ${nombrePaciente} (RUT: *${rutPaciente}*)\n`
    : '';
  return (
    `🤖 *¡Hola${saludoNombre}! Soy FonoBot, tu asistente virtual de FonoTrack.*\n\n` +
    `*¿En qué te puedo ayudar?*\n` +
    `• 📅 *Próximas sesiones:* Consultar fechas, horarios, especialista y estado de tus citas.\n` +
    `• 🔄 *Disponibilidad:* Consultar los horarios libres creados por tu especialista.\n` +
    `• 🩺 *Observaciones y tareas:* Revisar las observaciones clínicas y ejercicios indicados en tus sesiones.\n` +
    `• 🗣️ *Orientación de especialidad:* Recomendarte a qué fonoaudiólogo/a acudir según tus síntomas.\n` +
    (lineaFicha ? `\n${lineaFicha}` : '') +
    `────────────────────\n\n`
  );
};

const obtenerContextoClinicoPacienteWeb = async (paciente) => {
  const ahora = new Date();
  const inicioDeHoy = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));

  const [todasCitas, fonoaudiologos, servicios] = await Promise.all([
    prisma.citas.findMany({
      where: { id_paciente: paciente.id_paciente },
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
  const citaRef = proximasCitas[0] || todasCitas[todasCitas.length - 1] || null;
  const dispEsp = await obtenerHorariosDisponiblesEspecialista(
    citaRef?.id_fonoaudiologo || null,
    citaRef?.id_servicio || null
  );
  const listaHorariosDisponiblesTexto =
    dispEsp.opciones && dispEsp.opciones.length > 0
      ? dispEsp.opciones.map((op) => `• ${op.etiqueta} (Especialista: ${op.nombre_fono})`).join('\n')
      : 'El fonoaudiólogo no tiene otros bloques horarios libres creados actualmente.';

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
        return `${idx + 1}. Sesión del ${fechaStr}${horaStr ? ` (${horaStr} hrs)` : ''} con ${fono?.nombre_completo || 'Especialista FonoTrack'} (${serv?.nombre_servicio || 'Atención Fonoaudiológica'}):\n   - Observaciones Clínicas: ${evo.observaciones_clinicas || 'Sin observaciones.'}\n   - Tareas Asignadas: ${evo.actividades_hogar || 'Sin tareas adicionales.'}`;
      }).join('\n\n')
    : 'Aún no tiene observaciones clínicas ni tareas registradas en su ficha.';

  return {
    nombrePaciente: paciente.nombre_completo || 'Paciente',
    rutPaciente: paciente.rut || '',
    proximasCitas,
    evoluciones,
    listaProximasTexto,
    listaObservacionesTexto,
    listaHorariosDisponiblesTexto
  };
};

const generarRespuestaRespaldoWeb = (textoUsuario, ctx) => {
  const t = (textoUsuario || '').toLowerCase();
  const preguntaDisponibilidad = /disponibilidad|horarios?\s*(disponibles?|libres?)|horas?\s*(disponibles?|libres?)|reagendar|cambiar\s*(hora|cita)/.test(t);
  const preguntaCitas = /cita|sesi[oó]n|sesiones|hora|agenda|cu[aá]ndo|pr[oó]xim/.test(t);
  const preguntaObservaciones = /observaci[oó]n|observaciones|ficha|tarea|ejercicio|evoluci[oó]n|indicaci[oó]n|resumen|nota/.test(t);

  if (preguntaDisponibilidad) {
    return `*Horarios disponibles creados por el fonoaudiólogo:*\n\n${ctx.listaHorariosDisponiblesTexto}`;
  }

  if (preguntaCitas && !preguntaObservaciones) {
    if (ctx.proximasCitas.length === 0) {
      return `*Respuesta a tu consulta:*\nEl paciente *${ctx.nombrePaciente}* (RUT *${ctx.rutPaciente}*) no tiene próximas sesiones agendadas actualmente en FonoTrack.`;
    }
    return `*Próximas sesiones de ${ctx.nombrePaciente}:*\n\n${ctx.listaProximasTexto}`;
  }

  if (preguntaObservaciones && !preguntaCitas) {
    if (ctx.evoluciones.length === 0) {
      return `*Respuesta a tu consulta:*\nEl paciente *${ctx.nombrePaciente}* (RUT *${ctx.rutPaciente}*) aún no tiene observaciones clínicas ni tareas registradas en su ficha.`;
    }
    return `*Observaciones y tareas de ${ctx.nombrePaciente}:*\n\n${ctx.listaObservacionesTexto}`;
  }

  return (
    `*Resumen actual de la ficha de ${ctx.nombrePaciente} (RUT ${ctx.rutPaciente}):*\n\n` +
    `📅 *Próximas sesiones:*\n${ctx.listaProximasTexto}\n\n` +
    `🩺 *Últimas observaciones y tareas:*\n${ctx.listaObservacionesTexto}`
  );
};

router.post('/', async (req, res) => {
  try {
    const { mensaje, rutVerificado } = req.body;
    const textoUsuario = (mensaje || '').trim();

    if (!textoUsuario) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
    }

    const todosPacientes = await prisma.pacientes.findMany();
    const { rutDetectado, paciente: pacientePorMensaje, preguntaAdicional } = buscarRutEnMensaje(textoUsuario, todosPacientes);

    const pidioQueHaceElBot = esPreguntaQuePuedeHacerBotWeb(textoUsuario);

    // Si escribió un RUT que no existe en la base de datos
    if (rutDetectado && !pacientePorMensaje) {
      const encabezado = pidioQueHaceElBot ? construirEncabezadoPresentacionWeb() : '';
      return res.status(200).json({
        respuesta:
          `${encabezado}` +
          `⚠️ No encontré ningún paciente registrado con el RUT *${rutDetectado}* en *FonoTrack*.\n\n` +
          `Por favor verifica que esté bien escrito (por ejemplo: *21.570.782-2* o *21570782-2*) y vuelve a enviarlo.`,
        subespecialidad: null,
        rutActivo: rutVerificado || null
      });
    }

    // Determinar paciente activo (ya sea por RUT recién enviado o por RUT ya verificado en la sesión del chat)
    let pacienteActivo = pacientePorMensaje;
    if (!pacienteActivo && rutVerificado) {
      const rutNormPrevio = normalizarRut(rutVerificado);
      pacienteActivo = todosPacientes.find((p) => normalizarRut(p.rut) === rutNormPrevio) || null;
    }

    if (pidioQueHaceElBot) {
      return res.status(200).json({
        respuesta: construirEncabezadoPresentacionWeb(
          pacienteActivo?.nombre_completo || '',
          pacienteActivo?.rut || ''
        ).trim(),
        subespecialidad: null,
        rutActivo: pacienteActivo?.rut || null,
        nombrePaciente: pacienteActivo?.nombre_completo || null
      });
    }

    const esConsultaPersonal = /cita|sesi[oó]n|sesiones|hora|agenda|cu[aá]ndo|pr[oó]xim|observaci[oó]n|observaciones|ficha|tarea|ejercicio|evoluci[oó]n|indicaci[oó]n|resumen|nota|mi rut|mis datos/i.test(textoUsuario);

    // Si no hay RUT verificado y pregunta por sus sesiones/observaciones (o saluda), pedimos el RUT primero
    if (!pacienteActivo && (esConsultaPersonal || /^(hola|buenas|buenos d[ií]as|buenas tardes|buenas noches|ayuda|menu|men[uú])$/i.test(textoUsuario))) {
      return res.status(200).json({
        respuesta:
          `🔒 *Validación de seguridad:*\n` +
          `Para brindarte información personal sobre tus próximas sesiones, observaciones clínicas o tareas asignadas, por favor *escribe tu RUT* (por ejemplo: *21.570.782-2*).\n\n` +
          `💡 _Si solo deseas orientación sobre qué especialista elegir según tus síntomas, cuéntame qué molestias presentas._`,
        subespecialidad: null,
        rutActivo: null
      });
    }

    // Si hay un paciente con RUT verificado, respondemos con su contexto clínico real
    if (pacienteActivo) {
      const ctx = await obtenerContextoClinicoPacienteWeb(pacienteActivo);
      const consultaEfectiva = preguntaAdicional || 'Muéstrame el resumen de mis próximas sesiones y mis últimas observaciones clínicas y tareas asignadas.';

      try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
        const promptConFicha = `Eres FonoBot, el asistente virtual de FonoTrack en la web.
Estás atendiendo exclusivamente la ficha del paciente "${ctx.nombrePaciente}" (RUT: "${ctx.rutPaciente}").
NOTA ESTRICTA: NO saludes diciendo "Hola soy FonoBot", NO listes tus funciones generales y NO cierres diciendo "¿En qué te puedo ayudar?"; responde directo a la consulta usando únicamente los datos reales de este RUT.

[PRÓXIMAS SESIONES AGENDADAS]
${ctx.listaProximasTexto}

[HORARIOS DISPONIBLES CREADOS POR EL FONOAUDIÓLOGO]
${ctx.listaHorariosDisponiblesTexto}

[HISTORIAL DE OBSERVACIONES CLÍNICAS Y TAREAS ASIGNADAS]
${ctx.listaObservacionesTexto}

[SUBESPECIALIDADES FONOTRACK PARA ORIENTACIÓN DE SÍNTOMAS]
- Lactancia y frenillo lingual
- Deglución infantil
- Rehabilitación post ACV
- Deglución (disfagia)
- Voz
- Tartamudez
- Espectro autista (TEA)
- Lenguaje infantil
- Motricidad orofacial

REGLAS:
1. Sé claro, empático y conciso. No incluyas saludos de presentación ni cierres preguntando "¿En qué te puedo ayudar?".
2. Si consulta por próximas sesiones o citas, usa exactamente [PRÓXIMAS SESIONES AGENDADAS].
3. Si consulta por disponibilidad u horarios disponibles para agendar/reagendar, usa únicamente [HORARIOS DISPONIBLES CREADOS POR EL FONOAUDIÓLOGO].
4. Si consulta por observaciones clínicas, evoluciones o tareas para la casa, usa exactamente [HISTORIAL DE OBSERVACIONES CLÍNICAS Y TAREAS ASIGNADAS].
5. Si describe síntomas para saber a qué especialista acudir, oriéntalo sin diagnosticar e incluye explícitamente el nombre exacto de una de las subespecialidades de la lista.

Consulta del paciente: "${consultaEfectiva}"`;

        const result = await model.generateContent(promptConFicha);
        const respuestaIA = (result.response.text() || '').trim();
        const subespecialidadSugerida = ESPECIALIDADES_FONOTRACK.find(esp =>
          respuestaIA.toLowerCase().includes(esp.toLowerCase())
        ) || null;

        return res.status(200).json({
          respuesta: respuestaIA || generarRespuestaRespaldoWeb(consultaEfectiva, ctx),
          subespecialidad: subespecialidadSugerida,
          rutActivo: ctx.rutPaciente,
          nombrePaciente: ctx.nombrePaciente
        });
      } catch (errIA) {
        console.warn("Usando respuesta de respaldo en FonoBot Web:", errIA.message);
        return res.status(200).json({
          respuesta: generarRespuestaRespaldoWeb(consultaEfectiva, ctx),
          subespecialidad: null,
          rutActivo: ctx.rutPaciente,
          nombrePaciente: ctx.nombrePaciente
        });
      }
    }

    // Caso general: consulta de síntomas sin RUT
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

    const promptContexto = `Eres FonoBot, el asistente de orientación clínica de la plataforma FonoTrack.
    Lee los síntomas del usuario y recomiéndale a cuál de las siguientes subespecialidades fonoaudiológicas acudir:
    - Lactancia y frenillo lingual
    - Deglución infantil
    - Rehabilitación post ACV
    - Deglución (disfagia)
    - Voz
    - Tartamudez
    - Espectro autista (TEA)
    - Lenguaje infantil
    - Motricidad orofacial

    REGLAS ESTRICTAS:
    1. No incluyas saludo de presentación ni preguntes "¿En qué te puedo ayudar?".
    2. Bajo ninguna circunstancia entregues un diagnóstico médico.
    3. Sé empático, claro y breve (máximo 3 o 4 líneas).
    4. Termina indicando explícitamente el nombre exacto de la subespecialidad de la lista anterior que mejor se ajuste.
    
    Síntomas del paciente: "${textoUsuario}"`;

    const result = await model.generateContent(promptContexto);
    const respuestaIA = (result.response.text() || '').trim();

    const subespecialidadSugerida = ESPECIALIDADES_FONOTRACK.find(esp =>
      respuestaIA.toLowerCase().includes(esp.toLowerCase())
    ) || null;

    res.status(200).json({
      respuesta: `${respuestaIA}\n\n🔒 _Recuerda: si también deseas consultar tus próximas sesiones u observaciones clínicas, escribe tu *RUT*._`,
      subespecialidad: subespecialidadSugerida,
      rutActivo: null
    });

  } catch (error) {
    console.error("Error en el chatbot:", error);
    res.status(500).json({ error: "No se pudo procesar la consulta clínica." });
  }
});

module.exports = router;

