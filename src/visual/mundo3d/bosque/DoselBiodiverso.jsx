/*
 * DoselBiodiverso — la CAPA de dosel multiespecie del bosque andino colombiano.
 *
 * Monta el bosque VARIADO alrededor del claro del Ent: emergentes al fondo
 * (guadua, nogal cafetero, cedro), el color del dosel florecido (cámbulo rojo,
 * gualanday morado, siete cueros magenta), el sotobosque de niebla (helecho
 * arbóreo, heliconia) y las epífitas (quiche) al pie de todo. Con esto el claro
 * deja de ser "un árbol solo" y se lee como un BOSQUE de tres estratos.
 *
 * Tier-safe (idéntico a FloraParamo): cada especie es UN InstancedMesh de una
 * geometría fusionada con color horneado → una draw-call por especie. La flora
 * es PAISAJE: monta QUIETA (el foco animado es el Ent y la fauna). Todo
 * procedural: cero CDN/imágenes.
 *
 * Componente r3f: montar dentro del <Canvas> de EscenaBosqueVivo.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import {
  doselDeTier,
  calidadDosel,
  distribucionDosel,
  geomGuadua,
  geomNogal,
  geomCedro,
  geomCambulo,
  geomGualanday,
  geomSieteCueros,
  geomHelecho,
  geomHeliconia,
  geomQuiche,
} from './doselBiodiverso.geom.js';

/* Un banco de matas de UNA especie: una geometría, un material, N instancias.
   (Mismo patrón que FloraParamo/Especie — tint por instancia, pose sobre el
   relieve, sin animación.) */
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

/**
 * La capa de dosel biodiverso del bosque. Montar dentro del <Canvas>.
 * `alturaDe(x,z)` POSA cada mata sobre el relieve del terreno.
 * @param {{tier?: 'alto'|'medio'|'bajo', alturaDe?: ((x:number,z:number)=>number)|null}} props
 */
export default function DoselBiodiverso({ tier = 'alto', alturaDe = null }) {
  const perfil = perfilDeTier(tier);
  const conteos = doselDeTier(tier);
  const q = calidadDosel(tier);

  // Geometrías fusionadas (una vez por tier). Solo lo que tenga matas.
  const geos = useMemo(() => {
    const g = {};
    if (conteos.guadua) g.guadua = geomGuadua({ q }, 2);
    if (conteos.nogal) g.nogal = geomNogal({ q }, 3);
    if (conteos.cedro) g.cedro = geomCedro({ q }, 4);
    if (conteos.cambulo) g.cambulo = geomCambulo({ q }, 5);
    if (conteos.gualanday) g.gualanday = geomGualanday({ q }, 6);
    if (conteos.sieteCueros) g.sieteCueros = geomSieteCueros({ q }, 7);
    if (conteos.helecho) g.helecho = geomHelecho({ q }, 8);
    if (conteos.heliconia) g.heliconia = geomHeliconia({ q }, 9);
    if (conteos.quiche) g.quiche = geomQuiche({ q }, 10);
    return g;
  }, [conteos, q]);

  // Material único con vertexColors (cada geometría trae su color horneado).
  const mat = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.9, metalness: 0.0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  // Distribución por estratos, posada en el relieve.
  const dist = useMemo(() => {
    const d = distribucionDosel(conteos, 909);
    if (!alturaDe) return d;
    const posar = (items) => items.map((it) => ({
      ...it,
      pos: [it.pos[0], alturaDe(it.pos[0], it.pos[2]) + (it.pos[1] || 0), it.pos[2]],
    }));
    return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, posar(v)]));
  }, [conteos, alturaDe]);

  useLayoutEffect(() => () => {
    Object.values(geos).forEach((gg) => gg && gg.dispose());
    mat.dispose();
  }, [geos, mat]);

  const sombra = perfil.sombras;

  return (
    <group>
      {/* Epífitas y sotobosque primero (cerca del claro). */}
      <Especie geo={geos.quiche} mat={mat} items={dist.quiche} />
      <Especie geo={geos.heliconia} mat={mat} items={dist.heliconia} />
      <Especie geo={geos.helecho} mat={mat} items={dist.helecho} />

      {/* Dosel florecido (el color, anillo medio). */}
      <Especie geo={geos.sieteCueros} mat={mat} items={dist.sieteCueros} castShadow={sombra} />
      <Especie geo={geos.cambulo} mat={mat} items={dist.cambulo} castShadow={sombra} />
      <Especie geo={geos.gualanday} mat={mat} items={dist.gualanday} castShadow={sombra} />

      {/* Emergentes (la pared verde del fondo). */}
      <Especie geo={geos.cedro} mat={mat} items={dist.cedro} castShadow={sombra} />
      <Especie geo={geos.nogal} mat={mat} items={dist.nogal} castShadow={sombra} />
      <Especie geo={geos.guadua} mat={mat} items={dist.guadua} castShadow={sombra} />
    </group>
  );
}
