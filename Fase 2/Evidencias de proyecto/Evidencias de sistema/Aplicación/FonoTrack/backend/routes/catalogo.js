const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

// GETS DE PLANES, CATÁLOGO DE SERVICIOS Y COMUNAS

router.get('/planes', async (req, res) => {
  try {
    const listaPlanes = await prisma.planes.findMany();
    res.json(listaPlanes);
  } catch (error) {
    res.status(500).json({ error: "Hubo un problema al buscar los planes" });
  }
});

// Extraer el catálogo oficial de servicios desde MySQL (filtrable por Infantil o Adultos)
router.get('/catalogo-servicios', async (req, res) => {
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

// GET COMUNAS: Para llenar los select del frontend
router.get('/comunas', async (req, res) => {
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

module.exports = router;

