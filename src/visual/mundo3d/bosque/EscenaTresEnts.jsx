/*
 * EscenaTresEnts — LA LADERA DE LOS CUATRO ÁRBOLES MAESTROS, puesta en pie.
 * (El archivo conserva el nombre viejo a propósito: la ruta pública
 * `#/mockups/tres-ents-gradiente` ya está en el registro y renombrarla es
 * romper enlaces por una cuestión de ortografía.)
 *
 * Monta el bloque de montaña cortado (`gradienteAndino.geom.js`), le siembra la
 * vegetación que le toca a cada piso térmico, le pone el agua que baja y la red
 * de micorrizas que amarra por debajo, y planta los CUATRO ENTS, de abajo
 * hacia arriba:
 *
 *   · LA CEIBA  (tierra caliente) · EL ROBLE (templado) ·
 *     EL ALISO (frío) · LA QUEÑUA (páramo)
 *
 * Los cuatro salen del mismo `EntGradiente`. La queñua venía de su propio
 * componente y por eso su rostro era de otra mano; ahora los cuatro comparten
 * cincel y se leen como hermanos.
 *
 * ── Los detalles que cierran las lecciones ─────────────────────────────────
 * · En la terraza del FRÍO, detrás del aliso, hay dos robles chicos. No son
 *   relleno: el roble andino cruza el gradiente él solo, de 750 a 3.450 metros,
 *   y verlo trepado en el piso del aliso es la única forma de decirlo sin texto.
 * · Por la bajante de CADA árbol suben y bajan pulsos de dos colores: el azúcar
 *   que el árbol le paga al hongo y el mineral que el hongo le devuelve. La red
 *   turquesa sola decía "están conectados"; esto dice QUÉ se intercambia.
 * · Sobre el páramo entran jirones de niebla que la copa de la queñua se toma,
 *   y del tronco bajan gotas hasta el manantial. Esa cadena —niebla, gota,
 *   quebrada— es la fábrica de agua, dibujada en vez de escrita.
 *
 * ── Presupuesto de dibujo ──────────────────────────────────────────────────
 * El bloque son cuatro draw-calls (lomo, corte, faldón, piedras); la
 * vegetación, un InstancedMesh por especie; el agua, la red, la niebla y las
 * gotas, uno cada una. Todo comparte material de color por vértice: el color
 * vive HORNEADO en la geometría, que es lo que permite que un teléfono barato
 * dibuje esta ladera.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { crearMaterialVertexColors } from '../paleta/index.js';
import EntGradiente from './EntGradiente.jsx';
import {
  BLOQUE,
  PISOS,
  ESCARPES,
  pisoDe,
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
  pulsosDeRaiz,
  raizDeSeccion,
  ejeNiebla,
  jironesDeNiebla,
  caminoDeGota,
  gotasDeParamo,
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
/* La ceibita del rodal caliente NO puede salir de `floraParamo`: allá no hay
   una sola especie de tierra caliente. Vive con su guardián. */
import { geomCeibaChica } from './entsGradiente.geom.js';
import { PALETA as MICO } from '../micorrizas/micorrizas.geom.js';
import { AGUAS, NEUTROS } from '../paleta/paletaMadre.js';

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

/**
 * UN BANCO: todas las matas de una especie en un solo InstancedMesh.
 *
 * `aclarar` sube el tinte por instancia por encima de 1. Existe por una razón
 * concreta: hay arquetipos de la flora —el gaque es el peor— cuyo verde viene
 * horneado para vivir BAJO UN DOSEL CERRADO, y en estas terrazas al sol se
 * leían como manchones de ALQUITRÁN al pie de los guardianes. No es un bug de
 * la escena ni del arquetipo: es que la pieza está calibrada para otra luz.
 * Aclararla aquí es más honesto (y menos destructivo) que irle a cambiar el
 * horneado a una geometría que otros mundos usan tal como está.
 */
function Banco({ geo, mat, items, castShadow = false, hundir = 0, aclarar = 1 }) {
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
      const tn = it.tono * aclarar;
      c.setRGB(tn, tn, tn);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items, hundir, aclarar]);

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

/* ══════════════════════════════════════════════════════════════════════════
   EL TRATO, VISIBLE — lo que sube y lo que baja por la raíz de cada árbol
   ══════════════════════════════════════════════════════════════════════════ */
