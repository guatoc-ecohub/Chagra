import ChagraAgentAvatarAngelita from './ChagraAgentAvatarAngelita';
import ChagraAgentAvatarZariguya from './ChagraAgentAvatarZariguya';
import ChagraAgentAvatarJaguar from './ChagraAgentAvatarJaguar';
import ChagraAgentAvatarOsoBaston from './ChagraAgentAvatarOsoBaston';
import ChagraAgentAvatarLuciernaga from './ChagraAgentAvatarLuciernaga';
import ChagraAgentAvatarGuacamaya from './ChagraAgentAvatarGuacamaya';
import ChagraAgentAvatarChivitoPunk from './ChagraAgentAvatarChivitoPunk';
import Angelita from '../visual/agente/Angelita';
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
 * 'jaguar' CAMBIÓ DE TÉCNICA (2026-08-14, mismo día): dejó de ser el dibujo
 * a mano (`visual/creatures/Jaguar.jsx`, kit rubber-hose) detrás de
 * `ChagraAgentAvatarJaguar.jsx` — el operador rechazó esa vía y una lámina
 * aplanada con parpadeo falso — y pasó a reusar el rig F24 del valle
 * (`visual/creatures/JaguarCompai.jsx`, misma técnica que guacamaya/
 * chivito-punk). El slot en `AVATAR_ANGOSTO` no cambió (sigue siendo
 * `ChagraAgentAvatarJaguar.jsx`); solo cambió qué cuerpo renderiza ese
 * adaptador por dentro. `Jaguar.jsx` sigue vivo para las escenas 3D del
 * mundo y el kart, intacto.
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
        // Call-site "rico": solo Angelita entiende el vocabulario completo;
        // maíz/zarigüeya reciben la traducción angosta (idle/thinking/
        // speaking/listening).
        if (ComponenteAngosto) {
            return <ComponenteAngosto state={STATE_DE_ESTADO_RICO[estado] || 'idle'} {...props} />;
        }
        return <Angelita estado={estado} {...props} />;
    }

    if (ComponenteAngosto) return <ComponenteAngosto {...props} />;
    // default → Angelita, el agente de Chagra.
    return <ChagraAgentAvatarAngelita {...props} />;
}
