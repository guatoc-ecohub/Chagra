/*
 * EscenaBoveda — ARQUETIPO `boveda`: EL CIELO bajo el que vive la finca.
 *
 * La ÚNICA metáfora espacial nueva del batch (README §case-3): la vez que se
 * escribe R3F de escena nuevo. Todo lo demás (Canvas, luz, cámara, hotspots, la
 * abeja) lo hereda de EscenaBase3D como los otros arquetipos.
 *
 * Qué enseña, por DATOS (`params`), no por código:
 *   · hora        0..1  → el SOL que arquea (amanecer→mediodía→tarde) y el tinte
 *                         del cielo. La luna acompaña, quieta, como el otro turno.
 *   · temporada   'lluvia'|'seca' → el RÉGIMEN BIMODAL andino (dos lluvias / dos
 *                         secas; NO cuatro estaciones europeas). En lluvia: nubes
 *                         más llenas + aguacero suave. En seca: cielo despejado.
 *   · niebla      0..1  → la NIEBLA del páramo que el frailejón peina para dar agua.
 *   · pisos       [...] → la MONTAÑA en cuatro pisos térmicos (misma paleta del
 *                         mundo #4): cálido→templado→frío→páramo, apilados.
 *   · glaciar     {...} → el casquete de hielo + la línea ámbar de hasta dónde
 *                         llegaba (retroceso). NOTA DE CONCIENCIA, jamás alarma:
 *                         se pinta ÁMBAR de "cuídelo", nunca rojo de catástrofe.
 *                         El páramo es la fábrica de agua; ahí está la esperanza.
 *   · enso        {...} → la OSCILACIÓN interanual (El Niño–Oscilación del Sur):
 *                         la rueda LENTA que manda SOBRE el compás bimodal y que
 *                         más le mueve la cosecha al andino de un año a otro. Tres
 *                         estados que se LEEN como ciclo (Niña↔Neutro↔Niño), no
 *                         como amenaza: el cielo se pone seco/duro (Niño → seca +
 *                         helada) o nublado/aguado (Niña → exceso de agua +
 *                         deslizamiento). Ámbar de "prepárese", nunca rojo.
 *
 * Todo primitivas low-poly (`MeshLambert`/`MeshBasic`), sin sombras, sin GLTF,
 * sin post. Reduced-motion = escena digna, no muerta: el sol, las nubes, la
 * lluvia y la niebla se CONGELAN en su fotograma (nunca desaparecen). PRNG
 * determinista: mismo dato → mismo cielo.
 */
import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import EscenaBase3D from './EscenaBase3D.jsx';
import { Fauna } from './FaunaEscena.jsx';
import { faunaDeMundo } from '../faunaFuncional.js';
import { ATMOSFERA, CIELOS, PALETA } from '../atmosferaMadre.js';

const R_BOVEDA = 9;

/* PRNG determinista (LCG), como en EscenaEstratos: mismo dato, mismo cielo. */
function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return s / 0xffffffff;
  };
}

/* Paleta del cielo por hora: keyframes andinos (amanecer cálido → mediodía
   claro → tarde dorada → anochecer índigo). Se interpola en el color. */
const CLAVES_CIELO = [
  { t: 0.0, h: '#f6c9a0', z: '#3f4f80' }, // amanecer
  { t: 0.5, h: '#dcedf6', z: '#5aa0d6' }, // mediodía
  { t: 0.74, h: '#f4c489', z: '#6f6cb2' }, // tarde dorada
  { t: 1.0, h: '#26325a', z: '#0d1330' }, // anochecer
];

function paletaCielo(hora) {
  const t = Math.min(1, Math.max(0, hora));
  let a = CLAVES_CIELO[0];
  let b = CLAVES_CIELO[CLAVES_CIELO.length - 1];
  for (let i = 0; i < CLAVES_CIELO.length - 1; i++) {
    if (t >= CLAVES_CIELO[i].t && t <= CLAVES_CIELO[i + 1].t) {
      a = CLAVES_CIELO[i];
      b = CLAVES_CIELO[i + 1];
      break;
    }
  }
  const span = Math.max(1e-4, b.t - a.t);
  const k = (t - a.t) / span;
  const horizonte = new THREE.Color(a.h).lerp(new THREE.Color(b.h), k);
  const zenit = new THREE.Color(a.z).lerp(new THREE.Color(b.z), k);
  return { horizonte, zenit };
}

