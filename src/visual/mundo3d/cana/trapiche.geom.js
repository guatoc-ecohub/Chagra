/*
 * trapiche.geom — la GEOMETRÍA de la ENRAMADA DEL TRAPICHE PANELERO.
 *
 * Un trapiche de finca no es un ingenio: es un COBERTIZO ABIERTO con una
 * molienda, una hornilla larga y una mesa de moldeo, montado al lado del
 * cañaveral que lo alimenta. Todo lo que hay aquí está por una razón física:
 *
 *   · La enramada es ALTA (2,95 m al alero, 5,0 m al caballete) y ABIERTA por
 *     los lados. No es un capricho de diseño: adentro hay una hornilla prendida
 *     todo el día. El techo alto y los costados libres son los que sacan el
 *     calor, el humo y el vapor. Un trapiche con techo bajo y cerrado no se
 *     aguanta — y por eso el caballete va ALZADO, con su boquete para que el
 *     humo salga por arriba.
 *   · La molienda va sobre una BANCADA elevada. Tampoco es capricho: el guarapo
 *     baja a las pailas POR GRAVEDAD, así que el molino tiene que quedar más
 *     alto que la hornilla o el jugo no corre.
 *   · La hornilla es UNA sola cámara larga con la boca en un extremo y la
 *     chimenea en el otro. Las pailas se ordenan según el calor que reciben:
 *     la más lejos del fuego (junto a la chimenea) es la más fría y es donde
 *     ENTRA el jugo; la de al lado del fuego es la del punteo. El jugo camina
 *     hacia el fuego mientras se concentra. Por eso el mundo se lee de
 *     izquierda a derecha: caña → molienda → guarapo → pailas → gaveras.
 *   · El bagazo sale de la molienda mojado, se apila a secar, y seco vuelve
 *     como COMBUSTIBLE de la misma hornilla. El trapiche se calienta solo: ese
 *     es el dato más bonito del oficio y hay que poderlo VER — por eso hay tres
 *     montones de bagazo distintos en la escena, en tres estados.
 *
 * TÉCNICA: las piezas repetidas (postes, pares del techo, tallos del arrume,
 * fibras del bagazo, celdas de la gavera) se FUSIONAN en una geometría por
 * conjunto — el esqueleto entero de la enramada es UNA draw-call en vez de
 * veintiséis. El color va horneado en vertexColors, así que todo comparte un
 * material mate y las pailas otro metálico.
 *
 * ⚠️ Todo pasa por `fusionarSeguro`: mezclar indexadas con no-indexadas devuelve
 * null EN SILENCIO y la pieza no se dibuja sin dar error.
 *
 * Aquí viven SOLO los datos y las mallas (nada de WebGL): corre headless.
 */
import * as THREE from 'three';
import {
  rng,
  ruidoFbm,
  fusionarSeguro,
  poner,
  pintarPorVertice,
  pintarPlano,
  matojoHoja,
} from '../bosque/sombreadoVegetal.js';
import { PAL as PAL_CANA, VARIEDADES } from './floraCana.geom.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* -------------------------------------------------------------------------- */
/*  Las medidas de la enramada (todo el mundo se cuelga de aquí)               */
/* -------------------------------------------------------------------------- */

export const ENRAMADA = {
  medioX: 6.6, // media luz de la nave (x)
  medioZ: 4.4, // media profundidad (z)
  alero: 2.95, // altura al alero — un trapiche NO es de techo bajo
  cumbre: 5.0, // altura al caballete
  vuelo: 0.55, // el volado del techo por fuera del alero
};

/* Dónde queda cada oficio dentro de la enramada (coords locales del trapiche).
   Se exportan porque la escena los usa para los focos de la lección, el fuego,
   el vapor y la fauna: una sola fuente de verdad para el sitio de cada cosa. */
export const SITIOS = {
  arrume: /** @type {[number,number,number]} */ ([-5.9, 0, 2.6]), // la caña cortada
  molienda: /** @type {[number,number,number]} */ ([-4.2, 0, -1.2]),
  canoa: /** @type {[number,number,number]} */ ([-1.5, 1.28, -1.25]), // el guarapo corriendo
  hornilla: /** @type {[number,number,number]} */ ([2.35, 0, -1.4]),
  boca: /** @type {[number,number,number]} */ ([5.45, 0.46, -1.4]), // la candela
  chimenea: /** @type {[number,number,number]} */ ([-0.6, 0, -1.4]),
  moldeo: /** @type {[number,number,number]} */ ([4.3, 0, 2.6]),
  bagacera: /** @type {[number,number,number]} */ ([8.2, 0, 2.0]), // el bagazo secando
};

/* Las cuatro pailas, de la MÁS FRÍA (junto a la chimenea, donde entra el jugo)
   a la MÁS CALIENTE (junto al fuego, donde se puntea). El orden IMPORTA: es la
   lección entera del mundo. */
export const PAILAS = [
  { x: 0.55, r: 0.50, oficio: 'clarificación', hervor: 0.25 },
  { x: 1.70, r: 0.50, oficio: 'evaporación', hervor: 0.85 },
  { x: 2.85, r: 0.50, oficio: 'evaporación', hervor: 1.0 },
  { x: 4.00, r: 0.48, oficio: 'punteo', hervor: 0.7 },
];
export const PAILA_Z = -1.4;
export const PAILA_Y = 1.05; // la boca de la paila, al ras del bloque

/* Las celdas de la gavera de adelante, en coordenadas del MOLDEO (la escena les
   mete la panela cuajándose). Se calculan aquí para que el molde y el bloque no
   se puedan desalinear: una sola cuenta, no dos. */
const GAVERA = { ox: 0.42, oz: 0.3, largo: 1.28, celdas: 6, y: 0.935 };
export const CELDAS_GAVERA = Array.from({ length: GAVERA.celdas }, (_, i) => {
  const paso = GAVERA.largo / GAVERA.celdas;
  return /** @type {[number,number,number]} */ ([
    GAVERA.ox - GAVERA.largo / 2 + (i + 0.5) * paso,
    GAVERA.y,
    GAVERA.oz,
  ]);
});

/* -------------------------------------------------------------------------- */
/*  Paleta del trapiche                                                        */
/* -------------------------------------------------------------------------- */

