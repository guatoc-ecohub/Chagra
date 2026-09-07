import { useId } from 'react';
import './escenaAtmosfera.css';

// Geometría y partículas recuperadas del original versionado.
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

/* NUBLADO — masas sueltas (vh de la ESCENA, que arranca ~9 vh bajo el borde de la pantalla):
   una panza que cierra la grieta por la izquierda, una nube baja con el lomo encendido dentro
   de la grieta y cuatro hilachas oscuras que barren con el viento (dos por la grieta, dos por
   el techo). Techo, panza, claro y banco derivan por CSS; nada se repinta por frame. */
const NUBES = [
  { x: -8, y: 30, w: 56, h: 10, tono: 'panza', dur: 96, delay: -12 },
  { x: 54, y: 31.5, w: 30, h: 6, tono: 'luz', dur: 118, delay: -49 },
  { x: 44, y: 33.4, w: 36, h: 1.4, tono: 'jiron', dur: 22, delay: -9 },
  { x: 62, y: 36.2, w: 34, h: 1.2, tono: 'jiron', dur: 27, delay: -20 },
  { x: 10, y: 9, w: 40, h: 1.6, tono: 'jiron', dur: 31, delay: -4 },
  { x: 40, y: 15.5, w: 44, h: 1.3, tono: 'jiron', dur: 25, delay: -16 },
];

/* NUBLADO — lo que pasa POR DELANTE de la UI (vh del viewport): masas que cruzan la pantalla
   entera de izquierda a derecha (viento del páramo) e hilachas más rápidas. */
const NUBES_FRENTE = [
  { y: 2, w: 88, h: 30, tono: 'masa', dur: 58, delay: -30 },
  { y: 30, w: 80, h: 28, tono: 'masa', dur: 48, delay: -8 },
  { y: 56, w: 92, h: 30, tono: 'masa', dur: 68, delay: -51 },
  { y: 18, w: 70, h: 22, tono: 'masa', dur: 76, delay: -62 },
  { y: 12, w: 64, h: 4, tono: 'hilacha', dur: 22, delay: -6 },
  { y: 40, w: 58, h: 3.4, tono: 'hilacha', dur: 28, delay: -19 },
  { y: 69, w: 68, h: 4.2, tono: 'hilacha', dur: 25, delay: -12 },
];

const ESTRELLAS = Array.from({ length: 26 }, (_, i) => ({
  x: (i * 39 + 5) % 100,
  y: 2 + ((i * 23) % 52),
  dur: 2.5 + ((i * 11) % 10) / 3,
  delay: -((i * 13) % 8) / 2,
  s: i % 4 === 0 ? 2.4 : 1.6,
}));

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
    <g transform={`translate(${x} ${y}) scale(${escala})`}>
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

/** Escena decorativa: el consumidor entrega los tres ejes del servicio. */
export default function EscenaAtmosfera({ condicion = null, luz = null, enso = null }) {
  const rayoId = useId();
  return (
    <div className="ca-root ca-atmosfera" data-clima={condicion || undefined}
      data-luz={luz || undefined} data-enso={enso === 'nino' || enso === 'nina' ? enso : undefined} aria-hidden="true">
      <div className="ca-pegajoso">
      <div className="ca-escena" aria-hidden="true">
        {/* Cielos: un gradiente por estado, crossfade de opacity (los
            background-image no interpolan; el velo cruzado sí). */}
        {['soleado', 'lluvia', 'niebla', 'dorada', 'noche', 'nublado'].map((id) => (
          <div key={id} className={`ca-cielo ca-cielo--${id}`} />
        ))}

        {/* Estrellas (solo noche) */}
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

        {/* Astro: el MISMO disco viaja y cambia de color según el estado
            (alto y blanco al mediodía, bajo, grande y ámbar en la dorada,
            luna fría de noche). */}
        <div className="ca-astro">
          <span className="ca-astro-disco" />
          <span className="ca-astro-crater" />
        </div>

        {/* God-rays: abanico que respira, visible con sol franco (catálogo #6) */}
        <svg className="ca-rayos" viewBox="0 0 200 200">
          <defs>
            <linearGradient id={rayoId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--ca-rayo)" stopOpacity="0.5" />
              <stop offset="1" stopColor="var(--ca-rayo)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g className="ca-rayos-giro">
            {[-64, -38, -14, 12, 38, 62].map((ang) => (
              <path
                key={ang}
                d="M100 100 L92 210 L108 210 Z"
                fill={`url(#${rayoId})`}
                transform={`rotate(${ang} 100 100)`}
              />
            ))}
          </g>
        </svg>

        {/* Techo de nubes (nublado): claro de la grieta, panza (sombra colgante), techo con
            borde deshecho por máscara de ruido, banco bajo con lomo, y las 4 masas sueltas. Solo se enciende con data-clima="nublado"; deriva lentísima por transform. */}
        <div className="ca-capa ca-capa--nubes">
          <div className="ca-claro" />
          <div className="ca-techo-sombra" />
          <div className="ca-techo" />
          <div className="ca-techo-bajo-base" />
          <div className="ca-techo-bajo-lomo" />
          <div className="ca-techo-bajo" />
          {NUBES.map((n, i) => (
            <span
              key={i}
              className={`ca-nube ca-nube--${n.tono}`}
              style={{
                left: `${n.x}vw`,
                top: `${n.y}vh`,
                width: `${n.w}vw`,
                height: `${n.h}vh`,
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
          <Frailejon x={104} y={132} escala={1.12} />
          <Frailejon x={238} y={158} escala={1.5} />
          <Frailejon x={636} y={126} escala={0.94} />
          <Frailejon x={724} y={162} escala={1.32} />
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

        {/* Grades de luz por estado (catálogo #2): crossfade de planos */}
        {['soleado', 'lluvia', 'niebla', 'dorada', 'noche', 'nublado'].map((id) => (
          <div key={id} className={`ca-grade ca-grade--${id}`} />
        ))}

        {/* Viñeta + scrims de cine (catálogo #5) */}
        <div className="ca-vineta" />
        <div className="ca-scrim ca-scrim--alto" />
        <div className="ca-scrim ca-scrim--bajo" />
      </div>

      {/* NUBLADO — la nube pasa POR ENCIMA de la página (z 30, sobre el contenido), como el
          jirón sobre la UI del catálogo (#18): con esta densidad de texto, lo que queda detrás
          se pierde (corrección del operador 2026-09-06). Tres masas bajas que cruzan la
          pantalla, tres hilachas rápidas, la sombra de la nube que oscurece al pasar y una
          bruma que lame el borde inferior. Tonos y alfas topados para que el texto quede
          ≥ 4,5:1 debajo. Solo transform. */}
      <div className="ca-frente-nublado" aria-hidden="true">
        <div className="ca-sombra-pasa" />
        {NUBES_FRENTE.map((n, i) => (
          <span
            key={i}
            className={`ca-nube-frente ca-nube-frente--${n.tono}`}
            style={{
              top: `${n.y}vh`,
              width: `${n.w}vw`,
              height: `${n.h}vh`,
              animationDuration: `${n.dur}s`,
              animationDelay: `${n.delay}s`,
            }}
          />
        ))}
        <div className="ca-bruma-frente" />
      </div>
      </div>

      <div className="ca-jiron-ui" />
    </div>
  );
}
