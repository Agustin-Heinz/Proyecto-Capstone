import { useState } from 'react';

export default function PanelPacientes() {
  // Estado para controlar si estamos viendo la lista o la ficha de un paciente específico
  const [pacienteActivo, setPacienteActivo] = useState(null);

  // Datos simulados (tu compañero luego los traerá de MySQL)
  const listaPacientes = [
    { id: 1, nombre: 'María González', rut: '19.283.746-5', ultimaSesion: '12 Ago 2026', estadoPago: 'Pagado', nacimiento: '14 Mar 1990', genero: 'Femenino', fono: '+56 9 1234 5678', email: 'maria.g@email.com', direccion: 'Av. Providencia 123, Stgo', emergencia: '+56 9 8765 4321', notas: 'Sin alergias conocidas.' },
    { id: 2, nombre: 'Pedro Silva', rut: '20.192.837-K', ultimaSesion: '05 Ago 2026', estadoPago: 'Pagado', nacimiento: '22 Jul 2018', genero: 'Masculino', fono: '+56 9 2233 4455', email: 'padres.pedro@email.com', direccion: 'Ñuñoa, Stgo', emergencia: '+56 9 5544 3322', notas: 'Paciente TEA. Refuerzo positivo.' },
    { id: 3, nombre: 'Valentina Pérez', rut: '18.736.291-4', ultimaSesion: '28 Jul 2026', estadoPago: 'Pendiente', nacimiento: '05 Ene 1985', genero: 'Femenino', fono: '+56 9 9988 7766', email: 'val.perez@email.com', direccion: 'Macul, Stgo', emergencia: '+56 9 6677 8899', notas: 'Profesora. Cuidado con fatiga vocal.' }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Cabecera de la sección */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Gestión Clínica</div>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#1a365d' }}>Pacientes e Historial Médico</h1>
      </div>

      {/* RENDERIZADO CONDICIONAL: Si no hay paciente seleccionado, mostramos la tabla */}
      {!pacienteActivo ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          
          <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              👥 Directorio de Pacientes
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
                    <div style={{ width: '32px', height: '32px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>👤</div>
                    {p.nombre}
                  </td>
                  <td style={tdStyle}>{p.rut}</td>
                  <td style={tdStyle}>{p.ultimaSesion}</td>
                  <td style={tdStyle}>
                    <span style={{ 
                      backgroundColor: p.estadoPago === 'Pagado' ? '#dcfce7' : '#fef08a', 
                      color: p.estadoPago === 'Pagado' ? '#166534' : '#854d0e',
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
                      👁️ Ver ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (

        /* VISTA DE LA FICHA CLÍNICA (Aparece cuando hacemos clic en un paciente) */
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
            
            {/* Columna Izquierda: Datos personales */}
            <div style={{ width: '320px', borderRight: '1px solid #f1f5f9', padding: '30px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                <div style={{ width: '56px', height: '56px', backgroundColor: '#bfdbfe', color: '#1e3a8a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👤</div>
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

            {/* Columna Derecha: Historial y Formulario */}
            <div style={{ flex: 1, padding: '30px 40px' }}>
              
              <h3 style={{ margin: '0 0 20px 0', color: '#1a365d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🕒 Sesiones Previas
              </h3>
              
              <div style={{ borderLeft: '2px solid #e2e8f0', marginLeft: '10px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={timelineDotStyle}></div>
                  <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{pacienteActivo.ultimaSesion} — 10:00 AM</div>
                  <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '14px', marginBottom: '6px' }}><strong>Observaciones:</strong> Paciente reporta mejoría. Menos tensión vocal.</div>
                    <div style={{ fontSize: '14px' }}><strong>Tareas:</strong> Continuar con ejercicios de respiración diafragmática.</div>
                  </div>
                </div>
              </div>

              <h3 style={{ margin: '0 0 20px 0', color: '#1a365d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📝 Registrar Nueva Sesión
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Observaciones Clínicas</label>
                  <textarea placeholder="Ingresa las observaciones de hoy..." style={textareaStyle}></textarea>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Tareas Asignadas</label>
                  <textarea placeholder="Ejercicios para la casa..." style={{...textareaStyle, minHeight: '60px'}}></textarea>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button style={{ backgroundColor: '#1a365d', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
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

// --- Componentes y Estilos Auxiliares ---

const thStyle = { padding: '16px 24px', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' };
const tdStyle = { padding: '16px 24px', color: '#475569', fontSize: '14px' };

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div style={{ width: '100px', fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{label}</div>
      <div style={{ flex: 1, fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{value}</div>
    </div>
  );
}

const timelineDotStyle = {
  position: 'absolute',
  left: '-25px',
  top: '2px',
  width: '10px',
  height: '10px',
  backgroundColor: '#3b82f6',
  borderRadius: '50%',
  border: '3px solid white',
  boxShadow: '0 0 0 1px #e2e8f0'
};

const textareaStyle = {
  width: '100%',
  minHeight: '100px',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontFamily: 'inherit',
  fontSize: '14px',
  resize: 'vertical'
};