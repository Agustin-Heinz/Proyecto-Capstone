import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const respuesta = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (respuesta.ok) {
        const usuario = await respuesta.json();
        
        // ✅ NUEVO: Guardamos el ID del perfil en el navegador
        localStorage.setItem('perfilId', usuario.perfilId);
        localStorage.setItem('rol', usuario.rol);

        alert(`¡Bienvenido!`);
        
        if (usuario.rol === 'fonoaudiologo') {
          navigate('/panel');
        } else {
          navigate('/');
        }
      } else {
        alert("Correo o contraseña incorrectos");
      }
    } catch (error) {
      console.error("Error de conexión:", error);
    }
  };

  return (
    <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="contact-panel" style={{ width: '100%', maxWidth: '400px', margin: '40px 20px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Iniciar Sesión</h2>
        <form onSubmit={handleLogin}>
          <div className="cf-group">
            <label>Correo electrónico</label>
            <input 
              type="email" 
              placeholder="tu@correo.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="cf-group">
            <label>Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button className="cf-submit" type="submit" style={{ width: '100%', marginTop: '10px' }}>
            Ingresar
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--ink-soft)' }}>
          ¿No tienes cuenta? <Link to="/registro" style={{ color: 'var(--indigo)', fontWeight: '600', textDecoration: 'none' }}>Regístrate aquí</Link>
        </div>
      </div>
    </main>
  );
}