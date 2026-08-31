/*
 * beneficos.geom — LA GEOMETRÍA DEL EJÉRCITO INVISIBLE, en funciones PURAS.
 *
 * three-core, corre headless: cero contexto GL, cero azar por frame (PRNG con
 * semilla), cero assets externos. La escena (`EscenaBeneficos.jsx`) le pone luz,
 * cadencia y la dinámica de `dinamicaPlaga.js`; acá solo vive la FORMA.
 *
 * ── REGISTRO: REALISTA (ver GUIA-RUBBERHOSE.md §1) ─────────────────────────
 * Esto es fauna secundaria del monte, no personajes. Por construcción, en este
 * archivo NO hay: ojos de goma, catchlight, contorno de tinta, chapetas,
 * sonrisas, ni miembros-manguera. Hay proporciones de bicho. El único ojo que
 * se dibuja es el de la crisopa (dorado, hemisférico, compuesto — anatomía, no
 * expresión) y el de los vertebrados, que son puntos oscuros sin brillo.
 * Si alguien viene a "darles vida" con una carita, está en el archivo
 * equivocado: eso vive en `creatures/`.
 *
 * ── LA REGLA DE ORO DEL DIBUJO ─────────────────────────────────────────────
 * Cada bicho se dibuja por su OFICIO, y el rasgo que lo hace reconocible en
 * campo manda sobre lo bonito:
 *   · la larva de mariquita → SEGMENTADA Y ALARGADA, con las manchas naranjas
 *     que el campesino tiene que aprender a ver. Es la protagonista.
 *   · la crisopa → sus huevos CON PEDICELO, que parecen alfileres.
 *   · la avispa → la CINTURA y el ovipositor; y su obra: LA MOMIA.
 *   · el sírfido → acá SOLO la larva (el adulto vive en `polinizadores/`).
 *   · Beauveria → la PELUSA BLANCA que cubre; Metarhizium → el VERDE.
 *
 * ── GAMA BAJA (el teléfono del campesino manda) ────────────────────────────
 * Todo es low-poly con vertex colors, para que la escena pueda fusionar
 * (`mergeGeometries`) o instanciar (`InstancedMesh`) y bajar a ~1 draw-call por
 * especie con UN material (`crearMaterialVertexColors`). Ninguna geometría de
 * acá pasa de unas decenas de triángulos: son bichos de 3mm vistos de cerca, no
 * héroes de cinemática. Los segmentos se piden por `det` (detalle por tier).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL } from './beneficosIdentidad.js';

/* -------------------------------------------------------------------------- */
/*  Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

/** PRNG determinista (misma huerta en cada carga; nada de Math.random). */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Detalle por tier: los segmentos de las primitivas. */
export const DET = {
  alto: { rad: 8, alt: 6, tubo: 6 },
  medio: { rad: 6, alt: 4, tubo: 4 },
  bajo: { rad: 5, alt: 3, tubo: 3 },
};
export const detDeTier = (tier) => DET[tier] || DET.medio;

/**
 * Pinta una geometría entera de un color (crea el atributo `color`).
 * Es lo que permite que 40 bichos distintos compartan UN material.
 */
export function pintar(geo, color) {
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** Coloca una geometría (escala → rota → traslada) y la devuelve. */
export function poner(geo, { pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1] } = {}) {
  const e = Array.isArray(esc) ? esc : [esc, esc, esc];
  geo.scale(e[0], e[1], e[2]);
  if (rot[0]) geo.rotateX(rot[0]);
  if (rot[1]) geo.rotateY(rot[1]);
  if (rot[2]) geo.rotateZ(rot[2]);
  geo.translate(pos[0], pos[1], pos[2]);
  return geo;
}

/** Fusiona piezas ya pintadas en una sola malla (el patrón floraParamo). */
export function fundir(piezas) {
  const buenas = piezas.filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  if (!buenas.length) return null;
  /* Sin `color` en todas, el merge devuelve null: se pinta ANTES de fundir. */
  return mergeGeometries(buenas, false);
}

/* Primitivas cortas, para que el dibujo se lea y no el boilerplate. */
const esfera = (r, d, c) => pintar(new THREE.SphereGeometry(r, d.rad, d.alt), c);
const capsula = (r, l, d, c) => pintar(new THREE.CapsuleGeometry(r, l, 2, d.rad), c);
const cono = (r, h, d, c) => pintar(new THREE.ConeGeometry(r, h, d.rad), c);
const cilindro = (r1, r2, h, d, c) =>
  pintar(new THREE.CylinderGeometry(r1, r2, h, Math.max(3, d.tubo)), c);
const plano = (w, h, c) => pintar(new THREE.PlaneGeometry(w, h), c);
const disco = (r, d, c) => pintar(new THREE.CircleGeometry(r, d.rad), c);

/* -------------------------------------------------------------------------- */
/*  LA PLAGA — el pulgón (la presa, y también la despensa)                     */
/* -------------------------------------------------------------------------- */

/*
 * Cuerpo de pera, blando, sin dureza, con los dos CORNÍCULOS traseros (los
 * tubitos que lo delatan como áfido) y las patas apenas insinuadas. Es
 * deliberadamente ANODINO: el pulgón no es el malo de una película, es un bicho
 * que hace lo suyo. El drama no lo pone su cara: lo pone SU NÚMERO.
 */
