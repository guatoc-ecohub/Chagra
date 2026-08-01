import React from 'react';
import './evidencia-ilustrada.css';

/**
 * EvidenciaIlustrada — mockup "tarjetas de evidencia ilustradas" (#/mockups/
 * evidencia-ilustrada). El "modo científico" hecho hermoso.
 *
 * Cuando el agente AFIRMA algo, no lo suelta como texto pelado: cada afirmación
 * viene con una TARJETA DE EVIDENCIA que trae —
 *   · una mini-lámina de cuaderno de campo dibujada a mano (SVG propio, en la
 *     misma familia de tuberculos/LaminaSiembra · milpa/LaminaMaiz: papel crema,
 *     tinta sepia + color, rótulos serif en itálica),
 *   · un semáforo de confianza (alta / media / baja), y
 *   · la fuente ("Cartilla Cenicafé", "Saber campesino"…).
 *
 * Así se SIENTE que el agente respalda lo que dice con imagen, no solo lo afirma.
 *
 * Es un MOCKUP con datos de muestra (no cablea el modelo real). Sin gate ni
 * sesión: se monta desde #/mockups/evidencia-ilustrada. Español Colombia (usted).
 */

/* ── Paleta de las láminas (cuaderno de campo, colores fijos a propósito:
      son ilustración, no cromo de UI — se leen igual bajo cualquier tema) ── */
const TINTA = '#5c4326'; // sepia principal (trazo y rótulos)
const TINTA_2 = '#8a6b40'; // sepia claro (rótulos secundarios, guías)
const VERDE = '#6f8a3c'; // verde hoja
const VERDE_OSC = '#55702c'; // verde de contornos / venas
const VERDE_CLARO = '#8caa4a'; // verde del fríjol
const GRANO = '#d8a93f'; // oro del grano / flor
const TIERRA = '#7a5a34'; // suelo
const HOJARASCA = '#a9803f'; // mantillo
const HUMUS = '#4a3524'; // capa negra
const SUBSUELO = '#b08d5a'; // arcilla del subsuelo
const CEREZA = '#b0503a'; // fruto de café
const LESION = '#3a2618'; // mancha de antracnosis
const AGUA = '#6a90b0'; // gota de lluvia
const COBRE = '#3f8c86'; // caldo bordelés (azul-verdoso del cobre)
const LOMBRIZ = '#c98a7a';

/** Rótulo de cuaderno: línea guía fina con punto en el objetivo + texto serif
 *  en itálica (letra de mano). Igual que milpa/LaminaMaiz. */
function Rotulo({ x, y, tx, ty, texto, sub = null, anchor = /** @type {'start'|'middle'|'end'} */ ('start') }) {
  return (
    <g>
      <line x1={x} y1={y} x2={tx} y2={ty} stroke={TINTA_2} strokeWidth="0.8" strokeLinecap="round" />
      <circle cx={tx} cy={ty} r="1.6" fill={TINTA} />
      <text x={x} y={y} textAnchor={anchor} fontFamily="'Georgia','Times New Roman',serif" fontStyle="italic" fontSize="11.5" fontWeight="600" fill={TINTA}>
        {texto}
      </text>
      {sub && (
        <text x={x} y={y + 12} textAnchor={anchor} fontFamily="'Georgia','Times New Roman',serif" fontStyle="italic" fontSize="9.5" fill={TINTA_2}>
          {sub}
        </text>
      )}
    </g>
  );
}

