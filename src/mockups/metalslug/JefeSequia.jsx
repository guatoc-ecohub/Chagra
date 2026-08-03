/**
 * JefeSequia — "El Niño abrasador": el JEFE del Metal Slug del campo, ahora
 * jefe multi-fase estilo Cuphead (SOLO ARTE — la mecánica es de otro carril).
 *
 * Grounding: JEFES[jefe_sequia] en metalSlugCampoData (IDEAM/Fenalce, ENSO).
 * No es una plaga: es la amenaza estructural que seca la finca entera. Como
 * villano Cuphead, cada fase es una TRANSFORMACIÓN con más furia:
 *
 *   fase 1 — EL PATRÓN SONRIENTE: sonrisota dientona burlona, párpados
 *            pesados de suficiencia, pupilas pie-cut, corona de rayos
 *            girando perezosa. Se ríe cada tanto (reloj co-primo 6.3 s).
 *   fase 2 — EL ABRASADOR: cejas en V, pupilas de llama, dientes apretados,
 *            rayos-relámpago que brotan en contra-giro, suda gotas que
 *            saltan, la respiración se acelera. Telegrafía una "racha de
 *            calor" (anticipación → smear ultracorto → asentamiento, 9.7 s).
 *   fase 3 — LA GRIETA VIVA: la cara se CUARTEA como tierra seca (la grieta
 *            central palpita), ojos desencajados (uno grande, uno chico),
 *            grito con lengua reseca colgando, tambaleo desesperado.
 *   derrota — KO Cuphead: ojos en espiral, rayos apagados, puchero, nubecita
 *            de vapor... y LLUEVE (la sequía se vence cuidando el agua).
 *
 * Lenguaje del rig aprobado (guias-rig F2) + DR-RUBBERHOSE-ANIMACION-MAX:
 * curvas canónicas (anticipación/overshoot), relojes co-primos (1.9 · 2.3 ·
 * 5.6 · 6.3 · 9.7 · 17.3 s), respiración asimétrica (inhale 60 %), smears de
 * 1–2 "frames" (~2 % del ciclo), transformación de fase con pop elástico, y
 * LINE-BOIL sobre cara y corona (filtros #msc-boil-* de TintaCuphead — deben
 * estar montados en la página; sin ellos el filtro se ignora o no pinta).
 *
 * Consumo: <JefeSequia fase={1|2|3} derrotado reducedMotion size/> con
 * key={fase} para que el cambio de fase dispare el pop de transformación.
 * Gama baja: data-tier="bajo" en .msc-root apaga los filtros; reducedMotion
 * congela toda animación (las POSES por fase se conservan).
 */
import { memo } from 'react';

const TINTA = '#4a1d06';
const CX = 130;
const CY = 128;

/* ── Corona de rayos (precomputada, determinista). ──────────────────────────── */
/* Suaves: 12 pétalos redondeados (el sol "amable" de la fase 1). */
const RAYOS_SUAVES = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
  const r0 = 78;
  const r1 = i % 2 === 0 ? 118 : 103;
  const w = 13;
  const x0 = CX + Math.cos(a) * r0;
  const y0 = CY + Math.sin(a) * r0;
  const x1 = CX + Math.cos(a) * r1;
  const y1 = CY + Math.sin(a) * r1;
  const px = Math.cos(a + Math.PI / 2) * w;
  const py = Math.sin(a + Math.PI / 2) * w;
  return {
    d: `M${(x0 - px).toFixed(1)} ${(y0 - py).toFixed(1)} Q${x1.toFixed(1)} ${y1.toFixed(1)} ${(x0 + px).toFixed(1)} ${(y0 + py).toFixed(1)} Z`,
    par: i % 2 === 0,
  };
});

