import { Luciernaga } from '../visual/creatures/Luciernaga';
import { useAngelitaPresencia, esPasivo } from '../visual/agente/useAngelitaPresencia';

/**
 * ChagraAgentAvatarLuciernaga — la luciérnaga (cocuyo, Lampyridae) como CARA
 * del agente de Chagra, 6ta opción del elenco.
 *
 * Cierra parte del ítem #8 del GAP compAI (2026-08-13): la luciérnaga ya
 * tenía cuerpo dibujado (`Luciernaga.jsx`, cruzó a la PWA el 2026-08-11) y ya
 * estaba marcada `enPWA:true` en `compai/nucleo/elenco.js` (#96) — pero
 * ningún selector la ofrecía. Este adaptador es el que faltaba.
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarZariguya): traduce la
 * API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) al vocabulario de VIDA
 * de `Luciernaga.jsx` (`visual/creatures/`). Cero lógica nueva de agente,
 * cero cambios en `visual/creatures/`.
 *
 *   - idle       → pose 'vuela' (base, flota).
 *   - thinking   → pose 'vuela' + `eco='leer'`: la linterna pulsa atenta
 *                  mientras "lee la noche" — su reacción-firma científica
 *                  leída como "pensando".
 *   - speaking   → pose 'celebra' + visema del lip-sync.
 *   - listening  → pose 'reposo': se posa atenta.
 */
const POSE_DE_STATE = {
    idle: 'vuela',
    thinking: 'vuela',
    speaking: 'celebra',
    listening: 'reposo',
};

const ECO_DE_STATE = {
    thinking: 'leer',
};

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
    reaccionaPresencia = true,
}) {
    const { despierta, handlers: handlersPresencia } = useAngelitaPresencia({ activo: reaccionaPresencia });
    const estadoAgente = estado || ESTADO_DE_STATE[state] || 'acompana';
    const estadoEfectivo = despierta && esPasivo(estadoAgente) ? 'acompana' : estadoAgente;
    const pose = POSE_DE_STATE[estadoEfectivo] || 'vuela';
    const eco = ECO_DE_STATE[estadoEfectivo] || null;
    const visema = visemaRecibido ?? VISEMA_DE_STATE[estadoEfectivo] ?? null;

    const bicho = (
        <Luciernaga
            pose={pose}
            eco={eco}
            visema={visema}
            estado={estadoEfectivo}
            clima={clima}
            enso={enso}
            direccion={direccion}
            animated={animated}
            reducedMotion={reducedMotion}
            tier={tier}
            size={size}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(199,255,78,0.65))' } : undefined}
            data-agt-estado={dataEstado || estadoAgente}
            data-pose={dataPose || pose}
            data-visema={dataVisema || visema || undefined}
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