/* LA BÓVEDA: media esfera con gradiente vertical horizonte→cenit por color de
   vértice (barato, low-poly, un gradiente de verdad sin shaders). BackSide para
   verla por dentro. Es el fondo; no escribe profundidad. */
function Boveda({ hora }) {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(R_BOVEDA, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const { horizonte, zenit } = paletaCielo(hora);
    const pos = g.attributes.position;
    const tmp = new THREE.Color();
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const t = Math.min(1, Math.max(0, pos.getY(i) / R_BOVEDA));
      tmp.copy(horizonte).lerp(zenit, t ** 0.8);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [hora]);
  return (
    <mesh geometry={geo} renderOrder={-10}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

/* Posición del sol en su arco (p 0..1 = este→cenit→oeste). */
/**
 * @param {number} p
 * @returns {[number, number, number]}
 */
function arcoSol(p) {
  const x = (p - 0.5) * 12.4;
  const y = Math.sin(Math.max(0, Math.min(1, p)) * Math.PI) * 5.1 + 0.25;
  return [x, y, -2.6];
}

/* EL SOL que arquea, con su resplandor (halo aditivo — el "glow" en 3D). Con
   reduced-motion queda quieto en la `hora` (un fotograma digno, no muerto). */
function Sol({ hora, reducedMotion }) {
  const ref = useRef(null);
  const [x0, y0, z0] = arcoSol(hora);
  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const p = (hora + state.clock.elapsedTime * 0.012) % 1;
    const [x, y, z] = arcoSol(p);
    ref.current.position.set(x, y, z);
  });
  return (
    <group ref={ref} position={[x0, y0, z0]}>
      <mesh>
        <sphereGeometry args={[0.62, 16, 12]} />
        <meshBasicMaterial color="#ffe6a3" />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.05, 16, 12]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.7, 16, 12]} />
        <meshBasicMaterial color="#ffbf5c" transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* CIELO VIVO: el color de FONDO y del HEMISFERIO siguen la p VIVA del sol (la
   misma que anima su arco), no la hora fija. El gradiente de la BÓVEDA (malla)
   se queda memoizado —regenerarlo por frame sería caro—; esto es barato: solo
   muta el <color> de fondo y el color de la luz de cielo. Así "el color del
   cielo ES la hora": al avanzar el sol, el fondo y la luz atardecen con él.
   Con reduced-motion no toca nada (la base ya fijó el fotograma digno). */
function CieloVivo({ hora, reducedMotion }) {
  const { scene } = useThree();
  const hemiRef = useRef(null);
  // colores de trabajo precomputados: cero asignaciones por frame.
  const fondoMadre = useRef(new THREE.Color(ATMOSFERA.fondo));
  // el hemisferio parte de la MISMA mezcla que EscenaBase3D (alba 40% + madre
  // 60%) y solo se tiñe un poco hacia el cenit de la hora viva.
  const baseCielo = useRef(
    new THREE.Color(CIELOS.alba.cielo).lerp(new THREE.Color(ATMOSFERA.cielo), 0.6),
  );
  const tmpCielo = useRef(new THREE.Color());
  useFrame((state) => {
    if (reducedMotion) return;
    const p = (hora + state.clock.elapsedTime * 0.012) % 1;
    const { horizonte, zenit } = paletaCielo(p);
    // fondo vivo = horizonte de la hora, mezclado 60% hacia la hora dorada madre
    // (misma receta que la base, pero con la p viva del sol).
    const bg = /** @type {THREE.Color|null} */ (scene.background);
    if (bg && bg.isColor) {
      const c = /** @type {THREE.Color} */ (bg);
      c.copy(horizonte).lerp(fondoMadre.current, 0.6);
    }
    // hemisferio: cachea la luz una vez y tiñe su color de cielo un tercio hacia
    // el cenit vivo (sin tocar intensidad ni groundColor: los fija la base).
    if (!hemiRef.current) {
      hemiRef.current = scene.getObjectByProperty('isHemisphereLight', true) || null;
    }
    if (hemiRef.current) {
      const ci = /** @type {THREE.Color} */ (baseCielo.current);
      tmpCielo.current.copy(ci).lerp(zenit, 0.3);
      hemiRef.current.color.copy(tmpCielo.current);
    }
  });
  return null;
}

