/*
 * compostera.geom — LA BIOCOMPOSTERA POR DENTRO: tres cajones, un techo y el
 * estiércol volviéndose tierra, EN CORTE. Funciones puras (three-core).
 *
 * ── POR QUÉ TRES CAJONES Y NO UN MONTÓN ────────────────────────────────────
 * Porque el compostaje no es un estado, es un VIAJE por temperaturas — y un
 * montón solo no puede mostrarlo. Tres cajones muestran las tres fases al
 * mismo tiempo, que es justo como se ve una compostera trabajando de verdad:
 * uno cargando, uno volteando, uno madurando. "Una biocompostera fija, con
 * paredes bajas o cajones, techo y buen drenaje en la base, ayuda a mantener
 * forma, controlar la humedad y facilita el volteo."
 *
 * ── LAS TRES VERDADES QUE MANDAN AQUÍ ──────────────────────────────────────
 *
 *   1. EL CARBONO AMARRA EL NITRÓGENO. Por eso las capas se alternan y por eso
 *      las de material seco son MÁS GRUESAS que las de estiércol (`GROSOR`):
 *      "el estiércol solo es puro nitrógeno; cuando el nitrógeno no tiene con
 *      qué amarrarse se escapa como amoníaco". Un dibujo con capas iguales, o
 *      con más estiércol que carbono, está dibujando un montón que apesta.
 *
 *   2. EL CALOR ES EL QUE SANITIZA. "Ese calor no es un accidente, es la señal
 *      de que el compostaje va bien" — y es lo que mata patógenos y semillas
 *      de maleza. Por eso cada fase tiene su `temperatura` y su corazón
 *      caliente dibujado, y por eso el volteo existe: para que el material de
 *      las orillas (que se enfría) pase por el centro caliente.
 *
 *   3. LA LOMBRIZ LLEGA AL FINAL. NUNCA al principio. "El estiércol fresco
 *      libera amoníaco y calor, y ambas cosas son tóxicas o letales para la
 *      lombriz." Por eso `lombrices: true` SOLO existe en el cajón maduro y
 *      frío. Dibujar lombrices en estiércol fresco es dibujar lombrices
 *      muertas.
 *
 * ── EL OLOR, DIBUJADO ──────────────────────────────────────────────────────
 * Los cajones sueltan VAPOR blanco (agua tibia: la señal de que va bien). El
 * montón mal llevado de al lado —encharcado, sin carbono, sin voltear— suelta
 * AMONÍACO verde que ni siquiera sube: se arrastra. Son el mismo gesto con
 * lectura opuesta, y esa comparación es la lección entera del módulo. Ese
 * montón está a propósito FUERA del anillo del ciclo: es la plata saliéndose.
 */
import * as THREE from 'three';
import { PALETA_ESTIERCOL, torcerConLaMano, rng, manoAlzada } from './estiercol.geom.js';

/* ------------------------------------------------------------------ */
/* LAS MEDIDAS.                                                         */
/* ------------------------------------------------------------------ */

/*
 * El cajón. `alto` bajo a propósito: la pared es una guía, no una caja — el
 * montón la rebasa y se ve. "Una pila de metro y medio de alto suele ser buen
 * tamaño: lo bastante grande para retener calor en el centro y lo bastante
 * manejable para voltearla con pala o bieldo sin necesitar maquinaria."
 * Aquí la pila llega ~1.35 sobre el piso del cajón: en ese orden, no más.
 */
export const CAJON = {
  ancho: 1.5,
  hondo: 1.2,
  alto: 0.82,
  tabla: 0.07,
  separacion: 0.09,
};

/** El centro X de cada cajón (tres, en fila; el 0 es el que se está cargando). */
export function cajonX(i) {
  const paso = CAJON.ancho + CAJON.separacion;
  return (i - 1) * paso;
}

/* Cuánto más gruesa es la capa de carbono que la de estiércol. El estiércol
   es puro nitrógeno; para amarrarlo hace falta bastante más material seco que
   estiércol. Que las capas se vean así de desiguales ES la enseñanza. */
