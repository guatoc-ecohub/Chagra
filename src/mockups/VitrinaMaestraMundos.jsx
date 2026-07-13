/*
 * VitrinaMaestraMundos — la PUERTA MAESTRA a todos los mundos 3D de Chagra.
 *
 * EL NORTE (DR mario-2d-3d + JuegoMiFincaOdyssey): el cruce entre mundos no es
 * un cambio de pantalla, es un VIAJE. Esta vitrina es un VALLE ANDINO VIVO con
 * doce portales de piedra sembrados en dos terrazas — cada uno guarda un mundo
 * (valle, café, sanidad, mercado, animales, semillero, compost, agua, páramo,
 * suelo vivo, lluvia, Sierra). Al tocar un portal la cámara hace el viaje
 * Odyssey: dolly hacia la boca con el FOV estrechándose 46→15 en curva k²
 * (succión de túnel) y el IRIS del kit cubre la pantalla; DEBAJO del velo se
 * intercambia la escena y el iris reabre ya adentro. Al volver, el reverso con
 * curva √k (bocanada de aire). Nunca hay corte seco.
 *
 * LAS TRES LEYES DE ESTA REVISIÓN (pedido del operador):
 *  1. EL PAISAJE ES UN LUGAR: valle andino a la hora dorada — cordilleras que
 *     se pierden en la niebla, terrazas de cultivo, una quebrada que baja
 *     brillando entre las dos filas, árboles y pasto instanciados, luciérnagas
 *     y hongos ámbar (el acento biopunk amable). Los portales se sienten
 *     sembrados en un mundo, no botones sobre un fondo.
 *  2. CADA VENTANA LLENA SU CÍRCULO: dentro de cada aro vive una VIÑETA
 *     completa — cielo propio, suelo propio y una mini-escena que ocupa toda
 *     la boca, animada en loop sutil (una viñeta = un useFrame barato de
 *     transformaciones, jamás materiales nuevos por frame).
 *  3. LA VIÑETA DICE A DÓNDE SE ENTRA: café = cafetal en ladera con granos
 *     rojos; agua = quebrada corriendo; suelo = perfil de tierra con lombriz;
 *     animales = gallina picoteando en su corral; semillero = camas
 *     germinando; mercado = puesto con toldo; lluvia = nube soltando gotas…
 *     El usuario SABE qué mundo es antes de tocar.
 *
 * MÁXIMO UN CANVAS VIVO: la galería muestra viñetas low-poly, no las escenas
 * reales. El mundo real se monta por lazy import SOLO al cruzar, cuando el
 * Canvas de la vitrina ya se desmontó bajo el iris (contrato onMitad del kit).
 *
 * TÉCNICA / GAMA BAJA (DR §2, §4, §5):
 *  - Iris: overlay DOM/CSS del kit existente (timers deterministas).
 *  - 3D: MeshLambert + flatShading, sin sombras ni post; dpr por tier;
 *    vegetación por instancedMesh (1 draw call por especie) y luciérnagas por
 *    <points> (1 draw call). Tier 'medio' recorta cantidades, no ideas.
 *  - Tier 'bajo' NI monta el Canvas: la rejilla DOM conserva el ritual con
 *    viñetas CSS (gradiente por mundo + emoji flotando barato).
 *  - Lazy import por mundo, precalentado al elegir (el dolly esconde el chunk).
 *  - prefers-reduced-motion: sin dolly ni loops; las viñetas posan quietas.
 *
 * DIRECCIÓN DE ARTE: atmosferaMadre (cielo `huerta` mezclado a la hora dorada,
 * la misma ley de EscenaBase3D) + los aros de piedra del túnel Odyssey.
 *
 * Mockup standalone con su propio <Canvas>. NO toca App.jsx ni mundoData.
 */
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  ATMOSFERA,
  CIELOS,
  PALETA,
  mezclar,
  mezclarCielo,
} from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import TransicionMundoKit from '../visual/mundo3d/TransicionMundoKit.jsx';
import { AbejaAngelita } from '../visual/creatures/AbejaAngelita.jsx';

/* ══════════════════════════════════════════════════════════════════════════
   LOS DOCE MUNDOS — datos de la vitrina + importadores perezosos
   ══════════════════════════════════════════════════════════════════════════ */

/* Importadores sueltos para PRECALENTAR el chunk al elegir (el dolly esconde
   la descarga) y para fabricar los lazy una sola vez. */
const IMPORTADORES = {
  valle: () => import('./EntradaValle3D.jsx'),
  cafe: () => import('./MundoCafe3D.jsx'),
  sanidad: () => import('./Mundo3DSanidad.jsx'),
  mercado: () => import('./Mundo3DMercado.jsx'),
  animales: () => import('./Mundo3DAnimales.jsx'),
  semillero: () => import('./MundoSemillero3D.jsx'),
  compost: () => import('./MundoCompost3D.jsx'),
  agua: () => import('./MundoAgua3D.jsx'),
  paramo: () => import('./MundoParamo3D.jsx'),
  suelo: () => import('./MundoSueloVivo3D.jsx'),
  lluvia: () => import('./ValleLluvia3D.jsx'),
  sierra: () => import('../visual/mundo3d/VistaGlobalSierra.jsx'),
};

const COMPONENTES = Object.fromEntries(
  Object.entries(IMPORTADORES).map(([id, imp]) => [id, lazy(imp)]),
);

/* La fila de ADELANTE (los mundos del diario) y la de ATRÁS en su terraza.
   El orden ES el arco, de izquierda a derecha. */
const FILA_FRENTE = [
  { id: 'valle', titulo: 'El valle', emoji: '🏡', motivo: 'valle', colorA: '#f2c063', colorB: '#1d4030' },
  { id: 'cafe', titulo: 'El café', emoji: '☕', motivo: 'cafe', colorA: '#c96a2f', colorB: '#3a2416' },
  { id: 'agua', titulo: 'El agua', emoji: '💧', motivo: 'agua', colorA: '#7db8d4', colorB: '#1e3a4f' },
  { id: 'sanidad', titulo: 'La sanidad', emoji: '🐞', motivo: 'sanidad', colorA: '#f2c531', colorB: '#2e4020' },
  { id: 'mercado', titulo: 'El mercado', emoji: '🧺', motivo: 'mercado', colorA: '#e0a458', colorB: '#4a2c18' },
  { id: 'animales', titulo: 'Los animales', emoji: '🐔', motivo: 'animales', colorA: '#d9a066', colorB: '#3f2a1a' },
];
const FILA_ATRAS = [
  { id: 'semillero', titulo: 'El semillero', emoji: '🌱', motivo: 'semillero', colorA: '#9fc46a', colorB: '#25391c' },
  { id: 'suelo', titulo: 'El suelo vivo', emoji: '🪱', motivo: 'suelo', colorA: '#a97b4f', colorB: '#2b1d10' },
  { id: 'sierra', titulo: 'La Sierra', emoji: '🏔️', motivo: 'sierra', colorA: '#e8ddc0', colorB: '#274035' },
  { id: 'paramo', titulo: 'El páramo', emoji: '🌫️', motivo: 'paramo', colorA: '#aec7cf', colorB: '#2a3b40' },
  { id: 'lluvia', titulo: 'La lluvia', emoji: '🌧️', motivo: 'lluvia', colorA: '#9fb3c8', colorB: '#26323f' },
  { id: 'compost', titulo: 'El compost', emoji: '🍂', motivo: 'compost', colorA: '#8a6a3a', colorB: '#241a0e' },
];

/* ══════════════════════════════════════════════════════════════════════════
   GEOMETRÍA DE LA GALERÍA — arcos, poses y bocas (constantes de módulo)
   ══════════════════════════════════════════════════════════════════════════ */

/* La hora de la galería: la huerta bajo la madre (misma receta de EscenaBase3D). */
const CIELO = mezclarCielo(CIELOS.huerta);

/* Hacia dónde miran los portales: un punto entre el centro y la cámara. */
const CENTRO_MIRA = new THREE.Vector3(0, 1.3, 9);

const POSE_GALERIA = {
  pos: new THREE.Vector3(0, 3.3, 12.8),
  mira: new THREE.Vector3(0, 1.6, -1.5),
  fov: 46,
};
const TMP_MIRA = new THREE.Vector3();

const VIAJE_S = 1.25; // dolly perspectiva↔casi-orto (s) — mismo pulso Odyssey
const FOV_BOCA = 15;

/* easeInOutCubic — el dolly acelera suave y "cae" dentro del portal. */
const suavizar = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* Azar determinista barato para sembrar vegetación (mismo valle en cada visita). */
const azar = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/* Fija el FOV por MÉTODO (setFocalLength recalcula la proyección solo): el
   mismo patrón de CamaraDirector/CamaraOdyssey — nada de asignar propiedades. */
function aplicarFov(camera, fov) {
  if (Math.abs(camera.fov - fov) < 0.01) return;
  const focal = (0.5 * camera.getFilmHeight()) / Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  camera.setFocalLength(focal);
}

/* Arma un portal del arco: posición, giro hacia la galería y la pose de BOCA
   (donde la cámara "mete la cara" al portal: FOV 15, mirando a la garganta). */
function armarPortal(def, radio, alturaAro, anguloGrados) {
  const a = THREE.MathUtils.degToRad(anguloGrados);
  const pos = new THREE.Vector3(Math.sin(a) * radio, alturaAro, -Math.cos(a) * radio);
  const dir = new THREE.Vector3(CENTRO_MIRA.x - pos.x, 0, CENTRO_MIRA.z - pos.z).normalize();
  const rotY = Math.atan2(dir.x, dir.z);
  const boca = {
    pos: new THREE.Vector3().copy(pos).addScaledVector(dir, 1.55),
    mira: new THREE.Vector3().copy(pos).addScaledVector(dir, -0.6),
  };
  return { ...def, pos: [pos.x, pos.y, pos.z], rotY, boca, atras: alturaAro > 2 };
}

const ANGULOS_FRENTE = [-58, -35, -12, 12, 35, 58];
const ANGULOS_ATRAS = [-52, -31, -10.5, 10.5, 31, 52];

const PORTALES = [
  ...FILA_FRENTE.map((def, i) => armarPortal(def, 6.3, 1.05, ANGULOS_FRENTE[i])),
  ...FILA_ATRAS.map((def, i) => armarPortal(def, 9.6, 2.55, ANGULOS_ATRAS[i])),
];
const PORTAL_POR_ID = Object.fromEntries(PORTALES.map((p) => [p.id, p]));

