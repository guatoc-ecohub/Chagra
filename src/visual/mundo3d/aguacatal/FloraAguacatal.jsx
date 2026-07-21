/*
 * FloraAguacatal — la FINCA AGUACATERA sembrada en su ladera.
 *
 * Consume `floraAguacatal.geom.js`: cada especie es UN InstancedMesh de una
 * geometría fusionada (una draw-call por especie, por más árboles que haya) —
 * mismo contrato tier-safe que FloraCafetal. Los FRUTOS llevan color POR
 * INSTANCIA: un solo InstancedMesh cuenta el Hass verde → morado → morado-negro
 * y otro el criollo liso en sus verdes.
 *
 * Lo VIVO de esta capa (lo que hace árbol al árbol):
 *   · El PLATEO del envés — la hoja del aguacate es oscura por el haz y pálida
 *     por debajo; cuando una ráfaga la voltea, la copa "platea". Un puñado de
 *     quads pálidos por árbol que suben y bajan de opacidad EN RÁFAGAS
 *     desfasadas: el viento recorre la finca, no parpadea parejo. Gratis y es
 *     lo que vuelve vivo el verde oscuro.
 *   · La LUZ COLADA bajo las copas (solo 'alto'): dapples dorados respirando
 *     sobre la hojarasca — el microclima de la sombra, visible.
 *   · Las ABEJAS de la floración (solo 'alto'): puntitos ámbar orbitando las
 *     panículas de los árboles florecidos. El aguacate florece por miles y ahí
 *     zumba la polinización — la imagen que nadie dibuja.
 *
 * `reducedMotion` deja todo QUIETO (presencia sin parpadeo).
 * Componente r3f: montar dentro del <Canvas> de EscenaAguacatalVivo.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import {
  aguacatalDeTier,
  calidadAguacatal,
  distribucionAguacatal,
  centrosCopa,
  alturaFinca,
  RADIO_COPA,
  geomAguacate,
  geomAguacateJoven,
  geomFrutoHass,
  geomFrutoCriollo,
  geomPanicula,
  geomMaiz,
  geomHojarasca,
  geomPiedra,
  geomPlateo,
  ALZA_CRIOLLO,
} from './floraAguacatal.geom.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* Un banco de matas de UNA especie: una geometría, un material, N instancias.
   (El molde de la casa — mismo patrón que FloraCafetal/FloraParamo.) */
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
 * El PLATEO del envés: un mesh de quads pálidos por árbol cuya opacidad sube
 * en RÁFAGAS desfasadas — el viento voltea las hojas y la copa platea. Un
 * material propio por árbol (13–15 draw-calls chiquitas, mismo costo-clase que
 * la luz colada). Con reducedMotion queda un asomo fijo, sin parpadeo.
 */
