import ChagraAgentAvatarColibri from './ChagraAgentAvatarColibri';
import ChagraAgentAvatarMaiz from './ChagraAgentAvatarMaiz';
import ChagraAgentAvatarAngelita from './ChagraAgentAvatarAngelita';
import useAgentAvatarType from '../hooks/useAgentAvatarType';

/**
 * ChagraAgentAvatar — wrapper que delega según preferencia del usuario
 * (localStorage `chagra:agent-avatar-type`). Drop-in compatible — todos
 * los call-sites siguen usando `<ChagraAgentAvatar .../>` sin cambios.
 *
 * Decisiones del operador:
 *   - 2026-05-27: usuario debe poder elegir entre colibrí o maíz.
 *   - 2026-05-28: reemplazar el R3F que "desatina con todo lo que ya está".
 *   - 2026-07-16: "Angelita como el agente, jubila el colibrí". La cara del
 *     agente pasa a ser Angelita (la abeja angelita, con idle-cerebro, mirada
 *     y lip-sync). El slug guardado 'colibri' (el default histórico) delega en
 *     ella sin migración; el colibrí NO sale del código: sigue de polinizador
 *     decorativo en los mundos 3D y como preferencia explícita 'colibri_svg'.
 *
 * UI de cambio vive en ProfileScreen → Apariencia → Avatar del agente.
 *
 * Mismas props que los avatares hijos: state, size, withLabel, onClick,
 * onDoubleClick, glow, className, ariaLabel.
 */
export default function ChagraAgentAvatar(props) {
    const [type] = useAgentAvatarType();
    if (type === 'maiz') return <ChagraAgentAvatarMaiz {...props} />;
    if (type === 'colibri_svg') return <ChagraAgentAvatarColibri {...props} />;
    // default (+ slug histórico 'colibri') → Angelita, el agente de Chagra.
    return <ChagraAgentAvatarAngelita {...props} />;
}
