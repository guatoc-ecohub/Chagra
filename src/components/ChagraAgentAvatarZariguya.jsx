import CompaiLamina from '../visual/creatures/laminaViva/CompaiLamina.jsx';

/**
 * ChagraAgentAvatarZariguya — la zarigüeya como CARA del agente de Chagra,
 * 3ra opción del elenco (operador 2026-07-25).
 *
 * LÁMINA VIVA (feat/compai-laminas-en-movimiento): el cuerpo YA NO es el SVG
 * rubber-hose dibujado a mano (`visual/creatures/Zariguya.jsx`) — es la
 * lámina Humboldt real (`compai/laminas/zariguya.png`) recortada en capas y
 * rigeada, ver `visual/creatures/laminaViva/CompaiLamina.jsx`. Zariguya.jsx
 * sigue en disco sin tocar (otros consumidores, p. ej. fauna ambiental del
 * valle, pueden seguir usándola) — este adaptador solo cambia SU cuerpo.
 *
 * Adaptador puro (mismo contrato que los hermanos): traduce la API histórica
 * del avatar del agente (state 'idle'|'thinking'|'speaking'|'listening',
 * glow, withLabel, onClick/onDoubleClick) al `estado` que CompaiLamina
 * entiende. La lámina no tiene capa de husmeo/lip-sync propia (ver el
 * docstring de CompaiLamina — alcance mínimo ojos+cabeza+respiración), así
 * que el mapeo se acota a la familia de reacción (base/atenta/pensativa/
 * animada) que sí puede expresar.
 */
export default function ChagraAgentAvatarZariguya({
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
            tipo="zariguya"
            estado={state}
            size={size}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(255,158,203,0.65))' } : undefined}
        />
    );

    const contenido = withLabel ? (
        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {bicho}
            <span style={{ font: '600 0.7rem/1 system-ui, sans-serif', color: '#94a3b8' }}>
                Zarigüeya
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
