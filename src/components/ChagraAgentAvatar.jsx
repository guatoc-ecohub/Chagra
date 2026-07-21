import ChagraAgentAvatarMaiz from './ChagraAgentAvatarMaiz';
import ChagraAgentAvatarAngelita from './ChagraAgentAvatarAngelita';
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
 */
export default function ChagraAgentAvatar(props) {
    const [type] = useAgentAvatarType();
    if (type === 'maiz') return <ChagraAgentAvatarMaiz {...props} />;
    // default → Angelita, el agente de Chagra.
    return <ChagraAgentAvatarAngelita {...props} />;
}