/* ══════════════════════════════════════════════════════════════════════════
   CÁMARA — el viaje Odyssey de la vitrina (INTACTO: no tocar el cruce)
   ══════════════════════════════════════════════════════════════════════════ */

/* Órbita viva → dolly a la boca del portal elegido (FOV 46→15, k²) → sostiene
   la boca bajo el iris → al volver, √k de regreso. Todo en useFrame. */
function CamaraVitrina({ fase, boca, reducedMotion, onLlegada }) {
  const { camera } = useThree();
  const anim = useRef({ fasePrev: null, t: 0, avisado: false });
  const llegadaRef = useRef(onLlegada);
  useEffect(() => {
    llegadaRef.current = onLlegada;
  });

  useFrame((state, dt) => {
    const a = anim.current;
    if (a.fasePrev !== fase) {
      a.fasePrev = fase;
      a.t = 0;
      a.avisado = false;
    }
    const entra = fase === 'acercando';
    const sale = fase === 'saliendo';
    if ((entra || sale) && boca) {
      a.t = Math.min(1, a.t + (reducedMotion ? 1 : Math.min(dt, 0.05) / VIAJE_S));
      const k = suavizar(a.t);
      const posDesde = entra ? POSE_GALERIA.pos : boca.pos;
      const posHasta = entra ? boca.pos : POSE_GALERIA.pos;
      const miraDesde = entra ? POSE_GALERIA.mira : boca.mira;
      const miraHasta = entra ? boca.mira : POSE_GALERIA.mira;
      camera.position.lerpVectors(posDesde, posHasta, k);
      TMP_MIRA.lerpVectors(miraDesde, miraHasta, k);
      camera.lookAt(TMP_MIRA);
      /* FOV con curva k² al entrar (se estrecha tarde: succión de túnel) y
         √k al salir (se abre pronto: bocanada de aire) — la ley Odyssey. */
      const kFov = entra ? k * k : Math.sqrt(k);
      const fovDesde = entra ? POSE_GALERIA.fov : FOV_BOCA;
      const fovHasta = entra ? FOV_BOCA : POSE_GALERIA.fov;
      aplicarFov(camera, fovDesde + (fovHasta - fovDesde) * kFov);
      if (a.t >= 1 && !a.avisado) {
        a.avisado = true;
        llegadaRef.current?.(fase);
      }
    } else if (fase === 'galeria' || !boca) {
      /* Órbita viva: vaivén determinista de brisa; la cámara es del director. */
      const t = reducedMotion ? 0 : state.clock.elapsedTime;
      camera.position.set(
        POSE_GALERIA.pos.x + Math.sin(t * 0.14) * 0.5,
        POSE_GALERIA.pos.y + Math.sin(t * 0.1) * 0.18,
        POSE_GALERIA.pos.z + Math.cos(t * 0.12) * 0.35,
      );
      camera.lookAt(POSE_GALERIA.mira);
      aplicarFov(camera, POSE_GALERIA.fov);
    } else {
      /* Bajo el iris: la cámara sostiene la boca del portal, quieta. */
      camera.position.copy(boca.pos);
      camera.lookAt(boca.mira);
      aplicarFov(camera, FOV_BOCA);
    }
  });
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   VIÑETAS — cada círculo LLENO con la mini-escena viva de SU mundo
   ══════════════════════════════════════════════════════════════════════════
   Contrato compartido:
   - Cada viñeta vive dentro de la boca del aro (radio útil ~0.66) y se apoya
     en un FONDO propio (cielo + media luna de suelo) que llena el círculo.
   - Un solo useFrame por viñeta, solo transformaciones sobre refs (posición,
     rotación, escala, emissiveIntensity) — jamás materiales nuevos por frame.
   - `animada=false` (reduced motion) deja la pose inicial, digna y quieta. */

/* El lienzo del círculo: cielo de fondo + media luna de suelo + loma lejana.
   Esto es lo que garantiza que la ventana se vea LLENA, no un ícono flotando. */
function FondoVineta({ cielo, suelo, loma }) {
  return (
    <group>
      <mesh position={[0, 0, -0.34]}>
        <circleGeometry args={[0.74, 26]} />
        <meshLambertMaterial color={cielo} emissive={cielo} emissiveIntensity={0.35} />
      </mesh>
      {loma && (
        <mesh position={[0.16, -0.02, -0.325]} scale={[1.15, 0.42, 1]}>
          <circleGeometry args={[0.5, 16]} />
          <meshLambertMaterial color={loma} />
        </mesh>
      )}
      <mesh position={[0, 0, -0.31]}>
        <circleGeometry args={[0.72, 26, Math.PI, Math.PI]} />
        <meshLambertMaterial color={suelo} />
      </mesh>
    </group>
  );
}

/* Gancho común: un useFrame que corre el loop SOLO si la viñeta está viva. */
function usePulso(animada, alPulsar) {
  const fn = useRef(alPulsar);
  fn.current = alPulsar;
  useFrame((state) => {
    if (animada) fn.current(state.clock.elapsedTime);
  });
}

/* 🏡 VALLE — la casita encalada en su loma, humo respirando de la chimenea. */
function VinetaValle({ animada }) {
  const humos = useRef([]);
  const arbol = useRef(null);
  usePulso(animada, (t) => {
    humos.current.forEach((m, i) => {
      if (!m) return;
      const k = (t * 0.3 + i / 3) % 1;
      m.position.y = 0.34 + k * 0.34;
      m.position.x = 0.21 + Math.sin(k * 5 + i) * 0.03;
      const s = 0.03 + k * 0.055;
      m.scale.setScalar(s);
      m.material.opacity = 0.85 * (1 - k);
    });
    if (arbol.current) arbol.current.rotation.z = Math.sin(t * 1.1) * 0.05;
  });
  return (
    <group>
      <FondoVineta cielo="#cfe4d8" suelo={PALETA.follaje} loma={PALETA.follajeOscuro} />
      {/* la casita del valle */}
      <group position={[0.1, -0.08, -0.22]}>
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.34, 0.24, 0.24]} />
          <meshLambertMaterial color={PALETA.cal} flatShading />
        </mesh>
        <mesh position={[0, 0.27, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.28, 0.18, 4]} />
          <meshLambertMaterial color="#a55e3a" flatShading />
        </mesh>
        <mesh position={[0.11, 0.32, 0]}>
          <boxGeometry args={[0.05, 0.12, 0.05]} />
          <meshLambertMaterial color={PALETA.piedra} flatShading />
        </mesh>
        <mesh position={[0, 0.06, 0.125]}>
          <planeGeometry args={[0.08, 0.14]} />
          <meshLambertMaterial color={PALETA.maderaOscura} />
        </mesh>
      </group>
      {/* humo vivo */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => (humos.current[i] = m)} position={[0.21, 0.34 + i * 0.11, -0.2]}>
          <sphereGeometry args={[1, 6, 5]} />
          <meshBasicMaterial color="#f4ede0" transparent opacity={0.6} depthWrite={false} />
        </mesh>
      ))}
      {/* el árbol guardián meciéndose */}
      <group ref={arbol} position={[-0.34, -0.1, -0.18]}>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.025, 0.04, 0.16, 5]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <coneGeometry args={[0.15, 0.32, 6]} />
          <meshLambertMaterial color={PALETA.follajeOscuro} flatShading />
        </mesh>
      </group>
      {/* camino que baja al umbral */}
      <mesh position={[0, -0.42, -0.28]} rotation={[0, 0, 0.35]} scale={[1, 0.35, 1]}>
        <circleGeometry args={[0.32, 10]} />
        <meshLambertMaterial color={PALETA.tierraClara} />
      </mesh>
    </group>
  );
}

/* ☕ CAFETAL — la ladera diagonal con matas en surco y granos rojos latiendo. */
function VinetaCafe({ animada }) {
  const matas = useRef([]);
  const grano = useRef(null);
  usePulso(animada, (t) => {
    matas.current.forEach((g, i) => {
      if (g) g.rotation.z = Math.sin(t * 1.3 + i * 1.7) * 0.06;
    });
    if (grano.current) grano.current.emissiveIntensity = 0.35 + (Math.sin(t * 2.4) + 1) * 0.3;
  });
  const posiciones = [
    [-0.34, -0.02, 1.05],
    [0.02, -0.16, 1.25],
    [0.38, -0.3, 1.0],
  ];
  return (
    <group>
      <FondoVineta cielo="#f2ddb0" suelo="#7a5230" />
      {/* la ladera en diagonal — se LEE cafetal de montaña */}
      <mesh position={[0, -0.16, -0.3]} rotation={[0, 0, 0.38]}>
        <planeGeometry args={[1.5, 0.55]} />
        <meshLambertMaterial color={PALETA.tierra} />
      </mesh>
      {posiciones.map(([x, y, s], i) => (
        <group key={i} ref={(g) => (matas.current[i] = g)} position={[x, y, -0.24]} scale={[s * 0.9, s * 0.9, 0.6]}>
          <mesh position={[0, -0.06, 0]}>
            <cylinderGeometry args={[0.02, 0.03, 0.14, 5]} />
            <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.16, 8, 6]} />
            <meshLambertMaterial color={PALETA.follajeOscuro} flatShading />
          </mesh>
          {[[-0.09, 0.05], [0.05, -0.02], [0.11, 0.09], [-0.02, 0.14]].map(([gx, gy], j) => (
            <mesh key={j} position={[gx, gy + 0.06, 0.13]}>
              <sphereGeometry args={[0.028, 6, 5]} />
              {i === 1 && j === 1 ? (
                <meshLambertMaterial ref={grano} color="#c22f28" emissive="#e04338" emissiveIntensity={0.4} flatShading />
              ) : (
                <meshLambertMaterial color="#b8352f" flatShading />
              )}
            </mesh>
          ))}
        </group>
      ))}
      {/* el canasto de recolección al pie */}
      <mesh position={[-0.02, -0.44, -0.2]}>
        <cylinderGeometry args={[0.09, 0.06, 0.1, 7]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading />
      </mesh>
    </group>
  );
}

