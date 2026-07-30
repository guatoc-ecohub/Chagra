/*
 * EscenaParamo — ARQUETIPO `paramo`: EL PÁRAMO, la fábrica de agua de la finca.
 *
 * El páramo está POR ENCIMA del límite arbóreo: NO van árboles de hoja ancha ni
 * dosel. Esta escena es PÁRAMO-ESPECÍFICA (dueñez propia del mundo): compone su
 * propio <Canvas> con las piezas páramo-correctas —la inmensidad de `FondoParamo`
 * (bóveda, cordillera, mar de nubes, falda), el terreno del suelo rico dorado, el
 * FRAILEJONAL refinado (frailejonParamo.geom: caulirrósula esbelta, enagua de
 * necromasa continua tipo teja, roseta afelpada plateada, flor en corimbo), el
 * pajonal/sotobosque bajo (romerillo, mortiño), rocas con líquen y musgo, el
 * arroyo que baja de la niebla y la fauna— reusando la MISMA atmósfera de ciclo
 * de día, la marea de niebla, los rayos colados y la cámara de llegada del páramo
 * definitivo, pero SIN queñual, sin hojarasca de bosque, sin troncos caídos y sin
 * el cortejo de árboles del bosque de niebla.
 *
 * Por qué NO envuelve EscenaBosqueVivo: aquel es monolítico y compartido (lo usa
 * el mundo Bosque, en manos de otro frente); no expone palanca para sacar los
 * árboles ni para refinar el frailejón. Hacerlo aquí, en archivo propio, cumple
 * el ajuste páramo-específico SIN degradar ninguna pieza compartida (se reusan
 * por import read-only: FondoParamo, FaunaBosque, SueloRico, los geoms de
 * sotobosque/suelo; la atmósfera/cámara se replican de la receta aprobada).
 *
 * Dirección de arte (huesos reales, piel dibujada): LÁMINA NATURALISTA DE
 * HUMBOLDT (botánicamente veraz, plantas por altitud) + atmósfera Ghibli
 * (niebla con alma, luz difusa fría). Pintado, NO fotorrealista, NO rubber-hose;
 * lo elástico vive SOLO en los bichos de FaunaBosque. Estructura/escala EXACTAS
 * del DR-paramo-frailejon (sobre 3.000+ m, colonia dispersa por edades).
 *
 * Presupuesto GPU (DURO): frailejonal y pajonal por InstancedMesh (un banco =
 * una draw-call), niebla por fog + capas billboard (nunca volumétrico), la
 * lejanía sin fog y lavada al aire. Tier-safe y reduced-motion-safe. Importa
 * three → montar SOLO perezosa (lazy) desde el host `<Mundo>`.
 *
 * HOTSPOTS: capa DOM sobre el lienzo (botones accesibles ≥44px) → onHotspot; el
 * "‹ El valle" y el título los pinta el host `<Mundo>` (MigaVolver).
 */
