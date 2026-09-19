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

  // 1. Ampliamos la memoria de React para capturar TODOS los datos que exige tu MySQL
  const [datosPaciente, setDatosPaciente] = useState({
    nombre_completo: '',
    rut: '',
    telefono: '',
    email: '' // Opcional, pero bueno tenerlo si lo piden en pantalla
  });

  if (!p || !s) return <div style={{padding: '100px', textAlign: 'center'}}>Error cargando datos.</div>;

  // 2. Función que captura cada letra que el paciente escribe en las cajas
  const manejarCambio = (e) => {
    setDatosPaciente({
      ...datosPaciente,
      [e.target.name]: e.target.value
    });
  };

  // 3. EL PUENTE A MYSQL: Qué pasa cuando el usuario presiona el botón
  // 3. EL PUENTE A MYSQL: Qué pasa cuando el usuario presiona el botón
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    
    try {
      // Preparamos el paquete exacto que necesita el backend
      const datosParaBackend = {
        ...datosPaciente,
        id_usuario: parseInt(profId) // ¡Aquí conectamos al paciente con el profesional!
      };

      console.log("⏳ Enviando datos a MySQL...", datosParaBackend);

      // Disparamos la petición a tu ruta POST en Node.js
      const respuesta = await fetch('http://localhost:3000/api/pacientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosParaBackend) // Empaquetamos los datos completos
      });

      // ... resto de tu código (if respuesta.ok ...)

      if (respuesta.ok) {
        alert("✅ ¡Paciente registrado en la base de datos con éxito!");
        // Si se guardó bien, recién ahí lo dejamos pasar al pago
        navigate(`/pago/${p.id}/${s.id}`, { state: { fecha, hora, contacto: datosPaciente } });
      } else {
        alert("❌ Hubo un problema al guardar en MySQL. Revisa tu consola.");
      }

    } catch (error) {
      console.error("Error conectando al servidor:", error);
      alert("❌ Error de red. Asegúrate de que tu servidor Node.js esté encendido.");
    }
  };

  return (
    <main>
      <div className="contact-wrap">
        <div className="contact-panel">
          <h2>Formulario de contacto</h2>
          {/* Conectamos el formulario a nuestra nueva función handleSubmit */}
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