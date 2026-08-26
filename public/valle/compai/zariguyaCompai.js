/*
 * zariguyaCompai — EL COMPORTAMIENTO DE LA ZARIGÜEYA, montable en superficie
 * plana (HTML/DOM, sin React). Núcleo portable.
 *
 * PARA QUIÉN: la usuaria norte. Este compai se hace con cariño, precioso,
 * gentil, que
 * enseñe. NO es un bicho más.
 *
 * QUÉ ES: la MISMA base de conducta de Angelita (respira, mira, se asea,
 * gesticula — `idleMachine.js` perfil `zariguya`; el azar sin-repetir de
 * `gestos.js`) MÁS los gestos propios de la zarigüeya, todos sobre UNA sola
 * lámina transparente aprobada (`/compai/laminas/zariguya.png`, alpha-cut, sin
 * hojas ni piso horneados — drop-in limpio para valle 3D, 2D y Kart):
 *
 *   · VER / observar  → saca una LUPA y escanea (gesto legible).
 *   · ESCUCHAR         → se le AGRANDA la oreja + ondas de sonido.
 *   · MUERTA (thanatosis, ~1 de cada 5 momentos ociosos, NO el default): se
 *     desploma de costado, rígida, lengua afuera — y DICE, con empatía, por
 *     qué lo hace (`FRASE_MUERTA`). Es pedagogía, no susto.
 *
 * POR QUÉ la muerta es una POSE de la misma lámina y no otro dibujo: así vive
 * ZariguyaLaminaViva.jsx en la app (la tanatosis es una animación del cuerpo
 * aprobado, no un PNG aparte), y así el asset queda LIMPIO y consistente para
 * las tres superficies. Las hojas/piso, si mejoran la escena, van como capa de
 * FONDO separada y estática del contenedor — NUNCA pegadas al bicho que se
 * mueve (corrección del operador 2026-08-23).
 *
 * Cero dependencias de React/three: se importa idleMachine + gestos (ESM puros)
 * y se pinta a mano sobre el DOM. `montarZariguya(host)` devuelve controles.
 *
 * @module compai/zariguyaCompai
 */

import { idleDeCompai } from './idleMachine.js';
import { elegirSinRepetir } from './gestos.js';
import {
  FRASE_MUERTA, ARIA_ZARIGUYA, IDLE_ZARIGUYA, GESTOS_VISIBLES, ESTADO_A_MOMENTO,
} from './zariguyaGestos.js';

/* La lámina aprobada (transparente). Override por opts.lamina si la sirve otro
   docroot (el microapp la copia a su propio /compai/laminas/). */
export const LAMINA_ZARIGUYA = '/compai/laminas/zariguya.png';

/* Los datos de la zarigüeya (frase, repertorio, aria, mapa de estados) viven en
   el NÚCLEO compartido `zariguyaGestos.js` — la copia que sync-compai-nucleo
   trae desde chagra `src/compai/nucleo/`: la MISMA frase y el MISMO azar para
   la PWA (React) y el valle (ESM sin build). Se re-exportan para no romper a
   quien los importe de este runtime. */
export { FRASE_MUERTA, ARIA_ZARIGUYA, IDLE_ZARIGUYA };

/* Momentos con gesto VISIBLE, como Set para lookup O(1) en el bucle de render. */
const GESTO_VISIBLE = new Set(GESTOS_VISIBLES);

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const suave = (x) => { const c = clamp01(x); return c * c * (3 - 2 * c); };

/* ── LOS PROPS DIBUJADOS (SVG inline, warm y legibles para una niña) ────────── */

/* Lupa: lente con reflejo + mango, aro dorado (el dorado de su brújula). */
function svgLupa() {
  return (
    '<svg class="zc-prop zc-lupa" viewBox="0 0 100 100" aria-hidden="true">'
    + '<g>'
    + '<circle cx="42" cy="42" r="26" fill="rgba(180,214,224,.34)" stroke="#e8c17a" stroke-width="7"/>'
    + '<circle cx="42" cy="42" r="26" fill="none" stroke="#8a6a2f" stroke-width="1.6"/>'
    + '<path d="M34 30 Q30 38 33 48" fill="none" stroke="#fbf4e2" stroke-width="4" stroke-linecap="round" opacity=".85"/>'
    + '<rect x="60" y="60" width="30" height="12" rx="6" transform="rotate(45 60 60)" fill="#c9922f"/>'
    + '<rect x="60" y="60" width="30" height="12" rx="6" transform="rotate(45 60 60)" fill="none" stroke="#7d5a1e" stroke-width="1.4"/>'
    + '</g></svg>'
  );
}

