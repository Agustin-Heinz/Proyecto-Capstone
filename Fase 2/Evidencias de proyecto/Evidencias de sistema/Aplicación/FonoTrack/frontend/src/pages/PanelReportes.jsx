import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

export default function PanelReportes() {
  const [filtroTiempoAsistencia, setFiltroTiempoAsistencia] = useState('mensual');
  const [filtroTiempoServicios, setFiltroTiempoServicios] = useState('mensual');
  
  const [metricas, setMetricas] = useState({
    asistenciaPromedio: "0%",
    servicioTopNombre: "Cargando...",
    servicioTopPorcentaje: "0%",
    ingresosProyectados: "$0 M",
    ingresos_totales: 0,
    datosPorTiempo: { semanal: [], mensual: [], anual: [] },
    distribucionServicios: { semanal: [], mensual: [], anual: [] }
  });

  const coloresAnillo = ['#1a365d', '#2563eb', '#60a5fa', '#bfdbfe'];

  // Diccionario para cambiar el texto del título dinámicamente
  const etiquetasFiltro = {
    semanal: 'Semana',
    mensual: 'Mes',
    anual: 'Año'
  };

  useEffect(() => {
    const cargarMétricasBI = async () => {
      try {
        const idProfesionalLogueado = localStorage.getItem('perfilId');

        if (!idProfesionalLogueado) {
          console.warn("🔒 Acceso denegado: No se detectó una sesión activa.");
          return; 
        }

        // 🔥 AQUÍ ESTÁ LA LLAVE: Le enviamos el ID en la URL para que el backend sepa quién pregunta
        const respuesta = await fetch(`http://localhost:3000/api/estadisticas?id_fonoaudiologo=${idProfesionalLogueado}`);
        
        if (respuesta.ok) {
          const datosReales = await respuesta.json();
          setMetricas(datosReales);
        } else {
          console.error("No se pudieron obtener las estadísticas de este perfil.");
        }
      } catch (error) {
        console.error("Error al cargar BI:", error);
      }
    };
    
    cargarMétricasBI();
  }, []);

  const datosGraficoBarras = metricas.datosPorTiempo[filtroTiempoAsistencia] || [];
  
  // Extraemos la lista de servicios del periodo exacto que seleccionó el usuario
  const topServicios = metricas.distribucionServicios[filtroTiempoServicios] || [];
  const totalTopServicios = topServicios.reduce((suma, item) => suma + item.cantidad, 0);

  // Calculamos al "Ganador" dinámicamente según el filtro seleccionado
  const servicioGanador = topServicios.length > 0 ? topServicios[0] : null;
  const nombreServicioTop = servicioGanador ? servicioGanador.nombre : "Sin datos";
  const porcentajeServicioTop = servicioGanador && totalTopServicios > 0 
    ? Math.round((servicioGanador.cantidad / totalTopServicios) * 100) 
    : 0;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      
      {/* CABECERA PRIVADA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Análisis Operacional</div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#1a365d' }}>Mis Reportes de Gestión</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div style={cardStyle}>
          <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Asistencia real</div>
          <div style={{ color: '#0f172a', fontSize: '36px', fontWeight: '800', letterSpacing: '-1px' }}>{metricas.asistenciaPromedio}</div>
          <div style={{ fontSize: '13px', color: '#10b981', fontWeight: '600', marginTop: '4px' }}>Basado en citas totales</div>
        </div>
        
        {/* TARJETA ACTUALIZADA: Ahora es 100% dinámica */}
        <div style={cardStyle}>
          <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>
            Servicio más solicitado ({etiquetasFiltro[filtroTiempoServicios]})
          </div>
          <div style={{ color: '#0f172a', fontSize: '24px', fontWeight: '700', marginTop: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {nombreServicioTop}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginTop: '8px' }}>
            {porcentajeServicioTop}% del total del periodo
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Ingresos totales (Pagados)</div>
          <div style={{ color: '#0f172a', fontSize: '36px', fontWeight: '800', letterSpacing: '-1px' }}>${(metricas.ingresos_totales || 0).toLocaleString('es-CL')}</div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginTop: '4px' }}>Flujo real de caja</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* GRÁFICO 1: BARRAS */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', letterSpacing: '1px', textTransform: 'uppercase' }}>Control de Flujo</div>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', color: '#0f172a' }}>Asistencias vs Inasistencias</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
              <button onClick={() => setFiltroTiempoAsistencia('semanal')} style={botonFiltroStyle(filtroTiempoAsistencia === 'semanal')}>Semana</button>
              <button onClick={() => setFiltroTiempoAsistencia('mensual')} style={botonFiltroStyle(filtroTiempoAsistencia === 'mensual')}>Mes</button>
              <button onClick={() => setFiltroTiempoAsistencia('anual')} style={botonFiltroStyle(filtroTiempoAsistencia === 'anual')}>Año</button>
            </div>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={datosGraficoBarras} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="periodo" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500 }} />
                <Bar dataKey="asistencias" name="Asistencias" fill="#1a365d" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="inasistencias" name="Inasistencias" fill="#bfdbfe" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 2: ANILLO */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', letterSpacing: '1px', textTransform: 'uppercase' }}>Demanda e Ingresos</div>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', color: '#0f172a' }}>Servicios más solicitados</h2>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
              <button onClick={() => setFiltroTiempoServicios('semanal')} style={botonFiltroStyle(filtroTiempoServicios === 'semanal')}>Semana</button>
              <button onClick={() => setFiltroTiempoServicios('mensual')} style={botonFiltroStyle(filtroTiempoServicios === 'mensual')}>Mes</button>
              <button onClick={() => setFiltroTiempoServicios('anual')} style={botonFiltroStyle(filtroTiempoServicios === 'anual')}>Año</button>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '220px', height: '220px' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={topServicios} dataKey="cantidad" nameKey="nombre" cx="50%" cy="50%" innerRadius={60} outerRadius={90} stroke="none">
                    {topServicios.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={coloresAnillo[index % coloresAnillo.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} citas`, name]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {topServicios.length === 0 ? (
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>No hay servicios registrados en este periodo.</span>
              ) : (
                topServicios.map((servicio, index) => {
                  const porcentaje = totalTopServicios > 0 
                    ? Math.round((servicio.cantidad / totalTopServicios) * 100) 
                    : 0;

                  return (
                    <LeyendaItem 
                      key={index} 
                      color={coloresAnillo[index % coloresAnillo.length]} 
                      servicio={servicio.nombre} 
                      monto={`${porcentaje}%`} 
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

const cardStyle = { backgroundColor: '#ffffff', padding: '24px 30px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' };

const botonFiltroStyle = (activo) => ({
  backgroundColor: activo ? '#ffffff' : 'transparent', color: activo ? '#0f172a' : '#64748b', border: 'none', padding: '6px 12px',
  borderRadius: '6px', fontSize: '13px', fontWeight: activo ? '600' : '500', cursor: 'pointer',
  boxShadow: activo ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s ease'
});

function LeyendaItem({ color, servicio, monto }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }}></div>
        <div style={{ fontSize: '13px', color: '#475569', fontWeight: '500', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{servicio}</div>
      </div>
      <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: '700' }}>{monto}</div>
    </div>
  );
}