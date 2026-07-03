import React from 'react';
import { Clock, ShieldAlert, ScrollText, Sprout, Droplets, SprayCan, Repeat } from 'lucide-react';
import {
  getDiagramaBiopreparado,
  iconoIngrediente,
} from '../data/biopreparado-diagramas';

/**
 * BiopreparadoDiagrama — ficha de receta paso a paso de un biopreparado,
 * pensada para campesinos de baja alfabetización: el usuario debería poder
 * PREPARARLO y APLICARLO mirando la ficha, casi sin leer, y legible al sol
 * en el campo.
 *
 * Renderiza desde dos fuentes, ninguna inventada:
 *   - el objeto del catálogo (`biopreparado`, de catalog/biopreparados-seed.json):
 *     ingredientes, dosis de aplicación, método, frecuencia, tiempo de
 *     elaboración, precaución de seguridad, fuente. Se muestran TEXTUALES.
 *   - el overlay visual (src/data/biopreparado-diagramas.js): los pasos
 *     numerados, que RE-EXPRESAN el `proceso_resumen`/`dosis_aplicacion` del
 *     mismo catálogo. Cero fabricación de recetas/dosis.
 *
 * Si no hay overlay curado para `biopreparado.id`, devuelve null y el llamador
 * cae con elegancia al texto plano (`proceso_resumen`).
 *
 * Theme-aware: usa SOLO familias redefinidas por `[data-theme]` (slate /
 * emerald / amber / surface) + el acento de marca `--t-accent-rgb`
 * (teal biopunk · ocre nature · verde minimalista). Nada de sky/lime/cyan.
 * Radios/sombras/tacto vienen de los tokens unificados (styles/tokens.css) con
 * fallback byte-idéntico. Todo movimiento respeta prefers-reduced-motion.
 *
 * Props:
 *   - biopreparado: objeto del catálogo (requiere id, ingredientes, fuente…)
 *   - highlightIngredient: (opcional) nombre del ingrediente a resaltar
 *     (Miguel UX: el material que el usuario acaba de agregar a la bodega)
 *   - compact: (opcional) oculta el encabezado de nombre (cuando ya hay título)
 */

/** Eyebrow de sección — etiqueta corta en versalitas, consistente en la ficha. */
function SectionLabel({ children, className = '' }) {
  return (
    <p
      className={`text-[10px] uppercase tracking-[0.14em] font-bold mb-2 ${className}`}
    >
      {children}
    </p>
  );
}

