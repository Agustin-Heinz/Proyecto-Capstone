import { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, Link, useSearchParams } from 'react-router-dom';
import { Check, X } from 'lucide-react';

export default function Confirmation() {
  const { profId, servId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Rescatamos los datos desde location.state o desde el respaldo de Webpay en localStorage
  const respaldoLocal = (() => {
    try {
      return JSON.parse(localStorage.getItem('respaldoCitaPago') || '{}');
    } catch {
      return {};
    }
  })();

  const datosCombinados = location.state || respaldoLocal;
  const {
    fecha,
    hora,
    contacto,
    reservaId: reservaIdState,
    reagendando,
    idCitaAntigua
  } = datosCombinados;

  const paqueteCita = datosCombinados.paqueteCita || respaldoLocal.paqueteCita;
  const [reservaId, setReservaId] = useState(reservaIdState || respaldoLocal.reservaId || null);

  const [p, setP] = useState(datosCombinados.p || null);
  const [s, setS] = useState(datosCombinados.s || null);
  const [cargando, setCargando] = useState(true);
  const [pagoAnulado, setPagoAnulado] = useState(false);

  const procesadoRef = useRef(false);

  useEffect(() => {
    if (procesadoRef.current) return;
    procesadoRef.current = true;

    const cargarYConfirmar = async () => {
      try {
        const tokenWs = searchParams.get('token_ws');
        const tbkTokenAnulado = searchParams.get('TBK_TOKEN') || searchParams.get('TBK_ORDEN_COMPRA');

        sessionStorage.removeItem('pagoWebpayEnCurso');

        // Caso 1: El usuario anuló explícitamente la compra en el portal de Webpay
        if (tbkTokenAnulado && !tokenWs) {
          localStorage.removeItem('citaPendientePagoId');
          localStorage.removeItem('respaldoCitaPago');
          if (reservaId) {
            await fetch('http://localhost:3000/api/pagos/anular', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id_cita: reservaId })
            }).catch(() => {});
          }
          setPagoAnulado(true);
          setCargando(false);
          return;
        }

        // Caso 2: Viene volviendo de Transbank Webpay con token_ws
        if (tokenWs) {
          const citaYaCreadaParaToken = sessionStorage.getItem(`citaCreada_${tokenWs}`);

          if (citaYaCreadaParaToken) {
            setReservaId(citaYaCreadaParaToken);
          } else {
            const resConfirmar = await fetch('http://localhost:3000/api/pagos/confirmar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token_ws: tokenWs })
            });

            let pagoAutorizado = resConfirmar.ok;

            if (!resConfirmar.ok) {
              const errData = await resConfirmar.json().catch(() => ({}));
              // Compatibilidad por si el backend aún no fue reiniciado y tx.commit aprobó con id_referencia = 0
              if (
                resConfirmar.status === 500 &&
                typeof errData.detalle === 'string' &&
                errData.detalle.includes('Record to update not found')
              ) {
                pagoAutorizado = true;
              }
            }

            if (!pagoAutorizado) {
              localStorage.removeItem('citaPendientePagoId');
              localStorage.removeItem('respaldoCitaPago');
              if (reservaId) {
                await fetch('http://localhost:3000/api/pagos/anular', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id_cita: reservaId })
                }).catch(() => {});
              }
              setPagoAnulado(true);
              setCargando(false);
              return;
            }

            // El pago en Webpay fue autorizado -> ahora sí creamos la cita en MySQL
            let idCitaCreada = reservaId;
            if (!idCitaCreada && paqueteCita) {
              const resCrear = await fetch('http://localhost:3000/api/citas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...paqueteCita,
                  estado_pago: 'Pagado'
                })
              });

              if (resCrear.ok) {
                const nuevaCita = await resCrear.json();
                idCitaCreada = nuevaCita.id_citas;
              }
            }

            if (idCitaCreada) {
              await fetch(`http://localhost:3000/api/citas/${idCitaCreada}/pago`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
              }).catch(() => {});

              sessionStorage.setItem(`citaCreada_${tokenWs}`, String(idCitaCreada));
              setReservaId(idCitaCreada);
            }

            if (reagendando && idCitaAntigua) {
              await fetch(`http://localhost:3000/api/citas/${idCitaAntigua}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado_asistencia: 'Anulada' })
              }).catch(() => {});
            }
          }
        }

        localStorage.removeItem('citaPendientePagoId');

        // Buscamos al profesional y servicio en MySQL para armar el comprobante
        const [resProf, resServ] = await Promise.all([
          fetch(`http://localhost:3000/api/fonoaudiologos/${profId}`),
          fetch(`http://localhost:3000/api/servicios?id_fonoaudiologo=${profId}`)
        ]);
        const dataProf = await resProf.json();
        const dataServ = await resServ.json();
        const listaServ = Array.isArray(dataServ) ? dataServ : [];
        const servicioReal = listaServ.find(item => String(item.id_servicios) === String(servId)) || listaServ[0];

        setP(dataProf);
        setS(servicioReal);
        setCargando(false);
      } catch (error) {
        console.error("Error en confirmación:", error);
        setCargando(false);
      }
    };
    cargarYConfirmar();
  }, [profId, servId, searchParams, reservaId, paqueteCita, reagendando, idCitaAntigua]);

  if (cargando) return <div style={{ padding: '100px', textAlign: 'center' }}>Confirmando reserva...</div>;

  if (pagoAnulado) {
    return (
      <main>
        <div className="confirm-wrap">
          <div
            className="confirm-icon"
            style={{ backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }}
          >
            <X size={30} strokeWidth={2.5} />
          </div>
          <h1 style={{ color: '#991b1b' }}>Pago anulado</h1>
          <div className="sub">
            El proceso de pago fue interrumpido o anulado, por lo que tu hora no fue agendada.
          </div>
          <div className="confirm-actions" style={{ marginTop: '24px' }}>
            <Link
              to={`/reserva/${profId}/${servId}`}
              className="btn-primary"
              style={{ textDecoration: 'none', display: 'inline-block' }}
            >
              Volver a elegir hora
            </Link>
            <Link
              to="/"
              className="btn-ghost"
              style={{ textDecoration: 'none', display: 'inline-block' }}
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!p || !s) return <div style={{ padding: '100px', textAlign: 'center' }}>Error cargando la reserva.</div>;

  const codigoMostrado = reservaId || 'FT-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  return (
    <main>
      <div className="confirm-wrap">
        <div className="confirm-icon">
          <Check size={32} strokeWidth={2.5} />
        </div>
        <h1>Su hora ha sido confirmada</h1>
        <div className="sub">Le enviamos el detalle a tu correo. Aquí tienes tu comprobante.</div>

        <div className="receipt">
          <div className="r-row">
            <span className="l">N° de reserva</span>
            <span className="v">{codigoMostrado}</span>
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
          <button className="btn-ghost" onClick={() => window.print()}>Descargar comprobante</button>

          <Link to="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
