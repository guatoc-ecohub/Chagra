/*
 * MundoVergelFrutal3D — el VERGEL AGROFORESTAL de frutales andinos
 * (ruta #/mockups/mundo-vergel-frutal-3d · prod #diorama_vergel_frutal).
 *
 * No es un huerto de árboles sueltos: es un BOSQUE COMESTIBLE de clima
 * templado-cálido donde la agroforestería APILA estratos, como hace el monte:
 *
 *   1 · ESTRATO ALTO — los aguacates (Hass y criollo) y el mango de copa
 *       ancha: dan la sombra que regula el sol de todos los demás.
 *   2 · ESTRATO MEDIO — los cítricos (naranjo en flor, naranjo cargado,
 *       mandarino, limonero) y el guayabo de tronco pintado: fruta de media
 *       altura que vive bien bajo la sombra rala de los grandes.
 *   3 · ESTRATO BAJO — el lulo de hoja grandota, el tomate de árbol con sus
 *       racimos colgados y el papayo de tronco solo: los que agradecen el
 *       abrigo de los de arriba.
 *   4 · COBERTURA VIVA — el maní forrajero de florecita amarilla y la
 *       hojarasca que sueltan los árboles: tapan el suelo, guardan la
 *       humedad y se vuelven abono sin que nadie cargue un bulto.
 *
 * La fruta se muestra en sus TRES momentos — flor, fruta verde, fruta
 * madura — para que se lea que el vergel no da todo el mismo día: escalona
 * la cosecha durante el año.
 *
 * DIRECCIÓN DE ARTE (todo dentro del framework, nada inventado por fuera):
 *   - Atmósfera de la MAÑANA del kit (`CIELOS_HORA.manana`): la hora de
 *     coger fruta, con la luz fresca entrando de lado entre las copas.
 *   - Materiales de `PALETA`/`mezclar` (atmosferaMadre): Lambert flatShading,
 *     cero texturas, cero CDN. La ley de coherencia del valle.
 *   - La fauna es la MISMA librería rubber-hose (`Bicho` de FaunaEscena):
 *     colibrí en el naranjo florecido, mariposa en el lulo, escarabajo y
 *     lombriz trabajando la hojarasca.
 *   - Polen y mariposas del kit (`ParticulasAmbientales`) entre los estratos.
 *
 * RENDIMIENTO: cobertura viva instanciada (2 draw calls para todo el maní
 * forrajero) y hojarasca instanciada (1 draw call); los árboles son pocos y
 * low-poly. Lambert sin shadow-map, presupuestos por `perfilDeTier`;
 * `reducedMotion` congela brisa/fauna y pasa el frameloop a demanda.
 *
 * Ruta mockup: #/mockups/mundo-vergel-frutal-3d (App.jsx, sin auth).
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

/* La mañana del kit: única fuente de la atmósfera de esta escena. */
const DIA = CIELOS_HORA.manana;

