/*
 * anatomiaFauna.geom — LOS CUERPOS de la fauna realista, procedurales.
 *
 * La técnica es la misma de `floraParamo.geom` y `fincaRealista.geom` (DR §3):
 * cada pieza se fusiona en UNA geometría con el color HORNEADO en vertexColors
 * → un material blanco y una draw-call por pieza. Cero assets, todo procedural,
 * corre headless.
 *
 * PERO acá hay una diferencia de fondo con la finca: la vaca de `fincaRealista`
 * pasta quieta y se fusiona ENTERA; estos caminan. Un cuerpo fusionado no puede
 * caminar. Así que el reparto es otro:
 *
 *   · el TORSO y la CABEZA se fusionan enteros (con sus rosetas, sus anteojos y
 *     sus motas adentro): son piezas rígidas y no pagan nada por ser ricas.
 *   · los HUESOS salen sueltos y se comparten: 4 patas, 2 tipos (delantera y
 *     trasera), 3 huesos cada una = SEIS geometrías para DOCE mallas. La misma
 *     geometría posada doce veces no cuesta doce veces.
 *
 * CONVENCIÓN DE HUESO (la respeta `marcha.posarHueso`): todo hueso se
 * construye COLGANDO DEL ORIGEN HACIA -Y, con largo `largoBase`. Así se lo
 * orienta con un solo quaternion y se lo estira en Y hasta la distancia real
 * — y la articulación no abre hueco NUNCA, pase lo que pase con el IK. En un
 * rig que nadie va a poder mirar cuadro a cuadro, lo que se arma bien por
 * construcción vale más que lo que se ajusta a ojo.
 *
 * BOLA DE ARTICULACIÓN: cada hueso trae una esfera en su origen. Es lo que
 * tapa el codo cuando flexiona, sin skinning y sin pensarlo más.
 *
 * EJES: +Z adelante, +Y arriba, +X a la derecha del animal.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* -------------------------------------------------------------------------- */
/*  El kit (hermano del de floraParamo/fincaRealista: pintar, poner, fusionar) */
/* -------------------------------------------------------------------------- */

/** Hornea un color plano en TODOS los vértices (atributo `color`). */
function pintar(geo, color) {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
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

/** Coloca una geometría (transforma los vértices, no crea nodos). */
function poner(geo, pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1]) {
  geo.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(pos[0], pos[1], pos[2]),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
      new THREE.Vector3(esc[0], esc[1], esc[2]),
    ),
  );
  return geo;
}

/** Fusiona la lista (los poliedros vienen no-indexados: se uniformiza o el
    merge devuelve null — la misma trampa que documenta fincaRealista). */
function fusionar(partes) {
  const buenas = partes.filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  if (!buenas.length) return null;
  return mergeGeometries(buenas, false);
}

/** Un elipsoide low-poly (el ladrillo de todo lo orgánico). */
function bola(rx, ry, rz, detalle = 1) {
  const g = new THREE.IcosahedronGeometry(1, detalle);
  g.scale(rx, ry, rz);
  return g;
}

/* El kit, para los planes que no son cuadrúpedos (colibrí, rana, águila): que
   armen SU cuerpo con las mismas herramientas y horneen el color igual. Un
   segundo kit paralelo sería la puerta de entrada a que el águila no pertenezca
   al mismo cuadro que la danta. */
export const kitGeo = { pintar, poner, fusionar, bola, memo };

/* Caché: las mismas args → la misma malla. Un hato de tigrillos no reconstruye
   doce veces el mismo fémur. */
const _cache = new Map();
function memo(clave, crear) {
  if (!_cache.has(clave)) _cache.set(clave, crear());
  return _cache.get(clave);
}

/* -------------------------------------------------------------------------- */
/*  HUESO — la convención: cuelga del origen hacia -Y                         */
/* -------------------------------------------------------------------------- */

/**
 * Un hueso con su bola de articulación arriba.
 * @param {number} largo   el `largoBase` que después estira `posarHueso`
 * @param {number} rArriba radio en la articulación de arriba
 * @param {number} rAbajo  radio en la de abajo (los huesos se afinan hacia el pie)
 */
