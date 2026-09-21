import React from 'react';

export default function PanelAgendaSemanal() {
  // Arreglos para generar la cuadrícula de horas y días automáticamente
  const horas = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  const dias = [
    { nombre: 'LUN', num: '24' },
    { nombre: 'MAR', num: '25' },
    { nombre: 'MIÉ', num: '26' },
    { nombre: 'JUE', num: '27' },
    { nombre: 'VIE', num: '28' }
  ];

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

      {/* Tarjetas de Métricas Superiores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <MetricCard titulo="Citas de hoy" valor="0" icono="📅" />
        <MetricCard titulo="Pacientes activos" valor="0" />
        <MetricCard titulo="Ingresos acumulados del mes" valor="$350.000" icono="💲" />
      </div>

      {/* Contenedor dividido: Calendario (Izquierda) y Detalles (Derecha) */}
      <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start' }}>
        
        {/* Columna Izquierda: Calendario Semanal */}
        <div style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          
          {/* Navegación del Calendario */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase' }}>Vista Semanal</div>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', color: '#0f172a' }}>24 ago — 28 ago 2026</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={navButtonStyle}>&lt;</button>
              <button style={{ ...navButtonStyle, width: 'auto', padding: '0 16px' }}>Esta semana</button>
              <button style={navButtonStyle}>&gt;</button>
            </div>
          </div>

          {/* Grilla CSS del Calendario */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(5, 1fr)', borderTop: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9' }}>
            
            {/* Esquina superior izquierda (vacía) */}
            <div style={{ borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '10px' }}></div>
            
            {/* Fila de Días de la semana */}
            {dias.map(d => (
              <div key={d.nombre} style={{ borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '16px 12px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>{d.nombre}</div>
                <div style={{ fontSize: '18px', color: '#1a365d', fontWeight: '800', marginTop: '2px' }}>{d.num}</div>
              </div>
            ))}

            {/* Filas de Horas (y sus celdas vacías por día) */}
            {horas.map(hora => (
              <React.Fragment key={hora}>
                {/* Etiqueta de la hora */}
                <div style={{ borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '16px 0', fontSize: '12px', color: '#64748b', textAlign: 'center', fontWeight: '600' }}>
                  {hora}
                </div>
                {/* 5 celdas vacías (Lunes a Viernes) para esta hora */}
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={`${hora}-${i}`} style={{ borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', minHeight: '65px' }}>
                    {/* Aquí luego inyectaremos bloques de colores si hay citas agendadas */}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>

        </div>

        {/* Columna Derecha: Panel de Control Administrativo */}
        <div style={{ width: '320px', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Control Administrativo</div>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', color: '#1a365d', letterSpacing: '-0.5px' }}>Detalle de cita</h2>
          
          {/* Estado vacío por defecto */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', color: '#64748b', fontSize: '15px', lineHeight: '1.6' }}>
            Selecciona una cita en el calendario para revisar sus datos, asistencia y pago.
          </div>
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
      
      {/* Ícono decorativo de fondo */}
      {icono && (
        <div style={{ position: 'absolute', top: '24px', right: '24px', fontSize: '24px', color: '#1a365d', opacity: 0.8, backgroundColor: '#f1f5f9', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icono}
        </div>
      )}
    </div>
  );
}