/*
 * EscenaBosqueVivo — TAKE B: el bosque del Ent en clave ESTILIZADA (Switch).
 *
 * Una de varias tomas para que el operador elija. Esta apuesta por el DISEÑO
 * sobre el foto-realismo — Zelda BOTW / Ori / Sable:
 *
 *   · TOON de 4 pasos (gradientMap) sobre UN material compartido con color por
 *     vértice: toda la vegetación y el terreno comparten programa. Las bandas
 *     de luz + las bandas de color del terreno = ilustración en movimiento.
 *   · CIELO con domo de gradiente (shader mínimo: cenit→horizonte + glow del
 *     sol) y un ASTRO que es el sol de día y la luna de noche (crossfade con
 *     mares). El atardecer es el vendedor.
 *   · CICLO REAL con useCicloDia + CIELOS_HORA (mismo reloj del valle),
 *     amortiguado imperativo en useFrame — amanece y anochece sin cortes.
 *     `?ciclo=demo` acelera el día; `?ciclo=17.5` clava una hora.
 *   · GODRAYS baratos (3 quads aditivos orientados al sol, solo tier alto) y
 *     DOS bandas de niebla cilíndricas que derivan en sentidos opuestos: el
 *     parallax del vaho del páramo, órbita-seguro.
 *   · SOMBRAS DE CONTACTO instanciadas orientadas a la normal del terreno:
 *     cada árbol, roca y el propio Ent quedan PLANTADOS en su loma.
 *   · El GUARDIÁN (EntQuenua, intacto) al centro del claro; la fauna del
 *     registro (FaunaBosque, SVG rubber-hose) vive a sus alturas de siempre
 *     porque el claro sigue plano. Polen a lo Ori sobre el escenario.
 *
 * Tier-safe vía perfilDeTier + CONTEOS_TAKEB; reducedMotion monta QUIETO
 * (frameloop demand + snap de atmósfera). Importa three → montar SOLO lazy.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import useCicloDia from '../useCicloDia.js';
import { presetDeHora, TRANSICION } from '../cielosHoraData.js';
import CamaraDirector from '../escenas/CamaraDirector.jsx';
import { ParticulasAmbientales } from '../ParticulasAmbientales.jsx';
import EntQuenua from './EntQuenua.jsx';
import FaunaBosque from './FaunaBosque.jsx';
import {
  alturaTakeB,
  geomTerrenoTakeB,
  geomQuenuaTakeB,
  geomFrailejonTakeB,
  geomPastoTakeB,
  geomRocaTakeB,
  geomCordilleraTakeB,
  distribucionTakeB,
  conteosDeTier,
} from './bosqueTakeB.geom.js';

/* ── La capa GRÁFICA por franja (encima de CIELOS_HORA, que pone las luces):
      colores del domo, el astro, el glow, la fuerza de los godrays y cuánta
      niebla de piso trae la hora. El atardecer vende; la noche es azul. ── */
const CIELO_B = {
  amanecer: { cenit: '#54639e', horizonte: '#ffc490', astro: '#ffd7a3', glow: 0.55, rayos: 0.14, neblina: 0.5 },
  manana: { cenit: '#6fb0dd', horizonte: '#eae9c0', astro: '#fff3cf', glow: 0.3, rayos: 0.05, neblina: 0.28 },
  mediodia: { cenit: '#5a9fd6', horizonte: '#dff0f2', astro: '#ffffff', glow: 0.22, rayos: 0, neblina: 0.16 },
  tarde: { cenit: '#6193c4', horizonte: '#f3e2b4', astro: '#ffeebc', glow: 0.32, rayos: 0.06, neblina: 0.26 },
  atardecer: { cenit: '#484a8c', horizonte: '#ff9a55', astro: '#ffb060', glow: 0.75, rayos: 0.2, neblina: 0.42 },
  noche: { cenit: '#0c1230', horizonte: '#273258', astro: '#e9ecdc', glow: 0.32, rayos: 0, neblina: 0.5 },
};

const CAMARA_B = { position: /** @type {[number,number,number]} */ ([2.4, 3.3, 12.6]), fov: 43 };
const MIRA_B = new THREE.Vector3(0, 3.0, 0);

