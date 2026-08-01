/**
 * MOCKUP "El clima como atmósfera viva" — ruta #/mockups/clima-atmosfera.
 *
 * La UI RESPIRA el clima de la finca: un selector de 5 estados (soleado,
 * lluvia, niebla de páramo, hora dorada, noche) re-tiñe TODA la escena —
 * cielo, cordillera, luz, sombras, partículas y hasta las tarjetas de la
 * interfaz — para que la app "viva el afuera".
 *
 * Datos DE MUESTRA (no cablea Open-Meteo ni sesión): decisión visual pura.
 *
 * Técnicas reusadas del catálogo de elementos gráficos (§13):
 *  - #2  grade de luz por estado (planos de color, crossfade de opacity)
 *  - #4  niebla volumétrica viva (bancos + jirones finos que derivan en contra)
 *  - #5  viñeta + scrims de cine (la UI flota sin cajas, el texto siempre lee)
 *  - #6  god-rays con respiración lenta desde el astro
 *  - #7  luz direccional de ladera (la cara que mira al astro recibe luz)
 *  - #8  perspectiva aérea (cordilleras cada vez más pálidas + banda de bruma)
 *  - #14 vida ambiental (luciérnagas que parpadean y derivan)
 *  - #17 re-tinte total por variables (UNA geometría, 5 pieles vía data-clima)
 *  - #20 prefers-reduced-motion como fotograma digno
 *
 * Reglas de la casa: solo transform/opacity animados (blur/filtros estáticos),
 * cero JS por frame (React solo cambia data-clima, el CSS transiciona),
 * responsive hasta 320px, copy en usted cordial.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- mockup dev con datos de
   muestra (no UI de producto); si se productiza, el copy migra a messages.js
   (ADR-050). */
import { useState } from 'react';
import './climaAtmosfera.css';

/* ── Estados de clima (datos de muestra, plausibles para páramo ~2.900 m) ── */

const ESTADOS = [
  { id: 'soleado', etiqueta: 'Soleado' },
  { id: 'lluvia', etiqueta: 'Lluvia' },
  { id: 'niebla', etiqueta: 'Niebla' },
  { id: 'dorada', etiqueta: 'Hora dorada' },
  { id: 'noche', etiqueta: 'Noche' },
];

const MUESTRA = {
  soleado: {
    saludo: 'Buenos días',
    hora: '10:40 a. m.',
    cielo: 'Cielo despejado',
    temp: '19 °C',
    humedad: '48 %',
    viento: '8 km/h',
    consejo:
      'Riegue temprano o al caer la tarde: al mediodía el sol evapora el agua antes de que llegue a la raíz.',
    huerta: 'Buena mañana para deshierbar',
    corral: 'Abra el corral al pastoreo',
  },
  lluvia: {
    saludo: 'Buenas tardes',
    hora: '3:15 p. m.',
    cielo: 'Lluvia constante · 6 mm en la última hora',
    temp: '11 °C',
    humedad: '93 %',
    viento: '14 km/h',
    consejo:
      'Deje descansar los foliares: la lluvia lava el biopreparado antes de que alcance a actuar.',
    huerta: 'Suelo mojado: no pise las eras',
    corral: 'Revise las goteras del techo',
  },
  niebla: {
    saludo: 'Buenos días',
    hora: '6:50 a. m.',
    cielo: 'Niebla de páramo · visibilidad 80 m',
    temp: '9 °C',
    humedad: '98 %',
    viento: '4 km/h',
    consejo:
      'La niebla riega por usted: revise que el drenaje de las eras no se encharque.',
    huerta: 'Hoja húmeda: espere para podar',
    corral: 'Deje el corral cerrado un rato más',
  },
  dorada: {
    saludo: 'Buenas tardes',
    hora: '5:48 p. m.',
    cielo: 'Última luz del día',
    temp: '14 °C',
    humedad: '67 %',
    viento: '6 km/h',
    consejo:
      'Última luz buena para cosechar aromáticas: el aceite esencial está en su punto.',
    huerta: 'Hora de cosechar aromáticas',
    corral: 'Hora de encerrar las gallinas',
  },
  noche: {
    saludo: 'Buenas noches',
    hora: '9:30 p. m.',
    cielo: 'Noche despejada y fría',
    temp: '7 °C',
    humedad: '88 %',
    viento: '3 km/h',
    consejo:
      'Si la temperatura baja de 5 °C, cubra los tomates con la manta térmica antes de acostarse.',
    huerta: 'Las eras descansan',
    corral: 'Corral cerrado, todo en calma',
  },
};

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

