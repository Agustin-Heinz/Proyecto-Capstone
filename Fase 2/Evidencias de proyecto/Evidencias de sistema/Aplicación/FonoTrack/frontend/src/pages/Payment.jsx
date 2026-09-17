import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { PROFESIONALES } from '../data';

export default function Payment() {
  const { profId, servId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Recibimos los datos acumulados
  const { fecha, hora, contacto } = location.state || {};
  
  const p = PROFESIONALES.find(prof => prof.id === parseInt(profId));
  const s = p?.servicios.find(serv => serv.id === parseInt(servId));

  const [metodo, setMetodo] = useState('debito');
  const [procesando, setProcesando] = useState(false);

  if (!p || !s) return <div style={{padding: '100px', textAlign: 'center'}}>Error cargando datos.</div>;

  const handleSubmit = (e) => {
    e.preventDefault();
    setProcesando(true);
    // Simulamos un retraso de 1 segundo para que parezca que está procesando con el banco
    setTimeout(() => {
      // Al terminar el pago, enviamos todo a la pantalla final de confirmación
      navigate(`/confirmacion/${p.id}/${s.id}`, { state: { fecha, hora, contacto } });
    }, 1000);
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