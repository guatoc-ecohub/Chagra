import { useEffect, useRef, useState } from 'react';

/**
 * ColibriTransition — transición HIPER LINDA pero LIMPIA del home a la
 * conversación (~2s).
 *
 * Al enviar desde el hero del home, en vez de un corte seco hacia AgentScreen,
 * el colibrí entra en VIDEO (`/avatar/colibri-transition.webm`, el mismo asset
 * vivo que usa el avatar) a pantalla completa, sobre un fondo oscuro suave, y
 * se desvanece dejando la conversación montada detrás. Llama la atención sin
 * saltos ni flash.
 *
 * Contrato:
 *   - Duración total acotada (~2s): el video se reproduce y a `HOLD_MS` el
 *     overlay hace fade-out (`FADE_MS`) y se desmonta. Si el video falla
 *     (onError) o no soporta WebM, cae al still del colibrí sin video.
 *   - prefers-reduced-motion → SIN video: solo un fade corto y limpio.
 *   - No bloquea el montaje de la conversación: el overlay va ENCIMA; cuando se
 *     va, la conversación ya está lista detrás (cero parpadeo).
 *   - Cleanup total de timers al desmontar.
 *
 * Exportadas las duraciones para tests y para sincronizar la navegación.
 */

export const COLIBRI_TRANSITION_HOLD_MS = 1500; // video visible antes del fade
export const COLIBRI_TRANSITION_FADE_MS = 480; // fade-out suave
export const COLIBRI_TRANSITION_TOTAL_MS = COLIBRI_TRANSITION_HOLD_MS + COLIBRI_TRANSITION_FADE_MS;
// Reduced-motion: transición mínima y sobria, sin video.
export const COLIBRI_TRANSITION_REDUCED_MS = 360;

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
  @media (prefers-reduced-motion: reduce) {
    .colibri-tx-video, .colibri-tx-still { animation: none !important; }
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
      // Fade simple y corto, sin video.
      timers.push(setTimeout(() => setLeaving(true), 40));
      timers.push(setTimeout(() => doneRef.current?.(), COLIBRI_TRANSITION_REDUCED_MS + 60));
    } else {
      timers.push(setTimeout(() => setLeaving(true), COLIBRI_TRANSITION_HOLD_MS));
      timers.push(setTimeout(() => doneRef.current?.(), COLIBRI_TRANSITION_TOTAL_MS));
    }
    return () => { timers.forEach(clearTimeout); };
  }, []);

  const reduce = prefersReducedMotion();
  const showVideo = !reduce && !videoFailed;

  return (
    <div
      className={`colibri-tx${leaving ? ' is-leaving' : ''}`}
      aria-hidden="true"
      data-testid="colibri-transition"
    >
      <style>{CSS}</style>
      {showVideo ? (
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
      ) : (
        <img className="colibri-tx-still" src="/avatar/colibri-hero-still.jpg" alt="" draggable={false} />
      )}
    </div>
  );
}

/**
 * @param {boolean} active — true mientras la transición debe mostrarse.
 * @param {()=>void} onDone — llamado cuando la transición terminó (desmontar).
 */
export default function ColibriTransition({ active, onDone }) {
  if (!active) return null;
  return <ColibriOverlay onDone={onDone} />;
}
