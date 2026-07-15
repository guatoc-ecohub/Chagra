import React from 'react';
import { blob, puntoEnHoja, frass as frassDe } from './formasHoja.js';
import {
  HojaBase,
  PolvoRoya,
  RoyaPorElHaz,
  ManchaCercospora,
  ClorosisHierro,
  Gusano,
  Frass,
  Pliego,
  Rotulo,
  Lupa,
  Vineta,
} from './motivosDano.jsx';
import {
  PLIEGO,
  TINTA,
  HOJA_SANA,
  PLAGA,
  ENFERMEDAD,
  DEFICIENCIA,
  CATEGORIA,
} from './paletaDano.js';

/**
 * LaminaDiferencial — LA lámina: plaga, enfermedad y deficiencia, lado a lado,
 * sobre LA MISMA hoja de café.
 *
 * Por qué existe: es la confusión que más plata le cuesta al campesino. Le
 * echa fungicida a un pulgón, o veneno a una falta de nitrógeno. Gasta, no
 * resuelve, y de paso mata a los benéficos que le estaban trabajando gratis.
 *
 * El diseño entero está al servicio de UNA idea: **lo que distingue no es el
 * color, es el ORDEN del daño.**
 *   - la deficiencia es ORDENADA y simétrica (va parejo, sigue la nervadura);
 *   - la enfermedad tiene FORMA (halo, borde que se sigue con el dedo, anillos);
 *   - la plaga es un DESASTRE irregular (mordidas, huecos, rastro, el bicho).
 *
 * Cuatro decisiones de dibujo que sostienen eso:
 *   1. LA HOJA ES LA MISMA en los tres paneles — misma geometría, calculada
 *      una sola vez en `formasHoja`. Si la hoja cambiara, no se sabría si lo
 *      distinto es el daño o el dibujo. Controlada la hoja, lo único que
 *      varía es la marca.
 *   2. Cada marca está calcada de una FOTO REAL de `public/plaga-images/`, no
 *      inventada: el polvo de la roya es grano (no pintura naranja), la
 *      mancha de hierro tiene su borde y su halo, la mordida tiene su filo
 *      pardo cicatrizado.
 *   3. La LUPA de cada columna no es un zoom del mismo dibujo: es la marca
 *      redibujada con la información que uno gana al acercar la cara a la
 *      mata. Y en la columna de la enfermedad, la lupa muestra EL ENVÉS —
 *      porque ahí es donde está la respuesta y hay que voltear la hoja.
 *   4. Los rótulos sobre la hoja son CORTOS (son punteros, no explicaciones);
 *      lo que hay que entender va en las viñetas, que sí tienen ancho. Un
 *      rótulo largo se le monta a la columna del vecino y se vuelve ilegible.
 *
 * Y el pie dice lo que ninguna lámina suele decir: que hay casos en que NO se
 * puede saber sin ver la mata de cerca. La duda es parte del método.
 *
 * Estática, sin dependencias, sin animación, rsvg-safe. Papel y tinta de la
 * casa (`src/visual/laminas`), para que el cuaderno se lea como uno solo.
 *
 * @param {Object} props
 * @param {string} [props.className] clases extra sobre el <svg> raíz.
 */

/* ------------------------------------------------------------------ */
/* Geometría de la página (todo medido, nada a ojo)                    */
/* ------------------------------------------------------------------ */
const W = 420;
const H = 604;
const COL = { plaga: 70, enfermedad: 210, deficiencia: 350 };
const BASE_Y = 252; // dónde se para la hoja
const ESC = 1; // la hoja mide 140 de largo y así entra en la columna

/** Punto de la hoja (t a lo largo, u a lo ancho) llevado a la página. */
const enPagina = (cx, t, u) => {
  const p = puntoEnHoja(t, u);
  return { x: cx + p.x * ESC, y: BASE_Y + p.y * ESC };
};

/** Una marca posada en coordenadas de hoja (así siempre cae DENTRO). */
const marca = (t, u, r, semilla, extra = {}) => {
  const p = puntoEnHoja(t, u);
  return { cx: p.x, cy: p.y, r, semilla, ...extra };
};