export default function BiopreparadoDiagrama({
  biopreparado,
  highlightIngredient = '',
  compact = false,
}) {
  if (!biopreparado || !biopreparado.id) return null;
  const diagrama = getDiagramaBiopreparado(biopreparado.id);
  if (!diagrama) return null;

  const {
    nombre,
    ingredientes = [],
    dosis_aplicacion: dosis,
    metodo,
    frecuencia,
    tiempo_elaboracion_dias: dias,
    precaucion_seguridad: precaucion,
    fuente,
  } = biopreparado;

  const hl = highlightIngredient.trim().toLowerCase();

  return (
    <section
      data-testid="biopreparado-diagrama"
      aria-label={`Cómo preparar ${nombre || 'el biopreparado'} paso a paso`}
      className={
        compact
          ? 'space-y-4'
          : 'space-y-4 rounded-[var(--r-xl,24px)] border border-slate-800 bg-slate-900/50 p-4 shadow-[var(--sombra-1,0_1px_2px_rgb(8_30_22/0.18))]'
      }
    >
      {!compact && (
        <header className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
          <span
            className="grid place-items-center w-9 h-9 shrink-0 rounded-[var(--r-sm,12px)]"
            style={{ background: 'rgb(var(--t-accent-rgb) / 0.16)' }}
            aria-hidden="true"
          >
            <Sprout size={18} className="text-emerald-400" />
          </span>
          <h4 className="text-[0.95rem] font-bold text-slate-100 leading-tight">{nombre}</h4>
          {diagrama.rinde && (
            <span className="ml-auto text-[10px] font-semibold text-emerald-300 bg-emerald-900/30 border border-emerald-800/60 px-2.5 py-1 rounded-[var(--r-pill,999px)] shrink-0">
              {diagrama.rinde}
            </span>
          )}
        </header>
      )}

      {/* ── Ingredientes: fichas con ícono concreto ─────────────────────── */}
      {ingredientes.length > 0 && (
        <div>
          <SectionLabel className="text-slate-500">Necesita</SectionLabel>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {ingredientes.map((ing, i) => {
              const isMatch = hl && ing.toLowerCase().includes(hl);
              return (
                <li
                  key={i}
                  className={`flex flex-col items-center justify-start gap-1.5 rounded-[var(--r-md,16px)] border p-2.5 text-center min-h-[76px] ${
                    isMatch
                      ? 'border-emerald-600 bg-emerald-900/30 shadow-[var(--sombra-1,0_1px_2px_rgb(8_30_22/0.18))]'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <span className="text-[1.7rem] leading-none" aria-hidden="true">
                    {iconoIngrediente(ing)}
                  </span>
                  <span
                    className={`text-[10px] leading-tight ${
                      isMatch ? 'text-emerald-300 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {ing}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Pasos: stepper vertical con número SVG + emoji ──────────────── */}
      <div>
        <SectionLabel className="text-slate-500">Paso a paso</SectionLabel>
        <ol className="space-y-0">
          {diagrama.pasos.map((paso, idx) => {
            const isLast = idx === diagrama.pasos.length - 1;
            return (
              <li key={paso.n} className="flex gap-3">
                {/* Columna izquierda: badge SVG numerado + línea conectora */}
                <div className="flex flex-col items-center shrink-0">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    role="img"
                    aria-label={`Paso ${paso.n}`}
                    className="shrink-0"
                  >
                    <circle
                      cx="16"
                      cy="16"
                      r="15"
                      style={{ fill: 'rgb(var(--t-accent-rgb))' }}
                    />
                    <text
                      x="16"
                      y="17"
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ fill: '#04231b', fontSize: '15px', fontWeight: 700 }}
                    >
                      {paso.n}
                    </text>
                  </svg>
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="w-0.5 flex-1 min-h-[1.25rem] bg-slate-700 my-1"
                    />
                  )}
                </div>

                {/* Columna derecha: emoji + título + detalle */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl leading-none shrink-0" aria-hidden="true">
                      {paso.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 flex items-center flex-wrap gap-1.5">
                        {paso.titulo}
                        {paso.cantidad && (
                          <span className="text-[11px] font-bold text-emerald-200 bg-emerald-800/50 border border-emerald-700/60 px-1.5 py-0.5 rounded-[var(--r-xs,8px)]">
                            {paso.cantidad}
                          </span>
                        )}
                      </p>
                      <p
                        className={`text-xs leading-relaxed mt-0.5 ${
                          paso.alerta ? 'text-amber-300' : 'text-slate-300'
                        }`}
                      >
                        {paso.alerta && (
                          <ShieldAlert
                            size={12}
                            className="inline-block mr-1 -mt-0.5 text-amber-400"
                            aria-label="Cuidado"
                          />
                        )}
                        {paso.detalle}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── Tiempo de fermentación / elaboración ───────────────────────── */}
      {dias != null && (
        <div className="flex items-center gap-2 rounded-[var(--r-md,16px)] border border-slate-800 bg-slate-900/60 px-3 py-2.5">
          <Clock size={16} className="text-emerald-400 shrink-0" aria-hidden="true" />
          <span className="text-xs text-slate-300">
            {dias <= 1 ? (
              <>Se usa el <strong className="text-slate-100">mismo día</strong></>
            ) : (
              <>
                Listo en{' '}
                <strong className="text-slate-100">~{dias} días</strong> de
                fermentación
              </>
            )}
          </span>
        </div>
      )}

      {/* ── Dosis de aplicación (cifra de campo destacada, TEXTUAL del
             catálogo — cero fabricación) + método y frecuencia como meta ── */}
      {dosis && (
        <div className="rounded-[var(--r-md,16px)] border border-emerald-800/60 bg-emerald-950/40 px-3 py-2.5">
          <SectionLabel className="text-emerald-400/80 flex items-center gap-1.5">
            <Droplets size={12} aria-hidden="true" /> Dosis de aplicación
          </SectionLabel>
          <p className="text-sm text-emerald-50/95 leading-relaxed font-medium">{dosis}</p>
          {(metodo || frecuencia) && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {metodo && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-200/90 bg-emerald-900/50 border border-emerald-800/60 px-2 py-1 rounded-[var(--r-pill,999px)]">
                  <SprayCan size={11} aria-hidden="true" /> {metodo}
                </span>
              )}
              {frecuencia && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-200/90 bg-emerald-900/50 border border-emerald-800/60 px-2 py-1 rounded-[var(--r-pill,999px)]">
                  <Repeat size={11} aria-hidden="true" /> {frecuencia}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Banda de seguridad (guarda existente del catálogo) ─────────── */}
      {precaucion && (
        <div className="flex items-start gap-2.5 rounded-[var(--r-md,16px)] border border-amber-700/60 bg-amber-950/40 px-3 py-2.5 shadow-[var(--sombra-1,0_1px_2px_rgb(8_30_22/0.18))]">
          <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <SectionLabel className="text-amber-400/90 mb-1">Cuidado</SectionLabel>
            <p className="text-xs text-amber-100/90 leading-relaxed">{precaucion}</p>
          </div>
        </div>
      )}

      {/* ── Fuente (trazabilidad — no se inventa nada) ─────────────────── */}
      {fuente && (
        <div className="flex items-start gap-2 pt-1 border-t border-slate-800/70 mt-1">
          <ScrollText size={12} className="text-slate-600 shrink-0 mt-1.5" aria-hidden="true" />
          <p className="text-[10px] text-slate-500 italic leading-relaxed pt-1">{fuente}</p>
        </div>
      )}
    </section>
  );
}
