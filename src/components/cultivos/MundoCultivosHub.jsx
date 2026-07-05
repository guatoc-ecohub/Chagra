/*
 * i18n (ADR-050): copy de navegación campesino en español Colombia, pendiente de
 * migrar a src/config/messages.js — mismo criterio que DashboardLive.jsx.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useState } from 'react';
import { ScreenShell } from '../common/ScreenShell';
import { REGIMENES_LLUVIA } from '../../services/gradosDiaCalculator';
import CalculadoraGradosDia from './CalculadoraGradosDia';
import './mundo-cultivos-hub.css';

/**
 * MundoCultivosHub — la PORTADA del mundo 🌱 CULTIVOS Y SEMILLAS.
 *
 * Reúne y da entrada elegante a las funciones que YA existen (directorio de
 * especies, ciclo de cultivo, germinación, calendario, fenología, siembra y
 * cosecha) SIN reimplementarlas: cada lámina RE-RUTEA vía onNavigate a su
 * pantalla real de App.jsx. Suma una calculadora determinista de grados-día.
 *
 * Orientación primero (grounding 2026-07-04): el calendario campesino no es una
 * fecha universal — depende del RÉGIMEN de lluvia (bimodal andino = dos siembras;
 * unimodal = una) y del PISO TÉRMICO. Por eso el hub abre orientando por región.
 *
 * Identidad: cuaderno de campo (papel crema, tinta verde, Baloo 2 / Nunito),
 * SVG propios, funciona sobre los 4 temas (láminas de papel), reduced-motion.
 *
 * @param {Object} props
 * @param {Function} props.onBack   volver al home.
 * @param {(view: string, data?: any) => void} props.onNavigate
 */