export const PAL = {
  madera: '#7a5a38', // el horcón rollizo, sin cepillar
  maderaClara: '#a98a5c', // tabla curada: mesa, canoa, gavera
  maderaOscura: '#5a4326', // viga vieja, ahumada por años de hornilla
  maderaHumo: '#4a3a26', // lo que queda encima de la hornilla: negro de humo

  teja: '#b0603f', // teja de barro cocido
  tejaSombra: '#8f4b31',
  tejaMusgo: '#7d6a44', // la teja vieja se ensucia y le sale verdín

  ladrillo: '#a35a3c', // la mampostería de la hornilla
  ladrilloClaro: '#bd7350',
  hollin: '#2e2620', // el tizne alrededor de la boca del horno
  cal: '#efe7d8', // el repello encalado del cuerpo de la hornilla

  hierro: '#6f6a63', // las masas del molino, el eje
  hierroLuz: '#9a948b',
  cobre: '#b2673a', // la paila vieja de cobre
  cobreLuz: '#d89257',
  aluminio: '#a7a49c', // la paila nueva, de aluminio fundido

  bagazo: '#c2a464', // la fibra exprimida — paja clara, no café
  bagazoSeco: '#dcc48a',
  bagazoHumedo: '#8e7442',

  guarapo: '#b6a63e', // el jugo crudo: verdoso turbio, NO ámbar
  cachaza: '#8f9a55', // la espuma verdosa que se retira
  miel: '#a85f16', // la miel ya concentrada
  panela: '#8a4a12', // el bloque cuajado
  panelaLuz: '#c2802c',

  tierra: '#8a6a44',
};

/* -------------------------------------------------------------------------- */
/*  Helpers de madera                                                          */
/* -------------------------------------------------------------------------- */

/** Un rollizo de madera con veta horneada y el pie oscurecido por el contacto. */
function palo(geo, { claro = PAL.maderaClara, oscuro = PAL.maderaOscura, grano = 4.5, humo = 0 } = {}) {
  const cA = new THREE.Color(oscuro);
  const cB = new THREE.Color(claro);
  const cHumo = new THREE.Color(PAL.maderaHumo);
  const tmp = new THREE.Color();
  return pintarPorVertice(geo, (x, y, z) => {
    // veta: mucha frecuencia alrededor, poca a lo largo → la fibra corre derecha
    const v = ruidoFbm(x * grano * 2, y * grano * 0.4, z * grano * 2);
    tmp.copy(cA).lerp(cB, clamp(v * 1.55, 0, 1));
    // contacto con el piso: el pie del poste vive en penumbra y en barro
    tmp.multiplyScalar(0.6 + 0.4 * clamp(y / 1.2, 0, 1));
    // lo que está encima de la hornilla lleva años recibiendo humo
    if (humo > 0) tmp.lerp(cHumo, humo * clamp((y - 2.2) / 2.4, 0, 1));
    return tmp;
  });
}

/** Un poste rollizo (ligeramente cónico, como un palo de monte descortezado). */
function horcon(r0, r1, h, seg = 7) {
  return new THREE.CylinderGeometry(r1, r0, h, seg, 1);
}

/* -------------------------------------------------------------------------- */
/*  1) El ESQUELETO de la enramada: horcones, soleras, cumbrera y pares        */
/* -------------------------------------------------------------------------- */

export function geomEsqueletoEnramada({ q = 1 } = {}, semilla = 201) {
  const r = rng(semilla);
  const { medioX, medioZ, alero, cumbre } = ENRAMADA;
  const partes = [];

  /* Los HORCONES de los costados. Van rollizos y no perfectamente a plomo: son
     palos de monte parados a pulso, no perfiles de acero. */
  const xs = [-medioX + 0.4, -2.1, 2.1, medioX - 0.4];
  xs.forEach((x, i) => {
    [-medioZ + 0.2, medioZ - 0.2].forEach((z) => {
      const g = horcon(0.155, 0.125, alero, q > 0.8 ? 8 : 6);
      poner(
        g,
        [x + (r() - 0.5) * 0.1, alero * 0.5, z + (r() - 0.5) * 0.1],
        [(r() - 0.5) * 0.03, r() * 3, (r() - 0.5) * 0.03],
      );
      partes.push(palo(g, { humo: i >= 2 ? 0.5 : 0.15 }));
    });
  });

  /* Los dos horcones ALTOS de los hastiales, que cargan la cumbrera. */
  [-medioX - 0.1, medioX + 0.1].forEach((x, i) => {
    const g = horcon(0.17, 0.13, cumbre, q > 0.8 ? 8 : 6);
    poner(g, [x, cumbre * 0.5, 0], [0, r() * 3, 0]);
    partes.push(palo(g, { humo: i === 1 ? 0.6 : 0.2 }));
  });

  /* SOLERAS (las vigas que corren sobre los horcones) y CUMBRERA. */
  [-medioZ + 0.2, medioZ - 0.2].forEach((z) => {
    const g = new THREE.BoxGeometry(medioX * 2 + 0.5, 0.17, 0.21);
    poner(g, [0, alero + 0.06, z]);
    partes.push(palo(g, { humo: 0.35 }));
  });
  const cum = new THREE.BoxGeometry(medioX * 2 + 0.7, 0.22, 0.24);
  poner(cum, [0, cumbre + 0.05, 0]);
  partes.push(palo(cum, { humo: 0.7 }));

  /* TIRANTES: los travesaños que amarran la nave de lado a lado. De ellos
     cuelgan el bombillo, la ruana y todo lo que hay que tener a mano. */
  [-4.1, 0, 4.1].forEach((x) => {
    const g = new THREE.BoxGeometry(0.15, 0.15, medioZ * 2 - 0.2);
    poner(g, [x, alero + 0.02, 0]);
    partes.push(palo(g, { humo: 0.5 }));
  });

  /* Los PARES del techo: de la solera a la cumbrera, a lado y lado. */
  const nPares = Math.max(5, Math.round(9 * q));
  const largo = Math.hypot(medioZ, cumbre - alero) + ENRAMADA.vuelo;
  const angulo = Math.atan2(cumbre - alero, medioZ);
  for (let i = 0; i < nPares; i++) {
    const x = -medioX + (i / (nPares - 1)) * medioX * 2;
    [1, -1].forEach((lado) => {
      const g = new THREE.BoxGeometry(0.10, 0.12, largo);
      // centro del par: a mitad de la pendiente, corrido por el volado
      const zc = lado * (medioZ * 0.5 + ENRAMADA.vuelo * 0.5 * Math.cos(angulo));
      const yc = (alero + cumbre) * 0.5 - ENRAMADA.vuelo * 0.5 * Math.sin(angulo) + 0.14;
      poner(g, [x, yc, zc], [lado * angulo, 0, 0]);
      partes.push(palo(g, { humo: 0.55 }));
    });
  }

  return fusionarSeguro(partes, 'esqueleto-enramada');
}

