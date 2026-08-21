import ChagraAgentAvatarAngelita from './ChagraAgentAvatarAngelita';
import ChagraAgentAvatarZariguya from './ChagraAgentAvatarZariguya';
import ChagraAgentAvatarJaguar from './ChagraAgentAvatarJaguar';
import ChagraAgentAvatarOsoBaston from './ChagraAgentAvatarOsoBaston';
import ChagraAgentAvatarLuciernaga from './ChagraAgentAvatarLuciernaga';
import ChagraAgentAvatarGuacamaya from './ChagraAgentAvatarGuacamaya';
import ChagraAgentAvatarChivitoPunk from './ChagraAgentAvatarChivitoPunk';
import Angelita from '../visual/agente/Angelita';
import GuacamayaCompai from '../visual/creatures/GuacamayaCompai';
import useCompaiElegido from '../visual/mundo3d/escenas/useCompaiElegido.js';

/**
 * ChagraAgentAvatar — wrapper que delega según preferencia del usuario
 * (localStorage `chagra:agent-avatar-type`). Drop-in compatible — todos
 * los call-sites siguen usando `<ChagraAgentAvatar .../>` sin cambios.
 *
 * Decisiones del operador:
 *   - 2026-05-27: usuario debe poder elegir avatar.
 *   - 2026-07-16: "Angelita como el agente, jubila el colibrí". La cara del
 *     agente pasa a ser Angelita (la abeja angelita, con idle-cerebro, mirada
 *     y lip-sync).
 *   - 2026-07-18: el colibrí sale TAMBIÉN de las opciones ("solo abejita").
 *     Los slugs viejos 'colibri'/'colibri_svg' migran a Angelita en el hook,
 *     sin acción del usuario. El colibrí queda de fauna decorativa en los
 *     mundos 3D — nunca como cara del agente.
 *
 * UI de cambio vive en ProfileScreen → Apariencia → Avatar del agente.
 *
 * Mismas props que los avatares hijos: state, size, withLabel, onClick,
 * onDoubleClick, glow, className, ariaLabel (+ visema/confianza que
 * Angelita entiende y el resto ignora).
 *
 * API "rica" (fix 2026-07-25 — bug: varios call-sites que necesitaban el
 * vocabulario Spanish completo de Angelita, `angelitaEstados.js` —p.ej.
 * 'contenta', 'invita', 'acompana'— importaban `<Angelita>` CRUDO, sin pasar
 * por este dispatcher, así que ignoraban la elección del usuario (AgentFab,
 * AgentHero, FincaVivaHero, ColibriTransition). Se acepta ahora una prop
 * alterna `estado` (en vez de `state`) para esos call-sites: si el tipo
 * elegido no es Angelita, se traduce al vocabulario angosto (idle/thinking/
 * speaking/listening) que el resto del elenco entiende; si es Angelita, pasa
 * directo sin perder fidelidad.
 *
 * 3ra opción (2026-07-25): 'zariguya' — la zarigüeya (crías al lomo, PR
 * #2783), adaptador en ChagraAgentAvatarZariguya.jsx.
 *
 * 4ta-6ta opción (2026-08-13, ítem #8 del GAP compAI — elenco unificado):
 * 'jaguar', 'oso-baston', 'luciernaga' — ya tenían cuerpo 2.5D y ya estaban
 * `enPWA:true` en el núcleo (#96) pero ningún selector los ofrecía.
 *
 * ROSTER A 7 (2026-08-14, decisión del operador): 'maiz' SE RETIRÓ (migra
 * solo a Angelita, ver `compai/nucleo/elenco.js` SLUGS_JUBILADOS) y entraron
 * los últimos dos, 'guacamaya' y 'chivito-punk' — reusan el rig F24 del
 * valle (`visual/creatures/GuacamayaCompai.jsx`/`ChivitoPunk.jsx`, NO
 * `Guacamaya.jsx` — ese ya existía como billboard decorativo de
 * FaunaCalido.jsx), no se redibujaron a mano. Los 7: angelita, jaguar,
 * oso-baston, zariguya, luciernaga, chivito-punk, guacamaya.
 *
 * GUACAMAYA PROMOVIDA A "AVATAR RICO" (2026-08-21, "guacamaya = compai de
 * agente completo"): hasta hoy, `type==='guacamaya'` con la API rica caía en
 * `ComponenteAngosto` (traducción a la baja vía `STATE_DE_ESTADO_RICO`,
 * perdiendo 6 de los 10 estados) — solo Angelita bypaseaba esa traducción.
 * `GuacamayaCompai.jsx` ahora entiende el vocabulario rico de verdad (`estado`
 * + `visema`, ver ese archivo), así que se le da el MISMO bypass que ya tenía
 * Angelita: `estado`/`visema`/`confianza`/etc. le llegan directo, sin pasar
 * por `STATE_DE_ESTADO_RICO`. El resto del elenco (jaguar/oso-baston/
 * zariguya/luciernaga/chivito-punk) sigue traduciéndose a la baja hasta que
 * reciban la misma migración.
 */
const STATE_DE_ESTADO_RICO = {
    acompana: 'idle',
    escuchando: 'listening',
    pensando: 'thinking',
    respondiendo: 'speaking',
    contenta: 'speaking',
    invita: 'speaking',
};

const AVATAR_ANGOSTO = {
    zariguya: ChagraAgentAvatarZariguya,
    jaguar: ChagraAgentAvatarJaguar,
    'oso-baston': ChagraAgentAvatarOsoBaston,
    luciernaga: ChagraAgentAvatarLuciernaga,
    guacamaya: ChagraAgentAvatarGuacamaya,
    'chivito-punk': ChagraAgentAvatarChivitoPunk,
};

export default function ChagraAgentAvatar({ estado = undefined, ...props }) {
    const { avatarType: type } = useCompaiElegido();
    const ComponenteAngosto = AVATAR_ANGOSTO[type];

    if (estado !== undefined) {
        // Call-site "rico": Angelita y guacamaya entienden el vocabulario
        // completo (bypasean la traducción angosta); el resto del elenco
        // recibe la traducción a la baja (idle/thinking/speaking/listening).
        // `visema`/`confianza`/etc. ya viajan dentro de `...props` — no hace
        // falta desestructurarlos aparte (mismo camino que usa Angelita).
        if (type === 'guacamaya') {
            return <GuacamayaCompai estado={estado} {...props} />;
        }
        if (ComponenteAngosto) {
            return <ComponenteAngosto state={STATE_DE_ESTADO_RICO[estado] || 'idle'} {...props} />;
        }
        return <Angelita estado={estado} {...props} />;
    }

    if (ComponenteAngosto) return <ComponenteAngosto {...props} />;
    // default → Angelita, el agente de Chagra.
    return <ChagraAgentAvatarAngelita {...props} />;
}
