import React, { useState, useEffect } from 'react';

export default function PanelAgendaSemanal() {
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Eje Y: Horas del calendario
  const horas = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  
  // Eje X: Días de la semana (Ajustado a tus fechas de prueba)
  const dias = [
    { nombre: 'LUN', num: '19', fecha: '2026-10-19' },
    { nombre: 'MAR', num: '20', fecha: '2026-10-20' },
    { nombre: 'MIÉ', num: '21', fecha: '2026-10-21' },
    { nombre: 'JUE', num: '22', fecha: '2026-10-22' },
    { nombre: 'VIE', num: '23', fecha: '2026-10-23' }
  ];

  useEffect(() => {
    const perfilId = localStorage.getItem('perfilId');
    if (!perfilId) {
       setCargando(false);
       return;
    }

    // Pedimos las citas al backend
    fetch(`http://localhost:3000/api/citas?id_fonoaudiologo=${perfilId}`)
      .then(respuesta => respuesta.json())
      .then(datosBackend => {
        // Ordenamos cronológicamente
        const citasOrdenadas = datosBackend.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        setCitas(citasOrdenadas);
        setCargando(false);
      })
      .catch(error => {
        console.error("Error cargando citas desde MySQL:", error);
        setCargando(false);
      });
  }, []);

  // Cálculos dinámicos para KPIs
  const pacientesActivos = new Set(citas.map(c => c.id_paciente)).size;
  const ingresosProyectados = citas.reduce((total, c) => total + (c.precio || 0), 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      
      {/* CABECERA PRINCIPAL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Gestión Clínica</div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#1a365d' }}>Mi Agenda y Horarios</h1>
        </div>
        <button style={{ backgroundColor: '#1a365d', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(26, 54, 93, 0.1)' }}>
          <span style={{ fontSize: '18px', lineHeight: '1' }}>+</span> Bloquear horas
        </button>
      </div>

      {/* TARJETAS DE MÉTRICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <MetricCard titulo="Citas agendadas (MySQL)" valor={cargando ? "..." : citas.length} icono="📅" />
        <MetricCard titulo="Pacientes activos" valor={cargando ? "..." : pacientesActivos} />
        <MetricCard titulo="Ingresos proyectados" valor={cargando ? "..." : `$${ingresosProyectados.toLocaleString('es-CL')}`} icono="💲" />
      </div>

      <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start' }}>
        
        {/* COLUMNA IZQUIERDA: CALENDARIO SEMANAL */}
        <div style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase' }}>Vista Semanal</div>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', color: '#0f172a' }}>19 oct — 23 oct 2026</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={navButtonStyle}>&lt;</button>
              <button style={{ ...navButtonStyle, width: 'auto', padding: '0 16px' }}>Esta semana</button>
              <button style={navButtonStyle}>&gt;</button>
            </div>
          </div>

          {/* ESTRUCTURA DEL CALENDARIO */}
          <div style={{ borderTop: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9' }}>
            
            {/* Cabecera de los Días */}
            <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(5, 1fr)' }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '10px' }}></div>
              {dias.map(d => (
                <div key={d.nombre} style={{ borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '16px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>{d.nombre}</div>
                  <div style={{ fontSize: '18px', color: '#1a365d', fontWeight: '800', marginTop: '2px' }}>{d.num}</div>
                </div>
              ))}
            </div>

            {/* Motor del Calendario: Bloques Absolutos */}
            <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(5, 1fr)', position: 'relative' }}>
              
              {/* Eje de Horas (Izquierda) */}
              <div style={{ borderRight: '1px solid #f1f5f9' }}>
                {horas.map(hora => (
                  <div key={hora} style={{ height: '60px', borderBottom: '1px solid #f1f5f9', padding: '10px 0', fontSize: '12px', color: '#64748b', textAlign: 'center', fontWeight: '600', boxSizing: 'border-box' }}>
                    {hora}
                  </div>
                ))}
              </div>

              {/* Columnas de los Días (Donde flotan las citas) */}
              {dias.map(dia => (
                <div key={dia.fecha} style={{ borderRight: '1px solid #f1f5f9', position: 'relative', height: `${horas.length * 60}px` }}>
                  
                  {/* Líneas divisorias horizontales (Fondo) */}
                  {horas.map((h, i) => (
                    <div key={`linea-${i}`} style={{ height: '60px', borderBottom: '1px dashed #e2e8f0', boxSizing: 'border-box' }}></div>
                  ))}

                  {/* Citas renderizadas para este día en específico */}
                  {citas.filter(c => String(c.fecha).split('T')[0] === dia.fecha).map(cita => {
                    // Limpieza de hora (Ej: "09:00")
                    const horaCitaStr = cita.hora_inicio ? String(cita.hora_inicio).substring(11, 16) : '00:00';
                    const [horaC, minC] = horaCitaStr.split(':').map(Number);
                    
                    // Nuestra cuadrícula visual comienza a las 08:00
                    const horaInicioCalendario = 8; 
                    
                    // Matemática de posicionamiento en pixeles
                    const posicionTop = ((horaC - horaInicioCalendario) * 60) + minC;
                    
                    // Altura por duración (por defecto 50 min si el backend no lo trae)
                    const alturaBloque = cita.duracion_minutos || 50; 
                    
                    // Calcular a qué hora termina para mostrar el rango
                    const horaFinObj = new Date(`1970-01-01T${horaCitaStr}:00`);
                    horaFinObj.setMinutes(horaFinObj.getMinutes() + alturaBloque);
                    const horaFinStr = horaFinObj.toTimeString().substring(0, 5);

                    return (
                      <div key={cita.id_citas} style={{
                        position: 'absolute',
                        top: `${posicionTop}px`,
                        height: `${alturaBloque}px`,
                        left: '4px', right: '4px',
                        backgroundColor: '#dbeafe',
                        borderLeft: '4px solid #3b82f6',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)',
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}>
                        <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: '800', marginBottom: '2px' }}>
                          {horaCitaStr} - {horaFinStr}
                        </div>
                        <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Paciente #{cita.id_paciente}
                        </div>
                        <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cita.servicios?.nombre_servicio || `Servicio ID ${cita.id_servicio}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* COLUMNA DERECHA: PANEL DE RESERVAS ENTRANTES */}
        <div style={{ width: '320px', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Control Administrativo</div>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', color: '#1a365d', letterSpacing: '-0.5px' }}>Reservas entrantes</h2>
          
          {cargando ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Buscando citas en MySQL...</div>
          ) : citas.length === 0 ? (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', color: '#64748b', fontSize: '15px', lineHeight: '1.6' }}>
              Aún no hay citas registradas en la base de datos.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {citas.map(cita => {
                const fechaLimpia = cita.fecha ? String(cita.fecha).split('T')[0] : 'Sin fecha';
                const horaLimpia = cita.hora_inicio ? String(cita.hora_inicio).substring(11, 16) : '00:00';

                return (
                  <div key={cita.id_citas} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontWeight: '700', color: '#1a365d', fontSize: '15px' }}>{fechaLimpia}</span>
                      <span style={{ backgroundColor: '#e2e8f0', color: '#1a365d', padding: '4px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                        🕒 {horaLimpia}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '14px', color: '#475569', marginBottom: '8px' }}>
                      <strong>ID Paciente:</strong> #{cita.id_paciente}
                    </div>
                    <div style={{ fontSize: '14px', color: '#475569', marginBottom: '16px' }}>
                      <strong>Monto:</strong> ${cita.precio}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                      <span style={{ backgroundColor: cita.estado_pago === 'Pagado' ? '#dcfce7' : '#fef08a', color: cita.estado_pago === 'Pagado' ? '#166534' : '#854d0e', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
                        Pago: {cita.estado_pago}
                      </span>
                      <span style={{ backgroundColor: cita.estado_asistencia === 'Asistió' ? '#dcfce7' : '#fef08a', color: cita.estado_asistencia === 'Asistió' ? '#166534' : '#854d0e', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
                        Asistencia: {cita.estado_asistencia}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// --- COMPONENTES PEQUEÑOS / ESTILOS ---
const navButtonStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  color: '#1a365d',
  width: '38px',
  height: '38px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '600',
  cursor: 'pointer',
  fontSize: '14px'
};

function MetricCard({ titulo, valor, icono }) {
  return (
    <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', marginBottom: '15px' }}>{titulo}</div>
      <div style={{ color: '#1a365d', fontSize: '40px', fontWeight: '800', letterSpacing: '-1px' }}>{valor}</div>
      
      {icono && (
        <div style={{ position: 'absolute', top: '24px', right: '24px', fontSize: '24px', color: '#1a365d', opacity: 0.8, backgroundColor: '#f1f5f9', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icono}
        </div>
      )}
    </div>
  );
}