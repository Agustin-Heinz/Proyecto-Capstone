import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Plans() {
  // El estado y la llamada a tu API ahora viven dentro de su propio componente
  const [planes, setPlanes] = useState([]);
  const [planPagadoActual, setPlanPagadoActual] = useState(null);
  const [tienePlanActivo, setTienePlanActivo] = useState(() => localStorage.getItem('planActivo') === 'true');

  useEffect(() => {
    fetch('http://localhost:3000/api/planes')
      .then(respuesta => respuesta.json())
      .then(datos => setPlanes(datos))
      .catch(error => console.error("Error de conexión:", error));

    const rol = localStorage.getItem('rol');
    const perfilId = localStorage.getItem('perfilId');
    if (rol === 'fonoaudiologo' && perfilId) {
      fetch(`http://localhost:3000/api/pagos/estado/${perfilId}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          const activo = Boolean(data && data.planActivo);
          localStorage.setItem('planActivo', activo ? 'true' : 'false');
          setTienePlanActivo(activo);
          if (data && data.pago) {
            setPlanPagadoActual(data.pago.id_plan);
          }
        })
        .catch(() => {});
    }

    if (window.location.hash === '#planes') {
      setTimeout(() => {
        const el = document.getElementById('planes');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, []);

  const navigate = useNavigate();
  const [procesandoId, setProcesandoId] = useState(null);

    const handleContratarPlan = async (plan) => {
    const rol = localStorage.getItem('rol');
    const perfilId = localStorage.getItem('perfilId');

    // Si no ha iniciado sesión como fonoaudiólogo, lo llevamos al login
    if (!perfilId || rol !== 'fonoaudiologo') {
      alert("Debes iniciar sesión o registrarte como Fonoaudiólogo para contratar un plan.");
      navigate('/login');
      return;
    }

    // Si ya tiene un plan pagado en la base de datos, no tiene que volver a pagar: lo llevamos directo a su panel
    if (tienePlanActivo) {
      navigate('/panel');
      return;
    }

    setProcesandoId(plan.id_plan);

    try {
      const respuesta = await fetch('http://localhost:3000/api/pagos/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'PLAN',
          id_referencia: plan.id_plan,
          id_fonoaudiologo: perfilId,
          monto: plan.precio,
          returnUrl: 'http://localhost:5173/panel/agenda'
        })
      });

      const data = await respuesta.json();
      if (!respuesta.ok || !data.url || !data.token) {
        throw new Error("No se pudo iniciar Webpay");
      }

      // Redirigimos al portal de Transbank Webpay
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
    } catch (error) {
      console.error("Error al contratar plan:", error);
      alert("Error al conectar con Transbank Webpay.");
      setProcesandoId(null);
    }
  };

  return (
    <div id="planes" className="plans-section">
      <div className="wrap" style={{ maxWidth: '1180px' }}>
        <h2>Todo en un único plan</h2>
        <div className="sub">Agenda gratis como paciente. Los planes son para profesionales.</div>
        
        <div className="plans-grid">
          {planes.length === 0 ? (
            <p style={{ gridColumn: '1 / -1' }}>Cargando planes desde el servidor...</p>
          ) : (
            planes.map((plan) => {
              const esAnual = plan.duracion_dias >= 360 || plan.nombre.toLowerCase().includes('anual');
              const esTrimestral = plan.duracion_dias === 90 || plan.nombre.toLowerCase().includes('3') || plan.nombre.toLowerCase().includes('trimestral');
              const sufijoPeriodo = esAnual ? '/Anual' : esTrimestral ? '/3 meses' : '/mes';

              return (
                <div
                  className="plan-card"
                  key={plan.id_plan}
                  style={{
                    position: 'relative',
                    border: esAnual ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '26px 24px',
                    backgroundColor: '#ffffff',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {esAnual && (
                    <span style={{
                      position: 'absolute',
                      top: '14px',
                      right: '18px',
                      backgroundColor: '#1d70b8',
                      color: '#ffffff',
                      padding: '4px 12px',
                      borderRadius: '999px',
                      fontSize: '11.5px',
                      fontWeight: '700'
                    }}>
                      Recomendado
                    </span>
                  )}

                  <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#0f172a', paddingRight: esAnual ? '105px' : '0' }}>
                    {plan.nombre}
                  </h3>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '10px', flexWrap: 'wrap' }}>
                    <div className="plan-price" style={{ fontSize: '26px', fontWeight: '800', color: '#4f46e5', margin: 0 }}>
                      ${Number(plan.precio).toLocaleString('es-CL')}{sufijoPeriodo}
                    </div>

                    <button
                      onClick={() => handleContratarPlan(plan)}
                      disabled={procesandoId === plan.id_plan}
                      style={{
                        backgroundColor: tienePlanActivo
                          ? (planPagadoActual === plan.id_plan ? '#16a34a' : '#1a365d')
                          : '#1d70b8',
                        color: '#ffffff',
                        border: 'none',
                        padding: '9px 18px',
                        borderRadius: '999px',
                        fontWeight: '700',
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {procesandoId === plan.id_plan
                        ? 'Conectando...'
                        : tienePlanActivo
                        ? (planPagadoActual === plan.id_plan ? '✓ Plan Activo · Ir al Panel' : 'Ir a Mi Panel')
                        : 'Prueba Ahora'}
                    </button>
                  </div>

                  <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.5' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Perfil & Agenda</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <li><span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '8px' }}>✓</span>Perfil profesional personalizado</li>
                      <li><span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '8px' }}>✓</span>Agenda online 24/7: Autogestión de citas donde el paciente puede reservar, visualizar y cancelar sus horas</li>
                      <li><span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '8px' }}>✓</span>Calendario administrativo y gestión centralizada de perfiles de pacientes</li>
                    </ul>

                    <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Ficha Clínica y Pagos</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <li><span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '8px' }}>✓</span>Seguimiento transparente: Portal y envío por correo de observaciones clínicas y actividades</li>
                      <li><span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '8px' }}>✓</span>Gestión de pagos integrada con Webpay Plus y control financiero</li>
                    </ul>

                    <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Negocios (BI)</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <li><span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '8px' }}>✓</span>Dashboard descriptivo: Gráficos dinámicos con flujo de pacientes, asistencias e inasistencias</li>
                      <li><span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '8px' }}>✓</span>Proyección del negocio: Reportes automáticos para calcular ingresos</li>
                    </ul>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}