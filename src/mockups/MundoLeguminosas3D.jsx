/*
 * MundoLeguminosas3D — el MUNDO DE LEGUMINOSAS Y RAÍCES ANDINAS en 3D.
 *
 * Un LOTE denso en hora dorada ("Age of Empires del campo"): al centro la MILPA
 * de las tres hermanas (maíz de vara + fríjol trepando en él + calabaza al pie),
 * a la izquierda una PARCELA de fríjol tutorado (cañamazo de varas), a la derecha
 * un MANCHÓN de quinua y dos yucas frondosas, con cobertura de pasto y piedritas
 * que matan el vacío. La mata-hero de fríjol conserva su lección al frente:
 *
 * Las matas que le dan de comer a la familia Y a la tierra, en hora dorada:
 *   - FRÍJOL (leguminosa trepadora): sube por su estaca con hojas y VAINAS, y a
 *     un lado, en un CORTE del subsuelo, se ven los NÓDULOS ROSADOS de Rhizobium
 *     en la raíz — las fábricas de nitrógeno, el abono gratis del aire. Es el
 *     saber agroecológico clave: por eso el fríjol se asocia con el maíz.
 *   - YUCA (arbusto de raíz tuberosa): tallo leñoso nudoso, hoja palmada de
 *     dedos y las raíces tuberosas asomando en la base. Aguanta el suelo pobre.
 *   - QUINUA (pseudocereal andino): tallos altos rematados en PANOJAS densas —
 *     rojas, doradas y moradas. El color es su firma. Proteína de la altura.
 *
 * DIRECCIÓN DE ARTE (todo dentro del framework, nada inventado por fuera):
 *   - La atmósfera es la MISMA hora dorada del valle: preset `CIELOS_HORA.dorada`
 *     (espejo de `ATMOSFERA` / atmosferaMadre). Entrar a la chagra se siente como
 *     acercarse dentro del mismo atardecer, no como abrir otra app.
 *   - Los materiales salen tinteados hacia la niebla dorada con `mezclar` (la ley
 *     de coherencia), conservando la identidad de cada mata (el rosado del nódulo,
 *     el rojo/dorado/morado de la panoja).
 *   - La fauna es la del kit (`FaunaEscena`/creatures): pocos billboards SVG bien
 *     puestos por rol ecológico (colibrí y mariposa polinizando, escarabajo a
 *     ras). El polen en suspensión son las `ParticulasAmbientales` (tipo=polen).
 *
 * RENDIMIENTO: cobertura vegetal y granos de panoja instanciados (pocos draw
 * calls), materiales Lambert sin shadow-map, geometrías compartidas por mata.
 * Presupuestos por `perfilDeTier`; `reducedMotion` congela el vaivén, apaga la
 * fauna animada y pasa el frameloop a demanda. Gama baja cae al 2D digno antes de
 * montar esto. Autocontenida: cero CDN/imágenes externas.
 *
 * Ruta mockup: #/mockups/mundo-leguminosas-3d (cableada en App.jsx, sin auth).
 * Copy en español de Colombia, en "usted".
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';
import { crearRng } from '../visual/mundo3d/particulasData.js';
import { Fauna } from '../visual/mundo3d/escenas/FaunaEscena.jsx';

/* La hora dorada canónica (espejo de ATMOSFERA): única fuente de la atmósfera. */
const DORADA = CIELOS_HORA.dorada;
const TINTE = DORADA.niebla; // tinta cálida común: "el mismo atardecer"

/* La paleta de la chagra, tinteada hacia la hora dorada. Cada mata conserva su
   identidad; los nódulos rosados y las panojas de color se dejan casi puros
   (poco tinte) porque su color ES el saber que hay que ver. */
