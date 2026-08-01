/*
 * AliadosFinca3D — la escena de los ALIADOS DE LA FINCA: la fauna funcional
 * benéfica trabajando en la huerta. No es decorado: es CONTROL BIOLÓGICO contado
 * en 3D. Cada aliado aparece junto a su OFICIO visible y una capa 2D de carteles
 * rubber-hose (Cuphead / Miss Minutes andino) explica qué hace por la finca:
 *
 *   Mariquita   → CONTROLA PLAGAS   (patrulla la hoja, se come los pulgones)
 *   Abejorro    → POLINIZA          (reparte el polen de flor en flor)
 *   Lombriz     → AIREA EL SUELO    (túneles y turrículos que oxigenan la tierra)
 *   Escarabajo  → DESCOMPONE        (entierra el desecho → humus → brote nuevo)
 *   Aves        → CONTROL AÉREO     (cazan orugas y adultos voladores)
 *
 * DIRECCIÓN DE ARTE (todo dentro del framework, nada inventado por fuera):
 *   - La atmósfera es la MISMA hora dorada del valle: `ATMOSFERA` de atmosferaMadre.
 *     Entrar a la huerta se siente como acercarse dentro del mismo atardecer.
 *   - Los materiales salen de `PALETA` (atmosferaMadre), entintados con `mezclar`.
 *   - La fauna 2D reusa `FaunaRubberhose` sin tocarla: se monta como CARTELES
 *     sobre el <Canvas>, cada uno con su cinta de rol. La escena 3D pone las
 *     ZONAS DE TRABAJO (hoja con pulgones, flores, turrículos, compostera).
 *
 * RENDIMIENTO: low-poly Lambert sin shadow-map, plantas deterministas (sin
 * Math.random), presupuestos por `perfilDeTier`. `reducedMotion` congela el
 * vuelo de las aves y el latido de los focos y pasa el frameloop a demanda; la
 * gama baja cae al 2D digno antes de montar esto. Los carteles rubber-hose ya
 * respetan reduced-motion por su propio CSS.
 *
 * Archivo nuevo autónomo (su propio <Canvas>). Ruta la cablea Opus (sin auth).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { ATMOSFERA, PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import {
  MariquitaRubber,
  AbejorroRubber,
  LombrizRubber,
  EscarabajoRubber,
} from '../visual/creatures/FaunaRubberhose.jsx';

/* ── Paleta de la huerta: la del framework, entintada apenas hacia la hora
      dorada para que el ojo lea "el mismo lugar" que los otros mundos. ── */
const TINTE = ATMOSFERA.niebla;
const P = {
  tierra: mezclar(PALETA.tierra, TINTE, 0.18),
  tierraClara: mezclar(PALETA.tierraClara, TINTE, 0.22),
  camaMarco: mezclar(PALETA.maderaOscura, TINTE, 0.15),
  follaje: mezclar(PALETA.follaje, TINTE, 0.16),
  follajeClaro: mezclar(PALETA.follajeClaro, TINTE, 0.16),
  follajeOscuro: mezclar(PALETA.follajeOscuro, TINTE, 0.14),
  hojaGrande: mezclar('#4c9a3f', TINTE, 0.14), // la hoja que patrulla la mariquita
  florRosa: mezclar('#e46b9b', TINTE, 0.1), // pétalos del cantero de flores
  florCorazon: mezclar('#f4c542', TINTE, 0.08),
  compost: mezclar('#3a2a18', TINTE, 0.18), // pila de compost del escarabajo
  compostSeco: mezclar('#6e5238', TINTE, 0.2),
  brote: mezclar('#6ac06a', TINTE, 0.1), // la vida que nace del compost
  turriculo: mezclar('#5a3d28', TINTE, 0.12), // turrículos de la lombriz
  ave: '#2f2b23', // silueta de las aves a contraluz
  // — las hortalizas de las camas (cada cultivo con su verde propio) —
  lechuga: mezclar('#8fbf4a', TINTE, 0.12), // roseta verde-amarilla, brillante
  lechugaCentro: mezclar('#c9dd7a', TINTE, 0.1), // el cogollo tierno del centro
  col: mezclar('#8aa883', TINTE, 0.12), // repollo glauco (verde azulado-gris)
  colHoja: mezclar('#6f9468', TINTE, 0.14), // hoja envolvente, un punto más honda
  tomateFruto: mezclar('#c9432e', TINTE, 0.08), // el rojo del fruto maduro
  zanahoriaPluma: mezclar('#5f9a44', TINTE, 0.12), // penacho plumoso
  zanahoriaRaiz: mezclar('#d97a2a', TINTE, 0.08), // el hombro naranja que asoma
  pasto: mezclar(PALETA.follajeClaro, TINTE, 0.25), // la falda que aterriza la huerta
};

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

/* Ruido determinista barato (mulberry32) para sembrar igual en cada carga. */
function crearRng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Posiciones-ancla de cada ZONA DE TRABAJO en el mundo (x,z). El foco 2D
   enciende el anillo de la zona correspondiente. */
const ZONAS = {
  mariquita: [-4.2, 1.6],
  abejorro: [3.8, 1.2],
  lombriz: [-1.4, 3.4],
  escarabajo: [4.4, -1.6],
};

/* ── Luces de la hora dorada (misma receta que los otros mundos): hemisferio
      cálido, ambiente suave, el sol bajo direccional y un relleno frío. ── */
