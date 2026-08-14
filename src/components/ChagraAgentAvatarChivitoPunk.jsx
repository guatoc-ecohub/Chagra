import CompaiLamina from '../visual/creatures/laminaViva/CompaiLamina.jsx';

/**
 * ChagraAgentAvatarChivitoPunk — el chivito de páramo (Oxypogon guerinii)
 * como CARA del agente de Chagra. Slug canónico `chivito-punk` (colapso
 * `chivito`→`chivito-punk` resuelto en `compai/nucleo/elenco.js`, #96 — un
 * solo pájaro, no dos).
 *
 * LÁMINA VIVA (feat/compai-laminas-en-movimiento): el cuerpo YA NO es el rig
 * vectorial F24 reusado del valle (`visual/creatures/ChivitoPunk.jsx`,
 * `arte-valle/chivito.rig.svg`) — es la lámina Humboldt real
 * (`compai/laminas/chivito-punk.png`) recortada en capas y rigeada, ver
 * `visual/creatures/laminaViva/CompaiLamina.jsx`. El SPEC del operador
 * rechazó explícitamente el redibujo a vector como técnica ("eso ya se
 * intentó y está MAL") — ChivitoPunk.jsx queda en disco sin tocar, este
 * adaptador solo cambia SU cuerpo.
 *
 * Adaptador puro (mismo contrato que los hermanos ChagraAgentAvatar*): traduce
 * la API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) al `estado` que
 * CompaiLamina entiende.
 */
export default function ChagraAgentAvatarChivitoPunk({
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
        <CompaiLamina
            tipo="chivito-punk"
            estado={state}
            size={size}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(140,70,232,0.65))' } : undefined}
        />
    );

    const contenido = withLabel ? (
        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {bicho}
            <span style={{ font: '600 0.7rem/1 system-ui, sans-serif', color: '#94a3b8' }}>
                Chivito
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
