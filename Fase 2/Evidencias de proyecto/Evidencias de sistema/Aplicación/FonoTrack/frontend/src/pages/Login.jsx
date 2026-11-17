import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mostrarAlerta } from '../utils/dialogoFonoTrack';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // Estados para el flujo de "¿Has olvidado tu contraseña?"
  // modo: 'login' | 'solicitar' | 'verificar' | 'cambiar'
  const [modo, setModo] = useState('login');
  const [emailRecuperacion, setEmailRecuperacion] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState({ tipo: '', texto: '' });

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

        // Guarda el ID del perfil y el nombre en el navegador
        if (usuario.perfilId) {
          localStorage.setItem('perfilId', usuario.perfilId);
        } else {
          localStorage.removeItem('perfilId');
        }
        localStorage.setItem('rol', usuario.rol);
        localStorage.setItem('nombre', usuario.nombre);
        localStorage.setItem('email', usuario.email);
        localStorage.setItem('planActivo', usuario.planActivo ? 'true' : 'false');

        if (usuario.rol === 'fonoaudiologo') {
          if (usuario.planActivo) {
            await mostrarAlerta(`¡Bienvenido ${usuario.nombre}!`, { titulo: 'Inicio de sesión exitoso' });
            navigate('/panel');
          } else {
            await mostrarAlerta(
              `¡Bienvenido ${usuario.nombre}! Para desbloquear tu Panel Profesional, selecciona y contrata uno de los planes disponibles.`,
              { titulo: 'Selecciona tu plan' }
            );
            navigate('/#planes');
          }
        } else {
          await mostrarAlerta(`¡Bienvenido ${usuario.nombre}!`, { titulo: 'Inicio de sesión exitoso' });
          navigate('/');
        }
      } else {
        await mostrarAlerta("Correo o contraseña incorrectos");
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      await mostrarAlerta("No se pudo conectar con el servidor.");
    }
  };

  const abrirRecuperacion = () => {
    setEmailRecuperacion(email || '');
    setCodigo('');
    setNuevaPassword('');
    setConfirmarPassword('');
    setMensajeEstado({ tipo: '', texto: '' });
    setModo('solicitar');
  };

  const volverAlLogin = () => {
    setModo('login');
    setCodigo('');
    setNuevaPassword('');
    setConfirmarPassword('');
    setMensajeEstado({ tipo: '', texto: '' });
  };

  // Paso 1: Enviar código al correo
  const handleSolicitarCodigo = async (e) => {
    if (e) e.preventDefault();
    setCargando(true);
    setMensajeEstado({ tipo: '', texto: '' });

    try {
      const respuesta = await fetch('http://localhost:3000/api/recuperar-password/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailRecuperacion })
      });

      const data = await respuesta.json();

      if (respuesta.ok) {
        setMensajeEstado({
          tipo: 'exito',
          texto: data.mensaje || 'Hemos enviado un código a tu correo electrónico.'
        });
        setModo('verificar');
      } else {
        setMensajeEstado({
          tipo: 'error',
          texto: data.mensaje || 'No se pudo enviar el código de verificación.'
        });
      }
    } catch (error) {
      console.error("Error al solicitar código:", error);
      setMensajeEstado({
        tipo: 'error',
        texto: 'Error de conexión con el servidor.'
      });
    } finally {
      setCargando(false);
    }
  };

  // Paso 2: Verificar código ingresado en la página de espera
  const handleVerificarCodigo = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensajeEstado({ tipo: '', texto: '' });

    try {
      const respuesta = await fetch('http://localhost:3000/api/recuperar-password/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailRecuperacion, codigo })
      });

      const data = await respuesta.json();

      if (respuesta.ok) {
        setMensajeEstado({
          tipo: 'exito',
          texto: 'Código verificado correctamente. Ingresa tu nueva contraseña.'
        });
        setModo('cambiar');
      } else {
        setMensajeEstado({
          tipo: 'error',
          texto: data.mensaje || 'El código ingresado no es válido.'
        });
      }
    } catch (error) {
      console.error("Error al verificar código:", error);
      setMensajeEstado({
        tipo: 'error',
        texto: 'Error de conexión con el servidor.'
      });
    } finally {
      setCargando(false);
    }
  };

  // Paso 3: Guardar nueva contraseña en la base de datos
  const handleCambiarPassword = async (e) => {
    e.preventDefault();

    if (nuevaPassword.length < 6) {
      setMensajeEstado({
        tipo: 'error',
        texto: 'La nueva contraseña debe tener al menos 6 caracteres.'
      });
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setMensajeEstado({
        tipo: 'error',
        texto: 'Las contraseñas no coinciden. Verifica e inténtalo de nuevo.'
      });
      return;
    }

    setCargando(true);
    setMensajeEstado({ tipo: '', texto: '' });

    try {
      const respuesta = await fetch('http://localhost:3000/api/recuperar-password/cambiar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailRecuperacion,
          codigo,
          nuevaPassword
        })
      });

      const data = await respuesta.json();

      if (respuesta.ok) {
        await mostrarAlerta(data.mensaje || '¡Contraseña actualizada con éxito! Ahora puedes iniciar sesión.');
        setEmail(emailRecuperacion);
        setPassword('');
        volverAlLogin();
      } else {
        setMensajeEstado({
          tipo: 'error',
          texto: data.mensaje || 'No se pudo actualizar la contraseña.'
        });
      }
    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      setMensajeEstado({
        tipo: 'error',
        texto: 'Error de conexión con el servidor.'
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="contact-panel" style={{ width: '100%', maxWidth: '420px', margin: '40px 20px' }}>

        {/* VISTA PRINCIPAL: INICIAR SESIÓN */}
        {modo === 'login' && (
          <>
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

            {/* Opción "¿Has olvidado tu contraseña?" debajo del inicio de sesión */}
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={abrirRecuperacion}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--indigo)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  textDecoration: 'underline'
                }}
              >
                ¿Has olvidado tu contraseña?
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--line)', fontSize: '14px', color: 'var(--ink-soft)' }}>
              ¿No tienes cuenta? <Link to="/registro" style={{ color: 'var(--indigo)', fontWeight: '600', textDecoration: 'none' }}>Regístrate aquí</Link>
            </div>
          </>
        )}

        {/* PASO 1: SOLICITAR CÓDIGO AL CORREO */}
        {modo === 'solicitar' && (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Recuperar Contraseña</h2>
            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--ink-soft)', marginBottom: '22px', lineHeight: '1.5' }}>
              Ingresa el correo asociado a tu cuenta y te enviaremos un código de verificación para restablecer tu clave.
            </p>

            {mensajeEstado.texto && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                marginBottom: '16px',
                fontSize: '13.5px',
                backgroundColor: mensajeEstado.tipo === 'error' ? '#FEE2E2' : '#EEF2FE',
                color: mensajeEstado.tipo === 'error' ? '#B91C1C' : '#4F46E5',
                border: `1px solid ${mensajeEstado.tipo === 'error' ? '#FECACA' : '#C7D2FE'}`
              }}>
                {mensajeEstado.texto}
              </div>
            )}

            <form onSubmit={handleSolicitarCodigo}>
              <div className="cf-group">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  placeholder="tu@correo.com"
                  value={emailRecuperacion}
                  onChange={e => setEmailRecuperacion(e.target.value)}
                  required
                />
              </div>
              <button
                className="cf-submit"
                type="submit"
                disabled={cargando}
                style={{ width: '100%', marginTop: '10px', opacity: cargando ? 0.7 : 1 }}
              >
                {cargando ? 'Enviando código...' : 'Enviar código al correo'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                type="button"
                onClick={volverAlLogin}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink-soft)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          </>
        )}

        {/* PASO 2: PANTALLA DE ESPERA E INGRESO DEL CÓDIGO */}
        {modo === 'verificar' && (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Ingresa tu Código</h2>
            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--ink-soft)', marginBottom: '18px', lineHeight: '1.5' }}>
              Enviamos un código de 6 dígitos a <strong>{emailRecuperacion}</strong>. Revisa tu bandeja de entrada (o spam) e ingrésalo a continuación:
            </p>

            {mensajeEstado.texto && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                marginBottom: '16px',
                fontSize: '13.5px',
                backgroundColor: mensajeEstado.tipo === 'error' ? '#FEE2E2' : '#EEF2FE',
                color: mensajeEstado.tipo === 'error' ? '#B91C1C' : '#4F46E5',
                border: `1px solid ${mensajeEstado.tipo === 'error' ? '#FECACA' : '#C7D2FE'}`
              }}>
                {mensajeEstado.texto}
              </div>
            )}

            <form onSubmit={handleVerificarCodigo}>
              <div className="cf-group">
                <label style={{ textAlign: 'center', display: 'block' }}>Código de verificación</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{
                    textAlign: 'center',
                    fontSize: '22px',
                    fontWeight: '700',
                    letterSpacing: '8px'
                  }}
                  required
                />
              </div>

              <button
                className="cf-submit"
                type="submit"
                disabled={cargando || codigo.length < 6}
                style={{ width: '100%', marginTop: '10px', opacity: (cargando || codigo.length < 6) ? 0.7 : 1 }}
              >
                {cargando ? 'Verificando...' : 'Verificar código'}
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', fontSize: '13.5px' }}>
              <button
                type="button"
                onClick={handleSolicitarCodigo}
                disabled={cargando}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--indigo)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Reenviar código
              </button>

              <button
                type="button"
                onClick={volverAlLogin}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink-soft)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Cancelar
              </button>
            </div>
          </>
        )}

        {/* PASO 3: CAMBIAR CONTRASEÑA */}
        {modo === 'cambiar' && (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Nueva Contraseña</h2>
            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--ink-soft)', marginBottom: '18px', lineHeight: '1.5' }}>
              Código validado para <strong>{emailRecuperacion}</strong>. Crea tu nueva contraseña a continuación:
            </p>

            {mensajeEstado.texto && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                marginBottom: '16px',
                fontSize: '13.5px',
                backgroundColor: mensajeEstado.tipo === 'error' ? '#FEE2E2' : '#DCFCE7',
                color: mensajeEstado.tipo === 'error' ? '#B91C1C' : '#15803D',
                border: `1px solid ${mensajeEstado.tipo === 'error' ? '#FECACA' : '#BBF7D0'}`
              }}>
                {mensajeEstado.texto}
              </div>
            )}

            <form onSubmit={handleCambiarPassword}>
              <div className="cf-group">
                <label>Nueva contraseña</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={nuevaPassword}
                  onChange={e => setNuevaPassword(e.target.value)}
                  required
                />
              </div>

              <div className="cf-group">
                <label>Confirmar nueva contraseña</label>
                <input
                  type="password"
                  placeholder="Repite tu nueva contraseña"
                  value={confirmarPassword}
                  onChange={e => setConfirmarPassword(e.target.value)}
                  required
                />
              </div>

              <button
                className="cf-submit"
                type="submit"
                disabled={cargando}
                style={{ width: '100%', marginTop: '10px', opacity: cargando ? 0.7 : 1 }}
              >
                {cargando ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '18px' }}>
              <button
                type="button"
                onClick={volverAlLogin}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink-soft)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </>
        )}

      </div>
    </main>
  );
}