export function pulgonGeom(tier = 'medio', denso = false) {
  const d = detDeTier(tier);
  const col = denso ? PAL.pulgonDenso : PAL.pulgon;
  const p = [
    poner(esfera(0.5, d, col), { esc: [0.82, 0.78, 1] }),
    /* cabecita */
    poner(esfera(0.26, d, col), { pos: [0, -0.04, 0.46] }),
  ];
  if (tier !== 'bajo') {
    /* los cornículos: el rasgo de identificación del áfido */
    p.push(
      poner(cono(0.055, 0.24, d, col), { pos: [0.19, 0.16, -0.4], rot: [-0.5, 0, -0.2] }),
      poner(cono(0.055, 0.24, d, col), { pos: [-0.19, 0.16, -0.4], rot: [-0.5, 0, 0.2] }),
    );
  }
  return fundir(p);
}

/** La oruga (cogollero/medidor): el blanco del Bt y de la avispa. */
export function orugaGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const p = [];
  const segs = tier === 'bajo' ? 5 : 8;
  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1);
    /* Ahusada en las puntas, gorda en el medio: la silueta de oruga. */
    const r = 0.3 * (0.55 + 0.45 * Math.sin(Math.PI * t));
    p.push(poner(esfera(r, d, PAL.oruga), { pos: [0, 0, (t - 0.5) * 1.5] }));
  }
  return fundir(p);
}

/* -------------------------------------------------------------------------- */
/*  LA PROTAGONISTA — la larva de mariquita (EL COCODRILITO)                   */
/* -------------------------------------------------------------------------- */

/*
 * ESTE ES EL DIBUJO MÁS IMPORTANTE DE TODO EL MUNDO.
 *
 * "Como un gusanito alargado y oscuro con manchas", "un cocodrilito negro con
 * manchas naranjas, muy distinta al adulto redondo" — el campesino la ve, no la
 * reconoce, y la mata. Está matando a la mariquita que más pulgón le come.
 *
 * Todo acá está al servicio de que se lea, se recuerde y no se confunda:
 *   · SEGMENTADA y AHUSADA hacia la cola — la silueta de "cocodrilito", lo más
 *     lejos posible del domo redondo del adulto. La confusión es el enemigo:
 *     el dibujo tiene que gritar "NO me parezco a lo que vos conocés".
 *   · TUBÉRCULOS laterales (las verruguitas erizadas de cada segmento): el
 *     rasgo real que la hace ver "peligrosa" y que dispara el manotazo.
 *   · LAS MANCHAS NARANJAS en dos pares de segmentos: la marca que hay que
 *     aprender. Es LA información. Van en vertex color, no en textura, para que
 *     sobrevivan intactas hasta el tier bajo — si algo se cae, las manchas no.
 *   · Seis patas ágiles y visibles: esto CAMINA y CAZA, no repta como plaga.
 *     La postura dice "depredador", no "gusano".
 */
export function larvaMariquitaGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const p = [];
  const segs = tier === 'bajo' ? 5 : 7;
  const largo = 1.5;

  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1);
    const z = (0.5 - t) * largo;
    /* Ancho: gorda adelante, se va afilando a la cola (el "cocodrilito"). */
    const r = 0.26 * (1 - 0.62 * t) * (i === 0 ? 0.86 : 1);
    /* Los segmentos 2-3 y 5 llevan naranja (los pares de manchas). */
    const esMancha = tier === 'bajo' ? i === 2 || i === 4 : i === 2 || i === 4;
    const col = esMancha ? PAL.larvaMancha : PAL.larvaCuerpo;
    p.push(poner(esfera(r, d, col), { pos: [0, 0, z], esc: [1.15, 0.9, 1] }));

    /* TUBÉRCULOS: las verruguitas laterales erizadas de cada segmento. */
    if (tier !== 'bajo' && i > 0 && i < segs - 1) {
      const tc = esMancha ? PAL.larvaMancha : PAL.larvaCuerpo;
      for (const s of [-1, 1]) {
        p.push(
          poner(cono(r * 0.34, r * 0.7, d, tc), {
            pos: [s * r * 1.05, r * 0.34, z],
            rot: [0, 0, (s * Math.PI) / 2.6],
          }),
        );
      }
    }
  }

  /* Cabeza: chata, oscura, con mandíbulas — la herramienta del oficio. */
  p.push(poner(esfera(0.2, d, PAL.larvaCuerpo), { pos: [0, 0, largo * 0.5 + 0.1], esc: [1, 0.8, 1] }));
  if (tier !== 'bajo') {
    for (const s of [-1, 1]) {
      p.push(
        poner(cono(0.05, 0.19, d, PAL.larvaCuerpo), {
          pos: [s * 0.08, 0, largo * 0.5 + 0.26],
          rot: [Math.PI / 2, 0, s * 0.3],
        }),
      );
    }
  }

  /* SEIS PATAS, adelante y bien plantadas: esto camina y caza. */
  const patas = tier === 'bajo' ? 2 : 3;
  for (let i = 0; i < patas; i++) {
    const z = largo * 0.36 - i * 0.3;
    for (const s of [-1, 1]) {
      p.push(
        poner(cilindro(0.032, 0.02, 0.34, d, PAL.larvaCuerpo), {
          pos: [s * 0.26, -0.16, z],
          rot: [0, 0, (s * Math.PI) / 3.4],
        }),
      );
    }
  }
  return fundir(p);
}

/* -------------------------------------------------------------------------- */
/*  EL ARCO — huevo → larva → pupa → adulto (la lección, en una hoja)          */
/* -------------------------------------------------------------------------- */

/*
 * La mariquita ADULTA: el domo rojo con puntos. La única que el campesino ya
 * reconoce — y, en el reloj de su vida, la etapa MÁS CORTA. Se dibuja bien
 * porque es el ancla: el ojo aterriza acá y entiende que el cocodrilito de al
 * lado es el mismo bicho.
 */
