import { useEffect } from 'react';
import AgentRedMenu from '../dashboard/AgentRedMenu';

/**
 * AgentShell — FUENTE ÚNICA visual de la MANO de Chagra para la CONVERSACIÓN.
 *
 * El home (AgentHero) y la conversación (AgentScreen) divergían: el home
 * mostraba la MANO (AgentRedMenu, la red orgánica de capacidades que brota del
 * botón Ⓐ); la conversación mostraba "menús en texto" (una hoja vertical de
 * chips). El operador lo pidió hace tiempo: en el agente "no se ve la mano, se
 * ven los menús en texto".
 *
 * Este módulo consolida de verdad — NO una réplica: `AgentManoOverlay` monta el
 * MISMO `AgentRedMenu` (misma red, mismos nodos, mismo `CAPABILITY_MANIFEST`,
 * mismo estilo) en una capa overlay que usa la conversación. El home mantiene su
 * mano INTEGRADA al lienzo (diseño aprobado por el operador), pero ambos parten
 * del MISMO componente y del MISMO manifiesto. Una sola definición, un solo
 * estilo. El routing ÚNICO de un pick vive en `./capabilityRouting`
 * (mapCapabilityPick), compartido por las dos pantallas.
 *
 * Respeta prefers-reduced-motion (el overlay entra con fade simple; las
 * animaciones de la red ya lo respetan internamente).
 */

/* CSS del overlay de la mano para la conversación. La RED en sí trae su propio
   estilo (AgentRedMenu CSS, scoped arm-); aquí solo damos el backdrop + la caja
   full-bleed donde respira, con la misma estética sobria del resto del agente. */
const OVERLAY_CSS = `
  .agent-mano-scrim {
    position: fixed; inset: 0; z-index: 50;
    background: rgba(8,12,10,0.62);
    backdrop-filter: blur(2px);
    animation: agent-mano-fade 0.28s ease both;
  }
  .agent-mano-panel {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 51;
    max-width: 640px; margin: 0 auto;
    height: min(72dvh, 560px);
    display: flex; flex-direction: column;
    /* transparente: la red respira sobre el fondo del agente (la foto/biopunk
       que ya vive detrás de la conversación) — igual que en el home */
    background: transparent;
    animation: agent-mano-rise 0.32s cubic-bezier(0.22,0.61,0.36,1) both;
  }
  .agent-mano-head {
    flex: none; text-align: center; padding: 6px 16px 2px;
    pointer-events: none;
  }
  .agent-mano-head .t {
    font-size: 1.05rem; font-weight: 800; color: #fff;
    text-shadow: 0 2px 12px rgba(0,0,0,0.7); margin: 0;
  }
  .agent-mano-head .s {
    font-size: 0.8rem; color: rgba(226,232,240,0.85); margin: 2px 0 0;
    text-shadow: 0 1px 8px rgba(0,0,0,0.7);
  }
  .agent-mano-body { flex: 1; min-height: 0; position: relative; }
  @keyframes agent-mano-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes agent-mano-rise {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .agent-mano-scrim, .agent-mano-panel { animation: none !important; }
  }
`;

/**
 * AgentManoOverlay — la MANO de Chagra como overlay para la CONVERSACIÓN.
 *
 * Renderiza el MISMO `AgentRedMenu` que el home, anclado al botón Ⓐ que pasa el
 * consumidor (`anchorRef`). Cierra al tocar fuera, con Escape, o al elegir una
 * rama (vía `onPick`, que el consumidor enruta con `mapCapabilityPick`).
 *
 * @param {boolean} open — si está montado.
 * @param {()=>void} onClose — cerrar el overlay.
 * @param {(cap:object)=>void} onPick — pick de una hoja viva de la red.
 * @param {object} anchorRef — ref al botón Ⓐ real (raíz geométrica de la red).
 * @param {boolean} [disabled] - desactiva la interacción de la red.
 * @param {string} [subtitle] - copy contextual bajo el título.
 */
export function AgentManoOverlay({
  open,
  onClose,
  onPick,
  anchorRef = null,
  disabled = false,
  subtitle = 'Toca una rama para empezar. Cada respuesta viene con su fuente.',
}) {
  // Cierre con Escape (a11y), igual que el menú del home. `onClose` va en deps
  // (no usamos un ref-latest durante render: rompe react-hooks/refs).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <style>{OVERLAY_CSS}</style>
      <div
        className="agent-mano-scrim"
        onClick={() => onClose?.()}
        aria-hidden="true"
      />
      <section
        className="agent-mano-panel"
        role="dialog"
        aria-modal
        aria-label="La mano de Chagra"
      >
        <div className="agent-mano-head">
          <p className="t">La mano de Chagra</p>
          <p className="s">{subtitle}</p>
        </div>
        <div className="agent-mano-body">
          <AgentRedMenu onPick={onPick} disabled={disabled} anchorRef={anchorRef} />
        </div>
      </section>
    </>
  );
}

export default AgentManoOverlay;
