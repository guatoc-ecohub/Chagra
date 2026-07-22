/*
 * MomentoVentaMercado3D — LOS MOMENTOS DEL HATO: venta, nacimiento y partida.
 *
 * No es un diorama para orbitar: es un MOMENTO COREOGRAFIADO con cámara
 * dirigida, al estilo de una cinemática de juego. Una res low-poly protagoniza
 * tres escenas del ciclo de vida animal en la finca:
 *
 *   - VENTA      : establishing shot del valle; la res sale del corral, baja
 *                  por el camino y llega al puesto del mercado. La cámara la
 *                  sigue con amortiguación exponencial determinista (mismo
 *                  contrato que el damp de maath, sin sumar dependencia).
 *   - NACIMIENTO : una cría aparece con squash & stretch y overshoot elástico
 *                  (rubber-hose Cuphead / Miss Minutes: la línea que respira),
 *                  brinca, aterriza con squash y queda respirando.
 *   - PARTIDA    : el fin del ciclo, digno y sereno, SIN gore: la respiración
 *                  se aquieta, la cabeza baja despacio y la res se desvanece
 *                  bajo el árbol grande, entre un velo de luz y polen que sube.
 *                  Queda un anillo tibio en el pasto.
 *
 * DIRECCIÓN DE ARTE (todo del framework, nada inventado por fuera):
 *   - La atmósfera es la hora dorada canónica (`CIELOS_HORA.dorada`, espejo de
 *     ATMOSFERA en atmosferaMadre): el mismo atardecer de todos los mundos.
 *   - Los materiales salen de `PALETA` entintados hacia la niebla dorada con
 *     `mezclar` — la ley de coherencia. Solo meshLambert/meshBasic, flat, sin
 *     shadow-map.
 *   - El aire (polen, mariposas, luciérnagas del nacimiento) es el kit
 *     `ParticulasAmbientales` sin tocar, con su presupuesto por tier.
 *
 * RENDIMIENTO: geometría procedural determinista (crearRng / hash de senos,
 * cero Math.random), matas de pasto instanciadas (1 draw call), presupuestos
 * por `perfilDeTier`. `reducedMotion` monta el TABLEAU FINAL de cada momento
 * (quieto, digno) con `frameloop="demand"`: sin animación activa no se pinta.
 *
 * Ruta mockup: #/mockups/momento-venta-mercado-3d (la cablea App.jsx aparte).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { geomVaca } from '../visual/mundo3d/finca/fincaRealista.geom.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';
import { crearRng } from '../visual/mundo3d/particulasData.js';

/* La hora dorada canónica (espejo de ATMOSFERA): única fuente de la atmósfera. */
const DORADA = CIELOS_HORA.dorada;

/* La paleta del framework entintada hacia la niebla dorada del valle ganadero. */
const TINTE = DORADA.niebla;
const P = {
  pasto: mezclar('#6f8f45', TINTE, 0.26), // pradera de pastoreo
  pastoSol: mezclar('#8aa348', TINTE, 0.28), // mechones al sol
  camino: mezclar('#a8875a', TINTE, 0.3), // la huella de tierra pisada
  loma: mezclar('#7c6a40', TINTE, 0.3), // la ladera alta del fondo
  res: mezclar('#a4713f', TINTE, 0.18), // el pardo de la res adulta
  resClara: mezclar('#c99a6a', TINTE, 0.22), // la cría, más clara
  mancha: mezclar('#54402a', TINTE, 0.14), // manchas del pelaje y pezuñas
  hocico: mezclar('#d3a087', TINTE, 0.2), // hocico rosado
  cuerno: mezclar('#e8dcc0', TINTE, 0.18), // cuerno hueso
  ojo: '#f7f1e3', // esclerótica rubber-hose
  pupila: '#2e2418', // pupila
  madera: mezclar(PALETA.madera, TINTE, 0.2), // postes del corral y del puesto
  maderaClara: mezclar(PALETA.maderaClara, TINTE, 0.22), // mesón, sombreros
  maderaOscura: mezclar(PALETA.maderaOscura, TINTE, 0.2), // pantalón, puerta
  toldo: mezclar('#c06a38', TINTE, 0.24), // el toldo teja del puesto
  tela: mezclar('#c8b48c', TINTE, 0.16), // faldón del mesón
  ruana: mezclar('#8a4a38', TINTE, 0.2), // la ruana de quien despide
  ruanaVerde: mezclar('#5a6e4a', TINTE, 0.2), // la del puesto
  piel: mezclar('#8a5a3a', TINTE, 0.15), // rostro campesino
  cal: mezclar(PALETA.cal, TINTE, 0.12), // pared de la casita
  teja: mezclar('#9a5a36', TINTE, 0.26), // su techo
  canasto: mezclar('#a9713c', TINTE, 0.2), // mimbre
  fruta: mezclar(PALETA.ambar, TINTE, 0.12), // fruta del puesto
  tronco: mezclar(PALETA.madera, TINTE, 0.22),
  copa: mezclar(PALETA.follajeOscuro, TINTE, 0.3),
  copaSol: mezclar(PALETA.follajeClaro, TINTE, 0.3),
  luzRito: '#ffe9c2', // el velo/anillo de los momentos (aditivo, tibio)
};

/* ── Utilidades deterministas (cero Math.random) ─────────────────────────── */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/* smoothstep clásico entre bordes a..b. */
function suavizar(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
/* Factor de amortiguación exponencial e independiente del framerate (el mismo
   contrato que el damp de maath/easing, sin sumar la dependencia). */
const amortiguacion = (lambda, dt) => 1 - Math.exp(-lambda * dt);
/* Ruido determinista (hash de senos): mismo valle siempre. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}
/* Overshoot elástico (easeOutElastic): el POP del nacimiento rubber-hose. */
function reboteElastico(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const c = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c) + 1;
}

/* ── La geografía: un valle que baja del fondo (loma) al frente (mercado),
      con dos terrazas planas deterministas: el corral y el puesto. ───────── */
