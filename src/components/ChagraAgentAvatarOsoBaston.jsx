import CompaiLamina from '../visual/creatures/laminaViva/CompaiLamina.jsx';

/**
 * ChagraAgentAvatarOsoBaston — el oso del bastón (Tremarctos ornatus,
 * caminante de los Andes) como CARA del agente de Chagra, 5ta opción del
 * elenco.
 *
 * LÁMINA VIVA (feat/compai-laminas-en-movimiento): el cuerpo YA NO es el SVG
 * rubber-hose dibujado a mano (`visual/creatures/OsoBaston.jsx`) — es la
 * lámina Humboldt real (`compai/laminas/oso-baston.png`, el oso con bastón
 * florecido de frailejón y orquídea) recortada en capas y rigeada, ver
 * `visual/creatures/laminaViva/CompaiLamina.jsx`. OsoBaston.jsx sigue en
 * disco sin tocar — este adaptador solo cambia SU cuerpo.
 *
 * Adaptador puro (mismo contrato que los hermanos): traduce la API histórica
 * del avatar del agente (state 'idle'|'thinking'|'speaking'|'listening',
 * glow, withLabel, onClick/onDoubleClick) al `estado` que CompaiLamina
 * entiende — sin capa de resoplido/lip-sync propia (alcance mínimo
 * ojos+cabeza+respiración, ver el docstring de CompaiLamina).
 */
export default function ChagraAgentAvatarOsoBaston({
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
            tipo="oso-baston"
            estado={state}
            size={size}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(67,194,79,0.65))' } : undefined}
        />
    );

    const contenido = withLabel ? (
        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {bicho}
            <span style={{ font: '600 0.7rem/1 system-ui, sans-serif', color: '#94a3b8' }}>
                Oso del bastón
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
