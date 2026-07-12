/*
 * VitrinaMaestraMundos — la PUERTA MAESTRA a todos los mundos 3D de Chagra.
 *
 * EL NORTE (DR mario-2d-3d + JuegoMiFincaOdyssey): el cruce entre mundos no es
 * un cambio de pantalla, es un VIAJE. Esta vitrina es una galería andina de
 * doce portales de piedra — cada uno guarda un mundo (valle, café, sanidad,
 * mercado, animales, semillero, compost, agua, páramo, suelo vivo, lluvia,
 * Sierra). Al tocar un portal la cámara hace el viaje Odyssey: dolly hacia la
 * boca con el FOV estrechándose 46→15 en curva k² (succión de túnel — la
 * perspectiva se aplana sola hacia una casi-ortográfica) y el IRIS del kit de
 * transiciones cubre la pantalla; DEBAJO del velo se intercambia la escena
 * (el Canvas de la vitrina se desmonta y el mundo real se monta) y el iris
 * reabre ya adentro. Al volver, el reverso: iris cierra sobre el mundo, swap
 * bajo el velo, y la cámara retrocede de la boca del portal ensanchando el
 * FOV con curva √k (bocanada de aire). Nunca hay corte seco.
 *
 * MÁXIMO UN CANVAS VIVO: la galería muestra MINIATURAS low-poly (un motivo
 * emblemático por mundo dentro de su aro), no las escenas reales. El mundo
 * real se monta por lazy import SOLO al cruzar, cuando el Canvas de la
 * vitrina ya se desmontó bajo el iris (contrato onMitad de TransicionMundoKit).
 *
 * TÉCNICA / GAMA BAJA (DR §2, §4, §5):
 *  - Iris: overlay DOM/CSS del kit existente (el portal más barato; timers
 *    deterministas, jamás animationend).
 *  - 3D: MeshLambert + flatShading, sin sombras ni post; dpr por tier;
 *    tier 'bajo' NI monta el Canvas: una rejilla DOM de tarjetas-portal
 *    conserva el ritual del cruce (gemelo 2D digno del DR).
 *  - Lazy import por mundo, precalentado al elegir (el dolly de 1.25 s
 *    esconde la carga del chunk).
 *  - prefers-reduced-motion: sin dolly; el kit colapsa a corte suave.
 *
 * DIRECCIÓN DE ARTE: atmosferaMadre (cielo `huerta` mezclado a la hora
 * dorada, la misma ley de EscenaBase3D) + los aros de piedra del túnel de
 * JuegoMiFincaOdyssey, en terrazas de ladera como se siembra en los Andes.
 *
 * Mockup standalone con su propio <Canvas>. NO toca App.jsx ni mundoData.
 */
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
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

/* La fila de ADELANTE (los mundos del diario) y la de ATRÁS en su terraza
   (tierra, cielo y montaña). El orden ES el arco, de izquierda a derecha. */
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
   CÁMARA — el viaje Odyssey de la vitrina
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
   MINIATURAS — un motivo low-poly emblemático por mundo (2–6 mallas)
   ══════════════════════════════════════════════════════════════════════════ */

