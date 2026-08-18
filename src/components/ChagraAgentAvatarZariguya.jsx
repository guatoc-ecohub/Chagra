import ZariguyaLaminaViva from '../visual/creatures/ZariguyaLaminaViva';

/**
 * ChagraAgentAvatarZariguya — la zarigüeya como CARA del agente de Chagra,
 * 3ra opción del elenco (junto a Angelita, el maíz y el jaguar).
 *
 * Rama `feat/zariguya-lamina-viva`: reemplaza el cuerpo vector
 * (`Zariguya.jsx`, rubber-hose dibujado a mano) por `ZariguyaLaminaViva` —
 * la lámina APROBADA (`zariguya.png`, estilo grabado: erguida con guante,
 * lápiz, brújula y cola prensil) recortada en capas cara-segura y montada
 * sobre el mismo sistema de vida de Angelita/el jaguar. El mismo movimiento
 * que hizo `ChagraAgentAvatarJaguar` en `feat/jaguar-lamina-sobre-esqueleto`.
 * `Zariguya.jsx` NO se borra (el elenco del catálogo, las escenas del valle
 * y CriaturasNocturnas siguen usando el registro que les corresponda).
 *
 * Adaptador puro (mismo contrato que los avatares hermanos): traduce la API
 * histórica (state 'idle'|'thinking'|'speaking'|'listening', glow,
 * withLabel, onClick/onDoubleClick) al contrato de `ZariguyaLaminaViva`,
 * que ya trae su propio vocabulario por estado (escuchando para las orejas,
 * pensando escribe con el lápiz, hablando mueve la mandíbula con el visema).
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
        <ZariguyaLaminaViva
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
