import { useEffect, useRef, useState, useMemo } from 'react';
import { CAPABILITY_MANIFEST } from '../../services/agentCapabilities';
import { getCapabilityHealth, SIDECAR_TOOL_NAMES } from '../../services/capabilityHealth';
import { isSidecarEnabled } from '../../services/sidecarClient';
import {
  relax, nodeRect, rimPoint, shelfPack, treeLadder, placeLeavesNoClash,
} from './agentRedMenuGeom';

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
 *     se mide su centro REAL en coordenadas del lienzo. Con overflow visible
 *     (refinamiento sin-cortes 2026-06-10) cada trazo NACE dentro del disco
 *     del botón (rimPoint) y viaja sobre el borde del compositor — la unión
 *     raíz↔red es un solo trazo continuo, sin gap ni salto de color (en
 *     nature, gradiente savia-acento → madera en la vena).
 *   - Anticolisión reforzada (mandato 2026-06-10): relax anisotrópico (más
 *     aire vertical por las etiquetas bajo el nodo) + obstáculos fijos (hub,
 *     yemas, miga, grupos atenuados) — nodos/etiquetas NUNCA encimados y la
 *     red pasa por detrás de etiquetas OPACAS (z: web 1 < nodos 3).
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
  restaurar: { icon: '🌳', label: 'Restaurar y conservar' },
  // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- rótulo legacy, migración i18n diferida a ADR-050 (preexistente)
  registrar: { icon: '📝', label: 'Guardar lo que hago' },
  planear: { icon: '📅', label: 'Planear' },
  aprender: { icon: '📚', label: 'Aprender' },
  vender: { icon: '💰', label: 'Vender mejor' },
});

const GROUP_ORDER = Object.freeze([
  'cultivo', 'cuidar', 'observar', 'restaurar', 'registrar', 'planear', 'aprender', 'vender',
]);

/* DESTACADAS (operador 2026-06-28): las 6 funciones clave brotan PRIMERO en el
   anillo principal como ACCIÓN DIRECTA (sin grupo), para que el primerizo las vea
   de una. El RESTO de capacidades hero queda un nivel adentro, bajo su grupo
   ("ver más"). Fuente única: featured===true en el manifiesto. NO se elimina
   ninguna función — solo cambia la jerarquía de aparición. */
const FEATURED = CAPABILITY_MANIFEST.filter((e) => e.hero === true && e.featured === true);
const FEATURED_IDS = new Set(FEATURED.map((c) => c.id));

/* Grupos = el resto de capacidades hero (las NO destacadas), agrupadas. */
const GROUPS = GROUP_ORDER
  .map((key) => ({
    key,
    icon: GROUP_META[key].icon,
    label: GROUP_META[key].label,
    leaves: CAPABILITY_MANIFEST.filter(
      (e) => e.hero === true && e.group === key && !FEATURED_IDS.has(e.id),
    ),
  }))
  .filter((g) => g.leaves.length > 0);

/* Anillo principal = [destacadas (acción directa)] + [grupos (despliegan su
   resto al enfocar)]. Cada item tiene la MISMA forma que un grupo
   (key/icon/label/leaves) para que el motor de geometría los trate igual: las
   destacadas llevan kind:'cap' + cap y leaves:[] (no despliegan, accionan). El
   orden (destacadas primero) define el orden de sprout: el primerizo ve brotar
   primero las 6 funciones clave. */
const RING = [
  ...FEATURED.map((cap) => ({
    kind: 'cap', key: cap.id, icon: cap.icon, label: cap.label, cap, leaves: [],
  })),
  ...GROUPS.map((g) => ({
    kind: 'group', key: g.key, icon: g.icon, label: g.label, leaves: g.leaves,
  })),
];

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

function setDash(p, L, e) {
  p.setAttribute('stroke-dasharray', L);
  p.setAttribute('stroke-dashoffset', L * (1 - e));
}
function clearDash(p) {
  p.removeAttribute('stroke-dasharray');
  p.removeAttribute('stroke-dashoffset');
}

