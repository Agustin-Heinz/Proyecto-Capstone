import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, MapPin, Star, Sparkles, Users } from 'lucide-react';

export default function Directory() {
  const [profesionalesBD, setProfesionalesBD] = useState([]);
  const [listaComunas, setListaComunas] = useState([]);
  const [listaCatalogo, setListaCatalogo] = useState([]);

  const [filtroPublico, setFiltroPublico] = useState('');
  const [filtroEsp, setFiltroEsp] = useState('');
  const [filtroUbicacion, setFiltroUbicacion] = useState('');
  const [filtroCalif, setFiltroCalif] = useState('0');
  const [activeTabs, setActiveTabs] = useState({});

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resFonos, resComunas, resCatalogo] = await Promise.all([
          fetch('http://localhost:3000/api/fonoaudiologos'),
          fetch('http://localhost:3000/api/comunas'),
          fetch('http://localhost:3000/api/catalogo-servicios')
        ]);

        const datosFonos = await resFonos.json();
        const datosComunas = await resComunas.json();
        const datosCatalogo = await resCatalogo.json();
        
        setListaComunas(datosComunas);
        setListaCatalogo(Array.isArray(datosCatalogo) ? datosCatalogo : []);

        const procesarDatos = await Promise.all(datosFonos.map(async (fono) => {
          const resResenas = await fetch(`http://localhost:3000/api/resenas/${fono.id_fonoaudiologo}`);
          const reseñasReal = await resResenas.json();
          
          let ratingReal = 5.0;
          let cantidadResenas = 0;
          
          if (reseñasReal && reseñasReal.length > 0) {
            cantidadResenas = reseñasReal.length;
            const suma = reseñasReal.reduce((acc, r) => acc + r.calificacion, 0);
            ratingReal = suma / cantidadResenas;
          }

          const nombresServicios = Array.isArray(fono.servicios) 
            ? fono.servicios.map(s => s.nombre_servicio) 
            : [];
          const todasEspecialidades = [...new Set([
            fono.subespecialidad || 'Fonoaudiología General',
            ...nombresServicios
          ])].filter(Boolean);

          return {
            id: fono.id_fonoaudiologo, 
            nombre: fono.nombre_completo,
            comuna: fono.ubicacion?.comuna || 'No especificada', 
            modalidad: 'Presencial',
            publico_objetivo: fono.publico_objetivo || 'Ambos',
            rating: parseFloat(ratingReal),
            resenas: cantidadResenas,
            resumen: fono.subespecialidad || 'Fonoaudiólogo Especialista',
            acerca: fono.acerca_de_mi || 'Sin descripción disponible.',
            especialidades: todasEspecialidades,
            foto_perfil: fono.foto_perfil
          };
        }));

        setProfesionalesBD(procesarDatos);
      } catch (error) {
        console.error("Error conectando al backend MySQL:", error);
      }
    };
    
    cargarDatos();
  }, []);

  const catalogoParaFiltro = listaCatalogo.filter(item => {
    if (!filtroPublico) return true;
    return item.publico_objetivo === filtroPublico;
  });

  const profesionalesFiltrados = profesionalesBD.filter(p => {
    const cumplePublico = 
      filtroPublico === '' || 
      p.publico_objetivo === filtroPublico || 
      p.publico_objetivo === 'Ambos';
    const cumpleEsp = filtroEsp === '' || p.especialidades.includes(filtroEsp);
    const cumpleUbicacion = filtroUbicacion === '' || p.comuna === filtroUbicacion || (filtroUbicacion === 'Online' && (p.modalidad === 'Online' || p.modalidad === 'Ambas'));
    const cumpleCalif = p.rating >= parseFloat(filtroCalif);
    return cumplePublico && cumpleEsp && cumpleUbicacion && cumpleCalif;
  });

  const cambiarPestana = (id, pestana) => {
    setActiveTabs(prev => ({ ...prev, [id]: pestana }));
  };

  return (
    <main style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", backgroundColor: '#f8fbff', minHeight: '100vh' }}>
      
      {/* ENCABEZADO CON EL MISMO DEGRADADO AZUL DE HERO.JSX */}
      <div 
        className="directory-hero" 
        style={{ 
          background: 'linear-gradient(180deg, #f8fbff 0%, #dceaff 55%, #b3d0ff 100%)', 
          padding: '60px 20px 40px',
          textAlign: 'center',
          border: 'none',
          margin: 0
        }}
      >
        <div className="wrap" style={{ maxWidth: '980px', margin: '0 auto' }}>
          <h1 
            style={{ 
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
              fontSize: 'clamp(30px, 4vw, 44px)', 
              fontWeight: '800', 
              color: '#0f2342', 
              margin: '0 0 14px 0',
              letterSpacing: '-0.6px'
            }}
          >
            Fonoaudiólogos para ti
          </h1>
          <p 
            style={{ 
              fontSize: '17px', 
              color: '#1f2937', 
              maxWidth: '680px', 
              margin: '0 auto', 
              lineHeight: '1.5' 
            }}
          >
            Descubre a tu próximo fonoaudiólogo online o presencial desde la comodidad de tu hogar. Filtra según tus necesidades y consulta su disponibilidad.
          </p>
        </div>
      </div>

      {/* BARRA DE FILTROS CONECTADA AL MISMO TONO AZUL (#b3d0ff) */}
      <div 
        className="filters-bar" 
        style={{ 
          background: 'linear-gradient(180deg, #b3d0ff 0%, #dbeafe 100%)', 
          padding: '24px 20px 32px',
          border: 'none',
          margin: 0
        }}
      >
        <div className="wrap" style={{ maxWidth: '1050px', margin: '0 auto' }}>
          <h3 
            style={{ 
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
              fontSize: '18px', 
              fontWeight: '800', 
              color: '#0f2342', 
              margin: '0 0 14px 0' 
            }}
          >
            ¿Qué buscas exactamente?
          </h3>
          <div className="filters-row">
            <select 
              value={filtroPublico} 
              onChange={e => {
                setFiltroPublico(e.target.value);
                setFiltroEsp('');
              }}
            >
              <option value="">Público (Niños y Adultos)</option>
              <option value="Infantil">Atención Infantil (Niños)</option>
              <option value="Adultos">Atención Adultos</option>
            </select>

            <select value={filtroEsp} onChange={e => setFiltroEsp(e.target.value)}>
              <option value="">Subespecialidad</option>
              <option value="Fonoaudiología General">Fonoaudiología General</option>
              {catalogoParaFiltro.map(item => (
                <option key={item.id_catalogo} value={item.nombre_servicio}>
                  {item.nombre_servicio}
                </option>
              ))}
            </select>
            
            <select value={filtroUbicacion} onChange={e => setFiltroUbicacion(e.target.value)}>
              <option value="">Ubicación</option>
              {listaComunas.map(c => (
                <option key={c.id_ubicacion} value={c.comuna}>{c.comuna}</option>
              ))}
            </select>
            
            <select value={filtroCalif} onChange={e => setFiltroCalif(e.target.value)}>
              <option value="0">Calificación</option>
              <option value="4">4.0+</option>
              <option value="4.5">4.5+</option>
              <option value="4.8">4.8+</option>
            </select>
          </div>
        </div>
      </div>

      {/* RESULTADOS CON TRANSICIÓN SUAVE */}
      <div 
        className="directory-results" 
        style={{ 
          background: 'linear-gradient(180deg, #dbeafe 0%, #f8fbff 120px)', 
          paddingTop: '28px',
          paddingBottom: '60px'
        }}
      >
        <div className="wrap" style={{ maxWidth: '1050px', margin: '0 auto' }}>
          <div className="count" style={{ fontFamily: "'Inter', sans-serif", color: '#475569', fontWeight: '600', marginBottom: '18px' }}>
            Mostrando {profesionalesFiltrados.length} fonoaudiólogos
          </div>
          
          {profesionalesFiltrados.length === 0 ? (
            <div className="empty-state">
              <h3>No encontramos coincidencias</h3>
              <p>Prueba ajustando los filtros.</p>
            </div>
          ) : (
            <div className="prof-grid">
              {profesionalesFiltrados.map(p => {
                const currentTab = activeTabs[p.id] || 'general';

                return (
                  <article 
                    className="prof-card" 
                    key={p.id}
                    style={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #cbd5e1', 
                      borderRadius: '16px',
                      boxShadow: '0 8px 20px rgba(15, 35, 66, 0.06)'
                    }}
                  >
                    <div className="prof-card-top">
                      
                      <div className="avatar-circle" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
                        {p.foto_perfil ? (
                          <img 
                            src={p.foto_perfil} 
                            alt={`Perfil de ${p.nombre}`} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <User size={32} color="#64748b" />
                        )}
                      </div>

                      <div className="info">
                        <h3 style={{ fontFamily: "'Inter', sans-serif", color: '#0f2342', fontWeight: '800' }}>{p.nombre}</h3>
                        <div className="resumen">{p.resumen}</div>
                        <div className="stars" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="rating-num">{p.rating.toFixed(1)}</span>
                          <Star size={16} color="#fbbf24" fill="#fbbf24" />
                          <span style={{color: '#64748b', fontWeight: 600}}>({p.resenas})</span>
                        </div>
                      </div>
                      <Link 
                        to={`/profesional/${p.id}`} 
                        className="agendar-btn" 
                        style={{ 
                          textDecoration: 'none', 
                          textAlign: 'center', 
                          display: 'inline-block',
                          backgroundColor: '#1577ea',
                          color: '#ffffff',
                          borderRadius: '999px',
                          padding: '8px 20px',
                          fontWeight: '700'
                        }}
                      >
                        Agendar
                      </Link>
                    </div>
                    
                    <div className="tab-row">
                      <span className={currentTab === 'general' ? 'active' : ''} onClick={() => cambiarPestana(p.id, 'general')}>General</span>
                      <span className={currentTab === 'acerca' ? 'active' : ''} onClick={() => cambiarPestana(p.id, 'acerca')}>Acerca de mí</span>
                    </div>
                    
                    <div className="tab-panel">
                      {currentTab === 'general' ? (
                        <>
                          <div className="mini-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sparkles size={16} color="#64748b" /> 
                            {p.resumen}
                          </div>
                          <div className="mini-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                            <Users size={16} color="#64748b" /> 
                            Público: {p.publico_objetivo === 'Ambos' ? 'Infantil y Adultos' : p.publico_objetivo}
                          </div>
                          <div className="mini-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                            <MapPin size={16} color="#64748b" /> 
                            {p.comuna} {p.modalidad !== 'Presencial' ? ' · también online' : ''}
                          </div>
                        </>
                      ) : (
                        <p style={{margin: 0}}>{p.acerca}</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}