/*
 * JuegoMiFincaOdyssey — «Mi Finca»: el mini-juego 2D con el CRUCE ODYSSEY.
 *
 * EL NORTE (DR mario-2d-3d): en Odyssey se entra por una tubería y el juego
 * pasa de 3D a un plano 2D clásico — mágico, nostálgico. Aquí la finca 3D
 * guarda un TÚNEL en la loma; al tocarlo la cámara hace el viaje (dolly hacia
 * la boca + FOV que se estrecha 46→15: la perspectiva se "aplana" sola hacia
 * una casi-ortográfica) y un IRIS circular (clip-path DOM, barato) revela el
 * plano 2D jugable. Al salir, el iris se cierra sobre el 3D y la cámara
 * retrocede ensanchando el FOV. El swap de escena ocurre SIEMPRE debajo del
 * iris: nunca hay corte seco.
 *
 * EL PLANO 2D (side-scroll amable, sin violencia): el campesino camina por la
 * finca con Angelita de guía. Cuatro cuidados reales de agroecología:
 *   riego al pie · asocio de las tres hermanas · observar la aliada
 *   (mariquita, control biológico) · cosecha selectiva del fruto maduro.
 * Sin puntos, sin vidas, sin timers: el progreso es sobrio («Cuidados: n de 4»)
 * y el túnel de vuelta está abierto SIEMPRE (curva amable, anti-gamificación).
 *
 * TÉCNICA / GAMA BAJA (DR §2, §4, §5):
 *  - El 2D es DOM+SVG puro (cero WebGL): en modo juego el <Canvas> se
 *    desmonta — batería y memoria libres en gama baja.
 *  - El iris es `clip-path: circle()` con keyframes CSS: el portal más barato
 *    que existe (ni stencil ni render-target).
 *  - 3D: MeshLambert + flatShading, sin sombras ni post; dpr por tier;
 *    tier 'bajo' NI monta el Canvas: una portada DOM conserva el ritual del
 *    túnel (gemelo 2D del DR).
 *  - Ruido determinista: layout por `crearRng` sembrado a nivel de módulo;
 *    nada de Math.random en render.
 *  - prefers-reduced-motion: swap directo sin dolly ni iris.
 *
 * DIRECCIÓN DE ARTE: atmosferaMadre (la MISMA ley de EscenaBase3D: cielo
 * `huerta` mezclado hacia la hora dorada) + rubber-hose andino (Angelita,
 * MariquitaRubber, LombrizRubber, campesino de ruana con squash & stretch).
 *
 * Mockup standalone con su propio <Canvas>. NO toca App.jsx ni mundoData.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  ATMOSFERA,
  CIELOS,
  PALETA,
  mezclar,
  mezclarCielo,
} from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier } from '../visual/mundo3d/deviceTier.js';
import { crearRng } from '../visual/mundo3d/particulasData.js';
import { AbejaAngelita } from '../visual/creatures/AbejaAngelita.jsx';
import { MariquitaRubber, LombrizRubber } from '../visual/creatures/FaunaRubberhose.jsx';
import { CamaraOdyssey, IrisOdyssey } from '../visual/mundo3d/TunelOdyssey.jsx';
import { useTunelOdyssey } from '../visual/mundo3d/useTunelOdyssey.js';

/* ══════════════════════════════════════════════════════════════════════════
   CONSTANTES DE DIRECCIÓN — la hora de la finca y el viaje de cámara
   ══════════════════════════════════════════════════════════════════════════ */

/* La huerta bajo la madre: la misma receta 60% hora dorada de EscenaBase3D. */
const CIELO = mezclarCielo(CIELOS.huerta);

/* Poses del viaje Odyssey (constantes de módulo: cero asignación por frame). */
const POSE_ORBITA = {
  pos: new THREE.Vector3(9.2, 6.0, 12.4),
  mira: new THREE.Vector3(0, 1.4, 0),
  fov: 46,
};
const POSE_BOCA = {
  pos: new THREE.Vector3(-2.2, 1.14, 1.05),
  mira: new THREE.Vector3(-2.2, 1.02, -1.6),
  fov: 15,
};

/* ══════════════════════════════════════════════════════════════════════════
   LAYOUT DETERMINISTA (crearRng sembrado; jamás Math.random en render)
   ══════════════════════════════════════════════════════════════════════════ */

const rngFinca = crearRng(20260710);

/* Matas low-poly del diorama 3D: dos eras de cultivo a la derecha. */
const MATAS_3D = Array.from({ length: 26 }, (_, i) => {
  const fila = Math.floor(i / 7);
  const col = i % 7;
  return {
    x: 1.6 + col * 0.72 + (rngFinca() - 0.5) * 0.22,
    z: -1.4 + fila * 0.95 + (rngFinca() - 0.5) * 0.2,
    s: 0.75 + rngFinca() * 0.45,
    verde: rngFinca() > 0.5 ? PALETA.follaje : PALETA.follajeClaro,
  };
});

/* ── Nivel 2D: unidades de diseño (px a escala 1). y CRECE hacia abajo. ── */
const ALTO_2D = 420;
const MUNDO_W = 2800;
const SUELO_BASE = 372;
const SALIDA_X = 2560;

/* Terrazas: escalones amables — se SUBEN caminando (auto-step), no castigan. */
const TERRAZAS = [
  { x0: 660, x1: 1010, y: 312 },
  { x0: 1140, x1: 1450, y: 288 },
  { x0: 1950, x1: 2270, y: 312 },
];

/* El piso bajo una x: la terraza más alta que la contiene, o el piso base. */
function sueloEn(x) {
  let piso = SUELO_BASE;
  for (const t of TERRAZAS) {
    if (x >= t.x0 && x <= t.x1 && t.y < piso) piso = t.y;
  }
  return piso;
}

/* Las cuatro estaciones de cuidado (didáctica sobria, en «usted»). */
const ESTACIONES = [
  {
    id: 'riego',
    x: 470,
    tipo: 'maiz-sed',
    titulo: 'La mata tiene sed',
    accion: 'Regar',
    tip: 'Riegue al pie de la mata y en la mañana: el agua rinde más y no se evapora al sol del mediodía.',
  },
  {
    id: 'asocio',
    x: 850,
    tipo: 'asocio',
    titulo: 'El maíz está solo',
    accion: 'Sembrar asocio',
    tip: 'Las tres hermanas: el maíz sostiene al frijol, el frijol abona la tierra y la auyama tapa el suelo para que no se seque.',
  },
  {
    id: 'aliada',
    x: 1290,
    tipo: 'aliada',
    titulo: 'Una visita en la hoja',
    accion: 'Observar',
    tip: 'La mariquita se come los pulgones. Donde ella vive tranquila, no hace falta fumigar.',
  },
  {
    id: 'cosecha',
    x: 1750,
    tipo: 'cafeto',
    titulo: 'El cafeto cargó fruto',
    accion: 'Recoger lo maduro',
    tip: 'Coseche grano a grano solo el fruto rojo: el verde sigue madurando para la próxima pasada.',
  },
];
const ALCANCE = 84; // radio (px de diseño) para activar una estación

