/*
 * MundoFermentos3D — el TALLER DE LOS FERMENTOS Y BIOPREPARADOS de la finca, como
 * mundo 3D didáctico. No es un laboratorio de químicos: es el taller donde se
 * CRÍA la vida microbiana que alimenta el suelo y protege la mata, sin veneno de
 * síntesis.
 *
 * Una sola escena low-poly recorre las cuatro manos del oficio, del monte al
 * suelo, bajo la misma hora dorada del valle:
 *
 *   1. MICROORGANISMOS DE MONTAÑA (MM) — bajo el monte nativo, un canasto con
 *      arroz cocido y hojarasca captura los microbios del bosque (el micelio
 *      blanco ya asoma). Es la semilla viva de todo lo demás.
 *   2. BOCASHI — el abono sólido que fermenta CON AIRE: capas de tierra, arroz,
 *      salvado, gallinaza, carbón y melaza; humea porque está vivo y caliente, y
 *      la horquilla al lado lo voltea para que respire y no se queme.
 *   3. BIOL — el fermento LÍQUIDO en caneca cerrada: la trampa de agua deja
 *      salir el gas (burbujea) sin que entre el aire; la canilla lo saca para
 *      aplicarlo diluido.
 *   4. CALDOS MINERALES — el sulfocálcico al fuego (ámbar hirviente) y el
 *      bordelés azul: minerales que protegen la hoja de hongos y plagas.
 *
 *   … y todo VUELVE AL SUELO: una cama con matas sanas, rociadas con el
 *   biopreparado, cierra el sentido — alimentar y proteger, no envenenar.
 *
 * DIRECCIÓN DE ARTE: hora dorada de `atmosferaMadre` (ATMOSFERA + CIELOS.corral
 * mezclado con `mezclarCielo`, la MISMA ley que el resto de los mundos) y
 * materiales de PALETA. El polen del atardecer y las luciérnagas son las
 * `ParticulasAmbientales` del kit, sin tocarlas. Terreno procedural determinista
 * (cero assets remotos → cachea limpio offline).
 *
 * RENDIMIENTO (frugal por contrato, DR §6): SOLO `meshLambert`/`meshBasic`, sin
 * shadow-map ni post-proceso; vapor, burbujas, hervor y rocío INSTANCIADOS (pocos
 * draw calls); PRNG determinista (mismo taller siempre). Presupuestos por `tier`
 * (deviceTier); `reducedMotion` congela vapor, burbujas, fuego, micelio y
 * recorrido, y pasa el frameloop a demanda.
 *
 * Mockup standalone con su PROPIO <Canvas> — la ruta la cablea Opus en App.jsx.
 * Este archivo NO toca App.jsx ni el framework: solo lo importa.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { ATMOSFERA, CIELOS, PALETA, mezclarCielo } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';

/* El cielo del taller mezclado hacia la hora dorada (misma receta que el resto):
   "corral" = tarde de finca, la familia cálida que encaja con un patio de
   trabajo. Constante de módulo: 7 lerps, una sola vez. */
const CIELO = mezclarCielo(CIELOS.corral);

/* Colores propios del taller que no viven en PALETA (minerales del oficio). */
const AZUL_BORDELES = '#7fb2cf'; // el celeste del caldo bordelés (cal + cobre)
const AMBAR_CALDO = '#c9761f'; // el sulfocálcico hirviente
const AZUL_DRUM = '#5a7f9a'; // la caneca del biol
const MELAZA = '#8a4e12'; // el frasco de melaza (el alimento común de todo)
const ARROZ = '#efe6cf'; // el arroz cocido del canasto MM
const CARBON = '#3a2f28'; // la capa de carbón del bocashi
const MICELIO = '#f3efe2'; // el hongo blanco de los MM

/* Los caldos MICROBIOLÓGICOS en frasco (EM, lactosuero, lacto-microbios): la vida
   viva que se cría y se guarda. Colores turbios "vivos", no aguas claras. */
const VIDRIO = '#d8e6e2'; // el vidrio del frasco (verde-agua muy pálido)
const EM_MADRE = '#a06a34'; // EM activado: melaza + microbios, ámbar turbio
const LACTOSUERO = '#eae3cf'; // suero de leche fermentado, blanco-marfil
const LACTO_ROSA = '#c98d6a'; // lacto-microbios con panela, terracota suave
const NATA = '#efe7d2'; // la nata/biofilm (la "madre") que flota arriba
const MICROBRILLO = '#fff3c8'; // el destello de la vida microbiana en suspensión

/* ── Geografía del patio (coordenadas de mundo):
      X oriente(+)/occidente(−) · Y altura · Z monte atrás(−) → vega adelante(+) ── */
const ANCHO = 16;
const FONDO = 15;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const suavizar = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/* Ruido determinista (hash de senos): mismo relieve siempre, sin Math.random. */
const ruido = (wx, wz) =>
  Math.sin(wx * 1.3 + wz * 0.7) * 0.5 +
  Math.sin(wx * 2.3 - wz * 1.6 + 1.7) * 0.3 +
  Math.sin(wx * 3.9 + wz * 2.7 + 4.2) * 0.2;

/* Altura del terreno: el patio de trabajo queda PLANO al frente (vessels a
   nivel) y el monte SUBE atrás (wz negativo), con textura solo en la loma. */
function altura(wx, wz) {
  const s = clamp((-1.6 - wz) / 8, 0, 1); // 0 en el patio, 1 en el monte
  let h = Math.pow(s, 1.4) * 2.4;
  h += ruido(wx, wz) * 0.07 * s; // el patio no vibra; el monte sí
  return h;
}

/* Colores del suelo por posición: patio trillado al frente, pasto y monte atrás
   (didáctica silenciosa: el monte que da los microbios es el fondo verde). */
const C_PATIO = new THREE.Color(PALETA.tierraClara);
const C_PASTO = new THREE.Color(PALETA.follajeClaro);
const C_MONTE = new THREE.Color(PALETA.follajeOscuro);
function colorTerreno(wz, out) {
  const s = clamp((-1.6 - wz) / 8, 0, 1);
  out.copy(C_PATIO).lerp(C_PASTO, suavizar(0.05, 0.5, s));
  out.lerp(C_MONTE, suavizar(0.6, 1.0, s));
  return out;
}

