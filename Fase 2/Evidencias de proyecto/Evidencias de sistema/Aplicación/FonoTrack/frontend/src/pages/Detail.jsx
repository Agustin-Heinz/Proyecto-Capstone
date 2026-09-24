import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function Detail() {
  const { id } = useParams();
  
  // Estados para manejar los datos del profesional desde MySQL
  const [p, setP] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Reutilizamos la ruta que trae a todos los profesionales
    fetch('http://localhost:3000/api/fonoaudiologos')
      .then(res => res.json())
      .then(datos => {
        // Buscamos específicamente al que coincide con el ID de la URL
        const fonoReal = datos.find(prof => prof.id_fonoaudiologo === parseInt(id));

        if (fonoReal) {
          // Adaptamos los datos al formato que espera el diseño visual
          setP({
            id: fonoReal.id_fonoaudiologo,
            nombre: fonoReal.nombre_completo,
            resumen: fonoReal.subespecialidad || 'Fonoaudiólogo Especialista',
            rating: fonoReal.calificacion_promedio ? parseFloat(fonoReal.calificacion_promedio) : 5.0,
            resenas: 0,
            acerca: fonoReal.acerca_de_mi || 'Sin descripción disponible.',
            telefono: 'No registrado', 
            email: 'No registrado',    
            // ✅ EL CAMBIO ESTÁ AQUÍ: Ahora inyectamos los servicios reales que vienen de MySQL
            servicios: fonoReal.servicios || [],
            reviews: [] 
          });
        }
        setCargando(false);
      })
      .catch(err => {
        console.error("Error cargando el perfil:", err);
        setCargando(false);
      });
  }, [id]);

  if (cargando) return <div style={{padding: '100px', textAlign: 'center'}}>Cargando perfil...</div>;
  if (!p) return <div style={{padding: '100px', textAlign: 'center'}}>Profesional no encontrado en la base de datos.</div>;

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
            {p.servicios.length === 0 ? (
              <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
                Este profesional aún no tiene servicios registrados.
              </div>
            ) : (
              p.servicios.map(s => (
                <div className="servicio-card" key={s.id_servicios}>
                  <div className="servicio-top">
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <h4>📍 {s.nombre_servicio}</h4>
                      <div className="servicio-meta">
                        <span>Modalidad: <strong>Presencial</strong></span>
                        <span>Duración: <strong>50 min</strong></span>
                      </div>
                    </div>
                    <div className="servicio-actions">
                      <div className="servicio-price">${s.precio} CLP</div>
                      <Link 
                        to={`/reserva/${p.id}/${s.id_servicios}`} 
                        className="ver-horas-btn" 
                        style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}
                      >
                        Ver horas
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <h2 style={{ marginTop: '34px' }}>Opiniones</h2>
          <div className="reviews-list">
            {p.reviews.length === 0 ? (
              <p style={{ color: '#64748b' }}>Aún no hay opiniones registradas para este profesional.</p>
            ) : (
              p.reviews.map((r, i) => (
                <div className="review-item" key={i}>
                  <div className="who">Anónimo</div>
                  <div className="stars">{'★'.repeat(r.rating)}</div>
                  <div className="comment">{r.comentario}</div>
                </div>
              ))
            )}
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