import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { FUENTES_OFICIALES } from '../../data/fuentesAnimales';

/**
 * FuentesAnimal — sección "Fuentes / Saber más" reutilizable por las pantallas
 * del módulo Animales (gallinas, abejas, vacas, cerdos).
 *
 * Las fuentes (dominios oficiales, links a home/sección estable) viven en
 * src/data/fuentesAnimales.js. Todos los enlaces abren en pestaña nueva con
 * rel="noopener noreferrer".
 *
 * @param {{ claves: string[], nota?: string }} props
 *  - claves: lista de keys de FUENTES_OFICIALES a mostrar, en orden.
 *  - nota: texto corto adicional (p.ej. recordatorio de consultar al técnico).
 */
export default function FuentesAnimal({ claves = [], nota }) {
  const items = claves
    .map((k) => FUENTES_OFICIALES[k])
    .filter(Boolean);

  if (items.length === 0) return null;

  return (
    <section className="rounded-[var(--r-lg,20px)] border border-slate-700/60 bg-slate-900/50 p-4 shadow-[var(--sombra-1,0_1px_2px_rgb(8_30_22/0.18))]">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-100">
        <BookOpen size={18} aria-hidden="true" />
        Fuentes y saber más
      </h2>
      <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
        Esta información se apoya en fuentes públicas y oficiales. Toca para abrir
        cada entidad y profundizar:
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((f) => (
          <li key={f.url}>
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2.5 min-h-[var(--tap-min,44px)] rounded-[var(--r-sm,12px)] border border-slate-700/60 bg-slate-950/40 p-3 hover:border-sky-500/60 hover:bg-slate-900/70 motion-safe:transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
            >
              <ExternalLink size={16} className="mt-0.5 shrink-0 text-sky-300 group-hover:text-sky-200" aria-hidden="true" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-slate-100 leading-tight">{f.nombre}</span>
                <span className="block text-xs text-slate-400 leading-snug mt-0.5">{f.desc}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
        {nota || 'Ante cualquier duda de tratamiento, dosis o sanidad, consulta a un técnico, veterinario o al ICA. Esta guía no reemplaza la asistencia profesional.'}
      </p>
    </section>
  );
}
