/*
 * CicloCerrado — EL CÍRCULO, dibujado literal: animal → estiércol →
 * biodigestor/compostera → gas + abono → suelo → comida → animal.
 *
 * Es la tesis del módulo y por eso no se insinúa con una flecha: se camina. Un
 * sendero circular hecho a mano, con las estaciones encima y la materia
 * corriendo por él como pulsos de color. Uno sigue un pulso con el ojo y da la
 * vuelta entera — ahí entendió que el estiércol no es basura, es el principio.
 *
 * ── LOS DOS CARRILES ───────────────────────────────────────────────────────
 * El anillo se BIFURCA en la rejilla y esa bifurcación es la lección más
 * rentable del corpus: "el orín escurre solo hacia un lado y el sólido queda
 * arriba para recogerlo seco; mezclados se pudren juntos y ahí nace el olor".
 *
 *   · carril de ADENTRO → el LÍQUIDO. Va por dentro y más bajo porque escurre
 *     SOLO, por gravedad. Termina en el biodigestor y sigue como biol.
 *   · carril de AFUERA  → el SÓLIDO. Va por fuera porque hay que CARGARLO
 *     (carretilla, pala, brazo). Termina en la compostera y sigue como compost.
 *
 * Los dos se vuelven a juntar en el suelo. Separar en el origen, reunir en el
 * suelo: eso es todo.
 *
 * ── DÓNDE SE ROMPE ─────────────────────────────────────────────────────────
 * El anillo se cierra aquí, pero al lado de la compostera hay un montón mal
 * llevado del que la materia SE SALE hacia el cielo (ver `Biocompostera.jsx`).
 * El contraste es a propósito: el círculo cerrado es una decisión de manejo,
 * no un regalo de la naturaleza. Se cierra si uno lo cierra.
 *
 * Componente r3f. Los pulsos van INSTANCIADOS (un draw-call para el ciclo
 * entero) y con `reducedMotion` quedan quietos y repartidos: el círculo se
 * sigue leyendo sin que nada se mueva.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { crearMaterialMadre } from '../paleta/index.js';
import { puntosSilueta, SEGMENTOS_SILUETA } from '../artesaniaAndina.js';
import {
  PALETA_ESTIERCOL,
  TRAMOS,
  ESTACIONES,
  posEstacion,
  geometriaTramo,
  pulsosDelCiclo,
  eraGeom,
  torcerConLaMano,
} from './estiercol.geom.js';

/* Borradores de cálculo, a nivel de módulo: se reescriben una vez por pulso por
   frame y jamás sobreviven a la llamada. Van aquí y no en un `useMemo` porque
   son MUTABLES por definición — un objeto de render memoizado que se muta es
   justo lo que el compilador de React (con razón) prohíbe. Cero asignaciones
   por frame, que es lo que pide un InstancedMesh. */
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

/* ── LOS PULSOS: la materia corriendo. Cada uno lleva el color de su tramo, y
      esos colores contados en orden son la frase completa: pardo (estiércol) →
      oscuro (purín) → ámbar (biol) / negro (compost) → verde (comida). ── */
