/* eslint-disable react-refresh/only-export-components -- exporta los materiales
   compartidos (MATERIAL_FINCA para la arboleda, MATERIAL_HATO para el ganado)
   además del componente. */
/*
 * El POTRERO del valle — animales de finca REALISTAS por raza, regados en
 * APARTOS divididos por CERCAS VIVAS (rediseño 2026-07, feedback del
 * operador: "los animales más regados pero más lejos", y el spec del valle:
 * cercas vivas de matarratón / nacedero / botón de oro — las especies
 * reales de la cerca viva colombiana, que también son forraje y sombra).
 *
 * La escena del aparto:
 *   · CERCA VIVA 1 (transversal): separa el aparto del fondo (las vacas)
 *     de los del frente. Con su portillo al centro (la vaca rota de aparto:
 *     eso ES el pastoreo racional).
 *   · CERCA VIVA 2 (longitudinal): separa ovejas (izquierda) de cerdos y
 *     gallinero (derecha).
 *   · TRANQUERA de madera al oriente (por donde llega el sendero de la casa).
 *
 * Las mallas de los animales viven en fincaRealista.geom.js (torso loft
 * orgánico, AO horneado, cabeza pivotante con gesto vivo). Las cercas vivas
 * van INSTANCIADAS (troncos + copas + flores = 3-4 draw calls). Todo
 * procedural: cero GLTF, cero texturas, offline y liviano. Decorativo
 * (aria-hidden): el botón accesible del mundo lo pone MundoLugar.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Instances, Instance } from '@react-three/drei';
import {
  geomVaca,
  geomCerdo,
  geomLechon,
  geomGallina,
  geomPerro,
  geomOveja,
} from '../../visual/mundo3d/finca/fincaRealista.geom.js';

/* El material de las mallas fusionadas con color horneado por vértice que usa
   la ARBOLEDA por especie. flatShading le da carácter a un tronco — pero a un
   lomo de vaca lo delata como poliedro, por eso el hato NO lo comparte. */
export const MATERIAL_FINCA = new THREE.MeshLambertMaterial({
  vertexColors: true,
  flatShading: true,
});

/* El material del HATO: mismo Lambert + vertexColors (el sombreado viene
   horneado en la geometría), pero con normales SUAVES — carne curva, no
   facetas. Uno solo para todos los animales: un programa, 2 draw-calls por
   animal. */
export const MATERIAL_HATO = new THREE.MeshLambertMaterial({
  vertexColors: true,
});

/* Los GESTOS de idle: reescriben solo la rotación del grupo-cabeza (el cuerpo
   queda plantado). Amplitudes chicas: vida, no espectáculo. */
const GESTOS = {
  // La vaca pasta: baja el hocico al pasto con calma y lo sube a rumiar.
  pasta: (g, t, fase) => {
    g.rotation.z = -0.15 - (Math.sin(t * 0.55 + fase) * 0.5 + 0.5) * 0.55;
  },
  // La gallina picotea: golpes secos con pausas.
  picotea: (g, t, fase) => {
    const c = (Math.sin(t * 2.4 + fase) + 1) / 2;
    g.rotation.z = -Math.pow(c, 4) * 0.9;
  },
  // El cerdo hocica el suelo: empuja el morro hacia abajo-adelante.
  hocica: (g, t, fase) => {
    const c = Math.max(0, Math.sin(t * 1.1 + fase));
    g.rotation.z = -(c ** 4) * 0.35;
  },
  // El perro mira: barre el paisaje con la cabeza, a veces la ladea.
  mira: (g, t, fase) => {
    g.rotation.y = Math.sin(t * 0.4 + fase) * 0.45;
    g.rotation.x = Math.sin(t * 0.23 + fase * 2) * 0.1;
  },
  // La oveja tantea el pasto, más tímida que la vaca.
  tantea: (g, t, fase) => {
    g.rotation.z = -0.1 - (Math.sin(t * 0.7 + fase) * 0.5 + 0.5) * 0.35;
  },
};