/* ── Vista principal ── */

export default function ClimaAtmosfera({ onBack }) {
  const [clima, setClima] = useState('niebla');
  const d = MUESTRA[clima];

  return (
    <div className="ca-root" data-clima={clima}>
      {/* ══ ESCENA (decorativa, aria-hidden): capas de atmósfera ══ */}
      <div className="ca-escena" aria-hidden="true">
        {/* Cielos: un gradiente por estado, crossfade de opacity (los
            background-image no interpolan; el velo cruzado sí). */}
        {ESTADOS.map((e) => (
          <div key={e.id} className={`ca-cielo ca-cielo--${e.id}`} />
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
        {ESTADOS.map((e) => (
          <div key={e.id} className={`ca-grade ca-grade--${e.id}`} />
        ))}

        {/* Viñeta + scrims de cine (catálogo #5) */}
        <div className="ca-vineta" />
        <div className="ca-scrim ca-scrim--alto" />
        <div className="ca-scrim ca-scrim--bajo" />
      </div>

      {/* ══ UI: también recibe el clima (tinte, rim de luz, sombra larga) ══ */}
      <header className="ca-cabecera">
        {onBack && (
          <button type="button" className="ca-volver" onClick={onBack}>
            ← Volver
          </button>
        )}
        <p className="ca-migaja">
          Finca La Esperanza · Choachí, 2 890 m s. n. m.
          <span className="ca-muestra">Datos de muestra</span>
        </p>
        <h1 className="ca-saludo">
          {d.saludo},<br />
          doña Rosa
        </h1>
        <p className="ca-hora">
          {d.hora} · <span key={clima} className="ca-cielo-texto">{d.cielo}</span>
        </p>
      </header>

      <main className="ca-cuerpo">
        <section className="ca-carta ca-carta--clima" aria-live="polite">
          <div className="ca-cifras">
            <div className="ca-cifra">
              <strong>{d.temp}</strong>
              <span>Temperatura</span>
            </div>
            <div className="ca-cifra">
              <strong>{d.humedad}</strong>
              <span>Humedad</span>
            </div>
            <div className="ca-cifra">
              <strong>{d.viento}</strong>
              <span>Viento</span>
            </div>
          </div>
          <p className="ca-consejo">
            <span className="ca-consejo-titulo">Consejo de la finca</span>
            {d.consejo}
          </p>
        </section>

        <div className="ca-mundos">
          <section className="ca-carta ca-carta--mundo">
            <h2>La huerta</h2>
            <p>{d.huerta}</p>
          </section>
          <section className="ca-carta ca-carta--mundo">
            <h2>El corral</h2>
            <p>{d.corral}</p>
          </section>
        </div>
      </main>

      {/* ══ Selector de estado del clima (el control del mockup) ══ */}
      <nav
        className="ca-selector"
        role="radiogroup"
        aria-label="Estado del clima (datos de muestra)"
      >
        {ESTADOS.map((e) => (
          <button
            key={e.id}
            type="button"
            role="radio"
            aria-checked={clima === e.id}
            className={`ca-chip${clima === e.id ? ' ca-chip--activo' : ''}`}
            onClick={() => setClima(e.id)}
          >
            {e.etiqueta}
          </button>
        ))}
      </nav>

      {/* Jirón de niebla que pasa POR ENCIMA de la interfaz: la firma del
          mockup — el afuera toca la UI (solo en niebla, pointer-events none). */}
      <div className="ca-jiron-ui" aria-hidden="true" />
    </div>
  );
}