function Pulsos({ datos, reducedMotion }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 5, 4), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  const colocar = (p, t) => {
    p.curva.getPointAt(t, _v);
    /* el pulso rueda SOBRE el sendero, no dentro de él */
    _v.setY(_v.y + 0.06);
    _s.setScalar(p.escala);
    _m.compose(_v, _q, _s);
    return _m;
  };

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    datos.forEach((p, i) => {
      mesh.setMatrixAt(i, colocar(p, p.fase % 1));
      mesh.setColorAt(i, p.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [datos]);

  useFrame((st) => {
    const mesh = ref.current;
    if (!mesh || reducedMotion) return;
    const t0 = st.clock.elapsedTime;
    for (let i = 0; i < datos.length; i += 1) {
      const p = datos[i];
      mesh.setMatrixAt(i, colocar(p, (p.fase + t0 * p.vel) % 1));
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!datos.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, datos.length]} frustumCulled={false} />;
}

/* ── EL CORRAL: donde nace el problema. Un cerdo low-poly sobre su CAMA
      PROFUNDA — el colchón de material seco que absorbe el estiércol en el
      sitio en vez de lavarlo con manguera. La cama es lo que enseña; el cerdo
      es quien lo hace entendible. ── */
function Corral({ materiales, perfil }) {
  const pos = useMemo(() => posEstacion('corral'), []);
  return (
    <group position={pos}>
      {/* LA CAMA PROFUNDA: aserrín/cascarilla. Mientras esté seca y suelta,
          controla el olor. Es más barata que cualquier desinfectante */}
      <mesh material={materiales.carbono} position={[0, 0.09, 0]} receiveShadow={perfil.sombras}>
        <boxGeometry args={[2.3, 0.18, 1.7]} />
      </mesh>
      {/* los horcones del corral, torcidos: son palos de la finca */}
      {[-1.1, 1.1].map((x) =>
        [-0.8, 0.8].map((z) => (
          <mesh key={`${x}${z}`} material={materiales.madera} position={[x, 0.42, z]}>
            <cylinderGeometry args={[0.045, 0.055, 0.84, 5]} />
          </mesh>
        )),
      )}
      {/* el cerdo: el que produce. Sin él, esto es una obra civil sin sentido */}
      <group position={[0.1, 0.42, 0.1]} rotation={[0, 0.5, 0]}>
        <mesh material={materiales.cerdo}>
          <capsuleGeometry args={[0.19, 0.4, 3, 7]} />
        </mesh>
        <mesh material={materiales.cerdo} position={[0, 0.02, 0.32]}>
          <sphereGeometry args={[0.14, 7, 6]} />
        </mesh>
        {/* las cuatro patas, cortas */}
        {[[-0.1, -0.16], [0.1, -0.16], [-0.1, 0.18], [0.1, 0.18]].map(([x, z], i) => (
          <mesh key={i} material={materiales.cerdo} position={[x, -0.23, z]}>
            <cylinderGeometry args={[0.032, 0.028, 0.2, 4]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ── LA REJILLA: la mejora más rentable de la finca, y la más aburrida de
      dibujar. Una pendiente y un canal. Aquí el ciclo se parte en dos: el
      líquido se va solo por abajo, el sólido queda arriba para recogerlo seco. ── */
function Rejilla({ materiales }) {
  const pos = useMemo(() => posEstacion('separacion'), []);
  return (
    <group position={pos}>
      {/* el piso EN PENDIENTE: sin pendiente, no hay separación que valga */}
      <mesh material={materiales.concreto} position={[0, 0.06, 0]} rotation={[0, 0, -0.09]}>
        <boxGeometry args={[1.5, 0.1, 1.2]} />
      </mesh>
      {/* el canal, en el punto más bajo */}
      <mesh material={materiales.purin} position={[-0.62, 0.03, 0]}>
        <boxGeometry args={[0.22, 0.06, 1.2]} />
      </mesh>
      {/* las barras de la rejilla: el sólido no pasa, el líquido sí */}
      {[-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].map((z) => (
        <mesh key={z} material={materiales.lamina} position={[-0.62, 0.09, z]}>
          <boxGeometry args={[0.24, 0.02, 0.035]} />
        </mesh>
      ))}
    </group>
  );
}

/* ── EL TANQUE DE BIOL: el biol no se aplica recién sale — reposa y se aplica
      DILUIDO. El tanque toma la SILUETA DE VASIJA de `artesania/`: base ancha
      y asentada, hombro marcado. No es adorno: es la forma que esta casa le da
      a un recipiente que guarda algo con cuidado. ── */
function TanqueBiol({ materiales }) {
  const pos = useMemo(() => posEstacion('tanque'), []);
  const geo = useMemo(() => {
    const pts = puntosSilueta('vasija', { alto: 0.92 }).map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y));
    const g = new THREE.LatheGeometry(pts, SEGMENTOS_SILUETA);
    return torcerConLaMano(g, { amplitud: 0.012, seed: 33 });
  }, []);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return (
    <group position={pos}>
      <mesh geometry={geo} material={materiales.barro} />
      {/* el biol adentro, en reposo */}
      <mesh material={materiales.biol} position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.02, 10]} />
      </mesh>
    </group>
  );
}

/* ── EL SUELO: donde llegan los dos carriles y donde el ciclo cobra. Surcos con
      matas: lo único que de verdad importa de todo esto. ── */
function Huerta({ materiales, perfil }) {
  const pos = useMemo(() => posEstacion('huerta'), []);
  return (
    <group position={pos}>
      {[-0.5, 0, 0.5].map((z) => (
        <mesh key={z} material={materiales.tierra} position={[0, 0.06, z]} receiveShadow={perfil.sombras}>
          <boxGeometry args={[1.9, 0.12, 0.34]} />
        </mesh>
      ))}
      {/* las matas: abonadas con biol y compost, no con bulto comprado */}
      {[-0.7, -0.2, 0.3, 0.8].map((x) =>
        [-0.5, 0, 0.5].map((z) => (
          <group key={`${x}${z}`} position={[x, 0.12, z]}>
            <mesh material={materiales.tallo} position={[0, 0.13, 0]}>
              <cylinderGeometry args={[0.012, 0.018, 0.26, 4]} />
            </mesh>
            <mesh material={materiales.follaje} position={[0, 0.28, 0]}>
              <icosahedronGeometry args={[0.11, 0]} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

/**
 * El ciclo completo: el anillo, los pulsos y las estaciones menores (las dos
 * grandes —biodigestor y compostera— se montan aparte, cada una en su archivo).
 * @param {object} props
 * @param {object} props.perfil  perfilDeTier(tier)
 * @param {object} props.params  paramsDeTier(tier)
 * @param {boolean} [props.reducedMotion]
 */
export default function CicloCerrado({ perfil, params, reducedMotion = false }) {
  const materiales = useMemo(
    () => ({
      era: crearMaterialMadre('tierra', perfil, { color: PALETA_ESTIERCOL.pasto }),
      sendero: crearMaterialMadre('tierra', perfil, { color: PALETA_ESTIERCOL.sendero }),
      carbono: crearMaterialMadre('tierra', perfil, { color: PALETA_ESTIERCOL.carbono }),
      madera: crearMaterialMadre('madera', perfil),
      cerdo: crearMaterialMadre('corteza', perfil, { color: PALETA_ESTIERCOL.compostJoven }),
      concreto: crearMaterialMadre('cal', perfil),
      purin: crearMaterialMadre('agua', perfil, { color: PALETA_ESTIERCOL.purin }),
      lamina: crearMaterialMadre('lamina', perfil),
      barro: crearMaterialMadre('roca', perfil, { color: PALETA_ESTIERCOL.compostJoven }),
      biol: crearMaterialMadre('agua', perfil, { color: PALETA_ESTIERCOL.biol }),
      tierra: crearMaterialMadre('tierra', perfil),
      tallo: crearMaterialMadre('madera', perfil),
      follaje: crearMaterialMadre('follaje', perfil),
    }),
    [perfil],
  );
  useLayoutEffect(() => () => Object.values(materiales).forEach((m) => m.dispose()), [materiales]);

  const gEra = useMemo(() => eraGeom(), []);
  const gTramos = useMemo(() => TRAMOS.map((t) => geometriaTramo(t, params)), [params]);
  useLayoutEffect(
    () => () => {
      gEra.dispose();
      gTramos.forEach((g) => g.dispose());
    },
    [gEra, gTramos],
  );

  const pulsos = useMemo(() => pulsosDelCiclo(params), [params]);

  /* un material por tramo: el color del sendero delata QUÉ va por él (el
     carril del líquido se ve más oscuro y húmedo que el del sólido) */
  const matsTramo = useMemo(
    () =>
      TRAMOS.map((t) =>
        crearMaterialMadre('tierra', perfil, {
          color: t.color,
          transparent: true,
          opacity: 0.5, // pisado en la tierra, no pintado encima
        }),
      ),
    [perfil],
  );
  useLayoutEffect(() => () => matsTramo.forEach((m) => m.dispose()), [matsTramo]);

  return (
    <group>
      {/* la era: el pedazo de finca donde todo esto pasa */}
      <mesh geometry={gEra} material={materiales.era} receiveShadow={perfil.sombras} position={[0, -0.02, 0]} />

      {/* EL ANILLO: los dos carriles, pisados en la tierra. Se parten en la
          rejilla y se vuelven a juntar en el suelo */}
      {gTramos.map((g, i) => (
        <mesh key={TRAMOS[i].id} geometry={g} material={matsTramo[i]} />
      ))}

      {/* la materia corriendo: siga un pulso con el ojo y dio la vuelta */}
      <Pulsos datos={pulsos} reducedMotion={reducedMotion} />

      <Corral materiales={materiales} perfil={perfil} />
      <Rejilla materiales={materiales} />
      <TanqueBiol materiales={materiales} />
      <Huerta materiales={materiales} perfil={perfil} />
    </group>
  );
}

/** Las estaciones, para que la escena arme sus hotspots sin re-importar. */
export { ESTACIONES };
