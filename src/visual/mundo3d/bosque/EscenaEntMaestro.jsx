/*
 * EscenaEntMaestro — EL ENT MAESTRO QUE ENSEÑA EL SUELO VIVO.
 *
 * La experiencia que UNE los dos mundos que ya viven en Chagra: el ENT de la
 * queñua (Bosque Vivo) y la RED MICORRÍZICA del subsuelo (Suelo Vivo). Aquí no
 * están separados: el Ent, con su BRAZO, abre y SEÑALA la tierra, y el suelo
 * aparece CORTADO en capas —una vitrina— para que el guardián vaya ENSEÑANDO
 * cada una: hojarasca → humus → zona de raíces → red micorrízica (el wood-wide
 * web) → roca madre. Una lección viaja de arriba abajo (la capa que el Ent
 * "explica" se enciende y su nombre resalta), y en la banda de las micorrizas
 * corre la red bioluminiscente con sus pulsos de nutrientes (reusa el módulo de
 * micorrizas — no se rehace, se ENCHUFA aquí).
 *
 * Todo procedural (cero CDN/imágenes). Tier-safe: 'alto' pleno (red densa,
 * pulsos, brazo, sombras); 'medio' frugal; 'bajo' mínimo digno. Con
 * `reducedMotion` monta QUIETO (frameloop a demanda; la lección se congela en la
 * primera capa, todas rotuladas). Importa three/@react-three → montar SOLO
 * perezosa (lazy) desde el host.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Html } from '@react-three/drei';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import EntQuenua from './EntQuenua.jsx';
import {
  PALETA,
  construirRed,
  geometriaRed,
  curvaHilo,
  pulsosDeRed,
} from '../micorrizas/micorrizas.geom.js';

/* CSS del lienzo + de los rótulos de cada capa (self-contained). */
const CSS = `
.entm-canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.8s ease; }
.entm-canvas--lista { opacity: 1; }
.entm-rot { transform: translate(-6%, -50%); pointer-events: none; }
.entm-rot__caja { min-width: 8.5rem; max-width: 12.5rem; padding: 0.34rem 0.6rem; border-radius: 0.7rem; background: rgba(14, 12, 9, 0.62); box-shadow: inset 0 0 0 1px rgba(180, 200, 150, 0.28); color: #e9efdd; transition: background 0.4s ease, box-shadow 0.4s ease, transform 0.4s ease; }
.entm-rot__caja--activa { background: rgba(26, 40, 26, 0.9); box-shadow: inset 0 0 0 1px rgba(126, 240, 200, 0.8), 0 0 16px 2px rgba(55, 214, 176, 0.35); transform: scale(1.06); }
.entm-rot__n { display: block; font: 700 0.82rem/1.15 system-ui, sans-serif; }
.entm-rot__h { display: block; margin-top: 0.12rem; font: 500 0.66rem/1.2 system-ui, sans-serif; color: #c3ccb4; }
.entm-rot__caja--activa .entm-rot__h { color: #d9ffef; }
@media (prefers-reduced-motion: reduce) { .entm-canvas { transition: none; } }
`;

/* Cielo del páramo (mismo aire que el Bosque Vivo, para que el Ent se lea igual). */
const PARAMO = { fondo: '#c3cfce', niebla: '#c9d3d1', musgo: '#5c6844' };

/* Geometría del CORTE: ancho/prof del bloque de suelo (la vitrina de tierra). */
const ANCHO_CUT = 3.2;
const PROF_CUT = 1.7;
const CARA = PROF_CUT / 2; // el plano frontal expuesto del corte

/* Dónde se planta la vitrina de suelo, al lado del Ent (donde apunta su mano). */
const CORTE_POS = [2.5, 0, 1.9];

/*
 * LAS CAPAS del suelo, de arriba abajo — la lección. `alto` en metros-escena,
 * `color` de la tierra, `nombre` + `hint` para el rótulo que el Ent enseña.
 * (Grounded: hojarasca que abriga, humus vivo, zona de raíces, la red de hongos
 * que reparte, y la roca madre de donde nace la tierra.)
 */
