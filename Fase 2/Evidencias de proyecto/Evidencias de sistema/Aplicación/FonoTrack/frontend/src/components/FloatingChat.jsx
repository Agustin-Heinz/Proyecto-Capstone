import { useState } from 'react';

export default function FloatingChat() {
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  
  const [conversacion, setConversacion] = useState([
    { rol: 'ia', texto: '¡Hola! Describe brevemente tus síntomas o el problema que presentas y te indicaré qué especialista necesitas.' }
  ]);

  const enviarMensaje = async (e) => {
    e.preventDefault();
    if (!mensaje.trim()) return;

    const historial = [...conversacion, { rol: 'usuario', texto: mensaje }];
    setConversacion(historial);
    setMensaje('');
    setCargando(true);

    try {
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: mensaje })
      });
      const data = await res.json();

      setConversacion([...historial, { rol: 'ia', texto: data.respuesta }]);
    } catch (error) {
      console.error("Error del chat:", error);
      setConversacion([...historial, { rol: 'ia', texto: 'Ocurrió un error al conectar con el asistente.' }]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
      
      {/* Ventana del Chat  */}
      {abierto && (
        <div style={{ 
          width: '350px', height: '450px', backgroundColor: '#ffffff', borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
          border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '16px'
        }}>
          {/* Cabecera del chat */}
          <div style={{ backgroundColor: '#1a365d', color: 'white', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Orientación Clínica 🩺</h3>
            <button onClick={() => setAbierto(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}>✖</button>
          </div>

          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {conversacion.map((msg, idx) => (
              <div key={idx} style={{ textAlign: msg.rol === 'usuario' ? 'right' : 'left' }}>
                <span style={{ 
                  backgroundColor: msg.rol === 'usuario' ? '#2563eb' : '#e2e8f0', 
                  color: msg.rol === 'usuario' ? 'white' : '#1e293b',
                  padding: '10px 14px', borderRadius: '12px', display: 'inline-block', fontSize: '14px', maxWidth: '85%',
                  borderBottomRightRadius: msg.rol === 'usuario' ? '2px' : '12px',
                  borderBottomLeftRadius: msg.rol === 'ia' ? '2px' : '12px'
                }}>
                  {msg.texto}
                </span>
              </div>
            ))}
            {cargando && <div style={{ color: '#64748b', fontSize: '13px' }}>Analizando síntomas...</div>}
          </div>

          {/* Input de texto */}
          <form onSubmit={enviarMensaje} style={{ display: 'flex', padding: '12px', borderTop: '1px solid #e2e8f0', backgroundColor: 'white' }}>
            <input 
              type="text" 
              value={mensaje} 
              onChange={(e) => setMensaje(e.target.value)} 
              placeholder="Ej: A mi hijo le cuesta pronunciar la R..." 
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
            <button type="submit" style={{ marginLeft: '8px', padding: '10px 16px', backgroundColor: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              Enviar
            </button>
          </form>
        </div>
      )}

      <button 
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