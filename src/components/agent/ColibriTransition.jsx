import { useEffect, useRef, useState } from 'react';
import { colibriRealActivo } from '../../config/colibriFlag';
import { BarbuditoFlor } from '../colibri/Barbudito';

/**
 * ColibriTransition — transición HIPER LINDA pero LIMPIA del home a la
 * conversación (~2–3s).
 *
 * Al enviar desde el hero del home, en vez de un corte seco hacia AgentScreen,
 * aparece a pantalla completa sobre un fondo oscuro suave, y se desvanece
 * dejando la conversación montada detrás. Llama la atención sin saltos ni flash.
 *
 * DOS modos (según la flag VITE_COLIBRI, dev-only):
 *   - Flag ON (colibrí REAL): el CLIP DE LA FLOR del frailejón (~2.5s,
 *     `flower-transition.mp4`, H.264 SIN alpha → corre en TODO navegador incl.
 *     iOS), centrado y grande, con el barbudito tomando néctar; el video trae su
 *     propio fade in/out y el overlay hace además un fade suave hacia la pantalla
 *     del agente. El operador rechazó el recuadro de la flor en el HOME, pero lo
 *     quiere AQUÍ, en la transición, donde se ve claro y entero.
 *   - Flag OFF (default, prod): el colibrí entra en VIDEO
 *     (`/avatar/colibri-transition.webm`) como hasta ahora; si el video falla
 *     o no soporta WebM, cae al still.
 *
 * Contrato común:
 *   - Duración total acotada: tras `HOLD_MS` el overlay hace fade-out
 *     (`FADE_MS`) y se desmonta.
 *   - prefers-reduced-motion → SIN animación pesada: solo un fade corto.
 *   - No bloquea el montaje de la conversación: el overlay va ENCIMA; cuando se
 *     va, la conversación ya está lista detrás (cero parpadeo).
 *   - Cleanup total de timers al desmontar.
 *
 * Exportadas las duraciones para tests y para sincronizar la navegación.
 */

export const COLIBRI_TRANSITION_HOLD_MS = 1500; // video visible antes del fade
export const COLIBRI_TRANSITION_FADE_MS = 480; // fade-out suave
export const COLIBRI_TRANSITION_TOTAL_MS = COLIBRI_TRANSITION_HOLD_MS + COLIBRI_TRANSITION_FADE_MS;
// Reduced-motion: transición mínima y sobria, sin animación.
export const COLIBRI_TRANSITION_REDUCED_MS = 360;
// Clip de la FLOR (flag ON): el mp4 dura ~2.5s con su propio fade in/out.
// Lo dejamos correr casi entero (2.4s) y luego el overlay hace su fade-out.
export const COLIBRI_TRANSITION_FLOR_HOLD_MS = 2400;

// ¿Transición con el clip de la FLOR del frailejón (barbudito libando néctar)?
// Gateado por VITE_COLIBRI (dev-only). Se evalúa una sola vez (flag de build).
const COLIBRI_REAL = colibriRealActivo();

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

const CSS = `
  .colibri-tx {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(120% 120% at 50% 45%, #0e2a2e 0%, #0a1118 55%, #070b10 100%);
    transition: opacity ${COLIBRI_TRANSITION_FADE_MS}ms cubic-bezier(0.22,0.61,0.36,1);
    opacity: 1; pointer-events: none;
  }
  .colibri-tx.is-leaving { opacity: 0; }
  .colibri-tx-video {
    width: min(72vw, 360px); height: min(72vw, 360px);
    max-width: 80vh; max-height: 80vh;
    border-radius: 50%; object-fit: cover; object-position: center 45%;
    box-shadow: 0 0 70px 8px rgba(25,201,154,0.35), 0 0 0 2px rgba(25,201,154,0.45);
    animation: colibri-tx-in 0.5s cubic-bezier(0.22,0.61,0.36,1) both;
    background: #0f172a;
  }
  /* Fallback (sin video / reduced-motion): orbe sobrio con el still del colibrí */
  .colibri-tx-still {
    width: min(58vw, 240px); height: min(58vw, 240px);
    border-radius: 50%; object-fit: cover; object-position: center 42%;
    box-shadow: 0 0 50px 4px rgba(25,201,154,0.28), 0 0 0 2px rgba(25,201,154,0.4);
    background: #0f172a;
  }
  @keyframes colibri-tx-in {
    from { opacity: 0; transform: scale(0.82); }
    to   { opacity: 1; transform: scale(1); }
  }
  /* Clip de la FLOR (flag ON): grande y centrado, casi cubriendo, con esquinas
     redondeadas y una viñeta suave que funde sus bordes con el fondo oscuro. El
     video trae su propio fade interno; aquí lo asentamos. */
  .colibri-tx-flor {
    width: min(86vw, 560px); height: min(86vw, 560px);
    max-width: 92vh; max-height: 92vh;
    border-radius: 28px; object-fit: cover; object-position: center 50%;
    box-shadow: 0 18px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(190,242,100,0.18);
    animation: colibri-tx-in 0.55s cubic-bezier(0.22,0.61,0.36,1) both;
    background: #0d1f17;
  }
  .colibri-tx-flor-wrap { position: relative; line-height: 0; }
  /* viñeta para fundir el clip con el fondo (no un recuadro duro) */
  .colibri-tx-flor-wrap::after {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    border-radius: 28px;
    box-shadow: inset 0 0 60px 16px rgba(7,11,16,0.55);
  }
  @media (prefers-reduced-motion: reduce) {
    .colibri-tx-video, .colibri-tx-still, .colibri-tx-flor { animation: none !important; }
    .colibri-tx { transition: opacity ${COLIBRI_TRANSITION_REDUCED_MS}ms linear; }
  }
`;

