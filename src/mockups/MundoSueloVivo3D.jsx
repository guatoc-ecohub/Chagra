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
 *   - una planta con su SISTEMA RADICULAR real bajando por O→A→B;
 *   - las MICORRIZAS (hifas doradas) abrazando la raíz — la sociedad hongo-raíz;
 *   - el AGUA que se infiltra desde la superficie y baja de horizonte a horizonte;
 *   - la MATERIA ORGÁNICA (hojas y motas) que se descompone hacia humus;
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
      <directionalLight position={DORADA.solPos} intensity={DORADA.sol} color={DORADA.luz} />
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
  function crecer(origen, dir, largo, radio, depth) {
    const d = dir.clone().normalize();
    const fin = origen.clone().addScaledVector(d, largo);
    raizSegs.push({ ...segmento(origen, fin), radio });
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
  return { raizSegs, hifaSegs, nodos };
}

function SistemaRaiz({ hx, maxDepth, reducedMotion }) {
  const { raizSegs, hifaSegs, nodos } = useMemo(() => generarRaiz(41, hx, maxDepth), [hx, maxDepth]);
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
    </group>
  );
}

/* ── Una lombriz en el humus: cadena de esferas con onda peristáltica ──────── */
function LombrizMacro({ base, reducedMotion }) {
  const segs = useRef([]);
  const puntos = useMemo(() => {
    const N = 8;
    return Array.from({ length: N }, (_, i) => {
      const u = i / (N - 1);
      return { x: -0.5 + u * 1.0, y: Math.sin(u * Math.PI * 1.2) * 0.14, r: 0.05 + 0.03 * Math.sin(u * Math.PI) };
    });
  }, []);
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime * 2.0;
    for (let i = 0; i < segs.current.length; i++) {
      const g = segs.current[i];
      if (!g) continue;
      const w = Math.sin(t - i * 0.55);
      g.position.y = puntos[i].y + w * 0.04;
      g.scale.set(1 - w * 0.1, 1 + w * 0.2, 1 - w * 0.1);
    }
  });
  return (
    <group position={base}>
      {puntos.map((p, i) => (
        <group key={i} ref={(el) => { segs.current[i] = el; }} position={[p.x, p.y, 0]}>
          <mesh>
            <sphereGeometry args={[p.r, 8, 6]} />
            <meshLambertMaterial color={i % 2 === 0 ? P.lombriz : P.lombrizAlt} flatShading />
          </mesh>
        </group>
      ))}
    </group>
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
      <PlantaHeroe hx={hx} reducedMotion={reducedMotion} />
      <SistemaRaiz hx={hx} maxDepth={maxDepth} reducedMotion={reducedMotion} />
      <LombrizMacro base={[1.4, -0.7, FRENTE - 0.05]} reducedMotion={reducedMotion} />
      {tier !== 'bajo' && <LombrizMacro base={[-0.2, -1.15, FRENTE - 0.15]} reducedMotion={reducedMotion} />}
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
@media (prefers-reduced-motion: reduce) { .suelo-canvas { transition: none; } }
`;

/* La copia didáctica: en calma, la invitación; con riego, la lección del ciclo. */
const COPY_CALMA =
  'El suelo no es tierra muerta: es un cuerpo vivo. Baje por el corte —de la hojarasca a la roca madre— y vea las raíces, los hongos y la vida que lo sostienen. Toque el botón para regar.';
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
  const tier = useMemo(() => decidirTier(), []);
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
          <small>Corte de perfil — de la hojarasca a la roca madre, con raíces, hongos y micro-fauna</small>
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
