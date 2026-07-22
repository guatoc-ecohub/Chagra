/*
 * VergelFrutalesAndinos — EL VERGEL DE CLIMA FRÍO, sembrado como se siembra.
 *
 * Las siete del catálogo (mora, lulo, tomate de árbol, uchuva, granadilla,
 * gulupa y curuba) puestas en una ladera de finca con la lógica de manejo real,
 * no en fila de vivero: la mora y la gulupa amarradas a su ESPALDERA, la
 * granadilla y la curuba tendidas sobre la RAMADA (uno camina por debajo), el
 * lulo en su claro a media sombra, el tomate de árbol como el único de porte
 * alto y la uchuva al borde, que es donde se pone.
 *
 * NO HAY MANGO NI CÍTRICOS en este vergel, y no es un olvido: son de piso
 * cálido y este es el elenco de clima frío que el catálogo respalda. Ponerlos
 * acá "para que se vea más lleno" es enseñar mal.
 *
 * LEY DE LA CASA: color de la paleta madre, luz de `<LuzMadre>` sobre la
 * familia `CIELOS.huerta`, y toda geometría fusionada por `fusionarSeguro`.
 *
 * RENDIMIENTO: cada especie es UNA geometría con color por vértice → un
 * InstancedMesh por especie (7 + 2 estructuras + terreno ≈ 10 draw calls para
 * todo el vergel). Lambert flatShading a dos caras (las hojas son láminas).
 * Presupuestos por `perfilDeTier`; `reducedMotion` pasa el frameloop a demanda.
 *
 * Vive en el chunk perezoso `vendor-three`.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { VERDES, TIERRAS, CIELOS, mezclar, mezclarCielo, LuzMadre } from '../paleta/index.js';
import { perfilDeTier } from '../deviceTier.js';
import { crearRng } from '../particulasData.js';
import { Bicho } from '../escenas/FaunaEscena.jsx';
import {
  construirMora, construirLulo, construirTomateArbol, construirUchuva,
  construirGranadilla, construirGulupa, construirCuruba,
  construirEspaldera, construirRamada, construirArbolLindero,
} from './frutalesAndinos.geom.js';

const CIELO = CIELOS.huerta;
const NIEBLA = mezclarCielo(CIELO).niebla;

const P = {
  pasto: mezclar(VERDES.brote, NIEBLA, 0.14),
  pastoHondo: mezclar(VERDES.trabajo, NIEBLA, 0.18),
  calle: mezclar(TIERRAS.camino, NIEBLA, 0.2),   // la calle entre surcos
  plateo: mezclar(TIERRAS.mantillo, NIEBLA, 0.18), // el plateo al pie de la mata
};

const ANCHO = 42;
const FONDO = 32;

function ruido(x, z) {
  return (
    Math.sin(x * 0.62 + z * 0.44) * 0.5 +
    Math.sin(x * 1.5 - z * 1.2 + 1.7) * 0.32 +
    Math.sin(x * 2.9 + z * 2.2 + 4.1) * 0.18
  );
}

/* La ladera: el vergel está en pendiente suave, que es donde de verdad se
   siembra (drenaje). Cae hacia el frente. */
function alturaVergel(x, z) {
  // sube atrás (el monte del lindero queda más alto que el lote sembrado)
  const monte = Math.max(0, -z - 7) ** 1.6 * 0.09;
  return z * 0.085 + monte + ruido(x * 0.28, z * 0.28) * 0.16;
}

/* Las CALLES del vergel: bandas de tierra pisada entre las hileras. Devuelve
   0..1. Es lo que hace que se lea como cultivo manejado y no como matorral. */
function calle(x) {
  const banda = Math.abs(((x + 40) % 5.2) - 2.6);
  return Math.max(0, 1 - banda / 0.85);
}

