/*
 * entsGradiente.geom — la GEOMETRÍA de los CUATRO ÁRBOLES MAESTROS del
 * gradiente andino, de abajo hacia arriba:
 *
 *   · la CEIBA   (tierra caliente, 0–1.000 m · bosque seco tropical)
 *   · el ROBLE   (templado y frío, 750–3.450 m)
 *   · el ALISO   (frío · bosque altoandino)
 *   · la QUEÑUA  (páramo · el árbol que llega más arriba)
 *
 * ── Por qué los cuatro viven en el MISMO módulo ────────────────────────────
 * Antes eran dos aquí (roble y aliso) y la queñua se traía prestada de su
 * mundo del páramo. Funcionaba… hasta que se pusieron los tres en un mismo
 * retrato: la queñua venía de otra talla y se le notaba en la cara. No era
 * cuestión de retocarle un rasgo; era que la había hecho otra mano.
 *
 * Ahora las cuatro especies pasan por el mismo taller: el mismo campo de
 * rostro, la misma cáscara, los mismos ojos, la misma regla para derivar la
 * escala de la cara del radio del fuste. Lo que cambia por especie es la
 * FORMA, la CORTEZA y la LECCIÓN — nunca la anatomía. Por eso se leen como
 * hermanos: porque literalmente los talló el mismo cincel.
 *
 * (El `EntQuenua` original sigue intacto en `entQuenua.geom.js` +
 * `EntQuenua.jsx`, que es lo que monta el mundo del páramo. De allá se
 * importan el campo del rostro y la barba de usnea, que son patrimonio común.)
 *
 * ── Qué es cierto de cada uno (y no se puede inventar más) ─────────────────
 *
 * ROBLE ANDINO · *Quercus humboldtii* · 750–3.450 msnm
 *   Es el ÚNICO Quercus de Suramérica y cruza el gradiente él solo, del
 *   templado hasta rozar el páramo. Forma robledales densos. Su lección son
 *   las ECTOMICORRIZAS, y tiene cuatro géneros de hongo documentados:
 *   *Cantharellus*, *Lactarius*, *Cenococcum* y *Tomentella*. Los dos primeros
 *   sacan seta visible al pie del árbol — y son los dos que se dibujan; los
 *   otros dos viven solo en el suelo y por eso no tienen cuerpo aquí. Suelos
 *   poco profundos con capa gruesa de humus.
 *
 * ALISO · *Alnus acuminata* · Betulaceae · bosque altoandino
 *   Fabrica su propio nitrógeno. Simbiosis DUAL: la bacteria *Frankia* le arma
 *   NÓDULOS en la raíz que fijan el nitrógeno del aire, MÁS micorrizas endo y
 *   ecto. Recupera suelos degradados: es el árbol que le regala abono al suelo.
 *
 * Nada más. Ni una hoja, ni un fruto, ni un color de especie que no venga de
 * ahí o de la paleta ya aprobada (`floraParamo.geom.js` PAL, que es de donde
 * salen los verdes y las cortezas del roble y del aliso del proyecto).
 *
 * ── Reglas de taller ───────────────────────────────────────────────────────
 * · Todo pasa por `sombreadoVegetal.js`: `fusionarSeguro` es la ÚNICA fusión
 *   (mergeGeometries devuelve NULL EN SILENCIO al mezclar indexadas con
 *   no-indexadas y la pieza no se dibuja: ya mordió tres veces).
 * · El CAMPO DEL ROSTRO no se reinventa: es `campoRostro` del Ent queñua, la
 *   talla que ya pasó revisión. Lo que cambia por especie es la ESCALA de la
 *   cáscara y su relieve, no la anatomía.
 * · Three core puro: corre headless, sin contexto GL.
 */
import * as THREE from 'three';
import {
  rng,
  ruidoFbm,
  fusionarSeguro,
  taperTronco,
  taperLineal,
  poner,
  apuntar,
  pintarPorVertice,
  pintarPlano,
  hornearFollaje,
  matojoNube,
} from './sombreadoVegetal.js';
import { campoRostro, ROSTRO_BOCA_Y } from './entQuenua.geom.js';
import { PAL } from './floraParamo.geom.js';
import { TIERRAS, ACENTOS, CORTEZAS, VERDES, NEUTROS, mezclar } from '../paleta/paletaMadre.js';

/* Fusión canónica del taller. Las copas llevan normales RADIALES (matojoNube):
   sin `preservarNormales` el merge las recalcula y la masa de hojas vuelve a
   leerse como poliedro facetado. */
const fusionar = (partes, etiqueta) => fusionarSeguro(partes, etiqueta, { preservarNormales: true });
/* La madera SÍ quiere normales recalculadas: el facetado es parte del tallado. */
const fusionarDura = (partes, etiqueta) => fusionarSeguro(partes, etiqueta);

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const suave = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/* ══════════════════════════════════════════════════════════════════════════
   PARÁMETROS POR TIER — el mismo contrato tier-safe del resto de la casa
   ══════════════════════════════════════════════════════════════════════════ */
export const PARAMS_TIER = {
  alto: {
    tubular: 96, radial: 14, segRostro: [52, 58], deform: 0.5,
    hojasCopa: 1, ramas: 1, raices: 1, barbaDens: 1,
    materialRico: true, flatShading: true,
  },
  medio: {
    tubular: 60, radial: 10, segRostro: [38, 42], deform: 0.5,
    hojasCopa: 0.7, ramas: 0.8, raices: 0.8, barbaDens: 0.72,
    materialRico: false, flatShading: false,
  },
  bajo: {
    tubular: 36, radial: 7, segRostro: [24, 28], deform: 0.45,
    hojasCopa: 0.42, ramas: 0.6, raices: 0.6, barbaDens: 0.4,
    materialRico: false, flatShading: false,
  },
};

/** Parámetros para un tier (desconocido → 'medio', nunca el más caro). */
export const paramsDeTier = (tier) => PARAMS_TIER[tier] || PARAMS_TIER.medio;

/* ══════════════════════════════════════════════════════════════════════════
   LAS DOS ESPECIES — forma, corteza, hoja y lección
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * @typedef {object} EspecieEnt
 * @property {string} id
 * @property {number} altura          alto del fuste (metros-escena)
 * @property {number} r0              radio del pie
 * @property {number} r1              radio de la punta
 * @property {number} rostroT         a qué altura del fuste (0..1) va la mirada
 * @property {[number,number,number]} rostroEscala  escala del grupo del rostro
 */

/* El ROBLE: macizo, ancho, de corteza gris-parda profundamente fisurada y copa
   en SOMBRILLA (la más ancha del dosel — así lo dibuja ya el roble del páramo).
   El abuelo del gradiente: el que cruza tres pisos él solo. */
const ROBLE = {
  id: 'roble',
  nombre: 'El Ent del roble',
  arbol: 'Roble andino',
  cientifico: 'Quercus humboldtii',
  piso: 'Templado y frío · de 750 a 3.450 m',
  /* fuste: grueso y macizo — es el abuelo del gradiente (solo la ceiba, que
     es de otro mundo térmico, le gana en grosor) */
  altura: 8.2,
  r0: 0.92,
  r1: 0.16,
  raigon: 0.42,
  inclina: 0.05,
  sinuoso: 0.055,
  giro: 0.7,
  semilla: 3,
  /* corteza: fisuras hondas, grano grueso */
  rugosidad: 1.0,
  grano: { surcos: 9.0, fino: 17, bandas: 22, placas: 3.2 },
  corteza: {
    grieta: PAL.robleGrieta,
    cuerpo: PAL.robleTronco,
    cresta: PAL.robleCresta,
    liquen: PAL.liquen,
    hastaLiquen: 1.5,
  },
  /* hoja coriácea verde oscuro */
  hoja: { base: PAL.robleHoja, sol: PAL.robleHoja2, luz: PAL.robleLuz },
  /* rostro: ancho, pesado, de cejas de cornisa. La ESCALA no es a gusto — sale
     de la proporción del rostro del queñual (la talla probada) llevada al
     grosor de este fuste: ver `proporcionesRostro`. */
  rostroT: 0.34,
  rostroEscala: /** @type {[number,number,number]} */ ([1.87, 1.82, 1.43]),
  relieve: 1.55,
  musgoRostro: 0.5,
  /* ramaje y copa */
  ramas: { n: 6, desde: 0.56, hasta: 0.95, largo: 2.35, sube: 1.05, grosor: 0.4 },
  /* La copa se levanta (`alturaExtra`) para dejarle AIRE al rostro: con la
     sombrilla apoyada sobre las cejas, el roble se leía como un arbusto con
     cara. Un Ent necesita fuste visible entre la cara y la copa. */
  copa: { forma: 'domo', radio: 2.6, achatado: 0.6, alturaExtra: 1.15, lobulos: 8, radioLobulo: 1.38 },
  raices: { n: 7, largo: 1.3, r0: 0.36 },
  /* brazos: gruesos, cortos, de peso */
  /* Los hombros van BAJO la frente: puestos en t=0,52 (que es donde los tiene
     el queñual, cuyo rostro es más chico) las ramas-brazo le salían al roble
     por encima de las cejas y se leían como astas, no como brazos. */
  brazos: { tHombro: 0.46, drop: 2.3, abre: 2.05, r0: 0.3 },
  /* el brazo maestro señala las setas del pie */
  senala: { lado: 1, destino: [1.35, 0.16, 0.8], r0: 0.34 },
};

