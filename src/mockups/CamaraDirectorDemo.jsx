/*
 * CamaraDirectorDemo — demostración de la CÁMARA DE DIRECTOR (FASE 4).
 *
 * Un valle low-poly de muestra (dos hitos: la casa encalada y el tanque de
 * piedra, con su río dorado) y cuatro tomas coreografiadas encima:
 *
 *   1. Toma de apertura  — establishing aéreo 3/4: el valle como maqueta.
 *   2. Toma de detalle   — tele íntimo sobre la casa, a altura de patio.
 *   3. Travelling del río— la grúa se desliza de orilla a orilla (fase viaje).
 *   4. Contraluz dorado  — cámara baja mirando contra el sol de la tarde.
 *
 * La coreografía la conduce `useCamaraDirector` (visual/mundo3d/CamaraDirector):
 * este mockup solo sostiene el índice de la toma en estado y lo cambia con los
 * botones; la secuencia completa se encadena con `alAsentar` + una pausa.
 *
 * Contrato frugal del framework: Canvas propio con `frameloop="demand"` (el
 * hook invalida solo mientras hay toma en curso — asentada la toma, el Canvas
 * duerme), materiales Lambert/Basic sin shadow-map, arboleda instanciada,
 * PRNG determinista (cero Math.random) y perfil por tier de equipo. Con
 * `reducedMotion` las tomas cambian SIN interpolar; en tier bajo ni se monta
 * el 3D (aviso digno en su lugar). Atmósfera: la hora dorada compartida
 * (atmosferaMadre + preset `dorada` de cielosHoraData).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useCamaraDirector } from '../visual/mundo3d/CamaraDirector';
import { ATMOSFERA, PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData';
import { decidirTier, perfilDeTier, permite3D } from '../visual/mundo3d/deviceTier';

/* ── PRNG determinista (mulberry32): la misma siembra en cada render ─────── */
function prng(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Las cuatro tomas curadas de la demo (unidades del valle de muestra) ── */
const SHOTS = [
  {
    id: 'apertura',
    boton: 'Ver toma de apertura',
    titulo: 'Toma de apertura — el valle entero',
    posicion: [8.5, 6.5, 11.5],
    target: [0, 0.5, 0],
    fov: 40,
    lambda: 1.7, // llegada larga: al valle se llega, no se aparece
  },
  {
    id: 'detalle',
    boton: 'Ver toma de detalle',
    titulo: 'Toma de detalle — la casa encalada',
    posicion: [-4.8, 1.5, 0.4],
    target: [-2.6, 0.9, -1.8],
    fov: 34, // tele íntimo
    lambda: 2.4,
  },
  {
    id: 'travelling',
    boton: 'Ver travelling del río',
    titulo: 'Travelling — siguiendo el río',
    posicion: [-6.5, 2.1, 7.5],
    target: [-1.2, 0.5, 0.5],
    fov: 44,
    lambda: 2.1,
    viaje: { posicion: [6.5, 2.5, 7.0], target: [1.6, 0.5, -0.5], duracion: 7 },
  },
  {
    id: 'contraluz',
    boton: 'Ver contraluz dorado',
    titulo: 'Contraluz — la tarde contra el sol',
    posicion: [-4.2, 1.0, -5.2],
    target: [1.8, 1.6, 1.4], // mirando hacia el sol bajo de la hora dorada
    fov: 48,
    lambda: 1.8,
  },
];

/* Pausa entre tomas cuando corre la secuencia completa (ms). */
const PAUSA_SECUENCIA_MS = 1400;

/* ── Dirección de arte: hora dorada compartida + derivados low-poly ──────── */
const P = CIELOS_HORA.dorada;
const PASTO = mezclar(PALETA.follajeClaro, PALETA.tierraClara, 0.3);
const TEJA = mezclar(PALETA.ambar, PALETA.maderaOscura, 0.45);
const TONOS_COLINA = [
  PALETA.follajeOscuro,
  mezclar(PALETA.follajeOscuro, PALETA.piedra, 0.4),
  mezclar(PALETA.follaje, PALETA.follajeOscuro, 0.5),
];

/* Anillo de colinas del borde (determinista, siembra fija). */
const COLINAS = (() => {
  const rnd = prng(11);
  return Array.from({ length: 10 }, (_, i) => {
    const ang = (i / 10) * Math.PI * 2 + 0.31;
    const radio = 11.5 + rnd() * 2.5;
    const alto = 2.2 + rnd() * 2.6;
    return {
      pos: [Math.cos(ang) * radio, alto * 0.5 - 0.35, Math.sin(ang) * radio],
      alto,
      ancho: 2.4 + rnd() * 1.8,
      giro: rnd() * Math.PI,
      tono: i % TONOS_COLINA.length,
    };
  });
})();

/* Arboleda: siembra determinista que despeja río, casa y tanque. El río es la
   banda girada -0.3 rad con eje por (0.9, 0): distancia = |0.955·(x-0.9) + 0.296·z|. */
const ARBOLES = (() => {
  const rnd = prng(23);
  const lista = [];
  for (let intento = 0; intento < 400 && lista.length < 34; intento++) {
    const ang = rnd() * Math.PI * 2;
    const radio = 3.2 + rnd() * 6.8;
    const x = Math.cos(ang) * radio;
    const z = Math.sin(ang) * radio;
    const rio = Math.abs(0.955 * (x - 0.9) + 0.296 * z) < 1.4;
    const casa = Math.hypot(x + 2.6, z + 1.8) < 2.4;
    const tanque = Math.hypot(x - 2.8, z - 1.4) < 1.7;
    if (rio || casa || tanque) continue;
    lista.push({ x, z, s: 0.7 + rnd() * 0.7, giro: rnd() * Math.PI });
  }
  return lista;
})();

/* Piedras sueltas (las del río quedan como piedras de río: bienvenidas). */
const PIEDRAS = (() => {
  const rnd = prng(41);
  return Array.from({ length: 6 }, () => {
    const ang = rnd() * Math.PI * 2;
    const radio = 4 + rnd() * 5.5;
    return {
      pos: [Math.cos(ang) * radio, 0.1, Math.sin(ang) * radio],
      s: 0.18 + rnd() * 0.22,
      giro: rnd() * Math.PI,
    };
  });
})();

/* ── Piezas del valle de muestra (solo Lambert/Basic, cero sombras) ──────── */

function Terreno({ segmentos }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
      <circleGeometry args={[15, segmentos]} />
      <meshLambertMaterial color={PASTO} />
    </mesh>
  );
}

