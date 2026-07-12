/*
 * VentanaValle3D — la "VENTANA-PUERTA" al valle 3D, embebida en el home 2D.
 *
 * El home clásico se queda igual; esto se le AGREGA: una ventana de marco
 * orgánico (biopunk verde-vivo, la enredadera con esporas que laten) con un
 * viewport 3D VIVO adentro — un asomo del valle que respira — que invita a
 * tocarla para entrar a la experiencia 3D completa. Es una PUERTA, no un botón
 * plano: toda la ventana es tappable y llama `onEntrar()`.
 *
 * Autocontenido y BARATO (widget persistente del home):
 *   · Este host NO importa three: la escena (`VentanaValle3DEscena`) va al
 *     chunk perezoso `vendor-three` y SOLO se pide cuando la ventana entra al
 *     viewport (IntersectionObserver) — el home no paga three por adelantado.
 *   · Device-tier (`decidirTier`): alto/medio montan 3D (medio frugal);
 *     bajo o sin WebGL caen al ESPEJO SVG — el mismo valle, quieto y digno.
 *   · prefers-reduced-motion: un fotograma (frameloop a demanda, marco quieto).
 *   · A11y: es un <button> real con nombre accesible; el espejo 2D lleva su
 *     texto alternativo; foco visible en CSS.
 *
 * ── CABLEO (lo hace el host; este archivo no toca el home) ────────────────
 *
 *   import VentanaValle3D from './components/VentanaValle3D.jsx';
 *   // donde el home quiera abrir la puerta al valle:
 *   <VentanaValle3D onEntrar={() => navigate('valle3d')} />
 *   // opcionales: tier/reducedMotion si el host ya corrió decidirTier().
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import { AbejaAngelita } from '../visual/creatures/AbejaAngelita.jsx';
import './ventanaValle3D.css';

const EscenaVentana = lazy(() => import('./VentanaValle3DEscena.jsx'));

/*
 * El ESPEJO 2D digno: el mismo valle en SVG puro (cero three, cero assets
 * remotos). Es el piso para tier bajo / sin-WebGL Y el fallback de Suspense
 * mientras baja el chunk 3D — la ventana nunca queda en blanco ni rota.
 */
function Valle2D({ reducedMotion }) {
  return (
    <div className="vv-2d">
      <svg
        className="vv-2d__paisaje"
        viewBox="0 0 320 220"
        preserveAspectRatio="xMidYMax slice"
        role="img"
        aria-label="El valle de su finca: lomas verdes con matas y la abeja angelita volando bajo un cielo cálido"
      >
        <title>El valle de su finca</title>
        <defs>
          <linearGradient id="vv-alba" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6ecd2" />
            <stop offset="1" stopColor="#eaf0d3" />
          </linearGradient>
        </defs>
        <rect width="320" height="220" fill="url(#vv-alba)" />

        {/* el sol de media mañana con su halo */}
        <g className={reducedMotion ? '' : 'vv-2d-respira'} style={{ transformOrigin: '244px 54px' }}>
          <circle cx="244" cy="54" r="30" fill="#f6d78a" opacity="0.35" />
          <circle cx="244" cy="54" r="17" fill="#f2c766" />
        </g>

        {/* lomas que se alejan hacia la luz */}
        <ellipse cx="52" cy="222" rx="160" ry="66" fill="#4c7147" />
        <ellipse cx="286" cy="230" rx="180" ry="74" fill="#557e4c" />
        <ellipse cx="160" cy="258" rx="240" ry="92" fill="#6c9a5b" />

        {/* matas low-poly (tallo + copa de hoja viva) */}
        <g>
          <rect x="86" y="168" width="4" height="16" rx="2" fill="#6f8a3f" />
          <path d="M88 132 L104 172 L72 172 Z" fill="#4d8a4a" />
          <rect x="156" y="178" width="3.4" height="13" rx="1.7" fill="#6f8a3f" />
          <path d="M157.7 150 L170 182 L145 182 Z" fill="#5f9c50" />
          <rect x="226" y="172" width="4.4" height="17" rx="2.2" fill="#6f8a3f" />
          <path d="M228.2 134 L246 176 L210 176 Z" fill="#3f7a45" />
        </g>

        {/* esporas bio-glow que laten (quietas con reduced-motion) */}
        <g fill="#d9f7a6">
          <circle className={reducedMotion ? '' : 'vv-2d-espora'} cx="120" cy="120" r="2.6" />
          <circle className={reducedMotion ? '' : 'vv-2d-espora vv-2d-espora--tarde'} cx="196" cy="102" r="2.1" />
          <circle className={reducedMotion ? '' : 'vv-2d-espora vv-2d-espora--lenta'} cx="64" cy="96" r="1.8" />
        </g>
      </svg>

      {/* la Angelita 2D volando en el espejo (misma creature del home) */}
      <div className={`vv-abeja vv-abeja--2d${reducedMotion ? ' vv-abeja--quieta' : ''}`}>
        <AbejaAngelita size={44} animo="pleno" energia={0.9} animated={!reducedMotion} />
      </div>
    </div>
  );
}