export const GROSOR = { estiercol: 0.075, carbono: 0.125 };

/* ------------------------------------------------------------------ */
/* LAS FASES — el viaje por la temperatura.                             */
/* ------------------------------------------------------------------ */

/*
 * `temperatura` va de 0 (frío, maduro) a 1 (el corazón termófilo). Manda el
 * color del corazón, cuánto vapor sale y —lo más importante— si la lombriz
 * puede estar ahí o no.
 */
export const FASES = [
  {
    id: 'armado',
    cajon: 0,
    etiqueta: 'recién armado',
    temperatura: 1,
    capas: true, // las capas todavía se distinguen una por una
    vapor: 1,
    lombrices: false, // aquí la lombriz se muere: hay amoníaco y calor
    nota: 'Capa de estiércol, capa de material seco, capa de estiércol. Fíjese que la capa seca es más gruesa: el estiércol es puro nitrógeno y necesita bastante carbono para amarrarlo. Sin eso, el nitrógeno se va al aire como amoníaco — y eso es plata.',
  },
  {
    id: 'volteo',
    cajon: 1,
    etiqueta: 'el volteo',
    temperatura: 0.62,
    capas: false, // ya se revolvió: las capas se perdieron y está bien
    vapor: 0.55,
    lombrices: false, // todavía calienta
    nota: 'Se voltea para llevarle aire a todo y para que el material de las orillas —que se enfría— pase por el centro caliente. Ese calor sostenido es el que mata patógenos y semillas de maleza. Si no voltea, la maleza del estiércol le germina después en la huerta.',
  },
  {
    id: 'maduro',
    cajon: 2,
    etiqueta: 'maduro',
    temperatura: 0.05,
    capas: false,
    vapor: 0.12,
    lombrices: true, // AHORA sí: ya bajó la temperatura y se fue el amoníaco
    nota: 'Oscuro, suelto, huele a tierra de bosque y ya no vuelve a calentar aunque lo voltee. Solo ahora llega la lombriz: en el fresco se le habría muerto por el amoníaco y el calor. Esto ya se le puede echar a la mata sin quemarla.',
  },
];

/* ------------------------------------------------------------------ */
/* LAS CAPAS — el corte del montón.                                     */
/* ------------------------------------------------------------------ */

/*
 * Convención de corte, igual que en el biodigestor: todo vive en z ∈ [-hondo,
 * 0] y la cara en z=0 es la del serrucho — la que mira la cámara. Aquí no hay
 * extrusión: cada capa es una tabla de material, y su canto en z=0 dibuja la
 * banda. Un montón real, visto en corte, es exactamente eso: bandas.
 *
 * El orden manda:
 *   · abajo, el DRENAJE (palos, ramas gruesas): sin eso el fondo se encharca y
 *     se vuelve anaerobio justo donde uno no lo ve.
 *   · en medio, la alternancia carbono/estiércol, empezando y —esto importa—
 *     TERMINANDO en carbono: la capa seca de encima es la que tapa el olor y
 *     le quita el aterrizaje a la mosca.
 *   · el montón se angosta hacia arriba (`merma`): así queda un montón hecho a
 *     pala, no un ladrillo.
 */
