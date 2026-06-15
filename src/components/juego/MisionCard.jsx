import { CheckCircle2, Circle, ArrowRight, BookOpenCheck } from 'lucide-react';

/**
 * MisionCard — una misión del juego, ligada a una acción REAL o a una ficha
 * GUATOC.
 *
 * Botón grande y claro: si está cumplida, se ve verde con check; si no, invita
 * a hacer la acción (rutea con onIr) y, si es de "aprender", permite marcarla a
 * mano (onMarcar) porque leer no deja rastro en los indicadores.
 *
 * Cero fabricación: el estado `cumplida` lo decide fincaGameService desde datos
 * reales (acciones) o desde lo que la niña marcó (aprender).
 *
 * @param {Object} props
 * @param {Object} props.mision      {id,titulo,emoji,descripcion,cta,nav,tipo,cumplida}
 * @param {Function} props.onIr      (nav) => navega a la vista para hacer la acción
 * @param {Function} [props.onMarcar] (id) => marca una misión de aprender como hecha
 * @param {boolean} [props.destacada] resáltala (es la próxima misión)
 */
export default function MisionCard({ mision, onIr, onMarcar, destacada = false }) {
  const { id, titulo, emoji, descripcion, cta, nav, tipo, cumplida } = mision;

  return (
    <div
      data-testid={`mision-${id}`}
      data-done={cumplida ? 'true' : 'false'}
      className={[
        'rounded-2xl p-4 border transition',
        cumplida
          ? 'bg-emerald-800/30 border-emerald-500/40'
          : destacada
            ? 'bg-amber-900/25 border-amber-400/50 shadow-lg'
            : 'bg-slate-800/40 border-slate-700/40',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl shrink-0" aria-hidden="true">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {cumplida ? (
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" aria-hidden="true" />
            ) : (
              <Circle size={18} className="text-slate-500 shrink-0" aria-hidden="true" />
            )}
            <h4 className={[
              'text-base font-black leading-tight',
              cumplida ? 'text-emerald-100 line-through decoration-emerald-400/50' : 'text-white',
            ].join(' ')}
            >
              {titulo}
            </h4>
          </div>
          <p className="text-sm text-slate-300 mt-1 leading-snug">{descripcion}</p>

          {!cumplida && (
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={() => onIr?.(nav)}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition text-emerald-950 font-bold text-sm"
              >
                {cta}
                <ArrowRight size={15} aria-hidden="true" />
              </button>
              {tipo === 'aprender' && onMarcar && (
                <button
                  type="button"
                  onClick={() => onMarcar(id)}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-slate-700/60 hover:bg-slate-600/60 active:scale-95 transition text-slate-100 font-bold text-sm"
                >
                  <BookOpenCheck size={15} aria-hidden="true" />
                  Ya lo aprendí
                </button>
              )}
            </div>
          )}

          {cumplida && (
            <p className="text-xs font-bold text-emerald-300 mt-2">¡Misión cumplida! 🎉</p>
          )}
        </div>
      </div>
    </div>
  );
}