/* -------------------------------------------------------------------------- */
/*  2) El TECHO de teja                                                        */
/* -------------------------------------------------------------------------- */

export function geomTechoEnramada({ q = 1 } = {}, semilla = 202) {
  const r = rng(semilla);
  const { medioX, medioZ, alero, cumbre, vuelo } = ENRAMADA;
  const partes = [];
  const angulo = Math.atan2(cumbre - alero, medioZ);
  const pendiente = Math.hypot(medioZ, cumbre - alero) + vuelo;

  const cTeja = new THREE.Color(PAL.teja);
  const cSombra = new THREE.Color(PAL.tejaSombra);
  const cMusgo = new THREE.Color(PAL.tejaMusgo);
  const tmp = new THREE.Color();

  /* Las dos aguas. El color se hornea con el CANAL de la teja: franjas a lo
     largo de la pendiente, para que el techo se lea como teja de barro y no
     como una lámina plana. */
  [1, -1].forEach((lado) => {
    const g = new THREE.BoxGeometry(medioX * 2 + 0.9, 0.11, pendiente, 1, 1, Math.max(4, Math.round(14 * q)));
    pintarPorVertice(g, (x, y, z) => {
      // la onda de la teja corre a lo largo de la pendiente (eje x del techo)
      const canal = 0.5 + 0.5 * Math.sin(x * 7.4);
      tmp.copy(cSombra).lerp(cTeja, canal);
      // las hiladas: cada teja se monta sobre la de abajo y hace su sombrita
      const hilada = 0.5 + 0.5 * Math.sin(z * 9.2);
      tmp.multiplyScalar(0.84 + 0.16 * hilada);
      // verdín en la parte baja, donde escurre y no le da el sol
      const bajo = smoothstep(0, pendiente * 0.45, z * lado + pendiente * 0.5);
      tmp.lerp(cMusgo, (1 - bajo) * 0.3 * ruidoFbm(x * 0.9 + 4, z * 0.9, 0.5));
      const n = ruidoFbm(x * 1.6 + 7, z * 1.6, 2.5);
      tmp.multiplyScalar(0.9 + n * 0.2);
      return tmp;
    });
    const zc = lado * (medioZ * 0.5 + vuelo * 0.5 * Math.cos(angulo));
    const yc = (alero + cumbre) * 0.5 - vuelo * 0.5 * Math.sin(angulo) + 0.26;
    poner(g, [(r() - 0.5) * 0.06, yc, zc], [lado * angulo, 0, 0]);
    partes.push(g);
  });

  /* EL CABALLETE ALZADO. La pieza que más dice de un trapiche: la cumbrera va
     montada EN ALTO sobre la cumbre, dejando un boquete corrido por donde se
     escapan el humo y el vapor. Sin esa rendija, adentro no se puede trabajar. */
  [1, -1].forEach((lado) => {
    const g = new THREE.BoxGeometry(medioX * 2 + 0.4, 0.09, 1.45);
    pintarPorVertice(g, (x) => {
      const canal = 0.5 + 0.5 * Math.sin(x * 7.4);
      return tmp.copy(cSombra).lerp(cTeja, canal).multiplyScalar(0.96);
    });
    poner(g, [0, cumbre + 0.62, lado * 0.62], [lado * 0.5, 0, 0]);
    partes.push(g);
  });
  // los cuatro pies que levantan el caballete (por ahí sale el humo)
  [-medioX + 1, -1.8, 1.8, medioX - 1].forEach((x) => {
    const g = new THREE.BoxGeometry(0.09, 0.6, 0.09);
    poner(g, [x, cumbre + 0.34, 0]);
    partes.push(palo(g, { humo: 0.9 }));
  });

  return fusionarSeguro(partes, 'techo-enramada');
}

/* -------------------------------------------------------------------------- */
/*  3) La MOLIENDA: el molino de tres masas sobre su bancada                   */
/* -------------------------------------------------------------------------- */

/* El molino es la única pieza sin azar: sus medidas las manda la mecánica (las
   tres masas tienen que quedar tangentes o no muerden la caña), no un ruido. */
