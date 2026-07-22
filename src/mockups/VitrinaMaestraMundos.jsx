/*
 * VitrinaMaestraMundos — la PUERTA MAESTRA a todos los mundos 3D de Chagra.
 *
 * REINVENCIÓN COMPLETA (feedback operador 2026-07-14: "está feíta, bien feíta,
 * merece una reinvención completa; lo único que sirve son los efectos de
 * entrada"). QUÉ ES AHORA: un MIRADOR ANDINO REALISTA a la hora dorada — el
 * lugar desde donde se ven los quince mundos de la finca. Registro visual del
 * proyecto: los MUNDOS van realistas (los personajes rubber-hose viven en el
 * chrome DOM y en la fauna ambiental, nunca dentro del paisaje).
 *
 * LO QUE SE CONSERVÓ (lo único aprobado — los efectos de entrada):
 *   · El viaje Odyssey de cámara: dolly a la boca con FOV 46→15 en curva k²
 *     (succión de túnel) y regreso en √k (bocanada). CamaraVitrina INTACTA.
 *   · El IRIS del TransicionMundoKit con su contrato onMitad (swap bajo velo).
 *   · La picada del avatar al centro del portal durante el cruce.
 *   · La máquina de fases galeria → acercando → mundo → saliendo.
 *
 * LO QUE SE REINVENTÓ (aplicando el DR realismo-3d-vegetacion 2026-06-19):
 *   · Cielo: DOMO con gradiente horneado (horizonte ámbar → cénit azul), no un
 *     color plano de fondo.
 *   · Cordilleras: CRESTAS fractales con perspectiva atmosférica y nieve en la
 *     capa lejana — no lomas de esfera.
 *   · Terreno: pradera CONTINUA ondulada por ruido con parches de color por
 *     vértice, plaza pisada y sendero de entrada — no un disco verde plano.
 *   · Árboles: las especies REALES del bosque altoandino (roble, aliso, gaque,
 *     encenillo, yarumo) de floraParamo.geom — siluetas irregulares, copas con
 *     huecos, color horneado con gradiente de altura, variación por instancia.
 *     (De paso se cazó el bug que las tenía INVISIBLES: mergeGeometries null.)
 *   · Portales: arcos de PIEDRA SECA campesina (dovelas individuales con
 *     jitter, AO radial horneado, musgo en las juntas) — no aros de parque
 *     temático. Un InstancedMesh para los 12.
 *   · Viñetas: DIORAMAS realistas horneados en una geometría por mundo (el
 *     cafetal con surcos, los frailejones con su enagua, la cresta nevada) —
 *     12 draw-calls estáticas, CERO useFrame por viñeta (antes eran 12 loops).
 *
 * SEGUNDO PASE (encargo del operador 2026-07-16: "validar que la entrada a los
 * portales se lea clara y no apelotonada"). Antes: DOS filas de 6 arcos casi
 * pegados que se montaban una sobre otra. Ahora el mirador es una MONTAÑA:
 * CUATRO TERRAZAS por PISO TÉRMICO que suben del cálido al páramo — el ojo
 * entiende "subo la montaña, cambian los mundos".
 *   · PISOS es la fuente de verdad (mundo→piso, colores, ángulos, terraza).
 *   · Cada fila se asienta en su BANCAL (geomBancales: andén campesino con
 *     talud de tierra viva) y las filas se intercalan en pantalla (stagger).
 *   · Se sumaron los mundos nuevos del carril app-3d: cacao (cálido), papa
 *     (tierra fría) y abejas (templado) — 15 portales, cada uno con su
 *     diorama horneado.
 *   · Los chips y la rejilla 2D se agrupan por piso térmico con su etiqueta.
 *
 * MÁXIMO UN CANVAS VIVO: la galería muestra dioramas horneados, no las escenas
 * reales. El mundo real se monta por lazy import SOLO al cruzar, cuando el
 * Canvas de la vitrina ya se desmontó bajo el iris (contrato onMitad del kit).
 *
 * TÉCNICA / GAMA BAJA: MeshLambert + vertexColors, sin sombras ni post; dpr
 * por tier; una draw-call por especie/pieza; tier 'medio' recorta cantidades y
 * detalle (q), no ideas. Tier 'bajo' NI monta el Canvas: rejilla DOM digna.
 * prefers-reduced-motion: sin dolly ni deriva; el mirador posa quieto.
 *
 * Mockup standalone con su propio <Canvas>. NO toca App.jsx ni mundoData.
 */
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import TransicionMundoKit from '../visual/mundo3d/TransicionMundoKit.jsx';
import { FaunaAmbiental } from '../visual/creatures/FaunaAmbiental.jsx';
import { EntFrailejon } from '../visual/creatures/EntFrailejon.jsx';
import useAvatarCreature from '../hooks/useAvatarCreature.js';
import {
  PALM,
  geomCieloDomo,
  geomCordilleras,
  geomTerreno,
  geomQuebrada,
  geomPiedrasQuebrada,
  geomArcoPiedra,
  geomLajasSendero,
  geomLomitas,
  geomBancales,
  alturaTerreno,
  CAUCE_QUEBRADA,
} from '../visual/mundo3d/vitrina/miradorAndino.geom.js';
import { geomVineta } from '../visual/mundo3d/vitrina/vinetasMundos.geom.js';
import {
  geomRoble,
  geomAliso,
  geomGaque,
  geomEncenillo,
  calidadDeTier,
} from '../visual/mundo3d/bosque/floraParamo.geom.js';
import { rng } from '../visual/mundo3d/bosque/entQuenua.geom.js';
import usePerfilFincaStore from '../store/usePerfilFincaStore.js';
import { COPY_VITRINA_PERFIL, estadoMundoVitrina } from './vitrinaPerfil.js';

/* EL VALLE VIVO en la galería: los personajes asoman ENTRE los mundos, desde
   los bordes (nunca sobre los portales ni el chrome), hacen su giño lejano y
   se van. Pool rotativo tier-safe; se pausa durante el viaje de túnel. */