export function huesoGeo(largo, rArriba, rAbajo, color, segs = 6) {
  const cana = new THREE.CylinderGeometry(rArriba, rAbajo, largo, segs, 1, true);
  poner(cana, [0, -largo / 2, 0]);
  const nudo = bola(rArriba * 1.06, rArriba * 1.06, rArriba * 1.06, 0);
  return pintar(fusionar([cana, nudo]), color);
}

/* -------------------------------------------------------------------------- */
/*  EL TORSO                                                                  */
/* -------------------------------------------------------------------------- */

/*
 * El torso es un barril de revolución con perfil propio, no una cápsula.
 * El perfil manda:
 *   · `pecho`/`grupa` — un jaguar es ancho de pecho y angosto de cintura; un
 *     borugo es al revés (grupa ancha, hombros chicos: el roedor). Esos dos
 *     números son media especie.
 *   · el exponente 0.42 del seno — las puntas ROMAS. Un cuerpo que termina en
 *     punta es un limón, no un animal.
 *   · `lomoArco` — el lomo arqueado del tapir y del roedor.
 */
function perfilDelTorso(t, torso) {
  const romo = Math.pow(Math.sin(Math.PI * t), 0.42);
  const talle = torso.grupa + (torso.pecho - torso.grupa) * t; // grupa(0) → pecho(1)
  return romo * talle;
}

/** El barril, con el eje en Z y el centro en el origen. */
function barrilGeo(torso, arco, segs) {
  const N = 11;
  const puntos = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    puntos.push(new THREE.Vector2(Math.max(1e-4, torso.radio * perfilDelTorso(t, torso)), t * torso.largo));
  }
  /* LatheGeometry revuelve en torno a +Y; se centra y se acuesta sobre +Z. */
  const g = new THREE.LatheGeometry(puntos, segs);
  poner(g, [0, -torso.largo / 2, 0]);
  g.rotateX(Math.PI / 2);
  /* el arco del lomo: se levanta el centro del cuerpo */
  if (arco) {
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getZ(i) + torso.largo / 2) / torso.largo;
      pos.setY(i, pos.getY(i) + arco * Math.sin(Math.PI * t));
    }
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Un punto de la superficie del torso y su normal, en (t, phi).
 * `t`: 0 = grupa, 1 = pecho. `phi`: 0 = lomo (arriba), π = panza.
 * Sirve para PEGAR las manchas donde van (rosetas, motas, babero) sin que
 * floten ni se hundan.
 */
function superficieTorso(torso, arco, t, phi, salidaP, salidaN) {
  const r = torso.radio * perfilDelTorso(t, torso);
  const z = (t - 0.5) * torso.largo;
  const y = Math.cos(phi) * r + (arco ? arco * Math.sin(Math.PI * t) : 0);
  salidaP.set(Math.sin(phi) * r, y, z);
  if (salidaN) {
    /* la normal por diferencias finitas: exacta para lo que hace falta y sin
       derivar el perfil a mano */
    const e = 1e-3;
    const rA = torso.radio * perfilDelTorso(Math.min(1, t + e), torso);
    const pA = new THREE.Vector3(
      Math.sin(phi) * rA,
      Math.cos(phi) * rA + (arco ? arco * Math.sin(Math.PI * Math.min(1, t + e)) : 0),
      (Math.min(1, t + e) - 0.5) * torso.largo,
    );
    const pB = new THREE.Vector3(
      Math.sin(phi + e) * r,
      Math.cos(phi + e) * r + (arco ? arco * Math.sin(Math.PI * t) : 0),
      z,
    );
    const tanA = pA.sub(salidaP);
    const tanB = pB.sub(salidaP);
    salidaN.crossVectors(tanB, tanA).normalize();
    /* que mire para afuera siempre */
    if (salidaN.dot(new THREE.Vector3(Math.sin(phi), Math.cos(phi), 0)) < 0) salidaN.negate();
  }
  return salidaP;
}