/* El ALISO: esbelto, erguido, de corteza gris clara casi lisa y copa en AGUJA
   (el emergente delgado que pincha el dosel). El más joven de todos: el que
   llega primero al suelo cansado y lo levanta. */
const ALISO = {
  id: 'aliso',
  nombre: 'El Ent del aliso',
  arbol: 'Aliso',
  cientifico: 'Alnus acuminata',
  piso: 'Frío · bosque altoandino',
  altura: 7.9,
  r0: 0.62,
  r1: 0.13,
  raigon: 0.3,
  inclina: 0.035,
  sinuoso: 0.045,
  giro: 2.1,
  semilla: 5,
  /* corteza LISA: el relieve baja a un tercio y el grano se hace fino */
  rugosidad: 0.38,
  grano: { surcos: 6.0, fino: 21, bandas: 30, placas: 1.5 },
  corteza: {
    grieta: PAL.alisoGrieta,
    cuerpo: PAL.alisoTronco,
    cresta: PAL.alisoCresta,
    liquen: PAL.liquen2,
    hastaLiquen: 1.1,
  },
  hoja: { base: PAL.alisoHoja, sol: PAL.alisoHoja2, luz: PAL.alisoLuz },
  /* rostro: angosto y alto, de facciones más limpias (la corteza no se parte) */
  rostroT: 0.35,
  rostroEscala: /** @type {[number,number,number]} */ ([1.24, 1.36, 0.95]),
  relieve: 1.2,
  musgoRostro: 0.22,
  ramas: { n: 5, desde: 0.6, hasta: 0.96, largo: 1.35, sube: 1.5, grosor: 0.3 },
  /* La aguja se arma con lóbulos que TIENEN QUE TRASLAPARSE: con el radio muy
     chico y el eje muy estirado, la copa se leía como una torre de bolas
     sueltas con cielo entre una y otra, no como un solo penacho puntiagudo. */
  copa: { forma: 'aguja', radio: 1.35, achatado: 0.86, alturaExtra: 1.9, lobulos: 8, radioLobulo: 0.92 },
  raices: { n: 6, largo: 1.0, r0: 0.24 },
  /* En un fuste delgado, un brazo grueso se lee como colmillo: el del aliso va
     fino y nace bajo, a la altura del mentón. */
  brazos: { tHombro: 0.47, drop: 2.3, abre: 1.5, r0: 0.155 },
  /* el brazo maestro señala sus propios nódulos, al pie */
  senala: { lado: -1, destino: [-1.5, 0.12, 1.75], r0: 0.24 },
};

/*
 * La QUEÑUA: el guardián del páramo, ahora TALLADO CON LA MISMA MANO.
 *
 * ── Por qué está aquí y no en su casa ──────────────────────────────────────
 * El Ent de la queñua existe desde antes (`EntQuenua.jsx`) y en su mundo del
 * páramo se queda tal cual: allá nadie lo compara con nadie. Pero en esta
 * ladera vive al lado de tres hermanos y ahí sí se notaba: su rostro venía de
 * otra talla —otra escala de cáscara, otros ojos, otro peso de tinta— y en el
 * retrato de los cuatro se leía como un primo lejano metido en la foto
 * familiar. "La cara del de páramo es la más fea y debe parecerse más a los
 * otros", y era cierto.
 *
 * La solución NO fue retocarle la cara a mano hasta que se pareciera: fue
 * hacerlo pasar por el MISMO taller. Al ser una especie más de este módulo,
 * su rostro sale de `mallaRostro` + `proporcionesRostro` + el mismo `<Ojo>`
 * que el roble y el aliso; la escala de su cáscara se DERIVA del radio de su
 * fuste con la misma regla, y por eso los ojos le quedan del mismo tamaño
 * relativo y las cejas con el mismo alero. Son cuatro hermanos porque los talló
 * el mismo cincel, no porque se les hayan copiado los rasgos.
 *
 * ── Lo que NO se le quita ──────────────────────────────────────────────────
 * Sigue siendo la queñua: corteza rojiza que se PELA EN LÁMINAS de papel (la
 * firma de *Polylepis*), musgo de páramo en cejas y pómulos, barba de usnea
 * colgando del mentón y copa chica de hojita plateada. Cambia de quién es la
 * mano que la talló, no quién es el árbol.
 */
const QUENUA = {
  id: 'quenua',
  nombre: 'El Ent de la queñua',
  arbol: 'Queñua o colorado',
  cientifico: 'Polylepis',
  piso: 'Páramo · el árbol que llega más arriba',
  /* fuste corto y grueso: arriba del todo nadie crece alto */
  altura: 6.9,
  r0: 0.86,
  r1: 0.15,
  raigon: 0.46,
  /* el más retorcido de los cuatro: es el que pelea con el viento del páramo */
  inclina: 0.085,
  sinuoso: 0.085,
  giro: 1.35,
  semilla: 7,
  /* corteza: NO se parte en fisuras hondas, se DESPEGA en láminas. Por eso la
     rugosidad es media y las placas son anchas y planas (papel), no surcos. */
  rugosidad: 0.82,
  grano: { surcos: 7.2, fino: 19, bandas: 26, placas: 2.2 },
  corteza: {
    grieta: TIERRAS.cacao,
    cuerpo: CORTEZAS.quenual,
    cresta: CORTEZAS.quenualPapel, // LA firma: la lámina de papel rojiza
    liquen: VERDES.paramoLiquen,
    hastaLiquen: 1.4,
  },
  hoja: { base: VERDES.paramoHoja, sol: VERDES.paramoMusgoClaro, luz: VERDES.paramoPlata },
  /* rostro: derivado de su radio con la regla de la casa (R≈0.74 → [1.82,1.88,
     1.39]) y desviado apenas hacia lo ANCHO: la queñua es el árbol rechoncho
     del páramo y su cara lo dice, pero sigue siendo la misma cara. */
  rostroT: 0.33,
  rostroEscala: /** @type {[number,number,number]} */ ([1.84, 1.80, 1.41]),
  relieve: 1.5,
  musgoRostro: 0.72, // el que más musgo carga: vive en la niebla
  ramas: { n: 6, desde: 0.55, hasta: 0.94, largo: 1.75, sube: 1.15, grosor: 0.38 },
  copa: { forma: 'domo', radio: 2.05, achatado: 0.7, alturaExtra: 0.95, lobulos: 9, radioLobulo: 1.12 },
  raices: { n: 7, largo: 1.15, r0: 0.33 },
  brazos: { tHombro: 0.45, drop: 2.1, abre: 1.85, r0: 0.27 },
  /* su brazo maestro señala el NACIMIENTO DEL AGUA, ladera abajo a su derecha:
     la lección de la queñua no es una cosa que le crece al pie, es lo que sale
     de ella. */
  senala: { lado: 1, destino: [1.95, 0.08, 1.5], r0: 0.3 },
  barba: true, // la cortina de usnea: sin ella no es la queñua
  leccion: 'agua', // la dibuja la ESCENA (niebla → gota → manantial), no el Ent
};

/*
 * La CEIBA: el cuarto Ent, el de la TIERRA CALIENTE.
 *
 * ── Por qué faltaba ────────────────────────────────────────────────────────
 * El gradiente andino colombiano no empieza en el templado. Empieza abajo, en
 * el bosque seco tropical, y sin ese piso la ladera contaba la historia a
 * partir de la mitad.
 *
 * ── Qué es cierto de ella (y nada más) ─────────────────────────────────────
 * CEIBA · *Ceiba pentandra* · 0–1.000 msnm · más de 24 °C
 *   Nativa emblemática del bosque seco tropical colombiano: Caribe (Sucre,
 *   Córdoba, Magdalena, Bolívar, Cesar) e interior (Huila, Tolima, Valle,
 *   Cauca). Su rasgo inconfundible son los CONTRAFUERTES: raíces tablares que
 *   salen del tronco como aletas, tan altas como una persona. Tronco grueso y
 *   gris, a veces con espinas cónicas cuando es joven. Copa abierta en
 *   horizontal, como un parasol gigante.
 *
 * ── Lo que NO se le inventa ────────────────────────────────────────────────
 * NI MICORRIZAS NI SIMBIOSIS. No están verificadas y por eso la ceiba no tiene
 * setas al pie ni nódulos en la raíz: su brazo maestro señala su propio
 * contrafuerte, que es lo único que aquí se puede afirmar. El roble tiene sus
 * hongos y el aliso sus nódulos porque de esos SÍ hay fuente. Dibujamos el
 * árbol, no una lección que todavía no tenemos.
 */