const ANCHO = 36;
const FONDO = 30;
function alturaCruda(wx, wz) {
  const fondoW = 1 - suavizar(-13, 2, wz); // 1 en la loma del fondo, 0 al frente
  let h = 0.14 + fondoW * 2.4;
  h += suavizar(11, 17, Math.abs(wx)) * 1.1; // la cuna del valle a los costados
  h += ruido(wx * 0.45, wz * 0.45) * 0.35 * (0.5 + fondoW * 0.9);
  return h;
}
const C_CORRAL = [-10, -6.5];
const C_MERCADO = [7.6, 5.0];
const H_CORRAL = alturaCruda(C_CORRAL[0], C_CORRAL[1]);
const H_MERCADO = alturaCruda(C_MERCADO[0], C_MERCADO[1]);
function altura(wx, wz) {
  let h = alturaCruda(wx, wz);
  const wCor = 1 - suavizar(3.4, 4.8, Math.hypot(wx - C_CORRAL[0], wz - C_CORRAL[1]));
  h += (H_CORRAL - h) * wCor;
  const wMer = 1 - suavizar(2.8, 4.2, Math.hypot(wx - C_MERCADO[0], wz - C_MERCADO[1]));
  h += (H_MERCADO - h) * wMer;
  return h;
}

/* El camino de la venta: de la puerta del corral al frente del puesto. La curva
   da el rumbo (XZ); la altura se re-muestrea del terreno al caminar. */
const CAMINO = new THREE.CatmullRomCurve3(
  [
    [-8.0, -4.9],
    [-5.6, -3.4],
    [-2.6, -2.2],
    [0.6, -0.8],
    [3.2, 1.4],
    [5.4, 3.2],
    [6.6, 4.2],
  ].map(([x, z]) => new THREE.Vector3(x, altura(x, z), z)),
  false,
  'catmullrom',
  0.4,
);
const MUESTRAS_CAMINO = CAMINO.getPoints(56);
function distCamino(wx, wz) {
  let d2 = Infinity;
  for (const p of MUESTRAS_CAMINO) {
    const dx = p.x - wx;
    const dz = p.z - wz;
    const d = dx * dx + dz * dz;
    if (d < d2) d2 = d;
  }
  return Math.sqrt(d2);
}

/* Escenografía fija (posiciones deterministas de la geografía). El árbol
   grande del frente-centro es el árbol de la partida. */
const ARBOLES = [
  { pos: [-13.5, altura(-13.5, -9.5), -9.5], esc: 1.1, giro: 0.5 },
  { pos: [-2, altura(-2, -11), -11], esc: 1.3, giro: 1.4 },
  { pos: [9.5, altura(9.5, -9), -9], esc: 1.15, giro: 2.2 },
  { pos: [14, altura(14, -3), -3], esc: 0.95, giro: 0.9 },
  { pos: [-15, altura(-15, 3.5), 3.5], esc: 1.0, giro: 1.9 },
  { pos: [2.8, altura(2.8, -4.2), -4.2], esc: 1.45, giro: 0.3 }, // el árbol de la partida
];

/* Cerca del corral: postes y rieles sobre la terraza plana (H_CORRAL). El
   frente queda abierto a la derecha: por ahí sale la res al camino. */
const POSTES_CORRAL = [
  [-12.4, -8.5], [-11.2, -8.5], [-10, -8.5], [-8.8, -8.5], [-7.6, -8.5],
  [-12.4, -4.5], [-11.2, -4.5], [-10, -4.5],
  [-12.4, -7.2], [-12.4, -5.8],
  [-7.6, -7.2], [-7.6, -5.9],
];
const RIELES_CORRAL = [
  // [cx, cz, largo, giroY]
  [-10, -8.5, 4.9, 0],
  [-11.2, -4.5, 2.5, 0],
  [-12.4, -6.5, 4.1, Math.PI / 2],
  [-7.6, -7.2, 2.7, Math.PI / 2],
];

/* ── Timelines de los tres momentos (segundos desde el montaje) ──────────── */
const T_VENTA = { salida: 3.0, llegada: 14.5, fin: 18 };
const T_NAC = { aparece: 2.0, brinco: 4.6, fin: 8 };
const T_PART = { velo: 3.5, veloFin: 9, fin: 12 };

/* Marcas de cámara (posición / punto de mirada) de cada momento. */
const CAM_VALLE = /** @type {[number, number, number]} */ ([0.5, 9.2, 14.8]);
const MIRA_VALLE = /** @type {[number, number, number]} */ ([-0.5, 0.8, -1.5]);
const CAM_LLEGADA = /** @type {[number, number, number]} */ ([3.2, 2.3, 8.8]);
const MIRA_LLEGADA = /** @type {[number, number, number]} */ ([6.7, 1.0, 4.3]);

const POS_MADRE = /** @type {[number, number, number]} */ ([-6.3, altura(-6.3, -0.9), -0.9]);
const POS_CRIA = /** @type {[number, number, number]} */ ([-4.9, altura(-4.9, 0.3), 0.3]);
const ESC_CRIA = 0.55;
const CAM_NAC_INI = /** @type {[number, number, number]} */ ([-0.6, 3.8, 6.6]);
const CAM_NAC_FIN = /** @type {[number, number, number]} */ ([-2.5, 1.6, 3.5]);
const MIRA_NAC = /** @type {[number, number, number]} */ ([POS_CRIA[0], POS_CRIA[1] + 0.5, POS_CRIA[2]]);
const AREA_NIDO = /** @type {[number, number, number]} */ ([2.2, 1.6, 2.2]);

const POS_DESPEDIDA = /** @type {[number, number, number]} */ ([3.0, altura(3.0, -2.6), -2.6]);
const CAM_PART_INI = /** @type {[number, number, number]} */ ([7.2, 3.4, 2.6]);
const CAM_PART_FIN = /** @type {[number, number, number]} */ ([5.0, 1.9, 0.5]);
const CAM_PART_CIERRE = /** @type {[number, number, number]} */ ([6.6, 3.8, 3.4]);
const MIRA_PART = /** @type {[number, number, number]} */ ([POS_DESPEDIDA[0], POS_DESPEDIDA[1] + 0.8, POS_DESPEDIDA[2]]);
const MIRA_CIERRE = /** @type {[number, number, number]} */ ([POS_DESPEDIDA[0], POS_DESPEDIDA[1] + 0.25, POS_DESPEDIDA[2]]);
const AREA_VELO = /** @type {[number, number, number]} */ ([2.4, 2.6, 2.4]);

/* Chispas de ámbar de la llegada al puesto (XZ alrededor del mostrador). */
const CHISPAS = [
  [6.3, 4.0], [7.4, 4.1], [6.8, 5.1], [7.5, 4.8], [6.1, 4.7], [7.0, 3.8],
];

/* Temporales de módulo: cero asignaciones por frame. */
const V_POS = new THREE.Vector3();
const V_TAN = new THREE.Vector3();
const V_CAM = new THREE.Vector3();
const V_MIRA = new THREE.Vector3();
const V_TMP = new THREE.Vector3();

