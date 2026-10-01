import React, { useState, useEffect } from 'react';
import { MapPin, Pencil, Trash } from 'lucide-react';

export default function PanelPerfil() {

  // NAVEGACIÓN
  const [pestanaActiva, setPestanaActiva] = useState('perfil'); // 'perfil' o 'servicios'
  const [cargando, setCargando] = useState(true);

  // ESTADOS PARA LA PESTAÑA DE MI PERFIL
  const [perfil, setPerfil] = useState({
    nombre_completo: '',
    rut: '',
    subespecialidad: '',
    publico_objetivo: 'Ambos',
    acerca_de_mi: '',
    id_ubicacion: '',
    foto_perfil: ''
  });
  const [listaComunas, setListaComunas] = useState([]);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState({ texto: '', tipo: '' });
  const [fotoArchivo, setFotoArchivo] = useState(null);

  // ESTADOS PARA LA PESTAÑA DE MIS SERVICIOS
  const [catalogoServicios, setCatalogoServicios] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [nuevoServicio, setNuevoServicio] = useState({ id_catalogo: '', nombre: '', precio: '', duracion: 50 });
  const [servicioEditando, setServicioEditando] = useState(null);

  // CARGAR TODOS LOS DATOS 
  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDatos = async () => {
    const perfilIdStr = localStorage.getItem('perfilId');
    const idFonoaudiologo = perfilIdStr ? parseInt(perfilIdStr) : 2; // 2 como fallback

    try {
      // 1. Cargar lista de comunas
      const resComunas = await fetch('http://localhost:3000/api/comunas');
      const comunasBD = await resComunas.json();
      setListaComunas(comunasBD);

      // 2. Cargar catálogo oficial de servicios desde MySQL
      const resCatalogo = await fetch('http://localhost:3000/api/catalogo-servicios');
      const catalogoBD = await resCatalogo.json();
      setCatalogoServicios(Array.isArray(catalogoBD) ? catalogoBD : []);

      // 3. Cargar datos del perfil
      const resPerfil = await fetch('http://localhost:3000/api/fonoaudiologos');
      const datosPerfil = await resPerfil.json();
      const miInfo = datosPerfil.find(f => f.id_fonoaudiologo === idFonoaudiologo);
      
      if (miInfo) {
        setPerfil({
          nombre_completo: miInfo.nombre_completo || '',
          rut: miInfo.rut || '',
          subespecialidad: miInfo.subespecialidad || '',
          publico_objetivo: miInfo.publico_objetivo || 'Ambos',
          acerca_de_mi: miInfo.acerca_de_mi || '',
          id_ubicacion: miInfo.id_ubicacion || '',
          foto_perfil: miInfo.foto_perfil || '' 
        });
      }

      // 4. Cargar Servicios del fonoaudiólogo
      const resServs = await fetch(`http://localhost:3000/api/servicios?id_fonoaudiologo=${idFonoaudiologo}`);
      const datosServs = await resServs.json();
      const servFormateados = datosServs.map(s => ({
        id: s.id_servicios,
        id_catalogo: s.id_catalogo || '',
        nombre: s.nombre_servicio,
        precio: s.precio,
        duracion: 50
      }));
      setServicios(servFormateados);

      // 5. Cargar Horarios
      const resDisp = await fetch(`http://localhost:3000/api/disponibilidad?id_fonoaudiologo=${idFonoaudiologo}`);
      const datosDisp = await resDisp.json();
      const horFormateados = datosDisp.map(d => ({
        id: d.id_disponibilidad,
        id_servicio: d.id_servicio,
        dia: d.dia_semana ? String(d.dia_semana).split('T')[0] : '',
        inicio: d.hora_inicio ? String(d.hora_inicio).substring(11, 16) : '',
        fin: d.hora_fin ? String(d.hora_fin).substring(11, 16) : ''
      }));
      setDisponibilidad(horFormateados);

      setCargando(false);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      setCargando(false);
    }
  };

  // FUNCIONES DE "MI PERFIL"

  const manejarCambioPerfil = (e) => {
    const { name, value } = e.target;
    setPerfil({ 
      ...perfil, 
      [name]: name === 'id_ubicacion' ? (value ? parseInt(value) : '') : value 
    });
  };

  const guardarPerfil = async (e) => {
    e.preventDefault();
    setGuardandoPerfil(true);
    setMensajePerfil({ texto: '', tipo: '' });

    const perfilIdStr = localStorage.getItem('perfilId');
    const idFonoaudiologo = perfilIdStr ? parseInt(perfilIdStr) : 2;

    try {
      const formData = new FormData();
      formData.append('subespecialidad', perfil.subespecialidad);
      formData.append('publico_objetivo', perfil.publico_objetivo || 'Ambos');
      formData.append('acerca_de_mi', perfil.acerca_de_mi);
      if (perfil.id_ubicacion) formData.append('id_ubicacion', perfil.id_ubicacion);
      
      if (fotoArchivo) {
        formData.append('foto_archivo', fotoArchivo);
      } else if (perfil.foto_perfil) {
        formData.append('foto_perfil', perfil.foto_perfil);
      }

      const respuesta = await fetch(`http://localhost:3000/api/fonoaudiologos/${idFonoaudiologo}`, {
        method: 'PUT',
        body: formData 
      });

      if (respuesta.ok) {
        setMensajePerfil({ texto: '¡Perfil actualizado correctamente!', tipo: 'exito' });
        cargarDatos();
      } else {
        throw new Error('Error al actualizar');
      }
    } catch (error) {
      console.error(error);
      setMensajePerfil({ texto: 'Error al guardar los cambios.', tipo: 'error' });
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const detectarUbicacion = () => {
    if (!navigator.geolocation) {
      setMensajePerfil({ texto: "Tu navegador no soporta geolocalización.", tipo: 'error' });
      return;
    }

    setMensajePerfil({ texto: "Buscando tu ubicación por GPS... por favor espera.", tipo: 'exito' });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          const respuesta = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await respuesta.json();

          const comunaDetectada = data.address?.suburb || data.address?.town || data.address?.city || data.address?.village || data.address?.county;

          if (comunaDetectada) {
            const limpiarTexto = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const comunaLimpia = limpiarTexto(comunaDetectada);

            const comunaEncontrada = listaComunas.find(c => {
              const nombreBD = limpiarTexto(c.comuna);
              return nombreBD.includes(comunaLimpia) || comunaLimpia.includes(nombreBD);
            });

            if (comunaEncontrada) {
              setPerfil(prev => ({ ...prev, id_ubicacion: comunaEncontrada.id_ubicacion }));
              setMensajePerfil({ texto: `¡Éxito! Detectamos que estás en ${comunaEncontrada.comuna}.`, tipo: 'exito' });
            } else {
              setMensajePerfil({ texto: `El GPS dice que estás en "${comunaDetectada}", pero no está en tu lista de comunas. Selecciónala manualmente.`, tipo: 'error' });
            }
          } else {
            setMensajePerfil({ texto: "No pudimos identificar la comuna desde tus coordenadas.", tipo: 'error' });
          }
        } catch (error) {
          console.error("Error al geocodificar:", error);
          setMensajePerfil({ texto: "Hubo un error de conexión con el mapa satelital.", tipo: 'error' });
        }
      },
      (error) => {
        let errorMsg = "No pudimos obtener tu ubicación.";
        if (error.code === 1) errorMsg = "Rechazaste el permiso de ubicación en el navegador.";
        setMensajePerfil({ texto: errorMsg, tipo: 'error' });
      },
      { timeout: 10000 }
    );
  };

  // FUNCIONES DE LA PESTAÑA: MIS SERVICIOS 

  // Filtramos el catálogo de MySQL según el público que atiende este fonoaudiólogo
  const catalogoFiltrado = catalogoServicios.filter(item => {
    if (!perfil.publico_objetivo || perfil.publico_objetivo === 'Ambos') return true;
    return item.publico_objetivo === perfil.publico_objetivo;
  });

  // Cuando elige un servicio del select, guardamos tanto el nombre como el id_catalogo
  const handleSeleccionarServicioCatalogo = (e) => {
    const nombreElegido = e.target.value;
    const itemEncontrado = catalogoServicios.find(c => c.nombre_servicio === nombreElegido);
    setNuevoServicio({
      ...nuevoServicio,
      nombre: nombreElegido,
      id_catalogo: itemEncontrado ? itemEncontrado.id_catalogo : ''
    });
  };
  
  const handleGuardarServicio = async (e) => {
    e.preventDefault();
    
    const esDuplicado = servicios.some(s => 
      s.nombre.toLowerCase().trim() === nuevoServicio.nombre.toLowerCase().trim() && 
      (!servicioEditando || s.id !== servicioEditando.id)
    );

    if (esDuplicado) {
      alert("Ya tienes este servicio registrado en tu catálogo.");
      return;
    }

    const perfilIdStr = localStorage.getItem('perfilId');
    const idFonoaudiologo = perfilIdStr ? parseInt(perfilIdStr) : 2;

    try {
      let respuesta;
      if (servicioEditando) {
        respuesta = await fetch(`http://localhost:3000/api/servicios/${servicioEditando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id_catalogo: nuevoServicio.id_catalogo,
            nombre: nuevoServicio.nombre, 
            precio: nuevoServicio.precio 
          })
        });
      } else {
        respuesta = await fetch('http://localhost:3000/api/servicios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id_fonoaudiologo: idFonoaudiologo, 
            id_catalogo: nuevoServicio.id_catalogo,
            nombre: nuevoServicio.nombre, 
            precio: nuevoServicio.precio 
          })
        });
      }

      if (respuesta.ok) {
        alert(servicioEditando ? "Servicio actualizado" : "Servicio creado con éxito");
        setServicioEditando(null);
        setNuevoServicio({ id_catalogo: '', nombre: '', precio: '', duracion: 50 }); 
        cargarDatos();
      } else {
        alert(`Error al guardar el servicio en el servidor.`);
      }
    } catch (error) {
      alert("Error de red al intentar guardar.");
    }
  };

  const iniciarEdicionServicio = (servicio) => {
    setServicioEditando(servicio);
    setNuevoServicio({ 
      id_catalogo: servicio.id_catalogo || '', 
      nombre: servicio.nombre, 
      precio: servicio.precio, 
      duracion: servicio.duracion 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEliminarServicio = async (id) => {
    if (!window.confirm("AVISO ¿Seguro que deseas eliminar este servicio? También se ELIMINARÁN TODOS LOS HORARIOS asociados a él automáticamente.")) return;
    try {
      const respuesta = await fetch(`http://localhost:3000/api/servicios/${id}`, { method: 'DELETE' });
      if (respuesta.ok) {
        alert("Servicio y sus horarios eliminados");
        cargarDatos();
      } else {
        alert("MySQL bloqueó la eliminación. (Probablemente este servicio ya tiene pacientes agendados históricamente).");
      }
    } catch (error) {
      alert("Error de conexión.");
    }
  };

  const handleGuardarHorario = async (id_servicio, horarioData, idEditando) => {
    const duplicado = disponibilidad.some(d => 
      d.id_servicio === id_servicio &&
      d.dia === horarioData.dia && 
      d.inicio === horarioData.inicio && 
      d.fin === horarioData.fin && 
      d.id !== idEditando
    );

    if (duplicado) {
      alert(`Ya tienes el bloque de ${horarioData.inicio} a ${horarioData.fin} asignado para este mismo servicio el día ${horarioData.dia}.`);
      return;
    }

    const perfilIdStr = localStorage.getItem('perfilId');
    const idFonoaudiologo = perfilIdStr ? parseInt(perfilIdStr) : 2;

    try {
      let respuesta;
      if (idEditando) {
        respuesta = await fetch(`http://localhost:3000/api/disponibilidad/${idEditando}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dia: horarioData.dia, inicio: horarioData.inicio, fin: horarioData.fin })
        });
      } else {
        respuesta = await fetch('http://localhost:3000/api/disponibilidad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id_fonoaudiologo: idFonoaudiologo, 
            id_servicio: id_servicio, 
            dia: horarioData.dia, 
            inicio: horarioData.inicio, 
            fin: horarioData.fin 
          })
        });
      }

      if (respuesta.ok) {
        alert(idEditando ? "Horario actualizado" : "Horario añadido al servicio");
        cargarDatos();
      } else {
        alert(`Error al guardar el horario.`);
      }
    } catch (error) {
      alert("Error de red.");
    }
  };

  const handleEliminarHorario = async (id_disponibilidad) => {
    if (!window.confirm("¿Seguro que deseas borrar este bloque de horario?")) return;
    try {
      const respuesta = await fetch(`http://localhost:3000/api/disponibilidad/${id_disponibilidad}`, { method: 'DELETE' });
      if (respuesta.ok) {
        cargarDatos();
      } else {
        alert("Error al eliminar el horario.");
      }
    } catch (error) {
      alert("Error de red.");
    }
  };


  // RENDERIZADO VISUAL
  
  if (cargando) return <div style={{ padding: '50px', textAlign: 'center' }}>Cargando información...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Título de la página */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Configuración Clínica</div>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#1a365d' }}>Mi Perfil Profesional</h1>
        <p style={{ color: '#64748b', marginTop: '6px' }}>Gestiona tu información pública, tus servicios clínicos y horarios de atención.</p>
      </div>

      {/* Navegación de Pestañas */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
        <button 
          onClick={() => setPestanaActiva('perfil')}
          style={{ ...btnPestanaStyle, borderBottom: pestanaActiva === 'perfil' ? '3px solid #1d4ed8' : '3px solid transparent', color: pestanaActiva === 'perfil' ? '#1d4ed8' : '#64748b' }}
        >
          Mi Perfil
        </button>
        <button 
          onClick={() => setPestanaActiva('servicios')}
          style={{ ...btnPestanaStyle, borderBottom: pestanaActiva === 'servicios' ? '3px solid #1d4ed8' : '3px solid transparent', color: pestanaActiva === 'servicios' ? '#1d4ed8' : '#64748b' }}
        >
          Mis Servicios y Precios
        </button>
      </div>

      {/* PESTAÑA MI PERFIL */}
      {pestanaActiva === 'perfil' && (
        <div style={panelContainerStyle}>
          <form onSubmit={guardarPerfil} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div><label style={labelStyle}>Nombre Completo (Fijo)</label><input type="text" value={perfil.nombre_completo} disabled style={inputDisabledStyle} /></div>
              <div><label style={labelStyle}>RUT (Fijo)</label><input type="text" value={perfil.rut} disabled style={inputDisabledStyle} /></div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '5px 0' }} />
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={labelStyle}>1. Público que atiendes (Filtra tu catálogo)</label>
                <select
                  name="publico_objetivo"
                  value={perfil.publico_objetivo}
                  onChange={manejarCambioPerfil}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="Ambos">Ambos (Infantil y Adultos)</option>
                  <option value="Infantil">Solo Infantil (Niños)</option>
                  <option value="Adultos">Solo Adultos</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>2. Subespecialidad Principal</label>
                <select
                  name="subespecialidad"
                  value={perfil.subespecialidad || ''}
                  onChange={manejarCambioPerfil}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">Selecciona desde el catálogo</option>
                  <option value="Fonoaudiología General">Fonoaudiología General</option>
                  {catalogoFiltrado.map(item => (
                    <option key={item.id_catalogo} value={item.nombre_servicio}>
                      {perfil.publico_objetivo === 'Ambos' ? `[${item.publico_objetivo}] ` : ''}
                      {item.nombre_servicio}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Comuna de Atención</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select 
                  name="id_ubicacion" 
                  value={perfil.id_ubicacion} 
                  onChange={manejarCambioPerfil} 
                  style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}
                >
                  <option value="">Selecciona tu comuna...</option>
                  {listaComunas.map(c => (
                    <option key={c.id_ubicacion} value={c.id_ubicacion}>
                      {c.comuna}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={detectarUbicacion} style={btnUbicacionStyle}>
                  <MapPin size={18} color="#1d4ed8" /> Detectar
                </button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Acerca de mí (Se mostrará a los pacientes)</label>
              <textarea name="acerca_de_mi" value={perfil.acerca_de_mi} onChange={manejarCambioPerfil} placeholder="Escribe una breve presentación..." style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} />
            </div>

            <div style={{ marginTop: '10px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                Foto de Perfil (Opcional)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {perfil.foto_perfil && (
                  <img src={perfil.foto_perfil} alt="Actual" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                )}
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={e => setFotoArchivo(e.target.files[0])}
                  style={{ ...inputStyle, padding: '9px 14px', cursor: 'pointer' }}
                />
              </div>
            </div>

            {mensajePerfil.texto && (
              <div style={mensajeStyleObj(mensajePerfil.tipo)}>{mensajePerfil.texto}</div>
            )}

            <div style={{ textAlign: 'right' }}>
              <button type="submit" disabled={guardandoPerfil} style={btnPrimarioStyle}>
                {guardandoPerfil ? 'Guardando...' : 'Guardar Perfil'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PESTAÑA 2: MIS SERVICIOS */}
      {pestanaActiva === 'servicios' && (
        <>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: '24px', marginBottom: '40px', border: servicioEditando ? '2px solid #fbbf24' : '1px solid #e2e8f0', transition: 'all 0.3s ease' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
               <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
                 {servicioEditando ? 'Editando Catálogo de Servicio' : 'Añadir Servicio Oficial a mi Perfil'}
               </h2>
               <span style={{ fontSize: '12px', fontWeight: '700', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '6px 12px', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
                 Filtro activo: Público {perfil.publico_objetivo || 'Ambos'}
               </span>
             </div>

             <form onSubmit={handleGuardarServicio} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                <div style={{ flex: 2 }}>
                  <label style={labelStyle}>Selecciona un servicio oficial</label>
                  <select
                    required
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={nuevoServicio.nombre}
                    onChange={handleSeleccionarServicioCatalogo}
                  >
                    <option value="">-- Elige un tratamiento del catálogo --</option>
                    {catalogoFiltrado.map(item => {
                      const yaAgregado = servicios.some(
                        s => s.nombre.toLowerCase().trim() === item.nombre_servicio.toLowerCase().trim() &&
                        (!servicioEditando || s.id !== servicioEditando.id)
                      );
                      return (
                        <option 
                          key={item.id_catalogo} 
                          value={item.nombre_servicio}
                          disabled={yaAgregado}
                        >
                          {perfil.publico_objetivo === 'Ambos' ? `[${item.publico_objetivo}] ` : ''}
                          {item.nombre_servicio} {yaAgregado ? '(Ya agregado)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Precio (CLP)</label>
                  <input type="number" required style={inputStyle} placeholder="35000" value={nuevoServicio.precio} onChange={e => setNuevoServicio({...nuevoServicio, precio: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Duración (min)</label>
                  <input type="number" required style={inputStyle} value={nuevoServicio.duracion} onChange={e => setNuevoServicio({...nuevoServicio, duracion: e.target.value})} />
                </div>
                <button type="submit" style={btnStyle}>
                  {servicioEditando ? 'Guardar Cambios' : '+ Añadir Catálogo'}
                </button>
                {servicioEditando && (
                  <button type="button" onClick={() => { setServicioEditando(null); setNuevoServicio({ id_catalogo: '', nombre: '', precio: '', duracion: 50 }); }} style={{...btnStyle, backgroundColor: '#64748b'}}>Cancelar</button>
                )}
             </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {servicios.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '50px 0', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '500' }}>No tienes servicios registrados aún.</p>
                  <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '5px' }}>Selecciona tu primer servicio arriba para asignarle horarios.</p>
               </div>
            ) : (
               servicios.map(s => (
                 <TarjetaServicio 
                    key={s.id}
                    servicio={s}
                    disponibilidad={disponibilidad.filter(d => d.id_servicio === s.id)}
                    onEditServicio={() => iniciarEdicionServicio(s)}
                    onDeleteServicio={() => handleEliminarServicio(s.id)}
                    onGuardarHorario={handleGuardarHorario}
                    onEliminarHorario={handleEliminarHorario}
                 />
               ))
            )}
          </div>
        </>
      )}

    </div>
  );
}

// Tarjeta Independiente para cada Servicio
function TarjetaServicio({ servicio, disponibilidad, onEditServicio, onDeleteServicio, onGuardarHorario, onEliminarHorario }) {
   const [horarioForm, setHorarioForm] = useState({ dia: '', inicio: '09:00', fin: '13:00' });
   const [idEditando, setIdEditando] = useState(null);

   const onSubmitHorario = (e) => {
       e.preventDefault();
       onGuardarHorario(servicio.id, horarioForm, idEditando);
       setHorarioForm({ dia: '', inicio: '09:00', fin: '13:00' });
       setIdEditando(null);
   };

   const iniciarEdicion = (d) => {
       setIdEditando(d.id);
       setHorarioForm({ dia: d.dia, inicio: d.inicio, fin: d.fin });
   };

   return (
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
         
         {/* HEADER LOS DATOS DEL SERVICIO */}
         <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
               {servicio.nombre}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#cbd5e1', fontSize: '14px', fontWeight: '500' }}>
               <span> {servicio.duracion} min</span>
               <span> ${(servicio.precio || 0).toLocaleString('es-CL')} CLP</span>
               <div style={{ display: 'flex', gap: '8px', marginLeft: '10px' }}>
                  <button onClick={onEditServicio} style={{...iconBtnStyle, color: 'white'}} title="Editar nombre/precio"><Pencil size={20} color="#ffffff" /></button>
                  <button onClick={onDeleteServicio} style={{...iconBtnStyle, color: '#f87171'}} title="Eliminar servicio"><Trash size={20} color="#ffffff"/></button>
               </div>
            </div>
         </div>
         
         {/* BODY LOS HORARIOS EXCLUSIVOS DE ESTE SERVICIO */}
         <div style={{ padding: '24px', backgroundColor: '#f8fafc' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
               Bloques de agenda exclusivos para este servicio:
            </h3>

            {/* Listado de horas */}
            {disponibilidad.length > 0 ? (
              <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {disponibilidad.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                    <span style={{ fontWeight: '700', color: '#2563eb' }}>{d.dia}</span>
                    <div style={{ display: 'flex', gap: '15px', color: '#475569', fontSize: '14px', fontWeight: '600', alignItems: 'center' }}>
                      <span>{d.inicio} hrs - {d.fin} hrs</span>
                      <div style={{ display: 'flex', gap: '8px', marginLeft: '15px', borderLeft: '1px solid #e2e8f0', paddingLeft: '15px' }}>
                        <button onClick={() => iniciarEdicion(d)} style={iconBtnStyle}><Pencil size={20} color="#1a365d" /></button>
                        <button onClick={() => onEliminarHorario(d.id)} style={iconBtnStyle}><Trash size={20} color="#1a365d"/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', marginBottom: '20px' }}>
                 No hay bloques asignados. Este servicio no aparecerá en el calendario web de los pacientes.
              </p>
            )}

            {/* Formulario Interno para añadir horas solo a este servicio */}
            <form onSubmit={onSubmitHorario} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', backgroundColor: idEditando ? '#fef3c7' : '#ffffff', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1', transition: 'all 0.2s' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Fecha</label>
                <input 
                  type="date" 
                  required 
                  style={inputStyle} 
                  value={horarioForm.dia} 
                  onChange={e => setHorarioForm({...horarioForm, dia: e.target.value})} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Inicio</label>
                <input type="time" required style={inputStyle} value={horarioForm.inicio} onChange={e => setHorarioForm({...horarioForm, inicio: e.target.value})} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Fin</label>
                <input type="time" required style={inputStyle} value={horarioForm.fin} onChange={e => setHorarioForm({...horarioForm, fin: e.target.value})} />
              </div>
              <button type="submit" style={{...btnStyle, backgroundColor: '#2563eb'}}>
                {idEditando ? 'Guardar' : '+ Añadir Horario'}
              </button>
              {idEditando && (
                <button type="button" onClick={() => { setIdEditando(null); setHorarioForm({ dia: '', inicio: '09:00', fin: '13:00' }); }} style={{...btnStyle, backgroundColor: '#64748b'}}>Cancelar</button>
              )}
            </form>
         </div>
      </div>
   );
}

const btnPestanaStyle = { backgroundColor: 'transparent', border: 'none', padding: '10px 15px', fontWeight: '700', cursor: 'pointer', fontSize: '15px', transition: '0.2s', marginBottom: '-12px' };
const panelContainerStyle = { backgroundColor: '#ffffff', borderRadius: '16px', padding: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' };
const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' };
const inputDisabledStyle = { ...inputStyle, backgroundColor: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' };
const btnPrimarioStyle = { backgroundColor: '#1a365d', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' };
const btnUbicacionStyle = { backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0 15px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' };
const btnStyle = { backgroundColor: '#1a365d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', height: '44px', whiteSpace: 'nowrap' }; 
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px', opacity: 0.7 };
const mensajeStyleObj = (tipo) => ({ padding: '12px', borderRadius: '8px', backgroundColor: tipo === 'exito' ? '#dcfce7' : '#fee2e2', color: tipo === 'exito' ? '#166534' : '#991b1b', fontWeight: '600', fontSize: '14px', textAlign: 'center' });