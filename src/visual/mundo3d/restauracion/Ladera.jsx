/*
 * Ladera — la ladera que se hace monte. La capa r3f de la sucesión.
 *
 * Monta el suelo y TODAS las especies, cada una en UN InstancedMesh (una
 * draw-call por especie, sean 3 matas o 90), y las mueve con una sola variable:
 * el AÑO. No hay estados ni etapas ni componentes que se monten y desmonten —
 * `anioRef.current` cambia y todo lo vivo responde. Por eso el campesino puede
 * arrastrar el dedo por la línea de tiempo y ver su ladera crecer en continuo, sin
 * un solo salto.
 *
 * Lo que hace cada frame: por cada instancia, calcular su `vigor` en este año y
 * componer su matriz con `escala * vigor`. Como toda geometría está modelada con
 * la base en el origen, escalar desde 0 es LITERALMENTE brotar del suelo. Si el
 * año no se movió, no se toca nada (el paisaje quieto no cuesta CPU).
 *
 * El suelo son dos mallas que COMPARTEN una sola geometría (se sube a la GPU una
 * vez): abajo la tierra pelada del potrero, con su ocre lavado y sus cicatrices
 * horneados por vértice; encima el MANTO vivo, que se va poniendo opaco a medida
 * que la cobertura tapa el suelo, y que además se va de verde pasto a mantillo
 * oscuro a medida que entra el dosel. Ese cambio de color es "el suelo ganando
 * color y hojarasca" — no es un truco de iluminación, es el suelo.
 *
 * Importa three/@react-three → montar SOLO perezosa desde el host.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import {
  geomAliso,
  geomYarumo,
  geomEncenillo,
  geomGaque,
  geomRoble,
  geomMortino,
  geomRomerillo,
  geomRoca,
  geomMusgo,
} from '../bosque/floraParamo.geom.js';
import {
  geomTerreno,
  geomCarcava,
  geomBarreraViva,
  geomRaices,
  geomPastoPobre,
  geomHelecho,
  geomPlantula,
  geomHojarasca,
  geomEpifita,
  geomQuenuaJoven,
} from './sucesion.geom.js';
import { sucDeTier, calidadSuc, poblarLadera, colgarEpifitas } from './etapasSucesion.js';
import { vigor, cobertura, dosel } from './tiempoSucesion.js';

/* El verde raso del pasto nuevo → el mantillo oscuro del bosque hecho. */
const MANTO_JOVEN = '#5d7a45';
const MANTO_MADURO = '#3d4a33';

/* -------------------------------------------------------------------------- */
/*  Una especie: N matas, UNA draw-call, movidas por el año                    */
/* -------------------------------------------------------------------------- */

/*
 * El corazón de la pieza. Cada instancia trae su año de nacimiento y su curva; en
 * cada frame se le pregunta al año cuánto de ella está puesto (`vigor`) y se
 * compone su matriz. Vigor 0 → escala 0 → todavía no existe (o ya la tapó el
 * monte): no se ve, no cuesta píxeles, y no hay que montar ni desmontar nada.
 */
function EspecieViva({ geo, mat, items, anioRef, castShadow = false }) {
  const ref = useRef(null);
  const ultimoAnio = useRef(Number.NaN);

  // El tinte de cada mata es fijo: se escribe una vez y no se toca más.
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !items.length) return;
    const col = new THREE.Color();
    for (let i = 0; i < items.length; i++) {
      col.setRGB(items[i].tint[0], items[i].tint[1], items[i].tint[2]);
      mesh.setColorAt(i, col);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    ultimoAnio.current = Number.NaN; // fuerza recomponer las matrices
  }, [items]);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh || !items.length) return;
    const anio = anioRef.current;
    // Si el tiempo no se movió, el paisaje tampoco: cero trabajo.
    if (Math.abs(anio - ultimoAnio.current) < 0.004) return;
    ultimoAnio.current = anio;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const v = vigor(anio, it);
      // Las epífitas van montadas en un árbol: suben a medida que él crece.
      const y = it.huesped ? it.pos[1] + it.alto * vigor(anio, it.huesped) : it.pos[1];
      p.set(it.pos[0], y, it.pos[2]);
      e.set(0, it.rotY, 0);
      q.setFromEuler(e);
      s.setScalar(it.escala * v);
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
      receiveShadow={castShadow}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  El manto: el suelo que se va tapando (y cambiando de color)                */
