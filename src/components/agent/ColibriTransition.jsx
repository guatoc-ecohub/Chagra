import { useEffect, useRef, useState } from 'react';
import Angelita from '../../visual/agente/Angelita';

/**
 * Transición home → conversación (~2s): ANGELITA, la abeja agente.
 *
 * Al enviar desde el hero del home, en vez de un corte seco hacia AgentScreen,
 * Angelita aparece a pantalla completa sobre un fondo oscuro suave — grande,
 * invitándolo a la conversación ('invita': se inclina y hace "venga" con la
 * manita) — y el overlay se desvanece dejando la conversación montada detrás.
 *
 * 2026-07-18 (operador): "solo abejita". Este overlay mostraba el VIDEO del
 * colibrí (webm foto-realista) como cara del agente; el colibrí queda jubilado
 * del rol de asistente (fauna decorativa en los mundos 3D, nada más) y la
 * transición pasa a ser Angelita — la misma del FAB, el chat y el hero.
 * El archivo conserva su nombre para no mover imports; el componente exportado
 * mantiene el contrato de siempre.
 *
 * Contrato:
 *   - Duración total acotada: tras `HOLD_MS` el overlay hace fade-out
 *     (`FADE_MS`) y se desmonta.
 *   - prefers-reduced-motion → SIN animación pesada: fade corto y Angelita
 *     quieta (fotograma digno, animated=false).
 *   - No bloquea el montaje de la conversación: el overlay va ENCIMA; cuando
 *     se va, la conversación ya está lista detrás (cero parpadeo).
 *   - Cleanup total de timers al desmontar.
 *   - Frugal: SVG + CSS, cero video, cero red.
 *
 * Exportadas las duraciones para tests y para sincronizar la navegación.
 */

export const COLIBRI_TRANSITION_HOLD_MS = 1500; // Angelita visible antes del fade
export const COLIBRI_TRANSITION_FADE_MS = 480; // fade-out suave
export const COLIBRI_TRANSITION_TOTAL_MS = COLIBRI_TRANSITION_HOLD_MS + COLIBRI_TRANSITION_FADE_MS;
// Reduced-motion: transición mínima y sobria, sin animación.
export const COLIBRI_TRANSITION_REDUCED_MS = 360;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

const CSS = `
  .agente-tx {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 14px;
    background: radial-gradient(120% 120% at 50% 45%, #0e2a2e 0%, #0a1118 55%, #070b10 100%);
    transition: opacity ${COLIBRI_TRANSITION_FADE_MS}ms cubic-bezier(0.22,0.61,0.36,1);
    opacity: 1; pointer-events: none;
  }
  .agente-tx.is-leaving { opacity: 0; }
  .agente-tx-abeja {
    animation: agente-tx-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
    filter: drop-shadow(0 0 44px rgba(240,178,60,0.32)) drop-shadow(0 6px 14px rgba(7,11,16,0.6));
    line-height: 0;
  }
  .agente-tx-nombre {
    font: 800 0.82rem/1 system-ui, sans-serif;
    letter-spacing: 0.22em; text-transform: uppercase;
    color: rgba(240, 216, 160, 0.85);
    animation: agente-tx-in 0.6s 0.12s cubic-bezier(0.22,0.61,0.36,1) both;
  }
  @keyframes agente-tx-in {
    from { opacity: 0; transform: scale(0.78) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .agente-tx-abeja, .agente-tx-nombre { animation: none !important; }
    .agente-tx { transition: opacity ${COLIBRI_TRANSITION_REDUCED_MS}ms linear; }
  }
`;

/**
 * Overlay interno. Se monta/desmonta por `active` desde el padre, así su
 * estado (leaving) arranca limpio en cada transición sin resets manuales.
 */
function AngelitaOverlay({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(null);

  // ref-latest del callback fuera de render (react-hooks/refs).
  useEffect(() => { doneRef.current = onDone; });

  useEffect(() => {
    const reduce = prefersReducedMotion();
    const timers = [];
    if (reduce) {
      // Fade simple y corto, sin coreografía.
      timers.push(setTimeout(() => setLeaving(true), 40));
      timers.push(setTimeout(() => doneRef.current?.(), COLIBRI_TRANSITION_REDUCED_MS + 60));
    } else {
      timers.push(setTimeout(() => setLeaving(true), COLIBRI_TRANSITION_HOLD_MS));
      timers.push(setTimeout(() => doneRef.current?.(), COLIBRI_TRANSITION_TOTAL_MS));
    }
    return () => { timers.forEach(clearTimeout); };
  }, []);

  const reduce = prefersReducedMotion();

  return (
    <div
      className={`agente-tx${leaving ? ' is-leaving' : ''}`}
      aria-hidden="true"
      data-testid="agente-transition"
    >
      <style>{CSS}</style>
      <span className="agente-tx-abeja">
        <Angelita
          estado="invita"
          size={Math.round(Math.min(
            typeof window !== 'undefined' ? window.innerWidth * 0.62 : 280,
            300,
          ))}
          animated={!reduce}
          title="Angelita lo lleva a la conversación"
        />
      </span>
      <span className="agente-tx-nombre">Angelita</span>
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
  return <AngelitaOverlay onDone={onDone} />;
}