export function mariquitaGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const p = [];
  /* Élitros: media esfera achatada (el domo inconfundible). */
  const domo = new THREE.SphereGeometry(0.42, d.rad + 2, d.alt, 0, Math.PI * 2, 0, Math.PI / 2);
  p.push(poner(pintar(domo, PAL.mariquita), { esc: [1, 0.72, 1.15] }));
  /* Panza */
  p.push(
    poner(esfera(0.4, d, PAL.mariquitaPunto), { pos: [0, -0.02, 0], esc: [0.96, 0.3, 1.1] }),
  );
  /* Cabeza negra con el pronoto */
  p.push(poner(esfera(0.17, d, PAL.mariquitaPunto), { pos: [0, 0.06, 0.42], esc: [1.2, 0.7, 0.8] }));

  if (tier !== 'bajo') {
    /* La sutura: la línea que parte los élitros en dos. */
    p.push(poner(cilindro(0.012, 0.012, 0.8, d, PAL.mariquitaPunto), { pos: [0, 0.3, 0], rot: [Math.PI / 2, 0, 0] }));
    /* LOS PUNTOS: tres por élitro, en domo. Sin puntos no es mariquita. */
    const pts = [
      [0.2, 0.24, 0.24],
      [0.24, 0.2, -0.18],
      [0.1, 0.32, 0.02],
    ];
    for (const [x, y, z] of pts) {
      for (const s of [-1, 1]) {
        p.push(poner(esfera(0.075, d, PAL.mariquitaPunto), { pos: [s * x, y, z], esc: [1, 0.4, 1] }));
      }
    }
    /* Patitas */
    for (let i = 0; i < 3; i++) {
      for (const s of [-1, 1]) {
        p.push(
          poner(cilindro(0.025, 0.018, 0.24, d, PAL.mariquitaPunto), {
            pos: [s * 0.3, -0.12, 0.22 - i * 0.22],
            rot: [0, 0, (s * Math.PI) / 3.2],
          }),
        );
      }
    }
  }
  return fundir(p);
}

/*
 * LOS HUEVOS: racimo de elipsoides PARADOS, amarillo-naranja, siempre junto a la
 * colonia de pulgón — la madre le pone la mesa servida a la larva. Ese detalle
 * (que estén JUNTO al pulgón) es información agronómica, no composición.
 */
export function huevosMariquitaGeom(tier = 'medio', n = 9) {
  const d = detDeTier(tier);
  const r = rng(1207);
  const p = [];
  const cuantos = tier === 'bajo' ? 5 : n;
  for (let i = 0; i < cuantos; i++) {
    const a = (i / cuantos) * Math.PI * 2;
    const rad = 0.05 + r() * 0.07;
    p.push(
      poner(esfera(0.048, d, PAL.larvaMancha), {
        pos: [Math.cos(a) * rad, 0.07, Math.sin(a) * rad],
        rot: [r() * 0.3 - 0.15, 0, r() * 0.3 - 0.15],
        esc: [1, 2.1, 1], // parados: así se ven en la hoja
      }),
    );
  }
  return fundir(p);
}

/*
 * LA PUPA: quieta, pegada a la hoja, naranja con manchas oscuras. "Parece
 * muerta: no la barra." Es el momento en que el campesino cree que hay basura
 * en la hoja y la limpia — matando la mariquita justo antes de que emerja.
 */
export function pupaMariquitaGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const p = [poner(esfera(0.3, d, PAL.mariquita), { esc: [0.9, 0.72, 1.3] })];
  if (tier !== 'bajo') {
    for (const z of [0.16, -0.06, -0.24]) {
      p.push(poner(esfera(0.13, d, PAL.mariquitaPunto), { pos: [0, 0.16, z], esc: [1.5, 0.3, 0.6] }));
    }
  }
  return fundir(p);
}

/* -------------------------------------------------------------------------- */
/*  LA CRISOPA — y sus huevos con pedicelo (los alfileres)                     */
/* -------------------------------------------------------------------------- */

/*
 * La adulta: "alas verdes transparentes y cuerpo delicado", ojos dorados. No
 * come plaga — come POLEN. Se dibuja frágil a propósito: es el argumento de las
 * flores hecho cuerpo. Sin flor, esta no se queda, y sin ella no hay larvas.
 */
export function crisopaGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const p = [
    poner(capsula(0.07, 0.5, d, PAL.crisopaCuerpo), { rot: [Math.PI / 2, 0, 0] }),
    poner(esfera(0.1, d, PAL.crisopaCuerpo), { pos: [0, 0, 0.32] }),
  ];
  /* Los ojos dorados: anatomía (ojo compuesto), NO expresión. Sin catchlight. */
  for (const s of [-1, 1]) {
    p.push(poner(esfera(0.05, d, PAL.crisopaOjo), { pos: [s * 0.07, 0.02, 0.36] }));
  }
  /* Cuatro alas venadas, largas, tejadas sobre el cuerpo. */
  const alas = tier === 'bajo' ? [1] : [1, -1];
  for (const lado of [-1, 1]) {
    for (const par of alas) {
      const ala = plano(0.62, 0.26, PAL.crisopaAla);
      p.push(
        poner(ala, {
          pos: [lado * 0.24, 0.09 + (par === 1 ? 0.03 : 0), -0.05 + (par === 1 ? 0.06 : -0.08)],
          rot: [Math.PI / 2 - 0.32, 0, lado * 0.28],
        }),
      );
    }
  }
  if (tier !== 'bajo') {
    /* Antenas largas: el gesto de la crisopa. */
    for (const s of [-1, 1]) {
      p.push(
        poner(cilindro(0.012, 0.008, 0.4, d, PAL.crisopaCuerpo), {
          pos: [s * 0.06, 0.06, 0.5],
          rot: [1.25, 0, s * 0.25],
        }),
      );
    }
  }
  return fundir(p);
}