export function geomMolienda({ q = 1 } = {}) {
  const partes = [];
  const BANCADA = 0.85; // el molino va ALTO: el guarapo baja por gravedad

  /* La bancada de mampostería. */
  const base = new THREE.BoxGeometry(2.3, BANCADA, 1.9);
  poner(base, [0, BANCADA * 0.5, 0]);
  partes.push(
    pintarPorVertice(base, (x, y, z, i, c) =>
      c
        .set(PAL.ladrillo)
        .lerp(new THREE.Color(PAL.ladrilloClaro), ruidoFbm(x * 3 + 1, y * 3, z * 3))
        .multiplyScalar(0.72 + 0.28 * clamp(y / BANCADA, 0, 1)),
    ),
  );

  /* EL CASTILLO: el bastidor de hierro que aguanta las masas. Un molino de
     trapiche trabaja a una presión bestia; el marco es lo más macizo que hay. */
  [-0.62, 0.62].forEach((z) => {
    const g = new THREE.BoxGeometry(1.5, 1.15, 0.16);
    poner(g, [0, BANCADA + 0.58, z]);
    partes.push(pintarPlano(g, PAL.hierro));
  });
  const techoCastillo = new THREE.BoxGeometry(1.6, 0.15, 1.5);
  poner(techoCastillo, [0, BANCADA + 1.2, 0]);
  partes.push(pintarPlano(techoCastillo, PAL.hierroLuz));

  /* LAS TRES MASAS (los rodillos). Van estriadas a lo largo: esas ranuras son
     las que muerden la caña y la arrastran. Sin estrías, el molino patina. */
  const cHierro = new THREE.Color(PAL.hierro);
  const cLuz = new THREE.Color(PAL.hierroLuz);
  const tmp = new THREE.Color();
  [-0.34, 0, 0.34].forEach((z, i) => {
    const g = new THREE.CylinderGeometry(0.165, 0.165, 0.62, q > 0.8 ? 22 : 12, 1);
    poner(g, [i === 1 ? 0.02 : 0, BANCADA + 0.55, z], [Math.PI / 2, 0, 0]);
    pintarPorVertice(g, (x, y) => {
      // estrías: franjas alrededor del rodillo (su eje corre en z)
      const ang = Math.atan2(y - (BANCADA + 0.55), x);
      const estria = 0.5 + 0.5 * Math.sin(ang * 26);
      tmp.copy(cHierro).lerp(cLuz, estria * 0.55);
      // el rodillo del medio es el que más muele: queda pulido y con guarapo
      if (i === 1) tmp.lerp(new THREE.Color(PAL.guarapo), 0.16);
      return tmp;
    });
    partes.push(g);
    // los piñones de arriba, que sincronizan las tres masas
    const p = new THREE.CylinderGeometry(0.19, 0.19, 0.085, q > 0.8 ? 16 : 9, 1);
    poner(p, [0, BANCADA + 1.06, z], [Math.PI / 2, 0, 0]);
    partes.push(pintarPlano(p, PAL.hierroLuz));
  });

  /* LA MESA DE ALIMENTACIÓN: por ahí se le mete la caña al molino, y por el
     otro lado sale el bagazo. Tabla curada de tanto pasarle caña encima. */
  const mesa = new THREE.BoxGeometry(1.35, 0.09, 1.25);
  poner(mesa, [-1.35, BANCADA + 0.5, 0], [0, 0, 0.1]);
  partes.push(palo(mesa, { claro: PAL.maderaClara, grano: 7 }));
  [-1.85, -0.9].forEach((x) => {
    const g = new THREE.BoxGeometry(0.09, 0.5, 0.09);
    poner(g, [x, BANCADA + 0.25, -0.55]);
    partes.push(palo(g));
    const g2 = new THREE.BoxGeometry(0.09, 0.5, 0.09);
    poner(g2, [x, BANCADA + 0.25, 0.55]);
    partes.push(palo(g2));
  });
  // la bandeja de salida del bagazo, del otro lado
  const salida = new THREE.BoxGeometry(1.0, 0.08, 1.1);
  poner(salida, [1.2, BANCADA + 0.34, 0], [0, 0, -0.22]);
  partes.push(palo(salida, { claro: PAL.maderaClara }));

  /* EL MOTOR y su correa. Hoy casi todo trapiche de finca muele con motor; la
     yunta de bueyes dando vueltas al palanquín es la forma vieja, y todavía se
     ve, pero dibujar la de hoy es lo honesto. */
  const motor = new THREE.BoxGeometry(0.62, 0.46, 0.42);
  poner(motor, [-0.15, 0.28, -1.55]);
  partes.push(pintarPlano(motor, PAL.hierro));
  const patin = new THREE.BoxGeometry(0.8, 0.14, 0.6);
  poner(patin, [-0.15, 0.07, -1.55]);
  partes.push(pintarPlano(patin, PAL.tierra));
  // polea del motor y polea del molino
  const pol1 = new THREE.CylinderGeometry(0.17, 0.17, 0.07, 14, 1);
  poner(pol1, [0.28, 0.34, -1.55], [0, 0, Math.PI / 2]);
  partes.push(pintarPlano(pol1, PAL.hierroLuz));
  const pol2 = new THREE.CylinderGeometry(0.30, 0.30, 0.07, q > 0.8 ? 18 : 10, 1);
  poner(pol2, [0.28, BANCADA + 0.55, -0.78], [0, 0, Math.PI / 2]);
  partes.push(pintarPlano(pol2, PAL.hierroLuz));
  // la correa: dos tramos rectos entre las poleas
  const dy = BANCADA + 0.55 - 0.34;
  const dz = -0.78 + 1.55;
  const largoC = Math.hypot(dy, dz);
  [-0.17, 0.17].forEach((off) => {
    const g = new THREE.BoxGeometry(0.05, largoC, 0.05);
    poner(g, [0.28, 0.34 + dy * 0.5, -1.55 + dz * 0.5 + off * 0.9], [Math.atan2(dz, dy), 0, 0]);
    partes.push(pintarPlano(g, PAL.hollin));
  });

  return fusionarSeguro(partes, 'molienda');
}

/* -------------------------------------------------------------------------- */
/*  4) La CANOA del guarapo (con su prelimpiador)                              */
/* -------------------------------------------------------------------------- */

/**
 * El canal de madera que lleva el jugo del molino a la primera paila. Va en
 * BAJADA: el guarapo corre solo. En el camino pasa por el prelimpiador, un
 * cajón donde se quedan la tierra, el bagacillo y la hoja que se colaron.
 */
export function geomCanoaGuarapo() {
  const partes = [];
  const largo = 3.9;
  const caida = 0.22;

  // el fondo y las dos paredes del canal
  const fondo = new THREE.BoxGeometry(largo, 0.06, 0.30);
  poner(fondo, [0, 0, 0], [0, 0, -Math.atan2(caida, largo)]);
  partes.push(palo(fondo, { claro: PAL.maderaClara }));
  [-0.17, 0.17].forEach((z) => {
    const g = new THREE.BoxGeometry(largo, 0.17, 0.05);
    poner(g, [0, 0.09, z], [0, 0, -Math.atan2(caida, largo)]);
    partes.push(palo(g, { claro: PAL.maderaClara }));
  });
  // los caballetes que la sostienen
  [-largo * 0.36, largo * 0.34].forEach((x, i) => {
    const h = 1.15 - i * 0.1;
    [-0.2, 0.2].forEach((z) => {
      const g = new THREE.BoxGeometry(0.07, h, 0.07);
      poner(g, [x, -h * 0.5 - 0.05, z]);
      partes.push(palo(g));
    });
  });
  // EL PRELIMPIADOR: el cajón que atrapa la basurita antes de que llegue al fuego
  const caja = new THREE.BoxGeometry(0.62, 0.34, 0.52);
  poner(caja, [-0.2, -0.06, 0]);
  partes.push(palo(caja, { claro: PAL.maderaClara, grano: 6 }));

  return fusionarSeguro(partes, 'canoa-guarapo');
}

