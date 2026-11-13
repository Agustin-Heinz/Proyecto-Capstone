import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { House, Calendar, Users, UserRound, BarChart2, ArrowLeft, Menu, X } from 'lucide-react';


export default function DashboardLayout() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [avisoPagoPlan, setAvisoPagoPlan] = useState(null);
  const [verificandoPlan, setVerificandoPlan] = useState(true);
  const [planHabilitado, setPlanHabilitado] = useState(false);
  const tokenProcesadoRef = useRef(null);
  
  // Función para saber si un enlace está activo y pintarlo de blanco
  const isActive = (path) => location.pathname === path;

  // Confirmar pago del PLAN al volver de Webpay (?token_ws=...) o verificar si ya tiene un plan PAGADO
  useEffect(() => {
    const tokenWs = searchParams.get('token_ws');
    const perfilId = localStorage.getItem('perfilId');

    if (tokenWs && tokenProcesadoRef.current !== tokenWs) {
      tokenProcesadoRef.current = tokenWs;
      setVerificandoPlan(true);

      fetch('http://localhost:3000/api/pagos/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_ws: tokenWs })
      })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
          if (ok && data.exito) {
            localStorage.setItem('planActivo', 'true');
            setPlanHabilitado(true);
            setAvisoPagoPlan({
              tipo: 'exito',
              texto: `¡Pago de suscripción confirmado exitosamente! Tu Panel Profesional ha sido desbloqueado. (Código: ${data.codigo_autorizacion || 'OK'})`
            });
          } else {
            localStorage.setItem('planActivo', 'false');
            setPlanHabilitado(false);
            setAvisoPagoPlan({
              tipo: 'error',
              texto: data.mensaje || 'No se pudo confirmar el pago en Webpay.'
            });
          }
          // Limpiar token_ws de la URL para evitar reenvíos al recargar
          const nuevosParams = new URLSearchParams(searchParams);
          nuevosParams.delete('token_ws');
          setSearchParams(nuevosParams, { replace: true });
          setVerificandoPlan(false);
        })
        .catch(err => {
          console.error('Error al confirmar pago de plan:', err);
          setVerificandoPlan(false);
        });
      return;
    }

    if (!perfilId) {
      setPlanHabilitado(false);
      setVerificandoPlan(false);
      return;
    }

    fetch(`http://localhost:3000/api/pagos/estado/${perfilId}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const activo = Boolean(data && data.planActivo);
        localStorage.setItem('planActivo', activo ? 'true' : 'false');
        setPlanHabilitado(activo);
        setVerificandoPlan(false);
      })
      .catch(err => {
        console.error('Error verificando estado del plan:', err);
        setPlanHabilitado(localStorage.getItem('planActivo') === 'true');
        setVerificandoPlan(false);
      });
  }, [searchParams, setSearchParams]);

  if (verificandoPlan) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f7fb', color: '#1a365d', fontWeight: '700', fontSize: '16px' }}>
        Verificando suscripción profesional...
      </div>
    );
  }

  if (!planHabilitado) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f7fb', padding: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', maxWidth: '480px', width: '100%', padding: '36px 30px', borderRadius: '18px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div className="lock-badge-circle" role="img" aria-label="Acceso bloqueado">
            <svg className="lock-svg-anim" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {/* Arco del candado (se desliza hacia abajo para cerrarse) */}
              <path className="lock-shackle-anim" d="M10.5 14V10.5a5.5 5.5 0 0 1 11 0V14" />
              {/* Cuerpo del candado */}
              <rect x="7" y="14" width="18" height="13" rx="3" />
              {/* Ojo de la cerradura */}
              <circle cx="16" cy="20.5" r="1.4" fill="#ffffff" stroke="none" />
            </svg>
          </div>
          <h2 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '22px', fontWeight: '800' }}>
            Panel Profesional Bloqueado
          </h2>
          <p style={{ margin: '0 0 24px 0', color: '#475569', fontSize: '15px', lineHeight: '1.6' }}>
            Para acceder a tu agenda, gestión de pacientes, fichas clínicas y reportes, primero debes activar uno de los <strong>planes profesionales de FonoTrack</strong>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a
              href="/#planes"
              style={{ display: 'block', backgroundColor: '#1d4ed8', color: '#ffffff', textDecoration: 'none', padding: '14px 20px', borderRadius: '10px', fontWeight: '700', fontSize: '15px' }}
            >
              Ver y contratar un Plan
            </a>
            <Link
              to="/"
              style={{ display: 'block', color: '#64748b', textDecoration: 'none', padding: '10px', fontWeight: '600', fontSize: '14px' }}
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      
      {/* Barra superior visible solo en móviles */}
      <div className="dashboard-mobile-bar">
        <Link
          to="/"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#ffffff' }}
        >
          <div style={{ backgroundColor: '#ffffff', color: '#0c2749', width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '20px' }}>
            +
          </div>
          <span style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '0.4px' }}>FONOTRACK</span>
        </Link>
        <button
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-label={menuAbierto ? 'Cerrar menú del panel' : 'Abrir menú del panel'}
          aria-expanded={menuAbierto}
          style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#ffffff', borderRadius: '8px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          {menuAbierto ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Fondo oscuro en móvil al abrir el menú lateral */}
      <div
        className={`dashboard-backdrop ${menuAbierto ? 'open' : ''}`}
        onClick={() => setMenuAbierto(false)}
      />

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