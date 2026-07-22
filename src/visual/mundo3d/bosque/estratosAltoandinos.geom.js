/*
 * estratosAltoandinos.geom — LOS DOCE ARQUETIPOS DE FORMA DE CRECIMIENTO del
 * bosque altoandino colombiano, repartidos en sus TRES ESTRATOS verticales.
 *
 * ── Por qué existe este módulo ─────────────────────────────────────────────
 * El catálogo de Chagra tiene 581 especies de flora. Modelarlas una por una es
 * imposible y además innecesario: la botánica andina se deja resumir en un
 * puñado de FORMAS DE CRECIMIENTO. El DR primario (taxonomía de ~12 arquetipos,
 * gemini + glm 2026-06-19) fija esa lista; el DR de diferenciación visual de
 * árboles altoandinos (34.5 KB, gemini + glm) dice CÓMO se distingue cada uno a
 * 30 metros. Con doce siluetas bien dibujadas se puede mostrar el catálogo
 * entero sin modelar 581 mallas.
 *
 * ── La prueba de cada arquetipo ────────────────────────────────────────────
 * Si hay que acercarse para saber qué es, no sirve. Cada forma se diseñó por su
 * SILUETA, no por su detalle:
 *
 *   DOSEL (el techo, 9–17 m)
 *     1. palma-de-cera   columna pelada altísima + penacho apical  (Ceroxylon)
 *     2. encenillo       CONO INVERTIDO: la copa se abre hacia arriba (Weinmannia)
 *     3. cedro           copa muy ancha y aplanada, tronco recto grueso (Cedrela)
 *     4. nogal           bola irregular, ramas en ángulo agudo      (Juglans/Alnus)
 *
 *   SOTOBOSQUE (a media altura, a la sombra, 2–6 m)
 *     5. mano-de-oso     PARASOL abierto de hojas trilobuladas      (Oreopanax)
 *     6. helecho-arboreo VOLANTE: estípite pelado + corona de frondas (Cyathea)
 *     7. chusque         ABANICO de cañas, sin copa                 (Chusquea)
 *     8. arbusto-florecido mata multicaule redonda con flor fucsia  (Tibouchina/Vallea)
 *     9. bejuco-bromelia el hilo VERTICAL: liana + rosetas epífitas  (Araceae/Bromeliaceae)
 *
 *   SUELO (lo rastrero, 0–1.2 m)
 *    10. helecho-suelo   roseta baja de frondas arqueadas
 *    11. hierba-sombra   hoja ancha simple, nervadura pálida
 *    12. cojin-hojarasca cojines de musgo + manto de hoja caída
 *
 * Los otros tres arquetipos de la taxonomía (frailejón-rosetal, cactus y
 * acuática) NO viven dentro de un bosque altoandino cerrado: el frailejón ya
 * está dibujado en `floraParamo.geom.js` (su mundo es el páramo), el cactus
 * pertenece al valle seco interandino y la acuática al borde del agua. Meterlos
 * aquí sería falsear el piso térmico. Cada uno se cita en `ARQUETIPOS_FUERA`.
 *
 * ── Ley de la casa ─────────────────────────────────────────────────────────
 * · Todo pasa por el taller `sombreadoVegetal.js`: `fusionarSeguro` es la ÚNICA
 *   fusión permitida. Nunca `mergeGeometries` a pelo — devuelve NULL en silencio
 *   cuando se mezclan geometrías indexadas (tubo/cono) con no indexadas
 *   (icosaedro) y la planta simplemente no se dibuja. Ese fallo ya costó dos
 *   depuraciones largas en este proyecto y aquí es especialmente peligroso,
 *   porque se instancian cientos de plantas.
 * · Colores SOLO de la paleta madre (`paletaMadre.js`). Ni un hex suelto.
 * · Cada arquetipo se FUSIONA en UNA geometría con color horneado por vértice y
 *   se dibuja con UN InstancedMesh: doce draw-calls para el bosque entero, por
 *   muchas matas que haya.
 * · Aquí no hay WebGL ni React: solo datos y mallas. El componente
 *   `BosqueTresEstratos.jsx` los instancia y les pone la luz de la casa.
 */
import * as THREE from 'three';
import {
  rng,
  fusionarSeguro,
  poner,
  pintarPlano,
  hornearFollaje,
  hornearCorteza,
  tuboOrganico,
  taperLineal,
  taperTronco,
  curvaTronco,
  sembrarFollaje,
  matojoNube,
} from './sombreadoVegetal.js';
import {
  VERDES,
  TIERRAS,
  CORTEZAS,
  ACENTOS,
  NEUTROS,
  mezclar,
} from '../paleta/paletaMadre.js';

/* ══════════════════════════════════════════════════════════════════════════
   1. LOS TRES ESTRATOS — la ley vertical del bosque
   ══════════════════════════════════════════════════════════════════════════
   La luz cae de arriba y se va gastando: el dosel la recibe entera, el
   sotobosque vive de sobras y el suelo casi de nada. Ese gradiente NO es
   decoración — es lo que hace que las tres capas se lean como capas. Por eso
   cada estrato trae su propio par (base, sol) horneado en el color de vértice:
   aunque la luz de la escena sea una sola, el bosque ya viene con sus pisos.
   ══════════════════════════════════════════════════════════════════════════ */

export const ESTRATOS = {
  dosel: {
    id: 'dosel',
    nombre: 'El dosel',
    clave: 'el techo: las copas que reciben el sol de frente y hacen la sombra de todo lo demás',
    rango: [9, 17],
    /* Verde encendido: aquí pega el sol sin filtro. */
    tinte: {
      base: VERDES.paramoNiebla, // copa en penumbra propia
      sol: VERDES.brote, // la cara que da al cielo
      luz: mezclar(VERDES.brote, ACENTOS.maizTextil, 0.32), // contraluz de hoja
    },
  },
  sotobosque: {
    id: 'sotobosque',
    nombre: 'El sotobosque',
    clave: 'lo que crece a media altura, a la sombra: aquí la luz ya llega colada y verde',
    rango: [2, 6],
    /* Verde hondo y húmedo: la luz llegó filtrada por el dosel. */
    tinte: {
      base: mezclar(VERDES.paramoNiebla, NEUTROS.tinta, 0.3),
      sol: VERDES.monte,
      luz: mezclar(VERDES.monte, VERDES.brote, 0.45),
    },
  },
  suelo: {
    id: 'suelo',
    nombre: 'El suelo',
    clave: 'helechos, musgos y hojarasca: la fábrica callada donde el bosque se vuelve tierra otra vez',
    rango: [0, 1.2],
    /* Casi sin sol directo; lo que salva al suelo del negro es el musgo. */
    tinte: {
      base: mezclar(VERDES.paramoMusgo, NEUTROS.tinta, 0.42),
      sol: VERDES.paramoMusgo,
      luz: mezclar(VERDES.paramoMusgo, TIERRAS.mantillo, 0.4),
    },
  },
};

/* Los doce arquetipos, con su respaldo. `canonico` apunta a la clase de la
   taxonomía del DR primario; `silueta` es la prueba de lectura a distancia. */
export const ARQUETIPOS = [
  {
    id: 'palma-de-cera',
    estrato: 'dosel',
    canonico: 'palma',
    nombre: 'Palma de cera',
    cientifico: 'Ceroxylon quindiuense',
    silueta: 'Una columna pelada larguísima con un penacho arriba. Es lo más alto del bosque y no se confunde con nada.',
  },
  {
    id: 'encenillo',
    estrato: 'dosel',
    canonico: 'arbol-andino',
    nombre: 'Encenillo',
    cientifico: 'Weinmannia tomentosa',
    silueta: 'Cono INVERTIDO: la copa se abre hacia arriba en una sola capa, sobre ramas delgadas y empinadas.',
  },
  {
    id: 'cedro',
    estrato: 'dosel',
    canonico: 'arbol-andino',
    nombre: 'Cedro de altura',
    cientifico: 'Cedrela montana',
    silueta: 'Tronco recto y grueso rematado en una copa muy ancha y aplanada, cargada de epífitas.',
  },
  {
    id: 'nogal',
    estrato: 'dosel',
    canonico: 'arbol-andino',
    nombre: 'Nogal',
    cientifico: 'Juglans neotropica',
    silueta: 'Bola irregular y amplia sobre ramas que salen en ángulo cerrado. La copa más maciza del dosel.',
  },
  {
    id: 'mano-de-oso',
    estrato: 'sotobosque',
    canonico: 'arbol-andino',
    nombre: 'Mano de oso',
    cientifico: 'Oreopanax bogotensis',
    silueta: 'Parasol abierto: pocas hojas grandes de tres lóbulos —la garra del oso— y el envés dorado.',
  },
  {
    id: 'helecho-arboreo',
    estrato: 'sotobosque',
    canonico: 'helecho-arboreo',
    nombre: 'Helecho arbóreo',
    cientifico: 'Cyathea caracasana',
    silueta: 'Un volante: estípite pelado y corona de frondas que se arquean, con el báculo enrollado en el centro.',
  },
  {
    id: 'chusque',
    estrato: 'sotobosque',
    canonico: 'pasto',
    nombre: 'Chusque',
    cientifico: 'Chusquea scandens',
    silueta: 'Abanico de cañas finas que sale de una sola mata. No tiene copa: es una masa rayada.',
  },
  {
    id: 'arbusto-florecido',
    estrato: 'sotobosque',
    canonico: 'arbusto',
    nombre: 'Arbusto florecido',
    cientifico: 'Tibouchina lepidota / Vallea stipularis',
    silueta: 'Mata redonda de varios tallos desde el suelo, salpicada de flor fucsia. La única mancha de color del sotobosque.',
  },
  {
    id: 'bejuco-bromelia',
    estrato: 'sotobosque',
    canonico: 'enredadera + bromelia-epifita',
    nombre: 'Bejuco con bromelias',
    cientifico: 'Anthurium spp. / Tillandsia spp.',
    silueta: 'El hilo vertical: una liana que sube en arco cargando rosetas. Es lo que cose los tres estratos.',
  },
  {
    id: 'helecho-suelo',
    estrato: 'suelo',
    canonico: 'hierba',
    nombre: 'Helecho de suelo',
    cientifico: 'Blechnum spp.',
    silueta: 'Roseta baja y abierta de frondas arqueadas, al ras de la hojarasca.',
  },
  {
    id: 'hierba-sombra',
    estrato: 'suelo',
    canonico: 'hierba',
    nombre: 'Hierba de sombra',
    cientifico: 'Anthurium / Chusquea juvenil',
    silueta: 'Hojas anchas y enteras que se abren en abanico bajo, con la nervadura pálida marcada.',
  },
  {
    id: 'cojin-hojarasca',
    estrato: 'suelo',
    canonico: 'hierba',
    nombre: 'Cojín de musgo y hojarasca',
    cientifico: 'Sphagnum spp. + manto de hoja caída',
    silueta: 'Cojines redondos pegados al piso, entre hojas caídas. Es el piso del bosque, no un adorno.',
  },
];

