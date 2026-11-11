import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { House, Calendar, Users, UserRound, BarChart2, ArrowLeft, Menu, X } from 'lucide-react';


export default function DashboardLayout() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [avisoPagoPlan, setAvisoPagoPlan] = useState(null);
  const tokenProcesadoRef = useRef(null);
  
  // Función para saber si un enlace está activo y pintarlo de blanco
  const isActive = (path) => location.pathname === path;

  // Confirmar automáticamente el pago del PLAN al volver de Transbank Webpay (?token_ws=...)
  useEffect(() => {
    const tokenWs = searchParams.get('token_ws');
    if (!tokenWs || tokenProcesadoRef.current === tokenWs) return;

    tokenProcesadoRef.current = tokenWs;

    fetch('http://localhost:3000/api/pagos/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_ws: tokenWs })
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data.exito) {
          setAvisoPagoPlan({
            tipo: 'exito',
            texto: `¡Pago de suscripción confirmado exitosamente! (Código autorización: ${data.codigo_autorizacion || 'OK'})`
          });
        } else {
          setAvisoPagoPlan({
            tipo: 'error',
            texto: data.mensaje || 'No se pudo confirmar el pago en Webpay.'
          });
        }
        // Limpiar token_ws de la URL para evitar reenvíos al recargar
        const nuevosParams = new URLSearchParams(searchParams);
        nuevosParams.delete('token_ws');
        setSearchParams(nuevosParams, { replace: true });
      })
      .catch(err => {
        console.error('Error al confirmar pago de plan:', err);
      });
  }, [searchParams, setSearchParams]);

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
        {avisoPagoPlan && (
          <div
            style={{
              marginBottom: '20px',
              padding: '14px 18px',
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: avisoPagoPlan.tipo === 'exito' ? '#dcfce7' : '#fee2e2',
              color: avisoPagoPlan.tipo === 'exito' ? '#166534' : '#991b1b',
              border: `1px solid ${avisoPagoPlan.tipo === 'exito' ? '#86efac' : '#fca5a5'}`,
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            <span>{avisoPagoPlan.texto}</span>
            <button
              onClick={() => setAvisoPagoPlan(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: '800', fontSize: '16px' }}
            >
              ✕
            </button>
          </div>
        )}
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