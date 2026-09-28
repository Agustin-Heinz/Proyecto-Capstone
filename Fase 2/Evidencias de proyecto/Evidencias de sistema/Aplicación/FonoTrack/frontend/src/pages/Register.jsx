import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  // 1. Añadimos rut, edad y genero al estado inicial
  const [formData, setFormData] = useState({ 
    nombre: '', 
    email: '', 
    password: '', 
    rol: 'paciente',
    rut: '',
    fechaNcimiento: '',
    genero: ''
  });
  
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    
    try {
      const respuesta = await fetch('http://localhost:3000/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData) 
      });

      if (respuesta.ok) {
        alert("Cuenta creada con éxito. Ahora puedes iniciar sesión.");
        navigate('/login'); 
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

          {/* 2. Renderizado condicional: Solo se muestra si el rol es "paciente" */}
          {formData.rol === 'paciente' && (
            <>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div className="cf-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>RUT</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 12.345.678-9" 
                    onChange={e => setFormData({ ...formData, rut: e.target.value })} 
                    required 
                  />
                </div>
                
                <div className="cf-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Fecha de Nacimiento</label>
                  <input 
                    type="date" 
                    onChange={e => setFormData({ ...formData, fechaNacimiento: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="cf-group">
                <label>Género</label>
                <select 
                  value={formData.genero} 
                  onChange={e => setFormData({ ...formData, genero: e.target.value })}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
                  required
                >
                  <option value="" disabled>Selecciona una opción</option>
                  <option value="femenino">Femenino</option>
                  <option value="masculino">Masculino</option>
                  <option value="otro">Otro</option>
                  <option value="prefiero_no_decirlo">Prefiero no decirlo</option>
                </select>
              </div>
            </>
          )}

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