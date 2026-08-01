/*
 * MundoLecheria3D — la LECHERÍA CAMPESINA andina en un solo rincón 3D de la
 * finca (ruta #/mockups/mundo-lecheria-3d · prod #diorama_lecheria).
 *
 * La leche contada como SISTEMA VIVO, no como fábrica:
 *
 *   - EL POTRERO ROTADO: el hato (vacas criollas y una pinta, con su ternero)
 *     pastando en la franja del día, mientras la franja de atrás DESCANSA con
 *     el pasto alto recuperándose. Cercas vivas de postes y arbustos floridos
 *     que dan sombra, comida y casa a los polinizadores.
 *
 *   - EL ORDEÑO DE LA MAÑANA: la ramada de paja, la vaca tranquila amarrada al
 *     poste, el campesino en su butaco con el balde, y la leche recién
 *     ordeñada COLADA por el lienzo hacia la cantina. Higiene de casa, sin
 *     fábrica.
 *
 *   - LA QUESERÍA ARTESANAL: la caseta encalada con su fogón de leña, la paila
 *     donde la leche tibia CUAJA con el cuajo, la mesa del MOLDE y la PRENSA
 *     de piedra, el queso fresco ESCURRIENDO en la esterilla y la tinaja del
 *     SUERO apartado.
 *
 *   - EL CICLO VIRTUOSO: el suero va a la canoa de los cerdos y las gallinas,
 *     la boñiga del potrero se vuelve compost y el compost vuelve a la
 *     pastura. En la lechería campesina NADA SE PIERDE.
 *
 * DIRECCIÓN DE ARTE (todo dentro del framework, nada inventado por fuera):
 *   - Atmósfera de la MAÑANA dorada del kit (`CIELOS_HORA.manana`): el ordeño
 *     es faena de madrugada y la luz tibia de trabajo temprano es su hora.
 *   - Materiales de `PALETA`/`mezclar` (atmosferaMadre): Lambert flatShading,
 *     cero texturas, cero CDN. La ley de coherencia del valle.
 *   - La fauna es la MISMA librería rubber-hose (`Bicho` de FaunaEscena):
 *     mariposa y colibrí en la cerca viva florida, escarabajo estercolero en
 *     la boñiga, lombriz en el compost. El campesino ordeñador es un billboard
 *     SVG del mismo patrón (Html + `mundo-fauna`).
 *   - Polen del kit (`ParticulasAmbientales`) sobre la cerca viva.
 *
 * RENDIMIENTO: pastizal instanciado (1 draw call para todas las macollas),
 * Lambert sin shadow-map, presupuestos por `perfilDeTier`; `reducedMotion`
 * congela vacas/humo/goteos y pasa el frameloop a demanda.
 *
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

/* La mañana dorada del kit: única fuente de la atmósfera de esta escena. */
const DIA = CIELOS_HORA.manana;

