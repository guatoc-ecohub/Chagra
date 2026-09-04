import ChivitoTrazado from '../visual/creatures/ChivitoTrazado.jsx';
import { useAngelitaPresencia, esPasivo } from '../visual/agente/useAngelitaPresencia';

/**
 * ChagraAgentAvatarChivitoPunk — el chivito de páramo (Oxypogon guerinii)
 * como CARA del agente de Chagra, 6ta opción del elenco unificado
 * (2026-08-14). Slug canónico `chivito-punk` (colapso `chivito`→`chivito-punk`
 * ya resuelto en `compai/nucleo/elenco.js`, #96 — un solo pájaro, no dos).
 *
 * Cierra el ítem #8 del GAP compAI: el chivito no tenía cuerpo en la PWA
 * (`ELENCO['chivito-punk'].enPWA` seguía `false`); ahora lo tiene reusando el
 * tinta Trazado (`visual/creatures/ChivitoTrazado.jsx`, ver ese archivo).
 *
 * Adaptador puro (mismo contrato que los hermanos ChagraAgentAvatar*): traduce
 * la API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) al `state` que
 * `ChivitoTrazado.jsx` mantiene la piel normal en reposo y activa la variante
 * punk solo durante la actuación.
 */
export default function ChagraAgentAvatarChivitoPunk({
    state = 'idle',
    estado = undefined,
    visema = null,
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
    reaccionaPresencia = true,
    'data-agt-estado': dataEstado = undefined,
    'data-pose': dataPose = undefined,
    'data-visema': dataVisema = undefined,
    'data-clima': dataClima = undefined,
    'data-tier': dataTier = undefined,
    // Contrato DOM del elenco (CompaiP1.contract): el rig debe exponer
    // data-agt-especie y data-creature para TODAS las especies. CompaiAgente
    // los entrega por propsDelAdaptador; sin reenviarlos aquí el chivito
    // queda sin especie en su nodo raíz (regresión detectada en dev rojo).
    'data-agt-especie': dataEspecie = undefined,
    'data-creature': dataCreature = undefined,
}) {
    const { despierta, handlers: handlersPresencia } = useAngelitaPresencia({ activo: reaccionaPresencia });
    const estadoAgente = estado || state;
    const estadoEfectivo = despierta && esPasivo(estadoAgente) ? 'idle' : state;
    // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
    const estaActuando = ['speaking', 'respondiendo', 'hablando', 'actuando', 'invita', 'celebra'].includes(estadoAgente);
    const visemaEfectivo = dataVisema || visema || (estaActuando ? 'V2' : undefined);
    const bicho = (
        <ChivitoTrazado
            size={size}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(140,70,232,0.65))' } : undefined}
            animated={animated}
            punk
            actuando={estaActuando}
            modo={estaActuando ? 'actuando' : 'normal'}
            data-agt-estado={dataEstado || estadoAgente}
            data-estado={estadoEfectivo}
            data-pose={dataPose || undefined}
            data-visema={visemaEfectivo}
            data-clima={dataClima || clima || undefined}
            data-tier={dataTier || tier}
            data-enso={enso}
            data-direccion={direccion}
            data-reduced-motion={reducedMotion ? 'true' : undefined}
            // Spread CONDICIONAL: si llegan undefined (montado directo, sin
            // CompaiAgente) NO deben pisar el data-creature fijo del Trazado
            // (un spread undefined en JSX borra el atributo explícito previo).
            {...(dataEspecie ? { 'data-agt-especie': dataEspecie } : {})}
            {...(dataCreature ? { 'data-creature': dataCreature } : {})}
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
                {...handlersPresencia}
            >
                {contenido}
            </button>
        );
    }
    return contenido;
}