/* Malla del valle con colores por vértice: pradera con mechones al sol, la
   loma parda al fondo y la huella del camino pisada entre corral y mercado. */
function construirTerreno(seg, plano) {
  const nx = seg + 1;
  const nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cPasto = new THREE.Color(P.pasto);
  const cSol = new THREE.Color(P.pastoSol);
  const cCamino = new THREE.Color(P.camino);
  const cLoma = new THREE.Color(P.loma);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      pos[p] = wx;
      pos[p + 1] = altura(wx, wz);
      pos[p + 2] = wz;
      c.lerpColors(cPasto, cSol, 0.5 + 0.5 * suavizar(-0.6, 0.9, ruido(wx, wz)));
      c.lerp(cLoma, (1 - suavizar(-11, 0, wz)) * 0.45); // la loma del fondo
      c.lerp(cCamino, (1 - suavizar(0.55, 1.5, distCamino(wx, wz))) * 0.85);
      col[p] = c.r;
      col[p + 1] = c.g;
      col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iz = 0; iz < seg; iz++) {
    for (let ix = 0; ix < seg; ix++) {
      const a = iz * nx + ix;
      const b = a + 1;
      const d = a + nx;
      const e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  if (plano) geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  return geo;
}

/* Las luces de la hora dorada del kit (idéntico contrato que los mundos). */
function LucesDoradas() {
  return (
    <>
      <hemisphereLight intensity={DORADA.hemisferio} color={DORADA.cielo} groundColor={DORADA.suelo} />
      <ambientLight intensity={DORADA.ambiente} color={DORADA.luz} />
      <directionalLight position={/** @type {[number, number, number]} */ (DORADA.solPos)} intensity={DORADA.sol} color={DORADA.luz} />
      <directionalLight position={[-6, 4, -7]} intensity={DORADA.rellenoInt} color={DORADA.relleno} />
    </>
  );
}

/* El sol bajo con su halo: el ancla visual del atardecer (no ilumina). */
function SolBajo() {
  return (
    <group position={[10, 7.5, -14]}>
      <mesh>
        <circleGeometry args={[1.7, 40]} />
        <meshBasicMaterial color="#fff0cf" transparent opacity={0.95} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[3.1, 40]} />
        <meshBasicMaterial color={DORADA.luz} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[5.4, 40]} />
        <meshBasicMaterial color={DORADA.cielo} transparent opacity={0.13} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ── La res ANATÓMICA del sistema del hato (fincaRealista.geom): loft orgánico
      con sombreado horneado por vértice — no cajas apiladas ("la vaca
      cuadrada", veredicto del operador). Raza criolla: el caramelo campesino
      de la vereda, cuernos en lira y papada; la cría va mocha y sin ubre.
      Mira hacia +x. `articulada` entrega las patas como piezas sueltas con
      pivote en la cadera para que el andar las columpie de verdad.

      La res es PURAMENTE declarativa: expone sus partes animables por `name`
      (res-nucleo/cuerpo/cabeza/pata-N; la cola va horneada en el cuerpo y los
      momentos ya la tratan como opcional). El momento que la monta la
      envuelve en un <group ref>, resuelve las partes UNA vez fuera del render
      (resolverPartes, en efecto) y las anima en useFrame — así ningún ref
      cruza fronteras de componente (contrato react-hooks v6).

      Material PROPIO por res (no el MATERIAL_HATO compartido del valle): la
      partida desvanece por `opacity` recorriendo el subárbol y no puede
      arrastrar a otra res de la escena. `vertexColors` trae el pelaje y el AO
      horneados; el `color` multiplica el conjunto hacia la niebla dorada —
      la misma ley de coherencia del resto del mockup. ─────────────────────── */
const TINTE_RES = mezclar('#fffaf2', TINTE, 0.24);

/* Resuelve las partes animables de una res por nombre, DENTRO de su subárbol
   (dos reses en escena no se pisan). Llamar fuera del render y cachear. */
function resolverPartes(raiz) {
  if (!raiz) return null;
  return {
    raiz,
    nucleo: raiz.getObjectByName('res-nucleo'),
    cuerpo: raiz.getObjectByName('res-cuerpo'),
    cabeza: raiz.getObjectByName('res-cabeza'),
    cola: raiz.getObjectByName('res-cola'),
    patas: [0, 1, 2, 3].map((i) => raiz.getObjectByName(`res-pata-${i}`)),
  };
}

/** @param {{ position?: [number, number, number]; giro?: number; escala?: number; cria?: boolean; semilla?: number }} props */
function Vaca({ position = [0, 0, 0], giro = 0, escala = 1, cria = false, semilla = 3 }) {
  const geom = useMemo(
    () => geomVaca({ raza: 'criolla', ubre: !cria, cuerno: cria ? 0 : null, articulada: true }, semilla),
    [cria, semilla],
  );
  const material = useMemo(
    () => new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: true, // la partida desvanece; el resto del tiempo opacidad 1
      color: new THREE.Color(TINTE_RES),
    }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group name="res-nucleo" position={position} rotation={[0, giro, 0]} scale={escala}>
      {/* el torso y la cabeza comparten el squash & stretch */}
      <group name="res-cuerpo">
        <mesh geometry={geom.cuerpo} material={material} />
        <group name="res-cabeza" position={geom.pivote}>
          <mesh geometry={geom.cabeza} material={material} />
        </group>
      </group>
      {/* patas: pivotan en la cadera (el mesh cuelga del grupo) */}
      {(geom.patas ?? []).map((geo, i) => (
        <group
          key={i}
          name={`res-pata-${i}`}
          position={[geom.caderas?.[i]?.[0] ?? 0, geom.yCadera ?? 0, geom.caderas?.[i]?.[1] ?? 0]}
        >
          <mesh geometry={geo} material={material} />
        </group>
      ))}
    </group>
  );
}

/* Coloca la res sobre el camino en el parámetro u (0 = corral, 1 = puesto),
   orientada al rumbo, con el ciclo de marcha (bob + squash + patas diagonales
   + cabeceo) escalado por `andar` y la respiración por `resp`. Recibe las
   partes ya resueltas (resolverPartes); se llama solo fuera del render. */
function colocarVacaEnCamino(partes, u, andar = 0, fase = 0, resp = 0) {
  if (!partes || !partes.nucleo) return;
  const uu = clamp(u, 0, 1);
  CAMINO.getPointAt(uu, V_POS);
  V_POS.y = altura(V_POS.x, V_POS.z);
  partes.nucleo.position.copy(V_POS);
  CAMINO.getTangentAt(uu, V_TAN);
  partes.nucleo.rotation.y = Math.atan2(V_TAN.x, V_TAN.z) - Math.PI / 2; // mira a +x
  if (partes.cuerpo) {
    partes.cuerpo.position.y = Math.abs(Math.sin(fase)) * 0.05 * andar;
    partes.cuerpo.scale.y = 1 + Math.sin(fase * 2) * 0.03 * andar + resp;
  }
  if (partes.cabeza) partes.cabeza.rotation.z = Math.sin(fase + 0.6) * 0.08 * andar;
  partes.patas.forEach((pata, i) => {
    if (pata) pata.rotation.z = Math.sin(fase + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.5 * andar;
  });
  if (partes.cola) partes.cola.rotation.x = Math.sin(fase * 0.4) * 0.3;
}

/* ── Escenografía fija ───────────────────────────────────────────────────── */
function Corral() {
  return (
    <group>
      {POSTES_CORRAL.map(([x, z], i) => (
        <mesh key={i} position={[x, H_CORRAL + 0.55, z]}>
          <boxGeometry args={[0.12, 1.1, 0.12]} />
          <meshLambertMaterial color={P.madera} flatShading />
        </mesh>
      ))}
      {RIELES_CORRAL.map(([cx, cz, largo, giroY], i) => (
        <group key={i} position={[cx, H_CORRAL, cz]} rotation={[0, giroY, 0]}>
          {[0.5, 0.9].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <boxGeometry args={[largo, 0.07, 0.05]} />
              <meshLambertMaterial color={P.maderaClara} flatShading />
            </mesh>
          ))}
        </group>
      ))}
      {/* el portón, abierto hacia el camino: por aquí salió la res */}
      <group position={[-7.6, H_CORRAL, -5.9]} rotation={[0, -0.9, 0]}>
        {[0.5, 0.9].map((y) => (
          <mesh key={y} position={[0.7, y, 0]}>
            <boxGeometry args={[1.4, 0.07, 0.05]} />
            <meshLambertMaterial color={P.maderaClara} flatShading />
          </mesh>
        ))}
        <mesh position={[1.35, 0.7, 0]}>
          <boxGeometry args={[0.07, 0.6, 0.07]} />
          <meshLambertMaterial color={P.madera} flatShading />
        </mesh>
      </group>
    </group>
  );
}

