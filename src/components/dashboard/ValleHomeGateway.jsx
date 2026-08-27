import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { TransicionNewDonk } from '../../visual/mundo3d/index.js';
import {
  VALLE_AUTO_DELAY_MS,
  VALLE_TEASER_MS,
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
 * El auto-teaser es una postal SVG/CSS de peso cero que conserva el lenguaje
 * del valle sin descargar la escena 3D. La entrada de la persona sí usa la
 * transición New Donk completa y solo entonces prepara el destino.
 */
export default function ValleHomeGateway({ onNavigate, compact = false }) {
  const [fase, setFase] = useState('reposo'); // reposo | teaser | entrando
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
            <span className="vhw__teaser-mountain vhw__teaser-mountain--one" />
            <span className="vhw__teaser-mountain vhw__teaser-mountain--two" />
            <span className="vhw__teaser-valley" />
            <span className="vhw__teaser-path" />
            <span className="vhw__teaser-star vhw__teaser-star--one" />
            <span className="vhw__teaser-star vhw__teaser-star--two" />
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
