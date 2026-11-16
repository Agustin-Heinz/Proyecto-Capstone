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

const normalizarTexto = (txt) =>
  String(txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const normalizarRut = (rut) => {
  if (!rut) return '';
  return String(rut).replace(/[^0-9kK]/g, '').toUpperCase();
};

// Detecta ubicación (comuna), público objetivo (Infantil / Adultos) y subespecialidad según lo que consultó el usuario
const detectarFiltrosDirectorio = (textoUsuario = '', respuestaIA = '', comunasBD = [], catalogoBD = []) => {
  const txtUsuarioNorm = normalizarTexto(textoUsuario);
  const txtIANorm = normalizarTexto(respuestaIA);

  // 1. Detectar ubicación (comuna) según lo que escribió el usuario
  const comunasOrdenadas = [...comunasBD].sort(
    (a, b) => String(b.comuna || '').length - String(a.comuna || '').length
  );

  let ubicacionSugerida = null;
  for (const c of comunasOrdenadas) {
    const comunaNorm = normalizarTexto(c.comuna);
    if (!comunaNorm) continue;
    const regexComuna = new RegExp(`(?:^|[^a-z0-9])${comunaNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-z0-9])`, 'i');
    if (regexComuna.test(txtUsuarioNorm)) {
      ubicacionSugerida = c.comuna;
      break;
    }
  }

  // 2. Detectar público objetivo ("Infantil" o "Adultos") únicamente si el usuario lo mencionó en su consulta
  let publicoSugerido = null;
  if (
    /\b(infantil|infantiles|nino|ninos|nina|ninas|bebe|bebes|hijo|hija|pequeno|pequena|escolar|pediatrico|pediatrica|lactancia|menor|menores)\b/.test(
      txtUsuarioNorm
    )
  ) {
    publicoSugerido = 'Infantil';
  } else if (
    /\b(adulto|adultos|adulto mayor|adultos mayores|tercera edad|abuelo|abuela|persona mayor|post acv)\b/.test(
      txtUsuarioNorm
    )
  ) {
    publicoSugerido = 'Adultos';
  }

  // 3. Detectar subespecialidad:
  // Si el usuario ya indicó una comuna o un público, solo filtrar por subespecialidad si el propio usuario mencionó síntomas o un área en su mensaje
  const mapaAlias = [
    { regex: /\b(dislalia|pronunciar|erre|articulacion|habla)\b/, clave: 'dislalia', fallback: 'Lenguaje infantil' },
    { regex: /\b(tea|autismo|espectro autista)\b/, clave: 'espectro autista', fallback: 'Espectro autista (TEA)' },
    { regex: /\b(frenillo|lactancia)\b/, clave: 'frenillo', fallback: 'Lactancia y frenillo lingual' },
    { regex: /\b(motricidad orofacial|miofuncional)\b/, clave: 'motricidad orofacial', fallback: 'Motricidad orofacial' },
    { regex: /\b(lenguaje|tarda en hablar|retraso del lenguaje|tel)\b/, clave: 'lenguaje infantil', fallback: 'Lenguaje infantil' },
    { regex: /\b(voz|vocal|disfonia|ronquera|cuerdas vocales|afonia)\b/, clave: 'voz', fallback: 'Voz' },
    { regex: /\b(acv|accidente cerebrovascular|afasia|post acv)\b/, clave: 'acv', fallback: 'Rehabilitación post ACV' },
    { regex: /\b(disfagia|deglucion|tragar|ahogo al comer)\b/, clave: 'deglucion', fallback: 'Deglución (disfagia)' },
    { regex: /\b(tartamudez|fluidez|tartamudea)\b/, clave: 'tartamudez', fallback: 'Tartamudez' },
    { regex: /\b(lavado de oidos|cerumen|tapon de oido)\b/, clave: 'lavado de oidos', fallback: null },
    { regex: /\b(auditiva|vestibular|vertigo|hipoacusia|audicion)\b/, clave: 'auditiva', fallback: null }
  ];

  let subespecialidadSugerida = null;
  const catalogoOrdenado = [...catalogoBD].sort(
    (a, b) => String(b.nombre_servicio || '').length - String(a.nombre_servicio || '').length
  );

  // Primero buscar coincidencia directa en el texto del usuario
  for (const item of catalogoOrdenado) {
    const servNorm = normalizarTexto(item.nombre_servicio);
    if (servNorm && txtUsuarioNorm.includes(servNorm)) {
      subespecialidadSugerida = item.nombre_servicio;
      break;
    }
  }

  if (!subespecialidadSugerida) {
    for (const alias of mapaAlias) {
      if (alias.regex.test(txtUsuarioNorm)) {
        const encontradoCatalogo = catalogoBD.find((c) =>
          normalizarTexto(c.nombre_servicio).includes(alias.clave)
        );
        subespecialidadSugerida = encontradoCatalogo ? encontradoCatalogo.nombre_servicio : alias.fallback;
        break;
      }
    }
  }

  // Solo buscar subespecialidad en la respuesta de la IA si el usuario NO estaba haciendo una búsqueda únicamente por comuna o público
  const soloPidioComunaOPublico = Boolean((ubicacionSugerida || publicoSugerido) && !subespecialidadSugerida);
  if (!subespecialidadSugerida && !soloPidioComunaOPublico) {
    for (const item of catalogoOrdenado) {
      const servNorm = normalizarTexto(item.nombre_servicio);
      if (servNorm && txtIANorm.includes(servNorm)) {
        subespecialidadSugerida = item.nombre_servicio;
        break;
      }
    }
    if (!subespecialidadSugerida) {
      for (const alias of mapaAlias) {
        if (alias.regex.test(txtIANorm)) {
          const encontradoCatalogo = catalogoBD.find((c) =>
            normalizarTexto(c.nombre_servicio).includes(alias.clave)
          );
          subespecialidadSugerida = encontradoCatalogo ? encontradoCatalogo.nombre_servicio : alias.fallback;
          break;
        }
      }
    }
    if (!subespecialidadSugerida) {
      subespecialidadSugerida =
        ESPECIALIDADES_FONOTRACK.find((esp) => txtIANorm.includes(normalizarTexto(esp))) || null;
    }
  }

  return {
    subespecialidad: subespecialidadSugerida,
    ubicacion: ubicacionSugerida,
    publico: publicoSugerido
  };
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

const generarRespuestaDirectorioRespaldo = (filtros, fonoaudiologosEnriquecidos) => {
  const { subespecialidad, ubicacion, publico } = filtros;
  const coincidencias = fonoaudiologosEnriquecidos.filter((f) => {
    const cumpleUbi = !ubicacion || normalizarTexto(f.comuna) === normalizarTexto(ubicacion);
    const cumplePub =
      !publico || f.publico_objetivo === publico || f.publico_objetivo === 'Ambos';
    const cumpleEsp =
      !subespecialidad ||
      f.especialidades.some((e) => {
        const eNorm = normalizarTexto(e);
        const busqNorm = normalizarTexto(subespecialidad);
        return eNorm.includes(busqNorm) || busqNorm.includes(eNorm);
      });
    return cumpleUbi && cumplePub && cumpleEsp;
  });

  const partesFiltro = [];
  if (subespecialidad) partesFiltro.push(`especialidad *${subespecialidad}*`);
  if (publico) partesFiltro.push(`público *${publico === 'Infantil' ? 'Infantil (Niños)' : 'Adultos'}*`);
  if (ubicacion) partesFiltro.push(`comuna de *${ubicacion}*`);

  const descFiltros = partesFiltro.length > 0 ? partesFiltro.join(', ') : 'tu búsqueda';

  if (coincidencias.length > 0) {
    const listaNombres = coincidencias
      .slice(0, 4)
      .map((f) => `• *${f.nombre_completo}* (${f.comuna} — Público: ${f.publico_objetivo})`)
      .join('\n');
    return (
      `¡Claro! Para ${descFiltros}, contamos con ${coincidencias.length} profesional(es) disponible(s) en FonoTrack:\n\n` +
      `${listaNombres}\n\n` +
      `👇 Haz clic en el botón de abajo para ir directamente al directorio con estos filtros aplicados.`
    );
  }

  return (
    `He preparado los filtros para ${descFiltros}. ` +
    `Haz clic en el botón de abajo para revisar el directorio de profesionales con tu búsqueda aplicada.`
  );
};

router.post('/', async (req, res) => {
  try {
    const { mensaje, rutVerificado } = req.body;
    const textoUsuario = (mensaje || '').trim();

    if (!textoUsuario) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
    }

    const [todosPacientes, comunasBD, catalogoBD, fonoaudiologosBD, serviciosBD] = await Promise.all([
      prisma.pacientes.findMany(),
      prisma.ubicacion.findMany({ orderBy: { comuna: 'asc' } }),
      prisma.catalogo_servicios.findMany(),
      prisma.fonoaudiologos.findMany({ include: { ubicacion: true } }),
      prisma.servicios.findMany()
    ]);

    const mapaComunasDefecto = {
      1: 'Providencia',
      2: 'Providencia',
      3: 'Las Condes',
      4: 'Ñuñoa'
    };

    const fonoaudiologosEnriquecidos = fonoaudiologosBD.map((f) => {
      const servs = serviciosBD
        .filter((s) => s.id_fonoaudiologo === f.id_fonoaudiologo)
        .map((s) => s.nombre_servicio);
      const comunaReal = f.ubicacion?.comuna || mapaComunasDefecto[f.id_fonoaudiologo] || 'Providencia';
      return {
        id_fonoaudiologo: f.id_fonoaudiologo,
        nombre_completo: f.nombre_completo,
        comuna: comunaReal,
        publico_objetivo: f.publico_objetivo || 'Ambos',
        subespecialidad: f.subespecialidad || 'Fonoaudiología General',
        especialidades: [...new Set([f.subespecialidad || 'Fonoaudiología General', ...servs])].filter(Boolean)
      };
    });

    const resumenDirectorioTexto =
      fonoaudiologosEnriquecidos.length > 0
        ? fonoaudiologosEnriquecidos
            .map(
              (f) =>
                `- ${f.nombre_completo} | Comuna: ${f.comuna} | Público: ${f.publico_objetivo} | Especialidades: ${f.especialidades.join(', ')}`
            )
            .join('\n')
        : 'Sin profesionales registrados.';

    const listaCatalogoTexto =
      catalogoBD.length > 0
        ? catalogoBD.map((c) => `- ${c.nombre_servicio} (Público: ${c.publico_objetivo})`).join('\n')
        : ESPECIALIDADES_FONOTRACK.map((e) => `- ${e}`).join('\n');

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
        ubicacion: null,
        publico: null,
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
        ubicacion: null,
        publico: null,
        rutActivo: pacienteActivo?.rut || null,
        nombrePaciente: pacienteActivo?.nombre_completo || null
      });
    }

    // Detectar si ya en la pregunta del usuario está buscando por ubicación, público o especialidad
    const filtrosIniciales = detectarFiltrosDirectorio(textoUsuario, '', comunasBD, catalogoBD);
    const esBusquedaDirectorio = Boolean(
      filtrosIniciales.ubicacion ||
        filtrosIniciales.publico ||
        filtrosIniciales.subespecialidad ||
        /\b(fonoaudi[oó]logos?|especialistas?|profesionales?|atenci[oó]n|busco|recomienda|d[oó]nde\s+atienden)\b/i.test(textoUsuario)
    );

    const esConsultaPersonal =
      !esBusquedaDirectorio &&
      /cita|sesi[oó]n|sesiones|hora|agenda|cu[aá]ndo|pr[oó]xim|observaci[oó]n|observaciones|ficha|tarea|ejercicio|evoluci[oó]n|indicaci[oó]n|resumen|nota|mi rut|mis datos/i.test(
        textoUsuario
      );

    // Si no hay RUT verificado y pregunta por sus sesiones/observaciones (o saluda), pedimos el RUT primero
    if (!pacienteActivo && (esConsultaPersonal || /^(hola|buenas|buenos d[ií]as|buenas tardes|buenas noches|ayuda|menu|men[uú])$/i.test(textoUsuario))) {
      return res.status(200).json({
        respuesta:
          `🔒 *Validación de seguridad:*\n` +
          `Para brindarte información personal sobre tus próximas sesiones, observaciones clínicas o tareas asignadas, por favor *escribe tu RUT* (por ejemplo: *21.570.782-2*).\n\n` +
          `💡 _Si deseas buscar fonoaudiólogos por comuna (ej. Providencia), público (niños o adultos) o síntomas, escríbelo directamente._`,
        subespecialidad: null,
        ubicacion: null,
        publico: null,
        rutActivo: null
      });
    }

    // Si hay un paciente con RUT verificado y no es una búsqueda exclusiva del directorio sin RUT
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

[PROFESIONALES REGISTRADOS EN EL DIRECTORIO DE FONOTRACK]
${resumenDirectorioTexto}

[CATÁLOGO DE SUBESPECIALIDADES FONOTRACK]
${listaCatalogoTexto}

REGLAS:
1. Sé claro, empático y conciso. No incluyas saludos de presentación ni cierres preguntando "¿En qué te puedo ayudar?".
2. Si consulta por próximas sesiones o citas, usa exactamente [PRÓXIMAS SESIONES AGENDADAS].
3. Si consulta por disponibilidad u horarios disponibles para agendar/reagendar, usa únicamente [HORARIOS DISPONIBLES CREADOS POR EL FONOAUDIÓLOGO].
4. Si consulta por observaciones clínicas, evoluciones o tareas para la casa, usa exactamente [HISTORIAL DE OBSERVACIONES CLÍNICAS Y TAREAS ASIGNADAS].
5. Si busca fonoaudiólogos por comuna/ubicación, público (Infantil o Adultos) o describe síntomas, oriéntalo usando [PROFESIONALES REGISTRADOS EN EL DIRECTORIO DE FONOTRACK] y menciona explícitamente la subespecialidad, comuna y/o público correspondiente.

Consulta del paciente: "${consultaEfectiva}"`;

        const result = await model.generateContent(promptConFicha);
        const respuestaIA = (result.response.text() || '').trim();
        const filtrosDetectados = esBusquedaDirectorio
          ? detectarFiltrosDirectorio(consultaEfectiva, respuestaIA, comunasBD, catalogoBD)
          : { subespecialidad: null, ubicacion: null, publico: null };

        return res.status(200).json({
          respuesta: respuestaIA || generarRespuestaRespaldoWeb(consultaEfectiva, ctx),
          subespecialidad: filtrosDetectados.subespecialidad,
          ubicacion: filtrosDetectados.ubicacion,
          publico: filtrosDetectados.publico,
          rutActivo: ctx.rutPaciente,
          nombrePaciente: ctx.nombrePaciente
        });
      } catch (errIA) {
        console.warn("Usando respuesta de respaldo en FonoBot Web:", errIA.message);
        const filtrosRespaldo = esBusquedaDirectorio
          ? detectarFiltrosDirectorio(consultaEfectiva, '', comunasBD, catalogoBD)
          : { subespecialidad: null, ubicacion: null, publico: null };
        const textoResp =
          filtrosRespaldo.subespecialidad || filtrosRespaldo.ubicacion || filtrosRespaldo.publico
            ? generarRespuestaDirectorioRespaldo(filtrosRespaldo, fonoaudiologosEnriquecidos)
            : generarRespuestaRespaldoWeb(consultaEfectiva, ctx);

        return res.status(200).json({
          respuesta: textoResp,
          subespecialidad: filtrosRespaldo.subespecialidad,
          ubicacion: filtrosRespaldo.ubicacion,
          publico: filtrosRespaldo.publico,
          rutActivo: ctx.rutPaciente,
          nombrePaciente: ctx.nombrePaciente
        });
      }
    }

    // Caso general: búsqueda de especialistas por ubicación, público o síntomas sin RUT
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

      const promptContexto = `Eres FonoBot, el asistente de orientación clínica y búsqueda de especialistas de FonoTrack.
Lee la consulta del usuario (que puede incluir síntomas, una comuna/ubicación como Providencia, y/o un público objetivo como Infantil/Niños o Adultos) y oriéntalo usando los datos reales del directorio:

[PROFESIONALES EN EL DIRECTORIO DE FONOTRACK]
${resumenDirectorioTexto}

[CATÁLOGO DE SUBESPECIALIDADES FONOTRACK]
${listaCatalogoTexto}

REGLAS ESTRICTAS:
1. No incluyas saludo de presentación ni preguntes "¿En qué te puedo ayudar?".
2. Bajo ninguna circunstancia entregues un diagnóstico médico.
3. Sé empático, claro y breve (máximo 3 o 4 líneas).
4. Si el usuario consulta por una comuna (ej: Providencia) o un público (Infantil / Adultos), menciona qué profesionales del directorio atienden allí o para ese público e invítalo a presionar el botón inferior para ver el directorio filtrado.
5. Si el usuario describe síntomas o busca una especialidad, menciona explícitamente el nombre exacto del servicio/subespecialidad del catálogo que mejor se ajuste.

Consulta del usuario: "${textoUsuario}"`;

      const result = await model.generateContent(promptContexto);
      const respuestaIA = (result.response.text() || '').trim();
      const filtrosDetectados = detectarFiltrosDirectorio(textoUsuario, respuestaIA, comunasBD, catalogoBD);

      return res.status(200).json({
        respuesta: `${respuestaIA || generarRespuestaDirectorioRespaldo(filtrosDetectados, fonoaudiologosEnriquecidos)}\n\n🔒 _Recuerda: si también deseas consultar tus próximas sesiones u observaciones clínicas, escribe tu *RUT*._`,
        subespecialidad: filtrosDetectados.subespecialidad,
        ubicacion: filtrosDetectados.ubicacion,
        publico: filtrosDetectados.publico,
        rutActivo: null
      });
    } catch (errGeneral) {
      console.warn("Usando respaldo de directorio en FonoBot Web:", errGeneral.message);
      const filtrosRespaldo = detectarFiltrosDirectorio(textoUsuario, '', comunasBD, catalogoBD);
      return res.status(200).json({
        respuesta: `${generarRespuestaDirectorioRespaldo(filtrosRespaldo, fonoaudiologosEnriquecidos)}\n\n🔒 _Recuerda: si también deseas consultar tus próximas sesiones u observaciones clínicas, escribe tu *RUT*._`,
        subespecialidad: filtrosRespaldo.subespecialidad,
        ubicacion: filtrosRespaldo.ubicacion,
        publico: filtrosRespaldo.publico,
        rutActivo: null
      });
    }

  } catch (error) {
    console.error("Error en el chatbot:", error);
    res.status(500).json({ error: "No se pudo procesar la consulta clínica." });
  }
});

module.exports = router;

