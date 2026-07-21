/*
 * MundoAgua3D — el CAMINO DEL AGUA en la finca, como mundo 3D didáctico.
 *
 * Una sola escena low-poly recorre el ciclo real del agua campesina:
 *
 *   nacimiento (protegido con monte) → quebrada viva → bocatoma y canal →
 *   reservorio (+ cosecha de lluvia del techo) → riego de las camas de
 *   cultivo → filtración al suelo (corte de perfil) → vapor → nube → lluvia
 *   sobre la loma… y el ciclo se cierra donde empezó.
 *
 * DIDÁCTICA (sobria, en «usted», sin gamificación):
 *   - La quebrada SIGUE viva después de la bocatoma (caudal ecológico: el
 *     canal toma solo una parte — se ve, no solo se dice).
 *   - Un aviso junto a la quebrada pide no arrojar residuos (contaminación).
 *   - El techo de la casita cosecha lluvia hacia su propio tambor.
 *   - El corte de suelo muestra la filtración por capas hasta el acuífero.
 *   - Un recorrido por estaciones (botones DOM) lleva la cámara de la mano.
 *
 * DIRECCIÓN DE ARTE: hora dorada de `atmosferaMadre` (ATMOSFERA + CIELOS.agua
 * mezclado con `mezclarCielo` — la MISMA ley que EscenaBase3D) y materiales de
 * PALETA (el único azul con permiso es PALETA.agua). Terreno 100% procedural
 * determinista (cero assets remotos → cachea limpio offline).
 *
 * RENDIMIENTO: MeshLambert/Basic, sin shadow-maps ni post-proceso; partículas
 * instanciadas con presupuesto por `tier` (deviceTier); `reducedMotion` congela
 * flujos y pasa el frameloop a demanda.
 *
 * Mockup standalone con su PROPIO <Canvas> — ruta #/mockups/mundo-agua-3d.
 * NO toca mundoData ni el host <Mundo>.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { ATMOSFERA, CIELOS, PALETA, mezclarCielo } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import {
  Cardumen,
  Garza,
  MartinPescador,
  MirlaDeAgua,
  Libelulas,
  RanaQuebrada,
} from '../visual/mundo3d/agua/faunaAcuatica.jsx';
import { Aliso, VegetacionRibera } from '../visual/mundo3d/agua/vegetacionRibera.jsx';

/* ── El cielo del mundo agua, mezclado hacia la hora dorada (misma receta que
      EscenaBase3D → entrar aquí se siente del MISMO atardecer). Constante de
      módulo: mezclarCielo son 7 lerps, una sola vez. ── */
const CIELO = mezclarCielo(CIELOS.agua);

/* ── Geografía del recorrido (coordenadas de mundo):
      X oriente(+)/occidente(−) · Y altura · Z loma atrás(−) → vega adelante(+) ── */
const ANCHO = 19; // extensión E-O del terreno
const FONDO = 17; // extensión N-S

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const suavizar = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const gauss = (wx, wz, cx, cz, sx, sz) => {
  const dx = wx - cx, dz = wz - cz;
  return Math.exp(-((dx * dx) / (2 * sx * sx) + (dz * dz) / (2 * sz * sz)));
};
/* Ruido determinista (hash de senos): misma loma siempre, sin Math.random. */
const ruido = (wx, wz) =>
  Math.sin(wx * 1.1 + wz * 0.8) * 0.5 +
  Math.sin(wx * 2.1 - wz * 1.5 + 1.7) * 0.3 +
  Math.sin(wx * 3.7 + wz * 2.9 + 4.2) * 0.2;

/* La quebrada, como polilínea XZ: nace en la loma, culebrea, pasa por la
   bocatoma y SIGUE hacia la vega (caudal ecológico — no se toma toda). */
const QUEBRADA_XZ = [
  [-4.6, -5.6], // nacimiento (ojo de agua en la loma)
  [-3.9, -4.2],
  [-4.5, -2.8],
  [-3.4, -1.4],
  [-2.6, 0.2], // bocatoma: aquí el canal desvía una parte
  [-3.2, 1.8],
  [-2.7, 3.6],
  [-3.4, 5.6],
  [-3.1, 7.6], // sale de la escena, viva
];
const BOCATOMA_I = 4; // índice del punto de bocatoma en QUEBRADA_XZ
/* El canal de riego: recto y sereno, de la bocatoma al reservorio. */
const CANAL_XZ = [
  [-2.6, 0.2],
  [-1.2, 0.55],
  [0.6, 0.8],
  [1.9, 0.95],
];
const RESERVORIO = { x: 3.0, z: 1.05, r: 1.05 }; // el espejo de agua guardada
const CASITA = { x: 5.7, z: -0.9 }; // techo que cosecha lluvia
const TAMBOR = { x: 4.75, z: -0.35 }; // tambor de lluvia, bajo el canalón
/* Camas de cultivo en la vega, regadas por goteo desde el reservorio. */
const CAMAS = [3.4, 4.15, 4.9, 5.65].map((z) => ({ z, x0: 1.2, x1: 5.4 }));
const CORTE_SUELO = { x: 7.2, z: 4.4 }; // el corte de perfil (filtración)
const NUBE = { x: -3.6, y: 5.1, z: -4.6 }; // la nube que cierra el ciclo

/* Distancia de (wx,wz) a una polilínea XZ (para tallar el cauce y humedecer
   el pasto vecino). Pocos segmentos × ~3k vértices: se paga una sola vez. */
function distanciaPolilinea(wx, wz, pts) {
  let mejor = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az;
    const L2 = dx * dx + dz * dz || 1;
    const t = clamp(((wx - ax) * dx + (wz - az) * dz) / L2, 0, 1);
    const px = ax + dx * t, pz = az + dz * t;
    mejor = Math.min(mejor, Math.hypot(wx - px, wz - pz));
  }
  return mejor;
}

/* Altura BASE del terreno (sin tallar): loma atrás que baja a la vega. */
function alturaBase(wx, wz) {
  const s = clamp((1.8 - wz) / 9.5, 0, 1); // rampa vega→loma
  let h = Math.pow(s, 1.35) * 2.9;
  h += gauss(wx, wz, -4.6, -6.0, 2.6, 2.2) * 1.35; // la loma del nacimiento
  h += gauss(wx, wz, 5.5, -6.5, 3.4, 2.6) * 0.9; // estribación oriental
  h += ruido(wx, wz) * 0.09 * (0.25 + s); // textura, más quieta en la vega
  // La vega de las camas y el patio del reservorio se aplanan con cariño:
  h *= 1 - 0.65 * gauss(wx, wz, 3.6, 3.2, 3.4, 2.6) * (1 - s);
  return h;
}

