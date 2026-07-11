/*
 * EscenaValle — ARQUETIPO `valle`: el MAPA de la finca (la capa lejana).
 *
 * A diferencia de los otros arquetipos (dioramas enfocados que comparten
 * `EscenaBase3D`), el valle YA es una escena-mapa completa y autocontenida:
 * `Valle3D` (traído byte-fiel del mockup "El valle de mi finca"). Este arquetipo
 * es un ADAPTADOR: traduce el contrato uniforme del framework a las props de
 * `Valle3D`, para que el mapa sea "un mundo más" del registro. Tocar un landmark
 * (un mundo del valle) sale por `onHotspot('mundo', { mundoId })` — el host
 * decide si abre ese mundo con `<Mundo>` o navega a su 2D.
 *
 * El componente físico vive en `src/mockups/valle` (el mockup del mapa); aquí solo
 * se adapta, sin redibujarlo — misma geometría procedural, mismo chunk perezoso.
 *
 * ── CIELO TÁCTIL (el mundo del CLIMA) ────────────────────────────────────────
 * El mundo `clima` es AMBIENTAL (mundoData: "ya es 3D ambiental — el cielo del
 * valle"). Aquí vive su parte jugable: una capa DOM sobre el canvas con un sol
 * y unas nubes tocables. Tocar una nube "hace llover" (la piel `lluvia` de
 * CLIMAS oscurece el valle + gotas suaves); tocar el sol "calienta" (la piel
 * `dorada` + resplandor cálido). Es EXPLORACIÓN DIDÁCTICA del dato de clima:
 * el copy dice con delicadeza que no cambia el clima real de la finca.
 *
 * Presupuesto visual (contrato del framework):
 *   · Solo transform/opacity animados (las gotas son translateY puro).
 *   · device-tier bajo/medio → menos gotas; `reducedMotion` → sin lluvia
 *     animada ni nubes a la deriva: el estado se aplica directo (piel + velo
 *     + nota), sin partículas cayendo.
 *   · Todo autocontenido en este archivo (Valle3D no se toca: la capa vive
 *     FUERA de su Canvas, y el valle solo recibe la prop `clima` que ya tenía).
 */
import { useEffect, useMemo, useState } from 'react';
import Valle3D from '../../../mockups/valle/Valle3D.jsx';
import { decidirTier } from '../deviceTier.js';

/* ── El juego del cielo: constantes ─────────────────────────────────────── */

/** Cuánto dura el "rato" de clima jugado antes de volver al clima real (ms). */
const RATO_TACTO_MS = 9000;

/** Gotas por device-tier (bajo no monta 3D, pero se cubre por si acaso). */
const GOTAS_POR_TIER = { alto: 44, medio: 22, bajo: 12 };

/** Copy honesto: explorar el dato, sin prometer mandar sobre el clima real. */
const NOTA = {
  lluvia:
    'Así se ve la lluvia en su valle. Es para explorar el clima jugando: la lluvia de verdad no se manda con un toque.',
  sol: 'Así se siente la luz cálida en su valle. Es para explorar el clima jugando: el sol de verdad va por su cuenta.',
};
const PISTA = 'Toque una nube o el sol del cielo';

/** Las nubes del cielo táctil (posiciones en % sobre la capa). */
const NUBES = [
  { id: 'n1', left: '16%', top: '7%', escala: 1, deriva: 'a' },
  { id: 'n2', left: '42%', top: '15%', escala: 0.72, deriva: 'b' },
  { id: 'n3', left: '64%', top: '4%', escala: 0.88, deriva: 'a', soloAlto: true },
];

