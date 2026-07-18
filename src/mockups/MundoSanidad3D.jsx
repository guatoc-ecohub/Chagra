/*
 * MundoSanidad3D — LA CLÍNICA DEL CULTIVO: aprender a diagnosticar plagas y
 * enfermedades POR OBSERVACIÓN (ruta #/mockups/mundo-sanidad-3d).
 *
 * Una lámina viva/clínica de campo montada en un rincón de la finca. No enseña
 * a "matar bichos": enseña a MIRAR — síntoma → causa → manejo agroecológico —
 * y a distinguir la plaga (el bicho que se mueve) de la enfermedad (la mancha
 * de hongo que se expande). Anti-agroquímico: el enemigo natural como aliado.
 *
 * Cinco estaciones de diagnóstico, legibles de una mirada:
 *
 *   1. HOJA SANA vs HOJA ENFERMA — el tablero de comparación lado a lado. El
 *      ojo aprende la diferencia: color parejo y verde vivo contra el amarilleo,
 *      las manchas y la galería. Delante, LA LUPA que se acerca a ver el síntoma.
 *   2. LAS SEÑAS — el estante de láminas con las cuatro plagas/males comunes:
 *      la broca del café (perforación del grano), el minador (galerías que
 *      serpentean en la hoja), los áfidos y la cochinilla (colonias en el
 *      cogollo) y la gota/tizón de la papa (manchas necróticas que se expanden).
 *   3. PLAGA o ENFERMEDAD — el cartel de la distinción clave: bicho que se
 *      MUEVE contra mancha que se EXPANDE. Es el error más común confundirlas.
 *   4. LOS ALIADOS — el manejo agroecológico: la mariquita y la crisopa que se
 *      comen los áfidos, la avispita parasitoide, el sírfido, la trampa amarilla
 *      (para MEDIR, no envenenar), el caldo y la poda sanitaria.
 *   5. EL CULTIVO VIVO — cafetos (uno sano, uno con señas) y matas de papa que
 *      dan el contexto de la planta entera, más el cafetal instanciado al fondo.
 *
 * DIRECCIÓN DE ARTE (todo dentro del framework, nada inventado por fuera):
 *   - Atmósfera del MEDIODÍA claro del kit (`CIELOS_HORA.mediodia`): la clínica
 *     de campo pide luz pareja para leer bien el color de la hoja.
 *   - Materiales de `PALETA`/`mezclar` (atmosferaMadre): Lambert flatShading,
 *     cero texturas, cero CDN. La ley de coherencia del valle.
 *   - Los aliados de control biológico son la MISMA librería rubber-hose ya
 *     dibujada (MariquitaRubber, Crisopa, Trichogramma, Sirfido) colgada como
 *     billboards; la fauna ambiental usa `Bicho` de FaunaEscena.
 *   - Las láminas de diagnóstico son hojas botánicas planas (ShapeGeometry) con
 *     el síntoma dibujado encima con mallas hijas: se leen como una lámina.
 *
 * RENDIMIENTO: cafetal de fondo instanciado (1 draw call), Lambert sin
 * shadow-map, presupuestos por `perfilDeTier`; `reducedMotion` congela la lupa,
 * los aliados y las partículas y pasa el frameloop a demanda. Gama baja no llega
 * aquí (la vitrina 2D del framework la cubre).
 *
 * Ruta mockup: #/mockups/mundo-sanidad-3d (cableada en App.jsx, sin auth).
 * Español de Colombia, en "usted". Autocontenida y offline.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Html } from '@react-three/drei';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';
import { crearRng } from '../visual/mundo3d/particulasData.js';
import { Bicho } from '../visual/mundo3d/escenas/FaunaEscena.jsx';
import { MariquitaRubber } from '../visual/creatures/FaunaRubberhose.jsx';
import { Crisopa } from '../visual/creatures/Crisopa.jsx';
import { Trichogramma } from '../visual/creatures/Trichogramma.jsx';
import { Sirfido } from '../visual/creatures/Sirfido.jsx';

/* El mediodía claro del kit: única fuente de la atmósfera de esta escena. */
const DIA = CIELOS_HORA.mediodia;

