import ZariguyaLaminaViva from '../visual/creatures/ZariguyaLaminaViva';

/**
 * ChagraAgentAvatarZariguya — la zarigüeya como CARA del agente de Chagra,
 * 3ra opción del elenco (operador 2026-07-25, tras `art(creatures): la
 * zarigüeya entra al elenco — con las crías al lomo (#2783)`).
 *
 * RENDER CANÓNICO = LA LÁMINA RECORTADA POR ALFA (`ZariguyaLaminaViva.jsx`):
 * la pintura aprobada (`zariguya.png`, estilo grabado) cortada en capas por
 * canal alfa y montada sobre el rig con la vida de Angelita — la MISMA técnica
 * "recortada" que el operador validó como "muy bien integrada" (feedback
 * 2026-08-23). Reemplaza al vector rubber-hose (`Zariguya.jsx`, que se
 * conserva para el valle 3D y el kart) como cara del agente, siguiendo el
 * patrón con que el jaguar y el oso del bastón cruzaron a la PWA.
 *
 * Por qué NO el auto-trazado vtracer: se probó (`ZariguyaTrazado`) y en vivo
 * posterizaba la pintura en astillas, con el contorno escalonado y huecos en
 * los bigotes ("no se ve limpia", operador 2026-08-23). El alpha-cut preserva
 * los píxeles de la lámina intactos y articula la mandíbula (lip-sync), la
 * cola prensil y las orejas — cero pérdida.
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarOsoBaston): traduce la
 * API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) al contrato de
 * `ZariguyaLaminaViva` — que ya habla ese MISMO vocabulario por su `estado`,
 * así que el mapeo es directo. El `visema` del lip-sync viaja igual que al
 * resto del elenco.
 */
const VISEMA_DE_STATE = {
    speaking: 'V2',
};

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
    const visema = VISEMA_DE_STATE[state] || null;

    const bicho = (
        <ZariguyaLaminaViva
            estado={state}
            visema={visema}
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