function PlateoEnves({ centros, reducedMotion }) {
  const grupo = useRef(null);

  const arboles = useMemo(() => {
    const r = rng(53);
    const geoHass = geomPlateo(9, 1);
    const geoCriollo = geomPlateo(9, ALZA_CRIOLLO);
    return {
      geoHass,
      geoCriollo,
      items: centros.map((c) => ({
        pos: c.pos,
        esc: c.esc,
        alza: c.alza,
        rotY: r() * Math.PI * 2,
        fase: r() * Math.PI * 2,
        vel: 0.38 + r() * 0.2, // cada árbol con su ritmo de ráfaga
      })),
    };
  }, [centros]);

  useLayoutEffect(
    () => () => {
      arboles.geoHass.dispose();
      arboles.geoCriollo.dispose();
    },
    [arboles],
  );

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (reducedMotion || !g) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const d = arboles.items[i];
      // la ráfaga: casi siempre abajo, y cada tanto un pico que platea
      const gusto = Math.sin(t * d.vel + d.fase) + Math.sin(t * d.vel * 2.7 + d.fase * 1.7) * 0.35;
      g.children[i].material.opacity = Math.max(0, gusto - 0.82) * 0.85;
    }
  });

  return (
    <group ref={grupo}>
      {arboles.items.map((d, i) => (
        <mesh
          key={i}
          geometry={d.alza > 1 ? arboles.geoCriollo : arboles.geoHass}
          position={d.pos}
          rotation={[0, d.rotY, 0]}
          scale={d.esc}
        >
          <meshBasicMaterial
            color="#cdd9ab"
            transparent
            opacity={reducedMotion ? 0.14 : 0}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/*
 * La LUZ COLADA bajo las copas: discos dorados aditivos que respiran sobre la
 * hojarasca — el sol moviéndose entre las hojas del árbol grande. Solo 'alto';
 * con reducedMotion quedan quietos.
 */
function LuzColada({ centros, reducedMotion }) {
  const grupo = useRef(null);
  const manchas = useMemo(() => {
    const r = rng(97);
    const lista = [];
    centros.forEach((c) => {
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const x = c.pos[0] + (r() - 0.5) * RADIO_COPA * c.esc * 1.5;
        const z = c.pos[2] + (r() - 0.5) * RADIO_COPA * c.esc * 1.5;
        lista.push({
          pos: /** @type {[number, number, number]} */ ([x, alturaFinca(x, z) + 0.05, z]),
          r: 0.4 + r() * 0.6,
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

/*
 * Las ABEJAS de la floración: puntitos ámbar orbitando la copa alta de los
 * árboles FLORECIDOS (donde la distribución asoma las panículas). Pocas, en
 * enjambre flojo — se leen como zumbido, no como mosquero. Solo 'alto'; con
 * reducedMotion quedan posadas quietas.
 */
function AbejasFloracion({ centros, reducedMotion }) {
  const grupo = useRef(null);
  const bees = useMemo(() => {
    const r = rng(61);
    const lista = [];
    centros.slice(0, 3).forEach((c) => {
      const n = 5;
      for (let i = 0; i < n; i++) {
        lista.push({
          centro: [
            c.pos[0],
            c.pos[1] + (3.1 + r() * 0.9) * c.esc * c.alza,
            c.pos[2],
          ],
          rad: (0.9 + r() * 0.9) * c.esc,
          vel: 1.6 + r() * 1.3,
          fase: r() * Math.PI * 2,
          vy: 0.1 + r() * 0.16,
        });
      }
    });
    return lista;
  }, [centros]);

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g || reducedMotion) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const b = bees[i];
      const m = g.children[i];
      m.position.set(
        b.centro[0] + Math.cos(t * b.vel + b.fase) * b.rad,
        b.centro[1] + Math.sin(t * b.vel * 2.3 + b.fase) * b.vy,
        b.centro[2] + Math.sin(t * b.vel + b.fase) * b.rad * 0.8,
      );
    }
  });

  if (!bees.length) return null;
  return (
    <group ref={grupo}>
      {bees.map((b, i) => (
        <mesh
          key={i}
          position={[b.centro[0] + Math.cos(b.fase) * b.rad, b.centro[1], b.centro[2] + Math.sin(b.fase) * b.rad * 0.8]}
        >
          <icosahedronGeometry args={[0.05, 0]} />
          <meshBasicMaterial color="#d9a13b" />
        </mesh>
      ))}
    </group>
  );
}

/**
 * La capa viva del aguacatal. Montar dentro del <Canvas>.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function FloraAguacatal({ tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const conteos = aguacatalDeTier(tier);
  const q = calidadAguacatal(tier);

  // Geometrías fusionadas (una vez por tier).
  const geos = useMemo(
    () => ({
      hass: geomAguacate({ q }, 21),
      criollo: geomAguacate({ q, criollo: true }, 31),
      joven: conteos.joven ? geomAguacateJoven({ q }, 41) : null,
      frutoHass: geomFrutoHass(),
      frutoCriollo: geomFrutoCriollo(),
      panicula: conteos.panicula ? geomPanicula(27) : null,
      maiz: conteos.maiz ? geomMaiz({ q }, 24) : null,
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

  // El material con CUERO DE FRUTA (roughness bajo): el brillo de la cáscara.
  // Solo en gama con material rico; en la frugal se reusa el material único.
  const matLustre = useMemo(() => {
    if (!perfil.materialRico) return mat;
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: perfil.flatShading,
      roughness: 0.42,
      metalness: 0,
    });
  }, [perfil.materialRico, perfil.flatShading, mat]);

  // Distribución determinista (una vez por tier).
  const dist = useMemo(() => distribucionAguacatal(conteos, 411, q), [conteos, q]);
  const centros = useMemo(() => centrosCopa(conteos), [conteos]);
  const florecidos = useMemo(() => centros.filter((c) => c.florecido), [centros]);

  // Liberar GPU al desmontar.
  useLayoutEffect(
    () => () => {
      Object.values(geos).forEach((g) => g && g.dispose());
      mat.dispose();
      if (matLustre !== mat) matLustre.dispose();
    },
    [geos, mat, matLustre],
  );

  const sombra = perfil.sombras; // solo los árboles grandes proyectan, en 'alto'

  return (
    <group>
      {/* El suelo del microclima: hojarasca gruesa bajo las copas, piedras. */}
      <Especie geo={geos.hojarasca} mat={mat} items={dist.hojarasca} />
      <Especie geo={geos.piedra} mat={mat} items={dist.piedra} />

      {/* LOS ÁRBOLES GRANDES: el lote de Hass en sus camellones y los criollos
          de patio — la copa densa que le pasa por encima a la casa. */}
      <Especie geo={geos.hass} mat={mat} items={dist.itemsHass} castShadow={sombra} />
      <Especie geo={geos.criollo} mat={mat} items={dist.itemsCriollo} castShadow={sombra} />

      {/* Los frutos: Hass rugoso (verde→morado→negro por instancia) colgando
          del pedúnculo, y el criollo liso y verde — el contraste que enseña. */}
      <Especie geo={geos.frutoHass} mat={matLustre} items={dist.frutoHass} />
      <Especie geo={geos.frutoCriollo} mat={matLustre} items={dist.frutoCriollo} />

      {/* La floración en panícula, amarillo-verdosa, al borde alto de la copa. */}
      <Especie geo={geos.panicula} mat={matLustre} items={dist.panicula} />

      {/* El lote nuevo: los jóvenes con su tutor, junto a la zanjilla. */}
      <Especie geo={geos.joven} mat={mat} items={dist.joven} />

      {/* El maíz asociado de la casa. */}
      <Especie geo={geos.maiz} mat={mat} items={dist.maiz} />

      {/* El envés que platea con la ráfaga — el árbol vivo. */}
      <PlateoEnves centros={centros} reducedMotion={reducedMotion} />

      {/* La luz que se cuela y las abejas de la floración (solo gama alta). */}
      {tier === 'alto' && <LuzColada centros={centros} reducedMotion={reducedMotion} />}
      {tier === 'alto' && <AbejasFloracion centros={florecidos} reducedMotion={reducedMotion} />}
    </group>
  );
}
