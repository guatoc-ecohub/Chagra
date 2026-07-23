/*
 * EscenaCicloAgua — EL VIAJE DEL AGUA EN LA FINCA, de la nube a la nube.
 *
 * Una microcuenca CORTADA como un barranco y abierta hacia el espectador. Por
 * el eje baja la quebrada; a cada lado, la misma loma bajo la MISMA nube:
 *
 *   lluvia → hojarasca → infiltración → LA ESPONJA → nacimiento → quebrada →
 *   tanque → riego → cultivo → evapotranspiración → nube → lluvia.
 *
 * El anillo cierra. Y al lado, la misma agua sin suelo que la reciba: escurre,
 * se lleva la loma y se acaba con el aguacero.
 *
 * ── POR QUÉ ESTÁ CORTADA ────────────────────────────────────────────────────
 * Porque la lección vive BAJO TIERRA. Un paisaje bonito de la finca no puede
 * enseñar infiltración: lo único que se ve desde arriba es que llovió. Aquí se
 * ve entrar el agua, llenarse los poros, subir el freático y salir por el
 * nacimiento — que es la cadena que el campesino conoce por sus efectos pero
 * nunca ha visto. El corte es el argumento, no un truco.
 *
 * ── CÓMO SE LEE ─────────────────────────────────────────────────────────────
 * IZQUIERDA (viva): páramo y turbera arriba, hojarasca y horizonte A negro y
 * hondo, poros que se llenan de azul mientras baja el frente de humedecimiento,
 * freático alto, nacimiento cercado que mana LIMPIO, surcos en contorno, zanja
 * de infiltración, techo de zinc → canaleta → tanque → goteo.
 * DERECHA (desnuda): potrero pelado con costra, horizonte A de una uña, surcos
 * derecho loma abajo vueltos cárcavas, agua turbia que se lleva el suelo y lo
 * bota en un abanico, freático hondo, boca de nacimiento SECA, orilla pisada.
 * ABAJO: las dos aguas en la misma quebrada — clara y turbia, mezclándose.
 *
 * ── CONTRATOS ───────────────────────────────────────────────────────────────
 * - Geometría y modelo hidrológico: `cicloAgua.geom.js` (puro, headless).
 * - Piezas y plantas: `piezasAgua.jsx` (sin árboles, a propósito — ver su
 *   cabecera).
 * - Cielo, luz, niebla y temporada: `<AtmosferaViva/>` del módulo `atmosfera/`
 *   — NO se duplica. De su preset salen además dos lecciones: el `pasto` de la
 *   temporada tiñe la ladera viva (la muerta NO cambia: ya no hay nada que
 *   responda) y la `calina` del mediodía se lleva el riego por el aire.
 * - Colores: `paleta/` y nada más. El único azul es agua (regla de la casa); el
 *   agua turbia no es un café nuevo — es agua viva mezclada con la tierra del
 *   camino, que es exactamente lo que es.
 *
 * Tier-safe: 'alto' pleno; 'medio' frugal; 'bajo' mínimo digno (sin vapor, sin
 * niebla, sin huellas). `reducedMotion` congela el ciclo en `MOMENTO_QUIETO`
 * —llueve y las dos laderas YA divergieron— y nada se mueve.
 *
 * Componente r3f: montar SOLO dentro de un host que provea altura. Importa
 * three → siempre perezoso.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { decidirTier, perfilDeTier } from '../deviceTier.js';
import { AtmosferaViva, useAtmosferaViva } from '../atmosfera/index.js';
import {
  PAL,
  VALLE,
  FADE_CORTE,
  BOCA_SECA,
  MOMENTO_QUIETO,
  alturaValle,
  cicloAguacero,
  frentes,
  clamp01,
  paramsDeTier,
  geometriaCorte,
  geometriaTerreno,
  geometriaFlancos,
  geometriaFreatico,
  geometriaCarcavas,
  geometriaAbanico,
  geometriaQuebrada,
  porosSuelo,
  surcosContorno,
  carcavas,
  zanjaInfiltracion,
  curvaNacimiento,
  gotasLluvia,
  flecosEscorrentia,
  motasVapor,
  motasNiebla,
  frailejones,
  briznas,
  matorral,
  hoyosPata,
  cercaRonda,
  sitioCasa,
  nube,
  matasRiego,
} from './cicloAgua.geom.js';
import {
  Frailejonal,
  Briznas,
  Matorral,
  Nube,
  CasaTanque,
  CercaRonda,
  Hoyos,
  SurcosContorno,
  Zanja,
  LineaGoteo,
} from './piezasAgua.jsx';

const CSS = `
.agua-canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.8s ease; }
.agua-canvas--lista { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .agua-canvas { transition: none; } }
`;

/** Segundos del ciclo completo del aguacero (llueve, escurre, escampa, entrega). */
const DUR = 46;

