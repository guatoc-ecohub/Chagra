/*
 * VistaGlobalSierra — la MONTAÑA MAESTRA: la Sierra Nevada de Santa Marta
 * emergiendo del Caribe como portada y mapa vertical de todo Chagra.
 *
 * Es el establishing shot de más alto calibre del mundo 3D: el único macizo
 * litoral que reúne TODOS los pisos térmicos, del mar a la nieve perpetua en
 * ~42 km. Aquí se lee el gradiente altitudinal que estructura al agente y al
 * grafo (cross_thermal): playa y bosque seco → selva húmeda → bosque de niebla
 * → páramo y frailejones → superpáramo → nieve. La silueta es reconocible:
 * cumbres nevadas (Cristóbal Colón · Simón Bolívar), el **Pico Simmonds** al
 * flanco, **Palomino** al pie sobre el Caribe, y el mar abierto al norte.
 *
 * ── TERRITORIO SAGRADO Y HABITADO (regla no negociable, DR cultural) ────────
 * La Sierra es el Corazón del Mundo para los pueblos Kogui, Arhuaco (Iku),
 * Wiwa y Kankuamo, dentro de la Línea Negra. NO es un decorado. Esta escena la
 * representa con dignidad y sobriedad: reverencia, no exotización. Cero
 * iconografía ceremonial (poporo, tejidos rituales, sitios de pagamento), cero
 * "tierra vacía", cero estética mística de adorno. Un pie de texto acredita a
 * los cuatro pueblos SIEMPRE (viaja con la escena: DOM en el modo con Canvas,
 * `Html` en el grupo componible). Cualquier uso público de identidad cultural
 * exige consulta y consentimiento previo, libre e informado (CLPI) con la CIT y
 * las autoridades tradicionales — es decisión de producto, no de esta escena.
 *
 * ── RENDIMIENTO (gama baja + offline, DR render §B/§6) ──────────────────────
 * Terreno 100% procedural (heightmap por función determinista; cero DEM/GLTF/
 * HDR remoto → cachea limpio en el service worker). Un solo material
 * `MeshLambert` con colores por vértice (banding por altitud) — sin shaders
 * propios, sin post-proceso, sin shadow-map. Presupuesto por `tier`
 * (`perfilDeTier`): segmentos de malla, flat vs. smooth, niebla y densidad de
 * nubes. `reducedMotion` congela nubes/brillos y pasa a `frameloop='demand'`.
 * Hora dorada de `atmosferaMadre` (mismo atardecer que el resto de mundos).
 *
 * ── EXPORTS ─────────────────────────────────────────────────────────────────
 *   default  VistaGlobalSierra  → escena montable con su propio <Canvas> + pie
 *                                 de crédito DOM + clave de pisos accesible.
 *   named    SierraDiorama      → grupo r3f puro para COMPONER dentro de otro
 *                                 <Canvas> (trae luces/niebla/crédito por props).
 *
 * ── CABLEO (lo hace el host / otra fable / Opus; este archivo NO toca App.jsx
 *    ni mundoData.js) ─────────────────────────────────────────────────────────
 *
 *   import VistaGlobalSierra from './visual/mundo3d/VistaGlobalSierra.jsx';
 *   // p.ej. ruta mockup #/mockups/sierra-global o nodo maestro del registro:
 *   <VistaGlobalSierra
 *     tier={tier}                 // de decidirTier() (deviceTier.js)
 *     reducedMotion={reducedMotion}
 *     pisoUsuario="frio"          // opcional: resalta el piso de la finca
 *   />                            // 'calido'|'templado'|'frio'|'paramo'|'superparamo'|'nival'
 *
 *   // O componer el grupo dentro de un Canvas propio (encuadre inmersivo:
 *   // desde el mar mirando al sur; target ≈ [0, 2.3, 2.5]):
 *   import { SierraDiorama } from './visual/mundo3d/VistaGlobalSierra.jsx';
 *   <Canvas camera={{ position: [-1.5, 5.2, -11], fov: 48 }}>
 *     <SierraDiorama tier={tier} reducedMotion={reducedMotion} />
 *   </Canvas>
 *
 * El contenedor padre define el alto (como `.mundo-root`).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { ATMOSFERA } from './atmosferaMadre.js';
import { perfilDeTier } from './deviceTier.js';

/* ── Geografía del macizo (validada contra el DR: mar al norte, macizo al sur,
      cumbres gemelas + Simmonds, costa de Palomino). Coordenadas de MUNDO:
      X = oriente-occidente, Y = altura, Z = norte(mar, −) → sur(cumbres, +). ── */
