import React from 'react';

/**
 * LaminaMaiz — lámina de "cuaderno de campo" del mundo de la milpa: la mata de
 * maíz (Zea mays) dibujada a mano, tinta sepia y verde sobre papel crema, con
 * cada parte rotulada en habla campesina.
 *
 * Misma familia que tuberculos/LaminaSiembra: SVG 100% propio e inline (sin
 * imágenes rasterizadas ni dependencias), pensado para acompañar el relato del
 * mundo. A diferencia de LaminaSiembra (decorativa, aria-hidden), esta lámina
 * SÍ enseña: lleva role="img" con descripción y sus rótulos son parte del
 * contenido, así que el papel es de color fijo (crema), como una foto de una
 * página de cuaderno pegada en la pantalla — no reacciona al tema, igual que el
 * DiagramaMilpa de esta misma pantalla usa colores propios.
 *
 * Partes rotuladas (botánica correcta, nombre popular):
 *   · Penacho / espiga — la flor macho, arriba de todo.
 *   · Caña (tallo) con sus nudos.
 *   · Hoja: lámina + vaina (con venas paralelas, propias de las gramíneas).
 *   · Mazorca — la flor hembra, con sus barbas (el cabello) y los granos en hilera.
 *   · Raíz fasciculada (en cabellera) + raíces de sostén (de soporte).
 *   · Detalle ampliado del grano: pericarpio, endospermo y germen.
 */

/* Paleta de la lámina: tinta sepia + verde botánico sobre papel crema.
   Colores fijos a propósito (es una ilustración, no cromo de UI). */
const TINTA = '#5c4326'; // sepia principal (trazo y rótulos)
const TINTA_2 = '#8a6b40'; // sepia claro (rótulos secundarios, guías)
const VERDE = '#6f8a3c'; // verde hoja
const VERDE_OSC = '#55702c'; // verde de contornos/venas
const GRANO = '#d8a93f'; // oro del grano
const GRANO_OSC = '#b0822a'; // contorno del grano
const BARBA = '#c98a56'; // barbas / cabello de la mazorca
const TIERRA = '#7a5a34'; // suelo

/** Un rótulo del cuaderno: línea guía fina con punto en el objetivo + texto
 *  serif en itálica (letra de mano). `anchor` alinea el texto al margen. */
function Rotulo({ x, y, tx, ty, texto, sub = null, anchor = 'start' }) {
  return (
    <g>
      <line x1={x} y1={y} x2={tx} y2={ty} stroke={TINTA_2} strokeWidth="0.9" strokeLinecap="round" />
      <circle cx={tx} cy={ty} r="1.7" fill={TINTA} />
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        fontFamily="'Georgia', 'Times New Roman', serif"
        fontStyle="italic"
        fontSize="13"
        fontWeight="600"
        fill={TINTA}
      >
        {texto}
      </text>
      {sub && (
        <text
          x={x}
          y={y + 13}
          textAnchor={anchor}
          fontFamily="'Georgia', 'Times New Roman', serif"
          fontStyle="italic"
          fontSize="10.5"
          fill={TINTA_2}
        >
          {sub}
        </text>
      )}
    </g>
  );
}

