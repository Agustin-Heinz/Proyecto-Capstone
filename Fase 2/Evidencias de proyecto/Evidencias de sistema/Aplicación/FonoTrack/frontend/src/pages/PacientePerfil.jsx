import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Calendar, Clock,
   MapPin, FileText, X, RefreshCw, Trash2, ClipboardList, LayoutGrid, Stethoscope, ArrowLeft, BookOpen
} from 'lucide-react';

export default function PacientePerfil() {
  const navigate = useNavigate();

  // Navegación principal de 3 vistas: 'inicio', 'citas', 'fichas'
  const [vistaActiva, setVistaActiva] = useState('inicio');
  // Selector de pastillas en la vista Citas: 'agendadas', 'atendidas', 'anuladas'
  const [filtroCitas, setFiltroCitas] = useState('agendadas');

  // Desplegables de la vista Inicio
  const [abiertoCitas, setAbiertoCitas] = useState(true);
  const [abiertoFichas, setAbiertoFichas] = useState(true);

  // Datos desde el backend
  const [nombrePaciente, setNombrePaciente] = useState('Paciente');
  const [citas, setCitas] = useState([]);
  const [fichas, setFichas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Cita seleccionada (modal en vista Citas) y Ficha seleccionada (vista detallada en Mis Fichas)
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [fichaSeleccionada, setFichaSeleccionada] = useState(null);

  // Estados locales para confirmaciones y anulaciones del paciente
  const [estadosLocales, setEstadosLocales] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('estadosCitasPaciente')) || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const nombreLocal = localStorage.getItem('nombre');
    if (nombreLocal) setNombrePaciente(nombreLocal);

    let idPaciente = parseInt(localStorage.getItem('perfilId'));
    if (!idPaciente || isNaN(idPaciente)) {
      try {
        const usuarioGuardado = JSON.parse(localStorage.getItem('usuario'));
        if (usuarioGuardado?.perfilId) idPaciente = parseInt(usuarioGuardado.perfilId);
      } catch (e) {
        // Ignorar error de lectura
      }
    }
    if (!idPaciente || isNaN(idPaciente)) idPaciente = 1;

    const cargarPortal = async () => {
      try {
        const [resPac, resCitas, resFichas, resFonos] = await Promise.all([
          fetch(`http://localhost:3000/api/pacientes/${idPaciente}`),
          fetch('http://localhost:3000/api/citas'),
          fetch(`http://localhost:3000/api/fichas/${idPaciente}`),
          fetch('http://localhost:3000/api/fonoaudiologos')
        ]);

        if (resPac.ok) {
          const pacData = await resPac.json();
          if (pacData?.nombre_completo) {
            setNombrePaciente(pacData.nombre_completo);
          }
        }

        const todasCitas = await resCitas.json();
        const datosFichas = await resFichas.json();
        const listaFonos = await resFonos.json();

        const citasSeguras = Array.isArray(todasCitas) ? todasCitas : [];
        const fichasSeguras = Array.isArray(datosFichas) ? datosFichas : [];
        const fonosSeguros = Array.isArray(listaFonos) ? listaFonos : [];

        // Filtrar citas del paciente y cruzar con datos del fonoaudiólogo
        const misCitas = citasSeguras
          .filter(c => c.id_paciente === idPaciente)
          .map(c => {
            const fono = fonosSeguros.find(f => f.id_fonoaudiologo === c.id_fonoaudiologo);
            return {
              ...c,
              nombre_fono: fono ? fono.nombre_completo : 'Fonoaudiólogo Especialista',
              foto_fono: fono?.foto_perfil || null,
              direccion_fono: fono?.comuna ? `Consulta en ${fono.comuna}, Santiago` : 'Consulta Presencial, Santiago',
              especialidad_fono: fono?.subespecialidad || 'Fonoaudiología General',
              telefono_fono: fono?.telefono || 'No registrado'
            };
          })
          .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        setCitas(misCitas);

        // Captura de fichas y hora
        const listaEvoluciones = [];
        fichasSeguras.forEach(citaConFicha => {
          const fono = fonosSeguros.find(f => f.id_fonoaudiologo === citaConFicha.id_fonoaudiologo);
          const citaOriginal = citasSeguras.find(c => c.id_citas === citaConFicha.id_citas);

          if (Array.isArray(citaConFicha.evoluciones_Sesion)) {
            citaConFicha.evoluciones_Sesion.forEach(evo => {
              listaEvoluciones.push({
                id_evolucion: evo.id_evolucion || `${citaConFicha.id_citas}-${Math.random()}`,
                id_citas: citaConFicha.id_citas,
                nombre_servicio: citaOriginal?.nombre_servicio || 'Sesión Fonoaudiológica',
                duracion_minutos: citaOriginal?.duracion_minutos || 50,
                nombre_fono: fono ? fono.nombre_completo : 'Fonoaudiólogo Especialista',
                especialidad_fono: fono?.subespecialidad || 'Fonoaudiología',
                direccion_fono: fono?.comuna ? `Consulta en ${fono.comuna}, Santiago` : 'Consulta Presencial, Santiago',
                foto_fono: fono?.foto_perfil || null,
                fecha: citaConFicha.fecha,
                hora_inicio: citaConFicha.hora_inicio,
                observaciones_clinicas: evo.observaciones_clinicas,
                actividades_hogar: evo.actividades_hogar
              });
            });
          }
        });

        setFichas(listaEvoluciones);
        setCargando(false);
      } catch (error) {
        console.error('Error cargando portal del paciente:', error);
        setCargando(false);
      }
    };

    cargarPortal();
  }, []);

  // Envai la confirmación o anulación a MySQL para liberar u ocupar la hora real
  const actualizarEstadoCita = async (idCita, nuevoEstado) => {
    const estadoBD = nuevoEstado === 'Confirmado' ? 'Confirmada' : nuevoEstado;

    try {
      await fetch(`http://localhost:3000/api/citas/${idCita}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_asistencia: estadoBD })
      });
    } catch (error) {
      console.error('Error guardando estado en el servidor:', error);
    }

    // Actualizamos visualmente la pantalla del paciente
    const actualizados = { ...estadosLocales, [idCita]: nuevoEstado };
    setEstadosLocales(actualizados);
    localStorage.setItem('estadosCitasPaciente', JSON.stringify(actualizados));

    if (citaSeleccionada && citaSeleccionada.id_citas === idCita) {
      setCitaSeleccionada({ ...citaSeleccionada, estado_vista: nuevoEstado });
    }

    // Refrescamos la lista local para que mueva la cita a "Anuladas"
    setCitas(prev => 
      prev.map(c => c.id_citas === idCita ? { 
        ...c, 
        estado_asistencia: estadoBD, 
        ...(estadoBD === 'Anulada' && { estado_pago: 'Cancelado' }) 
      } : c)
    );
  };

  // Clasificación temporal y de estado de cada cita
  const ahora = new Date();
  const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

  const clasificarCita = (c) => {
    const estadoGuardado = estadosLocales[c.id_citas];
    if (estadoGuardado === 'Anulada' || c.estado_asistencia === 'Anulada') return 'anuladas';
    if (c.estado_asistencia === 'Asistió') return 'atendidas';

    const fechaCita = c.fecha ? String(c.fecha).split('T')[0] : '';
    if (fechaCita < hoyStr) return 'atendidas';
    if (fechaCita > hoyStr) return 'agendadas';

    const horaStr = c.hora_inicio ? String(c.hora_inicio).substring(11, 16) : '00:00';
    const [h, m] = horaStr.split(':').map(Number);
    const duracion = Number(c.duracion_minutos) || 50;
    return (h * 60 + m + duracion) > minutosAhora ? 'agendadas' : 'atendidas';
  };

  const obtenerEstadoConfirmacion = (c) => {
    if (estadosLocales[c.id_citas]) return estadosLocales[c.id_citas];
    // Modificado para que exija confirmación del paciente en vez de confirmarla de golpe
    if (c.estado_asistencia === 'Confirmada' || c.estado_asistencia === 'Asistió') return 'Confirmado';
    return 'Pendiente a confirmar';
  };
  const citasAgendadas = citas.filter(c => clasificarCita(c) === 'agendadas');
  const citasAtendidas = citas.filter(c => clasificarCita(c) === 'atendidas');
  const citasAnuladas = citas.filter(c => clasificarCita(c) === 'anuladas');

  const citasSegunPastilla = 
    filtroCitas === 'agendadas' ? citasAgendadas :
    filtroCitas === 'atendidas' ? citasAtendidas : citasAnuladas;

  const cantidadSinConfirmar = citasAgendadas.filter(c => obtenerEstadoConfirmacion(c) === 'Por confirmar').length;

  const formatearFecha = (fechaIso) => {
    if (!fechaIso) return 'Sin fecha';
    const [y, m, d] = String(fechaIso).split('T')[0].split('-');
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
  };

  const obtenerHora = (horaIso) => {
    return horaIso ? String(horaIso).substring(11, 16) : '00:00';
  };

  const manejarReagendar = (cita) => {
    // corrección para anular horas, se mantiene activa hasta confirmar el cambio en vez de enlistarla como anulada.
    setCitaSeleccionada(null);
    
    if (cita.id_fonoaudiologo && cita.id_servicio) {
      // usamos el calendario, pero enviándole un state para avisarle a la pantalla de pago que esta cita ya está pagada.
      navigate(`/reserva/${cita.id_fonoaudiologo}/${cita.id_servicio}`, {
        state: { 
          reagendando: true, 
          idCitaAntigua: cita.id_citas,
          estadoPagoAnterior: cita.estado_pago || 'Pendiente'
        }
      });
    } else {
      navigate('/directorio');
    }
  };

  // Al hacer clic en una ficha desde Inicio, salta a la 3ra opción ("Mis Fichas") y abre su detalle completo
  const irADetalleFicha = (ficha) => {
    setFichaSeleccionada(ficha);
    setVistaActiva('fichas');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderAvatarFono = (foto, nombre, size = 48) => (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      backgroundColor: '#eff6ff',
      border: '2px solid #dbeafe',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0
    }}>
      {foto ? (
        <img src={foto} alt={nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <User size={size * 0.5} color="#1e40af" />
      )}
    </div>
  );

  const renderBadgeEstado = (estado) => {
    const estilos = {
      'Confirmado': { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', label: 'Confirmada' },
      'Pendiente a confirmar': { bg: '#fef9c3', text: '#854d0e', border: '#fde047', label: 'Pendiente a confirmar' },
      'Atendida': { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', label: 'Realizada' },
      'Anulada': { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', label: 'Anulada' }
    }[estado] || { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', label: estado };

    return (
      <span style={{
        backgroundColor: estilos.bg, color: estilos.text, border: `1px solid ${estilos.border}`,
        padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700',
        display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap'
      }}>
        {estado === 'Confirmado' && <CheckCircle2 size={13} color="#166534" />}
        {estado === 'Pendiente a confirmar' && <AlertCircle size={13} color="#854d0e" />}
        {estilos.label}
      </span>
    );
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)', padding: '36px 24px 80px', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'grid', gridTemplateColumns: '250px 1fr', gap: '30px', alignItems: 'start' }}>
        
        {/* COLUMNA LATERAL DE NAVEGACIÓN CON LAS 3 OPCIONES */}
        <aside style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '22px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          
      {/* Mini tarjeta del paciente */}
          <div style={{ padding: '8px 10px 18px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Menú Paciente
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {nombrePaciente}
            </div>
          </div>

          {/* BOTONES DE NAVEGACIÓN: Inicio, Mis Citas, Mis Fichas */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => setVistaActiva('inicio')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: vistaActiva === 'inicio' ? '#eff6ff' : 'transparent',
                color: vistaActiva === 'inicio' ? '#1e40af' : '#475569',
                fontWeight: vistaActiva === 'inicio' ? '700' : '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <LayoutGrid size={18} color={vistaActiva === 'inicio' ? '#1e40af' : '#64748b'} />
                Inicio
              </span>
              <ChevronRight size={15} style={{ opacity: vistaActiva === 'inicio' ? 1 : 0 }} />
            </button>

            <button
              onClick={() => setVistaActiva('citas')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: vistaActiva === 'citas' ? '#eff6ff' : 'transparent',
                color: vistaActiva === 'citas' ? '#1e40af' : '#475569',
                fontWeight: vistaActiva === 'citas' ? '700' : '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={18} color={vistaActiva === 'citas' ? '#1e40af' : '#64748b'} />
                Mis Citas
              </span>
              {citasAgendadas.length > 0 && (
                <span style={{ backgroundColor: vistaActiva === 'citas' ? '#1e40af' : '#e2e8f0', color: vistaActiva === 'citas' ? '#ffffff' : '#475569', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '999px' }}>
                  {citasAgendadas.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setVistaActiva('fichas');
                setFichaSeleccionada(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: vistaActiva === 'fichas' ? '#eff6ff' : 'transparent',
                color: vistaActiva === 'fichas' ? '#1e40af' : '#475569',
                fontWeight: vistaActiva === 'fichas' ? '700' : '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={18} color={vistaActiva === 'fichas' ? '#1e40af' : '#64748b'} />
                Mis Fichas
              </span>
              {fichas.length > 0 && (
                <span style={{ backgroundColor: vistaActiva === 'fichas' ? '#1e40af' : '#e2e8f0', color: vistaActiva === 'fichas' ? '#ffffff' : '#475569', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '999px' }}>
                  {fichas.length}
                </span>
              )}
            </button>
          </nav>

          {/* Acceso directo a nueva reserva */}
          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #f1f5f9' }}>
            <Link
              to="/directorio"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                backgroundColor: '#1a365d',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '11px 14px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '700',
                boxSizing: 'border-box'
              }}
            >
              + Reservar nueva hora
            </Link>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main style={{ minWidth: 0 }}>
          
          {/* CABECERA */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
              Portal Clínico del Paciente
            </div>
            <h1 style={{ margin: 0, fontSize: '28px', color: '#1a365d', fontWeight: '800', letterSpacing: '-0.5px' }}>
              Hola, {nombrePaciente.split(' ')[0]}
            </h1>
            <p style={{ color: '#64748b', marginTop: '6px', fontSize: '15px', margin: '6px 0 0 0' }}>
              Revisa la fecha de tu próxima atención, gestiona tus reservas y consulta las observaciones de tu especialista.
            </p>
          </div>

          {cargando ? (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '60px', textAlign: 'center', color: '#64748b' }}>
              Cargando tu historial y próximas sesiones...
            </div>
          ) : vistaActiva === 'inicio' ? (
            /* VISTA DE INICIO (Citas Agendadas y Resumen de 1 línea de Mi Ficha) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* BLOQUE 1: MIS CITAS AGENDADAS */}
              <div>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                  
                  <div
                    onClick={() => setAbiertoCitas(!abiertoCitas)}
                    style={{ padding: '18px 24px', backgroundColor: '#ffffff', borderBottom: abiertoCitas ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={18} color="#1e40af" />
                      </div>
                      <div>
                        <span style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>Mis citas agendadas</span>
                        <span style={{ marginLeft: '10px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '700', padding: '2px 9px', borderRadius: '999px' }}>
                          {citasAgendadas.length}
                        </span>
                      </div>
                    </div>
                    <ChevronDown size={20} color="#64748b" style={{ transform: abiertoCitas ? 'rotate(0deg)' : 'rotate(-90deg)', transition: '0.2s' }} />
                  </div>

                  {abiertoCitas && (
                    <div style={{ padding: '20px 24px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {citasAgendadas.length === 0 ? (
                        <div style={{ backgroundColor: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '32px 20px', textAlign: 'center' }}>
                          <Calendar size={30} color="#94a3b8" style={{ marginBottom: '8px' }} />
                          <div style={{ fontSize: '15px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                            No tienes citas agendadas próximamente
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                            Encuentra a tu especialista en el directorio para programar tu próxima sesión.
                          </div>
                          <Link
                            to="/directorio"
                            style={{ display: 'inline-block', backgroundColor: '#1e40af', color: '#ffffff', padding: '9px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '13px' }}
                          >
                            Buscar especialista
                          </Link>
                        </div>
                      ) : (
                        citasAgendadas.map(cita => {
                          const estadoConf = obtenerEstadoConfirmacion(cita);
                          return (
                            <div
                              key={cita.id_citas}
                              onClick={() => {
                                setFiltroCitas('agendadas');
                                setVistaActiva('citas');
                              }}
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderLeft: '4px solid #1e40af',
                                borderRadius: '12px',
                                padding: '18px 22px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '16px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {renderAvatarFono(cita.foto_fono, cita.nombre_fono, 52)}
                                <div>
                                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                                     {cita.nombre_fono}
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '13px', color: '#64748b' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <MapPin size={14} color="#64748b" /> {cita.direccion_fono}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#1e40af', fontWeight: '700' }}>
                                      <Clock size={14} color="#1e40af" /> {formatearFecha(cita.fecha)} • {obtenerHora(cita.hora_inicio)} hrs
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                {renderBadgeEstado(estadoConf)}
                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#1a365d' }}>
                                  {cita.nombre_servicio || 'Sesión Fonoaudiológica'}
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  Gestionar cita <ChevronRight size={15} color="#64748b" />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {cantidadSinConfirmar > 0 && (
                  <div
                    onClick={() => { setFiltroCitas('agendadas'); setVistaActiva('citas'); }}
                    style={{
                      marginTop: '10px',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '10px',
                      padding: '10px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      color: '#92400e',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={16} color="#d97706" />
                      Tienes {cantidadSinConfirmar} {cantidadSinConfirmar === 1 ? 'cita pendiente' : 'citas pendientes'} de confirmación.
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
                      Ir a confirmar <ChevronRight size={16} />
                    </span>
                  </div>
                )}
              </div>

              {/* BLOQUE DE MI FICHA (Vista previa de 1 línea que al clickear lleva a la 3ra opción "Mis Fichas") */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                
                <div
                  onClick={() => setAbiertoFichas(!abiertoFichas)}
                  style={{ padding: '18px 24px', backgroundColor: '#ffffff', borderBottom: abiertoFichas ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={18} color="#1e40af" />
                    </div>
                    <div>
                      <span style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>Mi ficha</span>
                      <span style={{ marginLeft: '10px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '700', padding: '2px 9px', borderRadius: '999px' }}>
                        {fichas.length}
                      </span>
                    </div>
                  </div>
                  <ChevronDown size={20} color="#64748b" style={{ transform: abiertoFichas ? 'rotate(0deg)' : 'rotate(-90deg)', transition: '0.2s' }} />
                </div>

                {abiertoFichas && (
                  <div style={{ padding: '20px 24px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {fichas.length === 0 ? (
                      <div style={{ backgroundColor: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '32px 20px', textAlign: 'center', color: '#64748b' }}>
                        <ClipboardList size={30} color="#94a3b8" style={{ marginBottom: '8px' }} />
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                          Aún no tienes observaciones clínicas registradas
                        </div>
                        <div style={{ fontSize: '13px' }}>
                          Cuando tu fonoaudiólogo registre los avances y actividades de tu sesión, aparecerán detallados aquí.
                        </div>
                      </div>
                    ) : (
                      fichas.map(ficha => (
                        <div
                          key={ficha.id_evolucion}
                          onClick={() => irADetalleFicha(ficha)}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '18px 22px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '20px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: 1 }}>
                            {renderAvatarFono(ficha.foto_fono, ficha.nombre_fono, 48)}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a365d', marginBottom: '3px' }}>
                                {ficha.nombre_servicio}
                              </div>
                              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
                                Flgo/a. <strong>{ficha.nombre_fono}</strong> • <span style={{ color: '#64748b' }}>Emitida el {formatearFecha(ficha.fecha)} ({obtenerHora(ficha.hora_inicio)} hrs)</span>
                              </div>
                              {/* Vista previa truncada a la primera línea */}
                              <div style={{
                                fontSize: '13px',
                                color: '#64748b',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #f1f5f9',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                <strong style={{ color: '#334155' }}>Observación: </strong>
                                {ficha.observaciones_clinicas || 'Sin observaciones registradas.'}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            backgroundColor: '#eff6ff',
                            color: '#1e40af',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}>
                            Revisar resultados <ChevronRight size={16} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

            </div>
          ) : vistaActiva === 'citas' ? (
            /* VISTA DE MIS CITAS (Con las 3 pastillas y modal de acción) */
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px', paddingBottom: '18px', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                    Historial y Gestión de Citas
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                    Selecciona cualquier cita para ver su detalle, confirmar tu asistencia, reagendar o anular.
                  </p>
                </div>

                {/* 3 PASTILLAS DE FILTRO */}
                <div style={{ display: 'inline-flex', gap: '6px', backgroundColor: '#f1f5f9', padding: '5px', borderRadius: '999px' }}>
                  {[
                    { id: 'agendadas', label: `Agendadas (${citasAgendadas.length})` },
                    { id: 'atendidas', label: `Ya atendidas (${citasAtendidas.length})` },
                    { id: 'anuladas', label: `Anuladas (${citasAnuladas.length})` }
                  ].map(tab => {
                    const activo = filtroCitas === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setFiltroCitas(tab.id)}
                        style={{
                          backgroundColor: activo ? '#1a365d' : 'transparent',
                          color: activo ? '#ffffff' : '#475569',
                          border: 'none',
                          borderRadius: '999px',
                          padding: '8px 18px',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {citasSegunPastilla.length === 0 ? (
                <div style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '44px 24px', textAlign: 'center', color: '#64748b' }}>
                  <Calendar size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    No hay citas en la categoría "{filtroCitas}"
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    Puedes cambiar de filtro en las pestañas superiores o agendar una nueva atención.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {citasSegunPastilla.map(cita => {
                    const categoria = clasificarCita(cita);
                    const estadoConf = categoria === 'anuladas'
                      ? 'Anulada'
                      : categoria === 'atendidas'
                      ? 'Atendida'
                      : obtenerEstadoConfirmacion(cita);

                    return (
                      <div
                        key={cita.id_citas}
                        onClick={() => setCitaSeleccionada(cita)}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderLeft: `4px solid ${categoria === 'anuladas' ? '#ef4444' : categoria === 'atendidas' ? '#64748b' : '#1e40af'}`,
                          borderRadius: '12px',
                          padding: '18px 22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          {renderAvatarFono(cita.foto_fono, cita.nombre_fono, 52)}
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                              Flgo/a. {cita.nombre_fono}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '13px', color: '#64748b' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <MapPin size={14} color="#64748b" /> {cita.direccion_fono}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#1e293b', fontWeight: '700' }}>
                                <Clock size={14} color="#1e40af" /> {formatearFecha(cita.fecha)} • {obtenerHora(cita.hora_inicio)} hrs
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          {renderBadgeEstado(estadoConf)}
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#1a365d' }}>
                            {cita.nombre_servicio || 'Sesión Fonoaudiológica'}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Ver opciones de cita <ChevronRight size={15} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /*  VISTA DE MIS FICHAS (Lectura detallada de Observaciones y Actividades) */
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '26px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              
              {fichaSeleccionada ? (
                /* DETALLE COMPLETO DE LA FICHA SELECCIONADA */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '12px' }}>
                    <button
                      onClick={() => setFichaSeleccionada(null)}
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        color: '#1a365d',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ArrowLeft size={16} /> Volver al listado de fichas
                    </button>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#1a365d', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} color="#1e40af" /> {formatearFecha(fichaSeleccionada.fecha)}
                      </span>
                      <span style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} color="#1e40af" /> {obtenerHora(fichaSeleccionada.hora_inicio)} hrs
                      </span>
                    </div>
                  </div>

                  {/* Cabecera clínica de la sesión */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {renderAvatarFono(fichaSeleccionada.foto_fono, fichaSeleccionada.nombre_fono, 56)}
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '2px' }}>
                          Informe de Evolución Clínica
                        </div>
                        <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#0f172a', fontWeight: '800' }}>
                          {fichaSeleccionada.nombre_servicio}
                        </h2>
                        <div style={{ fontSize: '13px', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                          <span>Especialista: <strong>Flgo/a. {fichaSeleccionada.nombre_fono}</strong></span>
                          <span>•</span>
                          <span>{fichaSeleccionada.especialidad_fono}</span>
                        </div>
                      </div>
                    </div>

                    <span style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={14} /> Sesión Registrada
                    </span>
                  </div>

                  {/* Cuerpo completo de lectura a detalle */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #1a365d', borderRadius: '12px', padding: '22px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '800', color: '#1a365d', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
                        <Stethoscope size={17} color="#1a365d" /> Observaciones Clínicas del Fonoaudiólogo
                      </div>
                      <p style={{ margin: 0, fontSize: '15px', color: '#1e293b', lineHeight: '1.75', whiteSpace: 'pre-line' }}>
                        {fichaSeleccionada.observaciones_clinicas || 'Sin observaciones clínicas registradas para esta sesión.'}
                      </p>
                    </div>

                    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderLeft: '4px solid #1e40af', borderRadius: '12px', padding: '22px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '800', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
                        <BookOpen size={17} color="#1e40af" /> Actividades e Indicaciones para el Hogar
                      </div>
                      <p style={{ margin: 0, fontSize: '15px', color: '#1e3a8a', lineHeight: '1.75', whiteSpace: 'pre-line' }}>
                        {fichaSeleccionada.actividades_hogar || 'No se asignaron actividades adicionales para realizar en casa en esta sesión.'}
                      </p>
                    </div>

                  </div>
                </div>
              ) : (
                /* LISTADO GENERAL DE FICHAS EN LA 3RA PESTAÑA */
                <div>
                  <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                      Mis Fichas Clínicas y Observaciones
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                      Haz clic sobre cualquier sesión para abrir el informe completo con las observaciones de tu fonoaudiólogo y tus tareas para la casa.
                    </p>
                  </div>

                  {fichas.length === 0 ? (
                    <div style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '44px 24px', textAlign: 'center', color: '#64748b' }}>
                      <ClipboardList size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                        Aún no tienes fichas clínicas registradas
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        Una vez que tu especialista registre la evolución de tu consulta, podrás leerla a detalle aquí.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {fichas.map(ficha => (
                        <div
                          key={ficha.id_evolucion}
                          onClick={() => setFichaSeleccionada(ficha)}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderLeft: '4px solid #1e40af',
                            borderRadius: '12px',
                            padding: '18px 22px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '20px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: 1 }}>
                            {renderAvatarFono(ficha.foto_fono, ficha.nombre_fono, 50)}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                                  {ficha.nombre_servicio}
                                </span>
                                <span style={{ backgroundColor: '#eff6ff', color: '#1e40af', fontSize: '12px', fontWeight: '700', padding: '2px 10px', borderRadius: '999px' }}>
                                  {formatearFecha(ficha.fecha)} • {obtenerHora(ficha.hora_inicio)} hrs
                                </span>
                              </div>
                              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
                                Atendido por: <strong>Flgo/a. {ficha.nombre_fono}</strong> ({ficha.especialidad_fono})
                              </div>
                              <div style={{
                                fontSize: '13px',
                                color: '#64748b',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                <strong style={{ color: '#334155' }}>Resumen: </strong>
                                {ficha.observaciones_clinicas || 'Sin observaciones registradas.'}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            backgroundColor: '#1a365d',
                            color: '#ffffff',
                            padding: '9px 16px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}>
                            Leer ficha completa <ChevronRight size={16} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/*  MODAL: DETALLE Y OPCIONES DE MODIFICACIÓN DE LA CITA */}
      {citaSeleccionada && (
        <div style={modalOverlayStyle} onClick={() => setCitaSeleccionada(null)}>
          <div style={modalCardStyle} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Gestión de Reserva
                </div>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', color: '#0f172a', fontWeight: '800' }}>
                  Detalle de tu Atención
                </h3>
              </div>
              <button onClick={() => setCitaSeleccionada(null)} style={closeBtnStyle}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {renderAvatarFono(citaSeleccionada.foto_fono, citaSeleccionada.nombre_fono, 46)}
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    Flgo/a. {citaSeleccionada.nombre_fono}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    <Stethoscope size={13} color="#1e40af" /> {citaSeleccionada.especialidad_fono}
                  </div>
                </div>
              </div>
              {renderBadgeEstado(
                clasificarCita(citaSeleccionada) === 'anuladas' ? 'Anulada' :
                clasificarCita(citaSeleccionada) === 'atendidas' ? 'Atendida' :
                obtenerEstadoConfirmacion(citaSeleccionada)
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#334155', marginBottom: '24px', backgroundColor: '#ffffff', padding: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={16} color="#1e40af" /> Tratamiento</span>
                <strong style={{ color: '#0f172a', textAlign: 'right' }}>{citaSeleccionada.nombre_servicio}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={16} color="#1e40af" /> Fecha y hora</span>
                <strong style={{ color: '#0f172a' }}>{formatearFecha(citaSeleccionada.fecha)} • {obtenerHora(citaSeleccionada.hora_inicio)} hrs</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={16} color="#1e40af" /> Ubicación</span>
                <strong style={{ color: '#0f172a' }}>{citaSeleccionada.direccion_fono}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={16} color="#1e40af" /> Duración / Pago</span>
                <strong style={{ color: '#0f172a' }}>{citaSeleccionada.duracion_minutos || 50} min ({citaSeleccionada.estado_pago || 'Confirmado'})</strong>
              </div>
            </div>

            {clasificarCita(citaSeleccionada) === 'agendadas' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {obtenerEstadoConfirmacion(citaSeleccionada) === 'Por confirmar' && (
                  <button
                    onClick={() => {
                      actualizarEstadoCita(citaSeleccionada.id_citas, 'Confirmado');
                      setCitaSeleccionada(null);
                    }}
                    style={{
                      backgroundColor: '#1a365d',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <CheckCircle2 size={17} /> Confirmar mi asistencia
                  </button>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    onClick={() => manejarReagendar(citaSeleccionada)}
                    style={{
                      backgroundColor: '#eff6ff',
                      color: '#1e40af',
                      border: '1px solid #bfdbfe',
                      borderRadius: '10px',
                      padding: '11px',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px'
                    }}
                  >
                    <RefreshCw size={15} /> Reagendar hora
                  </button>

                  <button
                    onClick={() => {
                      actualizarEstadoCita(citaSeleccionada.id_citas, 'Anulada');
                      setCitaSeleccionada(null);
                    }}
                    style={{
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '10px',
                      padding: '11px',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px'
                    }}
                  >
                    <Trash2 size={15} /> Anular cita
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '10px', textAlign: 'center', fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
                Esta atención forma parte de tu registro de citas {clasificarCita(citaSeleccionada)}.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

const modalOverlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.5)',
  backdropFilter: 'blur(2px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px'
};

const modalCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  border: '1px solid #e2e8f0',
  padding: '26px',
  width: '100%',
  maxWidth: '520px',
  boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)'
};

const closeBtnStyle = {
  backgroundColor: '#f1f5f9',
  border: 'none',
  borderRadius: '8px',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#475569'
};