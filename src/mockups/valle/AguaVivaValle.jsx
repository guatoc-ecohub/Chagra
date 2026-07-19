/*
 * AguaVivaValle — el AGUA VIVA del valle (backlog AoE #10).
 *
 * La quebrada ya cruza el valle; este componente cuenta EL RESTO de la
 * historia del agua de la finca:
 *
 *   1. EL HILO DEL PÁRAMO — el agua naciendo arriba, en el ojo de agua de la
 *      turbera entre frailejones, y bajando en un hilo por la ladera hasta
 *      entregarle a la quebrada. Se entiende de DÓNDE viene el agua.
 *   2. LAS ACEQUIAS QUE FLUYEN — la toma rústica en la quebrada, la acequia
 *      madre, compuertas de tablón donde el agua se reparte, y los ramales
 *      que llegan por gravedad a las eras, al invernadero, a la huerta y al
 *      reservorio. El agua se VE correr: flecos de espuma viajan por las
 *      curvas y la lámina late.
 *   3. LAS POZAS CON ONDAS — donde el agua descansa (pozas de remate y el
 *      reservorio) respiran anillos suaves.
 *
 * Coherencia agroecológica: microcuenca → gravedad → reparto con tablas y
 * piedras. Ni bombas ni aspersores: riego campesino andino.
 *
 * Contrato (lo cabla el host — este archivo NO toca la escena):
 *   <AguaVivaValle
 *     alturaDe={alturaTerreno}   // (x, z) => y — el dueño del terreno la da
 *     tier="alto"                // 'bajo' | 'medio' | 'alto'
 *     reducedMotion={false}      // true = agua QUIETA y digna (cero animación)
 *     nocturno={false}           // apaga colores a azul + emissive de luna
 *     caudal={0.85}              // 0..1 — cuánta agua baja (nunca se seca)
 *   />
 *
 * Presupuesto de draw calls (contado): lechos 1 + aguas 1 + estáticos 1 +
 * flecos 1 (InstancedMesh) + ondas 1 (InstancedMesh) = 5 total.
 * Animación: solo fases sobre curvas precalculadas y transform/opacity —
 * cero geometría por frame. reducedMotion escribe UNA pose y no anima.
 * Determinista (semillas fijas): el valle es EL MISMO valle en cada visita.
 * Montar SOLO dentro de un <Canvas>.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  COLORES_AGUA,
  lechosGeom,
  aguasGeom,
  estaticosGeom,
  flecosData,
  ondasData,
} from './aguaVivaValle.geom';

/* Presupuesto de flecos por tier: los destellos que viajan por las acequias. */
const FLECOS_POR_TIER = { bajo: 22, medio: 40, alto: 64 };

/* La fase quieta del reduced-motion: agua presente, digna, sin correr. */
const FASE_QUIETA = 0.6;

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _giroPlano = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const _col = new THREE.Color();

/** Los FLECOS: espuma instanciada que viaja por las curvas — el agua corre. */
function FlecosAcequias({ alturaDe, tier, reducedMotion, caudal, nocturno }) {
  const ref = useRef(null);
  const lista = useMemo(
    () => flecosData(alturaDe, FLECOS_POR_TIER[tier] || FLECOS_POR_TIER.medio),
    [alturaDe, tier],
  );
  const geo = useMemo(() => new THREE.SphereGeometry(1, 5, 4), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: nocturno ? '#b9d2e8' : COLORES_AGUA.espuma,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      }),
    [nocturno],
  );

  const escribir = (tMov) => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < lista.length; i++) {
      const o = lista[i];
      let f = o.t0 + tMov * o.vel * (0.35 + caudal * 0.85);
      f -= Math.floor(f);
      o.curva.getPoint(f, _p);
      _p.x += o.dx;
      _p.z += o.dz;
      _s.setScalar(o.tam * (0.55 + caudal * 0.6));
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  /* reduced-motion: UNA pose (los flecos regados por el cauce, quietos). */
  useLayoutEffect(() => {
    escribir(FASE_QUIETA);
  });
  useFrame((st) => {
    if (!reducedMotion) escribir(st.clock.elapsedTime);
  });
  useLayoutEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, lista.length]}
      frustumCulled={false}
      renderOrder={3}
    />
  );
}

