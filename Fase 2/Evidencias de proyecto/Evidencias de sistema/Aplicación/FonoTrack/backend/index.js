const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json()); 


//GETS DE PACIENTES Y PLANES

app.get('/api/planes', async (req, res) => {
  try {
    const listaPlanes = await prisma.planes.findMany();
    res.json(listaPlanes);
  } catch (error) {
    res.status(500).json({ error: "Hubo un problema al buscar los planes" });
  }
});

app.post('/api/pacientes', async (req, res) => {
  try {
    const { id_usuario, nombre_completo, rut, telefono } = req.body; 

    const pacienteExistente = await prisma.pacientes.findUnique({
      where: { rut: rut }
    });

    if (pacienteExistente) {
      return res.status(200).json(pacienteExistente);
    }

    const pacienteNuevo = await prisma.pacientes.create({
      data: {
        id_usuario: parseInt(id_usuario),
        nombre_completo: nombre_completo,
        rut: rut,
        telefono: telefono,
        fecha_nacimiento: new Date('2000-01-01') 
      }
    });

    res.status(201).json(pacienteNuevo); 
  } catch (error) {
    res.status(500).json({ mensaje: "Error al crear el paciente", detalle: error.message });
  }
});

app.get('/api/pacientes', async (req, res) => {
  try {
    const todosLosPacientes = await prisma.pacientes.findMany();
    res.status(200).json(todosLosPacientes);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al buscar pacientes", detalle: error.message });
  }
});

app.get('/api/pacientes/:id', async (req, res) => {
  try {
    const idBuscado = parseInt(req.params.id); 
    const paciente = await prisma.pacientes.findUnique({
      where: { id_paciente: idBuscado }
    });
    if (!paciente) return res.status(404).json({ mensaje: "Paciente no encontrado" });
    res.status(200).json(paciente);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al buscar el paciente", detalle: error.message });
  }
});

app.put('/api/pacientes/:id', async (req, res) => {
  try {
    const idBuscado = parseInt(req.params.id);
    const { telefono, direccion } = req.body;
    const pacienteActualizado = await prisma.pacientes.update({
      where: { id_paciente: idBuscado },
      data: { telefono: telefono, direccion: direccion }
    });
    res.status(200).json(pacienteActualizado);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar", detalle: error.message });
  }
});

app.delete('/api/pacientes/:id', async (req, res) => {
  try {
    const idBuscado = parseInt(req.params.id);
    await prisma.pacientes.delete({
      where: { id_paciente: idBuscado }
    });
    res.status(200).json({ mensaje: "Paciente eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al eliminar", detalle: error.message });
  }
});


app.get('/api/fonoaudiologos', async (req, res) => {
  try {
    // Buscamos los catálogos por separado para evitar el error de relación en Prisma
    const listaProfesionales = await prisma.fonoaudiologos.findMany();
    const todosServicios = await prisma.servicios.findMany();
    const todaDisponibilidad = await prisma.disponibilidad.findMany();

    // Cruzamos la información manualmente
    const directorioCompleto = listaProfesionales.map(prof => {
      return {
        ...prof,
        servicios: todosServicios.filter(s => s.id_fonoaudiologo === prof.id_fonoaudiologo),
        disponibilidad: todaDisponibilidad.filter(d => d.id_fonoaudiologo === prof.id_fonoaudiologo)
      };
    });

    res.status(200).json(directorioCompleto);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al cargar el directorio", detalle: error.message });
  }
});

app.get('/api/fonoaudiologos/:id', async (req, res) => {
  try {
    const idFono = parseInt(req.params.id);
    const perfil = await prisma.fonoaudiologos.findUnique({
      where: { id_fonoaudiologo: idFono }
    });
    
    if (!perfil) {
      return res.status(404).json({ error: "Profesional no encontrado" });
    }
    
    res.status(200).json(perfil);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar el perfil individual", detalle: error.message });
  }
});

