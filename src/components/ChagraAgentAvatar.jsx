import ChagraAgentAvatarColibri from './ChagraAgentAvatarColibri';
import ChagraAgentAvatarMaiz from './ChagraAgentAvatarMaiz';
import useAgentAvatarType from '../hooks/useAgentAvatarType';

/**
 * ChagraAgentAvatar — wrapper que delega en ColibrI o Maiz según
 * preferencia del operador (localStorage `chagra:agent-avatar-type`,
 * default 'colibri'). Drop-in compatible — todos los call-sites siguen
 * usando `<ChagraAgentAvatar .../>` sin cambios.
 *
 * Operator decisión 2026-05-27: usuario debe poder cambiar el avatar
 * IA del colibrí (default) por una planta de maíz si prefiere. UI de
 * cambio vive en ProfileScreen → Personalización.
 *
 * Mismas props que los avatares hijos: state, size, withLabel, onClick,
 * onDoubleClick, glow, className, ariaLabel.
 */
export default function ChagraAgentAvatar(props) {
    const [type] = useAgentAvatarType();
    if (type === 'maiz') return <ChagraAgentAvatarMaiz {...props} />;
    return <ChagraAgentAvatarColibri {...props} />;
}