/* Altura FINAL: la base con el cauce de la quebrada y el canal tallados. */
function altura(wx, wz) {
  let h = alturaBase(wx, wz);
  // Los cauces se tallan ANCHOS a propósito: el paso de la grilla del terreno
  // es ~0.34 y un surco más angosto se "puentea" (aliasing) dejando el agua
  // enterrada bajo la malla — visto en el smoke visual.
  const dq = distanciaPolilinea(wx, wz, QUEBRADA_XZ);
  h -= 0.26 * (1 - suavizar(0.2, 0.95, dq)); // el cañón suave de la quebrada
  const dc = distanciaPolilinea(wx, wz, CANAL_XZ);
  h -= 0.15 * (1 - suavizar(0.15, 0.65, dc)); // la zanja del canal
  const dr = Math.hypot(wx - RESERVORIO.x, wz - RESERVORIO.z);
  h -= 0.2 * (1 - suavizar(RESERVORIO.r * 0.75, RESERVORIO.r + 0.5, dr));
  return h;
}

/* ── Colores del pasto por altura y humedad (cerca del agua reverdece —
      didáctica silenciosa: donde hay agua, hay vida). ── */
const C_LOMA = new THREE.Color('#9aa66a'); // pajonal de la loma
const C_PASTO = new THREE.Color(PALETA.follajeClaro);
const C_HUMEDO = new THREE.Color(PALETA.follaje);
const C_RIBERA = new THREE.Color(PALETA.follajeOscuro);
function colorTerreno(wx, wz, y, out) {
  out.lerpColors(C_PASTO, C_LOMA, suavizar(0.5, 2.6, y));
  const dAgua = Math.min(
    distanciaPolilinea(wx, wz, QUEBRADA_XZ),
    distanciaPolilinea(wx, wz, CANAL_XZ),
    Math.max(0, Math.hypot(wx - RESERVORIO.x, wz - RESERVORIO.z) - RESERVORIO.r),
  );
  const humedad = 1 - suavizar(0.3, 2.4, dAgua);
  out.lerp(C_HUMEDO, humedad * 0.55);
  if (dAgua < 0.42) out.lerp(C_RIBERA, 0.5 * (1 - dAgua / 0.42));
  return out;
}

/* Construye la malla del terreno con colores por vértice. `plano` = flat
   shading des-indexado (facetas low-poly, solo tier alto). */
function construirTerreno(seg, plano) {
  const nx = seg + 1, nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = altura(wx, wz);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      colorTerreno(wx, wz, y, c);
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iz = 0; iz < seg; iz++) {
    for (let ix = 0; ix < seg; ix++) {
      const a = iz * nx + ix, b = a + 1, d = a + nx, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  if (plano) geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  return geo;
}

/* Curva 3D sobre el terreno a partir de una polilínea XZ (para cintas de agua
   y para que las gotas viajen). `alza` la levanta apenas del lecho. */
function curvaSobreTerreno(ptsXZ, alza = 0.06) {
  const pts = ptsXZ.map(([x, z]) => new THREE.Vector3(x, altura(x, z) + alza, z));
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.35);
}

/* CINTA de agua: la curva barrida en XZ con un ancho — el espejo de la
   quebrada y del canal. Cada VÉRTICE se drapea sobre el terreno en su propio
   (x,z): la curva suavizada se aparta de la polilínea tallada, y si la Y solo
   se interpola en los puntos de control la cinta se entierra (visto en el
   smoke visual). */
