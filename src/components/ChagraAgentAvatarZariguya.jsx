import ZariguyaTrazado from '../visual/creatures/ZariguyaTrazado';

/**
 * ChagraAgentAvatarZariguya — la zarigüeya como CARA del agente de Chagra,
 * 3ra opción del elenco (operador 2026-07-25, tras `art(creatures): la
 * zarigüeya entra al elenco — con las crías al lomo (#2783)`).
 *
 * RENDER CANÓNICO = LA LÁMINA TRAZADA-RIGGEADA (2026-08-23). El cuerpo que se
 * dibuja ahora es `ZariguyaTrazado.jsx` (`visual/creatures/`): la lámina
 * aprobada AUTO-TRAZADA con vtracer y articulada sobre el esqueleto de huesos
 * por clip-regiones — no un vector redibujado a mano. Reemplaza al registro
 * rubber-hose vector (`Zariguya.jsx`, que sigue existiendo para el valle 3D,
 * el kart y su test propio) como cara del agente, siguiendo el MISMO patrón
 * con que el oso del bastón y el jaguar cruzaron a la PWA (adaptador puro,
 * cero lógica nueva de agente).
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarOsoBaston): traduce la
 * API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) al contrato de
 * `ZariguyaTrazado` — que ya habla ese MISMO vocabulario de estado
 * (idle/thinking/speaking/listening) por su `estado`, así que el mapeo es
 * directo (no hay traducción a pose/husmea como con el vector). El `visema`
 * del lip-sync viaja igual que al resto del elenco.
 *
 * OJO: existe otra zarigüeya en `dashboard/CriaturasNocturnas.jsx` (biopunk
 * oscuro/neón) — esa NO se usa aquí (mezclar registros es un error de diseño
 * ya señalado).
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
        <ZariguyaTrazado
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