const PUNTOS_FAUNA_VITRINA = [
  { estilo: { left: '2.5%', bottom: '30%' }, tam: 44, lado: 'izq' },
  { estilo: { right: '3%', bottom: '36%' }, tam: 40, voltear: true, lado: 'der' },
  { estilo: { left: '14%', top: '24%' }, tam: 30, lado: 'bosque' },
];

/* ══════════════════════════════════════════════════════════════════════════
   LOS QUINCE MUNDOS — datos de la vitrina + importadores perezosos
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
  paramo: () => import('../visual/mundo3d/bosque/MundoEntBosque.jsx'), // el páramo definitivo (el viejo quedó en _archivo/)
  bosque: () => import('./BosqueTresEstratos3D.jsx'),
  suelo: () => import('./MundoSueloVivo3D.jsx'),
  lluvia: () => import('./ValleLluvia3D.jsx'),
  sierra: () => import('../visual/mundo3d/VistaGlobalSierra.jsx'),
  cacao: () => import('./CacaoVivo3D.jsx'),
  papa: () => import('./PapaVivo3D.jsx'),
  abejas: () => import('./MundoAbejas3D.jsx'),
};

/* React 19 exige que lazy() resuelva a `{ default: Componente }` — devolver el
   componente pelado (el `m.default || m` heredado) tronaba TODO cruce con
   "Lazy element type must resolve to a class or function" (cazado 2026-07-15). */
const COMPONENTES = /** @type {Record<string, import('react').ComponentType<any>>} */ (
  Object.fromEntries(
    Object.entries(IMPORTADORES).map(([id, imp]) => [
      id,
      lazy(() => imp().then((m) => ({ default: (/** @type {any} */ (m)).default || m }))),
    ]),
  )
);

/* LOS PISOS TÉRMICOS — la fuente de verdad de la vitrina. El mirador es una
   MONTAÑA: cuatro terrazas que suben del cálido al páramo. Cada piso define
   su terraza (radio, cota del aro, escala de compensación por distancia y los
   ángulos del abanico — intercalados con la fila de abajo para que en pantalla
   ningún arco se monte sobre otro). El orden dentro de `mundos` ES el arco de
   izquierda a derecha; colorA/colorB alimentan el iris del cruce, la brasa,
   los chips y la rejilla 2D — no el paisaje. */
const PISOS = [
  {
    id: 'calido',
    nombre: 'Tierra cálida',
    lema: 'el plan del río',
    icono: '☀️',
    color: '#c97a2e',
    radio: 6.2,
    alturaAro: 0.85,
    escala: 1,
    angulos: [-45, -15, 15, 45],
    mundos: [
      { id: 'cacao', titulo: 'El cacao', emoji: '🍫', colorA: '#c9873c', colorB: '#3a2416' },
      { id: 'mercado', titulo: 'El mercado', emoji: '🧺', colorA: '#e0a458', colorB: '#4a2c18' },
      { id: 'animales', titulo: 'Los animales', emoji: '🐔', colorA: '#d9a066', colorB: '#3f2a1a' },
      { id: 'compost', titulo: 'El compost', emoji: '🍂', colorA: '#8a6a3a', colorB: '#241a0e' },
    ],
  },
  {
    id: 'templado',
    nombre: 'Tierra templada',
    lema: 'la ladera del café',
    icono: '🌿',
    color: '#7a9a3f',
    radio: 9.3,
    alturaAro: 2.8,
    escala: 1.06,
    angulos: [-50, -25, 0, 25, 50],
    mundos: [
      { id: 'cafe', titulo: 'El café', emoji: '☕', colorA: '#c96a2f', colorB: '#3a2416' },
      { id: 'sanidad', titulo: 'La sanidad', emoji: '🐞', colorA: '#f2c531', colorB: '#2e4020' },
      { id: 'valle', titulo: 'El valle', emoji: '🏡', colorA: '#f2c063', colorB: '#1d4030' },
      { id: 'abejas', titulo: 'Las abejas', emoji: '🐝', colorA: '#e8b83a', colorB: '#3a2c14' },
      { id: 'semillero', titulo: 'El semillero', emoji: '🌱', colorA: '#9fc46a', colorB: '#25391c' },
    ],
  },
  {
    id: 'frio',
    nombre: 'Tierra fría',
    lema: 'la tierra de la papa',
    icono: '🌬️',
    color: '#6f96a0',
    radio: 12.0,
    alturaAro: 4.75,
    escala: 1.18,
    angulos: [-42, -14, 14, 42],
    mundos: [
      { id: 'papa', titulo: 'La papa', emoji: '🥔', colorA: '#b28a52', colorB: '#2e2618' },
      { id: 'suelo', titulo: 'El suelo vivo', emoji: '🪱', colorA: '#a97b4f', colorB: '#2b1d10' },
      { id: 'bosque', titulo: 'El bosque de tres pisos', emoji: '🌳', colorA: '#4e7a46', colorB: '#1b2b1a' },
      { id: 'agua', titulo: 'El agua', emoji: '💧', colorA: '#7db8d4', colorB: '#1e3a4f' },
      { id: 'lluvia', titulo: 'La lluvia', emoji: '🌧️', colorA: '#9fb3c8', colorB: '#26323f' },
    ],
  },
  {
    id: 'paramo',
    nombre: 'El páramo',
    lema: 'donde nace el agua',
    icono: '⛰️',
    color: '#8fa6b4',
    radio: 14.0,
    alturaAro: 6.4,
    escala: 1.3,
    angulos: [-26, 26],
    mundos: [
      { id: 'paramo', titulo: 'El páramo', emoji: '🌫️', colorA: '#aec7cf', colorB: '#2a3b40' },
      { id: 'sierra', titulo: 'La Sierra', emoji: '🏔️', colorA: '#e8ddc0', colorB: '#274035' },
    ],
  },
];