function construirCinta(curva, ancho, muestras = 64, alza = 0.09) {
  const pos = new Float32Array(muestras * 2 * 3);
  const p = new THREE.Vector3();
  const tang = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i < muestras; i++) {
    const t = i / (muestras - 1);
    curva.getPointAt(t, p);
    curva.getTangentAt(t, tang);
    const nx = -tang.z, nz = tang.x; // perpendicular en el plano XZ
    const L = Math.hypot(nx, nz) || 1;
    const ox = (nx / L) * ancho * 0.5, oz = (nz / L) * ancho * 0.5;
    const ax = p.x - ox, az = p.z - oz;
    const bx = p.x + ox, bz = p.z + oz;
    pos[k++] = ax; pos[k++] = altura(ax, az) + alza; pos[k++] = az;
    pos[k++] = bx; pos[k++] = altura(bx, bz) + alza; pos[k++] = bz;
  }
  const idx = [];
  for (let i = 0; i < muestras - 1; i++) {
    const a = i * 2, b = a + 1, d = a + 2, e = a + 3;
    // winding CCW visto desde ARRIBA (normal +Y): con (a,d,b) la normal caía
    // hacia abajo y el espejo de agua se culleaba — invisible en el smoke.
    idx.push(a, b, d, b, e, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/* ── Piezas vivas ─────────────────────────────────────────────────────────── */

/* Espejo de agua que respira (brillo sutil; quieto con reduced-motion). */
function EspejoAgua({ geometria, reducedMotion, fase = 0, opacidad = 0.92 }) {
  const mat = useRef(null);
  useFrame((st) => {
    if (reducedMotion || !mat.current) return;
    mat.current.opacity = opacidad - 0.06 + Math.sin(st.clock.elapsedTime * 0.9 + fase) * 0.05;
  });
  return (
    <mesh geometry={geometria}>
      <meshLambertMaterial
        ref={mat}
        color={PALETA.agua}
        transparent
        opacity={opacidad}
        emissive="#2a6a86"
        emissiveIntensity={0.25}
      />
    </mesh>
  );
}

/* GOTAS VIAJERAS: esferitas instanciadas que recorren una curva — el agua se
   VE moverse de estación a estación. Congeladas con reduced-motion. */
function FlujoGotas({ curva, cuantas, velocidad, radio, reducedMotion, color = '#bfe6ef' }) {
  const inst = useRef(null);
  const tmp = useMemo(
    () => ({ p: new THREE.Vector3(), m: new THREE.Matrix4() }),
    [],
  );
  useFrame((st) => {
    if (!inst.current) return;
    const t0 = reducedMotion ? 0 : st.clock.elapsedTime * velocidad;
    for (let i = 0; i < cuantas; i++) {
      const t = (i / cuantas + t0) % 1;
      curva.getPointAt(t, tmp.p);
      // drapeadas sobre el terreno real (la Y de la curva puede hundirse
      // entre puntos de control — mismo arreglo que la cinta)
      tmp.m.makeTranslation(tmp.p.x, altura(tmp.p.x, tmp.p.z) + 0.15, tmp.p.z);
      inst.current.setMatrixAt(i, tmp.m);
    }
    inst.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={inst} args={[undefined, undefined, cuantas]} frustumCulled={false}>
      <sphereGeometry args={[radio, 6, 5]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} />
    </instancedMesh>
  );
}

/* VAPOR: motitas que suben del reservorio hacia la nube (el ciclo, visible). */
function Vapor({ origen, cuantas, reducedMotion }) {
  const inst = useRef(null);
  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      p: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      s: new THREE.Vector3(),
    }),
    [],
  );
  useFrame((st) => {
    if (!inst.current) return;
    const reloj = reducedMotion ? 0 : st.clock.elapsedTime;
    for (let i = 0; i < cuantas; i++) {
      const fase = (i / cuantas + reloj * 0.055) % 1;
      const desvio = Math.sin(i * 3.1) * 0.5;
      // sube del espejo de agua hacia la nube, derivando con el viento
      const x = origen.x + desvio + (NUBE.x - origen.x) * fase * 0.85 + Math.sin(reloj * 0.6 + i) * 0.14;
      const y = 0.25 + (NUBE.y - 0.6) * fase;
      const z = origen.z + Math.cos(i * 2.3) * 0.5 + (NUBE.z - origen.z) * fase * 0.85;
      const esc = 0.5 + fase * 1.1;
      tmp.p.set(x, y, z);
      tmp.s.set(esc, esc * 0.72, esc);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      inst.current.setMatrixAt(i, tmp.m);
    }
    inst.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={inst} args={[undefined, undefined, cuantas]} frustumCulled={false}>
      <sphereGeometry args={[0.11, 6, 5]} />
      <meshBasicMaterial color="#f7f2e4" transparent opacity={0.34} depthWrite={false} />
    </instancedMesh>
  );
}

/* LLUVIA bajo la nube: hilos que caen sobre la loma del nacimiento. */
function Lluvia({ cuantas, reducedMotion }) {
  const inst = useRef(null);
  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      p: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      s: new THREE.Vector3(1, 1, 1),
    }),
    [],
  );
  useFrame((st) => {
    if (!inst.current) return;
    const reloj = reducedMotion ? 0.35 : st.clock.elapsedTime;
    for (let i = 0; i < cuantas; i++) {
      const fase = (i / cuantas + reloj * 0.3) % 1;
      const x = NUBE.x + Math.sin(i * 12.9898) * 1.45;
      const z = NUBE.z + Math.cos(i * 78.233) * 1.1;
      const y = NUBE.y - 0.5 - fase * (NUBE.y - 1.2);
      tmp.p.set(x, y, z);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      inst.current.setMatrixAt(i, tmp.m);
    }
    inst.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={inst} args={[undefined, undefined, cuantas]} frustumCulled={false}>
      <cylinderGeometry args={[0.012, 0.012, 0.34, 4]} />
      <meshBasicMaterial color="#cfe4ea" transparent opacity={0.5} depthWrite={false} />
    </instancedMesh>
  );
}

/* GOTEO del riego: gotas que caen de la línea de goteo a cada cama, y la
   FILTRACIÓN: las mismas familias de gotas hundiéndose en el corte de suelo. */
function GoteoRiego({ cuantas, reducedMotion }) {
  const inst = useRef(null);
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4() }),
    [],
  );
  useFrame((st) => {
    if (!inst.current) return;
    const reloj = reducedMotion ? 0.3 : st.clock.elapsedTime;
    for (let i = 0; i < cuantas; i++) {
      const cama = CAMAS[i % CAMAS.length];
      const fase = (i / cuantas + reloj * 0.22) % 1;
      const x = cama.x0 + ((i * 0.6180339) % 1) * (cama.x1 - cama.x0);
      const y = 0.5 - fase * 0.42;
      tmp.m.makeTranslation(x, Math.max(y, 0.1), cama.z);
      inst.current.setMatrixAt(i, tmp.m);
    }
    inst.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={inst} args={[undefined, undefined, cuantas]} frustumCulled={false}>
      <sphereGeometry args={[0.035, 5, 4]} />
      <meshBasicMaterial color="#bfe6ef" transparent opacity={0.8} depthWrite={false} />
    </instancedMesh>
  );
}

/* Filtración en el corte de perfil: gotas que bajan por las capas del suelo
   hasta la franja del acuífero (frente al corte, visibles siempre). */
function Filtracion({ cuantas, reducedMotion }) {
  const inst = useRef(null);
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4() }),
    [],
  );
  useFrame((st) => {
    if (!inst.current) return;
    const reloj = reducedMotion ? 0.4 : st.clock.elapsedTime;
    for (let i = 0; i < cuantas; i++) {
      const fase = (i / cuantas + reloj * 0.09) % 1;
      const x = CORTE_SUELO.x - 0.55 + ((i * 0.7548776) % 1) * 1.1;
      const y = 1.28 - fase * 1.05;
      tmp.m.makeTranslation(x, y, CORTE_SUELO.z + 0.46);
      inst.current.setMatrixAt(i, tmp.m);
    }
    inst.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={inst} args={[undefined, undefined, cuantas]} frustumCulled={false}>
      <sphereGeometry args={[0.04, 5, 4]} />
      <meshBasicMaterial color="#9fd4e2" transparent opacity={0.85} depthWrite={false} />
    </instancedMesh>
  );
}

/* ── Piezas quietas (arquitectura del agua) ───────────────────────────────── */

/* El monte que PROTEGE el nacimiento es ahora ALISO real (Alnus acuminata), el
   árbol de ronda hídrica por excelencia — vive en vegetacionRibera.jsx. */

