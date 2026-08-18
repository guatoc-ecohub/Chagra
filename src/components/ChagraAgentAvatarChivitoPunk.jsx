import ChivitoPunkLaminaViva from '../visual/creatures/ChivitoPunkLaminaViva';

/**
 * ChagraAgentAvatarChivitoPunk — el chivito de páramo (Oxypogon guerinii)
 * versión punk como CARA del agente de Chagra, del elenco unificado
 * (2026-08-14). Slug canónico `chivito-punk` (colapso `chivito`→`chivito-punk`
 * ya resuelto en `compai/nucleo/elenco.js`, #96 — un solo pájaro, no dos).
 *
 * Rama `feat/chivito-punk-lamina-viva` (quinta del lote lámina-viva):
 * reemplaza el cuerpo del rig F24 del valle (`ChivitoPunk.jsx`, SVG reusado)
 * por `ChivitoPunkLaminaViva` — la lámina APROBADA (`chivito-punk.png`: la
 * cresta mohawk de puntas moradas, la barba-gorguera, el lápiz alzado y la
 * libreta) recortada en capas por alfa y montada sobre el mismo sistema de
 * vida del jaguar lámina-viva, la luciérnaga y Angelita. Ver el docstring de
 * `ChivitoPunkLaminaViva.jsx` para el detalle de la fusión piel+rig y los
 * límites honestos. `ChivitoPunk.jsx` NO se borra (otros consumidores del
 * valle pueden seguir usándolo), igual que `Jaguar.jsx` y `Luciernaga.jsx`
 * cuando sus especies pasaron a lámina-viva.
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarJaguar): traduce la
 * API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) al contrato de
 * `ChivitoPunkLaminaViva`. El `state` viaja directo como `estado` (el CSS
 * del rig reacciona por data-agt-estado: escuchando ladea la testa,
 * hablando abre el pico en tijera, pensando golpetea el lápiz).
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