export function capasDelMonton(fase, seed = 51) {
  const r = rng(seed + fase.cajon * 7);
  const capas = [];
  let y = 0;

  /* el drenaje del fondo: ramas y palos, para que el fondo respire */
  capas.push({
    y0: y,
    alto: 0.1,
    tipo: 'drenaje',
    color: PALETA_ESTIERCOL.maderaVieja,
    merma: 0,
  });
  y += 0.1;

  const techo = 1.35; // el alto de trabajo del montón (ver CAJON)
  let esCarbono = true; // arranca en seco: el fondo nunca va con estiércol
  while (y < techo) {
    const grosor = esCarbono ? GROSOR.carbono : GROSOR.estiercol;
    const alto = grosor * (0.82 + r() * 0.36); // ninguna capa es pareja: se echó a pala
    if (y + alto > techo) break;
    capas.push({
      y0: y,
      alto,
      tipo: esCarbono ? 'carbono' : 'estiercol',
      color: esCarbono
        ? r() > 0.5
          ? PALETA_ESTIERCOL.carbono
          : PALETA_ESTIERCOL.carbonoHoja
        : PALETA_ESTIERCOL.estiercolFresco,
      merma: (y / techo) * 0.3, // se angosta hacia arriba
    });
    y += alto;
    esCarbono = !esCarbono;
  }

  /* la última capa SIEMPRE seca: es la que tapa el olor y la mosca */
  capas.push({
    y0: y,
    alto: GROSOR.carbono * 0.9,
    tipo: 'carbono',
    color: PALETA_ESTIERCOL.carbonoHoja,
    merma: 0.32,
  });

  /* ¿ya se volteó? entonces las capas NO existen: se revolvieron. Se devuelve
     el mismo montón con el color mezclado, porque la FORMA sí sobrevive al
     volteo — lo que se pierde es la lectura de las bandas. */
  if (!fase.capas) {
    const destino =
      fase.temperatura > 0.3 ? PALETA_ESTIERCOL.compostJoven : PALETA_ESTIERCOL.compostMaduro;
    return capas.map((c, i) =>
      c.tipo === 'drenaje'
        ? c
        : {
            ...c,
            tipo: 'revuelto',
            /* quedan vetas: un volteo a bieldo no es una licuadora */
            color: i % 3 === 0 ? PALETA_ESTIERCOL.carbono : destino,
          },
    );
  }
  return capas;
}

/**
 * La geometría de una capa: una caja con la mano encima (nada recto). Se corta
 * en z=0 — el montón ocupa z ∈ [-hondo, 0].
 */
export function capaGeom(capa, seed = 3) {
  const ancho = (CAJON.ancho - CAJON.tabla * 2) * (1 - capa.merma);
  const hondo = (CAJON.hondo - CAJON.tabla) * (1 - capa.merma * 0.6);
  const geo = new THREE.BoxGeometry(ancho, capa.alto, hondo, 3, 1, 2);
  torcerConLaMano(geo, { amplitud: 0.016, seed: seed + Math.round(capa.y0 * 100) });
  geo.translate(0, capa.y0 + capa.alto / 2, -hondo / 2); // ── cortada en z=0
  return geo;
}

/**
 * EL CORAZÓN CALIENTE: la lente de calor en el centro del montón. No es un
 * efecto — es el sujeto. "¿Por qué la pila se pone caliente por dentro?"
 * Porque las bacterias trabajando generan calor, y ese calor es el que
 * sanitiza. Vive ADENTRO y arriba del centro geométrico, que es donde de
 * verdad está lo más caliente (el fondo se enfría contra la tierra).
 */
export function corazonGeom(fase) {
  /* el calor no solo se apaga: se ENCOGE. El montón maduro no tiene corazón
     caliente en el centro, tiene apenas un rescoldo — por eso el radio sigue a
     la temperatura de la fase. */
  const radio = 0.2 + 0.24 * fase.temperatura;
  const geo = new THREE.SphereGeometry(radio, 10, 8);
  geo.scale(1.5, 0.86, 1);
  geo.translate(0, 0.62, -CAJON.hondo * 0.45);
  return geo;
}

/** El color del corazón según la fase: del ámbar-cochinilla al frío. */
export function colorCorazon(fase) {
  return fase.temperatura > 0.3 ? PALETA_ESTIERCOL.corazonCaliente : PALETA_ESTIERCOL.tibio;
}

/* ------------------------------------------------------------------ */
/* LA ESTRUCTURA — cajones y techo, hechos a mano.                      */
/* ------------------------------------------------------------------ */

/**
 * Las tablas de un cajón: piso, fondo y dos costados. La CARA DE ADELANTE no
 * existe — y eso es diegético, no una licencia: en una compostera de tablas
 * los boards del frente se sacan para trabajar el montón. Los dos parales del
 * frente sí quedan (son los que sostienen las tablas cuando están puestas).
 */
