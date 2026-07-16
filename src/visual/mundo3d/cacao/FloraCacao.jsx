/*
 * FloraCacao — el CACAOTAL BAJO SOMBRA sembrado en la vega caliente.
 *
 * Consume `floraCacao.geom.js`: cada especie es UN InstancedMesh de una
 * geometría fusionada (una draw-call por especie, por más matas que haya) —
 * mismo contrato tier-safe que `FloraCafetal` del mundo del café. La MAZORCA
 * lleva color POR INSTANCIA (verde → amarillo → rojo-marrón): un solo
 * InstancedMesh cuenta todos los estados de maduración del fruto, colgado del
 * tronco de su mata (caulifloria).
 *
 * En 'alto' se suma la LUZ COLADA: dapples dorados que respiran en el suelo
 * bajo las copas del sombrío — el sol de tierra caliente filtrándose entre las
 * hojas del guamo. `reducedMotion` los deja quietos.
 *
 * Componente r3f: montar dentro del <Canvas> de EscenaCacaoVivo.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import {
  cacaotalDeTier,
  calidadCacao,
  distribucionCacaotal,
  centrosSombrio,
  alturaVega,
  geomCacao,
  geomMazorca,
  geomGuamo,
  geomPlatano,
  geomTroncoCaido,
  geomHojarasca,
  geomPiedra,
} from './floraCacao.geom.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* Un banco de matas de UNA especie: una geometría, un material, N instancias.
   (Mismo patrón que `Especie` de FloraCafetal — el molde de la casa.) */
function Especie({ geo, mat, items, castShadow = false }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !items.length) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      p.set(it.pos[0], it.pos[1], it.pos[2]);
      e.set(0, it.rotY, 0);
      q.setFromEuler(e);
      s.setScalar(it.escala);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      col.setRGB(it.tint[0], it.tint[1], it.tint[2]);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);

  if (!geo || !items.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, items.length]}
      frustumCulled={false}
      castShadow={castShadow}
    />
  );
}

/*
 * La LUZ COLADA bajo el sombrío: discos dorados aditivos sobre el suelo, que
 * respiran apenas (el sol de tierra caliente entre las hojas del guamo). Solo
 * 'alto'; con reducedMotion quedan quietos (presencia sin parpadeo).
 */
function LuzColada({ centros, reducedMotion }) {
  const grupo = useRef(null);
  const manchas = useMemo(() => {
    const r = rng(131);
    const lista = [];
    centros.forEach((c) => {
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const x = c[0] + (r() - 0.5) * 4.0;
        const z = c[2] + (r() - 0.5) * 4.0;
        lista.push({
          pos: /** @type {[number, number, number]} */ ([x, alturaVega(x, z) + 0.05, z]),
          r: 0.5 + r() * 0.7,
          fase: r() * Math.PI * 2,
          op: 0.1 + r() * 0.07,
        });
      }
    });
    return lista;
  }, [centros]);

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (reducedMotion || !g) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const m = g.children[i];
      const d = manchas[i];
      m.material.opacity = d.op * (0.55 + 0.45 * Math.sin(t * 0.7 + d.fase));
    }
  });

  return (
    <group ref={grupo}>
      {manchas.map((d, i) => (
        <mesh key={i} position={d.pos} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[d.r, 14]} />
          <meshBasicMaterial
            color="#ffe6a6"
            transparent
            opacity={d.op}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * La capa viva del cacaotal. Montar dentro del <Canvas>.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function FloraCacao({ tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const conteos = cacaotalDeTier(tier);
  const q = calidadCacao(tier);

  // Geometrías fusionadas (una vez por tier).
  const geos = useMemo(
    () => ({
      cacao: geomCacao({ q }, 31),
      mazorca: geomMazorca(),
      guamo: conteos.guamo ? geomGuamo({ q }, 32) : null,
      platano: conteos.platano ? geomPlatano({ q }, 33) : null,
      tronco: conteos.tronco ? geomTroncoCaido(34) : null,
      hojarasca: conteos.hojarasca ? geomHojarasca(35) : null,
      piedra: conteos.piedra ? geomPiedra(36) : null,
    }),
    [conteos, q],
  );

  // Material único con vertexColors (el color viene horneado por especie y el
  // tinte por instancia lo multiplica — en la mazorca el tinte ES el color).
  const mat = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.85, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  // Distribución determinista (una vez por tier).
  const dist = useMemo(() => distribucionCacaotal(conteos, 417), [conteos]);
  const centros = useMemo(() => centrosSombrio(conteos), [conteos]);

  // Liberar GPU al desmontar.
  useLayoutEffect(
    () => () => {
      Object.values(geos).forEach((g) => g && g.dispose());
      mat.dispose();
    },
    [geos, mat],
  );

  const sombra = perfil.sombras; // solo el sombrío proyecta sombra en 'alto'

  return (
    <group>
      {/* El suelo del cacaotal: hojarasca gruesa, tronco caído, piedras. */}
      <Especie geo={geos.hojarasca} mat={mat} items={dist.hojarasca} />
      <Especie geo={geos.tronco} mat={mat} items={dist.tronco} />
      <Especie geo={geos.piedra} mat={mat} items={dist.piedra} />

      {/* EL CULTIVO: las matas de cacao y sus mazorcas pegadas del tronco. */}
      <Especie geo={geos.cacao} mat={mat} items={dist.cacao} />
      <Especie geo={geos.mazorca} mat={mat} items={dist.mazorca} />

      {/* EL SOMBRÍO: guamos que le hacen techo al cacao. */}
      <Especie geo={geos.guamo} mat={mat} items={dist.guamo} castShadow={sombra} />

      {/* El plátano intercalado del cacaotal campesino. */}
      <Especie geo={geos.platano} mat={mat} items={dist.platano} castShadow={sombra} />

      {/* La luz que se cuela entre las hojas del sombrío (solo gama alta). */}
      {tier === 'alto' && <LuzColada centros={centros} reducedMotion={reducedMotion} />}
    </group>
  );
}