/* Oreja grande que crece perked-up sobre su cabeza + ondas de sonido. Redonda
   y desnuda como la de un marsupial, PERO en su paleta real (pelaje tostado por
   fuera, rosa apagado por dentro, borde tinta) — no un chicle rosado. Firma de
   su identidad (orejas grandes redondas). */
function svgOreja() {
  return (
    '<svg class="zc-prop zc-oreja" viewBox="0 0 150 160" aria-hidden="true">'
    + '<g class="zc-ondas" fill="none" stroke="#f4d3a6" stroke-width="5.5" stroke-linecap="round">'
    + '<path class="zc-onda zc-onda1" d="M40 62 Q28 82 40 102"/>'
    + '<path class="zc-onda zc-onda2" d="M27 50 Q6 82 27 114"/>'
    + '<path class="zc-onda zc-onda3" d="M15 40 Q-12 82 15 124"/>'
    + '</g>'
    + '<g class="zc-oreja-forma">'
    // pabellón externo: pelaje tostado con borde de tinta, ovoide perked-up
    + '<path d="M96 150 C70 148 56 118 58 84 C60 48 78 20 100 22 C124 24 140 56 138 96 '
    + 'C137 126 122 148 96 150 Z" fill="#cdb488" stroke="#3b322b" stroke-width="4"/>'
    // interior: rosa apagado (rosa de luna en su valor real, no fosforescente)
    + '<path d="M97 134 C79 132 70 108 72 82 C74 54 88 34 102 36 C120 39 130 64 128 94 '
    + 'C127 116 115 132 97 134 Z" fill="#9c6b62"/>'
    // brillo suave del canal auditivo
    + '<path d="M99 118 C89 116 84 100 86 84 C88 66 96 54 104 56 C114 59 119 76 117 96 '
    + 'C116 108 109 117 99 118 Z" fill="#6e463f"/>'
    + '</g></svg>'
  );
}

/* FX de la muerta: lengua colgando + ojitos cerrados (gentiles, en el estilo de
   tinta — nada de X caricaturesca). Se ancla a la carita por --zc-cara-x/y. */
function svgMuertaFx() {
  return (
    '<svg class="zc-prop zc-muerta-fx" viewBox="0 0 100 100" aria-hidden="true">'
    + '<path class="zc-lengua" d="M48 52 Q45 74 50 88 Q55 74 52 52 Z" fill="#d98a94" stroke="#b96b76" stroke-width="1.4"/>'
    + '<g class="zc-ojos-muerta" fill="none" stroke="#2a2320" stroke-width="3.4" stroke-linecap="round">'
    + '<path d="M30 40 q7 6 14 0"/>'
    + '<path d="M56 40 q7 6 14 0"/>'
    + '</g></svg>'
  );
}

