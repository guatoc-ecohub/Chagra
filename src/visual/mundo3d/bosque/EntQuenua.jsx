/*
 * EntQuenua — el ENT del páramo en 3D real (queñua / colorado, *Polylepis*).
 *
 * NO es un billboard ni un SVG plano: son MALLAS three de verdad. Tronco
 * retorcido y nudoso (TubeGeometry sobre una curva sinuosa, con taper de raigón
 * y desplazamiento de corteza), ramas torcidas, raíces que agarran la tierra,
 * copa de cientos de hojitas verde-plateadas (InstancedMesh, barato) y —el alma—
 * un ROSTRO tallado en la madera: ojos hundidos con brillo, cejas de corteza y
 * una boca-grieta sabia. La corteza rojiza que se pela va en vertexColors
 * (procedural, cero texturas externas).
 *
 * EL ROSTRO ES EL APROBADO (v1): majestuoso y sereno, con la chispa de vida en
 * los ojos y la boca-grieta ancestral. Los experimentos posteriores de labios,
 * mandíbula parlante y barba de musgo se DESCARTARON (no le hacían justicia);
 * si algún día vuelve el habla, va detrás de un prop opt-in, no por defecto.
 *
 * Vida: el árbol se mece lento y con peso desde la raíz, la copa se mece con
 * desfase (viento del páramo) y los ojos parpadean despacio. Ancestral, no
 * rígido. Tier-safe: 'alto' pleno (PBR, facetado, más hojas), 'medio'/'bajo'
 * frugales (Lambert, menos hojas); `reducedMotion` lo deja QUIETO.
 *
 * `señala` (opt-in): monta el BRAZO MAESTRO que apunta al subsuelo — el gesto
 * pedagógico del mundo Ent-maestro. Los demás mundos no lo montan.
 *
 * Componente r3f: montar SOLO dentro de un <Canvas> (importa three).
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  paramsDeTier,
  geometriaTronco,
  tuboOrganico,
  specsRamas,
  specsRaices,
  taperLineal,
  clustersCopa,
  hojasDeCluster,
  colorHoja,
  anclaRostro,
  anclaBrazo,
  factorParpadeo,
  CORTEZA,
} from './entQuenua.geom.js';

/* Una nube de hojitas instanciada, mecida como grupo (viento en la copa). */
function ClusterHojas({ cluster, geo, mat, reducedMotion, fase }) {
  const grupoRef = useRef(null);
  const meshRef = useRef(null);
  const hojas = useMemo(() => hojasDeCluster(cluster), [cluster]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    for (let i = 0; i < hojas.length; i++) {
      const h = hojas[i];
      p.set(h.pos[0], h.pos[1], h.pos[2]);
      e.set(h.rot[0], h.rot[1], h.rot[2]);
      q.setFromEuler(e);
      s.setScalar(h.escala);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, colorHoja(h.tono));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [hojas]);

  useFrame((state) => {
    const g = grupoRef.current;
    if (!g || reducedMotion) return;
    const t = state.clock.elapsedTime;
    g.rotation.z = Math.sin(t * 0.7 + fase) * 0.06;
    g.rotation.x = Math.sin(t * 0.55 + fase * 1.3) * 0.045;
    g.position.y = cluster.center.y + Math.sin(t * 0.6 + fase) * 0.04;
  });

  return (
    <group ref={grupoRef} position={cluster.center}>
      <instancedMesh ref={meshRef} args={[geo, mat, hojas.length]} frustumCulled={false} castShadow />
    </group>
  );
}

/* El rostro tallado APROBADO: ojos hundidos + brillo, cejas de corteza,
   boca-grieta. Sereno y majestuoso — la vida está en el parpadeo y la chispa. */