/* Un piso con más mundos que ángulos es un bug de datos: TRONAR al montar. */
for (const piso of PISOS) {
  if (piso.angulos.length !== piso.mundos.length) {
    throw new Error(`VitrinaMaestraMundos: piso "${piso.id}" tiene ${piso.mundos.length} mundos y ${piso.angulos.length} ángulos`);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   GEOMETRÍA DE LA GALERÍA — arcos, poses y bocas (constantes de módulo)
   ══════════════════════════════════════════════════════════════════════════ */

/* Hacia dónde miran los portales: un punto entre el centro y la cámara. */
const CENTRO_MIRA = new THREE.Vector3(0, 1.3, 9);

const POSE_GALERIA = {
  pos: new THREE.Vector3(0, 4.1, 14.6),
  mira: new THREE.Vector3(0, 2.9, -2.5),
  fov: 47,
};
/* En PORTRAIT el FOV horizontal se estrangula (hFov = f(vFov·aspecto)) y el
   arco de portales queda fuera de cuadro: la pose de galería se adapta —
   más FOV y cámara más atrás — para que la montaña completa quepa parada. */
const POSE_GALERIA_ANGOSTA = {
  pos: new THREE.Vector3(0, 4.7, 23.0),
  mira: new THREE.Vector3(0, 3.5, -2.5),
  fov: 63,
};
const poseGaleria = (aspecto) => (aspecto < 0.9 ? POSE_GALERIA_ANGOSTA : POSE_GALERIA);
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
   (donde la cámara "mete la cara" al portal: FOV 15, mirando a la garganta).
   La escala del piso compensa la distancia (los arcos altos no se achican
   hasta perderse) y estira el dolly en la misma proporción. */
function armarPortal(def, piso, anguloGrados) {
  const a = THREE.MathUtils.degToRad(anguloGrados);
  const pos = new THREE.Vector3(Math.sin(a) * piso.radio, piso.alturaAro, -Math.cos(a) * piso.radio);
  const dir = new THREE.Vector3(CENTRO_MIRA.x - pos.x, 0, CENTRO_MIRA.z - pos.z).normalize();
  const rotY = Math.atan2(dir.x, dir.z);
  const boca = {
    pos: new THREE.Vector3().copy(pos).addScaledVector(dir, 1.55 * piso.escala),
    mira: new THREE.Vector3().copy(pos).addScaledVector(dir, -0.6),
  };
  return {
    ...def,
    pos: [pos.x, pos.y, pos.z],
    rotY,
    boca,
    escala: piso.escala,
    atras: piso.alturaAro > 2,
    pisoId: piso.id,
    pisoNombre: piso.nombre,
  };
}

const PORTALES = PISOS.flatMap((piso) =>
  piso.mundos.map((def, i) => armarPortal(def, piso, piso.angulos[i])),
);
const PORTAL_POR_ID = Object.fromEntries(PORTALES.map((p) => [p.id, p]));

/* Los bancales (andenes) de los pisos ALTOS, derivados de PISOS: el piso del
   andén queda donde el arco apoya su laja de umbral. El cálido vive en la
   plaza, sin bancal. */
const BASE_ARCO = 1.14; // del centro del aro a su laja (geomArcoPiedra)
const ARCOS_BANCAL = [64, 56, 40]; // medio-ángulo del abanico por piso alto
const FILAS_BANCAL = PISOS.slice(1).map((piso, i) => {
  const altura = piso.alturaAro - BASE_ARCO * piso.escala;
  const alturaPrev = i === 0 ? 0 : PISOS[i].alturaAro - BASE_ARCO * PISOS[i].escala;
  return {
    radio: piso.radio,
    altura,
    caida: altura - alturaPrev + 0.55, // el talud se hunde en el andén de abajo
    arco: ARCOS_BANCAL[i],
  };
});

/* Lomitas que rematan el corte de cada bancal (el andén no termina en muro
   seco) — una a cada punta del abanico. */
const LOMITAS_REMATE = FILAS_BANCAL.flatMap((f) => {
  const a = THREE.MathUtils.degToRad(f.arco);
  return [-1, 1].map((lado) => [Math.sin(a) * f.radio * lado, f.altura - 1.0, -Math.cos(a) * f.radio]);
});

/* ══════════════════════════════════════════════════════════════════════════
   CÁMARA — el viaje Odyssey de la vitrina (INTACTO: es lo aprobado)
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
    const pose = poseGaleria(/** @type {any} */ (camera).aspect ?? 1);
    const entra = fase === 'acercando';
    const sale = fase === 'saliendo';
    if ((entra || sale) && boca) {
      a.t = Math.min(1, a.t + (reducedMotion ? 1 : Math.min(dt, 0.05) / VIAJE_S));
      const k = suavizar(a.t);
      const posDesde = entra ? pose.pos : boca.pos;
      const posHasta = entra ? boca.pos : pose.pos;
      const miraDesde = entra ? pose.mira : boca.mira;
      const miraHasta = entra ? boca.mira : pose.mira;
      camera.position.lerpVectors(posDesde, posHasta, k);
      TMP_MIRA.lerpVectors(miraDesde, miraHasta, k);
      camera.lookAt(TMP_MIRA);
      /* FOV con curva k² al entrar (se estrecha tarde: succión de túnel) y
         √k al salir (se abre pronto: bocanada de aire) — la ley Odyssey. */
      const kFov = entra ? k * k : Math.sqrt(k);
      const fovDesde = entra ? pose.fov : FOV_BOCA;
      const fovHasta = entra ? FOV_BOCA : pose.fov;
      aplicarFov(camera, fovDesde + (fovHasta - fovDesde) * kFov);
      if (a.t >= 1 && !a.avisado) {
        a.avisado = true;
        llegadaRef.current?.(fase);
      }
    } else if (fase === 'galeria' || !boca) {
      /* Órbita viva: vaivén determinista de brisa; la cámara es del director. */
      const t = reducedMotion ? 0 : state.clock.elapsedTime;
      camera.position.set(
        pose.pos.x + Math.sin(t * 0.14) * 0.5,
        pose.pos.y + Math.sin(t * 0.1) * 0.18,
        pose.pos.z + Math.cos(t * 0.12) * 0.35,
      );
      camera.lookAt(pose.mira);
      aplicarFov(camera, pose.fov);
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
   EL PAISAJE — cielo, cordilleras, pradera, quebrada (geoms horneadas)
   ══════════════════════════════════════════════════════════════════════════ */

/* Materiales de módulo (compartidos, nunca por frame). El paisaje lambertiano
   recibe la luz dorada; el cielo y el agua llevan su color horneado sin luz. */
const MAT_PAISAJE = new THREE.MeshLambertMaterial({ vertexColors: true });
const MAT_HORNEADO = new THREE.MeshBasicMaterial({ vertexColors: true });
const MAT_CIELO = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false });
/* Cordilleras: la perspectiva atmosférica va HORNEADA — el fog encima la
   lavaba a beige plano. Sin fog, la receta del DR se ve tal cual se horneó. */
