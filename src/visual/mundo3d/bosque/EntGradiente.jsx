/*
 * EntGradiente — el componente r3f de los dos ÁRBOLES MAESTROS nuevos del
 * gradiente: el ENT DEL ROBLE y el ENT DEL ALISO.
 *
 * Es el hermano de `EntQuenua.jsx` (el Ent del páramo, que NO se toca ni se
 * redibuja): misma talla, mismos gestos, mismo peso ancestral, pero paramétrico
 * por especie. La geometría vive en `entsGradiente.geom.js`; aquí se le pone
 * material, luz y VIDA.
 *
 * Lo que hace vivo a un Ent (y lo que nunca se le puede quitar):
 *   · el balanceo pesado desde la raíz — lento, con inercia, nunca un metrónomo;
 *   · el parpadeo ancestral (mucho rato abierto, un pestañeo corto);
 *   · la mirada que deriva despacio y vuelve;
 *   · la mandíbula de madera que murmura por frases, con silencios.
 * Con `reducedMotion` todo eso queda QUIETO y sereno — nunca desaparece.
 *
 * ── La trampa de los ojos (documentada para que no se repita) ───────────────
 * El apilado del ojo es GEOMETRÍA, no gusto: el frente del iris DEBE quedar por
 * delante del frente del globo y del pozo de la cuenca. Si no, el ámbar queda
 * literalmente DENTRO de las esferas oscuras y el Ent mira con cuencas vacías de
 * calavera. En el queñual pasó dos veces (una de ellas SOLO con la animación
 * encendida, así que la captura con reducedMotion salía bien y el bug vivo
 * pasaba de largo). Aquí los frentes se derivan del radio del fuste
 * (`proporcionesRostro`) para que la relación se conserve en un tronco grueso
 * como el del roble y en uno delgado como el del aliso.
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { crearMaterialVertexColors } from '../paleta/index.js';
import { factorParpadeo, factorHabla, ROSTRO_BOCA_Y } from './entQuenua.geom.js';
import {
  ESPECIES,
  paramsDeTier,
  anclaRostro,
  proporcionesRostro,
  mallaRostro,
  construirMadera,
  construirRaices,
  construirCopa,
  geomSetasDelRoble,
  geomNodulosFrankia,
} from './entsGradiente.geom.js';

/* ══════════════════════════════════════════════════════════════════════════
   UN OJO — hundido en su cuenca, en sombra bajo la cornisa de la ceja
   ══════════════════════════════════════════════════════════════════════════ */
/* El globo es madera húmeda oscura; el IRIS ámbar-miel es CHICO y asoma desde
   la sombra (rescoldo de fogón, jamás un farol naranja); los párpados son del
   MISMO palo que el rostro. Una sola chispa húmeda da la vida. */
