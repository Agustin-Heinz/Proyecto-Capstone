import { useState, useEffect } from 'react';
import { User, Settings, MapPin, CalendarDays, Edit, Plus } from 'lucide-react';

export default function PanelAgenda() {
  const [citasHoy, setCitasHoy] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nombreProfesional, setNombreProfesional] = useState("Profesional");

  useEffect(() => {
    const perfilId = localStorage.getItem('perfilId');
    if (!perfilId) {
      setCargando(false);
      return;
    }

    // Cargar datos del fonoaudiólogo para el saludo
    fetch(`http://localhost:3000/api/fonoaudiologos`)
      .then(res => res.json())
      .then(fonos => {
        const fono = fonos.find(f => f.id_fonoaudiologo === parseInt(perfilId));
        if (fono) {
           // Extraer solo el primer nombre si es posible
           const primerNombre = fono.nombre_completo.split(' ')[0];
           setNombreProfesional(primerNombre);
        }
      })
      .catch(err => console.error("Error cargando perfil:", err));

    // Cargar las citas de la base de datos
    fetch(`http://localhost:3000/api/citas?id_fonoaudiologo=${perfilId}`)
      .then(respuesta => respuesta.json())
      .then(datosBackend => {
        const citasOrdenadas = datosBackend.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        setCitasHoy(citasOrdenadas);
        setCargando(false);
      })
      .catch(error => {
        console.error("Error cargando citas desde MySQL:", error);
        setCargando(false);
      });
  }, []);

  const ingresosMes = citasHoy.reduce((total, c) => total + (c.precio || 0), 0);
  const pacientesActivos = new Set(citasHoy.map(c => c.id_paciente)).size;
  
  // Obtener fecha actual en formato legible 
  const fechaHoyStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  // Función para manejar el clic en asistencia (visual por ahora)
  const marcarAsistencia = (id, estado) => {
    setCitasHoy(prev => prev.map(c => c.id_citas === id ? { ...c, estado_asistencia: estado } : c));
    // Aquí a futuro podríamos agregar un fetch(PUT) al backend para guardarlo en MySQL
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 40px', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* CABECERA (Como en la foto) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#1a365d', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
            Panel de Control
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', color: '#0f172a', fontWeight: '800' }}>
            Buenos días, Flga. {nombreProfesional}
          </h1>
          <p style={{ color: '#64748b', marginTop: '6px', fontSize: '14px' }}>Aquí tienes el resumen operativo de tu jornada.</p>
        </div>
        <div style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <CalendarDays size={18} color="#1e40af" /> {fechaHoyStr.charAt(0).toUpperCase() + fechaHoyStr.slice(1)}
          </div> 
      </div>

      {/* MÉTRICAS SUPERIORES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
        <MetricCard titulo="Citas de hoy" valor={cargando ? "..." : citasHoy.length} color="#eff6ff" />
        <MetricCard titulo="Pacientes activos" valor={cargando ? "..." : pacientesActivos}  color="#f0fdf4" />
        <MetricCard titulo="Ingresos acumulados del mes" valor={cargando ? "..." : `$${ingresosMes.toLocaleString('es-CL')}`} color="#f0fdf4" />
      </div>

      {/* ÁREA DE ACCIÓN RÁPIDA */}
      <div style={{ backgroundColor: '#f1f5f9', padding: '30px', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Acción Rápida</div>
            <h2 style={{ margin: '0', fontSize: '20px', color: '#0f172a' }}>Asistencia de citas de hoy</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
             <span style={{ backgroundColor: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '12px' }}>{citasHoy.filter(c => c.estado_asistencia === 'Asistió').length} A</span>
             <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '12px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '12px' }}>{citasHoy.filter(c => c.estado_asistencia === 'Faltó').length} F</span>
          </div>
        </div>
        
        {cargando ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Cargando citas...</div>
        ) : citasHoy.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', color: '#64748b', textAlign: 'center' }}>
            No hay citas agendadas para mostrar.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {citasHoy.map(c => {
              const horaLimpia = c.hora_inicio ? String(c.hora_inicio).substring(11, 16) : '00:00';
              const estado = c.estado_asistencia || 'Pendiente';

              return (
                <div key={c.id_citas} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  
                  {/* Parte de Hora */}
                  <div style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '8px 14px', borderRadius: '8px', fontWeight: '800', fontSize: '14px', marginRight: '20px', minWidth: '55px', textAlign: 'center' }}>
                    {horaLimpia}
                  </div>
                  
                  {/* Datos del Paciente */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>{c.nombre_paciente || `Paciente #${c.id_paciente}`}</div>
                    <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px', fontWeight: '500' }}>{c.nombre_servicio || 'Consulta general'}</div>
                  </div>
                  
                  {/* Controles de Acción */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    
                    {/* Badge de Estado */}
                    <span style={{ 
                      backgroundColor: estado === 'Pendiente' ? '#fef3c7' : estado === 'Asistió' ? '#dcfce7' : '#fee2e2', 
                      color: estado === 'Pendiente' ? '#92400e' : estado === 'Asistió' ? '#166534' : '#991b1b', 
                      padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' 
                    }}>
                      {estado}
                    </span>

                    <button 
                      onClick={() => marcarAsistencia(c.id_citas, 'Asistió')}
                      style={{ backgroundColor: estado === 'Asistió' ? '#e2e8f0' : '#1a365d', color: estado === 'Asistió' ? '#94a3b8' : 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: estado === 'Asistió' ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                      disabled={estado === 'Asistió'}
                    >
                      Confirmar asistencia
                    </button>
                    
                    <button 
                       onClick={() => marcarAsistencia(c.id_citas, 'Faltó')}
                       style={{ backgroundColor: 'transparent', color: estado === 'Faltó' ? '#94a3b8' : '#1a365d', border: `1px solid ${estado === 'Faltó' ? '#e2e8f0' : '#cbd5e1'}`, padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: estado === 'Faltó' ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                       disabled={estado === 'Faltó'}
                    >
                      Marcar inasistencia
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

// Componente para las Tarjetas Blancas Superiores
function MetricCard({ titulo, valor, icono, color }) {
  return (
    <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #f1f5f9', position: 'relative' }}>
      <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', marginBottom: '16px' }}>{titulo}</div>
      <div style={{ color: '#1a365d', fontSize: '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>{valor}</div>
      
      <div style={{ position: 'absolute', top: '20px', right: '20px', backgroundColor: color, width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
        {icono}
      </div>
    </div>
  );
}