/** Fondo de papel crema con marco tenue y pecas deterministas (compartido). */
function PapelCuaderno({ id, w = 360, h = 176 }) {
  return (
    <>
      <defs>
        <linearGradient id={`ev-papel-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6eed6" />
          <stop offset="1" stopColor="#efe4c6" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={w} height={h} fill={`url(#ev-papel-${id})`} />
      <rect x="6" y="6" width={w - 12} height={h - 12} fill="none" stroke={TINTA_2} strokeWidth="0.6" opacity="0.4" rx="6" />
      <g fill={TINTA_2} opacity="0.09">
        <circle cx="42" cy="30" r="1" /><circle cx="322" cy="26" r="1.1" />
        <circle cx="30" cy="120" r="1" /><circle cx="336" cy="132" r="1" />
        <circle cx="180" cy="18" r="0.9" /><circle cx="90" cy="150" r="1" />
      </g>
    </>
  );
}

/* ═══════════════ LÁMINA 1 · EL CICLO DE LA ANTRACNOSIS ═══════════════
   Cómo se pasa la mancha de fruto en fruto con la lluvia, y dónde el caldo
   bordelés (cobre) corta el ciclo para proteger el fruto sano. */
export function LaminaCicloAntracnosis() {
  return (
    <svg viewBox="0 0 360 176" role="img" aria-labelledby="ev-l1-t ev-l1-d">
      <title id="ev-l1-t">El ciclo de la antracnosis en el café y cómo el caldo bordelés lo corta</title>
      <desc id="ev-l1-d">
        Dibujo de cuaderno en tinta sepia. Un fruto de café manchado suelta esporas que
        la lluvia lleva a un fruto sano y lo enferma, cerrando el ciclo. Sobre la flecha
        que vuelve al fruto sano, una barrera de cobre del caldo bordelés corta el paso.
      </desc>
      <PapelCuaderno id="l1" />

      <text x="18" y="24" fontFamily="'Georgia',serif" fontSize="10" fontStyle="italic" letterSpacing="1.2" fill={TINTA_2}>
        CUADERNO DE CAMPO · SANIDAD
      </text>
      <text x="18" y="40" fontFamily="'Georgia',serif" fontSize="15" fontStyle="italic" fontWeight="700" fill={TINTA}>
        El ciclo de la mancha
      </text>

      {/* flechas del ciclo (triángulo): manchado → lluvia → sano → (cobre) → manchado */}
      <g fill="none" stroke={TINTA} strokeWidth="1.6" strokeLinecap="round">
        {/* manchado (arriba) → lluvia (abajo-derecha) */}
        <path d="M206 66 C 244 78, 268 96, 278 116" markerEnd="url(#ev-arrow)" />
        {/* lluvia (abajo-derecha) → sano (abajo-izquierda) */}
        <path d="M250 146 C 210 158, 150 158, 112 146" markerEnd="url(#ev-arrow)" />
        {/* sano (abajo-izq) → manchado (arriba): AQUÍ corta el cobre */}
        <path d="M82 116 C 92 96, 116 78, 154 66" strokeDasharray="6 7" opacity="0.85" />
      </g>
      <defs>
        <marker id="ev-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 1 L9 5 L0 9 z" fill={TINTA} />
        </marker>
      </defs>

      {/* ── NODO A · fruto de café MANCHADO (arriba, centro) ── */}
      <g>
        <circle cx="180" cy="52" r="17" fill={CEREZA} stroke={TINTA} strokeWidth="1.3" />
        <path d="M172 44 q 8 -4 16 2" fill="none" stroke="#e8c9b0" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        {/* la lesión hundida (mancha) */}
        <ellipse cx="185" cy="57" rx="7" ry="6" fill={LESION} />
        <circle cx="183" cy="56" r="2.4" fill={CEREZA} opacity="0.35" />
        {/* esporas saltando */}
        <g fill={LESION} opacity="0.8">
          <circle cx="197" cy="49" r="1.4" /><circle cx="200" cy="55" r="1.1" /><circle cx="195" cy="61" r="1" />
        </g>
      </g>

      {/* ── NODO B · gota de lluvia con esporas (abajo-derecha) ── */}
      <g>
        <path d="M292 118 C 300 128, 306 136, 300 144 C 293 152, 281 150, 279 141 C 277 133, 285 126, 292 118 Z"
          fill={AGUA} opacity="0.55" stroke={AGUA} strokeWidth="1.3" />
        <path d="M289 128 q 4 -2 7 3" fill="none" stroke="#eaf3fb" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
        {/* esporas que viajan dentro de la gota */}
        <g fill={LESION} opacity="0.75">
          <circle cx="288" cy="138" r="1.4" /><circle cx="294" cy="141" r="1.2" /><circle cx="290" cy="145" r="1" />
        </g>
      </g>

      {/* ── NODO C · fruto SANO (abajo-izquierda) ── */}
      <g>
        <circle cx="72" cy="132" r="16" fill={VERDE} stroke={TINTA} strokeWidth="1.3" opacity="0.9" />
        <path d="M64 124 q 8 -4 16 2" fill="none" stroke="#e7f0cf" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        <circle cx="66" cy="128" r="2.2" fill="#eaf3d6" opacity="0.5" />
      </g>

      {/* ── EL CALDO BORDELÉS corta el paso (sobre la flecha punteada C→A) ── */}
      <g>
        {/* escudo / barrera de cobre */}
        <path d="M104 92 q 14 -10 30 -6 q -4 16 -18 24 q -14 -6 -12 -18 Z"
          fill={COBRE} opacity="0.4" stroke={COBRE} strokeWidth="1.6" strokeLinejoin="round" />
        {/* gotita de cobre */}
        <path d="M118 82 C 122 87, 125 91, 121 95 C 117 98, 111 96, 111 91 C 111 87, 115 85, 118 82 Z"
          fill={COBRE} stroke={TINTA} strokeWidth="0.8" />
        {/* corte del paso: X sobre la ruta */}
        <g stroke={COBRE} strokeWidth="2.2" strokeLinecap="round">
          <line x1="112" y1="104" x2="126" y2="118" /><line x1="126" y1="104" x2="112" y2="118" />
        </g>
      </g>

      {/* rótulos */}
      <Rotulo x="214" y="40" tx="196" ty="46" texto="fruto manchado" sub="suelta esporas" anchor="start" />
      <Rotulo x="342" y="112" tx="298" ty="126" texto="la lluvia" sub="las lleva lejos" anchor="end" />
      <Rotulo x="18" y="160" tx="66" ty="149" texto="cae en fruto sano" anchor="start" />
      <Rotulo x="150" y="150" tx="122" ty="106" texto="el caldo bordelés" sub="(cobre) corta aquí" anchor="start" />
    </svg>
  );
}

/* ═══════════════ LÁMINA 2 · EL ARREGLO DE SIEMBRA (LA MILPA) ═══════════════
   Maíz de tutor, fríjol que trepa y abona, calabaza que tapa el suelo.
   La misma mata de milpa/LaminaMaiz, resumida a las tres hermanas. */
function LaminaMilpa() {
  const SUELO = 140;
  return (
    <svg viewBox="0 0 360 176" role="img" aria-labelledby="ev-l2-t ev-l2-d">
      <title id="ev-l2-t">El arreglo de siembra de la milpa: maíz, fríjol y calabaza</title>
      <desc id="ev-l2-d">
        Dibujo de cuaderno en tinta sepia y verde. En el centro la caña de maíz sirve de
        tutor; el fríjol trepa por ella y fija nitrógeno con sus nódulos; la calabaza
        extiende sus hojas anchas por el suelo y lo tapa.
      </desc>
      <PapelCuaderno id="l2" />

      <text x="18" y="24" fontFamily="'Georgia',serif" fontSize="10" fontStyle="italic" letterSpacing="1.2" fill={TINTA_2}>
        CUADERNO DE CAMPO · LA MILPA
      </text>

      {/* línea de tierra */}
      <line x1="20" y1={SUELO} x2="340" y2={SUELO} stroke={TIERRA} strokeWidth="1.6" strokeLinecap="round" />
      <g stroke={TIERRA} strokeWidth="0.7" strokeLinecap="round" opacity="0.5">
        <line x1="60" y1={SUELO + 4} x2="54" y2={SUELO + 12} /><line x1="120" y1={SUELO + 4} x2="114" y2={SUELO + 12} />
        <line x1="240" y1={SUELO + 4} x2="234" y2={SUELO + 12} /><line x1="300" y1={SUELO + 4} x2="294" y2={SUELO + 12} />
      </g>

      {/* ── MAÍZ · la caña que hace de tutor (centro x=180) ── */}
      <path d={`M180 ${SUELO} C 178 108, 182 74, 180 44`} fill="none" stroke={VERDE_OSC} strokeWidth="6" strokeLinecap="round" />
      <path d={`M180 ${SUELO} C 178 108, 182 74, 180 44`} fill="none" stroke={VERDE} strokeWidth="3" strokeLinecap="round" />
      {/* nudos */}
      <g stroke={TINTA} strokeWidth="1.2" strokeLinecap="round">
        {[120, 96, 72].map((yy, i) => <line key={i} x1="175" y1={yy} x2="185" y2={yy} />)}
      </g>
      {/* hojas del maíz */}
      <path d="M181 78 C 210 70, 236 72, 262 54 C 236 78, 208 82, 181 84 Z" fill={VERDE} opacity="0.34" stroke={VERDE_OSC} strokeWidth="1.1" />
      <path d="M179 104 C 152 98, 128 100, 104 84 C 128 106, 154 110, 179 110 Z" fill={VERDE} opacity="0.3" stroke={VERDE_OSC} strokeWidth="1.1" />
      {/* penacho + mazorca */}
      <g stroke={TINTA} strokeWidth="1" fill="none" opacity="0.85">
        <path d="M180 44 C 174 36, 172 30, 174 24" /><path d="M180 44 C 186 36, 188 30, 188 24" />
        <path d="M180 44 C 180 36, 180 30, 181 24" />
      </g>
      <g>
        <path d="M188 96 C 200 92, 208 100, 206 112 C 204 120, 194 122, 188 116 Z" fill={GRANO} opacity="0.85" stroke={TINTA} strokeWidth="1" />
        <g stroke="#b0822a" strokeWidth="0.7">
          <line x1="192" y1="98" x2="200" y2="116" /><line x1="198" y1="96" x2="204" y2="112" />
        </g>
      </g>

      {/* ── FRÍJOL · trepa por la caña (espiral) + nódulos ── */}
      <path d={`M180 ${SUELO} C 168 124, 192 116, 178 104 C 166 94, 190 86, 178 74 C 168 64, 190 58, 180 48`}
        fill="none" stroke={VERDE_CLARO} strokeWidth="2" strokeLinecap="round" />
      {/* hojitas trifoliadas del fríjol */}
      <g fill={VERDE_CLARO} opacity="0.6" stroke={VERDE_OSC} strokeWidth="0.7">
        <ellipse cx="170" cy="120" rx="5" ry="3" transform="rotate(-28 170 120)" />
        <ellipse cx="190" cy="98" rx="5" ry="3" transform="rotate(20 190 98)" />
        <ellipse cx="169" cy="80" rx="5" ry="3" transform="rotate(-24 169 80)" />
      </g>
      {/* vaina de fríjol */}
      <path d="M188 70 C 198 68, 204 74, 202 82" fill="none" stroke={VERDE_OSC} strokeWidth="2.4" strokeLinecap="round" />
      {/* nódulos fijadores en la raíz (bajo tierra) */}
      <g stroke={VERDE_CLARO} strokeWidth="1" fill="none">
        <path d={`M180 ${SUELO} q -8 8 -12 18`} /><path d={`M180 ${SUELO} q -3 10 -4 20`} />
      </g>
      <g fill="#c9b06a" stroke={TINTA} strokeWidth="0.5">
        <circle cx="167" cy="156" r="2.2" /><circle cx="175" cy="160" r="2" /><circle cx="172" cy="151" r="1.8" />
      </g>

      {/* ── CALABAZA (auyama) · hojas anchas que tapan el suelo + fruto ── */}
      {/* guía rastrera a la derecha */}
      <path d={`M186 ${SUELO - 2} C 230 ${SUELO - 4}, 280 ${SUELO - 2}, 320 ${SUELO - 6}`} fill="none" stroke={VERDE_OSC} strokeWidth="1.6" strokeLinecap="round" />
      {/* hojas grandes lobuladas */}
      <path d="M232 138 C 224 122, 240 112, 256 118 C 268 122, 268 136, 256 140 C 248 143, 238 143, 232 138 Z"
        fill={VERDE} opacity="0.42" stroke={VERDE_OSC} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M286 136 C 280 122, 296 114, 310 120 C 320 125, 318 137, 308 140 C 300 142, 292 141, 286 136 Z"
        fill={VERDE} opacity="0.38" stroke={VERDE_OSC} strokeWidth="1.1" strokeLinejoin="round" />
      {/* venas de una hoja */}
      <g stroke={VERDE_OSC} strokeWidth="0.6" opacity="0.6" fill="none">
        <path d="M248 130 l 8 -8" /><path d="M248 130 l 10 2" /><path d="M248 130 l 2 8" />
      </g>
      {/* flor de calabaza (amarilla) */}
      <g>
        <circle cx="212" cy="132" r="5" fill={GRANO} opacity="0.85" stroke="#b0822a" strokeWidth="0.7" />
        <g stroke="#b0822a" strokeWidth="0.6"><line x1="212" y1="127" x2="212" y2="123" /><line x1="207" y1="132" x2="203" y2="132" /></g>
      </g>
      {/* fruto de auyama en el suelo */}
      <g>
        <ellipse cx="300" cy="150" rx="16" ry="11" fill={GRANO} stroke={TINTA} strokeWidth="1.1" />
        <g stroke="#b0822a" strokeWidth="0.9" opacity="0.7" fill="none">
          <path d="M291 142 C 296 150, 296 152, 291 158" /><path d="M300 140 C 300 150, 300 152, 300 160" /><path d="M309 142 C 304 150, 304 152, 309 158" />
        </g>
      </g>

      {/* rótulos */}
      <Rotulo x="214" y="34" tx="182" ty="60" texto="maíz" sub="el tutor" anchor="start" />
      <Rotulo x="18" y="86" tx="176" ty="96" texto="fríjol" sub="trepa y fija nitrógeno" anchor="start" />
      <Rotulo x="342" y="112" tx="300" ty="132" texto="calabaza (auyama)" sub="tapa el suelo" anchor="end" />
      <Rotulo x="18" y="168" tx="170" ty="156" texto="nódulos" sub="abonan la tierra" anchor="start" />
    </svg>
  );
}

/* ═══════════════ LÁMINA 3 · EL CORTE DEL SUELO ═══════════════
   La finca por dentro: dónde va el abono. Hojarasca que tapa, capa negra donde
   comen raíces y lombriz, y el subsuelo más pobre abajo. */
function LaminaCorteSuelo() {
  return (
    <svg viewBox="0 0 360 176" role="img" aria-labelledby="ev-l3-t ev-l3-d">
      <title id="ev-l3-t">El corte del suelo: dónde poner el abono</title>
      <desc id="ev-l3-d">
        Dibujo de cuaderno en corte. De arriba abajo: la hojarasca que tapa y guarda
        humedad, la capa negra donde comen las raíces y la lombriz y donde va el abono,
        y el subsuelo de arcilla más pobre. Una mano deja el abono sobre la capa de arriba.
      </desc>
      <PapelCuaderno id="l3" />

      <text x="18" y="24" fontFamily="'Georgia',serif" fontSize="10" fontStyle="italic" letterSpacing="1.2" fill={TINTA_2}>
        CUADERNO DE CAMPO · SUELO
      </text>

      {/* ── bloque de tierra en corte (izquierda del papel) ── */}
      <clipPath id="ev-suelo-clip"><rect x="24" y="46" width="196" height="118" rx="4" /></clipPath>
      <g clipPath="url(#ev-suelo-clip)">
        {/* subsuelo (arcilla) al fondo */}
        <rect x="24" y="46" width="196" height="118" fill={SUBSUELO} opacity="0.5" />
        {/* capa negra (humus) */}
        <path d="M24 84 Q 122 78 220 84 L220 128 Q 122 132 24 128 Z" fill={HUMUS} opacity="0.85" />
        {/* hojarasca / mantillo arriba */}
        <path d="M24 70 Q 122 62 220 70 L220 86 Q 122 80 24 86 Z" fill={HOJARASCA} opacity="0.7" />
        {/* hojitas del mantillo sobre la superficie */}
        <g fill={HOJARASCA} stroke={TINTA} strokeWidth="0.5" opacity="0.85">
          <ellipse cx="52" cy="68" rx="7" ry="2.6" transform="rotate(-12 52 68)" />
          <ellipse cx="92" cy="66" rx="8" ry="2.8" transform="rotate(8 92 66)" />
          <ellipse cx="140" cy="67" rx="7" ry="2.6" transform="rotate(-6 140 67)" />
          <ellipse cx="184" cy="68" rx="8" ry="2.8" transform="rotate(14 184 68)" />
        </g>
        {/* migas de abono asentadas en la capa negra (arriba, no enterradas hondo) */}
        <g fill="#6e4d2c" opacity="0.9">
          <circle cx="70" cy="94" r="2.4" /><circle cx="84" cy="100" r="2" /><circle cx="112" cy="96" r="2.6" />
          <circle cx="128" cy="102" r="2" /><circle cx="150" cy="96" r="2.3" />
        </g>
        {/* raíces que comen en la capa negra */}
        <g stroke="#e7dcc0" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.85">
          <path d="M122 84 C 118 96, 110 104, 100 112" /><path d="M122 84 C 126 96, 134 104, 146 112" />
          <path d="M122 84 C 122 98, 121 108, 121 118" />
          <path d="M108 106 q -6 4 -9 10" /><path d="M138 106 q 6 4 9 10" />
        </g>
        {/* lombriz en la capa negra */}
        <path d="M60 116 C 70 110, 78 120, 88 114 C 96 109, 102 116, 108 120"
          fill="none" stroke={LOMBRIZ} strokeWidth="4" strokeLinecap="round" />
        <circle cx="108" cy="120" r="2" fill={LOMBRIZ} />
      </g>
      {/* marco del bloque */}
      <rect x="24" y="46" width="196" height="118" rx="4" fill="none" stroke={TINTA} strokeWidth="1.2" />
      {/* nivel de superficie punteado */}
      <line x1="24" y1="70" x2="220" y2="70" stroke={TINTA} strokeWidth="0.8" strokeDasharray="3 4" opacity="0.5" />

      {/* ── la mano que deja el abono ARRIBA ── */}
      <g>
        <path d="M150 34 q 10 -6 22 -2 q 6 2 4 8 q -2 4 -8 3 l -14 -2 Z" fill="#e6d3b6" stroke={TINTA} strokeWidth="0.9" strokeLinejoin="round" />
        {/* abono cayendo a la superficie */}
        <g fill="#6e4d2c">
          <circle cx="150" cy="46" r="1.6" /><circle cx="156" cy="52" r="1.4" /><circle cx="147" cy="56" r="1.3" /><circle cx="158" cy="60" r="1.2" />
        </g>
      </g>
      <Rotulo x="176" y="30" tx="168" ty="38" texto="el abono va arriba" sub="donde está lo vivo" anchor="start" />

      {/* ── rótulos de las capas (derecha) ── */}
      <Rotulo x="342" y="66" tx="212" ty="72" texto="hojarasca" sub="tapa · guarda humedad" anchor="end" />
      <Rotulo x="342" y="104" tx="212" ty="104" texto="capa negra" sub="raíces y lombriz comen" anchor="end" />
      <Rotulo x="342" y="150" tx="212" ty="146" texto="subsuelo" sub="arcilla · más pobre" anchor="end" />
    </svg>
  );
}

/* ── semáforo de confianza ──────────────────────────────────────────────── */
const NIVELES = {
  alta: { label: 'Confianza alta', on: 'alta', clase: 'ev-sem-alta' },
  media: { label: 'Confianza media', on: 'media', clase: 'ev-sem-media' },
  baja: { label: 'Confianza baja', on: 'baja', clase: 'ev-sem-baja' },
};
function Semaforo({ nivel }) {
  const n = NIVELES[nivel] || NIVELES.media;
  return (
    <span className={`ev-semaforo ${n.clase}`}>
      <span className="ev-dots" aria-hidden="true">
        <span className={`ev-dot ${nivel === 'baja' ? 'is-on-baja' : ''}`} />
        <span className={`ev-dot ${nivel === 'media' ? 'is-on-media' : ''}`} />
        <span className={`ev-dot ${nivel === 'alta' ? 'is-on-alta' : ''}`} />
      </span>
      <span className="ev-sem-label">
        {n.label}
        <small>semáforo</small>
      </span>
    </span>
  );
}

/** Glifo de fuente: un cuadernito / cartilla. */
function GlifoFuente() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 5v14" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/** Glifo del agente (mano con brotes, en la familia de ManoChagraGlyph). */
function GlifoAgente() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="ev-who-glyph" aria-hidden="true">
      <path d="M6 21c-1-3-1-6 0-8 1.4-2.6 4-3.4 6-3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 9.6c2 0 4.6.8 6 3.4 1 2 1 5 0 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 9.6V4M12 6.5c1.4-1.2 3-1.3 4-1M12 6.5c-1.4-1.2-3-1.3-4-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="5.2" r="1" fill="currentColor" /><circle cx="8" cy="5.2" r="1" fill="currentColor" />
    </svg>
  );
}

