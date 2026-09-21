import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PROFESIONALES } from '../data';

export default function Booking() {
  const { profId, servId } = useParams();
  const navigate = useNavigate();

  const p = PROFESIONALES.find(prof => prof.id === parseInt(profId));
  const s = p?.servicios.find(serv => serv.id === parseInt(servId));

  const [fecha, setFecha] = useState(null);
  const [hora, setHora] = useState(null);

  // 🔴 AQUÍ ESTÁ LA SOLUCIÓN: Agrega esta línea antes de las fechas y del useEffect
  const [horasOcupadas, setHorasOcupadas] = useState([]);

  const fechasDisp = [
    { key: '2026-10-20', dow: 'Mar', num: '20' },
    { key: '2026-10-21', dow: 'Mié', num: '21' },
    { key: '2026-10-22', dow: 'Jue', num: '22' }
  ];

  const horasDisp = ['09:00', '11:00', '15:00', '16:00'];

  // Petición al Backend cada vez que el usuario elige/cambia la fecha
useEffect(() => {
  // Si no hay fecha o profId, salimos sin ejecutar setState síncrono
  if (!fecha || !profId) return;

  fetch(`http://localhost:3000/api/citas/ocupadas?fecha=${fecha}&id_fonoaudiologo=${profId}`)
    .then((res) => res.json())
    .then((data) => setHorasOcupadas(data))
    .catch((err) => console.error("Error al obtener horas ocupadas:", err));
}, [fecha, profId]);

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
                  // Verificamos si la hora que se está renderizando está en el arreglo de ocupadas
                  const estaOcupada = horasOcupadas.includes(h);

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
            onClick={() => navigate(`/contacto/${p.id}/${s.id}`, { state: { fecha, hora } })}
          >
            Continuar →
          </button>
        </div>
      </div>
    </main>
  );
}