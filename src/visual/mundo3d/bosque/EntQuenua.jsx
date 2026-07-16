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
  anclaBrazo,
  factorParpadeo,
  factorHabla,
  factorSonrisa,
  specsBarba,
  geometriaHebraBarba,
  BARBA,
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

/* UN OJO del Ent (a nivel de módulo, no se crea en render): recoveco de sombra +
   globo con iris ÁMBAR-MIEL grande que casi cubre el ojo (nada de pozo negro) +
   pupila y dos chispas de húmedo + párpado inferior cálido. El blink escala solo
   el globo; la mirada deriva en gazeRef. `flip` (-1/1) da una leve asimetría. */
function Ojo({ x, frente, blinkRef, gazeRef, flip, matGrieta, matOjo, matIris, matBrillo, matCresta }) {
  return (
    <group position={[x, 0.02, frente - 0.02]}>
      {/* recoveco de sombra donde SE ASIENTA el ojo (nudo de la corteza): marrón
          muy oscuro, pequeño — el ojo lo llena casi todo, NO es un agujero negro */}
      <mesh position={[0, -0.005, -0.02]} scale={[1.06, 1.14, 0.4]}>
        <sphereGeometry args={[0.115, 12, 10]} />
        <primitive object={matGrieta} attach="material" />
      </mesh>
      {/* el OJO que parpadea (globo + iris): el blink escala solo esto */}
      <group ref={blinkRef}>
        {/* globo oscuro: solo asoma como fino borde húmedo del ojo */}
        <mesh position={[0, 0, 0.055]}>
          <sphereGeometry args={[0.097, 16, 14]} />
          <primitive object={matOjo} attach="material" />
        </mesh>
        {/* LA MIRADA: iris ÁMBAR-MIEL GRANDE que casi cubre el globo → el ojo se
            lee CÁLIDO y vivo (no un pozo negro). Pupila y dos chispas de húmedo. */}
        <group ref={gazeRef} position={[0, -0.004, 0.072]}>
          <mesh>
            <sphereGeometry args={[0.085, 18, 16]} />
            <primitive object={matIris} attach="material" />
          </mesh>
          {/* pupila: pozo oscuro en el centro del iris */}
          <mesh position={[0, 0, 0.046]}>
            <sphereGeometry args={[0.038, 12, 10]} />
            <primitive object={matGrieta} attach="material" />
          </mesh>
          {/* chispa mayor (catchlight): arriba a un lado — la vida del ojo */}
          <mesh position={[0.028, 0.033, 0.064]}>
            <sphereGeometry args={[0.014, 10, 10]} />
            <primitive object={matBrillo} attach="material" />
          </mesh>
          {/* chispa menor abajo: el húmedo del ojo vivo (truco de animación) */}
          <mesh position={[-0.022, -0.028, 0.06]}>
            <sphereGeometry args={[0.006, 8, 8]} />
            <primitive object={matBrillo} attach="material" />
          </mesh>
        </group>
      </group>
      {/* párpado inferior: reborde cálido y fino que asienta el ojo (edad, bondad) */}
      <mesh position={[0, -0.082, 0.05]} rotation={[-0.28, 0, -flip * 0.14]} scale={[1.0, 0.36, 0.52]}>
        <sphereGeometry args={[0.1, 12, 8]} />
        <primitive object={matCresta} attach="material" />
      </mesh>
    </group>
  );
}

/* El rostro tallado: ojos hundidos con MIRADA viva (iris + pupila que se mueven),
   cejas de corteza que fruncen el ceño (ánimo legible) y boca-grieta que murmura
   (habla despacio con la tierra). Los gestos son sutiles y ancestrales, nunca de
   caricatura; con reducedMotion el rostro queda quieto y sereno. */
