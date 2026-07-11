/*
 * EscenaRecinto — ARQUETIPO `recinto`: el CORRAL y su ciclo cerrado.
 *
 * El corral es un LUGAR reconocible, y el ciclo (animal → estiércol → suelo →
 * planta → animal) es una FORMA que se camina: un anillo espacial. Aquí: un piso
 * circular cercado, animales low-poly DIFERENCIADOS por especie (gallina, vaca de
 * cuerpo capsular, oveja de vellón facetado) según `params.animales[].tipo`, y un
 * aro de "ciclo" (torus) que ancla la idea de cerrar el ciclo del abono. Cada
 * animal es primitivas orgánicas (esferas/conos/cápsulas), nunca cajas; con `tipo`
 * desconocido cae al esquemático (retrocompat). `MeshLambert`/`Basic`, sin sombras.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import EscenaBase3D from './EscenaBase3D.jsx';
import { Fauna } from './FaunaEscena.jsx';
import { faunaDeMundo } from '../faunaFuncional.js';
import { CIELOS, PALETA } from '../atmosferaMadre.js';

/* Idle sutil de los animales del corral —el SUJETO del mundo—: reusa el mismo
   patrón que `FaunaEscena.deriva` (useFrame + amplitudes chicas, vida no
   espectáculo) pero sobre las MALLAS low-poly en vez de billboards. Cada especie
   tiene su gesto: la gallina PICOTEA (zambullida corta hacia el suelo), la vaca
   RESPIRA (escala y ±2%), la oveja se BALANCEA (mecerse lento). Gateado por
   reduced-motion (frameloop='demand' ya congela; el gate lo hace explícito). El
   `fase` desincroniza los animales para que no latan a la par. */
function useIdlePecuario(kind, fase, reducedMotion) {
  const ref = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const t = state.clock.elapsedTime;
    if (kind === 'picotea') {
      // la mayor parte del tiempo erguida; una zambullida breve del pico al suelo
      const p = Math.max(0, Math.sin(t * 1.6 + fase));
      ref.current.rotation.z = -(p ** 6) * 0.5;
    } else if (kind === 'respira') {
      // el fuelle del costillar: la altura del cuerpo late apenas (±2%)
      ref.current.scale.y = 1 + Math.sin(t * 0.9 + fase) * 0.02;
    } else if (kind === 'balancea') {
      // el peso del vellón mece a la oveja de un lado a otro, muy lento
      ref.current.rotation.z = Math.sin(t * 0.8 + fase) * 0.05;
    }
  });
  return ref;
}

/* La fauna funcional del corral (un DESCOMPONEDOR insignia —el escarabajo
   estercolero que procesa el estiércol y cierra el ciclo del abono— más
   POLINIZADORES por la cerca) vive en faunaFuncional.js, poblada por mundo. */

/* Un animal esquemático: cuerpo + cabeza, tono propio. Es el FALLBACK
   retrocompatible: si un dato viejo trae solo {color, pos} sin `tipo`, se dibuja
   así (nunca una caja huérfana). Los datos nuevos traen especie diferenciada. */
function Animalito({ pos, color }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.28, 0]}>
        <capsuleGeometry args={[0.18, 0.34, 4, 8]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0.24, 0.42, 0]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}

/* La gallina ponedora: cuerpo ovalado, cola alzada, cresta y pico. Primitivas
   orgánicas (esferas/conos), nada de cajas — mira hacia +x. */