/*
 * ESCALA DEL MUNDO — y por qué no es 1.
 *
 * La cuenca se modela en `cicloAgua.geom` a tamaño cómodo (12.8 de ancho): así
 * los espesores de los horizontes son números legibles y no decimales de
 * relojero. Pero la NIEBLA no es nuestra: la pone `atmosfera/`, y sus presets
 * están calibrados para un sujeto a 5-12 unidades de la cámara (near 6-12, far
 * 30-48). En madrugada con lluvia el fog cierra en ~14 — con el bloque a 12.6
 * de distancia, la escena entera amanecía borrada en bruma, justo encima de la
 * lección.
 *
 * Encogiendo el mundo y acercando la cámara en la misma proporción, el encuadre
 * es idéntico pero las distancias caen a la mitad: a mediodía no hay fog y en la
 * madrugada queda una bruma que ATMOSFERA, en vez de tapar. Se ajusta el mundo a
 * la ley de la casa, no la ley de la casa al mundo.
 */
const ESCALA = 0.5;

/* El reloj de la HIDROLOGÍA (fase del aguacero) es distinto del reloj del
   MOVIMIENTO (gotas cayendo): así el deslizador de la demo puede parar el
   aguacero en un instante y las gotas siguen cayendo, en vez de congelarse
   media escena. */
function faseDe(clock, faseFija, reducedMotion) {
  if (reducedMotion) return MOMENTO_QUIETO * DUR;
  if (faseFija != null) return faseFija * DUR;
  return clock.elapsedTime;
}

/** Utilería de instanciado: compone una matriz sin alocar por instancia. */
function tmpMat() {
  return {
    m: new THREE.Matrix4(),
    q: new THREE.Quaternion(),
    e: new THREE.Euler(),
    s: new THREE.Vector3(),
    p: new THREE.Vector3(),
  };
}

/* ================================================================== */
/* EL BLOQUE: el corte, el terreno, los costados                       */
/* ================================================================== */

function Corte({ P }) {
  const geo = useMemo(() => geometriaCorte(P), [P]);
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: false }),
    [],
  );
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

function Terreno({ P, pasto }) {
  const geo = useMemo(() => geometriaTerreno(P, pasto), [P, pasto]);
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    [],
  );
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

function Flancos({ P }) {
  const geo = useMemo(() => geometriaFlancos(P), [P]);
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    [],
  );
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

/* ================================================================== */
/* EL AGUA QUE NO SE VE: freático y poros                              */
/* ================================================================== */

/**
 * La lámina del freático sobre el corte. Translúcida a propósito: el agua no
 * TAPA el suelo, lo SATURA — se ve el humus a través, que es lo que pasa de
 * verdad. Sube con el aguacero y baja con el verano, y del lado muerto casi no
 * se despega del fondo.
 */
function Freatico({ P, faseFija, reducedMotion }) {
  const { geo, escribir } = useMemo(() => geometriaFreatico(P), [P]);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    [],
  );
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  const pintar = (t) => {
    const E = cicloAguacero(t, DUR);
    escribir(E.cargaViva, E.cargaMuerta);
  };
  useLayoutEffect(() => { pintar(faseDe({ elapsedTime: 0 }, faseFija, reducedMotion)); });
  useFrame((st) => pintar(faseDe(st.clock, faseFija, reducedMotion)));

  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={2} />;
}

/**
 * LOS POROS — la esponja hecha visible, y el corazón de la escena.
 *
 * A la izquierda son muchos y gordos y se van LLENANDO DE AZUL de arriba hacia
 * abajo mientras el frente de humedecimiento baja: eso es la infiltración,
 * ocurriendo. A la derecha son cuatro poros apretados bajo la costra y apenas
 * se mojan dos dedos: el agua les pasa por encima.
 *
 * Cuando escampa, la izquierda se seca DESDE ARRIBA y allá abajo le queda una
 * banda azul que no suelta. Esa banda es el nacimiento de agosto.
 */
function Poros({ P, faseFija, reducedMotion }) {
  const ref = useRef(null);
  const lista = useMemo(() => porosSuelo(P), [P]);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 6, 5), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const tmp = useMemo(tmpMat, []);
  const col = useMemo(() => new THREE.Color(), []);

  const escribir = (t) => {
    const mesh = ref.current;
    if (!mesh) return;
    const E = cicloAguacero(t, DUR);
    const fViva = frentes(E, true);
    const fMuerta = frentes(E, false);
    const { m, q, s, p } = tmp;
    for (let i = 0; i < lista.length; i++) {
      const o = lista[i];
      const f = o.viva ? fViva : fMuerta;
      /* húmedo entre el frente que seca y hasta donde alcanzó a entrar */
      const w = clamp01((f.moja - o.d) * 8) * clamp01((o.d - f.seca) * 8);
      col.copy(PAL.poroSeco).lerp(PAL.clara, w);
      mesh.setColorAt(i, col);
      p.set(o.x, o.y, o.z);
      s.setScalar(o.r * (1 + w * 0.28)); // lleno, el poro se ve más
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  useLayoutEffect(() => { escribir(faseDe({ elapsedTime: 0 }, faseFija, reducedMotion)); });
  useFrame((st) => escribir(faseDe(st.clock, faseFija, reducedMotion)));
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!lista.length) return null;
  return (
    <instancedMesh ref={ref} args={[geo, mat, lista.length]} frustumCulled={false} renderOrder={3} />
  );
}

