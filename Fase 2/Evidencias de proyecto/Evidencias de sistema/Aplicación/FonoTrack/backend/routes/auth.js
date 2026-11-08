const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

// AUTENTICACIÓN: Registro y Login

router.post('/registro', async (req, res) => {
  try {
    const { nombre, email, password, rol, rut, fechaNacimiento, genero, telefono } = req.body;

    const resultado = await prisma.$transaction(async (tx) => {
      const nuevoUsuario = await tx.usuarios.create({
        data: {
          email: email,
          contrasena: password,
          rol: rol
        }
      });

      if (rol === 'fonoaudiologo') {
        await tx.fonoaudiologos.create({
          data: {
            id_usuario: nuevoUsuario.id_usuario,
            nombre_completo: nombre,
            rut: `PD-${Date.now().toString().slice(-6)}`,
            subespecialidad: 'General',
            publico_objetivo: 'Ambos',
            acerca_de_mi: 'Nuevo profesional en FonoTrack'
          }
        });
      } else if (rol === 'paciente') {
        await tx.pacientes.create({
          data: {
            id_usuario: nuevoUsuario.id_usuario,
            nombre_completo: nombre,
            rut: rut,
            telefono: telefono || null,
            fecha_nacimiento: new Date(fechaNacimiento),
            genero: genero
          }
        });
      }
      return nuevoUsuario;
    });

    res.status(201).json(resultado);

  } catch (error) {
    console.error("Error al registrar:", error);
    res.status(500).json({ mensaje: "Error al registrar la cuenta", detalle: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await prisma.usuarios.findUnique({ where: { email: email } });

    if (!usuario || usuario.contrasena !== password) {
      return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });
    }

    let perfilId = null;
    let nombre = "Usuario";

    if (usuario.rol === 'fonoaudiologo') {
      const perfil = await prisma.fonoaudiologos.findFirst({ where: { id_usuario: usuario.id_usuario } });
      perfilId = perfil ? perfil.id_fonoaudiologo : null;
      nombre = perfil ? perfil.nombre_completo : "Fonoaudiólogo";

    } else if (usuario.rol === 'paciente') {
      const perfil = await prisma.pacientes.findFirst({
        where: { id_usuario: usuario.id_usuario },
        orderBy: { id_paciente: 'desc' }
      });
      perfilId = perfil ? perfil.id_paciente : null;
      nombre = perfil ? perfil.nombre_completo : "Paciente";
    }

    console.log("Inicio de sesión exitoso:", usuario.email);
    res.status(200).json({ ...usuario, perfilId, nombre });

  } catch (error) {
    res.status(500).json({ mensaje: "Error al iniciar sesión", detalle: error.message });
  }
});

module.exports = router;

