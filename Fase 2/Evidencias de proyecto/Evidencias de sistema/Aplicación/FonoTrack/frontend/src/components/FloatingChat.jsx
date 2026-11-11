import { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';

function renderizarTextoFonoBot(texto) {
  if (!texto) return null;
  const partes = String(texto).split(/(\*[^*\n]+\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith('*') && parte.endsWith('*') && parte.length > 2) {
      return <strong key={i}>{parte.slice(1, -1)}</strong>;
    }
    return <span key={i}>{parte}</span>;
  });
}

export default function FloatingChat() {
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [rutVerificado, setRutVerificado] = useState(null);
  const [nombrePacienteActivo, setNombrePacienteActivo] = useState('');
  const inputChatId = useId();
  const navigate = useNavigate();

  const [conversacion, setConversacion] = useState([
    {
      rol: 'ia',
      texto:
        '🤖 *¡Hola! Soy FonoBot, tu asistente virtual de FonoTrack.*\n\n' +
        '*¿En qué te puedo ayudar?*\n' +
        '• 📅 *Próximas sesiones:* Consultar fechas, horarios y especialista.\n' +
        '• 🩺 *Observaciones y tareas:* Revisar las observaciones clínicas y ejercicios indicados.\n' +
        '• 🗣️ *Orientación de especialidad:* Recomendarte a qué fonoaudiólogo/a acudir según tus síntomas.\n\n' +
        '🔒 _Para consultar tus sesiones u observaciones personales, escribe tu *RUT* (ej: 21.570.782-2)._',
      subespecialidad: null
    }
  ]);

  const procesarEnvio = async (textoAEnviar) => {
    const limpio = (textoAEnviar || '').trim();
    if (!limpio) return;

    const historial = [...conversacion, { rol: 'usuario', texto: limpio }];
    setConversacion(historial);
    setMensaje('');
    setCargando(true);

    try {
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: limpio,
          rutVerificado: rutVerificado
        })
      });
      const data = await res.json();

      if (data.rutActivo !== undefined) {
        setRutVerificado(data.rutActivo);
      }
      if (data.nombrePaciente) {
        setNombrePacienteActivo(data.nombrePaciente);
      }

      setConversacion([
        ...historial,
        {
          rol: 'ia',
          texto: data.respuesta || 'No se pudo obtener respuesta en este momento.',
          subespecialidad: data.subespecialidad || null
        }
      ]);
    } catch (error) {
      console.error("Error del chat:", error);
      setConversacion([
        ...historial,
        {
          rol: 'ia',
          texto: 'Ocurrió un error al conectar con el asistente.',
          subespecialidad: null
        }
      ]);
    } finally {
      setCargando(false);
    }
  };

  const enviarMensaje = async (e) => {
    e.preventDefault();
    await procesarEnvio(mensaje);
  };

  const cambiarRutActivo = () => {
    setRutVerificado(null);
    setNombrePacienteActivo('');
    setConversacion(prev => [
      ...prev,
      {
        rol: 'ia',
        texto: '🔒 He cerrado la consulta del RUT anterior. Por favor escribe el nuevo *RUT* que deseas consultar.',
        subespecialidad: null
      }
    ]);
  };

  const irAEspecialistas = (especialidad) => {
    setAbierto(false);
    navigate(`/directorio?especialidad=${encodeURIComponent(especialidad)}`);
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>

      {/* Ventana del Chat */}
      {abierto && (
        <div style={{
          width: 'min(380px, calc(100vw - 32px))', height: 'min(520px, calc(100vh - 110px))', backgroundColor: '#ffffff', borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
          border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '16px'
        }}>
          {/* Cabecera del chat */}
          <div style={{ backgroundColor: '#1a365d', color: 'white', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>FonoBot</h3>
                <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
                  Asistente Clínico y Orientación
                </div>
              </div>
              <button
                type="button"
                aria-label="Cerrar asistente FonoBot"
                onClick={() => setAbierto(false)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}
              >
                ✖
              </button>
            </div>

            {rutVerificado && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.18)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                <span>
                  👤 <strong>{nombrePacienteActivo || 'Paciente'}</strong> ({rutVerificado})
                </span>
                <button
                  type="button"
                  onClick={cambiarRutActivo}
                  style={{ backgroundColor: 'rgba(255,255,255,0.16)', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cambiar RUT
                </button>
              </div>
            )}
          </div>

          <div
            role="log"
            aria-live="polite"
            style={{ flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {conversacion.map((msg, idx) => (
              <div key={idx} style={{ textAlign: msg.rol === 'usuario' ? 'right' : 'left' }}>
                <span style={{
                  backgroundColor: msg.rol === 'usuario' ? '#2563eb' : '#e2e8f0',
                  color: msg.rol === 'usuario' ? 'white' : '#1e293b',
                  padding: '10px 14px', borderRadius: '12px', display: 'inline-block', fontSize: '13.5px', lineHeight: '1.45', maxWidth: '88%',
                  whiteSpace: 'pre-line', textAlign: 'left',
                  borderBottomRightRadius: msg.rol === 'usuario' ? '2px' : '12px',
                  borderBottomLeftRadius: msg.rol === 'ia' ? '2px' : '12px'
                }}>
                  {renderizarTextoFonoBot(msg.texto)}
                </span>
                {msg.rol === 'ia' && msg.subespecialidad && (
                  <div style={{ marginTop: '6px', textAlign: 'left' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1a365d' }}>
                      Especialista recomendado: {msg.subespecialidad}
                    </span>
                    <br />
                    <button
                      type="button"
                      onClick={() => irAEspecialistas(msg.subespecialidad)}
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '4px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      Ver profesionales disponibles
                    </button>
                  </div>
                )}
              </div>
            ))}
            {cargando && <div role="status" style={{ color: '#64748b', fontSize: '13px' }}>Consultando con FonoBot...</div>}
          </div>

          {/* Botones rápidos */}
          <div style={{ display: 'flex', gap: '6px', padding: '8px 12px', backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0', overflowX: 'auto' }}>
            <button
              type="button"
              onClick={() => procesarEnvio('¿Cuándo es mi próxima sesión?')}
              style={chipBtnStyle}
            >
              📅 Próximas sesiones
            </button>
            <button
              type="button"
              onClick={() => procesarEnvio('¿Cuáles son mis observaciones y tareas?')}
              style={chipBtnStyle}
            >
              🩺 Mis observaciones
            </button>
          </div>

          {/* Input de texto */}
          <form onSubmit={enviarMensaje} style={{ display: 'flex', padding: '12px', borderTop: '1px solid #e2e8f0', backgroundColor: 'white', alignItems: 'center' }}>
            <label htmlFor={inputChatId} className="visually-hidden">
              Escribe tu RUT, consulta de sesiones o síntomas
            </label>
            <input
              id={inputChatId}
              name="mensaje"
              type="text"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder={rutVerificado ? "Pregunta por tus sesiones, tareas o síntomas..." : "Escribe tu RUT (ej: 21.570.782-2) o tus síntomas..."}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
            />
            <button type="submit" disabled={cargando} style={{ marginLeft: '8px', padding: '10px 16px', backgroundColor: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              Enviar
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        aria-label={abierto ? "Cerrar chat FonoBot" : "Abrir chat FonoBot"}
        onClick={() => setAbierto(!abierto)}
        style={{
          width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#2563eb',
          color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', float: 'right', transition: 'transform 0.2s'
        }}
      >
        {abierto ? '✖' : '💬'}
      </button>

    </div>
  );
}

const chipBtnStyle = {
  backgroundColor: '#ffffff',
  color: '#1a365d',
  border: '1px solid #cbd5e1',
  borderRadius: '999px',
  padding: '5px 10px',
  fontSize: '11.5px',
  fontWeight: '600',
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};