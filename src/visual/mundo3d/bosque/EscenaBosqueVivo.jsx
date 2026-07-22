/*
 * EscenaBosqueVivo — EL PÁRAMO DEFINITIVO (2026-07-22).
 *
 * El operador revisó los TRES mundos con piezas de páramo y decidió dejar UNO,
 * armado con lo mejor de cada cual:
 *   · DE ESTE MUNDO (la base): la iluminación del ciclo de día, la vegetación
 *     (frailejonal por edades + queñual + sotobosque), el sistema de niebla en
 *     capas (marea de fog + BrumaParallax + NieblaRasante) y la FaunaBosque
 *     ("las aves, mariposas que salen están lindas").
 *   · DEL PÁRAMO VIEJO (MundoParamo3D, archivado): la CÁMARA de la llegada
 *     ("es increíble" → CamaraJackson, paneo CatmullRom que abre pegado a la
 *     roseta y se asienta en el plano general) y el FONDO de inmensidad
 *     (fondoParamo: bóveda, cordillera, mar de nubes, falda, sol velado).
 *   · DE SueloDemo3D (archivado): el SUELO RICO como terreno (ya era la base
 *     del anfiteatro; ahora viste su paleta dorada de páramo) + las PEÑAS de
 *     hito sembradas con distribuirDetalle.
 *   · FUERA el Ent y el campesino ("están horribles"): ni EntQuenua ni la
 *     figura de escala. El centro del claro lo toma el PATRIARCA — el
 *     frailejón más viejo y más alto del rodal — con su queñua matriarca.
 *
 * La pared del anfiteatro conserva el abrigo del cuenco SALVO por la ABRA
 * (bosqueTakeA): la ventana angular por donde la meseta se despeña hacia la
 * cordillera y el mar de nubes — la inmensidad entra por ahí al encuadre héroe.
 *
 * Tier-safe vía perfilDeTier; reducedMotion monta QUIETO (frameloop a demanda).
 * Todo procedural (cero CDN/imágenes). Importa three/@react-three → montar
 * SOLO perezosa (lazy) desde el host.
 */
