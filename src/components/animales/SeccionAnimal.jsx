import React from 'react';

/**
 * SeccionAnimal — tarjeta de sección reutilizable de las fichas de cría
 * (alojamiento, alimentación, sanidad, reproducción, aprovechamiento). Mismo
 * lenguaje visual que GallinasScreen, extraído para no repetirlo en cada
 * pantalla nueva (conejos, cabras/ovejas).
 *
 * @param {{ Icon?: import('lucide-react').LucideIcon,
 *           tono: { border: string, bg: string, text: string }, titulo: string,
 *           children: React.ReactNode }} props
 */
export default function SeccionAnimal({ Icon, tono, titulo, children }) {
  return (
    <section className={`rounded-2xl border ${tono.border} ${tono.bg} p-4`}>
      <h2 className={`flex items-center gap-2 text-base font-bold ${tono.text}`}>
        {Icon && <Icon size={18} aria-hidden="true" />}
        {titulo}
      </h2>
      <div className="mt-2 text-sm text-slate-200/90 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}
