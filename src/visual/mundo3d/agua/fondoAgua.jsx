/*
 * fondoAgua — LA INMENSIDAD del mundo del agua (la lámina de Humboldt).
 *
 * El diorama del camino del agua terminaba donde terminaba la malla: una
 * maqueta de 19×17 flotando en la niebla — la "caja de leche". Este módulo le
 * pinta el RESTO DEL PAISAJE con la misma gramática de perspectiva aérea que
 * el fondo del páramo (fondoParamo, «le da un toque de inmensidad muy bueno»):
 * todo lo lejano se dibuja SIN fog, con el lavado hacia el color del aire ya
 * horneado en los vértices — la bruma sugiere, no traga.
 *
 * Las piezas (todas procedurales y deterministas, cero assets):
 *   · BÓVEDA: el cielo enorme de la hora dorada — horizonte tibio → cenit
 *     hondo — con el lóbulo de resplandor en la dirección REAL de la luz.
 *   · SOL LEJANO: el disco bajo con su halo, en el azimut de la direccional
 *     (fuente visible = luz con origen), lejos de la maqueta.
 *   · CORDILLERA: anillos de cuchillas a distancias crecientes, cada capa más
 *     lavada hacia el aire — los Andes "siguen y siguen" (con una VENTANA en
 *     el rumbo de La Chorrera: ninguna cuchilla genérica tapa la caída real).
 *   · LA CHORRERA REAL (chorreraReal.jsx): el farallón fiel al cañón de
 *     Guatoc — domo redondeado, hendidura cóncava, roca estratificada, bosque
 *     de pared instanciado — con la caída volumétrica escalonada de ~590 m
 *     (secciones con desfase, espuma deshilachada, bruma en cada impacto).
 *     Reemplaza al macizo inventado que vivía aquí: la forma ahora la dicta
 *     el referente del valle (DEM + fotos), no la imaginación.
 *   · NIEBLA DEL VALLE: bancos bajos de bruma dorada hacia la vega — el valle
 *     de abajo, lleno de tarde.
 *   · FALDA: el terreno NO se acaba en el borde de la maqueta; copia su cota
 *     en la costura, sube hacia la loma, se despeña hacia la vega y se
 *     disuelve en el aire.
 *   · LA QUEBRADA QUE SIGUE: el hilo de agua cruza la costura y culebrea falda
 *     abajo hasta perderse — "lo que cae aquí llega a la vereda de abajo",
 *     ahora se VE.
 *
 * Montar dentro del <Canvas> de MundoAgua3D. La lámina es estática (se paga
 * una vez al construir); solo el agua de La Chorrera respira (un useFrame en
 * chorreraReal, congelado con reduced-motion). Tier-safe: los conteos bajan.
 */
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ATMOSFERA, PALETA, mezclar } from '../atmosferaMadre.js';
import { crearRng } from '../particulasData.js';
import ChorreraReal from './chorreraReal.jsx';
import { SOL_DIR } from './solAgua.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/* Ruido determinista (hash de senos): la misma lejanía siempre. */
const ruido = (wx, wz) =>
  Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
  Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
  Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2;

/* La dirección del sol DIBUJADO (la CONTRALUZ de la tarde sobre la loma del
   nacimiento) vive en solAgua.js (SOL_DIR): el farallón la necesita para
   hornear su contraluz y la lámina para el lóbulo del cielo — una sola verdad.
   Desde el plano de reposo y durante el vuelo de llegada, el disco queda EN
   CUADRO, colgado sobre el macizo. */

/* ── LA PALETA DE LA LEJANÍA ──────────────────────────────────────────────────
      Derivada del CIELO ya mezclado hacia la madre (mezclarCielo(CIELOS.agua)):
      la lámina es del MISMO atardecer que el diorama. Gramática de fondoParamo:
      cuchilla = ancla OSCURA de valor (contra el cielo dorado, el monte lejano
      es silueta), horizonte = el aire acostado y tibio, cenit sereno. */
