/*
 * EntGradiente — el componente r3f de los CUATRO ÁRBOLES MAESTROS del
 * gradiente: la CEIBA (tierra caliente), el ROBLE (templado), el ALISO (frío)
 * y la QUEÑUA (páramo).
 *
 * Uno solo para los cuatro, y eso es el punto: mientras la queñua se montaba
 * con su propio componente, tenía sus propios ojos, su propia escala de
 * cáscara y su propio peso de tinta — y en el retrato de familia se veía que
 * la había hecho otra mano. Aquí los cuatro comparten el mismo `<Rostro>`, el
 * mismo `<Ojo>` y la misma regla de proporciones; lo único que trae cada una
 * es su forma, su corteza y su lección. La geometría vive en
 * `entsGradiente.geom.js`; aquí se le pone material, luz y VIDA.
 *
 * Lo que hace vivo a un Ent (y lo que nunca se le puede quitar):
 *   · el balanceo pesado desde la raíz — lento, con inercia, nunca un metrónomo;
 *   · el parpadeo ancestral (mucho rato abierto, un pestañeo corto);
 *   · la mirada que deriva despacio y vuelve;
 *   · la mandíbula de madera que murmura por frases, con silencios.
 * Con `reducedMotion` todo eso queda QUIETO y sereno — nunca desaparece.
 *
 * ── La trampa de los ojos (documentada para que no se repita) ───────────────
 * El apilado del ojo es GEOMETRÍA, no gusto: el frente del iris DEBE quedar por
 * delante del frente del globo y del pozo de la cuenca. Si no, el ámbar queda
 * literalmente DENTRO de las esferas oscuras y el Ent mira con cuencas vacías de
 * calavera. En el queñual pasó dos veces (una de ellas SOLO con la animación
 * encendida, así que la captura con reducedMotion salía bien y el bug vivo
 * pasaba de largo). Aquí los frentes se derivan del radio del fuste
 * (`proporcionesRostro`) para que la relación se conserve en un tronco grueso
 * como el del roble y en uno delgado como el del aliso.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { crearMaterialVertexColors } from '../paleta/index.js';
import {
  factorParpadeo,
  factorHabla,
  ROSTRO_BOCA_Y,
  specsBarba,
  geometriaHebraBarba,
  BARBA,
} from './entQuenua.geom.js';
import {
  ESPECIES,
  paramsDeTier,
  anclaRostro,
  proporcionesRostro,
  mallaRostro,
  construirMadera,
  construirRaices,
  construirCopa,
  geomSetasDelRoble,
  geomNodulosFrankia,
} from './entsGradiente.geom.js';

/* ══════════════════════════════════════════════════════════════════════════
   UN OJO — hundido en su cuenca, en sombra bajo la cornisa de la ceja
   ══════════════════════════════════════════════════════════════════════════ */
/* El globo es madera húmeda oscura; el IRIS ámbar-miel es CHICO y asoma desde
   la sombra (rescoldo de fogón, jamás un farol naranja); los párpados son del
   MISMO palo que el rostro. Una sola chispa húmeda da la vida. */