/* ================================================================== */
/* EL AGUA QUE SÍ SE VE                                                */
/* ================================================================== */

/**
 * Los flecos de espuma de la quebrada: sin esto el agua es un plástico azul.
 *
 * Corren hacia la cámara y SE APAGAN antes de llegar al corte (`FADE_CORTE`).
 * Eso resuelve el único problema de cortar un valle: el agua no se derrama por
 * el tajo — está SECCIONADA, como el suelo, y se lee que sigue más allá. Es la
 * misma convención del modelo de museo.
 */
function FlecosQuebrada({ eje, P, faseFija, reducedMotion }) {
  const ref = useRef(null);
  const n = Math.max(10, Math.round(P.flecos * 0.35));
  const lista = useMemo(
    () => Array.from({ length: n }, (_, i) => ({
      t0: (i * 0.6180339) % 1,
      lado: (((i * 41) % 20) / 20 - 0.5) * 0.62,
      tam: 0.02 + ((i * 17) % 10) / 300,
      vel: 0.075 + ((i * 23) % 10) / 190,
    })),
    [n],
  );
  const geo = useMemo(() => new THREE.SphereGeometry(1, 5, 4), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: PAL.espuma, transparent: true, opacity: 0.75, depthWrite: false }),
    [],
  );
  const tmp = useMemo(tmpMat, []);

  const escribir = (t, tMov) => {
    const mesh = ref.current;
    if (!mesh) return;
    const E = cicloAguacero(t, DUR);
    const { m, q, s, p } = tmp;
    const caudal = 0.5 + E.caudalVivo * 0.5 + E.escorrenMuerta * 0.5;
    for (let i = 0; i < lista.length; i++) {
      const o = lista[i];
      let f = o.t0 + tMov * o.vel * caudal;
      f -= Math.floor(f);
      eje.getPoint(f, p);
      p.x += o.lado;
      p.y += 0.022;
      /* se apaga acercándose al corte: el agua no se derrama, está cortada */
      const vivo = clamp01((VALLE.zCorte - p.z) / FADE_CORTE);
      s.setScalar(o.tam * vivo * caudal);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    escribir(faseDe({ elapsedTime: 0 }, faseFija, reducedMotion), reducedMotion ? 0.6 : 0);
  });
  useFrame((st) => {
    const tMov = reducedMotion ? 0.6 : st.clock.elapsedTime;
    escribir(faseDe(st.clock, faseFija, reducedMotion), tMov);
  });
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  return <instancedMesh ref={ref} args={[geo, mat, lista.length]} frustumCulled={false} renderOrder={2} />;
}

/** La quebrada: la lámina clara, y encima la pluma turbia que llega de enfrente. */
function Quebrada({ P, faseFija, reducedMotion }) {
  const { clara, pluma, eje } = useMemo(() => geometriaQuebrada(P), [P]);
  const matClara = useMemo(
    () => new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    }),
    [],
  );
  const matPluma = useMemo(
    () => new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    [],
  );
  useLayoutEffect(() => () => {
    clara.dispose(); pluma.dispose(); matClara.dispose(); matPluma.dispose();
  }, [clara, pluma, matClara, matPluma]);

  const pintar = (t) => {
    const E = cicloAguacero(t, DUR);
    /* sin aguacero no hay pluma: la quebrada se aclara sola en un par de días.
       Con aguacero, la ladera pelada la vuelve chocolate en minutos. */
    matPluma.opacity = clamp01(E.erosion * 1.15) * 0.92;
  };
  useLayoutEffect(() => { pintar(faseDe({ elapsedTime: 0 }, faseFija, reducedMotion)); });
  useFrame((st) => pintar(faseDe(st.clock, faseFija, reducedMotion)));

  return (
    <group>
      <mesh geometry={clara} material={matClara} frustumCulled={false} />
      <mesh geometry={pluma} material={matPluma} frustumCulled={false} renderOrder={1} />
      <FlecosQuebrada eje={eje} P={P} faseFija={faseFija} reducedMotion={reducedMotion} />
    </group>
  );
}

