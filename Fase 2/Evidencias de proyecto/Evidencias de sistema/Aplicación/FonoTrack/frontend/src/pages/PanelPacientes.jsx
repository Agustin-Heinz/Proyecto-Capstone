import { useState, useEffect, useRef, useId } from 'react';
import { UserRound, UserRoundGroup, FileDown, Pencil, Check, X, Plus } from 'lucide-react';
import {
  exportarFichaClinicaPDF,
  exportarPautaSesionPDF
} from '../utils/exportarPdfClinico';

export default function PanelPacientes() {
  const [pacienteActivo, setPacienteActivo] = useState(null);

  // Estados para manejar los datos que llegan de la base de datos
  const [listaPacientes, setListaPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estados para la Ficha Clínica y el Historial
  const [historialFichas, setHistorialFichas] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  const [tareas, setTareas] = useState('');

  // Modal nativo <dialog> para "+ Añadir nuevo paciente"
  const dialogNuevoPacRef = useRef(null);
  const pressedOutsideRef = useRef(false);
  const tituloModalId = useId();
  const [guardandoNuevoPac, setGuardandoNuevoPac] = useState(false);
  const [nuevoPacForm, setNuevoPacForm] = useState({
    nombre_completo: '',
    rut: '',
    telefono: '',
    email: '',
    fecha_nacimiento: '',
    genero: 'No especificado',
    direccion: '',
    emergencia: '',
    notas: ''
  });

  // Edición de datos permanentes y notas clínicas del paciente
  const [editandoDatosPaciente, setEditandoDatosPaciente] = useState(false);
  const [guardandoDatosPaciente, setGuardandoDatosPaciente] = useState(false);
  const [datosPacienteForm, setDatosPacienteForm] = useState({
    nacimiento: '',
    genero: 'No especificado',
    fono: '',
    email: '',
    direccion: '',
    emergencia: '',
    notas: ''
  });

  // Edición de una evolución ya guardada
  const [evolucionEditandoId, setEvolucionEditandoId] = useState(null);
  const [evoEditObs, setEvoEditObs] = useState('');
  const [evoEditTareas, setEvoEditTareas] = useState('');
  const [evoReenviarWsp, setEvoReenviarWsp] = useState(false);
  const [guardandoEdicionEvo, setGuardandoEdicionEvo] = useState(false);

  const obtenerIdFonoaudiologo = () => {
    const perfilIdParsed = parseInt(localStorage.getItem('perfilId'));
    return !isNaN(perfilIdParsed) && perfilIdParsed > 0 ? perfilIdParsed : 2;
  };

  const formatearPacienteParaVista = (p, citasFonoaudiologo = []) => {
    const citasDelPaciente = citasFonoaudiologo.filter(c => c.id_paciente === p.id_paciente);
    let ultimaSesionTexto = 'Primera evaluación';
    let idUltimaCita = null;

    if (citasDelPaciente.length > 0) {
      const ultimaCita = citasDelPaciente[citasDelPaciente.length - 1];
      idUltimaCita = ultimaCita.id_citas;

      const fechaLimpia = String(ultimaCita.fecha).split('T')[0];
      const [year, month, day] = fechaLimpia.split('-');

      let horaLimpia = '';
      if (ultimaCita.hora_inicio) {
        horaLimpia = ' - ' + String(ultimaCita.hora_inicio).substring(11, 16) + ' hrs';
      }

      ultimaSesionTexto = `${day}/${month}/${year}${horaLimpia}`;
    }

    return {
      id: p.id_paciente,
      idUltimaCita,
      nombre: p.nombre_completo,
      rut: p.rut,
      fono: p.telefono || '',
      ultimaSesion: ultimaSesionTexto,
      estadoPago: p.estadoPago || 'Al día',
      nacimiento: p.fecha_nacimiento ? String(p.fecha_nacimiento).split('T')[0] : 'No registrado',
      genero: p.genero || 'No especificado',
      email: p.email || 'Sin correo',
      direccion: p.direccion || 'No registrada',
      emergencia: p.emergencia || p.nombre_tutor || 'Sin contacto',
      notas: p.notas || 'Sin observaciones clínicas.'
    };
  };

  // useEffect se ejecuta automáticamente al abrir la pantalla para buscar los datos
  useEffect(() => {
    fetch('http://localhost:3000/api/citas')
      .then(res => res.json())
      .then(citas => {
        const idFonoaudiologo = obtenerIdFonoaudiologo();
        const citasSeguras = Array.isArray(citas) ? citas : [];
        const citasFonoaudiologo = citasSeguras.filter(c => c.id_fonoaudiologo === idFonoaudiologo);
        const idsMisPacientes = new Set(citasFonoaudiologo.map(c => c.id_paciente));

        return fetch('http://localhost:3000/api/pacientes')
          .then(res => res.json())
          .then(datosBackend => {
            const listaSegura = Array.isArray(datosBackend) ? datosBackend : [];
            const misPacientes = listaSegura.filter(
              p => idsMisPacientes.has(p.id_paciente) || Number(p.id_fonoaudiologo) === idFonoaudiologo
            );

            const pacientesFormateados = misPacientes.map(p =>
              formatearPacienteParaVista(p, citasFonoaudiologo)
            );

            setListaPacientes(pacientesFormateados);
            setCargando(false);
          });
      })
      .catch(error => {
        console.error("Error cargando los pacientes:", error);
        setCargando(false);
      });
  }, []);

  // Cargar el historial cuando seleccionamos "Ver Ficha"
  useEffect(() => {
    if (pacienteActivo) {
      setEditandoDatosPaciente(false);
      setEvolucionEditandoId(null);
      setDatosPacienteForm({
        nacimiento: pacienteActivo.nacimiento !== 'No registrado' ? pacienteActivo.nacimiento : '',
        genero: pacienteActivo.genero || 'No especificado',
        fono: pacienteActivo.fono || '',
        email: pacienteActivo.email !== 'Sin correo' ? pacienteActivo.email : '',
        direccion: pacienteActivo.direccion !== 'No registrada' ? pacienteActivo.direccion : '',
        emergencia: pacienteActivo.emergencia !== 'Sin contacto' ? pacienteActivo.emergencia : '',
        notas: pacienteActivo.notas !== 'Sin observaciones clínicas.' ? pacienteActivo.notas : ''
      });

      fetch(`http://localhost:3000/api/fichas/${pacienteActivo.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setHistorialFichas(data);
          } else {
            console.error("El backend devolvió un error en lugar de una lista:", data);
            setHistorialFichas([]);
          }
        })
        .catch(err => {
          console.error("Error cargando el historial clínico:", err);
          setHistorialFichas([]);
        });
    }
  }, [pacienteActivo]);

  const abrirModalNuevoPaciente = () => {
    setNuevoPacForm({
      nombre_completo: '',
      rut: '',
      telefono: '',
      email: '',
      fecha_nacimiento: '',
      genero: 'No especificado',
      direccion: '',
      emergencia: '',
      notas: ''
    });
    dialogNuevoPacRef.current?.showModal();
  };

  const cerrarModalNuevoPaciente = () => {
    dialogNuevoPacRef.current?.close();
  };

  // Fallback de light-dismiss para navegadores sin soporte nativo de closedby="any"
  const esClickFueraDelDialog = (e, dialog) => {
    const r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };

  const handleDialogPointerDown = (e) => {
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype) && dialogNuevoPacRef.current) {
      pressedOutsideRef.current = esClickFueraDelDialog(e, dialogNuevoPacRef.current);
    }
  };

  const handleDialogPointerUp = (e) => {
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype) && dialogNuevoPacRef.current) {
      if (pressedOutsideRef.current && esClickFueraDelDialog(e, dialogNuevoPacRef.current)) {
        dialogNuevoPacRef.current.close();
      }
      pressedOutsideRef.current = false;
    }
  };

  const handleCrearNuevoPaciente = async (e) => {
    e.preventDefault();
    if (!nuevoPacForm.nombre_completo.trim() || !nuevoPacForm.rut.trim()) {
      alert('Por favor ingresa al menos el nombre completo y el RUT del paciente.');
      return;
    }

    setGuardandoNuevoPac(true);
    try {
      const idFonoaudiologo = obtenerIdFonoaudiologo();
      const respuesta = await fetch('http://localhost:3000/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevoPacForm,
          id_fonoaudiologo: idFonoaudiologo
        })
      });

      if (!respuesta.ok) {
        const errData = await respuesta.json().catch(() => ({}));
        alert(errData.mensaje || 'Error al registrar el paciente.');
        setGuardandoNuevoPac(false);
        return;
      }

      const pacienteCreado = await respuesta.json();
      const pacienteFormateado = formatearPacienteParaVista(pacienteCreado, []);

      setListaPacientes(prev => {
        const existe = prev.some(item => item.id === pacienteFormateado.id);
        if (existe) {
          return prev.map(item => (item.id === pacienteFormateado.id ? pacienteFormateado : item));
        }
        return [pacienteFormateado, ...prev];
      });

      cerrarModalNuevoPaciente();
    } catch (error) {
      console.error('Error creando paciente:', error);
      alert('Error de conexión al registrar el paciente.');
    } finally {
      setGuardandoNuevoPac(false);
    }
  };

  // Guardar edición de datos permanentes / notas clínicas del paciente
  const handleGuardarDatosPaciente = async () => {
    if (!pacienteActivo) return;
    setGuardandoDatosPaciente(true);
    try {
      const respuesta = await fetch(`http://localhost:3000/api/pacientes/${pacienteActivo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: datosPacienteForm.fono.trim(),
          fecha_nacimiento: datosPacienteForm.nacimiento || null,
          genero: datosPacienteForm.genero,
          email: datosPacienteForm.email.trim(),
          direccion: datosPacienteForm.direccion.trim() || 'No registrada',
          emergencia: datosPacienteForm.emergencia.trim() || 'Sin contacto',
          notas: datosPacienteForm.notas.trim() || 'Sin observaciones clínicas.'
        })
      });

      if (respuesta.ok) {
        const actualizado = await respuesta.json();
        const pacienteActualizadoVista = {
          ...pacienteActivo,
          fono: actualizado.telefono || '',
          nacimiento: actualizado.fecha_nacimiento ? String(actualizado.fecha_nacimiento).split('T')[0] : 'No registrado',
          genero: actualizado.genero || 'No especificado',
          email: actualizado.email || 'Sin correo',
          direccion: actualizado.direccion || 'No registrada',
          emergencia: actualizado.emergencia || 'Sin contacto',
          notas: actualizado.notas || 'Sin observaciones clínicas.'
        };
        setPacienteActivo(pacienteActualizadoVista);
        setListaPacientes(prev => prev.map(p => (p.id === pacienteActivo.id ? pacienteActualizadoVista : p)));
        setEditandoDatosPaciente(false);
      } else {
        alert('No se pudieron actualizar los datos del paciente.');
      }
    } catch (error) {
      console.error('Error actualizando ficha del paciente:', error);
      alert('Error de conexión al actualizar los datos del paciente.');
    } finally {
      setGuardandoDatosPaciente(false);
    }
  };

  // Guardar el nuevo registro en MySQL y enviar el correo + WhatsApp
  const handleGuardarRegistro = async () => {
    if (!observaciones.trim()) {
      alert("Debes ingresar al menos una observación clínica.");
      return;
    }

    try {
      const nombreFono = localStorage.getItem('nombre') || 'tu especialista';
      const idFonoaudiologo = obtenerIdFonoaudiologo();

      const respuesta = await fetch('http://localhost:3000/api/fichas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_cita: pacienteActivo.idUltimaCita,
          id_paciente: pacienteActivo.id,
          id_fonoaudiologo: idFonoaudiologo,
          telefono: pacienteActivo.fono,
          pacienteNombre: pacienteActivo.nombre,
          pacienteEmail: pacienteActivo.email !== 'Sin correo' ? pacienteActivo.email : undefined,
          observaciones_clinicas: observaciones,
          actividades_hogar: tareas,
          fonoaudiologoNombre: nombreFono
        })
      });

      if (respuesta.ok) {
        const resultado = await respuesta.json();
        if (resultado.id_cita && !pacienteActivo.idUltimaCita) {
          setPacienteActivo(prev => ({ ...prev, idUltimaCita: resultado.id_cita }));
        }
        if (resultado.whatsappEnviado) {
          alert("Registro guardado con éxito. Se han enviado las observaciones al WhatsApp y correo del paciente.");
        } else {
          alert("Registro guardado con éxito. Se ha enviado una copia al correo del paciente (verifica que el cliente de WhatsApp esté conectado y el paciente tenga teléfono registrado).");
        }
        setObservaciones('');
        setTareas('');

        const resHistorial = await fetch(`http://localhost:3000/api/fichas/${pacienteActivo.id}`);
        const dataHistorial = await resHistorial.json();
        setHistorialFichas(Array.isArray(dataHistorial) ? dataHistorial : []);
      } else {
        alert("Hubo un error al guardar el registro.");
      }
    } catch (error) {
      console.error("Error de red:", error);
      alert("Error de conexión al intentar guardar la ficha.");
    }
  };

  const iniciarEdicionEvolucion = (evo) => {
    setEvolucionEditandoId(evo.id_fichas);
    setEvoEditObs(evo.observaciones_clinicas || '');
    setEvoEditTareas(evo.actividades_hogar || '');
    setEvoReenviarWsp(false);
  };

  const handleGuardarEdicionEvolucion = async (idFichas) => {
    if (!evoEditObs.trim()) {
      alert('Las observaciones clínicas no pueden quedar vacías.');
      return;
    }

    setGuardandoEdicionEvo(true);
    try {
      const nombreFono = localStorage.getItem('nombre') || 'tu especialista';
      const respuesta = await fetch(`http://localhost:3000/api/fichas/${idFichas}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observaciones_clinicas: evoEditObs,
          actividades_hogar: evoEditTareas,
          reenviarWhatsApp: evoReenviarWsp,
          telefono: pacienteActivo?.fono,
          pacienteNombre: pacienteActivo?.nombre,
          fonoaudiologoNombre: nombreFono
        })
      });

      if (respuesta.ok) {
        const resHistorial = await fetch(`http://localhost:3000/api/fichas/${pacienteActivo.id}`);
        const dataHistorial = await resHistorial.json();
        setHistorialFichas(Array.isArray(dataHistorial) ? dataHistorial : []);
        setEvolucionEditandoId(null);
      } else {
        alert('Error al guardar los cambios de la evolución.');
      }
    } catch (error) {
      console.error('Error editando evolución:', error);
      alert('Error de conexión al actualizar la evolución.');
    } finally {
      setGuardandoEdicionEvo(false);
    }
  };

  // Preparar lista plana de sesiones para exportar en PDF
  const obtenerSesionesParaPDF = () => {
    const lista = [];
    historialFichas.forEach(cita => {
      const fechaLimpia = String(cita.fecha).split('T')[0];
      const [year, month, day] = fechaLimpia.split('-');
      const horaLimpia = cita.hora_inicio ? String(cita.hora_inicio).substring(11, 16) : '';
      const fechaFormateada = `${day}/${month}/${year}${horaLimpia ? ` - ${horaLimpia} hrs` : ''}`;

      cita.evoluciones_Sesion?.forEach(evo => {
        lista.push({
          id_fichas: evo.id_fichas,
          fechaTexto: fechaFormateada,
          servicio: 'Sesión Fonoaudiológica',
          observaciones: evo.observaciones_clinicas,
          tareas: evo.actividades_hogar
        });
      });
    });
    return lista;
  };

  if (cargando) {
    return <div style={{ padding: '50px', textAlign: 'center', fontSize: '18px', color: '#1a365d' }}>Cargando directorio de pacientes...</div>;
  }

  const nombreEspecialistaActual = localStorage.getItem('nombre') || 'Especialista FonoTrack';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

      <div style={{ marginBottom: '30px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a365d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Gestión Clínica</div>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#1a365d' }}>Pacientes e Historial Médico</h1>
      </div>

      {!pacienteActivo ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', overflow: 'hidden' }}>

          <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}><UserRoundGroup size={24} color="#1a365d" />
               Directorio de Pacientes
            </h2>
            <button
              type="button"
              onClick={abrirModalNuevoPaciente}
              style={{ backgroundColor: '#1a365d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={18} /> Añadir nuevo paciente
            </button>
          </div>

          <div className="table-responsive">
          <table style={{ width: '100%', minWidth: '580px', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={thStyle}>Nombre</th>
                <th style={thStyle}>RUT</th>
                <th style={thStyle}>Última Sesión</th>
                <th style={thStyle}>Estado de Pago</th>
                <th style={thStyle}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {listaPacientes.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ ...tdStyle, fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}> <UserRound size={18} color="#475569" /> </div>
                    {p.nombre}
                  </td>
                  <td style={tdStyle}>{p.rut}</td>
                  <td style={tdStyle}>{p.ultimaSesion}</td>
                  <td style={tdStyle}>
                    <span style={{
                      backgroundColor: p.estadoPago === 'Al día' ? '#dcfce7' : '#fef08a',
                      color: p.estadoPago === 'Al día' ? '#166534' : '#854d0e',
                      padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700'
                    }}>
                      {p.estadoPago}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => setPacienteActivo(p)}
                      style={{ backgroundColor: 'transparent', color: '#1a365d', border: '1px solid #cbd5e1', padding: '6px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                    >
                       Ver ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', overflow: 'hidden' }}>

          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <button
              onClick={() => setPacienteActivo(null)}
              style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
            >
              ← Volver a la lista
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() =>
                  exportarFichaClinicaPDF({
                    paciente: pacienteActivo,
                    sesiones: obtenerSesionesParaPDF(),
                    especialistaNombre: nombreEspecialistaActual
                  })
                }
                style={{ backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '8px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <FileDown size={15} /> Descargar Ficha Clínica (PDF)
              </button>

              <span style={{ fontWeight: '700', color: '#1a365d', marginLeft: '4px' }}>Ficha Clínica</span>
            </div>
          </div>

          <div className="ficha-split-layout">
            <div className="ficha-sidebar-info">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '52px', height: '52px', backgroundColor: '#bfdbfe', color: '#1e3a8a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                    <UserRound size={34} color="#475569" />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '19px', color: '#0f172a' }}>{pacienteActivo.nombre}</h3>
                </div>

                {!editandoDatosPaciente && (
                  <button
                    type="button"
                    onClick={() => setEditandoDatosPaciente(true)}
                    title="Editar datos y notas del paciente"
                    style={{ backgroundColor: '#f8fafc', color: '#1a365d', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Pencil size={13} /> Editar
                  </button>
                )}
              </div>

              {!editandoDatosPaciente ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <InfoRow label="RUT" value={pacienteActivo.rut} />
                  <InfoRow label="Fecha Nac." value={pacienteActivo.nacimiento} />
                  <InfoRow label="Género" value={pacienteActivo.genero} />
                  <InfoRow label="Teléfono" value={pacienteActivo.fono || 'No registrado'} />
                  <InfoRow label="Email" value={pacienteActivo.email} />
                  <InfoRow label="Dirección" value={pacienteActivo.direccion} />
                  <InfoRow label="Emergencia" value={pacienteActivo.emergencia} />
                  <InfoRow label="Notas" value={pacienteActivo.notas} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <InfoRow label="RUT" value={pacienteActivo.rut} />

                  <div>
                    <label style={sidebarLabelStyle}>Fecha Nac.</label>
                    <input
                      type="date"
                      value={datosPacienteForm.nacimiento}
                      onChange={e => setDatosPacienteForm({ ...datosPacienteForm, nacimiento: e.target.value })}
                      style={sidebarInputStyle}
                    />
                  </div>

                  <div>
                    <label style={sidebarLabelStyle}>Género</label>
                    <select
                      value={datosPacienteForm.genero}
                      onChange={e => setDatosPacienteForm({ ...datosPacienteForm, genero: e.target.value })}
                      style={sidebarInputStyle}
                    >
                      <option value="No especificado">No especificado</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label style={sidebarLabelStyle}>Teléfono (WhatsApp)</label>
                    <input
                      type="text"
                      placeholder="+56912345678"
                      value={datosPacienteForm.fono}
                      onChange={e => setDatosPacienteForm({ ...datosPacienteForm, fono: e.target.value })}
                      style={sidebarInputStyle}
                    />
                  </div>

                  <div>
                    <label style={sidebarLabelStyle}>Email</label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.cl"
                      value={datosPacienteForm.email}
                      onChange={e => setDatosPacienteForm({ ...datosPacienteForm, email: e.target.value })}
                      style={sidebarInputStyle}
                    />
                  </div>

                  <div>
                    <label style={sidebarLabelStyle}>Dirección</label>
                    <input
                      type="text"
                      placeholder="Dirección del paciente"
                      value={datosPacienteForm.direccion}
                      onChange={e => setDatosPacienteForm({ ...datosPacienteForm, direccion: e.target.value })}
                      style={sidebarInputStyle}
                    />
                  </div>

                  <div>
                    <label style={sidebarLabelStyle}>Contacto de Emergencia</label>
                    <input
                      type="text"
                      placeholder="Nombre y teléfono de emergencia"
                      value={datosPacienteForm.emergencia}
                      onChange={e => setDatosPacienteForm({ ...datosPacienteForm, emergencia: e.target.value })}
                      style={sidebarInputStyle}
                    />
                  </div>

                  <div>
                    <label style={sidebarLabelStyle}>Notas Clínicas Permanentes</label>
                    <textarea
                      rows={3}
                      placeholder="Diagnóstico base, alergias o antecedentes permanentes..."
                      value={datosPacienteForm.notas}
                      onChange={e => setDatosPacienteForm({ ...datosPacienteForm, notas: e.target.value })}
                      style={{ ...sidebarInputStyle, resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button
                      type="button"
                      disabled={guardandoDatosPaciente}
                      onClick={handleGuardarDatosPaciente}
                      style={{ flex: 1, backgroundColor: '#1a365d', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: '600', fontSize: '12.5px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                    >
                      <Check size={14} /> {guardandoDatosPaciente ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoDatosPaciente(false)}
                      style={{ backgroundColor: '#f1f5f9', color: '#475569', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: '600', fontSize: '12.5px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <X size={14} /> Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="ficha-main-content">
              <h3 style={{ margin: '0 0 20px 0', color: '#1a365d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 Sesiones Previas
              </h3>

              <div style={{ borderLeft: '2px solid #e2e8f0', marginLeft: '10px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', marginBottom: '40px' }}>
                {historialFichas.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>No hay evoluciones registradas para este paciente.</p>
                ) : (
                  historialFichas.map(cita => {
                    const fechaLimpia = String(cita.fecha).split('T')[0];
                    const [year, month, day] = fechaLimpia.split('-');
                    const horaLimpia = cita.hora_inicio ? String(cita.hora_inicio).substring(11, 16) : '';
                    const fechaFormateada = `${day}/${month}/${year} - ${horaLimpia} hrs`;

                    return cita.evoluciones_Sesion?.map((evo, i) => {
                      const estaEditandoEsta = evolucionEditandoId === evo.id_fichas;

                      return (
                        <div key={`evo-${cita.id_citas}-${evo.id_fichas || i}`} style={{ position: 'relative', marginBottom: '25px' }}>
                          <div style={timelineDotStyle}></div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                            <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>{fechaFormateada}</div>

                            {!estaEditandoEsta && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => iniciarEdicionEvolucion(evo)}
                                  style={{ backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Pencil size={12} /> Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    exportarPautaSesionPDF({
                                      pacienteNombre: pacienteActivo.nombre,
                                      pacienteRut: pacienteActivo.rut,
                                      fechaTexto: fechaFormateada,
                                      servicioNombre: 'Sesión Fonoaudiológica',
                                      observaciones: evo.observaciones_clinicas,
                                      tareas: evo.actividades_hogar,
                                      especialistaNombre: nombreEspecialistaActual,
                                      especialidad: 'Fonoaudiología Clínica'
                                    })
                                  }
                                  style={{ backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <FileDown size={12} /> Pauta PDF
                                </button>
                              </div>
                            )}
                          </div>

                          {!estaEditandoEsta ? (
                            <div style={{ backgroundColor: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                              <div style={{ fontSize: '14px', marginBottom: evo.actividades_hogar ? '10px' : '0', whiteSpace: 'pre-line' }}>
                                <strong style={{ color: '#1a365d' }}>Observaciones:</strong> <br />
                                {evo.observaciones_clinicas}
                              </div>
                              {evo.actividades_hogar && (
                                <div style={{ fontSize: '14px', color: '#475569', borderTop: '1px dashed #cbd5e1', paddingTop: '10px', whiteSpace: 'pre-line' }}>
                                  <strong style={{ color: '#1a365d' }}>Tareas asignadas:</strong> <br />
                                  {evo.actividades_hogar}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1a365d', marginBottom: '4px' }}>
                                  Editar Observaciones Clínicas
                                </label>
                                <textarea
                                  value={evoEditObs}
                                  onChange={e => setEvoEditObs(e.target.value)}
                                  style={{ ...textareaStyle, minHeight: '80px', backgroundColor: '#ffffff' }}
                                />
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1a365d', marginBottom: '4px' }}>
                                  Editar Tareas Asignadas
                                </label>
                                <textarea
                                  value={evoEditTareas}
                                  onChange={e => setEvoEditTareas(e.target.value)}
                                  style={{ ...textareaStyle, minHeight: '60px', backgroundColor: '#ffffff' }}
                                />
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#334155', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={evoReenviarWsp}
                                    onChange={e => setEvoReenviarWsp(e.target.checked)}
                                  />
                                  Reenviar actualización al WhatsApp del paciente
                                </label>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    type="button"
                                    disabled={guardandoEdicionEvo}
                                    onClick={() => handleGuardarEdicionEvolucion(evo.id_fichas)}
                                    style={{ backgroundColor: '#1a365d', color: '#ffffff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: '600', fontSize: '12.5px', cursor: 'pointer' }}
                                  >
                                    {guardandoEdicionEvo ? 'Guardando...' : 'Guardar cambios'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEvolucionEditandoId(null)}
                                    style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: '600', fontSize: '12.5px', cursor: 'pointer' }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })
                )}
              </div>

              <h3 style={{ margin: '0 0 20px 0', color: '#1a365d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Registrar Nueva Sesión
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Observaciones Clínicas</label>
                  <textarea 
                    placeholder="Ingresa las observaciones de hoy..." 
                    style={textareaStyle}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                  ></textarea>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Tareas Asignadas</label>
                  <textarea 
                    placeholder="Ejercicios para la casa..." 
                    style={{ ...textareaStyle, minHeight: '60px' }}
                    value={tareas}
                    onChange={(e) => setTareas(e.target.value)}
                  ></textarea>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button 
                    onClick={handleGuardarRegistro}
                    style={{ backgroundColor: '#1a365d', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#1e40af'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#1a365d'}
                  >
                    Guardar Registro
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NATIVO <dialog> PARA AÑADIR NUEVO PACIENTE */}
      <dialog
        ref={dialogNuevoPacRef}
        className="fonotrack-dialog"
        aria-labelledby={tituloModalId}
        {...({ closedby: 'any' })}
        onPointerDown={handleDialogPointerDown}
        onPointerUp={handleDialogPointerUp}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Directorio Clínico
            </div>
            <h2 id={tituloModalId} style={{ margin: '2px 0 0 0', fontSize: '20px', color: '#0f172a', fontFamily: 'inherit', fontWeight: '800' }}>
              Añadir Nuevo Paciente
            </h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar ventana"
            onClick={cerrarModalNuevoPaciente}
            style={{ backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCrearNuevoPaciente} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-grid-2">
            <div>
              <label style={sidebarLabelStyle}>Nombre Completo *</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej: María Ignacia Soto"
                value={nuevoPacForm.nombre_completo}
                onChange={e => setNuevoPacForm({ ...nuevoPacForm, nombre_completo: e.target.value })}
                style={sidebarInputStyle}
              />
            </div>

            <div>
              <label style={sidebarLabelStyle}>RUT *</label>
              <input
                type="text"
                required
                placeholder="Ej: 18.456.789-2"
                value={nuevoPacForm.rut}
                onChange={e => setNuevoPacForm({ ...nuevoPacForm, rut: e.target.value })}
                style={sidebarInputStyle}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label style={sidebarLabelStyle}>Teléfono / WhatsApp</label>
              <input
                type="text"
                placeholder="Ej: +56912345678"
                value={nuevoPacForm.telefono}
                onChange={e => setNuevoPacForm({ ...nuevoPacForm, telefono: e.target.value })}
                style={sidebarInputStyle}
              />
            </div>

            <div>
              <label style={sidebarLabelStyle}>Correo Electrónico</label>
              <input
                type="email"
                placeholder="paciente@correo.cl"
                value={nuevoPacForm.email}
                onChange={e => setNuevoPacForm({ ...nuevoPacForm, email: e.target.value })}
                style={sidebarInputStyle}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label style={sidebarLabelStyle}>Fecha de Nacimiento</label>
              <input
                type="date"
                value={nuevoPacForm.fecha_nacimiento}
                onChange={e => setNuevoPacForm({ ...nuevoPacForm, fecha_nacimiento: e.target.value })}
                style={sidebarInputStyle}
              />
            </div>

            <div>
              <label style={sidebarLabelStyle}>Género</label>
              <select
                value={nuevoPacForm.genero}
                onChange={e => setNuevoPacForm({ ...nuevoPacForm, genero: e.target.value })}
                style={sidebarInputStyle}
              >
                <option value="No especificado">No especificado</option>
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label style={sidebarLabelStyle}>Dirección</label>
              <input
                type="text"
                placeholder="Comuna / Calle"
                value={nuevoPacForm.direccion}
                onChange={e => setNuevoPacForm({ ...nuevoPacForm, direccion: e.target.value })}
                style={sidebarInputStyle}
              />
            </div>

            <div>
              <label style={sidebarLabelStyle}>Contacto de Emergencia / Tutor</label>
              <input
                type="text"
                placeholder="Nombre y teléfono"
                value={nuevoPacForm.emergencia}
                onChange={e => setNuevoPacForm({ ...nuevoPacForm, emergencia: e.target.value })}
                style={sidebarInputStyle}
              />
            </div>
          </div>

          <div>
            <label style={sidebarLabelStyle}>Notas Clínicas Iniciales / Diagnóstico</label>
            <textarea
              rows={3}
              placeholder="Antecedentes clínicos relevantes, motivo de consulta o derivación..."
              value={nuevoPacForm.notas}
              onChange={e => setNuevoPacForm({ ...nuevoPacForm, notas: e.target.value })}
              style={{ ...sidebarInputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={cerrarModalNuevoPaciente}
              style={{ backgroundColor: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardandoNuevoPac}
              style={{ backgroundColor: '#1a365d', color: '#ffffff', border: 'none', padding: '10px 22px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
            >
              {guardandoNuevoPac ? 'Guardando...' : 'Registrar Paciente'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

const thStyle = { padding: '16px 24px', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' };
const tdStyle = { padding: '16px 24px', color: '#475569', fontSize: '14px' };
function InfoRow({ label, value }) { return (<div style={{ display: 'flex', alignItems: 'flex-start' }}><div style={{ width: '100px', fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{label}</div><div style={{ flex: 1, fontSize: '14px', color: '#0f172a', fontWeight: '500', whiteSpace: 'pre-line' }}>{value}</div></div>); }
const timelineDotStyle = { position: 'absolute', left: '-25px', top: '2px', width: '10px', height: '10px', backgroundColor: '#3b82f6', borderRadius: '50%', border: '3px solid white', boxShadow: '0 0 0 1px #e2e8f0' };
const textareaStyle = { width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical' };
const sidebarLabelStyle = { display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' };
const sidebarInputStyle = { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '13px', color: '#0f172a', backgroundColor: '#ffffff' };