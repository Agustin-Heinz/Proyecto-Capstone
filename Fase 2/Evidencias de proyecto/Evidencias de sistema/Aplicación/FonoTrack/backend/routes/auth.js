const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const transporter = require('../config/mailer');

// Almacén en memoria para códigos de recuperación de contraseña (válidos por 15 minutos)
const codigosRecuperacion = new Map();

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

function validarRequisitosPassword(password) {
  if (!password || String(password).length < 8) return false;
  const tieneMayuscula = /[A-ZÁÉÍÓÚÑ]/.test(password);
  const tieneMinuscula = /[a-záéíóúñ]/.test(password);
  const tieneEspecial = /[^A-Za-z0-9\s]/.test(password);
  return tieneMayuscula && tieneMinuscula && tieneEspecial;
}

const MENSAJE_REQUISITOS_PASSWORD =
  "La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula y al menos un carácter especial.";

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

    if (!validarRequisitosPassword(password)) {
      return res.status(400).json({
        mensaje: MENSAJE_REQUISITOS_PASSWORD
      });
    }

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
    const emailLimpio = email ? email.trim() : '';

    const usuario = await prisma.usuarios.findUnique({ where: { email: emailLimpio } });

    if (!usuario) {
      return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });
    }

    let passwordValida = password === usuario.contrasena;

    // Si en MySQL había quedado una contraseña antigua encriptada con bcrypt ($2b$...),
    // la validamos y la reemplazamos automáticamente en MySQL por texto plano.
    if (!passwordValida && String(usuario.contrasena || '').startsWith('$2')) {
      try {
        const bcrypt = require('bcrypt');
        const coincideHashAntiguo = await bcrypt.compare(password, usuario.contrasena);
        if (coincideHashAntiguo) {
          passwordValida = true;
          await prisma.usuarios.update({
            where: { id_usuario: usuario.id_usuario },
            data: { contrasena: password }
          });
          usuario.contrasena = password;
        }
      } catch (e) {
        // Ignorar si bcrypt no está disponible
      }
    }

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

    const { contrasena, ...usuarioSeguro } = usuario;
    console.log("Inicio de sesión exitoso:", usuario.email);
    res.status(200).json({ ...usuarioSeguro, perfilId, nombre, planActivo });

  } catch (error) {
    res.status(500).json({ mensaje: "Error al iniciar sesión", detalle: error.message });
  }
});

