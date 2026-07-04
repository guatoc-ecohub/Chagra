/*
 * i18n (ADR-050): copy de navegación del home en español Colombia, pendiente de
 * migrar a src/config/messages.js — mismo criterio que DashboardLive.jsx.
 */
import { MUNDOS_FINCA } from './mundosFinca';
import MundoVineta from './MundoVinetas';
import './mundos-finca.css';

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

    const abrir = (m) => {
        if (m.directo) onNavigate?.(m.directo.view, m.directo.data);
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
        </section>
    );
}