const CEIBA = {
  id: 'ceiba',
  nombre: 'El Ent de la ceiba',
  arbol: 'Ceiba',
  cientifico: 'Ceiba pentandra',
  piso: 'Tierra caliente · de 0 a 1.000 m · bosque seco tropical',
  /* el gigante del gradiente: el más alto y con mucho el más grueso */
  altura: 9.6,
  r0: 1.22,
  r1: 0.2,
  raigon: 0.52,
  /* APLOMADA. La queñua se retuerce y el roble se ladea; la ceiba es un pilar
     —así crece un emergente que tiene que sacar la copa por encima del dosel— y
     esa verticalidad es media silueta. */
  inclina: 0.02,
  sinuoso: 0.028,
  giro: 0.35,
  semilla: 11,
  /* corteza LISA y gris: la ceiba no se parte en placas leñosas */
  rugosidad: 0.42,
  grano: { surcos: 5.2, fino: 15, bandas: 18, placas: 1.2 },
  corteza: {
    grieta: mezclar(TIERRAS.rocaSierra, NEUTROS.tinta, 0.24),
    cuerpo: mezclar(CORTEZAS.aliso, VERDES.calido, 0.17), // gris con dejo verde
    cresta: mezclar(CORTEZAS.yarumo, NEUTROS.cal, 0.3),
    liquen: PAL.liquen2,
    hastaLiquen: 1.6,
  },
  /* hoja de bosque seco: verde oliva amarillento, más claro que el de altura */
  hoja: {
    base: mezclar(VERDES.calido, TIERRAS.mantilloSombra, 0.38),
    sol: VERDES.calidoVivo,
    luz: VERDES.brote,
  },
  /* rostro: la regla de la casa sobre un fuste de radio 1,07 → [2.62,2.72,2.00],
     desviado apenas hacia lo ancho y sereno. Es la cara más grande de los
     cuatro porque es el árbol más grande, no porque sea otra talla. */
  rostroT: 0.32,
  rostroEscala: /** @type {[number,number,number]} */ ([2.55, 2.56, 1.95]),
  relieve: 1.35,
  musgoRostro: 0.16, // en tierra caliente y con estación seca, casi no hay musgo
  /* ramas HORIZONTALES: `sube` bajo y `largo` grande. Ahí está el parasol. */
  ramas: { n: 7, desde: 0.63, hasta: 0.97, largo: 3.4, sube: 0.5, grosor: 0.34 },
  copa: { forma: 'parasol', radio: 4.5, achatado: 0.34, alturaExtra: 0.95, lobulos: 10, radioLobulo: 1.5 },
  raices: { n: 5, largo: 1.5, r0: 0.28 },
  /* LOS CONTRAFUERTES: lo que hace ceiba a una ceiba. SEIS y no siete, ALTOS
     (casi tres metros-escena contra un fuste de 9,6) y DELGADOS: en la primera
     pasada eran siete, más bajos y más gruesos, y de lejos el pie se leía como
     una falda derretida. Una tabla se reconoce por el canto; hay que darle
     altura y quitarle carne para que el canto exista. */
  contrafuertes: { n: 6, largo: 2.9, alto: 2.9, grosor: 0.34 },
  /* las espinas cónicas del tronco: pocas y bajas — un rasgo de juventud que a
     este viejo apenas le queda, pero le queda */
  espinas: { n: 22, desde: 0.05, hasta: 0.4, largo: 0.3, radio: 0.075 },
  brazos: { tHombro: 0.43, drop: 2.9, abre: 2.6, r0: 0.36 },
  /* señala su propio contrafuerte: lo único que de ella se puede afirmar */
  senala: { lado: -1, destino: [-2.15, 0.35, 1.55], r0: 0.4 },
  leccion: 'contrafuerte', // la lección ES el árbol; no hay cosa aparte que montar
};

export const ESPECIES = {
  ceiba: CEIBA, roble: ROBLE, aliso: ALISO, quenua: QUENUA,
};

/* ══════════════════════════════════════════════════════════════════════════
   EL FUSTE — curva, conicidad y corteza
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * La espina del fuste: sube inclinándose y serpenteando apenas. Un árbol viejo
 * peleado con el viento nunca es un eje recto, pero tampoco un zigzag: la
 * desviación crece con la altura y abajo se mantiene aplomado (se lee UN palo).
 */
export function curvaFuste(esp) {
  const r = rng(esp.semilla * 131 + 7);
  const n = 7;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const lean = esp.inclina * esp.altura * t * t;
    const ang = esp.giro + t * Math.PI * 1.15;
    const s = esp.sinuoso * esp.altura * (0.2 + t * 0.8);
    pts.push(new THREE.Vector3(
      Math.cos(esp.giro) * lean + Math.cos(ang) * s * (r() * 0.55 + 0.25),
      esp.altura * t,
      Math.sin(esp.giro) * lean + Math.sin(ang) * s * (r() * 0.55 + 0.25),
    ));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.45);
}

/**
 * Conicidad del fuste: raigón ensanchado al pie (contrafuertes), adelgazamiento
 * potencial hacia la copa, pulsos de nudo y un ENSANCHE DE HOMBROS donde nacen
 * los brazos — eso último es lo que le da al fuste silueta de cuerpo y no de
 * poste tapereado.
 */
export function taperFuste(esp) {
  const base = taperTronco(esp.r0, esp.r1, esp.raigon);
  const tH = esp.brazos.tHombro;
  return (t) => {
    const dh = (t - tH) / 0.12;
    const hombro = esp.r0 * 0.11 * Math.exp(-dh * dh);
    /* PECHO: un engrosamiento suave a la altura del rostro para que la cáscara
       tallada tenga dónde vivir. Sin él, en el aliso (que es delgado) la cara
       quedaba del tamaño de una moneda y no se leía. */
    const dp = (t - esp.rostroT) / 0.16;
    const pecho = esp.r0 * 0.1 * Math.exp(-dp * dp);
    return Math.max(0.02, base(t) + hombro + pecho);
  };
}

/**
 * Relieve de la corteza en (t a lo largo, ang alrededor). Devuelve un factor
 * relativo que multiplica el radio → surcos y placas REALES en la malla, no un
 * normal-map. La amplitud la manda `esp.rugosidad`: el roble se parte en placas
 * hondas, el aliso apenas se raya.
 */
export function relieveCorteza(esp, t, ang) {
  const g = esp.grano;
  const surcos = 0.075 * Math.sin(ang * g.surcos + t * 2.5);
  const fino = 0.035 * Math.sin(ang * g.fino - t * 3);
  const bandas = 0.035 * Math.sin(t * g.bandas + ang * 1.5);
  const nudos = 0.055 * Math.sin(ang * 2 - t * 6.5) * Math.sin(t * Math.PI);
  const placas = 0.085 * Math.tanh(Math.sin(ang * g.placas + Math.sin(t * 5.2) * 1.1 + t * 0.8) * 2.4);
  const placasV = 0.045 * Math.tanh(Math.sin(t * 9 + ang * 0.6 + Math.sin(ang * 2) * 0.8) * 2.2);
  const masAbajo = 1 + (1 - t) * 0.4; // el pie es más rugoso
  return (surcos + fino + bandas + nudos + placas + placasV) * masAbajo * esp.rugosidad;
}

/** Color de corteza para un relieve dado: grieta honda → cuerpo → cresta pelada,
    con el velo de líquen que trepa el pie. */
export function colorCorteza(esp, disp, yMundo, destino = new THREE.Color()) {
  const amp = 0.16 * Math.max(0.35, esp.rugosidad);
  const n = clamp01((disp + amp) / (2 * amp));
  destino.set(esp.corteza.grieta).lerp(new THREE.Color(esp.corteza.cuerpo), Math.min(1, n * 1.7));
  if (n > 0.62) destino.lerp(new THREE.Color(esp.corteza.cresta), (n - 0.62) / 0.38);
  const hasta = esp.corteza.hastaLiquen;
  if (esp.corteza.liquen && yMundo < hasta) {
    const m = ruidoFbm(yMundo * 3.1, disp * 9 + 5, yMundo * 1.7);
    const cuanto = clamp01((hasta - yMundo) / hasta) * clamp01((m - 0.42) / 0.58);
    destino.lerp(new THREE.Color(esp.corteza.liquen), cuanto * 0.6);
  }
  return destino;
}

/**
 * TUBO DE MADERA sobre una curva: conicidad + corteza real + color horneado.
 * Es la pieza con la que se hacen fuste, ramas, brazos y raíces.
 *
 * `bahia` excava el sector FRONTAL a la altura del rostro: el fuste se recoge y
 * calma su corteza ahí para que ningún surco se asome por dentro de las cuencas
 * ni de la boca. Sin la bahía, la cáscara tallada y el tronco se pelean y salen
 * costras atravesando la cara (le pasó al queñual y por eso la bahía existe).
 */
