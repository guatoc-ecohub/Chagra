/*
 * FloraInvernadero — la VIDA sembrada bajo el plástico.
 *
 * Consume `invernadero.geom.js`: cada familia es UN InstancedMesh de una
 * geometría fusionada (una draw-call por familia) — mismo contrato tier-safe
 * que `FloraCafetal`. El BROTE y el FRUTO llevan color POR INSTANCIA: un solo
 * InstancedMesh cuenta todas las etapas de la germinación y de la maduración.
 *
 * En 'alto' los BROTES RESPIRAN: una onda mínima de escala recorre las
 * bandejas (la plántula tierna que se mece con el aire tibio del túnel).
 * Es la única animación por instancia y es barata: ~90 matrices recompuestas
 * por frame, solo en gama alta. `reducedMotion` las deja quietas.
 *
 * Componente r3f: montar dentro del <Canvas> de EscenaInvernaderoVivo.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import {
  invernaderoDeTier,
  distribucionInvernadero,
  geomBandeja,
  geomBrote,
  geomTomatePlanta,
  geomTomateFruto,
  geomHortaliza,
  geomBolsa,
} from './invernadero.geom.js';

/* Un banco de matas de UNA familia: una geometría, un material, N instancias.
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

/* Los BROTES que respiran: mismo banco instanciado, pero en 'alto' (y sin
   reduced-motion) cada frame recompone las matrices con una escala que ondula
   — la bandeja entera se mece apenas, como plántula bajo aire tibio. */
function BrotesVivos({ geo, mat, items, respiran }) {
  const ref = useRef(null);
  const util = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      p: new THREE.Vector3(),
      s: new THREE.Vector3(),
    }),
    [],
  );

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !items.length) return;
    const { m, q, e, p, s } = util;
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
  }, [items, util]);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!respiran || !mesh || !items.length) return;
    const t = clock.elapsedTime;
    const { m, q, e, p, s } = util;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      // la onda recorre la mesa en diagonal; amplitud mínima (respiración)
      const resp = 1 + 0.045 * Math.sin(t * 1.5 + it.pos[0] * 3.1 + it.pos[2] * 2.3);
      p.set(it.pos[0], it.pos[1], it.pos[2]);
      e.set(0, it.rotY, 0.02 * Math.sin(t * 1.1 + it.pos[2] * 4.0));
      q.setFromEuler(e);
      s.setScalar(it.escala * resp);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!geo || !items.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} frustumCulled={false} />;
}

/**
 * La capa viva del invernadero. Montar dentro del <Canvas>.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function FloraInvernadero({ tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const conteos = useMemo(() => invernaderoDeTier(tier), [tier]);

  // Geometrías unitarias (una vez por montaje).
  const geos = useMemo(
    () => ({
      bandeja: geomBandeja(),
      brote: geomBrote(),
      tomate: geomTomatePlanta(7),
      fruto: geomTomateFruto(),
      hortaliza: geomHortaliza(9),
      bolsa: geomBolsa(11),
    }),
    [],
  );

  // Material único con vertexColors (el color viene horneado por familia; el
  // tinte por instancia lo multiplica — en brote y fruto el tinte ES el color).
  const mat = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.82, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  // El fruto con cuero de fruta (lustre) solo donde hay material rico.
  const matLustre = useMemo(() => {
    if (!perfil.materialRico) return mat;
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: perfil.flatShading,
      roughness: 0.35,
      metalness: 0,
    });
  }, [perfil.materialRico, perfil.flatShading, mat]);

  // Distribución determinista (misma siembra en cada recarga).
  const dist = useMemo(() => distribucionInvernadero(conteos, 733), [conteos]);

  // Liberar GPU al desmontar.
  useLayoutEffect(
    () => () => {
      Object.values(geos).forEach((g) => g && g.dispose());
      mat.dispose();
      if (matLustre !== mat) matLustre.dispose();
    },
    [geos, mat, matLustre],
  );

  const sombra = perfil.sombras;
  const respiran = tier === 'alto' && !reducedMotion;

  return (
    <group>
      {/* La mesa de almácigo: bandejas y sus brotes por etapas (que respiran). */}
      <Especie geo={geos.bandeja} mat={mat} items={dist.bandeja} />
      <BrotesVivos geo={geos.brote} mat={mat} items={dist.brote} respiran={respiran} />

      {/* El repique: las bolsas negras con su plántula ya firme. */}
      <Especie geo={geos.bolsa} mat={mat} items={dist.bolsa} />

      {/* El tomate tutorado y sus racimos madurando de abajo hacia arriba. */}
      <Especie geo={geos.tomate} mat={mat} items={dist.tomate} castShadow={sombra} />
      <Especie geo={geos.fruto} mat={matLustre} items={dist.fruto} />

      {/* La hortaliza de la cama derecha + la era de endurecimiento afuera. */}
      <Especie geo={geos.hortaliza} mat={mat} items={dist.hortaliza} />
    </group>
  );
}
