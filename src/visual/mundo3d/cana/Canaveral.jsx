/*
 * Canaveral — el LOTE DE CAÑA sembrado en surcos, con el viento encima.
 *
 * Consume `floraCana.geom.js`: cada pieza es UN InstancedMesh de una geometría
 * fusionada (una draw-call por pieza, por más cepas que haya) — mismo contrato
 * tier-safe que `FloraCafetal`. El TALLO lleva el color de la VARIEDAD por
 * instancia (verde, amarilla, morada, rayada), mientras la hoja va siempre verde
 * y la chala siempre paja: por eso van en mallas separadas.
 *
 * EL VIENTO es la razón de existir de este archivo. Un cañaveral quieto está
 * muerto: lo que uno recuerda de una cañada es la ONDA que la cruza cuando entra
 * la brisa — las cañas altas se inclinan, se recuperan, y la ola sigue de largo.
 * Aquí eso se hace recomponiendo las matrices de instancia por cuadro con un
 * balanceo cuya FASE depende de la posición (x·0,32 + z·0,19): la ráfaga viaja
 * por el lote en diagonal en vez de mecerse todo a la vez. Tallo, hoja, chala y
 * penacho de una misma cepa comparten fase, así que la mata se mueve ENTERA.
 *
 * Como la mata pivota en su PIE, un giro chiquito (0,03 rad) mueve la punta a
 * 4 m casi 15 cm: alcanza y sobra, y cuesta una composición de matriz.
 *
 * `reducedMotion` y la gama 'bajo' dejan el lote QUIETO (presencia sin vaivén):
 * las matrices se escriben una sola vez y no se vuelve a tocar el frameloop.
 *
 * Componente r3f: montar dentro del <Canvas> de EscenaCanaTrapiche.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import {
  canaDeTier,
  calidadCana,
  mallasDeTier,
  sembrarCanaveral,
  geomMataCana,
  geomPenachoCana,
  geomHojarascaCana,
  geomPiedraCana,
  geomMatojoCana,
} from './floraCana.geom.js';

/* La brisa del cañaveral. `amplitud` en radianes de inclinación del pie. */
const VIENTO = {
  amplitud: 0.034, // ~15 cm de vaivén en la punta de una caña de 4,3 m
  velocidad: 0.62, // qué tan seguido pasa la ráfaga
  racha: 0.45, // la segunda armónica: el viento no es un metrónomo
  rachaVel: 0.23,
};

/*
 * Un banco de instancias de UNA pieza. Si `viento` viene, las matrices se
 * recomponen por cuadro con el balanceo; si no, se escriben una vez y listo.
 *
 * (Mismo molde `Especie` de FloraCafetal/FloraParamo, con el vaivén encima.)
 */
