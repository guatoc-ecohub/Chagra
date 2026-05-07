import React, { useState, useEffect } from 'react';
import { HELP_TIPS } from '../data/help-tips.js';

const STORAGE_KEY = 'chagra:help_tip_history';
const HISTORY_LIMIT = 5;

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

  return (
    <div className="border rounded-xl border-amber-200 bg-amber-50 p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <span className="text-amber-600 text-xl">💡</span>
        </div>
        <div className="flex-1 space-y-2">
          <p className="font-bold text-amber-800 text-sm">Tip del día</p>
          <p className="text-amber-700 text-sm leading-relaxed">
            {currentTip.text}
          </p>
          <button
            onClick={loadRandomTip}
            className="text-amber-600 hover:text-amber-800 text-xs font-medium underline"
          >
            siguiente &gt;
          </button>
          <p className="text-amber-500 text-xs italic">
            Fuente: {getSourceLabel(currentTip.source)}
          </p>
        </div>
      </div>
    </div>
  );
}

const getSourceLabel = (source) => {
  if (source.startsWith('cemetery_reason:')) {
    return 'cementerio';
  }
  if (source.startsWith('species_lesson:')) {
    const slug = source.split(':')[1];
    return `especie • ${slug}`;
  }
  return source.split(':')[1] || source;
};