/**
 * Overlay interno. Se monta/desmonta por `active` desde el padre, así su estado
 * (leaving/videoFailed) arranca limpio en cada transición sin resets manuales.
 */
function ColibriOverlay({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const doneRef = useRef(null);

  // ref-latest del callback fuera de render (react-hooks/refs).
  useEffect(() => { doneRef.current = onDone; });

  useEffect(() => {
    const reduce = prefersReducedMotion();
    const timers = [];
    if (reduce) {
      // Fade simple y corto, sin video ni cruce.
      timers.push(setTimeout(() => setLeaving(true), 40));
      timers.push(setTimeout(() => doneRef.current?.(), COLIBRI_TRANSITION_REDUCED_MS + 60));
    } else if (COLIBRI_REAL) {
      // Clip de la flor: lo dejamos correr casi entero (~2.4s) y luego el fade.
      timers.push(setTimeout(() => setLeaving(true), COLIBRI_TRANSITION_FLOR_HOLD_MS));
      timers.push(setTimeout(() => doneRef.current?.(), COLIBRI_TRANSITION_FLOR_HOLD_MS + COLIBRI_TRANSITION_FADE_MS));
    } else {
      timers.push(setTimeout(() => setLeaving(true), COLIBRI_TRANSITION_HOLD_MS));
      timers.push(setTimeout(() => doneRef.current?.(), COLIBRI_TRANSITION_TOTAL_MS));
    }
    return () => { timers.forEach(clearTimeout); };
  }, []);

  const reduce = prefersReducedMotion();
  const showVideo = !COLIBRI_REAL && !reduce && !videoFailed;

  return (
    <div
      className={`colibri-tx${leaving ? ' is-leaving' : ''}`}
      aria-hidden="true"
      data-testid="colibri-transition"
    >
      <style>{CSS}</style>
      {COLIBRI_REAL && !reduce ? (
        // Clip de la FLOR del frailejón: el barbudito tomando néctar, grande y
        // centrado, con fade suave. H.264 sin alpha → universal (incl. iOS).
        <span className="colibri-tx-flor-wrap">
          <BarbuditoFlor className="colibri-tx-flor" />
        </span>
      ) : showVideo ? (
        <video
          className="colibri-tx-video"
          autoPlay
          muted
          playsInline
          preload="auto"
          onError={() => setVideoFailed(true)}
        >
          <source src="/avatar/colibri-transition.webm" type="video/webm" />
        </video>
      ) : COLIBRI_REAL ? (
        // Flag ON + reduced-motion: el póster del barbudito, sin cruce.
        <img className="colibri-tx-still" src="/colibri/barbudito-poster.png" alt="" draggable={false} />
      ) : (
        <img className="colibri-tx-still" src="/avatar/colibri-hero-still.jpg" alt="" draggable={false} />
      )}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {boolean} props.active — true mientras la transición debe mostrarse.
 * @param {() => void} props.onDone — llamado cuando la transición terminó (desmontar).
 */
export default function ColibriTransition({ active, onDone }) {
  if (!active) return null;
  return <ColibriOverlay onDone={onDone} />;
}
