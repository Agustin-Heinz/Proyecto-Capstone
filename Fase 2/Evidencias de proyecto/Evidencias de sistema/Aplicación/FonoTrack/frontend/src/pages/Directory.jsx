import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// ❌ Eliminamos la importación de data.js por completo

export default function Directory() {
  const [profesionalesBD, setProfesionalesBD] = useState([]);

  const [filtroEsp, setFiltroEsp] = useState('');
  const [filtroUbicacion, setFiltroUbicacion] = useState('');
  const [filtroCalif, setFiltroCalif] = useState('0');
  const [activeTabs, setActiveTabs] = useState({});

  useEffect(() => {
    const cargarDirectorio = async () => {
      try {
        const respuesta = await fetch('http://localhost:3000/api/fonoaudiologos');
        const datosReales = await respuesta.json();

        const datosAdaptados = datosReales.map(fono => ({
          id: fono.id_fonoaudiologo, 
          nombre: fono.nombre_completo,
          comuna: fono.ubicacion || 'Providencia', 
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
    
    cargarDirectorio();
  }, []);

  const profesionalesFiltrados = profesionalesBD.filter(p => {
    const cumpleEsp = filtroEsp === '' || p.especialidades.includes(filtroEsp);
    const cumpleUbicacion = filtroUbicacion === '' || p.comuna === filtroUbicacion || (filtroUbicacion === 'Online' && (p.modalidad === 'Online' || p.modalidad === 'Ambas'));
    const cumpleCalif = p.rating >= parseFloat(filtroCalif);
    return cumpleEsp && cumpleUbicacion && cumpleCalif;
  });

  // ✅ NUEVO: Extraemos las especialidades únicas directamente desde MySQL para los filtros
  const especialidadesUnicas = [...new Set(profesionalesBD.flatMap(p => p.especialidades))].filter(Boolean).sort();
  
  const comunasUnicas = [...new Set(profesionalesBD.map(p => p.comuna))].sort();

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
              {/* ✅ Mapeamos el filtro usando las especialidades de tu base de datos */}
              {especialidadesUnicas.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            
            <select value={filtroUbicacion} onChange={e => setFiltroUbicacion(e.target.value)}>
              <option value="">Ubicación</option>
              {comunasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="Online">Atiende online</option>
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
                      <div className="avatar-circle">👤</div>
                      <div className="info">
                        <h3>{p.nombre}</h3>
                        <div className="resumen">{p.resumen}</div>
                        <div className="stars">
                          <span className="rating-num">{p.rating.toFixed(1)}</span> ⭐ <span style={{color: 'var(--ink-soft)', fontWeight: 600}}>({p.resenas})</span>
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
                          <div className="mini-row">✨ {p.especialidades.join(', ')}</div>
                          <div className="mini-row">📍 {p.comuna} {p.modalidad !== 'Presencial' ? ' · también online' : ''}</div>
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