const CIMA = 5.0; // altura de referencia (≈ 5.775 m escalados con drama sobrio)
const COSTA_Z = -3; // latitud de la línea de costa en Z
const ANCHO = 22; // extensión E-O del terreno
const FONDO = 20; // extensión N-S del terreno
const LINEA_NIEVE = 4.15; // ≈ 4.800 msnm: arranca la nieve perpetua

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function gauss(wx, wz, cx, cz, sx, sz) {
  const dx = wx - cx, dz = wz - cz;
  return Math.exp(-((dx * dx) / (2 * sx * sx) + (dz * dz) / (2 * sz * sz)));
}
/* Ruido determinista (hash de senos): mismo macizo siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.9 + wz * 0.7) * 0.5 +
    Math.sin(wx * 1.7 - wz * 1.3 + 2.1) * 0.28 +
    Math.sin(wx * 2.9 + wz * 2.3 + 4.7) * 0.16
  );
}
/* Altura del terreno en un punto de mundo. El mar (Z < costa) queda a ~0. */
function alturaSierra(wx, wz) {
  if (wz < COSTA_Z - 0.2) return -0.15;
  const s = clamp((wz - COSTA_Z) / (10 - COSTA_Z), 0, 1); // rampa costa→interior
  let h = Math.pow(s, 0.9) * CIMA * 0.42;
  h += gauss(wx, wz, 0.6, 3.8, 1.9, 2.4) * CIMA * 0.4; // Pico Cristóbal Colón
  h += gauss(wx, wz, -1.4, 4.4, 1.8, 2.2) * CIMA * 0.38; // Pico Simón Bolívar
  h += gauss(wx, wz, 2.9, 2.9, 1.7, 2.1) * CIMA * 0.42; // Pico Simmonds
  h += gauss(wx, wz, -4.5, 0.6, 3.0, 3.0) * CIMA * 0.16; // estribación occidental
  h += gauss(wx, wz, 5.0, -0.4, 3.0, 3.0) * CIMA * 0.13; // estribación oriental
  h += ruido(wx, wz) * CIMA * 0.07 * s; // crestas/vaguadas, solo tierra adentro
  h *= smoothstep(COSTA_Z - 1.2, COSTA_Z + 1.0, wz); // aplana hacia la costa
  return h;
}

/* Puntos de referencia (world XYZ) para las etiquetas y marcadores. */
const CUMBRE = { x: -0.4, y: 5.0, z: 4.1 }; // Colón · Bolívar (gemelas nevadas)
const SIMMONDS = { x: 2.9, y: 4.36, z: 2.9 };
const PALOMINO = { x: 5.0, y: 0.2, z: -2.85 }; // desembocadura sobre el Caribe

/* ── Banding de pisos térmicos por altitud (colores cálidos de hora dorada;
      la luz del sol termina de entibiarlos). El bosque de niebla es la banda
      donde se enganchan las nubes. ── */