import { Suspense, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import useCicloDia from '../useCicloDia.js';
import { CIELOS_HORA, TRANSICION, mezclaHex } from '../cielosHoraData.js';
import { SombraContacto } from './SombraContacto.jsx';
import SueloRico, { Instancias } from '../terreno/SueloRico.jsx';
import { geomPiedraSuelo, distribuirDetalle } from '../terreno/sueloRico.geom.js';
import FondoParamo from '../bosque/fondoParamo.jsx';
import FaunaBosque from '../bosque/FaunaBosque.jsx';
import {
  alturaBosque,
  sueloDelBosque,
  curvaArroyo,
} from '../bosque/bosqueTakeA.geom.js';
import {
  calidadDeTier,
  floraDeTier,
  raleParamo,
  distribucionFlora,
  despejarCorredor,
  geomRomerillo,
  geomMortino,
  geomRoca,
  geomMusgo,
} from '../bosque/floraParamo.geom.js';
import { geomFrailejonParamo } from './frailejonParamo.geom.js';

/* ── LA ATMÓSFERA DEL PÁRAMO (receta aprobada del bosque de niebla) ─────────
      Presets del día de CIELOS_HORA (el páramo amanece y anochece CON el valle),
      sesgados a bruma altoandina: más fríos y lechosos, el fog MUCHO más cerca
      (aquí la niebla es la protagonista que come el fondo). Copiado de la escena
      aprobada — NO se toca aquella; esta es la del páramo. */
const BRUMA = { fondo: '#c2cecb', suelo: '#3c4634', niebla: '#c6d1ce' };

function presetParamo(franja) {
  const p = CIELOS_HORA[franja] || CIELOS_HORA.manana;
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

function AtmosferaParamo({ franja, perfil, reducedMotion }) {
  const objetivo = useMemo(() => estadoAtmosfera(presetParamo(franja)), [franja]);
  const [ini] = useState(() => presetParamo(franja));
  const [actual] = useState(() => estadoAtmosfera(ini));

  const fondoRef = useRef(null);
  const fogRef = useRef(null);
  const hemiRef = useRef(null);
  const ambRef = useRef(null);
  const solRef = useRef(null);
  const rellenoRef = useRef(null);

  const pintar = (ev) => {
    if (fondoRef.current) fondoRef.current.copy(ev.fondo);
    if (fogRef.current) {
      fogRef.current.color.copy(ev.niebla);
      fogRef.current.near = ev.nieblaCerca;
      fogRef.current.far = ev.nieblaLejos;
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = ev.intensidad * ev.hemisferio * 1.7;
      hemiRef.current.color.copy(ev.domo);
      hemiRef.current.groundColor.copy(ev.suelo);
    }
    if (ambRef.current) {
      ambRef.current.intensity = ev.intensidad * ev.ambiente * 1.3;
      ambRef.current.color.copy(ev.luz);
    }
    if (solRef.current) {
      solRef.current.intensity = ev.intensidad * ev.sol * 1.25;
      solRef.current.color.copy(ev.luz);
      solRef.current.position.set(ev.solPos.x * 1.8, ev.solPos.y * 1.8, ev.solPos.z * 1.8);
    }
    if (rellenoRef.current) {
      rellenoRef.current.intensity = ev.intensidad * ev.rellenoInt * 1.4;
      rellenoRef.current.color.copy(ev.relleno);
      rellenoRef.current.position.set(-ev.solPos.x, Math.max(3, ev.solPos.y * 0.6), -ev.solPos.z);
    }
  };

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
    // LA MAREA DE NIEBLA: onda lenta (~46 s) que cierra y abre la bruma → la
    // catedral del páramo aparece y desaparece (Jackson), no un plano uniforme.
    const marea = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * (Math.PI * 2 / 46));
    if (fogRef.current) {
      fogRef.current.far = actual.nieblaLejos * (1 - 0.44 * marea);
      fogRef.current.near = actual.nieblaCerca * (1 - 0.22 * marea);
    }
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
      <directionalLight
        ref={rellenoRef}
        position={[-ini.solPos[0], Math.max(3, ini.solPos[1] * 0.6), -ini.solPos[2]]}
        intensity={ini.intensidad * ini.rellenoInt * 1.4}
        color={ini.relleno}
      />
    </>
  );
}

/* ── UN BANCO de flora: una geometría, un material, N instancias (con ladeo por
      instancia para que el frailejonal no se lea clonado). ── */
function Banco({ geo, mat, items, castShadow = false }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !items.length) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const eu = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      p.set(it.pos[0], it.pos[1], it.pos[2]);
      eu.set(it.tiltX || 0, it.rotY, it.tiltZ || 0);
      q.setFromEuler(eu);
      s.setScalar(it.escala);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      col.setRGB(it.tint[0], it.tint[1], it.tint[2]);
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
    />
  );
}

/* ── EL PROSCENIO: tres frailejones GIGANTES fijos que enmarcan el cuadro de
      reposo sin tapar el corredor de la abra (bordes del encuadre héroe). ── */
const PROSCENIO = [
  { x: 3.8, z: 11.2, escala: 2.15, rotY: 0.5, tiltX: 0.04, tiltZ: -0.05 },
  { x: 4.9, z: 14.6, escala: 1.8, rotY: 2.6, tiltX: -0.05, tiltZ: 0.05 },
  { x: 11.6, z: 8.9, escala: 2.0, rotY: 4.0, tiltX: 0.05, tiltZ: 0.04 },
];

