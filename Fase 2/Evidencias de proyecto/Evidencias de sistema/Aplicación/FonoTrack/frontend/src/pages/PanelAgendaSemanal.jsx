import React, { useState, useEffect } from 'react';
import { CalendarFold, UserRoundGroup } from 'lucide-react';

export default function PanelAgendaSemanal() {
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Eje de horas (Definimos un rango horario de la consulta)
  const horaInicioCalendario = 8; // 08:00 AM
  const horas = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  // LÓGICA DEL CALENDARIO DINÁMICO (Autocentrado y Navegación)
  const [fechaReferencia, setFechaReferencia] = useState(new Date());

  // Fecha y hora actual del reloj local
  const ahora = new Date();
  const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

  // Verifica si una cita es futura o si es de hoy pero su hora de término aún no ha pasado
  const citaSigueVigente = (c) => {
    const fechaCita = c.fecha ? String(c.fecha).split('T')[0] : '';
    if (fechaCita > hoyStr) return true;
    if (fechaCita < hoyStr) return false;

    const horaStr = c.hora_inicio ? String(c.hora_inicio).substring(11, 16) : '00:00';
    const [horaC, minC] = horaStr.split(':').map(Number);
    const duracion = Number(c.duracion_minutos) || 50;
    const minutosTerminoCita = (horaC * 60 + minC) + duracion;

    return minutosTerminoCita > minutosAhora;
  };

  useEffect(() => {
    const perfilId = localStorage.getItem('perfilId');
    if (!perfilId) {
      setCargando(false);
      return;
    }

    fetch(`http://localhost:3000/api/citas?id_fonoaudiologo=${perfilId}`)
      .then(respuesta => respuesta.json())
      .then(datosBackend => {
        const listaSegura = Array.isArray(datosBackend) ? datosBackend : [];
        const citasOrdenadas = listaSegura.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        setCitas(citasOrdenadas);
        
        // Buscamos la primera cita registrada
        const hoyLocalStr = new Date().toLocaleDateString('en-CA'); // Formato YYYY-MM-DD
        const fechasUnicas = [...new Set(citasOrdenadas.map(c => String(c.fecha).split('T')[0]))].sort();
        const fechaFutura = fechasUnicas.find(f => f >= hoyLocalStr);

        if (fechaFutura) {
          // Si hay citas futuras, centramos la agenda en ese día
          const [y, m, d] = fechaFutura.split('-');
          setFechaReferencia(new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0));
        } else {
          // Si no hay ninguna, mostramos el día de hoy
          setFechaReferencia(new Date());
        }
        
        setCargando(false);
      })
      .catch(error => {
        console.error("Error cargando citas:", error);
        setCargando(false);
      });
  }, []);

  // Generamos los 5 días visibles a partir de la fecha de referencia
  const diasMostrados = [];
  const diasSemanaNombres = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  const mesesNombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  for (let i = 0; i < 5; i++) {
    const f = new Date(fechaReferencia);
    f.setDate(fechaReferencia.getDate() + i);

    const yyyy = f.getFullYear();
    const mm = String(f.getMonth() + 1).padStart(2, '0');
    const dd = String(f.getDate()).padStart(2, '0');

    diasMostrados.push({
      nombre: diasSemanaNombres[f.getDay()],
      num: String(f.getDate()),
      fecha: `${yyyy}-${mm}-${dd}`,
      mesStr: mesesNombres[f.getMonth()],
      anio: yyyy
    });
  }

  // Funciones para las flechas de navegación
  const avanzarFechas = () => {
    setFechaReferencia(prev => {
      const nueva = new Date(prev);
      nueva.setDate(nueva.getDate() + 5); // Avanza 5 días
      return nueva;
    });
  };

  const retrocederFechas = () => {
    setFechaReferencia(prev => {
      const nueva = new Date(prev);
      nueva.setDate(nueva.getDate() - 5); // Retrocede 5 días
      return nueva;
    });
  };

  const irAEstaSemana = () => {
    setFechaReferencia(new Date());
  };

  // Texto dinámico del título. Para mostrar el día actual y un rango de 4
  let tituloRango = "Cargando...";
  if (diasMostrados.length === 5) {
    const inicio = diasMostrados[0];
    const fin = diasMostrados[4];
    tituloRango = `${inicio.num} ${inicio.mesStr} — ${fin.num} ${fin.mesStr} ${fin.anio}`;
  }

  // CÁLCULOS Y NUMERACIÓN DE RESERVAS (Descontando citas cuya hora ya terminó)
  const citasVigentes = citas.filter(c => citaSigueVigente(c));

  const fechasEnVista = diasMostrados.map(d => d.fecha);
  const citasEnVista = citasVigentes.filter(c => {
    const fechaCita = c.fecha ? String(c.fecha).split('T')[0] : '';
    return fechasEnVista.includes(fechaCita);
  });

  const pacientesActivos = new Set(citasVigentes.map(c => c.id_paciente)).size;

  const [indiceReserva, setIndiceReserva] = useState(0);
  const reservasPorPagina = 3;
  
  const avanzarReservas = () => {
    if (indiceReserva + reservasPorPagina < citasVigentes.length) setIndiceReserva(indiceReserva + reservasPorPagina);
  };
  const retrocederReservas = () => {
    if (indiceReserva > 0) setIndiceReserva(indiceReserva - reservasPorPagina);
  };
  const reservasVisibles = citasVigentes.slice(indiceReserva, indiceReserva + reservasPorPagina);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Gestión Clínica</div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#1a365d' }}>Mi Agenda Semanal</h1>
        </div>
      </div>

      {/* SOLO CAMBIAN ESTOS 2 BLOQUES SUPERIORES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <MetricCard 
          titulo="Citas en esta vista" 
          valor={cargando ? "..." : citasEnVista.length} 
          subtitulo={tituloRango}
          icono={<CalendarFold size={24} color="#1e40af" />} 
        />
        <MetricCard 
          titulo="Pacientes activos" 
          valor={cargando ? "..." : pacientesActivos} 
          subtitulo="Con sesiones vigentes"
          icono={<UserRoundGroup size={24} color="#1e40af" />}
        />
      </div>

      <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start' }}>
        
        {/* CALENDARIO CON BLOQUES GUARDADOS (Diseño original intacto) */}
        <div style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase' }}>Vista Dinámica</div>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', color: '#0f172a' }}>{tituloRango}</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={retrocederFechas} style={navButtonStyle}>&lt;</button>
              <button onClick={irAEstaSemana} style={{ ...navButtonStyle, width: 'auto', padding: '0 16px' }}>Hoy</button>
              <button onClick={avanzarFechas} style={navButtonStyle}>&gt;</button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9' }}>
            
            {/* Cabeceras de los Días Generados */}
            <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(5, 1fr)' }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '10px' }}></div>
              {diasMostrados.map(d => (
                <div key={d.fecha} style={{ borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '16px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>{d.nombre}</div>
                  <div style={{ fontSize: '18px', color: '#1a365d', fontWeight: '800', marginTop: '2px' }}>{d.num}</div>
                </div>
              ))}
            </div>

            {/* Cuadrícula de bloques */}
            <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(5, 1fr)', position: 'relative' }}>
              
              <div style={{ borderRight: '1px solid #f1f5f9' }}>
                {horas.map(hora => (
                  <div key={hora} style={{ height: '60px', borderBottom: '1px solid #f1f5f9', padding: '10px 0', fontSize: '12px', color: '#64748b', textAlign: 'center', fontWeight: '600', boxSizing: 'border-box' }}>
                    {hora}
                  </div>
                ))}
              </div>

              {/* Columnas para los bloques por cada día mostrado */}
              {diasMostrados.map(dia => (
                <div key={dia.fecha} style={{ borderRight: '1px solid #f1f5f9', position: 'relative', height: `${horas.length * 60}px` }}>
                  
                  {horas.map((h, i) => (
                    <div key={`linea-${i}`} style={{ height: '60px', borderBottom: '1px dashed #e2e8f0', boxSizing: 'border-box' }}></div>
                  ))}

                  {/* calculo matematico de los bloques */}
                  {citas.filter(c => String(c.fecha).split('T')[0] === dia.fecha).map(cita => {
                    const horaCitaStr = cita.hora_inicio ? String(cita.hora_inicio).substring(11, 16) : '00:00';
                    const [horaC, minC] = horaCitaStr.split(':').map(Number);
                    
                    const posicionTop = ((horaC - horaInicioCalendario) * 60) + minC;
                    const alturaBloque = cita.duracion_minutos || 50; 
                    
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
                        <div style={{ fontSize: '10px', color: '#1e40af', fontWeight: '800', marginBottom: '2px' }}>
                          {horaCitaStr} - {horaFinStr}
                        </div>
                        <div style={{ fontSize: '11px', color: '#0f172a', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cita.nombre_paciente}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CUADROS DE LAS RESERVAS ENTRANTES (Diseño original intacto) */}
        <div style={{ width: '320px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Control Administrativo</div>
              <h2 style={{ margin: 0, fontSize: '24px', color: '#1a365d', letterSpacing: '-0.5px' }}>Reservas</h2>
            </div>
            
            {citasVigentes.length > reservasPorPagina && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={retrocederReservas} disabled={indiceReserva === 0} style={{ ...navBtnPequeno, opacity: indiceReserva === 0 ? 0.3 : 1 }}>▲</button>
                <button onClick={avanzarReservas} disabled={indiceReserva + reservasPorPagina >= citasVigentes.length} style={{ ...navBtnPequeno, opacity: indiceReserva + reservasPorPagina >= citasVigentes.length ? 0.3 : 1 }}>▼</button>
              </div>
            )}
          </div>
          
          {cargando ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Buscando citas...</div>
          ) : citasVigentes.length === 0 ? (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', color: '#64748b', fontSize: '15px' }}>
              Aún no hay citas registradas.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reservasVisibles.map(cita => {
                const fechaLimpia = cita.fecha ? String(cita.fecha).split('T')[0] : 'Sin fecha';
                const horaLimpia = cita.hora_inicio ? String(cita.hora_inicio).substring(11, 16) : '00:00';

                return (
                  <div key={cita.id_citas} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontWeight: '700', color: '#1a365d', fontSize: '14px' }}>{fechaLimpia}</span>
                      <span style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '4px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                        {horaLimpia}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
                      <strong>Paciente:</strong> {cita.nombre_paciente || `ID: ${cita.id_paciente}`}
                    </div>
                    <div style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>
                      <strong>Servicio:</strong> {cita.nombre_servicio || 'Evaluación'}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                      <span style={{ backgroundColor: cita.estado_pago === 'Pagado' ? '#dcfce7' : '#fef08a', color: cita.estado_pago === 'Pagado' ? '#166534' : '#854d0e', padding: '4px 8px', borderRadius: '4px', fontWeight: '700' }}>
                        {cita.estado_pago}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const navButtonStyle = {
  backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#1a365d', width: '38px', height: '38px',
  borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', cursor: 'pointer', fontSize: '14px'
};

const navBtnPequeno = {
  backgroundColor: '#f1f5f9', border: 'none', color: '#475569', width: '28px', height: '28px',
  borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px'
};

function MetricCard({ titulo, valor, subtitulo, icono }) {
  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      padding: '20px 24px', 
      borderRadius: '16px', 
      boxShadow: '0 2px 10px rgba(0,0,0,0.02)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {icono && (
          <div style={{ 
            backgroundColor: '#eff6ff', 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {icono}
          </div>
        )}
        <div>
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>{titulo}</div>
          <div style={{ color: '#1a365d', fontSize: '30px', fontWeight: '800', lineHeight: '1', letterSpacing: '-1px' }}>{valor}</div>
        </div>
      </div>

      {subtitulo && (
        <div style={{ 
          backgroundColor: '#f8fafc', 
          color: '#64748b', 
          border: '1px solid #e2e8f0',
          padding: '6px 12px', 
          borderRadius: '20px', 
          fontSize: '12px', 
          fontWeight: '600',
          whiteSpace: 'nowrap'
        }}>
          {subtitulo}
        </div>
      )}
    </div>
  );
}