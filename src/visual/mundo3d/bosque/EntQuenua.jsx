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
  specsBarba,
  geometriaHebraBarba,
  mallaRostro,
  geometriaMasaFollaje,
  specsBrazos,
  ROSTRO_BOCA_Y,
  ROSTRO_ESCALA,
  BARBA,
} from './entQuenua.geom.js';

/* Un cúmulo de la copa: la MASA de hojas con huecos (malla facetada con color
   por cara) + un FLECO de hojitas-plano sueltas sobre su superficie que rompe
   la silueta. Se mece como grupo (viento en la copa). */
function MasaFollaje({ cluster, matMasa, hojaGeo, matHoja, detalle, reducedMotion, fase }) {
  const grupoRef = useRef(null);
  const meshRef = useRef(null);
  const masaGeo = useMemo(
    () => geometriaMasaFollaje(cluster.radio, cluster.seed, detalle),
    [cluster, detalle],
  );
  useLayoutEffect(() => () => masaGeo.dispose(), [masaGeo]);
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
      if (p.lengthSq() < 1e-6) p.set(0, 1, 0);
      // la hojita vive SOBRE la masa (no flotando en el volumen): se proyecta a
      // la superficie con algo de vuelo para el despeluque natural de la copa
      p.normalize().multiplyScalar(cluster.radio * (0.78 + h.tono * 0.38));
      e.set(h.rot[0], h.rot[1], h.rot[2]);
      q.setFromEuler(e);
      s.setScalar(h.escala * 1.7);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, colorHoja(h.tono));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [hojas, cluster.radio]);

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
      <mesh geometry={masaGeo} material={matMasa} castShadow />
      <instancedMesh ref={meshRef} args={[hojaGeo, matHoja, hojas.length]} frustumCulled={false} />
    </group>
  );
}

/* UN OJO del árbol-guardián viejo: HUNDIDO en su cuenca, en sombra bajo la cornisa
   de la ceja. La lección del rechazo anterior: el ojo NO puede ser un disco
   naranja con reborde (goggles de caricatura). Aquí el globo es madera húmeda
   oscura, el IRIS ámbar-miel es CHICO (asoma desde la sombra, no llena el ojo),
   la pupila es amplia y ambos párpados son de CORTEZA — el mismo palo que el
   rostro, entrecerrados con el peso sereno de la edad. Una sola chispa húmeda da
   la vida. El blink baja el párpado; la mirada deriva en gazeRef. `flip` (-1/1)
   da la leve asimetría de la madera viva. */
function Ojo({ x, frente, blinkRef, gazeRef, flip, matGrieta, matOjo, matIris, matBrillo, matParpado }) {
  return (
    <group position={[x, -0.035, frente - 0.34]} scale={[0.94, 0.86, 0.6]}>
      {/* el POZO de la cuenca: oscuridad honda en la que se asienta el ojo. Amplio
          y profundo → el ojo vive DENTRO, no encima de la cara */}
      <mesh position={[0, -0.005, -0.03]} scale={[1.26, 1.2, 1.24]}>
        <sphereGeometry args={[0.115, 14, 12]} />
        <primitive object={matGrieta} attach="material" />
      </mesh>
      {/* el GLOBO: madera húmeda oscura, mate (sin brillo de canica). Nace
          hundido: solo la cara frontal del ojo asoma desde el pozo.
          GEOMETRÍA DEL APILADO (no romperla): el frente del iris DEBE quedar
          por delante del frente del globo Y del frente del pozo — si no, el
          ámbar queda literalmente DENTRO de las esferas oscuras y el ojo se ve
          como cuenca vacía de calavera (pasó: v1 de esta talla). Frentes hoy:
          pozo ≈ 0.113, globo ≈ 0.130, iris ≈ 0.145, pupila ≈ 0.153. */}
      <group ref={blinkRef}>
        <mesh position={[0, 0, 0.04]}>
          <sphereGeometry args={[0.09, 16, 14]} />
          <primitive object={matOjo} attach="material" />
        </mesh>
        {/* LA MIRADA: un iris ámbar-miel DISCRETO que asoma desde la sombra —
            rescoldo de fogón, no farol. Pupila amplia + una chispa de húmedo. */}
        <group ref={gazeRef} position={[0, 0.004, 0.105]}>
          <mesh scale={[1, 1, 0.65]}>
            <sphereGeometry args={[0.062, 16, 14]} />
            <primitive object={matIris} attach="material" />
          </mesh>
          {/* pupila: pozo hondo y AMPLIO en el centro del iris (mirada mansa) */}
          <mesh position={[0, 0, 0.026]} scale={[1, 1, 0.7]}>
            <sphereGeometry args={[0.031, 12, 10]} />
            <primitive object={matGrieta} attach="material" />
          </mesh>
          {/* chispa de húmedo (catchlight): mínima, arriba a un lado — la vida */}
          <mesh position={[flip * 0.021, 0.025, 0.044]}>
            <sphereGeometry args={[0.008, 8, 8]} />
            <primitive object={matBrillo} attach="material" />
          </mesh>
        </group>
      </group>
      {/* PÁRPADO SUPERIOR de CORTEZA: pesado, entrecerrado — cubre el tercio alto
          del ojo (la gravedad sabia del guardián). Del MISMO tono de madera que
          el rostro: un pliegue del árbol, no una pieza pegada. */}
      <mesh position={[0, 0.082, 0.032]} rotation={[0.7, 0, flip * 0.08]} scale={[1.24, 0.52, 0.7]}>
        <sphereGeometry args={[0.104, 14, 10]} />
        <primitive object={matParpado} attach="material" />
      </mesh>
      {/* párpado inferior: reborde discreto de la misma corteza (edad, bondad) */}
      <mesh position={[0, -0.08, 0.028]} rotation={[-0.35, 0, -flip * 0.1]} scale={[1.08, 0.4, 0.6]}>
        <sphereGeometry args={[0.095, 12, 8]} />
        <primitive object={matParpado} attach="material" />
      </mesh>
    </group>
  );
}