/* Los tres arquetipos de la taxonomía que NO se dibujan aquí, y dónde viven.
   Se declaran para que quede constancia de que la lista está completa y de que
   la ausencia es una decisión botánica, no un olvido. */
export const ARQUETIPOS_FUERA = [
  { canonico: 'frailejon-rosetal', motivo: 'es la firma del páramo, no del bosque cerrado', vive: 'floraParamo.geom.js' },
  { canonico: 'cactus', motivo: 'valle seco interandino: no hay cactus bajo un dosel de niebla', vive: 'pendiente (mundo del valle seco)' },
  { canonico: 'acuatica', motivo: 'vive en el cuerpo de agua, no en el suelo del bosque', vive: 'mundo del agua / arroyo' },
];

export const arquetiposDe = (estrato) => ARQUETIPOS.filter((a) => a.estrato === estrato);

/* ══════════════════════════════════════════════════════════════════════════
   2. EL SUELO — la cota sobre la que se posa todo
   ══════════════════════════════════════════════════════════════════════════ */

/* El claro está en una loma que SUBE hacia donde se para el observador: desde
   ahí se mira un poco hacia abajo y la vista entra por debajo del dosel, entre
   los fustes. Parado al mismo nivel, uno solo ve troncos. */
export function alturaSuelo(x, z) {
  return (
    Math.sin(x * 0.14) * 0.55
    + Math.cos(z * 0.11 + 0.7) * 0.42
    + Math.sin((x + z) * 0.07) * 0.3
    + Math.max(0, z - 2) * 0.07
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   3. HERRAMIENTAS DE DIBUJO — las piezas de las que están hechas las plantas
   ══════════════════════════════════════════════════════════════════════════
   Rubber-hose: nada de cilindros de catálogo ni conos de librería a la vista.
   Todo lo que se ve es hoja gorda, tallo de manguera y curva con squash.
   ══════════════════════════════════════════════════════════════════════════ */

/* Una HOJA: cuerpo achatado con la base en el origen, para pivotar desde donde
   se ancla al tallo. Icosaedro escalado = 20 caras, chunky y barato. */
function hojaBlanda(largo, ancho, grosor = 0.22) {
  const g = new THREE.IcosahedronGeometry(0.5, 0);
  g.scale(ancho, largo, ancho * grosor);
  g.translate(0, largo * 0.5, 0);
  return g;
}

/* Una hoja LOBULADA de tres dedos — la "mano de oso". Tres hojas blandas que
   salen del mismo punto abriéndose: la garra se lee desde lejos. */
function hojaTrilobulada(largo, ancho) {
  const dedos = [];
  for (let k = -1; k <= 1; k++) {
    const l = k === 0 ? largo : largo * 0.82;
    const h = hojaBlanda(l, ancho * 0.5);
    poner(h, [0, 0, 0], [0, 0, -k * 0.62]);
    dedos.push(h);
  }
  return dedos;
}

/* Un TALLO de manguera: curva libre, taper y arruga. La base es la unidad de
   todo lo leñoso de este módulo. */
function tallo(pts, r0, r1, { tubular = 10, radial = 6, arruga = 0.1, semilla = 1 } = {}) {
  const curva = new THREE.CatmullRomCurve3(
    pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    false,
    'catmullrom',
    0.5,
  );
  return tuboOrganico(curva, {
    tubular, radial, taper: taperLineal(r0, r1), arruga, semilla, minRadio: 0.012,
  });
}

/*
 * Una FRONDA pinnada: raquis arqueado + folíolos a lado y lado, decrecientes
 * hacia la punta. Es la pieza que construye la palma, el helecho arbóreo y el
 * helecho de suelo — tres siluetas muy distintas hechas del mismo gesto,
 * cambiando arqueo, largo y cuántas hay.
 *
 * @returns {THREE.BufferGeometry[]} partes SIN pintar (las pinta el llamador).
 */
function fronda({ largo, ancho, pares, arqueo = 0.55, caida = 0.35, semilla = 1, grosorRaquis = 0.035 }) {
  const r = rng(semilla);
  const partes = [];
  /* El raquis: sale casi horizontal y se va cayendo — el arco es lo que hace
     que una palma se vea palma y no una escoba. */
  const pts = [];
  const n = 4;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([
      0,
      arqueo * largo * Math.sin(t * 1.15) - caida * largo * t * t,
      largo * t,
    ]);
  }
  partes.push(tallo(pts, grosorRaquis * largo, grosorRaquis * largo * 0.28, {
    tubular: 9, radial: 5, arruga: 0.05, semilla,
  }));

  /* Los folíolos: pares opuestos a lo largo del raquis. El de la punta es corto
     y el del medio es el más largo → la fronda tiene cintura, no es un rectángulo. */
  for (let i = 1; i <= pares; i++) {
    const t = i / (pares + 0.6);
    const y = arqueo * largo * Math.sin(t * 1.15) - caida * largo * t * t;
    const z = largo * t;
    /* Campana: corto en la base, largo al medio, corto en la punta. */
    const perfil = Math.sin(Math.min(1, t * 1.08) * Math.PI) * 0.72 + 0.28;
    const l = ancho * perfil * (0.86 + r() * 0.28);
    for (const lado of [-1, 1]) {
      const h = hojaBlanda(l, l * 0.3);
      /* Cae hacia afuera y hacia atrás: el folíolo cuelga, no está tieso. */
      poner(h, [0, 0, 0], [0, 0, lado * (1.02 + t * 0.3)]);
      poner(h, [0, y, z], [-0.34 - t * 0.3, 0, 0]);
      partes.push(h);
    }
  }
  return partes;
}

/*
 * El BÁCULO: la fronda joven todavía enrollada del helecho. Una espiral que se
 * cierra sobre sí misma. Es puro rubber-hose y es EL detalle que dice "helecho"
 * aunque el resto de la planta esté en sombra.
 */
function baculo(alto, semilla = 1) {
  const pts = [];
  const vueltas = 1.75;
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    /* Sube recto y arriba se enrosca cerrando el radio. */
    const enrolle = Math.max(0, (t - 0.45) / 0.55);
    const ang = enrolle * Math.PI * 2 * vueltas;
    const rad = alto * 0.19 * (1 - enrolle * 0.82);
    pts.push([
      Math.sin(ang) * rad,
      alto * (0.5 + t * 0.5) - Math.cos(ang) * rad * 0.9 + rad * 0.9,
      Math.cos(ang) * rad * 0.28,
    ]);
  }
  return tallo(pts, alto * 0.055, alto * 0.018, { tubular: 22, radial: 5, arruga: 0.06, semilla });
}

/* Copa sembrada dentro de un CONO (invertido si rBase < rTope) — el molde de la
   copa del encenillo, que es su rasgo inconfundible a 30 metros. */
