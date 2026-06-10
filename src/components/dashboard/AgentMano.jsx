import { CAPABILITY_MANIFEST } from '../../services/agentCapabilities';

/**
 * AgentMano — "La mano de Chagra": la visualización ÚNICA de capacidades del
 * agente, compartida por sus dos accesos (decisión operador 2026-06-09):
 *   1. el bottom-sheet del AgentHero (botón Ⓐ que "despliega"), y
 *   2. el panel inline siempre visible bajo el hero (DashboardLive → AgentAraña).
 *
 * Metáfora: una MANO abierta (≈ "Chagra, su mano en el campo") cuyos dedos se
 * vuelven RAMA DE ÁRBOL (tema nature) o MICORRIZA luminosa (tema biopunk); de
 * cada yema brota una hoja (nature) o una espora (biopunk). Minimalista la
 * reduce a una silueta sobria, sin floración.
 *
 * Tres niveles de integración (pedido del operador):
 *   1. Visual/estético + lingüístico campesino: etiquetas claras en castellano,
 *      filas grandes y tappables, agrupadas por "dedo" (flujo de la finca).
 *   2. Funcional: cada capacidad rutea de verdad (onPick recibe el cap completo).
 *   3. Cobertura total: muestra TODO el manifiesto `hero`, lo conectado y lo
 *      `soon` (por lanzarse), esto último levemente opaco y no clickeable.
 *
 * El color/forma sale de data-theme (biopunk base / nature / minimalista) y de
 * los tokens theme-aware (--t-accent-rgb, --c-*), así los 3 temas coinciden sin
 * parchar a mano. Respeta prefers-reduced-motion.
 */

// Etiquetas humanas de cada "dedo" (grupo de capacidades).
const CAPABILITY_GROUPS = Object.freeze({
    cultivo: 'Mis cultivos',
    cuidar: 'Cuidar y prevenir',
    planear: 'Planear el trabajo',
    observar: 'Mirar la finca',
    registrar: 'Guardar lo que hago',
    aprender: 'Aprender y decidir',
    vender: 'Vender mejor',
});

// Orden de los "dedos" — flujo natural del trabajo, del cultivo al mercado.
const GROUP_ORDER = Object.freeze([
    'cultivo', 'cuidar', 'observar', 'registrar', 'planear', 'aprender', 'vender',
]);

// Capacidades visibles (hero) derivadas del manifiesto único. NO editar labels,
// tools o rutas acá — hacerlo en agentCapabilities.js.
const CAPABILITIES = CAPABILITY_MANIFEST
    .filter((e) => e.hero)
    .map((e) => ({
        id: e.id,
        intent: e.intent || null,
        icon: e.icon,
        title: e.label,
        desc: e.desc,
        tool: e.tool,
        route: e.heroRoute,
        group: e.group || 'aprender',
        status: e.status || 'live',
    }));

// Capacidades agrupadas por "dedo": solo grupos con items; live primero, soon al
// final, para que el campesino vea primero lo que ya sirve.
const CAPS_BY_GROUP = GROUP_ORDER
    .map((key) => ({
        key,
        label: CAPABILITY_GROUPS[key] || CAPABILITY_GROUPS.aprender,
        items: CAPABILITIES
            .filter((c) => (c.group || 'aprender') === key)
            .sort((a, b) => (a.status === 'soon' ? 1 : 0) - (b.status === 'soon' ? 1 : 0)),
    }))
    .filter((g) => g.items.length > 0);

// Yemas de la mano — 10 puntas (2 ramitas por dedo) donde florece la hoja
// (nature) o la espora (biopunk). viewBox del emblema 280×240. El orden empareja
// con FINGERTIPS: índice · medio · anular · meñique · pulgar.
const MANO_TIPS = Object.freeze([
    [95, 38], [113, 38],    // índice
    [131, 26], [149, 26],   // medio
    [167, 40], [185, 40],   // anular
    [197, 70], [215, 72],   // meñique
    [57, 114], [75, 110],   // pulgar
]);

// Yemas (puntas de cada dedo) de las que brotan las dos ramitas.
const FINGERTIPS = Object.freeze([
    [104, 48], [140, 36], [176, 50], [206, 80], [66, 122],
]);

