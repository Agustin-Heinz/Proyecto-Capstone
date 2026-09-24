import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { PROFESIONALES } from '../data';

export default function Contact() {
  const { profId, servId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { fecha, hora } = location.state || {};
  const p = PROFESIONALES.find(prof => prof.id === parseInt(profId));
  const s = p?.servicios.find(serv => serv.id === parseInt(servId));

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

  // 3. EL PUENTE A MYSQL: Qué pasa cuando el usuario presiona "Continuar al pago"
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    
    try {
      console.log("Enviando datos de la cita");

      // Construimos el paquete exacto que espera tu nueva ruta POST /api/citas
      // Usamos los IDs estáticos del profesional y servicio que vienen de useParams
      const paqueteCita = {
          id_paciente: 1, // Por ahora enviamos un ID de paciente existente
          id_fonoaudiologo: parseInt(profId), 
          id_servicio: parseInt(servId), 
          fecha: fecha, // Debes asegurarte de que este formato coincida con el esperado por MySQL (ej. 'YYYY-MM-DD')
          hora_inicio: `1970-01-01T${hora}:00Z`, // Adaptamos la hora visual al formato ISO que exige Prisma
          duracion_minutos: s.duracion,
          precio: s.precio
      };

      // Disparamos la petición POST a tu servidor Node.js
      const respuesta = await fetch('http://localhost:3000/api/citas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paqueteCita) 
      });

      if (respuesta.ok) {
        alert("Cita guardada en MySQL! Pendiente de pago.");
        // Navegamos al pago enviando los datos de la cita
        navigate(`/pago/${p.id}/${s.id}`, { state: { fecha, hora, contacto: datosPaciente } });
      } else {
        const errorData = await respuesta.json();
        alert(`Error al agendar: ${errorData.mensaje}`);
        console.error("Detalle del error:", errorData.detalle);
      }

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