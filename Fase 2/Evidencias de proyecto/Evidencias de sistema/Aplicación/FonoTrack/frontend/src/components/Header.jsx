import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation(); 

  const rol = localStorage.getItem('rol');
  const nombre = localStorage.getItem('nombre');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login'); 
  };

  return (
    <header 
      className="app-header" 
      style={{ 
        backgroundColor: '#0c2749', 
        borderBottom: 'none', 
        padding: '14px 0' 
      }}
    >
      <div 
        className="row" 
        style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 28px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}
      >
        <Link 
          to="/" 
          className="logo" 
          style={{ 
            textDecoration: 'none', 
            color: '#ffffff', 
            fontSize: '24px', 
            fontWeight: '800', 
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            letterSpacing: '-0.5px'
          }}
        >
          FonoTrack
        </Link>

        <div className="header-spacer"></div>
        
        {rol === 'paciente' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <span style={{ fontWeight: '600', color: '#ffffff', fontSize: '14px' }}>
              Hola, {nombre?.split(' ')[0]}
            </span>
            <Link to="/paciente-perfil" style={{ textDecoration: 'none', color: '#cbd5e1', fontSize: '14px', fontWeight: '600' }}>
              Mi Perfil
            </Link>
            <button 
              onClick={handleLogout} 
              className="header-cta" 
              style={{ backgroundColor: '#1976d2', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px 18px', fontWeight: '600', cursor: 'pointer' }}
            >
              Salir
            </button>
          </div>
        ) : rol === 'fonoaudiologo' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <span style={{ fontWeight: '600', color: '#ffffff', fontSize: '14px' }}>
               {nombre?.split(' ')[0]}
            </span>
            <Link to="/panel" style={{ textDecoration: 'none', color: '#cbd5e1', fontSize: '14px', fontWeight: '600' }}>
              Mi Panel
            </Link>
            <button 
              onClick={handleLogout} 
              className="header-cta" 
              style={{ backgroundColor: '#1976d2', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px 18px', fontWeight: '600', cursor: 'pointer' }}
            >
              Salir
            </button>
          </div>
        ) : (
          <Link 
            to="/login" 
            className="header-cta" 
            style={{ 
              textDecoration: 'none', 
              backgroundColor: '#1976d2', 
              color: '#ffffff', 
              padding: '8px 22px', 
              borderRadius: '6px', 
              fontSize: '14px', 
              fontWeight: '700' 
            }}
          >
            Ingresar
          </Link>
        )}
      </div>
    </header>
  );
}