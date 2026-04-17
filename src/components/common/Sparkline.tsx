import React from 'react';

/**
 * Sparkline SVG inline — renderiza una serie numérica (0..N) sin dependencias.
 */

interface DataPoint {
  state: string | number;
}

interface SparklineProps {
  values?: number[] | undefined;
  data?: DataPoint[] | undefined;
  color?: string;
  height?: number;
  width?: number;
  showLastValue?: boolean;
  lastValueDecimals?: number;
}

export default function Sparkline({
  values,
  data,
  color = '#22d3ee',
  height = 32,
  width = 120,
  showLastValue = true,
  lastValueDecimals = 1,
}: SparklineProps) {
  let series: number[];
  if (Array.isArray(values)) {
    series = values.filter((v): v is number => typeof v === 'number' && !isNaN(v));
  } else if (Array.isArray(data)) {
    series = data.map((d) => parseFloat(String(d.state))).filter((v) => !isNaN(v));
  } else {
    series = [];
  }

  if (series.length < 2) {
    return <div style={{ width, height }} className="bg-slate-700/30 rounded animate-pulse" />;
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const step = width / (series.length - 1);

  const points = series
    .map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`)
    .join(' ');

  const lastVal = series[series.length - 1] ?? 0;
  const lastX = (series.length - 1) * step;
  const lastY = height - ((lastVal - min) / range) * (height - 4) - 2;

  return (
    <svg width={width} height={height} className="inline-block" viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        opacity="0.8"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
      {showLastValue && (
        <text x={lastX - 4} y={lastY - 5} fill={color} fontSize="7" fontWeight="bold" textAnchor="end">
          {lastVal.toFixed(lastValueDecimals)}
        </text>
      )}
    </svg>
  );
}