/* Flores y matas de pasto decorativas, sembradas lejos de las estaciones. */
const FLORES_2D = (() => {
  const flores = [];
  let intentos = 0;
  while (flores.length < 22 && intentos < 200) {
    intentos += 1;
    const x = 90 + rngFinca() * (MUNDO_W - 320);
    const cerca =
      ESTACIONES.some((e) => Math.abs(e.x - x) < 110) || Math.abs(SALIDA_X - x) < 130;
    if (cerca) continue;
    flores.push({
      x,
      y: sueloEn(x),
      s: 0.7 + rngFinca() * 0.6,
      tono: rngFinca() > 0.55 ? PALETA.ambar : '#c96f8f',
      pasto: rngFinca() > 0.5,
    });
  }
  return flores;
})();

/* Física del caminante (px de diseño / s). */
const VEL_ANDAR = 250;
const GRAVEDAD = 2050;
const VEL_SALTO = -700;

/* ══════════════════════════════════════════════════════════════════════════
   3D — el diorama de la finca con el túnel en la loma
   ══════════════════════════════════════════════════════════════════════════ */

/* El túnel: aro de piedra en la loma + garganta oscura + disco que RESPIRA
   ámbar y se enciende cuando la cámara se acerca (la promesa del portal). */
function Tunel3D({ fase, onEntrar }) {
  const discoRef = useRef(null);

  useFrame((state) => {
    const disco = discoRef.current;
    if (!disco) return;
    const t = state.clock.elapsedTime;
    const base = fase === 'acercando' ? 1.5 : 0.55;
    disco.emissiveIntensity = base + Math.sin(t * 2.1) * 0.18;
  });

  const alEntrar = useCallback(
    (e) => {
      e.stopPropagation();
      onEntrar();
    },
    [onEntrar],
  );
  const manito = useCallback(() => {
    document.body.style.cursor = 'pointer';
  }, []);
  const normal = useCallback(() => {
    document.body.style.cursor = 'auto';
  }, []);
  /* si el mesh se desmonta con la manito puesta, soltarla */
  useEffect(
    () => () => {
      document.body.style.cursor = 'auto';
    },
    [],
  );

  return (
    <group position={[-2.2, 1.02, -1.55]}>
      {/* aro de piedra */}
      <mesh rotation={[0, 0, 0.08]}>
        <torusGeometry args={[0.82, 0.2, 8, 18]} />
        <meshLambertMaterial color={PALETA.piedra} flatShading />
      </mesh>
      {/* dos piedras de umbral */}
      <mesh position={[-0.75, -0.85, 0.1]} rotation={[0.1, 0.4, 0]}>
        <dodecahedronGeometry args={[0.26, 0]} />
        <meshLambertMaterial color={PALETA.piedra} flatShading />
      </mesh>
      <mesh position={[0.8, -0.8, 0.14]} rotation={[0.3, 1.1, 0]}>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshLambertMaterial color={PALETA.concreto} flatShading />
      </mesh>
      {/* garganta hacia adentro de la loma */}
      <mesh position={[0, 0, -0.55]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 1.1, 14, 1, true]} />
        <meshLambertMaterial color={ATMOSFERA.sombra} side={THREE.BackSide} />
      </mesh>
      {/* el disco del portal: lo que se toca para entrar */}
      <mesh position={[0, 0, -0.35]} onClick={alEntrar} onPointerOver={manito} onPointerOut={normal}>
        <circleGeometry args={[0.7, 22]} />
        <meshLambertMaterial
          ref={discoRef}
          color={mezclar(PALETA.ambar, ATMOSFERA.sombra, 0.55)}
          emissive={PALETA.ambar}
          emissiveIntensity={0.55}
        />
      </mesh>
    </group>
  );
}

/* Una mata low-poly: cono de follaje sobre talluelo. */
function Mata3D({ x, z, s, verde }) {
  return (
    <group position={[x, 0, z]} scale={[s, s, s]}>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.03, 0.045, 0.28, 5]} />
        <meshLambertMaterial color={PALETA.madera} flatShading />
      </mesh>
      <mesh position={[0, 0.44, 0]}>
        <coneGeometry args={[0.24, 0.52, 6]} />
        <meshLambertMaterial color={verde} flatShading />
      </mesh>
    </group>
  );
}

