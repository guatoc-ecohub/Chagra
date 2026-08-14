import { Check } from 'lucide-react';
import useAgentAvatarType from '../../hooks/useAgentAvatarType';
import ChagraAgentAvatarAngelita from '../ChagraAgentAvatarAngelita';
import ChagraAgentAvatarZariguya from '../ChagraAgentAvatarZariguya';
import ChagraAgentAvatarJaguar from '../ChagraAgentAvatarJaguar';
import ChagraAgentAvatarOsoBaston from '../ChagraAgentAvatarOsoBaston';
import ChagraAgentAvatarLuciernaga from '../ChagraAgentAvatarLuciernaga';
import ChagraAgentAvatarChivitoPunk from '../ChagraAgentAvatarChivitoPunk';

/**
 * AgentAvatarSelector — selector visual para el avatar del agente IA.
 *
 * Los 6 canónicos con cuerpo propio (decisión del operador, 2026-08-14):
 * Angelita la abeja (default), jaguar, oso de anteojos, zarigüeya (crías al
 * lomo), luciérnaga, chivito de páramo. Persiste vía useAgentAvatarType
 * (localStorage `chagra:agent-avatar-type` + llave canónica
 * `compai:companero`, #96). Cambio inmediato — afecta a todas las instancias
 * del avatar en la app (FAB, login, chat, onboarding — ver ChagraAgentAvatar.jsx,
 * el dispatcher del que dependen).
 *
 * NOTA: dante y oliver NO están en el selector porque aún no tienen arte propio
 * (es de Fable, hoy en hold del operador). Cuando Fable complete sus diseños,
 * se agregarán ChagraAgentAvatarDante.jsx y ChagraAgentAvatarOliver.jsx.
 *
 * 2026-07-16 (operador): "Angelita como el agente, jubila el colibrí".
 * 2026-07-18 (operador): el colibrí sale también de las opciones — "solo
 * abejita". Los slugs viejos 'colibri'/'colibri_svg' migran a 'angelita'
 * en el hook, sin acción del usuario.
 * 2026-07-25 (operador): 3ra opción, la zarigüeya (PR #2783, registro
 * rubber-hose cálido de `visual/creatures/Zariguya.jsx` — NO la zarigüeya
 * oscura/neón de `dashboard/CriaturasNocturnas.jsx`).
 * 2026-08-13 (ítem #8 del GAP compAI — elenco unificado): 4ta-6ta opción,
 * jaguar/oso de anteojos/luciérnaga — ya tenían cuerpo 2.5D dibujado y ya
 * estaban `enPWA:true` en `compai/nucleo/elenco.js` desde el 2026-08-11
 * (#96), pero este selector se había quedado en 3.
 * 2026-08-14 (roster-8, decisión del operador):
 *   - 'guacamaya' SE RETIRA del selector (queda como slug jubilado que migra
 *     solo a 'angelita', ver `compai/nucleo/elenco.js` SLUGS_JUBILADOS —
 *     nunca se borra en silencio lo que un usuario tenía guardado).
 *   - 'dante' y 'oliver' se agregan al roster-8, pero NO al selector porque
 *     aún no tienen arte propio (es de Fable, hoy en hold del operador).
 *   - 'oso-baston' se re-etiqueta "Oso de anteojos" (el nombre común de
 *     Tremarctos ornatus): mismo cuerpo (OsoBaston.jsx, 4ta dirección de
 *     arte ya aprobada), mismo slug interno (compat de localStorage) — NO es
 *     un oso nuevo.
 *   - 'chivito-punk' reusa el rig F24 del valle (`visual/creatures/ChivitoPunk.jsx`
 *     — NO `Chivito.jsx`, el billboard decorativo de FaunaCalido.jsx) en
 *     vez de redibujarse a mano — `ELENCO[...].enPWA` ya está en `true` en
 *     `compai/nucleo/elenco.js`.
 */
export default function AgentAvatarSelector() {
    const [type, setType] = useAgentAvatarType();

    const OPTIONS = [
        {
            id: 'angelita',
            label: 'Angelita, la abeja',
            sub: 'La vecina que sabe de finca (recomendado)',
            Component: ChagraAgentAvatarAngelita,
        },
        {
            id: 'zariguya',
            label: 'Zarigüeya',
            sub: 'La que carga a sus crías al lomo',
            Component: ChagraAgentAvatarZariguya,
        },
        {
            id: 'jaguar',
            label: 'Jaguar',
            sub: 'El guardián de monte',
            Component: ChagraAgentAvatarJaguar,
        },
        {
            id: 'oso-baston',
            label: 'Oso de anteojos',
            sub: 'El caminante de los Andes',
            Component: ChagraAgentAvatarOsoBaston,
        },
        {
            id: 'luciernaga',
            label: 'Luciérnaga',
            sub: 'La que lee la noche',
            Component: ChagraAgentAvatarLuciernaga,
        },
        {
            id: 'chivito-punk',
            label: 'Chivito de páramo',
            sub: 'El que vela por el agua que nace arriba',
            Component: ChagraAgentAvatarChivitoPunk,
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
            <div className="grid grid-cols-3 gap-2">
                {OPTIONS.map((opt) => {
                    const selected = type === opt.id;
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setType(opt.id)}
                            aria-pressed={selected}
                            className={`relative flex flex-col items-center gap-1.5 px-1.5 py-3 rounded-xl border-2 transition-all active:scale-95 ${
                                selected
                                    ? 'border-emerald-500 bg-emerald-900/20 ring-2 ring-emerald-500/40'
                                    : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                            }`}
                        >
                            {selected && (
                                <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white">
                                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                                </span>
                            )}
                            <opt.Component state={selected ? 'thinking' : 'idle'} size={64} onDoubleClick={() => {}} ariaLabel={opt.label} />
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
