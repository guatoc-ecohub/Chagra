import { Lock, Users, BookOpenCheck, ShieldCheck } from 'lucide-react';
import { SHARE_LEVEL, SHARE_LEVEL_COPY } from '../../services/red';

/**
 * NivelCompartirSwitch — la COMPUERTA opt-in de 3 niveles de la red humana
 * (privado → con los vecinos → saber comunitario). Es el control con el que el
 * productor decide, paso a paso, cuánto de su trato sale del dispositivo.
 *
 * Reglas que este control hace visibles (services/red/README.md):
 *   - El dato nace PRIVADO. Nadie lo abre por él.
 *   - En "Con los vecinos" NADA privado cruza: el comprador se anonimiza
 *     (redactForPeers) y solo viajan los hechos del trato.
 *   - "Saber comunitario" (nivel 3) se muestra pero está deshabilitado: lo
 *     canoniza un sabedor de la comunidad, no un botón — el MVP opera en 1–2.
 *
 * Accesible: radiogroup real, foco visible, sin animación (reduced-motion safe).
 *
 * @param {Object} props
 * @param {number} props.value - SHARE_LEVEL.* actual.
 * @param {(nivel:number) => void} props.onChange
 * @param {boolean} [props.disabled]
 */
export default function NivelCompartirSwitch({ value, onChange, disabled = false }) {
  const niveles = [
    { nivel: SHARE_LEVEL.PRIVADO, Icon: Lock, habilitado: true },
    { nivel: SHARE_LEVEL.PARES, Icon: Users, habilitado: true },
    // Nivel 3 se MODELA pero no se ejecuta en el MVP: lo activa un sabedor.
    { nivel: SHARE_LEVEL.CANONIZADO, Icon: BookOpenCheck, habilitado: false },
  ];
  const copyActual = SHARE_LEVEL_COPY[value] || SHARE_LEVEL_COPY[SHARE_LEVEL.PRIVADO];

  return (
    <div data-testid="nivel-compartir">
      <div
        role="radiogroup"
        aria-label="¿Con quién comparte este trato?"
        className="grid grid-cols-3 gap-1.5"
      >
        {niveles.map((op) => {
          const { nivel, habilitado } = op;
          const IconNivel = op.Icon;
          const activo = value === nivel;
          const copy = SHARE_LEVEL_COPY[nivel];
          return (
            <button
              key={nivel}
              type="button"
              role="radio"
              aria-checked={activo}
              disabled={disabled || !habilitado}
              onClick={() => habilitado && onChange(nivel)}
              data-testid={`nivel-compartir-${nivel}`}
              title={habilitado ? copy.explica : 'Este nivel lo activa un sabedor de la comunidad. Todavía no está disponible.'}
              className={`min-h-[56px] rounded-lg border px-2 py-2 flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                activo
                  ? 'border-emerald-500 bg-emerald-600/20 text-emerald-200'
                  : habilitado
                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-800 bg-slate-900 text-slate-600 cursor-not-allowed'
              }`}
            >
              <IconNivel size={15} aria-hidden="true" />
              {copy.label}
            </button>
          );
        })}
      </div>

      {/* Qué significa el nivel elegido — en las palabras de la compuerta. */}
      <p className="text-xs text-slate-400 leading-snug mt-2" data-testid="nivel-compartir-explica">
        {copyActual.explica}
      </p>

      {/* La promesa anti-extractiva, siempre visible cuando se comparte. */}
      {value === SHARE_LEVEL.PARES && (
        <p className="text-[11px] text-slate-500 leading-snug mt-1.5 flex gap-1.5">
          <ShieldCheck size={13} className="shrink-0 mt-0.5 text-emerald-500/70" aria-hidden="true" />
          <span>
            Con los vecinos solo viajan los hechos del trato: producto, vereda,
            entrega y calidad. El nombre del comprador y sus notas privadas
            <strong> nunca</strong> salen de su teléfono. Este saber no se vende.
          </span>
        </p>
      )}
    </div>
  );
}
