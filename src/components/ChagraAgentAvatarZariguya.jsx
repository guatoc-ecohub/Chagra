import ZariguyaLaminaViva from '../visual/creatures/ZariguyaLaminaViva';

/**
 * ChagraAgentAvatarZariguya — la zarigüeya (chucha / fara / runcho, Didelphis)
 * como CARA del agente de Chagra, 3ra opción junto a Angelita y el resto del
 * elenco (operador 2026-07-25).
 *
 * CARA = LA LÁMINA VIVA (supersede el PR #2984). El operador aprobó la lámina
 * recortada por alfa (`ZariguyaLaminaViva`, PR #2984) sobre el auto-trazado
 * vtracer —"cuando se integraban las láminas recortadas al menos se veían muy
 * bien integradas"— pero el rig quedó TIESO: al deambular se veía como una
 * "María Antonieta" (la cargaban, no andaba). Esta versión conserva EXACTA la
 * piel de la lámina y arregla el MOVIMIENTO: al caminar bambolea plantígrado
 * de verdad (rock de peso pie-a-pie + bob + cadera; ver `ZariguyaLaminaViva`
 * / `zariguyaLamina.css`), y en idle late un BOIL menudo para no quedar como
 * un témpano. El vector `Zariguya.jsx` se conserva intacto (valle 3D + kart +
 * sus tests) — ESTE adaptador ya no lo usa.
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarJaguar/OsoBaston): la
 * API histórica del avatar del agente (`state` 'idle'|'thinking'|'speaking'|
 * 'listening' — o 'caminando' cuando deambula, que el overlay pasa; glow,
 * withLabel, onClick/onDoubleClick) viaja a `ZariguyaLaminaViva` como `estado`
 * (crudo, para paridad de API/accesibilidad y para que el rig decida el
 * comportamiento). `speaking` además arma el visema del lip-sync sobre su
 * sonrisa abierta.
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