function Rio() {
  return (
    <group position={[0.9, 0.02, 0]} rotation-y={-0.3}>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.5, 30]} />
        <meshLambertMaterial color={PALETA.agua} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-1.05, -0.005, 0]}>
        <planeGeometry args={[0.55, 30]} />
        <meshLambertMaterial color={PALETA.tierraClara} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[1.05, -0.005, 0]}>
        <planeGeometry args={[0.55, 30]} />
        <meshLambertMaterial color={PALETA.tierraClara} />
      </mesh>
    </group>
  );
}

function Colinas() {
  return (
    <group>
      {COLINAS.map((c, i) => (
        <mesh key={i} position={/** @type {[number, number, number]} */ (c.pos)} rotation-y={c.giro}>
          <coneGeometry args={[c.ancho, c.alto, 5]} />
          <meshLambertMaterial color={TONOS_COLINA[c.tono]} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Hito 1: la casa encalada de teja cálida (target de la toma de detalle). */
function Casa() {
  return (
    <group position={[-2.6, 0, -1.8]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.7, 1.1, 1.3]} />
        <meshLambertMaterial color={PALETA.cal} />
      </mesh>
      <mesh position={[0, 1.42, 0]} rotation-y={Math.PI / 4}>
        <coneGeometry args={[1.45, 0.85, 4]} />
        <meshLambertMaterial color={TEJA} flatShading />
      </mesh>
      <mesh position={[0.4, 0.42, 0.68]}>
        <boxGeometry args={[0.36, 0.8, 0.06]} />
        <meshLambertMaterial color={PALETA.maderaOscura} />
      </mesh>
      <mesh position={[-0.42, 0.68, 0.68]}>
        <boxGeometry args={[0.34, 0.34, 0.05]} />
        <meshBasicMaterial color={PALETA.ambar} />
      </mesh>
    </group>
  );
}

/* Hito 2: el tanque de piedra con su espejo de agua. */
function Tanque() {
  return (
    <group position={[2.8, 0, 1.4]}>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.85, 0.95, 0.72, 8]} />
        <meshLambertMaterial color={PALETA.piedra} flatShading />
      </mesh>
      <mesh position={[0, 0.725, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.74, 8]} />
        <meshBasicMaterial color={PALETA.agua} />
      </mesh>
    </group>
  );
}

/* El farito ámbar del camino (solo si el tier enciende beacons). */
function Faro() {
  return (
    <group position={[0.6, 0, 3.4]}>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.045, 0.06, 0.9, 5]} />
        <meshLambertMaterial color={PALETA.maderaOscura} />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshBasicMaterial color={PALETA.ambar} />
      </mesh>
    </group>
  );
}

