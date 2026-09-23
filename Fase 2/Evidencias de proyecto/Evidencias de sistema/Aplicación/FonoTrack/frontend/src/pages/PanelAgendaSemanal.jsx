import React, { useState, useEffect } from 'react';

export default function PanelAgendaSemanal() {
  // 1. Estados para almacenar las citas reales de MySQL
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const horas = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  // Ajustamos la semana para que coincida con la prueba que acabas de hacer (20 de octubre)
  const dias = [
    { nombre: 'LUN', num: '19' },
    { nombre: 'MAR', num: '20' },
    { nombre: 'MIÉ', num: '21' },
    { nombre: 'JUE', num: '22' },
    { nombre: 'VIE', num: '23' }
  ];

  // 2. Petición a tu API de Node.js al abrir la pantalla
  useEffect(() => {
    fetch('http://localhost:3000/api/citas')
      .then(respuesta => respuesta.json())
      .then(datosBackend => {
        setCitas(datosBackend);
        setCargando(false);
      })
      .catch(error => {
        console.error("Error cargando citas desde MySQL:", error);
        setCargando(false);
      });
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Cabecera Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Gestión Clínica</div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#1a365d' }}>Mi Agenda y Horarios</h1>
        </div>
        <button style={{ backgroundColor: '#1a365d', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(26, 54, 93, 0.1)' }}>
          <span style={{ fontSize: '18px', lineHeight: '1' }}>+</span> Bloquear horas
        </button>
      </div>

      {/* Tarjetas de Métricas Dinámicas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <MetricCard titulo="Citas agendadas (MySQL)" valor={cargando ? "..." : citas.length} icono="📅" />
        <MetricCard titulo="Pacientes activos" valor="1" />
        <MetricCard titulo="Ingresos proyectados" valor={cargando ? "..." : `$${citas.reduce((total, c) => total + c.precio, 0)}`} icono="💲" />
      </div>

      <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start' }}>
        
        {/* Columna Izquierda: Calendario Semanal */}
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

          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(5, 1fr)', borderTop: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9' }}>
            <div style={{ borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '10px' }}></div>
            
            {dias.map(d => (
              <div key={d.nombre} style={{ borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '16px 12px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>{d.nombre}</div>
                <div style={{ fontSize: '18px', color: '#1a365d', fontWeight: '800', marginTop: '2px' }}>{d.num}</div>
              </div>
            ))}

            {horas.map(hora => (
              <React.Fragment key={hora}>
                <div style={{ borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '16px 0', fontSize: '12px', color: '#64748b', textAlign: 'center', fontWeight: '600' }}>
                  {hora}
                </div>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={`${hora}-${i}`} style={{ borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', minHeight: '65px' }}></div>
                ))}
              </React.Fragment>
            ))}
          </div>

        </div>

        {/* Columna Derecha: Panel de Control Dinámico */}
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
                // Formateamos los datos crudos que llegan de la base de datos
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
                      <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
                        Pago: {cita.estado_pago}
                      </span>
                      <span style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
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

// --- Componentes Pequeños / Estilos ---

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