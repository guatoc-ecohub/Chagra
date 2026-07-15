/*
 * EntQuenua — el ENT del páramo (queñua / colorado, *Polylepis*).
 *
 * REHECHO tras el veredicto del operador: *"no se parece en nada al del Señor de
 * los Anillos, no tiene barba, no tiene vida"*. Los tres reproches eran ciertos
 * y cada uno tenía una causa concreta:
 *
 *   · SIN BARBA — la barba SÍ estaba en el código, pero colgaba recta a una `z`
 *     fija desde el mentón mientras el tronco se ensancha hacia el pie: el
 *     raigón se la tragaba entera y solo asomaban dos matas de liquen junto a la
 *     boca. Ahora las hebras se cuelgan SIGUIENDO la superficie del tronco
 *     (`specsBarba` consulta el radio real a cada altura) y no pueden volver a
 *     enterrarse. Es usnea — "barba de viejo", el líquen colgante real del
 *     bosque altoandino — y cuelga también de las ramas: el mismo líquen que
 *     viste al bosque viste al guardián.
 *   · CARICATURA — la cara era una careta PEGADA encima (cejas de tablón, nariz
 *     de bola, labios de caja): un antifaz de calabaza. Ahora el rostro se TALLA
 *     en el propio tronco (`desplazamientoRostro`): cuencas hundidas, cejas de
 *     corteza, caballete, pómulos y boca-grieta son relieve de la madera, y las
 *     fibras de la corteza corren por encima. Lo único que se monta aparte son
 *     los OJOS, que van DENTRO de las cuencas.
 *   · SIN VIDA — ahora respira (el fuste se hincha despacio), se mece con peso
 *     desde la raíz, la copa se mece con desfase, la barba ondea por vértice
 *     (cada hebra con su peso: la raíz quieta, la punta suelta) y parpadea.
 *
 * Registro: el Ent es un personaje-árbol —tiene alma— pero su corteza y su
 * follaje van REALISTAS. Nada de rubber-hose aquí.
 *
 * Tier-safe: 'alto' pleno (PBR, cara densa, más hojas y usnea); 'medio'/'bajo'
 * frugales; `reducedMotion` lo deja QUIETO. Componente r3f: montar SOLO dentro
 * de un <Canvas>.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  paramsDeTier,
  geometriaTronco,
  geometriaLaminas,
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
  specsBarba,
  specsUsneaRamas,
  geometriaHebra,
  BARBA,
  CORTEZA,
} from './entQuenua.geom.js';
import { fusionarSeguro } from './sombreadoVegetal.js';

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

/* UN ojo: globo + iris + pupila + chispa. Vive a nivel de módulo (definirlo
   dentro de `Ojos` crearía un componente nuevo en cada render). */
function Ojo({ pos, ojoRef, gazeRef, matOjo, matBrillo, matIris, matGrieta }) {
  return (
    <group position={pos} ref={ojoRef}>
      {/* fondo de cuenca: pozo oscuro que asienta el globo en la madera */}
      <mesh position={[0, 0, -0.06]} scale={[1.3, 1.1, 0.5]}>
        <sphereGeometry args={[0.155, 14, 12]} />
        <primitive object={matGrieta} attach="material" />
      </mesh>
      {/* globo del ojo: oscuro, con brillo húmedo */}
      <mesh>
        <sphereGeometry args={[0.125, 16, 14]} />
        <primitive object={matOjo} attach="material" />
      </mesh>
      {/* la MIRADA: iris cálido + pupila + chispa */}
      <group ref={gazeRef} position={[0, 0, 0.075]}>
        <mesh>
          <sphereGeometry args={[0.06, 12, 10]} />
          <primitive object={matIris} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.036]}>
          <sphereGeometry args={[0.032, 10, 8]} />
          <primitive object={matGrieta} attach="material" />
        </mesh>
        <mesh position={[0.024, 0.032, 0.052]}>
          <sphereGeometry args={[0.021, 8, 8]} />
          <primitive object={matBrillo} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

/*
 * LOS OJOS — lo único del rostro que NO es madera tallada.
 *
 * Van hundidos DENTRO de las cuencas que `desplazamientoRostro` excava, no
 * pegados sobre la corteza. Cada ojo: globo oscuro y húmedo, iris cálido con
 * pupila y una chispa de vida (catchlight). La mirada deriva despacio (mira
 * alrededor, se detiene, vuelve) y parpadea: es lo que hace que el árbol MIRE.
 */