/**
 * EL NACIMIENTO VIVO: el agua sale del barranco y cae a la quebrada, limpia.
 * Su caudal nunca llega a cero (`caudalVivo` tiene piso 0.30) — y esa terquedad
 * ES la lección: "se me está secando el nacimiento en el verano, ¿qué hago?"
 * (corpus). Esto es el qué hacer, visto por dentro.
 */
function Nacimiento({ faseFija, reducedMotion }) {
  const ref = useRef(null);
  const curva = useMemo(() => curvaNacimiento(), []);
  const n = 20;
  const geo = useMemo(() => new THREE.SphereGeometry(1, 6, 5), []);
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: PAL.clara, transparent: true, opacity: 0.92 }),
    [],
  );
  const tmp = useMemo(tmpMat, []);
  const semillas = useMemo(
    () => Array.from({ length: n }, (_, i) => ({ t0: i / n, tam: 0.5 + ((i * 37) % 10) / 14 })),
    [],
  );

  const escribir = (t, tMov) => {
    const mesh = ref.current;
    if (!mesh) return;
    const E = cicloAguacero(t, DUR);
    const { m, q, s, p } = tmp;
    for (let i = 0; i < n; i++) {
      const g = semillas[i];
      let f = g.t0 + tMov * (0.14 + E.caudalVivo * 0.2);
      f -= Math.floor(f);
      curva.getPoint(f, p);
      /* el chorro engorda con la carga, y se afina —sin apagarse— en verano */
      s.setScalar(g.tam * (0.035 + E.caudalVivo * 0.055));
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    escribir(faseDe({ elapsedTime: 0 }, faseFija, reducedMotion), reducedMotion ? 0.3 : 0);
  });
  useFrame((st) => {
    const tMov = reducedMotion ? 0.3 : st.clock.elapsedTime;
    escribir(faseDe(st.clock, faseFija, reducedMotion), tMov);
  });
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} frustumCulled={false} />;
}

/**
 * LA BOCA SECA de enfrente. Mismo barranco, misma cota, mismo derecho al agua
 * — y nada. Solo la mancha de humedad vieja de cuando este nacimiento existía.
 * No se anima: no tiene qué. Ese silencio es el punto.
 */
function BocaSeca() {
  const x = BOCA_SECA.x;
  const y = alturaValle(x, BOCA_SECA.z) - 0.1;
  return (
    <group position={[x - 0.05, y, BOCA_SECA.z]}>
      {/* el hueco */}
      <mesh scale={[0.09, 0.055, 0.07]}>
        <sphereGeometry args={[1, 7, 6]} />
        <meshLambertMaterial color={PAL.poroSeco} />
      </mesh>
      {/* la mancha de lo que hubo: tierra teñida, sin brillo, sin agua */}
      <mesh position={[0.12, -0.09, 0.02]} rotation={[-0.9, 0, 0.25]} scale={[0.1, 0.22, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshLambertMaterial
          color={PAL.barro.clone().multiplyScalar(0.75)}
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/** Las cárcavas: la zanja abierta, y encima la película de agua sucia. */
function Carcavas({ curvas, faseFija, reducedMotion }) {
  const geo = useMemo(() => geometriaCarcavas(curvas), [curvas]);
  const abanico = useMemo(() => geometriaAbanico(curvas), [curvas]);
  const matTierra = useMemo(
    () => new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
    [],
  );
  const matAgua = useMemo(
    () => new THREE.MeshLambertMaterial({
      color: PAL.turbia,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    [],
  );
  useLayoutEffect(() => () => {
    geo.dispose(); abanico.dispose(); matTierra.dispose(); matAgua.dispose();
  }, [geo, abanico, matTierra, matAgua]);

  const pintar = (t) => {
    const E = cicloAguacero(t, DUR);
    matAgua.opacity = clamp01(E.escorrenMuerta) * 0.85;
  };
  useLayoutEffect(() => { pintar(faseDe({ elapsedTime: 0 }, faseFija, reducedMotion)); });
  useFrame((st) => pintar(faseDe(st.clock, faseFija, reducedMotion)));

  return (
    <group>
      <mesh geometry={geo} material={matTierra} frustumCulled={false} />
      {/* el abanico QUEDA: no se borra al escampar. El suelo que bajó ahí se
          quedó, y por eso cada año la loma tiene menos. */}
      <mesh geometry={abanico} material={matTierra} frustumCulled={false} />
      <mesh geometry={geo} material={matAgua} position={[0, 0.022, 0]} frustumCulled={false} />
    </group>
  );
}

/**
 * EL SUELO, YÉNDOSE. Cada fleco es tierra de la loma corriendo cárcava abajo.
 * No son gotas: son SUELO — por eso son del color del subsuelo y no del agua.
 * "Siento que se me está yendo la tierra buena con cada aguacero" (corpus): es
 * esto, y se ve.
 */
function FlecosSuelo({ curvas, P, faseFija, reducedMotion }) {
  const ref = useRef(null);
  const lista = useMemo(() => flecosEscorrentia(curvas, P), [curvas, P]);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 5, 4), []);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ color: PAL.subsuelo }), []);
  const tmp = useMemo(tmpMat, []);

  const escribir = (t, tMov) => {
    const mesh = ref.current;
    if (!mesh) return;
    const E = cicloAguacero(t, DUR);
    const { m, q, s, p } = tmp;
    const vivo = clamp01(E.escorrenMuerta * 1.2);
    for (let i = 0; i < lista.length; i++) {
      const o = lista[i];
      const cur = curvas[o.via];
      if (!cur) continue;
      let f = o.t0 + tMov * o.vel * (0.25 + E.escorrenMuerta);
      f -= Math.floor(f);
      cur.getPoint(f, p);
      p.z += o.lado * (0.3 + f);
      p.y += 0.03;
      /* si no escurre, no hay flecos: el tamaño ES el caudal */
      s.setScalar(o.tam * vivo * (0.5 + f * 0.8));
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    escribir(faseDe({ elapsedTime: 0 }, faseFija, reducedMotion), reducedMotion ? 0.4 : 0);
  });
  useFrame((st) => {
    const tMov = reducedMotion ? 0.4 : st.clock.elapsedTime;
    escribir(faseDe(st.clock, faseFija, reducedMotion), tMov);
  });
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!lista.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, lista.length]} frustumCulled={false} />;
}

