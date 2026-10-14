import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

export default function Payment() {
  const { profId, servId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // 1. AHORA RECIBIMOS EL reservaId QUE VIENE DESDE EL MODAL
  const { fecha, hora, contacto, reservaId } = location.state || {};

  const [profesional, setProfesional] = useState(null);
  const [servicio, setServicio] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [metodo, setMetodo] = useState('debito');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const resProf = await fetch(`http://localhost:3000/api/fonoaudiologos/${profId}`);
        const dataProf = await resProf.json();

        const resServ = await fetch(`http://localhost:3000/api/servicios?id_fonoaudiologo=${profId}`);
        const dataServ = await resServ.json();
        const servicioReal = dataServ.find(s => String(s.id_servicios) === String(servId)) || dataServ[0];

        setProfesional(dataProf);
        setServicio(servicioReal);
        setCargando(false);
      } catch (error) {
        console.error("Error cargando datos de pago:", error);
        setCargando(false);
      }
    };
    cargarDatos();
  }, [profId, servId]);

  if (cargando) return <div style={{padding: '100px', textAlign: 'center'}}>Cargando pago...</div>;
  if (!profesional || !servicio) return <div style={{padding: '100px', textAlign: 'center'}}>Error cargando datos.</div>;

  // Función actualizada ahora haciendo un put en vez de un post
  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcesando(true);

    try {
      // 1. Guardamos los datos en localStorage para no perderlos al salir hacia Webpay
      localStorage.setItem('respaldoCitaPago', JSON.stringify({
        fecha, hora, contacto, reservaId,
        profId: profesional.id_fonoaudiologo,
        servId: servicio.id_servicios
      }));

      // 2. Si eligió Débito o Crédito -> Vamos a Transbank Webpay Plus
      if (metodo !== 'transferencia') {
        const urlRetorno = `http://localhost:5173/confirmacion/${profesional.id_fonoaudiologo}/${servicio.id_servicios}`;

        const respuesta = await fetch('http://localhost:3000/api/pagos/iniciar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'CITA',
            id_referencia: reservaId,
            monto: servicio.precio,
            returnUrl: urlRetorno
          })
        });

        const data = await respuesta.json();
        if (!respuesta.ok || !data.url || !data.token) {
          throw new Error("Error al conectar con Transbank");
        }

        // Formulario invisible que redirige a Webpay con el token_ws
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.url;

        const inputToken = document.createElement('input');
        inputToken.type = 'hidden';
        inputToken.name = 'token_ws';
        inputToken.value = data.token;

        form.appendChild(inputToken);
        document.body.appendChild(form);
        form.submit();
        return;
      }

      // 3. Si eligió Transferencia -> Marca pagado directo (ideal para tus testeos rápidos)
      if (reservaId) {
        const respuesta = await fetch(`http://localhost:3000/api/citas/${reservaId}/pago`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!respuesta.ok) throw new Error("Error al actualizar la cita en MySQL");
      }

      navigate(`/confirmacion/${profesional.id_fonoaudiologo}/${servicio.id_servicios}`, {
        state: { fecha, hora, contacto, reservaId }
      });

    } catch (error) {
      console.error("Error procesando reserva:", error);
      alert("Hubo un problema procesando tu pago. Revisa la consola.");
      setProcesando(false);
    }
  };

  return (
    <main>
      <div className="pay-wrap">
        <div className="pay-card">
          <div className="pay-head">
            <div><div className="lbl">Estás pagando en</div><div style={{fontWeight: 700}}>FonoTrack</div></div>
            <div style={{textAlign: 'right'}}><div className="lbl">Monto a pagar</div><div className="amount">${servicio.precio} CLP</div></div>
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
              <div className="transfer-note show" style={{ marginBottom: '18px' }}>
                Serás redirigido al portal seguro de <strong>Transbank Webpay Plus</strong> para ingresar los datos de tu tarjeta de {metodo === 'debito' ? 'Débito (Redcompra)' : 'Crédito'}.
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