const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const upload = require('../config/upload');

// DIRECTORIO Y PERFIL DE FONOAUDIÓLOGOS

router.get('/', async (req, res) => {
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

router.get('/:id', async (req, res) => {
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
router.put('/:id', upload.single('foto_archivo'), async (req, res) => {
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

module.exports = router;

