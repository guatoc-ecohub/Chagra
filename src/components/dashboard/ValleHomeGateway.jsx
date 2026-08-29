/* eslint-disable chagra-i18n/no-hardcoded-spanish -- copy visible de esta
 * interacción puntual, fuera del alcance de la migración i18n ADR-050. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Sparkles, X } from 'lucide-react';
import { TransicionNewDonk } from '../../visual/mundo3d/index.js';
import {
  VALLE_TEASER_FRAMES,
  precargarFramesTeaser,
  preloadValleMarco,
} from './valleHomeGatewayConstants.js';
import './valle-home-gateway.css';

function navegarAlValle(onNavigate) {
  if (onNavigate) {
    onNavigate('valle3d');
    return;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'valle3d' } }));
  }
}

/**
 * Capa de entrada al valle sobre el frame vivo de la finca.
 *
 * La escena que recibe como children conserva su animación y sus controles. La
 * puerta solo se hace visible cuando una persona pasa el mouse, toca o enfoca
 * el frame. Los cuadros del valle son referencias públicas livianas, no parte
 * del bundle de la escena 3D.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children frame animado de la finca
 * @param {Function} [props.onNavigate] navegación de la app
 * @param {boolean} [props.enabled] activa la puerta para este frame
 * @param {boolean} [props.compact] variante para una tarjeta compacta
 */
export default function ValleHomeGateway({ children, onNavigate, enabled = true }) {
  const [fase, setFase] = useState('reposo'); // reposo | teaser | confirmando | entrando
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reducedMotion] = useState(() => (
    typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ));
  const confirmarRef = useRef(null);

  const revelar = useCallback(() => {
    if (!enabled || fase === 'entrando' || confirmOpen) return;
    precargarFramesTeaser();
    setFase('teaser');
  }, [confirmOpen, enabled, fase]);

  const ocultar = useCallback(() => {
    if (enabled && !confirmOpen && fase !== 'entrando') setFase('reposo');
  }, [confirmOpen, enabled, fase]);

  const pedirConfirmacion = useCallback(() => {
    setConfirmOpen(true);
    setFase('confirmando');
  }, []);

  const cancelar = useCallback(() => {
    setConfirmOpen(false);
    setFase('reposo');
  }, []);

  const confirmarEntrada = useCallback(() => {
    setConfirmOpen(false);
    setFase('entrando');
    preloadValleMarco();
  }, []);

  useEffect(() => {
    if (!confirmOpen) return undefined;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    confirmarRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') cancelar();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus?.();
    };
  }, [cancelar, confirmOpen]);

  const terminarEntrada = useCallback(() => {
    navegarAlValle(onNavigate);
  }, [onNavigate]);

  if (!enabled) return children;

  return (
    <section
      className="vhw vhw--frame"
      data-testid="valle-home-gateway"
      data-fase={fase}
      aria-label="Entrada al valle de su finca"
      onMouseEnter={revelar}
      onMouseLeave={ocultar}
      onPointerDown={revelar}
      onTouchStart={revelar}
      onFocusCapture={revelar}
    >
      <div className="vhw__frame">{children}</div>

      {(fase === 'teaser' || fase === 'confirmando') && (
        <div className="vhw__teaser" data-testid="valle-home-teaser">
          <div className="vhw__teaser-backdrop" aria-hidden="true" />
          <div className="vhw__teaser-window" aria-hidden="true">
            {VALLE_TEASER_FRAMES.map((frame, index) => (
              <img
                key={frame}
                className="vhw__teaser-frame"
                src={frame}
                alt=""
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
              />
            ))}
          </div>
          <div className="vhw__teaser-copy">
            <span><Sparkles size={15} aria-hidden="true" /> Tres vistas reales del valle</span>
            <strong>Entrá al valle 3D</strong>
            <small>Hacé clic o tocá para mirar adentro</small>
          </div>
          <button
            type="button"
            className="vhw__invite"
            data-testid="valle-home-invite"
            onClick={pedirConfirmacion}
            aria-label="Entrá al valle 3D"
          >
            Entrá al valle 3D
            <ArrowUpRight size={19} aria-hidden="true" />
          </button>
        </div>
      )}

      {confirmOpen && (
        <div className="vhw__dialog-backdrop" role="presentation">
          <div
            className="vhw__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="valle-home-confirm-title"
            aria-describedby="valle-home-confirm-copy"
            data-testid="valle-home-confirm"
          >
            <button type="button" className="vhw__dialog-close" onClick={cancelar} aria-label="Cerrar diálogo">
              <X size={20} aria-hidden="true" />
            </button>
            <span className="vhw__dialog-kicker"><Sparkles size={15} aria-hidden="true" /> Entrada guiada</span>
            <h2 id="valle-home-confirm-title">¿Entrar al valle 3D?</h2>
            <p id="valle-home-confirm-copy">La finca queda aquí mientras recorres el valle.</p>
            <div className="vhw__dialog-actions">
              <button type="button" onClick={cancelar}>Cancelar</button>
              <button type="button" ref={confirmarRef} onClick={confirmarEntrada}>Entrá al valle 3D</button>
            </div>
          </div>
        </div>
      )}

      {fase === 'entrando' && (
        <TransicionNewDonk
          mundoId="valle"
          destinoLabel="El valle de su finca"
          reducedMotion={reducedMotion}
          onMitad={preloadValleMarco}
          onFin={terminarEntrada}
        />
      )}
    </section>
  );
}