/* Malla del terreno con color por vértice. `plano` = flat shading des-indexado
   (facetas low-poly, solo tier alto). */
function construirTerreno(seg, plano) {
  const nx = seg + 1;
  const nz = seg + 1;
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
      colorTerreno(wz, c);
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

/* ── Posiciones de las estaciones (X, Z; la Y la da `altura`) ─────────────── */
const P_MM = [-3.4, -3.4]; // canasto de microorganismos, bajo el monte
const P_BOCASHI = [-2.4, 0.8]; // la pila que fermenta con aire
const P_BIOL = [0.5, 1.9]; // la caneca del fermento líquido
const P_SULFO = [2.8, -0.1]; // el caldo sulfocálcico al fuego
const P_BORDE = [3.6, 1.9]; // el caldo bordelés azul
const P_MESA = [0.1, -0.7]; // la mesa con la melaza (alimento común)
const P_EM = [1.9, 3.1]; // el estante de frascos de caldos microbiológicos (EM)
const P_CAMA = [-0.5, 4.4]; // el suelo que se alimenta y se protege

/* ── Partículas que SUBEN (vapor, burbujas) o CAEN (rocío): un solo instanced.
      `crecer` = vapor que se expande; `alto` negativo = rocío que cae. ─────── */
function ParticulasSuben({ origen, ancho, alto, cuantas, radio, color, velocidad, opacidad, crecer = false, reducedMotion }) {
  const inst = useRef(null);
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() }),
    [],
  );
  useFrame((st) => {
    if (!inst.current) return;
    const reloj = reducedMotion ? 0.35 : st.clock.elapsedTime;
    for (let i = 0; i < cuantas; i++) {
      const fase = (i / cuantas + reloj * velocidad) % 1;
      const ang = i * 2.39996; // ángulo áureo: reparte sin apelotonar
      const r = 0.3 + 0.7 * ((i * 0.61803) % 1);
      const x = origen[0] + Math.cos(ang) * ancho * 0.5 * r + Math.sin(reloj * 0.6 + i) * 0.02;
      const y = origen[1] + fase * alto;
      const z = origen[2] + Math.sin(ang) * ancho * 0.5 * r;
      const esc = crecer ? 0.5 + fase * 1.3 : 1;
      tmp.p.set(x, y, z);
      tmp.s.set(esc, esc, esc);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      inst.current.setMatrixAt(i, tmp.m);
    }
    inst.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={inst} args={[undefined, undefined, cuantas]} frustumCulled={false}>
      <sphereGeometry args={[radio, 6, 5]} />
      <meshBasicMaterial color={color} transparent opacity={opacidad} depthWrite={false} />
    </instancedMesh>
  );
}

/* ── FUEGO del fogón: conos de llama que titilan (quietos con reduced-motion) ── */
function Fuego({ reducedMotion }) {
  const llamas = useRef([]);
  const defs = useMemo(
    () => [
      { x: 0, z: 0, h: 0.5, c: '#ff9d3b', f: 0 },
      { x: 0.06, z: 0.04, h: 0.38, c: '#ffca55', f: 1.3 },
      { x: -0.05, z: -0.03, h: 0.32, c: '#ff6a2b', f: 2.5 },
    ],
    [],
  );
  useFrame((st) => {
    if (reducedMotion) return;
    const t = st.clock.elapsedTime;
    for (let i = 0; i < llamas.current.length; i++) {
      const g = llamas.current[i];
      if (!g) continue;
      const fl = 1 + Math.sin(t * 9 + defs[i].f) * 0.18 + Math.sin(t * 15 + i) * 0.06;
      g.scale.set(1 - (fl - 1) * 0.4, fl, 1 - (fl - 1) * 0.4);
      g.rotation.z = Math.sin(t * 6 + defs[i].f) * 0.12;
    }
  });
  return (
    <group>
      {defs.map((d, i) => (
        <mesh key={i} position={[d.x, d.h / 2 + 0.04, d.z]} ref={(el) => { llamas.current[i] = el; }}>
          <coneGeometry args={[0.12 - i * 0.02, d.h, 7]} />
          <meshBasicMaterial color={d.c} transparent opacity={0.92} depthWrite={false} />
        </mesh>
      ))}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.18, 10]} />
        <meshBasicMaterial color="#ff7a2e" transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ── Árbol low-poly del monte nativo (fuente de los MM) ────────────────────── */
function Arbol({ pos, esc = 1, tono = PALETA.follajeOscuro }) {
  return (
    <group position={pos} scale={esc}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.8, 6]} />
        <meshLambertMaterial color={PALETA.madera} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <coneGeometry args={[0.55, 1.2, 8]} />
        <meshLambertMaterial color={tono} flatShading />
      </mesh>
      <mesh position={[0, 1.62, 0]}>
        <coneGeometry args={[0.4, 0.9, 8]} />
        <meshLambertMaterial color={PALETA.follaje} flatShading />
      </mesh>
    </group>
  );
}

/* El monte al fondo: la reserva de bosque de donde bajan los microbios. */
function Monte() {
  const arboles = useMemo(() => {
    const out = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const x = -6.5 + (13 * i) / (n - 1) + (((i * 37) % 5) - 2) * 0.22;
      const z = -4.7 - ((i * 53) % 5) * 0.35;
      const e = 1.0 + ((i * 29) % 6) / 10;
      out.push({ x, z, e, t: i % 3 ? PALETA.follajeOscuro : PALETA.follaje });
    }
    return out;
  }, []);
  return (
    <group>
      {arboles.map((a, i) => (
        <Arbol key={i} pos={[a.x, altura(a.x, a.z), a.z]} esc={a.e} tono={a.t} />
      ))}
    </group>
  );
}

