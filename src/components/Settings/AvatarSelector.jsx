import { useMemo } from 'react';
import { Check } from 'lucide-react';
import usePrefsStore from '../../store/usePrefsStore';
import { CREATURES } from '../../visual/creatures/index.js';

/**
 * AvatarSelector — "Elija su animal": el avatar del USUARIO (no del agente).
 *
 * Grilla DATA-DRIVEN de los personajes de fauna del registro CREATURES
 * (src/visual/creatures/index.js): cualquier bicho nuevo que entre al
 * registro aparece aquí sin tocar este archivo.
 *
 * La elección persiste de inmediato en usePrefsStore (`avatarCreatureId`,
 * localStorage `chagra:prefs:avatar-creature`) — no hay botón "guardar".
 * El resto de la app la lee vía useAvatarCreature() (hooks/).
 *
 * Reutilizado en: Perfil → Apariencia, y el paso de identidad del
 * onboarding condensado (`compact`, saltable — default abeja Angelita).
 *
 * Accesible: radiogroup + radios reales para teclado y lector de pantalla.
 * Reduced-motion-safe: con `prefers-reduced-motion` los bichos se dibujan
 * quietos (animated=false); además solo anima el elegido, para no hervir
 * diez contornos a la vez en equipos modestos.
 */
export default function AvatarSelector({ compact = false, className = '' }) {
    const avatarCreatureId = usePrefsStore((s) => s.avatarCreatureId);
    const setAvatarCreatureId = usePrefsStore((s) => s.setAvatarCreatureId);

    const opciones = useMemo(
        () => Object.entries(CREATURES).map(([id, meta]) => ({ id, ...meta })),
        [],
    );

    const reduceMotion = useMemo(() => {
        try {
            return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
        } catch (_) {
            return false;
        }
    }, []);

    return (
        <div
            className={`bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 ${className}`}
            data-testid="avatar-selector"
        >
            <div>
                <h4 className="text-sm font-bold text-slate-200">Su animal de la chagra</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                    Elija su animal — lo acompaña como su avatar en la app. Toque para elegir.
                </p>
            </div>
            <div
                role="radiogroup"
                aria-label="Elija su animal"
                className={`grid gap-2.5 ${compact ? 'grid-cols-4' : 'grid-cols-3'}`}
            >
                {opciones.map((opt) => {
                    const selected = avatarCreatureId === opt.id;
                    const Creature = opt.Component;
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={opt.nombre}
                            onClick={() => setAvatarCreatureId(opt.id)}
                            data-testid={`avatar-opcion-${opt.id}`}
                            className={`relative flex flex-col items-center gap-1.5 px-1.5 rounded-xl border-2 transition-all active:scale-95 ${
                                compact ? 'py-2.5' : 'py-3.5'
                            } ${
                                selected
                                    ? 'border-emerald-500 bg-emerald-900/20 ring-2 ring-emerald-500/40'
                                    : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                            }`}
                        >
                            {selected && (
                                <span
                                    className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white"
                                    aria-hidden="true"
                                >
                                    <Check size={12} strokeWidth={3} />
                                </span>
                            )}
                            <Creature tier="bajo" 
                                size={compact ? 44 : 56}
                                animated={selected && !reduceMotion}
                                title=""
                            />
                            <span className="text-center min-w-0 w-full">
                                <span className="block text-[11px] sm:text-xs font-bold text-slate-100 leading-tight truncate">
                                    {opt.nombre}
                                </span>
                                {!compact && (
                                    <span className="block text-[9px] italic text-slate-500 mt-0.5 leading-tight truncate">
                                        {opt.cientifico}
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
