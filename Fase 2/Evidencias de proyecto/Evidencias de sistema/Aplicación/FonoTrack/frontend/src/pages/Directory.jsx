import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, MapPin, Star, Sparkles } from 'lucide-react';

export default function Directory() {
  const [profesionalesBD, setProfesionalesBD] = useState([]);
  
  // Listado de comunas
  const [listaComunas, setListaComunas] = useState([]);

  const [filtroEsp, setFiltroEsp] = useState('');
  const [filtroUbicacion, setFiltroUbicacion] = useState('');
  const [filtroCalif, setFiltroCalif] = useState('0');
  const [activeTabs, setActiveTabs] = useState({});

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Ejecutamos las 2 peticiones al mismo tiempo para que cargue más rápido
        const [resFonos, resComunas] = await Promise.all([
          fetch('http://localhost:3000/api/fonoaudiologos'),
          fetch('http://localhost:3000/api/comunas')
        ]);

        const datosFonos = await resFonos.json();
        const datosComunas = await resComunas.json();

        // Guardamos las comunas 
        setListaComunas(datosComunas);

        const datosAdaptados = datosFonos.map(fono => ({
          id: fono.id_fonoaudiologo, 
          nombre: fono.nombre_completo,
          // AHORA lee la comuna desde la tabla relacionada (ubicacion.comuna)
          comuna: fono.ubicacion?.comuna || 'No especificada', 
          modalidad: 'Presencial',
          rating: fono.calificacion_promedio ? parseFloat(fono.calificacion_promedio) : 5.0,
          resenas: 0,
          resumen: fono.subespecialidad || 'Fonoaudiólogo Especialista',
          acerca: fono.acerca_de_mi || 'Sin descripción disponible.',
          especialidades: fono.subespecialidad ? [fono.subespecialidad] : ['General']
        }));

        setProfesionalesBD(datosAdaptados);
      } catch (error) {
        console.error("Error conectando al backend MySQL:", error);
      }
    };
    
    cargarDatos();
  }, []);

  const profesionalesFiltrados = profesionalesBD.filter(p => {
    const cumpleEsp = filtroEsp === '' || p.especialidades.includes(filtroEsp);
    const cumpleUbicacion = filtroUbicacion === '' || p.comuna === filtroUbicacion || (filtroUbicacion === 'Online' && (p.modalidad === 'Online' || p.modalidad === 'Ambas'));
    const cumpleCalif = p.rating >= parseFloat(filtroCalif);
    return cumpleEsp && cumpleUbicacion && cumpleCalif;
  });

  const especialidadesUnicas = [...new Set(profesionalesBD.flatMap(p => p.especialidades))].filter(Boolean).sort();

  const cambiarPestana = (id, pestana) => {
    setActiveTabs(prev => ({ ...prev, [id]: pestana }));
  };

  return (
    <main>
      <div className="directory-hero">
        <div className="wrap">
          <h1>Fonoaudiólogos para ti</h1>
          <p>Descubre a tu próximo fonoaudiólogo online o presencial desde la comodidad de tu hogar. Filtra según tus necesidades y consulta su disponibilidad.</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="wrap">
          <h3>¿Qué buscas exactamente?</h3>
          <div className="filters-row">
            <select value={filtroEsp} onChange={e => setFiltroEsp(e.target.value)}>
              <option value="">Subespecialidad</option>
              {especialidadesUnicas.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            
            <select value={filtroUbicacion} onChange={e => setFiltroUbicacion(e.target.value)}>
              <option value="">Ubicación</option>
              
              {/* Cargamos las comunas de la BD */}
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

      <div className="directory-results">
        <div className="wrap">
          <div className="count">Mostrando {profesionalesFiltrados.length} fonoaudiólogos</div>
          
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
                  <article className="prof-card" key={p.id}>
                    <div className="prof-card-top">
                      <div className="avatar-circle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={24} color="#64748b" />
                      </div>
                      <div className="info">
                        <h3>{p.nombre}</h3>
                        <div className="resumen">{p.resumen}</div>
                        <div className="stars" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="rating-num">{p.rating.toFixed(1)}</span>
                          <Star size={16} color="#fbbf24" fill="#fbbf24" />
                          <span style={{color: 'var(--ink-soft)', fontWeight: 600}}>({p.resenas})</span>
                        </div>
                      </div>
                      <Link to={`/profesional/${p.id}`} className="agendar-btn" style={{ textDecoration: 'none', textAlign: 'center', display: 'inline-block' }}>
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
                            {p.especialidades.join(', ')}
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