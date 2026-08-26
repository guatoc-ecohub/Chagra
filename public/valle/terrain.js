// ── Terreno REAL del cañón de Guatoc (DEM 2026-07, Guatoc en el centro) ──────
// assets/guatoc-height.bin: Uint16 LE 699x701 (downsample 2x del PNG 16-bit),
// 9.4 m/px, elevación real 1869..3401 m (guatoc-dem-meta.json).
//
// ── EL RUMBO REAL (2026-07-26): -Z APUNTA A LA CHORRERA ──────────────────────
// El operador dio la coordenada. Plus Code `H2WR+7V Choachí` = `67P8H2WR+7V`,
// decodificado a mano (Open Location Code, 5 pares + refinamiento) da
// exactamente 4.595688, -73.957812 — o sea el dato es internamente consistente.
//
//   La Chorrera   4.595688, -73.957812
//   La casa       4.588278, -73.949585  ← Y ES EL CENTRO DEL TILE DEM
//                                         (assets/guatoc-dem-meta.json: lat/lng)
//
// Derivado aquí, no copiado (r/coords.mjs, WGS84 local en φ=4,588°:
// 110581,4 m/grado lat · 110965,1 m/grado lng):
//
//   +819,4 m NORTE · −912,9 m este (= 912,9 m al OESTE)
//   distancia 1227 m · RUMBO 311,9° — NOROESTE
//
// La orientación anterior (180°, -Z = OESTE) dejaba el escarpe elegido en
// x=−620 z≈−980, que en metros reales es 1033 m al SUR y 1633 m al oeste:
// RUMBO 237,7°, a 1933 m. O sea la cascada estaba **74,2° fuera de rumbo y a
// 706 m de más** — en la cara equivocada del cañón, como sospechaba la medida
// angular de la ronda anterior (42° de cuadro ⇒ ~900 m, no 1,7 km).
//
// Ejes de escena: -Z = rumbo 311,9° (LA CHORRERA, al frente de la cámara);
// +X = rumbo 41,9°. Rotación pura, sin espejo — sólo 41,9° más que la anterior.
//
// POR QUÉ SE ROTA EL MAPEO Y NO LA CÁMARA: toda la maquinaria del escarpe
// (`faceCol` barriendo z de −240 a −1150, `channelCarve`, `facePos`, `gorgeAt`,
// la banda de piel de `cliff.js`, las cartas de bruma) asume que la cara está
// AL FRENTE, sobre -Z. Girando sólo la cámara habría que re-tejer las seis a
// una diagonal; girando el mapeo, las seis quedan bien de una vez y las 6
// cámaras —que ya se derivan de `DIR`/`LAT`— se re-apuntan solas.
//
// Por qué se rotó — CUATRO medidas independientes apuntaban al mismo lado:
//   1. Skyline del DEM desde el ojo de Guatoc: en la orientación vieja el
//      horizonte al frente caía POR DEBAJO de la línea de ojo en toda la franja
//      (-12,3° a -3,5°; el terreno desciende 250-400 m hacia el piedemonte).
//      Rotado sube a +13,8° … +23,4°, con la cumbre a 3216-3270 msnm — o sea
//      750 m por encima del sitio, a 1,0-1,7 km. El relieve alto de este cañón
//      estaba A LA ESPALDA del usuario.
//   2. Veredicto de Gemini contra file_158: «garganta en V con hombros:
//      INEXISTENTE» y «meseta ancha con bandas de roca». Los dos hallazgos son
//      la rotación, no un retoque de la pared.
//   3. La pared paramétrica se tuvo que inventar y fusionar DOS veces porque
//      al frente no había nada que sostuviera la cascada.
//   4. El propio código se contradecía: el bloque de abajo llama «cañón del
//      AMANECER» a lo que queda a la ESPALDA (backK, z>255) — y el amanecer es
//      el ESTE. Con el mapeo viejo la espalda era el OESTE; con éste, el este.
//      El comentario tenía razón y el mapeo estaba al revés.
//
// K unidades de escena por metro real, UNIFORME en horizontal y vertical:
// la proporción del relieve es la verdadera (desnivel 1533 m → 920 unidades).
//
// ⛔ YA NO HAY FUSIÓN DEM→FARALLÓN. El escarpe del frente es el DEM REAL; la
// pared paramétrica inventada salió (ver el bloque ⛔ de `height()` y cliff.js).
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

const N = new ImprovedNoise();
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mix = (a, b, t) => a + (b - a) * t;
export const sstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

export function fbm(x, z, oct = 4, lac = 2.0, gain = 0.5) {
  let a = 1, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) { sum += N.noise(x * f, z * f, i * 7.31) * a; norm += a; a *= gain; f *= lac; }
  return sum / norm;
}