function Pieza({ geo, mat, items, viento = null, castShadow = false }) {
  const ref = useRef(null);

  // Objetos reusados: nada de `new` dentro del bucle de cuadro.
  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      p: new THREE.Vector3(),
      s: new THREE.Vector3(),
      brazo: new THREE.Vector3(),
      col: new THREE.Color(),
    }),
    [],
  );

  /* La colocación base (y el color de variedad, que nunca cambia). */
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !items.length) return;
    const { m, q, e, p, s, col } = tmp;
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
  }, [items, tmp]);

  /* LA ONDA. La fase por instancia hace que la ráfaga CRUCE el lote. */
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!viento || !mesh || !items.length) return;
    const t = clock.elapsedTime;
    const { m, q, e, p, s, brazo } = tmp;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const f = it.fase;
      // Dos senos de periodo distinto: la brisa respira, no marca el compás.
      const golpe =
        Math.sin(t * VIENTO.velocidad - f) +
        VIENTO.racha * Math.sin(t * VIENTO.rachaVel - f * 0.55 + 1.3);
      const inc = viento * golpe;
      // Se inclina en X y algo en Z: la caña no se mece en un solo plano.
      e.set(inc, it.rotY, inc * 0.45);
      q.setFromEuler(e);
      if (it.brazo) {
        /* Pieza colgada de la punta de una caña (el penacho): pivota en el PIE
           DE LA CEPA, no en sí misma. Se gira el brazo pie→punta con el mismo
           balanceo y se recoloca — así el güin viaja pegado a su tallo. */
        e.set(inc, 0, inc * 0.45);
        brazo.set(it.brazo[0], it.brazo[1], it.brazo[2]).applyEuler(e);
        p.set(
          it.ancla[0] + brazo.x,
          it.ancla[1] + brazo.y,
          it.ancla[2] + brazo.z,
        );
      } else {
        p.set(it.pos[0], it.pos[1], it.pos[2]);
      }
      s.setScalar(it.escala);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

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
 * El cañaveral vivo: surcos de caña, su suelo y el viento que lo cruza.
 * Montar dentro del <Canvas>.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function Canaveral({ tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const conteos = canaDeTier(tier);
  const q = calidadCana(tier);
  const mallas = useMemo(
    () => /** @type {{v:number, detalle:'cerca'|'lejos'}[]} */ (mallasDeTier(tier)),
    [tier],
  );

  /* Las matas: una geometría por (variante × calidad), una vez por tier. La
     variante evita que el lote se lea como plantilla; la calidad es lo que hace
     que quepan más del doble de cepas — las del pasillo con todo el detalle,
     las del fondo con un tubo de 16 anillos que a esa distancia nadie discute. */
  const variantes = useMemo(
    () => mallas.map((m) => geomMataCana(m.v, { q, detalle: m.detalle }, 101)),
    [mallas, q],
  );

  const geoPenacho = useMemo(() => geomPenachoCana(q, 41), [q]);
  const geoSuelo = useMemo(
    () => ({
      hojarasca: geomHojarascaCana(61),
      piedra: geomPiedraCana(62),
      matojo: conteos.matojo ? geomMatojoCana(63) : null,
    }),
    [conteos.matojo],
  );

  /* La siembra determinista: los surcos, los claros del corte, las variedades
     y las puntas donde se montan los penachos. */
  const dist = useMemo(
    () => sembrarCanaveral(conteos, mallas, variantes.map((v) => v.topes), 907),
    [conteos, mallas, variantes],
  );

  /* Material único con vertexColors (el color va horneado por pieza y el tinte
     por instancia lo multiplica — en el tallo el tinte ES la variedad). */
  const mat = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.82, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  /* LA HOJA es una CINTA: si se dibuja a una cara, media hoja desaparece según
     de qué lado la mire uno. Va a dos caras siempre, y algo más lustrosa (la
     hoja de caña brilla al sol). */
  const matHoja = useMemo(() => {
    const base = {
      vertexColors: true,
      flatShading: perfil.flatShading,
      side: THREE.DoubleSide,
    };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.55, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  /* La chala seca no brilla: es paja. Misma cinta a dos caras, mate. */
  const matSeco = useMemo(() => {
    const base = {
      vertexColors: true,
      flatShading: perfil.flatShading,
      side: THREE.DoubleSide,
    };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.95, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  /* Liberar GPU al desmontar. */
  useLayoutEffect(
    () => () => {
      variantes.forEach((v) => {
        v.tallos.dispose();
        v.hojas.dispose();
        v.chala.dispose();
      });
      geoPenacho.dispose();
      Object.values(geoSuelo).forEach((g) => g && g.dispose());
      mat.dispose();
      matHoja.dispose();
      matSeco.dispose();
    },
    [variantes, geoPenacho, geoSuelo, mat, matHoja, matSeco],
  );

  /* El viento solo en gama que lo aguanta y con movimiento permitido. En 'bajo'
     el lote monta quieto: se ve el cañaveral igual, no se recompone nada. */
  const viento = reducedMotion || tier === 'bajo' ? null : VIENTO.amplitud;
  const sombra = perfil.sombras;

  return (
    <group>
      {/* El suelo de la calle del surco: hoja caída, matojos, terrones. */}
      <Pieza geo={geoSuelo.hojarasca} mat={matSeco} items={dist.hojarasca} />
      <Pieza geo={geoSuelo.matojo} mat={matHoja} items={dist.matojo} />
      <Pieza geo={geoSuelo.piedra} mat={mat} items={dist.piedra} />

      {/* EL LOTE. Por variante: primero la chala (queda detrás, pegada al
          tallo), luego el tallo, y encima la hoja verde del cogollo. */}
      {variantes.map((v, i) => (
        <group key={i}>
          <Pieza geo={v.chala} mat={matSeco} items={dist.chala[i]} viento={viento} />
          <Pieza
            geo={v.tallos}
            mat={mat}
            items={dist.matas[i]}
            viento={viento}
            castShadow={sombra}
          />
          <Pieza
            geo={v.hojas}
            mat={matHoja}
            items={dist.hojas[i]}
            viento={viento}
            castShadow={sombra}
          />
        </group>
      ))}

      {/* LOS PENACHOS: lo que espigó. Van sobre puntas reales de tallo y se
          mecen con más amplitud — son lo más liviano y lo más alto del lote. */}
      <Pieza
        geo={geoPenacho}
        mat={matHoja}
        items={dist.penacho}
        viento={viento ? viento * 1.45 : null}
      />
    </group>
  );
}
