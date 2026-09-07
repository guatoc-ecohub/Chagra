/*
 * EscenaEstratos — ARQUETIPO `estratos`: la VERTICALIDAD como lección.
 *
 * Sirve DOS mundos con la MISMA geometría, elegidos por datos (DR §4.2, "una
 * entrada = un mundo; cero código de escena nuevo"):
 *
 *   · `disenio`  → params.estratos: los 7 estratos del BOSQUE COMESTIBLE (dosel
 *                  → raíz). La verticalidad ES el diseño de la finca.
 *   · `pisos`    → params.pisos: la LADERA ANDINA en corte, el gradiente
 *                  ALTITUDINAL (cálido → templado → frío → páramo). La altura
 *                  manda: en cada piso crece lo suyo. Señal SUTIL de cambio
 *                  climático (termofilización: los pisos suben), sin catástrofe.
 *
 * Bandas/terrazas con vegetación low-poly repetida y `MeshLambert` sin sombras
 * (DR §6). Con `params.pisos` presente se dibuja la ladera; si no, el bosque
 * comestible de siempre (retro-compatible byte a byte para `disenio`).
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import EscenaBase3D from './EscenaBase3D.jsx';
import { Fauna } from './FaunaEscena.jsx';
import { faunaDeMundo } from '../faunaFuncional.js';
import { CIELOS, PALETA, mezclarCielo } from '../atmosferaMadre.js';

/* La fauna funcional por estrato (POLINIZADORES en dosel/sotobosque + un
   DESCOMPONEDOR en la hojarasca, para `disenio`; POLINIZADORES del aire
   templado/frío para `pisos`) vive en faunaFuncional.js, por mundo. */

const ESTRATOS_DEF = [
  { nombre: 'emergente', alto: 3.4, color: '#2f5f34', r: 0.6 },
  { nombre: 'dosel', alto: 2.6, color: '#3a6f3f', r: 0.7 },
  { nombre: 'sub-dosel', alto: 1.9, color: '#4a7d45', r: 0.6 },
  { nombre: 'arbusto', alto: 1.2, color: '#5f8a3f', r: 0.5 },
  { nombre: 'herbáceo', alto: 0.7, color: '#7aa24a', r: 0.4 },
  { nombre: 'rastrero', alto: 0.35, color: '#8fae55', r: 0.5 },
  { nombre: 'raíz', alto: 0.15, color: '#8a6a44', r: 0.4 },
];

function Planta({ x, z, alto, color, r }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, alto * 0.35, 0]}>
        <cylinderGeometry args={[0.06, 0.09, alto * 0.7, 5]} />
        <meshLambertMaterial color={PALETA.tierra} flatShading />
      </mesh>
      <mesh position={[0, alto * 0.78, 0]}>
        <coneGeometry args={[r, alto * 0.7, 7]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}

/* ── El bosque comestible (mundo `disenio`) — sin cambios ─────────────────── */
function DioramaEstratos({ params, reducedMotion, fauna, tier, viento }) {
  const estratos = params?.estratos || ESTRATOS_DEF;
  const plantas = useMemo(() => {
    const out = [];
    let s = 7;
    estratos.forEach((e, ei) => {
      const cuenta = ei < 2 ? 2 : 3;
      for (let i = 0; i < cuenta; i++) {
        s = (s * 1103515245 + 12345) >>> 0;
        const x = ((s % 1000) / 1000 - 0.5) * 3.8;
        s = (s * 1103515245 + 12345) >>> 0;
        const z = ((s % 1000) / 1000 - 0.5) * 2.4 - 0.4;
        out.push({ key: `${ei}-${i}`, x, z, alto: e.alto, color: e.color, r: e.r });
      }
    });
    return out;
  }, [estratos]);
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.6, 30]} />
        <meshLambertMaterial color="#6d5030" />
      </mesh>
      {plantas.map((p) => (
        <Planta key={p.key} x={p.x} z={p.z} alto={p.alto} color={p.color} r={p.r} />
      ))}
      {/* la vida repartida por estratos: polinizadores arriba, descomponedor abajo */}
      <Fauna items={fauna} reducedMotion={reducedMotion} tier={tier} viento={viento} />
    </group>
  );
}

