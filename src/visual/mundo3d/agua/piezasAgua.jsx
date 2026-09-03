/*
 * piezasAgua — LO QUE ACOMPAÑA AL AGUA: la mano del campesino y las cuatro
 * plantas que de verdad hacen algo con la lluvia. Componentes r3f puros
 * (geometría en useMemo, sin estado, sin reloj propio salvo lo que se les pasa).
 *
 * ── REGLA DE ARTE DE ESTE MÓDULO ────────────────────────────────────────────
 * La estrella es el agua. El paisaje es SOPORTE y se comporta como tal: aquí NO
 * HAY ÁRBOLES. Ni uno. Un árbol mal hecho —un cono verde encima de un palito—
 * arruina una escena entera y no enseña nada; y en un corte de ladera lo que
 * de verdad frena, peina y guarda el agua no es la silueta de un árbol: es
 *
 *   - la ROSETA del frailejón (que condensa la niebla: agua que nadie ve caer),
 *   - la BRIZNA (cobertura, pajonal y —atravesada— la barrera viva),
 *   - el MATORRAL bajo de la ronda (masa irregular, no cono),
 *   - y la HOJARASCA, que ya vive en la cara del corte.
 *
 * Formas permitidas: briznas cónicas finas, rosetas, y masas irregulares con
 * ruido. Forma PROHIBIDA: cono sobre cilindro. Si algo no se puede hacer digno,
 * no se pone: la escena se sostiene sola con el agua.
 *
 * El ganado tampoco se dibuja: se dibuja lo que DEJA (`Hoyos`). La ausencia
 * enseña mejor que una vaca de caricatura — y no hay caricatura que se caiga.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TIERRAS, NEUTROS, VERDES, NIEBLAS, AGUAS, mezclar } from '../paleta/index.js';
import { PAL, rng } from './cicloAgua.geom.js';

/* Colores que solo existen aquí, todos DERIVADOS (GUIA §1: ni un hex suelto). */
const HOJA_SECA = new THREE.Color(mezclar(TIERRAS.turba, NEUTROS.lamina, 0.42)); // el faldón del frailejón
const VETIVER = new THREE.Color(mezclar(VERDES.templado, TIERRAS.pajonal, 0.28)); // la barrera viva
const NUBE_ALTA = new THREE.Color(NIEBLAS.lechosa);
const NUBE_PANZA = new THREE.Color(mezclar(NIEBLAS.lechosa, AGUAS.lagunaHonda, 0.42)); // la panza cargada
const MANGUERA = new THREE.Color(mezclar(NEUTROS.tinta, TIERRAS.rocaSierra, 0.35));

/*
 * Fusiona partes en UNA geometría. LA TRAMPA (heredada de floraParamo.geom /
 * sucesion.geom, y documentada allá con sangre): `mergeGeometries` exige que el
 * indexado coincida en TODAS las partes — y en three no coincide solo: Cone /
 * Cylinder / Sphere vienen INDEXADAS, Icosahedron (todo Polyhedron) NO. Mezclar
 * las dos devuelve `null` y apenas escupe un console.error: la pieza no se
 * dibuja y nadie se entera. Por eso: desindexar todo, y si aun así falla,
 * TRONAR. Una mata que falta tiene que doler, no esconderse.
 */
function fusionar(partes, quien) {
  const buenas = partes.filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  const geo = mergeGeometries(buenas, false);
  if (!geo) throw new Error(`piezasAgua: la fusión falló en '${quien}'`);
  return geo;
}

/** Pinta una geometría entera de un color (para poder fusionar con otras). */
function pintar(geo, color) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
  return geo;
}

/**
 * Ruido por POSICIÓN, no por índice de vértice. Es la única forma correcta aquí:
 * Icosahedron es no-indexado, así que cada esquina viene DUPLICADA — un ruido
 * por vértice le daría a cada copia un desplazamiento distinto y la malla se
 * RASGARÍA. Hasheando la posición, las copias reciben lo mismo y la masa queda
 * cerrada.
 */