function CanastoFruta({ pos, esc = 1, semilla = 5 }) {
  const frutas = useMemo(() => {
    const rng = crearRng(semilla);
    return Array.from({ length: 7 }, () => ({
      x: (rng() - 0.5) * 0.26,
      z: (rng() - 0.5) * 0.26,
      y: rng() * 0.05,
      s: 0.75 + rng() * 0.5,
    }));
  }, [semilla]);
  return (
    <group position={pos} scale={esc}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.24, 0.17, 0.32, 10, 1, true]} />
        <meshLambertMaterial color={P.canasto} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.03, 10]} />
        <meshLambertMaterial color={P.canasto} flatShading />
      </mesh>
      {frutas.map((f, i) => (
        <mesh key={i} position={[f.x, 0.3 + f.y, f.z]} scale={f.s}>
          <sphereGeometry args={[0.07, 6, 5]} />
          <meshLambertMaterial color={P.fruta} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* El puesto del mercado: mesón con faldón, toldo teja a un agua, canastos con
   fruta y un cajón. Construido mirando a +z; el giro lo orienta al camino. */
function PuestoMercado({ pos, giro }) {
  return (
    <group position={pos} rotation={[0, giro, 0]}>
      {[[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.7], [1.2, 0.7]].map((q, i) => (
        <mesh key={i} position={[q[0], 1.05, q[1]]}>
          <boxGeometry args={[0.09, 2.1, 0.09]} />
          <meshLambertMaterial color={P.madera} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.78, 0.15]}>
        <boxGeometry args={[2.2, 0.12, 1.0]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
      <mesh position={[0, 0.45, 0.62]}>
        <boxGeometry args={[2.2, 0.6, 0.06]} />
        <meshLambertMaterial color={P.tela} flatShading />
      </mesh>
      {/* toldo a un agua, teja cálida */}
      <mesh position={[0, 2.2, 0.1]} rotation={[-0.35, 0, 0]}>
        <planeGeometry args={[2.7, 1.8]} />
        <meshLambertMaterial color={P.toldo} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.52, -0.74]}>
        <boxGeometry args={[2.7, 0.07, 0.07]} />
        <meshLambertMaterial color={P.madera} flatShading />
      </mesh>
      <CanastoFruta pos={[-0.6, 0.84, 0.2]} esc={0.9} semilla={51} />
      <CanastoFruta pos={[0.55, 0.84, 0.05]} esc={0.8} semilla={57} />
      <mesh position={[1.6, 0.2, 0.9]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.5, 0.4, 0.4]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
    </group>
  );
}

/* Casita encalada del pueblo, detrás del puesto: contexto, no protagonista. */
function Casita({ pos, giro }) {
  return (
    <group position={pos} rotation={[0, giro, 0]}>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[2.6, 1.8, 2.2]} />
        <meshLambertMaterial color={P.cal} flatShading />
      </mesh>
      <mesh position={[0.6, 0.5, 1.11]}>
        <boxGeometry args={[0.5, 1.0, 0.06]} />
        <meshLambertMaterial color={P.maderaOscura} flatShading />
      </mesh>
      <mesh position={[-0.6, 1.0, 1.11]}>
        <boxGeometry args={[0.5, 0.5, 0.06]} />
        <meshLambertMaterial color={P.maderaOscura} flatShading />
      </mesh>
      <mesh position={[0, 2.15, -0.62]} rotation={[-0.55, 0, 0]}>
        <planeGeometry args={[3.0, 1.6]} />
        <meshLambertMaterial color={P.teja} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.15, 0.62]} rotation={[0.55, 0, 0]}>
        <planeGeometry args={[3.0, 1.6]} />
        <meshLambertMaterial color={P.teja} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.56, 0]}>
        <boxGeometry args={[3.0, 0.07, 0.07]} />
        <meshLambertMaterial color={P.maderaOscura} flatShading />
      </mesh>
    </group>
  );
}