function Ojo({ x, z, k, blinkRef, gazeRef, flip, mats }) {
  return (
    <group position={[x, -0.035, z]} scale={[0.94 * k, 0.86 * k, 0.6 * k]}>
      {/* el POZO de la cuenca: oscuridad honda donde se asienta el ojo */}
      <mesh position={[0, -0.005, -0.03]} scale={[1.26, 1.2, 1.24]}>
        <sphereGeometry args={[0.115, 14, 12]} />
        <primitive object={mats.grieta} attach="material" />
      </mesh>
      <group ref={blinkRef}>
        {/* el GLOBO: nace hundido, solo su cara frontal asoma del pozo */}
        <mesh position={[0, 0, 0.04]}>
          <sphereGeometry args={[0.09, 16, 14]} />
          <primitive object={mats.ojo} attach="material" />
        </mesh>
        <group ref={gazeRef} position={[0, 0.004, 0.105]}>
          <mesh scale={[1, 1, 0.65]}>
            <sphereGeometry args={[0.062, 16, 14]} />
            <primitive object={mats.iris} attach="material" />
          </mesh>
          {/* pupila: pozo hondo y amplio en el centro (mirada mansa) */}
          <mesh position={[0, 0, 0.026]} scale={[1, 1, 0.7]}>
            <sphereGeometry args={[0.031, 12, 10]} />
            <primitive object={mats.grieta} attach="material" />
          </mesh>
          {/* la chispa de húmedo: mínima, arriba a un lado — la vida */}
          <mesh position={[flip * 0.021, 0.025, 0.044]}>
            <sphereGeometry args={[0.008, 8, 8]} />
            <primitive object={mats.brillo} attach="material" />
          </mesh>
        </group>
      </group>
      {/* párpado superior de CORTEZA: pesado, entrecerrado — la gravedad sabia */}
      <mesh position={[0, 0.082, 0.032]} rotation={[0.7, 0, flip * 0.08]} scale={[1.24, 0.52, 0.7]}>
        <sphereGeometry args={[0.104, 14, 10]} />
        <primitive object={mats.parpado} attach="material" />
      </mesh>
      {/* párpado inferior: reborde discreto de la misma corteza */}
      <mesh position={[0, -0.08, 0.028]} rotation={[-0.35, 0, -flip * 0.1]} scale={[1.08, 0.4, 0.6]}>
        <sphereGeometry args={[0.095, 12, 8]} />
        <primitive object={mats.parpado} attach="material" />
      </mesh>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EL ROSTRO — la cáscara tallada + los ojos + la mandíbula que murmura
   ══════════════════════════════════════════════════════════════════════════ */
function Rostro({ esp, P, mats, reducedMotion, blinkRefs }) {
  const { centro } = useMemo(() => anclaRostro(esp), [esp]);
  const prop = useMemo(() => proporcionesRostro(esp), [esp]);
  const { cara, mandibula } = useMemo(
    () => mallaRostro(esp, { segRostro: P.segRostro }),
    [esp, P.segRostro],
  );
  useLayoutEffect(() => () => {
    cara.dispose();
    mandibula.dispose();
  }, [cara, mandibula]);

  const gazeIzq = useRef(null);
  const gazeDer = useRef(null);
  const mandibulaRef = useRef(null);

  /* Escala de los ojos relativa a la talla del rostro: en el fuste delgado del
     aliso el ojo del queñual quedaría del tamaño de la cara entera. */
  const k = Math.min(1.15, Math.max(0.72, prop.frenteL / 0.53));

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    // MIRADA: deriva lenta (recorre, se detiene, vuelve). Los dos ojos juntos.
    const gx = Math.sin(t * 0.24 + esp.semilla) * 0.03 + Math.sin(t * 0.09 + 1.1) * 0.015;
    const gy = Math.sin(t * 0.17 + 0.6) * 0.018;
    // La z es la MISMA del grupo de la mirada en <Ojo> (0.105): escribir un
    // valor menor hunde el iris dentro del globo y salen ojos de calavera.
    if (gazeIzq.current) gazeIzq.current.position.set(gx, gy - 0.004, 0.105);
    if (gazeDer.current) gazeDer.current.position.set(gx, gy - 0.004, 0.105);
    // HABLA: la mandíbula pivota despacio — murmullo de árbol viejo, con pausas.
    const abre = factorHabla(t + esp.semilla * 0.7);
    if (mandibulaRef.current) mandibulaRef.current.rotation.x = 0.015 + abre * 0.11;
  });

  return (
    <group position={[centro.x, centro.y, centro.z]} scale={esp.rostroEscala}>
      {/* la cavidad oscura tras la boca-grieta: al abrirse se ve hondura, no
          tronco. Discreta: agrandarla devuelve la franja negra de teatro. */}
      <mesh position={[0, ROSTRO_BOCA_Y - 0.02, prop.zBoca - 0.16]} scale={[0.29, 0.1, 0.13]}>
        <sphereGeometry args={[1, 14, 12]} />
        <primitive object={mats.grieta} attach="material" />
      </mesh>

      <mesh geometry={cara} material={mats.corteza} castShadow receiveShadow />
      <group ref={mandibulaRef} position={[0, ROSTRO_BOCA_Y, 0]}>
        <mesh geometry={mandibula} material={mats.corteza} castShadow receiveShadow />
      </group>

      <Ojo x={-prop.sepOjo} z={prop.zOjo} k={k} blinkRef={blinkRefs.izq} gazeRef={gazeIzq} flip={-1} mats={mats} />
      <Ojo x={prop.sepOjo} z={prop.zOjo} k={k} blinkRef={blinkRefs.der} gazeRef={gazeDer} flip={1} mats={mats} />
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LAS MANOS — nudo de muñeca + dedos-ramita
   ══════════════════════════════════════════════════════════════════════════ */
/* En reposo los dedos van CORTOS y RECOGIDOS hacia la tierra: los dedos largos
   y abiertos leen como garra de espanto junto al rostro. La mano que SEÑALA
   estira el índice hacia la lección y recoge los otros tres. */
function Mano({ spec, esc, mat }) {
  const { muneca, dedos, lado } = spec;
  if (dedos === 'senala') {
    return (
      <group position={[muneca.x, muneca.y, muneca.z]}>
        <mesh rotation={[0.5, 0, 0]}>
          <boxGeometry args={[0.2 * esc, 0.12 * esc, 0.22 * esc]} />
          <primitive object={mat} attach="material" />
        </mesh>
        {/* ÍNDICE: el dedo largo que señala la lección del pie */}
        <mesh position={[0.02 * esc, -0.16 * esc, 0.16 * esc]} rotation={[Math.PI - 0.55, 0, 0]}>
          <coneGeometry args={[0.045 * esc, 0.5 * esc, 6]} />
          <primitive object={mat} attach="material" />
        </mesh>
        <mesh position={[0.02 * esc, -0.05 * esc, 0.12 * esc]}>
          <sphereGeometry args={[0.05 * esc, 8, 7]} />
          <primitive object={mat} attach="material" />
        </mesh>
        {[-0.07, 0, 0.07].map((dx, i) => (
          <mesh key={i} position={[dx * esc, -0.12 * esc, -0.02 * esc]} rotation={[Math.PI - 1.4, 0, 0]}>
            <coneGeometry args={[0.032 * esc, 0.2 * esc, 5]} />
            <primitive object={mat} attach="material" />
          </mesh>
        ))}
        <mesh position={[-0.11 * esc, -0.02 * esc, 0.05 * esc]} rotation={[0, 0, 0.9 * lado]}>
          <coneGeometry args={[0.035 * esc, 0.16 * esc, 5]} />
          <primitive object={mat} attach="material" />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[muneca.x, muneca.y, muneca.z]}>
      <mesh scale={[1.1, 0.92, 1]}>
        <sphereGeometry args={[0.12 * esc, 10, 8]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {[
        [-0.06, -0.14, 0.02, 0.2],
        [0, -0.16, 0.05, 0.24],
        [0.06, -0.13, 0, 0.19],
      ].map(([dx, dy, dz, len], j) => (
        <mesh
          key={j}
          position={[dx * esc, dy * esc, dz * esc]}
          rotation={[Math.PI - 0.12 + j * 0.06, 0, dx * 1.2]}
        >
          <coneGeometry args={[0.032 * esc, len * esc, 5]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EL ENT COMPLETO
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Un Ent del gradiente. Montar SOLO dentro de un <Canvas>.
 *
 * @param {object} props
 * @param {'roble'|'aliso'} props.especie
 * @param {'alto'|'medio'|'bajo'} [props.tier]
 * @param {boolean} [props.reducedMotion]
 * @param {boolean} [props.leccion]  monta la lección hecha cosa al pie del
 *   árbol: el corro de setas del roble (Cantharellus + Lactarius) o los nódulos
 *   de Frankia en las raíces del aliso.
 */
export default function EntGradiente({
  especie = 'roble',
  tier = 'alto',
  reducedMotion = false,
  leccion = true,
}) {
  const esp = ESPECIES[especie] || ESPECIES.roble;
  const P = useMemo(() => paramsDeTier(tier), [tier]);

  const swayRef = useRef(null);
  const ojoIzq = useRef(null);
  const ojoDer = useRef(null);

  /* ── Geometrías (una vez por especie y tier) ── */
  const { geo: maderaGeo, ramas, brazos } = useMemo(() => construirMadera(esp, P), [esp, P]);
  const { geo: raicesGeo, raices } = useMemo(() => construirRaices(esp, P), [esp, P]);
  const copaGeo = useMemo(
    () => construirCopa(esp, P, ramas.map((r) => r.punta)),
    [esp, P, ramas],
  );
  const leccionGeo = useMemo(() => {
    if (!leccion) return null;
    if (esp.id === 'roble') return geomSetasDelRoble({ q: P.hojasCopa }, 909);
    return geomNodulosFrankia(raices, { q: P.hojasCopa }, 515);
  }, [esp, P, raices, leccion]);

  useEffect(() => () => {
    maderaGeo.dispose();
    raicesGeo.dispose();
    copaGeo.dispose();
    if (leccionGeo) leccionGeo.dispose();
  }, [maderaGeo, raicesGeo, copaGeo, leccionGeo]);

  /* ── Materiales ──
     La madera y la copa viajan con el color HORNEADO por vértice: un solo
     material blanco para todo (el patrón de la casa). El facetado de la corteza
     va apagado —el relieve es geometría, no facetas— y el de la copa también,
     porque `matojoNube` trae normales radiales que la hacen masa suave. */
  const matCorteza = useMemo(
    () => crearMaterialVertexColors(P, { flatShading: false, roughness: 0.94 }),
    [P],
  );
  const matCopa = useMemo(
    () => crearMaterialVertexColors(P, { flatShading: false, roughness: 0.88 }),
    [P],
  );
  const matLeccion = useMemo(
    () => crearMaterialVertexColors(P, { flatShading: false, roughness: 0.82 }),
    [P],
  );
  /* Los materiales del rostro: un punto más oscuros que el fuste para que manos
     y párpados no peguen en claro contra la corteza. Se derivan del color de
     grieta de la especie, no de un hex suelto. */
  const matManos = useMemo(() => {
    const c = new THREE.Color(esp.corteza.grieta).lerp(new THREE.Color(esp.corteza.cuerpo), 0.45);
    return P.materialRico
      ? new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })
      : new THREE.MeshLambertMaterial({ color: c });
  }, [esp, P.materialRico]);
  const matGrieta = useMemo(() => {
    const c = new THREE.Color(esp.corteza.grieta).multiplyScalar(0.45);
    return P.materialRico
      ? new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })
      : new THREE.MeshLambertMaterial({ color: c });
  }, [esp, P.materialRico]);
  const matParpado = useMemo(() => {
    const c = new THREE.Color(esp.corteza.grieta).lerp(new THREE.Color(esp.corteza.cuerpo), 0.28);
    return P.materialRico
      ? new THREE.MeshStandardMaterial({ color: c, roughness: 0.92 })
      : new THREE.MeshLambertMaterial({ color: c });
  }, [esp, P.materialRico]);
  const matOjo = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ color: '#160f0a', roughness: 0.62 })
      : new THREE.MeshLambertMaterial({ color: '#1a120d' })),
    [P.materialRico],
  );
  const matBrillo = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e6ecdd' }), []);
  /* Iris ámbar-miel DISCRETO. En frugal va Lambert CON emisivo, nunca Basic
     plano: el disco naranja sin sombreado era el peor de los goggles. */
  const matIris = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ color: '#b08137', emissive: '#6b4514', emissiveIntensity: 0.5, roughness: 0.55 })
      : new THREE.MeshLambertMaterial({ color: '#b08137', emissive: '#6b4514', emissiveIntensity: 0.55 })),
    [P.materialRico],
  );

  useEffect(() => () => {
    [matCorteza, matCopa, matLeccion, matManos, matGrieta, matParpado, matOjo, matBrillo, matIris]
      .forEach((m) => m.dispose());
  }, [matCorteza, matCopa, matLeccion, matManos, matGrieta, matParpado, matOjo, matBrillo, matIris]);

  const matsRostro = useMemo(
    () => ({ corteza: matCorteza, grieta: matGrieta, parpado: matParpado, ojo: matOjo, iris: matIris, brillo: matBrillo }),
    [matCorteza, matGrieta, matParpado, matOjo, matIris, matBrillo],
  );

  /* ── Vida: balanceo pesado desde la raíz + parpadeo lento ── */
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    if (swayRef.current) {
      swayRef.current.rotation.z = Math.sin(t * 0.45 + esp.semilla) * 0.016;
      swayRef.current.rotation.x = Math.sin(t * 0.37 + 1.1 + esp.semilla) * 0.011;
    }
    const b = factorParpadeo(t + esp.semilla * 1.3);
    if (ojoIzq.current) ojoIzq.current.scale.y = b;
    if (ojoDer.current) ojoDer.current.scale.y = b;
  });

  const escManos = esp.r0 / 0.86; // las manos siguen el grosor del palo

  return (
    <group name={`ent-${esp.id}`}>
      {/* raíces plantadas: quedan FUERA del balanceo, ellas agarran la tierra */}
      <mesh geometry={raicesGeo} material={matCorteza} castShadow receiveShadow />

      {/* la lección hecha cosa, al pie del árbol y también fuera del balanceo */}
      {leccionGeo && (
        <mesh geometry={leccionGeo} material={matLeccion} castShadow receiveShadow />
      )}

      {/* fuste + ramas + brazos + rostro + copa: se mecen desde la base */}
      <group ref={swayRef}>
        <mesh geometry={maderaGeo} material={matCorteza} castShadow receiveShadow />

        {brazos.map((b, i) => (
          <Mano key={`mano-${i}`} spec={b} esc={escManos} mat={matManos} />
        ))}

        <Rostro
          esp={esp}
          P={P}
          mats={matsRostro}
          reducedMotion={reducedMotion}
          blinkRefs={{ izq: ojoIzq, der: ojoDer }}
        />

        <mesh geometry={copaGeo} material={matCopa} castShadow />
      </group>
    </group>
  );
}
