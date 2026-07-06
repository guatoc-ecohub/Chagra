import React, { useState } from 'react';
import { PawPrint } from 'lucide-react';
import { FOTO_BASE_ANIMALES, creditoFotoAnimal } from '../../data/animalesFinca';

/**
 * FotoAnimal — foto real (Wikimedia Commons, licencia abierta) a sangre, con
 * scrim inferior FIJO para legibilidad al sol, crédito del autor en la esquina
 * (cumplimiento CC BY / CC BY-SA) y fallback a un ícono si la imagen no carga.
 *
 * Mismo patrón "photo-forward" del módulo Agua (FotoAgua) y Suelo. El scrim es
 * oscuro fijo (no lo vira el remapeo de temas claros) para que el texto blanco
 * que va encima quede legible sobre cualquier foto.
 *
 * @param {{ slug: string, alt: string, ratio?: string, rounded?: string,
 *           Fallback?: import('lucide-react').LucideIcon, children?: React.ReactNode }} props
 *  - slug: nombre del archivo (sin extensión) en /public/animales.
 *  - children: va SOBRE la foto (títulos, stats).
 */
export default function FotoAnimal({
  slug,
  alt,
  ratio = 'aspect-[16/10]',
  rounded = '',
  Fallback = PawPrint,
  children = null,
}) {
  const [ok, setOk] = useState(true);
  const credito = creditoFotoAnimal(slug);
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-slate-950 ${ratio} ${rounded}`}>
      {ok ? (
        <img
          src={`${FOTO_BASE_ANIMALES}/${slug}.jpg`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="animal-foto absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <IconoFallback size={38} className="text-slate-700" />
        </div>
      )}
      {/* scrim fijo para legibilidad del texto/crédito sobre cualquier foto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" aria-hidden="true" />
      {children}
      {credito && (
        <span className="absolute bottom-1 right-1.5 rounded bg-black/55 px-1 py-0.5 text-[9px] leading-none text-white/75">
          Foto: {credito}
        </span>
      )}
    </div>
  );
}
