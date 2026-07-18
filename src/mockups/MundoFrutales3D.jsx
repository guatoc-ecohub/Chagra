/*
 * MundoFrutales3D — el HUERTO DE FRUTALES del solar campesino en un rincón 3D
 * de la finca (ruta #/mockups/mundo-frutales-3d · prod #diorama_frutales).
 *
 * El solar de frutales de clima cálido/templado, contado como es de verdad —
 * árboles de distinta ESPECIE, EDAD y ALTURA conviviendo en el mismo huerto,
 * nunca la fila monótona del monocultivo:
 *
 *   - el AGUACATE — el mayor del solar, copa alta y oscura, el fruto
 *     verde-oscuro colgando de su pedúnculo (se cosecha "hecho", no maduro);
 *   - el MANGO — copa ancha y densa de tierra caliente, el fruto dorado en un
 *     pedúnculo LARGO (su seña en el árbol) y la PODA con su corte limpio;
 *   - los CÍTRICOS — naranjo, limonero y mandarino, redondos y cargados de
 *     fruto de color que se ve de lejos;
 *   - la GUAYABA y el PAPAYO — los frutales de patio que nunca faltan: la
 *     guayaba perfumada y el papayo de tronco solo con su racimo pegado;
 *   - las EDADES — del injerto recién sembrado con su tutor al aguacate mayor:
 *     el huerto se RENUEVA, no se envejece entero de golpe;
 *   - el PLATEO — el anillo de hojarasca al pie de cada árbol que guarda la
 *     humedad y abona (el pasto no se come al frutal);
 *   - la COSECHA — la escalera y los canastos: la fruta se baja con la mano,
 *     no se apalea (fruta golpeada = fruta perdida).
 *
 * DIRECCIÓN DE ARTE (todo dentro del framework, nada inventado por fuera):
 *   - Atmósfera de la TARDE del kit (`CIELOS_HORA.tarde`): la luz ámbar
 *     inclinada de la huerta al sol, la hora de bajar fruta.
 *   - Materiales de `PALETA`/`mezclar` (atmosferaMadre): Lambert flatShading,
 *     cero texturas, cero CDN. La ley de coherencia del valle.
 *   - La fauna es la MISMA librería rubber-hose (`Bicho` de FaunaEscena):
 *     mariposa y colibrí que cuajan la fruta, escarabajo en el plateo.
 *   - Polen del kit (`ParticulasAmbientales`) sobre las copas floridas.
 *
 * RENDIMIENTO: primitivas de pocos segmentos, Lambert sin shadow-map,
 * presupuestos por `perfilDeTier`; `reducedMotion` pasa el frameloop a
 * demanda y apaga el auto-giro. Standalone: NO monta el sistema MUNDO ni toca
 * EscenaBase3D — patrón MundoBoticaCana3D.
 *
 * Español de Colombia, en "usted". Autocontenida y offline.
 */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Html } from '@react-three/drei';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';
import { Bicho } from '../visual/mundo3d/escenas/FaunaEscena.jsx';

/* La tarde ámbar del kit: única fuente de la atmósfera de esta escena. */
const DIA = CIELOS_HORA.tarde;