export function tuboMadera(curva, esp, { tubular, radial, taper, semilla = 0, bahia = null, ampl = 1 }) {
  const geo = new THREE.TubeGeometry(curva, tubular, 1, radial, false);
  const pos = geo.attributes.position;
  const nAnillo = radial + 1;

  const centros = [];
  for (let i = 0; i <= tubular; i++) centros.push(curva.getPointAt(i / tubular));

  const colores = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const off = new THREE.Vector3();
  const c = new THREE.Color();

  for (let k = 0; k < pos.count; k++) {
    const anillo = Math.floor(k / nAnillo);
    const j = k % nAnillo;
    const t = anillo / tubular;
    const ang = (j / radial) * Math.PI * 2 + semilla;
    const centro = centros[Math.min(anillo, centros.length - 1)];

    v.fromBufferAttribute(pos, k);
    off.subVectors(v, centro);
    let disp = relieveCorteza(esp, t, ang) * ampl;
    let escBahia = 1;
    if (bahia) {
      const az = Math.atan2(Math.abs(off.x), off.z); // 0 = frente puro (+Z)
      const mAng = 1 - suave(0.75, 1.15, az);
      const mVert = 1 - suave(0.5, 0.85, Math.abs((centro.y - bahia.cy) / bahia.alto + 0.1));
      const m = mAng * mVert;
      disp *= 1 - 0.9 * m;
      escBahia = 1 - 0.34 * m;
    }
    const radio = taper(t) * (1 + disp) * escBahia;
    v.copy(centro).addScaledVector(off, radio);
    pos.setXYZ(k, v.x, v.y, v.z);

    colorCorteza(esp, disp, v.y, c);
    colores[k * 3] = c.r;
    colores[k * 3 + 1] = c.g;
    colores[k * 3 + 2] = c.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/* ══════════════════════════════════════════════════════════════════════════
   RAMAS, BRAZOS Y RAÍCES
   ══════════════════════════════════════════════════════════════════════════ */

/** Ramas del tercio alto: nacen por encima del rostro y trepan a la copa. */
export function specsRamas(esp, n) {
  const r = rng(esp.semilla * 21 + 11);
  const curva = curvaFuste(esp);
  const R = esp.ramas;
  const specs = [];
  const total = Math.max(2, n);
  for (let i = 0; i < total; i++) {
    const tBase = R.desde + ((R.hasta - R.desde) * i) / Math.max(1, total - 1);
    const base = curva.getPointAt(tBase);
    const ang = (i / total) * Math.PI * 2 + r() * 0.7 + esp.giro;
    const largo = R.largo * (0.75 + r() * 0.4) * (1 - tBase * 0.3);
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const sube = R.sube * (0.8 + r() * 0.45);
    const pts = [
      base.clone(),
      base.clone().add(new THREE.Vector3(dx * largo * 0.34, sube * 0.3, dz * largo * 0.34)),
      base.clone().add(new THREE.Vector3(
        dx * largo * 0.7 + (r() - 0.5) * 0.3,
        sube * 0.7,
        dz * largo * 0.7 + (r() - 0.5) * 0.3,
      )),
      base.clone().add(new THREE.Vector3(dx * largo, sube, dz * largo)),
    ];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    specs.push({
      curve,
      r0: Math.max(0.045, taperFuste(esp)(tBase) * R.grosor),
      punta: pts[pts.length - 1].clone(),
      tBase,
    });
  }
  return specs;
}

/**
 * Los BRAZOS del guardián: nacen de los hombros, abren, doblan el codo y CAEN
 * con peso a los lados. Nunca tapan el rostro: lo enmarcan. El segundo brazo es
 * el MAESTRO — baja hasta el suelo y su mano señala la lección de la especie
 * (las setas del roble, los nódulos del aliso).
 */
export function specsBrazos(esp) {
  const curva = curvaFuste(esp);
  const B = esp.brazos;
  const hombro = curva.getPointAt(B.tHombro);
  const lado = -esp.senala.lado; // el brazo que cuelga va del lado contrario

  const colgante = (() => {
    const pts = [
      hombro.clone(),
      hombro.clone().add(new THREE.Vector3(lado * B.abre * 0.4, 0.12, 0.16)),
      hombro.clone().add(new THREE.Vector3(lado * B.abre * 0.72, -B.drop * 0.33, 0.38)),
      hombro.clone().add(new THREE.Vector3(lado * B.abre * 0.95, -B.drop * 0.74, 0.55)),
      hombro.clone().add(new THREE.Vector3(lado * B.abre, -B.drop, 0.64)),
    ];
    return {
      curve: new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.55),
      r0: B.r0,
      muneca: pts[pts.length - 1].clone(),
      lado,
      dedos: 'reposo',
    };
  })();

  const maestro = (() => {
    const S = esp.senala;
    const hom = curva.getPointAt(B.tHombro + 0.03);
    const fin = new THREE.Vector3(S.destino[0], S.destino[1] + 0.95, S.destino[2] - 0.35);
    const pts = [
      hom.clone(),
      hom.clone().lerp(fin, 0.22).add(new THREE.Vector3(S.lado * 0.35, 0.16, 0.3)),
      hom.clone().lerp(fin, 0.55).add(new THREE.Vector3(S.lado * 0.28, 0.02, 0.42)),
      hom.clone().lerp(fin, 0.82).add(new THREE.Vector3(0, -0.08, 0.24)),
      fin,
    ];
    return {
      curve: new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5),
      r0: S.r0,
      muneca: fin.clone(),
      lado: S.lado,
      dedos: 'senala',
      destino: new THREE.Vector3(S.destino[0], S.destino[1], S.destino[2]),
    };
  })();

  return [colgante, maestro];
}

/** Raíces-contrafuerte: nacen altas en el pie, se abren y se HUNDEN. El tramo
    profundo queda bajo tierra: se ve el raigón que agarra, nunca un palo tendido. */
export function specsRaices(esp, n) {
  const r = rng(esp.semilla * 33 + 5);
  const R = esp.raices;
  const specs = [];
  const total = Math.max(3, n);
  for (let i = 0; i < total; i++) {
    const ang = (i / total) * Math.PI * 2 + r() * 0.5;
    const largo = R.largo * (0.8 + r() * 0.45);
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const pts = [
      new THREE.Vector3(dx * 0.22, esp.r0 * 0.85, dz * 0.22),
      new THREE.Vector3(dx * largo * 0.62, 0.16, dz * largo * 0.62),
      new THREE.Vector3(dx * largo, -0.34, dz * largo),
      new THREE.Vector3(dx * largo * 1.04, -0.95 - r() * 0.25, dz * largo * 1.04),
    ];
    specs.push({
      curve: new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5),
      r0: R.r0 * (0.85 + r() * 0.3),
      ang,
      largo,
    });
  }
  return specs;
}

/* ══════════════════════════════════════════════════════════════════════════
   LA COPA — masa de hojas con huecos y silueta mordida
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Los lóbulos de la copa. El ROBLE arma una SOMBRILLA: domo central aplanado y
 * corona de lóbulos que se abren horizontal (hoja agrupada hacia la punta de
 * las ramas). El ALISO arma una AGUJA: columna de lóbulos que se adelgazan
 * hasta una punta fina. Esas dos siluetas son las que ya usa la flora del
 * proyecto para el roble y el aliso, y a treinta metros son lo que los separa.
 */
export function lobulosCopa(esp, puntasRama) {
  const r = rng(esp.semilla * 51 + 3);
  const curva = curvaFuste(esp);
  const cima = curva.getPointAt(1);
  const C = esp.copa;
  const lobs = [];

  if (C.forma === 'aguja') {
    const n = C.lobulos;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1); // 0 base → 1 punta
      const ang = r() * Math.PI * 2;
      const rad = C.radio * (1 - f * 0.9) * (0.35 + r() * 0.6);
      lobs.push({
        c: [cima.x + Math.cos(ang) * rad, cima.y - 1.5 + f * (C.alturaExtra + 1.6) + r() * 0.16, cima.z + Math.sin(ang) * rad],
        radio: C.radioLobulo * (1 - f * 0.45) + r() * 0.1,
      });
    }
    // las puntas de rama sostienen matojos chicos: la aguja no flota sobre nada
    for (const p of puntasRama) {
      lobs.push({ c: [p.x, p.y + 0.16, p.z], radio: C.radioLobulo * (0.5 + r() * 0.2) });
    }
    return lobs;
  }

  if (C.forma === 'parasol') {
    /*
     * EL PARASOL DE LA CEIBA. No es un domo más ancho: es un DISCO.
     *
     * La diferencia está en la altura de los lóbulos, no en el radio: todos
     * viven casi en el mismo plano y el anillo de afuera CAE un poco, así que
     * la silueta es una sombrilla con las alas vencidas. Un domo del mismo
     * radio se leería como una nube gorda; esto se lee, a contraluz y desde
     * lejos, como la copa que da sombra a media vereda.
     */
    const yTop = cima.y + C.alturaExtra;
    const n = C.lobulos;
    lobs.push({ c: [cima.x, yTop - 0.1, cima.z], radio: C.radioLobulo * 1.08 });
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + r() * 0.42;
      const rad = C.radio * (0.4 + r() * 0.26);
      lobs.push({
        c: [cima.x + Math.cos(ang) * rad, yTop - 0.2 + r() * 0.34, cima.z + Math.sin(ang) * rad],
        radio: C.radioLobulo * (0.82 + r() * 0.24),
      });
    }
    // el ala: el anillo de afuera, más bajo y más chico — el parasol se vence
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + 0.31 + r() * 0.4;
      const rad = C.radio * (0.76 + r() * 0.3);
      lobs.push({
        c: [cima.x + Math.cos(ang) * rad, yTop - 0.92 + r() * 0.34, cima.z + Math.sin(ang) * rad],
        radio: C.radioLobulo * (0.54 + r() * 0.26),
      });
    }
    for (const p of puntasRama) {
      lobs.push({ c: [p.x * 1.02, p.y + 0.22, p.z * 1.02], radio: C.radioLobulo * (0.62 + r() * 0.24) });
    }
    return lobs;
  }

  // DOMO ancho (roble, queñua)
  lobs.push({ c: [cima.x, cima.y + C.alturaExtra, cima.z], radio: C.radioLobulo * 1.12 });
  for (const p of puntasRama) {
    lobs.push({ c: [p.x * 1.06, p.y + 0.3, p.z * 1.06], radio: C.radioLobulo * (0.78 + r() * 0.3) });
  }
  const n = C.lobulos;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + r() * 0.55;
    const rad = C.radio * (0.62 + r() * 0.5);
    lobs.push({
      c: [cima.x + Math.cos(ang) * rad, cima.y + C.alturaExtra * (0.2 + r() * 0.6) - 0.35, cima.z + Math.sin(ang) * rad],
      radio: C.radioLobulo * (0.6 + r() * 0.36),
    });
  }
  return lobs;
}