const CAPAS = [
  { id: 'hojarasca', nombre: 'Hojarasca', alto: 0.42, color: '#6e4a2a', hint: 'Las hojas caídas que abrigan y alimentan el suelo.' },
  { id: 'humus', nombre: 'Humus', alto: 0.95, color: '#241611', hint: 'Tierra negra viva: lombrices y bacterias hacen el alimento.' },
  { id: 'raices', nombre: 'Zona de raíces', alto: 1.15, color: '#3a2618', hint: 'Aquí las matas beben agua y minerales.' },
  { id: 'micorrizas', nombre: 'Red micorrízica', alto: 1.35, color: '#140f0c', hint: 'El internet de hongos: reparte comida entre las plantas.' },
  { id: 'roca', nombre: 'Roca madre', alto: 0.92, color: '#4b4a52', hint: 'La piedra de donde, poco a poco, nace la tierra.' },
];

const DUR_CAPA = 3.6; // segundos que el Ent "enseña" cada capa

/* PRNG determinista local (mismo corte siempre). */
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* Alturas acumuladas: y del centro de cada capa (la cima del corte en y=0). */
function centrosCapas() {
  let top = 0;
  return CAPAS.map((c) => {
    const cy = top - c.alto / 2;
    top -= c.alto;
    return { ...c, cy, top: top + c.alto, bottom: top };
  });
}

/* ── La RED de micelio confinada a la BANDA de la capa "micorrizas": reusa la
      maquinaria del módulo de micorrizas (construirRed + geometriaRed + pulsos),
      solo que sembrada dentro de esta franja del corte. ── */
function redDeBanda(alto, tier) {
  const r = rng(41);
  const plantas = ['maiz', 'frijol', 'ahuyama'];
  const puntasRaiz = [];
  const libres = [];
  const nZ = CARA - 0.15;
  // puntas de raíz entrando por lo alto de la banda (con planta → hacen PUENTES)
  for (let i = 0; i < 6; i++) {
    puntasRaiz.push({
      pos: new THREE.Vector3((r() - 0.5) * (ANCHO_CUT - 0.7), alto / 2 - 0.12 - r() * 0.3, 0.1 + r() * nZ),
      tipo: 'raiz', planta: plantas[i % 3], arbol: false,
    });
  }
  const nLibres = tier === 'alto' ? 16 : tier === 'medio' ? 10 : 6;
  for (let i = 0; i < nLibres; i++) {
    const espora = r() > 0.82;
    libres.push({
      pos: new THREE.Vector3((r() - 0.5) * (ANCHO_CUT - 0.45), (r() - 0.5) * (alto - 0.3), 0.05 + r() * nZ),
      tipo: espora ? 'espora' : 'nodo', planta: null,
    });
  }
  const { nodos, hilos } = construirRed(puntasRaiz, libres, { vecinos: tier === 'alto' ? 2 : 1 }, 41);
  const geo = geometriaRed(hilos, { tubK: tier === 'alto' ? 14 : 10, tubM: 5, radioHilo: 0.02 });
  const curvas = hilos.map(curvaHilo);
  const pulsos = pulsosDeRed(hilos, tier === 'alto' ? 70 : tier === 'medio' ? 30 : 0, 53);
  return { nodos, geo, curvas, pulsos };
}

/* La malla de la red (un draw-call, aditiva, respira). */
function RedMicelio({ geo, reducedMotion }) {
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.92,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useFrame((st) => {
    if (reducedMotion) return;
    mat.opacity = 0.84 + Math.sin(st.clock.elapsedTime * 0.9) * 0.1;
  });
  if (!geo) return null;
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

/* Los NODOS del micelio (arbúsculos/nodos/esporas), instanciados. */
function NodosRed({ nodos }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.OctahedronGeometry(0.055, 0), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let i = 0; i < nodos.length; i++) {
      const n = nodos[i];
      const esc = n.tipo === 'raiz' ? 1.5 : n.tipo === 'espora' ? 1.25 : 0.9;
      p.copy(n.pos); s.setScalar(esc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      const col = n.tipo === 'raiz' ? PALETA.arbusculo : n.tipo === 'espora' ? PALETA.espora : PALETA.nodo;
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [nodos]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!nodos.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, nodos.length]} frustumCulled={false} />;
}

