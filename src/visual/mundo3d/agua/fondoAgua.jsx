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
 *     lavada hacia el aire — los Andes "siguen y siguen".
 *   · EL MACIZO DE LA CHORRERA: la pared alta en el rumbo del nacimiento, con
 *     su HILO BLANCO cayendo en gradas — el agua de esta quebrada NACE arriba;
 *     la lámina cuenta de dónde viene (render sin física, como en el valle).
 *   · NIEBLA DEL VALLE: bancos bajos de bruma dorada hacia la vega — el valle
 *     de abajo, lleno de tarde.
 *   · FALDA: el terreno NO se acaba en el borde de la maqueta; copia su cota
 *     en la costura, sube hacia la loma, se despeña hacia la vega y se
 *     disuelve en el aire.
 *   · LA QUEBRADA QUE SIGUE: el hilo de agua cruza la costura y culebrea falda
 *     abajo hasta perderse — "lo que cae aquí llega a la vereda de abajo",
 *     ahora se VE.
 *
 * Montar dentro del <Canvas> de MundoAgua3D. Estático: cero useFrame — todo
 * se paga una vez al construir. Tier-safe: los conteos bajan con el tier.
 */
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ATMOSFERA, PALETA, mezclar } from '../atmosferaMadre.js';
import { crearRng } from '../particulasData.js';

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

/* La dirección del sol DIBUJADO: la CONTRALUZ de la tarde sobre la loma del
   nacimiento — el mismo azimut donde este mundo siempre pintó su sol (el
   viejo SolDorado en [-12, 4.6, -7.5]) y donde apunta la direccional de
   relleno. Desde el plano de reposo y durante todo el vuelo de llegada, el
   disco queda EN CUADRO, colgado sobre el macizo. */
