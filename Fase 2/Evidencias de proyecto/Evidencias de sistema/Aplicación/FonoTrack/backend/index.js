require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

const { GoogleGenerativeAI } = require("@google/generative-ai");

app.use(cors()); 
app.use(express.json()); 

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-')); 
  }
});
const upload = multer({ storage: storage });


// GETS DE PACIENTES Y PLANES

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

app.get('/api/comunas', async (req, res) => {
  try {
    const comunas = await prisma.ubicacion.findMany({
      orderBy: { comuna: 'asc' }
    });
    res.json(comunas);
  } catch (error) {
    console.error("Error al obtener comunas:", error);
    res.status(500).json({ error: "Hubo un problema al buscar las comunas" });
  }
});

// NUEVO: Extraer el catálogo oficial de servicios desde MySQL (filtrable por Infantil o Adultos)
app.get('/api/catalogo-servicios', async (req, res) => {
  try {
    const { publico } = req.query;
    const filtro = (publico && publico !== 'Ambos') 
      ? { where: { publico_objetivo: publico } } 
      : {};

    const catalogo = await prisma.catalogo_servicios.findMany(filtro);
    res.status(200).json(catalogo);
  } catch (error) {
    console.error("Error al obtener catálogo de servicios:", error);
    res.status(500).json({ error: "Hubo un problema al cargar el catálogo de servicios" });
  }
});