/* Arboleda instanciada: dos draws (troncos + copas) para toda la vegetación. */
function Arboleda({ cada }) {
  const datos = useMemo(() => ARBOLES.filter((_, i) => i % cada === 0), [cada]);
  const troncos = useRef(null);
  const copas = useRef(null);

  useLayoutEffect(() => {
    const m = new THREE.Object3D();
    datos.forEach((a, i) => {
      m.rotation.set(0, a.giro, 0);
      m.scale.setScalar(a.s);
      m.position.set(a.x, 0.35 * a.s, a.z);
      m.updateMatrix();
      troncos.current.setMatrixAt(i, m.matrix);
      m.position.set(a.x, 1.25 * a.s, a.z);
      m.updateMatrix();
      copas.current.setMatrixAt(i, m.matrix);
    });
    troncos.current.instanceMatrix.needsUpdate = true;
    copas.current.instanceMatrix.needsUpdate = true;
  }, [datos]);

  return (
    <group key={datos.length}>
      <instancedMesh ref={troncos} args={[undefined, undefined, datos.length]}>
        <cylinderGeometry args={[0.06, 0.1, 0.7, 5]} />
        <meshLambertMaterial color={PALETA.madera} />
      </instancedMesh>
      <instancedMesh ref={copas} args={[undefined, undefined, datos.length]}>
        <coneGeometry args={[0.55, 1.3, 6]} />
        <meshLambertMaterial color={PALETA.follaje} />
      </instancedMesh>
    </group>
  );
}

