import { Volume2 } from 'lucide-react';
import { CriaturaFinca } from './CriaturaFinca.jsx';

/**
 * CriaturaCollection — la galería de criaturas coleccionables.
 *
 * Muestra TODAS las criaturas: las desbloqueadas con su emoji a todo color y un
 * botón de audio (TTS) para que una niña que lee poco oiga el logro; las que
 * faltan, en silueta gris con una PISTA de cómo conseguirlas (sin mentir: la
 * pista apunta a una acción real de la finca).
 *
 * Cero fabricación: el estado desbloqueada/bloqueada lo decide fincaGameService
 * desde indicadores reales. Acá solo se pinta.
 *
 * @param {Object} props
 * @param {Array}  props.criaturas   [{id,nombre,emoji,pista,logro,desbloqueada}]
 * @param {number} props.vivas       conteo de desbloqueadas
 * @param {number} props.total       total de criaturas
 * @param {Function} [props.onHablar] (texto) => narra con TTS
 */
export default function CriaturaCollection({ criaturas = [], vivas = 0, total = 0, onHablar }) {
  return (
    <section
      data-testid="criatura-collection"
      className="bg-gradient-to-br from-emerald-950/70 to-teal-950/50 backdrop-blur-xl border border-emerald-800/40 rounded-3xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          🦋 Mis criaturas
        </h3>
        <span
          className="text-sm font-black text-emerald-200 bg-emerald-800/50 rounded-full px-3 py-1"
          aria-label={`Tienes ${vivas} de ${total} criaturas`}
        >
          {vivas} / {total}
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {criaturas.map((c) => (
          <button
            key={c.id}
            type="button"
            data-testid={`criatura-${c.id}`}
            data-unlocked={c.desbloqueada ? 'true' : 'false'}
            onClick={() => onHablar?.(c.desbloqueada ? c.logro : c.pista)}
            className={[
              'relative flex flex-col items-center justify-center gap-1 rounded-2xl p-3 min-h-[88px]',
              'border transition active:scale-95',
              c.desbloqueada
                ? 'bg-emerald-800/40 border-emerald-500/50'
                : 'bg-slate-800/40 border-slate-700/40',
            ].join(' ')}
            aria-label={
              c.desbloqueada
                ? `${c.nombre}: desbloqueada. ${c.logro}`
                : `${c.nombre}: bloqueada. Pista: ${c.pista}`
            }
          >
            <span className="flex items-center justify-center h-[52px]" aria-hidden="true">
              <CriaturaFinca
                id={c.id}
                emoji={c.emoji}
                nombre={c.nombre}
                size={52}
                fantasma={!c.desbloqueada}
              />
            </span>
            <span
              className={[
                'text-xs font-bold text-center leading-tight',
                c.desbloqueada ? 'text-emerald-100' : 'text-slate-500',
              ].join(' ')}
            >
              {c.desbloqueada ? c.nombre : '???'}
            </span>
            {onHablar && (
              <Volume2
                size={13}
                className="absolute top-1.5 right-1.5 text-emerald-300/60"
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-emerald-200/70 mt-3 leading-relaxed">
        Toca una criatura para oír su secreto. Las criaturas llegan solitas cuando
        cuidas tu finca: más plantas, suelo sano y nada de venenos. 🌱
      </p>
    </section>
  );
}
