import React from 'react';

/**
 * Sparkline — micro-gráfica SVG inline.
 */
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  showArea?: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({
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
