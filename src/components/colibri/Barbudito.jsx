import { useEffect, useRef, useState } from 'react';
import './barbudito.css';

/**
 * Barbudito — el colibrí del páramo (Oxypogon, "barbudito de páramo") en sus
 * usos de la PWA, todo liviano y universal: 0 WebGL, 0 Three.js. Reemplazo
 * aprobado del colibrí 3D inflado (Three.js / R3F, rechazado).
 *
 * Tras el feedback del operador (2026-06-26) el HOME ya NO muestra el recuadro
 * de video de la flor (rompía la escena ilustrada). En su lugar, un modo A/B
 * temporal (dev-only) compara DOS colibrís, uno a cada costado de la escena,
 * para que el operador elija cuál queda:
 *   - BarbuditoIlustrado → colibrí DIBUJADO (SVG/CSS, vectorial), basado en el
 *     barbudito de páramo (cresta + barba moteada + paleta del páramo: pardo,
 *     verde iridiscente, garganta blanca), al ESTILO ILUSTRADO de la escena
 *     Finca Viva. Aleteo suave en CSS. Cero assets, cero red.
 *   - BarbuditoRealLoop  → barbudito REAL recortado (transparente, SIN recuadro):
 *     sprite de 16 frames (4×4) animado por CSS `steps`, pausado fuera de
 *     pantalla; reduced-motion → frame estático (póster). Universal (incl. iOS).
 *
 * Otros usos (sin cambio de feedback):
 *   - BarbuditoPosado → barbudito posado (PNG transparente) para el FAB.
 *   - BarbuditoFlor   → clip de la FLOR del frailejón (H.264, sin alpha → corre
 *     en TODO navegador incl. iOS) para la TRANSICIÓN home→agente.
 *   - BarbuditoVentana / BarbuditoCruza → variantes anteriores, conservadas por
 *     compatibilidad (ya no se montan en el home ni en la transición).
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 */

const VENTANA_SRC = '/colibri/barbudito-ventana.mp4';
const VENTANA_POSTER = '/colibri/barbudito-poster.png';
const POSADO_SRC = '/colibri/barbudito-posado.png';
const CRUZA_WEBM = '/colibri/barbudito-transition.webm';
const CRUZA_SPRITE = '/colibri/barbudito-sprite.png';
// HOME A/B — lado REAL: sprite 4×4 (16 frames) del barbudito en vuelo, recortado
// y transparente. Animado por CSS steps(16); fuera de pantalla se pausa.
const REAL_SPRITE = '/colibri/barbudito-real-sprite.png';
const REAL_POSTER = '/colibri/barbudito-real-poster.png';
// TRANSICIÓN — clip de la flor del frailejón con el barbudito libando néctar.
const FLOR_SRC = '/colibri/flower-transition.mp4';
const FLOR_POSTER = '/colibri/barbudito-poster.png';

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

// ════════════════════════════════════════════════════════════════════════════
//  HOME A/B (1) — COLIBRÍ ILUSTRADO (SVG/CSS, vectorial).
//  Barbudito de páramo (Oxypogon): cresta puntiaguda buff/pardo, barba/garganta
//  blanca moteada con una raya verde iridiscente, cuerpo pardo cálido jaspeado,
//  alas pardas en punta, cola larga, pico corto y recto. Paleta del páramo (no
//  el turquesa/violeta del colibrí genérico). Estilo plano-ilustrado de la
//  escena Finca Viva. Aleteo + vuelo estacionario en CSS. rsvg-safe.
// ════════════════════════════════════════════════════════════════════════════

/**
 * BarbuditoIlustrado — colibrí del páramo dibujado a mano (vectorial). Liviano,
 * sin assets ni red; el aleteo y el vuelo estacionario los hace CSS (se apagan
 * con reduced-motion).
 *
 * @param {Object} props
 * @param {number} [props.size=120]  ancho en px (el alto sale del aspecto).
 * @param {string} [props.className]
 * @param {string} [props.ariaLabel]
 */