const SOL_DIR = new THREE.Vector3(-9, 2.6, -8.5).normalize();

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
  { r: 95, base: -9, alto: 14, picos: 15, semilla: 23, aire: 0.2 },
  { r: 150, base: -12, alto: 26, picos: 12, semilla: 41, aire: 0.44 },
  { r: 215, base: -15, alto: 38, picos: 10, semilla: 67, aire: 0.64 },
];
function construirCuchillas(capa, pal, segs = 140) {
  const { r, base, alto, picos: nPicos, semilla, aire } = capa;
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
    return Math.max(0.08, h) * alto;
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

/* ── EL MACIZO DE LA CHORRERA ───────────────────────────────────────────────
      La pared alta en el rumbo exacto del nacimiento (por eso el vuelo de
      llegada la encuentra de frente): un anfiteatro de roca vestida de monte
      con la caída blanca bajando en gradas por la grieta. Es RENDER, no
      física — la regla del valle: la Chorrera se dibuja, no se simula. */
const MACIZO = { cx: -62, cz: -97, medio: 44, alto: 29, base: -16, comba: 10 };
/* Perfil de la cresta (u ∈ [-1,1] → fracción de MACIZO.alto): dos cumbres y
   la grieta de la caída entre ambas, en u ≈ 0.03. */
const PERFIL_MACIZO = [
  [-1.0, 0.02], [-0.82, 0.2], [-0.6, 0.46], [-0.42, 0.64], [-0.26, 0.8],
  [-0.12, 0.92], [-0.03, 0.99], [0.015, 0.88], [0.05, 0.9], [0.1, 1.0],
  [0.2, 0.86], [0.34, 0.62], [0.52, 0.4], [0.74, 0.18], [1.0, 0.02],
];
/* Marco local del macizo: `dir` mira de la pared hacia el origen; `dcha` corre
   a lo largo de la cresta. La cara se comba ALEJÁNDOSE en los extremos
   (anfiteatro cóncavo hacia el espectador). */
function marcoMacizo() {
  const dir = new THREE.Vector3(-MACIZO.cx, 0, -MACIZO.cz).normalize();
  const dcha = new THREE.Vector3(-dir.z, 0, dir.x);
  return { dir, dcha };
}
function puntoMacizo(u, y, salida) {
  const { dir, dcha } = marcoMacizo();
  const comba = MACIZO.comba * u * u; // los extremos se alejan del ojo
  salida[0] = MACIZO.cx + dcha.x * u * MACIZO.medio - dir.x * comba;
  salida[1] = y;
  salida[2] = MACIZO.cz + dcha.z * u * MACIZO.medio - dir.z * comba;
  return salida;
}
function construirMacizo(pal) {
  const pos = [];
  const col = [];
  const cBase = new THREE.Color(mezclar('#3d4c3a', pal.aire, 0.2));
  const cCima = new THREE.Color(mezclar('#475542', pal.aire, 0.14));
  const cSol = new THREE.Color(mezclar(mezclar('#475542', pal.aire, 0.14), pal.resplandor, 0.28));
  const c0 = new THREE.Color();
  const c1 = new THREE.Color();
  const p = [0, 0, 0];
  const meter = (x, y, z, c) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); };
  for (let i = 0; i < PERFIL_MACIZO.length - 1; i++) {
    const [u0, f0] = PERFIL_MACIZO[i];
    const [u1, f1] = PERFIL_MACIZO[i + 1];
    const y0 = MACIZO.base + f0 * (MACIZO.alto - MACIZO.base) + ruido(u0 * 31, 7) * 0.7;
    const y1 = MACIZO.base + f1 * (MACIZO.alto - MACIZO.base) + ruido(u1 * 31, 7) * 0.7;
    // la ladera del lado del sol (u > 0 mira al oriente) se enciende apenas
    c0.copy(cCima).lerp(cSol, Math.max(0, u0) * 0.55);
    c1.copy(cCima).lerp(cSol, Math.max(0, u1) * 0.55);
    const [ax, , az] = puntoMacizo(u0, 0, p); const ay0 = y0;
    const [bx, , bz] = puntoMacizo(u1, 0, p); const by0 = y1;
    // dos triángulos: base (lavada) → cresta (con su luz)
    meter(ax, MACIZO.base - 6, az, cBase); meter(bx, MACIZO.base - 6, bz, cBase); meter(ax, ay0, az, c0);
    meter(bx, MACIZO.base - 6, bz, cBase); meter(bx, by0, bz, c1); meter(ax, ay0, az, c0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  return g;
}
/* El hilo blanco: cae en GRADAS por la grieta (u≈0.03), ensanchándose, y se
   lava hacia el aire al fondo — La Chorrera vista desde la finca. */
const GRADAS = [
  [0.030, 1.0, 0.9], [0.036, 0.82, 1.3], [0.024, 0.62, 1.7], [0.040, 0.4, 2.4],
  [0.030, 0.2, 3.1], [0.033, 0.02, 4.0],
];
function construirHiloChorrera(pal) {
  const { dir, dcha } = marcoMacizo();
  const pos = [];
  const col = [];
  const cAlta = new THREE.Color(pal.lechosa);
  const cBaja = new THREE.Color(mezclar(pal.lechosa, pal.aire, 0.6));
  const c = new THREE.Color();
  const meter = (x, y, z) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); };
  const punto = (u, f, w, lado) => {
    const y = MACIZO.base + f * (MACIZO.alto - MACIZO.base) * 0.93;
    const comba = MACIZO.comba * u * u;
    // un palmo DELANTE de la pared, para que el hilo no pelee el z-buffer
    const x = MACIZO.cx + dcha.x * (u * MACIZO.medio + w * lado) - dir.x * comba + dir.x * 1.4;
    const z = MACIZO.cz + dcha.z * (u * MACIZO.medio + w * lado) - dir.z * comba + dir.z * 1.4;
    return [x, y, z];
  };
  for (let i = 0; i < GRADAS.length - 1; i++) {
    const [u0, f0, w0] = GRADAS[i];
    const [u1, f1, w1] = GRADAS[i + 1];
    c.copy(cAlta).lerp(cBaja, i / (GRADAS.length - 1));
    const a0 = punto(u0, f0, w0, -1), b0 = punto(u0, f0, w0, 1);
    const a1 = punto(u1, f1, w1, -1), b1 = punto(u1, f1, w1, 1);
    meter(...a0); meter(...a1); meter(...b0);
    meter(...b0); meter(...a1); meter(...b1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  return g;
}
function MacizoChorrera({ pal }) {
  const geos = useMemo(() => ({ pared: construirMacizo(pal), hilo: construirHiloChorrera(pal) }), [pal]);
  useLayoutEffect(
    () => () => {
      geos.pared.dispose();
      geos.hilo.dispose();
    },
    [geos],
  );
  const pieBruma = useMemo(() => {
    const p = [0, 0, 0];
    puntoMacizo(0.03, MACIZO.base + 1.5, p);
    return /** @type {[number, number, number]} */ ([p[0], p[1], p[2]]);
  }, []);
  return (
    <group>
      <mesh geometry={geos.pared} renderOrder={-87} frustumCulled={false}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} fog={false} />
      </mesh>
      <mesh geometry={geos.hilo} renderOrder={-86} frustumCulled={false}>
        <meshBasicMaterial vertexColors transparent opacity={0.88} depthWrite={false} fog={false} side={THREE.DoubleSide} />
      </mesh>
      {/* la bruma del pie: donde el agua revienta, la nube propia de la caída */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[pieBruma[0] + (i - 1) * 3.2, pieBruma[1] + (i % 2) * 1.4, pieBruma[2] + (i - 1) * 1.5]}
          scale={[5.5 + i * 1.4, 2 + (i % 2), 3.4]}
          renderOrder={-85}
          frustumCulled={false}
        >
          <sphereGeometry args={[0.5, 8, 6]} />
          <meshBasicMaterial color={pal.lechosa} transparent opacity={0.3} depthWrite={false} fog={false} />
        </mesh>
      ))}
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
    const subida = Math.max(0, -sa) * 6.5 * t ** 1.4; // hacia la loma
    const caida = Math.max(0, sa) * 8.5 * t ** 1.5; // hacia la vega
    const lomita = ruido(wx * 0.14, wz * 0.14) * (0.5 + 5.2 * t);
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
 */
export default function FondoAgua({ cielo, altura, mitadX, mitadZ, salidaQuebrada, tier }) {
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
      <MacizoChorrera pal={pal} />
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