function Ojo({ x, z, k, blinkRef, gazeRef, flip, mats }) {
  return (
    <group position={[x, -0.035, z]} scale={[0.94 * k, 0.86 * k, 0.6 * k]}>
      {/* el POZO de la cuenca: oscuridad honda donde se asienta el ojo */}
      <mesh position={[0, -0.005, -0.03]} scale={[1.26, 1.2, 1.24]}>
        <sphereGeometry args={[0.115, 14, 12]} />
        <primitive object={mats.grieta} attach="material" />
      </mesh>
      <group ref={blinkRef}>
        {/* el GLOBO: nace hundido, solo su cara frontal asoma del pozo */}
        <mesh position={[0, 0, 0.04]}>
          <sphereGeometry args={[0.09, 16, 14]} />
          <primitive object={mats.ojo} attach="material" />
        </mesh>
        <group ref={gazeRef} position={[0, 0.004, 0.105]}>
          <mesh scale={[1, 1, 0.65]}>
            <sphereGeometry args={[0.062, 16, 14]} />
            <primitive object={mats.iris} attach="material" />
          </mesh>
          {/* pupila: pozo hondo y amplio en el centro (mirada mansa) */}
          <mesh position={[0, 0, 0.026]} scale={[1, 1, 0.7]}>
            <sphereGeometry args={[0.031, 12, 10]} />
            <primitive object={mats.grieta} attach="material" />
          </mesh>
          {/* la chispa de húmedo: mínima, arriba a un lado — la vida */}
          <mesh position={[flip * 0.021, 0.025, 0.044]}>
            <sphereGeometry args={[0.008, 8, 8]} />
            <primitive object={mats.brillo} attach="material" />
          </mesh>
        </group>
      </group>
      {/* párpado superior de CORTEZA: pesado, entrecerrado — la gravedad sabia */}
      <mesh position={[0, 0.082, 0.032]} rotation={[0.7, 0, flip * 0.08]} scale={[1.24, 0.52, 0.7]}>
        <sphereGeometry args={[0.104, 14, 10]} />
        <primitive object={mats.parpado} attach="material" />
      </mesh>
      {/* párpado inferior: reborde discreto de la misma corteza */}
      <mesh position={[0, -0.08, 0.028]} rotation={[-0.35, 0, -flip * 0.1]} scale={[1.08, 0.4, 0.6]}>
        <sphereGeometry args={[0.095, 12, 8]} />
        <primitive object={mats.parpado} attach="material" />
      </mesh>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EL ROSTRO — la cáscara tallada + los ojos + la mandíbula que murmura
   ══════════════════════════════════════════════════════════════════════════ */
function Rostro({ esp, P, mats, reducedMotion, blinkRefs }) {
  const { centro } = useMemo(() => anclaRostro(esp), [esp]);
  const prop = useMemo(() => proporcionesRostro(esp), [esp]);
  const { cara, mandibula } = useMemo(
    () => mallaRostro(esp, { segRostro: P.segRostro }),
    [esp, P.segRostro],
  );
  useLayoutEffect(() => () => {
    cara.dispose();
    mandibula.dispose();
  }, [cara, mandibula]);

  const gazeIzq = useRef(null);
  const gazeDer = useRef(null);
  const mandibulaRef = useRef(null);

  /* Escala de los ojos relativa a la talla del rostro: en el fuste delgado del
     aliso el ojo del queñual quedaría del tamaño de la cara entera. */
  const k = Math.min(1.15, Math.max(0.72, prop.frenteL / 0.53));

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    // MIRADA: deriva lenta (recorre, se detiene, vuelve). Los dos ojos juntos.
    const gx = Math.sin(t * 0.24 + esp.semilla) * 0.03 + Math.sin(t * 0.09 + 1.1) * 0.015;
    const gy = Math.sin(t * 0.17 + 0.6) * 0.018;
    // La z es la MISMA del grupo de la mirada en <Ojo> (0.105): escribir un
    // valor menor hunde el iris dentro del globo y salen ojos de calavera.
    if (gazeIzq.current) gazeIzq.current.position.set(gx, gy - 0.004, 0.105);
    if (gazeDer.current) gazeDer.current.position.set(gx, gy - 0.004, 0.105);
    // HABLA: la mandíbula pivota despacio — murmullo de árbol viejo, con pausas.
    const abre = factorHabla(t + esp.semilla * 0.7);
    if (mandibulaRef.current) mandibulaRef.current.rotation.x = 0.015 + abre * 0.11;
  });

  return (
    <group position={[centro.x, centro.y, centro.z]} scale={esp.rostroEscala}>
      {/* la cavidad oscura tras la boca-grieta: al abrirse se ve hondura, no
          tronco. Discreta: agrandarla devuelve la franja negra de teatro. */}
      <mesh position={[0, ROSTRO_BOCA_Y - 0.02, prop.zBoca - 0.16]} scale={[0.29, 0.1, 0.13]}>
        <sphereGeometry args={[1, 14, 12]} />
        <primitive object={mats.grieta} attach="material" />
      </mesh>

      <mesh geometry={cara} material={mats.corteza} castShadow receiveShadow />
      <group ref={mandibulaRef} position={[0, ROSTRO_BOCA_Y, 0]}>
        <mesh geometry={mandibula} material={mats.corteza} castShadow receiveShadow />
      </group>

      <Ojo x={-prop.sepOjo} z={prop.zOjo} k={k} blinkRef={blinkRefs.izq} gazeRef={gazeIzq} flip={-1} mats={mats} />
      <Ojo x={prop.sepOjo} z={prop.zOjo} k={k} blinkRef={blinkRefs.der} gazeRef={gazeDer} flip={1} mats={mats} />

      {/* la barba de usnea cuelga del MISMO grupo que la cara: comparte ancla,
          escala y balanceo, así que nunca se le despega del mentón */}
      {esp.barba && (
        <Barba prop={prop} densidad={P.barbaDens} mats={mats} reducedMotion={reducedMotion} />
      )}
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LA BARBA DE USNEA — solo la queñua
   ══════════════════════════════════════════════════════════════════════════ */
/*
 * La cortina de líquen colgante (*Usnea*, "barba de viejo") es la firma del
 * guardián del páramo y no se le puede quitar sin dejar de ser él. Los
 * mechones y su geometría salen tal cual del taller original
 * (`specsBarba` / `geometriaHebraBarba`): es patrimonio común, no hay por qué
 * volver a dibujarlo — y volver a dibujarlo sería justo el error que este
 * trabajo vino a corregir.
 *
 * Lo único que cambia es DÓNDE se cuelga: las coordenadas de los mechones son
 * las del campo del rostro, así que la barba vive en el mismo grupo que la
 * cara, con la misma escala de cáscara de la especie y adelantada hasta la
 * superficie (`frenteL`). Así queda prendida del mentón en cualquier fuste,
 * grueso o delgado, sin números a mano.
 */
function Barba({ prop, densidad, mats, reducedMotion }) {
  const { hebras, tufts } = useMemo(() => specsBarba(91), []);
  /* El liquen de la barba se adelgaza por tier; el MUSGO DE LAS CEJAS no. Un
     `slice` ciego se lo llevaba entero (va al final de la lista) y las cejas de
     musgo son un rasgo del rostro, no relleno. */
  const hb = useMemo(
    () => hebras.slice(0, Math.max(10, Math.round(hebras.length * densidad))),
    [hebras, densidad],
  );
  const tf = useMemo(() => {
    const liquen = tufts.filter((t) => !t.musgo);
    const musgo = tufts.filter((t) => t.musgo);
    return [...liquen.slice(0, Math.max(5, Math.round(liquen.length * densidad))), ...musgo];
  }, [tufts, densidad]);

  const hebraGeo = useMemo(() => geometriaHebraBarba(), []);
  const tuftGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  useLayoutEffect(() => () => { hebraGeo.dispose(); tuftGeo.dispose(); }, [hebraGeo, tuftGeo]);

  const hebraRef = useRef(null);
  const tuftRef = useRef(null);
  const grupoRef = useRef(null);

  useLayoutEffect(() => {
    const mesh = hebraRef.current;
    if (mesh) {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const p = new THREE.Vector3();
      const s = new THREE.Vector3();
      const col = new THREE.Color();
      for (let i = 0; i < hb.length; i++) {
        const h = hb[i];
        p.set(h.pos[0], h.pos[1], h.pos[2]);
        e.set(h.lean, h.yaw, h.tilt);
        q.setFromEuler(e);
        s.set(h.grosor, h.len, h.grosor);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
        // la geometría trae la rampa raíz→punta; el tinte por instancia da el tono
        if (h.woody) col.copy(BARBA.raicilla);
        else col.copy(BARBA.usnea).lerp(BARBA.usneaGris, h.tono);
        mesh.setColorAt(i, col);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    const tmesh = tuftRef.current;
    if (tmesh) {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const p = new THREE.Vector3();
      const s = new THREE.Vector3();
      const col = new THREE.Color();
      for (let i = 0; i < tf.length; i++) {
        const l = tf[i];
        p.set(l.pos[0], l.pos[1], l.pos[2]);
        s.set(l.esc * 1.6, l.esc * 0.7, l.esc * 1.1);
        m.compose(p, q, s);
        tmesh.setMatrixAt(i, m);
        col.copy(l.musgo ? BARBA.musgoCeja : (l.azul ? BARBA.liquenAzul : BARBA.liquen));
        tmesh.setColorAt(i, col);
      }
      tmesh.instanceMatrix.needsUpdate = true;
      if (tmesh.instanceColor) tmesh.instanceColor.needsUpdate = true;
    }
    /*
     * LOS MATERIALES VAN EN LAS DEPENDENCIAS, y no es por pedantería del linter.
     *
     * El material viaja dentro de `args`, y r3f RECONSTRUYE el objeto cuando
     * `args` cambia. Al apagar o encender al guardián nace un InstancedMesh
     * NUEVO con todas sus matrices en identidad — y si este efecto no vuelve a
     * correr, los 34 mechones de líquen se quedan en escala 1 amontonados en el
     * mentón: el icosaedro unitario del tuft se convierte en UNA BOLA BEIGE
     * LISA del tamaño de la copa, posada sobre el páramo.
     *
     * Es un fallo mudo de los peores: no hay error, la barba simplemente
     * desaparece y en su lugar aparece un planeta. Solo se ve en la captura, y
     * solo cuando el foco está en otro piso.
     */
  }, [hb, tf, mats.hebra, mats.tuft]);

  useFrame((st) => {
    if (reducedMotion || !grupoRef.current) return;
    const t = st.clock.elapsedTime;
    grupoRef.current.rotation.z = Math.sin(t * 0.5) * 0.02;
    grupoRef.current.rotation.x = 0.04 + Math.sin(t * 0.4 + 1) * 0.015;
  });

  return (
    <group ref={grupoRef} position={[0, 0, prop.frenteL * 0.92]}>
      <instancedMesh ref={hebraRef} args={[hebraGeo, mats.hebra, hb.length]} frustumCulled={false} />
      <instancedMesh ref={tuftRef} args={[tuftGeo, mats.tuft, tf.length]} frustumCulled={false} />
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LAS MANOS — nudo de muñeca + dedos-ramita
   ══════════════════════════════════════════════════════════════════════════ */
/* En reposo los dedos van CORTOS y RECOGIDOS hacia la tierra: los dedos largos
   y abiertos leen como garra de espanto junto al rostro. La mano que SEÑALA
   estira el índice hacia la lección y recoge los otros tres. */
function Mano({ spec, esc, mat }) {
  const { muneca, dedos, lado } = spec;
  if (dedos === 'senala') {
    return (
      <group position={[muneca.x, muneca.y, muneca.z]}>
        <mesh rotation={[0.5, 0, 0]}>
          <boxGeometry args={[0.2 * esc, 0.12 * esc, 0.22 * esc]} />
          <primitive object={mat} attach="material" />
        </mesh>
        {/* ÍNDICE: el dedo largo que señala la lección del pie */}
        <mesh position={[0.02 * esc, -0.16 * esc, 0.16 * esc]} rotation={[Math.PI - 0.55, 0, 0]}>
          <coneGeometry args={[0.045 * esc, 0.5 * esc, 6]} />
          <primitive object={mat} attach="material" />
        </mesh>
        <mesh position={[0.02 * esc, -0.05 * esc, 0.12 * esc]}>
          <sphereGeometry args={[0.05 * esc, 8, 7]} />
          <primitive object={mat} attach="material" />
        </mesh>
        {[-0.07, 0, 0.07].map((dx, i) => (
          <mesh key={i} position={[dx * esc, -0.12 * esc, -0.02 * esc]} rotation={[Math.PI - 1.4, 0, 0]}>
            <coneGeometry args={[0.032 * esc, 0.2 * esc, 5]} />
            <primitive object={mat} attach="material" />
          </mesh>
        ))}
        <mesh position={[-0.11 * esc, -0.02 * esc, 0.05 * esc]} rotation={[0, 0, 0.9 * lado]}>
          <coneGeometry args={[0.035 * esc, 0.16 * esc, 5]} />
          <primitive object={mat} attach="material" />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[muneca.x, muneca.y, muneca.z]}>
      <mesh scale={[1.1, 0.92, 1]}>
        <sphereGeometry args={[0.12 * esc, 10, 8]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {[
        [-0.06, -0.14, 0.02, 0.2],
        [0, -0.16, 0.05, 0.24],
        [0.06, -0.13, 0, 0.19],
      ].map(([dx, dy, dz, len], j) => (
        <mesh
          key={j}
          position={[dx * esc, dy * esc, dz * esc]}
          rotation={[Math.PI - 0.12 + j * 0.06, 0, dx * 1.2]}
        >
          <coneGeometry args={[0.032 * esc, len * esc, 5]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EL ENT COMPLETO
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Un Ent del gradiente. Montar SOLO dentro de un <Canvas>.
 *
 * @param {object} props
 * @param {'ceiba'|'roble'|'aliso'|'quenua'} props.especie
 * @param {'alto'|'medio'|'bajo'} [props.tier]
 * @param {boolean} [props.reducedMotion]
 * @param {boolean} [props.apagado]  el guardián se APAGA un punto porque el
 *   foco está en otro piso. La ladera ya apagaba la vegetación de los pisos que
 *   no se están mirando, pero no a los Ents — y con la ceiba adentro eso dejó
 *   de ser un detalle: la ceiba mide 9,6 y vive una terraza más abajo, así que
 *   en el retrato del roble entraba entera, a todo color y MÁS GRANDE que el
 *   roble. El retrato dejaba de ser de quien decía la carta. Apagar NO es
 *   esconder: el vecino se sigue viendo, pero deja de pelear por el ojo.
 * @param {boolean} [props.leccion]  monta la lección hecha COSA al pie del
 *   árbol, cuando la especie tiene una: el corro de setas del roble
 *   (*Cantharellus* + *Lactarius*) o los nódulos de *Frankia* en las raíces del
 *   aliso. La ceiba y la queñua NO tienen: la de la ceiba sería inventarle una
 *   simbiosis que nadie ha verificado, y la de la queñua no le crece al pie —
 *   es el agua, y la dibuja la escena.
 */
export default function EntGradiente({
  especie = 'roble',
  tier = 'alto',
  reducedMotion = false,
  leccion = true,
  apagado = false,
}) {
  const esp = ESPECIES[especie] || ESPECIES.roble;
  const P = useMemo(() => paramsDeTier(tier), [tier]);
  /* Primo hermano del gris con que la ladera apaga la vegetación de los pisos
     sin foco (`matApagado`), pero un punto MÁS CLARO. Con el gris de la
     vegetación al pie de la letra, un guardián apagado quedaba en silueta
     negra: apagar es mandarlo a segundo plano, no borrarlo. El vecino tiene
     que seguir leyéndose como un árbol con cara. */
  const TINTE_APAGADO = '#8b8c80';

  const swayRef = useRef(null);
  const ojoIzq = useRef(null);
  const ojoDer = useRef(null);

  /* ── Geometrías (una vez por especie y tier) ── */
  const { geo: maderaGeo, ramas, brazos } = useMemo(() => construirMadera(esp, P), [esp, P]);
  const { geo: raicesGeo, raices } = useMemo(() => construirRaices(esp, P), [esp, P]);
  const copaGeo = useMemo(
    () => construirCopa(esp, P, ramas.map((r) => r.punta)),
    [esp, P, ramas],
  );
  const leccionGeo = useMemo(() => {
    if (!leccion) return null;
    if (esp.id === 'roble') return geomSetasDelRoble({ q: P.hojasCopa }, 909);
    if (esp.id === 'aliso') return geomNodulosFrankia(raices, { q: P.hojasCopa }, 515);
    /* Ceiba y queñua no montan nada al pie, y es a propósito — ver el JSDoc.
       Antes esta rama caía en los nódulos de Frankia por descarte, que le
       habría puesto a la ceiba una simbiosis que nadie ha verificado. */
    return null;
  }, [esp, P, raices, leccion]);

  useEffect(() => () => {
    maderaGeo.dispose();
    raicesGeo.dispose();
    copaGeo.dispose();
    if (leccionGeo) leccionGeo.dispose();
  }, [maderaGeo, raicesGeo, copaGeo, leccionGeo]);

  /* ── Materiales ──
     La madera y la copa viajan con el color HORNEADO por vértice: un solo
     material blanco para todo (el patrón de la casa). El facetado de la corteza
     va apagado —el relieve es geometría, no facetas— y el de la copa también,
     porque `matojoNube` trae normales radiales que la hacen masa suave. */
  /*
   * EL APAGÓN se hornea AL CREAR el material, no se le pinta encima después.
   *
   * Mutarle el color a un material memoizado cada vez que cambia el foco es
   * exactamente lo que la regla de inmutabilidad de hooks prohíbe, y con razón:
   * multiplicar sobre el valor actual habría ido oscureciendo al árbol un poco
   * más en cada cambio de piso hasta dejarlo negro, sin que nadie avisara. Con
   * `apagado` en las dependencias, cada estado tiene su material y punto.
   */
  const tinte = useMemo(() => (apagado ? new THREE.Color(TINTE_APAGADO) : null), [apagado]);
  const tenido = useCallback(
    (c) => (tinte ? new THREE.Color(c).multiply(tinte) : new THREE.Color(c)),
    [tinte],
  );

  const matCorteza = useMemo(() => {
    const m = crearMaterialVertexColors(P, { flatShading: false, roughness: 0.94 });
    if (tinte) m.color.multiply(tinte);
    return m;
  }, [P, tinte]);
  const matCopa = useMemo(() => {
    const m = crearMaterialVertexColors(P, { flatShading: false, roughness: 0.88 });
    if (tinte) m.color.multiply(tinte);
    return m;
  }, [P, tinte]);
  const matLeccion = useMemo(() => {
    const m = crearMaterialVertexColors(P, { flatShading: false, roughness: 0.82 });
    if (tinte) m.color.multiply(tinte);
    return m;
  }, [P, tinte]);
  /* Los materiales del rostro: un punto más oscuros que el fuste para que manos
     y párpados no peguen en claro contra la corteza. Se derivan del color de
     grieta de la especie, no de un hex suelto. */
  const matManos = useMemo(() => {
    const c = tenido(new THREE.Color(esp.corteza.grieta).lerp(new THREE.Color(esp.corteza.cuerpo), 0.45));
    return P.materialRico
      ? new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })
      : new THREE.MeshLambertMaterial({ color: c });
  }, [esp, P.materialRico, tenido]);
  const matGrieta = useMemo(() => {
    const c = tenido(new THREE.Color(esp.corteza.grieta).multiplyScalar(0.45));
    return P.materialRico
      ? new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })
      : new THREE.MeshLambertMaterial({ color: c });
  }, [esp, P.materialRico, tenido]);
  const matParpado = useMemo(() => {
    const c = tenido(new THREE.Color(esp.corteza.grieta).lerp(new THREE.Color(esp.corteza.cuerpo), 0.28));
    return P.materialRico
      ? new THREE.MeshStandardMaterial({ color: c, roughness: 0.92 })
      : new THREE.MeshLambertMaterial({ color: c });
  }, [esp, P.materialRico, tenido]);
  const matOjo = useMemo(
    () => (P.materialRico
      ? new THREE.MeshStandardMaterial({ color: '#160f0a', roughness: 0.62 })
      : new THREE.MeshLambertMaterial({ color: '#1a120d' })),
    [P.materialRico],
  );
  const matBrillo = useMemo(
    () => new THREE.MeshBasicMaterial({ color: tenido('#e6ecdd') }),
    [tenido],
  );
  /* Iris ámbar-miel DISCRETO. En frugal va Lambert CON emisivo, nunca Basic
     plano: el disco naranja sin sombreado era el peor de los goggles.
     Y cuando el foco está en otro piso, el iris DEJA DE ARDER: la mirada
     encendida es del guardián que tiene el turno. */
  const matIris = useMemo(() => {
    const emisivo = apagado ? 0.1 : 0.5;
    return P.materialRico
      ? new THREE.MeshStandardMaterial({
        color: tenido('#b08137'), emissive: '#6b4514', emissiveIntensity: emisivo, roughness: 0.55,
      })
      : new THREE.MeshLambertMaterial({
        color: tenido('#b08137'), emissive: '#6b4514', emissiveIntensity: emisivo + 0.05,
      });
  }, [P.materialRico, apagado, tenido]);

  /* La BARBA de usnea: Lambert siempre (el líquen no pide PBR y son dos
     draw-calls instanciados). La hebra lleva vertexColors —la rampa raíz→punta
     va HORNEADA en la geometría— y el instanceColor le pone el tono; el tuft
     tinta por instancia sobre blanco. Solo se crean si la especie lleva barba. */
  const matHebra = useMemo(() => {
    if (!esp.barba) return null;
    return new THREE.MeshLambertMaterial({ vertexColors: true, color: tenido('#ffffff') });
  }, [esp.barba, tenido]);
  const matTuft = useMemo(
    () => (esp.barba ? new THREE.MeshLambertMaterial({ color: tenido('#ffffff') }) : null),
    [esp.barba, tenido],
  );

  const todos = useMemo(
    () => [matCorteza, matCopa, matLeccion, matManos, matGrieta, matParpado, matOjo, matBrillo,
      matIris, matHebra, matTuft].filter(Boolean),
    [matCorteza, matCopa, matLeccion, matManos, matGrieta, matParpado, matOjo, matBrillo,
      matIris, matHebra, matTuft],
  );

  useEffect(() => () => { todos.forEach((m) => m.dispose()); }, [todos]);

  const matsRostro = useMemo(
    () => ({
      corteza: matCorteza,
      grieta: matGrieta,
      parpado: matParpado,
      ojo: matOjo,
      iris: matIris,
      brillo: matBrillo,
      hebra: matHebra,
      tuft: matTuft,
    }),
    [matCorteza, matGrieta, matParpado, matOjo, matIris, matBrillo, matHebra, matTuft],
  );

  /* ── Vida: balanceo pesado desde la raíz + parpadeo lento ── */
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    if (swayRef.current) {
      swayRef.current.rotation.z = Math.sin(t * 0.45 + esp.semilla) * 0.016;
      swayRef.current.rotation.x = Math.sin(t * 0.37 + 1.1 + esp.semilla) * 0.011;
    }
    const b = factorParpadeo(t + esp.semilla * 1.3);
    if (ojoIzq.current) ojoIzq.current.scale.y = b;
    if (ojoDer.current) ojoDer.current.scale.y = b;
  });

  const escManos = esp.r0 / 0.86; // las manos siguen el grosor del palo

  return (
    <group name={`ent-${esp.id}`}>
      {/* raíces plantadas: quedan FUERA del balanceo, ellas agarran la tierra */}
      <mesh geometry={raicesGeo} material={matCorteza} castShadow receiveShadow />

      {/* la lección hecha cosa, al pie del árbol y también fuera del balanceo */}
      {leccionGeo && (
        <mesh geometry={leccionGeo} material={matLeccion} castShadow receiveShadow />
      )}

      {/* fuste + ramas + brazos + rostro + copa: se mecen desde la base */}
      <group ref={swayRef}>
        <mesh geometry={maderaGeo} material={matCorteza} castShadow receiveShadow />

        {brazos.map((b, i) => (
          <Mano key={`mano-${i}`} spec={b} esc={escManos} mat={matManos} />
        ))}

        <Rostro
          esp={esp}
          P={P}
          mats={matsRostro}
          reducedMotion={reducedMotion}
          blinkRefs={{ izq: ojoIzq, der: ojoDer }}
        />

        <mesh geometry={copaGeo} material={matCopa} castShadow />
      </group>
    </group>
  );
}
