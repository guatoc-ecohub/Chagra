/*
 * MundoParamo3D — el BOSQUE ALTOANDINO / PÁRAMO: el ecosistema de la niebla.
 *
 * No es paisaje decorativo: es la FÁBRICA DE AGUA de Colombia contada en 3D.
 * Los frailejones (Espeletia) atrapan la niebla con sus hojas velludas; el
 * musgo y la turba la guardan como una esponja; y del hondón, gota a gota,
 * NACE el agua que baja a las veredas. La escena existe para que se entienda
 * —sin una sola cifra— por qué el páramo se cuida: si se seca, se seca el río.
 *
 * DIRECCIÓN DE ARTE — PASADA 2 (dentro del framework, entintado hacia el frío):
 *   - La atmósfera es la BRUMA FRÍA ALTOANDINA: el CONTRASTE deliberado con la
 *     hora dorada del valle. Se deriva del preset `CIELOS_HORA.dorada` (su
 *     presupuesto de luz) entintando cada color hacia el azul-plata con la propia
 *     `mezclaHex` del kit; la luz se aplana (sol débil velado, mucho ambiente) y
 *     la niebla se cierra. Entrar al páramo se siente como SUBIR: del atardecer
 *     tibio a la neblina húmeda y fría de los 3.500 m.
 *   - Los materiales salen de `PALETA`/hexes de planta, entintados hacia la
 *     niebla FRÍA con `mezclar` — la ley de coherencia del framework. La
 *     identidad plateada del páramo (frailejón, musgo, roca) se refuerza.
 *   - El rocío/llovizna frío en suspensión es un `RocioFrio` local (páramo puro):
 *     puntos azul-plata que caen despacio, la humedad del aire hecha visible.
 *
 * PASADA 3 — LA GUARDIANA (el páramo espectacular al entrar):
 *   - LA QUEÑUA GUARDIANA: el Ent-queñua REAL del Bosque Vivo (`EntQuenua`,
 *     mallas three con rostro tallado, barba de usnea y brazos) se alza
 *     MONUMENTAL sobre un altozano al fondo del cuadro. No se duplica nada:
 *     es el mismo guardián, aquí en su casa de origen, el páramo.
 *   - RAYOS DE LUZ: haces volumétricos (quads aditivos con gradiente
 *     procedural, cero texturas externas) que se cuelan entre la niebla fría
 *     y bañan a la guardiana — la luz de catedral del páramo.
 *   - SUELO CALIBRE-SWITCH: el terreno low-poly gana manchas de prado, y un
 *     SENDERO de tierra con piedras-losa que serpentea desde el hondón hasta
 *     los pies de la queñua (la línea que guía el ojo del paneo).
 *   - PANEO DE ENTRADA: la cámara abre en el ROSTRO de la guardiana, barre el
 *     frailejonal y se asienta en el plano general. reduced-motion lo salta.
 *
 * ECOSISTEMA (low-poly, cada pieza con propósito didáctico):
 *   - Frailejones : el héroe. Tallo velludo de hojas marcescentes + roseta
 *     plateada; los cercanos florecen amarillo. Campo instanciado (2 draw calls)
 *     + un frailejón protagonista con detalle, junto al nacimiento.
 *   - Pajonal     : la paja del páramo, macollas dobladas por el viento
 *     (instanciadas, 1 draw call).
 *   - Musgo       : cojines de musgo, las esponjas que guardan el agua
 *     (instanciados).
 *   - Quenuas     : árboles de páramo (Polylepis) de tronco rojizo papiroso;
 *     la niebla se les engancha en las copas.
 *   - Niebla      : el `fog` de la hora dorada + jirones que se enganchan y
 *     derivan despacio entre los árboles.
 *   - Nacimiento  : el hondón húmedo donde brota el agua — laguna que espeja el
 *     cielo, piedras y un halo que respira. El botón didáctico lo enciende.
 *   - Aves         : un cóndor que planea alto y aves pequeñas del páramo; una
 *     posada en la piedra para la lectura en calma (reduced-motion no las vuela).
 *   - Danta        : la danta de páramo (Tapirus pinchaque), la vecina grande
 *     del frailejonal — el SVG rubber-hose de la casa (Danta.jsx) como
 *     billboard <Html>, pastando entre los frailejones con su reloj de vida
 *     (pasea / husmea con la trompa en periscopio / reposa).
 *
 * RENDIMIENTO: frailejones/paja/musgo instanciados (pocos draw calls), un Points
 * para el polen, materiales Lambert sin shadow-map. Presupuestos por
 * `perfilDeTier`; `reducedMotion` congela deriva de niebla, oleaje y vuelo y
 * pasa el frameloop a demanda. Gama baja cae al 2D digno antes de montar esto.
 *
 * Ruta mockup: #/mockups/mundo-paramo-3d (cableada en App.jsx, sin auth).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Html } from '@react-three/drei';
import { Danta } from '../visual/creatures/Danta.jsx';
import { BarbuditoParamo } from '../visual/creatures/BarbuditoParamo.jsx';
import EntQuenua from '../visual/mundo3d/bosque/EntQuenua.jsx';
import {
  CorteSuelo,
  CSS_ROTULOS,
  CORTE_POS as CORTE_POS_EM,
} from '../visual/mundo3d/bosque/EscenaEntMaestro.jsx';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CIELOS_HORA, mezclaHex } from '../visual/mundo3d/cielosHoraData.js';
import { PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { crearRng } from '../visual/mundo3d/particulasData.js';

/* LA BRUMA FRÍA DEL PÁRAMO (pasada 2) — el CONTRASTE deliberado con la hora
   dorada del valle. El páramo altoandino no vive el atardecer tibio: vive su
   propia atmósfera húmeda, azul-plata y encapotada, a 3.500 m. Para no salirnos
   del kit, partimos del PRESUPUESTO DE LUZ de la hora madre (`CIELOS_HORA.dorada`)
   y entintamos cada color hacia el azul-plata frío con la propia `mezclaHex` del
   framework: misma lógica de luz (hemisferio + ambiente + sol + relleno), piel
   fría. Además la luz se aplana (más ambiente, sol débil velado por nube) y la
   niebla se cierra: el páramo se siente mojado, alto y frío. */
const FRIO = '#b7c9d6'; // el azul-plata de la niebla altoandina, el norte de todo
const AZUL_HONDO = '#8ba0b4'; // el fondo frío de las cuchillas lejanas
const ATMO = {
  ...CIELOS_HORA.dorada,
  fondo: mezclaHex(CIELOS_HORA.dorada.fondo, FRIO, 0.86),
  cielo: mezclaHex(CIELOS_HORA.dorada.cielo, '#a6bccd', 0.82),
  suelo: mezclaHex(CIELOS_HORA.dorada.suelo, '#586460', 0.58),
  luz: mezclaHex(CIELOS_HORA.dorada.luz, '#dcebf1', 0.74), // sol difuso, casi blanco-azul
  relleno: mezclaHex(CIELOS_HORA.dorada.relleno, AZUL_HONDO, 0.5),
  niebla: mezclaHex(CIELOS_HORA.dorada.niebla, FRIO, 0.88), // la bruma, el alma de la escena
  sombra: mezclaHex(CIELOS_HORA.dorada.sombra, '#242f39', 0.62),
  // luz de páramo encapotado: mucho ambiente, sol tenue (a menudo tras la nube)
  hemisferio: 0.64,
  ambiente: 0.46,
  sol: 0.5,
  rellenoInt: 0.34,
  // la humedad cierra la distancia sin tragarse a la guardiana: la bruma es
  // densa cerca pero deja LEER la silueta monumental de la queñua al fondo
  nieblaCerca: 6,
  nieblaLejos: 34,
};

/* La paleta del framework, ahora entintada hacia la BRUMA FRÍA (no la dorada):
   el páramo es plateado y frío de suyo, y la pasada 2 lo lleva a su verdad
   altoandina. La identidad de cada planta (paja tostada, tallo velludo, roseta
   salvia) sobrevive; el aire la enfría, la humedece y la platea. */
