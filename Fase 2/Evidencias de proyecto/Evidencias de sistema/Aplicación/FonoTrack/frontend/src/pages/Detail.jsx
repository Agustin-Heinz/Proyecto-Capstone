import { useParams, Link } from 'react-router-dom';
import { PROFESIONALES } from '../data';

export default function Detail() {
  // Leemos el ID desde la URL
  const { id } = useParams();
  
  // Buscamos al profesional que coincida con ese ID
  const p = PROFESIONALES.find(prof => prof.id === parseInt(id));

  // Si alguien pone un ID que no existe, mostramos un error
  if (!p) return <div style={{padding: '100px', textAlign: 'center'}}>Profesional no encontrado.</div>;

  return (
    <main>
      <div className="detail-head">
        <div className="wrap row2">
          <div className="avatar-lg">👤</div>
          <div>
            <h1>{p.nombre}</h1>
            <div className="resumen">{p.resumen}</div>
            <div className="stars">⭐ {p.rating.toFixed(1)} ({p.resenas} reseñas)</div>
          </div>
        </div>
      </div>
      
      <div className="wrap detail-body">
        <div>
          <h2>Servicios disponibles</h2>
          <div>
            {p.servicios.map(s => (
              <div className="servicio-card" key={s.id}>
                <div className="servicio-top">
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <h4>📍 {s.nombre}</h4>
                    <div className="servicio-meta">
                      <span>Modalidad: <strong>{s.modalidad}</strong></span>
                      <span>Duración: <strong>{s.duracion} min</strong></span>
                    </div>
                  </div>
                  <div className="servicio-actions">
                    <div className="servicio-price">${s.precio} CLP</div>
                    {/* Este botón luego nos llevará al flujo de pago/reserva */}
                    <Link 
                        to={`/reserva/${p.id}/${s.id}`} 
                        className="ver-horas-btn" 
                        style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}
                    >
                        Ver horas
                    </Link>
                  </div>
                </div>
                <div className="servicio-extra show">{s.detalle}</div>
              </div>
            ))}
          </div>

          <h2 style={{ marginTop: '34px' }}>Opiniones</h2>
          <div className="reviews-list">
            {p.reviews.map((r, i) => (
              <div className="review-item" key={i}>
                <div className="who">Anónimo</div>
                <div className="stars">{'★'.repeat(r.rating)}</div>
                <div className="comment">{r.comentario}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="side-box">
            <h4>Acerca de mí</h4>
            <p>{p.acerca}</p>
          </div>
          <div className="side-box">
            <h4>Contacto</h4>
            <div className="contact-line">📞 {p.telefono}</div>
            <div className="contact-line">✉️ {p.email}</div>
          </div>
        </div>
      </div>
    </main>
  );
}