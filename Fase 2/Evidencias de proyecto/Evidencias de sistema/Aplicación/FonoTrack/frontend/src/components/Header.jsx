import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  // useLocation detecta cuando navegamos
  // Esto obliga al Header a volver a leer el localStorage al instante
  const location = useLocation(); 

  const rol = localStorage.getItem('rol');
  const nombre = localStorage.getItem('nombre');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login'); 
  };

  return (
    <header className="app-header">
      <div className="row">
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
          <span className="mark">🗣️</span> FonoTrack
        </Link>
        <div className="header-spacer"></div>
        
        {rol === 'paciente' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontWeight: '600', color: '#1a365d' }}>
              Hola, {nombre?.split(' ')[0]} {/* Mostramos solo el primer nombre */}
            </span>
            <Link to="/mi-perfil" style={{ textDecoration: 'none', color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Mis Reservas</Link>
            <button onClick={handleLogout} className="header-cta" style={{ backgroundColor: '#f1f5f9', color: '#1a365d', border: '1px solid #cbd5e1' }}>
              Salir
            </button>
          </div>
        ) : rol === 'fonoaudiologo' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontWeight: '600', color: '#1a365d' }}>
              Dr/a. {nombre?.split(' ')[0]}
            </span>
            <Link to="/panel" style={{ textDecoration: 'none', color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Mi Panel</Link>
            <button onClick={handleLogout} className="header-cta" style={{ backgroundColor: '#f1f5f9', color: '#1a365d', border: '1px solid #cbd5e1' }}>
              Salir
            </button>
          </div>
        ) : (
          // Si nadie inicio sesion se muestra el boton normal
          <Link to="/login" className="header-cta" style={{ textDecoration: 'none' }}>
            Ingresar
          </Link>
        )}
      </div>
    </header>
  );
}