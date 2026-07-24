/*
 * MuralesNewDonk — vitrina de los murales New Donk POR MUNDO: café, agua y
 * semillero. Tres vallas viven juntas en el mismo valle 3D, cada una con su
 * propio side-scroller 2D (parallax + Angelita caminando) con la identidad
 * visual de su mundo. La cámara reutiliza CamaraOdyssey (TunelOdyssey): se
 * aplana ortográficamente contra el mural elegido (FOV→20) y el valle — y
 * los murales vecinos — asoman de verdad por los bordes. NO se desmonta el
 * Canvas ni hay iris: el cruce es 100% viaje de cámara, igual que en
 * NewDonk2Den3D.
 *
 * Selector: chips abajo (Café / Agua / Semillero). En órbita eligen y entran;
 * ya adentro, cambian de mural (la cámara sale al valle y entra al otro, un
 * solo gesto). Tocar una valla en órbita también entra.
 *
 * Afordancia de demo/QA: `/?mural=agua&plano=2d#/mockups/murales-new-donk`
 * arranca ya aplanado contra ese mural (para capturas).
 *
 * Con prefers-reduced-motion la cámara salta en un frame y los murales
 * quedan como láminas quietas.
 *
 * Mockup standalone con su propio <Canvas>. Sin auth.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { CamaraOdyssey } from '../visual/mundo3d/TunelOdyssey.jsx';
import { MuralParallax } from './murales/MuralParallax.jsx';
import { MURAL_DF } from './murales/muralDimensions.js';
import { MURAL_CAFE } from './murales/muralCafe.jsx';
import { MURAL_AGUA } from './murales/muralAgua.jsx';
import { MURAL_SEMILLERO } from './murales/muralSemillero.jsx';

/* ══════════════════════════════════════════════════════════════════════════
   LAS TRES VALLAS EN EL VALLE — posición + orientación por mundo
   ══════════════════════════════════════════════════════════════════════════ */

const TEMAS = [MURAL_CAFE, MURAL_AGUA, MURAL_SEMILLERO];

/* Café y semillero flanquean, giradas hacia adentro; agua preside al centro. */
const VALLAS = {
  cafe: { pos: [-5.1, 2.0, -0.7], rotY: 0.32 },
  agua: { pos: [0, 2.0, -1.9], rotY: 0 },
  semillero: { pos: [5.1, 2.0, -0.7], rotY: -0.32 },
};

/* Órbita 3D: las tres vallas leídas juntas en el claro. */
const POSE_VALLE = {
  pos: new THREE.Vector3(0, 4.4, 12.8),
  mira: new THREE.Vector3(0, 1.8, -0.8),
  fov: 52,
};

/* La "boca" de cada mural: de frente sobre su normal, FOV 20 (casi
   ortográfico) y base de 9.2 unidades. En vertical se aleja lo necesario
   para que la valla quepa completa y el 3D asome por los bordes. */
