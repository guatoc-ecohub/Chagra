/*
 * MundoSueloVivo3D — el SUELO VIVO en corte: el perfil del suelo agroecológico
 * abierto como un libro para que se entienda —sin una sola cifra— que el suelo
 * NO es "tierra muerta" sino el órgano vivo del que depende todo lo demás.
 *
 * La escena es un CUTAWAY (corte de perfil) que baja por los cinco horizontes,
 * de la manta de hojas a la roca madre, y muestra quién trabaja en cada uno:
 *   O — Hojarasca : la manta de hojas que protege y alimenta (materia orgánica).
 *   A — Humus     : la tierra negra, el CORAZÓN VIVO — raíces, lombrices, hongos.
 *   B — Subsuelo  : arcillas y minerales; hasta aquí bajan las raíces profundas.
 *   C — Saprolito : la roca ya meteorizada, de donde nace el suelo, gota a gota.
 *   R — Roca madre: el cimiento pétreo del que, con siglos, se hace un suelo.
 *
 * Y lo que hace que ese perfil esté VIVO, no sea un diagrama:
 *   - una planta (frijol) con su SISTEMA RADICULAR real bajando por O→A→B, y sus
 *     NÓDULOS DE RHIZOBIUM rosados: la leguminosa fijando nitrógeno del aire;
 *   - las MICORRIZAS (hifas doradas) abrazando la raíz — la sociedad hongo-raíz;
 *   - la macro-fauna del suelo sano, por capas: la LOMBRIZ y el ESCARABAJO
 *     ESTERCOLERO (SVG rubber-hose de la casa, como billboards), las HORMIGAS en
 *     fila por su túnel, los ÁCAROS caminando la hojarasca, y los HONGOS
 *     descomponedores con su MICELIO saprofito comiéndose la hoja muerta;
 *   - el AGUA que se infiltra desde la superficie y baja de horizonte a horizonte;
 *   - la HOJARASCA EN DESCOMPOSICIÓN en tres estados (fresca→parda→esqueleto)
 *     fragmentándose y bajando hacia el humus;
 *   - y, a la derecha, una MUESTRA AMPLIADA (se reutiliza el diorama de
 *     MicrofaunaSuelo del framework) con la micro-fauna que no se ve a simple
 *     vista: lombriz, colémbolo, ácaro, la red de hifas y las bacterias.
 *
 * DIRECCIÓN DE ARTE (todo dentro del framework, nada inventado por fuera):
 *   - Atmósfera: la MISMA hora dorada del valle (`CIELOS_HORA.dorada`, espejo de
 *     `ATMOSFERA` / atmosferaMadre). Entrar aquí se siente como acercarse dentro
 *     del mismo atardecer, no como abrir otra app.
 *   - Materiales: parten de `PALETA` (atmosferaMadre) entintados hacia la niebla
 *     dorada con `mezclar` — la ley de coherencia del framework.
 *   - El polvo en suspensión sobre la superficie son las `ParticulasAmbientales`
 *     del kit (tipo=polvo), sin tocarlas.
 *   - La micro-fauna es el `DioramaMicrofaunaSuelo` reutilizado, no re-escrito.
 *
 * RENDIMIENTO (frugal por contrato, DR §6): SOLO `meshLambert`/`meshBasic`, sin
 * shadow-map; horizontes en cajas, motas/piedras/gotas INSTANCIADAS (pocos draw
 * calls), PRNG determinista (mismo corte siempre). Presupuestos por `tier`;
 * `reducedMotion` congela agua, brillo de hifas, vaivén de planta y lombriz y
 * pasa el frameloop a demanda. La muestra ampliada no monta en gama baja.
 *
 * Ruta mockup: la cablea Opus en App.jsx (este archivo NO toca App.jsx).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Html } from '@react-three/drei';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';
import { DioramaMicrofaunaSuelo } from '../visual/mundo3d/MicrofaunaSuelo.jsx';
import { Lombriz } from '../visual/creatures/Lombriz.jsx';
import { Escarabajo } from '../visual/creatures/Escarabajo.jsx';

/* La hora dorada canónica (espejo de ATMOSFERA): única fuente de la atmósfera. */
const DORADA = CIELOS_HORA.dorada;
const TINTE = DORADA.niebla; // el tinte cálido que unifica todos los mundos

/* La paleta del framework entintada hacia la hora dorada. El suelo es cálido de
   suyo; se le da apenas el tinte del atardecer para que el ojo lea "el mismo
   lugar" que el resto de los mundos. */
const P = {
  hojarasca: mezclar('#6f7d33', TINTE, 0.24), // O: manta de hojas, verde-pardo
  hojaSeca: mezclar('#9a7c38', TINTE, 0.2), // hoja ya seca en la hojarasca
  pasto: mezclar('#5f8a3f', TINTE, 0.22), // la vida verde de la superficie
  humus: mezclar('#241811', TINTE, 0.12), // A: tierra negra, el corazón vivo
  humusAlt: mezclar('#32241a', TINTE, 0.14), // moteado del humus
  subsuelo: mezclar('#6b4a2b', TINTE, 0.26), // B: ocre de arcillas y minerales
  subsueloAlt: mezclar('#7c5836', TINTE, 0.26),
  saprolito: mezclar('#9a7c50', TINTE, 0.3), // C: roca meteorizada, pálida
  roca: mezclar(PALETA.piedra, TINTE, 0.3), // R: roca madre, gris cálido
  rocaOscura: mezclar('#6f6552', TINTE, 0.28),
  raiz: mezclar('#b98a52', TINTE, 0.18), // la raíz viva, tono tabaco claro
  raizFina: mezclar('#cba876', TINTE, 0.16), // radícula/pelo radical
  hifa: '#f2ece0', // micorriza en reposo (casi blanca)
  hifaOro: '#ffd27a', // micorriza en pulso (oro del hongo)
  nodo: '#ffe6a8', // punto de intercambio hongo↔raíz
  organico: '#211610', // mota de materia orgánica en descomposición
  piedra: mezclar(PALETA.piedra, TINTE, 0.34), // canto rodado en B/C
  piedraClara: mezclar('#b6a888', TINTE, 0.28),
  agua: mezclar(PALETA.agua, DORADA.cielo, 0.3), // la gota que se infiltra
  lombriz: '#e39a86', // la lombriz del corte macro
  lombrizAlt: '#d6836d',
  // — la vida del suelo que se agrega en este corte —
  nodulo: '#e79a86', // nódulo de rhizobium en la raíz de frijol (rosado = N₂ fijado)
  noduloAlt: '#f4b39c',
  micelio: '#f4efe2', // micelio saprofito: hilos casi blancos que digieren la hojarasca
  hongoTallo: mezclar('#e8dcc4', TINTE, 0.14), // estípite (pie) pálido de la seta
  hongoSombrero: mezclar('#c25a38', TINTE, 0.16), // sombrero teja andino
  hongoSombreroAlt: mezclar('#d98844', TINTE, 0.16),
  hongoLaminas: mezclar('#7c4a2e', TINTE, 0.12), // láminas bajo el sombrero
  hormiga: mezclar('#241610', TINTE, 0.06), // hormiga parda oscura
  hormigaAlt: mezclar('#3c2416', TINTE, 0.08),
  acaroCuerpo: mezclar('#b34b34', TINTE, 0.12), // ácaro rojo-teja estilizado
  acaroPata: '#241610',
  hojaVerde: mezclar('#6f9a45', TINTE, 0.16), // hoja recién caída (fresca)
  hojaParda: mezclar('#8a6a30', TINTE, 0.2), // hoja a media descomposición
  hojaEsqueleto: mezclar('#54401f', TINTE, 0.18), // hoja esqueletizada, ya casi humus
};

