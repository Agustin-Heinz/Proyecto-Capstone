import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function Booking() {
  const { profId, servId } = useParams();
  const navigate = useNavigate();

  // Estados para la base de datos real
  const [p, setP] = useState(null);
  const [s, setS] = useState(null);
  const [disponibilidad, setDisponibilidad] = useState([]); // 🔥 NUEVO: Guardará los horarios reales
  const [cargandoInfo, setCargandoInfo] = useState(true);

  const [fecha, setFecha] = useState(null);
  const [hora, setHora] = useState(null);
  const [horasOcupadas, setHorasOcupadas] = useState([]);

  // ==============================================================
  // 1. CARGA DE DATOS REALES Y DISPONIBILIDAD DESDE MYSQL
  // ==============================================================
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const resFonos = await fetch('http://localhost:3000/api/fonoaudiologos');
        const fonos = await resFonos.json();
        
        const resServs = await fetch(`http://localhost:3000/api/servicios?id_fonoaudiologo=${profId}`);
        const servs = await resServs.json();

        // 🔥 NUEVA PETICIÓN: Traemos solo los horarios asignados a este servicio en particular
        const resDisp = await fetch(`http://localhost:3000/api/disponibilidad?id_fonoaudiologo=${profId}&id_servicio=${servId}`);
        const disp = await resDisp.json();

        const fonoReal = fonos.find(f => f.id_fonoaudiologo === parseInt(profId));
        const servReal = servs.find(srv => srv.id_servicios === parseInt(servId));

        setP(fonoReal);
        setS(servReal);
        setDisponibilidad(disp);
        setCargandoInfo(false);
      } catch (error) {
        console.error("Error al cargar datos desde MySQL:", error);
        setCargandoInfo(false);
      }
    };
    if(profId && servId) cargarDatos();
  }, [profId, servId]);

  // ==============================================================
  // 2. CONSTRUCTOR DINÁMICO DEL CARRUSEL (Basado en MySQL)
  // ==============================================================
  const diasSemana = ['DOM.', 'LUN.', 'MAR.', 'MIÉ.', 'JUE.', 'VIE.', 'SÁB.'];
  const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const mesesCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Extraemos solo los DÍAS ÚNICOS en los que el profesional atiende
  const fechasUnicas = [...new Set(disponibilidad.map(d => {
    return d.dia_semana ? String(d.dia_semana).split('T')[0] : '';
  }))].filter(Boolean).sort(); // Las ordenamos cronológicamente

  // Transformamos esos días al formato visual de la tarjeta
  const listaFechas = fechasUnicas.map(fechaStr => {
    const f = new Date(`${fechaStr}T12:00:00`); // T12 para evitar desfases de zona horaria
    return {
      key: fechaStr,
      dow: diasSemana[f.getDay()],
      num: f.getDate(),
      mesCorto: meses[f.getMonth()],
      mesCompleto: mesesCompletos[f.getMonth()],
      anio: f.getFullYear()
    };
  });

  const [indiceInicio, setIndiceInicio] = useState(0);
  const diasVisibles = 5;

  const avanzarFechas = () => {
    if (indiceInicio + diasVisibles < listaFechas.length) setIndiceInicio(indiceInicio + 1);
  };
  
  const retrocederFechas = () => {
    if (indiceInicio > 0) setIndiceInicio(indiceInicio - 1);
  };

  const fechasMostradas = listaFechas.slice(indiceInicio, indiceInicio + diasVisibles);
  const mesActual = fechasMostradas[0]?.mesCompleto || 'Sin horarios';
  const anioActual = fechasMostradas[0]?.anio || '';

  // ==============================================================
  // 3. CONSTRUCTOR DINÁMICO DE HORAS (Basado en la fecha elegida)
  // ==============================================================
  // Filtramos la disponibilidad para encontrar las horas exactas creadas para el día que el paciente clickeó
  const bloquesDelDia = disponibilidad.filter(d => {
    const dStr = d.dia_semana ? String(d.dia_semana).split('T')[0] : '';
    return dStr === fecha;
  });

  // Extraemos la hora de inicio de cada bloque y las ordenamos
  const horasDisp = bloquesDelDia.map(d => {
    return d.hora_inicio ? String(d.hora_inicio).substring(11, 16) : '';
  }).filter(Boolean).sort();

  // ==============================================================
  // 4. BLOQUEO DE HORAS YA RESERVADAS (MySQL Citas)
  // ==============================================================
  useEffect(() => {
    if (!fecha || !profId) return;

    fetch(`http://localhost:3000/api/citas/ocupadas?fecha=${fecha}&id_fonoaudiologo=${profId}`)
      .then((res) => res.json())
      .then((data) => setHorasOcupadas(data))
      .catch((err) => console.error("Error al obtener horas ocupadas:", err));
  }, [fecha, profId]);


  if (cargandoInfo) return <div style={{padding: '100px', textAlign: 'center'}}>Conectando con la clínica...</div>;
  if (!p || !s) return <div style={{padding: '100px', textAlign: 'center'}}>Servicio no encontrado en la base de datos.</div>;

  return (
    <main>
      <div className="booking-wrap">
        
        {/* Banner Superior conectado a MySQL */}
        <div className="booking-banner">
          <div className="eyebrow2">📅 Agenda de atención</div>
          <h2>{s.nombre_servicio}</h2>
          <div className="note">Atención con {p.nombre_completo}</div>
        </div>
                
        <div className="info-bar">
          <div className="cell"><div className="lbl">Modalidad</div><div className="val">Presencial</div></div>
          <div className="cell"><div className="lbl">Precio</div><div className="val">${s.precio} CLP</div></div>
          <div className="cell"><div className="lbl">Duración</div><div className="val">50 min</div></div>
        </div>

        {/* 1. SECCIÓN DE FECHAS (CARRUSEL REAL) */}
        <div className="step-label">1. ELIGE UNA FECHA</div>
        
        {listaFechas.length === 0 ? (
          <div style={{ padding: '20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px' }}>
            El profesional aún no ha configurado horarios de atención para este servicio.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '0 5px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#1a365d' }}>
                {mesActual} {anioActual}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={retrocederFechas} disabled={indiceInicio === 0} style={{ ...btnNavStyle, opacity: indiceInicio === 0 ? 0.3 : 1 }}>&lt;</button>
                <button onClick={avanzarFechas} disabled={indiceInicio + diasVisibles >= listaFechas.length} style={{ ...btnNavStyle, opacity: indiceInicio + diasVisibles >= listaFechas.length ? 0.3 : 1 }}>&gt;</button>
              </div>
            </div>

            <div className="date-strip-row">
              <div className="date-strip" style={{ display: 'flex', gap: '10px', width: '100%' }}>
                {fechasMostradas.map(f => (
                  <div
                    key={f.key}
                    className={`date-chip ${fecha === f.key ? 'selected' : ''}`}
                    style={{ flex: 1, padding: '12px 5px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: fecha === f.key ? '#edf2f7' : '#ffffff', borderColor: fecha === f.key ? '#3b82f6' : '#e2e8f0' }}
                    onClick={() => { setFecha(f.key); setHora(null); }}
                  >
                    <div className="dow" style={{ fontSize: '11px', fontWeight: 'bold', color: fecha === f.key ? '#1d4ed8' : '#64748b' }}>{f.dow}</div>
                    <div className="num" style={{ fontSize: '18px', fontWeight: 'bold', color: fecha === f.key ? '#1e40af' : '#0f172a', margin: '4px 0' }}>{f.num}</div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{f.mesCorto}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 2. SECCIÓN DE HORARIOS REALES */}
        <div className="step-label" style={{ marginTop: '30px' }}>2. ELIGE UN HORARIO</div>
        <div id="horariosWrap">
          {!fecha ? (
            <div className="no-horarios">Elige una fecha arriba para ver los bloques disponibles.</div>
          ) : horasDisp.length === 0 ? (
            <div className="no-horarios">No hay bloques configurados para este día.</div>
          ) : (
            <div className="horarios-group">
              <div className="horarios-chips">
                {horasDisp.map(h => {
                  const estaOcupada = horasOcupadas.includes(h);

                  return (
                    <div
                      key={h}
                      className={`hora-chip ${hora === h ? 'selected' : ''} ${estaOcupada ? 'disabled' : ''}`}
                      style={{
                        opacity: estaOcupada ? 0.4 : 1,
                        cursor: estaOcupada ? 'not-allowed' : 'pointer',
                        backgroundColor: estaOcupada ? '#e0e0e0' : undefined,
                        textDecoration: estaOcupada ? 'line-through' : 'none',
                        padding: '10px 16px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontWeight: '600',
                        color: estaOcupada ? '#64748b' : '#0f172a'
                      }}
                      onClick={() => {
                        if (!estaOcupada) setHora(h);
                      }}
                    >
                      {h} {estaOcupada ? '(Ocupado)' : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Botón Continuar */}
        <div className="booking-continue-row" style={{ marginTop: '30px' }}>
          <button
            className={`btn-primary ${!hora ? 'btn-disabled' : ''}`}
            disabled={!hora}
            onClick={() => navigate(`/contacto/${p.id_fonoaudiologo}/${s.id_servicios}`, { state: { fecha, hora } })}
            style={{ padding: '12px 24px', backgroundColor: !hora ? '#cbd5e1' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: !hora ? 'not-allowed' : 'pointer' }}
          >
            Continuar →
          </button>
        </div>
      </div>
    </main>
  );
}

// Estilo auxiliar para los botones de las flechitas
const btnNavStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  color: '#1a365d',
  width: '32px',
  height: '32px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '16px'
};