/* La paleta del framework entintada hacia la luz fresca de la mañana. */
const TINTE = DIA.niebla;
const P = {
  pasto: mezclar('#79a04e', TINTE, 0.2), // la falda verde del vergel
  pastoClaro: mezclar('#9db35c', TINTE, 0.22), // claros donde entra el sol
  hojarasca: mezclar('#6b4f2e', TINTE, 0.18), // la alfombra parda bajo los árboles
  cobertura: mezclar('#4e8a3c', TINTE, 0.16), // el maní forrajero, verde vivo
  coberturaFlor: mezclar('#e8c53a', TINTE, 0.06), // su florecita amarilla
  tronco: mezclar('#6e4f30', TINTE, 0.2), // madera de los frutales
  troncoGuayabo: mezclar('#b08a5e', TINTE, 0.16), // el tronco liso y pintado
  troncoPapayo: mezclar('#8a9a6a', TINTE, 0.18), // el tallo verdoso del papayo
  aguacateCopa: mezclar('#3f6b34', TINTE, 0.2), // verde oscuro y hondo
  aguacateHass: mezclar('#2e3a24', TINTE, 0.1), // el fruto casi negro
  aguacateCriollo: mezclar('#5c8a3e', TINTE, 0.1), // el fruto verde brillante
  mangoCopa: mezclar('#4a7a38', TINTE, 0.2), // copa ancha, verde medio
  mangoVerde: mezclar('#7ba242', TINTE, 0.08),
  mangoMaduro: mezclar('#e8a832', TINTE, 0.06), // amarillo con chapeta roja
  mangoChapeta: mezclar('#c8502e', TINTE, 0.06),
  citricoCopa: mezclar('#527e3c', TINTE, 0.2), // el verde lustroso del naranjo
  limoneroCopa: mezclar('#6d9448', TINTE, 0.2), // más claro y amarillento
  naranja: mezclar('#e88a28', TINTE, 0.05),
  mandarina: mezclar('#e8992e', TINTE, 0.05),
  limon: mezclar('#e0d23a', TINTE, 0.05),
  azahar: mezclar('#f6f1de', TINTE, 0.04), // la flor blanca del cítrico
  frutaVerde: mezclar('#8aa84e', TINTE, 0.1), // fruta por madurar, cualquiera
  guayabaFruta: mezclar('#cfd05a', TINTE, 0.08), // amarillo verdoso
  guayaboCopa: mezclar('#5d8a44', TINTE, 0.22),
  luloHoja: mezclar('#3e7038', TINTE, 0.18), // hoja grandota
  luloNervio: mezclar('#6a4a7a', TINTE, 0.14), // el morado de sus nervios
  luloFruta: mezclar('#e0862a', TINTE, 0.06), // la bolita naranja
  tomateArbolHoja: mezclar('#4a7a40', TINTE, 0.2),
  tomateArbolFruta: mezclar('#c8442e', TINTE, 0.06), // el huevo rojo colgado
  papayoHoja: mezclar('#4e8a42', TINTE, 0.18), // la palma de su corona
  papayaVerde: mezclar('#6f9a48', TINTE, 0.1),
  papayaMadura: mezclar('#e8a23a', TINTE, 0.06),
  piedra: mezclar(PALETA.piedra, TINTE, 0.3),
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
/* Ruido determinista (hash de senos): el mismo vergel siempre. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/* La geografía: una ladera templada-cálida amable, con lomas que cierran el
   fondo y la explanada del vergel al centro, apenas ondulada. */
const ANCHO = 40;
const FONDO = 32;
function explanada(wx, wz) {
  return Math.max(
    gauss(wx, wz, -3, -1, 8.5, 5.5), // el corazón del vergel
    gauss(wx, wz, 4, 3.5, 7.0, 4.0), // la franja baja del frente
  );
}
function alturaVergel(wx, wz) {
  let h = 0.55 + ruido(wx * 0.45, wz * 0.45) * 0.24;
  h += gauss(wx, wz, -15, -12, 6.5, 4.5) * 2.4; // loma occidental
  h += gauss(wx, wz, 14, -11, 7.0, 4.8) * 2.1; // loma oriental
  h += gauss(wx, wz, -1, -15, 10.0, 3.8) * 1.9; // el fondo que cierra
  const f = clamp(explanada(wx, wz) * 1.15, 0, 1);
  return h * (1 - f) + 0.55 * f;
}

/* Dónde cae hojarasca: bajo las copas grandes del estrato alto. Los centros
   coinciden con los árboles mayores de la escena. */
const MANCHAS_HOJARASCA = [
  [-8.5, -4.6, 2.9], // el mango
  [-2.2, -5.2, 2.7], // el aguacate Hass
  [4.6, -4.6, 2.6], // el aguacate criollo
  [10.4, -3.6, 2.2], // el mango joven
];
function pesoHojarasca(wx, wz) {
  let s = 0;
  for (const [cx, cz, r] of MANCHAS_HOJARASCA) s = Math.max(s, gauss(wx, wz, cx, cz, r, r * 0.85));
  return s;
}
/* Dónde vive la cobertura: la franja del frente y los claros entre calles. */
function pesoCobertura(wx, wz) {
  return Math.max(
    gauss(wx, wz, 1.5, 4.8, 8.5, 2.6),
    gauss(wx, wz, -6.5, 2.2, 4.5, 2.0),
    gauss(wx, wz, 7.5, 1.6, 4.0, 1.8),
  );
}

/* Malla del terreno con colores por vértice: pasto con claros de sol, la
   alfombra parda de hojarasca bajo los grandes y el verde vivo del maní
   forrajero donde tapa el suelo. */
function construirTerreno(seg, plano) {
  const nx = seg + 1, nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cPasto = new THREE.Color(P.pasto);
  const cClaro = new THREE.Color(P.pastoClaro);
  const cHoja = new THREE.Color(P.hojarasca);
  const cCob = new THREE.Color(P.cobertura);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaVergel(wx, wz);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      c.lerpColors(cPasto, cClaro, smoothstep(-0.3, 1.0, ruido(wx - 2, wz + 4)));
      c.lerp(cCob, clamp(pesoCobertura(wx, wz) * 0.85, 0, 0.7));
      c.lerp(cHoja, clamp(pesoHojarasca(wx, wz) * 1.05, 0, 0.9));
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

/* Las luces de la mañana del kit. */
function LucesManana() {
  return (
    <>
      <hemisphereLight intensity={DIA.hemisferio} color={DIA.cielo} groundColor={DIA.suelo} />
      <ambientLight intensity={DIA.ambiente} color={DIA.luz} />
      <directionalLight position={DIA.solPos} intensity={DIA.sol} color={DIA.luz} />
      <directionalLight position={[-6, 5, -7]} intensity={DIA.rellenoInt} color={DIA.relleno} />
    </>
  );
}

/* Nubes mansas de la mañana: esferas planas, quietas, muy lejos. */
function NubesManana() {
  const nubes = [
    [-12, 10, -14, 3.0],
    [3, 11, -15, 2.6],
    [13, 9.4, -13, 3.2],
  ];
  return (
    <group>
      {nubes.map((n, i) => (
        <mesh key={i} position={[n[0], n[1], n[2]]} scale={[n[3], n[3] * 0.32, n[3] * 0.7]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#fdfbf2" transparent opacity={0.82} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* Etiqueta didáctica sobre la escena (solo con el botón de etiquetas). */
function Etiqueta({ pos, texto, paso }) {
  return (
    <group position={pos}>
      <Html center distanceFactor={10} zIndexRange={[30, 0]}>
        <div className="vergel-chip" aria-hidden="true">
          {paso != null && <b>{paso}</b>}
          {texto}
        </div>
      </Html>
    </group>
  );
}

/* ══════════════ LOS FRUTALES, ESTRATO POR ESTRATO ══════════════ */

/* Frutos colgados en el borde de una copa: bolitas (o huevitos) deterministas
   repartidos en anillo, mirando un poco hacia abajo, para que se LEAN. */
function Frutos({ n, radio, y, color, esc = [1, 1.3, 1], semilla = 1, tam = 0.11 }) {
  const sitios = useMemo(() => {
    const rng = crearRng(500 + semilla);
    return Array.from({ length: n }, (_, i) => ({
      ang: (i / n) * Math.PI * 2 + rng() * 0.7,
      r: radio * (0.82 + rng() * 0.3),
      dy: (rng() - 0.5) * radio * 0.7,
      t: tam * (0.85 + rng() * 0.35),
    }));
  }, [n, radio, semilla, tam]);
  return (
    <group position={[0, y, 0]}>
      {sitios.map((f, i) => (
        <mesh
          key={i}
          position={[Math.cos(f.ang) * f.r, f.dy, Math.sin(f.ang) * f.r]}
          scale={esc}
        >
          <sphereGeometry args={[f.t, 6, 5]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Aguacate: tronco recio y copa alta de lomos verde oscuro; los frutos en
   pera cuelgan del borde. `hass` = fruto casi negro; si no, criollo verde. */
function Aguacate({ pos, esc = 1, hass = false, semilla = 1 }) {
  const lomos = useMemo(() => {
    const rng = crearRng(20 + semilla);
    return Array.from({ length: 5 }, (_, i) => ({
      x: (rng() - 0.5) * 1.5,
      y: 2.7 + (i % 3) * 0.55 + rng() * 0.3,
      z: (rng() - 0.5) * 1.3,
      r: 0.95 + rng() * 0.45,
    }));
  }, [semilla]);
  return (
    <group position={pos} scale={esc}>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.16, 0.24, 2.3, 6]} />
        <meshLambertMaterial color={P.tronco} flatShading />
      </mesh>
      <mesh position={[0.45, 1.9, 0.15]} rotation={[0, 0, -0.7]}>
        <cylinderGeometry args={[0.08, 0.12, 1.1, 5]} />
        <meshLambertMaterial color={P.tronco} flatShading />
      </mesh>
      {lomos.map((l, i) => (
        <mesh key={i} position={[l.x, l.y, l.z]} scale={[1, 0.85, 1]}>
          <sphereGeometry args={[l.r, 7, 6]} />
          <meshLambertMaterial
            color={mezclar(P.aguacateCopa, TINTE, (i % 3) * 0.06)}
            flatShading
          />
        </mesh>
      ))}
      {/* los frutos en pera, colgados y alargados hacia abajo */}
      <Frutos
        n={hass ? 7 : 6}
        radio={1.35}
        y={2.55}
        color={hass ? P.aguacateHass : P.aguacateCriollo}
        esc={[0.85, 1.35, 0.85]}
        semilla={semilla}
        tam={hass ? 0.13 : 0.16}
      />
    </group>
  );
}

/* Mango: tronco grueso y COPA ANCHA y densa; mangos ovalados verdes y
   maduros (amarillo con chapeta roja) mezclados: el escalonado a la vista. */
function Mango({ pos, esc = 1, semilla = 1 }) {
  const lomos = useMemo(() => {
    const rng = crearRng(50 + semilla);
    return Array.from({ length: 6 }, (_, i) => ({
      x: (rng() - 0.5) * 2.6,
      y: 2.6 + (i % 2) * 0.5 + rng() * 0.35,
      z: (rng() - 0.5) * 2.0,
      r: 1.0 + rng() * 0.5,
    }));
  }, [semilla]);
  const maduros = useMemo(() => {
    const rng = crearRng(60 + semilla);
    return Array.from({ length: 5 }, (_, i) => ({
      ang: (i / 5) * Math.PI * 2 + rng() * 0.6,
      r: 1.7 + rng() * 0.5,
      y: 2.2 + rng() * 0.7,
    }));
  }, [semilla]);
  return (
    <group position={pos} scale={esc}>
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 2.1, 6]} />
        <meshLambertMaterial color={mezclar(P.tronco, '#5a4028', 0.3)} flatShading />
      </mesh>
      {lomos.map((l, i) => (
        <mesh key={i} position={[l.x, l.y, l.z]} scale={[1.15, 0.72, 1.05]}>
          <sphereGeometry args={[l.r, 7, 6]} />
          <meshLambertMaterial
            color={mezclar(P.mangoCopa, TINTE, (i % 3) * 0.05)}
            flatShading
          />
        </mesh>
      ))}
      {/* mangos verdes aún arriba, entre la copa */}
      <Frutos n={6} radio={1.9} y={2.5} color={P.mangoVerde} esc={[0.9, 1.25, 0.9]} semilla={semilla + 3} tam={0.12} />
      {/* y los maduros colgando más abajo, con su chapeta roja */}
      {maduros.map((m, i) => (
        <group key={i} position={[Math.cos(m.ang) * m.r, m.y, Math.sin(m.ang) * m.r]}>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.32, 4]} />
            <meshLambertMaterial color={P.tronco} flatShading />
          </mesh>
          <mesh scale={[0.9, 1.25, 0.9]}>
            <sphereGeometry args={[0.13, 6, 5]} />
            <meshLambertMaterial color={P.mangoMaduro} flatShading />
          </mesh>
          <mesh position={[0.05, 0.05, 0.05]} scale={[0.65, 0.8, 0.65]}>
            <sphereGeometry args={[0.11, 6, 5]} />
            <meshLambertMaterial color={P.mangoChapeta} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Cítrico: copa redonda y lustrosa a media altura. `estado` cuenta el momento:
   'flor' (azahar blanco), 'verde' (fruta por madurar) o 'madura'. */
function Citrico({ pos, esc = 1, estado = 'madura', fruta = 'naranja', semilla = 1 }) {
  const copa = fruta === 'limon' ? P.limoneroCopa : P.citricoCopa;
  const colorFruta =
    estado === 'verde' ? P.frutaVerde
      : fruta === 'limon' ? P.limon
        : fruta === 'mandarina' ? P.mandarina
          : P.naranja;
  const escFruta = fruta === 'limon' ? [0.85, 1.15, 0.85] : [1, 1, 1];
  return (
    <group position={pos} scale={esc}>
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.09, 0.14, 1.3, 6]} />
        <meshLambertMaterial color={P.tronco} flatShading />
      </mesh>
      <mesh position={[0, 1.75, 0]} scale={[1, 0.95, 1]}>
        <sphereGeometry args={[1.0, 8, 6]} />
        <meshLambertMaterial color={copa} flatShading />
      </mesh>
      <mesh position={[0.4, 2.25, 0.3]} scale={[1, 0.8, 1]}>
        <sphereGeometry args={[0.55, 7, 5]} />
        <meshLambertMaterial color={mezclar(copa, TINTE, 0.08)} flatShading />
      </mesh>
      {estado === 'flor' ? (
        <Frutos n={11} radio={0.95} y={1.8} color={P.azahar} esc={[1, 1, 1]} semilla={semilla} tam={0.055} />
      ) : (
        <Frutos
          n={fruta === 'mandarina' ? 10 : 8}
          radio={0.95}
          y={1.72}
          color={colorFruta}
          esc={escFruta}
          semilla={semilla}
          tam={fruta === 'mandarina' ? 0.085 : 0.105}
        />
      )}
    </group>
  );
}

/* Guayabo: su seña es el tronco liso y "pintado" (parches claros donde suelta
   la corteza) y la copa abierta con guayabas redondas amarillo-verdosas. */
function Guayabo({ pos, esc = 1, semilla = 1 }) {
  const parches = useMemo(() => {
    const rng = crearRng(80 + semilla);
    return Array.from({ length: 4 }, () => ({
      y: 0.35 + rng() * 0.9,
      ang: rng() * Math.PI * 2,
      h: 0.18 + rng() * 0.2,
    }));
  }, [semilla]);
  return (
    <group position={pos} scale={esc}>
      <mesh position={[0, 0.8, 0]} rotation={[0, 0, 0.06]}>
        <cylinderGeometry args={[0.1, 0.15, 1.6, 7]} />
        <meshLambertMaterial color={P.troncoGuayabo} flatShading />
      </mesh>
      {/* los parches claros de la corteza que se descascara */}
      {parches.map((pa, i) => (
        <mesh
          key={i}
          position={[Math.cos(pa.ang) * 0.115, pa.y, Math.sin(pa.ang) * 0.115]}
          rotation={[0, -pa.ang + Math.PI / 2, 0]}
        >
          <boxGeometry args={[0.07, pa.h, 0.035]} />
          <meshLambertMaterial color={mezclar(P.troncoGuayabo, '#e0cfa8', 0.55)} flatShading />
        </mesh>
      ))}
      <mesh position={[-0.15, 1.95, 0]} scale={[1.2, 0.8, 1.1]}>
        <sphereGeometry args={[0.85, 7, 6]} />
        <meshLambertMaterial color={P.guayaboCopa} flatShading />
      </mesh>
      <mesh position={[0.55, 1.7, 0.25]} scale={[0.9, 0.7, 0.9]}>
        <sphereGeometry args={[0.5, 6, 5]} />
        <meshLambertMaterial color={mezclar(P.guayaboCopa, TINTE, 0.08)} flatShading />
      </mesh>
      <Frutos n={7} radio={0.85} y={1.85} color={P.guayabaFruta} esc={[1, 1.05, 1]} semilla={semilla} tam={0.095} />
    </group>
  );
}

/* Lulo: mata baja de hojas GRANDOTAS (anchas, con su morado en los nervios)
   y las bolitas naranjas pegadas al tallo. El de la hoja que no se olvida. */
function Lulo({ pos, esc = 1, semilla = 1 }) {
  const hojas = useMemo(() => {
    const rng = crearRng(140 + semilla);
    return Array.from({ length: 7 }, (_, i) => ({
      ang: (i / 7) * Math.PI * 2 + rng() * 0.5,
      inc: 0.5 + rng() * 0.4,
      largo: 0.5 + rng() * 0.2,
      alto: 0.28 + rng() * 0.3,
    }));
  }, [semilla]);
  const frutas = useMemo(() => {
    const rng = crearRng(150 + semilla);
    return Array.from({ length: 5 }, () => ({
      ang: rng() * Math.PI * 2,
      y: 0.16 + rng() * 0.3,
    }));
  }, [semilla]);
  return (
    <group position={pos} scale={esc}>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.64, 5]} />
        <meshLambertMaterial color={mezclar(P.luloHoja, P.luloNervio, 0.3)} flatShading />
      </mesh>
      {/* las hojas anchas: planos gruesos ovalados con el haz verde hondo */}
      {hojas.map((h, i) => (
        <group key={i} rotation={[0, h.ang, 0]} position={[0, h.alto + 0.2, 0]}>
          <mesh position={[h.largo * 0.55, h.inc * 0.16, 0]} rotation={[0, 0, -h.inc * 0.5]} scale={[1, 0.1, 0.62]}>
            <sphereGeometry args={[h.largo, 7, 5]} />
            <meshLambertMaterial
              color={mezclar(P.luloHoja, P.luloNervio, 0.12 + (i % 3) * 0.07)}
              flatShading
            />
          </mesh>
        </group>
      ))}
      {/* las bolitas naranjas, pegaditas al tallo como es el lulo */}
      {frutas.map((f, i) => (
        <mesh key={i} position={[Math.cos(f.ang) * 0.09, f.y, Math.sin(f.ang) * 0.09]}>
          <sphereGeometry args={[0.075, 6, 5]} />
          <meshLambertMaterial color={P.luloFruta} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Tomate de árbol: arbolito fino de copa rala con los racimos de huevitos
   rojos COLGANDO de sus tallos largos — su silueta inconfundible. */
function TomateArbol({ pos, esc = 1, semilla = 1 }) {
  const racimos = useMemo(() => {
    const rng = crearRng(170 + semilla);
    return Array.from({ length: 3 }, (_, i) => ({
      ang: (i / 3) * Math.PI * 2 + rng() * 0.6,
      r: 0.34 + rng() * 0.16,
      caida: 0.3 + rng() * 0.16,
      n: 2 + Math.round(rng()),
      verde: rng() > 0.66,
    }));
  }, [semilla]);
  return (
    <group position={pos} scale={esc}>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.045, 0.07, 1.6, 5]} />
        <meshLambertMaterial color={mezclar(P.tronco, TINTE, 0.1)} flatShading />
      </mesh>
      <mesh position={[0, 1.75, 0]} scale={[1.1, 0.7, 1.1]}>
        <sphereGeometry args={[0.62, 7, 5]} />
        <meshLambertMaterial color={P.tomateArbolHoja} flatShading />
      </mesh>
      <mesh position={[0.3, 1.98, -0.2]} scale={[0.9, 0.6, 0.9]}>
        <sphereGeometry args={[0.4, 6, 5]} />
        <meshLambertMaterial color={mezclar(P.tomateArbolHoja, TINTE, 0.1)} flatShading />
      </mesh>
      {/* los racimos colgados: palito que baja + huevitos rojos (o verdes) */}
      {racimos.map((r, i) => (
        <group key={i} position={[Math.cos(r.ang) * r.r, 1.5, Math.sin(r.ang) * r.r]}>
          <mesh position={[0, -r.caida / 2, 0]}>
            <cylinderGeometry args={[0.01, 0.01, r.caida, 4]} />
            <meshLambertMaterial color={P.tomateArbolHoja} flatShading />
          </mesh>
          {Array.from({ length: r.n }, (_, j) => (
            <mesh
              key={j}
              position={[(j - (r.n - 1) / 2) * 0.09, -r.caida, j * 0.03]}
              scale={[0.8, 1.25, 0.8]}
            >
              <sphereGeometry args={[0.07, 6, 5]} />
              <meshLambertMaterial color={r.verde ? P.frutaVerde : P.tomateArbolFruta} flatShading />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* Papayo: un solo tallo verdoso, la corona de hojas palmeadas arriba y el
   racimo de papayas abrazado al tallo justo debajo — como es en la finca.
   La brisa mece apenas su corona (ref al group de hojas). */
function Papayo({ pos, esc = 1, semilla = 1, refCorona }) {
  const hojas = useMemo(() => {
    const rng = crearRng(190 + semilla);
    return Array.from({ length: 8 }, (_, i) => ({
      ang: (i / 8) * Math.PI * 2 + rng() * 0.3,
      inc: 0.35 + rng() * 0.55,
      largo: 0.75 + rng() * 0.3,
    }));
  }, [semilla]);
  const papayas = useMemo(() => {
    const rng = crearRng(200 + semilla);
    return Array.from({ length: 5 }, (_, i) => ({
      ang: (i / 5) * Math.PI * 2 + rng() * 0.5,
      y: -0.55 - rng() * 0.4,
      madura: i < 2,
    }));
  }, [semilla]);
  const alto = 2.6;
  return (
    <group position={pos} scale={esc}>
      {/* el tallo solo, con sus anillos (segmentos apilados) */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.34 + i * 0.66, 0]}>
          <cylinderGeometry args={[0.085 - i * 0.008, 0.1 - i * 0.008, 0.68, 7]} />
          <meshLambertMaterial
            color={mezclar(P.troncoPapayo, TINTE, (i % 2) * 0.08)}
            flatShading
          />
        </mesh>
      ))}
      {/* la corona de palmas: pecíolo largo + palma abierta (se mece) */}
      <group ref={refCorona} position={[0, alto, 0]}>
        {hojas.map((h, i) => (
          <group key={i} rotation={[0, h.ang, 0]}>
            <mesh position={[h.largo * 0.4, 0.14, 0]} rotation={[0, 0, -0.45 - h.inc * 0.3]}>
              <cylinderGeometry args={[0.018, 0.024, h.largo * 0.85, 4]} />
              <meshLambertMaterial color={P.troncoPapayo} flatShading />
            </mesh>
            <mesh
              position={[h.largo * 0.82, 0.2 - h.inc * 0.12, 0]}
              rotation={[0, 0, -h.inc * 0.6]}
              scale={[1, 0.12, 0.75]}
            >
              <sphereGeometry args={[0.42, 7, 5]} />
              <meshLambertMaterial
                color={mezclar(P.papayoHoja, TINTE, (i % 3) * 0.06)}
                flatShading
              />
            </mesh>
          </group>
        ))}
      </group>
      {/* el racimo de papayas abrazado al tallo bajo la corona */}
      {papayas.map((f, i) => (
        <mesh
          key={i}
          position={[Math.cos(f.ang) * 0.17, alto + f.y, Math.sin(f.ang) * 0.17]}
          scale={[0.85, 1.45, 0.85]}
        >
          <sphereGeometry args={[0.12, 6, 5]} />
          <meshLambertMaterial color={f.madura ? P.papayaMadura : P.papayaVerde} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* La COBERTURA VIVA instanciada: el maní forrajero — montecitos verdes a ras
   de suelo (1 draw call) con sus florecitas amarillas (otro draw call). */
function CoberturaViva({ n }) {
  const matas = useRef(null);
  const flores = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(431);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 12) {
      intentos += 1;
      const wx = -14 + rng() * 28;
      const wz = -2 + rng() * 9;
      if (pesoCobertura(wx, wz) < 0.3) continue;
      if (pesoHojarasca(wx, wz) > 0.4) continue; // la hojarasca es de los grandes
      lista.push({
        wx, wz,
        y: alturaVergel(wx, wz),
        esc: 0.6 + rng() * 0.7,
        conFlor: rng() > 0.45,
        giro: rng() * Math.PI * 2,
      });
    }
    return lista;
  }, [n]);
  const nFlores = useMemo(() => sitios.filter((s) => s.conFlor).length, [sitios]);

  useEffect(() => {
    const mm = matas.current, mf = flores.current;
    if (!mm || !mf) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const base = new THREE.Color(P.cobertura);
    let fi = 0;
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y + 0.05 * s.esc, s.wz);
      dummy.rotation.set(0, s.giro, 0);
      dummy.scale.set(s.esc, s.esc * 0.5, s.esc);
      dummy.updateMatrix();
      mm.setMatrixAt(i, dummy.matrix);
      tinte.copy(base).offsetHSL(0, 0, (i % 5) * 0.014 - 0.028);
      mm.setColorAt(i, tinte);
      if (s.conFlor) {
        dummy.position.set(s.wx, s.y + 0.14 * s.esc, s.wz);
        dummy.scale.setScalar(s.esc);
        dummy.updateMatrix();
        mf.setMatrixAt(fi, dummy.matrix);
        fi += 1;
      }
    });
    mm.instanceMatrix.needsUpdate = true;
    mf.instanceMatrix.needsUpdate = true;
    if (mm.instanceColor) mm.instanceColor.needsUpdate = true;
  }, [sitios]);

  return (
    <group>
      <instancedMesh ref={matas} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
        <sphereGeometry args={[0.22, 6, 4]} />
        <meshLambertMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={flores} args={[undefined, undefined, Math.max(nFlores, 1)]} frustumCulled={false}>
        <sphereGeometry args={[0.035, 5, 4]} />
        <meshLambertMaterial color={P.coberturaFlor} flatShading />
      </instancedMesh>
    </group>
  );
}

/* La HOJARASCA instanciada: hojitas secas regadas bajo los árboles grandes
   (1 draw call). Es la que "tapa, guarda humedad y se vuelve abono". */
function Hojarasca({ n }) {
  const hojas = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(457);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 14) {
      intentos += 1;
      const m = MANCHAS_HOJARASCA[Math.floor(rng() * MANCHAS_HOJARASCA.length)];
      const wx = m[0] + (rng() - 0.5) * m[2] * 2.2;
      const wz = m[1] + (rng() - 0.5) * m[2] * 1.9;
      if (pesoHojarasca(wx, wz) < 0.3) continue;
      lista.push({
        wx, wz,
        y: alturaVergel(wx, wz),
        esc: 0.5 + rng() * 0.8,
        giro: rng() * Math.PI * 2,
        clara: rng() > 0.5,
      });
    }
    return lista;
  }, [n]);

  useEffect(() => {
    const mh = hojas.current;
    if (!mh) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const base = new THREE.Color(mezclar(P.hojarasca, '#a8843e', 0.35));
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y + 0.03, s.wz);
      dummy.rotation.set(-Math.PI / 2 + 0.12, 0, s.giro);
      dummy.scale.set(s.esc, s.esc * 0.7, 1);
      dummy.updateMatrix();
      mh.setMatrixAt(i, dummy.matrix);
      tinte.copy(base).offsetHSL(0, 0, s.clara ? 0.05 : -0.03);
      mh.setColorAt(i, tinte);
    });
    mh.instanceMatrix.needsUpdate = true;
    if (mh.instanceColor) mh.instanceColor.needsUpdate = true;
  }, [sitios]);

  return (
    <instancedMesh ref={hojas} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
      <circleGeometry args={[0.11, 5]} />
      <meshLambertMaterial flatShading side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

/* La brisa de la mañana: mece apenas las coronas de los papayos. */
function Brisa({ coronas, reducedMotion }) {
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    coronas.forEach((ref, i) => {
      const c = ref.current;
      if (!c) return;
      c.rotation.z = Math.sin(t * 0.7 + i * 1.9) * 0.05;
      c.rotation.x = Math.cos(t * 0.55 + i * 1.3) * 0.04;
    });
  });
  return null;
}

/* ══════════════════════ LA ESCENA COMPLETA ══════════════════════ */

/* Alturas del suelo en los pies de cada frutal (una sola verdad). */
const yEn = (x, z) => alturaVergel(x, z);

function EscenaVergel({ tier, reducedMotion, etiquetas }) {
  const perfil = perfilDeTier(tier);
  const geo = useMemo(
    () => construirTerreno(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  const coronaA = useRef(null);
  const coronaB = useRef(null);
  const coronas = useMemo(() => [coronaA, coronaB], []);

  const nCobertura = tier === 'alto' ? 150 : 90;
  const nHojarasca = tier === 'alto' ? 110 : 60;

  /* `color`/`fog` se adjuntan a la ESCENA: hijos directos, nunca en <group>. */
  return (
    <>
      <color attach="background" args={[DIA.fondo]} />
      {perfil.fog && <fog attach="fog" args={[DIA.niebla, DIA.nieblaCerca + 4, DIA.nieblaLejos]} />}
      <LucesManana />
      <NubesManana />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* ── 1 · ESTRATO ALTO: los que dan la sombra ── */}
      <Mango pos={[-8.5, yEn(-8.5, -4.6), -4.6]} esc={1.5} semilla={2} />
      <Aguacate pos={[-2.2, yEn(-2.2, -5.2), -5.2]} esc={1.45} hass semilla={4} />
      <Aguacate pos={[4.6, yEn(4.6, -4.6), -4.6]} esc={1.3} semilla={7} />
      <Mango pos={[10.4, yEn(10.4, -3.6), -3.6]} esc={1.05} semilla={9} />

      {/* ── 2 · ESTRATO MEDIO: cítricos y guayabo bajo la sombra rala ── */}
      <Citrico pos={[-11.2, yEn(-11.2, -0.4), -0.4]} fruta="limon" semilla={3} />
      <Citrico pos={[-6.4, yEn(-6.4, 0.8), 0.8]} estado="flor" semilla={5} />
      <Citrico pos={[-1.6, yEn(-1.6, 0.2), 0.2]} esc={1.05} semilla={8} />
      <Citrico pos={[3.2, yEn(3.2, 1.0), 1.0]} fruta="mandarina" esc={0.85} semilla={11} />
      <Guayabo pos={[8.6, yEn(8.6, 0.2), 0.2]} semilla={6} />

      {/* ── 3 · ESTRATO BAJO: lulo, tomate de árbol y papayo al abrigo ── */}
      <Lulo pos={[-8.6, yEn(-8.6, 4.4), 4.4]} semilla={2} />
      <Lulo pos={[-7.4, yEn(-7.4, 5.2), 5.2]} esc={0.8} semilla={6} />
      <TomateArbol pos={[-3.4, yEn(-3.4, 4.6), 4.6]} semilla={3} />
      <TomateArbol pos={[-2.2, yEn(-2.2, 5.4), 5.4]} esc={0.85} semilla={8} />
      <Papayo pos={[1.4, yEn(1.4, 4.2), 4.2]} semilla={4} refCorona={coronaA} />
      <Papayo pos={[2.6, yEn(2.6, 5.3), 5.3]} esc={0.8} semilla={9} refCorona={coronaB} />
      <Lulo pos={[6.0, yEn(6.0, 4.6), 4.6]} esc={0.9} semilla={10} />
      <TomateArbol pos={[9.2, yEn(9.2, 4.3), 4.3]} esc={0.9} semilla={12} />

      {/* ── 4 · COBERTURA VIVA + hojarasca: el suelo nunca queda pelado ── */}
      <CoberturaViva n={nCobertura} />
      <Hojarasca n={nHojarasca} />
      <Brisa coronas={coronas} reducedMotion={reducedMotion} />

      {/* unas piedras que amueblan los bordes */}
      {[
        [-13.5, 3.4, 0.34], [12.8, 2.8, 0.4], [0.2, 7.4, 0.3],
      ].map((r, i) => (
        <mesh
          key={i}
          position={[r[0], alturaVergel(r[0], r[1]) + r[2] * 0.3, r[1]]}
          rotation={[0.2, i * 1.7, 0.1]}
        >
          <dodecahedronGeometry args={[r[2]]} />
          <meshLambertMaterial color={P.piedra} flatShading />
        </mesh>
      ))}

      {/* las etiquetas didácticas: los 4 estratos numerados + cada frutal */}
      {etiquetas && (
        <>
          <Etiqueta pos={[-2.2, yEn(-2.2, -5.2) + 6.6, -5.2]} paso="1" texto="Estrato alto — la sombra" />
          <Etiqueta pos={[-1.6, yEn(-1.6, 0.2) + 3.1, 0.2]} paso="2" texto="Estrato medio — la fruta de en medio" />
          <Etiqueta pos={[-3.4, yEn(-3.4, 4.6) + 2.5, 4.6]} paso="3" texto="Estrato bajo — al abrigo" />
          <Etiqueta pos={[4.6, yEn(4.6, 6.4) + 0.75, 6.4]} paso="4" texto="Cobertura viva — el suelo tapado" />
          <Etiqueta pos={[-8.5, yEn(-8.5, -4.6) + 5.9, -4.6]} texto="Mango" />
          <Etiqueta pos={[-2.2, yEn(-2.2, -5.2) + 5.6, -5.2]} texto="Aguacate Hass" />
          <Etiqueta pos={[4.6, yEn(4.6, -4.6) + 5.2, -4.6]} texto="Aguacate criollo" />
          <Etiqueta pos={[-11.2, yEn(-11.2, -0.4) + 3.0, -0.4]} texto="Limonero" />
          <Etiqueta pos={[-6.4, yEn(-6.4, 0.8) + 3.0, 0.8]} texto="Naranjo en flor" />
          <Etiqueta pos={[-1.6, yEn(-1.6, 0.2) + 2.4, 0.2]} texto="Naranjo cargado" />
          <Etiqueta pos={[3.2, yEn(3.2, 1.0) + 2.6, 1.0]} texto="Mandarino" />
          <Etiqueta pos={[8.6, yEn(8.6, 0.2) + 3.0, 0.2]} texto="Guayabo" />
          <Etiqueta pos={[-8.6, yEn(-8.6, 4.4) + 1.5, 4.4]} texto="Lulo" />
          <Etiqueta pos={[-3.4, yEn(-3.4, 4.6) + 1.9, 4.6]} texto="Tomate de árbol" />
          <Etiqueta pos={[1.4, yEn(1.4, 4.2) + 3.4, 4.2]} texto="Papayo" />
        </>
      )}

      {/* la fauna rubber-hose de la casa: los aliados del vergel */}
      <Bicho
        tipo="colibri"
        base={[-6.4, yEn(-6.4, 0.8) + 2.3, 1.6]}
        size={30}
        rol="polinizador"
        fase={0.6}
        reducedMotion={reducedMotion}
        title="Colibrí en el azahar del naranjo"
      />
      <Bicho
        tipo="mariposa"
        base={[-8.2, yEn(-8.2, 4.6) + 1.2, 4.8]}
        size={26}
        rol="polinizador"
        fase={2.1}
        reducedMotion={reducedMotion}
        title="Mariposa en el lulo"
      />
      <Bicho
        tipo="escarabajo"
        base={[-2.6, yEn(-2.6, -3.9) + 0.12, -3.9]}
        size={22}
        rol="descomponedor"
        fase={1.2}
        reducedMotion={reducedMotion}
        title="Escarabajo en la hojarasca"
      />
      <Bicho
        tipo="lombriz"
        base={[-8.9, yEn(-8.9, -3.8) + 0.1, -3.8]}
        size={20}
        rol="descomponedor"
        fase={0.4}
        reducedMotion={reducedMotion}
        title="Lombriz bajo la hojarasca del mango"
      />

      {/* polen de la mañana entre el estrato medio y mariposas al frente */}
      <ParticulasAmbientales
        tipo="polen"
        tier={tier}
        reducedMotion={reducedMotion}
        position={[-4, 2.2, 0.6]}
        semilla={29}
      />
      <ParticulasAmbientales
        tipo="mariposas"
        densidad={0.5}
        tier={tier}
        reducedMotion={reducedMotion}
        position={[3, 1.6, 4]}
        semilla={53}
      />
    </>
  );
}

/* ══════════════════════ EL CHROME (DOM) ══════════════════════ */

const CSS_VERGEL = `
.vergel-root { margin: 0 auto; max-width: 72rem; padding: 0 0 2.5rem; background: #f3f0dd; color: #33421f; font-family: system-ui, sans-serif; }
.vergel-head { padding: 1.1rem 1rem 0.4rem; }
.vergel-kicker { margin: 0; font: 600 0.72rem/1.2 system-ui, sans-serif; letter-spacing: 0.09em; text-transform: uppercase; color: #6a7a35; }
.vergel-head h1 { margin: 0.2rem 0 0.4rem; font-size: clamp(1.35rem, 4vw, 1.9rem); line-height: 1.15; color: #3a4a1c; }
.vergel-lema { margin: 0; max-width: 46rem; font-size: 0.92rem; line-height: 1.55; color: #4a5a30; }
.vergel-escena { position: relative; margin: 0.9rem 0 0; height: min(78dvh, 40rem); min-height: 22rem; overflow: hidden; background: ${DIA.fondo}; border-radius: 0; }
.vergel-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.vergel-canvas--lista { opacity: 1; }
.vergel-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: flex-end; }
.vergel-pie { padding: 0 1rem 0.9rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem; }
.vergel-carta { margin: 0; max-width: 34rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(46,58,24,0.68); backdrop-filter: blur(3px); color: #f3f6e2; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.vergel-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(58,74,28,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(250,252,232,0.85); color: #3f5a1c; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.vergel-boton:hover, .vergel-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(58,74,28,0.6); outline: none; }
.vergel-boton[aria-pressed='true'] { background: #e2edb0; border-color: rgba(63,90,28,0.75); color: #3a4a18; }
.vergel-chip { pointer-events: none; display: inline-flex; align-items: center; gap: 0.3em; padding: 2px 8px; border-radius: 999px; background: rgba(40,54,22,0.84); color: #f2f6e0; font: 600 10px/1.5 system-ui, sans-serif; white-space: nowrap; box-shadow: 0 2px 6px rgba(24,34,10,0.3); }
.vergel-chip b { display: inline-flex; align-items: center; justify-content: center; width: 1.35em; height: 1.35em; border-radius: 50%; background: #a8c84a; color: #2a3610; font-size: 9px; }
.mundo-fauna { pointer-events: none; filter: drop-shadow(0 2px 5px rgba(30, 40, 10, 0.24)); }
.vergel-leyenda { padding: 1.4rem 1rem 0; }
.vergel-leyenda h2 { margin: 0 0 0.3rem; font-size: 1.12rem; color: #3a4a1c; }
.vergel-leyenda ol, .vergel-leyenda ul { margin: 0.6rem 0 0; padding: 0; list-style: none; display: grid; gap: 0.7rem; }
.vergel-leyenda li { display: flex; gap: 0.65rem; align-items: flex-start; background: #fafcec; border: 1px solid #dfe4c2; border-radius: 0.7rem; padding: 0.65rem 0.8rem; }
.vergel-emoji { font-size: 1.25rem; line-height: 1.3; }
.vergel-leyenda b { display: block; font-size: 0.88rem; color: #3a4a1c; }
.vergel-leyenda p { margin: 0.15rem 0 0; font-size: 0.83rem; line-height: 1.5; color: #4a5a30; }
.vergel-nota { margin: 0.8rem 0 0; font-size: 0.76rem; line-height: 1.5; color: #6a7845; font-style: italic; }
.vergel-cierre { margin: 0.9rem 0 0; max-width: 46rem; font-size: 0.86rem; line-height: 1.55; color: #4a5a30; }
@media (min-width: 40rem) { .vergel-leyenda ol, .vergel-leyenda ul { grid-template-columns: 1fr 1fr; } }
@media (prefers-reduced-motion: reduce) { .vergel-canvas { transition: none; } }
`;

/* Los cuatro estratos, con la función de cada uno: la lección central. */
const ESTRATOS = [
  {
    emoji: '🌳',
    titulo: '1 · Estrato alto — la sombra',
    texto: 'Los aguacates y el mango son el techo del vergel: su sombra rala baja la calor, corta el viento y protege del sol bravo a los que viven debajo. Fíjese que no tapan todo — la agroforestería es sombra a medias, no oscurana.',
  },
  {
    emoji: '🍊',
    titulo: '2 · Estrato medio — la fruta de en medio',
    texto: 'Naranjo, mandarino, limonero y guayabo viven a media altura, donde todavía entra buena luz. En el vergel hay un naranjo en flor y otro cargado: sembrar así, escalonado, es tener fruta que va saliendo todo el año, no un solo golpe de cosecha.',
  },
  {
    emoji: '🍅',
    titulo: '3 · Estrato bajo — al abrigo',
    texto: 'El lulo y el tomate de árbol son de tierra fría templada y agradecen el abrigo: a pleno sol se queman y se estresan. Bajo la sombra de los grandes dan más y mejor. El papayo sube su racimo pegado al tallo, aprovechando su claro de luz.',
  },
  {
    emoji: '🌱',
    titulo: '4 · Cobertura viva — el suelo tapado',
    texto: 'El maní forrajero de florecita amarilla tapa el suelo: guarda la humedad, no deja nacer maleza y amarra nitrógeno con sus raíces. Y la hojarasca que sueltan los árboles no es basura: es el abono que el vergel se echa solo. Suelo pelado, finca pobre.',
  },
];

/* Las frutas del vergel, mata por mata. */
const FRUTALES = [
  {
    emoji: '🥑',
    titulo: 'Aguacate (Hass y criollo)',
    texto: 'El Hass, morado casi negro, es el de exportación; el criollo verde y grandote es el del sancocho y la casa. Tener los dos es plata afuera y comida adentro. Árbol grande: pide su espacio y buen drenaje.',
  },
  {
    emoji: '🥭',
    titulo: 'Mango',
    texto: 'Copa ancha y generosa: da sombra, da fruta y da hojarasca. En el árbol se ven verdes y maduros a la vez — el mango escalona su cosecha y eso en el mercado vale.',
  },
  {
    emoji: '🍊',
    titulo: 'Naranja y mandarina',
    texto: 'Los cítricos de media altura: primero el azahar blanco que enloquece a las abejas y al colibrí, luego la fruta verde, y al final la bola naranja. Tres momentos que aquí se ven en árboles distintos.',
  },
  {
    emoji: '🍋',
    titulo: 'Limón',
    texto: 'El limonero de copa más clara nunca descansa: da limón casi todo el año. Es el cítrico más agradecido para empezar y el primero que se vende en la vereda.',
  },
  {
    emoji: '🍈',
    titulo: 'Guayaba',
    texto: 'Reconozca el guayabo por su tronco liso y pintado, que suelta la corteza en parches. Fruta de dulce y de bocadillo, y de las más queridas por los pájaros — el guayabo siembra monte él solo.',
  },
  {
    emoji: '🟠',
    titulo: 'Lulo',
    texto: 'La mata de hoja grandota con nervios morados. Es de media sombra: bajo los árboles da la fruta ácida y perfumada del jugo que no falta en la casa campesina.',
  },
  {
    emoji: '🍅',
    titulo: 'Tomate de árbol',
    texto: 'Arbolito fino con los racimos de huevitos rojos colgando. Rápido para dar y agradecido con la sombra ligera: al año ya está cargando, mientras los árboles grandes cogen cuerpo.',
  },
  {
    emoji: '🧡',
    titulo: 'Papaya',
    texto: 'Un solo tallo verdoso, la corona de palmas arriba y el racimo abrazado al tronco. Crece rapidísimo: es de las primeras que dan mientras el vergel joven se levanta.',
  },
];

const COPY_CALMA =
  'Recorra el vergel: los árboles grandes atrás, los cítricos en medio, las matas bajas al frente y el suelo siempre tapado. Toque el botón para ver los estratos y el nombre de cada frutal.';
const COPY_ETIQUETAS =
  'Siga los números: 1 la sombra de aguacates y mango, 2 la fruta de media altura, 3 el lulo, el tomate de árbol y el papayo al abrigo, 4 la cobertura viva que tapa el suelo. Eso es apilar estratos: más comida en la misma tierra.';

/**
 * MundoVergelFrutal3D — el vergel agroforestal de frutales andinos, montable
 * con su propio `<Canvas>`. Sin lógica de negocio: es una vitrina
 * (#/mockups/mundo-vergel-frutal-3d). El tier y reduced-motion se detectan
 * aquí (mockup standalone), igual que sus pares.
 */
export default function MundoVergelFrutal3D() {
  const [listo, setListo] = useState(false);
  const [etiquetas, setEtiquetas] = useState(false);
  const tier = useMemo(() => decidirTier().tier, []);
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const perfil = perfilDeTier(tier);

  return (
    <main className="vergel-root">
      <style>{CSS_VERGEL}</style>

      <header className="vergel-head">
        <p className="vergel-kicker">Los mundos de su finca · vitrina</p>
        <h1>El vergel agroforestal</h1>
        <p className="vergel-lema">
          Un bosque que se come: la agroforestería apila estratos como hace el
          monte. Arriba los aguacates y el mango dando sombra; en medio los
          cítricos y el guayabo; abajo el lulo, el tomate de árbol y el papayo
          al abrigo; y el suelo siempre tapado con maní forrajero y hojarasca.
          Más comida en la misma tierra, cosecha repartida en el año.
        </p>
      </header>

      <section
        className="vergel-escena"
        data-tier={tier}
        aria-label="El vergel agroforestal de frutales andinos en 3D"
      >
        <Canvas
          className={`vergel-canvas${listo ? ' vergel-canvas--lista' : ''}`}
          dpr={perfil.dpr}
          gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
          camera={{ position: [2, 6.8, 16.5], fov: 45 }}
          frameloop={reducedMotion ? 'demand' : 'always'}
          onCreated={() => setListo(true)}
        >
          <EscenaVergel tier={tier} reducedMotion={reducedMotion} etiquetas={etiquetas} />
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom
            minDistance={8}
            maxDistance={24}
            target={[0, 1.6, 0]}
            minPolarAngle={0.5}
            maxPolarAngle={1.42}
            minAzimuthAngle={-1.05}
            maxAzimuthAngle={1.05}
            enableDamping
            dampingFactor={0.08}
            autoRotate={!reducedMotion}
            autoRotateSpeed={0.08}
          />
          <AdaptiveDpr pixelated />
        </Canvas>

        <div className="vergel-chrome">
          <div className="vergel-pie">
            <button
              type="button"
              className="vergel-boton"
              aria-pressed={etiquetas}
              onClick={() => setEtiquetas((v) => !v)}
            >
              {etiquetas ? 'Quitar las etiquetas' : 'Ver estratos y frutales'}
            </button>
            <p className="vergel-carta" role="status">
              {etiquetas ? COPY_ETIQUETAS : COPY_CALMA}
            </p>
          </div>
        </div>
      </section>

      <section className="vergel-leyenda" aria-label="Los cuatro estratos del vergel">
        <h2>Los cuatro estratos, del techo al suelo</h2>
        <ol>
          {ESTRATOS.map((e) => (
            <li key={e.titulo}>
              <span className="vergel-emoji" aria-hidden="true">{e.emoji}</span>
              <div>
                <b>{e.titulo}</b>
                <p>{e.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="vergel-nota">
          El monocultivo siembra una sola cosa y reza. El vergel apila pisos:
          si un cultivo falla o baja de precio, los otros sostienen la casa.
        </p>
      </section>

      <section className="vergel-leyenda" aria-label="Las frutas del vergel, mata por mata">
        <h2>El vergel, mata por mata</h2>
        <ul>
          {FRUTALES.map((f) => (
            <li key={f.titulo}>
              <span className="vergel-emoji" aria-hidden="true">{f.emoji}</span>
              <div>
                <b>{f.titulo}</b>
                <p>{f.texto}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="vergel-cierre">
          Un vergel así no se siembra de una: primero el papayo y el tomate de
          árbol que dan rápido, mientras aguacates y mangos cogen cuerpo; los
          cítricos van llegando en medio, y la cobertura tapa el suelo desde el
          primer día. A los pocos años, la finca tiene un bosque que da de
          comer — y sombra, y abono, y pájaros — sin comprarle el suelo a nadie.
        </p>
      </section>
    </main>
  );
}