const BANDAS = [
  { tope: 0.28, c: new THREE.Color('#ddc78d') }, // playa / arena
  { tope: 0.95, c: new THREE.Color('#b3a955') }, // bosque seco tropical
  { tope: 1.75, c: new THREE.Color('#437233') }, // selva húmeda
  { tope: 2.6, c: new THREE.Color('#5c8a69') }, // bosque de niebla
  { tope: 3.45, c: new THREE.Color('#94975a') }, // páramo / frailejones
  { tope: LINEA_NIEVE, c: new THREE.Color('#a58f68') }, // superpáramo (roca)
  { tope: Infinity, c: new THREE.Color('#f2ead6') }, // nieve perpetua (blanco cálido)
];
function colorPorAltura(y, out) {
  let i = 0;
  while (i < BANDAS.length - 1 && y > BANDAS[i].tope) i++;
  if (i === 0) return out.copy(BANDAS[0].c);
  const borde = BANDAS[i - 1].tope;
  const t = smoothstep(borde - 0.16, borde + 0.16, y); // transición suave por banda
  return out.lerpColors(BANDAS[i - 1].c, BANDAS[i].c, t);
}

/* La clave de pisos accesible (DOM del modo con Canvas). Nombres de piso, sin
   palabras-gatillo del linter i18n; el color acompaña a la etiqueta. */
const CLAVE_PISOS = [
  { c: '#f2ead6', t: 'Nieve perpetua' },
  { c: '#a58f68', t: 'Superpáramo' },
  { c: '#94975a', t: 'Páramo y frailejones' },
  { c: '#5c8a69', t: 'Bosque de niebla' },
  { c: '#437233', t: 'Selva húmeda' },
  { c: '#b3a955', t: 'Bosque seco' },
  { c: '#ddc78d', t: 'Playa y costa' },
];

/* Altitud representativa de cada piso (world Y), para el marcador "usted". */
const PISOS_Y = {
  calido: 0.6, templado: 1.4, frio: 2.2, paramo: 3.0, superparamo: 3.9, nival: 4.6,
};

/* Construye la malla del terreno en coordenadas de mundo. `plano` = flat-shading
   (des-indexa: caras facetadas, look low-poly de alto gusto en tier alto). */
function construirTerreno(segX, segZ, plano) {
  const nx = segX + 1, nz = segZ + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / segZ;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / segX;
      const y = alturaSierra(wx, wz);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      colorPorAltura(y, c);
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * nx + ix, b = a + 1, d = a + nx, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  if (plano) geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  return geo;
}

/* El mar Caribe al norte: lámina baja y ancha que se pierde en la niebla dorada
   del horizonte. Un destello de sol tenue que respira (apagado en calma). */
