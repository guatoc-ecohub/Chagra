/*
 * FloraQuinua — el QUINUAL de tierra fría, que es sobre todo un CAMPO DE COLOR.
 *
 * Consume `floraQuinua.geom.js`: una geometría fusionada por especie y UN
 * InstancedMesh — mismo contrato tier-safe que FloraPapa/FloraYuca. Lo propio de
 * este mundo es cómo reparte los bancos:
 *
 *   · LA MATA VA EN TRES BANCOS (tres esqueletos distintos), para que el campo
 *     no se lea como una planta fotocopiada doscientas veces.
 *   · LA PANOJA VA EN DOS BANCOS, y no por rendimiento: por FIDELIDAD. Son los
 *     dos tipos reales —glomerulada (compacta) y amarantiforme (laxa)— y cuál le
 *     toca a cada planta lo decide su variedad, no el azar.
 *   · EL COLOR ENTERO viaja por instancia. La geometría está horneada casi
 *     blanca; sin `setColorAt` este mundo sería un lote de un solo tono, que es
 *     precisamente lo contrario de lo que un quinual maduro es.
 *
 * Componente r3f: montar dentro del <Canvas> de EscenaQuinuaViva.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import {
  quinualDeTier,
  calidadQuinua,
  construirEsqueletos,
  distribucionQuinual,
  geomMataQuinua,
  geomPanojaGlomerulada,
  geomPanojaAmarantiforme,
  geomGavilla,
  geomPaja,
  geomPiedra,
} from './floraQuinua.geom.js';

/* Un banco de UNA especie: una geometría, un material, N instancias.
   (El molde de la casa — aquí no hace falta la rotación libre del yucal: todo
   lo de este mundo se para derecho y gira sobre su eje.) */
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
 * La capa viva del quinual. Montar dentro del <Canvas>.
 * @param {{tier?: 'alto'|'medio'|'bajo'}} props
 */
export default function FloraQuinua({ tier = 'alto' }) {
  const perfil = perfilDeTier(tier);
  const conteos = quinualDeTier(tier);
  const q = calidadQuinua(tier);

  const esqs = useMemo(() => construirEsqueletos(q), [q]);

  const geos = useMemo(
    () => ({
      mata: esqs.map((e) => geomMataQuinua(e, { q })),
      glom: geomPanojaGlomerulada({ q }),
      amar: geomPanojaAmarantiforme({ q }),
      gavilla: conteos.gavilla ? geomGavilla({ q }) : null,
      paja: conteos.paja ? geomPaja({ q }) : null,
      piedra: conteos.piedra ? geomPiedra() : null,
    }),
    [esqs, conteos, q],
  );

  /* La hoja y la panoja se ven por las dos caras: son láminas y racimos, no
     paredes. Un solo material para todo el mundo (una llamada menos). */
  const mat = useMemo(() => {
    const base = {
      vertexColors: true,
      flatShading: perfil.flatShading,
      side: THREE.DoubleSide,
    };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.87, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  const dist = useMemo(() => distribucionQuinual(conteos, esqs), [conteos, esqs]);

  // Liberar GPU al desmontar.
  useLayoutEffect(
    () => () => {
      geos.mata.forEach((g) => g && g.dispose());
      Object.entries(geos).forEach(([k, g]) => k !== 'mata' && g && g.dispose());
      mat.dispose();
    },
    [geos, mat],
  );

  const sombra = perfil.sombras;

  return (
    <group>
      {/* El pajonal y la piedra: la tierra alta rodeando el lote. */}
      <Especie geo={geos.paja} mat={mat} items={dist.paja} />
      <Especie geo={geos.piedra} mat={mat} items={dist.piedra} />

      {/* EL CULTIVO: los tres bancos de mata (tallo anguloso, hoja romboidal). */}
      {geos.mata.map((g, i) => (
        <Especie key={`mata${i}`} geo={g} mat={mat} items={dist.mata[i]} castShadow={sombra} />
      ))}

      {/* LAS PANOJAS — lo que este mundo vino a entregar. Dos bancos porque son
          dos tipos de verdad, no por rendimiento. */}
      <Especie geo={geos.glom} mat={mat} items={dist.panojaGlom} castShadow={sombra} />
      <Especie geo={geos.amar} mat={mat} items={dist.panojaAmar} castShadow={sombra} />

      {/* LA ERA: las gavillas cortadas con hoz, esperando la trilla. */}
      <Especie geo={geos.gavilla} mat={mat} items={dist.gavilla} castShadow={sombra} />
    </group>
  );
}