/** Pega una calcomanía plana (creada en el plano XY, mirando a +Z) sobre la
    superficie, orientada por la normal y despegada lo justo para no titilar. */
function pegar(geo, punto, normal, alzado) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  geo.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3().copy(punto).addScaledVector(normal, alzado),
      q,
      new THREE.Vector3(1, 1, 1),
    ),
  );
  return geo;
}

/**
 * LAS ROSETAS del jaguar y del tigrillo: anillo CON MOTA ADENTRO.
 * El leopardo tiene puntos llenos; el jaguar, rosetas con centro. Es el dato
 * diagnóstico de la especie: si esto se hace mal, es otro gato.
 * Se saltean la panza (phi cerca de π) — el vientre va limpio, como en el bicho.
 */
function rosetasGeo(ficha, arco, pieles, tier) {
  const cfg = ficha.rosetas;
  if (!cfg) return [];
  const partes = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const alzado = ficha.torso.radio * 0.012;
  for (let f = 0; f < cfg.filas; f++) {
    /* las filas bajan por el costado: del lomo (phi chico) hacia la panza */
    const phiBase = 0.35 + (f / Math.max(1, cfg.filas - 1)) * 1.5;
    for (let i = 0; i < cfg.porFila; i++) {
      /* alternadas: una fila corrida media roseta respecto de la de arriba */
      const t = 0.13 + ((i + (f % 2) * 0.5) / cfg.porFila) * 0.74;
      if (t > 0.93) continue;
      const phi = phiBase + Math.sin(i * 2.7 + f) * 0.16; // que no sean una grilla
      for (const lado of [1, -1]) {
        superficieTorso(ficha.torso, arco, t, phi * lado, p, n);
        const r = cfg.radio * (0.75 + 0.5 * Math.abs(Math.sin(i * 1.9 + f * 2.3)));
        /* el ANILLO */
        const anillo = new THREE.RingGeometry(r * 0.55, r, tier.segs >= 8 ? 8 : 6);
        partes.push(pintar(pegar(anillo, p, n, alzado), pieles.roseta));
        /* y LA MOTA de adentro: esto es lo que lo hace jaguar */
        if (cfg.conCentro && tier.detalle > 0) {
          const centro = new THREE.CircleGeometry(r * 0.34, 5);
          partes.push(pintar(pegar(centro, p, n, alzado * 0.9), pieles.rosetaCentro));
        }
      }
    }
  }
  return partes;
}

/** LAS MOTAS del borugo: HILERAS ordenadas por el flanco (no salpicaduras). */
function motasGeo(ficha, arco, pieles, tier) {
  const cfg = ficha.motas;
  if (!cfg) return [];
  const partes = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const alzado = ficha.torso.radio * 0.014;
  for (let f = 0; f < cfg.filas; f++) {
    const phi = 0.55 + (f / Math.max(1, cfg.filas - 1)) * 1.15;
    for (let i = 0; i < cfg.porFila; i++) {
      const t = 0.16 + (i / (cfg.porFila - 1)) * 0.66;
      for (const lado of [1, -1]) {
        superficieTorso(ficha.torso, arco, t, phi * lado, p, n);
        const disco = new THREE.CircleGeometry(cfg.radio, tier.segs >= 8 ? 7 : 5);
        partes.push(pintar(pegar(disco, p, n, alzado), pieles.mota));
      }
    }
  }
  return partes;
}

/**
 * EL BABERO del oso: el crema que baja de la garganta al pecho. Va en la panza
 * del frente (phi cerca de π = abajo), no en el lomo.
 */
function baberoGeo(ficha, arco, pieles) {
  if (!ficha.babero) return [];
  const partes = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const alzado = ficha.torso.radio * 0.014;
  const filas = 5;
  for (let i = 0; i < filas; i++) {
    const t = 0.72 + (i / (filas - 1)) * 0.2; // pegado al pecho
    const ancho = ficha.babero.ancho * (1 - Math.abs(i / (filas - 1) - 0.35) * 0.5);
    for (let j = -1; j <= 1; j++) {
      const phi = Math.PI - 0.55 + j * 0.42;
      superficieTorso(ficha.torso, arco, t, phi, p, n);
      const disco = new THREE.CircleGeometry(ancho * 0.42, 6);
      partes.push(pintar(pegar(disco, p, n, alzado), pieles.pecho));
    }
  }
  return partes;
}

