/*
 * MundoPiscicultura3D — los ESTANQUES de la finca, como mundo 3D didáctico.
 *
 * La piscicultura campesina de Colombia se organiza por PISO TÉRMICO, y aquí se
 * ve toda en una sola ladera bajada por el agua de la microcuenca (DR
 * piscicultura 5b59fe75, gemini 2026-06-19):
 *
 *   quebrada (arriba) → ESTANQUE FRÍO (trucha, agua corriente oxigenada) →
 *   caño que baja → ESTANQUE CÁLIDO (mojarra + cachama en policultivo, y el
 *   bocachico limpiando el fondo) → salida al riego de la vega.
 *
 * Y el estanque cosido a la finca, no aparte:
 *   · ACUAPONÍA rústica: el agua con abono de los peces riega la huerta; la
 *     lechuga la devuelve limpia.
 *   · LODOS → ABONO: el sedimento del fondo (rico en fósforo y nitrógeno) va al
 *     plátano y al café, no al río.
 *   · EL ESTANQUE COMO RESERVORIO de la microcuenca: entra de la quebrada, se
 *     guarda y sigue al riego — el mismo ciclo del agua que ya modela el valle.
 *
 * ESPECIES (verificadas en el DR, gemini grounded):
 *   · Trucha arcoíris (Oncorhynchus mykiss) — frío, >1800 msnm, 12–16 °C, O2 alto.
 *   · Mojarra/Tilapia (Oreochromis niloticus) — cálido, 24–29 °C.
 *   · Cachama (Colossoma macropomum / Piaractus brachypomus) — cálido; en
 *     policultivo 80 % mojarra / 20 % cachama.
 *   · Bocachico (Prochilodus magdalenae) — iliófago detritívoro, aprovecha los
 *     restos del fondo (baja el concentrado).
 *
 * DIRECCIÓN DE ARTE: hora dorada de `atmosferaMadre` (CIELOS.agua mezclado con
 * `mezclarCielo`, la MISMA ley que el resto de mundos) y materiales de PALETA
 * (el único azul con permiso es PALETA.agua; el estanque cálido se entibia hacia
 * el verde del plancton). Terreno y peces 100 % procedurales, deterministas
 * (cero assets remotos → cachea limpio offline).
 *
 * RENDIMIENTO: MeshLambert/Basic, sin shadow-maps ni post; peces y partículas
 * con presupuesto por `tier` (deviceTier); `reducedMotion` congela el nado y
 * pasa el frameloop a demanda.
 *
 * Mockup standalone con su PROPIO <Canvas> — ruta sugerida #/mockups/mundo-piscicultura-3d.
 * NO toca mundoData, el registry ni el host <Mundo> (solo archivos nuevos).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { ATMOSFERA, CIELOS, PALETA, mezclarCielo } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { construirTerreno } from '../visual/mundo3d/kit/terreno.js';
import {
  geomCuerpoPez,
  geomColaPez,
  repartirCardumen,
  PAL_PECES,
} from '../visual/mundo3d/piscicultura/pecesPiscicultura.geom.js';

/* Cielo del mundo mezclado a la hora dorada (misma receta que los demás mundos
   → entrar aquí se siente del MISMO atardecer). Constante de módulo. */
const CIELO = mezclarCielo(CIELOS.agua);

/* ── Geografía (coordenadas de mundo): X oriente(+)/occidente(−), Y altura,
      Z loma atrás(−) → vega adelante(+). ── */
const ANCHO = 18;
const FONDO = 16;

/* Los dos estanques. El frío ARRIBA en la ladera (agua corriente), el cálido
   ABAJO en la vega (agua guardada, plancton). `hondo` es la profundidad útil
   (DR: máx ~1.5 m real; aquí en metros de mundo). */
const ESTANQUE_FRIO = { cx: -3.1, cz: -2.4, rx: 1.55, rz: 1.1, ySup: 1.36, hondo: 0.82 };
const ESTANQUE_CALIDO = { cx: 2.5, cz: 2.3, rx: 2.15, rz: 1.7, ySup: 0.36, hondo: 0.9 };

/* El caño que baja del estanque frío al cálido (polilínea XZ) — la microcuenca
   que enlaza los dos pisos. */
const CANO_XZ = [
  [-2.0, -1.6],
  [-1.0, -0.4],
  [0.2, 0.7],
  [1.2, 1.4],
];
/* La quebrada que ALIMENTA el estanque frío (entra por la loma). */
const ENTRADA_XZ = [
  [-4.6, -5.4],
  [-4.0, -4.2],
  [-3.4, -3.2],
];
/* La salida del estanque cálido hacia el riego de la vega (caudal que sigue). */
const SALIDA_XZ = [
  [4.2, 3.1],
  [5.2, 4.2],
  [5.8, 5.6],
];
const HUERTA = { x: 5.6, z: 0.4 }; // la mesa de acuaponía
const ABONERA = { x: 4.9, z: 3.0 }; // el montón de lodo→abono, junto al cálido
const PLATANAL = { x: 6.6, z: 4.6 }; // el plátano/café que recibe el abono

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const suavizar = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const ruido = (wx, wz) =>
  Math.sin(wx * 1.1 + wz * 0.8) * 0.5 +
  Math.sin(wx * 2.1 - wz * 1.5 + 1.7) * 0.3 +
  Math.sin(wx * 3.7 + wz * 2.9 + 4.2) * 0.2;