const TINTE = ATMO.niebla;
const P = {
  turba: mezclar('#3f3a2c', TINTE, 0.28), // suelo húmedo de turba negra, junto al agua
  paja: mezclar('#bfa863', TINTE, 0.4), // pajonal (Calamagrostis), paja tostada
  pajaSol: mezclar('#d8c584', TINTE, 0.34), // macolla donde se cuela la poca luz
  roca: mezclar('#8f9088', TINTE, 0.46), // afloramiento de roca, gris frío alto
  frailejonTallo: mezclar('#b0a27f', TINTE, 0.36), // tallo velludo (hoja marcescente)
  frailejonHoja: mezclar('#93a97f', TINTE, 0.4), // roseta plateada verde-salvia
  frailejonFlor: mezclar('#e6c24a', TINTE, 0.2), // los capítulos amarillos
  quenuaTronco: mezclar('#8a5236', TINTE, 0.34), // Polylepis: corteza rojiza papirosa
  quenuaHoja: mezclar('#7a9166', TINTE, 0.46), // copa plateada de páramo
  musgo: mezclar('#5f8048', TINTE, 0.32), // cojín de musgo, la esponja del agua
  musgoClaro: mezclar('#83a35a', TINTE, 0.3),
  piedra: mezclar(PALETA.piedra, TINTE, 0.42), // piedra fría del nacimiento
  agua: mezclar('#4f8fa8', ATMO.cielo, 0.4), // el agua que espeja el cielo frío
  prado: mezclar('#79a058', TINTE, 0.34), // manchas de prado limpio (calibre Switch)
  sendero: mezclar('#b89a5f', TINTE, 0.22), // la tierra pisada del sendero (legible)
  piedraSendero: mezclar('#d3c9ad', TINTE, 0.26), // losas claras del camino
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function gauss(wx, wz, cx, cz, sx, sz) {
  const dx = wx - cx, dz = wz - cz;
  return Math.exp(-((dx * dx) / (2 * sx * sx) + (dz * dz) / (2 * sz * sz)));
}
/* Ruido determinista (hash de senos): mismo páramo siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/* La geografía del páramo: una meseta alta ondulada, cuchillas que suben al
   fondo y un HONDÓN húmedo al frente donde se junta y NACE el agua. */
const ANCHO = 32;
const FONDO = 32;
const AGUA_CX = 0;
const AGUA_CZ = 4.6; // el hondón, al frente-centro (cerca de la cámara)

/* ══ PASADA 3 — la geografía de LA GUARDIANA ══
   La queñua se planta sobre un ALTOZANO al fondo-centro; un SENDERO de tierra
   serpentea desde el hondón hasta sus pies; y a su derecha, donde su brazo
   maestro señala, se abre el TAJO de la lección: el talud que expone la
   vitrina de suelo (CorteSuelo, reusada de EscenaEntMaestro). */
const ENT_X = 0.6;
const ENT_Z = -4.8;
const ESC_ENT = 1.15; // monumental pero ENTERA en el plano general (copa ~11 m-escena)
const ESC_CORTE = 1.0; // la vitrina a escala plena: la lección debe LLENAR el tajo
/* La vitrina queda donde la MANO del brazo maestro señala: misma relación
   Ent→corte que en EscenaEntMaestro, multiplicada por la escala del Ent. */
const CORTE_WX = ENT_X + CORTE_POS_EM[0] * ESC_ENT; // ≈ 4.0
const CORTE_WZ = ENT_Z + CORTE_POS_EM[2] * ESC_ENT; // ≈ -2.2
const TAJO_X = CORTE_WX;
const TAJO_Z = CORTE_WZ + 2.6; // el centro de la cárcava (para los despejes de flora)
const TAJO_FIN = 3.8; // donde la cárcava vuelve a nivel, ANTES de la laguna (z=4.6)

/* El sendero: polilínea que sube desde el frente, bordea el hondón por el
   OCCIDENTE (el oriente es de la cárcava de la lección) y muere a los pies
   de la queñua guardiana. */
const SENDERO_PUNTOS = [
  [-1.2, 9.0],
  [-2.4, 5.6],
  [-1.8, 2.2],
  [-0.6, -1.0],
  [0.2, -3.4],
  [0.6, -4.6],
];
function distSendero(wx, wz) {
  let d2 = Infinity;
  for (let i = 0; i < SENDERO_PUNTOS.length - 1; i++) {
    const [ax, az] = SENDERO_PUNTOS[i];
    const [bx, bz] = SENDERO_PUNTOS[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = clamp(((wx - ax) * dx + (wz - az) * dz) / (dx * dx + dz * dz), 0, 1);
    const px = ax + dx * t - wx, pz = az + dz * t - wz;
    const dd = px * px + pz * pz;
    if (dd < d2) d2 = dd;
  }
  return Math.sqrt(d2);
}

/* ══ EL HILO DE AGUA que SALE del hondón (prioridad agroecológica #1) ══
   El páramo es una FÁBRICA DE AGUA: sin ver el agua IRSE, "baja a las veredas"
   no tiene imagen. Del labio frontal del nacimiento sale un cauce que serpentea
   hacia la cámara (el frente-centro, entre el sendero al occidente y la cárcava
   al oriente) y se AHONDA hacia el frente: el agua se ve marcharse cuesta abajo,
   como el hilo de agua que de verdad nace en la turbera y arma la quebrada. */
const HILO_PUNTOS = [
  [-0.4, 5.0], // sale del borde SW del ojo de agua
  [-1.3, 6.6],
  [-1.9, 8.2],
  [-2.7, 9.9],
  [-3.0, 11.8], // desemboca al frente-izquierda (visible, cuesta abajo, fuera de la tarjeta)
];
function distHilo(wx, wz) {
  let d2 = Infinity;
  for (let i = 0; i < HILO_PUNTOS.length - 1; i++) {
    const [ax, az] = HILO_PUNTOS[i];
    const [bx, bz] = HILO_PUNTOS[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = clamp(((wx - ax) * dx + (wz - az) * dz) / (dx * dx + dz * dz), 0, 1);
    const px = ax + dx * t - wx, pz = az + dz * t - wz;
    const dd = px * px + pz * pz;
    if (dd < d2) d2 = dd;
  }
  return Math.sqrt(d2);
}

function alturaParamo(wx, wz) {
  let h = 1.2; // la meseta base, alta
  h += ruido(wx * 0.45, wz * 0.45) * 0.55; // ondulación suave del moor
  h += gauss(wx, wz, -10, -11, 5.6, 4.6) * 2.3; // cuchilla occidental
  h += gauss(wx, wz, 10, -12, 6.2, 4.4) * 2.8; // cuchilla oriental (más alta)
  h += gauss(wx, wz, 0, -15, 8.5, 3.6) * 1.7; // el fondo que cierra el cuenco
  h -= gauss(wx, wz, AGUA_CX, AGUA_CZ, 5.0, 3.4) * 1.6; // el hondón del nacimiento (menos hondo: el agua se ve)
  h += gauss(wx, wz, ENT_X, ENT_Z, 4.6, 3.8) * 1.15; // el ALTOZANO de la guardiana
  h -= smoothstep(1.2, 0.5, distSendero(wx, wz)) * 0.14; // la huella del sendero
  // el CAUCE del hilo de agua: un canalito que se AHONDA hacia el frente, para
  // que el agua del nacimiento se vea MARCHARSE cuesta abajo hacia las veredas.
  {
    // canal ANCHO (~2.8) para que la malla del terreno lo resuelva en todo tier
    // (spacing 0.57/1.0/1.6): un swale de turbera con el agua adentro, no una
    // ranura fina que la malla gruesa no capta (dejaría la cinta flotando).
    const enCauce = smoothstep(1.4, 0.35, distHilo(wx, wz));
    const rampa = smoothstep(5.5, 11.5, wz); // más hondo cuanto más al frente
    h -= enCauce * (0.16 + rampa * 0.5);
  }
  // la CÁRCAVA de la lección: NO un pozo — un BARRANCO abierto hacia el frente
  // (+z), como el diorama de EscenaEntMaestro. Un pozo cerrado deja siempre un
  // labio de terreno entre la cámara y las capas bajas y la lección no se ve
  // (pasó DOS veces con esta talla). Perfil: compuerta casi binaria justo bajo
  // el labio de la cara (z = CORTE_WZ + 0.85), MESETA honda a lo largo, y rampa
  // de salida que devuelve el nivel ANTES de la laguna (TAJO_FIN). La cámara de
  // la lección se mete DENTRO del barranco, a la altura de las capas.
  {
    const gx = Math.exp(-((wx - TAJO_X) ** 2) / (2 * 1.5 * 1.5));
    // la compuerta abre DETRÁS de la alcoba más honda (HUECO micorrizas=0.62 →
    // su cara vive en z local 0.23): si abre en la cara (0.85), la pared de
    // terreno tapa las capas excavadas y la lección pierde 3 de 5 pisos.
    const abreZ = CORTE_WZ + 0.1;
    const perfilZ =
      smoothstep(abreZ - 0.07, abreZ + 0.07, wz) * (1 - smoothstep(TAJO_FIN - 1.6, TAJO_FIN, wz));
    h -= gx * 5.0 * perfilZ;
  }
  return h;
}
/* Cotas derivadas de la geografía (después de alturaParamo, que las talla). */
const Y_ENT = alturaParamo(ENT_X, ENT_Z);
const Y_TAPA = alturaParamo(CORTE_WX, CORTE_WZ) + 0.02; // la tapa de la vitrina, a ras
const Y_AGUA = alturaParamo(AGUA_CX, AGUA_CZ) + 0.05;
/* El frailejón HÉROE (el de detalle, junto al sendero): posición fija para que
   el CHIVITO DE PÁRAMO se pose EXACTO en su flor (los dos amarrados). */
const HERO_X = -3.2;
const HERO_Z = 1.2;
const HERO_Y = alturaParamo(HERO_X, HERO_Z);
/* "Humedad" de un punto: 1 en el hondón, 0 en las cuchillas. Tiñe la turba y
   decide dónde crece el musgo. */
const humedad = (wx, wz) => gauss(wx, wz, AGUA_CX, AGUA_CZ, 5.2, 3.8);

/* Malla del páramo con colores por vértice: pajonal dorado en las faldas, roca
   plateada arriba, turba húmeda y oscura alrededor del nacimiento. */
function construirTerreno(seg, plano) {
  const nx = seg + 1, nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cTurba = new THREE.Color(P.turba);
  const cPaja = new THREE.Color(P.paja);
  const cPajaSol = new THREE.Color(P.pajaSol);
  const cRoca = new THREE.Color(P.roca);
  const cPrado = new THREE.Color(P.prado);
  const cSendero = new THREE.Color(P.sendero);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaParamo(wx, wz);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      // base: pajonal → roca según la altura, con motas de paja al sol
      c.lerpColors(cPaja, cPajaSol, smoothstep(-0.4, 1.1, ruido(wx, wz)));
      // manchas de PRADO limpio (calibre Switch): verde saturado a parches
      c.lerp(cPrado, smoothstep(0.1, 0.8, ruido(wx * 0.6 + 3.1, wz * 0.6 - 2.4)) * 0.45);
      c.lerp(cRoca, smoothstep(2.4, 4.4, y));
      // el agua y la turba oscurecen y humedecen las orillas del hondón
      c.lerp(cTurba, clamp(humedad(wx, wz) * 0.9, 0, 0.85));
      // el SENDERO de tierra pisada: la línea que guía el ojo hasta la guardiana
      c.lerp(cSendero, smoothstep(1.2, 0.45, distSendero(wx, wz)) * 0.95);
      // las orillas del HILO de agua: turba negra saturada (el banco mojado)
      c.lerp(cTurba, smoothstep(1.55, 0.35, distHilo(wx, wz)) * 0.82);
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
  if (plano) geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  return geo;
}

/* Las luces del páramo frío: hemisferio azul-plata, mucho ambiente (día
   encapotado), el sol débil velado como direccional principal y un relleno frío
   opuesto. La lógica es la del kit; los números vienen aplanados hacia el frío. */
function LucesParamo() {
  return (
    <>
      <hemisphereLight intensity={ATMO.hemisferio} color={ATMO.cielo} groundColor={ATMO.suelo} />
      <ambientLight intensity={ATMO.ambiente} color={ATMO.luz} />
      <directionalLight position={/** @type {[number, number, number]} */ (ATMO.solPos)} intensity={ATMO.sol} color={ATMO.luz} />
      <directionalLight position={[-6, 4, -7]} intensity={ATMO.rellenoInt} color={ATMO.relleno} />
    </>
  );
}

/* El sol VELADO del páramo: no un disco franco, sino una mancha pálida y fría
   difuminada tras la niebla — apenas se adivina dónde está detrás de la nube.
   No ilumina (de eso se encargan las luces); es el ancla del cielo encapotado. */
function SolVelado() {
  return (
    <group position={[8, 8.5, -14]}>
      <mesh>
        <circleGeometry args={[1.9, 40]} />
        <meshBasicMaterial color="#eaf1f5" transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[3.6, 40]} />
        <meshBasicMaterial color={ATMO.luz} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[6.4, 40]} />
        <meshBasicMaterial color={ATMO.cielo} transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LA SILUETA DEL FRAILEJÓN — que se LEA como frailejón desde lejos, no como
   hongo/parasol. El porte es CAULIRROSULADO (roseta sobre tallo): un tallo
   leñoso columnar VESTIDO con la "enagua" (hojas muertas marcescentes que
   cuelgan del tallo y lo hacen peludo, no un palo liso), rematado por una
   ROSETA de hojas lanceoladas plateadas que RADIAN hacia arriba-afuera. Esos
   tres rasgos —columna+enagua colgante+roseta radiante— son lo que distingue a
   un frailejón de un hongo. Se construye UNA sola vez y se INSTANCIA para todo
   el frailejonal (2 draw calls).
   ── Gotcha mergeGeometries: se DESINDEXA todo antes de fusionar; mezclar
   indexada+no-indexada devuelve null EN SILENCIO y la planta no se dibuja. ── */
const _colorFrai = (geo, hex) => {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
};
const _ponerFrai = (geo, pos = [0, 0, 0], rot = [0, 0, 0], sc = [1, 1, 1]) => {
  geo.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(sc[0], sc[1], sc[2]),
  ));
  return geo;
};
/* Una HOJA lanceolada: cono de 4 caras con la BASE en el origen (para pivotar
   la hoja desde donde se ancla al tallo, como una hoja real). */
const _hojaFrai = (largo, ancho) =>
  new THREE.ConeGeometry(ancho, largo, 4).translate(0, largo / 2, 0);
const _fusionarFrai = (partes) => {
  const buenas = partes.filter(Boolean).map((p) => {
    const plana = p.index ? p.toNonIndexed() : p;
    if (plana !== p) p.dispose();
    return plana;
  });
  const g = mergeGeometries(buenas, false);
  if (!g) throw new Error('MundoParamo3D: mergeGeometries devolvió null (silueta frailejón)');
  return g;
};

/* El TALLO + ENAGUA (altura unidad = 1.0, base en y=0; la instancia lo escala
   por edad). Núcleo leñoso fino cubierto por dos coronas de hojas marcescentes
   que CUELGAN hacia abajo-afuera — la barba de hojas secas que viste al fraile. */
function geomTalloEnaguaFrai() {
  const tallo = mezclar(P.frailejonTallo, '#8a7a54', 0.3);
  const enaguaVieja = mezclar(P.frailejonTallo, '#6a5636', 0.5); // curtida, abajo
  const enaguaNueva = mezclar(P.frailejonTallo, TINTE, 0.18); // reciente, arriba
  const partes = [];
  // núcleo columnar leñoso (fino: la enagua lo tapa)
  partes.push(_colorFrai(
    new THREE.CylinderGeometry(0.1, 0.14, 1.0, 7).translate(0, 0.5, 0),
    tallo,
  ));
  // dos coronas de hojas marcescentes colgando (down-out): la "enagua"
  const rng = crearRng(451);
  const corona = (y, n, inc, largo, hex, fase) => {
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + fase + rng() * 0.18;
      const hoja = _colorFrai(_hojaFrai(largo + rng() * 0.08, 0.05), hex);
      // inc > PI/2 → la punta cae hacia abajo (hoja muerta colgando)
      _ponerFrai(hoja, [Math.cos(ang) * 0.12, y, Math.sin(ang) * 0.12], [inc, -ang, 0]);
      partes.push(hoja);
    }
  };
  corona(0.34, 10, 2.5, 0.4, enaguaVieja, 0);
  corona(0.66, 9, 2.2, 0.36, mezclar(enaguaVieja, enaguaNueva, 0.5), 0.4);
  corona(0.9, 7, 1.95, 0.3, enaguaNueva, 0.8);
  return _fusionarFrai(partes);
}

/* La ROSETA plateada: tres coronas de hojas lanceoladas que radian hacia
   arriba-afuera sobre un domo pálido — la firma "lanuda" del frailejón. NO un
   cono liso (eso lee como sombrilla). Footprint ~0.55 de radio (como el rodal
   previo), para no alterar la densidad del frailejonal. */
function geomRosetaFrai() {
  const hojaBase = mezclar(P.frailejonHoja, '#9fb489', 0.25); // salvia
  const hojaPunta = mezclar('#d7e0c6', TINTE, 0.12); // plata clara (indumento)
  const cogollo = mezclar('#eef2e6', TINTE, 0.08); // el corazón afelpado, lo más pálido
  const partes = [];
  // domo pálido: el cuerpo de la roseta bajo las hojas (le da bulto, no hueco)
  partes.push(_colorFrai(
    new THREE.SphereGeometry(0.2, 10, 7).scale(1, 0.62, 1).translate(0, 0.06, 0),
    mezclar(hojaBase, cogollo, 0.35),
  ));
  const rng = crearRng(929);
  const corona = (n, inc, largo, ancho, hex, fase) => {
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + fase + rng() * 0.12;
      const hoja = _colorFrai(_hojaFrai(largo + rng() * 0.08, ancho), hex);
      _ponerFrai(hoja, [Math.cos(ang) * 0.14, 0.05, Math.sin(ang) * 0.14], [inc, -ang, 0]);
      partes.push(hoja);
    }
  };
  // externa: ancha y arqueada afuera (el faldón de la roseta)
  corona(16, 1.12, 0.5, 0.085, hojaBase, 0);
  // media
  corona(12, 0.78, 0.44, 0.075, mezclar(hojaBase, hojaPunta, 0.4), 0.35);
  // interna: corta y erguida, la más plateada (el cogollo lanudo)
  corona(8, 0.4, 0.32, 0.065, hojaPunta, 0.7);
  // botón velloso central
  partes.push(_colorFrai(new THREE.SphereGeometry(0.1, 10, 7).translate(0, 0.16, 0), cogollo));
  return _fusionarFrai(partes);
}

/* ── Frailejón protagonista: el detalle que enseña la planta. Tallo velludo
      (cilindro + falda de hojas secas marcescentes), roseta plateada de hojas
      lanceoladas y, arriba, la vara con capítulos amarillos. Junto al agua. ── */
