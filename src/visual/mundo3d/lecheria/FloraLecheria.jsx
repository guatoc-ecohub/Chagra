/*
 * FloraLecheria — el POTRERO SILVOPASTORIL sembrado: el banco forrajero vivo.
 *
 * Consume `floraLecheria.geom.js`: cada especie forrajera es UN InstancedMesh de
 * una geometría fusionada (una draw-call por especie, por más matas que haya) —
 * mismo contrato tier-safe que `FloraCafetal`. La flor va HORNEADA en la
 * geometría de cada especie (la rosada del matarratón, la amarilla del botón de
 * oro), así el potrero se lee a golpe de vista: no es pasto pelado, es sombra,
 * forraje y flor.
 *
 * En 'alto' se suma la LUZ COLADA bajo el banco forrajero (el sol entre las
 * copas del nacedero y la leucaena) — con `reducedMotion` queda quieta.
 *
 * Componente r3f: montar dentro del <Canvas> de EscenaLecheriaViva.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import {
  lecheriaDeTier,
  calidadLecheria,
  distribucionLecheria,
  centrosSombra,
  alturaPotrero,
  geomNacedero,
  geomMatarraton,
  geomLeucaena,
  geomBotonDeOro,
  geomPasto,
  geomBoniga,
} from './floraLecheria.geom.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* Un banco de matas de UNA especie: una geometría, un material, N instancias.
   (Mismo molde que `Especie` de FloraCafetal.) */
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
 * La LUZ COLADA bajo el banco forrajero: discos dorados aditivos sobre el pasto,
 * que respiran apenas (el sol moviéndose entre las hojas del nacedero y la
 * leucaena). Solo 'alto'; con reducedMotion quedan quietos.
 */
function LuzColada({ centros, reducedMotion }) {
  const grupo = useRef(null);
  const manchas = useMemo(() => {
    const r = rng(131);
    const lista = [];
    centros.forEach((c) => {
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const x = c[0] + (r() - 0.5) * 3.4;
        const z = c[2] + (r() - 0.5) * 3.4;
        lista.push({
          pos: /** @type {[number, number, number]} */ ([x, alturaPotrero(x, z) + 0.05, z]),
          r: 0.42 + r() * 0.6,
          fase: r() * Math.PI * 2,
          op: 0.08 + r() * 0.06,
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
            color="#ffe9b8"
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
 * La capa viva del potrero silvopastoril. Montar dentro del <Canvas>.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function FloraLecheria({ tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const conteos = lecheriaDeTier(tier);
  const q = calidadLecheria(tier);

  const geos = useMemo(
    () => ({
      nacedero: conteos.nacedero ? geomNacedero({ q }, 41) : null,
      matarraton: conteos.matarraton ? geomMatarraton({ q }, 42) : null,
      leucaena: conteos.leucaena ? geomLeucaena({ q }, 43) : null,
      botonDeOro: conteos.botonDeOro ? geomBotonDeOro({ q }, 44) : null,
      pasto: conteos.pasto ? geomPasto({ q }, 45) : null,
      boniga: conteos.boniga ? geomBoniga(46) : null,
    }),
    [conteos, q],
  );

  const mat = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.9, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  const dist = useMemo(() => distribucionLecheria(conteos, 707), [conteos]);
  const centros = useMemo(() => centrosSombra(conteos), [conteos]);

  useLayoutEffect(
    () => () => {
      Object.values(geos).forEach((g) => g && g.dispose());
      mat.dispose();
    },
    [geos, mat],
  );

  const sombra = perfil.sombras;

  return (
    <group>
      {/* El suelo del potrero: las boñigas (materia prima del ciclo) y el pasto. */}
      <Especie geo={geos.boniga} mat={mat} items={dist.boniga} />
      <Especie geo={geos.pasto} mat={mat} items={dist.pasto} />

      {/* EL BANCO FORRAJERO: los árboles y arbustos que hacen el silvopastoril. */}
      <Especie geo={geos.nacedero} mat={mat} items={dist.nacedero} castShadow={sombra} />
      <Especie geo={geos.matarraton} mat={mat} items={dist.matarraton} castShadow={sombra} />
      <Especie geo={geos.leucaena} mat={mat} items={dist.leucaena} castShadow={sombra} />
      <Especie geo={geos.botonDeOro} mat={mat} items={dist.botonDeOro} />

      {/* La luz que se cuela entre las copas del banco forrajero (gama alta). */}
      {tier === 'alto' && <LuzColada centros={centros} reducedMotion={reducedMotion} />}
    </group>
  );
}
