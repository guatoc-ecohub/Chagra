import React from 'react';
import { Check } from 'lucide-react';
import { useTheme, getSelectableThemes } from '../../hooks/useTheme';
import { PREVIEWS } from './themePreviewPalettes';
import { fincaVivaHomePerfilActivo } from '../../config/fincaVivaHomeFlag';

/**
 * ThemeSelector — GALERÍA DE TEMAS con previsualización real (rediseño
 * "El Morral" 2026-07-05, pedido explícito del operador: "hoy NO existe una
 * previsualización de los temas — hay que agregarla").
 *
 * Cada tema se muestra como un MINI-TELÉFONO que renderiza una escena en
 * miniatura con la paleta REAL del tema: cielo del hero, burbuja del agente,
 * burbuja del usuario, botón de enviar y barra de navegación. Así el usuario
 * VE cómo se sentirá la app antes de tocar — y al tocar, el tema se aplica en
 * vivo (setTheme) y toda la pantalla alrededor cambia: doble preview.
 *
 * Los colores del PREVIEW son constantes de presentación derivadas 1:1 de las
 * paletas canónicas de `src/index.css` (--c-* por tema) y `themes.css`
 * (--t-accent-rgb) — mismo precedente que el viejo SWATCHES. La piel real de
 * la app sigue saliendo EXCLUSIVAMENTE de la indirección CSS-var
 * (feedback-themes-cssvar-indirection): esto es solo el afiche de la película.
 *
 * Mecánica intacta respecto a la versión anterior:
 *   - useTheme().setTheme(id) al tocar (persistencia localStorage chagra:theme).
 *   - aria-pressed en el botón activo.
 *   - getSelectableThemes(flag finca viva) decide el catálogo visible
 *     (verde-vivo solo con VITE_FINCA_VIVA_HOME_PERFIL ON).
 */

// Paleta de presentación por tema (fuente: index.css / themes.css, 2026-07-05).
//   bg      → fondo base            (--c-surface / demo)
//   card    → superficie de card    (--c-surface-card)
//   border  → línea / borde         (--c-surface-border)
//   ink     → tinta de texto        (--c-slate-100)
//   accent  → acento de marca       (--t-accent-rgb)
//   accent2 → acento secundario     (violeta aurora / ocre / sol según tema)
//   skyTop / skyBot → cielo del hero (temas-fase2.css --fv2-cielo-a/b)
//   night   → true = luna + estrellas en la escena (temas oscuros)

/**
 * Mini-escena de un tema: cielo + colinas + dos burbujas de chat + botón
 * enviar + barra inferior. Decorativa (aria-hidden): el nombre/desc del tema
 * viven como texto accesible en el botón padre.
 */