/**
 * La copa entera en UNA geometría: cada lóbulo es una nube de follaje
 * (`matojoNube`, normales radiales = masa suave, no poliedro) con el sombreado
 * horneado por vértice — oclusión hacia el corazón, gradiente de altura y
 * contraluz en la piel. Es lo que separa una copa creíble de una bola de
 * helado, y es gratis en runtime.
 */
export function construirCopa(esp, P, puntasRama) {
  const lobs = lobulosCopa(esp, puntasRama);
  const partes = [];
  let i = 0;
  for (const L of lobs) {
    const radio = L.radio * (P.hojasCopa < 0.6 ? 1.12 : 1); // menos lóbulos → algo más gordos
    const geo = matojoNube(radio, esp.semilla * 17 + i * 7, P.deform);
    poner(geo, L.c);
    hornearFollaje(geo, {
      base: esp.hoja.base,
      sol: esp.hoja.sol,
      luz: esp.hoja.luz,
      centro: L.c,
      radio,
      ao: 0.62,
      manchas: 0.15,
    });
    partes.push(geo);
    i += 1;
  }
  return fusionar(partes, `copa-${esp.id}`);
}

/* ══════════════════════════════════════════════════════════════════════════
   EL ROSTRO — la cáscara tallada sobre la madera
   ══════════════════════════════════════════════════════════════════════════ */

/** Dónde vive el rostro: centro sobre la curva y radio del fuste ahí. */
export function anclaRostro(esp) {
  const curva = curvaFuste(esp);
  const centro = curva.getPointAt(esp.rostroT);
  const radio = taperFuste(esp)(esp.rostroT);
  return { centro, radio, t: esp.rostroT };
}

/*
 * LA REGLA DE LA ESCALA DEL ROSTRO (para el que venga a agregar una cuarta
 * especie y no quiera romper la talla):
 *
 * El ANCHO del rostro en el mundo NO lo decide `rostroEscala`: lo decide el
 * radio del fuste, porque la cáscara abraza el tronco (ancho ≈ 2·R·sen 1.4).
 * `rostroEscala[1]` decide el ALTO. Entonces, para que un Ent nuevo tenga la
 * misma CARA que el queñual —que es la que pasó revisión— y no una careta
 * estirada, las tres escalas se derivan de su radio:
 *
 *   E[0] ≈ 2.45 · R      (cuánto del campo del rostro cubre la cáscara)
 *   E[1] ≈ 1.68 · R/0.661 (el alto, proporcional al ancho)
 *   E[2] ≈ 0.765 · E[0]  (la profundidad, aplanada como en el queñual)
 *
 * donde 0.661 es el radio del fuste del queñual a la altura de su mirada y
 * [1.62, 1.68, 1.24] es su escala. De ahí salen los números del roble y del
 * aliso; desviarse de la proporción es legítimo (el roble tiene la cara más
 * cuadrada, el aliso más larga), inventarla desde cero no.
 */

/**
 * Las proporciones locales del rostro, derivadas del fuste. Los ojos y la boca
 * viven en coordenadas LOCALES del grupo del rostro; si se calcaran los números
 * del queñual, en un fuste más delgado los ojos quedarían FUERA de la cáscara
 * (o enterrados dentro del tronco: el bug de "ojos de calavera").
 * Todo se deriva de `frenteL` = dónde está la superficie de la cáscara.
 */
export function proporcionesRostro(esp) {
  const { radio } = anclaRostro(esp);
  const frenteL = radio / esp.rostroEscala[2]; // z local de la superficie frontal
  return {
    frenteL,
    zOjo: frenteL * 0.6, // el ojo vive HUNDIDO en su cuenca
    zBoca: frenteL * 0.82, // la cavidad tras la boca-grieta
    sepOjo: 0.245, // separación de los ojos (la talla del queñual, probada)
  };
}

/**
 * La CÁSCARA del rostro: una malla paramétrica densa que abraza el fuste (sigue
 * su curva, su conicidad y su corteza) y sobre la que `campoRostro` talla el
 * relieve REAL. El rostro EMERGE de la madera: no es una careta pegada.
 *
 * Devuelve DOS geometrías: `cara` (de la línea de la boca hacia arriba) y
 * `mandibula` (labio inferior + mentón) con el origen en la línea de la boca,
 * para poder pivotarla al hablar.
 */