/* El diorama completo: loma con túnel, casita, eras de cultivo, arbolitos. */
function DioramaFinca({ fase, onEntrar, cuidados }) {
  return (
    <group>
      <color attach="background" args={[CIELO.fondo]} />
      <fog attach="fog" args={[CIELO.niebla, 15, 34]} />
      <hemisphereLight args={[CIELO.cielo, CIELO.suelo, 0.95 * CIELO.intensidad]} />
      <directionalLight position={[6, 8, 4]} intensity={1.05} color={ATMOSFERA.luz} />
      <directionalLight position={[-5, 4, -3]} intensity={0.22} color={ATMOSFERA.relleno} />

      {/* alfombra del valle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[17, 26]} />
        <meshLambertMaterial color={CIELO.alfombra} flatShading />
      </mesh>

      {/* la loma que guarda el túnel */}
      <mesh position={[-2.6, -0.4, -4.2]} scale={[1.5, 1, 1.15]}>
        <sphereGeometry args={[4.1, 14, 10]} />
        <meshLambertMaterial color={PALETA.follajeOscuro} flatShading />
      </mesh>
      <mesh position={[-6.5, -0.7, -7]} scale={[1.7, 0.9, 1.2]}>
        <sphereGeometry args={[4.4, 12, 9]} />
        <meshLambertMaterial color={mezclar(PALETA.follajeOscuro, CIELO.fondo, 0.35)} flatShading />
      </mesh>
      <mesh position={[6.8, -0.9, -8]} scale={[1.9, 1, 1.3]}>
        <sphereGeometry args={[4.6, 12, 9]} />
        <meshLambertMaterial color={mezclar(PALETA.follaje, CIELO.fondo, 0.45)} flatShading />
      </mesh>

      <Tunel3D fase={fase} onEntrar={onEntrar} />

      {/* casita campesina: cal, teja, puerta de madera */}
      <group position={[3.4, 0, 1.6]} rotation={[0, -0.5, 0]}>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[1.7, 1.1, 1.3]} />
          <meshLambertMaterial color={PALETA.cal} flatShading />
        </mesh>
        <mesh position={[0, 1.32, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[1.35, 0.75, 4]} />
          <meshLambertMaterial color={'#a55e3a'} flatShading />
        </mesh>
        <mesh position={[0, 0.38, 0.66]}>
          <boxGeometry args={[0.4, 0.76, 0.05]} />
          <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
        </mesh>
      </group>

      {/* eras de cultivo */}
      <mesh position={[3.8, 0.03, 0.2]} rotation={[-Math.PI / 2, 0, 0.1]}>
        <planeGeometry args={[5.6, 3.4]} />
        <meshLambertMaterial color={PALETA.tierra} flatShading />
      </mesh>
      {MATAS_3D.map((m, i) => (
        <Mata3D key={i} {...m} />
      ))}

      {/* dos arbolitos de sombrío */}
      <group position={[-5.6, 0, 2.4]}>
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.12, 0.18, 1.4, 6]} />
          <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
        </mesh>
        <mesh position={[0, 1.85, 0]}>
          <icosahedronGeometry args={[0.95, 0]} />
          <meshLambertMaterial color={PALETA.follaje} flatShading />
        </mesh>
      </group>
      <group position={[0.4, 0, 4.6]} scale={[0.8, 0.8, 0.8]}>
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.1, 0.16, 1.4, 6]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
        <mesh position={[0, 1.8, 0]}>
          <icosahedronGeometry args={[0.85, 0]} />
          <meshLambertMaterial color={PALETA.follajeClaro} flatShading />
        </mesh>
      </group>

      {/* si la finca quedó cuidada, florecen tres puntos ámbar junto al túnel */}
      {cuidados >= ESTACIONES.length && (
        <group position={[-2.2, 0.15, -0.6]}>
          {[-0.5, 0, 0.5].map((dx) => (
            <mesh key={dx} position={[dx, 0, 0]}>
              <sphereGeometry args={[0.09, 8, 6]} />
              <meshLambertMaterial color={PALETA.ambar} emissive={PALETA.ambar} emissiveIntensity={0.7} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   2D — el plano jugable (DOM + SVG rubber-hose, cero WebGL)
   ══════════════════════════════════════════════════════════════════════════ */

/* El campesino rubber-hose: sombrero aguadeño, ruana, botas; piernas y brazos
   de manguera (stroke redondo) que el CSS balancea al andar. */
function CampesinoRubber() {
  return (
    <svg
      className="ody-campesino"
      viewBox="0 0 90 120"
      width="90"
      height="120"
      role="img"
      aria-label="Campesino caminante"
    >
      <title>Campesino caminante</title>
      {/* piernas (manguera) */}
      <g className="ody-cmp-pierna ody-cmp-pierna--a">
        <path d="M40 78 Q39 96 37 110" fill="none" stroke="#4a3626" strokeWidth="7" strokeLinecap="round" />
        <ellipse cx="36" cy="112" rx="8" ry="5" fill="#2f2318" />
      </g>
      <g className="ody-cmp-pierna ody-cmp-pierna--b">
        <path d="M50 78 Q52 96 54 110" fill="none" stroke="#4a3626" strokeWidth="7" strokeLinecap="round" />
        <ellipse cx="55" cy="112" rx="8" ry="5" fill="#2f2318" />
      </g>
      {/* ruana (trapecio andino con franja) */}
      <path d="M27 50 L63 50 L68 84 L22 84 Z" fill="#8f5a3a" />
      <path d="M24 74 L66 74 L68 84 L22 84 Z" fill="#6e4128" />
      <path d="M27 50 L63 50 L64 58 L26 58 Z" fill="#a9714a" />
      {/* brazos (manguera) */}
      <g className="ody-cmp-brazo ody-cmp-brazo--a">
        <path d="M29 56 Q20 66 18 76" fill="none" stroke="#8f5a3a" strokeWidth="7" strokeLinecap="round" />
        <circle cx="17" cy="78" r="4.5" fill="#e8b489" />
      </g>
      <g className="ody-cmp-brazo ody-cmp-brazo--b">
        <path d="M61 56 Q70 66 72 76" fill="none" stroke="#8f5a3a" strokeWidth="7" strokeLinecap="round" />
        <circle cx="73" cy="78" r="4.5" fill="#e8b489" />
      </g>
      {/* cabeza + sombrero aguadeño */}
      <circle cx="45" cy="36" r="14" fill="#e8b489" />
      <circle cx="40" cy="36" r="2.2" fill="#2f2318" />
      <circle cx="50" cy="36" r="2.2" fill="#2f2318" />
      <path d="M38 43 Q45 47 52 43" fill="none" stroke="#2f2318" strokeWidth="2" strokeLinecap="round" />
      <circle cx="36" cy="41" r="2.6" fill="#d98a6a" opacity="0.55" />
      <circle cx="54" cy="41" r="2.6" fill="#d98a6a" opacity="0.55" />
      <ellipse cx="45" cy="24" rx="21" ry="5.5" fill="#e9dfc8" />
      <path d="M33 24 Q33 12 45 12 Q57 12 57 24 Z" fill="#e9dfc8" />
      <path d="M33 22 L57 22 L57 24 L33 24 Z" fill="#5a4326" />
    </svg>
  );
}

/* Un cultivo de estación, con su estado «cuidada». Todo SVG inline barato;
   los brotes del asocio y las gotas del riego aparecen por CSS. */
function CultivoEstacion({ tipo, cuidada }) {
  if (tipo === 'maiz-sed') {
    return (
      <svg className="ody-cultivo" viewBox="0 0 110 130" width="110" height="130" aria-hidden="true">
        <g className="ody-mata-sed" style={{ display: cuidada ? 'none' : undefined }}>
          <path d="M55 126 Q58 84 70 62" fill="none" stroke="#9a8a4a" strokeWidth="6" strokeLinecap="round" />
          <path d="M60 96 Q76 92 84 98" fill="none" stroke="#b0a054" strokeWidth="5" strokeLinecap="round" />
          <path d="M58 78 Q44 76 38 84" fill="none" stroke="#b0a054" strokeWidth="5" strokeLinecap="round" />
        </g>
        <g style={{ display: cuidada ? undefined : 'none' }}>
          <path d="M55 126 Q55 70 55 34" fill="none" stroke={PALETA.follaje} strokeWidth="6" strokeLinecap="round" />
          <path d="M55 96 Q76 88 86 92" fill="none" stroke={PALETA.follajeClaro} strokeWidth="5" strokeLinecap="round" />
          <path d="M55 78 Q34 70 24 74" fill="none" stroke={PALETA.follajeClaro} strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="63" cy="58" rx="7" ry="13" fill={PALETA.ambar} transform="rotate(18 63 58)" />
          <g className="ody-gotas">
            <circle cx="38" cy="40" r="4" fill={PALETA.agua} />
            <circle cx="70" cy="30" r="3.2" fill={PALETA.agua} />
            <circle cx="52" cy="20" r="2.6" fill={PALETA.agua} />
          </g>
        </g>
      </svg>
    );
  }
  if (tipo === 'asocio') {
    return (
      <svg className="ody-cultivo" viewBox="0 0 130 130" width="130" height="130" aria-hidden="true">
        <path d="M65 126 Q65 66 65 26" fill="none" stroke={PALETA.follaje} strokeWidth="6" strokeLinecap="round" />
        <path d="M65 88 Q88 80 98 84" fill="none" stroke={PALETA.follajeClaro} strokeWidth="5" strokeLinecap="round" />
        <path d="M65 66 Q42 58 32 62" fill="none" stroke={PALETA.follajeClaro} strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="74" cy="46" rx="7" ry="13" fill={PALETA.ambar} transform="rotate(16 74 46)" />
        <g className={`ody-brote${cuidada ? ' ody-brote--vivo' : ''}`}>
          {/* frijol: la espiral que trepa el maíz */}
          <path
            d="M52 122 Q46 104 58 96 Q70 88 58 78 Q48 70 60 60 Q70 52 62 42"
            fill="none"
            stroke={PALETA.follajeOscuro}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="60" cy="58" r="4" fill={PALETA.follajeOscuro} />
          {/* auyama: hojas anchas que tapan el suelo */}
          <ellipse cx="30" cy="118" rx="18" ry="9" fill={PALETA.follajeClaro} />
          <ellipse cx="100" cy="118" rx="18" ry="9" fill={PALETA.follaje} />
          <circle cx="98" cy="110" r="8" fill={PALETA.ambar} />
        </g>
      </svg>
    );
  }
  if (tipo === 'cafeto') {
    return (
      <svg className="ody-cultivo" viewBox="0 0 120 130" width="120" height="130" aria-hidden="true">
        <path d="M60 126 Q60 90 60 58" fill="none" stroke={PALETA.maderaOscura} strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="60" cy="52" rx="34" ry="28" fill={PALETA.follajeOscuro} />
        <ellipse cx="44" cy="42" rx="14" ry="10" fill={PALETA.follaje} />
        <g style={{ display: cuidada ? 'none' : undefined }}>
          <circle cx="42" cy="60" r="5" fill="#b8352f" />
          <circle cx="58" cy="70" r="5" fill="#b8352f" />
          <circle cx="76" cy="58" r="5" fill="#b8352f" />
        </g>
        <circle cx="50" cy="46" r="4.4" fill="#7f9a4a" />
        <circle cx="70" cy="42" r="4.4" fill="#7f9a4a" />
        <g style={{ display: cuidada ? undefined : 'none' }}>
          {/* canasta con lo maduro */}
          <path d="M88 112 L112 112 L108 128 L92 128 Z" fill={PALETA.maderaClara} />
          <circle cx="96" cy="110" r="4" fill="#b8352f" />
          <circle cx="104" cy="109" r="4" fill="#b8352f" />
        </g>
      </svg>
    );
  }
  /* aliada: la hoja grande donde vive la mariquita (la fauna va aparte). */
  return (
    <svg className="ody-cultivo" viewBox="0 0 120 130" width="120" height="130" aria-hidden="true">
      <path d="M60 126 Q58 92 54 70" fill="none" stroke={PALETA.follaje} strokeWidth="5" strokeLinecap="round" />
      <path d="M54 70 Q20 62 26 34 Q58 30 62 62 Z" fill={PALETA.follajeClaro} />
      <path d="M54 70 Q92 66 96 38 Q64 28 58 62 Z" fill={PALETA.follaje} />
    </svg>
  );
}

/* El plano jugable: side-scroll DOM. La física vive en refs y un solo rAF
   escribe transforms directos (cero re-render por frame); React solo pinta
   los eventos discretos (estación activa, mensaje, cuidados). */
function JuegoFinca2D({ tier, reducedMotion, onSalir, onProgreso }) {
  const vistaRef = useRef(null);
  const mundoRef = useRef(null);
  const lomaARef = useRef(null);
  const lomaBRef = useRef(null);
  const jugadorRef = useRef(null);
  const angelitaRef = useRef(null);
  const fisRef = useRef({
    x: 130,
    y: SUELO_BASE,
    vy: 0,
    enSuelo: true,
    mira: 1,
    cam: 0,
    ax: 90,
    ay: SUELO_BASE - 120,
    pisaHasta: 0,
  });
  const teclasRef = useRef({ izq: false, der: false, salto: false });
  const medidaRef = useRef({ ancho: 720 });

  const [esc, setEsc] = useState(1);
  const [activa, setActiva] = useState(null); // id de estación al alcance
  const [enSalida, setEnSalida] = useState(false);
  const [hechas, setHechas] = useState({});
  const [mensaje, setMensaje] = useState({
    id: 'hola',
    txt: 'Camine con las flechas o los botones. Donde vea la chispa, use «Cuidar».',
  });

  const nHechas = Object.keys(hechas).length;
  const completo = nHechas >= ESTACIONES.length;

  /* medir la vista → escala del escenario y ancho visible en unidades diseño */
  useEffect(() => {
    const el = vistaRef.current;
    if (!el) return undefined;
    const medir = () => {
      const r = el.getBoundingClientRect();
      const escala = Math.max(0.3, r.height / ALTO_2D);
      medidaRef.current = { ancho: r.width / escala };
      setEsc(escala);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* progreso hacia el host (el 3D celebra al volver) */
  useEffect(() => {
    onProgreso(nHechas);
  }, [nHechas, onProgreso]);

  /* mensaje se despide solo */
  useEffect(() => {
    if (!mensaje) return undefined;
    const t = setTimeout(() => setMensaje(null), 7000);
    return () => clearTimeout(t);
  }, [mensaje]);

  /* la acción contextual: cuidar la estación al alcance o tomar la salida */
  const accion = useCallback(() => {
    const f = fisRef.current;
    if (Math.abs(f.x - SALIDA_X) < ALCANCE) {
      onSalir();
      return;
    }
    const est = ESTACIONES.find((e) => Math.abs(e.x - f.x) < ALCANCE);
    if (!est) return;
    setHechas((prev) => (prev[est.id] ? prev : { ...prev, [est.id]: true }));
    setMensaje({ id: est.id, txt: est.tip });
  }, [onSalir]);

  /* teclado */
  useEffect(() => {
    const abajo = (e) => {
      const k = teclasRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        k.izq = true;
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        k.der = true;
        e.preventDefault();
      } else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w') {
        k.salto = true;
        e.preventDefault();
      } else if ((e.key === 'e' || e.key === 'Enter') && !e.repeat) {
        accion();
      }
    };
    const arriba = (e) => {
      const k = teclasRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a') k.izq = false;
      else if (e.key === 'ArrowRight' || e.key === 'd') k.der = false;
      else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w') k.salto = false;
    };
    window.addEventListener('keydown', abajo);
    window.addEventListener('keyup', arriba);
    return () => {
      window.removeEventListener('keydown', abajo);
      window.removeEventListener('keyup', arriba);
    };
  }, [accion]);

  /* EL LATIDO: un solo rAF — física, cámara, parallax, poses. Todo por refs. */
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    let activaPrev = null;
    let salidaPrev = false;
    const paso = (ahora) => {
      const dt = Math.min(0.05, (ahora - prev) / 1000);
      prev = ahora;
      const f = fisRef.current;
      const k = teclasRef.current;

      /* andar */
      const dir = (k.der ? 1 : 0) - (k.izq ? 1 : 0);
      if (dir !== 0) f.mira = dir;
      f.x = Math.max(50, Math.min(MUNDO_W - 60, f.x + dir * VEL_ANDAR * dt));

      /* salto + gravedad + escalón amable */
      const piso = sueloEn(f.x);
      if (k.salto && f.enSuelo) {
        f.vy = VEL_SALTO;
        f.enSuelo = false;
      }
      if (!f.enSuelo || f.y < piso) {
        f.vy += GRAVEDAD * dt;
        f.y += f.vy * dt;
        f.enSuelo = false;
        if (f.vy > 0 && f.y >= piso) {
          f.y = piso;
          f.vy = 0;
          f.enSuelo = true;
          f.pisaHasta = ahora + 240;
        }
      } else if (f.y > piso) {
        /* el terreno subió bajo los pies: la terraza se sube caminando */
        f.y = Math.max(piso, f.y - 620 * dt);
      }

      /* cámara con colchón */
      const ancho = medidaRef.current.ancho;
      const objetivo = Math.max(0, Math.min(MUNDO_W - ancho, f.x - ancho * 0.42));
      f.cam += (objetivo - f.cam) * Math.min(1, dt * 5);

      /* Angelita: acompaña con rezago y respiración (determinista: reloj) */
      const tSeg = ahora / 1000;
      const bob = reducedMotion ? 0 : Math.sin(tSeg * 2.4) * 7;
      const guiaX = f.x - f.mira * 52;
      const guiaY = f.y - 128 + bob;
      f.ax += (guiaX - f.ax) * Math.min(1, dt * 3.2);
      f.ay += (guiaY - f.ay) * Math.min(1, dt * 3.2);

      /* escribir al DOM (transform-only) */
      const mundo = mundoRef.current;
      const jugador = jugadorRef.current;
      const angelita = angelitaRef.current;
      const lomaA = lomaARef.current;
      const lomaB = lomaBRef.current;
      if (mundo) mundo.style.transform = `translate3d(${-f.cam}px,0,0)`;
      if (lomaA) lomaA.style.transform = `translate3d(${-f.cam * 0.3}px,0,0)`;
      if (lomaB) lomaB.style.transform = `translate3d(${-f.cam * 0.55}px,0,0)`;
      if (jugador) {
        jugador.style.transform = `translate3d(${f.x}px,${f.y}px,0)`;
        const anda = dir !== 0 && f.enSuelo ? '1' : '0';
        const salta = f.enSuelo ? '0' : '1';
        const pisa = ahora < f.pisaHasta ? '1' : '0';
        const mira = String(f.mira);
        if (jugador.dataset.anda !== anda) jugador.dataset.anda = anda;
        if (jugador.dataset.salta !== salta) jugador.dataset.salta = salta;
        if (jugador.dataset.pisa !== pisa) jugador.dataset.pisa = pisa;
        if (jugador.dataset.mira !== mira) jugador.dataset.mira = mira;
      }
      if (angelita) angelita.style.transform = `translate3d(${f.ax}px,${f.ay}px,0)`;

      /* eventos discretos → React solo cuando cambian */
      const cerca = ESTACIONES.find((e) => Math.abs(e.x - f.x) < ALCANCE)?.id ?? null;
      if (cerca !== activaPrev) {
        activaPrev = cerca;
        setActiva(cerca);
      }
      const salida = Math.abs(f.x - SALIDA_X) < ALCANCE;
      if (salida !== salidaPrev) {
        salidaPrev = salida;
        setEnSalida(salida);
      }

      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  const estActiva = ESTACIONES.find((e) => e.id === activa) || null;
  const puedeCuidar = enSalida || (estActiva != null && !hechas[estActiva.id]);
  const rotuloAccion = enSalida ? 'Volver al valle' : estActiva ? estActiva.accion : 'Cuidar';

  const tocar = useCallback((tecla, valor) => {
    teclasRef.current[tecla] = valor;
  }, []);

  return (
    <div ref={vistaRef} className="ody-2d-vista" data-rm={reducedMotion ? '1' : '0'}>
      {/* cielo del plano: la misma huerta dorada, aplanada a gradiente */}
      <div className="ody-2d-cielo" aria-hidden="true" />
      <div ref={lomaARef} className="ody-2d-lomas ody-2d-lomas--lejos" aria-hidden="true" />
      <div ref={lomaBRef} className="ody-2d-lomas ody-2d-lomas--cerca" aria-hidden="true" />

      <div className="ody-2d-marco" style={{ transform: `scale(${esc})` }}>
        <div ref={mundoRef} className="ody-2d-mundo">
          {/* piso base y terrazas */}
          <div className="ody-suelo" style={{ left: 0, width: MUNDO_W, top: SUELO_BASE }} />
          {TERRAZAS.map((t) => (
            <div
              key={t.x0}
              className="ody-terraza"
              style={{ left: t.x0, width: t.x1 - t.x0, top: t.y, height: SUELO_BASE - t.y + 48 }}
            />
          ))}

          {/* flores y pasto deterministas */}
          {FLORES_2D.map((fl, i) =>
            fl.pasto ? (
              <svg
                key={i}
                className="ody-pasto"
                style={{ left: fl.x, top: fl.y }}
                viewBox="0 0 30 22"
                width={30 * fl.s}
                height={22 * fl.s}
                aria-hidden="true"
              >
                <path d="M6 22 Q4 10 2 6 M12 22 Q12 6 10 2 M18 22 Q20 8 24 4" fill="none" stroke={PALETA.follajeClaro} strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            ) : (
              <svg
                key={i}
                className="ody-flor"
                style={{ left: fl.x, top: fl.y }}
                viewBox="0 0 24 34"
                width={24 * fl.s}
                height={34 * fl.s}
                aria-hidden="true"
              >
                <path d="M12 34 Q12 20 12 12" fill="none" stroke={PALETA.follaje} strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="12" cy="9" r="6" fill={fl.tono} />
                <circle cx="12" cy="9" r="2.4" fill="#f4e6c2" />
              </svg>
            ),
          )}

          {/* estaciones de cuidado */}
          {ESTACIONES.map((e) => {
            const y = sueloEn(e.x);
            const hecha = !!hechas[e.id];
            return (
              <div
                key={e.id}
                className="ody-estacion"
                style={{ left: e.x, top: y }}
                data-cuidada={hecha ? '1' : '0'}
              >
                <CultivoEstacion tipo={e.tipo} cuidada={hecha} />
                {e.tipo === 'aliada' && (
                  <>
                    <div className="ody-fauna ody-fauna--mariquita">
                      <MariquitaRubber size={46} inline animated={!reducedMotion} tier={tier} className="" />
                    </div>
                    <div className="ody-fauna ody-fauna--lombriz">
                      <LombrizRubber size={52} inline animated={!reducedMotion} tier={tier} className="" />
                    </div>
                  </>
                )}
                {!hecha && activa === e.id && <div className="ody-chispa" aria-hidden="true" />}
              </div>
            );
          })}

          {/* el túnel de vuelta */}
          <div className="ody-salida" style={{ left: SALIDA_X, top: sueloEn(SALIDA_X) }} data-cerca={enSalida ? '1' : '0'}>
            <svg viewBox="0 0 150 150" width="150" height="150" aria-hidden="true">
              <ellipse cx="75" cy="142" rx="66" ry="8" fill={PALETA.tierraClara} />
              <circle cx="75" cy="82" r="56" fill={PALETA.piedra} />
              <circle cx="75" cy="82" r="42" fill="#2c2013" />
              <circle className="ody-salida-luz" cx="75" cy="82" r="30" fill={PALETA.ambar} opacity="0.55" />
            </svg>
          </div>

          {/* Angelita guía */}
          <div ref={angelitaRef} className="ody-angelita">
            <AbejaAngelita
              size={56}
              animo={completo ? 'pleno' : 'sereno'}
              energia={1}
              animated={!reducedMotion}
              tier={tier}
            />
          </div>

          {/* el caminante */}
          <div ref={jugadorRef} className="ody-jugador" data-anda="0" data-salta="0" data-pisa="0" data-mira="1">
            <div className="ody-jugador__cuerpo">
              <CampesinoRubber />
            </div>
          </div>
        </div>
      </div>

      {/* HUD sobrio */}
      <div className="ody-hud">
        <p className="ody-hud__progreso" role="status">
          Cuidados: {nHechas} de {ESTACIONES.length}
          {completo ? ' — la finca quedó cuidada' : ''}
        </p>
        {mensaje && (
          <p className="ody-hud__mensaje" role="status">
            {mensaje.txt}
          </p>
        )}
      </div>

      {/* controles táctiles */}
      <div className="ody-mandos" aria-label="Controles del juego">
        <div className="ody-mandos__grupo">
          <button
            type="button"
            className="ody-boton"
            aria-label="Caminar a la izquierda"
            onPointerDown={() => tocar('izq', true)}
            onPointerUp={() => tocar('izq', false)}
            onPointerLeave={() => tocar('izq', false)}
            onPointerCancel={() => tocar('izq', false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            ◀
          </button>
          <button
            type="button"
            className="ody-boton"
            aria-label="Caminar a la derecha"
            onPointerDown={() => tocar('der', true)}
            onPointerUp={() => tocar('der', false)}
            onPointerLeave={() => tocar('der', false)}
            onPointerCancel={() => tocar('der', false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            ▶
          </button>
        </div>
        <div className="ody-mandos__grupo">
          <button
            type="button"
            className="ody-boton"
            aria-label="Saltar"
            onPointerDown={() => tocar('salto', true)}
            onPointerUp={() => tocar('salto', false)}
            onPointerLeave={() => tocar('salto', false)}
            onPointerCancel={() => tocar('salto', false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            ⤒
          </button>
          <button
            type="button"
            className="ody-boton ody-boton--cuidar"
            onClick={accion}
            disabled={!puedeCuidar}
          >
            {rotuloAccion}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Portada 2D para tier 'bajo' (gemelo sin WebGL): la loma y el túnel como
   estampa DOM — el ritual de entrar por el túnel se conserva. */
function PortadaFinca2D({ onEntrar }) {
  return (
    <div className="ody-portada" aria-hidden="true">
      <div className="ody-portada__loma" />
      <button type="button" className="ody-portada__tunel" onClick={onEntrar} aria-label="Entrar al túnel">
        <span className="ody-portada__boca" />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CSS del mockup (constante de módulo, patrón ValleLluvia3D)
   ══════════════════════════════════════════════════════════════════════════ */
const CSS_ODY = `
.ody-raiz {
  position: relative;
  width: 100%;
  height: 100dvh;
  min-height: 480px;
  overflow: hidden;
  background: ${CIELO.fondo};
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: #3a2a18;
}
.ody-canvas {
  position: absolute !important;
  inset: 0;
  opacity: 0;
  transition: opacity 480ms ease;
}
.ody-canvas--lista { opacity: 1; }

/* ── chrome de la vista 3D ── */
.ody-chrome {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 18px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
  transition: opacity 700ms ease;
}
.ody-raiz[data-fase='acercando'] .ody-chrome,
.ody-raiz[data-fase='saliendo'] .ody-chrome { opacity: 0; }
.ody-titulo {
  margin: 0;
  font-size: clamp(1.3rem, 3.5vw, 2rem);
  font-weight: 800;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 0 rgba(255,244,214,0.6);
}
.ody-titulo small {
  display: block;
  font-size: 0.58em;
  font-weight: 600;
  opacity: 0.78;
  margin-top: 2px;
}
.ody-invita {
  display: flex;
  align-items: center;
  gap: 12px;
  pointer-events: auto;
}
.ody-invita__abeja { flex: 0 0 auto; filter: drop-shadow(0 3px 4px rgba(58,42,24,0.25)); }
.ody-invita__caja {
  background: rgba(255, 249, 235, 0.92);
  border: 1.5px solid rgba(122, 90, 56, 0.35);
  border-radius: 14px;
  padding: 10px 14px;
  max-width: 380px;
  box-shadow: 0 4px 14px rgba(58, 42, 24, 0.18);
}
.ody-invita__caja p { margin: 0 0 8px; font-size: 0.92rem; line-height: 1.35; }
.ody-entrar {
  appearance: none;
  border: none;
  border-radius: 999px;
  padding: 10px 20px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff8ea;
  background: ${PALETA.follajeOscuro};
  cursor: pointer;
  box-shadow: 0 3px 0 ${mezclar(PALETA.follajeOscuro, '#000000', 0.35)};
  transition: transform 120ms ease;
}
.ody-entrar:active { transform: translateY(2px); }
.ody-volver-host {
  position: absolute;
  top: 14px;
  right: 16px;
  pointer-events: auto;
  appearance: none;
  border: 1.5px solid rgba(122, 90, 56, 0.4);
  border-radius: 999px;
  background: rgba(255, 249, 235, 0.85);
  color: #5a4326;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 6px 14px;
  cursor: pointer;
}

/* viñeta de succión durante el dolly */
.ody-vineta {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 1100ms ease-in;
  background: radial-gradient(circle at 50% 52%, transparent 34%, rgba(44, 32, 19, 0.55) 78%, rgba(30, 21, 12, 0.9) 100%);
}
.ody-raiz[data-fase='acercando'] .ody-vineta { opacity: 1; }
.ody-raiz[data-fase='iris-cierra'] .ody-vineta { opacity: 1; transition: none; }

/* ── EL IRIS (el cruce): clip-path circular, el portal más barato ── */
.ody-capa2d {
  position: absolute;
  inset: 0;
  background: ${CIELO.fondo};
}

/* ── plano 2D ── */
.ody-2d-vista { position: absolute; inset: 0; overflow: hidden; }
.ody-2d-cielo {
  position: absolute;
  inset: 0;
  background: linear-gradient(${CIELO.cielo} 0%, ${CIELO.fondo} 58%, ${mezclar(CIELO.fondo, PALETA.tierraClara, 0.35)} 100%);
}
.ody-2d-lomas {
  position: absolute;
  left: 0;
  right: -60%;
  bottom: 0;
  height: 62%;
  pointer-events: none;
  will-change: transform;
}
.ody-2d-lomas--lejos {
  background:
    radial-gradient(58% 90% at 12% 100%, ${mezclar(PALETA.follajeOscuro, CIELO.fondo, 0.62)} 0 62%, transparent 63%),
    radial-gradient(50% 78% at 46% 100%, ${mezclar(PALETA.follaje, CIELO.fondo, 0.66)} 0 60%, transparent 61%),
    radial-gradient(62% 95% at 84% 100%, ${mezclar(PALETA.follajeOscuro, CIELO.fondo, 0.58)} 0 64%, transparent 65%);
}
.ody-2d-lomas--cerca {
  height: 46%;
  background:
    radial-gradient(46% 88% at 24% 100%, ${mezclar(PALETA.follaje, CIELO.fondo, 0.4)} 0 60%, transparent 61%),
    radial-gradient(52% 92% at 70% 100%, ${mezclar(PALETA.follajeOscuro, CIELO.fondo, 0.44)} 0 62%, transparent 63%);
}
.ody-2d-marco {
  position: absolute;
  top: 0;
  left: 0;
  width: ${MUNDO_W}px;
  height: ${ALTO_2D}px;
  transform-origin: top left;
}
.ody-2d-mundo { position: absolute; inset: 0; will-change: transform; }
.ody-suelo {
  position: absolute;
  height: ${ALTO_2D}px;
  background: linear-gradient(${PALETA.follajeClaro} 0 10px, ${PALETA.tierra} 10px 100%);
  border-radius: 6px 6px 0 0;
}
.ody-terraza {
  position: absolute;
  background: linear-gradient(${PALETA.follajeClaro} 0 9px, ${PALETA.tierraClara} 9px 100%);
  border-radius: 12px 12px 0 0;
  box-shadow: inset 0 -8px 0 rgba(58, 42, 24, 0.14);
}
.ody-flor, .ody-pasto { position: absolute; transform: translate(-50%, -100%); }
.ody-estacion { position: absolute; transform: translate(-50%, -100%); }
.ody-cultivo { display: block; }
.ody-gotas { animation: odyGoteo 1.6s ease-in-out infinite; }
@keyframes odyGoteo {
  0%, 100% { transform: translateY(0); opacity: 0.9; }
  50% { transform: translateY(6px); opacity: 0.5; }
}
.ody-mata-sed { transform-origin: 55px 126px; animation: odyPenar 3.2s ease-in-out infinite; }
@keyframes odyPenar {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(2.5deg); }
}
.ody-brote { transform-origin: 65px 122px; transform: scale(0); opacity: 0; transition: transform 900ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 500ms ease; }
.ody-brote--vivo { transform: scale(1); opacity: 1; }
.ody-fauna { position: absolute; }
.ody-fauna--mariquita { left: 8px; top: -104px; }
.ody-fauna--lombriz { left: 78px; top: -6px; }
.ody-chispa {
  position: absolute;
  left: 50%;
  top: -148px;
  width: 18px;
  height: 18px;
  transform: translateX(-50%);
  background: ${PALETA.ambar};
  clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
  animation: odyChispa 1.1s ease-in-out infinite;
}
@keyframes odyChispa {
  0%, 100% { transform: translateX(-50%) scale(1) rotate(0deg); opacity: 1; }
  50% { transform: translateX(-50%) scale(1.35) rotate(22deg); opacity: 0.7; }
}
.ody-salida { position: absolute; transform: translate(-50%, -100%); }
.ody-salida-luz { transition: opacity 400ms ease; }
.ody-salida[data-cerca='1'] .ody-salida-luz { animation: odyLatir 1.2s ease-in-out infinite; }
@keyframes odyLatir {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 0.95; }
}
.ody-angelita { position: absolute; left: 0; top: 0; will-change: transform; pointer-events: none; }
.ody-angelita > * { transform: translate(-50%, -50%); }

/* ── el caminante rubber-hose ── */
.ody-jugador { position: absolute; left: 0; top: 0; width: 0; height: 0; will-change: transform; }
.ody-jugador__cuerpo { transform: translate(-50%, -100%); transform-origin: 50% 100%; }
.ody-jugador[data-mira='-1'] .ody-campesino { transform: scaleX(-1); }
.ody-jugador[data-salta='1'] .ody-jugador__cuerpo { animation: odyEstirar 420ms ease-out; }
@keyframes odyEstirar {
  0% { transform: translate(-50%, -100%) scale(1.12, 0.9); }
  40% { transform: translate(-50%, -100%) scale(0.9, 1.14); }
  100% { transform: translate(-50%, -100%) scale(1, 1); }
}
.ody-jugador[data-pisa='1'] .ody-jugador__cuerpo { animation: odyPisar 240ms ease-out; }
@keyframes odyPisar {
  0% { transform: translate(-50%, -100%) scale(1.18, 0.84); }
  100% { transform: translate(-50%, -100%) scale(1, 1); }
}
.ody-cmp-pierna, .ody-cmp-brazo { animation-play-state: paused; }
.ody-cmp-pierna--a { transform-origin: 40px 78px; animation: odyPasoA 0.5s ease-in-out infinite; }
.ody-cmp-pierna--b { transform-origin: 50px 78px; animation: odyPasoB 0.5s ease-in-out infinite; }
.ody-cmp-brazo--a { transform-origin: 29px 56px; animation: odyPasoB 0.5s ease-in-out infinite; }
.ody-cmp-brazo--b { transform-origin: 61px 56px; animation: odyPasoA 0.5s ease-in-out infinite; }
.ody-jugador[data-anda='1'] .ody-cmp-pierna,
.ody-jugador[data-anda='1'] .ody-cmp-brazo { animation-play-state: running; }
@keyframes odyPasoA {
  0%, 100% { transform: rotate(-24deg); }
  50% { transform: rotate(24deg); }
}
@keyframes odyPasoB {
  0%, 100% { transform: rotate(24deg); }
  50% { transform: rotate(-24deg); }
}
.ody-2d-vista[data-rm='1'] .ody-gotas,
.ody-2d-vista[data-rm='1'] .ody-mata-sed,
.ody-2d-vista[data-rm='1'] .ody-chispa,
.ody-2d-vista[data-rm='1'] .ody-cmp-pierna,
.ody-2d-vista[data-rm='1'] .ody-cmp-brazo { animation: none; }

/* ── HUD y mandos ── */
.ody-hud {
  position: absolute;
  top: 12px;
  left: 14px;
  right: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.ody-hud__progreso {
  margin: 0;
  align-self: flex-start;
  background: rgba(255, 249, 235, 0.9);
  border: 1.5px solid rgba(122, 90, 56, 0.3);
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 0.85rem;
  font-weight: 700;
}
.ody-hud__mensaje {
  margin: 0;
  align-self: flex-start;
  max-width: min(460px, 86%);
  background: rgba(255, 249, 235, 0.94);
  border: 1.5px solid rgba(122, 90, 56, 0.35);
  border-radius: 14px;
  padding: 9px 14px;
  font-size: 0.9rem;
  line-height: 1.4;
  box-shadow: 0 4px 12px rgba(58, 42, 24, 0.16);
}
.ody-mandos {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  display: flex;
  justify-content: space-between;
  gap: 10px;
  pointer-events: none;
}
.ody-mandos__grupo { display: flex; gap: 10px; pointer-events: auto; }
.ody-boton {
  appearance: none;
  border: none;
  min-width: 58px;
  min-height: 58px;
  border-radius: 18px;
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff8ea;
  background: rgba(90, 67, 38, 0.82);
  box-shadow: 0 3px 0 rgba(47, 35, 24, 0.7);
  cursor: pointer;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.ody-boton:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(47, 35, 24, 0.7); }
.ody-boton--cuidar { font-size: 0.95rem; padding: 0 18px; background: ${PALETA.follajeOscuro}; }
.ody-boton--cuidar:disabled { opacity: 0.45; cursor: default; }

/* ── portada gemela para tier bajo ── */
.ody-portada { position: absolute; inset: 0; overflow: hidden; }
.ody-portada__loma {
  position: absolute;
  left: -10%;
  right: -10%;
  bottom: 0;
  height: 70%;
  background:
    radial-gradient(55% 92% at 30% 100%, ${PALETA.follajeOscuro} 0 62%, transparent 63%),
    radial-gradient(60% 85% at 78% 100%, ${mezclar(PALETA.follaje, CIELO.fondo, 0.3)} 0 60%, transparent 61%);
}
.ody-portada__tunel {
  position: absolute;
  left: 30%;
  bottom: 16%;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  border: 14px solid ${PALETA.piedra};
  background: #2c2013;
  cursor: pointer;
  padding: 0;
}
.ody-portada__boca {
  position: absolute;
  inset: 18px;
  border-radius: 50%;
  background: radial-gradient(circle, ${PALETA.ambar} 0%, rgba(217, 161, 59, 0.15) 68%, transparent 72%);
  animation: odyLatir 1.6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .ody-portada__boca { animation: none; }
}
`;

/* ══════════════════════════════════════════════════════════════════════════
   EL MOCKUP — la máquina de fases del cruce Odyssey
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * JuegoMiFincaOdyssey — vista 3D de la finca con túnel → plano 2D jugable.
 *
 * Fases: valle3d → acercando (dolly+FOV) → iris-abre → juego2d →
 *        iris-cierra → saliendo → valle3d. Con reduced-motion: swap directo.
 *
 * @param {object} props
 * @param {() => void} [props.onBack] vuelve al host (botón discreto).
 */
export default function JuegoMiFincaOdyssey({ onBack }) {
  const [{ tier, reducedMotion }] = useState(() => decidirTier());
  const [listo, setListo] = useState(false);
  const [cuidados, setCuidados] = useState(0);
  const sinCanvas = tier === 'bajo';
  const {
    fase,
    entrar,
    salir,
    alLlegarCamara,
    mostrar3d: con3D,
    mostrarPortada: conPortada,
    mostrar2d: con2D,
    enValle,
  } = useTunelOdyssey({ reducedMotion, sinCanvas });

  const onProgreso = useCallback((n) => setCuidados(n), []);

  const completo = cuidados >= ESTACIONES.length;

  return (
    <section
      className="ody-raiz"
      data-fase={fase}
      data-tier={tier}
      aria-label="Mi finca: un túnel en la loma lleva del valle 3D a un plano 2D donde se cuida la finca caminando"
    >
      <style>{CSS_ODY}</style>

      {con3D && (
        <Canvas
          className={`ody-canvas${listo ? ' ody-canvas--lista' : ''}`}
          dpr={tier === 'alto' ? [1, 1.5] : [1, 1.25]}
          gl={{ antialias: tier === 'alto', powerPreference: 'high-performance' }}
          camera={{ position: POSE_ORBITA.pos.toArray(), fov: POSE_ORBITA.fov }}
          frameloop={reducedMotion && enValle ? 'demand' : 'always'}
          onCreated={() => setListo(true)}
        >
          <CamaraOdyssey
            fase={fase}
            poseValle={POSE_ORBITA}
            poseBoca={POSE_BOCA}
            reducedMotion={reducedMotion}
            onLlegada={alLlegarCamara}
          />
          <DioramaFinca fase={fase} onEntrar={entrar} cuidados={cuidados} />
        </Canvas>
      )}

      {conPortada && <PortadaFinca2D onEntrar={entrar} />}

      {(enValle || fase === 'acercando' || conPortada) && (
        <div className="ody-chrome">
          <h2 className="ody-titulo">
            Mi finca
            <small>Un túnel en la loma guarda el plano de la finca</small>
          </h2>
          <div className="ody-invita">
            <div className="ody-invita__abeja">
              <AbejaAngelita
                size={64}
                animo={completo ? 'pleno' : 'sereno'}
                energia={1}
                animated={!reducedMotion}
                tier={tier}
              />
            </div>
            <div className="ody-invita__caja">
              <p>
                {completo
                  ? 'La finca quedó cuidada. Vuelva al túnel cuando quiera.'
                  : 'Angelita encontró un túnel en la loma. Adentro, la finca se vuelve un camino que se recorre a pie.'}
              </p>
              <button type="button" className="ody-entrar" onClick={entrar}>
                Entrar al túnel
              </button>
            </div>
          </div>
        </div>
      )}

      {onBack && enValle && (
        <button type="button" className="ody-volver-host" onClick={onBack}>
          Volver
        </button>
      )}

      <div className="ody-vineta" aria-hidden="true" />

      {con2D && (
        <IrisOdyssey fase={fase} className="ody-capa2d">
          <JuegoFinca2D
            tier={tier}
            reducedMotion={reducedMotion}
            onSalir={salir}
            onProgreso={onProgreso}
          />
        </IrisOdyssey>
      )}
    </section>
  );
}
