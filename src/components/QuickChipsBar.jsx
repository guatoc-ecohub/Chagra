import React from 'react';
// Fuente única de las preguntas-ejemplo (chips). Vive en un módulo de datos
// compartido para que el test del PUNTO DE ACCESO #1 las cubra sin que el
// componente exporte constantes (regla react-refresh/only-export-components).
import { QUICK_CHIPS_BAR_QUESTIONS as DEFAULT_QUICK_QUESTIONS } from '../data/exampleQuestions';

/**
 * QuickChipsBar — tres chips clickables con preguntas frecuentes para que el
 * operador arranque el chat sin tener que escribir.
 *
 * Decisión UX-5 (issue #286): reducir la fricción del "qué le pregunto" en
 * la primera interacción con el agente. Aparece SOLO cuando el chat está
 * vacío; tras la primera respuesta del agente la barra desaparece para no
 * llenar la UI mientras hay historial visible.
 *
 * Diferencia frente a `SuggestedActions`: QuickChipsBar es el atajo de la
 * pantalla nueva (estado inicial), pensado para mostrarse JUSTO sobre el
 * input. `SuggestedActions` sigue cubriendo el flow de re-engagement con
 * iconos y wording distinto.
 *
 * Props:
 *   - onSelect: callback(query: string) — el call-site decide qué hacer.
 *               Típicamente AgentScreen llama directo a handleSubmit(query).
 */

const QuickChipsBar = React.memo(function QuickChipsBar(props) {
  const { onSelect, questions = DEFAULT_QUICK_QUESTIONS } = /** @type {any} */ (props);
  if (typeof onSelect !== 'function') return null;
  return (
    <div
      data-testid="quick-chips-bar"
      className="agent-chip-tray px-4 py-2"
    >
      <p className="agent-chip-tray-label text-[10px] uppercase tracking-wider font-bold mb-2">
        Preguntas rápidas
      </p>
      <div className="flex flex-wrap gap-2">
        {questions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onSelect(q)}
            data-testid="quick-chip"
            className="agent-chip px-3 py-1.5 rounded-full border active:scale-95 text-xs font-medium transition-all"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
});

export default QuickChipsBar;
