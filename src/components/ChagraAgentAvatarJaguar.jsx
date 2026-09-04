import JaguarTrazado from '../visual/creatures/JaguarTrazado';
import { useAngelitaPresencia, esPasivo } from '../visual/agente/useAngelitaPresencia';

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
    respondiendo: 'V2',
};

const ESTADO_DE_STATE = {
    idle: 'acompana',
    // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
    thinking: 'pensando',
    // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
    speaking: 'respondiendo',
    listening: 'escuchando',
    caminando: 'caminando',
};

export default function ChagraAgentAvatarJaguar({
    state = 'idle',
    estado = undefined,
    visema: visemaRecibido = null,
    size = 48,
    withLabel = false,
    onClick = undefined,
    onDoubleClick = undefined,
    glow = false,
    className = '',
    ariaLabel = 'Chagra IA',
    // Paridad con el cuerpo canónico (mismos controles que el adaptador de
    // Angelita): el felino honra reduced-motion (animated) y la gama baja
    // (tier), y no debe descartarlos donde el host los cablea.
    animated = true,
    tier = undefined,
    clima = null,
    enso = 'neutro',
    direccion = 'derecha',
    reducedMotion = false,
    'data-agt-estado': dataEstado = undefined,
    'data-pose': dataPose = undefined,
    'data-visema': dataVisema = undefined,
    // Presencia (pedido operador 2026-08-24, transversal al elenco): con
    // reaccionaPresencia el jaguar DESPIERTA a su estado natural (idle vivo:
    // useVidaIdle 70/30 — acecha/ruge/reposo) cuando la persona hace mouse
    // over o toca la pantalla, sin pisar un estado activo real (thinking/
    // speaking/listening). Mismo contrato que ChagraAgentAvatarAngelita.
    reaccionaPresencia = true,
    ...atributosConducta
}) {
    const { despierta, handlers: handlersPresencia } = useAngelitaPresencia({
        activo: reaccionaPresencia,
    });
    // La presencia solo despierta cuando el estado es pasivo (idle): jamás
    // interrumpe una actuación conversacional. El jaguar ya está vivo en idle
    // (idle-cerebro), así que despertar = garantizar animated ON + su idle.
    const estadoAgente = estado || ESTADO_DE_STATE[state] || 'acompana';
    const despiertaNatural = despierta && esPasivo(estadoAgente);
    const estadoEfectivo = despiertaNatural ? 'acompana' : estadoAgente;
    const visema = visemaRecibido ?? VISEMA_DE_STATE[estadoEfectivo] ?? null;

    const bicho = (
        <JaguarTrazado
            estado={estadoEfectivo}
            visema={visema}
            size={size}
            animated={animated}
            clima={clima}
            enso={enso}
            direccion={direccion}
            reducedMotion={reducedMotion}
            tier={tier}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(168,85,247,0.65))' } : undefined}
            data-agt-estado={dataEstado || estadoAgente}
            data-pose={dataPose}
            data-visema={dataVisema || visema || undefined}
            {...atributosConducta}
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
                {...handlersPresencia}
            >
                {contenido}
            </button>
        );
    }
    return contenido;
}