function sembrarCono({ base, alto, rBase, rTope, n, semilla = 1, distMin = 0.5 }) {
  const r = rng(semilla);
  const puntos = [];
  const intentos = n * 16;
  for (let i = 0; i < intentos && puntos.length < n; i++) {
    const t = Math.pow(r(), 0.62); // sesgo hacia arriba: la copa carga en el tope
    const radio = rBase + (rTope - rBase) * t;
    const ang = r() * Math.PI * 2;
    const rr = radio * Math.sqrt(r());
    const p = [
      base[0] + Math.cos(ang) * rr,
      base[1] + alto * t,
      base[2] + Math.sin(ang) * rr,
    ];
    let choca = false;
    for (let k = 0; k < puntos.length; k++) {
      const q = puntos[k].pos;
      if ((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2 < distMin * distMin) {
        choca = true;
        break;
      }
    }
    if (choca) continue;
    puntos.push({ pos: p, esc: 0.66 + r() * 0.5 });
  }
  return puntos;
}

/* Pinta un cúmulo de copa con el tinte del estrato. Azúcar para no repetir el
   objeto de `hornearFollaje` doce veces. */
function pintarCopa(geo, estrato, { centro, radio, yMin, yMax, ao = 0.6, manchas = 0.12, tinte }) {
  const t = tinte || ESTRATOS[estrato].tinte;
  return hornearFollaje(geo, {
    base: t.base, sol: t.sol, luz: t.luz, centro, radio, yMin, yMax, ao, manchas,
  });
}

/* Una rama de manguera que sale del tronco a la altura `y`, con `az` de azimut. */
function rama({ y, az, largo, alzada, r0, curva = 0.35, semilla = 1 }) {
  const dx = Math.cos(az);
  const dz = Math.sin(az);
  const pts = [];
  const n = 4;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([
      dx * largo * t,
      y + alzada * largo * t + curva * largo * t * t,
      dz * largo * t,
    ]);
  }
  return tallo(pts, r0, r0 * 0.3, { tubular: 8, radial: 5, arruga: 0.14, semilla });
}

/* Una roseta de BROMELIA: hojas rígidas que radian de un punto y forman la copa
   que junta el agua. Va sobre ramas y troncos: es lo que dice "bosque de niebla". */
function bromelia(radio, semilla = 1) {
  const r = rng(semilla);
  const partes = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + r() * 0.3;
    const abre = 0.62 + r() * 0.5;
    const h = hojaBlanda(radio * (1.5 + r() * 0.5), radio * 0.36);
    poner(h, [0, 0, 0], [abre, 0, 0]);
    poner(h, [0, 0, 0], [0, ang, 0]);
    partes.push(h);
  }
  return partes;
}

/* ══════════════════════════════════════════════════════════════════════════
   4. ESTRATO DOSEL — el techo del bosque
   ══════════════════════════════════════════════════════════════════════════ */

/*
 * 1. PALMA DE CERA (Ceroxylon quindiuense) — el emergente.
 *
 * La palma más alta del mundo, y crece hasta los 3.000 m: es el arquetipo
 * `palma` de la taxonomía y, en el bosque altoandino colombiano, es también el
 * hito del paisaje. Su silueta es un regalo para el dibujo: una COLUMNA pelada
 * clarísima, anillada, que sube muy por encima del dosel y remata en un penacho
 * apical. A 200 metros ya se sabe qué es.
 */
export function geomPalmaDeCera({ q = 1 } = {}, seed = 101) {
  const r = rng(seed);
  const partes = [];
  /* Muy por encima del dosel: si no sobresale, deja de ser emergente y se
     confunde con un árbol más. La distancia entre su penacho y el techo del
     bosque es el rasgo, no la altura en sí. */
  const alto = 18.6;

  /* El estípite: apenas curvado, cerúleo pálido, con los anillos de las hojas
     que se cayeron. Nada de cilindro perfecto — se mece. */
  const curva = curvaTronco({ altura: alto, inclina: 0.035, sinuoso: 0.028, giro: r() * 6 }, seed);
  const col = tuboOrganico(curva, {
    tubular: Math.max(12, Math.round(22 * q)),
    radial: Math.max(6, Math.round(9 * q)),
    taper: taperTronco(0.36, 0.24, 0.55),
    arruga: 0.05,
    semilla: seed,
  });
  hornearCorteza(col, {
    grieta: mezclar(CORTEZAS.yarumo, NEUTROS.tinta, 0.45),
    cuerpo: CORTEZAS.yarumo, // el tronco pálido anillado ya está en la paleta
    cresta: mezclar(CORTEZAS.yarumo, NEUTROS.hueso, 0.35),
    liquen: VERDES.paramoMusgo,
    escalaGrano: 2.2,
    hastaLiquen: 2.4,
  });
  partes.push(col);

  /* Los anillos: discos delgados que marcan dónde estuvo cada hoja. Es el rasgo
     que separa una palma de un poste. */
  const nAnillos = Math.max(5, Math.round(11 * q));
  for (let i = 0; i < nAnillos; i++) {
    const t = 0.16 + (i / nAnillos) * 0.74;
    const p = curva.getPointAt(t);
    const anillo = new THREE.TorusGeometry(0.3, 0.035, 4, Math.max(6, Math.round(10 * q)));
    poner(anillo, [p.x, p.y, p.z], [Math.PI / 2, 0, 0]);
    pintarPlano(anillo, mezclar(CORTEZAS.yarumo, NEUTROS.tinta, 0.5));
    partes.push(anillo);
  }

  /* El penacho: frondas que salen del ápice, unas alzadas y otras ya vencidas.
     La mezcla de alturas es lo que le da vida — una corona pareja se ve de plástico. */
  const cima = curva.getPointAt(1);
  const nFrondas = Math.max(7, Math.round(11 * q));
  const tinteFronda = { base: VERDES.frio, sol: VERDES.aliso, luz: ESTRATOS.dosel.tinte.luz };
  for (let i = 0; i < nFrondas; i++) {
    const ang = (i / nFrondas) * Math.PI * 2 + r() * 0.4;
    /* Las de arriba jóvenes y alzadas; las de abajo viejas y colgando. */
    const vieja = i / nFrondas;
    const alza = 0.9 - vieja * 1.5;
    const trozos = fronda({
      largo: 3.3 + r() * 0.7,
      ancho: 0.66,
      pares: Math.max(5, Math.round(9 * q)),
      arqueo: 0.34,
      caida: 0.42 + vieja * 0.3,
      semilla: seed + i,
    });
    for (const t of trozos) {
      poner(t, [0, 0, 0], [alza * 0.45 - 0.35, 0, 0]);
      poner(t, [cima.x, cima.y - 0.12, cima.z], [0, ang, 0]);
      pintarCopa(t, 'dosel', {
        centro: [cima.x, cima.y, cima.z], radio: 3.4, yMin: cima.y - 2, yMax: cima.y + 1,
        ao: 0.32, manchas: 0.1, tinte: tinteFronda,
      });
      partes.push(t);
    }
  }

  return fusionarSeguro(partes, 'palma-de-cera', { preservarNormales: true });
}

/*
 * 2. ENCENILLO (Weinmannia tomentosa) — el árbol de niebla, y la silueta más
 * rara y más útil del dosel altoandino.
 *
 * El DR es tajante: la copa tiene forma de PIRÁMIDE INVERTIDA, con el follaje
 * concentrado en UNA sola capa superior, sobre ramas sinuosas, empinadas,
 * delgadas y oscuras. Ese cono al revés es lo que lo distingue del gaque y de
 * todo lo demás a 30 metros. Corteza rojiza (ya está en la paleta) y el toque
 * de espiga color caramelo cuando fructifica.
 */