/* ── EL FRAILEJONAL + PAJONAL (SIN árboles) ──────────────────────────────────
      La planicie del páramo: frailejones por edades (héroes + gradiente joven/
      adulto/viejo + los que florecen) dispersos por el primer plano y la media
      distancia, sobre un pajonal/sotobosque bajo (romerillo, mortiño) y suelo de
      rocas con líquen y musgo. NADA de gaque/roble/encenillo/yarumo/aliso/queñua:
      esto está sobre el límite arbóreo. Posado en el relieve con alturaBosque. */
function FrailejonalParamo({ tier, perfil }) {
  const q = calidadDeTier(tier);
  // Conteos raleados a páramo (más frailejones); las claves de árbol se ignoran.
  const conteos = useMemo(() => raleParamo(floraDeTier(tier)), [tier]);

  const geos = useMemo(() => {
    const g = {};
    if (conteos.frailejonHero) g.frailejonHero = geomFrailejonParamo({ flor: true, q, edad: 0.98 }, 91);
    if (conteos.frailejonJoven) g.frailejonJoven = geomFrailejonParamo({ flor: false, q, edad: 0.26 }, 21);
    if (conteos.frailejon) g.frailejon = geomFrailejonParamo({ flor: false, q, edad: 0.62 }, 1);
    if (conteos.frailejonViejo) g.frailejonViejo = geomFrailejonParamo({ flor: false, q, edad: 0.95 }, 37);
    if (conteos.frailejonFlor) g.frailejonFlor = geomFrailejonParamo({ flor: true, q, edad: 0.78 }, 2);
    g.romerillo = geomRomerillo({ q }, 9); // pajonal / sotobosque bajo
    g.mortino = geomMortino({ q }, 8); // arbusto bajo de agraz
    g.roca = geomRoca(10);
    g.musgo = geomMusgo(11);
    return g;
  }, [conteos, q]);

  const mat = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.9, metalness: 0.0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  const dist = useMemo(() => {
    const d = distribucionFlora(conteos, 707, 'paramo');
    // Las matas ALTAS (frailejones grandes) se rotan fuera del corredor de la
    // inmensidad (la abra + el frente de cámara): nada tapa la cordillera.
    despejarCorredor(d, ['frailejonHero', 'frailejonViejo']);
    const posar = (items) => items.map((it) => ({
      ...it,
      pos: [it.pos[0], alturaBosque(it.pos[0], it.pos[2]) + (it.pos[1] || 0), it.pos[2]],
    }));
    return {
      frailejonHero: posar(d.frailejonHero),
      frailejonJoven: posar(d.frailejonJoven),
      frailejon: posar(d.frailejon),
      frailejonViejo: posar(d.frailejonViejo),
      frailejonFlor: posar(d.frailejonFlor),
      romerillo: posar(d.romerillo),
      mortino: posar(d.mortino),
      roca: posar(d.roca),
      musgo: posar(d.musgo),
    };
  }, [conteos]);

  const proscenio = useMemo(
    () => PROSCENIO.map((p) => ({
      pos: [p.x, alturaBosque(p.x, p.z), p.z],
      rotY: p.rotY,
      escala: p.escala,
      tint: [1, 1, 1],
      tiltX: p.tiltX,
      tiltZ: p.tiltZ,
    })),
    [],
  );

  useLayoutEffect(() => () => {
    Object.values(geos).forEach((gg) => gg && gg.dispose());
    mat.dispose();
  }, [geos, mat]);

  const sombra = perfil.sombras;
  return (
    <group>
      {/* Suelo del páramo: rocas con líquen + montículos de musgo (turbera). */}
      <Banco geo={geos.roca} mat={mat} items={dist.roca} />
      <Banco geo={geos.musgo} mat={mat} items={dist.musgo} />
      {/* Pajonal / sotobosque bajo. */}
      <Banco geo={geos.romerillo} mat={mat} items={dist.romerillo} />
      <Banco geo={geos.mortino} mat={mat} items={dist.mortino} />
      {/* El frailejonal: proscenio héroe + héroes dispersos + gradiente de edad. */}
      <Banco geo={geos.frailejonHero} mat={mat} items={proscenio} castShadow={sombra} />
      <Banco geo={geos.frailejonHero} mat={mat} items={dist.frailejonHero} castShadow={sombra} />
      <Banco geo={geos.frailejonJoven} mat={mat} items={dist.frailejonJoven} />
      <Banco geo={geos.frailejon} mat={mat} items={dist.frailejon} />
      <Banco geo={geos.frailejonViejo} mat={mat} items={dist.frailejonViejo} />
      <Banco geo={geos.frailejonFlor} mat={mat} items={dist.frailejonFlor} />
    </group>
  );
}

