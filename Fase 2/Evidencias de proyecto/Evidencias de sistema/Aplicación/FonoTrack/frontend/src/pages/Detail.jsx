import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Star, MapPin, Phone, Mail } from 'lucide-react';

export default function Detail() {
  const { id } = useParams();
  
  const [p, setP] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/api/fonoaudiologos')
      .then(res => res.json())
      .then(datos => {
        const fonoReal = datos.find(prof => prof.id_fonoaudiologo === parseInt(id));

        if (fonoReal) {
          setP({
            id: fonoReal.id_fonoaudiologo,
            nombre: fonoReal.nombre_completo,
            resumen: fonoReal.subespecialidad || 'Fonoaudiólogo Especialista',
            rating: fonoReal.calificacion_promedio ? parseFloat(fonoReal.calificacion_promedio) : 5.0,
            resenas: 0,
            acerca: fonoReal.acerca_de_mi || 'Sin descripción disponible.',
            telefono: 'No registrado', 
            email: 'No registrado',    
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
          {/* Avatar actualizado con icono */}
          <div className="avatar-lg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={48} color="#64748b" />
          </div>
          <div>
            <h1>{p.nombre}</h1>
            <div className="resumen">{p.resumen}</div>
            {/* Estrella alineada con flexbox */}
            <div className="stars" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Star size={20} color="#fbbf24" fill="#fbbf24" />
              <span>{p.rating.toFixed(1)} <span style={{color: '#64748b'}}>({p.resenas} reseñas)</span></span>
            </div>
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
                      {/* Icono de ubicación para el servicio */}
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={20} color="#64748b" />
                        {s.nombre_servicio}
                      </h4>
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
                  {/* Generación de estrellas dinámicas según la calificación */}
                  <div className="stars" style={{ display: 'flex', gap: '2px' }}>
                    {Array.from({ length: r.rating }).map((_, idx) => (
                      <Star key={idx} size={14} color="#fbbf24" fill="#fbbf24" />
                    ))}
                  </div>
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
            {/* Iconos de contacto alineados */}
            <div className="contact-line" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Phone size={18} color="#64748b" /> {p.telefono}
            </div>
            <div className="contact-line" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={18} color="#64748b" /> {p.email}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}