/* ── Estilos de la capa (autocontenidos; solo transform/opacity animan) ──── */
const CSS_CIELO = `
.vclima-raiz{position:relative;flex:1;min-width:0;min-height:0;width:100%;height:100%;overflow:hidden;border-radius:inherit}
.vclima-capa{position:absolute;inset:0;z-index:4;pointer-events:none;overflow:hidden;border-radius:inherit}
.vclima-velo{position:absolute;inset:0;opacity:0;transition:opacity 1.1s ease}
.vclima-velo--lluvia{background:linear-gradient(to bottom,rgba(38,52,64,0.42),rgba(38,52,64,0.16) 55%,rgba(38,52,64,0))}
.vclima-velo--sol{background:radial-gradient(circle at 82% 12%,rgba(255,209,138,0.5),rgba(255,209,138,0.14) 45%,rgba(255,209,138,0) 70%)}
.vclima-velo--activo{opacity:1}
.vclima-tocable{position:absolute;pointer-events:auto;margin:0;padding:4px;background:none;border:none;cursor:pointer;line-height:0;transition:transform .5s ease,filter .9s ease;-webkit-tap-highlight-color:transparent}
.vclima-tocable:focus-visible{outline:2px solid #3f8f4e;outline-offset:2px;border-radius:12px}
.vclima-tocable:active{transform:scale(0.94)}
.vclima-nube svg{filter:drop-shadow(0 2px 5px rgba(40,50,60,0.18))}
.vclima-nube--gris svg{filter:brightness(0.68) saturate(0.8) drop-shadow(0 2px 6px rgba(20,28,36,0.3))}
.vclima-sol svg{filter:drop-shadow(0 0 6px rgba(255,196,92,0.55))}
.vclima-sol--brilla svg{filter:drop-shadow(0 0 16px rgba(255,196,92,0.95)) drop-shadow(0 0 34px rgba(255,170,60,0.5))}
.vclima-sol--brilla{transform:scale(1.08)}
@keyframes vclima-deriva-a{from{transform:translate3d(-9px,0,0)}to{transform:translate3d(9px,0,0)}}
@keyframes vclima-deriva-b{from{transform:translate3d(7px,0,0)}to{transform:translate3d(-7px,0,0)}}
.vclima-nube--deriva-a{animation:vclima-deriva-a 13s ease-in-out infinite alternate}
.vclima-nube--deriva-b{animation:vclima-deriva-b 17s ease-in-out infinite alternate}
.vclima-lluvia{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.vclima-gota{position:absolute;top:-100%;height:100%;width:2px;border-radius:2px;background:linear-gradient(to bottom,rgba(196,219,236,0) 0 86%,rgba(196,219,236,0.85) 94%,rgba(214,233,246,0.95) 100%);animation:vclima-caer var(--dur) linear var(--delay) infinite;will-change:transform}
@keyframes vclima-caer{from{transform:translate3d(0,0,0)}to{transform:translate3d(-7px,200%,0)}}
.vclima-nota{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:4;max-width:min(92%,34rem);padding:.5em .95em;border-radius:12px;background:rgba(24,30,24,0.78);color:#f5efdf;font-size:.8rem;line-height:1.35;text-align:center;pointer-events:none;opacity:0;transition:opacity .6s ease}
.vclima-nota--visible{opacity:1}
@media (prefers-reduced-motion:reduce){.vclima-nube--deriva-a,.vclima-nube--deriva-b{animation:none}.vclima-gota{animation:none}}
`;

/* ── Piezas del cielo ────────────────────────────────────────────────────── */

function NubeSvg({ ancho }) {
  return (
    <svg width={ancho} height={ancho * 0.56} viewBox="0 0 100 56" aria-hidden="true">
      <g fill="rgba(255,255,255,0.94)">
        <ellipse cx="30" cy="38" rx="26" ry="15" />
        <ellipse cx="56" cy="28" rx="24" ry="18" />
        <ellipse cx="76" cy="40" rx="20" ry="12" />
      </g>
    </svg>
  );
}

function SolSvg({ ancho }) {
  const rayos = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return {
          x1: 50 + Math.cos(a) * 26,
          y1: 50 + Math.sin(a) * 26,
          x2: 50 + Math.cos(a) * 40,
          y2: 50 + Math.sin(a) * 40,
        };
      }),
    []
  );
  return (
    <svg width={ancho} height={ancho} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="20" fill="#ffd26e" stroke="#f2a93b" strokeWidth="2.5" />
      {rayos.map((r, i) => (
        <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="#f2a93b" strokeWidth="4" strokeLinecap="round" />
      ))}
    </svg>
  );
}

