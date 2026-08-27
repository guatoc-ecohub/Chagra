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
 * BUG FIX #fix-guacamaya-vuela: la guacamaya es VOLADORA, NO camina.
 * Si por error se le pasa state='caminando', se traduce explícitamente a 'idle'.
 * Esto excluye a la guacamaya del estado caminando que reciben jaguar/oso-baston/
 * zariguya en CompaiOverlay (CON_MARCHA). La guacamaya solo debe VUELE.
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
};

/* BUG FIX #fix-guacamaya-vuela: la guacamaya VUELA, no camina.
   Si por error llega state='caminando', traducirlo a 'idle'. */
const STATE_NORMALIZADO = {
    caminando: 'idle', // La guacamaya es voladora, excluida de CON_MARCHA
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
    reaccionaPresencia = true,
}) {
    const { despierta, handlers: handlersPresencia } = useAngelitaPresencia({ activo: reaccionaPresencia });
    // BUG FIX #fix-guacamaya-vuela: normalizar 'caminando' a 'idle' (la guacamaya vuela)
    const stateNormalizado = STATE_NORMALIZADO[state] || state;
    const estadoBase = estado || stateNormalizado;
    const estadoEfectivo = despierta && esPasivo(estadoBase) ? 'idle' : estadoBase;
    const visema = visemaProp || VISEMA_DE_STATE[estadoEfectivo] || null;
    const bicho = (
        <GuacamayaCompai
            state={estadoEfectivo}
            estado={despierta && esPasivo(estadoBase) ? undefined : estado}
            visema={visema}
            size={size}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(224,36,32,0.65))' } : undefined}
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
