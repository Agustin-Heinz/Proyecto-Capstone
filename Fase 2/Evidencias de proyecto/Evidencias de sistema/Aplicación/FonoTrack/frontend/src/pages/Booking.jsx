import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PROFESIONALES } from '../data';

export default function Booking() {
  const { profId, servId } = useParams();
  
  // Buscamos el profesional y el servicio específico
  const p = PROFESIONALES.find(prof => prof.id === parseInt(profId));
  const s = p?.servicios.find(serv => serv.id === parseInt(servId));

  // Estados para guardar lo que el usuario selecciona
  const [fecha, setFecha] = useState(null);
  const [hora, setHora] = useState(null);
  const navigate = useNavigate();

  // Fechas y horas de prueba para la interfaz
  const fechasDisp = [
    { key: '2026-10-20', dow: 'Mar', num: '20' },
    { key: '2026-10-21', dow: 'Mié', num: '21' },
    { key: '2026-10-22', dow: 'Jue', num: '22' }
  ];
  const horasDisp = ['09:00 AM', '11:00 AM', '15:00 PM', '16:00 PM'];

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
                {horasDisp.map(h => (
                  <div 
                    key={h} 
                    className={`hora-chip ${hora === h ? 'selected' : ''}`} 
                    onClick={() => setHora(h)}
                  >
                    {h}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="booking-continue-row">
          {/* El botón de continuar se desactiva si no ha elegido hora */}
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