function Mar({ reducedMotion, conNiebla }) {
  const destello = useRef(null);
  useFrame((st) => {
    if (reducedMotion || !destello.current) return;
    destello.current.material.opacity = 0.28 + Math.sin(st.clock.elapsedTime * 0.4) * 0.06;
  });
  return (
    <group>
      <mesh position={[0, 0.02, -9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[46, 20]} />
        <meshLambertMaterial color="#4c93ab" transparent opacity={0.96} />
      </mesh>
      {conNiebla && (
        <mesh ref={destello} position={[-3.6, 0.05, -6.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[7, 12]} />
          <meshBasicMaterial color="#ffe6ad" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/* Nubes bajas que se ENGANCHAN en el bosque de niebla (banda ~1.8–2.4): esferas
   blancas aplastadas ancladas a la ladera, que derivan sin prisa. */
function NubesDeNiebla({ cuantas, reducedMotion }) {
  const grupo = useRef(null);
  const nubes = useMemo(() => {
    const out = [];
    for (let i = 0; i < cuantas; i++) {
      const wx = -7 + (14 * (i + 0.5)) / cuantas + Math.sin(i * 2.3) * 1.4;
      // buscar en la ladera norte una Z cuya altura caiga en el bosque de niebla
      let wz = COSTA_Z + 1.2, mejor = 99;
      for (let z = COSTA_Z + 0.5; z < 6; z += 0.25) {
        const d = Math.abs(alturaSierra(wx, z) - (1.9 + (i % 3) * 0.22));
        if (d < mejor) { mejor = d; wz = z; }
      }
      out.push({
        key: `n${i}`,
        base: [wx, alturaSierra(wx, wz) + 0.35, wz],
        esc: 0.7 + ((i * 37) % 10) / 16,
        fase: (i * 1.7) % (Math.PI * 2),
      });
    }
    return out;
  }, [cuantas]);

  useFrame((st) => {
    if (reducedMotion || !grupo.current) return;
    const t = st.clock.elapsedTime;
    grupo.current.children.forEach((n, i) => {
      n.position.x = nubes[i].base[0] + Math.sin(t * 0.045 + nubes[i].fase) * 0.9;
    });
  });

  return (
    <group ref={grupo}>
      {nubes.map((n) => (
        <group key={n.key} position={/** @type {[number, number, number]} */ (n.base)} scale={[n.esc * 1.9, n.esc * 0.5, n.esc * 1.2]}>
          <mesh>
            <sphereGeometry args={[0.6, 9, 7]} />
            <meshBasicMaterial color="#fbf4e6" transparent opacity={0.82} depthWrite={false} />
          </mesh>
          <mesh position={[0.5, 0.05, 0.1]} scale={0.7}>
            <sphereGeometry args={[0.6, 8, 6]} />
            <meshBasicMaterial color="#fdf8ee" transparent opacity={0.72} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* El sol bajo de la hora dorada: disco cálido con dos halos, sobre el horizonte
   del mar, al occidente. Da la dirección de luz y la reverencia del atardecer. */
function SolDorado() {
  return (
    <group position={[-13, 4.4, -6]}>
      <mesh>
        <circleGeometry args={[1.15, 32]} />
        <meshBasicMaterial color="#fff2cf" transparent opacity={0.98} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[2.1, 32]} />
        <meshBasicMaterial color="#ffd98f" transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[3.6, 32]} />
        <meshBasicMaterial color="#f7c66b" transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* Las luces de la hora madre (misma dirección de arte que el resto de mundos).
   Sin shadow-map: es una vista lejana, el costo no se justifica en gama baja. */
function LucesDoradas() {
  return (
    <>
      <hemisphereLight intensity={0.85} color={ATMOSFERA.cielo} groundColor={ATMOSFERA.suelo} />
      <ambientLight intensity={0.32} color="#fff1d6" />
      <directionalLight position={[-12, 6, -4]} intensity={1.25} color={ATMOSFERA.luz} />
      <directionalLight position={[8, 4, 10]} intensity={0.28} color={ATMOSFERA.relleno} />
    </>
  );
}

/* Etiqueta sobria de un lugar, con LEADER LINE: el grupo se ancla en el punto
   geográfico (cima, desembocadura) y una línea fina sube hasta el rótulo. El
   `alto` se ESCALONA entre rótulos vecinos para que nunca colisionen en
   pantalla (Cristóbal Colón·Bolívar arriba, Simmonds a media asta, Palomino a
   ras de costa), sin importar el barrido de la órbita. */
function Rotulo({ pos, texto, sub, distancia = 12, alto = 0.6 }) {
  return (
    <group position={pos}>
      {/* punto de anclaje sobre el lugar */}
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshBasicMaterial color="#fff3cf" depthWrite={false} />
      </mesh>
      {/* la línea guía hasta el rótulo */}
      <mesh position={[0, alto / 2, 0]}>
        <cylinderGeometry args={[0.014, 0.014, alto, 6]} />
        <meshBasicMaterial color="#5a4326" transparent opacity={0.65} depthWrite={false} />
      </mesh>
      <Html center position={[0, alto + 0.12, 0]} distanceFactor={distancia} zIndexRange={[30, 10]} style={{ pointerEvents: 'none' }}>
        <div className="vsierra-rotulo" aria-hidden="true">
          <span className="vsierra-rotulo__txt">
            {texto}
            {sub ? <em className="vsierra-rotulo__sub">{sub}</em> : null}
          </span>
        </div>
      </Html>
    </group>
  );
}

/* Marcador "usted está aquí": haz de luz suave sobre la ladera, a la altitud del
   piso de la finca. Sobrio, sin gamificación. Solo si `pisoUsuario` es válido. */
function MarcadorPiso({ piso }) {
  const punto = useMemo(() => {
    const objetivo = PISOS_Y[piso];
    if (objetivo == null) return null;
    const wx = -4.2; // flanco occidental, cara norte visible
    let wz = COSTA_Z + 0.5, mejor = 99;
    for (let z = COSTA_Z + 0.3; z < 8; z += 0.2) {
      const d = Math.abs(alturaSierra(wx, z) - objetivo);
      if (d < mejor) { mejor = d; wz = z; }
    }
    return [wx, alturaSierra(wx, wz), wz];
  }, [piso]);
  if (!punto) return null;
  return (
    <group position={/** @type {[number, number, number]} */ (punto)}>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.04, 0.32, 2.8, 10, 1, true]} />
        <meshBasicMaterial color="#fff0c2" transparent opacity={0.34} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.42, 24]} />
        <meshBasicMaterial color="#ffdf9c" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <Html center distanceFactor={16} position={[0, 3, 0]} zIndexRange={[40, 20]} style={{ pointerEvents: 'none' }}>
        <div className="vsierra-aqui" aria-hidden="true">Aquí está usted</div>
      </Html>
    </group>
  );
}

/* El pie de crédito a los cuatro pueblos, anclado en 3D (para el grupo
   componible). El modo con Canvas usa además el pie DOM accesible. */
function CreditoPueblos() {
  return (
    <group position={[0, 0.4, -8.5]}>
      <Html center distanceFactor={26} zIndexRange={[20, 5]} style={{ pointerEvents: 'none' }}>
        <p className="vsierra-credito vsierra-credito--3d">
          Territorio ancestral y sagrado de los pueblos Kogui, Arhuaco (Iku),
          Wiwa y Kankuamo — el Corazón del Mundo, dentro de la Línea Negra.
        </p>
      </Html>
    </group>
  );
}

/**
 * SierraDiorama — el grupo r3f puro de la Sierra, para COMPONER dentro de un
 * `<Canvas>` propio (otra escena, un mockup, un preview). Trae el terreno, el
 * mar, las nubes, el sol, los rótulos y —por defecto— sus luces, su niebla y su
 * crédito; el que compone puede apagarlos por props si ya los aporta.
 *
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier='alto']  presupuesto de render.
 * @param {boolean} [props.reducedMotion=false]  congela nubes/brillos.
 * @param {string}  [props.pisoUsuario]  'calido'|'templado'|'frio'|'paramo'|'superparamo'|'nival'.
 * @param {boolean} [props.luces=true]  monta las luces de la hora dorada.
 * @param {boolean} [props.atmosfera=true]  fondo + niebla dorada de la escena.
 * @param {boolean} [props.credito=true]  pie de crédito 3D a los cuatro pueblos.
 */
export function SierraDiorama({
  tier = 'alto',
  reducedMotion = false,
  pisoUsuario,
  luces = true,
  atmosfera = true,
  credito = true,
}) {
  const perfil = perfilDeTier(tier);
  const geo = useMemo(
    () => construirTerreno(perfil.segmentosTerreno, perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  const nubes = tier === 'alto' ? 7 : tier === 'medio' ? 5 : 3;

  /* `color`/`fogExp2` se adjuntan a la ESCENA: van como hijos directos (fragment),
     nunca envueltos en un <group> (adjuntaría al grupo y no pintaría). */
  return (
    <>
      {atmosfera && <color attach="background" args={[ATMOSFERA.fondo]} />}
      {atmosfera && perfil.fog && <fogExp2 attach="fog" args={[ATMOSFERA.niebla, 0.028]} />}
      {luces && <LucesDoradas />}
      <SolDorado />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      <Mar reducedMotion={reducedMotion} conNiebla={perfil.fog} />
      <NubesDeNiebla cuantas={nubes} reducedMotion={reducedMotion} />

      {/* Rótulos sobrios de los lugares exigidos por el encargo. Los `alto`
          escalonados (1.25 / 0.6 / 0.45) separan los rótulos verticalmente en
          pantalla — antes se encimaban ilegibles sobre las cumbres. */}
      <Rotulo pos={[CUMBRE.x, CUMBRE.y, CUMBRE.z]} texto="Cristóbal Colón · Simón Bolívar" sub="5.775 m" distancia={13} alto={1.25} />
      <Rotulo pos={[SIMMONDS.x, SIMMONDS.y, SIMMONDS.z]} texto="Pico Simmonds" sub="5.560 m" distancia={12} alto={0.6} />
      <Rotulo pos={[PALOMINO.x, PALOMINO.y, PALOMINO.z]} texto="Palomino" sub="Caribe · 0 m" distancia={11} alto={0.45} />

      {pisoUsuario && <MarcadorPiso piso={pisoUsuario} />}
      {credito && <CreditoPueblos />}
    </>
  );
}

/* Estilos de los rótulos y pie de crédito (viven aquí: son de ESTA escena). */
const CSS_SIERRA = `
.vsierra-root { position: relative; width: 100%; height: 100dvh; min-height: 320px; overflow: hidden; background: ${ATMOSFERA.fondo}; }
.vsierra-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.7s ease; }
.vsierra-canvas--lista { opacity: 1; }
.vsierra-rotulo { white-space: nowrap; font: 600 0.78rem/1.15 system-ui, sans-serif; color: #402c16; padding: 0.16rem 0.5rem; border-radius: 999px; background: rgba(255,248,233,0.82); box-shadow: 0 1px 5px rgba(60,42,24,0.22); }
.vsierra-rotulo__txt { display: inline-flex; align-items: baseline; gap: 0.3rem; }
.vsierra-rotulo__sub { font-weight: 500; font-style: normal; opacity: 0.72; font-size: 0.9em; }
.vsierra-aqui { padding: 0.2rem 0.55rem; border-radius: 999px; background: rgba(64,44,22,0.82); color: #fff3d6; font: 600 0.72rem/1.1 system-ui, sans-serif; white-space: nowrap; box-shadow: 0 2px 8px rgba(30,18,6,0.3); }
.vsierra-credito { margin: 0; max-width: min(90vw, 40rem); text-align: center; font: 500 0.78rem/1.4 system-ui, sans-serif; color: #f4ecdd; }
.vsierra-credito--3d { padding: 0.4rem 0.8rem; border-radius: 0.7rem; background: rgba(24,16,7,0.44); backdrop-filter: blur(3px); }
.vsierra-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.vsierra-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #3a2a18; text-shadow: 0 1px 4px rgba(255,246,224,0.85); font: 700 1.15rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.vsierra-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.78; margin-top: 0.15rem; }
.vsierra-clave { align-self: flex-end; margin: 0 0.8rem 0.55rem; display: flex; flex-direction: column; gap: 0.24rem; padding: 0.5rem 0.65rem; border-radius: 0.7rem; background: rgba(255,248,233,0.72); backdrop-filter: blur(3px); box-shadow: 0 4px 14px rgba(60,42,24,0.16); }
.vsierra-clave li { display: flex; align-items: center; gap: 0.42rem; list-style: none; font: 500 0.72rem/1.1 system-ui, sans-serif; color: #3a2a18; }
.vsierra-clave b { width: 12px; height: 12px; border-radius: 3px; flex: 0 0 auto; box-shadow: inset 0 0 0 1px rgba(60,42,24,0.18); }
.vsierra-clave ul { margin: 0; padding: 0; }
.vsierra-abajo { display: flex; flex-direction: column; align-items: stretch; }
.vsierra-pie { pointer-events: none; padding: 0 1rem 0.85rem; display: flex; justify-content: center; }
.vsierra-pie p { margin: 0; max-width: 42rem; text-align: center; padding: 0.42rem 0.85rem; border-radius: 0.7rem; background: rgba(24,16,7,0.5); backdrop-filter: blur(3px); color: #f4ecdd; font: 500 0.76rem/1.4 system-ui, sans-serif; }
@media (prefers-reduced-motion: reduce) { .vsierra-canvas { transition: none; } }
`;

/**
 * VistaGlobalSierra — la vista global montable con su propio `<Canvas>`.
 * Trae la cámara de establishing shot, órbita suave acotada, título, clave de
 * pisos accesible y el pie de crédito DOM a los cuatro pueblos. El host decide
 * cuándo mostrarla (no monta lógica de negocio).
 *
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier='alto']  presupuesto de render.
 * @param {boolean} [props.reducedMotion=false]  sin órbita ni nubes; frameloop a demanda.
 * @param {string}  [props.pisoUsuario]  piso de la finca a resaltar (opcional).
 * @param {string}  [props.className]  clases extra del contenedor.
 */
export default function VistaGlobalSierra({
  tier = 'alto',
  reducedMotion = false,
  pisoUsuario,
  className = '',
}) {
  const [listo, setListo] = useState(false);
  const perfil = perfilDeTier(tier);
  return (
    <section
      className={`vsierra-root${className ? ` ${className}` : ''}`}
      data-tier={tier}
      aria-label="Vista global de la Sierra Nevada de Santa Marta: portada y mapa por pisos térmicos"
    >
      <style>{CSS_SIERRA}</style>
      <Canvas
        className={`vsierra-canvas${listo ? ' vsierra-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [-1.5, 5.2, -11], fov: 48 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        {/* Cámara PARADA sobre el mar Caribe (−Z, norte), mirando al SUR (+Z) y
            un poco hacia arriba: el mar llena el primer plano y las cumbres
            nevadas suben en el tercio superior. El encuadre roto anterior venía
            de clamps de azimuth centrados en 0 (lado equivocado) con la cámara
            en −Z (azimuth ≈ ±π): OrbitControls la teletransportaba fuera del
            macizo. Aquí los clamps abrazan el azimuth natural (≈ −3.0 rad). El
            `fov` vertical (48°) encuadra igual en portrait y en landscape. */}
        <SierraDiorama
          tier={tier}
          reducedMotion={reducedMotion}
          pisoUsuario={pisoUsuario}
          credito={false}
        />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={9}
          maxDistance={16}
          target={[0, 2.3, 2.5]}
          minPolarAngle={1.05}
          maxPolarAngle={1.45}
          minAzimuthAngle={-Math.PI}
          maxAzimuthAngle={-2.75}
          enableDamping
          dampingFactor={0.08}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.09}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      {/* Chrome DOM anclado a la composición: título arriba; abajo la clave de
          pisos (accesible) y el pie de crédito, apoyados sobre la playa/mar del
          encuadre — nada flota fuera de la escena. */}
      <div className="vsierra-chrome">
        <h2 className="vsierra-titulo">
          Sierra Nevada de Santa Marta
          <small>Del Caribe a la nieve: todos los pisos térmicos en un solo macizo</small>
        </h2>
        <div className="vsierra-abajo">
          <ul className="vsierra-clave" aria-label="Pisos térmicos, de la nieve al mar">
            {CLAVE_PISOS.map((b) => (
              <li key={b.t}>
                <b style={{ background: b.c }} aria-hidden="true" />
                {b.t}
              </li>
            ))}
          </ul>
          <div className="vsierra-pie">
            <p role="contentinfo">
              Territorio ancestral y sagrado de los pueblos Kogui, Arhuaco (Iku),
              Wiwa y Kankuamo — el Corazón del Mundo, dentro de la Línea Negra.
              Representado con respeto; su uso público requiere consulta con las
              comunidades.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
