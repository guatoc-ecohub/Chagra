import ChagraAgentAvatarColibri from './ChagraAgentAvatarColibri';
import ChagraAgentAvatarColibriPhoto from './ChagraAgentAvatarColibriPhoto';
import ChagraAgentAvatarMaiz from './ChagraAgentAvatarMaiz';
import useAgentAvatarType from '../hooks/useAgentAvatarType';

/**
 * ChagraAgentAvatar — wrapper que delega según preferencia del usuario
 * (localStorage `chagra:agent-avatar-type`). Drop-in compatible — todos
 * los call-sites siguen usando `<ChagraAgentAvatar .../>` sin cambios.
 *
 * Decisiones del operador:
 *   - 2026-05-27: usuario debe poder elegir entre colibrí o maíz.
 *   - 2026-05-28: reemplazar el R3F que "desatina con todo lo que ya está".
 *     El default 'colibri' ahora apunta al avatar foto-realista (foto
 *     biopunk Lili). El SVG ilustrado vive bajo 'colibri_svg' para quien
 *     prefiera el estilo botánico anterior.
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
    // default + 'colibri' → avatar foto-realista (reemplaza el R3F).
    return <ChagraAgentAvatarColibriPhoto {...props} />;
}
