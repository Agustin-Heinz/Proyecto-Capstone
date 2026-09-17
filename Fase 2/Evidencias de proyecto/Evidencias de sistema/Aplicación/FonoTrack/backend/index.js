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

// POST: Ruta para agregar un nuevo paciente (La 'C' del CRUD)
app.post('/api/pacientes', async (req, res) => {
    try {
        console.log("⏳ Recibiendo formulario del Front Office...");

        // 1. DESESTRUCTURACIÓN: Extraemos los datos que llegan desde el frontend
        const { id_usuario, nombre_completo, rut, telefono } = req.body; 

        // 2. PRISMA + AWAIT: Congelamos el código hasta que MySQL guarde el dato
        const pacienteNuevo = await prisma.paciente.create({
            data: {
                id_usuario: id_usuario, // Llave foránea que lo conecta con un usuario
                nombre_completo: nombre_completo,
                rut: rut,
                telefono: telefono
            }
        });

        console.log(`✅ ¡Éxito! Paciente guardado en MySQL: ${nombre_completo}`);
        
        // Respondemos al frontend (React/Mobile) con un código 201 (Creado) y los datos
        res.status(201).json(pacienteNuevo); 

    } catch (error) {
        console.error("❌ Hubo un error al guardar en MySQL:", error);
        res.status(500).json({ mensaje: "Error al crear el paciente", detalle: error.message });
    }
});

// --- INICIAR EL SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor FonoTrack corriendo perfectamente en http://localhost:${PORT}`);
});




