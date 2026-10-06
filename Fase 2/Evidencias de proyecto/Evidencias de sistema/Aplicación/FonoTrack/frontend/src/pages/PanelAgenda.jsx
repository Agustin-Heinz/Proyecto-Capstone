import React, { useState, useEffect } from 'react';
import { CalendarSearch, CalendarFold, CalendarDays, DollarSign } from 'lucide-react';

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
    fetch('http://localhost:3000/api/fonoaudiologos')
      .then(res => res.json())
      .then(fonos => {
        if (Array.isArray(fonos)) {
          const fono = fonos.find(f => f.id_fonoaudiologo === parseInt(perfilId));
          if (fono && fono.nombre_completo) {
            const primerNombre = fono.nombre_completo.split(' ')[0];
            setNombreProfesional(primerNombre);
          }
        }
      })
      .catch(err => console.error("Error cargando perfil:", err));

    // Cargar las citas de la base de datos
    fetch(`http://localhost:3000/api/citas?id_fonoaudiologo=${perfilId}`)
      .then(respuesta => respuesta.json())
      .then(datosBackend => {
        const listaSegura = Array.isArray(datosBackend) ? datosBackend : [];
        const citasOrdenadas = listaSegura.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        setCitasHoy(citasOrdenadas);
        setCargando(false);
      })
      .catch(error => {
        console.error("Error cargando citas desde MySQL:", error);
        setCargando(false);
      });
  }, []);

  // Obtener la fecha y hora actual en formato local
  const ahora = new Date();
  const anioActual = ahora.getFullYear();
  const mesActual = String(ahora.getMonth() + 1).padStart(2, '0');
  const diaActual = String(ahora.getDate()).padStart(2, '0');
  const hoyStr = `${anioActual}-${mesActual}-${diaActual}`;
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

  // Función para saber si una cita de HOY aún no ha terminado
  const citaSigueVigenteHoy = (c) => {
    const horaStr = c.hora_inicio ? String(c.hora_inicio).substring(11, 16) : '00:00';
    const [horaC, minC] = horaStr.split(':').map(Number);
    const duracion = Number(c.duracion_minutos) || 50;
    const minutosTerminoCita = (horaC * 60 + minC) + duracion;
    return minutosTerminoCita > minutosAhora;
  };

  // Todas las citas del día de hoy (para que la lista de abajo permita pasar asistencia todo el día)
  const todasLasCitasDeHoy = citasHoy.filter(c => {
    const fechaCita = c.fecha ? String(c.fecha).split('T')[0] : '';
    return fechaCita === hoyStr;
  });

  // "Citas de hoy" vigentes (solo las de hoy que aún NO han terminado según el reloj)
  const citasSoloHoyVigentes = todasLasCitasDeHoy.filter(c => citaSigueVigenteHoy(c));

  // "Citas agendadas" vigentes (las de hoy que aún NO han terminado + todas las de días futuros)
  const citasAgendadasVigentes = citasHoy.filter(c => {
    const fechaCita = c.fecha ? String(c.fecha).split('T')[0] : '';
    if (fechaCita > hoyStr) return true;
    if (fechaCita < hoyStr) return false;
    return citaSigueVigenteHoy(c);
  });

  // Ingresos acumulados del mes actual
  const ingresosMes = citasHoy
    .filter(c => {
      const fechaCita = c.fecha ? String(c.fecha).split('T')[0] : '';
      return fechaCita.startsWith(`${anioActual}-${mesActual}`);
    })
    .reduce((total, c) => total + (c.precio || 0), 0);

  // Obtener fecha actual en formato legible
  const fechaHoyStr = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  // Función para manejar el clic en asistencia
  const marcarAsistencia = (id, estado) => {
    setCitasHoy(prev => prev.map(c => c.id_citas === id ? { ...c, estado_asistencia: estado } : c));
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 40px', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* CABECERA */}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '35px' }}>
        <MetricCard 
          titulo="Citas de hoy" 
          valor={cargando ? "..." : citasSoloHoyVigentes.length} 
          color="#eff6ff" 
          icono={<CalendarSearch size={22} color="#1e40af" />} 
        />
        <MetricCard 
          titulo="Citas agendadas" 
          valor={cargando ? "..." : citasAgendadasVigentes.length} 
          color="#eff6ff" 
          icono={<CalendarFold size={22} color="#1e40af" />} 
        />
        <MetricCard 
          titulo="Ingresos acumulados del mes" 
          valor={cargando ? "..." : `$${ingresosMes.toLocaleString('es-CL')}`} 
          color="#eff6ff" 
          icono={<DollarSign size={22} color="#1e40af" />} 
        />
      </div>

      {/* ÁREA DE ACCIÓN RÁPIDA */}
      <div style={{ backgroundColor: '#f1f5f9', padding: '28px', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
              Acción Rápida
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: '800' }}>
              Asistencia de citas de hoy
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ backgroundColor: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px' }}>
              {todasLasCitasDeHoy.filter(c => c.estado_asistencia === 'Asistió').length} A
            </span>
            <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '12px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px' }}>
              {todasLasCitasDeHoy.filter(c => c.estado_asistencia === 'Faltó').length} F
            </span>
          </div>
        </div>

        {cargando ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Cargando citas de hoy...</div>
        ) : todasLasCitasDeHoy.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', color: '#64748b', textAlign: 'center' }}>
            No hay citas agendadas para hoy.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {todasLasCitasDeHoy.map(c => {
              const horaLimpia = c.hora_inicio ? String(c.hora_inicio).substring(11, 16) : '00:00';
              const estado = c.estado_asistencia || 'Pendiente';

              const badgeBg = estado === 'Asistió' ? '#dcfce7' : estado === 'Faltó' ? '#fee2e2' : '#fef3c7';
              const badgeColor = estado === 'Asistió' ? '#166534' : estado === 'Faltó' ? '#991b1b' : '#92400e';

              return (
                <div key={c.id_citas} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                    <div style={{ backgroundColor: '#eff6ff', color: '#1e40af', fontWeight: '800', fontSize: '14px', padding: '8px 14px', borderRadius: '8px', textAlign: 'center' }}>
                      {horaLimpia}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>
                        {c.nombre_paciente || `Paciente #${c.id_paciente}`}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '13px', marginTop: '2px' }}>
                        {c.nombre_servicio || `Servicio #${c.id_servicio}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ backgroundColor: badgeBg, color: badgeColor, padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                      {estado}
                    </span>
                    <button 
                      onClick={() => marcarAsistencia(c.id_citas, 'Asistió')}
                      style={{ backgroundColor: '#1a365d', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                    >
                      Confirmar asistencia
                    </button>
                    <button 
                      onClick={() => marcarAsistencia(c.id_citas, 'Faltó')}
                      style={{ backgroundColor: 'transparent', color: '#1a365d', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
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