/* ── EL ARROYO — el hilo de agua que baja de la niebla (la fábrica de agua). ── */
function Arroyo({ nocturno, perfil }) {
  const rico = perfil.materialRico;
  const ref = useRef(null);
  const geo = useMemo(
    () => new THREE.TubeGeometry(curvaArroyo(), rico ? 72 : 44, 0.21, rico ? 6 : 5, false),
    [rico],
  );
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  useFrame((state) => {
    if (ref.current) ref.current.opacity = 0.72 + Math.sin(state.clock.elapsedTime * 1.7) * 0.06;
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

/* ── EL CORAZÓN DEL CLARO: el PATRIARCA (el frailejón más viejo en flor) con un
      acompañante y las piedras del claro. SIN queñua matriarca (árbol). ── */
const CENTRO = {
  patriarca: { x: -1.6, z: 0.6, escala: 2.55, rotY: 0.8 },
  segundo: { x: 1.9, z: 1.7, escala: 1.3, rotY: 2.4 },
  rocas: [
    { x: -2.7, z: 1.8, escala: 1.9, rotY: 0.4 },
    { x: 1.0, z: 2.9, escala: 1.2, rotY: 2.1 },
    { x: 2.3, z: -1.3, escala: 1.5, rotY: 4.4 },
  ],
};

const posarCentro = (p, hundir = 0) => ({
  pos: [p.x, alturaBosque(p.x, p.z) - hundir, p.z],
  rotY: p.rotY,
  escala: p.escala,
  tint: [1, 1, 1],
});

function CentroParamo({ tier, perfil }) {
  const geoPatriarca = useMemo(
    () => geomFrailejonParamo({ flor: true, q: calidadDeTier(tier), edad: 1 }, 407),
    [tier],
  );
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
  const rocas = useMemo(() => CENTRO.rocas.map((rc) => posarCentro(rc, 0.1)), []);
  useLayoutEffect(() => () => {
    geoPatriarca.dispose();
    geoRoca.dispose();
    mat.dispose();
  }, [geoPatriarca, geoRoca, mat]);
  return (
    <group>
      <Instancias geo={geoPatriarca} mat={mat} items={frailejones} castShadow={perfil.sombras} />
      <Instancias geo={geoRoca} mat={mat} items={rocas} castShadow={perfil.sombras} />
    </group>
  );
}

/* ── LAS PEÑAS DE HITO: rocas grandes cuya silueta se recorta contra la niebla. ── */
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

/* ── LA CÁMARA DE LA LLEGADA (paneo CatmullRom del páramo aprobado) ─────────── */
const DUR_JACKSON = 8.5;
const _miradaJackson = new THREE.Vector3();
function CamaraJackson({ pose, onFin }) {
  const { camera } = useThree();
  const ini = useRef(/** @type {number|null} */ (null));
  const hecho = useRef(false);
  const { curva, va, vb } = useMemo(() => {
    const y0 = alturaBosque(3.8, 11.2);
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
      va: new THREE.Vector3(3.8, y0 + 3.0, 11.2),
      vb: new THREE.Vector3(pose.mira[0], pose.mira[1], pose.mira[2]),
    };
  }, [pose]);
  useFrame(({ clock }) => {
    if (hecho.current) return;
    if (ini.current == null) ini.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - ini.current) / DUR_JACKSON);
    const ev = t * t * (3 - 2 * t);
    curva.getPoint(ev, camera.position);
    _miradaJackson.copy(va).lerp(vb, THREE.MathUtils.smoothstep(ev, 0.45, 1));
    camera.lookAt(_miradaJackson);
    if (t >= 1) {
      hecho.current = true;
      onFin();
    }
  });
  return null;
}

/* ── RAYOS DE SOL COLADOS (godrays baratos) ─────────────────────────────────── */
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
    const p = presetParamo(franja);
    const d = new THREE.Vector3(p.solPos[0], p.solPos[1], p.solPos[2]).normalize();
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

/* ── BRUMA POR CAPAS (niebla volumétrica falsa con parallax) ─────────────────── */
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
    const marea = reducedMotion ? 0 : 0.5 + 0.5 * Math.sin(t * (Math.PI * 2 / 46));
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

