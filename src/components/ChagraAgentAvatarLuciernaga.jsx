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
 * Nivel-jaguar (2026-08-25): agrega presencia (useAngelitaPresencia) y soporte
 * completo de estados del contrato del agente (incluyendo 'caminando' para roam).
 * Mismo patrón que ChagraAgentAvatarJaguar y ChagraAgentAvatarAngelita.
 *
 * Adaptador puro: traduce la API histórica del avatar del agente
 * (state 'idle'|'thinking'|'speaking'|'listening'|'caminando', glow,
 * withLabel, onClick/onDoubleClick) al vocabulario de VIDA de `Luciernaga.jsx`
 * (`visual/creatures/`). Cero lógica nueva de agente, cero cambios en
 * `visual/creatures/`.
 *
 *   - idle           → pose 'vuela' (base, flota).
 *   - thinking       → pose 'vuela' + `eco='leer'`: la linterna pulsa atenta
 *                      mientras "lee la noche" — su reacción-firma científica
 *                      leída como "pensando".
 *   - speaking       → pose 'celebra' + visema del lip-sync.
 *   - listening      → pose 'reposo': se posa atenta.
 *   - caminando      → pose 'vuela' + animated para el roam.
 *
 * Español de Colombia (usted), sin voseo. SVG + CSS: liviano, sin three.
 */

/* API histórica → poses de Luciernaga.jsx. Un state desconocido cae a 'vuela'
   (el estado default). */
const POSE_DE_STATE = {
    idle: 'vuela',
    thinking: 'vuela',
    speaking: 'celebra',
    listening: 'reposo',
    caminando: 'vuela',
};

const ECO_DE_STATE = {
    thinking: 'leer',
};

const VISEMA_DE_STATE = {
    speaking: 'V2',
};

export default function ChagraAgentAvatarLuciernaga({
    state = 'idle',
    estado = undefined,
    size = 48,
    withLabel = false,
    onClick = undefined,
    onDoubleClick = undefined,
    glow = false,
    className = '',
    ariaLabel = 'Chagra IA',
    // Paridad con el cuerpo canónico (mismos controles que el adaptador de
    // Angelita): el bicho honra reduced-motion (animated) y la gama baja
    // (tier), y no debe descartarlos donde el host los cablea.
    animated = true,
    tier = undefined,
    // Extras de Luciernaga.jsx:
    visema = null,
    eco = null,
    energia = 1,
    clima = null,
    enso = 'neutro',
    animo = 'sereno',
    lineBoil = false,
    poder = false,
    vida = true,
    // Presencia (pedido operador 2026-08-24, transversal al elenco): con
    // reaccionaPresencia la luciérnaga DESPIERTA a su estado natural (idle vivo:
    // useVidaIdle — destella/lee/reposo) cuando la persona hace mouse over o
    // toca la pantalla, sin pisar un estado activo real (thinking/speaking/
    // listening). Mismo contrato que ChagraAgentAvatarAngelita y
    // ChagraAgentAvatarJaguar.
    reaccionaPresencia = false,
    ...rest
}) {
    // `estado` es el contrato rico; `state` conserva compatibilidad con los
    // call-sites históricos del avatar.
    const estadoCanonico = estado || state || 'idle';
    const { despierta, handlers: handlersPresencia } = useAngelitaPresencia({
        activo: reaccionaPresencia,
    });
    // La presencia solo despierta cuando el estado es pasivo (idle): jamás
    // interrumpe una actuación conversacional. La luciérnaga ya está viva en
    // idle (useVidaIdle), así que despertar = garantizar animated ON + su idle.
    const despiertaNatural = despierta && esPasivo(estadoCanonico);
    const estadoEfectivo = despiertaNatural ? 'idle' : estadoCanonico;

    const pose = POSE_DE_STATE[estadoEfectivo] || 'vuela';
    const ecoFx = eco || ECO_DE_STATE[estadoEfectivo] || null;
    const visemaFx = visema || VISEMA_DE_STATE[estadoEfectivo] || null;

    const bicho = (
        <Luciernaga
            pose={pose}
            eco={ecoFx}
            visema={visemaFx}
            tier={tier}
            size={size}
            animated={animated}
            energia={energia}
            clima={clima}
            enso={enso}
            animo={animo}
            lineBoil={lineBoil}
            poder={poder}
            vida={vida || despiertaNatural}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(199,255,78,0.65))' } : undefined}
            {...rest}
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
