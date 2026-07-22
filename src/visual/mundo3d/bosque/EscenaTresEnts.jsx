/*
 * EscenaTresEnts — LA LADERA DE LOS TRES ÁRBOLES MAESTROS, puesta en pie.
 *
 * Monta el bloque de montaña cortado (`gradienteAndino.geom.js`), le siembra la
 * vegetación que le toca a cada piso térmico, le pone el agua que baja y la red
 * de micorrizas que amarra por debajo, y planta los TRES ENTS:
 *
 *   · EL ENT DEL ROBLE  (templado y frío) — `EntGradiente especie="roble"`
 *   · EL ENT DEL ALISO  (frío)            — `EntGradiente especie="aliso"`
 *   · EL ENT DE LA QUEÑUA (páramo)        — `EntQuenua`, el que ya existía,
 *     traído tal cual desde su casa. No se redibuja ni se le cambia un vértice:
 *     es el mismo guardián del páramo, aquí en compañía de sus hermanos.
 *
 * ── El detalle que cierra la lección ───────────────────────────────────────
 * En la terraza del FRÍO, detrás del aliso, hay dos robles chicos. No son
 * relleno: el roble andino cruza el gradiente él solo, de 750 a 3.450 metros, y
 * verlo trepado en el piso del aliso es la única forma de decir eso sin texto.
 *
 * ── Presupuesto de dibujo ──────────────────────────────────────────────────
 * El bloque son cuatro draw-calls (lomo, corte, faldón, piedras); la
 * vegetación, un InstancedMesh por especie; el agua y la red, uno cada una.
 * Todo comparte material de color por vértice: el color vive HORNEADO en la
 * geometría, que es lo que permite que un teléfono barato dibuje esta ladera.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { crearMaterialVertexColors } from '../paleta/index.js';
import EntQuenua from './EntQuenua.jsx';
import EntGradiente from './EntGradiente.jsx';
import {
  BLOQUE,
  PISOS,
  ESCARPES,
  alturaLadera,
  zCauce,
  construirLomo,
  construirCorte,
  construirFaldon,
  construirPiedras,
  construirAgua,
  construirPozas,
  caminoAgua,
  chispasDeAgua,
  esqueletoRed,
  construirRed,
  nodosDeRed,
  pulsosDeRed,
  puntoBanda,
} from './gradienteAndino.geom.js';
import { rng } from './sombreadoVegetal.js';
/*
 * TODA la vegetación de acompañamiento sale de `floraParamo.geom.js`, y eso es
 * a propósito.
 *
 * Los doce arquetipos del bosque de tres estratos (`estratosAltoandinos`)
 * traen el color HORNEADO para vivir BAJO UN DOSEL CERRADO: su tinte de suelo
 * es `mezclar(musgo, tinta, 0.42)`, casi negro, porque allá la lección es que
 * al suelo del bosque no le llega luz. Sembrados en estas terrazas abiertas —
 * que están al sol— se leían como manchones de alquitrán al pie de los Ents.
 * No era un bug de la escena ni del arquetipo: era usar la pieza equivocada.
 * La flora del páramo, en cambio, está calibrada para ladera abierta.
 */
import {
  geomRoble,
  geomAliso,
  geomEncenillo,
  geomGaque,
  geomFrailejon,
  geomMortino,
  geomRomerillo,
  geomMusgo,
  geomRoca,
  calidadDeTier,
} from './floraParamo.geom.js';
import { PALETA as MICO } from '../micorrizas/micorrizas.geom.js';

/* ══════════════════════════════════════════════════════════════════════════
   LA SIEMBRA — dónde cae cada mata
   ══════════════════════════════════════════════════════════════════════════ */

/* Las zonas prohibidas: el pie de cada Ent (que se le vería la mata metida
   dentro del tronco), la cama del agua y una faja al borde del corte (una mata
   colgando del filo del tajo delata que el mundo es una maqueta). */
/* Un Ent necesita AIRE alrededor: con el rodal pegado al fuste, en el retrato
   de cerca el guardián se pierde dentro de su propio bosque. */
const RADIO_ENT = 3.6;
const MARGEN_CORTE = 1.1;