function FrailejonHeroe({ pos, reducedMotion }) {
  const flor = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !flor.current) return;
    // la vara florida se mece apenas con el viento del páramo
    flor.current.rotation.z = Math.sin(clock.elapsedTime * 0.7) * 0.06;
  });
  const hojas = useMemo(() => {
    const rng = crearRng(77);
    return Array.from({ length: 9 }, (_, i) => ({
      ang: (i / 9) * Math.PI * 2,
      inc: 0.55 + rng() * 0.25,
      largo: 0.62 + rng() * 0.18,
    }));
  }, []);
  return (
    <group position={pos}>
      {/* tallo velludo: cilindro claro + falda cónica de hojas secas colgantes */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.24, 1.24, 9]} />
        <meshLambertMaterial color={P.frailejonTallo} flatShading />
      </mesh>
      <mesh position={[0, 0.86, 0]}>
        <coneGeometry args={[0.34, 0.9, 9, 1, true]} />
        <meshLambertMaterial color={mezclar(P.frailejonTallo, TINTE, 0.25)} flatShading side={THREE.DoubleSide} />
      </mesh>
      {/* la roseta: hojas lanceoladas radiando hacia arriba-afuera */}
      <group position={[0, 1.28, 0]}>
        {hojas.map((h, i) => (
          <mesh
            key={i}
            position={[Math.cos(h.ang) * 0.12, 0.04, Math.sin(h.ang) * 0.12]}
            rotation={[h.inc, -h.ang, 0]}
          >
            <coneGeometry args={[0.075, h.largo, 4]} />
            <meshLambertMaterial color={P.frailejonHoja} flatShading />
          </mesh>
        ))}
        {/* el cogollo central */}
        <mesh position={[0, 0.06, 0]}>
          <sphereGeometry args={[0.13, 8, 6]} />
          <meshLambertMaterial color={mezclar(P.frailejonHoja, '#c8d2ad', 0.4)} flatShading />
        </mesh>
        {/* la vara con capítulos amarillos (Espeletia florece amarillo) */}
        <group ref={flor} position={[0.16, 0.1, 0.05]}>
          <mesh position={[0, 0.28, 0]} rotation={[0, 0, -0.2]}>
            <cylinderGeometry args={[0.02, 0.028, 0.6, 5]} />
            <meshLambertMaterial color={mezclar(P.frailejonHoja, TINTE, 0.4)} flatShading />
          </mesh>
          {[
            [0.02, 0.52, 0.05],
            [0.1, 0.46, -0.02],
            [-0.05, 0.44, 0.04],
          ].map((f, i) => (
            <mesh key={i} position={/** @type {[number, number, number]} */ (f)}>
              <sphereGeometry args={[0.06, 7, 5]} />
              <meshLambertMaterial color={P.frailejonFlor} flatShading />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/* ── El frailejonal POR EDADES: la colonia contada como un rodal real, donde
      conviven las tres generaciones del frailejón (Espeletia crece ~1 cm/año, así
      que un tallo alto es un ANCIANO de siglos):
        · JÓVENES  — rosetas plateadas a ras de suelo, aún sin tallo, las crías.
        · ADULTOS  — tallo medio y roseta plena, el grueso del rodal.
        · ANCIANOS — tallo alto y velludo con roseta imponente, los patriarcas.
      Dos InstancedMesh (tallos + rosetas) = 2 draw calls para TODO el campo.
      La altura del tallo se escala por instancia (scale.y), de ahí las edades. ── */
function FrailejonalInstanciado({ n }) {
  const tallos = useRef(null);
  const rosetas = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(203);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 12) {
      intentos += 1;
      const wx = (rng() - 0.5) * (ANCHO - 6);
      const wz = -5 + (rng() - 0.5) * (FONDO - 12); // detrás y a los lados del agua
      if (humedad(wx, wz) > 0.38) continue; // el frailejón no crece en el charco
      if (Math.hypot(wx - ENT_X, wz - ENT_Z) < 2.4) continue; // ni contra la guardiana
      if (Math.hypot(wx - TAJO_X, wz - TAJO_Z) < 3.3) continue; // ni en la cárcava
      if (distSendero(wx, wz) < 1.0) continue; // ni parado en el sendero
      const y = alturaParamo(wx, wz);
      if (y > 3.4) continue; // ni en la roca pelada de las cuchillas
      // sorteo de EDAD: pocos ancianos, muchos adultos, una camada de jóvenes
      const d = rng();
      let esc, alto, edad;
      if (d < 0.3) {
        edad = 0; // joven: roseta a ras de suelo, casi sin tallo
        esc = 0.34 + rng() * 0.22;
        alto = 0.05 + rng() * 0.12;
      } else if (d < 0.78) {
        edad = 1; // adulto: el grueso del rodal
        esc = 0.66 + rng() * 0.34;
        alto = 0.7 + rng() * 0.55;
      } else {
        edad = 2; // anciano: tallo alto, roseta imponente
        esc = 0.95 + rng() * 0.4;
        alto = 1.45 + rng() * 0.85;
      }
      lista.push({ wx, wz, y, esc, alto, edad, giro: rng() * Math.PI * 2, ladeo: (rng() - 0.5) * 0.28 });
    }
    return lista;
  }, [n]);

  // Geometrías-firma del frailejón (tallo+enagua y roseta radiante), construidas
  // UNA vez y compartidas por todas las instancias (2 draw calls para el rodal).
  const geoTallo = useMemo(() => geomTalloEnaguaFrai(), []);
  const geoRoseta = useMemo(() => geomRosetaFrai(), []);
  useEffect(() => () => { geoTallo.dispose(); geoRoseta.dispose(); }, [geoTallo, geoRoseta]);

  useEffect(() => {
    const mt = tallos.current, mr = rosetas.current;
    if (!mt || !mr) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    sitios.forEach((s, i) => {
      const stemH = s.esc * s.alto; // altura visible del tallo (cilindro h=1.0)
      // el color base ya vive en la geometría (vertex colors); la instancia solo
      // MODULA (multiplica) por edad: ancianos algo más curtidos, jóvenes claros
      dummy.position.set(s.wx, s.y, s.wz);
      dummy.rotation.set(s.ladeo, s.giro, 0);
      dummy.scale.set(s.esc, Math.max(s.esc * s.alto, 0.02), s.esc);
      dummy.updateMatrix();
      mt.setMatrixAt(i, dummy.matrix);
      const gt = 1 - 0.05 * s.edad + ((i % 5) * 0.012 - 0.024);
      tinte.setRGB(gt, gt * 0.99, gt * 0.97);
      mt.setColorAt(i, tinte);
      // roseta sobre el tallo; los ancianos la lucen algo más plateada (clara)
      dummy.position.set(s.wx, s.y + stemH + 0.02 * s.esc, s.wz);
      dummy.rotation.set(s.ladeo * 0.5, s.giro * 1.3, 0);
      dummy.scale.set(s.esc, s.esc, s.esc);
      dummy.updateMatrix();
      mr.setMatrixAt(i, dummy.matrix);
      const gr = 1 + 0.035 * s.edad + ((i % 4) * 0.014 - 0.02);
      tinte.setRGB(Math.min(gr * 0.99, 1.1), Math.min(gr, 1.12), Math.min(gr * 0.98, 1.08));
      mr.setColorAt(i, tinte);
    });
    mt.instanceMatrix.needsUpdate = true;
    mr.instanceMatrix.needsUpdate = true;
    if (mt.instanceColor) mt.instanceColor.needsUpdate = true;
    if (mr.instanceColor) mr.instanceColor.needsUpdate = true;
  }, [sitios]);

  return (
    <group>
      {/* tallo leñoso VESTIDO de enagua (hojas muertas colgando): fat-stem peludo */}
      <instancedMesh ref={tallos} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
        <primitive object={geoTallo} attach="geometry" />
        <meshLambertMaterial flatShading vertexColors />
      </instancedMesh>
      {/* la roseta como estrella de hojas lanceoladas radiantes (NO cono liso) */}
      <instancedMesh ref={rosetas} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
        <primitive object={geoRoseta} attach="geometry" />
        <meshLambertMaterial flatShading vertexColors />
      </instancedMesh>
    </group>
  );
}

/* ── FRAILEJÓN ANCIANO REAL (sin rostro): un patriarca alto y entero que sirve
      de ANCLA DE ESCALA. Reusa la silueta-firma (tallo+enagua colgante + roseta
      radiante plateada) a tamaño de detalle, coronado por el escapo florido. Un
      Espeletia de siglos alcanza ~3 m: junto a una figura humana, el ojo calibra
      la inmensidad (Shadow of the Colossus: la escala por contraste conocido). ── */
function FrailejonAnciano({ pos, esc = 1, giro = 0, reducedMotion }) {
  const flor = useRef(null);
  const geoTallo = useMemo(() => geomTalloEnaguaFrai(), []);
  const geoRoseta = useMemo(() => geomRosetaFrai(), []);
  useEffect(() => () => { geoTallo.dispose(); geoRoseta.dispose(); }, [geoTallo, geoRoseta]);
  useFrame(({ clock }) => {
    if (reducedMotion || !flor.current) return;
    flor.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.05;
  });
  const ALTO = 2.5; // altura del tallo (unidad 1.0 escalada) → ~3 m de escena
  return (
    <group position={pos} rotation={[0, giro, 0]} scale={esc}>
      {/* tallo vestido de enagua, estirado a patriarca */}
      <mesh geometry={geoTallo} scale={[1.15, ALTO, 1.15]} castShadow>
        <meshLambertMaterial flatShading vertexColors />
      </mesh>
      {/* roseta plateada plena sobre la corona del tallo */}
      <mesh geometry={geoRoseta} position={[0, ALTO + 0.04, 0]} scale={1.25} castShadow>
        <meshLambertMaterial flatShading vertexColors />
      </mesh>
      {/* escapo florido: la vara de capítulos amarillos que asoma de la roseta */}
      <group ref={flor} position={[0.16, ALTO + 0.12, 0.08]} rotation={[0, 0, -0.22]}>
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.025, 0.035, 0.72, 5]} />
          <meshLambertMaterial color={mezclar(P.frailejonHoja, TINTE, 0.4)} flatShading />
        </mesh>
        {[[0.02, 0.66, 0.05], [0.1, 0.58, -0.03], [-0.06, 0.56, 0.05], [0.03, 0.72, -0.02]].map((f, i) => (
          <mesh key={i} position={/** @type {[number, number, number]} */ (f)}>
            <sphereGeometry args={[0.075, 8, 6]} />
            <meshLambertMaterial color={P.frailejonFlor} emissive="#7a5e18" emissiveIntensity={0.2} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ── CAMINANTE DEL PÁRAMO: una figura humana sencilla y digna (campesina/
      guardapáramo, con ruana y sombrero) que mira hacia arriba al frailejón
      anciano. Es la REFERENCIA DE ESCALA HUMANA: ~1.65 de alto, para que el ojo
      mida la inmensidad del frailejonal. Baja poligonización, cero rostro (una
      silueta respetuosa, no un personaje). ── */
function CaminanteParamo({ pos, giro = 0, reducedMotion }) {
  const cuerpo = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !cuerpo.current) return;
    // respira apenas, quieta, contemplando (no baila)
    cuerpo.current.rotation.z = Math.sin(clock.elapsedTime * 0.5) * 0.012;
  });
  const RUANA = '#a85f3c'; // lana terracota — un acento cálido contra la plata fría
  const RUANA_B = mezclar('#7d4426', TINTE, 0.12);
  const PIEL = mezclar('#a9805c', TINTE, 0.15);
  const PANTALON = mezclar('#3f4a52', TINTE, 0.2);
  const SOMBRERO = mezclar('#c9ad6a', TINTE, 0.18); // paja
  const BOTA = mezclar('#2c2a26', TINTE, 0.12);
  return (
    <group position={pos} rotation={[0, giro, 0]}>
      <group ref={cuerpo}>
        {/* piernas + botas */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.11, 0, 0]}>
            <mesh position={[0, 0.36, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.06, 0.72, 6]} />
              <meshLambertMaterial color={PANTALON} flatShading />
            </mesh>
            <mesh position={[0, 0.04, 0.03]}>
              <boxGeometry args={[0.13, 0.1, 0.22]} />
              <meshLambertMaterial color={BOTA} flatShading />
            </mesh>
          </group>
        ))}
        {/* torso bajo la ruana */}
        <mesh position={[0, 1.0, 0]}>
          <cylinderGeometry args={[0.16, 0.19, 0.62, 8]} />
          <meshLambertMaterial color={RUANA_B} flatShading />
        </mesh>
        {/* la RUANA: manto cuadrado que cae del hombro (cono facetado abierto) */}
        <mesh position={[0, 1.02, 0]} castShadow>
          <coneGeometry args={[0.34, 0.66, 4, 1, true]} />
          <meshLambertMaterial color={RUANA} flatShading side={THREE.DoubleSide} />
        </mesh>
        {/* cuello de la ruana (banda más oscura) */}
        <mesh position={[0, 1.3, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.12, 8]} />
          <meshLambertMaterial color={RUANA_B} flatShading />
        </mesh>
        {/* cabeza (mira un poco hacia arriba, contemplando el frailejón) */}
        <group position={[0, 1.46, 0.02]} rotation={[-0.18, 0, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.115, 10, 9]} />
            <meshLambertMaterial color={PIEL} flatShading />
          </mesh>
          {/* sombrero de paja: copa + ala ancha */}
          <mesh position={[0, 0.11, 0]}>
            <cylinderGeometry args={[0.1, 0.115, 0.12, 10]} />
            <meshLambertMaterial color={SOMBRERO} flatShading />
          </mesh>
          <mesh position={[0, 0.06, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.02, 12]} />
            <meshLambertMaterial color={SOMBRERO} flatShading />
          </mesh>
        </group>
        {/* bordón/bastón de caminata (una línea vertical que ayuda a leer la escala) */}
        <mesh position={[0.26, 0.62, 0.06]} rotation={[0, 0, 0.06]}>
          <cylinderGeometry args={[0.018, 0.022, 1.28, 6]} />
          <meshLambertMaterial color={mezclar('#6b4a2a', TINTE, 0.2)} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* ── El pajonal: macollas de paja instanciadas (1 draw call), un poco dobladas.
      El manto que cubre el páramo entre frailejones. ── */