export function mallaRostro(esp, { segRostro = [48, 54] } = {}) {
  const curva = curvaFuste(esp);
  const taper = taperFuste(esp);
  const centro = curva.getPointAt(esp.rostroT);
  const E = esp.rostroEscala;
  const [segU, segV] = segRostro;
  const angMax = 1.4; // medio-abanico: la cara ocupa buena parte del frente

  const construye = (yMin, yMax, pivotY, filas, wBajo, wAlto) => {
    const cols = segU + 1;
    const rows = filas + 1;
    const pos = new Float32Array(cols * rows * 3);
    const col = new Float32Array(cols * rows * 3);
    const idx = [];
    const c = new THREE.Color();
    const liquen = new THREE.Color(esp.corteza.liquen);
    const cresta = new THREE.Color(esp.corteza.cresta);
    for (let iv = 0; iv < rows; iv++) {
      const vN = iv / filas;
      const y = yMin + (yMax - yMin) * vN;
      const t = Math.max(0.02, Math.min(0.98, esp.rostroT + (y * E[1]) / esp.altura));
      const R = taper(t);
      const pC = curva.getPointAt(t);
      const offX = (pC.x - centro.x) / E[0];
      const offZ = (pC.z - centro.z) / E[2];
      for (let iu = 0; iu < cols; iu++) {
        const uN = iu / segU;
        const ang = (uN * 2 - 1) * angMax;
        const xl = (Math.sin(ang) * R) / E[0];
        const { d, sombra, musgo } = campoRostro(xl, y);
        const m = Math.exp(-((xl / 0.56) ** 2 + ((y + 0.08) / 0.66) ** 2));
        const bark = relieveCorteza(esp, t, ang + 0.6) * (0.35 + 0.65 * (1 - m));
        const eU = suave(0.7, 1, Math.abs(ang) / angMax);
        const eV = Math.max(wAlto * suave(0.78, 1, vN), wBajo * suave(0.78, 1, 1 - vN));
        const borde = Math.max(eU, eV);
        const relieve = d * esp.relieve * m;
        const f = (1 + relieve * (1 - borde) + bark) * (1 - 0.28 * borde);
        const k = (iv * cols + iu) * 3;
        pos[k] = (Math.sin(ang) * R * f) / E[0] + offX;
        pos[k + 1] = y - pivotY;
        pos[k + 2] = (Math.cos(ang) * R * f) / E[2] + offZ;
        colorCorteza(esp, bark + d * 0.9, pC.y, c);
        if (m > 0.2) c.lerp(cresta, m * 0.12);
        if (d > 0.12) c.lerp(cresta, Math.min(0.28, (d - 0.12) * 1.4));
        if (musgo > 0.03) c.lerp(liquen, Math.min(0.55, musgo * esp.musgoRostro) * m);
        c.multiplyScalar(1 - 0.6 * sombra * (1 - borde));
        col[k] = c.r;
        col[k + 1] = c.g;
        col[k + 2] = c.b;
      }
    }
    for (let iv = 0; iv < filas; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * cols + iu;
        const b = a + 1;
        const cc = a + cols;
        const dd = cc + 1;
        idx.push(a, b, cc, b, dd, cc);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  };

  const filasCara = Math.max(8, Math.round(segV * 0.72));
  const filasMand = Math.max(6, segV - filasCara);
  return {
    cara: construye(ROSTRO_BOCA_Y, 0.78, 0, filasCara, 0.18, 1),
    mandibula: construye(-0.98, ROSTRO_BOCA_Y, ROSTRO_BOCA_Y, filasMand, 1, 0.18),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   LAS PIEZAS DEL ÁRBOL COMPLETO
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * La MADERA de un Ent en UNA geometría: fuste (con la bahía del rostro
 * excavada) + ramas + los dos brazos. Un solo draw-call para todo el cuerpo.
 */
export function construirMadera(esp, P) {
  const curva = curvaFuste(esp);
  const taper = taperFuste(esp);
  const partes = [];

  partes.push(tuboMadera(curva, esp, {
    tubular: P.tubular,
    radial: P.radial,
    taper,
    semilla: 0.6,
    bahia: { cy: curva.getPointAt(esp.rostroT).y, alto: esp.altura * 0.26 },
  }));

  const ramas = specsRamas(esp, Math.max(2, Math.round(esp.ramas.n * P.ramas)));
  for (const rama of ramas) {
    partes.push(tuboMadera(rama.curve, esp, {
      tubular: Math.max(14, Math.round(P.tubular * 0.34)),
      radial: Math.max(5, P.radial - 4),
      taper: taperLineal(rama.r0, 0.035),
      semilla: rama.tBase * 10,
      ampl: 0.8,
    }));
  }

  for (const b of specsBrazos(esp)) {
    partes.push(tuboMadera(b.curve, esp, {
      tubular: Math.max(16, Math.round(P.tubular * 0.36)),
      radial: Math.max(5, P.radial - 4),
      taper: taperLineal(b.r0, b.dedos === 'senala' ? 0.09 : 0.075),
      semilla: 2 + b.lado * 1.7,
      ampl: 0.75,
    }));
  }

  // las espinas cónicas del fuste (solo la ceiba las declara)
  partes.push(...geomEspinasCeiba(esp, P));

  return { geo: fusionarDura(partes, `madera-${esp.id}`), ramas, brazos: specsBrazos(esp) };
}

/* ══════════════════════════════════════════════════════════════════════════
   LOS CONTRAFUERTES DE LA CEIBA — raíces TABLARES, no raíces redondas
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * UNA ALETA de contrafuerte.
 *
 * Un contrafuerte de ceiba NO es una raíz gruesa: es una TABLA. Sale del
 * tronco como la aleta de un cohete, arranca alta (a la altura de la cabeza de
 * una persona) y se va acostando hasta morir en el suelo varios metros afuera.
 * Por eso no se puede hacer con `tuboMadera` —un tubo tiene sección redonda y
 * se leería como una pata de elefante—: hay que barrer una superficie.
 *
 * La malla es un manto de dos caras que se juntan en un FILO: el espesor va
 * lleno abajo y se cierra a cero arriba (por eso el lomo de la aleta es un
 * canto y no un tubo aplastado) y también se adelgaza hacia la punta.
 *
 * OJO CON LOS ATRIBUTOS: esta pieza se fusiona con los tubos de la madera, y
 * `TubeGeometry` trae position + normal + uv. Si aquí faltara el `uv`,
 * `fusionarSeguro` trona (y sin él, `mergeGeometries` habría devuelto NULL en
 * silencio y la ceiba se quedaría sin contrafuertes, que es como decir sin
 * ceiba). Por eso el uv se escribe aunque nadie lo lea.
 *
 * @param {object} esp  la especie (para la corteza y su color)
 * @param {{ang:number,largo:number,alto:number,grosor:number,seed:number,q:number}} o
 */
export function finContrafuerte(esp, { ang, largo, alto, grosor, seed, q = 1 }) {
  const nu = Math.max(6, Math.round(14 * q)); // a lo largo, del tronco a la punta
  const nv = Math.max(4, Math.round(9 * q)); // a lo alto, del suelo al filo
  const cols = nu + 1;
  const rows = nv + 1;
  const total = cols * rows * 2;
  const pos = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  const col = new Float32Array(total * 3);
  const idx = [];
  const dx = Math.cos(ang);
  const dz = Math.sin(ang);
  const px = -Math.sin(ang); // el perpendicular: hacia dónde engorda la tabla
  const pz = Math.cos(ang);
  const c = new THREE.Color();

  for (let s = 0; s < 2; s++) {
    const signo = s === 0 ? 1 : -1;
    for (let iv = 0; iv < rows; iv++) {
      const v = iv / nv;
      for (let iu = 0; iu < cols; iu++) {
        const u = iu / nu;
        /* el LOMO: alto pegado al tronco y se acuesta rápido. El exponente
           1.55 es lo que le da la curva cóncava de aleta; con exponente 1 la
           tabla salía triangular y parecía una cuña de carpintería. */
        const h = alto * Math.pow(1 - u, 1.55);
        const y = v * h;
        const d = esp.r0 * 0.7 + u * largo; // distancia al eje del fuste
        /* el ESPESOR: lleno en la base, filo en el lomo (√(1−v²)) y adelgazando
           hacia la punta. Que se cierre a cero en v=1 es lo que hace que las dos
           caras se encuentren solas y la tabla quede cerrada sin tapa. */
        const g = grosor * (1 - 0.7 * u) * Math.sqrt(Math.max(0, 1 - v * v)) * (0.6 + 0.4 * (1 - v));
        const ondu = Math.sin(u * 5.2 + seed) * 0.055 * largo * (1 - v * 0.55);
        const k = (s * rows + iv) * cols + iu;
        pos[k * 3] = dx * d + px * (g * signo + ondu * 0.3);
        pos[k * 3 + 1] = y - 0.18; // se hunde un palmo: nace de la tierra
        pos[k * 3 + 2] = dz * d + pz * (g * signo + ondu * 0.3);
        uv[k * 2] = u;
        uv[k * 2 + 1] = v;
        const disp = (0.45 - v) * 0.13 + Math.sin(u * 9 + v * 4.5 + seed) * 0.05;
        colorCorteza(esp, disp, y, c);
        /* la GARGANTA entre la tabla y el tronco es lo más oscuro que tiene un
           pie de ceiba: sin ese apagón, los contrafuertes se leen pegados con
           colbón en vez de nacidos del árbol. */
        c.multiplyScalar(0.72 + 0.28 * Math.min(1, u * 2.6));
        col[k * 3] = c.r;
        col[k * 3 + 1] = c.g;
        col[k * 3 + 2] = c.b;
      }
    }
  }
  for (let s = 0; s < 2; s++) {
    const base = s * rows * cols;
    for (let iv = 0; iv < nv; iv++) {
      for (let iu = 0; iu < nu; iu++) {
        const a = base + iv * cols + iu;
        const b = a + 1;
        const cc = a + cols;
        const dd = cc + 1;
        // cada cara mira para su lado: si no, una de las dos queda al revés
        if (s === 0) idx.push(a, cc, b, b, cc, dd);
        else idx.push(a, b, cc, b, dd, cc);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** Las ESPINAS CÓNICAS del tronco joven de la ceiba: pocas, bajas y romas.
    Es un rasgo real y basta con insinuarlo — un tronco erizado sería otro
    árbol (y además le quitaría la calma que este guardián tiene que tener). */
export function geomEspinasCeiba(esp, P) {
  const E = esp.espinas;
  if (!E) return [];
  const r = rng(esp.semilla * 71 + 13);
  const curva = curvaFuste(esp);
  const taper = taperFuste(esp);
  const partes = [];
  const cuantas = Math.max(6, Math.round(E.n * P.hojasCopa));
  for (let i = 0; i < cuantas; i++) {
    const t = E.desde + r() * (E.hasta - E.desde);
    const ang = r() * Math.PI * 2;
    const p = curva.getPointAt(t);
    const radio = taper(t);
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const largo = E.largo * (0.65 + r() * 0.6);
    const cono = new THREE.ConeGeometry(E.radio * (0.7 + r() * 0.5), largo, 6);
    /* La espina apunta AFUERA Y ARRIBA, y nace metida en la corteza (0.82 del
       radio) para que no se vea el disco de la base flotando. */
    apuntar(
      cono,
      [p.x + dx * radio * 0.82, p.y, p.z + dz * radio * 0.82],
      [dx, 0.42, dz],
    );
    partes.push(pintarPlano(cono, new THREE.Color(esp.corteza.cresta).multiplyScalar(0.88)));
  }
  return partes;
}

/** Las RAÍCES-contrafuerte en UNA geometría (van fuera del balanceo: agarran).
    Para la ceiba, además de las raíces redondas van las ALETAS TABLARES: es su
    rasgo inconfundible y sin ellas no es una ceiba, es un palo gris. */
export function construirRaices(esp, P) {
  const raices = specsRaices(esp, Math.max(3, Math.round(esp.raices.n * P.raices)));
  const partes = raices.map((rz, i) => tuboMadera(rz.curve, esp, {
    tubular: 16,
    radial: Math.max(5, P.radial - 5),
    taper: taperLineal(rz.r0, 0.05),
    semilla: i,
    ampl: 0.7,
  }));

  if (esp.contrafuertes) {
    const CF = esp.contrafuertes;
    const r = rng(esp.semilla * 97 + 3);
    const n = Math.max(4, Math.round(CF.n * P.raices));
    for (let i = 0; i < n; i++) {
      /* Repartidas alrededor pero NUNCA parejas: siete aletas a exactamente
         51,4 grados leen como turbina. El temblor las vuelve árbol. */
      const ang = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.5 + esp.giro;
      partes.push(finContrafuerte(esp, {
        ang,
        largo: CF.largo * (0.78 + r() * 0.45),
        alto: CF.alto * (0.72 + r() * 0.5),
        grosor: CF.grosor * (0.85 + r() * 0.35),
        seed: i * 3.7,
        q: P.raices,
      }));
    }
  }

  return { geo: fusionarDura(partes, `raices-${esp.id}`), raices };
}

/* ══════════════════════════════════════════════════════════════════════════
   LAS DOS LECCIONES, HECHAS COSA
   ══════════════════════════════════════════════════════════════════════════ */

/* Los colores de las dos setas del roble. Cantharellus es amarillo yema y sale
   del oro del textil andino; Lactarius es anaranjado y se deriva del cobre del
   siete cueros — ningún hex nuevo, todo derivado de la paleta madre. */
const SETAS = {
  cantarelo: new THREE.Color(ACENTOS.guayacan),
  cantareloHondo: new THREE.Color(mezclar(ACENTOS.guayacan, TIERRAS.arcilla, 0.42)),
  cantareloPie: new THREE.Color(mezclar(ACENTOS.maizTextil, TIERRAS.camino, 0.35)),
  lactario: new THREE.Color(CORTEZAS.sieteCuerosClaro),
  lactarioZona: new THREE.Color(mezclar(CORTEZAS.sieteCueros, TIERRAS.arcilla, 0.3)),
  lactarioPie: new THREE.Color(mezclar(CORTEZAS.sieteCuerosClaro, TIERRAS.camino, 0.45)),
};

/**
 * UN CANTARELO (*Cantharellus*): embudo de borde ondulado, amarillo yema, con
 * los pliegues corriendo por fuera hacia el pie. No tiene láminas de cuchillo:
 * tiene arrugas que bajan — por eso el sombrero se dibuja como una trompeta
 * hundida en el centro y no como una sombrilla.
 */
function geomCantarelo(alto, q, seed) {
  const r = rng(seed);
  const partes = [];
  const segR = Math.max(9, Math.round(16 * q));

  // el embudo: perfil de revolución hundido en el centro y abierto en el borde
  const perfil = [];
  const pasos = Math.max(6, Math.round(10 * q));
  for (let i = 0; i <= pasos; i++) {
    const f = i / pasos;
    const rad = alto * (0.06 + f * 0.52);
    const y = alto * (0.62 + Math.pow(f, 1.7) * 0.42 - f * 0.06);
    perfil.push(new THREE.Vector2(Math.max(0.005, rad), y));
  }
  const sombrero = new THREE.LatheGeometry(perfil, segR);
  // borde ondulado: el cantarelo nunca tiene el filo recto
  const pos = sombrero.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const rad = Math.hypot(v.x, v.z);
    const ang = Math.atan2(v.z, v.x);
    const borde = clamp01((rad / (alto * 0.58) - 0.55) / 0.45);
    const onda = Math.sin(ang * 5 + seed) * alto * 0.09 * borde;
    pos.setXYZ(i, v.x, v.y + onda, v.z);
  }
  pos.needsUpdate = true;
  sombrero.computeVertexNormals();
  pintarPorVertice(sombrero, (x, y, z, i, c) => {
    const rad = Math.hypot(x, z) / (alto * 0.58);
    c.copy(SETAS.cantareloHondo).lerp(SETAS.cantarelo, clamp01(rad * 1.25));
    return c;
  });
  partes.push(sombrero);

  // el pie: corto, grueso y del mismo amarillo apagado
  const pie = new THREE.CylinderGeometry(alto * 0.11, alto * 0.16, alto * 0.66, Math.max(6, Math.round(9 * q)));
  poner(pie, [0, alto * 0.33, 0], [0, 0, 0], [1, 1, 1]);
  partes.push(pintarPlano(pie, SETAS.cantareloPie));

  const g = fusionarDura(partes, 'cantarelo');
  // una inclinación mínima: ninguna seta crece a plomo
  poner(g, [0, 0, 0], [(r() - 0.5) * 0.24, r() * Math.PI * 2, (r() - 0.5) * 0.24]);
  return g;
}

/**
 * UN LACTARIO (*Lactarius*): sombrero convexo que se hunde en el centro, con
 * ZONAS CONCÉNTRICAS más oscuras — esa es su firma y por eso el color se pinta
 * por radio, en anillos. Anaranjado.
 */
function geomLactario(alto, q, seed) {
  const r = rng(seed);
  const partes = [];
  const segR = Math.max(9, Math.round(16 * q));

  const perfil = [];
  const pasos = Math.max(6, Math.round(10 * q));
  for (let i = 0; i <= pasos; i++) {
    const f = i / pasos;
    const rad = alto * (0.05 + f * 0.62);
    // convexo con el centro deprimido: sube en el aro medio y baja en el filo
    const y = alto * (0.72 + Math.sin(f * Math.PI * 0.82) * 0.16 - f * 0.14);
    perfil.push(new THREE.Vector2(Math.max(0.005, rad), y));
  }
  const sombrero = new THREE.LatheGeometry(perfil, segR);
  pintarPorVertice(sombrero, (x, y, z, i, c) => {
    const rad = Math.hypot(x, z) / (alto * 0.67);
    const anillo = 0.5 + 0.5 * Math.sin(rad * 13.5 + seed); // las zonas concéntricas
    c.copy(SETAS.lactario).lerp(SETAS.lactarioZona, anillo * 0.55 + (1 - clamp01(rad)) * 0.18);
    return c;
  });
  partes.push(sombrero);

  const pie = new THREE.CylinderGeometry(alto * 0.1, alto * 0.13, alto * 0.72, Math.max(6, Math.round(9 * q)));
  poner(pie, [0, alto * 0.36, 0]);
  partes.push(pintarPlano(pie, SETAS.lactarioPie));

  const g = fusionarDura(partes, 'lactario');
  poner(g, [0, 0, 0], [(r() - 0.5) * 0.2, r() * Math.PI * 2, (r() - 0.5) * 0.2]);
  return g;
}

/**
 * EL CORRO DE SETAS AL PIE DEL ROBLE — la prueba visible del trato.
 *
 * Cuatro géneros de hongo le forran las raíces al roble (Cantharellus,
 * Lactarius, Cenococcum, Tomentella). Solo los DOS primeros sacan cuerpo
 * fructífero a la superficie: son los únicos que se dibujan. Los otros dos
 * trabajan abajo y su lugar es la red del subsuelo, no el suelo del bosque.
 * Cuando el campesino ve estas setas, el trato está andando.
 */
/*
 * SOBRE EL TAMAÑO DE LAS SETAS: un cantarelo real mide ocho centímetros y el
 * roble veinticinco metros. A escala honesta, la lección sería INVISIBLE — un
 * píxel al pie del árbol. Aquí van a media altura de rodilla del Ent, que es la
 * misma licencia con la que el guardián tiene cara: en este mundo lo que hay
 * que entender se dibuja del tamaño en que se entiende. Lo que NO se estira es
 * la BOTÁNICA: la forma de embudo del cantarelo, sus pliegues que bajan por
 * fuera y las zonas concéntricas del lactario son las de verdad.
 */
export function geomSetasDelRoble({ q = 1 } = {}, seed = 909) {
  const r = rng(seed);
  const partes = [];
  const grupos = Math.max(3, Math.round(6 * q));
  for (let i = 0; i < grupos; i++) {
    const cantarelo = i % 2 === 0;
    const ang = r() * Math.PI * 2;
    const rad = 0.5 + r() * 1.3;
    const cx = Math.cos(ang) * rad;
    /* El corro se sesga apenas hacia el frente (para que se vea) pero NO se
       estira hasta el cauce: unas setas creciendo dentro de la quebrada serían
       una mentira botánica y además se verían atravesadas por el agua. */
    const cz = Math.sin(ang) * rad * 0.7 + 0.2;
    const cuantas = cantarelo ? 2 + Math.floor(r() * 2) : 1 + Math.floor(r() * 2);
    for (let k = 0; k < cuantas; k++) {
      const alto = (cantarelo ? 0.62 : 0.54) * (0.78 + r() * 0.5);
      const g = cantarelo
        ? geomCantarelo(alto, q, seed + i * 13 + k)
        : geomLactario(alto, q, seed + i * 13 + k + 7);
      poner(g, [cx + (r() - 0.5) * 0.34, 0, cz + (r() - 0.5) * 0.3]);
      partes.push(g);
    }
  }
  return fusionarDura(partes, 'setas-del-roble');
}

/* Los NÓDULOS de *Frankia*: racimos de lóbulos leñosos pegados a la raíz. Su
   color sale de la tierra roja andina y del ámbar — no son un objeto extraño en
   el suelo, son raíz hinchada.
   OJO CON EL VALOR: derivados hacia la raicilla oscura quedaban casi negros, y
   al pie del árbol (que además está en sombra propia) el racimo se leía como un
   tizón quemado. La fábrica de abono tiene que verse VIVA. */
const NODULO = {
  cuerpo: new THREE.Color(mezclar(TIERRAS.arcilla, ACENTOS.ambar, 0.25)),
  punta: new THREE.Color(mezclar(TIERRAS.camino, ACENTOS.ambar, 0.45)),
};

/**
 * LOS NÓDULOS DE FRANKIA EN LAS RAÍCES DEL ALISO — la fábrica de abono.
 *
 * La bacteria *Frankia* vive dentro de estos bultos y toma el nitrógeno del
 * aire; el aliso le da casa y comida y se queda con el abono. Se dibujan como
 * racimos de coral: muchos lóbulos chicos apiñados sobre la raíz, no una bola
 * lisa (un nódulo actinorrícico real es lobulado y se ramifica con los años).
 *
 * @param {{curve: THREE.Curve, r0: number}[]} raices  las raíces donde prenden.
 */
export function geomNodulosFrankia(raices, { q = 1 } = {}, seed = 515) {
  const r = rng(seed);
  const partes = [];
  const porRaiz = Math.max(1, Math.round(2 * q));
  for (let i = 0; i < raices.length; i++) {
    const rz = raices[i];
    for (let k = 0; k < porRaiz; k++) {
      const t = 0.34 + r() * 0.38; // en el tramo de raíz que aún se ve
      const p = rz.curve.getPointAt(Math.min(0.98, t));
      if (p.y < -0.28) continue; // los muy hondos quedarían enterrados: no se ven
      const esc = 0.13 + r() * 0.07;
      const lobulos = Math.max(3, Math.round(5 * q));
      for (let j = 0; j < lobulos; j++) {
        const a = r() * Math.PI * 2;
        const b = (r() - 0.5) * 1.4;
        const rad = esc * (0.55 + r() * 0.7);
        const lob = new THREE.IcosahedronGeometry(rad, 0);
        poner(
          lob,
          [
            p.x + Math.cos(a) * esc * 1.15,
            p.y + b * esc * 1.2 + esc * 0.4,
            p.z + Math.sin(a) * esc * 1.15,
          ],
          [r(), r(), r()],
          [1, 0.82, 1],
        );
        const cerca = j / lobulos;
        partes.push(pintarPlano(lob, NODULO.cuerpo.clone().lerp(NODULO.punta, cerca * 0.7)));
      }
    }
  }
  if (!partes.length) return null;
  return fusionarDura(partes, 'nodulos-frankia');
}

/* ══════════════════════════════════════════════════════════════════════════
   EL CORTEJO DE LA TIERRA CALIENTE
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * UNA CEIBA CHICA para el rodal del piso caliente.
 *
 * La flora del proyecto (`floraParamo.geom.js`) está toda calibrada de templado
 * para arriba: sembrar frailejones o encenillos en la tierra caliente sería la
 * misma equivocación de piso que ya nos costó los manchones de alquitrán. Y sin
 * NADA alrededor, el Ent de la ceiba se quedaba parado en un potrero pelado.
 *
 * Esta es la pieza mínima que hacía falta: la misma silueta de parasol del
 * guardián, en chiquito y barata (tronco + tres discos de follaje). Repetida
 * ocho veces y con el suelo ocre de la faja caliente, la terraza se lee como
 * bosque seco tropical y no como una terraza a la que se le olvidó la
 * vegetación.
 */
export function geomCeibaChica({ q = 1 } = {}, seed = 401) {
  const r = rng(seed);
  const partes = [];
  const alto = 1.7 + r() * 0.7;
  const rTronco = 0.13 + r() * 0.05;
  const segs = Math.max(5, Math.round(9 * q));

  const tronco = new THREE.CylinderGeometry(rTronco * 0.62, rTronco * 1.5, alto, segs);
  poner(tronco, [0, alto * 0.5, 0]);
  partes.push(pintarPorVertice(tronco, (x, y, z, i, c) => {
    // el pie ensanchado insinúa el contrafuerte sin pagar una malla por él
    const f = clamp01(y / alto);
    c.set(CEIBA.corteza.cuerpo).lerp(new THREE.Color(CEIBA.corteza.cresta), f * 0.55);
    c.multiplyScalar(0.86 + Math.sin(x * 9 + z * 7) * 0.1);
    return c;
  }));

  /* La copa: TRES discos aplanados a alturas casi iguales. Aplanarlos
     (escala Y 0,42) es lo único que separa un parasol de un arbolito de nube. */
  const discos = Math.max(2, Math.round(3 * q));
  for (let i = 0; i < discos; i++) {
    const ang = (i / discos) * Math.PI * 2 + r();
    const rad = (0.42 + r() * 0.36) * (1 + 0.4 * (1 - i / discos));
    const cx = Math.cos(ang) * rad * 0.9;
    const cz = Math.sin(ang) * rad * 0.9;
    const cy = alto + 0.1 + r() * 0.16;
    const radio = 0.62 + r() * 0.3;
    const g = matojoNube(radio, seed + i * 13, 0.44);
    poner(g, [cx, cy, cz], [0, r() * 3, 0], [1.25, 0.42, 1.25]);
    hornearFollaje(g, {
      base: CEIBA.hoja.base,
      sol: CEIBA.hoja.sol,
      luz: CEIBA.hoja.luz,
      centro: [cx, cy, cz],
      radio,
      ao: 0.55,
      manchas: 0.18,
    });
    partes.push(g);
  }
  return fusionar(partes, 'ceiba-chica');
}

/* ══════════════════════════════════════════════════════════════════════════
   LAS LECCIONES EN PALABRAS — español de Colombia, tratando de usted
   ══════════════════════════════════════════════════════════════════════════ */
export const LECCIONES = {
  ceiba: {
    id: 'ceiba',
    boton: 'La ceiba',
    titulo: 'La ceiba se sostiene sola',
    arbol: 'Ceiba · Ceiba pentandra',
    piso: 'Tierra caliente · de 0 a 1.000 metros · más de 24 °C',
    /* OJO, para el que venga a "mejorar" este texto: aquí NO se habla de
       micorrizas ni de ninguna simbiosis de la ceiba. No están verificadas.
       El roble tiene sus cuatro hongos y el aliso su Frankia porque de esos hay
       fuente; de la ceiba tenemos el árbol, y el árbol ya es bastante. */
    texto:
      'Aquí abajo empieza el gradiente: bosque seco tropical, cero a mil metros. '
      + 'La ceiba es el árbol grande de ese piso —Caribe, Huila, Tolima, Valle, '
      + 'Cauca— y usted la reconoce por esas aletas del pie: son los '
      + 'contrafuertes, raíces tablares tan altas como usted, y son las que '
      + 'sostienen semejante árbol donde la raíz no puede ahondar. La copa se '
      + 'abre en horizontal como un parasol: por eso da sombra a media vereda.',
  },
  roble: {
    id: 'roble',
    boton: 'El roble',
    titulo: 'El roble andino y sus cuatro hongos',
    arbol: 'Roble andino · Quercus humboldtii',
    piso: 'Templado y frío · de 750 a 3.450 metros',
    texto:
      'Es el único roble de Suramérica y cruza el gradiente él solo: del templado '
      + 'hasta rozar el páramo, formando robledales cerrados. Bajo su sombra hay un '
      + 'trato firmado: cuatro hongos —Cantharellus, Lactarius, Cenococcum y '
      + 'Tomentella— le forran las raíces y le buscan agua y minerales lejos de '
      + 'donde el árbol alcanza; él les paga con azúcar. Los dos primeros sacan la '
      + 'seta al pie: cuando usted las ve, el trato está andando.',
  },
  aliso: {
    id: 'aliso',
    boton: 'El aliso',
    titulo: 'El aliso fabrica su propio abono',
    arbol: 'Aliso · Alnus acuminata (Betulaceae)',
    piso: 'Frío · bosque altoandino',
    texto:
      'Esta es la lección que más le sirve a usted en la finca. El aliso no espera a '
      + 'que le abonen: en sus raíces la bacteria Frankia arma nódulos que toman el '
      + 'nitrógeno del aire y lo dejan en el suelo. Y encima lleva micorrizas de los '
      + 'dos tipos, endo y ecto. Por eso levanta suelos degradados: donde usted siembra '
      + 'aliso, la tierra queda mejor de lo que estaba.',
  },
  quenua: {
    id: 'quenua',
    boton: 'La queñua',
    titulo: 'La queñua es una fábrica de agua',
    arbol: 'Queñua o colorado · Polylepis',
    piso: 'Páramo',
    texto:
      'Es el árbol que llega más arriba y la que empieza esta historia. MÍRELE LA '
      + 'COPA: la niebla le entra por ahí y no vuelve a salir. La copa y su musgo la '
      + 'peinan, el agua se junta en gotas y escurre por el tronco hasta el pie. Eso '
      + 'que brota a su lado es la misma agua: de ahí sale la quebrada que baja '
      + 'hasta la tierra caliente. Por eso tumbar el páramo se siente cuatro pisos '
      + 'más abajo.',
  },
  juntos: {
    id: 'juntos',
    boton: 'Los cuatro',
    titulo: 'Los cuatro son un solo gradiente',
    arbol: 'El gradiente andino',
    piso: 'Del páramo a la tierra caliente',
    texto:
      'No son cuatro árboles sueltos: son la misma ladera a cuatro alturas. El agua '
      + 'nace en el páramo —la queñua la peina de la niebla— y baja hasta la tierra '
      + 'caliente, donde la ceiba. Por debajo, la red amarra las raíces de todos: '
      + 'mire el turquesa que le forra la punta a cada raíz, y lo que viaja por '
      + 'ellas — baja verde (azúcar) y sube ámbar y azul (mineral y agua). Es un '
      + 'trato, no una tubería. Si le tumban el páramo, la ceiba se entera.',
  },
};

/* Verdes por piso térmico, para teñir la vegetación de cada terraza. Salen del
   eje térmico de la paleta madre: a más altura, menos saturación y más plata. */
export const TINTE_PISO = {
  calido: { base: mezclar(VERDES.calido, TIERRAS.vega, 0.3), sol: VERDES.calidoVivo, luz: VERDES.brote },
  templado: { base: VERDES.monte, sol: VERDES.templado, luz: VERDES.brote },
  frio: { base: mezclar(VERDES.frio, VERDES.paramoNiebla, 0.4), sol: VERDES.frio, luz: VERDES.aliso },
  paramo: { base: VERDES.paramoMusgo, sol: VERDES.paramoLiquen, luz: VERDES.paramoPlata },
};