/* ═══ LA LADERA ANDINA (mundo `pisos`) ════════════════════════════════════════
 * Cuatro terrazas que suben del cálido al páramo, cada una con su cultivo
 * emblemático low-poly y su color térmico (dorado abajo → azul-frío/blanco
 * arriba). Vida sólo donde de veras vive: colibrí y mariposa en templado/frío;
 * el páramo va sin bichos (honestidad ecológica) y con niebla que capta agua.
 */

/* Cuánto sube y cuánto se mete al fondo cada piso (staircase de ladera). */
const PISO_SUBE = 1.15;
const PISO_FONDO = 0.7;
const pisoY = (i) => 0.2 + i * PISO_SUBE; // superficie de la terraza i
const pisoZ = (i) => 0.6 - i * PISO_FONDO; // se recede al subir (profundidad)

/* Plátano/frutal (piso cálido): pseudotallo verde + hojas grandes colgantes. */
function Platano() {
  return (
    <group>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 0.76, 6]} />
        <meshLambertMaterial color="#7d8a3e" flatShading />
      </mesh>
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh
          key={k}
          position={[Math.cos((k / 5) * Math.PI * 2) * 0.16, 0.74, Math.sin((k / 5) * Math.PI * 2) * 0.16]}
          rotation={[Math.PI * 0.42, (k / 5) * Math.PI * 2, 0]}
          scale={[0.5, 1, 1]}
        >
          <coneGeometry args={[0.1, 0.62, 4]} />
          <meshLambertMaterial color="#4f7a34" flatShading />
        </mesh>
      ))}
      {/* racimo (fruto) */}
      <mesh position={[0.1, 0.5, 0.08]} scale={[0.6, 1, 0.6]}>
        <sphereGeometry args={[0.12, 6, 5]} />
        <meshLambertMaterial color="#b9c24a" flatShading />
      </mesh>
    </group>
  );
}