function LucesDoradas() {
  return (
    <>
      <hemisphereLight intensity={0.72} color={ATMOSFERA.cielo} groundColor={ATMOSFERA.suelo} />
      <ambientLight intensity={0.32} color={ATMOSFERA.luz} />
      <directionalLight position={[8, 9, 4]} intensity={1.05} color={ATMOSFERA.luz} />
      <directionalLight position={[-7, 4, -6]} intensity={0.28} color={ATMOSFERA.relleno} />
    </>
  );
}

/* El sol bajo: disco tibio con halo, ancla visual de la hora (no ilumina). */
function SolBajo() {
  return (
    <group position={[9, 6.5, -13]}>
      <mesh>
        <circleGeometry args={[1.5, 40]} />
        <meshBasicMaterial color="#fff0cf" transparent opacity={0.95} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[2.9, 40]} />
        <meshBasicMaterial color={ATMOSFERA.luz} transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[5, 40]} />
        <meshBasicMaterial color={ATMOSFERA.cielo} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ══════ EL FONDO QUE ATERRIZA LA HUERTA ══════
   Antes el disco de tierra terminaba contra el crema plano del cielo y la
   huerta se leía flotando sobre café muerto. Llega el patrón de la botica
   (que a su vez viene del telón del páramo):
   · LA FALDA — anillo de pasto que continúa el terreno desde el borde del
     disco hasta perderse en la niebla dorada. Lambert con fog.
   · LAS LOMAS — tres anillos de crestas, cada uno más alto, más lejos y más
     pálido. La perspectiva aérea va HORNEADA en los vértices (mezcla hacia la
     bruma), MeshBasic con fog:false: se lee igual en cualquier tier.
   Senos de frecuencia ENTERA sobre el ángulo: la silueta cierra el anillo sin
   costura y sin Math.random. */
function FondoLomas() {
  const { geoFalda, geoLomas, matFalda, matLomas } = useMemo(() => {
    const bruma = new THREE.Color(ATMOSFERA.niebla);
    const c = new THREE.Color();

    /* — la falda de pasto: anillo r 7.2 → 50, hundiéndose apenas. Arranca
       pegada al borde del disco de tierra (r 7.5): la huerta es un claro
       trabajado DENTRO de un potrero verde, no una pampa de tierra pelada — */
    const NA = 56;
    const R0 = 6.0, R1 = 50;
    const posF = new Float32Array((NA + 1) * 2 * 3);
    const colF = new Float32Array((NA + 1) * 2 * 3);
    const idxF = [];
    /* El verde va HORNEADO y el material es Basic: con Lambert la luz dorada
       de la hora multiplicaba el oliva a beige y el potrero desaparecía
       (verificado en captura). Basic + fog: cerca verde firme, lejos bruma. */
    const cPasto = new THREE.Color(mezclar(PALETA.follaje, TINTE, 0.18));
    for (let i = 0; i <= NA; i++) {
      const a = (i / NA) * Math.PI * 2;
      const cs = Math.cos(a), sn = Math.sin(a);
      [[R0, -0.02, 0.05], [R1, -0.6, 0.8]].forEach(([r, y, velo], l) => {
        const k = (i * 2 + l) * 3;
        posF[k] = cs * r; posF[k + 1] = y; posF[k + 2] = sn * r;
        c.copy(cPasto).lerp(bruma, velo);
        colF[k] = c.r; colF[k + 1] = c.g; colF[k + 2] = c.b;
      });
      if (i < NA) {
        const q = i * 2;
        idxF.push(q, q + 1, q + 3, q, q + 3, q + 2);
      }
    }
    const geoFalda = new THREE.BufferGeometry();
    geoFalda.setAttribute('position', new THREE.BufferAttribute(posF, 3));
    geoFalda.setAttribute('color', new THREE.BufferAttribute(colF, 3));
    geoFalda.setIndex(idxF);
    geoFalda.computeVertexNormals();

    /* — las lomas: tres anillos de crestas, cada uno más lejos y más pálido.
       La PRIMERA va cerca (r 19, justo pasado el maxDistance de la órbita) y
       casi sin velo: es la que llena de VERDE la banda entre la huerta y el
       cielo — con las tres lejanas y pálidas el fondo seguía leyéndose crema
       muerto (verificado en captura). Perspectiva aérea de verdad: cresta
       cercana verde, lejanas fundidas en bruma. — */
    const filas = [
      { r: 19, alto: 3.2, base: -0.6, tono: mezclar(P.follaje, P.follajeOscuro, 0.35), velo: 0.16, kA: 5, kB: 11, kC: 23, fase: 1.7 },
      { r: 28, alto: 5.4, base: -1.0, tono: mezclar(P.follaje, TINTE, 0.25), velo: 0.45, kA: 4, kB: 9, kC: 19, fase: 4.2 },
      { r: 40, alto: 8.0, base: -1.4, tono: mezclar(P.follaje, TINTE, 0.45), velo: 0.68, kA: 3, kB: 7, kC: 17, fase: 0.6 },
    ];
    const N = 72;
    const posL = new Float32Array(filas.length * (N + 1) * 2 * 3);
    const colL = new Float32Array(filas.length * (N + 1) * 2 * 3);
    const idxL = [];
    let v0 = 0, p = 0;
    for (const f of filas) {
      const cumbre = new THREE.Color(f.tono).lerp(bruma, f.velo);
      const pie = cumbre.clone().lerp(bruma, 0.5);
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        const s =
          0.45 +
          0.3 * Math.sin(f.kA * a + f.fase) +
          0.22 * Math.sin(f.kB * a + f.fase * 2.1) +
          0.12 * Math.sin(f.kC * a + f.fase * 4.3);
        const y = f.base + f.alto * clamp(s, 0.15, 1.1);
        const cs = Math.cos(a), sn = Math.sin(a);
        for (let l = 0; l < 2; l++) {
          posL[p] = cs * f.r;
          posL[p + 1] = l === 0 ? y : f.base;
          posL[p + 2] = sn * f.r;
          const cc = l === 0 ? cumbre : pie;
          colL[p] = cc.r; colL[p + 1] = cc.g; colL[p + 2] = cc.b;
          p += 3;
        }
        if (i < N) {
          const q = v0 + i * 2;
          idxL.push(q, q + 1, q + 3, q, q + 3, q + 2);
        }
      }
      v0 += (N + 1) * 2;
    }
    const geoLomas = new THREE.BufferGeometry();
    geoLomas.setAttribute('position', new THREE.BufferAttribute(posL, 3));
    geoLomas.setAttribute('color', new THREE.BufferAttribute(colL, 3));
    geoLomas.setIndex(idxL);

    /* DoubleSide obligatorio: el winding del anillo queda de espaldas a la
       cámara alta y FrontSide lo cull-eaba entero — la falda no se dibujaba
       y el "potrero" era el color de fondo pelado (verificado por píxel:
       #f2d9a8 exacto = ATMOSFERA.fondo). */
    const matFalda = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const matLomas = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      fog: false,
    });
    return { geoFalda, geoLomas, matFalda, matLomas };
  }, []);

  useEffect(
    () => () => {
      geoFalda.dispose();
      geoLomas.dispose();
      matFalda.dispose();
      matLomas.dispose();
    },
    [geoFalda, geoLomas, matFalda, matLomas],
  );

  return (
    <group>
      {/* el telón primero: siempre detrás de todo lo que importa */}
      <mesh geometry={geoLomas} material={matLomas} renderOrder={-1} />
      <mesh geometry={geoFalda} material={matFalda} />
    </group>
  );
}

