/*
 * MundoLecheria3D — la LECHERÍA CAMPESINA andina en un solo rincón 3D de la
 * finca (ruta #/mockups/mundo-lecheria-3d · prod #diorama_lecheria).
 *
 * Del potrero al queso, el proceso completo legible de una mirada:
 *
 *   - EL POTRERO EN ROTACIÓN: dos mangas divididas por la cerca — una con el
 *     hato pastando (cuatro vacas y su ternero) y la otra DESCANSANDO con el
 *     pasto crecido. Al fondo la CERCA VIVA: árboles sembrados de poste que
 *     dan sombra, forraje y leña sin comprar alambre de púas cada año.
 *
 *   - EL ORDEÑO: la ramada de paja con la vaca mansa, el campesino en su
 *     butaco ordeñando al balde, el balde de agua limpia del lavado de la
 *     ubre, y la CANTINA con el embudo y el lienzo: la leche se cuela apenas
 *     sale — la higiene es la mitad del queso.
 *
 *   - LA QUESERÍA: la casita encalada de teja donde la leche se TRANSFORMA:
 *     la olla sobre la hornilla con la cuajada cortada en cruz, el frasquito
 *     de cuajo en su repisa, la mesa con el molde y la piedra de prensar, y
 *     el queso campesino fresco escurriendo su suero en la tabla.
 *
 *   - EL CICLO QUE NO BOTA NADA: el suero baja por la canoa a los cerdos y
 *     las gallinas; la boñiga del potrero va al montón de abono y el abono
 *     vuelve al pasto. Economía circular campesina de toda la vida.
 *
 * DIRECCIÓN DE ARTE (todo dentro del framework, nada inventado por fuera):
 *   - Atmósfera de la MAÑANA del kit (`CIELOS_HORA.manana`): el ordeño es
 *     faena de madrugada y a media mañana ya hay cuajada en la olla.
 *   - Materiales de `PALETA`/`mezclar` (atmosferaMadre): Lambert flatShading,
 *     cero texturas, cero CDN. La ley de coherencia del valle.
 *   - La fauna chica es la MISMA librería rubber-hose (`Bicho` de
 *     FaunaEscena): mariposa y colibrí en la cerca viva, lombriz en el abono.
 *   - Polen del kit (`ParticulasAmbientales`) sobre el potrero florecido.
 *
 * RENDIMIENTO: pasto y cerca viva instanciados (3 draw calls para toda la
 * pastura), Lambert sin shadow-map, presupuestos por `perfilDeTier`;
 * `reducedMotion` congela colas, chorrito, vapor y gallinas y pasa el
 * frameloop a demanda. Gama baja no llega aquí (la vitrina 2D la cubre).
 *
 * Ruta mockup: #/mockups/mundo-lecheria-3d (cableada en App.jsx, sin auth).
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

/* La mañana fresca del kit: única fuente de la atmósfera de esta escena. */
const DIA = CIELOS_HORA.manana;

