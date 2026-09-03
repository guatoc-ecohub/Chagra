/*
 * NewDonk2Den3D — un plano 2D lado-a-lado EMBEBIDO dentro de la escena 3D,
 * al estilo de los murales de plataforma clásicos incrustados en una ciudad
 * 3D: el mundo 3D queda SIEMPRE visible alrededor del mural y la cámara es
 * la que se aplana ortográficamente contra el plano para "entrar" al modo 2D.
 *
 * Diferencia clave con JuegoMiFincaOdyssey: aquí NO se desmonta el Canvas ni
 * se cubre con un iris. El side-scroller 2D vive como un plano en la escena
 * (drei <Html transform>) y solo la cámara viaja:
 *
 *   valle3d (órbita, el mural se ve de costado en la finca)
 *     → acercando (CamaraOdyssey: dolly + FOV→20, casi ortográfico)
 *     → juego2d (el mural llena la vista; el 3D asoma en los bordes)
 *     → saliendo (la cámara se retira de vuelta a la órbita)
 *
 * Con prefers-reduced-motion la CamaraOdyssey salta en un frame (corte
 * directo, sin dolly) y las animaciones 2D quedan quietas.
 *
 * Tema visual: nature / biopunk / verde-vivo — paleta orgánica, luz cálida,
 * esporas que flotan. Nada oscuro-cyberpunk.
 *
 * El personaje del plano 2D es la AbejaAngelita 2D (DOM/SVG rubber-hose),
 * caminando de lado sobre un parallax de finca en capas CSS/SVG.
 *
 * Mockup standalone con su propio <Canvas>. Ruta #/mockups/new-donk, sin auth.
 */
import { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { CamaraOdyssey } from '../visual/mundo3d/TunelOdyssey.jsx';
import { AbejaAngelita } from '../visual/creatures/AbejaAngelita.jsx';

/* ══════════════════════════════════════════════════════════════════════════
   POSES DE CÁMARA — el corazón del efecto
   ══════════════════════════════════════════════════════════════════════════ */

/* El mural: div de 640×360 px con distanceFactor 2.5 → 4.0 × 2.25 unidades
   de mundo (drei Html transform: mundo = px · distanceFactor / 400). */
const MURAL_PX = { w: 640, h: 360 };
const MURAL_DF = 2.5;
const MURAL_POS = /** @type {[number, number, number]} */ ([0, 2.0, -1.5]);

/* Órbita 3D: la finca en tres cuartos, el mural se lee como valla en la loma. */
const POSE_VALLE = {
  pos: new THREE.Vector3(7.0, 3.4, 6.6),
  mira: new THREE.Vector3(0, 1.7, -0.6),
  fov: 48,
};

/* La "boca": de frente al mural, FOV 20 (casi ortográfico) a ~9.2 unidades.
   El plano de 2.25 de alto llena ~70% de la vista → el VALLE 3D asoma real
   en los bordes (árboles, pasto, cielo), el encuadre exacto del modo 2D
   dentro de la ciudad 3D. */
const POSE_BOCA = {
  pos: new THREE.Vector3(0, 2.0, 7.7),
  mira: new THREE.Vector3(0, 2.0, -1.5),
  fov: 20,
};

/* ══════════════════════════════════════════════════════════════════════════
   PALETA verde-vivo / biopunk orgánico
   ══════════════════════════════════════════════════════════════════════════ */
const P = {
  cielo: '#dff3d0',
  niebla: '#d3ecc2',
  pasto: '#6fae52',
  pastoHondo: '#5a9443',
  senda: '#8fbf6b',
  madera: '#6b5233',
  maderaClara: '#8a6d47',
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
   ESCENA 3D — el "alrededor" (low-poly, lambert, sin sombras)
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

/* Esporas biopunk: motitas emisivas que derivan lento alrededor del claro.
   Con reduced-motion quedan suspendidas (posición base, cero deriva). */
const ESPORAS = Array.from({ length: 14 }, (_, i) => ({
  x: Math.sin(i * 2.4) * (3.2 + (i % 4)),
  y: 1.1 + ((i * 0.53) % 2.2),
  z: -1.2 + Math.cos(i * 1.7) * (2.4 + (i % 3)),
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

/* La valla física del mural: marco de madera + postes. El plano 2D (Html)
   se pega sobre su cara frontal — desde el costado se le ve el grosor. */
function VallaMural() {
  const [mx, my, mz] = MURAL_POS;
  return (
    <group>
      {/* marco ESBELTO: apenas asoma tras el plano 2D para dar grosor desde
          el costado, sin comerse el borde del encuadre en modo juego2d.
          Medido empírico: el DOM de Html transform proyecta ~3.55×2.0 de
          mundo con centro ~0.12 arriba del nominal — el marco abraza ESO. */}
      <mesh position={[mx, my + 0.12, mz - 0.14]}>
        <boxGeometry args={[3.95, 2.3, 0.2]} />
        <meshLambertMaterial color={P.madera} flatShading />
      </mesh>
      {/* techito a dos aguas, cariño campesino */}
      <mesh position={[mx, my + 1.4, mz - 0.14]} rotation={[0, Math.PI / 4, 0]} scale={[1, 0.45, 1]}>
        <coneGeometry args={[2.75, 0.55, 4]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
      {[-1.75, 1.75].map((x) => (
        <mesh key={x} position={[mx + x, 0.6, mz - 0.14]}>
          <cylinderGeometry args={[0.09, 0.12, 1.4, 6]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function EscenaFinca({ reducedMotion }) {
  return (
    <group>
      <hemisphereLight args={['#f3ffe0', '#48793c', 0.85]} />
      <directionalLight position={[6, 9, 5]} intensity={1.15} color="#fff3d2" />
      <ambientLight intensity={0.35} color="#eaffdc" />

      {/* piso y claro */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[26, 40]} />
        <meshLambertMaterial color={P.pasto} flatShading />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 1.6]}>
        <circleGeometry args={[4.4, 28]} />
        <meshLambertMaterial color={P.senda} flatShading />
      </mesh>

      {/* lomas de fondo */}
      {[[-9, -9, 3.2], [8, -10, 4.0], [0, -13, 5.2], [13, -4, 2.6]].map(([x, z, s], i) => (
        <mesh key={i} position={[x, -s * 0.45, z]} scale={[s * 1.5, s, s]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshLambertMaterial color={i % 2 ? P.pastoHondo : P.follaje} flatShading />
        </mesh>
      ))}

      {/* arboleda a los LADOS y ATRÁS del mural — nada cruza por delante,
          para que en modo 2D el 3D asome limpio por los bordes */}
      <Arbol x={-4.6} z={-2.6} alto={2.6} />
      <Arbol x={-6.4} z={0.4} alto={2.1} copa={P.follajeClaro} />
      <Arbol x={4.8} z={-2.8} alto={2.9} />
      <Arbol x={6.6} z={0.8} alto={2.0} copa={P.follajeClaro} />
      <Arbol x={-3.4} z={-5.5} alto={3.2} s={1.15} />
      <Arbol x={3.2} z={-6.0} alto={3.0} s={1.2} copa={P.follajeClaro} />
      <Arbol x={-8.2} z={3.4} alto={2.3} />
      <Arbol x={8.6} z={3.8} alto={2.4} copa={P.follaje} />

      <Mata x={-2.9} z={0.9} s={1.2} />
      <Mata x={3.1} z={1.2} s={1.05} color={P.follajeClaro} />
      <Mata x={-5.2} z={2.8} s={0.9} />
      <Mata x={5.4} z={2.6} s={1.1} />
      <Mata x={-1.8} z={3.8} s={0.8} color={P.follajeLima} />
      <Mata x={2.2} z={4.2} s={0.85} />
      <Roca x={-3.8} z={2.1} s={1.1} />
      <Roca x={4.2} z={3.3} s={0.9} />
      <Roca x={1.4} z={-3.4} s={1.3} />

      <VallaMural />
      <Esporas reducedMotion={reducedMotion} />
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EL PLANO 2D — side-scroller de finca en parallax + Angelita caminando
   (DOM/SVG dentro de <Html transform>: vive DE VERDAD en la escena 3D)
   ══════════════════════════════════════════════════════════════════════════ */

const CSS_MURAL = `
.nd-mural {
  position: relative;
  width: ${MURAL_PX.w}px;
  height: ${MURAL_PX.h}px;
  box-sizing: border-box;
  padding: 12px;
  border-radius: 18px;
  background: linear-gradient(160deg, #35682c, #234a1e 70%);
  box-shadow: 0 0 0 3px rgba(30, 58, 22, 0.55), 0 14px 34px rgba(24, 46, 16, 0.35);
  font-family: system-ui, sans-serif;
  user-select: none;
}
.nd-mural__lienzo {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 9px;
  overflow: hidden;
  background:
    radial-gradient(34% 30% at 76% 20%, rgba(255, 246, 190, 0.95) 0 28%, rgba(255, 246, 190, 0) 70%),
    linear-gradient(#eaf7c8 0%, #cdeba6 46%, #b3dd8d 62%);
}
/* ── capas parallax (lomas 2D con radial-gradients repetidos) ── */
.nd-capa { position: absolute; left: 0; right: 0; bottom: 0; background-repeat: repeat-x; }
.nd-capa--lejos {
  height: 58%;
  background-image: radial-gradient(60% 115% at 50% 106%, #b7dd92 0 62%, rgba(0,0,0,0) 63%);
  background-size: 280px 165px;
  background-position: 0 100%;
  animation: ndScroll 52s linear infinite;
  --nd-ancho: -280px;
  opacity: 0.85;
}
.nd-capa--medio {
  height: 42%;
  background-image: radial-gradient(58% 112% at 50% 106%, #8cc46a 0 62%, rgba(0,0,0,0) 63%);
  background-size: 200px 122px;
  background-position: 60px 100%;
  animation: ndScroll 26s linear infinite;
  --nd-ancho: -200px;
}
.nd-capa--suelo {
  height: 17%;
  background-image:
    repeating-linear-gradient(90deg, rgba(46, 84, 32, 0.28) 0 7px, rgba(0,0,0,0) 7px 46px),
    linear-gradient(#83b75c, #5f9142 55%, #4d7a36);
  background-size: 640px 100%, 100% 100%;
  animation: ndScroll 9s linear infinite;
  --nd-ancho: -640px;
  border-top: 3px solid rgba(38, 70, 26, 0.5);
}
@keyframes ndScroll {
  from { background-position-x: 0; }
  to { background-position-x: var(--nd-ancho); }
}
/* ── franja de flora cercana: pista al 200% con dos copias idénticas ── */
.nd-flora { position: absolute; left: 0; right: 0; bottom: 15%; height: 46%; overflow: hidden; }
.nd-flora__pista {
  position: absolute; bottom: 0; left: 0;
  width: ${MURAL_PX.w * 2}px; height: 100%;
  display: flex;
  animation: ndPista 15s linear infinite;
}
@keyframes ndPista { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.nd-flora__copia { position: relative; width: 50%; height: 100%; flex: none; }
/* ── Angelita caminando (queda quieta en X; el mundo corre) ── */
.nd-angelita {
  position: absolute;
  left: 31%;
  bottom: 13.5%;
  animation: ndCamina 0.62s ease-in-out infinite;
  transform-origin: 50% 88%;
  filter: drop-shadow(0 10px 7px rgba(30, 54, 20, 0.32));
}
@keyframes ndCamina {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-7px) rotate(2.5deg); }
}
.nd-placa {
  position: absolute; top: 9px; left: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(38, 74, 28, 0.78);
  color: #f2ffdd;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
}
/* reduced-motion: el mural queda como lámina quieta y digna */
.nd-mural[data-rm='1'] .nd-capa,
.nd-mural[data-rm='1'] .nd-flora__pista,
.nd-mural[data-rm='1'] .nd-angelita { animation: none; }
`;

/* Una planta 2D biopunk: tallo + hojas + botón que brilla. SVG mínimo. */
function Planta2D({ x, alto = 74, brillo = false, tono = '#3d7c33' }) {
  return (
    <svg
      viewBox="0 0 40 90"
      width={40}
      height={90}
      style={{ position: 'absolute', bottom: 0, left: `${x}%`, height: alto, width: 'auto' }}
      aria-hidden="true"
    >
      <path d="M20,90 C19,64 21,46 20,26" stroke={tono} strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M20,64 C11,60 6,52 7,44 C15,47 19,54 20,62 Z" fill="#61a548" />
      <path d="M20,50 C29,46 34,38 33,30 C25,33 21,40 20,48 Z" fill="#4f9040" />
      <ellipse cx="20" cy="22" rx="7.5" ry="9" fill={brillo ? '#c9ff96' : '#7cc258'} />
      {brillo && <circle cx="20" cy="20" r="3.2" fill="#f4ffd9" />}
    </svg>
  );
}

/* Una copia de la franja de flora (se pone dos veces para el loop perfecto). */
function FloraCopia() {
  return (
    <div className="nd-flora__copia">
      <Planta2D x={6} alto={70} />
      <Planta2D x={21} alto={52} tono="#356b2c" />
      <Planta2D x={38} alto={84} brillo />
      <Planta2D x={57} alto={60} tono="#468238" />
      <Planta2D x={72} alto={78} brillo />
      <Planta2D x={88} alto={56} tono="#356b2c" />
    </div>
  );
}

/**
 * El mural side-scroller. Vive como plano vertical dentro del 3D vía
 * <Html transform>. Tocarlo en órbita = entrar; tocarlo en modo 2D = la
 * Angelita celebra (vuelta de campana rubber-hose).
 */
function MuralSideScroller({ fase, reducedMotion, onEntrar }) {
  const [celebra, setCelebra] = useState(false);
  const timerRef = useRef(null);
  const enValle = fase === 'valle3d';
  const enJuego = fase === 'juego2d';

  const tocar = useCallback(() => {
    if (enValle) {
      onEntrar();
      return;
    }
    if (!enJuego) return;
    setCelebra(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCelebra(false), 1400);
  }, [enValle, enJuego, onEntrar]);

  return (
    <Html
      transform
      position={MURAL_POS}
      distanceFactor={MURAL_DF}
      zIndexRange={[20, 10]}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="nd-mural"
        data-rm={reducedMotion ? '1' : '0'}
        data-fase={fase}
        onClick={tocar}
        role={enValle ? 'button' : undefined}
        aria-label={enValle ? 'Mural de la finca: toque para entrar al plano 2D' : 'Plano 2D de la finca'}
        style={{ cursor: enValle || enJuego ? 'pointer' : 'default' }}
      >
        <style>{CSS_MURAL}</style>
        <div className="nd-mural__lienzo">
          <div className="nd-capa nd-capa--lejos" />
          <div className="nd-capa nd-capa--medio" />
          <div className="nd-flora">
            <div className="nd-flora__pista">
              <FloraCopia />
              <FloraCopia />
            </div>
          </div>
          <div className="nd-capa nd-capa--suelo" />
          <div className="nd-angelita">
            <AbejaAngelita
              size={96}
              animated={!reducedMotion}
              pose={celebra ? 'celebra' : 'vuela'}
              animo={celebra ? 'pleno' : 'sereno'}
              energia={1}
              title="Angelita caminando por el mural"
            />
          </div>
          <span className="nd-placa">La finca de Angelita</span>
        </div>
      </div>
    </Html>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CHROME DOM — títulos y botones (usted, cordial)
   ══════════════════════════════════════════════════════════════════════════ */

const CSS_ND = `
.nd-raiz {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: ${P.cielo};
  font-family: system-ui, sans-serif;
}
.nd-raiz canvas { touch-action: none; }
.nd-chrome { position: absolute; inset: 0; pointer-events: none; z-index: 40; }
.nd-chrome > * { pointer-events: auto; }
.nd-titulo {
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
.nd-sub {
  position: absolute;
  top: 52px;
  left: 0;
  right: 0;
  margin: 0;
  text-align: center;
  color: #47613a;
  font-size: clamp(12px, 2vw, 15px);
}
.nd-boton {
  position: absolute;
  bottom: 26px;
  left: 50%;
  transform: translateX(-50%);
  padding: 13px 26px;
  border: 3px solid ${P.tinta};
  border-radius: 999px;
  background: ${P.crema};
  color: ${P.tinta};
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 0 rgba(42, 61, 31, 0.45);
  transition: transform 0.12s ease;
}
.nd-boton:hover { transform: translateX(-50%) translateY(-2px); }
.nd-boton:active { transform: translateX(-50%) translateY(1px); }
.nd-volver {
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
.nd-pista {
  position: absolute;
  bottom: 84px;
  left: 0;
  right: 0;
  text-align: center;
  color: #4a6a3b;
  font-size: 13px;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .nd-boton { transition: none; }
}
`;

/* ══════════════════════════════════════════════════════════════════════════
   EL MOCKUP — Canvas único, la cámara es la que viaja
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * NewDonk2Den3D — side-scroller 2D embebido en la finca 3D, con cámara que
 * se aplana ortográficamente contra el plano (y regresa) sin desmontar nada.
 *
 * @param {object} props
 * @param {() => void} [props.onBack] vuelve al host (solo visible en órbita).
 */
export default function NewDonk2Den3D({ onBack }) {
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined'
      && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  /* Máquina de fases local SIN iris: el cruce es 100% viaje de cámara.
     Afordancia de demo/QA: `/?nd=2d#/mockups/new-donk` arranca ya aplanado
     en el plano 2D (útil para capturas y para enseñar el encuadre). */
  const [fase, setFase] = useState(() => (
    typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).get('nd') === '2d'
      ? 'juego2d'
      : 'valle3d'
  ));
  const entrar = useCallback(() => setFase('acercando'), []);
  const salir = useCallback(() => setFase('saliendo'), []);
  const alLlegarCamara = useCallback((faseViaje) => {
    setFase(faseViaje === 'acercando' ? 'juego2d' : 'valle3d');
  }, []);

  const enValle = fase === 'valle3d';
  const enJuego = fase === 'juego2d';
  const viajando = fase === 'acercando' || fase === 'saliendo';

  const dpr = /** @type {[number, number]} */ ([1, 1.5]);

  return (
    <section
      className="nd-raiz"
      data-fase={fase}
      aria-label="Mural 2D dentro de la finca 3D: la cámara se aplana contra el plano para jugar en 2D con el 3D alrededor"
    >
      <style>{CSS_ND}</style>

      <Canvas
        dpr={dpr}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: POSE_VALLE.pos.toArray(), fov: POSE_VALLE.fov }}
      >
        <color attach="background" args={[P.cielo]} />
        <fog attach="fog" args={[P.niebla, 13, 34]} />
        <CamaraOdyssey
          fase={fase}
          poseValle={POSE_VALLE}
          poseBoca={POSE_BOCA}
          reducedMotion={reducedMotion}
          onLlegada={alLlegarCamara}
        />
        <EscenaFinca reducedMotion={reducedMotion} />
        <MuralSideScroller fase={fase} reducedMotion={reducedMotion} onEntrar={entrar} />
      </Canvas>

      <div className="nd-chrome">
        {enValle && (
          <>
            <h2 className="nd-titulo">El mural de la finca</h2>
            <p className="nd-sub">Un plano 2D vive dentro del valle 3D — como los murales de New Donk</p>
            {onBack && (
              <button type="button" className="nd-volver" onClick={onBack}>
                ← Salir
              </button>
            )}
            <button type="button" className="nd-boton" onClick={entrar}>
              Toque para entrar
            </button>
          </>
        )}
        {enJuego && (
          <>
            <p className="nd-pista">Está en el plano 2D — el valle sigue ahí, en los bordes</p>
            <button type="button" className="nd-boton" onClick={salir}>
              Volver al valle 3D
            </button>
          </>
        )}
        {viajando && <p className="nd-pista">{fase === 'acercando' ? 'Entrando al mural…' : 'Volviendo al valle…'}</p>}
      </div>
    </section>
  );
}