/* relax (anticolisión anisotrópica + obstáculos fijos) y rimPoint (origen
   del trazo DENTRO del disco del botón Ⓐ) viven en agentRedMenuGeom.js —
   puros y testeados aparte. */

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
  /* overflow VISIBLE (2026-06-10): los trazos bajan hasta el botón Ⓐ real
     (vive en el compositor, fuera de este lienzo) — la unión raíz↔red es un
     solo trazo continuo, sin el corte que daba el clip del borde inferior. */
  overflow:visible;background:transparent;
  -webkit-tap-highlight-color:transparent;
  /* ---- tema biopunk (base) ---- */
  --fam:ui-monospace,'Cascadia Mono',Menlo,Consolas,monospace;
  --lblSize:13px; --lblSp:.01em; --lblW:800;
  --lblC:#ffffff; --lblBg:rgba(4,14,11,.97); --lblEdge:rgba(25,199,154,.6);
  --lblShadow:0 2px 10px rgba(0,0,0,.65);
  --branch:#19c79a; --coreW:3px;
  --glowC:rgba(25,199,154,.48); --glowW:13px; --glowO:1; --glowBlur:4px;
  --twigC:rgba(25,199,154,.75);
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
  --lblC:#2e2414; --lblBg:rgba(255,250,238,.98); --lblEdge:rgba(121,87,53,.55);
  --lblShadow:0 2px 8px rgba(90,60,30,.3);
  --branch:#6e4f2e; --coreW:4.6px;
  --glowC:rgba(121,87,53,.32); --glowW:12px; --glowO:1; --glowBlur:1.5px;
  --twigC:rgba(110,79,46,.75);
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
  --lblC:#143d31; --lblBg:#ffffff; --lblEdge:rgba(47,110,90,.4);
  --lblShadow:0 1px 5px rgba(30,40,35,.16);
  --branch:#2f6e5a; --coreW:2.1px;
  --glowC:transparent; --glowW:0px; --glowO:0; --glowBlur:0px;
  --twigC:rgba(47,110,90,.6);
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
   con la base del tronco centrado — un solo organismo, no dos piezas.
   El stroke se pinta con gradiente userSpaceOnUse (savia ocre del botón →
   madera del tronco) puesto inline desde layout(): cero salto de color. */
.arm-gtrunk .vnO{stroke:var(--trunkC);stroke-width:13px;opacity:1}
.arm-gtrunk .vnI{stroke:var(--trunkHi);stroke-width:3.4px;opacity:.8}
.arm-gglow{opacity:var(--glowO);filter:blur(var(--glowBlur));animation:armBreathe 4.5s ease-in-out infinite}
.arm-gglow path{stroke:var(--glowC);stroke-width:var(--glowW);fill:none;stroke-linecap:round;transition:stroke .5s}
.arm-gcore path{stroke:var(--branch);stroke-width:var(--coreW);fill:none;stroke-linecap:round;transition:stroke .5s}
.arm-gcore path.lf{stroke-width:calc(var(--coreW)*.78)}
/* (.arm-gtwig + raicillas .rt + arco de suelo .gd ELIMINADOS 2026-06-20:
   decoración sin nodo destino que moría en el vacío). */
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
/* destacadas (2026-06-28): acción directa en el anillo principal — anillo de
   hoja (no de grupo) y SIN el latido expansible del grupo, para que se lean como
   "toque y listo", no como "abra para ver más". */
.arm-node.arm-feat .arm-orb{border-color:var(--ringLeaf)}
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
  /* la etiqueta SIEMPRE envuelve (no se corta contra el borde): palabras
     largas rompen y el texto fluye a varias líneas dentro de max-width. */
  white-space:normal;overflow-wrap:break-word;word-break:break-word;hyphens:auto;
  color:var(--lblC);background:var(--lblBg);border:1px solid var(--lblEdge);
  border-radius:10px;padding:4px 8px;box-shadow:var(--lblShadow);
  transition:color .5s,background .5s;
}
.arm-badge{display:inline-block;margin-top:3px;font-size:9px;font-weight:700;letter-spacing:.08em;
  text-transform:uppercase;border:1px solid currentColor;border-radius:99px;
  padding:2px 7px;opacity:.9}