/*
 * Un animal realista: cuerpo + cabeza pivotante. `geom` es el resultado de la
 * fábrica ({cuerpo, cabeza, pivote}); `gesto` elige el idle de la cabeza.
 * El jitter determinista por instancia (escala no uniforme + inclinación
 * mínima, sembrado por `fase`) evita que dos animales de la misma raza sean
 * clones — la repetición evidente mata la escena (DR §1).
 */
function Animal({ geom, gesto, pos = [0, 0, 0], giro = 0, escala = 1, fase = 0, reducedMotion }) {
  const cabeza = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !cabeza.current) return;
    const mueve = GESTOS[gesto];
    if (mueve) mueve(cabeza.current, state.clock.elapsedTime, fase);
  });
  const jitter = useMemo(() => {
    const j = (k) => Math.sin(fase * 12.9898 + k * 78.233) * 0.5; // determinista
    return {
      esc: [escala * (1 + j(1) * 0.07), escala * (1 + j(2) * 0.05), escala * (1 + j(3) * 0.07)],
      rot: [j(4) * 0.03, giro, j(5) * 0.035],
    };
  }, [escala, giro, fase]);
  return (
    <group
      position={[pos[0], pos[1], pos[2]]}
      rotation={/** @type {[number, number, number]} */ (jitter.rot)}
      scale={/** @type {[number, number, number]} */ (jitter.esc)}
    >
      <mesh geometry={geom.cuerpo} material={MATERIAL_HATO} castShadow />
      <group ref={cabeza} position={geom.pivote}>
        <mesh geometry={geom.cabeza} material={MATERIAL_HATO} castShadow />
      </group>
    </group>
  );
}

/* Comedero: la canoa de madera de siempre (medio cilindro). */
function Comedero({ pos = [0, 0, 0] }) {
  return (
    <mesh position={[pos[0], pos[1], pos[2]]} castShadow receiveShadow>
      <cylinderGeometry args={[0.16, 0.16, 0.7, 10, 1, false, 0, Math.PI]} />
      <meshStandardMaterial color="#8a6a44" flatShading roughness={1} side={2} />
    </mesh>
  );
}

/* ── LAS CERCAS VIVAS: matarratón, nacedero y botón de oro ────────────────
   Las tres especies reales de la cerca viva colombiana, alternadas árbol a
   árbol para que la cerca se lea VIVA (no un seto clonado):
     · matarratón (Gliricidia sepium)      — copa verde claro, flor rosada
     · nacedero  (Trichanthera gigantea)   — copa verde profundo, redonda
     · botón de oro (Tithonia diversifolia) — mata baja con flores amarillas
   Cada especie define su silueta; las flores solo en tier rico (q ≥ 1). */
const ESPECIES_CERCA = [
  // Copas CHICAS a propósito: de perfil la cerca debe leerse como HILERA de
  // arbolitos (postes vivos), no como un bosquecito que tape el hato.
  { copa: '#9fbf6a', flor: '#e8b7c2', rCopa: 0.17, hCopa: 0.24, hTronco: 0.52 }, // matarratón
  { copa: '#6faa4e', flor: '#f0c02f', rCopa: 0.2, hCopa: 0.2, hTronco: 0.3 }, // botón de oro
  { copa: '#4e8f4a', flor: null, rCopa: 0.18, hCopa: 0.26, hTronco: 0.44 }, // nacedero
];

/* Puestos de las dos cercas (coordenadas locales del potrero; el landmark
   escala el conjunto). Cerca 1 = transversal en z=-0.75 con PORTILLO al
   centro; cerca 2 = longitudinal en x=0.55, del portillo al frente. */
function puestosCerca() {
  const puestos = [];
  let n = 0;
  // Cerca 1: de x -2.3 a 2.3, saltando el portillo (-0.35..0.35).
  for (let x = -2.3; x <= 2.31; x += 0.62) {
    if (Math.abs(x) < 0.4) continue; // el portillo: por aquí rotan los animales
    puestos.push({ x, z: -0.75 + Math.sin(n * 3.7) * 0.06, esp: n % 3 });
    n += 1;
  }
  // Cerca 2: de z -0.45 a 2.2 en x=0.55 (separa ovejas de cerdos).
  for (let z = -0.45; z <= 2.21; z += 0.66) {
    puestos.push({ x: 0.55 + Math.sin(n * 2.9) * 0.06, z, esp: n % 3 });
    n += 1;
  }
  return puestos;
}