function Pajonal({ n }) {
  const ref = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(51);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 8) {
      intentos += 1;
      const wx = (rng() - 0.5) * (ANCHO - 4);
      const wz = (rng() - 0.5) * (FONDO - 6);
      if (humedad(wx, wz) > 0.6) continue; // menos paja en el barro del hondón
      if (Math.hypot(wx - ENT_X, wz - ENT_Z) < 1.6) continue; // no contra el fuste
      if (Math.hypot(wx - TAJO_X, wz - TAJO_Z) < 3.1) continue; // no en la cárcava
      if (distSendero(wx, wz) < 0.5) continue; // no en plena huella
      if (distHilo(wx, wz) < 0.9) continue; // ni parada dentro del hilo de agua
      const y = alturaParamo(wx, wz);
      if (y > 3.6) continue;
      lista.push({ wx, wz, y, esc: 0.6 + rng() * 0.8, giro: rng() * Math.PI, ladeo: (rng() - 0.5) * 0.4 });
    }
    return lista;
  }, [n]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const base = new THREE.Color(P.paja);
    const sol = new THREE.Color(P.pajaSol);
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y + 0.16 * s.esc, s.wz);
      dummy.rotation.set(s.ladeo, s.giro, s.ladeo * 0.5);
      dummy.scale.set(s.esc, s.esc, s.esc);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tinte.copy(base).lerp(sol, (i % 7) / 7);
      m.setColorAt(i, tinte);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [sitios]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
      <coneGeometry args={[0.16, 0.62, 5]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* ── Cojines de musgo: hemisferios instanciados alrededor del agua — las
      esponjas que atrapan y guardan la humedad. Densos en la turba húmeda. ── */
function CojinesMusgo({ n }) {
  const ref = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(89);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 14) {
      intentos += 1;
      const wx = AGUA_CX + (rng() - 0.5) * 12;
      const wz = AGUA_CZ + (rng() - 0.5) * 9;
      if (humedad(wx, wz) < 0.28) continue; // solo donde hay humedad
      if (Math.hypot(wx - TAJO_X, wz - TAJO_Z) < 3.1) continue; // no en la cárcava
      const y = alturaParamo(wx, wz);
      if (y < Y_AGUA + 0.02) continue; // no dentro de la laguna
      lista.push({ wx, wz, y, esc: 0.4 + rng() * 0.7, aplana: 0.45 + rng() * 0.25, verde: rng() });
    }
    return lista;
  }, [n]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const base = new THREE.Color(P.musgo);
    const claro = new THREE.Color(P.musgoClaro);
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y, s.wz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(s.esc, s.esc * s.aplana, s.esc);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tinte.copy(base).lerp(claro, s.verde);
      m.setColorAt(i, tinte);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [sitios]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
      <sphereGeometry args={[0.5, 8, 5]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* ── Quenua (Polylepis): árbol de páramo de tronco rojizo retorcido y copa
      plateada baja. La niebla se le engancha (jirón propio junto a la copa). ── */
function Quenua({ pos, esc = 1 }) {
  return (
    <group position={pos} scale={esc}>
      <mesh position={[0, 0.5, 0]} rotation={[0.06, 0, 0.08]}>
        <cylinderGeometry args={[0.08, 0.14, 1.0, 6]} />
        <meshLambertMaterial color={P.quenuaTronco} flatShading />
      </mesh>
      <mesh position={[0.18, 0.95, 0.05]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.05, 0.08, 0.6, 5]} />
        <meshLambertMaterial color={P.quenuaTronco} flatShading />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.6, 8, 6]} />
        <meshLambertMaterial color={P.quenuaHoja} flatShading />
      </mesh>
      <mesh position={[0.34, 0.98, 0.12]}>
        <sphereGeometry args={[0.38, 7, 5]} />
        <meshLambertMaterial color={mezclar(P.quenuaHoja, TINTE, 0.25)} flatShading />
      </mesh>
    </group>
  );
}

/* ── BOSQUETE de queñuas: un QUEÑUAL apretado y abrigado (NO un damero por el
      páramo abierto). Las Polylepis se refugian del viento EN GRUPO, al pie de
      la roca / en un pliegue — así crecen de verdad. Copas que se tocan y la
      niebla enganchándose entre ellas. ── */
function BosqueteQuenua({ centro, seed = 7, n = 6 }) {
  const arboles = useMemo(() => {
    const rng = crearRng(seed);
    return Array.from({ length: n }, () => {
      const a = rng() * Math.PI * 2;
      const r = 0.3 + rng() * 2.1; // apretado: radio pequeño
      const x = centro[0] + Math.cos(a) * r;
      const z = centro[1] + Math.sin(a) * r * 0.8;
      return { x, z, esc: 0.82 + rng() * 0.8 };
    });
  }, [centro, seed, n]);
  return (
    <group>
      {arboles.map((t, i) => (
        <Quenua key={i} pos={[t.x, alturaParamo(t.x, t.z), t.z]} esc={t.esc} />
      ))}
    </group>
  );
}

/* ── ROQUEDAL con LÍQUENES: un afloramiento de peñascos fríos manchados de
      líquenes naranja y amarillo (Caloplaca/Rhizocarpon) — el color HONESTO del
      páramo alto, sin una sola flor de jardín. Los cojines de líquen se posan en
      la cara alta de cada peña. Determinista, low-poly. ── */