function ruidoPos(v) {
  const s = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

/** Abolla una esfera/icosaedro para que sea una MASA, no una pelota. */
function abollar(geo, amt) {
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.multiplyScalar(1 + (ruidoPos(v.clone().normalize()) - 0.5) * 2 * amt);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------------ */
/* EL FRAILEJÓN — la fábrica de agua                                    */
/* ------------------------------------------------------------------ */

/*
 * "¿Por qué cuidan tanto el páramo si yo no vivo ni siembro allá arriba?"
 * (corpus). Porque esto de acá: la roseta peina la niebla, la gota escurre por
 * el tallo y la turbera la guarda. El frailejón no es un adorno andino — es la
 * primera pieza del acueducto.
 *
 * Geometría honesta: columna gruesa vestida de HOJA MUERTA (el frailejón no
 * bota la hoja: se abriga con ella, y por eso aguanta la helada) rematada en
 * una roseta de hojas plateadas y peludas. Cero cono sobre palito.
 */
function frailejonGeom() {
  const r = rng(211);
  const partes = [];

  /* la columna, vestida de faldón: anillos de hoja seca apilados */
  partes.push(pintar(new THREE.CylinderGeometry(0.052, 0.062, 1, 7).translate(0, 0.5, 0), HOJA_SECA));
  const anillos = 5;
  for (let i = 0; i < anillos; i++) {
    const y = 0.1 + (i / anillos) * 0.82;
    const g = new THREE.CylinderGeometry(0.075, 0.095, 0.16, 7, 1, true);
    g.rotateY(r() * 1.2);
    g.translate(0, y, 0);
    partes.push(pintar(g, HOJA_SECA.clone().multiplyScalar(0.9 + r() * 0.2)));
  }

  /* LA ROSETA: hojas lanceoladas, plateadas, abiertas hacia arriba y afuera.
     Dos coronas (una abierta, una cerrada en el cogollo) = el peine de niebla. */
  const corona = (n, largo, inclina, esc) => {
    for (let i = 0; i < n; i++) {
      const g = new THREE.ConeGeometry(0.032 * esc, largo, 3, 1);
      g.translate(0, largo / 2, 0);
      g.rotateZ(inclina);
      g.rotateY((i / n) * Math.PI * 2 + r() * 0.25);
      g.translate(0, 1, 0);
      partes.push(pintar(g, PAL.plata.clone().multiplyScalar(0.88 + r() * 0.24)));
    }
  };
  corona(9, 0.3, 1.05, 1); // la corona abierta: la que peina
  corona(6, 0.19, 0.42, 0.8); // el cogollo, apretado

  return fusionar(partes, 'frailejon');
}

/**
 * El frailejonal de la cresta. Instanciado: una geometría, N rosetas.
 * @param {{lista: Array}} props
 */
export function Frailejonal({ lista }) {
  const ref = useRef(null);
  const geo = useMemo(() => frailejonGeom(), []);
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    [],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    lista.forEach((f, i) => {
      e.set(0, f.giro, 0);
      q.setFromEuler(e);
      /* escala CASI uniforme: `esc` solo cambia la robustez del tallo. Escalar
         la Y sola estiraría la roseta y la volvería un plumero — y la roseta es
         justo lo que hay que respetar: es la firma del páramo. */
      s.set(f.esc * f.alto, f.alto, f.esc * f.alto);
      p.set(f.pos[0], f.pos[1], f.pos[2]);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [lista]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!lista.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, lista.length]} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* LAS BRIZNAS — cobertura, pajonal y BARRERA VIVA                      */
/* ------------------------------------------------------------------ */

/*
 * "¿El vetiver de verdad sirve para frenar la erosión o es solo cuento de los
 * técnicos?" (corpus). Sirve: una línea de matas ATRAVESADA a la pendiente
 * frena el agua, le quita la tierra que trae y con los años hace terraza sola.
 * Por eso en la ladera muerta las barreras son lo único vivo — y por eso justo
 * ahí, detrás de cada barrera, la loma todavía existe.
 */
function mataGeom() {
  const r = rng(223);
  const partes = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.ConeGeometry(0.05, 1, 3, 1);
    g.translate(0, 0.5, 0);
    g.rotateZ(0.1 + r() * 0.3); // se abre: una mata no es un cepillo
    g.rotateY((i / 4) * Math.PI * 2 + r() * 0.7);
    g.translate((r() - 0.5) * 0.05, 0, (r() - 0.5) * 0.05);
    partes.push(g);
  }
  return fusionar(partes, 'mata');
}

const COLOR_BRIZNA = {
  barrera: VETIVER,
  cobertura: PAL.cobertura,
  paja: PAL.pajonal,
  ronda: PAL.ronda,
};

/** Todas las briznas de la cuenca en UN draw-call. */
export function Briznas({ lista }) {
  const ref = useRef(null);
  const geo = useMemo(() => mataGeom(), []);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ flatShading: true }), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    lista.forEach((b, i) => {
      e.set(0, b.giro, 0);
      q.setFromEuler(e);
      s.set(b.esc * 0.5, b.alto, b.esc * 0.5);
      p.set(b.x, b.y - 0.02, b.z);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, COLOR_BRIZNA[b.tipo] || PAL.cobertura);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [lista]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!lista.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, lista.length]} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* EL MATORRAL DE LA RONDA                                              */