/* --- PLAGA: lo que se comió el bicho ------------------------------- */
const bocado = (t, u, r, semilla, extra = {}) =>
  blob({ ...marca(t, u, r, semilla), lobulos: 4, rugosidad: 0.42, ...extra });

/* Los huecos de en medio van ESTIRADOS en la dirección de la vena (unos -29°
   por el lado derecho, +29° por el izquierdo): el gusano esquiva la nervadura
   dura y se come lo blandito de entre vena y vena, así que el hueco sale
   alargado, no redondo. Un hueco redondo perfecto sería un dibujo inventado
   — y de paso parecería una florecita pegada en la hoja. */
const VENA_DER = -29;
const VENA_IZQ = 29;

/* Una hoja masticada se reconoce por las BAHÍAS DEL BORDE, no por lunares:
   el bicho arranca del filo hacia adentro. (Primer intento: ocho huecos
   redonditos regados por la lámina — parecían florecitas pegadas, y con más
   ruido parecían estrellas. La hoja mordida de verdad se come por la orilla.)
   Van pocas y grandes, ni una igual a otra, y un solo hueco de en medio. */
const MORDIDAS = [
  /* Grandes, pero no tanto: la silueta de la hoja TIENE que sobrevivir. Si el
     bicho se la come entera, se pierde que es la misma hoja de las otras dos
     columnas — y ahí se cae la comparación, que es todo el punto. */
  bocado(0.7, 1.06, 10.5, 12, { rugosidad: 0.34 }),
  bocado(0.4, -1.08, 9, 23, { rugosidad: 0.36 }),
  bocado(0.87, -1.02, 6, 34, { rugosidad: 0.34 }),
  bocado(0.22, 1.06, 5.5, 67, { rugosidad: 0.32 }),
  bocado(0.55, 0.46, 3, 45, { alargue: 1.9, rot: VENA_DER, lobulos: 3, rugosidad: 0.22 }),
];

/* La ventana: acá el gusano raspó lo blandito y dejó el costillar. */
const VENTANAS = [
  bocado(0.6, -0.44, 7.5, 91, { alargue: 1.5, rot: VENA_IZQ, lobulos: 3, rugosidad: 0.26 }),
];

/* --- ENFERMEDAD: roya (polvo) + mancha de hierro (patrón) ---------- */
const ROYA = [
  marca(0.7, 0.46, 7, 71, { alargue: 1.15, densidad: 150 }),
  marca(0.5, -0.5, 5.4, 82, { alargue: 1.2, densidad: 120 }),
  marca(0.33, 0.34, 3.8, 93, { alargue: 1, densidad: 70 }),
];
const CERCO = marca(0.62, -0.34, 7, 5);

/* ------------------------------------------------------------------ */
/* Piezas de la página                                                 */
/* ------------------------------------------------------------------ */

/** La pestaña con el nombre de la categoría. El color NO es un semáforo de
 *  UI: es el color de la propia evidencia (el pardo del bicho, el naranja
 *  del polvo, el amarillo del hambre). El color ya enseña antes de leer. */
function Pestana({ cx, cat }) {
  const c = CATEGORIA[cat];
  return (
    <g>
      <rect x={cx - 58} y="50" width="116" height="19" rx="5" fill={c.chip} fillOpacity="0.32" stroke={c.tinta} strokeWidth="0.9" />
      <text x={cx} y="63.5" textAnchor="middle" fontSize="10.5" fontWeight="800" fill={c.tinta} letterSpacing="0.08em">
        {c.nombre}
      </text>
    </g>
  );
}

/** El recuadro de "lo que NO sirve": la plata que se pierde por confundirse.
 *  Con una equis dibujada a mano (nada de emoji: la lámina tiene que
 *  sobrevivir a una captura con rsvg). */