/** El agua empozada en la zanja de infiltración: la que NO se fue. */
function AguaZanja({ curva, faseFija, reducedMotion }) {
  const geo = useMemo(() => new THREE.TubeGeometry(curva, 30, 0.055, 6, false), [curva]);
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({
      color: PAL.clara,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    [],
  );
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  const pintar = (t) => {
    const E = cicloAguacero(t, DUR);
    /* se llena con el aguacero y se VACÍA despacio: no porque se evapore, sino
       porque se está metiendo. Una zanja que se seca rápido está trabajando. */
    mat.opacity = clamp01(E.lluvia * 0.7 + E.cargaViva * 0.5) * 0.8;
  };
  useLayoutEffect(() => { pintar(faseDe({ elapsedTime: 0 }, faseFija, reducedMotion)); });
  useFrame((st) => pintar(faseDe(st.clock, faseFija, reducedMotion)));
  return <mesh geometry={geo} material={mat} position={[0, 0.028, 0]} frustumCulled={false} />;
}

/* ================================================================== */
/* EL CIELO: lluvia, vapor, niebla, condensación                       */
/* ================================================================== */

/** La lluvia. La MISMA para las dos laderas: ahí empieza todo. */
function Lluvia({ P, faseFija, reducedMotion }) {
  const ref = useRef(null);
  const lista = useMemo(() => gotasLluvia(P), [P]);
  const geo = useMemo(() => new THREE.CylinderGeometry(0.011, 0.004, 1, 4), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: PAL.lluvia,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
    [],
  );
  const tmp = useMemo(tmpMat, []);
  const CIELO = 5.0;

  const escribir = (t, tMov) => {
    const mesh = ref.current;
    if (!mesh) return;
    const E = cicloAguacero(t, DUR);
    const { m, q, s, p } = tmp;
    const fuerza = clamp01(E.lluvia * 1.15);
    for (let i = 0; i < lista.length; i++) {
      const g = lista[i];
      const caida = CIELO - g.suelo;
      let f = g.fase + (tMov * g.vel) / caida;
      f -= Math.floor(f);
      p.set(g.x, CIELO - f * caida, g.z);
      s.set(fuerza, g.largo * fuerza, fuerza);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    escribir(faseDe({ elapsedTime: 0 }, faseFija, reducedMotion), reducedMotion ? 0.5 : 0);
  });
  useFrame((st) => {
    const tMov = reducedMotion ? 0.5 : st.clock.elapsedTime;
    escribir(faseDe(st.clock, faseFija, reducedMotion), tMov);
  });
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  return <instancedMesh ref={ref} args={[geo, mat, lista.length]} frustumCulled={false} />;
}

/**
 * EL VAPOR — la evapotranspiración que cierra el anillo: el agua vuelve a la
 * nube. Sube del cultivo y de la quebrada, y sube MÁS al sol pico (`calina`).
 *
 * Ahí va, de una, la lección de la hora: "¿es verdad que no se debe regar al sol
 * de la una de la tarde?" (corpus). A mediodía este vapor se dispara — si usted
 * riega a esa hora, le está regando al aire, no a la mata.
 */
function Vapor({ P, calina, faseFija, reducedMotion }) {
  const ref = useRef(null);
  const lista = useMemo(() => motasVapor(P), [P]);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 5, 4), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: PAL.vapor,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    [],
  );
  const tmp = useMemo(tmpMat, []);

  const escribir = (t, tMov) => {
    const mesh = ref.current;
    if (!mesh) return;
    const E = cicloAguacero(t, DUR);
    const { m, q, s, p } = tmp;
    const fuerza = clamp01(E.vapor * (0.45 + calina * 0.95));
    for (let i = 0; i < lista.length; i++) {
      const o = lista[i];
      let f = o.fase + (tMov * o.vel) / o.alto;
      f -= Math.floor(f);
      p.set(
        o.x + Math.sin(f * 5 + o.fase * 9) * 0.16 * f,
        o.y0 + f * o.alto,
        o.z + Math.cos(f * 4 + o.fase * 7) * 0.12 * f,
      );
      /* nace gordo y se deshace al subir: se disolvió en el aire */
      s.setScalar(o.tam * fuerza * (1 - f) * (0.4 + f * 1.6));
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    escribir(faseDe({ elapsedTime: 0 }, faseFija, reducedMotion), reducedMotion ? 0.5 : 0);
  });
  useFrame((st) => {
    const tMov = reducedMotion ? 0.5 : st.clock.elapsedTime;
    escribir(faseDe(st.clock, faseFija, reducedMotion), tMov);
  });
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!lista.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, lista.length]} frustumCulled={false} />;
}

