const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

// Inicializamos la aplicación y las herramientas de Prisma
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middlewares (Configuraciones de seguridad y formato de datos)
app.use(cors()); // Permitirá que tu futuro Frontend en React se conecte
app.use(express.json()); // Permite leer datos en formato JSON

// --- RUTAS DE NUESTRA API ---

// Ruta de prueba: Obtener los planes de suscripción
app.get('/api/planes', async (req, res) => {
  try {
    const listaPlanes = await prisma.planes.findMany();
    res.json(listaPlanes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Hubo un problema al buscar los planes" });
  }
});

// POST: Ruta para agregar un nuevo paciente
app.post('/api/pacientes', async (req, res) => {
  try {
    const { id_usuario, nombre_completo, rut, telefono } = req.body; 

    const pacienteNuevo = await prisma.pacientes.create({
      data: {
        id_usuario: parseInt(id_usuario),
        nombre_completo: nombre_completo,
        rut: rut,
        telefono: telefono
      }
    });

    res.status(201).json(pacienteNuevo); 
  } catch (error) {
    console.error("❌ Hubo un error al guardar en MySQL:", error);
    res.status(500).json({ mensaje: "Error al crear el paciente", detalle: error.message });
  }
});

// R: LEER (GET) - Traer todos los pacientes
app.get('/api/pacientes', async (req, res) => {
  try {
    const todosLosPacientes = await prisma.pacientes.findMany();
    res.status(200).json(todosLosPacientes);
  } catch (error) {
    console.error("❌ Error al buscar pacientes:", error);
    res.status(500).json({ mensaje: "Error al buscar pacientes", detalle: error.message });
  }
});

// R: LEER UNO (GET) - Buscar por ID exacto
app.get('/api/pacientes/:id', async (req, res) => {
  try {
    const idBuscado = parseInt(req.params.id); 
    
    const paciente = await prisma.pacientes.findUnique({
      where: { id_paciente: idBuscado }
    });

    if (!paciente) return res.status(404).json({ mensaje: "Paciente no encontrado" });
    
    res.status(200).json(paciente);
  } catch (error) {
    console.error("❌ Error al buscar el paciente:", error);
    res.status(500).json({ mensaje: "Error al buscar el paciente", detalle: error.message });
  }
});

// U: ACTUALIZAR (PUT) - Modificar datos
app.put('/api/pacientes/:id', async (req, res) => {
  try {
    const idBuscado = parseInt(req.params.id);
    const { telefono, direccion } = req.body;

    const pacienteActualizado = await prisma.pacientes.update({
      where: { id_paciente: idBuscado },
      data: {
        telefono: telefono,
        direccion: direccion
      }
    });

    console.log(`✅ ¡Éxito! Paciente actualizado`);
    res.status(200).json(pacienteActualizado);
  } catch (error) {
    console.error("❌ Error al actualizar:", error);
    res.status(500).json({ mensaje: "Error al actualizar", detalle: error.message });
  }
});

// D: BORRAR (DELETE) - Eliminar un paciente
app.delete('/api/pacientes/:id', async (req, res) => {
  try {
    const idBuscado = parseInt(req.params.id);

    await prisma.pacientes.delete({
      where: { id_paciente: idBuscado }
    });

    console.log(`✅ ¡Éxito! Paciente eliminado de MySQL`);
    res.status(200).json({ mensaje: "Paciente eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar:", error);
    res.status(500).json({ mensaje: "Error al eliminar", detalle: error.message });
  }
});

// ==========================================
// DIRECTORIO: Traer lista de Fonoaudiólogos
// ==========================================
app.get('/api/fonoaudiologos', async (req, res) => {
  try {
    const listaProfesionales = await prisma.fonoaudiologos.findMany();
    res.status(200).json(listaProfesionales);
  } catch (error) {
    console.error("❌ Error al buscar profesionales:", error);
    res.status(500).json({ mensaje: "Error al cargar el directorio", detalle: error.message });
  }
});

// ==========================================
// CITAS: Obtener horas ocupadas (GET)
// ==========================================
app.get('/api/citas/ocupadas', async (req, res) => {
  try {
    const { fecha, id_fonoaudiologo } = req.query;

    if (!fecha || !id_fonoaudiologo) {
      return res.status(400).json({ mensaje: "Faltan parámetros 'fecha' o 'id_fonoaudiologo'" });
    }

    const soloFecha = String(fecha).split('T')[0];

    // Buscar citas agendadas para esa fecha y fonoaudiólogo
    const citasOcupadas = await prisma.citas.findMany({
      where: {
        fecha: new Date(`${soloFecha}T00:00:00.000Z`),
        id_fonoaudiologo: Number(id_fonoaudiologo)
      },
      select: {
        hora_inicio: true
      }
    });

    // Formatear las horas encontradas en arreglo HH:MM (ej: ["15:00"])
    const horasOcupadas = citasOcupadas.map(cita => {
      const match = String(cita.hora_inicio).match(/\d{2}:\d{2}/);
      return match ? match[0] : null;
    }).filter(Boolean);

    res.json(horasOcupadas);
  } catch (error) {
    console.error("❌ Error al obtener citas ocupadas:", error);
    res.status(500).json({ mensaje: "Error al consultar horas ocupadas", detalle: error.message });
  }
});

// ==========================================
// CITAS: Crear una nueva hora (POST)
// ==========================================
app.post('/api/citas', async (req, res) => {
  try {
    const { id_paciente, id_fonoaudiologo, id_servicio, fecha, hora_inicio, duracion_minutos, precio } = req.body;

    console.log("📥 Datos completos recibidos:", req.body);

    // 1. Extraer solo la parte de la fecha ("2026-10-20")
    const soloFecha = String(fecha).split('T')[0];

    // 2. Extraer limpiamente solo los números de la hora (ej: "15:00")
    let horaLimpia = "00:00";
    if (hora_inicio) {
      const coincidencia = String(hora_inicio).match(/\d{2}:\d{2}/);
      if (coincidencia) {
        horaLimpia = coincidencia[0]; 
      }
    }

    // 3. Combinar Fecha y Hora
    const fechaHoraInicio = new Date(`${soloFecha}T${horaLimpia}:00.000Z`);

    // 4. Guardar en MySQL
    const nuevaCita = await prisma.citas.create({
      data: {
        id_paciente: Number(id_paciente),
        id_fonoaudiologo: Number(id_fonoaudiologo),
        id_servicio: Number(id_servicio),
        fecha: new Date(`${soloFecha}T00:00:00.000Z`),
        hora_inicio: fechaHoraInicio,
        duracion_minutos: Number(duracion_minutos),
        precio: Number(precio),
        estado_pago: "Pendiente",
        estado_asistencia: "Pendiente"
      }
    });

    console.log("✅ ¡Éxito! Cita creada con ID:", nuevaCita.id_citas);
    res.status(201).json(nuevaCita);

  } catch (error) {
    console.error("❌ Error al agendar cita:", error);
    res.status(500).json({ mensaje: "Error al guardar la cita", detalle: error.message });
  }
});

// ==========================================
// CITAS: Leer el calendario de horas (GET)
// ==========================================
app.get('/api/citas', async (req, res) => {
  try {
    // Recibimos el ID desde la URL del frontend
    const { id_fonoaudiologo } = req.query;

    // Si nos envían un ID, filtramos solo las citas de ese profesional
    const condicion = id_fonoaudiologo 
      ? { where: { id_fonoaudiologo: parseInt(id_fonoaudiologo) } } 
      : {}; 

    const historialCitas = await prisma.citas.findMany(condicion);
    res.status(200).json(historialCitas);
  } catch (error) {
    console.error("❌ Error al cargar el calendario:", error);
    res.status(500).json({ mensaje: "Error al buscar citas", detalle: error.message });
  }
});

// ==========================================
// AUTENTICACIÓN: Registro y Login
// ==========================================

// POST: Registrar un nuevo usuario y su perfil simultáneamente
app.post('/api/registro', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    // Utilizamos $transaction para asegurar que se creen ambas tablas al mismo tiempo
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Creamos las credenciales en la tabla Usuarios
      const nuevoUsuario = await tx.usuarios.create({
        data: {
          email: email,
          contrasena: password, // En producción real, esto iría encriptado con bcrypt
          rol: rol
        }
      });

      // 2. Evaluamos el rol y creamos el perfil correspondiente
      if (rol === 'fonoaudiologo') {
        await tx.fonoaudiologos.create({
          data: {
            id_usuario: nuevoUsuario.id_usuario,
            nombre_completo: nombre,
            rut: `PD-${Date.now().toString().slice(-6)}`, // RUT temporal para cumplir restricción UNIQUE
            subespecialidad: 'General',
            acerca_de_mi: 'Nuevo profesional en FonoTrack'
          }
        });
      } else if (rol === 'paciente') {
        await tx.pacientes.create({
          data: {
            id_usuario: nuevoUsuario.id_usuario,
            nombre_completo: nombre,
            rut: `PD-${Date.now().toString().slice(-6)}`, // RUT temporal
            fecha_nacimiento: new Date('2000-01-01')
          }
        });
      }

      return nuevoUsuario;
    });

    console.log("✅ Nuevo usuario y perfil creados:", resultado.email);
    res.status(201).json(resultado);

  } catch (error) {
    console.error("❌ Error al registrar:", error);
    res.status(500).json({ mensaje: "Error al registrar la cuenta", detalle: error.message });
  }
});

// POST: Iniciar sesión
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await prisma.usuarios.findUnique({
      where: { email: email }
    });

    if (!usuario || usuario.contrasena !== password) {
      return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });
    }

    // Buscamos el ID real del profesional en su tabla
    let perfilId = null;
    if (usuario.rol === 'fonoaudiologo') {
      const perfilFono = await prisma.fonoaudiologos.findFirst({
        where: { id_usuario: usuario.id_usuario }
      });
      perfilId = perfilFono ? perfilFono.id_fonoaudiologo : null;
    }

    console.log("✅ Inicio de sesión exitoso:", usuario.email);
    // Enviamos los datos del usuario + su ID de profesional
    res.status(200).json({ ...usuario, perfilId });

  } catch (error) {
    console.error("❌ Error en login:", error);
    res.status(500).json({ mensaje: "Error al iniciar sesión", detalle: error.message });
  }
});

// --- INICIAR EL SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor FonoTrack corriendo perfectamente en http://localhost:${PORT}`);
});

