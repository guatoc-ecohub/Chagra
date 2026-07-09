import React from 'react';
import { Check } from 'lucide-react';
import { useTheme, getSelectableThemes } from '../../hooks/useTheme';
import ThemeLivePreview from './ThemeLivePreview';
import { fincaVivaHomePerfilActivo } from '../../config/fincaVivaHomeFlag';

/**
 * ThemeSelector — GALERÍA DE TEMAS con previsualización EN VIVO.
 *
 * Cada tema se muestra como un MINI-TELÉFONO que renderiza una porción REAL
 * de la app (barra superior, saludo, tarjetas, chat del agente, compositor)
 * dentro de un contenedor con `data-theme="<tema>"`: la indirección CSS-var
 * (feedback-themes-cssvar-indirection) re-teje los tokens reales del tema en
 * ese subárbol, así que la tarjeta muestra EXACTAMENTE cómo se verá la app.
 * Cero paleta hard-codeada (el viejo themePreviewPalettes.js — "el afiche de
 * la película" — se retiró: el preview ya no puede driftear de la piel real).
 * Ver ThemeLivePreview.jsx para la mecánica (escala, aria-hidden, tokens).
 *
 * Al tocar, el tema se aplica en vivo (setTheme) y toda la pantalla alrededor
 * cambia: doble preview.
 *
 * Mecánica intacta respecto a la versión anterior:
 *   - useTheme().setTheme(id) al tocar (persistencia localStorage chagra:theme).
 *   - aria-pressed en el botón activo.
 *   - getSelectableThemes(flag finca viva) decide el catálogo visible
 *     (verde-vivo solo con VITE_FINCA_VIVA_HOME_PERFIL ON).
 */

/**
 * Preview del modo AUTO: partido en diagonal — día (nature) a la izquierda,
 * noche (biopunk2) a la derecha. Comunica "cambia solo según la hora".
 * Ambas mitades son renders VIVOS de sus temas (no dibujos).
 */
function AutoLivePreview() {
  return (
    <div aria-hidden="true" className="relative w-full h-full overflow-hidden">
      <div className="absolute inset-0">
        <ThemeLivePreview themeId="nature" />
      </div>
      <div
        className="absolute inset-0"
        style={{ clipPath: 'polygon(58% 0, 100% 0, 100% 100%, 38% 100%)' }}
      >
        <ThemeLivePreview themeId="biopunk2" />
      </div>
      {/* Costura día→noche */}
      <span
        className="absolute inset-y-0 bg-white/55"
        style={{ left: '48%', width: 2, transform: 'skewX(-11deg)' }}
      />
    </div>
  );
}

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const themes = getSelectableThemes(fincaVivaHomePerfilActivo());

  return (
    <div className="grid grid-cols-2 gap-3" data-testid="theme-gallery">
      {themes.map((t) => {
        const active = theme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={active}
            data-testid={`theme-card-${t.id}`}
            onClick={() => setTheme(t.id)}
            className={`group text-left rounded-2xl border-2 overflow-hidden transition-all active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
              active
                ? 'border-emerald-500 bg-emerald-900/20 shadow-[0_0_18px_rgba(16,185,129,0.25)]'
                : 'border-slate-800 bg-slate-900/40 hover:border-slate-600'
            }`}
          >
            {/* Mini-teléfono: render VIVO del tema (la app real en miniatura) */}
            <div className="relative w-full aspect-[3/4] border-b border-slate-800/60">
              {t.id === 'auto' ? <AutoLivePreview /> : <ThemeLivePreview themeId={t.id} />}
              {active && (
                <span
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg"
                  aria-hidden="true"
                >
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </div>
            {/* Textos en <div> (bloques): el nombre accesible del botón queda
                "Label Desc Estado" CON espacios (los lectores y los tests
                anclan /^Label Desc/). */}
            <div className="p-3">
              <div
                className={`text-sm font-black leading-tight ${
                  active ? 'text-emerald-400' : 'text-slate-100'
                }`}
              >
                {t.label}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 leading-snug">
                {t.desc}
              </div>
              <div
                className={`mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${
                  active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                }`}
              >
                {active ? (
                  <>
                    <Check size={11} strokeWidth={3} aria-hidden="true" /> Aplicado
                  </>
                ) : (
                  'Tocar para aplicar'
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
