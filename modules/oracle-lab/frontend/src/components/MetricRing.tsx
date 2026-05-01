/**
 * MetricRing — donut chart circular con número grande al centro.
 * Útil para % humedad, RAM usage, etc. SVG nativo sin librerías.
 */
import { motion } from 'framer-motion';

interface Props {
  value: number;          // 0-100 (%)
  displayValue?: string;  // texto a mostrar (default: "{value}%")
  label?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}

export function MetricRing({
  value,
  displayValue,
  label,
  size = 120,
  strokeWidth = 8,
  color = 'var(--accent-glow)',
  trackColor = 'var(--border)',
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      <svg width={size} height={size} style={{ display: 'block' }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
        {/* Center text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--fg)"
          fontSize={size / 5}
          fontWeight={300}
          fontFamily="var(--font-display)"
        >
          {displayValue ?? `${Math.round(clamped)}%`}
        </text>
      </svg>
      {label && (
        <span
          style={{
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--fg-dim)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
