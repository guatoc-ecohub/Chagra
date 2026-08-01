import Zariguya from '../visual/creatures/Zariguya';

/**
 * ChagraAgentAvatarZariguya — la zarigüeya (crías al lomo) como CARA del
 * agente de Chagra, 3ra opción junto a Angelita y el maíz (operador
 * 2026-07-25, tras el merge de `art(creatures): la zarigüeya entra al elenco
 * — con las crías al lomo (#2783)`).
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarAngelita/Maiz): traduce
 * la API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) al vocabulario de VIDA
 * de `Zariguya.jsx` (`visual/creatures/`) — el registro rubber-hose CÁLIDO
 * del elenco canónico. OJO: existe otra zarigüeya en
 * `dashboard/CriaturasNocturnas.jsx`, biopunk oscuro/neón — esa NO se usa acá
 * (mezclar registros es un error de diseño ya señalado). Cero lógica nueva de
 * agente, cero cambios en `visual/creatures/` (solo lectura/import, igual que
 * el resto de adaptadores de este archivo con Angelita).
 *
 * La zarigüeya no tiene vocabulario conversacional propio (es una criatura de
 * VIDA — pose/husmea/tanatosis — no un chat-avatar como Angelita): el mapeo
 * es de mejor esfuerzo:
 *   - idle       → pose 'anda' (base, viva pero sin urgencia).
 *   - thinking   → pose 'anda' + `husmea=true`: su reacción-firma (la cuña
 *                  del hocico se alza y tantea) leída como "buscando/pensando".
 *   - speaking   → pose 'celebra' (la más expresiva) + visema del lip-sync
 *                  sobre su sonrisa.
 *   - listening  → pose 'reposo': se posa erguida y atenta.
 */
const POSE_DE_STATE = {
    idle: 'anda',
    thinking: 'anda',
    speaking: 'celebra',
    listening: 'reposo',
};

const HUSMEA_DE_STATE = {
    thinking: true,
};

// eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
const VISEMA_DE_STATE = {
    speaking: 'V2',
};

export default function ChagraAgentAvatarZariguya({
    state = 'idle',
    size = 48,
    withLabel = false,
    onClick = undefined,
    onDoubleClick = undefined,
    glow = false,
    className = '',
    ariaLabel = 'Chagra IA',
}) {
    const pose = POSE_DE_STATE[state] || 'anda';
    const husmea = !!HUSMEA_DE_STATE[state];
    const visema = VISEMA_DE_STATE[state] || null;

    const bicho = (
        <Zariguya
            pose={pose}
            husmea={husmea}
            visema={visema}
            size={size}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(255,158,203,0.65))' } : undefined}
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
            >
                {contenido}
            </button>
        );
    }
    return contenido;
}
