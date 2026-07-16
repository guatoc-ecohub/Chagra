/*
 * FloraCafetal — el CAFETAL BAJO SOMBRA sembrado en la ladera.
 *
 * Consume `floraCafetal.geom.js`: cada especie es UN InstancedMesh de una
 * geometría fusionada (una draw-call por especie, por más matas que haya) —
 * mismo contrato tier-safe que `FloraParamo` del bosque. La CEREZA lleva color
 * POR INSTANCIA (verde → pintón → rojo): un solo InstancedMesh cuenta todos los
 * estados de maduración del grano.
 *
 * En 'alto' se suma la LUZ COLADA: dapples dorados que respiran en el suelo
 * bajo las copas del sombrío — el sol filtrándose entre las hojas del guamo,
 * la imagen que explica el mundo entero. `reducedMotion` los deja quietos.
 *
 * Componente r3f: montar dentro del <Canvas> de EscenaCafetalVivo.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import {
  cafetalDeTier,
  calidadCafetal,
  distribucionCafetal,
  centrosSombrio,
  alturaLadera,
  geomCafeto,
  geomCereza,
  geomGuamo,
  geomNogal,
  geomPlatano,
  geomHojarasca,
  geomPiedra,
} from './floraCafetal.geom.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* Un banco de matas de UNA especie: una geometría, un material, N instancias.
   (Mismo patrón que `Especie` de FloraParamo — el molde de la casa.) */
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
 * respiran apenas (el sol moviéndose entre las hojas). Solo 'alto'; con
 * reducedMotion quedan quietos (presencia sin parpadeo).
 */
function LuzColada({ centros, reducedMotion }) {
  const grupo = useRef(null);
  const manchas = useMemo(() => {
    const r = rng(97);
    const lista = [];
    centros.forEach((c) => {
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const x = c[0] + (r() - 0.5) * 3.6;
        const z = c[2] + (r() - 0.5) * 3.6;
        lista.push({
          pos: /** @type {[number, number, number]} */ ([x, alturaLadera(x, z) + 0.05, z]),
          r: 0.45 + r() * 0.65,
          fase: r() * Math.PI * 2,
          op: 0.09 + r() * 0.06,
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
 * La capa viva del cafetal. Montar dentro del <Canvas>.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function FloraCafetal({ tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const conteos = cafetalDeTier(tier);
  const q = calidadCafetal(tier);

  // Geometrías fusionadas (una vez por tier).
  const geos = useMemo(
    () => ({
      cafeto: geomCafeto({ q }, 21),
      cereza: geomCereza(),
      guamo: conteos.guamo ? geomGuamo({ q }, 22) : null,
      nogal: conteos.nogal ? geomNogal({ q }, 23) : null,
      platano: conteos.platano ? geomPlatano({ q }, 24) : null,
      hojarasca: conteos.hojarasca ? geomHojarasca(25) : null,
      piedra: conteos.piedra ? geomPiedra(26) : null,
    }),
    [conteos, q],
  );

  // Material único con vertexColors (el color viene horneado por especie y el
  // tinte por instancia lo multiplica — en la cereza el tinte ES el color).
  const mat = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.85, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  // Distribución determinista (una vez por tier).
  const dist = useMemo(() => distribucionCafetal(conteos, 311), [conteos]);
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
      {/* El suelo del cafetal: hojarasca bajo el sombrío, piedras. */}
      <Especie geo={geos.hojarasca} mat={mat} items={dist.hojarasca} />
      <Especie geo={geos.piedra} mat={mat} items={dist.piedra} />

      {/* EL CULTIVO: los surcos de cafetos y sus cerezas (verde→pintón→rojo). */}
      <Especie geo={geos.cafeto} mat={mat} items={dist.cafeto} />
      <Especie geo={geos.cereza} mat={mat} items={dist.cereza} />

      {/* EL SOMBRÍO: guamos y nogales que le hacen techo al café. */}
      <Especie geo={geos.guamo} mat={mat} items={dist.guamo} castShadow={sombra} />
      <Especie geo={geos.nogal} mat={mat} items={dist.nogal} castShadow={sombra} />

      {/* El plátano intercalado del cafetal campesino. */}
      <Especie geo={geos.platano} mat={mat} items={dist.platano} castShadow={sombra} />

      {/* La luz que se cuela entre las hojas del sombrío (solo gama alta). */}
      {tier === 'alto' && <LuzColada centros={centros} reducedMotion={reducedMotion} />}
    </group>
  );
}