/* Distancia elíptica normalizada a un estanque (<1 dentro del agua). */
function distElipse(wx, wz, e) {
  const dx = (wx - e.cx) / e.rx;
  const dz = (wz - e.cz) / e.rz;
  return Math.hypot(dx, dz);
}

/* Distancia de (wx,wz) a una polilínea XZ (para tallar cauces y humedecer). */
function distPolilinea(wx, wz, pts) {
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

/* Altura BASE del terreno: rampa que sube de la vega (adelante) a la loma
   (atrás), con textura. */
function alturaBase(wx, wz) {
  const s = clamp((-wz + FONDO / 2) / FONDO, 0, 1); // 0 vega → 1 loma
  let h = Math.pow(s, 1.2) * 2.6;
  h += ruido(wx, wz) * 0.08 * (0.3 + s);
  return h;
}

/* Altura FINAL: la base con las CUBETAS de los estanques talladas (fondo
   hondo + berma de orilla) y los cauces del caño/quebrada/salida hundidos. */
function altura(wx, wz) {
  let h = alturaBase(wx, wz);

  for (const e of [ESTANQUE_FRIO, ESTANQUE_CALIDO]) {
    const d = distElipse(wx, wz, e);
    // berma baja de orilla (justo por fuera del espejo)
    h += 0.16 * Math.exp(-((d - 1.08) * (d - 1.08)) / 0.05);
    // cubeta: hunde el fondo por dentro
    const dentro = 1 - suavizar(0.78, 1.06, d);
    const fondo = e.ySup - e.hondo;
    h = h + (Math.min(h, fondo) - h) * dentro;
  }

  // cauces (angostos → se tallan anchos para que el agua no se entierre)
  const dc = distPolilinea(wx, wz, CANO_XZ);
  h -= 0.2 * (1 - suavizar(0.18, 0.7, dc));
  const dq = distPolilinea(wx, wz, ENTRADA_XZ);
  h -= 0.18 * (1 - suavizar(0.18, 0.7, dq));
  const ds = distPolilinea(wx, wz, SALIDA_XZ);
  h -= 0.16 * (1 - suavizar(0.18, 0.62, ds));
  return h;
}

/* ── Color del terreno: pasto de ladera, tierra de las orillas (banca de
      estanque), y reverdece donde el agua toca. ── */
const C_LOMA = new THREE.Color('#9aa66a');
const C_PASTO = new THREE.Color(PALETA.follajeClaro);
const C_HUMEDO = new THREE.Color(PALETA.follaje);
const C_TIERRA = new THREE.Color(PALETA.tierraClara);
const C_RIBERA = new THREE.Color(PALETA.tierra);
function colorTerreno(wx, wz, y, out) {
  out.lerpColors(C_PASTO, C_LOMA, suavizar(0.6, 2.4, y));
  const dFrio = distElipse(wx, wz, ESTANQUE_FRIO);
  const dCal = distElipse(wx, wz, ESTANQUE_CALIDO);
  const dEstanque = Math.min(dFrio, dCal);
  const dCauce = Math.min(
    distPolilinea(wx, wz, CANO_XZ),
    distPolilinea(wx, wz, ENTRADA_XZ),
    distPolilinea(wx, wz, SALIDA_XZ),
  );
  // orilla y fondo de estanque: tierra removida
  if (dEstanque < 1.18) {
    const t = 1 - suavizar(0.7, 1.18, dEstanque);
    out.lerp(C_RIBERA, t * 0.75);
  }
  // humedad alrededor del agua: reverdece
  const humedad = Math.max(1 - suavizar(1.05, 1.9, dEstanque), 1 - suavizar(0.3, 1.6, dCauce));
  out.lerp(C_HUMEDO, Math.max(0, humedad) * 0.5);
  if (dCauce < 0.4) out.lerp(C_TIERRA, 0.4 * (1 - dCauce / 0.4));
  return out;
}

/* Curva 3D drapeada sobre el terreno desde una polilínea XZ. */
function curvaSobreTerreno(ptsXZ, alza = 0.05) {
  const pts = ptsXZ.map(([x, z]) => new THREE.Vector3(x, altura(x, z) + alza, z));
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
}

/* CINTA de agua barrida sobre el terreno (el caño y la quebradita). */
function construirCinta(curva, ancho, muestras = 48, alza = 0.07) {
  const pos = new Float32Array(muestras * 2 * 3);
  const p = new THREE.Vector3();
  const tang = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i < muestras; i++) {
    const t = i / (muestras - 1);
    curva.getPointAt(t, p);
    curva.getTangentAt(t, tang);
    const nx = -tang.z, nz = tang.x;
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
    idx.push(a, b, d, b, e, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/* ── EL AGUA de los estanques: mismo material que el resto del juego (PALETA.agua
      + emisión tenue), respirando. El estanque cálido se entibia hacia el verde
      (plancton, alimento natural — didáctica silenciosa). ── */
const AGUA_FRIA = new THREE.Color(PALETA.agua).lerp(new THREE.Color('#cfe6ea'), 0.28); // clara, fría
const AGUA_CALIDA = new THREE.Color(PALETA.agua).lerp(new THREE.Color(PALETA.follaje), 0.32); // verdosa

function EspejoEstanque({ estanque, color, reducedMotion, radial = 30 }) {
  const mat = useRef(null);
  const geo = useMemo(() => {
    // disco elíptico a la superficie del agua
    const g = new THREE.CircleGeometry(1, radial);
    g.scale(estanque.rx, estanque.rz, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [estanque, radial]);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((st) => {
    if (reducedMotion || !mat.current) return;
    mat.current.emissiveIntensity = 0.22 + Math.sin(st.clock.elapsedTime * 0.7) * 0.07;
  });
  return (
    <mesh geometry={geo} position={[estanque.cx, estanque.ySup, estanque.cz]}>
      <meshLambertMaterial
        ref={mat}
        color={color}
        transparent
        opacity={0.72}
        emissive="#2a6a86"
        emissiveIntensity={0.24}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ── UN PEZ: cuerpo fusiforme + cola que aletea, nadando en su elipse dentro del
      estanque. Comparte geometría/material con su cardumen. ── */
function Pez({ plan, geoCuerpo, geoCola, matCuerpo, matCola, reducedMotion }) {
  const grupo = useRef(null);
  const cola = useRef(null);
  useFrame((st) => {
    const g = grupo.current;
    if (!g) return;
    const reloj = reducedMotion ? 0 : st.clock.elapsedTime;
    const ang = plan.fase + reloj * plan.vel;
    const [ox, oz] = plan.centro;
    const [rx, rz] = plan.radio;
    const x = ox + Math.cos(ang) * rx;
    const z = oz + Math.sin(ang) * rz;
    // dirección de avance (derivada de la elipse)
    const hx = -Math.sin(ang) * rx;
    const hz = Math.cos(ang) * rz;
    g.position.set(x, plan.y + Math.sin(reloj * 1.6 + plan.fase) * 0.03, z);
    g.rotation.y = Math.atan2(-hz, hx);
    if (cola.current && !reducedMotion) {
      cola.current.rotation.y = Math.sin(reloj * (6 + plan.vel * 12) + plan.fase) * 0.5;
    }
  });
  return (
    <group ref={grupo} scale={plan.escala}>
      <mesh geometry={geoCuerpo} material={matCuerpo} />
      {/* la cola pivota en la base del cuerpo (x = −largo/2) y aletea en Y */}
      <group ref={cola} position={[-(plan._largo || 0.5) / 2, 0, 0]}>
        <mesh geometry={geoCola} material={matCola} />
      </group>
    </group>
  );
}

/* ── UN CARDUMEN: arma la geometría/material de la especie una vez y siembra los
      peces con reparto determinista. ── */
function Cardumen({ especie, peces, reducedMotion }) {
  const geoCuerpo = useMemo(() => geomCuerpoPez(especie), [especie]);
  const geoCola = useMemo(() => geomColaPez(especie), [especie]);
  const matCuerpo = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    [],
  );
  const matCola = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }),
    [],
  );
  useEffect(
    () => () => {
      geoCuerpo.dispose();
      geoCola.dispose();
      matCuerpo.dispose();
      matCola.dispose();
    },
    [geoCuerpo, geoCola, matCuerpo, matCola],
  );
  const largo = (PAL_PECES[especie] || PAL_PECES.mojarra).largo;
  return (
    <group>
      {peces.map((p, i) => (
        <Pez
          key={i}
          plan={{ ...p, _largo: largo }}
          geoCuerpo={geoCuerpo}
          geoCola={geoCola}
          matCuerpo={matCuerpo}
          matCola={matCola}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}

/* ── CHORRO de entrada al estanque frío: gotas que caen de un tubo (aireación —
      la trucha necesita agua corriente y oxígeno). ── */
function ChorroAireacion({ origen, destino, cuantas, reducedMotion }) {
  const inst = useRef(null);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4() }), []);
  useFrame((st) => {
    if (!inst.current) return;
    const reloj = reducedMotion ? 0.3 : st.clock.elapsedTime;
    for (let i = 0; i < cuantas; i++) {
      const fase = (i / cuantas + reloj * 0.6) % 1;
      const x = origen[0] + (destino[0] - origen[0]) * fase + Math.sin(i * 3.1) * 0.04;
      const y = origen[1] + (destino[1] - origen[1]) * fase;
      const z = origen[2] + (destino[2] - origen[2]) * fase + Math.cos(i * 2.3) * 0.04;
      tmp.m.makeTranslation(x, y, z);
      inst.current.setMatrixAt(i, tmp.m);
    }
    inst.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={inst} args={[undefined, undefined, cuantas]} frustumCulled={false}>
      <sphereGeometry args={[0.03, 5, 4]} />
      <meshBasicMaterial color="#dff0f2" transparent opacity={0.8} depthWrite={false} />
    </instancedMesh>
  );
}

/* ── GOTAS que viajan por un caño (el agua se VE bajar de un estanque al otro). ── */
function FlujoGotas({ curva, cuantas, velocidad, radio, color, reducedMotion }) {
  const inst = useRef(null);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), m: new THREE.Matrix4() }), []);
  useFrame((st) => {
    if (!inst.current) return;
    const t0 = reducedMotion ? 0 : st.clock.elapsedTime * velocidad;
    for (let i = 0; i < cuantas; i++) {
      const t = (i / cuantas + t0) % 1;
      curva.getPointAt(t, tmp.p);
      tmp.m.makeTranslation(tmp.p.x, altura(tmp.p.x, tmp.p.z) + 0.12, tmp.p.z);
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

/* ── Piezas quietas de la finca ──────────────────────────────────────────── */

/* Piedras de orilla (banca de estanque de tierra — DR: 98% en tierra). */
function OrillaPiedras({ estanque, n = 12, semilla = 3 }) {
  const piedras = useMemo(() => {
    let s = (semilla * 2654435761) >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);
    const arr = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.3;
      const rx = estanque.rx * (1.02 + rnd() * 0.08);
      const rz = estanque.rz * (1.02 + rnd() * 0.08);
      const x = estanque.cx + Math.cos(a) * rx;
      const z = estanque.cz + Math.sin(a) * rz;
      arr.push({ x, z, y: altura(x, z), r: 0.1 + rnd() * 0.09 });
    }
    return arr;
  }, [estanque, n, semilla]);
  return (
    <group>
      {piedras.map((p, i) => (
        <mesh key={i} position={[p.x, p.y + 0.02, p.z]}>
          <dodecahedronGeometry args={[p.r, 0]} />
          <meshLambertMaterial color={PALETA.piedra} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Tubo de entrada de agua (PVC humilde) que descarga en el estanque frío. */
function TuboEntrada({ pos }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.18, 0]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
        <meshLambertMaterial color={PALETA.lamina} />
      </mesh>
    </group>
  );
}

/* La MESA de ACUAPONÍA: cama de cultivo elevada con lechugas, alimentada por el
   agua del estanque (tubo de ida) y devolviéndola limpia (tubo de retorno). */
function Acuaponia() {
  const y = altura(HUERTA.x, HUERTA.z);
  const lechugas = useMemo(() => {
    const arr = [];
    for (let f = 0; f < 2; f++) {
      for (let c = 0; c < 4; c++) {
        arr.push([-0.55 + c * 0.36, -0.18 + f * 0.36]);
      }
    }
    return arr;
  }, []);
  return (
    <group position={[HUERTA.x, y, HUERTA.z]}>
      {/* patas + cama */}
      {[[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]].map(([px, pz], i) => (
        <mesh key={i} position={[px, 0.24, pz]}>
          <cylinderGeometry args={[0.04, 0.04, 0.48, 6]} />
          <meshLambertMaterial color={PALETA.madera} />
        </mesh>
      ))}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.6, 0.12, 0.86]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>
      {/* lámina de agua de la cama (con abono de los peces) */}
      <mesh position={[0, 0.575, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.44, 0.72]} />
        <meshLambertMaterial color={AGUA_CALIDA} transparent opacity={0.75} emissive="#2a6a86" emissiveIntensity={0.18} depthWrite={false} />
      </mesh>
      {/* lechugas */}
      {lechugas.map(([lx, lz], i) => (
        <group key={i} position={[lx, 0.6, lz]}>
          {[0, 1, 2, 3, 4].map((k) => (
            <mesh key={k} position={[Math.cos(k) * 0.04, 0.04, Math.sin(k) * 0.04]} rotation={[Math.PI / 2.6, 0, k]}>
              <coneGeometry args={[0.07, 0.12, 5]} />
              <meshLambertMaterial color={k % 2 ? PALETA.follaje : PALETA.follajeClaro} flatShading />
            </mesh>
          ))}
        </group>
      ))}
      {/* tubo de ida (del estanque a la cama) y retorno (de la cama al estanque) */}
      <mesh position={[-1.0, 0.35, 0.5]} rotation={[0.4, 0.5, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.3, 6]} />
        <meshLambertMaterial color={PALETA.lamina} />
      </mesh>
    </group>
  );
}

/* El montón de LODO→ABONO junto al estanque, con carretilla, y el plátano/café
   que lo recibe (integración piscícola-agrícola). */
function LodosAbono() {
  const yA = altura(ABONERA.x, ABONERA.z);
  const yP = altura(PLATANAL.x, PLATANAL.z);
  return (
    <group>
      {/* montón de lodo oscuro (rico en fósforo y nitrógeno) */}
      <group position={[ABONERA.x, yA, ABONERA.z]}>
        <mesh position={[0, 0.16, 0]} scale={[1, 0.6, 1]}>
          <dodecahedronGeometry args={[0.34, 0]} />
          <meshLambertMaterial color="#4a3826" flatShading />
        </mesh>
        {/* pala */}
        <mesh position={[0.3, 0.22, 0.1]} rotation={[0, 0, -0.6]}>
          <cylinderGeometry args={[0.02, 0.02, 0.7, 5]} />
          <meshLambertMaterial color={PALETA.madera} />
        </mesh>
      </group>
      {/* plátano + café que reciben el abono */}
      <group position={[PLATANAL.x, yP, PLATANAL.z]}>
        {/* platanera: pseudotallo + hojas grandes */}
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.1, 0.14, 1.1, 8]} />
          <meshLambertMaterial color={PALETA.follajeOscuro} />
        </mesh>
        {[0, 1, 2, 3, 4].map((k) => (
          <mesh key={k} position={[0, 1.05, 0]} rotation={[0.5, (k / 5) * Math.PI * 2, 0]}>
            <coneGeometry args={[0.16, 1.0, 4]} />
            <meshLambertMaterial color={k % 2 ? PALETA.follaje : PALETA.follajeClaro} flatShading />
          </mesh>
        ))}
        {/* cafetico al lado */}
        <group position={[0.9, 0, 0.4]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.6, 6]} />
            <meshLambertMaterial color={PALETA.madera} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <sphereGeometry args={[0.3, 7, 6]} />
            <meshLambertMaterial color={PALETA.follajeOscuro} flatShading />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* Un par de PATOS en la orilla del estanque cálido (integración pecuaria: sus
   heces fertilizan el estanque — alimento natural, menos concentrado). */
function Patos() {
  const base = [
    [ESTANQUE_CALIDO.cx - 1.7, ESTANQUE_CALIDO.cz - 1.4, 0.4],
    [ESTANQUE_CALIDO.cx - 2.1, ESTANQUE_CALIDO.cz - 0.9, -0.6],
  ];
  return (
    <group>
      {base.map(([x, z, rot], i) => {
        const y = altura(x, z);
        return (
          <group key={i} position={[x, y, z]} rotation={[0, rot, 0]}>
            <mesh position={[0, 0.12, 0]} scale={[1.4, 0.9, 1]}>
              <sphereGeometry args={[0.12, 8, 6]} />
              <meshLambertMaterial color={PALETA.cal} flatShading />
            </mesh>
            <mesh position={[0.14, 0.24, 0]}>
              <sphereGeometry args={[0.07, 7, 6]} />
              <meshLambertMaterial color={PALETA.cal} flatShading />
            </mesh>
            <mesh position={[0.22, 0.22, 0]} rotation={[0, 0, -0.3]}>
              <coneGeometry args={[0.03, 0.09, 5]} />
              <meshLambertMaterial color={PALETA.ambar} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* El sol bajo de la hora dorada, hermano del de los demás mundos. */
function SolDorado() {
  return (
    <group position={[-12, 4.8, -7.5]}>
      <mesh>
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial color="#fff2cf" transparent opacity={0.98} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[2.0, 32]} />
        <meshBasicMaterial color="#ffd98f" transparent opacity={0.36} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[3.4, 32]} />
        <meshBasicMaterial color="#f7c66b" transparent opacity={0.15} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* Rótulo sobrio (mismo lenguaje que los demás mundos). */
function Rotulo({ pos, texto, sub, distancia = 15 }) {
  return (
    <group position={pos}>
      <Html center distanceFactor={distancia} zIndexRange={[30, 10]} style={{ pointerEvents: 'none' }}>
        <div className="mpisci-rotulo" aria-hidden="true">
          <span className="mpisci-rotulo__punto" />
          <span className="mpisci-rotulo__txt">
            {texto}
            {sub ? <em className="mpisci-rotulo__sub">{sub}</em> : null}
          </span>
        </div>
      </Html>
    </group>
  );
}

/* ── Las ESTACIONES del recorrido (datos, no UI; en «usted», sin gamificación) ── */
const ESTACIONES = [
  {
    id: 'estanque-frio',
    titulo: 'Estanque frío: trucha',
    frase: 'Agua fría y corriente, bien oxigenada (arriba de 1.800 m). La trucha arcoíris crece a 12–16 °C.',
    mira: () => [ESTANQUE_FRIO.cx, ESTANQUE_FRIO.ySup, ESTANQUE_FRIO.cz],
    cam: () => [ESTANQUE_FRIO.cx + 2.6, ESTANQUE_FRIO.ySup + 2.4, ESTANQUE_FRIO.cz + 3.4],
  },
  {
    id: 'estanque-calido',
    titulo: 'Estanque cálido: mojarra y cachama',
    frase: 'En clima cálido (24–29 °C). En policultivo: 80 % mojarra, 20 % cachama.',
    mira: () => [ESTANQUE_CALIDO.cx, ESTANQUE_CALIDO.ySup, ESTANQUE_CALIDO.cz],
    cam: () => [ESTANQUE_CALIDO.cx - 0.4, ESTANQUE_CALIDO.ySup + 2.8, ESTANQUE_CALIDO.cz + 4.4],
  },
  {
    id: 'bocachico',
    titulo: 'El bocachico limpia el fondo',
    frase: 'Come los restos del fondo (detritívoro): menos concentrado, menos costo.',
    mira: () => [ESTANQUE_CALIDO.cx + 0.6, ESTANQUE_CALIDO.ySup - 0.6, ESTANQUE_CALIDO.cz + 0.4],
    cam: () => [ESTANQUE_CALIDO.cx + 1.6, ESTANQUE_CALIDO.ySup + 1.2, ESTANQUE_CALIDO.cz + 3.0],
  },
  {
    id: 'acuaponia',
    titulo: 'Acuaponía: los peces riegan la huerta',
    frase: 'El agua con abono de los peces nutre la lechuga; la planta la devuelve limpia.',
    mira: () => [HUERTA.x, altura(HUERTA.x, HUERTA.z) + 0.6, HUERTA.z],
    cam: () => [HUERTA.x - 2.4, altura(HUERTA.x, HUERTA.z) + 2.2, HUERTA.z + 2.6],
  },
  {
    id: 'lodos',
    titulo: 'El lodo del fondo es abono',
    frase: 'Rico en fósforo y nitrógeno: al plátano y al café, no al río.',
    mira: () => [ABONERA.x + 0.8, altura(ABONERA.x, ABONERA.z) + 0.3, ABONERA.z + 0.8],
    cam: () => [ABONERA.x - 1.8, altura(ABONERA.x, ABONERA.z) + 2.2, ABONERA.z + 3.0],
  },
  {
    id: 'microcuenca',
    titulo: 'El estanque guarda el agua',
    frase: 'Reservorio de la microcuenca: entra de la quebrada, se guarda y sigue al riego.',
    mira: () => [0, 1.0, -0.2],
    cam: () => [-1.0, 4.4, 6.8],
  },
];

/* RECORRIDO de cámara amortiguado; cualquier gesto lo suelta. */
function RecorridoCamara({ controles, estacion, onSoltar }) {
  const meta = useMemo(() => {
    if (!estacion) return null;
    return { cam: new THREE.Vector3(...estacion.cam()), mira: new THREE.Vector3(...estacion.mira()) };
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

/* ── El diorama completo (dentro del Canvas) ─────────────────────────────── */
function DioramaPiscicultura({ perfil, tier, reducedMotion, estacion, onSoltar, controles }) {
  const geoTerreno = useMemo(
    () => construirTerreno({
      ancho: ANCHO, fondo: FONDO, seg: perfil.segmentosTerreno,
      altura, pintar: colorTerreno, plano: perfil.flatShading,
    }),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geoTerreno.dispose(), [geoTerreno]);

  const curvas = useMemo(() => ({
    cano: curvaSobreTerreno(CANO_XZ, 0.05),
    entrada: curvaSobreTerreno(ENTRADA_XZ, 0.05),
    salida: curvaSobreTerreno(SALIDA_XZ, 0.05),
  }), []);
  const geoCintas = useMemo(() => ({
    cano: construirCinta(curvas.cano, 0.34, 40),
    entrada: construirCinta(curvas.entrada, 0.3, 26),
    salida: construirCinta(curvas.salida, 0.3, 26),
  }), [curvas]);
  useEffect(() => () => {
    geoCintas.cano.dispose();
    geoCintas.entrada.dispose();
    geoCintas.salida.dispose();
  }, [geoCintas]);

  // Cardúmenes por piso térmico (presupuesto por tier).
  const cardumenes = useMemo(() => {
    const q = tier === 'alto' ? 1 : tier === 'medio' ? 0.62 : 0.4;
    const nT = Math.max(3, Math.round(7 * q)); // truchas
    const nM = Math.max(3, Math.round(7 * q)); // mojarras (80 %)
    const nC = Math.max(1, Math.round(2 * q)); // cachamas (20 %)
    const nB = Math.max(2, Math.round(4 * q)); // bocachicos (fondo)
    return {
      trucha: repartirCardumen({
        n: nT, ...ESTANQUE_FRIO, semilla: 11,
      }),
      mojarra: repartirCardumen({
        n: nM, ...ESTANQUE_CALIDO, semilla: 22,
      }),
      cachama: repartirCardumen({
        n: nC, ...ESTANQUE_CALIDO, semilla: 33,
      }),
      bocachico: repartirCardumen({
        n: nB, ...ESTANQUE_CALIDO, fondo: 1, semilla: 44,
      }),
    };
  }, [tier]);

  const nGotas = tier === 'alto' ? 14 : tier === 'medio' ? 9 : 5;
  const nChorro = tier === 'alto' ? 10 : tier === 'medio' ? 6 : 4;

  const fFrio = ESTANQUE_FRIO;
  const entradaChorro = {
    origen: [fFrio.cx - fFrio.rx * 0.7, fFrio.ySup + 0.55, fFrio.cz - fFrio.rz * 0.5],
    destino: [fFrio.cx - fFrio.rx * 0.35, fFrio.ySup - 0.05, fFrio.cz - fFrio.rz * 0.25],
  };

  return (
    <>
      <color attach="background" args={[CIELO.fondo]} />
      {perfil.fog && <fogExp2 attach="fog" args={[CIELO.niebla, 0.02]} />}
      <hemisphereLight intensity={0.72 * CIELO.intensidad} color={CIELO.cielo} groundColor={CIELO.suelo} />
      <ambientLight intensity={0.32 * CIELO.intensidad} color={ATMOSFERA.luz} />
      <directionalLight position={[6, 9, 4]} intensity={0.95 * CIELO.intensidad} color={ATMOSFERA.luz} />
      <directionalLight position={[-5, 4, -6]} intensity={0.24} color={ATMOSFERA.relleno} />

      <SolDorado />

      <mesh geometry={geoTerreno}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* cauces de la microcuenca (quebrada → estanque frío → caño → cálido → riego) */}
      <mesh geometry={geoCintas.entrada}>
        <meshLambertMaterial color={AGUA_FRIA} transparent opacity={0.8} emissive="#2a6a86" emissiveIntensity={0.2} depthWrite={false} />
      </mesh>
      <mesh geometry={geoCintas.cano}>
        <meshLambertMaterial color={AGUA_FRIA} transparent opacity={0.8} emissive="#2a6a86" emissiveIntensity={0.2} depthWrite={false} />
      </mesh>
      <mesh geometry={geoCintas.salida}>
        <meshLambertMaterial color={AGUA_CALIDA} transparent opacity={0.78} emissive="#2a6a86" emissiveIntensity={0.18} depthWrite={false} />
      </mesh>

      {/* los dos estanques (agua + orilla de piedras) */}
      <OrillaPiedras estanque={ESTANQUE_FRIO} n={11} semilla={3} />
      <OrillaPiedras estanque={ESTANQUE_CALIDO} n={14} semilla={5} />
      <EspejoEstanque estanque={ESTANQUE_FRIO} color={AGUA_FRIA} reducedMotion={reducedMotion} />
      <EspejoEstanque estanque={ESTANQUE_CALIDO} color={AGUA_CALIDA} reducedMotion={reducedMotion} />

      {/* los peces por piso térmico */}
      <Cardumen especie="trucha" peces={cardumenes.trucha} reducedMotion={reducedMotion} />
      <Cardumen especie="mojarra" peces={cardumenes.mojarra} reducedMotion={reducedMotion} />
      <Cardumen especie="cachama" peces={cardumenes.cachama} reducedMotion={reducedMotion} />
      <Cardumen especie="bocachico" peces={cardumenes.bocachico} reducedMotion={reducedMotion} />

      {/* el agua se mueve entre estanques + el chorro que oxigena el frío */}
      <FlujoGotas curva={curvas.cano} cuantas={nGotas} velocidad={0.06} radio={0.045} color="#cfe6ea" reducedMotion={reducedMotion} />
      <FlujoGotas curva={curvas.salida} cuantas={Math.round(nGotas * 0.7)} velocidad={0.05} radio={0.04} color="#d3ecdf" reducedMotion={reducedMotion} />
      <ChorroAireacion origen={entradaChorro.origen} destino={entradaChorro.destino} cuantas={nChorro} reducedMotion={reducedMotion} />
      <TuboEntrada pos={[fFrio.cx - fFrio.rx * 0.75, fFrio.ySup + 0.3, fFrio.cz - fFrio.rz * 0.55]} />

      {/* la finca cosida al estanque */}
      <Acuaponia reducedMotion={reducedMotion} />
      <LodosAbono />
      <Patos />

      {/* rótulos sobrios */}
      <Rotulo pos={[ESTANQUE_FRIO.cx, ESTANQUE_FRIO.ySup + 1.7, ESTANQUE_FRIO.cz]} texto="Estanque frío" sub="trucha · agua corriente" distancia={14} />
      <Rotulo pos={[ESTANQUE_CALIDO.cx, ESTANQUE_CALIDO.ySup + 1.9, ESTANQUE_CALIDO.cz]} texto="Estanque cálido" sub="mojarra · cachama · bocachico" distancia={16} />
      <Rotulo pos={[HUERTA.x, altura(HUERTA.x, HUERTA.z) + 1.5, HUERTA.z]} texto="Acuaponía" sub="el agua de los peces riega" distancia={13} />
      <Rotulo pos={[ABONERA.x, altura(ABONERA.x, ABONERA.z) + 1.1, ABONERA.z]} texto="Lodo → abono" sub="fósforo y nitrógeno al cultivo" distancia={12} />
      <Rotulo pos={[SALIDA_XZ[2][0], altura(...SALIDA_XZ[2]) + 1.2, SALIDA_XZ[2][1]]} texto="Sigue al riego" sub="el caudal no se detiene" distancia={13} />

      <OrbitControls
        ref={controles}
        makeDefault
        enablePan={false}
        enableZoom
        minDistance={3.2}
        maxDistance={20}
        target={[0.3, 0.6, 0.4]}
        minPolarAngle={0.25}
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

/* Estilos del mockup (viven aquí: son de ESTA escena). */
const CSS_PISCI = `
.mpisci-root { position: relative; width: 100%; height: 100vh; min-height: 340px; overflow: hidden; background: ${CIELO.fondo}; }
.mpisci-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.7s ease; }
.mpisci-canvas--lista { opacity: 1; }
.mpisci-rotulo { display: flex; align-items: center; gap: 0.32rem; white-space: nowrap; font: 600 0.72rem/1.1 system-ui, sans-serif; color: #2c3a2e; text-shadow: 0 1px 3px rgba(244,250,238,0.9); }
.mpisci-rotulo__punto { width: 7px; height: 7px; border-radius: 50%; background: #d9f0f4; box-shadow: 0 0 0 2px rgba(44,58,46,0.5); flex: 0 0 auto; }
.mpisci-rotulo__txt { display: inline-flex; align-items: baseline; gap: 0.3rem; }
.mpisci-rotulo__sub { font-weight: 500; font-style: normal; opacity: 0.72; font-size: 0.9em; }
.mpisci-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.mpisci-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #2f3a24; text-shadow: 0 1px 4px rgba(246,251,238,0.85); font: 700 1.15rem/1.2 system-ui, sans-serif; }
.mpisci-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.78; margin-top: 0.15rem; }
.mpisci-estaciones { pointer-events: auto; align-self: flex-start; margin: 0.6rem 0.8rem; padding: 0.45rem; display: flex; flex-direction: column; gap: 0.28rem; list-style: none; border-radius: 0.8rem; background: rgba(250,252,242,0.78); backdrop-filter: blur(3px); box-shadow: 0 4px 14px rgba(52,66,40,0.16); max-width: min(76vw, 20rem); }
.mpisci-estaciones button { display: block; width: 100%; text-align: left; padding: 0.3rem 0.55rem; border: 0; border-radius: 0.55rem; background: transparent; color: #2f3a24; font: 600 0.76rem/1.2 system-ui, sans-serif; cursor: pointer; }
.mpisci-estaciones button:hover { background: rgba(63,143,176,0.14); }
.mpisci-estaciones button[aria-pressed="true"] { background: rgba(63,143,176,0.24); }
.mpisci-estaciones button small { display: none; font: 500 0.7rem/1.25 system-ui, sans-serif; opacity: 0.8; margin-top: 0.1rem; }
.mpisci-estaciones button[aria-pressed="true"] small { display: block; }
.mpisci-pie { pointer-events: none; padding: 0 1rem 0.85rem; display: flex; justify-content: center; }
.mpisci-pie p { margin: 0; max-width: 42rem; text-align: center; padding: 0.42rem 0.85rem; border-radius: 0.7rem; background: rgba(26,32,18,0.5); backdrop-filter: blur(3px); color: #f2f4e6; font: 500 0.76rem/1.4 system-ui, sans-serif; }
.mpisci-volver { pointer-events: auto; position: absolute; top: 0.8rem; right: 0.8rem; padding: 0.4rem 0.8rem; border: 0; border-radius: 999px; background: rgba(26,32,18,0.55); color: #f2f4e6; font: 600 0.78rem/1 system-ui, sans-serif; cursor: pointer; }
@media (prefers-reduced-motion: reduce) { .mpisci-canvas { transition: none; } }
/* En teléfono la lista vertical de estaciones tapaba justo los estanques (el
   sujeto). Se vuelve una FILA de chips bajo el título: mismo contenido, una
   franja de alto, y la escena queda libre. */
@media (max-width: 640px) {
  .mpisci-titulo { font-size: 1rem; }
  /* El space-between empujaba la fila al CENTRO del cuadro, o sea encima de
     los estanques: arriba lo de arriba, y el pie se ancla solo. */
  .mpisci-chrome { justify-content: flex-start; }
  .mpisci-pie { margin-top: auto; }
  .mpisci-estaciones { flex-direction: row; flex-wrap: wrap; gap: 0.25rem; max-width: calc(100vw - 1.6rem); margin: 0.5rem 0.8rem; padding: 0.3rem 0.35rem; }
  .mpisci-estaciones button { width: auto; padding: 0.28rem 0.55rem; font-size: 0.72rem; }
  .mpisci-estaciones button[aria-pressed="true"] small { display: none; }
}
`;

/**
 * MundoPiscicultura3D — el mockup montable: Canvas propio + recorrido didáctico
 * por los estanques de la finca (frío/cálido) y su integración con el agua y el
 * cultivo.
 *
 * @param {object} props
 * @param {() => void} [props.onBack]  vuelve al host (botón discreto).
 */
export default function MundoPiscicultura3D({ onBack }) {
  const [listo, setListo] = useState(false);
  const [estacionId, setEstacionId] = useState(null);
  const controles = useRef(null);
  const [{ tier, reducedMotion }] = useState(() => decidirTier());
  const perfil = perfilDeTier(tier);
  const estacion = estacionId ? ESTACIONES.find((e) => e.id === estacionId) : null;

  return (
    <section
      className="mpisci-root"
      data-tier={tier}
      aria-label="Los estanques de la finca: piscicultura por piso térmico, integrada al agua y al cultivo"
    >
      <style>{CSS_PISCI}</style>
      <Canvas
        className={`mpisci-canvas${listo ? ' mpisci-canvas--lista' : ''}`}
        dpr={tier === 'alto' ? [1, 1.5] : tier === 'medio' ? [1, 1.3] : 1}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [8.5, 6.6, 12.5], fov: 44 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <DioramaPiscicultura
          perfil={perfil}
          tier={tier}
          reducedMotion={reducedMotion}
          estacion={estacion}
          onSoltar={() => setEstacionId(null)}
          controles={controles}
        />
      </Canvas>

      <div className="mpisci-chrome">
        <h2 className="mpisci-titulo">
          Los estanques de la finca
          <small>Piscicultura por piso térmico — del agua fría a la cálida, cosida al cultivo</small>
        </h2>
        <ul className="mpisci-estaciones" aria-label="Estaciones del recorrido de los estanques">
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
        <div className="mpisci-pie">
          <p>
            El estanque no va aparte: guarda el agua de la microcuenca, cría el
            pescado de la casa y devuelve su lodo y su agua al cultivo. Cada piso
            térmico, su pez — la trucha en el frío, la mojarra y la cachama en el
            cálido.
          </p>
        </div>
      </div>
      {onBack ? (
        <button type="button" className="mpisci-volver" onClick={onBack}>
          Volver
        </button>
      ) : null}
    </section>
  );
}