/* ── ESTACIÓN 1 · CANASTO DE MICROORGANISMOS DE MONTAÑA ────────────────────── */
function CanastoMM({ reducedMotion }) {
  const y = altura(P_MM[0], P_MM[1]);
  const micelio = useRef([]);
  const hojas = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const a = i * 0.9 + 0.3;
      return {
        x: Math.cos(a) * 0.18 * (0.4 + (i % 3) * 0.2),
        z: Math.sin(a) * 0.18 * (0.5 + (i % 2) * 0.3),
        g: a,
        c: i % 2 ? PALETA.follajeOscuro : '#8a7a3a',
      };
    }),
    [],
  );
  const nodos = useMemo(
    () => Array.from({ length: 6 }, (_, i) => {
      const a = i * 1.05;
      return [Math.cos(a) * 0.16, 0.02 + (i % 2) * 0.03, Math.sin(a) * 0.16];
    }),
    [],
  );
  useFrame((st) => {
    if (reducedMotion) return;
    const t = st.clock.elapsedTime;
    for (let i = 0; i < micelio.current.length; i++) {
      const m = micelio.current[i];
      if (m) m.scale.setScalar(0.8 + 0.25 * Math.sin(t * 1.2 + i));
    }
  });
  return (
    <group position={[P_MM[0], y, P_MM[1]]}>
      {/* pared del canasto (cilindro abierto) + fondo */}
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.32, 0.26, 0.32, 18, 1, true]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.04, 18]} />
        <meshLambertMaterial color={PALETA.maderaOscura} />
      </mesh>
      {/* aros del tejido */}
      {[0.06, 0.18, 0.29].map((h, i) => (
        <mesh key={i} position={[0, h, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.31 - h * 0.15, 0.015, 5, 20]} />
          <meshLambertMaterial color={PALETA.madera} />
        </mesh>
      ))}
      {/* arroz cocido (domo claro) */}
      <mesh position={[0, 0.3, 0]} scale={[1, 0.4, 1]}>
        <sphereGeometry args={[0.26, 14, 10]} />
        <meshLambertMaterial color={ARROZ} flatShading />
      </mesh>
      {/* hojarasca encima (tapa la captura) */}
      {hojas.map((h, i) => (
        <mesh key={i} position={[h.x, 0.33, h.z]} rotation={[-Math.PI / 2, 0, h.g]}>
          <circleGeometry args={[0.11, 5]} />
          <meshLambertMaterial color={h.c} flatShading side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* micelio blanco que asoma (respira) */}
      {nodos.map((p, i) => (
        <mesh key={i} position={[p[0], 0.34 + p[1], p[2]]} ref={(el) => { micelio.current[i] = el; }}>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshBasicMaterial color={MICELIO} />
        </mesh>
      ))}
      {/* estaca con letrerito */}
      <mesh position={[0.42, 0.3, 0.12]}>
        <cylinderGeometry args={[0.02, 0.025, 0.6, 6]} />
        <meshLambertMaterial color={PALETA.madera} />
      </mesh>
      <mesh position={[0.42, 0.58, 0.12]} rotation={[0, 0.35, 0]}>
        <boxGeometry args={[0.28, 0.16, 0.02]} />
        <meshLambertMaterial color={PALETA.maderaClara} />
      </mesh>
    </group>
  );
}

/* ── ESTACIÓN 2 · PILA DE BOCASHI (fermento aeróbico por capas) ────────────── */
function PilaBocashi({ reducedMotion, tier }) {
  const y = altura(P_BOCASHI[0], P_BOCASHI[1]);
  const nVap = tier === 'alto' ? 9 : tier === 'medio' ? 6 : 4;
  const capas = useMemo(() => {
    const def = [
      { w: 1.7, d: 1.2, h: 0.16, c: PALETA.tierra }, // tierra de base
      { w: 1.55, d: 1.08, h: 0.14, c: '#d8c48f' }, // cascarilla de arroz
      { w: 1.4, d: 0.96, h: 0.14, c: PALETA.maderaOscura }, // gallinaza
      { w: 1.22, d: 0.84, h: 0.13, c: '#c6a76a' }, // salvado / afrecho
      { w: 1.0, d: 0.7, h: 0.12, c: CARBON }, // carbón vegetal
      { w: 0.74, d: 0.5, h: 0.14, c: PALETA.follajeOscuro }, // hojarasca / corona
    ];
    let acc = 0;
    const piezas = def.map((c, i) => {
      const cy = acc + c.h / 2;
      acc += c.h;
      return { ...c, cy, jitter: (i % 2 ? 1 : -1) * 0.03, giro: i * 0.05 };
    });
    return { piezas, cima: acc };
  }, []);
  return (
    <group position={[P_BOCASHI[0], y, P_BOCASHI[1]]}>
      {capas.piezas.map((c, i) => (
        <mesh key={i} position={[c.jitter, c.cy, 0]} rotation={[0, c.giro, 0]}>
          <boxGeometry args={[c.w, c.h, c.d]} />
          <meshLambertMaterial color={c.c} flatShading />
        </mesh>
      ))}
      {/* gotas de melaza en la corona (el azúcar que alimenta la fermentación) */}
      <mesh position={[0.12, capas.cima + 0.02, 0.06]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshBasicMaterial color={PALETA.ambar} />
      </mesh>
      <mesh position={[-0.14, capas.cima + 0.02, -0.05]}>
        <sphereGeometry args={[0.03, 8, 6]} />
        <meshBasicMaterial color={PALETA.ambar} />
      </mesh>
      {/* horquilla clavada: se voltea para airear (púas hacia el suelo) */}
      <group position={[0.82, 0, -0.1]} rotation={[0.16, 0, -0.24]}>
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[0.025, 0.03, 1.35, 6]} />
          <meshLambertMaterial color={PALETA.madera} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[0.26, 0.05, 0.05]} />
          <meshLambertMaterial color={PALETA.lamina} />
        </mesh>
        {[-0.1, 0, 0.1].map((tx, i) => (
          <mesh key={i} position={[tx, -0.06, 0]}>
            <cylinderGeometry args={[0.013, 0.008, 0.34, 4]} />
            <meshLambertMaterial color={PALETA.lamina} />
          </mesh>
        ))}
      </group>
      {/* el vapor: el calor de la fermentación aeróbica (está vivo y caliente) */}
      <ParticulasSuben
        origen={[0, capas.cima, 0]}
        ancho={0.7}
        alto={1.5}
        cuantas={nVap}
        radio={0.1}
        color="#f2e8d4"
        velocidad={0.1}
        opacidad={0.28}
        crecer
        reducedMotion={reducedMotion}
      />
    </group>
  );
}

