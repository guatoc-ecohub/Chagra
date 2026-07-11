/*
 * EscenaEstratos — ARQUETIPO `estratos`: la VERTICALIDAD del bosque comestible.
 *
 * Los 7 estratos (emergente → dosel → sub-dosel → arbusto → herbáceo → rastrero
 * → raíz) son verticales POR DEFINICIÓN: la verticalidad ES la lección, y una
 * lista plana la mata. Aquí cada estrato es una banda de altura con su vegetación
 * low-poly repetida (troncos + copas / matas). Con muchos árboles el DR pide
 * `InstancedMesh`; este arquetipo usa un conteo acotado por estrato y `MeshLambert`
 * sin sombras (DR §6) — el que "estresa" el framework más allá del cutaway.
 */
import { useMemo } from 'react';
import EscenaBase3D from './EscenaBase3D.jsx';

const ESTRATOS_DEF = [
  { nombre: 'emergente', alto: 3.4, color: '#2f5f34', r: 0.6 },
  { nombre: 'dosel', alto: 2.6, color: '#3a6f3f', r: 0.7 },
  { nombre: 'sub-dosel', alto: 1.9, color: '#4a7d45', r: 0.6 },
  { nombre: 'arbusto', alto: 1.2, color: '#5f8a3f', r: 0.5 },
  { nombre: 'herbáceo', alto: 0.7, color: '#7aa24a', r: 0.4 },
  { nombre: 'rastrero', alto: 0.35, color: '#8fae55', r: 0.5 },
  { nombre: 'raíz', alto: 0.15, color: '#8a6a44', r: 0.4 },
];

function Planta({ x, z, alto, color, r }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, alto * 0.35, 0]}>
        <cylinderGeometry args={[0.06, 0.09, alto * 0.7, 5]} />
        <meshLambertMaterial color="#6b4a2e" flatShading />
      </mesh>
      <mesh position={[0, alto * 0.78, 0]}>
        <coneGeometry args={[r, alto * 0.7, 7]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}

function Diorama({ params }) {
  const estratos = params?.estratos || ESTRATOS_DEF;
  const plantas = useMemo(() => {
    const out = [];
    let s = 7;
    estratos.forEach((e, ei) => {
      const cuenta = ei < 2 ? 2 : 3;
      for (let i = 0; i < cuenta; i++) {
        s = (s * 1103515245 + 12345) >>> 0;
        const x = ((s % 1000) / 1000 - 0.5) * 3.8;
        s = (s * 1103515245 + 12345) >>> 0;
        const z = ((s % 1000) / 1000 - 0.5) * 2.4 - 0.4;
        out.push({ key: `${ei}-${i}`, x, z, alto: e.alto, color: e.color, r: e.r });
      }
    });
    return out;
  }, [estratos]);
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.6, 30]} />
        <meshLambertMaterial color="#6d5030" />
      </mesh>
      {plantas.map((p) => (
        <Planta key={p.key} x={p.x} z={p.z} alto={p.alto} color={p.color} r={p.r} />
      ))}
    </group>
  );
}

export default function EscenaEstratos(props) {
  const cielo = { fondo: '#d7e6c9', cielo: '#eaf2df', suelo: '#5f4a2e', intensidad: 1.1 };
  return (
    <EscenaBase3D
      {...props}
      cielo={cielo}
      camara={{ position: [3.5, 3, 6], fov: 44 }}
      entrada={{ ...props.entrada, centro: [0, 1.4, 0] }}
    >
      <Diorama params={props.params} />
    </EscenaBase3D>
  );
}