/* El nacimiento: ojo de agua entre piedras, con su ronda de monte. */
function Nacimiento() {
  const [sx, sz] = QUEBRADA_XZ[0];
  const y = altura(sx, sz);
  const piedras = [
    [0.36, 0.1, 0.05, 0.16], [-0.3, 0.05, 0.25, 0.13], [0.1, 0.02, -0.34, 0.18],
    [-0.2, 0.08, -0.2, 0.11], [0.3, 0.04, 0.32, 0.1],
  ];
  const monte = [
    [-0.9, 0, -0.7, 1.15], [0.8, 0, -0.85, 0.95], [-1.2, 0, 0.4, 0.8],
    [1.15, 0, 0.25, 1.05], [0.15, 0, -1.15, 1.25],
  ];
  return (
    <group position={[sx, y, sz]}>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 14]} />
        <meshLambertMaterial color={PALETA.agua} transparent opacity={0.95} emissive="#2a6a86" emissiveIntensity={0.3} />
      </mesh>
      {piedras.map(([px, py, pz, r], i) => (
        <mesh key={`p${i}`} position={[px, py, pz]}>
          <dodecahedronGeometry args={[r, 0]} />
          <meshLambertMaterial color={PALETA.piedra} flatShading />
        </mesh>
      ))}
      {monte.map(([px, py, pz, e], i) => (
        <Aliso key={`a${i}`} pos={[px, py, pz]} esc={e * 0.72} rot={i * 1.7} />
      ))}
    </group>
  );
}

/* La bocatoma: compuerta humilde de madera donde el canal toma SU parte. */
function Bocatoma() {
  const [bx, bz] = QUEBRADA_XZ[BOCATOMA_I];
  const y = altura(bx, bz);
  return (
    <group position={[bx, y, bz]}>
      <mesh position={[0.3, 0.16, 0.12]} rotation={[0, 0.35, 0]}>
        <boxGeometry args={[0.08, 0.34, 0.5]} />
        <meshLambertMaterial color={PALETA.maderaOscura} />
      </mesh>
      <mesh position={[0.42, 0.3, 0.12]} rotation={[0, 0.35, 0]}>
        <boxGeometry args={[0.05, 0.05, 0.6]} />
        <meshLambertMaterial color={PALETA.madera} />
      </mesh>
      <mesh position={[-0.28, 0.08, -0.05]}>
        <dodecahedronGeometry args={[0.15, 0]} />
        <meshLambertMaterial color={PALETA.piedra} flatShading />
      </mesh>
    </group>
  );
}

/* Bordes del canal: dos cordones de obra (gris cálido, jamás neutro). */
function BordesCanal({ curva }) {
  const bordes = useMemo(() => {
    const p = new THREE.Vector3();
    const t = new THREE.Vector3();
    const piezas = [];
    const n = 15;
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1);
      curva.getPointAt(s, p);
      curva.getTangentAt(s, t);
      const ang = Math.atan2(t.x, t.z);
      const nx = -t.z, nz = t.x;
      const L = Math.hypot(nx, nz) || 1;
      piezas.push(
        { pos: [p.x + (nx / L) * 0.2, p.y + 0.03, p.z + (nz / L) * 0.2], rot: ang },
        { pos: [p.x - (nx / L) * 0.2, p.y + 0.03, p.z - (nz / L) * 0.2], rot: ang },
      );
    }
    return piezas;
  }, [curva]);
  return (
    <group>
      {bordes.map((b, i) => (
        <mesh key={i} position={/** @type {[number, number, number]} */ (b.pos)} rotation={[0, b.rot, 0]}>
          <boxGeometry args={[0.09, 0.09, 0.34]} />
          <meshLambertMaterial color={PALETA.concreto} />
        </mesh>
      ))}
    </group>
  );
}

/* El reservorio: espejo circular con muro bajo de piedra. */
function Reservorio({ reducedMotion }) {
  const y = altura(RESERVORIO.x, RESERVORIO.z);
  const mat = useRef(null);
  useFrame((st) => {
    if (reducedMotion || !mat.current) return;
    mat.current.emissiveIntensity = 0.28 + Math.sin(st.clock.elapsedTime * 0.7) * 0.08;
  });
  return (
    <group position={[RESERVORIO.x, y, RESERVORIO.z]}>
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[RESERVORIO.r, 22]} />
        <meshLambertMaterial
          ref={mat}
          color={PALETA.agua}
          emissive="#2a6a86"
          emissiveIntensity={0.3}
          transparent
          opacity={0.72}
        />
      </mesh>
      <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RESERVORIO.r + 0.1, 0.09, 6, 26]} />
        <meshLambertMaterial color={PALETA.piedra} flatShading />
      </mesh>
    </group>
  );
}

/* La casita: su techo COSECHA la lluvia — canalón hacia el tambor. */
function CasitaCosecha() {
  const y = altura(CASITA.x, CASITA.z);
  const yT = altura(TAMBOR.x, TAMBOR.z);
  return (
    <group>
      <group position={[CASITA.x, y, CASITA.z]} rotation={[0, -0.5, 0]}>
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[1.3, 0.84, 1.05]} />
          <meshLambertMaterial color={PALETA.cal} />
        </mesh>
        <mesh position={[0, 0.98, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[1.06, 0.6, 4]} />
          <meshLambertMaterial color={PALETA.ambar} flatShading />
        </mesh>
        {/* canalón: recoge el techo y apunta al tambor */}
        <mesh position={[-0.72, 0.78, 0]} rotation={[0, 0, 0.12]}>
          <boxGeometry args={[0.1, 0.08, 1.15]} />
          <meshLambertMaterial color={PALETA.lamina} />
        </mesh>
        <mesh position={[-0.8, 0.5, 0.42]} rotation={[0.5, 0, 0.5]}>
          <cylinderGeometry args={[0.035, 0.035, 0.7, 6]} />
          <meshLambertMaterial color={PALETA.lamina} />
        </mesh>
        <mesh position={[0, 0.32, 0.54]}>
          <boxGeometry args={[0.34, 0.6, 0.05]} />
          <meshLambertMaterial color={PALETA.maderaOscura} />
        </mesh>
      </group>
      <group position={[TAMBOR.x, yT, TAMBOR.z]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.6, 12]} />
          <meshLambertMaterial color={PALETA.lamina} />
        </mesh>
        <mesh position={[0, 0.61, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.22, 12]} />
          <meshLambertMaterial color={PALETA.agua} emissive="#2a6a86" emissiveIntensity={0.25} />
        </mesh>
      </group>
    </group>
  );
}