/* El suelo de la huerta: el claro de tierra removida donde viven las camas.
   Chiquito a propósito (r 7.5): lo que no es huerta es pasto (FondoLomas),
   no una pampa café hasta el horizonte. */
function SueloHuerta() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <circleGeometry args={[6.2, 48]} />
      <meshLambertMaterial color={P.tierraClara} flatShading />
    </mesh>
  );
}

/* ══════ LAS HORTALIZAS ══════
   Cada cultivo con su FORMA propia (como las 7 aromáticas de la botica): que
   una lechuga se lea lechuga y un tomate se lea tomate desde la cámara. Todas
   low-poly Lambert flatShading, deterministas (la variación entra por props). */

/* Lechuga: ROSETA — corona de hojas abiertas alrededor de un cogollo tierno. */
function Lechuga({ x, z, esc, giro, verde }) {
  const hojas = 6;
  return (
    <group position={[x, 0.32, z]} rotation={[0, giro, 0]} scale={esc}>
      {Array.from({ length: hojas }, (_, i) => {
        const a = (i / hojas) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.13, 0.07, Math.sin(a) * 0.13]}
            rotation={[Math.PI / 2 - 0.95, 0, -a + Math.PI / 2]}
          >
            <circleGeometry args={[0.17, 5]} />
            <meshLambertMaterial
              color={mezclar(P.lechuga, P.follajeClaro, verde * 0.5)}
              flatShading
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
      {/* el cogollo del centro, más claro y tierno */}
      <mesh position={[0, 0.09, 0]} scale={[1, 0.75, 1]}>
        <sphereGeometry args={[0.11, 6, 5]} />
        <meshLambertMaterial color={P.lechugaCentro} flatShading />
      </mesh>
    </group>
  );
}

/* Col (repollo): BOLA glauca apretada + hojas grandes envolventes abiertas. */
function Col({ x, z, esc, giro, verde }) {
  return (
    <group position={[x, 0.32, z]} rotation={[0, giro, 0]} scale={esc}>
      {/* la cabeza compacta */}
      <mesh position={[0, 0.16, 0]} scale={[1, 0.85, 1]}>
        <sphereGeometry args={[0.2, 7, 5]} />
        <meshLambertMaterial color={mezclar(P.col, P.follajeClaro, verde * 0.3)} flatShading />
      </mesh>
      {/* tres hojas grandes que la abrazan sin cerrarse */}
      {[0, 2.1, 4.2].map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * 0.19, 0.1, Math.sin(a) * 0.19]}
          rotation={[Math.PI / 2 - 1.25, 0, -a + Math.PI / 2]}
        >
          <circleGeometry args={[0.24, 6]} />
          <meshLambertMaterial color={P.colHoja} flatShading side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/* Tomatera: MATA ALTA amarrada a su tutor de madera, con frutos rojos. */
function Tomatera({ x, z, esc, giro, verde }) {
  return (
    <group position={[x, 0.32, z]} rotation={[0, giro, 0]} scale={esc}>
      {/* el tutor (estaca de madera, huerta trabajada) */}
      <mesh position={[0.1, 0.48, 0.04]} rotation={[0, 0, 0.05]}>
        <cylinderGeometry args={[0.022, 0.028, 0.96, 5]} />
        <meshLambertMaterial color={P.camaMarco} flatShading />
      </mesh>
      {/* el tallo */}
      <mesh position={[0, 0.4, 0]} rotation={[0, 0, -0.06]}>
        <cylinderGeometry args={[0.025, 0.04, 0.8, 5]} />
        <meshLambertMaterial color={P.follajeOscuro} flatShading />
      </mesh>
      {/* el follaje: tres masas irregulares subiendo por el tutor */}
      {[
        [0.06, 0.42, 0.06, 0.15],
        [-0.09, 0.62, -0.04, 0.13],
        [0.03, 0.82, 0.02, 0.12],
      ].map(([hx, hy, hz, r], i) => (
        <mesh key={i} position={[hx, hy, hz]}>
          <icosahedronGeometry args={[r, 0]} />
          <meshLambertMaterial
            color={mezclar(P.follajeOscuro, P.follaje, 0.3 + verde * 0.4)}
            flatShading
          />
        </mesh>
      ))}
      {/* los frutos rojos colgando (la firma de la tomatera) */}
      {[
        [0.14, 0.52, 0.1],
        [-0.13, 0.68, 0.06],
        [0.1, 0.78, -0.08],
      ].map(([fx, fy, fz], i) => (
        <mesh key={i} position={[fx, fy, fz]}>
          <sphereGeometry args={[0.055, 6, 5]} />
          <meshLambertMaterial color={P.tomateFruto} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Zanahoria: PENACHO plumoso de hojas finas + el hombro naranja asomado. */
function Zanahoria({ x, z, esc, giro, verde }) {
  const plumas = 5;
  return (
    <group position={[x, 0.32, z]} rotation={[0, giro, 0]} scale={esc}>
      {/* el hombro de la raíz asomando de la tierra */}
      <mesh position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.045, 0.055, 0.06, 6]} />
        <meshLambertMaterial color={P.zanahoriaRaiz} flatShading />
      </mesh>
      {/* el penacho: conos finos abiertos en abanico */}
      {Array.from({ length: plumas }, (_, i) => {
        const a = (i / plumas) * Math.PI * 2;
        const inclina = i === 0 ? 0 : 0.42;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.045 * (i === 0 ? 0 : 1), 0.2, Math.sin(a) * 0.045 * (i === 0 ? 0 : 1)]}
            rotation={[Math.sin(a) * inclina, 0, -Math.cos(a) * inclina]}
          >
            <coneGeometry args={[0.035, 0.36, 4]} />
            <meshLambertMaterial
              color={mezclar(P.zanahoriaPluma, P.follajeClaro, verde * 0.5)}
              flatShading
            />
          </mesh>
        );
      })}
    </group>
  );
}

const CULTIVOS = { lechuga: Lechuga, col: Col, tomate: Tomatera, zanahoria: Zanahoria };

/* ── Cama de siembra: marco de madera + tierra + HILERAS POR CULTIVO, como se
      siembra de verdad: cada fila una hortaliza (cultivos[j]). Determinista
      por semilla. La fila j=0 queda al fondo (z negativo): ahí van las matas
      altas (tomateras) para no tapar las bajas. ── */
function CamaSiembra({ pos, largo, ancho, rot = 0, semilla, denso, cultivos }) {
  const matas = useMemo(() => {
    const rng = crearRng(semilla);
    const lista = [];
    const cols = denso ? 4 : 3;
    const filas = denso ? 3 : 2;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < filas; j++) {
        const x = -largo / 2 + 0.55 + (i / Math.max(1, cols - 1)) * (largo - 1.1);
        const z = -ancho / 2 + 0.5 + (j / Math.max(1, filas - 1)) * (ancho - 1.0);
        lista.push({
          x,
          z,
          tipo: cultivos[j % cultivos.length],
          esc: 0.82 + rng() * 0.35,
          giro: rng() * Math.PI * 2,
          verde: rng(),
        });
      }
    }
    return lista;
  }, [largo, ancho, semilla, denso, cultivos]);

  return (
    <group position={[pos[0], 0, pos[1]]} rotation={[0, rot, 0]}>
      {/* marco de madera */}
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[largo + 0.24, 0.28, ancho + 0.24]} />
        <meshLambertMaterial color={P.camaMarco} flatShading />
      </mesh>
      {/* tierra de la cama, un pelín hundida dentro del marco */}
      <mesh position={[0, 0.24, 0]}>
        <boxGeometry args={[largo, 0.16, ancho]} />
        <meshLambertMaterial color={P.tierra} flatShading />
      </mesh>
      {/* las hortalizas, cada una con su forma */}
      {matas.map((m, i) => {
        const Mata = CULTIVOS[m.tipo];
        return <Mata key={i} x={m.x} z={m.z} esc={m.esc} giro={m.giro} verde={m.verde} />;
      })}
    </group>
  );
}

