/**
 * ParamoFauna — siluetas vivas del páramo cundinamarqués.
 *
 * - OsoAndino: foto real del oso de anteojos (Tremarctos ornatus). Si existe
 *   `/static/biodiversity-paramo.png` (la imagen Gemini-generada por kortux con
 *   los osos en árbol musgoso), la usa. Fallback: foto Wikimedia Commons.
 * - Frailejon: SVG inline (Espeletia con inflorescencia amarilla). El usuario
 *   ya validó que funciona como ícono.
 *
 * Render como overlays HTML sobre el HUD (no en Canvas 3D — más livianos,
 * mejor antialias, fácil de animar con framer-motion).
 */
import { useState } from 'react';
import { motion } from 'framer-motion';

interface PositionProps {
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'side-left' | 'side-right';
  size?: number;
  opacity?: number;
}

function corner(p: NonNullable<PositionProps['position']>): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 50,
    filter: 'drop-shadow(0 0 16px rgba(78, 212, 229, 0.45))',
  };
  switch (p) {
    case 'bottom-left':  return { ...base, bottom: '3rem', left: '2rem' };
    case 'bottom-right': return { ...base, bottom: '3rem', right: '2rem' };
    case 'top-left':     return { ...base, top: '5rem', left: '2rem' };
    case 'top-right':    return { ...base, top: '5rem', right: '2rem' };
    case 'side-left':    return { ...base, top: '50%', left: '1.5rem', transform: 'translateY(-50%)' };
    case 'side-right':   return { ...base, top: '50%', right: '1.5rem', transform: 'translateY(-50%)' };
  }
}

/**
 * Oso Andino — foto real. Layered con un anillo cyan glow alrededor para
 * matchear la estética HUD. Cae en hover. Click no hace nada (decorativo).
 */
export function OsoAndino({ position = 'bottom-left', size = 110, opacity = 0.95 }: PositionProps) {
  // Intentamos primero la imagen biodiversity-paramo (cropp del oso) generada
  // por el operador. Si falla, fallback a Wikimedia.
  const [src, setSrc] = useState('/static/biodiversity-paramo.png');

  return (
    <motion.div
      style={corner(position)}
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity, x: 0 }}
      transition={{ duration: 1.2, delay: 1.4, ease: 'easeOut' }}
    >
      <motion.div
        animate={{ y: [0, -3, 0, 2, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid rgba(78, 212, 229, 0.7)',
          boxShadow: `
            0 0 24px rgba(78, 212, 229, 0.5),
            0 0 60px rgba(78, 212, 229, 0.25),
            inset 0 0 30px rgba(0, 0, 0, 0.5)
          `,
          background: 'radial-gradient(circle, #1a3a4a 0%, #0a1518 100%)',
          position: 'relative',
        }}
      >
        <img
          src={src}
          alt="Oso de anteojos · Tremarctos ornatus · biodiversidad páramo"
          onError={() => setSrc('/static/oso-andino.jpg')}
          style={{
            width: '180%',
            height: '180%',
            objectFit: 'cover',
            objectPosition: '70% 50%',
            position: 'absolute',
            top: '-40%',
            left: '-50%',
            filter: 'saturate(1.05) contrast(1.05)',
          }}
        />
        {/* Overlay cyan tint sutil */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 30%, rgba(78, 212, 229, 0.12), transparent 70%)',
            mixBlendMode: 'screen',
          }}
        />
      </motion.div>

      <motion.div
        animate={{ opacity: [0.4, 0.85, 0.4] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.55rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'rgba(78, 212, 229, 0.75)',
          textAlign: 'center',
          marginTop: '0.5rem',
          textShadow: '0 0 8px rgba(78, 212, 229, 0.4)',
        }}
      >
        Tremarctos ornatus
      </motion.div>
    </motion.div>
  );
}

/**
 * Frailejón — Espeletia, planta endémica del páramo. SVG inline (operador
 * validó que funciona como ícono).
 */
export function Frailejon({ position = 'bottom-right', size = 80, opacity = 0.85 }: PositionProps) {
  return (
    <motion.div
      style={corner(position)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity, y: 0 }}
      transition={{ duration: 1.2, delay: 1.6, ease: 'easeOut' }}
    >
      <motion.svg
        width={size}
        height={size * 1.4}
        viewBox="0 0 80 112"
        animate={{ rotate: [-1, 1, -1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          <linearGradient id="frailejon-trunk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a2818" />
            <stop offset="100%" stopColor="#1a1208" />
          </linearGradient>
          <radialGradient id="frailejon-leaf" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#9bc99e" />
            <stop offset="50%" stopColor="#5a8c5e" />
            <stop offset="100%" stopColor="#2d4a3a" />
          </radialGradient>
        </defs>

        <rect x="34" y="35" width="12" height="68" fill="url(#frailejon-trunk)" rx="2" />
        {[44, 54, 64, 74, 84, 94].map((y) => (
          <ellipse key={y} cx="40" cy={y} rx="9" ry="2" fill="#2a1a0a" opacity="0.7" />
        ))}
        <ellipse cx="40" cy="32" rx="22" ry="6" fill="url(#frailejon-leaf)" />
        <ellipse cx="22" cy="28" rx="13" ry="5" fill="url(#frailejon-leaf)" transform="rotate(-25 22 28)" />
        <ellipse cx="58" cy="28" rx="13" ry="5" fill="url(#frailejon-leaf)" transform="rotate(25 58 28)" />
        <ellipse cx="40" cy="22" rx="20" ry="6" fill="url(#frailejon-leaf)" />
        <ellipse cx="28" cy="20" rx="14" ry="5" fill="url(#frailejon-leaf)" transform="rotate(-15 28 20)" opacity="0.85" />
        <ellipse cx="52" cy="20" rx="14" ry="5" fill="url(#frailejon-leaf)" transform="rotate(15 52 20)" opacity="0.85" />
        <ellipse cx="40" cy="16" rx="16" ry="4" fill="#7da89c" opacity="0.7" />
        <ellipse cx="40" cy="10" rx="4" ry="7" fill="#FFD27A" />
        <ellipse cx="40" cy="6" rx="3" ry="4" fill="#FFE8B8" />
        <circle cx="40" cy="9" r="9" fill="#FFD27A" opacity="0.15" />
      </motion.svg>

      <motion.div
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.55rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'rgba(255, 210, 122, 0.7)',
          textAlign: 'center',
          marginTop: '0.4rem',
          textShadow: '0 0 6px rgba(255, 210, 122, 0.4)',
        }}
      >
        Espeletia · Páramo
      </motion.div>
    </motion.div>
  );
}

/**
 * BioDiversityBanner — cinta lateral con la imagen completa de biodiversidad
 * generada por el operador (osos + quetzal + butterfly + frailejones + tech).
 * Aparece en FincaDetail como decoración lateral derecha.
 */
export function BioDiversityBanner({ height = 600, opacity = 0.85 }: { height?: number; opacity?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity, x: 0 }}
      transition={{ duration: 1.4, delay: 0.5 }}
      style={{
        position: 'absolute',
        right: '1.5rem',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 260,
        height,
        pointerEvents: 'none',
        zIndex: 3,
        backgroundImage: 'url(/static/biodiversity-paramo.png)',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center right',
        filter: 'drop-shadow(0 0 24px rgba(78, 212, 229, 0.3))',
        mixBlendMode: 'screen',
      }}
    />
  );
}