function construirLadera(seg) {
  const nx = seg + 1;
  const pos = new Float32Array(nx * nx * 3);
  const col = new Float32Array(nx * nx * 3);
  const cPasto = new THREE.Color(P.pasto);
  const cHondo = new THREE.Color(P.pastoHondo);
  const cCalle = new THREE.Color(P.calle);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nx; iz++) {
    const z = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const x = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaVergel(x, z);
      pos[p] = x; pos[p + 1] = y; pos[p + 2] = z;
      c.lerpColors(cPasto, cHondo, Math.min(1, Math.max(0, ruido(x, z) * 0.5 + 0.5)));
      c.lerp(cCalle, calle(x) * 0.8);
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iz = 0; iz < seg; iz++) {
    for (let ix = 0; ix < seg; ix++) {
      const a = iz * nx + ix; const b = a + 1; const d = a + nx; const e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  return geo;
}

/* Siembra instanciada: una especie, N sitios, 1 draw call. Los sitios los pone
   la escena (la disposición ES la lección: cada especie donde va). */
function Hilera({ geo, sitios }) {
  const ref = useRef(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    sitios.forEach((s, i) => {
      dummy.position.set(s.x, alturaVergel(s.x, s.z), s.z);
      dummy.rotation.set(0, s.giro ?? 0, 0);
      dummy.scale.setScalar(s.esc ?? 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [sitios]);
  if (!sitios.length) return null;
  return (
    <instancedMesh ref={ref} args={[geo, undefined, sitios.length]} frustumCulled={false}>
      {/* DoubleSide porque las hojas son LÁMINAS: sin esto media hoja
          desaparece según de qué lado la mire la cámara. */}
      <meshLambertMaterial vertexColors flatShading side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

/* La disposición del vergel — el mapa de la finca. Cada especie donde va por
   manejo, no donde quepa. */
function disponer(densidad) {
  const rng = crearRng(29);
  const fila = (n, x0, z0, dx, dz, esc = [0.9, 1.1]) =>
    Array.from({ length: n }, (_, i) => ({
      x: x0 + dx * i + (rng() - 0.5) * 0.28,
      z: z0 + dz * i + (rng() - 0.5) * 0.28,
      giro: rng() * Math.PI * 2,
      esc: esc[0] + rng() * (esc[1] - esc[0]),
    }));

  const n = (base) => Math.max(2, Math.round(base * densidad));

  return {
    // MORA: dos hileras amarradas a espaldera, a la izquierda
    mora: [...fila(n(5), -8.6, 3.4, 0.78, 0), ...fila(n(5), -8.6, 0.9, 0.78, 0)],
    espalderaMora: [
      { x: -6.8, z: 3.4, giro: 0, esc: 1 },
      { x: -6.8, z: 0.9, giro: 0, esc: 1 },
    ],
    // UCHUVA: la hilera del BORDE, al frente — es la que se ve de cerca, y el
    // capacho hay que poder mirarlo sin agacharse
    uchuva: fila(n(7), -4.8, 5.6, 1.45, -0.1, [1, 1.25]),
    // LULO: en su claro a media sombra, en el medio izquierdo
    lulo: fila(n(6), -8.2, -1.6, 1.28, 0.2, [0.9, 1.25]),
    // TOMATE DE ÁRBOL: los altos, atrás a la derecha (no le hacen sombra al resto)
    tomate: [
      ...fila(n(4), 4.2, -1.4, 1.9, 0.25, [0.92, 1.12]),
      ...fila(n(3), 5.0, -4.4, 2.0, 0.2, [0.95, 1.1]),
    ],
    // GULUPA: en espaldera propia, al centro
    gulupa: fila(n(3), -1.9, 2.6, 1.5, 0, [0.95, 1.05]),
    espalderaGulupa: [{ x: 0.1, z: 2.6, giro: 0, esc: 1.3 }],
    // GRANADILLA y CURUBA: bajo la ramada del fondo
    granadilla: [{ x: -3.4, z: -6.6, giro: 0.2, esc: 1 }, { x: -1.4, z: -7.6, giro: 1.1, esc: 0.95 }],
    curuba: [{ x: 1.4, z: -7.2, giro: 2.6, esc: 1 }, { x: 3.2, z: -6.4, giro: 3.6, esc: 0.95 }],
    ramada: [{ x: -2.4, z: -6.9, giro: 0, esc: 1.05 }, { x: 2.3, z: -6.8, giro: 0, esc: 1.05 }],
    // EL LINDERO: la hilera de monte que cierra el lote por detrás
    lindero: Array.from({ length: 16 }, (_, i) => ({
      x: -14.5 + i * 1.95 + (rng() - 0.5) * 1.3,
      z: -10.6 - rng() * 2.6,
      giro: rng() * Math.PI * 2,
      esc: 0.85 + rng() * 0.6,
    })),
  };
}

function Vergel({ tier, reducedMotion }) {
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);
  const rico = tier === 'alto';
  const densidad = rico ? 1 : tier === 'medio' ? 0.7 : 0.45;

  const geoLadera = useMemo(() => construirLadera(rico ? 68 : 42), [rico]);
  const G = useMemo(() => ({
    mora: construirMora(),
    lulo: construirLulo(),
    tomate: construirTomateArbol(),
    uchuva: construirUchuva(),
    granadilla: construirGranadilla(),
    gulupa: construirGulupa(),
    curuba: construirCuruba(),
    espaldera: construirEspaldera(),
    ramada: construirRamada(),
    lindero: construirArbolLindero(4),
  }), []);
  const sitios = useMemo(() => disponer(densidad), [densidad]);

  useEffect(() => () => {
    geoLadera.dispose();
    Object.values(G).forEach((g) => g.dispose());
  }, [geoLadera, G]);

  return (
    <>
      <LuzMadre cielo={CIELO} perfil={perfil} solPos={[7, 9, 6]} />
      <mesh geometry={geoLadera}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>

      {/* el monte del fondo primero: es el telón del lote */}
      <Hilera geo={G.lindero} sitios={sitios.lindero} />

      {/* estructuras de conducción primero (las matas se amarran a ellas) */}
      <Hilera geo={G.espaldera} sitios={[...sitios.espalderaMora, ...sitios.espalderaGulupa]} />
      <Hilera geo={G.ramada} sitios={sitios.ramada} />

      {/* las siete */}
      <Hilera geo={G.mora} sitios={sitios.mora} />
      <Hilera geo={G.lulo} sitios={sitios.lulo} />
      <Hilera geo={G.tomate} sitios={sitios.tomate} />
      <Hilera geo={G.uchuva} sitios={sitios.uchuva} />
      <Hilera geo={G.granadilla} sitios={sitios.granadilla} />
      <Hilera geo={G.gulupa} sitios={sitios.gulupa} />
      <Hilera geo={G.curuba} sitios={sitios.curuba} />

      {/* la vida que cuaja la fruta: la misma librería de siempre, poquita y
          bien puesta (nunca un enjambre). */}
      {!reducedMotion && (
        <>
          <Bicho tipo="colibri" base={[-2.2, alturaVergel(-2.2, -5.2) + 2.5, -5.2]} rol="polinizador" size={26} df={7} />
          <Bicho tipo="mariposa" base={[-6.4, alturaVergel(-6.4, 1.4) + 1.3, 1.4]} rol="polinizador" size={22} df={7} fase={1.4} />
          <Bicho tipo="mariposa" base={[4.6, alturaVergel(4.6, 3.2) + 1.1, 3.2]} rol="polinizador" size={20} df={7} fase={3.1} />
        </>
      )}
    </>
  );
}

export default function VergelFrutalesAndinos({ tier = 'alto', reducedMotion = false }) {
  const cielo = useMemo(() => mezclarCielo(CIELO), []);
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);
  return (
    <Canvas
      camera={{ position: [0.4, 3.3, 9.2], fov: 47 }}
      dpr={perfil.dpr}
      frameloop={reducedMotion ? 'demand' : 'always'}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[cielo.fondo]} />
      {perfil.fog && <fog attach="fog" args={[cielo.niebla, 18, 46]} />}
      <Vergel tier={tier} reducedMotion={reducedMotion} />
      <OrbitControls
        enablePan={false}
        target={[0, 1.5, -1.8]}
        minDistance={5}
        maxDistance={20}
        maxPolarAngle={Math.PI * 0.48}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.22}
      />
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}