/* La enredadera del marco: hojas + zarcillos + esporas que LATEN (CSS). Es la
   firma biopunk de la puerta — dibujada una vez, decorativa (aria-hidden). */
function EnredaderaMarco() {
  return (
    <svg className="vv-enredadera" viewBox="0 0 400 320" aria-hidden="true" focusable="false">
      {/* zarcillos: espirales de tinta que abrazan las esquinas */}
      <g fill="none" stroke="#22301c" strokeWidth="3" strokeLinecap="round">
        <path d="M34 44 C18 30 20 12 40 10 C56 8 60 24 48 30" />
        <path d="M366 40 C382 26 380 8 360 8 C346 8 342 22 354 27" />
        <path d="M30 282 C14 294 18 312 38 312 C52 312 55 299 44 294" />
        <path d="M370 284 C386 296 382 314 362 314 C348 314 345 300 356 296" />
      </g>
      {/* hojas de la enredadera (verde-vivo, con nervadura de tinta) */}
      <g stroke="#22301c" strokeWidth="2.4" strokeLinejoin="round">
        <path d="M58 16 q20 -14 40 2 q-18 16 -40 -2 Z" fill="#5f9c50" />
        <path d="M318 14 q-20 -12 -38 4 q16 14 38 -4 Z" fill="#4d8a4a" />
        <path d="M64 306 q18 14 38 -2 q-16 -16 -38 2 Z" fill="#4d8a4a" />
        <path d="M312 308 q-18 12 -36 -4 q14 -14 36 4 Z" fill="#5f9c50" />
        <path d="M6 130 q-10 22 6 38 q12 -18 -6 -38 Z" fill="#3f7a45" />
        <path d="M394 136 q10 22 -6 36 q-12 -16 6 -36 Z" fill="#3f7a45" />
      </g>
      {/* las esporas del marco: gemelas de las de adentro, laten en CSS */}
      <g fill="#d9f7a6">
        <circle className="vv-espora" cx="86" cy="10" r="4" />
        <circle className="vv-espora vv-espora--tarde" cx="342" cy="304" r="3.4" />
        <circle className="vv-espora vv-espora--lenta" cx="10" cy="196" r="3" />
        <circle className="vv-espora vv-espora--tarde" cx="392" cy="88" r="2.8" />
      </g>
    </svg>
  );
}

/**
 * La ventana-puerta al valle 3D. Montable por props, sin lógica de negocio:
 * el HOME decide a dónde lleva la puerta (`onEntrar`).
 *
 * @param {object} props
 * @param {() => void} props.onEntrar  al tocar la ventana (toda es tappable).
 * @param {'alto'|'medio'|'bajo'} [props.tier]  override; sin él corre `decidirTier()`.
 * @param {boolean} [props.reducedMotion]  override; sin él usa la preferencia del sistema.
 * @param {string}  [props.titulo='Entrar al valle']  rótulo de la puerta.
 * @param {string}  [props.pista='Toque para entrar al valle']  la invitación (usted).
 * @param {string}  [props.className]  clases extra del botón-ventana.
 */
export function VentanaValle3D({
  onEntrar,
  tier: tierProp,
  reducedMotion: rmProp,
  titulo = 'Entrar al valle',
  pista = 'Toque para entrar al valle',
  className = '',
}) {
  // El tier se decide UNA vez por montaje (es barato pero toca canvas/WebGL).
  const decision = useMemo(() => decidirTier(), []);
  const tier = tierProp || decision.tier;
  const reducedMotion = rmProp ?? decision.reducedMotion;
  const con3D = permite3D(tier);

  // La escena 3D NO se pide hasta que la ventana entra al viewport: el home
  // no descarga `vendor-three` por un widget que quedó bajo el fold.
  const hostRef = useRef(null);
  const [aLaVista, setALaVista] = useState(false);
  useEffect(() => {
    if (!con3D || aLaVista) return undefined;
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setALaVista(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setALaVista(true);
          io.disconnect();
        }
      },
      { rootMargin: '96px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [con3D, aLaVista]);

  return (
    <button
      type="button"
      ref={hostRef}
      className={`vv${className ? ` ${className}` : ''}`}
      data-tier={tier}
      onClick={onEntrar}
      aria-label={`${titulo}. ${pista}`}
    >
      {/* el marco orgánico que respira (la firma de la puerta) */}
      <span className="vv-marco" aria-hidden="true">
        <span className="vv-vidrio">
          {con3D && aLaVista ? (
            <Suspense fallback={<Valle2D reducedMotion={reducedMotion} />}>
              <EscenaVentana tier={tier === 'alto' ? 'alto' : 'medio'} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <Valle2D reducedMotion={reducedMotion} />
          )}
          {/* la luz que se cuela por la ventana (vidrio con brillo cálido) */}
          <span className="vv-luz" />
        </span>
        <EnredaderaMarco />
      </span>

      {/* la repisa: el rótulo de la puerta */}
      <span className="vv-repisa">
        <span className="vv-repisa__titulo">{titulo}</span>
        <span className="vv-repisa__pista">{pista}</span>
      </span>
    </button>
  );
}

export default VentanaValle3D;