app.get('/api/servicios', async (req, res) => {
  try {
    const { id_fonoaudiologo } = req.query;
    if (!id_fonoaudiologo || id_fonoaudiologo === 'undefined' || id_fonoaudiologo === 'null') {
      return res.status(400).json({ error: "ID faltante" });
    }
    const servicios = await prisma.servicios.findMany({
      where: { id_fonoaudiologo: parseInt(id_fonoaudiologo) }
    });
    res.status(200).json(servicios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/disponibilidad', async (req, res) => {
  try {
    const { id_fonoaudiologo, id_servicio } = req.query;
    if (!id_fonoaudiologo || id_fonoaudiologo === 'undefined' || id_fonoaudiologo === 'null') {
      return res.status(400).json({ error: "ID faltante" });
    }
    const filtro = { id_fonoaudiologo: parseInt(id_fonoaudiologo) };
    if (id_servicio) filtro.id_servicio = parseInt(id_servicio);

    const horarios = await prisma.disponibilidad.findMany({
      where: filtro
    });
    res.status(200).json(horarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/servicios', async (req, res) => {
  try {
    const { id_fonoaudiologo, nombre, precio } = req.body;
    const nuevoServicio = await prisma.servicios.create({
      data: {
        id_fonoaudiologo: parseInt(id_fonoaudiologo),
        nombre_servicio: nombre,
        precio: parseInt(precio)
      }
    });
    res.status(201).json(nuevoServicio);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al crear el servicio", detalle: error.message });
  }
});

app.post('/api/disponibilidad', async (req, res) => {
  try {
    const { id_fonoaudiologo, id_servicio, dia, inicio, fin } = req.body;
    if (!id_fonoaudiologo || isNaN(id_fonoaudiologo)) return res.status(400).json({ error: "ID de fonoaudiólogo inválido" });
    if (!id_servicio || isNaN(id_servicio)) return res.status(400).json({ error: "ID de servicio inválido" });

    const horaInicio = new Date(`1970-01-01T${inicio}:00.000Z`);
    const horaFin = new Date(`1970-01-01T${fin}:00.000Z`);

    const nuevaDisponibilidad = await prisma.disponibilidad.create({
      data: {
        id_fonoaudiologo: parseInt(id_fonoaudiologo),
        id_servicio: parseInt(id_servicio),
        dia_semana: dia,
        hora_inicio: horaInicio,
        hora_fin: horaFin
      }
    });
    res.status(201).json(nuevaDisponibilidad);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al crear disponibilidad", detalle: error.message });
  }
});

app.put('/api/servicios/:id', async (req, res) => {
  try {
    const idServicio = parseInt(req.params.id);
    const { nombre, precio } = req.body;
    const actualizado = await prisma.servicios.update({
      where: { id_servicios: idServicio },
      data: { nombre_servicio: nombre, precio: parseInt(precio) }
    });
    res.status(200).json(actualizado);
  } catch (error) {
    res.status(500).json({ mensaje: "Error", detalle: error.message });
  }
});

app.delete('/api/servicios/:id', async (req, res) => {
  try {
    const idServicio = parseInt(req.params.id);
    await prisma.servicios.delete({ where: { id_servicios: idServicio } });
    res.status(200).json({ mensaje: "Ok" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error", detalle: error.message });
  }
});

app.put('/api/disponibilidad/:id', async (req, res) => {
  try {
    const idDisp = parseInt(req.params.id);
    const { dia, inicio, fin } = req.body;
    const horaInicio = new Date(`1970-01-01T${inicio}:00.000Z`);
    const horaFin = new Date(`1970-01-01T${fin}:00.000Z`);
    
    const actualizado = await prisma.disponibilidad.update({
      where: { id_disponibilidad: idDisp },
      data: { dia_semana: dia, hora_inicio: horaInicio, hora_fin: horaFin }
    });
    res.status(200).json(actualizado);
  } catch (error) {
    res.status(500).json({ mensaje: "Error", detalle: error.message });
  }
});

app.delete('/api/disponibilidad/:id', async (req, res) => {
  try {
    const idDisp = parseInt(req.params.id);
    await prisma.disponibilidad.delete({ where: { id_disponibilidad: idDisp } });
    res.status(200).json({ mensaje: "Ok" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error", detalle: error.message });
  }
});

//GET CITAS, EL GET PARA LAS CITAS OCUPADAS
app.get('/api/citas/ocupadas', async (req, res) => {
  try {
    const { fecha, id_fonoaudiologo } = req.query;
    if (!fecha || !id_fonoaudiologo) return res.status(400).json({ mensaje: "Faltan parámetros" });

    const soloFecha = String(fecha).split('T')[0];
    const citasOcupadas = await prisma.citas.findMany({
      where: {
        fecha: new Date(`${soloFecha}T00:00:00.000Z`),
        id_fonoaudiologo: Number(id_fonoaudiologo)
      },
      select: { hora_inicio: true }
    });

    const horasOcupadas = citasOcupadas.map(cita => {
      const match = String(cita.hora_inicio).match(/\d{2}:\d{2}/);
      return match ? match[0] : null;
    }).filter(Boolean);

    res.json(horasOcupadas);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al consultar horas ocupadas", detalle: error.message });
  }
});


//POST CITAS: Crear una nueva hora 

app.post('/api/citas', async (req, res) => {
  try {
    const { id_paciente, id_fonoaudiologo, id_servicio, fecha, hora_inicio, duracion_minutos, precio } = req.body;

    const soloFecha = String(fecha).split('T')[0];
    let horaLimpia = "00:00";
    if (hora_inicio) {
      const coincidencia = String(hora_inicio).match(/\d{2}:\d{2}/);
      if (coincidencia) horaLimpia = coincidencia[0]; 
    }
    const fechaHoraInicio = new Date(`${soloFecha}T${horaLimpia}:00.000Z`);

    const nuevaCita = await prisma.citas.create({
      data: {
        id_paciente: Number(id_paciente),
        id_fonoaudiologo: Number(id_fonoaudiologo),
        id_servicio: Number(id_servicio),
        fecha: new Date(`${soloFecha}T00:00:00.000Z`),
        hora_inicio: fechaHoraInicio,
        duracion_minutos: Number(duracion_minutos),
        precio: Number(precio),
        estado_pago: "Pagado", 
        estado_asistencia: "Pendiente"
      }
    });

    res.status(201).json(nuevaCita);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al guardar la cita", detalle: error.message });
  }
});


// GET CITAS, Leer el calendario de horas 

app.get('/api/citas', async (req, res) => {
  try {
    const { id_fonoaudiologo } = req.query;
    const condicion = id_fonoaudiologo ? { where: { id_fonoaudiologo: parseInt(id_fonoaudiologo) } } : {}; 
    
    //Buscamos el historial básico
    const historialCitas = await prisma.citas.findMany(condicion);
    
    //Buscamos los catálogos para cruzar
    const listaPacientes = await prisma.pacientes.findMany();
    const listaServicios = await prisma.servicios.findMany();

    //Cruzamos la información
    const citasCompletas = historialCitas.map(cita => {
        const paciente = listaPacientes.find(p => p.id_paciente === cita.id_paciente);
        const servicio = listaServicios.find(s => s.id_servicios === cita.id_servicio);
        
        return {
            ...cita,
            nombre_paciente: paciente ? paciente.nombre_completo : `Paciente #${cita.id_paciente}`,
            nombre_servicio: servicio ? servicio.nombre_servicio : `Servicio #${cita.id_servicio}`
        };
    });

    res.status(200).json(citasCompletas);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al buscar citas", detalle: error.message });
  }
});

app.put('/api/citas/:id/pago', async (req, res) => {
  try {
    const idCita = parseInt(req.params.id);
    const citaActualizada = await prisma.citas.update({
      where: { id_citas: idCita },
      data: { estado_pago: 'Pagado' }
    });
    res.status(200).json(citaActualizada);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar pago", detalle: error.message });
  }
});

// AUTENTICACIÓN: Registro y Login

app.post('/api/registro', async (req, res) => {
  try {
    const { nombre, email, password, rol, rut, fechaNacimiento, genero } = req.body;

    const resultado = await prisma.$transaction(async (tx) => {
      const nuevoUsuario = await tx.usuarios.create({
        data: {
          email: email,
          contrasena: password,
          rol: rol }
      });

      if (rol === 'fonoaudiologo') {
        await tx.fonoaudiologos.create({
          data: {
            id_usuario: nuevoUsuario.id_usuario,
            nombre_completo: nombre,
            rut: `PD-${Date.now().toString().slice(-6)}`,
            subespecialidad: 'General',
            acerca_de_mi: 'Nuevo profesional en FonoTrack'
          }
        });
      } else if (rol === 'paciente') {
        await tx.pacientes.create({
          data: {
            id_usuario: nuevoUsuario.id_usuario,
            nombre_completo: nombre,
            rut: rut,
            fecha_nacimiento: new Date(fechaNacimiento),
            genero: genero
          }
        });
      }
      return nuevoUsuario;
    });

    res.status(201).json(resultado);

  } catch (error) {
    console.error("Error al registrar:", error);
    res.status(500).json({ mensaje: "Error al registrar la cuenta", detalle: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await prisma.usuarios.findUnique({ where: { email: email } });

    if (!usuario || usuario.contrasena !== password) {
      return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });
    }

    let perfilId = null;
    if (usuario.rol === 'fonoaudiologo') {
      const perfilFono = await prisma.fonoaudiologos.findFirst({ where: { id_usuario: usuario.id_usuario } });
      perfilId = perfilFono ? perfilFono.id_fonoaudiologo : null;
    }

    res.status(200).json({ ...usuario, perfilId });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al iniciar sesión", detalle: error.message });
  }
});


// MÓDULO BUISNESS INTELLEGINCE Estadísticas, Privadas por Profesional (GET)

app.get('/api/estadisticas', async (req, res) => {
  try {
    const { id_fonoaudiologo } = req.query;
    if (!id_fonoaudiologo) return res.status(400).json({ mensaje: "Se requiere el ID del profesional." });

    const fonoId = parseInt(id_fonoaudiologo);
    const filtroPrivado = { id_fonoaudiologo: fonoId };

    const todasLasCitas = await prisma.citas.findMany({ where: filtroPrivado });
    const todosLosServicios = await prisma.servicios.findMany();

    const ingresos = await prisma.citas.aggregate({
      _sum: { precio: true },
      where: { estado_pago: 'Pagado', ...filtroPrivado }
    });
    const totalDinero = ingresos._sum.precio || 0;
    
    const totalCitas = todasLasCitas.length;
    const asistencias = todasLasCitas.filter(c => c.estado_asistencia === 'Asistió').length;
    const porcentajeAsistencia = totalCitas > 0 ? Math.round((asistencias / totalCitas) * 100) : 0;

    const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const agrupadoPorTiempo = { semanal: {}, mensual: {}, anual: {} };

    const ahora = new Date();
    const hace7Dias = new Date();
    hace7Dias.setDate(ahora.getDate() - 7);
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    const servSemanal = {};
    const servMensual = {};
    const servAnual = {};

    const sumarServicio = (obj, id, precio, estado_pago) => {
      if (!obj[id]) obj[id] = { cantidad: 0, ingresos: 0 };
      obj[id].cantidad++; 
      if (estado_pago === 'Pagado') obj[id].ingresos += precio; 
    };

    todasLasCitas.forEach(cita => {
      if (!cita.fecha) return;
      const f = new Date(cita.fecha);

      const dia = diasNombres[f.getDay()];
      const mes = mesesNombres[f.getMonth()];
      const anio = f.getFullYear().toString();

      if (!agrupadoPorTiempo.semanal[dia]) agrupadoPorTiempo.semanal[dia] = { periodo: dia, asistencias: 0, inasistencias: 0 };
      if (!agrupadoPorTiempo.mensual[mes]) agrupadoPorTiempo.mensual[mes] = { periodo: mes, asistencias: 0, inasistencias: 0 };
      if (!agrupadoPorTiempo.anual[anio]) agrupadoPorTiempo.anual[anio] = { periodo: anio, asistencias: 0, inasistencias: 0 };

      if (cita.estado_asistencia === 'Asistió' || cita.estado_asistencia === 'Pendiente') {
        agrupadoPorTiempo.semanal[dia].asistencias++; agrupadoPorTiempo.mensual[mes].asistencias++; agrupadoPorTiempo.anual[anio].asistencias++;
      } else {
        agrupadoPorTiempo.semanal[dia].inasistencias++; agrupadoPorTiempo.mensual[mes].inasistencias++; agrupadoPorTiempo.anual[anio].inasistencias++;
      }

      const servId = cita.id_servicio;
      const precio = cita.precio || 0;
      
      if (f >= hace7Dias) sumarServicio(servSemanal, servId, precio, cita.estado_pago);
      if (f.getMonth() === mesActual && f.getFullYear() === anioActual) sumarServicio(servMensual, servId, precio, cita.estado_pago);
      if (f.getFullYear() === anioActual) sumarServicio(servAnual, servId, precio, cita.estado_pago);
    });

    const formatearTop = (conteo) => {
      return Object.keys(conteo).map(id => {
        const info = todosLosServicios.find(s => s.id_servicios === parseInt(id));
        return {
          nombre: info ? info.nombre_servicio : `Servicio ID ${id}`,
          cantidad: conteo[id].cantidad,
          ingresos: conteo[id].ingresos
        };
      }).sort((a, b) => b.cantidad - a.cantidad).slice(0, 4);
    };

    const serviciosProcesados = {
      semanal: formatearTop(servSemanal),
      mensual: formatearTop(servMensual),
      anual: formatearTop(servAnual)
    };

    const servicioTop = serviciosProcesados.anual.length > 0 ? serviciosProcesados.anual[0] : { nombre: 'Sin datos', cantidad: 0 };
    const porcentajeTop = totalCitas > 0 ? Math.round((servicioTop.cantidad / totalCitas) * 100) : 0;

    res.status(200).json({
      asistenciaPromedio: `${porcentajeAsistencia}%`,
      servicioTopNombre: servicioTop.nombre,
      servicioTopPorcentaje: `${porcentajeTop}%`,
      ingresosProyectados: `$${(totalDinero / 1000000).toFixed(1)} M`,
      ingresos_totales: totalDinero,
      datosPorTiempo: {
        semanal: Object.values(agrupadoPorTiempo.semanal),
        mensual: Object.values(agrupadoPorTiempo.mensual),
        anual: Object.values(agrupadoPorTiempo.anual)
      },
      distribucionServicios: serviciosProcesados
    });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al calcular BI", detalle: error.message });
  }
});




// FICHAS CLÍNICAS: Guardar y anotar observaciones


// POST, Guardar una nueva observación clínica (Con el nombre exacto de tu schema)
app.post('/api/fichas', async (req, res) => {
  try {
    const { id_cita, observaciones_clinicas, actividades_hogar } = req.body;
    
    // Usamos evoluciones_sesion TODO EN MINÚSCULA tal cual está en tu schema
    const nuevaFicha = await prisma.evoluciones_sesion.create({
      data: {
        id_cita: parseInt(id_cita),
        observaciones_clinicas: observaciones_clinicas,
        actividades_hogar: actividades_hogar || ""
      }
    });
    
    res.status(201).json(nuevaFicha);
  } catch (error) {
    console.error("Error al guardar la ficha:", error);
    res.status(500).json({ mensaje: "Error al guardar la ficha", detalle: error.message });
  }
});

// GET, Leer el historial clínico (include daba error, así que usamos esto)
app.get('/api/fichas/:id_paciente', async (req, res) => {
  try {
    const idPaciente = parseInt(req.params.id_paciente);
    
    // Buscamos todas las citas de este paciente
    const historialCitas = await prisma.citas.findMany({
      where: { id_paciente: idPaciente },
      orderBy: { fecha: 'desc' }
    });
    
    if (historialCitas.length === 0) return res.status(200).json([]);

    // Extraemos los IDs de las citas que encontramos
    const idsCitas = historialCitas.map(c => c.id_citas);

    // Buscamos todas las evoluciones que correspondan a esas citas
    const evoluciones = await prisma.evoluciones_sesion.findMany({
      where: { id_cita: { in: idsCitas } }
    });

    // Cruzamos los datos manualmente en Node.js
    const citasConFicha = historialCitas.map(cita => {
      // Filtramos las evoluciones que le pertenecen solo a esta cita en específico
      const evolucionesDeEstaCita = evoluciones.filter(evo => evo.id_cita === cita.id_citas);
      
      return {
        ...cita,
        // Le pasamos la S mayúscula a React porque así lo programamos en el PanelPacientes.jsx
        evoluciones_Sesion: evolucionesDeEstaCita 
      };
    }).filter(cita => cita.evoluciones_Sesion.length > 0); // Ocultamos las citas que aún no tienen diagnóstico escrito
    
    res.status(200).json(citasConFicha);
  } catch (error) {
    console.error("Error al cargar el historial:", error);
    res.status(500).json({ mensaje: "Error al cargar el historial", detalle: error.message });
  }
});

// Arrancar el server
app.listen(PORT, () => {
  console.log(` Servidor FonoTrack corriendo perfectamente en http://localhost:${PORT}`);
});