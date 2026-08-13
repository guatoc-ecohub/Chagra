import Jaguar from '../visual/creatures/Jaguar';

/**
 * ChagraAgentAvatarJaguar — el jaguar (Panthera onca) como CARA del agente de
 * Chagra, 4ta opción del elenco (junto a Angelita, maíz y zarigüeya).
 *
 * Cierra parte del ítem #8 del GAP compAI (2026-08-13): el jaguar ya tenía
 * cuerpo dibujado (`Jaguar.jsx`, 2.5D vivo con idle + paisaje del miedo,
 * commit `075f6a0d2`) y ya estaba marcado `enPWA:true` en
 * `compai/nucleo/elenco.js` (#96) — pero ningún selector lo ofrecía. Este
 * adaptador es el que faltaba para que el picker de la PWA lo exponga.
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarZariguya): traduce la
 * API histórica del avatar del agente (state 'idle'|'thinking'|'speaking'|
 * 'listening', glow, withLabel, onClick/onDoubleClick) al vocabulario de VIDA
 * de `Jaguar.jsx` (`visual/creatures/`). Cero lógica nueva de agente, cero
 * cambios en `visual/creatures/`.
 *
 *   - idle       → pose 'anda' (base, con acecho de hombros).
 *   - thinking   → pose 'anda' + `acecha=true`: el felino se agazapa y avanza
 *                  lento — su reacción-firma leída como "atento/calculando".
 *   - speaking   → pose 'celebra' (la más expresiva) + visema del lip-sync.
 *   - listening  → pose 'reposo': respira hondo, agazapado y atento.
 */
const POSE_DE_STATE = {
    idle: 'anda',
    thinking: 'anda',
    speaking: 'celebra',
    listening: 'reposo',
};

const ACECHA_DE_STATE = {
    thinking: true,
};

const VISEMA_DE_STATE = {
    speaking: 'V2',
};

export default function ChagraAgentAvatarJaguar({
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
    const acecha = !!ACECHA_DE_STATE[state];
    const visema = VISEMA_DE_STATE[state] || null;

    const bicho = (
        <Jaguar
            pose={pose}
            acecha={acecha}
            visema={visema}
            tier={undefined}
            size={size}
            title={ariaLabel}
            className={className}
            style={glow ? { filter: 'drop-shadow(0 0 10px rgba(168,85,247,0.65))' } : undefined}
        />
    );

    const contenido = withLabel ? (
        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {bicho}
            <span style={{ font: '600 0.7rem/1 system-ui, sans-serif', color: '#94a3b8' }}>
                Jaguar
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
