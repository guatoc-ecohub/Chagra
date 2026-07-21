/*
 * MicrofaunaSuelo — el SUELO ESTÁ VIVO: un diorama-corte con la micro-fauna que
 * casi nadie ve (lombriz, colémbolo, ácaro, la red de micorrizas y las bacterias
 * como puntos de vida). Educativo y cálido, con un guiño rubber-hose (Cuphead /
 * Miss-Minutes: cuerpos redondos, ojos grandes, squash & stretch) fusionado con
 * paleta andina (tierra ocre, hojarasca verde, oro de las hifas).
 *
 * FRUGAL POR CONTRATO (igual que las escenas del framework, DR §6): SOLO
 * `meshLambert`/`meshBasic`, sin sombras, geometría acotada, PRNG determinista
 * (mismo corte siempre). Los conteos y la resolución se degradan por `tier`; con
 * `reducedMotion` NO corre `useFrame` y el diorama queda en una pose estática
 * agradable (`frameloop="demand"`).
 *
 * ── CABLEO (dos entradas; Opus elige y cablea; este archivo NO edita nada) ──
 *   A) Suelto, por props (trae su propio <Canvas>, ideal para storybook / panel
 *      educativo):
 *        import MicrofaunaSuelo from '.../visual/mundo3d/MicrofaunaSuelo.jsx';
 *        <MicrofaunaSuelo tier={tier} reducedMotion={rm} vida={0.9} />
 *
 *   B) Incrustado en una escena existente como children de EscenaBase3D
 *      (sin Canvas propio; hereda cámara/luz/controles de la base):
 *        import { DioramaMicrofaunaSuelo } from '.../MicrofaunaSuelo.jsx';
 *        <EscenaBase3D {...props}><DioramaMicrofaunaSuelo tier reducedMotion /></EscenaBase3D>
 *
 * Props: { tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, vida?: 0..1,
 *          mostrarNombres?: boolean, subtitulo?: string, className? }
 *   `vida` (0..1) = qué tan poblado está el corte (en producción lo alimentaría
 *   el score de salud del suelo, como el `params.vida` del arquetipo cutaway).
 */
import { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { NEUTROS, TIERRAS, VERDES } from './paleta/paletaMadre.js';

import './MicrofaunaSuelo.css';

/* ── paleta andina + rubber-hose ─────────────────────────────────────────── */
const PAL = {
  hojarasca: VERDES.paramoMusgoClaro,
  litterAlt: '#9aa64f',
  sueloNegro: TIERRAS.turba,
  subsuelo: TIERRAS.siembra,
  subsueloAlt: '#8f6a44',
  raiz: '#c9a86a',
  brote: '#6f9a45',
  lombriz: '#e39a86',
  lombrizAlt: '#d6836d',
  colembolo: '#9a86e0',
  colemboloVientre: '#efeaff',
  acaro: '#c1533c',
  acaroPata: '#3a2418',
  hifa: '#f2ece0',
  hifaOro: '#ffd27a',
  nodo: '#ffe6a8',
  ojoBlanco: NEUTROS.hueso,
  ojoPupila: NEUTROS.tinta,
};

/* frente del bloque (cara cortada): la vida se pega/protruye aquí para leerse. */
const FRENTE = 1.06;
const ANCHO = 6.8;
const PROF = 2.8;

/* PRNG determinista (mismo corte siempre, sin azar por frame). */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function clamp01(n) {
  return Math.max(0, Math.min(1, typeof n === 'number' ? n : 0.85));
}

/* presupuesto de bichos/partículas por tier (equipo humilde → menos vida). */
const PRESUPUESTO_TIER = {
  alto: { lombrices: 2, colembolos: 3, acaros: 3, segLombriz: 12, bacterias: 150, hifaDirs: 3, hifaProf: 3 },
  medio: { lombrices: 2, colembolos: 2, acaros: 2, segLombriz: 10, bacterias: 80, hifaDirs: 2, hifaProf: 3 },
  bajo: { lombrices: 1, colembolos: 1, acaros: 1, segLombriz: 8, bacterias: 34, hifaDirs: 1, hifaProf: 2 },
};

function presupuesto(tier, vida) {
  const b = PRESUPUESTO_TIER[tier] || PRESUPUESTO_TIER.alto;
  const k = 0.4 + 0.6 * clamp01(vida); // menos vida → corte más pelado
  return {
    ...b,
    bacterias: Math.max(10, Math.round(b.bacterias * k)),
    lombrices: Math.max(1, Math.round(b.lombrices * (0.5 + 0.5 * k))),
    colembolos: Math.max(0, Math.round(b.colembolos * k)),
    acaros: Math.max(0, Math.round(b.acaros * k)),
  };
}

/* ── ojo rubber-hose (blanco grande + pupila oscura mirando al frente) ─────── */
function Ojo({ pos = [0, 0, 0], size = 0.05 }) {
  return (
    <group position={/** @type {[number, number, number]} */ (pos)}>
      <mesh>
        <sphereGeometry args={[size, 10, 8]} />
        <meshBasicMaterial color={PAL.ojoBlanco} />
      </mesh>
      <mesh position={[0, 0, size * 0.72]}>
        <sphereGeometry args={[size * 0.46, 8, 6]} />
        <meshBasicMaterial color={PAL.ojoPupila} />
      </mesh>
    </group>
  );
}

function BloqueSuelo() {
  const capas = [
    { y: 0.86, h: 0.28, color: PAL.hojarasca },
    { y: 0.28, h: 0.92, color: PAL.sueloNegro },
    { y: -0.72, h: 1.08, color: PAL.subsuelo },
  ];
  return (
    <group>
      {capas.map((capa, i) => (
        <mesh key={i} position={[0, capa.y, -0.25]}>
          <boxGeometry args={[ANCHO, capa.h, PROF]} />
          <meshLambertMaterial color={capa.color} flatShading />
        </mesh>
      ))}
      {[-2.45, -1.1, 0.2, 1.55, 2.7].map((x, i) => (
        <mesh key={x} position={[x, 0.36, FRENTE - 0.42]} rotation={[0, 0, (i - 2) * 0.11]}>
          <cylinderGeometry args={[0.022, 0.06, 1.18 + (i % 2) * 0.32, 6]} />
          <meshLambertMaterial color={PAL.raiz} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Lombriz({ base, nSeg = 14, escala = 1, fase = 0, reducedMotion }) {
  const segmentos = useRef([]);
  const puntos = useMemo(() => Array.from({ length: nSeg }, (_, i) => {
    const u = i / (nSeg - 1);
    return {
      x: -0.78 + u * 1.56,
      y: Math.sin(u * Math.PI * 1.35) * 0.14,
      r: 0.075 * (0.64 + Math.sin(u * Math.PI) * 0.55),
      clitelo: u > 0.35 && u < 0.49,
    };
  }), [nSeg]);
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime * 2.1 + fase;
    segmentos.current.forEach((segmento, i) => {
      if (!segmento) return;
      const ola = 1 + Math.sin(t - i * 0.48) * 0.12;
      segmento.scale.set(ola, 2 - ola, 2 - ola);
      segmento.position.y = puntos[i].y + Math.sin(t * 0.5 - i * 0.4) * 0.02;
    });
  });
  return (
    <group position={base} scale={escala} rotation={[0, 0.16, 0]}>
      {puntos.map((punto, i) => (
        <group key={i} ref={(el) => { segmentos.current[i] = el; }} position={[punto.x, punto.y, 0]}>
          <mesh>
            <sphereGeometry args={[punto.r, 10, 8]} />
            <meshLambertMaterial color={punto.clitelo ? '#f3cdbf' : PAL.lombriz} flatShading />
          </mesh>
          {i === 0 && <><Ojo pos={[0.03, 0.03, punto.r * 0.85]} size={0.022} /><Ojo pos={[-0.03, 0.03, punto.r * 0.85]} size={0.022} /></>}
        </group>
      ))}
    </group>
  );
}

function Colembolo({ base, escala = 1, fase = 0, reducedMotion }) {
  const cuerpo = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !cuerpo.current) return;
    const t = state.clock.elapsedTime * 1.35 + fase;
    cuerpo.current.position.y = base[1] + Math.max(0, Math.sin(t)) ** 4 * 0.18;
    cuerpo.current.rotation.z = Math.sin(t * 0.7) * 0.08;
  });
  return (
    <group ref={cuerpo} position={base} scale={escala}>
      <mesh scale={[1.3, 0.92, 1]}><sphereGeometry args={[0.14, 14, 12]} /><meshLambertMaterial color={PAL.colembolo} flatShading /></mesh>
      <mesh position={[0, -0.05, 0.1]} scale={[0.9, 0.62, 0.7]}><sphereGeometry args={[0.11, 10, 8]} /><meshLambertMaterial color={PAL.colemboloVientre} flatShading /></mesh>
      <Ojo pos={[0.065, 0.055, 0.13]} size={0.045} /><Ojo pos={[-0.065, 0.055, 0.13]} size={0.045} />
      {[0.07, -0.07].map((x) => <mesh key={x} position={[x, 0.16, 0.06]} rotation={[0.4, 0, x > 0 ? 0.5 : -0.5]}><cylinderGeometry args={[0.007, 0.007, 0.18, 4]} /><meshBasicMaterial color={PAL.colemboloVientre} /></mesh>)}
      <mesh position={[0, -0.1, -0.12]} rotation={[0.7, 0, 0]}><cylinderGeometry args={[0.007, 0.013, 0.2, 5]} /><meshBasicMaterial color={PAL.colembolo} /></mesh>
    </group>
  );
}

/* ── ÁCARO: cuerpo redondo + 8 patas, camina lento y las patas ondulan ─────── */
function Acaro({ base = [0, 0.75, 0], escala = 1, fase = 0, reducedMotion }) {
  const cuerpo = useRef(null);
  const patas = useRef([]);
  const patasDef = useMemo(
    () => Array.from({ length: 8 }, (_, i) => {
      const lado = i < 4 ? 1 : -1;
      const idx = i % 4;
      const ang = (idx - 1.5) * 0.5;
      return { key: i, lado, ang };
    }),
    [],
  );
  useFrame((state) => {
    if (reducedMotion || !cuerpo.current) return;
    const a = state.clock.elapsedTime * 0.45 + fase;
    cuerpo.current.position.x = base[0] + Math.cos(a) * 0.32;
    cuerpo.current.position.z = base[2] + Math.sin(a * 1.3) * 0.05;
    cuerpo.current.position.y = base[1] + Math.abs(Math.sin(a * 3)) * 0.015;
    cuerpo.current.rotation.y = a + Math.PI / 2;
    for (let i = 0; i < patas.current.length; i++) {
      const p = patas.current[i];
      if (p) p.rotation.x = Math.sin(state.clock.elapsedTime * 7 + i * 1.1) * 0.3;
    }
  });
  return (
    <group ref={cuerpo} position={/** @type {[number, number, number]} */ (base)} scale={escala}>
      <mesh>
        <sphereGeometry args={[0.11, 12, 10]} />
        <meshLambertMaterial color={PAL.acaro} flatShading />
      </mesh>
      <mesh position={[0, 0.02, 0.09]} scale={[0.7, 0.6, 0.7]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshLambertMaterial color="#a3402d" flatShading />
      </mesh>
      <Ojo pos={[0.04, 0.05, 0.1]} size={0.025} />
      <Ojo pos={[-0.04, 0.05, 0.1]} size={0.025} />
      {patasDef.map((pt, i) => (
        <group key={pt.key} position={[0.09 * pt.lado, -0.02, 0]} rotation={[0, 0, pt.ang * pt.lado]}>
          <group ref={(el) => { patas.current[i] = el; }}>
            <mesh position={[0.08 * pt.lado, -0.02, 0]} rotation={[0, 0, pt.lado * 0.6]}>
              <cylinderGeometry args={[0.008, 0.006, 0.16, 4]} />
              <meshBasicMaterial color={PAL.acaroPata} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/* ── MICORRIZAS: la red de hifas (el "internet del bosque") con pulso dorado ── */
function generarHifas(seed, dirsN, maxDepth) {
  const r = rng(seed);
  const up = new THREE.Vector3(0, 1, 0);
  const segs = [];
  const nodos = [];
  function ramificar(origen, dir, largo, depth) {
    const d = dir.clone().normalize();
    const fin = origen.clone().addScaledVector(d, largo);
    const q = new THREE.Quaternion().setFromUnitVectors(up, d);
    const mid = origen.clone().add(fin).multiplyScalar(0.5);
    segs.push({
      pos: [mid.x, mid.y, mid.z],
      quat: [q.x, q.y, q.z, q.w],
      largo,
      depth,
    });
    nodos.push({ pos: [fin.x, fin.y, fin.z], depth });
    if (depth >= maxDepth) return;
    const hijos = depth < 1 ? 2 : r() < 0.72 ? 2 : 1;
    for (let k = 0; k < hijos; k++) {
      const nd = d
        .clone()
        .applyAxisAngle(new THREE.Vector3(0, 0, 1), (r() - 0.5) * 1.5)
        .applyAxisAngle(new THREE.Vector3(1, 0, 0), (r() - 0.5) * 0.9);
      ramificar(fin, nd, largo * (0.68 + r() * 0.16), depth + 1);
    }
  }
  const hub = new THREE.Vector3((r() - 0.5) * 1.0, -0.35, FRENTE - 0.55);
  const arranques = [
    new THREE.Vector3(-0.85, -0.15, 0.05),
    new THREE.Vector3(0.9, -0.1, 0.05),
    new THREE.Vector3(0.05, -0.9, 0.15),
  ].slice(0, dirsN);
  arranques.forEach((a) => ramificar(hub, a, 0.6, 0));
  return { segs, nodos, hub: [hub.x, hub.y, hub.z] };
}

function Hifas({ seed = 17, dirsN = 3, maxDepth = 3, reducedMotion }) {
  const { segs, nodos, hub } = useMemo(() => generarHifas(seed, dirsN, maxDepth), [seed, dirsN, maxDepth]);
  const mats = useRef([]);
  const nodoRefs = useRef([]);
  const colBase = useMemo(() => new THREE.Color(PAL.hifa), []);
  const colOro = useMemo(() => new THREE.Color(PAL.hifaOro), []);
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime * 2;
    for (let i = 0; i < mats.current.length; i++) {
      const m = mats.current[i];
      if (!m) continue;
      const glow = 0.5 + 0.5 * Math.sin(t - segs[i].depth * 0.9 - i * 0.05);
      m.color.copy(colBase).lerp(colOro, glow * 0.85);
    }
    for (let i = 0; i < nodoRefs.current.length; i++) {
      const n = nodoRefs.current[i];
      if (!n) continue;
      const tw = 0.7 + 0.3 * Math.sin(t * 1.5 - nodos[i].depth);
      n.scale.setScalar(tw);
    }
  });
  return (
    <group>
      {segs.map((s, i) => (
        <mesh key={`h-${i}`} position={s.pos} quaternion={s.quat} scale={[1, s.largo, 1]}>
          <cylinderGeometry args={[0.012, 0.012, 1, 4]} />
          <meshBasicMaterial ref={(el) => { mats.current[i] = el; }} color={PAL.hifa} />
        </mesh>
      ))}
      {nodos.map((n, i) => (
        <mesh
          key={`n-${i}`}
          position={n.pos}
          ref={(el) => { nodoRefs.current[i] = el; }}
        >
          <sphereGeometry args={[0.026, 8, 8]} />
          <meshBasicMaterial color={PAL.nodo} />
        </mesh>
      ))}
      {/* el hub: nudo micelial más brillante */}
      <mesh position={/** @type {[number, number, number]} */ (hub)}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshBasicMaterial color={PAL.hifaOro} />
      </mesh>
    </group>
  );
}

/* ── BACTERIAS: puntos de vida (instancedMesh) que titilan y derivan ───────── */
function Bacterias({ cantidad = 120, hub = [0, -0.35, 0.5], reducedMotion }) {
  const ref = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const datos = useMemo(() => {
    const r = rng(211);
    const tonos = ['#ffd98a', '#a8e6a0', '#ffb3a0', '#f4e2a0'];
    return Array.from({ length: cantidad }, () => {
      const cerca = r() < 0.55; // muchas viven pegadas a la red de hifas
      const base = cerca
        ? [hub[0] + (r() - 0.5) * 1.8, hub[1] + (r() - 0.5) * 1.4 + 0.3, FRENTE - 0.15 - r() * 0.5]
        : [(r() - 0.5) * (ANCHO - 0.8), 0.7 - r() * 1.8, FRENTE - 0.1 - r() * 0.6];
      return {
        base,
        r: 0.012 + r() * 0.02,
        fase: r() * Math.PI * 2,
        vel: 0.6 + r() * 0.9,
        color: new THREE.Color(tonos[Math.floor(r() * tonos.length)]),
      };
    });
  }, [cantidad, hub]);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    datos.forEach((d, i) => {
      dummy.position.set(d.base[0], d.base[1], d.base[2]);
      dummy.scale.setScalar(d.r);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, d.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [datos, dummy]);

  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < datos.length; i++) {
      const d = datos[i];
      const tw = 0.55 + 0.45 * Math.sin(t * 3 * d.vel + d.fase);
      dummy.position.set(
        d.base[0] + Math.sin(t * 0.4 * d.vel + d.fase) * 0.03,
        d.base[1] + Math.cos(t * 0.35 * d.vel + d.fase) * 0.03,
        d.base[2],
      );
      dummy.scale.setScalar(d.r * (0.6 + tw));
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cantidad]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/* ── etiqueta educativa (píldora billboard) ───────────────────────────────── */
function Nombre({ pos, emoji, texto }) {
  return (
    <Html position={pos} center distanceFactor={9} zIndexRange={[20, 0]}>
      <span className="microfauna-nombre">
        <span className="microfauna-nombre__emoji" aria-hidden="true">{emoji}</span>
        {texto}
      </span>
    </Html>
  );
}

/* ── EL DIORAMA (grupo r3f puro; entrada B: children de una escena base) ───── */
export function DioramaMicrofaunaSuelo({
  tier = 'alto',
  reducedMotion = false,
  vida = 0.85,
  mostrarNombres = true,
}) {
  const P = useMemo(() => presupuesto(tier, vida), [tier, vida]);

  const lombrices = useMemo(
    () => Array.from({ length: P.lombrices }, (_, i) => ({
      key: i,
      base: [-2.1 + i * 4.05, 0.2 - i * 0.58, FRENTE + 0.02],
      escala: 1.12 - i * 0.08,
      fase: i * 1.9,
    })),
    [P.lombrices],
  );
  const colembolos = useMemo(
    () => Array.from({ length: P.colembolos }, (_, i) => ({
      key: i,
      base: [-2.55 + i * 2.5, 0.94, FRENTE + 0.08],
      escala: 1.08 + (i % 2) * 0.08,
      fase: i * 1.1,
    })),
    [P.colembolos],
  );
  const acaros = useMemo(
    () => Array.from({ length: P.acaros }, (_, i) => ({
      key: i,
      base: [-1.25 + i * 1.9, 0.94 - (i % 2) * 0.13, FRENTE + 0.02],
      escala: 1.14 + (i % 2) * 0.1,
      fase: i * 2.3,
    })),
    [P.acaros],
  );

  return (
    <group position={[0, 0.1, 0]}>
      <BloqueSuelo />
      <Hifas seed={17} dirsN={P.hifaDirs} maxDepth={P.hifaProf} reducedMotion={reducedMotion} />
      <Bacterias
        cantidad={P.bacterias}
        hub={/** @type {const} */ ([0, -0.35, FRENTE - 0.55])}
        reducedMotion={reducedMotion}
      />
      {lombrices.map((l) => (
        <Lombriz
          key={`lom-${l.key}`}
          base={l.base}
          nSeg={P.segLombriz}
          escala={l.escala}
          fase={l.fase}
          reducedMotion={reducedMotion}
        />
      ))}
      {colembolos.map((c) => (
        <Colembolo key={`col-${c.key}`} base={c.base} escala={c.escala} fase={c.fase} reducedMotion={reducedMotion} />
      ))}
      {acaros.map((a) => (
        <Acaro key={`aca-${a.key}`} base={a.base} escala={a.escala} fase={a.fase} reducedMotion={reducedMotion} />
      ))}

      {mostrarNombres && (
        <>
          {lombrices[0] && (
            <Nombre pos={[lombrices[0].base[0], lombrices[0].base[1] + 0.45, FRENTE + 0.3]} emoji="🪱" texto="Lombriz" />
          )}
          {colembolos[0] && (
            <Nombre pos={[colembolos[0].base[0] - 0.1, colembolos[0].base[1] + 0.5, FRENTE + 0.3]} emoji="✨" texto="Colémbolo" />
          )}
          {acaros[0] && (
            <Nombre pos={[acaros[0].base[0] + 0.5, acaros[0].base[1] + 0.35, FRENTE + 0.3]} emoji="🕷️" texto="Ácaro" />
          )}
          <Nombre pos={[-1.5, -0.5, FRENTE - 0.2]} emoji="🍄" texto="Micorrizas" />
          <Nombre pos={[1.4, -0.95, FRENTE - 0.2]} emoji="🦠" texto="Bacterias" />
        </>
      )}
    </group>
  );
}

/* ── COMPONENTE SUELTO (entrada A: trae su propio Canvas + luz + controles) ── */
export default function MicrofaunaSuelo({
  tier = 'alto',
  reducedMotion = false,
  vida = 0.85,
  mostrarNombres = true,
  subtitulo = 'El suelo está vivo',
  className = '',
}) {
  /** @type {[number, number]} */
  const dpr = tier === 'bajo' ? [1, 1] : [1, 1.5];
  return (
    <div className={`microfauna ${className}`.trim()}>
      <Canvas
        className="microfauna__canvas"
        dpr={dpr}
        gl={{ antialias: tier !== 'bajo', powerPreference: 'high-performance' }}
        camera={{ position: [3.4, 2.3, 5.4], fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
      >
        <color attach="background" args={['#efe2c6']} />
        <hemisphereLight intensity={1.0} color="#fbeecb" groundColor="#8a6a48" />
        <ambientLight intensity={0.45} color="#fff2d6" />
        <directionalLight position={[3, 5, 4]} intensity={0.5} color="#fff0cf" />

        <DioramaMicrofaunaSuelo
          tier={tier}
          reducedMotion={reducedMotion}
          vida={vida}
          mostrarNombres={mostrarNombres}
        />

        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          target={[0, 0.1, 0.4]}
          minDistance={3.6}
          maxDistance={9}
          minPolarAngle={0.4}
          maxPolarAngle={1.4}
          enableDamping
          dampingFactor={0.09}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.22}
        />
        <AdaptiveDpr pixelated />
      </Canvas>
      {subtitulo && <figcaption className="microfauna-caption">{subtitulo}</figcaption>}
    </div>
  );
}
