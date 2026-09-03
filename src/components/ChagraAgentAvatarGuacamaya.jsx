import GuacamayaCompai from '../visual/creatures/GuacamayaCompai';
import { useAngelitaPresencia, esPasivo } from '../visual/agente/useAngelitaPresencia';

/**
 * ChagraAgentAvatarGuacamaya — la guacamaya bandera (Ara macao) como CARA del
 * agente de Chagra, 7ma opción del elenco unificado (2026-08-14).
 *
 * Cierra el ítem #8 del GAP compAI: la guacamaya no tenía cuerpo en la PWA
 * (`ELENCO.guacamaya.enPWA` seguía `false`); ahora lo tiene reusando el rig
 * F24 del valle (`visual/creatures/GuacamayaCompai.jsx`, ver ese archivo para
 * el detalle — rig+defs+css inlineados, NO redibujado a mano; el nombre NO
 * es `Guacamaya.jsx` porque ese archivo ya existía: el billboard decorativo
 * de `FaunaCalido.jsx`, otro dibujo, otro propósito).
 *
 * Adaptador puro (mismo contrato que los hermanos ChagraAgentAvatar*): traduce
 * la API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) al `state` que
 * `GuacamayaCompai.jsx` ya entiende directo (no necesita traducción de pose —
 * el rig reusado solo distingue idle/hablar por ahora, ver nota en ese
 * archivo).
 *
 * VISEMA (2026-08-21, "guacamaya = compai de agente completo"):
 * `GuacamayaCompai.jsx` dejó de hardcodear `data-visema` a partir de `state`
 * — ahora acepta un `visema` real (para el vocabulario rico, ver
 * `ChagraAgentAvatar.jsx`). Este adaptador angosto sigue produciendo un
 * visema razonable a partir de `state`, mismo patrón que
 * `ChagraAgentAvatarOsoBaston.jsx`/`ChagraAgentAvatarLuciernaga.jsx`
 * (`VISEMA_DE_STATE`): así el contrato observable narrow (state="speaking"
 * → data-visema) no cambia para quien ya lo usaba.
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

export default function ChagraAgentAvatarGuacamaya({
    state = 'idle',
    estado = undefined,
    visema: visemaProp = null,
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
}) {
    const { despierta, handlers: handlersPresencia } = useAngelitaPresencia({ activo: reaccionaPresencia });
    const estadoBase = estado || ESTADO_DE_STATE[state] || 'acompana';
    const estadoEfectivo = despierta && esPasivo(estadoBase) ? 'idle' : estadoBase;
    const visema = visemaProp ?? VISEMA_DE_STATE[estadoEfectivo] ?? null;
    const bicho = (
        <GuacamayaCompai
            state={state}
            estado={despierta && esPasivo(estadoBase) ? undefined : estadoBase}
            visema={visema}
            animated={animated}
            reducedMotion={reducedMotion}
            tier={dataTier || tier}
            clima={clima}
            enso={enso}
            direccion={direccion}
            size={size}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(224,36,32,0.65))' } : undefined}
            data-agt-estado={dataEstado || estadoBase}
            data-pose={dataPose}
            data-visema={dataVisema || visema || undefined}
            data-clima={dataClima}
        />
    );

    const contenido = withLabel ? (
        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {bicho}
            <span style={{ font: '600 0.7rem/1 system-ui, sans-serif', color: '#94a3b8' }}>
                Guacamaya
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