function libre(x, z) {
  if (z > BLOQUE.zFrente - MARGEN_CORTE) return false;
  if (z < BLOQUE.zFondo + 0.6) return false;
  if (Math.abs(z - zCauce(x)) < 1.15) return false;
  for (const p of PISOS) {
    if ((x - p.x) ** 2 + (z - p.z) ** 2 < RADIO_ENT * RADIO_ENT) return false;
  }
  for (const e of ESCARPES) {
    if (x > e.desde - 0.3 && x < e.hasta + 0.3) return false; // el talud queda pelado
  }
  return true;
}

/**
 * Siembra `n` matas en la faja [desde, hasta] de la ladera, respetando las
 * zonas prohibidas y una distancia mínima entre vecinas. Devuelve la matriz de
 * cada instancia lista para el InstancedMesh.
 */
function sembrar({
  desde, hasta, n, seed, escMin = 0.9, escMax = 1.3, distMin = 0.9, ladeo = 0.06,
  zDesde = BLOQUE.zFondo + 0.8, zHasta = BLOQUE.zFrente - 1.4,
}) {
  const r = rng(seed);
  const items = [];
  const intentos = n * 22;
  for (let i = 0; i < intentos && items.length < n; i++) {
    const x = desde + r() * (hasta - desde);
    const z = zDesde + r() * (zHasta - zDesde);
    if (!libre(x, z)) continue;
    let choca = false;
    for (const it of items) {
      if ((it.x - x) ** 2 + (it.z - z) ** 2 < distMin * distMin) { choca = true; break; }
    }
    if (choca) continue;
    items.push({
      x,
      z,
      y: alturaLadera(x, z),
      esc: escMin + r() * (escMax - escMin),
      rotY: r() * Math.PI * 2,
      tilt: [(r() - 0.5) * ladeo, (r() - 0.5) * ladeo],
      tono: 0.9 + r() * 0.2,
    });
  }
  return items;
}

/** UN BANCO: todas las matas de una especie en un solo InstancedMesh. */
function Banco({ geo, mat, items, castShadow = false, hundir = 0 }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !items.length) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      p.set(it.x, it.y - hundir * it.esc, it.z);
      e.set(it.tilt[0], it.rotY, it.tilt[1]);
      q.setFromEuler(e);
      s.setScalar(it.esc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      // ni dos matas del mismo verde: variación chica, la justa para que el
      // rodal no se lea clonado
      c.setRGB(it.tono, it.tono, it.tono);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items, hundir]);

  if (!geo || !items.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, items.length]}
      frustumCulled={false}
      castShadow={castShadow}
      receiveShadow={false}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EL AGUA QUE CORRE — chispas que viajan por el cauce
   ══════════════════════════════════════════════════════════════════════════ */
/* Sin esto la quebrada es un tubo azul pintado en el suelo. Las chispas son lo
   que la hace CORRER, y de paso dicen para dónde va: siempre hacia abajo. */
function ChispasAgua({ curva, n, reducedMotion, mat }) {
  const ref = useRef(null);
  const chispas = useMemo(() => chispasDeAgua(n), [n]);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 6, 5), []);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  /* Los objetos de trabajo van en un REF, no en un `useMemo`: se mutan por
     cuadro y mutar un valor memoizado es lo que la regla de inmutabilidad de
     hooks prohíbe (con razón: un memo se recalcula cuando quiere). Un ref
     existe precisamente para esto. */
  const tmpRef = useRef({
    m: new THREE.Matrix4(),
    q: new THREE.Quaternion(),
    p: new THREE.Vector3(),
    s: new THREE.Vector3(),
    aux: new THREE.Vector3(),
  });

  const colocar = useCallback((t0) => {
    const mesh = ref.current;
    const tmp = tmpRef.current;
    if (!mesh) return;
    for (let i = 0; i < chispas.length; i++) {
      const ch = chispas[i];
      const t = (ch.t + t0 * ch.vel) % 1;
      curva.getPointAt(t, tmp.p);
      curva.getTangentAt(t, tmp.aux);
      // desplazada al lado del hilo: el agua no corre por una línea sola
      tmp.p.x += -tmp.aux.z * ch.lado;
      tmp.p.z += tmp.aux.x * ch.lado;
      tmp.p.y += ch.alto;
      tmp.s.setScalar(ch.esc);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [chispas, curva]);

  useLayoutEffect(() => { colocar(0); }, [colocar]);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    colocar(clock.getElapsedTime());
  });

  return <instancedMesh ref={ref} args={[geo, mat, chispas.length]} frustumCulled={false} />;
}

