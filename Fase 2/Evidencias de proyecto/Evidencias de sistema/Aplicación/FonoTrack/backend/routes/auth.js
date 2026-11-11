const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

// AUTENTICACIÓN: Registro y Login

router.post('/registro', async (req, res) => {
  try {
    const { nombre, email, password, rol, rut, fechaNacimiento, fechaNcimiento, genero, telefono } = req.body;
    const emailLimpio = email ? email.trim() : '';
    const rutLimpio = rut ? rut.trim() : '';
    const fechaRaw = fechaNacimiento || fechaNcimiento;
    const fechaNacValida = (fechaRaw && !isNaN(new Date(fechaRaw).getTime()))
      ? new Date(fechaRaw)
      : null;

    // Verificar si el correo ya existe en usuarios
    const usuarioExistente = await prisma.usuarios.findUnique({
      where: { email: emailLimpio }
    });

    // Si existe y NO es una cuenta temporal de invitado, avisamos claramente
    if (usuarioExistente && !String(usuarioExistente.contrasena).startsWith('invitado-')) {
      return res.status(400).json({
        mensaje: "Este correo electrónico ya se encuentra registrado. Por favor inicia sesión o usa otro correo."
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      let nuevoUsuario;

      // Si era un usuario invitado (creado al agendar sin cuenta), actualizamos su contraseña y rol
      if (usuarioExistente) {
        nuevoUsuario = await tx.usuarios.update({
          where: { id_usuario: usuarioExistente.id_usuario },
          data: {
            contrasena: password,
            rol: rol || 'paciente'
          }
        });
      } else {
        nuevoUsuario = await tx.usuarios.create({
          data: {
            email: emailLimpio,
            contrasena: password,
            rol: rol || 'paciente'
          }
        });
      }

      if (rol === 'fonoaudiologo') {
        const fonoExistente = await tx.fonoaudiologos.findFirst({
          where: { id_usuario: nuevoUsuario.id_usuario }
        });

        if (!fonoExistente) {
          await tx.fonoaudiologos.create({
            data: {
              id_usuario: nuevoUsuario.id_usuario,
              nombre_completo: nombre,
              rut: rutLimpio || `PD-${Date.now().toString().slice(-6)}`,
              subespecialidad: 'General',
              publico_objetivo: 'Ambos',
              acerca_de_mi: 'Nuevo profesional en FonoTrack',
              telefono: telefono || null
            }
          });
        }
      } else if (rol === 'paciente') {
        // Verificar si el RUT ya existe en pacientes (por ejemplo, si agendó antes como invitado)
        const pacientePorRut = rutLimpio
          ? await tx.pacientes.findUnique({ where: { rut: rutLimpio } })
          : null;

        if (pacientePorRut) {
          await tx.pacientes.update({
            where: { id_paciente: pacientePorRut.id_paciente },
            data: {
              id_usuario: nuevoUsuario.id_usuario,
              nombre_completo: nombre || pacientePorRut.nombre_completo,
              telefono: telefono || pacientePorRut.telefono,
              fecha_nacimiento: fechaNacValida || pacientePorRut.fecha_nacimiento,
              genero: genero || pacientePorRut.genero
            }
          });
        } else {
          await tx.pacientes.create({
            data: {
              id_usuario: nuevoUsuario.id_usuario,
              nombre_completo: nombre,
              rut: rutLimpio,
              telefono: telefono || null,
              fecha_nacimiento: fechaNacValida,
              genero: genero || null
            }
          });
        }
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

