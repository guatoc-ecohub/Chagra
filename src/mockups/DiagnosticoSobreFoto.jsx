import React, { useEffect, useState } from 'react';
import { ScreenShell } from '../components/common/ScreenShell';
import { ScanEye, ShieldAlert, Sparkles, Info, Camera, Leaf } from 'lucide-react';
import {
    FOTO_DIAGNOSTICO_CAFE,
    HALLAZGOS_DIAGNOSTICO_CAFE,
} from './diagnosticoFotoData.js';
import './diagnostico-sobre-foto.css';

/**
 * MOCKUP DE GALERÍA — "El agente dibuja el diagnóstico SOBRE la foto".
 *
 * Moonshot: cuando el campesino sube una hoja enferma, el agente no solo
 * responde en texto — MARCA en la misma foto dónde está el síntoma
 * (círculo punteado + etiqueta), como un doctor señalando la radiografía.
 *
 * Esto es una DEMOSTRACIÓN con datos de MUESTRA: no hay modelo real detrás.
 * La foto es de sanidad vegetal REAL y bien groundeada (roya del café,
 * Hemileia vastatrix — el problema bandera del cafetal colombiano), de
 * `public/plaga-images/` (Wikimedia Commons, licencia libre).
 *
 * Ruta: #/mockups/diagnostico-foto (sin gate).
 *
 * Técnica de la capa: la foto y un <svg> comparten una caja con
 * `aspect-ratio` fijo (900/675 = el de la imagen). El SVG usa el mismo
 * viewBox en píxeles de la foto, así los marcadores caen SIEMPRE sobre la
 * lesión — coordenadas calibradas contra la foto real. Como la caja
 * conserva la proporción, los círculos siguen siendo círculos a 320px.
 */

function Marcador({ h }) {
    const badgeX = h.cx + h.r * 0.72;
    const badgeY = h.cy - h.r * 0.72;
    return (
        <g className="dx-marker" data-sev={h.sev} style={{ '--d': `${1.3 + h.n * 0.35}s` }}>
            {/* onda "sonar" que se expande y se desvanece */}
            <circle className="dx-pulse" cx={h.cx} cy={h.cy} r={h.r} />
            {/* halo oscuro por debajo → el aro se lee sobre verde Y sobre naranja */}
            <circle className="dx-halo" cx={h.cx} cy={h.cy} r={h.r} />
            {/* aro punteado que gira despacio (la mira del agente) */}
            <circle className="dx-ring" cx={h.cx} cy={h.cy} r={h.r} />
            {/* cruceta de puntería */}
            <g className="dx-ticks">
                <line x1={h.cx} y1={h.cy - h.r - 12} x2={h.cx} y2={h.cy - h.r + 8} />
                <line x1={h.cx} y1={h.cy + h.r - 8} x2={h.cx} y2={h.cy + h.r + 12} />
                <line x1={h.cx - h.r - 12} y1={h.cy} x2={h.cx - h.r + 8} y2={h.cy} />
                <line x1={h.cx + h.r - 8} y1={h.cy} x2={h.cx + h.r + 12} y2={h.cy} />
            </g>
            {/* número que amarra con la ficha de al lado */}
            <circle className="dx-badge" cx={badgeX} cy={badgeY} r="26" />
            <text className="dx-badge-num" x={badgeX} y={badgeY}>{h.n}</text>
        </g>
    );
}