import { Suspense, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import useCicloDia from '../useCicloDia.js';
import { CIELOS_HORA, TRANSICION, mezclaHex } from '../cielosHoraData.js';
import { SombraContacto } from '../escenas/SombraContacto.jsx';
import SueloRico, { Instancias } from '../terreno/SueloRico.jsx';
import { geomPiedraSuelo, distribuirDetalle } from '../terreno/sueloRico.geom.js';
import FloraParamo from './FloraParamo.jsx';
import FaunaBosque from './FaunaBosque.jsx';
import FondoParamo from './fondoParamo.jsx';
import { geomFrailejon, calidadDeTier } from './floraParamo.geom.js';
import {
  alturaBosque,
  sueloDelBosque,
  geomQuenua,
  sitiosQuenual,
  geomLosetaHojarasca,
  sitiosHojarasca,
  geomTroncosCaidos,
  curvaArroyo,
} from './bosqueTakeA.geom.js';

/* ── LA ATMÓSFERA DEL BOSQUE DE NIEBLA ─────────────────────────────────────
      Los presets del día salen de CIELOS_HORA (la misma familia del valle:
      el bosque amanece y anochece CON el valle) pero sesgados a bosque de
      niebla: colores más fríos y lechosos, el suelo más verde, y el fog
      MUCHO más cerca — aquí la niebla es la protagonista que come el fondo. */
const BRUMA = { fondo: '#c2cecb', suelo: '#3c4634', niebla: '#c6d1ce' };

function presetBosque(franja) {
  const p = CIELOS_HORA[franja] || CIELOS_HORA.manana;
  // De noche la bruma lechosa CEDE: el índigo del cine (día por noche) manda
  // y la niebla apenas azulea — sin esto la noche quedaba gris-lavada.
  const kBruma = franja === 'noche' ? 0.28 : 0.55;
  const kFondo = franja === 'noche' ? 0.3 : 0.5;
  return {
    fondo: mezclaHex(p.fondo, BRUMA.fondo, kFondo),
    cielo: mezclaHex(p.cielo, BRUMA.fondo, 0.35),
    suelo: mezclaHex(p.suelo, BRUMA.suelo, 0.5),
    luz: p.luz,
    relleno: p.relleno,
    niebla: mezclaHex(p.niebla, BRUMA.niebla, kBruma),
    intensidad: p.intensidad * 0.95,
    hemisferio: p.hemisferio,
    ambiente: p.ambiente,
    sol: p.sol,
    rellenoInt: p.rellenoInt,
    solPos: p.solPos,
    nieblaCerca: Math.max(6, p.nieblaCerca * 0.72),
    nieblaLejos: 26 + p.nieblaLejos * 0.7,
    estrellas: Number(p.estrellas) || 0,
  };
}

function estadoAtmosfera(p) {
  return {
    fondo: new THREE.Color(p.fondo),
    domo: new THREE.Color(p.cielo),
    suelo: new THREE.Color(p.suelo),
    luz: new THREE.Color(p.luz),
    relleno: new THREE.Color(p.relleno),
    niebla: new THREE.Color(p.niebla),
    solPos: new THREE.Vector3(p.solPos[0], p.solPos[1], p.solPos[2]),
    intensidad: p.intensidad,
    hemisferio: p.hemisferio,
    ambiente: p.ambiente,
    sol: p.sol,
    rellenoInt: p.rellenoInt,
    nieblaCerca: p.nieblaCerca,
    nieblaLejos: p.nieblaLejos,
  };
}

function amortiguar(a, o, k) {
  a.fondo.lerp(o.fondo, k);
  a.domo.lerp(o.domo, k);
  a.suelo.lerp(o.suelo, k);
  a.luz.lerp(o.luz, k);
  a.relleno.lerp(o.relleno, k);
  a.niebla.lerp(o.niebla, k);
  a.solPos.lerp(o.solPos, k);
  a.intensidad += (o.intensidad - a.intensidad) * k;
  a.hemisferio += (o.hemisferio - a.hemisferio) * k;
  a.ambiente += (o.ambiente - a.ambiente) * k;
  a.sol += (o.sol - a.sol) * k;
  a.rellenoInt += (o.rellenoInt - a.rellenoInt) * k;
  a.nieblaCerca += (o.nieblaCerca - a.nieblaCerca) * k;
  a.nieblaLejos += (o.nieblaLejos - a.nieblaLejos) * k;
}

/* Mismo patrón que AtmosferaValle: los props declarativos usan la piel del
   PRIMER montaje; todo lo vivo se escribe imperativo por refs (cero setState
   por frame, cero alocación — colores/vec3 mutados in-place). */
function AtmosferaBosque({ franja, perfil, reducedMotion }) {
  const objetivo = useMemo(() => estadoAtmosfera(presetBosque(franja)), [franja]);
  const [ini] = useState(() => presetBosque(franja));
  const [actual] = useState(() => estadoAtmosfera(ini));

  const fondoRef = useRef(null);
  const fogRef = useRef(null);
  const hemiRef = useRef(null);
  const ambRef = useRef(null);
  const solRef = useRef(null);
  const rellenoRef = useRef(null);

  const pintar = (e) => {
    if (fondoRef.current) fondoRef.current.copy(e.fondo);
    if (fogRef.current) {
      fogRef.current.color.copy(e.niebla);
      fogRef.current.near = e.nieblaCerca;
      fogRef.current.far = e.nieblaLejos;
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = e.intensidad * e.hemisferio * 1.7;
      hemiRef.current.color.copy(e.domo);
      hemiRef.current.groundColor.copy(e.suelo);
    }
    if (ambRef.current) {
      ambRef.current.intensity = e.intensidad * e.ambiente * 1.3;
      ambRef.current.color.copy(e.luz);
    }
    if (solRef.current) {
      solRef.current.intensity = e.intensidad * e.sol * 1.25;
      solRef.current.color.copy(e.luz);
      solRef.current.position.set(e.solPos.x * 1.8, e.solPos.y * 1.8, e.solPos.z * 1.8);
    }
    if (rellenoRef.current) {
      rellenoRef.current.intensity = e.intensidad * e.rellenoInt * 1.4;
      rellenoRef.current.color.copy(e.relleno);
      rellenoRef.current.position.set(-e.solPos.x, Math.max(3, e.solPos.y * 0.6), -e.solPos.z);
    }
  };

  // Calma pedida → snap directo a la franja (frameloop 'demand').
  useLayoutEffect(() => {
    if (!reducedMotion) return;
    amortiguar(actual, objetivo, 1);
    pintar(actual);
  });

  useFrame((state, dt) => {
    if (reducedMotion) return;
    const k = 1 - Math.exp((-3 / TRANSICION.duracion) * Math.min(dt, 0.1));
    amortiguar(actual, objetivo, k);
    pintar(actual);
    // LA MAREA DE NIEBLA: una onda lenta (~46 s) que hace ENTRAR y SALIR la
    // bruma — cuando sube, el fog se cierra y se traga la montaña del fondo; al
    // bajar, la revela. Es lo que vuelve la niebla protagonista (Jackson): la
    // catedral aparece y desaparece, no un plano uniforme. Se aplica DESPUÉS de
    // pintar (no acumula: parte del estado ya amortiguado de esta franja).
    const marea = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * (Math.PI * 2 / 46));
    if (fogRef.current) {
      fogRef.current.far = actual.nieblaLejos * (1 - 0.44 * marea);
      fogRef.current.near = actual.nieblaCerca * (1 - 0.22 * marea);
    }
    // El fondo se LECHA hacia el color de la niebla cuando la marea cierra: la
    // pared del anfiteatro se disuelve en blanco y vuelve. copy() antes de lerp
    // → no acumula (siempre parte del fondo amortiguado de la franja).
    if (fondoRef.current) fondoRef.current.copy(actual.fondo).lerp(actual.niebla, 0.4 * marea);
  });

  return (
    <>
      <color ref={fondoRef} attach="background" args={[ini.fondo]} />
      {perfil.fog && (
        <fog ref={fogRef} attach="fog" args={[ini.niebla, ini.nieblaCerca, ini.nieblaLejos]} />
      )}
      <hemisphereLight
        ref={hemiRef}
        intensity={ini.intensidad * ini.hemisferio * 1.7}
        color={ini.cielo}
        groundColor={ini.suelo}
      />
      <ambientLight ref={ambRef} intensity={ini.intensidad * ini.ambiente * 1.3} color={ini.luz} />
      <directionalLight
        ref={solRef}
        position={[ini.solPos[0] * 1.8, ini.solPos[1] * 1.8, ini.solPos[2] * 1.8]}
        intensity={ini.intensidad * ini.sol * 1.25}
        color={ini.luz}
        castShadow={perfil.sombras}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={88}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      {/* contraluz frío opuesto al sol: separa las copas de la niebla */}
      <directionalLight
        ref={rellenoRef}
        position={[-ini.solPos[0], Math.max(3, ini.solPos[1] * 0.6), -ini.solPos[2]]}
        intensity={ini.intensidad * ini.rellenoInt * 1.4}
        color={ini.relleno}
      />
    </>
  );
}