/* Las camas de cultivo con su línea de goteo (el riego que rinde). */
function CamasRiego() {
  return (
    <group>
      {/* la manguera madre: del reservorio a la vega — ACOSTADA sobre el
          pasto (el cilindro nace vertical; se gira al eje Z hacia las camas) */}
      <mesh
        position={[2.85, 0.05, (RESERVORIO.z + RESERVORIO.r + CAMAS[0].z) / 2]}
        rotation={[Math.PI / 2, 0, -0.18]}
      >
        <cylinderGeometry args={[0.03, 0.03, CAMAS[0].z - RESERVORIO.z - RESERVORIO.r + 0.35, 5]} />
        <meshLambertMaterial color={PALETA.maderaOscura} />
      </mesh>
      {CAMAS.map((cama, i) => {
        const cx = (cama.x0 + cama.x1) / 2;
        const largo = cama.x1 - cama.x0;
        const nMatas = 6;
        return (
          <group key={`cama${i}`}>
            <mesh position={[cx, 0.09, cama.z]}>
              <boxGeometry args={[largo, 0.18, 0.44]} />
              <meshLambertMaterial color={PALETA.tierra} flatShading />
            </mesh>
            {/* línea de goteo elevada */}
            <mesh position={[cx, 0.5, cama.z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.022, 0.022, largo, 5]} />
              <meshLambertMaterial color={PALETA.maderaOscura} />
            </mesh>
            {[cama.x0 + 0.1, cama.x1 - 0.1].map((px, j) => (
              <mesh key={`poste${j}`} position={[px, 0.28, cama.z]}>
                <cylinderGeometry args={[0.025, 0.025, 0.52, 5]} />
                <meshLambertMaterial color={PALETA.madera} />
              </mesh>
            ))}
            {Array.from({ length: nMatas }, (_, j) => {
              const px = cama.x0 + 0.35 + (j * (largo - 0.7)) / (nMatas - 1);
              const e = 0.8 + ((i * 7 + j * 3) % 5) / 10;
              return (
                <mesh key={`mata${j}`} position={[px, 0.24, cama.z]} scale={e}>
                  <coneGeometry args={[0.14, 0.3, 6]} />
                  <meshLambertMaterial color={i % 2 ? PALETA.follaje : PALETA.follajeClaro} flatShading />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

/* El corte de perfil del suelo: capas visibles y el acuífero abajo —
   la filtración deja de ser abstracta. */
function CorteSuelo() {
  const capas = [
    { y: 1.16, alto: 0.24, color: PALETA.tierra }, // capa viva (materia orgánica)
    { y: 0.86, alto: 0.36, color: PALETA.tierraClara }, // subsuelo
    { y: 0.5, alto: 0.36, color: PALETA.piedra }, // roca fracturada
    { y: 0.17, alto: 0.3, color: PALETA.agua }, // el acuífero
  ];
  return (
    <group position={[CORTE_SUELO.x, 0, CORTE_SUELO.z]}>
      {capas.map((c, i) => (
        <mesh key={i} position={[0, c.y, 0]}>
          <boxGeometry args={[1.5, c.alto, 0.85]} />
          <meshLambertMaterial
            color={c.color}
            flatShading
            emissive={i === capas.length - 1 ? '#2a6a86' : '#000000'}
            emissiveIntensity={i === capas.length - 1 ? 0.3 : 0}
          />
        </mesh>
      ))}
      {/* pastito encima: el corte es un pedazo de la misma vega */}
      <mesh position={[0, 1.31, 0]}>
        <boxGeometry args={[1.5, 0.07, 0.85]} />
        <meshLambertMaterial color={PALETA.follajeClaro} flatShading />
      </mesh>
    </group>
  );
}

/* El aviso junto a la quebrada: cuidarla es cuidarnos (contaminación). */
function AvisoQuebrada() {
  const x = -2.1, z = 2.6;
  const y = altura(x, z);
  return (
    <group position={[x, y, z]} rotation={[0, 0.6, 0]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.6, 6]} />
        <meshLambertMaterial color={PALETA.madera} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.04]} />
        <meshLambertMaterial color={PALETA.maderaClara} />
      </mesh>
    </group>
  );
}

/* La nube del ciclo: esferas aplastadas que derivan apenas. */
function NubeCiclo({ reducedMotion }) {
  const grupo = useRef(null);
  useFrame((st) => {
    if (reducedMotion || !grupo.current) return;
    grupo.current.position.x = NUBE.x + Math.sin(st.clock.elapsedTime * 0.07) * 0.6;
  });
  return (
    <group ref={grupo} position={[NUBE.x, NUBE.y, NUBE.z]}>
      <mesh scale={[1.9, 0.62, 1.15]}>
        <sphereGeometry args={[0.7, 9, 7]} />
        <meshBasicMaterial color="#fbf4e6" transparent opacity={0.88} depthWrite={false} />
      </mesh>
      <mesh position={[0.85, 0.05, 0.1]} scale={[1.1, 0.5, 0.9]}>
        <sphereGeometry args={[0.62, 8, 6]} />
        <meshBasicMaterial color="#fdf8ee" transparent opacity={0.78} depthWrite={false} />
      </mesh>
      <mesh position={[-0.9, -0.04, -0.1]} scale={[1, 0.45, 0.8]}>
        <sphereGeometry args={[0.6, 8, 6]} />
        <meshBasicMaterial color="#f8f0dd" transparent opacity={0.7} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* El sol bajo de la hora dorada, hermano del de la Sierra. */
function SolDorado() {
  return (
    <group position={[-12, 4.6, -7.5]}>
      <mesh>
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial color="#fff2cf" transparent opacity={0.98} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[2.0, 32]} />
        <meshBasicMaterial color="#ffd98f" transparent opacity={0.38} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[3.4, 32]} />
        <meshBasicMaterial color="#f7c66b" transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* Rótulo sobrio de estación (mismo lenguaje que la Sierra). */
function Rotulo({ pos, texto, sub, distancia = 15 }) {
  return (
    <group position={pos}>
      <Html center distanceFactor={distancia} zIndexRange={[30, 10]} style={{ pointerEvents: 'none' }}>
        <div className="magua-rotulo" aria-hidden="true">
          <span className="magua-rotulo__punto" />
          <span className="magua-rotulo__txt">
            {texto}
            {sub ? <em className="magua-rotulo__sub">{sub}</em> : null}
          </span>
        </div>
      </Html>
    </group>
  );
}

/* ── Las ESTACIONES del recorrido didáctico (datos, no UI) ────────────────── */
const ESTACIONES = [
  {
    id: 'nacimiento',
    titulo: 'Nacimiento',
    frase: 'El monte alrededor lo protege: sin ronda de bosque, el ojo de agua se seca.',
    mira: () => [QUEBRADA_XZ[0][0], altura(...QUEBRADA_XZ[0]) + 0.3, QUEBRADA_XZ[0][1]],
    cam: () => [QUEBRADA_XZ[0][0] + 3.4, altura(...QUEBRADA_XZ[0]) + 2.6, QUEBRADA_XZ[0][1] + 4.2],
  },
  {
    id: 'quebrada',
    titulo: 'Quebrada viva',
    frase: 'No le arroje residuos: lo que cae aquí llega a la vereda de abajo.',
    mira: () => [-3.0, altura(-3.0, 2.0) + 0.2, 2.0],
    cam: () => [0.8, 3.6, 6.0],
  },
  {
    id: 'canal',
    titulo: 'Bocatoma y canal',
    frase: 'Tome solo la parte que necesita: la quebrada debe seguir corriendo.',
    mira: () => [-0.8, altura(-0.8, 0.6) + 0.2, 0.6],
    cam: () => [-0.6, 2.8, 4.4],
  },
  {
    id: 'reservorio',
    titulo: 'Reservorio y lluvia',
    frase: 'Guarde en invierno para regar en verano; el techo también cosecha.',
    mira: () => [RESERVORIO.x + 0.8, 0.6, RESERVORIO.z],
    cam: () => [RESERVORIO.x + 1.2, 3.0, RESERVORIO.z + 4.6],
  },
  {
    id: 'riego',
    titulo: 'Riego por goteo',
    frase: 'Gota a gota rinde más: moja la raíz, no la hoja, y ahorra la mitad.',
    mira: () => [3.4, 0.4, 4.4],
    cam: () => [3.4, 3.2, 8.2],
  },
  {
    id: 'suelo',
    titulo: 'El suelo filtra',
    frase: 'Un suelo vivo deja pasar el agua y la guarda abajo, en el acuífero.',
    mira: () => [CORTE_SUELO.x, 0.7, CORTE_SUELO.z],
    cam: () => [CORTE_SUELO.x + 0.4, 1.6, CORTE_SUELO.z + 3.4],
  },
  {
    id: 'ciclo',
    titulo: 'El ciclo se cierra',
    frase: 'El agua sube en vapor, se hace nube y vuelve a llover sobre la loma.',
    mira: () => [NUBE.x + 1.5, 3.4, NUBE.z + 1],
    cam: () => [4.2, 4.6, 3.8],
  },
];

/* RECORRIDO de cámara: acerca el encuadre a la estación pedida con amortiguación.
   Cualquier gesto del usuario sobre los controles suelta el recorrido. */
function RecorridoCamara({ controles, estacion, onSoltar }) {
  const meta = useMemo(() => {
    if (!estacion) return null;
    return {
      cam: new THREE.Vector3(...estacion.cam()),
      mira: new THREE.Vector3(...estacion.mira()),
    };
  }, [estacion]);

  useEffect(() => {
    const ctl = controles.current;
    if (!ctl || !estacion) return undefined;
    const soltar = () => onSoltar();
    ctl.addEventListener('start', soltar);
    return () => ctl.removeEventListener('start', soltar);
  }, [controles, estacion, onSoltar]);

  useFrame((st, dt) => {
    const ctl = controles.current;
    if (!ctl || !meta) return;
    const k = 1 - Math.exp(-3.2 * Math.min(dt, 0.06));
    st.camera.position.lerp(meta.cam, k);
    ctl.target.lerp(meta.mira, k);
    ctl.update();
  });
  return null;
}

/* ── El diorama completo (dentro del Canvas) ──────────────────────────────── */
function DioramaAgua({ perfil, tier, reducedMotion, estacion, onSoltar, controles }) {
  const geoTerreno = useMemo(
    () => construirTerreno(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geoTerreno.dispose(), [geoTerreno]);

  /* Curvas del agua: quebrada completa, tramo hasta bocatoma (para gotas que
     luego siguen al canal) y el canal en sí. */
  const curvas = useMemo(() => {
    const quebrada = curvaSobreTerreno(QUEBRADA_XZ, 0.05);
    const canal = curvaSobreTerreno(CANAL_XZ, 0.05);
    // ruta de las gotas de riego: nacimiento → bocatoma → canal → reservorio
    const tomaXZ = [...QUEBRADA_XZ.slice(0, BOCATOMA_I + 1), ...CANAL_XZ.slice(1), [RESERVORIO.x - 0.5, RESERVORIO.z]];
    const toma = curvaSobreTerreno(tomaXZ, 0.05);
    return { quebrada, canal, toma };
  }, []);

  const geoCintas = useMemo(
    () => ({
      quebrada: construirCinta(curvas.quebrada, 0.52, 72),
      canal: construirCinta(curvas.canal, 0.28, 30),
    }),
    [curvas],
  );
  useEffect(
    () => () => {
      geoCintas.quebrada.dispose();
      geoCintas.canal.dispose();
    },
    [geoCintas],
  );

  const nGotas = tier === 'alto' ? 26 : tier === 'medio' ? 16 : 9;
  const nVapor = tier === 'alto' ? 12 : tier === 'medio' ? 8 : 5;
  const nLluvia = tier === 'alto' ? 20 : tier === 'medio' ? 12 : 7;
  const nGoteo = tier === 'alto' ? 20 : tier === 'medio' ? 12 : 8;
  const nFiltra = tier === 'alto' ? 8 : 5;

  /* fauna acuática/ribereña — presupuesto por tier (individuos, no partículas) */
  const nTrucha = tier === 'alto' ? 8 : tier === 'medio' ? 5 : 3;
  const nCapitan = tier === 'alto' ? 3 : tier === 'medio' ? 2 : 1;
  const nSabaleta = tier === 'alto' ? 5 : tier === 'medio' ? 3 : 2;
  const ySupReservorio = altura(RESERVORIO.x, RESERVORIO.z) + 0.1; // lámina del espejo
  const anclasLibelulas = useMemo(() => {
    const base = [
      [RESERVORIO.x - 0.3, ySupReservorio + 0.5, RESERVORIO.z - 0.2],
      [-3.0, altura(-3.0, 2.0) + 0.55, 2.0],
      [-3.3, altura(-3.3, 6.0) + 0.55, 6.0],
      [RESERVORIO.x + 0.6, ySupReservorio + 0.7, RESERVORIO.z + 0.5],
      [-3.7, altura(-3.7, -3.6) + 0.55, -3.6],
    ];
    const n = tier === 'alto' ? 5 : tier === 'medio' ? 3 : 2;
    return base.slice(0, n);
  }, [tier, ySupReservorio]);

  return (
    <>
      <color attach="background" args={[CIELO.fondo]} />
      {perfil.fog && <fogExp2 attach="fog" args={[CIELO.niebla, 0.024]} />}
      <hemisphereLight intensity={0.7 * CIELO.intensidad} color={CIELO.cielo} groundColor={CIELO.suelo} />
      <ambientLight intensity={0.3 * CIELO.intensidad} color={ATMOSFERA.luz} />
      {/* el mismo sol del valle: dirección [6,9,4], sin shadow-map */}
      <directionalLight position={[6, 9, 4]} intensity={0.95 * CIELO.intensidad} color={ATMOSFERA.luz} />
      <directionalLight position={[-5, 4, -6]} intensity={0.24} color={ATMOSFERA.relleno} />

      <SolDorado />

      <mesh geometry={geoTerreno}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* el agua: quebrada + canal + reservorio, respirando (la quebrada un
          poco más clara para dejar ver la sabaleta que remonta) */}
      <EspejoAgua geometria={geoCintas.quebrada} reducedMotion={reducedMotion} opacidad={0.82} />
      <EspejoAgua geometria={geoCintas.canal} reducedMotion={reducedMotion} fase={1.4} />
      <Reservorio reducedMotion={reducedMotion} />

      {/* el agua se MUEVE: gotas por la quebrada y por la toma hacia el reservorio */}
      <FlujoGotas curva={curvas.quebrada} cuantas={nGotas} velocidad={0.045} radio={0.05} reducedMotion={reducedMotion} />
      <FlujoGotas curva={curvas.toma} cuantas={Math.round(nGotas * 0.6)} velocidad={0.05} radio={0.045} reducedMotion={reducedMotion} color="#d3ecf2" />

      <Nacimiento />
      <Bocatoma />
      <BordesCanal curva={curvas.canal} />
      <CasitaCosecha />
      <CamasRiego />
      <CorteSuelo />
      <AvisoQuebrada />
      <NubeCiclo reducedMotion={reducedMotion} />

      <Vapor origen={RESERVORIO} cuantas={nVapor} reducedMotion={reducedMotion} />
      <Lluvia cuantas={nLluvia} reducedMotion={reducedMotion} />
      <GoteoRiego cuantas={nGoteo} reducedMotion={reducedMotion} />
      <Filtracion cuantas={nFiltra} reducedMotion={reducedMotion} />

      {/* ── LA VIDA DEL AGUA (fauna real por piso térmico, ver faunaAcuatica) ── */}
      {/* El reservorio como estanque de aguas frías: trucha (cardumen) y
          capitán bentónico pegado al fondo. */}
      <Cardumen
        modo="estanque"
        centro={[RESERVORIO.x, 0, RESERVORIO.z]}
        radio={RESERVORIO.r}
        superficieY={ySupReservorio}
        especieId="trucha"
        cuantas={nTrucha}
        reducedMotion={reducedMotion}
      />
      <Cardumen
        modo="estanque"
        centro={[RESERVORIO.x, 0, RESERVORIO.z]}
        radio={RESERVORIO.r}
        superficieY={ySupReservorio}
        especieId="capitan"
        cuantas={nCapitan}
        reducedMotion={reducedMotion}
      />
      {/* La quebrada viva: sabaleta remontando la corriente */}
      <Cardumen
        modo="quebrada"
        curva={curvas.quebrada}
        altura={altura}
        especieId="sabaleta"
        cuantas={nSabaleta}
        reducedMotion={reducedMotion}
      />

      {/* aves de ribera */}
      <Garza pos={[RESERVORIO.x - 0.1, altura(RESERVORIO.x - 0.1, RESERVORIO.z + 1.55), RESERVORIO.z + 1.55]} rot={Math.PI} reducedMotion={reducedMotion} />
      <MartinPescador pos={[-2.55, altura(-2.55, 3.7) + 0.45, 3.7]} rot={-0.7} reducedMotion={reducedMotion} />
      <MirlaDeAgua pos={[-3.2, altura(-3.2, 5.5) + 0.02, 5.5]} rot={0.5} reducedMotion={reducedMotion} />
      <RanaQuebrada pos={[-3.95, altura(-3.95, -3.1) + 0.02, -3.1]} rot={0.8} reducedMotion={reducedMotion} />
      <RanaQuebrada pos={[-2.75, altura(-2.75, 4.7) + 0.02, 4.7]} rot={-1.4} reducedMotion={reducedMotion} />

      {/* libélulas (bioindicador de agua limpia) */}
      <Libelulas anclas={anclasLibelulas} reducedMotion={reducedMotion} />

      {/* vegetación de ribera real: aliso · sauce · guadua a lo largo de la quebrada */}
      <VegetacionRibera curva={curvas.quebrada} altura={altura} />

      {/* rótulos de las estaciones, sobrios */}
      <Rotulo pos={[QUEBRADA_XZ[0][0], altura(...QUEBRADA_XZ[0]) + 1.9, QUEBRADA_XZ[0][1]]} texto="Nacimiento" sub="protegido con monte" />
      <Rotulo pos={[-2.6, altura(-2.6, 0.2) + 1.0, 0.2]} texto="Bocatoma" sub="toma solo una parte" distancia={13} />
      <Rotulo pos={[RESERVORIO.x, 1.5, RESERVORIO.z]} texto="Reservorio" sub="reserva para el verano" distancia={13} />
      <Rotulo pos={[CASITA.x, altura(CASITA.x, CASITA.z) + 1.9, CASITA.z]} texto="Cosecha de lluvia" sub="el techo también suma" distancia={14} />
      <Rotulo pos={[3.4, 1.15, 4.5]} texto="Riego por goteo" sub="a la raíz, sin desperdicio" distancia={13} />
      <Rotulo pos={[CORTE_SUELO.x, 1.95, CORTE_SUELO.z]} texto="El suelo filtra" sub="y el acuífero guarda" distancia={13} />
      <Rotulo pos={[NUBE.x, NUBE.y + 1.1, NUBE.z]} texto="El ciclo se cierra" sub="vapor · nube · lluvia" distancia={18} />
      <Rotulo pos={[-2.1, altura(-2.1, 2.6) + 1.2, 2.6]} texto="Sin residuos" sub="la quebrada sigue su camino" distancia={12} />

      <OrbitControls
        ref={controles}
        makeDefault
        enablePan={false}
        enableZoom
        minDistance={3.2}
        maxDistance={20}
        target={[0.6, 0.8, 0.8]}
        minPolarAngle={0.3}
        maxPolarAngle={1.38}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion && !estacion}
        autoRotateSpeed={0.12}
      />
      <RecorridoCamara controles={controles} estacion={estacion} onSoltar={onSoltar} />
      <AdaptiveDpr pixelated />
    </>
  );
}

/* Estilos del mockup (viven aquí: son de ESTA escena). */
const CSS_AGUA = `
.magua-root { position: relative; width: 100%; height: 100vh; min-height: 340px; overflow: hidden; background: ${CIELO.fondo}; }
.magua-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.7s ease; }
.magua-canvas--lista { opacity: 1; }
.magua-rotulo { display: flex; align-items: center; gap: 0.32rem; white-space: nowrap; font: 600 0.72rem/1.1 system-ui, sans-serif; color: #2c3a2e; text-shadow: 0 1px 3px rgba(244,250,238,0.9); }
.magua-rotulo__punto { width: 7px; height: 7px; border-radius: 50%; background: #d9f0f4; box-shadow: 0 0 0 2px rgba(44,58,46,0.5); flex: 0 0 auto; }
.magua-rotulo__txt { display: inline-flex; align-items: baseline; gap: 0.3rem; }
.magua-rotulo__sub { font-weight: 500; font-style: normal; opacity: 0.7; font-size: 0.9em; }
.magua-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.magua-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #2f3a24; text-shadow: 0 1px 4px rgba(246,251,238,0.85); font: 700 1.15rem/1.2 system-ui, sans-serif; }
.magua-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.78; margin-top: 0.15rem; }
.magua-estaciones { pointer-events: auto; align-self: flex-start; margin: 0.6rem 0.8rem; padding: 0.45rem; display: flex; flex-direction: column; gap: 0.28rem; list-style: none; border-radius: 0.8rem; background: rgba(250,252,242,0.78); backdrop-filter: blur(3px); box-shadow: 0 4px 14px rgba(52,66,40,0.16); max-width: min(74vw, 19rem); }
.magua-estaciones button { display: block; width: 100%; text-align: left; padding: 0.3rem 0.55rem; border: 0; border-radius: 0.55rem; background: transparent; color: #2f3a24; font: 600 0.76rem/1.2 system-ui, sans-serif; cursor: pointer; }
.magua-estaciones button:hover { background: rgba(63,143,176,0.14); }
.magua-estaciones button[aria-pressed="true"] { background: rgba(63,143,176,0.24); }
.magua-estaciones button small { display: none; font: 500 0.7rem/1.25 system-ui, sans-serif; opacity: 0.8; margin-top: 0.1rem; }
.magua-estaciones button[aria-pressed="true"] small { display: block; }
.magua-pie { pointer-events: none; padding: 0 1rem 0.85rem; display: flex; justify-content: center; }
.magua-pie p { margin: 0; max-width: 40rem; text-align: center; padding: 0.42rem 0.85rem; border-radius: 0.7rem; background: rgba(26,32,18,0.5); backdrop-filter: blur(3px); color: #f2f4e6; font: 500 0.76rem/1.4 system-ui, sans-serif; }
.magua-volver { pointer-events: auto; position: absolute; top: 0.8rem; right: 0.8rem; padding: 0.4rem 0.8rem; border: 0; border-radius: 999px; background: rgba(26,32,18,0.55); color: #f2f4e6; font: 600 0.78rem/1 system-ui, sans-serif; cursor: pointer; }
@media (prefers-reduced-motion: reduce) { .magua-canvas { transition: none; } }
@media (max-width: 640px) { .magua-estaciones { max-width: 60vw; } .magua-titulo { font-size: 1rem; } }
`;

/**
 * MundoAgua3D — el mockup montable: Canvas propio + recorrido didáctico.
 *
 * @param {object} props
 * @param {() => void} [props.onBack]  vuelve al host (botón discreto).
 */
export default function MundoAgua3D({ onBack }) {
  const [listo, setListo] = useState(false);
  const [estacionId, setEstacionId] = useState(null);
  const controles = useRef(null);
  const [{ tier, reducedMotion }] = useState(() => decidirTier());
  const perfil = perfilDeTier(tier);
  const estacion = estacionId ? ESTACIONES.find((e) => e.id === estacionId) : null;

  return (
    <section
      className="magua-root"
      data-tier={tier}
      aria-label="El camino del agua en la finca: del nacimiento al riego, y de vuelta a la nube"
    >
      <style>{CSS_AGUA}</style>
      <Canvas
        className={`magua-canvas${listo ? ' magua-canvas--lista' : ''}`}
        dpr={tier === 'alto' ? [1, 1.5] : tier === 'medio' ? [1, 1.3] : 1}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [10.5, 7.2, 12.5], fov: 44 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <DioramaAgua
          perfil={perfil}
          tier={tier}
          reducedMotion={reducedMotion}
          estacion={estacion}
          onSoltar={() => setEstacionId(null)}
          controles={controles}
        />
      </Canvas>

      <div className="magua-chrome">
        <h2 className="magua-titulo">
          El camino del agua
          <small>Del nacimiento al riego — y de vuelta a la nube</small>
        </h2>
        <ul className="magua-estaciones" aria-label="Estaciones del recorrido del agua">
          {ESTACIONES.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                aria-pressed={estacionId === e.id}
                onClick={() => setEstacionId((prev) => (prev === e.id ? null : e.id))}
              >
                {e.titulo}
                <small>{e.frase}</small>
              </button>
            </li>
          ))}
        </ul>
        <div className="magua-pie">
          <p>
            El agua no es de nadie y es de todos: cuide el nacimiento, tome solo
            lo necesario y devuélvala limpia — la vereda de abajo también bebe.
          </p>
        </div>
      </div>
      {onBack ? (
        <button type="button" className="magua-volver" onClick={onBack}>
          Volver
        </button>
      ) : null}
    </section>
  );
}
