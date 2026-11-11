const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

// CRUD DE PACIENTES

router.post('/', async (req, res) => {
  try {
    const { id_usuario, nombre_completo, rut, telefono, fecha_nacimiento, email } = req.body;
    const rutLimpio = rut ? String(rut).trim() : '';
    const emailLimpio = email ? String(email).trim() : '';

    let usuarioIdFinal = parseInt(id_usuario) || 1;

    // Si viene el email del formulario de contacto (no logueado), guardamos o recuperamos su correo en usuarios
    if (emailLimpio) {
      let usuarioInvitado = await prisma.usuarios.findUnique({
        where: { email: emailLimpio }
      });

      if (!usuarioInvitado) {
        usuarioInvitado = await prisma.usuarios.create({
          data: {
            email: emailLimpio,
            contrasena: `invitado-${Date.now()}`,
            rol: 'paciente'
          }
        });
      }
      usuarioIdFinal = usuarioInvitado.id_usuario;
    }

    const pacienteExistente = rutLimpio
      ? await prisma.pacientes.findUnique({ where: { rut: rutLimpio } })
      : null;

    if (pacienteExistente) {
      const pacienteActualizado = await prisma.pacientes.update({
        where: { id_paciente: pacienteExistente.id_paciente },
        data: {
          ...(nombre_completo && { nombre_completo }),
          ...(telefono && { telefono }),
          ...(emailLimpio && { id_usuario: usuarioIdFinal })
        }
      });
      return res.status(200).json(pacienteActualizado);
    }

    const fechaNacValida = (fecha_nacimiento && !isNaN(new Date(fecha_nacimiento).getTime()))
      ? new Date(fecha_nacimiento)
      : null;

    const pacienteNuevo = await prisma.pacientes.create({
      data: {
        id_usuario: usuarioIdFinal,
        nombre_completo: nombre_completo,
        rut: rutLimpio,
        telefono: telefono || null,
        fecha_nacimiento: fechaNacValida
      }
    });

    res.status(201).json(pacienteNuevo);
  } catch (error) {
    console.error("Error al crear el paciente:", error);
    res.status(500).json({ mensaje: "Error al crear el paciente", detalle: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const todosLosPacientes = await prisma.pacientes.findMany();
    const todosUsuarios = await prisma.usuarios.findMany({
      select: { id_usuario: true, email: true }
    });

    const pacientesConCorreo = todosLosPacientes.map(p => {
      const usuario = todosUsuarios.find(u => u.id_usuario === p.id_usuario);
      return {
        ...p,
        email: usuario ? usuario.email : null
      };
    });

    res.status(200).json(pacientesConCorreo);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al buscar pacientes", detalle: error.message });
  }
});

router.get('/:id', async (req, res) => {
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

router.put('/:id', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
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

module.exports = router;

