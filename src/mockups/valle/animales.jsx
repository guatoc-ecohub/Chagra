/* eslint-disable react-refresh/only-export-components -- exporta MATERIAL_FINCA
   (constante compartida de las mallas horneadas) además del componente. */
/*
 * Animales de finca del valle — REALISTAS por raza (feedback del operador:
 * "la vaca que parezca vaca, los cerdos por raza").
 *
 * Las mallas viven en src/visual/mundo3d/finca/fincaRealista.geom.js (patrón
 * floraParamo: geometría FUSIONADA con color horneado en vertexColors). Cada
 * animal son DOS draw-calls: el cuerpo (una malla) y la cabeza (otra, local al
 * pivote del cuello) para conservar el gesto vivo — la vaca pasta, la gallina
 * picotea, el cerdo hocica, el perro mira. Con `reducedMotion` la escena queda
 * quieta en un fotograma digno. Todo procedural: cero GLTF, offline y liviano.
 *
 * El hato del valle (razas reales de Colombia):
 *   · vaca Holstein (la lechera de clima frío) con su ternera criolla
 *   · cerdos que SE DISTINGUEN: zungo negro, duroc colorado y una landrace
 *     rosada larga con sus dos lechones
 *   · ovejas criollas de cara oscura, gallinas (campesina/negra/blanca) + gallo
 *   · el perro criollo amarillo que no falta en ninguna finca
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

/* Material ÚNICO compartido por toda la finca realista: cada malla trae su
   color horneado en vertexColors → un solo programa para todo el hato, y la
   arboleda por especie usa el mismo export. UNO para todas: cada malla
   fusionada es 1 draw call. */
export const MATERIAL_FINCA = new THREE.MeshLambertMaterial({
  vertexColors: true,
  flatShading: true,
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
 */
function Animal({ geom, gesto, pos = [0, 0, 0], giro = 0, escala = 1, fase = 0, reducedMotion }) {
  const cabeza = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !cabeza.current) return;
    const mueve = GESTOS[gesto];
    if (mueve) mueve(cabeza.current, state.clock.elapsedTime, fase);
  });
  return (
    <group position={[pos[0], pos[1], pos[2]]} rotation={[0, giro, 0]} scale={escala}>
      <mesh geometry={geom.cuerpo} material={MATERIAL_FINCA} castShadow />
      <group ref={cabeza} position={geom.pivote}>
        <mesh geometry={geom.cabeza} material={MATERIAL_FINCA} castShadow />
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

/*
 * La zona de animales del valle: el hato realista con aire entre animales.
 * `q` (0..1) baja el detalle geométrico en gama baja (lo pasa el landmark).
 */
export default function AnimalesDeFinca({ reducedMotion = false, q = 1 }) {
  // Las fábricas cachean por args: esto solo compone referencias.
  const g = useMemo(
    () => ({
      holstein: geomVaca({ raza: 'holstein', q }),
      ternera: geomVaca({ raza: 'criolla', ubre: false, q }),
      zungo: geomCerdo({ raza: 'zungo', q }),
      duroc: geomCerdo({ raza: 'duroc', q }),
      landrace: geomCerdo({ raza: 'landrace', q }),
      lechon: geomLechon({ raza: 'landrace' }),
      oveja: geomOveja({ q }),
      campesina: geomGallina({ tipo: 'campesina', q }),
      negra: geomGallina({ tipo: 'negra', q }),
      blanca: geomGallina({ tipo: 'blanca', q }),
      gallo: geomGallina({ tipo: 'gallo', q }),
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
      <Animal geom={g.landrace} gesto="hocica" pos={[-1.55, 0, 0.35]} giro={-0.7} escala={0.62} fase={3.4} reducedMotion={rm} />
      <mesh geometry={g.lechon} material={MATERIAL_FINCA} position={[-1.2, 0, 0.62]} rotation={[0, -0.4, 0]} castShadow />
      <mesh geometry={g.lechon} material={MATERIAL_FINCA} position={[-1.75, 0, 0.72]} rotation={[0, 0.9, 0]} scale={0.9} castShadow />
      {/* las ovejas criollas */}
      <Animal geom={g.oveja} gesto="tantea" pos={[-0.45, 0, 1.05]} giro={1.4} escala={0.52} fase={1.7} reducedMotion={rm} />
      <Animal geom={g.oveja} gesto="tantea" pos={[0.15, 0, 1.35]} giro={0.5} escala={0.48} fase={4.1} reducedMotion={rm} />
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