export function tablasCajon() {
  const t = CAJON.tabla;
  const h = CAJON.alto;
  /* COORDENADAS LOCALES (x centrado en 0): quien monta el cajón ya lo puso en
     su sitio con `cajonX(i)`. Sumar el offset aquí también lo correría dos
     veces — el clásico. */
  return [
    /* el fondo */
    { args: [CAJON.ancho, h, t], pos: [0, h / 2, -CAJON.hondo] },
    /* los dos costados */
    { args: [t, h, CAJON.hondo], pos: [-CAJON.ancho / 2, h / 2, -CAJON.hondo / 2] },
    { args: [t, h, CAJON.hondo], pos: [CAJON.ancho / 2, h / 2, -CAJON.hondo / 2] },
    /* los parales del frente: las tablas están afuera porque se está trabajando */
    { args: [t * 1.5, h * 1.35, t * 1.5], pos: [-CAJON.ancho / 2, h * 0.68, -0.02] },
    { args: [t * 1.5, h * 1.35, t * 1.5], pos: [CAJON.ancho / 2, h * 0.68, -0.02] },
  ];
}

/**
 * EL TECHO. "Un techo o una lona evita que la lluvia sature de agua la pila (lo
 * que la vuelve anaeróbica y olorosa) y que el sol la reseque." Es la pieza que
 * decide si el montón va bien o se pudre, y cuesta casi nada.
 *
 * Va inclinado (el agua tiene que correr para algún lado) y ondulado con la
 * mano: es una lámina de zinc amarrada, no un plano de CAD.
 */
export function techoGeom() {
  const ancho = CAJON.ancho * 3 + CAJON.separacion * 2 + 0.5;
  const geo = new THREE.BoxGeometry(ancho, 0.035, CAJON.hondo + 0.75, 12, 1, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    /* la corrugación del zinc + el pandeo de los años */
    pos.setY(i, pos.getY(i) + Math.sin(x * 9) * 0.012 + manoAlzada(x * 0.4, { amplitud: 0.03, seed: 71 }));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Los postes del techo: torcidos, porque son palos de la finca. */
export function postesTecho() {
  const ancho = CAJON.ancho * 3 + CAJON.separacion * 2;
  return [
    [-ancho / 2 + 0.1, 0, 0.12],
    [ancho / 2 - 0.1, 0, 0.12],
    [-ancho / 2 + 0.1, 0, -CAJON.hondo - 0.1],
    [ancho / 2 - 0.1, 0, -CAJON.hondo - 0.1],
  ];
}

export const TECHO = { alturaFrente: 2.05, alturaAtras: 1.72 }; // caída para el agua

/* ------------------------------------------------------------------ */
/* LAS HERRAMIENTAS Y LAS SEÑAS.                                        */
/* ------------------------------------------------------------------ */

/*
 * LA PRUEBA DEL PUÑO, sin dibujar una mano: la bola que quedó apretada,
 * puesta en el borde del cajón del volteo. "Si chorrea agua entre los dedos
 * está muy húmedo; si se desmorona seco, le falta agua. El punto es cuando se
 * pega formando una bola pero no gotea." Esta bola SE SOSTIENE y NO chorrea:
 * es el punto bueno, hecho objeto. Las marcas de los dedos quedan.
 */
export function bolaPunoGeom() {
  const geo = new THREE.SphereGeometry(0.075, 9, 7);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    /* los surcos de los cuatro dedos que la apretaron */
    const surco = Math.sin(y * 42) * 0.006 + Math.cos(x * 30) * 0.005;
    const l = Math.hypot(x, y, z) || 1;
    pos.setXYZ(i, x + (x / l) * surco, y + (y / l) * surco, z + (z / l) * surco);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** El bieldo clavado en el montón del volteo: cabo de palo y cuatro dientes. */
export function bieldo() {
  return {
    cabo: { args: [0.022, 0.026, 1.15, 6], seed: 73 },
    dientes: [-0.075, -0.025, 0.025, 0.075],
    dienteAlto: 0.24,
  };
}

/* ------------------------------------------------------------------ */
/* LAS LOMBRICES — y solo donde deben estar.                            */
/* ------------------------------------------------------------------ */

/**
 * La roja californiana, en el cajón maduro y en ninguno más (ver FASES §3).
 * Se reparten cerca de la superficie y del frente del corte: en un lecho real
 * están en los primeros centímetros, no en el fondo.
 */
export function lombrices(params, seed = 81) {
  if (!params.lombrices) return [];
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < params.lombrices; i += 1) {
    out.push({
      /* locales al cajón (igual que `tablasCajon`): el grupo del cajón ya está
         puesto en su x. */
      pos: [
        (r() - 0.5) * CAJON.ancho * 0.72,
        0.42 + r() * 0.52,
        -0.06 - r() * 0.3, // asomadas al corte: se ven
      ],
      rot: [r() * 0.9 - 0.45, r() * Math.PI, r() * 0.7 - 0.35],
      escala: 0.72 + r() * 0.55,
      fase: r(),
    });
  }
  return out;
}

/** El cuerpo de una lombriz: un tubo curvo y anillado (nunca una recta). */
export function lombrizGeom() {
  const curva = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.075, 0, 0),
    new THREE.Vector3(-0.025, 0.016, 0.022),
    new THREE.Vector3(0.028, -0.012, -0.016),
    new THREE.Vector3(0.072, 0.008, 0.012),
  ]);
  return new THREE.TubeGeometry(curva, 10, 0.0085, 5, false);
}