// ── DÓNDE CAE LA CHORRERA: EN SU COORDENADA, YA NO "DONDE HAY CARA" ────────
// Las cuatro rondas anteriores la pusieron donde el DEM ofrecía escarpe
// (x=-31 sobre la pared inventada, luego x=-620 sobre la cara del sur-oeste).
// Ahora está donde ESTÁ: con -Z al rumbo 311,9° el punto GPS cae, por
// construcción, en x = 0 · z = -736 u (= 1227 m).
export const CHANNEL_X = 0;
//
// ── ¿RESPALDA EL DEM UNA CASCADA AHÍ? SÍ, Y CON NÚMEROS (r/chorrera.mjs) ────
// Perfil por el eje desde el ojo de la casa (paso 33 m):
//
//     dist    msnm    lo que hace el terreno
//     500 m   2410    fondo del valle
//    1000 m   2428    fondo del valle (llano, 8 m en 500 m)
//    1227 m   2520    ← EL PUNTO GPS: aquí ARRANCA la pared
//    1300 m   2566    +47,0° de pendiente
//    1500 m   2700    +28,9°
//    1600 m   2835    +46,4°
//    1800 m   3017    +59,3°   ← el tramo más empinado
//    1867 m   3084    +36,1°   ← el filo; de aquí en adelante es MESETA
//    2100 m   3121    +1,6°  (meseta)
//
//   · el punto GPS está al PIE de la cara, no en su cumbre;
//   · de 2530 msnm (z=-760) a 3084 msnm (z=-1120) hay 554 m de desnivel en
//     600 m horizontales = 42,7° de pendiente media, con tramos de 55-59°;
//   · pendiente EN el punto: 33,3°; máxima en 500 m a la redonda: 78,3°;
//   · desnivel en un radio de 150 m: 253 m. En 500 m: 586 m.
//
// 554 m de salto. La Chorrera de Choachí está documentada en ~590 m. El DEM,
// que no trae hidrografía ninguna, coincide dentro del 6 % con la coordenada
// que dio el operador — es la confirmación independiente que faltaba.
//
// DOS ESCALONES, no un chorro: el perfil se quiebra en z=-1000/-1040 (+16°,
// +24°) entre el tramo de 55-57° de abajo y el de 52-59° de arriba. Es la
// caída escalonada que Gemini echaba de menos y que se ve en file_158.
//
// ── EL CHIFLÓN VA A LA IZQUIERDA. Y POR QUÉ SE TORCIÓ DOS VECES ────────────
//
// Veredicto del operador (2026-07-27), que vive frente al cañón y es la verdad
// de terreno: «el Chiflón volvió a quedar a la DERECHA, es a la IZQUIERDA
// donde pertenece». La palabra "volvió" es la clave: ya se había corregido y
// se perdió. Aquí queda escrito el porqué, para que no vuelva a pasar.
//
// EL ERROR DE RAZONAMIENTO (el comentario que estaba aquí, textual):
//   «El Chiflón es OTRO salto del MISMO cañón, AGUAS ABAJO: el thalweg baja
//    hacia +x (a z=-500 el fondo está en x=+115; a z=-400, en x=+240), así
//    que aguas abajo es la DERECHA del cuadro» → x = +350.
// El dato del thalweg es correcto y sigue vigente: aguas abajo DE LA CHORRERA
// es +x, y +x es la derecha del cuadro (re-medido hoy, ver abajo). Lo que
// estaba mal es la PREMISA: derivar el puesto del Chiflón del thalweg de La
// Chorrera da por hecho que es el mismo curso de agua más abajo. **No lo es.**
// Son dos cascadas en dos puntos SEPARADOS del cañón (corrección del operador
// del 2026-07-24, la misma que ya costó un render rechazado por mezclarlas):
// La Chorrera es el salto monumental del fondo; **El Chiflón es la quebrada
// de la que Guatoc y la vereda TOMAN EL AGUA** — otra vertiente, más cerca,
// más baja, más chica. Su puesto no se deduce de La Chorrera: se pone donde
// el operador lo ve. Cada vez que alguien vuelva a razonar "aguas abajo → +x"
// el Chiflón se va a ir a la derecha otra vez. No se razona: se respeta.
//
// LA MEDIDA (Vega 10, `?cam=guatoc` y `?cam=aoe`, cuadro de 964 px):
//   x = +350  → sx = 911 (guatoc) · 797 (aoe)   ← borde DERECHO. Era esto.
//   x =    0  → sx = 510 (guatoc) · 502 (aoe)   ← La Chorrera, al centro.
//   x = -200  → sx = 348 (guatoc) · ~355 (aoe)  ← IZQUIERDA, bien en cuadro.
// El signo está verificado en las dos cámaras: **+x es la derecha, -x es la
// izquierda**. No es una suposición de proyección.
//
// ── (2026-07-30) EL CHIFLÓN SE MUDA A SU PROPIA MONTAÑA ─────────────────────
// Contra las fotos del operador (Chagra-strategy/ops/refs-chorrera/): en
// x=-200 el Chiflón seguía siendo un chorro EN EL MISMO anfiteatro de La
// Chorrera, coronando la muesca a 100 px del hilo grande — «pegado». La foto
// wide-ubicacion-chiflon.jpg muestra otra cosa: el Chiflón vive en OTRA
// montaña, la de la izquierda del cuadro, MÁS BAJA y MÁS CERCA (es la
// quebrada de la que la vereda toma el agua), separada del macizo de La
// Chorrera por una vaguada entera.
//
// Y ESA MONTAÑA EXISTE EN EL DEM (sondeo probe-chiflon.mjs, 2026-07-30):
//   · en x=-280/-300 el perfil sube de y=29 (z=-420) a y≈195-209 (z=-750) —
//     un frente PROPIO con cima a ~2650 msnm, 430 m MÁS BAJO que el filo de
//     La Chorrera, a ~950 m de la casa (la Chorrera está a 1,3-1,9 km);
//   · su tramo bravo: z=-540..-445, 37-50° — un escarpe de ~90 m, que es
//     EXACTAMENTE la caída documentada del Chiflón real;
//   · lo separa del macizo la vaguada de x≈-250..-240 (el perfil se hunde
//     ahí): ~500 m de separación lateral y un pliegue entero en medio;
//   · línea de vista desde el domo: VERIFICADA (los 7 puntos sondeados,
//     visibles todos).
// El -278 y no -300: MEDIDO con proyección dentro de la página (?cam=guatoc,
// probe-screen 2026-07-30): en -300 el labio caía en sx=73 y el pie en
// sx=-9 — medio salto FUERA del cuadro del gate. En -278 el conjunto queda
// en el borde izquierdo pero entero: la MISMA composición de la foto wide.
// Sigue a la IZQUIERDA (veredicto del operador intacto) — solo que ahora en
// su montaña, no en la de La Chorrera.
export const CHIFLON_X = -278;
// altura (en t de faceCol) del LABIO del Chiflón sobre su propia cara: el
// salto vive en el tramo BAJO del frente (labio y≈99 → 2681 msnm, pie y≈50),
// no coronando la cresta. Lo comparten waterfalls.js (la caída), cliff.js
// (poza, Roca Blanca, roca clara) y main.js (?cam=chiflon).
export const CHIFLON_T0 = 0.36;

// De qué lado del canal quedó el Chiflón. Todo lo que lo acompaña (Roca
// Blanca, la muesca pálida) se colocaba con offsets NEGATIVOS horneados,
// calculados cuando el Chiflón estaba a la derecha: al pasarlo a la izquierda
// esos offsets lo mandaban al lado equivocado y Roca Blanca se salía del
// hombro. Con el signo, el arreglo mira solo, y si mañana vuelve a moverse
// todo lo suyo se mueve con él. Ver `cliff.js` (rbX, chifK).
export const CHIFLON_LADO = Math.sign(CHIFLON_X - CHANNEL_X) || 1;

// eje del hilo de agua.
// ── (2026-07-30) LA DERIVA ESTABA ESPEJADA. LA FOTO MANDA ───────────────────
// La foto canónica del operador (refs-chorrera/chorrera-montana.jpg) es
// inequívoca: el hilo NACE arriba a la DERECHA y el pie queda desplazado a la
// IZQUIERDA — el agua cae de derecha a izquierda, con deriva total ≈88 px
// sobre 342 px de caída visible (~140 m reales ≈ 84 u). La deriva anterior
// (−70 u: nace izquierda → pie derecha) era el ESPEJO de eso, y venía del
// thalweg de r/plan.mjs §C (x=-200 en z=-1050 → -5 en z=-700). Ese dato sale
// de un DEM de 9,4 m/px que este mismo archivo reconoce que ALISA las
// gargantas angostas — el surco fino real no está en el dato, y contra la
// fotografía del que vive al frente, pierde el dato liso. Amplitud amortiguada
// a 55 u (más el sesgo de pintura de waterfalls.js): a plomada con deriva
// legible, como en la foto.
export function channelAxis(z) { return CHANNEL_X + 55 * sstep(-700, -1060, z); }

// ── LA HENDIDURA, TALLADA EN EL TERRENO REAL ─────────────────────────────────
// El DEM a 9,4 m/px ALISA las gargantas angostas: el surco por el que baja La
// Chorrera existe en el cañón pero no en el dato. Antes lo fingía `gorgeAt`
// sobre la lámina paramétrica; ahora se talla aquí, sobre la montaña de
// verdad, para que el agua corra por una hendidura y no por un lomo liso.
// Es un CORTE (el agua excava), no relieve añadido: no inventa cumbre ninguna.
export function channelCarve(x, z) {
  // ventana en z: talla la cara pero SE APAGA antes del filo — en file_158 la
  // cumbre corre entera y el hilo nace bien por debajo, sin muesca en el cielo.
  // Re-encajada sobre la cara REAL (pie z≈-760, filo z≈-1120).
  const w = sstep(-560, -700, z) * (1 - sstep(-1060, -1180, z));
  if (w < 0.001) return 0;
  const dx = x - channelAxis(z);
  return (34 * Math.exp(-(dx * dx) / (60 * 60)) + 14 * Math.exp(-(dx * dx) / (22 * 22))) * w;
}

