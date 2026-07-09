/*
 * i18n (ADR-050): copy de navegación del home en español Colombia, pendiente de
 * migrar a src/config/messages.js — mismo criterio que DashboardLive.jsx.
 */
import { MUNDOS_FINCA } from './mundosFinca';
import MundoVineta from './MundoVinetas';
import { useProCapability } from '../../hooks/useProCapability';
import './mundos-finca.css';

/**
 * Glifo del espíritu de la finca: una llama-hoja con su brote adentro,
 * dibujada a mano (SVG inline, cero assets). Acompaña la entrada Pro de
 * abajo; el color lo hereda del texto (currentColor).
 */
function EspirituGlyph() {
    return (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">
            {/* aura exterior (llama/hoja) */}
            <path
                d="M12 2.6c3.6 3.4 6.4 6.8 6.4 10.6 0 4.4-2.9 7.6-6.4 8.2-3.5-.6-6.4-3.8-6.4-8.2C5.6 9.4 8.4 6 12 2.6Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                opacity="0.9"
            />
            {/* brote interior */}
            <path
                d="M12 17.5v-4.2m0 0c0-2 1.3-3.2 3-3.4.1 2.1-1 3.4-3 3.4Zm0-1.2c0-1.6-1-2.6-2.4-2.8-.1 1.7.8 2.8 2.4 2.8Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/**
 * MundosDeMiFinca — la grilla de LOS MUNDOS DE MI FINCA en el home F2.
 *
 * El contenedor que reemplaza la caja de herramientas regada (~15 tiles planas
 * + inventario + mercado + seguimiento) por 9 LUGARES coherentes: cada tarjeta
 * es un mundo ilustrado con su paleta de tierra propia; al entrar, sus
 * funciones agrupadas (MundoScreen, ruta 'mundo'). Los mundos de UNA sola
 * pantalla (Agua, Del corral al abono, Clima) navegan directo, sin pantalla
 * intermedia vacía.
 *
 * La fuente única del mapa mundo→funciones es mundosFinca.js. El agente y el
 * registro por voz NO viven aquí: quedan siempre presentes en el hero y en el
 * bloque "Registrar en la finca".
 *
 * @param {Object} props
 * @param {(view: string, data?: any) => void} props.onNavigate
 * @param {boolean} [props.mostrarAnimales]  gate por perfil del mundo Animales
 *   (mismo criterio que la tarjeta Animales del home: un urbano no lo ve).
 * @param {number} [props.plantsCount]  matas sembradas (sello vivo en Cultivos).
 */
export default function MundosDeMiFinca({ onNavigate, mostrarAnimales = true, plantsCount = 0 }) {
    const mundos = MUNDOS_FINCA.filter((m) => m.gate !== 'animales' || mostrarAnimales);
    // Entrada Pro "El espíritu de su finca" (capability avatar-espiritu,
    // módulo del repo privado chagra-pro). GATE por capability: solo se
    // renderiza cuando el módulo Pro está cargado en el registry — mismo
    // criterio permisivo-estructural de EspirituProScreen. Para cuentas /
    // builds sin Pro: CERO rastro (ni botón muerto ni teaser). Reactivo:
    // loadProModules es async, la banda aparece sola cuando el módulo llega.
    const tieneEspiritu = useProCapability('avatar-espiritu');

    const abrir = (m) => {
        if (m.portada) onNavigate?.(m.portada);
        else if (m.directo) onNavigate?.(m.directo.view, m.directo.data);
        else onNavigate?.('mundo', { mundo: m.id });
    };

    // Sello vivo por mundo (dato real, nunca inventado): hoy solo Cultivos
    // lleva el conteo de matas sembradas del store.
    const sello = (m) => {
        if (m.id === 'cultivos' && plantsCount > 0) {
            return plantsCount === 1 ? '1 mata sembrada' : `${plantsCount} matas sembradas`;
        }
        return null;
    };

    return (
        <section className="mf" aria-label="Los mundos de su finca" data-testid="mundos-finca">
            <header className="mf-head">
                <h2 className="mf-tit">Los mundos de su finca</h2>
                <p className="mf-sub">
                    Cada mundo es un lugar de su finca: entre y adentro están todas sus herramientas.
                </p>
            </header>

            <div className="mf-grid">
                {mundos.map((m, i) => {
                    const entradas = m.entradas || [];
                    const visibles = entradas.slice(0, 3);
                    const resto = entradas.length - visibles.length;
                    const selloTxt = sello(m);
                    const aria = m.directo
                        ? `${m.titulo}: ${m.lema}`
                        : `${m.titulo}: ${m.lema}. Adentro: ${entradas.map((e) => e.label).join(', ')}.`;
                    return (
                        <button
                            key={m.id}
                            type="button"
                            className={`mf-card ${m.featured ? 'mf-card--featured' : ''}`}
                            style={{ '--mf-a': m.tinte[0], '--mf-b': m.tinte[1], '--mf-i': i }}
                            data-testid={`mundo-${m.id}`}
                            onClick={() => abrir(m)}
                            aria-label={aria}
                        >
                            <span className="mf-vineta" aria-hidden="true">
                                <MundoVineta mundoId={m.id} />
                                {selloTxt && <span className="mf-sello">{selloTxt}</span>}
                            </span>
                            <span className="mf-body">
                                <span className="mf-nombre">
                                    <span className="mf-emoji" aria-hidden="true">{m.emoji}</span>
                                    <b>{m.titulo}</b>
                                </span>
                                <span className="mf-lema">{m.lema}</span>
                                {entradas.length > 0 ? (
                                    <span className="mf-adentro" aria-hidden="true">
                                        {visibles.map((e) => (
                                            <span key={e.view} className="mf-chip">{e.label}</span>
                                        ))}
                                        {resto > 0 && <span className="mf-chip mf-chip--mas">+{resto} más</span>}
                                    </span>
                                ) : (
                                    <span className="mf-adentro" aria-hidden="true">
                                        <span className="mf-chip mf-chip--entrar">Entrar →</span>
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── Entrada Pro: EL ESPÍRITU DE SU FINCA (#/espiritu) ──────────
                Banda discreta DEBAJO de la grilla (no es un mundo más: es la
                finca ENTERA vista como un solo ser vivo — y la política de la
                grilla es ~10 tarjetas top-level). El corazón de la escena ya
                se usó para "Pregunte" (#2230), por eso la entrada vive aquí.
                Gate arriba (tieneEspiritu): sin módulo Pro no se renderiza. */}
            {tieneEspiritu && (
                <button
                    type="button"
                    className="mf-espiritu"
                    data-testid="entrada-espiritu"
                    onClick={() => onNavigate?.('espiritu_pro')}
                    aria-label="El espíritu de su finca: véala respirar como un solo ser vivo (experiencia de su plan)"
                >
                    <span className="mf-espiritu-glifo" aria-hidden="true">
                        <EspirituGlyph />
                    </span>
                    <span className="mf-espiritu-txt">
                        <b>El espíritu de su finca</b>
                        <small>Véala respirar: toda su finca como un solo ser vivo</small>
                    </span>
                    <span className="mf-espiritu-sello" aria-hidden="true">Pro</span>
                </button>
            )}
        </section>
    );
}