/*
 * "No veo la lección de micorriza."
 *
 * La red estaba dibujada —turquesa, con nodos y con pulsos corriendo de punta
 * a punta de la ladera— y aun así no ENSEÑABA nada. Lo que decía era "estos
 * árboles están conectados", que es la mitad menos interesante. Lo que había
 * que ver es QUÉ SE INTERCAMBIA, y eso pasa en la raíz de cada árbol, no en el
 * cordón horizontal.
 *
 * Esto lo pone en escena: por la bajante de cada Ent viajan perlas de dos
 * colores y en dos sentidos.
 *   · VERDE que BAJA del árbol: el azúcar que hizo con el sol y le paga al hongo.
 *   · ÁMBAR y AZUL que SUBEN: el fósforo y el agua que el hongo le buscó lejos.
 * Con verlo dos veces se entiende, y no hace falta leer una sola palabra.
 */
function PulsosRaiz({ curva, pulsos, reducedMotion, mat }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 7, 6), []);
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
    for (let i = 0; i < pulsos.length; i++) mesh.setColorAt(i, c.set(pulsos[i].color));
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
      /* Se corren un pelo hacia la cámara: la bajante viaja PEGADA a la cara
         del corte y un pulso centrado en el eje de la raíz se le esconde
         adentro justo donde más importa que se vea. */
      tmp.p.z += 0.12;
      tmp.p.x += pu.lado;
      /* Aparecen y desaparecen en las puntas en vez de brotar de la nada: el
         viaje se lee como un recorrido, no como un parpadeo. */
      const vive = Math.min(1, Math.sin(Math.min(1, t * 1.06) * Math.PI) * 2.6);
      tmp.s.setScalar(pu.esc * Math.max(0, vive));
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

/* ══════════════════════════════════════════════════════════════════════════
   LA FÁBRICA DE AGUA — la niebla entra por la copa, sale hecha quebrada
   ══════════════════════════════════════════════════════════════════════════ */
/*
 * "No veo la lección de páramo."
 *
 * Tampoco estaba. El manantial brotaba al lado de la queñua como si el agua se
 * hiciera sola, y el texto del panel —que la copa PEINA LA NIEBLA— no tenía
 * ningún dibujo que lo respaldara. Faltaban los dos eslabones del medio.
 *
 * `JironesNiebla` trae la niebla de la cumbre y la mete en la copa, donde se
 * adelgaza hasta desaparecer: la copa se la está tomando. `GotasParamo` la
 * devuelve hecha agua, escurriendo por el tronco hasta el pie y de ahí al
 * manantial. Causa, tránsito y efecto, en fila y en el mismo cuadro.
 */
function JironesNiebla({ eje, jirones, reducedMotion, mat }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 9, 6), []);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const tmpRef = useRef({
    m: new THREE.Matrix4(), q: new THREE.Quaternion(),
    p: new THREE.Vector3(), s: new THREE.Vector3(),
  });

  const colocar = useCallback((t0) => {
    const mesh = ref.current;
    const tmp = tmpRef.current;
    if (!mesh) return;
    for (let i = 0; i < jirones.length; i++) {
      const j = jirones[i];
      const t = (j.t + t0 * j.vel) % 1;
      tmp.p.copy(eje.desde).lerp(eje.hasta, t);
      tmp.p.y += j.alto * (1 - t * 0.72);
      tmp.p.z += j.lado * (1 - t * 0.55);
      /* SE CONSUME al llegar: entra grande y se apaga contra la copa. Si no se
         adelgazara, la niebla parecería atravesar el árbol y salir por el otro
         lado — que es exactamente lo contrario de la lección.
         OJO CON EL EXPONENTE: con 2,1 la niebla se moría a media ladera y
         quedaba como una nube suelta en el cielo, sin tocar el árbol — o sea,
         sin decir nada. Con 3,4 aguanta hasta METERSE en la copa, que es donde
         tiene que desaparecer para que se entienda quién se la tomó. */
      const queda = Math.max(0, 1 - Math.pow(t, 3.4));
      const entra = Math.min(1, t * 7); // tampoco puede aparecer de golpe
      const f = queda * entra;
      // más aplastados que anchos: la niebla se ACUESTA sobre la ladera
      tmp.s.set(j.largo * f, j.grueso * f * 0.44, j.grueso * f * 0.9);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [jirones, eje]);

  useLayoutEffect(() => { colocar(0); }, [colocar]);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    colocar(clock.getElapsedTime());
  });

  return <instancedMesh ref={ref} args={[geo, mat, jirones.length]} frustumCulled={false} />;
}