// ── el DEM real ──
export const K = 0.6;                        // unidades de escena por metro real
const ELEV_MIN = 1869, ELEV_MAX = 3401;      // rango del heightmap (metadata)
const DEM_W = 699, DEM_H = 701, MPP = 9.4;   // px del binario y metros/px

const demBuf = await (await fetch(new URL('./assets/guatoc-height.bin', import.meta.url))).arrayBuffer();
const DEM = new Uint16Array(demBuf);
if (DEM.length !== DEM_W * DEM_H) throw new Error('guatoc-height.bin corrupto');

function demElev(fx, fy) {                   // bilinear, coords en píxeles
  const x = clamp(fx, 0, DEM_W - 1.001), y = clamp(fy, 0, DEM_H - 1.001);
  const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
  const i = y0 * DEM_W + x0;
  const a = DEM[i], b = DEM[i + 1], c = DEM[i + DEM_W], d = DEM[i + DEM_W + 1];
  const v = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  return ELEV_MIN + (v / 65535) * (ELEV_MAX - ELEV_MIN);
}

const CPX = (DEM_W - 1) / 2, CPY = (DEM_H - 1) / 2;
const EL_REF = demElev(CPX, CPY);            // Guatoc: ~2516 msnm (la loma del sitio)
export const elevOf = (y) => EL_REF + y / K; // altura de escena → msnm reales

// RUMBO REAL: -Z apunta a La Chorrera (311,9°). Rotación pura del mapeo.
//   -Z → (norte, este) = (cos B, sen B)        +X → (-sen B, cos B)
// Con B = 270° esto degenera exactamente en el mapeo anterior (eastM = z/K,
// southM = -x/K), o sea es la MISMA familia de rotaciones, 41,9° más.
export const BRG = 311.91;                   // grados, 0 = norte, 90 = este
const _cB = Math.cos(BRG * Math.PI / 180), _sB = Math.sin(BRG * Math.PI / 180);
export function sceneToReal(x, z) {          // → metros reales desde la casa
  return { northM: (-_sB * x - _cB * z) / K, eastM: (_cB * x - _sB * z) / K };
}
function demY(x, z) {                        // heightfield real puro
  const m = sceneToReal(x, z);
  return (demElev(CPX + m.eastM / MPP, CPY - m.northM / MPP) - EL_REF) * K;
}

// ── DÓNDE ESTÁ LA CASA: EN SU COORDENADA. Y ESO ES (0, 0) ────────────────
// La ronda anterior la mudó a (-300, 80) porque en (-30, 40) el DEM daba 29,2°
// de pendiente — inhabitable — y desde ahí no se veía la caída. El operador:
// «la casa está donde está en la finca real». Tiene razón, y el dato nuevo
// explica POR QUÉ los dos puestos estaban mal:
//
//   `guatoc-dem-meta.json` → lat 4.5882776, lng -73.9495846.
//   Es EXACTAMENTE la coordenada que el operador da para la casa.
//   O sea el CENTRO DEL TILE **ES** LA CASA, y la casa es la escena (0, 0).
//
// Medido sobre el DEM crudo con el mapeo nuevo (r/casa.mjs):
//
//     puesto                    msnm   pendiente   a cuánto del GPS
//   (0, 0)     el GPS           2516      6,8°          0 m     ← ÉSTE
//   (-30, 40)  el legacy        2510     24,0°         83 m
//   (-300, 80) donde YO la mudé 2521     24,8°        517 m
//
// EL HALLAZGO SOBRE EL DEM: los 29° nunca fueron el sitio de la casa. (-30,40)
// es un valor de composición heredado de antes de que existiera el DEM, y en
// esta ladera 83 m bastan para caer de un hombro de 6,8° a una cuesta de 24°.
// La casa de verdad SÍ está en terreno habitable — mi "hallazgo" de la ronda
// anterior era un artefacto de medir 83 m al lado. Devolverla a (-30, 40) la
// dejaría en 24°: revertir del todo sería repetir el error con otro signo.
// Por eso va al GPS, que es a la vez «donde está en la finca real» y el único
// de los tres puestos que no es un número inventado por nadie.
export const SITE_X = 0, SITE_Z = 0;
const SITE_Y = demY(SITE_X, SITE_Z);         // la loma real del sitio

// ══════════════════════════════════════════════════════════════════════════
// ⛔ AQUÍ VIVÍA `wallTopY(x)`: EL PERFIL DEL FILO INVENTADO. BORRADO EN FIRME.
//
// Era la cresta paramétrica que cliff.js usaba como techo de su lámina y que
// `height()` fundía en el terreno detrás de la cara. Números que lo condenan,
// medidos desde el ojo de Guatoc con el DEM ya rotado (r/skyline.mjs):
//
//   · Su cumbre daba 3674 msnm. El MÁXIMO de todo el tile DEM es 3401 msnm.
//     Inventaba una montaña más alta que cualquier cosa que exista en el dato.
//   · Sobre el eje del cuadro la cresta inventada quedaba +991 m POR ENCIMA
//     del terreno real (3667 vs 2676 msnm en x=0; +935 m en x=-100).
//   · Tapaba el escarpe REAL en los 21 azimuts del encuadre, de +3,7° a +16,0°:
//     el macizo verdadero (23°) quedaba entero detrás de la lámina (41,6°).
//   · Y por el flanco derecho (x=+700…+1400) se quedaba 113-364 m POR DEBAJO
//     del terreno real: ahí la montaña de verdad la atravesaba.
//
// O sea: con la rotación, la pared inventada no sólo sobraba — ESCONDÍA el
// escarpe que se buscaba desde el principio. Es la causa raíz de las tres
// rondas de "montaña sobre montaña" y de las dos fusiones fallidas.
// NO LA VUELVAS A CREAR. El frente ahora es DEM y nada más.
// ══════════════════════════════════════════════════════════════════════════