function NoSirve({ cx, cat, lineas }) {
  const c = CATEGORIA[cat];
  return (
    <g>
      <rect x={cx - 58} y="428" width="116" height="26" rx="4" fill={c.chip} fillOpacity="0.14" stroke={c.tinta} strokeWidth="0.7" strokeDasharray="3 2" opacity="0.95" />
      <g stroke="#a33b28" strokeWidth="1.3" strokeLinecap="round">
        <path d={`M${cx - 53} 437 l4.6 4.6`} />
        <path d={`M${cx - 48.4} 437 l-4.6 4.6`} />
      </g>
      {lineas.map((l, i) => (
        <text key={i} x={cx - 42} y={439 + i * 9} fontSize="6.6" fill={TINTA.media}>
          {l}
        </text>
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Las tres lupas: la marca redibujada de cerca                        */
/* ------------------------------------------------------------------ */

/** PLAGA de cerca: el filo de la mordida.
 *  El detalle que lo delata todo: el bicho se comió lo BLANDITO y dejó la
 *  vena parada, asomada al vacío. Ningún hongo hace eso. */
function LupaPlaga({ cx, cy, r }) {
  const comido = blob({ cx: 22, cy: -14, r: 32, semilla: 12, lobulos: 4, rugosidad: 0.28 });
  const cacas = frassDe({ cx: -18, cy: 22, n: 6, radio: 7, semilla: 77 });
  return (
    <Lupa cx={cx} cy={cy} r={r} titulo="LA MORDIDA, DE CERCA" tinta={CATEGORIA.plaga.tinta}>
      <g transform={`translate(${cx} ${cy})`}>
        <rect x="-40" y="-40" width="80" height="80" fill={HOJA_SANA.haz} />
        {/* la lámina de cerca: se le ven las venitas finas y el abullonado */}
        <g stroke={HOJA_SANA.venaSurco} strokeWidth="0.45" opacity="0.3" fill="none">
          <path d="M-40 -4 Q -16 -8 10 -12" />
          <path d="M-40 14 Q -14 10 14 6" />
          <path d="M-40 30 Q -12 27 18 24" />
          <path d="M-26 -40 Q -22 -8 -18 34" />
        </g>
        {/* el halo amarillo de la herida; encima, el hueco (se ve el papel) */}
        <path d={comido} fill="none" stroke={PLAGA.mordidaHalo} strokeWidth="10" opacity="0.55" />
        <path d={comido} fill={PLIEGO.papelHondo} />
        <path d={comido} fill="none" stroke={PLAGA.mordidaFilo} strokeWidth="1.8" />
        {/* LA VENA QUE QUEDÓ PARADA: se comió lo blandito de al lado y la
            dejó asomada. Va con su surco y afinándose en la punta. */}
        <path d="M-40 6 Q -8 0 20 -8" fill="none" stroke={HOJA_SANA.venaSurco} strokeWidth="3.4" strokeLinecap="round" opacity="0.55" />
        <path d="M-40 6 Q -8 0 20 -8" fill="none" stroke={HOJA_SANA.vena} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M20 -8 q6 -1.6 10 -3" fill="none" stroke={HOJA_SANA.vena} strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
        {/* el rastro: caquita, más grande de cerca */}
        {cacas.map((b, i) => (
          <g key={i} transform={`translate(${b.x} ${b.y}) rotate(${b.rot})`}>
            <rect x={-b.w * 1.2} y={-b.h * 1.2} width={b.w * 2.4} height={b.h * 2.4} rx={b.h} fill={PLAGA.frass} />
            <rect x={-b.w * 1.2} y={-b.h * 1.2} width={b.w * 2.4} height={b.h} rx={b.h * 0.5} fill={PLAGA.frassClaro} opacity="0.6" />
          </g>
        ))}
      </g>
    </Lupa>
  );
}

/** ENFERMEDAD de cerca: EL ENVÉS. Acá está la respuesta, y por eso la lámina
 *  manda a voltear la hoja. Por el haz uno solo ve una mancha amarilla
 *  cualquiera; por debajo está el polvo naranja que no deja duda. */
function LupaEnfermedad({ cx, cy, r }) {
  return (
    <Lupa cx={cx} cy={cy} r={r} titulo="EL ENVÉS, DE CERCA" tinta={CATEGORIA.enfermedad.tinta}>
      <g transform={`translate(${cx} ${cy})`}>
        <rect x="-40" y="-40" width="80" height="80" fill={HOJA_SANA.envesFondo} />
        {/* en el envés la nervadura va SALIDA y pálida: por eso el envés se
            reconoce de una, aunque uno no sepa por qué */}
        <g fill="none" strokeLinecap="round">
          <path d="M-42 26 Q -6 19 42 15" stroke={HOJA_SANA.venaSurco} strokeWidth="6.4" opacity="0.22" />
          <path d="M-42 24 Q -6 17 42 13" stroke="#a8c07e" strokeWidth="4" />
          <path d="M-42 23 Q -6 16 42 12" stroke="#c3d69c" strokeWidth="1.4" opacity="0.8" />
          <path d="M-14 -40 Q -8 -12 -2 22" stroke="#a8c07e" strokeWidth="2.4" opacity="0.75" />
        </g>
        <PolvoRoya
          manchas={[
            { cx: -6, cy: -12, r: 15, semilla: 71, alargue: 1.15, densidad: 240 },
            { cx: 19, cy: 6, r: 9, semilla: 82, alargue: 1, densidad: 130 },
          ]}
        />
      </g>
    </Lupa>
  );
}

/** DEFICIENCIA de cerca: la prueba de que NO es una mancha.
 *  El verde no se corta: se DESVANECE desde la vena hacia afuera. No hay
 *  borde que uno pueda seguir con el dedo, no hay halo, no hay bicho.
 *  Se dibuja con nervio y laterales de verdad (no una cruz) para que se lea
 *  como tejido de hoja y no como un cruce de caminos. */
function LupaDeficiencia({ cx, cy, r }) {
  const nervio = 'M-34 34 Q -6 2 30 -30';
  const laterales = [
    'M-22 21 Q -8 6 6 -2',
    'M-10 8 Q 6 -2 22 -6',
    'M2 -6 Q 14 -14 26 -12',
    'M-26 26 Q -30 8 -22 -8',
  ];
  return (
    <Lupa cx={cx} cy={cy} r={r} titulo="EL AMARILLO, DE CERCA" tinta={CATEGORIA.deficiencia.tinta}>
      <defs>
        <filter id="lupafe-b" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.4" />
        </filter>
      </defs>
      <g transform={`translate(${cx} ${cy})`}>
        <rect x="-40" y="-40" width="80" height="80" fill={DEFICIENCIA.hierroLamina} />
        {/* el corredor verde que sobrevive pegado a la vena: se va apagando,
            NO se corta. Ahí está toda la diferencia con una mancha. */}
        <g filter="url(#lupafe-b)" fill="none" strokeLinecap="round">
          <path d={nervio} stroke={DEFICIENCIA.hierroVenaHalo} strokeWidth="13" />
          {laterales.map((d, i) => (
            <path key={i} d={d} stroke={DEFICIENCIA.hierroVenaHalo} strokeWidth="8" opacity="0.9" />
          ))}
        </g>
        <g fill="none" strokeLinecap="round" stroke={DEFICIENCIA.hierroVena}>
          <path d={nervio} strokeWidth="3.4" />
          {laterales.map((d, i) => (
            <path key={i} d={d} strokeWidth="1.9" />
          ))}
        </g>
      </g>
    </Lupa>
  );
}

/* ------------------------------------------------------------------ */
/* Los glifos de LA LLAVE — la idea en 16 puntos de ancho              */
/* ------------------------------------------------------------------ */

/** El desorden: una hoja comida a pedazos. Silueta rota a propósito. */
function GlifoDesorden() {
  return (
    <g>
      <path
        d="M8 -7 q6 3 6.5 7 q-0.5 4 -6.5 7 q-6 -3 -6.5 -7 q0.5 -4 6.5 -7Z"
        fill={HOJA_SANA.haz}
        stroke={HOJA_SANA.borde}
        strokeWidth="0.5"
      />
      {/* mordidas: irregulares, cada una distinta */}
      <path d="M14 -2 q-4 1 -3.4 4 q3.4 1 4.4 -1.6Z" fill={PLIEGO.papelHondo} stroke={PLAGA.mordidaFilo} strokeWidth="0.5" />
      <path d="M2 4 q3 2.6 5.4 0.6 q-2 -2.6 -5 -1.6Z" fill={PLIEGO.papelHondo} stroke={PLAGA.mordidaFilo} strokeWidth="0.5" />
      <path d="M7 -3.4 q2 1.4 0.4 2.6 q-2 -0.6 -1.4 -2.4Z" fill={PLIEGO.papelHondo} stroke={PLAGA.mordidaFilo} strokeWidth="0.4" />
    </g>
  );
}

/** La forma: halo, borde, centro. Se puede seguir con el dedo. */
function GlifoForma() {
  return (
    <g>
      <circle cx="8" cy="0" r="7.4" fill={ENFERMEDAD.cercoHalo} opacity="0.85" />
      <circle cx="8" cy="0" r="4.4" fill={ENFERMEDAD.cercoCentro} stroke={ENFERMEDAD.cercoBorde} strokeWidth="0.8" />
      <circle cx="8" cy="0" r="1.8" fill={ENFERMEDAD.cercoCentroPalido} />
    </g>
  );
}

/** La simetría: media hoja igualita a la otra, con su eje de doblez. */
function GlifoSimetria() {
  return (
    <g>
      <path d="M8 -8 q6.5 8 0 16 q-6.5 -8 0 -16Z" fill={DEFICIENCIA.hierroLamina} stroke={DEFICIENCIA.hierroVena} strokeWidth="0.5" />
      <path d="M8 -4 q4.2 2.2 4.8 4.4 M8 -4 q-4.2 2.2 -4.8 4.4 M8 1.6 q3.2 1.6 3.6 3.4 M8 1.6 q-3.2 1.6 -3.6 3.4" fill="none" stroke={DEFICIENCIA.hierroVena} strokeWidth="0.6" />
      <path d="M8 -9.6 L8 9.6" stroke={TINTA.guia} strokeWidth="0.7" strokeDasharray="1.6 1.4" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* LA LÁMINA                                                           */
/* ------------------------------------------------------------------ */
export default function LaminaDiferencial({ className } = {}) {
  /* dianas de los rótulos: calculadas de la hoja, no medidas a ojo */
  const dHueco = enPagina(COL.plaga, 0.56, 0.4);
  const dBicho = { x: COL.plaga - 14, y: BASE_Y - 42 };
  const dCaca = enPagina(COL.plaga, 0.14, 0.3);
  const dRoya = enPagina(COL.enfermedad, 0.7, 0.46);
  const dCerco = enPagina(COL.enfermedad, 0.62, -0.34);
  const dVena = enPagina(COL.deficiencia, 0.6, 0.44);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-labelledby="lamdif-t lamdif-d"
      className={['w-full h-auto select-none', className].filter(Boolean).join(' ')}
      data-testid="lamina-diferencial"
      style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
    >
      <title id="lamdif-t">Plaga, enfermedad o deficiencia: los tres daños en la misma hoja de café</title>
      <desc id="lamdif-d">
        Lámina de cuaderno de campo con tres columnas y la misma hoja de café dibujada en cada una.
        En la primera, PLAGA: la hoja tiene mordidas irregulares y huecos con el filo pardo, un gusano
        encima y su excremento; el daño empieza donde está el bicho. En la segunda, ENFERMEDAD: manchas
        amarillas de roya y una mancha de hierro con borde definido y halo; la lupa muestra el envés,
        cubierto de polvo naranja. En la tercera, DEFICIENCIA: la hoja amarillea pareja y la nervadura
        se queda verde, formando una redecilla simétrica, sin bicho y sin borde. Al pie, la llave: la
        plaga es un desastre irregular, la enfermedad tiene forma, el hambre va simétrica. Y una nota:
        hay casos en que no se puede saber sin ver la mata de cerca.
      </desc>

      <Pliego w={W} h={H} />

      {/* ---------------- encabezado ---------------- */}
      <text x="16" y="26" fontSize="16.5" fontWeight="800" fill={TINTA.fuerte}>
        ¿Plaga, enfermedad o hambre?
      </text>
      <text x="404" y="17" textAnchor="end" fontSize="8.5" fontStyle="italic" fill={TINTA.guia}>
        cuaderno de campo
      </text>
      <text x="404" y="28" textAnchor="end" fontSize="8.5" fill={TINTA.suave}>
        la misma hoja, tres daños
      </text>
      <text x="16" y="39" fontSize="9" fontStyle="italic" fill={TINTA.suave}>
        Lo que los distingue no es el color: es el ORDEN del daño.
      </text>
      <line x1="14" y1="44" x2="406" y2="44" stroke={PLIEGO.borde} strokeWidth="1" />

      <Pestana cx={COL.plaga} cat="plaga" />
      <Pestana cx={COL.enfermedad} cat="enfermedad" />
      <Pestana cx={COL.deficiencia} cat="deficiencia" />

      {/* separadores entre columnas */}
      <line x1="140" y1="74" x2="140" y2="456" stroke={PLIEGO.borde} strokeWidth="0.7" strokeDasharray="2 3" opacity="0.7" />
      <line x1="280" y1="74" x2="280" y2="456" stroke={PLIEGO.borde} strokeWidth="0.7" strokeDasharray="2 3" opacity="0.7" />

      {/* ================= COLUMNA 1 · PLAGA ================= */}
      <g transform={`translate(${COL.plaga} ${BASE_Y}) scale(${ESC})`}>
        <HojaBase
          mordidas={MORDIDAS}
          ventanas={VENTANAS}
          encima={
            <g>
              <Frass cx={4} cy={-16} n={10} radio={6} semilla={31} />
              <Frass cx={17} cy={-44} n={5} radio={4} semilla={97} />
              {/* el bicho, comiendo justo en la bahía del borde que abrió */}
              <Gusano x={-22} y={-55} rot={52} escala={0.95} />
            </g>
          }
        />
      </g>
      <Rotulo
        texto="hueco"
        nota="filo pardo"
        tx="100"
        ty="150"
        tam={8}
        tinta={CATEGORIA.plaga.tinta}
        guia={{ d: `M98 152 C 90 154 ${dHueco.x + 8} ${dHueco.y + 4} ${dHueco.x} ${dHueco.y}`, px: dHueco.x, py: dHueco.y }}
      />
      <Rotulo
        texto="el bicho"
        nota="o su rastro"
        anchor="end"
        tx="42"
        ty="196"
        tam={8}
        tinta={CATEGORIA.plaga.tinta}
        guia={{ d: `M44 194 C 50 196 54 202 ${dBicho.x} ${dBicho.y}`, px: dBicho.x, py: dBicho.y }}
      />
      <Rotulo
        texto="caquita"
        tx="100"
        ty="240"
        tam={8}
        tinta={CATEGORIA.plaga.tinta}
        guia={{ d: `M98 238 C 92 238 86 238 ${dCaca.x} ${dCaca.y}`, px: dCaca.x, py: dCaca.y }}
      />
      <text x={COL.plaga} y="266" textAnchor="middle" fontSize="7.5" fontStyle="italic" fill={CATEGORIA.plaga.tinta}>
        ni una mordida igual a otra
      </text>

      <LupaPlaga cx={COL.plaga} cy={306} r={32} />

      <Vineta
        x={12}
        y={366}
        color={CATEGORIA.plaga.tinta}
        lineas={[{ fuerte: 'IRREGULAR', resto: ' — no hay dos' }, 'mordidas iguales. Sin borde.']}
      />
      <Vineta
        x={12}
        y={389}
        color={CATEGORIA.plaga.tinta}
        lineas={[{ fuerte: 'EMPIEZA', resto: ' donde está el' }, 'bicho, no parejo en la mata.']}
      />
      <Vineta
        x={12}
        y={412}
        color={CATEGORIA.plaga.tinta}
        lineas={[{ fuerte: 'DEJA RASTRO', resto: ' — caquita,' }, 'telaraña, mielato. Voltee la hoja.']}
      />
      <NoSirve cx={COL.plaga} cat="plaga" lineas={['Fungicida no le hace nada al', 'bicho — y le mata al benéfico.']} />

      {/* ================= COLUMNA 2 · ENFERMEDAD ================= */}
      <g transform={`translate(${COL.enfermedad} ${BASE_Y}) scale(${ESC})`}>
        <HojaBase>
          <RoyaPorElHaz manchas={ROYA} />
          <ManchaCercospora cx={CERCO.cx} cy={CERCO.cy} r={CERCO.r} semilla={5} />
        </HojaBase>
      </g>
      <Rotulo
        texto="roya"
        nota="voltéela"
        tx="244"
        ty="140"
        tam={8}
        tinta={CATEGORIA.enfermedad.tinta}
        guia={{ d: `M242 142 C 236 146 ${dRoya.x + 6} ${dRoya.y - 6} ${dRoya.x} ${dRoya.y}`, px: dRoya.x, py: dRoya.y }}
      />
      <Rotulo
        texto="borde"
        nota="y halo"
        anchor="end"
        tx="176"
        ty="186"
        tam={8}
        tinta={CATEGORIA.enfermedad.tinta}
        guia={{ d: `M178 184 C 184 184 ${dCerco.x - 6} ${dCerco.y + 4} ${dCerco.x} ${dCerco.y}`, px: dCerco.x, py: dCerco.y }}
      />
      <text x={COL.enfermedad} y="266" textAnchor="middle" fontSize="7.5" fontStyle="italic" fill={CATEGORIA.enfermedad.tinta}>
        el borde se sigue con el dedo
      </text>

      <LupaEnfermedad cx={COL.enfermedad} cy={306} r={32} />

      <Vineta
        x={152}
        y={366}
        color={CATEGORIA.enfermedad.tinta}
        lineas={[{ fuerte: 'TIENE FORMA', resto: ' — halo, borde' }, 'que usted sigue con el dedo.']}
      />
      <Vineta
        x={152}
        y={389}
        color={CATEGORIA.enfermedad.tinta}
        lineas={[{ fuerte: 'POR FOCOS', resto: ' — arranca en un' }, 'punto y se riega con la humedad.']}
      />
      <Vineta
        x={152}
        y={412}
        color={CATEGORIA.enfermedad.tinta}
        lineas={[{ fuerte: 'ROYA', resto: ' — polvo naranja en el' }, 'ENVÉS. Por el haz, solo amarillo.']}
      />
      <NoSirve cx={COL.enfermedad} cat="enfermedad" lineas={['Veneno de bichos no mata el', 'hongo. Plata perdida.']} />

      {/* ================= COLUMNA 3 · DEFICIENCIA ================= */}
      <g transform={`translate(${COL.deficiencia} ${BASE_Y}) scale(${ESC})`}>
        <HojaBase tinteLamina={DEFICIENCIA.hierroLamina} conBrillo={false}>
          <ClorosisHierro />
        </HojaBase>
      </g>
      <Rotulo
        texto="la vena"
        nota="verde"
        tx="382"
        ty="150"
        tam={8}
        tinta={CATEGORIA.deficiencia.tinta}
        guia={{ d: `M380 152 C 376 156 ${dVena.x + 6} ${dVena.y - 4} ${dVena.x} ${dVena.y}`, px: dVena.x, py: dVena.y }}
      />
      <text x={COL.deficiencia} y="266" textAnchor="middle" fontSize="7.5" fontStyle="italic" fill={CATEGORIA.deficiencia.tinta}>
        sin bicho, sin borde, sin mancha
      </text>

      <LupaDeficiencia cx={COL.deficiencia} cy={306} r={32} />

      <Vineta
        x={292}
        y={366}
        color={CATEGORIA.deficiencia.tinta}
        lineas={[{ fuerte: 'SIMÉTRICA', resto: ' — igualita a lado' }, 'y lado. Sigue la nervadura.']}
      />
      <Vineta
        x={292}
        y={389}
        color={CATEGORIA.deficiencia.tinta}
        lineas={[{ fuerte: 'POR EDAD', resto: ' — hierro: las hojas' }, 'NUEVAS. Nitrógeno: las VIEJAS.']}
      />
      <Vineta
        x={292}
        y={412}
        color={CATEGORIA.deficiencia.tinta}
        lineas={[{ fuerte: 'SIN BICHO Y SIN BORDE', resto: ' —' }, 'no hay mancha: hay hambre.']}
      />
      <NoSirve cx={COL.deficiencia} cat="deficiencia" lineas={['Fumigar no le da de comer:', 'esto se ALIMENTA, no se cura.']} />

      {/* ================= LA LLAVE ================= */}
      <rect x="14" y="462" width="392" height="62" rx="6" fill={PLIEGO.papelHondo} stroke={PLIEGO.borde} strokeWidth="1" />
      <text x="24" y="476" fontSize="9.5" fontWeight="800" fill={TINTA.fuerte} letterSpacing="0.06em">
        LA LLAVE
      </text>
      <text x="70" y="476" fontSize="8.5" fontStyle="italic" fill={TINTA.suave}>
        — no se fije en el color; fíjese en el ORDEN.
      </text>

      <g transform="translate(28 491)">
        <GlifoDesorden />
      </g>
      <text x="52" y="494" fontSize="8.4" fill={TINTA.media}>
        <tspan fontWeight="800" fill={CATEGORIA.plaga.tinta}>La plaga</tspan>
        <tspan> es un desastre irregular: mordidas distintas, y un animal detrás.</tspan>
      </text>

      <g transform="translate(28 504)">
        <GlifoForma />
      </g>
      <text x="52" y="507" fontSize="8.4" fill={TINTA.media}>
        <tspan fontWeight="800" fill={CATEGORIA.enfermedad.tinta}>La enfermedad</tspan>
        <tspan> tiene forma: halo, borde definido, anillos. Se puede dibujar.</tspan>
      </text>

      <g transform="translate(28 517)">
        <GlifoSimetria />
      </g>
      <text x="52" y="520" fontSize="8.4" fill={TINTA.media}>
        <tspan fontWeight="800" fill={CATEGORIA.deficiencia.tinta}>El hambre</tspan>
        <tspan> va ordenada: simétrica, siguiendo la nervadura, por edad de hoja.</tspan>
      </text>

      {/* ================= EL LÍMITE HONESTO ================= */}
      <rect x="14" y="530" width="392" height="54" rx="6" fill="none" stroke={CATEGORIA.duda.tinta} strokeWidth="0.9" strokeDasharray="4 3" opacity="0.85" />
      <text x="24" y="545" fontSize="9" fontWeight="800" fill={CATEGORIA.duda.tinta} letterSpacing="0.04em">
        Y HAY VECES QUE NO SE PUEDE SABER.
      </text>
      <text x="24" y="557" fontSize="7.6" fill={TINTA.media}>
        Muchos daños se parecen, y la diferencia está en detalles que no se ven de lejos. Cuando no alcanza
      </text>
      <text x="24" y="566.5" fontSize="7.6" fill={TINTA.media}>
        a ver, lo correcto no es adivinar: es acercarse, voltear la hoja, sacar una matica y mirarle la raíz
      </text>
      <text x="24" y="576" fontSize="7.6" fill={TINTA.media}>
        — o pedir la foto. <tspan fontStyle="italic" fontWeight="700" fill={CATEGORIA.duda.tinta}>La duda también es parte del método.</tspan>
      </text>

      <text x="16" y="594" fontSize="7" fontStyle="italic" fill={TINTA.guia}>
        Dibujado sobre fotografías reales de campo · café (Coffea arabica) · roya, mancha de hierro, gusano
      </text>
    </svg>
  );
}
