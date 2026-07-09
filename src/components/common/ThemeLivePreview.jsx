import React, { useLayoutEffect, useRef, useState } from 'react';
import { BadgeCheck, Send, Sprout } from 'lucide-react';
import { AGENT_V3_CSS } from '../AgentScreen/agentEntrance';

/**
 * ThemeLivePreview — RENDER VIVO real de un tema para la galería del selector.
 * ============================================================================
 * Reemplaza el "afiche de la película" (el dibujo aproximado de
 * themePreviewPalettes.js, con paleta hard-codeada que podía driftear de la
 * piel real). Aquí NO hay un solo color propio: la miniatura es una porción
 * representativa de la app REAL — barra superior, saludo, dos tarjetas de
 * mundo, un turno del chat del agente (las MISMAS clases .v3-card /
 * .v3-bubble-user / .sello / .agent-send-accent que usa el chat de verdad) —
 * renderizada DENTRO de un contenedor con `data-theme="<tema>"`.
 *
 * CÓMO FUNCIONA (feedback-themes-cssvar-indirection): toda la piel de la app
 * sale de tokens CSS (--c-*, --t-accent-rgb, --fx-*) definidos por tema en
 * selectores `[data-theme="…"]` de index.css / themes.css. Como esos
 * selectores son de atributo (no anclados a <html>), aplicar el atributo en
 * un contenedor re-teje TODOS los tokens para su subárbol: cada tarjeta
 * muestra EXACTAMENTE los colores que la app tendrá con ese tema. Si mañana
 * un tema cambia sus tokens, el preview cambia solo — imposible que mienta.
 *
 * Para los temas de PIEL BASE (biopunk / biopunk2, que en <html> van SIN
 * data-theme) los bloques de tokens base declaran además los selectores
 * `[data-theme="biopunk"], [data-theme="biopunk2"]` (index.css / themes.css):
 * así el contenedor re-ancla la piel base aunque el tema global activo sea
 * uno claro. En la app real eso es un no-op (useTheme nunca escribe esos ids
 * en <html>).
 *
 * MECÁNICA DE MINIATURA: el escenario se pinta a tamaño NATURAL de teléfono
 * (STAGE_WIDTH px de ancho) y se escala a la tarjeta con transform: scale()
 * (medido con ResizeObserver). Decorativo puro: aria-hidden,
 * pointer-events:none, cero elementos interactivos (el nombre accesible vive
 * en el botón padre de la galería).
 *
 * El CSS del cuaderno del chat (.v3-*) es el LITERAL AGENT_V3_CSS que inyecta
 * AgentScreen — mismo texto de estilos, mismos tokens — inyectado una sola
 * vez bajo un <style id> propio (la galería vive en Perfil, donde AgentScreen
 * no está montado).
 */

/** Ancho natural del escenario (px) — un ancho de teléfono real. */
const STAGE_WIDTH = 360;

/** Alto natural de respaldo cuando aún no hay medida (jsdom / primer frame). */
const FALLBACK_STAGE_HEIGHT = 288;

const V3_STYLE_ID = 'theme-live-preview-v3-css';

/**
 * Inyecta (una sola vez) el CSS real del cuaderno del chat, para que las
 * burbujas del preview sean byte-idénticas a las del AgentScreen.
 */
function ensureV3Css() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(V3_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = V3_STYLE_ID;
  el.textContent = AGENT_V3_CSS;
  document.head.appendChild(el);
}

/**
 * Miniatura viva de un tema. Ocupa el 100% del contenedor padre (que define
 * el tamaño de la tarjeta) y escala el escenario natural para llenarlo.
 *
 * @param {{ themeId: string }} props id del tema ('biopunk2', 'nature', …).
 */