/*
 * LOS HUEVOS CON PEDICELO — ALFILERES CLAVADOS EN LA HOJA.
 *
 * De todo lo que la crisopa hace, esto es lo que el campesino SÍ puede ver a
 * simple vista, y no tiene ni idea de qué es. Un hilito rígido de seda con una
 * perla blanca en la punta. El pedicelo no es decorativo: mantiene al huevo
 * lejos de las hormigas y de los hermanos recién nacidos, que son caníbales.
 * Cuando alguien aprenda a reconocer ESTO en su hoja, este mundo ya sirvió.
 */
export function crisopaHuevosGeom(tier = 'medio', n = 5) {
  const d = detDeTier(tier);
  const r = rng(88);
  const p = [];
  const cuantos = tier === 'bajo' ? 3 : n;
  for (let i = 0; i < cuantos; i++) {
    const x = (i - (cuantos - 1) / 2) * 0.12 + (r() - 0.5) * 0.04;
    const z = (r() - 0.5) * 0.1;
    const alto = 0.3 + r() * 0.12;
    const incl = (r() - 0.5) * 0.24;
    /* el hilito */
    p.push(
      poner(cilindro(0.007, 0.005, alto, d, PAL.crisopaPedicelo), {
        pos: [x, alto / 2, z],
        rot: [0, 0, incl],
      }),
    );
    /* la perla en la punta */
    p.push(
      poner(esfera(0.038, d, PAL.crisopaHuevo), {
        pos: [x + Math.sin(incl) * alto, alto, z],
        esc: [1, 1.5, 1],
      }),
    );
  }
  return fundir(p);
}

/** La larva de crisopa: el león de los áfidos. Mandíbulas de hoz enormes. */
export function larvaCrisopaGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const p = [];
  const segs = tier === 'bajo' ? 4 : 6;
  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1);
    const rr = 0.2 * (1 - 0.55 * t);
    const col = i === 2 ? PAL.larvaMancha : PAL.crisopaCuerpo;
    p.push(poner(esfera(rr, d, col), { pos: [0, 0, (0.5 - t) * 1.05], esc: [1.1, 0.85, 1] }));
  }
  /* LAS HOCES: por eso le dicen león. Curvas, hacia adelante, inconfundibles. */
  for (const s of [-1, 1]) {
    p.push(
      poner(cono(0.04, 0.34, d, PAL.larvaCuerpo), {
        pos: [s * 0.1, 0, 0.72],
        rot: [Math.PI / 2.2, 0, s * 0.42],
      }),
    );
  }
  return fundir(p);
}

/* -------------------------------------------------------------------------- */
/*  LA AVISPA PARASITOIDE — y LA MOMIA (su obra)                              */
/* -------------------------------------------------------------------------- */

/*
 * Chiquita, negra con un dejo de miel, CINTURA marcada (el peciolo) y el
 * ovipositor atrás. No pica a las personas: pone su huevo DENTRO de la plaga.
 * Se dibuja pequeña de verdad — su invisibilidad es parte del argumento: es la
 * que el amplio espectro borra sin que nadie se entere de lo que perdió.
 */
export function avispaGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const p = [
    /* cabeza */
    poner(esfera(0.09, d, PAL.avispa), { pos: [0, 0, 0.26] }),
    /* tórax */
    poner(esfera(0.11, d, PAL.avispa), { pos: [0, 0, 0.08], esc: [1, 1, 1.3] }),
    /* LA CINTURA: el peciolo finito. El rasgo de "avispa". */
    poner(cilindro(0.022, 0.022, 0.12, d, PAL.avispa), { pos: [0, 0, -0.08], rot: [Math.PI / 2, 0, 0] }),
    /* gáster */
    poner(esfera(0.12, d, PAL.avispa), { pos: [0, 0, -0.24], esc: [0.85, 0.85, 1.4] }),
  ];
  if (tier !== 'bajo') {
    /* el ovipositor: la jeringa con la que pone el huevo adentro */
    p.push(
      poner(cilindro(0.008, 0.004, 0.16, d, PAL.avispa), { pos: [0, -0.02, -0.44], rot: [Math.PI / 2, 0, 0] }),
    );
    /* alas */
    for (const s of [-1, 1]) {
      p.push(
        poner(plano(0.34, 0.14, PAL.avispaAla), {
          pos: [s * 0.14, 0.07, -0.02],
          rot: [Math.PI / 2 - 0.25, 0, s * 0.3],
        }),
      );
    }
    /* antenas acodadas */
    for (const s of [-1, 1]) {
      p.push(
        poner(cilindro(0.008, 0.006, 0.2, d, PAL.avispa), { pos: [s * 0.04, 0.05, 0.36], rot: [1.15, 0, s * 0.3] }),
      );
    }
  }
  return fundir(p);
}

/*
 * ★ LA MOMIA ★ — lo más espectacular del control biológico, y lo que nadie mira.
 *
 * El pulgón parasitado se hincha, se pone RÍGIDO y BRONCE, y queda pegado a la
 * hoja como una cáscara. Días después la avispa nueva le recorta una TAPA
 * CIRCULAR perfecta y sale por ahí. Ese agujerito con tapa es una firma: si
 * usted lo ve en su cultivo, es la prueba física de que un ejército que jamás
 * vio le estuvo trabajando gratis.
 *
 * Se dibuja MÁS GRANDE que el pulgón vivo (está hinchada) y con la tapa bien
 * legible: es la evidencia, y la evidencia tiene que verse.
 */
