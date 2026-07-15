/*
 * estiercol.geom — el ADN COMPARTIDO del mundo "la mierda volviéndose gas y
 * abono": paleta derivada, presupuesto por tier, la mano que dibuja torcido y
 * EL ANILLO DEL CICLO. Funciones PURAS (three-core, corren headless: cero
 * contexto GL, cero azar por frame, cero assets externos).
 *
 * ── LA VERDAD QUE ENSEÑA (corpus teacher-cerdos-gallinas, 150 pares) ────────
 * El estiércol es el problema más real y menos glamoroso de la finca: apesta,
 * cría mosca y pelea con el vecino. Y ese olor NO es un detalle estético — es
 * NITRÓGENO VOLÁNDOSE, o sea plata que se va al aire en vez de quedarse en el
 * abono. Todo el módulo está construido sobre esa sola frase.
 *
 * El corpus manda tres cosas que aquí son LEY VISUAL:
 *
 *   1. LA SEPARACIÓN ES EL ORIGEN. "Con una pendiente suave y un canal en el
 *      punto más bajo, el orín escurre solo mientras el sólido queda arriba
 *      para recogerlo seco. Mezclados, se pudren juntos y ahí nace el olor
 *      fuerte." Por eso el ciclo se BIFURCA en la rejilla: el líquido baja al
 *      biodigestor, el sólido sube a la compostera. Dos carriles, no uno.
 *
 *   2. EL CARBONO AMARRA EL NITRÓGENO. "El estiércol solo es puro nitrógeno;
 *      cuando el nitrógeno no tiene con qué amarrarse se escapa como amoníaco."
 *      Por eso hay DOS humos en esta paleta y no son lo mismo (ver HUMOS).
 *
 *   3. NADA DE ESTO ES MAGIA. "Representa una inversión real de plata y
 *      trabajo, no es gratis." Por eso la manga lleva su PARCHE, la zanja su
 *      barro y el montón mal llevado existe en la escena: si esto se ve como
 *      postal de folleto, mentimos.
 *
 * ── EL ANILLO ──────────────────────────────────────────────────────────────
 * La tesis es un círculo que cierra: animal → estiércol → biodigestor/
 * compostera → gas + abono → suelo → comida → animal. Se dibuja LITERAL: un
 * sendero circular hecho a mano con las estaciones encima y pulsos de materia
 * corriendo por él. Donde el ciclo se rompe (el montón anaerobio), la materia
 * SE SALE del anillo y se va al cielo: eso es la plata volándose, y se ve.
 *
 * Los componentes r3f (`Biodigestor.jsx`, `Biocompostera.jsx`,
 * `CicloCerrado.jsx`) consumen esto y le ponen luz, material y vida.
 */
import * as THREE from 'three';
import {
  VERDES,
  TIERRAS,
  AGUAS,
  ACENTOS,
  NEUTROS,
  LUCES,
  PALETA,
  mezclar,
} from '../paleta/index.js';
import { PALETA_ANDINA, rngArtesania } from '../artesaniaAndina.js';

/* PRNG determinista (misma finca en cada carga; nada de Math.random). El
   módulo entero hereda la receta LCG de artesaniaAndina: una sola aleatoriedad
   en la casa. */
export const rng = rngArtesania;

/* ------------------------------------------------------------------ */
/* LA MANO — nada recto, el remate se ve.                              */
/* ------------------------------------------------------------------ */

/*
 * El ADN de artesania/: una finca real no tiene un solo borde recto. Ni la
 * zanja, ni el cajón, ni el sendero. `manoAlzada` es el temblor honesto de
 * quien cavó con pala: determinista (mismo seed → misma torcedura), suave
 * (dos frecuencias, no ruido de TV) y proporcional (`amplitud` en unidades de
 * mundo). Se aplica a POSICIONES, no a normales: el relieve es geometría.
 */
export function manoAlzada(t, { amplitud = 0.05, seed = 7 } = {}) {
  const r = rng(seed);
  const fase1 = r() * Math.PI * 2;
  const fase2 = r() * Math.PI * 2;
  return (
    Math.sin(t * 5.3 + fase1) * amplitud * 0.62 +
    Math.sin(t * 11.7 + fase2) * amplitud * 0.38
  );
}