/* 💧 AGUA — la quebrada que corre en diagonal con destellos viajando. */
function VinetaAgua({ animada }) {
  const destellos = useRef([]);
  const junco = useRef(null);
  usePulso(animada, (t) => {
    destellos.current.forEach((m, i) => {
      if (!m) return;
      const k = (t * 0.22 + i / 3) % 1;
      m.position.x = -0.52 + k * 1.04;
      m.position.y = 0.3 - k * 0.62;
      m.material.opacity = 0.9 * Math.sin(k * Math.PI);
    });
    if (junco.current) junco.current.rotation.z = Math.sin(t * 1.6) * 0.1;
  });
  return (
    <group>
      <FondoVineta cielo="#d8ecdc" suelo={PALETA.follaje} loma="#5f8a5f" />
      {/* el cauce cruza TODO el círculo */}
      <mesh position={[0, -0.14, -0.3]} rotation={[0, 0, -0.55]}>
        <planeGeometry args={[1.6, 0.34]} />
        <meshLambertMaterial color={PALETA.agua} emissive={PALETA.agua} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0.02, -0.13, -0.29]} rotation={[0, 0, -0.55]}>
        <planeGeometry args={[1.6, 0.1]} />
        <meshLambertMaterial color="#6fb3cc" />
      </mesh>
      {/* destellos que VIAJAN aguas abajo — el agua corre */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => (destellos.current[i] = m)} position={[-0.5 + i * 0.35, 0.28 - i * 0.2, -0.27]}>
          <sphereGeometry args={[0.035, 6, 5]} />
          <meshBasicMaterial color="#eaf7ff" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      ))}
      {/* piedras de orilla */}
      {[[-0.3, -0.38], [0.34, 0.08], [0.12, -0.42]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, -0.26]} rotation={[0.3, i, 0]}>
          <dodecahedronGeometry args={[0.07, 0]} />
          <meshLambertMaterial color={PALETA.piedra} flatShading />
        </mesh>
      ))}
      {/* junco meciéndose */}
      <group ref={junco} position={[-0.42, -0.2, -0.24]}>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.012, 0.02, 0.3, 4]} />
          <meshLambertMaterial color={PALETA.follajeClaro} flatShading />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <sphereGeometry args={[0.035, 5, 4]} />
          <meshLambertMaterial color={PALETA.ambar} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* 🐞 SANIDAD — la hoja grande con la mariquita patrullando (control biológico). */
function VinetaSanidad({ animada }) {
  const bicho = useRef(null);
  const hoja = useRef(null);
  usePulso(animada, (t) => {
    if (bicho.current) {
      const x = Math.sin(t * 0.7) * 0.24;
      bicho.current.position.x = x;
      bicho.current.rotation.y = Math.cos(t * 0.7) > 0 ? 0.35 : Math.PI - 0.35;
    }
    if (hoja.current) hoja.current.rotation.z = 0.12 + Math.sin(t * 0.9) * 0.04;
  });
  return (
    <group>
      <FondoVineta cielo="#e6f0c8" suelo={PALETA.follaje} />
      {/* la mata vigilada */}
      <mesh position={[-0.3, -0.18, -0.28]}>
        <coneGeometry args={[0.18, 0.4, 6]} />
        <meshLambertMaterial color={PALETA.follajeOscuro} flatShading />
      </mesh>
      {/* la HOJA protagonista, llenando el círculo */}
      <group ref={hoja} position={[0.05, -0.05, -0.26]} rotation={[0, 0, 0.12]}>
        <mesh scale={[1, 0.55, 1]}>
          <circleGeometry args={[0.42, 12]} />
          <meshLambertMaterial color={PALETA.follajeClaro} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0, 0.005]} scale={[0.9, 0.06, 1]}>
          <circleGeometry args={[0.42, 8]} />
          <meshLambertMaterial color={PALETA.follaje} />
        </mesh>
        {/* la mariquita que patrulla */}
        <group ref={bicho} position={[0, 0.06, 0.05]}>
          <mesh scale={[1.2, 0.85, 1]}>
            <sphereGeometry args={[0.065, 8, 6]} />
            <meshLambertMaterial color="#c22f28" flatShading />
          </mesh>
          <mesh position={[0.07, 0.01, 0]}>
            <sphereGeometry args={[0.035, 6, 5]} />
            <meshLambertMaterial color="#241a12" flatShading />
          </mesh>
          {[[-0.02, 0.05], [0.03, -0.04]].map(([px, pz], i) => (
            <mesh key={i} position={[px, 0.055, pz]}>
              <sphereGeometry args={[0.016, 4, 4]} />
              <meshLambertMaterial color="#241a12" flatShading />
            </mesh>
          ))}
        </group>
      </group>
      {/* la trampa amarilla — señal de manejo sano */}
      <group position={[0.42, -0.14, -0.29]}>
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 4]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <planeGeometry args={[0.14, 0.12]} />
          <meshLambertMaterial color="#f2c531" emissive="#f2c531" emissiveIntensity={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

/* 🧺 MERCADO — el puesto con toldo, banderines y la cosecha en el mesón. */
function VinetaMercado({ animada }) {
  const banderin = useRef(null);
  const frutas = useRef([]);
  usePulso(animada, (t) => {
    if (banderin.current) banderin.current.rotation.z = Math.sin(t * 1.8) * 0.07;
    frutas.current.forEach((m, i) => {
      if (m) m.position.y = -0.16 + Math.abs(Math.sin(t * 1.4 + i * 2.1)) * 0.018;
    });
  });
  return (
    <group>
      <FondoVineta cielo="#f4e4ba" suelo={PALETA.tierraClara} />
      {/* postes y toldo — el puesto llena la boca */}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, -0.08, -0.26]}>
          <cylinderGeometry args={[0.022, 0.022, 0.6, 4]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.3, -0.24]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[0.78, 0.05, 0.3]} />
        <meshLambertMaterial color="#c96a2f" flatShading />
      </mesh>
      <mesh position={[0, 0.24, -0.1]}>
        <boxGeometry args={[0.78, 0.07, 0.02]} />
        <meshLambertMaterial color="#e8b04a" flatShading />
      </mesh>
      {/* banderines de plaza */}
      <group ref={banderin} position={[0, 0.42, -0.22]}>
        {[-0.24, -0.08, 0.08, 0.24].map((x, i) => (
          <mesh key={x} position={[x, 0.02 - Math.abs(x) * 0.18, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.035, 0.07, 3]} />
            <meshLambertMaterial color={i % 2 ? '#b8352f' : '#f2c531'} flatShading />
          </mesh>
        ))}
      </group>
      {/* el mesón con la cosecha */}
      <mesh position={[0, -0.26, -0.2]}>
        <boxGeometry args={[0.66, 0.06, 0.22]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading />
      </mesh>
      {[['#b8352f', -0.2], [PALETA.ambar, 0], ['#7a9a3f', 0.2]].map(([c, x], i) => (
        <mesh key={i} ref={(m) => (frutas.current[i] = m)} position={[x, -0.16, -0.18]}>
          <sphereGeometry args={[0.065, 7, 6]} />
          <meshLambertMaterial color={c} flatShading />
        </mesh>
      ))}
      <mesh position={[0, -0.45, -0.22]}>
        <cylinderGeometry args={[0.12, 0.09, 0.12, 7]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading />
      </mesh>
    </group>
  );
}