const CSS_ID = 'zc-zariguya-css';
const CSS = `
.zc-escena{ position:relative; width:100%; height:100%; display:grid;
  align-items:end; justify-items:center;
  --zc-cara-x:38%; --zc-cara-y:16%; }
.zc-lienzo{ position:relative; width:min(70%, 330px); aspect-ratio:481/444;
  margin-bottom:6%; transform-origin:50% 88%; will-change:transform; }
.zc-lamina{ position:absolute; inset:0; width:100%; height:100%;
  object-fit:contain; -webkit-user-drag:none; user-select:none; }
.zc-prop{ position:absolute; pointer-events:none; opacity:0; }
/* la lupa aparece frente a su carita y escanea */
.zc-lupa{ width:33%; left:6%; top:4%; transform:scale(.6) rotate(-8deg);
  transition:opacity .22s ease, transform .28s cubic-bezier(.34,1.56,.64,1); }
.zc-lienzo.zc-ver .zc-lupa{ opacity:1; transform:scale(1) rotate(-8deg);
  animation:zcScan 1.5s ease-in-out infinite alternate; }
/* la oreja grande brota perked-up SOBRE su cabeza; las ondas entran por la izq. */
.zc-oreja{ width:31%; left:13%; top:-20%; transform-origin:66% 96%; transform:scale(.35);
  transition:opacity .22s ease, transform .32s cubic-bezier(.34,1.56,.64,1); }
.zc-lienzo.zc-escucha .zc-oreja{ opacity:1; transform:scale(1); }
.zc-lienzo.zc-escucha .zc-oreja-forma{ animation:zcOrejaLatido 1.3s ease-in-out infinite alternate; transform-origin:66% 96%; }
.zc-onda{ opacity:.9; transform-origin:100% 50%; }
.zc-lienzo.zc-escucha .zc-onda1{ animation:zcOnda 1.2s ease-out infinite; }
.zc-lienzo.zc-escucha .zc-onda2{ animation:zcOnda 1.2s ease-out infinite .3s; }
.zc-lienzo.zc-escucha .zc-onda3{ animation:zcOnda 1.2s ease-out infinite .6s; }
/* la muerta: se tumba de costado (patas rígidas hacia afuera), quieta */
.zc-lienzo.zc-muerta{ transform-origin:50% 62% !important;
  transform:rotate(90deg) translate(2%, 6%) scale(.94) !important;
  transition:transform .55s cubic-bezier(.5,.02,.6,1); }
.zc-muerta-fx{ width:34%; left:var(--zc-cara-x); top:var(--zc-cara-y);
  transform:translate(-50%,-24%) scale(.7); transition:opacity .3s ease .28s; }
.zc-lienzo.zc-muerta .zc-muerta-fx{ opacity:1; }
.zc-lengua{ transform-origin:50% 10%; }
.zc-lienzo.zc-muerta .zc-lengua{ animation:zcLengua 2.6s ease-in-out infinite alternate; }
/* el globo con la frase — SIEMPRE dentro del escenario, nunca recortado */
.zc-globo{ position:absolute; left:50%; bottom:4%; transform:translate(-50%,10px);
  max-width:min(90%, 32rem); padding:.7rem .95rem; border-radius:1rem 1rem 1rem .25rem;
  background:#fbf3df; color:#3a2f26; font:500 clamp(.8rem,1.5vw,1rem)/1.4 system-ui,-apple-system,sans-serif;
  box-shadow:0 .5rem 1.4rem rgba(0,0,0,.32); border:1px solid rgba(180,140,70,.45);
  opacity:0; pointer-events:none; transition:opacity .3s ease, transform .3s ease; z-index:5; }
.zc-globo.zc-visible{ opacity:1; transform:translate(-50%,0); }
.zc-globo::after{ content:''; position:absolute; left:1.6rem; bottom:-.5rem; width:1rem; height:1rem;
  background:inherit; border-right:inherit; border-bottom:inherit; transform:rotate(45deg); }
@keyframes zcScan{ from{ transform:scale(1) rotate(-8deg) translate(0,0); }
  to{ transform:scale(1) rotate(-8deg) translate(12%,9%); } }
@keyframes zcOnda{ 0%{ opacity:.35; transform:scale(.7); } 40%{ opacity:1; } 100%{ opacity:.4; transform:scale(1.18); } }
@keyframes zcOrejaLatido{ from{ transform:scale(1); } to{ transform:scale(1.06); } }
@keyframes zcLengua{ from{ transform:rotate(-4deg); } to{ transform:rotate(5deg) translateY(6%); } }
@media (prefers-reduced-motion: reduce){
  .zc-lienzo, .zc-prop, .zc-globo, .zc-oreja-forma, .zc-onda, .zc-lengua{ transition:none !important; animation:none !important; }
  .zc-lienzo.zc-escucha .zc-onda{ opacity:.9; }
}
`;

function inyectarCss(doc) {
  if (doc.getElementById(CSS_ID)) return;
  const st = doc.createElement('style');
  st.id = CSS_ID;
  st.textContent = CSS;
  (doc.head || doc.documentElement).appendChild(st);
}

/**
 * Monta la zarigüeya viva dentro de `host`. Devuelve controles.
 *
 * @param {HTMLElement} host  contenedor (posición relativa recomendada).
 * @param {object} [opts]
 * @param {string} [opts.lamina]   ruta de la lámina transparente (override).
 * @param {boolean} [opts.auto=true]  corre el loop ocioso (con muerta ~20%).
 * @param {number}  [opts.semilla]  semilla de fase (dos instancias no sincronizan).
 * @returns {{ setEstado(e:string):void, destruir():void, momentoActual():string }}
 */
