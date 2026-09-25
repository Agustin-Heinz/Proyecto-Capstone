import { useState, useEffect } from 'react';

export default function PanelPerfil() {
  const [servicios, setServicios] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState([]);
  
  // Estados para modo CREAR
  const [nuevoServicio, setNuevoServicio] = useState({ nombre: '', precio: '', duracion: 50 });
  const [nuevoHorario, setNuevoHorario] = useState({ dia: 'Lunes', inicio: '09:00', fin: '13:00' });

  // Estados para modo EDITAR
  const [servicioEditando, setServicioEditando] = useState(null);
  const [horarioEditando, setHorarioEditando] = useState(null);

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDatos = () => {
    const perfilId = localStorage.getItem('perfilId');
    if (!perfilId) return;

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
      }).catch(err => console.error("Error:", err));

    fetch(`http://localhost:3000/api/disponibilidad?id_fonoaudiologo=${perfilId}`)
      .then(res => res.json())
      .then(datos => {
        const horFormateados = datos.map(d => ({
          id: d.id_disponibilidad,
          dia: d.dia_semana,
          inicio: d.hora_inicio ? String(d.hora_inicio).substring(11, 16) : '',
          fin: d.hora_fin ? String(d.hora_fin).substring(11, 16) : ''
        }));
        setDisponibilidad(horFormateados);
      }).catch(err => console.error("Error:", err));
  };

  // ==========================================
  // LÓGICA DE SERVICIOS
  // ==========================================
  const handleGuardarServicio = async (e) => {
    e.preventDefault();
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
        alert(servicioEditando ? "✅ Servicio actualizado correctamente" : "✅ Servicio creado");
        setServicioEditando(null);
        setNuevoServicio({ nombre: '', precio: '', duracion: 50 }); 
        cargarDatos();
      } else {
        const error = await respuesta.json();
        alert(`❌ Error del servidor: ${error.mensaje || 'Ruta no encontrada. ¿Reiniciaste Node.js?'}`);
      }
    } catch (error) {
      alert("❌ Error de red: Asegúrate de que el backend esté encendido.");
    }
  };

  const iniciarEdicionServicio = (servicio) => {
    setServicioEditando(servicio);
    setNuevoServicio({ nombre: servicio.nombre, precio: servicio.precio, duracion: servicio.duracion });
  };

  const handleEliminarServicio = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este servicio?")) return;
    try {
      const respuesta = await fetch(`http://localhost:3000/api/servicios/${id}`, { method: 'DELETE' });
      if (respuesta.ok) {
        alert("✅ Servicio eliminado");
        cargarDatos();
      } else {
        alert("❌ MySQL bloqueó la eliminación. Este servicio ya tiene citas agendadas y no se puede borrar por historial clínico.");
      }
    } catch (error) {
      alert("❌ Error de conexión al intentar eliminar.");
    }
  };

  // ==========================================
  // LÓGICA DE HORARIOS
  // ==========================================
  const handleGuardarHorario = async (e) => {
    e.preventDefault();
    const perfilId = localStorage.getItem('perfilId');

    try {
      let respuesta;
      if (horarioEditando) {
        respuesta = await fetch(`http://localhost:3000/api/disponibilidad/${horarioEditando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dia: nuevoHorario.dia, inicio: nuevoHorario.inicio, fin: nuevoHorario.fin })
        });
      } else {
        respuesta = await fetch('http://localhost:3000/api/disponibilidad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_fonoaudiologo: perfilId, dia: nuevoHorario.dia, inicio: nuevoHorario.inicio, fin: nuevoHorario.fin })
        });
      }

      if (respuesta.ok) {
        alert(horarioEditando ? "✅ Horario actualizado" : "✅ Horario creado");
        setHorarioEditando(null);
        setNuevoHorario({ dia: 'Lunes', inicio: '09:00', fin: '13:00' });
        cargarDatos();
      } else {
        alert(`❌ Error al guardar el horario en el servidor.`);
      }
    } catch (error) {
      alert("❌ Error de red.");
    }
  };

  const iniciarEdicionHorario = (horario) => {
    setHorarioEditando(horario);
    setNuevoHorario({ dia: horario.dia, inicio: horario.inicio, fin: horario.fin });
  };

  const handleEliminarHorario = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este horario?")) return;
    try {
      const respuesta = await fetch(`http://localhost:3000/api/disponibilidad/${id}`, { method: 'DELETE' });
      if (respuesta.ok) {
        alert("✅ Horario eliminado");
        cargarDatos();
      } else {
        alert("❌ Error al eliminar el horario en el servidor.");
      }
    } catch (error) {
      alert("❌ Error de red.");
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      
      <div style={{ marginBottom: '30px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Configuración</div>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#1a365d' }}>Mi Perfil Profesional</h1>
        <p style={{ color: '#64748b', marginTop: '6px' }}>Gestiona los servicios que ofreces y tus horarios de atención.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* SECCIÓN 1: SERVICIOS */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📍 Mis Servicios Clínicos
            </h2>
          </div>
          
          <div style={{ padding: '24px' }}>
            {servicios.length > 0 && (
              <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {servicios.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#1a365d', flex: 1 }}>{s.nombre}</span>
                    <div style={{ display: 'flex', gap: '15px', color: '#64748b', fontSize: '14px', alignItems: 'center' }}>
                      <span>⏱️ {s.duracion} min</span>
                      <span>💰 ${s.precio} CLP</span>
                      
                      <div style={{ display: 'flex', gap: '8px', marginLeft: '10px' }}>
                        <button onClick={() => iniciarEdicionServicio(s)} style={iconBtnStyle}>✏️</button>
                        <button onClick={() => handleEliminarServicio(s.id)} style={iconBtnStyle}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleGuardarServicio} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', backgroundColor: servicioEditando ? '#fef3c7' : 'transparent', padding: servicioEditando ? '15px' : '0', borderRadius: '8px', transition: 'all 0.3s ease' }}>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>Nombre del servicio</label>
                <input type="text" required style={inputStyle} value={nuevoServicio.nombre} onChange={e => setNuevoServicio({...nuevoServicio, nombre: e.target.value})} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Precio (CLP)</label>
                <input type="number" required style={inputStyle} value={nuevoServicio.precio} onChange={e => setNuevoServicio({...nuevoServicio, precio: e.target.value})} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Duración (min)</label>
                <input type="number" required style={inputStyle} value={nuevoServicio.duracion} onChange={e => setNuevoServicio({...nuevoServicio, duracion: e.target.value})} />
              </div>
              <button type="submit" style={btnStyle}>
                {servicioEditando ? 'Guardar Cambios' : '+ Añadir'}
              </button>
              {servicioEditando && (
                <button type="button" onClick={() => { setServicioEditando(null); setNuevoServicio({ nombre: '', precio: '', duracion: 50 }); }} style={{...btnStyle, backgroundColor: '#64748b'}}>Cancelar</button>
              )}
            </form>
          </div>
        </div>

        {/* SECCIÓN 2: HORARIOS */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🕒 Horarios de Atención
            </h2>
          </div>
          
          <div style={{ padding: '24px' }}>
            {disponibilidad.length > 0 && (
              <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {disponibilidad.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#1a365d' }}>{d.dia}</span>
                    <div style={{ display: 'flex', gap: '15px', color: '#64748b', fontSize: '14px', fontWeight: '500', alignItems: 'center' }}>
                      <span>{d.inicio} hrs - {d.fin} hrs</span>
                      
                      <div style={{ display: 'flex', gap: '8px', marginLeft: '10px' }}>
                        <button onClick={() => iniciarEdicionHorario(d)} style={iconBtnStyle}>✏️</button>
                        <button onClick={() => handleEliminarHorario(d.id)} style={iconBtnStyle}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleGuardarHorario} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', backgroundColor: horarioEditando ? '#fef3c7' : 'transparent', padding: horarioEditando ? '15px' : '0', borderRadius: '8px', transition: 'all 0.3s ease' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Día</label>
                <select style={inputStyle} value={nuevoHorario.dia} onChange={e => setNuevoHorario({...nuevoHorario, dia: e.target.value})}>
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(dia => <option key={dia} value={dia}>{dia}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Inicio</label>
                <input type="time" required style={inputStyle} value={nuevoHorario.inicio} onChange={e => setNuevoHorario({...nuevoHorario, inicio: e.target.value})} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Fin</label>
                <input type="time" required style={inputStyle} value={nuevoHorario.fin} onChange={e => setNuevoHorario({...nuevoHorario, fin: e.target.value})} />
              </div>
              <button type="submit" style={btnStyle}>
                {horarioEditando ? 'Guardar Cambios' : '+ Añadir'}
              </button>
              {horarioEditando && (
                <button type="button" onClick={() => { setHorarioEditando(null); setNuevoHorario({ dia: 'Lunes', inicio: '09:00', fin: '13:00' }); }} style={{...btnStyle, backgroundColor: '#64748b'}}>Cancelar</button>
              )}
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

// Estilos
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'inherit' };
const btnStyle = { backgroundColor: '#1a365d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', height: '40px', whiteSpace: 'nowrap' }; 
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px', opacity: 0.7 };