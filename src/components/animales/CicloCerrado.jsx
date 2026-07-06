import React from 'react';
import { Recycle, ArrowRight } from 'lucide-react';
import { CICLO_PASOS, CICLO_POR_ANIMAL } from '../../data/animalesFinca';

/**
 * CicloCerrado — el estribillo del módulo Animales: el animal aporta su
 * estiércol y ese estiércol, compostado, vuelve al suelo y a la mata. Pinta la
 * cadena de eslabones (Animal → Estiércol → Compost → Suelo → Planta) y, si se
 * le pasa `onNavigate`, ofrece el salto al MUNDO DEL ABONO (EstiercolScreen)
 * para cerrar de verdad el ciclo — así el guano no queda huérfano.
 *
 * @param {{ animalKey: keyof typeof CICLO_POR_ANIMAL, onNavigate?: Function }} props
 */
export default function CicloCerrado({ animalKey, onNavigate }) {
  /** @type {{ abono?: string, frase?: string }} */
  const info = CICLO_POR_ANIMAL[animalKey] || {};
  return (
    <section className="rounded-2xl border border-lime-600/50 bg-lime-900/25 p-4">
      <h2 className="flex items-center gap-2 text-base font-bold text-lime-200">
        <Recycle size={18} aria-hidden="true" />
        Cierra el ciclo de tu finca
      </h2>
      <p className="mt-2 text-sm text-slate-200/90 leading-relaxed">
        {info.abono && <><span className="font-bold text-lime-100">{info.abono}:</span>{' '}</>}
        {info.frase || 'El estiércol, bien madurado, vuelve al suelo y alimenta sus matas.'}
      </p>

      {/* Cadena de eslabones del ciclo */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-bold" data-testid="ciclo-cadena">
        {CICLO_PASOS.map((paso, i) => (
          <React.Fragment key={paso}>
            <span className="px-2.5 py-1 rounded-full bg-black/25 text-lime-100 border border-lime-500/40">
              {paso}
            </span>
            {i < CICLO_PASOS.length - 1 && (
              <ArrowRight size={13} className="text-lime-300 shrink-0" aria-hidden="true" />
            )}
          </React.Fragment>
        ))}
      </div>

      {typeof onNavigate === 'function' && (
        <button
          type="button"
          onClick={() => onNavigate('estiercol')}
          data-testid="ir-a-abono"
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-lime-500/50 bg-lime-500/15 px-3 py-2 text-sm font-bold text-lime-100 hover:bg-lime-500/25 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70"
        >
          <Recycle size={16} aria-hidden="true" />
          Ir al mundo del abono
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
