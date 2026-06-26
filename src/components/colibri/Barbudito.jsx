import { useEffect, useRef, useState } from 'react';
import './barbudito.css';

/**
 * Barbudito — el colibrí REAL (barbudito de páramo) curado por el operador, en
 * sus tres usos. Reemplazo aprobado del colibrí 3D inflado (Three.js / R3F,
 * rechazado). Todo liviano y universal: 0 WebGL, 0 Three.js.
 *
 * Exporta tres componentes:
 *   - BarbuditoVentana → "ventana viva" del home (video H.264 del barbudito en
 *     la flor del frailejón, enmarcado y redondeado). Sin alpha → corre en TODO
 *     navegador (incl. iOS).
 *   - BarbuditoPosado  → barbudito posado (PNG transparente) para el FAB.
 *   - BarbuditoCruza   → fly-across UNA pasada para la transición home→agente:
 *     webm VP9-alpha; fallback sprite steps(16)+translateX donde no hay
 *     VP9-alpha (iOS Safari).
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 */

const VENTANA_SRC = '/colibri/barbudito-ventana.mp4';
const VENTANA_POSTER = '/colibri/barbudito-poster.png';
const POSADO_SRC = '/colibri/barbudito-posado.png';
const CRUZA_WEBM = '/colibri/barbudito-transition.webm';
const CRUZA_SPRITE = '/colibri/barbudito-sprite.png';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/** ¿El navegador puede reproducir webm con canal alpha (VP9-alpha)? iOS Safari
 *  NO → caemos al sprite. Heurística por canPlayType (no perfecta pero suficiente
 *  para distinguir iOS, que devuelve '' para webm). */
function soportaWebmAlpha() {
  if (typeof document === 'undefined') return false;
  try {
    const v = document.createElement('video');
    const can = v.canPlayType('video/webm; codecs="vp9"');
    return can === 'probably' || can === 'maybe';
  } catch (_) {
    return false;
  }
}

/**
 * BarbuditoVentana — "ventana viva del páramo" del home: el barbudito tomando
 * néctar de la flor del frailejón, en un recuadro redondeado. Video normal
 * (autoplay/loop/muted/playsinline), pausado fuera de pantalla (gama baja).
 *
 * @param {Object} props
 * @param {number} [props.size=180]  lado en px de la ventana (cuadrada).
 * @param {string} [props.className]
 * @param {string} [props.ariaLabel]
 */
export function BarbuditoVentana({ size = 180, className = '', ariaLabel }) {
  const ref = useRef(null);
  const reduce = prefersReducedMotion();

  // Pausar/reanudar el video según visibilidad (ahorro en gama baja).
  useEffect(() => {
    if (reduce) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const vid = el.querySelector('video');
          if (!vid) return;
          if (e.isIntersecting) { vid.play?.().catch(() => {}); }
          else { vid.pause?.(); }
        });
      },
      { rootMargin: '60px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  return (
    <span
      ref={ref}
      className={`barbudito-ventana ${className}`.trim()}
      style={{ width: size, height: size }}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel || undefined}
      aria-hidden={ariaLabel ? undefined : 'true'}
    >
      {reduce ? (
        <img src={VENTANA_POSTER} alt="" draggable={false} />
      ) : (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={VENTANA_POSTER}
        >
          <source src={VENTANA_SRC} type="video/mp4" />
        </video>
      )}
    </span>
  );
}

/**
 * BarbuditoPosado — barbudito posado (PNG transparente) para el FAB. Estático
 * con un leve flotar (se apaga con reduced-motion vía CSS).
 *
 * @param {Object} props
 * @param {number} [props.size=46]
 * @param {string} [props.className]
 * @param {string} [props.ariaLabel]
 */
export function BarbuditoPosado({ size = 46, className = '', ariaLabel }) {
  return (
    <img
      src={POSADO_SRC}
      alt={ariaLabel || ''}
      aria-hidden={ariaLabel ? undefined : 'true'}
      draggable={false}
      className={`barbudito-posado ${className}`.trim()}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * BarbuditoCruza — fly-across UNA pasada para la transición home→agente. Usa el
 * webm VP9-alpha donde se soporta; si no (iOS), el sprite steps(16) cruzando.
 * Reduced-motion → no cruza (lo decide el padre, que muestra el póster).
 *
 * @param {Object} props
 * @param {number} [props.size=150]
 * @param {string} [props.className]
 */
export function BarbuditoCruza({ size = 150, className = '' }) {
  const [webmOk] = useState(() => soportaWebmAlpha());

  if (webmOk) {
    return (
      <video
        className={className}
        style={{ width: size, height: size, objectFit: 'contain' }}
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src={CRUZA_WEBM} type="video/webm" />
      </video>
    );
  }

  // Fallback universal (iOS): sprite cruzando una sola pasada.
  return (
    <span
      className={`barbudito-cruza ${className}`.trim()}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${CRUZA_SPRITE})`,
      }}
    />
  );
}