/* ── EL QUEÑUAL (instanciado: 3 variantes → 3 draw-calls) ────────────────── */
function BancoInstancias({ geo, mat, items, castShadow = false }) {
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
      e.set(0, it.rotY, 0);
      q.setFromEuler(e);
      s.setScalar(it.esc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      col.setRGB(it.tinte[0], it.tinte[1], it.tinte[2]);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);
  if (!geo || !items.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, items.length]}
      frustumCulled={false}
      castShadow={castShadow}
      receiveShadow={castShadow}
    />
  );
}

function Quenual({ tier, perfil }) {
  const q = tier === 'alto' ? 1 : tier === 'medio' ? 0.62 : 0.45;
  const sitios = useMemo(() => sitiosQuenual(tier), [tier]);
  const variantes = useMemo(
    () => [geomQuenua({ q }, 21), geomQuenua({ q }, 57), geomQuenua({ q }, 83)],
    [q],
  );
  const mat = useMemo(
    () => (perfil.materialRico
      ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 })
      : new THREE.MeshLambertMaterial({ vertexColors: true })),
    [perfil.materialRico],
  );
  useLayoutEffect(() => () => {
    variantes.forEach((g) => g.dispose());
    mat.dispose();
  }, [variantes, mat]);
  return (
    <group>
      {[0, 1, 2].map((v) => (
        <BancoInstancias
          key={v}
          geo={variantes[v]}
          mat={mat}
          items={sitios.filter((s) => s.variante === v)}
          castShadow={perfil.sombras}
        />
      ))}
    </group>
  );
}

/* ── HOJARASCA + TRONCOS CAÍDOS ──────────────────────────────────────────── */
function Hojarasca({ tier }) {
  const n = tier === 'alto' ? 150 : tier === 'medio' ? 80 : 0;
  const items = useMemo(() => sitiosHojarasca(n), [n]);
  const geo = useMemo(() => geomLosetaHojarasca(), []);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#ffffff' }), []);
  useLayoutEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  if (!n) return null;
  return <BancoInstancias geo={geo} mat={mat} items={items} />;
}

function TroncosCaidos({ tier, perfil }) {
  const q = tier === 'alto' ? 1 : 0.62;
  const geo = useMemo(() => geomTroncosCaidos(q), [q]);
  const mat = useMemo(
    () => (perfil.materialRico
      ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 })
      : new THREE.MeshLambertMaterial({ vertexColors: true })),
    [perfil.materialRico],
  );
  useLayoutEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  return <mesh geometry={geo} material={mat} castShadow={perfil.sombras} receiveShadow={perfil.sombras} />;
}

/* ── EL ARROYO — el hilo de agua que baja de la niebla ───────────────────── */
function Arroyo({ nocturno, perfil }) {
  const rico = perfil.materialRico;
  const ref = useRef(null);
  const geo = useMemo(
    () => new THREE.TubeGeometry(curvaArroyo(), rico ? 72 : 44, 0.21, rico ? 6 : 5, false),
    [rico],
  );
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  useFrame((state) => {
    if (ref.current) {
      ref.current.opacity = 0.72 + Math.sin(state.clock.elapsedTime * 1.7) * 0.06;
    }
  });
  return (
    <mesh geometry={geo}>
      {rico ? (
        <meshStandardMaterial
          ref={ref}
          color="#5fa8bd"
          emissive={nocturno ? '#3f6f9e' : '#000000'}
          emissiveIntensity={nocturno ? 0.42 : 0}
          transparent
          opacity={0.75}
          roughness={0.25}
          metalness={0.3}
        />
      ) : (
        <meshLambertMaterial
          ref={ref}
          color="#5fa8bd"
          emissive={nocturno ? '#3f6f9e' : '#000000'}
          emissiveIntensity={nocturno ? 0.42 : 0}
          transparent
          opacity={0.75}
        />
      )}
    </mesh>
  );
}

