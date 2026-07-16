import { Check } from 'lucide-react';
import useAgentAvatarType from '../../hooks/useAgentAvatarType';
import ChagraAgentAvatarColibri from '../ChagraAgentAvatarColibri';
import ChagraAgentAvatarAngelita from '../ChagraAgentAvatarAngelita';
import ChagraAgentAvatarMaiz from '../ChagraAgentAvatarMaiz';

/**
 * AgentAvatarSelector — selector visual para el avatar del agente IA.
 *
 * 3 opciones: Angelita la abeja (default), colibrí ilustrado SVG, o planta
 * de maíz. Persiste vía useAgentAvatarType (localStorage
 * `chagra:agent-avatar-type`). Cambio inmediato — afecta a todas las
 * instancias del avatar en la app.
 *
 * 2026-07-16 (operador): "Angelita como el agente, jubila el colibrí". La
 * opción default pasa a ser Angelita; conserva el slug guardado 'colibri'
 * (default histórico) para que nadie necesite migración. El colibrí
 * ilustrado sigue disponible como preferencia explícita.
 */
export default function AgentAvatarSelector() {
    const [type, setType] = useAgentAvatarType();

    const OPTIONS = [
        {
            // Slug histórico 'colibri' = el default de siempre; hoy es Angelita.
            id: 'colibri',
            label: 'Angelita, la abeja',
            sub: 'La vecina que sabe de finca (recomendado)',
            Component: ChagraAgentAvatarAngelita,
        },
        {
            id: 'colibri_svg',
            label: 'Colibrí ilustrado',
            sub: 'SVG botánico animado',
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
            <div className="grid grid-cols-3 gap-2.5">
                {OPTIONS.map((opt) => {
                    const selected = type === opt.id;
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setType(opt.id)}
                            aria-pressed={selected}
                            className={`relative flex flex-col items-center gap-2 px-2 py-4 rounded-xl border-2 transition-all active:scale-95 ${
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
                            <opt.Component state={selected ? 'thinking' : 'idle'} size={60} onDoubleClick={() => {}} ariaLabel={opt.label} />
                            <div className="text-center">
                                <p className="text-xs sm:text-sm font-bold text-slate-100 leading-tight">{opt.label}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{opt.sub}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