/* Geometría del bloque cortado. El FRENTE es la cara leída: la vida se pega o
   protruye ahí para que se lea contra el corte (como en MicrofaunaSuelo). */
const ANCHO = 8; // x: ancho del perfil
const PROF = 4; // z: fondo del bloque
const FRENTE = PROF / 2 - 0.15; // z donde vive lo que debe leerse en el corte

/* Los cinco horizontes: [yTop, yBot] con la superficie del suelo en y=0. */
const HORIZONTES = [
  { id: 'O', top: 0.30, bot: 0.0, color: P.hojarasca, nombre: 'Hojarasca', sub: 'la manta que protege' },
  { id: 'A', top: 0.0, bot: -1.5, color: P.humus, nombre: 'Humus', sub: 'la tierra negra, el corazón vivo' },
  { id: 'B', top: -1.5, bot: -2.9, color: P.subsuelo, nombre: 'Subsuelo', sub: 'arcillas y minerales' },
  { id: 'C', top: -2.9, bot: -3.9, color: P.saprolito, nombre: 'Saprolito', sub: 'roca ya meteorizada' },
  { id: 'R', top: -3.9, bot: -4.9, color: P.roca, nombre: 'Roca madre', sub: 'el cimiento pétreo' },
];
const Y_FONDO = -4.9;

/* PRNG determinista (mismo corte siempre, sin azar por frame). */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const UP = new THREE.Vector3(0, 1, 0);
/* Un segmento a↔b como cilindro orientado: centro + cuaternión + largo. */
function segmento(a, b) {
  const dir = b.clone().sub(a);
  const largo = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return { pos: [mid.x, mid.y, mid.z], quat: [q.x, q.y, q.z, q.w], largo };
}

/* ── Las luces de la hora dorada del kit ──────────────────────────────────── */
function LucesDoradas() {
  return (
    <>
      <hemisphereLight intensity={DORADA.hemisferio} color={DORADA.cielo} groundColor={DORADA.suelo} />
      <ambientLight intensity={DORADA.ambiente} color={DORADA.luz} />
      <directionalLight position={/** @type {[number, number, number]} */ (DORADA.solPos)} intensity={DORADA.sol} color={DORADA.luz} />
      <directionalLight position={[-6, 4, -7]} intensity={DORADA.rellenoInt} color={DORADA.relleno} />
    </>
  );
}

/* El sol bajo del atardecer: ancla visual de la hora (no ilumina; de eso se
   encargan las luces). Disco tibio con halo, del lado del solPos. */
function SolBajo() {
  return (
    <group position={[9, 7, -13]}>
      <mesh>
        <circleGeometry args={[1.5, 40]} />
        <meshBasicMaterial color="#fff0cf" transparent opacity={0.95} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[2.8, 40]} />
        <meshBasicMaterial color={DORADA.luz} transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[4.8, 40]} />
        <meshBasicMaterial color={DORADA.cielo} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ── Motas/piedras dispersas dentro de un horizonte (1 draw call) ──────────── */
