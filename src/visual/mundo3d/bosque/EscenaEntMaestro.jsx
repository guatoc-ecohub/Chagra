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
 * corre la red bioluminiscente con sus pulsos de nutrientes.
 *
 * La geometría de la vitrina vive en `corteSuelo.geom.js` (puro three-core,
 * testeable headless). Acá solo se monta, se ilumina y se le da vida.
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
import FloraParamo from './FloraParamo.jsx';
import { PALETA } from '../micorrizas/micorrizas.geom.js';
import {
  ANCHO_CUT,
  PROF_CUT,
  CARA,
  CAPAS,
  ALTO_CORTE,
  centrosCapas,
  zFrenteDe,
  construirTierra,
  construirRaicesBanda,
  construirRaicesZona,
  esqueletoRed,
  geometriaRedBanda,
  muestrasDeLuz,
  nodosDeRed,
  pulsosDeBanda,
  construirTerreno,
} from './corteSuelo.geom.js';

/* CSS de los RÓTULOS de capa, exportado aparte: los hosts que reusan la
   vitrina (`CorteSuelo`) fuera de este mundo —el páramo— lo inyectan tal cual. */
export const CSS_ROTULOS = `
.entm-rot { transform: translate(-6%, -50%); pointer-events: none; }
.entm-rot__caja { min-width: 8.5rem; max-width: 12.5rem; padding: 0.34rem 0.6rem; border-radius: 0.7rem; background: rgba(14, 12, 9, 0.62); box-shadow: inset 0 0 0 1px rgba(180, 200, 150, 0.28); color: #e9efdd; transition: background 0.4s ease, box-shadow 0.4s ease, transform 0.4s ease; }
.entm-rot__caja--activa { background: rgba(26, 40, 26, 0.9); box-shadow: inset 0 0 0 1px rgba(126, 240, 200, 0.8), 0 0 16px 2px rgba(55, 214, 176, 0.35); transform: scale(1.06); }
.entm-rot__n { display: block; font: 700 0.82rem/1.15 system-ui, sans-serif; }
.entm-rot__h { display: block; margin-top: 0.12rem; font: 500 0.66rem/1.2 system-ui, sans-serif; color: #c3ccb4; }
.entm-rot__caja--activa .entm-rot__h { color: #d9ffef; }
`;

/* CSS del lienzo (self-contained) + los rótulos. */
const CSS = `
.entm-canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.8s ease; }
.entm-canvas--lista { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .entm-canvas { transition: none; } }
${CSS_ROTULOS}`;

/* Cielo del páramo (mismo aire que el Bosque Vivo, para que el Ent se lea igual). */
const PARAMO = { fondo: '#c3cfce', niebla: '#c9d3d1' };

/* Dónde se planta la vitrina de suelo, al lado del Ent (donde apunta su mano). */
const CORTE_POS = /** @type {[number, number, number]} */ ([2.5, 0, 1.9]);

const DUR_CAPA = 3.6; // segundos que el Ent "enseña" cada capa (loop uniforme, modo base)

/*
 * EL ARCO (modo `arco`, opt-in): no un tic-tac uniforme sino una LECCIÓN con
 * ritmo — apertura arriba, descenso, y un CLÍMAX LARGO en las micorrizas (la red
 * repartiendo la comida: la banda de pulsos merece 2-3× cualquier capa), y
 * cierre. Duraciones DESIGUALES en el orden top→bottom de CAPAS
 * (hojarasca, humus, raíces, micorrizas, roca). El ciclo vuelve a la superficie
 * (índice 0), nunca reinicia a media red. Sin `arco` el loop uniforme de siempre
 * (el mundo EscenaEntMaestro no cambia).
 */
const ARCO = [3.0, 3.4, 3.6, 9.2, 3.2]; // clímax largo en micorrizas (índice 3)
const ARCO_TOTAL = ARCO.reduce((a, b) => a + b, 0);