function MotivoMundo({ motivo }) {
  switch (motivo) {
    case 'valle':
      return (
        <group>
          <mesh position={[0, -0.18, 0]} scale={[1.3, 0.5, 0.9]}>
            <sphereGeometry args={[0.42, 10, 8]} />
            <meshLambertMaterial color={PALETA.follaje} flatShading />
          </mesh>
          <mesh position={[0.02, 0.16, 0.1]}>
            <boxGeometry args={[0.26, 0.18, 0.2]} />
            <meshLambertMaterial color={PALETA.cal} flatShading />
          </mesh>
          <mesh position={[0.02, 0.31, 0.1]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.21, 0.14, 4]} />
            <meshLambertMaterial color="#a55e3a" flatShading />
          </mesh>
          <mesh position={[-0.34, 0.18, -0.02]}>
            <coneGeometry args={[0.12, 0.3, 6]} />
            <meshLambertMaterial color={PALETA.follajeOscuro} flatShading />
          </mesh>
        </group>
      );
    case 'cafe':
      return (
        <group>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.035, 0.05, 0.34, 5]} />
            <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <sphereGeometry args={[0.3, 8, 6]} />
            <meshLambertMaterial color={PALETA.follajeOscuro} flatShading />
          </mesh>
          {[[-0.16, 0.06], [0.05, -0.04], [0.2, 0.12]].map(([x, y]) => (
            <mesh key={`${x}`} position={[x, y + 0.1, 0.26]}>
              <sphereGeometry args={[0.05, 6, 5]} />
              <meshLambertMaterial color="#b8352f" flatShading />
            </mesh>
          ))}
        </group>
      );
    case 'agua':
      return (
        <group>
          <mesh position={[0, -0.26, 0.05]} rotation={[-Math.PI / 2.4, 0, 0.3]}>
            <planeGeometry args={[0.7, 0.32]} />
            <meshLambertMaterial color={PALETA.agua} flatShading side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <sphereGeometry args={[0.2, 8, 7]} />
            <meshLambertMaterial color={PALETA.agua} flatShading />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <coneGeometry args={[0.14, 0.3, 7]} />
            <meshLambertMaterial color={PALETA.agua} flatShading />
          </mesh>
        </group>
      );
    case 'sanidad':
      return (
        <group>
          <mesh position={[-0.14, -0.1, 0]}>
            <coneGeometry args={[0.2, 0.45, 6]} />
            <meshLambertMaterial color={PALETA.follaje} flatShading />
          </mesh>
          <mesh position={[0.24, -0.16, 0.05]}>
            <cylinderGeometry args={[0.015, 0.015, 0.4, 4]} />
            <meshLambertMaterial color={PALETA.madera} flatShading />
          </mesh>
          <mesh position={[0.24, 0.12, 0.05]}>
            <planeGeometry args={[0.2, 0.16]} />
            <meshLambertMaterial color="#f2c531" flatShading side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[-0.1, 0.2, 0.12]}>
            <sphereGeometry args={[0.06, 6, 5]} />
            <meshLambertMaterial color="#b8352f" flatShading />
          </mesh>
        </group>
      );
    case 'mercado':
      return (
        <group>
          {[-0.22, 0.22].map((x) => (
            <mesh key={x} position={[x, -0.08, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.44, 4]} />
              <meshLambertMaterial color={PALETA.madera} flatShading />
            </mesh>
          ))}
          <mesh position={[0, 0.22, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.4, 0.2, 4]} />
            <meshLambertMaterial color="#c96a2f" flatShading />
          </mesh>
          <mesh position={[0, -0.24, 0.14]}>
            <cylinderGeometry args={[0.12, 0.09, 0.14, 7]} />
            <meshLambertMaterial color={PALETA.maderaClara} flatShading />
          </mesh>
          <mesh position={[0, -0.15, 0.14]}>
            <sphereGeometry args={[0.07, 6, 5]} />
            <meshLambertMaterial color="#b8352f" flatShading />
          </mesh>
        </group>
      );
    case 'animales':
      return (
        <group>
          <mesh position={[0, -0.12, 0]} scale={[1, 0.85, 1.2]}>
            <sphereGeometry args={[0.2, 8, 6]} />
            <meshLambertMaterial color={PALETA.cal} flatShading />
          </mesh>
          <mesh position={[0.02, 0.1, 0.14]}>
            <sphereGeometry args={[0.1, 7, 6]} />
            <meshLambertMaterial color={PALETA.cal} flatShading />
          </mesh>
          <mesh position={[0.02, 0.1, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.03, 0.08, 4]} />
            <meshLambertMaterial color={PALETA.ambar} flatShading />
          </mesh>
          <mesh position={[0.02, 0.21, 0.13]}>
            <sphereGeometry args={[0.035, 5, 4]} />
            <meshLambertMaterial color="#b8352f" flatShading />
          </mesh>
          {[-0.3, 0.34].map((x) => (
            <mesh key={x} position={[x, -0.2, -0.12]}>
              <boxGeometry args={[0.04, 0.36, 0.04]} />
              <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
            </mesh>
          ))}
        </group>
      );
    case 'semillero':
      return (
        <group>
          <mesh position={[0, -0.2, 0]}>
            <boxGeometry args={[0.56, 0.1, 0.36]} />
            <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
          </mesh>
          {[-0.16, 0, 0.16].map((x) => (
            <mesh key={x} position={[x, -0.06, 0]}>
              <coneGeometry args={[0.05, 0.18, 5]} />
              <meshLambertMaterial color={PALETA.follajeClaro} flatShading />
            </mesh>
          ))}
          <mesh position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.3, 0.02, 5, 10, Math.PI]} />
            <meshLambertMaterial color={PALETA.cal} flatShading />
          </mesh>
        </group>
      );
    case 'suelo':
      return (
        <group>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.62, 0.08, 0.34]} />
            <meshLambertMaterial color={PALETA.follaje} flatShading />
          </mesh>
          <mesh position={[0, -0.14, 0]}>
            <boxGeometry args={[0.62, 0.36, 0.34]} />
            <meshLambertMaterial color={PALETA.tierra} flatShading />
          </mesh>
          {[-0.12, 0, 0.12].map((x, i) => (
            <mesh key={x} position={[x, -0.14 + (i % 2 ? 0.05 : -0.02), 0.19]}>
              <sphereGeometry args={[0.05, 6, 5]} />
              <meshLambertMaterial color="#c96f8f" flatShading />
            </mesh>
          ))}
        </group>
      );
    case 'sierra':
      return (
        <group>
          <mesh position={[0, -0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.44, 10]} />
            <meshLambertMaterial color={PALETA.agua} flatShading />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <coneGeometry args={[0.36, 0.6, 7]} />
            <meshLambertMaterial color={PALETA.follajeOscuro} flatShading />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <coneGeometry args={[0.13, 0.18, 7]} />
            <meshLambertMaterial color="#f2efe4" flatShading />
          </mesh>
        </group>
      );
    case 'paramo':
      return (
        <group>
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 0.32, 6]} />
            <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh
              key={i}
              position={[Math.sin((i / 6) * Math.PI * 2) * 0.12, 0.06, Math.cos((i / 6) * Math.PI * 2) * 0.12]}
              rotation={[Math.PI / 3.2, (i / 6) * Math.PI * 2, 0]}
            >
              <coneGeometry args={[0.05, 0.26, 4]} />
              <meshLambertMaterial color="#b8c46a" flatShading />
            </mesh>
          ))}
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.08, 6, 5]} />
            <meshLambertMaterial color="#d9c95a" flatShading />
          </mesh>
        </group>
      );
    case 'lluvia':
      return (
        <group>
          {[[-0.16, 0, 0.16], [0.14, 0.06, 0.18], [0.02, 0.1, 0.2]].map(([x, y, r]) => (
            <mesh key={`${x}-${y}`} position={[x, 0.16 + y, 0]}>
              <sphereGeometry args={[r, 7, 6]} />
              <meshLambertMaterial color="#c9d2dc" flatShading />
            </mesh>
          ))}
          {[-0.18, -0.02, 0.15].map((x, i) => (
            <mesh key={x} position={[x, -0.14 - (i % 2) * 0.1, 0.04]}>
              <sphereGeometry args={[0.035, 5, 4]} />
              <meshLambertMaterial color={PALETA.agua} flatShading />
            </mesh>
          ))}
        </group>
      );
    case 'compost':
    default:
      return (
        <group>
          <mesh position={[0, -0.18, 0]}>
            <coneGeometry args={[0.34, 0.28, 8]} />
            <meshLambertMaterial color={PALETA.tierra} flatShading />
          </mesh>
          <mesh position={[0, 0.0, 0]}>
            <coneGeometry args={[0.24, 0.24, 8]} />
            <meshLambertMaterial color="#5a6a2e" flatShading />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <coneGeometry args={[0.13, 0.16, 7]} />
            <meshLambertMaterial color="#8a6a3a" flatShading />
          </mesh>
        </group>
      );
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   PORTAL — aro de piedra + garganta + disco que respira + miniatura
   ══════════════════════════════════════════════════════════════════════════ */

