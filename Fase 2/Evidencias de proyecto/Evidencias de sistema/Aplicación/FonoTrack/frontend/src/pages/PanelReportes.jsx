export default function PanelReportes() {
  // Datos simulados para el gráfico de barras
  const datosAsistencia = [
    { mes: 'Mar', asistencias: 130, inasistencias: 25 },
    { mes: 'Abr', asistencias: 150, inasistencias: 30 },
    { mes: 'May', asistencias: 145, inasistencias: 30 },
    { mes: 'Jun', asistencias: 165, inasistencias: 15 },
    { mes: 'Jul', asistencias: 160, inasistencias: 25 },
    { mes: 'Ago', asistencias: 185, inasistencias: 15 },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Cabecera Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Análisis Operacional</div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#1a365d' }}>Reportes de gestión</h1>
          <p style={{ color: '#64748b', marginTop: '6px' }}>Visualiza la asistencia, la demanda de servicios y la proyección de ingresos de tu operación.</p>
        </div>
        <button style={{ backgroundColor: '#ffffff', color: '#1a365d', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          📅 Últimos 6 meses
        </button>
      </div>

      {/* Fila 1: Tarjetas de Métricas Rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        
        {/* Tarjeta 1 */}
        <div style={cardStyle}>
          <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Asistencia promedio</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <div style={{ color: '#0f172a', fontSize: '36px', fontWeight: '800', letterSpacing: '-1px' }}>86,4%</div>
          </div>
          <div style={{ fontSize: '13px', color: '#10b981', fontWeight: '600', marginTop: '4px' }}>+4,2% vs. periodo anterior</div>
        </div>

        {/* Tarjeta 2 */}
        <div style={cardStyle}>
          <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Servicio más solicitado</div>
          <div style={{ color: '#0f172a', fontSize: '24px', fontWeight: '700', marginTop: '8px' }}>Consulta general</div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginTop: '8px' }}>35% del total de solicitudes</div>
        </div>

        {/* Tarjeta 3 */}
        <div style={cardStyle}>
          <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Ingresos proyectados</div>
          <div style={{ color: '#0f172a', fontSize: '36px', fontWeight: '800', letterSpacing: '-1px' }}>$8,4 M</div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginTop: '4px' }}>Proyección del próximo mes</div>
        </div>

      </div>

      {/* Fila 2: Gráficos de Análisis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Gráfico de Barras: Asistencia Mensual */}
        <div style={cardStyle}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', letterSpacing: '1px', textTransform: 'uppercase' }}>Asistencia Mensual</div>
          <h2 style={{ margin: '4px 0 20px 0', fontSize: '20px', color: '#0f172a' }}>Asistencias vs. inasistencias</h2>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginBottom: '20px', fontSize: '13px', fontWeight: '600' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#1a365d' }}></div> Asistencias</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#bfdbfe' }}></div> Inasistencias</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '220px', paddingBottom: '30px', borderBottom: '2px solid #f1f5f9', position: 'relative' }}>
            {/* Líneas guía de fondo */}
            <div style={{ position: 'absolute', width: '100%', borderTop: '1px dashed #e2e8f0', bottom: '80px', zIndex: 0 }}></div>
            <div style={{ position: 'absolute', width: '100%', borderTop: '1px dashed #e2e8f0', bottom: '150px', zIndex: 0 }}></div>
            
            {/* Barras */}
            {datosAsistencia.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', zIndex: 1, width: '12%' }}>
                {/* Barra de asistencias */}
                <div style={{ flex: 1, backgroundColor: '#1a365d', height: `${d.asistencias}px`, borderRadius: '4px 4px 0 0' }}></div>
                {/* Barra de inasistencias */}
                <div style={{ flex: 1, backgroundColor: '#bfdbfe', height: `${d.inasistencias}px`, borderRadius: '4px 4px 0 0' }}></div>
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', padding: '0 5px' }}>
            {datosAsistencia.map((d, i) => <div key={i} style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', width: '12%', textAlign: 'center' }}>{d.mes}</div>)}
          </div>
        </div>

        {/* Gráfico de Anillo: Servicios más solicitados */}
        <div style={cardStyle}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', letterSpacing: '1px', textTransform: 'uppercase' }}>Demanda e Ingresos</div>
          <h2 style={{ margin: '4px 0 30px 0', fontSize: '20px', color: '#0f172a' }}>Servicios más solicitados</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
            {/* Gráfico Donut (Conic Gradient) */}
            <div style={{ 
              width: '200px', height: '200px', borderRadius: '50%', flexShrink: 0,
              background: 'conic-gradient(#1a365d 0% 35%, #2563eb 35% 65%, #60a5fa 65% 85%, #bfdbfe 85% 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 0 0 4px white'
            }}>
              {/* Círculo central blanco para hacer el "anillo" */}
              <div style={{ width: '120px', height: '120px', backgroundColor: '#ffffff', borderRadius: '50%' }}></div>
            </div>

            {/* Leyenda y Montos */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <LeyendaItem color="#1a365d" servicio="Consulta general" monto="$3,2 M" />
              <LeyendaItem color="#2563eb" servicio="Control preventivo" monto="$2,4 M" />
              <LeyendaItem color="#60a5fa" servicio="Especialidad" monto="$1,8 M" />
              <LeyendaItem color="#bfdbfe" servicio="Control de Lactancia" monto="$1,0 M" />
            </div>
          </div>
        </div>

      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>ⓘ</span> Los valores corresponden a una proyección basada en la actividad reciente.
      </div>

    </div>
  );
}

// --- Estilos y Componentes Auxiliares ---
const cardStyle = {
  backgroundColor: '#ffffff',
  padding: '24px 30px',
  borderRadius: '16px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
};

function LeyendaItem({ color, servicio, monto }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }}></div>
        <div style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>{servicio}</div>
      </div>
      <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: '700' }}>{monto}</div>
    </div>
  );
}