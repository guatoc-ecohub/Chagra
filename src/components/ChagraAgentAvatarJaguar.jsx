import JaguarTrazado from '../visual/creatures/JaguarTrazado';

/**
 * ChagraAgentAvatarJaguar — el jaguar (Panthera onca) como CARA del agente de
 * Chagra, 4ta opción del elenco (junto a Angelita, maíz y zarigüeya).
 *
 * Rama `feat/jaguar-trazado-agente` (2026-08-24): reemplaza la foto-lámina
 * (`JaguarLaminaViva`, la PNG recortada en capas — rechazada por el operador:
 * el pecho raster no aguanta el corte) por `JaguarTrazado` — la lámina
 * AUTO-TRAZADA a tinta (vectorizada con la receta trazar-lamina.sh, método
 * Humboldt+Cuphead aprobado) articulada por clip-regiones sobre el ESQUELETO
 * DE HUESOS de `JaguarHuesos`. Con ese rig el jaguar por fin CAMINA de
 * verdad (ciclo de cuadrúpedo en secuencia lateral, rodilla y zarpa
 * incluidas) y la cabeza gira sobre el atlas sin decapitarse.
 * `JaguarLaminaViva` NO se borra (otros consumidores pueden seguir usándolo);
 * solo el agente deja de usarlo.
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarZariguya): traduce la
 * API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening'|'caminando', glow, withLabel, onClick/onDoubleClick) al
 * contrato de `JaguarTrazado`, que ya canoniza esos cinco estados (y sus
 * sinónimos) en `ESTADO_CANON` y les da pose/cadencia propia en
 * `jaguarHuesos.css`. `state` viaja como `estado` y queda expuesto en
 * `data-agt-estado` (paridad de API / accesibilidad).
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
        <JaguarTrazado
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
    // lector de pantalla) que envuelve TODO el contenido (dibujo + rótulo);
    // sin handlers, solo el dibujo.
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