/*
 * Tuerce una geometría entera con la mano: cada vértice se corre según su
 * altura y su posición, como madera que se combó o tierra que se asentó.
 * MUTA y devuelve la geometría (patrón de las geoms del bosque). Barato: una
 * pasada por vértice, una vez por montaje.
 */
export function torcerConLaMano(geo, { amplitud = 0.03, seed = 11 } = {}) {
  const pos = geo.attributes.position;
  const r = rng(seed);
  const f1 = r() * 10;
  const f2 = r() * 10;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    pos.setX(i, x + Math.sin(y * 3.1 + f1) * amplitud);
    pos.setZ(i, z + Math.sin(y * 2.7 + x * 1.9 + f2) * amplitud);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/*
 * RECORTAR EN EL CORTE — el que da la mano, lo quita el serrucho.
 *
 * `torcerConLaMano` mueve vértices en Z, y en una pieza CORTADA (las del
 * biodigestor viven todas en z ≤ 0) ese temblor empuja parte de la tierra o
 * del plástico DELANTE del plano del corte. Se ve feísimo y además es mentira:
 * un corte es un plano, no una sierra borracha. Esto aplasta contra z=0
 * cualquier vértice que se haya salido — la torcedura se conserva en X e Y,
 * que es donde de verdad se lee.
 *
 * Regla de la casa: TODA pieza cortada que pase por `torcerConLaMano` tiene
 * que pasar después por aquí.
 */
export function recortarEnCorte(geo, z0 = 0) {
  const pos = geo.attributes.position;
  let toco = false;
  for (let i = 0; i < pos.count; i += 1) {
    if (pos.getZ(i) > z0) {
      pos.setZ(i, z0);
      toco = true;
    }
  }
  if (toco) {
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }
  return geo;
}

/*
 * EL REMATE SE VE: un amarre (la tira de neumático con que de verdad se sella
 * la manga contra el tubo, o la cabuya del cajón). No es adorno — es la junta
 * mostrada en vez de escondida. Devuelve la geometría de un anillo grueso.
 */
export function amarreGeom(radio, grosor = 0.045, seed = 5) {
  const geo = new THREE.TorusGeometry(radio, grosor, 5, 12);
  return torcerConLaMano(geo, { amplitud: 0.012, seed });
}

/* ------------------------------------------------------------------ */
/* PALETA — derivada de la madre, ni un hex inventado sin parentesco.   */
/* ------------------------------------------------------------------ */

/*
 * Todo sale de `paleta/` por `mezclar()`, como manda GUIA.md §1. Los tres
 * colores que esta escena SÍ tuvo que derivar (no existen arriba porque ningún
 * mundo previo tuvo gas ni purín) quedan documentados aquí con su parentesco:
 *
 *   · llama*  — el biogás bien quemado ARDE AZUL; es física, no gusto. Se
 *     deriva del único azul con permiso (AGUAS.viva) hacia el índigo textil,
 *     que es el azul más hondo de la casa. La llama amarilla NO se pinta:
 *     una llama amarilla es una llama mal ajustada (y aquí la llama enseña).
 *   · amoniaco — el olor hecho color: verde-azufre agrio, el único color feo
 *     de la paleta A PROPÓSITO. Es nitrógeno yéndose; tiene que dar antipatía.
 *   · purin    — el líquido de la cochera: tierra de siembra hundida hacia la
 *     grieta más honda (TIERRAS.cacao). Nunca negro puro.
 */
export const PALETA_ESTIERCOL = {
  /* — el material crudo — */
  estiercolFresco: mezclar(TIERRAS.siembra, TIERRAS.cacao, 0.45), // pardo húmedo
  purin: mezclar(TIERRAS.cacao, VERDES.paramoHoja, 0.22), // el líquido de la cochera
  carbono: mezclar(TIERRAS.vega, ACENTOS.maizGrano, 0.28), // aserrín, cascarilla, tamo
  carbonoHoja: TIERRAS.pajonal, // hoja seca, tamo: el carbono con más cuerpo

  /* — el biodigestor — */
  polietileno: mezclar(NEUTROS.lamina, NEUTROS.hueso, 0.5), // la manga: plástico lechoso
  polietilenoSol: mezclar(NEUTROS.hueso, ACENTOS.maizTextil, 0.14), // donde le pega el sol
  parche: mezclar(NEUTROS.lamina, TIERRAS.cacao, 0.3), // el remiendo (más oscuro: se ve)
  lodo: mezclar(TIERRAS.cacao, VERDES.paramoNiebla, 0.3), // la mezcla fermentando
  lodoHondo: mezclar(TIERRAS.cacao, NEUTROS.tinta, 0.4), // el fondo, donde sedimenta
  gas: mezclar(NEUTROS.hueso, AGUAS.viva, 0.18), // la campana: aire con algo de luz
  burbuja: mezclar(NEUTROS.hueso, AGUAS.espuma, 0.5), // el metano subiendo
  biol: mezclar(TIERRAS.camino, VERDES.calido, 0.35), // el efluente: abono líquido
  manguera: mezclar(NEUTROS.tinta, TIERRAS.cacao, 0.25), // la manguera de gas

  /* — la llama (biogás bien quemado: azul) — */
  llama: mezclar(AGUAS.viva, ACENTOS.indigo, 0.42),
  llamaCorazon: mezclar(AGUAS.espuma, AGUAS.viva, 0.55), // el cono interior, pálido
  llamaBorde: mezclar(AGUAS.viva, VERDES.frioVivo, 0.3), // el borde que lame la olla

  /* — la compostera — */
  compostJoven: mezclar(TIERRAS.siembra, PALETA_ANDINA.terracota, 0.16),
  compostMaduro: mezclar(TIERRAS.turba, NEUTROS.tinta, 0.22), // oscuro, suelto, huele a tierra
  corazonCaliente: mezclar(ACENTOS.ambar, PALETA_ANDINA.cochinilla, 0.35), // la fase termófila
  tibio: mezclar(ACENTOS.ambar, TIERRAS.siembra, 0.5), // el borde del calor
  lombriz: mezclar(PALETA_ANDINA.cochinilla, ACENTOS.florDeMonte, 0.35), // la roja californiana

  /* — los dos humos: uno es salud, el otro es plata — */
  vapor: mezclar(NEUTROS.hueso, LUCES.sol, 0.22), // agua tibia: blanco cálido
  amoniaco: mezclar(VERDES.paramoLiquen, ACENTOS.maizTextil, 0.42), // verde-azufre agrio

  /* — la finca alrededor — */
  madera: PALETA.madera,
  maderaVieja: mezclar(PALETA.maderaOscura, NEUTROS.lamina, 0.28),
  tierra: TIERRAS.siembra,
  tierraHonda: TIERRAS.cacao,
  pasto: VERDES.trabajo,
  sendero: TIERRAS.camino,
  mosca: mezclar(NEUTROS.tinta, VERDES.paramoMusgo, 0.25),
};

/*
 * LOS DOS HUMOS — la lección que se ve antes de leerse.
 *
 * Los dos suben del montón. Los dos parecen "humo". Pero:
 *
 *   · VAPOR (blanco cálido, columna recta, se disuelve alto): es agua tibia.
 *     La pila aeróbica CALIENTA porque las bacterias trabajan; ese calor mata
 *     patógenos y semillas de maleza. El vapor es la señal de que va BIEN.
 *
 *   · AMONÍACO (verde-azufre, jirones bajos que se arrastran y no suben): es
 *     NITRÓGENO ESCAPÁNDOSE. Es el olor que arde en la nariz. Es plata que se
 *     va. Sale del montón encharcado sin carbono, y de la cama mal llevada.
 *
 * Misma silueta, lectura opuesta. El color y el comportamiento hacen la
 * diferencia: el vapor sube y se va limpio; el amoníaco se queda pegado al
 * suelo, amarillea el aire y se escapa del anillo del ciclo.
 */
export const HUMOS = {
  vapor: {
    color: PALETA_ESTIERCOL.vapor,
    subida: 0.62, // sube decidido
    deriva: 0.1, // casi vertical: sale del corazón caliente
    opacidad: 0.3,
    escala: [0.3, 0.62],
    vida: 3.1,
  },
  amoniaco: {
    color: PALETA_ESTIERCOL.amoniaco,
    subida: 0.16, // NO sube: se arrastra (por eso se respira)
    deriva: 0.5, // se desparrama hacia el vecino
    opacidad: 0.24,
    escala: [0.4, 0.9],
    vida: 4.6,
  },
};

/* ------------------------------------------------------------------ */
/* PRESUPUESTO POR TIER (DR §6 / deviceTier).                          */
/* ------------------------------------------------------------------ */

/*
 * El "wow" vive en 'alto'. 'medio' es frugal pero conserva LO QUE ENSEÑA (las
 * burbujas, la llama, las capas, los dos humos): se recorta densidad, nunca
 * lección. 'bajo' es el mínimo digno — la escena normalmente cae a su espejo
 * 2D en equipo humilde, pero si algo la fuerza, aguanta.
 */
export const PARAMS_TIER = {
  alto: {
    burbujas: 44,
    pulsos: 96,
    humo: 26,
    moscas: 14,
    lombrices: 18,
    segTubo: 20,
    segRadial: 14,
    invernadero: true,
    montonMalo: true,
    motasCarbono: 60,
  },
  medio: {
    burbujas: 24,
    pulsos: 48,
    humo: 14,
    moscas: 6,
    lombrices: 9,
    segTubo: 12,
    segRadial: 10,
    invernadero: true,
    montonMalo: true,
    motasCarbono: 24,
  },
  bajo: {
    burbujas: 12,
    pulsos: 0,
    humo: 6,
    moscas: 0,
    lombrices: 4,
    segTubo: 8,
    segRadial: 8,
    invernadero: false,
    montonMalo: false,
    motasCarbono: 0,
  },
};

/** El presupuesto del tier (desconocido → frugal, nunca el caro). */
export const paramsDeTier = (tier) => PARAMS_TIER[tier] || PARAMS_TIER.medio;

/* ------------------------------------------------------------------ */
/* EL ANILLO DEL CICLO — la tesis como geometría.                      */
/* ------------------------------------------------------------------ */

/* El radio del sendero circular y el ancho de los dos carriles. El carril de
   AFUERA lleva el SÓLIDO (se camina con carretilla); el de ADENTRO lleva el
   LÍQUIDO (escurre solo, por gravedad: por eso va por dentro y más bajo). */
export const ANILLO = { radio: 6.4, carril: 0.7, ancho: 0.5 };

/** Punto del anillo en el ángulo `a` (grados) y el carril `d` (offset radial). */
export function puntoAnillo(a, d = 0, y = 0) {
  const rad = (a * Math.PI) / 180;
  const r = ANILLO.radio + d;
  return new THREE.Vector3(Math.sin(rad) * r, y, Math.cos(rad) * r);
}

/*
 * LAS ESTACIONES, en el orden en que el ciclo las visita. Los ángulos ponen a
 * los dos héroes al FRENTE (donde mira la cámara) y mandan al animal al fondo:
 * el que produce el problema está atrás; lo que hacemos con él, adelante.
 *
 * `nota` es contenido de identidad EN USTED (el corpus hablando), aquí para
 * que el 3D y cualquier lámina 2D nombren la pieza IGUAL.
 */
export const ESTACIONES = [
  {
    id: 'corral',
    ang: 200,
    carril: 0,
    etiqueta: 'el corral',
    nota: 'Aquí nace el problema: el animal come y produce. Con cama profunda de material seco, el estiércol se absorbe en el sitio en vez de lavarse con manguera.',
  },
  {
    id: 'separacion',
    ang: 250,
    carril: 0,
    etiqueta: 'la rejilla',
    nota: 'La mejora más rentable de todas: una pendiente suave y un canal. El líquido escurre solo hacia el biodigestor; el sólido queda arriba para recogerlo seco. Mezclados, se pudren juntos — y ahí nace el olor.',
  },
  {
    id: 'biodigestor',
    ang: 315,
    carril: -ANILLO.carril,
    etiqueta: 'el biodigestor',
    nota: 'Una manga de polietileno enterrada en su zanja. Adentro, sin aire, unas bacterias se comen la materia y sueltan biogás para la estufa y biol para la huerta. No es magia: cuesta plata, trabajo y carga diaria.',
  },
  {
    id: 'cocina',
    /* `pos` explícita: la cocina NO vive en el anillo, vive pegada al
       biodigestor (la manguera de gas tiene que ser corta). Es la posición de
       mundo del grupo del biodigestor + su COCINA local. */
    pos: [-6.18, 0.95, 7.28],
    etiqueta: 'la llama azul',
    nota: 'El momento que lo explica todo: la mierda de ayer cocinando el almuerzo de hoy. Bien quemado, el biogás arde AZUL. Y se respeta como una pipeta: nunca se busca una fuga con un fósforo, se busca con agua jabonosa.',
  },
  {
    id: 'tanque',
    ang: 0,
    carril: -ANILLO.carril,
    etiqueta: 'el tanque de biol',
    nota: 'El biol no se aplica recién sale: reposa aquí y se aplica DILUIDO. La fermentación baja los patógenos, pero no es una sanitización completa.',
  },
  {
    id: 'compostera',
    ang: 40,
    carril: ANILLO.carril,
    etiqueta: 'la biocompostera',
    nota: 'Tres cajones y un techo. El sólido entra en capas con material seco, calienta, se voltea, madura. Al final —solo al final— llega la lombriz.',
  },
  {
    id: 'monton',
    /* FUERA DEL ANILLO a propósito: de este montón la materia no vuelve al
       suelo. Se va al aire. Es la única estación que no está en el círculo, y
       esa es toda la lección. */
    ang: 168,
    carril: 2.3,
    etiqueta: 'el montón mal llevado',
    nota: 'Encharcado, sin carbono, sin techo y sin voltear. Apesta a amoníaco porque el nitrógeno se le está volando al aire — o sea, plata. Y tiene mosca, que no viene por el olor sino por el mismo material húmedo y blando. Fíjese que este montón está FUERA del círculo: de aquí nada vuelve al suelo.',
  },
  {
    id: 'huerta',
    ang: 75,
    carril: 0,
    etiqueta: 'el suelo',
    nota: 'Aquí llegan los dos: el biol por el carril de adentro y el compost por el de afuera. El suelo es el que cobra.',
  },
  {
    id: 'comida',
    ang: 140,
    carril: 0,
    etiqueta: 'la comida',
    nota: 'Lo que el suelo da vuelve al animal y a la mesa. Ahí el círculo cierra — y por eso el estiércol no es basura, es el principio.',
  },
];

/** Una estación por id (para hotspots y cámara). */
export const estacion = (id) => ESTACIONES.find((e) => e.id === id) || ESTACIONES[0];

/** La posición de mundo de una estación (las de fuera del anillo traen `pos`). */
export function posEstacion(id) {
  const e = estacion(id);
  if (e.pos) return new THREE.Vector3(...e.pos);
  return puntoAnillo(e.ang, e.carril);
}

/*
 * LOS TRAMOS del ciclo: cada uno es un arco del anillo con SU carga y SU color.
 * Leídos juntos cuentan la frase completa. Los dos carriles corren en paralelo
 * por el frente (la bifurcación de la rejilla) y se juntan otra vez en el suelo:
 * eso es exactamente lo que enseña el corpus — separar en el origen, reunir en
 * el suelo.
 */
export const TRAMOS = [
  {
    id: 'crudo',
    desde: 200,
    hasta: 250,
    carril: 0,
    color: PALETA_ESTIERCOL.estiercolFresco,
    carga: 'el estiércol del día',
  },
  {
    id: 'liquido',
    desde: 250,
    hasta: 315, // la rejilla → el biodigestor
    carril: -ANILLO.carril,
    color: PALETA_ESTIERCOL.purin,
    carga: 'el líquido: escurre solo',
  },
  {
    id: 'solido',
    desde: 250,
    hasta: 400, // la rejilla → (pasa de largo el biodigestor) → la compostera (40°)
    carril: ANILLO.carril,
    color: PALETA_ESTIERCOL.estiercolFresco,
    carga: 'el sólido: se recoge seco',
  },
  {
    id: 'biol',
    desde: 315,
    hasta: 435, // el biodigestor → el tanque (360°) → el suelo (75°)
    carril: -ANILLO.carril,
    color: PALETA_ESTIERCOL.biol,
    carga: 'el biol: abono líquido',
  },
  {
    id: 'compost',
    desde: 400,
    hasta: 435, // la compostera → el suelo
    carril: ANILLO.carril,
    color: PALETA_ESTIERCOL.compostMaduro,
    carga: 'el compost: abono maduro',
  },
  {
    id: 'cosecha',
    desde: 435,
    hasta: 500, // suelo → comida
    carril: 0,
    color: VERDES.brote,
    carga: 'la comida',
  },
  {
    id: 'vuelta',
    desde: 500,
    hasta: 560, // comida → corral: el círculo cierra
    carril: 0,
    color: VERDES.calido,
    carga: 'y vuelve al animal',
  },
];

/**
 * La curva de un tramo, con la mano encima (un sendero de finca no es un
 * compás). Determinista por el id del tramo.
 * @returns {THREE.CatmullRomCurve3}
 */
export function curvaTramo(tramo, muestras = 14) {
  const semilla = tramo.id.charCodeAt(0) + tramo.id.length * 13;
  const pts = [];
  for (let i = 0; i <= muestras; i += 1) {
    const t = i / muestras;
    const a = tramo.desde + (tramo.hasta - tramo.desde) * t;
    /* el temblor va en el RADIO (el sendero serpentea), no en la altura */
    const d = tramo.carril + manoAlzada(t * 3, { amplitud: 0.11, seed: semilla });
    pts.push(puntoAnillo(a, d, 0.015));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
}

/** El sendero de un tramo como tubo aplanado (una cinta pisada en la tierra). */
export function geometriaTramo(tramo, params) {
  const curva = curvaTramo(tramo);
  const geo = new THREE.TubeGeometry(curva, params.segTubo * 2, ANILLO.ancho * 0.5, 4, false);
  geo.scale(1, 0.09, 1); // aplastado: es un camino, no una manguera
  return geo;
}

/*
 * LOS PULSOS: la materia corriendo por el anillo. Cada uno lleva su tramo, su
 * fase y su color. La escena los mueve por frame sobre la curva (un
 * InstancedMesh para todos: un draw-call para el ciclo entero).
 */
export function pulsosDelCiclo(params, seed = 21) {
  if (params.pulsos <= 0) return [];
  const r = rng(seed);
  const out = [];
  const porTramo = Math.max(1, Math.round(params.pulsos / TRAMOS.length));
  TRAMOS.forEach((tramo, ti) => {
    const curva = curvaTramo(tramo);
    for (let i = 0; i < porTramo; i += 1) {
      out.push({
        tramo: ti,
        curva,
        fase: (i + r() * 0.6) / porTramo,
        vel: 0.055 + r() * 0.03,
        escala: 0.055 + r() * 0.045,
        color: new THREE.Color(tramo.color),
      });
    }
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* HUMO — la columna de partículas (vale para el vapor y el amoníaco).  */
/* ------------------------------------------------------------------ */

/**
 * Una columna de humo: partículas con posición base, fase y escala. El tipo
 * (`vapor` | `amoniaco`) decide el comportamiento en la escena — no es un
 * color distinto del mismo efecto, es OTRO fenómeno (ver HUMOS).
 */
export function columnaHumo(origen, cantidad, tipo = 'vapor', seed = 31) {
  const r = rng(seed);
  const receta = HUMOS[tipo] || HUMOS.vapor;
  const out = [];
  for (let i = 0; i < cantidad; i += 1) {
    out.push({
      base: new THREE.Vector3(
        origen[0] + (r() - 0.5) * 0.5,
        origen[1],
        origen[2] + (r() - 0.5) * 0.5,
      ),
      fase: r(),
      vel: receta.subida * (0.7 + r() * 0.6),
      deriva: (r() - 0.5) * receta.deriva,
      giro: r() * Math.PI * 2,
      escala: receta.escala[0] + r() * (receta.escala[1] - receta.escala[0]),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* EL SUELO de la escena y el terreno de la finca.                      */
/* ------------------------------------------------------------------ */

/** La era donde vive todo: un disco de tierra pisada, ondulado con la mano. */
export function eraGeom(radio = 8.6, seg = 30) {
  const geo = new THREE.CircleGeometry(radio, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const r = rng(3);
  const f = r() * 8;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    /* la era se hunde apenas hacia el borde: agua que corrió, pata que pisó */
    pos.setY(i, Math.sin(x * 0.7 + f) * 0.035 + Math.cos(z * 0.55 + f) * 0.035);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}
