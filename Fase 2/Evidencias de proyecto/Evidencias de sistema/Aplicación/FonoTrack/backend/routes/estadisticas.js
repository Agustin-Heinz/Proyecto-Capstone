const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

// MÓDULO BUSINESS INTELLIGENCE Estadísticas Privadas por Profesional (GET)

router.get('/', async (req, res) => {
  try {
    const { id_fonoaudiologo } = req.query;
    if (!id_fonoaudiologo) return res.status(400).json({ mensaje: "Se requiere el ID del profesional." });

    const fonoId = parseInt(id_fonoaudiologo);
    const filtroPrivado = {
      id_fonoaudiologo: fonoId,
      estado_asistencia: { not: 'Anulada ' }
    };

    const todasLasCitas = await prisma.citas.findMany({ where: filtroPrivado });
    const todosLosServicios = await prisma.servicios.findMany();

    const ingresos = await prisma.citas.aggregate({
      _sum: { precio: true },
      where: { estado_pago: 'Pagado', ...filtroPrivado }
    });
    const totalDinero = ingresos._sum.precio || 0;

    const totalCitas = todasLasCitas.length;
    const asistencias = todasLasCitas.filter(c => c.estado_asistencia === 'Asistió').length;
    const porcentajeAsistencia = totalCitas > 0 ? Math.round((asistencias / totalCitas) * 100) : 0;

    const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const agrupadoPorTiempo = { semanal: {}, mensual: {}, anual: {} };

    const ahora = new Date();
    const hace7Dias = new Date();
    hace7Dias.setDate(ahora.getDate() - 7);
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    const servSemanal = {};
    const servMensual = {};
    const servAnual = {};

    const sumarServicio = (obj, id, precio, estado_pago) => {
      if (!obj[id]) obj[id] = { cantidad: 0, ingresos: 0 };
      obj[id].cantidad++;
      if (estado_pago === 'Pagado') obj[id].ingresos += precio;
    };

    todasLasCitas.forEach(cita => {
      if (!cita.fecha) return;
      const f = new Date(cita.fecha);

      const dia = diasNombres[f.getDay()];
      const mes = mesesNombres[f.getMonth()];
      const anio = f.getFullYear().toString();

      if (!agrupadoPorTiempo.semanal[dia]) agrupadoPorTiempo.semanal[dia] = { periodo: dia, asistencias: 0, inasistencias: 0 };
      if (!agrupadoPorTiempo.mensual[mes]) agrupadoPorTiempo.mensual[mes] = { periodo: mes, asistencias: 0, inasistencias: 0 };
      if (!agrupadoPorTiempo.anual[anio]) agrupadoPorTiempo.anual[anio] = { periodo: anio, asistencias: 0, inasistencias: 0 };

      if (cita.estado_asistencia === 'Asistió' || cita.estado_asistencia === 'Pendiente') {
        agrupadoPorTiempo.semanal[dia].asistencias++; agrupadoPorTiempo.mensual[mes].asistencias++; agrupadoPorTiempo.anual[anio].asistencias++;
      } else {
        agrupadoPorTiempo.semanal[dia].inasistencias++; agrupadoPorTiempo.mensual[mes].inasistencias++; agrupadoPorTiempo.anual[anio].inasistencias++;
      }

      const servId = cita.id_servicio;
      const precio = cita.precio || 0;

      if (f >= hace7Dias) sumarServicio(servSemanal, servId, precio, cita.estado_pago);
      if (f.getMonth() === mesActual && f.getFullYear() === anioActual) sumarServicio(servMensual, servId, precio, cita.estado_pago);
      if (f.getFullYear() === anioActual) sumarServicio(servAnual, servId, precio, cita.estado_pago);
    });

    const formatearTop = (conteo) => {
      return Object.keys(conteo).map(id => {
        const info = todosLosServicios.find(s => s.id_servicios === parseInt(id));
        return {
          nombre: info ? info.nombre_servicio : `Servicio ID ${id}`,
          cantidad: conteo[id].cantidad,
          ingresos: conteo[id].ingresos
        };
      }).sort((a, b) => b.cantidad - a.cantidad).slice(0, 4);
    };

    const serviciosProcesados = {
      semanal: formatearTop(servSemanal),
      mensual: formatearTop(servMensual),
      anual: formatearTop(servAnual)
    };

    const servicioTop = serviciosProcesados.anual.length > 0 ? serviciosProcesados.anual[0] : { nombre: 'Sin datos', cantidad: 0 };
    const porcentajeTop = totalCitas > 0 ? Math.round((servicioTop.cantidad / totalCitas) * 100) : 0;

    res.status(200).json({
      asistenciaPromedio: `${porcentajeAsistencia}%`,
      servicioTopNombre: servicioTop.nombre,
      servicioTopPorcentaje: `${porcentajeTop}%`,
      ingresosProyectados: `$${(totalDinero / 1000000).toFixed(1)} M`,
      ingresos_totales: totalDinero,
      datosPorTiempo: {
        semanal: Object.values(agrupadoPorTiempo.semanal),
        mensual: Object.values(agrupadoPorTiempo.mensual),
        anual: Object.values(agrupadoPorTiempo.anual)
      },
      distribucionServicios: serviciosProcesados
    });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al calcular BI", detalle: error.message });
  }
});

module.exports = router;

