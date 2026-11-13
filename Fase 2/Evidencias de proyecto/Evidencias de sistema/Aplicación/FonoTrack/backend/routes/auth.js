const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');

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

function generarRutChilenoDesdeSemilla(semilla) {
  const seisDigitos = String(semilla).replace(/\D/g, '').slice(-6).padStart(6, '0');
  const cuerpo = `18${seisDigitos}`;
  const dv = calcularDvModulo11(cuerpo);
  return formatearRutChileno(`${cuerpo}${dv}`);
}

// AUTENTICACIÓN: Registro y Login

router.post('/registro', async (req, res) => {
  try {
    const { nombre, email, password, rol, rut, fechaNacimiento, fechaNcimiento, genero, telefono } = req.body;
    const emailLimpio = email ? email.trim() : '';
    const rutLimpio = rut ? formatearRutChileno(rut.trim()) : '';
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

    const passwordEncriptada = await bcrypt.hash(password, 10);

    const resultado = await prisma.$transaction(async (tx) => {
      let nuevoUsuario;

      // Si era un usuario invitado (creado al agendar sin cuenta), actualizamos su contraseña y rol
      if (usuarioExistente) {
        nuevoUsuario = await tx.usuarios.update({
          where: { id_usuario: usuarioExistente.id_usuario },
          data: {
            contrasena: passwordEncriptada,
            rol: rol || 'paciente'
          }
        });
      } else {
        nuevoUsuario = await tx.usuarios.create({
          data: {
            email: emailLimpio,
            contrasena: passwordEncriptada,
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
              rut: rutLimpio || generarRutChilenoDesdeSemilla(Date.now()),
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

    const { contrasena, ...usuarioSinClave } = resultado;
    res.status(201).json(usuarioSinClave);

  } catch (error) {
    console.error("Error al registrar:", error);
    res.status(500).json({ mensaje: "Error al registrar la cuenta", detalle: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await prisma.usuarios.findUnique({ where: { email: email } });

    if (!usuario) {
      return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });
    }

    const passwordValida = await bcrypt.compare(password, usuario.contrasena);
    if (!passwordValida) {
      return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });
    }

    let perfilId = null;
    let nombre = "Usuario";
    let planActivo = false;

    if (usuario.rol === 'fonoaudiologo') {
      const perfil = await prisma.fonoaudiologos.findFirst({ where: { id_usuario: usuario.id_usuario } });
      perfilId = perfil ? perfil.id_fonoaudiologo : null;
      nombre = perfil ? perfil.nombre_completo : "Fonoaudiólogo";

      if (perfilId) {
        const pagoConfirmado = await prisma.pagos.findFirst({
          where: {
            id_fonoaudiologo: perfilId,
            estado_pago: { in: ['PAGADO', 'Pagado', 'pagado', 'AUTORIZADO', 'Aprobado'] }
          },
          orderBy: { id_pago: 'desc' }
        });

        if (pagoConfirmado) {
          const planInfo = await prisma.planes.findUnique({
            where: { id_plan: pagoConfirmado.id_plan }
          });
          const duracionDias = planInfo?.duracion_dias || 30;
          if (pagoConfirmado.fecha_pago) {
            const fechaVencimiento = new Date(pagoConfirmado.fecha_pago);
            fechaVencimiento.setDate(fechaVencimiento.getDate() + duracionDias);
            planActivo = fechaVencimiento >= new Date();
          } else {
            planActivo = true;
          }
        }
      }

    } else if (usuario.rol === 'paciente') {
      const perfil = await prisma.pacientes.findFirst({
        where: { id_usuario: usuario.id_usuario },
        orderBy: { id_paciente: 'desc' }
      });
      perfilId = perfil ? perfil.id_paciente : null;
      nombre = perfil ? perfil.nombre_completo : "Paciente";
    }

    const { constrasena, ...usuarioSeguro } = usuario;
    console.log("Inicio de sesión exitoso:", usuario.email);
    res.status(200).json({ ...usuarioSeguro, perfilId, nombre, planActivo });

  } catch (error) {
    res.status(500).json({ mensaje: "Error al iniciar sesión", detalle: error.message });
  }
});

module.exports = router;