/* ── datos de muestra: 3 afirmaciones del agente ────────────────────────── */
const AFIRMACIONES = [
  {
    id: 'antracnosis',
    claim: 'Para la mancha del café (antracnosis), fumigue con caldo bordelés apenas empiece la lluvia.',
    Lamina: LaminaCicloAntracnosis,
    laminaTitulo: 'El ciclo de la mancha',
    confianza: 'alta',
    fuente: 'Cartilla Cenicafé',
    fuenteTipo: 'cartilla técnica',
    porque: 'La mancha se pasa de fruto en fruto con las salpicaduras de lluvia. El cobre del caldo bordelés forma una capa que protege el fruto sano y corta ese ciclo, por eso conviene aplicarlo ANTES de que arrecien las lluvias, no cuando ya está regada.',
  },
  {
    id: 'milpa',
    claim: 'Siembre el maíz, el fríjol y la calabaza juntos: se ayudan entre ellos, eso es la milpa.',
    Lamina: LaminaMilpa,
    laminaTitulo: 'El arreglo de la milpa',
    confianza: 'alta',
    fuente: 'Saber campesino · las tres hermanas',
    fuenteTipo: 'tradición + agroecología',
    porque: 'El maíz le hace de tutor al fríjol para que trepe; el fríjol le devuelve el favor fijando nitrógeno en la tierra con sus nódulos; y la calabaza tiende sus hojas anchas para tapar el suelo, guardar humedad y ahogar la maleza. Tres matas en el mismo hueco, cada una haciendo su parte.',
  },
  {
    id: 'suelo',
    claim: 'El abono échelo en la capa de arriba y tápelo con hojarasca; no lo entierre hondo.',
    Lamina: LaminaCorteSuelo,
    laminaTitulo: 'El corte del suelo',
    confianza: 'media',
    fuente: 'Saber campesino',
    fuenteTipo: 'práctica de finca',
    porque: 'En la capa negra de arriba es donde comen las raíces y trabaja la lombriz; ahí el abono se aprovecha y la hojarasca lo tapa para que no se lave ni se seque. Enterrarlo muy hondo lo aleja de las raíces y puede pudrirse sin aire.',
    veto: 'Ojo: en suelos muy encharcados o para árboles grandes la cosa cambia — confírmelo con el técnico de su vereda.',
  },
];

