import { useLocation, useParams, Link } from 'react-router-dom';
import { PROFESIONALES } from '../data';

export default function Confirmation() {
  const { profId, servId } = useParams();
  const location = useLocation();
  
  // Rescatamos los datos finales
  const { fecha, hora, contacto } = location.state || {};
  
  const p = PROFESIONALES.find(prof => prof.id === parseInt(profId));
  const s = p?.servicios.find(serv => serv.id === parseInt(servId));

  // Generamos un código de reserva aleatorio tipo "FT-X8J9K"
  const reservaId = 'FT-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  if (!p || !s || !contacto) return <div style={{padding: '100px', textAlign: 'center'}}>Error cargando la reserva.</div>;

  return (
    <main>
      <div className="confirm-wrap">
        <div className="confirm-icon">✓</div>
        <h1>¡Hora confirmada!</h1>
        <div className="sub">Te enviamos el detalle a tu correo. Aquí tienes tu comprobante.</div>
        
        <div className="receipt">
          <div className="r-row">
            <span className="l">N° de reserva</span>
            <span className="v">{reservaId}</span>
          </div>
          <div className="r-row">
            <span className="l">Profesional</span>
            <span className="v">{p.nombre}</span>
          </div>
          <div className="r-row">
            <span className="l">Servicio</span>
            <span className="v">{s.nombre}</span>
          </div>
          <div className="r-row">
            <span className="l">Fecha y hora</span>
            <span className="v">{fecha} — {hora}</span>
          </div>
          <div className="r-row">
            <span className="l">Modalidad</span>
            <span className="v">{s.modalidad} {s.modalidad === 'Presencial' ? `· ${p.direccion}` : ''}</span>
          </div>
          <div className="r-row">
            <span className="l">Monto pagado</span>
            <span className="v">${s.precio} CLP</span>
          </div>
          <div className="r-row">
            <span className="l">Paciente</span>
            <span className="v">{contacto.nombre}</span>
          </div>
        </div>
        
        <div className="confirm-actions">
          {/* El botón para imprimir usa la función nativa del navegador */}
          <button className="btn-ghost" onClick={() => window.print()}>Descargar comprobante</button>
          
          {/* Volvemos al inicio reseteando el flujo */}
          <Link to="/" className="btn-primary" style={{textDecoration: 'none', display: 'inline-block'}}>
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}