export default function MundoCultivosHub({ onBack, onNavigate }) {
    const [regimenId, setRegimenId] = useState('bimodal');
    const [calcAbierta, setCalcAbierta] = useState(false);
    const regimen = REGIMENES_LLUVIA.find((r) => r.id === regimenId) || REGIMENES_LLUVIA[0];

    // Las funciones del mundo, agrupadas editorialmente. `view` SIEMPRE es un
    // case real de App.jsx (y vive también en las entradas del mundo cultivos en
    // mundosFinca.js, que congela la reachability).
    const grupos = [
        {
            titulo: 'Saber qué y cuándo sembrar',
            desc: 'El conocimiento antes de meter la semilla',
            items: [
                { view: 'cultivos_insignia', emoji: '🌽', label: 'Los cultivos insignia', desc: 'Con fotos: dónde va, qué le pide al suelo, con qué se lleva y qué lo ataca' },
                { view: 'directorio', emoji: '🌱', label: 'Qué puedo sembrar', desc: 'Especies para su clima, con qué se llevan y sus plagas' },
                { view: 'calendario_finca', emoji: '🗓️', label: 'Calendario de la finca', desc: 'Cuándo sembrar, abonar y cosechar, todo junto' },
                { view: 'ciclo', emoji: '🔄', label: 'Ciclo de cultivo', desc: 'La vida de la mata etapa por etapa (fenología)' },
            ],
        },
        {
            titulo: 'Sembrar y hacer seguimiento',
            desc: 'De la semilla a la cosecha',
            items: [
                { view: 'germinacion', emoji: '🫘', label: 'Semilleros', desc: 'Pruebe sus semillas y vea cuáles nacen' },
                { view: 'sembrar', emoji: '🌽', label: 'Registrar una siembra', desc: 'Anote lo que sembró y arranca su ciclo' },
                { view: 'activos', emoji: '🪴', label: 'Mis matas', desc: 'Las plantas que tiene sembradas y cómo van' },
                { view: 'cosechar', emoji: '🧺', label: 'Cosechar', desc: 'Anote lo que recogió' },
            ],
        },
    ];

    return (
        <ScreenShell title="Cultivos y semillas" onBack={onBack}>
            <div className="mch" data-testid="mundo-cultivos-hub">
                {/* Portada ilustrada del mundo (SVG propio, rsvg-safe). */}
                <header className="mch-hero">
                    <HeroCultivos />
                    <div className="mch-hero-txt">
                        <h1 className="mch-hero-tit">
                            <span aria-hidden="true">🌱</span> Cultivos y semillas
                        </h1>
                        <p className="mch-hero-lema">
                            Qué sembrar, cuándo, y cómo van sus matas. Empiece por su región.
                        </p>
                    </div>
                </header>

                {/* Orientación: régimen de lluvia → ventanas de siembra (grounded). */}
                <section className="mch-orienta" aria-labelledby="mch-orienta-tit">
                    <h2 id="mch-orienta-tit" className="mch-h2">
                        <span aria-hidden="true">🌧️</span> ¿Cuándo se siembra en su tierra?
                    </h2>
                    <p className="mch-sub">
                        No hay una fecha para toda Colombia: se siembra al empezar las lluvias.
                        Elija su región.
                    </p>
                    <div className="mch-seg" role="radiogroup" aria-label="Régimen de lluvia">
                        {REGIMENES_LLUVIA.map((r) => (
                            <button
                                key={r.id}
                                type="button"
                                role="radio"
                                aria-checked={regimenId === r.id}
                                className={`mch-seg-btn ${regimenId === r.id ? 'is-on' : ''}`}
                                onClick={() => setRegimenId(r.id)}
                                data-testid={`regimen-${r.id}`}
                            >
                                {r.nombre}
                            </button>
                        ))}
                    </div>
                    <div className="mch-ventanas" data-testid="ventanas-siembra">
                        <p className="mch-ventanas-desc">{regimen.desc}</p>
                        <div className="mch-ventanas-grid">
                            {regimen.ventanas.map((v) => (
                                <div key={v.label} className="mch-ventana">
                                    <b>{v.label}</b>
                                    <span><i>Siembra:</i> {v.siembra}</span>
                                    <span><i>Cosecha:</i> {v.cosecha}</span>
                                </div>
                            ))}
                        </div>
                        <p className="mch-nota">
                            {regimen.nota} <span className="mch-fuente">({regimen.fuente})</span>
                        </p>
                    </div>
                </section>

                {/* Las funciones existentes, agrupadas — cada una re-rutea. */}
                {grupos.map((g) => (
                    <section key={g.titulo} className="mch-grupo" aria-label={g.titulo}>
                        <h2 className="mch-h2">{g.titulo}</h2>
                        <p className="mch-sub">{g.desc}</p>
                        <nav className="mch-laminas">
                            {g.items.map((it) => (
                                <button
                                    key={it.view}
                                    type="button"
                                    className="mch-lamina"
                                    data-testid={`lamina-${it.view}`}
                                    onClick={() => onNavigate?.(it.view)}
                                    aria-label={`${it.label}: ${it.desc}`}
                                >
                                    <span className="mch-lamina-ic" aria-hidden="true">{it.emoji}</span>
                                    <span className="mch-lamina-txt">
                                        <b>{it.label}</b>
                                        <small>{it.desc}</small>
                                    </span>
                                    <span className="mch-lamina-ir" aria-hidden="true">→</span>
                                </button>
                            ))}
                        </nav>
                    </section>
                ))}

                {/* Calculadora de grados-día — el reloj térmico, determinista. */}
                <section className="mch-grupo" aria-labelledby="mch-calc-tit">
                    <button
                        type="button"
                        className={`mch-calc-toggle ${calcAbierta ? 'is-open' : ''}`}
                        aria-expanded={calcAbierta}
                        aria-controls="mch-calc-panel"
                        onClick={() => setCalcAbierta((v) => !v)}
                        data-testid="calc-toggle"
                    >
                        <span className="mch-lamina-ic" aria-hidden="true">🌡️</span>
                        <span className="mch-lamina-txt">
                            <b id="mch-calc-tit">Calculadora de grados-día</b>
                            <small>Por qué en tierra fría la misma mata tarda más</small>
                        </span>
                        <span className="mch-lamina-ir" aria-hidden="true">{calcAbierta ? '▲' : '▼'}</span>
                    </button>
                    {calcAbierta && (
                        <div id="mch-calc-panel">
                            <CalculadoraGradosDia />
                        </div>
                    )}
                </section>

                {/* Saber cultural: calendario lunar, con respeto (no agronomía dura). */}
                <section className="mch-luna" aria-label="Calendario lunar">
                    <span className="mch-luna-ic" aria-hidden="true">🌙</span>
                    <p>
                        <b>El calendario lunar</b> es saber campesino que vale para organizar las
                        labores (creciente para lo de porte alto; menguante para raíces como la
                        papa). No promete más cosecha: es cultura, no receta.
                    </p>
                </section>

                {/* El agente, siempre a la mano, con el contexto del mundo. */}
                <button
                    type="button"
                    className="mch-agente"
                    data-testid="mch-agente"
                    onClick={() => onNavigate?.('agente')}
                    aria-label="Pregúntele a Chagra sobre cultivos y semillas"
                >
                    <span aria-hidden="true">💬</span>
                    <span>
                        <b>Pregúntele a Chagra</b>
                        <small>Cualquier duda sobre qué y cuándo sembrar, con su fuente.</small>
                    </span>
                </button>
            </div>
        </ScreenShell>
    );
}

