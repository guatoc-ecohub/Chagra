/*
 * EscenaMicorrizas — el MUNDO "Suelo Vivo": la RED MICORRÍZICA bajo la tierra
 * (el wood-wide web), en 3D REAL y con el máximo cuidado visual.
 *
 * La cámara está BAJO EL SUELO, mirando la vida invisible hecha visible: la
 * tierra oscura y translúcida como un acuario, las RAÍCES de las tres hermanas
 * (maíz, fríjol, ahuyama) y del árbol madre descendiendo, y —el alma de la
 * escena— la RED DE MICELIO como hilos bioluminiscentes de hongo que enlazan
 * unas raíces con otras. Por los hilos corren PULSOS de nutrientes: el fósforo y
 * el agua que SUBEN a la mata (ámbar/azul) y el azúcar que BAJA al hongo (verde).
 * Donde un hilo cruza de una planta a OTRA es un PUENTE, más claro: ahí se lee el
 * reparto (por qué maíz+fríjol+ahuyama se ayudan bajo tierra). Arriba, en el
 * borde, el ENT de la queñua asoma enseñando: "así hablo con mis hijos bajo la
 * tierra".
 *
 * Toda la geometría es procedural (cero CDN/imágenes) y vive en
 * `micorrizas.geom.js` (puro, testeable). Tier-safe: 'alto' pleno (red densa,
 * pulsos, Ent, motas); 'medio' frugal; 'bajo' mínimo digno (menos hilos, sin
 * pulsos ni Ent). Con `reducedMotion` el mundo monta QUIETO (frameloop a demanda,
 * pulsos congelados a media hebra). Un solo draw-call para toda la red; los
 * pulsos y las motas van INSTANCIADOS.
 *
 * Componente r3f: montar SOLO dentro de un host que provea altura (mockup o el
 * `<Mundo>` del framework). Importa three → siempre perezoso.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Html } from '@react-three/drei';
import * as THREE from 'three';
import EntQuenua from '../bosque/EntQuenua.jsx';
import {
  PALETA,
  SUELO,
  paramsDeTier,
  sistemaRaices,
  nodosLibres,
  construirRed,
  curvaHilo,
  geometriaRed,
  pulsosDeRed,
  motasSuelo,
  tallosSuperficie,
  tuboRaizGeom,
} from './micorrizas.geom.js';

/* CSS mínimo del lienzo (self-contained: sirve igual en el mockup y en el host
   `<Mundo>`). El fade-in evita el parpadeo al montar el chunk 3D. */
const CSS = `
.micss-canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.8s ease; }
.micss-canvas--lista { opacity: 1; }
.micss-hot { transform: translate(-50%, -120%); }
.micss-hot__btn { display: inline-flex; align-items: center; gap: 0.34rem; max-width: 12rem; padding: 0.3rem 0.6rem; border: 0; border-radius: 999px; background: rgba(10, 26, 22, 0.82); color: #eafff6; font: 600 0.76rem/1.1 system-ui, sans-serif; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(126, 240, 200, 0.4); cursor: pointer; -webkit-tap-highlight-color: transparent; text-align: left; }
.micss-hot__btn:focus-visible { outline: 2px solid #7ef0c8; outline-offset: 2px; }
.micss-hot__pt { width: 0.7rem; height: 0.7rem; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #eafff6, #37d6b0 70%); box-shadow: 0 0 8px 2px rgba(55, 214, 176, 0.7); flex: 0 0 auto; }
@media (prefers-reduced-motion: reduce) { .micss-canvas { transition: none; } }
`;

/* ── La RED de micelio: una sola malla fundida (un draw-call), material aditivo
      bioluminiscente con color por vértice. Respira apenas (opacidad). ── */
function RedMicelio({ geo, reducedMotion }) {
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  // El material es estable (useMemo): la respiración se anima en él directamente.
  useFrame((st) => {
    if (reducedMotion) return;
    mat.opacity = 0.86 + Math.sin(st.clock.elapsedTime * 0.9) * 0.09;
  });
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

/* ── Los NODOS del micelio: uniones instanciadas. Arbúsculos (puntas de raíz,
      cálidos), nodos (verde-blanco) y esporas (malva). Un InstancedMesh. ── */
function NodosRed({ nodos }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.OctahedronGeometry(0.05, 0), []);
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
  return <instancedMesh ref={ref} args={[geo, mat, nodos.length]} frustumCulled={false} />;
}

/* ── Los PULSOS de nutrientes que viajan por los hilos (InstancedMesh). Cada
      pulso corre su curva; se enciende a media hebra y se apaga en las puntas
      (llega y se entrega). Con reducedMotion quedan quietos a mitad del hilo. ── */