export default function ThemeLivePreview({ themeId }) {
  const hostRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    ensureV3Css();
    const el = hostRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth || 0;
      const h = el.clientHeight || 0;
      setBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    return undefined;
  }, []);

  const scale = box.w > 0 ? box.w / STAGE_WIDTH : 1;
  const stageHeight =
    box.w > 0 && box.h > 0 ? Math.ceil(box.h / scale) : FALLBACK_STAGE_HEIGHT;

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      data-testid={`theme-live-preview-${themeId}`}
      className="relative w-full h-full overflow-hidden pointer-events-none select-none"
    >
      <div
        data-theme={themeId}
        data-live-stage={themeId}
        className="absolute top-0 left-0 flex flex-col origin-top-left bg-surface text-slate-100"
        style={{ width: STAGE_WIDTH, height: stageHeight, transform: `scale(${scale})` }}
      >
        {/* Barra superior: superficie de card + punto del acento del tema
            (con el glow neón gateado por --fx-glow-opacity: brilla en
            biopunk, se apaga solo en los temas claros). */}
        <div className="flex items-center gap-2 px-3 h-10 shrink-0 bg-surface-card border-b border-surface-border">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              background: 'rgb(var(--t-accent-rgb))',
              boxShadow:
                '0 0 9px rgba(var(--t-accent-rgb), calc(var(--fx-glow-opacity, 1) * 0.85))',
            }}
          />
          <span className="text-[13px] font-black tracking-wide">Chagra</span>
          <span className="ml-auto text-[10px] font-bold text-slate-500">Mi finca</span>
        </div>

        {/* Saludo del home (tinta y secundario reales del tema). */}
        <div className="px-3 pt-2.5 pb-2 shrink-0">
          <p className="text-[15px] font-black leading-tight">Buenas, así se ve tu app</p>
          <p className="text-[11px] text-slate-400 leading-snug">
            Colores reales de este tema, en vivo.
          </p>
        </div>

        {/* Dos tarjetas de mundo (la superficie de card real de la grilla). */}
        <div className="grid grid-cols-2 gap-2 px-3 shrink-0">
          <span className="rounded-xl border bg-slate-900/50 border-slate-800 p-2">
            <span className="block text-[11px] font-bold text-slate-100">Mis cultivos</span>
            <span className="mt-1 flex items-center gap-1 text-[9px] font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" /> Al día
            </span>
          </span>
          <span className="rounded-xl border bg-slate-900/50 border-slate-800 p-2">
            <span className="block text-[11px] font-bold text-slate-100">Almanaque</span>
            <span className="mt-1 flex items-center gap-1 text-[9px] font-semibold text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" /> 2 tareas
            </span>
          </span>
        </div>

        {/* Chat del agente: turno del usuario + entrada del cuaderno, con las
            clases REALES del AgentScreen (v3-bubble-user / v3-card con la
            costura de grounding) y un sello real del semáforo de confianza. */}
        <div className="flex-1 flex flex-col justify-end px-3 pt-2 min-h-0 overflow-hidden">
          <div className="v3-turn v3-turn-user">
            <div className="v3-bubble-user">
              <p className="text-[13px] leading-snug">¿Cuándo siembro el maíz?</p>
            </div>
          </div>
          <div className="v3-turn">
            <div className="v3-byline">
              <span className="v3-byline-avatar">
                <Sprout size={14} style={{ color: 'rgb(var(--t-accent-rgb))' }} />
              </span>
              <span>Chagra</span>
            </div>
            <div className="v3-card" data-grounded="true">
              <p className="text-[13px] leading-snug">
                Con las lluvias de la próxima semana es buen momento.
              </p>
              <span className="mt-1.5 sello" data-nivel="verde">
                <span className="sello-lampara">
                  <BadgeCheck size={10} strokeWidth={2.75} />
                </span>
                <span className="sello-texto">Catálogo verificado</span>
              </span>
            </div>
          </div>
        </div>

        {/* Compositor: campo de texto + botón enviar REAL (.agent-send-accent
            = el acento de marca del tema, themes.css §0b). */}
        <div className="flex items-center gap-2 px-3 py-2 shrink-0 bg-surface-card border-t border-surface-border">
          <span className="flex-1 rounded-full border bg-surface-raised border-surface-border px-3 py-1.5 text-[11px] text-slate-400">
            Pregúntale a Chagra…
          </span>
          <span className="agent-send-accent w-8 h-8 rounded-full flex items-center justify-center shrink-0">
            <Send size={13} strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </div>
  );
}
