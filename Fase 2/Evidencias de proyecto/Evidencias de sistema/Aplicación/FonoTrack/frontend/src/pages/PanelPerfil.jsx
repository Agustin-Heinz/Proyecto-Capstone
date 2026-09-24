import { useState, useEffect } from 'react';

export default function PanelPerfil() {
  // Estados para listar lo que ya existe
  const [servicios, setServicios] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState([]);
  
  // Estados para los formularios nuevos
  const [nuevoServicio, setNuevoServicio] = useState({ nombre: '', precio: '', duracion: 50 });
  const [nuevoHorario, setNuevoHorario] = useState({ dia: 'Lunes', inicio: '09:00', fin: '13:00' });

  useEffect(() => {
    const perfilId = localStorage.getItem('perfilId');
    if (!perfilId) return;

    // 1. Cargar la lista de servicios guardados
    fetch(`http://localhost:3000/api/servicios?id_fonoaudiologo=${perfilId}`)
      .then(res => res.json())
      .then(datos => {
        // Adaptamos los nombres de MySQL a las variables de React
        const servFormateados = datos.map(s => ({
          id: s.id_servicios,
          nombre: s.nombre_servicio,
          precio: s.precio,
          duracion: 50
        }));
        setServicios(servFormateados);
      })
      .catch(err => console.error("Error al cargar servicios:", err));

    // 2. Cargar los horarios guardados
    fetch(`http://localhost:3000/api/disponibilidad?id_fonoaudiologo=${perfilId}`)
      .then(res => res.json())
      .then(datos => {
        const horFormateados = datos.map(d => ({
          id: d.id_disponibilidad,
          dia: d.dia_semana,
          // Extraemos solo la hora (HH:mm) del formato Date de Prisma
          inicio: d.hora_inicio ? String(d.hora_inicio).substring(11, 16) : '',
          fin: d.hora_fin ? String(d.hora_fin).substring(11, 16) : ''
        }));
        setDisponibilidad(horFormateados);
      })
      .catch(err => console.error("Error al cargar disponibilidad:", err));
  }, []);

  const handleGuardarServicio = async (e) => {
    e.preventDefault();
    const perfilId = localStorage.getItem('perfilId');

    try {
      const respuesta = await fetch('http://localhost:3000/api/servicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_fonoaudiologo: perfilId,
          nombre: nuevoServicio.nombre,
          precio: nuevoServicio.precio
        })
      });

      if (respuesta.ok) {
        const servicioGuardado = await respuesta.json();
        // Agregamos visualmente el servicio con el ID real de la base de datos
        setServicios([...servicios, { id: servicioGuardado.id_servicios, ...nuevoServicio }]);
        setNuevoServicio({ nombre: '', precio: '', duracion: 50 }); 
      }
    } catch (error) {
      console.error("Error de red al guardar servicio:", error);
    }
  };

  const handleGuardarHorario = async (e) => {
    e.preventDefault();
    const perfilId = localStorage.getItem('perfilId');

    try {
      const respuesta = await fetch('http://localhost:3000/api/disponibilidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_fonoaudiologo: perfilId,
          dia: nuevoHorario.dia,
          inicio: nuevoHorario.inicio,
          fin: nuevoHorario.fin
        })
      });

      if (respuesta.ok) {
        const horarioGuardado = await respuesta.json();
        setDisponibilidad([...disponibilidad, { id: horarioGuardado.id_disponibilidad, ...nuevoHorario }]);
        setNuevoHorario({ dia: 'Lunes', inicio: '09:00', fin: '13:00' });
      }
    } catch (error) {
      console.error("Error de red al guardar disponibilidad:", error);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
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
            {/* Lista de servicios actuales */}
            {servicios.length > 0 && (
              <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {servicios.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#1a365d' }}>{s.nombre}</span>
                    <div style={{ display: 'flex', gap: '15px', color: '#64748b', fontSize: '14px' }}>
                      <span>⏱️ {s.duracion} min</span>
                      <span>💰 ${s.precio} CLP</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario nuevo servicio */}
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
              <button type="submit" style={btnStyle}>+ Añadir</button>
            </form>
          </div>
        </div>

        {/* SECCIÓN 2: DISPONIBILIDAD */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🕒 Horarios de Atención
            </h2>
          </div>
          
          <div style={{ padding: '24px' }}>
            {/* Lista de horarios actuales */}
            {disponibilidad.length > 0 && (
              <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {disponibilidad.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#1a365d' }}>{d.dia}</span>
                    <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
                      {d.inicio} hrs - {d.fin} hrs
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario nuevo horario */}
            <form onSubmit={handleGuardarHorario} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Día de la semana</label>
                <select style={inputStyle} value={nuevoHorario.dia} onChange={e => setNuevoHorario({...nuevoHorario, dia: e.target.value})}>
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(dia => <option key={dia} value={dia}>{dia}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Hora Inicio</label>
                <input type="time" required style={inputStyle} value={nuevoHorario.inicio} onChange={e => setNuevoHorario({...nuevoHorario, inicio: e.target.value})} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Hora Fin</label>
                <input type="time" required style={inputStyle} value={nuevoHorario.fin} onChange={e => setNuevoHorario({...nuevoHorario, fin: e.target.value})} />
              </div>
              <button type="submit" style={btnStyle}>+ Añadir</button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

// Estilos reutilizables
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'inherit' };
const btnStyle = { backgroundColor: '#1a365d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', height: '40px', whiteSpace: 'nowrap' };