/* ── El estado de atmósfera (mutado in-place, cero alocación por frame). ── */
function estadoAtmosferaB(franja) {
  const p = presetDeHora(franja);
  const e = CIELO_B[franja] || CIELO_B.mediodia;
  return {
    niebla: new THREE.Color(p.niebla),
    cielo: new THREE.Color(p.cielo),
    suelo: new THREE.Color(p.suelo),
    luz: new THREE.Color(p.luz),
    cenit: new THREE.Color(e.cenit),
    horizonte: new THREE.Color(e.horizonte),
    astro: new THREE.Color(e.astro),
    solPos: new THREE.Vector3(...p.solPos),
    intensidad: p.intensidad,
    hemisferio: p.hemisferio,
    ambiente: p.ambiente,
    sol: p.sol,
    nieblaCerca: p.nieblaCerca,
    nieblaLejos: p.nieblaLejos + 12,
    glow: e.glow,
    rayos: e.rayos,
    neblina: e.neblina,
    nocturno: franja === 'noche' ? 1 : 0,
  };
}

function amortiguarB(a, o, k) {
  a.niebla.lerp(o.niebla, k);
  a.cielo.lerp(o.cielo, k);
  a.suelo.lerp(o.suelo, k);
  a.luz.lerp(o.luz, k);
  a.cenit.lerp(o.cenit, k);
  a.horizonte.lerp(o.horizonte, k);
  a.astro.lerp(o.astro, k);
  a.solPos.lerp(o.solPos, k);
  const n = ['intensidad', 'hemisferio', 'ambiente', 'sol', 'nieblaCerca', 'nieblaLejos', 'glow', 'rayos', 'neblina', 'nocturno'];
  for (const c of n) a[c] += (o[c] - a[c]) * k;
}

/* ── Texturas procedurales (una vez): el radial de la sombra de contacto,
      el gradiente vertical del vaho y el haz suave del godray. ── */
function texturaRadial(tam = 64) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(tam / 2, tam / 2, 1, tam / 2, tam / 2, tam / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, tam, tam);
  const tex = new THREE.CanvasTexture(cv);
  return tex;
}

function texturaVaho() {
  const cv = document.createElement('canvas');
  cv.width = 4;
  cv.height = 128;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 128, 0, 0); // abajo blanco → arriba negro
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, '#9a9a9a');
  g.addColorStop(1, '#000000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(cv);
}

function texturaHaz() {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 256;
  const ctx = cv.getContext('2d');
  const gy = ctx.createLinearGradient(0, 0, 0, 256);
  gy.addColorStop(0, 'rgba(255,255,255,0)');
  gy.addColorStop(0.3, 'rgba(255,255,255,1)');
  gy.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gy;
  ctx.fillRect(0, 0, 64, 256);
  const gx = ctx.createLinearGradient(0, 0, 64, 0);
  gx.addColorStop(0, 'rgba(255,255,255,0)');
  gx.addColorStop(0.35, 'rgba(255,255,255,1)');
  gx.addColorStop(0.65, 'rgba(255,255,255,1)');
  gx.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = gx;
  ctx.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(cv);
}

/* ── El shader del domo: gradiente cenit→horizonte + glow alrededor del sol.
      Mínimo (2 mix y un pow), corre en Android barato. ── */
