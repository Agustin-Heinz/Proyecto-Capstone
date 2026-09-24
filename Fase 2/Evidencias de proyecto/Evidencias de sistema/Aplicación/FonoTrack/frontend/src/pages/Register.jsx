import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', rol: 'paciente' });
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    
    try {
      const respuesta = await fetch('http://localhost:3000/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData) // Enviamos nombre, email, password y rol
      });

      if (respuesta.ok) {
        alert("Cuenta creada con éxito. Ahora puedes iniciar sesión.");
        navigate('/login'); // Lo enviamos a loguearse
      } else {
        const errorData = await respuesta.json();
        alert(`Error: ${errorData.mensaje}`);
      }
    } catch (error) {
      console.error("Error de conexión:", error);
    }
  };

  return (
    <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="contact-panel" style={{ width: '100%', maxWidth: '450px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Crear Cuenta</h2>
        <form onSubmit={handleRegister}>
          <div className="cf-group">
            <label>Quiero registrarme como...</label>
            <select 
              value={formData.rol} 
              onChange={e => setFormData({ ...formData, rol: e.target.value })}
              style={{ width: '100%', padding: '14px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
            >
              <option value="paciente">Paciente</option>
              <option value="fonoaudiologo">Fonoaudiólogo profesional</option>
            </select>
          </div>
          <div className="cf-group">
            <label>Nombre completo</label>
            <input type="text" placeholder="Ej: Diego Sepúlveda" onChange={e => setFormData({ ...formData, nombre: e.target.value })} required />
          </div>
          <div className="cf-group">
            <label>Correo electrónico</label>
            <input type="email" placeholder="tu@correo.com" onChange={e => setFormData({ ...formData, email: e.target.value })} required />
          </div>
          <div className="cf-group">
            <label>Contraseña</label>
            <input type="password" placeholder="Mínimo 8 caracteres" onChange={e => setFormData({ ...formData, password: e.target.value })} required />
          </div>
          <button className="cf-submit" type="submit" style={{ width: '100%', marginTop: '10px' }}>
            Registrarme
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--ink-soft)' }}>
          ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--indigo)', fontWeight: '600', textDecoration: 'none' }}>Ingresa aquí</Link>
        </div>
      </div>
    </main>
  );
}