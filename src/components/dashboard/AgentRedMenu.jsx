import { useEffect, useRef, useState } from 'react';
import { CAPABILITY_MANIFEST } from '../../services/agentCapabilities';

/**
 * AgentRedMenu — menú VIVO de capacidades de Chagra (red/árbol orgánico).
 *
 * PORT FIEL del demo aprobado por el operador (`/tmp/red-demo/fable.html`,
 * "aprobados los dos están del putas"): geometría calculada en vivo, ramas
 * Bézier orgánicas con semilla estable, relajación anticolisión, animación
 * por rAF con lerps exponenciales, 3 temas (biopunk/nature/minimalista),
 * nodos icon-first (emoji a color) y 2 niveles grupo→capacidad.
 *
 * Diferencias de integración vs el demo (contrato de producción):
 *   - Datos REALES del manifiesto único (CAPABILITY_MANIFEST, hero===true),
 *     agrupados por `group`. `status==='soon'` → atenuado/punteado, rótulo
 *     "por lanzar", NO clickeable.
 *   - `onPick(cap)` al tocar una hoja viva; el padre rutea (heroRoute).
 *   - El tema se LEE de <html data-theme> (lo escribe useTheme/applyTheme;
 *     biopunk = sin atributo). MutationObserver re-evalúa cambios en vivo.
 *     Sin barra selectora propia (eso vive en Perfil).
 *   - Sin FAB Ⓐ, sin sheet y SIN MARCO propio: se renderiza INTEGRADO en el
 *     lienzo del AgentHero (la zona-respiro), full-bleed y transparente — la
 *     escena del hero por tema es el fondo. El contenedor padre decide el
 *     alto (height:100%).
 *   - UNA SOLA Ⓐ (operador 2026-06-10): el menú NO renderiza nodo raíz propio.
 *     La raíz geométrica de la red ES el botón Ⓐ real del compositor (vive en
 *     AgentHero, abajo-izquierda); el padre lo comparte vía `anchorRef` y acá
 *     se mide su centro en coordenadas del lienzo (queda bajo el borde
 *     inferior — las ramas brotan del borde apuntando exactamente al botón).
 *   - `prefers-reduced-motion` → sin loop rAF: un solo paint al estado final.
 *   - Cleanup completo: rAF, timers, ResizeObserver, MutationObserver, paths.
 *
 * Mecánicas por tema (refinamiento 2026-06-10):
 *   - biopunk / minimalista → "micorriza": la red brota del botón Ⓐ
 *     (abajo-izquierda) y se despliega en diagonal hacia ARRIBA-DERECHA,
 *     al espacio libre del hero. Al enfocar, el grupo VIAJA al hub (sobre la
 *     diagonal) y los demás se vuelven yemas recogidas junto al origen.
 *   - nature → "árbol": tronco vertical CENTRADO que brota + ramas alternadas;
 *     una vena/raíz orgánica conecta el botón Ⓐ con la base del tronco (un
 *     solo organismo). Al enfocar, el follaje brota EN SITIO.
 */

/* ══════════════ datos: grupos derivados del manifiesto ══════════════ */

const GROUP_META = Object.freeze({
  cultivo: { icon: '🌱', label: 'Mis cultivos' },
  cuidar: { icon: '🐛', label: 'Cuidar y prevenir' },
  observar: { icon: '👁️', label: 'Mirar la finca' },
  registrar: { icon: '📝', label: 'Guardar lo que hago' },
  planear: { icon: '📅', label: 'Planear' },
  aprender: { icon: '📚', label: 'Aprender' },
  vender: { icon: '💰', label: 'Vender mejor' },
});

const GROUP_ORDER = Object.freeze([
  'cultivo', 'cuidar', 'observar', 'registrar', 'planear', 'aprender', 'vender',
]);

const GROUPS = GROUP_ORDER
  .map((key) => ({
    key,
    icon: GROUP_META[key].icon,
    label: GROUP_META[key].label,
    leaves: CAPABILITY_MANIFEST.filter((e) => e.hero === true && e.group === key),
  }))
  .filter((g) => g.leaves.length > 0);

/* ══════════════ helpers geométricos (puros, port 1:1) ══════════════ */

const SVGNS = 'http://www.w3.org/2000/svg';
const r1 = (n) => Math.round(n * 10) / 10;
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const ease3 = (t) => 1 - Math.pow(1 - t, 3);