function Arbol({ pos, esc = 1, giro = 0 }) {
  return (
    <group position={pos} scale={esc} rotation={[0, giro, 0]}>
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.14, 0.24, 2.6, 7]} />
        <meshLambertMaterial color={P.tronco} flatShading />
      </mesh>
      <mesh position={[0, 3.0, 0]} scale={[1.5, 1.0, 1.5]}>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshLambertMaterial color={P.copa} flatShading />
      </mesh>
      <mesh position={[0.9, 3.3, 0.3]} scale={[1.0, 0.8, 1.0]}>
        <icosahedronGeometry args={[0.9, 1]} />
        <meshLambertMaterial color={P.copaSol} flatShading />
      </mesh>
      <mesh position={[-0.85, 3.2, -0.35]} scale={[0.95, 0.75, 0.95]}>
        <icosahedronGeometry args={[0.9, 1]} />
        <meshLambertMaterial color={P.copa} flatShading />
      </mesh>
    </group>
  );
}

/* Silueta campesina quieta (presencia humana, también en reduced-motion). */
function FiguraCampesina({ pos, giro = 0, ruana = '#c8b48c' }) {
  return (
    <group position={pos} rotation={[0, giro, 0]}>
      {[-0.09, 0.09].map((dx) => (
        <mesh key={dx} position={[dx, 0.34, 0]}>
          <cylinderGeometry args={[0.06, 0.055, 0.68, 6]} />
          <meshLambertMaterial color={P.maderaOscura} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.92, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.58, 8]} />
        <meshLambertMaterial color={ruana} flatShading />
      </mesh>
      <mesh position={[0, 1.32, 0]}>
        <sphereGeometry args={[0.125, 8, 6]} />
        <meshLambertMaterial color={P.piel} flatShading />
      </mesh>
      <mesh position={[0, 1.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.26, 14]} />
        <meshLambertMaterial color={P.maderaClara} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.48, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.13, 10]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
    </group>
  );
}

/* Mechones de pasto instanciados (1 draw call), sembrados deterministas fuera
   del camino y de las terrazas. Conteo por tier. */