/**
 * LA NIEBLA DEL PÁRAMO enredándose en el frailejonal. No es decoración: es
 * MATERIA PRIMA. Lo que las rosetas le quitan a esta niebla es agua que nunca
 * cayó como lluvia y que igual termina en la quebrada. "¿Es cierto que de los
 * páramos sale el agua que toman las ciudades grandes?" (corpus). De aquí sale.
 */
function NieblaParamo({ P, reducedMotion }) {
  const ref = useRef(null);
  const lista = useMemo(() => motasNiebla(P), [P]);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 6, 5), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: PAL.vapor,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
    [],
  );
  const tmp = useMemo(tmpMat, []);
  const escribir = (tMov) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { m, q, s, p } = tmp;
    for (let i = 0; i < lista.length; i++) {
      const o = lista[i];
      p.set(
        o.x + Math.sin(tMov * o.vel + o.fase) * 0.5,
        o.y + Math.sin(tMov * o.vel * 0.6 + o.fase) * 0.08,
        o.z + Math.cos(tMov * o.vel * 0.8 + o.fase) * 0.35,
      );
      s.setScalar(o.tam);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => escribir(reducedMotion ? 1.2 : 0));
  useFrame((st) => { if (!reducedMotion) escribir(st.clock.elapsedTime); });
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!lista.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, lista.length]} frustumCulled={false} />;
}

/**
 * LA CONDENSACIÓN en las rosetas: la niebla se vuelve gota, la gota engorda y
 * cae al pie del frailejón, y la turbera la guarda. Agua que nadie vio llover.
 */
function Condensacion({ P, lista, reducedMotion }) {
  const ref = useRef(null);
  const gotas = useMemo(() => {
    if (!P.condensa || !lista.length) return [];
    const out = [];
    for (let i = 0; i < P.condensa; i++) {
      const f = lista[i % lista.length];
      const ang = (i * 2.399) % (Math.PI * 2);
      out.push({
        x: f.pos[0] + Math.cos(ang) * f.alto * 0.28,
        z: f.pos[2] + Math.sin(ang) * f.alto * 0.28,
        yTope: f.pos[1] + f.alto * 1.12,
        yPie: f.pos[1] + 0.02,
        fase: (i * 0.137) % 1,
      });
    }
    return out;
  }, [P, lista]);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 5, 4), []);
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: PAL.espuma, transparent: true, opacity: 0.9 }),
    [],
  );
  const tmp = useMemo(tmpMat, []);
  const escribir = (tMov) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { m, q, s, p } = tmp;
    for (let i = 0; i < gotas.length; i++) {
      const o = gotas[i];
      let f = o.fase + tMov * 0.16;
      f -= Math.floor(f);
      /* dos tiempos: 70% engordando en la punta de la hoja, 30% cayendo */
      if (f < 0.7) {
        p.set(o.x, o.yTope, o.z);
        s.setScalar(0.012 + (f / 0.7) * 0.026);
      } else {
        const c = (f - 0.7) / 0.3;
        p.set(o.x, o.yTope + (o.yPie - o.yTope) * c * c, o.z);
        s.setScalar(0.03 * (1 - c * 0.4));
      }
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => escribir(reducedMotion ? 2.6 : 0));
  useFrame((st) => { if (!reducedMotion) escribir(st.clock.elapsedTime); });
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!gotas.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, gotas.length]} frustumCulled={false} />;
}

