/**
 * HudCard — glassmorphism card reusable con estética Jarvis.
 *
 * - Backdrop blur 14px
 * - Border subtil cyan
 * - Top scan-line decorativa que aparece on hover
 * - Animation entry stagger via framer-motion
 */
import { motion, type HTMLMotionProps } from 'framer-motion';

interface Props extends HTMLMotionProps<'section'> {
  title: string;
  badge?: string;
  badgeColor?: string;
  delay?: number;
}

export function HudCard({ title, badge, badgeColor, delay = 0, children, style, ...rest }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        border: '1px solid var(--glass-border)',
        borderRadius: 12,
        padding: '1.25rem',
        boxShadow: 'var(--glass-shadow)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      {/* Top scan-line decorative */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
          opacity: 0.6,
        }}
      />

      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--fg-dim)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {title}
        </h2>
        {badge && (
          <span
            style={{
              fontSize: '0.6rem',
              padding: '0.2rem 0.6rem',
              borderRadius: 999,
              fontWeight: 500,
              letterSpacing: '0.05em',
              fontFamily: 'var(--font-mono)',
              color: badgeColor || 'var(--accent)',
              background: `color-mix(in srgb, ${badgeColor || 'var(--accent)'} 15%, transparent)`,
              textTransform: 'uppercase',
            }}
          >
            {badge}
          </span>
        )}
      </header>

      {children}
    </motion.section>
  );
}