/* La paleta del framework entintada apenas hacia la luz tibia de la mañana. */
const TINTE = DIA.niebla;
const P = {
  pasto: mezclar('#79a44e', TINTE, 0.22), // el verde de la pastura
  pastoSeco: mezclar('#a8a45c', TINTE, 0.24), // motas pajizas
  pastoFresco: mezclar('#55963e', TINTE, 0.16), // la franja en descanso, recuperándose
  pastoComido: mezclar('#a2a458', TINTE, 0.26), // la franja pastoreada, a ras
  barro: mezclar('#6b5138', TINTE, 0.2), // el barro pisoteado del corral
  patio: mezclar('#b09468', TINTE, 0.25), // tierra apisonada de la quesería
  maderaVieja: mezclar('#7a5a38', TINTE, 0.2), // postes y tablas curtidas
  maderaClara: mezclar('#a5804e', TINTE, 0.22), // mesas y butaco
  paja: mezclar('#c9a860', TINTE, 0.22), // el techo de la ramada
  teja: mezclar('#a05a3a', TINTE, 0.2), // la teja de barro de la quesería
  encalado: mezclar('#efe6d2', TINTE, 0.14), // la pared blanca de cal
  adobe: mezclar('#9a5a38', TINTE, 0.22), // el fogón de barro
  cobre: mezclar('#b06a3a', TINTE, 0.15), // la paila
  aluminio: mezclar('#c2c8cc', TINTE, 0.22), // cantina y balde
  leche: mezclar('#f6f1e2', TINTE, 0.06),
  cuajada: mezclar('#f0e7ca', TINTE, 0.08),
  queso: mezclar('#eeddb0', TINTE, 0.08),
  suero: mezclar('#d8d296', TINTE, 0.12), // el suero verdoso apartado
  vacaBlanca: mezclar('#e6ddcc', TINTE, 0.1),
  vacaNegra: mezclar('#3c352c', TINTE, 0.12),
  vacaRoja: mezclar('#96683f', TINTE, 0.14), // la criolla rojiza
  ternero: mezclar('#c08a56', TINTE, 0.12),
  ubre: mezclar('#d8a090', TINTE, 0.12),
  cerdo: mezclar('#d89a86', TINTE, 0.14),
  gallina: mezclar('#a5642f', TINTE, 0.16),
  compost: mezclar('#4c3a26', TINTE, 0.18),
  boniga: mezclar('#59492e', TINTE, 0.2),
  arbusto: mezclar('#4f7a38', TINTE, 0.2), // la cerca viva
  florCerca: mezclar('#e2c84a', TINTE, 0.08), // sus flores amarillas
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
/* Ruido determinista (hash de senos): misma finca siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/* La geografía: la falda lechera con lomas al fondo y CUATRO explanadas de
   faena — el potrero a la izquierda, la ramada de ordeño al centro, la
   quesería a la derecha y el rincón del ciclo (cerdos, gallinas, compost). */
const ANCHO = 36;
const FONDO = 30;
/* Peso de "explanada": 1 donde la faena aplana el piso, 0 en la loma. */
function explanada(wx, wz) {
  return Math.max(
    gauss(wx, wz, -7.5, 2.5, 5.5, 3.5), // el potrero del día
    gauss(wx, wz, -7.5, -2.5, 5.5, 3.0), // la franja en descanso
    gauss(wx, wz, 2.8, 3.4, 3.0, 2.6), // la ramada del ordeño
    gauss(wx, wz, 8.3, 0.8, 3.2, 2.6), // la quesería
    gauss(wx, wz, 8.5, 5.4, 3.0, 2.2), // el rincón del ciclo
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

/* Malla del terreno con colores por vértice: la franja pastoreada a ras y
   amarillenta, la franja en descanso verde y tupida, el barro del corral de
   ordeño y la tierra clara del patio de la quesería. */
function construirTerreno(seg, plano) {
  const nx = seg + 1, nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cPasto = new THREE.Color(P.pasto);
  const cSeco = new THREE.Color(P.pastoSeco);
  const cFresco = new THREE.Color(P.pastoFresco);
  const cComido = new THREE.Color(P.pastoComido);
  const cBarro = new THREE.Color(P.barro);
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
      // la ROTACIÓN se lee en el suelo: franja del día a ras, franja de atrás tupida
      c.lerp(cComido, clamp(gauss(wx, wz, -7.5, 3.2, 4.8, 2.4) * 0.8, 0, 0.6));
      c.lerp(cFresco, clamp(gauss(wx, wz, -7.5, -3.0, 4.8, 2.4) * 0.95, 0, 0.7));
      // el barro pisoteado del ordeño y la tierra clara de la quesería
      c.lerp(cBarro, clamp(gauss(wx, wz, 2.8, 3.4, 2.2, 1.8) * 1.0, 0, 0.85));
      c.lerp(cPatio, clamp(gauss(wx, wz, 8.3, 0.8, 2.6, 2.0) * 1.0, 0, 0.9));
      c.lerp(cBarro, clamp(gauss(wx, wz, 8.5, 5.4, 2.0, 1.5) * 0.7, 0, 0.55));
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

/* Las luces de la mañana dorada del kit. */
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
    [-12, 9.2, -13, 3.0],
    [3, 10.4, -14, 2.5],
    [12, 8.9, -12, 2.8],
  ];
  return (
    <group>
      {nubes.map((n, i) => (
        <mesh key={i} position={[n[0], n[1], n[2]]} scale={[n[3], n[3] * 0.34, n[3] * 0.7]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#fdf6e4" transparent opacity={0.85} depthWrite={false} />
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
        <div className="leche-chip" aria-hidden="true">
          {paso != null && <b>{paso}</b>}
          {texto}
        </div>
      </Html>
    </group>
  );
}

/* ══════════════════════ EL POTRERO ROTADO ══════════════════════ */

/* El pastizal instanciado: macollas facetadas = 1 draw call para toda la
   pastura. En la franja EN DESCANSO crecen altas y tupidas (el potrero
   recuperándose); en la franja del día quedan bajitas, ya pastoreadas. */
function Pastizal({ n }) {
  const macollas = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(133);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 12) {
      intentos += 1;
      const wx = -13.5 + rng() * 12.5;
      const wz = -6.2 + rng() * 12.6;
      // el pasto no invade la ramada, la quesería ni el rincón del ciclo
      if (gauss(wx, wz, 2.8, 3.4, 2.4, 2.0) > 0.4) continue;
      if (gauss(wx, wz, 8.3, 0.8, 2.8, 2.2) > 0.4) continue;
      const descansa = wz < 0.2; // la franja de atrás está en descanso
      lista.push({
        wx, wz,
        y: alturaFinca(wx, wz),
        esc: descansa ? 1.1 + rng() * 0.8 : 0.35 + rng() * 0.3,
        giro: rng() * Math.PI * 2,
        verde: descansa ? 0.65 + rng() * 0.35 : rng() * 0.4,
      });
    }
    return lista;
  }, [n]);

  useEffect(() => {
    const m = macollas.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const seco = new THREE.Color(P.pastoComido);
    const fresco = new THREE.Color(P.pastoFresco);
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y + 0.16 * s.esc, s.wz);
      dummy.rotation.set(0, s.giro, 0);
      dummy.scale.set(s.esc, s.esc, s.esc);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tinte.lerpColors(seco, fresco, s.verde);
      m.setColorAt(i, tinte);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [sitios]);

  return (
    <instancedMesh ref={macollas} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
      <coneGeometry args={[0.14, 0.4, 5]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* Un tramo de cerca: postes de madera con dos hilos, siguiendo el terreno. */
function Cerca({ desde, hasta, postes = 6 }) {
  const puntos = useMemo(() => {
    const lista = [];
    for (let i = 0; i < postes; i++) {
      const t = i / (postes - 1);
      const wx = desde[0] + (hasta[0] - desde[0]) * t;
      const wz = desde[1] + (hasta[1] - desde[1]) * t;
      lista.push({ wx, wz, y: alturaFinca(wx, wz) });
    }
    return lista;
  }, [desde, hasta, postes]);
  const ang = Math.atan2(hasta[0] - desde[0], hasta[1] - desde[1]);
  return (
    <group>
      {puntos.map((p2, i) => (
        <mesh key={i} position={[p2.wx, p2.y + 0.5, p2.wz]}>
          <cylinderGeometry args={[0.045, 0.06, 1.0, 5]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
      ))}
      {[0.55, 0.85].map((h, j) => {
        const mx = (desde[0] + hasta[0]) / 2;
        const mz = (desde[1] + hasta[1]) / 2;
        const largo = Math.hypot(hasta[0] - desde[0], hasta[1] - desde[1]);
        const my = (puntos[0].y + puntos[puntos.length - 1].y) / 2;
        return (
          <group key={j} position={[mx, my + h, mz]} rotation={[0, ang, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.012, largo, 4]} />
              <meshLambertMaterial color={mezclar(P.maderaVieja, '#4a3a24', 0.4)} flatShading />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* Arbusto de la cerca viva: mata redonda con flores amarillas (botón de oro,
   el árbol forrajero del potrero andino). */
function ArbustoVivo({ pos, esc = 1, semilla = 1 }) {
  const flores = useMemo(() => {
    const rng = crearRng(150 + semilla);
    return Array.from({ length: 5 }, () => ({
      x: (rng() - 0.5) * 0.7,
      y: 0.75 + rng() * 0.5,
      z: (rng() - 0.5) * 0.6,
    }));
  }, [semilla]);
  return (
    <group position={pos} scale={esc}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 0.6, 5]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      <mesh position={[0, 0.85, 0]} scale={[1, 0.85, 1]}>
        <sphereGeometry args={[0.55, 7, 6]} />
        <meshLambertMaterial color={P.arbusto} flatShading />
      </mesh>
      <mesh position={[0.3, 1.1, 0.15]} scale={[1, 0.8, 1]}>
        <sphereGeometry args={[0.34, 6, 5]} />
        <meshLambertMaterial color={mezclar(P.arbusto, '#6a9a4a', 0.4)} flatShading />
      </mesh>
      {flores.map((f, i) => (
        <mesh key={i} position={[f.x, f.y, f.z]}>
          <sphereGeometry args={[0.05, 5, 4]} />
          <meshLambertMaterial color={P.florCerca} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* La vaca low-poly: cuerpo, manchas, cabeza con cachos cortos, ubre y rabo.
   `pastando` la pone a comer (la cabeza baja y sube mansa); el rabo espanta
   moscas en todas. reduced-motion: quieta. */
function Vaca({
  pos, rotY = 0, esc = 1, cuerpo = P.vacaBlanca, mancha = P.vacaNegra,
  conManchas = true, conUbre = true, pastando = false, fase = 0, reducedMotion = false,
}) {
  const cabeza = useRef(null);
  const rabo = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    if (cabeza.current && pastando) {
      // el vaivén manso de pastar: baja al pasto, arranca, vuelve a subir
      cabeza.current.rotation.z = -0.32 - Math.sin(t * 0.55 + fase) * 0.26;
    }
    if (rabo.current) {
      rabo.current.rotation.x = Math.sin(t * 1.4 + fase * 2) * 0.35;
    }
  });
  return (
    <group position={pos} rotation={[0, rotY, 0]} scale={esc}>
      {/* cuerpo */}
      <mesh position={[0, 0.74, 0]} scale={[1.42, 0.82, 0.66]}>
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshLambertMaterial color={cuerpo} flatShading />
      </mesh>
      {/* las manchas del pelaje */}
      {conManchas && (
        <>
          <mesh position={[0.22, 0.86, 0.26]} scale={[0.55, 0.4, 0.22]}>
            <sphereGeometry args={[0.5, 6, 5]} />
            <meshLambertMaterial color={mancha} flatShading />
          </mesh>
          <mesh position={[-0.3, 0.72, -0.26]} scale={[0.48, 0.42, 0.2]}>
            <sphereGeometry args={[0.5, 6, 5]} />
            <meshLambertMaterial color={mancha} flatShading />
          </mesh>
          <mesh position={[-0.12, 0.94, 0.24]} scale={[0.34, 0.3, 0.16]}>
            <sphereGeometry args={[0.5, 6, 5]} />
            <meshLambertMaterial color={mancha} flatShading />
          </mesh>
        </>
      )}
      {/* cabeza (pivota al pastar) */}
      <group ref={cabeza} position={[0.68, 0.9, 0]} rotation={[0, 0, pastando ? -0.45 : -0.1]}>
        <mesh position={[0.26, 0, 0]} scale={[0.95, 0.8, 0.68]}>
          <sphereGeometry args={[0.21, 7, 6]} />
          <meshLambertMaterial color={cuerpo} flatShading />
        </mesh>
        <mesh position={[0.42, -0.06, 0]} scale={[0.7, 0.5, 0.55]}>
          <sphereGeometry args={[0.16, 6, 5]} />
          <meshLambertMaterial color={mezclar(cuerpo, '#8a7355', 0.35)} flatShading />
        </mesh>
        {/* cachos cortos y orejas */}
        <mesh position={[0.22, 0.18, 0.12]} rotation={[0.5, 0, -0.4]}>
          <coneGeometry args={[0.03, 0.16, 5]} />
          <meshLambertMaterial color="#e8ddc4" flatShading />
        </mesh>
        <mesh position={[0.22, 0.18, -0.12]} rotation={[-0.5, 0, -0.4]}>
          <coneGeometry args={[0.03, 0.16, 5]} />
          <meshLambertMaterial color="#e8ddc4" flatShading />
        </mesh>
        <mesh position={[0.16, 0.08, 0.19]} rotation={[1.15, 0, 0]} scale={[1, 0.5, 1]}>
          <coneGeometry args={[0.05, 0.13, 4]} />
          <meshLambertMaterial color={cuerpo} flatShading />
        </mesh>
        <mesh position={[0.16, 0.08, -0.19]} rotation={[-1.15, 0, 0]} scale={[1, 0.5, 1]}>
          <coneGeometry args={[0.05, 0.13, 4]} />
          <meshLambertMaterial color={cuerpo} flatShading />
        </mesh>
      </group>
      {/* patas */}
      {[
        [0.44, 0.3], [0.44, -0.26], [-0.44, 0.28], [-0.44, -0.26],
      ].map((p2, i) => (
        <mesh key={i} position={[p2[0], 0.24, p2[1] * 0.66]}>
          <cylinderGeometry args={[0.05, 0.065, 0.5, 5]} />
          <meshLambertMaterial color={mezclar(cuerpo, '#5a4a38', 0.4)} flatShading />
        </mesh>
      ))}
      {/* la ubre de vaca lechera */}
      {conUbre && (
        <mesh position={[-0.22, 0.42, 0]} scale={[0.9, 0.7, 0.8]}>
          <sphereGeometry args={[0.19, 6, 5]} />
          <meshLambertMaterial color={P.ubre} flatShading />
        </mesh>
      )}
      {/* rabo (espanta moscas) */}
      <group ref={rabo} position={[-0.72, 0.88, 0]}>
        <mesh position={[0, -0.26, 0]} rotation={[0, 0, 0.12]}>
          <cylinderGeometry args={[0.018, 0.03, 0.52, 4]} />
          <meshLambertMaterial color={mezclar(cuerpo, '#5a4a38', 0.5)} flatShading />
        </mesh>
        <mesh position={[0.03, -0.56, 0]}>
          <sphereGeometry args={[0.05, 5, 4]} />
          <meshLambertMaterial color={mezclar(cuerpo, '#3a3028', 0.6)} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* Las boñigas del potrero: del estiércol vive el escarabajo y nace el abono. */
function Bonigas() {
  const sitios = [
    [-5.2, 4.4, 0.2], [-9.6, 2.4, 0.24], [-3.8, 2.0, 0.18],
  ];
  return (
    <group>
      {sitios.map((b, i) => (
        <mesh
          key={i}
          position={[b[0], alturaFinca(b[0], b[1]) + 0.04, b[1]]}
          scale={[1, 0.3, 1]}
        >
          <sphereGeometry args={[b[2], 6, 5]} />
          <meshLambertMaterial color={P.boniga} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* El hato completo en la franja del día; la franja de atrás descansa. */
function Potrero({ reducedMotion, etiquetas }) {
  return (
    <group>
      {/* el hato pastando: tres vacas grandes + la criolla + el ternero */}
      <Vaca
        pos={[-9.8, Y_PATIO, 3.4]} rotY={0.5} pastando fase={0.3}
        reducedMotion={reducedMotion}
      />
      <Vaca
        pos={[-6.6, Y_PATIO, 4.8]} rotY={-0.7} pastando fase={2.1}
        cuerpo={P.vacaRoja} conManchas={false} reducedMotion={reducedMotion}
      />
      <Vaca
        pos={[-4.4, Y_PATIO, 2.6]} rotY={2.6} pastando fase={4.2}
        mancha={mezclar(P.vacaRoja, '#6a4428', 0.4)} reducedMotion={reducedMotion}
      />
      <Vaca
        pos={[-11.6, Y_PATIO, 1.6]} rotY={1.9} pastando fase={1.2}
        cuerpo={mezclar(P.vacaBlanca, P.vacaRoja, 0.35)} conManchas={false}
        reducedMotion={reducedMotion}
      />
      {/* el ternero, siempre cerquita de la mamá */}
      <Vaca
        pos={[-7.4, Y_PATIO, 5.6]} rotY={-1.2} esc={0.55} pastando fase={3.0}
        cuerpo={P.ternero} conManchas={false} conUbre={false}
        reducedMotion={reducedMotion}
      />
      <Bonigas />

      {/* la cerca de la rotación divide las dos franjas; la del fondo cierra */}
      <Cerca desde={[-13.2, 0.2]} hasta={[-1.8, 0.2]} postes={8} />
      <Cerca desde={[-13.2, -6.0]} hasta={[-1.8, -6.0]} postes={8} />
      <Cerca desde={[-13.2, 0.2]} hasta={[-13.2, 6.4]} postes={5} />
      {/* la cerca viva: arbustos forrajeros floridos entre los postes */}
      <ArbustoVivo pos={[-13.1, alturaFinca(-13.1, 4.6), 4.6]} semilla={1} />
      <ArbustoVivo pos={[-13.2, alturaFinca(-13.2, 1.8), 1.8]} esc={0.85} semilla={4} />
      <ArbustoVivo pos={[-10.4, alturaFinca(-10.4, -6.0), -6.0]} esc={1.15} semilla={2} />
      <ArbustoVivo pos={[-6.2, alturaFinca(-6.2, -6.0), -6.0]} esc={0.9} semilla={7} />
      <ArbustoVivo pos={[-2.4, alturaFinca(-2.4, -6.1), -6.1]} esc={1.05} semilla={5} />

      {etiquetas && (
        <>
          <Etiqueta pos={[-7.5, Y_PATIO + 2.6, 3.6]} paso="1" texto="El potrero del día" />
          <Etiqueta pos={[-7.5, Y_PATIO + 1.7, -3.2]} texto="La franja en descanso" />
          <Etiqueta pos={[-5.2, Y_PATIO + 0.8, 4.4]} texto="La boñiga, al compost" />
        </>
      )}
    </group>
  );
}

/* ══════════════════════ EL ORDEÑO DE LA MAÑANA ══════════════════════ */

/* El campesino ordeñador: billboard SVG rubber-hose del mismo patrón que la
   fauna (Html + clase mundo-fauna). Sentado en el butaco, manos a la ubre. */
function CampesinoOrdenando({ pos, reducedMotion }) {
  return (
    <group position={pos}>
      <Html center distanceFactor={7} zIndexRange={[20, 0]}>
        <div className="mundo-fauna" aria-hidden="true">
          <svg width="52" height="58" viewBox="0 0 52 58" role="img">
            <title>El ordeñador en su butaco</title>
            {/* el butaco de tres patas */}
            <rect x="30" y="46" width="12" height="3" rx="1.5" fill="#7a5a38" />
            <line x1="32" y1="49" x2="30" y2="56" stroke="#6a4c2e" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="40" y1="49" x2="42" y2="56" stroke="#6a4c2e" strokeWidth="2.4" strokeLinecap="round" />
            <g>
              {/* piernas dobladas y botas */}
              <path d="M34 44 Q26 46 20 50" fill="none" stroke="#4a5a68" strokeWidth="5" strokeLinecap="round" />
              <ellipse cx="17" cy="52" rx="4.4" ry="2.6" fill="#2e2620" />
              {/* la ruana terracota */}
              <path d="M28 22 L46 24 L44 46 L30 46 Z" fill="#8a3e2e" />
              <path d="M29 30 L45 31.4" stroke="#c9a860" strokeWidth="2" strokeLinecap="round" />
              {/* brazos a la ubre (a la izquierda) */}
              <path d="M31 28 Q22 30 15 36" fill="none" stroke="#c68a5f" strokeWidth="4.4" strokeLinecap="round" />
              <path d="M32 33 Q24 36 17 41" fill="none" stroke="#c68a5f" strokeWidth="4.4" strokeLinecap="round" />
              <circle cx="14" cy="37" r="2.6" fill="#c68a5f" />
              <circle cx="16" cy="42" r="2.6" fill="#c68a5f" />
              {/* cabeza y sombrero aguadeño */}
              <circle cx="37" cy="16" r="6" fill="#c68a5f" />
              <ellipse cx="37" cy="10.5" rx="10.5" ry="3.4" fill="#e8dcc0" />
              <path d="M31 10 Q31 4 37 4 Q43 4 43 10" fill="#e8dcc0" />
              <path d="M31 9.6 L43 9.6" stroke="#8a6a35" strokeWidth="1.6" />
              {/* el ojo tranquilo (la faena mansa) */}
              <circle cx="34.4" cy="16" r="1" fill="#3c2f1c" />
              {!reducedMotion && (
                <animateTransform
                  attributeName="transform" type="rotate"
                  values="-1 37 30; 1 37 30; -1 37 30" dur="2.6s" repeatCount="indefinite"
                />
              )}
            </g>
          </svg>
        </div>
      </Html>
    </group>
  );
}

/* La ramada del ordeño: horcones, techo de paja, la vaca amarrada al poste,
   el butaco, el balde con su chorrito, y la cantina con el lienzo de colar. */
const RAMADA_POS = [2.8, Y_PATIO, 3.4];
function RamadaOrdeno({ reducedMotion, etiquetas }) {
  const chorro = useRef(null);
  const leche = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    // el chorrito de leche aparece y desaparece con el ritmo del ordeño
    if (chorro.current) {
      const f = (t * 1.6) % 1;
      chorro.current.material.opacity = f < 0.55 ? 0.85 : 0;
    }
    if (leche.current) {
      leche.current.scale.setScalar(1 + Math.sin(t * 3.2) * 0.03);
    }
  });
  return (
    <group position={RAMADA_POS} rotation={[0, -0.18, 0]}>
      {/* la enramada: cuatro horcones y techo de paja a un agua */}
      {[
        [-1.7, -1.3], [1.7, -1.3], [-1.7, 1.3], [1.7, 1.3],
      ].map((h, i) => (
        <mesh key={i} position={[h[0], 1.25, h[1]]}>
          <cylinderGeometry args={[0.07, 0.09, 2.5, 5]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 2.56, 0]} rotation={[0, 0, 0.13]}>
        <boxGeometry args={[4.1, 0.12, 3.2]} />
        <meshLambertMaterial color={P.paja} flatShading />
      </mesh>
      <mesh position={[0, 2.7, 0]} rotation={[0, 0, 0.13]}>
        <boxGeometry args={[3.5, 0.1, 2.7]} />
        <meshLambertMaterial color={mezclar(P.paja, '#a8873e', 0.4)} flatShading />
      </mesh>

      {/* la vaca del ordeño, mansa, amarrada al poste */}
      <Vaca
        pos={[-0.3, 0, 0.1]} rotY={Math.PI} esc={1.15}
        mancha={P.vacaNegra} reducedMotion={reducedMotion}
      />
      {/* la soga al poste */}
      <mesh position={[-1.25, 1.05, 0.6]} rotation={[0, 0.5, 1.25]}>
        <cylinderGeometry args={[0.014, 0.014, 1.15, 4]} />
        <meshLambertMaterial color={mezclar(P.paja, '#8a6a35', 0.5)} flatShading />
      </mesh>

      {/* el ordeñador en su butaco, del lado de la ubre */}
      <CampesinoOrdenando pos={[0.55, 0.62, 0.7]} reducedMotion={reducedMotion} />

      {/* el balde bajo la ubre y el chorrito de leche */}
      <mesh position={[-0.06, 0.16, 0.38]}>
        <cylinderGeometry args={[0.16, 0.12, 0.3, 8, 1, true]} />
        <meshLambertMaterial color={P.aluminio} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={leche} position={[-0.06, 0.27, 0.38]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.14, 8]} />
        <meshLambertMaterial color={P.leche} />
      </mesh>
      <mesh ref={chorro} position={[-0.06, 0.42, 0.34]} rotation={[0.14, 0, 0.06]}>
        <cylinderGeometry args={[0.008, 0.012, 0.28, 4]} />
        <meshBasicMaterial color="#fdf9ee" transparent opacity={0.85} />
      </mesh>

      {/* la cantina con el embudo y el lienzo de COLAR la leche */}
      <group position={[1.75, 0, 1.05]}>
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.24, 0.28, 0.68, 9]} />
          <meshLambertMaterial color={P.aluminio} flatShading />
        </mesh>
        <mesh position={[0, 0.76, 0]}>
          <cylinderGeometry args={[0.13, 0.2, 0.18, 9]} />
          <meshLambertMaterial color={mezclar(P.aluminio, '#9aa2a8', 0.4)} flatShading />
        </mesh>
        {/* el embudo con el lienzo blanco encima */}
        <mesh position={[0, 0.98, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.2, 0.24, 8, 1, true]} />
          <meshLambertMaterial color={P.aluminio} flatShading side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 1.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.19, 8]} />
          <meshLambertMaterial color={P.leche} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* otro balde ya lleno, esperando turno de colarse */}
      <mesh position={[1.3, 0.14, 0.5]}>
        <cylinderGeometry args={[0.14, 0.11, 0.28, 8]} />
        <meshLambertMaterial color={P.aluminio} flatShading />
      </mesh>

      {etiquetas && (
        <>
          <Etiqueta pos={[0, 3.3, 0.4]} paso="2" texto="El ordeño de la mañana" />
          <Etiqueta pos={[1.75, 1.75, 1.05]} paso="3" texto="La leche se cuela" />
        </>
      )}
    </group>
  );
}

/* ══════════════════════ LA QUESERÍA ARTESANAL ══════════════════════ */

/* La caseta de la quesería: paredes encaladas, teja de barro, abierta al
   frente. Adentro: el fogón con la paila cuajando, la mesa del molde y la
   prensa, el queso escurriendo y la tinaja del suero. */
const QUESERIA_POS = [8.3, Y_PATIO, 0.8];
function Queseria({ reducedMotion, tier, etiquetas }) {
  const fuego = useRef(null);
  const humos = useRef(null);
  const gotas = useRef(null);
  const puffs = useMemo(() => {
    const rng = crearRng(310);
    return Array.from({ length: 3 }, (_, i) => ({
      fase: i * 0.9 + rng() * 0.5,
      dx: (rng() - 0.5) * 0.25,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    if (fuego.current) {
      const s = 0.85 + Math.sin(t * 8.6) * 0.1 + Math.sin(t * 5.3 + 1) * 0.08;
      fuego.current.scale.set(s, s * (1 + Math.sin(t * 6.9) * 0.14), 1);
    }
    if (humos.current) {
      humos.current.children.forEach((h, i) => {
        const p = puffs[i];
        const f = ((t * 0.3 + p.fase) % 1.6) / 1.6;
        h.position.y = 2.3 + f * 2.0;
        h.position.x = p.dx + Math.sin(t * 0.6 + p.fase) * 0.15 + f * 0.4;
        h.scale.setScalar(0.28 + f * 0.75);
        h.material.opacity = 0.34 * (1 - f);
      });
    }
    // las gotas de suero del queso escurriendo
    if (gotas.current) {
      gotas.current.children.forEach((g, i) => {
        const f = (t * 0.9 + i * 0.37) % 1;
        g.position.y = 0.62 - f * 0.5;
        g.material.opacity = 0.8 * (1 - f * f);
      });
    }
  });

  return (
    <group position={QUESERIA_POS} rotation={[0, 0.24, 0]}>
      {/* paredes encaladas: la de atrás y la lateral; abierta hacia la cámara */}
      <mesh position={[0, 1.1, -1.5]}>
        <boxGeometry args={[4.6, 2.2, 0.18]} />
        <meshLambertMaterial color={P.encalado} flatShading />
      </mesh>
      <mesh position={[-2.2, 1.1, -0.3]}>
        <boxGeometry args={[0.18, 2.2, 2.6]} />
        <meshLambertMaterial color={mezclar(P.encalado, TINTE, 0.12)} flatShading />
      </mesh>
      {/* el zócalo terracota de la pared campesina */}
      <mesh position={[0, 0.25, -1.4]}>
        <boxGeometry args={[4.6, 0.5, 0.06]} />
        <meshLambertMaterial color={mezclar(P.teja, '#8a4a2e', 0.3)} flatShading />
      </mesh>
      {/* horcones del frente y techo de teja a un agua con alero */}
      {[[-2.2, 1.35], [2.2, 1.35]].map((h, i) => (
        <mesh key={i} position={[h[0], 1.2, h[1]]}>
          <cylinderGeometry args={[0.07, 0.09, 2.4, 5]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
      ))}
      {/* el alero SUBE hacia el frente: desde la cámara se lee el interior */}
      <mesh position={[0, 2.5, 0]} rotation={[-0.16, 0, 0]}>
        <boxGeometry args={[5.0, 0.12, 3.6]} />
        <meshLambertMaterial color={P.teja} flatShading />
      </mesh>
      <mesh position={[0, 2.62, -0.2]} rotation={[-0.16, 0, 0]}>
        <boxGeometry args={[4.4, 0.1, 3.0]} />
        <meshLambertMaterial color={mezclar(P.teja, '#7a3e26', 0.4)} flatShading />
      </mesh>

      {/* EL FOGÓN con la paila de la CUAJADA */}
      <group position={[-1.15, 0, -0.55]}>
        <mesh position={[0, 0.34, 0]}>
          <boxGeometry args={[1.35, 0.68, 1.1]} />
          <meshLambertMaterial color={P.adobe} flatShading />
        </mesh>
        <mesh position={[0, 0.26, 0.56]}>
          <boxGeometry args={[0.5, 0.36, 0.06]} />
          <meshLambertMaterial color="#2a1a10" flatShading />
        </mesh>
        <mesh ref={fuego} position={[0, 0.26, 0.6]}>
          <circleGeometry args={[0.16, 7]} />
          <meshBasicMaterial color="#ff9a3a" transparent opacity={0.95} side={THREE.DoubleSide} />
        </mesh>
        {tier === 'alto' && (
          <pointLight position={[0, 0.4, 0.8]} color="#ff9a4a" intensity={0.7} distance={3} />
        )}
        {/* la leña arrimada */}
        {[0, 1].map((i) => (
          <mesh
            key={i}
            position={[0.4 + i * 0.14, 0.08, 0.62]}
            rotation={[0, i * 0.6, Math.PI / 2 - 0.2]}
          >
            <cylinderGeometry args={[0.045, 0.055, 0.6, 5]} />
            <meshLambertMaterial color={mezclar(P.maderaVieja, '#4a3420', 0.5)} flatShading />
          </mesh>
        ))}
        {/* la paila con la leche cuajando: suero claro y bloques de cuajada */}
        <mesh position={[0, 0.82, 0]}>
          <cylinderGeometry args={[0.52, 0.34, 0.3, 12]} />
          <meshLambertMaterial color={P.cobre} flatShading />
        </mesh>
        <mesh position={[0, 0.94, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.46, 12]} />
          <meshLambertMaterial color={P.suero} />
        </mesh>
        {[
          [0.16, 0.1, 0.16], [-0.2, -0.06, 0.14], [0.02, 0.24, 0.13],
          [-0.06, -0.24, 0.12], [0.28, -0.14, 0.11],
        ].map((b, i) => (
          <mesh key={i} position={[b[0], 0.96, b[1]]} rotation={[0, i * 0.7, 0]}>
            <boxGeometry args={[b[2], 0.05, b[2] * 0.85]} />
            <meshLambertMaterial color={P.cuajada} flatShading />
          </mesh>
        ))}
        {/* el mecedor de palo apoyado en la paila */}
        <mesh position={[0.42, 1.05, 0.15]} rotation={[0.2, 0, -0.85]}>
          <cylinderGeometry args={[0.02, 0.026, 1.1, 5]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        {/* la chimenea de la quesería y su humo */}
        <mesh position={[-0.45, 1.9, -0.7]}>
          <boxGeometry args={[0.3, 1.4, 0.3]} />
          <meshLambertMaterial color={mezclar(P.adobe, '#6a3a22', 0.3)} flatShading />
        </mesh>
        <group ref={humos} position={[-0.45, 0, -0.7]}>
          {puffs.map((p, i) => (
            <mesh key={i} position={[p.dx, 2.4 + i * 0.5, 0]}>
              <sphereGeometry args={[0.26, 6, 5]} />
              <meshBasicMaterial color="#d8d2c4" transparent opacity={0.3} depthWrite={false} />
            </mesh>
          ))}
        </group>
      </group>

      {/* el estante del CUAJO y la totuma */}
      <group position={[1.6, 0, -1.3]}>
        <mesh position={[0, 1.15, 0]}>
          <boxGeometry args={[1.1, 0.06, 0.34]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        <mesh position={[-0.3, 1.31, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.22, 6]} />
          <meshLambertMaterial color={mezclar('#7a9a5a', TINTE, 0.2)} flatShading />
        </mesh>
        <mesh position={[0.1, 1.24, 0]} scale={[1, 0.55, 1]}>
          <sphereGeometry args={[0.11, 7, 5]} />
          <meshLambertMaterial color={mezclar(P.maderaClara, '#8a6a3a', 0.4)} flatShading />
        </mesh>
        <mesh position={[0.42, 1.28, 0]}>
          <cylinderGeometry args={[0.05, 0.04, 0.16, 6]} />
          <meshLambertMaterial color={P.leche} flatShading />
        </mesh>
      </group>

      {/* LA MESA DEL MOLDE Y LA PRENSA */}
      <group position={[0.85, 0, 0.35]}>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[1.5, 0.09, 0.95]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        {[
          [-0.62, -0.36], [0.62, -0.36], [-0.62, 0.36], [0.62, 0.36],
        ].map((p2, i) => (
          <mesh key={i} position={[p2[0], 0.3, p2[1]]}>
            <cylinderGeometry args={[0.04, 0.05, 0.58, 5]} />
            <meshLambertMaterial color={P.maderaVieja} flatShading />
          </mesh>
        ))}
        {/* el molde (aro de madera) con la cuajada, la tabla y la piedra de prensar */}
        <group position={[-0.32, 0.65, 0]}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.2, 10, 1, true]} />
            <meshLambertMaterial color={P.maderaVieja} flatShading side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.21, 0.21, 0.14, 10]} />
            <meshLambertMaterial color={P.cuajada} flatShading />
          </mesh>
          <mesh position={[0, 0.23, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.05, 10]} />
            <meshLambertMaterial color={P.maderaClara} flatShading />
          </mesh>
          <mesh position={[0, 0.38, 0]} rotation={[0.3, 0.8, 0.1]}>
            <dodecahedronGeometry args={[0.17]} />
            <meshLambertMaterial color={P.piedra} flatShading />
          </mesh>
        </group>
        {/* el balde que recoge el suero que suelta la prensa */}
        <mesh position={[-0.32, 0.14, 0.62]}>
          <cylinderGeometry args={[0.13, 0.1, 0.26, 8]} />
          <meshLambertMaterial color={P.aluminio} flatShading />
        </mesh>
        {/* EL QUESO fresco escurriendo en la esterilla */}
        <group position={[0.45, 0.65, 0]}>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.75, 0.03, 0.55]} />
            <meshLambertMaterial color={mezclar(P.paja, '#b8a67a', 0.4)} flatShading />
          </mesh>
          <mesh position={[-0.16, 0.12, 0.06]}>
            <cylinderGeometry args={[0.16, 0.17, 0.16, 10]} />
            <meshLambertMaterial color={P.queso} flatShading />
          </mesh>
          <mesh position={[0.22, 0.1, -0.1]}>
            <cylinderGeometry args={[0.12, 0.13, 0.13, 10]} />
            <meshLambertMaterial color={mezclar(P.queso, P.leche, 0.4)} flatShading />
          </mesh>
          {/* las gotas de suero cayendo de la mesa */}
          <group ref={gotas} position={[-0.1, -0.4, 0.28]}>
            {[0, 1, 2].map((i) => (
              <mesh key={i} position={[i * 0.16 - 0.1, 0.4, 0]}>
                <sphereGeometry args={[0.022, 5, 4]} />
                <meshBasicMaterial color={P.suero} transparent opacity={0.8} />
              </mesh>
            ))}
          </group>
        </group>
      </group>

      {/* la tinaja del SUERO apartado, junto a la puerta */}
      <group position={[2.05, 0, 0.9]}>
        <mesh position={[0, 0.3, 0]} scale={[1, 0.9, 1]}>
          <sphereGeometry args={[0.32, 9, 7]} />
          <meshLambertMaterial color={P.adobe} flatShading />
        </mesh>
        <mesh position={[0, 0.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.2, 9]} />
          <meshLambertMaterial color={P.suero} />
        </mesh>
      </group>

      {etiquetas && (
        <>
          <Etiqueta pos={[-1.15, 2.15, -0.5]} paso="4" texto="La cuajada en la paila" />
          <Etiqueta pos={[0.5, 1.85, 0.35]} paso="5" texto="El molde y la prensa" />
          <Etiqueta pos={[1.45, 1.25, 0.6]} paso="6" texto="El queso fresco" />
          <Etiqueta pos={[2.05, 1.1, 0.95]} texto="El suero, apartado" />
        </>
      )}
    </group>
  );
}

/* ══════════════════════ EL CICLO VIRTUOSO ══════════════════════ */

/* La gallina low-poly picoteando: cuerpo, cola, cabeza con cresta. */
function Gallina({ pos, rotY = 0, esc = 1, fase = 0, reducedMotion }) {
  const cuerpo = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !cuerpo.current) return;
    const t = clock.elapsedTime;
    const pico = Math.max(0, Math.sin(t * 2.2 + fase));
    cuerpo.current.rotation.z = -pico * 0.55;
  });
  return (
    <group position={pos} rotation={[0, rotY, 0]} scale={esc}>
      <group ref={cuerpo}>
        <mesh position={[0, 0.16, 0]} scale={[1.15, 0.9, 0.8]}>
          <sphereGeometry args={[0.13, 7, 5]} />
          <meshLambertMaterial color={P.gallina} flatShading />
        </mesh>
        <mesh position={[-0.13, 0.24, 0]} rotation={[0, 0, 0.9]}>
          <coneGeometry args={[0.06, 0.14, 4]} />
          <meshLambertMaterial color={mezclar(P.gallina, '#5a3a1e', 0.4)} flatShading />
        </mesh>
        <mesh position={[0.13, 0.26, 0]}>
          <sphereGeometry args={[0.055, 6, 5]} />
          <meshLambertMaterial color={P.gallina} flatShading />
        </mesh>
        <mesh position={[0.14, 0.32, 0]}>
          <boxGeometry args={[0.035, 0.045, 0.02]} />
          <meshLambertMaterial color="#c23a2e" flatShading />
        </mesh>
        <mesh position={[0.19, 0.25, 0]} rotation={[0, 0, -1.4]}>
          <coneGeometry args={[0.018, 0.05, 4]} />
          <meshLambertMaterial color="#e8a24a" flatShading />
        </mesh>
      </group>
      {[[0.03, 0.02], [-0.03, -0.02]].map((p2, i) => (
        <mesh key={i} position={[p2[0], 0.05, p2[1]]}>
          <cylinderGeometry args={[0.012, 0.012, 0.1, 4]} />
          <meshLambertMaterial color="#e8a24a" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* El cerdo low-poly feliz junto a la canoa del suero. */
function Cerdo({ pos, rotY = 0 }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.32, 0]} scale={[1.35, 0.85, 0.8]}>
        <sphereGeometry args={[0.26, 8, 6]} />
        <meshLambertMaterial color={P.cerdo} flatShading />
      </mesh>
      <mesh position={[0.34, 0.34, 0]} scale={[0.85, 0.8, 0.75]}>
        <sphereGeometry args={[0.15, 7, 5]} />
        <meshLambertMaterial color={P.cerdo} flatShading />
      </mesh>
      <mesh position={[0.47, 0.31, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.06, 0.07, 6]} />
        <meshLambertMaterial color={mezclar(P.cerdo, '#b8766a', 0.5)} flatShading />
      </mesh>
      {[0.08, -0.08].map((z, i) => (
        <mesh key={i} position={[0.36, 0.46, z]} rotation={[z * 4, 0, -0.3]}>
          <coneGeometry args={[0.04, 0.09, 4]} />
          <meshLambertMaterial color={P.cerdo} flatShading />
        </mesh>
      ))}
      {[
        [0.2, 0.12], [0.2, -0.12], [-0.2, 0.12], [-0.2, -0.12],
      ].map((p2, i) => (
        <mesh key={i} position={[p2[0], 0.1, p2[1]]}>
          <cylinderGeometry args={[0.032, 0.04, 0.2, 5]} />
          <meshLambertMaterial color={mezclar(P.cerdo, '#a8685c', 0.4)} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* El rincón donde NADA SE PIERDE: la canoa del suero con el cerdo y las
   gallinas, y la pila de compost donde la boñiga se vuelve abono. */
function RinconCiclo({ reducedMotion, etiquetas }) {
  return (
    <group>
      {/* la canoa del suero (tronco ahuecado) */}
      <group position={[6.9, Y_PATIO, 5.6]} rotation={[0, 0.35, 0]}>
        <mesh position={[0, 0.16, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.22, 1.5, 7]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
        <mesh position={[0, 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.3, 0.22]} />
          <meshLambertMaterial color={P.suero} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <Cerdo pos={[6.5, Y_PATIO, 4.7]} rotY={1.9} />
      <Gallina pos={[7.8, Y_PATIO, 5.0]} rotY={-0.6} fase={0.4} reducedMotion={reducedMotion} />
      <Gallina pos={[8.3, Y_PATIO, 5.9]} rotY={2.4} esc={0.85} fase={2.2} reducedMotion={reducedMotion} />

      {/* la pila de COMPOST: boñiga + tamo, tapada con paja, vuelve abono */}
      <group position={[10.9, Y_PATIO, 4.8]}>
        <mesh position={[0, 0.24, 0]} scale={[1.25, 0.55, 1]}>
          <sphereGeometry args={[0.62, 8, 6]} />
          <meshLambertMaterial color={P.compost} flatShading />
        </mesh>
        <mesh position={[0.1, 0.5, 0]} scale={[1.05, 0.4, 0.85]}>
          <sphereGeometry args={[0.5, 7, 5]} />
          <meshLambertMaterial color={mezclar(P.paja, '#8a6a3a', 0.45)} flatShading />
        </mesh>
        {/* la pala clavada */}
        <mesh position={[0.7, 0.5, 0.3]} rotation={[0.2, 0, -0.5]}>
          <cylinderGeometry args={[0.022, 0.026, 1.0, 5]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        <mesh position={[0.86, 0.14, 0.36]} rotation={[0.2, 0, -0.5]}>
          <boxGeometry args={[0.14, 0.2, 0.03]} />
          <meshLambertMaterial color={mezclar(P.aluminio, '#7a7a72', 0.5)} flatShading />
        </mesh>
      </group>

      {etiquetas && (
        <>
          <Etiqueta pos={[6.9, Y_PATIO + 1.2, 5.6]} paso="7" texto="El suero, a cerdos y gallinas" />
          <Etiqueta pos={[10.9, Y_PATIO + 1.3, 4.8]} paso="8" texto="Boñiga → compost → pastura" />
        </>
      )}
    </group>
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

  const nMacollas = tier === 'alto' ? 300 : 170;

  /* `color`/`fog` se adjuntan a la ESCENA: hijos directos, nunca en <group>. */
  return (
    <>
      <color attach="background" args={[DIA.fondo]} />
      {perfil.fog && <fog attach="fog" args={[DIA.niebla, DIA.nieblaCerca + 2, DIA.nieblaLejos]} />}
      <LucesManana />
      <NubesManana />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>
      <Pastizal n={nMacollas} />

      {/* el potrero rotado con su hato */}
      <Potrero reducedMotion={reducedMotion} etiquetas={etiquetas} />

      {/* la ramada del ordeño y la quesería */}
      <RamadaOrdeno reducedMotion={reducedMotion} etiquetas={etiquetas} />
      <Queseria reducedMotion={reducedMotion} tier={tier} etiquetas={etiquetas} />

      {/* el ciclo virtuoso: suero, boñiga, compost */}
      <RinconCiclo reducedMotion={reducedMotion} etiquetas={etiquetas} />

      {/* unas piedras que amueblan los bordes */}
      {[
        [-0.8, 6.2, 0.32], [11.8, -1.6, 0.4], [-11.5, 6.6, 0.3],
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
        tipo="mariposa"
        base={[-13.0, Y_PATIO + 1.6, 3.2]}
        size={26}
        rol="polinizador"
        fase={0.8}
        reducedMotion={reducedMotion}
        title="Mariposa en la cerca viva"
      />
      <Bicho
        tipo="colibri"
        base={[-6.2, Y_PATIO + 1.7, -5.6]}
        size={30}
        rol="polinizador"
        fase={2.3}
        reducedMotion={reducedMotion}
        title="Colibrí en el botón de oro"
      />
      <Bicho
        tipo="escarabajo"
        base={[-5.2, Y_PATIO + 0.14, 4.6]}
        size={22}
        rol="descomponedor"
        fase={1.1}
        reducedMotion={reducedMotion}
        title="Escarabajo estercolero en la boñiga"
      />
      <Bicho
        tipo="lombriz"
        base={[10.4, Y_PATIO + 0.1, 5.5]}
        size={24}
        rol="descomponedor"
        fase={0.4}
        reducedMotion={reducedMotion}
        title="Lombriz en el compost"
      />

      {/* el polen del kit sobre la cerca viva florida */}
      <ParticulasAmbientales
        tipo="polen"
        tier={tier}
        reducedMotion={reducedMotion}
        position={[-9, 1.6, -5.4]}
        semilla={23}
      />
      <ParticulasAmbientales
        tipo="polen"
        densidad={0.5}
        tier={tier}
        reducedMotion={reducedMotion}
        position={[-13, 1.7, 3]}
        semilla={41}
      />
    </>
  );
}

/* ══════════════════════ EL CHROME (DOM) ══════════════════════ */

const CSS_LECHERIA = `
.leche-root { margin: 0 auto; max-width: 72rem; padding: 0 0 2.5rem; background: #f7f0dc; color: #3c2f1c; font-family: system-ui, sans-serif; }
.leche-head { padding: 1.1rem 1rem 0.4rem; }
.leche-kicker { margin: 0; font: 600 0.72rem/1.2 system-ui, sans-serif; letter-spacing: 0.09em; text-transform: uppercase; color: #8a6a35; }
.leche-head h1 { margin: 0.2rem 0 0.4rem; font-size: clamp(1.35rem, 4vw, 1.9rem); line-height: 1.15; color: #4a3418; }
.leche-lema { margin: 0; max-width: 46rem; font-size: 0.92rem; line-height: 1.55; color: #5a4a30; }
.leche-escena { position: relative; margin: 0.9rem 0 0; height: min(78dvh, 40rem); min-height: 22rem; overflow: hidden; background: ${DIA.fondo}; border-radius: 0; }
.leche-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.leche-canvas--lista { opacity: 1; }
.leche-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: flex-end; }
.leche-pie { padding: 0 1rem 0.9rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem; }
.leche-carta { margin: 0; max-width: 34rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(74,52,24,0.66); backdrop-filter: blur(3px); color: #fbf3e2; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.leche-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(74,52,24,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(255,247,228,0.85); color: #5a3f1c; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.leche-boton:hover, .leche-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(74,52,24,0.6); outline: none; }
.leche-boton[aria-pressed='true'] { background: #ffe8b0; border-color: rgba(90,63,28,0.75); color: #4a3418; }
.leche-chip { pointer-events: none; display: inline-flex; align-items: center; gap: 0.3em; padding: 2px 8px; border-radius: 999px; background: rgba(58,42,24,0.82); color: #fdf6e3; font: 600 10px/1.5 system-ui, sans-serif; white-space: nowrap; box-shadow: 0 2px 6px rgba(40,28,10,0.3); }
.leche-chip b { display: inline-flex; align-items: center; justify-content: center; width: 1.35em; height: 1.35em; border-radius: 50%; background: #e8a24a; color: #3c2410; font-size: 9px; }
.mundo-fauna { pointer-events: none; filter: drop-shadow(0 2px 5px rgba(40, 30, 10, 0.24)); }
.leche-leyenda { padding: 1.4rem 1rem 0; }
.leche-leyenda h2 { margin: 0 0 0.3rem; font-size: 1.12rem; color: #4a3418; }
.leche-leyenda ol, .leche-leyenda ul { margin: 0.6rem 0 0; padding: 0; list-style: none; display: grid; gap: 0.7rem; }
.leche-leyenda li { display: flex; gap: 0.65rem; align-items: flex-start; background: #fdf8ea; border: 1px solid #e8dcc0; border-radius: 0.7rem; padding: 0.65rem 0.8rem; }
.leche-emoji { font-size: 1.25rem; line-height: 1.3; }
.leche-leyenda b { display: block; font-size: 0.88rem; color: #4a3418; }
.leche-leyenda p { margin: 0.15rem 0 0; font-size: 0.83rem; line-height: 1.5; color: #5a4a30; }
.leche-nota { margin: 0.8rem 0 0; font-size: 0.76rem; line-height: 1.5; color: #7a6845; font-style: italic; }
.leche-cierre { margin: 0.9rem 0 0; max-width: 46rem; font-size: 0.86rem; line-height: 1.55; color: #5a4a30; }
@media (min-width: 40rem) { .leche-leyenda ol, .leche-leyenda ul { grid-template-columns: 1fr 1fr; } }
@media (prefers-reduced-motion: reduce) { .leche-canvas { transition: none; } }
`;

/* El paso a paso de la leche: del pasto al queso, legible y sin misterio. */
const PASOS_LECHE = [
  {
    emoji: '🌱',
    titulo: '1 · El potrero rotado',
    texto: 'La vaca come pasto fresco en la franja del día mientras la de atrás descansa y se recupera. La cerca viva de botón de oro da sombra, comida y casa a los polinizadores. Pasto bien llevado = leche sin comprar concentrado de fábrica.',
  },
  {
    emoji: '🥛',
    titulo: '2 · El ordeño de la mañana',
    texto: 'A mano, temprano y sin afán: la vaca tranquila amarrada a su poste, el ternero cerquita y las manos y el balde bien lavados. Una vaca serena y bien tratada da más leche — el bienestar del animal no es lujo, es oficio.',
  },
  {
    emoji: '🫗',
    titulo: '3 · Colar la leche',
    texto: 'Recién ordeñada, la leche pasa por el lienzo limpio al embudo de la cantina. Ese colado sencillo aparta cualquier impureza del ordeño: higiene de casa campesina, sin máquinas ni aditivos.',
  },
  {
    emoji: '🍲',
    titulo: '4 · La cuajada en la paila',
    texto: 'La leche tibia recibe el cuajo en la paila y en un rato asienta: se corta en cuadros con el cuchillo o la totuma y la cuajada se aparta del suero. Es el mismo saber de siempre, hecho junto al fogón de leña.',
  },
  {
    emoji: '🧱',
    titulo: '5 · El molde y la prensa',
    texto: 'La cuajada va al molde de madera; encima, la tabla y la piedra hacen de prensa. Sin afán, el peso saca el resto del suero y el queso toma su forma. Cada quesera tiene su punto y su maña.',
  },
  {
    emoji: '🧀',
    titulo: '6 · El queso campesino',
    texto: 'Fresco, blanco y escurriendo todavía en la esterilla: para el desayuno de la casa, para la vecina y para el mercado del pueblo. De la vaca al queso sin pasar por ninguna fábrica.',
  },
];

/* El ciclo virtuoso: en la lechería campesina nada se pierde. */
const CICLO = [
  {
    emoji: '🐷',
    titulo: 'El suero, a los animales',
    texto: 'El suero que suelta la cuajada no se bota: va a la canoa de los cerdos y al comedero de las gallinas. Lo que la quesería aparta, el corral lo aprovecha.',
  },
  {
    emoji: '🐞',
    titulo: 'La boñiga, al suelo',
    texto: 'En el potrero, el escarabajo estercolero y la lombriz se encargan de la boñiga: la entierran, la voltean y la vuelven suelo vivo. Fíjese en ellos — son obreros que no cobran jornal.',
  },
  {
    emoji: '🍂',
    titulo: 'El estiércol, al compost',
    texto: 'Lo que se recoge del corral va a la pila: boñiga, tamo y tiempo. En unos meses eso es abono negro que vuelve a la pastura — el potrero se abona a sí mismo, sin bulto de químico.',
  },
  {
    emoji: '🔁',
    titulo: 'La vuelta completa',
    texto: 'Pasto → vaca → leche → queso, y suero y boñiga de regreso al corral y al potrero. Ese círculo cerrado es la diferencia entre una finca que compra todo y una que se sostiene sola.',
  },
];

const COPY_CALMA =
  'A la izquierda, el potrero rotado con el hato; al centro, el ordeño bajo la ramada; a la derecha, la quesería. Toque el botón para seguir el camino de la leche, paso a paso.';
const COPY_PASOS =
  'Siga los números: del pasto de la franja del día al ordeño de la mañana, la leche colada a la cantina, la cuajada en la paila, el molde con su prensa y el queso fresco — y el suero y la boñiga de vuelta al ciclo.';

/**
 * MundoLecheria3D — la lechería campesina andina, montable con su propio
 * `<Canvas>`. Sin lógica de negocio: es una vitrina
 * (#/mockups/mundo-lecheria-3d · prod #diorama_lecheria). El tier y
 * reduced-motion se detectan aquí (mockup standalone), igual que sus pares.
 */
export default function MundoLecheria3D() {
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
    <main className="leche-root">
      <style>{CSS_LECHERIA}</style>

      <header className="leche-head">
        <p className="leche-kicker">Los mundos de su finca · vitrina</p>
        <h1>La lechería campesina</h1>
        <p className="leche-lema">
          El camino de la leche contado como es en la finca andina: el potrero
          rotado donde pasta el hato con su ternero, el ordeño manso de la
          mañana bajo la ramada, y la quesería artesanal donde la leche cuaja,
          se prensa y se vuelve queso fresco — mientras el suero y la boñiga
          regresan al ciclo, porque aquí nada se pierde.
        </p>
      </header>

      <section
        className="leche-escena"
        data-tier={tier}
        aria-label="La lechería campesina en 3D: potrero, ordeño y quesería"
      >
        <Canvas
          className={`leche-canvas${listo ? ' leche-canvas--lista' : ''}`}
          dpr={perfil.dpr}
          gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
          camera={{ position: [0.8, 6.8, 15.2], fov: 45 }}
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
            target={[-0.6, 1.0, 1.6]}
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

        <div className="leche-chrome">
          <div className="leche-pie">
            <button
              type="button"
              className="leche-boton"
              aria-pressed={etiquetas}
              onClick={() => setEtiquetas((v) => !v)}
            >
              {etiquetas ? 'Quitar las etiquetas' : 'Ver el paso a paso'}
            </button>
            <p className="leche-carta" role="status">
              {etiquetas ? COPY_PASOS : COPY_CALMA}
            </p>
          </div>
        </div>
      </section>

      <section className="leche-leyenda" aria-label="El camino de la leche, paso a paso">
        <h2>De la vaca al queso</h2>
        <ol>
          {PASOS_LECHE.map((p) => (
            <li key={p.titulo}>
              <span className="leche-emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="leche-leyenda" aria-label="El ciclo virtuoso: nada se pierde">
        <h2>Nada se pierde</h2>
        <ul>
          {CICLO.map((c) => (
            <li key={c.titulo}>
              <span className="leche-emoji" aria-hidden="true">{c.emoji}</span>
              <div>
                <b>{c.titulo}</b>
                <p>{c.texto}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="leche-nota">
          Recuerde: la leche cruda se hierve antes de tomarla, y todo lo que
          toca la leche — manos, balde, lienzo, cantina — va bien lavado. La
          higiene también es saber campesino.
        </p>
        <p className="leche-cierre">
          El queso campesino no sale de una fábrica: sale de un potrero bien
          rotado, de una vaca tranquila y con nombre, de un ordeño con las
          manos limpias y de una quesera que conoce su punto. La finca pone el
          pasto, la vaca pone la leche, y el suero y la boñiga devuelven el
          favor: la lechería campesina es un círculo, no una línea.
        </p>
      </section>
    </main>
  );
}