// RECUPERACIÓN DE CONTRASEÑA: Paso 1 - Solicitar código por correo
router.post('/recuperar-password/solicitar', async (req, res) => {
  try {
    const { email } = req.body;
    const emailLimpio = email ? email.trim() : '';

    if (!emailLimpio) {
      return res.status(400).json({ mensaje: "Por favor ingresa tu correo electrónico." });
    }

    const usuario = await prisma.usuarios.findUnique({
      where: { email: emailLimpio }
    });

    if (!usuario) {
      return res.status(404).json({
        mensaje: "No encontramos ninguna cuenta registrada con ese correo electrónico."
      });
    }

    let nombreUsuario = "Usuario";
    if (usuario.rol === 'fonoaudiologo') {
      const fono = await prisma.fonoaudiologos.findFirst({ where: { id_usuario: usuario.id_usuario } });
      if (fono?.nombre_completo) nombreUsuario = fono.nombre_completo;
    } else if (usuario.rol === 'paciente') {
      const pac = await prisma.pacientes.findFirst({ where: { id_usuario: usuario.id_usuario } });
      if (pac?.nombre_completo) nombreUsuario = pac.nombre_completo;
    }

    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const expira = Date.now() + 15 * 60 * 1000; // 15 minutos

    codigosRecuperacion.set(emailLimpio.toLowerCase(), {
      codigo,
      emailReal: usuario.email,
      expira,
      verificado: false
    });

    const remitente = process.env.EMAIL_USER || 'diegosepulveda6721@gmail.com';
    const opcionesCorreo = {
      from: `"FonoTrack Clínico" <${remitente}>`,
      to: usuario.email,
      subject: "Código de recuperación de contraseña - FonoTrack",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E2E6EF; border-radius: 14px; background-color: #FFFFFF;">
          <h2 style="color: #4F46E5; margin-top: 0;">Recuperación de Contraseña</h2>
          <p style="color: #14181F; font-size: 15px;">¡Hola <strong>${nombreUsuario}</strong>!</p>
          <p style="color: #5B6472; font-size: 14px; line-height: 1.5;">
            Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>FonoTrack</strong>.
            Ingresa el siguiente código de verificación en la página donde estás esperando:
          </p>
          <div style="margin: 24px 0; padding: 18px; background-color: #EEF2FE; border-radius: 12px; text-align: center;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4F46E5;">${codigo}</span>
          </div>
          <p style="color: #5B6472; font-size: 13px;">
            Este código es válido por <strong>15 minutos</strong>. Si no solicitaste este cambio, puedes ignorar este mensaje con tranquilidad.
          </p>
        </div>
      `
    };

    await transporter.sendMail(opcionesCorreo);
    console.log(`Código de recuperación enviado a ${usuario.email}`);

    res.status(200).json({
      mensaje: "Hemos enviado un código de 6 dígitos a tu correo electrónico."
    });
  } catch (error) {
    console.error("Error al enviar código de recuperación:", error);
    res.status(500).json({
      mensaje: "No se pudo enviar el correo de recuperación. Inténtalo nuevamente.",
      detalle: error.message
    });
  }
});

// RECUPERACIÓN DE CONTRASEÑA: Paso 2 - Verificar el código ingresado
router.post('/recuperar-password/verificar', async (req, res) => {
  try {
    const { email, codigo } = req.body;
    const emailKey = email ? email.trim().toLowerCase() : '';
    const codigoLimpio = codigo ? String(codigo).trim() : '';

    const datosCodigo = codigosRecuperacion.get(emailKey);

    if (!datosCodigo) {
      return res.status(400).json({
        mensaje: "No hay una solicitud activa para este correo. Solicita un nuevo código."
      });
    }

    if (Date.now() > datosCodigo.expira) {
      codigosRecuperacion.delete(emailKey);
      return res.status(400).json({
        mensaje: "El código ha expirado. Por favor solicita uno nuevo."
      });
    }

    if (datosCodigo.codigo !== codigoLimpio) {
      return res.status(400).json({
        mensaje: "El código ingresado es incorrecto. Verifica e inténtalo nuevamente."
      });
    }

    datosCodigo.verificado = true;
    codigosRecuperacion.set(emailKey, datosCodigo);

    res.status(200).json({
      mensaje: "Código verificado correctamente. Ahora puedes ingresar tu nueva contraseña."
    });
  } catch (error) {
    console.error("Error al verificar código:", error);
    res.status(500).json({ mensaje: "Error al verificar el código.", detalle: error.message });
  }
});

// RECUPERACIÓN DE CONTRASEÑA: Paso 3 - Cambiar la contraseña en la base de datos
router.post('/recuperar-password/cambiar', async (req, res) => {
  try {
    const { email, codigo, nuevaPassword } = req.body;
    const emailKey = email ? email.trim().toLowerCase() : '';
    const codigoLimpio = codigo ? String(codigo).trim() : '';

    if (!validarRequisitosPassword(nuevaPassword)) {
      return res.status(400).json({
        mensaje: MENSAJE_REQUISITOS_PASSWORD
      });
    }

    const datosCodigo = codigosRecuperacion.get(emailKey);

    if (!datosCodigo) {
      return res.status(400).json({
        mensaje: "La sesión de recuperación expiró. Solicita un nuevo código."
      });
    }

    if (Date.now() > datosCodigo.expira) {
      codigosRecuperacion.delete(emailKey);
      return res.status(400).json({
        mensaje: "El código ha expirado. Por favor solicita uno nuevo."
      });
    }

    if (datosCodigo.codigo !== codigoLimpio) {
      return res.status(400).json({
        mensaje: "El código de verificación no coincide."
      });
    }

    await prisma.usuarios.update({
      where: { email: datosCodigo.emailReal },
      data: { contrasena: nuevaPassword }
    });

    codigosRecuperacion.delete(emailKey);
    console.log(`Contraseña restablecida exitosamente para ${datosCodigo.emailReal}`);

    res.status(200).json({
      mensaje: "Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva clave."
    });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    res.status(500).json({
      mensaje: "Error al actualizar la contraseña en la base de datos.",
      detalle: error.message
    });
  }
});

module.exports = router;

