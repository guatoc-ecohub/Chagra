import ChivitoPunkLaminaViva from '../visual/creatures/ChivitoPunkLaminaViva';

/**
 * ChagraAgentAvatarChivitoPunk — el chivito de páramo punk (Oxypogon
 * guerinii) como CARA del agente de Chagra, 6ta opción del elenco unificado
 * (2026-08-14). Slug canónico `chivito-punk` (colapso `chivito`→`chivito-punk`
 * ya resuelto en `compai/nucleo/elenco.js`, #96 — un solo pájaro, no dos).
 *
 * RENDER CANÓNICO = LA LÁMINA-VIVA (2026-08-23). El cuerpo que se dibuja ahora
 * es `ChivitoPunkLaminaViva.jsx` (`visual/creatures/`): la lámina aprobada
 * (`chivito-punk.png` — cresta mohawk de puntas moradas, barba-gorguera verde,
 * pañoleta, lápiz alzado y libreta) recortada en capas por alfa y montada
 * sobre el MISMO sistema de vida del jaguar lámina-viva / la luciérnaga /
 * Angelita (`useVidaIdle`/`useRitmoPropio`/`useMiradaUsted`). Con esto el
 * MOOD punk (headbang `rockea` / `apunta` con el lápiz / `reposo`, del
 * repertorio `chivito-punk` en `vidaEstados.js`) al fin se VE en el selector —
 * antes este wrapper renderizaba el rig F24 vector (`ChivitoPunk.jsx`), que no
 * tiene ese idle-cerebro. Reemplaza al vector como cara del agente siguiendo
 * el MISMO patrón con que el jaguar, el oso del bastón y la zarigüeya trazada
 * cruzaron a la PWA (adaptador puro, cero lógica nueva de agente).
 *
 * `ChivitoPunk.jsx` (rig F24 vector) NO se borra: es el cuerpo 2.5D reusado
 * del valle (vía `arte-valle/chivito.rig.svg`) y conserva su test propio
 * (`ChivitoPunk.test.jsx`) verde sin tocarlo.
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarJaguar): traduce la API
 * histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) al contrato de
 * `ChivitoPunkLaminaViva` — que ya habla ese MISMO vocabulario por su prop
 * `estado` (OJO: `estado`, no `state`; el vector viejo usaba `state`). El
 * idle-cerebro del mood se activa solo con los defaults de la lámina
 * (`animated=true`, `tier` sin fijar → `activoVida` en idle): por eso el
 * wrapper NO fuerza `animated`/`tier`, para no apagar el repertorio. El
 * `visema` del lip-sync viaja igual que al resto del elenco.
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
        <ChivitoPunkLaminaViva
            estado={state}
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
    // lector de pantalla); sin handlers, solo el dibujo. (No se pasan
    // onClick/onDoubleClick a la lámina — el botón lo pone este wrapper, para
    // no anidar dos botones.)
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
