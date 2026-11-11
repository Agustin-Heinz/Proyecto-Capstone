const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const prisma = require('../config/prisma');

const RUTA_EXTRA_PACIENTES = path.join(__dirname, '..', 'config', 'pacientes_extra.json');

function leerExtraPacientes() {
  try {
    if (!fs.existsSync(RUTA_EXTRA_PACIENTES)) return {};
    const contenido = fs.readFileSync(RUTA_EXTRA_PACIENTES, 'utf8');
    return JSON.parse(contenido || '{}');
  } catch (err) {
    console.error('Error leyendo pacientes_extra.json:', err.message);
    return {};
  }
}

function guardarExtraPacientes(datos) {
  try {
    fs.writeFileSync(RUTA_EXTRA_PACIENTES, JSON.stringify(datos, null, 2), 'utf8');
  } catch (err) {
    console.error('Error guardando pacientes_extra.json:', err.message);
  }
}

function enriquecerPaciente(paciente, emailUsuario, mapaExtra) {
  const extra = mapaExtra[String(paciente.id_paciente)] || {};
  return {
    ...paciente,
    email: emailUsuario || extra.email || null,
    genero: paciente.genero || extra.genero || 'No especificado',
    direccion: extra.direccion || 'No registrada',
    emergencia: extra.emergencia || paciente.nombre_tutor || 'Sin contacto',
    notas: extra.notas || 'Sin observaciones clínicas.',
    id_fonoaudiologo: extra.id_fonoaudiologo || null,
    estadoPago: extra.estadoPago || 'Al día'
  };
}

// CRUD DE PACIENTES

router.post('/', async (req, res) => {
  try {
    const {
      id_usuario,
      id_fonoaudiologo,
      nombre_completo,
      rut,
      telefono,
      fecha_nacimiento,
      email,
      genero,
      direccion,
      emergencia,
      nombre_tutor,
      notas
    } = req.body;

    const rutLimpio = rut ? String(rut).trim() : '';
    const emailLimpio = email ? String(email).trim() : '';

    if (!nombre_completo || !rutLimpio) {
      return res.status(400).json({ mensaje: 'Nombre completo y RUT son obligatorios.' });
    }

    let usuarioIdFinal = parseInt(id_usuario) || 1;

    // Si viene el email del formulario de contacto o del panel, guardamos o recuperamos su correo en usuarios
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

    const fechaNacValida = (fecha_nacimiento && !isNaN(new Date(fecha_nacimiento).getTime()))
      ? new Date(fecha_nacimiento)
      : null;

    const tutorFinal = emergencia || nombre_tutor || null;

    const pacienteExistente = rutLimpio
      ? await prisma.pacientes.findUnique({ where: { rut: rutLimpio } })
      : null;

    let pacienteGuardado;

    if (pacienteExistente) {
      pacienteGuardado = await prisma.pacientes.update({
        where: { id_paciente: pacienteExistente.id_paciente },
        data: {
          ...(nombre_completo && { nombre_completo }),
          ...(telefono !== undefined && { telefono: telefono || null }),
          ...(fechaNacValida && { fecha_nacimiento: fechaNacValida }),
          ...(genero && { genero }),
          ...(tutorFinal && { nombre_tutor: tutorFinal }),
          ...(emailLimpio && { id_usuario: usuarioIdFinal })
        }
      });
    } else {
      pacienteGuardado = await prisma.pacientes.create({
        data: {
          id_usuario: usuarioIdFinal,
          nombre_completo: nombre_completo,
          rut: rutLimpio,
          telefono: telefono || null,
          fecha_nacimiento: fechaNacValida,
          genero: genero || null,
          nombre_tutor: tutorFinal
        }
      });
    }

    const mapaExtra = leerExtraPacientes();
    const idKey = String(pacienteGuardado.id_paciente);
    const extraPrevio = mapaExtra[idKey] || {};
    mapaExtra[idKey] = {
      ...extraPrevio,
      ...(direccion !== undefined ? { direccion } : {}),
      ...(emergencia !== undefined ? { emergencia } : {}),
      ...(notas !== undefined ? { notas } : {}),
      ...(genero !== undefined ? { genero } : {}),
      ...(emailLimpio ? { email: emailLimpio } : {}),
      ...(id_fonoaudiologo ? { id_fonoaudiologo: Number(id_fonoaudiologo) } : {})
    };
    guardarExtraPacientes(mapaExtra);

    res.status(pacienteExistente ? 200 : 201).json(
      enriquecerPaciente(pacienteGuardado, emailLimpio || extraPrevio.email, mapaExtra)
    );
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
    const mapaExtra = leerExtraPacientes();

    const pacientesConCorreo = todosLosPacientes.map(p => {
      const usuario = todosUsuarios.find(u => u.id_usuario === p.id_usuario);
      return enriquecerPaciente(p, usuario ? usuario.email : null, mapaExtra);
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

    let emailUsuario = null;
    if (paciente.id_usuario) {
      const usuario = await prisma.usuarios.findUnique({
        where: { id_usuario: paciente.id_usuario }
      });
      emailUsuario = usuario?.email || null;
    }

    const mapaExtra = leerExtraPacientes();
    res.status(200).json(enriquecerPaciente(paciente, emailUsuario, mapaExtra));
  } catch (error) {
    res.status(500).json({ mensaje: "Error al buscar el paciente", detalle: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const idBuscado = parseInt(req.params.id);
    const {
      nombre_completo,
      rut,
      telefono,
      fecha_nacimiento,
      genero,
      email,
      direccion,
      emergencia,
      nombre_tutor,
      notas,
      estadoPago
    } = req.body;

    const fechaNacValida = (fecha_nacimiento && !isNaN(new Date(fecha_nacimiento).getTime()))
      ? new Date(fecha_nacimiento)
      : undefined;

    const tutorFinal = emergencia !== undefined ? emergencia : nombre_tutor;

    const pacienteActualizado = await prisma.pacientes.update({
      where: { id_paciente: idBuscado },
      data: {
        ...(nombre_completo !== undefined && { nombre_completo }),
        ...(rut !== undefined && { rut: String(rut).trim() }),
        ...(telefono !== undefined && { telefono: telefono || null }),
        ...(fechaNacValida !== undefined && { fecha_nacimiento: fechaNacValida }),
        ...(genero !== undefined && { genero: genero || null }),
        ...(tutorFinal !== undefined && { nombre_tutor: tutorFinal || null })
      }
    });

    const mapaExtra = leerExtraPacientes();
    const idKey = String(idBuscado);
    const extraPrevio = mapaExtra[idKey] || {};
    mapaExtra[idKey] = {
      ...extraPrevio,
      ...(direccion !== undefined ? { direccion } : {}),
      ...(emergencia !== undefined ? { emergencia } : {}),
      ...(notas !== undefined ? { notas } : {}),
      ...(genero !== undefined ? { genero } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(estadoPago !== undefined ? { estadoPago } : {})
    };
    guardarExtraPacientes(mapaExtra);

    let emailUsuario = email || extraPrevio.email || null;
    if (!emailUsuario && pacienteActualizado.id_usuario) {
      const u = await prisma.usuarios.findUnique({ where: { id_usuario: pacienteActualizado.id_usuario } });
      emailUsuario = u?.email || null;
    }

    res.status(200).json(enriquecerPaciente(pacienteActualizado, emailUsuario, mapaExtra));
  } catch (error) {
    console.error("Error al actualizar paciente:", error);
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