/* Bravos: 16 púas-relámpago quebradas (brotan de la fase 2 en adelante). */
const RAYOS_BRAVOS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2 - Math.PI / 2 + 0.196;
  const r0 = 80;
  const rM = i % 2 === 0 ? 116 : 104;
  const r1 = i % 2 === 0 ? 138 : 121;
  const w = 6.5;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const px = Math.cos(a + Math.PI / 2);
  const py = Math.sin(a + Math.PI / 2);
  const x0a = CX + cos * r0 - px * w;
  const y0a = CY + sin * r0 - py * w;
  const xm = CX + cos * rM + px * 7;
  const ym = CY + sin * rM + py * 7;
  const x1 = CX + cos * r1 - px * 2;
  const y1 = CY + sin * r1 - py * 2;
  const x0b = CX + cos * r0 + px * w;
  const y0b = CY + sin * r0 + py * w;
  return {
    d: `M${x0a.toFixed(1)} ${y0a.toFixed(1)} L${xm.toFixed(1)} ${ym.toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)} L${x0b.toFixed(1)} ${y0b.toFixed(1)} Z`,
    par: i % 2 === 0,
  };
});

/* ── Un ojo (posicionador + capa animable + variantes de pupila por fase). ──── */
function Ojo({ lado }) {
  const ex = lado === 'I' ? 104 : 156;
  return (
    <g className={`js-ojo${lado}`}>
      <g className="js-ojoAnim">
        <ellipse cx={ex} cy="113" rx="15.5" ry="17.5" fill="#fff8e6" stroke={TINTA} strokeWidth="3.4" />
        {/* pupilas por fase (posicionadas mirando al frente de batalla) */}
        <g transform={`translate(${ex - 4} 118)`}>
          {/* fase 1: pie-cut burlona */}
          <g className="js-f1">
            <circle r="7" fill={TINTA} />
            <path d="M0 0 L-6.6 -3.6 L-3.4 -6.8 Z" fill="#fff8e6" />
            <circle cx="2.2" cy="-2.6" r="1.8" fill="#fff8e6" />
          </g>
          {/* fase 2: llama */}
          <g className="js-f2">
            <path d="M0 8 C-6 3 -5 -3 0 -10 C1 -6 4 -6 3 -2 C6 -3 5 4 0 8 Z" fill="#d8341c" stroke={TINTA} strokeWidth="1.4" />
            <path d="M0 5 C-2.5 2 -2 -2 0 -5 C2 -2.5 2.5 2 0 5 Z" fill="#ffd24a" />
          </g>
          {/* fase 3: puntico tembloroso + venitas */}
          <g className="js-f3">
            <circle r="3.2" fill={TINTA} />
            <path d={lado === 'I' ? 'M-11 -7 l5 3 M-9 6 l4 -2' : 'M11 -7 l-5 3 M9 6 l-4 -2'} stroke="#d8341c" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </g>
          {/* derrota: espiral KO */}
          <g className="js-fko">
            <path className="js-espiral" d="M0 0 q4 -1 4 3 q0 5 -6 5 q-8 0 -8 -8 q0 -9 10 -9" fill="none" stroke={TINTA} strokeWidth="2.4" strokeLinecap="round" />
          </g>
        </g>
        {/* párpado pesado (scaleY por fase: suficiencia → furia → desencaje) */}
        <ellipse className={`js-parpado js-parpado${lado}`} cx={ex} cy="113" rx="16.5" ry="18.5" fill="#efa22e" stroke={TINTA} strokeWidth="2.6" />
      </g>
    </g>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
const JefeSequia = memo(function JefeSequia(/** @type {any} */ {
  size = 260,
  fase = 1,
  derrotado = false,
  reducedMotion = false,
  title,
}) {
  const f = Math.min(3, Math.max(1, Math.round(fase)));
  const dataFase = derrotado ? 'ko' : String(f);
  const rotulo = title || (derrotado
    ? 'El Niño abrasador, vencido: vuelve la lluvia'
    : `El Niño abrasador (sequía) — fase ${f}`);
  return (
    <svg
      viewBox="0 0 260 260"
      width={size}
      height={size}
      role="img"
      aria-label={rotulo}
      className="msc-js"
      data-fase={dataFase}
      data-rm={reducedMotion ? '1' : '0'}
    >
      <style>{CSS_JEFE}</style>
      <defs>
        <radialGradient id="jsSolA" cx="0.42" cy="0.4" r="0.62">
          <stop offset="0" stopColor="#fff2b0" />
          <stop offset="0.5" stopColor="#ffb43a" />
          <stop offset="1" stopColor="#e5691a" />
        </radialGradient>
        <radialGradient id="jsSolB" cx="0.42" cy="0.4" r="0.62">
          <stop offset="0" stopColor="#ffe089" />
          <stop offset="0.5" stopColor="#ff9430" />
          <stop offset="1" stopColor="#d84e0e" />
        </radialGradient>
        <radialGradient id="jsSolC" cx="0.42" cy="0.4" r="0.62">
          <stop offset="0" stopColor="#ffc46a" />
          <stop offset="0.5" stopColor="#ef6f16" />
          <stop offset="1" stopColor="#b03a06" />
        </radialGradient>
        <radialGradient id="jsSolKo" cx="0.42" cy="0.4" r="0.62">
          <stop offset="0" stopColor="#e8dcc2" />
          <stop offset="0.55" stopColor="#c9a86a" />
          <stop offset="1" stopColor="#8f7448" />
        </radialGradient>
        <radialGradient id="jsHalo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd76a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd76a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="jsBocaG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a1c05" />
          <stop offset="1" stopColor="#380c02" />
        </linearGradient>
      </defs>

      <g className="js-todo">
        {/* halo de calor (se apaga en la derrota) */}
        <circle className="js-halo" cx={CX} cy={CY} r="122" fill="url(#jsHalo)" />

        {/* aro de choque de la transformación (visible solo al montar la fase) */}
        <circle className="js-onda" cx={CX} cy={CY} r="96" fill="none" stroke="#fff2b0" strokeWidth="7" />

        <g className="js-transforma">
          <g className="js-antic">
            {/* onda de la racha de calor (telegrafía del ataque, fases 2-3) */}
            <circle className="js-ondaCalor" cx={CX} cy={CY} r="92" fill="none" stroke="#ffcaa0" strokeWidth="5" />

            {/* corona: pétalos suaves + púas-relámpago en contra-giro */}
            <g className="js-rayos js-rayosSuaves">
              {RAYOS_SUAVES.map((r) => (
                <path key={r.d} d={r.d} className={r.par ? 'js-rayoA' : 'js-rayoB'} stroke={TINTA} strokeWidth="2.6" strokeLinejoin="round" />
              ))}
            </g>
            <g className="js-rayos js-rayosBravos">
              {RAYOS_BRAVOS.map((r) => (
                <path key={r.d} d={r.d} className={r.par ? 'js-rayoA' : 'js-rayoB'} stroke={TINTA} strokeWidth="2.2" strokeLinejoin="round" />
              ))}
            </g>

            <g className="js-masa">
              <g className="js-cara">
                {/* disco solar (el gradiente cambia con la fase) */}
                <circle className="js-disco" cx={CX} cy={CY} r="76" stroke={TINTA} strokeWidth="5" />

                {/* tierra cuarteada: tres juegos de grietas que crecen con la furia */}
                <g className="js-grieta1">
                  <path d="M96 74 l10 7 l-6 8 M158 70 l-9 8 l7 7 M130 62 l-3 10 l6 5" stroke="#b5561a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
                </g>
                <g className="js-grieta2">
                  <path d="M76 116 l12 4 l-4 9 M184 112 l-12 6 l5 8 M112 68 l4 9 l8 2 M170 138 l-9 5 l3 8" stroke="#a34412" strokeWidth="2.8" fill="none" strokeLinecap="round" />
                </g>
                <g className="js-grieta3">
                  <path d="M128 54 L124 78 L133 96 L126 118 L134 138 L128 148" stroke="#6e2506" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M124 78 l-11 6 M133 96 l11 4 M126 118 l-12 3 M134 138 l10 5" stroke="#6e2506" strokeWidth="3" fill="none" strokeLinecap="round" />
                </g>

                {/* chapetas de suficiencia (solo el patrón sonriente) */}
                <g className="js-cachetes">
                  <ellipse cx="92" cy="140" rx="10" ry="6.5" fill="#f2703c" />
                  <ellipse cx="168" cy="140" rx="10" ry="6.5" fill="#f2703c" />
                </g>

                {/* cejas (pose por fase; tic nervioso en fase 3) */}
                <g className="js-cejaI">
                  <path className="js-cejaTic" d="M85 92 Q104 79 123 90" fill="none" stroke={TINTA} strokeWidth="7" strokeLinecap="round" />
                </g>
                <g className="js-cejaD">
                  <path className="js-cejaTic" d="M175 92 Q156 79 137 90" fill="none" stroke={TINTA} strokeWidth="7" strokeLinecap="round" />
                </g>

                {/* ojos */}
                <Ojo lado="I" />
                <Ojo lado="D" />

                {/* ── BOCAS por fase ── */}
                {/* fase 1: la sonrisota dientona con rizos de esquina */}
                <g className="js-boca js-bocaGrin js-f1">
                  <path d="M88 148 Q130 196 172 148 Q130 170 88 148 Z" fill="url(#jsBocaG)" stroke={TINTA} strokeWidth="4" strokeLinejoin="round" />
                  <path d="M94 151 Q130 182 166 151 Q130 163 94 151 Z" fill="#fff8e6" stroke={TINTA} strokeWidth="2" />
                  <path d="M106 156 l1 5.5 M118 158 l.5 7 M130 159 l0 7.5 M142 158 l-.5 7 M154 156 l-1 5.5" stroke={TINTA} strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M84 146 q-7 -2 -8 -9 M176 146 q7 -2 8 -9" fill="none" stroke={TINTA} strokeWidth="4" strokeLinecap="round" />
                </g>
                {/* fase 2: dientes apretados (gruñido) */}
                <g className="js-boca js-bocaGrunido js-f2">
                  <path d="M96 152 Q130 143 164 152 Q166 172 130 177 Q94 172 96 152 Z" fill="#fff8e6" stroke={TINTA} strokeWidth="3.4" strokeLinejoin="round" />
                  <path d="M98 161 Q130 168 162 161" fill="none" stroke={TINTA} strokeWidth="2.2" />
                  <path d="M108 152 l1 20 M119 149 l1 25 M130 148 l0 27 M141 149 l-1 25 M152 152 l-1 20" stroke={TINTA} strokeWidth="1.6" />
                  <path d="M92 154 q-6 4 -5 11 M168 154 q6 4 5 11" fill="none" stroke={TINTA} strokeWidth="3.6" strokeLinecap="round" />
                </g>
                {/* fase 3: grito con lengua reseca colgando */}
                <g className="js-boca js-bocaGrito js-f3">
                  <path d="M98 148 Q130 140 162 148 Q170 186 130 194 Q90 186 98 148 Z" fill="url(#jsBocaG)" stroke={TINTA} strokeWidth="4" strokeLinejoin="round" />
                  <path d="M103 149 l6.5 9 l7 -8.5 Z M120 147 l6.5 9 l7 -8.5 Z M137 147 l6.5 9 l7 -8.5 Z" fill="#fff8e6" stroke={TINTA} strokeWidth="1.4" strokeLinejoin="round" />
                  <g className="js-lenguaPos">
                    <path className="js-lengua" d="M116 189 q2 15 14 15 q12 -1 11 -16 q-12 7 -25 1 Z" fill="#b5512e" stroke={TINTA} strokeWidth="2.6" strokeLinejoin="round" />
                    <path className="js-lengua js-lenguaGrieta" d="M126 193 l2 7 M134 192 l-1 8" stroke="#7a2c12" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                  </g>
                </g>
                {/* derrota: puchero tembloroso + lagrimita */}
                <g className="js-boca js-bocaKo js-fko">
                  <path d="M106 172 Q118 161 130 171 Q142 181 154 170" fill="none" stroke={TINTA} strokeWidth="5" strokeLinecap="round" />
                  <path className="js-lagrima" d="M160 128 q4 7 0 10 q-4 -3 0 -10 Z" fill="#bfe3ef" stroke={TINTA} strokeWidth="1.4" />
                </g>

                {/* sudor que salta (fases 2-3) */}
                <g className="js-sudor">
                  <g transform="translate(64 86)"><path className="js-gota" style={{ '--sx': '-15px', '--sy': '-11px' }} d="M0 0 q4.5 6.5 0 10 q-4.5 -3.5 0 -10 Z" fill="#fff8e6" stroke={TINTA} strokeWidth="1.6" /></g>
                  <g transform="translate(196 78)"><path className="js-gota g2" style={{ '--sx': '14px', '--sy': '-12px' }} d="M0 0 q4.5 6.5 0 10 q-4.5 -3.5 0 -10 Z" fill="#fff8e6" stroke={TINTA} strokeWidth="1.6" /></g>
                  <g transform="translate(86 52)"><path className="js-gota g3" style={{ '--sx': '-9px', '--sy': '-15px' }} d="M0 0 q4.5 6.5 0 10 q-4.5 -3.5 0 -10 Z" fill="#fff8e6" stroke={TINTA} strokeWidth="1.6" /></g>
                </g>

                {/* vapor del desespero (fase 3) */}
                <g className="js-vapor">
                  <path d="M76 214 q7 -13 0 -24 q-7 -11 0 -22" stroke="#ffcaa0" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M130 220 q7 -13 0 -24 q-7 -11 0 -22" stroke="#ffd7b0" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M184 214 q7 -13 0 -24 q-7 -11 0 -22" stroke="#ffcaa0" strokeWidth="3" fill="none" strokeLinecap="round" />
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* derrota: nubecita de vapor que se vuelve LLUVIA (la lección del jefe) */}
        <g className="js-koExtras">
          <g className="js-nube">
            <ellipse cx="118" cy="34" rx="20" ry="11" fill="#eef0e6" stroke={TINTA} strokeWidth="2.4" />
            <ellipse cx="140" cy="30" rx="15" ry="9" fill="#f6f7f0" stroke={TINTA} strokeWidth="2.4" />
            <ellipse cx="132" cy="40" rx="24" ry="9" fill="#eef0e6" stroke={TINTA} strokeWidth="2.4" />
          </g>
          <g>
            <path className="js-lluvia" d="M112 52 q3 5 0 9" stroke="#5f9ec9" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path className="js-lluvia l2" d="M132 54 q3 5 0 9" stroke="#5f9ec9" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path className="js-lluvia l3" d="M150 50 q3 5 0 9" stroke="#5f9ec9" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        </g>
      </g>
    </svg>
  );
});

/* ════════════════════════ HOJA DEL JEFE (autocontenida) ═════════════════════ */
const CSS_JEFE = `
.msc-js{overflow:visible}
.msc-js *{transform-box:fill-box}
.msc-js{
  --msjs-ov:cubic-bezier(.34,1.56,.64,1);   /* overshoot canónico */
  --msjs-antic:cubic-bezier(.34,-.2,.64,1); /* anticipación canónica */
  --js-giro:26s; --js-resp:3.2s; --js-lat:3.2s;
}
.msc-js[data-fase="2"]{--js-giro:14s; --js-resp:2.1s; --js-lat:2.1s}
.msc-js[data-fase="3"]{--js-giro:7s;  --js-resp:1.35s; --js-lat:1.3s}

/* la tinta hierve: cara y corona con line-boil (filtros de TintaCuphead) */
.msc-js .js-cara{filter:url(#msc-boil-b)}
.msc-js .js-rayosSuaves{filter:url(#msc-boil-c)}
.msc-js .js-rayosBravos{filter:url(#msc-boil-a)}
.msc-root[data-tier="bajo"] .msc-js .js-cara,
.msc-root[data-tier="bajo"] .msc-js .js-rayosSuaves,
.msc-root[data-tier="bajo"] .msc-js .js-rayosBravos{filter:none}

/* ── color por fase ── */
.js-disco{fill:url(#jsSolA)}
.msc-js[data-fase="2"] .js-disco{fill:url(#jsSolB)}
.msc-js[data-fase="3"] .js-disco{fill:url(#jsSolC)}
.msc-js[data-fase="ko"] .js-disco{fill:url(#jsSolKo)}
.js-rayoA{fill:#ffb02e}.js-rayoB{fill:#f58a1f}
.msc-js[data-fase="2"] .js-rayoA{fill:#ff9430}.msc-js[data-fase="2"] .js-rayoB{fill:#e8641a}
.msc-js[data-fase="3"] .js-rayoA{fill:#f2701c}.msc-js[data-fase="3"] .js-rayoB{fill:#cf4a0e}
.msc-js[data-fase="ko"] .js-rayoA{fill:#c9a86a}.msc-js[data-fase="ko"] .js-rayoB{fill:#b08e56}
.msc-js[data-fase="ko"] .js-todo{filter:saturate(.5) brightness(.96)}

/* ── qué se ve en cada fase ── */
.js-f1,.js-f2,.js-f3,.js-fko{opacity:0}
.msc-js[data-fase="1"] .js-f1,
.msc-js[data-fase="2"] .js-f2,
.msc-js[data-fase="3"] .js-f3,
.msc-js[data-fase="ko"] .js-fko{opacity:1}
.js-rayosBravos{opacity:0}
.msc-js[data-fase="2"] .js-rayosBravos{opacity:.95}
.msc-js[data-fase="3"] .js-rayosBravos{opacity:1}
.js-grieta1{opacity:.55}
.js-grieta2,.js-grieta3{opacity:0}
.msc-js[data-fase="2"] .js-grieta2{opacity:.8}
.msc-js[data-fase="3"] .js-grieta2{opacity:.9}
.msc-js[data-fase="3"] .js-grieta3{opacity:1}
.js-cachetes{opacity:0}
.msc-js[data-fase="1"] .js-cachetes{opacity:.55}
.msc-js[data-fase="ko"] .js-cachetes{opacity:.3}
.js-sudor{opacity:0}
.msc-js[data-fase="2"] .js-sudor,.msc-js[data-fase="3"] .js-sudor{opacity:1}
.js-vapor{opacity:0}
.msc-js[data-fase="3"] .js-vapor{opacity:.55}
.js-koExtras{opacity:0}
.msc-js[data-fase="ko"] .js-koExtras{opacity:1}
.msc-js[data-fase="ko"] .js-halo{opacity:0}

/* ── poses (cejas y párpados): la actitud de cada fase ── */
.msc-js[data-fase="1"] .js-cejaI{transform:translateY(-4px) rotate(-8deg)}
.msc-js[data-fase="1"] .js-cejaD{transform:translateY(-1px) rotate(3deg)}
.msc-js[data-fase="2"] .js-cejaI{transform:translateY(6px) rotate(17deg)}
.msc-js[data-fase="2"] .js-cejaD{transform:translateY(6px) rotate(-17deg)}
.msc-js[data-fase="3"] .js-cejaI{transform:translateY(9px) rotate(24deg) scaleY(1.18)}
.msc-js[data-fase="3"] .js-cejaD{transform:translateY(9px) rotate(-24deg) scaleY(1.18)}
.msc-js[data-fase="ko"] .js-cejaI{transform:translateY(-7px) rotate(9deg)}
.msc-js[data-fase="ko"] .js-cejaD{transform:translateY(-7px) rotate(-9deg)}
.js-parpado{transform-origin:50% 0%;transform:scaleY(.52)}
.msc-js[data-fase="2"] .js-parpado{transform:scaleY(.14)}
.msc-js[data-fase="3"] .js-parpado{transform:scaleY(.05)}
.msc-js[data-fase="ko"] .js-parpado{transform:scaleY(.42)}
/* fase 3: ojos desencajados (uno grande, uno chico) */
.msc-js[data-fase="3"] .js-ojoI{transform:scale(1.18)}
.msc-js[data-fase="3"] .js-ojoD{transform:scale(.82)}

/* ═══ VIDA (relojes co-primos; nada cae en el mismo compás) ═══ */

/* respiración asimétrica: inhale lento hasta el 60 %, exhale rápido */
.js-masa{transform-origin:50% 52%;animation:msjsResp var(--js-resp) ease-in-out infinite}
@keyframes msjsResp{
  0%{transform:scale(1,1)}
  60%{transform:scale(.984,1.026)}
  100%{transform:scale(1,1)}
}

/* corona: giro perezoso → furioso; las púas contra-giran */
.js-rayos{transform-origin:50% 50%}
.js-rayosSuaves{animation:msjsGiro var(--js-giro) linear infinite}
.js-rayosBravos{animation:msjsGiro calc(var(--js-giro) * .72) linear infinite reverse}
@keyframes msjsGiro{from{transform:rotate(0)}to{transform:rotate(360deg)}}

/* halo que late */
.js-halo{transform-origin:50% 50%;animation:msjsHalo var(--js-lat) ease-in-out infinite}
@keyframes msjsHalo{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.07);opacity:.85}}

/* parpadeo irregular doble (reloj 5.6 s) — en fase 3 los ojos NO parpadean */
.js-ojoAnim{transform-origin:50% 50%;animation:msjsBlink 5.6s linear infinite}
.js-ojoD .js-ojoAnim{animation-delay:.07s}
@keyframes msjsBlink{
  0%,36%,40%,74%,78%,82%,86%,100%{transform:scaleY(1)}
  38%{transform:scaleY(.12)}
  76%{transform:scaleY(.1)}
  80%{transform:scaleY(.14)}
}
.msc-js[data-fase="3"] .js-ojoAnim,.msc-js[data-fase="ko"] .js-ojoAnim{animation:none}

/* take ocasional (reloj 17.3 s): el "¡¿eh?!" rubber-hose (fases 1-2) */
.js-cara{transform-origin:50% 55%;animation:msjsTake 17.3s linear infinite}
@keyframes msjsTake{
  0%,88.4%,91.6%,100%{transform:translate(0,0) scale(1)}
  89.2%{transform:translate(-2px,-2px) scale(1.05,.94)}
  90.4%{transform:translate(1.5px,0) scale(.97,1.03)}
}

/* fase 1: la risa burlona (reloj 6.3 s) — la sonrisa rebota con overshoot */
.js-bocaGrin{transform-origin:50% 22%;animation:msjsRisa 6.3s ease-in-out infinite}
@keyframes msjsRisa{
  0%,74%,94%,100%{transform:scale(1) rotate(0)}
  78%{transform:scale(1.07,.9) rotate(1.4deg)}
  82%{transform:scale(.94,1.09) rotate(-1deg)}
  86%{transform:scale(1.05,.94) rotate(.8deg)}
  90%{transform:scale(.99,1.02) rotate(0)}
}

/* fase 2: tic de cejas (reloj 2.3 s, dentro del posicionador de pose) */
.msc-js[data-fase="2"] .js-cejaTic{animation:msjsCejaTic 2.3s ease-in-out infinite}
.msc-js[data-fase="2"] .js-cejaD .js-cejaTic{animation-delay:.31s}
@keyframes msjsCejaTic{0%,86%,100%{transform:translateY(0)}90%{transform:translateY(1.8px)}95%{transform:translateY(-1px)}}

/* fase 3: tambaleo desesperado + la grieta palpita al mismo compás (1.9 s) */
.msc-js[data-fase="3"] .js-cara{animation:msjsTambaleo 1.9s ease-in-out infinite}
@keyframes msjsTambaleo{
  0%,100%{transform:rotate(-2.4deg)}
  12%{transform:rotate(-2.9deg) scale(1.012,.988)}
  55%{transform:rotate(2.6deg)}
  63%{transform:rotate(3.1deg) scale(.988,1.012)}
}
.js-grieta3{transform-origin:50% 50%}
.msc-js[data-fase="3"] .js-grieta3{animation:msjsGrieta 1.9s ease-in-out infinite}
@keyframes msjsGrieta{0%,100%{opacity:.85}55%{opacity:1;transform:scaleX(1.04)}}

/* lengua reseca: bandereo choppy (steps = look dibujado) */
.js-lenguaPos{transform-origin:50% 8%}
.msc-js[data-fase="3"] .js-lenguaPos{animation:msjsLengua .9s steps(3,end) infinite alternate}
@keyframes msjsLengua{from{transform:rotate(-5deg)}to{transform:rotate(6deg)}}

/* sudor que salta (gotas con dirección propia, coro desfasado) */
.js-gota{animation:msjsSudor 2.3s ease-out infinite;opacity:0}
.js-gota.g2{animation-delay:.8s}
.js-gota.g3{animation-delay:1.5s}
@keyframes msjsSudor{
  0%{transform:translate(0,0) scale(.4);opacity:0}
  12%{opacity:1}
  55%{transform:translate(var(--sx,-12px),var(--sy,-12px)) scale(1);opacity:.95}
  72%,100%{transform:translate(var(--sx,-12px),var(--sy,-12px)) scale(.9);opacity:0}
}

/* vapor que sube (fase 3) */
.msc-js[data-fase="3"] .js-vapor{animation:msjsCalor 1.8s ease-in infinite}
@keyframes msjsCalor{0%{transform:translateY(0);opacity:.55}100%{transform:translateY(-9px);opacity:0}}

/* racha de calor (fases 2-3, reloj 9.7 s): ANTICIPA → SMEAR 1 frame → asienta */
.msc-js[data-fase="2"] .js-antic,
.msc-js[data-fase="3"] .js-antic{transform-origin:50% 60%;animation:msjsRacha 9.7s var(--msjs-antic) infinite}
@keyframes msjsRacha{
  0%,78%,92%,100%{transform:translateY(0) scale(1,1)}
  80%,82%{transform:translateY(5px) scale(1.06,.92)}
  84%{transform:translateY(-9px) scale(.72,1.4)}
  85.5%{transform:translateY(-6px) scale(.94,1.08)}
  88%{transform:translateY(1px) scale(1.03,.97)}
}
.js-ondaCalor{transform-origin:50% 50%;opacity:0}
.msc-js[data-fase="2"] .js-ondaCalor,
.msc-js[data-fase="3"] .js-ondaCalor{animation:msjsOndaCalor 9.7s ease-out infinite}
@keyframes msjsOndaCalor{
  0%,82%{transform:scale(.62);opacity:0}
  84%{transform:scale(.7);opacity:.85}
  96%{transform:scale(1.45);opacity:0}
  100%{transform:scale(1.45);opacity:0}
}

/* ═══ TRANSFORMACIÓN de fase (al montar con key={fase}): pop elástico ═══ */
.js-transforma{transform-origin:50% 60%;animation:msjsPop .62s var(--msjs-ov) both}
@keyframes msjsPop{
  0%{transform:scale(.62,1.42)}
  16%{transform:scale(1.3,.74)}
  38%{transform:scale(.9,1.09)}
  62%{transform:scale(1.05,.965)}
  100%{transform:scale(1,1)}
}
.js-onda{transform-origin:50% 50%;opacity:0;animation:msjsOnda .7s ease-out both}
@keyframes msjsOnda{0%{transform:scale(.5);opacity:.9}100%{transform:scale(1.5);opacity:0}}

/* ═══ DERROTA: todo se apaga, se aploma… y llueve ═══ */
.msc-js[data-fase="ko"] .js-masa,
.msc-js[data-fase="ko"] .js-cara,
.msc-js[data-fase="ko"] .js-rayosSuaves,
.msc-js[data-fase="ko"] .js-rayosBravos,
.msc-js[data-fase="ko"] .js-halo{animation:none}
.msc-js[data-fase="ko"] .js-cara{transform:translateY(8px) rotate(-4deg)}
.msc-js[data-fase="ko"] .js-rayosSuaves{transform:scaleY(.93) scaleX(.97)}
.js-espiral{transform-origin:50% 50%}
.msc-js[data-fase="ko"] .js-espiral{animation:msjsEspiral 1.4s linear infinite}
@keyframes msjsEspiral{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.js-nube{transform-origin:50% 50%}
.msc-js[data-fase="ko"] .js-nube{animation:msjsNube 3.2s ease-in-out infinite}
@keyframes msjsNube{0%,100%{transform:translateY(0)}60%{transform:translateY(-3.5px)}}
.msc-js[data-fase="ko"] .js-lluvia{animation:msjsLluvia 1.6s linear infinite}
.msc-js[data-fase="ko"] .js-lluvia.l2{animation-delay:.55s}
.msc-js[data-fase="ko"] .js-lluvia.l3{animation-delay:1.05s}
@keyframes msjsLluvia{
  0%{transform:translateY(0);opacity:0}
  14%{opacity:.9}
  80%{opacity:.9}
  100%{transform:translateY(52px);opacity:0}
}
.msc-js[data-fase="ko"] .js-lagrima{animation:msjsSudor 2.9s ease-out infinite;--sx:2px;--sy:16px}

/* accesibilidad: quieto pero posado (las poses por fase se conservan) */
.msc-js[data-rm="1"] *{animation:none !important}
@media (prefers-reduced-motion: reduce){
  .msc-js *{animation:none !important}
}
`;

export default JefeSequia;