const CIELO_VERT = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const CIELO_FRAG = /* glsl */ `
  varying vec3 vPos;
  uniform vec3 uCenit;
  uniform vec3 uHorizonte;
  uniform vec3 uAstro;
  uniform vec3 uSolDir;
  uniform float uGlow;
  void main() {
    vec3 dir = normalize(vPos);
    float h = clamp(dir.y, 0.0, 1.0);
    vec3 col = mix(uHorizonte, uCenit, pow(h, 0.58));
    float s = pow(max(dot(dir, normalize(uSolDir)), 0.0), 5.0);
    col += uAstro * s * uGlow;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ── Una tanda instanciada (matrices horneadas una vez). ── */
function Instanciada({ geo, mat, items, castShadow = false }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      e.set(0, it.rot, 0);
      q.setFromEuler(e);
      p.set(it.x, it.y, it.z);
      s.setScalar(it.esc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [items]);
  if (!items.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, items.length]}
      castShadow={castShadow}
      frustumCulled={false}
    />
  );
}

/* ── Sombras de contacto: un InstancedMesh de discos radiales ORIENTADOS a la
      normal del terreno (en la ladera no clavan el filo). Plantan todo. ── */
function SombrasContactoB({ items, mat }) {
  const ref = useRef(null);
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(1, 20);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const arriba = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3();
    const e = 0.5;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const dx = alturaTakeB(it.x + e, it.z) - alturaTakeB(it.x - e, it.z);
      const dz = alturaTakeB(it.x, it.z + e) - alturaTakeB(it.x, it.z - e);
      normal.set(-dx, 2 * e, -dz).normalize();
      q.setFromUnitVectors(arriba, normal);
      p.set(it.x, alturaTakeB(it.x, it.z), it.z).addScaledVector(normal, 0.06);
      s.setScalar(it.radio);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [items]);
  if (!items.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} frustumCulled={false} />;
}

/* ── EL DRIVER de la atmósfera: escribe imperativo (fog, luces, domo, astro,
      godrays, vaho, sombras) y amortigua hacia la franja del ciclo. ── */
function AtmosferaTakeB({
  franja,
  reducedMotion,
  fogRef,
  hemiRef,
  ambRef,
  solRef,
  astroRef,
  rayosRef,
  /** ref con TODOS los materiales de atmósfera (mutados por método/campo —
      viajan como ref para que la escritura imperativa sea legal post-render). */
  atmosRef,
}) {
  const objetivo = useMemo(() => estadoAtmosferaB(franja), [franja]);
  const [actual] = useState(() => estadoAtmosferaB(franja));
  const solEscala = 2.2;
  const tmp = useRef(new THREE.Vector3());

  const pintar = (e, camara) => {
    const m = atmosRef.current;
    if (fogRef.current) {
      fogRef.current.color.copy(e.niebla);
      fogRef.current.near = e.nieblaCerca;
      fogRef.current.far = e.nieblaLejos;
    }
    if (hemiRef.current) {
      hemiRef.current.color.copy(e.cielo);
      hemiRef.current.groundColor.copy(e.suelo);
      hemiRef.current.intensity = e.hemisferio * 1.25;
    }
    if (ambRef.current) {
      ambRef.current.color.copy(e.luz);
      ambRef.current.intensity = e.ambiente * 1.1;
    }
    if (solRef.current) {
      solRef.current.color.copy(e.luz);
      solRef.current.intensity = e.sol * 1.4;
      solRef.current.position.copy(e.solPos).multiplyScalar(solEscala);
    }
    if (m.cieloMat) {
      m.cieloMat.uniforms.uCenit.value.copy(e.cenit);
      m.cieloMat.uniforms.uHorizonte.value.copy(e.horizonte);
      m.cieloMat.uniforms.uAstro.value.copy(e.astro);
      m.cieloMat.uniforms.uSolDir.value.copy(e.solPos);
      m.cieloMat.uniforms.uGlow.value = e.glow;
    }
    if (astroRef.current) {
      tmp.current.copy(e.solPos).normalize().multiplyScalar(58);
      astroRef.current.position.copy(tmp.current);
      if (camara) astroRef.current.lookAt(camara.position);
      m.astroMats[0].color.copy(e.astro);
      m.astroMats[1].color.copy(e.astro);
      m.astroMats[1].opacity = 0.12 + e.glow * 0.22;
      for (let i = 0; i < m.maresMats.length; i++) {
        m.maresMats[i].opacity = e.nocturno * 0.45;
      }
    }
    if (rayosRef.current) {
      tmp.current.copy(e.solPos).multiplyScalar(6);
      rayosRef.current.lookAt(tmp.current);
      for (let i = 0; i < m.rayosMats.length; i++) {
        m.rayosMats[i].opacity = e.rayos * (0.65 + i * 0.2);
      }
    }
    if (m.nieblaMats.length) {
      m.nieblaMats[0].color.copy(e.niebla);
      m.nieblaMats[0].opacity = e.neblina * 0.5;
      if (m.nieblaMats[1]) {
        m.nieblaMats[1].color.copy(e.niebla);
        m.nieblaMats[1].opacity = e.neblina * 0.36;
      }
    }
    if (m.sombraMat) m.sombraMat.opacity = 0.15 + e.intensidad * 0.16;
  };

  // Calma pedida → snap: la franja entra completa, sin animar.
  useEffect(() => {
    if (!reducedMotion) return;
    amortiguarB(actual, objetivo, 1);
    pintar(actual, null);
  });

  // Primer fotograma correcto también en modo vivo.
  useLayoutEffect(() => {
    pintar(actual, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(({ camera }, dt) => {
    if (reducedMotion) return;
    const k = 1 - Math.exp((-3 / TRANSICION.duracion) * Math.min(dt, 0.1));
    amortiguarB(actual, objetivo, k);
    pintar(actual, camera);
  });

  return null;
}

/* ── El vaho que deriva: dos bandas cilíndricas girando en sentidos opuestos
      (el parallax del páramo, seguro para la órbita). ── */
function VahoParamo({ mats, reducedMotion, dosBandas }) {
  const b1 = useRef(null);
  const b2 = useRef(null);
  useFrame((_, dt) => {
    if (reducedMotion) return;
    if (b1.current) b1.current.rotation.y += dt * 0.01;
    if (b2.current) b2.current.rotation.y -= dt * 0.006;
  });
  return (
    <>
      <mesh ref={b1} position={[0, 2.1, 0]} material={mats[0]}>
        <cylinderGeometry args={[17, 17, 4.6, 36, 1, true]} />
      </mesh>
      {dosBandas && (
        <mesh ref={b2} position={[0, 3.2, 0]} material={mats[1]}>
          <cylinderGeometry args={[26, 26, 7, 36, 1, true]} />
        </mesh>
      )}
    </>
  );
}

/* ── El diorama completo (dentro del Canvas). ── */
function Diorama({ tier, reducedMotion }) {
  const perfil = perfilDeTier(tier);
  const conteos = conteosDeTier(tier);
  const { franja } = useCicloDia({ reducedMotion });
  const preset = presetDeHora(franja);

  /* Un material toon COMPARTIDO (4 pasos) para terreno + vegetación. */
  const gradientMap = useMemo(() => {
    const tex = new THREE.DataTexture(
      new Uint8Array([70, 128, 192, 255]),
      4,
      1,
      THREE.RedFormat,
    );
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);
  const matVegetal = useMemo(
    () => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap }),
    [gradientMap],
  );

  /* Geometrías (por tier) y siembra determinista. */
  const q = conteos.q;
  const terreno = useMemo(() => geomTerrenoTakeB({ seg: conteos.segTerreno }), [conteos.segTerreno]);
  const variantesArbol = useMemo(
    () => Array.from({ length: conteos.variantes }, (_, i) => geomQuenuaTakeB({ q }, i + 1)),
    [conteos.variantes, q],
  );
  const geoFrailejon = useMemo(() => geomFrailejonTakeB({ q }, 12), [q]);
  const geoPasto = useMemo(() => geomPastoTakeB(23), []);
  const geoRoca = useMemo(() => geomRocaTakeB(34), []);
  const cordillera = useMemo(
    () => [geomCordilleraTakeB(0), geomCordilleraTakeB(1)],
    [],
  );
  const siembra = useMemo(() => distribucionTakeB(conteos, 99), [conteos]);
  const arbolesPorVariante = useMemo(
    () =>
      Array.from({ length: conteos.variantes }, (_, v) =>
        siembra.arboles.filter((a) => a.variante === v),
      ),
    [siembra, conteos.variantes],
  );

  /* Texturas + materiales de atmósfera (una vez). */
  const texRadial = useMemo(() => texturaRadial(), []);
  const texVaho = useMemo(() => texturaVaho(), []);
  const texHaz = useMemo(() => texturaHaz(), []);
  const sombraMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texRadial,
        color: '#141c14',
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
    [texRadial],
  );
  const nieblaMats = useMemo(() => {
    if (!perfil.fog) return [];
    const hacer = () =>
      new THREE.MeshBasicMaterial({
        color: '#c9d3d1',
        alphaMap: texVaho,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      });
    return perfil.materialRico ? [hacer(), hacer()] : [hacer()];
  }, [perfil.fog, perfil.materialRico, texVaho]);
  const rayosMats = useMemo(
    () =>
      perfil.materialRico
        ? [0, 1, 2].map(
            () =>
              new THREE.MeshBasicMaterial({
                color: '#ffdba6',
                alphaMap: texHaz,
                transparent: true,
                opacity: 0,
                depthWrite: false,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                fog: false,
              }),
          )
        : [],
    [perfil.materialRico, texHaz],
  );
  const cieloMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: CIELO_VERT,
        fragmentShader: CIELO_FRAG,
        uniforms: {
          uCenit: { value: new THREE.Color(CIELO_B.mediodia.cenit) },
          uHorizonte: { value: new THREE.Color(CIELO_B.mediodia.horizonte) },
          uAstro: { value: new THREE.Color(CIELO_B.mediodia.astro) },
          uSolDir: { value: new THREE.Vector3(6, 9, 4) },
          uGlow: { value: 0.3 },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  const astroMats = useMemo(
    () => [
      new THREE.MeshBasicMaterial({ color: '#fff3cf', transparent: true, opacity: 0.96, depthWrite: false, fog: false }),
      new THREE.MeshBasicMaterial({ color: '#fff3cf', transparent: true, opacity: 0.2, depthWrite: false, fog: false }),
    ],
    [],
  );
  const maresMats = useMemo(
    () => [
      new THREE.MeshBasicMaterial({ color: '#b9bdb2', transparent: true, opacity: 0, depthWrite: false, fog: false }),
      new THREE.MeshBasicMaterial({ color: '#c2c6ba', transparent: true, opacity: 0, depthWrite: false, fog: false }),
    ],
    [],
  );
  const geoHaz = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.15, 15);
    g.rotateX(Math.PI / 2); // el largo corre por z: el group lo apunta al sol
    return g;
  }, []);

  /* Refs de luces/fog/astro/rayos para el driver. Los materiales viajan
     también dentro de UN ref (escritura imperativa legal post-render). */
  const fogRef = useRef(null);
  const hemiRef = useRef(null);
  const ambRef = useRef(null);
  const solRef = useRef(null);
  const astroRef = useRef(null);
  const rayosRef = useRef(null);
  const controls = useRef(null);
  const atmosRef = useRef({ cieloMat, astroMats, maresMats, rayosMats, nieblaMats, sombraMat });

  /* Las sombras de contacto: árboles, rocas, frailejones y el Ent. */
  const sombras = useMemo(() => {
    const items = [{ x: 0, z: 0, radio: 2.3 }];
    for (const a of siembra.arboles) items.push({ x: a.x, z: a.z, radio: a.esc * 1.15 });
    for (const r of siembra.rocas) items.push({ x: r.x, z: r.z, radio: r.esc * 0.7 });
    for (const f of siembra.frailejones) items.push({ x: f.x, z: f.z, radio: f.esc * 0.5 });
    return items;
  }, [siembra]);

  const fracEstrellas = Number(preset.estrellas) || 0;

  return (
    <>
      {perfil.fog && <fog ref={fogRef} attach="fog" args={['#c9d3d1', 9, 42]} />}

      {/* Luces del ciclo (el driver las escribe cada frame). */}
      <hemisphereLight ref={hemiRef} intensity={0.9} color="#d7e2e4" groundColor="#3a3a2c" />
      <ambientLight ref={ambRef} intensity={0.3} color="#cdd7da" />
      <directionalLight
        ref={solRef}
        position={[13, 20, 9]}
        intensity={1.2}
        color="#eef3f0"
        castShadow={perfil.sombras}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={16}
        shadow-camera-bottom={-8}
      />

      {/* El domo del cielo + el astro (sol de día, luna de noche). */}
      <mesh material={cieloMat} frustumCulled={false}>
        <sphereGeometry args={[64, 24, 14]} />
      </mesh>
      <group ref={astroRef} position={[40, 24, 20]}>
        <mesh material={astroMats[0]}>
          <circleGeometry args={[3.1, 30]} />
        </mesh>
        <mesh material={astroMats[1]} position={[0, 0, -0.2]}>
          <circleGeometry args={[6.2, 30]} />
        </mesh>
        {/* los mares: solo se asoman cuando el astro es luna */}
        <mesh material={maresMats[0]} position={[-0.8, 0.7, 0.05]}>
          <circleGeometry args={[0.8, 16]} />
        </mesh>
        <mesh material={maresMats[1]} position={[0.9, -0.75, 0.05]}>
          <circleGeometry args={[0.55, 14]} />
        </mesh>
      </group>
      {fracEstrellas > 0 && perfil.estrellas > 0 && (
        <Stars
          radius={46}
          depth={18}
          count={Math.max(30, Math.round(perfil.estrellas * fracEstrellas))}
          factor={3.2}
          fade
          speed={reducedMotion ? 0 : 1}
        />
      )}

      {/* EL TERRENO por bandas. */}
      <mesh geometry={terreno} material={matVegetal} receiveShadow={perfil.sombras} />

      {/* La cordillera del fondo (dos capas: el parallax con la niebla). */}
      <mesh geometry={cordillera[1]} material={matVegetal} />
      <mesh geometry={cordillera[0]} material={matVegetal} />

      {/* EL BOSQUE: queñuas instanciadas por variante. */}
      {arbolesPorVariante.map((items, v) => (
        <Instanciada
          key={`arb-${v}`}
          geo={variantesArbol[v]}
          mat={matVegetal}
          items={items}
          castShadow={perfil.sombras}
        />
      ))}
      <Instanciada geo={geoFrailejon} mat={matVegetal} items={siembra.frailejones} castShadow={perfil.sombras} />
      {siembra.pastos.length > 0 && (
        <Instanciada geo={geoPasto} mat={matVegetal} items={siembra.pastos} />
      )}
      <Instanciada geo={geoRoca} mat={matVegetal} items={siembra.rocas} castShadow={perfil.sombras} />

      {/* Sombras de contacto: TODO queda plantado en su loma. */}
      {perfil.sombrasContacto && <SombrasContactoB items={sombras} mat={sombraMat} />}

      {/* Godrays baratos (solo tier alto): 3 haces aditivos hacia el sol. */}
      {rayosMats.length > 0 && (
        <group ref={rayosRef} position={[0, 3.4, 0]}>
          {rayosMats.map((m, i) => (
            <mesh
              key={`haz-${i}`}
              geometry={geoHaz}
              material={m}
              position={[(i - 1) * 2.3, i * 0.5, 6.2]}
              rotation={[0, 0, (i - 1) * 0.22]}
            />
          ))}
        </group>
      )}

      {/* El vaho del páramo que deriva (parallax de niebla). */}
      {nieblaMats.length > 0 && (
        <VahoParamo mats={nieblaMats} reducedMotion={reducedMotion} dosBandas={nieblaMats.length > 1} />
      )}

      {/* Polen a lo Ori sobre el escenario del claro. */}
      {tier !== 'bajo' && (
        <ParticulasAmbientales
          tipo="polen"
          tier={tier}
          reducedMotion={reducedMotion}
          area={[13, 3.6, 13]}
          position={[0, 1.4, 0]}
          semilla={21}
        />
      )}

      {/* LA VIDA del registro: SVG rubber-hose + fauna ambiental. */}
      <FaunaBosque tier={tier} reducedMotion={reducedMotion} />

      {/* EL GUARDIÁN, intacto, en el centro del claro. */}
      <EntQuenua tier={tier} reducedMotion={reducedMotion} />

      {/* El driver del ciclo: amanece y anochece sin cortes. */}
      <AtmosferaTakeB
        franja={franja}
        reducedMotion={reducedMotion}
        fogRef={fogRef}
        hemiRef={hemiRef}
        ambRef={ambRef}
        solRef={solRef}
        astroRef={astroRef}
        rayosRef={rayosRef}
        atmosRef={atmosRef}
      />

      <OrbitControls
        ref={controls}
        makeDefault
        target={[MIRA_B.x, MIRA_B.y, MIRA_B.z]}
        enablePan={false}
        enableZoom
        minDistance={6.5}
        maxDistance={16}
        minPolarAngle={0.5}
        maxPolarAngle={1.52}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.14}
      />
      {/* La llegada de autor: dolly de establecimiento, una vez por sesión. */}
      <CamaraDirector
        controls={controls}
        reposo={CAMARA_B.position}
        mirada={[0, 4.8, 0]}
        duracion={3}
        amplio={1.5}
        respiro={0.05}
        activa={!reducedMotion && tier !== 'bajo'}
        unaVezClave="bosqueTakeB"
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El mundo Bosque Vivo — TAKE B estilizada. Montar SOLO perezosa.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function EscenaBosqueVivo({ tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`bviva-canvas${listo ? ' bviva-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: CAMARA_B.position, fov: CAMARA_B.fov }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama tier={tier} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