/* La paleta del framework entintada apenas hacia la luz del mediodía. */
const TINTE = DIA.niebla;
const P = {
  pasto: mezclar('#7ca24f', TINTE, 0.22), // la falda verde
  pastoSeco: mezclar('#a8a45c', TINTE, 0.24), // motas pajizas al sol
  tierraCultivo: mezclar('#4a3524', TINTE, 0.16), // tierra rica del cafetal
  tierraClinica: mezclar('#b7a074', TINTE, 0.24), // tierra apisonada de la clínica
  jardinAliado: mezclar('#6f9a48', TINTE, 0.2), // el jardín florido que llama aliados
  // maderas del tablero, atriles y estantes
  maderaVieja: mezclar('#7a5a38', TINTE, 0.2),
  maderaClara: mezclar('#a5804e', TINTE, 0.22),
  // las hojas: el eje del diagnóstico
  hojaSana: mezclar('#4f9b3f', TINTE, 0.14), // verde vivo, parejo
  hojaCafe: mezclar('#2f6d34', TINTE, 0.16), // el verde oscuro lustroso del café
  hojaEnferma: mezclar('#b3ac4e', TINTE, 0.14), // amarilleo clorótico
  papaFollaje: mezclar('#3f7d3a', TINTE, 0.18),
  papaFlor: mezclar('#c3aede', TINTE, 0.08), // la flor lila de la papa
  nervadura: mezclar('#3a5c2c', TINTE, 0.2),
  // los síntomas
  necrosis: mezclar('#5a3a1f', TINTE, 0.08), // la mancha parda
  necrosisSeca: mezclar('#2c1c10', TINTE, 0.05), // el centro seco
  haloClor: mezclar('#d9c24a', TINTE, 0.06), // el halo amarillo alrededor
  galeria: mezclar('#e8e2c8', TINTE, 0.1), // el caminito claro del minador
  granoRojo: mezclar('#c0392b', TINTE, 0.06), // el grano de café maduro
  granoVerde: mezclar('#7a9a3a', TINTE, 0.14), // el grano todavía verde
  perforacion: '#160f08', // el huequito negro de la broca
  afidoVerde: mezclar('#8fbf5a', TINTE, 0.1), // el pulgón verde
  cochinilla: mezclar('#efe9dc', TINTE, 0.04), // el algodoncito blanco
  brocaCuerpo: '#221812', // el cucarroncito negro de la broca
  // el manejo agroecológico
  metalLupa: mezclar('#8a8f96', TINTE, 0.14),
  lenteLupa: '#cfe6f2',
  trampaAmarilla: mezclar('#e8c23a', TINTE, 0.05), // la trampa cromática
  caldoVerde: mezclar('#5c7d3a', TINTE, 0.1), // el caldo/purín
  balde: mezclar('#6a6f76', TINTE, 0.16), // el balde
  florNaranja: mezclar('#e8862e', TINTE, 0.06),
  florAmarilla: mezclar('#e2b93b', TINTE, 0.06),
  tallo: mezclar('#5d7a3c', TINTE, 0.22),
  corteza: mezclar('#6a4a30', TINTE, 0.18),
  piedra: mezclar(PALETA.piedra, TINTE, 0.3),
  cartel: mezclar('#e8dcc0', TINTE, 0.1), // la tabla del cartel
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function gauss(wx, wz, cx, cz, sx, sz) {
  const dx = wx - cx, dz = wz - cz;
  return Math.exp(-((dx * dx) / (2 * sx * sx) + (dz * dz) / (2 * sz * sz)));
}
/* Ruido determinista (hash de senos): misma finca siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/* La geografía: una falda amable con lomas al fondo y TRES explanadas de faena —
   el cultivo a la izquierda, la clínica al centro, el jardín de aliados a la
   derecha. */
const ANCHO = 36;
const FONDO = 30;
function explanada(wx, wz) {
  return Math.max(
    gauss(wx, wz, -7, 4.2, 5.0, 3.6), // el cultivo
    gauss(wx, wz, 1.0, 5.2, 4.4, 3.0), // la clínica (tablero + estante)
    gauss(wx, wz, 7.2, 3.4, 3.8, 3.2), // el jardín de aliados
  );
}
function alturaFinca(wx, wz) {
  let h = 0.55 + ruido(wx * 0.5, wz * 0.5) * 0.22;
  h += gauss(wx, wz, -13, -11, 6.0, 4.2) * 2.2; // loma occidental
  h += gauss(wx, wz, 12, -12, 7.0, 4.6) * 2.6; // loma oriental
  h += gauss(wx, wz, 0, -14, 9.0, 3.6) * 1.8; // el fondo que cierra
  const f = clamp(explanada(wx, wz) * 1.2, 0, 1);
  return h * (1 - f) + 0.55 * f;
}
const Y_SUELO = 0.55;

/* Malla del terreno con colores por vértice: pasto con motas al sol, tierra
   rica bajo el cultivo, tierra apisonada clara en la clínica, verde florido
   en el jardín de aliados. */
function construirTerreno(seg, plano) {
  const nx = seg + 1, nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cPasto = new THREE.Color(P.pasto);
  const cSeco = new THREE.Color(P.pastoSeco);
  const cCultivo = new THREE.Color(P.tierraCultivo);
  const cClinica = new THREE.Color(P.tierraClinica);
  const cJardin = new THREE.Color(P.jardinAliado);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaFinca(wx, wz);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      c.lerpColors(cPasto, cSeco, smoothstep(-0.35, 1.0, ruido(wx + 3, wz - 2)));
      c.lerp(cCultivo, clamp(gauss(wx, wz, -7, 4.2, 4.0, 2.8) * 0.9, 0, 0.82));
      c.lerp(cClinica, clamp(gauss(wx, wz, 1.4, 5.0, 3.8, 2.6) * 1.0, 0, 0.86));
      c.lerp(cJardin, clamp(gauss(wx, wz, 7.2, 3.4, 3.0, 2.6) * 0.85, 0, 0.72));
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iz = 0; iz < seg; iz++) {
    for (let ix = 0; ix < seg; ix++) {
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

/* Las luces del mediodía claro del kit. */
function LucesDia() {
  return (
    <>
      <hemisphereLight intensity={DIA.hemisferio} color={DIA.cielo} groundColor={DIA.suelo} />
      <ambientLight intensity={DIA.ambiente} color={DIA.luz} />
      <directionalLight position={DIA.solPos} intensity={DIA.sol} color={DIA.luz} />
      <directionalLight position={[-6, 5, -7]} intensity={DIA.rellenoInt} color={DIA.relleno} />
    </>
  );
}

/* Nubes del mediodía: esferas planas blancas, quietas, muy lejos. */
function NubesDia() {
  const nubes = [
    [-11, 9.5, -13, 3.2],
    [4, 10.5, -14, 2.4],
    [12, 8.8, -12, 2.9],
  ];
  return (
    <group>
      {nubes.map((n, i) => (
        <mesh key={i} position={[n[0], n[1], n[2]]} scale={[n[3], n[3] * 0.34, n[3] * 0.7]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#fdfaf0" transparent opacity={0.85} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* Etiqueta didáctica sobre la escena (solo en modo «ver las estaciones»). */
function Etiqueta({ pos, texto, paso }) {
  return (
    <group position={pos}>
      <Html center distanceFactor={9} zIndexRange={[30, 0]}>
        <div className="clivo-chip" aria-hidden="true">
          {paso != null && <b>{paso}</b>}
          {texto}
        </div>
      </Html>
    </group>
  );
}

/* ══════════════════════ LA HOJA-LÁMINA Y SUS SÍNTOMAS ══════════════════════ */

/* Silueta de hoja botánica (óvalo en punta) para las láminas de diagnóstico. */
function hojaShapeGeo(w, h) {
  const s = new THREE.Shape();
  const hw = w / 2, hh = h / 2;
  s.moveTo(0, -hh); // el peciolo, abajo
  s.bezierCurveTo(hw * 1.15, -hh * 0.45, hw * 0.95, hh * 0.45, 0, hh); // lado derecho a la punta
  s.bezierCurveTo(-hw * 0.95, hh * 0.45, -hw * 1.15, -hh * 0.45, 0, -hh); // lado izquierdo de vuelta
  return new THREE.ShapeGeometry(s, 18);
}

/* Una hoja plana (lámina) con su nervadura, lista para llevar síntomas encima. */
function Lamina({ w = 1, h = 1.4, color, children }) {
  const geo = useMemo(() => hojaShapeGeo(w, h), [w, h]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group>
      <mesh geometry={geo}>
        <meshLambertMaterial color={color} flatShading side={THREE.DoubleSide} />
      </mesh>
      {/* nervadura central */}
      <mesh position={[0, 0, 0.006]}>
        <boxGeometry args={[0.018, h * 0.86, 0.004]} />
        <meshLambertMaterial color={P.nervadura} flatShading />
      </mesh>
      {/* un par de nervios laterales */}
      {[0.22, -0.05, -0.3].map((fy, i) => (
        <group key={i} position={[0, h * fy, 0.006]}>
          <mesh position={[w * 0.16, 0, 0]} rotation={[0, 0, -0.7]}>
            <boxGeometry args={[0.012, w * 0.42, 0.004]} />
            <meshLambertMaterial color={P.nervadura} flatShading />
          </mesh>
          <mesh position={[-w * 0.16, 0, 0]} rotation={[0, 0, 0.7]}>
            <boxGeometry args={[0.012, w * 0.42, 0.004]} />
            <meshLambertMaterial color={P.nervadura} flatShading />
          </mesh>
        </group>
      ))}
      {children}
    </group>
  );
}

/* La mancha necrótica de la gota/tizón: parda con centro seco y halo amarillo
   que la orla — la seña de que se EXPANDE con la humedad. */
function Mancha({ pos, r = 0.14 }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0, 0.008]}>
        <circleGeometry args={[r * 1.55, 12]} />
        <meshLambertMaterial color={P.haloClor} flatShading side={THREE.DoubleSide} transparent opacity={0.82} />
      </mesh>
      <mesh position={[0, 0, 0.014]}>
        <circleGeometry args={[r, 10]} />
        <meshLambertMaterial color={P.necrosis} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[r * 0.18, r * 0.1, 0.02]}>
        <circleGeometry args={[r * 0.42, 8]} />
        <meshLambertMaterial color={P.necrosisSeca} flatShading side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* La galería del minador: el caminito claro y torcido que la larva deja al
   comer POR DENTRO de la hoja. Serpentea — su firma inconfundible. */
function Galeria({ z = 0.02 }) {
  const geo = useMemo(() => {
    const pts = [
      new THREE.Vector3(-0.24, -0.42, z),
      new THREE.Vector3(-0.02, -0.24, z),
      new THREE.Vector3(0.18, -0.05, z),
      new THREE.Vector3(-0.06, 0.12, z),
      new THREE.Vector3(-0.24, 0.3, z),
      new THREE.Vector3(0.02, 0.44, z),
      new THREE.Vector3(0.2, 0.58, z),
    ];
    const curva = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curva, 44, 0.03, 6, false);
  }, [z]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshLambertMaterial color={P.galeria} flatShading />
    </mesh>
  );
}

/* La colonia de áfidos/cochinilla: el apeñuscamiento de bichitos en el cogollo
   tierno chupando savia — verdes (pulgón) y unos blancos algodonosos (cochinilla). */
function Colonia({ pos, semilla = 1 }) {
  const motas = useMemo(() => {
    const rng = crearRng(200 + semilla);
    return Array.from({ length: 18 }, () => ({
      x: (rng() - 0.5) * 0.34,
      y: (rng() - 0.5) * 0.5,
      r: 0.026 + rng() * 0.02,
      blanco: rng() > 0.72,
    }));
  }, [semilla]);
  return (
    <group position={pos}>
      {motas.map((m, i) => (
        <mesh key={i} position={[m.x, m.y, 0.02 + (i % 3) * 0.006]}>
          <sphereGeometry args={[m.r, 6, 5]} />
          <meshLambertMaterial color={m.blanco ? P.cochinilla : P.afidoVerde} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ══════════════════════ ESTACIÓN 1 · EL TABLERO DE COMPARACIÓN ══════════════════════ */

/* El tablero HOJA SANA | HOJA ENFERMA: la comparación de cabecera. El ojo
   aprende la diferencia — color parejo contra amarilleo, manchas y galería. */
function TableroComparacion({ etiquetas }) {
  return (
    <group position={[0.6, Y_SUELO, 5.7]} rotation={[0, 0.02, 0]}>
      {/* los dos horcones y la viga que sostienen el tablero */}
      {[-1.35, 1.35].map((x, i) => (
        <mesh key={i} position={[x, 1.1, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 2.2, 6]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 2.12, 0]}>
        <boxGeometry args={[3.0, 0.14, 0.16]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      {/* el respaldo del tablero */}
      <mesh position={[0, 1.35, -0.08]} rotation={[-0.16, 0, 0]}>
        <boxGeometry args={[2.7, 1.7, 0.06]} />
        <meshLambertMaterial color={mezclar(P.maderaClara, '#5c4228', 0.35)} flatShading />
      </mesh>

      {/* LA HOJA SANA: verde vivo, parejo, sin una sola seña */}
      <group position={[-0.68, 1.42, 0.12]} rotation={[-0.22, 0.1, 0.04]}>
        <Lamina w={1.05} h={1.5} color={P.hojaSana} />
      </group>
      {/* LA HOJA ENFERMA: amarilleo + manchas + galería + colonia al pie */}
      <group position={[0.72, 1.42, 0.12]} rotation={[-0.22, -0.1, -0.04]}>
        <Lamina w={1.05} h={1.5} color={P.hojaEnferma}>
          <Mancha pos={[-0.24, 0.28, 0]} r={0.15} />
          <Mancha pos={[0.2, -0.02, 0]} r={0.12} />
          <Mancha pos={[0.06, 0.5, 0]} r={0.09} />
          <Galeria z={0.02} />
          <Colonia pos={[-0.2, -0.42, 0]} semilla={3} />
        </Lamina>
      </group>

      {/* el aspa que separa: verde palomita / rojo equis */}
      <mesh position={[-0.68, 2.42, 0.14]}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshLambertMaterial color="#4f9b3f" flatShading />
      </mesh>
      <mesh position={[0.72, 2.42, 0.14]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.16, 0.05, 0.05]} />
        <meshLambertMaterial color="#b23b2e" flatShading />
      </mesh>
      <mesh position={[0.72, 2.42, 0.14]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.16, 0.05, 0.05]} />
        <meshLambertMaterial color="#b23b2e" flatShading />
      </mesh>

      {etiquetas && (
        <>
          <Etiqueta pos={[-0.68, 2.72, 0.2]} texto="Hoja sana" />
          <Etiqueta pos={[0.72, 2.72, 0.2]} texto="Hoja enferma" />
        </>
      )}
    </group>
  );
}

/* LA LUPA: el gesto de «acercar para ver el síntoma» — la clínica de campo.
   Flota suave sobre la hoja enferma; reduced-motion la deja quieta. */
function Lupa({ reducedMotion }) {
  const ref = useRef(null);
  // a la derecha y abajo de la hoja enferma: acerca a ver el síntoma sin tapar
  // las manchas ni la galería de arriba (el ojo tiene que leer la seña).
  const base = [1.98, Y_SUELO + 1.05, 6.65];
  useFrame(({ clock }) => {
    if (reducedMotion || !ref.current) return;
    const t = clock.elapsedTime;
    ref.current.position.y = base[1] + Math.sin(t * 1.1) * 0.1;
    ref.current.position.x = base[0] + Math.sin(t * 0.7) * 0.07;
    ref.current.rotation.z = -0.7 + Math.sin(t * 0.9) * 0.06;
  });
  return (
    <group ref={ref} position={base} rotation={[0, 0, -0.7]}>
      {/* el aro metálico */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.34, 0.05, 8, 20]} />
        <meshLambertMaterial color={P.metalLupa} flatShading />
      </mesh>
      {/* el lente */}
      <mesh>
        <circleGeometry args={[0.32, 20]} />
        <meshBasicMaterial color={P.lenteLupa} transparent opacity={0.34} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* el mango */}
      <mesh position={[0, -0.62, 0]}>
        <cylinderGeometry args={[0.045, 0.05, 0.62, 7]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
      <mesh position={[0, -0.98, 0]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
    </group>
  );
}

/* ══════════════════════ ESTACIÓN 2 · EL ESTANTE DE LÁMINAS ══════════════════════ */

/* Una rama con granos de café para la lámina de la broca: el grano maduro rojo,
   uno perforado con su huequito negro y el cucarroncito asomado. */
function RamaBroca() {
  return (
    <group>
      {/* la ramita */}
      <mesh rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.03, 0.04, 1.0, 6]} />
        <meshLambertMaterial color={P.corteza} flatShading />
      </mesh>
      {/* los granos: dos sanos rojos, uno verde y uno PERFORADO */}
      {[
        [0.12, 0.28, P.granoRojo, false],
        [-0.14, 0.02, P.granoRojo, false],
        [0.16, -0.24, P.granoVerde, false],
        [-0.05, -0.42, P.granoRojo, true],
      ].map((g, i) => (
        <group key={i} position={[g[0], g[1], 0.08]}>
          <mesh>
            <sphereGeometry args={[0.13, 9, 7]} />
            <meshLambertMaterial color={g[2]} flatShading />
          </mesh>
          {/* el surco del grano */}
          <mesh position={[0, 0, 0.12]}>
            <boxGeometry args={[0.012, 0.16, 0.02]} />
            <meshLambertMaterial color={mezclar(g[2], '#3a140e', 0.5)} flatShading />
          </mesh>
          {g[3] && (
            <>
              {/* la perforación de la broca, en el ombligo del grano */}
              <mesh position={[0.02, -0.09, 0.11]}>
                <circleGeometry args={[0.035, 8]} />
                <meshBasicMaterial color={P.perforacion} side={THREE.DoubleSide} />
              </mesh>
              {/* el cucarroncito asomado */}
              <mesh position={[0.02, -0.11, 0.14]} scale={[1, 1.3, 1]}>
                <sphereGeometry args={[0.028, 6, 5]} />
                <meshLambertMaterial color={P.brocaCuerpo} flatShading />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

/* El estante de láminas: la viga con cuatro láminas colgadas, cada una
   aislando UNA seña para que el ojo la aprenda. */
function EstanteLaminas({ etiquetas }) {
  return (
    <group position={[4.0, Y_SUELO, 3.2]} rotation={[0, -0.24, 0]}>
      {/* los postes y la viga del estante */}
      {[-1.9, 1.9].map((x, i) => (
        <mesh key={i} position={[x, 1.05, 0]}>
          <cylinderGeometry args={[0.055, 0.075, 2.1, 6]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 2.02, 0]}>
        <boxGeometry args={[4.1, 0.12, 0.14]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>

      {/* LÁMINA 1 · la broca del café (perforación del grano) */}
      <group position={[-1.5, 1.35, 0.1]} rotation={[-0.2, 0, 0]}>
        <mesh position={[0, 0.62, -0.03]}>
          <boxGeometry args={[0.9, 1.28, 0.04]} />
          <meshLambertMaterial color={P.cartel} flatShading />
        </mesh>
        <group position={[0, 0.55, 0.05]} scale={0.72}>
          <RamaBroca />
        </group>
      </group>

      {/* LÁMINA 2 · el minador (galerías que serpentean) */}
      <group position={[-0.5, 1.42, 0.1]} rotation={[-0.2, 0, 0]}>
        <mesh position={[0, 0.6, -0.03]}>
          <boxGeometry args={[0.9, 1.3, 0.04]} />
          <meshLambertMaterial color={P.cartel} flatShading />
        </mesh>
        <group position={[0, 0.6, 0.05]} scale={0.82}>
          <Lamina w={0.95} h={1.35} color={P.hojaSana}>
            <Galeria z={0.03} />
          </Lamina>
        </group>
      </group>

      {/* LÁMINA 3 · áfidos y cochinilla (colonias en el cogollo) */}
      <group position={[0.5, 1.42, 0.1]} rotation={[-0.2, 0, 0]}>
        <mesh position={[0, 0.6, -0.03]}>
          <boxGeometry args={[0.9, 1.3, 0.04]} />
          <meshLambertMaterial color={P.cartel} flatShading />
        </mesh>
        <group position={[0, 0.6, 0.05]} scale={0.82}>
          <Lamina w={0.95} h={1.35} color={P.hojaCafe}>
            <Colonia pos={[0.04, 0.18, 0]} semilla={5} />
            <Colonia pos={[-0.12, -0.28, 0]} semilla={9} />
          </Lamina>
        </group>
      </group>

      {/* LÁMINA 4 · la gota/tizón de la papa (manchas que se expanden) */}
      <group position={[1.5, 1.42, 0.1]} rotation={[-0.2, 0, 0]}>
        <mesh position={[0, 0.6, -0.03]}>
          <boxGeometry args={[0.9, 1.3, 0.04]} />
          <meshLambertMaterial color={P.cartel} flatShading />
        </mesh>
        <group position={[0, 0.6, 0.05]} scale={0.82}>
          <Lamina w={0.95} h={1.35} color={P.hojaEnferma}>
            <Mancha pos={[0.14, 0.34, 0]} r={0.16} />
            <Mancha pos={[-0.2, 0.02, 0]} r={0.13} />
            <Mancha pos={[0.02, -0.32, 0]} r={0.15} />
            <Mancha pos={[0.24, -0.08, 0]} r={0.08} />
          </Lamina>
        </group>
      </group>

      {etiquetas && (
        <>
          <Etiqueta pos={[-1.5, 2.28, 0.2]} texto="Broca" />
          <Etiqueta pos={[-0.5, 2.32, 0.2]} texto="Minador" />
          <Etiqueta pos={[0.5, 2.32, 0.2]} texto="Áfidos / cochinilla" />
          <Etiqueta pos={[1.5, 2.32, 0.2]} texto="Gota (tizón)" />
        </>
      )}
    </group>
  );
}

/* ══════════════════════ ESTACIÓN 3 · PLAGA o ENFERMEDAD ══════════════════════ */

/* El cartel de la distinción clave: a un lado el BICHO que se mueve, al otro la
   MANCHA que se expande. El error más común es confundirlos. */
function CartelDistincion({ etiquetas }) {
  return (
    <group position={[-2.4, Y_SUELO, 7.2]} rotation={[0, 0.32, 0]}>
      {/* el poste */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 1.6, 6]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      {/* la tabla partida en dos */}
      <mesh position={[0, 1.55, 0]}>
        <boxGeometry args={[1.9, 0.9, 0.05]} />
        <meshLambertMaterial color={P.cartel} flatShading />
      </mesh>
      <mesh position={[0, 1.55, 0.03]}>
        <boxGeometry args={[0.04, 0.9, 0.04]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>

      {/* LADO PLAGA: un cucarroncito (bicho que se mueve) con su rastro de pasos */}
      <group position={[-0.48, 1.58, 0.06]}>
        <mesh scale={[1, 0.8, 0.7]}>
          <sphereGeometry args={[0.17, 9, 7]} />
          <meshLambertMaterial color={P.brocaCuerpo} flatShading />
        </mesh>
        {/* elytros con línea */}
        <mesh position={[0, 0.02, 0.13]}>
          <boxGeometry args={[0.012, 0.22, 0.02]} />
          <meshLambertMaterial color="#0d0a07" flatShading />
        </mesh>
        {/* patas asomando (que se mueve) */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.16, -0.02, 0.02]} rotation={[0, 0, s * 0.9]}>
              <cylinderGeometry args={[0.012, 0.012, 0.16, 4]} />
              <meshLambertMaterial color={P.brocaCuerpo} flatShading />
            </mesh>
          </group>
        ))}
        {/* la flechita de que anda */}
        {[0.28, 0.4, 0.52].map((x, i) => (
          <mesh key={i} position={[x, -0.14, 0.05]}>
            <sphereGeometry args={[0.02, 5, 4]} />
            <meshLambertMaterial color={mezclar(P.necrosis, TINTE, 0.3)} flatShading />
          </mesh>
        ))}
      </group>

      {/* LADO ENFERMEDAD: la mancha que se expande en anillos */}
      <group position={[0.48, 1.58, 0.06]}>
        <mesh position={[0, 0, 0.005]}>
          <circleGeometry args={[0.24, 14]} />
          <meshLambertMaterial color={P.haloClor} flatShading side={THREE.DoubleSide} transparent opacity={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.012]}>
          <circleGeometry args={[0.16, 12]} />
          <meshLambertMaterial color={P.necrosis} flatShading side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.02, 0.02, 0.02]}>
          <circleGeometry args={[0.07, 8]} />
          <meshLambertMaterial color={P.necrosisSeca} flatShading side={THREE.DoubleSide} />
        </mesh>
      </group>

      {etiquetas && (
        <>
          <Etiqueta pos={[-0.5, 2.16, 0.1]} texto="Se mueve" />
          <Etiqueta pos={[0.5, 2.16, 0.1]} texto="Se expande" />
        </>
      )}
    </group>
  );
}

/* ══════════════════════ ESTACIÓN 4 · LOS ALIADOS (MANEJO) ══════════════════════ */

/* Los aliados de control biológico, reusando la librería rubber-hose ya dibujada
   como billboards. Patrullan el jardín en zigzag manso; reduced-motion los para. */
const ALIADOS_COMP = { mariquita: MariquitaRubber, crisopa: Crisopa, trichogramma: Trichogramma, sirfido: Sirfido };
function Aliado({ tipo, base, size = 42, fase = 0, df = 8, title, reducedMotion }) {
  const ref = useRef(null);
  const Comp = ALIADOS_COMP[tipo];
  useFrame(({ clock }) => {
    if (reducedMotion || !ref.current) return;
    const t = clock.elapsedTime + fase;
    ref.current.position.set(
      base[0] + Math.sin(t * 1.05) * 0.55,
      base[1] + Math.sin(t * 2.2) * 0.14,
      base[2] + Math.cos(t * 0.85) * 0.4,
    );
  });
  if (!Comp) return null;
  return (
    <group ref={ref} position={base}>
      <Html center distanceFactor={df} zIndexRange={[20, 0]}>
        <div className="mundo-fauna" aria-hidden="true">
          <Comp size={size} animated={!reducedMotion} title={title} />
        </div>
      </Html>
    </group>
  );
}

/* La trampa amarilla: el panel cromático en su estaca. Llama al insecto volador
   y lo pega — para MEDIR cuántos hay, no para envenenar. */
function TrampaAmarilla({ pos }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 1.0, 6]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.5, 0.62, 0.03]} />
        <meshLambertMaterial color={P.trampaAmarilla} flatShading />
      </mesh>
      {/* los bichitos pegados */}
      {[[0.12, 1.22], [-0.1, 1.05], [0.06, 0.98], [-0.14, 1.2], [0.16, 1.08]].map((b, i) => (
        <mesh key={i} position={[b[0], b[1], 0.03]}>
          <sphereGeometry args={[0.022, 5, 4]} />
          <meshLambertMaterial color={P.brocaCuerpo} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* El balde del caldo/purín y la poda sanitaria: caldo de ceniza o jabón, y la
   rama enferma cortada que se lleva LEJOS del cultivo (al compost). */
function CaldoYPoda({ pos }) {
  return (
    <group position={pos}>
      {/* el balde con el caldo verde */}
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.28, 0.22, 0.48, 12]} />
        <meshLambertMaterial color={P.balde} flatShading />
      </mesh>
      <mesh position={[0, 0.47, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.26, 12]} />
        <meshLambertMaterial color={P.caldoVerde} flatShading />
      </mesh>
      {/* el palo de revolver */}
      <mesh position={[0.1, 0.62, 0.05]} rotation={[0.2, 0, -0.5]}>
        <cylinderGeometry args={[0.018, 0.022, 0.7, 5]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
      {/* el atadito de poda sanitaria al lado */}
      <group position={[0.62, 0.06, 0.15]} rotation={[0, 0.4, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[i * 0.06 - 0.06, 0.05, (i % 2) * 0.05]} rotation={[0.2, i * 0.4, 0.5 + i * 0.1]}>
            <cylinderGeometry args={[0.022, 0.028, 0.55, 5]} />
            <meshLambertMaterial color={P.corteza} flatShading />
          </mesh>
        ))}
        {/* unas hojas enfermas en el atado */}
        <mesh position={[0.12, 0.16, 0.04]} rotation={[0, 0, 0.4]}>
          <sphereGeometry args={[0.09, 6, 5]} />
          <meshLambertMaterial color={P.hojaEnferma} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* Una florecita de la huerta que llama a los aliados (néctar para adultos). */
function FlorAliada({ pos, color, esc = 1 }) {
  return (
    <group position={pos} scale={esc}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.012, 0.016, 0.36, 5]} />
        <meshLambertMaterial color={P.tallo} flatShading />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.11, 0.05, 0.03, 9]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.035, 6, 5]} />
        <meshLambertMaterial color={mezclar(color, '#6a4018', 0.5)} flatShading />
      </mesh>
    </group>
  );
}

/* El jardín de aliados completo: las flores que los llaman, la trampa, el caldo
   y la poda, y los cuatro benéficos patrullando. */
function JardinAliados({ reducedMotion, etiquetas }) {
  const flores = useMemo(() => {
    const rng = crearRng(321);
    return Array.from({ length: 9 }, () => ({
      x: 5.6 + rng() * 3.2,
      z: 1.6 + rng() * 3.2,
      color: rng() > 0.5 ? P.florNaranja : P.florAmarilla,
      esc: 0.85 + rng() * 0.5,
    }));
  }, []);
  return (
    <group>
      {flores.map((f, i) => (
        <FlorAliada key={i} pos={[f.x, Y_SUELO, f.z]} color={f.color} esc={f.esc} />
      ))}
      <TrampaAmarilla pos={[8.6, Y_SUELO, 2.0]} />
      <CaldoYPoda pos={[6.4, Y_SUELO, 4.6]} />

      {/* los aliados: la mariquita y la crisopa comen áfidos, la avispita
          parasita, el sírfido poliniza y su larva come pulgón */}
      <Aliado
        tipo="mariquita"
        base={[6.6, Y_SUELO + 1.5, 2.6]}
        size={48}
        fase={0.4}
        reducedMotion={reducedMotion}
        title="Mariquita, come áfidos"
      />
      <Aliado
        tipo="crisopa"
        base={[8.0, Y_SUELO + 1.7, 3.4]}
        size={44}
        fase={1.9}
        reducedMotion={reducedMotion}
        title="Crisopa, león de áfidos"
      />
      <Aliado
        tipo="trichogramma"
        base={[7.2, Y_SUELO + 1.2, 4.4]}
        size={34}
        fase={3.1}
        reducedMotion={reducedMotion}
        title="Avispita Trichogramma"
      />
      <Aliado
        tipo="sirfido"
        base={[5.6, Y_SUELO + 1.6, 3.0]}
        size={40}
        fase={2.4}
        reducedMotion={reducedMotion}
        title="Mosca de las flores (sírfido)"
      />

      {etiquetas && (
        <>
          <Etiqueta pos={[7.0, Y_SUELO + 2.4, 3.2]} texto="Los aliados" />
          <Etiqueta pos={[8.6, Y_SUELO + 1.85, 2.0]} texto="Trampa (para medir)" />
          <Etiqueta pos={[6.4, Y_SUELO + 1.1, 4.6]} texto="Caldo y poda" />
        </>
      )}
    </group>
  );
}

/* ══════════════════════ ESTACIÓN 5 · EL CULTIVO VIVO ══════════════════════ */

/* Un cluster de follaje: tres esferas achatadas de hoja. */
function Follaje({ pos, r = 0.32, color }) {
  return (
    <group position={pos}>
      {[[0, 0, 0], [r * 0.5, r * 0.2, r * 0.3], [-r * 0.45, r * 0.15, -r * 0.25]].map((o, i) => (
        <mesh key={i} position={o} scale={[1, 0.72, 1]}>
          <sphereGeometry args={[r * (i === 0 ? 1 : 0.72), 7, 6]} />
          <meshLambertMaterial color={mezclar(color, TINTE, (i % 2) * 0.06)} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* El cafeto: el tronco, las ramas horizontales cargadas de follaje y los granos.
   `sano`: verde oscuro lustroso con granos rojos parejos. Con señas: amarilleo,
   follaje ralo y unos granos perdidos — la planta entera también habla. */
function Cafeto({ pos, esc = 1, sano = true }) {
  const ramas = useMemo(() => {
    const rng = crearRng(sano ? 12 : 27);
    return Array.from({ length: 5 }, (_, i) => ({
      y: 0.5 + i * 0.34,
      ang: (i * 2.4) + rng() * 0.5,
      len: 0.5 + rng() * 0.2,
    }));
  }, [sano]);
  const colHoja = sano ? P.hojaCafe : P.hojaEnferma;
  return (
    <group position={pos} scale={esc}>
      {/* el tronco */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.06, 0.1, 1.8, 6]} />
        <meshLambertMaterial color={P.corteza} flatShading />
      </mesh>
      {ramas.map((r, i) => {
        const dx = Math.cos(r.ang) * r.len;
        const dz = Math.sin(r.ang) * r.len;
        return (
          <group key={i}>
            <mesh position={[dx / 2, r.y + 0.05, dz / 2]} rotation={[0, -r.ang, Math.PI / 2 - 0.25]}>
              <cylinderGeometry args={[0.02, 0.03, r.len, 5]} />
              <meshLambertMaterial color={P.corteza} flatShading />
            </mesh>
            <Follaje pos={[dx, r.y + 0.14, dz]} r={0.3 + (i % 2) * 0.06} color={colHoja} />
            {/* los granos junto a la rama (más y más rojos en el sano) */}
            {(sano || i % 2 === 0) && (
              <group position={[dx * 0.8, r.y + 0.02, dz * 0.8]}>
                {[0, 1, 2].map((k) => (
                  <mesh key={k} position={[(k - 1) * 0.06, -0.04 * k, 0.05]}>
                    <sphereGeometry args={[0.05, 7, 5]} />
                    <meshLambertMaterial color={sano ? P.granoRojo : (k === 1 ? P.granoVerde : P.granoRojo)} flatShading />
                  </mesh>
                ))}
              </group>
            )}
          </group>
        );
      })}
      {/* el cogollo alto */}
      <Follaje pos={[0, 1.95, 0]} r={0.26} color={colHoja} />
      {/* la seña de que algo pasa: una hoja amarilla caída al pie */}
      {!sano && (
        <mesh position={[0.3, 0.06, 0.2]} rotation={[Math.PI / 2, 0, 0.5]} scale={[1, 1.4, 1]}>
          <circleGeometry args={[0.12, 8]} />
          <meshLambertMaterial color={P.hojaEnferma} flatShading side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

/* La mata de papa: la roseta baja de follaje con sus flores lila. `sano` verde
   parejo; con gota, manchas oscuras en el follaje y amarilleo. */
function Papa({ pos, esc = 1, sano = true }) {
  const tallos = useMemo(() => {
    const rng = crearRng(sano ? 33 : 44);
    return Array.from({ length: 6 }, (_, i) => ({
      ang: (i / 6) * Math.PI * 2 + rng() * 0.4,
      inc: 0.5 + rng() * 0.3,
      h: 0.45 + rng() * 0.22,
    }));
  }, [sano]);
  const col = sano ? P.papaFollaje : mezclar(P.papaFollaje, P.hojaEnferma, 0.5);
  return (
    <group position={pos} scale={esc}>
      {tallos.map((t, i) => {
        const dx = Math.cos(t.ang) * 0.28;
        const dz = Math.sin(t.ang) * 0.28;
        return (
          <group key={i}>
            <mesh position={[dx * 0.5, t.h * 0.5, dz * 0.5]} rotation={[dz * 0.6, 0, -dx * 0.6]}>
              <cylinderGeometry args={[0.018, 0.026, t.h, 5]} />
              <meshLambertMaterial color={P.tallo} flatShading />
            </mesh>
            <mesh position={[dx, t.h + 0.06, dz]} scale={[1, 0.7, 1]}>
              <sphereGeometry args={[0.2, 7, 6]} />
              <meshLambertMaterial color={mezclar(col, TINTE, (i % 2) * 0.05)} flatShading />
            </mesh>
            {/* las manchas de la gota en el follaje enfermo */}
            {!sano && i % 2 === 0 && (
              <mesh position={[dx + 0.08, t.h + 0.1, dz + 0.1]}>
                <sphereGeometry args={[0.06, 6, 5]} />
                <meshLambertMaterial color={P.necrosis} flatShading />
              </mesh>
            )}
          </group>
        );
      })}
      {/* el corazón del follaje */}
      <mesh position={[0, 0.34, 0]} scale={[1, 0.7, 1]}>
        <sphereGeometry args={[0.26, 8, 6]} />
        <meshLambertMaterial color={col} flatShading />
      </mesh>
      {/* las flores lila (solo cuando está sana y en flor) */}
      {sano && [[0.1, 0.5, 0.05], [-0.14, 0.46, -0.06]].map((f, i) => (
        <mesh key={i} position={f}>
          <sphereGeometry args={[0.05, 6, 5]} />
          <meshLambertMaterial color={P.papaFlor} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* El cafetal de fondo instanciado: matas pequeñas en la falda, 1 draw call para
   todo el sembrado. Da la escala del cultivo detrás de las estaciones. */
function CafetalFondo({ n }) {
  const ref = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(511);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 10) {
      intentos += 1;
      const wx = -14 + rng() * 8.5;
      const wz = -6 + rng() * 5.0;
      const y = alturaFinca(wx, wz);
      if (y > 2.2) continue;
      lista.push({ wx, wz, y, esc: 0.7 + rng() * 0.5 });
    }
    return lista;
  }, [n]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const base = new THREE.Color(P.hojaCafe);
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y + 0.4 * s.esc, s.wz);
      dummy.scale.set(s.esc, s.esc * 1.15, s.esc);
      dummy.rotation.set(0, i * 1.3, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tinte.copy(base).offsetHSL(0, 0, (i % 5) * 0.014 - 0.028);
      m.setColorAt(i, tinte);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [sitios]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
      <sphereGeometry args={[0.5, 7, 6]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* El cultivo vivo: cafetos (sano y con señas) y papas (sana y con gota), más
   la colonia de áfidos que la mariquita vigila — el aliado y la plaga juntos. */
function CultivoVivo({ reducedMotion, etiquetas }) {
  return (
    <group>
      <Cafeto pos={[-8.4, Y_SUELO, 3.0]} esc={1.05} sano />
      <Cafeto pos={[-6.4, Y_SUELO, 4.6]} esc={1.0} sano={false} />
      <Papa pos={[-9.0, Y_SUELO, 5.6]} esc={1.1} sano />
      <Papa pos={[-4.9, Y_SUELO, 6.2]} esc={1.05} sano={false} />

      {/* el aliado en acción: una mariquita sobre el cogollo con áfidos */}
      <group position={[-6.4, Y_SUELO + 1.7, 5.3]}>
        <Html center distanceFactor={8} zIndexRange={[20, 0]}>
          <div className="mundo-fauna" aria-hidden="true">
            <MariquitaRubber size={46} animated={!reducedMotion} title="La mariquita limpia el cogollo" />
          </div>
        </Html>
      </group>

      {etiquetas && (
        <>
          <Etiqueta pos={[-8.4, Y_SUELO + 2.5, 3.0]} texto="Cafeto sano" />
          <Etiqueta pos={[-6.4, Y_SUELO + 2.5, 4.6]} texto="Cafeto con señas" />
          <Etiqueta pos={[-4.9, Y_SUELO + 1.15, 6.2]} texto="Papa con gota" />
        </>
      )}
    </group>
  );
}

/* ══════════════════════ LA ESCENA COMPLETA ══════════════════════ */

function EscenaSanidad({ tier, reducedMotion, etiquetas }) {
  const perfil = perfilDeTier(tier);
  const geo = useMemo(
    () => construirTerreno(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  const nCafetal = tier === 'alto' ? 26 : 16;

  /* `color`/`fog` se adjuntan a la ESCENA: hijos directos, nunca en <group>. */
  return (
    <>
      <color attach="background" args={[DIA.fondo]} />
      {perfil.fog && <fog attach="fog" args={[DIA.niebla, DIA.nieblaCerca + 4, DIA.nieblaLejos]} />}
      <LucesDia />
      <NubesDia />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* el cafetal de fondo instanciado */}
      <CafetalFondo n={nCafetal} />

      {/* las cinco estaciones de la clínica */}
      <CultivoVivo reducedMotion={reducedMotion} etiquetas={etiquetas} />
      <TableroComparacion etiquetas={etiquetas} />
      <Lupa reducedMotion={reducedMotion} />
      <EstanteLaminas etiquetas={etiquetas} />
      <CartelDistincion etiquetas={etiquetas} />
      <JardinAliados reducedMotion={reducedMotion} etiquetas={etiquetas} />

      {/* unas piedras que amueblan el borde */}
      {[
        [-2.0, 1.6, 0.32], [10.4, 2.8, 0.4], [-10.2, 0.6, 0.34],
      ].map((r, i) => (
        <mesh
          key={i}
          position={[r[0], alturaFinca(r[0], r[1]) + r[2] * 0.3, r[1]]}
          rotation={[0.2, i * 1.7, 0.1]}
        >
          <dodecahedronGeometry args={[r[2]]} />
          <meshLambertMaterial color={P.piedra} flatShading />
        </mesh>
      ))}

      {/* la fauna ambiental rubber-hose de la casa (billboards) */}
      <Bicho
        tipo="mariposa"
        base={[7.6, Y_SUELO + 1.4, 2.4]}
        size={26}
        rol="polinizador"
        fase={1.4}
        reducedMotion={reducedMotion}
        title="Mariposa en el jardín de aliados"
      />
      <Bicho
        tipo="colibri"
        base={[-2.0, Y_SUELO + 1.6, 5.2]}
        size={28}
        rol="polinizador"
        fase={0.5}
        reducedMotion={reducedMotion}
        title="Colibrí de paso"
      />

      {/* el polen del kit sobre el jardín florido */}
      <ParticulasAmbientales
        tipo="polen"
        tier={tier}
        reducedMotion={reducedMotion}
        position={[7.2, 1.4, 3.2]}
        semilla={29}
      />
    </>
  );
}

/* ══════════════════════ EL CHROME (DOM) ══════════════════════ */

const CSS_CLIVO = `
.clivo-root { margin: 0 auto; max-width: 72rem; padding: 0 0 2.5rem; background: #f4efe0; color: #33301f; font-family: system-ui, sans-serif; }
.clivo-head { padding: 1.1rem 1rem 0.4rem; }
.clivo-kicker { margin: 0; font: 600 0.72rem/1.2 system-ui, sans-serif; letter-spacing: 0.09em; text-transform: uppercase; color: #6a7a3a; }
.clivo-head h1 { margin: 0.2rem 0 0.4rem; font-size: clamp(1.35rem, 4vw, 1.9rem); line-height: 1.15; color: #38401f; }
.clivo-lema { margin: 0; max-width: 46rem; font-size: 0.92rem; line-height: 1.55; color: #4a4a30; }
.clivo-escena { position: relative; margin: 0.9rem 0 0; height: min(78dvh, 40rem); min-height: 22rem; overflow: hidden; background: ${DIA.fondo}; border-radius: 0; }
.clivo-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.clivo-canvas--lista { opacity: 1; }
.clivo-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: flex-end; }
.clivo-pie { padding: 0 1rem 0.9rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem; }
.clivo-carta { margin: 0; max-width: 34rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(56,64,31,0.68); backdrop-filter: blur(3px); color: #f4f2e2; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.clivo-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(56,64,31,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(250,247,232,0.85); color: #43481c; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.clivo-boton:hover, .clivo-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(56,64,31,0.6); outline: none; }
.clivo-boton[aria-pressed='true'] { background: #dbe6ac; border-color: rgba(67,72,28,0.75); color: #38401f; }
.clivo-chip { pointer-events: none; display: inline-flex; align-items: center; gap: 0.3em; padding: 2px 8px; border-radius: 999px; background: rgba(40,44,24,0.82); color: #f3f6df; font: 600 10px/1.5 system-ui, sans-serif; white-space: nowrap; box-shadow: 0 2px 6px rgba(28,30,10,0.3); }
.clivo-chip b { display: inline-flex; align-items: center; justify-content: center; width: 1.35em; height: 1.35em; border-radius: 50%; background: #8bab4a; color: #24300f; font-size: 9px; }
.mundo-fauna { pointer-events: none; filter: drop-shadow(0 2px 5px rgba(30, 30, 10, 0.24)); }
.clivo-leyenda { padding: 1.4rem 1rem 0; }
.clivo-leyenda h2 { margin: 0 0 0.3rem; font-size: 1.12rem; color: #38401f; }
.clivo-leyenda ol, .clivo-leyenda ul { margin: 0.6rem 0 0; padding: 0; list-style: none; display: grid; gap: 0.7rem; }
.clivo-leyenda li { display: flex; gap: 0.65rem; align-items: flex-start; background: #fbf8ec; border: 1px solid #e2dcc0; border-radius: 0.7rem; padding: 0.65rem 0.8rem; }
.clivo-emoji { font-size: 1.25rem; line-height: 1.3; }
.clivo-leyenda b { display: block; font-size: 0.88rem; color: #38401f; }
.clivo-leyenda p { margin: 0.15rem 0 0; font-size: 0.83rem; line-height: 1.5; color: #4a4a30; }
.clivo-sintoma { display: inline-block; margin: 0.2rem 0 0; font-size: 0.78rem; line-height: 1.45; color: #6a5a2a; }
.clivo-sintoma b { display: inline; color: #5a6a2a; }
.clivo-nota { margin: 0.8rem 0 0; font-size: 0.76rem; line-height: 1.5; color: #6a6a45; font-style: italic; }
.clivo-cierre { margin: 0.9rem 0 0; max-width: 46rem; font-size: 0.86rem; line-height: 1.55; color: #4a4a30; }
@media (min-width: 40rem) { .clivo-leyenda ol, .clivo-leyenda ul { grid-template-columns: 1fr 1fr; } }
@media (prefers-reduced-motion: reduce) { .clivo-canvas { transition: none; } }
`;

/* Las señas comunes: síntoma → causa → manejo agroecológico. Sin agroquímico.
   Enseñar a MIRAR, no a fumigar. */
const SENAS = [
  {
    emoji: '🫘',
    titulo: 'Broca del café',
    sintoma: 'Un huequito negro en el ombligo del grano, como picado con alfiler.',
    causa: 'Un cucarroncito diminuto que perfora el grano y pone sus huevos adentro; se come la almendra por dentro.',
    manejo: 'El RE-RE: repase y recolecte TODO el grano maduro y el que cayó al suelo — no le deje casa. Trampas con alcohol y el hongo Beauveria son sus enemigos.',
  },
  {
    emoji: '🍃',
    titulo: 'Minador de la hoja',
    sintoma: 'Un caminito claro y torcido dibujado DENTRO de la hoja, que serpentea.',
    causa: 'La larva de una polilla que come entre las dos caras de la hoja, abriendo galerías. La hoja pierde fuerza para alimentar la mata.',
    manejo: 'Corte y saque las hojas muy picadas. Deje vivir a la avispita que la parasita: en un cafetal con sombra y flores, ella sola lo controla.',
  },
  {
    emoji: '🐛',
    titulo: 'Áfidos y cochinilla',
    sintoma: 'Bolitas verdes o algodón blanco apeñuscadas en el cogollo tierno; hormigas subiendo y hollín negro pegajoso.',
    causa: 'Insectos chupadores que le sacan la savia al brote nuevo. La melaza que sueltan cría el hollín y llama la hormiga que los cuida.',
    manejo: 'Un buen chorro de agua, caldo de jabón, y sobre todo SUS enemigos: la mariquita y la crisopa se los comen a puñados. No mate la hormiga sin ver.',
  },
  {
    emoji: '🥔',
    titulo: 'Gota (tizón de la papa)',
    sintoma: 'Manchas pardas con borde amarillo que CRECEN y se juntan; con humedad y frío, en días se lleva la mata.',
    causa: 'Un hongo (Phytophthora) — no un bicho. No se mueve: se expande de mancha en mancha y viaja con la lluvia y el rocío.',
    manejo: 'Surcos aireados, no moje el follaje de noche, saque y entierre la mata enferma lejos, rote el lote y siembre variedades resistentes.',
  },
];

/* La distinción clave: plaga (bicho) contra enfermedad (hongo/mancha). */
const DISTINCION = [
  {
    emoji: '🐞',
    titulo: 'La plaga se MUEVE',
    texto: 'Es un bicho: lo ve andar, o ve su huella — la mordida, la perforación, la galería, la colonia. Aparece por focos y anda. Se maneja con sus enemigos naturales, trampas y poda del brote atacado.',
  },
  {
    emoji: '🍂',
    titulo: 'La enfermedad se EXPANDE',
    texto: 'Es un hongo, bacteria o virus: no anda, pero la mancha crece y se junta, y empeora con la humedad. Se maneja con aireación y drenaje, sacando la mata enferma, con semilla sana y rotando el cultivo.',
  },
];

/* Los aliados del control biológico y el manejo agroecológico. */
const ALIADOS = [
  {
    emoji: '🐞',
    titulo: 'La mariquita',
    texto: 'La más conocida: adulta y de larva se come los áfidos a docenas. Una sola limpia un cogollo. Si fumiga, la mata a ella primero — y la plaga vuelve sin quién la pare.',
  },
  {
    emoji: '💚',
    titulo: 'La crisopa (león de áfidos)',
    texto: 'De alas de encaje verde; su larva es la que más pulgón devora en la finca. Vive donde hay flores y no hay veneno.',
  },
  {
    emoji: '🐝',
    titulo: 'La avispita Trichogramma',
    texto: 'Tan chiquita que no se ve, pero pone su huevo DENTRO del huevo de la plaga y no la deja nacer. Trabaja gratis toda la noche.',
  },
  {
    emoji: '🪰',
    titulo: 'El sírfido (mosca de las flores)',
    texto: 'Se disfraza de avispa pero no pica: de adulto poliniza como abeja y de larva come pulgón. Doble aliado en una sola mosca.',
  },
  {
    emoji: '🟨',
    titulo: 'La trampa amarilla',
    texto: 'El color llama al insecto volador y se pega. No es para envenenar: es para MEDIR cuántos hay y decidir con la cabeza, no con el susto.',
  },
  {
    emoji: '🪣',
    titulo: 'Caldos y poda sanitaria',
    texto: 'Caldo de ceniza o de jabón para lo blando, poda de lo enfermo, y todo lo cortado LEJOS del cultivo o al compost. Prevenir sale más barato que curar.',
  },
];

const COPY_CALMA =
  'A la izquierda, el cultivo vivo; al centro, la clínica con las láminas y la lupa; a la derecha, los aliados. Toque el botón para ver los nombres de cada estación.';
const COPY_ESTACIONES =
  'Recorra las estaciones: compare la hoja sana con la enferma, aprenda las señas en las láminas, distinga el bicho que se mueve de la mancha que se expande, y conozca a los aliados que la defienden.';

/**
 * MundoSanidad3D — la clínica del cultivo, montable con su propio `<Canvas>`.
 * Sin lógica de negocio: es una vitrina (#/mockups/mundo-sanidad-3d). El tier y
 * reduced-motion se detectan aquí (mockup standalone), igual que sus pares.
 */
export default function MundoSanidad3D() {
  const [listo, setListo] = useState(false);
  const [etiquetas, setEtiquetas] = useState(false);
  const tier = useMemo(() => decidirTier(), []);
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const perfil = perfilDeTier(tier);

  return (
    <main className="clivo-root">
      <style>{CSS_CLIVO}</style>

      <header className="clivo-head">
        <p className="clivo-kicker">Los mundos de su finca · vitrina</p>
        <h1>La clínica del cultivo</h1>
        <p className="clivo-lema">
          Aprender a diagnosticar por observación: mirar la hoja, leer la seña y
          entender qué le pasa a la planta antes de hacer nada. Aquí la hoja sana
          al lado de la enferma, las plagas y males más comunes de la ladera, y
          los aliados que defienden el cultivo sin un solo veneno. No se trata de
          matar bichos: se trata de aprender a VER.
        </p>
      </header>

      <section
        className="clivo-escena"
        data-tier={tier}
        aria-label="La clínica del cultivo en 3D"
      >
        <Canvas
          className={`clivo-canvas${listo ? ' clivo-canvas--lista' : ''}`}
          dpr={perfil.dpr}
          gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
          camera={{ position: [1.5, 6.2, 15], fov: 45 }}
          frameloop={reducedMotion ? 'demand' : 'always'}
          onCreated={() => setListo(true)}
        >
          <EscenaSanidad tier={tier} reducedMotion={reducedMotion} etiquetas={etiquetas} />
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom
            minDistance={7}
            maxDistance={22}
            target={[0.8, 1.2, 3]}
            minPolarAngle={0.5}
            maxPolarAngle={1.4}
            minAzimuthAngle={-1.05}
            maxAzimuthAngle={1.05}
            enableDamping
            dampingFactor={0.08}
            autoRotate={!reducedMotion}
            autoRotateSpeed={0.08}
          />
          <AdaptiveDpr pixelated />
        </Canvas>

        <div className="clivo-chrome">
          <div className="clivo-pie">
            <button
              type="button"
              className="clivo-boton"
              aria-pressed={etiquetas}
              onClick={() => setEtiquetas((v) => !v)}
            >
              {etiquetas ? 'Quitar las etiquetas' : 'Ver las estaciones'}
            </button>
            <p className="clivo-carta" role="status">
              {etiquetas ? COPY_ESTACIONES : COPY_CALMA}
            </p>
          </div>
        </div>
      </section>

      <section className="clivo-leyenda" aria-label="Las señas de la planta, una por una">
        <h2>Las señas: síntoma, causa y manejo</h2>
        <ul>
          {SENAS.map((s) => (
            <li key={s.titulo}>
              <span className="clivo-emoji" aria-hidden="true">{s.emoji}</span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.sintoma}</p>
                <span className="clivo-sintoma"><b>Es:</b> {s.causa}</span>
                <br />
                <span className="clivo-sintoma"><b>Manejo:</b> {s.manejo}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="clivo-nota">
          El ojo se educa comparando: tenga siempre a la vista una hoja sana para
          saber qué es lo raro. La mancha que crece con la humedad casi nunca es
          plaga — es hongo, y se maneja distinto.
        </p>
      </section>

      <section className="clivo-leyenda" aria-label="Plaga o enfermedad: la distinción">
        <h2>Plaga o enfermedad: no es lo mismo</h2>
        <ul>
          {DISTINCION.map((d) => (
            <li key={d.titulo}>
              <span className="clivo-emoji" aria-hidden="true">{d.emoji}</span>
              <div>
                <b>{d.titulo}</b>
                <p>{d.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="clivo-leyenda" aria-label="Los aliados de la huerta">
        <h2>Los aliados: defender sin veneno</h2>
        <ol>
          {ALIADOS.map((a) => (
            <li key={a.titulo}>
              <span className="clivo-emoji" aria-hidden="true">{a.emoji}</span>
              <div>
                <b>{a.titulo}</b>
                <p>{a.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="clivo-cierre">
          Antes de fumigar, MIRE. El agroquímico no distingue: mata la plaga, pero
          también a la mariquita, la crisopa y la avispita que la controlaban — y
          entonces la plaga vuelve más brava y sin quién la pare. Una finca sana
          no es la que no tiene un solo bicho: es la que tiene con qué defenderse
          sola. Ese equilibrio se cuida observando, no envenenando.
        </p>
      </section>
    </main>
  );
}
