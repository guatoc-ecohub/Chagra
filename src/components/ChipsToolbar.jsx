import React from 'react';
import { CHIP_DEFS, CHIP_INTENTS } from '../services/chipIntentRouter';
import { isDeepResearchEnabled } from '../services/deepResearchClient';

/**
 * ChipsToolbar — "caja de herramientas" del agente como CHIPS DE MODO
 * (estilo Gemini). Fila horizontal scrollable que vive JUSTO sobre el input
 * del chat (A4/B4). Al tocar un chip, la intención queda forzada y rutea
 * DIRECTO a la capacidad determinística, SALTANDO el NLU (A3) — el routing
 * vive en `chipIntentRouter.planForcedIntent` y lo ejecuta AgentScreen.
 *
 * Diferencia frente a `QuickChipsBar`: aquél es un atajo de pantalla-nueva
 * que inyecta texto y pasa por el NLU normal. ChipsToolbar es una barra
 * PERSISTENTE de modos que se queda visible durante toda la conversación y
 * fuerza la intención sin inferencia.
 *
 * Diseño: píldoras táctiles, alto contraste (legible al sol, campesino), área
 * de toque cómoda (min 44px alto efectivo), scroll horizontal sin barra
 * visible. Cada chip es un <button> con aria-pressed para el estado activo.
 *
 * El chip 📷 foto solo se muestra cuando hay una imagen adjunta lista
 * (`hasAttachment`). Coordina con el flujo de adjuntos del compositor.
 *
 * Feature flag (Deep Research): el chip 🔬 Investigación profunda SOLO se
 * renderiza cuando `isDeepResearchEnabled()` es true (flag
 * `VITE_DEEP_RESEARCH_ENABLED`). Con la flag OFF la feature no tiene backend
 * disponible para ningún plan, así que mostrar el chip era un dead-end:
 * cualquier pregunta caía en "no disponible en este plan". Mientras la flag
 * esté OFF el chip se OCULTA por completo; cuando esté live vuelve a aparecer
 * con el tier gating Pro de abajo.
 *
 * Tier gating (A1): cuando la flag está ON, el chip 🔬 Investigación profunda
 * (Deep Research) es Pro-only. Si `isPro` es false, el chip se muestra
 * deshabilitado con copy "función Pro" para que el usuario free sepa qué
 * existe pero no pueda activarlo.
 *
 * Props:
 *   - onSelectIntent: callback(intent: string) — el call-site decide qué hacer.
 *                     Recibe el intent enum del chip ('siembro', 'plaga', ...,
 *                     o 'foto' para el chip de imagen).
 *   - activeIntent:   string | null — intent del modo activo (resalta el chip).
 *   - hasAttachment:  boolean — si hay imagen adjunta, muestra el chip 📷 foto.
 *   - disabled:       boolean — deshabilita todos los chips (ej. mientras graba).
 *   - isPro:          boolean — si el usuario actual tiene tier Pro. Los chips
 *                     Pro-only (🔬) se muestran deshabilitados para free.
 *   - chipDefs:       Array<CHIP_DEFS-shape> | null — lista ADAPTATIVA de chips
 *                     a mostrar, YA ordenada y filtrada POR PERFIL por el
 *                     call-site (profileChipSelector.selectChipDefs). Si se
 *                     omite (null/undefined), se muestran TODOS los chips
 *                     (CHIP_DEFS) — comportamiento histórico, sin breaking
 *                     change. Este componente NO decide la selección: solo
 *                     pinta lo que recibe con su CSS actual (la legibilidad/
 *                     estilo la lleva otro stream).
 */
export default function ChipsToolbar({
  onSelectIntent,
  activeIntent = null,
  hasAttachment = false,
  disabled = false,
  isPro = false,
  chipDefs = null,
}) {
  if (typeof onSelectIntent !== 'function') return null;

  // Selección por perfil (si el call-site la pasa) o catálogo completo (default
  // histórico). El componente NO infiere nada — solo respeta la lista recibida.
  const sourceDefs = Array.isArray(chipDefs) && chipDefs.length > 0 ? chipDefs : CHIP_DEFS;

  // Deep Research dead-end fix: si la flag VITE_DEEP_RESEARCH_ENABLED está
  // OFF la feature no existe para ningún plan, así que ocultamos el chip 🔬
  // por completo (no solo lo pro-bloqueamos). Con la flag ON el chip vuelve
  // y queda pro-gated como el resto de la lógica de abajo. Se aplica sobre la
  // lista efectiva (sea la del perfil o el catálogo completo).
  const deepEnabled = isDeepResearchEnabled();
  const visibleChipDefs = deepEnabled
    ? sourceDefs
    : sourceDefs.filter((def) => def.intent !== CHIP_INTENTS.deep);

  const baseChip =
    'shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border ' +
    'text-sm font-semibold whitespace-nowrap transition-all active:scale-95 ' +
    'focus:outline-none focus:ring-2 focus:ring-emerald-400/60 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed';
  // Alto contraste: activo = verde sólido sobre texto blanco; inactivo =
  // slate-700 con borde claro (legible al sol). Toque ≥44px efectivo por padding.
  const inactiveChip =
    'bg-slate-700 border-slate-500 text-slate-100 hover:bg-slate-600 hover:border-slate-400';
  const activeChip =
    'bg-emerald-600 border-emerald-300 text-white shadow-md';
  // Chip Pro bloqueado: apariencia visualmente diferenciada para free users.
  const proLockedChip =
    'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed';

  return (
    <div
      data-testid="chips-toolbar"
      className="px-3 py-2 border-t border-slate-800/70 bg-slate-900/70"
    >
      <div
        role="toolbar"
        aria-label="Modos del asistente"
        className="flex flex-wrap gap-2 pb-1 -mb-1"
      >
        {/* Chip 📷 foto: primero y SOLO si hay imagen adjunta. */}
        {hasAttachment && (
          <button
            type="button"
            data-testid="mode-chip-foto"
            onClick={() => onSelectIntent('foto')}
            disabled={disabled}
            aria-pressed={activeIntent === 'foto'}
            className={`${baseChip} ${activeIntent === 'foto' ? activeChip : inactiveChip}`}
          >
            <span aria-hidden="true">📷</span>
            <span>Foto</span>
          </button>
        )}

        {visibleChipDefs.map((def) => {
          const isActive = activeIntent === def.intent;
          // El chip 🔬 Deep Research es Pro-only. Para usuarios free: deshabilitado
          // con copy claro "función Pro" y title explicativo. NO se oculta — el
          // usuario free debe saber que la funcionalidad existe (upsell suave).
          const isDeepChip = def.intent === CHIP_INTENTS.deep;
          const isProLocked = isDeepChip && !isPro;
          const chipDisabled = disabled || isProLocked;
          const chipClass = isProLocked
            ? proLockedChip
            : isActive
              ? activeChip
              : inactiveChip;
          const chipTitle = isProLocked
            ? 'Función Pro — disponible para usuarios con acceso avanzado'
            : def.placeholder;

          return (
            <button
              key={def.intent}
              type="button"
              data-testid="mode-chip"
              data-intent={def.intent}
              data-pro-locked={isProLocked ? 'true' : undefined}
              onClick={() => !isProLocked && onSelectIntent(def.intent)}
              disabled={chipDisabled}
              aria-pressed={isActive}
              aria-label={isProLocked ? `${def.label} — función Pro` : def.label}
              title={chipTitle}
              className={`${baseChip} ${chipClass}`}
            >
              <span aria-hidden="true">{def.emoji}</span>
              <span>{isProLocked ? `${def.label} (Pro)` : def.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