/* ------------------------------------------------------------------ */
/* EL MONTÓN MAL LLEVADO — el contraejemplo honesto.                    */
/* ------------------------------------------------------------------ */

/*
 * Sin carbono, sin techo, sin voltear, encharcado. "Se ve empantanado,
 * pegajoso, con zonas oscuras y babosas, huele fuerte a huevo podrido o a
 * amoníaco, y puede que ni siquiera esté caliente, porque la fermentación sin
 * aire genera menos calor útil que la aeróbica."
 *
 * Está aquí porque sin él la escena sería un folleto. Y está FUERA DEL ANILLO
 * a propósito: de este montón la materia no vuelve al suelo, se va al aire.
 * Aplastado (`aplasta`) y sin corazón caliente: eso es lo que lo distingue de
 * los cajones. Con moscas, que no vienen por el olor sino por el mismo
 * material húmedo y blando donde ponen los huevos.
 */
/* Sin `pos`: vive en coordenadas LOCALES y lo ubica la escena, en la estación
   'monton' — que es la única FUERA del anillo del ciclo. */
export const MONTON_MALO = { radio: 0.72, alto: 0.46 };

export function montonMaloGeom() {
  const geo = new THREE.SphereGeometry(MONTON_MALO.radio, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  geo.scale(1, MONTON_MALO.alto / MONTON_MALO.radio, 1.1); // se desparramó: no tiene forma
  torcerConLaMano(geo, { amplitud: 0.055, seed: 91 });
  return geo;
}

/** El charco a su pie: lo que escurre de un montón sin cama ni drenaje — y que
 *  termina en la quebrada si nadie lo ataja. */
export function charcoGeom() {
  const geo = new THREE.CircleGeometry(MONTON_MALO.radio * 1.35, 14);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    pos.setY(i, Math.sin(pos.getX(i) * 6) * 0.012);
  }
  pos.needsUpdate = true;
  return geo;
}

/**
 * Las moscas: giran sobre el montón malo. "No vienen atraídas por el olor sino
 * por el material húmedo y blando donde ponen sus huevos. Si tiene mucho olor,
 * casi con seguridad también tiene mucha mosca: son la misma causa."
 * Por eso NUNCA hay moscas sobre los cajones bien llevados.
 */
export function moscas(params, seed = 95) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < params.moscas; i += 1) {
    out.push({
      /* locales al montón: la escena ya lo puso en su sitio */
      centro: [(r() - 0.5) * 0.9, MONTON_MALO.alto * (0.7 + r() * 1.5), (r() - 0.5) * 0.9],
      radio: 0.09 + r() * 0.26,
      vel: 1.4 + r() * 2.6,
      fase: r() * Math.PI * 2,
      escala: 0.5 + r() * 0.5,
    });
  }
  return out;
}