// ── EL ESCARPE REAL DEL FRENTE, leído del DEM ────────────────────────────────
// Para cada columna x: dónde está la cumbre del macizo que se ve al frente, y
// dónde el fondo del valle delante de ella. Es lo que antes fingía `wallTopY`,
// pero sacado del heightfield en vez de inventado. Cacheado por columna (la
// vegetación de pared lo consulta ~55 000 veces).
// FACE_ZFAR pasa de -1450 a -1150: con el rumbo real, más allá de -1150 ya no
// hay cara sino la MESETA de arriba, que sigue subiendo despacio hasta 3191
// msnm en z=-1500. Con -1450 la "cumbre" de cada columna caía en la meseta a
// 2,5 km y `facePos` colgaba la cascada allá, pasado el filo. Con -1150 la
// cumbre cae en el filo del escarpe (3084-3094 msnm, z=-1120/-1140), que es
// donde el perfil se quiebra de +36° a +2,9°.
// FACE_ZNEAR pasa de -240 a -450 por la misma razón que existe la banda X0/X1
// en cliff.js, y medido igual (r/banda.mjs): con -240 las columnas de x>+250
// daban su PIE en el propio borde de la ventana (z=-240, a 400 m del ojo), así
// que `faceZAt` plantaba la piel de pared —rocas y bosque de niebla— en el
// PRIMER PLANO. Se ve en la captura N1: el flanco derecho salió convertido en
// un pedregal de bloques enormes. Con -450 el pie de TODAS las columnas queda
// a ≥750 m y la piel no puede caer delante. El pie de la cascada (z≈-695) y el
// filo (z≈-1130) siguen holgadamente dentro.
const FACE_ZNEAR = -450, FACE_ZFAR = -1150, FACE_STEP = 10;
const _colCache = new Map();
export function faceCol(x) {
  const kx = Math.round(x / 10) * 10;
  let c = _colCache.get(kx);
  if (c) return c;
  const ys = [], zs = [];
  for (let z = FACE_ZNEAR; z >= FACE_ZFAR; z -= FACE_STEP) { zs.push(z); ys.push(demY(kx, z) - channelCarve(kx, z)); }
  let iTop = 0;
  for (let i = 1; i < ys.length; i++) if (ys[i] > ys[iTop]) iTop = i;
  let iBot = 0;                                   // el fondo ENTRE la cámara y la cumbre
  for (let i = 1; i <= iTop; i++) if (ys[i] < ys[iBot]) iBot = i;
  c = { ys, zs, top: ys[iTop], topZ: zs[iTop], bot: ys[iBot], botZ: zs[iBot] };
  _colCache.set(kx, c);
  return c;
}
// z real donde la ladera del frente alcanza la altura `yT` (el punto de la
// superficie donde hay que colgar la cascada, un árbol o una roca). Se busca
// desde la cumbre HACIA la cámara: la primera vez que el perfil baja de yT.
export function faceZAt(x, yT) {
  const c = faceCol(x);
  const iTop = c.zs.indexOf(c.topZ);
  for (let i = iTop; i >= 0; i--) {
    if (c.ys[i] <= yT) {
      if (i === iTop) return c.zs[iTop];
      const y0 = c.ys[i], y1 = c.ys[i + 1], z0 = c.zs[i], z1 = c.zs[i + 1];
      const f = Math.abs(y1 - y0) < 1e-6 ? 0 : (yT - y0) / (y1 - y0);
      return z0 + (z1 - z0) * clamp(f, 0, 1);
    }
  }
  return c.zs[0];
}

// perfil del filo del macizo del frente: AHORA ES EL DEM (ver faceCol)
export function wallTopY(x) { return faceCol(x).top; }


// ⛔ `wallLatK` (el peso del corredor de fusión DEM→farallón) salió con la
// fusión: ya no hay lámina que apagar lateralmente. El macizo del frente es
// el DEM entero y muere donde muere el tile, no donde moría un invento.

export function height(x, z) {
  const d = -z; // hacia el frente (este real)
  let h = demY(x, z);

  // micro-relieve: el DEM trae ~30 m de resolución efectiva; esto da el grano
  h += fbm(x / 140 + 9.2, z / 140 + 9.2, 3) * 3.4 + fbm(x / 46 + 4.4, z / 46 + 4.4, 2) * 1.2;

  // la hendidura de La Chorrera, excavada en la ladera real
  h -= channelCarve(x, z);

  // explanada del sitio: la terraza de la cabaña sobre la loma real
  const sk = Math.exp(-((x - SITE_X) ** 2 + (z - SITE_Z) ** 2) / (42 * 42));
  h = mix(h, SITE_Y + 0.4, sk * 0.82);

  // ══════════════════════════════════════════════════════════════════════
  // ⛔ AQUÍ VIVÍA EL "CAÑÓN DEL AMANECER": un abismo inventado que hundía
  //    todo lo que quedaba detrás del sitio hasta -700 u (= -1167 m bajo
  //    Guatoc), más una pradera plana forzada (`rimFlat`) hasta el borde.
  //    BORRADO EN FIRME con la rotación.
  //
  // Nació de leer `cabana-real2` como "a la espalda el valle cae 1000+ m", y
  // en la orientación vieja la espalda era el OESTE. Rotado, la espalda es el
  // ESTE — que es justamente lo que el comentario decía ("por donde sale el
  // sol"). Pero el DEM real detrás de la casa NO cae 1000 m: baja 110 m a
  // 500 m de distancia y 180 m a 1 km. El abismo inventaba casi un kilómetro
  // de desnivel que no existe, y de paso hundía el puesto desde el que está
  // tomada file_158 (ver `?cam=foto158`). Detrás de la casa ahora hay lo que
  // hay: una loma que rueda y desciende.
  // ══════════════════════════════════════════════════════════════════════

  // ⛔ AQUÍ SE FUNDÍA EL TERRENO CON LA MESETA DEL FARALLÓN INVENTADO
  // (`wallW = sstep(830,1075,d) * wallLatK(x)` → `h = mix(h, wallTopY(x)-40+…)`).
  // BORRADO EN FIRME con la rotación: al frente ya hay macizo REAL (cumbre
  // 3216-3270 msnm a 1,0-1,7 km, +23° desde el ojo de Guatoc), así que fundir
  // el DEM contra una cresta inventada de 3674 msnm era APLASTAR la montaña de
  // verdad y poner otra encima. Ver el bloque ⛔ de `wallTopY` arriba.
  return h;
}

// ═══════════════════════════════════════════════════════════════════════
// ── DIRT: el campo de "tierra" del valle (bench pasto-ralo) ──────────────
// Un césped uniforme lee como alfombra, no como suelo. Este campo dice cuánta
// tierra desnuda hay en cada punto (0 = pasto firme, 1 = suelo pelado). Lo
// consumen makeTerrain() (tinte del suelo, para que se LEA tierra y no un
// agujero verde más oscuro) y flora.js (ralear el pasto donde el valor sube).
//
// REGLAS, no aleatoriedad — y todas ancladas a coordenadas del sitio que ya
// existen (structures.js, terrain.js), no a números inventados:
//   · caminos y zonas de paso → banda de pisoteo a lo largo del sendero real
//     del sitio (mirador → huerta → fogata → torii → deck → loma del campero);
//   · alrededor de construcciones → desgaste de tránsito (cabaña+domo, deck,
//     huerta, torii, mirador, el campero);
//   · pendientes fuertes → el suelo se lava y el pasto no agarra;
//   · junto al agua (canal de La Chorrera, salto del Chiflón) → la humedad
//     aguanta el pasto: ahí la tierra BAJA.
// La base de ruido sólo da bordes irregulares a esas reglas: el desgaste
// nunca es un disco perfecto.
// ═══════════════════════════════════════════════════════════════════════