/*
 * QUÉ FLORA SE QUITA en este encuadre — y por qué el páramo tiene que estar.
 *
 * En la entrada el Ent vive en un frailejonar; al bajar al microsuelo el páramo
 * desaparecía y el guardián se quedaba parado en un césped pelado. Es el MISMO
 * sitio: la lección no ocurre en otro planeta. Ese césped era la mitad del "aire
 * muerto" que quedaba en el encuadre.
 *
 * Pero acá la cámara mira el corte de frente y de cerca, así que:
 *   · toda mata con z > 2.5 se para ENTRE la cámara y la vitrina → tapa la
 *     lección (y además se saldría del macizo, cuya cara llega a z = 2.75);
 *   · toda mata sobre la huella del corte (con margen) quedaría plantada en el
 *     borde del tajo o encima de él.
 * El resto del páramo se queda: puebla el fondo y devuelve la continuidad.
 */
const CORTE_X0 = CORTE_POS[0] - ANCHO_CUT / 2 - 0.6;
const CORTE_X1 = CORTE_POS[0] + ANCHO_CUT / 2 + 0.6;
/** @type {(pos: number[]) => boolean} */
const floraEstorba = ([x, , z]) => (
  z > 2.5 || (x > CORTE_X0 && x < CORTE_X1 && z > CORTE_POS[2] - CARA - 0.45)
);

/* PRNG determinista local (mismo corte siempre). */
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ── La RED de micelio de la banda de micorrizas ───────────────────────────── */

/*
 * LA MALLA DE LA RED — y por qué ya NO es aditiva.
 *
 * Antes: MeshBasicMaterial aditivo, depthWrite:false, opacity respirando entre
 * 0.84 y 0.94. Tres decisiones que, juntas, garantizan un resplandor: el aditivo
 * ACUMULA donde los hilos se cruzan (y en una red se cruzan siempre), sin
 * depthWrite nada ocluye a nada, y la opacidad pulsante lo vuelve niebla que
 * respira. Aunque la red no hubiera estado enterrada, ese material la habría
 * leído como brillo.
 *
 * Ahora: material OPACO con vertexColors. Los filamentos se ocluyen entre sí →
 * hay profundidad, hay delante y detrás, hay RED. El aditivo se reserva para lo
 * que sí es luz puntual: los nodos y los pulsos. El resplandor no se pierde: se
 * hornea en la tierra de alrededor (`hornearTierra`), que es donde la luz de una
 * red bioluminiscente iría a caer de verdad.
 */
function RedMicelio({ geo }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true }), []);
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  if (!geo) return null;
  return <mesh geometry={geo} material={mat} />;
}

/* Las RAÍCES de la banda: materia, no luz → lambert, reciben la luz de vitrina. */
function RaicesBanda({ geo }) {
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  if (!geo) return null;
  return <mesh geometry={geo} material={mat} />;
}

/* Los NODOS del micelio (arbúsculos y uniones), instanciados. Estos SÍ aditivos:
   son los puntos de intercambio, lo único que de verdad es una lucecita. */
function NodosRed({ nodos }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.OctahedronGeometry(0.038, 0), []);
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
    for (let i = 0; i < nodos.length; i++) {
      const n = nodos[i];
      s.setScalar(n.esc);
      m.compose(n.pos, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, n.color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [nodos]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!nodos.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, nodos.length]} frustumCulled={false} />;
}

/* Los PULSOS de nutrientes que corren por los RIZOMORFOS (instanciados). */
function Pulsos({ curvas, pulsos, reducedMotion }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(0.038, 7, 6), []);
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

/* El detalle propio de cada capa (la vida que la hace legible).
   OJO: todo detalle se ancla a `zFrenteDe(capa)`, la cara REAL de la capa una vez
   descontada su alcoba. Anclarlo a CARA a secas —como antes— lo entierra en las
   capas excavadas, que es como la red entera acabó dentro del ladrillo. */
