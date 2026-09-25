import { useState, useEffect } from 'react';

export default function PanelPerfil() {
  const [servicios, setServicios] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState([]);
  
  const [nuevoServicio, setNuevoServicio] = useState({ nombre: '', precio: '', duracion: 50 });
  const [servicioEditando, setServicioEditando] = useState(null);

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDatos = () => {
    const perfilId = localStorage.getItem('perfilId');
    if (!perfilId) return;

    // Cargar Servicios
    fetch(`http://localhost:3000/api/servicios?id_fonoaudiologo=${perfilId}`)
      .then(res => res.json())
      .then(datos => {
        const servFormateados = datos.map(s => ({
          id: s.id_servicios,
          nombre: s.nombre_servicio,
          precio: s.precio,
          duracion: 50
        }));
        setServicios(servFormateados);
      }).catch(err => console.error("Error al cargar servicios:", err));

    // Cargar Horarios (AHORA TRAEN EL id_servicio OBLIGATORIO)
    fetch(`http://localhost:3000/api/disponibilidad?id_fonoaudiologo=${perfilId}`)
      .then(res => res.json())
      .then(datos => {
        const horFormateados = datos.map(d => ({
          id: d.id_disponibilidad,
          id_servicio: d.id_servicio, // EL NUEVO ESLABÓN PERDIDO
          dia: d.dia_semana,
          inicio: d.hora_inicio ? String(d.hora_inicio).substring(11, 16) : '',
          fin: d.hora_fin ? String(d.hora_fin).substring(11, 16) : ''
        }));
        setDisponibilidad(horFormateados);
      }).catch(err => console.error("Error al cargar disponibilidad:", err));
  };

  // ==========================================
  // LÓGICA DE SERVICIOS (Formulario Maestro)
  // ==========================================
  const handleGuardarServicio = async (e) => {
    e.preventDefault();
    
    // Filtro Anti-Duplicidad de Servicio
    const esDuplicado = servicios.some(s => 
      s.nombre.toLowerCase().trim() === nuevoServicio.nombre.toLowerCase().trim() && 
      (!servicioEditando || s.id !== servicioEditando.id)
    );

    if (esDuplicado) {
      alert("⚠️ Ya tienes un servicio registrado con este mismo nombre exacto.");
      return;
    }

    const perfilId = localStorage.getItem('perfilId');

    try {
      let respuesta;
      if (servicioEditando) {
        respuesta = await fetch(`http://localhost:3000/api/servicios/${servicioEditando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: nuevoServicio.nombre, precio: nuevoServicio.precio })
        });
      } else {
        respuesta = await fetch('http://localhost:3000/api/servicios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_fonoaudiologo: perfilId, nombre: nuevoServicio.nombre, precio: nuevoServicio.precio })
        });
      }

      if (respuesta.ok) {
        alert(servicioEditando ? "✅ Servicio actualizado" : "✅ Servicio creado con éxito");
        setServicioEditando(null);
        setNuevoServicio({ nombre: '', precio: '', duracion: 50 }); 
        cargarDatos();
      } else {
        alert(`❌ Error al guardar el servicio en el servidor.`);
      }
    } catch (error) {
      alert("❌ Error de red al intentar guardar.");
    }
  };

  const iniciarEdicionServicio = (servicio) => {
    setServicioEditando(servicio);
    setNuevoServicio({ nombre: servicio.nombre, precio: servicio.precio, duracion: servicio.duracion });
    // Sube la pantalla suavemente hasta el formulario maestro
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEliminarServicio = async (id) => {
    if (!window.confirm("🚨 PELIGRO: ¿Seguro que deseas eliminar este servicio? También se ELIMINARÁN TODOS LOS HORARIOS asociados a él automáticamente.")) return;
    try {
      const respuesta = await fetch(`http://localhost:3000/api/servicios/${id}`, { method: 'DELETE' });
      if (respuesta.ok) {
        alert("✅ Servicio y sus horarios eliminados");
        cargarDatos();
      } else {
        alert("❌ MySQL bloqueó la eliminación. (Probablemente este servicio ya tiene pacientes agendados históricamente).");
      }
    } catch (error) {
      alert("❌ Error de conexión.");
    }
  };

  // ==========================================
  // LÓGICA DE HORARIOS (Llamada desde cada Tarjeta)
  // ==========================================
  const handleGuardarHorario = async (id_servicio, horarioData, idEditando) => {
    
    // Filtro Anti-Duplicidad: Ahora revisa que no se repita EL MISMO DÍA Y HORA DENTRO DEL MISMO SERVICIO
    const duplicado = disponibilidad.some(d => 
      d.id_servicio === id_servicio &&
      d.dia === horarioData.dia && 
      d.inicio === horarioData.inicio && 
      d.fin === horarioData.fin && 
      d.id !== idEditando
    );

    if (duplicado) {
      alert(`⚠️ Ya tienes el bloque de ${horarioData.inicio} a ${horarioData.fin} asignado para este mismo servicio los días ${horarioData.dia}.`);
      return;
    }

    const perfilId = localStorage.getItem('perfilId');

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
          // AHORA ENVIAMOS EL ID DEL SERVICIO OBLIGATORIO AL BACKEND
          body: JSON.stringify({ 
            id_fonoaudiologo: perfilId, 
            id_servicio: id_servicio, 
            dia: horarioData.dia, 
            inicio: horarioData.inicio, 
            fin: horarioData.fin 
          })
        });
      }

      if (respuesta.ok) {
        alert(idEditando ? "✅ Horario actualizado" : "✅ Horario añadido al servicio");
        cargarDatos();
      } else {
        alert(`❌ Error al guardar el horario.`);
      }
    } catch (error) {
      alert("❌ Error de red.");
    }
  };

  const handleEliminarHorario = async (id_disponibilidad) => {
    if (!window.confirm("¿Seguro que deseas borrar este bloque de horario?")) return;
    try {
      const respuesta = await fetch(`http://localhost:3000/api/disponibilidad/${id_disponibilidad}`, { method: 'DELETE' });
      if (respuesta.ok) {
        cargarDatos();
      } else {
        alert("❌ Error al eliminar el horario.");
      }
    } catch (error) {
      alert("❌ Error de red.");
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      
      <div style={{ marginBottom: '30px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Configuración Clínica</div>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#1a365d' }}>Mi Perfil Profesional</h1>
        <p style={{ color: '#64748b', marginTop: '6px' }}>Gestiona tus servicios clínicos y asígnales horarios de atención exclusivos a cada uno.</p>
      </div>

      {/* ================================================================= */}
      {/* 1. FORMULARIO MAESTRO PARA CREAR EL SERVICIO BASE                 */}
      {/* ================================================================= */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: '24px', marginBottom: '40px', border: servicioEditando ? '2px solid #fbbf24' : '1px solid #e2e8f0', transition: 'all 0.3s ease' }}>
         <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#0f172a' }}>
           {servicioEditando ? '✏️ Editando Catálogo de Servicio' : '➕ Crear Nuevo Servicio al Catálogo'}
         </h2>
         <form onSubmit={handleGuardarServicio} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Nombre del servicio</label>
              <input type="text" required style={inputStyle} placeholder="Ej: Evaluación de Lenguaje" value={nuevoServicio.nombre} onChange={e => setNuevoServicio({...nuevoServicio, nombre: e.target.value})} />
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
              <button type="button" onClick={() => { setServicioEditando(null); setNuevoServicio({ nombre: '', precio: '', duracion: 50 }); }} style={{...btnStyle, backgroundColor: '#64748b'}}>Cancelar</button>
            )}
         </form>
      </div>

      {/* ================================================================= */}
      {/* 2. LISTA DE SERVICIOS (Cada uno dibuja sus propios horarios)      */}
      {/* ================================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {servicios.length === 0 ? (
           <div style={{ textAlign: 'center', padding: '50px 0', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
              <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '500' }}>No tienes servicios registrados aún.</p>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '5px' }}>Crea tu primer servicio arriba para asignarle horarios.</p>
           </div>
        ) : (
           servicios.map(s => (
             <TarjetaServicio 
                key={s.id}
                servicio={s}
                // Filtramos mágicamente solo los horarios que le pertenecen a este ID
                disponibilidad={disponibilidad.filter(d => d.id_servicio === s.id)}
                onEditServicio={() => iniciarEdicionServicio(s)}
                onDeleteServicio={() => handleEliminarServicio(s.id)}
                onGuardarHorario={handleGuardarHorario}
                onEliminarHorario={handleEliminarHorario}
             />
           ))
        )}
      </div>

    </div>
  );
}

// ===========================================================================
// SUBCOMPONENTE DE REACT: Tarjeta Independiente para cada Servicio
// ===========================================================================
function TarjetaServicio({ servicio, disponibilidad, onEditServicio, onDeleteServicio, onGuardarHorario, onEliminarHorario }) {
   const [horarioForm, setHorarioForm] = useState({ dia: 'Lunes', inicio: '09:00', fin: '13:00' });
   const [idEditando, setIdEditando] = useState(null);

   const onSubmitHorario = (e) => {
       e.preventDefault();
       // Le pasamos el ID del servicio padre para que se guarde en MySQL amarrado a él
       onGuardarHorario(servicio.id, horarioForm, idEditando);
       setHorarioForm({ dia: 'Lunes', inicio: '09:00', fin: '13:00' });
       setIdEditando(null);
   };

   const iniciarEdicion = (d) => {
       setIdEditando(d.id);
       setHorarioForm({ dia: d.dia, inicio: d.inicio, fin: d.fin });
   };

   return (
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
         
         {/* CABEZA: LOS DATOS DEL SERVICIO */}
         <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📍 {servicio.nombre}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#cbd5e1', fontSize: '14px', fontWeight: '500' }}>
               <span>⏱️ {servicio.duracion} min</span>
               <span>💰 ${(servicio.precio || 0).toLocaleString('es-CL')} CLP</span>
               <div style={{ display: 'flex', gap: '8px', marginLeft: '10px' }}>
                  <button onClick={onEditServicio} style={{...iconBtnStyle, color: 'white'}} title="Editar nombre/precio">✏️</button>
                  <button onClick={onDeleteServicio} style={{...iconBtnStyle, color: '#f87171'}} title="Eliminar servicio">🗑️</button>
               </div>
            </div>
         </div>
         
         {/* CUERPO: LOS HORARIOS EXCLUSIVOS DE ESTE SERVICIO */}
         <div style={{ padding: '24px', backgroundColor: '#f8fafc' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
               🕒 Bloques de agenda exclusivos para este servicio:
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
                        <button onClick={() => iniciarEdicion(d)} style={iconBtnStyle}>✏️</button>
                        <button onClick={() => onEliminarHorario(d.id)} style={iconBtnStyle}>🗑️</button>
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
                <label style={labelStyle}>Día</label>
                <select style={inputStyle} value={horarioForm.dia} onChange={e => setHorarioForm({...horarioForm, dia: e.target.value})}>
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dia => <option key={dia} value={dia}>{dia}</option>)}
                </select>
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
                <button type="button" onClick={() => { setIdEditando(null); setHorarioForm({ dia: 'Lunes', inicio: '09:00', fin: '13:00' }); }} style={{...btnStyle, backgroundColor: '#64748b'}}>Cancelar</button>
              )}
            </form>

         </div>
      </div>
   );
}

// Estilos compartidos
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'inherit' };
const btnStyle = { backgroundColor: '#1a365d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', height: '40px', whiteSpace: 'nowrap' }; 
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px', opacity: 0.7 };