/* -------------------------------------------------------------------------- */
/*  5) La HORNILLA y su chimenea                                               */
/* -------------------------------------------------------------------------- */

export function geomHornilla({ q = 1 } = {}, semilla = 205) {
  const partes = [];
  const x0 = -0.35;
  const x1 = 5.05;
  const largo = x1 - x0;
  const cx = (x0 + x1) * 0.5;
  const ancho = 1.5;
  const alto = 1.05;

  const cLadrillo = new THREE.Color(PAL.ladrillo);
  const cClaro = new THREE.Color(PAL.ladrilloClaro);
  const cCal = new THREE.Color(PAL.cal);
  const cHollin = new THREE.Color(PAL.hollin);
  const tmp = new THREE.Color();

  /* EL CUERPO: un bloque largo de mampostería, repellado y encalado por partes,
     con el TIZNE que se acumula alrededor de la boca del horno. Ese degradado a
     negro hacia el extremo del fuego es lo que hace que se lea "aquí quema". */
  const cuerpo = new THREE.BoxGeometry(largo, alto, ancho, Math.max(6, Math.round(20 * q)), 3, 3);
  poner(cuerpo, [cx - cx, alto * 0.5, 0]); // se coloca luego desde la escena
  pintarPorVertice(cuerpo, (x, y, z) => {
    const wx = x + cx;
    const n = ruidoFbm(wx * 2.6 + 3, y * 2.6, z * 2.6);
    tmp.copy(cLadrillo).lerp(cClaro, n);
    // el repello de cal, comido a manchas
    tmp.lerp(cCal, smoothstep(0.42, 0.85, ruidoFbm(wx * 1.1 + 9, y * 1.1, z * 1.1)) * 0.55);
    // EL TIZNE: crece hacia la boca del horno (el extremo +x) y hacia arriba
    const cerca = smoothstep(1.6, 5.0, wx);
    const arriba = clamp(y / alto, 0, 1);
    tmp.lerp(cHollin, cerca * (0.35 + 0.5 * arriba));
    // sombra de contacto contra el piso
    tmp.multiplyScalar(0.68 + 0.32 * arriba);
    return tmp;
  });
  partes.push(cuerpo);

  /* La cornisa: el reborde donde se apoyan las pailas. */
  const cornisa = new THREE.BoxGeometry(largo + 0.16, 0.1, ancho + 0.16);
  poner(cornisa, [0, alto - 0.03, 0]);
  partes.push(
    pintarPorVertice(cornisa, (x) => {
      const cerca = smoothstep(1.6, 5.0, x + cx);
      return tmp.copy(cClaro).lerp(cHollin, cerca * 0.7);
    }),
  );

  /* LA BOCA DEL HORNO, en el extremo caliente: el arco por donde se le echa el
     bagazo. Se dibuja como un recuadro hundido y renegrido; la candela la pone
     la escena encima (FuegoHornilla). */
  const marco = new THREE.BoxGeometry(0.22, 0.78, 0.92);
  poner(marco, [x1 - cx + 0.06, 0.45, 0]);
  partes.push(pintarPlano(marco, PAL.ladrillo));
  const hueco = new THREE.BoxGeometry(0.30, 0.60, 0.70);
  poner(hueco, [x1 - cx + 0.10, 0.44, 0]);
  partes.push(pintarPlano(hueco, PAL.hollin));
  // el delantal de ceniza y brasa en el piso, frente a la boca
  const ceniza = matojoHoja(0.55, semilla + 3, 0.35);
  poner(ceniza, [x1 - cx + 0.62, 0.03, 0], [0, 0, 0], [1.5, 0.14, 1.3]);
  partes.push(pintarPlano(ceniza, '#4a423a'));

  /* LA CHIMENEA: el tiro que arrastra el humo a lo largo de toda la cámara y lo
     saca por encima del techo. Va en el extremo FRÍO, al otro lado del fuego —
     por eso la paila de allá es la más templada y es donde entra el jugo. */
  const xCh = SITIOS.chimenea[0] - SITIOS.hornilla[0];
  const cana = new THREE.BoxGeometry(0.8, 6.6, 0.8, 1, Math.max(4, Math.round(12 * q)), 1);
  poner(cana, [xCh, 3.3, 0]);
  pintarPorVertice(cana, (x, y, z) => {
    const n = ruidoFbm(x * 3 + 5, y * 1.4, z * 3);
    tmp.copy(cLadrillo).lerp(cClaro, n);
    tmp.lerp(cCal, 0.3);
    // el tizne baja desde la boca de arriba: el humo mancha su propia chimenea
    tmp.lerp(cHollin, smoothstep(4.6, 6.6, y) * 0.5);
    tmp.multiplyScalar(0.74 + 0.26 * clamp(y / 3, 0, 1));
    return tmp;
  });
  partes.push(cana);
  // el collarín donde la chimenea atraviesa el techo (la babeta de siempre)
  const collar = new THREE.BoxGeometry(1.04, 0.2, 1.04);
  poner(collar, [xCh, 4.42, 0]);
  partes.push(pintarPlano(collar, PAL.tejaSombra));
  // la capucha de arriba, para que no le entre el agua
  const capucha = new THREE.BoxGeometry(1.1, 0.16, 1.1);
  poner(capucha, [xCh, 6.72, 0]);
  partes.push(pintarPlano(capucha, PAL.hollin));

  return fusionarSeguro(partes, 'hornilla');
}

/* -------------------------------------------------------------------------- */
/*  6) Las PAILAS (metal: van con su propio material)                          */
/* -------------------------------------------------------------------------- */

