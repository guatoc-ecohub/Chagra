import OsoBaston from '../visual/creatures/OsoBaston';

/**
 * ChagraAgentAvatarOsoBaston — el oso del bastón (Tremarctos ornatus,
 * caminante de los Andes) como CARA del agente de Chagra, 5ta opción del
 * elenco.
 *
 * Cierra parte del ítem #8 del GAP compAI (2026-08-13): el oso del bastón ya
 * tenía cuerpo dibujado (`OsoBaston.jsx`, cruzó a la PWA el 2026-08-11) y ya
 * estaba marcado `enPWA:true` bajo el slug `oso-baston` en
 * `compai/nucleo/elenco.js` (#96) — pero ningún selector lo ofrecía. Este
 * adaptador es el que faltaba.
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarZariguya): traduce la
 * API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) al vocabulario de VIDA
 * de `OsoBaston.jsx` (`visual/creatures/`). Cero lógica nueva de agente, cero
 * cambios en `visual/creatures/`.
 *
 *   - idle       → pose 'anda' (base, plantado en su trocha).
 *   - thinking   → pose 'anda' + `resopla=true`: el huff pesado con vaho —
 *                  su reacción-firma leída como "atento/calculando".
 *   - speaking   → pose 'celebra' (el bastón late en flor) + visema.
 *   - listening  → pose 'reposo': se posa atento.
 *   - caminando  → pose 'camina': el ciclo de ANDAR plantígrado con bastón
 *                  (la marcha viva de la piel-lámina) — lo emite
 *                  CompaiOverlay cuando el compai deambula (useCompaiRoam).
 */
const POSE_DE_STATE = {
    idle: 'anda',
    thinking: 'anda',
    speaking: 'celebra',
    listening: 'reposo',
    caminando: 'camina',
};

const RESOPLA_DE_STATE = {
    thinking: true,
};

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
    const pose = POSE_DE_STATE[state] || 'anda';
    const resopla = !!RESOPLA_DE_STATE[state];
    const visema = VISEMA_DE_STATE[state] || null;

    const bicho = (
        <OsoBaston
            pose={pose}
            resopla={resopla}
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