/* Los PULSOS de nutrientes que corren por los hilos (instanciados). */
function Pulsos({ curvas, pulsos, reducedMotion }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(0.05, 7, 6), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3() }), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < pulsos.length; i++) mesh.setColorAt(i, pulsos[i].color);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [pulsos]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  const escribir = (time) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { m, q, s, p } = tmp;
    for (let i = 0; i < pulsos.length; i++) {
      const pu = pulsos[i];
      const cur = curvas[pu.hilo];
      if (!cur) { s.setScalar(0); m.compose(p.set(0, 0, 0), q, s); mesh.setMatrixAt(i, m); continue; }
      let t = reducedMotion ? (pu.t0 * 0.5 + 0.25) : (pu.t0 + pu.dir * time * pu.vel);
      t -= Math.floor(t);
      cur.getPoint(t, p);
      const brote = Math.sin(t * Math.PI);
      s.setScalar(pu.tam * (0.35 + brote * 0.85));
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => { escribir(0); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulsos, curvas]);
  useFrame((st) => { if (!reducedMotion) escribir(st.clock.elapsedTime); });
  if (!pulsos.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, pulsos.length]} frustumCulled={false} />;
}

/* Un grumo de tierra low-poly que rompe la cara plana del corte. */
function Terron({ pos, r, color }) {
  return (
    <mesh position={pos}>
      <sphereGeometry args={[r, 5, 4]} />
      <meshLambertMaterial color={color} flatShading />
    </mesh>
  );
}

/* Una raíz que baja por la cara del corte (cono principal + raicillas). */
function Raiz({ pos, largo }) {
  return (
    <group position={pos}>
      <mesh position={[0, -largo / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.05, largo, 6]} />
        <meshLambertMaterial color="#c9a86a" flatShading />
      </mesh>
      <mesh position={[0.07, -largo * 0.5, 0]} rotation={[Math.PI, 0, -0.7]}>
        <coneGeometry args={[0.022, largo * 0.5, 5]} />
        <meshLambertMaterial color="#bd9a5a" flatShading />
      </mesh>
    </group>
  );
}