function CercasVivas({ q = 1 }) {
  const puestos = useMemo(() => puestosCerca(), []);
  const conFlor = q >= 1;
  const flores = conFlor
    ? puestos.filter((p) => ESPECIES_CERCA[p.esp].flor)
    : [];
  return (
    <group>
      {/* troncos: 1 draw call */}
      <Instances limit={puestos.length}>
        <cylinderGeometry args={[0.03, 0.045, 1, 5]} />
        <meshLambertMaterial color="#7a5a38" />
        {puestos.map((p, i) => {
          const e = ESPECIES_CERCA[p.esp];
          return (
            <Instance
              key={i}
              position={[p.x, e.hTronco / 2, p.z]}
              scale={[1, e.hTronco, 1]}
            />
          );
        })}
      </Instances>
      {/* copas por especie (color por instancia): 1 draw call */}
      <Instances limit={puestos.length}>
        <sphereGeometry args={[1, 8, 7]} />
        <meshLambertMaterial />
        {puestos.map((p, i) => {
          const e = ESPECIES_CERCA[p.esp];
          return (
            <Instance
              key={i}
              position={[p.x, e.hTronco + e.hCopa * 0.7, p.z]}
              scale={[e.rCopa, e.hCopa, e.rCopa]}
              color={e.copa}
            />
          );
        })}
      </Instances>
      {/* las flores del matarratón y el botón de oro (solo tier rico) */}
      {flores.length > 0 && (
        <Instances limit={flores.length}>
          <sphereGeometry args={[0.055, 6, 5]} />
          <meshBasicMaterial />
          {flores.map((p, i) => {
            const e = ESPECIES_CERCA[p.esp];
            return (
              <Instance
                key={i}
                position={[p.x + 0.1, e.hTronco + e.hCopa * 1.15, p.z + 0.08]}
                color={e.flor}
              />
            );
          })}
        </Instances>
      )}
    </group>
  );
}

/* La TRANQUERA de madera al oriente: por donde llega el sendero de la casa.
   Dos botalones + tres varas — la puerta del potrero, legible de lejos. */
