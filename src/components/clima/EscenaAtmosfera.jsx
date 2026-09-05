import React, { useLayoutEffect, useMemo, useRef } from 'react';
import './escenaAtmosfera.css';

/**
 * EscenaAtmosfera — la escena viva de la página del tiempo: las 18 capas de
 * efecto del mockup "El clima como atmósfera viva" (PR #2276, JSX recuperado
 * de `2bcb93d8f^:src/mockups/ClimaAtmosfera.jsx`) portadas TAL CUAL a un
 * componente reusable, más la piel `nublado` (nube-masa con panza y rotura,
 * decisión del operador 2026-09-05).
 *
 * CONTRATO (spec 2026-09-06-unificar-2d-clima, D-1/D-2):
 *  - NUNCA calcula el clima: recibe `{ condicion, luz, enso }` por props (el
 *    estado sale de `climaEscenaEstado.estadoEscena`, que delega en
 *    atmosphereService). Sin `condicion` solo modula la luz; no afirma nada.
 *  - Es FONDO: el `.ca-escena` completo va `aria-hidden` y con
 *    `pointer-events: none`; los `children` son el contenido real (el boletín)
 *    y se pintan encima, re-teñidos por piel vía tokens `--ca-*`.
 *  - Cero canvas, cero JS por frame, partículas DETERMINISTAS (sin
 *    Math.random: mismo cuadro en cada render → captura reproducible).
 *  - Solo `transform`/`opacity` animados; blur/filtros estáticos.
 *
 * Capas (conteo del gate, CA-3): cielos 6 · estrellas 26 · astro 1 · rayos 6 ·
 * nubes 7 (+ rotura 1) · montes 3 · ladera-luz 1 · bruma 1 · suelo 1 · pasto 1 ·
 * frailejones 4 (36 hojas) · gotas 30 · bancos 6 · jirones 4 · motas 16 ·
 * luciérnagas 11 · grades 6 · viñeta 1 · scrims 2 · jirón sobre la UI 1.
 */

/* ── Partículas deterministas (sin Math.random: mismo cuadro en cada render) ── */

const GOTAS = Array.from({ length: 30 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  dur: 0.55 + ((i * 13) % 9) / 20,
  delay: -(((i * 29) % 17) / 10),
  op: 0.35 + ((i * 7) % 5) / 12,
}));

const BANCOS = Array.from({ length: 6 }, (_, i) => ({
  top: 22 + ((i * 23) % 55),
  w: 70 + ((i * 31) % 60),
  dur: 46 + ((i * 17) % 30),
  delay: -((i * 19) % 40),
  op: 0.5 + ((i * 11) % 4) / 10,
}));

const JIRONES = Array.from({ length: 4 }, (_, i) => ({
  top: 30 + ((i * 29) % 50),
  dur: 34 + ((i * 13) % 22),
  delay: -((i * 23) % 30),
}));

const MOTAS = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 41 + 7) % 100,
  y: 18 + ((i * 27) % 70),
  dur: 7 + ((i * 11) % 8),
  delay: -((i * 17) % 12),
  s: 0.6 + ((i * 7) % 5) / 6,
}));

const LUCIERNAGAS = Array.from({ length: 11 }, (_, i) => ({
  x: (i * 43 + 13) % 96,
  y: 42 + ((i * 31) % 46),
  dur: 9 + ((i * 13) % 7),
  blink: 2.4 + ((i * 7) % 9) / 3,
  delay: -((i * 19) % 11),
}));

const ESTRELLAS = Array.from({ length: 26 }, (_, i) => ({
  x: (i * 39 + 5) % 100,
  y: 2 + ((i * 23) % 52),
  dur: 2.5 + ((i * 11) % 10) / 3,
  delay: -((i * 13) % 8) / 2,
  s: i % 4 === 0 ? 2.4 : 1.6,
}));

/* Nube-masa (piel nublado; techo del aguacero al 0.55). Dos techos de estrato
   que dejan una ROTURA entre 62 y 74 vw (donde asoma el astro velado), tres
   cúmulos con panza a media altura y dos masas lejanas, más pálidas, sobre el
   horizonte (perspectiva aérea). x/w en vw, y/h en vh. */
