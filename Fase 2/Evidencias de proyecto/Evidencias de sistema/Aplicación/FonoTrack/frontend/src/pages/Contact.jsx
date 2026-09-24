import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

export default function Contact() {
  const { profId, servId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { fecha, hora, p, s } = location.state || {};

  // 1. Ampliamos la memoria de React para capturar los campos obligatorios
  const [datosPaciente, setDatosPaciente] = useState({
    nombre_completo: '',
    rut: '',
    telefono: '',
    email: '' // Opcional visualmente, pero se guarda en el state
  });

  if (!p || !s) return <div style={{padding: '100px', textAlign: 'center'}}>Error cargando datos.</div>;

  // 2. Función que captura cada letra que el paciente escribe en las cajas
  const manejarCambio = (e) => {
    setDatosPaciente({
      ...datosPaciente,
      [e.target.name]: e.target.value
    });
  };

  // 3. EL PUENTE A MYSQL: Guardar el paciente y pasar al pago
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    
    try {
      console.log("Creando paciente en la base de datos...");

      // Construimos el paquete para crear el paciente real
      const paquetePaciente = {
        id_usuario: 1, // Usamos 1 como usuario 'invitado/temporal' para no frenar el flujo
        nombre_completo: datosPaciente.nombre_completo,
        rut: datosPaciente.rut,
        telefono: datosPaciente.telefono
      };

      // 1. Guardamos al paciente real
      const respuestaPaciente = await fetch('http://localhost:3000/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paquetePaciente) 
      });

      if (!respuestaPaciente.ok) {
        const errorData = await respuestaPaciente.json();
        alert(`Error al guardar paciente: ${errorData.mensaje}`);
        return;
      }

      const nuevoPaciente = await respuestaPaciente.json();
      console.log("Paciente creado con ID:", nuevoPaciente.id_paciente);
      
      // 2. Creamos la cita de inmediato para que quede registrada (incluso si no paga)
      const paqueteCita = {
        id_paciente: nuevoPaciente.id_paciente,
        id_fonoaudiologo: parseInt(profId),
        id_servicio: parseInt(servId),
        fecha: fecha,
        hora_inicio: hora,
        duracion_minutos: s.duracion,
        precio: s.precio
      };

      const respuestaCita = await fetch('http://localhost:3000/api/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paqueteCita)
      });

      if (!respuestaCita.ok) {
        throw new Error("Error al crear la cita");
      }

      const nuevaCita = await respuestaCita.json();

      // 3. Navegamos al pago enviando el ID de la cita generada
      navigate(`/pago/${profId}/${servId}`, { 
        state: { 
          fecha, 
          hora, 
          contacto: datosPaciente, 
          p, 
          s, 
          pacienteId: nuevoPaciente.id_paciente,
          reservaId: nuevaCita.id_citas
        } 
      });

    } catch (error) {
      console.error("Error de red:", error);
      alert("Error de conexión con el servidor.");
    }
  };

  return (
    <main>
      <div className="contact-wrap">
        <div className="contact-panel">
          <h2>Formulario de contacto</h2>
          <form onSubmit={handleSubmit}>
            
            <div className="cf-group">
              <label>Correo electrónico*</label>
              <input 
                type="email" 
                name="email"
                placeholder="ejemplo@correo.com" 
                value={datosPaciente.email}
                onChange={manejarCambio}
                required 
              />
            </div>

            <div className="cf-group">
              <label>Número de teléfono*</label>
              <input 
                type="tel" 
                name="telefono"
                placeholder="+56 9 1234 5678" 
                value={datosPaciente.telefono}
                onChange={manejarCambio}
                required 
              />
            </div>

            <div className="cf-group">
              <label>RUT*</label>
              <input 
                type="text" 
                name="rut"
                placeholder="Ej: 12.345.678-9" 
                value={datosPaciente.rut}
                onChange={manejarCambio}
                required 
              />
            </div>

            <div className="cf-group">
              <label>Nombre*</label>
              <input 
                type="text" 
                name="nombre_completo"
                placeholder="Ingresa tu nombre completo" 
                value={datosPaciente.nombre_completo}
                onChange={manejarCambio}
                required 
              />
            </div>
            
            <button className="cf-submit" type="submit">Continuar al pago</button>
            <div className="cf-hint">Tus datos solo se comparten con el profesional que elegiste.</div>
          </form>
        </div>
        
        <div className="summary-card">
          <div className="summary-head">
            <span className="ico">📅</span>
            <span className="txt">Reserva: {fecha} — {hora}</span>
          </div>
          <div className="summary-row"><div className="lbl">Modalidad</div><div className="val">{s.modalidad}</div></div>
          <div className="summary-row"><div className="lbl">Precio</div><div className="val">${s.precio} CLP</div></div>
          <div className="summary-row"><div className="lbl">Duración</div><div className="val">{s.duracion} min</div></div>
        </div>
      </div>
    </main>
  );
}