/* La paleta del framework entintada apenas hacia la luz de la mañana. */
const TINTE = DIA.niebla;
const P = {
  pasto: mezclar('#79a24e', TINTE, 0.2), // la manga donde pasta el hato
  pastoFresco: mezclar('#5f9a3e', TINTE, 0.16), // la manga en descanso, crecida
  pastoSeco: mezclar('#a5a35e', TINTE, 0.22), // motas pajizas al sol
  patio: mezclar('#a98e63', TINTE, 0.24), // tierra apisonada del ordeño
  piso: mezclar('#b8ac90', TINTE, 0.28), // el piso alisado de la quesería
  maderaVieja: mezclar('#755738', TINTE, 0.2), // postes, butaco, canoa
  maderaClara: mezclar('#a5804e', TINTE, 0.22), // tablas y mesa
  paja: mezclar('#c9a860', TINTE, 0.22), // el techo de la ramada
  encalado: mezclar('#efe7d2', TINTE, 0.12), // la pared blanca de cal
  zocalo: mezclar('#9a4f36', TINTE, 0.2), // el zócalo rojizo
  teja: mezclar('#a35a38', TINTE, 0.2), // la teja de barro
  adobe: mezclar('#95583a', TINTE, 0.22), // la hornilla
  aluminio: mezclar('#c3c4bd', TINTE, 0.18), // cantina, balde, olla
  leche: mezclar('#f4efdf', TINTE, 0.06), // la leche recién colada
  cuajada: mezclar('#efe8d0', TINTE, 0.08), // los dados de cuajada
  queso: mezclar('#ecdfae', TINTE, 0.08), // el queso campesino fresco
  suero: mezclar('#ded393', TINTE, 0.1), // el suero verdoso que se aparta
  vacaBlanca: mezclar('#e8e2d2', TINTE, 0.1), // la holstein
  vacaNegra: mezclar('#3a3632', TINTE, 0.14), // sus manchas
  vacaParda: mezclar('#8a6a48', TINTE, 0.14), // la criolla parda
  ternero: mezclar('#c2a075', TINTE, 0.12), // el ternero clarito
  ubre: mezclar('#d9a08a', TINTE, 0.1),
  cerdo: mezclar('#d8a08e', TINTE, 0.12),
  gallina: mezclar('#9a6b3e', TINTE, 0.14),
  cresta: mezclar('#c43a2e', TINTE, 0.08),
  ruana: mezclar('#6a4f36', TINTE, 0.16), // la ruana del ordeñador
  sombrero: mezclar('#c9ab6e', TINTE, 0.18),
  piel: mezclar('#b98a62', TINTE, 0.12),
  bota: mezclar('#2e2a26', TINTE, 0.14), // la bota de caucho
  abono: mezclar('#4a3a26', TINTE, 0.16), // el montón que madura
  bonhiga: mezclar('#5c4a2e', TINTE, 0.18),
  copaViva: mezclar('#4e7e3a', TINTE, 0.18), // la copa de la cerca viva
  florVivo: mezclar('#e8b83a', TINTE, 0.08), // la flor amarilla del matarratón
  piedra: mezclar(PALETA.piedra, TINTE, 0.3),
  agua: mezclar('#8fb6c9', TINTE, 0.15),
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

/* La geografía: la ladera lechera — el potrero abierto a la izquierda con sus
   dos mangas, el patio del ordeño al centro y la quesería a la derecha. */
const ANCHO = 38;
const FONDO = 30;
/* Peso de "explanada": 1 donde la faena aplana el piso, 0 en la loma. */
function explanada(wx, wz) {
  return Math.max(
    gauss(wx, wz, 2.6, 2.2, 3.6, 3.0), // el patio del ordeño
    gauss(wx, wz, 8.6, 4.4, 3.8, 3.2), // la quesería
    gauss(wx, wz, 11.4, 7.6, 2.6, 2.2), // la canoa de los cerdos
  );
}
function alturaFinca(wx, wz) {
  let h = 0.55 + ruido(wx * 0.42, wz * 0.42) * 0.2;
  h += gauss(wx, wz, -15, -12, 6.5, 4.4) * 2.4; // loma occidental
  h += gauss(wx, wz, 13, -12, 7.0, 4.6) * 2.7; // loma oriental
  h += gauss(wx, wz, -1, -14, 9.0, 3.4) * 1.9; // el fondo que cierra
  // el potrero es falda mansa: se suaviza sin aplanarse del todo
  h -= gauss(wx, wz, -8, 0.5, 6.5, 5.0) * 0.25;
  // la faena aplana: las explanadas caen al nivel del patio
  const f = clamp(explanada(wx, wz) * 1.2, 0, 1);
  return h * (1 - f) + 0.55 * f;
}
const Y_PATIO = 0.55;
/* La manga en descanso: al occidente de la cerca interior (x < -8). */
const X_CERCA = -8;

/* Malla del terreno con colores por vértice: la manga pastada rala, la manga
   en descanso verde y crecida, tierra apisonada en el ordeño, piso claro en
   la quesería. */
function construirTerreno(seg, plano) {
  const nx = seg + 1, nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cPasto = new THREE.Color(P.pasto);
  const cFresco = new THREE.Color(P.pastoFresco);
  const cSeco = new THREE.Color(P.pastoSeco);
  const cPatio = new THREE.Color(P.patio);
  const cPiso = new THREE.Color(P.piso);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaFinca(wx, wz);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      // base: pasto con motas secas donde el hato ya comió
      c.lerpColors(cPasto, cSeco, smoothstep(-0.3, 1.0, ruido(wx + 3, wz - 2)) * 0.55);
      // la manga en descanso, más verde y pareja (rotación de potreros)
      const descanso = smoothstep(X_CERCA + 1.2, X_CERCA - 1.2, wx) *
        smoothstep(8.5, 5.5, Math.abs(wz - 0.5));
      c.lerp(cFresco, descanso * 0.75);
      // tierra apisonada del patio del ordeño y piso de la quesería
      c.lerp(cPatio, clamp(gauss(wx, wz, 2.6, 2.2, 2.8, 2.3) * 0.95, 0, 0.85));
      c.lerp(cPiso, clamp(gauss(wx, wz, 8.6, 4.4, 2.6, 2.2) * 1.0, 0, 0.9));
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

/* Nubes de la mañana: esferas planas, quietas, muy lejos. */
function NubesDia() {
  const nubes = [
    [-12, 9.2, -13, 3.4],
    [3, 10.4, -14, 2.5],
    [13, 8.9, -12, 3.0],
  ];
  return (
    <group>
      {nubes.map((n, i) => (
        <mesh key={i} position={[n[0], n[1], n[2]]} scale={[n[3], n[3] * 0.32, n[3] * 0.7]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#fdf7e8" transparent opacity={0.85} depthWrite={false} />
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
        <div className="lechd-chip" aria-hidden="true">
          {paso != null && <b>{paso}</b>}
          {texto}
        </div>
      </Html>
    </group>
  );
}

/* ══════════════════════ EL POTRERO EN ROTACIÓN ══════════════════════ */

/* La pastura instanciada: matas de pasto = 1 draw call. En la manga en
   descanso el pasto va más alto y tupido (eso ES la rotación, visible). */
function Pastura({ n }) {
  const matas = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(133);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 12) {
      intentos += 1;
      const wx = -17 + rng() * 16.5;
      const wz = -6.5 + rng() * 13.0;
      const y = alturaFinca(wx, wz);
      if (y > 1.9) continue; // el pasto de la falda, no de la loma
      if (gauss(wx, wz, 2.6, 2.2, 2.8, 2.3) > 0.4) continue; // no invade el patio
      const descansando = wx < X_CERCA - 0.4;
      // en la manga pastada solo quedan matas ralas
      if (!descansando && rng() > 0.42) continue;
      lista.push({
        wx, wz, y,
        esc: descansando ? 0.9 + rng() * 0.55 : 0.4 + rng() * 0.3,
        giro: rng() * Math.PI * 2,
        verde: descansando ? 1 : rng() * 0.5,
      });
    }
    return lista;
  }, [n]);

  useEffect(() => {
    const m = matas.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const cRalo = new THREE.Color(mezclar(P.pastoSeco, P.pasto, 0.4));
    const cAlto = new THREE.Color(P.pastoFresco);
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y + 0.16 * s.esc, s.wz);
      dummy.rotation.set(0, s.giro, 0);
      dummy.scale.set(s.esc, s.esc, s.esc);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tinte.lerpColors(cRalo, cAlto, s.verde).offsetHSL(0, 0, (i % 5) * 0.012 - 0.024);
      m.setColorAt(i, tinte);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [sitios]);

  return (
    <instancedMesh ref={matas} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
      <coneGeometry args={[0.16, 0.42, 5]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* La cerca viva del fondo: troncos + copas instanciados (2 draw calls).
   Árboles de poste — matarratón, nacedero — sembrados en línea. */
function CercaViva() {
  const troncos = useRef(null);
  const copas = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(271);
    const lista = [];
    for (let i = 0; i < 9; i++) {
      const wx = -16.5 + i * 2.05 + (rng() - 0.5) * 0.5;
      const wz = -6.9 + (rng() - 0.5) * 0.5;
      lista.push({
        wx, wz,
        y: alturaFinca(wx, wz),
        esc: 0.85 + rng() * 0.45,
        giro: rng() * Math.PI * 2,
      });
    }
    return lista;
  }, []);

  useEffect(() => {
    const mt = troncos.current, mc = copas.current;
    if (!mt || !mc) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const cTronco = new THREE.Color(P.maderaVieja);
    const cCopa = new THREE.Color(P.copaViva);
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y + 0.75 * s.esc, s.wz);
      dummy.rotation.set(0, s.giro, 0);
      dummy.scale.set(s.esc, s.esc, s.esc);
      dummy.updateMatrix();
      mt.setMatrixAt(i, dummy.matrix);
      tinte.copy(cTronco).offsetHSL(0, 0, (i % 3) * 0.02 - 0.02);
      mt.setColorAt(i, tinte);
      dummy.position.set(s.wx, s.y + 1.75 * s.esc, s.wz);
      dummy.scale.set(s.esc, s.esc * (0.85 + (i % 3) * 0.12), s.esc);
      dummy.updateMatrix();
      mc.setMatrixAt(i, dummy.matrix);
      tinte.copy(cCopa).offsetHSL(0, 0.02 * (i % 2), (i % 4) * 0.016 - 0.03);
      mc.setColorAt(i, tinte);
    });
    mt.instanceMatrix.needsUpdate = true;
    mc.instanceMatrix.needsUpdate = true;
    if (mt.instanceColor) mt.instanceColor.needsUpdate = true;
    if (mc.instanceColor) mc.instanceColor.needsUpdate = true;
  }, [sitios]);

  return (
    <group>
      <instancedMesh ref={troncos} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.08, 0.12, 1.5, 5]} />
        <meshLambertMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={copas} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
        <sphereGeometry args={[0.85, 7, 5]} />
        <meshLambertMaterial flatShading />
      </instancedMesh>
      {/* unas flores amarillas de matarratón entre las copas */}
      {[[-14.2, -6.8], [-10.1, -7.0], [-5.9, -6.7]].map((f, i) => (
        <mesh key={i} position={[f[0], alturaFinca(f[0], f[1]) + 1.9, f[1]]}>
          <sphereGeometry args={[0.16, 5, 4]} />
          <meshLambertMaterial color={P.florVivo} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* La cerca interior que divide las dos mangas: estacones con sus dos cuerdas.
   Puerta de golpe abierta: por ahí pasó el hato a la manga nueva. */
function CercaInterior() {
  const postes = useMemo(() => {
    const lista = [];
    for (let i = 0; i < 7; i++) {
      const wz = -5.6 + i * 1.85;
      if (wz > 0.2 && wz < 2.4) continue; // el claro de la puerta de golpe
      lista.push({ wx: X_CERCA, wz, y: alturaFinca(X_CERCA, wz) });
    }
    return lista;
  }, []);
  return (
    <group>
      {postes.map((p2, i) => (
        <mesh key={i} position={[p2.wx, p2.y + 0.55, p2.wz]}>
          <cylinderGeometry args={[0.05, 0.07, 1.1, 5]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
      ))}
      {/* las dos cuerdas, en dos tramos (el claro de la puerta queda libre) */}
      {[[-5.6, 0.2], [2.4, 5.5]].map(([z0, z1], t) => {
        const zm = (z0 + z1) / 2;
        const y0 = alturaFinca(X_CERCA, z0), y1 = alturaFinca(X_CERCA, z1);
        const ym = (y0 + y1) / 2;
        const largo = Math.hypot(z1 - z0, y1 - y0);
        const ang = Math.atan2(y1 - y0, z1 - z0);
        return [0.62, 0.92].map((h, j) => (
          <mesh
            key={`${t}-${j}`}
            position={[X_CERCA, ym + h, zm]}
            rotation={[-ang, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.012, 0.012, largo, 4]} />
            <meshLambertMaterial color={mezclar(P.maderaVieja, '#3a2e20', 0.5)} flatShading />
          </mesh>
        ));
      })}
      {/* la puerta de golpe, abierta hacia la manga nueva */}
      <group position={[X_CERCA, alturaFinca(X_CERCA, 2.4), 2.4]} rotation={[0, -0.9, 0]}>
        <mesh position={[0, 0.55, -1.0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 2.0, 4]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        <mesh position={[0, 0.85, -1.0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 2.0, 4]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        <mesh position={[0, 0.7, -0.15]}>
          <cylinderGeometry args={[0.04, 0.05, 0.75, 4]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        <mesh position={[0, 0.7, -1.85]}>
          <cylinderGeometry args={[0.04, 0.05, 0.75, 4]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* ══════════════════════ EL HATO ══════════════════════ */

/* Una vaca low-poly noble: cuerpo, cabeza, cachos, ubre y sus manchas.
   `pastando` baja la cabeza al pasto; la cola espanta moscas (useFrame del
   grupo Hato, no aquí, para no multiplicar hooks). */
function Vaca({ colaRef, cabezaRef, color = P.vacaBlanca, manchas = P.vacaNegra, conManchas = true, esc = 1, ubre = true }) {
  return (
    <group scale={esc}>
      {/* cuerpo */}
      <mesh position={[0, 0.72, 0]} scale={[1.45, 0.82, 0.66]}>
        <sphereGeometry args={[0.52, 8, 6]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      {/* las manchas del pelaje, pegadas al lomo y la anca */}
      {conManchas && (
        <>
          <mesh position={[0.3, 0.98, 0.16]} scale={[0.55, 0.3, 0.4]}>
            <sphereGeometry args={[0.5, 6, 5]} />
            <meshLambertMaterial color={manchas} flatShading />
          </mesh>
          <mesh position={[-0.4, 0.86, -0.14]} scale={[0.5, 0.36, 0.36]}>
            <sphereGeometry args={[0.5, 6, 5]} />
            <meshLambertMaterial color={manchas} flatShading />
          </mesh>
        </>
      )}
      {/* cabeza y hocico (mira a +x; `cabezaRef` la deja pastar) */}
      <group ref={cabezaRef} position={[0.86, 0.85, 0]}>
        <mesh scale={[0.9, 0.82, 0.7]}>
          <sphereGeometry args={[0.25, 7, 6]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
        <mesh position={[0.2, -0.07, 0]} scale={[0.7, 0.52, 0.58]}>
          <sphereGeometry args={[0.19, 6, 5]} />
          <meshLambertMaterial color={mezclar(String(color), '#b08a68', 0.35)} flatShading />
        </mesh>
        {/* cachos cortos y orejas */}
        <mesh position={[0.0, 0.2, 0.13]} rotation={[0.5, 0, -0.4]}>
          <coneGeometry args={[0.03, 0.18, 5]} />
          <meshLambertMaterial color="#e8ddc4" flatShading />
        </mesh>
        <mesh position={[0.0, 0.2, -0.13]} rotation={[-0.5, 0, -0.4]}>
          <coneGeometry args={[0.03, 0.18, 5]} />
          <meshLambertMaterial color="#e8ddc4" flatShading />
        </mesh>
        <mesh position={[-0.06, 0.08, 0.21]} rotation={[1.15, 0, 0]} scale={[1, 0.5, 1]}>
          <coneGeometry args={[0.05, 0.14, 4]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
        <mesh position={[-0.06, 0.08, -0.21]} rotation={[-1.15, 0, 0]} scale={[1, 0.5, 1]}>
          <coneGeometry args={[0.05, 0.14, 4]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
      </group>
      {/* patas */}
      {[[0.46, 0.36], [0.46, -0.36], [-0.46, 0.34], [-0.46, -0.34]].map((p2, i) => (
        <mesh key={i} position={[p2[0], 0.26, p2[1] * 0.66]}>
          <cylinderGeometry args={[0.055, 0.07, 0.52, 5]} />
          <meshLambertMaterial color={mezclar(String(color), '#5a4a38', 0.35)} flatShading />
        </mesh>
      ))}
      {/* la ubre llena, orgullo de la lechera */}
      {ubre && (
        <group position={[-0.12, 0.4, 0]}>
          <mesh scale={[1, 0.75, 0.85]}>
            <sphereGeometry args={[0.2, 6, 5]} />
            <meshLambertMaterial color={P.ubre} flatShading />
          </mesh>
          {[[0.07, 0.08], [0.07, -0.08], [-0.08, 0.08], [-0.08, -0.08]].map((t, i) => (
            <mesh key={i} position={[t[0], -0.16, t[1]]}>
              <cylinderGeometry args={[0.016, 0.02, 0.09, 4]} />
              <meshLambertMaterial color={mezclar(P.ubre, '#b87a60', 0.4)} flatShading />
            </mesh>
          ))}
        </group>
      )}
      {/* rabo */}
      <group ref={colaRef} position={[-0.74, 0.86, 0]}>
        <mesh position={[0, -0.24, 0]} rotation={[0, 0, 0.12]}>
          <cylinderGeometry args={[0.02, 0.032, 0.5, 4]} />
          <meshLambertMaterial color={mezclar(String(color), '#5a4a38', 0.4)} flatShading />
        </mesh>
        <mesh position={[0.02, -0.52, 0]}>
          <sphereGeometry args={[0.05, 5, 4]} />
          <meshLambertMaterial color={mezclar(String(manchas), '#2e2a24', 0.4)} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* El hato pastando en la manga nueva: cuatro vacas y el ternero junto a su
   madre. Un solo useFrame mueve colas y cabezas de todo el hato. */
const HATO = [
  { x: -5.2, z: -2.6, giro: 0.5, color: P.vacaBlanca, manchas: P.vacaNegra, conManchas: true, esc: 1.0, pasta: true, fase: 0.0 },
  { x: -3.0, z: 0.6, giro: -2.2, color: P.vacaParda, manchas: P.vacaNegra, conManchas: false, esc: 0.95, pasta: true, fase: 1.7 },
  { x: -6.4, z: 2.8, giro: 1.4, color: P.vacaBlanca, manchas: P.vacaNegra, conManchas: true, esc: 1.05, pasta: false, fase: 3.1 },
  { x: -1.6, z: -4.4, giro: 2.6, color: P.vacaNegra, manchas: P.vacaBlanca, conManchas: true, esc: 0.92, pasta: true, fase: 4.4 },
];
function Hato({ reducedMotion }) {
  const colas = useRef([]);
  const cabezas = useRef([]);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    colas.current.forEach((c, i) => {
      if (c) c.rotation.x = Math.sin(t * 2.1 + i * 1.3) * 0.45;
    });
    cabezas.current.forEach((c, i) => {
      if (!c) return;
      const v = HATO[i];
      if (!v || !v.pasta) return;
      // pastar: la cabeza baja al pasto, arranca y vuelve a subir
      c.rotation.z = -0.55 - Math.max(0, Math.sin(t * 0.45 + v.fase)) * 0.5;
    });
  });
  return (
    <group>
      {HATO.map((v, i) => (
        <group
          key={i}
          position={[v.x, alturaFinca(v.x, v.z), v.z]}
          rotation={[0, v.giro, 0]}
        >
          <Vaca
            color={v.color}
            manchas={v.manchas}
            conManchas={v.conManchas}
            esc={v.esc}
            colaRef={(el) => { colas.current[i] = el; }}
            cabezaRef={(el) => { cabezas.current[i] = el; }}
          />
        </group>
      ))}
      {/* el ternero, pegado a la parda: primero mama él, después la cantina */}
      <group
        position={[-2.4, alturaFinca(-2.4, 1.3), 1.3]}
        rotation={[0, -1.9, 0]}
      >
        <Vaca color={P.ternero} conManchas={false} esc={0.5} ubre={false} />
      </group>
      {/* unas boñigas honestas: de aquí sale el abono del montón */}
      {[[-4.4, -0.8], [-2.2, -3.2], [-6.8, 0.9]].map((b, i) => (
        <mesh key={i} position={[b[0], alturaFinca(b[0], b[1]) + 0.04, b[1]]} scale={[1, 0.3, 1]}>
          <sphereGeometry args={[0.16, 6, 4]} />
          <meshLambertMaterial color={P.bonhiga} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ══════════════════════ EL ORDEÑO ══════════════════════ */

/* El campesino en su butaco, ordeñando: ruana, sombrero de tapia pisada,
   botas de caucho y las manos en la ubre. Los brazos llevan el ritmo. */
function Ordenador({ brazosRef }) {
  return (
    <group>
      {/* el butaco de tres patas */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.05, 7]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      {[0, 2.1, 4.2].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.09, 0.14, Math.sin(a) * 0.09]}>
          <cylinderGeometry args={[0.022, 0.03, 0.28, 4]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
      ))}
      {/* piernas dobladas y botas de caucho */}
      {[0.12, -0.12].map((z, i) => (
        <group key={i}>
          <mesh position={[0.16, 0.32, z]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.3, 0.11, 0.11]} />
            <meshLambertMaterial color={mezclar(P.ruana, '#3a3026', 0.4)} flatShading />
          </mesh>
          <mesh position={[0.3, 0.14, z]}>
            <boxGeometry args={[0.12, 0.26, 0.11]} />
            <meshLambertMaterial color={P.bota} flatShading />
          </mesh>
          <mesh position={[0.36, 0.04, z]}>
            <boxGeometry args={[0.2, 0.07, 0.11]} />
            <meshLambertMaterial color={P.bota} flatShading />
          </mesh>
        </group>
      ))}
      {/* el torso con la ruana */}
      <mesh position={[0, 0.62, 0]} scale={[0.85, 1, 0.75]}>
        <coneGeometry args={[0.26, 0.55, 6]} />
        <meshLambertMaterial color={P.ruana} flatShading />
      </mesh>
      {/* la raya clara de la ruana */}
      <mesh position={[0.02, 0.62, 0]} scale={[0.87, 0.2, 0.77]}>
        <coneGeometry args={[0.26, 0.55, 6]} />
        <meshLambertMaterial color={mezclar(P.ruana, '#d8c8a8', 0.45)} flatShading />
      </mesh>
      {/* los brazos hacia la ubre, con el ritmo del ordeño */}
      <group ref={brazosRef} position={[0.14, 0.72, 0]}>
        {[0.1, -0.1].map((z, i) => (
          <mesh key={i} position={[0.16, -0.06, z]} rotation={[0, 0, -0.7]}>
            <cylinderGeometry args={[0.035, 0.045, 0.36, 5]} />
            <meshLambertMaterial color={P.piel} flatShading />
          </mesh>
        ))}
      </group>
      {/* cabeza y sombrero */}
      <mesh position={[0, 0.98, 0]}>
        <sphereGeometry args={[0.13, 7, 6]} />
        <meshLambertMaterial color={P.piel} flatShading />
      </mesh>
      <mesh position={[0, 1.08, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.03, 8]} />
        <meshLambertMaterial color={P.sombrero} flatShading />
      </mesh>
      <mesh position={[0, 1.13, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.1, 7]} />
        <meshLambertMaterial color={P.sombrero} flatShading />
      </mesh>
    </group>
  );
}

/* La ramada del ordeño: horcones, techo de paja, la vaca mansa comiendo su
   puñado, el ordeñador, el balde con leche, el chorrito, el balde del lavado
   y la cantina con su embudo y lienzo. */
const ORDENO_POS = [2.6, Y_PATIO, 2.0];
function Ordeno({ reducedMotion }) {
  const brazos = useRef(null);
  const chorro = useRef(null);
  const cola = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    // el ritmo del ordeño: mano y mano, sin afán
    if (brazos.current) brazos.current.rotation.z = Math.sin(t * 5.2) * 0.09;
    // el chorrito de leche pulsa al mismo compás
    if (chorro.current) {
      chorro.current.material.opacity = 0.55 + Math.sin(t * 5.2) * 0.35;
    }
    if (cola.current) cola.current.rotation.x = Math.sin(t * 1.7) * 0.3;
  });
  return (
    <group position={ORDENO_POS} rotation={[0, -0.2, 0]}>
      {/* la ramada: cuatro horcones y techo de paja a un agua */}
      {[[-1.5, -1.2], [1.5, -1.2], [-1.5, 1.2], [1.5, 1.2]].map((h, i) => (
        <mesh key={i} position={[h[0], 1.3, h[1]]}>
          <cylinderGeometry args={[0.06, 0.08, 2.6, 5]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 2.66, 0]} rotation={[0.1, 0, 0.1]}>
        <boxGeometry args={[3.7, 0.12, 3.1]} />
        <meshLambertMaterial color={P.paja} flatShading />
      </mesh>
      <mesh position={[0, 2.8, 0]} rotation={[0.1, 0, 0.1]}>
        <boxGeometry args={[3.2, 0.1, 2.6]} />
        <meshLambertMaterial color={mezclar(P.paja, '#a8873e', 0.4)} flatShading />
      </mesh>

      {/* la vaca del ordeño, mansa, con su puñado de pasto de corte */}
      <group position={[0.15, 0, -0.25]} rotation={[0, Math.PI, 0]}>
        <Vaca
          color={P.vacaBlanca}
          manchas={P.vacaNegra}
          conManchas
          esc={1.05}
          colaRef={(el) => { cola.current = el; }}
        />
      </group>
      {/* su ración de pasto de corte en la canoíta */}
      <mesh position={[-1.15, 0.18, -0.25]}>
        <boxGeometry args={[0.6, 0.3, 0.5]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      <mesh position={[-1.15, 0.36, -0.25]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[0.26, 6, 5]} />
        <meshLambertMaterial color={P.pastoFresco} flatShading />
      </mesh>

      {/* el ordeñador en su butaco, del lado de la ubre */}
      <group position={[0.75, 0, 0.42]} rotation={[0, -2.3, 0]}>
        <Ordenador brazosRef={(el) => { brazos.current = el; }} />
      </group>

      {/* el balde de la leche bajo la ubre, con su chorrito */}
      <group position={[0.32, 0, 0.14]}>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.15, 0.11, 0.28, 8]} />
          <meshLambertMaterial color={P.aluminio} flatShading />
        </mesh>
        <mesh position={[0, 0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.13, 8]} />
          <meshLambertMaterial color={P.leche} />
        </mesh>
        <mesh ref={chorro} position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.008, 0.012, 0.16, 4]} />
          <meshBasicMaterial color="#fdfaf0" transparent opacity={0.8} />
        </mesh>
      </group>

      {/* el balde del lavado: agua limpia y trapo — la ubre se lava primero */}
      <group position={[1.3, 0, -0.85]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.14, 0.1, 0.24, 8]} />
          <meshLambertMaterial color={mezclar(P.aluminio, '#7a8a92', 0.3)} flatShading />
        </mesh>
        <mesh position={[0, 0.23, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.12, 8]} />
          <meshLambertMaterial color={P.agua} />
        </mesh>
        <mesh position={[0.14, 0.26, 0.05]} rotation={[0.3, 0, 0.4]}>
          <boxGeometry args={[0.16, 0.03, 0.12]} />
          <meshLambertMaterial color={mezclar(P.encalado, '#c8c0a8', 0.4)} flatShading />
        </mesh>
      </group>

      {/* la mesa de la cantina: el embudo con su lienzo colando la leche */}
      <group position={[-0.55, 0, 1.15]} rotation={[0, 0.35, 0]}>
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[1.0, 0.07, 0.7]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        {[[-0.42, -0.26], [0.42, -0.26], [-0.42, 0.26], [0.42, 0.26]].map((p2, i) => (
          <mesh key={i} position={[p2[0], 0.2, p2[1]]}>
            <cylinderGeometry args={[0.03, 0.04, 0.4, 4]} />
            <meshLambertMaterial color={P.maderaVieja} flatShading />
          </mesh>
        ))}
        {/* la cantina lechera */}
        <group position={[-0.2, 0.46, 0]}>
          <mesh position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.17, 0.19, 0.48, 9]} />
            <meshLambertMaterial color={P.aluminio} flatShading />
          </mesh>
          <mesh position={[0, 0.52, 0]}>
            <cylinderGeometry args={[0.1, 0.14, 0.12, 8]} />
            <meshLambertMaterial color={P.aluminio} flatShading />
          </mesh>
          {/* el embudo con el lienzo de colar */}
          <mesh position={[0, 0.68, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.16, 0.18, 8, 1, true]} />
            <meshLambertMaterial color={P.leche} flatShading side={THREE.DoubleSide} />
          </mesh>
        </group>
        {/* la otra cantina, tapada y lista para el carro lechero */}
        <group position={[0.24, 0.46, 0.08]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.14, 0.16, 0.42, 9]} />
            <meshLambertMaterial color={mezclar(P.aluminio, '#a8a89e', 0.4)} flatShading />
          </mesh>
          <mesh position={[0, 0.46, 0]}>
            <sphereGeometry args={[0.1, 7, 5]} />
            <meshLambertMaterial color={P.aluminio} flatShading />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* ══════════════════════ LA QUESERÍA ══════════════════════ */

/* La casita encalada de la quesería: piso alisado, tres paredes con zócalo,
   teja de barro, la hornilla con la olla de la cuajada, el frasquito de
   cuajo, la mesa del molde y la prensa, y el queso escurriendo. */
const QUESERIA_POS = [8.6, Y_PATIO, 4.2];
function Queseria({ reducedMotion, tier }) {
  const vapores = useRef(null);
  const gota = useRef(null);
  const puffs = useMemo(() => {
    const rng = crearRng(431);
    return Array.from({ length: 3 }, (_, i) => ({
      fase: i * 0.9 + rng() * 0.5,
      dx: (rng() - 0.5) * 0.2,
    }));
  }, []);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    // el vapor manso de la olla que cuaja a fuego lento
    if (vapores.current) {
      vapores.current.children.forEach((h, i) => {
        const p2 = puffs[i];
        const f = ((t * 0.3 + p2.fase) % 1.5) / 1.5;
        h.position.y = 1.35 + f * 1.3;
        h.position.x = p2.dx + Math.sin(t * 0.7 + p2.fase) * 0.12;
        h.scale.setScalar(0.2 + f * 0.5);
        h.material.opacity = 0.3 * (1 - f);
      });
    }
    // la gota de suero que cae del queso a la vasija, sin afán
    if (gota.current) {
      const f = (t * 0.8) % 1;
      gota.current.position.y = 0.62 - f * 0.5;
      gota.current.material.opacity = f < 0.85 ? 0.85 : 0;
    }
  });
  return (
    <group position={QUESERIA_POS} rotation={[0, -0.42, 0]}>
      {/* el piso alisado */}
      <mesh position={[0, 0.045, 0]}>
        <boxGeometry args={[4.6, 0.09, 3.6]} />
        <meshLambertMaterial color={P.piso} flatShading />
      </mesh>
      {/* tres paredes encaladas con su zócalo (el frente queda abierto) */}
      <mesh position={[0, 1.05, -1.72]}>
        <boxGeometry args={[4.6, 2.0, 0.16]} />
        <meshLambertMaterial color={P.encalado} flatShading />
      </mesh>
      <mesh position={[-2.22, 1.05, 0]}>
        <boxGeometry args={[0.16, 2.0, 3.6]} />
        <meshLambertMaterial color={P.encalado} flatShading />
      </mesh>
      <mesh position={[2.22, 1.05, 0]}>
        <boxGeometry args={[0.16, 2.0, 3.6]} />
        <meshLambertMaterial color={P.encalado} flatShading />
      </mesh>
      {/* el zócalo rojizo de las tres paredes (más grueso que la pared:
          sobresale limpio, sin pelear el plano con el encalado) */}
      <mesh position={[0, 0.3, -1.7]}>
        <boxGeometry args={[4.7, 0.5, 0.3]} />
        <meshLambertMaterial color={P.zocalo} flatShading />
      </mesh>
      <mesh position={[-2.21, 0.3, 0]}>
        <boxGeometry args={[0.3, 0.5, 3.7]} />
        <meshLambertMaterial color={P.zocalo} flatShading />
      </mesh>
      <mesh position={[2.21, 0.3, 0]}>
        <boxGeometry args={[0.3, 0.5, 3.7]} />
        <meshLambertMaterial color={P.zocalo} flatShading />
      </mesh>
      {/* la teja de barro a dos aguas, asentada sobre el encalado */}
      <mesh position={[0, 2.16, -0.98]} rotation={[0.42, 0, 0]}>
        <boxGeometry args={[5.0, 0.1, 2.35]} />
        <meshLambertMaterial color={P.teja} flatShading />
      </mesh>
      <mesh position={[0, 2.16, 0.98]} rotation={[-0.42, 0, 0]}>
        <boxGeometry args={[5.0, 0.1, 2.35]} />
        <meshLambertMaterial color={mezclar(P.teja, '#8a4a2e', 0.3)} flatShading />
      </mesh>
      <mesh position={[0, 2.6, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[5.0, 0.12, 0.3]} />
        <meshLambertMaterial color={mezclar(P.teja, '#7a3e26', 0.4)} flatShading />
      </mesh>

      {/* la hornilla con la olla de la cuajada */}
      <group position={[-1.3, 0.09, -0.9]}>
        <mesh position={[0, 0.32, 0]}>
          <boxGeometry args={[1.2, 0.64, 1.0]} />
          <meshLambertMaterial color={P.adobe} flatShading />
        </mesh>
        <mesh position={[0, 0.24, 0.51]}>
          <boxGeometry args={[0.44, 0.3, 0.05]} />
          <meshLambertMaterial color="#2a1a10" flatShading />
        </mesh>
        <mesh position={[0, 0.24, 0.55]}>
          <circleGeometry args={[0.13, 7]} />
          <meshBasicMaterial color="#ff9a3a" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
        {tier === 'alto' && (
          <pointLight position={[0, 0.3, 0.8]} color="#ff9a4a" intensity={0.6} distance={2.8} />
        )}
        {/* la olla grande con la leche cuajando */}
        <mesh position={[0, 0.82, 0]}>
          <cylinderGeometry args={[0.5, 0.36, 0.4, 11]} />
          <meshLambertMaterial color={P.aluminio} flatShading />
        </mesh>
        <mesh position={[0, 1.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.45, 11]} />
          <meshLambertMaterial color={P.leche} />
        </mesh>
        {/* la cuajada cortada en cruz: los dados que sueltan el suero */}
        {[[-0.18, -0.12], [0.08, -0.2], [0.2, 0.1], [-0.06, 0.18], [-0.25, 0.12], [0.02, -0.02]].map((d, i) => (
          <mesh key={i} position={[d[0], 1.03, d[1]]} rotation={[0, i * 0.6, 0]}>
            <boxGeometry args={[0.13, 0.05, 0.13]} />
            <meshLambertMaterial color={P.cuajada} flatShading />
          </mesh>
        ))}
        {/* el vapor manso */}
        <group ref={vapores} position={[0, 0, 0]}>
          {puffs.map((p2, i) => (
            <mesh key={i} position={[p2.dx, 1.4 + i * 0.4, 0]}>
              <sphereGeometry args={[0.22, 6, 5]} />
              <meshBasicMaterial color="#f4eedd" transparent opacity={0.25} depthWrite={false} />
            </mesh>
          ))}
        </group>
        {/* el mecedor de la cuajada apoyado en la olla */}
        <mesh position={[0.42, 1.0, 0.15]} rotation={[0.15, 0, -0.85]}>
          <cylinderGeometry args={[0.018, 0.024, 0.9, 5]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
      </group>

      {/* la repisa del cuajo: el frasquito ámbar y el cucharón */}
      <group position={[-2.1, 1.35, -0.2]}>
        <mesh>
          <boxGeometry args={[0.14, 0.05, 1.0]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        <mesh position={[0, 0.11, -0.25]}>
          <cylinderGeometry args={[0.05, 0.05, 0.16, 6]} />
          <meshLambertMaterial color={mezclar('#8a5a2a', TINTE, 0.1)} flatShading />
        </mesh>
        <mesh position={[0, 0.21, -0.25]}>
          <cylinderGeometry args={[0.02, 0.02, 0.05, 5]} />
          <meshLambertMaterial color="#3a2a1a" flatShading />
        </mesh>
        <mesh position={[0, 0.1, 0.2]} rotation={[0, 0, 1.2]}>
          <cylinderGeometry args={[0.015, 0.02, 0.36, 4]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
      </group>

      {/* la mesa del queso: molde con prensa de piedra y el queso escurriendo */}
      <group position={[1.15, 0.09, -0.5]}>
        <mesh position={[0, 0.56, 0]}>
          <boxGeometry args={[1.7, 0.08, 1.0]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        {[[-0.75, -0.38], [0.75, -0.38], [-0.75, 0.38], [0.75, 0.38]].map((p2, i) => (
          <mesh key={i} position={[p2[0], 0.28, p2[1]]}>
            <cylinderGeometry args={[0.035, 0.045, 0.56, 4]} />
            <meshLambertMaterial color={P.maderaVieja} flatShading />
          </mesh>
        ))}
        {/* el molde (aro) con su tabla y la piedra de prensar encima */}
        <group position={[-0.45, 0.6, 0]}>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.18, 9, 1, true]} />
            <meshLambertMaterial color={P.maderaVieja} flatShading side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.16, 9]} />
            <meshLambertMaterial color={P.queso} flatShading />
          </mesh>
          <mesh position={[0, 0.21, 0]}>
            <cylinderGeometry args={[0.19, 0.19, 0.04, 8]} />
            <meshLambertMaterial color={P.maderaClara} flatShading />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <dodecahedronGeometry args={[0.16]} />
            <meshLambertMaterial color={P.piedra} flatShading />
          </mesh>
        </group>
        {/* el queso fresco en su tabla, escurriendo el suero a la vasija */}
        <group position={[0.45, 0.6, 0.05]}>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.05, 9]} />
            <meshLambertMaterial color={P.maderaClara} flatShading />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.19, 0.21, 0.17, 9]} />
            <meshLambertMaterial color={P.queso} flatShading />
          </mesh>
          {/* la gota de suero que cae */}
          <mesh ref={gota} position={[0.12, 0.5, 0.08]}>
            <sphereGeometry args={[0.022, 5, 4]} />
            <meshBasicMaterial color={P.suero} transparent opacity={0.85} />
          </mesh>
        </group>
        {/* la vasija del suero bajo la mesa: de aquí sale para los cerdos */}
        <mesh position={[0.55, 0.12, 0.1]}>
          <cylinderGeometry args={[0.16, 0.12, 0.24, 8]} />
          <meshLambertMaterial color={mezclar('#8a5a3a', TINTE, 0.2)} flatShading />
        </mesh>
        <mesh position={[0.55, 0.23, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.13, 8]} />
          <meshLambertMaterial color={P.suero} />
        </mesh>
      </group>

      {/* la repisa de los quesos hechos: campesino y doble crema */}
      <group position={[1.6, 1.3, -1.55]}>
        <mesh>
          <boxGeometry args={[1.1, 0.05, 0.3]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        {[-0.35, 0, 0.35].map((x, i) => (
          <mesh key={i} position={[x, 0.08, 0]}>
            <cylinderGeometry args={[0.12, 0.13, 0.1, 8]} />
            <meshLambertMaterial color={mezclar(P.queso, '#f4ecc8', i * 0.25)} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ══════════════════════ EL CICLO QUE NO BOTA NADA ══════════════════════ */

/* El cerdito de la casa, bebiendo el suero de su canoa. */
function Cerdo({ cabezaRef }) {
  return (
    <group>
      <mesh position={[0, 0.34, 0]} scale={[1.3, 0.85, 0.8]}>
        <sphereGeometry args={[0.3, 7, 6]} />
        <meshLambertMaterial color={P.cerdo} flatShading />
      </mesh>
      <group ref={cabezaRef} position={[0.42, 0.36, 0]}>
        <mesh scale={[0.85, 0.8, 0.75]}>
          <sphereGeometry args={[0.17, 6, 5]} />
          <meshLambertMaterial color={P.cerdo} flatShading />
        </mesh>
        <mesh position={[0.13, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.06, 0.07, 6]} />
          <meshLambertMaterial color={mezclar(P.cerdo, '#c08a78', 0.5)} flatShading />
        </mesh>
        <mesh position={[0.0, 0.12, 0.08]} rotation={[0.5, 0, -0.3]} scale={[1, 0.5, 1]}>
          <coneGeometry args={[0.045, 0.1, 4]} />
          <meshLambertMaterial color={P.cerdo} flatShading />
        </mesh>
        <mesh position={[0.0, 0.12, -0.08]} rotation={[-0.5, 0, -0.3]} scale={[1, 0.5, 1]}>
          <coneGeometry args={[0.045, 0.1, 4]} />
          <meshLambertMaterial color={P.cerdo} flatShading />
        </mesh>
      </group>
      {[[0.22, 0.14], [0.22, -0.14], [-0.24, 0.13], [-0.24, -0.13]].map((p2, i) => (
        <mesh key={i} position={[p2[0], 0.1, p2[1]]}>
          <cylinderGeometry args={[0.03, 0.04, 0.2, 4]} />
          <meshLambertMaterial color={mezclar(P.cerdo, '#a87a68', 0.4)} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Una gallina picoteando cerca del suero y el abono. */
function Gallina({ cuerpoRef, giro = 0 }) {
  return (
    <group rotation={[0, giro, 0]}>
      <group ref={cuerpoRef}>
        <mesh position={[0, 0.16, 0]} scale={[1.15, 0.9, 0.8]}>
          <sphereGeometry args={[0.13, 6, 5]} />
          <meshLambertMaterial color={P.gallina} flatShading />
        </mesh>
        <mesh position={[-0.12, 0.24, 0]} rotation={[0, 0, 0.7]} scale={[1, 0.6, 0.5]}>
          <coneGeometry args={[0.08, 0.16, 4]} />
          <meshLambertMaterial color={mezclar(P.gallina, '#6a4a2a', 0.4)} flatShading />
        </mesh>
        <mesh position={[0.12, 0.26, 0]}>
          <sphereGeometry args={[0.06, 6, 5]} />
          <meshLambertMaterial color={P.gallina} flatShading />
        </mesh>
        <mesh position={[0.12, 0.33, 0]} scale={[0.6, 1, 0.4]}>
          <sphereGeometry args={[0.035, 5, 4]} />
          <meshLambertMaterial color={P.cresta} flatShading />
        </mesh>
        <mesh position={[0.18, 0.25, 0]} rotation={[0, 0, -1.3]}>
          <coneGeometry args={[0.02, 0.06, 4]} />
          <meshLambertMaterial color="#e8b83a" flatShading />
        </mesh>
      </group>
      {[0.03, -0.03].map((z, i) => (
        <mesh key={i} position={[0.02, 0.05, z]}>
          <cylinderGeometry args={[0.01, 0.012, 0.1, 4]} />
          <meshLambertMaterial color="#c9a23e" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* El rincón del ciclo: la canoa del suero con el cerdo y las gallinas, y el
   montón de abono con su pala — la boñiga madurando para volver al pasto. */
const CICLO_POS = [6.6, Y_PATIO, 7.3];
function Ciclo({ reducedMotion }) {
  const cerdoCabeza = useRef(null);
  const gallinas = useRef([]);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    // el cerdo hoza en la canoa
    if (cerdoCabeza.current) {
      cerdoCabeza.current.rotation.z = -0.35 - Math.max(0, Math.sin(t * 1.1)) * 0.3;
    }
    // las gallinas picotean a su ritmo
    gallinas.current.forEach((g, i) => {
      if (g) g.rotation.z = -Math.max(0, Math.sin(t * 3.2 + i * 2.1)) * 0.5;
    });
  });
  return (
    <group>
      {/* la canoa del suero, junto a la quesería */}
      <group position={CICLO_POS} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[1.3, 0.32, 0.44]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[1.14, 0.16, 0.3]} />
          <meshLambertMaterial color={P.suero} flatShading />
        </mesh>
        {/* el cerdito bebiendo */}
        <group position={[0.35, 0, 0.75]} rotation={[0, -1.8, 0]}>
          <Cerdo cabezaRef={(el) => { cerdoCabeza.current = el; }} />
        </group>
        {/* las gallinas rebuscando lo que cae */}
        <group position={[-0.85, 0, 0.55]}>
          <Gallina giro={0.7} cuerpoRef={(el) => { gallinas.current[0] = el; }} />
        </group>
        <group position={[-0.35, 0, 1.05]}>
          <Gallina giro={-2.2} cuerpoRef={(el) => { gallinas.current[1] = el; }} />
        </group>
      </group>

      {/* el montón de abono junto al potrero, con su pala clavada */}
      <group position={[-11.8, 0, 6.4]}>
        <mesh position={[0, alturaFinca(-11.8, 6.4) + 0.18, 0]} scale={[1.5, 0.6, 1.2]}>
          <sphereGeometry args={[0.6, 7, 5]} />
          <meshLambertMaterial color={P.abono} flatShading />
        </mesh>
        <mesh
          position={[0.55, alturaFinca(-11.8, 6.4) + 0.62, 0.25]}
          rotation={[0.2, 0, -0.5]}
        >
          <cylinderGeometry args={[0.022, 0.028, 1.1, 5]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        <mesh position={[0.78, alturaFinca(-11.8, 6.4) + 0.18, 0.35]} rotation={[0, 0.4, 0.5]}>
          <boxGeometry args={[0.2, 0.24, 0.02]} />
          <meshLambertMaterial color={mezclar(P.aluminio, '#6a6a62', 0.4)} flatShading />
        </mesh>
        {/* la carretilla que lleva la boñiga del potrero al montón */}
        <group position={[1.6, alturaFinca(-10.2, 6.6), 0.2]} rotation={[0, -0.6, 0]}>
          <mesh position={[0, 0.32, 0]} rotation={[0, 0, 0.06]}>
            <boxGeometry args={[0.8, 0.24, 0.5]} />
            <meshLambertMaterial color={mezclar('#5a7a8a', TINTE, 0.25)} flatShading />
          </mesh>
          <mesh position={[0, 0.42, 0]} scale={[1, 0.4, 1]}>
            <sphereGeometry args={[0.24, 6, 5]} />
            <meshLambertMaterial color={P.bonhiga} flatShading />
          </mesh>
          <mesh position={[0.42, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.06, 8]} />
            <meshLambertMaterial color={P.bota} flatShading />
          </mesh>
          {[0.12, -0.12].map((z, i) => (
            <mesh key={i} position={[-0.6, 0.28, z]} rotation={[0, 0, -0.15]}>
              <cylinderGeometry args={[0.02, 0.025, 0.5, 4]} />
              <meshLambertMaterial color={P.maderaVieja} flatShading />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/* Las etiquetas del paso a paso: potrero → ordeño → filtrado → cuajada →
   queso → nada se pierde. */
function PasosLecheria() {
  return (
    <>
      <Etiqueta pos={[-5.0, 2.9, -0.8]} paso="1" texto="El potrero en rotación" />
      <Etiqueta pos={[2.6, 3.3, 2.0]} paso="2" texto="El ordeño" />
      <Etiqueta pos={[2.0, 1.9, 3.4]} paso="3" texto="La leche colada" />
      <Etiqueta pos={[7.2, 2.6, 3.6]} paso="4" texto="La cuajada" />
      <Etiqueta pos={[8.4, 2.3, 5.9]} paso="5" texto="El queso" />
      <Etiqueta pos={[6.6, 1.7, 7.3]} paso="6" texto="Nada se pierde" />
    </>
  );
}

/* ══════════════════════ LA ESCENA COMPLETA ══════════════════════ */

function EscenaLecheria({ tier, reducedMotion, etiquetas }) {
  const perfil = perfilDeTier(tier);
  const geo = useMemo(
    () => construirTerreno(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  const nMatas = tier === 'alto' ? 260 : 150;

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

      {/* el potrero: pastura instanciada, cerca viva, cerca interior y hato */}
      <Pastura n={nMatas} />
      <CercaViva />
      <CercaInterior />
      <Hato reducedMotion={reducedMotion} />

      {/* la faena: el ordeño y la quesería */}
      <Ordeno reducedMotion={reducedMotion} />
      <Queseria reducedMotion={reducedMotion} tier={tier} />

      {/* el ciclo: el suero a los animales, la boñiga al abono */}
      <Ciclo reducedMotion={reducedMotion} />
      {etiquetas && <PasosLecheria />}

      {/* unas piedras que amueblan los bordes */}
      {[[-1.2, 6.8, 0.32], [13.2, 1.8, 0.4], [-15.8, 3.4, 0.34]].map((r, i) => (
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
        tipo="mariposa"
        base={[-10.5, 2.2, -5.8]}
        size={26}
        rol="polinizador"
        fase={0.6}
        reducedMotion={reducedMotion}
        title="Mariposa en la cerca viva"
      />
      <Bicho
        tipo="colibri"
        base={[-14.0, 2.6, -6.2]}
        size={30}
        rol="polinizador"
        fase={2.1}
        reducedMotion={reducedMotion}
        title="Colibrí en el matarratón florecido"
      />
      <Bicho
        tipo="lombriz"
        base={[-11.4, alturaFinca(-11.4, 6.9) + 0.12, 6.9]}
        size={24}
        rol="descomponedor"
        fase={1.2}
        reducedMotion={reducedMotion}
        title="Lombriz en el montón de abono"
      />

      {/* el polen del kit sobre el potrero y la cerca viva */}
      <ParticulasAmbientales
        tipo="polen"
        tier={tier}
        reducedMotion={reducedMotion}
        position={[-9, 1.6, -3]}
        semilla={29}
      />
      <ParticulasAmbientales
        tipo="polen"
        densidad={0.5}
        tier={tier}
        reducedMotion={reducedMotion}
        position={[-4, 1.4, 3]}
        semilla={47}
      />
    </>
  );
}

/* ══════════════════════ EL CHROME (DOM) ══════════════════════ */

const CSS_LECHD = `
.lechd-root { margin: 0 auto; max-width: 72rem; padding: 0 0 2.5rem; background: #f6efdc; color: #3c2f1c; font-family: system-ui, sans-serif; }
.lechd-head { padding: 1.1rem 1rem 0.4rem; }
.lechd-kicker { margin: 0; font: 600 0.72rem/1.2 system-ui, sans-serif; letter-spacing: 0.09em; text-transform: uppercase; color: #8a6a35; }
.lechd-head h1 { margin: 0.2rem 0 0.4rem; font-size: clamp(1.35rem, 4vw, 1.9rem); line-height: 1.15; color: #4a3418; }
.lechd-lema { margin: 0; max-width: 46rem; font-size: 0.92rem; line-height: 1.55; color: #5a4a30; }
.lechd-escena { position: relative; margin: 0.9rem 0 0; height: min(78dvh, 40rem); min-height: 22rem; overflow: hidden; background: ${DIA.fondo}; border-radius: 0; }
.lechd-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.lechd-canvas--lista { opacity: 1; }
.lechd-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: flex-end; }
.lechd-pie { padding: 0 1rem 0.9rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem; }
.lechd-carta { margin: 0; max-width: 34rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(74,52,24,0.66); backdrop-filter: blur(3px); color: #fbf3e2; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.lechd-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(74,52,24,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(255,247,228,0.85); color: #5a3f1c; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.lechd-boton:hover, .lechd-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(74,52,24,0.6); outline: none; }
.lechd-boton[aria-pressed='true'] { background: #ffe8b0; border-color: rgba(90,63,28,0.75); color: #4a3418; }
.lechd-chip { pointer-events: none; display: inline-flex; align-items: center; gap: 0.3em; padding: 2px 8px; border-radius: 999px; background: rgba(58,42,24,0.82); color: #fdf6e3; font: 600 10px/1.5 system-ui, sans-serif; white-space: nowrap; box-shadow: 0 2px 6px rgba(40,28,10,0.3); }
.lechd-chip b { display: inline-flex; align-items: center; justify-content: center; width: 1.35em; height: 1.35em; border-radius: 50%; background: #e8a24a; color: #3c2410; font-size: 9px; }
.mundo-fauna { pointer-events: none; filter: drop-shadow(0 2px 5px rgba(40, 30, 10, 0.24)); }
.lechd-leyenda { padding: 1.4rem 1rem 0; }
.lechd-leyenda h2 { margin: 0 0 0.3rem; font-size: 1.12rem; color: #4a3418; }
.lechd-leyenda ol, .lechd-leyenda ul { margin: 0.6rem 0 0; padding: 0; list-style: none; display: grid; gap: 0.7rem; }
.lechd-leyenda li { display: flex; gap: 0.65rem; align-items: flex-start; background: #fdf8ea; border: 1px solid #e8dcc0; border-radius: 0.7rem; padding: 0.65rem 0.8rem; }
.lechd-emoji { font-size: 1.25rem; line-height: 1.3; }
.lechd-leyenda b { display: block; font-size: 0.88rem; color: #4a3418; }
.lechd-leyenda p { margin: 0.15rem 0 0; font-size: 0.83rem; line-height: 1.5; color: #5a4a30; }
.lechd-nota { margin: 0.8rem 0 0; font-size: 0.76rem; line-height: 1.5; color: #7a6845; font-style: italic; }
.lechd-cierre { margin: 0.9rem 0 0; max-width: 46rem; font-size: 0.86rem; line-height: 1.55; color: #5a4a30; }
@media (min-width: 40rem) { .lechd-leyenda ol, .lechd-leyenda ul { grid-template-columns: 1fr 1fr; } }
@media (prefers-reduced-motion: reduce) { .lechd-canvas { transition: none; } }
`;

/* El paso a paso de la lechería: del potrero al queso, sin misterio. */
const PASOS_LECHERIA = [
  {
    emoji: '🐄',
    titulo: '1 · El potrero en rotación',
    texto:
      'El hato no pasta siempre en el mismo lado: el potrero se divide en mangas y se rota — mientras una se come, la otra descansa y el pasto se recupera. La cerca viva de matarratón y nacedero da sombra, forraje y leña sin comprar postes cada año.',
  },
  {
    emoji: '🥛',
    titulo: '2 · El ordeño',
    texto:
      'De madrugada, con la vaca mansa comiendo su ración: primero se lava la ubre con agua limpia y se seca, y primero MAMA EL TERNERO — él baja la leche y le queda su parte. Después sí, mano y mano al balde, sin afán y sin maltrato.',
  },
  {
    emoji: '🫗',
    titulo: '3 · La leche colada',
    texto:
      'Apenas sale del balde, la leche pasa por el lienzo del embudo a la cantina: colar de una vez es la mitad de la higiene. Cantina lavada, leche colada y a la sombra — así llega buena a la quesería o al carro lechero.',
  },
  {
    emoji: '🍲',
    titulo: '4 · La cuajada',
    texto:
      'En la olla, con la leche apenas tibia, van las gotas de cuajo. En un rato la leche cuaja como un flan; se corta en cruz con el cuchillo y los dados van soltando el suero. Esa es la cuajada — la madre de todos los quesos campesinos.',
  },
  {
    emoji: '🧀',
    titulo: '5 · El queso',
    texto:
      'La cuajada escurrida y con su sal va al molde: un aro con su tabla y una piedra encima que la prensa despacito. Al otro día hay queso campesino fresco; si la cuajada se hila en caliente, sale el doble crema que no falta en la tienda.',
  },
  {
    emoji: '🐖',
    titulo: '6 · Nada se pierde',
    texto:
      'El suero que suelta el queso no se bota: baja por la canoa a los cerdos y las gallinas, que lo agradecen. La boñiga del potrero va al montón de abono y el abono vuelve al pasto que come la vaca. El ciclo cierra redondo, sin comprar insumos.',
  },
];

/* Los cuidados del hato: el saber que hace buena la leche. */
const CUIDADOS = [
  {
    emoji: '🌳',
    titulo: 'La cerca viva',
    texto:
      'Árboles sembrados de poste — matarratón, nacedero — que además de cercar dan sombra al hato, forraje de proteína en la ramoneada y flor para las abejas. Cerca que se poda, no que se compra.',
  },
  {
    emoji: '🐮',
    titulo: 'El bienestar del hato',
    texto:
      'Vaca bien tratada da más leche: agua a voluntad, sombra al mediodía, sin gritos ni rejo en el ordeño. El ternero mama su parte — la cría criada con la madre sale más sana y la vaca baja la leche sin pelea.',
  },
  {
    emoji: '💧',
    titulo: 'La higiene sencilla',
    texto:
      'No hace falta equipo de fábrica: agua limpia, manos lavadas, balde y cantina bien juagados, la leche colada y a la sombra. Con eso la leche no se corta ni se daña — y el queso sale parejo.',
  },
  {
    emoji: '🔁',
    titulo: 'La cuenta redonda',
    texto:
      'La vaca da la leche, la leche deja el queso, el queso deja el suero para el cerdo, el cerdo y la vaca dejan el abono, y el abono levanta el pasto. En la lechería campesina la plata queda en la finca, no en la agropecuaria.',
  },
];

const COPY_CALMA =
  'A la izquierda, el potrero con el hato; al centro, la ramada del ordeño; a la derecha, la quesería. Toque el botón para ver el paso a paso del potrero al queso.';
const COPY_PASOS =
  'Siga los números: el pasto de la manga rotada se vuelve leche en el ordeño, la leche colada cuaja en la olla, la cuajada se prensa hecha queso, y el suero y la boñiga vuelven a la finca. Nada se pierde.';

/**
 * MundoLecheria3D — la lechería campesina andina, montable con su propio
 * `<Canvas>`. Sin lógica de negocio: es una vitrina
 * (#/mockups/mundo-lecheria-3d · prod #diorama_lecheria). El tier y
 * reduced-motion se detectan aquí (mockup standalone), igual que sus pares.
 */
export default function MundoLecheria3D() {
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
    <main className="lechd-root">
      <style>{CSS_LECHD}</style>

      <header className="lechd-head">
        <p className="lechd-kicker">Los mundos de su finca · vitrina</p>
        <h1>La lechería campesina</h1>
        <p className="lechd-lema">
          Del potrero al queso en un solo rincón: el hato pastando en la manga
          rotada con su cerca viva, la ramada del ordeño con la cantina y el
          lienzo de colar, la quesería encalada donde la leche cuaja y se
          prensa, y el ciclo que no bota nada — el suero a los cerdos y las
          gallinas, la boñiga al abono y el abono de vuelta al pasto.
        </p>
      </header>

      <section
        className="lechd-escena"
        data-tier={tier}
        aria-label="La lechería campesina en 3D: el potrero, el ordeño y la quesería"
      >
        <Canvas
          className={`lechd-canvas${listo ? ' lechd-canvas--lista' : ''}`}
          dpr={perfil.dpr}
          gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
          camera={{ position: [2.6, 6.4, 15.8], fov: 45 }}
          frameloop={reducedMotion ? 'demand' : 'always'}
          onCreated={() => setListo(true)}
        >
          <EscenaLecheria tier={tier} reducedMotion={reducedMotion} etiquetas={etiquetas} />
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom
            minDistance={7}
            maxDistance={24}
            target={[1.6, 0.9, 1.6]}
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

        <div className="lechd-chrome">
          <div className="lechd-pie">
            <button
              type="button"
              className="lechd-boton"
              aria-pressed={etiquetas}
              onClick={() => setEtiquetas((v) => !v)}
            >
              {etiquetas ? 'Quitar las etiquetas' : 'Ver el paso a paso'}
            </button>
            <p className="lechd-carta" role="status">
              {etiquetas ? COPY_PASOS : COPY_CALMA}
            </p>
          </div>
        </div>
      </section>

      <section className="lechd-leyenda" aria-label="Del potrero al queso, paso por paso">
        <h2>Del potrero al queso</h2>
        <ol>
          {PASOS_LECHERIA.map((p) => (
            <li key={p.titulo}>
              <span className="lechd-emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="lechd-leyenda" aria-label="Los cuidados del hato lechero">
        <h2>El saber que hace buena la leche</h2>
        <ul>
          {CUIDADOS.map((c) => (
            <li key={c.titulo}>
              <span className="lechd-emoji" aria-hidden="true">{c.emoji}</span>
              <div>
                <b>{c.titulo}</b>
                <p>{c.texto}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="lechd-nota">
          Saber campesino de manejo del hato y de la quesera de la casa. Para
          vender queso por fuera de la vereda aplican los permisos sanitarios:
          en la UMATA o con el extensionista le orientan el registro.
        </p>
        <p className="lechd-cierre">
          El queso campesino no sale de una fábrica: sale de un potrero rotado
          a tiempo, de una vaca bien tratada, de una leche colada con juicio y
          de una cuajada prensada con paciencia. Y hasta el suero encuentra su
          boca. Así es la lechería que no bota nada.
        </p>
      </section>
    </main>
  );
}
