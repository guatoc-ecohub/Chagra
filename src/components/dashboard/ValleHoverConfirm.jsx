/* eslint-disable chagra-i18n/no-hardcoded-spanish -- copy puntual de la entrada al valle. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { TransicionNewDonk } from '../../visual/mundo3d/index.js';
import './valle-hover-confirm.css';

const VALLE_TEASER_FRAMES = [
  '/valle-teaser/valle-teaser-1.webp',
  '/valle-teaser/valle-teaser-2.webp',
  '/valle-teaser/valle-teaser-3.webp',
];

function navegarAlValle(onNavigate) {
  if (onNavigate) {
    onNavigate('valle3d');
    return;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'valle3d' } }));
  }
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(media.matches);
    media.addEventListener?.('change', change);
    return () => media.removeEventListener?.('change', change);
  }, []);

  return reducedMotion;
}

/**
 * La capa que aparece sobre la escena ya existente de FincaVivaHero. No anima
 * ni sustituye la finca: solo muestra los tres cuadros reales tras un gesto de
 * intención y pide confirmar antes de iniciar el viaje.
 */
export default function ValleHoverConfirm({ active, onDismiss, onDialogOpenChange, onNavigate }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entering, setEntering] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!active && !entering) setDialogOpen(false);
  }, [active, entering]);

  const abrirDialogo = useCallback(() => {
    setDialogOpen(true);
    onDialogOpenChange?.(true);
  }, [onDialogOpenChange]);

  const cancelar = useCallback(() => {
    setDialogOpen(false);
    onDialogOpenChange?.(false);
    onDismiss?.();
  }, [onDialogOpenChange, onDismiss]);

  const confirmar = useCallback(() => {
    setDialogOpen(false);
    onDialogOpenChange?.(false);
    setEntering(true);
  }, [onDialogOpenChange]);

  const terminarEntrada = useCallback(() => navegarAlValle(onNavigate), [onNavigate]);
  const mostrarInvitacion = active && !dialogOpen && !entering;
  const frameLabel = useMemo(() => (
    `Tres vistas reales del valle${reducedMotion ? ', sin movimiento' : ''}`
  ), [reducedMotion]);

  return (
    <>
      {mostrarInvitacion && (
        <aside className="vhc" data-testid="valle-hover-confirm" aria-label={frameLabel}>
          <div className="vhc__frames" aria-hidden="true">
            {VALLE_TEASER_FRAMES.map((src, index) => (
              <img
                key={src}
                className={`vhc__frame vhc__frame--${index + 1}`}
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
          <button
            type="button"
            className="vhc__invite"
            data-testid="valle-hover-invite"
            onClick={abrirDialogo}
          >
            <Sparkles size={17} aria-hidden="true" />
            <span>Entrá al valle 3D</span>
            <ArrowUpRight size={19} aria-hidden="true" />
          </button>
        </aside>
      )}

      {dialogOpen && (
        <div className="vhc__backdrop" data-testid="valle-confirm-dialog" role="presentation">
          <section className="vhc__dialog" role="dialog" aria-modal="true" aria-labelledby="valle-confirm-title">
            <Sparkles className="vhc__dialog-icon" size={24} aria-hidden="true" />
            <h2 id="valle-confirm-title">¿Entrar al valle 3D?</h2>
            <p>Va a abrir la vista tridimensional de su finca.</p>
            <div className="vhc__actions">
              <button type="button" className="vhc__cancel" onClick={cancelar}>Cancelar</button>
              <button type="button" className="vhc__confirm" onClick={confirmar}>Entrar al valle 3D</button>
            </div>
          </section>
        </div>
      )}

      {entering && (
        <TransicionNewDonk
          mundoId="valle"
          reducedMotion={reducedMotion}
          onFin={terminarEntrada}
        />
      )}
    </>
  );
}