export function geomEncenillo({ q = 1 } = {}, seed = 202) {
  const r = rng(seed);
  const partes = [];
  const alto = 9.2;

  const curva = curvaTronco({ altura: alto * 0.62, inclina: 0.08, sinuoso: 0.1, giro: r() * 6 }, seed);
  const tronco = tuboOrganico(curva, {
    tubular: Math.max(9, Math.round(16 * q)),
    radial: Math.max(6, Math.round(8 * q)),
    taper: taperTronco(0.34, 0.13, 0.45),
    arruga: 0.16,
    semilla: seed,
  });
  hornearCorteza(tronco, {
    grieta: mezclar(CORTEZAS.encenillo, NEUTROS.tinta, 0.5),
    cuerpo: CORTEZAS.encenillo, // «corteza rojiza del árbol de niebla»
    cresta: mezclar(CORTEZAS.encenillo, TIERRAS.arcilla, 0.4),
    liquen: VERDES.paramoMusgo,
    escalaGrano: 5.5,
    hastaLiquen: 2.2,
  });
  partes.push(tronco);

  /* Las ramas: EMPINADAS y delgadas, saliendo del tercio alto y abriéndose poco.
     Son las que sostienen el cono invertido; si salieran horizontales, la copa
     se leería como sombrilla y perderíamos la especie. */
  const cuello = curva.getPointAt(1);
  const nRamas = Math.max(4, Math.round(7 * q));
  for (let i = 0; i < nRamas; i++) {
    const az = (i / nRamas) * Math.PI * 2 + r() * 0.5;
    const g = rama({
      y: cuello.y - 0.5 + r() * 0.4,
      az,
      largo: 1.5 + r() * 0.9,
      alzada: 1.35, // casi vertical: la firma del encenillo
      r0: 0.075,
      curva: 0.5,
      semilla: seed + i,
    });
    poner(g, [cuello.x, 0, cuello.z]);
    hornearCorteza(g, {
      grieta: mezclar(CORTEZAS.encenillo, NEUTROS.tinta, 0.62),
      cuerpo: mezclar(CORTEZAS.encenillo, NEUTROS.tinta, 0.3),
      escalaGrano: 7,
    });
    partes.push(g);
  }

  /* LA COPA: cono invertido — angosta abajo, ancha arriba, y aplanada por el
     tope como una sola capa de follaje. */
  const yCopa = cuello.y + 0.9;
  const cumulos = sembrarCono({
    base: [cuello.x, yCopa, cuello.z],
    /* Cono BAJO y MUY abierto: el encenillo carga su follaje en una sola capa
       arriba. Cuanto más plano el cono y más marcada la diferencia entre pie y
       tope, más se lee la pirámide invertida contra el cielo. */
    alto: 2.5,
    rBase: 0.5,
    rTope: 3.6,
    n: Math.max(14, Math.round(32 * q)),
    semilla: seed,
    distMin: 0.62,
  });
  for (let i = 0; i < cumulos.length; i++) {
    const c = cumulos[i];
    const m = matojoNube(0.82 * c.esc, seed + i * 7, 0.46);
    m.scale(1, 0.68, 1); // achata: una capa, no una nube esférica
    poner(m, c.pos);
    pintarCopa(m, 'dosel', {
      centro: [cuello.x, yCopa + 2.4, cuello.z], radio: 3.4,
      yMin: yCopa, yMax: yCopa + 3.3, ao: 0.66, manchas: 0.14,
    });
    partes.push(m);
  }

  /* Las espigas: cuando fructifica se pone color caramelo. Una cucharada, no
     una capa — el acento está para que la copa no se lea plana. */
  const nEspigas = Math.max(3, Math.round(9 * q));
  for (let i = 0; i < nEspigas; i++) {
    const c = cumulos[Math.floor(r() * cumulos.length)];
    if (!c) break;
    const e = hojaBlanda(0.42, 0.12);
    poner(e, [c.pos[0] + (r() - 0.5) * 0.5, c.pos[1] + 0.4, c.pos[2] + (r() - 0.5) * 0.5], [r() * 0.4, 0, (r() - 0.5) * 0.6]);
    pintarPlano(e, mezclar(TIERRAS.arcilla, ACENTOS.ambar, 0.35));
    partes.push(e);
  }

  return fusionarSeguro(partes, 'encenillo', { preservarNormales: true });
}

/*
 * 3. CEDRO DE ALTURA (Cedrela montana) — el gigante de copa ancha.
 *
 * Tronco recto y grueso; copa MUY AMPLIA y densa, más ancha que alta. El DR
 * anota que sus ramas suelen cargar bromeliáceas, helechos y orquídeas: esa
 * carga de epífitas se dibuja, porque es lo que convierte un árbol en un
 * ecosistema y explica de un vistazo el arquetipo bromelia-epífita.
 */
export function geomCedro({ q = 1 } = {}, seed = 303) {
  const r = rng(seed);
  const partes = [];
  const alto = 11.6;

  const curva = curvaTronco({ altura: alto * 0.66, inclina: 0.04, sinuoso: 0.06, giro: r() * 6 }, seed);
  const tronco = tuboOrganico(curva, {
    tubular: Math.max(10, Math.round(18 * q)),
    radial: Math.max(7, Math.round(10 * q)),
    taper: taperTronco(0.52, 0.2, 0.6),
    arruga: 0.2, // corteza escamosa: relieve marcado
    semilla: seed,
  });
  hornearCorteza(tronco, {
    grieta: mezclar(CORTEZAS.roble, NEUTROS.tinta, 0.55),
    cuerpo: CORTEZAS.roble,
    cresta: mezclar(CORTEZAS.roble, TIERRAS.camino, 0.4),
    liquen: VERDES.paramoMusgo,
    escalaGrano: 4.4,
    hastaLiquen: 3.2,
  });
  partes.push(tronco);

  /* Ramas gruesas y HORIZONTALES: lo contrario del encenillo. Ahí está la
     diferencia de silueta entre los dos árboles del dosel. */
  const cuello = curva.getPointAt(1);
  const nRamas = Math.max(4, Math.round(6 * q));
  const brazos = [];
  for (let i = 0; i < nRamas; i++) {
    const az = (i / nRamas) * Math.PI * 2 + r() * 0.4;
    const largo = 2.5 + r() * 1.1;
    const g = rama({ y: cuello.y - 0.3, az, largo, alzada: 0.3, r0: 0.16, curva: 0.1, semilla: seed + i });
    poner(g, [cuello.x, 0, cuello.z]);
    hornearCorteza(g, {
      grieta: mezclar(CORTEZAS.roble, NEUTROS.tinta, 0.6),
      cuerpo: mezclar(CORTEZAS.roble, NEUTROS.tinta, 0.22),
      escalaGrano: 6,
    });
    partes.push(g);
    brazos.push({ az, largo, y: cuello.y - 0.3 + 0.4 * largo });
  }

  /* La copa: ancha y ACHATADA (achatado 0.5) — una nube tendida sobre el bosque. */
  const yCopa = cuello.y + 1.5;
  const cumulos = sembrarFollaje({
    centro: [cuello.x, yCopa, cuello.z],
    /* Ancha y baja: la MESA. Contra el cono invertido del encenillo y la bola
       del nogal, es la tercera manera de ser copa que tiene este bosque. */
    radio: 4.7,
    achatado: 0.34,
    n: Math.max(16, Math.round(42 * q)),
    semilla: seed,
    huecos: 0.4,
    mordida: 0.38,
    distMin: 0.72,
  });
  for (let i = 0; i < cumulos.length; i++) {
    const c = cumulos[i];
    const m = matojoNube(0.95 * c.esc, seed + i * 5, 0.5);
    poner(m, c.pos, c.giro);
    pintarCopa(m, 'dosel', {
      centro: [cuello.x, yCopa, cuello.z], radio: 4.8,
      yMin: yCopa - 1.4, yMax: yCopa + 1.5, ao: 0.6, manchas: 0.13,
    });
    partes.push(m);
  }

  /* Las epífitas montadas en las ramas: bromelias que viven del aire. */
  const nEpi = Math.max(2, Math.round(5 * q));
  for (let i = 0; i < nEpi; i++) {
    const b = brazos[i % brazos.length];
    if (!b) break;
    const t = 0.45 + r() * 0.4;
    const px = Math.cos(b.az) * b.largo * t;
    const pz = Math.sin(b.az) * b.largo * t;
    const py = cuello.y - 0.3 + 0.3 * b.largo * t + 0.1 * b.largo * t * t + 0.1;
    for (const h of bromelia(0.3, seed + i * 3)) {
      poner(h, [cuello.x + px, py, cuello.z + pz]);
      pintarCopa(h, 'dosel', {
        centro: [cuello.x + px, py, cuello.z + pz], radio: 0.6, yMin: py, yMax: py + 0.5,
        ao: 0.35, manchas: 0.08,
        tinte: { base: VERDES.frio, sol: VERDES.brote, luz: ACENTOS.maizTextil },
      });
      partes.push(h);
    }
  }

  return fusionarSeguro(partes, 'cedro', { preservarNormales: true });
}

/*
 * 4. NOGAL (Juglans neotropica) — la copa globosa.
 *
 * Ramificación monopódica con ramas en ángulo AGUDO y una copa globosa
 * irregular y amplia que hace sombra densa. Es el volumen macizo del dosel: al
 * lado del cono invertido del encenillo y de la mesa del cedro, la bola del
 * nogal completa las tres maneras de ser copa que tiene este bosque.
 */
export function geomNogal({ q = 1 } = {}, seed = 404) {
  const r = rng(seed);
  const partes = [];
  const alto = 10.2;

  const curva = curvaTronco({ altura: alto * 0.55, inclina: 0.07, sinuoso: 0.09, giro: r() * 6 }, seed);
  const tronco = tuboOrganico(curva, {
    tubular: Math.max(9, Math.round(16 * q)),
    radial: Math.max(6, Math.round(9 * q)),
    taper: taperTronco(0.44, 0.17, 0.5),
    arruga: 0.15,
    semilla: seed,
  });
  hornearCorteza(tronco, {
    grieta: mezclar(CORTEZAS.quenual, NEUTROS.tinta, 0.55),
    cuerpo: mezclar(CORTEZAS.quenual, CORTEZAS.roble, 0.35), // pardo-rojiza
    cresta: mezclar(CORTEZAS.quenual, TIERRAS.camino, 0.3),
    liquen: VERDES.paramoMusgo,
    escalaGrano: 5,
    hastaLiquen: 2.6,
  });
  partes.push(tronco);

  /* Ramas en ángulo agudo (alzada alta, poca apertura) — el gesto monopódico. */
  const cuello = curva.getPointAt(1);
  const nRamas = Math.max(3, Math.round(6 * q));
  for (let i = 0; i < nRamas; i++) {
    const az = (i / nRamas) * Math.PI * 2 + r() * 0.5;
    const g = rama({
      y: cuello.y - 0.9 - r() * 0.6, az, largo: 1.9 + r() * 0.8,
      alzada: 0.95, r0: 0.12, curva: 0.22, semilla: seed + i,
    });
    poner(g, [cuello.x, 0, cuello.z]);
    hornearCorteza(g, {
      grieta: mezclar(CORTEZAS.quenual, NEUTROS.tinta, 0.62),
      cuerpo: mezclar(CORTEZAS.quenual, NEUTROS.tinta, 0.25),
      escalaGrano: 6.5,
    });
    partes.push(g);
  }

  const yCopa = cuello.y + 1.9;
  const cumulos = sembrarFollaje({
    centro: [cuello.x, yCopa, cuello.z],
    radio: 3.15,
    achatado: 0.88, // casi esférica: la bola
    n: Math.max(16, Math.round(34 * q)),
    semilla: seed,
    huecos: 0.44,
    mordida: 0.36,
    distMin: 0.6,
  });
  for (let i = 0; i < cumulos.length; i++) {
    const c = cumulos[i];
    const m = matojoNube(0.92 * c.esc, seed + i * 9, 0.52);
    poner(m, c.pos, c.giro);
    pintarCopa(m, 'dosel', {
      centro: [cuello.x, yCopa, cuello.z], radio: 3.2,
      yMin: yCopa - 2.6, yMax: yCopa + 2.6, ao: 0.68, manchas: 0.12,
    });
    partes.push(m);
  }

  return fusionarSeguro(partes, 'nogal', { preservarNormales: true });
}