/**
 * LAS GOTAS DEL GOTEO: caen del gotero al pie de la mata, quince centímetros.
 * Por eso llegan — a cualquier hora. Enfrente, el aspersor tira el agua al aire
 * y a mediodía la mitad no aterriza. Esa es toda la diferencia entre los dos
 * riegos, y se ve sin leer una cifra.
 */
function Goteo({ matas, reducedMotion }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 5, 4), []);
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: PAL.clara, transparent: true, opacity: 0.92 }),
    [],
  );
  const tmp = useMemo(tmpMat, []);
  const escribir = (tMov) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { m, q, s, p } = tmp;
    for (let i = 0; i < matas.length; i++) {
      const o = matas[i];
      let f = o.fase + tMov * 0.5;
      f -= Math.floor(f);
      p.set(o.x, o.y + 0.14 - f * 0.14, o.z);
      s.setScalar(0.022 * (f < 0.9 ? 1 : (1 - f) * 10)); // se aplasta al llegar
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => escribir(reducedMotion ? 0.45 : 0));
  useFrame((st) => { if (!reducedMotion) escribir(st.clock.elapsedTime); });
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!matas.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, matas.length]} frustumCulled={false} />;
}

/**
 * EL ASPERSOR del potrero: el agua sale en abanico y vuela un metro por el aire.
 * A `calina` alta (mediodía) las gotas se ADELGAZAN y desaparecen antes de
 * tocar el suelo — literalmente regando la atmósfera. Al amanecer, las mismas
 * gotas llegan enteras. "¿Es mejor regar en la mañana o en la tarde?" (corpus):
 * mire el aspersor a las 6 y mírelo a la una.
 */
function Aspersor({ calina, reducedMotion }) {
  const ref = useRef(null);
  const n = 26;
  const base = useMemo(() => {
    const x = 3.1;
    const z = 1.05;
    return { x, y: alturaValle(x, z) + 0.16, z };
  }, []);
  const chorros = useMemo(
    () => Array.from({ length: n }, (_, i) => ({
      ang: (i / n) * Math.PI * 2,
      fase: (i * 0.173) % 1,
      alcance: 0.55 + ((i * 29) % 10) / 22,
    })),
    [],
  );
  const geo = useMemo(() => new THREE.SphereGeometry(1, 4, 3), []);
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: PAL.clara, transparent: true, opacity: 0.85 }),
    [],
  );
  const tmp = useMemo(tmpMat, []);
  const escribir = (tMov) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { m, q, s, p } = tmp;
    /* al sol pico la gota se evapora en vuelo: muere a mitad de camino */
    const vida = 1 - calina * 0.55;
    for (let i = 0; i < n; i++) {
      const c = chorros[i];
      let f = c.fase + tMov * 0.55;
      f -= Math.floor(f);
      const d = f * c.alcance;
      p.set(
        base.x + Math.cos(c.ang) * d,
        base.y + Math.sin(f * Math.PI) * 0.3 - f * f * 0.18,
        base.z + Math.sin(c.ang) * d,
      );
      const viva = f < vida ? 1 - f / Math.max(vida, 0.01) : 0;
      s.setScalar(0.022 * viva);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => escribir(reducedMotion ? 0.4 : 0));
  useFrame((st) => { if (!reducedMotion) escribir(st.clock.elapsedTime); });
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  return (
    <group>
      <mesh position={[base.x, base.y - 0.08, base.z]}>
        <cylinderGeometry args={[0.012, 0.016, 0.16, 5]} />
        <meshLambertMaterial color={PAL.zinc} />
      </mesh>
      <instancedMesh ref={ref} args={[geo, mat, n]} frustumCulled={false} />
    </group>
  );
}

/* ================================================================== */
/* EL MUNDO                                                            */
/* ================================================================== */

