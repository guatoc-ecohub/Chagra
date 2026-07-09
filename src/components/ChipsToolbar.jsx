import React, { useState } from 'react';
import { CHIP_DEFS, CHIP_INTENTS } from '../services/chipIntentRouter';
import { isDeepResearchEnabled } from '../services/deepResearchClient';

/**
 * ChipsToolbar — "caja de herramientas" del agente como MODOS de consulta.
 * Al tocar un modo, la intención queda forzada y rutea DIRECTO a la capacidad
 * determinística, SALTANDO el NLU (A3) — el routing vive en
 * `chipIntentRouter.planForcedIntent` y lo ejecuta AgentScreen.
 *
 * V3 (fable, "cuaderno de campo cosido"): este componente YA NO vive inline
 * sobre el input del chat — la bandeja de ~11-13 píldoras en flex-wrap se comía
 * media pantalla en el celular y ahorcaba el chat (el operador la rechazó 3
 * veces). Ahora vive DENTRO de la "mochila" (bottom-sheet del AgentScreen) y
 * cada modo se pinta como TARJETA-SEMILLA grande en grilla (emoji 21px +
 * etiqueta Nunito, ≥58px de alto): legible al sol, tocable con guantes, apto
 * para baja alfabetización. CSS en AGENT_V3_CSS (agentEntrance.js), 100% por
 * tokens de tema.
 *
 * SOLO cambió la capa visual: misma data (CHIP_DEFS / chipDefs por perfil),
 * mismo mecanismo (onSelectIntent(intent)), mismos testids/roles/aria
 * (mode-chip, mode-chip-foto, mode-chip-more, chips-toolbar,
 * chips-toolbar-more, aria-pressed/expanded/controls) — cero cambios de
 * lógica ni de contrato de tests.
 *
 * Diferencia frente a `QuickChipsBar`: aquél es un atajo de pantalla-nueva
 * que inyecta texto y pasa por el NLU normal. ChipsToolbar fuerza la
 * intención sin inferencia.
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
 *                     pinta lo que recibe. La legibilidad/estilo va por CSS.
 *
 * Grupo "Más" (grounding oscuro, 2026-07-01): algunos chips del manifiesto
 * (toxicidad, saberes tradicionales, alerta normativa páramo, variedades,
 * polinización, fenología — `moreGroup:true` en CHIP_DEFS, derivado de
 * `chipMore` en agentCapabilities.js) son consultas puntuales del grafo, NO el
 * núcleo diario. Para no saturar la grilla principal se agrupan detrás de una
 * fila toggle "Más" (`data-testid="mode-chip-more"`): al tocarla se despliega
 * un SEGUNDO `role="toolbar"` con esos chips, pintados con el MISMO patrón
 * (mismo `onSelectIntent`, mismo `data-testid="mode-chip"`, mismo
 * aria-pressed/disabled) — cero mecanismo nuevo, solo una repisa aparte.
 */
const ChipsToolbar = React.memo(
/** @param {{ onSelectIntent: (intent: string) => void, activeIntent?: string|null, hasAttachment?: boolean, disabled?: boolean, isPro?: boolean, chipDefs?: any[]|null }} props */
function ChipsToolbar({
  onSelectIntent,
  activeIntent = null,
  hasAttachment = false,
  disabled = false,
  isPro = false,
  chipDefs = null,
}) {
  // Toggle del grupo "Más" (chips de grounding puntual — ver docstring
  // arriba). Hook ANTES del early-return de abajo (reglas de hooks: siempre
  // en el mismo orden, nunca condicional).
  const [showMore, setShowMore] = useState(false);

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

  // Grupo "Más": chips de grounding puntual (toxicidad, saberes tradicionales,
  // alerta páramo, variedades, polinización, fenología) que NO se pintan en la
  // grilla principal — se agrupan detrás del toggle para no saturar con el
  // núcleo diario. `coreChipDefs` conserva EXACTAMENTE el comportamiento
  // histórico (mismo orden, mismo contenido) para no romper nada existente.
  const coreChipDefs = visibleChipDefs.filter((def) => !def.moreGroup);
  const moreChipDefs = visibleChipDefs.filter((def) => def.moreGroup);

  // Render de UN modo como tarjeta-semilla — compartido entre la grilla
  // principal y el grupo "Más" (mismo mecanismo: onSelectIntent(def.intent),
  // mismo testid, mismo aria-pressed/disabled). `index` alimenta --i para la
  // entrada escalonada (solo presentación; reduced-motion la apaga por CSS).
  const renderChip = (def, index) => {
    const isActive = activeIntent === def.intent;
    // El chip 🔬 Deep Research es Pro-only. Para usuarios free: deshabilitado
    // con copy claro "función Pro" y title explicativo. NO se oculta — el
    // usuario free debe saber que la funcionalidad existe (upsell suave).
    const isDeepChip = def.intent === CHIP_INTENTS.deep;
    const isProLocked = isDeepChip && !isPro;
    const chipDisabled = disabled || isProLocked;
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
        className={`v3-chipcard${isProLocked ? ' is-locked' : ''}`}
        style={{ '--i': index }}
      >
        <span className="v3-chipcard-emoji" aria-hidden="true">{def.emoji}</span>
        <span className="v3-chipcard-label">{isProLocked ? `${def.label} (Pro)` : def.label}</span>
      </button>
    );
  };

  return (
    <div data-testid="chips-toolbar">
      <div
        role="toolbar"
        aria-label="Modos del asistente"
        className="v3-chipgrid"
      >
        {/* Chip 📷 foto: primero y SOLO si hay imagen adjunta. */}
        {hasAttachment && (
          <button
            type="button"
            data-testid="mode-chip-foto"
            onClick={() => onSelectIntent('foto')}
            disabled={disabled}
            aria-pressed={activeIntent === 'foto'}
            className="v3-chipcard"
            style={{ '--i': 0 }}
          >
            <span className="v3-chipcard-emoji" aria-hidden="true">📷</span>
            <span className="v3-chipcard-label">Foto</span>
          </button>
        )}

        {coreChipDefs.map(renderChip)}

        {/* Toggle "Más": solo aparece si hay chips de grounding puntual para
            mostrar. Despliega un segundo toolbar debajo con esos chips. */}
        {moreChipDefs.length > 0 && (
          <button
            type="button"
            data-testid="mode-chip-more"
            onClick={() => setShowMore((v) => !v)}
            disabled={disabled}
            aria-expanded={showMore}
            aria-controls="chips-toolbar-more"
            aria-label={showMore ? 'Ocultar más consultas del agente' : 'Más consultas del agente'}
            title="Más consultas: toxicidad, saberes tradicionales, variedades, polinización, fenología y normativa de páramo"
            className="v3-more-row"
          >
            <span aria-hidden="true">{showMore ? '➖' : '➕'}</span>
            <span>{showMore ? 'Menos consultas' : 'Más consultas del catálogo'}</span>
          </button>
        )}
      </div>

      {moreChipDefs.length > 0 && showMore && (
        <div
          id="chips-toolbar-more"
          role="toolbar"
          aria-label="Más consultas del agente"
          className="v3-chipgrid v3-chipgrid-more"
        >
          {moreChipDefs.map(renderChip)}
        </div>
      )}
    </div>
  );
});

export default ChipsToolbar;