.arm-node.arm-soon{cursor:default}
.arm-node.arm-soon .arm-orb{border-style:dashed}
.arm-node.arm-down{cursor:default}
.arm-node.arm-down .arm-orb{border-style:dashed;opacity:.55}
.arm-node.arm-down .arm-lbl{opacity:.6}
.arm-badge-down{color:var(--warnC, #f59e0b);border-color:var(--warnC, #f59e0b40)}
/* pista de uso — abajo-derecha: la esquina libre con la red brotando del
   botón Ⓐ (abajo-izquierda) hacia arriba-derecha. */
.arm-hint{position:absolute;right:14px;bottom:10px;z-index:2;
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
  /* glow apagado en reduced-motion; la CONTINUIDAD raíz↔red la garantiza el
     trazo core (que nace dentro del disco del botón Ⓐ), no el glow. */
  .arm-gglow{display:none}
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

  /* Estado real de cada capacidad: live (pleno), soon (por lanzar),
     down (dependencia rota, ej. sidecar caido). Deterministico,
     sin side-effects ocultos — las dependencias vienen de imports. */
  const capabilityHealth = useMemo(() => {
    try {
      const sidecarOn = isSidecarEnabled();
      return new Map(CAPABILITY_MANIFEST.map((cap) => [
        cap.id,
        getCapabilityHealth(cap.id, {
          manifest: /** @type {any} */ (CAPABILITY_MANIFEST),
          isSidecarEnabled: sidecarOn,
          sidecarToolNames: SIDECAR_TOOL_NAMES,
        }),
      ]));
    } catch {
      // Degradacion total: todo live (el menu nunca se rompe)
      return new Map(CAPABILITY_MANIFEST.map((cap) => [cap.id, 'live']));
    }
  }, []);

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
    const tkB = root.querySelector('[data-arm="tkB"]');
    const tkO = root.querySelector('[data-arm="tkO"]');
    const tkI = root.querySelector('[data-arm="tkI"]');
    const vnO = root.querySelector('[data-arm="vnO"]');
    const vnI = root.querySelector('[data-arm="vnI"]');
    const hintEl = root.querySelector('[data-arm="hint"]');

    /* estado de simulación por grupo/hoja (paths SVG creados acá). */
    const sim = RING.map((g, i) => {
      const el = root.querySelector(`[data-arm-group="${i}"]`);
      return {
        i,
        el,
        orb: el.querySelector('.arm-orb'),
        lblEl: el.querySelector('.arm-lbl'),
        pGlow: mkPath(gGlow, ''),
        pCore: mkPath(gCore, ''),
        x: 0, y: 0, scl: 0, alp: 0, vis: 0, visT: 0, lbl: 0,
        leafTimers: [], growTimer: null,
        leafAbsR: [], leafOffR: [], leafAbsT: [], leafOffT: [],
        leaves: g.leaves.map((cap, j) => {
          const lel = root.querySelector(`[data-arm-leaf="${i}-${j}"]`);
          const health = capabilityHealth.get(cap.id) || 'live';
          return {
            el: lel,
            orb: lel.querySelector('.arm-orb'),
            lblEl: lel.querySelector('.arm-lbl'),
            soon: health === 'soon',
            down: health === 'down',
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
    let btnR = 23; /* radio del botón Ⓐ — los trazos nacen DENTRO de su disco */
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
         izquierda). Medimos su centro REAL en coordenadas de este lienzo:
         queda BAJO el borde inferior (el compositor está debajo de la
         zona-respiro). Con overflow visible los trazos VIAJAN hasta el disco
         del botón y nacen dentro de él (rimPoint) — una sola Ⓐ, un solo
         organismo, sin el corte del borde (operador 2026-06-10). Sin ancla
         (tests/jsdom): fallback abajo-izquierda equivalente. */
      const aEl = anchorRef && anchorRef.current;
      const rb = root.getBoundingClientRect();
      if (aEl && rb.width > 0) {
        const ab = aEl.getBoundingClientRect();
        rootPt = {
          x: ab.left + ab.width / 2 - rb.left,
          y: ab.top + ab.height / 2 - rb.top,
        };
        btnR = Math.max(16, Math.min(ab.width, ab.height) / 2);
      } else {
        rootPt = { x: 46, y: H + 58 };
        btnR = 23;
      }
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.style.overflow = 'visible';

      /* fundido bajo el lienzo: pleno hasta el borde inferior (y=H), ~50% al
         centro del botón — los trazos siguen continuos y soldados a la Ⓐ sin
         enterrar el placeholder del compositor. */
      const ug = root.querySelector('[data-arm="underGrad"]');
      const umr = root.querySelector('[data-arm="underMaskRect"]');
      const um = root.querySelector('[data-arm="underMask"]');
      if (ug && umr && um) {
        ug.setAttribute('x1', '0'); ug.setAttribute('y1', r1(H));
        ug.setAttribute('x2', '0'); ug.setAttribute('y2', r1(Math.max(H + 24, rootPt.y)));
        /* región del mask Y rect: misma caja generosa — sin la región
           explícita el default (120% del viewport) recorta el desborde. */
        const my0 = -60, myH = Math.max(H, rootPt.y) + btnR + 120;
        for (const el of [um, umr]) {
          el.setAttribute('x', r1(-60)); el.setAttribute('y', r1(my0));
          el.setAttribute('width', r1(W + 120)); el.setAttribute('height', r1(myH));
        }
      }

      /* micorriza (biopunk/min): red diagonal desde la Ⓐ (abajo-izquierda)
         hacia ARRIBA-DERECHA (operador 2026-06-10). La colocación es por
         ESTANTES con las cajas reales orbe+etiqueta (shelfPack): CERO encime
         de nodos/etiquetas POR CONSTRUCCIÓN (7 cajas grandes no caben con
         relajación sola en un celular — mandato anticolisión 2026-06-10).
         El primer grupo queda arriba-izquierda y el último abajo-derecha:
         la diagonal viva se conserva; el zigzag de filas rompe la grilla. */
      const a0 = -1.45, a1 = -0.30; /* casi vertical → casi horizontal der. */
      const gBoxes = sim.map((s) => nodeRect(s.lblEl, 36));
      posOver = shelfPack(
        gBoxes,
        /* banda de RECTS: bordes reales del lienzo; el piso (H-58) deja
           libre la pista "⸙ toque una rama" de la esquina inferior */
        { x0: 10, x1: W - 10, y0: 44, y1: H - 58 },
        { pad: 9, jitter: 8, rand },
      );

      /* yemas: recogidas junto al origen (abajo-izquierda, sobre la Ⓐ). Banda
         ALTA (operador 2026-06-10: las yemas se amontonaban/encimaban abajo al
         enfocar): repartir las 7-8 yemas en una franja generosa con separación
         anisotrópica (más aire vertical) → columna limpia, cero encime. */
      posBud = sim.map((s, i) => {
        const a = a0 + (a1 - a0) * i / denom, r = i % 2 ? 152 : 110;
        return { x: rootPt.x + Math.cos(a) * r, y: rootPt.y + Math.sin(a) * r * 0.9 };
      });
      relax(posBud, 54, { x0: 38, x1: W - 44, y0: Math.max(96, H - 290), y1: H - 28 }, { ky: 0.82 });

      /* hub del foco: sobre la diagonal, dejando aire arriba-derecha para
         que el follaje del grupo enfocado respire */
      hub = {
        x: clampN(rootPt.x + Math.min(132, W * 0.30), 96, Math.max(98, W - 150)),
        /* 0.52H: deja ventana real ARRIBA del hub para hojas (entre la miga
           y el nodo grande) — con 0.46H esa franja era infactible y la hoja
           oscilaba encimada al orbe (medido 2026-06-10). */
        y: Math.max(150, H * 0.52),
      };
      const Lrx = Math.max(96, Math.min(152, W - hub.x - 62));
      const Lry = Math.max(72, Math.min(176, hub.y - 100, H - hub.y - 96));
      /* yemas como obstáculos (orbes chicos sin etiqueta, escala .55) y la
         miga "‹ volver" arriba-izquierda. */
      const budBoxes = posBud.map((p) => ({ x: p.x, y: p.y, hw: 24, hh: 24 }));
      const crumbBox = { x: 95, y: 33, hw: 90, hh: 32 }; /* tamaño real de la miga */
      sim.forEach((s, i) => {
        /* ANILLO proporcional alrededor del hub: cada hoja recibe arco según
           el ancho real de su caja (no se montan entre sí ni sobre el grupo
           del centro); el arco evita el lado de la Ⓐ (abajo-izquierda).
           placeLeavesNoClash VERIFICA cero choque y reintenta con radios
           mayores si el sistema completo (yemas+miga) quedó infactible. */
        const lBoxes = s.leaves.map((lf) => nodeRect(lf.lblEl, 33, lf.soon));
        const hubBox = {
          x: hub.x, y: hub.y + gBoxes[i].oy * 1.1,
          hw: gBoxes[i].hw * 1.1, hh: gBoxes[i].hh * 1.1,
        };
        const maxHw = Math.max(...lBoxes.map((b) => b.hw));
        const maxHh = Math.max(...lBoxes.map((b) => b.hh));
        /* inset X = semiancho de la etiqueta más ancha → la caja completa
           (orbe+etiqueta) cabe en pantalla; sin esto el rótulo se cortaba
           contra el borde (operador 2026-06-10). */
        const insetX = Math.max(56, maxHw + 4);
        s.leafAbsR = placeLeavesNoClash(hub, lBoxes, {
          a0: -2.35, a1: 0.85, /* arriba-izq → derecha → abajo-der */
          rx: Math.max(Lrx, hubBox.hw + maxHw * 0.7),
          ry: Math.max(Lry, hubBox.hh + maxHh * 0.7),
          bd: { x0: insetX, x1: W - insetX, y0: 84, y1: H - 76 },
          pad: 6,
          hard: [hubBox, crumbBox],
          soft: budBoxes,
        });
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

      /* la VENA Ⓐ→tronco: raíz superficial que nace DENTRO del disco del
         botón del agente (rimPoint: soldada al botón, sin gap) y repta por
         el suelo hasta la base del tronco — un solo organismo. El gradiente
         userSpaceOnUse (savia ocre del botón → madera) elimina el salto de
         color en la unión. */
      const vC1 = { x: rootPt.x + 6, y: rootPt.y - Math.max(40, (rootPt.y - baseT.y - 26) * 0.55) };
      const venaBez = bezObj(
        rimPoint(rootPt, Math.max(0, btnR - 5), vC1),
        /* sube casi vertical sobre la Ⓐ (asoma temprano en el lienzo)… */
        vC1,
        /* …y repta por el suelo hasta la base del tronco */
        { x: rootPt.x + (baseT.x - rootPt.x) * 0.45, y: baseT.y + 18 },
        { x: baseT.x - 2, y: baseT.y + 6 },
      );
      venaLen = Math.hypot(baseT.x - rootPt.x, baseT.y - rootPt.y) * 1.3 + 1;
      vnO.setAttribute('d', venaBez.d);
      vnI.setAttribute('d', venaBez.d);
      /* gradiente de la vena en coords reales: ocre (botón) → madera, ya
         dentro del lienzo; vnO lo usa inline (gana sobre el CSS). */
      const vg = root.querySelector('[data-arm="venaGrad"]');
      if (vg) {
        vg.setAttribute('x1', r1(rootPt.x)); vg.setAttribute('y1', r1(rootPt.y));
        vg.setAttribute('x2', r1(rootPt.x + (baseT.x - rootPt.x) * 0.6));
        vg.setAttribute('y2', r1(baseT.y + 12));
        vnO.style.stroke = 'url(#arm-vena-grad)';
      }

      /* ramas del árbol: ESCALERA copa→base con columnas alternadas a los
         lados del tronco (treeLadder): las columnas opuestas nunca chocan en
         X y dentro de cada columna el paso respeta las cajas reales — cero
         choque por construcción (antes no había anticolisión: capturas del
         operador con "Planear" encima del ojo). El orbe queda a una
         distancia del tronco que deja la etiqueta completa EN pantalla. */
      attachPts = []; treePos = []; treeFocus = [];
      const treeY = treeLadder(gBoxes, N, 56, baseT.y - 36, 6);
      sim.forEach((s, i) => {
        const t = 0.15 + 0.72 * i / denom;
        attachPts.push(cubicPt(trunkBez, t));
        const side = i % 2 === 0 ? -1 : 1;
        const len = 96 + rand(i + 71) * 18;
        const nx = clampN(cx + side * len, gBoxes[i].hw + 6, W - gBoxes[i].hw - 6);
        treePos.push({ x: nx, y: treeY[i] });
      });
      treeFocus = treePos.map((p, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        return { x: p.x - side * 30, y: p.y + 6 };
      });

      sim.forEach((s, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const fp = treeFocus[i];
        /* ANILLO proporcional hacia ADENTRO (el lado del tronco/espacio
           libre) + pulido contra el grupo enfocado y los orbes atenuados —
           las hojas brotan ENTRE los nodos, sin encimarse (2026-06-10).
           placeLeavesNoClash verifica CERO choque medido y reintenta con
           radios mayores soltando los orbes atenuados (soft) si el sistema
           quedó infactible — medido: Biodiversidad encimaba el hub. */
        const lBoxesT = s.leaves.map((lf) => nodeRect(lf.lblEl, 33, lf.soon));
        const gBoxT = nodeRect(s.lblEl, 36);
        const fpBox = {
          x: fp.x, y: fp.y + gBoxT.oy * 1.12,
          hw: gBoxT.hw * 1.12, hh: gBoxT.hh * 1.12,
        };
        const maxHwT = Math.max(...lBoxesT.map((b) => b.hw));
        const maxHhT = Math.max(...lBoxesT.map((b) => b.hh));
        /* inclinación del arco según altura: grupos bajos abanican hacia
           ARRIBA (no hay piso debajo), grupos altos hacia abajo */
        const tilt = clampN((fp.y - H * 0.45) / H, -0.35, 0.45) * 2.0;
        const centerA = side < 0 ? -tilt : Math.PI + tilt; /* hacia adentro */
        const insetXT = Math.max(58, maxHwT + 4);
        s.leafAbsT = placeLeavesNoClash(fp, lBoxesT, {
          a0: centerA - 1.85, a1: centerA + 1.85,
          rx: fpBox.hw + maxHwT * 0.7,
          ry: fpBox.hh + maxHhT * 0.7,
          bd: { x0: insetXT, x1: W - insetXT, y0: 78, y1: baseT.y - 54 },
          pad: 6,
          hard: [fpBox],
          /* atenuados: sin etiqueta visible — solo el orbe (esc .84) */
          soft: treePos
            .filter((p, k) => k !== i)
            .map((p) => ({ x: p.x, y: p.y, hw: 33, hh: 33 })),
        });
        s.leafOffT = s.leafAbsT.map((p) => ({ x: p.x - fp.x, y: p.y - fp.y }));
      });

      /* SIN decoración de arraigo sin destino (operador 2026-06-20): las
         raicillas/"boca de raíz" (micorriza, abanico desde la Ⓐ) y el arco de
         suelo (nature) MORÍAN en el vacío — ninguna terminaba en un nodo de
         capacidad, así que se leían como líneas sueltas/colgantes y
         contradecían el subtítulo "Cada rama, una capacidad conectada".
         ELIMINADAS: ahora TODA línea visible de la red nace de la Ⓐ y muere
         SIEMPRE en el centro de un nodo (grupo/hoja). En nature la vena
         Ⓐ→tronco y el tronco SÍ tienen destino (la base / la copa), por eso se
         conservan. La riqueza orgánica la dan la curva sembrada, el glow que
         respira y las esporas. */
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
          ts = f == null ? 1 : (f === i ? 1.1 : 0.5);
          ta = (f == null || f === i ? 1 : 0.28) * Math.min(1, g.vis * 1.5);
          tl = (f == null || f === i ? 1 : 0) * (g.vis > 0.75 ? 1 : 0);
        }

        g.vis += (g.visT - g.vis) * kv;
        g.x += (tp.x - g.x) * kp; g.y += (tp.y - g.y) * kp;
        g.scl += (ts - g.scl) * ka; g.alp += (ta - g.alp) * ka; g.lbl += (tl - g.lbl) * ka;
        md = Math.max(md, Math.abs(tp.x - g.x), Math.abs(tp.y - g.y), 200 * Math.abs(g.visT - g.vis));

        /* micorriza: cada hifa NACE dentro del disco del botón Ⓐ (rimPoint)
           — mismo color que el relleno del botón abierto → unión soldada. */
        const start = treeMode
          ? attachPts[i]
          : rimPoint(rootPt, Math.max(0, btnR - 5), { x: g.x, y: g.y });
        const b = organic(start, { x: g.x, y: g.y }, i * 13 + 5);
        g.pCore.setAttribute('d', b.d); g.pGlow.setAttribute('d', b.d);
        const ve = ease3(g.vis);
        if (g.vis < 0.995) {
          const L = Math.hypot(g.x - start.x, g.y - start.y) * 1.3 + 1;
          setDash(g.pCore, L, ve); setDash(g.pGlow, L, ve);
        } else { clearDash(g.pCore); clearDash(g.pGlow); }
        const bo = (f == null || f === i) ? 1 : 0.3;
        g.pCore.style.opacity = String(bo); g.pGlow.style.opacity = String(bo);

        /* Ramitas decorativas (twigD) ELIMINADAS (operador 2026-06-18): brotaban
           de la rama madre y MORIAN en el vacio, sin nodo al final — se leian
           como lineas sueltas/colgantes (un defecto), no como micorriza. Ahora
           cada trazo de la red muere SIEMPRE en un nodo (grupo/hoja); la riqueza
           organica la dan la curva sembrada, el glow que respira, las esporas y
           la boca de raiz soldada a la Ⓐ. */

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
          lf.el.style.opacity = ((lf.soon || lf.down ? 0.72 : 1) * e).toFixed(3);
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

    /* Re-mide la geometría sin re-brotar (las ramas ya están vivas): solo
       recoloca raíz/nodos a las coords actuales y pinta. Lo usa el RO del
       botón Ⓐ y el barrido de settle: si el compositor se ancla/mueve tras la
       animación de pliegue (#1726, transición .5s), la BASE de cada rama sigue
       al centro real de la Ⓐ en vez de quedar suelta. */
    function relayout() {
      layout();
      if (!didSprout && W > 0 && H > 0) regrow();
      else kick(800);
    }

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(relayout);
      ro.observe(root);
      /* OJO: también observamos el botón Ⓐ (anchorRef). Vive en el compositor,
         FUERA del arm-root: cuando #1726 ancla el compositor al fondo y el
         saludo/chips se pliegan, la Ⓐ se mueve sin que el arm-root cambie de
         tamaño → el RO de root NO dispara y la raíz quedaba desfasada. */
      const aEl = anchorRef && anchorRef.current;
      if (aEl) ro.observe(aEl);
    }

    layout();
    if (W > 0 && H > 0) regrow();

    /* Barrido de "settle": tras montar la mano, el layout del hero cambia
       (pliegue .5s, overflow visible, compositor al fondo). Forzamos un
       recálculo en el próximo frame y a lo largo de la transición para que la
       geometría viva atrape la posición FINAL de la Ⓐ y de los nodos. */
    let rafSettle = null;
    const settleTimers = [];
    if (!reduced) {
      rafSettle = requestAnimationFrame(() => { rafSettle = null; relayout(); });
      [120, 280, 520].forEach((ms) => {
        settleTimers.push(setTimeout(relayout, ms));
      });
    } else {
      rafSettle = requestAnimationFrame(() => { rafSettle = null; relayout(); });
    }

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      if (rafSettle != null) cancelAnimationFrame(rafSettle);
      settleTimers.forEach(clearTimeout);
      if (ro) ro.disconnect();
      sim.forEach((s) => {
        clearTimeout(s.growTimer);
        s.leafTimers.forEach(clearTimeout);
        [s.pGlow, s.pCore].forEach((p) => p.remove());
        s.leaves.forEach((lf) => { lf.pGlow.remove(); lf.pCore.remove(); });
      });
      engineRef.current = null;
    };
  }, [treeMode, anchorRef, capabilityHealth]);

  function showToast(msg) {
    setToastMsg(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 1700);
  }

  function handleGroupTap(i, ev) {
    if (disabled) return;
    const item = RING[i];
    if (item?.kind === 'cap') {
      const capItem = /** @type {any} */ (item);
      if (ev?.currentTarget) bounce(ev.currentTarget);
      const cap = capItem.cap;
      const health = capabilityHealth.get(cap.id) || 'live';
      if (health === 'soon') {
        showToast(`${cap.icon} ${cap.label} — por lanzar`);
        return;
      }
      if (health === 'down') {
        showToast(`${cap.icon} ${cap.label} — no disponible sin conexión al servidor`);
        return;
      }
      if (onPick) onPick(cap);
      return;
    }
    engineRef.current?.toggleFocus(i);
  }

  function handleLeafTap(ev, cap) {
    if (disabled) return;
    bounce(ev.currentTarget);
    const health = capabilityHealth.get(cap.id) || 'live';
    if (health === 'soon') {
      showToast(`${cap.icon} ${cap.label} — por lanzar`);
      return;
    }
    if (health === 'down') {
      showToast(`${cap.icon} ${cap.label} — no disponible sin conexión al servidor`);
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
        <defs>
          {/* savia de la Ⓐ (acento) → madera del tronco: el gradiente vive en
              coords del lienzo (layout() fija x1/y1 en el botón) para que la
              vena nature arranque EXACTAMENTE del color del botón — sin salto
              de color en la unión (operador 2026-06-10). */}
          <linearGradient id="arm-vena-grad" data-arm="venaGrad" gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: 'rgb(var(--t-accent-rgb))' }} />
            <stop offset="0.45" style={{ stopColor: 'var(--trunkC)' }} />
            <stop offset="1" style={{ stopColor: 'var(--trunkC)' }} />
          </linearGradient>
          {/* fundido bajo el lienzo (latitud 2026-06-10): los trazos que
              DESBORDAN hacia el compositor pierden peso gradualmente (~50%
              al llegar al botón) — siguen CONTINUOS y soldados a la Ⓐ, pero
              no entierran el placeholder "Pregúntale a Chagra…". layout()
              fija y1=H (borde del lienzo) y y2=centro del botón. */}
          <linearGradient id="arm-under-grad" data-arm="underGrad" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.55" />
          </linearGradient>
          {/* maskType ALPHA: con luminance (default) el 50% sRGB se evalúa
              en linearRGB ≈ 21% y los trazos se EXTINGUEN antes del botón —
              el corte regresaba (medido 2026-06-10). Alpha es literal.
              OJO: la REGIÓN del mask (x/y/width/height) por defecto es
              -10%..120% del viewport → recortaba el desborde en y≈1.2H con
              una línea dura (el corte, medido) — layout() la fija explícita
              hasta pasado el botón Ⓐ. */}
          <mask id="arm-under-mask" data-arm="underMask" maskUnits="userSpaceOnUse" style={{ maskType: 'alpha' }}>
            <rect data-arm="underMaskRect" fill="url(#arm-under-grad)" />
          </mask>
        </defs>
        <g mask="url(#arm-under-mask)">
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
          {/* grupo arm-gtwig (raicillas .rt + arco de suelo .gd) ELIMINADO
              (operador 2026-06-20): eran decoración sin nodo destino —
              líneas que morían en el vacío. */}
        </g>
      </svg>

      <div className="arm-spores" aria-hidden="true">
        {SPORES.map((s, k) => (
          <i
            key={k}
            className="arm-sp"
            style={/** @type {any} */ ({ '--lx': s.lx, '--dur': s.dur, '--del': s.del, '--dx': s.dx, '--rise': s.rise })}
          />
        ))}
      </div>

      <div className="arm-nodes">
        {RING.map((item, i) => {
          const isCap = item.kind === 'cap';
          const health = isCap ? (capabilityHealth.get(/** @type {any} */ (item).cap.id) || 'live') : 'live';
          const isDown = health === 'down';
          const isSoon = health === 'soon';
          return (
            <div
              key={item.key}
              className={`arm-node ${isCap ? 'arm-feat' : 'arm-group'}${isSoon ? ' arm-soon' : ''}${isDown ? ' arm-down' : ''}`}
              role="button"
              tabIndex={isDown ? -1 : 0}
              aria-label={isCap && isDown ? `${item.label} (sin conexión al servidor)` : item.label}
              aria-expanded={isCap ? undefined : focusedIdx === i}
              aria-disabled={isDown || undefined}
              data-arm-group={i}
              style={/** @type {any} */ ({ opacity: 0, '--pd': `${i * 0.5}s` })}
              onClick={(ev) => handleGroupTap(i, ev)}
              onKeyDown={(ev) => pressKey(ev, () => handleGroupTap(i, ev))}
            >
              <div className="arm-orb">
                <i
                  className="arm-ic"
                  style={/** @type {any} */ ({
                    '--swD': `${(4.2 + rand(i + 2) * 2.4).toFixed(1)}s`,
                    '--swDel': `${(-rand(i + 11) * 4).toFixed(1)}s`,
                  })}
                >
                  {item.icon}
                </i>
              </div>
              <div className="arm-lbl">
                {item.label}
                {isCap && isDown && (
                  <>
                    <br />
                    <span className="arm-badge arm-badge-down">no disponible</span>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {RING.map((g, i) =>
          g.leaves.map((cap, j) => {
            const health = capabilityHealth.get(cap.id) || 'live';
            const isSoon = health === 'soon';
            const isDown = health === 'down';
            const dimmed = isSoon || isDown;
            return (
              <div
                key={cap.id}
                className={`arm-node arm-leaf${isSoon ? ' arm-soon' : ''}${isDown ? ' arm-down' : ''}`}
                role="button"
                tabIndex={dimmed ? -1 : 0}
                aria-label={isSoon ? `${cap.label} (por lanzar)` : isDown ? `${cap.label} (sin conexión al servidor)` : cap.label}
                aria-disabled={dimmed || disabled || undefined}
                data-arm-leaf={`${i}-${j}`}
                style={{ display: 'none' }}
                onClick={(ev) => handleLeafTap(ev, cap)}
                onKeyDown={(ev) => pressKey(ev, () => handleLeafTap(ev, cap))}
              >
                <div className="arm-orb">
                  <i
                    className="arm-ic"
                    style={/** @type {any} */ ({
                      '--swD': `${(3.8 + rand(i * 9 + j) * 2.5).toFixed(1)}s`,
                      '--swDel': `${(-rand(i + j + 19) * 4).toFixed(1)}s`,
                    })}
                  >
                    {cap.icon}
                  </i>
                </div>
                <div className="arm-lbl">
                  {cap.label}
                  {isSoon && (
                    <>
                      <br />
                      <span className="arm-badge">por lanzar</span>
                    </>
                  )}
                  {isDown && (
                    <>
                      <br />
                      <span className="arm-badge arm-badge-down">no disponible</span>
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
          ‹ <span>{RING[focusedIdx].icon}</span>
          <span>{RING[focusedIdx].label}</span>
        </button>
      )}

      <div className={`arm-toast${toastMsg ? ' show' : ''}`} role="status">
        {toastMsg}
      </div>
    </div>
  );
}