/**
 * HeroCultivos — ilustración propia de la portada (mismo lenguaje vector que las
 * viñetas de mundo: horizonte + tierra + foco). rsvg-safe: sin filtros, sin
 * foreignObject, sin <text> con emoji. El movimiento (si acaso) lo pone el CSS y
 * respeta reduced-motion.
 */
function HeroCultivos() {
    return (
        <svg
            className="mch-hero-svg"
            viewBox="0 0 320 120"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
        >
            {/* cielo de mañana */}
            <rect width="320" height="120" fill="#eaf3da" />
            <circle cx="268" cy="30" r="16" fill="#ffe08a" />
            <circle cx="268" cy="30" r="9" fill="#fff3c4" />
            {/* cordillera (pisos térmicos: el fondo azulado del frío) */}
            <path d="M-4 58 L46 30 L96 52 L150 26 L210 50 L272 28 L324 48 V120 H-4 Z" fill="#bcd6a6" />
            {/* laderas de cultivo en verde escalonado */}
            <path d="M-4 64 Q70 46 150 62 T324 56 V120 H-4 Z" fill="#9bc172" />
            <path d="M-4 82 Q90 66 180 80 T324 76 V120 H-4 Z" fill="#6fa356" />
            {/* surcos en perspectiva */}
            <g stroke="#4c7a3d" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".5">
                <path d="M40 120 L86 84" />
                <path d="M96 120 L120 84" />
                <path d="M164 120 L166 84" />
                <path d="M236 120 L214 84" />
                <path d="M300 120 L266 84" />
            </g>
            {/* matas de maíz jóvenes */}
            <g stroke="#2f6b3a" strokeWidth="2.8" strokeLinecap="round" fill="none">
                <g><path d="M118 100 v-20" /><path d="M118 90 q-9 -4 -13 -12" /><path d="M118 85 q9 -4 13 -12" /></g>
                <g><path d="M196 96 v-18" /><path d="M196 88 q-8 -4 -12 -11" /><path d="M196 83 q8 -4 12 -11" /></g>
            </g>
            {/* semilla germinando, primer plano */}
            <g transform="translate(58 92)">
                <ellipse cx="0" cy="10" rx="9" ry="6" fill="#8a5a38" />
                <path d="M0 8 v-11" stroke="#5a9e4b" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M0 -3 q-7 -2 -9 -9" stroke="#5a9e4b" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M0 -3 q7 -2 9 -9" stroke="#5a9e4b" strokeWidth="3" strokeLinecap="round" fill="none" />
            </g>
        </svg>
    );
}
