/*
 * FloraInvernadero — la VIDA sembrada bajo el plástico.
 *
 * Consume `invernadero.geom.js`: cada familia es UN InstancedMesh de una
 * geometría fusionada (una draw-call por familia) — mismo contrato tier-safe
 * que `FloraCafetal`. El BROTE lleva color POR INSTANCIA (las etapas de la
 * germinación en un solo InstancedMesh). TODO CULTIVO es una LÁMINA Humboldt
 * (motor `laminaMasa.js`): tomate de `tomateHumboldt.js`, pimentón y lechuga
 * de `hortalizasHumboldt.js` — masa ilustrada; en el tomate los racimos van
 * pintados en la propia lámina (la maduración de abajo hacia arriba vive en
 * el atlas, no en una familia de esferas).
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
  geomBolsa,
} from './invernadero.geom.js';
import {
  animarVaiven,
  crearAtlasLamina,
  geomLaminaCruzadaDe,
  materialLamina,
  variantesDeItemsEn,
} from './laminaMasa.js';
import { LAMINA_TOMATE } from './tomateHumboldt.js';
import { LAMINA_PIMENTON, LAMINA_LECHUGA } from './hortalizasHumboldt.js';

/* La lámina de cada especie del catálogo (`ESPECIES_INVERNADERO`). Toda
   especie del invernadero tiene su lámina Humboldt: aquí no queda ningún
   arquetipo facetado al que se le cuenten las caras. */
const LAMINAS = Object.freeze({
  tomate: LAMINA_TOMATE,
  pimenton: LAMINA_PIMENTON,
  lechuga: LAMINA_LECHUGA,
});

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

/* La MASA de un cultivo Humboldt: cada mata son quads cruzados que muestran
   una variante de la lámina naturalista pintada a CanvasTexture — follaje
   como masa ilustrada; en el tomate los racimos van PINTADOS madurando de
   abajo hacia arriba. Un InstancedMesh, un material, una textura: 10.000
   matas = 1 draw call. La variante va por instancia en `aTile` (ancho
   negativo = espejo). `escalaExtra` deja sembrar la misma lámina en camas
   secundarias sin re-pintar atlas (la mata de la cama es más joven). */
function MasaLamina({ lamina, items, vaiven, escalaExtra = 1 }) {
  const ref = useRef(null);
  const atlas = useMemo(
    () => crearAtlasLamina(lamina.layout, lamina.pintarTile, lamina.semillaAtlas),
    [lamina],
  );
  const geo = useMemo(
    () => geomLaminaCruzadaDe(lamina.ancho, lamina.alto, lamina.planos, lamina.desfase),
    [lamina],
  );
  const mat = useMemo(() => materialLamina(atlas, lamina.alto), [atlas, lamina.alto]);

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
      s.setScalar(it.escala * escalaExtra);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      col.setRGB(it.tint[0], it.tint[1], it.tint[2]);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    geo.setAttribute(
      'aTile',
      new THREE.InstancedBufferAttribute(
        variantesDeItemsEn(lamina.layout, items.length, lamina.semillaVariantes),
        4,
      ),
    );
  }, [items, geo, lamina, escalaExtra]);

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

  // NINGÚN cultivo es geometría facetada: cada especie siembra su LÁMINA
  // Humboldt instanciada. En el tomate los racimos van pintados en la propia
  // lámina, así que tampoco lleva la familia de frutos-esfera (era el último
  // rastro lowpoly de la mata).
  const lamina = LAMINAS[cultivo.especie] || LAMINA_TOMATE;

  // Geometrías unitarias (una vez por montaje).
  const geos = useMemo(
    () => ({
      bandeja: geomBandeja(),
      brote: geomBrote(),
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

  const respiran = tier === 'alto' && !reducedMotion;

  return (
    <group>
      {/* La mesa de almácigo: bandejas y sus brotes por etapas (que respiran). */}
      <Especie geo={geos.bandeja} mat={mat} items={dist.bandeja} />
      <BrotesVivos geo={geos.brote} mat={mat} items={dist.brote} respiran={respiran} />

      {/* El repique: las bolsas negras con su plántula ya firme. */}
      <Especie geo={geos.bolsa} mat={mat} items={dist.bolsa} />

      {/* El cultivo principal: la lámina Humboldt de la especie sembrada,
          en masa instanciada (tomate, pimentón o lechuga). */}
      <MasaLamina lamina={lamina} items={dist.cultivo} vaiven={respiran} />

      {/* La cama derecha + la era de endurecimiento: pimentón de lámina,
          más joven que el cultivo principal (escala reducida). */}
      <MasaLamina
        lamina={LAMINA_PIMENTON}
        items={dist.hortaliza}
        vaiven={respiran}
        escalaExtra={0.72}
      />
    </group>
  );
}