export function momiaGeom(tier = 'medio', abierta = true) {
  const d = detDeTier(tier);
  const p = [
    /* hinchada y redonda: ya no tiene forma de pulgón, tiene forma de urna */
    poner(esfera(0.34, d, PAL.momia), { esc: [0.92, 0.86, 1] }),
  ];
  if (abierta && tier !== 'bajo') {
    /* EL HUECO DE SALIDA: el disco oscuro por donde se fue la avispa nueva. */
    p.push(poner(disco(0.13, d, PAL.momiaTapa), { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.29, -0.04] }));
    /* LA TAPITA, medio levantada, colgando de su bisagra de quitina. Ese
       detalle —que quede colgando y no desaparezca— es lo que hace que se lea
       "acá salió algo vivo" y no "acá hay un hueco". */
    p.push(poner(disco(0.13, d, PAL.momia), { rot: [-2.2, 0, 0], pos: [0, 0.36, -0.26] }));
  }
  return fundir(p);
}

/* -------------------------------------------------------------------------- */
/*  EL SÍRFIDO — solo la LARVA (el adulto vive en polinizadores/)              */
/* -------------------------------------------------------------------------- */

/*
 * OJO, LEER ANTES DE AGREGAR NADA ACÁ:
 * el sírfido ADULTO (la mosca disfrazada de abeja) YA ESTÁ DIBUJADO en
 * `mundo3d/polinizadores/`. Acá va SOLO su larva depredadora — la mitad del
 * oficio que allá no está. Dibujar el adulto en este archivo sería duplicar un
 * bicho aprobado y romper la consistencia de la casa. Ver `ADULTO_SIRFIDO` en
 * `beneficosIdentidad.js`.
 *
 * La larva: un gusanito CIEGO y sin patas, translúcido, ahusado en punta. Se
 * mueve a tientas entre la colonia de pulgón — y por eso mismo nadie sospecha
 * que sea nada. Parece una babosita insignificante y come pulgón en cantidad.
 */
export function larvaSirfidoGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const p = [];
  const segs = tier === 'bajo' ? 5 : 8;
  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1);
    /* Gordo atrás, en punta fina adelante: la silueta de la larva de sírfido. */
    const rr = 0.22 * Math.pow(t, 0.65) * (1 - 0.15 * t);
    p.push(
      poner(esfera(Math.max(0.02, rr), d, PAL.sirfidoLarva), {
        pos: [0, 0, (0.5 - t) * 1.15],
        esc: [1, 0.82, 1],
      }),
    );
  }
  return fundir(p);
}

/* -------------------------------------------------------------------------- */
/*  EL TURNO DE NOCHE — los cazadores que nadie ve trabajar                    */
/* -------------------------------------------------------------------------- */

/** Araña: cefalotórax + abdomen + 8 patas dobladas. Caza de todo. */
export function aranaGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const p = [
    poner(esfera(0.2, d, PAL.arana), { pos: [0, 0, -0.14], esc: [1, 0.85, 1.2] }),
    poner(esfera(0.12, d, PAL.arana), { pos: [0, 0, 0.14] }),
  ];
  const pares = tier === 'bajo' ? 2 : 4;
  for (let i = 0; i < pares; i++) {
    const ang = -0.5 + i * 0.36;
    for (const s of [-1, 1]) {
      /* fémur */
      p.push(
        poner(cilindro(0.022, 0.016, 0.32, d, PAL.arana), {
          pos: [s * 0.18, 0.1, 0.14 - i * 0.1],
          rot: [ang * 0.4, 0, (s * Math.PI) / 2.6],
        }),
      );
      /* tibia (la doblez que hace a la araña una araña) */
      p.push(
        poner(cilindro(0.016, 0.01, 0.3, d, PAL.arana), {
          pos: [s * 0.36, -0.02, 0.16 - i * 0.13],
          rot: [ang * 0.5, 0, (s * Math.PI) / 5],
        }),
      );
    }
  }
  return fundir(p);
}