/* ── ZONA MARIQUITA: la HOJA GRANDE que patrulla, con pulgones (motas verdes)
      que ella vigila. El oficio "controla plagas" hecho paisaje. ── */
function ZonaHoja({ pos }) {
  const pulgones = useMemo(() => {
    const rng = crearRng(9);
    return Array.from({ length: 5 }, () => ({
      x: (rng() - 0.5) * 0.7,
      z: (rng() - 0.5) * 0.5,
      y: 0.9 + rng() * 0.35,
    }));
  }, []);
  return (
    <group position={[pos[0], 0, pos[1]]}>
      {/* tallo */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 1.1, 6]} />
        <meshLambertMaterial color={P.follajeOscuro} flatShading />
      </mesh>
      {/* la hoja grande, ladeada al sol */}
      <mesh position={[0.12, 1.05, 0]} rotation={[-0.5, 0.3, 0.25]} scale={[1, 1, 1]}>
        <circleGeometry args={[0.62, 6]} />
        <meshLambertMaterial color={P.hojaGrande} flatShading side={THREE.DoubleSide} />
      </mesh>
      {/* hojas menores */}
      <mesh position={[-0.28, 0.7, 0.1]} rotation={[-0.7, -0.6, 0.2]}>
        <circleGeometry args={[0.34, 6]} />
        <meshLambertMaterial color={P.follaje} flatShading side={THREE.DoubleSide} />
      </mesh>
      {/* los pulgones que ella controla (motas verdes en el envés) */}
      {pulgones.map((a, i) => (
        <mesh key={i} position={[a.x + 0.12, a.y, a.z]}>
          <sphereGeometry args={[0.045, 5, 4]} />
          <meshLambertMaterial color="#aec27f" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ── ZONA ABEJORRO: el cantero de FLORES que poliniza (tallo + corola de
      pétalos y corazón dorado). ── */
function ZonaFlores({ pos }) {
  const flores = useMemo(() => {
    const rng = crearRng(23);
    return Array.from({ length: 5 }, () => ({
      x: (rng() - 0.5) * 1.4,
      z: (rng() - 0.5) * 1.0,
      alto: 0.5 + rng() * 0.35,
      esc: 0.8 + rng() * 0.4,
      giro: rng() * Math.PI,
    }));
  }, []);
  return (
    <group position={[pos[0], 0, pos[1]]}>
      {flores.map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]} rotation={[0, f.giro, 0]}>
          <mesh position={[0, f.alto / 2, 0]}>
            <cylinderGeometry args={[0.03, 0.04, f.alto, 5]} />
            <meshLambertMaterial color={P.follajeOscuro} flatShading />
          </mesh>
          <group position={[0, f.alto, 0]} scale={f.esc}>
            {/* corola: pétalos como toro aplanado */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.16, 0.08, 6, 10]} />
              <meshLambertMaterial color={P.florRosa} flatShading />
            </mesh>
            {/* corazón dorado (donde carga el polen) */}
            <mesh position={[0, 0.02, 0]}>
              <sphereGeometry args={[0.11, 7, 5]} />
              <meshLambertMaterial color={P.florCorazon} flatShading />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/* ── ZONA LOMBRIZ: los TURRÍCULOS (montículos aireados) con sus túneles. El
      suelo que ella oxigena. ── */
function ZonaTurriculos({ pos }) {
  const monticulos = useMemo(() => {
    const rng = crearRng(41);
    return Array.from({ length: 6 }, () => ({
      x: (rng() - 0.5) * 1.6,
      z: (rng() - 0.5) * 1.2,
      r: 0.14 + rng() * 0.12,
    }));
  }, []);
  return (
    <group position={[pos[0], 0, pos[1]]}>
      {monticulos.map((m, i) => (
        <group key={i} position={[m.x, 0, m.z]}>
          {/* el turrículo (tierra digerida, aireada) */}
          <mesh position={[0, m.r * 0.5, 0]} scale={[1, 0.7, 1]}>
            <sphereGeometry args={[m.r, 7, 5]} />
            <meshLambertMaterial color={P.turriculo} flatShading />
          </mesh>
          {/* la boca del túnel (aire que entra a la tierra) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, m.r * 0.72, 0]}>
            <circleGeometry args={[m.r * 0.34, 8]} />
            <meshBasicMaterial color="#241a10" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── ZONA ESCARABAJO: la COMPOSTERA (pila de desecho oscuro → tierra rica) con
      un BROTE que nace encima: la descomposición hecha vida. ── */
function ZonaCompost({ pos }) {
  return (
    <group position={[pos[0], 0, pos[1]]}>
      {/* la pila de compost */}
      <mesh position={[0, 0.28, 0]} scale={[1.3, 0.8, 1.3]}>
        <sphereGeometry args={[0.55, 9, 6]} />
        <meshLambertMaterial color={P.compost} flatShading />
      </mesh>
      {/* motas de material en descomposición (hojarasca seca) */}
      {[
        [0.35, 0.4, 0.2],
        [-0.3, 0.42, -0.15],
        [0.1, 0.5, -0.32],
      ].map((c, i) => (
        <mesh key={i} position={/** @type {[number, number, number]} */ (c)} scale={0.7}>
          <dodecahedronGeometry args={[0.12]} />
          <meshLambertMaterial color={P.compostSeco} flatShading />
        </mesh>
      ))}
      {/* el brote nuevo que corona la pila */}
      <group position={[0, 0.6, 0]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.02, 0.03, 0.36, 5]} />
          <meshLambertMaterial color={P.brote} flatShading />
        </mesh>
        <mesh position={[0.06, 0.32, 0]} rotation={[0, 0, -0.6]}>
          <coneGeometry args={[0.06, 0.2, 4]} />
          <meshLambertMaterial color={P.brote} flatShading />
        </mesh>
        <mesh position={[-0.06, 0.28, 0.02]} rotation={[0, 0, 0.7]}>
          <coneGeometry args={[0.05, 0.16, 4]} />
          <meshLambertMaterial color={mezclar(P.brote, P.follajeClaro, 0.4)} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* ── Anillo de foco: marca la zona del aliado seleccionado. Late y se aviva
      cuando está activo; casi invisible en reposo. reduced-motion lo deja fijo
      en su brillo activo/inactivo (sin latido). ── */
function AnilloFoco({ pos, color, activo, reducedMotion }) {
  const ref = useRef(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const base = activo ? 0.5 : 0.0;
    const pulso = reducedMotion || !activo ? 1 : 0.75 + 0.25 * Math.sin(clock.elapsedTime * 3);
    m.material.opacity = base * pulso;
    const esc = activo ? 1 : 0.9;
    m.scale.setScalar(esc);
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[pos[0], 0.03, pos[1]]}>
      <ringGeometry args={[0.95, 1.25, 40]} />
      <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* Ala como plano con bisagra (silueta de ave a contraluz). */
function alaGeom(w, d) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  g.translate(w / 2, 0, 0);
  return g;
}

/* ── AVES CONTROLADORAS: siluetas que planean sobre la huerta cazando orugas y
      voladores. El quinto aliado, en el aire. Una queda POSADA siempre (también
      en reduced-motion: presencia sin movimiento); las que vuelan solo cuando
      hay movimiento permitido. ── */
function AvesHuerta({ n }) {
  const grupo = useRef(null);
  const aves = useMemo(() => {
    const rng = crearRng(311);
    return Array.from({ length: n }, () => ({
      radio: 4.5 + rng() * 2.5,
      altura: 4.5 + rng() * 2,
      cx: (rng() - 0.5) * 3,
      cz: -3 + (rng() - 0.5) * 3,
      vel: 0.24 + rng() * 0.16,
      aleteo: 4 + rng() * 2,
      amp: 0.5,
      fase: rng() * Math.PI * 2,
      w: 0.34 + rng() * 0.12,
      d: 0.16,
    }));
  }, [n]);
  const geos = useMemo(
    () => aves.map((a) => ({ izq: alaGeom(a.w, a.d), der: alaGeom(-a.w, a.d) })),
    [aves],
  );
  useEffect(() => () => geos.forEach((g) => { g.izq.dispose(); g.der.dispose(); }), [geos]);

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.children.forEach((ave, i) => {
      const a = aves[i];
      const ang = t * a.vel + a.fase;
      ave.position.set(
        a.cx + Math.cos(ang) * a.radio,
        a.altura + Math.sin(t * 0.4 + a.fase) * 0.4,
        a.cz + Math.sin(ang) * a.radio * 0.75,
      );
      ave.rotation.y = -ang;
      const flap = Math.sin(t * a.aleteo + a.fase) * a.amp;
      ave.children[0].rotation.z = flap;
      ave.children[1].rotation.z = -flap;
    });
  });

  return (
    <group ref={grupo}>
      {aves.map((a, i) => (
        <group key={i}>
          <mesh geometry={geos[i].izq}>
            <meshBasicMaterial color={P.ave} side={THREE.DoubleSide} />
          </mesh>
          <mesh geometry={geos[i].der}>
            <meshBasicMaterial color={P.ave} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[a.d * 0.4, a.w * 1.1, 5]} />
            <meshBasicMaterial color={P.ave} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Un ave posada en el marco de una cama: siempre presente (da vida sin vuelo). */
function AvePosada() {
  return (
    <group position={[-4.2, 0.42, -3.2]} rotation={[0, 0.7, 0]}>
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.11, 7, 6]} />
        <meshLambertMaterial color={P.ave} flatShading />
      </mesh>
      <mesh position={[0.02, 0.2, 0.02]}>
        <sphereGeometry args={[0.07, 7, 6]} />
        <meshLambertMaterial color={mezclar(P.ave, '#4a4234', 0.4)} flatShading />
      </mesh>
      <mesh position={[-0.12, 0.06, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.05, 0.22, 5]} />
        <meshLambertMaterial color="#241a10" flatShading />
      </mesh>
    </group>
  );
}

/* La escena completa (grupo r3f interno; el default la monta en su Canvas). */
function EscenaAliados({ tier, reducedMotion, foco }) {
  const perfil = perfilDeTier(tier);
  const alto = tier === 'alto';

  return (
    <>
      <color attach="background" args={[ATMOSFERA.fondo]} />
      {/* fog largo: la huerta cabe en r≈6 y la falda de pasto vive entre r 6 y
          r 50 — con el fog viejo (14→34) el potrero se lavaba a crema antes de
          leerse verde. Ahora el verde cercano respira y la lejanía igual se
          funde en la bruma dorada. */}
      {perfil.fog && <fog attach="fog" args={[ATMOSFERA.niebla, 17, 52]} />}
      <LucesDoradas />
      <SolBajo />
      <FondoLomas />
      <SueloHuerta />

      {/* las camas de siembra: la huerta trabajada, cada hilera su cultivo
          (tomateras al fondo de su cama para no tapar las matas bajas) */}
      <CamaSiembra pos={[-2.6, -0.4]} largo={3.4} ancho={2.0} semilla={7} denso={alto} cultivos={['tomate', 'lechuga', 'zanahoria']} />
      <CamaSiembra pos={[2.4, -0.6]} largo={3.0} ancho={1.9} rot={0.12} semilla={13} denso={alto} cultivos={['tomate', 'col', 'lechuga']} />
      <CamaSiembra pos={[0, 2.2]} largo={3.8} ancho={1.8} rot={-0.06} semilla={19} denso={alto} cultivos={['col', 'zanahoria', 'lechuga']} />

      {/* las ZONAS DE TRABAJO, una por aliado */}
      <ZonaHoja pos={ZONAS.mariquita} />
      <ZonaFlores pos={ZONAS.abejorro} />
      <ZonaTurriculos pos={ZONAS.lombriz} />
      <ZonaCompost pos={ZONAS.escarabajo} />

      {/* anillos de foco: se avivan con la selección de un cartel */}
      <AnilloFoco pos={ZONAS.mariquita} color="#3f7d3a" activo={foco === 'mariquita'} reducedMotion={reducedMotion} />
      <AnilloFoco pos={ZONAS.abejorro} color="#c98a12" activo={foco === 'abejorro'} reducedMotion={reducedMotion} />
      <AnilloFoco pos={ZONAS.lombriz} color="#8a5a3c" activo={foco === 'lombriz'} reducedMotion={reducedMotion} />
      <AnilloFoco pos={ZONAS.escarabajo} color="#3d6b4a" activo={foco === 'escarabajo'} reducedMotion={reducedMotion} />

      {/* las aves controladoras */}
      <AvePosada />
      {!reducedMotion && <AvesHuerta n={alto ? 3 : 2} />}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CAPA 2D: los carteles rubber-hose. Reusan FaunaRubberhose sin tocarla.
   ══════════════════════════════════════════════════════════════════════════ */

/* Silueta mínima de ave para el cartel del quinto aliado (no hay rubber-hose de
   ave; se dibuja aquí una golondrina de tinta, coherente con la línea). */
function AveMini({ size = 72 }) {
  return (
    <svg viewBox="-26 -22 52 44" width={size} height={size} role="img" aria-label="Ave, control aéreo">
      <title>Ave, control aéreo</title>
      <path
        d="M-22,2 C-14,-8 -6,-6 0,2 C6,-6 14,-8 22,2 C14,-2 8,-1 0,6 C-8,-1 -14,-2 -22,2 Z"
        fill="#2f2b23"
        stroke="#241a10"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="0" cy="1.5" r="2.4" fill="#241a10" />
    </svg>
  );
}

/* Metadatos de cada aliado 2D: componente rubber-hose + copia didáctica. */
const ALIADOS = [
  {
    slug: 'mariquita',
    Comp: MariquitaRubber,
    nombre: 'Mariquita',
    cientifico: 'Hippodamia convergens',
    verbo: 'controla plagas',
    color: '#3f7d3a',
    corto: 'Patrulla la hoja y se come los pulgones.',
    largo:
      'Una sola mariquita se come cientos de pulgones en su vida. Donde ella y sus larvas patrullan, la plaga no se dispara y no hay que fumigar: el equilibrio lo pone la fauna. Por eso se dejan flores y refugios para que se quede.',
  },
  {
    slug: 'abejorro',
    Comp: AbejorroRubber,
    nombre: 'Abejorro',
    cientifico: 'Bombus atratus',
    verbo: 'poliniza',
    color: '#c98a12',
    corto: 'Lleva el polen de flor en flor.',
    largo:
      'El abejorro andino poliniza por vibración: sacude la flor y suelta el polen que otras abejas no alcanzan (tomate, curuba, mora). Sin él, muchas flores no cuajan fruto. Cuida el nido en el suelo y las flores nativas del borde.',
  },
  {
    slug: 'lombriz',
    Comp: LombrizRubber,
    nombre: 'Lombriz',
    cientifico: 'Martiodrilus crassus',
    verbo: 'airea el suelo',
    color: '#8a5a3c',
    corto: 'Abre túneles y deja turrículos que oxigenan.',
    largo:
      'La lombriz come tierra y hojarasca y devuelve turrículos: humus fino, aireado y rico. Sus túneles dejan entrar aire y agua a la raíz. Un suelo con lombrices es un suelo vivo; el arado excesivo y los químicos las ahuyentan.',
  },
  {
    slug: 'escarabajo',
    Comp: EscarabajoRubber,
    nombre: 'Escarabajo estercolero',
    cientifico: 'Dichotomius belus',
    verbo: 'descompone',
    color: '#3d6b4a',
    corto: 'Entierra el desecho y lo vuelve tierra rica.',
    largo:
      'El escarabajo entierra estiércol y restos, los descompone y los devuelve como humus. De paso limpia la huerta de moscas y parásitos y siembra semillas sin querer. Donde trabaja, del desecho brota vida nueva.',
  },
  {
    slug: 'aves',
    Comp: AveMini,
    nombre: 'Aves',
    cientifico: 'controladoras',
    verbo: 'control aéreo',
    color: '#6b5236',
    corto: 'Cazan orugas y voladores desde el aire.',
    largo:
      'Toches, mirlas y atrapamoscas cazan orugas, larvas y adultos voladores que ninguna otra fauna alcanza. Un árbol, un percha o un seto les da dónde posarse a vigilar. Protegerlas es sumar un control que trabaja gratis todo el día.',
  },
];

/* Estilos de ESTA escena (chrome DOM sobre el Canvas). */
const CSS_ALIADOS = `
.alf-root { position: relative; width: 100%; height: 100dvh; min-height: 340px; overflow: hidden; background: ${ATMOSFERA.fondo}; }
.alf-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.alf-canvas--lista { opacity: 1; }
.alf-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.alf-cab { padding: 0.85rem 1rem 0; }
.alf-titulo { margin: 0; color: #4a3418; text-shadow: 0 1px 8px rgba(255,244,214,0.7); font: 700 1.18rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.alf-titulo small { display: block; font: 500 0.8rem/1.35 system-ui, sans-serif; opacity: 0.82; margin-top: 0.15rem; }
.alf-intro { margin: 0.5rem 0 0; max-width: 30rem; padding: 0.45rem 0.8rem; border-radius: 0.6rem; background: rgba(74,52,24,0.55); backdrop-filter: blur(3px); color: #fbf3e2; font: 500 0.78rem/1.45 system-ui, sans-serif; }
.alf-panel { pointer-events: none; align-self: center; max-width: 34rem; margin: 0 1rem; padding: 0.55rem 0.95rem; border-radius: 0.7rem; background: rgba(74,52,24,0.66); backdrop-filter: blur(3px); color: #fbf3e2; font: 500 0.82rem/1.5 system-ui, sans-serif; text-align: center; transition: opacity 0.25s ease; }
.alf-panel b { color: #ffe8b0; }
.alf-rail { pointer-events: auto; display: flex; gap: 0.5rem; padding: 0.6rem 0.8rem 0.9rem; overflow-x: auto; scrollbar-width: thin; -webkit-overflow-scrolling: touch; }
.alf-carta { flex: 0 0 auto; width: 8.4rem; display: flex; flex-direction: column; align-items: center; gap: 0.15rem; padding: 0.5rem 0.4rem 0.55rem; border: 1px solid rgba(74,52,24,0.3); border-radius: 0.8rem; background: rgba(255,247,228,0.84); color: #4a3418; cursor: pointer; backdrop-filter: blur(3px); transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease; }
.alf-carta:hover, .alf-carta:focus-visible { background: rgba(255,255,255,0.96); outline: none; transform: translateY(-2px); }
.alf-carta[aria-pressed='true'] { border-color: rgba(90,63,28,0.85); background: #fff6df; box-shadow: 0 6px 16px rgba(74,52,24,0.25); transform: translateY(-3px); }
.alf-carta svg { display: block; }
.alf-nombre { font: 700 0.82rem/1.1 system-ui, sans-serif; text-align: center; }
.alf-cinta { font: 600 0.68rem/1.1 system-ui, sans-serif; padding: 0.08rem 0.5rem; border-radius: 999px; color: #fff8ec; }
.alf-sci { font: 500 0.62rem/1.2 system-ui, sans-serif; font-style: italic; opacity: 0.7; text-align: center; }
@media (min-width: 720px) {
  .alf-rail { flex-wrap: wrap; justify-content: center; max-width: 46rem; margin: 0 auto; }
}
@media (prefers-reduced-motion: reduce) {
  .alf-canvas { transition: none; }
  .alf-carta { transition: none; }
}
`;

/**
 * AliadosFinca3D — la huerta con su fauna funcional trabajando, montable con su
 * propio <Canvas>. Sin lógica de negocio: es una vitrina didáctica de control
 * biológico (#/mockups/aliados-finca-3d). El tier y reduced-motion se detectan
 * aquí (mockup standalone), igual que sus pares.
 */
export default function AliadosFinca3D() {
  const [listo, setListo] = useState(false);
  const [foco, setFoco] = useState(null);
  const { tier, reducedMotion } = useMemo(() => decidirTier(), []);
  const perfil = perfilDeTier(tier);
  const activo = ALIADOS.find((a) => a.slug === foco) || null;
  /* Retrato (teléfono en vertical): la cámara a la altura de los ojos dejaba
     media pantalla de cielo vacío y la huerta —con sus bichos, que son el
     sujeto— apretada en una franjita abajo. En retrato la cámara sube y pica
     hacia el suelo (la receta del mundo tocable del suelo, la referencia de
     encuadre): la tierra llena el cuadro y el horizonte queda en el tercio
     de arriba. Se decide al montar: es un mockup, no rota en caliente. */
  const retrato = useMemo(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-aspect-ratio: 19/20)').matches,
    [],
  );

  return (
    <section
      className="alf-root"
      data-tier={tier}
      aria-label="Los aliados de la finca: la fauna benéfica trabajando en la huerta"
    >
      <style>{CSS_ALIADOS}</style>
      <Canvas
        className={`alf-canvas${listo ? ' alf-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={retrato ? { position: [0.4, 8.4, 10.6], fov: 50 } : { position: [0, 5.2, 12], fov: 44 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <EscenaAliados tier={tier} reducedMotion={reducedMotion} foco={foco} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={6}
          maxDistance={18}
          target={retrato ? [-0.6, 0.2, -1.0] : [0, 0.8, 0.4]}
          minPolarAngle={0.5}
          maxPolarAngle={1.42}
          minAzimuthAngle={-1.15}
          maxAzimuthAngle={1.15}
          enableDamping
          dampingFactor={0.08}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.12}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      <div className="alf-chrome">
        <div className="alf-cab">
          <h2 className="alf-titulo">
            Los aliados de la finca
            <small>La fauna benéfica que trabaja la huerta — control biológico, no venenos</small>
          </h2>
          <p className="alf-intro">
            Cada bicho hace un oficio. Juntos mantienen la huerta sana sin químicos: unos comen las
            plagas, otros polinizan, otros hacen la tierra. Toque un aliado para ver su trabajo.
          </p>
        </div>

        <div>
          <p className="alf-panel" role="status" style={{ opacity: activo ? 1 : 0 }}>
            {activo ? (
              <>
                <b>{activo.nombre}</b> {activo.largo}
              </>
            ) : (
              ' '
            )}
          </p>
          <div className="alf-rail" role="group" aria-label="Los aliados y sus oficios">
            {ALIADOS.map((aliado) => {
              const { slug, nombre, cientifico, verbo, color } = aliado;
              const Comp = aliado.Comp;
              const sel = foco === slug;
              return (
                <button
                  key={slug}
                  type="button"
                  className="alf-carta"
                  aria-pressed={sel}
                  aria-label={`${nombre}: ${verbo}`}
                  onClick={() => setFoco((v) => (v === slug ? null : slug))}
                >
                  <Comp size={76} mostrarRol={false} tier={tier === 'bajo' ? 'bajo' : 'alto'} className="" />
                  <span className="alf-nombre">{nombre}</span>
                  <span className="alf-cinta" style={{ background: color }}>
                    {verbo}
                  </span>
                  <span className="alf-sci">{cientifico}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