/* 🐔 ANIMALES — el corral con la gallina picoteando y su pollito. */
function VinetaAnimales({ animada }) {
  const cabeza = useRef(null);
  const pollito = useRef(null);
  usePulso(animada, (t) => {
    if (cabeza.current) cabeza.current.rotation.x = Math.max(0, Math.sin(t * 2.1)) * 0.85;
    if (pollito.current) {
      pollito.current.position.y = -0.3 + Math.abs(Math.sin(t * 3.2)) * 0.035;
      pollito.current.rotation.y = Math.sin(t * 0.8) * 0.5;
    }
  });
  return (
    <group>
      <FondoVineta cielo="#f0e2c2" suelo={PALETA.tierraClara} />
      {/* la cerca del corral cruza el círculo */}
      {[-0.42, 0, 0.42].map((x) => (
        <mesh key={x} position={[x, -0.06, -0.3]}>
          <boxGeometry args={[0.035, 0.42, 0.035]} />
          <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
        </mesh>
      ))}
      {[0.06, -0.14].map((y) => (
        <mesh key={y} position={[0, y, -0.29]}>
          <boxGeometry args={[1.0, 0.035, 0.03]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
      ))}
      {/* la gallina que picotea */}
      <group position={[-0.14, -0.26, -0.2]}>
        <mesh scale={[1, 0.9, 1.25]}>
          <sphereGeometry args={[0.14, 8, 6]} />
          <meshLambertMaterial color={PALETA.cal} flatShading />
        </mesh>
        <mesh position={[-0.1, 0.06, 0]} rotation={[0.4, 0, 0]} scale={[0.5, 0.8, 1]}>
          <sphereGeometry args={[0.1, 6, 5]} />
          <meshLambertMaterial color="#e8ddc8" flatShading />
        </mesh>
        <group ref={cabeza} position={[0.1, 0.1, 0]}>
          <mesh position={[0.03, 0.05, 0]}>
            <sphereGeometry args={[0.07, 7, 6]} />
            <meshLambertMaterial color={PALETA.cal} flatShading />
          </mesh>
          <mesh position={[0.1, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.022, 0.06, 4]} />
            <meshLambertMaterial color={PALETA.ambar} flatShading />
          </mesh>
          <mesh position={[0.03, 0.12, 0]}>
            <sphereGeometry args={[0.025, 5, 4]} />
            <meshLambertMaterial color="#b8352f" flatShading />
          </mesh>
        </group>
      </group>
      {/* el pollito saltarín */}
      <group ref={pollito} position={[0.24, -0.3, -0.18]}>
        <mesh>
          <sphereGeometry args={[0.06, 7, 6]} />
          <meshLambertMaterial color="#e8c04a" flatShading />
        </mesh>
        <mesh position={[0.02, 0.06, 0]}>
          <sphereGeometry args={[0.04, 6, 5]} />
          <meshLambertMaterial color="#e8c04a" flatShading />
        </mesh>
      </group>
      {/* granitos en el piso */}
      {[[-0.02, -0.42], [0.1, -0.38]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, -0.2]}>
          <sphereGeometry args={[0.018, 4, 4]} />
          <meshLambertMaterial color={PALETA.ambar} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* 🌱 SEMILLERO — las camas con brotes que GERMINAN en oleada escalonada. */
function VinetaSemillero({ animada }) {
  const brotes = useRef([]);
  usePulso(animada, (t) => {
    brotes.current.forEach((m, i) => {
      if (!m) return;
      const k = (t * 0.2 + i * 0.23) % 1;
      const s = Math.min(1, k * 2.2);
      m.scale.set(0.25 + s * 0.75, Math.max(0.08, s), 0.25 + s * 0.75);
    });
  });
  const filas = [
    { y: -0.16, z: -0.28, xs: [-0.3, -0.1, 0.1, 0.3] },
    { y: -0.36, z: -0.22, xs: [-0.38, -0.14, 0.12, 0.36] },
  ];
  let idx = 0;
  return (
    <group>
      <FondoVineta cielo="#e2eecb" suelo={PALETA.tierra} />
      {/* las dos camas de germinación */}
      {filas.map((f, fi) => (
        <group key={fi}>
          <mesh position={[0, f.y - 0.07, f.z]}>
            <boxGeometry args={[fi ? 0.94 : 0.78, 0.09, 0.16]} />
            <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
          </mesh>
          <mesh position={[0, f.y - 0.045, f.z + 0.005]}>
            <boxGeometry args={[fi ? 0.88 : 0.72, 0.05, 0.14]} />
            <meshLambertMaterial color={PALETA.tierra} flatShading />
          </mesh>
          {f.xs.map((x) => {
            const i = idx++;
            return (
              <mesh key={x} ref={(m) => (brotes.current[i] = m)} position={[x, f.y + 0.06, f.z + 0.01]}>
                <coneGeometry args={[0.045, 0.16, 5]} />
                <meshLambertMaterial color={PALETA.follajeClaro} flatShading />
              </mesh>
            );
          })}
        </group>
      ))}
      {/* el arco del túnel de propagación */}
      <mesh position={[0, 0.02, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.018, 5, 12, Math.PI]} />
        <meshLambertMaterial color={PALETA.cal} flatShading />
      </mesh>
      <mesh position={[0, 0.02, -0.24]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.018, 5, 12, Math.PI]} />
        <meshLambertMaterial color={PALETA.cal} flatShading />
      </mesh>
      {/* el sol que llama a los brotes */}
      <mesh position={[0.4, 0.42, -0.32]}>
        <circleGeometry args={[0.11, 12]} />
        <meshBasicMaterial color="#ffdf8a" />
      </mesh>
    </group>
  );
}

/* 🪱 SUELO VIVO — el perfil de tierra con la lombriz ondulando entre raíces. */
function VinetaSuelo({ animada }) {
  const anillos = useRef([]);
  usePulso(animada, (t) => {
    anillos.current.forEach((m, i) => {
      if (m) m.position.y = m.userData.y + Math.sin(t * 2.4 + i * 1.15) * 0.028;
    });
  });
  return (
    <group>
      <FondoVineta cielo="#e9d9b6" suelo="#4a3320" />
      {/* pasto arriba: la franja viva */}
      <mesh position={[0, 0.14, -0.3]}>
        <planeGeometry args={[1.44, 0.1]} />
        <meshLambertMaterial color={PALETA.follaje} />
      </mesh>
      {[-0.5, -0.28, -0.02, 0.26, 0.5].map((x, i) => (
        <mesh key={x} position={[x, 0.22, -0.29]} rotation={[0, 0, (i % 2 ? -1 : 1) * 0.15]}>
          <coneGeometry args={[0.03, 0.12, 4]} />
          <meshLambertMaterial color={PALETA.follajeClaro} flatShading />
        </mesh>
      ))}
      {/* perfil de tierra con horizonte */}
      <mesh position={[0, -0.2, -0.31]}>
        <planeGeometry args={[1.44, 0.62]} />
        <meshLambertMaterial color={PALETA.tierra} />
      </mesh>
      {/* raíces colgando */}
      {[-0.34, 0.02, 0.38].map((x, i) => (
        <group key={x} position={[x, 0.02, -0.28]}>
          <mesh rotation={[0, 0, i % 2 ? 0.2 : -0.15]}>
            <cylinderGeometry args={[0.008, 0.018, 0.3, 4]} />
            <meshLambertMaterial color={PALETA.maderaClara} flatShading />
          </mesh>
        </group>
      ))}
      {/* LA LOMBRIZ — cinco anillos que ondulan (el suelo respira) */}
      {[-0.26, -0.13, 0, 0.13, 0.26].map((x, i) => {
        const y = -0.24;
        return (
          <mesh
            key={x}
            ref={(m) => {
              if (m) {
                m.userData.y = y;
                anillos.current[i] = m;
              }
            }}
            position={[x, y, -0.24]}
          >
            <sphereGeometry args={[i === 4 ? 0.055 : 0.065, 7, 6]} />
            <meshLambertMaterial color="#c9708c" flatShading />
          </mesh>
        );
      })}
      {/* poros de vida: piedritas y humus */}
      {[[-0.42, -0.4], [0.18, -0.44], [0.44, -0.3]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, -0.27]}>
          <dodecahedronGeometry args={[0.035, 0]} />
          <meshLambertMaterial color={PALETA.piedra} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* 🏔️ SIERRA — el pico nevado sobre su laguna, con la nube pasando. */
function VinetaSierra({ animada }) {
  const nube = useRef(null);
  const laguna = useRef(null);
  usePulso(animada, (t) => {
    if (nube.current) nube.current.position.x = Math.sin(t * 0.22) * 0.3;
    if (laguna.current) laguna.current.emissiveIntensity = 0.25 + (Math.sin(t * 1.1) + 1) * 0.12;
  });
  return (
    <group>
      <FondoVineta cielo="#d2e2ea" suelo="#5f7a56" />
      {/* la laguna sagrada */}
      <mesh position={[0, -0.34, -0.3]} scale={[1, 0.4, 1]}>
        <circleGeometry args={[0.5, 16]} />
        <meshLambertMaterial ref={laguna} color={PALETA.agua} emissive={PALETA.agua} emissiveIntensity={0.3} />
      </mesh>
      {/* la montaña madre con nieve */}
      <mesh position={[0, 0.02, -0.31]}>
        <coneGeometry args={[0.44, 0.66, 7]} />
        <meshLambertMaterial color={PALETA.follajeOscuro} flatShading />
      </mesh>
      <mesh position={[-0.3, -0.12, -0.315]}>
        <coneGeometry args={[0.26, 0.38, 6]} />
        <meshLambertMaterial color="#4a6a45" flatShading />
      </mesh>
      <mesh position={[0, 0.28, -0.3]}>
        <coneGeometry args={[0.16, 0.2, 7]} />
        <meshLambertMaterial color="#f4f1e6" flatShading />
      </mesh>
      {/* la nube viajera */}
      <group ref={nube} position={[0, 0.36, -0.26]}>
        {[[-0.08, 0, 0.06], [0.05, 0.02, 0.08], [0.16, -0.01, 0.05]].map(([x, y, r], i) => (
          <mesh key={i} position={[x, y, 0]}>
            <sphereGeometry args={[r, 6, 5]} />
            <meshBasicMaterial color="#fbf7ec" transparent opacity={0.92} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {/* frailejoncitos de orilla */}
      {[-0.4, 0.42].map((x) => (
        <mesh key={x} position={[x, -0.26, -0.26]}>
          <coneGeometry args={[0.05, 0.14, 5]} />
          <meshLambertMaterial color="#b8c46a" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* 🌫️ PÁRAMO — frailejones entre bancos de niebla que van y vienen. */
function VinetaParamo({ animada }) {
  const brumas = useRef([]);
  usePulso(animada, (t) => {
    brumas.current.forEach((m, i) => {
      if (!m) return;
      m.position.x = Math.sin(t * 0.18 + i * 2.4) * 0.26 * (i % 2 ? -1 : 1);
      m.material.opacity = 0.4 + Math.sin(t * 0.3 + i) * 0.14;
    });
  });
  const frailejon = (x, y, s, key) => (
    <group key={key} position={[x, y, -0.27]} scale={[s, s, s]}>
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.05, 0.065, 0.22, 6]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[Math.sin((i / 5) * Math.PI * 2) * 0.08, 0.05, Math.cos((i / 5) * Math.PI * 2) * 0.08]}
          rotation={[Math.PI / 3.4, (i / 5) * Math.PI * 2, 0]}
        >
          <coneGeometry args={[0.04, 0.2, 4]} />
          <meshLambertMaterial color="#b8c46a" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.055, 6, 5]} />
        <meshLambertMaterial color="#d9c95a" flatShading />
      </mesh>
    </group>
  );
  return (
    <group>
      <FondoVineta cielo="#dde6de" suelo="#7a8a5a" loma="#93a385" />
      {frailejon(-0.26, -0.16, 1.15, 'a')}
      {frailejon(0.24, -0.3, 0.95, 'b')}
      {frailejon(0.44, -0.06, 0.7, 'c')}
      {/* los bancos de niebla vivos */}
      {[0.12, -0.1, 0.3].map((y, i) => (
        <mesh key={i} ref={(m) => (brumas.current[i] = m)} position={[0, y, -0.2 + i * 0.02]} scale={[1, 0.16, 1]}>
          <circleGeometry args={[0.55, 12]} />
          <meshBasicMaterial color="#eef2ea" transparent opacity={0.45} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* 🌧️ LLUVIA — la nube madre soltando gotas sobre la mata que las recibe. */
function VinetaLluvia({ animada }) {
  const gotas = useRef([]);
  const mata = useRef(null);
  usePulso(animada, (t) => {
    gotas.current.forEach((m, i) => {
      if (!m) return;
      const k = (t * 0.55 + i * 0.19) % 1;
      m.position.y = 0.22 - k * 0.62;
      m.position.x = m.userData.x;
      m.material.opacity = k < 0.08 ? k * 9 : 1 - k * 0.35;
    });
    if (mata.current) mata.current.rotation.z = Math.sin(t * 1.8) * 0.07;
  });
  return (
    <group>
      <FondoVineta cielo="#c9d3d8" suelo={PALETA.follaje} />
      {/* la nube que llena el cielo del círculo */}
      <group position={[0, 0.32, -0.28]}>
        {[[-0.22, 0, 0.14], [-0.02, 0.06, 0.18], [0.2, 0, 0.15], [0.36, -0.02, 0.1]].map(([x, y, r], i) => (
          <mesh key={i} position={[x, y, 0]}>
            <sphereGeometry args={[r, 7, 6]} />
            <meshLambertMaterial color="#c3cdd4" flatShading />
          </mesh>
        ))}
      </group>
      {/* las gotas cayendo en loop */}
      {[-0.34, -0.17, 0, 0.17, 0.34].map((x, i) => (
        <mesh
          key={x}
          ref={(m) => {
            if (m) {
              m.userData.x = x;
              gotas.current[i] = m;
            }
          }}
          position={[x, 0.1, -0.24]}
          scale={[0.6, 1.4, 0.6]}
        >
          <sphereGeometry args={[0.028, 5, 5]} />
          <meshBasicMaterial color="#9fd3e8" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      ))}
      {/* la mata agradecida y su charco */}
      <mesh position={[0.05, -0.5, -0.26]} scale={[1, 0.3, 1]}>
        <circleGeometry args={[0.3, 12]} />
        <meshLambertMaterial color={PALETA.agua} emissive={PALETA.agua} emissiveIntensity={0.2} />
      </mesh>
      <group ref={mata} position={[-0.05, -0.42, -0.24]}>
        <mesh position={[0, 0.1, 0]}>
          <coneGeometry args={[0.12, 0.26, 6]} />
          <meshLambertMaterial color={PALETA.follajeClaro} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* 🍂 COMPOST — la pila caliente: hoja que cae, vapor que sube. */
function VinetaCompost({ animada }) {
  const hoja = useRef(null);
  const vapores = useRef([]);
  usePulso(animada, (t) => {
    if (hoja.current) {
      const k = (t * 0.28) % 1;
      hoja.current.position.y = 0.42 - k * 0.6;
      hoja.current.position.x = 0.1 + Math.sin(k * 7) * 0.09;
      hoja.current.rotation.z = k * 5;
      hoja.current.material.opacity = k > 0.9 ? (1 - k) * 10 : 1;
    }
    vapores.current.forEach((m, i) => {
      if (!m) return;
      const k = (t * 0.24 + i / 2) % 1;
      m.position.y = -0.1 + k * 0.45;
      m.position.x = -0.16 + i * 0.14 + Math.sin(k * 4 + i) * 0.04;
      m.scale.setScalar(0.03 + k * 0.06);
      m.material.opacity = 0.5 * (1 - k);
    });
  });
  return (
    <group>
      <FondoVineta cielo="#eedebc" suelo={PALETA.tierraClara} />
      {/* la pila por capas — se lee compostera */}
      <mesh position={[0, -0.34, -0.28]}>
        <coneGeometry args={[0.42, 0.24, 9]} />
        <meshLambertMaterial color={PALETA.tierra} flatShading />
      </mesh>
      <mesh position={[0, -0.2, -0.28]}>
        <coneGeometry args={[0.32, 0.2, 9]} />
        <meshLambertMaterial color="#5a6a2e" flatShading />
      </mesh>
      <mesh position={[0, -0.08, -0.28]}>
        <coneGeometry args={[0.2, 0.16, 8]} />
        <meshLambertMaterial color="#8a6a3a" flatShading />
      </mesh>
      {/* la horqueta clavada al lado */}
      <group position={[-0.42, -0.2, -0.26]} rotation={[0, 0, 0.25]}>
        <mesh>
          <cylinderGeometry args={[0.015, 0.015, 0.5, 4]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
        <mesh position={[0, -0.26, 0]}>
          <boxGeometry args={[0.1, 0.06, 0.02]} />
          <meshLambertMaterial color={PALETA.lamina} flatShading />
        </mesh>
      </group>
      {/* vapor de pila viva */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => (vapores.current[i] = m)} position={[-0.16 + i * 0.14, 0, -0.24]}>
          <sphereGeometry args={[1, 6, 5]} />
          <meshBasicMaterial color="#f6efe0" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
      {/* la hoja que cae eternamente */}
      <mesh ref={hoja} position={[0.1, 0.42, -0.22]} scale={[1, 0.6, 1]}>
        <circleGeometry args={[0.07, 6]} />
        <meshBasicMaterial color="#c96a2f" transparent opacity={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* El registro viñeta-por-mundo (data-driven, mismo espíritu del route-registry). */
const VINETAS = {
  valle: VinetaValle,
  cafe: VinetaCafe,
  agua: VinetaAgua,
  sanidad: VinetaSanidad,
  mercado: VinetaMercado,
  animales: VinetaAnimales,
  semillero: VinetaSemillero,
  suelo: VinetaSuelo,
  sierra: VinetaSierra,
  paramo: VinetaParamo,
  lluvia: VinetaLluvia,
  compost: VinetaCompost,
};

/* ══════════════════════════════════════════════════════════════════════════
   PORTAL — aro de piedra + garganta + la VIÑETA VIVA llenando la boca
   ══════════════════════════════════════════════════════════════════════════ */

function PortalMundo({ portal, elegido, interactivo, animada, onElegir, onSenalar }) {
  const halo = useRef(null);
  const Vineta = VINETAS[portal.motivo] ?? VinetaValle;

  /* El halo interior respira; si es el elegido, se enciende (la promesa). */
  useFrame((state) => {
    const h = halo.current;
    if (!h) return;
    const t = state.clock.elapsedTime;
    const base = elegido ? 1.6 : 0.55;
    h.emissiveIntensity = base + Math.sin(t * 2.1 + portal.rotY * 3) * 0.18;
  });

  const alTocar = useCallback(
    (e) => {
      e.stopPropagation();
      if (interactivo) onElegir(portal.id);
    },
    [interactivo, onElegir, portal.id],
  );
  const manito = useCallback(() => {
    if (!interactivo) return;
    document.body.style.cursor = 'pointer';
    onSenalar(portal.id);
  }, [interactivo, onSenalar, portal.id]);
  const normal = useCallback(() => {
    document.body.style.cursor = 'auto';
    onSenalar(null);
  }, [onSenalar]);
  /* si el portal se desmonta con la manito puesta, soltarla */
  useEffect(
    () => () => {
      document.body.style.cursor = 'auto';
    },
    [],
  );

  return (
    <group position={portal.pos} rotation={[0, portal.rotY, 0]}>
      {/* aro de piedra (el mismo lenguaje del túnel Odyssey) */}
      <mesh rotation={[0, 0, portal.atras ? -0.06 : 0.07]}>
        <torusGeometry args={[0.88, 0.19, 8, 18]} />
        <meshLambertMaterial color={PALETA.piedra} flatShading />
      </mesh>
      {/* la enredadera que abraza el aro — el valle se trepa a la piedra */}
      <mesh rotation={[0, 0, portal.atras ? 0.5 : -0.4]}>
        <torusGeometry args={[0.9, 0.045, 5, 12, Math.PI * 0.85]} />
        <meshLambertMaterial color={PALETA.follaje} flatShading />
      </mesh>
      {/* halo interior que respira (la luz del mundo llamando) */}
      <mesh position={[0, 0, 0.02]}>
        <torusGeometry args={[0.72, 0.035, 6, 20]} />
        <meshLambertMaterial ref={halo} color={portal.colorA} emissive={portal.colorA} emissiveIntensity={0.55} />
      </mesh>
      {/* garganta hacia adentro de la loma */}
      <mesh position={[0, 0, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.76, 0.76, 1.0, 14, 1, true]} />
        <meshLambertMaterial color={ATMOSFERA.sombra} side={THREE.BackSide} />
      </mesh>
      {/* LA VENTANA VIVA: la viñeta del mundo llenando toda la boca. Los
          eventos van en el group para que CUALQUIER pieza de la viñeta sea
          tocable — la ventana completa es el botón. */}
      <group onClick={alTocar} onPointerOver={manito} onPointerOut={normal}>
        <Vineta animada={animada} />
      </group>
      {/* piedra de umbral */}
      <mesh position={[0.72, -0.92, 0.28]} rotation={[0.2, 0.9, 0]}>
        <dodecahedronGeometry args={[0.18, 0]} />
        <meshLambertMaterial color={PALETA.concreto} flatShading />
      </mesh>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EL VALLE — el paisaje verde-vivo donde los portales son LUGARES
   ══════════════════════════════════════════════════════════════════════════ */

/* El sol bajo y sus nubes: básicos sin niebla, pegados al horizonte. */
function CieloDorado() {
  const nubes = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    nubes.current.forEach((g, i) => {
      if (g) g.position.x = g.userData.x + Math.sin(t * 0.03 + i * 2) * 3.5;
    });
  });
  return (
    <group>
      {/* el sol de la hora dorada, con su halo */}
      <mesh position={[9, 7.5, -46]}>
        <circleGeometry args={[4.4, 24]} />
        <meshBasicMaterial color="#ffdf9a" fog={false} />
      </mesh>
      <mesh position={[9, 7.5, -46.5]}>
        <circleGeometry args={[8.5, 24]} />
        <meshBasicMaterial color="#f7cd7e" transparent opacity={0.35} fog={false} depthWrite={false} />
      </mesh>
      {/* nubes largas de tarde */}
      {[
        { x: -14, y: 10, z: -44, s: 1.4 },
        { x: 12, y: 12.5, z: -42, s: 1 },
      ].map((n, i) => (
        <group
          key={i}
          ref={(g) => {
            if (g) {
              g.userData.x = n.x;
              nubes.current[i] = g;
            }
          }}
          position={[n.x, n.y, n.z]}
          scale={[n.s, n.s, n.s]}
        >
          {[[-2.4, 0, 1.6], [0, 0.5, 2.2], [2.6, 0, 1.8]].map(([x, y, r], j) => (
            <mesh key={j} position={[x, y, 0]} scale={[1.6, 0.55, 1]}>
              <sphereGeometry args={[r, 8, 6]} />
              <meshBasicMaterial color="#faf0da" transparent opacity={0.75} fog={false} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* Cordilleras que se pierden en la niebla dorada: 4 planos de profundidad. */
function Cordilleras() {
  const capas = [
    { z: -18, y: -1.2, color: mezclar(PALETA.follajeOscuro, CIELO.fondo, 0.25), lomas: [[-11, 5.6], [-2, 6.4], [8, 5.2], [15, 4.6]] },
    { z: -26, y: -0.8, color: mezclar(PALETA.follaje, CIELO.fondo, 0.5), lomas: [[-16, 7], [-5, 8.2], [6, 7.4], [16, 6.6]] },
    { z: -34, y: -0.4, color: mezclar(PALETA.follajeOscuro, CIELO.fondo, 0.7), lomas: [[-12, 10], [2, 11.5], [14, 9.5]] },
    { z: -42, y: 0, color: mezclar('#6b7a8a', CIELO.fondo, 0.82), lomas: [[-6, 13], [9, 14]] },
  ];
  return (
    <group>
      {capas.map((c, i) => (
        <group key={i}>
          {c.lomas.map(([x, r], j) => (
            <mesh key={j} position={[x, c.y - r * 0.55, c.z]} scale={[1.9, 1, 0.6]}>
              <sphereGeometry args={[r, 10, 8]} />
              <meshLambertMaterial color={c.color} flatShading />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* Las terrazas de cultivo detrás de la fila de atrás — el valle SE SIEMBRA.
   ARCOS ABIERTOS solo del lado del fondo (θ ∈ [π/2, 3π/2] ⇒ z<0): un cilindro
   cerrado a estos radios pasaría por la POSE de la cámara (z=+12.8) y su
   pared taparía todo el encuadre (bug cazado por screenshot en la 1ª pasada). */
function Terrazas() {
  return (
    <group>
      {[
        { r: 11.5, y: 0.9, color: mezclar(mezclar(PALETA.follaje, CIELO.alfombra, 0.3), CIELO.fondo, 0.3) },
        { r: 13.2, y: 1.7, color: mezclar(mezclar(PALETA.follajeClaro, CIELO.alfombra, 0.4), CIELO.fondo, 0.4) },
        { r: 14.9, y: 2.5, color: mezclar(mezclar(PALETA.follajeOscuro, CIELO.alfombra, 0.35), CIELO.fondo, 0.5) },
      ].map((t, i) => (
        <mesh key={i} position={[0, t.y - 0.9, -8]}>
          <cylinderGeometry args={[t.r, t.r + 1.6, 1.8, 26, 1, true, Math.PI / 2, Math.PI]} />
          <meshLambertMaterial color={t.color} flatShading side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/* La quebrada que baja entre las dos filas, con destellos que VIAJAN. */
const CAUCE = [
  new THREE.Vector3(0.4, 0.06, -11.5),
  new THREE.Vector3(-0.2, 0.05, -8),
  new THREE.Vector3(0.5, 0.04, -4.5),
  new THREE.Vector3(-0.4, 0.03, -1),
  new THREE.Vector3(0.8, 0.02, 3),
  new THREE.Vector3(2.2, 0.01, 7.5),
  new THREE.Vector3(3.4, 0.01, 11),
];
const TMP_GOTA = new THREE.Vector3();

function Quebrada({ animada }) {
  const destellos = useRef([]);
  const tramos = useMemo(() => {
    const lista = [];
    for (let i = 0; i < CAUCE.length - 1; i += 1) {
      const a = CAUCE[i];
      const b = CAUCE[i + 1];
      const medio = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      const largo = a.distanceTo(b) + 0.7;
      const rotY = Math.atan2(b.x - a.x, b.z - a.z);
      lista.push({ medio, largo, rotY });
    }
    return lista;
  }, []);

  useFrame((state) => {
    if (!animada) return;
    const t = state.clock.elapsedTime;
    destellos.current.forEach((m, i) => {
      if (!m) return;
      const k = (t * 0.07 + i / 4) % 1;
      const f = k * (CAUCE.length - 1);
      const seg = Math.min(CAUCE.length - 2, Math.floor(f));
      TMP_GOTA.lerpVectors(CAUCE[seg], CAUCE[seg + 1], f - seg);
      m.position.set(TMP_GOTA.x, TMP_GOTA.y + 0.06, TMP_GOTA.z);
      m.material.opacity = 0.85 * Math.sin(k * Math.PI);
    });
  });

  return (
    <group>
      {tramos.map((tr, i) => (
        <mesh key={i} position={tr.medio} rotation={[-Math.PI / 2, 0, -tr.rotY]}>
          <planeGeometry args={[0.9, tr.largo]} />
          <meshLambertMaterial color={PALETA.agua} emissive={PALETA.agua} emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* pozos en cada codo: cosen los tramos rectos para que el cauce sea UNO */}
      {CAUCE.map((p, i) => (
        <mesh key={`codo-${i}`} position={[p.x, p.y + 0.002, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.48, 10]} />
          <meshLambertMaterial color={PALETA.agua} emissive={PALETA.agua} emissiveIntensity={0.3} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(m) => (destellos.current[i] = m)} position={[0, 0.1, -9 + i * 4]}>
          <sphereGeometry args={[0.07, 6, 5]} />
          <meshBasicMaterial color="#eaf7ff" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      ))}
      {/* piedras de orilla a lo largo del cauce */}
      {CAUCE.slice(0, 6).map((p, i) => (
        <mesh
          key={i}
          position={[p.x + (i % 2 ? 0.7 : -0.75), 0.06, p.z + 0.8]}
          rotation={[0.2, i * 1.3, 0.1]}
          scale={[1, 0.7, 1]}
        >
          <dodecahedronGeometry args={[0.16 + azar(i) * 0.1, 0]} />
          <meshLambertMaterial color={PALETA.piedra} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Vegetación instanciada: árboles (2 especies), pasto y arbustos — pocos draw
   calls para un valle POBLADO. Matrices sembradas una vez, deterministas. */
function sembrarInstancias(ref, n, colocar) {
  if (!ref) return;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i += 1) {
    colocar(dummy, i);
    dummy.updateMatrix();
    ref.setMatrixAt(i, dummy.matrix);
  }
  ref.instanceMatrix.needsUpdate = true;
}

/* Puestos que no chocan con portales ni quebrada: anillos exteriores. */
function puestoVerde(i, radioBase) {
  const a = (azar(i * 3 + 1) - 0.5) * 2.6; // abanico frente a la cámara
  const r = radioBase + azar(i * 7 + 2) * 4;
  return [Math.sin(a) * r, -Math.cos(a) * r * 0.92];
}

function Vegetacion({ tier }) {
  const alto = tier === 'alto';
  const nArboles = alto ? 16 : 10;
  const nRedondos = alto ? 8 : 5;
  const nPasto = alto ? 90 : 48;
  const nArbustos = alto ? 22 : 12;

  const troncos = useRef(null);
  const copas = useRef(null);
  const copasRedondas = useRef(null);
  const pasto = useRef(null);
  const arbustos = useRef(null);

  useLayoutEffect(() => {
    /* árboles cónicos (pino andino / eucalipto joven) en el borde del claro */
    const puestos = Array.from({ length: nArboles }, (_, i) => {
      const [x, z] = puestoVerde(i, 12.5);
      return { x, z, s: 0.8 + azar(i * 11) * 0.9 };
    });
    sembrarInstancias(troncos.current, nArboles, (d, i) => {
      const p = puestos[i];
      d.position.set(p.x, 0.5 * p.s, p.z);
      d.scale.set(p.s, p.s, p.s);
      d.rotation.set(0, azar(i) * Math.PI, 0);
    });
    sembrarInstancias(copas.current, nArboles, (d, i) => {
      const p = puestos[i];
      d.position.set(p.x, 1.75 * p.s, p.z);
      d.scale.set(p.s, p.s, p.s);
      d.rotation.set(0, azar(i) * Math.PI, 0);
    });
    /* árboles redondos (guayabo/cítrico) más cerca, entre portales */
    sembrarInstancias(copasRedondas.current, nRedondos, (d, i) => {
      const [x, z] = puestoVerde(i + 40, 8.2);
      const s = 0.5 + azar(i * 13 + 5) * 0.5;
      d.position.set(x * 1.15, 1.05 * s, z);
      d.scale.set(s, s * 0.9, s);
    });
    /* pasto: mechones por el claro, esquivando el centro de la cámara */
    sembrarInstancias(pasto.current, nPasto, (d, i) => {
      const a = azar(i * 5 + 3) * Math.PI * 2;
      const r = 2.5 + azar(i * 9 + 4) * 9;
      const s = 0.5 + azar(i * 17) * 0.8;
      d.position.set(Math.sin(a) * r, 0.09 * s, -Math.cos(a) * r * 0.85 + 1);
      d.scale.set(s, s, s);
      d.rotation.set(0, a * 3, (azar(i) - 0.5) * 0.2);
    });
    /* arbustos bajos que arropan los umbrales */
    sembrarInstancias(arbustos.current, nArbustos, (d, i) => {
      const a = azar(i * 21 + 8) * Math.PI * 2;
      const r = 4 + azar(i * 23 + 6) * 8.5;
      const s = 0.3 + azar(i * 29) * 0.45;
      d.position.set(Math.sin(a) * r, 0.16 * s, -Math.cos(a) * r * 0.9);
      d.scale.set(s, s * 0.8, s);
    });
  }, [nArboles, nRedondos, nPasto, nArbustos]);

  return (
    <group>
      <instancedMesh ref={troncos} args={[undefined, undefined, nArboles]}>
        <cylinderGeometry args={[0.09, 0.14, 1.0, 5]} />
        <meshLambertMaterial color={PALETA.madera} flatShading />
      </instancedMesh>
      <instancedMesh ref={copas} args={[undefined, undefined, nArboles]}>
        <coneGeometry args={[0.62, 1.7, 7]} />
        <meshLambertMaterial color={PALETA.follajeOscuro} flatShading />
      </instancedMesh>
      <instancedMesh ref={copasRedondas} args={[undefined, undefined, nRedondos]}>
        <sphereGeometry args={[0.85, 8, 6]} />
        <meshLambertMaterial color={PALETA.follaje} flatShading />
      </instancedMesh>
      <instancedMesh ref={pasto} args={[undefined, undefined, nPasto]}>
        <coneGeometry args={[0.1, 0.32, 4]} />
        <meshLambertMaterial color={PALETA.follajeClaro} flatShading />
      </instancedMesh>
      <instancedMesh ref={arbustos} args={[undefined, undefined, nArbustos]}>
        <sphereGeometry args={[0.5, 7, 5]} />
        <meshLambertMaterial color={mezclar(PALETA.follaje, PALETA.follajeClaro, 0.4)} flatShading />
      </instancedMesh>
    </group>
  );
}

/* Luciérnagas doradas: el pulso biopunk amable del valle (1 draw call de
   esferitas instanciadas — redondas de verdad, nada de puntos cuadrados; el
   group entero ondula, jamás se reescriben matrices por frame). */
function Luciernagas({ tier, animada }) {
  const grupo = useRef(null);
  const cuerpos = useRef(null);
  const n = tier === 'alto' ? 20 : 10;

  useLayoutEffect(() => {
    sembrarInstancias(cuerpos.current, n, (d, i) => {
      const a = azar(i * 3 + 0.7) * Math.PI * 2;
      const r = 4 + azar(i * 5 + 1.3) * 7.5;
      const s = 0.55 + azar(i * 11 + 4.2) * 0.7;
      d.position.set(Math.sin(a) * r, 0.6 + azar(i * 7 + 2.1) * 2.6, -Math.cos(a) * r * 0.9 + 1);
      d.scale.setScalar(s);
      d.rotation.set(0, 0, 0);
    });
  }, [n]);

  useFrame((state) => {
    if (!animada || !grupo.current) return;
    const t = state.clock.elapsedTime;
    grupo.current.position.y = Math.sin(t * 0.4) * 0.25;
    grupo.current.rotation.y = Math.sin(t * 0.1) * 0.12;
  });

  return (
    <group ref={grupo}>
      <instancedMesh ref={cuerpos} args={[undefined, undefined, n]}>
        <sphereGeometry args={[0.05, 6, 5]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.9} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

/* Hongos ámbar al pie de los umbrales — la firma biopunk que respira. */
function HongosAmbar({ animada }) {
  const gorros = useRef([]);
  useFrame((state) => {
    if (!animada) return;
    const t = state.clock.elapsedTime;
    gorros.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = 0.5 + Math.sin(t * 1.4 + i * 2.2) * 0.25;
    });
  });
  const puestos = [
    [-4.2, -3.9], [4.5, -3.6], [-1.6, -5.6], [2, -5.8], [-6.8, -1.9],
  ];
  return (
    <group>
      {puestos.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]} scale={[1, 1, 1]}>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.03, 0.045, 0.18, 5]} />
            <meshLambertMaterial color={PALETA.cal} flatShading />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <coneGeometry args={[0.11, 0.12, 7]} />
            <meshLambertMaterial
              ref={(m) => (gorros.current[i] = m)}
              color={PALETA.ambar}
              emissive={PALETA.ambar}
              emissiveIntensity={0.5}
              flatShading
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   GALERÍA — el valle completo con las dos terrazas de portales
   ══════════════════════════════════════════════════════════════════════════ */

function GaleriaVitrina({ elegidoId, interactivo, tier, reducedMotion, onElegir, onSenalar }) {
  const animada = !reducedMotion;
  return (
    <group>
      <color attach="background" args={[CIELO.fondo]} />
      <fog attach="fog" args={[CIELO.niebla, 17, 46]} />
      <hemisphereLight args={[CIELO.cielo, CIELO.suelo, 0.95 * CIELO.intensidad]} />
      <directionalLight position={[7, 8, -6]} intensity={1.15} color={ATMOSFERA.luz} />
      {/* relleno frontal generoso: las caras que miran a la cámara (terrazas,
          gargantas) no pueden caer a negro bajo el sol de atrás */}
      <directionalLight position={[-5, 4, 10]} intensity={0.5} color={ATMOSFERA.relleno} />

      {/* el cielo de la tarde: sol bajo + nubes lentas */}
      <CieloDorado />

      {/* alfombra del claro — verde vivo, no plano: dos tonos */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[30, 32]} />
        <meshLambertMaterial color={mezclar(CIELO.alfombra, PALETA.follaje, 0.45)} flatShading />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 2]}>
        <circleGeometry args={[7.5, 22]} />
        <meshLambertMaterial color={mezclar(CIELO.alfombra, PALETA.follajeClaro, 0.35)} flatShading />
      </mesh>

      {/* la profundidad del valle: cordilleras + terrazas sembradas */}
      <Cordilleras />
      <Terrazas />

      {/* la quebrada viva bajando entre las filas */}
      <Quebrada animada={animada} />

      {/* la vida del claro */}
      <Vegetacion tier={tier} />
      <Luciernagas tier={tier} animada={animada} />
      <HongosAmbar animada={animada} />

      {/* los doce portales en sus terrazas */}
      {PORTALES.map((p) => (
        <group key={p.id}>
          {/* el asiento: lomita para la fila de atrás, umbral para la del frente */}
          {p.atras ? (
            <mesh position={[p.pos[0], p.pos[1] - 2.2, p.pos[2]]} scale={[1.25, 0.72, 1.1]}>
              <sphereGeometry args={[1.7, 10, 8]} />
              <meshLambertMaterial color={mezclar(PALETA.follaje, CIELO.alfombra, 0.3)} flatShading />
            </mesh>
          ) : (
            <mesh position={[p.pos[0], 0.03, p.pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[1.35, 14]} />
              <meshLambertMaterial color={PALETA.tierraClara} flatShading />
            </mesh>
          )}
          <PortalMundo
            portal={p}
            elegido={elegidoId === p.id}
            interactivo={interactivo}
            animada={animada}
            onElegir={onElegir}
            onSenalar={onSenalar}
          />
        </group>
      ))}
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CSS del mockup (constante de módulo, patrón JuegoMiFincaOdyssey)
   ══════════════════════════════════════════════════════════════════════════ */
const CSS_VMX = `
.vmx-raiz {
  position: relative;
  width: 100%;
  height: 100dvh;
  min-height: 480px;
  overflow: hidden;
  background: ${CIELO.fondo};
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: #3a2a18;
}
.vmx-canvas {
  position: absolute !important;
  inset: 0;
  opacity: 0;
  transition: opacity 480ms ease;
}
.vmx-canvas--lista { opacity: 1; }

/* ── chrome de la galería ── */
.vmx-chrome {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 18px 20px calc(16px + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
  transition: opacity 700ms ease;
}
.vmx-raiz[data-fase='acercando'] .vmx-chrome,
.vmx-raiz[data-viaje='1'] .vmx-chrome { opacity: 0; }
.vmx-titulo {
  margin: 0;
  font-size: clamp(1.3rem, 3.5vw, 2rem);
  font-weight: 800;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 0 rgba(255,244,214,0.6);
}
.vmx-titulo small {
  display: block;
  font-size: 0.58em;
  font-weight: 600;
  opacity: 0.78;
  margin-top: 2px;
}
.vmx-cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.vmx-abeja { flex: 0 0 auto; filter: drop-shadow(0 3px 4px rgba(58,42,24,0.25)); transition: opacity 150ms ease; }
/* mientras Angelita cruza, su puesto del chrome queda vacío al instante */
.vmx-raiz[data-fase='acercando'] .vmx-abeja,
.vmx-raiz[data-viaje='1'] .vmx-abeja { opacity: 0; }

/* ── Angelita ENTRA al mundo COMO SUPERHÉROE (pedido del operador) ──
   Tres actos en el pulso del viaje (1.25 s), puro CSS rubber-hose:
   1. ANTICIPACIÓN: toma vuelo — se eleva y se infla un instante (overshoot).
   2. DASH: se lanza al centro (donde el dolly deja la boca del portal)
      ESTIRADA en la dirección del vuelo (squash&stretch) con estela dorada.
   3. IMPACTO: se clava y desaparece; la onda .vmx-pum hace el ping de
      superhéroe justo cuando toca la boca. */
.vmx-abeja-cruce {
  position: absolute;
  top: 18px;
  right: 20px;
  z-index: 30;
  pointer-events: none;
  filter: drop-shadow(0 3px 4px rgba(58, 42, 24, 0.3));
  animation: vmx-vuelo-heroe 1250ms cubic-bezier(0.6, -0.1, 0.75, 0.45) forwards;
}
@keyframes vmx-vuelo-heroe {
  0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
  14% { transform: translate(8px, -30px) scale(1.28) rotate(16deg); opacity: 1; }
  28% { transform: translate(12px, -34px) scale(1.15, 0.88) rotate(-32deg); opacity: 1; }
  82% { transform: translate(calc(-50vw + 64px), calc(50dvh - 60px)) scale(1.55, 0.5) rotate(-38deg); opacity: 1; }
  100% { transform: translate(calc(-50vw + 52px), calc(50dvh - 48px)) scale(0.04) rotate(-46deg); opacity: 0; }
}
/* la estela del dash: ráfaga dorada que nace detrás de la abeja */
.vmx-abeja-cruce::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 55%;
  width: 120px;
  height: 12px;
  border-radius: 999px;
  transform-origin: left center;
  transform: translateY(-50%) rotate(-6deg);
  background: linear-gradient(90deg, rgba(255, 210, 122, 0.95), rgba(255, 210, 122, 0));
  opacity: 0;
  animation: vmx-estela 1250ms linear forwards;
}
@keyframes vmx-estela {
  0%, 30% { opacity: 0; }
  45% { opacity: 0.95; }
  80% { opacity: 0.7; }
  100% { opacity: 0; }
}
/* la onda de impacto: el PING en la boca del portal cuando Angelita se clava */
.vmx-pum {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 90px;
  height: 90px;
  margin: -45px 0 0 -45px;
  z-index: 29;
  pointer-events: none;
  border: 4px solid rgba(255, 210, 122, 0.95);
  border-radius: 50%;
  box-shadow: 0 0 22px rgba(255, 210, 122, 0.8), inset 0 0 14px rgba(255, 210, 122, 0.5);
  opacity: 0;
  animation: vmx-pum 480ms 1020ms cubic-bezier(0.2, 0.7, 0.4, 1) both;
}
@keyframes vmx-pum {
  0% { transform: scale(0.15); opacity: 1; }
  100% { transform: scale(2.6); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .vmx-abeja-cruce, .vmx-pum { display: none; }
}

.vmx-pie { display: flex; flex-direction: column; gap: 10px; }
.vmx-senal {
  align-self: center;
  margin: 0;
  background: rgba(255, 249, 235, 0.92);
  border: 1.5px solid rgba(122, 90, 56, 0.35);
  border-radius: 999px;
  padding: 6px 16px;
  font-size: 0.9rem;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(58, 42, 24, 0.16);
}
.vmx-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 2px 6px;
  pointer-events: auto;
  scrollbar-width: thin;
}
.vmx-chip {
  appearance: none;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1.5px solid rgba(122, 90, 56, 0.35);
  border-radius: 999px;
  background: rgba(255, 249, 235, 0.9);
  color: #3a2a18;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 8px 14px;
  cursor: pointer;
  transition: transform 120ms ease, background 200ms ease;
}
.vmx-chip:hover, .vmx-chip:focus-visible { background: #fff8ea; transform: translateY(-2px); }
.vmx-chip:active { transform: translateY(0); }

/* viñeta de succión durante el dolly */
.vmx-vineta {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 1100ms ease-in;
  background: radial-gradient(circle at 50% 50%, transparent 34%, rgba(44, 32, 19, 0.55) 78%, rgba(30, 21, 12, 0.9) 100%);
}
.vmx-raiz[data-fase='acercando'] .vmx-vineta { opacity: 1; }

/* ── el mundo montado + volver ── */
.vmx-mundo { position: absolute; inset: 0; }
.vmx-telon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #fff8ea;
  font-weight: 700;
}
.vmx-telon span { font-size: 2rem; }
.vmx-volver {
  position: absolute;
  top: 14px;
  right: 16px;
  z-index: 40;
  appearance: none;
  border: 1.5px solid rgba(122, 90, 56, 0.4);
  border-radius: 999px;
  background: rgba(255, 249, 235, 0.9);
  color: #5a4326;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 8px 16px;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(58, 42, 24, 0.2);
}
.vmx-volver:active { transform: translateY(1px); }

/* ── rejilla gemela para tier bajo (el ritual sin WebGL) ──
   Cada tarjeta lleva su VIÑETA CSS: el aro lleno con el cielo del mundo y el
   emoji flotando — la misma promesa de la ventana viva, en barato. */
.vmx-rejilla {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  padding: 96px 16px calc(20px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(${CIELO.cielo} 0%, ${CIELO.fondo} 55%, ${mezclar(CIELO.fondo, PALETA.tierraClara, 0.3)} 100%);
}
.vmx-tarjeta {
  appearance: none;
  border: none;
  border-radius: 18px;
  padding: 18px 12px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 0.95rem;
  color: #fff8ea;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(58, 42, 24, 0.22);
  transition: transform 140ms ease;
}
.vmx-tarjeta:hover, .vmx-tarjeta:focus-visible { transform: translateY(-3px); }
.vmx-tarjeta__aro {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  border: 7px solid ${PALETA.piedra};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.3rem;
  overflow: hidden;
  box-shadow: inset 0 -14px 18px rgba(30, 21, 12, 0.35);
}
.vmx-tarjeta__aro span { animation: vmx-flotar 2.8s ease-in-out infinite; }
@keyframes vmx-flotar {
  0%, 100% { transform: translateY(2px); }
  50% { transform: translateY(-3px); }
}
@media (prefers-reduced-motion: reduce) {
  .vmx-canvas { transition: none; }
  .vmx-chip, .vmx-tarjeta { transition: none; }
  .vmx-tarjeta__aro span { animation: none; }
}
`;

/* ══════════════════════════════════════════════════════════════════════════
   EL MOCKUP — la máquina de fases del cruce maestro
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * VitrinaMaestraMundos — galería de portales con el cruce túnel/Odyssey hacia
 * TODOS los mundos 3D de Chagra.
 *
 * Fases (`fase`): galeria → acercando (dolly+FOV) → mundo → saliendo → galeria.
 * El `viaje` ('entrar'|'salir'|null) enciende el IRIS del kit; el swap de
 * escena ocurre SIEMPRE en su `onMitad`, debajo del velo — máx un Canvas vivo.
 *
 * @param {object} props
 * @param {() => void} [props.onBack] vuelve al host (botón discreto).
 */
export default function VitrinaMaestraMundos({ onBack }) {
  const [{ tier, reducedMotion }] = useState(() => decidirTier());
  const [fase, setFase] = useState('galeria');
  const [viaje, setViaje] = useState(null); // null | 'entrar' | 'salir'
  const [mundoId, setMundoId] = useState(null);
  const [senalado, setSenalado] = useState(null);
  const [listo, setListo] = useState(false);

  const sinCanvas = !permite3D(tier);
  const portal = mundoId ? PORTAL_POR_ID[mundoId] : null;

  const elegir = useCallback(
    (id) => {
      setMundoId(id);
      setSenalado(null);
      IMPORTADORES[id]?.(); // precalentar el chunk: el dolly esconde la carga
      if (sinCanvas || reducedMotion) setViaje('entrar');
      else setFase('acercando');
    },
    [sinCanvas, reducedMotion],
  );

  const volver = useCallback(() => {
    setViaje('salir');
  }, []);

  /* llegó el dolly: a la boca → iris; de vuelta a la órbita → galería. */
  const alLlegarCamara = useCallback((faseViaje) => {
    if (faseViaje === 'acercando') setViaje('entrar');
    else if (faseViaje === 'saliendo') {
      setFase('galeria');
      setMundoId(null);
    }
  }, []);

  /* el contrato del iris: el SWAP pasa en la mitad, bajo el velo. */
  const alMitadIris = useCallback(() => {
    if (viaje === 'entrar') {
      setFase('mundo');
    } else if (viaje === 'salir') {
      if (sinCanvas || reducedMotion) {
        setFase('galeria');
        setMundoId(null);
      } else {
        setListo(false); // el Canvas remonta y vuelve a fundirse
        setFase('saliendo');
      }
    }
  }, [viaje, sinCanvas, reducedMotion]);

  const alFinIris = useCallback(() => setViaje(null), []);

  const alCrear = useCallback(() => setListo(true), []);
  const senalar = useCallback((id) => setSenalado(id), []);

  const con3D = !sinCanvas && fase !== 'mundo';
  const enGaleria = fase === 'galeria' && !viaje;
  const MundoElegido = mundoId ? COMPONENTES[mundoId] : null;
  const defSenalado = senalado ? PORTAL_POR_ID[senalado] : null;

  return (
    <section
      className="vmx-raiz"
      data-fase={fase}
      data-viaje={viaje ? '1' : '0'}
      data-tier={tier}
      aria-label="Vitrina maestra: un valle andino de portales lleva a cada mundo 3D de la finca con un viaje de túnel"
    >
      <style>{CSS_VMX}</style>

      {con3D && (
        <Canvas
          className={`vmx-canvas${listo ? ' vmx-canvas--lista' : ''}`}
          dpr={tier === 'alto' ? [1, 1.5] : [1, 1.25]}
          gl={{ antialias: tier === 'alto', powerPreference: 'high-performance' }}
          camera={{ position: POSE_GALERIA.pos.toArray(), fov: POSE_GALERIA.fov }}
          frameloop={reducedMotion && enGaleria ? 'demand' : 'always'}
          onCreated={alCrear}
        >
          <CamaraVitrina
            fase={fase}
            boca={portal?.boca ?? null}
            reducedMotion={reducedMotion}
            onLlegada={alLlegarCamara}
          />
          <GaleriaVitrina
            elegidoId={mundoId}
            interactivo={enGaleria}
            tier={tier}
            reducedMotion={reducedMotion}
            onElegir={elegir}
            onSenalar={senalar}
          />
        </Canvas>
      )}

      {/* gemela sin WebGL: la rejilla de tarjetas-portal (tier bajo) */}
      {sinCanvas && fase !== 'mundo' && (
        <div className="vmx-rejilla" role="list" aria-label="Los mundos de la finca">
          {PORTALES.map((p) => (
            <button
              key={p.id}
              type="button"
              role="listitem"
              className="vmx-tarjeta"
              style={{ background: `linear-gradient(160deg, ${p.colorA} 0%, ${p.colorB} 100%)` }}
              onClick={() => elegir(p.id)}
            >
              <span
                className="vmx-tarjeta__aro"
                aria-hidden="true"
                style={{ background: `radial-gradient(circle at 50% 30%, ${p.colorA} 0%, ${p.colorB} 85%)` }}
              >
                <span>{p.emoji}</span>
              </span>
              {p.titulo}
            </button>
          ))}
        </div>
      )}

      {fase !== 'mundo' && (
        <div className="vmx-chrome">
          <div className="vmx-cabecera">
            <h2 className="vmx-titulo">
              La vitrina de los mundos
              <small>Toque un portal: el túnel lo lleva y lo trae</small>
            </h2>
            <div className="vmx-abeja">
              <AbejaAngelita size={60} animo="sereno" energia={1} animated={!reducedMotion} tier={tier} />
            </div>
          </div>
          <div className="vmx-pie">
            {defSenalado && (
              <p className="vmx-senal" role="status">
                {defSenalado.emoji} {defSenalado.titulo} — toque para entrar
              </p>
            )}
            {!sinCanvas && (
              <div className="vmx-chips" role="list" aria-label="Entrar a un mundo">
                {PORTALES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="listitem"
                    className="vmx-chip"
                    onClick={() => elegir(p.id)}
                    disabled={!enGaleria}
                  >
                    <span aria-hidden="true">{p.emoji}</span>
                    {p.titulo}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {onBack && enGaleria && (
        <button type="button" className="vmx-volver" onClick={onBack}>
          Volver
        </button>
      )}

      {/* Angelita entra al mundo como superhéroe: anticipación + dash con
          estela + onda de impacto en la boca del portal (el dolly la deja
          justo ahí). En tier bajo también vuela — el iris la alcanza. */}
      {!reducedMotion && fase !== 'mundo' && (fase === 'acercando' || viaje === 'entrar') && (
        <>
          <div className="vmx-abeja-cruce" aria-hidden="true">
            <AbejaAngelita size={60} animo="atento" energia={1} animated tier={tier} />
          </div>
          <div className="vmx-pum" aria-hidden="true" />
        </>
      )}

      <div className="vmx-vineta" aria-hidden="true" />

      {/* el mundo real, montado solo cuando el Canvas de la vitrina ya no vive */}
      {fase === 'mundo' && MundoElegido && portal && (
        <div className="vmx-mundo">
          <Suspense
            fallback={
              <div
                className="vmx-telon"
                style={{ background: `linear-gradient(160deg, ${portal.colorB} 0%, ${mezclar(portal.colorB, portal.colorA, 0.35)} 100%)` }}
              >
                <span aria-hidden="true">{portal.emoji}</span>
                Entrando a {portal.titulo.toLowerCase()}…
              </div>
            }
          >
            {mundoId === 'sierra' ? (
              <MundoElegido tier={tier} reducedMotion={reducedMotion} />
            ) : (
              <MundoElegido onBack={volver} />
            )}
          </Suspense>
          {!viaje && (
            <button type="button" className="vmx-volver" onClick={volver}>
              Volver a la vitrina
            </button>
          )}
        </div>
      )}

      {/* EL IRIS del cruce: overlay del kit; swap SIEMPRE en onMitad */}
      <TransicionMundoKit
        variante="iris"
        activa={viaje != null}
        direccion={viaje === 'salir' ? 'salir' : 'entrar'}
        tier={tier}
        reducedMotion={reducedMotion}
        colorA={portal?.colorA ?? '#f2c063'}
        colorB={portal?.colorB ?? '#1d4030'}
        onMitad={alMitadIris}
        onFin={alFinIris}
      />
    </section>
  );
}