function DetalleCapa({ capa, alto, red, tier, reducedMotion }) {
  const r = useMemo(() => rng(capa.id.length * 131 + 7), [capa.id]);
  const zCara = zFrenteDe(capa.id);
  // grumos en la cara del corte (siempre; textura de tierra)
  const terrones = useMemo(() => {
    const n = 3 + Math.round(alto * 2);
    return Array.from({ length: n }, (_, i) => ({
      key: i,
      pos: /** @type {[number, number, number]} */ ([(r() - 0.5) * (ANCHO_CUT - 0.5), (r() - 0.5) * alto * 0.7, zCara - 0.04]),
      rr: 0.08 + r() * 0.08,
    }));
  }, [alto, r, zCara]);

  if (capa.id === 'hojarasca') {
    // hojitas caídas sobre la cara (flecos ocres)
    const hojas = Array.from({ length: 10 }, (_, i) => ({
      key: i,
      pos: /** @type {[number, number, number]} */ ([(r() - 0.5) * (ANCHO_CUT - 0.4), (r() - 0.5) * alto * 0.6, zCara - 0.02]),
      giro: r() * Math.PI,
    }));
    return (
      <group>
        {terrones.map((t) => <Terron key={t.key} pos={t.pos} r={t.rr} color={capa.color} />)}
        {hojas.map((h) => (
          <mesh key={h.key} position={h.pos} rotation={[-Math.PI / 2, 0, h.giro]} scale={[1.4, 1, 1]}>
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
        <mesh position={[-0.4, -alto * 0.1, zCara - 0.02]} rotation={[0, 0, 0.5]}>
          <capsuleGeometry args={[0.05, 0.34, 4, 8]} />
          <meshLambertMaterial color="#c98a8f" flatShading />
        </mesh>
      </group>
    );
  }

  if (capa.id === 'raices') {
    // las MISMAS raíces que abajo agarra el micelio: bajan, cruzan el piso de la
    // capa y entran a la alcoba de micorrizas. Antes cada capa sorteaba las suyas
    // y no empataban: la lección se cortaba justo en la juntura.
    return (
      <group>
        {terrones.map((t) => <Terron key={t.key} pos={t.pos} r={t.rr} color={capa.color} />)}
        {red?.raicesZona && <RaicesBanda geo={red.raicesZona} />}
      </group>
    );
  }

  if (capa.id === 'micorrizas' && red) {
    // ¡la estrella! las raíces que bajan + la red que las conecta + los pulsos
    return (
      <group>
        <RaicesBanda geo={red.raices} />
        <RedMicelio geo={red.geo} />
        <NodosRed nodos={red.nodos} />
        <Pulsos curvas={red.curvas} pulsos={red.pulsos} reducedMotion={reducedMotion} />
      </group>
    );
  }

  if (capa.id === 'roca') {
    // roca madre: pedruscos facetados grises embebidos
    const rocas = Array.from({ length: 6 }, (_, i) => ({
      key: i,
      pos: /** @type {[number, number, number]} */ ([(r() - 0.5) * (ANCHO_CUT - 0.4), (r() - 0.5) * alto * 0.7, zCara - 0.05]),
      esc: 0.14 + r() * 0.16,
    }));
    return (
      <group>
        {rocas.map((ro) => (
          <mesh key={ro.key} position={ro.pos} scale={ro.esc} rotation={[r(), r(), r()]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshLambertMaterial color={ro.key % 2 ? '#565560' : '#43424b'} flatShading />
          </mesh>
        ))}
      </group>
    );
  }

  void tier;
  return <group>{terrones.map((t) => <Terron key={t.key} pos={t.pos} r={t.rr} color={capa.color} />)}</group>;
}

/* Una CAPA del corte: el bloque de tierra horneado + su detalle + su rótulo.
   `rotulos=false` (hosts que reusan la vitrina de lejos) omite el Html. */
function Capa({ capa, geo, activa, red, tier, reducedMotion, rotulos = true }) {
  const zCara = zFrenteDe(capa.id);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), []);
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  return (
    <group position={[0, capa.cy, 0]}>
      <mesh geometry={geo} material={mat} castShadow={false} receiveShadow />
      <DetalleCapa capa={capa} alto={capa.alto} red={red} tier={tier} reducedMotion={reducedMotion} />

      {/* marca de ATENCIÓN cuando el Ent enseña esta capa: barra que brilla en la
          arista frontal + el rótulo resaltado */}
      {activa && (
        <mesh position={[0, -capa.alto / 2 + 0.02, zCara + 0.01]}>
          <boxGeometry args={[ANCHO_CUT, 0.04, 0.04]} />
          <meshBasicMaterial color="#7ef0c8" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}

      {/* el rótulo (nombre + hint) al costado derecho de la capa */}
      {rotulos && (
        <Html position={[ANCHO_CUT / 2 + 0.18, 0, zCara - 0.1]} className="entm-rot" zIndexRange={[30, 10]}>
          <div className={`entm-rot__caja${activa ? ' entm-rot__caja--activa' : ''}`}>
            <span className="entm-rot__n">{capa.nombre}</span>
            <span className="entm-rot__h">{capa.hint}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

/* La VITRINA de suelo completa + la LECCIÓN (qué capa está enseñando el Ent).
   EXPORTADA: el páramo (MundoParamo3D) la reusa al pie de la queñua guardiana —
   misma lección, mismo componente, cero duplicación. `rotulos` apaga los Html
   cuando la vitrina se ve de lejos. */
export function CorteSuelo({ tier, reducedMotion, rotulos = true, arco = false }) {
  /*
   * Orden OBLIGATORIO: primero la red, porque la tierra de la banda se hornea
   * CON la luz de la red (las `muestras`). Es lo que deja la banda legible sin
   * lavar el filamento — un lift plano arreglaría 1 y rompería 2.
   */
  const { capas, red } = useMemo(() => {
    const cs = centrosCapas();
    const banda = cs.find((c) => c.id === 'micorrizas');
    const zona = cs.find((c) => c.id === 'raices');

    const { hilos } = esqueletoRed(banda.alto, tier);
    const luces = muestrasDeLuz(hilos);
    const nPulsos = tier === 'alto' ? 26 : tier === 'medio' ? 12 : 0;

    const redOut = {
      geo: geometriaRedBanda(hilos, tier),
      raices: construirRaicesBanda(banda.alto, tier),
      raicesZona: construirRaicesZona(zona.alto, banda.alto, tier),
      nodos: nodosDeRed(banda.alto),
      curvas: hilos.map((h) => h.curva),
      pulsos: pulsosDeBanda(hilos, nPulsos),
    };

    const conGeo = cs.map((c) => ({
      ...c,
      geo: construirTierra(c, { tier, luces: c.id === 'micorrizas' ? luces : [] }),
    }));
    return { capas: conGeo, red: redOut };
  }, [tier]);

  useLayoutEffect(() => () => {
    capas.forEach((c) => c.geo?.dispose());
    red.geo?.dispose();
    red.raices?.dispose();
    red.raicesZona?.dispose();
  }, [capas, red]);

  const [activa, setActiva] = useState(0);
  useFrame((st) => {
    if (reducedMotion) return;
    let idx;
    if (arco && ARCO.length === CAPAS.length) {
      // arco con clímax: caminar las duraciones desiguales
      let ph = st.clock.elapsedTime % ARCO_TOTAL;
      idx = ARCO.length - 1;
      for (let i = 0; i < ARCO.length; i++) {
        if (ph < ARCO[i]) { idx = i; break; }
        ph -= ARCO[i];
      }
    } else {
      idx = Math.floor((st.clock.elapsedTime / DUR_CAPA) % CAPAS.length);
    }
    setActiva((a) => (a === idx ? a : idx));
  });

  return (
    <group position={CORTE_POS}>
      {/* Borde de pasto que corona el corte. Va ENRASADO con el terreno (de -0.04
          a 0) y con el musgo del páramo: antes sobresalía 0.08 en un verde
          distinto y se leía como el bordillo de una maceta. */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[ANCHO_CUT, 0.04, PROF_CUT]} />
        <meshLambertMaterial color="#66754c" flatShading />
      </mesh>
      {capas.map((c, i) => (
        <Capa
          key={c.id}
          capa={c}
          geo={c.geo}
          red={c.id === 'micorrizas' || c.id === 'raices' ? red : null}
          activa={i === activa}
          tier={tier}
          reducedMotion={reducedMotion}
          rotulos={rotulos}
        />
      ))}
    </group>
  );
}

/* EL TERRENO que rodea la vitrina — lo que mata el aire muerto. */
function Terreno({ tier }) {
  const geo = useMemo(
    () => construirTerreno({ x: CORTE_POS[0], z: CORTE_POS[2] }, { tier }),
    [tier],
  );
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), []);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  return <mesh geometry={geo} material={mat} receiveShadow />;
}

function Diorama({ tier, reducedMotion }) {
  const perfil = perfilDeTier(tier);
  return (
    <>
      <color attach="background" args={[PARAMO.fondo]} />
      {perfil.fog && <fog attach="fog" args={[PARAMO.niebla, 14, 44]} />}

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
      {/*
        LUZ DE VITRINA — la clave para que la lección se vea. El sol del páramo
        viene de arriba, así que la CARA FRONTAL del corte (que mira al +Z, a la
        cámara) quedaba a contraluz y en sombra: la tierra se leía negra y las
        capas no existían. Esta luz frontal, casi horizontal, es la que "abre" la
        vitrina. No castea sombras: es relleno puro y barato.
      */}
      <directionalLight
        position={[CORTE_POS[0] + 1, 1.5, CORTE_POS[2] + 12]}
        intensity={1.05}
        color="#f0ead8"
      />
      {/*
        NO va acá el pointLight turquesa de relleno que había antes en
        [x, -1.6, z+1]. Estaba DELANTE de la cara del corte y lo que hacía era
        pintarle un halo verde al barro plano: ESE era el "brillo" que se veía en
        vez de la red (la red estaba enterrada y no aportaba un solo píxel).
        Ahora la luz que la red echa sobre la tierra va HORNEADA por vértice en
        `hornearTierra`, que además cuesta cero en runtime y cae solo donde hay
        filamento — no en una bola difusa en el centro de la capa.
      */}
      {/* relleno frío abajo del todo: la roca madre no puede caer a negro */}
      <pointLight position={[CORTE_POS[0], -4.4, CORTE_POS[2] + 2.5]} intensity={0.45} color="#cfd6dd" distance={7} decay={2} />

      {/* EL TERRENO: el macizo de tierra del que se sacó la vitrina */}
      <Terreno tier={tier} />

      {/* EL PÁRAMO: el mismo frailejonar de la entrada, menos lo que taparía la
          lección. La lección pasa DONDE vive el Ent, no en un potrero. */}
      <FloraParamo tier={tier} reducedMotion={reducedMotion} excluir={floraEstorba} />

      {/* EL GUARDIÁN, con el BRAZO que señala y enseña el suelo */}
      <EntQuenua tier={tier} reducedMotion={reducedMotion} señala />

      {/* LA VITRINA de suelo con sus capas + la red micorrízica */}
      <CorteSuelo tier={tier} reducedMotion={reducedMotion} />

      {/*
        ENCUADRE sobre la unidad pedagógica: rostro + brazo que señala + capas.
        La cámara estaba a 13.7 y el corte —la lección— ocupaba una quinta parte
        del ancho: todo lo demás era cielo gris. Pero el aire muerto NO se cura
        acercando la cámara; se curó poblando (el macizo de tierra). Con la tierra
        puesta, bajo el horizonte ya no hay vacío, y entonces sí se puede encuadrar
        a 11: el rostro del Ent (y=2.09) entra justo por arriba, el corte llena
        ~54% del alto y el brazo cruza el tercio izquierdo hacia la vitrina.
      */}
      <OrbitControls
        makeDefault
        target={[1.9, -1.6, 1.75]}
        enablePan={false}
        enableZoom
        minDistance={6}
        maxDistance={20}
        minPolarAngle={0.5}
        maxPolarAngle={1.52}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        // muy lento: a 0.12 la cara del corte se iba de perfil en un minuto y la
        // lección dejaba de leerse. Esto es deriva, no rotación.
        autoRotateSpeed={0.06}
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
        camera={{ position: [3.96, 1.65, 12.59], fov: 44 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <Diorama tier={tier} reducedMotion={reducedMotion} />
      </Canvas>
    </>
  );
}

/* Reexport para los tests de encuadre (invariantes de composición). */
export { ALTO_CORTE, CARA, CORTE_POS, PALETA };