/* ── EL CORAZÓN DEL CLARO: el PATRIARCA y su corte ─────────────────────────
      Donde vivía el Ent ahora manda el frailejón MÁS VIEJO del rodal — el
      patriarca en flor, por encima de los héroes del proscenio — con un
      acompañante, la queñua matriarca (el árbol del páramo, sin rostro) y las
      piedras del claro. La mirada de reposo cae exactamente aquí. */
const CENTRO = {
  patriarca: { x: -1.6, z: 0.6, escala: 2.55, rotY: 0.8 },
  segundo: { x: 1.9, z: 1.7, escala: 1.3, rotY: 2.4 },
  matriarca: { x: 4.1, z: -3.9, escala: 1.5, rotY: 1.1 },
  rocas: [
    { x: -2.7, z: 1.8, escala: 1.9, rotY: 0.4 },
    { x: 1.0, z: 2.9, escala: 1.2, rotY: 2.1 },
    { x: 2.3, z: -1.3, escala: 1.5, rotY: 4.4 },
  ],
};

/* Posa una pieza del centro sobre el relieve (formato de `Instancias`). */
const posarCentro = (p, hundir = 0) => ({
  pos: [p.x, alturaBosque(p.x, p.z) - hundir, p.z],
  rotY: p.rotY,
  escala: p.escala,
  tint: [1, 1, 1],
});

function CentroParamo({ tier, perfil }) {
  const q = tier === 'alto' ? 1 : tier === 'medio' ? 0.62 : 0.45;
  const geoPatriarca = useMemo(
    () => geomFrailejon({ flor: true, q: calidadDeTier(tier), edad: 1 }, 407),
    [tier],
  );
  const geoQuenua = useMemo(() => geomQuenua({ q }, 33), [q]);
  const geoRoca = useMemo(
    () => geomPiedraSuelo(sueloDelBosque.opts.seed + 555, sueloDelBosque.opts.paleta),
    [],
  );
  const mat = useMemo(
    () => (perfil.materialRico
      ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 })
      : new THREE.MeshLambertMaterial({ vertexColors: true })),
    [perfil.materialRico],
  );
  const frailejones = useMemo(() => [posarCentro(CENTRO.patriarca), posarCentro(CENTRO.segundo)], []);
  const quenua = useMemo(() => [posarCentro(CENTRO.matriarca)], []);
  const rocas = useMemo(() => CENTRO.rocas.map((r) => posarCentro(r, 0.1)), []);
  useLayoutEffect(() => () => {
    geoPatriarca.dispose();
    geoQuenua.dispose();
    geoRoca.dispose();
    mat.dispose();
  }, [geoPatriarca, geoQuenua, geoRoca, mat]);
  return (
    <group>
      <Instancias geo={geoPatriarca} mat={mat} items={frailejones} castShadow={perfil.sombras} />
      <Instancias geo={geoQuenua} mat={mat} items={quenua} castShadow={perfil.sombras} />
      <Instancias geo={geoRoca} mat={mat} items={rocas} castShadow={perfil.sombras} />
    </group>
  );
}

/* ── LAS PEÑAS DE HITO (de SueloDemo3D) ────────────────────────────────────
      Rocas GRANDES cuya silueta se recorta contra la niebla, sembradas con la
      API de detalle del suelo rico — el reuso probado en la demo del suelo. */
function Penas({ perfil }) {
  const geo = useMemo(
    () => geomPiedraSuelo(sueloDelBosque.opts.seed + 777, sueloDelBosque.opts.paleta),
    [],
  );
  const items = useMemo(
    () => distribuirDetalle(sueloDelBosque, 6, {
      seed: 99, rMin: 10, rMax: 26, eMin: 2.2, eMax: 4.0, evitaSendero: 1.6, hundir: 0.12,
    }),
    [],
  );
  const mat = useMemo(
    () => (perfil.materialRico
      ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 })
      : new THREE.MeshLambertMaterial({ vertexColors: true })),
    [perfil.materialRico],
  );
  useLayoutEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  return <Instancias geo={geo} mat={mat} items={items} castShadow={perfil.sombras} />;
}

