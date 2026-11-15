import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, Zap, X } from 'lucide-react';

export default function Payment() {
  const { profId, servId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const respaldoLocal = (() => {
    try {
      return JSON.parse(localStorage.getItem('respaldoCitaPago') || '{}');
    } catch {
      return {};
    }
  })();

  const datosCombinados = location.state || respaldoLocal || {};
  const {
    fecha,
    hora,
    contacto,
    reservaId,
    paqueteCita,
    p: pInicial,
    s: sInicial,
    reagendando,
    idCitaAntigua
  } = datosCombinados;

  const [profesional, setProfesional] = useState(pInicial || null);
  const [servicio, setServicio] = useState(sInicial || null);
  const [cargando, setCargando] = useState(!(pInicial && sInicial));

  const [metodo, setMetodo] = useState('debito');
  const [procesando, setProcesando] = useState(false);
  const [pagoAnulado, setPagoAnulado] = useState(false);

  const montadoRef = useRef(true);
  const abortControllerRef = useRef(null);
  const pagoCompletadoRef = useRef(false);
  const redirigiendoWebpayRef = useRef(false);

  const ejecutarAnulacionPorInterrupcion = useCallback(async (idCitaObjetivo) => {
    const idCandidato = idCitaObjetivo || reservaId || localStorage.getItem('citaPendientePagoId');
    localStorage.removeItem('citaPendientePagoId');
    localStorage.removeItem('respaldoCitaPago');
    sessionStorage.removeItem('pagoWebpayEnCurso');

    const idNumerico = Number(idCandidato);
    if (!idNumerico || isNaN(idNumerico) || idNumerico <= 0) return;

    try {
      await fetch('http://localhost:3000/api/pagos/anular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_cita: idNumerico }),
        keepalive: true
      });
    } catch (e) {
      // Ignorar errores de red al salir
    }
  }, [reservaId]);

  // Detectar si el usuario retrocedió antes o durante la redirección a Webpay
  useEffect(() => {
    montadoRef.current = true;
    if (window.__fonoTrackPagoCleanupTimer) {
      clearTimeout(window.__fonoTrackPagoCleanupTimer);
      window.__fonoTrackPagoCleanupTimer = null;
    }

    const webpayPendiente = sessionStorage.getItem('pagoWebpayEnCurso');
    if (webpayPendiente) {
      redirigiendoWebpayRef.current = false;
      setProcesando(false);
      setCargando(false);
      setPagoAnulado(true);
      ejecutarAnulacionPorInterrupcion(reservaId);
    } else if (reservaId) {
      localStorage.setItem('citaPendientePagoId', String(reservaId));
    }

    const manejarRetornoAtras = () => {
      if (sessionStorage.getItem('pagoWebpayEnCurso') || redirigiendoWebpayRef.current) {
        abortControllerRef.current?.abort();
        redirigiendoWebpayRef.current = false;
        setProcesando(false);
        setCargando(false);
        setPagoAnulado(true);
        ejecutarAnulacionPorInterrupcion(reservaId);
      }
    };

    const manejarPageShow = (event) => {
      if (event.persisted || sessionStorage.getItem('pagoWebpayEnCurso')) {
        manejarRetornoAtras();
      }
    };

    const manejarBeforeUnload = () => {
      // Si cierra la pestaña sin haber completado el pago ni estar redirigiendo legítimamente a Webpay
      if (!pagoCompletadoRef.current && !redirigiendoWebpayRef.current) {
        ejecutarAnulacionPorInterrupcion(reservaId);
      }
    };

    window.addEventListener('pageshow', manejarPageShow);
    window.addEventListener('popstate', manejarRetornoAtras);
    window.addEventListener('beforeunload', manejarBeforeUnload);

    return () => {
      montadoRef.current = false;
      abortControllerRef.current?.abort();
      window.removeEventListener('pageshow', manejarPageShow);
      window.removeEventListener('popstate', manejarRetornoAtras);
      window.removeEventListener('beforeunload', manejarBeforeUnload);

      // Si el usuario retrocedió de página o salió de /pago sin completar el pago
      window.__fonoTrackPagoCleanupTimer = setTimeout(() => {
        const rutaActual = window.location.pathname;
        if (
          !pagoCompletadoRef.current &&
          !redirigiendoWebpayRef.current &&
          !rutaActual.startsWith('/pago/') &&
          !rutaActual.startsWith('/confirmacion/')
        ) {
          sessionStorage.setItem('avisoPagoAnulado', 'true');
          ejecutarAnulacionPorInterrupcion(reservaId);
        }
      }, 100);
    };
  }, [reservaId, ejecutarAnulacionPorInterrupcion]);

  useEffect(() => {
    let cancelado = false;
    const controller = new AbortController();

    const cargarDatos = async () => {
      try {
        const [resProf, resServ] = await Promise.all([
          fetch(`http://localhost:3000/api/fonoaudiologos/${profId}`, { signal: controller.signal }),
          fetch(`http://localhost:3000/api/servicios?id_fonoaudiologo=${profId}`, { signal: controller.signal })
        ]);

        if (cancelado) return;

        const dataProf = await resProf.json();
        const dataServ = await resServ.json();
        const listaServ = Array.isArray(dataServ) ? dataServ : [];
        const servicioReal = listaServ.find(s => String(s.id_servicios) === String(servId)) || listaServ[0];

        if (!cancelado) {
          setProfesional(dataProf);
          setServicio(servicioReal);
          setCargando(false);
        }
      } catch (error) {
        if (!cancelado && error.name !== 'AbortError') {
          console.error("Error cargando datos de pago:", error);
          setCargando(false);
        }
      }
    };

    cargarDatos();
    return () => {
      cancelado = true;
      controller.abort();
    };
  }, [profId, servId]);

  const handleCancelarPagoManual = async () => {
    abortControllerRef.current?.abort();
    redirigiendoWebpayRef.current = false;
    setProcesando(false);
    await ejecutarAnulacionPorInterrupcion(reservaId);
    sessionStorage.setItem('avisoPagoAnulado', 'true');
    navigate(`/reserva/${profId}/${servId}`);
  };

  if (pagoAnulado) {
    return (
      <main>
        <div className="pay-wrap">
          <div className="pay-card" style={{ textAlign: 'center', padding: '36px 28px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <X size={28} strokeWidth={2.5} />
            </div>
            <h2 style={{ margin: '0 0 10px 0', color: '#991b1b', fontSize: '22px', fontWeight: '800' }}>
              Pago anulado
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#475569', fontSize: '15px', lineHeight: '1.5' }}>
              El proceso de pago fue interrumpido antes de completarse, por lo que el pago ha sido anulado y la hora no quedó agendada.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="pay-btn"
                onClick={() => navigate(`/reserva/${profId}/${servId}`)}
              >
                Volver a elegir horario
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (cargando) return <div style={{ padding: '100px', textAlign: 'center' }}>Cargando pago...</div>;
  if (!profesional || !servicio) return <div style={{ padding: '100px', textAlign: 'center' }}>Error cargando datos.</div>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (procesando) return;
    setProcesando(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 1. Guardamos los datos en localStorage para usarlos al regresar de Webpay
      localStorage.setItem('respaldoCitaPago', JSON.stringify({
        fecha,
        hora,
        contacto,
        reservaId,
        paqueteCita,
        profId: profesional.id_fonoaudiologo,
        servId: servicio.id_servicios,
        p: profesional,
        s: servicio,
        reagendando,
        idCitaAntigua
      }));

      // 2. Si eligió Débito o Crédito -> Vamos a Transbank Webpay Plus (sin agendar la cita aún)
      if (metodo !== 'automatico') {
        const urlRetorno = `http://localhost:5173/confirmacion/${profesional.id_fonoaudiologo}/${servicio.id_servicios}`;
        sessionStorage.setItem('pagoWebpayEnCurso', 'true');

        const respuesta = await fetch('http://localhost:3000/api/pagos/iniciar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            tipo: 'CITA',
            id_referencia: reservaId || 0,
            monto: servicio.precio,
            returnUrl: urlRetorno
          })
        });

        // Si el usuario retrocedió mientras se iniciaba la transacción, abortamos y anulamos
        if (!montadoRef.current || controller.signal.aborted) {
          await ejecutarAnulacionPorInterrupcion(reservaId);
          return;
        }

        const data = await respuesta.json();
        if (!respuesta.ok || !data.url || !data.token) {
          throw new Error("Error al conectar con Transbank");
        }

        if (!montadoRef.current || controller.signal.aborted) {
          await ejecutarAnulacionPorInterrupcion(reservaId);
          return;
        }

        redirigiendoWebpayRef.current = true;

        // Formulario invisible que redirige a Webpay con el token_ws
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.url;
        form.style.display = 'none';

        const inputToken = document.createElement('input');
        inputToken.type = 'hidden';
        inputToken.name = 'token_ws';
        inputToken.value = data.token;

        form.appendChild(inputToken);
        document.body.appendChild(form);
        form.submit();
        return;
      }

      // 3. Si eligió Pago automático -> Agendamos la cita y marcamos pagado en este momento
      let idCitaFinal = reservaId;

      if (!idCitaFinal && paqueteCita) {
        const resCrear = await fetch('http://localhost:3000/api/citas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            ...paqueteCita,
            estado_pago: 'Pagado'
          })
        });
        if (!resCrear.ok) throw new Error("Error al crear la cita en MySQL");
        const nuevaCita = await resCrear.json();
        idCitaFinal = nuevaCita.id_citas;
      }

      if (idCitaFinal) {
        const respuesta = await fetch(`http://localhost:3000/api/citas/${idCitaFinal}/pago`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        if (!respuesta.ok) throw new Error("Error al actualizar el pago de la cita en MySQL");
      }

      if (reagendando && idCitaAntigua) {
        await fetch(`http://localhost:3000/api/citas/${idCitaAntigua}/estado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado_asistencia: 'Anulada' })
        });
      }

      pagoCompletadoRef.current = true;
      localStorage.removeItem('citaPendientePagoId');
      sessionStorage.removeItem('pagoWebpayEnCurso');

      localStorage.setItem('respaldoCitaPago', JSON.stringify({
        fecha,
        hora,
        contacto,
        reservaId: idCitaFinal,
        profId: profesional.id_fonoaudiologo,
        servId: servicio.id_servicios,
        p: profesional,
        s: servicio,
        reagendando,
        idCitaAntigua,
        citaYaCreada: true
      }));

      navigate(`/confirmacion/${profesional.id_fonoaudiologo}/${servicio.id_servicios}`, {
        state: { fecha, hora, contacto, reservaId: idCitaFinal, citaYaCreada: true }
      });

    } catch (error) {
      if (error.name === 'AbortError') {
        await ejecutarAnulacionPorInterrupcion(reservaId);
        return;
      }
      console.error("Error procesando reserva:", error);
      redirigiendoWebpayRef.current = false;
      sessionStorage.removeItem('pagoWebpayEnCurso');
      alert("Hubo un problema procesando tu pago. El intento de pago fue anulado.");
      await ejecutarAnulacionPorInterrupcion(reservaId);
      setProcesando(false);
      setPagoAnulado(true);
    }
  };

  return (
    <main>
      <div className="pay-wrap">
        <div className="pay-card">
          <div className="pay-head">
            <div><div className="lbl">Estás pagando en</div><div style={{ fontWeight: 700 }}>FonoTrack</div></div>
            <div style={{ textAlign: 'right' }}><div className="lbl">Monto a pagar</div><div className="amount">${servicio.precio} CLP</div></div>
          </div>

          <div className="method-row">
            <div className={`method-chip ${metodo === 'debito' ? 'selected' : ''}`} onClick={() => !procesando && setMetodo('debito')}>
              <div className="ico" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Wallet size={22} strokeWidth={2} />
              </div>
              Débito
            </div>
            <div className={`method-chip ${metodo === 'credito' ? 'selected' : ''}`} onClick={() => !procesando && setMetodo('credito')}>
              <div className="ico" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <CreditCard size={22} strokeWidth={2} />
              </div>
              Crédito
            </div>
            <div className={`method-chip ${metodo === 'automatico' ? 'selected' : ''}`} onClick={() => !procesando && setMetodo('automatico')}>
              <div className="ico" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Zap size={22} strokeWidth={2} />
              </div>
              Pago automático
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {metodo !== 'automatico' ? (
              <div className="transfer-note show" style={{ marginBottom: '18px' }}>
                Serás redirigido al portal seguro de <strong>Transbank Webpay Plus</strong> para ingresar los datos de tu tarjeta de {metodo === 'debito' ? 'Débito (Redcompra)' : 'Crédito'}.
              </div>
            ) : (
              <div className="transfer-note show" style={{ marginBottom: '18px' }}>
                Un botón para agilizar las pruebas de tomar horas, será removido
              </div>
            )}

            <button className="pay-btn" type="submit" disabled={procesando}>
              {procesando ? 'Procesando pago...' : 'Pagar ahora'}
            </button>
            <button
              type="button"
              onClick={handleCancelarPagoManual}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '11px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                backgroundColor: 'transparent',
                color: '#64748b',
                fontWeight: '600',
                fontSize: '13.5px',
                cursor: 'pointer'
              }}
            >
              Cancelar y anular pago
            </button>
            <div className="pay-disclaimer">Pago simulado con fines de demostración.</div>
          </form>
        </div>
      </div>
    </main>
  );
}