export default function LaminaMaiz() {
  return (
    <figure
      className="lamina-maiz relative rounded-2xl overflow-hidden border border-amber-900/30 shadow-md shadow-black/30"
      data-testid="lamina-maiz"
    >
      <svg
        viewBox="0 0 420 748"
        className="w-full h-auto select-none"
        role="img"
        aria-labelledby="lamina-maiz-titulo lamina-maiz-desc"
      >
        <title id="lamina-maiz-titulo">Lámina de cuaderno: la mata de maíz (Zea mays) y sus partes</title>
        <desc id="lamina-maiz-desc">
          Dibujo botánico a mano en tinta sepia y verde sobre papel crema. Muestra la
          planta de maíz completa con el penacho o flor macho arriba, la caña con sus
          nudos, las hojas con lámina y vaina, la mazorca con sus barbas y los granos en
          hilera, y las raíces fasciculadas y de sostén. Abajo, un detalle ampliado del
          grano con su pericarpio, endospermo y germen.
        </desc>

        {/* ── Papel crema del cuaderno ─────────────────────────────────── */}
        <defs>
          <linearGradient id="lm-papel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6eed6" />
            <stop offset="1" stopColor="#efe4c6" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="420" height="748" fill="url(#lm-papel)" />
        {/* marco interior tenue + margen del cuaderno (línea a la izquierda) */}
        <rect x="8" y="8" width="404" height="732" fill="none" stroke={TINTA_2} strokeWidth="0.7" opacity="0.4" rx="6" />
        <line x1="34" y1="8" x2="34" y2="740" stroke="#b98a72" strokeWidth="0.8" opacity="0.35" />
        {/* pecas del papel (grano hecho a mano, determinista) */}
        <g fill={TINTA_2} opacity="0.10">
          <circle cx="70" cy="120" r="1.1" /><circle cx="360" cy="90" r="1" />
          <circle cx="300" cy="250" r="1.2" /><circle cx="95" cy="360" r="1" />
          <circle cx="380" cy="430" r="1.1" /><circle cx="55" cy="520" r="1" />
          <circle cx="330" cy="560" r="1.2" /><circle cx="150" cy="640" r="1" />
        </g>

        {/* ── Encabezado: nombre científico como en el herbario ────────── */}
        <text x="46" y="30" fontFamily="'Georgia', serif" fontSize="11" fontStyle="italic" letterSpacing="1.5" fill={TINTA_2}>
          CUADERNO DE CAMPO · LA MILPA
        </text>
        <text x="46" y="52" fontFamily="'Georgia', serif" fontSize="22" fontStyle="italic" fontWeight="700" fill={TINTA}>
          Zea mays
        </text>
        <text x="150" y="52" fontFamily="'Georgia', serif" fontSize="12" fill={TINTA_2}>L. — el maíz</text>
        <text x="46" y="68" fontFamily="'Georgia', serif" fontSize="11.5" fontStyle="italic" fill={TINTA_2}>
          Familia Poaceae (las gramíneas)
        </text>

        {/* ════════════ LA MATA ════════════ (caña centrada en x≈196) ══ */}

        {/* Suelo con rayado bajo la línea de tierra */}
        <line x1="60" y1="470" x2="332" y2="470" stroke={TIERRA} strokeWidth="1.6" strokeLinecap="round" />
        <g stroke={TIERRA} strokeWidth="0.8" strokeLinecap="round" opacity="0.55">
          <line x1="80" y1="474" x2="72" y2="484" /><line x1="110" y1="474" x2="102" y2="484" />
          <line x1="150" y1="474" x2="142" y2="484" /><line x1="240" y1="474" x2="232" y2="484" />
          <line x1="285" y1="474" x2="277" y2="484" /><line x1="315" y1="474" x2="307" y2="484" />
        </g>

        {/* ── RAÍCES ──────────────────────────────────────────────────── */}
        {/* Fasciculada: cabellera de raicillas finas bajo la base */}
        <g stroke={TINTA} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.9">
          <path d="M196 470 q -6 22 -22 40" /><path d="M196 470 q -3 26 -12 46" />
          <path d="M196 470 q 0 28 -2 50" /><path d="M196 470 q 3 27 8 47" />
          <path d="M196 470 q 6 24 20 42" /><path d="M196 470 q 9 20 26 34" />
          <path d="M196 470 q -9 20 -30 32" />
          {/* raicillas de segundo orden */}
          <path d="M180 500 q -6 6 -8 14" /><path d="M186 508 q 2 6 -2 12" />
          <path d="M204 506 q 6 5 8 13" /><path d="M212 496 q 8 4 12 10" />
        </g>

        {/* De sostén (soporte): arcos gruesos que salen del nudo bajo y se
            clavan en el suelo, como zancos */}
        <g stroke={TINTA} strokeWidth="2.6" fill="none" strokeLinecap="round">
          <path d="M190 442 C 170 452, 158 462, 150 476" />
          <path d="M202 442 C 224 452, 236 462, 246 476" />
          <path d="M193 450 C 182 460, 176 468, 172 478" opacity="0.85" />
        </g>

        {/* ── CAÑA (tallo) con nudos ───────────────────────────────────── */}
        <path
          d="M196 470 C 194 400, 199 320, 197 230 C 196 175, 198 152, 196 136"
          fill="none"
          stroke={VERDE_OSC}
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        <path
          d="M196 470 C 194 400, 199 320, 197 230 C 196 175, 198 152, 196 136"
          fill="none"
          stroke={VERDE}
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        {/* nudos: anillos del tallo */}
        <g stroke={TINTA} strokeWidth="1.5" strokeLinecap="round">
          {[440, 392, 336, 288, 232, 180, 154].map((yy, i) => (
            <line key={i} x1={190} y1={yy} x2={203} y2={yy} />
          ))}
        </g>

        {/* ── HOJAS (lámina + vaina, venas paralelas) ──────────────────── */}
        {/* Hoja 1 · abajo-izquierda */}
        <g>
          <path d="M196 392 C 150 386, 108 396, 70 430 C 110 402, 156 398, 196 400 Z" fill={VERDE} opacity="0.28" stroke={VERDE_OSC} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M194 396 C 156 396, 116 404, 78 428" fill="none" stroke={VERDE_OSC} strokeWidth="1" opacity="0.7" />
          <g stroke={VERDE_OSC} strokeWidth="0.6" opacity="0.5" fill="none">
            <path d="M190 392 C 156 390, 120 398, 84 424" /><path d="M190 400 C 156 402, 122 410, 88 432" />
          </g>
          {/* vaina que abraza la caña */}
          <path d="M196 402 q -10 -6 -8 -18 q 6 8 12 8 Z" fill={VERDE} opacity="0.4" stroke={VERDE_OSC} strokeWidth="1" />
        </g>
        {/* Hoja 2 · media-derecha (larga, arqueada) */}
        <g>
          <path d="M198 336 C 250 326, 300 332, 344 300 C 300 342, 248 348, 198 344 Z" fill={VERDE} opacity="0.3" stroke={VERDE_OSC} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M200 340 C 250 338, 298 340, 340 304" fill="none" stroke={VERDE_OSC} strokeWidth="1" opacity="0.7" />
          <g stroke={VERDE_OSC} strokeWidth="0.6" opacity="0.5" fill="none">
            <path d="M202 336 C 250 330, 300 334, 338 300" /><path d="M202 344 C 250 344, 296 346, 336 310" />
          </g>
          <path d="M197 342 q 10 -6 8 -18 q -6 8 -12 8 Z" fill={VERDE} opacity="0.4" stroke={VERDE_OSC} strokeWidth="1" />
        </g>
        {/* Hoja 3 · media-izquierda */}
        <g>
          <path d="M196 268 C 150 256, 104 258, 62 224 C 104 266, 152 272, 196 276 Z" fill={VERDE} opacity="0.3" stroke={VERDE_OSC} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M194 272 C 150 268, 106 266, 66 228" fill="none" stroke={VERDE_OSC} strokeWidth="1" opacity="0.7" />
          <g stroke={VERDE_OSC} strokeWidth="0.6" opacity="0.5" fill="none">
            <path d="M192 268 C 150 260, 108 258, 70 226" /><path d="M192 276 C 150 274, 110 272, 72 240" />
          </g>
          <path d="M195 274 q -10 -6 -8 -18 q 6 8 12 8 Z" fill={VERDE} opacity="0.4" stroke={VERDE_OSC} strokeWidth="1" />
        </g>
        {/* Hoja 4 · alta-derecha */}
        <g>
          <path d="M198 200 C 244 186, 286 184, 322 150 C 286 194, 244 200, 198 206 Z" fill={VERDE} opacity="0.3" stroke={VERDE_OSC} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M200 204 C 244 196, 284 192, 318 154" fill="none" stroke={VERDE_OSC} strokeWidth="1" opacity="0.7" />
          <path d="M197 205 q 10 -6 8 -18 q -6 8 -12 8 Z" fill={VERDE} opacity="0.4" stroke={VERDE_OSC} strokeWidth="1" />
        </g>

        {/* ── MAZORCA (flor hembra) al nudo medio, con barbas y granos ──── */}
        <g>
          {/* barbas / cabello: hilos finos que brotan de la punta */}
          <g stroke={BARBA} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.9">
            <path d="M250 300 q 10 -18 4 -36" /><path d="M256 302 q 16 -16 16 -36" />
            <path d="M244 300 q 2 -20 -6 -38" /><path d="M260 304 q 22 -12 30 -30" />
            <path d="M248 300 q 8 -22 2 -42" /><path d="M254 300 q 14 -20 10 -40" />
          </g>
          {/* mazorca: envuelta en hojas (capacho) y punta con granos a la vista */}
          <path d="M232 366 C 224 340, 232 312, 250 300 C 268 312, 276 340, 268 366 C 258 376, 242 376, 232 366 Z" fill={VERDE} opacity="0.5" stroke={VERDE_OSC} strokeWidth="1.4" strokeLinejoin="round" />
          {/* hojas del capacho abiertas dejando ver el grano */}
          <path d="M250 300 C 240 316, 240 344, 246 366" fill="none" stroke={VERDE_OSC} strokeWidth="0.9" opacity="0.7" />
          <path d="M250 300 C 260 316, 260 344, 254 366" fill="none" stroke={VERDE_OSC} strokeWidth="0.9" opacity="0.7" />
          {/* granos en hilera (rejilla oro) en la parte baja destapada */}
          <clipPath id="lm-mazorca">
            <path d="M236 344 C 236 356, 244 372, 250 372 C 256 372, 264 356, 264 344 Z" />
          </clipPath>
          <g clipPath="url(#lm-mazorca)">
            <rect x="234" y="342" width="32" height="34" fill={GRANO} opacity="0.9" />
            <g stroke={GRANO_OSC} strokeWidth="0.8">
              <line x1="242" y1="342" x2="242" y2="376" /><line x1="250" y1="342" x2="250" y2="376" /><line x1="258" y1="342" x2="258" y2="376" />
              <line x1="234" y1="350" x2="266" y2="350" /><line x1="234" y1="358" x2="266" y2="358" /><line x1="234" y1="366" x2="266" y2="366" />
            </g>
          </g>
          <path d="M236 344 C 236 356, 244 372, 250 372 C 256 372, 264 356, 264 344" fill="none" stroke={GRANO_OSC} strokeWidth="1.1" />
          {/* pedúnculo que la une al nudo de la caña */}
          <path d="M232 360 C 222 356, 210 350, 200 344" fill="none" stroke={VERDE_OSC} strokeWidth="2.4" strokeLinecap="round" />
        </g>

        {/* ── PENACHO / espiga (flor macho) en la punta ────────────────── */}
        <g stroke={TINTA} fill="none" strokeLinecap="round">
          {/* raquis central */}
          <path d="M196 136 C 197 122, 195 110, 196 98" strokeWidth="2" />
          {/* ramas de la espiga, colgando */}
          <g strokeWidth="1.2" opacity="0.9">
            <path d="M196 130 C 184 122, 176 114, 172 102" /><path d="M196 126 C 208 118, 216 110, 222 100" />
            <path d="M196 118 C 186 110, 180 102, 178 92" /><path d="M196 116 C 206 108, 212 100, 216 90" />
            <path d="M196 106 C 190 98, 187 92, 188 84" /><path d="M196 104 C 202 96, 206 90, 208 82" />
            <path d="M196 98 C 194 90, 195 86, 196 80" />
          </g>
          {/* anteras: puntitos de polen colgando de las ramas */}
          <g fill={GRANO} stroke="none">
            <circle cx="172" cy="102" r="1.5" /><circle cx="222" cy="100" r="1.5" /><circle cx="178" cy="92" r="1.5" />
            <circle cx="216" cy="90" r="1.5" /><circle cx="188" cy="84" r="1.5" /><circle cx="208" cy="82" r="1.5" /><circle cx="196" cy="80" r="1.5" />
          </g>
        </g>

        {/* ════════════ RÓTULOS de la mata ════════════ */}
        {/* Izquierda (texto al margen, guía hacia la planta) */}
        <Rotulo x="46" y="150" tx="182" ty="110" texto="Penacho" sub="la flor macho (espiga)" anchor="start" />
        <Rotulo x="46" y="238" tx="120" ty="264" texto="Hoja" sub="lámina + vaina" anchor="start" />
        <Rotulo x="46" y="360" tx="196" ty="336" texto="Caña (tallo)" sub="con sus nudos" anchor="start" />
        <Rotulo x="46" y="452" tx="168" ty="458" texto="Raíces de sostén" sub="(de soporte)" anchor="start" />

        {/* Derecha (texto al margen derecho) */}
        <Rotulo x="378" y="256" tx="286" ty="266" texto="Barbas / cabello" sub="la flor hembra" anchor="end" />
        <Rotulo x="378" y="326" tx="270" ty="330" texto="Mazorca" anchor="end" />
        <Rotulo x="378" y="392" tx="256" ty="360" texto="Granos" sub="en hilera" anchor="end" />

        {/* Raíz fasciculada: rótulo abajo, centrado */}
        <Rotulo x="120" y="560" tx="182" ty="512" texto="Raíz fasciculada" sub="(en cabellera)" anchor="start" />

        {/* ════════════ DETALLE: EL GRANO POR DENTRO ════════════ */}
        <line x1="34" y1="590" x2="412" y2="590" stroke={TINTA_2} strokeWidth="0.7" opacity="0.4" strokeDasharray="3 3" />
        <text x="46" y="612" fontFamily="'Georgia', serif" fontSize="14" fontStyle="italic" fontWeight="700" fill={TINTA}>
          El grano por dentro
        </text>
        <text x="215" y="612" fontFamily="'Georgia', serif" fontSize="11" fontStyle="italic" fill={TINTA_2}>(ampliado)</text>

        {/* grano ampliado, corte a lo largo (forma de diente) */}
        <g>
          {/* contorno del grano */}
          <path
            d="M96 632 C 118 628, 138 640, 138 668 C 138 682, 122 690, 104 690 C 86 690, 74 680, 74 662 C 74 646, 82 636, 96 632 Z"
            fill={GRANO}
            opacity="0.35"
            stroke={GRANO_OSC}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* pericarpio: banda exterior delgada */}
          <path
            d="M96 632 C 118 628, 138 640, 138 668 C 138 682, 122 690, 104 690 C 86 690, 74 680, 74 662 C 74 646, 82 636, 96 632 Z"
            fill="none"
            stroke={TINTA}
            strokeWidth="2.4"
            strokeLinejoin="round"
            opacity="0.75"
          />
          {/* endospermo: gran cuerpo harinoso */}
          <path d="M100 640 C 120 638, 130 650, 130 666 C 130 678, 116 684, 104 683 C 92 682, 84 672, 86 658 C 88 648, 92 642, 100 640 Z" fill={GRANO} opacity="0.55" stroke={GRANO_OSC} strokeWidth="0.8" />
          {/* germen: el embrión, en forma de escudo hacia la base */}
          <path d="M104 654 C 96 654, 90 662, 92 672 C 94 682, 104 684, 110 680 C 108 672, 108 662, 104 654 Z" fill="#e9d9a6" stroke={VERDE_OSC} strokeWidth="1" />
          {/* eje raíz-tallito dentro del germen */}
          <path d="M101 660 C 99 666, 100 672, 103 677" fill="none" stroke={VERDE_OSC} strokeWidth="1" strokeLinecap="round" />
        </g>

        {/* rótulos del grano */}
        <Rotulo x="200" y="636" tx="136" ty="646" texto="Pericarpio" sub="(la cáscara)" anchor="start" />
        <Rotulo x="200" y="672" tx="128" ty="662" texto="Endospermo" sub="(la harina)" anchor="start" />
        <Rotulo x="200" y="696" tx="106" ty="672" texto="Germen" sub="(de aquí nace la mata)" anchor="start" />
      </svg>

      <figcaption className="lamina-maiz-pie flex items-center justify-between gap-2 bg-[#e7dab8] px-3 py-1.5 text-[11px] font-semibold text-[#5c4326]">
        <span className="italic">Zea mays · lámina de cuaderno de campo</span>
        <span className="rounded bg-[#d8c79a] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#6b4e2e]">
          Ilustración
        </span>
      </figcaption>
    </figure>
  );
}