function Ojos({ ancla, matOjo, matBrillo, matIris, matGrieta, reducedMotion, blinkRefs }) {
  const { centro, radio } = ancla;
  const gazeIzq = useRef(null);
  const gazeDer = useRef(null);

  // Dónde excava `desplazamientoRostro` cada cuenca: u = dir.x = ±0.4, mirando
  // al +Z. El ojo se asienta en el fondo de esa cuenca.
  const sitio = (signo) => {
    const dir = new THREE.Vector3(signo * 0.46, 0.06, Math.sqrt(1 - 0.46 * 0.46)).normalize();
    return centro.clone().addScaledVector(dir, radio * 0.62);
  };
  const izq = useMemo(() => sitio(-1), [centro, radio]); // eslint-disable-line react-hooks/exhaustive-deps
  const der = useMemo(() => sitio(1), [centro, radio]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    // Deriva lenta de la mirada: recorre, se detiene, vuelve. Ambos ojos juntos.
    const gx = Math.sin(t * 0.24) * 0.028 + Math.sin(t * 0.09 + 1.1) * 0.014;
    const gy = Math.sin(t * 0.17 + 0.6) * 0.016;
    if (gazeIzq.current) gazeIzq.current.position.set(gx, gy, 0.075);
    if (gazeDer.current) gazeDer.current.position.set(gx, gy, 0.075);
  });

  return (
    <group>
      <Ojo
        pos={izq} ojoRef={blinkRefs.izq} gazeRef={gazeIzq}
        matOjo={matOjo} matBrillo={matBrillo} matIris={matIris} matGrieta={matGrieta}
      />
      <Ojo
        pos={der} ojoRef={blinkRefs.der} gazeRef={gazeDer}
        matOjo={matOjo} matBrillo={matBrillo} matIris={matIris} matGrieta={matGrieta}
      />
    </group>
  );
}

/*
 * LOS COLGANTES: la barba de usnea del mentón + la usnea que cuelga de las
 * ramas, TODO fusionado en una sola malla (una draw-call) con el color ya
 * horneado y un atributo `peso` por vértice (0 en la raíz → 1 en la punta).
 *
 * El meceo se hace por VÉRTICE en CPU: son ~1.5k vértices, nada para un móvil,
 * y a cambio cada hebra ondula por su cuenta —la raíz quieta y la punta suelta—
 * en vez de girar en bloque como una peluca. Es el movimiento el que convierte
 * la barba en barba (DR §3: "geometría de mechones + movimiento + densidad").
 */
