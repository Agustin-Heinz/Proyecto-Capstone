import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Star, MapPin, Phone, Mail, MessageSquare } from 'lucide-react';

export default function Detail() {
  const { id } = useParams();
  
  const [p, setP] = useState(null);
  const [reviews, setReviews] = useState([]); // Estado para la lista de reseñas reales
  const [cargando, setCargando] = useState(true);

  // Estados para el formulario de nueva reseña
  const [nuevaResena, setNuevaResena] = useState({ rating: 5, comentario: '' });
  const [enviando, setEnviando] = useState(false);
  const [mensajeForm, setMensajeForm] = useState({ texto: '', tipo: '' });

  // Función para cargar los datos (la separamos para poder llamarla al guardar un comentario)
  const cargarDatos = async () => {
    try {
      // Cargamos el perfil y las reseñas al mismo tiempo
      const [resFono, resResenas] = await Promise.all([
        fetch('http://localhost:3000/api/fonoaudiologos'),
        fetch(`http://localhost:3000/api/resenas/${id}`)
      ]);

      const datosFonos = await resFono.json();
      const datosResenas = await resResenas.json();

      const fonoReal = datosFonos.find(prof => prof.id_fonoaudiologo === parseInt(id));

      if (fonoReal) {
        setP({
          id: fonoReal.id_fonoaudiologo,
          nombre: fonoReal.nombre_completo,
          resumen: fonoReal.subespecialidad || 'Fonoaudiólogo Especialista',
          acerca: fonoReal.acerca_de_mi || 'Sin descripción disponible.',
          telefono: 'No registrado', 
          email: 'No registrado',    
          servicios: fonoReal.servicios || [],
          foto_perfil: fonoReal.foto_perfil 
        });
      }
      
      // Guardamos las reseñas traídas de la base de datos
      setReviews(datosResenas);
      setCargando(false);

    } catch (err) {
      console.error("Error cargando los datos:", err);
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [id]);

  // Manejador para enviar el formulario de reseña
  const handleSubmitResena = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setMensajeForm({ texto: '', tipo: '' });

    const pacienteIdStr = localStorage.getItem('perfilId');
    const idPaciente = pacienteIdStr ? parseInt(pacienteIdStr) : 1; 

    try {
      const respuesta = await fetch('http://localhost:3000/api/resenas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_paciente: idPaciente,
          id_fonoaudiologo: parseInt(id),
          calificacion: nuevaResena.rating,
          comentario: nuevaResena.comentario
        })
      });

      if (respuesta.ok) {
        setMensajeForm({ texto: '¡Gracias por tu valoración!', tipo: 'exito' });
        setNuevaResena({ rating: 5, comentario: '' }); // Limpiar formulario
        cargarDatos(); // Recargar la lista para mostrar el nuevo comentario al instante
      } else {
        throw new Error('Error al enviar la reseña');
      }
    } catch (error) {
      setMensajeForm({ texto: 'Hubo un problema al enviar tu comentario.', tipo: 'error' });
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <div style={{padding: '100px', textAlign: 'center'}}>Cargando perfil...</div>;
  if (!p) return <div style={{padding: '100px', textAlign: 'center'}}>Profesional no encontrado en la base de datos.</div>;

  // Calculamos el promedio basado en la tabla reseñas
  const promedioReal = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.calificacion, 0) / reviews.length).toFixed(1)
    : "5.0";

  return (
    <main>
      <div className="detail-head">
        <div className="wrap row2">
          <div className="avatar-lg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '50%', backgroundColor: '#f1f5f9', width: '64px', height: '64px' }}>
            {p.foto_perfil ? (
              <img 
                src={p.foto_perfil} 
                alt={p.nombre} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <User size={48} color="#64748b" />
            )}
          </div>

          <div>
            <h1>{p.nombre}</h1>
            <div className="resumen">{p.resumen}</div>
            <div className="stars" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Star size={20} color="#fbbf24" fill="#fbbf24" />
              <span>{promedioReal} <span style={{color: '#64748b'}}>({reviews.length} opiniones)</span></span>
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

          {/* SECCIÓN DE RESEÑAS DINÁMICAS */}
          <h2 style={{ marginTop: '40px', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <MessageSquare size={24} /> Opiniones de pacientes
          </h2>
          
          <div className="reviews-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {reviews.length === 0 ? (
              <p style={{ color: '#64748b', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                 Aún no hay opiniones registradas para este profesional.
              </p>
            ) : (
              reviews.map(r => (
                <div className="review-item" key={r.id_resena} style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#ffffff' }}>
                  <div className="who" style={{ fontWeight: '700', color: '#1e293b', marginBottom: '5px' }}>
                     {r.nombre_paciente}
                  </div>
                  <div className="stars" style={{ display: 'flex', gap: '2px', marginBottom: '10px' }}>
                    {/* Dibuja las estrellas según la nota guardada */}
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star 
                        key={idx} 
                        size={16} 
                        color={idx < r.calificacion ? "#fbbf24" : "#cbd5e1"} 
                        fill={idx < r.calificacion ? "#fbbf24" : "transparent"} 
                      />
                    ))}
                  </div>
                  <div className="comment" style={{ color: '#475569', lineHeight: '1.5' }}>
                     {r.comentario || 'Sin comentario escrito.'}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* FORMULARIO PARA UNA NUEVA OPINIÓN */}
          <div style={{ marginTop: '30px', padding: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>Deja tu valoración</h3>
            <form onSubmit={handleSubmitResena} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
               
               <div>
                 <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#475569' }}>¿Cómo calificarías tu experiencia?</div>
                 <div style={{ display: 'flex', gap: '5px' }}>
                   {/* Selector interactivo de 5 estrellas */}
                   {[1, 2, 3, 4, 5].map(num => (
                     <Star 
                       key={num} 
                       size={28} 
                       style={{ cursor: 'pointer', transition: '0.2s' }}
                       color={num <= nuevaResena.rating ? "#fbbf24" : "#cbd5e1"} 
                       fill={num <= nuevaResena.rating ? "#fbbf24" : "transparent"}
                       onClick={() => setNuevaResena({ ...nuevaResena, rating: num })}
                     />
                   ))}
                 </div>
               </div>

               <div>
                 <textarea 
                   placeholder="Escribe tu opinión sobre el especialista (opcional)..." 
                   value={nuevaResena.comentario}
                   onChange={e => setNuevaResena({ ...nuevaResena, comentario: e.target.value })}
                   style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }}
                 />
               </div>

               {mensajeForm.texto && (
                 <div style={{ padding: '10px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', backgroundColor: mensajeForm.tipo === 'exito' ? '#dcfce7' : '#fee2e2', color: mensajeForm.tipo === 'exito' ? '#166534' : '#991b1b' }}>
                   {mensajeForm.texto}
                 </div>
               )}

               <button 
                 type="submit" 
                 disabled={enviando}
                 style={{ alignSelf: 'flex-start', backgroundColor: '#1d4ed8', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: enviando ? 'not-allowed' : 'pointer' }}
               >
                 {enviando ? 'Enviando...' : 'Publicar opinión'}
               </button>
            </form>
          </div>

        </div>

        <div>
          <div className="side-box">
            <h4>Acerca de mí</h4>
            <p>{p.acerca}</p>
          </div>
          <div className="side-box">
            <h4>Contacto</h4>
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