// Hoja-almendra vertical centrada en (x,y), ~14px. Solo en nature.
function leafPath(x, y) {
    return `M${x} ${y - 7} C${x + 6} ${y - 3} ${x + 6} ${y + 3} ${x} ${y + 7}`
        + ` C${x - 6} ${y + 3} ${x - 6} ${y - 3} ${x} ${y - 7} Z`;
}

/**
 * ManoChagraEmblem — la MANO abierta como silueta SÓLIDA (trazos gruesos
 * round-cap del mismo color en un grupo translúcido → se fusionan sin costuras;
 * la opacidad vive en el grupo, no apila por trazo). De cada yema brotan dos
 * ramitas → hoja (nature) / espora (biopunk). Dibujo + floración escalonada;
 * respeta prefers-reduced-motion (CSS).
 */
export function ManoChagraEmblem() {
    return (
        <svg className="mano-emblema" viewBox="0 0 280 240" preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden="true">
            <g className="mano-hand">
                <path className="mano-hand-part" strokeWidth="34" d="M140 212 L140 178" />
                <path className="mano-hand-part" strokeWidth="56" d="M118 150 L162 150" />
                <path className="mano-hand-part" strokeWidth="26" d="M120 150 L104 48" />
                <path className="mano-hand-part" strokeWidth="26" d="M140 150 L140 36" />
                <path className="mano-hand-part" strokeWidth="26" d="M160 150 L176 50" />
                <path className="mano-hand-part" strokeWidth="26" d="M176 152 L206 80" />
                <path className="mano-hand-part" strokeWidth="26" d="M120 165 L66 122" />
            </g>
            <g className="mano-mesh">
                <path className="mano-mesh-l" d="M118 96 C132 90 140 90 140 80" />
                <path className="mano-mesh-l" d="M170 96 C150 90 140 90 140 80" />
            </g>
            <g className="mano-twigs">
                {FINGERTIPS.map(([x, y], i) => {
                    const [lx, ly] = MANO_TIPS[i * 2];
                    const [rx, ry] = MANO_TIPS[i * 2 + 1];
                    return (
                        <g key={i}>
                            <path className="mano-twig" d={`M${x} ${y} C${(x + lx) / 2} ${(y + ly) / 2 - 3} ${lx} ${ly + 4} ${lx} ${ly}`} />
                            <path className="mano-twig" d={`M${x} ${y} C${(x + rx) / 2} ${(y + ry) / 2 - 3} ${rx} ${ry + 4} ${rx} ${ry}`} />
                        </g>
                    );
                })}
            </g>
            <g className="mano-leaves">
                {MANO_TIPS.map(([x, y], i) => (
                    <path key={i} className="mano-tip mano-leaf" style={{ '--d': `${i * 0.05}s` }} d={leafPath(x, y)} />
                ))}
            </g>
            <g className="mano-spores">
                {MANO_TIPS.map(([x, y], i) => (
                    <circle key={i} className="mano-tip mano-spore" style={{ '--d': `${i * 0.05}s` }} cx={x} cy={y} r="3.8" />
                ))}
            </g>
        </svg>
    );
}