/* -------------------------------------------------------------------------- */

/*
 * La capa viva sobre la tierra pelada. Dos cosas a la vez, las dos leídas del año:
 *   · la OPACIDAD la manda la cobertura → el suelo se tapa (años 1-13).
 *   · el COLOR lo manda el dosel → de verde pasto a mantillo oscuro (la hojarasca
 *     haciendo suelo, años 5-32).
 * Comparte geometría con la tierra de abajo: una sola malla en la GPU, dos mallas
 * en escena.
 */
function Manto({ geo, anioRef, sombras }) {
  const ref = useRef(null);
  const joven = useMemo(() => new THREE.Color(MANTO_JOVEN), []);
  const maduro = useMemo(() => new THREE.Color(MANTO_MADURO), []);

  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const anio = anioRef.current;
    const cob = cobertura(anio);
    m.visible = cob > 0.012;
    if (!m.visible) return;
    m.material.opacity = cob * 0.95;
    m.material.color.copy(joven).lerp(maduro, dosel(anio));
  });

  return (
    <mesh ref={ref} geometry={geo} position={[0, 0.035, 0]} receiveShadow={sombras}>
      <meshLambertMaterial transparent opacity={0} depthWrite={false} color={MANTO_JOVEN} />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  La ladera entera                                                           */
/* -------------------------------------------------------------------------- */

/**
 * La ladera con toda su sucesión. Montar dentro del <Canvas>.
 * @param {{
 *   anioRef: { current: number },
 *   tier?: 'alto'|'medio'|'bajo',
 * }} props
 */
export default function Ladera({ anioRef, tier = 'alto' }) {
  const perfil = perfilDeTier(tier);
  const conteos = sucDeTier(tier);
  const q = calidadSuc(tier);

  /* --- El suelo: una geometría, dos mallas. --- */
  const terreno = useMemo(() => geomTerreno({ segs: perfil.segmentosTerreno }), [perfil.segmentosTerreno]);

  /* --- Las geometrías de cada especie (una vez por tier). --- */
  const geos = useMemo(() => {
    const g = {};
    // De la casa: lo que solo existe en una ladera que se restaura.
    if (conteos.pasto) g.pasto = geomPastoPobre({ q }, 41);
    if (conteos.carcava) g.carcava = geomCarcava({ q }, 42);
    if (conteos.carcava) g.raices = geomRaices({ q }, 43);
    if (conteos.barreraFilas) g.barrera = geomBarreraViva({ q }, 44);
    if (conteos.helecho) g.helecho = geomHelecho({ q }, 45);
    if (conteos.plantula) g.plantula = geomPlantula({ q }, 46);
    if (conteos.hojarasca) g.hojarasca = geomHojarasca({ q }, 47);
    if (conteos.epifita) g.epifita = geomEpifita({ q }, 48);
    if (conteos.quenua) g.quenua = geomQuenuaJoven({ q }, 49);
    /*
     * Prestadas del Bosque Vivo, tal cual y con sus mismas semillas: es EL MISMO
     * bosque, no uno parecido. El año 50 de esta ladera tiene que ser,
     * literalmente, aquel páramo — el mismo aliso, el mismo roble.
     */
    if (conteos.aliso) g.aliso = geomAliso({ q }, 6);
    if (conteos.yarumo) g.yarumo = geomYarumo({ q }, 3);
    if (conteos.encenillo) g.encenillo = geomEncenillo({ q }, 5);
    if (conteos.gaque) g.gaque = geomGaque({ q }, 7);
    if (conteos.roble) g.roble = geomRoble({ q }, 4);
    if (conteos.mortino) g.mortino = geomMortino({ q }, 8);
    if (conteos.romerillo) g.romerillo = geomRomerillo({ q }, 9);
    if (conteos.roca) g.roca = geomRoca(10);
    if (conteos.musgo) g.musgo = geomMusgo(11);
    return g;
  }, [conteos, q]);

  /* --- Un material para todo: cada geometría trae su color horneado. --- */
  const mat = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.92, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  const matTierra = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true }),
    [],
  );

  /* --- Quién nace dónde y cuándo. --- */
  const dist = useMemo(() => poblarLadera(conteos, 808), [conteos]);
  const epifitas = useMemo(() => colgarEpifitas(dist, conteos.epifita, 606), [dist, conteos.epifita]);

  // Soltar la GPU al desmontar.
  useLayoutEffect(
    () => () => {
      Object.values(geos).forEach((g) => g && g.dispose());
      terreno.dispose();
      mat.dispose();
      matTierra.dispose();
    },
    [geos, terreno, mat, matTierra],
  );

  const sombra = perfil.sombras;

  return (
    <group>
      {/* LA TIERRA PELADA: el potrero. Siempre debajo de todo — nunca se va,
          apenas se deja tapar. Debajo de un bosque de 50 años sigue estando. */}
      <mesh geometry={terreno} material={matTierra} receiveShadow={sombra} />
      <Manto geo={terreno} anioRef={anioRef} sombras={sombra} />

      {/* La piedra: lo único que estuvo antes y estará después. */}
      <EspecieViva geo={geos.roca} mat={mat} items={dist.roca} anioRef={anioRef} />

      {/* LO QUE HABÍA: el pasto ralo del potrero y las cárcavas abiertas. */}
      <EspecieViva geo={geos.pasto} mat={mat} items={dist.pasto} anioRef={anioRef} />
      <EspecieViva geo={geos.carcava} mat={mat} items={dist.carcava} anioRef={anioRef} />

      {/* LO QUE HACE EL CAMPESINO: las barreras en curva de nivel, y las raíces
          agarrando el suelo justo donde estaba la herida. */}
      <EspecieViva geo={geos.barrera} mat={mat} items={dist.barrera} anioRef={anioRef} />
      <EspecieViva geo={geos.raices} mat={mat} items={dist.raices} anioRef={anioRef} />

      {/* EL SUELO QUE SE HACE: hojarasca y musgo. */}
      <EspecieViva geo={geos.hojarasca} mat={mat} items={dist.hojarasca} anioRef={anioRef} />
      <EspecieViva geo={geos.musgo} mat={mat} items={dist.musgo} anioRef={anioRef} />

      {/* LAS PIONERAS del suelo: plántulas, helechos, romerillo, mortiño. */}
      <EspecieViva geo={geos.plantula} mat={mat} items={dist.plantula} anioRef={anioRef} />
      <EspecieViva geo={geos.helecho} mat={mat} items={dist.helecho} anioRef={anioRef} />
      <EspecieViva geo={geos.romerillo} mat={mat} items={dist.romerillo} anioRef={anioRef} />
      <EspecieViva geo={geos.mortino} mat={mat} items={dist.mortino} anioRef={anioRef} />

      {/* LAS PIONERAS ALTAS: aliso y yarumo. Las que corren y hacen la sombra. */}
      <EspecieViva geo={geos.aliso} mat={mat} items={dist.aliso} anioRef={anioRef} castShadow={sombra} />
      <EspecieViva geo={geos.yarumo} mat={mat} items={dist.yarumo} anioRef={anioRef} castShadow={sombra} />

      {/* EL BOSQUE: encenillo, gaque, roble y queñua. Los lentos. Se derraman
          desde el árbol semilla (que va en la misma lista de robles, entero desde
          el primer cuadro: es el que quedó vivo). */}
      <EspecieViva geo={geos.encenillo} mat={mat} items={dist.encenillo} anioRef={anioRef} castShadow={sombra} />
      <EspecieViva geo={geos.gaque} mat={mat} items={dist.gaque} anioRef={anioRef} castShadow={sombra} />
      <EspecieViva geo={geos.roble} mat={mat} items={dist.roble} anioRef={anioRef} castShadow={sombra} />
      <EspecieViva geo={geos.quenua} mat={mat} items={dist.quenua} anioRef={anioRef} castShadow={sombra} />

      {/* LO QUE SOLO LLEGA SI HUBO PACIENCIA: las epífitas, montadas en los
          troncos y subiendo con ellos. */}
      <EspecieViva geo={geos.epifita} mat={mat} items={epifitas} anioRef={anioRef} />
    </group>
  );
}
