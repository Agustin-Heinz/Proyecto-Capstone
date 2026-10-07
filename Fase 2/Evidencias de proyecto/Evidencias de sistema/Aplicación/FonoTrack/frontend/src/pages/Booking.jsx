import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Calendar } from 'lucide-react';

export default function Booking() {
  const { profId, servId } = useParams();
  const navigate = useNavigate();
  
  
  const location = useLocation();
  const { reagendando, idCitaAntigua, estadoPagoAnterior } = location.state || {};

  // Estados para la base de datos real
  const [p, setP] = useState(null);
  const [s, setS] = useState(null);
  const [disponibilidad, setDisponibilidad] = useState([]); 
  const [cargandoInfo, setCargandoInfo] = useState(true);

  const [fecha, setFecha] = useState(null);
  const [hora, setHora] = useState(null);
  const [horasOcupadas, setHorasOcupadas] = useState([]);

  // Estados del Modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [tiempo, setTiempo] = useState(60);
  const [pasoModal, setPasoModal] = useState(1);
  
  // Estados para el guardado en MySQL
  const [procesandoReserva, setProcesandoReserva] = useState(false);
  const [idCitaGenerada, setIdCitaGenerada] = useState(null);

  // Lógica para el cronómetro
  useEffect(() => {
    let intervalo;
    if (mostrarModal && tiempo > 0) {
      intervalo = setInterval(() => {
        setTiempo((t) => t - 1);
      }, 1000);
    } else if (tiempo === 0) {
      setMostrarModal(false); 
    }
    return () => clearInterval(intervalo);
  }, [mostrarModal, tiempo]);

  const handleConfirmarYGuardar = async () => {
    const esPaciente = localStorage.getItem('rol') === 'paciente';
    
    // Si no es un paciente real, lo mandamos al formulario de contacto pasándole la memoria
    if (!esPaciente) {
      navigate(`/contacto/${profId}/${servId}`, { 
        state: { fecha, hora, reagendando, idCitaAntigua, estadoPagoAnterior } 
      });
      return;
    }

    setProcesandoReserva(true);
    const perfilId = localStorage.getItem('perfilId');

    try {
      const respuesta = await fetch('http://localhost:3000/api/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_paciente: parseInt(perfilId),
          id_fonoaudiologo: parseInt(profId),
          id_servicio: parseInt(servId),
          fecha: fecha,
          hora_inicio: hora,
          duracion_minutos: 50,
          precio: s?.precio || 0,
          // Si es un reagendamiento que ya estaba pagado, heredamos el pago
          ...(reagendando && estadoPagoAnterior === 'Pagado' && { estado_pago: 'Pagado' })
        })
      });

      if (respuesta.ok) {
        const nuevaCita = await respuesta.json();

       
        if (reagendando && idCitaAntigua) {
          await fetch(`http://localhost:3000/api/citas/${idCitaAntigua}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado_asistencia: 'Anulada' })
          });

          // Si ya pagó antes, lo devolvemos al inicio con éxito total (sin pasar por el modal de pago)
          if (estadoPagoAnterior === 'Pagado') {
            alert(" Hora reagendada con éxito.");
            setMostrarModal(false);
            navigate('/');
            return;
          }
        }

        // Flujo normal o reagendamiento sin pago previo
        setIdCitaGenerada(nuevaCita.id_citas); 
        setHorasOcupadas((prev) => [...prev, hora]); 
        setPasoModal(2); 
      } else {
        alert("Error al guardar la hora en la base de datos.");
      }
      
    } catch (error) {
      console.error("Error de conexión:", error);
    } finally {
      setProcesandoReserva(false);
    }
  };

  // Función de navegación inteligente hacia el pago (Paso 2)
  const confirmarReserva = () => {
    const esPaciente = localStorage.getItem('rol') === 'paciente';
    const pacienteNombre = localStorage.getItem('nombre');

    if (esPaciente) {
      navigate(`/pago/${profId}/${servId}`, {
        state: { 
          fecha: fecha, 
          hora: hora,
          contacto: { nombre: pacienteNombre },
          reservaId: idCitaGenerada
        }
      });
    } else {
      navigate(`/contacto/${profId}/${servId}`, {
        state: { fecha: fecha, hora: hora }
      });
    }
  };

  // CARGA DE LOS DATOS Y DISPONIBILIDAD DESDE MYSQL
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const resFonos = await fetch('http://localhost:3000/api/fonoaudiologos');
        const fonos = await resFonos.json();
        
        const resServs = await fetch(`http://localhost:3000/api/servicios?id_fonoaudiologo=${profId}`);
        const servs = await resServs.json();

        const resDisp = await fetch(`http://localhost:3000/api/disponibilidad?id_fonoaudiologo=${profId}&id_servicio=${servId}`);
        const disp = await resDisp.json();

        const fonoReal = fonos.find(f => f.id_fonoaudiologo === parseInt(profId));
        const servReal = servs.find(srv => srv.id_servicios === parseInt(servId));

        setP(fonoReal);
        setS(servReal);
        setDisponibilidad(disp);
        setCargandoInfo(false);
      } catch (error) {
        console.error("Error al cargar datos desde MySQL:", error);
        setCargandoInfo(false);
      }
    };
    if(profId && servId) cargarDatos();
  }, [profId, servId]);

  // CARRUSEL HORARIO PARA EL APARTADO DE SELECCIÓN DE HORAS
  const diasSemana = ['DOM.', 'LUN.', 'MAR.', 'MIÉ.', 'JUE.', 'VIE.', 'SÁB.'];
  const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const mesesCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const fechasUnicas = [...new Set(disponibilidad.map(d => {
    return d.dia_semana ? String(d.dia_semana).split('T')[0] : '';
  }))].filter(Boolean).sort(); 

  const listaFechas = fechasUnicas.map(fechaStr => {
    const f = new Date(`${fechaStr}T12:00:00`); 
    return {
      key: fechaStr,
      dow: diasSemana[f.getDay()],
      num: f.getDate(),
      mesCorto: meses[f.getMonth()],
      mesCompleto: mesesCompletos[f.getMonth()],
      anio: f.getFullYear()
    };
  });

  const [indiceInicio, setIndiceInicio] = useState(0);
  const diasVisibles = 5;

  const avanzarFechas = () => {
    if (indiceInicio + diasVisibles < listaFechas.length) setIndiceInicio(indiceInicio + 1);
  };
  
  const retrocederFechas = () => {
    if (indiceInicio > 0) setIndiceInicio(indiceInicio - 1);
  };

  const fechasMostradas = listaFechas.slice(indiceInicio, indiceInicio + diasVisibles);
  const mesActual = fechasMostradas[0]?.mesCompleto || 'Sin horarios';
  const anioActual = fechasMostradas[0]?.anio || '';

  // CREACIÓN DE UN CONSTRUCTOR DINÁMICO DE HORAS
  const bloquesDelDia = disponibilidad.filter(d => {
    const dStr = d.dia_semana ? String(d.dia_semana).split('T')[0] : '';
    return dStr === fecha;
  });

  const horasDisp = bloquesDelDia.map(d => {
    return d.hora_inicio ? String(d.hora_inicio).substring(11, 16) : '';
  }).filter(Boolean).sort();

  // BLOQUEO DE HORAS YA RESERVADAS
  useEffect(() => {
    if (!fecha || !profId) return;

    fetch(`http://localhost:3000/api/citas/ocupadas?fecha=${fecha}&id_fonoaudiologo=${profId}`)
      .then((res) => res.json())
      .then((data) => setHorasOcupadas(data))
      .catch((err) => console.error("Error al obtener horas ocupadas:", err));
  }, [fecha, profId]);


  if (cargandoInfo) return <div style={{padding: '100px', textAlign: 'center'}}>Conectando con la clínica...</div>;
  if (!p || !s) return <div style={{padding: '100px', textAlign: 'center'}}>Servicio no encontrado en la base de datos.</div>;

  return (
    <main>
      <div className="booking-wrap">
        
        <div className="booking-banner">
          <div className="eyebrow2" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} /> Agenda de atención
            </div>
          <h2>{s.nombre_servicio}</h2>
          <div className="note">Atención con {p.nombre_completo}</div>
        </div>
                
        <div className="info-bar">
          <div className="cell"><div className="lbl">Modalidad</div><div className="val">Presencial</div></div>
          <div className="cell"><div className="lbl">Precio</div><div className="val">${s.precio} CLP</div></div>
          <div className="cell"><div className="lbl">Duración</div><div className="val">50 min</div></div>
        </div>

        <div className="step-label">1. ELIGE UNA FECHA</div>
        
        {listaFechas.length === 0 ? (
          <div style={{ padding: '20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px' }}>
            El profesional aún no ha configurado horarios de atención para este servicio.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '0 5px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#1a365d' }}>
                {mesActual} {anioActual}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={retrocederFechas} disabled={indiceInicio === 0} style={{ ...btnNavStyle, opacity: indiceInicio === 0 ? 0.3 : 1 }}>&lt;</button>
                <button onClick={avanzarFechas} disabled={indiceInicio + diasVisibles >= listaFechas.length} style={{ ...btnNavStyle, opacity: indiceInicio + diasVisibles >= listaFechas.length ? 0.3 : 1 }}>&gt;</button>
              </div>
            </div>

            <div className="date-strip-row">
              <div className="date-strip" style={{ display: 'flex', gap: '10px', width: '100%' }}>
                {fechasMostradas.map(f => (
                  <div
                    key={f.key}
                    className={`date-chip ${fecha === f.key ? 'selected' : ''}`}
                    style={{ flex: 1, padding: '12px 5px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: fecha === f.key ? '#edf2f7' : '#ffffff', borderColor: fecha === f.key ? '#3b82f6' : '#e2e8f0' }}
                    onClick={() => { setFecha(f.key); setHora(null); }}
                  >
                    <div className="dow" style={{ fontSize: '11px', fontWeight: 'bold', color: fecha === f.key ? '#1d4ed8' : '#64748b' }}>{f.dow}</div>
                    <div className="num" style={{ fontSize: '18px', fontWeight: 'bold', color: fecha === f.key ? '#1e40af' : '#0f172a', margin: '4px 0' }}>{f.num}</div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{f.mesCorto}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="step-label" style={{ marginTop: '30px' }}>2. ELIGE UN HORARIO</div>
        <div id="horariosWrap">
          {!fecha ? (
            <div className="no-horarios">Elige una fecha arriba para ver los bloques disponibles.</div>
          ) : horasDisp.length === 0 ? (
            <div className="no-horarios">No hay bloques configurados para este día.</div>
          ) : (
            <div className="horarios-group">
              <div className="horarios-chips">
                {horasDisp.map(h => {
                  const estaOcupada = horasOcupadas.includes(h);

                  return (
                    <div
                      key={h}
                      className={`hora-chip ${hora === h ? 'selected' : ''} ${estaOcupada ? 'disabled' : ''}`}
                      style={{
                        opacity: estaOcupada ? 0.4 : 1,
                        cursor: estaOcupada ? 'not-allowed' : 'pointer',
                        backgroundColor: estaOcupada ? '#e0e0e0' : undefined,
                        textDecoration: estaOcupada ? 'line-through' : 'none',
                        padding: '10px 16px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontWeight: '600',
                        color: estaOcupada ? '#64748b' : '#0f172a'
                      }}
                      onClick={() => {
                        if (!estaOcupada) setHora(h);
                      }}
                    >
                      {h} {estaOcupada ? '(Ocupado)' : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Botón Continuar */}
        <div className="booking-continue-row">
          <button 
            className={`btn-primary ${!hora ? 'btn-disabled' : ''}`} 
            disabled={!hora}
            onClick={() => {
              setTiempo(60); 
              setPasoModal(1);
              setMostrarModal(true); 
            }}
          >
            Tomar hora
          </button>
        </div>
      </div>

      {/* POPUP DE CONFIRMACIÓN */}
      {mostrarModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            
            {pasoModal === 1 ? (
              /*  CONFIRMACIÓN Y CRONÓMETRO  */
              <>
                <h3 style={{ margin: '0 0 16px 0', color: '#1a365d', fontSize: '20px' }}>Confirma tu reserva</h3>
                
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 8px 0', color: '#475569' }}>
                    Fonoaudiólogo/a: <strong style={{color: '#0f172a'}}>{p?.nombre_completo || p?.nombre}</strong>
                  </p>
                  <p style={{ margin: 0, color: '#475569' }}>
                    Atención el: <strong style={{color: '#0f172a'}}>{fecha}</strong> a las <strong style={{color: '#0f172a'}}>{hora}</strong>
                  </p>
                </div>
                
                <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${(tiempo / 60) * 100}%`, 
                    backgroundColor: tiempo > 15 ? '#6366f1' : '#ef4444', 
                    transition: 'width 1s linear, background-color 0.3s' 
                  }}></div>
                </div>
                <p style={{ fontSize: '13px', color: tiempo > 15 ? '#64748b' : '#ef4444', textAlign: 'center', margin: '0 0 24px 0', fontWeight: '500' }}>
                  La reserva caducará en {tiempo} segundos
                </p>

                <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                  <button 
                    onClick={handleConfirmarYGuardar} 
                    disabled={procesandoReserva}
                    style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: procesandoReserva ? '#94a3b8' : '#4f46e5', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}
                  >
                    {procesandoReserva ? 'Guardando en agenda...' : 'Está todo correcto'}
                  </button>
                  <button 
                    onClick={() => setMostrarModal(false)} 
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: '600', color: '#64748b', fontSize: '14px' }}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              /* ÉXITO Y OPCIÓN DE PAGO  */
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
                  <h3 style={{ margin: '0 0 10px 0', color: '#166534', fontSize: '22px' }}>¡Hora tomada correctamente!</h3>
                  <p style={{ margin: 0, color: '#475569', fontSize: '15px', lineHeight: '1.5' }}>
                    Tu reserva ha sido pre-aprobada. ¿Deseas realizar el pago ahora mismo para dejarla confirmada?
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                  <button 
                    onClick={confirmarReserva} 
                    style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#4f46e5', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}
                  >
                    Sí, ir a pagar al tiro
                  </button>
                  <button 
                    onClick={() => {
                      setMostrarModal(false);
                      navigate('/');
                    }} 
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: '600', color: '#475569', fontSize: '14px' }}
                  >
                    No, pagaré en la consulta
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </main>
  );
}

// Estilo para los botones de las flechitas
const btnNavStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  color: '#1a365d',
  width: '32px',
  height: '32px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '16px'
};