import OsoBastonLaminaViva from '../visual/creatures/OsoBastonLaminaViva';

/**
 * ChagraAgentAvatarOsoBaston — el oso del bastón (Tremarctos ornatus,
 * caminante de los Andes) como CARA del agente de Chagra, 5ta opción del
 * elenco.
 *
 * Rama `feat/oso-lamina-viva` (2026-08-18): reemplaza el cuerpo vector
 * (`OsoBaston.jsx`, rubber-hose dibujado a mano) por `OsoBastonLaminaViva` —
 * la lámina real aprobada (`oso.png`: erguido sobre su roca, brazo en jarra,
 * el bastón coronado de frailejón y orquídeas) recortada en capas por alfa y
 * montada sobre el rig con la vida de Angelita. El MISMO trasplante que hizo
 * el jaguar (`ChagraAgentAvatarJaguar` → `JaguarLaminaViva`, rama
 * `feat/jaguar-lamina-sobre-esqueleto`). `OsoBaston.jsx` NO se borra (otros
 * consumidores —compaiRegistry del mundo 3D, escenas— siguen usándolo).
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarJaguar): traduce la
 * API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) al contrato de
 * `OsoBastonLaminaViva`. `state` viaja directo como `estado` (la lámina viva
 * entiende el vocabulario completo, incluido 'caminando' del overlay):
 * escuchando PARA LAS OREJAS, hablando mueve la mandíbula con el visema,
 * pensando mira arriba, e idle vive solo (florece/resopla/reposo).
 */
const VISEMA_DE_STATE = {
    speaking: 'V2',
};

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
    const visema = VISEMA_DE_STATE[state] || null;

    const bicho = (
        <OsoBastonLaminaViva
            estado={state}
            visema={visema}
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