/* La paleta del framework entintada apenas hacia la luz de la tarde. */
const TINTE = DIA.niebla;
const P = {
  pasto: mezclar('#7ca24f', TINTE, 0.24), // la falda verde del solar
  pastoSeco: mezclar('#ab9f58', TINTE, 0.26), // motas pajizas de la tarde
  plateo: mezclar('#4c3a26', TINTE, 0.16), // la hojarasca abonada al pie
  tierraHuerto: mezclar('#8a6a44', TINTE, 0.22), // el piso pisado del huerto
  madera: mezclar(PALETA.madera, TINTE, 0.18),
  maderaClara: mezclar(PALETA.maderaClara, TINTE, 0.2),
  maderaOscura: mezclar(PALETA.maderaOscura, TINTE, 0.16),
  piedra: mezclar(PALETA.piedra, TINTE, 0.3),
  cal: mezclar(PALETA.cal, TINTE, 0.12),
  brote: mezclar(PALETA.follajeClaro, TINTE, 0.18),
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
/* Ruido determinista (hash de senos): mismo huerto siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/* ══════════════════════ EL CARÁCTER DE CADA ESPECIE ══════════════════════
   Copa, fruto (color/forma/tamaño) y cómo cuelga. La forma es un sphere
   escalado (pera del aguacate, riñón del mango, esfera del cítrico); `pend`
   es el largo del pedúnculo — el del mango es LARGO a propósito (su seña en
   el árbol real). Arte heredado de EscenaFrutales, entintado a la tarde. */
const ESPECIES = {
  aguacate: {
    copa: mezclar('#3d6631', TINTE, 0.14), copaClara: mezclar('#4f7f3c', TINTE, 0.16),
    fruto: '#2b431c', forma: [1, 1.45, 1], rFruto: 0.088, pend: 0.16,
  },
  mango: {
    copa: mezclar('#4a7c36', TINTE, 0.14), copaClara: mezclar('#61984a', TINTE, 0.16),
    fruto: '#eda03b', rubor: '#cd5a2a', forma: [0.95, 1.3, 0.85], rFruto: 0.095, pend: 0.3,
  },
  naranjo: {
    copa: mezclar('#467c3c', TINTE, 0.14), copaClara: mezclar('#5c9448', TINTE, 0.16),
    fruto: '#f08c24', forma: [1, 1, 1], rFruto: 0.078, pend: 0.07,
  },
  limonero: {
    copa: mezclar('#54894a', TINTE, 0.14), copaClara: mezclar('#6ba455', TINTE, 0.16),
    fruto: '#eed23c', forma: [1, 1.22, 1], rFruto: 0.068, pend: 0.06,
  },
  mandarino: {
    copa: mezclar('#4b823f', TINTE, 0.14), copaClara: mezclar('#639a4d', TINTE, 0.16),
    fruto: '#ef7d18', forma: [1, 0.92, 1], rFruto: 0.058, pend: 0.05,
  },
  guayabo: {
    copa: mezclar('#578a44', TINTE, 0.14), copaClara: mezclar('#6da052', TINTE, 0.16),
    fruto: '#cfd45a', rubor: '#e8b84a', forma: [1, 1.05, 1], rFruto: 0.072, pend: 0.06,
  },
};

/* ══════════════════════ LA GEOGRAFÍA DEL SOLAR ══════════════════════
   Una falda amable con lomas al fondo y la EXPLANADA del huerto en el centro,
   donde la faena aplana el piso. */
const ANCHO = 34;
const FONDO = 28;
const Y_HUERTO = 0.5;

function explanada(wx, wz) {
  return Math.max(
    gauss(wx, wz, 0, 0.8, 8.6, 6.2), // el huerto
    gauss(wx, wz, 3.2, 4.6, 4.0, 3.0), // el rincón de la cosecha
  );
}
function alturaFinca(wx, wz) {
  let h = 0.5 + ruido(wx * 0.5, wz * 0.5) * 0.22;
  h += gauss(wx, wz, -12, -10, 6.0, 4.2) * 2.1; // loma occidental
  h += gauss(wx, wz, 12, -11, 7.0, 4.6) * 2.5; // loma oriental
  h += gauss(wx, wz, 0, -13, 9.0, 3.6) * 1.7; // el fondo que cierra
  const f = clamp(explanada(wx, wz) * 1.2, 0, 1);
  return h * (1 - f) + Y_HUERTO * f;
}

/* Los frutales del solar: cada uno con su especie, su EDAD (esc/alto) y su
   puesto. Regados por el huerto — nunca la fila monótona. Declarados arriba
   para que el terreno pinte la tierra del plateo bajo cada uno. */
const ARBOLES = [
  { especie: 'aguacate', x: -6.2, z: -2.4, esc: 2.1, alto: 2.15, ancho: 1.15, frutos: 6 },
  { especie: 'mango', x: 5.6, z: -3.0, esc: 1.9, alto: 1.7, ancho: 1.35, frutos: 7, poda: true },
  { especie: 'naranjo', x: -1.7, z: -0.4, esc: 1.7, alto: 1.15, ancho: 1.0, frutos: 9 },
  { especie: 'limonero', x: -5.4, z: 3.1, esc: 1.55, alto: 0.95, ancho: 0.9, frutos: 8 },
  { especie: 'mandarino', x: 2.4, z: 1.9, esc: 1.5, alto: 0.85, ancho: 0.85, frutos: 10 },
  { especie: 'guayabo', x: -9.0, z: 0.6, esc: 1.6, alto: 1.0, ancho: 0.95, frutos: 8 },
];
const POS_PAPAYO = [7.8, 1.6];
const POS_INJERTO = [0.4, 5.0];
const POS_COSECHA = [6.6, 0.6];

/* Malla del terreno con colores por vértice: pasto con motas de tarde, el
   piso pisado del huerto y la tierra oscura del plateo bajo cada frutal. */
function construirTerreno(seg, plano) {
  const nx = seg + 1, nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cPasto = new THREE.Color(P.pasto);
  const cSeco = new THREE.Color(P.pastoSeco);
  const cHuerto = new THREE.Color(P.tierraHuerto);
  const cPlateo = new THREE.Color(P.plateo);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaFinca(wx, wz);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      // base: pasto con motas secas donde pega la tarde
      c.lerpColors(cPasto, cSeco, smoothstep(-0.35, 1.0, ruido(wx + 3, wz - 2)));
      // el piso pisado del huerto, apenas
      c.lerp(cHuerto, clamp(gauss(wx, wz, 1.8, 2.6, 5.2, 3.4) * 0.5, 0, 0.5));
      // la tierra abonada del plateo bajo cada frutal
      for (const a of ARBOLES) {
        const r = 0.75 * a.esc;
        c.lerp(cPlateo, clamp(gauss(wx, wz, a.x, a.z, r, r) * 0.85, 0, 0.85));
      }
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

/* Las luces de la tarde del kit. */
function LucesTarde() {
  return (
    <>
      <hemisphereLight intensity={DIA.hemisferio} color={DIA.cielo} groundColor={DIA.suelo} />
      <ambientLight intensity={DIA.ambiente} color={DIA.luz} />
      <directionalLight position={DIA.solPos} intensity={DIA.sol} color={DIA.luz} />
      <directionalLight position={[6, 5, -7]} intensity={DIA.rellenoInt} color={DIA.relleno} />
    </>
  );
}

/* Nubes de la tarde: esferas planas tibias, quietas, muy lejos. */
function NubesTarde() {
  const nubes = [
    [-10, 9.2, -12, 3.0],
    [5, 10.2, -13, 2.5],
    [12, 8.6, -11, 2.8],
  ];
  return (
    <group>
      {nubes.map((n, i) => (
        <mesh key={i} position={[n[0], n[1], n[2]]} scale={[n[3], n[3] * 0.34, n[3] * 0.7]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#fdf3dc" transparent opacity={0.82} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* Etiqueta didáctica sobre la escena (solo en modo «nombres del huerto»). */
function Etiqueta({ pos, texto }) {
  return (
    <group position={pos}>
      <Html center distanceFactor={9} zIndexRange={[30, 0]}>
        <div className="mfru3-chip" aria-hidden="true">{texto}</div>
      </Html>
    </group>
  );
}

/* ══════════════════════ LOS FRUTALES ══════════════════════ */

/* El PLATEO en relieve: el anillo de hojarasca al pie del árbol (el terreno
   ya trae la mancha de tierra; este anillo le da el borde legible). */
function Plateo({ r = 0.4 }) {
  return (
    <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r * 0.3, r, 20]} />
      <meshLambertMaterial color={P.plateo} />
    </mesh>
  );
}

/*
 * Un ÁRBOL FRUTAL: tronco + copa DENSA en varias esferas + los frutos
 * característicos colgando del borde bajo de la copa, cada uno con su
 * pedúnculo. Determinista por índice (mismo huerto siempre). `poda` señala un
 * corte limpio en una rama (el disco claro del corte reciente, sin drama).
 * `esc` escala el individuo entero: la EDAD del árbol, legible de lejos.
 */
function ArbolFrutal({ especie, pos, esc = 1.6, alto = 1.4, ancho = 1, frutos = 6, poda = false }) {
  const cfg = ESPECIES[especie] || ESPECIES.naranjo;

  // La copa densa: un núcleo grande + satélites que la despeinan (nada de
  // esfera perfecta de plastilina). Escala con alto/ancho del individuo.
  const copa = useMemo(() => {
    const cy = alto;
    const R = 0.34 * ancho + alto * 0.16;
    return [
      [0, cy, 0, R],
      [R * 0.72, cy - R * 0.3, R * 0.2, R * 0.62],
      [-R * 0.66, cy - R * 0.24, -R * 0.16, R * 0.66],
      [R * 0.18, cy + R * 0.52, -R * 0.4, R * 0.56],
      [-R * 0.26, cy + R * 0.44, R * 0.44, R * 0.52],
    ];
  }, [alto, ancho]);

  // Los frutos, colgando del borde BAJO de la copa hacia el aire (donde se
  // ven y se cosechan): en la falda de la copa, POR FUERA del follaje, en
  // silueta — el fruto es la lección, tiene que leerse de lejos.
  const cuelgan = useMemo(() => {
    const R = 0.34 * ancho + alto * 0.16;
    return Array.from({ length: frutos }, (_, i) => {
      const a = (i / frutos) * Math.PI * 2 + 0.7;
      const r = R * (0.82 + (i % 3) * 0.1);
      const y = alto - R * 0.58 - (i % 2) * 0.08;
      return /** @type {[number, number, number]} */ ([
        Math.cos(a) * r, y, Math.sin(a) * r,
      ]);
    });
  }, [frutos, alto, ancho]);

  return (
    <group position={pos} scale={[esc, esc, esc]}>
      <Plateo r={0.3 + ancho * 0.2} />
      {/* el tronco (más grueso mientras más viejo el árbol) */}
      <mesh position={[0, alto * 0.5, 0]}>
        <cylinderGeometry args={[0.05 + alto * 0.02, 0.09 + alto * 0.03, alto, 6]} />
        <meshLambertMaterial color={P.madera} flatShading />
      </mesh>
      {/* la copa densa */}
      {copa.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[r, 9, 7]} />
          <meshLambertMaterial color={i % 2 ? cfg.copa : cfg.copaClara} flatShading />
        </mesh>
      ))}
      {/* los frutos característicos, colgando de su pedúnculo */}
      {cuelgan.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh position={[0, cfg.pend * 0.5, 0]}>
            <cylinderGeometry args={[0.008, 0.008, cfg.pend, 4]} />
            <meshLambertMaterial color={P.maderaOscura} flatShading />
          </mesh>
          <mesh position={[0, -cfg.rFruto * cfg.forma[1] * 0.72, 0]} scale={cfg.forma}>
            <sphereGeometry args={[cfg.rFruto, 8, 6]} />
            <meshLambertMaterial
              color={cfg.rubor && i % 2 ? cfg.rubor : cfg.fruto}
              flatShading
            />
          </mesh>
        </group>
      ))}
      {/* la PODA: la rama aclarada con su corte limpio (disco claro), señal
          sin drama — la copa abierta deja entrar luz y aire */}
      {poda && (
        <group position={[0.16, alto * 0.62, 0.14]} rotation={[0, 0, -0.9]}>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 0.14, 5]} />
            <meshLambertMaterial color={P.madera} flatShading />
          </mesh>
          <mesh position={[0, 0.145, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.032, 8]} />
            <meshLambertMaterial color={P.maderaClara} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* El PAPAYO: el frutal de patio de tronco solo — sin ramas, la corona de
   hojas arriba y el racimo de papayas PEGADO al tronco justo debajo (así
   carga el papayo de verdad: la fruta abraza el tallo). */
function Papayo({ pos, alto = 2.7 }) {
  const hojas = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.4;
        return { a, inc: 0.55 + (i % 3) * 0.14, r: 0.62 + (i % 2) * 0.1 };
      }),
    [],
  );
  const frutas = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + 0.2;
        return { a, y: alto - 0.55 - (i % 3) * 0.16, madura: i === 2 };
      }),
    [alto],
  );
  return (
    <group position={pos}>
      <Plateo r={0.45} />
      {/* el tronco solo, con sus cicatrices de hoja (anillos) */}
      <mesh position={[0, alto * 0.5, 0]}>
        <cylinderGeometry args={[0.09, 0.14, alto, 7]} />
        <meshLambertMaterial color={mezclar(P.madera, P.cal, 0.25)} flatShading />
      </mesh>
      {[0.3, 0.5, 0.7].map((f, i) => (
        <mesh key={i} position={[0, alto * f, 0]}>
          <cylinderGeometry args={[0.115, 0.115, 0.035, 7]} />
          <meshLambertMaterial color={P.maderaOscura} flatShading />
        </mesh>
      ))}
      {/* la corona de hojas palmeadas que radian */}
      {hojas.map((h, i) => (
        <group key={i} rotation={[0, h.a, 0]}>
          <group position={[0, alto, 0]} rotation={[0, 0, -h.inc]}>
            {/* el peciolo largo */}
            <mesh position={[h.r * 0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.016, 0.02, h.r, 4]} />
              <meshLambertMaterial color={P.brote} flatShading />
            </mesh>
            {/* la hoja: plato verde aplastado en la punta */}
            <mesh position={[h.r, 0.02, 0]} scale={[1, 0.22, 0.78]}>
              <sphereGeometry args={[0.34, 7, 5]} />
              <meshLambertMaterial
                color={i % 2 ? ESPECIES.guayabo.copa : ESPECIES.guayabo.copaClara}
                flatShading
              />
            </mesh>
          </group>
        </group>
      ))}
      {/* el racimo pegado al tronco: papayas verdes y UNA pintona (se cosecha
          pintona y madura en casa, igual que el aguacate) */}
      {frutas.map((f, i) => (
        <mesh
          key={i}
          position={[Math.cos(f.a) * 0.2, f.y, Math.sin(f.a) * 0.2]}
          scale={[1, 1.5, 1]}
        >
          <sphereGeometry args={[0.11, 7, 6]} />
          <meshLambertMaterial
            color={f.madura ? '#e8a23b' : '#7fa03f'}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

/* El INJERTO recién sembrado: la matica con su TUTOR y la venda clara del
   injerto en el tallo — la edad más nueva del huerto (el solar se renueva). */
function InjertoJoven({ pos, esc = 1.7 }) {
  return (
    <group position={pos} scale={[esc, esc, esc]}>
      <Plateo r={0.26} />
      {/* el tallo con la venda del injerto */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.018, 0.026, 0.4, 5]} />
        <meshLambertMaterial color={P.maderaOscura} flatShading />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.05, 6]} />
        <meshLambertMaterial color={P.cal} flatShading />
      </mesh>
      {/* el brote nuevo, verde tierno */}
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshLambertMaterial color={P.brote} flatShading />
      </mesh>
      {/* el tutor que lo endereza, amarrado */}
      <mesh position={[0.09, 0.3, 0.02]} rotation={[0, 0, 0.06]}>
        <cylinderGeometry args={[0.012, 0.012, 0.6, 4]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
    </group>
  );
}

/* La COSECHA en su rincón: la ESCALERA recostada hacia el mango y los CANASTOS
   con la fruta bajada A MANO (fruta golpeada = fruta perdida). */
function RinconCosecha({ pos, esc = 1.7 }) {
  const peldanos = [0.22, 0.44, 0.66, 0.88];
  return (
    <group position={pos} scale={[esc, esc, esc]} rotation={[0, -0.5, 0]}>
      {/* la escalera recostada */}
      <group rotation={[0.42, 0.5, 0]}>
        {[-0.11, 0.11].map((x, i) => (
          <mesh key={i} position={[x, 0.55, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1.1, 5]} />
            <meshLambertMaterial color={P.maderaClara} flatShading />
          </mesh>
        ))}
        {peldanos.map((y, i) => (
          <mesh key={i} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, 0.22, 4]} />
            <meshLambertMaterial color={P.madera} flatShading />
          </mesh>
        ))}
      </group>
      {/* los canastos de la fruta cosechada */}
      {[
        { p: [0.34, 0, 0.3], fruta: '#e8862a' }, // naranjas
        { p: [0.62, 0, 0.06], fruta: '#e0913a' }, // mangos
      ].map((c, i) => (
        <group key={i} position={c.p}>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.15, 0.11, 0.18, 9]} />
            <meshLambertMaterial color={P.maderaClara} flatShading />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <sphereGeometry args={[0.115, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshLambertMaterial color={c.fruta} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Los NOMBRES del huerto: la etiqueta de cada frutal y de cada lección. */
const NOMBRES = {
  aguacate: 'El aguacate, el mayor',
  mango: 'El mango (vea la poda)',
  naranjo: 'El naranjo',
  limonero: 'El limonero',
  mandarino: 'El mandarino',
  guayabo: 'El guayabo',
};
function EtiquetasHuerto() {
  return (
    <>
      {ARBOLES.map((a) => (
        <Etiqueta
          key={a.especie}
          pos={[a.x, Y_HUERTO + (a.alto + 0.9) * a.esc + 0.5, a.z]}
          texto={NOMBRES[a.especie]}
        />
      ))}
      <Etiqueta pos={[POS_PAPAYO[0], Y_HUERTO + 3.8, POS_PAPAYO[1]]} texto="El papayo" />
      <Etiqueta pos={[POS_INJERTO[0], Y_HUERTO + 2.1, POS_INJERTO[1]]} texto="El injerto, con su tutor" />
      <Etiqueta pos={[POS_COSECHA[0], Y_HUERTO + 2.6, POS_COSECHA[1]]} texto="La cosecha: a mano" />
    </>
  );
}

/* ══════════════════════ LA ESCENA COMPLETA ══════════════════════ */

function EscenaFrutales({ tier, reducedMotion, etiquetas }) {
  const perfil = perfilDeTier(tier);
  const geo = useMemo(
    () => construirTerreno(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  /* `color`/`fog` se adjuntan a la ESCENA: hijos directos, nunca en <group>. */
  return (
    <>
      <color attach="background" args={[DIA.fondo]} />
      {perfil.fog && <fog attach="fog" args={[DIA.niebla, DIA.nieblaCerca + 4, DIA.nieblaLejos]} />}
      <LucesTarde />
      <NubesTarde />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* los frutales, cada uno con su plateo y su edad */}
      {ARBOLES.map((a) => (
        <ArbolFrutal
          key={a.especie}
          especie={a.especie}
          pos={[a.x, alturaFinca(a.x, a.z), a.z]}
          esc={a.esc}
          alto={a.alto}
          ancho={a.ancho}
          frutos={a.frutos}
          poda={a.poda}
        />
      ))}

      {/* el papayo de patio, tronco solo con su racimo pegado */}
      <Papayo pos={[POS_PAPAYO[0], alturaFinca(POS_PAPAYO[0], POS_PAPAYO[1]), POS_PAPAYO[1]]} />

      {/* la edad más nueva: el injerto con su tutor (el huerto se renueva) */}
      <InjertoJoven pos={[POS_INJERTO[0], alturaFinca(POS_INJERTO[0], POS_INJERTO[1]), POS_INJERTO[1]]} />

      {/* la cosecha: escalera y canastos junto al mango (a mano, no a palo) */}
      <RinconCosecha pos={[POS_COSECHA[0], alturaFinca(POS_COSECHA[0], POS_COSECHA[1]), POS_COSECHA[1]]} />

      {etiquetas && <EtiquetasHuerto />}

      {/* unas piedras que amueblan el borde del solar */}
      {[
        [-2.2, 6.4, 0.32], [10.6, 4.2, 0.4], [-10.8, 4.6, 0.3],
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

      {/* la vida que cuaja la fruta: los polinizadores + el del plateo */}
      <Bicho
        tipo="mariposa"
        base={[-1.2, Y_HUERTO + 2.1, 0.6]}
        size={26}
        rol="polinizador"
        fase={0.6}
        reducedMotion={reducedMotion}
        title="Mariposa en el naranjo"
      />
      <Bicho
        tipo="colibri"
        base={[-5.0, Y_HUERTO + 2.4, 2.6]}
        size={30}
        rol="polinizador"
        fase={1.9}
        reducedMotion={reducedMotion}
        title="Colibrí en el limonero"
      />
      <Bicho
        tipo="escarabajo"
        base={[-6.0, Y_HUERTO + 0.12, -1.6]}
        size={22}
        rol="descomponedor"
        fase={3.1}
        reducedMotion={reducedMotion}
        title="Escarabajo en el plateo del aguacate"
      />

      {/* el polen del kit sobre las copas floridas */}
      <ParticulasAmbientales
        tipo="polen"
        tier={tier}
        reducedMotion={reducedMotion}
        position={[-2, 2.4, 0.5]}
        semilla={17}
      />
      <ParticulasAmbientales
        tipo="polen"
        densidad={0.5}
        tier={tier}
        reducedMotion={reducedMotion}
        position={[5, 2.2, 0.5]}
        semilla={53}
      />
    </>
  );
}

/* ══════════════════════ EL CHROME (DOM) ══════════════════════ */

const CSS_MFRU3 = `
.mfru3-root { margin: 0 auto; max-width: 72rem; padding: 0 0 2.5rem; background: #f7eedb; color: #3c2f1c; font-family: system-ui, sans-serif; }
.mfru3-head { padding: 1.1rem 1rem 0.4rem; }
.mfru3-kicker { margin: 0; font: 600 0.72rem/1.2 system-ui, sans-serif; letter-spacing: 0.09em; text-transform: uppercase; color: #96652f; }
.mfru3-head h1 { margin: 0.2rem 0 0.4rem; font-size: clamp(1.35rem, 4vw, 1.9rem); line-height: 1.15; color: #4a3418; }
.mfru3-lema { margin: 0; max-width: 46rem; font-size: 0.92rem; line-height: 1.55; color: #5a4a30; }
.mfru3-escena { position: relative; margin: 0.9rem 0 0; height: min(78dvh, 40rem); min-height: 22rem; overflow: hidden; background: ${DIA.fondo}; border-radius: 0; }
.mfru3-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.mfru3-canvas--lista { opacity: 1; }
.mfru3-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: flex-end; }
.mfru3-pie { padding: 0 1rem 0.9rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem; }
.mfru3-carta { margin: 0; max-width: 34rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(74,52,24,0.66); backdrop-filter: blur(3px); color: #fbf3e2; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.mfru3-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(74,52,24,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(255,247,228,0.85); color: #5a3f1c; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.mfru3-boton:hover, .mfru3-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(74,52,24,0.6); outline: none; }
.mfru3-boton[aria-pressed='true'] { background: #ffe0a4; border-color: rgba(90,63,28,0.75); color: #4a3418; }
.mfru3-chip { pointer-events: none; display: inline-flex; align-items: center; gap: 0.3em; padding: 2px 8px; border-radius: 999px; background: rgba(58,42,24,0.82); color: #fdf6e3; font: 600 10px/1.5 system-ui, sans-serif; white-space: nowrap; box-shadow: 0 2px 6px rgba(40,28,10,0.3); }
.mundo-fauna { pointer-events: none; filter: drop-shadow(0 2px 5px rgba(40, 30, 10, 0.24)); }
.mfru3-leyenda { padding: 1.4rem 1rem 0; }
.mfru3-leyenda h2 { margin: 0 0 0.3rem; font-size: 1.12rem; color: #4a3418; }
.mfru3-leyenda ol { margin: 0.6rem 0 0; padding: 0; list-style: none; display: grid; gap: 0.7rem; }
.mfru3-leyenda li { display: flex; gap: 0.65rem; align-items: flex-start; background: #fdf7e6; border: 1px solid #ead9b8; border-radius: 0.7rem; padding: 0.65rem 0.8rem; }
.mfru3-emoji { font-size: 1.25rem; line-height: 1.3; }
.mfru3-leyenda b { display: block; font-size: 0.88rem; color: #4a3418; }
.mfru3-leyenda p { margin: 0.15rem 0 0; font-size: 0.83rem; line-height: 1.5; color: #5a4a30; }
.mfru3-cierre { margin: 0.9rem 0 0; max-width: 46rem; font-size: 0.86rem; line-height: 1.55; color: #5a4a30; }
@media (min-width: 40rem) { .mfru3-leyenda ol { grid-template-columns: 1fr 1fr; } }
@media (prefers-reduced-motion: reduce) { .mfru3-canvas { transition: none; } }
`;

/* La copia didáctica del huerto: saber campesino verificado, sin recetas de
   veneno. El huerto que se ve arriba, contado pieza por pieza. */
const LEYENDA = [
  {
    emoji: '🥑',
    titulo: 'El aguacate, el mayor del solar',
    texto: 'Árbol grande de raíz delicada: pide suelo suelto que no se encharque (el encharque le pudre la raíz). El fruto se cosecha "hecho" pero verde, y madura bajado, en la casa. Verde oscuro colgando de su pedúnculo: esa es su seña.',
  },
  {
    emoji: '🥭',
    titulo: 'El mango, copa ancha de tierra caliente',
    texto: 'Copa densa que da sombra propia. El fruto cuelga de un pedúnculo largo — por eso se cosecha con vara de bolsa o con escalera, nunca a palo. Es de clima cálido: abajo de los mil metros es donde carga con ganas.',
  },
  {
    emoji: '🍊',
    titulo: 'Los cítricos: naranja, limón y mandarina',
    texto: 'Árboles medianos y redondos, cargados de fruto de color que se ve de lejos. Casi todos van INJERTADOS sobre un patrón resistente: la copa da la fruta buena y el patrón aguanta el suelo. Del cálido al templado, cada uno con su piso.',
  },
  {
    emoji: '🍈',
    titulo: 'La guayaba y el papayo, los de patio',
    texto: 'La guayaba perfuma el solar y llama pájaros y abejas; el papayo es el frutal de afán — de tronco solo, carga al año de sembrado y la fruta le abraza el tallo. Se cosecha pintona y madura en casa, como el aguacate.',
  },
  {
    emoji: '✂️',
    titulo: 'La poda: abrirle luz y aire a la copa',
    texto: 'La copa cerrada cría hongos y esconde la fruta. La poda quita lo enfermo, lo cruzado y los chupones, con corte limpio y herramienta desinfectada. Copa abierta = menos enfermedad y fruta que se alcanza.',
  },
  {
    emoji: '🌱',
    titulo: 'Las edades: el huerto se renueva',
    texto: 'En el huerto conviven el árbol mayor y el injerto recién sembrado con su tutor. Sembrar un frutal nuevo cada tanto es la pensión del solar: cuando el viejo afloje, el joven ya está cargando. Y el plateo — el anillo de hojarasca al pie — le guarda la humedad y le quita el pasto de encima.',
  },
  {
    emoji: '🧺',
    titulo: 'La cosecha: a mano, no a palo',
    texto: 'La fruta se baja con la mano, con escalera o con vara de bolsa, y se acomoda en canasto sin llenarlo hasta reventar. Fruta golpeada es fruta que se pudre antes de llegar a la plaza: el cuidado de un minuto vale el precio del bulto.',
  },
  {
    emoji: '🦋',
    titulo: 'Los que cuajan la fruta',
    texto: 'Sin abeja, mariposa ni colibrí no hay mango ni naranja: el polinizador es el socio del huerto. Por eso al frutal no se le fumiga en floración, y las flores del solar — como la caléndula de la botica — son plata sembrada.',
  },
];

const COPY_CALMA =
  'Gire el huerto con el dedo: el aguacate mayor, el mango podado, los cítricos cargados, el papayo y el injerto nuevo. Toque el botón para ver los nombres.';
const COPY_ETIQ =
  'Vea las edades conviviendo: el aguacate mayor, el mango con su poda, los cítricos, el guayabo, el papayo de patio y el injerto con su tutor. La escalera y los canastos: la fruta se baja a mano.';

/**
 * MundoFrutales3D — el huerto de frutales del solar, montable con su propio
 * `<Canvas>`. Sin lógica de negocio: es una vitrina
 * (#/mockups/mundo-frutales-3d · prod #diorama_frutales). El tier y
 * reduced-motion se detectan aquí (mockup standalone), igual que sus pares.
 */
export default function MundoFrutales3D() {
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
    <main className="mfru3-root">
      <style>{CSS_MFRU3}</style>

      <header className="mfru3-head">
        <p className="mfru3-kicker">Los mundos de su finca · vitrina</p>
        <h1>El huerto de frutales</h1>
        <p className="mfru3-lema">
          Métase al solar de frutales: el aguacate mayor con su fruto verde
          colgando, el mango de copa ancha con el pedúnculo largo, los cítricos
          cargados de naranja, limón y mandarina, la guayaba y el papayo de
          patio. Árboles de distinta edad conviviendo, el plateo que guarda la
          humedad, la poda que abre luz y aire, y la cosecha a mano — porque la
          fruta golpeada se pierde.
        </p>
      </header>

      <section
        className="mfru3-escena"
        data-tier={tier}
        aria-label="El huerto de frutales del solar campesino en 3D"
      >
        <Canvas
          className={`mfru3-canvas${listo ? ' mfru3-canvas--lista' : ''}`}
          dpr={perfil.dpr}
          gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
          camera={{ position: [1.5, 6.8, 15.5], fov: 45 }}
          frameloop={reducedMotion ? 'demand' : 'always'}
          onCreated={() => setListo(true)}
        >
          <EscenaFrutales tier={tier} reducedMotion={reducedMotion} etiquetas={etiquetas} />
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom
            minDistance={7}
            maxDistance={23}
            target={[0, 1.6, 0.4]}
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

        <div className="mfru3-chrome">
          <div className="mfru3-pie">
            <button
              type="button"
              className="mfru3-boton"
              aria-pressed={etiquetas}
              onClick={() => setEtiquetas((v) => !v)}
            >
              {etiquetas ? 'Quitar los nombres' : 'Ver los nombres del huerto'}
            </button>
            <p className="mfru3-carta" role="status">
              {etiquetas ? COPY_ETIQ : COPY_CALMA}
            </p>
          </div>
        </div>
      </section>

      <section className="mfru3-leyenda" aria-label="El huerto de frutales, pieza por pieza">
        <h2>El huerto, pieza por pieza</h2>
        <ol>
          {LEYENDA.map((p) => (
            <li key={p.titulo}>
              <span className="mfru3-emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mfru3-cierre">
          El buen huerto no es una fila de árboles iguales: es el aguacate
          mayor y el injerto nuevo, la copa podada a tiempo, el plateo que
          abona y la fruta bajada con la mano. Siembre el reemplazo antes de
          necesitarlo y cosecha no le va a faltar — al solar ni a la plaza.
        </p>
      </section>
    </main>
  );
}
