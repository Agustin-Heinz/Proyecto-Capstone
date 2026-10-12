import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, X, UserCircle2, Stethoscope, FileText, Calendar, MapPin, RefreshCw, CheckCircle2, Trash2 } from 'lucide-react';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation(); 

  const rol = localStorage.getItem('rol');
  const nombre = localStorage.getItem('nombre');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login'); 
  };

  // BUSCAR CITAS PARA LOS PACIENTES NO LOGEADOS
  const [mostrarModalBusqueda, setMostrarModalBusqueda] = useState(false);
  const [rutBusqueda, setRutBusqueda] = useState('');
  const [citaEncontrada, setCitaEncontrada] = useState(null);
  const [mensajeError, setMensajeError] = useState('');
  const [estadoLocal, setEstadoLocal] = useState('Pendiente a confirmar');
  const [buscando, setBuscando] = useState(false);

  const manejarBusqueda = async (e) => {
    e.preventDefault();
    setMensajeError('');
    if (rutBusqueda.trim().length < 8) return setMensajeError('Ingresa un RUT válido.');

    setBuscando(true);
    try {
      const res = await fetch(`http://localhost:3000/api/citas/rut/${encodeURIComponent(rutBusqueda.trim())}`);
      if (res.ok) {
        const datos = await res.json();
        setCitaEncontrada(datos);
        setEstadoLocal(datos.estado_asistencia === 'Confirmada' ? 'Confirmada' : 'Pendiente a confirmar');
      } else {
        const errorData = await res.json();
        setMensajeError(errorData.mensaje || 'No se encontraron citas.');
        setCitaEncontrada(null);
      }
    } catch (error) {
      setMensajeError('Error de conexión con el servidor.');
    } finally {
      setBuscando(false);
    }
  };

  const actualizarEstadoCita = async (nuevoEstado) => {
    const estadoBD = nuevoEstado === 'Confirmar' ? 'Confirmada' : 'Anulada';
    try {
      await fetch(`http://localhost:3000/api/citas/${citaEncontrada.id_citas}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_asistencia: estadoBD })
      });
      
      if (nuevoEstado === 'Confirmar') {
        setEstadoLocal('Confirmada');
      } else {
        cerrarModal(); 
      }
    } catch (error) {
      console.error('Error guardando estado:', error);
    }
  };

  const cerrarModal = () => {
    setMostrarModalBusqueda(false);
    setCitaEncontrada(null);
    setRutBusqueda('');
    setMensajeError('');
  };

  const formatearFecha = (fechaIso) => {
    if (!fechaIso) return '';
    const [y, m, d] = String(fechaIso).split('T')[0].split('-');
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
  };

  const obtenerHora = (horaIso) => horaIso ? String(horaIso).substring(11, 16) : '';

  return (
    <>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              
              {/* BOTÓN PARA BUSCAR CITA */}
              <button 
                onClick={() => setMostrarModalBusqueda(true)}
                style={{ backgroundColor: 'transparent', color: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 18px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Search size={16} /> Buscar mi cita
              </button>

              {/* BOTÓN INGRESAR */}
              <Link 
                to="/login" 
                style={{ textDecoration: 'none', backgroundColor: '#1976d2', color: '#ffffff', padding: '8px 22px', borderRadius: '6px', fontSize: '14px', fontWeight: '700', display: 'inline-block' }}
              >
                Ingresar
              </Link>
              
            </div>
          )}
        </div>
      </header>

      {/* VENTANA VISUAL  */}
      {mostrarModalBusqueda && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }} onClick={cerrarModal}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '26px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)', fontFamily: "'Inter', sans-serif" }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Gestión de Reserva</div>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', color: '#0f172a', fontWeight: '800' }}>
                  {!citaEncontrada ? 'Busca tu cita médica' : 'Detalle de tu Atención'}
                </h3>
              </div>
              <button onClick={cerrarModal} style={{ backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}><X size={18} /></button>
            </div>

            {!citaEncontrada ? (
              <div>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px', marginTop: 0 }}>
                  Ingresa tu RUT para confirmar, anular o reagendar tu atención médica sin necesidad de iniciar sesión.
                </p>
                <form onSubmit={manejarBusqueda} style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" placeholder="Ej: 12345678-9" value={rutBusqueda} onChange={(e) => setRutBusqueda(e.target.value)} style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px' }} />
                  <button type="submit" disabled={buscando} style={{ backgroundColor: '#1e40af', color: 'white', border: 'none', padding: '0 24px', borderRadius: '10px', fontWeight: '700', cursor: buscando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {buscando ? 'Buscando...' : 'Buscar'}
                  </button>
                </form>
                {mensajeError && <div style={{ marginTop: '12px', color: '#dc2626', fontSize: '13px', fontWeight: '600' }}>{mensajeError}</div>}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <UserCircle2 size={46} color="#1e40af" strokeWidth={1.5} />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Flgo/a. {citaEncontrada.nombre_fono}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}><Stethoscope size={13} color="#1e40af" /> {citaEncontrada.especialidad_fono}</div>
                    </div>
                  </div>
                  <span style={{ backgroundColor: estadoLocal === 'Confirmada' ? '#dcfce7' : '#fef9c3', color: estadoLocal === 'Confirmada' ? '#166534' : '#854d0e', border: `1px solid ${estadoLocal === 'Confirmada' ? '#bbf7d0' : '#fde047'}`, padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700' }}>
                    {estadoLocal === 'Confirmada' ? '✓ Confirmada' : 'Por confirmar'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#334155', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}><span style={{ color: '#64748b', display: 'flex', gap: '8px' }}><FileText size={16} color="#1e40af" /> Tratamiento</span><strong>{citaEncontrada.nombre_servicio}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}><span style={{ color: '#64748b', display: 'flex', gap: '8px' }}><Calendar size={16} color="#1e40af" /> Fecha y hora</span><strong>{formatearFecha(citaEncontrada.fecha)} • {obtenerHora(citaEncontrada.hora_inicio)} hrs</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}><span style={{ color: '#64748b', display: 'flex', gap: '8px' }}><MapPin size={16} color="#1e40af" /> Ubicación</span><strong>{citaEncontrada.direccion_fono}</strong></div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={() => { cerrarModal(); navigate(`/reserva/${citaEncontrada.id_fonoaudiologo}/${citaEncontrada.id_servicio}`); }} style={{ flex: 1, minWidth: '130px', backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '11px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}><RefreshCw size={15} /> Reagendar</button>
                  {estadoLocal !== 'Confirmada' && (
                    <button onClick={() => actualizarEstadoCita('Confirmar')} style={{ flex: 1, minWidth: '130px', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '11px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}><CheckCircle2 size={15} /> Confirmar</button>
                  )}
                  <button onClick={() => actualizarEstadoCita('Anular')} style={{ flex: 1, minWidth: '130px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', padding: '11px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}><Trash2 size={15} /> Anular</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}