import React from 'react';

/**
 * Sparkline SVG inline — renderiza una serie numerica (0..N) sin dependencias.
 *
 * Desde v0.6.3 incluye ejes mas legibles:
 *   - Guias horizontales sutiles en min/mid/max del rango.
 *   - Labels Y con valores min y max (fuera del area de trazo).
 *   - Label X con la ventana temporal (ej. "24h") si se pasa `timeLabel`.
 *   - Valor actual destacado sobre el ultimo punto.
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
  height = 48,
  width = 160,
  timeLabel = '24h',
  unit = '',
  showLastValue = true,
  lastValueDecimals = 1,
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
    return <div style={{ width, height }} className="bg-slate-700/30 rounded animate-pulse" />;
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;

  // Padding interno: izquierda para labels Y, abajo para label X.
  const padL = 22;
  const padR = 4;
  const padT = 4;
  const padB = 12;

  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const step = plotW / (series.length - 1);

  const points = series
    .map((v, i) => {
      const x = padL + i * step;
      const y = padT + plotH - ((v - min) / range) * plotH;
      return `${x},${y}`;
    })
    .join(' ');

  const lastVal = series[series.length - 1];
  const lastX = padL + (series.length - 1) * step;
  const lastY = padT + plotH - ((lastVal - min) / range) * plotH;

  const midY = padT + plotH / 2;
  const topY = padT;
  const bottomY = padT + plotH;
  const midVal = (min + max) / 2;

  return (
    <svg
      width={width}
      height={height}
      className="inline-block"
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Guias horizontales: min y max tenues (opacity 0.2); linea central
          punteada mas prominente (opacity 0.4 con dash 3/3) como baseline
          visual claro para interpretar picos vs valles de la serie. */}
      <line x1={padL} y1={topY} x2={width - padR} y2={topY} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.2" />
      <line x1={padL} y1={midY} x2={width - padR} y2={midY} stroke="currentColor" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.4" />
      <line x1={padL} y1={bottomY} x2={width - padR} y2={bottomY} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.2" />

      {/* Labels Y (max arriba, mid al centro, min abajo) */}
      <text x={padL - 3} y={topY + 3} fill="currentColor" fontSize="8" textAnchor="end" opacity="0.7" className="font-mono">
        {max.toFixed(0)}
      </text>
      <text x={padL - 3} y={midY + 3} fill="currentColor" fontSize="7.5" textAnchor="end" opacity="0.55" className="font-mono">
        {midVal.toFixed(0)}
      </text>
      <text x={padL - 3} y={bottomY + 1} fill="currentColor" fontSize="8" textAnchor="end" opacity="0.7" className="font-mono">
        {min.toFixed(0)}
      </text>

      {/* Label X (ventana temporal) abajo-derecha */}
      {timeLabel && (
        <text x={width - padR} y={height - 1} fill="currentColor" fontSize="7.5" textAnchor="end" opacity="0.55" className="font-mono">
          {timeLabel}
        </text>
      )}

      {/* Serie */}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        opacity="0.95"
      />

      {/* Ultimo punto + valor */}
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
      {showLastValue && (
        <text
          x={lastX - 4}
          y={Math.max(padT + 7, lastY - 4)}
          fill={color}
          fontSize="8.5"
          fontWeight="bold"
          textAnchor="end"
          className="font-mono"
        >
          {lastVal.toFixed(lastValueDecimals)}{unit}
        </text>
      )}
    </svg>
  );
}