/** La tela: radios + espiral. Geometría de líneas (barata y legible). */
export function telaGeom(radios = 10, vueltas = 4) {
  const pts = [];
  for (let i = 0; i < radios; i++) {
    const a = (i / radios) * Math.PI * 2;
    pts.push(0, 0, 0, Math.cos(a), Math.sin(a), 0);
  }
  const paso = 1 / vueltas;
  for (let v = 1; v <= vueltas; v++) {
    const r0 = v * paso;
    for (let i = 0; i < radios; i++) {
      const a0 = (i / radios) * Math.PI * 2;
      const a1 = ((i + 1) / radios) * Math.PI * 2;
      const r1 = r0 + paso / radios;
      pts.push(Math.cos(a0) * r0, Math.sin(a0) * r0, 0, Math.cos(a1) * r1, Math.sin(a1) * r1, 0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

/** Tijereta: cuerpo alargado y LOS CERCOS (las "tijeras") en la cola. */
export function tijeretaGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const p = [
    poner(capsula(0.1, 0.7, d, PAL.tijereta), { rot: [Math.PI / 2, 0, 0] }),
    poner(esfera(0.11, d, PAL.tijereta), { pos: [0, 0, 0.46] }),
  ];
  /* LAS TIJERAS: lo único que la gente recuerda de ella. Curvadas, enfrentadas. */
  for (const s of [-1, 1]) {
    p.push(
      poner(cono(0.03, 0.3, d, PAL.tijereta), {
        pos: [s * 0.07, 0, -0.55],
        rot: [-Math.PI / 2, 0, s * 0.3],
      }),
    );
  }
  if (tier !== 'bajo') {
    for (const s of [-1, 1]) {
      p.push(
        poner(cilindro(0.01, 0.008, 0.26, d, PAL.tijereta), { pos: [s * 0.05, 0.04, 0.6], rot: [1.2, 0, s * 0.3] }),
      );
    }
  }
  return fundir(p);
}

/** Carábido: el escarabajo corredor del suelo. Negro con brillo azulado. */
export function carabidoGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const domo = new THREE.SphereGeometry(0.3, d.rad + 1, d.alt, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = [
    poner(pintar(domo, PAL.carabido), { esc: [0.85, 0.6, 1.5] }),
    poner(esfera(0.16, d, PAL.carabidoBrillo), { pos: [0, 0.04, 0.4], esc: [1, 0.7, 0.9] }),
    poner(esfera(0.11, d, PAL.carabido), { pos: [0, 0.03, 0.56], esc: [1, 0.8, 0.9] }),
  ];
  /* Patas largas de corredor: este bicho PATRULLA, no pasea. */
  const patas = tier === 'bajo' ? 2 : 3;
  for (let i = 0; i < patas; i++) {
    for (const s of [-1, 1]) {
      p.push(
        poner(cilindro(0.024, 0.014, 0.42, d, PAL.carabido), {
          pos: [s * 0.24, -0.06, 0.3 - i * 0.3],
          rot: [(i - 1) * 0.3, 0, (s * Math.PI) / 3],
        }),
      );
    }
  }
  return fundir(p);
}

/** Ave insectívora: silueta en vuelo. Necesita percha para trabajar. */
export function aveGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const p = [
    poner(capsula(0.16, 0.4, d, PAL.ave), { rot: [Math.PI / 2, 0, 0] }),
    poner(esfera(0.13, d, PAL.ave), { pos: [0, 0.05, 0.36] }),
    poner(cono(0.05, 0.16, d, PAL.avePecho), { pos: [0, 0.02, 0.5], rot: [Math.PI / 2, 0, 0] }),
    poner(esfera(0.12, d, PAL.avePecho), { pos: [0, -0.08, 0.1], esc: [0.8, 0.7, 1.2] }),
    /* cola */
    poner(cono(0.14, 0.34, d, PAL.ave), { pos: [0, 0, -0.42], rot: [-Math.PI / 2, 0, 0], esc: [1, 1, 0.3] }),
  ];
  /* alas: dos planos en delta */
  for (const s of [-1, 1]) {
    p.push(poner(plano(0.7, 0.3, PAL.ave), { pos: [s * 0.4, 0.06, 0], rot: [Math.PI / 2 - 0.2, 0, s * 0.2] }));
  }
  return fundir(p);
}

/** Murciélago: el turno de noche que se come las polillas del cogollero. */
export function murcielagoGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const p = [
    poner(capsula(0.1, 0.3, d, PAL.murcielago), { rot: [Math.PI / 2, 0, 0] }),
    poner(esfera(0.11, d, PAL.murcielago), { pos: [0, 0.02, 0.26] }),
  ];
  /* orejas: la firma del murciélago insectívoro (ecolocaliza con ellas) */
  for (const s of [-1, 1]) {
    p.push(poner(cono(0.05, 0.14, d, PAL.murcielago), { pos: [s * 0.06, 0.14, 0.26] }));
  }
  /* alas membranosas: dedos + membrana */
  for (const s of [-1, 1]) {
    p.push(poner(plano(0.62, 0.34, PAL.murcielago), { pos: [s * 0.36, 0.02, -0.04], rot: [Math.PI / 2, 0, s * 0.12] }));
  }
  return fundir(p);
}

/* -------------------------------------------------------------------------- */
/*  LOS INVISIBLES — el hongo que se come al bicho                             */
/* -------------------------------------------------------------------------- */

/*
 * BEAUVERIA: la broca CUBIERTA DE BLANCO. El hongo la mató por dentro y ahora
 * la usa de balsa para esporular. Se dibuja como el bicho + una erupción de
 * pelusa radial: no hay forma más honesta de decir "el hongo se lo comió".
 * Es la imagen que un cafetero SÍ ha visto — solo que no sabía que era su aliado.
 */
export function beauveriaGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const r = rng(451);
  /* el cuerpo de la broca: escarabajito negro, "del tamaño de una cabeza de
     alfiler" — acá agrandado, porque si no, no se enseña nada. */
  const p = [poner(esfera(0.26, d, PAL.mariquitaPunto), { esc: [0.8, 0.8, 1.25] })];
  /* LA PELUSA: la erupción blanca que lo cubre todo. */
  const pelos = tier === 'bajo' ? 10 : tier === 'medio' ? 22 : 40;
  for (let i = 0; i < pelos; i++) {
    const u = r() * Math.PI * 2;
    const v = Math.acos(2 * r() - 1);
    const rad = 0.24;
    const x = Math.sin(v) * Math.cos(u) * rad * 0.8;
    const y = Math.cos(v) * rad * 0.8;
    const z = Math.sin(v) * Math.sin(u) * rad * 1.25;
    p.push(
      poner(cono(0.026, 0.14 + r() * 0.12, d, r() > 0.5 ? PAL.beauveria : PAL.beauveriaEspora), {
        pos: [x, y, z],
        rot: [v - Math.PI / 2, u, 0],
      }),
    );
  }
  return fundir(p);
}

