import React from 'react';

/**
 * Sparkline SVG inline — renderiza una serie numerica (0..N) con enfasis
 * en legibilidad sobre fondo oscuro.
 *
 * v0.6.4+: tamano por defecto mas grande, fuentes mayores, area bajo
 * la curva con gradient translucido, chip destacado para el valor
 * actual, guia central punteada visible.
 *
 * Acepta:
 *   values: number[]                           — array crudo de numeros.
 *   data:   Array<{ state: string|number }>    — compat con formato HA history.
 *
 * Props opcionales: color, height, width, timeLabel, unit, showLastValue,
 * lastValueDecimals.
 */
export default function Sparkline({
  values,
  data,
  color = '#22d3ee',
  height = 64,
  width = 200,
  timeLabel = '24h',
  unit = '',
  showLastValue = true,
  lastValueDecimals = 1,
  responsive = false,
}) {
  let series;
  if (Array.isArray(values)) {
    series = values.filter((v) => typeof v === 'number' && !isNaN(v));
  } else if (Array.isArray(data)) {
    series = data.map((d) => parseFloat(d.state)).filter((v) => !isNaN(v));
  } else {
    series = [];
  }

  if (series.length < 2) {
    const placeholderStyle = responsive
      ? { width: '100%', maxWidth: width, height }
      : { width, height };
    return <div style={placeholderStyle} className="bg-slate-700/30 rounded animate-pulse" />;
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;

  // Padding generoso: izquierda para labels Y con unidad, arriba para el
  // chip del valor actual, abajo para el label temporal.
  const padL = 28;
  const padR = 8;
  const padT = 10;
  const padB = 16;

  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const step = plotW / (series.length - 1);

  // Puntos para la polyline del trazo principal.
  const points = series.map((v, i) => {
    const x = padL + i * step;
    const y = padT + plotH - ((v - min) / range) * plotH;
    return [x, y];
  });
  const pointsStr = points.map((p) => `${p[0]},${p[1]}`).join(' ');

  // Path del area bajo la curva: mismo trazado + close a la base.
  const areaPath =
    `M ${points[0][0]},${padT + plotH} ` +
    points.map((p) => `L ${p[0]},${p[1]}`).join(' ') +
    ` L ${points[points.length - 1][0]},${padT + plotH} Z`;

  const lastVal = series[series.length - 1];
  const lastX = padL + (series.length - 1) * step;
  const lastY = padT + plotH - ((lastVal - min) / range) * plotH;

  const midY = padT + plotH / 2;
  const topY = padT;
  const bottomY = padT + plotH;
  const midVal = (min + max) / 2;

  // Gradient unico por instancia (id con hash del color para evitar colisiones).
  const gradId = `sparkfill-${color.replace('#', '')}`;

  // Chip del valor actual: anclaje a la derecha, evita choque con la curva.
  const chipText = `${lastVal.toFixed(lastValueDecimals)}${unit}`;
  const chipW = Math.max(32, chipText.length * 6 + 8);
  const chipH = 14;
  const chipX = width - padR - chipW;
  const chipY = padT - 2;

  // Modo responsive (v0.6.12): ancho fluido capado por el viewBox; el SVG
  // escala con el contenedor preservando aspect-ratio. Esto permite colocar
  // dos sparklines lado a lado en desktop sin overflow en mobile.
  const svgWidthAttr = responsive ? '100%' : width;
  const svgStyle = responsive ? { maxWidth: width, display: 'block' } : undefined;

  return (
    <svg
      width={svgWidthAttr}
      height={height}
      className="inline-block"
      viewBox={`0 0 ${width} ${height}`}
      style={svgStyle}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Guias horizontales: min/max tenues, linea central punteada clara */}
      <line x1={padL} y1={topY} x2={width - padR} y2={topY} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.2" />
      <line x1={padL} y1={midY} x2={width - padR} y2={midY} stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.45" />
      <line x1={padL} y1={bottomY} x2={width - padR} y2={bottomY} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.2" />

      {/* Labels del eje Y (con unidad para contexto inmediato) */}
      <text x={padL - 4} y={topY + 4} fill="currentColor" fontSize="10" textAnchor="end" opacity="0.9" className="font-mono">
        {max.toFixed(0)}{unit}
      </text>
      <text x={padL - 4} y={midY + 3.5} fill="currentColor" fontSize="9" textAnchor="end" opacity="0.65" className="font-mono">
        {midVal.toFixed(0)}
      </text>
      <text x={padL - 4} y={bottomY + 3.5} fill="currentColor" fontSize="10" textAnchor="end" opacity="0.9" className="font-mono">
        {min.toFixed(0)}{unit}
      </text>

      {/* Label temporal abajo-izquierda (inicio de la ventana) */}
      {timeLabel && (
        <text x={padL} y={height - 2} fill="currentColor" fontSize="9" textAnchor="start" opacity="0.7" className="font-mono">
          -{timeLabel}
        </text>
      )}
      <text x={width - padR} y={height - 2} fill="currentColor" fontSize="9" textAnchor="end" opacity="0.7" className="font-mono">
        ahora
      </text>

      {/* Area bajo la curva (relleno gradient translucido) */}
      <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />

      {/* Serie */}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pointsStr}
        opacity="0.98"
      />

      {/* Ultimo punto con glow */}
      <circle cx={lastX} cy={lastY} r="3.2" fill={color} opacity="0.25" />
      <circle cx={lastX} cy={lastY} r="2.2" fill={color} />

      {/* Chip del valor actual (recuadro contrastado arriba-derecha) */}
      {showLastValue && (
        <g>
          <rect
            x={chipX}
            y={chipY}
            width={chipW}
            height={chipH}
            rx="2"
            fill="#020617"
            stroke={color}
            strokeWidth="0.8"
            opacity="0.92"
          />
          <text
            x={chipX + chipW / 2}
            y={chipY + 10}
            fill={color}
            fontSize="10.5"
            fontWeight="bold"
            textAnchor="middle"
            className="font-mono tabular-nums"
          >
            {chipText}
          </text>
        </g>
      )}
    </svg>
  );
}
