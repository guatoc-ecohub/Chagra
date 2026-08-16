import JaguarLaminaViva from '../visual/creatures/JaguarLaminaViva';

/**
 * ChagraAgentAvatarJaguar — el jaguar (Panthera onca) como CARA del agente de
 * Chagra, 4ta opción del elenco (junto a Angelita, maíz y zarigüeya).
 *
 * Rama `feat/jaguar-lamina-sobre-esqueleto` (2026-08-14): reemplaza el
 * cuerpo vector (`Jaguar.jsx`, rubber-hose dibujado a mano) por
 * `JaguarLaminaViva` — la lámina Humboldt REAL (`jaguar-natural.png`)
 * recortada en capas y montada sobre las transformaciones REALES del rig
 * `~/demos/3d/compai/rigs/jaguar.rig.svg`+`jaguar.css`. Ver el docstring de
 * `JaguarLaminaViva.jsx` para el detalle de la fusión piel+esqueleto y lo
 * que quedó fuera de alcance. `Jaguar.jsx` NO se borra (otros consumidores
 * —p.ej. paisaje del miedo del valle— pueden seguir usándolo).
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarZariguya): traduce la
 * API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) al contrato de
 * `JaguarLaminaViva`. El rig de perfil (`#jaguarLado` en jaguar.css) NO
 * tiene variantes por estado — solo define la pose de marcha — así que acá
 * `state` viaja como `data-agt-estado` (paridad de API / accesibilidad) sin
 * cambiar la pose: inventar una reacción por estado sería agregar un
 * transform que no existe en el rig real, y el SPEC de esta rama es ceñirse
 * a los que SÍ existen.
 */
const VISEMA_DE_STATE = {
    speaking: 'V2',
};

export default function ChagraAgentAvatarJaguar({
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
        <JaguarLaminaViva
            estado={state}
            visema={visema}
            size={size}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(168,85,247,0.65))' } : undefined}
        />
    );

    const contenido = withLabel ? (
        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {bicho}
            <span style={{ font: '600 0.7rem/1 system-ui, sans-serif', color: '#94a3b8' }}>
                Jaguar
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