/** METARHIZIUM: el verde. La chiza momificada en el suelo, cubierta de esporas. */
export function metarhiziumGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const r = rng(77);
  const p = [];
  /* la chiza: "larva blanca, gorda, curvada en C" — acá ya verde, ya vencida. */
  const segs = tier === 'bajo' ? 5 : 8;
  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1);
    const a = -0.9 + t * 1.9; // la curva en C
    const rr = 0.2 * (0.6 + 0.4 * Math.sin(Math.PI * t));
    p.push(
      poner(esfera(rr, d, PAL.metarhizium), {
        pos: [Math.sin(a) * 0.42, 0, Math.cos(a) * 0.42],
        esc: [1, 0.9, 1],
      }),
    );
  }
  const pelos = tier === 'bajo' ? 0 : 18;
  for (let i = 0; i < pelos; i++) {
    const t = r();
    const a = -0.9 + t * 1.9;
    p.push(
      poner(cono(0.02, 0.1, d, PAL.metarhiziumEspora), {
        pos: [Math.sin(a) * 0.42 + (r() - 0.5) * 0.2, 0.12 + r() * 0.1, Math.cos(a) * 0.42 + (r() - 0.5) * 0.2],
        rot: [(r() - 0.5) * 0.6, 0, (r() - 0.5) * 0.6],
      }),
    );
  }
  return fundir(p);
}

/*
 * TRICHODERMA: el que NO come insectos — pelea contra los HONGOS MALOS del suelo.
 * Se dibuja como un HALO vivo que envuelve la raíz de la plántula, y afuera los
 * hongos malos (Rhizoctonia/Fusarium: manchas violáceas) que no logran entrar.
 * El matiz que casi siempre se pierde: esto es un GUARDAESPALDAS, no un cazador.
 */
export function trichodermaGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const r = rng(303);
  const p = [];
  /* la raicilla */
  p.push(poner(cilindro(0.05, 0.02, 0.9, d, PAL.trichoderma), { pos: [0, -0.3, 0] }));
  /* el halo: filamentos que la envuelven */
  const hilos = tier === 'bajo' ? 6 : 16;
  for (let i = 0; i < hilos; i++) {
    const a = (i / hilos) * Math.PI * 2;
    const rad = 0.14 + r() * 0.08;
    const y = -0.7 + r() * 0.8;
    p.push(
      poner(cilindro(0.008, 0.005, 0.2 + r() * 0.14, d, PAL.trichoderma), {
        pos: [Math.cos(a) * rad, y, Math.sin(a) * rad],
        rot: [(r() - 0.5) * 1.4, a, (r() - 0.5) * 1.4],
      }),
    );
  }
  /* los hongos malos, afuera, sin poder entrar */
  if (tier !== 'bajo') {
    for (let i = 0; i < 5; i++) {
      const a = r() * Math.PI * 2;
      const rad = 0.36 + r() * 0.14;
      p.push(
        poner(esfera(0.05 + r() * 0.03, d, PAL.hongoMalo), {
          pos: [Math.cos(a) * rad, -0.5 + r() * 0.6, Math.sin(a) * rad],
        }),
      );
    }
  }
  return fundir(p);
}

/* -------------------------------------------------------------------------- */
/*  EL CULTIVO Y SU BORDE — la despensa y el refugio (o su ausencia)           */
/* -------------------------------------------------------------------------- */

/** Mata de fríjol: tallo + hojas trifoliadas. El escenario del pleito. */
export function mataGeom(tier = 'medio', semilla = 1, salud = 1) {
  const d = detDeTier(tier);
  const r = rng(semilla);
  const p = [];
  const alto = 1.5 * (0.7 + salud * 0.3);
  p.push(poner(cilindro(0.05, 0.03, alto, d, PAL.tallo), { pos: [0, alto / 2, 0] }));

  const pisos = tier === 'bajo' ? 2 : 3;
  for (let i = 0; i < pisos; i++) {
    const y = alto * (0.4 + (i / pisos) * 0.55);
    const base = r() * Math.PI * 2;
    for (let j = 0; j < 3; j++) {
      const a = base + (j / 3) * Math.PI * 2;
      const largoP = 0.28;
      /* pecíolo */
      p.push(
        poner(cilindro(0.016, 0.012, largoP, d, PAL.tallo), {
          pos: [(Math.cos(a) * largoP) / 2, y, (Math.sin(a) * largoP) / 2],
          rot: [Math.PI / 2 - 0.5, -a, 0],
        }),
      );
      /* el trifolio: tres foliolos por hoja (así es el fríjol) */
      const cHoja = salud > 0.6 ? (i === pisos - 1 ? PAL.hojaJoven : PAL.hoja) : PAL.hojaSombra;
      for (const off of [-0.5, 0, 0.5]) {
        const aa = a + off * 0.5;
        const dist = largoP + (off === 0 ? 0.26 : 0.2);
        p.push(
          poner(plano(0.3 * salud + 0.1, 0.24 * salud + 0.08, cHoja), {
            pos: [Math.cos(aa) * dist, y + 0.02, Math.sin(aa) * dist],
            rot: [-Math.PI / 2 + 0.24, -aa + Math.PI / 2, 0],
          }),
        );
      }
    }
  }
  return fundir(p);
}

/*
 * EL BORDE FLORIDO: flor CHIQUITA Y ABUNDANTE, la que de verdad sirve —
 * cilantro a flor, hinojo (umbelas) y caléndula (capítulos). No es jardinería:
 * es la CANTINA de los adultos de avispa, crisopa y sírfido. Sin esto, el
 * ejército no se queda ni aunque uno no fumigue nunca.
 */
