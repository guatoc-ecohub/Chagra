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
import { useLayoutEffect, useMemo, useRef } from 'react';
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

/* Transforms de las ovejas y lechones instanciados (Tarea A) — MISMOS
   valores que las <Animal>/<Lechon> sueltas que reemplazan; constantes a
   nivel de módulo para que `individuos` sea referencialmente estable entre
   renders (evita recalcular las matrices base en cada montaje de padre). */
const OVEJAS_INDIVIDUOS = [
  { pos: [-0.45, 0, 1.05], giro: 1.4, escala: 0.52, fase: 1.7 },
  { pos: [0.15, 0, 1.35], giro: 0.5, escala: 0.48, fase: 4.1 },
];
const LECHONES_INDIVIDUOS = [
  { cerdaPos: POSICION_CERDA, desplazamiento: [0.35, 0, 0.27], giro: -0.4, fase: 0.8 },
  { cerdaPos: POSICION_CERDA, desplazamiento: [-0.2, 0, 0.37], giro: 0.9, escala: 0.9, fase: 2.7 },
];

/*
 * Jitter determinista compartido por <Animal> Y por las instancias del
 * rebaño (DR presupuesto §Tarea A): la escala no uniforme + inclinación
 * mínima sembrada por `fase`, EXTRAÍDA para que un rebaño instanciado use
 * exactamente la misma fórmula que el animal individual — cero deriva entre
 * los dos caminos.
 */
function calcularJitter(escala, giro, fase) {
  const j = (k) => Math.sin(fase * 12.9898 + k * 78.233) * 0.5; // determinista
  return {
    esc: [escala * (1 + j(1) * 0.07), escala * (1 + j(2) * 0.05), escala * (1 + j(3) * 0.07)],
    rot: [j(4) * 0.03, giro, j(5) * 0.035],
  };
}

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
function Animal({
  geom,
  gesto,
  pos = [0, 0, 0],
  giro = 0,
  escala = 1,
  fase = 0,
  reducedMotion,
  /* Presupuesto (Tarea A): el gallinero (<30cm) no proyecta sombra propia —
     ya hay vaca/cerdo/comedero cerca anclando la escena, y la sombra de un
     pollo a esta distancia de cámara no se lee. Quita 2 draw-calls de la
     pasada de sombra por ave sin tocar geometría, color ni gesto. */
  castShadow = true,
}) {
  const cabeza = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !cabeza.current) return;
    const mueve = GESTOS[gesto];
    if (mueve) mueve(cabeza.current, state.clock.elapsedTime, fase);
  });
  const jitter = useMemo(() => calcularJitter(escala, giro, fase), [escala, giro, fase]);
  return (
    <group
      position={[pos[0], pos[1], pos[2]]}
      rotation={/** @type {[number, number, number]} */ (jitter.rot)}
      scale={/** @type {[number, number, number]} */ (jitter.esc)}
    >
      <mesh geometry={geom.cuerpo} material={MATERIAL_HATO} castShadow={castShadow} />
      <group ref={cabeza} position={geom.pivote}>
        <mesh geometry={geom.cabeza} material={MATERIAL_HATO} castShadow={castShadow} />
      </group>
    </group>
  );
}

/*
 * OVEJAS instanciadas (Tarea A — presupuesto): las dos ovejas comparten
 * `geomOveja` — la fábrica NO toma raza, solo semilla de PRNG interno, y
 * ambas ya se llamaban con la MISMA calidad — así que son el mismo
 * arquetipo real (no una aproximación): dos <instancedMesh> (cuerpo +
 * cabeza) reemplazan 2 animales × 2 mallas = 4 draw-calls por 2. El jitter
 * y el gesto ("tantea") son EXACTAMENTE los de <Animal> — mismo
 * `calcularJitter` y las mismas funciones de GESTOS, aplicadas a mano por
 * instancia con `setMatrixAt` en vez de un <group> de React por oveja.
 *
 * `individuos`: [{ pos:[x,y,z], giro, escala, fase }]. La malla de cuerpo es
 * estática tras montar (el jitter no depende del tiempo); solo la cabeza se
 * recalcula cuadro a cuadro para el gesto.
 */
