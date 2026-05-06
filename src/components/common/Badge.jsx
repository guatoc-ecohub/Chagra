import React from 'react';

/**
 * Badge, etiqueta compacta para estados/labels.
 * Diseño Bio-Punk: outlined por default, relleno opcional para enfasis.
 *
 * Props:
 *   - variant: 'outline' | 'solid' | 'ghost' (default outline).
 *   - className: clases adicionales (color/tracking/etc).
 *   - children: contenido.
 */
export default function Badge({ variant = 'outline', className = '', children, ...rest }) {
  const base = 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-bold tracking-widest uppercase';
  const variants = {
    outline: 'border bg-transparent',
    solid:   'border border-transparent',
    ghost:   'bg-transparent',
  };
  return (
    <span className={`${base} ${variants[variant] || variants.outline} ${className}`} {...rest}>
      {children}
    </span>
  );
}