/* ── LA CÁMARA: pose de reposo consciente del ASPECTO (planicie abierta) ─────── */
const POSE_PARAMO = { position: [12.0, 5.8, 17.6], fov: 46, mira: [0, 2.5, 0] };
const ANCLAS_SUELO = [
  { x: -1.6, z: 0.6, radio: 1.6 },
  { x: 1.9, z: 1.7, radio: 1.4 },
];
function poseParamoParaAspecto(aspect) {
  if (!aspect || aspect >= 0.9) return { ...POSE_PARAMO, k: 1 };
  const t = Math.min(1, (0.9 - aspect) / 0.44);
  const B = { position: [14.8, 6.2, 21.6], fov: 56, mira: [0, 3.8, 0] };
  const lerp = (a, b) => a + (b - a) * t;
  const position = POSE_PARAMO.position.map((v, i) => lerp(v, B.position[i]));
  const mira = POSE_PARAMO.mira.map((v, i) => lerp(v, B.mira[i]));
  const dist = (p, m) => Math.hypot(p[0] - m[0], p[1] - m[1], p[2] - m[2]);
  return {
    position,
    fov: Math.round(lerp(POSE_PARAMO.fov, B.fov)),
    mira,
    k: dist(position, mira) / dist(POSE_PARAMO.position, POSE_PARAMO.mira),
  };
}

