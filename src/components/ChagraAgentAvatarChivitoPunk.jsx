import ChivitoCompai from '../visual/creatures/ChivitoPunk';

/**
 * ChagraAgentAvatarChivitoPunk — el chivito de páramo (Oxypogon guerinii)
 * como CARA del agente de Chagra, 6ta opción del elenco unificado
 * (2026-08-14). Slug canónico `chivito-punk` (colapso `chivito`→`chivito-punk`
 * ya resuelto en `compai/nucleo/elenco.js`, #96 — un solo pájaro, no dos).
 *
 * Cierra el ítem #8 del GAP compAI: el chivito no tenía cuerpo en la PWA
 * (`ELENCO['chivito-punk'].enPWA` seguía `false`); ahora lo tiene reusando el
 * rig F24 del valle (`visual/creatures/ChivitoCompai.jsx`, ver ese archivo).
 *
 * Adaptador puro (mismo contrato que los hermanos ChagraAgentAvatar*): traduce
 * la API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) al `state` que
 * `ChivitoCompai.jsx` ya entiende directo (no necesita traducción de pose —
 * el rig reusado solo distingue idle/hablar por ahora, ver nota en ese
 * archivo).
 *
 * VISEMA (2026-08-21, "chivito = compai de agente completo"):
 * `ChivitoCompai.jsx` dejó de hardcodear `data-visema` a partir de `state`
 * — ahora acepta un `visema` real (para el vocabulario rico, ver
 * `ChagraAgentAvatar.jsx`). Este adaptador angosto sigue produciendo un
 * visema razonable a partir de `state`, mismo patrón que
 * `ChagraAgentAvatarOsoBaston.jsx`/`ChagraAgentAvatarLuciernaga.jsx`
 * (`VISEMA_DE_STATE`): así el contrato observable narrow (state="speaking"
 * → data-visema) no cambia para quien ya lo usaba.
 */
const VISEMA_DE_STATE = {
    speaking: 'V2',
};

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
    const visema = VISEMA_DE_STATE[state] || null;
    const bicho = (
        <ChivitoCompai
            state={state}
            visema={visema}
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