function Colgantes({ geo, mat, reducedMotion }) {
  const meshRef = useRef(null);
  // Copia de las posiciones en reposo: el meceo se calcula SIEMPRE desde la
  // base (si se acumulara sobre la posición viva, la barba se iría a la deriva).
  const base = useMemo(() => (geo ? Float32Array.from(geo.attributes.position.array) : null), [geo]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh || !base || reducedMotion) return;
    // La geometría se toma del REF de la malla, no de la prop: mutar un valor
    // que llegó por props está prohibido (y además es mala idea).
    const viva = mesh.geometry;
    if (!viva?.attributes?.peso) return;
    const t = state.clock.elapsedTime;
    const pos = viva.attributes.position;
    const peso = viva.attributes.peso;
    const arr = pos.array;
    for (let i = 0; i < pos.count; i++) {
      const k = i * 3;
      const bx = base[k];
      const by = base[k + 1];
      const bz = base[k + 2];
      const w = peso.array[i];
      if (w <= 0.0001) continue;
      // Onda que viaja por la barba: la fase depende del sitio → las hebras no
      // se mueven todas a la vez (eso es lo que delata una peluca).
      const a = Math.sin(t * 1.05 + by * 2.2 + bx * 1.6) * 0.05;
      const b = Math.cos(t * 0.83 + by * 1.7 + bz * 1.9) * 0.038;
      arr[k] = bx + a * w;
      arr[k + 1] = by - Math.abs(a) * w * 0.25; // al ondear, cuelga un pelín menos
      arr[k + 2] = bz + b * w;
    }
    pos.needsUpdate = true;
  });

  if (!geo) return null;
  return <mesh ref={meshRef} geometry={geo} material={mat} frustumCulled={false} />;
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
  // Las LÁMINAS de papel del Polylepis: la firma de la especie. Van aparte del
  // tubo del tronco para no tocar el rostro tallado.
  const laminasGeo = useMemo(() => geometriaLaminas(P, 5), [P]);
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

  // LA BARBA + la usnea de las ramas: todo en UNA malla (una draw-call).
  const colgantesGeo = useMemo(() => {
    const { hebras, liquenes } = specsBarba(91, P.barba);
    const usnea = specsUsneaRamas(ramas.map((r) => r.punta), P.usnea, 77);
    const partes = [];
    for (const h of hebras) {
      partes.push(geometriaHebra(h, h.claro ? BARBA.musgoClaro : BARBA.musgo, 4));
    }
    for (const m of usnea) {
      partes.push(geometriaHebra(m, m.claro ? BARBA.liquen : BARBA.liquenAzul, 3));
    }
    // Matas de liquen foliáceo prendidas al arranque de la barba: cosen la
    // barba a la madera (si no, se lee como peluca puesta encima).
    for (const l of liquenes) {
      const g = new THREE.IcosahedronGeometry(1, 0);
      g.scale(l.esc * 1.5, l.esc * 0.55, l.esc);
      g.translate(l.pos[0], l.pos[1], l.pos[2]);
      const col = l.azul ? BARBA.liquenAzul : BARBA.liquen;
      const n = g.attributes.position.count;
      const cols = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        cols[i * 3] = col.r;
        cols[i * 3 + 1] = col.g;
        cols[i * 3 + 2] = col.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      // Quietas (peso 0): están prendidas a la corteza, no cuelgan.
      g.setAttribute('peso', new THREE.BufferAttribute(new Float32Array(n), 1));
      partes.push(g);
    }
    return fusionarSeguro(partes, 'colgantes-ent');
  }, [P.barba, P.usnea, ramas]);

  // --- Materiales (una vez) ---
  // Corteza SUAVE (flatShading off): el relieve de surcos, nudos y del ROSTRO es
  // geometría real; el sombreado liso evita el "acordeón" de anillos del tubo.
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
  // Iris cálido y VIVO: el glow ámbar que hace que el rostro MIRE.
  const matIris = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ color: '#c98a3a', emissive: '#7a4616', emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.05 })
      : new THREE.MeshBasicMaterial({ color: '#d69a48' })),
    [P.materialRico],
  );
  const matHoja = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.0, flatShading: true })
      : new THREE.MeshLambertMaterial({})),
    [P.materialRico],
  );
  const hojaGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  // Los colgantes traen su color horneado (musgo → liquen hacia la punta).
  const matColgante = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    [],
  );
  const ancla = useMemo(() => anclaRostro(7), []);

  // Liberar GPU al desmontar (geometrías y materiales procedurales).
  useLayoutEffect(() => () => {
    troncoGeo.dispose();
    laminasGeo?.dispose();
    ramasGeo.forEach((g) => g.dispose());
    raicesGeo.forEach((g) => g.dispose());
    colgantesGeo.dispose();
    hojaGeo.dispose();
    [matCorteza, matCortezaLisa, matGrieta, matOjo, matBrillo, matIris, matHoja, matColgante]
      .forEach((m) => m.dispose());
  }, [troncoGeo, laminasGeo, ramasGeo, raicesGeo, colgantesGeo, hojaGeo, matCorteza,
    matCortezaLisa, matGrieta, matOjo, matBrillo, matIris, matHoja, matColgante]);

  // --- Vida: RESPIRACIÓN + balanceo pesado + parpadeo lento ---
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    if (swayRef.current) {
      // Se mece con peso desde la raíz (lento: es un árbol viejo, no un junco).
      swayRef.current.rotation.z = Math.sin(t * 0.45) * 0.018;
      swayRef.current.rotation.x = Math.sin(t * 0.37 + 1.1) * 0.012;
      // RESPIRA: el fuste se hincha y se afloja muy despacio. Es minúsculo
      // (0.6%) y a propósito: si se nota, ya no es respiración, es un globo.
      const respira = 1 + Math.sin(t * 0.34) * 0.006;
      swayRef.current.scale.set(respira, 1 + (respira - 1) * 0.35, respira);
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

      {/* tronco (con el rostro TALLADO) + ramas + barba + copa: se mecen desde la base */}
      <group ref={swayRef}>
        <mesh geometry={troncoGeo} material={matCorteza} castShadow receiveShadow />
        {/* la corteza que se DESCAMA en láminas de papel: Polylepis = "muchas
            escamas". Sin esto el fuste se lee como un tubo marrón liso. */}
        {laminasGeo && (
          <mesh geometry={laminasGeo} material={matCorteza} castShadow receiveShadow />
        )}
        {ramasGeo.map((g, i) => (
          <mesh key={`rama-${i}`} geometry={g} material={matCorteza} castShadow receiveShadow />
        ))}

        {/* los OJOS, dentro de las cuencas que talla el tronco */}
        <Ojos
          ancla={ancla}
          matOjo={matOjo}
          matBrillo={matBrillo}
          matIris={matIris}
          matGrieta={matGrieta}
          reducedMotion={reducedMotion}
          blinkRefs={{ izq: ojoIzq, der: ojoDer }}
        />

        {/* LA BARBA de usnea + la usnea de las ramas (una sola malla) */}
        <Colgantes geo={colgantesGeo} mat={matColgante} reducedMotion={reducedMotion} />

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
