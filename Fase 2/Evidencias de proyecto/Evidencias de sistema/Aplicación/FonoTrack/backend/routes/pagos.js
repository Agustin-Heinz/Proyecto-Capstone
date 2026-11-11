const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const tx = require('../config/transbank');

// PASARELA TRANSBANK (WEBPAY PLUS)

// Iniciar transacción en Webpay (Para el apartado de Citas y para Planes)
router.post('/iniciar', async (req, res) => {
  try {
    const { tipo, id_referencia, id_fonoaudiologo, monto, returnUrl } = req.body;
    // tipo puede ser 'CITA' o 'PLAN', para diferenciar uno de otro
    // buyOrder tiene máximo 26 caracteres en Transbank

    const buyOrder = tipo === 'CITA'
      ? `CITA-${id_referencia}-${Date.now().toString().slice(-6)}`
      : `PLAN-${id_referencia}-F-${id_fonoaudiologo}-${Date.now().toString().slice(-5)}`;

    const sessionId = `S-${Date.now()}`;
    const urlRetornoFinal = returnUrl || 'http://localhost:5173/confirmacion-pago';

    const createResponse = await tx.create(
      buyOrder,
      sessionId,
      Number(monto),
      urlRetornoFinal
    );

    // Si es el pago de un PLAN, registramos la orden como PENDIENTE en la tabla 'pagos'
    if (tipo === 'PLAN' && id_fonoaudiologo) {
      await prisma.pagos.create({
        data: {
          id_fonoaudiologo: Number(id_fonoaudiologo),
          id_plan: Number(id_referencia),
          estado_pago: 'PENDIENTE',
          monto_final: Number(monto),
          tbk_token: createResponse.token,
          tbk_orden_compra: buyOrder
        }
      });
    }

    res.status(200).json({
      url: createResponse.url,
      token: createResponse.token
    });
  } catch (error) {
    console.error("Error al iniciar pago en Transbank:", error);
    res.status(500).json({ mensaje: "No se pudo iniciar el pago con Webpay", detalle: error.message });
  }
});

// Confirmación de la transacción al volver de Webpay
router.post('/confirmar', async (req, res) => {
  try {
    const { token_ws } = req.body;
    if (!token_ws) {
      return res.status(400).json({ mensaje: "Pago anulado o token no recibido" });
    }

    // Evitar doble commit si React StrictMode dispara dos veces la petición
    const pagoPreviaConfirmacion = await prisma.pagos.findFirst({
      where: { tbk_token: token_ws }
    });
    if (pagoPreviaConfirmacion && pagoPreviaConfirmacion.estado_pago === 'PAGADO') {
      return res.status(200).json({
        exito: true,
        tipo: 'PLAN',
        id_fonoaudiologo: pagoPreviaConfirmacion.id_fonoaudiologo,
        id_plan: pagoPreviaConfirmacion.id_plan,
        monto: pagoPreviaConfirmacion.monto_final,
        codigo_autorizacion: pagoPreviaConfirmacion.tbk_codigo_autorizacion
      });
    }

    const commitResponse = await tx.commit(token_ws);

    if (commitResponse.status !== 'AUTHORIZED') {
      return res.status(400).json({
        mensaje: "El pago fue rechazado por el banco",
        estado: commitResponse.status
      });
    }

    const buyOrder = commitResponse.buy_order;

    // CASO 1, El paciente pagó una CITA (Formato: CITA-85-123456)
    if (buyOrder.startsWith('CITA-')) {
      const idCita = parseInt(buyOrder.split('-')[1]);

      await prisma.citas.update({
        where: { id_citas: idCita },
        data: { estado_pago: 'Pagado' }
      });

      return res.status(200).json({
        exito: true,
        tipo: 'CITA',
        id_cita: idCita,
        monto: commitResponse.amount,
        codigo_autorizacion: commitResponse.authorization_code
      });
    }

    // CASO 2, El fonoaudiólogo pagó un PLAN (Formato: PLAN-1-F-3-12345)
    if (buyOrder.startsWith('PLAN-')) {
      const partes = buyOrder.split('-');
      const idPlan = parseInt(partes[1]);
      const idFono = parseInt(partes[3]);

      const pagoExistente = await prisma.pagos.findFirst({
        where: { tbk_token: token_ws }
      });

      if (pagoExistente) {
        await prisma.pagos.update({
          where: { id_pago: pagoExistente.id_pago },
          data: {
            estado_pago: 'PAGADO',
            tbk_codigo_autorizacion: String(commitResponse.authorization_code)
          }
        });
      } else {
        await prisma.pagos.create({
          data: {
            id_fonoaudiologo: idFono,
            id_plan: idPlan,
            estado_pago: 'PAGADO',
            monto_final: Number(commitResponse.amount),
            tbk_token: token_ws,
            tbk_orden_compra: buyOrder,
            tbk_codigo_autorizacion: String(commitResponse.authorization_code)
          }
        });
      }

      // Actualizar también cualquier intento previo que haya quedado en PENDIENTE para este fonoaudiólogo
      await prisma.pagos.updateMany({
        where: {
          id_fonoaudiologo: idFono,
          estado_pago: 'PENDIENTE'
        },
        data: {
          estado_pago: 'PAGADO',
          tbk_codigo_autorizacion: String(commitResponse.authorization_code)
        }
      });

      return res.status(200).json({
        exito: true,
        tipo: 'PLAN',
        id_fonoaudiologo: idFono,
        id_plan: idPlan,
        monto: commitResponse.amount,
        codigo_autorizacion: commitResponse.authorization_code
      });
    }

  } catch (error) {
    // Si React dispara la confirmación 2 veces por el StrictMode, ignoramos el falso error
    if (error.message && (error.message.includes('locked by another process') || error.message.includes('Invalid status'))) {
      return res.status(200).json({ exito: true, mensaje: "El pago ya había sido confirmado" });
    }
    
    console.error("Error al confirmar pago con Transbank:", error);
    res.status(500).json({ mensaje: "Error al confirmar el pago", detalle: error.message });
  }
});

// Consultar si un fonoaudiólogo tiene un plan pagado activo y vigente
router.get('/estado/:id_fonoaudiologo', async (req, res) => {
  try {
    const idFono = parseInt(req.params.id_fonoaudiologo);
    if (!idFono || isNaN(idFono)) {
      return res.status(400).json({ planActivo: false, mensaje: "ID inválido" });
    }

    const pagoConfirmado = await prisma.pagos.findFirst({
      where: {
        id_fonoaudiologo: idFono,
        estado_pago: { in: ['PAGADO', 'Pagado', 'pagado', 'AUTORIZADO', 'Aprobado'] }
      },
      orderBy: { id_pago: 'desc' }
    });

    if (!pagoConfirmado) {
      return res.status(200).json({ planActivo: false, pago: null });
    }

    const planInfo = await prisma.planes.findUnique({
      where: { id_plan: pagoConfirmado.id_plan }
    });
    const duracionDias = planInfo?.duracion_dias || 30;

    let planVigente = true;
    let fechaVencimiento = null;

    if (pagoConfirmado.fecha_pago) {
      fechaVencimiento = new Date(pagoConfirmado.fecha_pago);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + duracionDias);
      planVigente = fechaVencimiento >= new Date();
    }

    return res.status(200).json({
      planActivo: planVigente,
      fechaVencimiento,
      pago: pagoConfirmado
    });
  } catch (error) {
    console.error("Error al consultar estado de suscripción:", error);
    return res.status(500).json({ planActivo: false, error: error.message });
  }
});

module.exports = router;