function MatasPasto({ tier }) {
  const ref = useRef(null);
  const n = tier === 'alto' ? 90 : tier === 'medio' ? 54 : 26;
  const sitios = useMemo(() => {
    const rng = crearRng(77);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 30) {
      intentos += 1;
      const wx = (rng() - 0.5) * (ANCHO - 4);
      const wz = (rng() - 0.5) * (FONDO - 4);
      if (distCamino(wx, wz) < 1.4) continue;
      if (Math.hypot(wx - C_CORRAL[0], wz - C_CORRAL[1]) < 3.6) continue;
      if (Math.hypot(wx - C_MERCADO[0], wz - C_MERCADO[1]) < 3.2) continue;
      lista.push({
        wx,
        wz,
        y: altura(wx, wz),
        esc: 0.5 + rng() * 0.9,
        giro: rng() * Math.PI * 2,
        tono: rng(),
      });
    }
    return lista;
  }, [n]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinta = new THREE.Color();
    const base = new THREE.Color(P.pasto);
    const sol = new THREE.Color(P.pastoSol);
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y + 0.09 * s.esc, s.wz);
      dummy.rotation.set(0, s.giro, 0);
      dummy.scale.set(s.esc, s.esc * 0.7, s.esc);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tinta.lerpColors(base, sol, s.tono);
      m.setColorAt(i, tinta);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [sitios]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
      <icosahedronGeometry args={[0.26, 0]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* ── MOMENTO 1: LA VENTA — establishing, travesía y llegada al puesto. ───── */
function MomentoVenta({ reducedMotion, alTerminar }) {
  const vacaRef = useRef(null);
  const partesRef = useRef(null); // caché de resolverPartes (fuera del render)
  const halo = useRef(null);
  const chispas = useRef([]);
  const miraRef = useRef(new THREE.Vector3(...MIRA_VALLE));
  const tRef = useRef(0);
  const finRef = useRef(false);
  const camara = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    tRef.current = 0;
    finRef.current = false;
    const partes = resolverPartes(vacaRef.current);
    partesRef.current = partes;
    if (reducedMotion) {
      /* tableau final: la res ya llegó al puesto, halo sereno */
      colocarVacaEnCamino(partes, 1);
      camara.position.set(...CAM_LLEGADA);
      miraRef.current.set(...MIRA_LLEGADA);
      camara.lookAt(miraRef.current);
      if (halo.current) halo.current.material.opacity = 0.28;
      invalidate();
      return;
    }
    /* corte de cámara al establishing del valle y la res en la puerta */
    colocarVacaEnCamino(partes, 0);
    camara.position.set(...CAM_VALLE);
    miraRef.current.set(...MIRA_VALLE);
    camara.lookAt(miraRef.current);
  }, [camara, invalidate, reducedMotion]);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const dt = Math.min(delta, 0.1);
    const t = (tRef.current += dt);

    /* la travesía: u avanza con smoothstep (arranque y frenada suaves) */
    const p = suavizar(T_VENTA.salida, T_VENTA.llegada, t);
    const andar = suavizar(0.001, 0.05, p) * (1 - suavizar(0.95, 0.999, p));
    const resp = Math.sin(t * 1.9) * 0.012; // la línea que respira
    colocarVacaEnCamino(partesRef.current, p, andar, t * 7.5, resp);

    /* cámara: establishing → seguimiento con damp → plano de llegada */
    if (t < T_VENTA.salida) {
      V_CAM.set(...CAM_VALLE);
      V_MIRA.set(...MIRA_VALLE);
    } else if (t < T_VENTA.llegada + 0.6) {
      V_CAM.set(V_POS.x + 2.6, V_POS.y + 2.1, V_POS.z + 4.3);
      V_MIRA.set(V_POS.x, V_POS.y + 0.7, V_POS.z);
    } else {
      V_CAM.set(...CAM_LLEGADA);
      V_MIRA.set(...MIRA_LLEGADA);
    }
    camara.position.lerp(V_CAM, amortiguacion(t < T_VENTA.salida + 1.5 ? 1.1 : 2.4, dt));
    miraRef.current.lerp(V_MIRA, amortiguacion(2.8, dt));
    camara.lookAt(miraRef.current);

    /* la fiesta amable de la llegada: halo que respira y chispas de ámbar */
    const fiesta = suavizar(T_VENTA.llegada - 0.3, T_VENTA.llegada + 1.0, t);
    if (halo.current) {
      halo.current.material.opacity = fiesta * (0.26 + 0.12 * Math.sin(t * 2.4));
      halo.current.scale.setScalar(0.9 + fiesta * (0.15 + 0.05 * Math.sin(t * 2.4)));
    }
    chispas.current.forEach((m, i) => {
      const f = (t * 0.5 + i * 0.19) % 1;
      m.position.y = H_MERCADO + 0.3 + f * 1.5;
      m.material.opacity = fiesta * Math.sin(Math.PI * f) * 0.8;
    });

    if (!finRef.current && t > T_VENTA.fin) {
      finRef.current = true;
      alTerminar();
    }
  });

  return (
    <group>
      <group ref={vacaRef}>
        <Vaca semilla={11} />
      </group>
      <mesh
        ref={halo}
        position={[6.9, H_MERCADO + 0.06, 4.5]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.8, 1.15, 30]} />
        <meshBasicMaterial color={P.luzRito} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      {CHISPAS.map((c, i) => (
        <mesh
          key={i}
          position={[c[0], H_MERCADO + 0.4, c[1]]}
          ref={(el) => {
            if (el) chispas.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.06, 6, 5]} />
          <meshBasicMaterial color={PALETA.ambar} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

/* ── MOMENTO 2: EL NACIMIENTO — pop elástico, brinco y respiración. ──────── */
function MomentoNacimiento({ tier, reducedMotion, alTerminar }) {
  const madreRef = useRef(null);
  const criaRef = useRef(null);
  const madrePartes = useRef(null);
  const criaPartes = useRef(null);
  const miraRef = useRef(new THREE.Vector3(...MIRA_NAC));
  const tRef = useRef(0);
  const finRef = useRef(false);
  const camara = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    tRef.current = 0;
    finRef.current = false;
    madrePartes.current = resolverPartes(madreRef.current);
    const pc = resolverPartes(criaRef.current);
    criaPartes.current = pc;
    if (reducedMotion) {
      /* tableau: la cría ya está en pie junto a su madre */
      if (pc && pc.nucleo) pc.nucleo.scale.setScalar(ESC_CRIA);
      camara.position.set(...CAM_NAC_FIN);
      miraRef.current.set(...MIRA_NAC);
      camara.lookAt(miraRef.current);
      invalidate();
      return;
    }
    if (pc && pc.nucleo) pc.nucleo.scale.setScalar(0.0001);
    camara.position.set(...CAM_NAC_INI);
    miraRef.current.set(...MIRA_NAC);
    camara.lookAt(miraRef.current);
  }, [camara, invalidate, reducedMotion]);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const dt = Math.min(delta, 0.1);
    const t = (tRef.current += dt);

    /* la madre respira y se vuelve hacia la cría; luego la olfatea */
    const pm = madrePartes.current;
    if (pm && pm.cuerpo) pm.cuerpo.scale.y = 1 + Math.sin(t * 1.7) * 0.018;
    if (pm && pm.cabeza) {
      pm.cabeza.rotation.y = 0.35 * suavizar(T_NAC.aparece, T_NAC.aparece + 1, t);
      pm.cabeza.rotation.z = -0.35 * Math.sin(Math.PI * suavizar(5, 7, t));
    }
    if (pm && pm.cola) pm.cola.rotation.x = Math.sin(t * 1.1) * 0.22;

    /* la cría: overshoot elástico + squash & stretch con volumen conservado */
    const pc = criaPartes.current;
    const g = pc && pc.nucleo;
    if (g) {
      const x = clamp((t - T_NAC.aparece) / 1.15, 0, 1);
      const s = t < T_NAC.aparece ? 0.0001 : reboteElastico(x);
      const sy = 1 + (s - 1) * 1.7; // el estirón vertical del pop
      const sxz = 1 - (s - 1) * 0.9; // ... a costa del ancho (rubber-hose)

      /* el brinco de la alegría, con squash al aterrizar */
      let hop = 0;
      let sy2 = 1;
      const q = (t - T_NAC.brinco) / 0.7;
      if (q > 0 && q < 1) {
        hop = Math.sin(Math.PI * q) * 0.24;
        sy2 = 1 + 0.22 * Math.sin(Math.PI * q);
      } else if (q >= 1 && q < 1.4) {
        sy2 = 1 - 0.26 * Math.sin(Math.PI * ((q - 1) / 0.4));
      }
      const sxz2 = 2 - sy2; // conservación de volumen aproximada

      const resp = x >= 1 ? 0.035 * Math.sin(t * 3.2) : 0; // respira más rápido: es chiquita
      g.position.y = POS_CRIA[1] + hop;
      g.scale.set(
        ESC_CRIA * Math.max(0.0001, sxz * sxz2),
        ESC_CRIA * Math.max(0.0001, s <= 0 ? 0.0001 : sy * sy2 * (1 + resp)),
        ESC_CRIA * Math.max(0.0001, sxz * sxz2),
      );
      /* coletazo alegre y pataditas tímidas ya de pie */
      if (pc.cola) pc.cola.rotation.x = Math.sin(t * 5) * 0.45 * (x >= 1 ? 1 : 0);
      pc.patas.forEach((pata, i) => {
        if (pata) pata.rotation.z = Math.sin(t * 4.2 + i * 1.7) * 0.1 * (x >= 1 ? 1 : 0);
      });
    }

    /* cámara: acercamiento lento hacia la cría (push-in) */
    V_TMP.set(...CAM_NAC_FIN);
    V_CAM.set(...CAM_NAC_INI).lerp(V_TMP, suavizar(0.4, 6, t));
    camara.position.lerp(V_CAM, amortiguacion(1.6, dt));
    V_MIRA.set(...MIRA_NAC);
    miraRef.current.lerp(V_MIRA, amortiguacion(2.4, dt));
    camara.lookAt(miraRef.current);

    if (!finRef.current && t > T_NAC.fin) {
      finRef.current = true;
      alTerminar();
    }
  });

  return (
    <group>
      <group ref={madreRef}>
        <Vaca position={POS_MADRE} giro={0.55} semilla={19} />
      </group>
      <group ref={criaRef}>
        <Vaca position={POS_CRIA} giro={-2.5} escala={reducedMotion ? ESC_CRIA : 0.0001} cria semilla={23} />
      </group>
      {/* el aire celebra bajito: luciérnagas tibias alrededor del nido */}
      <ParticulasAmbientales
        tipo="luciernagas"
        densidad={0.5}
        tier={tier}
        reducedMotion={reducedMotion}
        position={/** @type {[number, number, number]} */ ([POS_CRIA[0], POS_CRIA[1] + 0.2, POS_CRIA[2]])}
        area={/** @type {[number, number, number]} */ (AREA_NIDO)}
        semilla={29}
      />
    </group>
  );
}

