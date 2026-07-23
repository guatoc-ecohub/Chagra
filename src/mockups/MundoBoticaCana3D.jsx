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
 *     una mirada: caña → molino → jugo → paila → panela, con un recorrido de
 *     5 botones que acerca la cámara al paso activo y resalta su etiqueta.
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
 * RENDIMIENTO: cañal instanciado (una draw-call por banco: chala, tallo y hoja
 * de cada variante de mata, más los penachos — 7 en gama alta, 4 en media),
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
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  calidadCana,
  geomHojaCana,
  geomMataCana,
  geomPenachoCana,
  variedadPara,
} from '../visual/mundo3d/cana/floraCana.geom.js';

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
  cana: mezclar('#d4c765', TINTE, 0.12), // el tallo amarillo de la caña cortada
  adobe: mezclar('#9a5a38', TINTE, 0.22), // la hornilla de barro y ladrillo
  cobre: mezclar('#b06a3a', TINTE, 0.15), // la paila
  guarapo: mezclar('#c78a2e', TINTE, 0.1), // el jugo dorado hirviendo
  panela: mezclar('#a5622d', TINTE, 0.1), // el bloque cuajado
  buey: mezclar('#a3835e', TINTE, 0.12), // el buey barcino (claro: que no lea piedra)
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
  /* La caña EN PIE no se pinta aquí: el cañal usa la paleta horneada de
     `floraCana.geom.js` (PAL + VARIEDADES), que es la misma del mundo del
     trapiche. Lo de arriba (`cana`) es solo la caña YA CORTADA del arrume. */
  espuma: mezclar('#f2e4bc', TINTE, 0.05), // la espuma del hervor
  cachaza: mezclar('#d8b878', TINTE, 0.1), // lo que retira el cucharón
};

/* Los trajes de la gente del trapiche: acentos textiles de la paleta madre
   (cochinilla, índigo, maíz) sobre la tinta rubber-hose — cero hex inventado
   por fuera de esta tabla. */
