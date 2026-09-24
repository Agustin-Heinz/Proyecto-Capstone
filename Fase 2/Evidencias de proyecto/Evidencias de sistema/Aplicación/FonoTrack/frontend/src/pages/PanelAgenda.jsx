import { useState, useEffect } from 'react';

export default function PanelAgenda() {
  const [citasHoy, setCitasHoy] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Llamada a tu API de Node.js al abrir la pantalla
  useEffect(() => {
    fetch('http://localhost:3000/api/citas')
      .then(respuesta => respuesta.json())
      .then(datosBackend => {
        // Obtenemos el ID del fonoaudiólogo logueado desde localStorage (o 2 como fallback)
        const perfilIdStr = localStorage.getItem('perfilId');
        const idFonoaudiologo = perfilIdStr ? parseInt(perfilIdStr) : 2; 

        // Filtramos para ver solo las citas de este profesional
        const misCitas = datosBackend.filter(c => c.id_fonoaudiologo === idFonoaudiologo);
        
        setCitasHoy(misCitas);
        setCargando(false);
      })
      .catch(error => {
        console.error("Error cargando citas desde MySQL:", error);
        setCargando(false);
      });
  }, []);

  // Calculamos métricas reales basadas en los datos recibidos
  const ingresosMes = citasHoy.reduce((total, c) => total + (c.precio || 0), 0);
  const pacientesActivos = new Set(citasHoy.map(c => c.id_paciente)).size;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Panel de Control</div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#0f172a' }}>Mi Resumen Operativo</h1>
          <p style={{ color: '#64748b', marginTop: '6px' }}>Aquí tienes el resumen de tu jornada actualizado desde MySQL.</p>
        </div>
        <div style={{ backgroundColor: '#e2e8f0', color: '#1a365d', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📅 Hoy
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
        <MetricCard titulo="Citas programadas" valor={cargando ? "..." : citasHoy.length} />
        <MetricCard titulo="Pacientes activos" valor={cargando ? "..." : pacientesActivos} />
        <MetricCard titulo="Ingresos acumulados" valor={cargando ? "..." : `$${ingresosMes}`} />
      </div>

      {/* Lista de Acción Rápida */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Acción Rápida</div>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#0f172a' }}>Citas en la base de datos</h2>
        
        {cargando ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Cargando citas reales...</div>
        ) : citasHoy.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', padding: '16px 24px', borderRadius: '12px', color: '#64748b' }}>
            Aún no hay citas registradas en el sistema.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {citasHoy.map(c => {
              // Formateamos la hora cruda que llega de Prisma
              const horaLimpia = c.hora_inicio ? String(c.hora_inicio).substring(11, 16) : '00:00';

              return (
                <div key={c.id_citas} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  
                  <div style={{ width: '80px', fontWeight: '700', color: '#1a365d', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', textAlign: 'center', marginRight: '20px' }}>
                    {horaLimpia}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '16px' }}>Paciente #{c.id_paciente}</div>
                    <div style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>Servicio #{c.id_servicio}</div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
                      {c.estado_asistencia || 'Pendiente'}
                    </span>
                    <button style={{ backgroundColor: '#1a365d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                      Confirmar
                    </button>
                    <button style={{ backgroundColor: 'transparent', color: '#1a365d', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                      Inasistencia
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
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