function paletaLejania(cielo) {
  const horizonte = mezclar(cielo.niebla, '#f3d9a4', 0.55);
  // El aire acostado AZULEA (perspectiva aérea): la silueta lejana se lava
  // hacia azul-plata contra el cielo dorado, no hacia beige.
  const aire = mezclar(horizonte, '#9fb4c6', 0.52);
  return {
    horizonte,
    aire,
    cenit: mezclar(cielo.cielo, '#8fa3b8', 0.45),
    // El monte lejano al atardecer: verde hondo empujado al azul del aire
    // (con base verde-azulada: el marrón puro leía a chocolate en el smoke).
    cuchilla: mezclar('#4f6058', aire, 0.24),
    resplandor: mezclar('#ffe9b8', ATMOSFERA.luz, 0.5),
    lechosa: '#f6f2e0',
    niebla: cielo.niebla,
  };
}

/* ── LA BÓVEDA ──────────────────────────────────────────────────────────────── */
function construirBoveda(radio, pal) {
  const geo = new THREE.SphereGeometry(radio, 26, 16);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const cCenit = new THREE.Color(pal.cenit);
  const cHorizonte = new THREE.Color(pal.horizonte);
  const cResplandor = new THREE.Color(pal.resplandor);
  const c = new THREE.Color();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    // El degradé cabe en el cuadro (cámara casi a nivel): el peso del cenit
    // baja hasta ~20° de elevación, como en la lámina del páramo.
    c.copy(cHorizonte).lerp(cCenit, smoothstep(-0.01, 0.36, v.y) ** 0.9);
    // El lóbulo del sol, estrecho (abierto lava el cielo entero).
    const haciaSol = clamp(v.dot(SOL_DIR), 0, 1);
    c.lerp(cResplandor, haciaSol ** 5 * (0.75 - smoothstep(0.1, 0.7, v.y) * 0.3));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

function BovedaAgua({ pal }) {
  const geo = useMemo(() => construirBoveda(380, pal), [pal]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} renderOrder={-100} frustumCulled={false}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
}

/* ── EL SOL LEJANO ──────────────────────────────────────────────────────────
      Tres discos concéntricos (núcleo, halo, velo) plantados LEJOS en la
      dirección de la luz — reemplaza al viejo SolDorado que vivía a 14 m del
      diorama, donde ahora empieza la falda. */
function SolLejano({ pal }) {
  const pos = useMemo(() => {
    const p = SOL_DIR.clone().multiplyScalar(290);
    return /** @type {[number, number, number]} */ ([p.x, p.y, p.z]);
  }, []);
  return (
    <group position={pos} renderOrder={-95}>
      <mesh>
        <circleGeometry args={[14, 36]} />
        <meshBasicMaterial color="#fff4d4" transparent opacity={0.96} depthWrite={false} fog={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.8]}>
        <circleGeometry args={[30, 36]} />
        <meshBasicMaterial color={pal.resplandor} transparent opacity={0.34} depthWrite={false} fog={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -1.6]}>
        <circleGeometry args={[56, 36]} />
        <meshBasicMaterial color={pal.horizonte} transparent opacity={0.16} depthWrite={false} fog={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ── LA CORDILLERA QUE NO SE ACABA ──────────────────────────────────────────
      La gramática de crestas de fondoParamo (dos pendientes distintas por
      pico, hombros a media ladera, dentado fino) con la paleta del atardecer
      del agua. Cada capa más lejana se lava MÁS hacia el aire. */
const CORDILLERA = [
  // ventana: la capa cercana se agacha en el rumbo de La Chorrera — la caída
  // real (chorreraReal) se ve ENTERA, sin cuchilla genérica cruzando su pie
  { r: 95, base: -9, alto: 14, picos: 15, semilla: 23, aire: 0.2, ventana: 0.9 },
  { r: 150, base: -12, alto: 26, picos: 12, semilla: 41, aire: 0.44 },
  { r: 215, base: -15, alto: 38, picos: 10, semilla: 67, aire: 0.64 },
];
/* azimut del macizo real en la parametrización de los anillos (x=sin·r, z=−cos·r) */
const AZ_CHORRERA = Math.atan2(-62, 97);
function construirCuchillas(capa, pal, segs = 140) {
  const { r, base, alto, picos: nPicos, semilla, aire, ventana = 0 } = capa;
  const rng = crearRng(semilla);
  const picos = Array.from({ length: nPicos }, () => ({
    a: rng() * Math.PI * 2,
    wIzq: 0.03 + rng() * 0.11,
    wDer: 0.03 + rng() * 0.11,
    h: 0.5 + rng() * 0.8,
    hombro: rng() < 0.55 ? 0.3 + rng() * 0.45 : 0,
  }));
  const perfil = (a) => {
    let h = 0.3 + 0.14 * Math.sin(a * 3.1 + semilla) + 0.09 * Math.sin(a * 6.7 - semilla * 0.3)
      + 0.09 * Math.sin(a * 14.3 + semilla * 2.1) + 0.05 * Math.sin(a * 23.7 - semilla)
      + 0.035 * Math.sin(a * 37.3 + semilla * 1.7) + 0.02 * Math.sin(a * 53.9 - semilla * 0.7);
    for (const p of picos) {
      let d = a - p.a;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      const w = d < 0 ? p.wIzq : p.wDer;
      h += p.h * Math.exp(-(d * d) / (2 * w * w));
      if (p.hombro) {
        const dh = d - p.wDer * 2.1;
        h += p.h * p.hombro * 0.5 * Math.exp(-(dh * dh) / (2 * (p.wDer * 1.5) ** 2));
      }
    }
    let k = 1;
    if (ventana) {
      const d = Math.atan2(Math.sin(a - AZ_CHORRERA), Math.cos(a - AZ_CHORRERA));
      k = 1 - ventana * Math.exp(-(d * d) / (0.42 * 0.42));
    }
    return Math.max(0.08, h) * alto * k;
  };
  const pos = [];
  const col = [];
  const cCresta = new THREE.Color(mezclar(pal.cuchilla, pal.aire, aire));
  const cFalda = new THREE.Color(mezclar(pal.cuchilla, pal.aire, Math.min(1, aire + 0.26)));
  const cLuz = new THREE.Color(mezclar(mezclar(pal.cuchilla, pal.aire, aire), pal.resplandor, 0.26));
  const aSol = Math.atan2(SOL_DIR.x, -SOL_DIR.z);
  const cSeg = new THREE.Color();
  const meter = (x, y, z, c) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); };
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const x0 = Math.sin(a0) * r, z0 = -Math.cos(a0) * r;
    const x1 = Math.sin(a1) * r, z1 = -Math.cos(a1) * r;
    const h0 = base + perfil(a0), h1 = base + perfil(a1);
    const luz = Math.max(0, Math.cos((a0 + a1) / 2 - aSol)) * (1 - aire) * 0.38;
    cSeg.copy(cCresta).lerp(cLuz, luz);
    meter(x0, base - 14, z0, cFalda); meter(x1, base - 14, z1, cFalda); meter(x0, h0, z0, cSeg);
    meter(x1, base - 14, z1, cFalda); meter(x1, h1, z1, cSeg); meter(x0, h0, z0, cSeg);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  return g;
}
function CordilleraAgua({ pal, capas }) {
  const geos = useMemo(() => CORDILLERA.slice(0, capas).map((c) => construirCuchillas(c, pal)), [pal, capas]);
  useLayoutEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} renderOrder={-90 + i} frustumCulled={false}>
          {/* SÍ escribe profundidad: el macizo y la niebla se ordenan solos. */}
          <meshBasicMaterial vertexColors side={THREE.DoubleSide} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ── LA CHORRERA REAL ───────────────────────────────────────────────────────
      Vive en chorreraReal.jsx: el farallón fiel al cañón (domo, hendidura,
      estratos, bosque de pared) con la caída volumétrica escalonada. Aquí
      solo se monta — el macizo de cartón que ocupaba este lugar fue borrado
      EN FIRME: la forma la dicta el referente real, no se vuelve a inventar. */