/* ── ESTACIÓN 3 · CANECA DE BIOL (fermento líquido con trampa de gas) ──────── */
function DrumBiol({ reducedMotion, tier }) {
  const y = altura(P_BIOL[0], P_BIOL[1]);
  const nBurb = tier === 'alto' ? 10 : tier === 'medio' ? 7 : 4;
  /* la manguera de la tapa a la trampa de gas: una curva → un tubo (1 mesh) */
  const manguera = useMemo(() => {
    const curva = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.15, 1.06, 0.2),
      new THREE.Vector3(0.6, 1.2, 0.35),
      new THREE.Vector3(0.95, 0.6, 0.4),
    ]);
    return new THREE.TubeGeometry(curva, 16, 0.018, 6, false);
  }, []);
  useEffect(() => () => manguera.dispose(), [manguera]);
  return (
    <group position={[P_BIOL[0], y, P_BIOL[1]]}>
      {/* la caneca cerrada (anaeróbica) */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 1.0, 20]} />
        <meshLambertMaterial color={AZUL_DRUM} flatShading />
      </mesh>
      {[0.28, 0.72].map((h, i) => (
        <mesh key={i} position={[0, h, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.43, 0.02, 6, 22]} />
          <meshLambertMaterial color="#47697f" />
        </mesh>
      ))}
      {/* tapa */}
      <mesh position={[0, 1.02, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.06, 20]} />
        <meshLambertMaterial color={PALETA.maderaOscura} />
      </mesh>
      {/* canilla abajo (saca el biol para diluirlo) */}
      <mesh position={[0.44, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.16, 6]} />
        <meshLambertMaterial color={PALETA.lamina} />
      </mesh>
      <mesh position={[0.54, 0.14, 0]}>
        <boxGeometry args={[0.06, 0.1, 0.06]} />
        <meshLambertMaterial color={PALETA.ambar} />
      </mesh>
      {/* la manguera hacia la trampa */}
      <mesh geometry={manguera}>
        <meshLambertMaterial color={PALETA.maderaOscura} />
      </mesh>
      {/* la trampa de gas: botella con agua + burbujas que escapan */}
      <group position={[0.95, 0, 0.4]}>
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.5, 14]} />
          <meshLambertMaterial color="#cfe4ea" transparent opacity={0.4} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.3, 14]} />
          <meshLambertMaterial color={PALETA.agua} transparent opacity={0.7} emissive="#2a6a86" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[0, 0.56, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
          <meshLambertMaterial color={PALETA.maderaOscura} />
        </mesh>
        <ParticulasSuben
          origen={[0, 0.1, 0]}
          ancho={0.12}
          alto={0.28}
          cuantas={nBurb}
          radio={0.022}
          color="#eaf6f9"
          velocidad={0.45}
          opacidad={0.85}
          reducedMotion={reducedMotion}
        />
      </group>
    </group>
  );
}

/* ── ESTACIÓN 4a · CALDO SULFOCÁLCICO (al fuego, ámbar hirviente) ──────────── */
function CaldoSulfocalcico({ reducedMotion, tier }) {
  const y = altura(P_SULFO[0], P_SULFO[1]);
  const nBurb = tier === 'alto' ? 8 : tier === 'medio' ? 5 : 3;
  const nVap = tier === 'alto' ? 7 : tier === 'medio' ? 5 : 3;
  return (
    <group position={[P_SULFO[0], y, P_SULFO[1]]}>
      {/* piedras del fogón */}
      {[[0.28, 0.16], [-0.3, 0.12], [0.02, -0.32]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx, 0.1, sz]}>
          <dodecahedronGeometry args={[0.15, 0]} />
          <meshLambertMaterial color={PALETA.piedra} flatShading />
        </mesh>
      ))}
      <Fuego reducedMotion={reducedMotion} />
      {/* la olla */}
      <mesh position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.34, 0.28, 0.4, 16]} />
        <meshLambertMaterial color={PALETA.lamina} flatShading />
      </mesh>
      <mesh position={[0, 0.66, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.34, 0.03, 6, 20]} />
        <meshLambertMaterial color={PALETA.maderaOscura} />
      </mesh>
      {/* el líquido ámbar */}
      <mesh position={[0, 0.64, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 18]} />
        <meshLambertMaterial color={AMBAR_CALDO} emissive="#7a3d0a" emissiveIntensity={0.3} />
      </mesh>
      {/* el hervor y el vapor */}
      <ParticulasSuben
        origen={[0, 0.66, 0]}
        ancho={0.44}
        alto={0.26}
        cuantas={nBurb}
        radio={0.03}
        color="#e6a24a"
        velocidad={0.5}
        opacidad={0.8}
        reducedMotion={reducedMotion}
      />
      <ParticulasSuben
        origen={[0, 0.76, 0]}
        ancho={0.5}
        alto={1.4}
        cuantas={nVap}
        radio={0.09}
        color="#f3ead8"
        velocidad={0.12}
        opacidad={0.3}
        crecer
        reducedMotion={reducedMotion}
      />
    </group>
  );
}