export function ThemeScene({ p }) {
  return (
    <div
      aria-hidden="true"
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: p.bg }}
    >
      {/* Mini topbar */}
      <div
        className="flex items-center gap-1 px-1.5 py-1 shrink-0"
        style={{ backgroundColor: p.card, borderBottom: `1px solid ${p.border}` }}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.accent }} />
        <span className="h-1 rounded-full flex-1 max-w-[26px]" style={{ backgroundColor: p.border }} />
      </div>
      {/* Cielo del hero con sol/luna y colinas */}
      <div
        className="relative shrink-0"
        style={{ height: '34%', background: `linear-gradient(180deg, ${p.skyTop}, ${p.skyBot})` }}
      >
        <span
          className="absolute rounded-full"
          style={{
            width: 12, height: 12, top: 6, right: 10,
            backgroundColor: p.night ? '#dbe7f0' : p.accent2,
            boxShadow: p.night
              ? '0 0 8px rgba(219,231,240,0.8)'
              : `0 0 10px ${p.accent2}`,
          }}
        />
        {p.night && (
          <>
            <span className="absolute rounded-full" style={{ width: 2, height: 2, top: 9, left: 12, backgroundColor: '#9fd9c4' }} />
            <span className="absolute rounded-full" style={{ width: 2, height: 2, top: 18, left: 30, backgroundColor: '#7cc4ae' }} />
          </>
        )}
        {/* Colinas de la finca */}
        <span
          className="absolute rounded-[100%_100%_0_0]"
          style={{ width: '75%', height: 14, bottom: -5, left: -12, backgroundColor: p.accent2, opacity: 0.55 }}
        />
        <span
          className="absolute rounded-[100%_100%_0_0]"
          style={{ width: '80%', height: 12, bottom: -6, right: -14, backgroundColor: p.accent, opacity: 0.7 }}
        />
      </div>
      {/* Mini chat: burbuja agente (card, con muestra "Aa" en la tinta real
          del tema — así se ve cómo LEE el texto sobre ese fondo) + burbuja
          usuario (acento). La tipografía es la misma de la app (heredada). */}
      <div className="flex-1 flex flex-col justify-center gap-1 px-1.5 py-1">
        <span
          className="h-3 w-3/4 rounded-md rounded-bl-[3px] flex items-center px-1"
          style={{ backgroundColor: p.card, border: `1px solid ${p.border}` }}
        >
          <span
            className="font-black select-none"
            style={{ fontSize: 8, lineHeight: 1, color: p.ink }}
          >
            Aa
          </span>
        </span>
        <span
          className="h-3 w-1/2 rounded-md rounded-br-[3px] self-end"
          style={{ backgroundColor: p.accent, opacity: 0.9 }}
        />
      </div>
      {/* Barra de entrada + botón enviar del tema */}
      <div
        className="flex items-center gap-1 px-1.5 py-1 shrink-0"
        style={{ backgroundColor: p.card, borderTop: `1px solid ${p.border}` }}
      >
        <span className="h-2 flex-1 rounded-full" style={{ backgroundColor: p.bg, border: `1px solid ${p.border}` }} />
        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: p.accent }} />
      </div>
    </div>
  );
}

/**
 * Escena del tema AUTO: partida en diagonal — día (nature) a la izquierda,
 * noche (biopunk2) a la derecha. Comunica "cambia solo según la hora".
 */
function AutoScene() {
  const day = PREVIEWS.nature;
  const night = PREVIEWS.biopunk2;
  return (
    <div aria-hidden="true" className="relative w-full h-full overflow-hidden">
      <div className="absolute inset-0">
        <ThemeScene p={day} />
      </div>
      <div
        className="absolute inset-0"
        style={{ clipPath: 'polygon(58% 0, 100% 0, 100% 100%, 38% 100%)' }}
      >
        <ThemeScene p={night} />
      </div>
      {/* Costura sol→luna */}
      <span
        className="absolute inset-y-0"
        style={{
          left: '48%', width: 2,
          transform: 'skewX(-11deg)',
          background: 'linear-gradient(180deg, #f5b733, #19c79a)',
          opacity: 0.85,
        }}
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
        const p = PREVIEWS[t.id] || PREVIEWS.biopunk;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={active}
            data-testid={`theme-card-${t.id}`}
            onClick={() => setTheme(t.id)}
            className={`group text-left rounded-2xl border-2 overflow-hidden transition-all active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              active
                ? 'border-emerald-500 bg-emerald-900/20 shadow-[0_0_18px_rgba(16,185,129,0.25)]'
                : 'border-slate-800 bg-slate-900/40 hover:border-slate-600'
            }`}
          >
            {/* Mini-teléfono: la previsualización real del tema. La escena
                hace un zoom sutil al pasar el dedo/cursor (se apaga con
                prefers-reduced-motion). */}
            <div className="relative w-full aspect-[5/4] border-b border-slate-800/60 overflow-hidden">
              <div className="w-full h-full transition-transform duration-300 group-hover:scale-[1.06] group-focus-visible:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100">
                {t.id === 'auto' ? <AutoScene /> : <ThemeScene p={p} />}
              </div>
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