export function montarZariguya(host, opts = {}) {
  const doc = host.ownerDocument || document;
  const win = doc.defaultView || window;
  const lamina = opts.lamina || LAMINA_ZARIGUYA;
  const auto = opts.auto !== false;
  const reduce = !!win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  inyectarCss(doc);

  const escena = doc.createElement('div');
  escena.className = 'zc-escena';
  escena.setAttribute('role', 'img');
  escena.setAttribute('aria-label', ARIA_ZARIGUYA.acompana);
  escena.innerHTML =
    '<div class="zc-lienzo">'
    + `<img class="zc-lamina" src="${lamina}" alt="" draggable="false">`
    + svgOreja() + svgLupa() + svgMuertaFx()
    + '</div>'
    + '<div class="zc-globo" aria-live="polite"></div>';
  host.appendChild(escena);

  const lienzo = escena.querySelector('.zc-lienzo');
  const globo = escena.querySelector('.zc-globo');

  const semilla = (opts.semilla ?? 0) >>> 0;
  const t0 = win.performance.now() / 1000 + (semilla % 97) * 0.13;
  let raf = 0;
  let momento = 'reposo';
  let hastaMs = 0; // fin del gesto forzado actual
  let proxMs = 0; // cuándo elegir el próximo momento
  let previo = null;
  let vivo = true;

  function limpiarClases() {
    lienzo.classList.remove('zc-ver', 'zc-escucha', 'zc-muerta');
    globo.classList.remove('zc-visible');
  }

  function aplicarMomento(m, ahora) {
    limpiarClases();
    momento = m || 'reposo';
    host.setAttribute('data-zc-momento', momento);
    const cfg = IDLE_ZARIGUYA[m];
    const dur = cfg ? cfg.dur : 0;
    hastaMs = dur ? ahora + dur : 0;
    if (m === 'ver') {
      lienzo.classList.add('zc-ver');
      escena.setAttribute('aria-label', ARIA_ZARIGUYA.ver);
    } else if (m === 'escucha') {
      lienzo.classList.add('zc-escucha');
      escena.setAttribute('aria-label', ARIA_ZARIGUYA.escuchando);
    } else if (m === 'muerta') {
      lienzo.classList.add('zc-muerta');
      escena.setAttribute('aria-label', ARIA_ZARIGUYA.muerta);
      globo.textContent = FRASE_MUERTA;
      // el globo entra un instante después de desplomarse (deja leer la pose)
      win.setTimeout(() => { if (vivo && momento === 'muerta') globo.classList.add('zc-visible'); }, 620);
    } else {
      escena.setAttribute('aria-label', ARIA_ZARIGUYA.acompana);
    }
  }

  function tick() {
    if (!vivo) return;
    const ms = win.performance.now();
    const t = ms / 1000 - t0;

    // Pose viva de base (respira + mira + gesto), salvo en muerta (queda rígida).
    if (momento !== 'muerta') {
      const p = idleDeCompai(t, { perfil: 'zariguya', reducedMotion: reduce });
      lienzo.style.transform =
        `translateY(${(p.dy * 6).toFixed(2)}%) scale(${p.sx.toFixed(4)}, ${p.sy.toFixed(4)}) rotate(${p.rot.toFixed(2)}deg)`;
    } else {
      lienzo.style.transform = ''; // la clase .zc-muerta manda (rotación de costado)
    }

    if (auto && !reduce) {
      if (hastaMs && ms >= hastaMs) { // terminó un gesto → volver a reposo un rato
        aplicarMomento(null, ms);
        proxMs = ms + 2600 + Math.random() * 2600;
      } else if (!hastaMs && ms >= proxMs) { // en reposo: elegir próximo momento
        const m = elegirSinRepetir(IDLE_ZARIGUYA, previo);
        previo = m;
        aplicarMomento(m, ms);
        if (!GESTO_VISIBLE.has(m)) { // micro-gesto: corto, sin bloquear
          const cfg = IDLE_ZARIGUYA[m];
          hastaMs = 0;
          proxMs = ms + (cfg ? cfg.dur : 2600);
        }
      }
    }
    raf = win.requestAnimationFrame(tick);
  }

  if (reduce) {
    // Sin animación: pose quieta y digna; el gesto se ve solo si lo fuerzan.
    lienzo.style.transform = '';
  }
  proxMs = win.performance.now() + 1400; // un respiro antes del primer gesto
  raf = win.requestAnimationFrame(tick);

  return {
    setEstado(estado) {
      const m = ESTADO_A_MOMENTO[String(estado || '').toLowerCase()];
      const ms = win.performance.now();
      if (m == null) { // volver al idle vivo
        limpiarClases();
        momento = 'reposo';
        host.setAttribute('data-zc-momento', 'reposo');
        hastaMs = 0;
        proxMs = ms + 1200;
        escena.setAttribute('aria-label', ARIA_ZARIGUYA.acompana);
        return;
      }
      aplicarMomento(m, ms);
      if (!GESTO_VISIBLE.has(m)) { hastaMs = 0; proxMs = ms + IDLE_ZARIGUYA[m].dur; }
    },
    momentoActual() { return momento; },
    destruir() {
      vivo = false;
      if (raf) win.cancelAnimationFrame(raf);
      escena.remove();
    },
  };
}

export default { montarZariguya, FRASE_MUERTA, IDLE_ZARIGUYA, LAMINA_ZARIGUYA, ARIA_ZARIGUYA };