/* El rostro que EMERGE de la madera: una cáscara DENSA tallada sobre el propio
   tronco (sigue su curva, su taper y su corteza) donde el relieve es geometría
   real — frente pesada, cejas-cornisa, cuencas hondas, nariz de nudo, boca-grieta,
   mentón macizo — con el valor pintado en vertex colors (huecos en sombra, crestas
   de corteza pelada). Los ojos ámbar viven HUNDIDOS en las cuencas, encapuchados
   por la cornisa. La mandíbula es la parte baja de la misma cáscara y pivota
   apenas al murmurar. Gestos mínimos y con peso: un ser ancestral, no caricatura;
   con reducedMotion queda quieto y sereno. */
function Rostro({ P, matCorteza, matOjo, matBrillo, matIris, matGrieta, matParpado, reducedMotion, blinkRefs }) {
  const { centro, radio } = useMemo(() => anclaRostro(7), []);
  // Superficie frontal del tronco a la altura de la mirada (mira al +Z).
  const frente = radio * 0.9;
  const { cara, mandibula } = useMemo(() => mallaRostro(P, 7), [P]);
  useLayoutEffect(() => () => {
    cara.dispose();
    mandibula.dispose();
  }, [cara, mandibula]);

  const gazeIzq = useRef(null);
  const gazeDer = useRef(null);
  const mandibulaRef = useRef(null);

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    // MIRADA: deriva lenta (recorre, se detiene, vuelve). Ambos ojos juntos.
    const gx = Math.sin(t * 0.24) * 0.03 + Math.sin(t * 0.09 + 1.1) * 0.015;
    const gy = Math.sin(t * 0.17 + 0.6) * 0.018;
    // OJO con la z: 0.105 es la MISMA z base del grupo de la mirada en <Ojo>.
    // Antes este frame escribía 0.072 (< frente del globo) y con la animación
    // encendida el iris se HUNDÍA dentro de la esfera oscura: ojos de calavera
    // solo en vivo, nunca en la captura con reducedMotion. Bug silencioso.
    if (gazeIzq.current) gazeIzq.current.position.set(gx, gy - 0.004, 0.105);
    if (gazeDer.current) gazeDer.current.position.set(gx, gy - 0.004, 0.105);
    // HABLA: la mandíbula de madera pivota despacio — murmullo de árbol viejo,
    // nunca un chasquido. La grieta se abre y asoma la cavidad oscura.
    const abre = factorHabla(t);
    if (mandibulaRef.current) mandibulaRef.current.rotation.x = 0.015 + abre * 0.11;
  });

  const ojoMats = { matGrieta, matOjo, matIris, matBrillo, matParpado };

  return (
    <group position={[centro.x, centro.y, centro.z]} scale={ROSTRO_ESCALA}>
      {/* la cavidad oscura tras la boca-grieta: al abrirse se ve hondura, no tronco.
          Discreta — si se agranda vuelve la franja negra de teatro bajo la nariz */}
      <mesh position={[0, ROSTRO_BOCA_Y - 0.02, frente - 0.16]} scale={[0.29, 0.1, 0.13]}>
        <sphereGeometry args={[1, 14, 12]} />
        <primitive object={matGrieta} attach="material" />
      </mesh>

      {/* la CÁSCARA tallada: el rostro emerge del tronco, no se le pega encima */}
      <mesh geometry={cara} material={matCorteza} castShadow receiveShadow />
      <group ref={mandibulaRef} position={[0, ROSTRO_BOCA_Y, 0]}>
        <mesh geometry={mandibula} material={matCorteza} castShadow receiveShadow />
      </group>

      {/* los OJOS ámbar, hundidos en sus cuencas bajo la cornisa de las cejas */}
      <Ojo x={-0.24} frente={frente} blinkRef={blinkRefs.izq} gazeRef={gazeIzq} flip={-1} {...ojoMats} />
      <Ojo x={0.24} frente={frente} blinkRef={blinkRefs.der} gazeRef={gazeDer} flip={1} {...ojoMats} />
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
  // El musgo de las cejas NO se recorta por tier (va al final de la lista y un
  // slice ciego lo borraría entero): las cejas de musgo son un rasgo del rostro,
  // no relleno. Solo el liquen de la barba se adelgaza en gama baja.
  const tf = useMemo(() => {
    const liquen = tufts.filter((t) => !t.musgo);
    const musgo = tufts.filter((t) => t.musgo);
    return [...liquen.slice(0, Math.max(5, Math.round(liquen.length * densidad))), ...musgo];
  }, [tufts, densidad]);
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
        col.copy(l.musgo ? BARBA.musgoCeja : (l.azul ? BARBA.liquenAzul : BARBA.liquen));
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
    <group position={[centro.x, centro.y, centro.z]} scale={ROSTRO_ESCALA}>
      <group ref={grupoRef} position={[0, 0, frente]}>
        <instancedMesh ref={hebraRef} args={[hebraGeo, matHebra, hb.length]} frustumCulled={false} />
        <instancedMesh ref={tuftRef} args={[tuftGeo, matTuft, tf.length]} frustumCulled={false} />
      </group>
    </group>
  );
}