/**
 * El TORSO completo: barril + joroba de hombro + manchas, todo fusionado.
 * `joroba`: la masa de músculo sobre los omóplatos. En el oso es la seña del
 * trepador; en el jaguar es el motor del acecho. No es un adorno.
 */
export function torsoGeo(ficha, tier) {
  const pieles = ficha.pelaje;
  const arco = ficha.lomoArco || 0;
  const base = pieles.lana || pieles.leonado || pieles.pelaje || pieles.pardo;
  const partes = [pintar(barrilGeo(ficha.torso, arco, tier.segs), base)];

  /* la panza más clara: una media cáscara por debajo (todo mamífero es más
     claro abajo — contrasombreado; es camuflaje, no decoración) */
  const claro = pieles.vientre || pieles.panza;
  if (claro && tier.detalle > 0) {
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (let i = 0; i < 7; i++) {
      const t = 0.16 + (i / 6) * 0.7;
      for (const phi of [Math.PI - 0.3, Math.PI, Math.PI + 0.3]) {
        superficieTorso(ficha.torso, arco, t, phi, p, n);
        const d = new THREE.CircleGeometry(ficha.torso.radio * 0.4, 6);
        partes.push(pintar(pegar(d, p, n, ficha.torso.radio * 0.01), claro));
      }
    }
  }

  /* la joroba del hombro */
  const jorobaAlto = (ficha.marcha === 'ambladura' ? 0.3 : 0.14) * ficha.torso.radio;
  if (tier.detalle > 0 && ficha.plan === 'cuadrupedo' && ficha.patas.postura !== 'esparrancado') {
    const j = bola(ficha.torso.radio * 0.62, jorobaAlto + ficha.torso.radio * 0.2, ficha.torso.largo * 0.2, 1);
    poner(j, [0, ficha.torso.radio * 0.62 + arco * 0.5, ficha.torso.largo * 0.22]);
    partes.push(pintar(j, pieles.hombro || base));
  }

  partes.push(...rosetasGeo(ficha, arco, pieles, tier));
  partes.push(...motasGeo(ficha, arco, pieles, tier));
  partes.push(...baberoGeo(ficha, arco, pieles));

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  LA CABEZA                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * La cabeza entera, fusionada. Origen en la NUCA (donde engancha el cuello),
 * mirando a +Z: así el consumidor mueve un grupo y la cabeza gira bien.
 *
 * Acá viven las señas que hacen inequívoca a cada especie:
 *   · danta   — la PROBÓSCIDE prensil y LOS LABIOS BLANCOS (+ el ribete de la
 *     oreja): las dos marcas de T. pinchaque frente a los otros tapires.
 *   · oso     — LOS ANTEOJOS y el MORRO CLARO, que son DOS zonas distintas y
 *     de tono distinto. Fundirlas en una mancha sola es lo que convierte al
 *     oso andino en un oso genérico de dibujo.
 *   · felinos — hocico corto, orejas REDONDAS, y la LUMBRE del ojo.
 */
export function cabezaGeo(ficha, tier) {
  const pieles = ficha.pelaje;
  const cab = ficha.cabeza;
  const base = pieles.lana || pieles.leonado || pieles.pelaje || pieles.pardo;
  const partes = [];

  /* el cráneo */
  const craneo = bola(cab.ancho * 0.5, cab.alto * 0.5, cab.largo * 0.42, tier.detalle > 0 ? 1 : 0);
  poner(craneo, [0, 0, cab.largo * 0.34]);
  partes.push(pintar(craneo, base));

  /* el morro / hocico / probóscide */
  const hoc = ficha.proboscide || ficha.hocico;
  const zMorro = cab.largo * 0.68;
  if (hoc) {
    if (ficha.proboscide) {
      /*
       * LA PROBÓSCIDE de la danta: corta, carnosa y PRENSIL. Con ella agarra
       * la hoja y se la lleva a la boca. Va curvada hacia abajo (el gesto de
       * ramonear), no tiesa hacia adelante como una manguera.
       */
      const n = 4;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const seg = new THREE.CylinderGeometry(
          hoc.radio * (1 - t * 0.32),
          hoc.radio * (1 - (t + 1 / n) * 0.32),
          hoc.largo / n + 0.004,
          tier.segs >= 8 ? 7 : 5,
        );
        const caida = t * t * hoc.largo * 0.55; // la curva hacia abajo
        poner(seg, [0, -cab.alto * 0.1 - caida, zMorro + t * hoc.largo], [Math.PI / 2 - t * 0.5, 0, 0]);
        partes.push(pintar(seg, base));
      }
      if (ficha.labioBlanco) {
        /* LOS LABIOS BLANCOS: el ribete crema del borde de la boca. La seña. */
        const labio = bola(hoc.radio * 0.85, hoc.radio * 0.4, hoc.radio * 0.5, 0);
        poner(labio, [0, -cab.alto * 0.1 - hoc.largo * 0.5, zMorro + hoc.largo * 0.92]);
        partes.push(pintar(labio, pieles.labio));
      }
    } else {
      const morro = bola(hoc.radio, hoc.radio * 0.82, hoc.largo * 0.85, tier.detalle > 0 ? 1 : 0);
      poner(morro, [0, -cab.alto * 0.14, zMorro]);
      partes.push(pintar(morro, pieles.morro || base));
      /* la trufa */
      const trufa = bola(hoc.radio * 0.42, hoc.radio * 0.3, hoc.radio * 0.28, 0);
      poner(trufa, [0, -cab.alto * 0.1, zMorro + hoc.largo * 0.72]);
      partes.push(pintar(trufa, pieles.trufa || base));
    }
  }

  /* LOS ANTEOJOS del oso — crema alrededor del ojo, con su borde tenue, y
     ABIERTOS (nunca un anillo cerrado: el dibujo real se abre hacia la frente).
     [zoología] el patrón es ÚNICO por individuo: así los identifican las
     cámaras trampa. Por eso `semilla` los corre un pelo — cada oso lleva SU
     cara, no la cara del modelo. */
  if (ficha.anteojos) {
    const a = ficha.anteojos;
    const s = ficha.semilla || 0;
    for (const lado of [1, -1]) {
      const sesgo = Math.sin(s * 12.9898 + lado * 4.1) * 0.12; // la cara propia
      const borde = new THREE.RingGeometry(a.radio * 0.55, a.radio * (1.12 + sesgo * 0.3), 9, 1, 0.5, Math.PI * 2 * a.cierra + 1.6);
      const cen = [lado * a.sep, a.y + sesgo * a.radio * 0.5, cab.largo * 0.52];
      poner(borde, cen, [0, lado * 0.5, 0]);
      partes.push(pintar(borde, pieles.anteojoBorde));
      const mancha = new THREE.RingGeometry(a.radio * 0.5, a.radio * (0.95 + sesgo * 0.25), 9, 1, 0.6, Math.PI * 2 * a.cierra + 1.4);
      poner(mancha, [cen[0], cen[1], cen[2] + 0.004], [0, lado * 0.5, 0]);
      partes.push(pintar(mancha, pieles.anteojo));
    }
  }

  /* los ojos */
  const rOjo = cab.alto * 0.11;
  const colorOjo = pieles.iris || pieles.ojo || pieles.trufa;
  for (const lado of [1, -1]) {
    const ojo = bola(rOjo, rOjo, rOjo * 0.7, 0);
    poner(ojo, [lado * cab.ancho * 0.36, cab.alto * 0.16, cab.largo * 0.55]);
    partes.push(pintar(ojo, colorOjo));
    /*
     * LA LUMBRE — el tapetum lucidum. La capa espejada que le devuelve la luz
     * al ojo del felino de noche NO es fantasía: es anatomía. Ahí es donde vive
     * lo místico del jaguar, y por eso no hace falta inventarle nada.
     */
    if (pieles.lumbre && tier.detalle > 0) {
      const l = bola(rOjo * 0.42, rOjo * 0.42, rOjo * 0.3, 0);
      poner(l, [lado * cab.ancho * 0.36 + rOjo * 0.2, cab.alto * 0.16 + rOjo * 0.2, cab.largo * 0.55 + rOjo * 0.55]);
      partes.push(pintar(l, pieles.lumbre));
    }
  }

  /* las orejas */
  if (ficha.orejas) {
    const o = ficha.orejas;
    for (const lado of [1, -1]) {
      const geo = o.redondas
        ? bola(o.ancho * 0.5, o.largo * 0.5, o.ancho * 0.22, tier.detalle > 0 ? 1 : 0)
        : bola(o.ancho * 0.42, o.largo * 0.5, o.ancho * 0.2, tier.detalle > 0 ? 1 : 0);
      poner(geo, [lado * o.sep, cab.alto * 0.4 + o.y, cab.largo * 0.2 + o.z], [0.2, lado * 0.35, lado * 0.12]);
      partes.push(pintar(geo, base));
      /* EL RIBETE BLANCO de la oreja de la danta: la otra seña de la especie */
      if (o.ribete && pieles.ribeteOreja) {
        const r = bola(o.ancho * 0.46, o.ribete * 0.6, o.ancho * 0.2, 0);
        poner(r, [lado * o.sep, cab.alto * 0.4 + o.y + o.largo * 0.42, cab.largo * 0.2 + o.z], [0.2, lado * 0.35, lado * 0.12]);
        partes.push(pintar(r, pieles.ribeteOreja));
      }
    }
  }

  /* LA CRIN corta y tiesa de la danta, del cogote a la nuca */
  if (ficha.crin) {
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const p = new THREE.ConeGeometry(ficha.crin.alto * 0.5, ficha.crin.alto * (1 - t * 0.4), 4);
      poner(p, [0, cab.alto * 0.45 + ficha.crin.alto * 0.4, cab.largo * 0.1 - t * ficha.crin.largo * 0.35]);
      partes.push(pintar(p, base));
    }
  }

  /* LOS BIGOTES del borugo: los que se abren al olfatear */
  if (ficha.bigotes && tier.detalle > 0) {
    for (const lado of [1, -1]) {
      for (let i = 0; i < ficha.bigotes.cuantos; i++) {
        const ang = 0.2 + (i / ficha.bigotes.cuantos) * 0.7;
        const b = new THREE.CylinderGeometry(0.0004, 0.0002, ficha.bigotes.largo, 3);
        poner(
          b,
          [lado * (cab.ancho * 0.3 + Math.sin(ang) * ficha.bigotes.largo * 0.4), -cab.alto * 0.08, cab.largo * 0.68],
          [Math.PI / 2 - 0.3, 0, lado * (Math.PI / 2 - ang * 0.6)],
        );
        partes.push(pintar(b, pieles.bigote));
      }
    }
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  EL PIE — donde se decide plantígrado vs digitígrado vs ungulado           */
/* -------------------------------------------------------------------------- */

/**
 * DÓNDE ESTÁ LA SUELA dentro de la geometría del pie, en fracciones del largo
 * del pie: cuánto hay que subir (`y`) y correr (`z`) el TOBILLO por encima del
 * punto que toca el suelo.
 *
 * Esto no es un ajuste: es un CONTRATO. `marcha.tobilloDeLaPostura` lee estos
 * mismos números para colocar el tobillo, y `pieGeo` (abajo) construye la malla
 * contra ellos. Si los dos lados no leyeran lo mismo, el animal caminaría
 * hundido en el suelo o flotando encima — el error mudo de todo rig, el que no
 * tira ningún test y solo se ve mirando. Un solo lugar lo dice.
 */
export const ANCLA_PIE = {
  /* el oso: la planta entera apoyada, el tobillo apenas 6 cm sobre el piso y
     un poco adelantado respecto del talón */
  plantigrado: { y: 0.32, z: -0.18 },
  /* el felino: de puntillas — el tobillo (el "talón" que la gente cree rodilla)
     vive casi un largo de pie ARRIBA */
  digitigrado: { y: 0.96, z: -0.1 },
  /* el anfibio esparrancado: como el digitígrado, pero la pata sale de costado
     (eso lo resuelve el polo del IK, no el ancla) */
  esparrancado: { y: 0.96, z: -0.1 },
  /* la danta: vertical sobre la pezuña */
  ungulado: { y: 1.0, z: 0 },
};

/**
 * El pie va aparte del hueso porque su FORMA es la postura:
 *   · plantígrado — una planta LARGA: el oso apoya del talón a los dedos.
 *   · digitígrado — un pie corto y compacto: el felino camina en los dedos.
 *   · ungulado    — la pezuña: chata, dura, con los dedos que deja marcados en
 *     el barro (3 atrás en la danta — la huella que el corpus describe).
 */
export function pieGeo(ficha, cual, tier) {
  const pieles = ficha.pelaje;
  const p = ficha.patas[cual];
  const base = pieles.lana || pieles.leonado || pieles.pelaje || pieles.pardo;
  const postura = ficha.patas.postura;
  const partes = [];

  if (postura === 'plantigrado') {
    /* la planta entera, del talón a los dedos */
    const planta = bola(p.radio * 1.05, p.pie * 0.16, p.pie * 0.5, tier.detalle > 0 ? 1 : 0);
    poner(planta, [0, -p.pie * 0.16, p.pie * 0.18]);
    partes.push(pintar(planta, base));
    /* LAS GARRAS: largas y NO retráctiles. Son de trepar — este oso vive
       subido al árbol. Y son las que se agarran de la caña del maíz. */
    if (ficha.patas.garras) {
      for (let i = -2; i <= 2; i++) {
        const g = new THREE.ConeGeometry(p.radio * 0.13, ficha.patas.garras, 4);
        poner(g, [i * p.radio * 0.38, -p.pie * 0.2, p.pie * 0.46], [Math.PI / 2 - 0.25, 0, 0]);
        partes.push(pintar(g, pieles.garra || base));
      }
    }
  } else if (postura === 'ungulado') {
    /* la pezuña — la suela cae EXACTO en -pie (ver ANCLA_PIE.ungulado) */
    const casco = new THREE.CylinderGeometry(p.radio * 0.95, p.radio * 1.05, p.pie * 0.42, tier.segs >= 8 ? 8 : 6);
    poner(casco, [0, -p.pie * 0.79, 0]);
    partes.push(pintar(casco, pieles.pezuna || base));
    /* LOS DEDOS: 4 adelante, 3 atrás. El corpus (91) solo registra la huella
       trasera de tres, y corrige a quien le dice cuatro. Es lo que la delata
       en el barro blando — donde se confunde con huella de ganado. */
    const n = cual === 'delantera' ? ficha.patas.dedosDelante || 3 : ficha.patas.dedosAtras || 3;
    for (let i = 0; i < n; i++) {
      const a = ((i - (n - 1) / 2) / n) * 1.5;
      const d = bola(p.radio * 0.3, p.pie * 0.08, p.radio * 0.42, 0);
      poner(d, [Math.sin(a) * p.radio * 0.75, -p.pie * 0.92, Math.cos(a) * p.radio * 0.5]);
      partes.push(pintar(d, pieles.pezuna || base));
    }
    /* la caña, del tobillo a la pezuña */
    const cana = new THREE.CylinderGeometry(p.radio * 0.6, p.radio * 0.85, p.pie * 0.62, tier.segs >= 8 ? 7 : 5);
    poner(cana, [0, -p.pie * 0.3, 0]);
    partes.push(pintar(cana, base));
  } else {
    /* digitígrado (y esparrancado): el pie compacto del que anda en los dedos */
    const pata = bola(p.radio * 0.95, p.pie * 0.3, p.pie * 0.48, tier.detalle > 0 ? 1 : 0);
    poner(pata, [0, -p.pie * 0.66, p.pie * 0.1]);
    partes.push(pintar(pata, base));
    /* el metatarso, del tobillo a la almohadilla */
    const meta = new THREE.CylinderGeometry(p.radio * 0.5, p.radio * 0.75, p.pie * 0.7, tier.segs >= 8 ? 6 : 4);
    poner(meta, [0, -p.pie * 0.33, 0]);
    partes.push(pintar(meta, base));
    /* los discos de los dedos del arlequín: con eso se agarra de la piedra
       mojada del borde de la quebrada */
    if (ficha.patas.discos) {
      for (let i = -1; i <= 1; i++) {
        const d = bola(ficha.patas.discos, ficha.patas.discos * 0.5, ficha.patas.discos, 0);
        poner(d, [i * p.radio * 0.9, -p.pie * 0.8, p.pie * 0.3]);
        partes.push(pintar(d, pieles.disco || base));
      }
    }
  }
  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  ARMAR EL CUADRÚPEDO ENTERO                                                */
/* -------------------------------------------------------------------------- */

/**
 * Todas las geometrías de un cuadrúpedo, cacheadas por (especie, tier).
 * Devuelve las piezas rígidas (torso, cabeza) y los huesos COMPARTIDOS: seis
 * geometrías para las doce mallas de las cuatro patas.
 */
export function construirCuadrupedo(ficha, tier) {
  const clave = `${ficha.id}|${tier.segs}|${tier.detalle}|${ficha.semilla || 0}`;
  return memo(clave, () => {
    const pieles = ficha.pelaje;
    const base = pieles.lana || pieles.leonado || pieles.pelaje || pieles.pardo;
    const tr = ficha.patas.trasera;
    const de = ficha.patas.delantera;
    return {
      torso: torsoGeo(ficha, tier),
      cabeza: cabezaGeo(ficha, tier),
      cuello: huesoGeo(ficha.cuello.largo, ficha.cuello.radio, ficha.cuello.radio * 0.88, base, tier.segs),
      /* los huesos: el de arriba más grueso que el de abajo — la pata se afina
         hacia el pie en todo tetrápodo (el músculo vive arriba, cerca del cuerpo) */
      muslo: huesoGeo(tr.a, tr.radio, tr.radio * 0.72, base, tier.segs >= 8 ? 6 : 5),
      canilla: huesoGeo(tr.b, tr.radio * 0.72, tr.radio * 0.5, base, tier.segs >= 8 ? 6 : 5),
      pieTrasero: pieGeo(ficha, 'trasera', tier),
      brazo: huesoGeo(de.a, de.radio, de.radio * 0.74, base, tier.segs >= 8 ? 6 : 5),
      antebrazo: huesoGeo(de.b, de.radio * 0.74, de.radio * 0.52, base, tier.segs >= 8 ? 6 : 5),
      pieDelantero: pieGeo(ficha, 'delantera', tier),
      cola: ficha.cola
        ? huesoGeo(ficha.cola.largo, ficha.cola.radio, ficha.cola.radio * 0.8, base, tier.segs >= 8 ? 5 : 4)
        : null,
      largos: {
        muslo: tr.a,
        canilla: tr.b,
        brazo: de.a,
        antebrazo: de.b,
        cuello: ficha.cuello.largo,
        cola: ficha.cola ? ficha.cola.largo : 0,
      },
    };
  });
}

/** El perfil de detalle de la fauna, derivado del perfil de render del tier. */
export function detalleDeFauna(perfil) {
  const rico = !!(perfil && perfil.materialRico);
  return {
    segs: rico ? 10 : 6, // segmentos radiales
    detalle: rico ? 1 : 0, // subdivisión de los elipsoides y adornos finos
    /* en gama baja el pie se funde con la canilla: dos mallas menos POR PATA
       (ocho por animal). La marcha no cambia — el tobillo se sigue resolviendo
       igual, solo que no se dibuja aparte. */
    pieAparte: rico,
  };
}