/* ── ESTACIÓN 4b · CALDO BORDELÉS (azul: cal + sulfato de cobre) ───────────── */
function CaldoBordeles() {
  const y = altura(P_BORDE[0], P_BORDE[1]);
  return (
    <group position={[P_BORDE[0], y, P_BORDE[1]]}>
      {/* el balde */}
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.3, 0.24, 0.52, 16]} />
        <meshLambertMaterial color={PALETA.lamina} flatShading />
      </mesh>
      <mesh position={[0, 0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.03, 6, 20]} />
        <meshLambertMaterial color={PALETA.maderaOscura} />
      </mesh>
      {/* el líquido azul celeste */}
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.27, 18]} />
        <meshLambertMaterial color={AZUL_BORDELES} emissive="#2f6a8a" emissiveIntensity={0.2} />
      </mesh>
      {/* el asa */}
      <mesh position={[0, 0.56, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.02, 5, 16, Math.PI]} />
        <meshLambertMaterial color={PALETA.maderaOscura} />
      </mesh>
      {/* la paleta de revolver */}
      <mesh position={[0.1, 0.62, 0.05]} rotation={[0.25, 0, 0.32]}>
        <cylinderGeometry args={[0.02, 0.02, 0.72, 6]} />
        <meshLambertMaterial color={PALETA.madera} />
      </mesh>
      {/* los ingredientes: cal (blanca) + cristal de sulfato de cobre (azul) */}
      <mesh position={[0.5, 0.1, 0.24]}>
        <dodecahedronGeometry args={[0.14, 0]} />
        <meshLambertMaterial color={PALETA.cal} flatShading />
      </mesh>
      <mesh position={[0.62, 0.08, -0.14]}>
        <icosahedronGeometry args={[0.1, 0]} />
        <meshLambertMaterial color="#3f7fb0" flatShading emissive="#1f4f70" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

/* ── La mesa con la MELAZA: el alimento común de todos los fermentos ───────── */
function MesaMelaza() {
  const y = altura(P_MESA[0], P_MESA[1]);
  return (
    <group position={[P_MESA[0], y, P_MESA[1]]}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.1, 0.06, 0.6]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading />
      </mesh>
      {[[0.48, 0.25], [-0.48, 0.25], [0.48, -0.25], [-0.48, -0.25]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.24, lz]}>
          <cylinderGeometry args={[0.03, 0.03, 0.5, 5]} />
          <meshLambertMaterial color={PALETA.maderaOscura} />
        </mesh>
      ))}
      {/* el frasco de melaza (ámbar espeso) */}
      <mesh position={[-0.3, 0.66, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.28, 12]} />
        <meshLambertMaterial color={MELAZA} transparent opacity={0.85} emissive="#3a1f06" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[-0.3, 0.82, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.06, 8]} />
        <meshLambertMaterial color={PALETA.lamina} />
      </mesh>
      {/* el costal de salvado */}
      <mesh position={[0.32, 0.62, 0]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.32, 0.24, 0.24]} />
        <meshLambertMaterial color="#c9b487" flatShading />
      </mesh>
    </group>
  );
}

/* ── UN FRASCO de caldo microbiológico (EM / lactosuero / lacto-microbios) ────
      Vidrio traslúcido + líquido TURBIO (vivo, no agua clara) + la nata/biofilm
      que flota arriba + tapa de tela o trampa de aire. Los que fermentan fuerte
      burbujean (CO₂) y sueltan un destello de vida microbiana. */
function Frasco({ x, alto, liquido, tapa, burbujea, brillo, nBurb, reducedMotion }) {
  const hVidrio = 0.28 + alto * 0.2;
  const hLiq = hVidrio * 0.72;
  const yBase = 0.53; // sobre el tablero del estante
  return (
    <group position={[x, yBase, 0]}>
      {/* el líquido vivo y turbio (primero: se ve a través del vidrio) */}
      <mesh position={[0, hLiq / 2 + 0.02, 0]}>
        <cylinderGeometry args={[0.096, 0.096, hLiq, 14]} />
        <meshLambertMaterial color={liquido} emissive={liquido} emissiveIntensity={0.14} />
      </mesh>
      {/* la nata / "madre" (biofilm) que flota en la superficie */}
      <mesh position={[0, hLiq + 0.03, 0]} scale={[1, 0.4, 1]}>
        <sphereGeometry args={[0.09, 12, 8]} />
        <meshLambertMaterial color={NATA} flatShading transparent opacity={0.92} />
      </mesh>
      {/* el vidrio del frasco (traslúcido, encima) */}
      <mesh position={[0, hVidrio / 2 + 0.02, 0]}>
        <cylinderGeometry args={[0.11, 0.105, hVidrio, 16]} />
        <meshLambertMaterial color={VIDRIO} transparent opacity={0.26} depthWrite={false} />
      </mesh>
      {/* cuello del frasco */}
      <mesh position={[0, hVidrio + 0.05, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.06, 12]} />
        <meshLambertMaterial color={VIDRIO} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      {/* burbujas de la fermentación (CO₂ que sube por el caldo) */}
      {burbujea && (
        <ParticulasSuben
          origen={[0, 0.06, 0]}
          ancho={0.13}
          alto={hLiq - 0.02}
          cuantas={nBurb}
          radio={0.014}
          color="#f4fbf7"
          velocidad={0.4}
          opacidad={0.7}
          reducedMotion={reducedMotion}
        />
      )}
      {/* tapa: tela amarrada (la mayoría) o trampa de aire (airlock) */}
      {tapa === 'trampa' ? (
        <group position={[0, hVidrio + 0.08, 0]}>
          {/* tapón */}
          <mesh>
            <cylinderGeometry args={[0.072, 0.072, 0.05, 10]} />
            <meshLambertMaterial color={PALETA.maderaOscura} />
          </mesh>
          {/* el codo del airlock */}
          <mesh position={[0.05, 0.12, 0]} rotation={[0, 0, -0.35]}>
            <cylinderGeometry args={[0.017, 0.017, 0.24, 8]} />
            <meshLambertMaterial color="#cfe4ea" transparent opacity={0.6} />
          </mesh>
          <mesh position={[0.12, 0.18, 0]}>
            <sphereGeometry args={[0.045, 12, 10]} />
            <meshLambertMaterial color={PALETA.agua} transparent opacity={0.7} emissive="#2a6a86" emissiveIntensity={0.2} />
          </mesh>
        </group>
      ) : (
        <group position={[0, hVidrio + 0.07, 0]}>
          {/* trapo de tela sobre la boca */}
          <mesh scale={[1, 0.5, 1]}>
            <sphereGeometry args={[0.11, 12, 8]} />
            <meshLambertMaterial color={PALETA.cal} flatShading />
          </mesh>
          {/* el caucho / cabuya que la amarra */}
          <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.088, 0.012, 6, 18]} />
            <meshLambertMaterial color={PALETA.ambar} />
          </mesh>
        </group>
      )}
      {/* el destello de la vida microbiana en suspensión (hacer visible lo vivo) */}
      {brillo && (
        <ParticulasSuben
          origen={[0, hLiq * 0.4 + 0.05, 0]}
          ancho={0.14}
          alto={hLiq * 0.7}
          cuantas={nBurb}
          radio={0.01}
          color={MICROBRILLO}
          velocidad={0.16}
          opacidad={0.85}
          reducedMotion={reducedMotion}
        />
      )}
    </group>
  );
}

