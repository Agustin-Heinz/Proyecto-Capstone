const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

// CRUD DE SERVICIOS

router.get('/', async (req, res) => {
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

// ACTUALIZADO: Guarda tanto el id_catalogo compartido como el nombre_servicio, precio y duración
router.post('/', async (req, res) => {
  try {
    const { id_fonoaudiologo, id_catalogo, nombre, precio, duracion, duracion_minutos } = req.body;
    const duracionParsed = parseInt(duracion_minutos ?? duracion);
    const duracionFinal = !isNaN(duracionParsed) && duracionParsed > 0 ? duracionParsed : 50;

    const nuevoServicio = await prisma.servicios.create({
      data: {
        id_fonoaudiologo: parseInt(id_fonoaudiologo),
        id_catalogo: id_catalogo ? parseInt(id_catalogo) : null,
        nombre_servicio: nombre,
        precio: parseInt(precio),
        duracion_minutos: duracionFinal
      }
    });
    res.status(201).json(nuevoServicio);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al crear el servicio", detalle: error.message });
  }
});

// ACTUALIZADO: Permite actualizar id_catalogo además de nombre, precio y duración
router.put('/:id', async (req, res) => {
  try {
    const idServicio = parseInt(req.params.id);
    const { id_catalogo, nombre, precio, duracion, duracion_minutos } = req.body;
    const duracionParsed = parseInt(duracion_minutos ?? duracion);
    const duracionFinal = !isNaN(duracionParsed) && duracionParsed > 0 ? duracionParsed : undefined;

    const actualizado = await prisma.servicios.update({
      where: { id_servicios: idServicio },
      data: {
        id_catalogo: id_catalogo ? parseInt(id_catalogo) : undefined,
        nombre_servicio: nombre,
        precio: parseInt(precio),
        ...(duracionFinal !== undefined && { duracion_minutos: duracionFinal })
      }
    });
    res.status(200).json(actualizado);
  } catch (error) {
    res.status(500).json({ mensaje: "Error", detalle: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const idServicio = parseInt(req.params.id, 10);
    if (isNaN(idServicio)) {
      return res.status(400).json({ mensaje: "ID de servicio inválido" });
    }

    const citasAsociadas = await prisma.citas.count({
      where: { id_servicio: idServicio }
    });

    if (citasAsociadas > 0) {
      return res.status(409).json({
        mensaje: "No se puede eliminar este servicio porque ya tiene pacientes agendados históricamente."
      });
    }

    await prisma.disponibilidad.deleteMany({
      where: { id_servicio: idServicio }
    });

    await prisma.servicios.delete({ where: { id_servicios: idServicio } });
    res.status(200).json({ mensaje: "Ok" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error", detalle: error.message });
  }
});

module.exports = router;