const NUBES = [
  { x: -12, y: -9, w: 74, h: 26, dur: 52, delay: -7, op: 1 },
  { x: 74, y: -6, w: 60, h: 22, dur: 58, delay: -19, op: 1 },
  { x: 14, y: 12, w: 44, h: 16, dur: 44, delay: -3, op: 0.96 },
  { x: 55, y: 16, w: 40, h: 14, dur: 47, delay: -23, op: 0.94 },
  { x: -6, y: 23, w: 36, h: 12, dur: 41, delay: -11, op: 0.9 },
  { x: 22, y: 33, w: 26, h: 7, dur: 63, delay: -5, op: 0.7 },
  { x: 64, y: 32, w: 30, h: 8, dur: 66, delay: -29, op: 0.7 },
];

/* Frailejones: a 800 de viewBox con `xMidYMax slice`, un viewport de 390 px
   solo muestra el tramo x∈[230,570] (defecto A-5 del spec: a 390 px las
   plantas se salían del cuadro). Dos disposiciones, mismas cuatro plantas. */
const FRAILEJONES_ANCHO = [
  { x: 104, y: 132, escala: 1.12 },
  { x: 238, y: 158, escala: 1.5 },
  { x: 636, y: 126, escala: 0.94 },
  { x: 724, y: 162, escala: 1.32 },
];
const FRAILEJONES_COMPACTO = [
  { x: 262, y: 136, escala: 1.2 },
  { x: 334, y: 162, escala: 1.55 },
  { x: 472, y: 132, escala: 1.05 },
  { x: 548, y: 160, escala: 1.4 },
];

/* ── Frailejón: silueta con rosetón de hojas y tallo lanudo + sombra viva ── */

function Frailejon({ x, y, escala }) {
  const hojas = Array.from({ length: 9 }, (_, i) => {
    const ang = -96 + i * 24; // abanico de -96° a +96°
    return (
      <ellipse
        key={ang}
        className="ca-hoja"
        cx="0"
        cy="-16"
        rx="4.6"
        ry="17"
        transform={`rotate(${ang} 0 0)`}
      />
    );
  });
  return (
    <g className="ca-frailejon" transform={`translate(${x} ${y}) scale(${escala})`}>
      {/* La sombra proyectada se alarga y aclara según el estado de luz
          (scaleX + opacity vía tokens --ca-sombra-*, transicionados). */}
      <ellipse className="ca-sombra-planta" cx="-12" cy="3" rx="30" ry="5.5" />
      <rect className="ca-tallo" x="-6" y="-56" width="12" height="58" rx="5" />
      {/* cicatrices foliares del tallo (textura de detalle, catálogo #18) */}
      <path className="ca-cicatriz" d="M-6 -14 h12 M-6 -26 h12 M-6 -38 h12" />
      <g transform="translate(0 -58)">{hojas}</g>
    </g>
  );
}

function esCompacto() {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 520px)').matches;
  } catch (_) {
    return false;
  }
}