/* ══════════════════════════════════════════════════════════════════════════
   5. ESTRATO SOTOBOSQUE — a media altura, a la sombra
   ══════════════════════════════════════════════════════════════════════════ */

/*
 * 5. MANO DE OSO (Oreopanax bogotensis) — el parasol.
 *
 * Copa ABIERTA en forma de parasol, con pocas hojas pero enormes, de tres
 * lóbulos (de ahí el nombre: la garra del oso) y envés amarillento-dorado. Es
 * la silueta más generosa del sotobosque: pocas piezas, muy grandes, muy
 * legibles. Se dibuja con las hojas casi horizontales y el dorado por debajo,
 * que es justo lo que se ve cuando uno camina bajo el árbol.
 */
export function geomManoDeOso({ q = 1 } = {}, seed = 505) {
  const r = rng(seed);
  const partes = [];
  const alto = 4.4;

  const curva = curvaTronco({ altura: alto, inclina: 0.13, sinuoso: 0.14, giro: r() * 6 }, seed);
  const tronco = tuboOrganico(curva, {
    tubular: Math.max(8, Math.round(14 * q)),
    radial: Math.max(5, Math.round(7 * q)),
    taper: taperTronco(0.17, 0.075, 0.4),
    arruga: 0.13,
    semilla: seed,
  });
  hornearCorteza(tronco, {
    grieta: mezclar(CORTEZAS.roble, NEUTROS.tinta, 0.6),
    cuerpo: mezclar(CORTEZAS.roble, VERDES.paramoMusgo, 0.22),
    cresta: CORTEZAS.roble,
    liquen: VERDES.paramoMusgo,
    escalaGrano: 6,
    hastaLiquen: 1.8,
  });
  partes.push(tronco);

  const cima = curva.getPointAt(1);
  /* El parasol: hojas grandes, casi horizontales, radiando del ápice. Pocas y
     enormes — si fueran muchas y chicas volveríamos a un arbusto cualquiera. */
  const nHojas = Math.max(6, Math.round(10 * q));
  const dorado = mezclar(ACENTOS.ambar, VERDES.brote, 0.35); // el envés amarillento
  for (let i = 0; i < nHojas; i++) {
    const ang = (i / nHojas) * Math.PI * 2 + r() * 0.32;
    const largo = 1.15 + r() * 0.35;
    /* Pecíolo: la hoja no nace pegada al tronco, cuelga de su propio tallito. */
    const pec = tallo(
      [[0, 0, 0], [0, 0.12, largo * 0.3], [0, 0.06, largo * 0.55]],
      0.035, 0.022, { tubular: 5, radial: 4, arruga: 0.04, semilla: seed + i },
    );
    poner(pec, [cima.x, cima.y - 0.1, cima.z], [0, ang, 0]);
    pintarPlano(pec, mezclar(CORTEZAS.roble, NEUTROS.tinta, 0.35));
    partes.push(pec);

    for (const dedo of hojaTrilobulada(largo, 0.72)) {
      /* Se acuesta: la hoja mira al cielo y enseña el dorado por debajo. */
      poner(dedo, [0, 0, 0], [-1.24 + r() * 0.16, 0, 0]);
      poner(dedo, [cima.x, cima.y - 0.16, cima.z], [0, ang, 0]);
      poner(dedo, [Math.cos(ang + Math.PI / 2) * 0, 0, 0]);
      /* El horneado usa el eje Y como sol/sombra: como la hoja está acostada,
         su cara de abajo queda en la banda baja del gradiente → ahí entra el
         dorado, que es exactamente donde el ojo lo ve en el bosque real. */
      hornearFollaje(dedo, {
        base: dorado,
        sol: ESTRATOS.sotobosque.tinte.sol,
        luz: ESTRATOS.sotobosque.tinte.luz,
        centro: [cima.x, cima.y, cima.z],
        radio: 1.9,
        yMin: cima.y - 0.45,
        yMax: cima.y + 0.25,
        ao: 0.3,
        manchas: 0.09,
      });
      partes.push(dedo);
    }
  }

  /* El racimo de cabezuelas: bolitas blancas sobre la copa. Detalle mínimo que
     remata el parasol y lo separa del helecho arbóreo a media distancia. */
  const nBolas = Math.max(3, Math.round(7 * q));
  for (let i = 0; i < nBolas; i++) {
    const b = new THREE.IcosahedronGeometry(0.075, 0);
    poner(b, [cima.x + (r() - 0.5) * 0.6, cima.y + 0.24 + r() * 0.3, cima.z + (r() - 0.5) * 0.6]);
    pintarPlano(b, mezclar(NEUTROS.hueso, VERDES.brote, 0.22));
    partes.push(b);
  }

  return fusionarSeguro(partes, 'mano-de-oso', { preservarNormales: true });
}

/*
 * 6. HELECHO ARBÓREO (Cyathea caracasana) — el volante del sotobosque.
 *
 * Estípite columnar pelado con las cicatrices de las frondas viejas, y una
 * corona de frondas grandes que se arquean hacia afuera y caen. En el centro,
 * el BÁCULO: la fronda nueva todavía enrollada. Esa espiral es el detalle que
 * hace que el helecho se lea como helecho y no como palma pequeña, y de paso es
 * el gesto más rubber-hose de todo el bosque.
 */
export function geomHelechoArboreo({ q = 1 } = {}, seed = 606) {
  const r = rng(seed);
  const partes = [];
  const alto = 3.3;

  const curva = curvaTronco({ altura: alto, inclina: 0.06, sinuoso: 0.05, giro: r() * 6 }, seed);
  const estipite = tuboOrganico(curva, {
    tubular: Math.max(8, Math.round(14 * q)),
    radial: Math.max(5, Math.round(8 * q)),
    taper: taperTronco(0.19, 0.15, 0.7),
    arruga: 0.26, // las cicatrices: relieve fuerte, casi escamoso
    semilla: seed,
  });
  hornearCorteza(estipite, {
    grieta: mezclar(TIERRAS.cacao, NEUTROS.tinta, 0.4),
    cuerpo: TIERRAS.turba,
    cresta: mezclar(TIERRAS.turba, TIERRAS.mantillo, 0.45),
    liquen: VERDES.paramoMusgo,
    escalaGrano: 9, // grano fino y apretado = cicatrices
    hastaLiquen: 1.6,
  });
  partes.push(estipite);

  const cima = curva.getPointAt(1);
  const nFrondas = Math.max(6, Math.round(9 * q));
  for (let i = 0; i < nFrondas; i++) {
    const ang = (i / nFrondas) * Math.PI * 2 + r() * 0.35;
    const trozos = fronda({
      largo: 1.75 + r() * 0.4,
      ancho: 0.5,
      pares: Math.max(5, Math.round(8 * q)),
      arqueo: 0.5, // sube y luego cae: el arco del volante
      caida: 0.72,
      semilla: seed + i * 3,
      grosorRaquis: 0.028,
    });
    for (const t of trozos) {
      poner(t, [0, 0, 0], [-0.28, 0, 0]);
      poner(t, [cima.x, cima.y - 0.05, cima.z], [0, ang, 0]);
      pintarCopa(t, 'sotobosque', {
        centro: [cima.x, cima.y, cima.z], radio: 2.0,
        yMin: cima.y - 0.9, yMax: cima.y + 0.7, ao: 0.42, manchas: 0.12,
      });
      partes.push(t);
    }
  }

  /* Los báculos: dos, uno más abierto que el otro (la planta está creciendo). */
  for (let i = 0; i < 2; i++) {
    const b = baculo(0.85 - i * 0.2, seed + 40 + i);
    poner(b, [cima.x + (i - 0.5) * 0.16, cima.y - 0.06, cima.z + (i - 0.5) * 0.14], [0, r() * 6, 0]);
    pintarCopa(b, 'sotobosque', {
      centro: [cima.x, cima.y + 0.6, cima.z], radio: 1.0,
      yMin: cima.y, yMax: cima.y + 1.1, ao: 0.25, manchas: 0.1,
      tinte: { base: VERDES.monte, sol: VERDES.brote, luz: ACENTOS.maizTextil },
    });
    partes.push(b);
  }

  return fusionarSeguro(partes, 'helecho-arboreo', { preservarNormales: true });
}