/* Cafeto de sombra (piso templado): arbusto redondo + cerezas rojas. */
function Cafeto() {
  return (
    <group>
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.26, 5]} />
        <meshLambertMaterial color={PALETA.tierra} flatShading />
      </mesh>
      <mesh position={[0, 0.42, 0]} scale={[1, 0.95, 1]}>
        <sphereGeometry args={[0.28, 7, 6]} />
        <meshLambertMaterial color={PALETA.follajeOscuro} flatShading />
      </mesh>
      {[0, 1, 2, 3].map((k) => (
        <mesh
          key={k}
          position={[Math.cos((k / 4) * Math.PI * 2) * 0.24, 0.42 + (k % 2) * 0.08, Math.sin((k / 4) * Math.PI * 2) * 0.24]}
        >
          <sphereGeometry args={[0.04, 5, 4]} />
          <meshLambertMaterial color="#c0392b" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Papa (piso frío): mata baja y matoja + flores lilas. */
function Papa() {
  return (
    <group>
      <mesh position={[0, 0.14, 0]} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[0.3, 7, 6]} />
        <meshLambertMaterial color={PALETA.follaje} flatShading />
      </mesh>
      <mesh position={[0.22, 0.11, 0.14]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[0.18, 6, 5]} />
        <meshLambertMaterial color="#6d9748" flatShading />
      </mesh>
      {[[-0.1, 0.3, 0.08], [0.14, 0.28, -0.05]].map((p, k) => (
        <mesh key={k} position={/** @type {[number, number, number]} */ (p)}>
          <sphereGeometry args={[0.035, 5, 4]} />
          <meshLambertMaterial color="#d3c2e6" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Frailejón (Espeletia, Asteraceae — páramo): roseta CAULESCENTE, la forma que
   lo define (Bitácora de flora, Inst. Humboldt): tronco de hojas viejas
   marcescentes (columna gris-parda, no leña) + roseta de hojas gruesas y
   velludas que suben, PLATEADAS por la pubescencia que las abriga del frío y la
   radiación, coronadas por capítulos AMARILLOS (son girasoles de altura). Ref.
   E. grandiflora (Chingaza/Sumapaz), E. hartwegiana (nevados). NO es cultivo: es
   conservación (el páramo se cuida, no se ara). */
function Frailejon() {
  return (
    <group>
      {/* tronco: columna de hojas muertas persistentes (marcescencia), fibrosa */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.64, 7]} />
        <meshLambertMaterial color="#6f5e44" flatShading />
      </mesh>
      {/* roseta: hojas apuntando arriba-afuera, plateadas por la pubescencia */}
      {Array.from({ length: 10 }, (_, k) => (
        <mesh
          key={k}
          position={[Math.cos((k / 10) * Math.PI * 2) * 0.11, 0.66, Math.sin((k / 10) * Math.PI * 2) * 0.11]}
          rotation={[Math.PI * 0.26, (k / 10) * Math.PI * 2, 0]}
        >
          <coneGeometry args={[0.05, 0.36, 4]} />
          <meshLambertMaterial color="#b3bda0" flatShading />
        </mesh>
      ))}
      {/* cogollo: las hojas nuevas, las más blancas (máxima pubescencia) */}
      <mesh position={[0, 0.78, 0]}>
        <coneGeometry args={[0.11, 0.2, 6]} />
        <meshLambertMaterial color="#cdd4c2" flatShading />
      </mesh>
      {/* capítulos amarillos (Asteraceae): flores sobre tallitos que asoman de la
          roseta — el rasgo que faltaba, y el que pinta de amarillo el páramo */}
      {[0, 1, 2, 3].map((k) => {
        const a = (k / 4) * Math.PI * 2 + 0.6;
        const fx = Math.cos(a) * 0.19;
        const fz = Math.sin(a) * 0.19;
        return (
          <group key={`flor-${k}`} position={[fx, 0.74, fz]}>
            <mesh position={[0, 0.07, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.14, 4]} />
              <meshLambertMaterial color="#7f8a48" flatShading />
            </mesh>
            <mesh position={[0, 0.15, 0]} scale={[1, 0.5, 1]}>
              <sphereGeometry args={[0.045, 7, 5]} />
              <meshLambertMaterial color="#e6bf2e" flatShading />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

const CULTIVOS = { platano: Platano, cafe: Cafeto, papa: Papa, frailejon: Frailejon };

function SiluetaCultivo({ tipo, x, y, z, esc = 1 }) {
  const Comp = CULTIVOS[tipo];
  if (!Comp) return null;
  return (
    <group position={[x, y, z]} scale={[esc, esc, esc]}>
      <Comp />
    </group>
  );
}

/* Puf de niebla del páramo (capta agua): esfera achatada, translúcida, quieta
   (digna con reduced-motion: no se mueve, no desaparece). `sx` la estira a lo
   ancho para los jirones de piso al pie de la cordillera. */
function Niebla({ x, y, z, r = 0.5, sx = 1 }) {
  return (
    <mesh position={[x, y, z]} scale={[sx, 0.34, 1]}>
      <sphereGeometry args={[r, 8, 6]} />
      <meshBasicMaterial color="#eef4f4" transparent opacity={0.5} />
    </mesh>
  );
}

/* ═══ La cordillera del fondo (mirada Humboldt) ══════════════════════════════
 * Un heightfield low-poly de UNA malla con dos crestas: la verde cercana y los
 * nevados lejanos. Es la receta de terreno del mundo del páramo (ruido
 * determinista de senos + campanas de Gauss + colores por vértice): relieve
 * con masa y volumen, no siluetas contables. Las bandas de color cuentan el
 * mismo cuento térmico del diorama —verde dominante abajo, verde-plata de
 * frailejón arriba, nieve sólo en los picos— y la perspectiva aérea tiñe lo
 * hondo hacia la niebla REAL de la escena (mezclarCielo(CIELOS.ladera)), para
 * que la cordillera se funda con el cielo en vez de flotar delante.
 * Determinista: la misma cordillera siempre, sin Math.random. */
const CORD = { ancho: 17, fondo: 6.6, zFrente: -2.2, segX: 96, segZ: 30 };
const suavizar = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
const campana = (x, c, s) => Math.exp(-((x - c) * (x - c)) / (2 * s * s));
function ruidoCordillera(x, z) {
  return (
    Math.sin(x * 0.8 + z * 0.6) * 0.5 +
    Math.sin(x * 1.9 - z * 1.4 + 2.3) * 0.3 +
    Math.sin(x * 3.1 + z * 2.7 + 5.1) * 0.2
  );
}
/* Altura del relieve: amplitud por Gauss a lo largo de x, sección de Gauss en
   z (lomo redondo con masa, no triángulo). La cresta lejana es la más alta
   (los nevados); la cercana queda en el verde y el subpáramo. */
function alturaCordillera(x, z) {
  const cercana =
    (1.35 * campana(x, -2.9, 2.2) +
      1.15 * campana(x, 1.7, 1.8) +
      1.0 * campana(x, 5.9, 2.4) +
      0.95 * campana(x, -6.9, 2.6)) *
    campana(z, -3.6, 1.2);
  const nevados =
    (3.05 * campana(x, -3.0, 2.4) +
      2.6 * campana(x, 4.9, 3.0) +
      2.55 * campana(x, -6.4, 3.2)) *
    campana(z, -6.8, 1.5);
  let h = 0.15 + cercana + nevados;
  h += ruidoCordillera(x * 0.9, z * 0.9) * 0.16 * (1 + h * 0.3); // más arrugas arriba
  // La falda muere en los bordes de la franja: nada de tajos contra el cielo.
  h *= suavizar(CORD.zFrente, CORD.zFrente - 0.9, z);
  h *= suavizar(CORD.zFrente - CORD.fondo, CORD.zFrente - CORD.fondo + 0.9, z);
  h *= 1 - suavizar(6.6, 8.4, Math.abs(x));
  return Math.max(h, 0.02);
}
function construirCordillera() {
  const { ancho, fondo, zFrente, segX, segZ } = CORD;
  const nx = segX + 1;
  const nz = segZ + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cClaro = new THREE.Color(PALETA.follajeClaro);
  const cVerde = new THREE.Color(PALETA.follaje);
  const cMonte = new THREE.Color(PALETA.follajeOscuro);
  const cParamo = new THREE.Color('#b3bda0'); // el plateado del frailejón
  const cNieve = new THREE.Color('#e9f1f2');
  // La lejanía muere en la niebla REAL de la escena, teñida hacia el sage del
  // páramo: la luz dorada la entibia sola — cream puro daría desierto, no Andes.
  const cBruma = new THREE.Color(mezclarCielo(CIELOS.ladera).niebla).lerp(cParamo, 0.3);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const z = zFrente - (fondo * iz) / segZ;
    for (let ix = 0; ix < nx; ix++) {
      const x = -ancho / 2 + (ancho * ix) / segX;
      const y = alturaCordillera(x, z);
      pos[p] = x;
      pos[p + 1] = y;
      pos[p + 2] = z;
      // las franjas altitudinales: verde de monte que se enfría al subir. Los
      // verdes van HONDOS a propósito: la luz dorada de la escena lava los
      // olivas a caqui, y esta ladera tiene que leer VERDE (verde-dominante).
      c.copy(cVerde).lerp(cMonte, suavizar(0.45, 1.6, y));
      // la franja de páramo va ANGOSTA y arriba (Humboldt: el bosque sube
      // hasta casi el filo; el pálido es faja, no cuerpo) y la nieve, puntas.
      c.lerp(cParamo, suavizar(2.05, 2.55, y));
      c.lerp(cNieve, suavizar(2.6, 2.95, y));
      // claros de sol moteados en lo verde + perspectiva aérea hacia el fondo
      c.lerp(cClaro, 0.15 * (ruidoCordillera(x * 1.7, z * 1.7) * 0.5 + 0.5) * (1 - suavizar(1.7, 2.3, y)));
      c.lerp(cBruma, 0.42 * suavizar(zFrente - 2.0, zFrente - fondo + 0.4, z));
      col[p] = c.r;
      col[p + 1] = c.g;
      col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
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
  geo = geo.toNonIndexed(); // caras planas de verdad (una normal por cara)
  geo.computeVertexNormals();
  return geo;
}
function Cordillera() {
  const geo = useMemo(() => construirCordillera(), []);
  return (
    <mesh geometry={geo}>
      <meshLambertMaterial vertexColors flatShading />
    </mesh>
  );
}

/* Color del talud de tierra entre terrazas: más cálido abajo, más rocoso y frío
   arriba (el suelo también cuenta el gradiente térmico). */
const TALUD_COLOR = ['#8a6a44', '#8d6b45', '#7e6248', '#71625a'];

function DioramaPisos({ params, reducedMotion, fauna, tier, viento }) {
  const pisos = useMemo(() => params?.pisos || [], [params?.pisos]);
  // Cultivos por terraza, con aire (3 por piso, jitter y escala deterministas —
  // antes iban 2 matas diminutas por piso y la ladera se veía pelada).
  const siembra = useMemo(() => {
    const out = [];
    let s = 11;
    pisos.forEach((p, i) => {
      const cuenta = 3;
      const ancho = 0.72 - i * 0.07; // las terrazas se angostan al subir
      for (let j = 0; j < cuenta; j++) {
        s = (s * 1103515245 + 12345) >>> 0;
        const x = (j - (cuenta - 1) / 2) * ancho + ((s % 1000) / 1000 - 0.5) * 0.3;
        s = (s * 1103515245 + 12345) >>> 0;
        const z = pisoZ(i) + ((s % 1000) / 1000 - 0.5) * 0.45;
        s = (s * 1103515245 + 12345) >>> 0;
        const esc = 0.85 + ((s % 1000) / 1000) * 0.35;
        out.push({ key: `${i}-${j}`, tipo: p.cultivo, x, y: pisoY(i) + 0.07, z, esc });
      }
    });
    return out;
  }, [pisos]);

  // Pasto/paja y piedras por terraza: textura menuda que quita lo "pelado"
  // sin robarse el protagonismo de los cultivos. Determinista (LCG).
  const menudencia = useMemo(() => {
    const out = [];
    let s = 29;
    pisos.forEach((p, i) => {
      const rMax = 1.05 - i * 0.13;
      for (let k = 0; k < 6; k++) {
        s = (s * 1103515245 + 12345) >>> 0;
        const a = ((s % 1000) / 1000) * Math.PI * 2;
        s = (s * 1103515245 + 12345) >>> 0;
        const rr = 0.35 + ((s % 1000) / 1000) * (rMax - 0.35);
        out.push({
          key: `t-${i}-${k}`,
          tipo: 'pasto',
          x: Math.cos(a) * rr,
          y: pisoY(i) + 0.08,
          z: pisoZ(i) + Math.sin(a) * rr * 0.55,
          // paja amarillenta en el páramo, pasto verde abajo
          color: i === pisos.length - 1 ? '#b8b183' : '#7a9a3f',
        });
      }
      if (i >= 2) {
        s = (s * 1103515245 + 12345) >>> 0;
        const a = ((s % 1000) / 1000) * Math.PI * 2;
        out.push({
          key: `r-${i}`,
          tipo: 'roca',
          x: Math.cos(a) * (rMax - 0.15),
          y: pisoY(i) + 0.12,
          z: pisoZ(i) + Math.sin(a) * (rMax - 0.15) * 0.55,
          color: PALETA.piedra,
        });
      }
    });
    return out;
  }, [pisos]);

  return (
    /* El grupo baja 1.55: centra la escalera alrededor del ORIGEN. Sin esto,
       con reduced-motion (director de cámara inerte, OrbitControls mirando a
       (0,0,0)) toda la ladera quedaba por encima del centro del cuadro: páramo
       cortado y medio lienzo vacío abajo. Los hotspots de `pisos` en
       mundoData.js bajan lo mismo. */
    <group position={[0, -1.55, 0]}>
      {/* la cordillera al fondo: relieve con masa (mirada Humboldt) — verde
          dominante, subpáramo plateado y nevados que se funden con la bruma */}
      <Cordillera />
      {/* niebla de piso: jirones al pie de la cordillera y en el vallecito
          entre las dos crestas (la misma niebla del páramo, estirada) */}
      <Niebla x={-4.6} y={1.3} z={-3.3} r={0.8} sx={2.4} />
      <Niebla x={3.0} y={1.1} z={-3.2} r={0.7} sx={2.0} />
      <Niebla x={-0.8} y={1.85} z={-5.3} r={0.9} sx={2.8} />
      <Niebla x={5.4} y={1.5} z={-5.1} r={0.8} sx={2.2} />

      {/* las cuatro terrazas que suben, cada una con su color térmico */}
      {pisos.map((p, i) => (
        <group key={p.id}>
          <mesh position={[0, pisoY(i), pisoZ(i)]}>
            <cylinderGeometry args={[1.28 - i * 0.13, 1.36 - i * 0.13, 0.22, 24]} />
            <meshLambertMaterial color={p.color} flatShading />
          </mesh>
          {/* TALUD de tierra: el cuerpo de la montaña entre terraza y terraza.
              Antes había un palito de 0.14 de radio y los pisos flotaban como
              torta en pedestal; este cono truncado llena el aire y la ladera
              se lee como UNA montaña escalonada, no como platos apilados. */}
          {i > 0 && (
            <mesh position={[0, pisoY(i) - 0.63, pisoZ(i) - 0.05]}>
              <cylinderGeometry
                args={[0.95 - i * 0.12, 1.24 - (i - 1) * 0.13, 1.1, 24]}
              />
              <meshLambertMaterial color={TALUD_COLOR[i]} flatShading />
            </mesh>
          )}
        </group>
      ))}
      {/* la falda que asienta la ladera en el suelo (antes el piso cálido
          también flotaba) */}
      <mesh position={[0, -0.02, 0.6]}>
        <cylinderGeometry args={[1.34, 1.62, 0.32, 24]} />
        <meshLambertMaterial color={TALUD_COLOR[0]} flatShading />
      </mesh>

      {/* la vegetación emblemática de cada piso */}
      {siembra.map((c) => (
        <SiluetaCultivo key={c.key} tipo={c.tipo} x={c.x} y={c.y} z={c.z} esc={c.esc} />
      ))}

      {/* pasto/paja y piedras: la textura menuda de cada piso */}
      {menudencia.map((m) =>
        m.tipo === 'pasto' ? (
          <mesh key={m.key} position={[m.x, m.y, m.z]}>
            <coneGeometry args={[0.05, 0.16, 4]} />
            <meshLambertMaterial color={m.color} flatShading />
          </mesh>
        ) : (
          <mesh key={m.key} position={[m.x, m.y, m.z]} rotation={[0.4, 1.1, 0.2]}>
            <dodecahedronGeometry args={[0.1, 0]} />
            <meshLambertMaterial color={m.color} flatShading />
          </mesh>
        ),
      )}

      {/* niebla del páramo (piso más alto): capta agua, quieta y digna */}
      {pisos.map((p, i) =>
        p.niebla ? (
          <group key={`n-${p.id}`}>
            <Niebla x={-0.4} y={pisoY(i) + 0.7} z={pisoZ(i) + 0.2} r={0.55} />
            <Niebla x={0.55} y={pisoY(i) + 0.55} z={pisoZ(i) - 0.15} r={0.45} />
            <Niebla x={0.1} y={pisoY(i) + 0.9} z={pisoZ(i) + 0.35} r={0.4} />
          </group>
        ) : null,
      )}

      {/* señal SUTIL de que los pisos suben (termofilización): flecha ámbar
          tenue al costado — cuidado, nunca alarma (norte "finca viva"). */}
      <group position={[1.85, pisoY(2), pisoZ(2) + 0.2]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.9, 5]} />
          <meshBasicMaterial color={PALETA.ambar} transparent opacity={0.5} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <coneGeometry args={[0.08, 0.2, 5]} />
          <meshBasicMaterial color={PALETA.ambar} transparent opacity={0.55} />
        </mesh>
      </group>

      {/* vida sólo donde vive: polinizadores del templado/frío; páramo sin fauna */}
      <Fauna items={fauna} reducedMotion={reducedMotion} tier={tier} viento={viento} />
    </group>
  );
}

export default function EscenaEstratos(props) {
  const esPisos = Array.isArray(props.params?.pisos);
  const cielo = esPisos ? CIELOS.ladera : CIELOS.sotobosque;
  // Encuadre `pisos`: el diorama va centrado en el origen (ver DioramaPisos),
  // así la pose CRUDA de reduced-motion (target (0,0,0)) también muestra los
  // cuatro pisos con el páramo de remate — antes salía cortado por arriba.
  const camara = esPisos ? { position: [4.9, 2.8, 7.9], fov: 47 } : { position: [3.5, 3, 6], fov: 44 };
  const centro = esPisos ? [0, 0.65, -0.5] : [0, 1.4, 0];
  const fauna = faunaDeMundo(props.mundoId, { tier: props.tier });
  return (
    <EscenaBase3D
      {...props}
      cielo={cielo}
      camara={camara}
      entrada={{ ...props.entrada, centro }}
    >
      {esPisos ? (
        <DioramaPisos params={props.params} reducedMotion={props.reducedMotion} fauna={fauna} tier={props.tier} viento={props.estadoFinca?.viento} />
      ) : (
        <DioramaEstratos params={props.params} reducedMotion={props.reducedMotion} fauna={fauna} tier={props.tier} viento={props.estadoFinca?.viento} />
      )}
    </EscenaBase3D>
  );
}