app.get('/api/fonoaudiologos', async (req, res) => {
  try {
    const listaProfesionales = await prisma.fonoaudiologos.findMany({
      include: {
        ubicacion: true
      }
    });
    const todosServicios = await prisma.servicios.findMany();
    const todaDisponibilidad = await prisma.disponibilidad.findMany();
    const todosUsuarios = await prisma.usuarios.findMany({
      select: { id_usuario: true, email: true }
    });

    const directorioCompleto = listaProfesionales.map(prof => {
      const usuario = todosUsuarios.find(u => u.id_usuario === prof.id_usuario);
      return {
        ...prof, // <-- Mantiene nombre_completo, telefono, subespecialidad, etc.
        email: usuario ? usuario.email : null,
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

// ACTUALIZADO: Ahora también recibe y guarda publico_objetivo ('Infantil', 'Adultos' o 'Ambos')

app.put('/api/fonoaudiologos/:id', upload.single('foto_archivo'), async (req, res) => {
  try {
    const idFono = parseInt(req.params.id);
    const { nombre_completo, subespecialidad, publico_objetivo, acerca_de_mi, id_ubicacion, foto_perfil, telefono } = req.body;
    
    let rutaImagen = foto_perfil;
    if (req.file) {
      rutaImagen = `http://localhost:3000/uploads/${req.file.filename}`;
    }

    const perfilActualizado = await prisma.fonoaudiologos.update({
      where: { id_fonoaudiologo: idFono },
      data: { 
        nombre_completo,
        subespecialidad,
        publico_objetivo: publico_objetivo || 'Ambos',
        acerca_de_mi,
        foto_perfil: rutaImagen,
	      telefono,
        id_ubicacion: id_ubicacion ? parseInt(id_ubicacion) : null 
      }
    });
    
    res.status(200).json(perfilActualizado);
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ mensaje: "Error al actualizar", detalle: error.message });
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

// ACTUALIZADO: Guarda tanto el id_catalogo compartido como el nombre_servicio y precio
app.post('/api/servicios', async (req, res) => {
  try {
    const { id_fonoaudiologo, id_catalogo, nombre, precio } = req.body;
    const nuevoServicio = await prisma.servicios.create({
      data: {
        id_fonoaudiologo: parseInt(id_fonoaudiologo),
        id_catalogo: id_catalogo ? parseInt(id_catalogo) : null,
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

// ACTUALIZADO: Permite actualizar id_catalogo además de nombre y precio
app.put('/api/servicios/:id', async (req, res) => {
  try {
    const idServicio = parseInt(req.params.id);
    const { id_catalogo, nombre, precio } = req.body;
    const actualizado = await prisma.servicios.update({
      where: { id_servicios: idServicio },
      data: { 
        id_catalogo: id_catalogo ? parseInt(id_catalogo) : undefined,
        nombre_servicio: nombre, 
        precio: parseInt(precio) 
      }
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

// GET CITAS OCUPADAS
app.get('/api/citas/ocupadas', async (req, res) => {
  try {
    const { fecha, id_fonoaudiologo } = req.query;
    if (!fecha || !id_fonoaudiologo) return res.status(400).json({ mensaje: "Faltan parámetros" });

    const soloFecha = String(fecha).split('T')[0];
    const citasOcupadas = await prisma.citas.findMany({
      where: {
        fecha: new Date(`${soloFecha}T00:00:00.000Z`),
        id_fonoaudiologo: Number(id_fonoaudiologo),
        estado_asistencia: { not: 'Anulada' },
        estado_pago: { in: ['Pagado', 'Pendiente'] } // Si una cita pasa a 'Cancelado', libera la hora
      },
      select: { hora_inicio: true }
    });

    
    // Extraemos los 5 caracteres de la hora ("HH:MM") de forma estándar (en vez de la del equipo local)
    const horasOcupadas = citasOcupadas.map(cita => {
      return cita.hora_inicio ? cita.hora_inicio.toISOString().substring(11, 16) : null;
    }).filter(Boolean);

    res.json(horasOcupadas);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al consultar horas ocupadas", detalle: error.message }); // Error de extracción
  }
});
// POST CITAS
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


// PUT CITAS: CONFIRMAR O ANULAR

app.put('/api/citas/:id/estado', async (req, res) => {
  try {
    const idCita = Number(req.params.id);
    const { estado_asistencia } = req.body; // Recibirá 'Confirmada' o 'Anulada'

    // Si el paciente anula, cambiamos el pago a Cancelado para liberar la hora en el directorio
    const estadoPago = estado_asistencia === 'Anulada' ? 'Cancelado' : undefined;

    const citaActualizada = await prisma.citas.update({
      where: { id_citas: idCita },
      data: { 
        estado_asistencia: estado_asistencia,
        ...(estadoPago && { estado_pago: estadoPago }) 
      }
    });

    res.status(200).json(citaActualizada);
  } catch (error) {
    console.error(" Error al actualizar estado de la cita:", error);
    res.status(500).json({ mensaje: "Error al actualizar la cita", detalle: error.message });
  }
});

app.put('/api/citas/:id', async (req, res) => {
  try {
    const idBuscado = parseInt(req.params.id);

    const citaActualizada = await prisma.citas.update({
      where: { id_citas: idBuscado },
      data: { estado_pago: 'Pagado' }
    });

    console.log(`Pago actualizado para la cita ID: ${idBuscado}`);
    res.status(200).json(citaActualizada);
  } catch (error) {
    console.error("Error al actualizar pago:", error);
    res.status(500).json({ mensaje: "Error al actualizar la cita", detalle: error.message });
  }
});

// GET CITAS
app.get('/api/citas', async (req, res) => {
  try {
    const { id_fonoaudiologo } = req.query;
    const condicion = id_fonoaudiologo ? { where: { id_fonoaudiologo: parseInt(id_fonoaudiologo) } } : {}; 
    
    const historialCitas = await prisma.citas.findMany(condicion);
    const listaPacientes = await prisma.pacientes.findMany();
    const listaServicios = await prisma.servicios.findMany();

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
          rol: rol 
        }
      });

      if (rol === 'fonoaudiologo') {
        await tx.fonoaudiologos.create({
          data: {
            id_usuario: nuevoUsuario.id_usuario,
            nombre_completo: nombre,
            rut: `PD-${Date.now().toString().slice(-6)}`,
            subespecialidad: 'General',
            publico_objetivo: 'Ambos',
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
    let nombre = "Usuario";

    if (usuario.rol === 'fonoaudiologo') {
      const perfil = await prisma.fonoaudiologos.findFirst({ where: { id_usuario: usuario.id_usuario } });
      perfilId = perfil ? perfil.id_fonoaudiologo : null;
      nombre = perfil ? perfil.nombre_completo : "Fonoaudiólogo";

    } else if (usuario.rol === 'paciente') {
      const perfil = await prisma.pacientes.findFirst({ where: { id_usuario: usuario.id_usuario } });
      perfilId = perfil ? perfil.id_paciente : null;
      nombre = perfil ? perfil.nombre_completo : "Paciente";
    }

    console.log("Inicio de sesión exitoso:", usuario.email);
    res.status(200).json({ ...usuario, perfilId, nombre });

  } catch (error) {
    res.status(500).json({ mensaje: "Error al iniciar sesión", detalle: error.message });
  }
});

// MÓDULO BUSINESS INTELLIGENCE Estadísticas Privadas por Profesional (GET)
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
app.post('/api/fichas', async (req, res) => {
  try {
    const { id_cita, observaciones_clinicas, actividades_hogar } = req.body;
    
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

app.get('/api/fichas/:id_paciente', async (req, res) => {
  try {
    const idPaciente = parseInt(req.params.id_paciente);
    
    const historialCitas = await prisma.citas.findMany({
      where: { id_paciente: idPaciente },
      orderBy: { fecha: 'desc' }
    });
    
    if (historialCitas.length === 0) return res.status(200).json([]);

    const idsCitas = historialCitas.map(c => c.id_citas);

    const evoluciones = await prisma.evoluciones_sesion.findMany({
      where: { id_cita: { in: idsCitas } }
    });

    const citasConFicha = historialCitas.map(cita => {
      const evolucionesDeEstaCita = evoluciones.filter(evo => evo.id_cita === cita.id_citas);
      
      return {
        ...cita,
        evoluciones_Sesion: evolucionesDeEstaCita 
      };
    }).filter(cita => cita.evoluciones_Sesion.length > 0);
    
    res.status(200).json(citasConFicha);
  } catch (error) {
    console.error("Error al cargar el historial:", error);
    res.status(500).json({ mensaje: "Error al cargar el historial", detalle: error.message });
  }
});

// RESEÑAS: Guardar y leer comentarios
app.post('/api/resenas', async (req, res) => {
  try {
    const { id_paciente, id_fonoaudiologo, calificacion, comentario } = req.body;
    
    const nuevaResena = await prisma.resenas.create({
      data: {
        id_paciente: parseInt(id_paciente),
        id_fonoaudiologo: parseInt(id_fonoaudiologo),
        calificacion: parseInt(calificacion),
        comentario: comentario
      }
    });
    
    res.status(201).json(nuevaResena);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al guardar la reseña", detalle: error.message });
  }
});

app.get('/api/resenas/:id_fonoaudiologo', async (req, res) => {
  try {
    const idFono = parseInt(req.params.id_fonoaudiologo);
    
    const listaResenas = await prisma.resenas.findMany({
      where: { id_fonoaudiologo: idFono },
      orderBy: { fecha_creacion: 'desc' }
    });

    const todosLosPacientes = await prisma.pacientes.findMany();
    
    const resenasCompletas = listaResenas.map(resena => {
      const paciente = todosLosPacientes.find(p => p.id_paciente === resena.id_paciente);
      return {
        ...resena,
        nombre_paciente: paciente ? paciente.nombre_completo : "Paciente Anónimo"
      };
    });

    res.status(200).json(resenasCompletas);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al cargar reseñas", detalle: error.message });
  }
});

//post para el chatbot

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
  try {
    const { mensaje } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

    // Prompt estricto que limita la IA a las especialidades del proyecto
    const promptContexto = `Eres un asistente de derivación médica virtual para la plataforma FonoTrack.
    Tu único objetivo es leer los síntomas o problemas del paciente y recomendarle a cuál de las siguientes subespecialidades fonoaudiológicas debe acudir:
    ('Evaluación del lenguaje infantil', 'Infantil'),
    ('Terapia de Trastorno del Espectro Autista (TEA)', 'Infantil'),
    ('Evaluación y terapia de frenillo lingual', 'Infantil'),
    ('Terapia de motricidad orofacial infantil', 'Infantil'),
    ('Terapia de habla y articulación (Dislalia)', 'Infantil'),
    ('Evaluación y rehabilitación vocal (Voz)', 'Adultos'),
    ('Rehabilitación cognitiva y lenguaje post ACV', 'Adultos'),
    ('Evaluación y terapia de deglución (Disfagia)', 'Adultos'),
    ('Rehabilitación auditiva y vestibular', 'Adultos'),
    ('Terapia de fluidez verbal (Adultos)', 'Adultos'),
    ('Lavado de oídos infantil (Extracción de cerumen)', 'Infantil'),
    ('Lavado de oídos adultos (Extracción de cerumen)', 'Adultos');

    REGLAS ESTRICTAS:
    1. Bajo ninguna circunstancia entregues un diagnóstico médico.
    2. Sé muy empático, claro y breve (máximo 3 o 4 líneas de respuesta).
    3. Termina tu respuesta indicando explícitamente el nombre de la subespecialidad de la lista anterior que mejor se ajuste.
    
    Síntomas del paciente: "${mensaje}"`;

    const result = await model.generateContent(promptContexto);
    const respuestaIA = result.response.text();

    res.status(200).json({ respuesta: respuestaIA });
  } catch (error) {
    console.error("Error en el chatbot:", error);
    res.status(500).json({ error: "No se pudo procesar la consulta clínica." });
  }
});

// Arrancar el server
app.listen(PORT, () => {
  console.log(` Servidor FonoTrack corriendo perfectamente en http://localhost:${PORT}`);
});