function Tranquera({ pos = [2.35, 0, 0.6] }) {
  return (
    <group position={pos} rotation={[0, Math.PI / 2, 0]}>
      {[-0.55, 0.55].map((dx, i) => (
        <mesh key={i} position={[dx, 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.84, 6]} />
          <meshStandardMaterial color="#6b4a2e" flatShading roughness={1} />
        </mesh>
      ))}
      {[0.24, 0.46, 0.68].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.028, 1.12, 5]} />
          <meshStandardMaterial color="#8a6a44" flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/*
 * El potrero del valle: apartos con cerca viva y el hato regado.
 * `q` (0..1) baja el detalle geométrico en gama baja (lo pasa el landmark).
 *
 *   Aparto del FONDO (z < -0.75): las vacas, a sus anchas.
 *   Aparto IZQUIERDO del frente:  las ovejas criollas.
 *   Aparto DERECHO del frente:    los cerdos con sus lechones + el gallinero
 *                                 suelto junto a la tranquera; el perro vigila.
 */
export default function AnimalesDeFinca({ reducedMotion = false, q = 1 }) {
  // Las fábricas cachean por args: esto solo compone referencias.
  const g = useMemo(
    () => ({
      holstein: geomVaca({ raza: 'holstein', q }),
      ternera: geomVaca({ raza: 'criolla', ubre: false, cuerno: 0, q }, 23),
      zungo: geomCerdo({ raza: 'zungo', q }),
      duroc: geomCerdo({ raza: 'duroc', q }, 33),
      landrace: geomCerdo({ raza: 'landrace', q }, 35),
      lechon: geomLechon({ raza: 'landrace' }),
      oveja1: geomOveja({ q }),
      oveja2: geomOveja({ q }, 67),
      oveja3: geomOveja({ q }, 71),
      campesina: geomGallina({ tipo: 'campesina', q }),
      negra: geomGallina({ tipo: 'negra', q }, 43),
      blanca: geomGallina({ tipo: 'blanca', q }, 45),
      gallo: geomGallina({ tipo: 'gallo', q }, 47),
      perro: geomPerro({ q }),
    }),
    [q],
  );
  const rm = reducedMotion;
  return (
    <group>
      {/* las cercas vivas que dividen los apartos + la tranquera de entrada */}
      <CercasVivas q={q} />
      <Tranquera />

      {/* APARTO DEL FONDO: la Holstein manda, su ternera criolla cerca pero
          no encima — pastan regadas, como en potrero de verdad */}
      <Animal geom={g.holstein} gesto="pasta" pos={[-1.3, 0, -1.7]} giro={-0.5} escala={0.62} reducedMotion={rm} />
      <Animal geom={g.ternera} gesto="pasta" pos={[0.4, 0, -1.95]} giro={-1.2} escala={0.38} fase={2.2} reducedMotion={rm} />

      {/* APARTO IZQUIERDO: las ovejas criollas — vellones DISTINTOS (seed propia) */}
      <Animal geom={g.oveja1} gesto="tantea" pos={[-1.7, 0, 0.4]} giro={1.4} escala={0.52} fase={1.7} reducedMotion={rm} />
      <Animal geom={g.oveja2} gesto="tantea" pos={[-0.9, 0, 1.4]} giro={0.5} escala={0.48} fase={4.1} reducedMotion={rm} />
      <Animal geom={g.oveja3} gesto="tantea" pos={[-1.95, 0, 1.6]} giro={-0.9} escala={0.5} fase={5.6} reducedMotion={rm} />

      {/* APARTO DERECHO: los cerdos POR RAZA, con aire entre ellos */}
      <Animal geom={g.zungo} gesto="hocica" pos={[1.25, 0, 1.15]} giro={0.3} escala={0.62} reducedMotion={rm} />
      <Animal geom={g.duroc} gesto="hocica" pos={[1.95, 0, 0.55]} giro={1.1} escala={0.6} fase={1.9} reducedMotion={rm} />
      <Animal geom={g.landrace} gesto="hocica" pos={[1.05, 0, 1.95]} giro={-0.7} escala={0.62} fase={3.4} reducedMotion={rm} />
      <mesh geometry={g.lechon} material={MATERIAL_HATO} position={[1.5, 0, 1.75]} rotation={[0, -0.4, 0]} castShadow />
      <mesh geometry={g.lechon} material={MATERIAL_HATO} position={[0.75, 0, 1.55]} rotation={[0, 0.9, 0]} scale={0.9} castShadow />

      {/* el gallinero suelto junto a la tranquera + el gallo vigilante */}
      <Animal geom={g.campesina} gesto="picotea" pos={[1.75, 0, -0.3]} giro={2.4} escala={0.8} fase={0.4} reducedMotion={rm} />
      <Animal geom={g.negra} gesto="picotea" pos={[2.05, 0, -0.1]} giro={-1.2} escala={0.76} fase={2.1} reducedMotion={rm} />
      <Animal geom={g.blanca} gesto="picotea" pos={[1.15, 0, -0.35]} giro={0.9} escala={0.78} fase={3.6} reducedMotion={rm} />
      <Animal geom={g.gallo} gesto="picotea" pos={[1.45, 0, -0.05]} giro={-2.2} escala={0.9} fase={5.2} reducedMotion={rm} />

      {/* el perro criollo, echado el ojo a todo desde la tranquera */}
      <Animal geom={g.perro} gesto="mira" pos={[2.15, 0, 0.05]} giro={-2.6} escala={0.7} fase={1.2} reducedMotion={rm} />
      <Comedero pos={[1.65, 0.16, 0.15]} />
    </group>
  );
}