// distancia de un punto a un segmento [a→b] en el plano XZ
function distSegment(px, pz, ax, az, bx, bz) {
  const abx = bx - ax, abz = bz - az;
  const l2 = abx * abx + abz * abz;
  const t = l2 > 0 ? clamp(((px - ax) * abx + (pz - az) * abz) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
}

// dónde parquea el campero rojo: el MISMO barrido que structures.js (la
// altura máxima detrás de la casa). Cacheado: se consulta muchísimo.
let _carSpot = null;
function carSpot() {
  if (_carSpot) return _carSpot;
  let carX = SITE_X, carZ = SITE_Z + 40, carH = -Infinity;
  for (let cx = SITE_X - 48; cx <= SITE_X + 46; cx += 2) {
    for (let cz = SITE_Z + 16; cz <= SITE_Z + 92; cz += 2) {
      if (Math.hypot(cx - SITE_X, cz - SITE_Z) < 16) continue;
      const h = height(cx, cz);
      if (h > carH) { carH = h; carX = cx; carZ = cz; }
    }
  }
  _carSpot = { x: carX, z: carZ };
  return _carSpot;
}

// el sendero del sitio, en unidades de MUNDO (K=0.6; el "sendero" donde vive
// el torii según structures.js). Nace en el mirador del cañón, baja por la
// huerta, cruza la fogata y el portal, pasa el deck pequeño y sube a la loma
// donde parquea el campero (la última esquina se resuelve en runtime con el
// mismo barrido que usa el carro).
let _senderoCache = null;
function sendero() {
  if (_senderoCache) return _senderoCache;
  const car = carSpot();
  _senderoCache = [
    { x: -38, z: 50 },      // mirador del cañón
    { x: -28, z: 38 },
    { x: -18, z: 27 },
    { x: -9, z: 17 },       // huerta (bancales y tutores)
    { x: -2, z: 9 },
    { x: 1, z: 5 },         // fogata / corazón del sitio
    { x: 7, z: 7 },         // torii — el portal está "en el sendero"
    { x: 5, z: 1 },         // al frente de la cabaña
    { x: 8, z: -3 },        // deck pequeño del nivel bajo
    { x: 5, z: 12 },        // vuelve a la loma trasera
    { x: car.x, z: car.z }, // y llega donde parquea el campero
  ];
  return _senderoCache;
}

// construcciones que generan desgaste de tránsito a su alrededor (unidades
// de mundo; posiciones de structures.js × K)
const OBRAS = [
  { x: -0.2, z: 0.3, r: 7 },   // cabaña escalonada + domo + terraza del mirador
  { x: 2.7, z: -3.5, r: 3 },   // deck pequeño del nivel bajo
  { x: -3, z: 9, r: 4 },       // huerta (bancales + tutores)
  { x: 6.6, z: 7.2, r: 2 },    // portal torii
  { x: -38, z: 48, r: 8 },     // mirador del cañón
];

// qué tan lejos está el punto del agua: el canal de La Chorrera (el cauce
// tallado por `channelCarve`, z −560..−1180) y el salto del Chiflón con su
// poza (x≈−278, z −540..−445)
function aguaDist(x, z) {
  const d1 = distSegment(x, z, channelAxis(-560), -560, channelAxis(-1180), -1180);
  const d2 = distSegment(x, z, CHIFLON_X, -445, CHIFLON_X, -540);
  return Math.min(d1, d2);
}

// el campo en sí: 0 = pasto firme, 1 = tierra desnuda.
// `slopeHint` es la pendiente en ESCALA TAN (dy/dx), la misma que mide flora
// (slopeAt). Si no viene, se mide con el propio height().
export function dirtAmount(x, z, slopeHint = null) {
  // 1. base de ruido: bordes irregulares del desgaste (nunca un disco perfecto)
  let d = (fbm(x / 52 + 13.7, z / 52 + 13.7, 2) * 0.5 + 0.5) * 0.35;

  // 2. caminos y zonas de paso: banda de pisoteo a lo largo del sendero
  //    (sendero real ~1-2 u de ancho; plena a 1.2 u, muere a 7 u ≈ 12 m)
  let ds = Infinity;
  const tr = sendero();
  for (let i = 0; i < tr.length - 1; i++) {
    ds = Math.min(ds, distSegment(x, z, tr[i].x, tr[i].z, tr[i + 1].x, tr[i + 1].z));
  }
  d += (1 - sstep(1.2, 7, ds)) * 0.95;

  // 3. construcciones: desgaste de tránsito alrededor de cada obra
  let db = 0;
  for (const o of OBRAS) db = Math.max(db, 1 - sstep(o.r, o.r * 1.6, Math.hypot(x - o.x, z - o.z)));
  const car = carSpot();
  db = Math.max(db, 1 - sstep(2.5, 7, Math.hypot(x - car.x, z - car.z)));
  d += db * 0.75;

  // 4. pendientes fuertes (17°→29° en escala tan): el suelo se lava
  let s = slopeHint;
  if (s == null) {
    const e = 2.5;
    s = Math.hypot(height(x + e, z) - height(x - e, z), height(x, z + e) - height(x, z - e)) / (2 * e);
  }
  d += sstep(0.32, 0.55, s) * 0.75;

  // 5. junto al agua: la humedad aguanta el pasto → la tierra BAJA
  d *= 0.3 + 0.7 * sstep(20, 120, aguaDist(x, z));

  return clamp(d, 0, 1);
}

// `dirt` APAGADO por defecto: el campo de tierra espera juicio de arte del
// operador (cubre 57,7% del terreno con el umbral que de verdad pinta, medido
// 2026-08-10 — es un recoloreo global, no vetas de sendero, y choca con la
// regla verde-dominante). El default vive aquí, no en el llamador: con
// `= true` la página `impostores-valle.html` —que llama makeTerrain() sin
// argumentos— lo publicaba en 3d.guatoc.co aunque main.js sí lo apagara.
export function makeTerrain({ dirt = false } = {}) {
  // ── TONO VERDE-DOMINANTE (2026-08-18, opción 3 del INFORME-VALLE-CERCA-BEIGE)
  // La sonda ocre→mundo midió que el 57,5% del beige del cuadro b3 es la
  // PINTURA del propio terreno en ladera media (lerp de roca desde ~24° +
  // tinte crema del escarpe), no suelo sin flora — y a 900–1300 m la niebla
  // neutraliza cualquier copa que se siembre encima (medido: 1300 árboles
  // nuevos movieron la franja ~1 pp). El propio archivo declara la intención:
  // «el frente alto visto desde el valle es verde (foto 158)». Este retoque
  // corre la roca a pendientes de verdad (38°→48° en normal-scale) y enfría el
  // crema del escarpe a gris-crema. `?verde=0` lo apaga JUNTO con la flora
  // extendida: un solo interruptor para todo el A/B verde-dominante.
  const VERDE_TONO = new URLSearchParams(location.search).get('verde') !== '0';
  // malla amplia: cubre la loma, el cañón del frente y su continuación SE
  const W = 3200, D = 2650, CZ = -705; // z de +620 a -2030
  // 440x370 (antes 360x300): el DEM trae 9,4 m/px y a 360x300 el segmento medía
  // 14,8 m — más grueso que el dato, así que las cornisas de roca del macizo se
  // perdían. Ahora el segmento mide ~12,1 m y el bedding se lee.
  const SEGX = 440, SEGZ = 370;
  const geo = new THREE.PlaneGeometry(W, D, SEGX, SEGZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, CZ);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();

  // ── color por vértice: pisos de Humboldt sobre ELEVACIÓN REAL ──
  const nrm = geo.attributes.normal;
  const cols = new Float32Array(pos.count * 3);
  const cRockD = new THREE.Color(0x1b1714), cRockL = new THREE.Color(0x3a332b);
  const cForest = new THREE.Color(0x27401f), cForestL = new THREE.Color(0x3c5c2a);
  const cWallForest = new THREE.Color(0x142310);
  const cPast1 = new THREE.Color(0x5e8040), cPast2 = new THREE.Color(0x47682e);
  // pajonal dorado-verdoso de la paleta madre (TIERRAS.pajonal #a5975c): la
  // meseta leía como barro plano marrón; el páramo real es PAJA dorada
  const cParamo1 = new THREE.Color(0x9c8e52), cParamo2 = new THREE.Color(0x6d6c3d);
  // cornisas: piedra gris-crema clara (file_158) con alternancia cálida.
  // Tono verde-dominante: la banda clara pierde amarillo (crema→crema-gris);
  // las LÍNEAS de los estratos las dibuja la junta-sombra, que queda intacta.
  const cCornice = new THREE.Color(0x8e8b80);
  const cCorniceW = new THREE.Color(VERDE_TONO ? 0xb1aea3 : 0xb3ae9d);
  // roca de QUEBRADA (el asomo entre el bosque): en el bosque nublado real esa
  // roca sombreada carga musgo/liquen — tinte frío-verdoso, sólo para el rk
  // del piso de bosque; el escarpe grande (slope>0.58) conserva su roca.
  const cRockQD = new THREE.Color(VERDE_TONO ? 0x1a1c13 : 0x1b1714);
  const cRockQL = new THREE.Color(VERDE_TONO ? 0x343827 : 0x3a332b);
  // tierra desnuda del pasto ralo: marrón cálido de suelo seco en dos tonos
  // (claro seco / oscuro húmedo) para que no lea como un parche plano
  const cDirt1 = new THREE.Color(0x7a5230), cDirt2 = new THREE.Color(0x8f6437);
  const tmp = new THREE.Color(), tmp2 = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), d = -z;
    const elev = elevOf(y);
    const slope = 1 - nrm.getY(i);
    const slopeTan = Math.sqrt(Math.max(0, 1 - nrm.getY(i) * nrm.getY(i))) / Math.max(0.001, nrm.getY(i));
    const band = fbm(x / 90 + 4.4, z / 90 + 4.4, 3) * 0.5 + 0.5;
    const chunky = fbm(Math.round(x / 55) * 0.61 + 8, Math.round(z / 55) * 0.61 + 8, 2) * 0.5 + 0.5;

    // 0.58 (antes 0.42): a 0,42 el macizo salía con manchones MARRONES enormes
    // de roca pelada que leían como talud de tierra. En file_158 la ladera es
    // verde y la piedra asoma en CORNISAS (abajo), no en placas.
    if (slope > 0.58) {
      // roca expuesta: la rampa del farallón y los escarpes más bravos
      tmp.copy(cRockD).lerp(cRockL, band);
      // bosque aferrado en repisas menos empinadas de la pared
      if (d > 660 && slope < 0.62 && band > 0.42) tmp.lerp(cWallForest, 0.75);
    } else if (elev > 3020 && d > 1180) {
      // páramo real (>3000 msnm): pajonal dorado-oliva — SOLO en la meseta
      // trasera; el frente alto visto desde el valle es verde (foto 158: el
      // pajonal tan en la cara leía como talud pelado con bandas)
      tmp.copy(cParamo1).lerp(cParamo2, band);
    } else if (elev > 2820 && d > 1180) {
      // subpáramo: el bosque se achaparrra y dora hacia la cima. Con el tono
      // verde-dominante el dorado ARRANCA más arriba (2870) y con piso mínimo:
      // el achaparrado de 2820–2950 es bosque enano VERDE, no pajonal.
      tmp.copy(cForest).lerp(cForestL, band);
      tmp2.copy(cParamo1).lerp(cParamo2, band);
      tmp.lerp(tmp2, VERDE_TONO ? sstep(2870, 3040, elev) * 0.8 + 0.05 : sstep(2820, 3020, elev) * 0.8 + 0.15);
    } else if (elev < 2210 && slope < 0.24) {
      // potreros acolchados del fondo del cañón
      tmp.copy(cPast1).lerp(cPast2, chunky);
    } else {
      // bosque altoandino (el piso del sitio, ~2516 msnm)
      tmp.copy(cForest).lerp(cForestL, band);
      if (slope < 0.18 && elev > 2330 && elev < 2660) tmp.lerp(cPast1, 0.3 + chunky * 0.4); // claros
      // laderas empinadas de las quebradas: la roca asoma entre el bosque.
      // Tono verde-dominante: la roca asoma DESDE ~38° (no 24°) y más suave —
      // la ladera de quebrada del bosque nublado real es verde hasta bien arriba.
      const rk = VERDE_TONO ? sstep(0.26, 0.46, slope) : sstep(0.20, 0.38, slope);
      if (rk > 0) { tmp2.copy(cRockQD).lerp(cRockQL, band); tmp.lerp(tmp2, rk * (VERDE_TONO ? 0.55 : 0.7)); }
    }
    // ── CORNISAS DE ROCA DEL MACIZO (file_158) ──────────────────────────────
    // En la foto, bajo el filo de la meseta la piedra asoma en BANDAS CASI
    // HORIZONTALES rotas en tramos (bedding), y esa es la señal #1 que Gemini
    // echó de menos: «bandas/cornisas de roca horizontales (estratos) en toda
    // la ladera». Antes la daba el `rockMask` de la lámina inventada; ahora la
    // pone el propio terreno, sobre la ELEVACIÓN REAL, donde la ladera empina.
    // d > 450, no 240: `faceCol` ya no mira más acá de FACE_ZNEAR=-450, así que
    // para z > -450 el `tt` se medía contra una cara que está DETRÁS del vértice.
    if (d > 450) {
      const fc = faceCol(x);
      const rel = fc.top - fc.bot;
      if (rel > 60) {
        const tt = clamp((y - fc.bot) / rel, 0, 1);
        const warp = fbm(x / 300 + 3.1, 0.5, 2) * 12;      // el banco ondula
        const sy = (elev + warp) / 42;                     // un banco cada ~42 m
        const seam = sy - Math.floor(sy);
        const brk = fbm(x / 210 + 9.1, elev / 90 + 4.4, 2) * 0.5 + 0.5; // rota en tramos
        // cargadas BAJO EL FILO y sólo donde la ladera empina de verdad.
        // (2026-07-26) tt sube de 0,38-0,74 a 0,46-0,80 y `brk` afloja de
        // 0,40-0,66 a 0,34-0,62: en file_158 los estratos corren pegados al
        // borde de la meseta y casi de lado a lado, no a media ladera y a
        // parches. Es el único "falta" que dejó Gemini al dar PASA, y los
        // estratos están en la lista de HUESOS del operador — o sea se miden
        // y se dibujan, no se inventan: la cinta sigue colgada de `elevOf(y)`,
        // que es elevación REAL, y sólo cambia dónde se carga dentro de la cara.
        const belt = sstep(0.46, 0.80, tt) * sstep(0.12, 0.34, slope) * sstep(0.34, 0.62, brk);
        if (belt > 0.01) {
          tmp2.copy(cCornice).lerp(cCorniceW, band);
          // BANDAS, no placas: la cinta clara ocupa el tercio alto del banco
          tmp.lerp(tmp2, sstep(0.60, 0.92, seam) * belt * 0.95);
          // junta-sombra DEBAJO de cada cornisa: es la que dibuja la línea
          tmp.multiplyScalar(1 - sstep(0.30, 0.02, seam) * belt * 0.52);
        }
      }
    }
    // ── TIERRA: suelo desnudo donde ralea el pasto (dirtAmount) ─────────────
    // Mezclado DESPUÉS de cornisas (la roca del macizo queda limpia) y sólo
    // donde la ladera es suelo (pendiente tan < 0.6 ≈ 31°): el escarpe pelado
    // es ROCA, no tierra lavada — esa distinción ya la hace el bloque de
    // arriba. El peso lo da `dirtAmount`, que la flora también lee para ralear.
    if (dirt && slopeTan < 0.6) {
      const dirt = dirtAmount(x, z, slopeTan);
      if (dirt > 0.06) {
        const dk = sstep(0.22, 0.75, dirt);
        tmp2.copy(cDirt1).lerp(cDirt2, band);
        tmp.lerp(tmp2, dk * 0.92);
      }
    }
    // el fondo del cañón respira sombra (AO grande del relieve real)
    tmp.multiplyScalar(1 - sstep(2380, 2060, elev) * 0.27);
    cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 });

  // ── ATERRIZAR LA SUPERFICIE: micro-relieve procedural (AUDIT-3D-VALLE) ──────
  // El DEM da la SILUETA real (163k verts) pero la superficie leía PLÁSTICA de
  // cerca: MeshStandardMaterial liso, sin grano. Aquí, vía onBeforeCompile, se
  // le da textura de suelo/roca SIN tocar geometría, draw calls, scatter ni
  // fotos — todo procedural en el fragment:
  //   (1) micro-normal fbm de 2 escalas (grano de suelo + grano fino) que
  //       perturba la normal → quita el look de plástico en lo verde y lo plano.
  //   (2) triplanar-en-pendiente SOLO en el escarpe (slope > ~26°): donde el
  //       terreno empina asoma material rocoso (tinte más áspero + normal más
  //       brava), mezclado por pendiente. En lo plano manda el verde de siempre.
  //       Fiel a lo real: roca DONDE empina (el escarpe del DEM), no inventada.
  mat.onBeforeCompile = (shader) => {
    // world-XZ del fragmento, para muestrear el ruido en coordenadas de terreno
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>',
        '#include <common>\n varying vec3 vTerrWPos;\n varying vec3 vTerrWNor;')
      .replace('#include <worldpos_vertex>',
        '#include <worldpos_vertex>\n' +
        '  vTerrWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\n' +
        '  vTerrWNor = normalize(mat3(modelMatrix) * objectNormal);');

    // fbm value-noise 2D barato (hash → bilineal → octavas). Independiente del
    // fbm JS de arriba; aquí sólo aporta GRANO de superficie, no relieve real.
    // hash isótropo (sin+dot, baja correlación direccional) + fbm con octavas
    // ROTADAS: cada octava gira ~29° para romper la alineación con los ejes,
    // que es lo que producía el chevron/espina-de-pez del gradiente.
    const noiseGLSL = `
      float tHash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
      float tvNoise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        vec2 u = f*f*(3.0-2.0*f);
        float a = tHash(i), b = tHash(i+vec2(1.0,0.0));
        float c = tHash(i+vec2(0.0,1.0)), d = tHash(i+vec2(1.0,1.0));
        return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
      }
      const mat2 tROT = mat2(0.8763, -0.4818, 0.4818, 0.8763); // ~+28.8°
      float tFbm(vec2 p){
        float s=0.0, a=0.5, n=0.0;
        for(int i=0;i<4;i++){ s += a*tvNoise(p); n += a; p = tROT*p*2.03; a *= 0.5; }
        return s/n;
      }`;

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>',
        '#include <common>\n varying vec3 vTerrWPos;\n varying vec3 vTerrWNor;\n' + noiseGLSL)
      // tras <normal_fragment_begin> ya existe `normal` (view-space). La
      // perturbamos con el GRADIENTE del fbm world-space, llevado a view-space
      // con normalMatrix. Dos escalas: grano de suelo (~2.2m) + grano fino (~0.7m).
      .replace('#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
        {
          vec3 gN = normalize(vTerrWNor);
          float slope = clamp(1.0 - gN.y, 0.0, 1.0); // 0 llano … 1 vertical
          // world XZ del suelo; en el escarpe usamos también XY/ZY (triplanar)
          vec2 pS = vTerrWPos.xz / 2.6;   // escala suelo (~2.6 u)
          vec2 pF = vTerrWPos.xz / 0.85;  // escala fina  (~0.85 u)
          float e = 0.12;                 // paso fino del gradiente: evita chevrons
          // gradiente numérico del fbm (dos escalas) sobre el plano del suelo,
          // normalizado por 2*e para que sea una PENDIENTE de ruido, no un salto.
          float ie = 0.5 / e;
          float gx = ((tFbm(pS+vec2(e,0.0)) - tFbm(pS-vec2(e,0.0))) * 0.9
                    + (tFbm(pF+vec2(e,0.0)) - tFbm(pF-vec2(e,0.0))) * 0.5) * ie;
          float gz = ((tFbm(pS+vec2(0.0,e)) - tFbm(pS-vec2(0.0,e))) * 0.9
                    + (tFbm(pF+vec2(0.0,e)) - tFbm(pF-vec2(0.0,e))) * 0.5) * ie;
          // triplanar en el escarpe: proyecciones de pared para que el grano
          // rocoso siga la vertical y no se estire. slope>~0.20 (~26°) asoma;
          // pleno en slope>~0.50 (~60°).
          float scarp = smoothstep(0.20, 0.50, slope);
          vec2 pV = vTerrWPos.xy / 1.7;   // proyección en pared (frente)
          vec2 pW = vTerrWPos.zy / 1.7;   // proyección en pared (lateral)
          float rgx = ((tFbm(pV+vec2(e,0.0)) - tFbm(pV-vec2(e,0.0)))
                     + (tFbm(pW+vec2(e,0.0)) - tFbm(pW-vec2(e,0.0)))) * ie;
          float rgy = ((tFbm(pV+vec2(0.0,e)) - tFbm(pV-vec2(0.0,e)))
                     + (tFbm(pW+vec2(0.0,e)) - tFbm(pW-vec2(0.0,e)))) * ie;
          // el grano rocoso es más áspero que el de suelo, pero AMBOS sutiles.
          float du = gx * 0.10 + rgx * 0.22 * scarp;
          float dv = gz * 0.10 + rgy * 0.22 * scarp;
          // base tangente en VIEW-space perpendicular a normal (sin normalMatrix,
          // que no existe en el fragment shader). up-ref robusto.
          vec3 upRef = abs(normal.y) < 0.98 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
          vec3 tU = normalize(cross(upRef, normal));
          vec3 tV = normalize(cross(normal, tU));
          float amt = 0.7 + 0.5 * scarp; // un poco más de nervio en la roca
          normal = normalize(normal + (tU * du + tV * dv) * amt);
        }`)
      // tinte rocoso + rugosidad extra en el escarpe, mezclado por pendiente.
      // En lo llano diffuseColor queda intacto (verde de siempre por vertex).
      .replace('#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        {
          vec3 gN2 = normalize(vTerrWNor);
          float slope2 = clamp(1.0 - gN2.y, 0.0, 1.0);
          // roca SOLO donde de verdad empina. Con el tono verde-dominante el
          // umbral sube (~32°…~64°) y el crema cálido pasa a gris-crema: el
          // escarpe sigue siendo roca clara de file_158, pero deja de teñir de
          // beige media ladera con niebla encima.
          float scarp2 = smoothstep(${VERDE_TONO ? '0.28, 0.58' : '0.22, 0.55'}, slope2);
          if (scarp2 > 0.001) {
            float mot = tFbm(vTerrWPos.xz*0.55 + vTerrWPos.y*0.15);
            vec3 rockCol = mix(vec3(0.34,0.31,0.27), ${VERDE_TONO ? 'vec3(0.50,0.49,0.46)' : 'vec3(0.55,0.52,0.46)'}, mot);
            diffuseColor.rgb = mix(diffuseColor.rgb, rockCol, scarp2 * ${VERDE_TONO ? '0.40' : '0.48'});
            roughnessFactor = min(1.0, roughnessFactor + scarp2 * 0.03 + mot*0.015);
          }
        }`);
  };

  const mesh = new THREE.Mesh(geo, mat);

  const group = new THREE.Group();
  group.add(mesh);

  // ══════════════════════════════════════════════════════════════════════════
  // ⛔ AQUÍ VIVÍA "LA SEGUNDA MONTAÑA" (`g2`): PlaneGeometry(2800,760) en
  //    z=-1560 con cresta diagonal inventada. BORRADA EN FIRME con la rotación.
  //
  // Ya estaba fichada en la auditoría anterior (mkspur-y-pared.md §10.1 y
  // camara-desde-guatoc.md §2.5) como relieve inventado, y se dejó viva porque
  // en la orientación vieja era INVISIBLE en el encuadre por defecto. Con el
  // valle rotado deja de serlo, y de la peor manera:
  //   · su caja llegaba a y=+824 u = 3889 msnm — 488 m POR ENCIMA del macizo
  //     REAL del frente (3270 msnm) y 619 m por encima del techo del propio
  //     DEM (3401 msnm);
  //   · vivía en z=-1560, o sea DENTRO del macizo real (que sube entre
  //     z=-980 y z=-1600).
  // Es decir: rotado, `g2` volvía a plantar exactamente la "montaña sobre la
  // montaña" que tres rondas se dedicaron a matar. NO LA VUELVAS A CREAR.
  // ══════════════════════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════════════════════
  // ⛔ AQUÍ VIVÍAN LOS ESPOLONES INVENTADOS (`mkSpur`). BORRADOS EN FIRME.
  //
  // Eran dos hombros de primer plano — izquierdo (cx=-520, cz=-470, cresta
  // 520·sstep(-70,-420,x), 3400 copas instanciadas) y derecho (cx=500,
  // cz=-500, 470·sstep(40,440,x), 2900 copas) — que metían dos laderas verdes
  // hacia el centro del cuadro y encajonaban la vista a La Chorrera desde la
  // CÁMARA POR DEFECTO (foto del operador file_162 / file_160).
  //
  // NO SALEN DEL DEM. Probado numéricamente (ops/bitacora/prueba-rotacion-dem.md
  // paso 3 y mkspur-y-pared.md paso 3): donde estaba el hombro izquierdo el DEM
  // real da 2183–2306 msnm — POR DEBAJO del sitio — y el espolón inventaba
  // cresta de 2968–3383 msnm: hasta +700 unidades de relieve falso. En NINGUNA
  // orientación del mapeo aparecen.
  //
  // La verdad de terreno (operador, que vive frente a este cañón, + fotos
  // deck-20260723 + file_158) es LÍNEA DE VISTA DIRECTA: la garganta queda
  // abierta y la profundidad la dan la perspectiva atmosférica y el valor, NO
  // la oclusión con terreno inventado.
  //
  // La función genérica `mkSpur` fue ARRANCADA a propósito, no comentada ni
  // revertida: ya resucitó dos veces (bug3b y 6ced2c5). Si alguien vuelve a
  // "cerrar la V", tiene que escribir el espolón desde cero y explicar de qué
  // dato sale. NO LA VUELVAS A CREAR.
  // ══════════════════════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════════════════════
  // ⛔ AQUÍ VIVÍA EL TELÓN DE FONDO INVENTADO (cordillera a z=-1990, 3.3 km,
  //    lomas redondeadas con corona de roca clara lavada por la bruma).
  //    BORRADO EN FIRME por orden del operador: CERO RELIEVE INVENTADO.
  //
  // Por qué no se reemplaza por "más malla del DEM": NO SE PUEDE con el tile
  // que hay. Medido (probe-horizonte.mjs, ops/bitacora/mkspur-y-pared.md §10):
  //   · guatoc-height.bin = 699x701 px @ 9.4 m/px → ±3281 m desde Guatoc.
  //     El borde del tile hacia el frente cae en z = -1968 u.
  //   · La malla ya llega a z = -2030: YA SE PASA 62 u del tile (va clampeada).
  //     El telón vivía a z=-1990, o sea EXACTAMENTE sobre el vacío de datos.
  //   · Y aunque hubiera más tile, al ESTE real no hay skyline que traer: el
  //     terreno real desciende (2402 msnm a 0.67 km → 2347 a 2.67 km, todo
  //     250-400 m POR DEBAJO de Guatoc). El ángulo del skyline del DEM al
  //     frente es NEGATIVO en toda la franja (-12.3° a -3.5°): el horizonte
  //     real cae por debajo de la línea de ojo. Mirando al este desde Guatoc
  //     NO HAY MONTAÑA. (Rotado 180° sí: +17.5° a 1.33 km — por eso existe la
  //     prueba de rotación.)
  //   El cielo queda limpio a propósito. Es la verdad de este encuadre.
  // ══════════════════════════════════════════════════════════════════════════

  // ── crestas de fondo en silueta (capas Jackson), tras el borde del DEM.
  // ESCALERA DE VALOR correcta (DR perspectiva-atmosferica: brillo −5-15%/km
  // hacia el valor del cielo, tono +frío con la distancia): cada capa más
  // LEJANA es más CLARA y azulada. Antes eran pizarra oscura (0x3a4150) —
  // más oscuras que las capas intermedias = escalera INVERTIDA: el fondo se
  // venía ENCIMA en vez de receder ("montaña sobre montaña"). ──
  const layers = [
    { z: -2450, h: 680, c: 0x8b96ac, o: 1.0 },
    { z: -3050, h: 790, c: 0x9ea8bd, o: 1.0 },
  ];
  for (const L of layers) {
    const pts = [];
    const NB = 90, WW = 5600;
    for (let i = 0; i <= NB; i++) {
      const x = -WW / 2 + (i / NB) * WW;
      const y = L.h * (0.45 + 0.55 * (fbm(x / 900 + L.z, 0.5, 4) * 0.5 + 0.5)) - 120;
      pts.push(new THREE.Vector2(x, y));
    }
    const shape = new THREE.Shape();
    shape.moveTo(-WW / 2, -420);
    for (const p of pts) shape.lineTo(p.x, p.y);
    shape.lineTo(WW / 2, -420);
    const g = new THREE.ShapeGeometry(shape);
    const m = new THREE.MeshBasicMaterial({ color: L.c, fog: true });
    const silh = new THREE.Mesh(g, m);
    silh.position.z = L.z;
    group.add(silh);
  }

  // ── cordón LEJANO al otro lado del cañón del amanecer (la espalda del sitio):
  // el valle cae 1000 m y la otra orilla se ve baja, azul, en bruma ──
  {
    const pts = [];
    const NB = 90, WW = 6200;
    for (let i = 0; i <= NB; i++) {
      const x = -WW / 2 + (i / NB) * WW;
      const y = 400 * (0.35 + 0.65 * (fbm(x / 1100 + 7.7, 0.5, 4) * 0.5 + 0.5)) - 150;
      pts.push(new THREE.Vector2(x, y));
    }
    const shape = new THREE.Shape();
    shape.moveTo(-WW / 2, -760);
    for (const p of pts) shape.lineTo(p.x, p.y);
    shape.lineTo(WW / 2, -760);
    const silh = new THREE.Mesh(new THREE.ShapeGeometry(shape),
      // mismo criterio de escalera: lejano = claro y frío, no pizarra oscura
      new THREE.MeshBasicMaterial({ color: 0x939cb1, fog: true }));
    silh.position.set(0, -60, 1600);
    silh.rotation.y = Math.PI;
    group.add(silh);
  }
  return { group, mesh };
}
