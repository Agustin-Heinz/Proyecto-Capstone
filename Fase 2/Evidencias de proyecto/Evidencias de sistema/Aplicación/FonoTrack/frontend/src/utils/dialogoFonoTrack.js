// Gestor centralizado de diálogos modales en página con la estética de FonoTrack
let suscriptorDialogo = null;
const colaDialogos = [];

function inferirVariante(mensaje = '', modo = 'alert') {
  if (modo === 'confirm') return 'confirm';
  const txt = String(mensaje || '').toLowerCase();
  if (
    /error|problema|incorrecto|inv[aá]lid|no se pudo|no encontramos|bloquead|ocupado|anulado|vac[ií]o|falta/.test(
      txt
    )
  ) {
    return 'error';
  }
  if (/aviso|recuerda|debes iniciar|selecciona|por favor ingresa|al menos/.test(txt)) {
    return 'warning';
  }
  if (/éxito|exito|bienvenido|creada|actualizad|guardad|confirmad|eliminad|reagendad/.test(txt)) {
    return 'success';
  }
  return 'info';
}

function inferirTitulo(variante, modo) {
  if (modo === 'confirm') return 'Confirmar acción';
  if (variante === 'error') return 'Atención';
  if (variante === 'warning') return 'Aviso de FonoTrack';
  if (variante === 'success') return 'Operación exitosa';
  return 'Aviso de FonoTrack';
}

function despacharSiguiente() {
  if (!suscriptorDialogo || colaDialogos.length === 0) return;
  suscriptorDialogo(colaDialogos[0]);
}

export function registrarHostDialogo(fn) {
  suscriptorDialogo = fn;
  if (fn && colaDialogos.length > 0) {
    fn(colaDialogos[0]);
  }
  return () => {
    if (suscriptorDialogo === fn) {
      suscriptorDialogo = null;
    }
  };
}

export function resolverDialogoActual(resultado) {
  const actual = colaDialogos.shift();
  if (actual && typeof actual.resolver === 'function') {
    actual.resolver(resultado);
  }
  if (suscriptorDialogo) {
    suscriptorDialogo(colaDialogos[0] || null);
  }
}

export function mostrarAlerta(mensaje, opciones = {}) {
  const texto = String(mensaje ?? '').trim();
  const variante = opciones.variante || inferirVariante(texto, 'alert');
  const titulo = opciones.titulo || inferirTitulo(variante, 'alert');

  return new Promise((resolve) => {
    colaDialogos.push({
      id: `${Date.now()}-${Math.random()}`,
      modo: 'alert',
      variante,
      titulo,
      mensaje: texto,
      textoConfirmar: opciones.textoConfirmar || 'Aceptar',
      resolver: () => resolve(true)
    });
    if (colaDialogos.length === 1) {
      despacharSiguiente();
    }
  });
}

export function mostrarConfirmacion(mensaje, opciones = {}) {
  const texto = String(mensaje ?? '').trim();
  const esDestructivo =
    opciones.destructivo ?? /eliminar|borrar|anular/i.test(texto);

  return new Promise((resolve) => {
    colaDialogos.push({
      id: `${Date.now()}-${Math.random()}`,
      modo: 'confirm',
      variante: esDestructivo ? 'danger' : 'confirm',
      titulo: opciones.titulo || (esDestructivo ? 'Confirmar eliminación' : 'Confirmar acción'),
      mensaje: texto,
      textoConfirmar: opciones.textoConfirmar || (esDestructivo ? 'Sí, eliminar' : 'Confirmar'),
      textoCancelar: opciones.textoCancelar || 'Cancelar',
      destructivo: esDestructivo,
      resolver: (confirmado) => resolve(Boolean(confirmado))
    });
    if (colaDialogos.length === 1) {
      despacharSiguiente();
    }
  });
}

