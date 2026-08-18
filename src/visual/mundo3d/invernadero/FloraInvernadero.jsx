/*
 * FloraInvernadero — la VIDA sembrada bajo el plástico.
 *
 * Consume `invernadero.geom.js`: cada familia es UN InstancedMesh de una
 * geometría fusionada (una draw-call por familia) — mismo contrato tier-safe
 * que `FloraCafetal`. El BROTE lleva color POR INSTANCIA (las etapas de la
 * germinación en un solo InstancedMesh). El TOMATE es la LÁMINA Humboldt de
 * `tomateHumboldt.js`: masa ilustrada con los racimos pintados en la propia
 * lámina — la maduración de abajo hacia arriba vive en el atlas, no en una
 * familia de esferas.
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
  normalizarCultivo,
  distribucionInvernadero,
  geomBandeja,
  geomBrote,
  geomHortaliza,
  geomBolsa,
} from './invernadero.geom.js';
import {
  animarVaiven,
  atlasTomateHumboldt,
  geomLaminaCruzada,
  materialLaminaTomate,
  variantesDeItems,
} from './tomateHumboldt.js';

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

/* La MASA del tomate Humboldt: cada mata son 3 quads cruzados que muestran
   una variante de la lámina naturalista pintada a CanvasTexture — follaje
   como masa ilustrada, racimos PINTADOS madurando de abajo hacia arriba.
   Un InstancedMesh, un material, una textura: 10.000 matas = 1 draw call.
   La variante del atlas va por instancia en `aTile` (ancho negativo=espejo). */
function MasaTomateHumboldt({ items, vaiven }) {
  const ref = useRef(null);
  const atlas = useMemo(() => atlasTomateHumboldt(20260818), []);
  const geo = useMemo(() => geomLaminaCruzada(3), []);
  const mat = useMemo(() => materialLaminaTomate(atlas), [atlas]);

  useLayoutEffect(
    () => () => {
      atlas.dispose();
      geo.dispose();
      mat.dispose();
    },
    [atlas, geo, mat],
  );

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
    geo.setAttribute('aTile', new THREE.InstancedBufferAttribute(variantesDeItems(items.length), 4));
  }, [items, geo]);

  useFrame(({ clock }) => {
    animarVaiven(ref.current, clock.elapsedTime, vaiven);
  });

  if (!items.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} frustumCulled={false} />;
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
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, especie?: string, cantidad?: number, layout?: string|object}} props
 */
export default function FloraInvernadero({
  tier = 'alto',
  reducedMotion = false,
  especie = 'tomate',
  cantidad = 1500,
  layout = 'surcos',
}) {
  const perfil = perfilDeTier(tier);
  const cultivo = useMemo(() => normalizarCultivo({ especie, cantidad, layout }), [especie, cantidad, layout]);
  const conteos = useMemo(() => invernaderoDeTier(tier, cultivo), [tier, cultivo]);

  // El tomate ya no es geometría facetada: es la LÁMINA Humboldt instanciada.
  // Sus racimos van pintados en la propia lámina, así que tampoco lleva la
  // familia de frutos-esfera (era el último rastro lowpoly de la mata).
  const esLamina = cultivo.especieInfo.geometria === 'tomate';

  // Geometrías unitarias (una vez por montaje).
  const geos = useMemo(
    () => ({
      bandeja: geomBandeja(),
      brote: geomBrote(),
      cultivo: esLamina ? null : geomHortaliza(9),
      hortaliza: geomHortaliza(9),
      bolsa: geomBolsa(11),
    }),
    [esLamina],
  );

  // Material único con vertexColors (el color viene horneado por familia; el
  // tinte por instancia lo multiplica — en brote y fruto el tinte ES el color).
  const mat = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.82, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  // Distribución determinista (misma siembra en cada recarga).
  const dist = useMemo(() => distribucionInvernadero(conteos, 733), [conteos]);

  // Liberar GPU al desmontar.
  useLayoutEffect(
    () => () => {
      Object.values(geos).forEach((g) => g && g.dispose());
      mat.dispose();
    },
    [geos, mat],
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

      {/* El cultivo principal. Tomate = la lámina Humboldt en masa (racimos
          pintados madurando de abajo hacia arriba); otras especies siguen en
          su geometría de hortaliza mientras les llega su propia lámina. */}
      {esLamina ? (
        <MasaTomateHumboldt items={dist.cultivo} vaiven={respiran} />
      ) : (
        <Especie geo={geos.cultivo} mat={mat} items={dist.cultivo} castShadow={sombra} />
      )}

      {/* La hortaliza de la cama derecha + la era de endurecimiento afuera. */}
      <Especie geo={geos.hortaliza} mat={mat} items={dist.hortaliza} />
    </group>
  );
}