/** Pseudo-random determinista por semilla (formas estables entre frames). */
function rand(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function mkPath(parent, cls) {
  const p = document.createElementNS(SVGNS, 'path');
  if (cls) p.setAttribute('class', cls);
  parent.appendChild(p);
  return p;
}

/** Curva orgánica origen→nodo: cúbica con vaivén perpendicular sembrado. */
function organic(p0, p1, seed) {
  const dx = p1.x - p0.x, dy = p1.y - p0.y, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const sg = (seed % 2 ? 1 : -1);
  const w1 = sg * (0.12 + rand(seed) * 0.10);
  const w2 = -sg * (0.07 + rand(seed + 9) * 0.08);
  const c1 = { x: p0.x + dx * 0.30 + nx * len * w1, y: p0.y + dy * 0.30 + ny * len * w1 };
  const c2 = { x: p0.x + dx * 0.72 + nx * len * w2, y: p0.y + dy * 0.72 + ny * len * w2 };
  return {
    d: `M${r1(p0.x)} ${r1(p0.y)} C${r1(c1.x)} ${r1(c1.y)} ${r1(c2.x)} ${r1(c2.y)} ${r1(p1.x)} ${r1(p1.y)}`,
    p0, c1, c2, p1,
  };
}

function bezObj(p0, c1, c2, p1) {
  return {
    d: `M${r1(p0.x)} ${r1(p0.y)} C${r1(c1.x)} ${r1(c1.y)} ${r1(c2.x)} ${r1(c2.y)} ${r1(p1.x)} ${r1(p1.y)}`,
    p0, c1, c2, p1,
  };
}

function cubicPt(b, t) {
  const u = 1 - t;
  return {
    x: u * u * u * b.p0.x + 3 * u * u * t * b.c1.x + 3 * u * t * t * b.c2.x + t * t * t * b.p1.x,
    y: u * u * u * b.p0.y + 3 * u * u * t * b.c1.y + 3 * u * t * t * b.c2.y + t * t * t * b.p1.y,
  };
}

function cubicTan(b, t) {
  const u = 1 - t;
  return {
    x: 3 * u * u * (b.c1.x - b.p0.x) + 6 * u * t * (b.c2.x - b.c1.x) + 3 * t * t * (b.p1.x - b.c2.x),
    y: 3 * u * u * (b.c1.y - b.p0.y) + 6 * u * t * (b.c2.y - b.c1.y) + 3 * t * t * (b.p1.y - b.c2.y),
  };
}

/** Ramita decorativa que sale de la rama madre en t, hacia el lado dir. */
function twigD(b, t, dir) {
  const p = cubicPt(b, t), tn = cubicTan(b, t), l = Math.hypot(tn.x, tn.y) || 1;
  const nx = -tn.y / l, ny = tn.x / l, tx = tn.x / l, ty = tn.y / l;
  const m = { x: p.x + nx * 7 * dir + tx * 6, y: p.y + ny * 7 * dir + ty * 6 };
  const e = { x: p.x + nx * 16 * dir + tx * 10, y: p.y + ny * 16 * dir + ty * 10 - 4 };
  return `M${r1(p.x)} ${r1(p.y)} Q${r1(m.x)} ${r1(m.y)} ${r1(e.x)} ${r1(e.y)}`;
}

function setDash(p, L, e) {
  p.setAttribute('stroke-dasharray', L);
  p.setAttribute('stroke-dashoffset', L * (1 - e));
}
function clearDash(p) {
  p.removeAttribute('stroke-dasharray');
  p.removeAttribute('stroke-dashoffset');
}

/** Relajación anticolisión: separa puntos a minD dentro del bound bd. */
function relax(pts, minD, bd) {
  for (let it = 0; it < 32; it++) {
    let moved = false;
    for (let a = 0; a < pts.length; a++) {
      for (let b = a + 1; b < pts.length; b++) {
        let dx = pts[b].x - pts[a].x, dy = pts[b].y - pts[a].y, d = Math.hypot(dx, dy);
        if (d < minD) {
          moved = true;
          if (d < 1) { dx = 1; dy = 0; d = 1; }
          const push = (minD - d) / 2 / d;
          pts[a].x -= dx * push; pts[a].y -= dy * push;
          pts[b].x += dx * push; pts[b].y += dy * push;
        }
      }
    }
    pts.forEach((p) => { p.x = clampN(p.x, bd.x0, bd.x1); p.y = clampN(p.y, bd.y0, bd.y1); });
    if (!moved) break;
  }
}

/* Factores radiales por grupo (alterna lejos/cerca para look orgánico). */
const KS = [0.98, 0.62, 0.95, 0.73, 0.95, 0.62, 0.98];

/* Esporas/polen/hojas ambiente — parámetros sembrados, estables. */
const SPORES = Array.from({ length: 16 }, (_, k) => ({
  lx: `${(6 + rand(k + 3) * 88).toFixed(1)}%`,
  dur: `${(7 + rand(k + 9) * 7).toFixed(1)}s`,
  del: `${(-rand(k + 17) * 12).toFixed(1)}s`,
  dx: `${((rand(k + 5) - 0.5) * 70).toFixed(0)}px`,
  rise: `${(180 + rand(k + 7) * 280).toFixed(0)}px`,
}));

/** Tema efectivo desde <html data-theme> (useTheme ya resolvió 'auto'). */
function readThemeKind() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'nature') return 'nature';
  if (t === 'minimalista') return 'min';
  return 'biopunk';
}

/** Activación por teclado de los nodos role="button". */
function pressKey(ev, fn) {
  if (ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault();
    fn();
  }
}

/** Rebote táctil del ícono (reinicia la animación CSS). */
function bounce(el) {
  el.classList.remove('arm-tap');
  void el.offsetWidth;
  el.classList.add('arm-tap');
}

/* ══════════════ estilos (CSS del demo, scoped arm-) ══════════════ */

