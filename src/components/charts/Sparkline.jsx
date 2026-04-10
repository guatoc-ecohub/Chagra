import React from 'react';

/**
 * Sparkline — micro-gráfica SVG inline (Fase 14.3).
 *
 * Polyline puro, sin dependencias. Apto para embeds en cards de inventario,
 * timeline de activos y cualquier panel compacto.
 *
 * Props:
 *   - data:       number[] — serie de valores
 *   - width:      ancho en px (default 60)
 *   - height:     alto en px (default 20)
 *   - color:      color del trazo (default blue-500)
 *   - strokeWidth: grosor del trazo (default 1.5)
 *   - showArea:   si true, rellena el área bajo la curva con opacidad baja
 */
export const Sparkline = ({
  data,
  width = 60,
  height = 20,
  color = '#3b82f6',
  strokeWidth = 1.5,
  showArea = false,
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const areaPath = showArea
    ? `M 0,${height} L ${points.replace(/ /g, ' L ')} L ${width},${height} Z`.replace(
        'L M',
        'L'
      )
    : null;

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
      {showArea && areaPath && (
        <path d={areaPath} fill={color} opacity="0.15" />
      )}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export default Sparkline;