function Dispersos({ n, yTop, yBot, rMin, rMax, colores, forma, seed }) {
  const ref = useRef(null);
  const datos = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: n }, () => ({
      // se sesgan hacia el frente para que se lean en la cara cortada
      x: (r() - 0.5) * (ANCHO - 0.5),
      y: yBot + r() * (yTop - yBot),
      z: FRENTE - r() * (PROF - 0.5),
      s: rMin + r() * (rMax - rMin),
      giro: [r() * Math.PI, r() * Math.PI, r() * Math.PI],
      col: colores[Math.floor(r() * colores.length)],
    }));
  }, [n, yTop, yBot, rMin, rMax, colores, seed]);

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const c = new THREE.Color();
    datos.forEach((d, i) => {
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(d.giro[0], d.giro[1], d.giro[2]);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      c.set(d.col);
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [datos]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      {forma === 'piedra' ? (
        <dodecahedronGeometry args={[1, 0]} />
      ) : (
        <boxGeometry args={[1, 1, 1]} />
      )}
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* ── El bloque de horizontes: cinco cajas apiladas + la superficie viva ─────── */
function BloqueHorizontes({ tier }) {
  // hojas caídas sobre la hojarasca (materia orgánica que se ve entrar)
  const hojas = useMemo(() => {
    const r = rng(91);
    const N = tier === 'bajo' ? 6 : 12;
    return Array.from({ length: N }, (_, i) => ({
      key: i,
      x: (r() - 0.5) * (ANCHO - 0.6),
      z: FRENTE - 0.05 - r() * (PROF - 0.7),
      giro: r() * Math.PI,
      s: 0.16 + r() * 0.12,
      color: r() < 0.5 ? P.hojarasca : P.hojaSeca,
    }));
  }, [tier]);
  // matas de pasto en la superficie (conos verdes)
  const pasto = useMemo(() => {
    const r = rng(53);
    const N = tier === 'bajo' ? 10 : 22;
    return Array.from({ length: N }, (_, i) => ({
      key: i,
      x: (r() - 0.5) * (ANCHO - 0.4),
      z: FRENTE - 0.1 - r() * (PROF - 0.6),
      s: 0.7 + r() * 0.8,
      giro: (r() - 0.5) * 0.4,
    }));
  }, [tier]);

  return (
    <group>
      {/* las cinco capas del perfil */}
      {HORIZONTES.map((h) => (
        <mesh key={h.id} position={[0, (h.top + h.bot) / 2, 0]}>
          <boxGeometry args={[ANCHO, h.top - h.bot, PROF]} />
          <meshLambertMaterial color={h.color} flatShading />
        </mesh>
      ))}

      {/* superficie viva: una lámina de pasto sobre la hojarasca */}
      <mesh position={[0, 0.315, 0]}>
        <boxGeometry args={[ANCHO, 0.05, PROF]} />
        <meshLambertMaterial color={P.pasto} flatShading />
      </mesh>
      {pasto.map((g) => (
        <mesh key={`pasto-${g.key}`} position={[g.x, 0.34 + 0.11 * g.s, g.z]} rotation={[g.giro, 0, g.giro]} scale={[1, g.s, 1]}>
          <coneGeometry args={[0.06, 0.34, 4]} />
          <meshLambertMaterial color={P.pasto} flatShading />
        </mesh>
      ))}
      {/* hojas caídas: la materia orgánica que alimenta la hojarasca */}
      {hojas.map((h) => (
        <mesh key={`hoja-${h.key}`} position={[h.x, 0.335, h.z]} rotation={[-Math.PI / 2, 0, h.giro]}>
          <circleGeometry args={[h.s, 5]} />
          <meshLambertMaterial color={h.color} flatShading side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* motas de materia orgánica: densas en el humus, entrando también al B */}
      <Dispersos n={tier === 'bajo' ? 40 : 90} yTop={-0.05} yBot={-1.45} rMin={0.03} rMax={0.075} colores={[P.organico, P.humusAlt]} forma="mota" seed={301} />
      <Dispersos n={tier === 'bajo' ? 14 : 30} yTop={-1.5} yBot={-2.85} rMin={0.03} rMax={0.06} colores={[P.organico, P.subsueloAlt]} forma="mota" seed={317} />
      {/* cantos rodados: pocos en B, más y más pálidos en C */}
      <Dispersos n={tier === 'bajo' ? 6 : 14} yTop={-1.55} yBot={-2.85} rMin={0.08} rMax={0.18} colores={[P.piedra, P.piedraClara]} forma="piedra" seed={331} />
      <Dispersos n={tier === 'bajo' ? 10 : 22} yTop={-2.9} yBot={-3.85} rMin={0.12} rMax={0.26} colores={[P.piedra, P.piedraClara, P.saprolito]} forma="piedra" seed={347} />

      {/* la roca madre: bloques angulares que craquelan la cara del horizonte R */}
      {[
        [-2.6, -4.35, FRENTE - 0.5, 0.7],
        [-0.4, -4.5, FRENTE - 0.7, 0.85],
        [1.9, -4.3, FRENTE - 0.4, 0.6],
        [3.1, -4.55, FRENTE - 0.9, 0.7],
      ].map((r2, i) => (
        <mesh key={`roca-${i}`} position={[r2[0], r2[1], r2[2]]} rotation={[i * 0.7, i, i * 0.4]}>
          <dodecahedronGeometry args={[r2[3], 0]} />
          <meshLambertMaterial color={i % 2 === 0 ? P.roca : P.rocaOscura} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ── La planta héroe: brote de frijol en la superficie (tallo + hojas + cotiledón) */
function PlantaHeroe({ hx, reducedMotion }) {
  const copa = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !copa.current) return;
    copa.current.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.05;
  });
  return (
    <group position={[hx, 0.33, FRENTE - 0.25]}>
      {/* tallo */}
      <group ref={copa}>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.035, 0.05, 0.84, 6]} />
          <meshLambertMaterial color={P.pasto} flatShading />
        </mesh>
        {/* par de cotiledones bajos */}
        <mesh position={[-0.11, 0.2, 0.02]} rotation={[0, 0, 0.9]} scale={[1, 0.55, 1]}>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshLambertMaterial color={mezclar(P.pasto, '#9bbf5a', 0.5)} flatShading />
        </mesh>
        <mesh position={[0.11, 0.2, 0.02]} rotation={[0, 0, -0.9]} scale={[1, 0.55, 1]}>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshLambertMaterial color={mezclar(P.pasto, '#9bbf5a', 0.5)} flatShading />
        </mesh>
        {/* hojas verdaderas arriba */}
        <mesh position={[-0.16, 0.74, 0.03]} rotation={[0.2, 0.3, 0.5]} scale={[1.3, 0.5, 1]}>
          <sphereGeometry args={[0.14, 8, 6]} />
          <meshLambertMaterial color="#8fc25a" flatShading />
        </mesh>
        <mesh position={[0.16, 0.78, -0.02]} rotation={[0.2, -0.3, -0.5]} scale={[1.3, 0.5, 1]}>
          <sphereGeometry args={[0.13, 8, 6]} />
          <meshLambertMaterial color="#8fc25a" flatShading />
        </mesh>
        <mesh position={[0, 0.9, 0.02]} rotation={[-0.3, 0, 0]} scale={[1, 0.5, 1.2]}>
          <sphereGeometry args={[0.11, 8, 6]} />
          <meshLambertMaterial color="#a3d067" flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* ── El sistema radicular + micorrizas: el HÉROE del corte ─────────────────── *
   Recursión determinista con sesgo descendente: la raíz principal baja por O→A→B
   y de sus nodos salen radículas más finas; de la raíz salen las HIFAS del hongo
   (micorriza) que la abrazan — la sociedad hongo↔raíz que nutre la planta. */
function generarRaiz(seed, hx, maxDepth) {
  const r = rng(seed);
  const raizSegs = [];
  const hifaSegs = [];
  const nodos = [];
  const nodulos = []; // nódulos de rhizobium: el frijol es leguminosa y fija nitrógeno
  const lado = new THREE.Vector3();
  function crecer(origen, dir, largo, radio, depth) {
    const d = dir.clone().normalize();
    const fin = origen.clone().addScaledVector(d, largo);
    raizSegs.push({ ...segmento(origen, fin), radio });
    // nódulos de rhizobium en las raíces medias del frijol (rosados = fijando N₂)
    if (depth >= 1 && depth <= maxDepth && r() < 0.55) {
      // se cuelgan a un costado de la raíz, donde de verdad crecen
      lado.set(d.z, 0, -d.x).normalize().multiplyScalar(radio * 1.4 + 0.02);
      const centro = origen.clone().add(fin).multiplyScalar(0.5).add(lado);
      const cuantos = 1 + Math.floor(r() * 3);
      for (let k = 0; k < cuantos; k++) {
        nodulos.push({
          pos: [
            centro.x + (r() - 0.5) * 0.06,
            centro.y + (r() - 0.5) * 0.08,
            centro.z + (r() - 0.5) * 0.05,
          ],
          s: 0.032 + r() * 0.026,
        });
      }
    }
    // penacho de micorrizas en el nodo (la raíz "pesca" nutrientes con el hongo)
    if (depth >= 1 && r() < 0.85) {
      const nh = 1 + Math.floor(r() * 2);
      for (let k = 0; k < nh; k++) {
        const hd = d
          .clone()
          .applyAxisAngle(new THREE.Vector3(0, 0, 1), (r() - 0.5) * 2.4)
          .applyAxisAngle(new THREE.Vector3(1, 0, 0), (r() - 0.5) * 1.2);
        const hl = 0.32 + r() * 0.4;
        const hfin = fin.clone().addScaledVector(hd, hl);
        hifaSegs.push(segmento(fin, hfin));
        nodos.push({ pos: [hfin.x, hfin.y, hfin.z] });
      }
    }
    if (depth >= maxDepth || fin.y < -2.8) {
      nodos.push({ pos: [fin.x, fin.y, fin.z] });
      return;
    }
    const hijos = depth === 0 ? 1 : r() < 0.7 ? 2 : 1;
    for (let k = 0; k < hijos; k++) {
      const desvio = k === 0 ? 0.3 : 1.1;
      const nd = d
        .clone()
        .applyAxisAngle(new THREE.Vector3(0, 0, 1), (r() - 0.5) * desvio)
        .applyAxisAngle(new THREE.Vector3(1, 0, 0), (r() - 0.5) * desvio * 0.5);
      nd.y -= 0.5; // la raíz siempre tira hacia abajo (gravitropismo)
      nd.normalize();
      crecer(fin, nd, largo * (0.72 + r() * 0.14), radio * 0.72, depth + 1);
    }
  }
  crecer(new THREE.Vector3(hx, 0.0, FRENTE - 0.25), new THREE.Vector3(0, -1, 0), 0.85, 0.1, 0);
  return { raizSegs, hifaSegs, nodos, nodulos };
}

function SistemaRaiz({ hx, maxDepth, reducedMotion }) {
  const { raizSegs, hifaSegs, nodos, nodulos } = useMemo(() => generarRaiz(41, hx, maxDepth), [hx, maxDepth]);
  const mats = useRef([]);
  const nodoRefs = useRef([]);
  const colBase = useMemo(() => new THREE.Color(P.hifa), []);
  const colOro = useMemo(() => new THREE.Color(P.hifaOro), []);

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime * 1.8;
    for (let i = 0; i < mats.current.length; i++) {
      const m = mats.current[i];
      if (!m) continue;
      const glow = 0.5 + 0.5 * Math.sin(t - i * 0.25);
      m.color.copy(colBase).lerp(colOro, glow * 0.85);
    }
    for (let i = 0; i < nodoRefs.current.length; i++) {
      const n = nodoRefs.current[i];
      if (!n) continue;
      n.scale.setScalar(0.7 + 0.3 * Math.sin(t * 1.4 - i));
    }
  });

  return (
    <group>
      {/* la raíz: cilindros tabaco, más gruesos arriba */}
      {raizSegs.map((s, i) => (
        <mesh key={`r-${i}`} position={s.pos} quaternion={s.quat} scale={[s.radio, s.largo, s.radio]}>
          <cylinderGeometry args={[1, 0.7, 1, 5]} />
          <meshLambertMaterial color={s.radio > 0.06 ? P.raiz : P.raizFina} flatShading />
        </mesh>
      ))}
      {/* las hifas de la micorriza: filamentos que pulsan del blanco al oro */}
      {hifaSegs.map((s, i) => (
        <mesh key={`h-${i}`} position={s.pos} quaternion={s.quat} scale={[0.01, s.largo, 0.01]}>
          <cylinderGeometry args={[1, 1, 1, 4]} />
          <meshBasicMaterial ref={(el) => { mats.current[i] = el; }} color={P.hifa} />
        </mesh>
      ))}
      {/* nodos de intercambio hongo↔raíz: puntos dorados que titilan */}
      {nodos.map((n, i) => (
        <mesh key={`n-${i}`} position={n.pos} ref={(el) => { nodoRefs.current[i] = el; }}>
          <sphereGeometry args={[0.03, 7, 7]} />
          <meshBasicMaterial color={P.nodo} />
        </mesh>
      ))}
      {/* nódulos de rhizobium: bolitas rosadas colgadas de la raíz del frijol.
          El rosa es leghemoglobina: la señal de que ahí se está fijando nitrógeno. */}
      {nodulos.map((nd, i) => (
        <mesh key={`nod-${i}`} position={nd.pos} scale={nd.s}>
          <sphereGeometry args={[1, 8, 7]} />
          <meshLambertMaterial color={i % 2 === 0 ? P.nodulo : P.noduloAlt} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ── La LOMBRIZ (SVG rubber-hose de la casa) asomando por su túnel en el humus ─ *
   Se reutiliza el SVG `Lombriz` (Martiodrilus, la gigante andina) como billboard,
   no se re-dibuja en low-poly (decisión de arte: el SVG le gana). El túnel oscuro
   detrás le da el "acaba de asomar del suelo". Se mece suave (asomar/mecerse lo
   pone la escena, como dice la propia criatura). */
function LombrizBillboard({ pos, px = 66, factor = 2.7, giro = 0, fase = 0, tunel = true, reducedMotion }) {
  const grupo = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !grupo.current) return;
    const t = clock.elapsedTime;
    grupo.current.position.y = pos[1] + Math.sin(t * 1.2 + fase) * 0.05;
    grupo.current.position.x = pos[0] + Math.sin(t * 0.6 + fase) * 0.025;
  });
  return (
    <group ref={grupo} position={pos}>
      {/* boca del túnel: mancha oscura de donde sale la lombriz */}
      {tunel && (
        <mesh position={[0, -0.02, -0.06]}>
          <circleGeometry args={[0.18, 16]} />
          <meshBasicMaterial color={P.humus} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}
      <Html center distanceFactor={factor} zIndexRange={[18, 0]} pointerEvents="none">
        <div
          aria-hidden="true"
          data-bicho="lombriz"
          style={{ transform: `rotate(${giro}deg)`, filter: 'drop-shadow(0 2px 4px rgba(20,14,8,0.4))', pointerEvents: 'none' }}
        >
          <Lombriz size={px} animated={!reducedMotion} />
        </div>
      </Html>
    </group>
  );
}

/* ── El ESCARABAJO ESTERCOLERO (SVG de la casa) rodando su bola de abono ─────── *
   Dichotomius: entierra el estiércol y recicla nutrientes. Se reutiliza el SVG
   `Escarabajo` (que ya trae bola + patas animadas) como billboard, empujándolo
   despacio por la superficie de la hojarasca. */
function EscarabajoBillboard({ base, px = 74, factor = 2.6, reducedMotion }) {
  const grupo = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !grupo.current) return;
    const p = (clock.elapsedTime * 0.16) % 1;
    grupo.current.position.x = base[0] + (0.5 - p) * 2.0; // avanza empujando la bola
    grupo.current.position.y = base[1] + Math.abs(Math.sin(p * Math.PI * 7)) * 0.025; // brinquitos
  });
  return (
    <group ref={grupo} position={base}>
      <Html center distanceFactor={factor} zIndexRange={[19, 0]} pointerEvents="none">
        <div
          aria-hidden="true"
          data-bicho="escarabajo"
          style={{ filter: 'drop-shadow(0 2px 5px rgba(20,14,8,0.45))', pointerEvents: 'none' }}
        >
          <Escarabajo size={px} animated={!reducedMotion} />
        </div>
      </Html>
    </group>
  );
}

/* ── HONGOS: setas sobre la hojarasca + micelio saprofito que la digiere ─────── *
   No es la micorriza de la raíz (esa es la sociedad hongo↔planta): éste es el
   hongo descomponedor que come la hoja muerta y la vuelve humus. Sombrero teja,
   pie pálido, láminas debajo; y una malla de hilos blancos que baja al humus. */
function Hongos({ base, n, reducedMotion }) {
  const capaRefs = useRef([]);
  const setas = useMemo(() => {
    const r = rng(577);
    return Array.from({ length: n }, (_, i) => ({
      key: i,
      x: (r() - 0.5) * 0.9,
      z: (r() - 0.5) * 0.5,
      alto: 0.14 + r() * 0.12,
      radio: 0.09 + r() * 0.07,
      giro: r() * Math.PI,
      col: r() < 0.5 ? P.hongoSombrero : P.hongoSombreroAlt,
      fase: r() * Math.PI * 2,
    }));
  }, [n]);
  // micelio: hilos que salen del pie del racimo y se abren bajando al humus
  const hilos = useMemo(() => {
    const r = rng(601);
    const raiz = new THREE.Vector3(0, -0.02, 0);
    return Array.from({ length: n * 4 + 6 }, () => {
      const dir = new THREE.Vector3((r() - 0.5) * 1.4, -0.4 - r() * 0.6, (r() - 0.5) * 0.6).normalize();
      const largo = 0.28 + r() * 0.45;
      const fin = raiz.clone().addScaledVector(dir, largo);
      return { ...segmento(raiz, fin), largo };
    });
  }, [n]);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < capaRefs.current.length; i++) {
      const c = capaRefs.current[i];
      if (!c) continue;
      c.rotation.z = Math.sin(t * 1.1 + setas[i].fase) * 0.06; // brisa bajo tierra, mínima
    }
  });

  return (
    <group position={base}>
      {/* la malla de micelio saprofito (hilos casi blancos, mate) */}
      {hilos.map((h, i) => (
        <mesh key={`mic-${i}`} position={h.pos} quaternion={h.quat} scale={[0.006, h.largo, 0.006]}>
          <cylinderGeometry args={[1, 1, 1, 4]} />
          <meshBasicMaterial color={P.micelio} transparent opacity={0.72} />
        </mesh>
      ))}
      {/* el racimo de setas */}
      {setas.map((s, i) => (
        <group key={s.key} position={[s.x, 0, s.z]} rotation={[0, s.giro, 0]}>
          <group ref={(el) => { capaRefs.current[i] = el; }}>
            {/* pie */}
            <mesh position={[0, s.alto / 2, 0]}>
              <cylinderGeometry args={[s.radio * 0.32, s.radio * 0.42, s.alto, 6]} />
              <meshLambertMaterial color={P.hongoTallo} flatShading />
            </mesh>
            {/* láminas bajo el sombrero */}
            <mesh position={[0, s.alto, 0]}>
              <cylinderGeometry args={[s.radio * 0.9, s.radio * 0.55, s.radio * 0.28, 10]} />
              <meshLambertMaterial color={P.hongoLaminas} flatShading />
            </mesh>
            {/* sombrero (media esfera achatada) */}
            <mesh position={[0, s.alto + s.radio * 0.16, 0]} scale={[1, 0.62, 1]}>
              <sphereGeometry args={[s.radio, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshLambertMaterial color={s.col} flatShading />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/* ── HORMIGAS en fila: cabeza+tórax+gáster, 6 patas, antenas. Recorren un túnel ─ *
   Las hormigas del suelo airean la tierra y bajan materia orgánica a sus nidos.
   Van en hilera por un sendero determinista dentro del humus. */
function Hormiga({ escala = 1, reducedMotion }) {
  const patas = useRef([]);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime * 9;
    for (let i = 0; i < patas.current.length; i++) {
      const p = patas.current[i];
      if (p) p.rotation.z = Math.sin(t + i * 1.3) * 0.35;
    }
  });
  const patasDef = useMemo(
    () => [-0.03, 0, 0.03].flatMap((zx) => [1, -1].map((lado) => ({ zx, lado }))),
    [],
  );
  return (
    <group scale={escala}>
      {/* gáster (abdomen) */}
      <mesh position={[-0.06, 0.015, 0]} scale={[1.3, 1, 1]}>
        <sphereGeometry args={[0.032, 8, 7]} />
        <meshLambertMaterial color={P.hormiga} flatShading />
      </mesh>
      {/* tórax */}
      <mesh position={[0, 0.012, 0]}>
        <sphereGeometry args={[0.02, 8, 7]} />
        <meshLambertMaterial color={P.hormigaAlt} flatShading />
      </mesh>
      {/* cabeza */}
      <mesh position={[0.045, 0.015, 0]}>
        <sphereGeometry args={[0.024, 8, 7]} />
        <meshLambertMaterial color={P.hormiga} flatShading />
      </mesh>
      {/* ojitos */}
      <mesh position={[0.058, 0.022, 0.014]}><sphereGeometry args={[0.006, 6, 6]} /><meshBasicMaterial color="#fbf6ec" /></mesh>
      <mesh position={[0.058, 0.022, -0.014]}><sphereGeometry args={[0.006, 6, 6]} /><meshBasicMaterial color="#fbf6ec" /></mesh>
      {/* antenas */}
      <mesh position={[0.06, 0.035, 0.01]} rotation={[0, 0, -0.7]}><cylinderGeometry args={[0.003, 0.003, 0.05, 4]} /><meshBasicMaterial color={P.hormigaAlt} /></mesh>
      <mesh position={[0.06, 0.035, -0.01]} rotation={[0, 0, -0.7]}><cylinderGeometry args={[0.003, 0.003, 0.05, 4]} /><meshBasicMaterial color={P.hormigaAlt} /></mesh>
      {/* patas */}
      {patasDef.map((pt, i) => (
        <group key={i} ref={(el) => { patas.current[i] = el; }} position={[pt.zx, 0.006, 0.016 * pt.lado]}>
          <mesh position={[0, -0.012, 0.014 * pt.lado]} rotation={[pt.lado * 0.5, 0, pt.lado * 0.5]}>
            <cylinderGeometry args={[0.0028, 0.0028, 0.05, 4]} />
            <meshBasicMaterial color={P.acaroPata} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function HormigasEnFila({ n, reducedMotion }) {
  const refs = useRef([]);
  // sendero determinista dentro del humus (curva suave que baja hacia el nido)
  const camino = useMemo(() => {
    const puntos = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      puntos.push(new THREE.Vector3(
        3.4 - u * 3.2,
        -0.35 - u * 1.15 + Math.sin(u * Math.PI * 2) * 0.12,
        FRENTE - 0.06 - Math.sin(u * Math.PI) * 0.12,
      ));
    }
    return new THREE.CatmullRomCurve3(puntos);
  }, []);
  const hormigas = useMemo(
    () => Array.from({ length: n }, (_, i) => ({ key: i, off: i / n, escala: 0.85 + (i % 2) * 0.16 })),
    [n],
  );
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (reducedMotion ? 0 : 0.045);
    for (let i = 0; i < refs.current.length; i++) {
      const g = refs.current[i];
      if (!g) continue;
      const u = ((t + hormigas[i].off) % 1 + 1) % 1;
      const pos = camino.getPoint(u);
      const tan = camino.getTangent(u);
      g.position.copy(pos);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tan.clone().setY(tan.y * 0.4).normalize());
      // ligera corrección para que no se vuelquen
      g.up.copy(up);
    }
  });

  return (
    <group>
      {hormigas.map((h, i) => (
        <group key={h.key} ref={(el) => { refs.current[i] = el; }}>
          <Hormiga escala={h.escala} reducedMotion={reducedMotion} />
        </group>
      ))}
    </group>
  );
}

/* ── ÁCARO estilizado: cuerpo redondo teja + 8 patitas, camina lento por la hoja ─ */
function AcaroSuelo({ base, escala = 1, fase = 0, reducedMotion }) {
  const cuerpo = useRef(null);
  const patas = useRef([]);
  const patasDef = useMemo(() => Array.from({ length: 8 }, (_, i) => ({ lado: i < 4 ? 1 : -1, ang: ((i % 4) - 1.5) * 0.5 })), []);
  useFrame(({ clock }) => {
    if (reducedMotion || !cuerpo.current) return;
    const a = clock.elapsedTime * 0.4 + fase;
    cuerpo.current.position.x = base[0] + Math.cos(a) * 0.22;
    cuerpo.current.position.z = base[2] + Math.sin(a * 1.3) * 0.04;
    cuerpo.current.rotation.y = a + Math.PI / 2;
    for (let i = 0; i < patas.current.length; i++) {
      const p = patas.current[i];
      if (p) p.rotation.x = Math.sin(clock.elapsedTime * 7 + i * 1.1) * 0.3;
    }
  });
  return (
    <group ref={cuerpo} position={base} scale={escala}>
      <mesh><sphereGeometry args={[0.075, 10, 9]} /><meshLambertMaterial color={P.acaroCuerpo} flatShading /></mesh>
      <mesh position={[0, 0.015, 0.06]} scale={[0.7, 0.6, 0.7]}><sphereGeometry args={[0.05, 8, 7]} /><meshLambertMaterial color="#9a3d2a" flatShading /></mesh>
      <mesh position={[0.028, 0.03, 0.07]}><sphereGeometry args={[0.012, 6, 6]} /><meshBasicMaterial color="#fbf6ec" /></mesh>
      <mesh position={[-0.028, 0.03, 0.07]}><sphereGeometry args={[0.012, 6, 6]} /><meshBasicMaterial color="#fbf6ec" /></mesh>
      {patasDef.map((pt, i) => (
        <group key={i} position={[0.062 * pt.lado, -0.012, 0]} rotation={[0, 0, pt.ang * pt.lado]}>
          <group ref={(el) => { patas.current[i] = el; }}>
            <mesh position={[0.05 * pt.lado, -0.012, 0]} rotation={[0, 0, pt.lado * 0.6]}>
              <cylinderGeometry args={[0.005, 0.004, 0.1, 4]} />
              <meshBasicMaterial color={P.acaroPata} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/* ── HOJARASCA EN DESCOMPOSICIÓN: hojas en tres estados (fresca→parda→esqueleto)
      posadas sobre el horizonte O, fragmentándose y bajando hacia el humus. ── */
function HojarascaDescompone({ tier }) {
  const hojas = useMemo(() => {
    const r = rng(733);
    const N = tier === 'bajo' ? 8 : tier === 'medio' ? 16 : 26;
    const estados = [
      { col: P.hojaVerde, y: 0.345, r0: 0.18, r1: 0.26 }, // recién caída, arriba
      { col: P.hojaParda, y: 0.315, r0: 0.13, r1: 0.2 }, // a medio comer
      { col: P.hojaEsqueleto, y: -0.06, r0: 0.07, r1: 0.13 }, // ya casi humus, hundiéndose
    ];
    return Array.from({ length: N }, (_, i) => {
      const e = estados[i % 3];
      return {
        key: i,
        x: (r() - 0.5) * (ANCHO - 0.6),
        y: e.y - (i % 3 === 2 ? r() * 0.25 : 0),
        z: FRENTE - 0.04 - r() * (PROF - 0.6),
        giroY: r() * Math.PI,
        inclina: -Math.PI / 2 + (r() - 0.5) * 0.5,
        s: e.r0 + r() * (e.r1 - e.r0),
        col: e.col,
        segs: i % 3 === 2 ? 3 : 5, // las esqueletizadas, más rotas
      };
    });
  }, [tier]);
  return (
    <group>
      {hojas.map((h) => (
        <mesh key={`hd-${h.key}`} position={[h.x, h.y, h.z]} rotation={[h.inclina, h.giroY, 0]}>
          <circleGeometry args={[h.s, h.segs]} />
          <meshLambertMaterial color={h.col} flatShading side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/* ── etiqueta didáctica de bicho (píldora billboard, reutiliza el chrome) ────── */
function EtiquetaVida({ pos, emoji, texto }) {
  return (
    <Html position={pos} center distanceFactor={12} zIndexRange={[28, 0]}>
      <span className="suelo-bicho">
        <span className="suelo-bicho__emoji" aria-hidden="true">{emoji}</span>
        {texto}
      </span>
    </Html>
  );
}

/* ── El agua que se infiltra: gotas instanciadas que bajan por el perfil ───── *
   Nacen en la superficie, descienden de horizonte a horizonte y reaparecen
   arriba (ciclo). En modo "riego" bajan más y más rápido. reducedMotion las deja
   repartidas y quietas a lo largo de la columna (presencia sin movimiento). */
function AguaInfiltra({ n, riego, reducedMotion }) {
  const ref = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const datos = useMemo(() => {
    const r = rng(211);
    return Array.from({ length: n }, () => ({
      x: (r() - 0.5) * (ANCHO - 0.8),
      z: FRENTE - 0.05 - r() * (PROF - 0.6),
      s: 0.045 + r() * 0.04,
      fase: r(),
      vel: 0.5 + r() * 0.5,
    }));
  }, [n]);

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const c = new THREE.Color(P.agua);
    datos.forEach((d, i) => {
      const y = 0.3 - d.fase * (0.3 - Y_FONDO); // repartidas por la columna
      dummy.position.set(d.x, y, d.z);
      dummy.scale.set(d.s, d.s * 1.5, d.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [datos, dummy]);

  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const t = state.clock.elapsedTime;
    const alto = 0.3 - Y_FONDO; // recorrido total de la gota
    const ritmo = riego ? 0.5 : 0.22;
    for (let i = 0; i < datos.length; i++) {
      const d = datos[i];
      const p = ((t * ritmo * d.vel + d.fase) % 1 + 1) % 1;
      // cae más lento cerca del fondo (el agua se remansa en el saprolito)
      const eased = p < 0.85 ? p / 0.85 * 0.9 : 0.9 + (p - 0.85) / 0.15 * 0.1;
      const y = 0.3 - eased * alto;
      dummy.position.set(d.x + Math.sin(t * d.vel + d.fase * 9) * 0.02, y, d.z);
      dummy.scale.set(d.s, d.s * (1.6 - p * 0.4), d.s);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      <sphereGeometry args={[1, 7, 6]} />
      <meshLambertMaterial transparent opacity={0.82} color={P.agua} />
    </instancedMesh>
  );
}

/* ── Pin didáctico de horizonte (billboard: insignia con la letra + nombre) ── */
function PinHorizonte({ pos, letra, nombre, sub, color }) {
  return (
    <Html position={pos} center distanceFactor={13} zIndexRange={[30, 0]}>
      <span className="suelo-pin">
        <span className="suelo-pin__badge" style={{ background: color }}>{letra}</span>
        <span className="suelo-pin__txt">
          {nombre}
          <small>{sub}</small>
        </span>
      </span>
    </Html>
  );
}

/* ── La muestra ampliada: se reutiliza el diorama del framework como "lo que se
      vería de cerca". Va sobre un pedestal, a la derecha del perfil, con su
      etiqueta. No monta en gama baja (segunda escena = más draw calls). ── */
function MuestraAmpliada({ tier, reducedMotion, vida }) {
  return (
    <group position={[6.9, -0.9, 0.4]}>
      {/* pedestal de la muestra */}
      <mesh position={[0, -1.35, 0]}>
        <cylinderGeometry args={[1.15, 1.35, 0.5, 8]} />
        <meshLambertMaterial color={P.subsuelo} flatShading />
      </mesh>
      {/* halo cálido de "bajo la lupa" */}
      <mesh position={[0, 0.1, -0.9]}>
        <circleGeometry args={[1.9, 32]} />
        <meshBasicMaterial color={DORADA.luz} transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <group scale={0.62}>
        <DioramaMicrofaunaSuelo tier={tier} reducedMotion={reducedMotion} vida={vida} mostrarNombres={false} />
      </group>
      <Html position={[0, 1.7, 0]} center distanceFactor={13} zIndexRange={[30, 0]}>
        <span className="suelo-lupa">
          <span className="suelo-lupa__emoji" aria-hidden="true">🔬</span>
          La vida que no se ve
        </span>
      </Html>
    </group>
  );
}

/* La escena completa (grupo r3f interno; el default la monta en su Canvas). */
function EscenaSuelo({ tier, reducedMotion, riego }) {
  const perfil = perfilDeTier(tier);
  const hx = -1.4; // dónde nace la planta héroe (y su raíz)
  const maxDepth = tier === 'bajo' ? 2 : 3;
  const nGotas = tier === 'alto' ? 26 : tier === 'medio' ? 16 : 8;
  const vidaMuestra = riego ? 1 : 0.82;

  return (
    <>
      <color attach="background" args={[DORADA.fondo]} />
      {perfil.fog && <fog attach="fog" args={[DORADA.niebla, 16, 46]} />}
      <LucesDoradas />
      <SolBajo />

      <BloqueHorizontes tier={tier} />
      {/* la hojarasca en descomposición: hoja fresca → parda → esqueleto → humus */}
      <HojarascaDescompone tier={tier} />
      <PlantaHeroe hx={hx} reducedMotion={reducedMotion} />
      <SistemaRaiz hx={hx} maxDepth={maxDepth} reducedMotion={reducedMotion} />

      {/* LOMBRICES: el SVG de la casa asomando por sus túneles en el humus */}
      <LombrizBillboard pos={[1.5, -0.62, FRENTE + 0.02]} giro={-14} fase={0} reducedMotion={reducedMotion} />
      {tier !== 'bajo' && (
        <LombrizBillboard pos={[-0.35, -1.12, FRENTE + 0.01]} giro={24} fase={2.1} px={58} factor={2.4} reducedMotion={reducedMotion} />
      )}

      {/* ESCARABAJO ESTERCOLERO: rueda su bola de abono por la superficie */}
      <EscarabajoBillboard base={[2.5, 0.52, FRENTE + 0.05]} reducedMotion={reducedMotion} />

      {/* HONGOS descomponedores + micelio: comen la hoja muerta y la hacen humus */}
      <Hongos base={[-3.0, 0.33, FRENTE - 0.35]} n={tier === 'bajo' ? 2 : tier === 'medio' ? 3 : 4} reducedMotion={reducedMotion} />
      {tier === 'alto' && (
        <Hongos base={[0.7, 0.33, FRENTE - 0.55]} n={2} reducedMotion={reducedMotion} />
      )}

      {/* HORMIGAS en fila por su túnel (airean el suelo, bajan materia orgánica) */}
      {tier !== 'bajo' && (
        <HormigasEnFila n={tier === 'alto' ? 5 : 3} reducedMotion={reducedMotion} />
      )}

      {/* ÁCAROS estilizados caminando por la hojarasca */}
      <AcaroSuelo base={[-2.0, 0.36, FRENTE - 0.1]} escala={1} fase={0.4} reducedMotion={reducedMotion} />
      {tier !== 'bajo' && (
        <AcaroSuelo base={[3.2, -0.28, FRENTE - 0.05]} escala={0.85} fase={2.7} reducedMotion={reducedMotion} />
      )}

      <AguaInfiltra n={nGotas} riego={riego} reducedMotion={reducedMotion} />

      {/* los pines de los cinco horizontes, a la izquierda del corte */}
      {HORIZONTES.map((h) => (
        <PinHorizonte
          key={h.id}
          pos={[-ANCHO / 2 - 0.35, (h.top + h.bot) / 2, FRENTE - 0.2]}
          letra={h.id}
          nombre={h.nombre}
          sub={h.sub}
          color={h.color}
        />
      ))}

      {/* etiquetas de la vida del suelo (solo en gama alta, para no recargar) */}
      {tier === 'alto' && (
        <>
          <EtiquetaVida pos={[1.5, -0.2, FRENTE + 0.2]} emoji="🪱" texto="Lombriz" />
          <EtiquetaVida pos={[2.5, 0.95, FRENTE + 0.2]} emoji="🪲" texto="Escarabajo" />
          <EtiquetaVida pos={[-3.0, 0.85, FRENTE - 0.2]} emoji="🍄" texto="Hongos" />
          <EtiquetaVida pos={[3.2, 0.25, FRENTE + 0.2]} emoji="🐜" texto="Hormigas" />
          <EtiquetaVida pos={[hx + 0.9, -1.7, FRENTE]} emoji="🌸" texto="Nódulos (nitrógeno)" />
        </>
      )}

      {/* la muestra ampliada: la micro-fauna del framework, reutilizada */}
      {tier !== 'bajo' && <MuestraAmpliada tier={tier} reducedMotion={reducedMotion} vida={vidaMuestra} />}

      {/* polvo dorado en suspensión sobre la superficie (kit de partículas) */}
      <ParticulasAmbientales
        tipo="polvo"
        tier={tier}
        reducedMotion={reducedMotion}
        position={[0, 0.5, 1.2]}
        area={[ANCHO, 2.2, PROF]}
        semilla={19}
      />
    </>
  );
}

/* Estilos de ESTA escena (chrome DOM sobre el Canvas). */
const CSS_SUELO = `
.suelo-root { position: relative; width: 100%; height: 100dvh; min-height: 320px; overflow: hidden; background: ${DORADA.fondo}; }
.suelo-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.suelo-canvas--lista { opacity: 1; }
.suelo-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.suelo-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #3a2a15; text-shadow: 0 1px 8px rgba(255,244,214,0.7); font: 700 1.18rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.suelo-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.82; margin-top: 0.15rem; }
.suelo-pie { padding: 0 1rem 0.9rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem; }
.suelo-carta { margin: 0; max-width: 33rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(58,42,21,0.64); backdrop-filter: blur(3px); color: #fbf3e2; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.suelo-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(58,42,21,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(255,247,228,0.82); color: #533a17; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.suelo-boton:hover, .suelo-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(58,42,21,0.6); outline: none; }
.suelo-boton[aria-pressed='true'] { background: #cfe6f2; border-color: rgba(43,92,112,0.7); color: #234a5c; }
.suelo-pin { display: inline-flex; align-items: center; gap: 0.4rem; white-space: nowrap; user-select: none; }
.suelo-pin__badge { display: inline-grid; place-items: center; width: 1.5rem; height: 1.5rem; border-radius: 50%; color: #fbf3e2; font: 800 0.85rem/1 system-ui, sans-serif; box-shadow: 0 1px 6px rgba(0,0,0,0.35); border: 1.5px solid rgba(255,247,228,0.65); }
.suelo-pin__txt { display: inline-flex; flex-direction: column; color: #3a2a15; font: 700 0.8rem/1.05 system-ui, sans-serif; text-shadow: 0 1px 5px rgba(255,244,214,0.85); }
.suelo-pin__txt small { font: 500 0.62rem/1.1 system-ui, sans-serif; opacity: 0.8; }
.suelo-lupa { display: inline-flex; align-items: center; gap: 0.35rem; white-space: nowrap; padding: 0.22rem 0.6rem; border-radius: 999px; background: rgba(58,42,21,0.7); color: #fbf3e2; font: 700 0.72rem/1.1 system-ui, sans-serif; box-shadow: 0 1px 6px rgba(0,0,0,0.3); }
.suelo-lupa__emoji { font-size: 0.85rem; }
.suelo-bicho { display: inline-flex; align-items: center; gap: 0.28rem; white-space: nowrap; user-select: none; padding: 0.14rem 0.5rem; border-radius: 999px; background: rgba(255,247,228,0.86); color: #4a3416; font: 700 0.64rem/1.1 system-ui, sans-serif; box-shadow: 0 1px 5px rgba(58,42,21,0.28); border: 1px solid rgba(58,42,21,0.28); }
.suelo-bicho__emoji { font-size: 0.78rem; }
@media (prefers-reduced-motion: reduce) { .suelo-canvas { transition: none; } }
`;

/* La copia didáctica: en calma, la invitación; con riego, la lección del ciclo. */
const COPY_CALMA =
  'El suelo no es tierra muerta: es un cuerpo vivo. Baje por el corte —de la hojarasca a la roca madre— y vea la lombriz, el escarabajo, las hormigas, los hongos que descomponen la hoja y los nódulos que fijan nitrógeno en la raíz del frijol. Toque el botón para regar.';
const COPY_RIEGO =
  'El agua entra por la hojarasca, baja por el humus abrazando las raíces y se remansa en el subsuelo. Un suelo vivo la guarda como una esponja; uno muerto la deja correr. Por eso se cuida el suelo: es la base de todo.';

/**
 * MundoSueloVivo3D — el perfil del suelo vivo, montable con su propio `<Canvas>`.
 * Sin lógica de negocio: es una vitrina educativa. El tier y reduced-motion se
 * detectan aquí (mockup standalone), igual que sus pares (agua, páramo).
 */
export default function MundoSueloVivo3D() {
  const [listo, setListo] = useState(false);
  const [riego, setRiego] = useState(false);
  const tier = useMemo(() => decidirTier().tier, []);
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const perfil = perfilDeTier(tier);

  return (
    <section
      className="suelo-root"
      data-tier={tier}
      aria-label="El suelo vivo en corte: los cinco horizontes, las raíces, los hongos y la micro-fauna del suelo agroecológico"
    >
      <style>{CSS_SUELO}</style>
      <Canvas
        className={`suelo-canvas${listo ? ' suelo-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [5.5, 1.6, 9], fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <EscenaSuelo tier={tier} reducedMotion={reducedMotion} riego={riego} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={6}
          maxDistance={18}
          target={[0.6, -1.9, 0]}
          minPolarAngle={0.45}
          maxPolarAngle={1.5}
          minAzimuthAngle={-1.0}
          maxAzimuthAngle={1.2}
          enableDamping
          dampingFactor={0.08}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.12}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      <div className="suelo-chrome">
        <h2 className="suelo-titulo">
          El suelo vivo: la base de todo
          <small>Corte de perfil — lombrices, escarabajos, hormigas, hongos, ácaros y raíces con nódulos, de la hojarasca a la roca madre</small>
        </h2>
        <div className="suelo-pie">
          <button
            type="button"
            className="suelo-boton"
            aria-pressed={riego}
            onClick={() => setRiego((v) => !v)}
          >
            {riego ? 'Ver el suelo en calma' : 'Regar y ver cómo baja el agua'}
          </button>
          <p className="suelo-carta" role="status">
            {riego ? COPY_RIEGO : COPY_CALMA}
          </p>
        </div>
      </div>
    </section>
  );
}
