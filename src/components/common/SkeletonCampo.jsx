import React from 'react';
import './campo-states.css';

/**
 * SkeletonCampo — composiciones de carga con la forma real del contenido.
 *
 * Complementa al primitivo `Skeleton` (línea/rect/círculo): aquí los huesos
 * ya vienen armados con la silueta de las tarjetas que van a reemplazar
 * (resultados de búsqueda, ficha de especie, línea de tiempo), con shimmer
 * cálido y entrada escalonada para que la espera se sienta viva, no técnica.
 *
 * Componente PURAMENTE presentacional.
 *
 * @param {object} props
 * @param {'lista'|'ficha'|'timeline'} [props.variant]
 * @param {number} [props.count]   - filas a dibujar (lista/timeline).
 * @param {React.ReactNode} [props.label] - texto visible junto al punto vivo.
 * @param {string} [props.className]
 */

const Bone = ({ className = '', style = undefined }) => (
  <div className={`esc-bone ${className}`} style={style} aria-hidden="true" />
);

/** Punto esmeralda que respira: la señal de "esto está germinando". */
const Label = ({ children }) => (
  <p className="flex items-center gap-2 text-xs text-slate-400 mb-3">
    <span className="esc-vivo inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
    {children}
  </p>
);

const delay = (i) => ({ animationDelay: `${i * 140}ms` });

const RowsLista = ({ count }) => (
  <ul className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <li key={i} className="flex items-center gap-3 rounded-xl border border-slate-800/70 bg-slate-900/60 p-3">
        <Bone className="w-5 h-5 rounded-full shrink-0" style={delay(i)} />
        <div className="flex-1 space-y-2">
          <Bone className="h-3 w-1/2" style={delay(i)} />
          <Bone className="h-2.5 w-1/3" style={delay(i)} />
        </div>
      </li>
    ))}
  </ul>
);

const RowsFicha = () => (
  <div className="space-y-3">
    <Bone className="h-36 w-full rounded-2xl" />
    <Bone className="h-4 w-2/3" style={delay(1)} />
    <Bone className="h-3 w-1/2" style={delay(1)} />
    <div className="grid grid-cols-2 gap-3 pt-1">
      <Bone className="h-20 rounded-xl" style={delay(2)} />
      <Bone className="h-20 rounded-xl" style={delay(2)} />
    </div>
  </div>
);

const RowsTimeline = ({ count }) => (
  <div className="space-y-3 border-l-2 border-slate-800/60 ml-2 pl-5">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="relative">
        <span className="absolute -left-[27px] top-4 w-3 h-3 rounded-full bg-slate-800 border-2 border-slate-700" aria-hidden="true" />
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Bone className="h-3.5 w-16 rounded-full" style={delay(i)} />
            <Bone className="h-2.5 w-10" style={delay(i)} />
          </div>
          <Bone className="h-3 w-3/5" style={delay(i)} />
        </div>
      </div>
    ))}
  </div>
);

export default function SkeletonCampo({
  variant = 'lista',
  count = 3,
  label = null,
  className = '',
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={className}
    >
      {label && <Label>{label}</Label>}
      {variant === 'ficha' && <RowsFicha />}
      {variant === 'timeline' && <RowsTimeline count={count} />}
      {variant === 'lista' && <RowsLista count={count} />}
    </div>
  );
}
