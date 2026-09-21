import { Link, Outlet, useLocation } from 'react-router-dom';

export default function DashboardLayout() {
  const location = useLocation();
  
  // Función para saber si un enlace está activo y pintarlo de blanco
  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f7fb', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Barra lateral */}
      <aside style={{ width: '260px', backgroundColor: '#1a365d', color: '#ffffff', display: 'flex', flexDirection: 'column' }}>
        
        {/* Logo FonoTrack */}
        <div style={{ padding: '35px 25px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: '#ffffff', color: '#1a365d', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '24px' }}>
            +
          </div>
          <div style={{ lineHeight: '1.1' }}>
            <div style={{ fontWeight: '800', fontSize: '20px', letterSpacing: '0.5px' }}>FONO<br/>TRACK</div>
            <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>Panel profesional</div>
          </div>
        </div>

        {/* Menú de navegación */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '0 15px' }}>
          <Link to="/panel" style={navItemStyle(isActive('/panel'))}>
            <span style={{ marginRight: '10px' }}>🏠</span> Inicio
          </Link>
          <Link to="/panel/agenda" style={navItemStyle(isActive('/panel/agenda'))}>
            <span style={{ marginRight: '10px' }}>📅</span> Mi Agenda
          </Link>
          <Link to="/panel/pacientes" style={navItemStyle(isActive('/panel/pacientes'))}>
            <span style={{ marginRight: '10px' }}>👥</span> Pacientes
          </Link>
          <Link to="/panel/reportes" style={navItemStyle(isActive('/panel/reportes'))}>
            <span style={{ marginRight: '10px' }}>📊</span> Reportes
          </Link>
          <Link to="/panel/perfil" style={navItemStyle(isActive('/panel/perfil'))}>
            <span style={{ marginRight: '10px' }}>👤</span> Mi Perfil
          </Link>
        </nav>
      </aside>
      
      {/* Contenedor principal de las pantallas */}
      <main style={{ flex: 1, padding: '40px 50px', overflowY: 'auto' }}>
        <Outlet /> 
      </main>
      
    </div>
  );
}

// Estilo dinámico para los botones del menú
const navItemStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '12px 20px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '15px',
  color: active ? '#1a365d' : '#ffffff',
  backgroundColor: active ? '#ffffff' : 'transparent',
  transition: 'all 0.2s ease'
});