export function floresGeom(tier = 'medio', semilla = 7, n = 12) {
  const d = detDeTier(tier);
  const r = rng(semilla);
  const p = [];
  const cuantas = tier === 'bajo' ? Math.round(n * 0.45) : n;
  for (let i = 0; i < cuantas; i++) {
    const x = (r() - 0.5) * 2.6;
    const z = (r() - 0.5) * 0.7;
    const alto = 0.5 + r() * 0.45;
    const tipo = r();
    p.push(poner(cilindro(0.018, 0.012, alto, d, PAL.hoja), { pos: [x, alto / 2, z] }));

    if (tipo < 0.5) {
      /* UMBELA (cilantro/hinojo): el paragüitas de florecitas — la mesa abierta
         donde una avispa diminuta SÍ alcanza el néctar. Por eso sirve tanto. */
      const col = tipo < 0.25 ? PAL.florCilantro : PAL.florHinojo;
      const rayos = tier === 'bajo' ? 4 : 7;
      for (let k = 0; k < rayos; k++) {
        const a = (k / rayos) * Math.PI * 2;
        const rad = 0.1;
        p.push(
          poner(esfera(0.035, d, col), { pos: [x + Math.cos(a) * rad, alto + 0.03, z + Math.sin(a) * rad] }),
        );
      }
      p.push(poner(esfera(0.03, d, col), { pos: [x, alto + 0.03, z] }));
    } else {
      /* CAPÍTULO (caléndula): el disco de compuesta, mirando al sol. */
      p.push(poner(disco(0.11, d, PAL.florCalendula), { rot: [-Math.PI / 2, 0, 0], pos: [x, alto, z] }));
      p.push(poner(esfera(0.04, d, PAL.florCentro), { pos: [x, alto + 0.02, z], esc: [1, 0.6, 1] }));
    }
  }
  return fundir(p);
}

/** Rastrojo y cerca viva: el REFUGIO. Donde duerme el turno de noche. */
export function rastrojoGeom(tier = 'medio', semilla = 21) {
  const d = detDeTier(tier);
  const r = rng(semilla);
  const p = [];
  const matojos = tier === 'bajo' ? 5 : 12;
  for (let i = 0; i < matojos; i++) {
    const x = (r() - 0.5) * 3;
    const z = (r() - 0.5) * 0.6;
    const h = 0.5 + r() * 0.7;
    p.push(poner(cono(0.16 + r() * 0.1, h, d, r() > 0.5 ? PAL.hojaSombra : PAL.hoja), { pos: [x, h / 2, z] }));
  }
  /* postes de la cerca viva: percha para las aves */
  for (let i = 0; i < 3; i++) {
    const x = -1.2 + i * 1.2;
    p.push(poner(cilindro(0.06, 0.05, 1.6, d, PAL.tallo), { pos: [x, 0.8, 0] }));
    if (tier !== 'bajo') {
      p.push(poner(esfera(0.3, d, PAL.hojaSombra), { pos: [x, 1.7, 0], esc: [1, 0.8, 1] }));
    }
  }
  return fundir(p);
}

/** El borde PELADO: alambre y nada. La ausencia, dibujada. */
export function alambreGeom(tier = 'medio') {
  const d = detDeTier(tier);
  const p = [];
  for (let i = 0; i < 3; i++) {
    const x = -1.2 + i * 1.2;
    p.push(poner(cilindro(0.045, 0.04, 1.1, d, PAL.ceniza), { pos: [x, 0.55, 0] }));
  }
  /* dos hilos de alambre y ni una hoja: nadie vive acá */
  for (const y of [0.6, 0.95]) {
    p.push(poner(cilindro(0.008, 0.008, 3.2, d, PAL.ceniza), { pos: [0, y, 0], rot: [0, 0, Math.PI / 2] }));
  }
  return fundir(p);
}

/* -------------------------------------------------------------------------- */
/*  EL UMBRAL — la única línea "de gráfico" que este mundo se permite          */
/* -------------------------------------------------------------------------- */

/*
 * Una banda tenue flotando a la misma altura sobre las DOS parcelas. No es un
 * chart: es un nivel de agua. La viva sube hacia él y se dobla antes; la limpia
 * lo revienta. Que sea LA MISMA línea para ambas es todo el rigor del
 * experimento — y por eso es una sola geometría, no dos.
 */
export function bandaUmbralGeom(ancho = 9, grosor = 0.035) {
  return pintar(new THREE.BoxGeometry(ancho, grosor, 0.02), PAL.umbral);
}

/** Los ticks de la banda: guiños de regla, cada metro. Solo tier alto. */
export function ticksUmbralGeom(ancho = 9, cada = 1) {
  const p = [];
  for (let x = -ancho / 2; x <= ancho / 2; x += cada) {
    p.push(poner(pintar(new THREE.BoxGeometry(0.02, 0.12, 0.02), PAL.umbral), { pos: [x, 0, 0] }));
  }
  return fundir(p);
}

/* -------------------------------------------------------------------------- */
/*  Siembra: dónde va cada cosa (datos puros, sin three)                       */
/* -------------------------------------------------------------------------- */

/**
 * Las posiciones de las matas de una parcela. Determinista: la misma huerta
 * siempre. Las dos parcelas usan la MISMA semilla → surcos gemelos, para que el
 * ojo compare peras con peras.
 */
export function sembrarMatas(lado, filas = 3, porFila = 4) {
  const out = [];
  for (let f = 0; f < filas; f++) {
    for (let i = 0; i < porFila; i++) {
      out.push({
        pos: [lado * (1.5 + i * 0.85), 0, -1 + f * 1.0],
        semilla: 100 + f * 10 + i,
      });
    }
  }
  return out;
}

/**
 * Dónde se posan los pulgones: en los brotes tiernos (arriba), que es donde
 * chupan de verdad. `cuantos` viene de la dinámica → el número ES la curva.
 */
export function sembrarPulgon(cuantos, semilla = 5) {
  const r = rng(semilla);
  const out = [];
  for (let i = 0; i < cuantos; i++) {
    const a = r() * Math.PI * 2;
    const rad = 0.15 + r() * 0.3;
    out.push({
      pos: [Math.cos(a) * rad, 0.95 + r() * 0.5, Math.sin(a) * rad],
      rot: r() * Math.PI * 2,
      esc: 0.1 + r() * 0.04,
    });
  }
  return out;
}
