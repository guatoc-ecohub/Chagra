import React from 'react';
import { Clock, ShieldAlert, ScrollText, Sprout } from 'lucide-react';
import {
  getDiagramaBiopreparado,
  iconoIngrediente,
} from '../data/biopreparado-diagramas';

/**
 * BiopreparadoDiagrama — diagrama visual PASO A PASO de un biopreparado,
 * pensado para campesinos de baja alfabetización: el usuario debería poder
 * PREPARARLO mirando el dibujo, casi sin leer.
 *
 * Renderiza desde dos fuentes, ninguna inventada:
 *   - el objeto del catálogo (`biopreparado`, de catalog/biopreparados-seed.json):
 *     ingredientes, tiempo de elaboración, precaución de seguridad, fuente.
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
 *
 * Props:
 *   - biopreparado: objeto del catálogo (requiere id, ingredientes, fuente…)
 *   - highlightIngredient: (opcional) nombre del ingrediente a resaltar
 *     (Miguel UX: el material que el usuario acaba de agregar a la bodega)
 *   - compact: (opcional) oculta el encabezado de nombre (cuando ya hay título)
 */
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
    tiempo_elaboracion_dias: dias,
    precaucion_seguridad: precaucion,
    fuente,
  } = biopreparado;

  const hl = highlightIngredient.trim().toLowerCase();

  return (
    <section
      data-testid="biopreparado-diagrama"
      aria-label={`Cómo preparar ${nombre || 'el biopreparado'} paso a paso`}
      className="space-y-4"
    >
      {!compact && (
        <header className="flex items-center gap-2">
          <Sprout size={18} className="text-emerald-400 shrink-0" aria-hidden="true" />
          <h4 className="text-sm font-bold text-slate-100">{nombre}</h4>
          {diagrama.rinde && (
            <span className="ml-auto text-[10px] text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded-full">
              {diagrama.rinde}
            </span>
          )}
        </header>
      )}

      {/* ── Ingredientes: fichas con ícono concreto ─────────────────────── */}
      {ingredientes.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
            Necesita
          </p>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {ingredientes.map((ing, i) => {
              const isMatch = hl && ing.toLowerCase().includes(hl);
              return (
                <li
                  key={i}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center ${
                    isMatch
                      ? 'border-emerald-700 bg-emerald-900/30'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <span className="text-2xl leading-none" aria-hidden="true">
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
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
          Paso a paso
        </p>
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
                <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-2xl leading-none shrink-0" aria-hidden="true">
                      {paso.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 flex items-center flex-wrap gap-1.5">
                        {paso.titulo}
                        {paso.cantidad && (
                          <span className="text-[11px] font-bold text-emerald-300 bg-emerald-900/40 px-1.5 py-0.5 rounded">
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
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
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

      {/* ── Banda de seguridad (guarda existente del catálogo) ─────────── */}
      {precaucion && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-800/60 bg-amber-900/20 px-3 py-2">
          <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-amber-400/80 font-bold mb-0.5">
              Cuidado
            </p>
            <p className="text-xs text-amber-200/90 leading-relaxed">{precaucion}</p>
          </div>
        </div>
      )}

      {/* ── Fuente (trazabilidad — no se inventa nada) ─────────────────── */}
      {fuente && (
        <div className="flex items-start gap-2 pt-1">
          <ScrollText size={12} className="text-slate-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[10px] text-slate-500 italic leading-relaxed">{fuente}</p>
        </div>
      )}
    </section>
  );
}
