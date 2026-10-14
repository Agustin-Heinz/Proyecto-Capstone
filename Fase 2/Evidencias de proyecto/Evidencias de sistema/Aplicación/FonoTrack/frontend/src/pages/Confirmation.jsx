import { useState, useEffect } from 'react';
import { useLocation, useParams, Link, useSearchParams } from 'react-router-dom';


export default function Confirmation() {
  const { profId, servId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Rescatamos los datos desde location.state o desde el respaldo de Webpay en localStorage
  const respaldoLocal = JSON.parse(localStorage.getItem('respaldoCitaPago') || '{}');
  const { fecha, hora, contacto, reservaId: reservaIdState } = location.state || respaldoLocal;

  // Generamos un código de reserva aleatorio tipo alfanúmerico
  const reservaId = reservaIdState || 'FT-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  const [p, setP] = useState(null);
  const [s, setS] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarYConfirmar = async () => {
      try {
        // Si viene volviendo de Transbank Webpay con los token_ws, confirmamos el pago en MySQL
        const tokenWs = searchParams.get('token_ws');
        if (tokenWs) {
          await fetch('http://localhost:3000/api/pagos/confirmar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token_ws: tokenWs })
          });
        }

        // Buscamos al profesional y servicio en MySQL para armar el comprobante
        const resProf = await fetch(`http://localhost:3000/api/fonoaudiologos/${profId}`);
        const dataProf = await resProf.json();

        const resServ = await fetch(`http://localhost:3000/api/servicios?id_fonoaudiologo=${profId}`);
        const dataServ = await resServ.json();
        const servicioReal = dataServ.find(item => String(item.id_servicios) === String(servId)) || dataServ[0];

        setP(dataProf);
        setS(servicioReal);
        setCargando(false);
      } catch (error) {
        console.error("Error en confirmación:", error);
        setCargando(false);
      }
    };
    cargarYConfirmar();
  }, [profId, servId, searchParams]);

  if (cargando) return <div style={{padding: '100px', textAlign: 'center'}}>Confirmando reserva...</div>;
  if (!p || !s) return <div style={{padding: '100px', textAlign: 'center'}}>Error cargando la reserva.</div>;
  return (
    <main>
      <div className="confirm-wrap">
        <div className="confirm-icon">✓</div>
        <h1>Su hora ha sido confirmada</h1>
        <div className="sub">Le enviamos el detalle a tu correo. Aquí tienes tu comprobante.</div>
        
        <div className="receipt">
          <div className="r-row">
            <span className="l">N° de reserva</span>
            <span className="v">{reservaId}</span>
          </div>
          <div className="r-row">
            <span className="l">Profesional</span>
            <span className="v">{s.nombre_completo || p.nombre_completo}</span>
          </div>
          <div className="r-row">
            <span className="l">Servicio</span>
            <span className="v">{s.nombre_servicio}</span>
          </div>
          <div className="r-row">
            <span className="l">Fecha y hora</span>
            <span className="v">{fecha} — {hora}</span>
          </div>
          <div className="r-row">
            <span className="l">Modalidad</span>
            <span className="v">Presencial</span>
          </div>
          <div className="r-row">
            <span className="l">Monto pagado</span>
            <span className="v">${s.precio} CLP</span>
          </div>
          <div className="r-row">
            <span className="l">Paciente</span>
            <span className="v">{contacto?.nombre_completo || contacto?.nombre || localStorage.getItem('nombre') || 'Paciente'}</span>
          </div>
        </div>
        
        <div className="confirm-actions">
          {/* El botón para imprimir usa la función nativa del navegador */}
          <button className="btn-ghost" onClick={() => window.print()}>Descargar comprobante</button>
          
          {/* Volvemos al inicio reseteando el proceso */}
          <Link to="/" className="btn-primary" style={{textDecoration: 'none', display: 'inline-block'}}>
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}