import LuciernagaLaminaViva from '../visual/creatures/LuciernagaLaminaViva';

/**
 * ChagraAgentAvatarLuciernaga — la luciérnaga (cocuyo, Lampyridae) como CARA
 * del agente de Chagra, 6ta opción del elenco.
 *
 * Rama `feat/luciernaga-lamina-viva`: reemplaza el cuerpo vector
 * (`Luciernaga.jsx`, rubber-hose dibujado a mano) por `LuciernagaLaminaViva`
 * — la lámina APROBADA (`luciernaga.png`: guantes, botas, cuaderno, lápiz y
 * la linterna encendida) recortada en capas por alfa y montada sobre el
 * mismo sistema de vida del jaguar lámina-viva y de Angelita. Ver el
 * docstring de `LuciernagaLaminaViva.jsx` para el detalle de la fusión
 * piel+rig y los límites honestos. `Luciernaga.jsx` NO se borra (otros
 * consumidores —catálogo, valle— pueden seguir usándolo), igual que
 * `Jaguar.jsx` cuando el jaguar pasó a lámina-viva.
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarJaguar): traduce la
 * API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) al contrato de
 * `LuciernagaLaminaViva`. El `state` viaja directo como `estado` (el CSS
 * del rig reacciona por data-agt-estado: escuchando para las antenas,
 * hablando mueve el mentón, pensando lee con la luz); `thinking` conserva
 * además la firma científica `eco='leer'` que ya usaba este adaptador con
 * el cuerpo vector.
 */
const ECO_DE_STATE = {
    thinking: 'leer',
};

const VISEMA_DE_STATE = {
    speaking: 'V2',
};

export default function ChagraAgentAvatarLuciernaga({
    state = 'idle',
    size = 48,
    withLabel = false,
    onClick = undefined,
    onDoubleClick = undefined,
    glow = false,
    className = '',
    ariaLabel = 'Chagra IA',
}) {
    const eco = ECO_DE_STATE[state] || null;
    const visema = VISEMA_DE_STATE[state] || null;

    const bicho = (
        <LuciernagaLaminaViva
            estado={state}
            eco={eco}
            visema={visema}
            size={size}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(199,255,78,0.65))' } : undefined}
        />
    );

    const contenido = withLabel ? (
        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {bicho}
            <span style={{ font: '600 0.7rem/1 system-ui, sans-serif', color: '#94a3b8' }}>
                Luciérnaga
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