/* ── LA CÁMARA DE LA LLEGADA (la del páramo viejo: "es increíble") ─────────
      Paneo CatmullRom portado de MundoParamo3D: abre PEGADO a la roseta del
      gigante del proscenio, se cuela bajo entre el frailejonal, barre el
      occidente de la planicie y SE ASIENTA en el plano general — y al girar
      hacia el reposo, la abra revela la cordillera y el mar de nubes. Mientras
      vuela, los OrbitControls están desmontados (nadie pelea la cámara). */
const DUR_JACKSON = 8.5;
const _miradaJackson = new THREE.Vector3();
function CamaraJackson({ pose, onFin }) {
  const { camera } = useThree();
  const ini = useRef(/** @type {number|null} */ (null));
  const hecho = useRef(false);
  const { curva, va, vb } = useMemo(() => {
    const y0 = alturaBosque(3.8, 11.2); // el pie del gigante del proscenio
    return {
      curva: new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(5.0, y0 + 2.2, 13.9),
          new THREE.Vector3(-0.5, y0 + 1.4, 7.4),
          new THREE.Vector3(-6.9, 3.4, 8.2),
          new THREE.Vector3(2.4, 5.6, 15.8),
          new THREE.Vector3(pose.position[0], pose.position[1], pose.position[2]),
        ],
        false,
        'catmullrom',
        0.3,
      ),
      va: new THREE.Vector3(3.8, y0 + 3.0, 11.2), // la roseta plateada del gigante
      vb: new THREE.Vector3(pose.mira[0], pose.mira[1], pose.mira[2]),
    };
  }, [pose]);
  useFrame(({ clock }) => {
    if (hecho.current) return;
    if (ini.current == null) ini.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - ini.current) / DUR_JACKSON);
    const e = t * t * (3 - 2 * t);
    curva.getPoint(e, camera.position);
    _miradaJackson.copy(va).lerp(vb, THREE.MathUtils.smoothstep(e, 0.45, 1));
    camera.lookAt(_miradaJackson);
    if (t >= 1) {
      hecho.current = true;
      onFin();
    }
  });
  return null;
}

/* ── RAYOS DE SOL COLADOS (godrays baratos) ────────────────────────────────
      Láminas aditivas con textura canvas (gradiente que se apaga hacia el
      suelo), orientadas HACIA el sol de la franja. Fuertes al amanecer y la
      tarde, tímidos al mediodía, apagados de noche. Solo tier alto. */
const OPACIDAD_RAYOS = {
  amanecer: 0.3, manana: 0.22, mediodia: 0.08, tarde: 0.22, atardecer: 0.28, noche: 0,
};

function texturaRayo() {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 256;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,244,214,0.85)');
  g.addColorStop(0.55, 'rgba(255,240,200,0.3)');
  g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  // Bordes laterales suaves (destination-in recorta con un gradiente horizontal).
  const h = ctx.createLinearGradient(0, 0, 64, 0);
  h.addColorStop(0, 'rgba(0,0,0,0)');
  h.addColorStop(0.25, 'rgba(0,0,0,1)');
  h.addColorStop(0.75, 'rgba(0,0,0,1)');
  h.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = h;
  ctx.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const LAMINAS_RAYO = [
  { ox: -3.4, oz: 1.6, w: 1.3, l: 18, giro: 0.3 },
  { ox: -1.0, oz: -2.4, w: 2.0, l: 21, giro: 1.2 },
  { ox: 1.8, oz: 0.8, w: 1.0, l: 16, giro: 2.1 },
  { ox: 4.0, oz: -1.4, w: 1.6, l: 20, giro: 0.8 },
  { ox: -5.6, oz: -0.5, w: 1.1, l: 17, giro: 1.7 },
];

const _UP = new THREE.Vector3(0, 1, 0);

function RayosDeSol({ franja, reducedMotion }) {
  const grupo = useRef(null);
  const tex = useMemo(() => texturaRayo(), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    }),
    [tex],
  );
  // Lámina con el pivote en la punta de abajo (crece hacia el sol).
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  useLayoutEffect(() => () => {
    tex.dispose();
    mat.dispose();
    geo.dispose();
  }, [tex, mat, geo]);

  const objetivo = useMemo(() => {
    const p = presetBosque(franja);
    const d = new THREE.Vector3(p.solPos[0], p.solPos[1], p.solPos[2]).normalize();
    // Elevación mínima: aunque el sol esté rasante, la luz colada cae en
    // DIAGONAL entre las copas (sin esto, al amanecer las láminas se tienden
    // horizontales y se delatan como bandas planas cruzando el cielo).
    d.y = Math.max(d.y, 0.6);
    d.normalize();
    return {
      op: OPACIDAD_RAYOS[franja] ?? 0.2,
      quat: new THREE.Quaternion().setFromUnitVectors(_UP, d),
    };
  }, [franja]);

  useFrame((state, dt) => {
    const g = grupo.current;
    if (!g) return;
    const k = reducedMotion ? 1 : 1 - Math.exp(-1.2 * Math.min(dt, 0.1));
    g.quaternion.slerp(objetivo.quat, k);
    const t = state.clock.elapsedTime;
    const pulso = reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 0.23);
    // El material se alcanza por el grafo (todas las láminas lo comparten):
    // mismo patrón que NieblaRasante — cero setState, cero alocación.
    const m = g.children[0]?.children[0]?.material;
    if (m) m.opacity += (objetivo.op * pulso - m.opacity) * k;
  });

  return (
    <group ref={grupo} position={[0, 0.2, 0]}>
      {LAMINAS_RAYO.map((l, i) => (
        <group key={i} position={[l.ox, 0, l.oz]} rotation={[0, l.giro, 0]}>
          <mesh geometry={geo} material={mat} scale={[l.w, l.l, 1]} />
          <mesh geometry={geo} material={mat} scale={[l.w, l.l, 1]} rotation={[0, Math.PI / 2, 0]} />
        </group>
      ))}
    </group>
  );
}