/**
 * El tren de pailas. Dos de COBRE viejo y dos de ALUMINIO: es lo que se ve de
 * verdad en una enramada — el cobre heredado conviviendo con las nuevas.
 */
export function geomPailas({ q = 1 } = {}) {
  const partes = [];
  const seg = q > 0.8 ? 22 : 12;
  const cCobre = new THREE.Color(PAL.cobre);
  const cCobreLuz = new THREE.Color(PAL.cobreLuz);
  const cAlu = new THREE.Color(PAL.aluminio);
  const cHollin = new THREE.Color(PAL.hollin);
  const tmp = new THREE.Color();

  PAILAS.forEach((p, i) => {
    const cobre = i === 1 || i === 3; // las viejas, salteadas
    const base = cobre ? cCobre : cAlu;
    const luz = cobre ? cCobreLuz : new THREE.Color('#c8c4bb');

    /* El fondo: media esfera achatada. Una paila panelera es ancha y poco
       honda — así el jugo evapora rápido y se puede espumar cómodo. */
    const bol = new THREE.SphereGeometry(p.r, seg, Math.max(5, Math.round(10 * q)), 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    poner(bol, [p.x, PAILA_Y, PAILA_Z], [0, 0, 0], [1, 0.62, 1]);
    pintarPorVertice(bol, (_x, y) => {
      const hondo = clamp((PAILA_Y - y) / (p.r * 0.62), 0, 1);
      tmp.copy(base).lerp(luz, 1 - hondo);
      // por debajo la paila está negra: ahí le pega la llama todo el día
      tmp.lerp(cHollin, Math.pow(hondo, 1.6) * 0.75);
      return tmp;
    });
    partes.push(bol);

    /* El aro del borde, martillado y brillante de tanto rozarlo. */
    const aro = new THREE.TorusGeometry(p.r, 0.042, 6, seg);
    poner(aro, [p.x, PAILA_Y, PAILA_Z], [Math.PI / 2, 0, 0]);
    partes.push(pintarPlano(aro, luz));
  });

  return fusionarSeguro(partes, 'pailas');
}

/* -------------------------------------------------------------------------- */
/*  7) El BAGAZO — la caña que calienta su propia miel                         */
/* -------------------------------------------------------------------------- */

/**
 * Un montón de bagazo. NO es un montículo liso: el bagazo es FIBRA aplastada,
 * y lo que lo delata son las hebras tiesas que se salen del montón por todos
 * lados. Sin las hebras parece un montón de arena.
 *
 * @param {object} o
 * @param {number} o.radio
 * @param {number} o.alto
 * @param {'humedo'|'secando'|'seco'} o.estado
 * @param {number} [o.q]
 * @param {number} [o.semilla]
 */
export function geomBagazo({ radio, alto, estado, q = 1, semilla = 207 }) {
  const r = rng(semilla);
  const partes = [];
  const col =
    estado === 'humedo' ? PAL.bagazoHumedo : estado === 'seco' ? PAL.bagazoSeco : PAL.bagazo;
  const cBase = new THREE.Color(col);
  const cAlto = new THREE.Color(estado === 'humedo' ? PAL.bagazo : PAL.bagazoSeco);
  const tmp = new THREE.Color();

  /* El cuerpo del montón: dos o tres masas deformadas, no una cúpula perfecta
     (un montón de bagazo lo hace una pala, no un compás). */
  const nMasas = q > 0.8 ? 3 : 2;
  for (let i = 0; i < nMasas; i++) {
    /* El achatado se calcula contra el RADIO de la masa, no contra el radio
       nominal del montón: si no, el montón se hunde medio metro bajo el piso y
       el bagazo aparece enterrado. Centro a 0,42·alto y semialtura ≈ 0,28·alto
       dejan el montón apoyado en el suelo y de la altura pedida. */
    const rMasa = radio * (0.72 + r() * 0.35);
    const g = matojoHoja(rMasa, semilla + i * 5, 0.44);
    poner(
      g,
      [(r() - 0.5) * radio * 0.7, alto * 0.42, (r() - 0.5) * radio * 0.6],
      [r() * 0.3, r() * 3, r() * 0.3],
      [1.15, alto / (rMasa * 1.9), 1.05],
    );
    pintarPorVertice(g, (x, y) => {
      tmp.copy(cBase).lerp(cAlto, clamp(y / Math.max(0.1, alto), 0, 1));
      const n = ruidoFbm(x * 4 + 2, y * 4, 1.5);
      return tmp.multiplyScalar(0.82 + n * 0.36);
    });
    partes.push(g);
  }

  /* LAS HEBRAS: lo que convierte un montón en BAGAZO. Tiesas, sueltas y en
     todas las direcciones — es fibra de caña exprimida, no paja peinada. */
  const nHebras = Math.max(8, Math.round(26 * q));
  for (let i = 0; i < nHebras; i++) {
    const ang = r() * Math.PI * 2;
    const rad = radio * (0.25 + r() * 0.8);
    const largo = 0.22 + r() * 0.42;
    const g = new THREE.BoxGeometry(largo, 0.018, 0.03);
    poner(
      g,
      [Math.cos(ang) * rad, alto * (0.25 + r() * 0.75), Math.sin(ang) * rad],
      [r() * 3, ang + (r() - 0.5), (r() - 0.5) * 1.7],
    );
    partes.push(pintarPlano(g, r() > 0.5 ? PAL.bagazoSeco : col));
  }

  return fusionarSeguro(partes, `bagazo-${estado}`);
}

/* -------------------------------------------------------------------------- */
/*  8) El ARRUME de caña cortada                                               */
/* -------------------------------------------------------------------------- */

/**
 * La caña ya cortada, esperando el molino. Va DESPUNTADA (sin cogollo ni hoja:
 * eso se deja en el lote) y arrumada de a montón. No puede esperar mucho: caña
 * cortada que se demora empieza a fermentar y la panela sale mala.
 */
export function geomArrumeCana({ q = 1 } = {}, semilla = 208) {
  const r = rng(semilla);
  const partes = [];
  const n = Math.max(9, Math.round(26 * q));
  const cols = VARIEDADES.map((v) => new THREE.Color(v.tinte[0], v.tinte[1], v.tinte[2]));
  const cCana = new THREE.Color(PAL_CANA.tallo);
  const cNudo = new THREE.Color(PAL_CANA.talloNudo);
  const tmp = new THREE.Color();

  for (let i = 0; i < n; i++) {
    const largo = 1.6 + r() * 0.55;
    const cap = Math.floor(i / Math.max(1, Math.ceil(n / 4))); // cuatro capas
    const g = new THREE.CylinderGeometry(0.028, 0.031, largo, 6, Math.max(6, Math.round(largo * 9 * q)));
    const y = 0.05 + cap * 0.062 + r() * 0.03;
    // cada capa cruzada sobre la anterior, como se arruma de verdad
    const giro = (cap % 2 === 0 ? 0.15 : 1.35) + (r() - 0.5) * 0.5;
    poner(
      g,
      [(r() - 0.5) * 1.2, y, (r() - 0.5) * 1.0],
      [Math.PI / 2 + (r() - 0.5) * 0.12, giro, (r() - 0.5) * 0.1],
    );
    // la variedad de cada caña + el anillo del nudo, que aquí se ve de cerca
    const variedad = cols[Math.floor(r() * cols.length)];
    pintarPorVertice(g, (x, yy, z) => {
      // el eje de la caña quedó tumbado: el nudo se lee sobre el eje largo
      const s = Math.cos(giro) * x + Math.sin(giro) * z;
      const f = s / 0.205;
      const medio = Math.abs(Math.sin(Math.PI * f));
      tmp.copy(cCana).lerp(cNudo, smoothstep(0.18, 0, medio) * 0.9);
      tmp.multiply(variedad);
      return tmp.multiplyScalar(0.72 + 0.28 * clamp((yy - 0.02) / 0.35, 0, 1));
    });
    partes.push(g);
  }

  return fusionarSeguro(partes, 'arrume-cana');
}

/* -------------------------------------------------------------------------- */
/*  9) El MOLDEO: mesa de batido y gaveras                                     */
/* -------------------------------------------------------------------------- */

/**
 * La zona donde la miel se vuelve panela: la canoa de batido (donde se bate
 * para que cristalice y aclare) y las GAVERAS — los moldes de madera con sus
 * celdas, que le dan al bloque la forma con la que uno la conoce.
 */
export function geomMoldeo({ q = 1 } = {}, semilla = 209) {
  const partes = [];
  const r = rng(semilla);

  /* LA MESA. Todo esto pasa a la altura de la cintura: se bate y se vacía de
     pie, rápido, antes de que la miel cuaje en la batea. */
  const tabla = new THREE.BoxGeometry(3.4, 0.1, 1.25);
  poner(tabla, [0, 0.86, 0]);
  partes.push(palo(tabla, { claro: PAL.maderaClara, grano: 8 }));
  [-1.5, 1.5].forEach((x) => {
    [-0.5, 0.5].forEach((z) => {
      const g = new THREE.BoxGeometry(0.1, 0.86, 0.1);
      poner(g, [x, 0.43, z]);
      partes.push(palo(g));
    });
  });

  /* LA CANOA DE BATIDO: batea honda de madera, a la izquierda de la mesa. */
  const fondo = new THREE.BoxGeometry(1.15, 0.08, 0.66);
  poner(fondo, [-1.05, 0.98, 0]);
  partes.push(palo(fondo, { claro: PAL.maderaClara }));
  [[-1.05, -0.37, 1.15, 0.06], [-1.05, 0.37, 1.15, 0.06]].forEach(([x, z, lx, lz]) => {
    const g = new THREE.BoxGeometry(lx, 0.24, lz);
    poner(g, [x, 1.09, z]);
    partes.push(palo(g, { claro: PAL.maderaClara }));
  });
  [[-1.63, 0], [-0.47, 0]].forEach(([x, z]) => {
    const g = new THREE.BoxGeometry(0.06, 0.24, 0.72);
    poner(g, [x, 1.09, z]);
    partes.push(palo(g, { claro: PAL.maderaClara }));
  });
  // EL MECEDOR: la paleta de madera con la que se bate. Recostada en la batea.
  const mango = new THREE.CylinderGeometry(0.022, 0.026, 1.05, 6, 1);
  poner(mango, [-0.62, 1.42, 0.2], [0, 0, -0.62]);
  partes.push(palo(mango, { claro: PAL.maderaClara }));
  const pala = new THREE.BoxGeometry(0.26, 0.05, 0.16);
  poner(pala, [-1.06, 1.05, 0.2], [0, 0, -0.62]);
  partes.push(palo(pala, { claro: PAL.maderaClara }));

  /* LAS GAVERAS: dos marcos de madera con sus celdas. La miel batida se vacía
     de una en una y ahí cuaja. Al enfriar, se voltea el molde y sale el bloque. */
  const gavera = (ox, oz, celdas) => {
    const largoG = 1.28;
    const anchoG = 0.42;
    const paso = largoG / celdas;
    // los dos largueros del marco
    [-anchoG / 2 - 0.025, anchoG / 2 + 0.025].forEach((z) => {
      const g = new THREE.BoxGeometry(largoG + 0.1, 0.11, 0.05);
      poner(g, [ox, 0.97, oz + z]);
      partes.push(palo(g, { claro: PAL.maderaClara, grano: 9 }));
    });
    // los tabiques que hacen las celdas (uno de más: los dos topes)
    for (let i = 0; i <= celdas; i++) {
      const g = new THREE.BoxGeometry(0.045, 0.11, anchoG);
      poner(g, [ox - largoG / 2 + i * paso, 0.97, oz]);
      partes.push(palo(g, { claro: PAL.maderaClara, grano: 9 }));
    }
    // el piso del molde
    const piso = new THREE.BoxGeometry(largoG + 0.1, 0.04, anchoG + 0.1);
    poner(piso, [ox, 0.915, oz]);
    partes.push(palo(piso, { claro: PAL.maderaClara }));
  };
  /* Dos gaveras sobre la mesa: la de adelante recién vaciada (la escena le pone
     la panela caliente adentro) y la de atrás todavía vacía, esperando turno. */
  gavera(0.42, 0.3, 6);
  gavera(0.52, -0.32, 6);

  /* EL ARRUME DE PANELA LISTA, en el extremo de la mesa: bloques cuajados y
     apilados, esperando el papel. */
  const nBloques = Math.max(4, Math.round(9 * q));
  const cPanela = new THREE.Color(PAL.panela);
  const cLuzP = new THREE.Color(PAL.panelaLuz);
  const tmp = new THREE.Color();
  for (let i = 0; i < nBloques; i++) {
    const cap = Math.floor(i / 3);
    const g = new THREE.BoxGeometry(0.2, 0.075, 0.13);
    poner(
      g,
      [1.42 + (i % 3) * 0.02, 0.955 + cap * 0.08, -0.28 + (i % 3) * 0.2 + (r() - 0.5) * 0.02],
      [0, (r() - 0.5) * 0.16, 0],
    );
    pintarPorVertice(g, (x, y) => tmp.copy(cPanela).lerp(cLuzP, clamp((y - 0.9) * 3, 0, 1) * 0.6));
    partes.push(g);
  }

  return fusionarSeguro(partes, 'moldeo');
}

/* -------------------------------------------------------------------------- */
/*  10) Los ÚTILES: la gente que no está dibujada pero se nota                 */
/* -------------------------------------------------------------------------- */

/**
 * En una molienda trabajan varias personas a la vez — el que arrima la caña, el
 * molinero, el HORNILLERO que manda el fuego y las pailas, el que espuma, el
 * GAVERERO que vacía los moldes. Aquí no se dibuja a nadie: se dibuja lo que
 * dejaron a mano. El sombrero colgado, el cucharón atravesado en la paila, la
 * pala clavada en el bagazo, la ruana en el tirante, los baldes. Un lugar se
 * siente habitado por sus cosas, no por muñecos.
 */
export function geomUtiles({ q = 1 } = {}, semilla = 210) {
  const partes = [];
  const r = rng(semilla);

  /* EL CUCHARÓN espumador, atravesado sobre la segunda paila. Con eso se retira
     la CACHAZA: la espuma verdosa que sube al calentar el jugo y que se lleva la
     suciedad. No se bota — se va para los animales o para el abono. */
  const cuchara = new THREE.SphereGeometry(0.17, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  poner(cuchara, [PAILAS[1].x + 0.3, PAILA_Y + 0.12, PAILA_Z - 0.1], [0, 0, 0], [1, 0.45, 1]);
  partes.push(pintarPlano(cuchara, PAL.aluminio));
  const palo1 = new THREE.CylinderGeometry(0.02, 0.024, 1.3, 6, 1);
  poner(palo1, [PAILAS[1].x - 0.32, PAILA_Y + 0.24, PAILA_Z - 0.1], [0, 0.2, Math.PI / 2 - 0.16]);
  partes.push(palo(palo1, { claro: PAL.maderaClara }));

  /* EL SOMBRERO en un horcón: el que llegó, se lo quitó y se metió al calor. */
  const copa = new THREE.CylinderGeometry(0.14, 0.16, 0.13, 12, 1);
  poner(copa, [-2.1, 2.35, 4.05], [0.35, 0, 0.1]);
  partes.push(pintarPlano(copa, '#d8c79a'));
  const ala = new THREE.CylinderGeometry(0.27, 0.27, 0.02, 14, 1);
  poner(ala, [-2.1, 2.29, 4.06], [0.35, 0, 0.1]);
  partes.push(pintarPlano(ala, '#cbb887'));

  /* LA RUANA doblada sobre el tirante. */
  const ruana = new THREE.BoxGeometry(0.5, 0.62, 0.09);
  poner(ruana, [-4.1, 2.62, 0.9], [0.06, 0, 0.04]);
  partes.push(pintarPlano(ruana, '#7d5a4a'));
  const ruana2 = new THREE.BoxGeometry(0.48, 0.4, 0.08);
  poner(ruana2, [-4.1, 2.66, 0.78], [-0.1, 0, 0]);
  partes.push(pintarPlano(ruana2, '#8e6a56'));

  /* LA PALA clavada en el bagazo de la boca del horno. */
  const cabo = new THREE.CylinderGeometry(0.022, 0.026, 1.35, 6, 1);
  poner(cabo, [5.95, 0.72, -0.3], [0.28, 0.4, 0.34]);
  partes.push(palo(cabo, { claro: PAL.maderaClara }));
  const hoja = new THREE.BoxGeometry(0.26, 0.02, 0.3);
  poner(hoja, [5.7, 0.14, -0.42], [0.28, 0.4, 0.34]);
  partes.push(pintarPlano(hoja, PAL.hierroLuz));

  /* Dos BALDES: uno con agua para las manos, otro para acarrear miel. */
  [
    { x: -2.6, z: 1.0, col: PAL.hierroLuz },
    { x: 3.0, z: 3.4, col: PAL.aluminio },
  ].forEach((b) => {
    const g = new THREE.CylinderGeometry(0.17, 0.13, 0.3, 10, 1, true);
    poner(g, [b.x, 0.15, b.z], [0, r() * 3, (r() - 0.5) * 0.12]);
    partes.push(pintarPlano(g, b.col));
  });

  /* EL MACHETE recostado en el arrume de caña. */
  const mCabo = new THREE.BoxGeometry(0.13, 0.035, 0.035);
  poner(mCabo, [-5.2, 0.42, 3.3], [0, 0.5, 1.15]);
  partes.push(pintarPlano(mCabo, PAL.maderaOscura));
  const mHoja = new THREE.BoxGeometry(0.52, 0.012, 0.07);
  poner(mHoja, [-5.32, 0.72, 3.36], [0, 0.5, 1.15]);
  partes.push(pintarPlano(mHoja, '#b8b4ac'));

  if (q > 0.55) {
    /* Un cajón de gaveras vacías esperando turno, apilado contra un horcón. */
    for (let i = 0; i < 3; i++) {
      const g = new THREE.BoxGeometry(1.2, 0.1, 0.42);
      poner(g, [2.2, 0.08 + i * 0.12, 3.9], [0, (r() - 0.5) * 0.2, 0]);
      partes.push(palo(g, { claro: PAL.maderaClara, grano: 9 }));
    }
  }

  return fusionarSeguro(partes, 'utiles-trapiche');
}