/* ── ESTACIÓN 5 · ESTANTE DE CALDOS MICROBIOLÓGICOS EN FRASCO (EM y lacto) ────
      Los "microorganismos eficientes" y el lactosuero: microbios que se CRÍAN y
      se guardan en frasco, listos para activar con melaza. La vida embotellada. */
function FrascosEM({ reducedMotion, tier }) {
  const y = altura(P_EM[0], P_EM[1]);
  const nBurb = tier === 'alto' ? 8 : tier === 'medio' ? 5 : 3;
  const frascos = useMemo(
    () => [
      { x: -0.5, alto: 0.9, liquido: EM_MADRE, tapa: 'trampa', burbujea: true, brillo: true },
      { x: -0.16, alto: 0.7, liquido: LACTOSUERO, tapa: 'tela', burbujea: false, brillo: true },
      { x: 0.18, alto: 1.0, liquido: LACTO_ROSA, tapa: 'tela', burbujea: true, brillo: false },
      { x: 0.52, alto: 0.6, liquido: EM_MADRE, tapa: 'tela', burbujea: false, brillo: false },
    ],
    [],
  );
  return (
    <group position={[P_EM[0], y, P_EM[1]]} rotation={[0, -0.5, 0]}>
      {/* el tablero del estante */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.5, 0.06, 0.44]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading />
      </mesh>
      {/* respaldo del estante (una tabla parada atrás) */}
      <mesh position={[0, 0.72, -0.2]}>
        <boxGeometry args={[1.5, 0.5, 0.04]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>
      {/* patas */}
      {[[0.66, 0.18], [-0.66, 0.18], [0.66, -0.18], [-0.66, -0.18]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.24, lz]}>
          <cylinderGeometry args={[0.03, 0.03, 0.5, 5]} />
          <meshLambertMaterial color={PALETA.maderaOscura} />
        </mesh>
      ))}
      {/* los frascos con la vida embotellada */}
      {frascos.map((f, i) => (
        <Frasco key={i} {...f} nBurb={nBurb} reducedMotion={reducedMotion} />
      ))}
      {/* el balde de melaza para activarlos (el alimento que despierta el EM) */}
      <mesh position={[0.62, 0.62, 0.02]}>
        <cylinderGeometry args={[0.08, 0.07, 0.16, 10]} />
        <meshLambertMaterial color={MELAZA} transparent opacity={0.9} emissive="#3a1f06" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

/* ── El SUELO que se alimenta y se protege: la cama con matas sanas + rocío ── */
function CamaCultivo({ tier, reducedMotion }) {
  const y = altura(P_CAMA[0], P_CAMA[1]);
  const nRocio = tier === 'alto' ? 14 : tier === 'medio' ? 9 : 0;
  const matas = useMemo(
    () => Array.from({ length: 5 }, (_, i) => ({
      x: -0.7 + i * 0.35,
      e: 0.85 + ((i * 7) % 4) / 10,
      c: i % 2 ? PALETA.follaje : PALETA.follajeClaro,
    })),
    [],
  );
  return (
    <group position={[P_CAMA[0], y, P_CAMA[1]]}>
      {/* el cajón de la cama */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.8, 0.2, 0.7]} />
        <meshLambertMaterial color={PALETA.tierra} flatShading />
      </mesh>
      {[[0, 0.35], [0, -0.35]].map(([bx, bz], i) => (
        <mesh key={i} position={[bx, 0.14, bz]}>
          <boxGeometry args={[1.85, 0.1, 0.05]} />
          <meshLambertMaterial color={PALETA.madera} />
        </mesh>
      ))}
      {/* las matas sanas (alimentadas y protegidas) */}
      {matas.map((m, i) => (
        <group key={i} position={[m.x, 0.2, 0]} scale={m.e}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.02, 0.03, 0.24, 5]} />
            <meshLambertMaterial color={PALETA.madera} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <coneGeometry args={[0.16, 0.34, 7]} />
            <meshLambertMaterial color={m.c} flatShading />
          </mesh>
          <mesh position={[0.08, 0.24, 0.05]} rotation={[0, 0, -0.6]}>
            <coneGeometry args={[0.1, 0.2, 6]} />
            <meshLambertMaterial color={m.c} flatShading />
          </mesh>
        </group>
      ))}
      {/* el rocío del biopreparado cayendo (aspersión que alimenta y cuida) */}
      {nRocio > 0 && (
        <ParticulasSuben
          origen={[0, 0.72, 0]}
          ancho={1.7}
          alto={-0.48}
          cuantas={nRocio}
          radio={0.02}
          color="#cbeecb"
          velocidad={0.35}
          opacidad={0.7}
          reducedMotion={reducedMotion}
        />
      )}
    </group>
  );
}

/* El sol bajo de la hora dorada, hermano del de los demás mundos. */
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

/* Rótulo sobrio de estación (mismo lenguaje que el resto de los mundos). */
function Rotulo({ pos, texto, sub, distancia = 14 }) {
  return (
    <group position={pos}>
      <Html center distanceFactor={distancia} zIndexRange={[30, 10]} style={{ pointerEvents: 'none' }}>
        <div className="mferm-rotulo" aria-hidden="true">
          <span className="mferm-rotulo__punto" />
          <span className="mferm-rotulo__txt">
            {texto}
            {sub ? <em className="mferm-rotulo__sub">{sub}</em> : null}
          </span>
        </div>
      </Html>
    </group>
  );
}

