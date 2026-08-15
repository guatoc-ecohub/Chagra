import JaguarCompai from '../visual/creatures/JaguarCompai';

/**
 * ChagraAgentAvatarJaguar — el jaguar (Panthera onca) como CARA del agente de
 * Chagra, 4ta opción del elenco unificado.
 *
 * REEMPLAZO 2026-08-14 (rig vivo, técnica guacamaya): este adaptador
 * apuntaba antes a `visual/creatures/Jaguar.jsx`, un cuerpo dibujado A MANO
 * con el kit rubber-hose. El operador rechazó esa vía (componentes nativos
 * que dibujan SVG a mano) y también un intento de lámina aplanada con
 * parpadeo falso — la ÚNICA técnica aprobada es el rig F24 REUSADO del valle
 * (esqueleto vivo: bob, respiración, parpadeo, mirada, cola con inercia),
 * la misma que ya corre en `ChagraAgentAvatarGuacamaya.jsx`/
 * `ChagraAgentAvatarChivitoPunk.jsx`. Ahora este adaptador renderiza
 * `JaguarCompai.jsx` (rig+defs+css del valle inlineados, NO redibujados —
 * ver ese archivo). `visual/creatures/Jaguar.jsx` (el dibujo a mano) SIGUE
 * VIVO para las escenas 3D del mundo y el kart — este cambio SOLO mueve el
 * cuerpo detrás del selector de avatar de la PWA.
 *
 * Adaptador puro (mismo contrato que los hermanos ChagraAgentAvatar*): traduce
 * la API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) al `state` que
 * `JaguarCompai.jsx` ya entiende directo (no necesita traducción de pose —
 * el rig reusado solo distingue idle/hablar por ahora en light DOM, ver nota
 * en ese archivo).
 */
export default function ChagraAgentAvatarJaguar({
    state = 'idle',
    size = 48,
    withLabel = false,
    onClick = undefined,
    onDoubleClick = undefined,
    glow = false,
    className = '',
    ariaLabel = 'Chagra IA',
}) {
    const bicho = (
        <JaguarCompai
            state={state}
            size={size}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(168,85,247,0.65))' } : undefined}
        />
    );

    const contenido = withLabel ? (
        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {bicho}
            <span style={{ font: '600 0.7rem/1 system-ui, sans-serif', color: '#94a3b8' }}>
                Jaguar
            </span>
        </span>
    ) : bicho;

    // Paridad con los avatares hermanos: con handlers, botón real (teclado +
    // lector de pantalla); sin handlers, solo el dibujo.
    if (onClick || onDoubleClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                aria-label={ariaLabel}
                title={ariaLabel}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}
            >
                {contenido}
            </button>
        );
    }
    return contenido;
}