function Roquedal({ pos, seed = 3, esc = 1 }) {
  const rocas = useMemo(() => {
    const rng = crearRng(seed);
    return Array.from({ length: 6 }, () => ({
      x: (rng() - 0.5) * 2.6,
      z: (rng() - 0.5) * 2.0,
      r: 0.42 + rng() * 0.72,
      giro: /** @type {[number, number, number]} */ ([rng() * Math.PI, rng() * Math.PI, rng() * Math.PI]),
      liquen: Array.from({ length: 2 + Math.floor(rng() * 3) }, () => ({
        a: rng() * Math.PI * 2,
        inc: rng() * 0.9, // hemisferio alto: el líquen prende arriba
        rr: 0.12 + rng() * 0.2,
        naranja: rng() > 0.45,
      })),
    }));
  }, [seed]);
  return (
    <group position={pos} scale={esc}>
      {rocas.map((ro, i) => {
        const y = alturaParamo(pos[0] + ro.x, pos[2] + ro.z) - pos[1] + ro.r * 0.45;
        return (
          <group key={i} position={[ro.x, y, ro.z]}>
            <mesh rotation={ro.giro}>
              <dodecahedronGeometry args={[ro.r, 0]} />
              <meshLambertMaterial color={mezclar(P.roca, '#6a6c64', 0.35)} flatShading />
            </mesh>
            {ro.liquen.map((lq, j) => {
              const sx = Math.sin(lq.inc) * Math.cos(lq.a);
              const sy = Math.cos(lq.inc);
              const sz = Math.sin(lq.inc) * Math.sin(lq.a);
              return (
                <mesh
                  key={j}
                  position={[sx * ro.r * 0.92, sy * ro.r * 0.92, sz * ro.r * 0.92]}
                  scale={[lq.rr, lq.rr * 0.35, lq.rr]}
                >
                  <sphereGeometry args={[1, 6, 5]} />
                  <meshLambertMaterial color={lq.naranja ? '#cf8330' : '#c3ad3a'} flatShading />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

/* ── Niebla enganchada: BANCOS de bruma húmeda que se pegan al suelo del páramo
      y jirones que se atoran entre las copas, todos derivando despacio. Esferas
      planas y anchas, azul-plata frío; las bajas casi lamen el pajonal (la
      humedad que sube de la turba). reduced-motion las deja quietas (presencia
      sin movimiento). Es el páramo respirando, mojado y frío. ── */
function NieblaEnganchada({ n, reducedMotion }) {
  const grupo = useRef(null);
  const jirones = useMemo(() => {
    const rng = crearRng(131);
    return Array.from({ length: n }, (_, i) => {
      const bajo = i % 2 === 0; // la mitad son bancos que se pegan al suelo
      return {
        x: (rng() - 0.5) * (ANCHO - 6),
        y: bajo ? 0.35 + rng() * 0.7 : 1.3 + rng() * 1.7,
        z: -3 + (rng() - 0.5) * (FONDO - 10),
        esc: bajo ? 2.6 + rng() * 2.6 : 1.8 + rng() * 2.0,
        aplana: bajo ? 0.24 : 0.42, // los bancos bajos, más chatos
        vel: 0.16 + rng() * 0.34,
        fase: rng() * Math.PI * 2,
        op: (bajo ? 0.09 : 0.06) + rng() * 0.07,
      };
    });
  }, [n]);
  useFrame(({ clock }) => {
    if (reducedMotion || !grupo.current) return;
    const t = clock.elapsedTime;
    grupo.current.children.forEach((m, i) => {
      const j = jirones[i];
      m.position.x = j.x + Math.sin(t * j.vel * 0.3 + j.fase) * 1.5;
      m.position.y = j.y + Math.sin(t * j.vel * 0.5 + j.fase) * 0.16;
      m.material.opacity = j.op * (0.7 + 0.3 * Math.sin(t * 0.4 + j.fase));
    });
  });
  return (
    <group ref={grupo}>
      {jirones.map((j, i) => (
        <mesh key={i} position={[j.x, j.y, j.z]} scale={[j.esc, j.esc * j.aplana, j.esc]}>
          <sphereGeometry args={[1, 7, 5]} />
          <meshBasicMaterial color={ATMO.niebla} transparent opacity={j.op} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* Un disco de borde LOBULADO (turbera, no estanque): radio perturbado por
   ángulo con senos suaves → orilla orgánica y continua, cero rng por-vértice
   (nada de sierra). Yace en XY; el mesh se acuesta con rotación -PI/2. */
function construirTurbera(radio, segs) {
  const pos = new Float32Array((segs + 1) * 3);
  const idx = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const lob =
      0.78 + 0.14 * Math.sin(a * 3 + 1.1) + 0.07 * Math.sin(a * 5 + 2.6) + 0.05 * Math.sin(a * 2 - 0.7);
    const r = radio * lob;
    const k = (i + 1) * 3;
    pos[k] = Math.cos(a) * r; pos[k + 1] = Math.sin(a) * r; pos[k + 2] = 0;
  }
  for (let i = 0; i < segs; i++) idx.push(0, i + 1, ((i + 1) % segs) + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* La CINTA del hilo de agua: sigue HILO_PUNTOS pegada al terreno (que ya lleva
   el cauce excavado), afinándose hacia el frente. Un solo strip triangulado. */
function construirHilo(ancho0, ancho1) {
  const pts = HILO_PUNTOS;
  const N = pts.length;
  const pos = [];
  const idx = [];
  for (let i = 0; i < N; i++) {
    const [x, z] = pts[i];
    const [px, pz] = pts[Math.max(0, i - 1)];
    const [nx, nz] = pts[Math.min(N - 1, i + 1)];
    let tx = nx - px, tz = nz - pz;
    const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
    const perpx = -tz, perpz = tx; // perpendicular en el plano XZ
    const f = i / (N - 1);
    const w = (ancho0 * (1 - f) + ancho1 * f) * 0.5;
    const lx = x + perpx * w, lz = z + perpz * w;
    const rx = x - perpx * w, rz = z - perpz * w;
    pos.push(lx, alturaParamo(lx, lz) + 0.16, lz, rx, alturaParamo(rx, rz) + 0.16, rz);
  }
  for (let i = 0; i < N - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ── EL NACIMIENTO — la TURBERA (prioridad agroecológica #1). NO un estanque de
      jardín: un hondón de turba con orilla LOBULADA, un banco de turba negra
      saturada asomando, cojines de Sphagnum METIÉNDOSE al agua, y el hilo que
      sale hacia las veredas (HiloDeAgua, aparte). Leve oleaje; halo que respira
      (más fuerte en modo fábrica: "de aquí NACE"). ── */
function NacimientoAgua({ reducedMotion, fabrica }) {
  const laguna = useRef(null);
  const halo = useRef(null);
  const geo = useMemo(() => construirTurbera(2.6, 44), []);
  const geoTurba = useMemo(() => construirTurbera(3.2, 40), []);
  useEffect(() => () => { geo.dispose(); geoTurba.dispose(); }, [geo, geoTurba]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo]);
  // cojines de Sphagnum en la orilla, algunos medio sumergidos (entran al agua)
  const sphagnum = useMemo(() => {
    const rng = crearRng(613);
    return Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2 + rng() * 0.4;
      const r = 1.8 + rng() * 1.1; // desde dentro del agua hasta la orilla
      return {
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        dentro: r < 2.3, // los de adentro asoman apenas sobre el agua
        esc: 0.3 + rng() * 0.36,
        verde: rng(),
      };
    });
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!reducedMotion && laguna.current) {
      const attr = laguna.current.geometry.attributes.position;
      const a = attr.array;
      for (let i = 0; i < a.length; i += 3) {
        const x = base[i], y = base[i + 1];
        a[i + 2] = Math.sin(x * 1.6 + t * 1.1) * 0.028 + Math.cos(y * 1.9 - t * 0.9) * 0.028;
      }
      attr.needsUpdate = true;
    }
    if (halo.current) {
      const objetivo = fabrica ? 0.32 : 0.11;
      const pulso = reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(t * 1.4);
      halo.current.material.opacity = objetivo * pulso;
      halo.current.scale.setScalar(fabrica ? 1.22 : 1);
    }
  });

  return (
    <group position={[AGUA_CX, 0, AGUA_CZ]}>
      {/* el BANCO de turba negra saturada: un disco lobulado más ancho y hondo,
          asomando como orilla mojada alrededor del espejo (el verdadero embalse) */}
      <mesh geometry={geoTurba} position={[0, Y_AGUA - 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshLambertMaterial color={mezclar(P.turba, '#181206', 0.4)} flatShading />
      </mesh>
      {/* el espejo de agua de turbera (turbia pero LEGIBLE: es la fábrica de
          agua, tiene que verse el agua) — borde lobulado, no de estanque. Un
          leve emissive frío para que el agua NO se la trague la bruma. */}
      <mesh ref={laguna} geometry={geo} position={[0, Y_AGUA, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshLambertMaterial color={mezclar('#3f5f5c', P.turba, 0.42)} emissive="#1b3a38" emissiveIntensity={0.16} transparent opacity={0.95} />
      </mesh>
      {/* brillo frío del cielo sobre el agua (aditivo, SIN fog para que atraviese
          la niebla): la lámina que espeja el cielo */}
      <mesh position={[0, Y_AGUA + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.86, 1]}>
        <circleGeometry args={[1.9, 30]} />
        <meshBasicMaterial color="#d8f0f5" transparent opacity={0.24} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </mesh>
      {/* el halo del nacimiento: crece y brilla en modo fábrica */}
      <mesh ref={halo} position={[0, Y_AGUA + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.9, 2.7, 40]} />
        <meshBasicMaterial color="#dff3ef" transparent opacity={0.11} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      {/* cojines de Sphagnum metiéndose al agua (la esponja que guarda el agua) */}
      {sphagnum.map((s, i) => (
        <mesh
          key={i}
          position={[s.x, Y_AGUA + (s.dentro ? -0.02 : 0.05), s.z]}
          scale={[s.esc, s.esc * 0.5, s.esc]}
        >
          <sphereGeometry args={[0.5, 7, 5]} />
          <meshLambertMaterial color={mezclar(s.verde > 0.5 ? P.musgo : P.musgoClaro, P.turba, s.dentro ? 0.3 : 0.08)} flatShading />
        </mesh>
      ))}
      {/* piedras de turbera alrededor del ojo de agua */}
      {[
        [2.1, 0.3, -0.8, 0.32],
        [-2.2, 0.2, 0.9, 0.28],
        [0.6, 0.15, 2.4, 0.24],
        [-2.5, 0.18, -1.0, 0.22],
      ].map((r, i) => (
        <mesh key={i} position={[r[0], Y_AGUA + r[3] * 0.3, r[2]]} rotation={[r[1], i, r[1]]}>
          <dodecahedronGeometry args={[r[3]]} />
          <meshLambertMaterial color={P.piedra} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ── EL HILO DE AGUA que baja a las veredas: la cinta que sale del hondón por el
      cauce excavado y serpentea hacia la cámara, cuesta abajo. Reflejo frío del
      cielo + un brillo que VIAJA por el cauce (el agua yéndose). reduced-motion
      lo deja quieto. Es la imagen que faltaba: "el agua se va". ── */
function HiloDeAgua({ reducedMotion }) {
  const geo = useMemo(() => construirHilo(0.95, 0.42), []);
  const geoBrillo = useMemo(() => construirHilo(0.42, 0.16), []); // centro reluciente
  const brillo = useRef(null);
  useEffect(() => () => { geo.dispose(); geoBrillo.dispose(); }, [geo, geoBrillo]);
  // el brillo viajero: un pequeño quad aditivo que corre por los puntos del hilo
  const ruta = useMemo(
    () => HILO_PUNTOS.map(([x, z]) => new THREE.Vector3(x, alturaParamo(x, z) + 0.26, z)),
    [],
  );
  const curva = useMemo(() => new THREE.CatmullRomCurve3(ruta, false, 'catmullrom', 0.3), [ruta]);
  useFrame(({ clock }) => {
    if (reducedMotion || !brillo.current) return;
    const t = (clock.elapsedTime * 0.28) % 1;
    curva.getPoint(t, brillo.current.position);
    brillo.current.material.opacity = 0.5 * Math.sin(t * Math.PI); // nace y muere en las puntas
  });
  return (
    <group>
      <mesh geometry={geo}>
        <meshLambertMaterial color={mezclar('#4a7580', P.turba, 0.32)} emissive="#1f3c40" emissiveIntensity={0.2} transparent opacity={0.93} flatShading />
      </mesh>
      {/* el CENTRO reluciente del cauce (aditivo, SIN fog): el agua que brilla y
          atraviesa la bruma — la línea que hace legible "el agua baja" */}
      <mesh geometry={geoBrillo} position={[0, 0.02, 0]}>
        <meshBasicMaterial color="#cdeef4" transparent opacity={0.32} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </mesh>
      {/* el brillo que VIAJA cauce abajo: el agua marchándose (sin fog) */}
      <mesh ref={brillo} position={ruta[0]}>
        <sphereGeometry args={[0.14, 8, 6]} />
        <meshBasicMaterial color="#eaf6f4" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </mesh>
    </group>
  );
}

/* Un ave pequeña de páramo, silueta a contraluz: dos alas con bisagra + cuerpo.
   Se arma como grupo para que el vuelo la coloque; el aleteo rota las bisagras. */
function alaGeom(w, d) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  g.translate(w / 2, 0, 0);
  return g;
}

/* ── Aves del páramo: un cóndor que planea alto y aves menores en arco. Cada ave
      es un grupo (ala izq/der con bisagra + cuerpo); el vuelo las mueve y el
      aleteo rota las alas. No montan en reduced-motion (un ave quieta en el
      cielo lee como calcomanía, no como calma) — para eso está la posada. ── */
function AvesParamo({ n }) {
  const grupo = useRef(null);
  const aves = useMemo(() => {
    const rng = crearRng(311);
    return Array.from({ length: n }, (_, i) => {
      const condor = i === 0;
      return {
        condor,
        radio: condor ? 9 : 4 + rng() * 3,
        altura: condor ? 8.5 : 4 + rng() * 2.5,
        cx: (rng() - 0.5) * 5,
        cz: -5 + (rng() - 0.5) * 5,
        vel: condor ? 0.12 : 0.28 + rng() * 0.18,
        aleteo: condor ? 1.1 : 4 + rng() * 2,
        amp: condor ? 0.18 : 0.55,
        fase: rng() * Math.PI * 2,
        w: condor ? 1.0 : 0.32 + rng() * 0.1,
        d: condor ? 0.42 : 0.16,
        color: condor ? '#2a2620' : '#3a352c',
      };
    });
  }, [n]);
  const geos = useMemo(
    () => aves.map((a) => ({ izq: alaGeom(a.w, a.d), der: alaGeom(-a.w, a.d) })),
    [aves],
  );
  useEffect(() => {
    return () => geos.forEach((g) => { g.izq.dispose(); g.der.dispose(); });
  }, [geos]);

  useFrame(({ clock }) => {
    if (!grupo.current) return;
    const t = clock.elapsedTime;
    grupo.current.children.forEach((g, i) => {
      const a = aves[i];
      const ang = t * a.vel + a.fase;
      g.position.set(
        a.cx + Math.cos(ang) * a.radio,
        a.altura + Math.sin(t * 0.4 + a.fase) * 0.5,
        a.cz + Math.sin(ang) * a.radio * 0.75,
      );
      g.rotation.y = -ang; // encara el rumbo del arco
      const flap = Math.sin(t * a.aleteo + a.fase) * a.amp;
      g.children[0].rotation.z = flap; // bisagra izquierda
      g.children[1].rotation.z = -flap; // bisagra derecha
    });
  });

  return (
    <group ref={grupo}>
      {aves.map((a, i) => (
        <group key={i}>
          <group>
            <mesh geometry={geos[i].izq}>
              <meshBasicMaterial color={a.color} side={THREE.DoubleSide} />
            </mesh>
          </group>
          <group>
            <mesh geometry={geos[i].der}>
              <meshBasicMaterial color={a.color} side={THREE.DoubleSide} />
            </mesh>
          </group>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[a.d * 0.4, a.w * 1.1, 5]} />
            <meshBasicMaterial color={a.color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Un ave posada en la piedra del nacimiento: siempre presente (también en
   reduced-motion), da vida sin movimiento. Silueta simple mirando al agua. */
function AvePosada() {
  return (
    <group position={[AGUA_CX + 1.9, Y_AGUA + 0.42, AGUA_CZ - 0.6]} rotation={[0, -0.8, 0]}>
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.11, 7, 6]} />
        <meshLambertMaterial color="#3a352c" flatShading />
      </mesh>
      <mesh position={[0.02, 0.2, 0.02]}>
        <sphereGeometry args={[0.07, 7, 6]} />
        <meshLambertMaterial color="#453f34" flatShading />
      </mesh>
      <mesh position={[-0.12, 0.06, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.05, 0.22, 5]} />
        <meshLambertMaterial color="#2f2b23" flatShading />
      </mesh>
    </group>
  );
}

/* ── EL ENT-FRAILEJÓN: el GUARDIÁN-MAESTRO del páramo ──────────────────────
      Un frailejón MONUMENTAL (Espeletia hecha anciano) que se alza sobre el
      frailejonal y enseña: columna velluda vestida de enagua marcescente, un
      ROSTRO sereno que emerge del tallo (ojos ámbar hundidos bajo cejas
      afelpadas, boca-grieta amable) y la gran ROSETA plateada por corona. Un
      brazo florido (escapo de capítulos amarillos) que hace ademán de señalar,
      y un halo de páramo a sus pies. Es el par del Ent-queñua del bosque: aquí,
      arriba, el maestro es el frailejón. Digno, quieto, sabio. ── */
function EntFrailejonMaestro({ pos, esc = 1, reducedMotion }) {
  const cuerpo = useRef(null);
  const brazo = useRef(null);
  const halo = useRef(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // respira/mece apenas (anciano sereno, no bailarín)
    if (!reducedMotion) {
      if (cuerpo.current) cuerpo.current.rotation.z = Math.sin(t * 0.4) * 0.02;
      if (brazo.current) brazo.current.rotation.z = -0.5 + Math.sin(t * 0.6) * 0.06;
    }
    if (halo.current) {
      const pulso = reducedMotion ? 1 : 0.72 + 0.28 * Math.sin(t * 0.9);
      halo.current.material.opacity = 0.16 * pulso;
    }
  });

  // La enagua: anillos de hojas secas colgantes (conos abiertos) a lo largo del
  // tallo — le da CUERPO de fraile, no palo. Recientes arriba, curtidas abajo.
  const enagua = useMemo(() => {
    const arr = [];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1); // 0 base(vieja) → 1 arriba(reciente)
      arr.push({
        y: 0.5 + f * 1.7,
        r: 0.44 - f * 0.06,
        col: f < 0.4 ? P.frailejonTallo : mezclar(P.frailejonTallo, TINTE, 0.3),
      });
    }
    return arr;
  }, []);

  // La roseta: un POMPÓN plateado pleno — TRES coronas de hojas anchas y
  // afelpadas sobre un domo pálido, para que se lea como la roseta gorda del
  // frailejón (no un mohawk) y RESALTE como el punto más claro del oro.
  const hojasRoseta = useMemo(() => {
    const rng = crearRng(707);
    const corona = (n, incMin, incSpan, largoMin, largoSpan, ancho, claroMin, fase) =>
      Array.from({ length: n }, (_, i) => ({
        ang: (i / n) * Math.PI * 2 + fase + rng() * 0.12,
        inc: incMin + rng() * incSpan,
        largo: largoMin + rng() * largoSpan,
        ancho,
        claro: claroMin + rng() * 0.35,
      }));
    return [
      // externa: ancha y arqueada afuera (el faldón de la roseta)
      ...corona(20, 1.0, 0.28, 0.62, 0.2, 0.19, 0.1, 0),
      // media: intermedia
      ...corona(16, 0.6, 0.3, 0.52, 0.18, 0.17, 0.4, 0.4),
      // interna: corta y erguida (el cogollo, la más pálida)
      ...corona(10, 0.2, 0.24, 0.34, 0.14, 0.14, 0.7, 0.8),
    ];
  }, []);

  // Colores plateados de la roseta: brillan claro para RESALTAR en la niebla
  // dorada (la firma plateada del frailejón, el punto más luminoso de la escena).
  const PLATA = mezclar('#c3ceb0', TINTE, 0.12);
  const PLATA_CLARO = mezclar('#e4ead8', TINTE, 0.08);

  return (
    <group position={pos} scale={esc}>
      {/* halo de maestro a los pies (aditivo, respira) */}
      <mesh ref={halo} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 1.5, 32]} />
        <meshBasicMaterial color="#f2e6c4" transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>

      <group ref={cuerpo}>
        {/* el TALLO velludo, grueso y alto */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.34, 0.44, 2.4, 11]} />
          <meshLambertMaterial color={P.frailejonTallo} flatShading />
        </mesh>
        {/* la enagua de hojas muertas (marcescentes) por anillos */}
        {enagua.map((e, i) => (
          <mesh key={i} position={[0, e.y, 0]}>
            <coneGeometry args={[e.r, 0.5, 11, 1, true]} />
            <meshLambertMaterial color={e.col} flatShading side={THREE.DoubleSide} />
          </mesh>
        ))}

        {/* ── EL ROSTRO que emerge del tallo (a ~1.6 de alto) ── */}
        <group position={[0, 1.62, 0.28]}>
          {/* frente/mejilla: una cáscara suave sobre el tallo (más clara) */}
          <mesh position={[0, 0.05, -0.06]} scale={[1, 1.1, 0.7]}>
            <sphereGeometry args={[0.3, 14, 12]} />
            <meshLambertMaterial color={mezclar(P.frailejonTallo, '#c8b483', 0.35)} flatShading />
          </mesh>
          {/* cejas afelpadas (dos tufos claros sobre los ojos) */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.12, 0.13, 0.16]} rotation={[0, 0, -s * 0.3]} scale={[1.2, 0.5, 0.6]}>
              <sphereGeometry args={[0.08, 8, 6]} />
              <meshLambertMaterial color={P.frailejonHoja} flatShading />
            </mesh>
          ))}
          {/* ojos: cuenca honda + iris ámbar-miel que asoma de la sombra */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.12, 0.0, 0.18]}>
              <mesh position={[0, 0, -0.02]} scale={[1, 1.05, 0.8]}>
                <sphereGeometry args={[0.075, 12, 10]} />
                <meshLambertMaterial color="#4a3115" flatShading />
              </mesh>
              <mesh position={[0, 0, 0.03]}>
                <sphereGeometry args={[0.05, 12, 10]} />
                <meshLambertMaterial color="#e0ad4c" emissive="#a5702a" emissiveIntensity={0.35} flatShading />
              </mesh>
              <mesh position={[0, 0, 0.06]}>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshLambertMaterial color="#2a1c0a" flatShading />
              </mesh>
              <mesh position={[s * 0.015, 0.02, 0.075]}>
                <sphereGeometry args={[0.008, 6, 6]} />
                <meshBasicMaterial color="#fff6e2" />
              </mesh>
            </group>
          ))}
          {/* nariz de nudo */}
          <mesh position={[0, -0.1, 0.2]} scale={[0.8, 1.1, 0.9]}>
            <sphereGeometry args={[0.06, 8, 7]} />
            <meshLambertMaterial color={mezclar(P.frailejonTallo, '#8a6a44', 0.4)} flatShading />
          </mesh>
          {/* boca-grieta amable (leve arco) */}
          <mesh position={[0, -0.22, 0.17]} rotation={[0.2, 0, 0]} scale={[1.5, 0.32, 0.5]}>
            <sphereGeometry args={[0.09, 10, 6]} />
            <meshLambertMaterial color="#3a2712" flatShading />
          </mesh>
        </group>

        {/* ── LA ROSETA plateada: pompón pleno de tres coronas sobre un domo ── */}
        <group position={[0, 2.4, 0]}>
          {/* domo pálido: el cuerpo de la roseta bajo las hojas (le da bulto) */}
          <mesh position={[0, 0.12, 0]} scale={[1, 0.72, 1]}>
            <sphereGeometry args={[0.42, 14, 10]} />
            <meshLambertMaterial color={mezclar('#cdd6bd', TINTE, 0.12)} flatShading />
          </mesh>
          {hojasRoseta.map((h, i) => (
            <mesh
              key={i}
              position={[Math.cos(h.ang) * 0.2, 0.06, Math.sin(h.ang) * 0.2]}
              rotation={[h.inc, -h.ang, 0]}
              castShadow
            >
              <coneGeometry args={[h.ancho, h.largo, 4]} />
              <meshLambertMaterial color={new THREE.Color(PLATA).lerp(new THREE.Color(PLATA_CLARO), h.claro)} flatShading />
            </mesh>
          ))}
          {/* cogollo velloso central (el punto más pálido, el corazón afelpado) */}
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.16, 12, 9]} />
            <meshLambertMaterial color={mezclar('#eef2e6', TINTE, 0.08)} flatShading />
          </mesh>
        </group>

        {/* ── EL BRAZO florido: escapo que sale del costado y hace ademán de
             señalar (el maestro que enseña) con capítulos amarillos ── */}
        <group ref={brazo} position={[0.4, 1.8, 0.12]} rotation={[0, 0, -0.5]}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.03, 0.045, 0.95, 6]} />
            <meshLambertMaterial color={P.frailejonHoja} flatShading />
          </mesh>
          {[[0, 0.92, 0.05], [0.09, 0.86, -0.03], [-0.07, 0.84, 0.05], [0.03, 0.98, -0.02]].map((f, i) => (
            <mesh key={i} position={/** @type {[number, number, number]} */ (f)}>
              <sphereGeometry args={[0.07, 8, 6]} />
              <meshLambertMaterial color={P.frailejonFlor} emissive="#7a5e18" emissiveIntensity={0.2} flatShading />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/* ── CHUSQUE (Chusquea, el bambú del páramo): macollas de culmos finos y
      ARQUEADOS que se doblan con el viento. Cero copa: es fino y plumoso. ── */
function Chusque({ pos, esc = 1, seed = 5 }) {
  const rng = useMemo(() => crearRng(seed), [seed]);
  const culmos = useMemo(
    () => Array.from({ length: 7 }, () => ({
      ang: rng() * Math.PI * 2,
      inc: 0.2 + rng() * 0.35,
      alto: 0.9 + rng() * 0.7,
      verde: rng(),
    })),
    [rng],
  );
  return (
    <group position={pos} scale={esc}>
      {culmos.map((c, i) => (
        <group key={i} rotation={[Math.cos(c.ang) * c.inc, 0, Math.sin(c.ang) * c.inc]}>
          <mesh position={[0, c.alto / 2, 0]}>
            <cylinderGeometry args={[0.012, 0.02, c.alto, 4]} />
            <meshLambertMaterial color={mezclar('#8a9a55', TINTE, 0.25 + c.verde * 0.15)} flatShading />
          </mesh>
          {/* penacho de hoja fina arriba */}
          <mesh position={[0, c.alto + 0.06, 0]}>
            <coneGeometry args={[0.07, 0.28, 4]} />
            <meshLambertMaterial color={mezclar('#9caf5f', TINTE, 0.28)} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── CARDÓN (Puya, la bromelia gigante del páramo): roseta de hojas duras
      espinosas en corona baja y, a veces, una vara-inflorescencia alta. ── */
function Cardon({ pos, esc = 1, vara = true, seed = 9 }) {
  const rng = useMemo(() => crearRng(seed), [seed]);
  const hojas = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({
      ang: (i / 14) * Math.PI * 2 + rng() * 0.2,
      inc: 0.7 + rng() * 0.4,
      largo: 0.4 + rng() * 0.2,
    })),
    [rng],
  );
  return (
    <group position={pos} scale={esc}>
      {hojas.map((h, i) => (
        <mesh
          key={i}
          position={[Math.cos(h.ang) * 0.06, 0.06, Math.sin(h.ang) * 0.06]}
          rotation={[h.inc, -h.ang, 0]}
        >
          <coneGeometry args={[0.05, h.largo, 3]} />
          <meshLambertMaterial color={mezclar('#7e9a58', TINTE, 0.32)} flatShading />
        </mesh>
      ))}
      {vara && (
        <group position={[0, 0.1, 0]}>
          <mesh position={[0, 0.65, 0]}>
            <cylinderGeometry args={[0.03, 0.05, 1.3, 6]} />
            <meshLambertMaterial color={mezclar('#9a8a5a', TINTE, 0.3)} flatShading />
          </mesh>
          <mesh position={[0, 1.35, 0]}>
            <sphereGeometry args={[0.16, 8, 7]} />
            <meshLambertMaterial color={mezclar('#5f7d4a', TINTE, 0.28)} flatShading />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* ── ROMERO DE PÁRAMO (Diplostephium): arbustillo bajo, denso y aromático, de
      follaje fino gris-verde. El sotobosque leñoso del moor, instanciado. ── */
function RomeroParamo({ n }) {
  const ref = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(163);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 10) {
      intentos += 1;
      const wx = (rng() - 0.5) * (ANCHO - 8);
      const wz = (rng() - 0.5) * (FONDO - 10);
      if (humedad(wx, wz) > 0.5) continue;
      if (Math.hypot(wx - ENT_X, wz - ENT_Z) < 2.2) continue; // no contra la guardiana
      if (Math.hypot(wx - TAJO_X, wz - TAJO_Z) < 3.2) continue; // no en la cárcava
      if (distSendero(wx, wz) < 0.9) continue; // no en el sendero
      const y = alturaParamo(wx, wz);
      if (y > 3.4) continue;
      lista.push({ wx, wz, y, esc: 0.5 + rng() * 0.6, giro: rng() * Math.PI, verde: rng() });
    }
    return lista;
  }, [n]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const base = new THREE.Color(mezclar('#6f8a52', TINTE, 0.3));
    const claro = new THREE.Color(mezclar('#8aa565', TINTE, 0.28));
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y + 0.16 * s.esc, s.wz);
      dummy.rotation.set(0, s.giro, 0);
      dummy.scale.set(s.esc, s.esc * 1.15, s.esc);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tinte.copy(base).lerp(claro, s.verde);
      m.setColorAt(i, tinte);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [sitios]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
      <dodecahedronGeometry args={[0.26]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* ── ROCÍO FRÍO EN SUSPENSIÓN: la humedad del páramo hecha visible. Un `Points`
      de motas azul-plata que caen MUY despacio y reaparecen arriba —el aire de
      3.500 m siempre está mojado, cargado de bruma que se condensa. Reemplaza al
      polen dorado del valle: aquí no hay oro flotando, hay agua. Aditivo y sutil;
      determinista por semilla; reduced-motion lo deja quieto (presencia sin
      caída). Es geometría propia del páramo, ligera (un solo draw call). ── */
function RocioFrio({ tier, reducedMotion, semilla = 17 }) {
  const ref = useRef(null);
  const n = tier === 'alto' ? 130 : tier === 'bajo' ? 30 : 70;
  const ANCHA = 26, ALTA = 6, HONDA = 22;
  const datos = useMemo(() => {
    const rng = crearRng(semilla);
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rng() - 0.5) * ANCHA;
      pos[i * 3 + 1] = rng() * ALTA;
      pos[i * 3 + 2] = -3 + (rng() - 0.5) * HONDA;
      vel[i] = 0.12 + rng() * 0.22; // la gota fría baja lento entre la bruma
    }
    return { pos, vel };
  }, [n, semilla]);
  useFrame((_, delta) => {
    if (reducedMotion || !ref.current) return;
    const arr = ref.current.geometry.attributes.position.array;
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < n; i++) {
      const yi = i * 3 + 1;
      arr[yi] -= datos.vel[i] * dt;
      if (arr[yi] < 0.05) arr[yi] = ALTA; // reaparece arriba
      arr[i * 3] += Math.sin((arr[yi] + i) * 0.6) * dt * 0.08; // deriva lateral leve
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[datos.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#dbe9f0"
        size={0.07}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ── LA DANTA DE PÁRAMO — Tapirus pinchaque, la vecina grande del frailejonal.
   El mamífero emblemático del páramo, POR FIN en su casa epónima: el SVG
   rubber-hose de la casa (Danta.jsx — mole lanuda, trompa que tantea, borde
   blanco de orejas y labios) como billboard <Html>, igual que los vecinos del
   Bosque Vivo (FaunaBosque). Nada de low-poly: el estándar es el dibujo.

   Su VIDA es un reloj con jitter (el patrón useVidaIdle, local): PASTA
   paseando unos pasos entre los frailejones y vuelve (movimiento 3D real del
   billboard, con el bamboleo del andar pesado y el flip de la vuelta), HUSMEA
   con la trompa en periscopio (su seña-firma) y REPOSA respirando hondo.
   Nunca el mismo gesto dos veces seguidas. reduced-motion / tier bajo =
   quieta y digna en su puesto (el fotograma manda, ni un timer vivo). */
const DANTA_POS = [4.6, alturaParamo(4.6, 4.2) + 0.85, 4.2]; // el claro del frailejonal, al frente-derecha
const VIDA_DANTA = {
  primero: 'pasea', // abre caminando: lo primero que se ve es que VIVE
  descanso: [6000, 13000],
  momentos: {
    pasea: { dur: 11000, props: { pose: 'anda' }, paseo: [-2.0, 0, 0.9] },
    husmea: { dur: 4600, props: { husmea: true } },
    reposo: { dur: 6200, props: { pose: 'reposo' } },
  },
};
const ESTILO_DANTA = {
  filter: 'drop-shadow(0 2px 4px rgba(30, 44, 56, 0.4))',
  pointerEvents: 'none',
};

/* El reloj de vida (patrón useRelojDeVida de FaunaBosque, local al mockup):
   descanso → gesto → descanso → otro gesto… con jitter y sin repetir. Gate
   activo=false (reduced-motion, tier bajo) = ni un timer vivo. */
function useRelojDanta(activo) {
  const [momento, setMomento] = useState(/** @type {string|null} */ (null));
  useEffect(() => {
    if (!activo) return undefined;
    let timer = 0;
    let ultimo = /** @type {string|null} */ (null);
    let esPrimera = true;
    const claves = Object.keys(VIDA_DANTA.momentos);
    const azarMs = (a, b) => a + Math.random() * (b - a);
    const descansa = () => {
      setMomento(null);
      timer = window.setTimeout(gesticula, azarMs(VIDA_DANTA.descanso[0], VIDA_DANTA.descanso[1]));
    };
    const gesticula = () => {
      let m = esPrimera ? VIDA_DANTA.primero : claves[Math.floor(Math.random() * claves.length)];
      while (m === ultimo) m = claves[Math.floor(Math.random() * claves.length)];
      esPrimera = false;
      ultimo = m;
      setMomento(m);
      timer = window.setTimeout(descansa, VIDA_DANTA.momentos[m].dur);
    };
    // Arranca pronto: la vida se nota en los primeros segundos, no al minuto.
    timer = window.setTimeout(gesticula, azarMs(1800, 4200));
    return () => {
      window.clearTimeout(timer);
      setMomento(null);
    };
  }, [activo]);
  return momento;
}

function DantaDelParamo({ tier, reducedMotion }) {
  const vivo = !reducedMotion && tier !== 'bajo';
  const momento = useRelojDanta(vivo);
  const grupo = useRef(/** @type {any} */ (null));
  const capa = useRef(/** @type {HTMLDivElement|null} */ (null));
  const paseo = useRef(/** @type {{t0: number|null, dur: number, rumbo: number[]}|null} */ (null));

  const momentoCfg = momento ? VIDA_DANTA.momentos[momento] : null;
  useEffect(() => {
    paseo.current = momentoCfg?.paseo
      ? { t0: null, dur: momentoCfg.dur / 1000, rumbo: momentoCfg.paseo }
      : null;
  }, [momentoCfg]);

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g || !vivo) return;
    const pw = paseo.current;
    if (pw) {
      const t = clock.getElapsedTime();
      if (pw.t0 == null) pw.t0 = t;
      const p = Math.min(1, (t - pw.t0) / pw.dur);
      const ida = Math.sin(p * Math.PI); // sale y VUELVE, suave en las puntas
      g.position.set(
        DANTA_POS[0] + pw.rumbo[0] * ida,
        DANTA_POS[1] + Math.abs(Math.sin(t * 3.4)) * 0.045 * ida, // el bamboleo del andar pesado
        DANTA_POS[2] + pw.rumbo[2] * ida,
      );
      // A la vuelta, el flip: la mole regresa mirando a su puesto.
      if (capa.current) capa.current.style.transform = p > 0.5 ? 'scaleX(-1)' : '';
    } else if (g.position.x !== DANTA_POS[0] || g.position.y !== DANTA_POS[1]) {
      g.position.set(DANTA_POS[0], DANTA_POS[1], DANTA_POS[2]);
      if (capa.current) capa.current.style.transform = '';
    }
  });

  return (
    <group ref={grupo} position={/** @type {[number, number, number]} */ (DANTA_POS)}>
      <Html center distanceFactor={13} zIndexRange={[6, 0]} pointerEvents="none">
        <div
          ref={capa}
          aria-hidden="true"
          data-vecino="danta"
          data-momento={momento ?? undefined}
          style={ESTILO_DANTA}
        >
          <Danta size={78} animated={vivo} {...(momentoCfg?.props ?? null)} />
        </div>
      </Html>
    </group>
  );
}

/* ── EL CHIVITO DE PÁRAMO — Oxypogon (barbudito), CO-PROTAGONISTA. El colibrí
      endémico del páramo, POSADO en la flor del frailejón héroe (como en el
      video real del operador), en registro RUBBER-HOSE (billboard <Html>, igual
      que la danta): reusa `BarbuditoParamo` de creatures/. Su reloj de vida lo
      tiene la MAYOR parte del tiempo POSADO —el colibrí de páramo se posa, no
      como el de tierra caliente— con visitas cortas a la corola (liba con la
      lengua afuera y el ala en borrón). reduced-motion / tier bajo = quieto y
      posado (el fotograma manda). Pequeño pero espectacular: la intimidad
      icónica del páramo. ── */
const BARB_POS = /** @type {[number, number, number]} */ ([HERO_X + 0.12, HERO_Y + 1.42, HERO_Z + 0.12]);
function useRelojBarbudito(activo) {
  const [pose, setPose] = useState('posa');
  useEffect(() => {
    if (!activo) return undefined;
    let timer = 0;
    const ciclo = () => {
      // el barbudito se POSA la mayor parte del tiempo (como el bicho real);
      // de a ratos visita la corola y liba, y vuelve a posarse.
      const posando = Math.random() < 0.62;
      setPose(posando ? 'posa' : 'liba');
      timer = window.setTimeout(ciclo, posando ? 4200 + Math.random() * 3200 : 2000 + Math.random() * 1600);
    };
    timer = window.setTimeout(ciclo, 1400 + Math.random() * 1600);
    return () => { window.clearTimeout(timer); setPose('posa'); };
  }, [activo]);
  return pose;
}
function BarbuditoDelFrailejon({ tier, reducedMotion }) {
  const vivo = !reducedMotion && tier !== 'bajo';
  const pose = useRelojBarbudito(vivo);
  return (
    <group position={BARB_POS}>
      <Html center distanceFactor={5.4} zIndexRange={[6, 0]} pointerEvents="none">
        <div
          aria-hidden="true"
          data-vecino="barbudito"
          data-pose={vivo ? pose : 'posa'}
          style={{ filter: 'drop-shadow(0 1px 3px rgba(30, 44, 56, 0.45))', pointerEvents: 'none' }}
        >
          <BarbuditoParamo size={64} animated={vivo} pose={vivo ? pose : 'posa'} />
        </div>
      </Html>
    </group>
  );
}

/* ── RAYOS DE LUZ VOLUMÉTRICOS: los haces fríos que se cuelan entre la niebla
      y bañan a la guardiana — la luz de catedral del páramo. Quads aditivos con
      gradiente PROCEDURAL (canvas en memoria, cero assets externos), fog off
      para que la bruma no se los coma. El haz 0 es el MAYOR: cae sobre la
      queñua. reduced-motion los deja quietos (presencia sin pulso). ── */
function texturaHaz() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const g = c.getContext('2d');
  if (!g) return null;
  // vertical: nace pleno arriba y se disuelve hacia el suelo
  const gv = g.createLinearGradient(0, 0, 0, 256);
  gv.addColorStop(0, 'rgba(255,255,255,0.9)');
  gv.addColorStop(0.6, 'rgba(255,255,255,0.32)');
  gv.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gv;
  g.fillRect(0, 0, 64, 256);
  // lateral: bordes suaves (el haz no es una cinta dura)
  const gh = g.createLinearGradient(0, 0, 64, 0);
  gh.addColorStop(0, 'rgba(255,255,255,0)');
  gh.addColorStop(0.3, 'rgba(255,255,255,1)');
  gh.addColorStop(0.7, 'rgba(255,255,255,1)');
  gh.addColorStop(1, 'rgba(255,255,255,0)');
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = gh;
  g.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}

function RayosDeLuz({ n, reducedMotion }) {
  const grupo = useRef(null);
  const tex = useMemo(() => texturaHaz(), []);
  useEffect(() => () => { if (tex) tex.dispose(); }, [tex]);
  const haces = useMemo(() => {
    const rng = crearRng(407);
    return Array.from({ length: n }, (_, i) => {
      const sobreEnt = i === 0; // el haz mayor baña a la guardiana
      return {
        x: sobreEnt ? ENT_X + 0.5 : (rng() - 0.5) * 17,
        z: sobreEnt ? ENT_Z + 1.2 : -7 + rng() * 12,
        top: 10.8 + rng() * 2.5,
        alto: sobreEnt ? 12.5 : 8.5 + rng() * 3.5,
        ancho: sobreEnt ? 3.2 : 1.1 + rng() * 1.5,
        tilt: -0.1 - rng() * 0.1, // la copa del haz se ladea hacia el sol velado
        giro: -0.3 + rng() * 0.6,
        op: sobreEnt ? 0.38 : 0.2 + rng() * 0.12,
        fase: rng() * Math.PI * 2,
        vel: 0.25 + rng() * 0.3,
      };
    });
  }, [n]);
  useFrame(({ clock }) => {
    if (reducedMotion || !grupo.current) return;
    const t = clock.elapsedTime;
    grupo.current.children.forEach((m, i) => {
      const h = haces[i];
      m.material.opacity = h.op * (0.75 + 0.25 * Math.sin(t * h.vel + h.fase));
      m.rotation.z = h.tilt + Math.sin(t * 0.16 + h.fase) * 0.012;
    });
  });
  if (!tex) return null;
  return (
    <group ref={grupo}>
      {haces.map((h, i) => (
        <mesh key={i} position={[h.x, h.top - h.alto / 2, h.z]} rotation={[0, h.giro, h.tilt]}>
          <planeGeometry args={[h.ancho, h.alto]} />
          <meshBasicMaterial
            map={tex}
            color="#f6fbf3"
            transparent
            opacity={h.op}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── PIEDRAS DEL SENDERO: losas hexagonales claras que caminan la polilínea con
      jitter — el camino de piedra calibre-Switch de las referencias de suelo.
      Instanciadas: 1 draw call para todo el camino. ── */
function PiedrasSendero() {
  const ref = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(271);
    const lista = [];
    for (let i = 0; i < SENDERO_PUNTOS.length - 1; i++) {
      const [ax, az] = SENDERO_PUNTOS[i];
      const [bx, bz] = SENDERO_PUNTOS[i + 1];
      const largo = Math.hypot(bx - ax, bz - az);
      const pasos = Math.max(2, Math.round(largo / 0.75));
      for (let k = 0; k < pasos; k++) {
        const t = k / pasos;
        const wx = ax + (bx - ax) * t + (rng() - 0.5) * 0.7;
        const wz = az + (bz - az) * t + (rng() - 0.5) * 0.7;
        lista.push({ wx, wz, y: alturaParamo(wx, wz), esc: 0.26 + rng() * 0.22, giro: rng() * Math.PI, ovalo: 0.8 + rng() * 0.5, claro: rng() });
      }
    }
    return lista;
  }, []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const base = new THREE.Color(P.piedraSendero);
    const sombra = new THREE.Color(mezclar(P.piedraSendero, P.turba, 0.35));
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y + 0.03, s.wz);
      dummy.rotation.set(0, s.giro, 0);
      dummy.scale.set(s.esc, 0.5, s.esc * s.ovalo);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tinte.copy(sombra).lerp(base, s.claro);
      m.setColorAt(i, tinte);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [sitios]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
      <cylinderGeometry args={[1, 1.15, 0.16, 6]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* ── LA QUEÑUA GUARDIANA: el Ent-queñua REAL del Bosque Vivo (rostro tallado,
      barba de usnea, brazos), MONUMENTAL sobre su altozano. `señala` siempre:
      su brazo maestro apunta al tajo de la lección del suelo, a su derecha.
      NO se duplica geometría: es el mismo componente EntQuenua. ── */
function QuenuaGuardiana({ tier, reducedMotion }) {
  return (
    <group position={[ENT_X, Y_ENT - 0.15, ENT_Z]} rotation={[0, 0.06, 0]} scale={ESC_ENT}>
      <EntQuenua tier={tier} reducedMotion={reducedMotion} señala />
      {/* halo frío tras la copa: la guardiana se recorta contra la luz */}
      <mesh position={[0, 6.9, -1.6]}>
        <circleGeometry args={[2.0, 36]} />
        <meshBasicMaterial
          color="#eef6f0"
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          fog={false}
        />
      </mesh>
    </group>
  );
}

/* ══ CÁMARAS DE LA ESCENA ══ */
const CAM_LIBRE = /** @type {[number, number, number]} */ ([0, 6.1, 17.0]);
const MIRADA_LIBRE = /** @type {[number, number, number]} */ ([0, 1.8, 1.3]);
const CARA_GUARDIANA = /** @type {[number, number, number]} */ ([ENT_X, Y_ENT + 2.35, ENT_Z]);
/* Encuadre de la lección: cámara casi HORIZONTAL a media altura del corte (la
   cara frontal de las capas debe LEERSE de frente, no en picada) con el rostro
   de la guardiana entrando por la izquierda. */
/* Encuadre de la lección: la cámara DENTRO del barranco, baja y casi
   horizontal — la cara de las 5 capas de frente, el rostro de la guardiana
   asomando arriba a la izquierda. */
const CAM_LECCION = /** @type {[number, number, number]} */ ([CORTE_WX + 1.6, Y_TAPA - 1.2, CORTE_WZ + 5.8]);
const MIRADA_LECCION = /** @type {[number, number, number]} */ ([CORTE_WX - 0.6, Y_TAPA - 2.4, CORTE_WZ]);
const _miradaTmp = new THREE.Vector3();

/* El PANEO DE ENTRADA: abre pegado al rostro de la guardiana, barre el
   frailejonal hacia el occidente y se asienta en el plano general. Mientras
   vuela, los OrbitControls están desmontados (nadie pelea la cámara). */
const PANEO_DUR = 9;
function PaneoEntrada({ onFin }) {
  const { camera } = useThree();
  const ini = useRef(/** @type {number|null} */ (null));
  const hecho = useRef(false);
  const { curva, va, vb } = useMemo(() => ({
    curva: new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(ENT_X + 2.6, Y_ENT + 2.2, ENT_Z + 5.4),
        new THREE.Vector3(-6.2, 3.2, 5.2),
        new THREE.Vector3(-6.8, 4.4, 11.2),
        new THREE.Vector3(...CAM_LIBRE),
      ],
      false,
      'catmullrom',
      0.35,
    ),
    va: new THREE.Vector3(...CARA_GUARDIANA),
    vb: new THREE.Vector3(...MIRADA_LIBRE),
  }), []);
  useFrame(({ clock }) => {
    if (hecho.current) return;
    if (ini.current == null) ini.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - ini.current) / PANEO_DUR);
    const e = t * t * (3 - 2 * t);
    curva.getPoint(e, camera.position);
    _miradaTmp.copy(va).lerp(vb, smoothstep(0.55, 1, e));
    camera.lookAt(_miradaTmp);
    if (t >= 1) {
      hecho.current = true;
      onFin();
    }
  });
  return null;
}

/* VUELO genérico: de donde esté la cámara HASTA un punto, con arco suave y
   mirada cruzada. dur<=0 = salto seco (reduced-motion: sin animación). */
function VueloCamara({ hasta, miradaDe, miradaA, dur, onFin }) {
  const { camera, invalidate } = useThree();
  const ini = useRef(/** @type {number|null} */ (null));
  const hecho = useRef(false);
  const { curva, va, vb } = useMemo(() => {
    const p0 = camera.position.clone();
    const p2 = new THREE.Vector3(...hasta);
    const p1 = p0.clone().lerp(p2, 0.5);
    p1.y = Math.max(p0.y, p2.y) + 1.2; // el arco por encima, nunca a ras
    return {
      curva: new THREE.CatmullRomCurve3([p0, p1, p2], false, 'catmullrom', 0.4),
      va: new THREE.Vector3(...miradaDe),
      vb: new THREE.Vector3(...miradaA),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    if (dur > 0) return;
    // salto seco (reduced-motion): posiciona y entrega sin depender de frames
    camera.position.set(hasta[0], hasta[1], hasta[2]);
    camera.lookAt(_miradaTmp.set(miradaA[0], miradaA[1], miradaA[2]));
    hecho.current = true;
    invalidate();
    onFin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFrame(({ clock }) => {
    if (hecho.current) return;
    if (ini.current == null) ini.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - ini.current) / dur);
    const e = t * t * (3 - 2 * t);
    curva.getPoint(e, camera.position);
    _miradaTmp.copy(va).lerp(vb, smoothstep(0.25, 0.9, e));
    camera.lookAt(_miradaTmp);
    if (t >= 1) {
      hecho.current = true;
      onFin();
    }
  });
  return null;
}

/* La escena completa (grupo r3f interno; el default la monta en su Canvas). */
function EscenaParamo({ tier, reducedMotion, fabrica, leccion }) {
  const perfil = perfilDeTier(tier);
  const geo = useMemo(
    () => construirTerreno(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  // presupuestos de la colonia por tier — PASADA 3 densifica el rodal para el
  // paneo (instanciado: la colonia entera sigue siendo 2 draw calls)
  const nFrailejones = tier === 'alto' ? 64 : 36; // frailejonal POBLADO, por edades
  const nPaja = tier === 'alto' ? 200 : 120;
  const nMusgo = tier === 'alto' ? 64 : 38; // más cojines: páramo húmedo
  const nNiebla = tier === 'alto' ? 14 : 9; // más bancos de bruma fría
  const nAves = tier === 'alto' ? 3 : 2;
  const nRomero = tier === 'alto' ? 34 : 18; // sotobosque leñoso más denso
  const nRayos = tier === 'alto' ? 7 : 5; // haces de luz entre la niebla

  /* `color`/`fog` se adjuntan a la ESCENA: hijos directos, nunca en <group>. */
  return (
    <>
      <color attach="background" args={[ATMO.fondo]} />
      {perfil.fog && <fog attach="fog" args={[ATMO.niebla, ATMO.nieblaCerca + 2, ATMO.nieblaLejos]} />}
      <LucesParamo />
      <SolVelado />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      <NacimientoAgua reducedMotion={reducedMotion} fabrica={fabrica} />
      {/* ══ EL HILO DE AGUA ══ prioridad #1: el agua SALE del hondón y baja a las
          veredas por el cauce excavado — la imagen que le faltaba a la fábrica
          de agua ("si se seca, se seca el río" necesita ver el río naciendo). */}
      <HiloDeAgua reducedMotion={reducedMotion} />

      {/* ══ LA QUEÑUA GUARDIANA ══ la PROTAGONISTA: el Ent-queñua real, monumental
          sobre su altozano al fondo-centro, bañada por el haz mayor de luz.
          Su brazo maestro señala el tajo de la lección del suelo. */}
      <QuenuaGuardiana tier={tier} reducedMotion={reducedMotion} />

      {/* ══ LA LECCIÓN DEL SUELO ══ la vitrina de 5 capas de EscenaEntMaestro,
          REUSADA (hojarasca → humus → raíces → red micorrízica → roca madre),
          plantada en el tajo donde la mano de la guardiana señala. Los rótulos
          solo se muestran en modo lección (de lejos serían ruido). */}
      <group
        position={[
          CORTE_WX - ESC_CORTE * CORTE_POS_EM[0],
          Y_TAPA,
          CORTE_WZ - ESC_CORTE * CORTE_POS_EM[2],
        ]}
        scale={ESC_CORTE}
      >
        <CorteSuelo tier={tier} reducedMotion={reducedMotion} rotulos={leccion} arco={leccion} />
      </group>
      {/* luz de vitrina (solo en lección): abre la cara del corte, que mira a la
          cámara a contraluz del cielo; + relleno frío para la roca madre */}
      {leccion && (
        <>
          <directionalLight
            position={[CORTE_WX + 1, Y_TAPA + 1.2, CORTE_WZ + 11]}
            intensity={0.85}
            color="#eef0dd"
          />
          <pointLight
            position={[CORTE_WX, Y_TAPA - 3.1, CORTE_WZ + 1.6]}
            intensity={0.5}
            color="#cfd6dd"
            distance={6}
            decay={2}
          />
        </>
      )}

      {/* el frailejón-maestro pasa a ACOMPAÑANTE al occidente, más atrás y menor:
          sigue enseñando, pero la protagonista del páramo es la queñua */}
      <EntFrailejonMaestro pos={[-7.6, alturaParamo(-7.6, 0.2) - 0.1, 0.2]} esc={1.15} reducedMotion={reducedMotion} />

      {/* el frailejón "de detalle", acompañante junto al sendero — y en su flor,
          el CHIVITO DE PÁRAMO posado (la intimidad icónica del páramo) */}
      <FrailejonHeroe pos={[HERO_X, HERO_Y, HERO_Z]} reducedMotion={reducedMotion} />
      <BarbuditoDelFrailejon tier={tier} reducedMotion={reducedMotion} />
      <FrailejonalInstanciado n={nFrailejones} />

      {/* ══ ANCLA DE ESCALA HUMANA ══ un frailejón ANCIANO (patriarca de ~3 m)
          al frente-izquierda con una CAMINANTE del páramo a su pie, mirándolo:
          el ojo mide la inmensidad por la figura humana conocida (frente-derecha
          la equilibra la danta). La honestidad de la escala, no un rótulo. */}
      <FrailejonAnciano pos={[-5.3, alturaParamo(-5.3, 5.4) - 0.05, 5.4]} esc={1.0} giro={0.5} reducedMotion={reducedMotion} />
      <CaminanteParamo pos={[-4.15, alturaParamo(-4.15, 6.0), 6.0]} giro={-2.2} reducedMotion={reducedMotion} />
      <Pajonal n={nPaja} />
      <CojinesMusgo n={nMusgo} />
      <RomeroParamo n={nRomero} />

      {/* chusque (Chusquea, el bambú del páramo) en macollas en las faldas húmedas */}
      <Chusque pos={[-5.4, alturaParamo(-5.4, 3.2), 3.2]} esc={1.15} seed={5} />
      <Chusque pos={[4.6, alturaParamo(4.6, -3.4), -3.4]} esc={0.95} seed={13} />
      <Chusque pos={[6.0, alturaParamo(6.0, 3.0), 3.0]} esc={1.05} seed={44} />
      {tier === 'alto' && <Chusque pos={[-6.8, alturaParamo(-6.8, -1.2), -1.2]} esc={1.0} seed={21} />}
      {tier === 'alto' && <Chusque pos={[-3.3, alturaParamo(-3.3, 5.0), 5.0]} esc={0.85} seed={57} />}

      {/* cardón (Puya) — la bromelia gigante del páramo, roseta espinosa + vara */}
      <Cardon pos={[3.4, alturaParamo(3.4, 3.6), 3.6]} esc={1.05} vara seed={9} />
      <Cardon pos={[-4.2, alturaParamo(-4.2, 5.2), 5.2]} esc={0.85} vara={false} seed={31} />
      <Cardon pos={[5.4, alturaParamo(5.4, -1.4), -1.4]} esc={0.9} vara seed={63} />

      {/* el BOSQUETE de queñuas: un queñual apretado y abrigado al pie de la
          cuchilla occidental (un pliegue), NO en damero por el páramo abierto */}
      <BosqueteQuenua centro={[-8.4, -2.6]} seed={7} n={tier === 'alto' ? 6 : 4} />
      {/* el ROQUEDAL al pie del bosquete: la roca donde se abrigan las queñuas */}
      <Roquedal pos={[-9.4, alturaParamo(-9.4, -1.4), -1.4]} seed={17} esc={1.15} />
      {/* y un ROQUEDAL al frente-derecha, junto a la Puya: peñascos con líquenes
          naranja/amarillo — el color honesto del páramo alto (lejos de la danta) */}
      <Roquedal pos={[7.0, alturaParamo(7.0, 3.2), 3.2]} seed={29} esc={1.0} />

      <NieblaEnganchada n={nNiebla} reducedMotion={reducedMotion} />
      <RayosDeLuz n={nRayos} reducedMotion={reducedMotion} />
      <PiedrasSendero />

      {/* ══ LA DANTA DE PÁRAMO ══ Tapirus pinchaque pastando entre los
          frailejones: el SVG rubber-hose de la casa como billboard, con su
          reloj de vida (pasea / husmea / reposa). Su casa epónima. */}
      <DantaDelParamo tier={tier} reducedMotion={reducedMotion} />

      <AvePosada />
      {!reducedMotion && <AvesParamo n={nAves} />}

      {/* el ROCÍO FRÍO en suspensión: la humedad del páramo, no el polen dorado */}
      <RocioFrio tier={tier} reducedMotion={reducedMotion} semilla={17} />
    </>
  );
}

/* Estilos de ESTA escena (chrome DOM sobre el Canvas). */
const CSS_PARAMO = `
.paramo-root { position: relative; width: 100%; height: 100dvh; min-height: 320px; overflow: hidden; background: ${ATMO.fondo}; }
.paramo-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.paramo-canvas--lista { opacity: 1; }
.paramo-chrome { position: absolute; inset: 0; z-index: 7; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.paramo-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #22303c; text-shadow: 0 1px 8px rgba(226,238,245,0.75); font: 700 1.18rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.paramo-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.84; margin-top: 0.15rem; }
.paramo-pie { padding: 0 1rem 0.9rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem; }
.paramo-carta { margin: 0; max-width: 32rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(30,44,56,0.62); backdrop-filter: blur(3px); color: #eef5f9; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.paramo-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(30,44,56,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(233,242,247,0.85); color: #26333d; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.paramo-boton:hover, .paramo-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(30,44,56,0.6); outline: none; }
.paramo-boton[aria-pressed='true'] { background: #cfe3ee; border-color: rgba(38,51,61,0.75); color: #22303c; }
@media (prefers-reduced-motion: reduce) { .paramo-canvas { transition: none; } }
`;

/* La copia didáctica: en calma, la invitación; en fábrica, cómo nace el agua;
   en lección, las cinco capas del suelo que la guardiana enseña. */
const COPY_CALMA =
  'Este es el páramo altoandino: niebla fría, rayos de sol que se cuelan, y su guardiana, la queñua — el árbol más alto de la montaña. Siga el sendero hasta sus pies, o toque un botón para aprender.';
const COPY_FABRICA =
  'Los frailejones peinan la niebla con sus hojas velludas; el musgo y la turba la guardan como una esponja. Del hondón, gota a gota, nace el agua. Por eso el páramo se cuida: si se seca, se seca el río.';
const COPY_LECCION =
  'La guardiana abre la tierra y enseña sus cinco pisos, uno por uno: la hojarasca que abriga, el humus vivo, la zona de raíces, la red de hongos que reparte el alimento y la roca madre.';

const RUTA_MUNDO_MICROFAUNA = '#/mockups/mundo-microfauna-3d';

function abrirMundoMicrofauna() {
  window.location.hash = RUTA_MUNDO_MICROFAUNA;
}

/**
 * MundoParamo3D — el páramo altoandino, montable con su propio `<Canvas>`.
 * Sin lógica de negocio: es una vitrina (#/mockups/mundo-paramo-3d). El tier y
 * reduced-motion se detectan aquí (mockup standalone), igual que sus pares.
 */
export default function MundoParamo3D() {
  const [listo, setListo] = useState(false);
  const [fabrica, setFabrica] = useState(false);
  // decidirTier() devuelve { tier, motivo, reducedMotion }: hay que sacar el
  // tier (si no, `tier === 'alto'` nunca es cierto y el rodal cae a `medio`).
  const { tier } = useMemo(() => decidirTier(), []);
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const perfil = perfilDeTier(tier);

  /* La máquina de la cámara: 'entrada' (el paneo espectacular) → 'libre'
     (orbitar el páramo) ↔ 'aLeccion'/'leccion'/'aLibre' (volar a la vitrina
     del suelo y volver). reduced-motion arranca en libre y salta sin vuelos. */
  const [modo, setModo] = useState(() => (reducedMotion ? 'libre' : 'entrada'));
  const enLeccion = modo === 'leccion' || modo === 'aLeccion';
  const alternarLeccion = () => {
    if (enLeccion) setModo(reducedMotion ? 'libre' : 'aLibre');
    else setModo(reducedMotion ? 'leccion' : 'aLeccion');
  };
  const camIni = useMemo(
    () => (reducedMotion ? CAM_LIBRE : /** @type {[number, number, number]} */ ([ENT_X + 2.6, Y_ENT + 2.2, ENT_Z + 5.4])),
    [reducedMotion],
  );

  return (
    <section
      className="paramo-root"
      data-tier={tier}
      aria-label="El páramo altoandino: el ecosistema de la niebla, la fábrica de agua"
    >
      <style>{CSS_PARAMO + CSS_ROTULOS}</style>
      <Canvas
        className={`paramo-canvas${listo ? ' paramo-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: camIni, fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <EscenaParamo tier={tier} reducedMotion={reducedMotion} fabrica={fabrica} leccion={enLeccion} />

        {modo === 'entrada' && <PaneoEntrada onFin={() => setModo('libre')} />}
        {modo === 'aLeccion' && (
          <VueloCamara
            hasta={CAM_LECCION}
            miradaDe={MIRADA_LIBRE}
            miradaA={MIRADA_LECCION}
            dur={2.8}
            onFin={() => setModo('leccion')}
          />
        )}
        {modo === 'aLibre' && (
          <VueloCamara
            hasta={CAM_LIBRE}
            miradaDe={MIRADA_LECCION}
            miradaA={MIRADA_LIBRE}
            dur={2.8}
            onFin={() => setModo('libre')}
          />
        )}
        {modo === 'libre' && (
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom
            minDistance={7}
            maxDistance={24}
            target={MIRADA_LIBRE}
            minPolarAngle={0.5}
            maxPolarAngle={1.42}
            minAzimuthAngle={-1.1}
            maxAzimuthAngle={1.1}
            enableDamping
            dampingFactor={0.08}
            autoRotate={!reducedMotion}
            autoRotateSpeed={0.1}
          />
        )}
        {modo === 'leccion' && (
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom
            minDistance={3.5}
            maxDistance={16}
            target={MIRADA_LECCION}
            minPolarAngle={0.45}
            maxPolarAngle={1.5}
            minAzimuthAngle={-0.9}
            maxAzimuthAngle={0.9}
            enableDamping
            dampingFactor={0.08}
            /* SIN autoRotate en la lección: la cámara NO pelea la observación —
               solo se mueve en las transiciones (el campesino mira a su ritmo). */
            autoRotate={false}
          />
        )}
        <AdaptiveDpr pixelated />
      </Canvas>

      <div className="paramo-chrome">
        <h2 className="paramo-titulo">
          El páramo: la fábrica de agua
          <small>La queñua guardiana, el frailejonal, la lección del suelo y el nacimiento del agua</small>
        </h2>
        <div className="paramo-pie">
          <button
            type="button"
            className="paramo-boton"
            aria-pressed={enLeccion}
            onClick={alternarLeccion}
          >
            {enLeccion ? 'Volver al páramo' : 'La lección del suelo'}
          </button>
          {enLeccion && (
            <button
              type="button"
              className="paramo-boton"
              onClick={abrirMundoMicrofauna}
            >
              Explorar la vida del suelo
            </button>
          )}
          <button
            type="button"
            className="paramo-boton"
            aria-pressed={fabrica}
            onClick={() => setFabrica((v) => !v)}
          >
            {fabrica ? 'Ver el páramo en calma' : 'Ver cómo nace el agua'}
          </button>
          <p className="paramo-carta" role="status">
            {enLeccion ? COPY_LECCION : fabrica ? COPY_FABRICA : COPY_CALMA}
          </p>
        </div>
      </div>
    </section>
  );
}