export default function AgentMano({ onPick, disabled = false, showEmblem = true }) {
    return (
        <div className="mano-root">
            {showEmblem && <ManoChagraEmblem />}
            <div className="mano-caps">
                {CAPS_BY_GROUP.map((group) => (
                    <div className="mano-branch" key={group.key} role="group" aria-label={group.label}>
                        <div className="mano-branch-h">
                            <span className="knot" aria-hidden="true" />
                            {group.label}
                        </div>
                        {group.items.map((cap) => {
                            const soon = cap.status === 'soon';
                            return (
                                <button
                                    key={cap.id}
                                    type="button"
                                    className={['mano-cap', soon ? 'is-soon' : ''].join(' ')}
                                    onClick={() => onPick?.(cap)}
                                    disabled={disabled || soon}
                                    aria-label={`${cap.title}${soon ? ', por lanzarse' : ''}`}
                                >
                                    <span className="ico" aria-hidden="true">{cap.icon}</span>
                                    <span className="txt">
                                        <span className="ct">
                                            {cap.title}
                                            {soon && <span className="soon">Por lanzarse</span>}
                                        </span>
                                        <span className="cd">{cap.desc}</span>
                                        {cap.tool && <span className="tool-id">{cap.tool}()</span>}
                                    </span>
                                    {!soon && <span className="arrow" aria-hidden="true">›</span>}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            <style>{`
                .mano-root { display: contents; }
                /* ===== EMBLEMA "LA MANO DE CHAGRA" ===== */
                .mano-emblema { width: 100%; height: 138px; display: block; margin: 2px auto 0; overflow: visible; }
                [data-theme="minimalista"] .mano-emblema { height: 108px; }
                .mano-hand { opacity: .26; transform-origin: 50% 92%; }
                .mano-hand-part { stroke: #19c79a; fill: none; stroke-linecap: round; }
                [data-theme="nature"] .mano-hand { opacity: .24; }
                [data-theme="nature"] .mano-hand-part { stroke: #8b6b43; }
                [data-theme="minimalista"] .mano-hand { opacity: .16; }
                [data-theme="minimalista"] .mano-hand-part { stroke: #2f6e5a; }
                .mano-twig { stroke: #19c79a; fill: none; stroke-width: 1.8; stroke-linecap: round; filter: drop-shadow(0 0 3px rgba(25,201,154,.5)); }
                .mano-mesh-l { stroke: #3be8a6; fill: none; stroke-width: 1.1; stroke-linecap: round; opacity: .45; }
                .mano-spore { fill: #cffff2; filter: drop-shadow(0 0 6px #19f0c0); }
                .mano-leaves { display: none; }
                [data-theme="nature"] .mano-twig { stroke: #795735; filter: none; }
                [data-theme="nature"] .mano-mesh { display: none; }
                [data-theme="nature"] .mano-spores { display: none; }
                [data-theme="nature"] .mano-leaves { display: block; }
                [data-theme="nature"] .mano-leaf { fill: #6c8b4d; stroke: #5c7a40; stroke-width: .7; }
                [data-theme="minimalista"] .mano-mesh,
                [data-theme="minimalista"] .mano-spores,
                [data-theme="minimalista"] .mano-leaves,
                [data-theme="minimalista"] .mano-twigs { display: none; }
                .mano-hand { animation: mano-rise .8s cubic-bezier(.22,.61,.36,1) both; }
                @keyframes mano-rise { from { transform: translateY(10px) scale(.94); } to { transform: none; } }
                .mano-twig, .mano-mesh-l {
                    stroke-dasharray: var(--len, 60); stroke-dashoffset: var(--len, 60);
                    animation: mano-draw .9s cubic-bezier(.22,.61,.36,1) both; animation-delay: .45s;
                }
                .mano-mesh-l { animation-delay: .8s; }
                @keyframes mano-draw { to { stroke-dashoffset: 0; } }
                .mano-tip {
                    opacity: 0; transform-box: fill-box; transform-origin: center; transform: scale(.2);
                    animation: mano-bloom .5s cubic-bezier(.34,1.56,.64,1) both; animation-delay: calc(.7s + var(--d, 0s));
                }
                @keyframes mano-bloom { to { opacity: 1; transform: scale(1); } }

                /* ===== LISTA DE CAPACIDADES (ramas/hifas que cuelgan de la mano) ===== */
                .mano-caps {
                    position: relative; padding: 6px 16px 16px 22px; overflow-y: auto;
                    -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
                }
                .mano-caps::before {
                    content: ''; position: absolute; left: 32px; top: 0; bottom: 12px; width: 2.5px;
                    border-radius: 999px; pointer-events: none;
                    background: linear-gradient(to bottom, rgb(var(--t-accent-rgb) / .7), rgb(var(--t-accent-rgb) / .12));
                }
                [data-theme="nature"] .mano-caps::before { width: 3px; background: linear-gradient(to bottom, #795735, #9a7349 60%, #6c8b4d); }
                [data-theme="minimalista"] .mano-caps { padding-left: 16px; }
                [data-theme="minimalista"] .mano-caps::before { display: none; }
                .mano-branch-h {
                    display: flex; align-items: center; gap: 9px; margin: 13px 0 4px;
                    font-size: .62rem; font-weight: 900; letter-spacing: .09em; text-transform: uppercase;
                    color: rgb(var(--t-accent-rgb));
                }
                .mano-branch-h .knot {
                    width: 11px; height: 11px; border-radius: 50%; flex: none; margin-left: 6px;
                    background: rgb(var(--t-accent-rgb)); box-shadow: 0 0 10px rgb(var(--t-accent-rgb) / .6);
                }
                [data-theme="nature"] .mano-branch-h .knot { background: #795735; box-shadow: none; }
                [data-theme="minimalista"] .mano-branch-h { color: rgb(var(--c-slate-400)); }
                [data-theme="minimalista"] .mano-branch-h .knot { display: none; }
                .mano-cap {
                    position: relative; z-index: 1; display: flex; align-items: flex-start; gap: 11px;
                    width: 100%; font: inherit; text-align: left; margin: 7px 0 7px 16px;
                    background: rgb(var(--c-surface-card)); border: 1px solid rgb(var(--c-surface-border));
                    border-radius: 8px 20px 20px 20px; padding: 11px 13px; cursor: pointer;
                    transition: transform .16s cubic-bezier(.22,.61,.36,1), background .18s ease, box-shadow .2s ease, border-color .2s ease;
                    box-shadow: 0 3px 10px -7px rgba(0,0,0,.5);
                }
                .mano-cap::before { content: ''; position: absolute; left: -19px; top: 22px; width: 15px; height: 2px; background: rgb(var(--t-accent-rgb) / .5); }
                .mano-cap::after {
                    content: ''; position: absolute; left: -25px; top: 17px; width: 11px; height: 11px;
                    border-radius: 50% 50% 50% 0; background: rgb(var(--t-accent-rgb));
                    box-shadow: 0 0 9px rgb(var(--t-accent-rgb) / .5);
                }
                [data-theme="nature"] .mano-cap { border-color: rgb(122 143 74 / .35); border-radius: 6px 18px 18px 18px; }
                [data-theme="nature"] .mano-cap::before { background: #8b6b43; }
                [data-theme="nature"] .mano-cap::after { background: #6c8b4d; box-shadow: none; border-radius: 50% 0 50% 50%; }
                [data-theme="minimalista"] .mano-cap { border-radius: 14px; margin-left: 0; }
                [data-theme="minimalista"] .mano-cap::before, [data-theme="minimalista"] .mano-cap::after { display: none; }
                .mano-cap:hover { border-color: rgb(var(--t-accent-rgb) / .45); box-shadow: 0 0 18px -7px rgb(var(--t-accent-rgb) / .5); }
                .mano-cap:active { transform: scale(.985); }
                .mano-cap.is-soon { opacity: .46; filter: saturate(.5); cursor: default; }
                .mano-cap.is-soon::after { background: transparent; border: 1.5px solid rgb(var(--c-slate-500)); box-shadow: none; }
                .mano-cap .ico {
                    width: 42px; height: 42px; flex: none; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center; font-size: 1.4rem;
                    background: rgb(var(--t-accent-rgb) / .12); border: 1px solid rgb(var(--t-accent-rgb) / .22);
                }
                .mano-cap .txt { flex: 1; min-width: 0; }
                .mano-cap .ct { font-weight: 800; font-size: .94rem; color: rgb(var(--c-slate-100)); display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
                .mano-cap .cd { font-size: .8rem; color: rgb(var(--c-slate-300)); line-height: 1.4; margin-top: 2px; }
                .mano-cap .soon { display: inline-flex; border: 1px solid currentColor; border-radius: 999px; padding: 1px 7px; color: rgb(var(--c-slate-400)); font-size: .55rem; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; }
                .mano-cap .tool-id { display: none; font-size: .66rem; font-weight: 700; color: rgb(var(--t-accent-rgb)); margin-top: 5px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
                [data-nivel="detallado"] .mano-cap .tool-id {
                    display: inline-block; background: rgb(var(--t-accent-rgb) / .08);
                    border: 1px solid rgb(var(--t-accent-rgb) / .2); padding: 2px 7px; border-radius: 7px;
                }
                .mano-cap .arrow { align-self: center; color: rgb(var(--t-accent-rgb)); font-size: 1.2rem; opacity: .6; flex: none; transition: transform .16s ease; }
                .mano-cap:active .arrow { transform: translateX(2px); }
                @media (max-width: 360px) {
                    .mano-caps { padding-left: 18px; }
                    .mano-cap { margin-left: 13px; }
                    .mano-cap .ico { width: 38px; height: 38px; font-size: 1.25rem; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .mano-hand { animation: none !important; transform: none !important; }
                    .mano-twig, .mano-mesh-l { stroke-dashoffset: 0 !important; animation: none !important; }
                    .mano-tip { opacity: 1 !important; transform: none !important; animation: none !important; }
                }
            `}</style>
        </div>
    );
}