function TarjetaEvidencia({ dato, indice }) {
  const acc = dato.confianza === 'alta' ? '#6fbf5a' : dato.confianza === 'media' ? '#e0a63a' : '#d9603f';
  const { Lamina } = dato;
  return (
    <article className="ev-card" style={{ '--ev-acc': acc }}>
      <div className="ev-card-top">
        <span className="ev-card-num" aria-hidden="true">{indice}</span>
        <p className="ev-claim">{dato.claim}</p>
      </div>

      <figure className="ev-lamina">
        <Lamina />
        <figcaption className="ev-lamina-cap">
          <span className="ev-cap-t">{dato.laminaTitulo} · lámina de cuaderno</span>
          <span className="ev-cap-pill">Ilustración</span>
        </figcaption>
      </figure>

      <div className="ev-meta">
        <Semaforo nivel={dato.confianza} />
        <span className="ev-fuente">
          <GlifoFuente />
          <span>
            {dato.fuente}
            <small style={{ display: 'block' }}>{dato.fuenteTipo}</small>
          </span>
        </span>
      </div>

      <details className="ev-porque">
        <summary>¿Por qué se lo digo?</summary>
        <p>{dato.porque}</p>
        {dato.veto && (
          <p className="ev-veto">
            <strong>▲</strong>
            <span>{dato.veto}</span>
          </p>
        )}
      </details>
    </article>
  );
}

