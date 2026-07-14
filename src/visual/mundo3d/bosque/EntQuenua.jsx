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
 * Vida: el árbol se mece lento y con peso desde la raíz, la copa se mece con
 * desfase (viento del páramo) y los ojos parpadean despacio. Ancestral, no
 * rígido. Tier-safe: 'alto' pleno (PBR, facetado, más hojas), 'medio'/'bajo'
 * frugales (Lambert, menos hojas); `reducedMotion` lo deja QUIETO.
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

/* El rostro tallado y VIVO del guardián: ojos hundidos con MIRADA (iris cálido +
   pupila + chispa que derivan despacio, "te ve"), párpados de corteza que
   PARPADEAN de verdad (bajan sobre el ojo, no aplastan la cuenca), cejas con
   ánimo BENÉVOLO (alza que acoge más que fruncir) y una boca-grieta que murmura
   con la tierra y a ratos entibia una sonrisa: el gesto de un abuelo sabio que
   invita a acercarse. Con reducedMotion queda quieto y sereno. */
function Rostro({ matOjo, matBrillo, matIris, matCorteza, matGrieta, reducedMotion, blinkRefs }) {
  const { centro, radio } = useMemo(() => anclaRostro(7), []);
  // Superficie frontal del tronco a la altura de la mirada (mira al +Z).
  const frente = radio * 0.9;

  // Refs de los gestos: la mirada de cada ojo, las cejas, la boca y los pómulos.
  const gazeIzq = useRef(null);
  const gazeDer = useRef(null);
  const cejaIzq = useRef(null);
  const cejaDer = useRef(null);
  const bocaRef = useRef(null);
  const pomuloIzq = useRef(null);
  const pomuloDer = useRef(null);

  const bocaGeo = useMemo(() => {
    // Boca serena con las comisuras apenas ALZADAS (benévola, no severa). Se
    // centra en el origen (translate) para que ABRA en su sitio al escalar.
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.26, -0.28, 0.0),
      new THREE.Vector3(-0.09, -0.35, 0.03),
      new THREE.Vector3(0.09, -0.35, 0.03),
      new THREE.Vector3(0.26, -0.27, 0.0),
    ], false, 'catmullrom', 0.5);
    const geo = new THREE.TubeGeometry(curve, 24, 0.032, 7, false);
    geo.translate(0, 0.3125, 0); // pivote de la boca en su propio centro
    return geo;
  }, []);
  useLayoutEffect(() => () => bocaGeo.dispose(), [bocaGeo]);

  // Los GESTOS: la vida del rostro. Capas lentas y desfasadas para que nunca se
  // sienta mecánico — mira alrededor, piensa (alza/frunce), murmura, sonríe.
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    // MIRADA: deriva lenta (recorre, se detiene, vuelve). Ambos ojos juntos.
    const gx = Math.sin(t * 0.24) * 0.03 + Math.sin(t * 0.09 + 1.1) * 0.015;
    const gy = Math.sin(t * 0.17 + 0.6) * 0.018;
    if (gazeIzq.current) gazeIzq.current.position.set(gx, gy, 0.12);
    if (gazeDer.current) gazeDer.current.position.set(gx, gy, 0.12);
    // CEJAS: sesgo BENÉVOLO — la alza que acoge domina sobre el ceño sabio.
    const ceno = (Math.sin(t * 0.3) + Math.sin(t * 0.11 + 2)) * 0.5; // ~-1..1 lento
    const frunce = Math.max(0, ceno) * 0.6; // el ceño, contenido
    const alza = Math.max(0, -ceno) * 1.15; // la acogida, dominante
    if (cejaIzq.current) {
      cejaIzq.current.position.y = 0.25 + alza * 0.035 - frunce * 0.012;
      cejaIzq.current.rotation.z = -0.3 - frunce * 0.16 + alza * 0.05;
    }
    if (cejaDer.current) {
      cejaDer.current.position.y = 0.25 + alza * 0.035 - frunce * 0.012;
      cejaDer.current.rotation.z = 0.3 + frunce * 0.16 - alza * 0.05;
    }
    // SONRISA: calidez muy lenta y rara que sube comisuras y pómulos.
    const sonrisa = Math.max(0, Math.sin(t * 0.13 + 0.5)) * Math.max(0, Math.sin(t * 0.07));
    // BOCA: murmura despacio (respira / conversa con la tierra) + la sonrisa.
    if (bocaRef.current) {
      const murmur = (Math.sin(t * 1.0) + Math.sin(t * 0.47 + 1)) * 0.25 + 0.5; // 0..1
      bocaRef.current.scale.y = 1 + murmur * 0.8;
      bocaRef.current.scale.x = 1 + murmur * 0.05 + sonrisa * 0.08;
      bocaRef.current.position.y = sonrisa * 0.02;
    }
    if (pomuloIzq.current) pomuloIzq.current.position.y = -0.12 + sonrisa * 0.03;
    if (pomuloDer.current) pomuloDer.current.position.y = -0.12 + sonrisa * 0.03;
  });

  const Ojo = ({ x, refKey, gazeRef }) => (
    <group position={[x, 0.06, frente - 0.05]}>
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
      {/* LA MIRADA: iris cálido + pupila + chispa, en un grupo que deriva lento
          (el ojo "mira" alrededor). Es el mayor salto de personalidad del rostro. */}
      <group ref={gazeRef} position={[0, 0, 0.12]}>
        <mesh>
          <sphereGeometry args={[0.052, 14, 12]} />
          <primitive object={matIris} attach="material" />
        </mesh>
        {/* pupila: pozo oscuro en el centro del iris */}
        <mesh position={[0, 0, 0.032]}>
          <sphereGeometry args={[0.03, 12, 10]} />
          <primitive object={matGrieta} attach="material" />
        </mesh>
        {/* la chispa de vida (catchlight): arriba a un lado */}
        <mesh position={[0.022, 0.03, 0.05]}>
          <sphereGeometry args={[0.02, 10, 10]} />
          <primitive object={matBrillo} attach="material" />
        </mesh>
      </group>
      {/* PÁRPADO de corteza: pivota arriba y BAJA sobre el ojo al parpadear.
          En reposo queda retraído (sliver) bajo la ceja; solo baja al pestañear. */}
      <group ref={blinkRefs[refKey]} position={[0, 0.14, 0.07]} scale={[1, 0.02, 1]}>
        <mesh position={[0, -0.12, 0]} scale={[1, 1, 0.55]}>
          <sphereGeometry args={[0.135, 14, 10]} />
          <primitive object={matCorteza} attach="material" />
        </mesh>
      </group>
    </group>
  );

  return (
    <group position={[centro.x, centro.y, centro.z]} scale={[1.5, 1.55, 1.15]}>
      <Ojo x={-0.24} refKey="izq" gazeRef={gazeIzq} />
      <Ojo x={0.24} refKey="der" gazeRef={gazeDer} />

      {/* cejas de corteza: crestas inclinadas, ánimo (alza/frunce) legible a
          distancia — el guardián acoge más de lo que reprende */}
      <mesh ref={cejaIzq} position={[-0.24, 0.25, frente + 0.01]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.34, 0.085, 0.13]} />
        <primitive object={matCorteza} attach="material" />
      </mesh>
      <mesh ref={cejaDer} position={[0.24, 0.25, frente + 0.01]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.34, 0.085, 0.13]} />
        <primitive object={matCorteza} attach="material" />
      </mesh>

      {/* caballete de la nariz: nudo vertical entre los ojos */}
      <mesh position={[0, -0.09, frente + 0.04]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[0.1, 0.4, 0.12]} />
        <primitive object={matCorteza} attach="material" />
      </mesh>
      {/* pómulos/bolsas bajo los ojos: dan edad y peso; suben apenas al sonreír */}
      <mesh ref={pomuloIzq} position={[-0.24, -0.12, frente]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.26, 0.07, 0.1]} />
        <primitive object={matCorteza} attach="material" />
      </mesh>
      <mesh ref={pomuloDer} position={[0.24, -0.12, frente]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.26, 0.07, 0.1]} />
        <primitive object={matCorteza} attach="material" />
      </mesh>

      {/* la boca-grieta con cavidad oscura detrás: al murmurar se abre y se ve el
          fondo (habla). El grupo `bocaRef` se escala en su propio centro. */}
      <group position={[0, -0.3125, frente]}>
        <group ref={bocaRef}>
          {/* cavidad: pozo oscuro que asoma cuando la boca se abre */}
          <mesh position={[0, 0, -0.03]} scale={[1, 0.55, 0.4]}>
            <sphereGeometry args={[0.2, 12, 10]} />
            <primitive object={matGrieta} attach="material" />
          </mesh>
          <mesh geometry={bocaGeo}>
            <primitive object={matGrieta} attach="material" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * El Ent de la queñua. Montar dentro de un <Canvas>.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function EntQuenua({ tier = 'alto', reducedMotion = false }) {
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
          reducedMotion={reducedMotion}
          blinkRefs={{ izq: ojoIzq, der: ojoDer }}
        />

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