/* ── Las ESTACIONES del recorrido didáctico (datos, no UI) ────────────────── */
const ESTACIONES = [
  {
    id: 'mm',
    titulo: 'Microorganismos de montaña',
    frase: 'Bajo el monte nativo viven los microbios que despiertan la tierra: se capturan con arroz cocido y hojarasca.',
    mira: () => [P_MM[0], altura(P_MM[0], P_MM[1]) + 0.35, P_MM[1]],
    cam: () => [P_MM[0] + 0.6, altura(P_MM[0], P_MM[1]) + 2.2, P_MM[1] + 3.6],
  },
  {
    id: 'bocashi',
    titulo: 'Bocashi',
    frase: 'Un abono por capas que fermenta con aire: arroz, salvado, tierra y melaza; se voltea para que respire y no se queme.',
    mira: () => [P_BOCASHI[0], 0.6, P_BOCASHI[1]],
    cam: () => [P_BOCASHI[0] + 0.4, 2.4, P_BOCASHI[1] + 3.6],
  },
  {
    id: 'biol',
    titulo: 'Biol',
    frase: 'El fermento líquido en caneca cerrada: la trampa de agua deja salir el gas sin que entre el aire; se aplica diluido.',
    mira: () => [P_BIOL[0] + 0.3, 0.7, P_BIOL[1]],
    cam: () => [P_BIOL[0] + 1.2, 2.2, P_BIOL[1] + 3.4],
  },
  {
    id: 'em',
    titulo: 'Caldos microbiológicos',
    frase: 'Microorganismos eficientes y lactosuero criados en frasco: microbios vivos que se guardan turbios y se activan con melaza; algunos burbujean de puro vivos.',
    mira: () => [P_EM[0], 0.7, P_EM[1]],
    cam: () => [P_EM[0] + 0.8, 2.2, P_EM[1] + 3.0],
  },
  {
    id: 'caldos',
    titulo: 'Caldos minerales',
    frase: 'Sulfocálcico al fuego y bordelés azul: minerales que protegen la hoja de hongos y plagas, sin veneno de síntesis.',
    mira: () => [(P_SULFO[0] + P_BORDE[0]) / 2, 0.55, (P_SULFO[1] + P_BORDE[1]) / 2],
    cam: () => [(P_SULFO[0] + P_BORDE[0]) / 2, 2.8, ((P_SULFO[1] + P_BORDE[1]) / 2) + 4.2],
  },
  {
    id: 'suelo',
    titulo: 'El suelo se alimenta',
    frase: 'Todo esto vuelve a la tierra: alimenta la raíz y protege la mata, sin químicos que maten la vida del suelo.',
    mira: () => [P_CAMA[0], 0.4, P_CAMA[1]],
    cam: () => [P_CAMA[0] + 0.8, 2.0, P_CAMA[1] + 3.0],
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
function DioramaFermentos({ perfil, tier, reducedMotion, estacion, onSoltar, controles }) {
  const geoTerreno = useMemo(
    () => construirTerreno(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geoTerreno.dispose(), [geoTerreno]);

  /* áreas ESTABLES para las nubes de partículas del kit (se re-siembran si
     cambian; por eso viven en useMemo). */
  const areas = useMemo(
    () => ({ polen: /** @type {[number, number, number]} */ ([ANCHO, 4, FONDO]), luces: /** @type {[number, number, number]} */ ([10, 2.5, 6]) }),
    [],
  );

  return (
    <>
      <color attach="background" args={[CIELO.fondo]} />
      {perfil.fog && <fogExp2 attach="fog" args={[CIELO.niebla, 0.022]} />}
      <hemisphereLight intensity={0.72 * CIELO.intensidad} color={CIELO.cielo} groundColor={CIELO.suelo} />
      <ambientLight intensity={0.3 * CIELO.intensidad} color={ATMOSFERA.luz} />
      {/* el mismo sol del valle: dirección [6,9,4], sin shadow-map */}
      <directionalLight position={[6, 9, 4]} intensity={0.95 * CIELO.intensidad} color={ATMOSFERA.luz} />
      <directionalLight position={[-5, 4, -6]} intensity={0.24} color={ATMOSFERA.relleno} />

      <SolDorado />

      <mesh geometry={geoTerreno}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      <Monte />

      {/* las cuatro manos del oficio */}
      <CanastoMM reducedMotion={reducedMotion} />
      <PilaBocashi reducedMotion={reducedMotion} tier={tier} />
      <DrumBiol reducedMotion={reducedMotion} tier={tier} />
      <CaldoSulfocalcico reducedMotion={reducedMotion} tier={tier} />
      <CaldoBordeles />
      <MesaMelaza />
      <FrascosEM reducedMotion={reducedMotion} tier={tier} />
      <CamaCultivo tier={tier} reducedMotion={reducedMotion} />

      {/* el aire de la hora dorada (kit del framework, sin tocarlo) */}
      <ParticulasAmbientales tipo="polen" tier={tier} reducedMotion={reducedMotion} area={areas.polen} position={[0, 0.2, -0.5]} semilla={31} />
      <ParticulasAmbientales tipo="luciernagas" tier={tier} reducedMotion={reducedMotion} densidad={0.7} area={areas.luces} position={[-1, 0.5, -4]} semilla={19} />

      {/* rótulos de las estaciones, sobrios */}
      <Rotulo pos={[P_MM[0], altura(P_MM[0], P_MM[1]) + 1.3, P_MM[1]]} texto="Microorganismos" sub="del monte nativo" />
      <Rotulo pos={[P_BOCASHI[0], 1.5, P_BOCASHI[1]]} texto="Bocashi" sub="fermento con aire" distancia={13} />
      <Rotulo pos={[P_BIOL[0], 1.7, P_BIOL[1]]} texto="Biol" sub="fermento líquido" distancia={13} />
      <Rotulo pos={[P_SULFO[0], 1.5, P_SULFO[1]]} texto="Sulfocálcico" sub="mineral al fuego" distancia={12} />
      <Rotulo pos={[P_BORDE[0], 1.2, P_BORDE[1]]} texto="Bordelés" sub="mineral azul" distancia={12} />
      <Rotulo pos={[P_MESA[0], 1.3, P_MESA[1]]} texto="Melaza" sub="el alimento común" distancia={12} />
      <Rotulo pos={[P_EM[0], 1.35, P_EM[1]]} texto="Caldos microbiológicos" sub="EM y lactosuero en frasco" distancia={12} />
      <Rotulo pos={[P_CAMA[0], 1.2, P_CAMA[1]]} texto="El suelo se alimenta" sub="y la mata se protege" distancia={13} />

      <OrbitControls
        ref={controles}
        makeDefault
        enablePan={false}
        enableZoom
        minDistance={3.2}
        maxDistance={20}
        target={[0.2, 0.6, 0.6]}
        minPolarAngle={0.28}
        maxPolarAngle={1.4}
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

/* Estilos del mockup (viven aquí: son de ESTA escena). Acento ámbar, no azul:
   el taller es cálido, del fuego y la melaza. */
const CSS_FERM = `
.mferm-root { position: relative; width: 100%; height: 100vh; min-height: 340px; overflow: hidden; background: ${CIELO.fondo}; }
.mferm-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.7s ease; }
.mferm-canvas--lista { opacity: 1; }
.mferm-rotulo { display: flex; align-items: center; gap: 0.32rem; white-space: nowrap; font: 600 0.72rem/1.1 system-ui, sans-serif; color: #3a2e1e; text-shadow: 0 1px 3px rgba(250,244,230,0.9); }
.mferm-rotulo__punto { width: 7px; height: 7px; border-radius: 50%; background: #f3d9a0; box-shadow: 0 0 0 2px rgba(58,46,30,0.5); flex: 0 0 auto; }
.mferm-rotulo__txt { display: inline-flex; align-items: baseline; gap: 0.3rem; }
.mferm-rotulo__sub { font-weight: 500; font-style: normal; opacity: 0.72; font-size: 0.9em; }
.mferm-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.mferm-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #3a2c18; text-shadow: 0 1px 4px rgba(250,244,230,0.85); font: 700 1.15rem/1.2 system-ui, sans-serif; }
.mferm-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.78; margin-top: 0.15rem; }
.mferm-estaciones { pointer-events: auto; align-self: flex-start; margin: 0.6rem 0.8rem; padding: 0.45rem; display: flex; flex-direction: column; gap: 0.28rem; list-style: none; border-radius: 0.8rem; background: rgba(252,248,238,0.8); backdrop-filter: blur(3px); box-shadow: 0 4px 14px rgba(66,52,32,0.16); max-width: min(76vw, 20rem); }
.mferm-estaciones button { display: block; width: 100%; text-align: left; padding: 0.3rem 0.55rem; border: 0; border-radius: 0.55rem; background: transparent; color: #3a2c18; font: 600 0.76rem/1.2 system-ui, sans-serif; cursor: pointer; }
.mferm-estaciones button:hover { background: rgba(217,161,59,0.16); }
.mferm-estaciones button[aria-pressed="true"] { background: rgba(217,161,59,0.28); }
.mferm-estaciones button small { display: none; font: 500 0.7rem/1.25 system-ui, sans-serif; opacity: 0.82; margin-top: 0.1rem; }
.mferm-estaciones button[aria-pressed="true"] small { display: block; }
.mferm-pie { pointer-events: none; padding: 0 1rem 0.85rem; display: flex; justify-content: center; }
.mferm-pie p { margin: 0; max-width: 42rem; text-align: center; padding: 0.42rem 0.85rem; border-radius: 0.7rem; background: rgba(32,24,14,0.5); backdrop-filter: blur(3px); color: #f6efdf; font: 500 0.76rem/1.4 system-ui, sans-serif; }
.mferm-volver { pointer-events: auto; position: absolute; top: 0.8rem; right: 0.8rem; padding: 0.4rem 0.8rem; border: 0; border-radius: 999px; background: rgba(32,24,14,0.55); color: #f6efdf; font: 600 0.78rem/1 system-ui, sans-serif; cursor: pointer; }
@media (prefers-reduced-motion: reduce) { .mferm-canvas { transition: none; } }
@media (max-width: 640px) { .mferm-estaciones { max-width: 62vw; } .mferm-titulo { font-size: 1rem; } }
`;

/**
 * MundoFermentos3D — el mockup montable: Canvas propio + recorrido didáctico por
 * el taller de biopreparados.
 *
 * @param {object} props
 * @param {() => void} [props.onBack]  vuelve al host (botón discreto).
 */
export default function MundoFermentos3D({ onBack }) {
  const [listo, setListo] = useState(false);
  const [estacionId, setEstacionId] = useState(null);
  const controles = useRef(null);
  const [{ tier, reducedMotion }] = useState(() => decidirTier());
  const perfil = perfilDeTier(tier);
  const estacion = estacionId ? ESTACIONES.find((e) => e.id === estacionId) : null;

  return (
    <section
      className="mferm-root"
      data-tier={tier}
      aria-label="El taller de los fermentos y biopreparados de la finca: del monte al suelo, sin química de síntesis"
    >
      <style>{CSS_FERM}</style>
      <Canvas
        className={`mferm-canvas${listo ? ' mferm-canvas--lista' : ''}`}
        dpr={tier === 'alto' ? [1, 1.5] : tier === 'medio' ? [1, 1.3] : 1}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [8.5, 6.5, 10.5], fov: 44 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <DioramaFermentos
          perfil={perfil}
          tier={tier}
          reducedMotion={reducedMotion}
          estacion={estacion}
          onSoltar={() => setEstacionId(null)}
          controles={controles}
        />
      </Canvas>

      <div className="mferm-chrome">
        <h2 className="mferm-titulo">
          El taller de los fermentos
          <small>Biopreparados: alimentar y proteger, sin química de síntesis</small>
        </h2>
        <ul className="mferm-estaciones" aria-label="Estaciones del taller de biopreparados">
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
        <div className="mferm-pie">
          <p>
            Nada se compra que se pueda criar: el monte da la vida, la melaza la
            alimenta y el fermento la devuelve al suelo — así la finca se cuida sola.
          </p>
        </div>
      </div>
      {onBack ? (
        <button type="button" className="mferm-volver" onClick={onBack}>
          Volver
        </button>
      ) : null}
    </section>
  );
}