/** Ruido determinista en [0,1) — puro (sin Math.random en render). */
const ruido = (i, sal) => {
  const x = Math.sin(i * 127.1 + sal * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function Lluvia({ cantidad }) {
  // Posiciones/fases estables y PURAS (ruido determinista por índice): solo
  // transform anima (translateY sobre la propia altura = cruza la capa).
  const gotas = useMemo(
    () =>
      Array.from({ length: cantidad }, (_, i) => ({
        id: i,
        left: `${(i / cantidad) * 100 + ruido(i, 1) * (100 / cantidad)}%`,
        dur: `${(0.9 + ruido(i, 2) * 0.8).toFixed(2)}s`,
        delay: `${(-ruido(i, 3) * 1.7).toFixed(2)}s`,
        opacidad: 0.5 + ruido(i, 4) * 0.5,
      })),
    [cantidad]
  );
  return (
    <div className="vclima-lluvia" aria-hidden="true">
      {gotas.map((g) => (
        <span
          key={g.id}
          className="vclima-gota"
          style={{ left: g.left, opacity: g.opacidad, '--dur': g.dur, '--delay': g.delay }}
        />
      ))}
    </div>
  );
}

/** La capa del cielo táctil: sol + nubes tocables, velo, lluvia y nota honesta. */
function CieloTactil({ tacto, onTocar, tier, reducedMotion, yaToco }) {
  const gotas = GOTAS_POR_TIER[tier] ?? GOTAS_POR_TIER.medio;
  const nubes = NUBES.filter((n) => !n.soloAlto || tier === 'alto');
  const nota = tacto ? NOTA[tacto] : yaToco ? '' : PISTA;

  return (
    <div className="vclima-capa">
      <style>{CSS_CIELO}</style>
      <div className={`vclima-velo vclima-velo--lluvia${tacto === 'lluvia' ? ' vclima-velo--activo' : ''}`} />
      <div className={`vclima-velo vclima-velo--sol${tacto === 'sol' ? ' vclima-velo--activo' : ''}`} />

      {tacto === 'lluvia' && !reducedMotion && <Lluvia cantidad={gotas} />}

      {nubes.map((n) => (
        <button
          key={n.id}
          type="button"
          className={[
            'vclima-tocable',
            'vclima-nube',
            tacto === 'lluvia' ? 'vclima-nube--gris' : '',
            reducedMotion ? '' : `vclima-nube--deriva-${n.deriva}`,
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ left: n.left, top: n.top }}
          onClick={() => onTocar('lluvia')}
          aria-pressed={tacto === 'lluvia'}
          aria-label="Nube: mire cómo se vería un rato de lluvia en el valle"
        >
          <NubeSvg ancho={72 * n.escala} />
        </button>
      ))}

      <button
        type="button"
        className={`vclima-tocable vclima-sol${tacto === 'sol' ? ' vclima-sol--brilla' : ''}`}
        style={{ right: '5%', top: '6%' }}
        onClick={() => onTocar('sol')}
        aria-pressed={tacto === 'sol'}
        aria-label="Sol: mire cómo se vería la luz cálida en el valle"
      >
        <SolSvg ancho={56} />
      </button>

      <p className={`vclima-nota${nota ? ' vclima-nota--visible' : ''}`} role="status">
        {nota}
      </p>
    </div>
  );
}

/* ── El adaptador del arquetipo ──────────────────────────────────────────── */

export default function EscenaValle({ params, entrada, reducedMotion = false, onHotspot, animo = 'sereno', energia = 1 }) {
  const climaReal = params?.clima || entrada?.clima || 'soleado';
  const tier = useMemo(() => decidirTier().tier, []);

  // El clima "jugado": null = el clima real manda. Tocar de nuevo lo apaga.
  const [tacto, setTacto] = useState(null); // null | 'lluvia' | 'sol'
  const [yaToco, setYaToco] = useState(false);
  const tocar = (cual) => {
    setYaToco(true);
    setTacto((prev) => (prev === cual ? null : cual));
  };

  // El rato jugado vuelve solo al clima real (el dato manda, el juego pasa).
  useEffect(() => {
    if (!tacto) return undefined;
    const t = setTimeout(() => setTacto(null), RATO_TACTO_MS);
    return () => clearTimeout(t);
  }, [tacto]);

  // Reusa las pieles reales de CLIMAS: lluvia oscurece, dorada calienta.
  const climaVista = tacto === 'lluvia' ? 'lluvia' : tacto === 'sol' ? 'dorada' : climaReal;

  return (
    <div className="vclima-raiz">
      <Valle3D
        clima={climaVista}
        focoId={null}
        animo={animo}
        energia={energia}
        reducedMotion={reducedMotion}
        onEntrar={(id) => onHotspot?.('mundo', { mundoId: id })}
        onAlerta={() => onHotspot?.(entrada?.alertaView || 'hoy_finca')}
      />
      <CieloTactil tacto={tacto} onTocar={tocar} tier={tier} reducedMotion={reducedMotion} yaToco={yaToco} />
    </div>
  );
}