function PortalMundo({ portal, elegido, interactivo, onElegir, onSenalar }) {
  const discoRef = useRef(null);

  /* El disco respira ámbar-tinte; si es el elegido, se enciende (la promesa). */
  useFrame((state) => {
    const disco = discoRef.current;
    if (!disco) return;
    const t = state.clock.elapsedTime;
    const base = elegido ? 1.5 : 0.5;
    disco.emissiveIntensity = base + Math.sin(t * 2.1 + portal.rotY * 3) * 0.16;
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
      {/* garganta hacia adentro de la loma */}
      <mesh position={[0, 0, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.76, 0.76, 1.0, 14, 1, true]} />
        <meshLambertMaterial color={ATMOSFERA.sombra} side={THREE.BackSide} />
      </mesh>
      {/* el disco del portal: lo que se toca para entrar */}
      <mesh position={[0, 0, -0.32]} onClick={alTocar} onPointerOver={manito} onPointerOut={normal}>
        <circleGeometry args={[0.74, 22]} />
        <meshLambertMaterial
          ref={discoRef}
          color={mezclar(portal.colorA, ATMOSFERA.sombra, 0.5)}
          emissive={portal.colorA}
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* la miniatura del mundo, flotando en la boca */}
      <group position={[0, -0.08, 0.22]} scale={[0.62, 0.62, 0.62]}>
        <MotivoMundo motivo={portal.motivo} />
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
   GALERÍA — la ladera con las dos terrazas de portales
   ══════════════════════════════════════════════════════════════════════════ */

function GaleriaVitrina({ elegidoId, interactivo, onElegir, onSenalar }) {
  return (
    <group>
      <color attach="background" args={[CIELO.fondo]} />
      <fog attach="fog" args={[CIELO.niebla, 16, 38]} />
      <hemisphereLight args={[CIELO.cielo, CIELO.suelo, 0.95 * CIELO.intensidad]} />
      <directionalLight position={[6, 9, 5]} intensity={1.05} color={ATMOSFERA.luz} />
      <directionalLight position={[-5, 4, -3]} intensity={0.22} color={ATMOSFERA.relleno} />

      {/* alfombra del claro */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[20, 28]} />
        <meshLambertMaterial color={CIELO.alfombra} flatShading />
      </mesh>

      {/* lomas de fondo que cierran la galería */}
      <mesh position={[-9, -1.6, -14]} scale={[1.8, 1, 1.3]}>
        <sphereGeometry args={[5.2, 12, 9]} />
        <meshLambertMaterial color={mezclar(PALETA.follajeOscuro, CIELO.fondo, 0.4)} flatShading />
      </mesh>
      <mesh position={[9.5, -1.8, -14.5]} scale={[1.9, 1, 1.3]}>
        <sphereGeometry args={[5.4, 12, 9]} />
        <meshLambertMaterial color={mezclar(PALETA.follaje, CIELO.fondo, 0.5)} flatShading />
      </mesh>
      <mesh position={[0, -2.2, -17]} scale={[2.4, 1, 1.4]}>
        <sphereGeometry args={[5.8, 12, 9]} />
        <meshLambertMaterial color={mezclar(PALETA.follajeOscuro, CIELO.fondo, 0.55)} flatShading />
      </mesh>

      {/* los doce portales en sus terrazas */}
      {PORTALES.map((p) => (
        <group key={p.id}>
          {/* el asiento: lomita para la fila de atrás, umbral para la del frente */}
          {p.atras ? (
            <mesh position={[p.pos[0], p.pos[1] - 2.2, p.pos[2]]} scale={[1.25, 0.72, 1.1]}>
              <sphereGeometry args={[1.7, 10, 8]} />
              <meshLambertMaterial color={mezclar(PALETA.follajeOscuro, CIELO.alfombra, 0.35)} flatShading />
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
.vmx-abeja { flex: 0 0 auto; filter: drop-shadow(0 3px 4px rgba(58,42,24,0.25)); }

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

/* ── rejilla gemela para tier bajo (el ritual sin WebGL) ── */
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
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 8px solid ${PALETA.piedra};
  background: #2c2013;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
}
@media (prefers-reduced-motion: reduce) {
  .vmx-canvas { transition: none; }
  .vmx-chip, .vmx-tarjeta { transition: none; }
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
      aria-label="Vitrina maestra: una galería de portales lleva a cada mundo 3D de la finca con un viaje de túnel"
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
              <span className="vmx-tarjeta__aro" aria-hidden="true">{p.emoji}</span>
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
