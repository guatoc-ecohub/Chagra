import ChagraAgentAvatarMaiz from './ChagraAgentAvatarMaiz';
import ChagraAgentAvatarAngelita from './ChagraAgentAvatarAngelita';
import Angelita from '../visual/agente/Angelita';
import useAgentAvatarType from '../hooks/useAgentAvatarType';

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
 * Angelita entiende y el maíz ignora).
 *
 * API "rica" (fix 2026-07-25 — bug: varios call-sites que necesitaban el
 * vocabulario Spanish completo de Angelita, `angelitaEstados.js` —p.ej.
 * 'contenta', 'invita', 'acompana'— importaban `<Angelita>` CRUDO, sin pasar
 * por este dispatcher, así que ignoraban la elección del usuario (AgentFab,
 * AgentHero, FincaVivaHero, ColibriTransition). Se acepta ahora una prop
 * alterna `estado` (en vez de `state`) para esos call-sites: si type==='maiz'
 * se traduce al vocabulario angosto que el maíz entiende; si es Angelita, pasa
 * directo sin perder fidelidad.
 */
const STATE_DE_ESTADO_RICO = {
    acompana: 'idle',
    escuchando: 'listening',
    pensando: 'thinking',
    respondiendo: 'speaking',
    contenta: 'speaking',
    invita: 'speaking',
};

export default function ChagraAgentAvatar({ estado, ...props }) {
    const [type] = useAgentAvatarType();

    if (estado !== undefined) {
        // Call-site "rico": solo Angelita entiende el vocabulario completo;
        // el maíz recibe la traducción angosta (idle/thinking/speaking/listening).
        if (type === 'maiz') {
            return <ChagraAgentAvatarMaiz state={STATE_DE_ESTADO_RICO[estado] || 'idle'} {...props} />;
        }
        return <Angelita estado={estado} {...props} />;
    }

    if (type === 'maiz') return <ChagraAgentAvatarMaiz {...props} />;
    // default → Angelita, el agente de Chagra.
    return <ChagraAgentAvatarAngelita {...props} />;
}
