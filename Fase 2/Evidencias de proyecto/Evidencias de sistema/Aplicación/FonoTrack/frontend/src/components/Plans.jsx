import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Plans() {
  // El estado y la llamada a tu API ahora viven dentro de su propio componente
  const [planes, setPlanes] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/planes')
      .then(respuesta => respuesta.json())
      .then(datos => setPlanes(datos))
      .catch(error => console.error("Error de conexión:", error));
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
    <div className="plans-section">
      <div className="wrap">
        <h2>Todo en un único plan</h2>
        <div className="sub">Agenda gratis como paciente. Los planes son para profesionales.</div>
        
        <div className="plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'stretch' }} >
          {planes.length === 0 ? (
            <p>Cargando planes desde el servidor...</p>
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
                    padding: '28px',
                    backgroundColor: '#ffffff',
                    textAlign: 'left'
                  }}
                >
                  {esAnual && (
                    <span style={{
                      position: 'absolute',
                      top: '14px',
                      right: '20px',
                      backgroundColor: '#1d70b8',
                      color: '#ffffff',
                      padding: '4px 14px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      Recomendado
                    </span>
                  )}

                  <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', color: '#0f172a' }}>
                    {plan.nombre}
                  </h3>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
                    <div className="plan-price" style={{ fontSize: '28px', fontWeight: '800', color: '#4f46e5', margin: 0 }}>
                      ${Number(plan.precio).toLocaleString('es-CL')}{sufijoPeriodo}
                    </div>

                    <button
                      onClick={() => handleContratarPlan(plan)}
                      disabled={procesandoId === plan.id_plan}
                      style={{
                        backgroundColor: '#1d70b8',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 22px',
                        borderRadius: '999px',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      {procesandoId === plan.id_plan ? 'Conectando...' : 'Prueba Ahora'}
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