function Rostro({ matOjo, matBrillo, matCorteza, matGrieta, blinkRefs }) {
  const { centro, radio } = useMemo(() => anclaRostro(7), []);
  // Superficie frontal del tronco a la altura de la mirada (mira al +Z).
  const frente = radio * 0.9;

  const bocaGeo = useMemo(() => {
    // Boca larga y grave, con una comisura que baja apenas (gesto ancestral).
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.26, -0.30, 0.0),
      new THREE.Vector3(-0.09, -0.37, 0.03),
      new THREE.Vector3(0.09, -0.375, 0.03),
      new THREE.Vector3(0.26, -0.29, 0.0),
    ], false, 'catmullrom', 0.5);
    return new THREE.TubeGeometry(curve, 24, 0.03, 7, false);
  }, []);

  const Ojo = ({ x, refKey }) => (
    <group position={[x, 0.06, frente - 0.05]} ref={blinkRefs[refKey]}>
      {/* cuenca hundida: gran cavidad oscura empotrada en la corteza */}
      <mesh position={[0, 0, -0.03]} scale={[1.3, 1.5, 0.55]}>
        <sphereGeometry args={[0.15, 16, 14]} />
        <primitive object={matGrieta} attach="material" />
      </mesh>
      {/* globo del ojo: oscuro, con brillo húmedo */}
      <mesh position={[0, 0, 0.05]}>
        <sphereGeometry args={[0.115, 18, 16]} />
        <primitive object={matOjo} attach="material" />
      </mesh>
      {/* la chispa de vida (grande y clara) */}
      <mesh position={[x > 0 ? 0.038 : 0.03, 0.045, 0.15]}>
        <sphereGeometry args={[0.026, 10, 10]} />
        <primitive object={matBrillo} attach="material" />
      </mesh>
    </group>
  );

  return (
    <group position={[centro.x, centro.y, centro.z]} scale={[1.5, 1.55, 1.15]}>
      <Ojo x={-0.24} refKey="izq" />
      <Ojo x={0.24} refKey="der" />

      {/* cejas de corteza: crestas gruesas e inclinadas, ceño sabio/severo */}
      <mesh position={[-0.24, 0.24, frente + 0.01]} rotation={[0, 0, -0.34]}>
        <boxGeometry args={[0.34, 0.085, 0.13]} />
        <primitive object={matCorteza} attach="material" />
      </mesh>
      <mesh position={[0.24, 0.24, frente + 0.01]} rotation={[0, 0, 0.34]}>
        <boxGeometry args={[0.34, 0.085, 0.13]} />
        <primitive object={matCorteza} attach="material" />
      </mesh>

      {/* caballete de la nariz: nudo vertical entre los ojos */}
      <mesh position={[0, -0.09, frente + 0.04]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[0.1, 0.4, 0.12]} />
        <primitive object={matCorteza} attach="material" />
      </mesh>
      {/* pómulos/bolsas bajo los ojos: dan edad y peso al rostro */}
      <mesh position={[-0.24, -0.12, frente]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.26, 0.07, 0.1]} />
        <primitive object={matCorteza} attach="material" />
      </mesh>
      <mesh position={[0.24, -0.12, frente]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.26, 0.07, 0.1]} />
        <primitive object={matCorteza} attach="material" />
      </mesh>

      {/* la boca-grieta */}
      <mesh position={[0, 0, frente]} geometry={bocaGeo}>
        <primitive object={matGrieta} attach="material" />
      </mesh>
    </group>
  );
}

/* El BRAZO MAESTRO: una rama-brazo que sale del fuste, se estira hacia afuera y
   BAJA, y termina en una MANO cuyo índice SEÑALA el subsuelo. Es el gesto
   pedagógico — con él el Ent abre y enseña las capas del suelo. Opt-in (`señala`):
   los demás mundos (bosque, micorrizas) no lo montan. */
