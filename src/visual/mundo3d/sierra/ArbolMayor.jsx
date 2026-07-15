/*
 * ArbolMayor — un árbol de la Sierra en pantalla. La geometría (ramificación,
 * conicidad, follaje y TODO el sombreado horneado) vive en `arbolMayor.geom.js`;
 * aquí solo se monta, se le pone material y se le da vida.
 *
 * ── QUÉ CAMBIÓ (y por qué) ──────────────────────────────────────────────────
 * La versión anterior armaba el árbol EN el componente: un tubo de radio
 * constante por tallo y un puñado de icosaedros sueltos como copa, cada uno con
 * su propio `<mesh>` y su propio material. Eso era, a la vez, el problema
 * artístico (el "árbol de navidad" que el DR de realismo diagnostica) y el
 * problema de rendimiento (una decena de draw-calls por árbol). Ahora:
 *
 *   · UNA geometría fusionada por (especie × variante × calidad) → UN mesh, UN
 *     material, UNA draw-call por árbol. El follaje ya no es un mesh por blob.
 *   · El color va horneado en el vértice (AO, gradiente, contraluz, variación).
 *     El material es un Lambert con `vertexColors`: sin shaders propios, que el
 *     repo no usa ninguno y esto corre en Android barato.
 *   · CACHÉ de geometría compartida (`cacheArboles.js`): construir un árbol
 *     cuesta (ramifica y hornea). Cuatro héroes, sus acompañantes y el bosque
 *     comparten geometría; sin caché se reconstruiría una y otra vez la misma.
 *     Ojo: la geometría es COMPARTIDA — este componente NO le hace dispose (ver
 *     la nota de `cacheArboles.js`); el material sí es suyo y sí lo libera.
 *
 * ── VIDA ────────────────────────────────────────────────────────────────────
 * El árbol se mece desde el PIE (pivote abajo), lento, con fase propia. Los
 * árboles grandes pesan más y se mueven menos. `reducedMotion` los deja quietos.
 * Es mecido de objeto, no de vértice: sin shader de viento, el follaje no puede
 * moverse aparte del tronco — y un mecido entero y sobrio miente menos que un
 * árbol tieso.
 *
 * Componente r3f: montar SOLO dentro de un <Canvas>.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ESPECIES, calidadDeTier } from './arbolMayor.geom.js';
import { geomCacheada } from './cacheArboles.js';

/**
 * Un árbol de la Sierra.
 *
 * @param {object} props
 * @param {'quenua'|'roble'|'guayacan'|'ceiba'} [props.tipo='roble']
 * @param {'alto'|'medio'|'bajo'} [props.tier='alto']  calidad geométrica.
 * @param {number} [props.variante=0]  otro árbol de la misma especie.
 * @param {number} [props.escala=1]
 * @param {[number,number,number]} [props.position]
 * @param {[number,number,number]} [props.rotation]
 * @param {boolean} [props.reducedMotion=false]  lo deja quieto.
 * @param {number} [props.semilla=1]  desfasa el mecido (que no meza todo a la vez).
 */
export default function ArbolMayor({
  tipo = 'roble',
  tier = 'alto',
  variante = 0,
  escala = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  reducedMotion = false,
  semilla = 1,
}) {
  const def = ESPECIES[tipo] || ESPECIES.roble;
  const clave = ESPECIES[tipo] ? tipo : 'roble';
  const pivote = useRef(null);

  const geo = useMemo(
    () => geomCacheada(clave, { q: calidadDeTier(tier), variante }),
    [clave, tier, variante],
  );

  // el material sí es propio de este árbol: se dispone al desmontar (la
  // geometría NO: es compartida, ver la nota del caché)
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);

  const fase = useMemo(() => semilla * 1.7, [semilla]);

  useFrame((st) => {
    if (reducedMotion || !pivote.current) return;
    const t = st.clock.elapsedTime;
    // los árboles grandes pesan: menos amplitud. El páramo mece más que el valle.
    const amp = 0.014 + 0.016 / Math.max(1, def.alto);
    pivote.current.rotation.z = (rotation[2] || 0) + Math.sin(t * 0.45 + fase) * amp;
    pivote.current.rotation.x = (rotation[0] || 0) + Math.cos(t * 0.33 + fase) * amp * 0.5;
  });

  return (
    <group position={position} scale={escala}>
      {/* pivote al pie: el mecido gira el árbol entero desde la base, como un
          árbol real — no desde el centro, que lo haría patinar */}
      <group ref={pivote} rotation={rotation}>
        <mesh geometry={geo} material={mat} />
      </group>
    </group>
  );
}
