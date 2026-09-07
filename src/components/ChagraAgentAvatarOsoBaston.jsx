import OsoBaston from '../visual/creatures/OsoBaston';
import { useAngelitaPresencia, esPasivo } from '../visual/agente/useAngelitaPresencia';

/**
 * ChagraAgentAvatarOsoBaston — el oso del bastón (Tremarctos ornatus,
 * caminante de los Andes) como CARA del agente de Chagra, 5ta opción del
 * elenco.
 *
 * Cierra parte del ítem #8 del GAP compAI (2026-08-13): el oso del bastón ya
 * tenía cuerpo dibujado (`OsoBaston.jsx`, cruzó a la PWA el 2026-08-11) y ya
 * estaba marcado `enPWA:true` bajo el slug `oso-baston` en
 * `compai/nucleo/elenco.js` (#96) — pero ningún selector lo ofrecía. Este
 * adaptador es el que faltaba.
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarZariguya): traduce la
 * API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening'|'caminando', glow, withLabel, onClick/onDoubleClick) al
 * vocabulario de VIDA de `OsoBaston.jsx` (`visual/creatures/`). Cero lógica
 * nueva de agente, cero cambios en `visual/creatures/` — el ARTE aprobado del
 * oso (la lámina musculosa del caminante) NO se toca.
 *
 *   - idle       → pose 'anda' (base, plantado en su trocha).
 *   - thinking   → pose 'anda' + `resopla=true`: el huff pesado con vaho —
 *                  su reacción-firma leída como "atento/calculando".
 *   - speaking   → pose 'celebra' (el bastón late en flor) + visema.
 *   - listening  → pose 'reposo': se posa atento.
 *   - caminando  → pose 'camina': el ciclo de ANDAR plantígrado con bastón
 *                  (la marcha viva de la piel-lámina) — lo emite
 *                  CompaiOverlay cuando el compai deambula (useCompaiRoam).
 *
 * PRESENCIA (pedido operador 2026-08-24, transversal al elenco — mismo
 * contrato que ChagraAgentAvatarJaguar/Angelita): con `reaccionaPresencia` el
 * oso DESPIERTA a su estado natural (idle vivo: idle-cerebro `vida` ON, respira
 * hondo apoyado en el cayado) cuando la persona hace mouse over o toca la
 * pantalla, SIN pisar un estado activo real (thinking/speaking/listening/
 * caminando). ADITIVA: `reaccionaPresencia=false` (el default) deja el
 * adaptador idéntico a como estaba.
 */
const RESOPLA_DE_STATE = {
    thinking: true,
    pensando: true,
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

export default function ChagraAgentAvatarOsoBaston({
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
    // Paridad con el cuerpo canónico (mismos controles que el adaptador del
    // jaguar): el caminante honra reduced-motion (animated), la gama baja
    // (tier) y su idle-cerebro (vida), y no debe descartarlos donde el host
    // los cablee.
    animated = true,
    tier = undefined,
    clima = null,
    enso = 'neutro',
    direccion = 'derecha',
    reducedMotion = false,
    vida = true,
    'data-agt-estado': dataEstado = undefined,
    'data-pose': dataPose = undefined,
    'data-visema': dataVisema = undefined,
    // Presencia (pedido operador 2026-08-24, transversal al elenco): con
    // reaccionaPresencia el oso DESPIERTA a su estado natural (idle vivo) al
    // detectar presencia, sin pisar una actuación conversacional real. Mismo
    // contrato que ChagraAgentAvatarAngelita/Jaguar.
    reaccionaPresencia = true,
    ...atributosConducta
}) {
    const { despierta, handlers: handlersPresencia } = useAngelitaPresencia({
        activo: reaccionaPresencia,
    });
    // La presencia solo despierta cuando el estado es pasivo (idle): jamás
    // interrumpe una actuación conversacional ni la caminata. Despertar =
    // garantizar el idle-cerebro (vida) encendido sobre su pose base 'anda'.
    const estadoAgente = estado || ESTADO_DE_STATE[state] || 'acompana';
    const despiertaNatural = despierta && esPasivo(estadoAgente);
    const estadoEfectivo = despiertaNatural ? 'acompana' : estadoAgente;
    const resopla = !!RESOPLA_DE_STATE[estadoEfectivo];
    // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
    const visema = visemaRecibido ?? VISEMA_DE_STATE[state] ?? (estadoEfectivo === 'respondiendo' ? 'V2' : null);

    const bicho = (
        <OsoBaston
            estado={estadoEfectivo}
            resopla={resopla}
            visema={visema}
            size={size}
            animated={animated}
            clima={clima}
            enso={enso}
            direccion={direccion}
            reducedMotion={reducedMotion}
            tier={tier}
            vida={vida || despiertaNatural}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(67,194,79,0.65))' } : undefined}
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
                Oso del bastón
            </span>
        </span>
    ) : bicho;

    // Paridad con los avatares hermanos: con handlers, botón real (teclado +
    // lector de pantalla) que además capta la presencia por hover directo;
    // sin handlers, solo el dibujo (la presencia sigue viva por los listeners
    // de ventana de useAngelitaPresencia).
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