/*
 * 7. CHUSQUE (Chusquea scandens) — el bambú andino.
 *
 * No tiene copa: es una MASA densa de cañas finas que sale de una sola mata y
 * se abre en abanico, con matojos de hoja en los nudos. Forma el sotobosque
 * cerrado de verdad — el que uno tiene que abrir a machete. Su textura rayada
 * y su verde más claro lo separan de todo lo demás a esa altura.
 *
 * (En la taxonomía es el arquetipo `pasto`: Chusquea es Poaceae, una gramínea
 * leñosa. Ese es el mismo arquetipo del pajonal, en su versión de bosque.)
 */
export function geomChusque({ q = 1 } = {}, seed = 707) {
  const r = rng(seed);
  const partes = [];
  const nCanias = Math.max(9, Math.round(18 * q));

  for (let i = 0; i < nCanias; i++) {
    const ang = r() * Math.PI * 2;
    const abre = 0.35 + r() * 0.85; // cuánto se tumba hacia afuera
    const largo = 2.4 + r() * 2.0;
    const pts = [];
    const n = 5;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      /* La caña sube y se va venciendo: arco de manguera, no palo. */
      const rad = abre * largo * t * t * 0.42;
      pts.push([
        Math.cos(ang) * rad,
        largo * t * (1 - 0.18 * t * t),
        Math.sin(ang) * rad,
      ]);
    }
    const c = tallo(pts, 0.05, 0.022, { tubular: 9, radial: 4, arruga: 0.07, semilla: seed + i });
    pintarPlano(c, mezclar(VERDES.trabajo, TIERRAS.pajonal, 0.22 + r() * 0.2));
    partes.push(c);

    /* Los nudos con su matojo de hoja: lo que hace la masa. */
    const nNudos = Math.max(2, Math.round(4 * q));
    for (let k = 1; k <= nNudos; k++) {
      const t = 0.36 + (k / (nNudos + 1)) * 0.6;
      const rad = abre * largo * t * t * 0.42;
      const p = [Math.cos(ang) * rad, largo * t * (1 - 0.18 * t * t), Math.sin(ang) * rad];
      const nHojas = 3;
      for (let h = 0; h < nHojas; h++) {
        const hj = hojaBlanda(0.34 + r() * 0.2, 0.055);
        poner(hj, [0, 0, 0], [0.5 + r() * 0.7, (h / nHojas) * Math.PI * 2 + r(), 0]);
        poner(hj, p);
        pintarCopa(hj, 'sotobosque', {
          centro: [0, largo * 0.6, 0], radio: 2.4, yMin: 0, yMax: largo,
          ao: 0.38, manchas: 0.14,
          tinte: { base: VERDES.monte, sol: VERDES.brote, luz: ESTRATOS.sotobosque.tinte.luz },
        });
        partes.push(hj);
      }
    }
  }

  return fusionarSeguro(partes, 'chusque', { preservarNormales: true });
}

/*
 * 8. ARBUSTO FLORECIDO (Tibouchina lepidota / Vallea stipularis) — la mancha
 * de color.
 *
 * Arquetipo `arbusto`: varios tallos leñosos desde la base y copa redondeada.
 * El siete cueros y el raque son los dos arbolitos que ponen el color del
 * bosque altoandino —púrpura el uno, fucsia el otro— y son los únicos que
 * justifican un acento fuerte aquí. Se usan a cucharadas: unas pocas flores
 * grandes sobre la mata, jamás una superficie de color.
 */
export function geomArbustoFlorecido({ q = 1 } = {}, seed = 808) {
  const r = rng(seed);
  const partes = [];
  const nTallos = Math.max(4, Math.round(6 * q));
  const alto = 1.9;

  for (let i = 0; i < nTallos; i++) {
    const ang = (i / nTallos) * Math.PI * 2 + r() * 0.6;
    const abre = 0.28 + r() * 0.3;
    const h = alto * (0.7 + r() * 0.42);
    const pts = [];
    const n = 4;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const rad = abre * h * t * t;
      pts.push([Math.cos(ang) * rad, h * t, Math.sin(ang) * rad]);
    }
    const c = tallo(pts, 0.062, 0.026, { tubular: 7, radial: 5, arruga: 0.14, semilla: seed + i });
    hornearCorteza(c, {
      grieta: mezclar(CORTEZAS.sieteCueros, NEUTROS.tinta, 0.55),
      cuerpo: CORTEZAS.sieteCueros, // «cobre que se descama» — las siete pieles
      cresta: CORTEZAS.sieteCuerosClaro,
      escalaGrano: 8,
    });
    partes.push(c);
  }

  /* La copa redondeada de la mata. */
  const cumulos = sembrarFollaje({
    centro: [0, alto * 0.95, 0],
    radio: 1.1,
    achatado: 0.82,
    n: Math.max(8, Math.round(18 * q)),
    semilla: seed,
    huecos: 0.36,
    mordida: 0.4,
    distMin: 0.34,
  });
  for (let i = 0; i < cumulos.length; i++) {
    const c = cumulos[i];
    const m = matojoNube(0.42 * c.esc, seed + i * 11, 0.5);
    poner(m, c.pos, c.giro);
    pintarCopa(m, 'sotobosque', {
      centro: [0, alto * 0.95, 0], radio: 1.15,
      yMin: alto * 0.35, yMax: alto * 1.55, ao: 0.55, manchas: 0.14,
    });
    partes.push(m);
  }

  /* Las flores: cinco pétalos abiertos, fucsia. Pocas y grandes. */
  const nFlores = Math.max(3, Math.round(8 * q));
  for (let i = 0; i < nFlores; i++) {
    const c = cumulos[Math.floor(r() * cumulos.length)];
    if (!c) break;
    const base = [c.pos[0], c.pos[1] + 0.24, c.pos[2]];
    for (let p = 0; p < 5; p++) {
      const petalo = hojaBlanda(0.15, 0.12, 0.18);
      poner(petalo, [0, 0, 0], [1.15, 0, 0]);
      poner(petalo, base, [0, (p / 5) * Math.PI * 2 + r(), 0]);
      pintarPlano(petalo, p % 2 === 0 ? ACENTOS.florDeMonte : mezclar(ACENTOS.florDeMonte, ACENTOS.indigo, 0.3));
      partes.push(petalo);
    }
    const centro = new THREE.IcosahedronGeometry(0.045, 0);
    poner(centro, [base[0], base[1] + 0.03, base[2]]);
    pintarPlano(centro, ACENTOS.maizTextil); // los estambres amarillos
    partes.push(centro);
  }

  return fusionarSeguro(partes, 'arbusto-florecido', { preservarNormales: true });
}

/*
 * 9. BEJUCO CON BROMELIAS — el hilo vertical.
 *
 * Junta dos arquetipos que en el bosque real siempre andan juntos: la
 * ENREDADERA (tallo largo y flexible que trepa buscando la luz) y la
 * BROMELIA-EPÍFITA (roseta que vive montada sin parasitar). Es la pieza que
 * COSE los tres estratos: nace en la hojarasca, sube por el sotobosque y llega
 * al dosel. Sin ella los tres pisos se ven como tres decorados apilados; con
 * ella se ven como un solo bosque.
 */
