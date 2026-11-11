const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const upload = require('../config/upload');

function calcularDvModulo11(cuerpoNum) {
  let suma = 0;
  let multiplo = 2;
  const digitos = String(cuerpoNum).replace(/\D/g, '');
  for (let i = digitos.length - 1; i >= 0; i--) {
    suma += parseInt(digitos.charAt(i), 10) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

function formatearRutChileno(rutRaw) {
  if (!rutRaw) return '';
  const limpio = String(rutRaw).replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpoConPuntos}-${dv}`;
}

async function corregirRutLegacySiCorresponde(prof) {
  if (!prof || !prof.rut) return prof;
  if (String(prof.rut).startsWith('PD-')) {
    const sufijo = String(prof.rut).replace(/\D/g, '').slice(-6).padStart(6, '0');
    const cuerpo = `17${sufijo}`;
    const dv = calcularDvModulo11(cuerpo);
    const rutCorregido = formatearRutChileno(`${cuerpo}${dv}`);
    try {
      await prisma.fonoaudiologos.update({
        where: { id_fonoaudiologo: prof.id_fonoaudiologo },
        data: { rut: rutCorregido }
      });
      prof.rut = rutCorregido;
    } catch (e) {
      prof.rut = rutCorregido;
    }
  }
  return prof;
}

// DIRECTORIO Y PERFIL DE FONOAUDIÓLOGOS

router.get('/', async (req, res) => {
  try {
    const listaProfesionales = await prisma.fonoaudiologos.findMany({
      include: {
        ubicacion: true
      }
    });

    await Promise.all(listaProfesionales.map(p => corregirRutLegacySiCorresponde(p)));
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

    await corregirRutLegacySiCorresponde(perfil);

    res.status(200).json(perfil);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar el perfil individual", detalle: error.message });
  }
});

// ACTUALIZADO: Ahora también recibe y guarda publico_objetivo ('Infantil', 'Adultos' o 'Ambos') y rut
router.put('/:id', upload.single('foto_archivo'), async (req, res) => {
  try {
    const idFono = parseInt(req.params.id);
    const { nombre_completo, rut, subespecialidad, publico_objetivo, acerca_de_mi, id_ubicacion, foto_perfil, telefono } = req.body;

    let rutaImagen = foto_perfil;
    if (req.file) {
      rutaImagen = `http://localhost:3000/uploads/${req.file.filename}`;
    }

    const datosActualizar = {
      nombre_completo,
      subespecialidad,
      publico_objetivo: publico_objetivo || 'Ambos',
      acerca_de_mi,
      foto_perfil: rutaImagen,
      telefono,
      id_ubicacion: id_ubicacion ? parseInt(id_ubicacion) : null
    };

    if (rut && String(rut).trim()) {
      datosActualizar.rut = formatearRutChileno(rut.trim());
    }

    const perfilActualizado = await prisma.fonoaudiologos.update({
      where: { id_fonoaudiologo: idFono },
      data: datosActualizar
    });

    res.status(200).json(perfilActualizado);
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ mensaje: "Error al actualizar", detalle: error.message });
  }
});

module.exports = router;

