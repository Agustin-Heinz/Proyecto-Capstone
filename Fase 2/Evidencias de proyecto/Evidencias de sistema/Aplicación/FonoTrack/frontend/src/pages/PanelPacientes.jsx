import { useState, useEffect } from 'react';
import { UserRound, UserRoundGroup } from 'lucide-react';

export default function PanelPacientes() {
  const [pacienteActivo, setPacienteActivo] = useState(null);

  // Estados para manejar los datos que llegan de la base de datos
  const [listaPacientes, setListaPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);


  // Estados para la Ficha Clínica y el Historial

  const [historialFichas, setHistorialFichas] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  const [tareas, setTareas] = useState('');

  // useEffect se ejecuta automáticamente al abrir la pantalla para buscar los datos
  useEffect(() => {
    // Buscamos todas las citas para saber cuáles pacientes son del fonoaudiólogo actual
    fetch('http://localhost:3000/api/citas')
      .then(res => res.json())
      .then(citas => {
        const perfilIdStr = localStorage.getItem('perfilId');
        const idFonoaudiologo = perfilIdStr ? parseInt(perfilIdStr) : 2; 

        const citasFonoaudiologo = citas.filter(c => c.id_fonoaudiologo === idFonoaudiologo);
        const idsMisPacientes = new Set(citasFonoaudiologo.map(c => c.id_paciente));

        // Buscamos todos los pacientes y los filtramos
        return fetch('http://localhost:3000/api/pacientes')
          .then(res => res.json())
          .then(datosBackend => {
            const misPacientes = datosBackend.filter(p => idsMisPacientes.has(p.id_paciente));

            const pacientesFormateados = misPacientes.map(p => {
              const citasDelPaciente = citasFonoaudiologo.filter(c => c.id_paciente === p.id_paciente);
              
              let ultimaSesionTexto = 'Primera evaluación';
              let idUltimaCita = null; // Lo necesitamos para asociarle la ficha clínica

              if (citasDelPaciente.length > 0) {
                 // Tomar la cita más reciente
                 const ultimaCita = citasDelPaciente[citasDelPaciente.length - 1]; 
                 idUltimaCita = ultimaCita.id_citas;

                 const fechaLimpia = String(ultimaCita.fecha).split('T')[0]; 
                 const [year, month, day] = fechaLimpia.split('-');
                 
                 let horaLimpia = '';
                 if (ultimaCita.hora_inicio) {
                   horaLimpia = ' - ' + String(ultimaCita.hora_inicio).substring(11, 16) + ' hrs';
                 }
                 
                 ultimaSesionTexto = `${day}/${month}/${year}${horaLimpia}`;
              }

              return {
                id: p.id_paciente,
                idUltimaCita: idUltimaCita, // Guardamos este ID secretamente para usarlo al guardar la ficha
                nombre: p.nombre_completo,
                rut: p.rut,
                fono: p.telefono,
                ultimaSesion: ultimaSesionTexto,
                estadoPago: 'Al día',
                nacimiento: p.fecha_nacimiento ? p.fecha_nacimiento.split('T')[0] : 'No registrado',
                genero: 'No especificado',
                email: 'Sin correo',
                direccion: p.direccion || 'No registrada',
                emergencia: 'Sin contacto',
                notas: 'Sin observaciones clínicas.'
              };
            });
            
            setListaPacientes(pacientesFormateados);
            setCargando(false);
          });
      })
      .catch(error => {
        console.error("Error cargando los pacientes:", error);
        setCargando(false);
      });
  }, []);


 // Cargar el historial cuando seleccionamos "Ver Ficha"
  
  useEffect(() => {
    if (pacienteActivo) {
      fetch(`http://localhost:3000/api/fichas/${pacienteActivo.id}`)
        .then(res => res.json())
        .then(data => {
          // Escudo protector: Si el backend envía un error, evitamos que React colapse
          if (Array.isArray(data)) {
            setHistorialFichas(data);
          } else {
            console.error("El backend devolvió un error en lugar de una lista:", data);
            setHistorialFichas([]); // Lo forzamos a ser una lista vacía
          }
        })
        .catch(err => {
          console.error("Error cargando el historial clínico:", err);
          setHistorialFichas([]);
        });
    }
  }, [pacienteActivo]);

  
  // Guardar el nuevo registro en MySQL
  
  const handleGuardarRegistro = async () => {
    if (!observaciones.trim()) {
      alert("Debes ingresar al menos una observación clínica.");
      return;
    }
    if (!pacienteActivo.idUltimaCita) {
      alert("Este paciente no tiene citas previas registradas para asociarle esta evolución.");
      return;
    }

    try {
      const respuesta = await fetch('http://localhost:3000/api/fichas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_cita: pacienteActivo.idUltimaCita,
          observaciones_clinicas: observaciones,
          actividades_hogar: tareas
        })
      });

      if (respuesta.ok) {
        alert("Registro clínico guardado con éxito.");
        setObservaciones(''); // Limpiamos las cajas
        setTareas('');
        
        // Recargamos el historial automáticamente para que aparezca en pantalla
        const resHistorial = await fetch(`http://localhost:3000/api/fichas/${pacienteActivo.id}`);
        const dataHistorial = await resHistorial.json();
        setHistorialFichas(dataHistorial);
      } else {
        alert("Hubo un error al guardar el registro.");
      }
    } catch (error) {
      console.error("Error de red:", error);
      alert("Error de conexión al intentar guardar la ficha.");
    }
  };

  if (cargando) {
    return <div style={{ padding: '50px', textAlign: 'center', fontSize: '18px', color: '#1a365d' }}>Cargando directorio de pacientes...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

      <div style={{ marginBottom: '30px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Gestión Clínica</div>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#1a365d' }}>Pacientes e Historial Médico</h1>
      </div>

      {!pacienteActivo ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', overflow: 'hidden' }}>

          <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}><UserRoundGroup size={24} color="#1a365d" />
               Directorio de Pacientes
            </h2>
            <button style={{ backgroundColor: '#1a365d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
              + Añadir nuevo paciente
            </button>
          </div>

          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={thStyle}>Nombre</th>
                <th style={thStyle}>RUT</th>
                <th style={thStyle}>Última Sesión</th>
                <th style={thStyle}>Estado de Pago</th>
                <th style={thStyle}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {listaPacientes.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ ...tdStyle, fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}> <UserRound size={18} color="#475569" /> </div>
                    {p.nombre}
                  </td>
                  <td style={tdStyle}>{p.rut}</td>
                  <td style={tdStyle}>{p.ultimaSesion}</td>
                  <td style={tdStyle}>
                    <span style={{
                      backgroundColor: p.estadoPago === 'Al día' ? '#dcfce7' : '#fef08a',
                      color: p.estadoPago === 'Al día' ? '#166534' : '#854d0e',
                      padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700'
                    }}>
                      {p.estadoPago}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => setPacienteActivo(p)}
                      style={{ backgroundColor: 'transparent', color: '#1a365d', border: '1px solid #cbd5e1', padding: '6px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                    >
                       Ver ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', overflow: 'hidden' }}>

          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setPacienteActivo(null)}
              style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
            >
              ← Volver a la lista
            </button>
            <span style={{ fontWeight: '700', color: '#1a365d' }}>Ficha Clínica</span>
          </div>

          <div style={{ display: 'flex' }}>
            <div style={{ width: '320px', borderRight: '1px solid #f1f5f9', padding: '30px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                <div style={{ width: '56px', height: '56px', backgroundColor: '#bfdbfe', color: '#1e3a8a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}> <UserRound size={38} color="#475569" /></div>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>{pacienteActivo.nombre}</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <InfoRow label="RUT" value={pacienteActivo.rut} />
                <InfoRow label="Fecha Nac." value={pacienteActivo.nacimiento} />
                <InfoRow label="Género" value={pacienteActivo.genero} />
                <InfoRow label="Teléfono" value={pacienteActivo.fono} />
                <InfoRow label="Email" value={pacienteActivo.email} />
                <InfoRow label="Dirección" value={pacienteActivo.direccion} />
                <InfoRow label="Emergencia" value={pacienteActivo.emergencia} />
                <InfoRow label="Notas" value={pacienteActivo.notas} />
              </div>
            </div>

            <div style={{ flex: 1, padding: '30px 40px' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#1a365d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 Sesiones Previas
              </h3>

              <div style={{ borderLeft: '2px solid #e2e8f0', marginLeft: '10px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', marginBottom: '40px' }}>
                
                {/* DIBUJAMOS EL HISTORIAL REAL */}
                {historialFichas.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>No hay evoluciones registradas para este paciente.</p>
                ) : (
                  historialFichas.map(cita => {
                    const fechaLimpia = String(cita.fecha).split('T')[0];
                    const [year, month, day] = fechaLimpia.split('-');
                    const horaLimpia = cita.hora_inicio ? String(cita.hora_inicio).substring(11, 16) : '';
                    const fechaFormateada = `${day}/${month}/${year} - ${horaLimpia} hrs`;

                    // Una cita puede tener múltiples evoluciones, mapeamos la relación
                    return cita.evoluciones_Sesion?.map((evo, i) => (
                      <div key={`evo-${cita.id_citas}-${i}`} style={{ position: 'relative', marginBottom: '25px' }}>
                        <div style={timelineDotStyle}></div>
                        <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{fechaFormateada}</div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: '14px', marginBottom: evo.actividades_hogar ? '10px' : '0' }}>
                            <strong style={{ color: '#1a365d' }}>Observaciones:</strong> <br/>
                            {evo.observaciones_clinicas}
                          </div>
                          {evo.actividades_hogar && (
                            <div style={{ fontSize: '14px', color: '#475569', borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                              <strong style={{ color: '#1a365d' }}>Tareas asignadas:</strong> <br/>
                              {evo.actividades_hogar}
                            </div>
                          )}
                        </div>
                      </div>
                    ));
                  })
                )}
              </div>

              <h3 style={{ margin: '0 0 20px 0', color: '#1a365d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Registrar Nueva Sesión
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Observaciones Clínicas</label>
                  <textarea 
                    placeholder="Ingresa las observaciones de hoy..." 
                    style={textareaStyle}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                  ></textarea>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Tareas Asignadas</label>
                  <textarea 
                    placeholder="Ejercicios para la casa..." 
                    style={{ ...textareaStyle, minHeight: '60px' }}
                    value={tareas}
                    onChange={(e) => setTareas(e.target.value)}
                  ></textarea>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button 
                    onClick={handleGuardarRegistro}
                    style={{ backgroundColor: '#1a365d', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#1e40af'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#1a365d'}
                  >
                    Guardar Registro
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: '16px 24px', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' };
const tdStyle = { padding: '16px 24px', color: '#475569', fontSize: '14px' };
function InfoRow({ label, value }) { return (<div style={{ display: 'flex', alignItems: 'flex-start' }}><div style={{ width: '100px', fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{label}</div><div style={{ flex: 1, fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{value}</div></div>); }
const timelineDotStyle = { position: 'absolute', left: '-25px', top: '2px', width: '10px', height: '10px', backgroundColor: '#3b82f6', borderRadius: '50%', border: '3px solid white', boxShadow: '0 0 0 1px #e2e8f0' };
const textareaStyle = { width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical' };