function Rostro({ matOjo, matBrillo, matIris, matCorteza, matGrieta, matPliegue, matCresta, reducedMotion, blinkRefs }) {
  const { centro, radio } = useMemo(() => anclaRostro(7), []);
  // Superficie frontal del tronco a la altura de la mirada (mira al +Z).
  const frente = radio * 0.9;

  // Refs de los gestos: la mirada (iris de cada ojo), las cejas y la boca.
  const gazeIzq = useRef(null);
  const gazeDer = useRef(null);
  const cejaIzq = useRef(null);
  const cejaDer = useRef(null);
  const mandibulaRef = useRef(null); // la mandíbula que baja al HABLAR (abre hacia abajo)
  const bocaRef = useRef(null); // el conjunto de la boca (para la sonrisa de las comisuras)

  // Los GESTOS: la vida del rostro. Capas lentas y desfasadas para que nunca se
  // sienta mecánico — mira alrededor, piensa (frunce), murmura.
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    // MIRADA: deriva lenta (recorre, se detiene, vuelve). Ambos ojos juntos.
    const gx = Math.sin(t * 0.24) * 0.03 + Math.sin(t * 0.09 + 1.1) * 0.015;
    const gy = Math.sin(t * 0.17 + 0.6) * 0.018;
    if (gazeIzq.current) gazeIzq.current.position.set(gx, gy, 0.12);
    if (gazeDer.current) gazeDer.current.position.set(gx, gy, 0.12);
    // CEJAS: ceño pensativo que sube (asombro suave) y baja (frunce sabio).
    const ceno = (Math.sin(t * 0.35) + Math.sin(t * 0.12 + 2)) * 0.5; // ~-1..1 lento
    const frunce = Math.max(0, ceno);
    const alza = Math.max(0, -ceno);
    if (cejaIzq.current) {
      cejaIzq.current.position.y = 0.14 + alza * 0.04 - frunce * 0.025;
      cejaIzq.current.rotation.z = -0.11 - frunce * 0.16;
    }
    if (cejaDer.current) {
      cejaDer.current.position.y = 0.15 + alza * 0.04 - frunce * 0.025;
      cejaDer.current.rotation.z = 0.13 + frunce * 0.16;
    }
    // BOCA: HABLA con articulaciones claras (sílabas) y SONRÍE apenas. La
    // mandíbula baja SIEMPRE hacia abajo (nunca invade la nariz); las comisuras
    // suben con la sonrisa. Gestos legibles a distancia, no un murmullo confuso.
    const abre = factorHabla(t); // 0..1 apertura
    const sonrisa = factorSonrisa(t); // 0..1
    if (mandibulaRef.current) {
      // baja el mentón (traslada + abre la cavidad hacia abajo). Parte de una
      // apertura EN REPOSO (labios apenas separados) para que la boca se lea como
      // boca aun quieta, y crece con el habla — nunca sube hacia la nariz.
      mandibulaRef.current.position.y = -0.03 - abre * 0.14;
      mandibulaRef.current.rotation.x = 0.1 + abre * 0.45;
    }
    if (bocaRef.current) {
      // la sonrisa ensancha la boca apenas y la sube un pelín (calidez de sabio)
      bocaRef.current.scale.x = 1 + sonrisa * 0.06;
      bocaRef.current.position.y = -0.44 + sonrisa * 0.015;
    }
  });

  const ojoMats = { matGrieta, matOjo, matIris, matBrillo, matCresta };

  return (
    <group position={[centro.x, centro.y, centro.z]} scale={[1.5, 1.55, 1.15]}>
      <Ojo x={-0.24} frente={frente} blinkRef={blinkRefs.izq} gazeRef={gazeIzq} flip={-1} {...ojoMats} />
      <Ojo x={0.24} frente={frente} blinkRef={blinkRefs.der} gazeRef={gazeDer} flip={1} {...ojoMats} />

      {/* CEJAS: crestas de corteza REDONDEADAS que sobresalen y ensombrecen los
          ojos (frente pesada de guardián), no tablas pegadas. Una chispa de
          corteza pelada corona cada una. Se mueven (fruncir/alzar) = el ánimo.
          Ligera asimetría izq/der para que no sea un molde. */}
      <group ref={cejaIzq} position={[-0.265, 0.14, frente + 0.055]} rotation={[0, 0, -0.11]}>
        <mesh scale={[1.75, 0.6, 1.0]}>
          <sphereGeometry args={[0.17, 14, 10]} />
          <primitive object={matCorteza} attach="material" />
        </mesh>
        <mesh position={[0, 0.07, 0.05]} scale={[1.5, 0.22, 0.5]}>
          <sphereGeometry args={[0.13, 10, 8]} />
          <primitive object={matCresta} attach="material" />
        </mesh>
      </group>
      <group ref={cejaDer} position={[0.265, 0.15, frente + 0.055]} rotation={[0, 0, 0.13]}>
        <mesh scale={[1.75, 0.6, 1.0]}>
          <sphereGeometry args={[0.17, 14, 10]} />
          <primitive object={matCorteza} attach="material" />
        </mesh>
        <mesh position={[0, 0.07, 0.05]} scale={[1.5, 0.22, 0.5]}>
          <sphereGeometry args={[0.13, 10, 8]} />
          <primitive object={matCresta} attach="material" />
        </mesh>
      </group>
      {/* SURCO del entrecejo: la arruga fina del pensamiento (guardián que medita) */}
      <mesh position={[0.01, 0.13, frente + 0.05]} rotation={[0, 0, 0.06]}>
        <boxGeometry args={[0.035, 0.16, 0.04]} />
        <primitive object={matPliegue} attach="material" />
      </mesh>

      {/* NARIZ: un LOMO redondeado de corteza que baja del entrecejo — no un cajón
          pegado, sino un nudo de la madera que crece de la cara. Deja filtrum limpio
          hasta los labios para que la boca se lea sola. */}
      <mesh position={[0, 0.0, frente + 0.05]} rotation={[0.16, 0, 0]} scale={[0.92, 2.0, 0.92]}>
        <sphereGeometry args={[0.072, 12, 12]} />
        <primitive object={matCorteza} attach="material" />
      </mesh>
      {/* cresta iluminada del caballete (corteza pelada sobre el lomo de la nariz) */}
      <mesh position={[0, 0.01, frente + 0.105]} scale={[0.9, 1.8, 0.9]}>
        <sphereGeometry args={[0.018, 8, 10]} />
        <primitive object={matCresta} attach="material" />
      </mesh>
      {/* base/punta de la nariz: nudo redondeado donde termina el caballete */}
      <mesh position={[0, -0.155, frente + 0.06]} scale={[1.05, 0.9, 1]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <primitive object={matCorteza} attach="material" />
      </mesh>
      {/* fosas nasales: dos recovecos oscuros bajo la punta (DR: sugerir, no tallar) */}
      {[-0.04, 0.04].map((nx) => (
        <mesh key={nx} position={[nx, -0.185, frente + 0.08]} scale={[0.7, 0.9, 0.7]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <primitive object={matGrieta} attach="material" />
        </mesh>
      ))}

      {/* PÓMULOS: nudos redondeados y cálidos que pegan la luz — la calidez del
          oso de anteojos. Cada uno con una chispa de corteza pelada arriba. */}
      {[-1, 1].map((s) => (
        <group key={`pom-${s}`}>
          <mesh position={[s * 0.3, -0.13, frente - 0.02]} scale={[1.5, 1.0, 0.8]}>
            <sphereGeometry args={[0.1, 12, 10]} />
            <primitive object={matCorteza} attach="material" />
          </mesh>
          <mesh position={[s * 0.32, -0.07, frente + 0.04]} scale={[1.25, 0.4, 0.55]}>
            <sphereGeometry args={[0.058, 10, 8]} />
            <primitive object={matCresta} attach="material" />
          </mesh>
        </group>
      ))}

      {/* LA BOCA — rehecha: dos LABIOS de corteza (arriba fijo, abajo en la
          MANDÍBULA que baja) con una cavidad oscura detrás. Va BIEN bajo la nariz
          (filtrum limpio) y ABRE hacia abajo → el gesto de HABLAR se lee claro y
          nunca invade la nariz. Comisuras marcadas para que la sonrisa se note. */}
      <group ref={bocaRef} position={[0, -0.44, frente]}>
        {/* cavidad oscura: el fondo de la boca (fijo). Asoma al abrir la mandíbula */}
        <mesh position={[0, -0.03, -0.05]} scale={[0.3, 0.14, 0.1]}>
          <sphereGeometry args={[1, 14, 12]} />
          <primitive object={matGrieta} attach="material" />
        </mesh>

        {/* labio SUPERIOR: cresta de corteza fija, apenas curvada hacia arriba */}
        <mesh position={[0, 0.055, 0.03]} rotation={[-0.12, 0, 0]}>
          <boxGeometry args={[0.42, 0.07, 0.14]} />
          <primitive object={matCorteza} attach="material" />
        </mesh>
        {/* comisuras: nudos en los extremos (dan a la boca su ancho y la sonrisa) */}
        {[-0.22, 0.22].map((cx) => (
          <mesh key={cx} position={[cx, 0.0, 0.03]}>
            <sphereGeometry args={[0.045, 8, 7]} />
            <primitive object={matCorteza} attach="material" />
          </mesh>
        ))}

        {/* la MANDÍBULA: labio inferior + mentón. Baja al hablar (pivota en el
            origen de este grupo, que está en la línea de los labios). */}
        <group ref={mandibulaRef}>
          <mesh position={[0, -0.07, 0.03]} rotation={[0.14, 0, 0]}>
            <boxGeometry args={[0.4, 0.08, 0.14]} />
            <primitive object={matCorteza} attach="material" />
          </mesh>
          {/* el mentón: nudo macizo bajo el labio (peso de árbol viejo) */}
          <mesh position={[0, -0.17, 0.0]}>
            <boxGeometry args={[0.3, 0.1, 0.12]} />
            <primitive object={matCorteza} attach="material" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* La BARBA de LÍQUEN (Usnea, "barba de viejo"): una cortina DENSA de mechones
   finos que cuelgan del mentón en tres capas de volumen, con gradiente raíz→punta
   (sombra→plata), más matas de liquen foliáceo prendidas arriba. Instanciada
   (2 draw-calls) para poder ser densa y barata; se mece despacio. */
function Barba({ ancla, matHebra, matTuft, densidad = 1, reducedMotion }) {
  const { centro, radio } = ancla;
  const frente = radio * 0.9;
  const { hebras, tufts } = useMemo(() => specsBarba(91), []);
  // Recorte por tier (densidad): menos hebras en gama baja, pero la SILUETA se
  // conserva (las capas se recortan por igual porque van intercaladas por seed).
  const hb = useMemo(
    () => hebras.slice(0, Math.max(10, Math.round(hebras.length * densidad))),
    [hebras, densidad],
  );
  const tf = useMemo(
    () => tufts.slice(0, Math.max(5, Math.round(tufts.length * densidad))),
    [tufts, densidad],
  );
  const hebraGeo = useMemo(() => geometriaHebraBarba(), []);
  const tuftGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  useLayoutEffect(() => () => { hebraGeo.dispose(); tuftGeo.dispose(); }, [hebraGeo, tuftGeo]);

  const hebraRef = useRef(null);
  const tuftRef = useRef(null);
  const grupoRef = useRef(null);

  useLayoutEffect(() => {
    const mesh = hebraRef.current;
    if (mesh) {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const p = new THREE.Vector3();
      const s = new THREE.Vector3();
      const col = new THREE.Color();
      for (let i = 0; i < hb.length; i++) {
        const h = hb[i];
        p.set(h.pos[0], h.pos[1], h.pos[2]);
        e.set(h.lean, h.yaw, h.tilt);
        q.setFromEuler(e);
        s.set(h.grosor, h.len, h.grosor);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
        // tinte por instancia = TONO de usnea (sage↔plateado, o leñosa). La
        // geometría trae la rampa de luminancia raíz→punta; el tono la colorea →
        // mechón pálido y plateado, más oscuro donde nace del mentón.
        if (h.woody) col.copy(BARBA.raicilla);
        else col.copy(BARBA.usnea).lerp(BARBA.usneaGris, h.tono);
        mesh.setColorAt(i, col);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    const tmesh = tuftRef.current;
    if (tmesh) {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const p = new THREE.Vector3();
      const s = new THREE.Vector3();
      const col = new THREE.Color();
      for (let i = 0; i < tf.length; i++) {
        const l = tf[i];
        p.set(l.pos[0], l.pos[1], l.pos[2]);
        s.set(l.esc * 1.6, l.esc * 0.7, l.esc * 1.1);
        m.compose(p, q, s);
        tmesh.setMatrixAt(i, m);
        col.copy(l.azul ? BARBA.liquenAzul : BARBA.liquen);
        tmesh.setColorAt(i, col);
      }
      tmesh.instanceMatrix.needsUpdate = true;
      if (tmesh.instanceColor) tmesh.instanceColor.needsUpdate = true;
    }
  }, [hb, tf]);

  useFrame((st) => {
    if (reducedMotion || !grupoRef.current) return;
    const t = st.clock.elapsedTime;
    grupoRef.current.rotation.z = Math.sin(t * 0.5) * 0.02;
    grupoRef.current.rotation.x = 0.04 + Math.sin(t * 0.4 + 1) * 0.015;
  });

  return (
    <group position={[centro.x, centro.y, centro.z]} scale={[1.5, 1.55, 1.15]}>
      <group ref={grupoRef} position={[0, 0, frente]}>
        <instancedMesh ref={hebraRef} args={[hebraGeo, matHebra, hb.length]} frustumCulled={false} />
        <instancedMesh ref={tuftRef} args={[tuftGeo, matTuft, tf.length]} frustumCulled={false} />
      </group>
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
  // Tallado del rostro por VALOR (receta del DR): matPliegue oscurece los surcos
  // (entrecejo, nasolabiales) y matCresta ilumina los cantos (cejas, caballete,
  // pómulos) con el tono de la corteza PELADA de la queñua → la cara se esculpe
  // con luz y sombra, no queda como una careta plana pegada al tronco.
  const matPliegue = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ color: CORTEZA.valle, roughness: 0.95 })
      : new THREE.MeshLambertMaterial({ color: CORTEZA.valle })),
    [P.materialRico],
  );
  const matCresta = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ color: CORTEZA.papel, roughness: 0.85 })
      : new THREE.MeshLambertMaterial({ color: CORTEZA.papel })),
    [P.materialRico],
  );
  const matOjo = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ color: '#120d0a', roughness: 0.18, metalness: 0.1 })
      : new THREE.MeshLambertMaterial({ color: '#161010' })),
    [P.materialRico],
  );
  const matBrillo = useMemo(() => new THREE.MeshBasicMaterial({ color: '#eef4e8' }), []);
  // Iris cálido y VIVO: el glow ámbar que hace que el rostro MIRE (antes el ojo
  // era una bola oscura con una chispa; con iris + pupila la mirada se lee y se
  // le puede seguir el gesto). Rico = emisivo real; frugal = básico constante.
  const matIris = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ color: '#a86c2c', emissive: '#5a3210', emissiveIntensity: 0.3, roughness: 0.45, metalness: 0.05 })
      : new THREE.MeshBasicMaterial({ color: '#a97636' })),
    [P.materialRico],
  );
  const matHoja = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.0, flatShading: true })
      : new THREE.MeshLambertMaterial({})),
    [P.materialRico],
  );
  const hojaGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);

  // Materiales de la BARBA de usnea: Lambert siempre (baratos; el líquen no pide
  // PBR). La hebra usa vertexColors (gradiente raíz→punta HORNEADO en la geometría)
  // y el instanceColor tinta cada mechón; el tuft tinta por instancia sobre blanco.
  const matHebra = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), []);
  const matTuft = useMemo(() => new THREE.MeshLambertMaterial({ color: '#ffffff' }), []);
  const ancla = useMemo(() => anclaRostro(7), []);

  // Liberar GPU al desmontar (geometrías y materiales procedurales).
  useLayoutEffect(() => () => {
    troncoGeo.dispose();
    ramasGeo.forEach((g) => g.dispose());
    raicesGeo.forEach((g) => g.dispose());
    hojaGeo.dispose();
    [matCorteza, matCortezaLisa, matGrieta, matPliegue, matCresta, matOjo, matBrillo, matIris, matHoja,
      matHebra, matTuft].forEach((m) => m.dispose());
  }, [troncoGeo, ramasGeo, raicesGeo, hojaGeo, matCorteza, matCortezaLisa, matGrieta, matPliegue, matCresta, matOjo, matBrillo, matIris, matHoja,
    matHebra, matTuft]);

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
          matIris={matIris}
          matCorteza={matCortezaLisa}
          matGrieta={matGrieta}
          matPliegue={matPliegue}
          matCresta={matCresta}
          reducedMotion={reducedMotion}
          blinkRefs={{ izq: ojoIzq, der: ojoDer }}
        />

        {/* la BARBA de usnea (siempre): cortina densa de líquen colgante */}
        <Barba
          ancla={ancla}
          matHebra={matHebra}
          matTuft={matTuft}
          densidad={P.barbaDens}
          reducedMotion={reducedMotion}
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
