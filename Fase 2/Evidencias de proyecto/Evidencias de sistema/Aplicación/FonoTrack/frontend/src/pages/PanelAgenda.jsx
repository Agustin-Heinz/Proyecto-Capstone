export default function PanelAgenda() {
  const citasHoy = [
    { id: 1, hora: '09:00', paciente: 'María González', servicio: 'Control general' },
    { id: 2, hora: '10:30', paciente: 'Pedro Silva', servicio: 'Control de Lactancia' },
    { id: 3, hora: '12:00', paciente: 'Valentina Pérez', servicio: 'Evaluación Inicial' },
    { id: 4, hora: '16:30', paciente: 'Javier Morales', servicio: 'Control general' },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Panel de Control</div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#0f172a' }}>Buenos días, Flga. Sofía</h1>
          <p style={{ color: '#64748b', marginTop: '6px' }}>Aquí tienes el resumen operativo de tu jornada.</p>
        </div>
        <div style={{ backgroundColor: '#e2e8f0', color: '#1a365d', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📅 Lunes, 24 de agosto
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
        <MetricCard titulo="Citas de hoy" valor="4" />
        <MetricCard titulo="Pacientes activos" valor="12" />
        <MetricCard titulo="Ingresos acumulados del mes" valor="$350.000" />
      </div>

      {/* Lista de Acción Rápida */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Acción Rápida</div>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#0f172a' }}>Asistencia de citas de hoy</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {citasHoy.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              
              <div style={{ width: '80px', fontWeight: '700', color: '#1a365d', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', textAlign: 'center', marginRight: '20px' }}>
                {c.hora}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '16px' }}>{c.paciente}</div>
                <div style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>{c.servicio}</div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
                  Pendiente
                </span>
                <button style={{ backgroundColor: '#1a365d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                  Confirmar asistencia
                </button>
                <button style={{ backgroundColor: 'transparent', color: '#1a365d', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                  Marcar inasistencia
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// Componente reutilizable para las tarjetas superiores
function MetricCard({ titulo, valor }) {
  return (
    <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
      <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', marginBottom: '15px' }}>{titulo}</div>
      <div style={{ color: '#1a365d', fontSize: '36px', fontWeight: '800' }}>{valor}</div>
    </div>
  );
}