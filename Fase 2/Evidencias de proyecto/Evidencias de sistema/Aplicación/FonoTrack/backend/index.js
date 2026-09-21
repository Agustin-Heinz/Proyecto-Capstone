const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

// Inicializamos la aplicación y las herramientas de Prisma
const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

// Middlewares (Configuraciones de seguridad y formato de datos)
app.use(cors()); // Permitirá que tu futuro Frontend en React se conecte
app.use(express.json()); // Permite leer datos en formato JSON

// --- RUTAS DE NUESTRA API ---

// Ruta de prueba: Obtener los planes de suscripción
app.get('/api/planes', async (req, res) => {
  try {
    // Aquí usamos  Prisma Client 
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
        // Volvemos a recibir el id_usuario (que ahora sí enviará React)
        const { id_usuario, nombre_completo, rut, telefono } = req.body; 

        const pacienteNuevo = await prisma.pacientes.create({
            data: {
                id_usuario: parseInt(id_usuario), // Aseguramos que sea número
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
        // findMany() extrae la lista completa de la tabla pacientes
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
        // req.params.id captura el número de la URL. Usamos parseInt() porque Prisma exige números, no textos.
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
        const { telefono, direccion } = req.body; // Extraemos solo lo que permitiremos editar

        // update() requiere saber 'where' (dónde editar) y 'data' (qué poner)
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
        // Prisma extrae el catálogo desde MySQL
        const listaProfesionales = await prisma.fonoaudiologos.findMany();
        res.status(200).json(listaProfesionales);
    } catch (error) {
        console.error("❌ Error al buscar profesionales:", error);
        res.status(500).json({ mensaje: "Error al cargar el directorio", detalle: error.message });
    }
});

// ==========================================
// CITAS: Crear una nueva hora (POST)
// ==========================================
app.post('/api/citas', async (req, res) => {
    try {
        // 1. Extraemos rápidamente los datos del paquete que envía React
        const { id_paciente, id_fonoaudiologo, fecha, hora_inicio, precio, modalidad } = req.body;

        // 2. Prisma congela el código hasta insertar el registro en MySQL
        const nuevaCita = await prisma.citas.create({
            data: {
                id_paciente: parseInt(id_paciente),
                id_fonoaudiologo: parseInt(id_fonoaudiologo),
                fecha: new Date(fecha), // Formato AAAA-MM-DD
                hora_inicio: hora_inicio,
                precio: parseInt(precio),
                modalidad: modalidad,
                estado_pago: "Pendiente",
                estado_asistencia: "Pendiente"
            }
        });

        console.log(`✅ Cita agendada para el ${fecha} a las ${hora_inicio}`);
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
        // Extraemos todo el registro de citas para el Back Office de la fonoaudióloga
        const historialCitas = await prisma.citas.findMany({
            // Prisma permite incluir (JOIN) los datos del paciente relacionado automáticamente
            include: {
                pacientes: true 
            }
        });
        res.status(200).json(historialCitas);
    } catch (error) {
        console.error("❌ Error al cargar el calendario:", error);
        res.status(500).json({ mensaje: "Error al buscar citas", detalle: error.message });
    }
});

// --- INICIAR EL SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor FonoTrack corriendo perfectamente en http://localhost:${PORT}`);
});




