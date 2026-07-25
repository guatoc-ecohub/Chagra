/*
 * FloraFrutales — la finca frutalera sembrada: el mango abajo, el cítrico arriba.
 *
 * Consume `floraFrutales.geom.js`: cada especie es UN InstancedMesh de una
 * geometría fusionada (una draw-call por especie) — mismo contrato tier-safe
 * que FloraCafetal. Los FRUTOS llevan color POR INSTANCIA (mango verde→amarillo;
 * cítrico naranja/mandarina/limón) y el fruto cítrico además ESCALA VECTORIAL
 * por instancia: la proporción distingue la naranja de la mandarina achatada y
 * del limón ovoide.
 *
 * En 'alto' se suma la LUZ COLADA bajo el domo del mango: los dapples dorados
 * que respiran en la sombra grande — la sombra del palo de mango es EL lugar
 * de la tierra caliente, y merece su luz. `reducedMotion` los deja quietos.
 *
 * Componente r3f: montar dentro del <Canvas> de EscenaFrutalesVivo.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import {
  frutalesDeTier,
  calidadFrutales,
  distribucionFrutales,
  centrosMango,
  alturaFinca,
  geomMango,
  geomMangoFruto,
  geomCitrico,
  geomCitricoFruto,
  geomAzahar,
  geomHojarasca,
  geomPiedra,
} from './floraFrutales.geom.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* Un banco de matas de UNA especie: una geometría, un material, N instancias.
   Igual que el `Especie` del cafetal, con UNA extensión: `escala` puede ser
   número (uniforme) o VECTOR [x,y,z] — así el mismo InstancedMesh de fruto
   cítrico lleva naranjas esféricas, mandarinas achatadas y limones ovoides. */
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
      if (Array.isArray(it.escala)) s.set(it.escala[0], it.escala[1], it.escala[2]);
      else s.setScalar(it.escala);
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
 * La LUZ COLADA bajo el domo del mango: discos dorados aditivos que respiran
 * apenas en la sombra grande del palo. Solo 'alto'; con reducedMotion quedan
 * quietos (presencia sin parpadeo).
 */
function LuzColada({ centros, reducedMotion }) {
  const grupo = useRef(null);
  const manchas = useMemo(() => {
    const r = rng(131);
    const lista = [];
    centros.forEach((cm) => {
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const x = cm.centro[0] + (r() - 0.5) * cm.radio * 1.7;
        const z = cm.centro[2] + (r() - 0.5) * cm.radio * 1.7;
        lista.push({
          pos: /** @type {[number, number, number]} */ ([x, alturaFinca(x, z) + 0.05, z]),
          r: 0.5 + r() * 0.8,
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
 * La capa viva de la finca frutalera. Montar dentro del <Canvas>.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function FloraFrutales({ tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const conteos = frutalesDeTier(tier);
  const q = calidadFrutales(tier);

  // Geometrías fusionadas (una vez por tier).
  const geos = useMemo(
    () => ({
      mango: geomMango({ q }, 21),
      mangoFruto: geomMangoFruto(),
      citrico: geomCitrico({ q }, 22),
      citricoFruto: geomCitricoFruto(),
      azahar: conteos.azahar ? geomAzahar(27) : null,
      hojarasca: conteos.hojarasca ? geomHojarasca(25) : null,
      piedra: conteos.piedra ? geomPiedra(26) : null,
    }),
    [conteos, q],
  );

  // Material único con vertexColors (el color viene horneado por especie y el
  // tinte por instancia lo multiplica — en los frutos el tinte ES el color).
  const mat = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.85, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  // El material LUSTROSO: la hoja del cítrico brilla (la firma del género) y
  // la fruta tiene cuero de fruta (roughness bajo). Solo en gama con material
  // rico; en la frugal se reusa el material único (cero costo extra).
  const matLustre = useMemo(() => {
    if (!perfil.materialRico) return mat;
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: perfil.flatShading,
      roughness: 0.38,
      metalness: 0,
    });
  }, [perfil.materialRico, perfil.flatShading, mat]);

  // Distribución determinista (una vez por tier).
  const dist = useMemo(() => distribucionFrutales(conteos, 421, q), [conteos, q]);
  const centros = useMemo(() => centrosMango(conteos), [conteos]);

  // Liberar GPU al desmontar.
  useLayoutEffect(
    () => () => {
      Object.values(geos).forEach((g) => g && g.dispose());
      mat.dispose();
      if (matLustre !== mat) matLustre.dispose();
    },
    [geos, mat, matLustre],
  );

  const sombra = perfil.sombras; // solo los árboles proyectan sombra en 'alto'

  return (
    <group>
      {/* El suelo de la vega: hojarasca bajo los mangos, piedras sueltas. */}
      <Especie geo={geos.hojarasca} mat={mat} items={dist.hojarasca} />
      <Especie geo={geos.piedra} mat={mat} items={dist.piedra} />

      {/* EL GIGANTE: los palos de mango de la vega caliente, con su fruto
          amarillo colgando del pedúnculo largo (verde→amarillo por instancia). */}
      <Especie geo={geos.mango} mat={mat} items={dist.mango} castShadow={sombra} />
      <Especie geo={geos.mangoFruto} mat={matLustre} items={dist.mangoFruto} />

      {/* EL CHICO: el huerto de cítricos ladera arriba — hoja lustrosa, fruta
          pegada al ramaje (naranja/mandarina/limón por color Y proporción) y
          el azahar blanco oloroso. */}
      <Especie geo={geos.citrico} mat={matLustre} items={dist.citrico} castShadow={sombra} />
      <Especie geo={geos.citricoFruto} mat={matLustre} items={dist.citricoFruto} />
      <Especie geo={geos.azahar} mat={matLustre} items={dist.azahar} />

      {/* La luz que se cuela bajo el domo del mango (solo gama alta). */}
      {tier === 'alto' && <LuzColada centros={centros} reducedMotion={reducedMotion} />}
    </group>
  );
}