/* ── BRUMA POR CAPAS (la niebla volumétrica falsa con parallax) ────────────
      Cartas grandes billboard a radios crecientes: al orbitar, las capas se
      deslizan a velocidades distintas y el bosque gana profundidad física.
      La franja pesa: más bruma al amanecer y de noche. */
/* Opacidades a la baja (2026-07-22): con 0.10-0.16 × marea hasta 1.32, la
   bruma velaba el MAR DE NUBES del fondo la mitad del tiempo y el tercio
   alto del cuadro quedaba gris pelado. La bruma sugiere; el mar se ve. */
const CAPAS_BRUMA = [
  { rad: 13.5, y: 2.6, w: 26, h: 6.5, op: 0.11, vel: 0.011, fase: 0 },
  { rad: 18, y: 4.0, w: 36, h: 9, op: 0.1, vel: -0.008, fase: 2.2 },
  { rad: 23, y: 6.0, w: 48, h: 12, op: 0.09, vel: 0.006, fase: 4.1 },
  { rad: 29, y: 8.5, w: 62, h: 15, op: 0.08, vel: -0.004, fase: 1.3 },
  { rad: 36, y: 12, w: 84, h: 20, op: 0.065, vel: 0.003, fase: 5.5 },
];
const PESO_BRUMA = {
  amanecer: 1.4, manana: 1.0, mediodia: 0.65, tarde: 0.9, atardecer: 1.25, noche: 1.15,
};

