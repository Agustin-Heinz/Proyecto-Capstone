const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

// RESEÑAS: Guardar y leer comentarios

router.post('/', async (req, res) => {
  try {
    const { id_paciente, id_fonoaudiologo, calificacion, comentario } = req.body;

    const idPacParsed = parseInt(id_paciente);
    const idFonoParsed = parseInt(id_fonoaudiologo);
    const califParsed = parseInt(calificacion);

    const nuevaResena = await prisma.resenas.create({
      data: {
        id_paciente: !isNaN(idPacParsed) && idPacParsed > 0 ? idPacParsed : 1,
        id_fonoaudiologo: idFonoParsed,
        calificacion: !isNaN(califParsed) ? califParsed : 5,
        comentario: comentario || ''
      }
    });

    res.status(201).json(nuevaResena);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al guardar la reseña", detalle: error.message });
  }
});

router.get('/:id_fonoaudiologo', async (req, res) => {
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

module.exports = router;

