import React from 'react';
// Fuente única de las preguntas-ejemplo de sugerencia. Importada del módulo
// de datos compartido para que el test del punto de acceso #1 las cubra sin
// exportar constantes desde un componente (react-refresh/only-export-components).
import { SUGGESTED_ACTIONS_CHIPS as SUGGESTIONS } from '../../data/exampleQuestions';

export default function SuggestedActions({ onSelect }) {
  return (
    <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/50">
      <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Sugerencias</p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(s.text)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-xs text-slate-300 transition-colors"
          >
            <span>{s.icon}</span>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}