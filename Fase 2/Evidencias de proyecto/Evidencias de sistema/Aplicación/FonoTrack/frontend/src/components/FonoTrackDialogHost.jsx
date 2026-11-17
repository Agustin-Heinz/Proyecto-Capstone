import { useEffect, useId, useRef, useState } from 'react';
import {
  registrarHostDialogo,
  resolverDialogoActual,
  mostrarAlerta
} from '../utils/dialogoFonoTrack';

const CONFIG_VARIANTES = {
  success: {
    bgIcono: '#dcfce7',
    colorIcono: '#16a34a',
    bordeSuperior: '#16a34a',
    btnColor: '#1a365d',
    icono: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    )
  },
  error: {
    bgIcono: '#fee2e2',
    colorIcono: '#dc2626',
    bordeSuperior: '#dc2626',
    btnColor: '#1a365d',
    icono: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    )
  },
  warning: {
    bgIcono: '#fef3c7',
    colorIcono: '#d97706',
    bordeSuperior: '#f59e0b',
    btnColor: '#2563eb',
    icono: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  },
  danger: {
    bgIcono: '#fee2e2',
    colorIcono: '#dc2626',
    bordeSuperior: '#dc2626',
    btnColor: '#dc2626',
    icono: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      </svg>
    )
  },
  confirm: {
    bgIcono: '#dbeafe',
    colorIcono: '#2563eb',
    bordeSuperior: '#2563eb',
    btnColor: '#2563eb',
    icono: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  },
  info: {
    bgIcono: '#dbeafe',
    colorIcono: '#1d4ed8',
    bordeSuperior: '#2563eb',
    btnColor: '#2563eb',
    icono: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    )
  }
};

export default function FonoTrackDialogHost() {
  const [dialogoActivo, setDialogoActivo] = useState(null);
  const dialogRef = useRef(null);
  const btnPrimarioRef = useRef(null);
  const btnCancelarRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const desuscribir = registrarHostDialogo(setDialogoActivo);
    const alertNativo = window.alert;
    window.alert = (msg) => {
      mostrarAlerta(msg);
    };
    return () => {
      desuscribir();
      window.alert = alertNativo;
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (dialogoActivo) {
      if (!dialog.open) {
        dialog.returnValue = '';
        dialog.showModal();
      }
      const focoObjetivo =
        dialogoActivo.modo === 'confirm' && dialogoActivo.destructivo
          ? btnCancelarRef.current
          : btnPrimarioRef.current;
      focoObjetivo?.focus();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [dialogoActivo]);

  // Fallback para closedby="any" en navegadores sin soporte nativo de closedBy
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const manejarClose = () => {
      const valor = dialog.returnValue;
      dialog.returnValue = '';
      resolverDialogoActual(valor === 'confirm');
    };

    dialog.addEventListener('close', manejarClose);

    let removerClickFallback = null;
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      const manejarClickBackdrop = (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const dentroContenido =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (dentroContenido) return;
        dialog.close('cancel');
      };
      dialog.addEventListener('click', manejarClickBackdrop);
      removerClickFallback = () => dialog.removeEventListener('click', manejarClickBackdrop);
    }

    return () => {
      dialog.removeEventListener('close', manejarClose);
      if (removerClickFallback) removerClickFallback();
    };
  }, []);

  const varianteCfg =
    CONFIG_VARIANTES[dialogoActivo?.variante] || CONFIG_VARIANTES.info;

  return (
    <dialog
      ref={dialogRef}
      className="fonotrack-dialog fonotrack-alert-modal"
      {...{ closedby: 'any' }}
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      {dialogoActivo && (
        <form method="dialog" className="fonotrack-alert-card">
          <div
            className="fonotrack-alert-top-bar"
            style={{ backgroundColor: varianteCfg.bordeSuperior }}
          />
          <div className="fonotrack-alert-header">
            <span className="fonotrack-alert-brand">FONOTRACK</span>
            <button
              type="submit"
              value="cancel"
              aria-label="Cerrar ventana"
              className="fonotrack-alert-close"
            >
              ✕
            </button>
          </div>

          <div className="fonotrack-alert-body">
            <div
              className="fonotrack-alert-icon"
              style={{ backgroundColor: varianteCfg.bgIcono }}
            >
              {varianteCfg.icono}
            </div>
            <h2 id={titleId} className="fonotrack-alert-title">
              {dialogoActivo.titulo}
            </h2>
            <p id={descId} className="fonotrack-alert-message">
              {dialogoActivo.mensaje}
            </p>
          </div>

          <div className="fonotrack-alert-actions">
            {dialogoActivo.modo === 'confirm' && (
              <button
                ref={btnCancelarRef}
                type="submit"
                value="cancel"
                className="fonotrack-alert-btn-secondary"
              >
                {dialogoActivo.textoCancelar || 'Cancelar'}
              </button>
            )}
            <button
              ref={btnPrimarioRef}
              type="submit"
              value="confirm"
              className="fonotrack-alert-btn-primary"
              style={{ backgroundColor: varianteCfg.btnColor }}
            >
              {dialogoActivo.textoConfirmar || 'Aceptar'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}

