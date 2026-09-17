import { useState, useEffect } from 'react'

export default function Plans() {
  // El estado y la llamada a tu API ahora viven dentro de su propio componente
  const [planes, setPlanes] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/planes')
      .then(respuesta => respuesta.json())
      .then(datos => setPlanes(datos))
      .catch(error => console.error("Error de conexión:", error));
  }, []);

  return (
    <div className="plans-section">
      <div className="wrap">
        <h2>Todo en un único plan</h2>
        <div className="sub">Agenda gratis como paciente. Los planes son para profesionales.</div>
        
        <div className="plans-grid">
          {planes.length === 0 ? (
            <p>Cargando planes desde el servidor...</p>
          ) : (
            planes.map((plan, index) => (
              <div className="plan-card" key={index}>
                <h3>{plan.nombre || 'Nombre del plan'}</h3>
                <div className="plan-price">${plan.precio || '0'} /mes</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}