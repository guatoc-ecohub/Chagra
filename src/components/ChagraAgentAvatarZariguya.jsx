import ZariguyaTrazado from '../visual/creatures/ZariguyaTrazado';
import { useAngelitaPresencia, esPasivo } from '../visual/agente/useAngelitaPresencia';

/**
 * ChagraAgentAvatarZariguya — la zarigüeya como CARA del agente de Chagra,
 * 3ra opción junto a Angelita y el maíz (operador 2026-07-25).
 *
 * Arte aprobado por el SSOT: `ZariguyaTrazado` (FASE 1 2026-08-26, la lámina
 * Gemini hero calcada raster sobre el esqueleto de clip-regiones — la MISMA
 * zarigüeya del elenco `CREATURES.zariguya`, del selector y del valle) MÁS
 * las poses plenas del set por estado (FASE 2: escucha ×4, ver-lupa, muerta,
 * cute, crías — cada una SU lámina Gemini con gate de juez visión). El
 * comportamiento común decide cuándo se mueve y aparece, nunca cambia este
 * arte por una piel alternativa.
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarJaguar/OsoBaston):
 * traduce la API histórica del avatar del agente (state 'idle'|'thinking'|
 * 'speaking'|'listening'|'caminando', glow, withLabel, onClick/onDoubleClick)
 * al contrato de `ZariguyaTrazado`, que ya canoniza esos estados y sus
 * sinónimos en `ESTADO_CANON` y les da pose/cadencia propia en
 * `zariguyaTrazado/`. `state` viaja como `estado` y queda
 * expuesto en `data-agt-estado` (paridad de API / accesibilidad).
 *
 * PRESENCIA (pedido operador 2026-08-24, transversal al elenco — mismo
 * contrato que ChagraAgentAvatarJaguar/Angelita): con `reaccionaPresencia` la
 * chucha DESPIERTA a su estado natural (idle vivo: su idle-cerebro husmea/
 * tanatosis/reposo) cuando la persona hace mouse over o toca la pantalla, SIN
 * pisar un estado activo real (thinking/speaking/listening/caminando).
 * ADITIVA: `reaccionaPresencia=false` (el default) deja el adaptador idéntico.
 */
const VISEMA_DE_STATE = {
    speaking: 'V2',
};

export default function ChagraAgentAvatarZariguya({
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
    // jaguar): la chucha honra reduced-motion (animated) y la gama baja
    // (tier), y no debe descartarlos donde el host los cablee.
    animated = true,
    tier = undefined,
    'data-agt-estado': dataEstado = undefined,
    'data-pose': dataPose = undefined,
    'data-visema': dataVisema = undefined,
    // Presencia (pedido operador 2026-08-24, transversal al elenco): con
    // reaccionaPresencia la zarigüeya DESPIERTA a su idle vivo al detectar
    // presencia, sin pisar una actuación conversacional real. Mismo contrato
    // que ChagraAgentAvatarAngelita/Jaguar.
    reaccionaPresencia = true,
}) {
    const { despierta, handlers: handlersPresencia } = useAngelitaPresencia({
        activo: reaccionaPresencia,
    });
    // La presencia solo despierta cuando el estado es pasivo (idle): jamás
    // interrumpe una actuación conversacional ni la caminata. La zarigüeya ya
    // vive en idle (idle-cerebro), así que despertar = garantizar su idle.
    const estadoAgente = estado || state;
    const despiertaNatural = despierta && esPasivo(estadoAgente);
    const estadoEfectivo = despiertaNatural ? 'idle' : state;
    const visema = visemaRecibido ?? VISEMA_DE_STATE[estadoEfectivo] ?? null;

    const bicho = (
        <ZariguyaTrazado
            estado={estadoEfectivo}
            visema={visema}
            size={size}
            animated={animated}
            tier={tier}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(255,158,203,0.65))' } : undefined}
            data-agt-estado={dataEstado || estadoAgente}
            data-pose={dataPose}
            data-visema={dataVisema || visema || undefined}
        />
    );

    const contenido = withLabel ? (
        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {bicho}
            <span style={{ font: '600 0.7rem/1 system-ui, sans-serif', color: '#94a3b8' }}>
                Zarigüeya
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
