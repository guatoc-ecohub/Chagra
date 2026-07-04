import React, { useState, useEffect } from 'react';
import { RefreshCcw } from 'lucide-react';
import { HELP_TIPS, TIP_CATEGORIES } from '../data/help-tips.js';

const STORAGE_KEY = 'chagra:help_tip_history';
const HISTORY_LIMIT = 5;

/**
 * HelpTipCard — "Tip del día" del Manual.
 *
 * Rediseño 2026-07 (overhaul ayuda visual):
 *   - Antes era una tarjeta ámbar CLARA (bg-amber-50) pegada sobre el fondo
 *     oscuro: chocaba con biopunk y con los temas (colores fijos, sin --c-*).
 *     Ahora usa las superficies del tema (slate → variables --c-*) y funciona
 *     en los 4 temas sin overrides.
 *   - LA COSTURA en el borde izquierdo (misma puntada esmeralda que firma las
 *     respuestas respaldadas del agente): estos tips son contenido CURADO con
 *     fuente (cementerio de plantas / lecciones de especie), no relleno.
 *   - Ícono de categoría GRANDE + título corto y negro (para quien lee poco,
 *     el título ya es el consejo) + botón "Otro tip" con tap target ≥44px
 *     (antes: link subrayado minúsculo "siguiente >").
 *   - Cero animación (reduced-motion respetado por construcción).
 *
 * Lógica intacta: tip aleatorio sin repetir los últimos 5 (localStorage).
 */
export default function HelpTipCard() {
  const [currentTip, setCurrentTip] = useState(null);

  const loadRandomTip = () => {
    // Get history from localStorage
    const historyJson = localStorage.getItem(STORAGE_KEY);
    const history = historyJson ? JSON.parse(historyJson) : [];

    // Filter out tips that are in history
    const availableTips = HELP_TIPS.filter(tip => !history.includes(tip.id));

    // If we've exhausted all tips, reset history
    const tipsToUse = availableTips.length > 0 ? availableTips : HELP_TIPS;

    // Select random tip
    const randomIndex = Math.floor(Math.random() * tipsToUse.length);
    const selectedTip = tipsToUse[randomIndex];

    // Update history
    const newHistory = [...history, selectedTip.id].slice(-HISTORY_LIMIT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));

    setCurrentTip(selectedTip);
  };

  useEffect(() => {
    // Load initial tip asynchronously to avoid setState in effect warning
    const timer = setTimeout(loadRandomTip, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!currentTip) {
    return null;
  }

  const cat = TIP_CATEGORIES[currentTip.category] || { label: 'Consejo', emoji: '💡' };
  const source = currentTip.source || '';
  const sourceLabel = source.startsWith('cemetery_reason:')
    ? 'Aprendido de matas que se perdieron'
    : source.startsWith('species_lesson:')
      ? 'Lo que enseña esa especie'
      : 'Experiencia de campo';

  return (
    <div className="mx-4 mt-3 mb-4 relative rounded-2xl bg-slate-900/70 border border-slate-800 p-4 pl-6 shadow-lg">
      {/* LA COSTURA: puntada de hilo esmeralda en el borde izquierdo — tip
          curado con fuente, cosido al cuaderno (mismo lenguaje que las
          respuestas respaldadas del agente). */}
      <span
        aria-hidden="true"
        className="absolute left-2.5 top-4 bottom-4 w-[2.5px] rounded-full"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, rgb(var(--c-emerald-500, 16 185 129)) 0 7px, transparent 7px 13px)',
        }}
      />
      <div className="flex items-start gap-3">
        {/* Ícono de categoría grande, en tarjeta-semilla (esquina de lomo) */}
        <span
          aria-hidden="true"
          className="shrink-0 inline-flex items-center justify-center w-12 h-12 text-2xl leading-none bg-slate-950/60 border border-slate-700/60 rounded-[14px_14px_14px_5px]"
        >
          {cat.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-400">
              Tip del día
            </p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-700/40">
              {cat.label}
            </span>
          </div>
          {currentTip.title && (
            <p className="text-base font-black text-slate-100 leading-snug mt-1">
              {currentTip.title}
            </p>
          )}
          <p className="text-sm text-slate-300 leading-relaxed mt-1">
            {currentTip.text}
          </p>
          <div className="flex items-center justify-between gap-2 mt-2.5">
            <p className="text-[11px] text-slate-500 italic min-w-0">{sourceLabel}</p>
            <button
              type="button"
              onClick={loadRandomTip}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-300 border border-emerald-700/40 text-xs font-bold min-h-[40px] transition-colors"
            >
              <RefreshCcw size={13} aria-hidden="true" />
              Otro tip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