/* Los BRAZOS del guardián: dos ramas-brazo que nacen de los hombros, doblan el
   codo y CAEN con peso a los lados — la silueta humanoide del árbol viejo. Cada
   una termina en una mano de nudo con dedos-ramita que cuelgan. Se mecen apenas
   (respiración de árbol), y NUNCA tapan el rostro: lo enmarcan. */
function Brazos({ P, matCorteza, matCortezaLisa, reducedMotion }) {
  const grupoRef = useRef(null);
  const brazos = useMemo(() => specsBrazos(63), []);
  const geos = useMemo(
    () => brazos.map((b, i) => tuboOrganico(b.curve, {
      tubular: Math.max(22, Math.round(P.tubular * 0.45)),
      radial: Math.max(6, P.radial - 4),
      taperFn: taperLineal(b.r0, 0.09),
      dispAmp: 0.75,
      seedAng: 2 + i * 2.4,
    })),
    [brazos, P.tubular, P.radial],
  );
  useLayoutEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  useFrame((st) => {
    if (reducedMotion || !grupoRef.current) return;
    const t = st.clock.elapsedTime;
    grupoRef.current.rotation.z = Math.sin(t * 0.4 + 0.7) * 0.012;
  });
  return (
    <group ref={grupoRef}>
      {brazos.map((b, i) => (
        <group key={`brazo-${i}`}>
          <mesh geometry={geos[i]} material={matCorteza} castShadow receiveShadow />
          {/* la MANO: nudo de muñeca + dedos-ramita RECOGIDOS hacia la tierra.
              Cortos y juntos: una mano de madera en reposo. (Los dedos largos y
              abiertos de antes leían como garra de espanto junto al rostro.) */}
          <group position={[b.muneca.x, b.muneca.y, b.muneca.z]}>
            <mesh scale={[1.1, 0.92, 1.0]}>
              <sphereGeometry args={[0.12, 10, 8]} />
              <primitive object={matCortezaLisa} attach="material" />
            </mesh>
            {[
              [-0.06, -0.14, 0.02, 0.2],
              [0.0, -0.16, 0.05, 0.24],
              [0.06, -0.13, 0.0, 0.19],
            ].map(([dx, dy, dz, len], j) => (
              <mesh
                key={`dedo-${j}`}
                position={[dx, dy, dz]}
                rotation={[Math.PI - 0.12 + j * 0.06, 0, dx * 1.2]}
              >
                <coneGeometry args={[0.032, len, 5]} />
                <primitive object={matCortezaLisa} attach="material" />
              </mesh>
            ))}
          </group>
        </group>
      ))}
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
  // Corteza FACETADA en gama alta (flatShading): las placas y surcos del relieve
  // pegan la luz como madera vieja tallada (estética low-poly del valle), y la
  // cáscara del rostro se lee cincelada. En gama media/baja va lisa (menos coste
  // y sin riesgo de bandeo de anillos). El facetado del árbol lo marca P.flatShading.
  const matCorteza = useMemo(() => {
    const base = { vertexColors: true, flatShading: P.flatShading };
    return P.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.92, metalness: 0.0 })
      : new THREE.MeshLambertMaterial(base);
  }, [P.materialRico, P.flatShading]);

  // Un punto más OSCURA que la corteza del fuste: manos y dedos no deben pegar
  // en salmón contra el tronco (leían como garras rosadas).
  const matCortezaLisa = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ color: '#71402d', roughness: 0.9 })
      : new THREE.MeshLambertMaterial({ color: '#71402d' })),
    [P.materialRico],
  );
  const matGrieta = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ color: '#20130d', roughness: 0.8 })
      : new THREE.MeshLambertMaterial({ color: '#20130d' })),
    [P.materialRico],
  );
  // matParpado: los párpados de CORTEZA oscura (madera del rostro, un pelo más
  // honda que el cuerpo) — el ojo queda enmarcado por el mismo palo, nunca por
  // rebordes claros que lo recorten como goggles.
  const matParpado = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ color: '#5d3424', roughness: 0.92 })
      : new THREE.MeshLambertMaterial({ color: '#5d3424' })),
    [P.materialRico],
  );
  const matOjo = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ color: '#160f0a', roughness: 0.62, metalness: 0.0 })
      : new THREE.MeshLambertMaterial({ color: '#1a120d' })),
    [P.materialRico],
  );
  const matBrillo = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e6ecdd' }), []);
  // Iris ámbar-miel DISCRETO: rescoldo cálido que asoma desde la sombra de la
  // cuenca — se le sigue la mirada sin que sea un farol naranja (ese farol era
  // caricatura). En frugal va Lambert CON emisivo (nunca Basic plano: el disco
  // naranja sin sombreado era el peor de los goggles).
  const matIris = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ color: '#b08137', emissive: '#6b4514', emissiveIntensity: 0.5, roughness: 0.55, metalness: 0.05 })
      : new THREE.MeshLambertMaterial({ color: '#b08137', emissive: '#6b4514', emissiveIntensity: 0.55 })),
    [P.materialRico],
  );
  // La MASA de follaje: facetada (flatShading) con su color por cara horneado —
  // el cúmulo de hojas con huecos que se lee como copa de juego de consola.
  // El facetado va TAMBIÉN en frugal: sin él la copa era una bola de plastilina
  // lisa (Lambert soporta flatShading y no cuesta nada).
  const matMasa = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.0, flatShading: true })
      : new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })),
    [P.materialRico],
  );
  // El FLECO: hojitas-plano sueltas sobre la masa (rompen la silueta). Lambert
  // de dos caras siempre: son planos, el PBR no les aporta.
  const matHoja = useMemo(
    () => new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }),
    [],
  );
  const hojaGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

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
    [matCorteza, matCortezaLisa, matGrieta, matParpado, matOjo, matBrillo, matIris, matMasa, matHoja,
      matHebra, matTuft].forEach((m) => m.dispose());
  }, [troncoGeo, ramasGeo, raicesGeo, hojaGeo, matCorteza, matCortezaLisa, matGrieta, matParpado, matOjo, matBrillo, matIris, matMasa, matHoja,
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
          P={P}
          matOjo={matOjo}
          matBrillo={matBrillo}
          matIris={matIris}
          matCorteza={matCorteza}
          matGrieta={matGrieta}
          matParpado={matParpado}
          reducedMotion={reducedMotion}
          blinkRefs={{ izq: ojoIzq, der: ojoDer }}
        />

        {/* los BRAZOS del guardián: caen con peso a los lados, enmarcan el rostro */}
        <Brazos
          P={P}
          matCorteza={matCorteza}
          matCortezaLisa={matCortezaLisa}
          reducedMotion={reducedMotion}
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
          <MasaFollaje
            key={`copa-${i}`}
            cluster={c}
            matMasa={matMasa}
            hojaGeo={hojaGeo}
            matHoja={matHoja}
            detalle={P.detalleMasa}
            reducedMotion={reducedMotion}
            fase={i * 1.7}
          />
        ))}
      </group>
    </group>
  );
}