/* ── EL CHIFLÓN + LA ROCA BLANCA (la OTRA montaña) ──────────────────────────
      Corrección geográfica del operador (fotos reales chiflon-rocablanca +
      wide-ubicacion-chiflon, ops/refs-chorrera): el Chiflón NO va pegado a
      La Chorrera — es una caída MÁS PEQUEÑA en una montaña APARTE, a la
      DERECHA desde el domo, junto a un farallón de ROCA CLARA expuesta (la
      Roca Blanca, con su socavón en sombra al pie). Aquí es un morro boscoso
      lejano con el hilo delgado INSINUADO (en la foto wide es un chorrito):
      estático, luz horneada, dos draw calls. */
/* az +0.44 rad ≈ el corrimiento angular Chorrera→Chiflón que muestra la foto
   wide, ajustado para que el chorrito quede DENTRO del encuadre de reposo
   (hfov/2 ≈ 32.8°): se insinúa al borde derecho, bien separado de la caída */
const CHIFLON = { az: AZ_CHORRERA + 0.44, r: 90, base: -11, alto: 24, medio: 24 };
function construirMorroChiflon(pal) {
  const NX = 120, NY = 30; // denso: la Roca Blanca necesita borde nítido
  // (con 84×18 la interpolación de vértices la volvía un blob difuso)
  const cima = (x) => {
    const u = x / CHIFLON.medio; // −1..1 a lo largo del morro
    let h = CHIFLON.alto * (0.42 + 0.58 * Math.exp(-(u * u) / (0.5 * 0.5)));
    h *= 1 - smoothstep(0.55, 1, Math.abs(u)) * 0.9;
    h += ruido(x * 0.45 + 9.1, 3.3) * 1.2;
    return Math.max(1.0, h);
  };
  const pos = new Float32Array((NX + 1) * (NY + 1) * 3);
  const col = new Float32Array((NX + 1) * (NY + 1) * 3);
  // OJO: mezclar interpola en espacio LINEAL — 10% hacia el aire claro ya
  // dispara la luminancia (el morro salía sage lavado; medido en el gate).
  // El verde se deja casi puro y el aire entra apenas.
  const cMonte = new THREE.Color('#22392c');
  const cMonteL = new THREE.Color(mezclar('#456339', pal.aire, 0.05));
  const cRoca = new THREE.Color(mezclar('#e8e2d2', pal.aire, 0.24));
  const cRocaBanda = new THREE.Color(mezclar('#a89f8a', pal.aire, 0.3));
  const cSocavon = new THREE.Color(mezclar('#2a241c', pal.aire, 0.22));
  const cAire = new THREE.Color(pal.aire);
  const c = new THREE.Color();
  let p = 0;
  for (let iy = 0; iy <= NY; iy++) {
    const t = iy / NY;
    for (let ix = 0; ix <= NX; ix++) {
      const x = -CHIFLON.medio + (2 * CHIFLON.medio * ix) / NX;
      const y = CHIFLON.base + (cima(x) - CHIFLON.base) * t;
      const z = (1 - t) * 1.8 + ruido(x * 0.3 + 1.7, y * 0.4 + 6.2) * 0.7;
      pos[p] = x; pos[p + 1] = y; pos[p + 2] = z;
      // bosque cerrado con rodales que respiran + grano de dosel (sin el
      // grano fino el morro salía una loma LISA gris — visto en el gate)
      const mota = ruido(x * 0.5 + 4.4, y * 0.6 + 2.2) * 0.5 + 0.5;
      c.copy(cMonte).lerp(cMonteL, mota * 0.6);
      c.multiplyScalar(0.78 + 0.3 * (ruido(x * 1.9 + 7.7, y * 2.3 + 3.1) * 0.5 + 0.5));
      // LA ROCA BLANCA: farallón claro VERTICAL (más alto que ancho, como en
      // la foto), borde duro con mordiscos de ruido, bedding horizontal y el
      // socavón en sombra al pie
      const borde = ruido(x * 1.3 + 2.9, y * 1.1 + 5.5) * 0.14;
      const mRoca = Math.exp(-(((x + 4) / 3.4) ** 2) - (((t - 0.5) / 0.19) ** 2)) + borde;
      if (mRoca > 0.42) {
        const banda = Math.sin(y * 2.4 + x * 0.2) * 0.5 + 0.5;
        c.lerp(cRoca, Math.min(1, (mRoca - 0.42) * 4.5));
        c.lerp(cRocaBanda, smoothstep(0.52, 0.85, banda) * 0.6 * Math.min(1, mRoca));
        const mCueva = Math.exp(-(((x + 4.2) / 2.8) ** 2) - (((t - 0.36) / 0.055) ** 2));
        c.lerp(cSocavon, Math.min(1, mCueva * 1.8));
      }
      c.lerp(cAire, 0.05 + t * 0.04); // lejanía horneada, sin deslavarlo:
      // es la OTRA montaña boscosa (oscura en la foto wide), no una cuchilla
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iy = 0; iy < NY; iy++) {
    for (let ix = 0; ix < NX; ix++) {
      const a = iy * (NX + 1) + ix, b = a + 1, d = a + NX + 1, e = d + 1;
      // winding CCW visto desde +z local (el espectador): con (a,d,b) la
      // normal caía a −z y el morro entero se culleaba — invisible en el gate
      idx.push(a, b, d, b, e, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}
/* el hilo del Chiflón: cinta delgada con dos quiebres, MUCHO menor que La
   Chorrera (en la foto wide es un hilo) — cae por el flanco derecho del morro */
function construirHiloChiflon(pal) {
  const puntos = [
    [6.2, 0.66], [5.9, 0.5], [5.2, 0.38], [4.9, 0.24], [4.4, 0.08],
  ];
  const pos = [];
  const col = [];
  const cHilo = new THREE.Color(mezclar('#f6f8f2', pal.aire, 0.2));
  const cPie = new THREE.Color(mezclar(pal.lechosa, pal.aire, 0.35));
  const c = new THREE.Color();
  for (let i = 0; i < puntos.length; i++) {
    const [x, t] = puntos[i];
    const y = CHIFLON.base + (CHIFLON.alto * 0.92 - CHIFLON.base) * t;
    const w = 0.22 + (1 - t) * 0.16;
    const z = (1 - t) * 1.8 + 0.55;
    c.copy(cHilo).lerp(cPie, 1 - t);
    pos.push(x - w / 2, y, z, x + w / 2, y, z);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);
  }
  const idx = [];
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  g.setIndex(idx);
  return g;
}
function ChiflonRocaBlanca({ pal }) {
  const geos = useMemo(
    () => ({ morro: construirMorroChiflon(pal), hilo: construirHiloChiflon(pal) }),
    [pal],
  );
  useLayoutEffect(
    () => () => {
      geos.morro.dispose();
      geos.hilo.dispose();
    },
    [geos],
  );
  const marco = useMemo(() => {
    const x = Math.sin(CHIFLON.az) * CHIFLON.r;
    const z = -Math.cos(CHIFLON.az) * CHIFLON.r;
    return { pos: /** @type {[number,number,number]} */ ([x, 0, z]), ry: Math.atan2(-x, -z) };
  }, []);
  return (
    <group position={marco.pos} rotation={[0, marco.ry, 0]}>
      <mesh geometry={geos.morro} renderOrder={-84} frustumCulled={false}>
        <meshBasicMaterial vertexColors fog={false} />
      </mesh>
      <mesh geometry={geos.hilo} renderOrder={-83} frustumCulled={false}>
        <meshBasicMaterial vertexColors fog={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ── LA NIEBLA DEL VALLE ────────────────────────────────────────────────────
      Bancos bajos hacia la VEGA (+z): el valle de abajo lleno de tarde. Los
      del lado del sol se doran; el resto queda lechoso. Estáticos. */
function NieblaValle({ pal, n }) {
  const bancos = useMemo(() => {
    const rng = crearRng(733);
    return Array.from({ length: n }, () => {
      // sector de la vega: alrededor de +z, ceñido (regado a los lados los
      // bancos asomaban como óvalos flotando sobre el horizonte)
      const a = Math.PI / 2 + (rng() - 0.5) * 1.1;
      const r = 68 + rng() * 50;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const haciaSol = clamp(new THREE.Vector3(x, 4, z).normalize().dot(SOL_DIR), 0, 1);
      return {
        pos: /** @type {[number, number, number]} */ ([x, -8.5 + rng() * 2, z]),
        esc: /** @type {[number, number, number]} */ ([18 + rng() * 20, 1.6 + rng() * 1.1, 10 + rng() * 12]),
        color: mezclar(pal.lechosa, pal.resplandor, haciaSol * 0.55),
        op: 0.24 + rng() * 0.12,
      };
    });
  }, [pal, n]);
  return (
    <group>
      {bancos.map((b, i) => (
        <mesh key={i} position={b.pos} scale={b.esc} renderOrder={-60} frustumCulled={false}>
          <sphereGeometry args={[0.5, 9, 6]} />
          <meshBasicMaterial color={b.color} transparent opacity={b.op} depthWrite={false} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ── LA FALDA + LA QUEBRADA QUE SIGUE ───────────────────────────────────────
      El anillo que abraza el RECTÁNGULO de la maqueta: en la costura copia la
      cota real (alturaFn) y hacia afuera sube a la loma (−z), cae a la vega
      (+z) y ondula; el color arranca en el pasto/pajonal de la orilla y se
      lava hacia la niebla (horneado: se disuelve igual aunque el tier apague
      el fog). La quebrada cruza la costura por su salida real y culebrea
      falda abajo hasta perderse. */
const FALDA_EXT = 56; // cuánto sigue el terreno más allá de la maqueta
function geometriaFalda(alturaFn, mitadX, mitadZ, pal, anillos, segs) {
  const rBorde = (ca, sa) =>
    1 / Math.max(Math.abs(ca) / (mitadX - 0.05), Math.abs(sa) / (mitadZ - 0.05));
  /* la cota de la falda en (a, t) — compartida con el hilo de la quebrada */
  const cota = (ca, sa, t) => {
    const r0 = rBorde(ca, sa) - 0.3;
    const wx = ca * (r0 + FALDA_EXT * t ** 1.75);
    const wz = sa * (r0 + FALDA_EXT * t ** 1.75);
    const ySeam = alturaFn(ca * r0, sa * r0);
    const m = smoothstep(0, 0.22, t);
    // VENTANA hacia La Chorrera: en el rumbo del macizo la falda se agacha
    // (la loma subía un filo chocolate que tapaba media caída — gate v1);
    // el valle real ABRE la vista a la pared, no la cierra
    const haciaCh = smoothstep(0.78, 0.96, ca * -0.539 + sa * -0.843);
    const subida = Math.max(0, -sa) * 6.5 * (1 - haciaCh * 0.7) * t ** 1.4; // hacia la loma
    const caida = Math.max(0, sa) * 8.5 * t ** 1.5; // hacia la vega
    const lomita = ruido(wx * 0.14, wz * 0.14) * (0.5 + 5.2 * t) * (1 - haciaCh * 0.65);
    return { wx, wz, y: ySeam - 0.09 + m * (subida - caida + lomita), ySeam };
  };
  const nx = segs + 1;
  const pos = new Float32Array((anillos + 1) * nx * 3);
  const col = new Float32Array((anillos + 1) * nx * 3);
  const cPasto = new THREE.Color(PALETA.follajeClaro);
  const cLoma = new THREE.Color('#9aa66a');
  // La BANDA MEDIA de la lámina: antes del aire viene el monte — el potrero
  // se hunde en verde hondo (lavar el pasto directo con la niebla dorada daba
  // dunas beige, no lejanía; visto en el smoke). Solo al final azulea.
  const cMonte = new THREE.Color(mezclar('#5c7046', PALETA.follaje, 0.35));
  const cNiebla = new THREE.Color(mezclar(pal.aire, '#aebcb6', 0.4));
  const c = new THREE.Color();
  let p = 0;
  for (let ia = 0; ia <= anillos; ia++) {
    const t = ia / anillos;
    for (let is = 0; is <= segs; is++) {
      const a = (is / segs) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const { wx, wz, y, ySeam } = cota(ca, sa, t);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      c.lerpColors(cPasto, cLoma, smoothstep(0.5, 2.6, ySeam + Math.max(0, -sa) * 6.5 * t));
      // moteado de potrero/monte (matiza la duna lisa) …
      const mota = ruido(wx * 0.31 + 3.7, wz * 0.31 - 1.9);
      // … la banda media verde …
      c.lerp(cMonte, smoothstep(0.08, 0.45, t) * (0.5 + clamp(mota, 0, 1) * 0.3));
      // … y el lavado hacia el aire, HORNEADO (la falda se disuelve sola)
      c.lerp(cNiebla, smoothstep(0.35, 0.98, t) * 0.8);
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let ia = 0; ia < anillos; ia++) {
    for (let is = 0; is < segs; is++) {
      const a = ia * nx + is, b = a + 1, d = a + nx, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  const plano = g.toNonIndexed();
  g.dispose();
  plano.computeVertexNormals();
  return { geo: plano, cota };
}
function geometriaHiloQuebrada(cota, salida, pal) {
  const aQ = Math.atan2(salida[1], salida[0]); // el azimut de la salida real
  const pasos = 14;
  const pos = [];
  const col = [];
  const cAgua = new THREE.Color(mezclar(PALETA.agua, pal.lechosa, 0.18));
  const cLejos = new THREE.Color(mezclar(pal.aire, pal.niebla, 0.35));
  const c = new THREE.Color();
  const meter = (x, y, z) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); };
  const orilla = (t, lado) => {
    // el meandro: el hilo culebrea falda abajo, ensanchándose apenas
    const a = aQ + (0.16 * Math.sin(t * 9) + 0.07 * Math.sin(t * 21)) * t * 3;
    const ca = Math.cos(a), sa = Math.sin(a);
    const q = cota(ca, sa, t * 0.52);
    const w = 0.14 + t * 0.7;
    // el ancho, perpendicular en planta al rumbo radial
    return [q.wx - sa * w * lado, q.y + 0.12, q.wz + ca * w * lado];
  };
  for (let i = 0; i < pasos; i++) {
    const t0 = i / pasos, t1 = (i + 1) / pasos;
    c.copy(cAgua).lerp(cLejos, smoothstep(0.2, 1, t1));
    const a0 = orilla(t0, -1), b0 = orilla(t0, 1);
    const a1 = orilla(t1, -1), b1 = orilla(t1, 1);
    meter(...a0); meter(...b0); meter(...a1);
    meter(...b0); meter(...b1); meter(...a1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  return g;
}
function FaldaAgua({ alturaFn, mitadX, mitadZ, salidaQuebrada, pal, anillos, segs }) {
  const piezas = useMemo(() => {
    const { geo, cota } = geometriaFalda(alturaFn, mitadX, mitadZ, pal, anillos, segs);
    return { falda: geo, hilo: geometriaHiloQuebrada(cota, salidaQuebrada, pal) };
  }, [alturaFn, mitadX, mitadZ, salidaQuebrada, pal, anillos, segs]);
  useLayoutEffect(
    () => () => {
      piezas.falda.dispose();
      piezas.hilo.dispose();
    },
    [piezas],
  );
  return (
    <group>
      {/* SIN fog: la niebla dorada de la escena se comía el verde de la banda
          media y la falda entera salía beige (visto en el smoke) — el lavado
          va HORNEADO en los vértices, que para eso está. En la costura el fog
          de la maqueta todavía vale ~0 (está pegada al ojo): no hay escalón. */}
      <mesh geometry={piezas.falda} renderOrder={-70} frustumCulled={false}>
        <meshLambertMaterial vertexColors flatShading fog={false} />
      </mesh>
      <mesh geometry={piezas.hilo} renderOrder={-69} frustumCulled={false}>
        <meshBasicMaterial vertexColors transparent opacity={0.62} depthWrite={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
    </group>
  );
}

/**
 * La inmensidad del mundo del agua. Montar dentro del <Canvas>, antes del
 * terreno. Todo estático (cero useFrame); los conteos bajan con el tier.
 *
 * @param {object} props
 * @param {{fondo:string,cielo:string,suelo:string,niebla:string,intensidad:number}} props.cielo
 *   el CIELO ya mezclado hacia la madre (mezclarCielo(CIELOS.agua)).
 * @param {(wx:number, wz:number) => number} props.altura  la cota REAL del
 *   terreno del diorama (la falda la copia en la costura).
 * @param {number} props.mitadX  medio ancho del terreno (E-O).
 * @param {number} props.mitadZ  medio fondo del terreno (N-S).
 * @param {[number, number]} props.salidaQuebrada  [x,z] donde la quebrada
 *   sale de la maqueta (el hilo de la falda arranca en su azimut).
 * @param {'alto'|'medio'|'bajo'} props.tier
 * @param {boolean} props.reducedMotion  congela el agua de La Chorrera.
 */
export default function FondoAgua({ cielo, altura, mitadX, mitadZ, salidaQuebrada, tier, reducedMotion }) {
  const pal = useMemo(() => paletaLejania(cielo), [cielo]);
  const capas = tier === 'alto' ? 3 : 2;
  const nNiebla = tier === 'alto' ? 12 : tier === 'medio' ? 8 : 4;
  const anillos = tier === 'alto' ? 10 : 8;
  const segs = tier === 'alto' ? 80 : tier === 'medio' ? 64 : 48;
  return (
    <group>
      <BovedaAgua pal={pal} />
      <SolLejano pal={pal} />
      <CordilleraAgua pal={pal} capas={capas} />
      <ChorreraReal pal={pal} tier={tier} reducedMotion={reducedMotion} />
      <ChiflonRocaBlanca pal={pal} />
      <NieblaValle pal={pal} n={nNiebla} />
      <FaldaAgua
        alturaFn={altura}
        mitadX={mitadX}
        mitadZ={mitadZ}
        salidaQuebrada={salidaQuebrada}
        pal={pal}
        anillos={anillos}
        segs={segs}
      />
    </group>
  );
}
