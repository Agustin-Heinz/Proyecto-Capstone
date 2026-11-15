const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

// MÓDULO BUSINESS INTELLIGENCE Estadísticas Privadas por Profesional (GET)

router.get('/', async (req, res) => {
  try {
    const { id_fonoaudiologo } = req.query;
    const fonoId = parseInt(id_fonoaudiologo, 10);

    if (!id_fonoaudiologo || id_fonoaudiologo === 'undefined' || id_fonoaudiologo === 'null' || isNaN(fonoId)) {
      return res.status(400).json({ mensaje: "Se requiere un ID de profesional válido." });
    }

    const filtroPrivado = {
      id_fonoaudiologo: fonoId,
      AND: [
        {
          OR: [
            { estado_asistencia: { not: 'Anulada' } },
            { estado_asistencia: null }
          ]
        },
        {
          OR: [
            { estado_pago: { notIn: ['Cancelado', 'En proceso'] } },
            { estado_pago: null }
          ]
        }
      ]
    };

    const todasLasCitas = await prisma.citas.findMany({ where: filtroPrivado });
    const todosLosServicios = await prisma.servicios.findMany({
      where: { id_fonoaudiologo: fonoId }
    });
    const catalogoTodosServicios = await prisma.servicios.findMany();

    const ingresos = await prisma.citas.aggregate({
      _sum: { precio: true },
      where: { estado_pago: 'Pagado', ...filtroPrivado }
    });
    const totalDinero = ingresos._sum.precio || 0;

    // Asistencia real calculada sobre citas cerradas (Asistió vs Faltó), sin castigar por citas futuras pendientes
    const asistencias = todasLasCitas.filter(c => c.estado_asistencia === 'Asistió').length;
    const inasistencias = todasLasCitas.filter(c => c.estado_asistencia === 'Faltó').length;
    const totalCitasEvaluadas = asistencias + inasistencias;
    const porcentajeAsistencia = totalCitasEvaluadas > 0
      ? Math.round((asistencias / totalCitasEvaluadas) * 100)
      : 0;

    const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const diasNombresUTC = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const ordenDiasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    // Pre-inicializar semana (Lun a Dom) y mes (Ene a Dic) en orden cronológico
    const agrupadoPorTiempo = {
      semanal: {},
      mensual: {},
      anual: {}
    };

    ordenDiasSemana.forEach(dia => {
      agrupadoPorTiempo.semanal[dia] = { periodo: dia, asistencias: 0, inasistencias: 0 };
    });
    mesesNombres.forEach(mes => {
      agrupadoPorTiempo.mensual[mes] = { periodo: mes, asistencias: 0, inasistencias: 0 };
    });

    // Fechas de referencia en UTC para evitar desfases de zona horaria (UTC-3 / UTC-4)
    const ahora = new Date();
    const anioActual = ahora.getFullYear();
    const mesActual = ahora.getMonth();
    const hoyUTC = Date.UTC(anioActual, mesActual, ahora.getDate());

    // Ventana semanal: últimos 7 días (incluyendo hoy) y hasta el cierre de la semana actual (Domingo)
    const hace7DiasUTC = Date.UTC(anioActual, mesActual, ahora.getDate() - 6);
    const diaSemanaHoy = ahora.getDay(); // 0 = Dom, 1 = Lun, ...
    const diasHastaDomingo = diaSemanaHoy === 0 ? 0 : 7 - diaSemanaHoy;
    const finSemanaActualUTC = Date.UTC(anioActual, mesActual, ahora.getDate() + diasHastaDomingo, 23, 59, 59, 999);
    const inicioSemanaActualUTC = Date.UTC(
      anioActual,
      mesActual,
      ahora.getDate() - (diaSemanaHoy === 0 ? 6 : diaSemanaHoy - 1)
    );
    const inicioVentanaSemanalUTC = Math.min(hace7DiasUTC, inicioSemanaActualUTC);

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
      if (isNaN(f.getTime())) return;

      // Extraer componentes en UTC porque @db.Date se almacena a las 00:00:00 UTC
      const anioNum = f.getUTCFullYear();
      const mesNum = f.getUTCMonth();
      const diaNum = f.getUTCDate();
      const diaSemanaNum = f.getUTCDay();
      const fechaCitaUTC = Date.UTC(anioNum, mesNum, diaNum);

      const dia = diasNombresUTC[diaSemanaNum];
      const mes = mesesNombres[mesNum];
      const anio = anioNum.toString();

      const enVentanaSemanal = fechaCitaUTC >= inicioVentanaSemanalUTC && fechaCitaUTC <= finSemanaActualUTC;
      const enMesActual = anioNum === anioActual && mesNum === mesActual;
      const enAnioActual = anioNum === anioActual;

      if (!agrupadoPorTiempo.anual[anio]) {
        agrupadoPorTiempo.anual[anio] = { periodo: anio, asistencias: 0, inasistencias: 0 };
      }

      if (cita.estado_asistencia === 'Asistió') {
        if (enVentanaSemanal) agrupadoPorTiempo.semanal[dia].asistencias++;
        if (enAnioActual) agrupadoPorTiempo.mensual[mes].asistencias++;
        agrupadoPorTiempo.anual[anio].asistencias++;
      } else if (cita.estado_asistencia === 'Faltó') {
        if (enVentanaSemanal) agrupadoPorTiempo.semanal[dia].inasistencias++;
        if (enAnioActual) agrupadoPorTiempo.mensual[mes].inasistencias++;
        agrupadoPorTiempo.anual[anio].inasistencias++;
      }

      const servId = cita.id_servicio;
      const precio = Number(cita.precio) || 0;

      if (enVentanaSemanal) sumarServicio(servSemanal, servId, precio, cita.estado_pago);
      if (enMesActual) sumarServicio(servMensual, servId, precio, cita.estado_pago);
      if (enAnioActual) sumarServicio(servAnual, servId, precio, cita.estado_pago);
    });

    const formatearTop = (conteo) => {
      const ids = Object.keys(conteo);
      const totalCitasPeriodo = ids.reduce((acc, id) => acc + conteo[id].cantidad, 0);

      const listaCompleta = ids.map(id => {
        const idNum = parseInt(id, 10);
        const info = todosLosServicios.find(s => s.id_servicios === idNum)
          || catalogoTodosServicios.find(s => s.id_servicios === idNum);
        const cantidad = conteo[id].cantidad;
        return {
          nombre: info ? info.nombre_servicio : `Servicio ID ${id}`,
          cantidad,
          ingresos: conteo[id].ingresos,
          porcentaje: totalCitasPeriodo > 0 ? Math.round((cantidad / totalCitasPeriodo) * 100) : 0,
          totalPeriodo: totalCitasPeriodo
        };
      }).sort((a, b) => b.cantidad - a.cantidad);

      if (listaCompleta.length <= 4) return listaCompleta;

      const top3 = listaCompleta.slice(0, 3);
      const resto = listaCompleta.slice(3);
      const cantidadOtros = resto.reduce((acc, item) => acc + item.cantidad, 0);
      const ingresosOtros = resto.reduce((acc, item) => acc + item.ingresos, 0);

      return [
        ...top3,
        {
          nombre: 'Otros servicios',
          cantidad: cantidadOtros,
          ingresos: ingresosOtros,
          porcentaje: totalCitasPeriodo > 0 ? Math.round((cantidadOtros / totalCitasPeriodo) * 100) : 0,
          totalPeriodo: totalCitasPeriodo
        }
      ];
    };

    const serviciosProcesados = {
      semanal: formatearTop(servSemanal),
      mensual: formatearTop(servMensual),
      anual: formatearTop(servAnual)
    };

    const servicioTop = serviciosProcesados.anual.length > 0
      ? serviciosProcesados.anual[0]
      : { nombre: 'Sin datos', cantidad: 0, porcentaje: 0 };

    const aniosOrdenados = Object.keys(agrupadoPorTiempo.anual)
      .sort((a, b) => Number(a) - Number(b))
      .map(anio => agrupadoPorTiempo.anual[anio]);

    res.status(200).json({
      asistenciaPromedio: `${porcentajeAsistencia}%`,
      servicioTopNombre: servicioTop.nombre,
      servicioTopPorcentaje: `${servicioTop.porcentaje}%`,
      ingresosProyectados: `$${(totalDinero / 1000000).toFixed(1)} M`,
      ingresos_totales: totalDinero,
      datosPorTiempo: {
        semanal: ordenDiasSemana.map(dia => agrupadoPorTiempo.semanal[dia]),
        mensual: mesesNombres.map(mes => agrupadoPorTiempo.mensual[mes]),
        anual: aniosOrdenados
      },
      distribucionServicios: serviciosProcesados
    });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al calcular BI", detalle: error.message });
  }
});

module.exports = router;

