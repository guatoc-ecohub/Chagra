import React from 'react';
import { useTheme, THEMES } from '../../hooks/useTheme';

/**
 * ThemeSelector — switcher de tema visual (skin) de la app.
 * Vive en Perfil. Default bio-punk; el usuario puede cambiar a Nature o
 * Minimalista (persistido en localStorage vía useTheme). El tema se aplica
 * app-wide desde el login mediante data-theme en <html>.
 *
 * Cada tema muestra un swatch con sus colores característicos para que el
 * cambio sea evidente antes de aplicarlo.
 */

// Trío de colores representativo de cada tema (fondo / acento / detalle).
// Solo presentación del swatch; la paleta real vive en themes.css.
const SWATCHES = {
  auto: ['#0a0e14', '#d98a4f', '#f6efe0'],
  biopunk: ['#0a0e14', '#19c79a', '#3be8a6'],
  nature: ['#f6efe0', '#d98a4f', '#7a8f4a'],
  minimalista: ['#f6f3ec', '#2f6e5a', '#878d86'],
};

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        {THEMES.map((t) => {
          const active = theme === t.id;
          const swatch = SWATCHES[t.id] || SWATCHES.biopunk;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={active}
              onClick={() => setTheme(t.id)}
              className={`w-full p-4 rounded-xl text-left border-2 transition-all active:scale-95 ${
                active
                  ? 'border-emerald-500 bg-emerald-900/20'
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span
                  className={`text-base font-black ${
                    active ? 'text-emerald-400' : 'text-slate-100'
                  }`}
                >
                  {t.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex gap-1" aria-hidden="true">
                    {swatch.map((c, i) => (
                      <span
                        key={i}
                        className="w-4 h-4 rounded-full border border-black/20"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                  {active && (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  )}
                </div>
              </div>
              <span className="block text-xs text-slate-400 leading-relaxed">
                {t.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