/** Las gotas que la copa fabricó: bajan por el tronco y se van al manantial. */
function GotasParamo({ curva, gotas, reducedMotion, mat }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 7, 6), []);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const tmpRef = useRef({
    m: new THREE.Matrix4(), q: new THREE.Quaternion(),
    p: new THREE.Vector3(), s: new THREE.Vector3(),
  });

  const colocar = useCallback((t0) => {
    const mesh = ref.current;
    const tmp = tmpRef.current;
    if (!mesh) return;
    for (let i = 0; i < gotas.length; i++) {
      const g = gotas[i];
      const t = (g.t + t0 * g.vel) % 1;
      curva.getPointAt(t, tmp.p);
      tmp.p.z += g.lado;
      /* La gota CRECE mientras baja: arriba es rocío que se está juntando y
         abajo ya es un chorrito. Es el mismo cuento del agua que se hace
         quebrada, contado en cinco segundos y en un metro de tronco. */
      const crece = 0.55 + t * 0.75;
      const vive = Math.min(1, t * 9) * Math.max(0, 1 - Math.pow(Math.max(0, t - 0.9) * 10, 2));
      tmp.s.setScalar(g.esc * crece * vive);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [gotas, curva]);

  useLayoutEffect(() => { colocar(0); }, [colocar]);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    colocar(clock.getElapsedTime());
  });

  return <instancedMesh ref={ref} args={[geo, mat, gotas.length]} frustumCulled={false} />;
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
  pisosVisibles = null,
}) {
  const q = calidadDeTier(tier);
  const denso = tier === 'alto' ? 1 : tier === 'medio' ? 0.62 : 0.35;
  /* ¿Se dibuja este piso? `pisosVisibles` nulo = todos (red de seguridad). */
  const seDibuja = (pisoId) => !pisosVisibles || pisosVisibles.includes(pisoId);

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
  /* Las bajantes de los cuatro árboles como CURVAS: son el riel por el que
     viaja el trato (azúcar abajo, mineral arriba). Salen de la misma función
     que dibujó la raíz, así que las perlas van clavadas sobre ella y no al
     lado — que es el detalle que separa "se ve moverse algo" de "se ve QUÉ se
     mueve y POR DÓNDE". */
  const bajantes = useMemo(
    () => (tier === 'bajo' ? [] : PISOS.map((p) => ({
      id: p.id,
      curva: raizDeSeccion(p),
      pulsos: pulsosDeRaiz(p.id, tier === 'alto' ? 6 : 4),
    }))),
    [tier],
  );

  /* ── La fábrica de agua del páramo ── */
  const paramo = useMemo(() => pisoDe('paramo'), []);
  const eje = useMemo(() => ejeNiebla(paramo), [paramo]);
  const jirones = useMemo(
    () => jironesDeNiebla(tier === 'alto' ? 22 : tier === 'medio' ? 13 : 7),
    [tier],
  );
  const curvaGota = useMemo(() => caminoDeGota(paramo), [paramo]);
  const gotas = useMemo(
    () => gotasDeParamo(tier === 'alto' ? 14 : tier === 'medio' ? 8 : 5),
    [tier],
  );
  /* El rizomorfo como curva: es el riel por el que viajan los pulsos de punta a
     punta de la ladera. Que crucen los cuatro pisos es la lección hecha
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
    ceibita: geomCeibaChica({ q }, 401),
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
    /* Por ID, nunca por índice: al meter la tierra caliente al frente del
       arreglo, un `PISOS[0]` viejo dejó de ser el templado. Ese es el tipo de
       bug que no da error — solo siembra el robledal en el piso equivocado. */
    const caliente = pisoDe('calido');
    const templado = pisoDe('templado');
    const frio = pisoDe('frio');
    const alto = pisoDe('paramo');
    const k = (n) => Math.max(1, Math.round(n * denso));
    /* Los ÁRBOLES del cortejo se siembran DETRÁS de los Ents (zAtras): el Ent es
       el protagonista de su terraza y tiene que recortarse contra el rodal, no
       perderse dentro de él. La primera pasada los repartió por toda la
       profundidad y el robledal se le tragó el rostro al roble. */
    const zAtras = { zDesde: BLOQUE.zFondo + 0.9, zHasta: -3.6 };
    return {
      /* TIERRA CALIENTE — el bosque seco tropical: RALO a propósito.
         Un bosque seco no es un bosque cerrado; es árbol grande, mucho suelo a
         la vista y matorral disperso. Sembrarlo tan tupido como el robledal
         habría sido dibujar un piso térmico con la densidad del otro. */
      ceibita: sembrar({ desde: caliente.desde + 1.6, hasta: caliente.hasta - 0.8, n: k(7), seed: 121, escMin: 0.9, escMax: 1.55, distMin: 2.4, ...zAtras }),
      /* TEMPLADO — el robledal cerrado */
      roble: [
        ...sembrar({ desde: templado.desde + 1, hasta: templado.hasta - 0.6, n: k(5), seed: 101, escMin: 1.05, escMax: 1.5, distMin: 2.6, ...zAtras }),
        /* …y los dos robles trepados en la terraza del FRÍO: el roble andino
           cruza el gradiente él solo (750–3.450 m) y esto es decirlo sin texto. */
        ...sembrar({ desde: frio.desde + 1.4, hasta: frio.hasta - 1.4, n: k(2), seed: 102, escMin: 0.7, escMax: 0.92, distMin: 2.6, ...zAtras }),
      ],
      /* el gaque, domo denso de hoja gruesa: el sotobosque alto del robledal.
         VA ATRÁS, con los otros árboles del cortejo. Se había quedado por fuera
         de esa regla y era el único que podía caer DELANTE del guardián: un
         domo de hoja gruesa a dos metros de la cámara le tapaba el rostro al
         roble justo en su propio retrato. */
      gaque: sembrar({ desde: templado.desde + 1, hasta: templado.hasta - 0.5, n: k(5), seed: 103, escMin: 0.9, escMax: 1.35, distMin: 1.6, ...zAtras }),
      /* FRÍO — el alisal con su encenillo */
      aliso: sembrar({ desde: frio.desde + 0.8, hasta: frio.hasta - 0.8, n: k(4), seed: 106, escMin: 0.85, escMax: 1.15, distMin: 2, ...zAtras }),
      encenillo: sembrar({ desde: frio.desde + 0.8, hasta: frio.hasta - 0.8, n: k(3), seed: 107, escMin: 0.8, escMax: 1.05, distMin: 2, ...zAtras }),
      /* PÁRAMO — el frailejonal manda */
      frailejon: sembrar({ desde: alto.desde + 0.6, hasta: alto.hasta - 0.8, n: k(9), seed: 109, escMin: 1.05, escMax: 1.65, distMin: 1.15 }),
      frailejonFlor: sembrar({ desde: alto.desde + 0.8, hasta: alto.hasta - 1, n: k(3), seed: 110, escMin: 1.1, escMax: 1.5, distMin: 1.6 }),
      /* el matorral bajo, del templado para arriba: el mortiño y el romerillo
         son de tierra fría y no bajan a la caliente (eso lo cubre el pajonal
         seco de la faja, que ya lo pinta el terreno) */
      mortino: sembrar({ desde: templado.desde + 0.8, hasta: alto.hasta - 0.6, n: k(16), seed: 111, escMin: 0.8, escMax: 1.2, distMin: 0.85 }),
      romerillo: sembrar({ desde: frio.desde - 1.5, hasta: alto.hasta - 0.6, n: k(14), seed: 112, escMin: 0.85, escMax: 1.25, distMin: 0.8 }),
      musgo: sembrar({ desde: templado.desde, hasta: BLOQUE.xMax - 1, n: k(24), seed: 113, escMin: 0.8, escMax: 1.6, distMin: 0.55 }),
      /* las PIEDRAS sí van de punta a punta, y en la tierra caliente son más:
         suelo somero y pedregoso es justo la razón por la que la ceiba
         necesita contrafuertes */
      roca: sembrar({ desde: BLOQUE.xMin + 1, hasta: BLOQUE.xMax - 1, n: k(16), seed: 114, escMin: 0.7, escMax: 1.5, distMin: 1.2 }),
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
  /* LA NIEBLA: blanca, sin sombreado y muy transparente. Tiene que leerse como
     AIRE — con un material que reciba luz, los jirones se sombrean por un lado
     y se vuelven algodones sólidos flotando sobre el páramo. `depthWrite` en
     falso para que no se recorten entre ellos ni tapen la copa: la niebla se
     acumula, no se apila. */
  const matNiebla = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: NEUTROS.nieve,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      toneMapped: false,
    }),
    [],
  );
  /* La GOTA: agua viva con un punto de espuma. Lleva algo de emisivo para que
     se vea contra el tronco oscuro de la queñua sin tener que hacerla enorme —
     una gota grande deja de ser gota y pasa a ser bola de chicle. */
  const matGota = useMemo(
    () => (perfil?.materialRico
      ? new THREE.MeshStandardMaterial({
        color: AGUAS.viva, emissive: AGUAS.lagunaOrilla, emissiveIntensity: 0.45, roughness: 0.2,
      })
      : new THREE.MeshLambertMaterial({
        color: AGUAS.viva, emissive: AGUAS.lagunaOrilla, emissiveIntensity: 0.5,
      })),
    [perfil],
  );
  /* El material de los pisos apagados: multiplica hacia abajo sin desaturar del
     todo. Señalar un piso NO puede ser esconder los otros. */
  const matApagado = useMemo(() => {
    const m = crearMaterialVertexColors(perfil);
    m.color = new THREE.Color('#6a6b60');
    return m;
  }, [perfil]);

  useEffect(() => () => {
    [matTierra, matVeg, matAgua, matEspuma, matRed, matNodo, matNiebla, matGota, matApagado]
      .forEach((m) => m.dispose());
  }, [matTierra, matVeg, matAgua, matEspuma, matRed, matNodo, matNiebla, matGota, matApagado]);

  /*
   * ¿SE APAGA ESTE PISO? Solo si el foco es un piso DE VERDAD.
   *
   * `foco` viene de la `vista`, y la vista puede traer un valor que no es
   * ningún piso: es la red de seguridad de `pisosVisiblesParaVista`, la que
   * dibuja la ladera entera para que un valor raro nunca deje el mundo vacío.
   * Con la comparación cruda (`foco && foco !== piso`) ESE caso apagaba a los
   * cuatro guardianes a la vez — la ladera completa en penumbra y sin
   * protagonista, que es peor que no apagar nada. Apagar tiene sentido cuando
   * hay alguien a quien resaltar; si no lo hay, no se apaga nadie.
   */
  const focoReal = foco && PISOS.some((p) => p.id === foco) ? foco : null;
  const apagar = (pisoId) => !!focoReal && focoReal !== pisoId;

  /* ¿Qué material le toca a la vegetación de un piso? */
  const matDe = (piso) => (apagar(piso) ? matApagado : matVeg);

  /* Los Ents se HUNDEN un palmo en la tierra. El pie del fuste es un anillo
     abierto de radio 1,3 y el terreno ondula dentro de esa huella: apoyado al
     ras, por el lado de abajo se le vería el hueco del tubo. */
  const alturaDe = (p) => alturaLadera(p.x, p.z) - 0.22;

  return (
    <group name="ladera-cuatro-ents">
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

      {/* ── LA FÁBRICA DE AGUA DEL PÁRAMO ──
          La niebla llega de la cumbre, la copa de la queñua se la toma, y lo
          que baja por el tronco ya es agua. Es la lección del páramo dibujada
          en vez de escrita: causa (niebla) → tránsito (gotas por el fuste) →
          efecto (el manantial que ya estaba ahí). */}
      <JironesNiebla eje={eje} jirones={jirones} reducedMotion={reducedMotion} mat={matNiebla} />
      <GotasParamo curva={curvaGota} gotas={gotas} reducedMotion={reducedMotion} mat={matGota} />

      {/* ── LA RED DEL SUBSUELO: lo que amarra a los cuatro por debajo ── */}
      <mesh geometry={red} material={matRed} />
      <NodosRed nodos={nodos} reducedMotion={reducedMotion} mat={matNodo} />
      {pulsos.length > 0 && (
        <PulsosRed curva={curvaRed} pulsos={pulsos} reducedMotion={reducedMotion} mat={matNodo} />
      )}
      {/* …y EL TRATO, árbol por árbol: baja el azúcar, sube el mineral */}
      {bajantes.map((b) => (
        <PulsosRaiz
          key={`trato-${b.id}`}
          curva={b.curva}
          pulsos={b.pulsos}
          reducedMotion={reducedMotion}
          mat={matNodo}
        />
      ))}

      {/* ── LA VEGETACIÓN DE CADA PISO — el cortejo del Ent se dibuja SOLO
          cuando su piso está entre los visibles (`seDibuja`); la cobertura
          rasante de abajo (mortino/romerillo/musgo/roca) es de toda la
          ladera y no se recorta nunca.
          ACLARADOS: el gaque (el peor), el encenillo —árbol de niebla, copa
          oscura compacta— y el mortiño. Los tres traen el verde horneado para
          penumbra y al sol de estas terrazas se juntaban en manchones negros
          al pie de los guardianes. El gaque necesita más mano que los otros. ── */}
      {seDibuja('calido') && (
        <Banco geo={geosVeg.ceibita} mat={matDe('calido')} items={siembra.ceibita} castShadow={!!perfil?.sombras} />
      )}
      {seDibuja('templado') && (
        <>
          <Banco geo={geosVeg.roble} mat={matDe('templado')} items={siembra.roble} castShadow={!!perfil?.sombras} />
          <Banco geo={geosVeg.gaque} mat={matDe('templado')} items={siembra.gaque} aclarar={1.45} />
        </>
      )}
      {seDibuja('frio') && (
        <>
          <Banco geo={geosVeg.aliso} mat={matDe('frio')} items={siembra.aliso} castShadow={!!perfil?.sombras} />
          <Banco geo={geosVeg.encenillo} mat={matDe('frio')} items={siembra.encenillo} aclarar={1.3} />
        </>
      )}
      {seDibuja('paramo') && (
        <>
          <Banco geo={geosVeg.frailejon} mat={matDe('paramo')} items={siembra.frailejon} castShadow={!!perfil?.sombras} />
          <Banco geo={geosVeg.frailejonFlor} mat={matDe('paramo')} items={siembra.frailejonFlor} />
        </>
      )}
      <Banco geo={geosVeg.mortino} mat={matVeg} items={siembra.mortino} aclarar={1.3} />
      <Banco geo={geosVeg.romerillo} mat={matVeg} items={siembra.romerillo} />
      <Banco geo={geosVeg.musgo} mat={matVeg} items={siembra.musgo} hundir={0.04} />
      <Banco geo={geosVeg.roca} mat={matVeg} items={siembra.roca} hundir={0.12} />

      {/* ══════════════════════════════════════════════════════════════════
          LOS ÁRBOLES MAESTROS — máximo dos a la vez (`seDibuja`), nunca los
          cuatro de fondo: la regla dura del operador (2026-07-22).

          Los cuatro salen del MISMO componente y eso ya no es un ahorro de
          código: es la única forma de que se lean como hermanos. Mientras la
          queñua se montaba aparte, tenía otra talla en la cara y en el retrato
          de familia se notaba de una.
          ══════════════════════════════════════════════════════════════════ */}

      {/* LA CEIBA — tierra caliente. Su mano señala su propio contrafuerte: es
          lo único que de ella se puede afirmar sin inventar. */}
      {seDibuja('calido') && (
        <group name="piso-calido" position={[pisoDe('calido').x, alturaDe(pisoDe('calido')), pisoDe('calido').z]} rotation={[0, 0.06, 0]}>
          <EntGradiente especie="ceiba" tier={tier} reducedMotion={reducedMotion} apagado={apagar('calido')} />
        </group>
      )}

      {/* EL ROBLE — templado y frío. Su mano señala las setas del pie. */}
      {seDibuja('templado') && (
        <group name="piso-templado" position={[pisoDe('templado').x, alturaDe(pisoDe('templado')), pisoDe('templado').z]} rotation={[0, -0.16, 0]}>
          <EntGradiente especie="roble" tier={tier} reducedMotion={reducedMotion} apagado={apagar('templado')} />
        </group>
      )}

      {/* EL ALISO — frío. Su mano señala los nódulos de Frankia de su raíz. */}
      {seDibuja('frio') && (
        <group name="piso-frio" position={[pisoDe('frio').x, alturaDe(pisoDe('frio')), pisoDe('frio').z]} rotation={[0, 0.1, 0]}>
          <EntGradiente especie="aliso" tier={tier} reducedMotion={reducedMotion} apagado={apagar('frio')} />
        </group>
      )}

      {/* LA QUEÑUA — páramo. Su corteza sigue pelándose en láminas y su barba
          de usnea sigue colgando, pero la CARA ya salió del mismo cincel que
          las otras tres. Su mano señala el nacimiento del agua. */}
      {seDibuja('paramo') && (
        <group name="piso-paramo" position={[pisoDe('paramo').x, alturaDe(pisoDe('paramo')), pisoDe('paramo').z]} rotation={[0, 0.22, 0]}>
          <EntGradiente especie="quenua" tier={tier} reducedMotion={reducedMotion} apagado={apagar('paramo')} />
        </group>
      )}
    </group>
  );
}