/* La luna: un disco pálido, quieto en su rincón. El cielo también tiene noche. */
function Luna() {
  return (
    <mesh position={[-4.6, 4.4, -3.2]}>
      <sphereGeometry args={[0.5, 14, 10]} />
      <meshBasicMaterial color="#eef1f6" transparent opacity={0.85} />
    </mesh>
  );
}

/* Una nube = racimo de esferas achatadas (nada de cajas). Deriva lento en x y da
   la vuelta; en seca es blanca y liviana, en lluvia más llena y gris suave. */
function Nube({ base, escala = 1, gris = false, reducedMotion }) {
  const ref = useRef(null);
  const bultos = useMemo(() => {
    const r = prng(Math.round((base[0] + 7) * 131 + base[1] * 17));
    return Array.from({ length: 4 }, (_, i) => ({
      key: i,
      x: (i - 1.5) * 0.62 + (r() - 0.5) * 0.2,
      y: (r() - 0.5) * 0.22,
      s: 0.5 + r() * 0.42,
    }));
  }, [base]);
  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const dx = ((state.clock.elapsedTime * 0.14 + base[0] + 7) % 14) - 7;
    ref.current.position.x = dx;
  });
  const color = gris ? '#cfd6dd' : '#f7fbff';
  return (
    <group ref={ref} position={base} scale={escala}>
      {bultos.map((b) => (
        <mesh key={b.key} position={[b.x, b.y, 0]} scale={[1, 0.62, 0.8]}>
          <sphereGeometry args={[b.s, 12, 8]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Aguacero suave bajo una nube (solo en temporada de lluvia). Líneas que caen y
   se reciclan; reduced-motion las deja quietas (digno, no alarma: llovizna, no
   tormenta). Determinista. */
function Lluvia({ base = [-2.6, 3.4, 0.2], reducedMotion }) {
  const refs = useRef([]);
  const gotas = useMemo(() => {
    const r = prng(4231);
    return Array.from({ length: 14 }, (_, i) => ({
      key: i,
      x: base[0] + (r() - 0.5) * 1.9,
      z: base[2] + (r() - 0.5) * 0.9,
      y0: base[1] - 0.5 - r() * 2.4,
      fase: r(),
    }));
  }, [base]);
  useFrame((state) => {
    if (reducedMotion) return;
    const caida = 2.2;
    gotas.forEach((g, i) => {
      const m = refs.current[i];
      if (!m) return;
      const y = base[1] - 0.5 - ((g.fase + state.clock.elapsedTime * 0.4) % 1) * caida;
      m.position.y = y;
    });
  });
  return (
    <group>
      {gotas.map((g, i) => (
        <mesh
          key={g.key}
          ref={(el) => { refs.current[i] = el; }}
          position={[g.x, g.y0, g.z]}
        >
          <cylinderGeometry args={[0.016, 0.016, 0.34, 4]} />
          <meshBasicMaterial color="#bcd6e6" transparent opacity={0.72} />
        </mesh>
      ))}
    </group>
  );
}

/* Un jirón de niebla de páramo: disco plano translúcido que respira despacio.
   El frailejón peina estas gotas y las vuelve agua (la esponja del páramo). */
function Jiron({ base, escala, fase, reducedMotion }) {
  const ref = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const s = escala * (1 + Math.sin(state.clock.elapsedTime * 0.5 + fase) * 0.06);
    ref.current.scale.set(s, s * 0.4, s);
    ref.current.material.opacity = 0.22 + Math.sin(state.clock.elapsedTime * 0.5 + fase) * 0.06;
  });
  return (
    <mesh ref={ref} position={base} scale={[escala, escala * 0.4, escala]}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshBasicMaterial color="#eef4f6" transparent opacity={0.26} depthWrite={false} />
    </mesh>
  );
}

function NieblaParamo({ niebla = 0.6, cima = 3.6, reducedMotion }) {
  const jirones = useMemo(() => {
    const r = prng(909);
    const n = 1 + Math.round(niebla * 3);
    return Array.from({ length: n }, (_, i) => ({
      key: i,
      base: [(r() - 0.5) * 2.2, cima - 0.6 - r() * 0.7, 0.6 + r() * 0.6],
      escala: 0.7 + r() * 0.6,
      fase: r() * 6,
    }));
  }, [niebla, cima]);
  return (
    <group>
      {jirones.map((j) => (
        <Jiron key={j.key} base={j.base} escala={j.escala} fase={j.fase} reducedMotion={reducedMotion} />
      ))}
    </group>
  );
}

const PISOS_DEF = [
  { nombre: 'cálido', color: '#c7a24b', h: 0.95, r0: 2.4, r1: 1.95 },
  { nombre: 'templado', color: '#8fae55', h: 0.9, r1: 1.42 },
  { nombre: 'frío', color: '#6f9a72', h: 0.85, r1: 0.9 },
  { nombre: 'páramo', color: '#9fb6bf', h: 0.8, r1: 0.42 },
];

/* MICRO-RÓTULO tocable de la línea ámbar: le pone PALABRAS al retroceso glaciar
   (un campesino no decodifica "aro ámbar = el hielo bajó"). Discreto —un punto
   ámbar con su nota— y al tocarlo abre la consecuencia: con el calor los pisos
   térmicos suben. Se ancla al frente del aro (hacia la cámara). Cuidado, no
   alarma: el texto habla de "hasta aquí llegaba", nunca de catástrofe. */
function RotuloHielo({ yAntes, rAntes }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <group position={[0, yAntes + 0.04, rAntes]}>
      <Html center distanceFactor={9} zIndexRange={[16, 0]}>
        <button
          type="button"
          className={`mundo-rotulo${abierto ? ' mundo-rotulo--abierto' : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setAbierto((v) => !v); }}
          aria-expanded={abierto}
        >
          <span className="mundo-rotulo__marca" aria-hidden="true" />
          <span className="mundo-rotulo__txt">
            Hasta aquí llegaba el hielo
            {abierto && (
              <em className="mundo-rotulo__mas"> — con el calor, los pisos térmicos suben.</em>
            )}
          </span>
        </button>
      </Html>
    </group>
  );
}

/* LA MONTAÑA: los cuatro pisos térmicos apilados como troncos de cono (paleta
   del mundo #4). Corona: el casquete de hielo + la LÍNEA ÁMBAR de hasta dónde
   llegaba el hielo (retroceso glaciar) — nota de conciencia, esperanza no colapso. */
/**
 * @param {Object} props
 * @param {Array<{nombre?:string, color?:string, h?:number, r0?:number, r1?:number}>} [props.pisos]
 * @param {{nieve?:number, retroceso?:number}} [props.glaciar]
 */
function Montana({ pisos = PISOS_DEF, glaciar = {} }) {
  const bandas = useMemo(() => {
    // for-loop plano (sin closure que capture los acumuladores): la regla
    // react-hooks/immutability prohíbe reasignar variables desde callbacks.
    const out = [];
    let y = 0;
    let rAbajo = pisos[0]?.r0 ?? 2.4;
    for (let i = 0; i < pisos.length; i += 1) {
      const p = pisos[i];
      const rArriba = p.r1 ?? rAbajo * 0.7;
      out.push({ key: i, nombre: p.nombre, color: p.color, h: p.h, rAbajo, rArriba, y });
      y += p.h;
      rAbajo = rArriba;
    }
    return out;
  }, [pisos]);
  const cima = bandas.reduce((acc, b) => acc + b.h, 0);
  const rCima = bandas[bandas.length - 1]?.rArriba ?? 0.42;
  const nieve = Math.max(0, Math.min(1, glaciar.nieve ?? 0.32));
  const retroceso = Math.max(0, Math.min(1, glaciar.retroceso ?? 0.7));
  // La línea de nieve de antes: sube con el retroceso (más retroceso = casquete
  // más chico y la marca ámbar más abajo, "hasta aquí llegaba").
  const yAntes = cima - 0.35 - retroceso * 0.55;
  const rAntes = rCima + 0.5 + retroceso * 0.45;
  return (
    <group position={[0, 0, -0.4]}>
      {bandas.map((b) => (
        <mesh key={b.key} position={[0, b.y + b.h / 2, 0]}>
          <cylinderGeometry args={[b.rArriba, b.rAbajo, b.h, 7]} />
          <meshLambertMaterial color={b.color} flatShading />
        </mesh>
      ))}
      {/* el casquete de hielo de hoy (más pequeño de lo que fue) */}
      <mesh position={[0, cima + nieve * 0.28, 0]}>
        <coneGeometry args={[rCima + 0.05, 0.35 + nieve * 0.55, 7]} />
        <meshLambertMaterial color="#eef4f7" flatShading />
      </mesh>
      {/* la línea ámbar: hasta aquí llegaba el hielo (cuidado, no alarma) */}
      <mesh position={[0, yAntes, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[rAntes, 0.028, 6, 24]} />
        <meshBasicMaterial color={PALETA.ambar} transparent opacity={0.75} />
      </mesh>
      {/* su rótulo tocable: le pone palabras a la línea ámbar */}
      <RotuloHielo yAntes={yAntes} rAntes={rAntes} />
    </group>
  );
}

/* La vida del cielo de día son POLINIZADORES cerca de la ladera (colibrí y
   mariposa); su definición vive en faunaFuncional.js. De noche no se siembra
   fauna (la escena lo gatea con `esDia` — honestidad ecológica). */

/* ── CAPA ENSO: la OSCILACIÓN interanual (El Niño–Oscilación del Sur) ────────
 *
 * Sobre el compás BIMODAL (dos lluvias / dos secas) manda otra rueda más lenta:
 * la que de verdad le mueve la cosecha al andino de un año a otro. Se lee por el
 * índice ONI (anomalía del mar en la región Niño 3.4, media móvil de 3 meses):
 *   · La Niña  (ONI ≤ −0,5 °C): en los Andes = MÁS lluvia y nube → suelo saturado,
 *              DESLIZAMIENTOS y exceso de agua.
 *   · Neutral  (−0,5 < ONI < +0,5): el año corre por su compás bimodal normal.
 *   · El Niño  (ONI ≥ +0,5 °C): MENOS lluvia, cielo duro, noches despejadas →
 *              SEQUÍA y más HELADA en lo alto.
 *
 * NO es amenaza: es un CICLO que se LEE. El rótulo es una ruedita que se toca y
 * gira Niña→Neutro→Niño (la "oscilación"), con la voz de Angelita diciendo qué
 * hacer. Ámbar de "prepárese", jamás rojo de catástrofe (menos colapso, más
 * contemplación). DIDÁCTICO: hoy los tres estados se muestran a mano; el día que
 * exista un `get_enso_status` real se cablea la fase viva en `params.enso.fase`. */
const FASES_ENSO = [
  {
    id: 'nina', nombre: 'La Niña', oni: 'ONI ≤ −0,5 °C',
    lee: 'Más lluvia y más nube: el suelo se llena y la ladera se afloja.',
    consejo: 'Abra el desagüe y cuide la ladera: no siembre en lo muy parado y sáquele el agua a los surcos.',
    velo: { color: '#93a6b8', opacidad: 0.17, aditivo: false },
  },
  {
    id: 'neutral', nombre: 'Año neutro', oni: '−0,5 a +0,5 °C',
    lee: 'El año corre por su compás: dos lluvias y dos secas, sin cargar la mano.',
    consejo: 'Siembre con el almanaque de siempre; el cielo no está jalando ni pa\' seco ni pa\' aguado.',
    velo: null,
  },
  {
    id: 'nino', nombre: 'El Niño', oni: 'ONI ≥ +0,5 °C',
    lee: 'Menos lluvia, sol fuerte y noches despejadas: viene la seca y la helada en lo alto.',
    consejo: 'Guarde agua y prepárese pa\' la helada: riegue tempranito y tápele el semillero de noche.',
    velo: { color: '#f2c987', opacidad: 0.12, aditivo: true },
  },
];

/* El VELO del año: media esfera translúcida que tiñe TODO el cielo hacia la fase
   (seco/duro en Niño con mezcla aditiva; nublado/húmedo en Niña). RESPETA la
   atmósfera madre: no la reemplaza, la MODULA con opacidad baja. Neutral no pinta
   velo (el compás normal). Memoiza la geometría; cero costo por frame. */
function VeloEnso({ velo }) {
  const geo = useMemo(
    () => new THREE.SphereGeometry(R_BOVEDA * 0.965, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
    [],
  );
  if (!velo) return null;
  return (
    <mesh geometry={geo} renderOrder={-9}>
      <meshBasicMaterial
        color={velo.color}
        transparent
        opacity={velo.opacidad}
        side={THREE.BackSide}
        depthWrite={false}
        blending={velo.aditivo ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </mesh>
  );
}

/* SEÑAL DE HELADA (solo Niño): escarcha en el suelo de la finca. Cristalitos
   blanco-azules, bajos y quietos (la escarcha no se mueve); con movimiento
   permitido titilan apenas. Densidad por device-tier. Determinista (mismo
   dato → misma escarcha). Cuidado, no alarma: es "prepárese", no catástrofe. */
function SenalHelada({ densidad = 1, reducedMotion }) {
  const cristales = useMemo(() => {
    const r = prng(1703);
    const n = Math.max(4, Math.round(9 * densidad));
    return Array.from({ length: n }, (_, i) => {
      const ang = r() * Math.PI * 2;
      const rad = 1.6 + r() * 3.2;
      return {
        key: i,
        pos: [Math.cos(ang) * rad, 0.05, Math.sin(ang) * rad + 0.4],
        s: 0.05 + r() * 0.05,
        fase: r() * 6,
      };
    });
  }, [densidad]);
  const refs = useRef([]);
  useFrame((state) => {
    if (reducedMotion) return;
    for (let i = 0; i < cristales.length; i += 1) {
      const m = refs.current[i];
      if (!m) continue;
      m.material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 1.2 + cristales[i].fase) * 0.2;
    }
  });
  return (
    <group>
      {cristales.map((c, i) => (
        <mesh
          key={c.key}
          position={/** @type {[number, number, number]} */ (c.pos)}
          rotation={[0, c.fase, 0]}
          ref={(el) => { refs.current[i] = el; }}
        >
          <octahedronGeometry args={[c.s, 0]} />
          <meshBasicMaterial color="#e2eef6" transparent opacity={0.82} />
        </mesh>
      ))}
    </group>
  );
}

/* SEÑAL DE EXCESO DE AGUA (solo Niña): la ladera se afloja. Una veta ÁMBAR
   translúcida sobre el flanco delantero de la montaña ("ojo con lo parado" —
   remoción en masa), más una nube cargada y aguacero EXTRA que cae SOBRE la
   temporada. Ámbar de "prepárese", nunca rojo. */
function SenalLadera({ cima = 3.5, reducedMotion }) {
  return (
    <group>
      <mesh position={[-0.85, cima * 0.42, 1.15]} rotation={[0, 0.5, -0.85]}>
        <boxGeometry args={[0.16, cima * 0.6, 0.05]} />
        <meshBasicMaterial color={PALETA.ambar} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <Nube base={[1.5, 3.8, 0.9]} escala={1.15} gris reducedMotion={reducedMotion} />
      <Lluvia base={[1.5, 3.5, 0.9]} reducedMotion={reducedMotion} />
    </group>
  );
}

/* EL RÓTULO DEL CICLO: la ruedita que se LEE. Un toque la gira Niña→Neutro→Niño
   (la "oscilación"), muestra en qué fase va (tres puntos), qué significa pa' la
   finca (voz de Angelita) y el ONI real por si el técnico mira. Discreto y
   contemplativo: ámbar cálido de "prepárese", jamás rojo de alarma. */
function RotuloEnso({ idx, fase, onGirar }) {
  return (
    <group position={[-3.25, 5.05, 0.6]}>
      <Html center distanceFactor={9} zIndexRange={[18, 0]}>
        <button
          type="button"
          className={`mundo-rotulo mundo-enso mundo-enso--${fase.id}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onGirar(); }}
          aria-label={`El ciclo del cielo, hoy ${fase.nombre}. ${fase.lee} ${fase.consejo} Toque para leer la siguiente fase.`}
        >
          <span className="mundo-enso__rueda" aria-hidden="true">
            {FASES_ENSO.map((f, i) => (
              <span key={f.id} className={`mundo-enso__diente${i === idx ? ' es-activo' : ''}`} />
            ))}
          </span>
          <span className="mundo-enso__txt">
            <span className="mundo-enso__titulo">{fase.nombre}</span>
            <span className="mundo-enso__lee">{fase.lee}</span>
            <span className="mundo-enso__consejo">{fase.consejo}</span>
            <span className="mundo-enso__oni">{fase.oni} · gire el ciclo</span>
          </span>
        </button>
      </Html>
    </group>
  );
}

/* Reúne la capa: guarda la fase (arranca en la del dato) y monta velo + señal +
   rótulo. El estado vive AQUÍ para que el velo del cielo y el rótulo giren juntos
   con un solo toque. La densidad de la escarcha baja en gama media (device-tier). */
function CapaEnso({ params, tier = 'alto', cima = 3.5, reducedMotion }) {
  const inicio = Math.max(
    0,
    FASES_ENSO.findIndex((f) => f.id === (params?.enso?.fase ?? 'neutral')),
  );
  const [idx, setIdx] = useState(inicio);
  const fase = FASES_ENSO[idx];
  const densidad = tier === 'medio' ? 0.55 : 1;
  return (
    <group>
      <VeloEnso velo={fase.velo} />
      {fase.id === 'nino' && <SenalHelada densidad={densidad} reducedMotion={reducedMotion} />}
      {fase.id === 'nina' && <SenalLadera cima={cima} reducedMotion={reducedMotion} />}
      <RotuloEnso idx={idx} fase={fase} onGirar={() => setIdx((v) => (v + 1) % FASES_ENSO.length)} />
    </group>
  );
}

function Diorama({ params, reducedMotion, tier, fauna }) {
  const hora = params?.hora ?? 0.62;
  const temporada = params?.temporada ?? 'lluvia';
  const niebla = params?.niebla ?? 0.6;
  const pisos = params?.pisos || PISOS_DEF;
  /** @type {{nieve?:number, retroceso?:number}} */
  const glaciar = params?.glaciar || {};
  const esDia = hora > 0.06 && hora < 0.9;
  const cima = pisos.reduce((acc, p) => acc + (p.h ?? 0.85), 0);
  return (
    <group>
      <Boveda hora={hora} />
      {/* el piso de la finca (un disco de tierra bajo el cielo) */}
      <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.6, 36]} />
        <meshLambertMaterial color="#7f925f" />
      </mesh>

      <Sol hora={hora} reducedMotion={reducedMotion} />
      {/* el fondo y la luz de cielo atardecen con el sol (no en hora fija) */}
      <CieloVivo hora={hora} reducedMotion={reducedMotion} />
      {!esDia && <Luna />}
      {esDia && hora < 0.55 && <Luna />}

      <Montana pisos={pisos} glaciar={glaciar} />
      <NieblaParamo niebla={niebla} cima={cima} reducedMotion={reducedMotion} />

      {/* la OSCILACIÓN del año (ENSO) sobre el compás bimodal: velo del cielo +
          señal de la fase + rótulo-ciclo tocable con la voz de Angelita */}
      <CapaEnso params={params} tier={tier} cima={cima} reducedMotion={reducedMotion} />

      {/* el cielo con su temporada: nubes siempre; aguacero solo en lluvia */}
      <Nube base={[-2.6, 3.5, 0.2]} escala={1.15} gris={temporada === 'lluvia'} reducedMotion={reducedMotion} />
      <Nube base={[2.4, 4.1, -0.6]} escala={0.9} gris={false} reducedMotion={reducedMotion} />
      {temporada === 'lluvia' && (
        <>
          <Nube base={[0.2, 4.3, 0.4]} escala={1.0} gris reducedMotion={reducedMotion} />
          <Lluvia base={[-2.6, 3.2, 0.2]} reducedMotion={reducedMotion} />
        </>
      )}

      {esDia && <Fauna items={fauna} reducedMotion={reducedMotion} />}
    </group>
  );
}

export default function EscenaBoveda(props) {
  const hora = props.params?.hora ?? 0.62;
  const { horizonte } = paletaCielo(hora);
  // El fondo lo dicta la HORA real (veracidad); el hemisferio viene del preset
  // alba de la atmósfera madre (marfil tibio, ya no blanco frío).
  const cielo = { ...CIELOS.alba, fondo: `#${horizonte.getHexString()}` };
  return (
    <EscenaBase3D
      {...props}
      cielo={cielo}
      camara={{ position: [4.6, 3.1, 8.6], fov: 46 }}
      entrada={{ ...props.entrada, zoom: props.entrada?.zoom ?? 7.5, centro: [0, 2.2, 0] }}
    >
      <Diorama params={props.params} reducedMotion={props.reducedMotion} tier={props.tier} fauna={faunaDeMundo(props.mundoId, { tier: props.tier })} />
    </EscenaBase3D>
  );
}
