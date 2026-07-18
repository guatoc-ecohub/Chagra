/*
 * MundoBoticaCana3D — la BOTICA CAMPESINA y el TRAPICHE PANELERO en un solo
 * rincón 3D de la finca (ruta #/mockups/mundo-botica-cana-3d).
 *
 * Dos saberes hermanos de la ladera media contados en un diorama:
 *
 *   - LA BOTICA: los canteros de plantas medicinales y aromáticas que nunca
 *     faltan junto a la cocina campesina — ruda, caléndula, hierbabuena,
 *     sábila, limoncillo, ortiga y manzanilla. Cada mata low-poly con su forma
 *     característica (la roseta carnosa de la sábila, la flor naranja de la
 *     caléndula, la fuente de hojas del limoncillo) y su copia didáctica de
 *     saber campesino de acompañamiento — sin promesas de curar.
 *
 *   - LA CAÑA Y LA PANELA: el cañal alto en la falda caliente, el TRAPICHE de
 *     rodillos de madera movido por el buey que da vueltas a la palanca, el
 *     canal del guarapo, la HORNILLA con la paila humeando hasta punto de miel
 *     y la mesa con las GAVERAS donde cuaja la panela. El proceso legible de
 *     una mirada: caña → molino → jugo → paila → panela (botón «paso a paso»
 *     con etiquetas sobre la escena).
 *
 * DIRECCIÓN DE ARTE (todo dentro del framework, nada inventado por fuera):
 *   - Atmósfera del MEDIODÍA claro del kit (`CIELOS_HORA.mediodia`): la
 *     molienda es faena de día y las matas de la botica piden luz pareja.
 *   - Materiales de `PALETA`/`mezclar` (atmosferaMadre): Lambert flatShading,
 *     cero texturas, cero CDN. La ley de coherencia del valle.
 *   - La fauna es la MISMA librería rubber-hose (`Bicho` de FaunaEscena):
 *     colibrí y mariposa polinizando la botica, escarabajo en la tierra.
 *   - Polen del kit (`ParticulasAmbientales`) sobre los canteros.
 *
 * RENDIMIENTO: cañal instanciado (2 draw calls para todo el cañaduzal),
 * Lambert sin shadow-map, presupuestos por `perfilDeTier`; `reducedMotion`
 * congela buey/humo/burbujas y pasa el frameloop a demanda. Gama baja no
 * llega aquí (la vitrina 2D del framework la cubre).
 *
 * Ruta mockup: #/mockups/mundo-botica-cana-3d (cableada en App.jsx, sin auth).
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

/* El mediodía claro del kit: única fuente de la atmósfera de esta escena. */
const DIA = CIELOS_HORA.mediodia;