/** Contenedor con scroll más cercano (el <main> del shell). */
function scrollParent(el) {
  let node = el?.parentElement || null;
  while (node && node !== document.body) {
    let overflowY = '';
    try {
      overflowY = getComputedStyle(node).overflowY;
    } catch (_) {
      overflowY = '';
    }
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * @param {{condicion?: 'despejado'|'nublado'|'lluvia'|'niebla'|null, luz?: 'amanecer'|'dia'|'atardecer'|'noche'|null, enso?: 'nina'|'nino'|'neutral'|null, forzado?: boolean, children?: React.ReactNode}} props
 */
export default function EscenaAtmosfera({ condicion = null, luz = null, enso = null, forzado = false, children = null }) {
  const rootRef = useRef(null);
  const compacto = useMemo(() => esCompacto(), []);
  const frailejones = compacto ? FRAILEJONES_COMPACTO : FRAILEJONES_ANCHO;

  // Altura real del scrollport → --ca-alto (una medición al montar + resize).
  // Con `position: sticky` la escena queda quieta detrás del contenido sin
  // tapar la barra del shell; no hay JS por frame.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const medir = () => {
      const scroller = scrollParent(root);
      const alto = scroller ? scroller.clientHeight : 0;
      if (alto > 0) root.style.setProperty('--ca-alto', `${alto}px`);
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  const attrs = {};
  if (condicion) attrs['data-clima'] = condicion;
  if (luz) attrs['data-luz'] = luz;
  if (enso === 'nina' || enso === 'nino') attrs['data-enso'] = enso;
  if (forzado) attrs['data-forzado'] = '1';

  return (
    <div ref={rootRef} className="ca-root" data-testid="escena-atmosfera-root" {...attrs}>
      <div className="ca-escena-fija">
        {/* ══ ESCENA (decorativa, aria-hidden): capas de atmósfera ══ */}
        <div className="ca-escena" aria-hidden="true" data-testid="escena-atmosfera">
          {/* Cielos: un gradiente por piel, crossfade de opacity (los
              background-image no interpolan; el velo cruzado sí). */}
          {['despejado', 'nublado', 'lluvia', 'niebla', 'dorada', 'noche'].map((id) => (
            <div key={id} className={`ca-cielo ca-cielo--${id}`} />
          ))}

          {/* Estrellas (solo noche con cielo abierto) */}
          <div className="ca-capa ca-capa--estrellas">
            {ESTRELLAS.map((s, i) => (
              <span
                key={i}
                className="ca-estrella"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  width: s.s,
                  height: s.s,
                  animationDuration: `${s.dur}s`,
                  animationDelay: `${s.delay}s`,
                }}
              />
            ))}
          </div>

          {/* Astro: el MISMO disco viaja y cambia de color según la piel
              (alto y blanco al mediodía, bajo, grande y ámbar en la dorada,
              luna fría de noche, lechoso tras la nube). */}
          <div className="ca-astro">
            <span className="ca-astro-disco" />
            <span className="ca-astro-crater" />
          </div>

          {/* God-rays: abanico que respira, visible con sol franco (catálogo #6);
              bajo nube asoma tenue por la rotura. */}
          <svg className="ca-rayos" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="caRayo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--ca-rayo)" stopOpacity="0.5" />
                <stop offset="1" stopColor="var(--ca-rayo)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g className="ca-rayos-giro">
              {[-64, -38, -14, 12, 38, 62].map((ang) => (
                <path
                  key={ang}
                  d="M100 100 L92 210 L108 210 Z"
                  fill="url(#caRayo)"
                  transform={`rotate(${ang} 100 100)`}
                />
              ))}
            </g>
          </svg>

          {/* Nube-masa: techo de estrato con panza y ROTURA (piel nublado;
              techo del aguacero al 0.55). Masa, no polígono. */}
          <div className="ca-capa ca-capa--nubes">
            <div className="ca-nube-rotura" />
            {NUBES.map((n, i) => (
              <span
                key={i}
                className="ca-nube"
                style={{
                  left: `${n.x}vw`,
                  top: `${n.y}vh`,
                  width: `${n.w}vw`,
                  height: `${n.h}vh`,
                  opacity: n.op,
                  animationDuration: `${n.dur}s`,
                  animationDelay: `${n.delay}s`,
                }}
              />
            ))}
          </div>

          {/* Cordillera en 3 planos: perspectiva aérea (catálogo #8) + luz
              direccional de ladera (#7) vía gradiente fijo sobre los montes. */}
          <svg
            className="ca-cordillera"
            viewBox="0 0 800 340"
            preserveAspectRatio="xMidYMax slice"
          >
            <path
              className="ca-monte ca-monte--1"
              d="M0 216 Q60 168 120 190 Q180 210 240 152 Q300 106 360 168 Q420 222 480 178 Q540 140 600 176 Q660 210 720 170 Q760 146 800 168 L800 340 L0 340 Z"
            />
            <path
              className="ca-monte ca-monte--2"
              d="M0 256 Q80 206 160 236 Q240 264 320 212 Q400 168 480 226 Q560 276 640 228 Q720 192 800 232 L800 340 L0 340 Z"
            />
            <path
              className="ca-monte ca-monte--3"
              d="M0 298 Q100 252 220 282 Q340 310 460 262 Q580 222 700 276 Q750 296 800 268 L800 340 L0 340 Z"
            />
          </svg>
          <div className="ca-ladera-luz" />
          <div className="ca-bruma" />

          {/* Primer plano: suelo de páramo + frailejones con sombra viva */}
          <svg
            className="ca-frente"
            viewBox="0 0 800 190"
            preserveAspectRatio="xMidYMax slice"
          >
            <path
              className="ca-suelo"
              d="M0 74 Q140 40 320 66 Q520 92 680 56 Q748 42 800 58 L800 190 L0 190 Z"
            />
            <path
              className="ca-pasto"
              d="M0 96 Q180 66 400 88 Q620 108 800 82 L800 190 L0 190 Z"
            />
            {frailejones.map((f) => (
              <Frailejon key={`${f.x}-${f.y}`} x={f.x} y={f.y} escala={f.escala} />
            ))}
          </svg>

          {/* Lluvia: cortina de trazos inclinados por el viento */}
          <div className="ca-capa ca-capa--lluvia">
            {GOTAS.map((g, i) => (
              <span
                key={i}
                className="ca-gota"
                style={{
                  left: `${g.x}%`,
                  opacity: g.op,
                  animationDuration: `${g.dur}s`,
                  animationDelay: `${g.delay}s`,
                }}
              />
            ))}
          </div>

          {/* Niebla volumétrica: bancos anchos que derivan + jirones finos en
              contra — la textura deshilachada real (catálogo #4). */}
          <div className="ca-capa ca-capa--niebla">
            {BANCOS.map((b, i) => (
              <span
                key={i}
                className="ca-banco"
                style={{
                  top: `${b.top}%`,
                  width: `${b.w}vw`,
                  opacity: b.op,
                  animationDuration: `${b.dur}s`,
                  animationDelay: `${b.delay}s`,
                }}
              />
            ))}
            {JIRONES.map((j, i) => (
              <span
                key={i}
                className="ca-jiron"
                style={{
                  top: `${j.top}%`,
                  animationDuration: `${j.dur}s`,
                  animationDelay: `${j.delay}s`,
                }}
              />
            ))}
          </div>

          {/* Polvo dorado en suspensión (soleado tenue, dorada pleno) */}
          <div className="ca-capa ca-capa--polvo">
            {MOTAS.map((m, i) => (
              <span
                key={i}
                className="ca-mota"
                style={{
                  left: `${m.x}%`,
                  top: `${m.y}%`,
                  transform: `scale(${m.s})`,
                  animationDuration: `${m.dur}s`,
                  animationDelay: `${m.delay}s`,
                }}
              />
            ))}
          </div>

          {/* Luciérnagas nocturnas: derivan y parpadean (catálogo #14) */}
          <div className="ca-capa ca-capa--luci">
            {LUCIERNAGAS.map((l, i) => (
              <span
                key={i}
                className="ca-luci"
                style={{
                  left: `${l.x}%`,
                  top: `${l.y}%`,
                  animationDuration: `${l.dur}s`,
                  animationDelay: `${l.delay}s`,
                }}
              >
                <i style={{ animationDuration: `${l.blink}s` }} />
              </span>
            ))}
          </div>

          {/* Grades de luz por piel (catálogo #2): crossfade de planos */}
          {['despejado', 'nublado', 'lluvia', 'niebla', 'dorada', 'noche'].map((id) => (
            <div key={id} className={`ca-grade ca-grade--${id}`} />
          ))}

          {/* Viñeta + scrims de cine (catálogo #5) */}
          <div className="ca-vineta" />
          <div className="ca-scrim ca-scrim--alto" />
          <div className="ca-scrim ca-scrim--bajo" />
        </div>
      </div>

      {/* ══ CONTENIDO: el boletín, encima de la escena y re-teñido por piel ══ */}
      <div className="ca-contenido">{children}</div>

      {/* Jirón de niebla que pasa POR ENCIMA de la interfaz: la firma del
          mockup — el afuera toca la UI (solo en niebla, pointer-events none). */}
      <div className="ca-jiron-ui" aria-hidden="true" />
    </div>
  );
}