const CSS = `
/* SIN MARCO (operador 2026-06-09): nada de caja con borde/radius/fondo —
   la red respira full-bleed sobre el lienzo del AgentHero; el padre da el
   alto. Solo overflow:hidden para que esporas/ramas no se salgan. */
.arm-root{
  position:relative;width:100%;height:100%;min-height:380px;
  overflow:hidden;background:transparent;
  -webkit-tap-highlight-color:transparent;
  /* ---- tema biopunk (base) ---- */
  --fam:ui-monospace,'Cascadia Mono',Menlo,Consolas,monospace;
  --lblSize:13px; --lblSp:.01em; --lblW:800;
  --lblC:#ffffff; --lblBg:rgba(3,12,9,.9); --lblEdge:rgba(25,199,154,.55);
  --lblShadow:0 2px 8px rgba(0,0,0,.6);
  --branch:#19c79a; --coreW:2.2px;
  --glowC:rgba(25,199,154,.30); --glowW:8px; --glowO:1; --glowBlur:3px;
  --twigC:rgba(25,199,154,.55);
  --orbBg:radial-gradient(circle at 32% 28%,#15222e,#0b121b 72%);
  --ringGroup:rgba(25,199,154,.85); --ringLeaf:rgba(25,199,154,.6); --ringW:2px;
  --orbShadow:0 0 22px rgba(25,199,154,.32),0 0 6px rgba(25,199,154,.5),inset 0 0 16px rgba(25,199,154,.10);
  --orbRadA:50%; --orbRadB:50%;
  --pulse:rgba(25,199,154,.55);
  --spore:#19c79a; --spO:.7;
  --crumbBg:rgba(25,199,154,.16); --crumbC:#c8f3e2; --crumbEdge:rgba(25,199,154,.45);
  --toastBg:#0e1a18; --toastC:#d8f7e9; --toastEdge:rgba(25,199,154,.45);
  --hintC:rgba(190,240,220,.85);
  --trunkC:#19c79a; --trunkHi:#7defc9;
}
/* ---- tema nature (árbol real) ---- */
.arm-root[data-armtheme="nature"]{
  --fam:'Iowan Old Style','Palatino Linotype','Book Antiqua',Palatino,Georgia,serif;
  --lblSize:13.5px; --lblSp:0; --lblW:700;
  --lblC:#2e2414; --lblBg:rgba(255,250,238,.95); --lblEdge:rgba(121,87,53,.5);
  --lblShadow:0 2px 6px rgba(90,60,30,.22);
  --branch:#6e4f2e; --coreW:4px;
  --glowC:rgba(121,87,53,.22); --glowW:9px; --glowO:1; --glowBlur:1.5px;
  --twigC:rgba(110,79,46,.6);
  --orbBg:radial-gradient(circle at 35% 30%,#fffdf4,#efe3c6 78%);
  --ringGroup:rgba(110,79,46,.85); --ringLeaf:rgba(95,124,66,.95); --ringW:2.5px;
  --orbShadow:0 4px 14px rgba(90,60,30,.25),inset 0 1px 0 #fff;
  --orbRadA:58% 42% 55% 45% / 45% 58% 42% 55%;
  --orbRadB:44% 56% 48% 52% / 56% 44% 58% 42%;
  --pulse:rgba(95,124,66,.5);
  --spore:#7c9a4e; --spO:.6;
  --crumbBg:rgba(255,250,238,.9); --crumbC:#4a3a1f; --crumbEdge:rgba(121,87,53,.45);
  --toastBg:#fffaf0; --toastC:#3c2f18; --toastEdge:rgba(121,87,53,.4);
  --hintC:rgba(74,58,31,.8);
  --trunkC:#6e4f2e; --trunkHi:#a37c4f;
}
/* ---- tema minimalista ---- */
.arm-root[data-armtheme="min"]{
  --fam:Futura,'Avenir Next','Century Gothic','Trebuchet MS',Verdana,sans-serif;
  --lblSize:12.5px; --lblSp:.02em; --lblW:700;
  --lblC:#143d31; --lblBg:rgba(255,255,255,.96); --lblEdge:rgba(47,110,90,.35);
  --lblShadow:0 1px 4px rgba(30,40,35,.12);
  --branch:#2f6e5a; --coreW:1.6px;
  --glowC:transparent; --glowW:0px; --glowO:0; --glowBlur:0px;
  --twigC:rgba(47,110,90,.45);
  --orbBg:#ffffff;
  --ringGroup:rgba(47,110,90,.6); --ringLeaf:rgba(47,110,90,.45); --ringW:1.5px;
  --orbShadow:0 2px 6px rgba(30,40,35,.1);
  --orbRadA:50%; --orbRadB:50%;
  --pulse:transparent;
  --spore:transparent; --spO:0;
  --crumbBg:#ffffff; --crumbC:#1f5847; --crumbEdge:rgba(47,110,90,.35);
  --toastBg:#ffffff; --toastC:#1f5847; --toastEdge:rgba(47,110,90,.3);
  --hintC:rgba(31,88,71,.7);
  --trunkC:#2f6e5a; --trunkHi:#5ea58d;
}
.arm-root.arm-disabled{pointer-events:none;opacity:.55}
/* La textura de ruido del demo se quitó en la integración: sobre el lienzo
   transparente del hero dibujaba un rectángulo "sucio" (el marco que el
   operador rechazó). El grano ambiente lo pone la escena del hero. */
.arm-web{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}
.arm-gtrunk path{fill:none;stroke-linecap:round;transition:stroke .5s}
.arm-gtrunk .tkB{stroke:var(--trunkC);stroke-width:17px}
.arm-gtrunk .tkO{stroke:var(--trunkC);stroke-width:10px}
.arm-gtrunk .tkI{stroke:var(--trunkHi);stroke-width:3.5px;opacity:.8}
/* vena Ⓐ→tronco (nature): raíz superficial que conecta el botón del agente
   con la base del tronco centrado — un solo organismo, no dos piezas. */
.arm-gtrunk .vnO{stroke:var(--trunkC);stroke-width:8px;opacity:.95}
.arm-gtrunk .vnI{stroke:var(--trunkHi);stroke-width:2.6px;opacity:.75}
.arm-gglow{opacity:var(--glowO);filter:blur(var(--glowBlur));animation:armBreathe 4.5s ease-in-out infinite}
.arm-gglow path{stroke:var(--glowC);stroke-width:var(--glowW);fill:none;stroke-linecap:round;transition:stroke .5s}
.arm-gcore path{stroke:var(--branch);stroke-width:var(--coreW);fill:none;stroke-linecap:round;transition:stroke .5s}
.arm-gcore path.lf{stroke-width:calc(var(--coreW)*.78)}
.arm-gtwig path{stroke:var(--twigC);stroke-width:1.1px;fill:none;stroke-linecap:round;transition:stroke .5s}
.arm-gtwig path.rt{opacity:.62;stroke-width:1.4px}
.arm-gtwig path.gd{opacity:.65;stroke-width:2.2px}
@keyframes armBreathe{0%,100%{opacity:var(--glowO)}50%{opacity:calc(var(--glowO)*.55)}}
.arm-spores{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden}
.arm-sp{position:absolute;left:var(--lx);bottom:30px;width:3px;height:3px;border-radius:50%;
  background:var(--spore);box-shadow:0 0 7px var(--spore);opacity:0;
  animation:armRise var(--dur) linear infinite;animation-delay:var(--del)}
@keyframes armRise{
  0%{transform:none;opacity:0}
  12%{opacity:var(--spO)}
  82%{opacity:calc(var(--spO)*.3)}
  100%{transform:translate(var(--dx),calc(-1*var(--rise)));opacity:0}
}
/* en nature las esporas son hojitas que CAEN */
.arm-root[data-armtheme="nature"] .arm-sp{
  bottom:auto;top:-16px;width:7px;height:5px;border-radius:60% 40% 60% 40%;
  box-shadow:none;animation-name:armFall;
}
@keyframes armFall{
  0%{transform:none;opacity:0}
  10%{opacity:var(--spO)}
  85%{opacity:calc(var(--spO)*.4)}
  100%{transform:translate(var(--dx),var(--rise)) rotate(320deg);opacity:0}
}
.arm-nodes{position:absolute;inset:0;z-index:3;pointer-events:none}
.arm-node{
  position:absolute;left:0;top:0;width:72px;height:72px;margin:-36px 0 0 -36px;
  pointer-events:auto;cursor:pointer;-webkit-tap-highlight-color:transparent;
  touch-action:manipulation;will-change:transform,opacity;z-index:3;
}
.arm-node::before{content:"";position:absolute;inset:-10px} /* target de toque >= 92px */
.arm-node.arm-leaf{width:66px;height:66px;margin:-33px 0 0 -33px;z-index:5}
/* (el nodo raíz Ⓐ propio del menú se ELIMINÓ — operador 2026-06-10: una sola
   Ⓐ, la del botón del agente en el compositor; la red nace de ese ancla) */
.arm-orb{
  position:absolute;inset:0;display:grid;place-items:center;
  background:var(--orbBg);border:var(--ringW) solid var(--ringGroup);
  border-radius:var(--orbRadA);box-shadow:var(--orbShadow);
  transition:background .5s,border-color .5s,box-shadow .5s,border-radius .5s;
  will-change:transform;
}
.arm-node:nth-child(even) .arm-orb{border-radius:var(--orbRadB)}
.arm-node.arm-leaf .arm-orb{border-color:var(--ringLeaf)}
.arm-node.arm-group .arm-orb::after{
  content:"";position:absolute;inset:-5px;border-radius:inherit;
  border:1px solid var(--pulse);animation:armPing 3.4s ease-out infinite;
  animation-delay:var(--pd,0s);
}
@keyframes armPing{0%{transform:scale(.88);opacity:.8}70%,100%{transform:scale(1.4);opacity:0}}
.arm-ic{display:block;font-size:35px;font-style:normal;
  animation:armSway var(--swD,5s) ease-in-out var(--swDel,0s) infinite alternate}
.arm-node.arm-leaf .arm-ic{font-size:31px}
@keyframes armSway{from{transform:translateY(-1.4px) rotate(-2.4deg)}to{transform:translateY(1.4px) rotate(2.4deg)}}
.arm-node.arm-tap .arm-ic{animation:armTapB .45s cubic-bezier(.34,1.6,.5,1)}
@keyframes armTapB{0%{transform:scale(1)}40%{transform:scale(1.3)}100%{transform:scale(1)}}
.arm-lbl{
  position:absolute;top:calc(100% + 4px);left:50%;transform:translateX(-50%);
  max-width:128px;min-width:58px;width:max-content;text-align:center;pointer-events:none;
  font-family:var(--fam);font-size:var(--lblSize);font-weight:var(--lblW);line-height:1.22;
  letter-spacing:var(--lblSp);
  color:var(--lblC);background:var(--lblBg);border:1px solid var(--lblEdge);
  border-radius:10px;padding:4px 8px;box-shadow:var(--lblShadow);
  transition:color .5s,background .5s;
}
.arm-badge{display:inline-block;margin-top:3px;font-size:9px;font-weight:700;letter-spacing:.08em;
  text-transform:uppercase;border:1px solid currentColor;border-radius:99px;
  padding:2px 7px;opacity:.9}
.arm-node.arm-soon{cursor:default}
.arm-node.arm-soon .arm-orb{border-style:dashed}
/* pista de uso — abajo-derecha: la esquina libre con la red brotando del
   botón Ⓐ (abajo-izquierda) hacia arriba-derecha. */
.arm-hint{position:absolute;right:14px;bottom:10px;z-index:4;
  font-family:var(--fam);font-size:13.5px;font-weight:700;letter-spacing:.04em;color:var(--hintC);
  pointer-events:none;transition:opacity .6s;white-space:nowrap}
.arm-hint.off{opacity:0}
.arm-crumb{
  position:absolute;left:10px;top:10px;z-index:7;display:flex;align-items:center;gap:6px;
  font-family:var(--fam);font-size:14px;font-weight:700;letter-spacing:var(--lblSp);
  color:var(--crumbC);background:var(--crumbBg);border:1.5px solid var(--crumbEdge);
  border-radius:99px;padding:10px 16px 10px 12px;cursor:pointer;min-height:42px;
  transition:.3s;
}
.arm-toast{
  position:absolute;left:50%;bottom:14px;transform:translateX(-50%) translateY(16px);z-index:9;
  background:var(--toastBg);color:var(--toastC);border:1.5px solid var(--toastEdge);
  border-radius:99px;padding:11px 18px;font-family:var(--fam);font-size:14px;font-weight:700;
  letter-spacing:.02em;opacity:0;pointer-events:none;white-space:nowrap;
  transition:opacity .3s,transform .3s;box-shadow:0 6px 20px rgba(0,0,0,.25);
}
.arm-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
@media (prefers-reduced-motion: reduce){
  .arm-root *,.arm-root *::before,.arm-root *::after{animation:none !important;transition:none !important}
}
`;

