import React from 'react';

/**
 * Skeleton — placeholder de carga reutilizable con shimmer suave.
 *
 * Quick-win UX 2026-05-28 (batch demo Diana): los counters del dashboard
 * mostraban "0" durante el primer paint, mientras `useAssetStore.hydrate()`
 * leía IndexedDB. Sensación de app vacía aunque tuviera 100 plantas. El
 * skeleton da feedback visual de "estoy cargando" sin spinner técnico.
 *
 * Variantes:
 *   - "line"    → rect 4px alto, sirve para títulos/etiquetas (default)
 *   - "rect"    → rect cualquier alto/ancho, sirve para cards
 *   - "circle"  → círculo, sirve para avatars
 *
 * Sin dependencias: pure tailwind + animate-pulse del propio Tailwind 3.
 */
/** @param {{ variant?: string, width?: string|number, height?: string|number, className?: string, rounded?: string, ariaLabel?: string }} props */
export default function Skeleton({
  variant = 'line',
  width,
  height,
  className = '',
  rounded = 'md',
  ariaLabel = 'Cargando…',
}) {
  const base = 'bg-slate-700/40 animate-pulse';
  const roundedClass = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  }[rounded] || 'rounded-md';

  let style;
  let shapeClass;
  if (variant === 'circle') {
    const size = width || height || 32;
    style = { width: size, height: size };
    shapeClass = 'rounded-full';
  } else if (variant === 'rect') {
    style = { width: width || '100%', height: height || 80 };
    shapeClass = roundedClass;
  } else {
    style = { width: width || '60%', height: height || 12 };
    shapeClass = roundedClass;
  }

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      aria-busy="true"
      className={`${base} ${shapeClass} ${className}`}
      style={style}
    />
  );
}
