import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { PROFESIONALES } from '../data';

export default function Contact() {
  const { profId, servId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { fecha, hora } = location.state || {};
  const p = PROFESIONALES.find(prof => prof.id === parseInt(profId));
  const s = p?.servicios.find(serv => serv.id === parseInt(servId));

  // Estado para guardar el nombre del paciente
  const [nombre, setNombre] = useState('');

  if (!p || !s) return <div style={{padding: '100px', textAlign: 'center'}}>Error cargando datos.</div>;

  const handleSubmit = (e) => {
    e.preventDefault(); 
    // Navegamos al pago enviando TODOS los datos que hemos recolectado
    navigate(`/pago/${p.id}/${s.id}`, { state: { fecha, hora, contacto: { nombre } } });
  };

  return (
    <main>
      <div className="contact-wrap">
        <div className="contact-panel">
          <h2>Formulario de contacto</h2>
          <form onSubmit={handleSubmit}>
            <div className="cf-group">
              <label>Correo electrónico*</label>
              <input type="email" placeholder="ejemplo@correo.com" required />
            </div>
            <div className="cf-group">
              <label>Número de teléfono*</label>
              <input type="tel" placeholder="+56 9 1234 5678" required />
            </div>
            <div className="cf-group">
              <label>RUT*</label>
              <input type="text" placeholder="Ej: 12.345.678-9" required />
            </div>
            <div className="cf-group">
              <label>Nombre*</label>
              {/* Conectamos este input a nuestro estado */}
              <input 
                type="text" 
                placeholder="Ingresa tu nombre completo" 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required 
              />
            </div>
            
            <button className="cf-submit" type="submit">Continuar al pago</button>
            <div className="cf-hint">Tus datos solo se comparten con el profesional que elegiste.</div>
          </form>
        </div>
        
        <div className="summary-card">
          <div className="summary-head">
            <span className="ico">📅</span>
            <span className="txt">Reserva: {fecha} — {hora}</span>
          </div>
          <div className="summary-row"><div className="lbl">Modalidad</div><div className="val">{s.modalidad}</div></div>
          <div className="summary-row"><div className="lbl">Precio</div><div className="val">${s.precio} CLP</div></div>
          <div className="summary-row"><div className="lbl">Duración</div><div className="val">{s.duracion} min</div></div>
        </div>
      </div>
    </main>
  );
}