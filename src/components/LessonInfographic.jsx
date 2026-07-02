import React from 'react';
import { Sparkles, Flag, ScrollText } from 'lucide-react';

/**
 * LessonInfographic — infográfico SIMPLE y reusable para una lección del hub
 * "Aprende". Ataca el hueco de UX del audit triple ("cero gráficos; los módulos
 * son un muro de texto"): para el campesino de baja alfabetización digital, un
 * diagrama de pasos numerados con íconos comunica lo que el párrafo no logra
 * (pedido explícito de una field tester: algo "tipo Duolingo").
 *
 * NO inventa contenido: re-expresa visualmente datos que YA viven en la lección
 * (fenología = germinación → crecimiento → floración → fructificación →
 * cosecha, etc.). La `fuente` viaja con el infográfico para conservar la
 * trazabilidad que exige la doctrina del repo (todo dato tiene fuente).
 *
 * Sin dependencias nuevas: SVG inline para el número del paso + íconos lucide
 * para el marco + emoji por paso (universal, funciona en todo dispositivo y no
 * exige leer). Theme-aware: usa el acento de marca `--t-accent-rgb`.
 *
 * Accesible:
 *   - `<section role="group">` con `aria-label` que resume el infográfico.
 *   - Pasos en `<ol>`; cada número es un SVG con `role="img"` + `aria-label`.
 *   - Emojis decorativos con `aria-hidden`; el texto del paso es el contenido
 *     real que lee el lector de pantalla.
 *
 * Props:
 *   @param {object} props
 *   @param {string}  props.titulo      — título del infográfico (obligatorio).
 *   @param {string}  [props.subtitulo] - línea de apoyo bajo el título.
 *   @param {string}  [props.icono]     - emoji del encabezado (fallback: ícono lucide).
 *   @param {Array<{emoji?: string, titulo: string, detalle?: string, resaltado?: string}>} props.pasos
 *                                        — pasos numerados. `resaltado` = píldora
 *                                          corta (p. ej. duración) junto al título.
 *   @param {{emoji?: string, titulo?: string, texto: string}} [props.resultado]
 *                                        — meta/desenlace destacado al final.
 *   @param {string}  [props.fuente]     - trazabilidad de los datos re-expresados.
 *   @param {string}  [props.className]  - clases extra para el contenedor.
 */
export default function LessonInfographic({
  titulo,
  subtitulo = '',
  icono = '',
  pasos = [],
  resultado = null,
  fuente = '',
  className = '',
}) {
  if (!titulo || !Array.isArray(pasos) || pasos.length === 0) return null;

  const ariaResumen = `Infográfico de la lección: ${titulo}. ${pasos.length} paso${
    pasos.length !== 1 ? 's' : ''
  }.`;

  return (
    <section
      data-testid="lesson-infographic"
      role="group"
      aria-label={ariaResumen}
      className={`rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-4 ${className}`}
    >
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <header className="flex items-start gap-2">
        <span
          className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl"
          style={{
            color: 'rgb(var(--t-accent-rgb))',
            background: 'rgba(var(--t-accent-rgb),0.12)',
          }}
          aria-hidden="true"
        >
          {icono ? (
            <span className="text-xl leading-none">{icono}</span>
          ) : (
            <Sparkles size={18} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black leading-tight text-slate-100">
            {titulo}
          </h3>
          {subtitulo && (
            <p className="text-xs leading-snug text-slate-400 mt-0.5">
              {subtitulo}
            </p>
          )}
        </div>
      </header>

      {/* ── Pasos: stepper vertical (número SVG + emoji + texto) ─────────── */}
      <ol className="space-y-0" data-testid="lesson-infographic-pasos">
        {pasos.map((paso, idx) => {
          const n = idx + 1;
          const isLast = idx === pasos.length - 1;
          return (
            <li key={n} data-testid="lesson-infographic-paso" className="flex gap-3">
              {/* Columna izquierda: badge SVG numerado + línea conectora */}
              <div className="flex flex-col items-center shrink-0">
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 30 30"
                  role="img"
                  aria-label={`Paso ${n}`}
                  className="shrink-0"
                >
                  <circle
                    cx="15"
                    cy="15"
                    r="14"
                    style={{ fill: 'rgb(var(--t-accent-rgb))' }}
                  />
                  <text
                    x="15"
                    y="16"
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fill: '#04231b', fontSize: '14px', fontWeight: 700 }}
                  >
                    {n}
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
              <div className="flex-1 pb-4 min-w-0">
                <div className="flex items-start gap-2">
                  {paso.emoji && (
                    <span
                      className="text-2xl leading-none shrink-0"
                      aria-hidden="true"
                    >
                      {paso.emoji}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100 flex items-center flex-wrap gap-1.5">
                      {paso.titulo}
                      {paso.resaltado && (
                        <span className="text-[11px] font-bold text-emerald-300 bg-emerald-900/40 px-1.5 py-0.5 rounded">
                          {paso.resaltado}
                        </span>
                      )}
                    </p>
                    {paso.detalle && (
                      <p className="text-xs leading-relaxed mt-0.5 text-slate-300">
                        {paso.detalle}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* ── Meta / desenlace destacado ─────────────────────────────────── */}
      {resultado && resultado.texto && (
        <div
          data-testid="lesson-infographic-resultado"
          className="flex items-start gap-2 rounded-xl border border-emerald-800/60 bg-emerald-900/20 px-3 py-2.5"
        >
          <span className="shrink-0 mt-0.5" aria-hidden="true">
            {resultado.emoji ? (
              <span className="text-lg leading-none">{resultado.emoji}</span>
            ) : (
              <Flag size={16} className="text-emerald-400" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-bold mb-0.5">
              {resultado.titulo || 'Para tener en cuenta'}
            </p>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              {resultado.texto}
            </p>
          </div>
        </div>
      )}

      {/* ── Fuente (trazabilidad — no se inventa nada) ─────────────────── */}
      {fuente && (
        <div className="flex items-start gap-2 pt-1">
          <ScrollText
            size={12}
            className="text-slate-600 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-[10px] text-slate-500 italic leading-relaxed">
            {fuente}
          </p>
        </div>
      )}
    </section>
  );
}