/* La paleta del framework entintada apenas hacia la luz del mediodía. */
const TINTE = DIA.niebla;
const P = {
  pasto: mezclar('#7ca24f', TINTE, 0.22), // la falda verde de la ladera
  pastoSeco: mezclar('#a8a45c', TINTE, 0.24), // motas pajizas al sol
  tierraCantero: mezclar('#4c3a26', TINTE, 0.18), // tierra negra abonada de la botica
  patio: mezclar('#b09468', TINTE, 0.25), // tierra apisonada del patio del trapiche
  maderaVieja: mezclar('#7a5a38', TINTE, 0.2), // postes y tablas curtidas
  maderaClara: mezclar('#a5804e', TINTE, 0.22), // rodillos y palanca
  paja: mezclar('#c9a860', TINTE, 0.22), // el techo de la enramada
  cana: mezclar('#d4c765', TINTE, 0.12), // el tallo amarillo de la caña madura
  canaVerde: mezclar('#93b84f', TINTE, 0.16), // el cogollo del cañal
  adobe: mezclar('#9a5a38', TINTE, 0.22), // la hornilla de barro y ladrillo
  cobre: mezclar('#b06a3a', TINTE, 0.15), // la paila
  guarapo: mezclar('#c78a2e', TINTE, 0.1), // el jugo dorado hirviendo
  panela: mezclar('#a5622d', TINTE, 0.1), // el bloque cuajado
  buey: mezclar('#8a7050', TINTE, 0.14), // el buey barcino pardo
  piedra: mezclar(PALETA.piedra, TINTE, 0.3),
  // las matas de la botica, cada una con su verde propio
  sabila: mezclar('#7fa47a', TINTE, 0.2), // verde grisáceo carnoso
  ruda: mezclar('#7d9c86', TINTE, 0.22), // glauco azuloso
  hierbabuena: mezclar('#4f9b3f', TINTE, 0.18), // verde vivo
  limoncillo: mezclar('#a9b86a', TINTE, 0.2), // verde amarillento de hoja larga
  ortiga: mezclar('#3f6d35', TINTE, 0.2), // verde oscuro
  calendulaFlor: mezclar('#e8862e', TINTE, 0.08), // la flor naranja
  manzanillaFlor: mezclar('#f5efdd', TINTE, 0.05),
  tallo: mezclar('#5d7a3c', TINTE, 0.22),
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

/* La geografía: una falda amable con lomas al fondo y DOS explanadas de faena —
   la botica a la izquierda, el patio del trapiche a la derecha. */
const ANCHO = 36;
const FONDO = 30;
/* Peso de "explanada": 1 donde la faena aplana el piso, 0 en la loma. */
function explanada(wx, wz) {
  return Math.max(
    gauss(wx, wz, -6, 3.8, 4.6, 3.4), // la botica
    gauss(wx, wz, 5.5, 2.2, 4.6, 3.6), // el patio del trapiche
    gauss(wx, wz, 1.5, 5.4, 2.8, 2.2), // la mesa de las gaveras
  );
}
function alturaFinca(wx, wz) {
  let h = 0.55 + ruido(wx * 0.5, wz * 0.5) * 0.22;
  h += gauss(wx, wz, -13, -11, 6.0, 4.2) * 2.2; // loma occidental
  h += gauss(wx, wz, 12, -12, 7.0, 4.6) * 2.6; // loma oriental
  h += gauss(wx, wz, 0, -14, 9.0, 3.6) * 1.8; // el fondo que cierra
  // la faena aplana: las explanadas caen al nivel del patio
  const f = clamp(explanada(wx, wz) * 1.2, 0, 1);
  return h * (1 - f) + 0.55 * f;
}
const Y_PATIO = 0.55;

/* Malla del terreno con colores por vértice: pasto con motas al sol, tierra
   negra abonada bajo la botica, tierra apisonada clara en el patio. */
function construirTerreno(seg, plano) {
  const nx = seg + 1, nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cPasto = new THREE.Color(P.pasto);
  const cSeco = new THREE.Color(P.pastoSeco);
  const cCantero = new THREE.Color(P.tierraCantero);
  const cPatio = new THREE.Color(P.patio);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaFinca(wx, wz);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      // base: pasto con motas secas donde pega el sol
      c.lerpColors(cPasto, cSeco, smoothstep(-0.35, 1.0, ruido(wx + 3, wz - 2)));
      // tierra negra de la botica y tierra clara del patio panelero
      c.lerp(cCantero, clamp(gauss(wx, wz, -6, 3.8, 3.6, 2.6) * 0.9, 0, 0.8));
      c.lerp(cPatio, clamp(gauss(wx, wz, 4.6, 3.2, 4.2, 3.2) * 1.0, 0, 0.9));
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

/* Etiqueta didáctica sobre la escena (solo en modo «paso a paso»). */
function Etiqueta({ pos, texto, paso }) {
  return (
    <group position={pos}>
      <Html center distanceFactor={9} zIndexRange={[30, 0]}>
        <div className="bocana-chip" aria-hidden="true">
          {paso != null && <b>{paso}</b>}
          {texto}
        </div>
      </Html>
    </group>
  );
}

/* ══════════════════════ LA BOTICA CAMPESINA ══════════════════════ */

/* Cantero: cama de siembra con tablas de madera y tierra negra encima. Las
   matas van de hijos, en coordenadas locales (y=0.28 es el lomo de tierra). */
function Cantero({ pos, rot = 0, w = 2.6, d = 1.4, children }) {
  const t = 0.09; // grosor de tabla
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* tablas del marco */}
      <mesh position={[0, 0.13, d / 2]}>
        <boxGeometry args={[w, 0.26, t]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      <mesh position={[0, 0.13, -d / 2]}>
        <boxGeometry args={[w, 0.26, t]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      <mesh position={[w / 2, 0.13, 0]}>
        <boxGeometry args={[t, 0.26, d]} />
        <meshLambertMaterial color={mezclar(P.maderaVieja, TINTE, 0.12)} flatShading />
      </mesh>
      <mesh position={[-w / 2, 0.13, 0]}>
        <boxGeometry args={[t, 0.26, d]} />
        <meshLambertMaterial color={mezclar(P.maderaVieja, TINTE, 0.12)} flatShading />
      </mesh>
      {/* la tierra negra abonada */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[w - 0.16, 0.14, d - 0.16]} />
        <meshLambertMaterial color={P.tierraCantero} flatShading />
      </mesh>
      {/* las matas, un pelín agrandadas para que se LEAN desde la cámara */}
      <group position={[0, 0.29, 0]} scale={[1.15, 1.4, 1.15]}>{children}</group>
    </group>
  );
}

/* Sábila (aloe): roseta de hojas gruesas y carnosas que suben en punta —
   la silueta más reconocible de la botica. */
function Sabila({ pos, esc = 1, semilla = 1 }) {
  const hojas = useMemo(() => {
    const rng = crearRng(40 + semilla);
    return Array.from({ length: 9 }, (_, i) => ({
      ang: (i / 9) * Math.PI * 2 + rng() * 0.4,
      inc: 0.42 + rng() * 0.3, // inclinación hacia afuera
      largo: 0.42 + rng() * 0.2,
    }));
  }, [semilla]);
  return (
    <group position={pos} scale={esc}>
      {hojas.map((h, i) => (
        <mesh
          key={i}
          position={[Math.cos(h.ang) * 0.07, 0.05, Math.sin(h.ang) * 0.07]}
          rotation={[h.inc, -h.ang, 0]}
          scale={[1, 1, 0.45]}
        >
          <coneGeometry args={[0.085, h.largo, 4]} />
          <meshLambertMaterial color={P.sabila} flatShading />
        </mesh>
      ))}
      {/* el cogollo apretado del centro */}
      <mesh position={[0, 0.12, 0]} scale={[1, 1.4, 0.45]}>
        <coneGeometry args={[0.06, 0.26, 4]} />
        <meshLambertMaterial color={mezclar(P.sabila, '#5c8a58', 0.4)} flatShading />
      </mesh>
    </group>
  );
}

/* Ruda: matica redonda de verde glauco azuloso con florecitas amarillas. */
function Ruda({ pos, esc = 1 }) {
  const motas = [
    [0, 0.16, 0, 0.2],
    [0.14, 0.12, 0.06, 0.14],
    [-0.13, 0.11, 0.05, 0.13],
    [0.02, 0.13, -0.13, 0.13],
    [-0.03, 0.26, 0.02, 0.12],
  ];
  return (
    <group position={pos} scale={esc}>
      {motas.map((m, i) => (
        <mesh key={i} position={[m[0], m[1], m[2]]}>
          <sphereGeometry args={[m[3], 7, 5]} />
          <meshLambertMaterial color={mezclar(P.ruda, TINTE, (i % 3) * 0.06)} flatShading />
        </mesh>
      ))}
      {/* sus flores amarillas menudas */}
      {[[0.06, 0.36, 0.03], [-0.09, 0.32, -0.04], [0.01, 0.34, -0.1]].map((f, i) => (
        <mesh key={`f${i}`} position={f}>
          <sphereGeometry args={[0.03, 5, 4]} />
          <meshLambertMaterial color="#d9c94a" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Caléndula: tallos verdes coronados por la flor naranja de pétalos anchos. */
function Calendula({ pos, esc = 1, semilla = 1 }) {
  const flores = useMemo(() => {
    const rng = crearRng(70 + semilla);
    return Array.from({ length: 3 }, () => ({
      x: (rng() - 0.5) * 0.3,
      z: (rng() - 0.5) * 0.3,
      h: 0.3 + rng() * 0.14,
      lad: (rng() - 0.5) * 0.3,
    }));
  }, [semilla]);
  return (
    <group position={pos} scale={esc}>
      {/* el follaje bajo */}
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.17, 7, 5]} />
        <meshLambertMaterial color={P.tallo} flatShading />
      </mesh>
      {flores.map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]} rotation={[f.lad, 0, f.lad * 0.6]}>
          <mesh position={[0, f.h / 2, 0]}>
            <cylinderGeometry args={[0.014, 0.02, f.h, 5]} />
            <meshLambertMaterial color={P.tallo} flatShading />
          </mesh>
          {/* la flor: disco naranja de pétalos + botón del centro */}
          <mesh position={[0, f.h + 0.02, 0]}>
            <cylinderGeometry args={[0.09, 0.05, 0.035, 9]} />
            <meshLambertMaterial color={P.calendulaFlor} flatShading />
          </mesh>
          <mesh position={[0, f.h + 0.05, 0]}>
            <sphereGeometry args={[0.032, 6, 5]} />
            <meshLambertMaterial color={mezclar(P.calendulaFlor, '#7a4a1a', 0.55)} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Hierbabuena: mancha baja de verde vivo, hojitas redondas a ras de tierra. */
function Hierbabuena({ pos, esc = 1, semilla = 1 }) {
  const matas = useMemo(() => {
    const rng = crearRng(90 + semilla);
    return Array.from({ length: 8 }, () => ({
      x: (rng() - 0.5) * 0.5,
      z: (rng() - 0.5) * 0.4,
      r: 0.07 + rng() * 0.05,
      claro: rng(),
    }));
  }, [semilla]);
  return (
    <group position={pos} scale={esc}>
      {matas.map((m, i) => (
        <mesh key={i} position={[m.x, m.r * 0.7, m.z]} scale={[1, 0.8, 1]}>
          <sphereGeometry args={[m.r, 6, 5]} />
          <meshLambertMaterial
            color={mezclar(P.hierbabuena, '#7cc35a', m.claro * 0.5)}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

/* Limoncillo (limonaria): fuente de hojas largas que se arquean hacia afuera. */
function Limoncillo({ pos, esc = 1, semilla = 1 }) {
  const hojas = useMemo(() => {
    const rng = crearRng(110 + semilla);
    return Array.from({ length: 12 }, (_, i) => ({
      ang: (i / 12) * Math.PI * 2 + rng() * 0.4,
      inc: 0.55 + rng() * 0.45, // bien arqueadas
      largo: 0.5 + rng() * 0.28,
    }));
  }, [semilla]);
  return (
    <group position={pos} scale={esc}>
      {hojas.map((h, i) => (
        <mesh
          key={i}
          position={[Math.cos(h.ang) * 0.05, 0.08, Math.sin(h.ang) * 0.05]}
          rotation={[h.inc, -h.ang, 0]}
          scale={[0.5, 1, 1]}
        >
          <coneGeometry args={[0.035, h.largo, 4]} />
          <meshLambertMaterial
            color={mezclar(P.limoncillo, TINTE, (i % 3) * 0.08)}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

/* Ortiga: tallos erguidos de hoja aserrada verde oscuro. Se mira, no se toca. */
function Ortiga({ pos, esc = 1 }) {
  const tallos = [
    [0, 0, 0, 0.42],
    [0.12, 0, 0.08, 0.34],
    [-0.11, 0, -0.05, 0.3],
  ];
  return (
    <group position={pos} scale={esc}>
      {tallos.map((t, i) => (
        <group key={i} position={[t[0], 0, t[2]]}>
          <mesh position={[0, t[3] / 2, 0]}>
            <cylinderGeometry args={[0.013, 0.02, t[3], 5]} />
            <meshLambertMaterial color={mezclar(P.ortiga, TINTE, 0.15)} flatShading />
          </mesh>
          {/* pares de hojas en punta */}
          {[0.4, 0.65, 0.9].map((f, j) => (
            <group key={j} position={[0, t[3] * f, 0]} rotation={[0, j * 1.1, 0]}>
              <mesh position={[0.08, 0, 0]} rotation={[0, 0, -1.25]}>
                <coneGeometry args={[0.035, 0.14, 4]} />
                <meshLambertMaterial color={P.ortiga} flatShading />
              </mesh>
              <mesh position={[-0.08, 0, 0]} rotation={[0, 0, 1.25]}>
                <coneGeometry args={[0.035, 0.14, 4]} />
                <meshLambertMaterial color={P.ortiga} flatShading />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

/* Manzanilla: varitas finas con la florecita blanca de botón amarillo. */
function Manzanilla({ pos, esc = 1, semilla = 1 }) {
  const flores = useMemo(() => {
    const rng = crearRng(130 + semilla);
    return Array.from({ length: 6 }, () => ({
      x: (rng() - 0.5) * 0.34,
      z: (rng() - 0.5) * 0.3,
      h: 0.2 + rng() * 0.16,
      lad: (rng() - 0.5) * 0.5,
    }));
  }, [semilla]);
  return (
    <group position={pos} scale={esc}>
      <mesh position={[0, 0.05, 0]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.14, 6, 5]} />
        <meshLambertMaterial color={mezclar(P.tallo, '#7fa348', 0.4)} flatShading />
      </mesh>
      {flores.map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]} rotation={[f.lad * 0.4, 0, f.lad]}>
          <mesh position={[0, f.h / 2, 0]}>
            <cylinderGeometry args={[0.008, 0.012, f.h, 4]} />
            <meshLambertMaterial color={P.tallo} flatShading />
          </mesh>
          <mesh position={[0, f.h + 0.012, 0]}>
            <cylinderGeometry args={[0.045, 0.02, 0.02, 8]} />
            <meshLambertMaterial color={P.manzanillaFlor} flatShading />
          </mesh>
          <mesh position={[0, f.h + 0.03, 0]}>
            <sphereGeometry args={[0.022, 6, 4]} />
            <meshLambertMaterial color="#e2b93b" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* La botica completa: tres canteros con las siete matas, cada una en su sitio. */
function Botica({ etiquetas }) {
  return (
    <group>
      {/* cantero de las aromáticas de tomar */}
      <Cantero pos={[-7.5, Y_PATIO, 2.4]} rot={0.14}>
        <Hierbabuena pos={[-0.85, 0, 0.1]} semilla={3} />
        <Hierbabuena pos={[-0.35, 0, -0.25]} esc={0.85} semilla={7} />
        <Manzanilla pos={[0.25, 0, 0.15]} semilla={2} />
        <Manzanilla pos={[0.6, 0, -0.25]} esc={0.85} semilla={5} />
        <Limoncillo pos={[1.0, 0, 0.12]} semilla={4} />
      </Cantero>
      {/* cantero de las matas de respeto */}
      <Cantero pos={[-4.5, Y_PATIO, 4.6]} rot={-0.1}>
        <Ruda pos={[-0.9, 0, 0]} />
        <Calendula pos={[-0.15, 0, 0.15]} semilla={1} />
        <Calendula pos={[0.35, 0, -0.28]} esc={0.85} semilla={6} />
        <Ortiga pos={[0.95, 0, 0.05]} />
      </Cantero>
      {/* el cantero de la sábila, aparte y soleado */}
      <Cantero pos={[-7.0, Y_PATIO, 5.9]} rot={0.32} w={2.1} d={1.2}>
        <Sabila pos={[-0.6, 0, 0]} semilla={1} />
        <Sabila pos={[0.05, 0, 0.12]} esc={0.85} semilla={5} />
        <Sabila pos={[0.65, 0, -0.12]} esc={1.1} semilla={9} />
      </Cantero>

      {etiquetas && (
        <>
          <Etiqueta pos={[-8.35, Y_PATIO + 1.1, 2.5]} texto="Hierbabuena" />
          <Etiqueta pos={[-7.2, Y_PATIO + 1.45, 2.7]} texto="Manzanilla" />
          <Etiqueta pos={[-6.4, Y_PATIO + 1.1, 2.3]} texto="Limoncillo" />
          <Etiqueta pos={[-5.4, Y_PATIO + 1.35, 4.7]} texto="Ruda" />
          <Etiqueta pos={[-4.5, Y_PATIO + 1.05, 4.5]} texto="Caléndula" />
          <Etiqueta pos={[-3.5, Y_PATIO + 1.4, 4.7]} texto="Ortiga" />
          <Etiqueta pos={[-7.0, Y_PATIO + 1.1, 6.0]} texto="Sábila" />
        </>
      )}
    </group>
  );
}

/* ══════════════════════ LA CAÑA Y LA PANELA ══════════════════════ */

/* El cañal instanciado: tallos + cogollos = 2 draw calls para todo el
   cañaduzal. Sembrado determinista en la falda caliente, detrás del patio. */
function Canal({ n }) {
  const tallos = useRef(null);
  const cogollos = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(217);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 10) {
      intentos += 1;
      const wx = 6.5 + rng() * 8.0;
      const wz = -8.5 + rng() * 6.0;
      const y = alturaFinca(wx, wz);
      if (y > 1.5) continue; // el cañal es de la falda baja, no de la loma
      if (gauss(wx, wz, 5.5, 2.2, 3.4, 2.6) > 0.45) continue; // no invade el patio
      lista.push({
        wx, wz, y,
        esc: 0.8 + rng() * 0.5,
        giro: rng() * Math.PI * 2,
        ladeo: (rng() - 0.5) * 0.16,
      });
    }
    return lista;
  }, [n]);

  useEffect(() => {
    const mt = tallos.current, mc = cogollos.current;
    if (!mt || !mc) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const baseTallo = new THREE.Color(P.cana);
    const baseVerde = new THREE.Color(P.canaVerde);
    sitios.forEach((s, i) => {
      // el tallo alto de la caña
      dummy.position.set(s.wx, s.y + 1.15 * s.esc, s.wz);
      dummy.rotation.set(s.ladeo, s.giro, s.ladeo * 0.7);
      dummy.scale.set(s.esc, s.esc, s.esc);
      dummy.updateMatrix();
      mt.setMatrixAt(i, dummy.matrix);
      tinte.copy(baseTallo).offsetHSL(0, 0, (i % 5) * 0.014 - 0.028);
      mt.setColorAt(i, tinte);
      // el cogollo de hojas arriba: cono INVERTIDO = fuente de hojas abiertas
      dummy.position.set(s.wx, s.y + 2.5 * s.esc, s.wz);
      dummy.rotation.set(Math.PI + s.ladeo, s.giro, s.ladeo * 0.7);
      dummy.scale.set(s.esc, s.esc * 0.9, s.esc);
      dummy.updateMatrix();
      mc.setMatrixAt(i, dummy.matrix);
      tinte.copy(baseVerde).offsetHSL(0, 0, (i % 4) * 0.016 - 0.024);
      mc.setColorAt(i, tinte);
    });
    mt.instanceMatrix.needsUpdate = true;
    mc.instanceMatrix.needsUpdate = true;
    if (mt.instanceColor) mt.instanceColor.needsUpdate = true;
    if (mc.instanceColor) mc.instanceColor.needsUpdate = true;
  }, [sitios]);

  return (
    <group>
      <instancedMesh ref={tallos} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.055, 0.075, 2.3, 6]} />
        <meshLambertMaterial flatShading />
      </instancedMesh>
      {/* el penacho: cono facetado invertido (fuente) que lee como hojas abiertas */}
      <instancedMesh ref={cogollos} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
        <coneGeometry args={[0.38, 1.25, 6, 1, true]} />
        <meshLambertMaterial flatShading side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

/* El buey barcino: cuerpo, cabeza con cachos, patas y rabo. Low-poly noble. */
function Buey() {
  return (
    <group>
      {/* cuerpo */}
      <mesh position={[0, 0.62, 0]} scale={[1.35, 0.78, 0.62]}>
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshLambertMaterial color={P.buey} flatShading />
      </mesh>
      {/* giba suave del criollo */}
      <mesh position={[0.36, 0.98, 0]} scale={[0.5, 0.4, 0.42]}>
        <sphereGeometry args={[0.4, 7, 5]} />
        <meshLambertMaterial color={mezclar(P.buey, '#8a7355', 0.3)} flatShading />
      </mesh>
      {/* cabeza y hocico */}
      <group position={[0.78, 0.72, 0]}>
        <mesh scale={[0.9, 0.8, 0.7]}>
          <sphereGeometry args={[0.24, 7, 6]} />
          <meshLambertMaterial color={mezclar(P.buey, TINTE, 0.12)} flatShading />
        </mesh>
        <mesh position={[0.18, -0.08, 0]} scale={[0.7, 0.5, 0.55]}>
          <sphereGeometry args={[0.18, 6, 5]} />
          <meshLambertMaterial color={mezclar(P.buey, '#8a7355', 0.35)} flatShading />
        </mesh>
        {/* los cachos */}
        <mesh position={[0.02, 0.2, 0.14]} rotation={[0.5, 0, -0.5]}>
          <coneGeometry args={[0.035, 0.24, 5]} />
          <meshLambertMaterial color="#e8ddc4" flatShading />
        </mesh>
        <mesh position={[0.02, 0.2, -0.14]} rotation={[-0.5, 0, -0.5]}>
          <coneGeometry args={[0.035, 0.24, 5]} />
          <meshLambertMaterial color="#e8ddc4" flatShading />
        </mesh>
        {/* orejas */}
        <mesh position={[-0.05, 0.1, 0.2]} rotation={[1.1, 0, 0]} scale={[1, 0.5, 1]}>
          <coneGeometry args={[0.05, 0.14, 4]} />
          <meshLambertMaterial color={P.buey} flatShading />
        </mesh>
        <mesh position={[-0.05, 0.1, -0.2]} rotation={[-1.1, 0, 0]} scale={[1, 0.5, 1]}>
          <coneGeometry args={[0.05, 0.14, 4]} />
          <meshLambertMaterial color={P.buey} flatShading />
        </mesh>
      </group>
      {/* patas */}
      {[
        [0.42, 0.34], [0.42, -0.24], [-0.42, 0.3], [-0.42, -0.26],
      ].map((p2, i) => (
        <mesh key={i} position={[p2[0], 0.22, p2[1] * 0.62]}>
          <cylinderGeometry args={[0.055, 0.07, 0.46, 5]} />
          <meshLambertMaterial color={mezclar(P.buey, '#6a5a44', 0.4)} flatShading />
        </mesh>
      ))}
      {/* rabo */}
      <mesh position={[-0.68, 0.62, 0]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.02, 0.035, 0.5, 4]} />
        <meshLambertMaterial color={mezclar(P.buey, '#6a5a44', 0.5)} flatShading />
      </mesh>
    </group>
  );
}

/* El trapiche: la enramada de paja, el molino de rodillos de madera y la
   palanca que el buey empuja dando la vuelta. reduced-motion: quieto. */
const TRAPICHE_POS = [6.2, Y_PATIO, 1.2];
function Trapiche({ reducedMotion }) {
  const vuelta = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !vuelta.current) return;
    // el paso manso del buey (arranca del lado visible, hacia la cámara)
    vuelta.current.rotation.y = 2.3 + clock.elapsedTime * 0.22;
  });
  return (
    <group position={TRAPICHE_POS}>
      {/* la enramada: cuatro horcones altos y techo de paja a un agua,
          suficientemente arriba para que el molino se LEA debajo */}
      {[
        [-1.35, -1.15], [1.35, -1.15], [-1.35, 1.15], [1.35, 1.15],
      ].map((h, i) => (
        <mesh key={i} position={[h[0], 1.4, h[1]]}>
          <cylinderGeometry args={[0.07, 0.09, 2.8, 5]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 2.86, 0]} rotation={[0, 0, 0.14]}>
        <boxGeometry args={[3.4, 0.12, 2.9]} />
        <meshLambertMaterial color={P.paja} flatShading />
      </mesh>
      <mesh position={[0, 3.0, 0]} rotation={[0, 0, 0.14]}>
        <boxGeometry args={[2.9, 0.1, 2.4]} />
        <meshLambertMaterial color={mezclar(P.paja, '#a8873e', 0.4)} flatShading />
      </mesh>

      {/* la mesa del molino */}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.5, 0.84, 1.2]} />
        <meshLambertMaterial color={mezclar(P.maderaVieja, '#5c4228', 0.35)} flatShading />
      </mesh>
      {/* los TRES rodillos verticales de madera (la mazamorrera al centro) */}
      {[-0.38, 0, 0.38].map((x, i) => (
        <mesh key={i} position={[x, 1.14, 0]}>
          <cylinderGeometry args={[i === 1 ? 0.19 : 0.16, i === 1 ? 0.19 : 0.16, 0.6, 9]} />
          <meshLambertMaterial
            color={mezclar(P.maderaClara, TINTE, i * 0.08)}
            flatShading
          />
        </mesh>
      ))}
      {/* el marco que sujeta los rodillos */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[1.35, 0.14, 0.5]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>

      {/* el eje que sube del rodillo mayor a la palanca */}
      <mesh position={[0, 1.78, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.5, 7]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>

      {/* LA VUELTA: palanca + buey giran juntos alrededor del eje */}
      {/* pose base = la del buey visible al frente (también en reduced-motion) */}
      <group ref={vuelta} position={[0, 0, 0]} rotation={[0, 4.7, 0]}>
        {/* la palanca, del eje hacia afuera y bajando al pecho del buey */}
        <mesh position={[1.45, 1.6, 0]} rotation={[0, 0, 0.26]}>
          <boxGeometry args={[3.1, 0.13, 0.13]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        <mesh position={[2.8, 1.05, 0]} rotation={[0, 0, 1.2]}>
          <boxGeometry args={[0.9, 0.1, 0.1]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        {/* el buey, enyugado al extremo, andando su círculo */}
        <group position={[2.9, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={1.2}>
          <Buey />
          {/* el yugo sobre la nuca */}
          <mesh position={[0.62, 0.98, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.7, 6]} />
            <meshLambertMaterial color={P.maderaVieja} flatShading />
          </mesh>
        </group>
      </group>

      {/* el atado de caña cortada arrimado al molino */}
      <group position={[-0.95, 0, 0.75]} rotation={[0, 0.5, 0]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[i * 0.09 - 0.18, 0.55, (i % 2) * 0.06]}
            rotation={[0.28, 0, 0.5 + i * 0.06]}
          >
            <cylinderGeometry args={[0.045, 0.055, 1.5, 5]} />
            <meshLambertMaterial color={mezclar(P.cana, TINTE, (i % 3) * 0.08)} flatShading />
          </mesh>
        ))}
      </group>
      {/* el bagazo ya exprimido, del otro lado */}
      <mesh position={[0.95, 0.16, 0.7]} scale={[1, 0.45, 0.8]}>
        <sphereGeometry args={[0.4, 6, 5]} />
        <meshLambertMaterial color={mezclar(P.paja, '#b8a67a', 0.5)} flatShading />
      </mesh>
    </group>
  );
}

/* El canal del guarapo: canoa de madera inclinada del molino a la paila,
   con la cinta de jugo dorado corriendo adentro. */
function CanalGuarapo() {
  // del trapiche (6.2, 1.2) hacia la hornilla (3.4, 4.2): largo ~3.9
  return (
    <group position={[4.8, Y_PATIO + 0.55, 2.7]} rotation={[0, 0.82, -0.13]}>
      <mesh>
        <boxGeometry args={[4.0, 0.12, 0.3]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      <mesh position={[0, 0.09, 0.12]}>
        <boxGeometry args={[4.0, 0.14, 0.06]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      <mesh position={[0, 0.09, -0.12]}>
        <boxGeometry args={[4.0, 0.14, 0.06]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      {/* la cinta de jugo */}
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[3.9, 0.03, 0.16]} />
        <meshLambertMaterial color={P.guarapo} flatShading />
      </mesh>
      {/* dos horquetas que lo sostienen */}
      <mesh position={[-1.3, -0.32, 0]}>
        <cylinderGeometry args={[0.045, 0.06, 0.6, 5]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      <mesh position={[1.3, -0.32, 0]}>
        <cylinderGeometry args={[0.045, 0.06, 0.6, 5]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
    </group>
  );
}

/* La hornilla con la paila: el fogón de barro, la paila de cobre con el jugo
   hirviendo (burbujas que suben), la leña, el humo de la chimenea. */
const HORNILLA_POS = [3.2, Y_PATIO, 4.3];
function Hornilla({ reducedMotion, tier }) {
  const fuego = useRef(null);
  const burbujas = useRef(null);
  const humos = useRef(null);
  const puffs = useMemo(() => {
    const rng = crearRng(310);
    return Array.from({ length: 4 }, (_, i) => ({
      fase: i * 0.8 + rng() * 0.5,
      dx: (rng() - 0.5) * 0.3,
    }));
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // la llama de la boca del fogón titila
    if (fuego.current && !reducedMotion) {
      const s = 0.85 + Math.sin(t * 9.2) * 0.1 + Math.sin(t * 5.1 + 1) * 0.08;
      fuego.current.scale.set(s, s * (1 + Math.sin(t * 7.3) * 0.14), 1);
    }
    // las burbujas del jugo suben y revientan (loop)
    if (burbujas.current && !reducedMotion) {
      burbujas.current.children.forEach((b, i) => {
        const f = (t * 0.7 + i * 0.23) % 1;
        b.position.y = 0.02 + f * 0.1;
        b.scale.setScalar(0.5 + f * 0.8);
      });
    }
    // el humo: cada bocanada sube, deriva y se disuelve
    if (humos.current && !reducedMotion) {
      humos.current.children.forEach((h, i) => {
        const p = puffs[i];
        const f = ((t * 0.32 + p.fase) % 1.6) / 1.6;
        h.position.y = 1.65 + f * 2.2;
        h.position.x = p.dx + Math.sin(t * 0.6 + p.fase) * 0.18 + f * 0.5;
        h.scale.setScalar(0.32 + f * 0.85);
        h.material.opacity = 0.38 * (1 - f);
      });
    }
  });

  return (
    <group position={HORNILLA_POS} rotation={[0, -0.35, 0]}>
      {/* el cuerpo de barro y ladrillo de la hornilla */}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.7, 0.84, 1.25]} />
        <meshLambertMaterial color={P.adobe} flatShading />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[1.85, 0.14, 1.4]} />
        <meshLambertMaterial color={mezclar(P.adobe, '#6a3a22', 0.4)} flatShading />
      </mesh>
      {/* la boca del fogón, con su llama */}
      <mesh position={[0, 0.3, 0.64]}>
        <boxGeometry args={[0.6, 0.44, 0.06]} />
        <meshLambertMaterial color="#2a1a10" flatShading />
      </mesh>
      <mesh ref={fuego} position={[0, 0.3, 0.68]}>
        <circleGeometry args={[0.2, 7]} />
        <meshBasicMaterial color="#ff9a3a" transparent opacity={0.95} side={THREE.DoubleSide} />
      </mesh>
      {tier === 'alto' && (
        <pointLight position={[0, 0.4, 0.9]} color="#ff9a4a" intensity={0.8} distance={3.5} />
      )}
      {/* la leña arrimada */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[-0.15 + i * 0.16, 0.08, 0.85 + (i % 2) * 0.1]}
          rotation={[0, i * 0.5, Math.PI / 2 - 0.2]}
        >
          <cylinderGeometry args={[0.05, 0.06, 0.7, 5]} />
          <meshLambertMaterial color={mezclar(P.maderaVieja, '#4a3420', 0.5)} flatShading />
        </mesh>
      ))}
      {/* LA PAILA de cobre asentada en la hornilla */}
      <mesh position={[0, 0.96, 0]}>
        <cylinderGeometry args={[0.62, 0.4, 0.34, 12]} />
        <meshLambertMaterial color={P.cobre} flatShading />
      </mesh>
      {/* el jugo dorado hirviendo */}
      <mesh position={[0, 1.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 12]} />
        <meshLambertMaterial color={P.guarapo} />
      </mesh>
      {/* burbujas del hervor */}
      <group ref={burbujas} position={[0, 1.1, 0]}>
        {[
          [0.2, 0.1], [-0.24, -0.08], [0.02, 0.26], [-0.1, 0.3], [0.3, -0.2], [-0.32, 0.16],
        ].map((b, i) => (
          <mesh key={i} position={[b[0], 0.04, b[1]]}>
            <sphereGeometry args={[0.035, 5, 4]} />
            <meshLambertMaterial color={mezclar(P.guarapo, '#e8c26a', 0.6)} flatShading />
          </mesh>
        ))}
      </group>
      {/* el mecedor (la pala larga de remover) apoyado en la paila */}
      <mesh position={[0.5, 1.25, 0.2]} rotation={[0.2, 0, -0.8]}>
        <cylinderGeometry args={[0.022, 0.028, 1.3, 5]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
      {/* la chimenea y su humo */}
      <mesh position={[-0.6, 1.25, -0.4]}>
        <boxGeometry args={[0.36, 0.85, 0.36]} />
        <meshLambertMaterial color={mezclar(P.adobe, '#6a3a22', 0.3)} flatShading />
      </mesh>
      <group ref={humos} position={[-0.6, 0, -0.4]}>
        {puffs.map((p, i) => (
          <mesh key={i} position={[p.dx, 1.8 + i * 0.5, 0]}>
            <sphereGeometry args={[0.3, 6, 5]} />
            <meshBasicMaterial color="#d8d2c4" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {/* el vaho del hervor sobre la paila */}
      {!reducedMotion && (
        <mesh position={[0.1, 1.55, 0.05]} scale={[0.5, 0.9, 0.5]}>
          <sphereGeometry args={[0.3, 6, 5]} />
          <meshBasicMaterial color="#f2ecda" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/* La mesa de moldeo: las gaveras (los moldes de madera con sus casillas) y las
   panelas ya cuajadas, unas en el molde y otras apiladas para el mercado. */
function MesaGaveras() {
  return (
    <group position={[0.7, Y_PATIO, 5.9]} rotation={[0, 0.25, 0]}>
      {/* la mesa */}
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[2.1, 0.1, 1.1]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
      {[
        [-0.9, -0.42], [0.9, -0.42], [-0.9, 0.42], [0.9, 0.42],
      ].map((p2, i) => (
        <mesh key={i} position={[p2[0], 0.3, p2[1]]}>
          <cylinderGeometry args={[0.045, 0.055, 0.6, 5]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
      ))}
      {/* la gavera: marco con casillas y panelas cuajando adentro */}
      <group position={[-0.45, 0.7, 0]}>
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[1.0, 0.05, 0.72]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
        {/* tabiques del molde */}
        {[-0.5, -0.17, 0.17, 0.5].map((x, i) => (
          <mesh key={i} position={[x, 0.1, 0]}>
            <boxGeometry args={[0.05, 0.14, 0.72]} />
            <meshLambertMaterial color={P.maderaVieja} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 0.1, 0.36]}>
          <boxGeometry args={[1.0, 0.14, 0.05]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
        <mesh position={[0, 0.1, -0.36]}>
          <boxGeometry args={[1.0, 0.14, 0.05]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
        {/* las panelas dentro de sus casillas */}
        {[-0.335, 0, 0.335].map((x, i) => (
          <mesh key={i} position={[x, 0.09, 0]}>
            <boxGeometry args={[0.24, 0.1, 0.56]} />
            <meshLambertMaterial
              color={mezclar(P.panela, '#c07a3a', i * 0.15)}
              flatShading
            />
          </mesh>
        ))}
      </group>
      {/* la pila de panelas listas */}
      <group position={[0.62, 0.7, 0.05]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[(i % 2) * 0.06 - 0.03, 0.06 + i * 0.115, (i % 2) * 0.04]}
            rotation={[0, (i % 2) * 0.4 - 0.2, 0]}
          >
            <boxGeometry args={[0.42, 0.11, 0.26]} />
            <meshLambertMaterial color={mezclar(P.panela, '#8a4e22', i * 0.1)} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* Las etiquetas del paso a paso panelero: caña → molino → jugo → paila → panela. */
function PasosPanela() {
  return (
    <>
      <Etiqueta pos={[9.5, 3.6, -4.5]} paso="1" texto="La caña" />
      <Etiqueta pos={[6.2, 3.4, 1.2]} paso="2" texto="El molino" />
      <Etiqueta pos={[4.8, 1.9, 2.8]} paso="3" texto="El jugo" />
      <Etiqueta pos={[3.2, 2.5, 4.3]} paso="4" texto="La paila" />
      <Etiqueta pos={[0.7, 2.0, 5.9]} paso="5" texto="La panela" />
    </>
  );
}

/* ══════════════════════ LA ESCENA COMPLETA ══════════════════════ */

function EscenaBoticaCana({ tier, reducedMotion, etiquetas }) {
  const perfil = perfilDeTier(tier);
  const geo = useMemo(
    () => construirTerreno(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  const nCanas = tier === 'alto' ? 64 : 40;

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

      {/* la botica y sus siete matas */}
      <Botica etiquetas={etiquetas} />

      {/* la caña y la panela, el proceso en línea */}
      <Canal n={nCanas} />
      <Trapiche reducedMotion={reducedMotion} />
      <CanalGuarapo />
      <Hornilla reducedMotion={reducedMotion} tier={tier} />
      <MesaGaveras />
      {etiquetas && <PasosPanela />}

      {/* unas piedras que amueblan el borde del patio */}
      {[
        [-1.6, 1.2, 0.3], [10.2, 3.6, 0.4], [-9.8, 0.2, 0.34],
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

      {/* la fauna rubber-hose de la casa, reusada como billboards */}
      <Bicho
        tipo="colibri"
        base={[-4.6, Y_PATIO + 1.3, 4.6]}
        size={30}
        rol="polinizador"
        fase={0.6}
        reducedMotion={reducedMotion}
        title="Colibrí en la caléndula"
      />
      <Bicho
        tipo="mariposa"
        base={[-7.2, Y_PATIO + 1.1, 2.6]}
        size={26}
        rol="polinizador"
        fase={2.1}
        reducedMotion={reducedMotion}
        title="Mariposa en la botica"
      />
      <Bicho
        tipo="escarabajo"
        base={[-5.6, Y_PATIO + 0.12, 3.4]}
        size={22}
        rol="descomponedor"
        fase={1.2}
        reducedMotion={reducedMotion}
        title="Escarabajo en la tierra abonada"
      />

      {/* el polen del kit sobre los canteros floridos */}
      <ParticulasAmbientales
        tipo="polen"
        tier={tier}
        reducedMotion={reducedMotion}
        position={[-5.8, 1.2, 3.8]}
        semilla={23}
      />
      <ParticulasAmbientales
        tipo="polen"
        densidad={0.5}
        tier={tier}
        reducedMotion={reducedMotion}
        position={[3, 1.6, 1]}
        semilla={41}
      />
    </>
  );
}

/* ══════════════════════ EL CHROME (DOM) ══════════════════════ */

const CSS_BOCANA = `
.bocana-root { margin: 0 auto; max-width: 72rem; padding: 0 0 2.5rem; background: #f6efdc; color: #3c2f1c; font-family: system-ui, sans-serif; }
.bocana-head { padding: 1.1rem 1rem 0.4rem; }
.bocana-kicker { margin: 0; font: 600 0.72rem/1.2 system-ui, sans-serif; letter-spacing: 0.09em; text-transform: uppercase; color: #8a6a35; }
.bocana-head h1 { margin: 0.2rem 0 0.4rem; font-size: clamp(1.35rem, 4vw, 1.9rem); line-height: 1.15; color: #4a3418; }
.bocana-lema { margin: 0; max-width: 46rem; font-size: 0.92rem; line-height: 1.55; color: #5a4a30; }
.bocana-escena { position: relative; margin: 0.9rem 0 0; height: min(78dvh, 40rem); min-height: 22rem; overflow: hidden; background: ${DIA.fondo}; border-radius: 0; }
.bocana-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.bocana-canvas--lista { opacity: 1; }
.bocana-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: flex-end; }
.bocana-pie { padding: 0 1rem 0.9rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem; }
.bocana-carta { margin: 0; max-width: 34rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(74,52,24,0.66); backdrop-filter: blur(3px); color: #fbf3e2; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.bocana-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(74,52,24,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(255,247,228,0.85); color: #5a3f1c; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.bocana-boton:hover, .bocana-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(74,52,24,0.6); outline: none; }
.bocana-boton[aria-pressed='true'] { background: #ffe8b0; border-color: rgba(90,63,28,0.75); color: #4a3418; }
.bocana-chip { pointer-events: none; display: inline-flex; align-items: center; gap: 0.3em; padding: 2px 8px; border-radius: 999px; background: rgba(58,42,24,0.82); color: #fdf6e3; font: 600 10px/1.5 system-ui, sans-serif; white-space: nowrap; box-shadow: 0 2px 6px rgba(40,28,10,0.3); }
.bocana-chip b { display: inline-flex; align-items: center; justify-content: center; width: 1.35em; height: 1.35em; border-radius: 50%; background: #e8a24a; color: #3c2410; font-size: 9px; }
.mundo-fauna { pointer-events: none; filter: drop-shadow(0 2px 5px rgba(40, 30, 10, 0.24)); }
.bocana-leyenda { padding: 1.4rem 1rem 0; }
.bocana-leyenda h2 { margin: 0 0 0.3rem; font-size: 1.12rem; color: #4a3418; }
.bocana-leyenda ol, .bocana-leyenda ul { margin: 0.6rem 0 0; padding: 0; list-style: none; display: grid; gap: 0.7rem; }
.bocana-leyenda li { display: flex; gap: 0.65rem; align-items: flex-start; background: #fdf8ea; border: 1px solid #e8dcc0; border-radius: 0.7rem; padding: 0.65rem 0.8rem; }
.bocana-emoji { font-size: 1.25rem; line-height: 1.3; }
.bocana-leyenda b { display: block; font-size: 0.88rem; color: #4a3418; }
.bocana-leyenda p { margin: 0.15rem 0 0; font-size: 0.83rem; line-height: 1.5; color: #5a4a30; }
.bocana-nota { margin: 0.8rem 0 0; font-size: 0.76rem; line-height: 1.5; color: #7a6845; font-style: italic; }
.bocana-cierre { margin: 0.9rem 0 0; max-width: 46rem; font-size: 0.86rem; line-height: 1.55; color: #5a4a30; }
@media (min-width: 40rem) { .bocana-leyenda ol, .bocana-leyenda ul { grid-template-columns: 1fr 1fr; } }
@media (prefers-reduced-motion: reduce) { .bocana-canvas { transition: none; } }
`;

/* La copia didáctica de las siete matas: saber campesino de acompañamiento,
   sin promesas de curar. La botica respeta y acompaña, no reemplaza al médico. */
const MATAS = [
  {
    emoji: '🌿',
    titulo: 'Hierbabuena',
    texto: 'La aromática de cabecera: unas hojitas en agua caliente después de la comida asientan el estómago y perfuman la casa. Crece que da gusto — sepárela con tabla o se toma el cantero.',
  },
  {
    emoji: '🌼',
    titulo: 'Manzanilla',
    texto: 'La más querida de las abuelas: su florecita blanca de botón amarillo, en agua tibia, acompaña el sueño y calma la barriga. Suave, de las que se le dan hasta a los niños.',
  },
  {
    emoji: '🍋',
    titulo: 'Limoncillo (limonaria)',
    texto: 'Hoja larga que huele a limón: en aguadepanela caliente es el remedio casero del friíto de la tarde. Sembrado en la orilla, su olor ayuda a espantar zancudos.',
  },
  {
    emoji: '💚',
    titulo: 'Sábila (aloe)',
    texto: 'La mata agradecida: aguanta sol y sequía. El cristal de su hoja gruesa se usa fresco para refrescar la piel maltratada por el sol o el trabajo. En la puerta, dicen, cuida la casa.',
  },
  {
    emoji: '🟠',
    titulo: 'Caléndula',
    texto: 'La flor naranja que no falta: sus pétalos en agua o en pomada casera acompañan el cuidado de la piel. En la huerta trabaja doble — llama polinizadores y confunde plagas del cantero.',
  },
  {
    emoji: '🍃',
    titulo: 'Ruda',
    texto: 'Mata de respeto: de olor fuerte, espanta insectos y en el saber campesino cuida la entrada de la casa. Se usa poquita y con medida — es de las plantas bravas, no de las de tomar a diario.',
  },
  {
    emoji: '🌱',
    titulo: 'Ortiga',
    texto: 'Pica al tocarla, pero es de las que más sirve: fermentada en agua se vuelve purín — abono y repelente natural para las demás matas. Se coge con guante y se le agradece.',
  },
];

/* El paso a paso de la panela: el proceso completo, legible y sin misterio. */
const PASOS_PANELA = [
  {
    emoji: '🎋',
    titulo: '1 · La caña',
    texto: 'La caña de azúcar madura de 12 a 18 meses en la falda caliente. Se corta a machete, se apila y va derecho al trapiche: entre más fresca se muela, mejor el jugo.',
  },
  {
    emoji: '⚙️',
    titulo: '2 · La molienda',
    texto: 'El trapiche exprime la caña entre sus rodillos de madera; el buey da la vuelta empujando la palanca. De un lado sale el jugo (el guarapo) y del otro el bagazo — que puesto a secar es la leña de la propia hornilla. Nada se bota.',
  },
  {
    emoji: '💧',
    titulo: '3 · El jugo',
    texto: 'El guarapo baja por la canoa hasta la paila. Antes de espesar se limpia: la espuma y la cachaza que suben se retiran con el cucharón — esa limpieza es la que da panela clara.',
  },
  {
    emoji: '🔥',
    titulo: '4 · La paila',
    texto: 'En la paila sobre la hornilla el jugo hierve horas, se revuelve con el mecedor y va espesando hasta el punto de miel. Darle el punto exacto es el oficio del panelero: ni antes ni después.',
  },
  {
    emoji: '🟫',
    titulo: '5 · La panela',
    texto: 'La miel en su punto se vacía en las gaveras — los moldes de madera — y al enfriarse cuaja: eso es la panela. Endulza el café, el guarapo y la aguadepanela de toda la casa campesina.',
  },
];

const COPY_CALMA =
  'A la izquierda, la botica de la casa; a la derecha, la molienda. Toque el botón para ver los nombres de las matas y el paso a paso de la panela.';
const COPY_PASOS =
  'Siga los números: la caña del cañal pasa al molino que mueve el buey, el jugo baja por la canoa a la paila de la hornilla, y la miel en su punto cuaja en las gaveras hecha panela.';

/**
 * MundoBoticaCana3D — la botica campesina y el trapiche panelero, montables con
 * su propio `<Canvas>`. Sin lógica de negocio: es una vitrina
 * (#/mockups/mundo-botica-cana-3d). El tier y reduced-motion se detectan aquí
 * (mockup standalone), igual que sus pares.
 */
export default function MundoBoticaCana3D() {
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
    <main className="bocana-root">
      <style>{CSS_BOCANA}</style>

      <header className="bocana-head">
        <p className="bocana-kicker">Los mundos de su finca · vitrina</p>
        <h1>La botica y el trapiche</h1>
        <p className="bocana-lema">
          Dos saberes de la casa campesina en un solo rincón: los canteros de
          plantas medicinales y aromáticas que acompañan la cocina — ruda,
          caléndula, hierbabuena, sábila, limoncillo, ortiga y manzanilla — y la
          molienda de la caña: el trapiche que mueve el buey, la paila humeando
          sobre la hornilla y las gaveras donde cuaja la panela.
        </p>
      </header>

      <section
        className="bocana-escena"
        data-tier={tier}
        aria-label="La botica campesina y el trapiche panelero en 3D"
      >
        <Canvas
          className={`bocana-canvas${listo ? ' bocana-canvas--lista' : ''}`}
          dpr={perfil.dpr}
          gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
          camera={{ position: [1.5, 6.5, 14.5], fov: 45 }}
          frameloop={reducedMotion ? 'demand' : 'always'}
          onCreated={() => setListo(true)}
        >
          <EscenaBoticaCana tier={tier} reducedMotion={reducedMotion} etiquetas={etiquetas} />
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom
            minDistance={7}
            maxDistance={22}
            target={[0.5, 1.0, 1.5]}
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

        <div className="bocana-chrome">
          <div className="bocana-pie">
            <button
              type="button"
              className="bocana-boton"
              aria-pressed={etiquetas}
              onClick={() => setEtiquetas((v) => !v)}
            >
              {etiquetas ? 'Quitar las etiquetas' : 'Ver nombres y paso a paso'}
            </button>
            <p className="bocana-carta" role="status">
              {etiquetas ? COPY_PASOS : COPY_CALMA}
            </p>
          </div>
        </div>
      </section>

      <section className="bocana-leyenda" aria-label="Las matas de la botica, una por una">
        <h2>La botica, mata por mata</h2>
        <ul>
          {MATAS.map((m) => (
            <li key={m.titulo}>
              <span className="bocana-emoji" aria-hidden="true">{m.emoji}</span>
              <div>
                <b>{m.titulo}</b>
                <p>{m.texto}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="bocana-nota">
          Saber campesino de acompañamiento, del que pasa de abuela a nieta. No
          reemplaza la consulta médica: si la dolencia es seria, al puesto de
          salud primero.
        </p>
      </section>

      <section className="bocana-leyenda" aria-label="De la caña a la panela, paso por paso">
        <h2>De la caña a la panela</h2>
        <ol>
          {PASOS_PANELA.map((p) => (
            <li key={p.titulo}>
              <span className="bocana-emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="bocana-cierre">
          La panela no sale de una fábrica: sale de un cañal bien llevado, de un
          buey que da la vuelta sin afán, de una paila revuelta con paciencia y
          de un panelero que conoce el punto. Igual que la botica: saber de la
          casa, hecho con lo que la tierra da.
        </p>
      </section>
    </main>
  );
}