/* ------------------------------------------------------------------ */

/**
 * "¿Puedo cortar el monte que está alrededor de la quebrada para sembrar más?"
 * (corpus). Esto es ese monte: masas bajas e irregulares pegadas al agua. No
 * son árboles y no pretenden serlo — son la ronda, y son la razón de que el
 * agua de este lado salga limpia.
 */
export function Matorral({ lista }) {
  const ref = useRef(null);
  const geo = useMemo(() => abollar(new THREE.IcosahedronGeometry(1, 1), 0.3), []);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ flatShading: true }), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    lista.forEach((b, i) => {
      e.set(0, b.giro, 0);
      q.setFromEuler(e);
      s.set(b.r, b.r * b.achate, b.r * 0.92);
      p.set(b.pos[0], b.pos[1] + b.r * b.achate * 0.55, b.pos[2]);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      const k = 0.85 + ((b.semilla % 100) / 100) * 0.3;
      mesh.setColorAt(i, PAL.ronda.clone().multiplyScalar(k));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [lista]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!lista.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, lista.length]} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* LA NUBE — una sola, para las dos laderas                             */
/* ------------------------------------------------------------------ */

/**
 * La misma nube llueve sobre el suelo vivo y sobre el pelado. El cielo no tiene
 * favoritos: toda la diferencia la hace lo que hay abajo. Por eso la nube es
 * UNA y está centrada — si hubiera dos, la escena mentiría.
 *
 * Panza oscura arriba→abajo por color de vértice (no por luz): así se lee
 * cargada aun a mediodía.
 */
export function Nube({ lista, carga = 1 }) {
  const ref = useRef(null);
  const geo = useMemo(() => {
    const g = abollar(new THREE.IcosahedronGeometry(1, 2), 0.16);
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    const v = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      c.copy(NUBE_PANZA).lerp(NUBE_ALTA, THREE.MathUtils.clamp(v.y * 0.5 + 0.62, 0, 1));
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, []);
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.96 }),
    [],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    lista.forEach((b, i) => {
      s.set(b.r, b.r * b.achate, b.r * 0.85);
      p.set(b.pos[0], b.pos[1], b.pos[2]);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [lista]);
  useLayoutEffect(() => { mat.opacity = 0.55 + 0.42 * carga; }, [mat, carga]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!lista.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, lista.length]} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* LA COSECHA DE AGUA — techo, canaleta, tanque                         */
/* ------------------------------------------------------------------ */

/**
 * "¿Vale la pena poner un tanque para recoger el agua del techo?" (corpus): sí,
 * y el zinc es el mejor techo para eso porque es liso y no se queda con nada.
 *
 * El tanque está CORTADO como todo en esta escena (media caña abierta hacia la
 * cámara): así se ve el nivel subir con el aguacero, que es el punto. Y tiene
 * TAPA, porque el corpus es explícito: destapado se llena de hojas y bichos.
 *
 * El nivel llega por REF, no por prop de estado: subirlo con `setState` obligaría
 * a re-renderizar media escena varias veces por segundo para mover un cilindro.
 * Aquí el agua se escribe imperativa en el useFrame — cero setState, como el
 * resto de la casa.
 *
 * @param {{sitio: object, nivelRef: {current: number}}} props  nivelRef 0..1
 */
