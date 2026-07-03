import React from 'react';
import { Recycle } from 'lucide-react';

/**
 * SeccionAnimal + FichaAnimalHero — capa VISUAL compartida del módulo Animales
 * (GallinasScreen, VacasScreen, AbejasScreen). Solo presentación: no toca
 * datos ni lógica. Deduplica el SeccionCard que vivía copiado en las 3
 * pantallas y le da la misma identidad de las cards ya mergeadas
 * (SpeciesFicha / FincaCards): tokens globales de radio/sombra (tokens.css),
 * cinta de acento superior, icono sobre disco tonal y chips pastilla.
 *
 * Movimiento gateado con `motion-safe:` (respeta prefers-reduced-motion).
 */

/**
 * Tarjeta de sección con cinta de acento e icono en disco tonal.
 *
 * @param {{
 *   Icon?: React.ComponentType,
 *   color: { border: string, bg: string, text: string, bar?: string, disc?: string },
 *   titulo: string,
 *   children: React.ReactNode,
 * }} props
 *  - color.bar  (opcional): gradiente tailwind de la cinta superior.
 *  - color.disc (opcional): fondo tonal del disco del icono.
 */
export function SeccionAnimal({ Icon, color, titulo, children }) {
  return (
    <section
      className={`relative overflow-hidden rounded-[var(--r-lg,20px)] border ${color.border} ${color.bg} p-4 shadow-[var(--sombra-1,0_1px_2px_rgb(8_30_22/0.18))]`}
    >
      {/* Cinta de acento superior — misma identidad que las cards del hub. */}
      {color.bar && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${color.bar} opacity-70`}
        />
      )}
      <h2 className={`flex items-center gap-2.5 text-base font-bold ${color.text}`}>
        {Icon && (
          <span
            aria-hidden="true"
            className={`grid place-items-center w-8 h-8 shrink-0 rounded-[var(--r-sm,12px)] ${color.disc || 'bg-black/25'}`}
          >
            <Icon size={17} />
          </span>
        )}
        {titulo}
      </h2>
      <div className="mt-2.5 text-sm text-slate-200/90 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}

/**
 * FichaAnimalHero — cabecera de identidad del vertical animal: emoji grande
 * sobre disco tonal (mismo patrón que la ficha de especie del Directorio),
 * nombre, descripción corta, chips de lo que PRODUCE y línea del APORTE al
 * ciclo de la finca. Datos 100% estáticos que ya vivían en el copy.
 *
 * @param {{
 *   emoji: string,
 *   titulo: string,
 *   descripcion: string,
 *   produce: { emoji: string, label: string }[],
 *   aporte: string,
 *   tone: { border: string, bg: string, halo: string, chip: string, aporte: string },
 * }} props
 */
export function FichaAnimalHero({ emoji, titulo, descripcion, produce = [], aporte, tone }) {
  return (
    <header
      data-testid="ficha-animal-hero"
      className={`relative overflow-hidden rounded-[var(--r-xl,24px)] border ${tone.border} ${tone.bg} p-4 shadow-[var(--sombra-2,0_6px_18px_rgb(8_30_22/0.22))]`}
    >
      <div className="flex items-start gap-3">
        {/* Emoji de identidad sobre halo tonal (patrón SpeciesFicha). */}
        <span className="relative grid place-items-center shrink-0" aria-hidden="true">
          <span className={`absolute inset-0 -m-1 rounded-full ${tone.halo} blur-md scale-110`} />
          <span className="relative w-14 h-14 rounded-[var(--r-md,16px)] bg-black/30 border border-white/10 grid place-items-center text-4xl leading-none select-none">
            {emoji}
          </span>
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white leading-tight">{titulo}</h2>
          <p className="mt-1 text-sm text-slate-300 leading-relaxed">{descripcion}</p>
        </div>
      </div>

      {/* Qué produce — chips pastilla legibles de un vistazo. */}
      {produce.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5" data-testid="ficha-animal-produce">
          <span className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mr-0.5">
            Produce
          </span>
          {produce.map((p) => (
            <span
              key={p.label}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--r-pill,999px)] border text-[11px] font-bold leading-tight ${tone.chip}`}
            >
              <span aria-hidden="true">{p.emoji}</span>
              {p.label}
            </span>
          ))}
        </div>
      )}

      {/* Aporte al ciclo cerrado de la finca. */}
      {aporte && (
        <p className={`mt-2.5 flex items-start gap-1.5 text-xs font-bold ${tone.aporte}`}>
          <Recycle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {aporte}
        </p>
      )}
    </header>
  );
}

export default SeccionAnimal;
