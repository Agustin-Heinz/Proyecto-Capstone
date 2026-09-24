import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function Booking() {
  const { profId, servId } = useParams();
  const navigate = useNavigate();

  const [p, setP] = useState(null);
  const [s, setS] = useState(null);
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const [fecha, setFecha] = useState(null);
  const [hora, setHora] = useState(null);
  const [horasOcupadas, setHorasOcupadas] = useState([]);
  const [fechasDisp, setFechasDisp] = useState([]);
  const [horasDisp, setHorasDisp] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/fonoaudiologos')
      .then(res => res.json())
      .then(datos => {
        const fonoReal = datos.find(prof => prof.id_fonoaudiologo === parseInt(profId));
        if (fonoReal) {
          setP({
            id: fonoReal.id_fonoaudiologo,
            nombre: fonoReal.nombre_completo,
          });
          setDisponibilidad(fonoReal.disponibilidad || []);
          const servicioReal = fonoReal.servicios?.find(serv => serv.id_servicios === parseInt(servId));
          if (servicioReal) {
            setS({
              id: servicioReal.id_servicios,
              nombre: servicioReal.nombre_servicio,
              modalidad: "Presencial",
              duracion: 50,
              precio: servicioReal.precio
            });
          }
        }
        setCargandoDatos(false);
      })
      .catch(err => {
        console.error("Error cargando profesional:", err);
        setCargandoDatos(false);
      });
  }, [profId, servId]);

  // Generar próximos días hábiles usando los días registrados
  useEffect(() => {
    if (disponibilidad.length === 0) return;

    const diasPermitidos = disponibilidad.map(d => {
      const ds = d.dia_semana.toLowerCase();
      if (ds.includes('lun')) return 1;
      if (ds.includes('mar')) return 2;
      if (ds.includes('mi')) return 3;
      if (ds.includes('jue')) return 4;
      if (ds.includes('vie')) return 5;
      if (ds.includes('sáb') || ds.includes('sab')) return 6;
      if (ds.includes('dom')) return 0;
      return -1;
    });

    const fechas = [];
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    let fechaActual = new Date();
    
    // Solo permitimos 1 sola fecha por cada día de la semana configurado
    const diasAgregados = new Set();
    let intentos = 0;
    
    while (diasAgregados.size < diasPermitidos.length && intentos < 14) { 
      fechaActual.setDate(fechaActual.getDate() + 1);
      const dayOfWeek = fechaActual.getDay();
      
      // Si el profesional atiende este día y aún no lo hemos agregado
      if (diasPermitidos.includes(dayOfWeek) && !diasAgregados.has(dayOfWeek)) {
        const year = fechaActual.getFullYear();
        const month = String(fechaActual.getMonth() + 1).padStart(2, '0');
        const day = String(fechaActual.getDate()).padStart(2, '0');
        
        fechas.push({
          key: `${year}-${month}-${day}`,
          dow: dias[dayOfWeek],
          num: fechaActual.getDate().toString()
        });
        
        diasAgregados.add(dayOfWeek);
      }
      intentos++;
    }
    
    // Ordenar las fechas cronológicamente
    fechas.sort((a, b) => new Date(a.key) - new Date(b.key));
    setFechasDisp(fechas);
  }, [disponibilidad]);

  // Generar horas basadas en el día seleccionado
  useEffect(() => {
    if (!fecha || disponibilidad.length === 0) {
      setHorasDisp([]);
      return;
    }
    const [y, m, d] = fecha.split('-');
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay();

    const mapDayNames = { 0: 'dom', 1: 'lun', 2: 'mar', 3: 'mi', 4: 'jue', 5: 'vie', 6: 'sab' };
    const currDayStr = mapDayNames[dayOfWeek];

    const diaDisp = disponibilidad.find(disp => disp.dia_semana.toLowerCase().includes(currDayStr));
    
    if (diaDisp) {
       const startMatch = String(diaDisp.hora_inicio).match(/T(\d{2}:\d{2})/);
       const endMatch = String(diaDisp.hora_fin).match(/T(\d{2}:\d{2})/);
       
       if (startMatch && endMatch) {
         setHorasDisp([`${startMatch[1]} - ${endMatch[1]}`]);
       } else {
         setHorasDisp([]);
       }
    } else {
       setHorasDisp([]);
    }
  }, [fecha, disponibilidad]);

  // Petición al Backend cada vez que el usuario elige/cambia la fecha
  useEffect(() => {
    if (!fecha || !profId) return;

    fetch(`http://localhost:3000/api/citas/ocupadas?fecha=${fecha}&id_fonoaudiologo=${profId}`)
      .then((res) => res.json())
      .then((data) => setHorasOcupadas(data))
      .catch((err) => console.error("Error al obtener horas ocupadas:", err));
  }, [fecha, profId]);

  if (cargandoDatos) return <div style={{padding: '100px', textAlign: 'center'}}>Cargando servicio...</div>;
  if (!p || !s) return <div style={{padding: '100px', textAlign: 'center'}}>Servicio no encontrado.</div>;

  return (
    <main>
      <div className="booking-wrap">
        <div className="booking-banner">
          <div className="eyebrow2">📅 Agenda de atención</div>
          <h2>{s.nombre}</h2>
          <div className="note">Atención con {p.nombre}</div>
        </div>
        
        <div className="info-bar">
          <div className="cell"><div className="lbl">Modalidad</div><div className="val">{s.modalidad}</div></div>
          <div className="cell"><div className="lbl">Precio</div><div className="val">${s.precio} CLP</div></div>
          <div className="cell"><div className="lbl">Duración</div><div className="val">{s.duracion} min</div></div>
        </div>

        <div className="step-label">1. Elige una fecha</div>
        <div className="date-strip-row">
          <div className="date-strip">
            {fechasDisp.map(f => (
              <div 
                key={f.key} 
                className={`date-chip ${fecha === f.key ? 'selected' : ''}`} 
                onClick={() => { setFecha(f.key); setHora(null); }}
              >
                <div className="dow">{f.dow}</div>
                <div className="num">{f.num}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="step-label">2. Elige un horario</div>
        <div id="horariosWrap">
          {!fecha ? (
            <div className="no-horarios">Elige una fecha para ver los horarios disponibles.</div>
          ) : (
            <div className="horarios-group">
              <div className="horarios-chips">
                {horasDisp.map(h => {
                  // Extraemos la hora de inicio (ej: "09:00" de "09:00 - 13:00")
                  const startHour = h.split(' - ')[0];
                  // Verificamos si esa hora está en el arreglo de ocupadas
                  const estaOcupada = horasOcupadas.includes(startHour);

                  return (
                    <div 
                      key={h} 
                      className={`hora-chip ${hora === h ? 'selected' : ''} ${estaOcupada ? 'disabled' : ''}`} 
                      style={{
                        opacity: estaOcupada ? 0.4 : 1,
                        cursor: estaOcupada ? 'not-allowed' : 'pointer',
                        backgroundColor: estaOcupada ? '#e0e0e0' : undefined,
                        textDecoration: estaOcupada ? 'line-through' : 'none'
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

        <div className="booking-continue-row">
          <button 
            className={`btn-primary ${!hora ? 'btn-disabled' : ''}`} 
            disabled={!hora}
            onClick={() => navigate(`/contacto/${p.id}/${s.id}`, { state: { fecha, hora, p, s } })}
          >
            Continuar →
          </button>
        </div>
      </div>
    </main>
  );
}