/* ══════════════════════════════════════════════════════════════════════════
   LA RED QUE REPARTE — nodos y pulsos
   ══════════════════════════════════════════════════════════════════════════ */
/* Los pulsos van en los DOS sentidos a propósito: el mineral y el agua suben
   del hongo a la mata, el azúcar baja de la mata al hongo. Es un trato, no una
   tubería. */
function PulsosRed({ curva, pulsos, reducedMotion, mat }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 6, 5), []);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const tmpRef = useRef({
    m: new THREE.Matrix4(),
    q: new THREE.Quaternion(),
    p: new THREE.Vector3(),
    s: new THREE.Vector3(),
  });

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const c = new THREE.Color();
    for (let i = 0; i < pulsos.length; i++) {
      mesh.setColorAt(i, c.set(pulsos[i].color));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [pulsos]);

  const colocar = useCallback((t0) => {
    const mesh = ref.current;
    const tmp = tmpRef.current;
    if (!mesh) return;
    for (let i = 0; i < pulsos.length; i++) {
      const pu = pulsos[i];
      let t = (pu.t + t0 * pu.vel * pu.dir) % 1;
      if (t < 0) t += 1;
      curva.getPointAt(t, tmp.p);
      tmp.p.z += 0.06;
      tmp.p.y += pu.lado;
      tmp.s.setScalar(pu.esc);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [pulsos, curva]);

  useLayoutEffect(() => { colocar(0); }, [colocar]);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    colocar(clock.getElapsedTime());
  });

  return <instancedMesh ref={ref} args={[geo, mat, pulsos.length]} frustumCulled={false} />;
}

/** Los nodos de intercambio: perlas donde la red se junta con una raíz. Laten
    despacio — el más grande es el de cada árbol. */
