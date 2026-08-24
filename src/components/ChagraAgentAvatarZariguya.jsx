import ZariguyaGeminiLaminaViva from '../visual/creatures/ZariguyaGeminiLaminaViva';

/**
 * ChagraAgentAvatarZariguya — la zarigüeya como CARA del agente de Chagra,
 * 3ra opción junto a Angelita y el maíz (operador 2026-07-25).
 *
 * DESDE `feat/zariguya-gemini-integra` (2026-08-24) el cuerpo es
 * `ZariguyaGeminiLaminaViva`: el SET GEMINI estilo grabado/tinta aprobado por
 * el operador (2026-08-23) — la hero naturalista (lápiz+brújula) horneada en
 * capas lámina-viva + las poses plenas del set (escucha ×4, ver-lupa, cute,
 * muerta, crías al lomo) según el estado. REEMPLAZA aquí al vector rubber-hose
 * `Zariguya.jsx` (rechazado en revisión visual: cuerpo gris plano, cola
 * pelada); el vector sigue vivo en `visual/creatures/` para sus otros
 * consumidores (fauna del valle, selector de criaturas).
 *
 * Adaptador puro (mismo contrato que ChagraAgentAvatarAngelita/Maiz/Jaguar):
 * traduce la API histórica del avatar del agente (state 'idle'|'thinking'|
 * 'speaking'|'listening', glow, withLabel, onClick/onDoubleClick) al
 * contrato de la lámina viva — que entiende esos estados de forma nativa:
 *   - idle      → lámina-rig articulada (respira, parpadea, husmea; sus
 *                 momentos de vida traen el gag de tanatosis, el reposo
 *                 de frente y — muy de vez en cuando — las CRÍAS AL LOMO
 *                 (la firma de identidad como momento especial, no como
 *                 hero: orden del operador 2026-08-24), poses reales del
 *                 set).
 *   - thinking  → pose ver-lupa (la investigadora repasa el documento).
 *   - speaking  → lámina-rig + lip-sync de mandíbula (visema estático V2 si
 *                 el host no corre useLipSync — igual que Angelita).
 *   - listening → ciclo de escucha del set (la oreja crece 02→03→04; en
 *                 avatar chico, el close-up 01).
 */
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
    const visema = VISEMA_DE_STATE[state] || null;

    const bicho = (
        <ZariguyaGeminiLaminaViva
            estado={state}
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