export default function EvidenciaIlustrada({ onBack }) {
  const volver = () => {
    if (onBack) onBack();
    else window.location.hash = '#/dashboard';
  };
  return (
    <div className="ev-root">
      <div className="ev-shell">
        <div className="ev-topbar">
          <a
            className="ev-back"
            href="#/dashboard"
            onClick={(e) => { e.preventDefault(); volver(); }}
          >
            ← Volver
          </a>
          <p className="ev-kicker">Chagra · modo científico</p>
        </div>

        <header className="ev-header">
          <h1 className="ev-title">Tarjetas de evidencia ilustradas</h1>
          <p className="ev-sub">
            Cuando el agente afirma algo, no lo suelta en texto pelado: cada consejo viene
            con una mini-lámina dibujada, un semáforo de confianza y su fuente. Que se vea
            que respalda lo que dice.
          </p>
        </header>

        <div className="ev-thread">
          {/* pregunta del campesino */}
          <div className="ev-msg ev-msg-user">
            Don, se me está manchando el fruto del café y quiero volver a sembrar maíz.
            ¿Usted qué me aconseja?
          </div>

          {/* respuesta del agente, con sus tarjetas de evidencia */}
          <div className="ev-msg ev-msg-agent">
            <div className="ev-who">
              <GlifoAgente />
              <span>Agente de la Chagra</span>
            </div>
            <p className="ev-agent-intro">
              Con gusto le ayudo. Le dejo tres consejos, y de una vez le muestro el dibujo
              de cada uno para que vea de dónde sale:
            </p>

            <div className="ev-claims">
              {AFIRMACIONES.map((dato, i) => (
                <TarjetaEvidencia key={dato.id} dato={dato} indice={i + 1} />
              ))}
            </div>
          </div>
        </div>

        <footer className="ev-foot">
          Mockup con datos de muestra — no cablea el modelo real. Ruta sin sesión:
          <code> #/mockups/evidencia-ilustrada</code>. Las láminas son SVG propio, en la
          familia de las láminas de cuaderno del catálogo (LaminaSiembra · LaminaMaiz).
        </footer>
      </div>
    </div>
  );
}