function MundoAgua({ tier, reducedMotion, preset, faseFija }) {
  const P = useMemo(() => paramsDeTier(tier), [tier]);

  const d = useMemo(() => ({
    contornos: surcosContorno(P),
    carcavas: carcavas(P),
    zanja: zanjaInfiltracion(),
    frailejones: frailejones(P),
    briznas: briznas(P),
    matorral: matorral(P),
    hoyos: hoyosPata(P),
    cerca: cercaRonda(),
    casa: sitioCasa(),
    nube: nube(P),
    matas: matasRiego(),
  }), [P]);

  /* El tanque se llena con el aguacero y se gasta despacio: memoria, no adorno.
     Se lee del mismo ciclo que todo lo demás — la finca es UN sistema. Va por
     ref (no setState): mover un cilindro no puede costar un re-render. */
  const nivelRef = useRef(0.45);
  useFrame((st) => {
    const E = cicloAguacero(faseDe(st.clock, faseFija, reducedMotion), DUR);
    nivelRef.current = 0.18 + 0.72 * clamp01(E.cargaViva * 0.7 + E.lluvia * 0.5);
  });

  return (
    <>
      {/* Todo el mundo vive encogido (ver ESCALA): la niebla de la casa manda. */}
      <group scale={ESCALA}>
      {/* — el bloque — */}
      <Terreno P={P} pasto={preset.pasto} />
      <Corte P={P} />
      <Flancos P={P} />

      {/* — el agua que no se ve — */}
      <Freatico P={P} faseFija={faseFija} reducedMotion={reducedMotion} />
      <Poros P={P} faseFija={faseFija} reducedMotion={reducedMotion} />

      {/* — la mano, para bien — */}
      <SurcosContorno curvas={d.contornos} />
      <Zanja curva={d.zanja} />
      <AguaZanja curva={d.zanja} faseFija={faseFija} reducedMotion={reducedMotion} />
      <CasaTanque sitio={d.casa} nivelRef={nivelRef} />
      <CercaRonda postes={d.cerca} />
      <LineaGoteo matas={d.matas} />
      <Goteo matas={d.matas} reducedMotion={reducedMotion} />

      {/* — la mano, para mal — */}
      <Carcavas curvas={d.carcavas} faseFija={faseFija} reducedMotion={reducedMotion} />
      <FlecosSuelo curvas={d.carcavas} P={P} faseFija={faseFija} reducedMotion={reducedMotion} />
      {P.hoyos > 0 && <Hoyos lista={d.hoyos} />}
      <Aspersor calina={preset.calina} reducedMotion={reducedMotion} />

      {/* — lo vivo — */}
      <Briznas lista={d.briznas} />
      <Matorral lista={d.matorral} />
      <Frailejonal lista={d.frailejones} />

      {/* — el agua que sí se ve — */}
      <Quebrada P={P} faseFija={faseFija} reducedMotion={reducedMotion} />
      <Nacimiento faseFija={faseFija} reducedMotion={reducedMotion} />
      <BocaSeca />

      {/* — el cielo, y el anillo que cierra — */}
      <Nube lista={d.nube} carga={preset.cargado ?? 1} />
      <Lluvia P={P} faseFija={faseFija} reducedMotion={reducedMotion} />
      <Vapor P={P} calina={preset.calina} faseFija={faseFija} reducedMotion={reducedMotion} />
      <NieblaParamo P={P} reducedMotion={reducedMotion} />
      <Condensacion P={P} lista={d.frailejones} reducedMotion={reducedMotion} />
      </group>

      {/* Los controles viven FUERA del grupo encogido: su `target` es mundo. */}
      <OrbitControls
        makeDefault
        target={[VALLE.ejeX * ESCALA, 0.32, 0]}
        enablePan={false}
        enableZoom
        minDistance={3.2}
        maxDistance={9.6}
        minPolarAngle={0.55}
        maxPolarAngle={1.5}
        enableDamping
        dampingFactor={0.08}
        autoRotate={false}
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El ciclo del agua en la finca. Montar SOLO perezosa dentro de un host con
 * altura. Acepta el contrato del framework de mundos (props extra ignoradas).
 *
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier]
 * @param {boolean} [props.reducedMotion]
 * @param {number|null} [props.hora]  hora decimal fija (QA/foto); null = reloj real
 * @param {'lluvia'|'seca'|'auto'} [props.temporada]
 * @param {number|null} [props.fase]  fase FIJA del aguacero 0..1 (null = corre sola)
 */
export default function EscenaCicloAgua({
  tier: tierProp,
  reducedMotion: rmProp,
  hora = null,
  temporada = 'auto',
  fase = null,
}) {
  const [auto] = useState(() => decidirTier());
  const tier = tierProp ?? auto.tier;
  const reducedMotion = rmProp ?? auto.reducedMotion;
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);

  /* El MISMO momento que verá <AtmosferaViva/>, leído aquí para vestir el mundo
     (el pasto de la temporada, la calina del mediodía). Es el contrato de
     consumo que documenta el módulo atmosfera/ — no se duplica su reloj. */
  const { preset } = useAtmosferaViva({ hora, temporada, reducedMotion });

  return (
    <>
      <style>{CSS}</style>
      <Canvas
        className={`agua-canvas${listo ? ' agua-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [0.45, 1.35, 6.25], fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <AtmosferaViva hora={hora} temporada={temporada} tier={tier} reducedMotion={reducedMotion} />
        <MundoAgua tier={tier} reducedMotion={reducedMotion} preset={preset} faseFija={fase} />
      </Canvas>
    </>
  );
}
