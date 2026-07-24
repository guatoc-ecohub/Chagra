/*
 * MundoAbejas3D: diorama standalone sobre polinizacion, miel y conservacion.
 *
 * El mundo se llama «Polinización que da fruto» y hasta ahora la polinización
 * NO ocurría en pantalla: las Angelitas orbitaban anclas fijas en el aire, las
 * flores estaban congeladas y el panal era un cartel clavado en el pasto. Esta
 * pasada pone el GESTO que el título promete:
 *
 *   · CICLO DE FORRAJEO — cada Angelita vuela a una flor, SE POSA, liba un
 *     momento, y sigue a la siguiente; al cerrar la ronda ENTRA a la piquera de
 *     su vivienda y sale cargada. Máquina de estados en refs (cero re-render).
 *   · EL RASTRO DE POLEN — en vuelo va soltando motas ámbar que suben y se
 *     apagan: la sarta dibuja el RECORRIDO flor→flor. Así la polinización se lee
 *     como PROCESO (y no como abejas quietas) hasta con la escena detenida.
 *   · LA FLOR RESPONDE — se estremece cuando la visitan, la corola se abre un
 *     punto y suelta un puff de polen que sube y se disuelve. Las visitas
 *     viajan por un Float32Array compartido: la abeja escribe, la flor lee.
 *   · GUARDIANAS EN LA PIQUERA — dos angelitas suspendidas en la boca del tubo
 *     de cerumen, tanteando: el comportamiento real de Tetragonisca angustula
 *     (las «soldado» que vigilan la entrada) y, de paso, la piquera nunca queda
 *     muerta en cámara.
 *   · LAS DOS VIVIENDAS ABIERTAS Y ROTULADAS — la Langstroth con sus panales
 *     de cera en cuadros; la caja melipona con sus potes de cerumen. Ponerlas
 *     juntas sin decir en qué se diferencian desperdiciaba la razón de ponerlas
 *     juntas.
 *   · EL APICULTOR rubber-hose (velo, ahumador y cuadro en la mano), del mismo
 *     mundo que las Angelitas — antes era un maniquí de palos de otro juego.
 *   · EL CUADRO COMPUESTO — prado con relieve, lomas, monte y nubes: el disco
 *     de pasto ya no flota sobre medio degradado vacío.
 *
 * Las abejas son la AbejaAngelita rubber-hose de la casa (src/visual/creatures/)
 * montada como billboards <Html>, el MISMO patrón de los vecinos del Bosque
 * Vivo. Colores derivados de la paleta madre; luz de la hora dorada del kit.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, Html, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { AbejaAngelita } from '../visual/creatures/index.js';
import { ATMOSFERA, PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';
import { ACENTOS, CORTEZAS, NEUTROS, TIERRAS, VERDES } from '../visual/mundo3d/paleta/paletaMadre.js';

const DORADA = CIELOS_HORA.dorada;

/* La paleta del mundo: verdes por piso térmico y tierras de la paleta madre,
   entintados apenas hacia la luz dorada. Ni un hex suelto que no salga de
   aquí (los ámbar de cera y miel son los únicos acentos propios del tema). */
const C = {
  pasto: mezclar(VERDES.trabajo, DORADA.luz, 0.18),
  pastoSol: mezclar(VERDES.brote, DORADA.luz, 0.24),
  loma: mezclar(VERDES.templado, DORADA.niebla, 0.28),
  lomaLejos: mezclar(VERDES.frio, DORADA.niebla, 0.46),
  monte: mezclar(VERDES.monte, DORADA.niebla, 0.18),
  monteClaro: mezclar(VERDES.aliso, DORADA.niebla, 0.24),
  tierra: mezclar(TIERRAS.siembra, DORADA.luz, 0.14),
  tierraClara: mezclar(TIERRAS.camino, DORADA.luz, 0.16),
  madera: PALETA.madera || '#895a31',
  maderaClara: mezclar(PALETA.madera || '#895a31', '#f1c56b', 0.42),
  maderaVieja: mezclar(CORTEZAS.roble, DORADA.luz, 0.12),
  hoja: VERDES.trabajo,
  hojaOscura: VERDES.monte,
  miel: '#f3a91d',
  cera: '#f4cf62',
  ceraVieja: mezclar('#f4cf62', CORTEZAS.encenillo, 0.22),
  /* cerumen = cera + propóleo: el pardo ámbar de los potes de la melipona,
     que NO es la cera clara del panal de la Langstroth (esa es la lección). */
  cerumen: mezclar(CORTEZAS.encenillo, '#f3a91d', 0.42),
  cerumenClaro: mezclar(CORTEZAS.encenillo, '#f3a91d', 0.62),
  cal: NEUTROS.cal,
  hueso: NEUTROS.hueso,
  tinta: NEUTROS.tinta,
  guayacan: ACENTOS.guayacan,
  florMonte: ACENTOS.florDeMonte,
  nube: '#fdf6e6',
};

/* ═══════════════════ LA GEOGRAFÍA ═══════════════════
   Un claro de finca: explanada plana donde vive el colmenar (para que las
   colmenas no bailen sobre el relieve) y lomas que suben al fondo. Antes el
   mundo era un disco de pasto suspendido en degradado. */
const ANCHO = 32;
const FONDO = 28;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function gauss(x, z, cx, cz, sx, sz) {
  const dx = x - cx, dz = z - cz;
  return Math.exp(-((dx * dx) / (2 * sx * sx) + (dz * dz) / (2 * sz * sz)));
}
/* Ruido determinista (hash de senos): el mismo claro siempre, sin Math.random. */
function ruido(x, z) {
  return (
    Math.sin(x * 0.8 + z * 0.6) * 0.5 +
    Math.sin(x * 1.9 - z * 1.4 + 2.3) * 0.3 +
    Math.sin(x * 3.1 + z * 2.7 + 5.1) * 0.2
  );
}
function alturaPrado(x, z) {
  let h = ruido(x * 0.42, z * 0.42) * 0.17;
  h += gauss(x, z, -10, -9.5, 5.6, 4.0) * 2.1; // loma occidental
  h += gauss(x, z, 10.5, -10.5, 6.2, 4.4) * 2.5; // loma oriental
  h += gauss(x, z, 0.5, -13.5, 8.4, 3.6) * 2.0; // el fondo que cierra el cuadro
  h += gauss(x, z, -12, 6, 5.0, 5.0) * 0.9; // la falda que sube por la izquierda
  /* la faena aplana: el colmenar y el surco de flores viven en y = 0 */
  const plano = clamp(gauss(x, z, 0, 0.8, 5.6, 5.0) * 1.3, 0, 1);
  return h * (1 - plano);
}

/* Malla del prado con color por vértice: pasto con motas al sol, el surco de
   tierra removida bajo las flores y las lomas del fondo lavadas por la
   distancia (así el horizonte se despega del cielo sin niebla extra). */
