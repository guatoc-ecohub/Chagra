import { Check } from 'lucide-react';
import useAgentAvatarType from '../../hooks/useAgentAvatarType';
import ChagraAgentAvatarColibri from '../ChagraAgentAvatarColibri';
import ChagraAgentAvatarMaiz from '../ChagraAgentAvatarMaiz';

/**
 * AgentAvatarSelector — selector visual para el avatar del agente IA.
 *
 * 2 opciones: colibrí (default) o planta de maíz. Persiste vía
 * useAgentAvatarType (localStorage `chagra:agent-avatar-type`). Cambio
 * inmediato — afecta a todas las instancias del avatar en la app.
 */
export default function AgentAvatarSelector() {
    const [type, setType] = useAgentAvatarType();

    const OPTIONS = [
        {
            id: 'colibri',
            label: 'Colibrí libando',
            sub: 'Ave nacional polinizadora',
            Component: ChagraAgentAvatarColibri,
        },
        {
            id: 'maiz',
            label: 'Planta de maíz',
            sub: 'Cultivo ancestral originario',
            Component: ChagraAgentAvatarMaiz,
        },
    ];

    return (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div>
                <h4 className="text-sm font-bold text-slate-200">Avatar del agente</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                    Elige cómo se ve la IA en la app. Cambio inmediato.
                </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {OPTIONS.map((opt) => {
                    const selected = type === opt.id;
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setType(opt.id)}
                            aria-pressed={selected}
                            className={`relative flex flex-col items-center gap-2 px-3 py-4 rounded-xl border-2 transition-all active:scale-95 ${
                                selected
                                    ? 'border-emerald-500 bg-emerald-900/20 ring-2 ring-emerald-500/40'
                                    : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                            }`}
                        >
                            {selected && (
                                <span className="absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white">
                                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                                </span>
                            )}
                            <opt.Component state={selected ? 'thinking' : 'idle'} size={64} />
                            <div className="text-center">
                                <p className="text-sm font-bold text-slate-100">{opt.label}</p>
                                <p className="text-2xs text-slate-500 mt-0.5">{opt.sub}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
