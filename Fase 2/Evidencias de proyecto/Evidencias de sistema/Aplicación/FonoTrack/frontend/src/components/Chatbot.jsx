import { useState } from 'react';

export default function ChatTriage() {
  const [mensaje, setMensaje] = useState('');
  const [conversacion, setConversacion] = useState([]);
  const [cargando, setCargando] = useState(false);

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
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', background: 'white', maxWidth: '450px' }}>
      <h3 style={{ marginTop: 0, color: '#1e293b' }}>Orientación Clínica 🩺</h3>
      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
        Describe brevemente el problema o los síntomas que experimentas y nuestro asistente te indicará qué especialista de FonoTrack necesitas.
      </p>
      
      <div style={{ height: '280px', overflowY: 'auto', marginBottom: '16px', padding: '12px', borderRadius: '8px', background: '#f8fafc' }}>
        {conversacion.map((msg, idx) => (
          <div key={idx} style={{ textAlign: msg.rol === 'usuario' ? 'right' : 'left', marginBottom: '12px' }}>
            <span style={{ 
              background: msg.rol === 'usuario' ? '#3b82f6' : '#e2e8f0', 
              color: msg.rol === 'usuario' ? 'white' : '#1e293b',
              padding: '10px 14px', 
              borderRadius: '12px', 
              display: 'inline-block',
              fontSize: '14px',
              maxWidth: '85%'
            }}>
              {msg.texto}
            </span>
          </div>
        ))}
        {cargando && <div style={{ color: '#64748b', fontSize: '13px' }}>Analizando síntomas...</div>}
      </div>

      <form onSubmit={enviarMensaje} style={{ display: 'flex', gap: '8px' }}>
        <input 
          type="text" 
          value={mensaje} 
          onChange={(e) => setMensaje(e.target.value)} 
          placeholder="Ej: A mi hijo le cuesta pronunciar la R..." 
          style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
        />
        <button type="submit" style={{ padding: '12px 20px', background: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
          Consultar
        </button>
      </form>
    </div>
  );
}