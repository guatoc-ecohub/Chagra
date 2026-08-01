/*
 * FloraPapa — el PAPAL de tierra fría sembrado sobre sus caballones.
 *
 * Consume `floraPapa.geom.js`: cada especie es UN InstancedMesh de una
 * geometría fusionada (una draw-call por especie, por más matas que haya) —
 * mismo contrato tier-safe que FloraCafetal. La FLOR lleva color POR INSTANCIA
 * (lila o blanca, la variedad de cada mata) y la PAPA también (amarilla criolla,
 * roja, morada — la diversidad andina destapada en el rincón de cosecha).
 *
 * En 'alto' se suma el VAHO DE FLORACIÓN: puntitos de polen/luz fría que
 * flotan apenas sobre el lote florecido — el aire delgado de la montaña alta
 * haciéndose visible. `reducedMotion` los deja quietos.
 *
 * Componente r3f: montar dentro del <Canvas> de EscenaPapaVivo.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import {
  papalDeTier,
  calidadPapa,
  distribucionPapal,
  alturaLadera,
  geomMataPapa,
  geomFlorPapa,
  geomPapa,
  geomPaja,
  geomFrailejon,
  geomMonticulo,
  geomPiedra,
} from './floraPapa.geom.js';
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
 * El VAHO de floración: puntitos fríos que flotan despacito sobre el lote
 * florecido — polen y aire delgado de montaña alta. Solo 'alto'; con
 * reducedMotion quedan quietos (presencia sin parpadeo).
 */
function VahoFloracion({ reducedMotion }) {
  const puntos = useRef(null);
  const datos = useMemo(() => {
    const r = rng(131);
    const n = 42;
    const pos = new Float32Array(n * 3);
    const fase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = -13 + r() * 26;
      const z = -9 + r() * 16;
      pos[i * 3] = x;
      pos[i * 3 + 1] = alturaLadera(x, z) + 0.5 + r() * 1.1;
      pos[i * 3 + 2] = z;
      fase[i] = r() * Math.PI * 2;
    }
    return { pos, fase, n };
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(datos.pos.slice(), 3));
    return g;
  }, [datos]);

  useLayoutEffect(() => () => geo.dispose(), [geo]);

  useFrame(({ clock }) => {
    const p = puntos.current;
    if (reducedMotion || !p) return;
    const t = clock.elapsedTime;
    const arr = p.geometry.attributes.position.array;
    for (let i = 0; i < datos.n; i++) {
      arr[i * 3 + 1] = datos.pos[i * 3 + 1] + Math.sin(t * 0.45 + datos.fase[i]) * 0.16;
    }
    p.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={puntos} geometry={geo}>
      <pointsMaterial
        color="#f0ead8"
        size={0.09}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </points>
  );
}

/**
 * La capa viva del papal. Montar dentro del <Canvas>.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function FloraPapa({ tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const conteos = papalDeTier(tier);
  const q = calidadPapa(tier);

  // Geometrías fusionadas (una vez por tier).
  const geos = useMemo(
    () => ({
      mata: geomMataPapa({ q }, 31),
      flor: geomFlorPapa(),
      papa: geomPapa(),
      paja: conteos.paja ? geomPaja({ q }, 33) : null,
      frailejon: conteos.frailejon ? geomFrailejon({ q }, 34) : null,
      monticulo: conteos.monticulo ? geomMonticulo(35) : null,
      piedra: conteos.piedra ? geomPiedra(36) : null,
    }),
    [conteos, q],
  );

  // Material único con vertexColors (el color viene horneado por especie y el
  // tinte por instancia lo multiplica — en flor y papa el tinte ES el color).
  const mat = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.88, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  // Distribución determinista (una vez por tier).
  const dist = useMemo(() => distribucionPapal(conteos, 419), [conteos]);

  // Liberar GPU al desmontar.
  useLayoutEffect(
    () => () => {
      Object.values(geos).forEach((g) => g && g.dispose());
      mat.dispose();
    },
    [geos, mat],
  );

  const sombra = perfil.sombras; // solo lo que abulta proyecta sombra en 'alto'

  return (
    <group>
      {/* El pajonal y la piedra: la tierra alta rodeando el lote. */}
      <Especie geo={geos.paja} mat={mat} items={dist.paja} />
      <Especie geo={geos.piedra} mat={mat} items={dist.piedra} />

      {/* EL CULTIVO: las matas sobre el lomo del caballón y su flor. */}
      <Especie geo={geos.mata} mat={mat} items={dist.mata} castShadow={sombra} />
      <Especie geo={geos.flor} mat={mat} items={dist.flor} />

      {/* LA COSECHA: la tierra abierta y las papas destapadas (variedades). */}
      <Especie geo={geos.monticulo} mat={mat} items={dist.monticulo} />
      <Especie geo={geos.papa} mat={mat} items={dist.papa} />

      {/* Los frailejones LEJANOS: el páramo asomado en la loma del fondo. */}
      <Especie geo={geos.frailejon} mat={mat} items={dist.frailejon} castShadow={sombra} />

      {/* El vaho frío sobre el lote florecido (solo gama alta). */}
      {tier === 'alto' && <VahoFloracion reducedMotion={reducedMotion} />}
    </group>
  );
}