function Gallina({ pos, color = '#e7d9c2', reducedMotion = false, fase = 0 }) {
  // el cuerpo picotea sobre las patas fijas (pivote en la base = raíz del grupo)
  const ref = useIdlePecuario('picotea', fase, reducedMotion);
  return (
    <group position={pos}>
      <group ref={ref}>
        {/* cuerpo ovalado */}
        <mesh position={[0, 0.2, 0]} scale={[1.25, 1, 1]}>
          <sphereGeometry args={[0.16, 8, 6]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
        {/* cola alzada */}
        <mesh position={[-0.16, 0.28, 0]} rotation={[0, 0, 0.9]}>
          <coneGeometry args={[0.09, 0.2, 5]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
        {/* cabeza */}
        <mesh position={[0.17, 0.34, 0]}>
          <sphereGeometry args={[0.09, 8, 6]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
        {/* cresta (terracota natural, jamás rojo de alarma) */}
        <mesh position={[0.17, 0.45, 0]}>
          <coneGeometry args={[0.05, 0.1, 4]} />
          <meshLambertMaterial color="#c85a44" flatShading />
        </mesh>
        {/* pico */}
        <mesh position={[0.27, 0.33, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.03, 0.09, 4]} />
          <meshLambertMaterial color="#e0a63a" flatShading />
        </mesh>
      </group>
      {/* patas (plantadas: el picoteo pivota sobre ellas) */}
      {[0.06, -0.06].map((z) => (
        <mesh key={z} position={[0.04, 0.05, z]}>
          <cylinderGeometry args={[0.015, 0.015, 0.14, 4]} />
          <meshLambertMaterial color="#e0a63a" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* La vaca de finca: cuerpo CAPSULAR horizontal, cabeza con hocico y orejas,
   cuatro patas y cola. Cápsula tumbada (rotación z) — el "cuerpo capsular" del DR. */
function Vaca({ pos, color = '#c9a06a', reducedMotion = false, fase = 0 }) {
  // el costillar respira: la altura del cuerpo late ±2% (patas fijas al piso)
  const ref = useIdlePecuario('respira', fase, reducedMotion);
  return (
    <group position={pos}>
      <group ref={ref}>
        {/* cuerpo capsular horizontal */}
        <mesh position={[0, 0.46, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.22, 0.42, 4, 8]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
        {/* cabeza */}
        <mesh position={[0.44, 0.5, 0]}>
          <sphereGeometry args={[0.15, 8, 6]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
        {/* hocico */}
        <mesh position={[0.56, 0.44, 0]}>
          <sphereGeometry args={[0.09, 8, 6]} />
          <meshLambertMaterial color="#e8d3bf" flatShading />
        </mesh>
        {/* orejas */}
        {[0.12, -0.12].map((z) => (
          <mesh key={z} position={[0.4, 0.62, z]} rotation={[z > 0 ? 0.5 : -0.5, 0, 0]}>
            <coneGeometry args={[0.05, 0.12, 4]} />
            <meshLambertMaterial color={color} flatShading />
          </mesh>
        ))}
        {/* cola */}
        <mesh position={[-0.42, 0.34, 0]} rotation={[0, 0, 0.4]}>
          <cylinderGeometry args={[0.02, 0.02, 0.34, 4]} />
          <meshLambertMaterial color={PALETA.tierraClara} flatShading />
        </mesh>
      </group>
      {/* patas (plantadas mientras el cuerpo respira) */}
      {[[0.28, 0.13], [0.28, -0.13], [-0.28, 0.13], [-0.28, -0.13]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.18, z]}>
          <cylinderGeometry args={[0.045, 0.04, 0.36, 5]} />
          <meshLambertMaterial color={PALETA.tierraClara} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* La oveja: vellón como cuerpo FACETADO (icosaedro low-poly = lana), cabeza y
   patas oscuras. El facetado es la lana, sin texturas ni cajas. */
function Oveja({ pos, color = '#efe7d8', reducedMotion = false, fase = 0 }) {
  // el peso del vellón la mece lento de lado a lado (patas fijas)
  const ref = useIdlePecuario('balancea', fase, reducedMotion);
  return (
    <group position={pos}>
      <group ref={ref}>
        {/* vellón (icosaedro low-poly, flatShading = lana) */}
        <mesh position={[0, 0.34, 0]} scale={[1.2, 1, 1]}>
          <icosahedronGeometry args={[0.22, 0]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
        {/* cabeza oscura */}
        <mesh position={[0.28, 0.36, 0]}>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshLambertMaterial color="#5a4a3e" flatShading />
        </mesh>
        {/* orejas */}
        {[0.08, -0.08].map((z) => (
          <mesh key={z} position={[0.28, 0.44, z]} rotation={[0, 0, z > 0 ? -0.6 : 0.6]}>
            <coneGeometry args={[0.03, 0.1, 4]} />
            <meshLambertMaterial color="#5a4a3e" flatShading />
          </mesh>
        ))}
      </group>
      {/* patas (plantadas mientras el vellón se mece) */}
      {[[0.14, 0.1], [0.14, -0.1], [-0.14, 0.1], [-0.14, -0.1]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.12, z]}>
          <cylinderGeometry args={[0.03, 0.03, 0.24, 4]} />
          <meshLambertMaterial color="#5a4a3e" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Dispatcher por especie: cada animal se dibuja según su `tipo`; si no se
   reconoce, cae al esquemático `Animalito` (retrocompat, nunca una caja). */
const ANIMALES_CORRAL = { gallina: Gallina, vaca: Vaca, oveja: Oveja };
function AnimalDeCorral({ tipo, pos, color, reducedMotion, fase }) {
  const Comp = ANIMALES_CORRAL[tipo];
  return Comp
    ? <Comp pos={pos} color={color} reducedMotion={reducedMotion} fase={fase} />
    : <Animalito pos={pos} color={color} />;
}

function Diorama({ params, reducedMotion, fauna }) {
  const animales = params?.animales || [
    { tipo: 'vaca', color: '#c9a06a', pos: [-1.05, 0, -0.4] },
    { tipo: 'gallina', color: '#e7d9c2', pos: [1.1, 0, 0.5] },
    { tipo: 'gallina', color: '#d8b58a', pos: [0.7, 0, 1.05] },
    { tipo: 'oveja', color: '#efe7d8', pos: [-0.35, 0, 1.15] },
  ];
  const postes = useMemo(() => {
    const n = 12;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return /** @type {[number, number, number]} */ ([Math.cos(a) * 1.9, 0.2, Math.sin(a) * 1.9]);
    });
  }, []);
  return (
    <group>
      {/* piso del corral */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2, 28]} />
        <meshLambertMaterial color={PALETA.maderaClara} />
      </mesh>
      {/* la cerca: postes en anillo */}
      {postes.map((p, i) => (
        <mesh key={i} position={p}>
          <cylinderGeometry args={[0.05, 0.06, 0.5, 5]} />
          <meshLambertMaterial color={PALETA.tierraClara} flatShading />
        </mesh>
      ))}
      {/* el aro del CICLO cerrado (abono que vuelve) */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.25, 0.05, 8, 40]} />
        <meshBasicMaterial color={PALETA.follajeClaro} transparent opacity={0.7} />
      </mesh>
      {/* pila de estiércol/abono al centro (cierre del ciclo) */}
      <mesh position={[0, 0.14, 0]}>
        <coneGeometry args={[0.4, 0.28, 10]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>
      {animales.map((a, i) => (
        <AnimalDeCorral
          key={i}
          tipo={a.tipo}
          pos={a.pos}
          color={a.color}
          reducedMotion={reducedMotion}
          fase={i * 1.7}
        />
      ))}
      {/* la fauna funcional: descomponedor en el abono + polinizadores por la cerca */}
      <Fauna items={fauna} reducedMotion={reducedMotion} />
    </group>
  );
}

export default function EscenaRecinto(props) {
  const cielo = CIELOS.corral;
  const fauna = faunaDeMundo(props.mundoId, { tier: props.tier });
  return (
    <EscenaBase3D {...props} cielo={cielo} entrada={{ ...props.entrada, centro: [0, 0.4, 0] }}>
      <Diorama params={props.params} reducedMotion={props.reducedMotion} fauna={fauna} />
    </EscenaBase3D>
  );
}
