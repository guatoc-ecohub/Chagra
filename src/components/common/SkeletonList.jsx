import React from 'react';
import Skeleton from './Skeleton';

/**
 * SkeletonList — lista de placeholders con la forma real del contenido.
 *
 * En gama baja con IndexedDB/red lenta, un spinner seco se siente como
 * "la app se quedó pegada". Un skeleton con la silueta de las cards que
 * van a aparecer mejora la percepción de rapidez y evita el salto de
 * layout cuando llegan los datos.
 *
 * Variantes (siluetas del sistema visual Chagra):
 *   - "card" → card de activo (icono cuadrado + título + subtítulo),
 *              misma caja que las cards de Mis Plantas / Activos.
 *   - "row"  → fila liviana (círculo + línea), para timelines/listas densas.
 *
 * Accesibilidad: UN solo role="status" en el contenedor (los hijos van
 * aria-hidden para no anunciar N veces "cargando"). El shimmer hereda
 * motion-safe:animate-pulse del Skeleton base (prefers-reduced-motion OK).
 */
export default function SkeletonList({
  count = 4,
  variant = 'card',
  // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- default de aria-label; los callers pasan MSG.ui.* cuando aplica (ADR-050)
  ariaLabel = 'Cargando sus registros…',
  className = '',
  'data-testid': testId = 'skeleton-list',
}) {
  const items = Array.from({ length: Math.max(1, count) });

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      data-testid={testId}
      className={`space-y-2 ${className}`}
    >
      {items.map((_, i) => (
        <div key={i} aria-hidden="true">
          {variant === 'row' ? (
            <div className="flex items-center gap-3 px-1 py-2.5">
              <Skeleton variant="circle" width={32} ariaLabel="" />
              <div className="flex-1 space-y-1.5">
                <Skeleton variant="line" width="55%" height={12} ariaLabel="" />
                <Skeleton variant="line" width="35%" height={10} ariaLabel="" />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
              <Skeleton variant="rect" width={40} height={40} rounded="lg" ariaLabel="" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="line" width="60%" height={13} ariaLabel="" />
                <Skeleton variant="line" width="40%" height={10} ariaLabel="" />
              </div>
              <Skeleton variant="rect" width={28} height={24} rounded="md" ariaLabel="" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