function texturaBruma(seed = 7) {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 128;
  const ctx = cv.getContext('2d');
  let s = seed;
  const r = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < 10; i++) {
    const x = 20 + r() * 216;
    const y = 30 + r() * 68;
    const rad = 28 + r() * 55;
    const a = 0.16 + r() * 0.2;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(238,244,242,${a})`);
    g.addColorStop(1, 'rgba(238,244,242,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function BrumaParallax({ franja, reducedMotion }) {
  const grupo = useRef(null);
  const peso = useRef(1);
  const tex = useMemo(() => texturaBruma(), []);
  const mats = useMemo(
    () => CAPAS_BRUMA.flatMap((c) => [0, 1].map(() => new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: c.op,
      depthWrite: false,
      fog: false,
    }))),
    [tex],
  );
  useLayoutEffect(() => () => {
    tex.dispose();
    mats.forEach((m) => m.dispose());
  }, [tex, mats]);

  useFrame((state, dt) => {
    const g = grupo.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const k = reducedMotion ? 1 : 1 - Math.exp(-0.8 * Math.min(dt, 0.1));
    peso.current += ((PESO_BRUMA[franja] ?? 1) - peso.current) * k;
    // La misma MAREA de niebla que respira en el fog (mismo periodo/fase): las
    // cartas de bruma se ESPESAN cuando la marea cierra y adelgazan al abrir →
    // la niebla entra y sale a una, no cada capa por su lado.
    const marea = reducedMotion ? 0 : 0.5 + 0.5 * Math.sin(t * (Math.PI * 2 / 46));
    // Techo de la marea a la baja: cerrada del todo (1.32×) tapaba el mar de
    // nubes; ahora respira entre 0.62× y 1.04× y el fondo nunca desaparece.
    const envMarea = 0.62 + 0.42 * marea;
    let idx = 0;
    for (let c = 0; c < CAPAS_BRUMA.length; c++) {
      const capa = CAPAS_BRUMA[c];
      for (let lado = 0; lado < 2; lado++) {
        const carta = g.children[idx];
        if (!carta) break;
        const az = capa.fase + lado * Math.PI + (reducedMotion ? 0 : t * capa.vel);
        carta.position.set(
          Math.cos(az) * capa.rad,
          capa.y + (reducedMotion ? 0 : Math.sin(t * 0.05 + capa.fase + lado) * 0.25),
          Math.sin(az) * capa.rad,
        );
        carta.quaternion.copy(state.camera.quaternion);
        carta.material.opacity = capa.op * peso.current * envMarea
          * (reducedMotion ? 1 : 0.9 + 0.1 * Math.sin(t * 0.07 + capa.fase * 2 + lado * 3));
        idx++;
      }
    }
  });

  return (
    <group ref={grupo}>
      {CAPAS_BRUMA.flatMap((c, ci) => [0, 1].map((lado) => (
        <mesh key={`${ci}-${lado}`} material={mats[ci * 2 + lado]}>
          <planeGeometry args={[c.w, c.h]} />
        </mesh>
      )))}
    </group>
  );
}

/* ── LA CÁMARA: pose de reposo consciente del ASPECTO ──────────────────────
      En landscape la pose aprobada (leve contrapicado que hace imponente al
      guardián, el arroyo entrando por la derecha del cuadro). En un teléfono
      parado la cámara retrocede y sube apenas: el fov vertical alcanza y el
      Ent respira sin perder el queñual de los flancos. */
/* El guardián creció 1.4× (mount-ent scale): para conservar EXACTO el encuadre
   héroe aprobado (leve contrapicado, el rostro tallado legible), el rig de
   cámara se escala con él — misma proporción árbol/cuadro que el original, solo
   que 1.4× más grande y con el bosque catedral abriéndose alrededor. */
/* 2a pasada páramo (2026-07-20): se ABRE el encuadre para que respire la
   PLANICIE. La cámara SUBE (y 3.6→4.7) y mira un pelo HACIA ABAJO (mira y
   3.7→3.0): el frailejonal se despliega en abanico hacia un horizonte BAJO y el
   cielo lechoso del páramo ocupa el tercio alto (la firma: planicie abierta,
   cielo grande). La queñua Ent queda de acento vertical/guardián al fondo, ya no
   como muro de copas. fov 45→46 para que entre más frailejonal. */
const POSE_BOSQUE = { position: [12.0, 5.8, 17.6], fov: 46, mira: [0, 2.5, 0] };

/* Anclas de sombra de contacto que la escena le pasa a SueloRico: el patriarca
   y la queñua matriarca del centro (los objetos mayores del claro). */
const ANCLAS_SUELO = [
  { x: -1.6, z: 0.6, radio: 1.6 },
  { x: 4.1, z: -3.9, radio: 2.1 },
];

function poseBosqueParaAspecto(aspect) {
  if (!aspect || aspect >= 0.9) return { ...POSE_BOSQUE, k: 1 };
  const t = Math.min(1, (0.9 - aspect) / 0.44);
  const B = { position: [14.8, 6.2, 21.6], fov: 56, mira: [0, 3.8, 0] };
  const lerp = (a, b) => a + (b - a) * t;
  const position = POSE_BOSQUE.position.map((v, i) => lerp(v, B.position[i]));
  const mira = POSE_BOSQUE.mira.map((v, i) => lerp(v, B.mira[i]));
  const dist = (p, m) => Math.hypot(p[0] - m[0], p[1] - m[1], p[2] - m[2]);
  return {
    position,
    fov: Math.round(lerp(POSE_BOSQUE.fov, B.fov)),
    mira,
    k: dist(position, mira) / dist(POSE_BOSQUE.position, POSE_BOSQUE.mira),
  };
}

/* ── EL DIORAMA ──────────────────────────────────────────────────────────── */
function Diorama({ tier, reducedMotion, pose }) {
  const perfil = perfilDeTier(tier);
  const controls = useRef(null);
  const { franja } = useCicloDia({ reducedMotion });
  const nocturno = franja === 'noche';
  const fracEstrellas = presetBosque(franja).estrellas;
  // La llegada de Jackson (paneo del páramo viejo): mientras vuela, los
  // OrbitControls están desmontados. reduced-motion y gama baja la saltan.
  const [vuelo, setVuelo] = useState(() => !reducedMotion && tier !== 'bajo');

  return (
    <>
      {/* Atmósfera del ciclo de día: fondo + niebla + las cuatro luces. */}
      <AtmosferaBosque franja={franja} perfil={perfil} reducedMotion={reducedMotion} />

      {/* LA INMENSIDAD (del páramo viejo): bóveda, cordillera, mar de nubes,
          falda que se despeña por la abra y el frailejonal del horizonte. */}
      <FondoParamo franja={franja} tier={tier} reducedMotion={reducedMotion} />
      {fracEstrellas > 0 && perfil.estrellas > 0 && (
        <Stars
          radius={60}
          depth={26}
          count={Math.max(24, Math.round(perfil.estrellas * fracEstrellas))}
          factor={3}
          fade
          speed={reducedMotion ? 0 : 1}
        />
      )}

      {/* El terreno: el SUELO RICO dorado de páramo (relieve fbm, color por
          zona, sendero, detalle al ras) sobre el contrato del cuenco
          (sueloDelBosque = suelo rico + pared del anfiteatro con la ABRA +
          cañada). El patriarca recibe su sombra de contacto como ancla. */}
      <SueloRico suelo={sueloDelBosque} tier={tier} anclas={ANCLAS_SUELO} />

      {/* El queñual (vegetación bendecida): acentos que enmarcan + siluetas
          lejanas en la niebla. */}
      <Quenual tier={tier} perfil={perfil} />

      {/* El suelo vivido: hojarasca y madera muerta con musgo. */}
      <Hojarasca tier={tier} />
      <TroncosCaidos tier={tier} perfil={perfil} />

      {/* El arroyo que baja de la niebla (de noche, lo que más brilla). */}
      {tier !== 'bajo' && <Arroyo nocturno={nocturno} perfil={perfil} />}

      {/* EL FRAILEJONAL DEL PÁRAMO (bioma="paramo"): la planicie abierta con el
          frailejonar dominando primer plano y media distancia, el cortejo de
          árboles ralo y empujado al anillo lejano (siluetas en la niebla).
          POSADO sobre el relieve con alturaDe. */}
      <FloraParamo tier={tier} reducedMotion={reducedMotion} alturaDe={alturaBosque} bioma="paramo" />

      {/* (2a pasada 2026-07-20) SE RETIRÓ el DoselBiodiverso: ese dosel andino/
          subandino de tres estratos (guadua, cámbulo, gualanday, siete cueros,
          heliconia, helecho arbóreo, quiche) es un ERROR DE BIOMA para un páramo
          sobre 3500 m — convertía la planicie en bosque denso y sepultaba al
          frailejón. El páramo lleva frailejonal + queñua de acento, no dosel. */}

      {/* LA VIDA: cóndor, vecinos rubber-hose, mariposas, luciérnagas. */}
      <FaunaBosque tier={tier} reducedMotion={reducedMotion} />

      {/* Luz que se cuela entre las copas (solo donde sobra GPU). */}
      {perfil.materialRico && <RayosDeSol franja={franja} reducedMotion={reducedMotion} />}

      {/* La bruma con parallax que da profundidad física al orbitar. */}
      {perfil.fog && <BrumaParallax franja={franja} reducedMotion={reducedMotion} />}

      {/* ══ EL CENTRO DEL CLARO ══ el patriarca en flor, la queñua matriarca y
          las piedras (aquí vivía el Ent; el operador lo sacó: "está horrible").
          Las PEÑAS de hito (SueloDemo3D) recortan su silueta contra la niebla. */}
      <CentroParamo tier={tier} perfil={perfil} />
      {tier !== 'bajo' && <Penas perfil={perfil} />}

      {/* Sombra de contacto del patriarca. En alto/medio la pone SueloRico
          (anclas de la escena); en 'bajo' SueloRico no dibuja sombras, así que
          el kit la planta acá para que el frailejón mayor no flote. */}
      {!perfil.sombrasContacto && (
        <SombraContacto pos={[-1.6, 0.04, 0.6]} radio={1.5} color="#20281c" opacidad={0.34} orden={2} />
      )}

      {/* LA LLEGADA (Jackson) o el reposo orbitable: nunca los dos a la vez. */}
      {vuelo ? (
        <CamaraJackson pose={pose} onFin={() => setVuelo(false)} />
      ) : (
        <OrbitControls
          ref={controls}
          makeDefault
          target={pose.mira}
          enablePan={false}
          enableZoom
          minDistance={7}
          maxDistance={Math.max(30, Math.ceil(22 * pose.k) + 6)}
          minPolarAngle={0.5}
          maxPolarAngle={1.5}
          enableDamping
          dampingFactor={0.08}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.1}
        />
      )}
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El PÁRAMO DEFINITIVO (mundo Bosque Vivo, take páramo). Montar SOLO perezosa.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function EscenaBosqueVivo({ tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  const pose = useMemo(
    () => poseBosqueParaAspecto(
      typeof window !== 'undefined' && window.innerHeight > 0
        ? window.innerWidth / window.innerHeight
        : 1,
    ),
    [],
  );
  // Con la llegada de Jackson activa, la cámara NACE en el arranque del paneo
  // (pegada a la roseta del gigante); sin ella, directo en la pose de reposo.
  const conVuelo = !reducedMotion && tier !== 'bajo';
  const camIni = useMemo(
    () => (conVuelo ? [5.0, alturaBosque(3.8, 11.2) + 2.2, 13.9] : pose.position),
    [conVuelo, pose],
  );
  return (
    <Canvas
      className={`bviva-canvas${listo ? ' bviva-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={/** @type {any} */ ({ position: camIni, fov: pose.fov })}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Suspense fallback={null}>
        <Diorama tier={tier} reducedMotion={reducedMotion} pose={pose} />
      </Suspense>
    </Canvas>
  );
}