function poseBocaDe(id, aspectoPantalla = 16 / 9) {
  const v = VALLAS[id];
  const n = new THREE.Vector3(Math.sin(v.rotY), 0, Math.cos(v.rotY));
  /* En un teléfono vertical, conservar FOV 20 a 9.2 unidades recorta más de
     la mitad del mural. Alejar la boca según el aspecto mantiene el mismo
     aplanado Odyssey y deja la valla completa dentro del ancho disponible. */
  const medioFov = THREE.MathUtils.degToRad(20 / 2);
  const distanciaParaAncho = 4.35 / (2 * Math.tan(medioFov) * aspectoPantalla);
  const distancia = Math.max(9.2, distanciaParaAncho);
  return {
    pos: new THREE.Vector3().fromArray(v.pos).addScaledVector(n, distancia),
    mira: new THREE.Vector3().fromArray(v.pos),
    fov: 20,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   PALETA del valle (verde-vivo, cálida)
   ══════════════════════════════════════════════════════════════════════════ */
const P = {
  cielo: '#e3f3cd',
  niebla: '#d6ecc0',
  pasto: '#6fae52',
  pastoHondo: '#5a9443',
  senda: '#8fbf6b',
  follaje: '#3f8a3d',
  follajeClaro: '#63ad4f',
  follajeLima: '#8cc95e',
  tronco: '#7a5a38',
  piedra: '#93a48b',
  espora: '#c4ff8e',
  tinta: '#2a3d1f',
  crema: '#fdf8e8',
};

/* ══════════════════════════════════════════════════════════════════════════
   ESCENA 3D — el valle alrededor (low-poly, lambert, sin sombras)
   ══════════════════════════════════════════════════════════════════════════ */

function Arbol({ x, z, alto = 2.2, copa = P.follaje, s = 1 }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, alto * 0.35, 0]}>
        <cylinderGeometry args={[0.1, 0.16, alto * 0.7, 6]} />
        <meshLambertMaterial color={P.tronco} flatShading />
      </mesh>
      <mesh position={[0, alto * 0.72, 0]}>
        <coneGeometry args={[0.85, alto * 0.9, 7]} />
        <meshLambertMaterial color={copa} flatShading />
      </mesh>
      <mesh position={[0, alto * 1.12, 0]}>
        <coneGeometry args={[0.55, alto * 0.62, 7]} />
        <meshLambertMaterial color={P.follajeClaro} flatShading />
      </mesh>
    </group>
  );
}

function Mata({ x, z, s = 1, color = P.follajeLima }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.28, 0]} scale={[1, 0.72, 1]}>
        <icosahedronGeometry args={[0.42, 0]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0.3, 0.2, 0.14]} scale={[1, 0.6, 1]}>
        <icosahedronGeometry args={[0.26, 0]} />
        <meshLambertMaterial color={P.follaje} flatShading />
      </mesh>
    </group>
  );
}

function Roca({ x, z, s = 1 }) {
  return (
    <mesh position={[x, 0.16 * s, z]} scale={[s, s * 0.62, s]} rotation={[0, x + z, 0]}>
      <dodecahedronGeometry args={[0.34, 0]} />
      <meshLambertMaterial color={P.piedra} flatShading />
    </mesh>
  );
}

/* Esporas que derivan lento; con reduced-motion quedan suspendidas. */
const ESPORAS = Array.from({ length: 16 }, (_, i) => ({
  x: Math.sin(i * 2.4) * (4.2 + (i % 4)),
  y: 1.1 + ((i * 0.53) % 2.4),
  z: -1.4 + Math.cos(i * 1.7) * (2.6 + (i % 3)),
  f: 0.35 + (i % 5) * 0.12,
  d: i * 1.9,
  r: 0.035 + (i % 3) * 0.016,
}));