function Piedras() {
  return (
    <group>
      {PIEDRAS.map((p, i) => (
        <mesh key={i} position={/** @type {[number, number, number]} */ (p.pos)} rotation-y={p.giro} scale={p.s}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshLambertMaterial color={PALETA.piedra} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* El valle completo bajo la hora dorada compartida. */
function ValleMuestra({ perfil }) {
  return (
    <>
      <color attach="background" args={[ATMOSFERA.fondo]} />
      {perfil.fog && <fog attach="fog" args={[P.niebla, P.nieblaCerca, P.nieblaLejos]} />}
      <hemisphereLight args={[P.cielo, P.suelo, P.hemisferio]} />
      <ambientLight color={P.luz} intensity={P.ambiente} />
      <directionalLight color={P.luz} position={/** @type {[number, number, number]} */ (P.solPos)} intensity={P.sol} />
      <directionalLight color={P.relleno} position={[-6, 5, -4]} intensity={P.rellenoInt} />
      <Terreno segmentos={Math.min(perfil.segmentosTerreno, 36)} />
      <Rio />
      <Colinas />
      <Casa />
      <Tanque />
      {perfil.luzBeacon && <Faro />}
      <Arboleda cada={perfil.matasCada} />
      <Piedras />
    </>
  );
}

/* Puente al hook (debe vivir dentro del Canvas): conduce la cámara por tomas. */
function Direccion({ indice, tier, reducedMotion, alAsentar }) {
  useCamaraDirector({ shots: SHOTS, indice, tier, reducedMotion, alAsentar });
  return null;
}

/* ── Estilos (cálidos, en línea: la demo es autocontenida) ───────────────── */
const estiloMarco = {
  display: 'flex',
  flexDirection: 'column',
  /* Altura FIJA al viewport, no mínima: con `minHeight` el alto real del marco
     lo decidía el contenido, el área del Canvas quedaba sin altura resuelta y
     el lienzo 3D se encogía a una franja de nada arriba de la pantalla — en
     390×844 el valle salía aplastado en un 18 % del alto y el resto era fondo
     vacío. Con la altura fija, `flex: 1` de verdad reparte lo que sobra. */
  height: '100dvh',
  background: ATMOSFERA.fondo,
  color: ATMOSFERA.sombra,
  fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
};
const estiloPanel = {
  padding: '14px 16px 18px',
  background: '#fdf4de',
  borderTop: '1px solid #d8b97e',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};
const estiloBoton = (activo) => ({
  padding: '10px 14px',
  borderRadius: 999,
  border: '1px solid #b08d57',
  background: activo ? PALETA.ambar : '#fff8ea',
  color: ATMOSFERA.sombra,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
});

export default function CamaraDirectorDemo() {
  /* El tier se decide UNA vez al montar (misma detección del framework). */
  const [equipo] = useState(() => decidirTier());
  const perfil = perfilDeTier(equipo.tier);
  const [indice, setIndice] = useState(0);
  const [secuencia, setSecuencia] = useState(false);
  /* Estado imperativo de la secuencia (no se lee en render). */
  const sec = useRef({ activa: false, restantes: 0, timer: null });

  useEffect(() => {
    const s = sec.current;
    return () => clearTimeout(s.timer);
  }, []);

  /* La toma asentó: si corre la secuencia, encadena la siguiente tras la pausa. */
  const alAsentar = useCallback(() => {
    const s = sec.current;
    if (!s.activa) return;
    if (s.restantes <= 0) {
      s.activa = false;
      setSecuencia(false);
      return;
    }
    clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      s.restantes -= 1;
      setIndice((i) => (i + 1) % SHOTS.length);
    }, PAUSA_SECUENCIA_MS);
  }, []);

  const verToma = (i) => {
    const s = sec.current;
    s.activa = false;
    clearTimeout(s.timer);
    setSecuencia(false);
    setIndice(i);
  };

  const alternarSecuencia = () => {
    const s = sec.current;
    clearTimeout(s.timer);
    if (s.activa) {
      s.activa = false;
      setSecuencia(false);
      return;
    }
    s.activa = true;
    s.restantes = SHOTS.length - 1; // la vuelta completa: las cuatro tomas
    setSecuencia(true);
    setIndice((i) => (i + 1) % SHOTS.length);
  };

  /* Equipo justo: 2D digno, sin Canvas (contrato del framework). */
  if (!permite3D(equipo.tier)) {
    return (
      <div style={{ ...estiloMarco, justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Cámara de director</h1>
        <p style={{ maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>
          Su equipo prefiere la vista ligera: esta demostración 3D no se carga aquí para
          cuidarle la batería y los datos.
        </p>
      </div>
    );
  }

  return (
    <div style={estiloMarco}>
      {/* El piso de 46dvh es la red de seguridad del encuadre: pase lo que
          pase con el panel de abajo, la escena conserva más de media pantalla.
          El sujeto de esta demo ES la toma — sin altura no hay demo. */}
      <div style={{ flex: 1, minHeight: '46dvh', position: 'relative' }}>
        <Canvas
          frameloop="demand"
          dpr={perfil.dpr}
          gl={{ antialias: perfil.antialias, powerPreference: 'low-power' }}
          camera={{ position: [11, 8.5, 14.5], fov: 46, near: 0.1, far: 80 }}
        >
          <ValleMuestra perfil={perfil} />
          <Direccion
            indice={indice}
            tier={equipo.tier}
            reducedMotion={equipo.reducedMotion}
            alAsentar={alAsentar}
          />
        </Canvas>
      </div>

      <div style={estiloPanel}>
        <div>
          <strong style={{ fontSize: 16 }}>Cámara de director</strong>
          <span style={{ opacity: 0.8 }}> — {SHOTS[indice].titulo}</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>
          Toque una toma y deje que la cámara llegue sola, con calma.
          {equipo.reducedMotion &&
            ' Su equipo pidió menos movimiento: las tomas cambian directo, sin animación.'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SHOTS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={indice === i}
              style={estiloBoton(indice === i && !secuencia)}
              onClick={() => verToma(i)}
            >
              {s.boton}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={secuencia}
            style={estiloBoton(secuencia)}
            onClick={alternarSecuencia}
          >
            {secuencia ? 'Detener la secuencia' : 'Ver la secuencia completa'}
          </button>
        </div>
      </div>
    </div>
  );
}
