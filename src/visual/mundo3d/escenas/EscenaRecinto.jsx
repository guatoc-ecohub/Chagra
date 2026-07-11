/*
 * EscenaRecinto — ARQUETIPO `recinto`: el CORRAL y su ciclo cerrado.
 *
 * El corral es un LUGAR reconocible, y el ciclo (animal → estiércol → suelo →
 * planta → animal) es una FORMA que se camina: un anillo espacial. Aquí: un piso
 * circular cercado, animales low-poly (`params.animales`), y un aro de "ciclo"
 * (torus) que ancla la idea de cerrar el ciclo del abono. `MeshLambert`/`Basic`,
 * sin sombras.
 */
import { useMemo } from 'react';
import EscenaBase3D from './EscenaBase3D.jsx';

/* Un animal esquemático: cuerpo + cabeza, tono propio. */
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

function Diorama({ params }) {
  const animales = params?.animales || [
    { color: '#e7d9c2', pos: [-0.7, 0, 0.4] },
    { color: '#c98a5a', pos: [0.6, 0, -0.3] },
    { color: '#d8c49a', pos: [0.1, 0, 0.7] },
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
        <meshLambertMaterial color="#a98a5c" />
      </mesh>
      {/* la cerca: postes en anillo */}
      {postes.map((p, i) => (
        <mesh key={i} position={p}>
          <cylinderGeometry args={[0.05, 0.06, 0.5, 5]} />
          <meshLambertMaterial color="#8a6a44" flatShading />
        </mesh>
      ))}
      {/* el aro del CICLO cerrado (abono que vuelve) */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.25, 0.05, 8, 40]} />
        <meshBasicMaterial color="#7a9a3f" transparent opacity={0.7} />
      </mesh>
      {/* pila de estiércol/abono al centro (cierre del ciclo) */}
      <mesh position={[0, 0.14, 0]}>
        <coneGeometry args={[0.4, 0.28, 10]} />
        <meshLambertMaterial color="#5a4326" flatShading />
      </mesh>
      {animales.map((a, i) => (
        <Animalito key={i} pos={a.pos} color={a.color} />
      ))}
    </group>
  );
}

export default function EscenaRecinto(props) {
  const cielo = { fondo: '#ecdcc2', cielo: '#f6ead2', suelo: '#8a6a44', intensidad: 1.05 };
  return (
    <EscenaBase3D {...props} cielo={cielo} entrada={{ ...props.entrada, centro: [0, 0.4, 0] }}>
      <Diorama params={props.params} />
    </EscenaBase3D>
  );
}
