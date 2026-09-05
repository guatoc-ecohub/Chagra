import LuciernagaTrazado from '../visual/creatures/LuciernagaTrazado.jsx';
import { useAngelitaPresencia, esPasivo } from '../visual/agente/useAngelitaPresencia';

/**
 * ChagraAgentAvatarLuciernaga — la luciérnaga (cocuyo, Lampyridae) como CARA
 * del agente de Chagra, 6ta opción del elenco.
 *
 * Cierra parte del ítem #8 del GAP compAI (2026-08-13): la luciérnaga ya
 * tiene cuerpo dibujado (`LuciernagaTrazado.jsx`, cruzó a la PWA el 2026-08-11) y ya
 * estaba marcada `enPWA:true` en `compai/nucleo/elenco.js` (#96) — pero
 * ningún selector la ofrecía. Este adaptador es el que faltaba.
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarZariguya): traduce la
 * API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) a la tinta Trazado de
 * `LuciernagaTrazado.jsx`. Cero lógica nueva de agente.
 *
 *   - idle/listening → linterna normal.
 *   - thinking/speaking → linterna fuerte.
 */
const ESTADO_DE_STATE = {
    idle: 'acompana',
    // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
    thinking: 'pensando',
    // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
    speaking: 'respondiendo',
    listening: 'escuchando',
    caminando: 'caminando',
};

/* eslint-disable chagra-i18n/no-hardcoded-spanish */
const ESTADOS_LINTERNA_FUERTE = new Set([
    'thinking', 'pensando', 'speaking', 'respondiendo', 'hablando', 'actuando',
]);
/* eslint-enable chagra-i18n/no-hardcoded-spanish */

export default function ChagraAgentAvatarLuciernaga({
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
    animated = true,
    tier = undefined,
    clima = null,
    enso = 'neutro',
    direccion = 'derecha',
    reducedMotion = false,
    'data-agt-estado': dataEstado = undefined,
    'data-pose': dataPose = undefined,
    'data-visema': dataVisema = undefined,
    // Contrato DOM del elenco (CompaiP1.contract): el rig debe exponer
    // data-agt-especie y data-creature para TODAS las especies. CompaiAgente
    // los entrega por propsDelAdaptador; sin reenviarlos aquí la luciérnaga
    // queda sin especie en su nodo raíz (regresión detectada en dev rojo).
    'data-agt-especie': dataEspecie = undefined,
    'data-creature': dataCreature = undefined,
    reaccionaPresencia = true,
    ...atributosConducta
}) {
    const { despierta, handlers: handlersPresencia } = useAngelitaPresencia({ activo: reaccionaPresencia });
    const estadoAgente = estado || ESTADO_DE_STATE[state] || 'acompana';
    const estadoEfectivo = despierta && esPasivo(estadoAgente) ? 'acompana' : estadoAgente;
    const linterna = ESTADOS_LINTERNA_FUERTE.has(estadoEfectivo) ? 'fuerte' : 'normal';
    const visema = visemaRecibido || (ESTADOS_LINTERNA_FUERTE.has(estadoEfectivo) ? 'V2' : undefined);

    const bicho = (
        <LuciernagaTrazado
            animated={animated && !reducedMotion}
            size={size}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(199,255,78,0.65))' } : undefined}
            linterna={linterna}
            data-agt-estado={dataEstado || estadoAgente}
            data-estado={estadoEfectivo}
            data-pose={dataPose || undefined}
            data-visema={dataVisema || visema}
            data-clima={clima || undefined}
            data-tier={tier || undefined}
            data-enso={enso}
            data-direccion={direccion}
            // Spread CONDICIONAL: si llegan undefined (montado directo, sin
            // CompaiAgente) NO deben pisar el data-creature fijo del Trazado
            // (un spread undefined en JSX borra el atributo explícito previo).
            {...(dataEspecie ? { 'data-agt-especie': dataEspecie } : {})}
            {...(dataCreature ? { 'data-creature': dataCreature } : {})}
            {...atributosConducta}
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
                {...handlersPresencia}
            >
                {contenido}
            </button>
        );
    }
    return contenido;
}