const P = {
  suelo: mezclar('#7a5a3a', TINTE, 0.28), // loam de la finca
  sueloSeco: mezclar('#8f7248', TINTE, 0.3),
  sueloCorte: mezclar('#402d1b', TINTE, 0.12), // el perfil oscuro del corte
  topsoil: mezclar('#5e4530', TINTE, 0.2), // la capa fértil arriba del corte
  pasto: mezclar('#6f9448', TINTE, 0.3), // cobertura verde
  pastoSeco: mezclar('#a7a862', TINTE, 0.3),

  // fríjol
  estaca: mezclar('#8a6a44', TINTE, 0.3), // la vara/tutor
  frijolTallo: mezclar('#5c8f43', TINTE, 0.28), // la enredadera
  frijolHoja: mezclar('#4e8b3c', TINTE, 0.3), // hoja trifoliada
  frijolHojaClara: mezclar('#71a851', TINTE, 0.28),
  frijolVaina: mezclar('#7cae54', TINTE, 0.26), // la vaina verde
  frijolFlor: mezclar('#ece4f0', TINTE, 0.12), // florecita lila pálida
  raiz: mezclar('#e7dab9', TINTE, 0.18), // la raíz clara
  nodulo: mezclar('#e386a6', TINTE, 0.06), // NÓDULO de Rhizobium (rosado)
  noduloClaro: mezclar('#f4abc6', TINTE, 0.06),

  // yuca
  yucaTallo: mezclar('#7c5330', TINTE, 0.26), // tallo leñoso
  yucaNudo: mezclar('#5c3c22', TINTE, 0.2), // cicatriz de hoja (nudo)
  yucaHoja: mezclar('#3f7f39', TINTE, 0.3), // hoja palmada
  yucaHojaClara: mezclar('#5a9a4a', TINTE, 0.28),
  yucaTuber: mezclar('#d8b788', TINTE, 0.2), // pulpa del tubérculo
  yucaTuberPiel: mezclar('#a67a4c', TINTE, 0.2), // piel del tubérculo

  // quinua
  quinuaTallo: mezclar('#7ea24a', TINTE, 0.28),
  quinuaHoja: mezclar('#5f9146', TINTE, 0.28),
  quinuaRojo: mezclar('#c1343a', TINTE, 0.08), // panoja roja
  quinuaDorado: mezclar('#e0a52a', TINTE, 0.1), // panoja dorada
  quinuaMorado: mezclar('#933f8a', TINTE, 0.08), // panoja morada

  // maíz (la vara de la milpa: por él trepa el fríjol)
  maizTallo: mezclar('#8fa84e', TINTE, 0.28), // la caña verde-cálida
  maizNudo: mezclar('#6f8a3c', TINTE, 0.24),
  maizHoja: mezclar('#77a23f', TINTE, 0.3), // hoja-cinta larga
  maizHojaSeca: mezclar('#bda45a', TINTE, 0.3),
  maizEspiga: mezclar('#e7d488', TINTE, 0.12), // espiga (flor macho) dorada
  mazorca: mezclar('#f2cf5a', TINTE, 0.1), // el grano de la mazorca
  mazorcaHoja: mezclar('#9cb85a', TINTE, 0.28), // el capacho verde

  // calabaza (zapallo: la tercera hermana, cobija el suelo)
  calabazaHoja: mezclar('#4f8a3e', TINTE, 0.3),
  calabazaHojaClara: mezclar('#6aa64c', TINTE, 0.28),
  calabazaFruto: mezclar('#d98a34', TINTE, 0.16), // el zapallo naranja
  calabazaGuia: mezclar('#5c8f43', TINTE, 0.28),

  // suelo vivo
  cuerda: mezclar('#cbb488', TINTE, 0.2), // el cañamazo/tutor del fríjol
  piedra: mezclar('#8f8674', TINTE, 0.32), // piedritas del lote
  piedraClara: mezclar('#a89f88', TINTE, 0.32),
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
/* Ruido determinista (hash de senos): misma chagra siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/* La geografía: una parcela de finca (chagra) casi plana, con leves lomas de
   siembra bajo cada mata y una suave ondulación general. */
const ANCHO = 26;
const FONDO = 26;
function alturaCampo(wx, wz) {
  let h = 0.05 + ruido(wx * 0.4, wz * 0.4) * 0.16; // ondulación suave del terreno
  h += gauss(wx, wz, 3.6, -0.6, 1.8, 1.8) * 0.28; // loma de la yuca
  h += gauss(wx, wz, 0.4, -2.8, 2.2, 1.8) * 0.22; // cama de la quinua
  return Math.max(0, h);
}

/* Malla de la parcela con colores por vértice: pasto verde con motas secas y
   surcos de tierra labrada (la chagra sembrada, no un potrero). */
function construirCampo(seg, plano) {
  const nx = seg + 1, nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cPasto = new THREE.Color(P.pasto);
  const cPastoSeco = new THREE.Color(P.pastoSeco);
  const cSuelo = new THREE.Color(P.suelo);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaCampo(wx, wz);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      c.lerpColors(cPasto, cPastoSeco, smoothstep(-0.5, 0.9, ruido(wx * 1.2, wz * 1.2)));
      // surcos de tierra: bandas labradas donde se sembró
      const surco = Math.abs(Math.sin(wx * 0.85 + wz * 0.12));
      c.lerp(cSuelo, smoothstep(0.72, 0.98, surco) * 0.55);
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

/* Las luces de la hora dorada del kit: hemisferio cálido, ambiente suave, el sol
   bajo como direccional principal y un relleno frío opuesto (cielo abierto). */
function LucesDoradas() {
  return (
    <>
      <hemisphereLight intensity={DORADA.hemisferio} color={DORADA.cielo} groundColor={DORADA.suelo} />
      <ambientLight intensity={DORADA.ambiente} color={DORADA.luz} />
      <directionalLight position={DORADA.solPos} intensity={DORADA.sol} color={DORADA.luz} />
      <directionalLight position={[-6, 4, -7]} intensity={DORADA.rellenoInt} color={DORADA.relleno} />
    </>
  );
}

/* El sol bajo del atardecer: un disco tibio con halo. No ilumina (de eso se
   encargan las luces); es el ancla visual de la hora. */
function SolBajo() {
  return (
    <group position={[9, 7, -14]}>
      <mesh>
        <circleGeometry args={[1.5, 40]} />
        <meshBasicMaterial color="#fff0cf" transparent opacity={0.95} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[2.9, 40]} />
        <meshBasicMaterial color={DORADA.luz} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[5.0, 40]} />
        <meshBasicMaterial color={DORADA.cielo} transparent opacity={0.13} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ── Cobertura vegetal: matas bajas de pasto instanciadas (1 draw call), la
      chagra no es tierra pelada. Poco dobladas, tinte verde variado. ── */
function Cobertura({ n }) {
  const ref = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(41);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 8) {
      intentos += 1;
      const wx = (rng() - 0.5) * (ANCHO - 6);
      const wz = (rng() - 0.5) * (FONDO - 6);
      const y = alturaCampo(wx, wz);
      lista.push({ wx, wz, y, esc: 0.4 + rng() * 0.6, giro: rng() * Math.PI, ladeo: (rng() - 0.5) * 0.35 });
    }
    return lista;
  }, [n]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const base = new THREE.Color(P.pasto);
    const seco = new THREE.Color(P.pastoSeco);
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y + 0.11 * s.esc, s.wz);
      dummy.rotation.set(s.ladeo, s.giro, s.ladeo * 0.5);
      dummy.scale.set(s.esc, s.esc, s.esc);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tinte.copy(base).lerp(seco, (i % 6) / 6);
      m.setColorAt(i, tinte);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [sitios]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
      <coneGeometry args={[0.13, 0.42, 4]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* Una hoja trifoliada de fríjol: tres foliolos (elipsoides aplanados) que radian
   desde un peciolo corto. La firma de la leguminosa. */
function HojaTrifoliada({ pos, giro = 0, esc = 1, claro = false }) {
  const color = claro ? P.frijolHojaClara : P.frijolHoja;
  return (
    <group position={pos} rotation={[0, giro, 0]} scale={esc}>
      {[0, 2.2, -2.2].map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * 0.12, 0.02 * i, Math.cos(a) * 0.12 + 0.05]} rotation={[-0.5, a, 0]} scale={[0.13, 0.02, 0.18]}>
          <sphereGeometry args={[1, 7, 5]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Una vaina de fríjol: dos segmentos aplanados que le dan una curva de banana. */
function Vaina({ pos, giro = 0, incl = 0 }) {
  return (
    <group position={pos} rotation={[incl, giro, 0.2]}>
      <mesh position={[0, -0.11, 0]} scale={[0.045, 0.16, 0.045]}>
        <sphereGeometry args={[1, 7, 6]} />
        <meshLambertMaterial color={P.frijolVaina} flatShading />
      </mesh>
      <mesh position={[0.03, -0.28, 0]} rotation={[0, 0, 0.35]} scale={[0.04, 0.12, 0.04]}>
        <sphereGeometry args={[1, 7, 6]} />
        <meshLambertMaterial color={P.frijolVaina} flatShading />
      </mesh>
    </group>
  );
}

/* ── EL FRÍJOL: la mata trepadora + el CORTE del subsuelo con los nódulos.
      Anclada en la CIMA de un monolito de suelo (y=0 = la superficie): arriba la
      enredadera con vainas; abajo, en la cara frontal del corte, la raíz con los
      nódulos rosados de Rhizobium — el nitrógeno que no se ve, hecho visible. ── */
function MataFrijol({ pos, reducedMotion, saber }) {
  const flor = useRef(null);
  const halo = useRef(null);
  const nodulos = useRef(null);

  // la enredadera como un tubo helicoidal que sube por la estaca (1 mesh).
  const curvaVid = useMemo(() => {
    const pts = [];
    const vueltas = 3.2, alto = 2.0, r0 = 0.18;
    const N = 44;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const a = t * vueltas * Math.PI * 2;
      const r = r0 * (1 - 0.18 * t);
      pts.push(new THREE.Vector3(Math.cos(a) * r, t * alto, Math.sin(a) * r));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, []);

  // hojas y vainas repartidas a lo largo de la enredadera.
  const hojas = useMemo(
    () => [0.16, 0.34, 0.52, 0.68, 0.84].map((t, i) => {
      const p = curvaVid.getPoint(t);
      return { pos: [p.x * 1.5, p.y, p.z * 1.5], giro: i * 1.7, esc: 1 - t * 0.25, claro: i % 2 === 0 };
    }),
    [curvaVid],
  );
  const vainas = useMemo(
    () => [0.44, 0.58, 0.66, 0.78].map((t, i) => {
      const p = curvaVid.getPoint(t);
      return { pos: [p.x * 1.7, p.y + 0.02, p.z * 1.7 + 0.04], giro: i * 2.1, incl: 0.1 + i * 0.05 };
    }),
    [curvaVid],
  );

  // los nódulos: puntos sobre la raíz principal y las laterales (cara frontal).
  const puntosNodulo = useMemo(() => {
    const rng = crearRng(19);
    const lista = [];
    for (let i = 0; i < 11; i++) {
      const t = 0.12 + rng() * 0.8; // profundidad
      const lado = (rng() - 0.5); // izquierda/derecha
      lista.push({
        x: lado * (0.1 + t * 0.5),
        y: -0.12 - t * 1.05,
        z: 0.2 + rng() * 0.05,
        r: 0.05 + rng() * 0.035,
        claro: i % 3 === 0,
      });
    }
    return lista;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!reducedMotion && flor.current) flor.current.rotation.z = Math.sin(t * 0.8) * 0.06;
    if (halo.current) {
      const objetivo = saber ? 0.5 : 0.0;
      const pulso = reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(t * 1.6);
      halo.current.material.opacity = objetivo * pulso;
      halo.current.visible = saber;
    }
    if (nodulos.current) {
      const s = saber ? 1.28 : 1;
      nodulos.current.scale.setScalar(reducedMotion ? s : s * (0.98 + 0.02 * Math.sin(t * 1.6)));
    }
  });

  const groundY = alturaCampo(pos[0], pos[2]);
  const ALTO_CORTE = 1.3; // el monolito sube esto sobre el terreno; y=0 = superficie

  return (
    <group position={[pos[0], groundY + ALTO_CORTE, pos[2]]}>
      {/* ── EL CORTE DEL SUBSUELO (monolito): perfil oscuro + capa fértil arriba ── */}
      <mesh position={[0, -ALTO_CORTE / 2, 0]}>
        <boxGeometry args={[1.5, ALTO_CORTE, 0.42]} />
        <meshLambertMaterial color={P.sueloCorte} flatShading />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[1.52, 0.14, 0.44]} />
        <meshLambertMaterial color={P.topsoil} flatShading />
      </mesh>
      {/* pastico en la cima del corte, para que lea "superficie" */}
      {[-0.5, -0.15, 0.2, 0.55].map((x, i) => (
        <mesh key={i} position={[x, 0.06, 0.12]} rotation={[0.1, i, 0.1]}>
          <coneGeometry args={[0.08, 0.22, 4]} />
          <meshLambertMaterial color={P.pasto} flatShading />
        </mesh>
      ))}

      {/* ── LA RAÍZ en la cara frontal del corte ── */}
      <mesh position={[0.02, -0.62, 0.19]} rotation={[0, 0, 0.06]}>
        <coneGeometry args={[0.07, 1.15, 6]} />
        <meshLambertMaterial color={P.raiz} flatShading />
      </mesh>
      {[
        [0.16, -0.42, 0.9], [-0.2, -0.55, -1.1], [0.26, -0.78, 0.7],
        [-0.24, -0.9, -0.8], [0.1, -1.05, 0.5],
      ].map((r, i) => (
        <mesh key={i} position={[r[0], r[1], 0.18]} rotation={[0, 0, r[2]]}>
          <cylinderGeometry args={[0.012, 0.03, 0.5, 5]} />
          <meshLambertMaterial color={P.raiz} flatShading />
        </mesh>
      ))}
      {/* ── LOS NÓDULOS ROSADOS (Rhizobium): el nitrógeno que se ve ── */}
      <group ref={nodulos}>
        {puntosNodulo.map((nd, i) => (
          <mesh key={i} position={[nd.x, nd.y, nd.z]}>
            <sphereGeometry args={[nd.r, 8, 7]} />
            <meshLambertMaterial color={nd.claro ? P.noduloClaro : P.nodulo} flatShading emissive={nd.claro ? P.noduloClaro : P.nodulo} emissiveIntensity={saber ? 0.35 : 0.12} />
          </mesh>
        ))}
      </group>
      {/* halo del saber: un resplandor rosado que enciende el botón didáctico */}
      <mesh ref={halo} position={[0, -0.7, 0.24]} visible={false}>
        <circleGeometry args={[0.62, 32]} />
        <meshBasicMaterial color="#ffc3da" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* ── LA MATA TREPADORA (sobre la superficie) ── */}
      {/* la estaca / tutor */}
      <mesh position={[0, 1.1, 0]} rotation={[0, 0, 0.02]}>
        <cylinderGeometry args={[0.035, 0.05, 2.25, 6]} />
        <meshLambertMaterial color={P.estaca} flatShading />
      </mesh>
      {/* la enredadera helicoidal */}
      <mesh scale={[1.5, 1, 1.5]}>
        <tubeGeometry args={[curvaVid, 46, 0.032, 6, false]} />
        <meshLambertMaterial color={P.frijolTallo} flatShading />
      </mesh>
      {hojas.map((h, i) => (
        <HojaTrifoliada key={i} pos={h.pos} giro={h.giro} esc={h.esc} claro={h.claro} />
      ))}
      {vainas.map((v, i) => (
        <Vaina key={i} pos={v.pos} giro={v.giro} incl={v.incl} />
      ))}
      {/* unas florecitas lila cerca de la copa */}
      <group ref={flor} position={[0.16, 1.7, 0.1]}>
        {[[0, 0, 0], [0.12, 0.08, -0.05], [-0.08, 0.12, 0.06]].map((f, i) => (
          <mesh key={i} position={f}>
            <sphereGeometry args={[0.045, 6, 5]} />
            <meshLambertMaterial color={P.frijolFlor} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* Una hoja palmada de yuca: peciolo + 5 foliolos (dedos) en abanico. */
function HojaPalmada({ pos, giro = 0, incl = 0, esc = 1 }) {
  return (
    <group position={pos} rotation={[incl, giro, 0]} scale={esc}>
      <mesh position={[0, 0, 0.14]} rotation={[1.1, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.02, 0.32, 5]} />
        <meshLambertMaterial color={P.yucaTallo} flatShading />
      </mesh>
      <group position={[0, 0.02, 0.3]}>
        {[-0.9, -0.45, 0, 0.45, 0.9].map((a, i) => (
          <mesh key={i} position={[Math.sin(a) * 0.16, 0, Math.cos(a) * 0.08 + 0.1]} rotation={[-0.4, a, 0]} scale={[0.05, 0.02, 0.26]}>
            <sphereGeometry args={[1, 6, 5]} />
            <meshLambertMaterial color={i % 2 ? P.yucaHojaClara : P.yucaHoja} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ── LA YUCA: arbusto de tallo leñoso nudoso, copa de hojas palmadas y las
      raíces tuberosas asomando en la base. Aguanta el suelo pobre. ── */
function MataYuca({ pos, esc = 1, giro = 0 }) {
  const groundY = alturaCampo(pos[0], pos[2]);
  // el tallo leñoso: tres tramos que zig-zaguean en los nudos (como la yuca).
  const tramos = [
    { y: 0.35, x: 0, incl: 0.05, h: 0.7 },
    { y: 0.98, x: 0.08, incl: -0.12, h: 0.62 },
    { y: 1.52, x: 0.02, incl: 0.08, h: 0.5 },
  ];
  // copa frondosa: hojas palmadas en abanico a dos alturas (no ralas)
  const hojas = [
    { pos: [0.1, 1.82, 0.05], giro: 0.2, incl: -0.2, esc: 1.15 },
    { pos: [0.0, 1.76, 0.0], giro: 1.15, incl: -0.1, esc: 1.08 },
    { pos: [-0.05, 1.84, -0.02], giro: 2.1, incl: -0.25, esc: 1.02 },
    { pos: [0.15, 1.72, -0.08], giro: 3.05, incl: -0.05, esc: 0.98 },
    { pos: [-0.12, 1.8, 0.08], giro: 4.0, incl: -0.22, esc: 1.05 },
    { pos: [0.08, 1.74, -0.1], giro: 5.0, incl: -0.12, esc: 0.95 },
    { pos: [-0.02, 1.9, 0.0], giro: 5.9, incl: -0.32, esc: 0.9 },
    { pos: [0.18, 1.6, 0.05], giro: 0.9, incl: 0.05, esc: 0.85 },
    { pos: [-0.18, 1.58, -0.05], giro: 3.7, incl: 0.08, esc: 0.82 },
  ];
  // tubérculos radiando de la base, medio enterrados (asomando).
  const tuberculos = [
    { ang: 0.4, largo: 0.62, baja: 0.28 },
    { ang: 1.9, largo: 0.55, baja: 0.24 },
    { ang: 3.3, largo: 0.66, baja: 0.3 },
    { ang: 4.7, largo: 0.5, baja: 0.22 },
    { ang: 5.6, largo: 0.58, baja: 0.26 },
  ];
  return (
    <group position={[pos[0], groundY, pos[2]]} rotation={[0, giro, 0]} scale={esc}>
      {/* raíces tuberosas asomando en la base */}
      {tuberculos.map((tb, i) => (
        <group key={i} rotation={[0, tb.ang, 0]}>
          <group position={[0.28, 0.02, 0]} rotation={[0, 0, -1.05]}>
            {/* piel */}
            <mesh position={[0, -tb.baja * 0.4, 0]} scale={[0.11, tb.largo, 0.11]}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshLambertMaterial color={P.yucaTuberPiel} flatShading />
            </mesh>
            {/* la punta clara (pulpa asomando por el corte natural) */}
            <mesh position={[0, -tb.baja * 0.4 - tb.largo * 0.75, 0]} scale={[0.08, 0.1, 0.08]}>
              <sphereGeometry args={[1, 7, 6]} />
              <meshLambertMaterial color={P.yucaTuber} flatShading />
            </mesh>
          </group>
        </group>
      ))}
      {/* el tallo leñoso con nudos */}
      {tramos.map((tr, i) => (
        <group key={i}>
          <mesh position={[tr.x, tr.y, 0]} rotation={[0, 0, tr.incl]}>
            <cylinderGeometry args={[0.07 - i * 0.012, 0.085 - i * 0.012, tr.h, 7]} />
            <meshLambertMaterial color={P.yucaTallo} flatShading />
          </mesh>
          {/* nudo (cicatriz de hoja) */}
          <mesh position={[tr.x, tr.y + tr.h * 0.5, 0]}>
            <sphereGeometry args={[0.08 - i * 0.012, 7, 5]} />
            <meshLambertMaterial color={P.yucaNudo} flatShading />
          </mesh>
        </group>
      ))}
      {hojas.map((h, i) => (
        <HojaPalmada key={i} pos={h.pos} giro={h.giro} incl={h.incl} esc={h.esc} />
      ))}
    </group>
  );
}

/* La PANOJA: la firma de la quinua. Granos diminutos instanciados (1 draw call),
   apretados en un volumen cónico-alargado, coloreados alrededor del tono base
   (rojo / dorado / morado) con leve variación. */
function Panoja({ baseHex, alto, radio, n }) {
  const ref = useRef(null);
  const granos = useMemo(() => {
    const rng = crearRng(Math.round(alto * 1000) + n);
    return Array.from({ length: n }, () => {
      const t = rng(); // 0 abajo, 1 arriba de la panoja
      const rad = radio * (1 - t * 0.75) * (0.35 + rng() * 0.65);
      const ang = rng() * Math.PI * 2;
      return {
        x: Math.cos(ang) * rad,
        y: t * alto,
        z: Math.sin(ang) * rad,
        s: 0.03 + rng() * 0.03,
        tono: (rng() - 0.5),
      };
    });
  }, [alto, radio, n]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    granos.forEach((g, i) => {
      dummy.position.set(g.x, g.y, g.z);
      dummy.scale.setScalar(g.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tinte.set(baseHex).offsetHSL(g.tono * 0.03, g.tono * 0.1, g.tono * 0.12);
      m.setColorAt(i, tinte);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [granos, baseHex]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, granos.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 5]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* ── LA QUINUA: tallo alto con hojas de pata de ganso y la PANOJA densa de color
      arriba. Proteína de la altura. Distintas alturas/edades por instancia. ── */
function MataQuinua({ pos, esc = 1, colorHex, reducedMotion, semilla, granos }) {
  const cabeza = useRef(null);
  const altoTallo = 1.15 * esc;
  const hojas = useMemo(() => {
    const rng = crearRng(semilla);
    return Array.from({ length: 6 }, (_, i) => ({
      y: 0.3 + (i / 6) * altoTallo * 0.8,
      giro: i * 1.9 + rng(),
      esc: (0.9 - i * 0.08) * esc,
    }));
  }, [altoTallo, esc, semilla]);
  useFrame(({ clock }) => {
    if (reducedMotion || !cabeza.current) return;
    cabeza.current.rotation.z = Math.sin(clock.elapsedTime * 0.9 + semilla) * 0.05;
  });
  const groundY = alturaCampo(pos[0], pos[2]);
  return (
    <group position={[pos[0], groundY, pos[2]]}>
      {/* el tallo */}
      <mesh position={[0, altoTallo / 2, 0]}>
        <cylinderGeometry args={[0.03 * esc, 0.055 * esc, altoTallo, 6]} />
        <meshLambertMaterial color={P.quinuaTallo} flatShading />
      </mesh>
      {/* hojas de pata de ganso a lo largo del tallo */}
      {hojas.map((h, i) => (
        <mesh key={i} position={[Math.sin(h.giro) * 0.1, h.y, Math.cos(h.giro) * 0.1]} rotation={[-0.5, h.giro, 0.3]} scale={[0.12 * h.esc, 0.02, 0.14 * h.esc]}>
          <sphereGeometry args={[1, 6, 5]} />
          <meshLambertMaterial color={P.quinuaHoja} flatShading />
        </mesh>
      ))}
      {/* la PANOJA de color, meciéndose apenas */}
      <group ref={cabeza} position={[0, altoTallo, 0]}>
        <Panoja baseHex={colorHex} alto={0.7 * esc} radio={0.2 * esc} n={granos} />
      </group>
    </group>
  );
}

/* ── EL MAÍZ: la vara de la milpa. Caña alta con nudos, hojas-cinta que arquean,
      dos mazorcas con capacho y la espiga (flor macho) dorada al tope. Cuando
      lleva fríjol, la enredadera sube por la caña: eso es la asociación. ── */
function HojaMaiz({ y, giro, largo, incl, seca = false }) {
  // la hoja-cinta larga que sale del tallo, sube un poco y CAE arqueada (dos
  // tramos: base recta + punta colgante), ancha para que lea "maíz".
  return (
    <group position={[0, y, 0]} rotation={[0, giro, 0]}>
      <mesh position={[largo * 0.32, incl * 0.12, 0]} rotation={[0, 0, -incl * 0.4]} scale={[largo * 0.62, 0.02, 0.17]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshLambertMaterial color={seca ? P.maizHojaSeca : P.maizHoja} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[largo * 0.82, -incl * 0.55, 0]} rotation={[0, 0, -incl - 0.55]} scale={[largo * 0.5, 0.018, 0.13]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshLambertMaterial color={seca ? P.maizHojaSeca : P.maizHoja} flatShading side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* La enredadera de fríjol que trepa por la caña de maíz (sin corte ni nódulos:
   ese saber vive en la mata-hero; aquí se ve la ASOCIACIÓN viva). */
function FrijolTrepa({ alto, esc = 1 }) {
  const curva = useMemo(() => {
    const pts = [];
    const vueltas = 4.2, r0 = 0.13 * esc, N = 46;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const a = t * vueltas * Math.PI * 2;
      const r = r0 * (1 + 0.14 * Math.sin(t * 6));
      pts.push(new THREE.Vector3(Math.cos(a) * r, t * alto * 0.94, Math.sin(a) * r));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, [alto, esc]);
  const hojas = useMemo(
    () => [0.22, 0.4, 0.55, 0.7, 0.85].map((t, i) => {
      const p = curva.getPoint(t);
      return { pos: [p.x * 1.4, p.y, p.z * 1.4], giro: i * 1.8, esc: 0.82, claro: i % 2 === 0 };
    }),
    [curva],
  );
  const vainas = useMemo(
    () => [0.5, 0.66, 0.8].map((t, i) => {
      const p = curva.getPoint(t);
      return { pos: [p.x * 1.55, p.y, p.z * 1.55], giro: i * 2.0, incl: 0.15 };
    }),
    [curva],
  );
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curva, 48, 0.024, 5, false]} />
        <meshLambertMaterial color={P.frijolTallo} flatShading />
      </mesh>
      {hojas.map((h, i) => (
        <HojaTrifoliada key={i} pos={h.pos} giro={h.giro} esc={h.esc} claro={h.claro} />
      ))}
      {vainas.map((v, i) => (
        <Vaina key={i} pos={v.pos} giro={v.giro} incl={v.incl} />
      ))}
    </group>
  );
}

function Maiz({ pos, esc = 1, conFrijol = false, reducedMotion, semilla = 1 }) {
  const espiga = useRef(null);
  const groundY = alturaCampo(pos[0], pos[2]);
  const alto = 2.5 * esc;
  const hojas = useMemo(() => {
    const rng = crearRng(semilla);
    const n = 9;
    return Array.from({ length: n }, (_, i) => {
      const t = 0.14 + (i / n) * 0.78;
      return {
        y: t * alto,
        giro: i * 2.399 + rng() * 0.5,
        largo: (0.98 - t * 0.34) * esc,
        incl: 0.5 - t * 0.14,
        seca: i === 0,
      };
    });
  }, [alto, esc, semilla]);
  const espigas = useMemo(
    () => Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + (i % 2) * 0.35;
      const spread = 0.35 + (i % 3) * 0.12;
      return { x: Math.cos(a) * 0.045 * esc, z: Math.sin(a) * 0.045 * esc, rx: Math.cos(a) * spread, rz: Math.sin(a) * spread, largo: 0.5 + (i % 3) * 0.12 };
    }),
    [esc],
  );
  useFrame(({ clock }) => {
    if (reducedMotion || !espiga.current) return;
    espiga.current.rotation.z = Math.sin(clock.elapsedTime * 0.7 + semilla) * 0.05;
  });
  return (
    <group position={[pos[0], groundY, pos[2]]}>
      {/* la caña */}
      <mesh position={[0, alto / 2, 0]}>
        <cylinderGeometry args={[0.035 * esc, 0.08 * esc, alto, 7]} />
        <meshLambertMaterial color={P.maizTallo} flatShading />
      </mesh>
      {[0.25, 0.5, 0.72].map((t, i) => (
        <mesh key={i} position={[0, t * alto, 0]}>
          <sphereGeometry args={[0.06 * esc, 7, 5]} />
          <meshLambertMaterial color={P.maizNudo} flatShading />
        </mesh>
      ))}
      {hojas.map((h, i) => (
        <HojaMaiz key={i} y={h.y} giro={h.giro} largo={h.largo} incl={h.incl} seca={h.seca} />
      ))}
      {/* las mazorcas con capacho */}
      {[[0.44, 1.0], [0.58, -1.9]].map((mz, i) => (
        <group key={i} position={[Math.cos(mz[1]) * 0.1 * esc, mz[0] * alto, Math.sin(mz[1]) * 0.1 * esc]} rotation={[0.5, mz[1], 0.35]}>
          <mesh scale={[0.06 * esc, 0.2 * esc, 0.06 * esc]}>
            <sphereGeometry args={[1, 8, 7]} />
            <meshLambertMaterial color={P.mazorca} flatShading />
          </mesh>
          <mesh position={[0, 0.03 * esc, 0]} scale={[0.085 * esc, 0.24 * esc, 0.085 * esc]}>
            <coneGeometry args={[1, 1.6, 6, 1, true]} />
            <meshLambertMaterial color={P.mazorcaHoja} flatShading side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* la espiga (flor macho) dorada al tope: plumero de varias raspas */}
      <group ref={espiga} position={[0, alto, 0]}>
        {espigas.map((e, i) => (
          <mesh key={i} position={[e.x, e.largo * 0.42 * esc, e.z]} rotation={[e.rx, 0, e.rz]}>
            <cylinderGeometry args={[0.005, 0.014, e.largo * esc, 4]} />
            <meshLambertMaterial color={P.maizEspiga} flatShading />
          </mesh>
        ))}
      </group>
      {conFrijol && <FrijolTrepa alto={alto} esc={esc} />}
    </group>
  );
}

/* ── LA CALABAZA (zapallo): la tercera hermana. Guías rastreras con hojas
      acorazonadas grandes que cobijan el suelo, y un fruto naranja. ── */
function Calabaza({ pos, esc = 1, semilla = 3 }) {
  const groundY = alturaCampo(pos[0], pos[2]);
  const hojas = useMemo(() => {
    const rng = crearRng(semilla);
    return Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + rng() * 0.6;
      const r = (0.3 + rng() * 0.4) * esc;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, giro: a, esc: (0.85 + rng() * 0.5) * esc, claro: i % 2 === 0, r };
    });
  }, [esc, semilla]);
  return (
    <group position={[pos[0], groundY, pos[2]]}>
      {hojas.map((h, i) => (
        <group key={i} position={[h.x, 0.05, h.z]} rotation={[0, h.giro, 0]}>
          {/* la guía rastrera hacia el centro */}
          <mesh position={[-h.x * 0.45, 0, -h.z * 0.45]} rotation={[0, Math.atan2(h.z, h.x), 1.4]} scale={[0.012, h.r * 0.55, 0.012]}>
            <cylinderGeometry args={[1, 1, 1, 5]} />
            <meshLambertMaterial color={P.calabazaGuia} flatShading />
          </mesh>
          {/* la hoja acorazonada, casi horizontal */}
          <mesh rotation={[-1.35, 0, 0]} scale={[0.28 * h.esc, 0.02, 0.26 * h.esc]}>
            <sphereGeometry args={[1, 7, 5]} />
            <meshLambertMaterial color={h.claro ? P.calabazaHojaClara : P.calabazaHoja} flatShading side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* el zapallo */}
      <group position={[0.16 * esc, 0.17 * esc, 0.1 * esc]}>
        <mesh scale={[0.25 * esc, 0.19 * esc, 0.25 * esc]}>
          <sphereGeometry args={[1, 12, 9]} />
          <meshLambertMaterial color={P.calabazaFruto} flatShading />
        </mesh>
        <mesh position={[0, 0.19 * esc, 0]} scale={[0.03, 0.06, 0.03]}>
          <cylinderGeometry args={[1, 1.3, 1, 6]} />
          <meshLambertMaterial color={P.mazorcaHoja} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* La enredadera helicoidal de un poste del tutorado (fríjol de mata trepando). */
function VidPoste({ base, alto }) {
  const curva = useMemo(() => {
    const pts = [];
    const N = 34, vueltas = 3.4, r = 0.13;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const a = t * vueltas * Math.PI * 2;
      pts.push(new THREE.Vector3(base[0] + Math.cos(a) * r, base[1] + t * alto, base[2] + Math.sin(a) * r));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, [base, alto]);
  return (
    <mesh>
      <tubeGeometry args={[curva, 36, 0.019, 5, false]} />
      <meshLambertMaterial color={P.frijolTallo} flatShading />
    </mesh>
  );
}

/* ── EL TUTORADO (cañamazo): filas de varas de fríjol de la parcela. Postes
      instanciados + cuerda superior + una enredadera por poste + follaje
      instanciado (muchas hojitas en pocos draw calls). Esto es lo que mata el
      vacío: una PARCELA sembrada, no matas sueltas. ── */
function Tutorado({ origin = [0, 0, 0], filas = 2, porFila = 5, sep = 1.0, sepFila = 1.5, semilla = 7 }) {
  const [ox, , oz] = origin;
  const ALTO_P = 1.95;
  const posteRef = useRef(null);
  const follRef = useRef(null);
  const vainaRef = useRef(null);

  const postes = useMemo(() => {
    const list = [];
    for (let f = 0; f < filas; f++) {
      for (let i = 0; i < porFila; i++) {
        const wx = ox + (i - (porFila - 1) / 2) * sep;
        const wz = oz + (f - (filas - 1) / 2) * sepFila;
        list.push({ wx, wz, y: alturaCampo(wx, wz) });
      }
    }
    return list;
  }, [ox, oz, filas, porFila, sep, sepFila]);

  const hojas = useMemo(() => {
    const rng = crearRng(semilla + 100);
    const out = [];
    postes.forEach((p) => {
      const nh = 9;
      for (let k = 0; k < nh; k++) {
        const t = 0.14 + (k / nh) * 0.82;
        const a = t * 3.4 * Math.PI * 2 + rng() * 0.6;
        const r = 0.15 + 0.05 * Math.sin(t * 7);
        out.push({
          x: p.wx + Math.cos(a) * r,
          y: p.y + t * ALTO_P,
          z: p.wz + Math.sin(a) * r,
          giro: a,
          esc: 0.7 + rng() * 0.5,
          claro: k % 2 === 0,
        });
      }
    });
    return out;
  }, [postes, semilla]);

  const vainas = useMemo(() => {
    const rng = crearRng(semilla + 200);
    const out = [];
    postes.forEach((p) => {
      for (let k = 0; k < 3; k++) {
        const t = 0.4 + rng() * 0.4;
        const a = t * 3.4 * Math.PI * 2 + rng();
        out.push({ x: p.wx + Math.cos(a) * 0.16, y: p.y + t * ALTO_P, z: p.wz + Math.sin(a) * 0.16, giro: a });
      }
    });
    return out;
  }, [postes, semilla]);

  useEffect(() => {
    const m = posteRef.current;
    if (!m) return;
    const d = new THREE.Object3D();
    postes.forEach((p, i) => {
      d.position.set(p.wx, p.y + ALTO_P / 2, p.wz);
      d.rotation.set(0, 0, 0);
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [postes]);

  useEffect(() => {
    const m = follRef.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    const base = new THREE.Color(P.frijolHoja);
    const claro = new THREE.Color(P.frijolHojaClara);
    hojas.forEach((h, i) => {
      d.position.set(h.x, h.y, h.z);
      d.rotation.set(-0.5, h.giro, 0.2);
      d.scale.set(0.12 * h.esc, 0.03 * h.esc, 0.15 * h.esc);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      c.copy(h.claro ? claro : base);
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [hojas]);

  useEffect(() => {
    const m = vainaRef.current;
    if (!m) return;
    const d = new THREE.Object3D();
    vainas.forEach((v, i) => {
      d.position.set(v.x, v.y, v.z);
      d.rotation.set(0.2, v.giro, 0.25);
      d.scale.set(0.04, 0.14, 0.04);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [vainas]);

  return (
    <group>
      <instancedMesh ref={posteRef} args={[undefined, undefined, postes.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.028, 0.045, ALTO_P, 6]} />
        <meshLambertMaterial color={P.estaca} flatShading />
      </instancedMesh>
      {/* cuerda superior que une cada fila (el cañamazo) */}
      {Array.from({ length: filas }).map((_, f) => {
        const wz = oz + (f - (filas - 1) / 2) * sepFila;
        const y = alturaCampo(ox, wz) + ALTO_P * 0.86;
        const len = (porFila - 1) * sep + 0.4;
        return (
          <mesh key={f} position={[ox, y, wz]} scale={[len, 0.012, 0.012]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshLambertMaterial color={P.cuerda} flatShading />
          </mesh>
        );
      })}
      {postes.map((p, i) => (
        <VidPoste key={i} base={[p.wx, p.y, p.wz]} alto={ALTO_P} />
      ))}
      <instancedMesh ref={follRef} args={[undefined, undefined, hojas.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshLambertMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={vainaRef} args={[undefined, undefined, vainas.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 5]} />
        <meshLambertMaterial color={P.frijolVaina} flatShading />
      </instancedMesh>
    </group>
  );
}

/* Piedritas del lote instanciadas (1 draw call): el suelo real tiene piedra. */
function Piedritas({ n }) {
  const ref = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(53);
    const list = [];
    let intentos = 0;
    while (list.length < n && intentos < n * 8) {
      intentos += 1;
      const wx = (rng() - 0.5) * (ANCHO - 4);
      const wz = (rng() - 0.5) * (FONDO - 4);
      list.push({ wx, wz, y: alturaCampo(wx, wz), esc: 0.4 + rng() * 0.9, giro: rng() * Math.PI, claro: rng() > 0.5 });
    }
    return list;
  }, [n]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    const a = new THREE.Color(P.piedra);
    const b = new THREE.Color(P.piedraClara);
    sitios.forEach((s, i) => {
      d.position.set(s.wx, s.y + 0.03 * s.esc, s.wz);
      d.rotation.set(s.giro * 0.3, s.giro, s.giro * 0.2);
      d.scale.set(0.11 * s.esc, 0.07 * s.esc, 0.13 * s.esc);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      c.copy(s.claro ? b : a);
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [sitios]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* Un grupo de quinuas (no 3 sueltas): un manchón sembrado con alturas y colores
   de panoja variados, alrededor de un centro. */
function QuinuaGrupo({ centro, n = 7, reducedMotion, granos }) {
  const matas = useMemo(() => {
    const colores = [P.quinuaDorado, P.quinuaRojo, P.quinuaMorado];
    const rng = crearRng(71);
    return Array.from({ length: n }, (_, i) => {
      const a = rng() * Math.PI * 2;
      const r = 0.3 + rng() * 1.5;
      return {
        pos: [centro[0] + Math.cos(a) * r, 0, centro[2] + Math.sin(a) * r * 0.8],
        esc: 0.8 + rng() * 0.7,
        colorHex: colores[i % colores.length],
        semilla: 5 + i * 6,
      };
    });
  }, [centro, n]);
  return (
    <>
      {matas.map((m, i) => (
        <MataQuinua key={i} pos={m.pos} esc={m.esc} colorHex={m.colorHex} reducedMotion={reducedMotion} semilla={m.semilla} granos={granos} />
      ))}
    </>
  );
}

/* La escena completa (grupo r3f interno; el default la monta en su Canvas). */
function EscenaLeguminosas({ tier, reducedMotion, saber }) {
  const perfil = perfilDeTier(tier);
  const geo = useMemo(
    () => construirCampo(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  // La cobertura y las piedritas escalan con el tier; las MATAS del mundo (milpa,
  // tutorado, quinua, yuca, la mata-hero) se siembran SIEMPRE — son el lote, no
  // adorno: aunque el equipo caiga a frugal, la chagra no puede verse vacía.
  const nCobertura = tier === 'alto' ? 170 : tier === 'medio' ? 110 : 60;
  const nPiedras = tier === 'alto' ? 44 : tier === 'medio' ? 28 : 14;
  const granosPanoja = tier === 'alto' ? 55 : tier === 'medio' ? 38 : 22;

  // Fauna del kit (billboards SVG), por rol ecológico. Recortada al presupuesto.
  const faunaItems = [
    { tipo: 'mariposa', rol: 'polinizador', base: [0.5, 1.9, -0.3], size: 30, fase: 0.4, title: 'Mariposa polinizando la milpa' },
    { tipo: 'colibri', rol: 'polinizador', base: [-2.4, 2.3, 3.6], size: 32, fase: 1.6, title: 'Colibrí en las flores del fríjol' },
    { tipo: 'mariposa', rol: 'polinizador', base: [2.4, 1.7, -2.3], size: 26, fase: 2.2, title: 'Mariposa sobre las panojas de quinua' },
    { tipo: 'escarabajo', rol: 'descomponedor', base: [3.3, 0.2, 1.1], size: 26, fase: 2.4, title: 'Escarabajo cerrando el ciclo del abono' },
    { tipo: 'lombriz', rol: 'descomponedor', base: [-2.0, 0.05, 3.0], size: 24, fase: 0.9, title: 'Lombriz aireando el suelo bajo el fríjol' },
  ].slice(0, perfil.criaturas);

  /* `color`/`fog` se adjuntan a la ESCENA: hijos directos, nunca en <group>. */
  return (
    <>
      <color attach="background" args={[DORADA.fondo]} />
      {perfil.fog && <fog attach="fog" args={[DORADA.niebla, DORADA.nieblaCerca + 6, DORADA.nieblaLejos + 6]} />}
      <LucesDoradas />
      <SolBajo />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      <Cobertura n={nCobertura} />
      <Piedritas n={nPiedras} />

      {/* ── LA MILPA (las tres hermanas): el corazón agroecológico andino. El
           MAÍZ da la vara, el FRÍJOL trepa por él y le abona la tierra con
           nitrógeno, la CALABAZA cobija el suelo. Un bloquecito, no una mata. ── */}
      <Maiz pos={[0.5, 0, 0.1]} esc={1.2} conFrijol reducedMotion={reducedMotion} semilla={2} />
      <Calabaza pos={[1.2, 0, 0.8]} esc={1.1} semilla={4} />
      <Maiz pos={[1.7, 0, -0.7]} esc={1.02} conFrijol reducedMotion={reducedMotion} semilla={8} />
      <Maiz pos={[-0.6, 0, -0.5]} esc={1.1} conFrijol reducedMotion={reducedMotion} semilla={13} />
      <Maiz pos={[2.7, 0, 0.2]} esc={0.95} reducedMotion={reducedMotion} semilla={21} />
      <Maiz pos={[-0.1, 0, -1.5]} esc={1.05} reducedMotion={reducedMotion} semilla={27} />
      <Calabaza pos={[-1.0, 0, 0.7]} esc={0.95} semilla={33} />

      {/* La PARCELA de fríjol tutorado (el cañamazo): dos filas de varas que
          matan el vacío a la izquierda — la chagra sembrada de verdad. */}
      <Tutorado origin={[-3.4, 0, -0.7]} filas={2} porFila={5} sep={1.0} sepFila={1.5} semilla={7} />

      {/* La mata-HERO de fríjol con el CORTE del subsuelo y los nódulos rosados
          de Rhizobium: la lección intacta, al frente para leerse bien. */}
      <MataFrijol pos={[-2.4, 0, 3.5]} reducedMotion={reducedMotion} saber={saber} />

      {/* Yuca frondosa: dos matas (aguantan el suelo pobre), giradas distinto. */}
      <MataYuca pos={[3.6, 0, -0.6]} esc={1.1} giro={0.4} />
      <MataYuca pos={[4.4, 0, 1.8]} esc={0.92} giro={2.3} />

      {/* La QUINUA en GRUPO (un manchón sembrado, no tres sueltas). */}
      <QuinuaGrupo centro={[2.2, 0, -2.7]} n={7} reducedMotion={reducedMotion} granos={granosPanoja} />
      <MataQuinua pos={[-1.9, 0, -1.7]} esc={1.0} colorHex={P.quinuaMorado} reducedMotion={reducedMotion} semilla={17} granos={granosPanoja} />

      {perfil.criaturas > 0 && <Fauna items={faunaItems} reducedMotion={reducedMotion} />}

      {/* el polen dorado en suspensión (kit de partículas) */}
      <ParticulasAmbientales tipo="polen" tier={tier} reducedMotion={reducedMotion} position={[0, 0.8, 0]} semilla={23} />
      <ParticulasAmbientales tipo="polen" densidad={0.6} tier={tier} reducedMotion={reducedMotion} position={[-3, 1.0, 2]} semilla={31} />
    </>
  );
}

/* Estilos de ESTA escena (chrome DOM sobre el Canvas). */
const CSS_LEGUM = `
.legum-root { position: relative; width: 100%; height: 100dvh; min-height: 320px; overflow: hidden; background: ${DORADA.fondo}; }
.legum-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.legum-canvas--lista { opacity: 1; }
.legum-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.legum-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #4a3418; text-shadow: 0 1px 8px rgba(255,244,214,0.7); font: 700 1.18rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.legum-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.82; margin-top: 0.15rem; }
.legum-pie { padding: 0 1rem 0.9rem; display: flex; flex-direction: column; align-items: center; gap: 0.55rem; }
.legum-carta { margin: 0; max-width: 34rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(74,52,24,0.62); backdrop-filter: blur(3px); color: #fbf3e2; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.legum-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem; max-width: 36rem; }
.legum-chip { padding: 0.28rem 0.7rem; border-radius: 999px; background: rgba(255,247,228,0.86); color: #5a3f1c; font: 600 0.72rem/1.2 system-ui, sans-serif; }
.legum-chip b { color: #7a2f4c; }
.legum-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(74,52,24,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(255,247,228,0.82); color: #5a3f1c; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.legum-boton:hover, .legum-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(74,52,24,0.6); outline: none; }
.legum-boton[aria-pressed='true'] { background: #ffd9e6; border-color: rgba(122,47,76,0.6); color: #7a2f4c; }
.mundo-fauna { will-change: transform; }
@media (prefers-reduced-motion: reduce) { .legum-canvas { transition: none; } }
`;

/* La copia didáctica: en calma, la invitación; con el saber encendido, los nódulos. */
const COPY_CALMA =
  'La milpa de las tres hermanas: el maíz da la vara, el fríjol trepa por él y le abona la tierra, y la calabaza cobija el suelo. Con la yuca y la quinua, el lote le da de comer a la familia y al suelo. Toque el botón para ver, bajo el fríjol, los nódulos rosados que fijan el nitrógeno.';
const COPY_SABER =
  'Esas pelotitas rosadas en la raíz del fríjol son fábricas de nitrógeno (bacterias Rhizobium): abono gratis del aire. Por eso el fríjol trepa el maíz de la milpa — el maíz le presta la vara y el fríjol le abona la tierra. La calabaza al pie tapa el suelo y le cuida la humedad.';

const CHIPS = [
  { emoji: '🌽', txt: <>Milpa: <b>maíz + fríjol + calabaza</b> (las tres hermanas)</> },
  { emoji: '🫘', txt: <>Fríjol: <b>fija nitrógeno gratis</b> del aire</> },
  { emoji: '🌿', txt: <>Yuca: <b>aguanta el suelo pobre</b></> },
  { emoji: '🌾', txt: <>Quinua: <b>proteína de la altura</b></> },
];

/**
 * MundoLeguminosas3D — el mundo de leguminosas y raíces andinas, montable con su
 * propio `<Canvas>`. Sin lógica de negocio: es una vitrina
 * (#/mockups/mundo-leguminosas-3d). El tier y reduced-motion se detectan aquí
 * (mockup standalone), igual que sus pares (MundoParamo3D).
 */
export default function MundoLeguminosas3D() {
  const [listo, setListo] = useState(false);
  const [saber, setSaber] = useState(false);
  // `decidirTier()` devuelve { tier, motivo, reducedMotion }: se extrae el tier
  // (string) para que `perfilDeTier` y las densidades por tier acierten.
  const { tier } = useMemo(() => decidirTier(), []);
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const perfil = perfilDeTier(tier);

  return (
    <section
      className="legum-root"
      data-tier={tier}
      aria-label="El mundo de leguminosas y raíces andinas: fríjol con nódulos, yuca y quinua"
    >
      <style>{CSS_LEGUM}</style>
      <Canvas
        className={`legum-canvas${listo ? ' legum-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [0.4, 4.4, 12.5], fov: 46 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <EscenaLeguminosas tier={tier} reducedMotion={reducedMotion} saber={saber} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={6}
          maxDistance={18}
          target={[-0.3, 1.4, 0.6]}
          minPolarAngle={0.45}
          maxPolarAngle={1.42}
          minAzimuthAngle={-0.6}
          maxAzimuthAngle={0.7}
          enableDamping
          dampingFactor={0.08}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.12}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      <div className="legum-chrome">
        <h2 className="legum-titulo">
          Leguminosas y raíces andinas
          <small>La milpa · fríjol que abona · yuca que aguanta · quinua que alimenta</small>
        </h2>
        <div className="legum-pie">
          <div className="legum-chips">
            {CHIPS.map((c) => (
              <span key={c.emoji} className="legum-chip">
                <span aria-hidden="true">{c.emoji} </span>
                {c.txt}
              </span>
            ))}
          </div>
          <button
            type="button"
            className="legum-boton"
            aria-pressed={saber}
            onClick={() => setSaber((v) => !v)}
          >
            {saber ? 'Ver la mata completa' : 'Ver el saber bajo tierra'}
          </button>
          <p className="legum-carta" role="status">
            {saber ? COPY_SABER : COPY_CALMA}
          </p>
        </div>
      </div>
    </section>
  );
}