function RebanoInstanciado({ geom, gesto, individuos, reducedMotion, castShadow = true }) {
  const refCuerpo = useRef(null);
  const refCabeza = useRef(null);
  const n = individuos.length;

  /* Matriz de cuerpo por instancia (posición + jitter): constante, no
     depende del tiempo — igual que las props JSX de <Animal>. */
  const base = useMemo(
    () =>
      individuos.map((ind) => {
        const j = calcularJitter(ind.escala ?? 1, ind.giro ?? 0, ind.fase ?? 0);
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(ind.pos[0], ind.pos[1], ind.pos[2]),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(j.rot[0], j.rot[1], j.rot[2])),
          new THREE.Vector3(j.esc[0], j.esc[1], j.esc[2]),
        );
        return { m, fase: ind.fase ?? 0 };
      }),
    [individuos],
  );

  const util = useMemo(() => ({ gestoObj: new THREE.Object3D(), m: new THREE.Matrix4() }), []);

  // Cuerpo (estático) + cabeza en reposo (primer cuadro / reducedMotion).
  useLayoutEffect(() => {
    const cB = refCuerpo.current;
    const cC = refCabeza.current;
    if (!cB || !cC) return;
    const pivoteM = new THREE.Matrix4().makeTranslation(geom.pivote[0], geom.pivote[1], geom.pivote[2]);
    base.forEach(({ m }, i) => {
      cB.setMatrixAt(i, m);
      cC.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(m, pivoteM));
    });
    cB.instanceMatrix.needsUpdate = true;
    cC.instanceMatrix.needsUpdate = true;
  }, [base, geom]);

  // Gesto de cabeza: reusa GESTOS tal cual (mismo idle que <Animal>).
  useFrame((state) => {
    const cC = refCabeza.current;
    if (reducedMotion || !cC) return;
    const mueve = GESTOS[gesto];
    if (!mueve) return;
    const t = state.clock.elapsedTime;
    base.forEach(({ m, fase }, i) => {
      util.gestoObj.rotation.set(0, 0, 0);
      util.gestoObj.position.set(0, 0, 0);
      mueve(util.gestoObj, t, fase);
      util.gestoObj.position.set(geom.pivote[0], geom.pivote[1], geom.pivote[2]);
      util.gestoObj.updateMatrix();
      util.m.multiplyMatrices(m, util.gestoObj.matrix);
      cC.setMatrixAt(i, util.m);
    });
    cC.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh
        ref={refCuerpo}
        args={[geom.cuerpo, MATERIAL_HATO, n]}
        frustumCulled={false}
        castShadow={castShadow}
      />
      <instancedMesh
        ref={refCabeza}
        args={[geom.cabeza, MATERIAL_HATO, n]}
        frustumCulled={false}
        castShadow={castShadow}
      />
    </group>
  );
}

/*
 * LECHONES instanciados (Tarea A): los dos lechones YA compartían la MISMA
 * geometría (`g.lechon` se calcula una sola vez) — solo variaban en
 * transform, así que instanciar es exacto, no una aproximación. Una malla
 * (no pivota cabeza) → UN <instancedMesh> reemplaza 2 mallas sueltas.
 * `sigueCerda` no usa jitter (a diferencia de <Animal>): posición y rotación
 * salen DIRECTO del gesto, igual que en el <Lechon> original. Sin sombra
 * propia (<30cm, presupuesto §Tarea A): la cerda y el comedero cercanos
 * ya anclan la escena.
 */
function LechonesInstanciados({ geom, individuos, reducedMotion }) {
  const ref = useRef(null);
  const util = useMemo(() => ({ o: new THREE.Object3D() }), []);
  const n = individuos.length;

  useLayoutEffect(() => {
    if (!ref.current) return;
    individuos.forEach((ind, i) => {
      util.o.position.set(
        ind.cerdaPos[0] + ind.desplazamiento[0],
        ind.cerdaPos[1] + ind.desplazamiento[1],
        ind.cerdaPos[2] + ind.desplazamiento[2],
      );
      util.o.rotation.set(0, ind.giro, 0);
      util.o.scale.setScalar(ind.escala ?? 1);
      util.o.updateMatrix();
      ref.current.setMatrixAt(i, util.o.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [individuos, util]);

  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const t = state.clock.elapsedTime;
    individuos.forEach((ind, i) => {
      util.o.scale.setScalar(ind.escala ?? 1);
      GESTOS.sigueCerda(util.o, t, ind.fase, ind.cerdaPos, ind.desplazamiento, ind.giro);
      util.o.updateMatrix();
      ref.current.setMatrixAt(i, util.o.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[geom, MATERIAL_HATO, n]} frustumCulled={false} castShadow={false} />
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
      // Rebaño instanciado (Tarea A): geomOveja no toma raza — UNA sola
      // malla real para las dos, no una aproximación.
      oveja: geomOveja({ q }),
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
      {/* lechones instanciados: misma malla, 2 mallas sueltas → 1 draw-call,
          sin sombra propia (<30cm, la cerda/comedero ya anclan la zona) */}
      <LechonesInstanciados
        geom={g.lechon}
        reducedMotion={rm}
        individuos={LECHONES_INDIVIDUOS}
      />
      {/* las ovejas criollas — instanciadas: mismo arquetipo real (geomOveja
          no toma raza), 2 animales × 2 mallas → 2 draw-calls en vez de 4 */}
      <RebanoInstanciado
        geom={g.oveja}
        gesto="tantea"
        reducedMotion={rm}
        individuos={OVEJAS_INDIVIDUOS}
      />
      {/* el gallinero suelto: tres gallinas + el gallo vigilante — sin
          sombra propia (<30cm, presupuesto §Tarea A: castShadow de a uno,
          la malla y el gesto de cada ave quedan intactos) */}
      <Animal geom={g.campesina} gesto="picotea" pos={[1.15, 0, 0.6]} giro={2.4} escala={0.8} fase={0.4} reducedMotion={rm} castShadow={false} />
      <Animal geom={g.negra} gesto="picotea" pos={[1.5, 0, 0.05]} giro={-1.2} escala={0.76} fase={2.1} reducedMotion={rm} castShadow={false} />
      <Animal geom={g.blanca} gesto="picotea" pos={[0.7, 0, 1.1]} giro={0.9} escala={0.78} fase={3.6} reducedMotion={rm} castShadow={false} />
      <Animal geom={g.gallo} gesto="picotea" pos={[1.45, 0, 0.95]} giro={-2.2} escala={0.9} fase={5.2} reducedMotion={rm} castShadow={false} />
      {/* el perro criollo, echado el ojo a todo desde su esquina */}
      <Animal geom={g.perro} gesto="mira" pos={[1.05, 0, -0.85]} giro={-2.6} escala={0.7} fase={1.2} reducedMotion={rm} />
      <Comedero pos={[1.55, 0.16, -0.45]} />
    </group>
  );
}