function BrazoMaestro({ P, matCorteza, matCortezaLisa, reducedMotion }) {
  const grupoRef = useRef(null);
  const { curva, muñeca } = useMemo(() => {
    const hombro = anclaBrazo(0.47, 7);
    const pts = [
      hombro.clone(),
      hombro.clone().add(new THREE.Vector3(0.5, 0.0, 0.32)),
      hombro.clone().add(new THREE.Vector3(1.1, -0.65, 0.9)), // codo
      hombro.clone().add(new THREE.Vector3(1.7, -1.7, 1.5)), // el antebrazo baja
      hombro.clone().add(new THREE.Vector3(1.95, -2.35, 1.9)), // muñeca sobre el suelo
    ];
    const c = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    return { curva: c, muñeca: pts[pts.length - 1].clone() };
  }, []);
  const brazoGeo = useMemo(
    () => tuboOrganico(curva, {
      tubular: Math.max(20, Math.round(P.tubular * 0.4)),
      radial: Math.max(6, P.radial - 4),
      taperFn: taperLineal(0.32, 0.11),
      dispAmp: 0.7,
      seedAng: 3,
    }),
    [curva, P.tubular, P.radial],
  );
  useLayoutEffect(() => () => brazoGeo.dispose(), [brazoGeo]);
  useFrame((st) => {
    if (reducedMotion || !grupoRef.current) return;
    const t = st.clock.elapsedTime;
    // respira mientras enseña: el brazo se mece apenas
    grupoRef.current.rotation.z = Math.sin(t * 0.6) * 0.02;
    grupoRef.current.position.y = Math.sin(t * 0.5 + 0.5) * 0.03;
  });
  return (
    <group ref={grupoRef}>
      <mesh geometry={brazoGeo} material={matCorteza} castShadow receiveShadow />
      {/* LA MANO en la muñeca */}
      <group position={[muñeca.x, muñeca.y, muñeca.z]}>
        {/* palma: nudo aplanado */}
        <mesh rotation={[0.5, 0, 0]}>
          <boxGeometry args={[0.2, 0.12, 0.22]} />
          <primitive object={matCortezaLisa} attach="material" />
        </mesh>
        {/* ÍNDICE: el dedo largo que SEÑALA el suelo (abajo y adelante) */}
        <mesh position={[0.02, -0.16, 0.16]} rotation={[Math.PI - 0.55, 0, 0]}>
          <coneGeometry args={[0.045, 0.5, 6]} />
          <primitive object={matCortezaLisa} attach="material" />
        </mesh>
        {/* nudillo del índice */}
        <mesh position={[0.02, -0.05, 0.12]}>
          <sphereGeometry args={[0.05, 8, 7]} />
          <primitive object={matCortezaLisa} attach="material" />
        </mesh>
        {/* los otros tres dedos: cortos y recogidos (apuntan al frente) */}
        {[-0.07, 0.0, 0.07].map((dx, i) => (
          <mesh key={i} position={[dx, -0.12, -0.02]} rotation={[Math.PI - 1.4, 0, 0]}>
            <coneGeometry args={[0.032, 0.2, 5]} />
            <primitive object={matCortezaLisa} attach="material" />
          </mesh>
        ))}
        {/* pulgar: nudo lateral */}
        <mesh position={[-0.11, -0.02, 0.05]} rotation={[0, 0, 0.9]}>
          <coneGeometry args={[0.035, 0.16, 5]} />
          <primitive object={matCortezaLisa} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

/**
 * El Ent de la queñua. Montar dentro de un <Canvas>.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, señala?: boolean}} props
 *   `señala`: monta el BRAZO MAESTRO que apunta al subsuelo (mundo Ent-maestro).
 */
export default function EntQuenua({ tier = 'alto', reducedMotion = false, señala = false }) {
  const P = paramsDeTier(tier);
  const swayRef = useRef(null);
  const ojoIzq = useRef(null);
  const ojoDer = useRef(null);

  // --- Geometrías (una vez) ---
  const troncoGeo = useMemo(() => geometriaTronco(P, 7), [P]);
  const ramas = useMemo(() => specsRamas(P.ramas, 21), [P.ramas]);
  const ramasGeo = useMemo(
    () => ramas.map((r) => tuboOrganico(r.curve, {
      tubular: Math.max(18, Math.round(P.tubular * 0.4)),
      radial: Math.max(6, P.radial - 4),
      taperFn: taperLineal(r.r0, 0.04),
      dispAmp: 0.8,
      seedAng: r.tBase * 10,
    })),
    [ramas, P.tubular, P.radial],
  );
  const raices = useMemo(() => specsRaices(P.raices, 33), [P.raices]);
  const raicesGeo = useMemo(
    () => raices.map((r, i) => tuboOrganico(r.curve, {
      tubular: 18,
      radial: Math.max(6, P.radial - 5),
      taperFn: taperLineal(r.r0, 0.05),
      dispAmp: 0.7,
      seedAng: i,
    })),
    [raices, P.radial],
  );
  const clusters = useMemo(
    () => clustersCopa(ramas.map((r) => r.punta), P, 51),
    [ramas, P],
  );

  // --- Materiales (una vez) ---
  // Corteza SUAVE (flatShading off): el relieve de surcos/nudos es geometría
  // real; el sombreado liso evita el "acordeón" de anillos del tubo y deja una
  // corteza orgánica. El facetado se reserva para las hojitas (matHoja).
  const matCorteza = useMemo(() => {
    const base = { vertexColors: true, flatShading: false };
    return P.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.94, metalness: 0.0 })
      : new THREE.MeshLambertMaterial(base);
  }, [P.materialRico]);

  const matCortezaLisa = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ color: CORTEZA.cuerpo, roughness: 0.9 })
      : new THREE.MeshLambertMaterial({ color: CORTEZA.cuerpo })),
    [P.materialRico],
  );
  const matGrieta = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ color: '#20130d', roughness: 0.8 })
      : new THREE.MeshLambertMaterial({ color: '#20130d' })),
    [P.materialRico],
  );
  const matOjo = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ color: '#120d0a', roughness: 0.18, metalness: 0.1 })
      : new THREE.MeshLambertMaterial({ color: '#161010' })),
    [P.materialRico],
  );
  const matBrillo = useMemo(() => new THREE.MeshBasicMaterial({ color: '#eef4e8' }), []);
  const matHoja = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.0, flatShading: true })
      : new THREE.MeshLambertMaterial({})),
    [P.materialRico],
  );
  const hojaGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);

  // Liberar GPU al desmontar (geometrías y materiales procedurales).
  useLayoutEffect(() => () => {
    troncoGeo.dispose();
    ramasGeo.forEach((g) => g.dispose());
    raicesGeo.forEach((g) => g.dispose());
    hojaGeo.dispose();
    [matCorteza, matCortezaLisa, matGrieta, matOjo, matBrillo, matHoja].forEach((m) => m.dispose());
  }, [troncoGeo, ramasGeo, raicesGeo, hojaGeo, matCorteza, matCortezaLisa, matGrieta, matOjo, matBrillo, matHoja]);

  // --- Vida: balanceo pesado + parpadeo lento ---
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    if (swayRef.current) {
      swayRef.current.rotation.z = Math.sin(t * 0.45) * 0.018;
      swayRef.current.rotation.x = Math.sin(t * 0.37 + 1.1) * 0.012;
    }
    const b = factorParpadeo(t);
    if (ojoIzq.current) ojoIzq.current.scale.y = b;
    if (ojoDer.current) ojoDer.current.scale.y = b;
  });

  return (
    <group>
      {/* raíces plantadas (fuera del balanceo: agarran la tierra) */}
      {raicesGeo.map((g, i) => (
        <mesh key={`raiz-${i}`} geometry={g} material={matCorteza} castShadow receiveShadow />
      ))}

      {/* tronco + ramas + rostro + copa: se mecen desde la base */}
      <group ref={swayRef}>
        <mesh geometry={troncoGeo} material={matCorteza} castShadow receiveShadow />
        {ramasGeo.map((g, i) => (
          <mesh key={`rama-${i}`} geometry={g} material={matCorteza} castShadow receiveShadow />
        ))}

        <Rostro
          matOjo={matOjo}
          matBrillo={matBrillo}
          matCorteza={matCortezaLisa}
          matGrieta={matGrieta}
          blinkRefs={{ izq: ojoIzq, der: ojoDer }}
        />

        {/* el BRAZO MAESTRO que señala el subsuelo (solo en el mundo Ent-maestro) */}
        {señala && (
          <BrazoMaestro
            P={P}
            matCorteza={matCorteza}
            matCortezaLisa={matCortezaLisa}
            reducedMotion={reducedMotion}
          />
        )}

        {clusters.map((c, i) => (
          <ClusterHojas
            key={`copa-${i}`}
            cluster={c}
            geo={hojaGeo}
            mat={matHoja}
            reducedMotion={reducedMotion}
            fase={i * 1.7}
          />
        ))}
      </group>
    </group>
  );
}