export default function DiagnosticoSobreFoto({ onBack }) {
    // Fase de "escaneo": arranca mirando la foto y luego revela el diagnóstico.
    // Con reduced-motion resolvemos directo a 'done' en el inicializador (no
    // hay barrido) — así evitamos un setState síncrono dentro del efecto.
    const [phase, setPhase] = useState(() =>
        typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
            ? 'done'
            : 'scan',
    );
    useEffect(() => {
        if (phase !== 'scan') return undefined;
        const t = setTimeout(() => setPhase('done'), 1750);
        return () => clearTimeout(t);
    }, [phase]);

    // Ancla del chip (marcador 1) en porcentaje, para que siga a la foto.
    const chipLeft = `${(HALLAZGOS_DIAGNOSTICO_CAFE[0].cx / 900) * 100}%`;
    const chipTop = `${((HALLAZGOS_DIAGNOSTICO_CAFE[0].cy - HALLAZGOS_DIAGNOSTICO_CAFE[0].r) / 675) * 100}%`;

    return (
        <ScreenShell
            title="Diagnóstico sobre la foto"
            icon={ScanEye}
            onBack={onBack}
        >
            <div className="dx-wrap" data-phase={phase}>
                <span className="dx-demo-badge">
                    <Sparkles size={13} /> Muestra de demostración
                </span>

                {/* La foto que "subió" el campesino, como mensaje de chat */}
                <div className="dx-ask">
                    <span className="dx-ask-photo" aria-hidden>
                        <Camera size={16} />
                    </span>
                    <p>
                        Vea, le mando esta hoja de mi cafetal. La veo como con un
                        polvillo por debajo. ¿Qué será que le pasa?
                    </p>
                </div>

                <div className="dx-grid">
                    {/* ── La radiografía: foto + capa del agente ─────────────── */}
                    <figure className="dx-stage" data-phase={phase}>
                        <img
                            className="dx-photo"
                            src={FOTO_DIAGNOSTICO_CAFE}
                            width="900"
                            height="675"
                            alt="Hoja de café sostenida en la mano, con manchas de polvillo naranja de roya por el envés."
                            loading="eager"
                            decoding="async"
                        />

                        {/* barrido de escaneo (una sola pasada al abrir) */}
                        <div className="dx-scanline" aria-hidden />

                        {/* capa vectorial de marcas — mismo viewBox que la foto */}
                        <svg
                            className="dx-overlay"
                            viewBox="0 0 900 675"
                            preserveAspectRatio="none"
                            aria-hidden
                        >
                            {HALLAZGOS_DIAGNOSTICO_CAFE.map((h) => <Marcador key={h.n} h={h} />)}
                        </svg>

                        {/* etiqueta flotante del hallazgo principal */}
                        <figcaption
                            className="dx-chip"
                            style={{ left: chipLeft, top: chipTop }}
                        >
                            <span className="dx-chip-num">1</span>
                            {HALLAZGOS_DIAGNOSTICO_CAFE[0].chip}
                        </figcaption>

                        {/* estado del agente sobre la foto */}
                        <div className="dx-status" role="status">
                            {phase === 'scan'
                                ? (<><ScanEye size={15} /> Mirando su foto…</>)
                                : (<><ScanEye size={15} /> Lo que encontré</>)}
                        </div>

                        <span className="dx-credit">
                            Foto CC BY-SA · Wikimedia
                        </span>
                    </figure>

                    {/* ── El dictamen, en cristiano campesino ────────────────── */}
                    <section className="dx-report" aria-label="Diagnóstico">
                        <header className="dx-report-head">
                            <span className="dx-avatar" aria-hidden><Leaf size={18} /></span>
                            <div>
                                <p className="dx-kicker">Chagra le responde</p>
                                <h2 className="dx-title">Es la <strong>roya del café</strong></h2>
                                <p className="dx-latin">Hemileia vastatrix · en el envés de la hoja</p>
                            </div>
                        </header>

                        {/* confianza */}
                        <div className="dx-conf">
                            <div className="dx-conf-top">
                                <span>Qué tan seguro estoy</span>
                                <strong>Alta · 88%</strong>
                            </div>
                            <div className="dx-conf-bar" role="img" aria-label="Confianza 88 por ciento">
                                <span style={{ width: '88%' }} />
                            </div>
                        </div>

                        {/* hallazgos numerados = las marcas de la foto */}
                        <ul className="dx-finds">
                            {HALLAZGOS_DIAGNOSTICO_CAFE.map((h) => (
                                <li key={h.n} className="dx-find" data-sev={h.sev}>
                                    <span className="dx-find-num">{h.n}</span>
                                    <div>
                                        <p className="dx-find-title">
                                            {h.titulo}
                                            <em>{h.sev === 'alta' ? 'avanzado' : 'apenas empezando'}</em>
                                        </p>
                                        <p className="dx-find-detail">{h.detalle}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* severidad */}
                        <p className="dx-sev">
                            <ShieldAlert size={16} />
                            <span>
                                Ataque <strong>moderado</strong>: conviene actuar
                                pronto, todavía está a tiempo.
                            </span>
                        </p>

                        {/* recomendación agroecológica, sin dosis ni químicos */}
                        <div className="dx-reco">
                            <p className="dx-reco-head">Qué le recomiendo</p>
                            <ul>
                                <li>Recoja y saque del lote las hojas más enfermas (las del polvillo).</li>
                                <li>Deje entrar aire y luz: regule la sombra para que la hoja seque rápido.</li>
                                <li>Revise si su variedad es de las resistentes a la roya.</li>
                            </ul>
                            <button type="button" className="dx-cta" disabled>
                                <Sparkles size={15} /> Ver el mundo del café
                            </button>
                        </div>

                        <p className="dx-source">
                            <Info size={13} />
                            <span>
                                Con base en el catálogo de sanidad de Chagra ·
                                Cenicafé. Datos de muestra para esta demostración.
                            </span>
                        </p>
                    </section>
                </div>
            </div>
        </ScreenShell>
    );
}