function Esporas({ reducedMotion }) {
  const refs = useRef([]);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    ESPORAS.forEach((e, i) => {
      const m = refs.current[i];
      if (!m) return;
      m.position.y = e.y + Math.sin(t * e.f + e.d) * 0.32;
      m.position.x = e.x + Math.cos(t * e.f * 0.7 + e.d) * 0.22;
    });
  });
  return (
    <group>
      {ESPORAS.map((e, i) => (
        <mesh key={i} ref={(m) => { refs.current[i] = m; }} position={[e.x, e.y, e.z]}>
          <sphereGeometry args={[e.r, 6, 6]} />
          <meshBasicMaterial color={P.espora} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function EscenaValle({ reducedMotion }) {
  return (
    <group>
      <hemisphereLight args={['#f3ffe0', '#48793c', 0.85]} />
      <directionalLight position={[6, 9, 5]} intensity={1.15} color="#fff3d2" />
      <ambientLight intensity={0.35} color="#eaffdc" />

      {/* piso y claro */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[30, 40]} />
        <meshLambertMaterial color={P.pasto} flatShading />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 2.2]}>
        <circleGeometry args={[5.6, 28]} />
        <meshLambertMaterial color={P.senda} flatShading />
      </mesh>

      {/* lomas de fondo */}
      {[[-11, -10, 3.4], [9, -11, 4.2], [0, -14, 5.4], [15, -5, 2.8], [-16, -4, 2.6]].map(([x, z, s], i) => (
        <mesh key={i} position={[x, -s * 0.45, z]} scale={[s * 1.5, s, s]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshLambertMaterial color={i % 2 ? P.pastoHondo : P.follaje} flatShading />
        </mesh>
      ))}

      {/* arboleda ATRÁS y a los LADOS de las vallas — nada cruza por delante,
          para que en modo 2D el valle asome limpio por los bordes */}
      <Arbol x={-9.2} z={-2.4} alto={2.7} />
      <Arbol x={9.4} z={-2.2} alto={2.8} copa={P.follajeClaro} />
      <Arbol x={-2.6} z={-5.4} alto={3.1} s={1.15} />
      <Arbol x={2.8} z={-5.8} alto={3.0} s={1.2} copa={P.follajeClaro} />
      <Arbol x={-7.4} z={-5.2} alto={3.3} s={1.1} />
      <Arbol x={7.6} z={-5.6} alto={3.2} s={1.15} />
      <Arbol x={-11.2} z={2.4} alto={2.3} />
      <Arbol x={11.4} z={2.8} alto={2.4} copa={P.follaje} />

      <Mata x={-3.0} z={1.6} s={1.2} />
      <Mata x={3.2} z={1.8} s={1.05} color={P.follajeClaro} />
      <Mata x={-7.3} z={2.2} s={0.9} />
      <Mata x={7.5} z={2.4} s={1.1} />
      <Mata x={-1.6} z={4.4} s={0.8} color={P.follajeLima} />
      <Mata x={2.0} z={4.8} s={0.85} />
      <Roca x={-4.4} z={2.9} s={1.1} />
      <Roca x={4.8} z={3.4} s={0.9} />
      <Roca x={0.2} z={-4.2} s={1.3} />

      <Esporas reducedMotion={reducedMotion} />
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   VALLA + MURAL — la valla física (marco, techito, postes) con los colores
   de madera de su mundo, y el plano 2D pegado en su cara frontal
   ══════════════════════════════════════════════════════════════════════════ */

function VallaMural({ tema, fase, activo, reducedMotion, onEntrar }) {
  const [celebra, setCelebra] = useState(false);
  const timerRef = useRef(null);
  const v = VALLAS[tema.id];
  const m = tema.marco3d;
  const enValle = fase === 'valle3d';
  const enJuego = fase === 'juego2d' && activo;

  const tocar = useCallback(() => {
    if (enValle) {
      onEntrar(tema.id);
      return;
    }
    if (!enJuego) return;
    setCelebra(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCelebra(false), 1400);
  }, [enValle, enJuego, onEntrar, tema.id]);

  return (
    <group position={v.pos} rotation={[0, v.rotY, 0]}>
      {/* marco esbelto que abraza el plano DOM proyectado (~3.55×2.0 con
          centro ~0.12 arriba del nominal — medido en NewDonk2Den3D) */}
      <mesh position={[0, 0.12, -0.14]}>
        <boxGeometry args={[3.95, 2.3, 0.2]} />
        <meshLambertMaterial color={m.frente} flatShading />
      </mesh>
      {/* techito a dos aguas, cariño campesino */}
      <mesh position={[0, 1.4, -0.14]} rotation={[0, Math.PI / 4, 0]} scale={[1, 0.45, 1]}>
        <coneGeometry args={[2.75, 0.55, 4]} />
        <meshLambertMaterial color={m.techo} flatShading />
      </mesh>
      {[-1.75, 1.75].map((x) => (
        <mesh key={x} position={[x, -1.4, -0.14]}>
          <cylinderGeometry args={[0.09, 0.12, 1.4, 6]} />
          <meshLambertMaterial color={m.postes} flatShading />
        </mesh>
      ))}
      <Html
        transform
        distanceFactor={MURAL_DF}
        zIndexRange={[20, 10]}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          onClick={tocar}
          role={enValle ? 'button' : undefined}
          aria-label={enValle
            ? `Mural del mundo ${tema.nombre}: toque para entrar al plano 2D`
            : `Plano 2D del mundo ${tema.nombre}`}
          style={{ cursor: enValle || enJuego ? 'pointer' : 'default' }}
        >
          <MuralParallax tema={tema} reducedMotion={reducedMotion} celebra={celebra} />
        </div>
      </Html>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CHROME DOM — títulos, selector de mundos y botones (usted, cordial)
   ══════════════════════════════════════════════════════════════════════════ */

const CSS_MN = `
.mn-raiz {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: ${P.cielo};
  font-family: system-ui, sans-serif;
}
.mn-raiz canvas { touch-action: none; }
.mn-chrome { position: absolute; inset: 0; pointer-events: none; z-index: 40; }
.mn-chrome > * { pointer-events: auto; }
.mn-titulo {
  position: absolute;
  top: 18px;
  left: 0;
  right: 0;
  margin: 0;
  text-align: center;
  color: ${P.tinta};
  font-size: clamp(19px, 3.4vw, 27px);
  letter-spacing: 0.02em;
  text-shadow: 0 2px 0 rgba(255, 255, 255, 0.55);
}
.mn-sub {
  position: absolute;
  top: 52px;
  left: 0;
  right: 0;
  margin: 0;
  text-align: center;
  color: #47613a;
  font-size: clamp(12px, 2vw, 15px);
}
.mn-selector {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  padding: 8px;
  border-radius: 999px;
  background: rgba(253, 248, 232, 0.88);
  box-shadow: 0 4px 0 rgba(42, 61, 31, 0.35);
}
.mn-chip {
  padding: 10px 20px;
  border: 3px solid rgba(42, 61, 31, 0.35);
  border-radius: 999px;
  background: transparent;
  color: ${P.tinta};
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.12s ease;
}
.mn-chip:hover { transform: translateY(-2px); }
.mn-chip[data-activo='1'] {
  border-color: ${P.tinta};
  background: ${P.follajeLima};
}
.mn-volver {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 8px 16px;
  border: 2px solid rgba(42, 61, 31, 0.6);
  border-radius: 999px;
  background: rgba(253, 248, 232, 0.9);
  color: ${P.tinta};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.mn-salir-valle {
  position: absolute;
  bottom: 96px;
  left: 50%;
  transform: translateX(-50%);
  padding: 11px 22px;
  border: 3px solid ${P.tinta};
  border-radius: 999px;
  background: ${P.crema};
  color: ${P.tinta};
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 0 rgba(42, 61, 31, 0.45);
}
.mn-pista {
  position: absolute;
  bottom: 148px;
  left: 0;
  right: 0;
  text-align: center;
  color: #4a6a3b;
  font-size: 13px;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .mn-chip { transition: none; }
}
`;

/* ══════════════════════════════════════════════════════════════════════════
   EL MOCKUP — Canvas único; la cámara viaja entre valle y murales
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * MuralesNewDonk — tres murales New Donk (café, agua, semillero), cada uno
 * su side-scroller 2D con arte propio, dentro del mismo valle 3D.
 *
 * @param {object} props
 * @param {() => void} [props.onBack] vuelve al host (solo visible en órbita).
 */
export default function MuralesNewDonk({ onBack }) {
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined'
      && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  const [aspectoPantalla] = useState(() => (
    typeof window !== 'undefined' && window.innerHeight > 0
      ? window.innerWidth / window.innerHeight
      : 16 / 9
  ));
  /* Arranque directo para demo/QA: ?mural=cafe|agua|semillero&plano=2d */
  const [muralActivo, setMuralActivo] = useState(() => {
    if (typeof window === 'undefined') return 'cafe';
    const pedido = new URLSearchParams(window.location.search).get('mural');
    return VALLAS[pedido] ? pedido : 'cafe';
  });
  const [fase, setFase] = useState(() => (
    typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).get('plano') === '2d'
      ? 'juego2d'
      : 'valle3d'
  ));
  /* Cambio de mural estando adentro: la cámara sale al valle y, al llegar,
     entra sola al mural pendiente — un solo gesto para el usuario. */
  const pendienteRef = useRef(null);

  const entrarA = useCallback((id) => {
    setMuralActivo(id);
    setFase('acercando');
  }, []);
  const salir = useCallback(() => {
    pendienteRef.current = null;
    setFase('saliendo');
  }, []);
  const elegir = useCallback((id) => {
    if (fase === 'valle3d') {
      setMuralActivo(id);
      setFase('acercando');
      return;
    }
    if (fase === 'juego2d' && id !== muralActivo) {
      pendienteRef.current = id;
      setFase('saliendo');
    }
  }, [fase, muralActivo]);
  const alLlegarCamara = useCallback((faseViaje) => {
    if (faseViaje === 'acercando') {
      setFase('juego2d');
      return;
    }
    const pendiente = pendienteRef.current;
    if (pendiente) {
      pendienteRef.current = null;
      setMuralActivo(pendiente);
      setFase('acercando');
      return;
    }
    setFase('valle3d');
  }, []);

  const poseBoca = useMemo(
    () => poseBocaDe(muralActivo, aspectoPantalla),
    [aspectoPantalla, muralActivo],
  );
  const temaActivo = TEMAS.find((t) => t.id === muralActivo);

  const enValle = fase === 'valle3d';
  const enJuego = fase === 'juego2d';
  const viajando = fase === 'acercando' || fase === 'saliendo';

  const dpr = /** @type {[number, number]} */ ([1, 1.5]);

  return (
    <section
      className="mn-raiz"
      data-fase={fase}
      data-mural={muralActivo}
      aria-label="Murales New Donk por mundo: cada mundo tiene su propio plano 2D dentro del valle 3D"
    >
      <style>{CSS_MN}</style>

      <Canvas
        dpr={dpr}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: POSE_VALLE.pos.toArray(), fov: POSE_VALLE.fov }}
      >
        <color attach="background" args={[P.cielo]} />
        <fog attach="fog" args={[P.niebla, 15, 40]} />
        <CamaraOdyssey
          fase={fase}
          poseValle={POSE_VALLE}
          poseBoca={poseBoca}
          reducedMotion={reducedMotion}
          onLlegada={alLlegarCamara}
        />
        <EscenaValle reducedMotion={reducedMotion} />
        {TEMAS.map((tema) => (
          <VallaMural
            key={tema.id}
            tema={tema}
            fase={fase}
            activo={muralActivo === tema.id}
            reducedMotion={reducedMotion}
            onEntrar={entrarA}
          />
        ))}
      </Canvas>

      <div className="mn-chrome">
        {enValle && (
          <>
            <h2 className="mn-titulo">Los murales de los mundos</h2>
            <p className="mn-sub">
              Cada mundo tiene su propio plano 2D dentro del valle — toque un mural para entrar
            </p>
            {onBack && (
              <button type="button" className="mn-volver" onClick={onBack}>
                ← Salir
              </button>
            )}
          </>
        )}
        {enJuego && (
          <>
            <p className="mn-pista">
              Está en el mural de {temaActivo?.nombre} — el valle sigue ahí, en los bordes
            </p>
            <button type="button" className="mn-salir-valle" onClick={salir}>
              Volver al valle 3D
            </button>
          </>
        )}
        {viajando && (
          <p className="mn-pista">
            {fase === 'acercando' ? `Entrando al mural de ${temaActivo?.nombre}…` : 'Volviendo al valle…'}
          </p>
        )}
        {!viajando && (
          <div className="mn-selector" role="group" aria-label="Elija el mundo del mural">
            {TEMAS.map((tema) => (
              <button
                key={tema.id}
                type="button"
                className="mn-chip"
                data-activo={muralActivo === tema.id ? '1' : '0'}
                onClick={() => elegir(tema.id)}
              >
                {tema.nombre}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