const ROPA = {
  tinta: '#241a10', // NEUTROS.tinta: la línea rubber-hose
  piel: '#c98f62',
  pielSombra: '#a87048',
  sombrero: '#f0e7d0', // el aguadeño encalado
  camisa: '#f4ead2',
  pantalon: '#4a3a2c',
  ruana: '#33305c', // ACENTOS.indigo: el índigo textil
  ruanaGuarda: '#f4c542', // ACENTOS.maizTextil: la guarda de la ruana
  falda: '#8a4a38',
  panoleta: '#d1382b', // ACENTOS.cochinilla
  guante: '#fdf6e3',
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

/* ══════ EL FONDO QUE ATERRIZA LA MAQUETA ══════
   Antes la finca terminaba en el aire: el borde de la malla contra el crema
   del cielo, y el diorama se leía recortado y pegado sobre la nada. Aquí
   llega el patrón del páramo (geomCordilleras de nacederoParamo.geom.js):

   · LA FALDA — un anillo de pasto que continúa el terreno desde debajo de la
     malla hasta perderse en la niebla del mediodía. Lambert con fog: la misma
     luz del terreno, y el fog del kit lo funde solo contra el horizonte.
   · LAS LOMAS — tres anillos de crestas alrededor de la finca, cada uno más
     alto, más lejos y más pálido. La perspectiva aérea va HORNEADA en los
     vértices (mezcla hacia la bruma), no delegada al fog — MeshBasic con
     fog:false, igual que el telón del páramo: se lee igual en cualquier tier.
   Van en ANILLO completo (no telón plano): la órbita permite ±60° de azimut
   y ningún ángulo debe mostrar el vacío. Senos de frecuencia ENTERA sobre el
   ángulo: la silueta cierra el círculo sin costura y sin Math.random. */
function FondoLomas() {
  const { geoFalda, geoLomas, matFalda, matLomas } = useMemo(() => {
    const bruma = new THREE.Color(DIA.niebla);
    const c = new THREE.Color();

    /* — la falda de pasto: anillo r 12 → 62, hundiéndose apenas — */
    const NA = 56;
    const R0 = 12, R1 = 62;
    const posF = new Float32Array((NA + 1) * 2 * 3);
    const colF = new Float32Array((NA + 1) * 2 * 3);
    const idxF = [];
    const cPasto = new THREE.Color(P.pasto);
    for (let i = 0; i <= NA; i++) {
      const a = (i / NA) * Math.PI * 2;
      const cs = Math.cos(a), sn = Math.sin(a);
      [[R0, 0.3, 0.12], [R1, -0.5, 0.85]].forEach(([r, y, velo], l) => {
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

    /* — las lomas: tres anillos de crestas, verdes de la casa, sin hex nuevo — */
    const filas = [
      { r: 26, alto: 4.8, base: -1.2, tono: mezclar(P.pasto, P.ortiga, 0.35), velo: 0.34, kA: 5, kB: 11, kC: 23, fase: 1.7 },
      { r: 36, alto: 6.6, base: -1.5, tono: mezclar(P.pasto, TINTE, 0.3), velo: 0.6, kA: 4, kB: 9, kC: 19, fase: 4.2 },
      { r: 48, alto: 9.0, base: -1.8, tono: mezclar(P.pasto, TINTE, 0.5), velo: 0.74, kA: 3, kB: 7, kC: 17, fase: 0.6 },
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

    const matFalda = new THREE.MeshLambertMaterial({ vertexColors: true });
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

/* Etiqueta didáctica sobre la escena (solo en modo «paso a paso»). */
function Etiqueta({ pos, texto, paso, activo }) {
  return (
    <group position={pos} name={paso != null ? `etiqueta-paso-${paso}` : undefined}>
      <Html center distanceFactor={9} zIndexRange={[30, 0]}>
        <div className={`bocana-chip${activo ? ' bocana-chip--activo' : ''}`} aria-hidden="true">
          {paso != null && <b>{paso}</b>}
          {texto}
        </div>
      </Html>
    </group>
  );
}

/* ══════════════════════ LA BOTICA CAMPESINA ══════════════════════ */

/* La brisa de la botica: cada mata se mece apenas, con su propia fase — antes
   ni una hoja se movía. Barato: una rotación por grupo, cero geometría. */
function Mecer({ fase = 0, amp = 0.05, reducedMotion, children }) {
  const ref = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !ref.current) return;
    const t = clock.elapsedTime;
    ref.current.rotation.z = Math.sin(t * 1.4 + fase) * amp;
    ref.current.rotation.x = Math.sin(t * 1.05 + fase * 1.7) * amp * 0.6;
  });
  return <group ref={ref}>{children}</group>;
}

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
      {/* las matas, agrandadas para que se LEAN desde la cámara */}
      <group position={[0, 0.29, 0]} scale={[1.35, 1.6, 1.35]}>{children}</group>
    </group>
  );
}

/* ---- El taller de matas: piezas sueltas que se juntan en UNA malla ---- */

/* La matriz de una pieza: se acuesta (rx), se arquea (rz), gira (ry), se
   escala y se posa — en ese orden, que es como se arma una hoja en la mata. */
function poner(x, y, z, { ry = 0, rz = 0, rx = 0, esc = 1 } = {}) {
  const m = new THREE.Matrix4().makeRotationY(ry);
  if (rz) m.multiply(new THREE.Matrix4().makeRotationZ(rz));
  if (rx) m.multiply(new THREE.Matrix4().makeRotationX(rx));
  const [sx, sy, sz] = Array.isArray(esc) ? esc : [esc, esc, esc];
  if (sx !== 1 || sy !== 1 || sz !== 1) m.multiply(new THREE.Matrix4().makeScale(sx, sy, sz));
  m.setPosition(x, y, z);
  return m;
}

/* Pinta una pieza de un color plano por vértice. Si la pieza YA trae color
   horneado (la hoja de caña que presta el limoncillo) y el color viene como
   factores [r,g,b], la ENTINTA multiplicando canal a canal. */
function pintar(geo, color) {
  const n = geo.attributes.position.count;
  const previo = geo.attributes.color;
  if (previo && Array.isArray(color)) {
    for (let i = 0; i < n; i++) {
      previo.setXYZ(
        i,
        Math.min(1, previo.getX(i) * color[0]),
        Math.min(1, previo.getY(i) * color[1]),
        Math.min(1, previo.getZ(i) * color[2]),
      );
    }
    return geo;
  }
  const c = new THREE.Color(color);
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/* Junta las piezas {geo, m, color} de una mata en UNA geometría con color por
   vértice: cada mata queda en una sola draw-call, como los bancos del cañal.
   ⚠️ mergeGeometries devuelve NULL EN SILENCIO al mezclar indexadas con
   no-indexadas — aquí todas las piezas son indexadas, y si algún día alguna
   no lo es, mejor reventar YA que una botica invisible. */
function unirMata(piezas) {
  const sueltas = piezas.map(({ geo, m, color }) => {
    if (m) geo.applyMatrix4(m);
    return pintar(geo, color);
  });
  const g = mergeGeometries(sueltas, false);
  if (!g) throw new Error('unirMata: mergeGeometries devolvió null (piezas mixtas)');
  sueltas.forEach((s) => s.dispose());
  return g;
}

/* Una HOJA plana de silueta recortada, acostada sobre el plano XY y saliendo
   por +X: el contorno lleva dientes de sierra (la ortiga) o festones mansos
   (la hierbabuena) según la `mordida`. Es la pieza que mata el «cono = hoja». */
function geomHojaSilueta({ largo, ancho, dientes = 5, mordida = 0.4, punta = 0.5, semilla = 1 }) {
  const r = crearRng(semilla * 37 + 11);
  const N = dientes * 2;
  // ancho de la hoja a lo largo: angosta en el pecíolo, panzona al tercio, punta cerrada
  const w = (t) =>
    ancho * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.8) * Math.pow(1 - t * 0.55, punta);
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  for (let k = 1; k < N; k++) {
    const t = k / N;
    const f = k % 2 === 1 ? 1 : 1 - mordida * (0.8 + r() * 0.4);
    sh.lineTo(largo * t, w(t) * f);
  }
  sh.lineTo(largo, 0); // la punta
  for (let k = N - 1; k >= 1; k--) {
    const t = k / N;
    const f = k % 2 === 0 ? 1 : 1 - mordida * (0.8 + r() * 0.4);
    sh.lineTo(largo * t, -w(t) * f);
  }
  sh.closePath();
  return new THREE.ShapeGeometry(sh);
}

/* El material único de las matas armadas con `unirMata`: color por vértice y
   DOS caras, porque las hojas de silueta y las cintas son láminas sin grosor. */
function MataUnida({ pos, esc = 1, geo }) {
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh position={pos} scale={esc} geometry={geo}>
      <meshLambertMaterial vertexColors flatShading side={THREE.DoubleSide} />
    </mesh>
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
          <coneGeometry args={[0.105, h.largo, 4]} />
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

/* Ruda: antes era un montón de bolas — y la ruda no es una bola. Es una mata
   BAJA y RAMIFICADA: ramitas que se abren desde el pie, cada una rematada en
   RAMILLETES de hojitas menudas y redondeadas de verde glauco azuloso, con
   las florecitas amarillas en las puntas que ya florecieron. */
function Ruda({ pos, esc = 1, semilla = 1 }) {
  const geo = useMemo(() => {
    const rng = crearRng(55 + semilla);
    const piezas = [];
    const RAMAS = 11;
    for (let i = 0; i < RAMAS; i++) {
      const ang = (i / RAMAS) * Math.PI * 2 + rng() * 0.6;
      const inc = 0.35 + rng() * 0.5; // abierta desde el pie, no un palo central
      const largo = 0.13 + rng() * 0.12; // CORTA: mata compacta, no varas de eneldo
      const dir = [Math.sin(inc) * Math.cos(ang), Math.cos(inc), -Math.sin(inc) * Math.sin(ang)];
      // la ramita leñosita
      piezas.push({
        geo: new THREE.CylinderGeometry(0.006, 0.01, largo, 4),
        m: poner((dir[0] * largo) / 2, (dir[1] * largo) / 2, (dir[2] * largo) / 2, {
          ry: ang,
          rz: -inc,
        }),
        color: mezclar(P.ruda, P.tallo, 0.55),
      });
      // ramilletes de hojitas: en la punta siempre, y a medio camino en las largas
      const nudos = largo > 0.19 ? [0.6, 1] : [1];
      for (const f of nudos) {
        const px = dir[0] * largo * f;
        const py = dir[1] * largo * f;
        const pz = dir[2] * largo * f;
        const HOJITAS = 7 + Math.floor(rng() * 3);
        for (let h = 0; h < HOJITAS; h++) {
          const a2 = rng() * Math.PI * 2;
          const r2 = 0.01 + rng() * 0.02; // apretadas: ramillete, no puntos sueltos
          piezas.push({
            geo: new THREE.SphereGeometry(0.028 + rng() * 0.016, 5, 4),
            m: poner(px + Math.cos(a2) * r2, py + 0.006 + rng() * 0.03, pz + Math.sin(a2) * r2, {
              esc: [1, 0.62, 1], // hojita redondeada, no bola
            }),
            // glauco azuloso con cuerpo: hacia el fondo verde, no hacia la niebla
            color: mezclar(P.ruda, '#3d6248', 0.3 + (h % 3) * 0.12),
          });
        }
      }
      // la florecita amarilla menuda, solo en las ramas que ya espigaron
      if (rng() < 0.6) {
        piezas.push({
          geo: new THREE.SphereGeometry(0.018 + rng() * 0.008, 5, 4),
          m: poner(dir[0] * largo, dir[1] * largo + 0.028, dir[2] * largo),
          color: '#d9c94a',
        });
      }
    }
    return unirMata(piezas);
  }, [semilla]);
  return <MataUnida pos={pos} esc={esc} geo={geo} />;
}

/* Caléndula: tallos verdes coronados por la flor naranja de pétalos anchos. */
function Calendula({ pos, esc = 1, semilla = 1 }) {
  const flores = useMemo(() => {
    const rng = crearRng(70 + semilla);
    return Array.from({ length: 5 }, () => ({
      x: (rng() - 0.5) * 0.38,
      z: (rng() - 0.5) * 0.34,
      h: 0.3 + rng() * 0.16,
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
            <cylinderGeometry args={[0.115, 0.055, 0.04, 9]} />
            <meshLambertMaterial color={P.calendulaFlor} flatShading />
          </mesh>
          <mesh position={[0, f.h + 0.055, 0]}>
            <sphereGeometry args={[0.038, 6, 5]} />
            <meshLambertMaterial color={mezclar(P.calendulaFlor, '#7a4a1a', 0.55)} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Hierbabuena: antes era una mancha de bolas a ras de tierra. Ahora es lo que
   delata a una menta: tallitos CUADRADOS (boxGeometry finita, la firma de la
   familia) con pares OPUESTOS de hojas ovaladas de borde festoneado, verde
   vivo, en mata baja y tupida. */
function Hierbabuena({ pos, esc = 1, semilla = 1 }) {
  const geo = useMemo(() => {
    const rng = crearRng(90 + semilla);
    const piezas = [];
    const TALLOS = 12;
    for (let i = 0; i < TALLOS; i++) {
      const ang = rng() * Math.PI * 2;
      const rad = rng() * 0.24;
      const bx = Math.cos(ang) * rad;
      const bz = Math.sin(ang) * rad * 0.8;
      const alto = 0.12 + rng() * 0.13;
      const ladeo = 0.1 + rng() * 0.35; // cada tallito con su ladeo
      const rumbo = rng() * Math.PI * 2;
      const dir = [
        Math.sin(ladeo) * Math.cos(rumbo),
        Math.cos(ladeo),
        -Math.sin(ladeo) * Math.sin(rumbo),
      ];
      // el tallo cuadrado
      piezas.push({
        geo: new THREE.BoxGeometry(0.013, alto, 0.013),
        m: poner(bx + (dir[0] * alto) / 2, (dir[1] * alto) / 2, bz + (dir[2] * alto) / 2, {
          ry: rumbo,
          rz: -ladeo,
        }),
        color: mezclar(P.hierbabuena, P.tallo, 0.45),
      });
      // pares opuestos de hojas, cada nudo CRUZADO con el anterior (decusado)
      const nudos = [0.55, 1];
      nudos.forEach((f, j) => {
        const px = bx + dir[0] * alto * f;
        const py = dir[1] * alto * f;
        const pz = bz + dir[2] * alto * f;
        const cruz = rumbo + (j * Math.PI) / 2 + (rng() - 0.5) * 0.4;
        const escHoja = f === 1 ? 0.8 : 1;
        for (const lado of [0, Math.PI]) {
          piezas.push({
            geo: geomHojaSilueta({
              largo: 0.095 + rng() * 0.03,
              ancho: 0.036,
              dientes: 6,
              mordida: 0.2, // festón manso, no sierra
              punta: 0.18, // punta roma: hoja ovalada
              semilla: semilla * 13 + i * 3 + j,
            }),
            m: poner(px, py, pz, {
              ry: cruz + lado,
              rz: 0.25 - rng() * 0.55,
              rx: -Math.PI / 2,
              esc: escHoja,
            }),
            color: mezclar(P.hierbabuena, '#7cc35a', rng() * 0.5),
          });
        }
      });
    }
    // y unas hojas bajitas a ras de tierra, que la mata se vea tupida
    for (let i = 0; i < 10; i++) {
      const a = rng() * Math.PI * 2;
      const r2 = 0.07 + rng() * 0.2;
      piezas.push({
        geo: geomHojaSilueta({
          largo: 0.08 + rng() * 0.025,
          ancho: 0.032,
          dientes: 6,
          mordida: 0.2,
          punta: 0.18,
          semilla: semilla * 17 + i,
        }),
        m: poner(Math.cos(a) * r2, 0.012, Math.sin(a) * r2 * 0.8, {
          ry: rng() * Math.PI * 2,
          rz: 0.3 + rng() * 0.25,
          rx: -Math.PI / 2,
        }),
        color: mezclar(P.hierbabuena, '#7cc35a', rng() * 0.5),
      });
    }
    return unirMata(piezas);
  }, [semilla]);
  return <MataUnida pos={pos} esc={esc} geo={geo} />;
}

/* Limoncillo (limonaria): una GRAMÍNEA, pariente de la caña de esta misma
   escena — y antes eran conos tiesos como púas. Ahora la macolla se arma con
   la MISMA hoja de cinta del cañal (`geomHojaCana`: doblez en V, nervadura
   pálida, se arquea y CAE de punta), en tamaño de botica y entintada al verde
   amarillento que delata al limoncillo. El mismo lenguaje, la misma familia. */
function Limoncillo({ pos, esc = 1, semilla = 1 }) {
  const geo = useMemo(() => {
    const rng = crearRng(110 + semilla);
    const piezas = [];
    // el pie de la macolla: los tallitos apretados de donde nace el abanico
    piezas.push({
      geo: new THREE.CylinderGeometry(0.03, 0.055, 0.1, 6),
      m: poner(0, 0.05, 0),
      color: mezclar(P.limoncillo, P.pastoSeco, 0.55),
    });
    const HOJAS = 16;
    for (let i = 0; i < HOJAS; i++) {
      const ang = (i / HOJAS) * Math.PI * 2 + rng() * 0.5;
      const alza = 0.55 + (i % 3) * 0.22 + rng() * 0.3; // unas paradas, otras echadas
      piezas.push({
        geo: geomHojaCana({
          largo: 0.5 + rng() * 0.32,
          ancho: 0.026 + rng() * 0.012,
          caida: 0.55 + rng() * 0.4, // la punta SIEMPRE se desploma: macolla, no púas
          doblez: 0.3,
          torsion: 0.5 + rng() * 0.9,
          lateral: 0.1,
          filas: 7,
          semilla: semilla * 10 + i,
        }),
        m: poner(Math.cos(ang) * 0.035, 0.075, Math.sin(ang) * 0.035, { ry: ang, rz: alza }),
        // el entintado amarillento del limoncillo sobre el verde horneado de la caña
        color: [1.24, 1.06, 0.6],
      });
    }
    return unirMata(piezas);
  }, [semilla]);
  return <MataUnida pos={pos} esc={esc} geo={geo} />;
}

/* Ortiga: antes las hojas eran conitos en punta — y la ortiga tiene hoja
   ANCHA, en punta pero con el borde ASERRADO, opuesta por pares y cada par
   CRUZADO con el anterior (decusado). La sierra va recortada de verdad en la
   silueta (`geomHojaSilueta` con mordida brava). Se mira, no se toca. */
function Ortiga({ pos, esc = 1, semilla = 1 }) {
  const geo = useMemo(() => {
    const rng = crearRng(75 + semilla);
    const tallos = [
      [0, 0, 0, 0.52],
      [0.12, 0, 0.08, 0.42],
      [-0.11, 0, -0.05, 0.38],
    ];
    const piezas = [];
    tallos.forEach((t, i) => {
      const [tx, , tz, alto] = t;
      piezas.push({
        geo: new THREE.CylinderGeometry(0.011, 0.019, alto, 5),
        m: poner(tx, alto / 2, tz),
        color: mezclar(P.ortiga, TINTE, 0.15),
      });
      const rumbo = rng() * Math.PI * 2;
      // pares opuestos a lo largo, más chicos hacia arriba, y el cogollo
      [0.3, 0.52, 0.74, 0.92, 1.05].forEach((f, j) => {
        const cruz = rumbo + (j * Math.PI) / 2 + (rng() - 0.5) * 0.3;
        const escHoja = 1.15 - j * 0.16;
        for (const lado of [0, Math.PI]) {
          piezas.push({
            geo: geomHojaSilueta({
              largo: 0.2,
              ancho: 0.078, // ANCHA: casi tan ancha como larga
              dientes: 5,
              mordida: 0.45, // la sierra brava del borde
              punta: 0.55, // pero rematada en punta
              semilla: semilla * 19 + i * 5 + j,
            }),
            m: poner(tx, alto * f, tz, {
              ry: cruz + lado,
              rz: f > 1 ? 0.35 : -0.05 - rng() * 0.25, // el cogollo arriba, el resto casi plano
              rx: -Math.PI / 2,
              esc: escHoja,
            }),
            color: mezclar(P.ortiga, '#7fae54', 0.08 + j * 0.13),
          });
        }
      });
    });
    return unirMata(piezas);
  }, [semilla]);
  return <MataUnida pos={pos} esc={esc} geo={geo} />;
}

/* Manzanilla: varitas finas con la florecita blanca de botón amarillo. */
function Manzanilla({ pos, esc = 1, semilla = 1 }) {
  const flores = useMemo(() => {
    const rng = crearRng(130 + semilla);
    return Array.from({ length: 6 }, () => ({
      x: (rng() - 0.5) * 0.34,
      z: (rng() - 0.5) * 0.3,
      h: 0.28 + rng() * 0.18,
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
            <cylinderGeometry args={[0.062, 0.024, 0.024, 8]} />
            <meshLambertMaterial color={P.manzanillaFlor} flatShading />
          </mesh>
          <mesh position={[0, f.h + 0.034, 0]}>
            <sphereGeometry args={[0.028, 6, 4]} />
            <meshLambertMaterial color="#e2b93b" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* La botica completa: tres canteros con las siete matas, cada una en su sitio
   y cada una MECIÉNDOSE con su propia fase de brisa. */
function Botica({ etiquetas, reducedMotion }) {
  return (
    <group>
      {/* cantero de las aromáticas de tomar */}
      <Cantero pos={[-7.5, Y_PATIO, 2.4]} rot={0.14}>
        <Mecer fase={0.3} reducedMotion={reducedMotion}>
          <Hierbabuena pos={[-0.85, 0, 0.1]} semilla={3} />
          <Hierbabuena pos={[-0.35, 0, -0.25]} esc={0.85} semilla={7} />
        </Mecer>
        <Mecer fase={1.6} amp={0.07} reducedMotion={reducedMotion}>
          <Manzanilla pos={[0.25, 0, 0.15]} semilla={2} />
          <Manzanilla pos={[0.6, 0, -0.25]} esc={0.85} semilla={5} />
        </Mecer>
        <Mecer fase={2.9} amp={0.08} reducedMotion={reducedMotion}>
          <Limoncillo pos={[1.0, 0, 0.12]} semilla={4} />
        </Mecer>
      </Cantero>
      {/* cantero de las matas de respeto */}
      <Cantero pos={[-4.5, Y_PATIO, 4.6]} rot={-0.1}>
        <Mecer fase={0.9} reducedMotion={reducedMotion}>
          <Ruda pos={[-0.9, 0, 0]} />
        </Mecer>
        <Mecer fase={2.2} amp={0.065} reducedMotion={reducedMotion}>
          <Calendula pos={[-0.15, 0, 0.15]} semilla={1} />
          <Calendula pos={[0.35, 0, -0.28]} esc={0.85} semilla={6} />
        </Mecer>
        <Mecer fase={4.1} reducedMotion={reducedMotion}>
          <Ortiga pos={[0.95, 0, 0.05]} />
        </Mecer>
      </Cantero>
      {/* el cantero de la sábila, aparte y soleado (carnosa: apenas se mece) */}
      <Cantero pos={[-7.0, Y_PATIO, 5.9]} rot={0.32} w={2.1} d={1.2}>
        <Mecer fase={5.3} amp={0.02} reducedMotion={reducedMotion}>
          <Sabila pos={[-0.6, 0, 0]} semilla={1} />
          <Sabila pos={[0.05, 0, 0.12]} esc={0.85} semilla={5} />
          <Sabila pos={[0.65, 0, -0.12]} esc={1.1} semilla={9} />
        </Mecer>
      </Cantero>

      {etiquetas && (
        <>
          {/* repartidas en dos alturas y bien separadas: antes se encimaban */}
          <Etiqueta pos={[-8.6, Y_PATIO + 1.05, 2.6]} texto="Hierbabuena" />
          <Etiqueta pos={[-7.3, Y_PATIO + 1.75, 2.7]} texto="Manzanilla" />
          <Etiqueta pos={[-6.1, Y_PATIO + 1.15, 2.2]} texto="Limoncillo" />
          <Etiqueta pos={[-5.6, Y_PATIO + 1.75, 4.8]} texto="Ruda" />
          <Etiqueta pos={[-4.55, Y_PATIO + 1.1, 4.35]} texto="Caléndula" />
          <Etiqueta pos={[-3.3, Y_PATIO + 1.7, 4.75]} texto="Ortiga" />
          <Etiqueta pos={[-7.1, Y_PATIO + 1.15, 6.15]} texto="Sábila" />
        </>
      )}
    </group>
  );
}

/* ══════════════════════ LA CAÑA Y LA PANELA ══════════════════════ */

/* EL CAÑAL. Esta escena dibujaba antes su PROPIA caña: un cilindro liso con
   cinco anillos que no se veían, unos conos tiesos por hoja y el penacho hecho
   una lanza. El resultado se leía como un pinar de palos pelados — y el
   campesino que siembra caña no reconocía la suya, que es justo la autoridad
   que este mundo necesita para lo que enseña después.

   La caña BUENA ya existía en el repo, con su prueba: `floraCana.geom.js`, la
   del mundo del trapiche. Trae lo que de verdad delata a la Saccharum
   officinarum, y no se copia aquí: se SIEMBRA la misma.

     · MACOLLA — la caña no nace de a un tallo: 7 u 8 salen del MISMO PIE y se
       abren en abanico. Por eso un cañal se lee como masa y no como fila.
     · NUDOS y ENTRENUDOS — el tallo viene segmentado cada ~20 cm, con el
       anillo nodal engrosado y más pálido. Es lo primero que la identifica.
     · HOJA ACINTADA — cinta de más de un metro doblada en V sobre su nervadura
       pálida: sale del nudo, se arquea y se cae de punta por su propio peso.
     · CHALA — la hoja seca colgando del tercio bajo, vistiendo el tallo. Sin
       ella un cañal parece un guadual.
     · PENACHO — la panícula plumosa y plateada de la que ya espigó. PLUMA, no
       lanza: treinta ramitas finas cayendo de punta.
     · VARIEDADES — verde, amarilla, morada y rayada conviven en el mismo lote,
       como en la finca. El tinte por instancia pinta el TALLO; la hoja va
       siempre verde, y por eso van en mallas aparte.

   Lo único de aquí es la SIEMBRA: sobre el terreno de esta finca, en la falda
   baja y esquivando el patio del trapiche. Una draw-call por banco. */

/* Cuántas MATAS (no tallos) según la gama. Cada mata trae 7 u 8 tallos adentro,
   así que el conteo es mucho menor que el de antes y el cañal queda más tupido:
   24 matas son ~170 tallos donde antes había 64 palos sueltos. */
const CANAL_TIER = {
  alto: { matas: 24, variantes: [0, 1], detalle: 'cerca' },
  medio: { matas: 15, variantes: [0], detalle: 'cerca' },
  bajo: { matas: 9, variantes: [0], detalle: 'lejos' },
};
/* La mata canónica mide de 3,3 a 4,7 m (es una gramínea gigante). En este
   diorama se siembra a ~0,8 para que le pase por encima a la enramada del
   trapiche (3,6 m) sin comerse el encuadre. */
const ESC_MATA = 0.8;
/* La hoja y la chala NO llevan el color de la variedad (el morado del tallo no
   le toca el follaje): van en su propio banco con su tinte casi neutro. */
const TINTE_HOJA = [0.97, 1, 0.94];
const TINTE_CHALA = [1, 0.97, 0.92];
const TINTE_PENACHO = [1, 0.98, 0.94];

/* Un banco de instancias de UNA pieza de la mata: una draw-call por banco, y
   las matrices se escriben UNA vez (este cañal no se mece: la brisa de esta
   escena vive en la botica). `base` fija el tinte del banco; sin él manda el de
   la instancia, que es la VARIEDAD del tallo. */
function BancoCana({ geo, mat, items, base = null }) {
  const ref = useRef(null);
  useEffect(() => {
    const malla = ref.current;
    if (!malla || !items.length) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      p.set(it.pos[0], it.pos[1], it.pos[2]);
      e.set(0, it.rotY, 0);
      q.setFromEuler(e);
      s.setScalar(it.esc);
      m.compose(p, q, s);
      malla.setMatrixAt(i, m);
      // un pelo de claro/oscuro por mata: que el lote no se lea estampado
      const t = base || it.tinte;
      const j = base ? 0.93 + it.jit * 0.14 : 1;
      col.setRGB(t[0] * j, t[1] * j, t[2] * j);
      malla.setColorAt(i, col);
    });
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
  }, [items, base]);
  if (!geo || !items.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} frustumCulled={false} />;
}

function Canal({ tier = 'alto' }) {
  const cfg = CANAL_TIER[tier] || CANAL_TIER.medio;
  const q = calidadCana(tier);

  /* Las mallas de mata: UNA geometría por variante, construida una sola vez.
     Dos variantes (la cepa alta y derecha, la cepa tupida y abierta) son lo que
     evita que el lote se lea como una plantilla repetida. */
  const variantes = useMemo(
    () => cfg.variantes.map((v) => geomMataCana(v, { q, detalle: cfg.detalle, vestido: 0.5 }, 101)),
    [cfg, q],
  );
  const geoPenacho = useMemo(() => geomPenachoCana(q, 41), [q]);

  /* La siembra, determinista: la misma finca en cada visita, sin Math.random. */
  const siembra = useMemo(() => {
    const rng = crearRng(217);
    const porVariante = variantes.map(() => []);
    const penachos = [];
    let intentos = 0;
    let puestas = 0;
    while (puestas < cfg.matas && intentos < cfg.matas * 14) {
      intentos += 1;
      const wx = 6.5 + rng() * 8.0;
      const wz = -8.5 + rng() * 6.0;
      const y = alturaFinca(wx, wz);
      if (y > 1.5) continue; // el cañal es de la falda baja, no de la loma
      if (gauss(wx, wz, 5.5, 2.2, 3.4, 2.6) > 0.45) continue; // no invade el patio
      const iv = puestas % variantes.length;
      const rotY = rng() * Math.PI * 2;
      const esc = ESC_MATA * (0.88 + rng() * 0.26);
      const jit = rng();
      const variedad = variedadPara(rng());
      porVariante[iv].push({ pos: [wx, y, wz], rotY, esc, jit, tinte: variedad.tinte });

      /* El penacho se monta en una PUNTA DE TALLO de verdad —los `topes` que
         devuelve la mata—, no flotando encima del pie, y solo en las que ya
         espigaron: un cañal donde todas espigaron no existe. */
      if (rng() < 0.55) {
        const topes = variantes[iv].topes;
        const t = topes[Math.min(topes.length - 1, Math.floor(rng() * topes.length))];
        const c = Math.cos(rotY);
        const s = Math.sin(rotY);
        penachos.push({
          pos: [wx + (t[0] * c + t[2] * s) * esc, y + t[1] * esc, wz + (-t[0] * s + t[2] * c) * esc],
          rotY,
          esc,
          jit: rng(),
        });
      }
      puestas += 1;
    }
    return { porVariante, penachos };
  }, [variantes, cfg.matas]);

  /* El material del TALLO lleva el color horneado por vértice (el entrenudo y su
     anillo nodal más pálido) y el tinte de la variedad por instancia encima. */
  const matTallo = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    [],
  );
  /* La HOJA es una CINTA: a una sola cara media hoja desaparece según de qué
     lado se mire. Va a dos caras siempre — hoja, chala y penacho. */
  const matCinta = useMemo(
    () => new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
    [],
  );

  /* Soltar la GPU al desmontar el mundo. */
  useEffect(
    () => () => {
      variantes.forEach((v) => {
        v.tallos.dispose();
        v.hojas.dispose();
        v.chala.dispose();
      });
      geoPenacho.dispose();
      matTallo.dispose();
      matCinta.dispose();
    },
    [variantes, geoPenacho, matTallo, matCinta],
  );

  return (
    <group>
      {variantes.map((v, i) => (
        <group key={i}>
          {/* la chala primero: queda detrás, pegada al tallo */}
          <BancoCana geo={v.chala} mat={matCinta} items={siembra.porVariante[i]} base={TINTE_CHALA} />
          {/* el tallo segmentado, teñido por variedad */}
          <BancoCana geo={v.tallos} mat={matTallo} items={siembra.porVariante[i]} />
          {/* y encima la hoja verde arqueada del cogollo */}
          <BancoCana geo={v.hojas} mat={matCinta} items={siembra.porVariante[i]} base={TINTE_HOJA} />
        </group>
      ))}
      {/* los penachos: lo más alto y lo más liviano del cañal */}
      <BancoCana geo={geoPenacho} mat={matCinta} items={siembra.penachos} base={TINTE_PENACHO} />
    </group>
  );
}

/* El buey barcino, VIVO: antes era un cuerpo rígido que resbalaba en círculo.
   Ahora camina en rubber-hose: las patas dan el paso en diagonal, la cabeza
   cabecea con el andar, el rabo (con su borla) espanta moscas, y el cuerpo
   respira con un squash & stretch manso. reduced-motion lo deja quieto. */
const PASO_BUEY = 3.1; // frecuencia del paso, casada con la vuelta del molino
function Buey({ reducedMotion }) {
  const cuerpo = useRef(null);
  const cabeza = useRef(null);
  const rabo = useRef(null);
  const patas = useRef([]);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime * PASO_BUEY;
    // las patas: pares en diagonal, péndulo desde la cadera
    patas.current.forEach((p2, i) => {
      if (!p2) return;
      const fase = i === 0 || i === 3 ? 0 : Math.PI;
      p2.rotation.z = Math.sin(t + fase) * 0.38;
    });
    // el cuerpo sube un pelín en cada paso y se estira/aplasta (squash manso)
    if (cuerpo.current) {
      const s = Math.sin(t * 2) * 0.03;
      cuerpo.current.position.y = Math.abs(Math.sin(t)) * 0.045;
      cuerpo.current.scale.set(1 - s * 0.6, 1 + s, 1 - s * 0.6);
    }
    // la cabeza cabecea con el esfuerzo del tiro
    if (cabeza.current) {
      cabeza.current.rotation.z = Math.sin(t) * 0.12 - 0.06;
      cabeza.current.rotation.x = Math.sin(t * 0.31) * 0.08;
    }
    // el rabo se balancea a su propio ritmo (espanta moscas, no marca el paso)
    if (rabo.current) {
      rabo.current.rotation.x = Math.sin(clock.elapsedTime * 1.9) * 0.55;
      rabo.current.rotation.z = 0.5 + Math.sin(clock.elapsedTime * 1.3) * 0.14;
    }
  });
  return (
    <group ref={cuerpo}>
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
      {/* cabeza y hocico (pivota en la nuca para el cabeceo) */}
      <group ref={cabeza} position={[0.78, 0.72, 0]}>
        <mesh scale={[0.9, 0.8, 0.7]}>
          <sphereGeometry args={[0.24, 7, 6]} />
          <meshLambertMaterial color={mezclar(P.buey, TINTE, 0.12)} flatShading />
        </mesh>
        <mesh position={[0.18, -0.08, 0]} scale={[0.7, 0.5, 0.55]}>
          <sphereGeometry args={[0.18, 6, 5]} />
          <meshLambertMaterial color={mezclar(P.buey, '#d8c4a2', 0.5)} flatShading />
        </mesh>
        {/* los ojos mansos (la mirada rubber-hose del que trabaja sin afán) */}
        <mesh position={[0.13, 0.06, 0.13]}>
          <sphereGeometry args={[0.03, 5, 4]} />
          <meshBasicMaterial color="#241a10" />
        </mesh>
        <mesh position={[0.13, 0.06, -0.13]}>
          <sphereGeometry args={[0.03, 5, 4]} />
          <meshBasicMaterial color="#241a10" />
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
      {/* patas: pivotan en la cadera (la geometría cuelga hacia abajo) */}
      {[
        [0.42, 0.34], [0.42, -0.24], [-0.42, 0.3], [-0.42, -0.26],
      ].map((p2, i) => (
        <group
          key={i}
          position={[p2[0], 0.45, p2[1] * 0.62]}
          ref={(el) => { patas.current[i] = el; }}
        >
          <mesh position={[0, -0.23, 0]}>
            <cylinderGeometry args={[0.055, 0.07, 0.46, 5]} />
            <meshLambertMaterial color={mezclar(P.buey, '#6a5a44', 0.4)} flatShading />
          </mesh>
          {/* la pezuña */}
          <mesh position={[0, -0.45, 0.01]} scale={[1, 0.5, 1.1]}>
            <sphereGeometry args={[0.075, 5, 4]} />
            <meshLambertMaterial color={mezclar(P.buey, '#3a2c1c', 0.6)} flatShading />
          </mesh>
        </group>
      ))}
      {/* rabo: pivota arriba y remata en su borla */}
      <group ref={rabo} position={[-0.66, 0.84, 0]} rotation={[0, 0, 0.5]}>
        <mesh position={[0, -0.24, 0]}>
          <cylinderGeometry args={[0.02, 0.032, 0.48, 4]} />
          <meshLambertMaterial color={mezclar(P.buey, '#6a5a44', 0.5)} flatShading />
        </mesh>
        <mesh position={[0, -0.5, 0]} scale={[1, 1.4, 1]}>
          <sphereGeometry args={[0.05, 5, 4]} />
          <meshLambertMaterial color={mezclar(P.buey, '#3a2c1c', 0.65)} flatShading />
        </mesh>
      </group>
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
    // El paso manso del buey. ARRANCA EN 3.05, no en 2.3: con la cámara
    // vertical del teléfono la fase 2.3 lo escondía detrás del molino y la
    // 4.7 (la vieja "pose visible") caía FUERA del borde derecho del
    // encuadre — el corazón del trapiche nunca salía en pantalla. En 3.05 el
    // buey nace en el CLARO de pasto al lado izquierdo del molino (fondo
    // verde limpio: entre 3.3 y 3.6 quedaba camuflado contra la madera de
    // la canoa y el molino, y debajo de la pluma de humo de la hornilla),
    // de cara a la cámara, y camina su vuelta A LA VISTA.
    vuelta.current.rotation.y = 3.05 + clock.elapsedTime * 0.22;
  });
  return (
    <group position={TRAPICHE_POS}>
      {/* la enramada, DESTAPADA: antes el techo era una losa baja y opaca que
          escondía la única pieza viva del mundo. Ahora: cuatro horcones BIEN
          altos y techo de paja a dos aguas, con los hastiales abiertos — el
          molino y el buey se LEEN debajo desde la cámara. */}
      {[
        [-1.35, -1.15], [1.35, -1.15], [-1.35, 1.15], [1.35, 1.15],
      ].map((h, i) => (
        <mesh key={i} position={[h[0], 1.8, h[1]]}>
          <cylinderGeometry args={[0.07, 0.09, 3.6, 5]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
      ))}
      {/* las soleras que amarran los horcones */}
      <mesh position={[0, 3.56, -1.15]}>
        <boxGeometry args={[3.1, 0.1, 0.1]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      <mesh position={[0, 3.56, 1.15]}>
        <boxGeometry args={[3.1, 0.1, 0.1]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      {/* las dos aguas de paja (planos inclinados, no losa) */}
      <mesh position={[0, 3.94, -0.82]} rotation={[0.62, 0, 0]}>
        <boxGeometry args={[3.9, 0.09, 1.85]} />
        <meshLambertMaterial color={P.paja} flatShading />
      </mesh>
      <mesh position={[0, 3.94, 0.82]} rotation={[-0.62, 0, 0]}>
        <boxGeometry args={[3.9, 0.09, 1.85]} />
        <meshLambertMaterial color={mezclar(P.paja, '#b39348', 0.35)} flatShading />
      </mesh>
      {/* el caballete que remata */}
      <mesh position={[0, 4.42, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[3.95, 0.12, 0.24]} />
        <meshLambertMaterial color={mezclar(P.paja, '#a8873e', 0.5)} flatShading />
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
      {/* pose base (reduced-motion y captura): 3.05 = el buey en el claro de
          pasto al lado izquierdo del molino, de cara a la cámara y ADENTRO
          del encuadre vertical — la 4.7 de antes quedaba cortada por el
          borde derecho del teléfono, y entre 3.3 y 3.6 quedaba camuflado
          contra la canoa y el molino, debajo del humo de la hornilla */}
      <group ref={vuelta} position={[0, 0, 0]} rotation={[0, 3.05, 0]}>
        {/* la palanca, del eje hacia afuera y bajando al pecho del buey */}
        <mesh position={[1.45, 1.6, 0]} rotation={[0, 0, 0.26]}>
          <boxGeometry args={[3.1, 0.13, 0.13]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        <mesh position={[2.8, 1.05, 0]} rotation={[0, 0, 1.2]}>
          <boxGeometry args={[0.9, 0.1, 0.1]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        {/* el buey, enyugado al extremo, andando su círculo — mirando HACIA
            donde camina (antes iba de para atrás y el techo tapaba la pena) */}
        <group position={[2.9, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={1.32}>
          <Buey reducedMotion={reducedMotion} />
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

/* El canal del guarapo, CORRIENDO: antes la canoa estaba seca (geometría
   quieta). Ahora el jugo baja en pulsos brillantes del molino a la paila y
   cae en chorrito con su salpicón de espuma. reduced-motion: cinta quieta. */
function CanalGuarapo({ reducedMotion }) {
  const pulsos = useRef(null);
  const chorro = useRef(null);
  // del trapiche (6.2, 1.2) hacia la hornilla (3.4, 4.2): largo ~3.9;
  // el extremo local +x queda en el molino (arriba), el -x en la paila (abajo)
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    if (pulsos.current) {
      pulsos.current.children.forEach((p2, i) => {
        const f = (t * 0.55 + i * 0.27) % 1;
        p2.position.x = 1.75 - f * 3.5; // baja del molino hacia la paila
        p2.position.y = 0.085 + Math.sin(f * Math.PI) * 0.015;
        p2.scale.setScalar(0.75 + Math.sin(f * Math.PI) * 0.45);
      });
    }
    if (chorro.current) {
      const s = 0.9 + Math.sin(t * 7.3) * 0.14;
      chorro.current.scale.set(s, 1 + Math.sin(t * 9.1) * 0.12, s);
    }
  });
  return (
    // BAJA, como es de verdad: la canoa va casi a ras de patio y el buey la
    // pasa por encima en su vuelta. La caída va del molino (+x, arriba)
    // hacia la paila (-x, abajo) — antes estaba inclinada AL REVÉS.
    <group position={[4.8, Y_PATIO + 0.34, 2.7]} rotation={[0, 0.82, 0.09]}>
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
      {/* los pulsos de guarapo que BAJAN (el brillo que corre) */}
      <group ref={pulsos}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[1.75 - i * 0.9, 0.09, 0]}>
            <boxGeometry args={[0.42, 0.035, 0.13]} />
            <meshLambertMaterial color={mezclar(P.guarapo, '#f0c86a', 0.55)} flatShading />
          </mesh>
        ))}
      </group>
      {/* el chorrito que cae del pico de la canoa al recibidor */}
      <group position={[-2.0, -0.12, 0]}>
        <mesh ref={chorro} position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.035, 0.05, 0.3, 5]} />
          <meshLambertMaterial color={mezclar(P.guarapo, '#f0c86a', 0.4)} flatShading />
        </mesh>
        {/* el RECIBIDOR: el cajón de madera donde llega el guarapo antes de
            pasar a la paila (así es en el trapiche de verdad) */}
        <mesh position={[-0.1, -0.32, 0]}>
          <boxGeometry args={[0.55, 0.34, 0.45]} />
          <meshLambertMaterial color={mezclar(P.maderaVieja, '#5c4228', 0.3)} flatShading />
        </mesh>
        <mesh position={[-0.1, -0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.45, 0.36]} />
          <meshLambertMaterial color={P.guarapo} />
        </mesh>
      </group>
      {/* dos horquetas cortas que la sostienen */}
      <mesh position={[-1.3, -0.2, 0]}>
        <cylinderGeometry args={[0.045, 0.06, 0.36, 5]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      <mesh position={[1.3, -0.2, 0]}>
        <cylinderGeometry args={[0.045, 0.06, 0.36, 5]} />
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
  const espuma = useRef(null);
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
    // la espuma de la cachaza gira despacio hacia la orilla de la paila
    if (espuma.current && !reducedMotion) {
      espuma.current.rotation.y = t * 0.35;
      espuma.current.children.forEach((e, i) => {
        e.scale.setScalar(0.85 + Math.sin(t * 2.1 + i * 1.7) * 0.2);
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
      {/* la ESPUMA de la cachaza: motas claras que giran hacia la orilla,
          esperando el cucharón (esa limpieza es la que da panela clara) */}
      <group ref={espuma} position={[0, 1.12, 0]}>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          const r = 0.34 + (i % 2) * 0.12;
          return (
            <mesh key={i} position={[Math.cos(a) * r, 0.015, Math.sin(a) * r]} scale={[1, 0.5, 1]}>
              <sphereGeometry args={[0.06, 5, 4]} />
              <meshLambertMaterial color={P.espuma} flatShading />
            </mesh>
          );
        })}
      </group>
      {/* la olla de barro donde va la cachaza retirada, con su cucharón */}
      <group position={[0.95, 0, 0.55]}>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.2, 0.14, 0.4, 8]} />
          <meshLambertMaterial color={mezclar(P.adobe, '#7a4a2e', 0.35)} flatShading />
        </mesh>
        <mesh position={[0, 0.41, 0]} scale={[1, 0.4, 1]}>
          <sphereGeometry args={[0.16, 6, 4]} />
          <meshLambertMaterial color={P.cachaza} flatShading />
        </mesh>
        {/* el cucharón de retirar espuma, recostado a la olla */}
        <group position={[0.14, 0.3, 0.1]} rotation={[0.15, 0.4, -0.9]}>
          <mesh>
            <cylinderGeometry args={[0.018, 0.022, 0.85, 5]} />
            <meshLambertMaterial color={P.maderaClara} flatShading />
          </mesh>
          <mesh position={[0, -0.44, 0]} scale={[1, 0.45, 1]}>
            <sphereGeometry args={[0.07, 6, 5]} />
            <meshLambertMaterial color={mezclar(P.maderaClara, '#8a6a3e', 0.4)} flatShading />
          </mesh>
        </group>
      </group>
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
   panelas ya cuajadas, unas en el molde y otras apiladas para el mercado.
   La casilla del medio CUAJA a la vista: la miel dorada oscurece despacio
   hasta el pardo panela, en ciclo (antes la panela nunca cuajaba). */
function MesaGaveras({ reducedMotion }) {
  const cuajando = useRef(null);
  const colMiel = useMemo(() => new THREE.Color(mezclar(P.guarapo, '#f0c86a', 0.35)), []);
  const colPanela = useMemo(() => new THREE.Color(P.panela), []);
  useFrame(({ clock }) => {
    const m = cuajando.current;
    if (reducedMotion || !m) return;
    const f = smoothstep(0.15, 0.85, (clock.elapsedTime * 0.09) % 1);
    m.material.color.lerpColors(colMiel, colPanela, f);
    // al cuajar se asienta un pelín (squash lento de asentarse)
    m.scale.y = 1.15 - f * 0.15;
  });
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
        {/* las panelas dentro de sus casillas: la del medio cuajando en vivo */}
        {[-0.335, 0, 0.335].map((x, i) => (
          <mesh key={i} position={[x, 0.09, 0]} ref={i === 1 ? cuajando : undefined}>
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

/* El recorrido de la caña a la panela: caña → molino → jugo → paila →
   panela. Única fuente de verdad para la etiqueta 3D, el botón del pie y a
   dónde se acerca la cámara — antes `etiquetas` era un booleano todo-o-nada
   y esto vivía repetido e inconexo. */
const RECORRIDO_PANELA = [
  /* Cada paso conserva el objetivo y define un ojo propio. El primer ojo
     entra por el lado sur del cañal, lejos de la enramada, para que se lean
     los nudos del tallo en vez de mirar la mata desde el trapiche. */
  { paso: 1, texto: 'La caña', pos: [9.5, 3.6, -4.5], ojo: [10.4, 5.2, 3.3] },
  { paso: 2, texto: 'El molino', pos: [6.2, 2.5, 1.6], ojo: [8.0, 4.8, 8.1] },
  { paso: 3, texto: 'El jugo', pos: [4.8, 1.9, 2.8], ojo: [7.3, 4.2, 9.1] },
  { paso: 4, texto: 'La paila', pos: [3.2, 2.5, 4.3], ojo: [5.2, 4.8, 10.7] },
  { paso: 5, texto: 'La panela', pos: [0.7, 2.0, 5.9], ojo: [2.4, 4.1, 12.5] },
];
/* A dónde mira la cámara cuando no hay paso activo. Corrido un pelo hacia el
   trapiche (0.5→0.9 en x): en el teléfono el molino entero quedaba por fuera
   del borde derecho y la copia prometía un buey que nunca aparecía. */
const OBJETIVO_CALMA = [0.9, 1.0, 1.8];

/* Las etiquetas del paso a paso panelero. Solo la del paso activo se resalta
   (clase CSS, sin tocar geometría ni materiales de Three). */
function PasosPanela({ pasoActivo }) {
  return (
    <>
      {RECORRIDO_PANELA.map((p) => (
        <Etiqueta key={p.paso} pos={p.pos} paso={String(p.paso)} texto={p.texto} activo={pasoActivo === p.paso} />
      ))}
    </>
  );
}

/* Lleva el objetivo y el ojo de OrbitControls al encuadre del paso activo.
   Sin reducedMotion camina suave (lerp); con reducedMotion salta directo. */
function EnfocarPaso({ paso, reducedMotion, controlsRef }) {
  const encuadre = useMemo(() => {
    const destino = paso > 0 ? RECORRIDO_PANELA[paso - 1] : null;
    return {
      objetivo: new THREE.Vector3(...(destino?.pos || OBJETIVO_CALMA)),
      ojo: destino ? new THREE.Vector3(...destino.ojo) : null,
    };
  }, [paso]);
  useFrame((_state, delta) => {
    const controles = controlsRef.current;
    if (!controles) return;
    if (reducedMotion) {
      controles.target.copy(encuadre.objetivo);
      if (encuadre.ojo) controles.object.position.copy(encuadre.ojo);
    } else {
      const avance = Math.min(1, delta * 1.4);
      controles.target.lerp(encuadre.objetivo, avance);
      if (encuadre.ojo) controles.object.position.lerp(encuadre.ojo, avance);
    }
    controles.update();
  });
  /* Anclas inertes (sin geometría ni material): exponen declarativamente el
     objetivo y el ojo del encuadre activo, y sirven de gancho de prueba. */
  return (
    <>
      <group
        name="foco-paso"
        position={[encuadre.objetivo.x, encuadre.objetivo.y, encuadre.objetivo.z]}
      />
      {encuadre.ojo && <group name="ojo-paso" position={encuadre.ojo.toArray()} />}
    </>
  );
}

/* ══════════════════════ LA GENTE DEL TRAPICHE ══════════════════════ */
/* La copia hablaba del panelero que conoce el punto y del saber que pasa de
   abuela a nieta — y en escena no había NI UNA persona. Aquí llegan las dos,
   rubber-hose de la casa (línea de tinta gruesa, guantes, squash & stretch),
   como billboards SVG con el MISMO patrón de `Bicho` (Html + distanceFactor). */

/* El panelero: sombrero aguadeño, camisa remangada y el MECEDOR en la mano,
   revolviendo la paila sin afán. El brazo del mecedor gira por CSS. */
function PaneleroSVG({ alto = 116 }) {
  return (
    <svg
      width={(120 / 150) * alto}
      height={alto}
      viewBox="0 0 120 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* el brazo del mecedor, DETRÁS del cuerpo, girando desde el hombro */}
      <g className="pan-brazo">
        {/* el mecedor: palo largo con su paleta, hacia la paila */}
        <line x1="92" y1="50" x2="36" y2="126" stroke={ROPA.tinta} strokeWidth="7" strokeLinecap="round" />
        <line x1="92" y1="50" x2="36" y2="126" stroke={P.maderaClara} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="33" cy="131" rx="12.5" ry="7.5" transform="rotate(-53 33 131)" fill={P.maderaClara} stroke={ROPA.tinta} strokeWidth="1.6" />
        {/* el brazo-manguera y el guante que agarra el palo */}
        <path d="M66 57 Q76 62 80 68" stroke={ROPA.tinta} strokeWidth="6.5" strokeLinecap="round" />
        <circle cx="81" cy="70" r="6.5" fill={ROPA.guante} stroke={ROPA.tinta} strokeWidth="2.2" />
      </g>
      {/* cuerpo + cabeza (respiran juntos) */}
      <g className="pan-cuerpo">
        {/* piernas y botas */}
        <line x1="49" y1="102" x2="46" y2="132" stroke={ROPA.pantalon} strokeWidth="9" strokeLinecap="round" />
        <line x1="62" y1="102" x2="65" y2="132" stroke={ROPA.pantalon} strokeWidth="9" strokeLinecap="round" />
        <ellipse cx="44" cy="138" rx="8.5" ry="4.5" fill={ROPA.tinta} />
        <ellipse cx="67" cy="138" rx="8.5" ry="4.5" fill={ROPA.tinta} />
        {/* la camisa de faena */}
        <path
          d="M43 50 Q55 44 68 50 L71 94 Q55 101 40 94 Z"
          fill={ROPA.camisa}
          stroke={ROPA.tinta}
          strokeWidth="2.5"
        />
        {/* el pantalón a la cintura */}
        <path d="M40 90 L71 90 L70 106 Q55 111 41 106 Z" fill={ROPA.pantalon} stroke={ROPA.tinta} strokeWidth="2.2" />
        {/* el brazo izquierdo en jarra */}
        <path d="M45 58 Q31 66 38 77" stroke={ROPA.tinta} strokeWidth="6.5" strokeLinecap="round" fill="none" />
        <circle cx="39" cy="79" r="6" fill={ROPA.guante} stroke={ROPA.tinta} strokeWidth="2.2" />
        {/* la cabeza: cachetes, bigote y sonrisa de quien conoce el punto */}
        <circle cx="55" cy="35" r="13" fill={ROPA.piel} stroke={ROPA.tinta} strokeWidth="2.5" />
        <circle cx="50.5" cy="33" r="1.9" fill={ROPA.tinta} />
        <circle cx="60.5" cy="33" r="1.9" fill={ROPA.tinta} />
        <path d="M47 38 Q51 42 55 39 Q59 42 63 38" stroke={ROPA.tinta} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M50 44 Q55 47 60 44" stroke={ROPA.tinta} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* el aguadeño: ala ancha y copa con cinta */}
        <ellipse cx="55" cy="25" rx="25" ry="7" fill={ROPA.sombrero} stroke={ROPA.tinta} strokeWidth="2.5" />
        <path d="M42 24 Q42 10 55 10 Q68 10 68 24 Z" fill={ROPA.sombrero} stroke={ROPA.tinta} strokeWidth="2.5" />
        <rect x="42" y="19" width="26" height="4.5" fill={ROPA.tinta} />
      </g>
    </svg>
  );
}

/* La yerbatera de la botica: ruana de índigo con su guarda de maíz, pañoleta
   de cochinilla, canasto al brazo y el manojo de hierbas en alto — el saber
   que pasa de abuela a nieta, presente en escena. */
function YerbateraSVG({ alto = 108 }) {
  return (
    <svg
      width={(110 / 150) * alto}
      height={alto}
      viewBox="0 0 110 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g className="bot-cuerpo">
        {/* alpargatas */}
        <ellipse cx="42" cy="140" rx="8" ry="4" fill={ROPA.sombrero} stroke={ROPA.tinta} strokeWidth="2" />
        <ellipse cx="63" cy="140" rx="8" ry="4" fill={ROPA.sombrero} stroke={ROPA.tinta} strokeWidth="2" />
        {/* la falda de tierra */}
        <path d="M32 96 L74 96 L79 132 Q53 138 27 132 Z" fill={ROPA.falda} stroke={ROPA.tinta} strokeWidth="2.4" />
        {/* la ruana de índigo con su guarda */}
        <path d="M36 46 L70 46 L79 98 Q53 106 26 98 Z" fill={ROPA.ruana} stroke={ROPA.tinta} strokeWidth="2.5" />
        <path d="M29 88 Q53 96 77 88" stroke={ROPA.ruanaGuarda} strokeWidth="3.5" fill="none" />
        <path d="M53 46 L53 62" stroke={ROPA.tinta} strokeWidth="2" />
        {/* el brazo del canasto */}
        <path d="M38 60 Q26 72 30 86" stroke={ROPA.tinta} strokeWidth="6" strokeLinecap="round" fill="none" />
        <circle cx="30" cy="88" r="5" fill={ROPA.piel} stroke={ROPA.tinta} strokeWidth="2" />
        {/* el canasto con sus matas recogidas */}
        <path d="M16 92 Q28 88 40 92 L37 104 Q28 108 19 104 Z" fill={P.maderaClara} stroke={ROPA.tinta} strokeWidth="2.2" />
        <path d="M18 97 Q28 100 38 97" stroke={ROPA.tinta} strokeWidth="1.4" fill="none" />
        <circle cx="23" cy="90" r="3.4" fill={P.hierbabuena} />
        <circle cx="29" cy="88" r="3.8" fill={P.ortiga} />
        <circle cx="35" cy="90" r="3.2" fill={P.limoncillo} />
        {/* la cabeza: gafitas redondas y sonrisa de abuela */}
        <circle cx="53" cy="32" r="12" fill={ROPA.piel} stroke={ROPA.tinta} strokeWidth="2.5" />
        <circle cx="48.5" cy="31" r="3.6" fill="none" stroke={ROPA.tinta} strokeWidth="1.6" />
        <circle cx="58.5" cy="31" r="3.6" fill="none" stroke={ROPA.tinta} strokeWidth="1.6" />
        <line x1="52.1" y1="31" x2="55" y2="31" stroke={ROPA.tinta} strokeWidth="1.6" />
        <circle cx="48.5" cy="31.5" r="1.5" fill={ROPA.tinta} />
        <circle cx="58.5" cy="31.5" r="1.5" fill={ROPA.tinta} />
        <path d="M48 39 Q53 43 58 39" stroke={ROPA.tinta} strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* la pañoleta de cochinilla, con su nudo */}
        <path d="M41 30 Q41 16 53 16 Q65 16 65 30 Q53 24 41 30 Z" fill={ROPA.panoleta} stroke={ROPA.tinta} strokeWidth="2.4" />
        <path d="M63 30 Q70 34 68 40" stroke={ROPA.panoleta} strokeWidth="5" strokeLinecap="round" fill="none" />
        {/* la trenza negra */}
        <path d="M43 34 Q38 46 40 56" stroke={ROPA.tinta} strokeWidth="4.5" strokeLinecap="round" fill="none" />
      </g>
      {/* el brazo del manojo, en alto, meciéndose (mostrándole a la nieta) */}
      <g className="bot-brazo">
        <path d="M68 58 Q80 52 86 42" stroke={ROPA.tinta} strokeWidth="6" strokeLinecap="round" fill="none" />
        <circle cx="87" cy="41" r="5" fill={ROPA.piel} stroke={ROPA.tinta} strokeWidth="2" />
        {/* el manojo de hierbas con su florecita */}
        <path d="M87 38 Q84 26 78 20" stroke={P.ortiga} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d="M88 37 Q89 24 86 16" stroke={P.hierbabuena} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d="M89 38 Q95 27 100 23" stroke={P.limoncillo} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <circle cx="86" cy="14" r="3" fill={P.manzanillaFlor} stroke="#e2b93b" strokeWidth="1.4" />
        <circle cx="101" cy="21" r="2.6" fill={P.calendulaFlor} />
      </g>
    </svg>
  );
}

/* Una persona en escena: billboard Html con el patrón exacto de `Bicho`.
   `espejo` voltea el dibujo (scaleX -1): el mismo SVG sirve mirando a
   cualquiera de los dos lados sin duplicar arte. */
function Persona({ pos, df = 7, reducedMotion, espejo = false, title, children }) {
  return (
    <group position={pos}>
      <Html center distanceFactor={df} zIndexRange={[24, 0]}>
        <div
          className={`mundo-fauna bocana-persona${reducedMotion ? ' bocana-persona--quieta' : ''}`}
          aria-hidden="true"
          title={title}
          style={espejo ? { transform: 'scaleX(-1)' } : undefined}
        >
          {children}
        </div>
      </Html>
    </group>
  );
}

/* ══════════════════════ LA ESCENA COMPLETA ══════════════════════ */

function EscenaBoticaCana({ tier, reducedMotion, etiquetas, paso }) {
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
      {/* la niebla, corrida bien lejos: antes lavaba el cañal y las lomas
          hasta dejar el fondo lechoso */}
      {perfil.fog && (
        <fog attach="fog" args={[DIA.niebla, DIA.nieblaCerca + 12, DIA.nieblaLejos + 14]} />
      )}
      <LucesDia />
      <NubesDia />
      {/* el horizonte que ATERRIZA la maqueta: falda de pasto + lomas */}
      <FondoLomas />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* la botica y sus siete matas, con su brisa */}
      <Botica etiquetas={etiquetas} reducedMotion={reducedMotion} />

      {/* la caña y la panela, el proceso en línea */}
      <Canal tier={tier} />
      <Trapiche reducedMotion={reducedMotion} />
      <CanalGuarapo reducedMotion={reducedMotion} />
      <Hornilla reducedMotion={reducedMotion} tier={tier} />
      <MesaGaveras reducedMotion={reducedMotion} />
      {etiquetas && <PasosPanela pasoActivo={paso} />}

      {/* LA GENTE: el panelero en su paila y la yerbatera en su botica */}
      {/* El panelero pasa al lado IZQUIERDO de la hornilla y ESPEJADO: donde
          estaba (4.35, a la derecha de la paila) el encuadre del teléfono lo
          cortaba por la mitad y el mecedor —el gesto de revolver que ya
          traía— se quedaba fuera de pantalla: parecía parado sin oficio.
          Aquí queda entero, con el mecedor metido EN la paila y sin taparle
          la boca del fogón a la llama. */}
      <Persona
        pos={[2.2, Y_PATIO + 0.82, 4.9]}
        reducedMotion={reducedMotion}
        espejo
        title="El panelero, revolviendo la paila hasta el punto"
      >
        <PaneleroSVG />
      </Persona>
      <Persona
        pos={[-5.3, Y_PATIO + 0.78, 5.4]}
        reducedMotion={reducedMotion}
        title="La yerbatera de la botica, con su manojo y su canasto"
      >
        <YerbateraSVG />
      </Persona>

      {/* el camino de piedra pisada que cose la botica con el trapiche —
          antes ahí había un hueco de pasto vacío con una piedra sola */}
      {[
        [-3.4, 3.9], [-2.3, 3.6], [-1.2, 3.4], [-0.1, 3.3], [1.0, 3.35], [2.0, 3.5],
      ].map((c, i) => (
        <mesh
          key={`c${i}`}
          position={[c[0], alturaFinca(c[0], c[1]) + 0.04, c[1]]}
          rotation={[0, i * 1.2, 0]}
          scale={[1, 0.16, 0.8]}
        >
          <dodecahedronGeometry args={[0.34 + (i % 3) * 0.05]} />
          <meshLambertMaterial color={mezclar(P.piedra, P.patio, 0.35)} flatShading />
        </mesh>
      ))}
      {/* los costales de panela arrimados junto a la mesa, listos pal mercado */}
      <group position={[-0.7, Y_PATIO, 5.3]} rotation={[0, -0.4, 0]}>
        {[0, 1].map((i) => (
          <mesh key={i} position={[i * 0.5, 0.32, i * 0.12]} rotation={[0, i * 0.5, 0]} scale={[1, 1.15, 1]}>
            <cylinderGeometry args={[0.26, 0.3, 0.56, 7]} />
            <meshLambertMaterial color={mezclar(P.paja, '#b8a67a', 0.55)} flatShading />
          </mesh>
        ))}
        {/* la boca amarrada del costal */}
        <mesh position={[0, 0.66, 0]}>
          <sphereGeometry args={[0.12, 6, 5]} />
          <meshLambertMaterial color={mezclar(P.paja, '#8a7a52', 0.6)} flatShading />
        </mesh>
      </group>
      {/* la múcura de barro con agua, a la sombra de la botica */}
      <group position={[-3.3, Y_PATIO, 5.1]}>
        <mesh position={[0, 0.26, 0]} scale={[1, 1.15, 1]}>
          <sphereGeometry args={[0.24, 8, 6]} />
          <meshLambertMaterial color={mezclar(P.adobe, '#8a5a3a', 0.4)} flatShading />
        </mesh>
        <mesh position={[0, 0.56, 0]}>
          <cylinderGeometry args={[0.09, 0.13, 0.16, 7]} />
          <meshLambertMaterial color={mezclar(P.adobe, '#6a3a22', 0.35)} flatShading />
        </mesh>
      </group>
      {/* el bagazo TENDIDO A SECAR entre el molino y la hornilla: la leña de
          la propia hornilla — el circuito cerrado que la copia ya contaba */}
      <group position={[4.9, Y_PATIO, 3.4]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.05, 0]} scale={[1, 0.12, 0.7]}>
          <sphereGeometry args={[0.75, 7, 5]} />
          <meshLambertMaterial color={mezclar(P.paja, '#c2b183', 0.6)} flatShading />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[-0.4 + i * 0.26, 0.1, (i % 2) * 0.2 - 0.1]}
            rotation={[0, i * 0.8, Math.PI / 2 - 0.12]}
          >
            <cylinderGeometry args={[0.03, 0.04, 0.55, 4]} />
            <meshLambertMaterial color={mezclar(P.paja, '#d8c894', 0.5)} flatShading />
          </mesh>
        ))}
      </group>

      {/* unas piedras que amueblan el borde del patio */}
      {[
        [10.2, 3.6, 0.4], [-9.8, 0.2, 0.34],
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
.bocana-recorrido { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.45rem; }
.bocana-carta { margin: 0; max-width: 34rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(74,52,24,0.66); backdrop-filter: blur(3px); color: #fbf3e2; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.bocana-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(74,52,24,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(255,247,228,0.85); color: #5a3f1c; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.bocana-boton:hover, .bocana-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(74,52,24,0.6); outline: none; }
.bocana-boton[aria-pressed='true'] { background: #ffe8b0; border-color: rgba(90,63,28,0.75); color: #4a3418; }
.bocana-chip { pointer-events: none; display: inline-flex; align-items: center; gap: 0.3em; padding: 2px 8px; border-radius: 999px; background: rgba(58,42,24,0.82); color: #fdf6e3; font: 600 10px/1.5 system-ui, sans-serif; white-space: nowrap; box-shadow: 0 2px 6px rgba(40,28,10,0.3); }
.bocana-chip b { display: inline-flex; align-items: center; justify-content: center; width: 1.35em; height: 1.35em; border-radius: 50%; background: #e8a24a; color: #3c2410; font-size: 9px; }
.bocana-chip--activo { background: #e8a24a; color: #2c1c0a; box-shadow: 0 0 0 2px rgba(255,255,255,0.85), 0 3px 10px rgba(40,28,10,0.4); }
.bocana-chip--activo b { background: #fdf6e3; color: #6b3e12; }
.mundo-fauna { pointer-events: none; filter: drop-shadow(0 2px 5px rgba(40, 30, 10, 0.24)); }
.bocana-persona svg { overflow: visible; }
.pan-brazo { transform-box: view-box; transform-origin: 66px 57px; animation: bocanaRevolver 2.6s ease-in-out infinite; }
.pan-cuerpo { transform-box: view-box; transform-origin: 55px 138px; animation: bocanaFaena 2.6s ease-in-out infinite; }
.bot-brazo { transform-box: view-box; transform-origin: 68px 58px; animation: bocanaManojo 3.6s ease-in-out infinite; }
.bot-cuerpo { transform-box: view-box; transform-origin: 53px 140px; animation: bocanaFaena 3.6s ease-in-out infinite reverse; }
@keyframes bocanaRevolver { 0%, 100% { transform: rotate(-7deg); } 50% { transform: rotate(9deg); } }
@keyframes bocanaFaena { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.975); } }
@keyframes bocanaManojo { 0%, 100% { transform: rotate(5deg); } 50% { transform: rotate(-8deg); } }
.bocana-persona--quieta *, .bocana-persona--quieta { animation: none !important; }
@media (prefers-reduced-motion: reduce) { .pan-brazo, .pan-cuerpo, .bot-brazo, .bot-cuerpo { animation: none !important; } }
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
  /* 0 = vista calma (sin etiquetas); 1..5 = paso activo del recorrido
     caña→panela. Antes esto era un booleano todo-o-nada que no movía la
     cámara ni distinguía un paso de otro. */
  const [paso, setPaso] = useState(0);
  const etiquetas = paso > 0;
  const controlsRef = useRef(/** @type {any} */ (null));
  const tier = useMemo(() => decidirTier().tier, []);
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const perfil = perfilDeTier(tier);
  /* El encuadre según el formato: en VERTICAL (el teléfono, el formato de
     Chagra) la cámara nace más alta, más lejos y con más campo — antes el
     móvil mostraba dos tercios de pasto y ni el trapiche ni la botica. En
     ancho baja (6.5 → 4.9) para mirar POR DEBAJO del techo de la enramada. */
  const camaraInicial = useMemo(() => {
    const vertical =
      typeof window !== 'undefined' && window.innerWidth < window.innerHeight;
    return vertical
      ? { position: [-8.0, 7.4, 15.2], fov: 58 }
      : { position: [2.0, 4.9, 14.8], fov: 45 };
  }, []);

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
          camera={camaraInicial}
          frameloop={reducedMotion ? 'demand' : 'always'}
          onCreated={() => setListo(true)}
        >
          <EscenaBoticaCana tier={tier} reducedMotion={reducedMotion} etiquetas={etiquetas} paso={paso} />
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enablePan={false}
            enableZoom
            minDistance={7}
            maxDistance={22}
            target={paso > 0 ? RECORRIDO_PANELA[paso - 1].pos : OBJETIVO_CALMA}
            minPolarAngle={0.5}
            maxPolarAngle={1.4}
            minAzimuthAngle={-1.05}
            maxAzimuthAngle={1.05}
            enableDamping
            dampingFactor={0.08}
            autoRotate={!reducedMotion}
            autoRotateSpeed={0.08}
          />
          <EnfocarPaso paso={paso} reducedMotion={reducedMotion} controlsRef={controlsRef} />
          <AdaptiveDpr pixelated />
        </Canvas>

        <div className="bocana-chrome">
          <div className="bocana-pie">
            <ol className="bocana-recorrido" aria-label="Recorrido de la caña a la panela">
              {RECORRIDO_PANELA.map((p) => (
                <li key={p.paso}>
                  <button
                    type="button"
                    className="bocana-boton"
                    aria-pressed={paso === p.paso}
                    onClick={() => setPaso((actual) => (actual === p.paso ? 0 : p.paso))}
                  >
                    {p.paso}. {p.texto}
                  </button>
                </li>
              ))}
            </ol>
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