function construirPrado(seg, plano) {
  const nx = seg + 1, nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cPasto = new THREE.Color(C.pasto);
  const cSol = new THREE.Color(C.pastoSol);
  const cTierra = new THREE.Color(C.tierra);
  const cLoma = new THREE.Color(C.loma);
  const cLejos = new THREE.Color(C.lomaLejos);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const z = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const x = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaPrado(x, z);
      pos[p] = x; pos[p + 1] = y; pos[p + 2] = z;
      c.lerpColors(cPasto, cSol, smoothstep(-0.35, 1.0, ruido(x + 3, z - 2)));
      /* el surco: dos manchas de tierra removida bajo las dos hileras de flores */
      const surco = Math.max(gauss(x, z, 0, 3.55, 4.4, 0.72), gauss(x, z, -0.5, 2.45, 3.2, 0.6));
      c.lerp(cTierra, clamp(surco * 0.95, 0, 0.85));
      /* la altura y la distancia apagan el verde: las lomas al fondo */
      c.lerp(cLoma, clamp(y * 0.34, 0, 0.6));
      c.lerp(cLejos, smoothstep(-6, -13, z) * 0.55);
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iz = 0; iz < seg; iz++) {
    for (let ix = 0; ix < seg; ix++) {
      const a = iz * nx + ix, b = a + 1, d = a + nx, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  /* toNonIndexed antes de nada más: mezclar indexadas con no indexadas es el
     bug silencioso que ya mordió dos veces en este repo. */
  if (plano) geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  return geo;
}

function Prado({ perfil }) {
  const geo = useMemo(
    () => construirPrado(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} receiveShadow={false}>
      <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
    </mesh>
  );
}

/* El monte del fondo: árboles de copa REDONDA (monte andino, no pinar de
   postal: los conos verde oscuro son justo el error de fidelidad que ya se
   señaló en el mundo vecino), con dos guayacanes floridos de acento. Nada de
   detalle: son silueta y color a contraluz de la loma. */
const ARBOLES = [
  [-9.5, -9.0, 1.35, 0], [-7.6, -10.6, 1.05, 1], [-11.4, -7.4, 1.2, 1],
  [-5.2, -11.8, 0.9, 0], [-2.4, -12.6, 1.25, 1], [0.8, -13.2, 1.0, 0],
  [3.9, -12.4, 1.35, 1], [7.0, -11.2, 1.05, 0], [9.8, -10.0, 1.45, 1],
  [12.0, -8.2, 1.1, 0], [-13.0, -4.6, 1.05, 1], [11.6, -5.2, 0.85, 0],
  [-8.4, -12.8, 0.8, 2], [6.0, -13.4, 0.95, 2],
];
function Monte() {
  return (
    <group>
      {ARBOLES.map(([x, z, esc, tipo], i) => {
        const y = alturaPrado(x, z);
        const copa = tipo === 2 ? C.guayacan : tipo === 1 ? C.monte : C.monteClaro;
        const claro = mezclar(copa, DORADA.luz, 0.16);
        return (
          <group key={i} position={[x, y, z]} scale={esc} rotation={[0, i * 0.9, 0]}>
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.1, 0.16, 1.05, 5]} />
              <meshLambertMaterial color={C.maderaVieja} flatShading />
            </mesh>
            {/* la copa: tres masas redondas encimadas, como el monte de verdad */}
            <mesh position={[0, 1.5, 0]} scale={[1.1, 0.95, 1.05]}>
              <dodecahedronGeometry args={[0.72]} />
              <meshLambertMaterial color={copa} flatShading />
            </mesh>
            <mesh position={[0.4, 1.16, 0.16]} scale={[1, 0.9, 1]}>
              <dodecahedronGeometry args={[0.48]} />
              <meshLambertMaterial color={claro} flatShading />
            </mesh>
            <mesh position={[-0.36, 1.22, -0.14]} scale={[1, 0.88, 1]}>
              <dodecahedronGeometry args={[0.44]} />
              <meshLambertMaterial color={mezclar(copa, C.monte, 0.4)} flatShading />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* Macollas de pasto alto en el borde del claro: rompen el verde liso del
   primer plano sin robarle protagonismo al surco. */
const MACOLLAS = [
  [-4.4, 5.0], [-2.6, 5.8], [0.4, 6.0], [2.8, 5.7], [4.6, 4.9],
  [-5.4, 1.8], [5.5, 2.2], [-4.9, -1.6], [5.1, -2.4],
];
function Macollas() {
  return (
    <group>
      {MACOLLAS.map(([x, z], i) => (
        <group key={i} position={[x, alturaPrado(x, z), z]} rotation={[0, i * 1.1, 0]}>
          {[0, 1, 2, 3, 4].map((j) => {
            const a = j * 1.257 + i;
            return (
              <mesh
                key={j}
                position={[Math.cos(a) * 0.11, 0.2, Math.sin(a) * 0.11]}
                rotation={[Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3]}
              >
                <coneGeometry args={[0.045, 0.44 + (j % 3) * 0.09, 4]} />
                <meshLambertMaterial color={j % 2 ? C.hoja : C.pastoSol} flatShading />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

/* Arbustos y macollas de pasto alto que cosen el claro con la ladera: sin
   ellos la explanada se corta en seco contra la loma. */
const ARBUSTOS = [
  [-6.4, -3.2, 0.9], [-7.2, 0.4, 0.75], [6.6, -3.8, 0.95], [7.4, 0.8, 0.8],
  [-5.2, 5.6, 0.7], [5.6, 5.4, 0.8], [-8.2, 3.4, 0.85], [8.0, 3.0, 0.7],
];
function Arbustos() {
  return (
    <group>
      {ARBUSTOS.map(([x, z, esc], i) => {
        const y = alturaPrado(x, z);
        return (
          <group key={i} position={[x, y, z]} scale={esc}>
            {[[0, 0.28, 0, 0.42], [0.3, 0.2, 0.12, 0.3], [-0.26, 0.22, -0.1, 0.33]].map((b, j) => (
              <mesh key={j} position={[b[0], b[1], b[2]]} scale={[1, 0.8, 1]}>
                <dodecahedronGeometry args={[b[3]]} />
                <meshLambertMaterial color={j % 2 ? C.hojaOscura : C.hoja} flatShading />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/* Nubes del atardecer dorado: esferas aplanadas, quietas, muy lejos. Llenan la
   banda de arriba que antes era degradado plano. */
const NUBES = [[-12, 5.4, -23, 2.4], [4.5, 6.2, -25, 2.0], [13, 4.8, -22, 2.2], [-5.5, 6.8, -21, 1.6]];
function Nubes() {
  return (
    <group>
      {NUBES.map((n, i) => (
        <mesh key={i} position={[n[0], n[1], n[2]]} scale={[n[3], n[3] * 0.3, n[3] * 0.62]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color={C.nube} transparent opacity={0.82} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════════ EL SURCO DE FLORES ═══════════════════
   Dos hileras cortas y apretadas (el mundo cabe en pantalla angosta). Cada
   flor con su especie de color, su escala y su fase de brisa. */
const FLORES = [
  { p: [-2.8, 0, 3.7], color: C.guayacan, esc: 1.0, fase: 0.0 },
  { p: [-1.9, 0, 3.5], color: C.hueso, esc: 0.88, fase: 1.1 },
  { p: [-0.98, 0, 3.72], color: C.florMonte, esc: 1.05, fase: 2.3 },
  { p: [-0.04, 0, 3.46], color: C.guayacan, esc: 0.92, fase: 3.4 },
  { p: [0.89, 0, 3.68], color: C.hueso, esc: 1.0, fase: 4.5 },
  { p: [1.83, 0, 3.44], color: C.florMonte, esc: 0.9, fase: 5.6 },
  { p: [2.76, 0, 3.64], color: C.guayacan, esc: 1.08, fase: 0.7 },
  { p: [-2.34, 0, 2.42], color: C.florMonte, esc: 0.95, fase: 1.9 },
  { p: [-1.36, 0, 2.28], color: C.guayacan, esc: 0.86, fase: 3.0 },
  { p: [-0.38, 0, 2.48], color: C.hueso, esc: 1.02, fase: 4.1 },
  { p: [0.64, 0, 2.24], color: C.florMonte, esc: 0.9, fase: 5.2 },
  { p: [1.66, 0, 2.44], color: C.guayacan, esc: 0.98, fase: 6.0 },
  /* la hilera de adelante, a un palmo de la cámara: da primer plano al cuadro
     y deja ver a la angelita posada en grande */
  { p: [-2.65, 0, 4.9], color: C.guayacan, esc: 1.12, fase: 2.6 },
  { p: [-0.3, 0, 5.35], color: C.florMonte, esc: 1.18, fase: 4.8 },
  { p: [1.1, 0, 5.0], color: C.hueso, esc: 1.1, fase: 0.4 },
  { p: [2.3, 0, 4.75], color: C.guayacan, esc: 1.05, fase: 3.7 },
];
/* Dónde se para la abeja: en el centro de la corola, no en el aire de al lado. */
const puntoDeFlor = (f) => new THREE.Vector3(f.p[0], f.p[1] + 0.62 * f.esc + 0.06, f.p[2]);

/* EL PUENTE ABEJA → FLOR. La abeja posada escribe 1 en la casilla de su flor y
   la flor lo lee y lo va soltando: así la visita se ve (estremecimiento, corola
   abierta, puff de polen) sin un solo re-render de React por cuadro. Vive en el
   módulo a propósito — es un canal de animación entre hermanos, no estado de
   interfaz; el mundo se monta uno a la vez y el canal se limpia al montar. */
const VISITAS = new Float32Array(FLORES.length);

/* ═══════════════════ EL RASTRO DE POLEN ═══════════════════
   La lección que un cuadro FIJO no contaba: la abeja no solo se posa — LLEVA el
   polen de una flor a la siguiente. Ahí está la polinización, y en una captura
   congelada no se veía (parecían abejas quietas encima de las flores). Cada
   forrajera en vuelo va soltando motas ámbar que suben y se desvanecen: la sarta
   dibuja el RECORRIDO flor→flor, así el PROCESO se lee hasta con la escena
   detenida. Mismo canal entre hermanos que VISITAS: la abeja escribe una mota en
   un anillo de módulo, el rastro la lee y la apaga. Cero re-render por cuadro. */
const RASTRO_MAX = 66;
const rastroPos = new Float32Array(RASTRO_MAX * 3);
const rastroVida = new Float32Array(RASTRO_MAX); // 0 = mota apagada
let rastroCursor = 0;
function emitirPolen(x, y, z) {
  const i = rastroCursor;
  rastroPos[i * 3] = x; rastroPos[i * 3 + 1] = y; rastroPos[i * 3 + 2] = z;
  rastroVida[i] = 1;
  rastroCursor = (rastroCursor + 1) % RASTRO_MAX;
}
function limpiarRastro() { rastroVida.fill(0); }

/* UNA flor: tallo con dos hojas y corola de pétalos ahuecados. Se mece con su
   brisa propia y REACCIONA a la visita — se estremece, la corola se abre un
   punto y suelta el puff de polen. `visitas[i]` lo escribe la abeja posada. */
function Flor({ indice, datos, reducedMotion, motas }) {
  const tallo = useRef(/** @type {any} */ (null));
  const corola = useRef(/** @type {any} */ (null));
  const polen = useRef(/** @type {any} */ (null));
  const petalos = useMemo(() => [0, 1, 2, 3, 4, 5], []);
  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    const v = VISITAS[indice];
    const t = clock.elapsedTime;
    const g = tallo.current;
    if (g) {
      g.rotation.z = Math.sin(t * 1.15 + datos.fase) * 0.055 + Math.sin(t * 12.5) * 0.075 * v;
      g.rotation.x = Math.sin(t * 0.92 + datos.fase * 1.7) * 0.04;
    }
    if (corola.current) corola.current.scale.setScalar(1 + v * 0.2);
    if (polen.current) {
      polen.current.visible = v > 0.04;
      polen.current.position.y = 0.08 + (1 - v) * 0.6;
      polen.current.scale.setScalar(0.3 + v * 0.8);
    }
    if (v > 0) VISITAS[indice] = Math.max(0, v - delta * 0.5);
  });
  return (
    <group position={datos.p} scale={datos.esc}>
      <group ref={tallo}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.032, 0.05, 0.6, 6]} />
          <meshLambertMaterial color={C.hoja} />
        </mesh>
        {/* dos hojas lanceoladas, una a cada lado del tallo */}
        <mesh position={[0.13, 0.22, 0.02]} rotation={[Math.PI / 2, 0, 0.5]} scale={[1, 1.9, 1]}>
          <circleGeometry args={[0.085, 5]} />
          <meshLambertMaterial color={C.hojaOscura} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.12, 0.32, -0.03]} rotation={[Math.PI / 2, 0, -0.6]} scale={[1, 1.7, 1]}>
          <circleGeometry args={[0.075, 5]} />
          <meshLambertMaterial color={C.hoja} side={THREE.DoubleSide} />
        </mesh>
        {/* la corola: pétalos ahuecados hacia arriba (no calcomanías planas) */}
        <group ref={corola} position={[0, 0.62, 0]}>
          {petalos.map((i) => {
            const a = (i / petalos.length) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 0.12, 0.02, Math.sin(a) * 0.12]}
                rotation={[-Math.PI / 2 + 0.42, 0, -a + Math.PI / 2]}
              >
                <circleGeometry args={[0.115, 7]} />
                <meshLambertMaterial color={datos.color} side={THREE.DoubleSide} />
              </mesh>
            );
          })}
          <mesh position={[0, 0.04, 0]}>
            <sphereGeometry args={[0.072, 8, 6]} />
            <meshLambertMaterial color={mezclar(C.miel, C.tierra, 0.45)} />
          </mesh>
          {/* el puff de polen que la visita sacude: sube y se disuelve */}
          {motas ? (
            <group ref={polen} visible={false}>
              {[[-0.1, 0, 0.06], [0.11, 0.05, -0.04], [0.02, 0.1, 0.12], [-0.06, 0.12, -0.1]].map((m, i) => (
                <mesh key={i} position={m}>
                  <sphereGeometry args={[0.035, 5, 4]} />
                  <meshBasicMaterial color={C.miel} />
                </mesh>
              ))}
            </group>
          ) : null}
        </group>
      </group>
    </group>
  );
}

/* ═══════════════════ LAS DOS VIVIENDAS ═══════════════════ */

/* El colmenar, apretado a propósito: en 390×844 (el objetivo real de Chagra)
   una escena ancha se sale del cuadro. Las dos viviendas y la gente caben en
   una franja de ±2,5 y el resto lo pone la profundidad. */
const LANGSTROTH_POS = [-2.3, 0, -1.5];
const LANGSTROTH2_POS = [-3.9, 0, -0.2];
const MELIPONA_POS = [1.3, 0, 0.1];
/* La caja melipona va un punto más grande: es la protagonista de la tarjeta 03
   y en pantalla chica se perdía. La escala viaja con la piquera para que las
   guardianas queden EN la boca del tubo, no flotando al lado. */
const MELIPONA_ESC = 1.12;
/* Las bocas de las piqueras en coordenadas de MUNDO: ahí llegan las abejas y
   de ahí salen. (La caja melipona lleva su tubo de cerumen al frente; la
   Langstroth, la rendija de entrada al ras de la tabla de vuelo.) */
const PIQUERAS = {
  langstroth: {
    boca: new THREE.Vector3(LANGSTROTH_POS[0] + 0.02, 0.5, LANGSTROTH_POS[2] + 0.72),
    dentro: new THREE.Vector3(LANGSTROTH_POS[0] + 0.02, 0.46, LANGSTROTH_POS[2] + 0.42),
  },
  melipona: {
    boca: new THREE.Vector3(MELIPONA_POS[0], 0.62 * MELIPONA_ESC, MELIPONA_POS[2] + 0.9 * MELIPONA_ESC),
    dentro: new THREE.Vector3(MELIPONA_POS[0], 0.6 * MELIPONA_ESC, MELIPONA_POS[2] + 0.5 * MELIPONA_ESC),
  },
};

/* Un panal de cera en su cuadro: la celdilla hexagonal, miel abajo y cera
   clara arriba. Ya no vive clavado en el pasto — va DENTRO de la colmena. */
function CuadroPanal({ escala = 1 }) {
  const celdas = useMemo(() => {
    const lista = [];
    for (let fila = -2; fila <= 2; fila++) {
      for (let col = -2; col <= 2; col++) {
        if (Math.abs(fila) + Math.abs(col) < 4) lista.push([col * 0.24 + (fila % 2) * 0.12, fila * 0.205]);
      }
    }
    return lista;
  }, []);
  return (
    <group scale={escala}>
      {/* el marco de madera del cuadro */}
      <mesh><boxGeometry args={[1.5, 1.4, 0.1]} /><meshLambertMaterial color={C.madera} /></mesh>
      <mesh position={[0, 0.76, 0]}><boxGeometry args={[1.72, 0.12, 0.12]} /><meshLambertMaterial color={C.maderaClara} /></mesh>
      {celdas.map(([x, y]) => (
        <mesh key={`${x}-${y}`} position={[x, y, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.125, 0.125, 0.1, 6]} />
          <meshLambertMaterial color={y < 0.15 ? C.miel : C.cera} />
        </mesh>
      ))}
    </group>
  );
}

/* La colmena Langstroth: cajón de cuadros verticales. Con `abierta` se le
   levanta la tapa (queda recostada al pie) y asoma el panal de cera — el
   contraste que la escena tenía que contar y no contaba. */
function ColmenaLangstroth({ posicion, abierta = false }) {
  return (
    <group position={posicion}>
      {/* la base y sus patas */}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.12, 0]}><boxGeometry args={[0.12, 0.25, 1.1]} /><meshLambertMaterial color={C.madera} /></mesh>
      ))}
      <mesh position={[0, 0.28, 0]}><boxGeometry args={[1.45, 0.12, 1.05]} /><meshLambertMaterial color={C.madera} /></mesh>
      {/* la cámara de cría encalada y su tabla de vuelo */}
      <mesh position={[0, 0.75, 0]}><boxGeometry args={[1.35, 0.82, 0.95]} /><meshLambertMaterial color={C.cal} /></mesh>
      <mesh position={[0, 0.36, 0.62]} rotation={[-0.12, 0, 0]}><boxGeometry args={[1.2, 0.06, 0.36]} /><meshLambertMaterial color={C.maderaClara} /></mesh>
      {/* la piquera: la rendija por donde entran y salen */}
      <mesh position={[0, 0.46, 0.49]}><boxGeometry args={[0.52, 0.09, 0.08]} /><meshBasicMaterial color="#2a1c10" /></mesh>
      {abierta ? (
        <>
          {/* los cuadros asomando por la boca del cajón */}
          {[-0.42, -0.14, 0.14, 0.42].map((x) => (
            <mesh key={x} position={[x, 1.18, 0]}><boxGeometry args={[0.08, 0.06, 0.92]} /><meshLambertMaterial color={C.maderaClara} /></mesh>
          ))}
          <mesh position={[0, 1.1, 0]}><boxGeometry args={[1.2, 0.1, 0.86]} /><meshLambertMaterial color={C.ceraVieja} /></mesh>
          {/* UN cuadro levantado, apoyado en el borde: el panal a la vista */}
          <group position={[0.05, 1.42, 0.42]} rotation={[0.22, -0.24, 0.06]}>
            <CuadroPanal escala={0.72} />
          </group>
          {/* la tapa, recostada al pie de la colmena */}
          <mesh position={[-1.12, 0.55, 0.3]} rotation={[0, 0.35, 1.24]}>
            <boxGeometry args={[1.55, 0.12, 1.12]} /><meshLambertMaterial color={C.maderaClara} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, 1.18, 0]}><boxGeometry args={[1.55, 0.12, 1.12]} /><meshLambertMaterial color={C.maderaClara} /></mesh>
      )}
    </group>
  );
}

/* La caja melipona: banco de madera, piquera de TUBO de cerumen al frente y la
   tapa corrida para que se vean los POTES — vasijas redondas de cerumen donde
   la angelita guarda miel y polen. Nada que ver con el panal vertical de al
   lado: esa es toda la lección de poner las dos viviendas juntas. */
function CajaMelipona({ posicion, escala = 1 }) {
  /* muchos potes chicos y apiñados — así se ve un nido de melipona; ocho
     bolas grandes parecían una huacal de naranjas */
  const potes = useMemo(() => ([
    [-0.34, 0.04, -0.16, 0.1], [-0.16, 0.05, -0.22, 0.11], [0.04, 0.04, -0.18, 0.095],
    [0.24, 0.05, -0.2, 0.105], [0.38, 0.04, -0.1, 0.09], [-0.38, 0.05, 0.04, 0.1],
    [-0.2, 0.06, 0.0, 0.115], [0.0, 0.05, -0.02, 0.1], [0.2, 0.06, 0.02, 0.11],
    [0.36, 0.04, 0.1, 0.095], [-0.28, 0.04, 0.2, 0.09], [-0.06, 0.05, 0.18, 0.105],
    [0.16, 0.04, 0.22, 0.095], [-0.1, 0.15, -0.1, 0.085], [0.1, 0.15, 0.06, 0.08],
    [-0.26, 0.14, 0.08, 0.075],
  ]), []);
  return (
    <group position={posicion} scale={escala}>
      {/* el banco de tierra apisonada donde se para la caja */}
      <mesh position={[0, 0.09, 0]}><cylinderGeometry args={[0.72, 0.82, 0.18, 8]} /><meshLambertMaterial color={C.tierraClara} /></mesh>
      {/* el cajón horizontal (así se aloja la melipona: acostada, no en altura) */}
      <mesh position={[0, 0.55, 0]}><boxGeometry args={[1.2, 0.72, 0.86]} /><meshLambertMaterial color={C.maderaClara} /></mesh>
      {/* la tapa CORRIDA: deja ver adentro y queda volada hacia atrás */}
      <mesh position={[-0.1, 0.95, -0.34]} rotation={[0.18, 0, 0]}><boxGeometry args={[1.36, 0.09, 0.62]} /><meshLambertMaterial color={C.madera} /></mesh>
      {/* los POTES DE CERUMEN: el nido a la vista */}
      <group position={[0.06, 0.86, 0.12]}>
        {potes.map((p, i) => (
          <mesh key={i} position={[p[0], p[1], p[2]]} scale={[1, 1.25, 1]}>
            <sphereGeometry args={[p[3], 8, 6]} />
            <meshLambertMaterial color={i % 3 === 0 ? C.cerumenClaro : C.cerumen} />
          </mesh>
        ))}
        {/* el involucro: la lámina de cerumen que envuelve la cría */}
        <mesh position={[0.02, 0.04, 0.24]} rotation={[-0.2, 0, 0]} scale={[1, 0.5, 1]}>
          <sphereGeometry args={[0.3, 8, 6]} />
          <meshLambertMaterial color={mezclar(C.cerumen, C.tierra, 0.4)} />
        </mesh>
      </group>
      {/* LA PIQUERA DE TUBO: el pitillo de cerumen que la angelita construye —
          bien salido de la cara del cajón, que se vea — y que sus guardianas
          vigilan día y noche. */}
      <mesh position={[0, 0.62, 0.44]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.06, 6, 14]} /><meshLambertMaterial color={C.cerumen} />
      </mesh>
      <mesh position={[0, 0.62, 0.58]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 0.3, 10]} /><meshLambertMaterial color={C.cerumenClaro} />
      </mesh>
      {/* la boca abocinada del tubo, la «trompeta» de la angelita */}
      <mesh position={[0, 0.62, 0.74]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.1, 0.08, 10]} /><meshLambertMaterial color={C.cerumenClaro} />
      </mesh>
      <mesh position={[0, 0.62, 0.77]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.05, 10]} /><meshBasicMaterial color="#24170f" />
      </mesh>
    </group>
  );
}

/* ═══════════════════ EL APICULTOR ═══════════════════
   Antes: cápsula + esfera + dos cilindros verdes — un maniquí de palos de otro
   juego. Ahora: dibujo rubber-hose de la casa (contorno grueso, manguera,
   mitones), con su velo, su ahumador humeando y el cuadro en la mano. */
function ApicultorSVG({ alto = 140 }) {
  return (
    <svg width={(120 / 165) * alto} height={alto} viewBox="0 0 120 165" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* EL BRAZO DEL AHUMADOR, detrás del cuerpo: el fuelle y el pico */}
      <g className="abj-humo">
        <circle cx="26" cy="86" r="3.2" fill={C.hueso} opacity="0.75" />
        <circle cx="21" cy="74" r="4.4" fill={C.hueso} opacity="0.55" />
        <circle cx="27" cy="60" r="5.6" fill={C.hueso} opacity="0.35" />
      </g>
      <g>
        <path d="M42 74 Q32 82 30 92" stroke={C.tinta} strokeWidth="7" strokeLinecap="round" fill="none" />
        <circle cx="30" cy="94" r="6" fill={C.hueso} stroke={C.tinta} strokeWidth="2.2" />
        {/* el ahumador: cuerpo de lata, pico y fuelle de cuero */}
        <path d="M22 96 L36 96 L34 116 L24 116 Z" fill={NEUTROS.lamina} stroke={C.tinta} strokeWidth="2.2" />
        <path d="M24 96 Q29 84 34 96 Z" fill={NEUTROS.lamina} stroke={C.tinta} strokeWidth="2" />
        <path d="M29 86 L26 90 L32 90 Z" fill={C.tinta} />
        <path d="M36 100 Q46 104 40 112 Q34 110 34 104 Z" fill={C.maderaVieja} stroke={C.tinta} strokeWidth="2" />
      </g>
      {/* CUERPO: overol claro de faena, respira */}
      <g className="abj-cuerpo">
        <ellipse cx="47" cy="152" rx="9" ry="4.5" fill={C.tinta} />
        <ellipse cx="68" cy="152" rx="9" ry="4.5" fill={C.tinta} />
        <path d="M42 108 L44 146 L52 146 L54 112 Z" fill={C.cal} stroke={C.tinta} strokeWidth="2.4" />
        <path d="M58 112 L60 146 L68 146 L70 108 Z" fill={C.cal} stroke={C.tinta} strokeWidth="2.4" />
        {/* el peto del overol */}
        <path d="M40 66 Q56 60 72 66 L74 112 Q56 120 38 112 Z" fill={C.cal} stroke={C.tinta} strokeWidth="2.6" />
        <path d="M40 92 Q56 98 74 92" stroke={C.maderaVieja} strokeWidth="3.4" fill="none" />
        <rect x="49" y="76" width="14" height="12" rx="2" fill="none" stroke={C.tinta} strokeWidth="1.8" />
        {/* botas y puños */}
        <path d="M44 142 L52 142" stroke={C.tinta} strokeWidth="2" />
      </g>
      {/* EL BRAZO DEL CUADRO, alzado: revisa el panal a contraluz */}
      <g className="abj-brazo">
        <path d="M70 72 Q84 66 90 54" stroke={C.tinta} strokeWidth="7" strokeLinecap="round" fill="none" />
        <circle cx="91" cy="52" r="6" fill={C.hueso} stroke={C.tinta} strokeWidth="2.2" />
        {/* el cuadro con su panal: marco, cera arriba, miel abajo */}
        <g>
          <rect x="76" y="14" width="34" height="40" rx="2" fill={C.maderaClara} stroke={C.tinta} strokeWidth="2.4" />
          <rect x="80" y="19" width="26" height="14" fill={C.cera} stroke={C.tinta} strokeWidth="1.2" />
          <rect x="80" y="33" width="26" height="16" fill={C.miel} stroke={C.tinta} strokeWidth="1.2" />
          {[22, 28, 38, 44].map((y) => (
            <path key={y} d={`M81 ${y} h24`} stroke={C.tinta} strokeWidth="0.8" opacity="0.45" />
          ))}
          <path d="M74 12 h38" stroke={C.tinta} strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
      {/* LA CABEZA con el velo: cara amable detrás de la malla */}
      <g className="abj-cabeza">
        <path d="M40 34 Q56 26 72 34 L76 66 Q56 74 36 66 Z" fill={C.hueso} opacity="0.42" stroke={C.tinta} strokeWidth="2" />
        <circle cx="56" cy="44" r="13" fill="#c98f62" stroke={C.tinta} strokeWidth="2.2" opacity="0.9" />
        <circle cx="51.5" cy="42" r="2" fill={C.tinta} />
        <circle cx="61" cy="42" r="2" fill={C.tinta} />
        <path d="M50 50 Q56 55 62 50" stroke={C.tinta} strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* la malla del velo, en dos hilos */}
        {[40, 48, 56, 64].map((y) => (
          <path key={y} d={`M${38 + (y - 40) * 0.12} ${y} Q56 ${y + 4} ${74 - (y - 40) * 0.12} ${y}`} stroke={C.tinta} strokeWidth="0.7" opacity="0.32" fill="none" />
        ))}
        {/* el sombrero de ala ancha del que sostiene el velo */}
        <ellipse cx="56" cy="30" rx="27" ry="7.5" fill={C.cal} stroke={C.tinta} strokeWidth="2.6" />
        <path d="M43 29 Q43 13 56 13 Q69 13 69 29 Z" fill={C.cal} stroke={C.tinta} strokeWidth="2.6" />
        <rect x="43" y="24" width="26" height="4.5" fill={C.maderaVieja} />
      </g>
    </svg>
  );
}

/* Una figura en escena: billboard <Html>, el patrón de la casa. */
function Persona({ posicion, df = 8, reducedMotion, title, children }) {
  return (
    <group position={posicion}>
      <Html center distanceFactor={df} zIndexRange={[16, 0]} pointerEvents="none">
        <div className={`abj-persona${reducedMotion ? ' abj-persona--quieta' : ''}`} aria-hidden="true" title={title}>
          {children}
        </div>
      </Html>
    </group>
  );
}

/* El rótulo corto que distingue las dos viviendas. Español de Colombia, sin
   párrafos: dos renglones que se leen de un vistazo desde el celular. */
function Rotulo({ posicion, titulo, texto, df = 11 }) {
  return (
    <group position={posicion}>
      <Html center distanceFactor={df} zIndexRange={[22, 0]} pointerEvents="none">
        <div className="abj-chip" aria-hidden="true">
          <b>{titulo}</b>
          <span>{texto}</span>
        </div>
      </Html>
    </group>
  );
}

/* ═══════════════════ EL ENJAMBRE ═══════════════════
   El CIRCUITO de cada Angelita: las flores que trabaja y la vivienda a la que
   lleva la carga. Velocidades y tiempos co-primos para que nunca vuelvan a la
   vez (ritmo, no metrónomo). El orden importa: tier bajo recorta del final. */
const FORRAJERAS = [
  { flores: [12, 7, 1], casa: 'melipona', vel: 1.75, posa: 2.6, adentro: 2.2, px: 32, fase: 0.0 },
  { flores: [4, 13, 6], casa: 'melipona', vel: 2.05, posa: 2.1, adentro: 1.8, px: 29, fase: 1.6 },
  { flores: [2, 9, 14], casa: 'langstroth', vel: 1.9, posa: 2.9, adentro: 2.6, px: 30, fase: 3.1 },
  { flores: [11, 15, 8], casa: 'langstroth', vel: 2.2, posa: 1.9, adentro: 2.0, px: 27, fase: 4.7 },
  { flores: [8, 1, 10], casa: 'melipona', vel: 1.65, posa: 3.2, adentro: 2.4, px: 28, fase: 2.4 },
  { flores: [13, 3, 11], casa: 'langstroth', vel: 2.35, posa: 2.3, adentro: 1.6, px: 26, fase: 5.5 },
  { flores: [9, 0, 4], casa: 'melipona', vel: 1.85, posa: 2.7, adentro: 2.8, px: 28, fase: 0.9 },
];
/* Las guardianas del tubo: la angelita real deja obreras suspendidas frente a
   la piquera, tanteando el aire. Nunca se van — la piquera está siempre viva. */
const GUARDIANAS = [
  { casa: 'melipona', px: 22, fase: 0.0, lado: 1 },
  { casa: 'melipona', px: 20, fase: 2.7, lado: -1 },
];

const ESTILO_ANGELITA = {
  filter: 'drop-shadow(0 2px 3px rgba(71, 49, 20, 0.3))',
  pointerEvents: 'none',
  transformOrigin: '50% 60%',
  willChange: 'transform',
};

/* Escribe el transform del billboard una sola vez por cambio real: el flip de
   rumbo (mira hacia donde va) y la escala de entrar/salir de la piquera. */
function pintar(capa, ref, dir, k) {
  if (!capa) return;
  if (ref.dir === dir && Math.abs(ref.k - k) < 0.02) return;
  ref.dir = dir; ref.k = k;
  capa.style.transform = `scale(${k.toFixed(2)}) scaleX(${dir})`;
}

/* UNA Angelita forrajera con su CICLO completo:
     vuelo → posada (liba, la flor se estremece) → vuelo → … → boca de la
     piquera → entra (se encoge en el tubo) → adentro → sale → vuelta al surco.
   Todo el estado vive en refs: cero re-render por cuadro. Lo único que sube a
   React es `libando` (dos veces por parada), que enciende la probóscide y el
   polvillo de polen del propio dibujo de la casa. Con reduced-motion la abeja
   queda POSADA en su primera flor: quieta, pero polinizando. */
function AbejaForrajera({ datos, reducedMotion, rastro = true }) {
  const grupo = useRef(/** @type {any} */ (null));
  const capa = useRef(/** @type {HTMLDivElement|null} */ (null));
  const pincel = useRef({ dir: 1, k: 1 });
  const [libando, setLibando] = useState(reducedMotion);

  const paradas = useMemo(() => {
    const lista = datos.flores.map((i) => ({ tipo: 'flor', i, p: puntoDeFlor(FLORES[i]) }));
    lista.push({ tipo: 'piquera', i: -1, p: PIQUERAS[datos.casa].boca, dentro: PIQUERAS[datos.casa].dentro });
    return lista;
  }, [datos]);

  const est = useRef(/** @type {any} */ (null));
  /* vector de trabajo en un ref (no en useMemo): se escribe cuadro a cuadro */
  const aux = useRef(new THREE.Vector3());

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g || reducedMotion) return;
    const t = clock.elapsedTime;
    if (!est.current) {
      /* arranque escalonado: cada una entra al circuito en su fase, volando
         desde el aire hacia su primera flor */
      const p0 = paradas[0].p;
      est.current = {
        fase: 'vuelo', destino: 0, t0: t - datos.fase * 0.6,
        desde: new THREE.Vector3(p0.x + Math.sin(datos.fase) * 2.2, 1.6, p0.z + Math.cos(datos.fase) * 1.8),
        dur: 2.4, arco: 0.6, dir: 1,
      };
    }
    const e = est.current;
    const parada = paradas[e.destino];
    let k = 1;

    const avanzar = (desdeAqui) => {
      e.desde.copy(desdeAqui);
      e.destino = (e.destino + 1) % paradas.length;
      const meta = paradas[e.destino].p;
      const dist = e.desde.distanceTo(meta);
      e.dur = Math.max(0.7, dist / datos.vel);
      e.arco = 0.28 + dist * 0.1;
      e.dir = meta.x < e.desde.x - 0.05 ? -1 : meta.x > e.desde.x + 0.05 ? 1 : e.dir;
      e.fase = 'vuelo';
      e.t0 = t;
    };

    if (e.fase === 'vuelo') {
      const u = clamp((t - e.t0) / e.dur, 0, 1);
      const s = u * u * (3 - 2 * u);
      const v = aux.current;
      v.lerpVectors(e.desde, parada.p, s);
      /* el arco del viaje + el bamboleo del vuelo lento y flotante del
         meliponino (no la línea recta de un dron) */
      v.y += Math.sin(Math.PI * u) * e.arco;
      v.x += Math.sin(t * 4.6 + datos.fase) * 0.06 * (1 - s);
      v.z += Math.cos(t * 3.9 + datos.fase) * 0.05 * (1 - s);
      g.position.copy(v);
      /* va soltando polen mientras viaja: la sarta ámbar ES el recorrido
         flor→flor. Cada ~0,08s una mota bajo el cuerpo, con leve deriva. */
      if (rastro && t - (e.emit || 0) > 0.075) {
        e.emit = t;
        emitirPolen(
          v.x + Math.sin(t * 21 + datos.fase) * 0.05,
          v.y - 0.05,
          v.z + Math.cos(t * 17 + datos.fase) * 0.05,
        );
      }
      if (u >= 1) {
        e.fase = parada.tipo === 'flor' ? 'posada' : 'boca';
        e.t0 = t;
        if (parada.tipo === 'flor') setLibando(true);
      }
    } else if (e.fase === 'posada') {
      /* POSADA en la flor: se acomoda con las paticas y liba. Mientras esté
         encima, marca la visita — la flor la lee y reacciona. */
      g.position.copy(parada.p);
      g.position.y += Math.abs(Math.sin(t * 2.4 + datos.fase)) * 0.025;
      VISITAS[parada.i] = 1;
      if (t - e.t0 > datos.posa) { setLibando(false); avanzar(parada.p); }
    } else if (e.fase === 'boca') {
      /* en la boca de la piquera, tanteando con las antenas antes de entrar */
      g.position.set(
        parada.p.x + Math.sin(t * 3.2 + datos.fase) * 0.09,
        parada.p.y + Math.sin(t * 4.4 + datos.fase) * 0.05,
        parada.p.z + 0.06,
      );
      if (t - e.t0 > 1.3) { e.fase = 'entrando'; e.t0 = t; }
    } else if (e.fase === 'entrando') {
      const u = clamp((t - e.t0) / 0.5, 0, 1);
      aux.current.lerpVectors(parada.p, parada.dentro, u);
      g.position.copy(aux.current);
      k = 1 - u;
      if (u >= 1) { e.fase = 'adentro'; e.t0 = t; }
    } else if (e.fase === 'adentro') {
      g.position.copy(parada.dentro);
      k = 0;
      if (t - e.t0 > datos.adentro) { e.fase = 'saliendo'; e.t0 = t; }
    } else if (e.fase === 'saliendo') {
      const u = clamp((t - e.t0) / 0.5, 0, 1);
      aux.current.lerpVectors(parada.dentro, parada.p, u);
      g.position.copy(aux.current);
      k = u;
      if (u >= 1) avanzar(parada.p);
    }
    pintar(capa.current, pincel.current, e.dir, k);
  });

  const inicio = reducedMotion ? paradas[0].p : PIQUERAS[datos.casa].boca;
  return (
    <group ref={grupo} position={[inicio.x, inicio.y, inicio.z]}>
      <Html center distanceFactor={9} zIndexRange={[8, 0]} pointerEvents="none">
        <div ref={capa} aria-hidden="true" data-enjambre="abeja-angelita" style={ESTILO_ANGELITA}>
          <AbejaAngelita
            size={datos.px}
            animated={!reducedMotion}
            comiendo={libando}
            polen={libando}
            pose={libando ? 'reposo' : 'vuela'}
          />
        </div>
      </Html>
    </group>
  );
}

/* EL RASTRO, VISIBLE. Un solo InstancedMesh lee el anillo de motas que las
   forrajeras van soltando en vuelo y las pinta: suben un punto y se apagan. La
   sarta ámbar dibuja el recorrido flor→flor — la polinización que un cuadro
   fijo no mostraba. Cero geometría por mota (una instancia reusada), cero
   re-render: todo se escribe en las matrices cuadro a cuadro. */
function RastroPolen({ reducedMotion }) {
  const malla = useRef(/** @type {any} */ (null));
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((_s, delta) => {
    const m = malla.current;
    if (!m) return;
    for (let i = 0; i < RASTRO_MAX; i++) {
      const v = rastroVida[i];
      if (v > 0) {
        const s = 0.026 + v * 0.075;
        dummy.position.set(
          rastroPos[i * 3],
          rastroPos[i * 3 + 1] + (1 - v) * 0.42, // sube al desvanecerse
          rastroPos[i * 3 + 2],
        );
        dummy.scale.setScalar(s);
        if (!reducedMotion) rastroVida[i] = Math.max(0, v - delta * 0.7);
      } else {
        dummy.scale.setScalar(0); // apagada: colapsada, no se ve
      }
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={malla} args={[undefined, undefined, RASTRO_MAX]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 5]} />
      <meshBasicMaterial color={C.miel} transparent opacity={0.85} depthWrite={false} />
    </instancedMesh>
  );
}

/* Las guardianas del tubo: vuelo estacionario frente a la piquera, sin irse
   nunca. Con reduced-motion quedan posadas en la boca, vigilando quietas. */
function AbejaGuardiana({ datos, reducedMotion }) {
  const grupo = useRef(/** @type {any} */ (null));
  const boca = PIQUERAS[datos.casa].boca;
  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g || reducedMotion) return;
    const t = clock.elapsedTime * 0.9 + datos.fase;
    g.position.set(
      boca.x + datos.lado * (0.16 + Math.sin(t * 1.9) * 0.07),
      boca.y + 0.05 + Math.sin(t * 2.6) * 0.07,
      boca.z + 0.2 + Math.sin(t * 1.4) * 0.06,
    );
  });
  return (
    <group ref={grupo} position={[boca.x + datos.lado * 0.16, boca.y + 0.02, boca.z + 0.16]}>
      <Html center distanceFactor={9} zIndexRange={[8, 0]} pointerEvents="none">
        <div aria-hidden="true" data-enjambre="abeja-guardiana" style={ESTILO_ANGELITA}>
          <AbejaAngelita size={datos.px} animated={!reducedMotion} cejas="fruncidas" />
        </div>
      </Html>
    </group>
  );
}

/* ═══════════════════ CÁMARA ═══════════════════ */

/* A dónde lleva la mirada cada tarjeta: 01 al surco de flores, 02 al panal de
   la Langstroth abierta, 03 a la caja melipona. */
const ZONAS = {
  polinizacion: [0, 0.85, 1.9],
  miel: [LANGSTROTH_POS[0] + 0.2, 1.05, LANGSTROTH_POS[2] + 0.2],
  nativas: [MELIPONA_POS[0], 0.8, MELIPONA_POS[2] + 0.1],
};

/* Lleva el `target` de OrbitControls hacia la zona de la tarjeta activa.
   Antes `seleccion` solo cambiaba el borde de su propia tarjeta HTML; esto la
   cablea a la cámara del Canvas. Sin reducedMotion camina suave (lerp);
   con reducedMotion salta directo, sin marear. */
function EnfocarSeleccion({ seleccion, reducedMotion, controlsRef }) {
  const objetivo = useMemo(() => new THREE.Vector3(...(ZONAS[seleccion] || ZONAS.polinizacion)), [seleccion]);
  useFrame((_state, delta) => {
    const controles = controlsRef.current;
    if (!controles) return;
    if (reducedMotion) {
      controles.target.copy(objetivo);
    } else {
      controles.target.lerp(objetivo, Math.min(1, delta * 1.6));
    }
    controles.update();
  });
  /* Ancla inerte (sin geometría ni material) que expone declarativamente a
     dónde apunta el foco activo — el mismo punto que persigue OrbitControls
     cuadro a cuadro. Marca la escena y sirve de gancho de prueba. */
  return <group name="foco-seleccion" position={[objetivo.x, objetivo.y, objetivo.z]} />;
}

/* EL ENCUADRE. En pantalla angosta (390×844, que es el objetivo real de
   Chagra) una escena ancha no cabe a lo ancho: el cuadro se resuelve abriendo
   el campo, alejando la cámara y girándola hacia la diagonal del claro, para
   que entren el surco, las dos viviendas y la loma del fondo. En pantalla
   ancha, la mirada se acerca y se abre. Declarativo (la cámara es un nodo de
   la escena, no una mutación al vuelo) y se recalcula con el canvas. */
function Encuadre() {
  const ancho = useThree((s) => s.size.width);
  const alto = useThree((s) => s.size.height);
  const angosto = ancho / Math.max(1, alto) < 1.05;
  /* en vertical la mirada se va a la DIAGONAL del claro (≈45°): así el ancho
     del colmenar se reparte entre las dos mitades de la pantalla y cabe */
  const d = angosto ? 11.0 : 9.6;
  const azim = angosto ? 0.76 : 0.62;
  return (
    <PerspectiveCamera
      makeDefault
      fov={angosto ? 50 : 44}
      near={0.1}
      far={70}
      position={[Math.sin(azim) * d, angosto ? 3.6 : 4.4, Math.cos(azim) * d]}
    />
  );
}

function Escena({ tier, reducedMotion, seleccion }) {
  const perfil = perfilDeTier(tier);
  const forrajeras = tier === 'bajo' ? FORRAJERAS.slice(0, 3) : tier === 'medio' ? FORRAJERAS.slice(0, 5) : FORRAJERAS;
  const guardianas = tier === 'bajo' ? GUARDIANAS.slice(0, 1) : GUARDIANAS;
  const controlsRef = useRef(/** @type {any} */ (null));
  const objetivoInicial = ZONAS[seleccion] || ZONAS.polinizacion;
  /* los canales entre hermanos (visitas y rastro) arrancan limpios cada vez que
     el mundo se monta */
  const rastroOn = tier !== 'bajo';
  useEffect(() => { VISITAS.fill(0); limpiarRastro(); }, []);
  return (
    <>
      <color attach="background" args={[DORADA.cielo]} />
      {perfil.fog ? <fog attach="fog" args={[DORADA.niebla, DORADA.nieblaCerca + 6, DORADA.nieblaLejos + 8]} /> : null}
      <hemisphereLight intensity={DORADA.hemisferio} color={DORADA.cielo} groundColor={DORADA.suelo} />
      <ambientLight intensity={ATMOSFERA.ambiente} color={DORADA.luz} />
      <directionalLight position={/** @type {[number, number, number]} */ (DORADA.solPos)} intensity={DORADA.sol} color={DORADA.luz} />
      <directionalLight position={[-7, 5, -6]} intensity={DORADA.rellenoInt} color={DORADA.relleno} />

      <Nubes />
      <Prado perfil={perfil} />
      <Monte />
      <Arbustos />
      <Macollas />

      <ColmenaLangstroth posicion={LANGSTROTH_POS} abierta />
      <ColmenaLangstroth posicion={LANGSTROTH2_POS} />
      <CajaMelipona posicion={MELIPONA_POS} escala={MELIPONA_ESC} />

      <Persona
        posicion={[-0.7, 0.05, -0.1]}
        reducedMotion={reducedMotion}
        title="El apicultor revisa un cuadro de panal con el ahumador en la mano"
      >
        <ApicultorSVG />
      </Persona>

      <Rotulo
        posicion={[LANGSTROTH_POS[0] - 1.0, 2.75, LANGSTROTH_POS[2] + 0.55]}
        titulo="Colmena Langstroth"
        texto="panales de cera en cuadros"
      />
      <Rotulo
        posicion={[MELIPONA_POS[0] - 0.15, 2.15, MELIPONA_POS[2] - 0.1]}
        titulo="Caja melipona"
        texto="potes de cerumen y piquera de tubo"
      />

      {FLORES.map((datos, i) => (
        <Flor key={`flor-${i}`} indice={i} datos={datos} reducedMotion={reducedMotion} motas={tier !== 'bajo'} />
      ))}
      {forrajeras.map((datos, i) => (
        <AbejaForrajera key={`for-${i}`} datos={datos} reducedMotion={reducedMotion} rastro={rastroOn} />
      ))}
      {guardianas.map((datos, i) => (
        <AbejaGuardiana key={`gua-${i}`} datos={datos} reducedMotion={reducedMotion} />
      ))}
      {/* el polen viajando de flor en flor: el proceso, no solo las abejas */}
      {rastroOn ? <RastroPolen reducedMotion={reducedMotion} /> : null}

      <ParticulasAmbientales tipo="polen" tier={tier} reducedMotion={reducedMotion} area={[9, 3, 6]} position={[0, 1.0, 1.2]} />
      <OrbitControls ref={controlsRef} makeDefault enablePan={false} minDistance={7} maxDistance={22} minPolarAngle={0.6} maxPolarAngle={1.36} target={objetivoInicial} />
      <EnfocarSeleccion seleccion={seleccion} reducedMotion={reducedMotion} controlsRef={controlsRef} />
      <Encuadre />
      {tier === 'alto' ? <AdaptiveDpr pixelated /> : null}
    </>
  );
}

/* ═══════════════════ EL CHROME (DOM) ═══════════════════ */

/* La cadencia del apicultor y el aire de los rótulos. Rubber-hose: el cuerpo
   respira, el brazo del cuadro sube y baja mirándolo, el humo del ahumador
   sube y se disuelve. Reduced-motion lo congela todo en fotograma digno. */
const CSS_ABEJAS = `
.abj-persona svg { overflow: visible; }
.abj-cuerpo { transform-box: view-box; transform-origin: 56px 152px; animation: abjRespira 3.4s ease-in-out infinite; }
.abj-brazo { transform-box: view-box; transform-origin: 70px 72px; animation: abjRevisa 4.2s ease-in-out infinite; }
.abj-cabeza { transform-box: view-box; transform-origin: 56px 66px; animation: abjMira 4.2s ease-in-out infinite; }
.abj-humo { transform-box: view-box; transform-origin: 27px 96px; animation: abjHumo 3.8s ease-out infinite; }
@keyframes abjRespira { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.982) scaleX(1.012); } }
@keyframes abjRevisa { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(6deg); } }
@keyframes abjMira { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(3deg); } }
@keyframes abjHumo { 0% { transform: translateY(6px) scale(0.7); opacity: 0.85; } 100% { transform: translateY(-26px) scale(1.5); opacity: 0; } }
.abj-persona--quieta *, .abj-persona--quieta { animation: none !important; }
.abj-chip { pointer-events: none; display: flex; flex-direction: column; gap: 1px; width: max-content; max-width: 104px; padding: 4px 10px; border-radius: 12px; background: rgba(54, 38, 20, 0.84); color: #fdf3dd; font-family: ui-sans-serif, system-ui, sans-serif; text-wrap: balance; box-shadow: 0 3px 9px rgba(48, 32, 10, 0.34); }
.abj-chip b { font: 700 11px/1.25 ui-sans-serif, system-ui, sans-serif; letter-spacing: 0.01em; white-space: nowrap; }
.abj-chip span { font: 500 9.5px/1.3 ui-sans-serif, system-ui, sans-serif; color: #f0d59a; }
@media (prefers-reduced-motion: reduce) {
  .abj-cuerpo, .abj-brazo, .abj-cabeza, .abj-humo { animation: none !important; }
}
`;

const TARJETAS = [
  {
    id: 'polinizacion', numero: '01', titulo: 'Polinización que da fruto',
    texto: 'La angelita se posa en la flor, se llena de polen y lo deja en la siguiente. De ese viaje de flor en flor salen los frutos y las semillas de la huerta.',
  },
  {
    id: 'miel', numero: '02', titulo: 'Miel, cera y cuidado',
    texto: 'En la colmena Langstroth las abejas estiran panales de cera dentro de cuadros que se pueden sacar y revisar. Una saca con medida deja alimento para la colonia.',
  },
  {
    id: 'nativas', numero: '03', titulo: 'Meliponas nativas',
    texto: 'La angelita (Tetragonisca angustula) no tiene aguijón: se maneja sin traje, al pie de la casa. Guarda su miel en potes de cerumen y entra por una piquera de tubo que sus guardianas vigilan.',
  },
];

const estilos = {
  pagina: { minHeight: '100dvh', color: '#382719', background: 'linear-gradient(150deg, #fff3cf 0%, #e9c777 48%, #9eb76d 100%)', fontFamily: 'Georgia, Cambria, serif', padding: 'clamp(16px, 4vw, 48px)' },
  cabecera: { maxWidth: 1100, margin: '0 auto 18px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 16, alignItems: 'end' },
  ceja: { margin: '0 0 5px', font: '700 0.72rem/1.2 ui-sans-serif, sans-serif', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#71451f' },
  titulo: { margin: 0, fontSize: 'clamp(2.15rem, 8vw, 5.5rem)', lineHeight: 0.88, letterSpacing: '-0.055em', maxWidth: 760 },
  sello: { width: 84, height: 84, border: '1px solid #71451f', borderRadius: '50%', display: 'grid', placeItems: 'center', textAlign: 'center', font: '700 0.68rem/1.15 ui-sans-serif, sans-serif', transform: 'rotate(7deg)' },
  escena: { position: 'relative', maxWidth: 1100, height: 'clamp(390px, 62vh, 680px)', margin: '0 auto', overflow: 'hidden', borderRadius: '28px 28px 90px 28px', border: '1px solid rgba(76, 52, 27, 0.35)', background: DORADA.cielo, boxShadow: '0 28px 65px rgba(71, 49, 20, 0.22)' },
  pista: { position: 'absolute', zIndex: 2, left: 16, bottom: 14, margin: 0, padding: '8px 12px', borderRadius: 999, color: '#fff9e8', background: 'rgba(54, 41, 24, 0.78)', font: '600 0.76rem/1.2 ui-sans-serif, sans-serif', pointerEvents: 'none' },
  tarjetas: { maxWidth: 1100, margin: '18px auto 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 },
  tarjeta: { appearance: 'none', textAlign: 'left', color: '#382719', border: '1px solid rgba(85, 55, 25, 0.3)', borderRadius: 16, background: 'rgba(255, 249, 224, 0.82)', padding: '15px 16px', cursor: 'pointer', font: 'inherit' },
  tarjetaActiva: { background: '#fff9e3', boxShadow: 'inset 0 0 0 2px #a76622' },
  numero: { display: 'block', marginBottom: 7, color: '#9b5b1d', font: '800 0.68rem/1 ui-sans-serif, sans-serif', letterSpacing: '0.12em' },
  texto: { margin: '7px 0 0', font: '0.9rem/1.42 ui-sans-serif, sans-serif' },
};

export default function MundoAbejas3D() {
  const decision = useMemo(() => decidirTier(), []);
  const [seleccion, setSeleccion] = useState('polinizacion');
  const perfil = perfilDeTier(decision.tier);
  return (
    <main style={estilos.pagina}>
      <style>{CSS_ABEJAS}</style>
      <header style={estilos.cabecera}>
        <div>
          <p style={estilos.ceja}>Chagra presenta: escuela viva</p>
          <h1 style={estilos.titulo}>Mundo de las abejas y meliponas</h1>
        </div>
        <div style={estilos.sello} aria-hidden="true">POLEN<br />MIEL<br />VIDA</div>
      </header>
      <section style={estilos.escena} aria-label="Diorama 3D de abejas, meliponas y flores meliferas">
        <Canvas
          dpr={perfil.dpr}
          frameloop={decision.reducedMotion ? 'demand' : 'always'}
          gl={{ antialias: perfil.antialias, alpha: false, powerPreference: 'high-performance' }}
          camera={{ position: [8, 6.2, 12], fov: 48, near: 0.1, far: 70 }}
        >
          <Escena tier={decision.tier} reducedMotion={decision.reducedMotion} seleccion={seleccion} />
        </Canvas>
        <p style={estilos.pista}>{decision.reducedMotion ? 'Vista quieta para su comodidad' : 'Arrastre para recorrer el colmenar'}</p>
      </section>
      <section style={estilos.tarjetas} aria-label="Aprenda con el colmenar">
        {TARJETAS.map((tarjeta) => {
          const activa = seleccion === tarjeta.id;
          return (
            <button key={tarjeta.id} type="button" aria-pressed={activa} style={{ ...estilos.tarjeta, ...(activa ? estilos.tarjetaActiva : {}) }} onClick={() => setSeleccion(tarjeta.id)}>
              <span style={estilos.numero}>{tarjeta.numero}</span>
              <strong>{tarjeta.titulo}</strong>
              <p style={estilos.texto}>{tarjeta.texto}</p>
            </button>
          );
        })}
      </section>
    </main>
  );
}