/* ── MOMENTO 3: LA PARTIDA — fade digno bajo el árbol grande, sin gore. ──── */
function MomentoPartida({ tier, reducedMotion, alTerminar }) {
  const vacaRef = useRef(null);
  const partesRef = useRef(null);
  const anillo = useRef(null);
  const velo = useRef(null);
  const faseResp = useRef(0);
  const miraRef = useRef(new THREE.Vector3(...MIRA_PART));
  const tRef = useRef(0);
  const finRef = useRef(false);
  const camara = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    tRef.current = 0;
    finRef.current = false;
    faseResp.current = 0;
    partesRef.current = resolverPartes(vacaRef.current);
    if (reducedMotion) {
      /* tableau sereno: la res entera bajo el árbol, el anillo apenas presente */
      camara.position.set(...CAM_PART_FIN);
      miraRef.current.set(...MIRA_PART);
      camara.lookAt(miraRef.current);
      if (anillo.current) anillo.current.material.opacity = 0.2;
      invalidate();
      return;
    }
    camara.position.set(...CAM_PART_INI);
    miraRef.current.set(...MIRA_PART);
    camara.lookAt(miraRef.current);
  }, [camara, invalidate, reducedMotion]);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const dt = Math.min(delta, 0.1);
    const t = (tRef.current += dt);
    const fadeP = suavizar(T_PART.velo, T_PART.veloFin, t);

    /* la respiración se aquieta (frecuencia y amplitud bajan juntas) */
    faseResp.current += dt * (1.7 - 1.1 * fadeP);
    const partes = partesRef.current;
    if (partes && partes.cuerpo) {
      partes.cuerpo.scale.y = 1 + Math.sin(faseResp.current) * 0.018 * (1 - fadeP);
    }
    if (partes && partes.cabeza) partes.cabeza.rotation.z = -0.22 * fadeP; // baja la cabeza, serena
    /* el desvanecimiento digno: toda la res, pareja */
    if (partes && partes.nucleo) {
      const opacidad = 1 - fadeP;
      partes.nucleo.traverse((o) => {
        if (o.isMesh) o.material.opacity = opacidad;
      });
      partes.nucleo.visible = opacidad > 0.004;
    }

    /* el anillo tibio en el pasto: se enciende y se queda velando */
    if (anillo.current) {
      anillo.current.material.opacity = suavizar(1, 3, t) * (0.18 + 0.1 * Math.sin(t * 1.2));
    }
    /* el velo de luz que sube mientras ella se va */
    if (velo.current) {
      velo.current.rotation.y = t * 0.15;
      const brillo =
        Math.sin(Math.PI * clamp((t - T_PART.velo + 0.5) / (T_PART.veloFin - T_PART.velo + 2), 0, 1)) * 0.14;
      velo.current.children.forEach((m) => {
        m.material.opacity = brillo;
      });
    }

    /* cámara: dolly lento y respetuoso; al final, un paso atrás */
    if (t < T_PART.veloFin + 0.5) {
      V_TMP.set(...CAM_PART_FIN);
      V_CAM.set(...CAM_PART_INI).lerp(V_TMP, suavizar(0.3, T_PART.veloFin, t));
      V_MIRA.set(...MIRA_PART);
    } else {
      V_CAM.set(...CAM_PART_CIERRE);
      V_MIRA.set(...MIRA_CIERRE);
    }
    camara.position.lerp(V_CAM, amortiguacion(1.1, dt));
    miraRef.current.lerp(V_MIRA, amortiguacion(1.8, dt));
    camara.lookAt(miraRef.current);

    if (!finRef.current && t > T_PART.fin) {
      finRef.current = true;
      alTerminar();
    }
  });

  return (
    <group>
      <group ref={vacaRef}>
        <Vaca position={POS_DESPEDIDA} giro={2.4} semilla={31} />
      </group>
      <mesh
        ref={anillo}
        position={[POS_DESPEDIDA[0], POS_DESPEDIDA[1] + 0.06, POS_DESPEDIDA[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.9, 1.3, 32]} />
        <meshBasicMaterial color={P.luzRito} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      {/* dos planos cruzados aditivos: el velo de luz, jamás un rayo duro */}
      <group ref={velo} position={[POS_DESPEDIDA[0], POS_DESPEDIDA[1] + 1.4, POS_DESPEDIDA[2]]}>
        {[0, Math.PI / 2].map((ry) => (
          <mesh key={ry} rotation={[0, ry, 0]}>
            <planeGeometry args={[1.5, 2.8]} />
            <meshBasicMaterial color={P.luzRito} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      {/* el polen sube con ella: presencia que se despide */}
      <ParticulasAmbientales
        tipo="polen"
        densidad={0.6}
        tier={tier}
        reducedMotion={reducedMotion}
        position={/** @type {[number, number, number]} */ ([POS_DESPEDIDA[0], POS_DESPEDIDA[1] + 0.4, POS_DESPEDIDA[2]])}
        area={/** @type {[number, number, number]} */ (AREA_VELO)}
        semilla={41}
      />
    </group>
  );
}

/* La escena completa de un momento (grupo r3f; el default la monta en su Canvas). */
function EscenaMomento({ momento, tier, reducedMotion, alTerminar }) {
  const perfil = perfilDeTier(tier);
  const geo = useMemo(
    () => construirTerreno(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <>
      <color attach="background" args={[DORADA.fondo]} />
      {perfil.fog && <fog attach="fog" args={[DORADA.niebla, DORADA.nieblaCerca + 4, DORADA.nieblaLejos + 4]} />}
      <LucesDoradas />
      <SolBajo />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* el valle de siempre: corral, camino, puesto, casita, árboles, gente */}
      <Corral />
      <PuestoMercado pos={[C_MERCADO[0], H_MERCADO, C_MERCADO[1]]} giro={-2.35} />
      <Casita pos={[11.6, altura(11.6, 7.8), 7.8]} giro={-2.5} />
      {ARBOLES.map((a, i) => (
        <Arbol key={i} pos={a.pos} esc={a.esc} giro={a.giro} />
      ))}
      <MatasPasto tier={tier} />
      <FiguraCampesina pos={[-8.7, altura(-8.7, -4.0), -4.0]} giro={0.9} ruana={P.ruana} />
      <FiguraCampesina pos={[8.2, altura(8.2, 5.6), 5.6]} giro={-2.35} ruana={P.ruanaVerde} />

      {momento === 'venta' && <MomentoVenta reducedMotion={reducedMotion} alTerminar={alTerminar} />}
      {momento === 'nacimiento' && (
        <MomentoNacimiento tier={tier} reducedMotion={reducedMotion} alTerminar={alTerminar} />
      )}
      {momento === 'partida' && (
        <MomentoPartida tier={tier} reducedMotion={reducedMotion} alTerminar={alTerminar} />
      )}

      {/* el aire compartido de la hora dorada */}
      <ParticulasAmbientales tipo="polen" tier={tier} reducedMotion={reducedMotion} position={[0, 1, -1]} semilla={17} />
      <ParticulasAmbientales
        tipo="mariposas"
        densidad={0.6}
        tier={tier}
        reducedMotion={reducedMotion}
        position={[-1, 1.1, 0]}
        semilla={37}
      />
    </>
  );
}

/* Estilos de ESTA vitrina (chrome DOM sobre el Canvas). */
const CSS_MOMENTO = `
.momento3d-root { position: relative; width: 100%; height: 100dvh; min-height: 320px; overflow: hidden; background: ${DORADA.fondo}; }
.momento3d-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.momento3d-canvas--lista { opacity: 1; }
.momento3d-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.momento3d-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #4a3418; text-shadow: 0 1px 8px rgba(255,244,214,0.7); font: 700 1.18rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.momento3d-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.82; margin-top: 0.15rem; }
.momento3d-pie { padding: 0 1rem 0.9rem; display: flex; flex-direction: column; align-items: center; gap: 0.55rem; }
.momento3d-selector { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.45rem; }
.momento3d-leyenda { color: #4a3418; font: 600 0.8rem/1.1 system-ui, sans-serif; text-shadow: 0 1px 6px rgba(255,244,214,0.7); }
.momento3d-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(74,52,24,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(255,247,228,0.82); color: #5a3f1c; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.momento3d-boton:hover, .momento3d-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(74,52,24,0.6); outline: none; }
.momento3d-boton[aria-pressed='true'] { background: #ffe8b0; border-color: rgba(90,63,28,0.75); color: #4a3418; }
.momento3d-carta { margin: 0; max-width: 34rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(74,52,24,0.62); backdrop-filter: blur(3px); color: #fbf3e2; font: 500 0.8rem/1.5 system-ui, sans-serif; }
@media (prefers-reduced-motion: reduce) { .momento3d-canvas { transition: none; } }
`;

/* La copia de cada momento (usted cordial), y su cierre cuando termina. */
const COPY = {
  venta:
    'La res sale del corral, baja por el camino del valle y llega al puesto del mercado. Acompáñela con la mirada: vender bien, con calma, también es cuidar la finca.',
  nacimiento:
    'Ha llegado una cría a la pradera. Véala levantarse a su ritmo, con esa fuerza tierna de lo recién nacido, al lado de su madre.',
  partida:
    'Toda vida en la finca cierra su ciclo. Despídala con gratitud y sin afán: lo que ella dio se queda en la tierra y en la memoria del hato.',
};
const COPY_FIN = {
  venta: 'Negocio hecho, con calma y a buen precio. La res quedó en buenas manos.',
  nacimiento: 'La cría ya está en pie. Ahora, a cuidarla con paciencia.',
  partida: 'Gracias por lo dado. El valle la despide en silencio.',
};
const MOMENTOS = [
  { id: 'venta', rotulo: 'de la venta' },
  { id: 'nacimiento', rotulo: 'del nacimiento' },
  { id: 'partida', rotulo: 'de la partida' },
];

/**
 * MomentoVentaMercado3D — los momentos del hato (venta / nacimiento / partida)
 * como cinemáticas cortas con cámara dirigida, montable con su propio
 * `<Canvas>`. Sin lógica de negocio: es una vitrina
 * (#/mockups/momento-venta-mercado-3d). Tier y reduced-motion se detectan aquí
 * (mockup standalone, mismo patrón que MundoCafe3D).
 */
function MomentoVentaMercado3D() {
  const [listo, setListo] = useState(false);
  const [momento, setMomento] = useState('venta');
  const [intento, setIntento] = useState(0);
  const [terminado, setTerminado] = useState(false);
  const [{ tier, reducedMotion }] = useState(() => decidirTier());
  const perfil = perfilDeTier(tier);

  const alTerminar = useCallback(() => setTerminado(true), []);
  /* elegir re-monta la escena (key) — así el momento arranca de cero */
  const elegir = (id) => {
    setMomento(id);
    setIntento((n) => n + 1);
    setTerminado(false);
  };

  return (
    <section
      className="momento3d-root"
      data-tier={tier}
      aria-label="Los momentos del hato: la venta, el nacimiento y la partida de una res, contados en 3D"
    >
      <style>{CSS_MOMENTO}</style>
      <Canvas
        className={`momento3d-canvas${listo ? ' momento3d-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: /** @type {[number, number, number]} */ (CAM_VALLE), fov: 44 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <EscenaMomento
          key={`${momento}:${intento}`}
          momento={momento}
          tier={tier}
          reducedMotion={reducedMotion}
          alTerminar={alTerminar}
        />
      </Canvas>

      <div className="momento3d-chrome">
        <h2 className="momento3d-titulo">
          Momentos del hato
          <small>La venta, el nacimiento y la partida — el mismo valle, contado con calma</small>
        </h2>
        <div className="momento3d-pie">
          <div className="momento3d-selector" role="group" aria-label="Vea el momento">
            <span className="momento3d-leyenda" aria-hidden="true">
              Vea el momento
            </span>
            {MOMENTOS.map((m) => (
              <button
                key={m.id}
                type="button"
                className="momento3d-boton"
                aria-pressed={momento === m.id}
                aria-label={`Vea el momento ${m.rotulo}`}
                onClick={() => elegir(m.id)}
              >
                {m.rotulo}
              </button>
            ))}
            {terminado && !reducedMotion && (
              <button type="button" className="momento3d-boton" onClick={() => elegir(momento)}>
                Ver de nuevo
              </button>
            )}
          </div>
          <p className="momento3d-carta" role="status">
            {terminado ? COPY_FIN[momento] : COPY[momento]}
          </p>
        </div>
      </div>
    </section>
  );
}

export default MomentoVentaMercado3D;
