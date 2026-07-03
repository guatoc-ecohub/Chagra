import React from 'react';
// Fuente única de las preguntas-ejemplo de sugerencia. Importada del módulo
// de datos compartido para que el test del punto de acceso #1 las cubra sin
// exportar constantes desde un componente (react-refresh/only-export-components).
import { SUGGESTED_ACTIONS_CHIPS as SUGGESTIONS } from '../../data/exampleQuestions';

export default function SuggestedActions({ onSelect }) {
  return (
    <div className="agent-chip-tray px-4 py-3">
      <p className="agent-chip-tray-label text-[10px] uppercase font-bold mb-2">Sugerencias</p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(s.text)}
            className="agent-chip flex items-center gap-1.5 min-h-[38px] px-3.5 py-2 rounded-full border text-xs font-medium transition-colors"
          >
            <span>{s.icon}</span>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}