/* ══════════════ componente ══════════════ */

export default function AgentRedMenu({ onPick, disabled = false, anchorRef = null }) {
  const rootRef = useRef(null);
  const engineRef = useRef(null);
  const toastTimerRef = useRef(null);
  const [themeKind, setThemeKind] = useState(readThemeKind);
  const [focusedIdx, setFocusedIdx] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  /* Tema: leer <html data-theme> y re-evaluar en vivo (MutationObserver). */
  useEffect(() => {
    const mo = new MutationObserver(() => setThemeKind(readThemeKind()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);

  /* Toast: limpiar el timer al desmontar. */
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const treeMode = themeKind === 'nature';

  /* Motor imperativo: layout + rAF (port del demo). Re-brota al cambiar
     entre mecánica micorriza (biopunk/min) y árbol (nature). */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const svg = root.querySelector('[data-arm="web"]');
    const gTrunk = root.querySelector('[data-arm="gTrunk"]');
    const gGlow = root.querySelector('[data-arm="gGlow"]');
    const gCore = root.querySelector('[data-arm="gCore"]');
    const gTwig = root.querySelector('[data-arm="gTwig"]');
    const tkB = root.querySelector('[data-arm="tkB"]');
    const tkO = root.querySelector('[data-arm="tkO"]');
    const tkI = root.querySelector('[data-arm="tkI"]');
    const vnO = root.querySelector('[data-arm="vnO"]');
    const vnI = root.querySelector('[data-arm="vnI"]');
    const rootlets = root.querySelector('[data-arm="rootlets"]');
    const ground = root.querySelector('[data-arm="ground"]');
    const hintEl = root.querySelector('[data-arm="hint"]');

    /* estado de simulación por grupo/hoja (paths SVG creados acá). */
    const sim = GROUPS.map((g, i) => {
      const el = root.querySelector(`[data-arm-group="${i}"]`);
      return {
        i,
        el,
        orb: el.querySelector('.arm-orb'),
        lblEl: el.querySelector('.arm-lbl'),
        pGlow: mkPath(gGlow, ''),
        pCore: mkPath(gCore, ''),
        tw1: mkPath(gTwig, ''),
        tw2: mkPath(gTwig, ''),
        x: 0, y: 0, scl: 0, alp: 0, vis: 0, visT: 0, lbl: 0,
        leafTimers: [], growTimer: null,
        leafAbsR: [], leafOffR: [], leafAbsT: [], leafOffT: [],
        leaves: g.leaves.map((cap, j) => {
          const lel = root.querySelector(`[data-arm-leaf="${i}-${j}"]`);
          return {
            el: lel,
            orb: lel.querySelector('.arm-orb'),
            lblEl: lel.querySelector('.arm-lbl'),
            soon: cap.status === 'soon',
            pGlow: mkPath(gGlow, 'lf'),
            pCore: mkPath(gCore, 'lf'),
            grow: 0, growT: 0,
          };
        }),
      };
    });

    const N = sim.length;
    const denom = Math.max(1, N - 1);
    let W = 0, H = 0, cx = 0, rootPt = { x: 0, y: 0 }, hub = { x: 0, y: 0 };
    let posOver = [], posBud = [];
    let trunkBez = null, trunkLen = 1, venaLen = 1, attachPts = [], treePos = [], treeFocus = [];
    let trunkV = 0, trunkVT = 0;
    let focused = null;
    let rafId = null, last = 0, animUntil = 0;
    let didSprout = false;

    /* ── layout: geometría viva calculada al tamaño real ── */
    function layout() {
      W = root.clientWidth;
      H = root.clientHeight;
      if (!W || !H) return;
      cx = W / 2;

      /* LA RAÍZ ES EL BOTÓN Ⓐ REAL del compositor (vive en AgentHero, abajo-
         izquierda). Medimos su centro en coordenadas de este lienzo: queda
         BAJO el borde inferior (el compositor está debajo de la zona-respiro),
         así las ramas brotan del borde apuntando exactamente al botón — una
         sola Ⓐ, un solo organismo. Sin ancla (tests/jsdom): fallback
         abajo-izquierda equivalente. */
      const aEl = anchorRef && anchorRef.current;
      const rb = root.getBoundingClientRect();
      if (aEl && rb.width > 0) {
        const ab = aEl.getBoundingClientRect();
        rootPt = {
          x: clampN(ab.left + ab.width / 2 - rb.left, 24, W - 24),
          y: Math.max(H - 8, ab.top + ab.height / 2 - rb.top),
        };
      } else {
        rootPt = { x: 46, y: H + 58 };
      }
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

      /* micorriza (biopunk/min): abanico diagonal hacia ARRIBA-DERECHA desde
         la Ⓐ (operador 2026-06-10) — del origen abajo-izquierda al espacio
         libre del hero. */
      const a0 = -1.45, a1 = -0.30; /* casi vertical → casi horizontal der. */
      const Rx = Math.max(120, W - rootPt.x - 84);
      const Ry = Math.max(140, rootPt.y - 96);
      posOver = sim.map((s, i) => {
        const a = a0 + (a1 - a0) * i / denom;
        const k = KS[i % KS.length];
        return {
          x: rootPt.x + Math.cos(a) * Rx * k + (rand(i + 31) - 0.5) * 18,
          y: rootPt.y + Math.sin(a) * Ry * k + (rand(i + 47) - 0.5) * 18,
        };
      });
      /* y1 deja libre la franja inferior (pista "toque una rama" + labels) */
      relax(posOver, 106, { x0: 62, x1: W - 62, y0: 82, y1: H - 118 });

      /* yemas: recogidas junto al origen (abajo-izquierda, sobre la Ⓐ) */
      posBud = sim.map((s, i) => {
        const a = a0 + (a1 - a0) * i / denom, r = i % 2 ? 152 : 110;
        return { x: rootPt.x + Math.cos(a) * r, y: rootPt.y + Math.sin(a) * r * 0.9 };
      });
      relax(posBud, 46, { x0: 40, x1: W - 44, y0: H - 158, y1: H - 26 });

      /* hub del foco: sobre la diagonal, dejando aire arriba-derecha para
         que el follaje del grupo enfocado respire */
      hub = {
        x: clampN(rootPt.x + Math.min(132, W * 0.30), 96, Math.max(98, W - 150)),
        y: Math.max(132, H * 0.46),
      };
      const Lrx = Math.max(96, Math.min(152, W - hub.x - 62));
      const Lry = Math.max(72, Math.min(176, hub.y - 100, H - hub.y - 96));
      sim.forEach((s) => {
        const n = s.leaves.length;
        const sp = n > 1 ? Math.min(2.6, 0.9 * (n - 1)) : 0;
        const center = -0.55; /* abanico sesgado hacia arriba-derecha */
        s.leafAbsR = s.leaves.map((lf, j) => {
          const a = center + (n > 1 ? -sp / 2 + sp * j / (n - 1) : 0);
          return { x: hub.x + Math.cos(a) * Lrx, y: hub.y + Math.sin(a) * Lry };
        });
        relax(s.leafAbsR, 96, { x0: 60, x1: W - 60, y0: 84, y1: H - 70 });
        s.leafOffR = s.leafAbsR.map((p) => ({ x: p.x - hub.x, y: p.y - hub.y }));
      });

      /* árbol (nature): tronco vertical CENTRADO (correcto funcional y
         visualmente — operador 2026-06-10) + ramas alternadas */
      const baseT = { x: cx, y: H - 56 };
      const topT = { x: cx + 10, y: Math.max(92, H * 0.14) };
      const Lh = baseT.y - topT.y;
      trunkBez = bezObj(
        baseT,
        { x: cx + 16, y: baseT.y - Lh * 0.32 },
        { x: cx - 18, y: baseT.y - Lh * 0.70 },
        topT,
      );
      trunkLen = Lh * 1.18;
      tkB.setAttribute('d', trunkBez.d);
      tkO.setAttribute('d', trunkBez.d);
      tkI.setAttribute('d', trunkBez.d);

      /* la VENA Ⓐ→tronco: raíz superficial que nace en el botón del agente
         y repta por el suelo hasta la base del tronco — la conexión elegante
         (un solo organismo, no dos piezas pegadas). */
      const venaBez = bezObj(
        rootPt,
        /* sube casi vertical sobre la Ⓐ (asoma temprano en el lienzo)… */
        { x: rootPt.x + 6, y: rootPt.y - Math.max(40, (rootPt.y - baseT.y - 26) * 0.55) },
        /* …y repta por el suelo hasta la base del tronco */
        { x: rootPt.x + (baseT.x - rootPt.x) * 0.45, y: baseT.y + 18 },
        { x: baseT.x - 2, y: baseT.y + 6 },
      );
      venaLen = Math.hypot(baseT.x - rootPt.x, baseT.y - rootPt.y) * 1.3 + 1;
      vnO.setAttribute('d', venaBez.d);
      vnI.setAttribute('d', venaBez.d);

      attachPts = []; treePos = []; treeFocus = [];
      sim.forEach((s, i) => {
        const t = 0.15 + 0.72 * i / denom;
        const ap = cubicPt(trunkBez, t);
        attachPts.push(ap);
        const side = i % 2 === 0 ? -1 : 1;
        const len = 128 + rand(i + 71) * 22;
        const nx = clampN(cx + side * len, 68, W - 68);
        const ny = ap.y - 30 - rand(i + 83) * 16;
        treePos.push({ x: nx, y: ny });
        treeFocus.push({ x: nx - side * 34, y: ny + 8 });
      });

      sim.forEach((s, i) => {
        const n = s.leaves.length;
        const side = i % 2 === 0 ? -1 : 1;
        const fp = treeFocus[i];
        const center = side < 0 ? -0.18 : Math.PI + 0.18; /* abanico hacia adentro */
        const spread = n > 1 ? Math.min(1.9, 0.85 * (n - 1)) : 0;
        const r = n > 3 ? 112 : 100;
        s.leafAbsT = s.leaves.map((lf, j) => {
          const a = center + (n > 1 ? -spread / 2 + spread * j / (n - 1) : 0) * (side < 0 ? 1 : -1);
          return { x: fp.x + Math.cos(a) * r, y: fp.y + Math.sin(a) * r };
        });
        relax(s.leafAbsT, 96, { x0: 64, x1: W - 64, y0: 78, y1: baseT.y - 54 });
        s.leafOffT = s.leafAbsT.map((p) => ({ x: p.x - fp.x, y: p.y - fp.y }));
      });

      /* decoración del arraigo:
         - nature: raicillas bajo la base del tronco + arco de suelo.
         - micorriza: boca de raicillas que brota de la Ⓐ hacia arriba-derecha
           (largos calculados para asomar SIEMPRE sobre el borde inferior). */
      let d = '';
      if (treeMode) {
        for (let k = 0; k < 5; k++) {
          const a = Math.PI * (0.15 + 0.7 * k / 4);
          const ex = baseT.x + Math.cos(a) * (24 + rand(k + 40) * 34);
          const ey = baseT.y + 10 + Math.sin(a) * (16 + rand(k + 50) * 30);
          const mx = baseT.x + (ex - baseT.x) * 0.35 + (rand(k + 60) - 0.5) * 10;
          const my = baseT.y + 12;
          d += `M${r1(baseT.x)} ${r1(baseT.y + 8)} Q${r1(mx)} ${r1(my)} ${r1(ex)} ${r1(ey)} `;
        }
      } else {
        const depth = Math.max(0, rootPt.y - H);
        for (let k = 0; k < 5; k++) {
          const a = -1.32 + 1.0 * k / 4; /* -76°..-18°: hacia arriba-derecha */
          const len = (depth + 26 + rand(k + 40) * 46) / Math.max(0.3, -Math.sin(a));
          const ex = clampN(rootPt.x + Math.cos(a) * len, 16, W - 28);
          const ey = rootPt.y + Math.sin(a) * len;
          const mx = rootPt.x + (ex - rootPt.x) * 0.45 + (rand(k + 60) - 0.5) * 14;
          const my = rootPt.y + Math.sin(a) * len * 0.45;
          d += `M${r1(rootPt.x)} ${r1(rootPt.y)} Q${r1(mx)} ${r1(my)} ${r1(ex)} ${r1(ey)} `;
        }
      }
      rootlets.setAttribute('d', d.trim());
      ground.setAttribute('d',
        `M${r1(cx - 108)} ${r1(baseT.y + 12)} Q${r1(cx)} ${r1(baseT.y + 26)} ${r1(cx + 108)} ${r1(baseT.y + 12)}`);
    }

    /* ── bucle rAF (con reduced-motion: un solo paint al estado final) ── */
    function frame(now) {
      if (!W || !H) { rafId = null; return; }
      const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
      last = now;
      const kp = reduced ? 1 : 1 - Math.exp(-dt * 8);
      const ka = reduced ? 1 : 1 - Math.exp(-dt * 11);
      const kv = reduced ? 1 : 1 - Math.exp(-dt * 5);
      const kl = reduced ? 1 : 1 - Math.exp(-dt * 6.5);
      let md = 0;
      const f = focused;

      gTrunk.style.display = treeMode ? '' : 'none';
      ground.style.display = treeMode ? '' : 'none';
      if (treeMode) {
        trunkV += (trunkVT - trunkV) * kv;
        md = Math.max(md, 200 * Math.abs(trunkVT - trunkV));
        const te = ease3(trunkV);
        if (trunkV < 0.995) {
          /* la vena brota PRIMERO desde la Ⓐ; el tronco la sigue */
          setDash(vnO, venaLen, Math.min(1, te * 2.6));
          setDash(vnI, venaLen, Math.min(1, te * 2.6));
          setDash(tkB, trunkLen, Math.min(1, te * 4));
          setDash(tkO, trunkLen, te);
          setDash(tkI, trunkLen, te);
        } else {
          clearDash(tkB); clearDash(tkO); clearDash(tkI);
          clearDash(vnO); clearDash(vnI);
        }
        gTrunk.style.opacity = f == null ? 1 : 0.55;
      }

      sim.forEach((g, i) => {
        let tp, ts, ta, tl;
        if (treeMode) {
          /* árbol: la rama NO viaja — el follaje brota en sitio */
          tp = f === i ? treeFocus[i] : treePos[i];
          ts = f == null ? 1 : (f === i ? 1.12 : 0.84);
          ta = (f == null ? 1 : (f === i ? 1 : 0.35)) * Math.min(1, g.vis * 1.5);
          tl = (f == null || f === i ? 1 : 0.3) * (g.vis > 0.75 ? 1 : 0);
        } else {
          /* micorriza: la rama enfocada viaja al hub, las demás son yemas */
          tp = f == null ? posOver[i] : (f === i ? hub : posBud[i]);
          ts = f == null ? 1 : (f === i ? 1.1 : 0.55);
          ta = (f == null || f === i ? 1 : 0.45) * Math.min(1, g.vis * 1.5);
          tl = (f == null || f === i ? 1 : 0) * (g.vis > 0.75 ? 1 : 0);
        }

        g.vis += (g.visT - g.vis) * kv;
        g.x += (tp.x - g.x) * kp; g.y += (tp.y - g.y) * kp;
        g.scl += (ts - g.scl) * ka; g.alp += (ta - g.alp) * ka; g.lbl += (tl - g.lbl) * ka;
        md = Math.max(md, Math.abs(tp.x - g.x), Math.abs(tp.y - g.y), 200 * Math.abs(g.visT - g.vis));

        const start = treeMode ? attachPts[i] : rootPt;
        const b = organic(start, { x: g.x, y: g.y }, i * 13 + 5);
        g.pCore.setAttribute('d', b.d); g.pGlow.setAttribute('d', b.d);
        const ve = ease3(g.vis);
        if (g.vis < 0.995) {
          const L = Math.hypot(g.x - start.x, g.y - start.y) * 1.3 + 1;
          setDash(g.pCore, L, ve); setDash(g.pGlow, L, ve);
        } else { clearDash(g.pCore); clearDash(g.pGlow); }
        const bo = (f == null || f === i) ? 1 : 0.3;
        g.pCore.style.opacity = bo; g.pGlow.style.opacity = bo;

        const tw = (f == null ? 0.55 : 0.1) * Math.max(0, (ve - 0.6) * 2.5);
        g.tw1.style.opacity = tw; g.tw2.style.opacity = tw;
        if (tw > 0.01) {
          g.tw1.setAttribute('d', twigD(b, 0.48, i % 2 ? 1 : -1));
          g.tw2.setAttribute('d', twigD(b, 0.72, i % 2 ? -1 : 1));
        }

        g.el.style.transform = `translate(${r1(g.x)}px,${r1(g.y)}px)`;
        g.el.style.opacity = g.alp.toFixed(3);
        g.el.style.zIndex = f === i ? 6 : 3;
        g.orb.style.transform = `scale(${(g.scl * Math.min(1, g.vis * 1.25)).toFixed(3)})`;
        g.lblEl.style.opacity = g.lbl.toFixed(3);

        g.leaves.forEach((lf, j) => {
          lf.grow += (lf.growT - lf.grow) * kl;
          md = Math.max(md, 200 * Math.abs(lf.growT - lf.grow));
          if (lf.grow < 0.02) {
            lf.el.style.display = 'none';
            lf.pCore.style.display = 'none'; lf.pGlow.style.display = 'none';
            return;
          }
          lf.el.style.display = ''; lf.pCore.style.display = ''; lf.pGlow.style.display = '';
          const e = ease3(lf.grow);
          const off = treeMode ? g.leafOffT[j] : g.leafOffR[j];
          const lx = g.x + off.x * e;
          const ly = g.y + off.y * e;
          const lb = organic({ x: g.x, y: g.y }, { x: lx, y: ly }, i * 31 + j * 7 + 2);
          lf.pCore.setAttribute('d', lb.d); lf.pGlow.setAttribute('d', lb.d);
          if (lf.grow < 0.995) {
            const L = Math.hypot(lx - g.x, ly - g.y) * 1.3 + 1;
            setDash(lf.pCore, L, e); setDash(lf.pGlow, L, e);
          } else { clearDash(lf.pCore); clearDash(lf.pGlow); }
          lf.el.style.transform = `translate(${r1(lx)}px,${r1(ly)}px)`;
          lf.el.style.opacity = ((lf.soon ? 0.72 : 1) * e).toFixed(3);
          lf.orb.style.transform = `scale(${(0.5 + 0.5 * e).toFixed(3)})`;
          lf.lblEl.style.opacity = e.toFixed(3);
        });
      });

      if (!reduced && (md > 0.35 || now < animUntil)) rafId = requestAnimationFrame(frame);
      else rafId = null;
    }

    function kick(ms) {
      if (reduced) { frame(performance.now()); return; }
      animUntil = Math.max(animUntil, performance.now() + (ms || 500));
      if (rafId == null) { last = performance.now(); rafId = requestAnimationFrame(frame); }
    }

    /* ── interacción ── */
    function setFocus(f) {
      focused = f;
      sim.forEach((s) => {
        s.leafTimers.forEach(clearTimeout);
        s.leafTimers = [];
        if (s.i === f) {
          s.leaves.forEach((lf, j) => {
            if (reduced) { lf.growT = 1; return; }
            s.leafTimers.push(setTimeout(() => { lf.growT = 1; kick(1200); }, 150 + j * 90));
          });
        } else {
          s.leaves.forEach((lf) => { lf.growT = 0; });
        }
      });
      if (f != null) hintEl.classList.add('off');
      setFocusedIdx(f);
      kick(1100);
    }

    function regrow() {
      didSprout = true;
      trunkV = 0;
      trunkVT = treeMode ? 1 : 0;
      sim.forEach((s, i) => {
        clearTimeout(s.growTimer);
        s.vis = 0; s.visT = 0; s.scl = 0; s.alp = 0; s.lbl = 0;
        const start = treeMode ? (attachPts[i] || rootPt) : rootPt;
        s.x = start.x; s.y = start.y;
        s.leaves.forEach((lf) => { lf.grow = 0; lf.growT = 0; });
        if (reduced) { s.visT = 1; return; }
        /* en árbol las ramas brotan de abajo hacia arriba siguiendo el tronco */
        const del = treeMode ? 340 + i * 120 : 220 + i * 95;
        s.growTimer = setTimeout(() => { s.visT = 1; kick(1600); }, del);
      });
      if (reduced) trunkV = trunkVT;
      setFocus(null);
      kick(2000);
    }

    engineRef.current = {
      toggleFocus: (i) => setFocus(focused === i ? null : i),
      clearFocus: () => setFocus(null),
    };

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        layout();
        if (!didSprout && W > 0 && H > 0) regrow();
        else kick(800);
      });
      ro.observe(root);
    }

    layout();
    if (W > 0 && H > 0) regrow();

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      sim.forEach((s) => {
        clearTimeout(s.growTimer);
        s.leafTimers.forEach(clearTimeout);
        [s.pGlow, s.pCore, s.tw1, s.tw2].forEach((p) => p.remove());
        s.leaves.forEach((lf) => { lf.pGlow.remove(); lf.pCore.remove(); });
      });
      engineRef.current = null;
    };
  }, [treeMode, anchorRef]);

  function showToast(msg) {
    setToastMsg(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 1700);
  }

  function handleGroupTap(i) {
    if (disabled) return;
    engineRef.current?.toggleFocus(i);
  }

  function handleLeafTap(ev, cap) {
    if (disabled) return;
    bounce(ev.currentTarget);
    if (cap.status === 'soon') {
      showToast(`${cap.icon} ${cap.label} — por lanzar`);
      return;
    }
    if (onPick) onPick(cap);
  }

  function handleRootTap() {
    if (disabled) return;
    engineRef.current?.clearFocus();
  }

  return (
    <div
      ref={rootRef}
      className={`arm-root${disabled ? ' arm-disabled' : ''}`}
      data-armtheme={themeKind}
      aria-label="Capacidades de Chagra"
    >
      <style>{CSS}</style>

      <svg className="arm-web" data-arm="web" preserveAspectRatio="none" aria-hidden="true">
        <g className="arm-gtrunk" data-arm="gTrunk">
          {/* vena Ⓐ→tronco primero: la base del tronco tapa la unión */}
          <path className="vnO" data-arm="vnO" />
          <path className="vnI" data-arm="vnI" />
          <path className="tkB" data-arm="tkB" />
          <path className="tkO" data-arm="tkO" />
          <path className="tkI" data-arm="tkI" />
        </g>
        <g className="arm-gglow" data-arm="gGlow" />
        <g className="arm-gcore" data-arm="gCore" />
        <g className="arm-gtwig" data-arm="gTwig">
          <path className="rt" data-arm="rootlets" />
          <path className="gd" data-arm="ground" />
        </g>
      </svg>

      <div className="arm-spores" aria-hidden="true">
        {SPORES.map((s, k) => (
          <i
            key={k}
            className="arm-sp"
            style={{ '--lx': s.lx, '--dur': s.dur, '--del': s.del, '--dx': s.dx, '--rise': s.rise }}
          />
        ))}
      </div>

      <div className="arm-nodes">
        {GROUPS.map((g, i) => (
          <div
            key={g.key}
            className="arm-node arm-group"
            role="button"
            tabIndex={0}
            aria-label={g.label}
            aria-expanded={focusedIdx === i}
            data-arm-group={i}
            style={{ opacity: 0, '--pd': `${i * 0.5}s` }}
            onClick={() => handleGroupTap(i)}
            onKeyDown={(ev) => pressKey(ev, () => handleGroupTap(i))}
          >
            <div className="arm-orb">
              <i
                className="arm-ic"
                style={{
                  '--swD': `${(4.2 + rand(i + 2) * 2.4).toFixed(1)}s`,
                  '--swDel': `${(-rand(i + 11) * 4).toFixed(1)}s`,
                }}
              >
                {g.icon}
              </i>
            </div>
            <div className="arm-lbl">{g.label}</div>
          </div>
        ))}

        {GROUPS.map((g, i) =>
          g.leaves.map((cap, j) => {
            const soon = cap.status === 'soon';
            return (
              <div
                key={cap.id}
                className={`arm-node arm-leaf${soon ? ' arm-soon' : ''}`}
                role="button"
                tabIndex={soon ? -1 : 0}
                aria-label={soon ? `${cap.label} (por lanzar)` : cap.label}
                aria-disabled={soon || disabled || undefined}
                data-arm-leaf={`${i}-${j}`}
                style={{ display: 'none' }}
                onClick={(ev) => handleLeafTap(ev, cap)}
                onKeyDown={(ev) => pressKey(ev, () => handleLeafTap(ev, cap))}
              >
                <div className="arm-orb">
                  <i
                    className="arm-ic"
                    style={{
                      '--swD': `${(3.8 + rand(i * 9 + j) * 2.5).toFixed(1)}s`,
                      '--swDel': `${(-rand(i + j + 19) * 4).toFixed(1)}s`,
                    }}
                  >
                    {cap.icon}
                  </i>
                </div>
                <div className="arm-lbl">
                  {cap.label}
                  {soon && (
                    <>
                      <br />
                      <span className="arm-badge">por lanzar</span>
                    </>
                  )}
                </div>
              </div>
            );
          }),
        )}

        {/* SIN nodo raíz Ⓐ propio (operador 2026-06-10): la única Ⓐ es el
            botón del agente en el compositor — la red nace de él. "Volver"
            vive en la miga (crumb) cuando hay un grupo enfocado. */}
      </div>

      <div className="arm-hint" data-arm="hint">⸙ toque una rama</div>

      {focusedIdx != null && (
        <button type="button" className="arm-crumb" onClick={handleRootTap}>
          ‹ <span>{GROUPS[focusedIdx].icon}</span>
          <span>{GROUPS[focusedIdx].label}</span>
        </button>
      )}

      <div className={`arm-toast${toastMsg ? ' show' : ''}`} role="status">
        {toastMsg}
      </div>
    </div>
  );
}