const MAT_CORDILLERA = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });

/* El domo + el sol bajo + nubes largas de tarde a la deriva. */
function CieloMirador({ animada }) {
  const nubes = useRef([]);
  const geoDomo = useMemo(() => geomCieloDomo(), []);
  useLayoutEffect(() => () => geoDomo.dispose(), [geoDomo]);
  useFrame((state) => {
    if (!animada) return;
    const t = state.clock.elapsedTime;
    nubes.current.forEach((g, i) => {
      if (g) g.position.x = g.userData.x + Math.sin(t * 0.02 + i * 2) * 3.2;
    });
  });
  return (
    <group>
      <mesh geometry={geoDomo} material={MAT_CIELO} />
      {/* el sol de la hora dorada, con su halo velado */}
      <mesh position={[13, 8.2, -44]}>
        <circleGeometry args={[3.6, 24]} />
        <meshBasicMaterial color="#fbe7b4" fog={false} />
      </mesh>
      <mesh position={[13, 8.2, -44.5]}>
        <circleGeometry args={[8.0, 24]} />
        <meshBasicMaterial color="#f4d493" transparent opacity={0.4} fog={false} depthWrite={false} />
      </mesh>
      {/* nubes estiradas de tarde (lamina alta, no algodón) */}
      {[
        { x: -15, y: 11, z: -42, s: 1.5, op: 0.5 },
        { x: 10, y: 13.5, z: -40, s: 1.1, op: 0.38 },
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
          {[[-3.2, 0, 2.2], [0, 0.3, 3.0], [3.4, -0.1, 2.4]].map(([x, y, r], j) => (
            <mesh key={j} position={[x, y, 0]} scale={[2.2, 0.4, 1]}>
              <sphereGeometry args={[r, 8, 6]} />
              <meshBasicMaterial color="#f7ecd6" transparent opacity={n.op} fog={false} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* La pradera + cordilleras + quebrada + sendero, todas geoms horneadas. */
function PaisajeMirador({ tier }) {
  const geos = useMemo(
    () => ({
      cordilleras: geomCordilleras(),
      terreno: geomTerreno({ segmentos: tier === 'alto' ? 64 : 44 }),
      quebrada: geomQuebrada(),
      piedras: geomPiedrasQuebrada(),
      lajas: geomLajasSendero(),
      /* los andenes de la montaña + las lomitas que rematan sus cortes */
      bancales: geomBancales(FILAS_BANCAL),
      lomitas: geomLomitas(/** @type {[number, number, number][]} */ (LOMITAS_REMATE)),
    }),
    [tier],
  );
  useLayoutEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);
  return (
    <group>
      {/* cordilleras HORNEADAS sin luz ni fog: la perspectiva atmosférica ya
          vive en sus vertexColors — Lambert las apagaba, el fog las lavaba */}
      <mesh geometry={geos.cordilleras} material={MAT_CORDILLERA} />
      <mesh geometry={geos.terreno} material={MAT_PAISAJE} />
      <mesh geometry={geos.bancales} material={MAT_PAISAJE} />
      <mesh geometry={geos.lomitas} material={MAT_PAISAJE} />
      <mesh geometry={geos.quebrada} material={MAT_HORNEADO} />
      <mesh geometry={geos.piedras} material={MAT_PAISAJE} />
      <mesh geometry={geos.lajas} material={MAT_PAISAJE} />
    </group>
  );
}

/* Destellos que VIAJAN aguas abajo por el cauce — el agua corre. */
const TMP_GOTA = new THREE.Vector3();
function DestellosQuebrada({ animada }) {
  const destellos = useRef([]);
  useFrame((state) => {
    if (!animada) return;
    const t = state.clock.elapsedTime;
    destellos.current.forEach((m, i) => {
      if (!m) return;
      const k = (t * 0.07 + i / 4) % 1;
      const f = k * (CAUCE_QUEBRADA.length - 1);
      const seg = Math.min(CAUCE_QUEBRADA.length - 2, Math.floor(f));
      const [x0, z0] = CAUCE_QUEBRADA[seg];
      const [x1, z1] = CAUCE_QUEBRADA[seg + 1];
      TMP_GOTA.set(x0 + (x1 - x0) * (f - seg), 0.09, z0 + (z1 - z0) * (f - seg));
      m.position.copy(TMP_GOTA);
      m.material.opacity = 0.8 * Math.sin(k * Math.PI);
    });
  });
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(m) => (destellos.current[i] = m)} position={[0, 0.09, -9 + i * 4]}>
          <sphereGeometry args={[0.06, 6, 5]} />
          <meshBasicMaterial color="#f2fbff" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ÁRBOLES — el bosque altoandino real, instanciado con variación
   ══════════════════════════════════════════════════════════════════════════ */

/* Un banco de matas de UNA especie: una geometría, un material, N instancias
   con giro/escala/tinte deterministas (DR: variación por instancia). */
function Especie({ geo, items }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !items.length) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      p.set(it.pos[0], it.pos[1], it.pos[2]);
      e.set(0, it.rotY, (it.ladeo ?? 0));
      q.setFromEuler(e);
      s.set(it.escala * (it.anchoExtra ?? 1), it.escala, it.escala * (it.anchoExtra ?? 1));
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      col.setRGB(it.tint[0], it.tint[1], it.tint[2]);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);
  if (!geo || !items.length) return null;
  return <instancedMesh ref={ref} args={[geo, MAT_PAISAJE, items.length]} frustumCulled={false} />;
}

/* Bosquetes: los árboles se AGRUPAN (DR: agrupamiento y claros, no cuadrícula).
   Zonas seguras: flancos del claro, marco del primer plano y los REMATES de
   los andenes (con su cota `y` sobre el bancal — el terreno de atrás quedó
   debajo de las terrazas). Jamás sobre la plaza ni delante de un arco. */
const ZONAS_ARBOLEDA = [
  { cx: -13.5, cz: 4.5, radio: 4.2, n: 7 }, // bosquete del flanco izquierdo
  { cx: 13.5, cz: 4.0, radio: 4.2, n: 7 }, // bosquete del flanco derecho
  { cx: -11, cz: 9.5, radio: 2.6, n: 3 }, // marco del primer plano (izq)
  { cx: 11.5, cz: 9.0, radio: 2.6, n: 3 }, // marco del primer plano (der)
  // arbolitos bajos a la orilla de la plaza: vida sin tapar ningún arco
  { cx: -9.8, cz: -1.6, radio: 1.5, n: 3, s: 0.7 },
  { cx: 9.8, cz: -1.6, radio: 1.5, n: 3, s: 0.7 },
];

function ArbolesMirador({ tier }) {
  const q = calidadDeTier(tier);
  const geos = useMemo(
    () => ({
      roble: geomRoble({ q }, 4),
      aliso: geomAliso({ q }, 6),
      gaque: geomGaque({ q }, 7),
      encenillo: geomEncenillo({ q }, 5),
    }),
    [q],
  );
  useLayoutEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  const items = useMemo(() => {
    const r = rng(1717);
    // sin yarumo: su sombrilla plateada lee "antena" a esta distancia
    const especies = ['roble', 'aliso', 'gaque', 'encenillo'];
    /** @type {Record<string, Array<any>>} */
    const porEspecie = { roble: [], aliso: [], gaque: [], encenillo: [] };
    const factor = tier === 'alto' ? 1 : 0.6;
    for (const zona of ZONAS_ARBOLEDA) {
      const n = Math.max(2, Math.round(zona.n * factor));
      // cada bosquete tiene una especie DOMINANTE y acompañantes (agrupamiento)
      const dominante = especies[Math.floor(r() * especies.length)];
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2;
        const rad = Math.sqrt(r()) * zona.radio;
        const x = zona.cx + Math.cos(a) * rad;
        const z = zona.cz + Math.sin(a) * rad * 0.85;
        const esp = r() < 0.6 ? dominante : especies[Math.floor(r() * especies.length)];
        const tintK = 1.15 + r() * 0.4; // tinte por instancia (rompe lo idéntico y levanta el verde al sol)
        porEspecie[esp].push({
          /* sobre un andén la zona trae su cota; en el claro manda el terreno */
          pos: [x, (zona.y ?? alturaTerreno(x, z)) - 0.05, z],
          rotY: r() * Math.PI * 2,
          ladeo: (r() - 0.5) * 0.06,
          escala: (1.0 + r() * 0.9) * (zona.s ?? 1),
          anchoExtra: 0.92 + r() * 0.16,
          tint: [tintK, tintK * (0.96 + r() * 0.08), tintK * (0.92 + r() * 0.1)],
        });
      }
    }
    return porEspecie;
  }, [tier]);

  return (
    <group>
      <Especie geo={geos.roble} items={items.roble} />
      <Especie geo={geos.aliso} items={items.aliso} />
      <Especie geo={geos.gaque} items={items.gaque} />
      <Especie geo={geos.encenillo} items={items.encenillo} />
    </group>
  );
}

/* Chispa redonda para las luciérnagas (CanvasTexture runtime, sin assets):
   sin textura, <points> pinta CUADRADOS. */
function texturaChispa() {
  const s = 32;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,240,200,0.7)');
  g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Luciérnagas doradas de la tarde (1 draw call; el group ondula entero). */
function Luciernagas({ tier, animada }) {
  const grupo = useRef(null);
  const n = tier === 'alto' ? 48 : 24;
  const mapa = useMemo(() => texturaChispa(), []);
  useLayoutEffect(() => () => mapa.dispose(), [mapa]);
  const posiciones = useMemo(() => {
    const r = rng(909);
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      const a = r() * Math.PI * 2;
      const rad = 3 + r() * 8.5;
      arr[i * 3] = Math.sin(a) * rad;
      arr[i * 3 + 1] = 0.4 + r() * 3.0;
      arr[i * 3 + 2] = -Math.cos(a) * rad * 0.9 + 1;
    }
    return arr;
  }, [n]);

  useFrame((state) => {
    if (!animada || !grupo.current) return;
    const t = state.clock.elapsedTime;
    grupo.current.position.y = Math.sin(t * 0.4) * 0.25;
    grupo.current.rotation.y = Math.sin(t * 0.1) * 0.12;
  });

  return (
    <group ref={grupo}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[posiciones, 3]} />
        </bufferGeometry>
        <pointsMaterial map={mapa} color="#ffe9b0" size={0.14} sizeAttenuation transparent opacity={0.75} depthWrite={false} />
      </points>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PORTAL — arco de piedra seca + diorama horneado + brasa que llama
   ══════════════════════════════════════════════════════════════════════════ */

/* El arco es UNA geometría instanciada 15 veces (misma cantera). */
function ArcosPiedra({ tier }) {
  const q = calidadDeTier(tier);
  const geo = useMemo(() => geomArcoPiedra({ q }, 88), [q]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const ref = useRef(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const e = new THREE.Euler();
    const qt = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    PORTALES.forEach((portal, i) => {
      p.set(portal.pos[0], portal.pos[1], portal.pos[2]);
      e.set(0, portal.rotY, portal.atras ? -0.02 : 0.02);
      qt.setFromEuler(e);
      s.setScalar(portal.escala); // los pisos altos compensan la distancia
      m.compose(p, qt, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  return <instancedMesh ref={ref} args={[geo, MAT_PAISAJE, PORTALES.length]} frustumCulled={false} />;
}

function PortalMundo({ portal, elegido, interactivo, tier, estado, onElegir, onSenalar }) {
  const halo = useRef(null);
  const q = calidadDeTier(tier);
  const geoVineta = useMemo(() => geomVineta(portal.id, { q }), [portal.id, q]);
  useLayoutEffect(() => () => geoVineta.dispose(), [geoVineta]);

  /* La brasa del umbral respira; si es el elegido, se enciende (la promesa).
     Único useFrame por portal — las viñetas son geometría horneada, quieta. */
  useFrame((state) => {
    const h = halo.current;
    if (!h) return;
    const t = state.clock.elapsedTime;
    const base = elegido ? 1.5 : 0.32;
    h.emissiveIntensity = base + Math.sin(t * 1.7 + portal.rotY * 3) * 0.1;
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
    <group
      position={portal.pos}
      rotation={[0, portal.rotY, portal.atras ? -0.02 : 0.02]}
      scale={portal.escala}
    >
      {/* garganta de sombra tras el diorama (profundidad de la boca) */}
      <mesh position={[0, 0, -0.55]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.9, 16, 1, true]} />
        <meshLambertMaterial color="#241f18" side={THREE.BackSide} />
      </mesh>
      {/* EL DIORAMA horneado del mundo, llenando la boca del arco */}
      <mesh geometry={geoVineta} material={MAT_HORNEADO} scale={[1.06, 1.06, 1]} />
      {/* la brasa del umbral: un aro fino que respira con el color del mundo */}
      <mesh position={[0, 0, 0.045]}>
        <torusGeometry args={[0.78, 0.016, 5, 26]} />
        <meshLambertMaterial
          ref={halo}
          color={portal.colorA}
          emissive={portal.colorA}
          emissiveIntensity={0.32}
        />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <torusGeometry args={[0.9, estado === 'conocer' ? 0.025 : 0.04, 5, 26]} />
        <meshBasicMaterial
          color={estado === 'propio' ? '#3f8f4e' : estado === 'agregado' ? '#397f9f' : '#d49a35'}
          transparent
          opacity={estado === 'conocer' ? 0.72 : 0.95}
        />
      </mesh>
      {/* la VENTANA ENTERA es el botón: blanco de toque invisible y generoso */}
      <mesh position={[0, 0, 0.1]} onClick={alTocar} onPointerOver={manito} onPointerOut={normal}>
        <circleGeometry args={[0.95, 18]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   GALERÍA — la montaña completa con las cuatro terrazas de pisos térmicos
   ══════════════════════════════════════════════════════════════════════════ */

function GaleriaVitrina({ elegidoId, interactivo, tier, reducedMotion, estados, onElegir, onSenalar }) {
  const animada = !reducedMotion;
  return (
    <group>
      {/* la niebla arranca DETRÁS del páramo (r≈14, cám a ~20): los dioramas
          de los pisos altos se leen nítidos; la bruma queda para cordilleras */}
      <fog attach="fog" args={[PALM.neblina, 30, 62]} />
      {/* la luz de la hora dorada: el sol rasante ILUMINA lo que la cámara ve
          (clave cálida desde el frente-derecha) + contraluz que separa copas */}
      <hemisphereLight args={['#d9e2e8', '#54503a', 1.05]} />
      <directionalLight position={[11, 9, 9]} intensity={1.2} color="#ffd9a2" />
      <directionalLight position={[-7, 7, -14]} intensity={0.4} color="#e8c890" />

      <CieloMirador animada={animada} />
      <PaisajeMirador tier={tier} />
      <DestellosQuebrada animada={animada} />
      <ArbolesMirador tier={tier} />
      <Luciernagas tier={tier} animada={animada} />

      {/* los quince arcos de piedra seca (una cantera, un InstancedMesh) */}
      <ArcosPiedra tier={tier} />

      {/* cada boca: su diorama + su brasa + su blanco de toque */}
      {PORTALES.map((p) => (
        <PortalMundo
          key={p.id}
          portal={p}
          elegido={elegidoId === p.id}
          interactivo={interactivo}
          tier={tier}
          estado={estados[p.id] || 'conocer'}
          onElegir={onElegir}
          onSenalar={onSenalar}
        />
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
  background: linear-gradient(${PALM.cieloCenit} 0%, ${PALM.cieloHorizonte} 70%, ${PALM.pastoBase} 100%);
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
  z-index: 3; /* los chips por piso van SOBRE el Ent decorativo (z 2) */
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
/* mientras el avatar cruza, su puesto del chrome queda vacío al instante */
.vmx-raiz[data-fase='acercando'] .vmx-abeja,
.vmx-raiz[data-viaje='1'] .vmx-abeja { opacity: 0; }

/* ── el avatar ENTRA al mundo: la picada hacia la boca del portal ──
   El dolly centra el portal elegido en pantalla; el avatar sale de su puesto
   (arriba a la derecha), traza un arco y se clava en el centro encogiéndose
   hasta desaparecer — mismo pulso del viaje (1.25 s), ease-in de succión. */
.vmx-abeja-cruce {
  position: absolute;
  top: 18px;
  right: 20px;
  z-index: 30;
  pointer-events: none;
  filter: drop-shadow(0 3px 4px rgba(58, 42, 24, 0.3));
  animation: vmx-picada 1250ms cubic-bezier(0.55, -0.15, 0.8, 0.5) forwards;
}
@keyframes vmx-picada {
  0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
  45% { transform: translate(calc(-25vw + 20px), calc(18dvh)) scale(0.85) rotate(-24deg); opacity: 1; }
  100% { transform: translate(calc(-50vw + 52px), calc(50dvh - 48px)) scale(0.04) rotate(-80deg); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .vmx-abeja-cruce { display: none; }
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
  gap: 10px;
  overflow-x: auto;
  padding: 4px 2px 6px;
  pointer-events: auto;
  scrollbar-width: thin;
}
/* cada piso térmico agrupa sus chips en una banda tintada con su color */
.vmx-chips__grupo {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px 5px 12px;
  border: 1.5px solid rgba(122, 90, 56, 0.25);
  border-radius: 999px;
}
.vmx-chips__piso {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #4a3520;
  white-space: nowrap;
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
.vmx-chip-wrap {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border-radius: 999px;
  background: rgba(255, 249, 235, 0.54);
}
.vmx-chip-wrap[data-estado='propio'] { box-shadow: inset 0 0 0 2px rgba(63,143,78,0.7); }
.vmx-chip-wrap[data-estado='agregado'] { box-shadow: inset 0 0 0 2px rgba(57,127,159,0.75); }
.vmx-estado {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border: 0;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.72rem;
  font-weight: 850;
  white-space: nowrap;
}
.vmx-estado--propio { background: #dcebd9; color: #285f34; }
.vmx-estado--agregado { background: #d9ebf0; color: #285f76; cursor: pointer; }
.vmx-estado--conocer { background: #f5dfae; color: #674612; cursor: pointer; }
.vmx-estado:focus-visible { outline: 3px solid #fff8ea; outline-offset: 2px; }
.vmx-leyenda {
  align-self: center;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 7px 12px;
  border-radius: 14px;
  background: rgba(255,249,235,0.9);
  color: #4a3520;
  font-size: 0.76rem;
  font-weight: 750;
  box-shadow: 0 3px 12px rgba(58,42,24,0.14);
}
.vmx-leyenda b:first-child { color: #285f34; }
.vmx-leyenda b:last-child { color: #805814; }

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
   Agrupada por PISO TÉRMICO (la montaña leída de abajo hacia arriba); cada
   tarjeta lleva su VIÑETA CSS: el aro lleno con el cielo del mundo y el
   emoji flotando — la misma promesa de la ventana viva, en barato. */
.vmx-rejilla {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 132px 16px calc(20px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(${PALM.cieloCenit} 0%, ${PALM.cieloHorizonte} 55%, ${PALM.tierraPisada} 100%);
}
.vmx-piso { display: flex; flex-direction: column; gap: 10px; }
.vmx-piso__titulo {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 800;
  color: #3a2a18;
  line-height: 1.2;
  border-left: 5px solid var(--piso, #7a5a38);
  padding-left: 10px;
  text-shadow: 0 1px 0 rgba(255, 244, 214, 0.5);
}
.vmx-piso__titulo small {
  display: block;
  font-size: 0.78em;
  font-weight: 600;
  opacity: 0.75;
}
.vmx-piso__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
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
.vmx-tarjeta[data-estado='propio'] { box-shadow: 0 0 0 4px #dcebd9, 0 5px 14px rgba(58,42,24,0.24); }
.vmx-tarjeta[data-estado='agregado'] { box-shadow: 0 0 0 4px #d9ebf0, 0 5px 14px rgba(58,42,24,0.24); }
.vmx-tarjeta__entrada {
  appearance: none;
  border: 0;
  background: transparent;
  color: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font: inherit;
  cursor: pointer;
}
.vmx-tarjeta:hover, .vmx-tarjeta:focus-visible { transform: translateY(-3px); }
.vmx-tarjeta__aro {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  border: 7px solid ${PALM.piedra};
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

/* EL ENT DEL PÁRAMO — arraigado al borde inferior izquierdo, imponente y alto,
   presidiendo el mirador. Decorativo: jamás intercepta el toque de los
   portales. Se asoma desde abajo (no tapa el cielo ni los arcos). */
.vmx-ent {
  position: absolute;
  left: clamp(-40px, -2vw, 0px);
  bottom: -6px;
  width: min(38vw, 340px);
  max-height: 78vh;
  pointer-events: none;
  z-index: 2;
  filter: drop-shadow(0 10px 22px rgba(20, 32, 26, 0.4));
  animation: vmx-ent-entra 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.vmx-ent svg { width: 100%; height: auto; display: block; }
@keyframes vmx-ent-entra {
  from { transform: translateY(24px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
@media (max-width: 640px) {
  .vmx-ent { width: min(52vw, 220px); opacity: 0.85; }
}
@media (prefers-reduced-motion: reduce) {
  .vmx-ent { animation: none; }
}
`;

function AccionMundo({ estado, titulo, onAgregar, onQuitar }) {
  if (estado === 'propio') {
    return <span className="vmx-estado vmx-estado--propio">✓ Está en su finca</span>;
  }
  if (estado === 'agregado') {
    return (
      <button
        type="button"
        className="vmx-estado vmx-estado--agregado"
        onClick={onQuitar}
        aria-label={`Quitar ${titulo} de los mundos agregados`}
      >
        ✓ Agregado para conocer
      </button>
    );
  }
  return (
    <button
      type="button"
      className="vmx-estado vmx-estado--conocer"
      onClick={onAgregar}
      aria-label={COPY_VITRINA_PERFIL.ariaAgregar(titulo)}
    >
      {COPY_VITRINA_PERFIL.agregar}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EL MOCKUP — la máquina de fases del cruce maestro
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * VitrinaMaestraMundos — el mirador andino con el cruce túnel/Odyssey hacia
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
  const perfilFinca = usePerfilFincaStore((s) => s.perfil);
  const agregarMundo = usePerfilFincaStore((s) => s.agregarMundo);
  const quitarMundo = usePerfilFincaStore((s) => s.quitarMundo);
  /* EL CENTRAL MANDA: el avatar que la persona eligió (perfil/onboarding) es
     el protagonista de la vitrina — grande, pleno, al frente. Sin elección el
     hook cae a Angelita. El coro ambiental lo excluye del elenco. */
  const central = useAvatarCreature();
  const CuerpoCentral = central.Component;
  const [fase, setFase] = useState('galeria');
  const [viaje, setViaje] = useState(null); // null | 'entrar' | 'salir'
  const [mundoId, setMundoId] = useState(null);
  const [senalado, setSenalado] = useState(null);
  const [listo, setListo] = useState(false);

  const estados = useMemo(
    () => Object.fromEntries(PORTALES.map((p) => [p.id, estadoMundoVitrina(p.id, perfilFinca)])),
    [perfilFinca],
  );

  const sinCanvas = !permite3D(tier);
  const portal = mundoId ? PORTAL_POR_ID[mundoId] : null;

  const elegir = useCallback(
    (id) => {
      setMundoId(id);
      setSenalado(null);
      IMPORTADORES[/** @type {any} */ (id)]?.(); // precalentar el chunk: el dolly esconde la carga
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
      aria-label="Vitrina maestra: una montaña andina de cuatro pisos térmicos, con arcos de piedra que llevan a cada mundo 3D de la finca con un viaje de túnel"
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
            estados={estados}
            onElegir={elegir}
            onSenalar={senalar}
          />
        </Canvas>
      )}

      {/* gemela sin WebGL: la rejilla de tarjetas-portal (tier bajo), agrupada
          por piso térmico — la misma montaña, leída de abajo hacia arriba */}
      {sinCanvas && fase !== 'mundo' && (
        <div className="vmx-rejilla" aria-label="Los mundos de la finca, por piso térmico">
          {PISOS.map((piso) => (
            <section
              key={piso.id}
              className="vmx-piso"
              style={/** @type {import('react').CSSProperties} */ ({ '--piso': piso.color })}
            >
              <h3 className="vmx-piso__titulo">
                <span aria-hidden="true">{piso.icono}</span> {piso.nombre} <small>{piso.lema}</small>
              </h3>
              <div className="vmx-piso__grid" role="list">
                {piso.mundos.map((p) => (
                  <article
                    key={p.id}
                    role="listitem"
                    className="vmx-tarjeta"
                    data-estado={estados[p.id]}
                    style={{ background: `linear-gradient(160deg, ${p.colorA} 0%, ${p.colorB} 100%)` }}
                  >
                    <button
                      type="button"
                      className="vmx-tarjeta__entrada"
                      onClick={() => elegir(p.id)}
                      aria-label={`Entrar a ${p.titulo}`}
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
                    <AccionMundo
                      estado={estados[p.id]}
                      titulo={p.titulo}
                      onAgregar={() => agregarMundo(p.id)}
                      onQuitar={() => quitarMundo(p.id)}
                    />
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {fase !== 'mundo' && (
        <div className="vmx-chrome">
          <div className="vmx-cabecera">
            <h2 className="vmx-titulo">
              El mirador de los mundos
              <small>Del cálido al páramo: toque un arco y el túnel lo lleva</small>
            </h2>
            <div className="vmx-abeja">
              {/* Entrada HEROICA del CENTRAL (el avatar elegido; hoy Angelita):
                  expresividad plena — line-boil, polen y alitas de tul. El
                  protagonista se luce con todo el rubber-hose; el coro
                  ambiental, a lo lejos, jamás compite con él. */}
              <CuerpoCentral
                size={100}
                animo="pleno"
                energia={1}
                animated={!reducedMotion}
                lineBoil={!reducedMotion}
                polen={!reducedMotion}
                tier={tier}
              />
            </div>
          </div>
          <div className="vmx-pie">
            <div className="vmx-leyenda" aria-label="Cómo leer esta vitrina">
              <b>Verde: lo que usted tiene</b>
              <span aria-hidden="true">·</span>
              <b>Dorado: lo que puede conocer</b>
            </div>
            {defSenalado && (
              <p className="vmx-senal" role="status">
                {defSenalado.emoji} {defSenalado.titulo} — {defSenalado.pisoNombre.toLowerCase()} · toque para entrar
              </p>
            )}
            {!sinCanvas && (
              <div className="vmx-chips" role="list" aria-label="Entrar a un mundo, por piso térmico">
                {PISOS.map((piso) => (
                  <div
                    key={piso.id}
                    className="vmx-chips__grupo"
                    role="group"
                    aria-label={`${piso.nombre} — ${piso.lema}`}
                    style={{ background: `${piso.color}26`, borderColor: `${piso.color}55` }}
                  >
                    <span className="vmx-chips__piso" aria-hidden="true">
                      {piso.icono} {piso.nombre}
                    </span>
                    {piso.mundos.map((p) => (
                      <div
                        key={p.id}
                        role="listitem"
                        className="vmx-chip-wrap"
                        data-estado={estados[p.id]}
                      >
                        <button
                          type="button"
                          className="vmx-chip"
                          onClick={() => elegir(p.id)}
                          disabled={!enGaleria}
                        >
                          <span aria-hidden="true">{p.emoji}</span>
                          {p.titulo}
                        </button>
                        <AccionMundo
                          estado={estados[p.id]}
                          titulo={p.titulo}
                          onAgregar={() => agregarMundo(p.id)}
                          onQuitar={() => quitarMundo(p.id)}
                        />
                      </div>
                    ))}
                  </div>
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

      {/* El CENTRAL entra al mundo: el clon que hace la picada al centro del
          portal durante el cruce (el dolly deja la boca justo ahí). En tier
          bajo también vuela — el iris lo alcanza a mitad de picada. */}
      {!reducedMotion && fase !== 'mundo' && (fase === 'acercando' || viaje === 'entrar') && (
        <div className="vmx-abeja-cruce" aria-hidden="true">
          <CuerpoCentral size={100} animo="atento" energia={1} animated tier={tier} />
        </div>
      )}

      {/* El coro ambiental entre los mundos: personajes que vienen del bosque
          o de los costados, hacen su giño lejano y se van (solo el jaguar
          aparece mágico). Pausado durante el viaje — la GPU va en el dolly. */}
      {fase !== 'mundo' && (
        <FaunaAmbiental
          central={central.id}
          tier={tier}
          reducedMotion={reducedMotion}
          activo={enGaleria}
          puntos={PUNTOS_FAUNA_VITRINA}
        />
      )}

      {/* EL ENT DEL PÁRAMO — el árbol-guardián que vela el mirador. Presencia
          GRANDE e imponente, arraigada al borde: no compite con los portales
          (decorativo, no intercepta el toque), pero preside la escena como el
          corazón del Bosque Vivo. En tier bajo / RM queda en su pose digna. */}
      {enGaleria && (
        <div className="vmx-ent" aria-hidden="true">
          <EntFrailejon
            size={340}
            animated={!reducedMotion}
            ensena={!reducedMotion}
            lineBoil={!reducedMotion && tier === 'alto'}
            tier={tier}
          />
        </div>
      )}

      <div className="vmx-vineta" aria-hidden="true" />

      {/* el mundo real, montado solo cuando el Canvas de la vitrina ya no vive */}
      {fase === 'mundo' && MundoElegido && portal && (
        <div className="vmx-mundo">
          <Suspense
            fallback={
              <div
                className="vmx-telon"
                style={{ background: `linear-gradient(160deg, ${portal.colorB} 0%, ${portal.colorA} 140%)` }}
              >
                <span aria-hidden="true">{portal.emoji}</span>
                Entrando {portal.titulo.toLowerCase().startsWith('el ')
                  ? `al ${portal.titulo.toLowerCase().slice(3)}`
                  : `a ${portal.titulo.toLowerCase()}`}…
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