/* El detalle propio de cada capa (la vida que la hace legible). */
function DetalleCapa({ capa, alto, red, reducedMotion }) {
  const r = useMemo(() => rng(capa.id.length * 131 + 7), [capa.id]);
  // grumos en la cara del corte (siempre; textura de tierra)
  const terrones = useMemo(() => {
    const n = 3 + Math.round(alto * 2);
    return Array.from({ length: n }, (_, i) => ({
      key: i,
      pos: [(r() - 0.5) * (ANCHO_CUT - 0.5), (r() - 0.5) * alto * 0.7, CARA - 0.04],
      rr: 0.08 + r() * 0.08,
    }));
  }, [alto, r]);

  if (capa.id === 'hojarasca') {
    // hojitas caídas sobre la cara (flecos ocres)
    const hojas = Array.from({ length: 10 }, (_, i) => ({
      key: i, pos: [(r() - 0.5) * (ANCHO_CUT - 0.4), (r() - 0.5) * alto * 0.6, CARA - 0.02], giro: r() * Math.PI,
    }));
    return (
      <group>
        {terrones.map((t) => <Terron key={t.key} pos={t.pos} r={t.rr} color={capa.color} />)}
        {hojas.map((h) => (
          <mesh key={h.key} position={/** @type {[number, number, number]} */ (h.pos)} rotation={[-Math.PI / 2, 0, h.giro]} scale={[1.4, 1, 1]}>
            <circleGeometry args={[0.08, 5]} />
            <meshLambertMaterial color={h.key % 2 ? '#8a5a2c' : '#a06a34'} side={THREE.DoubleSide} flatShading />
          </mesh>
        ))}
      </group>
    );
  }

  if (capa.id === 'humus') {
    // tierra negra grumosa + una lombriz (cápsula rosada que asoma por el corte)
    return (
      <group>
        {terrones.map((t) => <Terron key={t.key} pos={t.pos} r={t.rr} color={t.key % 2 ? '#1c120c' : capa.color} />)}
        <mesh position={[-0.4, -alto * 0.1, CARA - 0.02]} rotation={[0, 0, 0.5]}>
          <capsuleGeometry args={[0.05, 0.34, 4, 8]} />
          <meshLambertMaterial color="#c98a8f" flatShading />
        </mesh>
      </group>
    );
  }

  if (capa.id === 'raices') {
    // raíces que descienden (y siguen hacia la red, abajo)
    const raices = Array.from({ length: 5 }, (_, i) => ({
      key: i, pos: [(r() - 0.5) * (ANCHO_CUT - 0.8), alto * 0.35, CARA - 0.05 - r() * 0.1], largo: 0.5 + r() * (alto * 0.8),
    }));
    return (
      <group>
        {terrones.map((t) => <Terron key={t.key} pos={t.pos} r={t.rr} color={capa.color} />)}
        {raices.map((ra) => <Raiz key={ra.key} pos={ra.pos} largo={ra.largo} />)}
      </group>
    );
  }

  if (capa.id === 'micorrizas' && red) {
    // ¡la estrella! la red micorrízica bioluminiscente + sus pulsos
    return (
      <group>
        <RedMicelio geo={red.geo} reducedMotion={reducedMotion} />
        <NodosRed nodos={red.nodos} />
        <Pulsos curvas={red.curvas} pulsos={red.pulsos} reducedMotion={reducedMotion} />
      </group>
    );
  }

  if (capa.id === 'roca') {
    // roca madre: pedruscos facetados grises embebidos
    const rocas = Array.from({ length: 6 }, (_, i) => ({
      key: i, pos: [(r() - 0.5) * (ANCHO_CUT - 0.4), (r() - 0.5) * alto * 0.7, CARA - 0.05], esc: 0.14 + r() * 0.16,
    }));
    return (
      <group>
        {rocas.map((ro) => (
          <mesh key={ro.key} position={/** @type {[number, number, number]} */ (ro.pos)} scale={ro.esc} rotation={[r(), r(), r()]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshLambertMaterial color={ro.key % 2 ? '#565560' : '#43424b'} flatShading />
          </mesh>
        ))}
      </group>
    );
  }

  return <group>{terrones.map((t) => <Terron key={t.key} pos={t.pos} r={t.rr} color={capa.color} />)}</group>;
}

/* Una CAPA del corte: el bloque de tierra + su detalle + su rótulo. El rótulo se
   enciende cuando es la capa que el Ent está enseñando (activa). */
function Capa({ capa, activa, red, reducedMotion }) {
  return (
    <group position={[0, capa.cy, 0]}>
      {/* el bloque de tierra (cara frontal = el corte) */}
      <mesh>
        <boxGeometry args={[ANCHO_CUT, capa.alto, PROF_CUT]} />
        <meshLambertMaterial color={capa.color} flatShading />
      </mesh>
      <DetalleCapa capa={capa} alto={capa.alto} red={red} reducedMotion={reducedMotion} />

      {/* marca de ATENCIÓN cuando el Ent enseña esta capa: barra que brilla en la
          arista frontal + el rótulo resaltado */}
      {activa && (
        <mesh position={[0, -capa.alto / 2 + 0.02, CARA + 0.01]}>
          <boxGeometry args={[ANCHO_CUT, 0.04, 0.04]} />
          <meshBasicMaterial color="#7ef0c8" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}

      {/* el rótulo (nombre + hint) al costado derecho de la capa */}
      <Html position={[ANCHO_CUT / 2 + 0.18, 0, CARA - 0.1]} className="entm-rot" zIndexRange={[30, 10]}>
        <div className={`entm-rot__caja${activa ? ' entm-rot__caja--activa' : ''}`}>
          <span className="entm-rot__n">{capa.nombre}</span>
          <span className="entm-rot__h">{capa.hint}</span>
        </div>
      </Html>
    </group>
  );
}

/* La VITRINA de suelo completa + la LECCIÓN (qué capa está enseñando el Ent). */
function CorteSuelo({ tier, reducedMotion }) {
  const capas = useMemo(centrosCapas, []);
  const bandaMic = useMemo(() => capas.find((c) => c.id === 'micorrizas'), [capas]);
  const red = useMemo(() => redDeBanda(bandaMic.alto, tier), [bandaMic.alto, tier]);
  useLayoutEffect(() => () => red.geo?.dispose(), [red]);

  const [activa, setActiva] = useState(0);
  useFrame((st) => {
    if (reducedMotion) return;
    const idx = Math.floor((st.clock.elapsedTime / DUR_CAPA) % CAPAS.length);
    setActiva((a) => (a === idx ? a : idx));
  });

  return (
    <group position={/** @type {[number, number, number]} */ (CORTE_POS)}>
      {/* borde de pasto que corona el corte (la tierra "sigue" arriba) */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[ANCHO_CUT, 0.08, PROF_CUT]} />
        <meshLambertMaterial color="#6f9a45" flatShading />
      </mesh>
      {capas.map((c, i) => (
        <Capa key={c.id} capa={c} red={c.id === 'micorrizas' ? red : null} activa={i === activa} reducedMotion={reducedMotion} />
      ))}
    </group>
  );
}

function Diorama({ tier, reducedMotion }) {
  const perfil = perfilDeTier(tier);
  return (
    <>
      <color attach="background" args={[PARAMO.fondo]} />
      {perfil.fog && <fog attach="fog" args={[PARAMO.niebla, 12, 40]} />}

      {/* luz de páramo (misma que el Bosque, para que el Ent se lea igual) */}
      <hemisphereLight intensity={0.92} color="#d7e2e4" groundColor="#3a3a2c" />
      <ambientLight intensity={0.34} color="#cdd7da" />
      <directionalLight
        position={[6, 12, 6]}
        intensity={1.12}
        color="#eef3f0"
        castShadow={perfil.sombras}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={34}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-5, 6, -6]} intensity={0.4} color="#b9cdd6" />
      {/* relleno cálido bajo tierra: da cuerpo a la red y a las capas */}
      <pointLight position={[CORTE_POS[0], -1.6, CORTE_POS[2] + 1]} intensity={0.6} color="#37d6b0" distance={9} decay={2} />

      {/* parche de musgo del páramo bajo el Ent */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[3.0, 32]} />
        <meshLambertMaterial color={PARAMO.musgo} />
      </mesh>
      {/* apron de tierra que lleva del musgo a la vitrina de suelo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CORTE_POS[0] * 0.6, -0.02, CORTE_POS[2] * 0.6]}>
        <planeGeometry args={[5, 4]} />
        <meshLambertMaterial color="#4a4030" />
      </mesh>

      {/* EL GUARDIÁN, con el BRAZO que señala y enseña el suelo */}
      <EntQuenua tier={tier} reducedMotion={reducedMotion} señala />

      {/* LA VITRINA de suelo con sus capas + la red micorrízica */}
      <CorteSuelo tier={tier} reducedMotion={reducedMotion} />

      <OrbitControls
        makeDefault
        target={[1.5, -0.2, 0.9]}
        enablePan={false}
        enableZoom
        minDistance={7}
        maxDistance={22}
        minPolarAngle={0.5}
        maxPolarAngle={1.52}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.12}
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El mundo del ENT MAESTRO: el guardián que abre el suelo y enseña sus capas.
 * Montar SOLO perezosa (lazy). Acepta el contrato del framework de mundos.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function EscenaEntMaestro({ tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <>
      <style>{CSS}</style>
      <Canvas
        className={`entm-canvas${listo ? ' entm-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        shadows={perfil.sombras ? 'soft' : false}
        camera={{ position: [4.5, 2.0, 14], fov: 46 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <Diorama tier={tier} reducedMotion={reducedMotion} />
      </Canvas>
    </>
  );
}