export function CasaTanque({ sitio, nivelRef }) {
  const aguaRef = useRef(null);
  const caraRef = useRef(null);
  const rT = 0.19;
  const hT = 0.38;

  const posar = () => {
    const h = Math.max(0.012, (nivelRef?.current ?? 0.45) * hT);
    for (const ref of [aguaRef, caraRef]) {
      if (!ref.current) continue;
      ref.current.scale.y = h;
      ref.current.position.y = h / 2 + 0.012;
    }
  };
  useLayoutEffect(posar);
  useFrame(posar);

  return (
    <group position={sitio.casa} rotation={[0, sitio.giro, 0]}>
      {/* — la casa: paredes de cal — */}
      <mesh position={[0, 0.24, 0]}>
        <boxGeometry args={[0.9, 0.48, 0.66]} />
        <meshLambertMaterial color={PAL.cal} />
      </mesh>
      {/* — el techo de zinc a dos aguas: liso, y por eso entrega casi todo — */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.25, 0.62, 0]} rotation={[0, 0, s * 0.62]}>
          <boxGeometry args={[0.62, 0.022, 0.74]} />
          <meshLambertMaterial color={PAL.zinc} />
        </mesh>
      ))}
      {/* — la canaleta: el borde que decide si el agua se cosecha o se pierde — */}
      <mesh position={[0.5, 0.47, 0]}>
        <boxGeometry args={[0.05, 0.045, 0.74]} />
        <meshLambertMaterial color={PAL.zinc.clone().multiplyScalar(0.82)} />
      </mesh>
      {/* — la bajante hasta el tanque — */}
      <mesh position={[0.5, 0.24, -0.3]}>
        <cylinderGeometry args={[0.016, 0.016, 0.46, 6]} />
        <meshLambertMaterial color={PAL.zinc.clone().multiplyScalar(0.82)} />
      </mesh>
      <mesh position={[0.62, 0.02, -0.44]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, 0.3, 6]} />
        <meshLambertMaterial color={PAL.zinc.clone().multiplyScalar(0.82)} />
      </mesh>

      {/* — EL TANQUE, cortado: media caña de atrás + tapa + el agua adentro — */}
      <group position={[0.82, -0.02, -0.44]}>
        {/* la pared (media caña trasera): el corte deja ver el nivel */}
        <mesh>
          <cylinderGeometry args={[rT, rT, hT, 20, 1, true, Math.PI / 2, Math.PI]} />
          <meshLambertMaterial color={PAL.piedra} side={THREE.DoubleSide} />
        </mesh>
        {/* el piso: media luna que ha de caer en la MITAD DE ATRÁS, la misma que
            la media caña. Ojo con el ángulo: la rotación -90° en X manda el +Y
            del círculo al -Z del mundo, así que la media buena es [0, PI). */}
        <mesh position={[0, -hT / 2 + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[rT, 20, 0, Math.PI]} />
          <meshLambertMaterial color={PAL.piedra.clone().multiplyScalar(0.8)} side={THREE.DoubleSide} />
        </mesh>
        {/* LA TAPA (el corpus insiste: tapado, o se le mete de todo) */}
        <mesh position={[0, hT / 2 + 0.012, 0]}>
          <cylinderGeometry args={[rT + 0.018, rT + 0.018, 0.022, 20]} />
          <meshLambertMaterial color={PAL.zinc} />
        </mesh>
        {/* el agua guardada: media caña + su cara cortada. Sube con el aguacero
            y BAJA con el uso — el tanque es memoria, no adorno. */}
        <group position={[0, -hT / 2, 0]}>
          <mesh ref={aguaRef} scale={[1, 0.2, 1]}>
            <cylinderGeometry args={[rT * 0.97, rT * 0.97, 1, 20, 1, false, Math.PI / 2, Math.PI]} />
            <meshLambertMaterial color={PAL.clara} transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
          <mesh ref={caraRef} position={[0, 0, 0.004]} scale={[1, 0.2, 1]}>
            <planeGeometry args={[rT * 1.94, 1]} />
            <meshLambertMaterial color={PAL.clara} transparent opacity={0.82} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* LA CERCA DE LA RONDA                                                 */
/* ------------------------------------------------------------------ */

/**
 * "¿A qué distancia del nacimiento puedo sembrar o tener ganado?" (corpus). La
 * respuesta, en madera: aquí el animal no pasa. Del otro lado no hay cerca —
 * y se ve en el agua.
 */
export function CercaRonda({ postes }) {
  const alambres = useMemo(() => {
    const out = [];
    for (let i = 0; i < postes.length - 1; i++) {
      const a = postes[i];
      const b = postes[i + 1];
      const largo = Math.hypot(b.x - a.x, b.z - a.z);
      const ang = Math.atan2(b.x - a.x, b.z - a.z);
      for (const h of [0.16, 0.3]) {
        out.push({
          id: `${i}-${h}`,
          pos: [(a.x + b.x) / 2, (a.y + b.y) / 2 + h, (a.z + b.z) / 2],
          rotY: ang,
          largo,
        });
      }
    }
    return out;
  }, [postes]);

  return (
    <group>
      {postes.map((p, i) => (
        <mesh key={`p${i}`} position={[p.x, p.y + 0.19, p.z]}>
          <cylinderGeometry args={[0.017, 0.021, 0.42, 5]} />
          <meshLambertMaterial color={PAL.maderaOscura} />
        </mesh>
      ))}
      {alambres.map((a) => (
        <mesh key={a.id} position={a.pos} rotation={[0, a.rotY, 0]}>
          <boxGeometry args={[0.005, 0.005, a.largo]} />
          <meshLambertMaterial color={PAL.zinc.clone().multiplyScalar(0.7)} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* LO QUE DEJA EL GANADO                                                */
/* ------------------------------------------------------------------ */

/**
 * Los hoyos de pata en la orilla sin ronda. No hay vaca: hay huella. El suelo
 * pisado "queda como una lámina dura" (corpus) — y el agua, que no puede
 * entrar por ahí, se va por encima llevándose la orilla.
 */
export function Hoyos({ lista }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 7, 5), []);
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: PAL.barro.clone().multiplyScalar(0.62) }),
    [],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    lista.forEach((h, i) => {
      e.set(0, h.giro, 0);
      q.setFromEuler(e);
      s.set(h.r, h.r * 0.28, h.r * 1.25); // aplastado: es una pisada, no una bola
      p.set(h.x, h.y, h.z);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [lista]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!lista.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, lista.length]} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* LOS SURCOS EN CONTORNO Y LA LÍNEA DE GOTEO                           */
/* ------------------------------------------------------------------ */

/**
 * Los surcos EN CONTORNO de la ladera viva: camellones atravesados a la
 * pendiente. Cada uno es una represita — el agua baja, se topa y se queda el
 * rato que necesita para meterse. Enfrente, los de la otra ladera van derecho
 * loma abajo y son cárcavas. Es el mismo azadón: cambia la dirección.
 */
export function SurcosContorno({ curvas }) {
  const geo = useMemo(
    () => fusionar(
      curvas.map((c) => new THREE.TubeGeometry(c, 34, 0.045, 5, false)),
      'surcos',
    ),
    [curvas],
  );
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ color: PAL.surco }), []);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

/** La zanja de infiltración: el tajo que agarra la que se iba. */
export function Zanja({ curva }) {
  const geo = useMemo(() => new THREE.TubeGeometry(curva, 30, 0.075, 6, false), [curva]);
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: PAL.humus.clone().multiplyScalar(0.85) }),
    [],
  );
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

/**
 * La manguera del goteo sobre la hilera. "¿Me conviene invertir en goteo o es
 * solo para fincas grandes?" (corpus): el goteo pone el agua EN LA RAÍZ y no en
 * el aire — por eso en esta escena, a mediodía, sus gotas son las únicas que
 * llegan.
 */
export function LineaGoteo({ matas }) {
  const curva = useMemo(
    () => new THREE.CatmullRomCurve3(
      matas.map((m) => new THREE.Vector3(m.x, m.y + 0.14, m.z)),
      false,
      'catmullrom',
      0.4,
    ),
    [matas],
  );
  const geo = useMemo(() => new THREE.TubeGeometry(curva, 30, 0.014, 5, false), [curva]);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ color: MANGUERA }), []);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  return (
    <group>
      <mesh geometry={geo} material={mat} frustumCulled={false} />
      {matas.map((m, i) => (
        <mesh key={`g${i}`} position={[m.x, m.y + 0.14, m.z]}>
          <sphereGeometry args={[0.022, 6, 5]} />
          <meshLambertMaterial color={MANGUERA.clone().multiplyScalar(1.4)} />
        </mesh>
      ))}
    </group>
  );
}