function NodosRed({ nodos, reducedMotion, mat }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const tmpRef = useRef({
    m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(),
  });

  const colocar = useCallback((t0) => {
    const mesh = ref.current;
    const tmp = tmpRef.current;
    if (!mesh) return;
    for (let i = 0; i < nodos.length; i++) {
      const nd = nodos[i];
      const late = 1 + Math.sin(t0 * 1.1 + i * 1.7) * (nd.tipo === 'intercambio' ? 0.16 : 0.1);
      tmp.s.setScalar(nd.esc * late);
      tmp.m.compose(nd.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [nodos]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const c = new THREE.Color();
    for (let i = 0; i < nodos.length; i++) {
      mesh.setColorAt(i, c.set(nodos[i].tipo === 'intercambio' ? MICO.arbusculo : MICO.nodo));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    colocar(0);
  }, [nodos, colocar]);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    colocar(clock.getElapsedTime());
  });

  return <instancedMesh ref={ref} args={[geo, mat, nodos.length]} frustumCulled={false} />;
}

/* ══════════════════════════════════════════════════════════════════════════
   LA LADERA COMPLETA
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} props.tier
 * @param {{materialRico?:boolean, flatShading?:boolean, sombras?:boolean}} props.perfil
 * @param {boolean} [props.reducedMotion]
 * @param {string|null} [props.foco]  id del piso al que se le está prestando
 *   atención ('templado' | 'frio' | 'paramo' | null): los otros se apagan un
 *   punto para que el ojo sepa a dónde mirar, sin ocultar nada.
 */
export default function EscenaTresEnts({
  tier = 'alto',
  perfil,
  reducedMotion = false,
  foco = null,
}) {
  const q = calidadDeTier(tier);
  const denso = tier === 'alto' ? 1 : tier === 'medio' ? 0.62 : 0.35;

  /* ── El bloque de montaña ── */
  const lomo = useMemo(() => construirLomo({ q: denso }), [denso]);
  const corte = useMemo(() => construirCorte({ q: denso }), [denso]);
  const faldon = useMemo(() => construirFaldon({ q: denso }), [denso]);
  const piedras = useMemo(() => construirPiedras({ q: denso }), [denso]);

  /* ── El agua ── */
  const curvaAgua = useMemo(() => caminoAgua(), []);
  const agua = useMemo(() => construirAgua({ q: denso }), [denso]);
  const pozas = useMemo(() => construirPozas({ q: denso }), [denso]);

  /* ── La red del subsuelo ── */
  const hilos = useMemo(() => esqueletoRed({ q: denso }), [denso]);
  const red = useMemo(() => construirRed(hilos, { q: denso }), [hilos, denso]);
  const nodos = useMemo(() => nodosDeRed(hilos, { q: denso }), [hilos, denso]);
  const pulsos = useMemo(
    () => pulsosDeRed(tier === 'alto' ? 26 : tier === 'medio' ? 12 : 0),
    [tier],
  );
  /* El rizomorfo como curva: es el riel por el que viajan los pulsos de punta a
     punta de la ladera. Que crucen los tres pisos es la lección hecha
     movimiento. */
  const curvaRed = useMemo(() => {
    const pts = [];
    for (let x = BLOQUE.xMax - 1.6; x >= BLOQUE.xMin + 1.2; x -= 0.7) {
      pts.push(puntoBanda(x, Math.sin(x * 1.7) * 0.16));
    }
    return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
  }, []);

  /* ── La vegetación de cada terraza ──
     Cada piso lleva SU cortejo. No es decoración: el frailejonal dice páramo,
     el robledal cerrado dice templado, y el roble chico metido en la terraza
     del frío dice que el roble sube solo. */
  const geosVeg = useMemo(() => ({
    roble: geomRoble({ q }, 31),
    aliso: geomAliso({ q }, 32),
    encenillo: geomEncenillo({ q }, 33),
    gaque: geomGaque({ q }, 39),
    frailejon: geomFrailejon({ q, edad: 0.7 }, 34),
    frailejonFlor: geomFrailejon({ q, edad: 0.95, flor: true }, 35),
    mortino: geomMortino({ q }, 36),
    romerillo: geomRomerillo({ q }, 37),
    musgo: geomMusgo(38),
    roca: geomRoca(40),
  }), [q]);

  const siembra = useMemo(() => {
    const templado = PISOS[0];
    const frio = PISOS[1];
    const paramo = PISOS[2];
    const k = (n) => Math.max(1, Math.round(n * denso));
    /* Los ÁRBOLES del cortejo se siembran DETRÁS de los Ents (zAtras): el Ent es
       el protagonista de su terraza y tiene que recortarse contra el rodal, no
       perderse dentro de él. La primera pasada los repartió por toda la
       profundidad y el robledal se le tragó el rostro al roble. */
    const zAtras = { zDesde: BLOQUE.zFondo + 0.9, zHasta: -3.6 };
    return {
      /* TEMPLADO — el robledal cerrado */
      roble: [
        ...sembrar({ desde: templado.desde + 1, hasta: templado.hasta - 0.6, n: k(5), seed: 101, escMin: 1.05, escMax: 1.5, distMin: 2.6, ...zAtras }),
        /* …y los dos robles trepados en la terraza del FRÍO: el roble andino
           cruza el gradiente él solo (750–3.450 m) y esto es decirlo sin texto. */
        ...sembrar({ desde: frio.desde + 1.4, hasta: frio.hasta - 1.4, n: k(2), seed: 102, escMin: 0.7, escMax: 0.92, distMin: 2.6, ...zAtras }),
      ],
      /* el gaque, domo denso de hoja gruesa: el sotobosque alto del robledal */
      gaque: sembrar({ desde: templado.desde + 1, hasta: templado.hasta - 0.5, n: k(5), seed: 103, escMin: 0.9, escMax: 1.35, distMin: 1.6 }),
      /* FRÍO — el alisal con su encenillo */
      aliso: sembrar({ desde: frio.desde + 0.8, hasta: frio.hasta - 0.8, n: k(4), seed: 106, escMin: 0.85, escMax: 1.15, distMin: 2, ...zAtras }),
      encenillo: sembrar({ desde: frio.desde + 0.8, hasta: frio.hasta - 0.8, n: k(3), seed: 107, escMin: 0.8, escMax: 1.05, distMin: 2, ...zAtras }),
      /* PÁRAMO — el frailejonal manda */
      frailejon: sembrar({ desde: paramo.desde + 0.6, hasta: paramo.hasta - 0.8, n: k(9), seed: 109, escMin: 1.05, escMax: 1.65, distMin: 1.15 }),
      frailejonFlor: sembrar({ desde: paramo.desde + 0.8, hasta: paramo.hasta - 1, n: k(3), seed: 110, escMin: 1.1, escMax: 1.5, distMin: 1.6 }),
      /* el matorral bajo, de una punta a otra de la ladera */
      mortino: sembrar({ desde: templado.desde + 0.8, hasta: paramo.hasta - 0.6, n: k(16), seed: 111, escMin: 0.8, escMax: 1.2, distMin: 0.85 }),
      romerillo: sembrar({ desde: frio.desde - 1.5, hasta: paramo.hasta - 0.6, n: k(14), seed: 112, escMin: 0.85, escMax: 1.25, distMin: 0.8 }),
      musgo: sembrar({ desde: BLOQUE.xMin + 1, hasta: BLOQUE.xMax - 1, n: k(24), seed: 113, escMin: 0.8, escMax: 1.6, distMin: 0.55 }),
      roca: sembrar({ desde: BLOQUE.xMin + 1, hasta: BLOQUE.xMax - 1, n: k(10), seed: 114, escMin: 0.7, escMax: 1.5, distMin: 1.2 }),
    };
  }, [denso]);

  useEffect(() => () => {
    [lomo, corte, faldon, piedras, agua, pozas, red].forEach((g) => g && g.dispose());
    Object.values(geosVeg).forEach((g) => g && g.dispose());
  }, [lomo, corte, faldon, piedras, agua, pozas, red, geosVeg]);

  /* ── Materiales ── */
  const matTierra = useMemo(
    () => crearMaterialVertexColors(perfil, { flatShading: false, roughness: 1 }),
    [perfil],
  );
  const matVeg = useMemo(() => crearMaterialVertexColors(perfil), [perfil]);
  /*
   * EL AGUA. La receta 'agua' de `materialesMadre` es para una lámina de COLOR
   * PLANO y va con metalness 0,4 — que es lo correcto cuando hay un entorno que
   * reflejar. Esta quebrada es otra cosa: lleva el color HORNEADO por vértice
   * (hondo en el eje, lechoso en la orilla, espuma en los saltos) y la escena no
   * tiene mapa de entorno. Con metalness 0,4 y nada que reflejar, el difuso se
   * apaga y la quebrada sale NEGRA — se veía como un charco de alquitrán en vez
   * de agua. Aquí es agua de día en ladera abierta: casi sin metal, con brillo,
   * y la transparencia que la receta madre le da a lo único que la lleva.
   */
  const matAgua = useMemo(() => {
    const base = { vertexColors: true, transparent: true, opacity: 0.92 };
    return perfil?.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.26, metalness: 0.06 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil]);
  const matEspuma = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#fdf7e8', transparent: true, opacity: 0.85 }),
    [],
  );
  /* La red es LUZ, no materia: material sin sombreado para que se lea encendida
     contra la tierra casi negra de su banda. La raíz, en cambio, viaja en el
     mismo material que la tierra — es cosa. Ese contraste es la lección. */
  const matRed = useMemo(
    () => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    [],
  );
  const matNodo = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    [],
  );
  /* El material de los pisos apagados: multiplica hacia abajo sin desaturar del
     todo. Señalar un piso NO puede ser esconder los otros. */
  const matApagado = useMemo(() => {
    const m = crearMaterialVertexColors(perfil);
    m.color = new THREE.Color('#6a6b60');
    return m;
  }, [perfil]);

  useEffect(() => () => {
    [matTierra, matVeg, matAgua, matEspuma, matRed, matNodo, matApagado].forEach((m) => m.dispose());
  }, [matTierra, matVeg, matAgua, matEspuma, matRed, matNodo, matApagado]);

  /* ¿Qué material le toca a la vegetación de un piso? */
  const matDe = (piso) => (foco && foco !== piso ? matApagado : matVeg);

  /* Los Ents se HUNDEN un palmo en la tierra. El pie del fuste es un anillo
     abierto de radio 1,3 y el terreno ondula dentro de esa huella: apoyado al
     ras, por el lado de abajo se le vería el hueco del tubo. */
  const alturaDe = (p) => alturaLadera(p.x, p.z) - 0.22;

  return (
    <group name="ladera-tres-ents">
      {/* ── EL BLOQUE ── */}
      <mesh geometry={lomo} material={matTierra} receiveShadow />
      <mesh geometry={corte} material={matTierra} receiveShadow />
      <mesh geometry={faldon} material={matTierra} />
      <mesh geometry={piedras} material={matTierra} castShadow receiveShadow />

      {/* ── EL AGUA: nace arriba, se despeña dos veces, llega hecha quebrada ── */}
      <mesh geometry={pozas} material={matAgua} />
      <mesh geometry={agua} material={matAgua} />
      <ChispasAgua
        curva={curvaAgua}
        n={tier === 'alto' ? 34 : tier === 'medio' ? 16 : 0}
        reducedMotion={reducedMotion}
        mat={matEspuma}
      />

      {/* ── LA RED DEL SUBSUELO: lo que amarra a los tres por debajo ── */}
      <mesh geometry={red} material={matRed} />
      <NodosRed nodos={nodos} reducedMotion={reducedMotion} mat={matNodo} />
      {pulsos.length > 0 && (
        <PulsosRed curva={curvaRed} pulsos={pulsos} reducedMotion={reducedMotion} mat={matNodo} />
      )}

      {/* ── LA VEGETACIÓN DE CADA PISO ── */}
      <Banco geo={geosVeg.roble} mat={matDe('templado')} items={siembra.roble} castShadow={!!perfil?.sombras} />
      <Banco geo={geosVeg.gaque} mat={matDe('templado')} items={siembra.gaque} />
      <Banco geo={geosVeg.aliso} mat={matDe('frio')} items={siembra.aliso} castShadow={!!perfil?.sombras} />
      <Banco geo={geosVeg.encenillo} mat={matDe('frio')} items={siembra.encenillo} />
      <Banco geo={geosVeg.frailejon} mat={matDe('paramo')} items={siembra.frailejon} castShadow={!!perfil?.sombras} />
      <Banco geo={geosVeg.frailejonFlor} mat={matDe('paramo')} items={siembra.frailejonFlor} />
      <Banco geo={geosVeg.mortino} mat={matVeg} items={siembra.mortino} />
      <Banco geo={geosVeg.romerillo} mat={matVeg} items={siembra.romerillo} />
      <Banco geo={geosVeg.musgo} mat={matVeg} items={siembra.musgo} hundir={0.04} />
      <Banco geo={geosVeg.roca} mat={matVeg} items={siembra.roca} hundir={0.12} />

      {/* ══════════════════════════════════════════════════════════════════
          LOS TRES ÁRBOLES MAESTROS
          ══════════════════════════════════════════════════════════════════ */}

      {/* EL ROBLE — templado y frío. Su mano señala las setas del pie. */}
      <group position={[PISOS[0].x, alturaDe(PISOS[0]), PISOS[0].z]} rotation={[0, -0.16, 0]}>
        <EntGradiente especie="roble" tier={tier} reducedMotion={reducedMotion} />
      </group>

      {/* EL ALISO — frío. Su mano señala los nódulos de Frankia de su raíz. */}
      <group position={[PISOS[1].x, alturaDe(PISOS[1]), PISOS[1].z]} rotation={[0, 0.1, 0]}>
        <EntGradiente especie="aliso" tier={tier} reducedMotion={reducedMotion} />
      </group>

      {/* LA QUEÑUA — páramo. El Ent que ya existía, traído tal cual: mismo
          rostro tallado, misma barba de usnea, mismos brazos. Aquí en su casa,
          arriba del todo, con el nacimiento del agua a sus pies. */}
      <group position={[PISOS[2].x, alturaDe(PISOS[2]), PISOS[2].z]} rotation={[0, 0.22, 0]}>
        <EntQuenua tier={tier} reducedMotion={reducedMotion} />
      </group>
    </group>
  );
}