/** Las ONDAS: anillos instanciados que se abren y disuelven en las pozas. */
function OndasPozas({ alturaDe, tier, reducedMotion, nocturno }) {
  const ref = useRef(null);
  const lista = useMemo(
    () => ondasData(alturaDe, tier === 'bajo'),
    [alturaDe, tier],
  );
  const geo = useMemo(() => new THREE.RingGeometry(0.82, 1, 12), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffffff', // el color real lo pone la instancia (espuma → agua)
        transparent: true,
        opacity: nocturno ? 0.22 : 0.3,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [nocturno],
  );
  const cEspuma = useMemo(
    () => (nocturno ? new THREE.Color('#9fc3dd') : COLORES_AGUA.espuma.clone()),
    [nocturno],
  );
  const cAgua = useMemo(
    () => (nocturno ? new THREE.Color('#33526e') : COLORES_AGUA.honda.clone()),
    [nocturno],
  );

  const escribir = (t) => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < lista.length; i++) {
      const o = lista[i];
      /* cada onda nace chiquita, se abre y se funde con el agua (color) */
      const ph = (t * 0.28 + o.fase) % 1;
      const r = o.rMax * (0.3 + ph * 0.7);
      _p.set(o.x, o.y, o.z);
      _s.set(r, r, 1);
      _m.compose(_p, _giroPlano, _s);
      mesh.setMatrixAt(i, _m);
      _col.copy(cEspuma).lerp(cAgua, ph * ph); // se disuelve contra el agua
      mesh.setColorAt(i, _col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  /* reduced-motion: anillos a medio abrir, quietos — el agua respira sin moverse. */
  useLayoutEffect(() => {
    escribir(FASE_QUIETA);
  });
  useFrame((st) => {
    if (!reducedMotion) escribir(st.clock.elapsedTime);
  });
  useLayoutEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  if (!lista.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, lista.length]}
      frustumCulled={false}
      renderOrder={2}
    />
  );
}

/**
 * El agua viva del valle: hilo del páramo + acequias que fluyen + pozas.
 * @param {{
 *   alturaDe: (x:number, z:number) => number,
 *   tier?: 'bajo'|'medio'|'alto',
 *   reducedMotion?: boolean,
 *   nocturno?: boolean,
 *   caudal?: number,
 * }} props
 */
export default function AguaVivaValle({
  alturaDe,
  tier = 'alto',
  reducedMotion = false,
  nocturno = false,
  caudal = 0.85,
}) {
  /* el caudal nunca llega a cero: la microcuenca cuidada no se seca */
  const caudalVivo = THREE.MathUtils.clamp(caudal, 0.15, 1);

  const lechos = useMemo(() => lechosGeom(alturaDe, nocturno), [alturaDe, nocturno]);
  const aguas = useMemo(() => aguasGeom(alturaDe, nocturno), [alturaDe, nocturno]);
  const estaticos = useMemo(() => estaticosGeom(alturaDe, nocturno), [alturaDe, nocturno]);
  useLayoutEffect(
    () => () => {
      lechos.dispose();
      aguas.dispose();
      estaticos.dispose();
    },
    [lechos, aguas, estaticos],
  );

  /* la lámina LATE (mismo pulso de la Quebrada del valle): opacidad suave */
  const aguaMatRef = useRef(null);
  useFrame((st) => {
    if (!reducedMotion && aguaMatRef.current) {
      aguaMatRef.current.opacity =
        0.74 + Math.sin(st.clock.elapsedTime * 2.1) * 0.05 * caudalVivo;
    }
  });

  return (
    <group>
      {/* el lecho de tierra mojada: canal cavado, no tubo flotante */}
      <mesh geometry={lechos} renderOrder={0}>
        <meshLambertMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
      {/* la lámina de agua: de noche brilla como la quebrada (luna) */}
      <mesh geometry={aguas} renderOrder={1}>
        <meshLambertMaterial
          ref={aguaMatRef}
          vertexColors
          transparent
          opacity={0.74}
          emissive={nocturno ? '#3f6f9e' : '#000000'}
          emissiveIntensity={nocturno ? 0.42 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* compuertas de tablón, piedras de toma, juncos: la mano campesina */}
      <mesh geometry={estaticos} castShadow={false}>
        <meshLambertMaterial vertexColors />
      </mesh>
      <FlecosAcequias
        alturaDe={alturaDe}
        tier={tier}
        reducedMotion={reducedMotion}
        caudal={caudalVivo}
        nocturno={nocturno}
      />
      <OndasPozas
        alturaDe={alturaDe}
        tier={tier}
        reducedMotion={reducedMotion}
        nocturno={nocturno}
      />
    </group>
  );
}
