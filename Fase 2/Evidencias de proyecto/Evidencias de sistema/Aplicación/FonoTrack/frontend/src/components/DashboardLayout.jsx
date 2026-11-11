import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { House, Calendar, Users, UserRound, BarChart2, ArrowLeft, Menu, X } from 'lucide-react';


export default function DashboardLayout() {
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  
  // Función para saber si un enlace está activo y pintarlo de blanco
  const isActive = (path) => location.pathname === path;

  return (
    <div className="dashboard-shell">
      
      {/* Barra superior visible solo en móviles */}
      <div className="dashboard-mobile-bar">
        <Link
          to="/"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#ffffff' }}
        >
          <div style={{ backgroundColor: '#ffffff', color: '#1a365d', width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '20px' }}>
            +
          </div>
          <span style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '0.4px' }}>FONOTRACK</span>
        </Link>
        <button
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-label="Abrir menú"
          style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#ffffff', borderRadius: '8px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          {menuAbierto ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Barra lateral */}
      <aside className={`dashboard-sidebar ${menuAbierto ? 'open' : ''}`}>
        
        {/* Logo FonoTrack (Clickeable para volver al inicio de la página) */}
        <Link
          to="/"
          title="Volver a la página principal"
          style={{ padding: '35px 25px', display: 'flex', alignItems: 'center', gap: '15px', textDecoration: 'none', color: '#ffffff' }}
        >
          <div style={{ backgroundColor: '#ffffff', color: '#1a365d', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '24px' }}>
            +
          </div>
          <div style={{ lineHeight: '1.1' }}>
            <div style={{ fontWeight: '800', fontSize: '20px', letterSpacing: '0.5px' }}>FONO<br/>TRACK</div>
            <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>Panel profesional</div>
          </div>
        </Link>

        {/* Menú de navegación */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '0 15px', flex: 1 }}>
          <Link to="/panel" onClick={() => setMenuAbierto(false)} style={navItemStyle(isActive('/panel'))}>
            <span style={{ marginRight: '10px' }}><House size={20} /></span> Inicio
          </Link>
          <Link to="/panel/agenda" onClick={() => setMenuAbierto(false)} style={navItemStyle(isActive('/panel/agenda'))}>
            <span style={{ marginRight: '10px' }}><Calendar size={20} /></span> Mi Agenda
          </Link>
          <Link to="/panel/pacientes" onClick={() => setMenuAbierto(false)} style={navItemStyle(isActive('/panel/pacientes'))}>
            <span style={{ marginRight: '10px' }}><Users size={20} /></span> Pacientes
          </Link>
          <Link to="/panel/reportes" onClick={() => setMenuAbierto(false)} style={navItemStyle(isActive('/panel/reportes'))}>
            <span style={{ marginRight: '10px' }}><BarChart2 size={20} /></span> Reportes
          </Link>
          <Link to="/panel/perfil" onClick={() => setMenuAbierto(false)} style={navItemStyle(isActive('/panel/perfil'))}>
            <span style={{ marginRight: '10px' }}><UserRound size={20} /></span> Mi Perfil
          </Link>
        </nav>

        {/* Botón inferior con flecha para regresar al inicio de la página */}
        <div style={{ padding: '20px 15px', borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              color: '#cbd5e1',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              transition: 'all 0.2s ease'
            }}
          >
            <ArrowLeft size={18} /> Volver al inicio
          </Link>
        </div>
      </aside>
      
      {/* Contenedor principal de las pantallas */}
      <main className="dashboard-main">
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