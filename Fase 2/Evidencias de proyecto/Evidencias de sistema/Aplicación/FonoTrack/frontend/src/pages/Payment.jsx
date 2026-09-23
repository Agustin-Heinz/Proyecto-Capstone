import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { PROFESIONALES } from '../data';

export default function Payment() {
  const { profId, servId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Recibimos los datos acumulados, incluyendo el pacienteId que generó el Contacto
  const { fecha, hora, contacto, pacienteId } = location.state || {};
  
  const p = PROFESIONALES.find(prof => prof.id === parseInt(profId));
  const s = p?.servicios.find(serv => serv.id === parseInt(servId));

  const [metodo, setMetodo] = useState('debito');
  const [procesando, setProcesando] = useState(false);

  if (!p || !s) return <div style={{padding: '100px', textAlign: 'center'}}>Error cargando datos.</div>;

  // 2. Nueva función para guardar en MySQL
  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcesando(true);

    try {
      // Hacemos la petición a tu backend para crear la cita
      const respuesta = await fetch('http://localhost:3000/api/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_paciente: pacienteId,
          id_fonoaudiologo: p.id,
          id_servicio: s.id,
          fecha: fecha,
          hora_inicio: hora,
          duracion_minutos: s.duracion,
          precio: s.precio
        })
      });

      if (!respuesta.ok) {
        throw new Error("Error al guardar la cita en la base de datos");
      }

      const nuevaCita = await respuesta.json();

      // Si todo sale bien, simulamos el retraso del banco y avanzamos
      setTimeout(() => {
        navigate(`/confirmacion/${p.id}/${s.id}`, { 
          // Pasamos el id real generado por MySQL a la confirmación
          state: { fecha, hora, contacto, reservaId: nuevaCita.id_citas } 
        });
      }, 1000);

    } catch (error) {
      console.error("Error procesando reserva:", error);
      alert("Hubo un problema al agendar tu hora. Revisa la consola.");
      setProcesando(false);
    }
  };

  return (
    <main>
      <div className="pay-wrap">
        <div className="pay-card">
          <div className="pay-head">
            <div><div className="lbl">Estás pagando en</div><div style={{fontWeight: 700}}>FonoTrack</div></div>
            <div style={{textAlign: 'right'}}><div className="lbl">Monto a pagar</div><div className="amount">${s.precio} CLP</div></div>
          </div>

          <div className="method-row">
            <div className={`method-chip ${metodo === 'debito' ? 'selected' : ''}`} onClick={() => setMetodo('debito')}>
              <div className="ico">💳</div>Débito
            </div>
            <div className={`method-chip ${metodo === 'credito' ? 'selected' : ''}`} onClick={() => setMetodo('credito')}>
              <div className="ico">💳</div>Crédito
            </div>
            <div className={`method-chip ${metodo === 'transferencia' ? 'selected' : ''}`} onClick={() => setMetodo('transferencia')}>
              <div className="ico">🏦</div>Transferencia
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {metodo !== 'transferencia' ? (
              <div className="card-fields show">
                <div className="pg">
                  <label>Número de tarjeta</label>
                  <input type="text" placeholder="0000 0000 0000 0000" required />
                </div>
                <div className="pg-row">
                  <div className="pg">
                    <label>Vencimiento</label>
                    <input type="text" placeholder="MM/AA" required />
                  </div>
                  <div className="pg">
                    <label>CVV</label>
                    <input type="text" placeholder="123" required />
                  </div>
                </div>
                <div className="pg">
                  <label>Nombre del titular</label>
                  <input type="text" placeholder="Como aparece en la tarjeta" required />
                </div>
              </div>
            ) : (
              <div className="transfer-note show" style={{ marginBottom: '18px' }}>
                Realiza la transferencia a <strong>FonoTrack SpA</strong> · Cuenta Vista 00-123456-09 · Banco Estado · RUT 77.111.222-3, y confirma para reservar tu hora.
              </div>
            )}

            <button className="pay-btn" type="submit" disabled={procesando}>
              {procesando ? 'Procesando pago...' : 'Pagar ahora'}
            </button>
            <div className="pay-disclaimer">Pago simulado con fines de demostración.</div>
          </form>
        </div>
      </div>
    </main>
  );
}