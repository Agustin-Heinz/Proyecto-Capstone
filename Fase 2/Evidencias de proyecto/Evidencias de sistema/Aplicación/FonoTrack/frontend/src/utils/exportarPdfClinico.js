function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function imprimirDocumentoHTML(contenidoBody, tituloArchivo = 'Documento_FonoTrack') {
  const iframePrevio = document.getElementById('fonotrack-pdf-iframe');
  if (iframePrevio) {
    iframePrevio.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'fonotrack-pdf-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const fechaEmision = new Date().toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escaparHtml(tituloArchivo)}</title>
  <style>
    @page {
      size: A4;
      margin: 16mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 0;
      line-height: 1.5;
      font-size: 13px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #1a365d;
      padding-bottom: 14px;
      margin-bottom: 22px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-badge {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background-color: #1a365d;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #1a365d;
      letter-spacing: -0.3px;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 2px;
    }
    .doc-meta {
      text-align: right;
      font-size: 12px;
      color: #475569;
    }
    .doc-meta strong {
      color: #1a365d;
      font-size: 13px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #1a365d;
      margin: 20px 0 10px 0;
      padding-bottom: 5px;
      border-bottom: 1px solid #cbd5e1;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 20px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 16px;
    }
    .info-item {
      display: flex;
      gap: 6px;
      font-size: 12.5px;
    }
    .info-label {
      color: #64748b;
      font-weight: 700;
      min-width: 110px;
    }
    .info-val {
      color: #0f172a;
      font-weight: 600;
    }
    .card-sesion {
      border: 1px solid #cbd5e1;
      border-left: 4px solid #1a365d;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 14px;
      page-break-inside: avoid;
      background-color: #ffffff;
    }
    .card-sesion-header {
      display: flex;
      justify-content: space-between;
      font-weight: 700;
      color: #1e40af;
      font-size: 12.5px;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #f1f5f9;
    }
    .bloque-texto {
      margin-top: 8px;
      white-space: pre-line;
      color: #1e293b;
    }
    .bloque-tareas {
      margin-top: 10px;
      padding: 10px 12px;
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      white-space: pre-line;
      color: #1e3a8a;
    }
    .cert-box {
      border: 2px solid #1a365d;
      border-radius: 14px;
      padding: 28px 32px;
      margin-top: 20px;
      background-color: #ffffff;
    }
    .firma-wrap {
      margin-top: 56px;
      display: flex;
      justify-content: center;
      page-break-inside: avoid;
    }
    .firma-box {
      text-align: center;
      border-top: 1.5px solid #334155;
      padding-top: 8px;
      min-width: 240px;
      font-size: 12.5px;
      color: #334155;
    }
    .footer {
      margin-top: 32px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-badge">+</div>
      <div>
        <div class="brand-title">FONOTRACK</div>
        <div class="brand-sub">Plataforma de Gestión Clínica Fonoaudiológica</div>
      </div>
    </div>
    <div class="doc-meta">
      <div><strong>Fecha de emisión:</strong> ${escaparHtml(fechaEmision)}</div>
      <div>Documento Clínico Oficial</div>
    </div>
  </div>

  ${contenidoBody}

  <div class="footer">
    <span>FonoTrack — Registro Clínico Fonoaudiológico</span>
    <span>Emitido el ${escaparHtml(fechaEmision)}</span>
  </div>
</body>
</html>`;

  const tituloAnterior = document.title;
  document.title = tituloArchivo;

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      document.title = tituloAnterior;
    }, 800);
  }, 250);
}

export function exportarFichaClinicaPDF({ paciente, sesiones = [], especialistaNombre = 'Especialista FonoTrack' }) {
  const nombrePac = paciente?.nombre || paciente?.nombre_completo || 'Paciente';
  const rutPac = paciente?.rut || 'No registrado';

  const bloquesSesiones = sesiones.length === 0
    ? `<p style="color:#64748b; font-style:italic;">No se registran evoluciones de sesiones previas.</p>`
    : sesiones.map((s, idx) => `
      <div class="card-sesion">
        <div class="card-sesion-header">
          <span>Sesión #${sesiones.length - idx} — ${escaparHtml(s.servicio || 'Atención Fonoaudiológica')}</span>
          <span>Fecha: ${escaparHtml(s.fechaTexto)}</span>
        </div>
        <div class="bloque-texto">
          <strong>Observaciones Clínicas:</strong><br/>
          ${escaparHtml(s.observaciones || 'Sin observaciones registradas.')}
        </div>
        <div class="bloque-tareas">
          <strong>Pauta de Ejercicios / Tareas para el Hogar:</strong><br/>
          ${escaparHtml(s.tareas || 'Sin tareas adicionales asignadas.')}
        </div>
      </div>
    `).join('');

  const body = `
    <h2 style="margin:0 0 14px 0; color:#0f172a; font-size:18px;">Ficha Clínica e Historial de Evoluciones</h2>

    <div class="section-title">1. Antecedentes del Paciente</div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Nombre:</span><span class="info-val">${escaparHtml(nombrePac)}</span></div>
      <div class="info-item"><span class="info-label">RUT:</span><span class="info-val">${escaparHtml(rutPac)}</span></div>
      <div class="info-item"><span class="info-label">Fecha Nac.:</span><span class="info-val">${escaparHtml(paciente?.nacimiento || 'No registrada')}</span></div>
      <div class="info-item"><span class="info-label">Género:</span><span class="info-val">${escaparHtml(paciente?.genero || 'No especificado')}</span></div>
      <div class="info-item"><span class="info-label">Teléfono:</span><span class="info-val">${escaparHtml(paciente?.fono || 'No registrado')}</span></div>
      <div class="info-item"><span class="info-label">Correo:</span><span class="info-val">${escaparHtml(paciente?.email || 'Sin correo')}</span></div>
      <div class="info-item"><span class="info-label">Dirección:</span><span class="info-val">${escaparHtml(paciente?.direccion || 'No registrada')}</span></div>
      <div class="info-item"><span class="info-label">Emergencia:</span><span class="info-val">${escaparHtml(paciente?.emergencia || 'Sin contacto')}</span></div>
    </div>

    ${paciente?.notas ? `
      <div class="section-title">2. Notas Clínicas Permanentes / Diagnóstico Base</div>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 16px; margin-bottom:16px; white-space:pre-line;">
        ${escaparHtml(paciente.notas)}
      </div>
    ` : ''}

    <div class="section-title">3. Historial de Sesiones y Plan de Ejercicios (${sesiones.length})</div>
    ${bloquesSesiones}

    <div class="firma-wrap">
      <div class="firma-box">
        <strong>Flgo/a. ${escaparHtml(especialistaNombre)}</strong><br/>
        Especialista en Fonoaudiología — FonoTrack
      </div>
    </div>
  `;

  const nombreLimpio = nombrePac.replace(/\s+/g, '_');
  imprimirDocumentoHTML(body, `Ficha_Clinica_${nombreLimpio}`);
}

export function exportarPautaSesionPDF({ pacienteNombre, pacienteRut, fechaTexto, servicioNombre, observaciones, tareas, especialistaNombre, especialidad }) {
  const body = `
    <h2 style="margin:0 0 14px 0; color:#0f172a; font-size:18px;">Informe de Sesión y Pauta de Ejercicios</h2>

    <div class="info-grid">
      <div class="info-item"><span class="info-label">Paciente:</span><span class="info-val">${escaparHtml(pacienteNombre || 'Paciente')}</span></div>
      ${pacienteRut ? `<div class="info-item"><span class="info-label">RUT:</span><span class="info-val">${escaparHtml(pacienteRut)}</span></div>` : ''}
      <div class="info-item"><span class="info-label">Especialista:</span><span class="info-val">Flgo/a. ${escaparHtml(especialistaNombre || 'Especialista FonoTrack')}</span></div>
      <div class="info-item"><span class="info-label">Especialidad:</span><span class="info-val">${escaparHtml(especialidad || 'Fonoaudiología')}</span></div>
      <div class="info-item"><span class="info-label">Atención:</span><span class="info-val">${escaparHtml(servicioNombre || 'Sesión Fonoaudiológica')}</span></div>
      <div class="info-item"><span class="info-label">Fecha y Hora:</span><span class="info-val">${escaparHtml(fechaTexto || 'Registrada')}</span></div>
    </div>

    <div class="section-title">Observaciones Clínicas de la Sesión</div>
    <div style="border:1px solid #cbd5e1; border-left:4px solid #1a365d; border-radius:10px; padding:16px; margin-bottom:18px; white-space:pre-line;">
      ${escaparHtml(observaciones || 'Sin observaciones clínicas registradas.')}
    </div>

    <div class="section-title">Plan de Ejercicios y Actividades para el Hogar</div>
    <div class="bloque-tareas" style="padding:16px; font-size:13.5px;">
      ${escaparHtml(tareas || 'Sin actividades adicionales asignadas para el hogar.')}
    </div>

    <div class="firma-wrap">
      <div class="firma-box">
        <strong>Flgo/a. ${escaparHtml(especialistaNombre || 'Especialista FonoTrack')}</strong><br/>
        ${escaparHtml(especialidad || 'Fonoaudiología')} — FonoTrack
      </div>
    </div>
  `;

  const nombreLimpio = String(pacienteNombre || 'Paciente').replace(/\s+/g, '_');
  imprimirDocumentoHTML(body, `Pauta_Ejercicios_${nombreLimpio}`);
}

