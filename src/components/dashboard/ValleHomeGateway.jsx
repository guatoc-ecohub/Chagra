import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { TransicionNewDonk } from '../../visual/mundo3d/index.js';
import {
  VALLE_AUTO_DELAY_MS,
  VALLE_TEASER_MS,
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
 * Puerta compartida por las dos portadas de finca: FincaVivaHero y la tarjeta
 * legacy MiFincaVivaHomeCard.
 *
 * El auto-teaser muestra CUADROS REALES del valle 3D (GPU-capturados, webp
 * livianos en public/valle-teaser/) — no una postal CSS. Rota entre los cuadros
 * en cada aparición y los precarga en idle: nunca descarga la escena 3D pesada.
 * La entrada de la persona sí usa la transición New Donk completa y solo
 * entonces prepara el destino.
 */
export default function ValleHomeGateway({ onNavigate, compact = false }) {
  const [fase, setFase] = useState('reposo'); // reposo | teaser | entrando
  const [teaserFrame, setTeaserFrame] = useState(0); // cuadro real visible
  const timerRef = useRef(null);
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const limpiarTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Precarga perezosa de los cuadros reales: en idle, jamas en el primer paint.
  useEffect(() => {
    if (reducedMotion) return undefined;
    const idle = typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function';
    const id = idle
      ? window.requestIdleCallback(precargarFramesTeaser, { timeout: 3000 })
      : setTimeout(precargarFramesTeaser, 1500);
    return () => {
      if (idle && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return undefined;
    let activo = true;
    const programar = () => {
      timerRef.current = setTimeout(() => {
        if (!activo) return;
        setFase('teaser');
        timerRef.current = setTimeout(() => {
          if (!activo) return;
          setFase('reposo');
          // Rota al siguiente cuadro real mientras el teaser esta oculto: sin
          // parpadeo, y en 3 apariciones se ven los tres cuadros del valle.
          setTeaserFrame((i) => (i + 1) % VALLE_TEASER_FRAMES.length);
          programar();
        }, VALLE_TEASER_MS);
      }, VALLE_AUTO_DELAY_MS);
    };
    programar();
    return () => {
      activo = false;
      limpiarTimer();
    };
  }, [limpiarTimer, reducedMotion]);

  const entrar = useCallback(() => {
    if (fase === 'entrando') return;
    limpiarTimer();
    setFase('entrando');
    // La importación ocurre por gesto explícito, nunca en el primer paint.
    preloadValleMarco();
  }, [fase, limpiarTimer]);

  const terminarEntrada = useCallback(() => {
    navegarAlValle(onNavigate);
  }, [onNavigate]);

  return (
    <section
      className={`vhw${compact ? ' vhw--compact' : ''}`}
      data-testid="valle-home-gateway"
      data-fase={fase}
      aria-label="Entrada al valle de su finca"
    >
      <button
        type="button"
        className="vhw__portal"
        onClick={entrar}
        disabled={fase === 'entrando'}
        aria-label="Entrar al valle de su finca en 3D"
      >
        <span className="vhw__sky" aria-hidden="true">
          <span className="vhw__aurora" />
          <span className="vhw__moon" />
          <span className="vhw__ridge vhw__ridge--far" />
          <span className="vhw__ridge vhw__ridge--near" />
          <span className="vhw__house">
            <i className="vhw__roof" />
            <i className="vhw__window" />
          </span>
          <span className="vhw__river" />
          <span className="vhw__firefly vhw__firefly--one" />
          <span className="vhw__firefly vhw__firefly--two" />
        </span>
        <span className="vhw__copy">
          <span className="vhw__kicker"><Sparkles size={13} aria-hidden="true" /> Su valle vivo</span>
          <strong>Caminar el valle</strong>
          <small>Entre a su finca en 3D</small>
        </span>
        <span className="vhw__arrow" aria-hidden="true"><ArrowUpRight size={21} /></span>
      </button>

      {fase === 'teaser' && (
        <button
          type="button"
          className="vhw__teaser"
          data-testid="valle-home-teaser"
          onClick={entrar}
          aria-label="Entrar al valle de su finca en 3D"
        >
          <div className="vhw__teaser-rays" aria-hidden="true">
            <i /><i /><i /><i /><i /><i /><i /><i />
          </div>
          <div className="vhw__teaser-window" aria-hidden="true">
            {/* CUADRO REAL del valle 3D (no postal CSS). El fondo-gradiente de la
                ventana queda como fallback si la imagen no carga. */}
            <img
              key={teaserFrame}
              className="vhw__teaser-frame"
              src={VALLE_TEASER_FRAMES[teaserFrame]}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <p><Sparkles size={16} aria-hidden="true" /> El valle le está llamando</p>
        </button>
      )}

      {fase === 'entrando' && (
        <TransicionNewDonk
          mundoId="valle"
          destinoLabel="El valle de su finca"
          onMitad={preloadValleMarco}
          onFin={terminarEntrada}
        />
      )}
    </section>
  );
}
