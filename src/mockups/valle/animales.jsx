/* eslint-disable react-refresh/only-export-components -- exporta los materiales
   compartidos (MATERIAL_FINCA para la arboleda, MATERIAL_HATO para el ganado)
   además del componente. */
/*
 * Animales de finca del valle — REALISTAS por raza (veredicto del operador:
 * "formas muy geométricas, aún no parecen animales reales" → rehechos).
 *
 * Las mallas viven en src/visual/mundo3d/finca/fincaRealista.geom.js: torso
 * como loft orgánico (silueta continua con lomo, grupa y panza reales), AO y
 * luz de cielo HORNEADOS en vertexColors y normales suaves preservadas en la
 * fusión. Cada animal son DOS draw-calls: el cuerpo (una malla) y la cabeza
 * (otra, local al pivote del cuello) para conservar el gesto vivo — la vaca
 * pasta, la gallina picotea, el cerdo hocica, el perro mira. Con
 * `reducedMotion` la escena queda quieta en un fotograma digno. Todo
 * procedural: cero GLTF, cero texturas, offline y liviano.
 *
 * El hato del valle (razas reales de Colombia):
 *   · vaca Holstein (la lechera de clima frío) con su ternera criolla
 *   · cerdos que SE DISTINGUEN: zungo negro, duroc colorado y una landrace
 *     rosada larga con sus dos lechones
 *   · ovejas criollas de cara oscura (cada una con su vellón), gallinas
 *     (campesina/negra/blanca) + gallo, y el perro criollo amarillo
 *
 * Los personajes rubber-hose (src/visual/creatures/) NO se tocan: son la fauna
 * con alma. Esto es el ganado, y va realista. Decorativo (aria-hidden): el
 * botón accesible del mundo lo pone MundoLugar.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  geomVaca,
  geomCerdo,
  geomLechon,
  geomGallina,
  geomPerro,
  geomOveja,
} from '../../visual/mundo3d/finca/fincaRealista.geom.js';
import { GESTOS } from './gestosAnimal.js';

const POSICION_CERDA = [-1.55, 0, 0.35];

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

function Lechon({ geom, cerdaPos, desplazamiento, giro, escala = 1, fase, reducedMotion }) {
  const lechon = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !lechon.current) return;
    GESTOS.sigueCerda(lechon.current, state.clock.elapsedTime, fase, cerdaPos, desplazamiento, giro);
  });
  const pos = [
    cerdaPos[0] + desplazamiento[0],
    cerdaPos[1] + desplazamiento[1],
    cerdaPos[2] + desplazamiento[2],
  ];
  return (
    <mesh
      ref={lechon}
      geometry={geom}
      material={MATERIAL_HATO}
      position={pos}
      rotation={[0, giro, 0]}
      scale={escala}
      castShadow
    />
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

/*
 * La zona de animales del valle: el hato realista con aire entre animales.
 * `q` (0..1) baja el detalle geométrico en gama baja (lo pasa el landmark).
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
      {/* la Holstein manda el corral; su ternera criolla al lado */}
      <Animal geom={g.holstein} gesto="pasta" pos={[0.2, 0, -0.4]} giro={-0.5} escala={0.62} reducedMotion={rm} />
      <Animal geom={g.ternera} gesto="pasta" pos={[0.85, 0, 0.15]} giro={-1.1} escala={0.38} fase={2.2} reducedMotion={rm} />
      {/* los cerdos POR RAZA: negro zungo, colorado duroc, landrace con cría */}
      <Animal geom={g.zungo} gesto="hocica" pos={[-1.45, 0, -0.5]} giro={0.3} escala={0.62} reducedMotion={rm} />
      <Animal geom={g.duroc} gesto="hocica" pos={[-0.95, 0, -1.0]} giro={1.1} escala={0.6} fase={1.9} reducedMotion={rm} />
      <Animal geom={g.landrace} gesto="hocica" pos={POSICION_CERDA} giro={-0.7} escala={0.62} fase={3.4} reducedMotion={rm} />
      <Lechon geom={g.lechon} cerdaPos={POSICION_CERDA} desplazamiento={[0.35, 0, 0.27]} giro={-0.4} fase={0.8} reducedMotion={rm} />
      <Lechon geom={g.lechon} cerdaPos={POSICION_CERDA} desplazamiento={[-0.2, 0, 0.37]} giro={0.9} escala={0.9} fase={2.7} reducedMotion={rm} />
      {/* las ovejas criollas — vellones DISTINTOS (seed propia) */}
      <Animal geom={g.oveja1} gesto="tantea" pos={[-0.45, 0, 1.05]} giro={1.4} escala={0.52} fase={1.7} reducedMotion={rm} />
      <Animal geom={g.oveja2} gesto="tantea" pos={[0.15, 0, 1.35]} giro={0.5} escala={0.48} fase={4.1} reducedMotion={rm} />
      {/* el gallinero suelto: tres gallinas + el gallo vigilante */}
      <Animal geom={g.campesina} gesto="picotea" pos={[1.15, 0, 0.6]} giro={2.4} escala={0.8} fase={0.4} reducedMotion={rm} />
      <Animal geom={g.negra} gesto="picotea" pos={[1.5, 0, 0.05]} giro={-1.2} escala={0.76} fase={2.1} reducedMotion={rm} />
      <Animal geom={g.blanca} gesto="picotea" pos={[0.7, 0, 1.1]} giro={0.9} escala={0.78} fase={3.6} reducedMotion={rm} />
      <Animal geom={g.gallo} gesto="picotea" pos={[1.45, 0, 0.95]} giro={-2.2} escala={0.9} fase={5.2} reducedMotion={rm} />
      {/* el perro criollo, echado el ojo a todo desde su esquina */}
      <Animal geom={g.perro} gesto="mira" pos={[1.05, 0, -0.85]} giro={-2.6} escala={0.7} fase={1.2} reducedMotion={rm} />
      <Comedero pos={[1.55, 0.16, -0.45]} />
    </group>
  );
}