/* ── EL DIORAMA ──────────────────────────────────────────────────────────── */
function Diorama({ tier, reducedMotion, pose }) {
  const perfil = perfilDeTier(tier);
  const controls = useRef(null);
  const { franja } = useCicloDia({ reducedMotion });
  const nocturno = franja === 'noche';
  const fracEstrellas = presetParamo(franja).estrellas;
  const [vuelo, setVuelo] = useState(() => !reducedMotion && tier !== 'bajo');

  return (
    <>
      <AtmosferaParamo franja={franja} perfil={perfil} reducedMotion={reducedMotion} />

      {/* LA INMENSIDAD: bóveda, cordillera, mar de nubes, falda y el frailejonal
          del horizonte (frailejones, no árboles). */}
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

      {/* El terreno: el suelo rico dorado de páramo (relieve + sendero + detalle),
          con el patriarca como ancla de sombra de contacto. */}
      <SueloRico suelo={sueloDelBosque} tier={tier} anclas={ANCLAS_SUELO} />

      {/* El arroyo que baja de la niebla (la fábrica de agua). */}
      {tier !== 'bajo' && <Arroyo nocturno={nocturno} perfil={perfil} />}

      {/* EL FRAILEJONAL + PAJONAL (sin árboles): la firma del páramo. */}
      <FrailejonalParamo tier={tier} perfil={perfil} />

      {/* LA VIDA: cóndor, mariposas, luciérnagas (rubber-hose, aparte del terreno). */}
      <FaunaBosque tier={tier} reducedMotion={reducedMotion} />

      {/* Luz colada entre la niebla (solo donde sobra GPU). */}
      {perfil.materialRico && <RayosDeSol franja={franja} reducedMotion={reducedMotion} />}
      {/* Bruma con parallax (profundidad física al orbitar). */}
      {perfil.fog && <BrumaParallax franja={franja} reducedMotion={reducedMotion} />}

      {/* El corazón del claro: el patriarca en flor + piedras (sin queñua). */}
      <CentroParamo tier={tier} perfil={perfil} />
      {tier !== 'bajo' && <Penas perfil={perfil} />}

      {/* En gama baja SueloRico no dibuja sombras: el kit planta la del patriarca. */}
      {!perfil.sombrasContacto && (
        <SombraContacto pos={[-1.6, 0.04, 0.6]} radio={1.5} color="#20281c" opacidad={0.34} orden={2} />
      )}

      {/* La llegada (paneo) o el reposo orbitable: nunca los dos a la vez. */}
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

/* Los hotspots del páramo, por DATOS (mundoData los pisa si los declara). El
   páramo NO se ara: sus puertas hablan de agua, cuidado y vida — no de cultivo. */
const HOTSPOTS_PARAMO = [
  { id: 'agua', emoji: '💧', label: 'La fábrica de agua', view: 'agua', data: { tema: 'nacimiento' } },
  { id: 'cuidar', emoji: '🏔️', label: 'El páramo se cuida, no se ara', view: 'restauracion' },
  { id: 'vida', emoji: '🦅', label: 'La vida del páramo', view: 'biodiversidad' },
];

const CSS_PARAMO = `
.paramo-mundo { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; }
.paramo-mundo__canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.6s ease; }
.paramo-mundo__canvas--lista { opacity: 1; }
.paramo-mundo__hs {
  position: absolute; inset: 0; z-index: 3; pointer-events: none;
  display: flex; align-items: flex-end; justify-content: center;
  padding: 0 max(0.7rem, env(safe-area-inset-left)) max(0.9rem, env(safe-area-inset-bottom));
}
.paramo-mundo__fila { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; max-width: min(96%, 42rem); }
.paramo-hot {
  pointer-events: auto; display: inline-flex; align-items: center; gap: 0.4rem;
  min-height: 44px; padding: 0.42rem 0.8rem; border: 0; border-radius: 999px;
  background: rgba(16, 24, 28, 0.72); color: #eef4f0;
  font: 600 0.86rem/1.15 system-ui, sans-serif; text-align: left; cursor: pointer;
  backdrop-filter: blur(5px);
  box-shadow: 0 3px 12px rgba(10, 20, 24, 0.4), inset 0 0 0 1px rgba(196, 206, 178, 0.28);
  -webkit-tap-highlight-color: transparent; transition: transform 0.18s ease, background 0.18s ease;
}
.paramo-hot:hover { background: rgba(24, 36, 42, 0.82); transform: translateY(-1px); }
.paramo-hot:focus-visible { outline: 3px solid rgba(120, 190, 214, 0.95); outline-offset: 3px; }
.paramo-hot__emoji { font-size: 1.05rem; line-height: 1; }
@media (prefers-reduced-motion: reduce) {
  .paramo-mundo__canvas { transition: none; }
  .paramo-hot { transition: none; }
  .paramo-hot:hover { transform: none; }
}
`;

/**
 * El mundo El páramo. Montar SOLO perezosa (importa three). Acepta el contrato
 * uniforme del framework de mundos; las props que no usa se ignoran sin ruido.
 * @param {{
 *   hotspots?: Array, tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean,
 *   onHotspot?: (view: string, data?: object) => void,
 *   params?: object, entrada?: object, animo?: string, energia?: number,
 *   estadoFinca?: object, hayAlerta?: boolean
 * }} props
 */
export default function EscenaParamo({
  hotspots,
  tier = 'alto',
  reducedMotion = false,
  onHotspot,
  // Contrato uniforme (no usados por este arquetipo; se aceptan sin ruido):
  params, entrada, animo, energia, estadoFinca, hayAlerta, ...resto // eslint-disable-line no-unused-vars
}) {
  const [listo, setListo] = useState(false);
  const perfil = perfilDeTier(tier);
  const pose = useMemo(
    () => poseParamoParaAspecto(
      typeof window !== 'undefined' && window.innerHeight > 0
        ? window.innerWidth / window.innerHeight
        : 1,
    ),
    [],
  );
  const conVuelo = !reducedMotion && tier !== 'bajo';
  const camIni = useMemo(
    () => (conVuelo ? [5.0, alturaBosque(3.8, 11.2) + 2.2, 13.9] : pose.position),
    [conVuelo, pose],
  );
  const puertas = Array.isArray(hotspots) && hotspots.length ? hotspots : HOTSPOTS_PARAMO;

  return (
    <div className="paramo-mundo">
      <style>{CSS_PARAMO}</style>
      <Canvas
        className={`paramo-mundo__canvas${listo ? ' paramo-mundo__canvas--lista' : ''}`}
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
      {/* La capa de NAVEGACIÓN: puntos de interés del páramo como botones DOM
          accesibles sobre el lienzo (no roban el orbit del canvas). */}
      <div className="paramo-mundo__hs">
        <div className="paramo-mundo__fila">
          {puertas.map((h) => (
            <button
              key={h.id}
              type="button"
              className="paramo-hot"
              onClick={() => onHotspot?.(h.view, h.data)}
              aria-label={h.label}
            >
              <span className="paramo-hot__emoji" aria-hidden="true">{h.emoji}</span>
              <span className="paramo-hot__txt">{h.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