export function BarbuditoIlustrado({ size = 120, className = '', ariaLabel }) {
  return (
    <span
      className={`barbudito-ilustrado ${className}`.trim()}
      style={{ width: size }}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel || undefined}
      aria-hidden={ariaLabel ? undefined : 'true'}
    >
      <svg viewBox="0 0 120 100" width={size} height={(size * 100) / 120} className="barbudito-ilus-svg">
        <defs>
          {/* plumaje pardo cálido del páramo (no turquesa/violeta) */}
          <linearGradient id="bi-cuerpo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a87a4e" />
            <stop offset="55%" stopColor="#8c6238" />
            <stop offset="100%" stopColor="#6e4a28" />
          </linearGradient>
          <linearGradient id="bi-ala" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7a5634" />
            <stop offset="100%" stopColor="#4f351d" />
          </linearGradient>
          <linearGradient id="bi-cola" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6e4a28" />
            <stop offset="100%" stopColor="#3f2a16" />
          </linearGradient>
          {/* raya iridiscente verde de la garganta (gorget del barbudito) */}
          <linearGradient id="bi-iris" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
        </defs>

        {/* COLA larga parda, en abanico hacia atrás */}
        <g className="bi-cola">
          <path d="M18 58 L2 52 L9 60 L1 67 L12 64 L8 73 L24 62 Z" fill="url(#bi-cola)" />
        </g>

        {/* ALA TRASERA (batiendo, por detrás del cuerpo) */}
        <g className="bi-ala-tras" style={{ transformOrigin: '52px 50px' }}>
          <path d="M52 50 Q30 30 12 42 Q26 56 52 54 Z" fill="url(#bi-ala)" opacity="0.78" />
        </g>

        {/* CUERPO pardo jaspeado */}
        <ellipse cx="56" cy="55" rx="24" ry="14" fill="url(#bi-cuerpo)" transform="rotate(-14 56 55)" />
        {/* jaspeado/moteado del pecho (pintitas claras) */}
        <g fill="#e8d8be" opacity="0.55" className="bi-moteado">
          <circle cx="50" cy="58" r="1.5" /><circle cx="56" cy="61" r="1.3" />
          <circle cx="62" cy="58" r="1.4" /><circle cx="58" cy="54" r="1.2" />
          <circle cx="52" cy="53" r="1.1" /><circle cx="66" cy="61" r="1.2" />
        </g>

        {/* CABEZA */}
        <circle cx="84" cy="44" r="11" fill="url(#bi-cuerpo)" />
        {/* antifaz/máscara más oscura sobre el ojo (rasgo del barbudito) */}
        <path d="M78 40 Q86 36 94 42 Q88 47 80 46 Z" fill="#4f351d" opacity="0.7" />

        {/* CRESTA: penacho puntiagudo barrido hacia arriba-atrás (rasgo insignia
            del barbudito de páramo). Varias plumas finas que nacen de la coronilla
            y se afinan hacia la punta. */}
        <g className="bi-cresta" fill="#c8a86e" stroke="#8c6238" strokeWidth="0.5" strokeLinejoin="round">
          <path d="M80 36 Q78 24 76 14 Q82 22 84 35 Z" />
          <path d="M83 35 Q83 21 84 11 Q88 21 87 35 Z" />
          <path d="M86 35 Q88 22 92 14 Q92 24 90 36 Z" />
          <path d="M89 36 Q93 26 97 20 Q96 28 92 37 Z" />
        </g>

        {/* BARBA / GARGANTA blanca moteada (la "barba" que da el nombre) */}
        <path d="M76 48 Q82 60 90 50 Q86 56 78 55 Z" fill="#f4efe4" />
        <g fill="#9aa78f" opacity="0.7">
          <circle cx="80" cy="51" r="0.9" /><circle cx="84" cy="53" r="0.9" />
          <circle cx="82" cy="49" r="0.8" /><circle cx="86" cy="51" r="0.8" />
        </g>
        {/* raya VERDE iridiscente en el centro de la garganta */}
        <path d="M81 49 Q84 54 87 50 Q85 53 82 53 Z" fill="url(#bi-iris)" opacity="0.95" />

        {/* OJO */}
        <circle cx="86" cy="42" r="2" fill="#1c1108" />
        <circle cx="85.4" cy="41.3" r="0.7" fill="#fff" opacity="0.95" />

        {/* PICO corto y recto (el barbudito NO tiene el pico larguísimo curvo) */}
        <path d="M94 45 L108 47" fill="none" stroke="#2a1d12" strokeWidth="2" strokeLinecap="round" />

        {/* ALA FRONTAL (batiendo, sobre el cuerpo) */}
        <g className="bi-ala-fron" style={{ transformOrigin: '58px 48px' }}>
          <path d="M58 48 Q34 22 10 32 Q30 52 60 46 Z" fill="url(#bi-ala)" opacity="0.92" />
          {/* nervaduras de las primarias */}
          <g stroke="#3a2614" strokeWidth="0.5" opacity="0.5" fill="none">
            <path d="M52 45 Q38 36 18 35" /><path d="M50 47 Q36 42 16 40" />
          </g>
        </g>
      </svg>
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  HOME A/B (2) — COLIBRÍ REAL en loop (sprite 4×4, transparente, sin recuadro).
// ════════════════════════════════════════════════════════════════════════════

/**
 * BarbuditoRealLoop — el barbudito REAL recortado (transparente) en vuelo, en
 * loop por sprite de 16 frames (4×4). Sin recuadro (el operador rechazó el
 * recuadro). Pausado fuera de pantalla; reduced-motion → frame estático.
 *
 * @param {Object} props
 * @param {number} [props.size=120]  lado en px (cuadrado).
 * @param {string} [props.className]
 * @param {string} [props.ariaLabel]
 */
export function BarbuditoRealLoop({ size = 120, className = '', ariaLabel }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(true);
  const reduce = prefersReducedMotion();

  // Pausar el aleteo fuera de pantalla (gama baja): quitamos la animación CSS.
  useEffect(() => {
    if (reduce) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => setVisible(e.isIntersecting)),
      { rootMargin: '60px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  // reduced-motion → frame estático (póster), nada se mueve.
  if (reduce) {
    return (
      <img
        ref={ref}
        src={REAL_POSTER}
        alt={ariaLabel || ''}
        aria-hidden={ariaLabel ? undefined : 'true'}
        draggable={false}
        className={`barbudito-real-loop is-static ${className}`.trim()}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      ref={ref}
      className={`barbudito-real-loop ${visible ? 'is-playing' : ''} ${className}`.trim()}
      style={{ width: size, height: size, backgroundImage: `url(${REAL_SPRITE})` }}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel || undefined}
      aria-hidden={ariaLabel ? undefined : 'true'}
    />
  );
}

/**
 * BarbuditoVentana — "ventana viva del páramo" (video del barbudito en la flor,
 * enmarcado). CONSERVADO por compatibilidad; el home ya no lo monta (el operador
 * rechazó el recuadro). Sin alpha → corre en TODO navegador (incl. iOS).
 */
export function BarbuditoVentana({ size = 180, className = '', ariaLabel }) {
  const ref = useRef(null);
  const reduce = prefersReducedMotion();

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
 * BarbuditoFlor — clip de la FLOR del frailejón con el barbudito tomando néctar,
 * para la TRANSICIÓN home→agente. Video H.264 normal (sin alpha → corre en TODO
 * navegador, incl. iOS). Dura ~2.5s con su propio fade interno; el padre lo
 * cubre/centra y desvanece hacia la pantalla del agente. Reduced-motion → el
 * póster estático (lo decide el padre, que acorta la transición).
 *
 * @param {Object} props
 * @param {string} [props.className]
 * @param {()=>void} [props.onEnded]  callback al terminar el clip (opcional).
 */
export function BarbuditoFlor({ className = '', onEnded }) {
  return (
    <video
      className={className}
      autoPlay
      muted
      playsInline
      preload="auto"
      poster={FLOR_POSTER}
      onEnded={onEnded}
      aria-hidden="true"
    >
      <source src={FLOR_SRC} type="video/mp4" />
    </video>
  );
}

/**
 * BarbuditoCruza — fly-across UNA pasada (webm VP9-alpha; fallback sprite). YA NO
 * se usa en la transición (reemplazada por el clip de la flor), CONSERVADO por
 * compatibilidad.
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
