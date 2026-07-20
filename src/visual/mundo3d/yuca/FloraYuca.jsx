/*
 * FloraYuca — el YUCAL de clima medio sembrado sobre sus montículos.
 *
 * Consume `floraYuca.geom.js`: cada especie es UN InstancedMesh de una geometría
 * fusionada (una draw-call por especie, por más matas que haya) — mismo contrato
 * tier-safe que FloraPapa/FloraCafetal, con dos diferencias que este cultivo
 * pide:
 *
 *   · LA MATA VA EN TRES BANCOS, no en uno. Tres esqueletos distintos (troncos
 *     de otra altura, horquetas de otro número y otro giro) y cada mata cae en
 *     uno. Cuestan tres draw-calls en vez de una, y a cambio el yucal no se lee
 *     como un estampado de la misma planta repetida.
 *   · EL PECÍOLO LLEVA COLOR POR INSTANCIA (verde, rojo o morado, según la
 *     variedad de la mata) y va en su propio banco, aparte de la lámina — si
 *     fueran una sola pieza, el tinte de la variedad ensuciaría el verde de la
 *     hoja. Lo mismo con la RAÍZ (cáscara por instancia) y su CORTE (la pulpa
 *     blanca, de color fijo: el contraste es justo lo que enseña).
 *
 * Componente r3f: montar dentro del <Canvas> de EscenaYucaViva.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import {
  yucalDeTier,
  calidadYuca,
  construirEsqueletos,
  distribucionYucal,
  geomMataYuca,
  geomHojaYuca,
  geomPecioloYuca,
  geomRaizYuca,
  geomCorteRaiz,
  geomToconYuca,
  geomEstacaYuca,
  geomPlatano,
  geomMaiz,
  geomMonte,
  geomPiedra,
} from './floraYuca.geom.js';

/*
 * Un banco de UNA especie: una geometría, un material, N instancias.
 *
 * Extiende el molde de la casa (`Especie` de FloraPapa) con la rotación LIBRE
 * que este mundo necesita: una hoja de yuca cuelga en cualquier dirección y una
 * raíz sale de la tierra en cualquier ángulo — con `rotY` sola no se pueden
 * poner. Cada item acepta, de más específico a más general:
 *   · `quat`      [x,y,z,w]  — la rotación ya resuelta (hojas, pecíolos, raíces)
 *   · `rot`       [x,y,z]    — ángulos de Euler (las estacas inclinadas)
 *   · `rotY`      número     — el giro sobre su eje de toda la vida
 * y `escalaXYZ` para lo que se estira en un solo eje (el pecíolo).
 */
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
      if (it.quat) q.set(it.quat[0], it.quat[1], it.quat[2], it.quat[3]);
      else if (it.rot) q.setFromEuler(e.set(it.rot[0], it.rot[1], it.rot[2]));
      else q.setFromEuler(e.set(0, it.rotY || 0, 0));
      if (it.escalaXYZ) s.set(it.escalaXYZ[0], it.escalaXYZ[1], it.escalaXYZ[2]);
      else s.setScalar(it.escala ?? 1);
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
 * La capa viva del yucal. Montar dentro del <Canvas>.
 * @param {{tier?: 'alto'|'medio'|'bajo'}} props
 */
export default function FloraYuca({ tier = 'alto' }) {
  const perfil = perfilDeTier(tier);
  const conteos = yucalDeTier(tier);
  const q = calidadYuca(tier);

  /* Los TRES esqueletos: la malla de la mata y sus hojas salen del mismo, o las
     hojas quedan flotando al lado del tallo. */
  const esqs = useMemo(() => construirEsqueletos(q), [q]);

  const geos = useMemo(
    () => ({
      mata: esqs.map((e) => geomMataYuca(e, { q })),
      hoja: geomHojaYuca({ q }),
      peciolo: geomPecioloYuca(),
      raiz: geomRaizYuca({ q }),
      corte: geomCorteRaiz(),
      tocon: geomToconYuca({ q }),
      estaca: conteos.estaca ? geomEstacaYuca({ q }) : null,
      platano: conteos.platano ? geomPlatano({ q }) : null,
      maiz: conteos.maiz ? geomMaiz({ q }) : null,
      monte: conteos.monte ? geomMonte({ q }) : null,
      piedra: conteos.piedra ? geomPiedra() : null,
    }),
    [esqs, conteos, q],
  );

  // Material único con vertexColors (el color viene horneado por especie y el
  // tinte por instancia lo multiplica — en pecíolo y raíz el tinte ES el color).
  const mat = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.9, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  // La lámina de la hoja se ve por las dos caras: es una hoja, no una pared.
  const matHoja = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading, side: THREE.DoubleSide };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.86, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  // Distribución determinista (una vez por tier).
  const dist = useMemo(() => distribucionYucal(conteos, esqs), [conteos, esqs]);

  // Liberar GPU al desmontar.
  useLayoutEffect(
    () => () => {
      geos.mata.forEach((g) => g && g.dispose());
      Object.entries(geos).forEach(([k, g]) => k !== 'mata' && g && g.dispose());
      mat.dispose();
      matHoja.dispose();
    },
    [geos, mat, matHoja],
  );

  const sombra = perfil.sombras; // solo lo que abulta proyecta sombra en 'alto'

  return (
    <group>
      {/* El monte y la piedra del borde: el lote no flota en el vacío. */}
      <Especie geo={geos.monte} mat={mat} items={dist.monte} />
      <Especie geo={geos.piedra} mat={mat} items={dist.piedra} />

      {/* EL CULTIVO: los tres bancos de mata (troncos anillados de cicatrices). */}
      {geos.mata.map((g, i) => (
        <Especie key={`mata${i}`} geo={g} mat={mat} items={dist.mata[i]} castShadow={sombra} />
      ))}

      {/* El follaje, solo arriba: el pecíolo con el color de su variedad y la
          lámina palmeada en su propio banco. */}
      <Especie geo={geos.peciolo} mat={mat} items={dist.peciolo} />
      <Especie geo={geos.hoja} mat={matHoja} items={dist.hoja} castShadow={sombra} />

      {/* LA ASOCIACIÓN: plátano en los bordes, maíz intercalado. */}
      <Especie geo={geos.platano} mat={matHoja} items={dist.platano} castShadow={sombra} />
      <Especie geo={geos.maiz} mat={matHoja} items={dist.maiz} />

      {/* EL SEMILLERO: las estacas sembradas inclinadas. */}
      <Especie geo={geos.estaca} mat={mat} items={dist.estaca} />

      {/* EL ARRANQUE: el tocón por donde se palanqueó, el racimo de raíces que
          la tierra soltó, y la pulpa blanca de la que se partió. */}
      <Especie geo={geos.tocon} mat={mat} items={dist.tocon} castShadow={sombra} />
      <Especie geo={geos.raiz} mat={mat} items={dist.raiz} castShadow={sombra} />
      <Especie geo={geos.corte} mat={mat} items={dist.corte} />
    </group>
  );
}
