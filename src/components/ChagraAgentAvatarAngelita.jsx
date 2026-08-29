import Angelita from '../visual/agente/Angelita';
import { useAngelitaPresencia, esPasivo } from '../visual/agente/useAngelitaPresencia';

/**
 * ChagraAgentAvatarAngelita — Angelita (la abeja angelita, Tetragonisca
 * angustula) como CARA del agente de Chagra en todos los call-sites del
 * avatar (FAB, chat, header, hero).
 *
 * Decisión del operador (2026-07-16): "Angelita como el agente, jubila el
 * colibrí". El colibrí NO desaparece del código — sigue de decoración
 * (polinizador en los mundos 3D, `colibri_svg` como preferencia explícita) —
 * pero deja de ser el asistente.
 *
 * Adaptador puro: traduce la API histórica del avatar del agente
 * (state 'idle'|'thinking'|'speaking'|'listening', glow, withLabel,
 * onClick/onDoubleClick) al vocabulario de estados de Angelita
 * (angelitaEstados.js). Cero lógica nueva de agente.
 *
 * Español de Colombia (usted), sin voseo. SVG + CSS: liviano, sin three.
 */

/* API histórica → estados conversacionales de Angelita. Un state desconocido
   cae a 'acompana' (estadoCanonico ya es tolerante, esto solo documenta). */
const ESTADO_DE_STATE = {
    idle: 'acompana',
    // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
    thinking: 'pensando',
    // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
    speaking: 'respondiendo',
    listening: 'escuchando',
};

export default function ChagraAgentAvatarAngelita({
    state = 'idle',
    estado = undefined,
    size = 48,
    withLabel = false,
    onClick = undefined,
    onDoubleClick = undefined,
    glow = false,
    className = '',
    ariaLabel = 'Chagra IA',
    // Extras que solo Angelita entiende (los avatares hermanos los ignoran):
    // visema 'V1'..'V4' de useLipSync (lip-sync al hablar) y confianza del
    // modo científico (0..1 o 'alta'|'media'|'baja' → anillo de certeza).
    visema = null,
    confianza = null,
    // Props del cuerpo canónico. El adaptador histórico no debe descartar
    // estos controles: selector, FAB, chat y galería tienen que ver la misma
    // Angelita viva, incluidos rubber-hose, lip-sync y reduced-motion.
    direccion = 'derecha',
    animated = true,
    tier = undefined,
    clima = null,
    enso = 'neutro',
    animo = undefined,
    energia = 1,
    mundoId = null,
    lineBoil = false,
    idleCerebro = true,
    gafas = false,
    cejas = undefined,
    title = undefined,
    'data-agt-estado': dataEstado = undefined,
    'data-pose': dataPose = undefined,
    'data-visema': dataVisema = undefined,
    // Presencia (pedido operador 2026-08-24): con reaccionaPresencia, Angelita
    // se mueve a su estado natural (idle vivo 'acompana') cuando la persona
    // hace mouse over o toca la pantalla — sin pisar un estado activo real.
    reaccionaPresencia = true,
    ...rest
}) {
    // `estado` es el contrato rico de Angelita; `state` conserva compatibilidad
    // con los call-sites históricos del avatar.
    const estadoCanonico = estado || ESTADO_DE_STATE[state] || 'acompana';
    const { despierta, handlers: handlersPresencia } = useAngelitaPresencia({
        activo: reaccionaPresencia,
    });
    // La presencia solo despierta cuando está en un estado pasivo: no interrumpe
    // 'pensando'/'respondiendo'/'preocupada' porque la persona mueva el mouse.
    const despiertaNatural = despierta && esPasivo(estadoCanonico);
    const estadoEfectivo = despiertaNatural ? 'acompana' : estadoCanonico;
    const abeja = (
        <Angelita
            estado={estadoEfectivo}
            size={size}
            direccion={direccion}
            animated={animated}
            visema={visema}
            confianza={confianza}
            tier={tier}
            clima={clima}
            enso={enso}
            animo={animo}
            energia={energia}
            mundoId={mundoId}
            lineBoil={lineBoil}
            idleCerebro={idleCerebro || despiertaNatural}
            gafas={gafas}
            cejas={cejas}
            data-agt-estado={dataEstado}
            data-pose={dataPose}
            data-visema={dataVisema}
            className={`${glow ? 'agt-avatar-glow ' : ''}${className}`.trim() || undefined}
            title={title || ariaLabel}
            {...rest}
        />
    );

    const contenido = withLabel ? (
        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {abeja}
            <span style={{ font: '600 0.7rem/1 system-ui, sans-serif', color: '#94a3b8' }}>
                Angelita
            </span>
        </span>
    ) : abeja;

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