export function geomBejucoBromelia({ q = 1 } = {}, seed = 909) {
  const r = rng(seed);
  const partes = [];
  const alto = 5.6;

  /* La liana: sube en hélice como si abrazara un tronco invisible, y cuelga un
     lazo — el bucle es lo que la delata como bejuco y no como tallo. */
  const pts = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const ang = t * Math.PI * 3.1;
    const rad = 0.42 * (1 - t * 0.35);
    pts.push([Math.cos(ang) * rad, alto * t, Math.sin(ang) * rad]);
  }
  const liana = tallo(pts, 0.062, 0.03, {
    tubular: Math.max(14, Math.round(26 * q)), radial: 5, arruga: 0.15, semilla: seed,
  });
  hornearCorteza(liana, {
    grieta: mezclar(CORTEZAS.raicilla, NEUTROS.tinta, 0.45),
    cuerpo: CORTEZAS.raicilla,
    cresta: mezclar(CORTEZAS.raicilla, TIERRAS.mantillo, 0.4),
    liquen: VERDES.paramoMusgo,
    escalaGrano: 7,
    hastaLiquen: 2.5,
  });
  partes.push(liana);

  /* El lazo que cuelga: puro rubber-hose, una manguera que se descuelga. */
  const lazo = tallo(
    [[0.3, alto * 0.72, 0.1], [0.72, alto * 0.55, 0.42], [0.55, alto * 0.3, 0.72], [0.12, alto * 0.34, 0.5]],
    0.04, 0.026, { tubular: 12, radial: 4, arruga: 0.1, semilla: seed + 5 },
  );
  pintarPlano(lazo, mezclar(CORTEZAS.raicilla, NEUTROS.tinta, 0.2));
  partes.push(lazo);

  /* Las hojas acorazonadas del bejuco, repartidas a lo largo. */
  const nHojas = Math.max(5, Math.round(11 * q));
  for (let i = 0; i < nHojas; i++) {
    const t = 0.18 + (i / nHojas) * 0.78;
    const ang = t * Math.PI * 3.1;
    const rad = 0.42 * (1 - t * 0.35);
    const p = [Math.cos(ang) * rad, alto * t, Math.sin(ang) * rad];
    const h = hojaBlanda(0.4 + r() * 0.18, 0.3, 0.16);
    poner(h, [0, 0, 0], [1.05 + r() * 0.4, 0, 0]);
    poner(h, p, [0, ang + Math.PI / 2 + r() * 0.5, 0]);
    pintarCopa(h, 'sotobosque', {
      centro: [0, alto * 0.5, 0], radio: 2.4, yMin: 0, yMax: alto,
      ao: 0.4, manchas: 0.12,
    });
    partes.push(h);
  }

  /* Las bromelias montadas: tres rosetas a distintas alturas. */
  const nBro = Math.max(2, Math.round(4 * q));
  for (let i = 0; i < nBro; i++) {
    const t = 0.35 + (i / nBro) * 0.55;
    const ang = t * Math.PI * 3.1;
    const rad = 0.42 * (1 - t * 0.35);
    const p = [Math.cos(ang) * rad * 1.3, alto * t, Math.sin(ang) * rad * 1.3];
    for (const h of bromelia(0.26 + r() * 0.08, seed + i * 7)) {
      poner(h, p, [0.35 * (r() - 0.5), r() * 6, 0]);
      pintarCopa(h, 'sotobosque', {
        centro: p, radio: 0.55, yMin: p[1] - 0.1, yMax: p[1] + 0.45,
        ao: 0.3, manchas: 0.1,
        tinte: { base: VERDES.frio, sol: VERDES.brote, luz: ACENTOS.cochinilla },
      });
      partes.push(h);
    }
  }

  return fusionarSeguro(partes, 'bejuco-bromelia', { preservarNormales: true });
}

/* ══════════════════════════════════════════════════════════════════════════
   6. ESTRATO SUELO — helechos, musgos, hojarasca, lo rastrero
   ══════════════════════════════════════════════════════════════════════════ */

/*
 * 10. HELECHO DE SUELO (Blechnum spp.) — la misma fronda del helecho arbóreo,
 * pero sin estípite y abierta al ras. Que compartan el gesto no es pereza: en
 * el bosque real es exactamente la misma forma de crecimiento a dos escalas, y
 * verlo es parte de la lección.
 */
export function geomHelechoSuelo({ q = 1 } = {}, seed = 110) {
  const r = rng(seed);
  const partes = [];
  const nFrondas = Math.max(5, Math.round(8 * q));

  for (let i = 0; i < nFrondas; i++) {
    const ang = (i / nFrondas) * Math.PI * 2 + r() * 0.4;
    const largo = 0.62 + r() * 0.3;
    const trozos = fronda({
      largo,
      ancho: 0.24,
      pares: Math.max(4, Math.round(7 * q)),
      arqueo: 0.68,
      caida: 0.5,
      semilla: seed + i * 3,
      grosorRaquis: 0.03,
    });
    for (const t of trozos) {
      poner(t, [0, 0, 0], [0.1 + r() * 0.2, 0, 0]);
      poner(t, [0, 0.06, 0], [0, ang, 0]);
      pintarCopa(t, 'suelo', {
        centro: [0, 0.4, 0], radio: 0.95, yMin: 0, yMax: 0.8, ao: 0.44, manchas: 0.16,
      });
      partes.push(t);
    }
  }

  /* Un báculo pequeño: el helecho del suelo también se desenrolla. */
  const b = baculo(0.34, seed + 9);
  poner(b, [0.04, 0.05, -0.03], [0, r() * 6, 0]);
  pintarCopa(b, 'suelo', {
    centro: [0, 0.4, 0], radio: 0.6, yMin: 0, yMax: 0.6, ao: 0.3, manchas: 0.1,
    tinte: { base: VERDES.paramoMusgo, sol: VERDES.brote, luz: ACENTOS.maizTextil },
  });
  partes.push(b);

  return fusionarSeguro(partes, 'helecho-suelo', { preservarNormales: true });
}

/*
 * 11. HIERBA DE SOMBRA — hoja ancha, entera, con la nervadura pálida marcada.
 * El arquetipo `hierba`: tallo no leñoso. En la penumbra del bosque las hojas
 * se hacen grandes y planas para cazar la poca luz que baja; dibujarlas anchas
 * no es licencia, es la adaptación.
 */
export function geomHierbaSombra({ q = 1 } = {}, seed = 111) {
  const r = rng(seed);
  const partes = [];
  const nHojas = Math.max(4, Math.round(7 * q));

  for (let i = 0; i < nHojas; i++) {
    const ang = (i / nHojas) * Math.PI * 2 + r() * 0.5;
    const largo = 0.46 + r() * 0.28;
    const h = hojaBlanda(largo, largo * 0.62, 0.14);
    poner(h, [0, 0, 0], [0.62 + r() * 0.5, 0, 0]);
    poner(h, [0, 0.04, 0], [0, ang, 0]);
    pintarCopa(h, 'suelo', {
      centro: [0, 0.3, 0], radio: 0.8, yMin: 0, yMax: 0.7, ao: 0.4, manchas: 0.15,
    });
    partes.push(h);

    /* La nervadura: un hilo pálido por el centro de la hoja. Detalle chico que
       a media distancia se lee como brillo y saca la hoja del plano. */
    const nerv = tallo(
      [[0, 0, 0], [0, largo * 0.5, 0.01], [0, largo * 0.92, 0.02]],
      0.014, 0.005, { tubular: 4, radial: 4, arruga: 0.02, semilla: seed + i },
    );
    poner(nerv, [0, 0, 0], [0.62 + r() * 0.5, 0, 0]);
    poner(nerv, [0, 0.04, 0], [0, ang, 0]);
    pintarPlano(nerv, mezclar(VERDES.brote, NEUTROS.hueso, 0.42));
    partes.push(nerv);
  }

  return fusionarSeguro(partes, 'hierba-sombra', { preservarNormales: true });
}

/*
 * 12. COJÍN DE MUSGO Y HOJARASCA — el piso del bosque.
 *
 * Cojines redondos de musgo entre hojas caídas. No es relleno: la hojarasca es
 * donde el bosque se recicla a sí mismo, y visualmente es lo que impide que el
 * suelo se vea como una alfombra verde de videojuego. Va en gran cantidad y
 * por eso es la pieza más barata de todas.
 */
export function geomCojinHojarasca({ q = 1 } = {}, seed = 112) {
  const r = rng(seed);
  const partes = [];

  /* Los cojines: domos achatados de musgo, en grupo. */
  const nCojines = Math.max(2, Math.round(4 * q));
  for (let i = 0; i < nCojines; i++) {
    const rad = 0.19 + r() * 0.16;
    const c = matojoNube(rad, seed + i * 5, 0.34);
    c.scale(1.25, 0.55, 1.25);
    poner(c, [(r() - 0.5) * 0.7, rad * 0.3, (r() - 0.5) * 0.7]);
    hornearFollaje(c, {
      base: mezclar(VERDES.paramoMusgo, NEUTROS.tinta, 0.45),
      sol: VERDES.paramoMusgo,
      luz: mezclar(VERDES.paramoMusgo, VERDES.brote, 0.4),
      centro: [0, 0.1, 0], radio: 0.75, yMin: 0, yMax: 0.4, ao: 0.5, manchas: 0.22,
    });
    partes.push(c);
  }

  /* Las hojas caídas: lozas casi planas, pardas, tiradas de cualquier manera. */
  const nHojas = Math.max(4, Math.round(9 * q));
  const pardos = [TIERRAS.mantillo, TIERRAS.mantilloSombra, TIERRAS.camino, mezclar(TIERRAS.mantillo, ACENTOS.ambar, 0.25)];
  for (let i = 0; i < nHojas; i++) {
    const h = hojaBlanda(0.2 + r() * 0.14, 0.13, 0.1);
    poner(h, [0, 0, 0], [Math.PI / 2 + (r() - 0.5) * 0.5, r() * 6, 0]);
    poner(h, [(r() - 0.5) * 1.15, 0.022, (r() - 0.5) * 1.15]);
    pintarPlano(h, pardos[i % pardos.length]);
    partes.push(h);
  }

  /* Una ramita caída: la firma de que arriba hay dosel. */
  const ram = tallo(
    [[-0.35, 0.03, 0.1], [0, 0.05, -0.05], [0.4, 0.03, 0.12]],
    0.026, 0.012, { tubular: 6, radial: 4, arruga: 0.18, semilla: seed + 3 },
  );
  pintarPlano(ram, mezclar(CORTEZAS.raicilla, NEUTROS.tinta, 0.35));
  partes.push(ram);

  return fusionarSeguro(partes, 'cojin-hojarasca', { preservarNormales: true });
}

/* ══════════════════════════════════════════════════════════════════════════
   7. EL CATÁLOGO DE CONSTRUCTORES + LA SIEMBRA DEL BOSQUE
   ══════════════════════════════════════════════════════════════════════════ */

