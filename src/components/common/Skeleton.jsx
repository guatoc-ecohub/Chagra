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
export default function Skeleton({
  variant = 'line',
  width,
  height,
  className = '',
  rounded = 'md',
  // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- default de aria-label preexistente al gate i18n; migración a messages.js (ADR-050) pendiente fuera de este cambio
  ariaLabel = 'Cargando…',
}) {
  // motion-safe: el shimmer se apaga solo con prefers-reduced-motion.
  const base = 'bg-slate-700/40 motion-safe:animate-pulse';
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
