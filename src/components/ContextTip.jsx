// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { hasSeenTip, markTipSeen } from '../services/contextTips';

/**
 * ContextTip — coach-mark de primera vez, en el LUGAR de uso.
 *
 * Tip corto y descartable que aparece donde el campesino lo necesita
 * (junto al micrófono, la cámara del diagnóstico, los puntos de
 * confiabilidad). Complementa las pantallas del Manual (Help*Screen):
 * el contenido se reusa de allá, pero presentado en el momento.
 *
 * Diseño (baja alfabetización):
 *   - Emoji grande + título corto + 1-2 frases llanas (usted/tú colombiano).
 *   - Botón "Entendido" grande (≥44px) — un solo gesto para descartar.
 *   - NO modal, NO bloquea (role="note"); el flujo sigue usable debajo.
 *   - Se muestra UNA vez: al descartarlo queda registrado en contextTips
 *     (localStorage, offline) y no vuelve a molestar.
 *   - Theme-aware: solo clases slate/emerald (indirección CSS-var de los
 *     3 temas — tailwind.config.js).
 *
 * Props:
 *   - id:        identificador estable del tip (clave de "ya visto").
 *   - emoji:     ícono grande (string emoji).
 *   - title:     título corto.
 *   - children:  texto del tip (1-2 frases).
 *   - moreLabel / onMore: acción secundaria opcional (ej. abrir el Manual).
 *   - className: clases extra del contenedor.
 *   - variant:   'card' (default, tarjeta con botón Entendido) o 'subtle'
 *                (una sola línea discreta con "x" — para lugares donde una
 *                tarjeta grita, ej. encima del compositor del agente;
 *                operador 2026-07-08). Misma mecánica contextTips.
 */
/** @param {{ id: string, emoji?: string, title?: string, children?: import('react').ReactNode, moreLabel?: string, onMore?: () => void, className?: string, variant?: 'card' | 'subtle' }} props */
export default function ContextTip({ id, emoji, title, children, moreLabel = null, onMore = null, className = '', variant = 'card' }) {
  const [visible, setVisible] = useState(() => !hasSeenTip(id));

  if (!visible) return null;

  const dismiss = () => {
    markTipSeen(id);
    setVisible(false);
  };

  if (variant === 'subtle') {
    return (
      <div
        role="note"
        aria-label={title}
        data-testid={`context-tip-${id}`}
        className={`flex items-center gap-1.5 px-1 ${className}`}
      >
        <span className="text-sm shrink-0 leading-none" aria-hidden="true">{emoji}</span>
        <p className="flex-1 min-w-0 text-xs text-slate-400 leading-snug">{children}</p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={`Entendido, ocultar: ${title}`}
          className="tap-target shrink-0 p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/10 transition-colors"
        >
          <X size={13} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="note"
      aria-label={title}
      data-testid={`context-tip-${id}`}
      className={`rounded-xl bg-emerald-950/50 border border-emerald-700/50 p-3 flex gap-3 items-start ${className}`}
    >
      <span className="text-3xl shrink-0 leading-none mt-0.5" aria-hidden="true">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-emerald-100 leading-snug">{title}</p>
        <p className="text-sm text-slate-300 leading-relaxed mt-0.5">{children}</p>
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          <button
            type="button"
            onClick={dismiss}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-sm font-bold transition-colors"
          >
            Entendido
          </button>
          {moreLabel && typeof onMore === 'function' ? (
            <button
              type="button"
              onClick={onMore}
              className="px-3 py-2 min-h-[44px] rounded-xl text-emerald-300 hover:text-emerald-200 text-sm font-medium underline underline-offset-2"
            >
              {moreLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