export const CONSTRUCTORES = {
  'palma-de-cera': geomPalmaDeCera,
  encenillo: geomEncenillo,
  cedro: geomCedro,
  nogal: geomNogal,
  'mano-de-oso': geomManoDeOso,
  'helecho-arboreo': geomHelechoArboreo,
  chusque: geomChusque,
  'arbusto-florecido': geomArbustoFlorecido,
  'bejuco-bromelia': geomBejucoBromelia,
  'helecho-suelo': geomHelechoSuelo,
  'hierba-sombra': geomHierbaSombra,
  'cojin-hojarasca': geomCojinHojarasca,
};

/* Cuántas matas de cada arquetipo por tier. Son INSTANCIAS, no draw-calls:
   cada arquetipo es un solo InstancedMesh por muchas que haya. El tier bajo
   conserva la LECTURA de los tres estratos (que es la lección) aunque pierda
   densidad. */
export const POBLACION = {
  alto: {
    'palma-de-cera': 9, encenillo: 16, cedro: 8, nogal: 12,
    'mano-de-oso': 20, 'helecho-arboreo': 26, chusque: 19, 'arbusto-florecido': 22, 'bejuco-bromelia': 15,
    'helecho-suelo': 250, 'hierba-sombra': 280, 'cojin-hojarasca': 430,
  },
  medio: {
    'palma-de-cera': 6, encenillo: 11, cedro: 5, nogal: 8,
    'mano-de-oso': 12, 'helecho-arboreo': 15, chusque: 11, 'arbusto-florecido': 13, 'bejuco-bromelia': 9,
    'helecho-suelo': 140, 'hierba-sombra': 155, 'cojin-hojarasca': 235,
  },
  bajo: {
    'palma-de-cera': 4, encenillo: 7, cedro: 3, nogal: 5,
    'mano-de-oso': 6, 'helecho-arboreo': 8, chusque: 6, 'arbusto-florecido': 7, 'bejuco-bromelia': 5,
    'helecho-suelo': 38, 'hierba-sombra': 42, 'cojin-hojarasca': 58,
  },
};

/* La calidad geométrica por tier (subdivisiones, cuántas hojas por planta). */
export const CALIDAD = { alto: 1, medio: 0.66, bajo: 0.42 };

/*
 * LA ORILLA DEL BOSQUE. Esta es la decisión de composición que decide si la
 * lección se ve o no se ve.
 *
 * Un bosque sembrado de forma pareja alrededor de la cámara NO enseña sus
 * estratos: uno queda parado entre troncos, mirando un muro de fustes, con las
 * copas cortadas por el borde de la pantalla. (Así salió el primer intento.)
 *
 * Lo que sí enseña los tres pisos es pararse en el CLARO y mirar la ORILLA del
 * bosque desde afuera, un poco elevado: entonces el suelo llena el primer
 * plano, el sotobosque forma su banda a media altura, el dosel cierra arriba y
 * los emergentes asoman contra el cielo. Cuatro planos en profundidad, que es
 * exactamente lo que hay que ver.
 *
 * Por eso el mundo se parte en dos: el bosque vive en z ≤ `ORILLA` y de ahí
 * hacia la cámara solo hay claro — con su piso vivo, pero sin nada que tape.
 */
const ORILLA = 4.5; // el frente del bosque: cerca, para que llene el cuadro
const FONDO = -32; // hasta dónde se mete el rodal
const CLARO = { x: 0, z: 12, radio: 10.5 };

const distanciaAlClaro = (x, z) => Math.hypot(x - CLARO.x, z - CLARO.z);

/*
 * Siembra el bosque: para cada arquetipo devuelve la lista de instancias
 * `{ pos, rotY, escala, tilt }`. El reparto no es aleatorio uniforme —
 * obedece a cómo se organiza un bosque de verdad:
 *
 *   · Los EMERGENTES (palma, cedro) van sueltos y lejos entre sí: son los que
 *     asoman por encima del techo y si se agrupan, tapan.
 *   · El DOSEL se cierra al fondo y se abre hacia el claro.
 *   · El SOTOBOSQUE busca los bordes y los claros, que es donde le llega luz.
 *   · El SUELO cubre todo, con más musgo en las hondonadas.
 */
export function poblarBosque({ tier = 'alto', seed = 4242, extension = 23 } = {}) {
  const r = rng(seed);
  const conteos = POBLACION[tier] || POBLACION.medio;
  const bancos = {};
  /* Memoria de posiciones por estrato para no apiñar los grandes. */
  const ocupadas = { dosel: [], sotobosque: [] };

  const libre = (x, z, minDist, lista) => {
    for (let i = 0; i < lista.length; i++) {
      const [ox, oz] = lista[i];
      if ((ox - x) ** 2 + (oz - z) ** 2 < minDist * minDist) return false;
    }
    return true;
  };

  const esEmergente = (id) => id === 'palma-de-cera' || id === 'cedro';
  /* Los que piden MÁS espacio se siembran PRIMERO. Si van de últimos, los que
     ya están puestos les tapan todos los sitios válidos y el arquetipo entra a
     medias o no entra — se pierde una especie del rodal sin que nada avise. */
  const orden = [...ARQUETIPOS].sort((a, b) => {
    const peso = (x) => (esEmergente(x.id) ? 0 : x.estrato === 'dosel' ? 1 : x.estrato === 'sotobosque' ? 2 : 3);
    return peso(a) - peso(b);
  });

  for (const arq of orden) {
    const n = conteos[arq.id] || 0;
    const items = [];
    const esGrande = arq.estrato === 'dosel';
    const emergente = esEmergente(arq.id);
    /* Separación mínima entre matas del mismo porte. */
    const minDist = emergente ? 7.4 : esGrande ? 4.1 : arq.estrato === 'sotobosque' ? 1.6 : 0;
    /* Los grandes se siembran con separación mínima contra TODOS los árboles ya
       puestos, así que necesitan muchos más intentos: con pocos, los últimos
       arquetipos de la lista se quedan sin cupo y el rodal pierde una especie
       entera sin avisar (al cedro le pasó: pedía 8 y entraban 3). */
    const intentos = minDist > 0 ? n * 160 : n * 40;

    for (let i = 0; i < intentos && items.length < n; i++) {
      const x = (r() * 2 - 1) * extension;
      /* El SUELO cubre todo (también el claro, que si queda pelado se lee como
         potrero); los otros dos estratos viven detrás de la orilla. */
      const z = arq.estrato === 'suelo'
        ? FONDO + r() * (extension + 8 - FONDO)
        : FONDO + r() * (ORILLA - FONDO);
      const dClaro = distanciaAlClaro(x, z);

      /* El claro: los grandes no entran; los del sotobosque rondan el borde. */
      if (esGrande && dClaro < CLARO.radio) continue;
      if (arq.estrato === 'sotobosque' && dClaro < CLARO.radio * 0.68) continue;
      /* Los emergentes, además, se van al fondo: su gracia es verlos LEJOS y
         aun así por encima de todo. */
      if (emergente && z > -6) continue;

      if (minDist > 0) {
        const lista = esGrande ? ocupadas.dosel : ocupadas.sotobosque;
        if (!libre(x, z, minDist, lista)) continue;
        lista.push([x, z]);
      }

      const y = alturaSuelo(x, z);
      /* Escala: variación honesta (un rodal tiene árboles de todas las edades)
         y squash & stretch — unas matas más gordas y bajitas, otras espigadas. */
      const base = 0.82 + r() * 0.42;
      const estira = 0.92 + r() * 0.2;
      items.push({
        pos: [x, y, z],
        rotY: r() * Math.PI * 2,
        escala: [base / Math.sqrt(estira), base * estira, base / Math.sqrt(estira)],
        /* Ladeo: nada crece a plomo. Los altos se ladean menos que los bajos. */
        tilt: [
          (r() - 0.5) * (esGrande ? 0.05 : 0.17),
          (r() - 0.5) * (esGrande ? 0.05 : 0.17),
        ],
        semilla: r(),
      });
    }
    bancos[arq.id] = items;
  }

  return bancos;
}

/*
 * NOTA SOBRE LA NIEBLA — dos intentos descartados, para que no se repitan.
 *
 * 1) Velos horizontales a la altura de corte de cada estrato, para recortar el
 *    dosel contra el sotobosque con perspectiva aérea. Desde una cámara algo
 *    elevada se ven POR ENCIMA y se leen como una lámina gris atravesada en el
 *    bosque: parece un defecto de render, no atmósfera.
 * 2) Un solo velo bajo, a ras de suelo. Como el terreno sube hacia el claro, el
 *    piso lo ATRAVIESA y deja una arista recta y dura cruzando la escena.
 *
 * Ningún plano translúcido flotando aguanta que la cámara orbite. La separación
 * entre pisos la hacen los dos recursos que sí aguantan cualquier ángulo: el
 * VALOR horneado de cada estrato (dosel encendido, sotobosque medio, suelo
 * oscuro) y la niebla de DISTANCIA del propio motor. La niebla que se ve en la
 * escena es esa, y el botón la corre de cerca a lejos.
 */