function Pulsos({ curvas, pulsos, reducedMotion }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(0.045, 7, 6), []);
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
      t -= Math.floor(t); // envolver a [0,1)
      cur.getPoint(t, p);
      // se enciende a media hebra y se apaga en las puntas (entrega)
      const brote = Math.sin(t * Math.PI);
      s.setScalar(pu.tam * (0.35 + brote * 0.85));
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => { escribir(0); /* pose inicial */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulsos, curvas]);
  useFrame((st) => { if (!reducedMotion) escribir(st.clock.elapsedTime); });

  if (!pulsos.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, pulsos.length]} frustumCulled={false} />;
}

/* ── MOTAS del suelo: partículas suspendidas que derivan lento (humedad, vida
      microscópica). InstancedMesh baratísimo; quietas con reducedMotion. ── */
function Motas({ motas, reducedMotion }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(0.02, 5, 4), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#9fe8d0', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3() }), []);
  const escribir = (time) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { m, q, s, p } = tmp;
    for (let i = 0; i < motas.length; i++) {
      const mo = motas[i];
      const dy = reducedMotion ? 0 : Math.sin(time * 0.18 + mo.fase) * 0.16;
      const dx = reducedMotion ? 0 : Math.cos(time * 0.12 + mo.fase) * 0.12;
      p.set(mo.pos.x + dx, mo.pos.y + dy, mo.pos.z);
      s.setScalar(mo.esc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => { escribir(0); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motas]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame((st) => { if (!reducedMotion) escribir(st.clock.elapsedTime); });
  if (!motas.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, motas.length]} frustumCulled={false} />;
}

/* ── Las RAÍCES: tubos tapereados (una sola malla fundida) con material terroso.
      Baja buscando; las puntas ya las coronan los arbúsculos (NodosRed). ── */
function Raices({ geo }) {
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.96 }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  if (!geo) return null;
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

/* ── La SUPERFICIE: la línea de tierra (y=0) translúcida, con un halo cálido de
      luz de arriba, y los TALLITOS de las tres hermanas asomando. Da el "arriba"
      sin robarle protagonismo al subsuelo. ── */
function Superficie({ tallos }) {
  return (
    <group>
      {/* la lámina de tierra vista desde abajo: oscura y translúcida (el techo
          del mundo subterráneo) */}
      <mesh position={[0, 0, SUELO.zAtras + (SUELO.z0 - SUELO.zAtras) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SUELO.ancho + 1.5, SUELO.z0 - SUELO.zAtras + 1.2]} />
        <meshBasicMaterial color={PALETA.tierraAlta} transparent opacity={0.55} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* una franja de luz difusa donde el sol toca la tierra (arriba) */}
      <mesh position={[0, 0.02, SUELO.z0 + 0.2]} rotation={[-Math.PI / 2.4, 0, 0]}>
        <planeGeometry args={[SUELO.ancho + 2, 1.6]} />
        <meshBasicMaterial color="#3a4a2a" transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {tallos.map((t) => (
        <group key={t.id} position={[t.x, 0, t.z]}>
          <mesh position={[0, t.alto / 2, 0]}>
            <cylinderGeometry args={[0.03, 0.05, t.alto, 6]} />
            <meshLambertMaterial color={t.tinte} />
          </mesh>
          {/* hojita/penacho según planta */}
          {t.ahuyama ? (
            <mesh position={[0.18, 0.08, 0.06]} rotation={[-Math.PI / 2, 0, 0.3]}>
              <coneGeometry args={[0.22, 0.05, 5]} />
              <meshLambertMaterial color={t.tinte} flatShading />
            </mesh>
          ) : (
            <mesh position={[0.09, t.alto * 0.72, 0]} rotation={[0, 0, -0.7]}>
              <coneGeometry args={[0.05, 0.34, 4]} />
              <meshLambertMaterial color={t.tinte} flatShading />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/* Un hotspot 3D → burbuja tocable anclada en el mundo. En el host `<Mundo>`
   navega (onHotspot); en la vitrina llama al mismo callback (que allí solo narra). */
function Hotspot({ pos, label, onClick }) {
  return (
    <Html position={pos} center zIndexRange={[30, 10]} className="micss-hot">
      <button type="button" className="micss-hot__btn" onClick={onClick} aria-label={label}>
        <span className="micss-hot__pt" aria-hidden="true" />
        <span>{label}</span>
      </button>
    </Html>
  );
}

function Mundo({ tier, reducedMotion, hotspots, onHotspot }) {
  const P = paramsDeTier(tier);

  // ── Geometría/datos de la red (una vez) ──────────────────────────────────
  const datos = useMemo(() => {
    const { curvas: raizCurvas, puntasRaiz } = sistemaRaices(11);
    const libres = nodosLibres(P.nodosLibres, 23);
    const { nodos, hilos } = construirRed(puntasRaiz, libres, { vecinos: P.vecinos }, 37);
    const curvasHilo = hilos.map(curvaHilo);
    const redGeo = geometriaRed(hilos, { tubK: P.tubK, tubM: P.tubM, radioHilo: P.radioHilo });
    const raizGeo = tuboRaizGeom(raizCurvas, { radial: P.radialRaiz });
    const pulsos = pulsosDeRed(hilos, P.pulsos, 53);
    const motas = motasSuelo(P.motas, 71);
    const tallos = tallosSuperficie();
    return { nodos, curvasHilo, redGeo, raizGeo, pulsos, motas, tallos };
  }, [P]);

  useLayoutEffect(() => () => {
    datos.redGeo?.dispose();
    datos.raizGeo?.dispose();
  }, [datos]);

  return (
    <>
      <color attach="background" args={[PALETA.tierra]} />
      <fog attach="fog" args={[PALETA.tierra.getHex(), 5.5, 13]} />

      {/* Luz: tenue y cálida desde ARRIBA (el sol que apenas entra a la tierra) +
          un relleno frío bajo tierra. La red no depende de la luz (brilla sola);
          esto es para las raíces, los tallos y el Ent que asoma. */}
      <hemisphereLight intensity={0.55} color="#cfe0c6" groundColor="#20140c" />
      <ambientLight intensity={0.25} color="#6ea0a0" />
      <directionalLight position={[2, 8, 4]} intensity={0.9} color="#ffe6bf" />
      <pointLight position={[0, -1.8, 1.2]} intensity={0.5} color="#37d6b0" distance={9} decay={2} />

      {/* backdrop de tierra con degradado (profundidad) */}
      <mesh position={[0, -SUELO.hondo / 2, SUELO.zAtras - 0.6]}>
        <planeGeometry args={[SUELO.ancho + 4, SUELO.hondo + 2]} />
        <meshBasicMaterial color={PALETA.tierra} />
      </mesh>

      <Superficie tallos={datos.tallos} />
      <Raices geo={datos.raizGeo} />
      <RedMicelio geo={datos.redGeo} reducedMotion={reducedMotion} />
      <NodosRed nodos={datos.nodos} />
      <Pulsos curvas={datos.curvasHilo} pulsos={datos.pulsos} reducedMotion={reducedMotion} />
      <Motas motas={datos.motas} reducedMotion={reducedMotion} />

      {/* El ENT de la queñua ASOMA en el borde, enseñando: sus raíces también se
          enchufan a la red (el árbol madre alimenta a las maticas). Solo en gama
          que aguanta; escalado y al fondo para no tapar la red. */}
      {P.conEnt && (
        <group position={[3.05, -0.15, -0.6]} scale={0.42} rotation={[0, -0.5, 0]}>
          <EntQuenua tier={P.entTier} reducedMotion={reducedMotion} />
        </group>
      )}

      {(hotspots || []).map((h) => (
        <Hotspot
          key={h.id}
          pos={h.pos}
          label={h.label}
          onClick={() => onHotspot?.(h.view, h.data)}
        />
      ))}

      <OrbitControls
        makeDefault
        target={[0, -1.7, 0]}
        enablePan={false}
        enableZoom
        minDistance={4.5}
        maxDistance={11}
        minPolarAngle={0.7}
        maxPolarAngle={1.62}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.16}
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El mundo Suelo Vivo (red micorrízica). Montar SOLO perezosa dentro de un host
 * con altura. Acepta el contrato del framework de mundos (props extra ignoradas).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, hotspots?: Array, onHotspot?: Function}} props
 */
export default function EscenaMicorrizas({ tier = 'alto', reducedMotion = false, hotspots, onHotspot }) {
  const [listo, setListo] = useState(false);
  const dpr = /** @type {import('@react-three/fiber').Dpr} */ (tier === 'alto' ? [1, 1.8] : tier === 'medio' ? [1, 1.3] : 1);
  return (
    <>
      <style>{CSS}</style>
      <Canvas
        className={`micss-canvas${listo ? ' micss-canvas--lista' : ''}`}
        dpr={dpr}
        gl={{ antialias: tier === 'alto', powerPreference: 'high-performance' }}
        camera={{ position: [0.4, -0.9, 6.6], fov: 46 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <Mundo tier={tier} reducedMotion={reducedMotion} hotspots={hotspots} onHotspot={onHotspot} />
      </Canvas>
    </>
  );
}
