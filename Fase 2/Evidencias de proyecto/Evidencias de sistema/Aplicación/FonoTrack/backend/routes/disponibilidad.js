const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

// CRUD DE DISPONIBILIDAD

router.get('/', async (req, res) => {
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

router.post('/', async (req, res) => {
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

router.put('/:id', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
  try {
    const idDisp = parseInt(req.params.id);
    await prisma.disponibilidad.delete({ where: { id_disponibilidad: idDisp } });
    res.status(200).json({ mensaje: "Ok" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error", detalle: error.message });
  }
});

module.exports = router;

