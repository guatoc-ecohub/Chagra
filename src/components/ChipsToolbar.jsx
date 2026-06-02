import React from 'react';
import { CHIP_DEFS } from '../services/chipIntentRouter';

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
 * Props:
 *   - onSelectIntent: callback(intent: string) — el call-site decide qué hacer.
 *                     Recibe el intent enum del chip ('siembro', 'plaga', ...,
 *                     o 'foto' para el chip de imagen).
 *   - activeIntent:   string | null — intent del modo activo (resalta el chip).
 *   - hasAttachment:  boolean — si hay imagen adjunta, muestra el chip 📷 foto.
 *   - disabled:       boolean — deshabilita todos los chips (ej. mientras graba).
 */
export default function ChipsToolbar({
  onSelectIntent,
  activeIntent = null,
  hasAttachment = false,
  disabled = false,
}) {
  if (typeof onSelectIntent !== 'function') return null;

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

  return (
    <div
      data-testid="chips-toolbar"
      className="px-3 py-2 border-t border-slate-800/70 bg-slate-900/70"
    >
      <div
        role="toolbar"
        aria-label="Modos del asistente"
        className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
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

        {CHIP_DEFS.map((def) => {
          const isActive = activeIntent === def.intent;
          return (
            <button
              key={def.intent}
              type="button"
              data-testid="mode-chip"
              data-intent={def.intent}
              onClick={() => onSelectIntent(def.intent)}
              disabled={disabled}
              aria-pressed={isActive}
              title={def.placeholder}
              className={`${baseChip} ${isActive ? activeChip : inactiveChip}`}
            >
              <span aria-hidden="true">{def.emoji}</span>
              <span>{def.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
