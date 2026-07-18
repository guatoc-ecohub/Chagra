/*
 * MundoLeguminosas3D — el MUNDO DE LEGUMINOSAS Y RAÍCES ANDINAS en 3D, DENSO.
 *
 * No una muestra suelta de cuatro matas en tierra pelada, sino un LOTE VIVO —
 * "el campo hasta donde alcanza la vista": hileras y parcelas sembradas de un
 * lado a otro, en hora dorada, con la milpa de las tres hermanas al fondo.
 *
 *   - FRÍJOL DE VARA (leguminosa trepadora): HILERAS de estacas con la vid
 *     helicoidal subiendo, hojas trifoliadas y vainas. Al frente, una mata
 *     HÉROE abre un CORTE del subsuelo: los NÓDULOS ROSADOS de Rhizobium en la
 *     raíz — las fábricas de nitrógeno, el abono gratis del aire. Es el saber
 *     agroecológico clave, por eso el fríjol se asocia con el maíz.
 *   - MILPA / TRES HERMANAS: el maíz da la vara, el fríjol trepa por él y le
 *     abona la tierra, y la calabaza rastrera tapa el suelo y guarda la humedad.
 *   - QUINUA (pseudocereal andino) en GRUPO: una parcela de tallos rematados en
 *     PANOJAS densas — rojas, doradas y moradas. El color es su firma.
 *   - YUCA (arbusto de raíz tuberosa): tallo leñoso nudoso, hoja palmada y las
 *     raíces tuberosas asomando en la base. Frondosa, aguanta el suelo pobre.
 *   - COBERTURA del suelo: pasto y piedritas instanciadas — la chagra no es
 *     tierra pelada.
 *
 * DIRECCIÓN DE ARTE (todo dentro del framework, nada inventado por fuera):
 *   - La atmósfera es la MISMA hora dorada del valle: preset `CIELOS_HORA.dorada`
 *     (espejo de `ATMOSFERA` / atmosferaMadre). Entrar a la chagra se siente como
 *     acercarse dentro del mismo atardecer, no como abrir otra app.
 *   - Los materiales salen tinteados hacia la niebla dorada con `mezclar` (la ley
 *     de coherencia), conservando la identidad de cada mata (el rosado del nódulo,
 *     el rojo/dorado/morado de la panoja).
 *   - La fauna es la del kit (`Bicho`/creatures): billboards SVG bien puestos por
 *     rol ecológico (colibrí y mariposas polinizando, escarabajo y lombriz a
 *     ras). El polen en suspensión son las `ParticulasAmbientales` (tipo=polen).
 *
 * RENDIMIENTO: DENSO pero barato. Todo lo repetido va INSTANCIADO (pocos draw
 * calls): las estacas, las vides helicoidales (una geometría compartida), las
 * hojas, las vainas, los tallos y hojas de maíz y quinua, los granos de panoja,
 * la cobertura y las piedritas. Materiales Lambert sin shadow-map, geometrías
 * compartidas. Presupuestos por `perfilDeTier`; `reducedMotion` congela el
 * vaivén, apaga la fauna animada y pasa el frameloop a demanda. Autocontenida:
 * cero CDN/imágenes externas.
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
import { Bicho } from '../visual/mundo3d/escenas/FaunaEscena.jsx';

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
  surco: mezclar('#6e4f31', TINTE, 0.22), // la tierra labrada de las hileras
  pasto: mezclar('#6f9448', TINTE, 0.3), // cobertura verde
  pastoClaro: mezclar('#86a94f', TINTE, 0.28),
  pastoSeco: mezclar('#a7a862', TINTE, 0.3),
  piedra: mezclar('#9a9285', TINTE, 0.34),
  piedraClara: mezclar('#b6ad9c', TINTE, 0.34),

  // fríjol
  estaca: mezclar('#8a6a44', TINTE, 0.3), // la vara/tutor
  frijolTallo: mezclar('#5c8f43', TINTE, 0.28), // la enredadera
  frijolHoja: mezclar('#4e8b3c', TINTE, 0.3), // hoja trifoliada
  frijolHojaClara: mezclar('#71a851', TINTE, 0.28),
  frijolVaina: mezclar('#7cae54', TINTE, 0.26), // la vaina verde
  frijolVainaSeca: mezclar('#c9b25e', TINTE, 0.2), // vaina que va secando
  frijolFlor: mezclar('#ece4f0', TINTE, 0.12), // florecita lila pálida
  raiz: mezclar('#e7dab9', TINTE, 0.18), // la raíz clara
  nodulo: mezclar('#e386a6', TINTE, 0.06), // NÓDULO de Rhizobium (rosado)
  noduloClaro: mezclar('#f4abc6', TINTE, 0.06),

  // maíz (la vara de la milpa)
  maizTallo: mezclar('#9fae4f', TINTE, 0.22),
  maizHoja: mezclar('#7fa53e', TINTE, 0.26),
  maizHojaClara: mezclar('#a6c057', TINTE, 0.24),
  maizPanocha: mezclar('#d9c24f', TINTE, 0.14), // la espiga (tassel)
  maizMazorca: mezclar('#e7c65a', TINTE, 0.12), // el grano de la mazorca
  maizCapacho: mezclar('#b9c069', TINTE, 0.2), // la hoja que envuelve

  // calabaza rastrera (la tercera hermana)
  calabazaHoja: mezclar('#4b7c3a', TINTE, 0.28),
  calabazaHojaClara: mezclar('#6a9a48', TINTE, 0.26),
  calabazaFruto: mezclar('#d98b2c', TINTE, 0.1), // el zapallo naranja
  calabazaFrutoV: mezclar('#8ca444', TINTE, 0.18), // fruto todavía verde

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
  quinuaRojo: '#c1343a', // panoja roja (sin tinte: su color ES el saber)
  quinuaDorado: '#e0a52a', // panoja dorada
  quinuaMorado: '#933f8a', // panoja morada
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

/* La geografía: un LOTE de finca amplio, casi plano, con leves camas de siembra
   y una suave ondulación general (la milpa siembra sobre una cama al fondo). */
const ANCHO = 34;
const FONDO = 32;
function alturaCampo(wx, wz) {
  let h = 0.05 + ruido(wx * 0.36, wz * 0.36) * 0.14; // ondulación suave
  h += gauss(wx, wz, 2.0, -6.5, 6.0, 2.2) * 0.32; // cama alta de la milpa (fondo)
  h += gauss(wx, wz, 7.0, 1.2, 2.4, 2.2) * 0.24; // loma de la yuca
  h += gauss(wx, wz, -1.5, -3.5, 3.2, 2.0) * 0.18; // cama de la quinua
  return Math.max(0, h);
}

/* Malla del lote con colores por vértice: pasto verde con motas secas y surcos
   de tierra labrada corriendo en hileras (la chagra sembrada, no un potrero). */
function construirCampo(seg, plano) {
  const nx = seg + 1, nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cPasto = new THREE.Color(P.pasto);
  const cPastoSeco = new THREE.Color(P.pastoSeco);
  const cSurco = new THREE.Color(P.surco);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaCampo(wx, wz);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      c.lerpColors(cPasto, cPastoSeco, smoothstep(-0.5, 0.9, ruido(wx * 1.2, wz * 1.2)));
      // surcos de tierra: bandas labradas donde se sembró, corriendo N-S
      const surco = Math.abs(Math.sin(wx * 0.9 + wz * 0.05));
      c.lerp(cSurco, smoothstep(0.74, 0.99, surco) * 0.6);
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

/* La curva de una vid de fríjol: helicoidal, sube por su tutor. Compartida por
   TODAS las estacas (una sola geometría, instanciada) → pocos draw calls. */
function curvaVid(vueltas, alto, r0) {
  const pts = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = t * vueltas * Math.PI * 2;
    const r = r0 * (1 - 0.18 * t);
    pts.push(new THREE.Vector3(Math.cos(a) * r, t * alto, Math.sin(a) * r));
  }
  return new THREE.CatmullRomCurve3(pts);
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
    <group position={[11, 7, -15]}>
      <mesh>
        <circleGeometry args={[1.6, 40]} />
        <meshBasicMaterial color="#fff0cf" transparent opacity={0.95} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[3.1, 40]} />
        <meshBasicMaterial color={DORADA.luz} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[5.4, 40]} />
        <meshBasicMaterial color={DORADA.cielo} transparent opacity={0.13} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ── COBERTURA del suelo: matas bajas de pasto instanciadas (1 draw call), la
      chagra no es tierra pelada. Poco dobladas, tinte verde variado. ── */
function Cobertura({ n }) {
  const ref = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(41);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 8) {
      intentos += 1;
      const wx = (rng() - 0.5) * (ANCHO - 4);
      const wz = (rng() - 0.5) * (FONDO - 4);
      const y = alturaCampo(wx, wz);
      lista.push({ wx, wz, y, esc: 0.4 + rng() * 0.7, giro: rng() * Math.PI, ladeo: (rng() - 0.5) * 0.4 });
    }
    return lista;
  }, [n]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const base = new THREE.Color(P.pastoClaro);
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
      <coneGeometry args={[0.13, 0.44, 4]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* ── PIEDRITAS de cobertura instanciadas (1 draw call): el suelo con su textura,
      cantos rodados grisáceos entre las matas. ── */
function Piedritas({ n }) {
  const ref = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(73);
    return Array.from({ length: n }, () => {
      const wx = (rng() - 0.5) * (ANCHO - 3);
      const wz = (rng() - 0.5) * (FONDO - 3);
      return {
        wx, wz, y: alturaCampo(wx, wz),
        esc: 0.05 + rng() * 0.11,
        rx: rng() * Math.PI, ry: rng() * Math.PI, rz: rng() * Math.PI,
        clara: rng() > 0.5,
      };
    });
  }, [n]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y + s.esc * 0.4, s.wz);
      dummy.rotation.set(s.rx, s.ry, s.rz);
      dummy.scale.set(s.esc, s.esc * 0.7, s.esc);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tinte.set(s.clara ? P.piedraClara : P.piedra);
      m.setColorAt(i, tinte);
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

/* ═══════════════════════════════════════════════════════════════════════════
   EL FRIJOLAR: hileras de estacas con la vid trepando, y los ÓRGANOS de la mata
   (hojas trifoliadas, vainas) instanciados a lo largo de todas las vides.
   Todo dividido en pocos InstancedMesh para que el lote lea DENSO y sea barato.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Genera la disposición de un frijolar: estacas en hileras + los sitios de sus
   hojas/vainas/flores repartidos alrededor de cada vid (determinista). */
function sembrarFrijolar(seed, filas, porFila, cx, cz, paso, altoVar) {
  const rng = crearRng(seed);
  const estacas = [];
  const hojas = [];
  const vainas = [];
  const flores = [];
  for (let f = 0; f < filas; f++) {
    for (let k = 0; k < porFila; k++) {
      const jitterX = (rng() - 0.5) * 0.35;
      const jitterZ = (rng() - 0.5) * 0.35;
      const wx = cx + (k - (porFila - 1) / 2) * paso + jitterX;
      const wz = cz + (f - (filas - 1) / 2) * paso * 1.15 + jitterZ;
      const y = alturaCampo(wx, wz);
      const alto = altoVar * (0.85 + rng() * 0.3);
      const giro = rng() * Math.PI * 2;
      estacas.push({ wx, wz, y, alto, giro, esc: 0.9 + rng() * 0.25 });
      // hojas trifoliadas subiendo alrededor de la vid
      const nH = 5 + Math.floor(rng() * 3);
      for (let h = 0; h < nH; h++) {
        const t = 0.12 + (h / nH) * 0.8;
        const a = giro + t * 3.2 * Math.PI * 2 + rng() * 0.6;
        const r = 0.26 * (1 - t * 0.15);
        hojas.push({
          x: wx + Math.cos(a) * r,
          y: y + t * alto,
          z: wz + Math.sin(a) * r,
          giro: a,
          esc: (0.85 - t * 0.2) * (0.9 + rng() * 0.3),
          clara: h % 2 === 0,
        });
      }
      // vainas colgando en la mitad alta
      const nV = 3 + Math.floor(rng() * 3);
      for (let v = 0; v < nV; v++) {
        const t = 0.4 + rng() * 0.4;
        const a = giro + t * 3.2 * Math.PI * 2 + rng() * 0.8;
        const r = 0.28;
        vainas.push({
          x: wx + Math.cos(a) * r,
          y: y + t * alto,
          z: wz + Math.sin(a) * r,
          giro: a,
          esc: 0.85 + rng() * 0.4,
          seca: rng() > 0.7,
        });
      }
      // una florecita lila cerca de la copa
      if (rng() > 0.35) {
        flores.push({ x: wx + (rng() - 0.5) * 0.2, y: y + alto * (0.85 + rng() * 0.12), z: wz + (rng() - 0.5) * 0.2 });
      }
    }
  }
  return { estacas, hojas, vainas, flores };
}

function Frijolar({ plan, vineGeo }) {
  const estacasRef = useRef(null);
  const vidRef = useRef(null);
  const hojasRef = useRef(null);
  const vainasRef = useRef(null);
  const floresRef = useRef(null);
  const { estacas, hojas, vainas, flores } = plan;

  useEffect(() => {
    const d = new THREE.Object3D();
    // estacas (tutores)
    if (estacasRef.current) {
      estacas.forEach((s, i) => {
        d.position.set(s.wx, s.y + s.alto * 0.5, s.wz);
        d.rotation.set(0, s.giro, (i % 2 ? 0.03 : -0.03));
        d.scale.set(1, s.alto / 2.2, 1);
        d.updateMatrix();
        estacasRef.current.setMatrixAt(i, d.matrix);
      });
      estacasRef.current.instanceMatrix.needsUpdate = true;
    }
    // vides helicoidales (misma geometría, escalada por altura)
    if (vidRef.current) {
      estacas.forEach((s, i) => {
        d.position.set(s.wx, s.y, s.wz);
        d.rotation.set(0, s.giro, 0);
        d.scale.set(1.5 * s.esc, s.alto / 2.0, 1.5 * s.esc);
        d.updateMatrix();
        vidRef.current.setMatrixAt(i, d.matrix);
      });
      vidRef.current.instanceMatrix.needsUpdate = true;
    }
    // hojas
    if (hojasRef.current) {
      const col = new THREE.Color();
      hojas.forEach((h, i) => {
        d.position.set(h.x, h.y, h.z);
        d.rotation.set(-0.5, h.giro, 0.2);
        d.scale.set(0.19 * h.esc, 0.04 * h.esc, 0.24 * h.esc);
        d.updateMatrix();
        hojasRef.current.setMatrixAt(i, d.matrix);
        col.set(h.clara ? P.frijolHojaClara : P.frijolHoja);
        hojasRef.current.setColorAt(i, col);
      });
      hojasRef.current.instanceMatrix.needsUpdate = true;
      if (hojasRef.current.instanceColor) hojasRef.current.instanceColor.needsUpdate = true;
    }
    // vainas
    if (vainasRef.current) {
      const col = new THREE.Color();
      vainas.forEach((v, i) => {
        d.position.set(v.x, v.y, v.z);
        d.rotation.set(0.3, v.giro, 0.35);
        d.scale.set(0.05 * v.esc, 0.19 * v.esc, 0.05 * v.esc);
        d.updateMatrix();
        vainasRef.current.setMatrixAt(i, d.matrix);
        col.set(v.seca ? P.frijolVainaSeca : P.frijolVaina);
        vainasRef.current.setColorAt(i, col);
      });
      vainasRef.current.instanceMatrix.needsUpdate = true;
      if (vainasRef.current.instanceColor) vainasRef.current.instanceColor.needsUpdate = true;
    }
    // flores
    if (floresRef.current) {
      flores.forEach((fl, i) => {
        d.position.set(fl.x, fl.y, fl.z);
        d.rotation.set(0, 0, 0);
        d.scale.setScalar(1);
        d.updateMatrix();
        floresRef.current.setMatrixAt(i, d.matrix);
      });
      floresRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [estacas, hojas, vainas, flores]);

  return (
    <group>
      <instancedMesh ref={estacasRef} args={[undefined, undefined, estacas.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.03, 0.045, 2.2, 6]} />
        <meshLambertMaterial color={P.estaca} flatShading />
      </instancedMesh>
      <instancedMesh ref={vidRef} args={[vineGeo, undefined, estacas.length]} frustumCulled={false}>
        <meshLambertMaterial color={P.frijolTallo} flatShading />
      </instancedMesh>
      <instancedMesh ref={hojasRef} args={[undefined, undefined, hojas.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 5]} />
        <meshLambertMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={vainasRef} args={[undefined, undefined, vainas.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshLambertMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={floresRef} args={[undefined, undefined, Math.max(1, flores.length)]} frustumCulled={false}>
        <sphereGeometry args={[0.05, 6, 5]} />
        <meshLambertMaterial color={P.frijolFlor} flatShading />
      </instancedMesh>
    </group>
  );
}

/* ── LA MATA HÉROE: el fríjol con el CORTE del subsuelo y los NÓDULOS ROSADOS.
      Anclada en la CIMA de un monolito de suelo (y=0 = la superficie): arriba la
      enredadera con vainas; abajo, en la cara frontal del corte, la raíz con los
      nódulos rosados de Rhizobium — el nitrógeno que no se ve, hecho visible. ── */
function MataFrijolHeroe({ pos, reducedMotion, saber, vineGeo }) {
  const flor = useRef(null);
  const halo = useRef(null);
  const nodulos = useRef(null);
  const vid = useMemo(() => curvaVid(3.2, 2.0, 0.18), []);

  const hojas = useMemo(
    () => [0.16, 0.34, 0.52, 0.68, 0.84].map((t, i) => {
      const p = vid.getPoint(t);
      return { pos: [p.x * 1.5, p.y, p.z * 1.5], giro: i * 1.7, esc: 1 - t * 0.25, claro: i % 2 === 0 };
    }),
    [vid],
  );
  const vainas = useMemo(
    () => [0.44, 0.58, 0.66, 0.78].map((t, i) => {
      const p = vid.getPoint(t);
      return { pos: [p.x * 1.7, p.y + 0.02, p.z * 1.7 + 0.04], giro: i * 2.1, incl: 0.1 + i * 0.05 };
    }),
    [vid],
  );

  const puntosNodulo = useMemo(() => {
    const rng = crearRng(19);
    const lista = [];
    for (let i = 0; i < 15; i++) {
      const t = 0.12 + rng() * 0.82;
      const lado = (rng() - 0.5);
      lista.push({
        x: lado * (0.1 + t * 0.55),
        y: -0.12 - t * 1.05,
        z: 0.2 + rng() * 0.05,
        r: 0.05 + rng() * 0.04,
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
      const s = saber ? 1.3 : 1;
      nodulos.current.scale.setScalar(reducedMotion ? s : s * (0.98 + 0.02 * Math.sin(t * 1.6)));
    }
  });

  const groundY = alturaCampo(pos[0], pos[2]);
  const ALTO_CORTE = 1.3;

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
      <mesh position={[0, 1.1, 0]} rotation={[0, 0, 0.02]}>
        <cylinderGeometry args={[0.035, 0.05, 2.25, 6]} />
        <meshLambertMaterial color={P.estaca} flatShading />
      </mesh>
      <mesh scale={[1.5, 1, 1.5]} geometry={vineGeo}>
        <meshLambertMaterial color={P.frijolTallo} flatShading />
      </mesh>
      {hojas.map((h, i) => (
        <group key={i} position={h.pos} rotation={[0, h.giro, 0]} scale={h.esc}>
          {[0, 2.2, -2.2].map((a, j) => (
            <mesh key={j} position={[Math.sin(a) * 0.12, 0.02 * j, Math.cos(a) * 0.12 + 0.05]} rotation={[-0.5, a, 0]} scale={[0.13, 0.02, 0.18]}>
              <sphereGeometry args={[1, 7, 5]} />
              <meshLambertMaterial color={h.claro ? P.frijolHojaClara : P.frijolHoja} flatShading />
            </mesh>
          ))}
        </group>
      ))}
      {vainas.map((v, i) => (
        <group key={i} position={v.pos} rotation={[v.incl, v.giro, 0.2]}>
          <mesh position={[0, -0.11, 0]} scale={[0.045, 0.16, 0.045]}>
            <sphereGeometry args={[1, 7, 6]} />
            <meshLambertMaterial color={P.frijolVaina} flatShading />
          </mesh>
          <mesh position={[0.03, -0.28, 0]} rotation={[0, 0, 0.35]} scale={[0.04, 0.12, 0.04]}>
            <sphereGeometry args={[1, 7, 6]} />
            <meshLambertMaterial color={P.frijolVaina} flatShading />
          </mesh>
        </group>
      ))}
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

/* ═══════════════════════════════════════════════════════════════════════════
   LA MILPA — LAS TRES HERMANAS: el maíz da la vara, el fríjol trepa por él, la
   calabaza rastrera tapa el suelo. Maíz y sus hojas instanciados; el fríjol
   reusa la vid helicoidal; la calabaza pone hojas grandes y frutos a ras.
   ═══════════════════════════════════════════════════════════════════════════ */
function sembrarMilpa(seed, filas, porFila, cx, cz, paso) {
  const rng = crearRng(seed);
  const golpes = []; // cada "golpe" de siembra: maíz + fríjol + calabaza
  for (let f = 0; f < filas; f++) {
    for (let k = 0; k < porFila; k++) {
      const wx = cx + (k - (porFila - 1) / 2) * paso + (rng() - 0.5) * 0.3;
      const wz = cz + (f - (filas - 1) / 2) * paso + (rng() - 0.5) * 0.3;
      golpes.push({
        wx, wz, y: alturaCampo(wx, wz),
        alto: 2.5 + rng() * 0.6,
        giro: rng() * Math.PI * 2,
        conCalabaza: rng() > 0.4,
      });
    }
  }
  return golpes;
}

function Milpa({ golpes, vineGeo }) {
  const tallosRef = useRef(null);
  const hojasRef = useRef(null);
  const espigasRef = useRef(null);
  const vidRef = useRef(null);
  const calRef = useRef(null);
  const frutoRef = useRef(null);

  // pre-cálculo de hojas de maíz (largas, drapeadas) por golpe
  const hojasMaiz = useMemo(() => {
    const rng = crearRng(555);
    const lista = [];
    golpes.forEach((g) => {
      const n = 5;
      for (let i = 0; i < n; i++) {
        const t = 0.35 + (i / n) * 0.55;
        const a = g.giro + i * 2.4 + rng() * 0.4;
        lista.push({
          x: g.wx, y: g.y + t * g.alto, z: g.wz,
          giro: a, incl: 0.5 + rng() * 0.3, esc: (1 - t * 0.3),
          clara: i % 2 === 0,
        });
      }
    });
    return lista;
  }, [golpes]);

  const frutos = useMemo(() => {
    const rng = crearRng(777);
    const lista = [];
    golpes.forEach((g) => {
      if (!g.conCalabaza) return;
      const a = g.giro + 1.2;
      const d = 0.9 + rng() * 0.5;
      lista.push({
        x: g.wx + Math.cos(a) * d, z: g.wz + Math.sin(a) * d, y: g.y,
        esc: 0.28 + rng() * 0.16, verde: rng() > 0.6,
      });
    });
    return lista;
  }, [golpes]);

  const hojasCal = useMemo(() => {
    const rng = crearRng(888);
    const lista = [];
    golpes.forEach((g) => {
      if (!g.conCalabaza) return;
      const n = 4 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const a = rng() * Math.PI * 2;
        const d = 0.5 + rng() * 1.1;
        lista.push({
          x: g.wx + Math.cos(a) * d, z: g.wz + Math.sin(a) * d, y: g.y + 0.08,
          giro: rng() * Math.PI, esc: 0.7 + rng() * 0.5, clara: i % 2 === 0,
        });
      }
    });
    return lista;
  }, [golpes]);

  useEffect(() => {
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    if (tallosRef.current) {
      golpes.forEach((g, i) => {
        d.position.set(g.wx, g.y + g.alto * 0.5, g.wz);
        d.rotation.set(0, g.giro, 0);
        d.scale.set(1, g.alto / 2.5, 1);
        d.updateMatrix();
        tallosRef.current.setMatrixAt(i, d.matrix);
      });
      tallosRef.current.instanceMatrix.needsUpdate = true;
    }
    if (espigasRef.current) {
      golpes.forEach((g, i) => {
        d.position.set(g.wx, g.y + g.alto + 0.18, g.wz);
        d.rotation.set(0, g.giro, 0);
        d.scale.setScalar(1);
        d.updateMatrix();
        espigasRef.current.setMatrixAt(i, d.matrix);
      });
      espigasRef.current.instanceMatrix.needsUpdate = true;
    }
    if (vidRef.current) {
      golpes.forEach((g, i) => {
        d.position.set(g.wx + 0.12, g.y, g.wz + 0.12);
        d.rotation.set(0, g.giro + 1, 0);
        d.scale.set(0.9, (g.alto * 0.82) / 2.0, 0.9);
        d.updateMatrix();
        vidRef.current.setMatrixAt(i, d.matrix);
      });
      vidRef.current.instanceMatrix.needsUpdate = true;
    }
    if (hojasRef.current) {
      hojasMaiz.forEach((h, i) => {
        d.position.set(h.x, h.y, h.z);
        d.rotation.set(h.incl, h.giro, 0.1);
        d.scale.set(0.09 * h.esc, 0.02, 0.7 * h.esc);
        d.updateMatrix();
        hojasRef.current.setMatrixAt(i, d.matrix);
        col.set(h.clara ? P.maizHojaClara : P.maizHoja);
        hojasRef.current.setColorAt(i, col);
      });
      hojasRef.current.instanceMatrix.needsUpdate = true;
      if (hojasRef.current.instanceColor) hojasRef.current.instanceColor.needsUpdate = true;
    }
    if (calRef.current) {
      hojasCal.forEach((h, i) => {
        d.position.set(h.x, h.y, h.z);
        d.rotation.set(-1.3, h.giro, 0);
        d.scale.set(0.3 * h.esc, 0.02, 0.3 * h.esc);
        d.updateMatrix();
        calRef.current.setMatrixAt(i, d.matrix);
        col.set(h.clara ? P.calabazaHojaClara : P.calabazaHoja);
        calRef.current.setColorAt(i, col);
      });
      calRef.current.instanceMatrix.needsUpdate = true;
      if (calRef.current.instanceColor) calRef.current.instanceColor.needsUpdate = true;
    }
    if (frutoRef.current) {
      frutos.forEach((fr, i) => {
        d.position.set(fr.x, fr.y + fr.esc * 0.6, fr.z);
        d.rotation.set(0, i, 0);
        d.scale.set(fr.esc, fr.esc * 0.8, fr.esc);
        d.updateMatrix();
        frutoRef.current.setMatrixAt(i, d.matrix);
        col.set(fr.verde ? P.calabazaFrutoV : P.calabazaFruto);
        frutoRef.current.setColorAt(i, col);
      });
      frutoRef.current.instanceMatrix.needsUpdate = true;
      if (frutoRef.current.instanceColor) frutoRef.current.instanceColor.needsUpdate = true;
    }
  }, [golpes, hojasMaiz, hojasCal, frutos]);

  return (
    <group>
      {/* tallos de maíz */}
      <instancedMesh ref={tallosRef} args={[undefined, undefined, golpes.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.045, 0.08, 2.5, 6]} />
        <meshLambertMaterial color={P.maizTallo} flatShading />
      </instancedMesh>
      {/* espigas (tassel) en la punta */}
      <instancedMesh ref={espigasRef} args={[undefined, undefined, golpes.length]} frustumCulled={false}>
        <coneGeometry args={[0.09, 0.5, 5]} />
        <meshLambertMaterial color={P.maizPanocha} flatShading />
      </instancedMesh>
      {/* el fríjol trepando el maíz (vid helicoidal compartida) */}
      <instancedMesh ref={vidRef} args={[vineGeo, undefined, golpes.length]} frustumCulled={false}>
        <meshLambertMaterial color={P.frijolTallo} flatShading />
      </instancedMesh>
      {/* hojas largas del maíz */}
      <instancedMesh ref={hojasRef} args={[undefined, undefined, hojasMaiz.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 5, 4]} />
        <meshLambertMaterial flatShading />
      </instancedMesh>
      {/* hojas grandes de la calabaza rastrera */}
      <instancedMesh ref={calRef} args={[undefined, undefined, Math.max(1, hojasCal.length)]} frustumCulled={false}>
        <circleGeometry args={[1, 6]} />
        <meshLambertMaterial flatShading side={THREE.DoubleSide} />
      </instancedMesh>
      {/* los zapallos a ras */}
      <instancedMesh ref={frutoRef} args={[undefined, undefined, Math.max(1, frutos.length)]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 7]} />
        <meshLambertMaterial flatShading />
      </instancedMesh>
    </group>
  );
}

/* ── LA YUCA: arbusto de tallo leñoso nudoso, copa de hojas palmadas frondosa y
      las raíces tuberosas asomando en la base. Aguanta el suelo pobre. ── */
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

function MataYuca({ pos, esc = 1, semilla = 3 }) {
  const groundY = alturaCampo(pos[0], pos[2]);
  const giroBase = useMemo(() => crearRng(semilla)() * Math.PI, [semilla]);
  const tramos = [
    { y: 0.35 * esc, x: 0, incl: 0.05, h: 0.7 * esc },
    { y: 0.98 * esc, x: 0.08, incl: -0.12, h: 0.62 * esc },
    { y: 1.52 * esc, x: 0.02, incl: 0.08, h: 0.5 * esc },
  ];
  // copa frondosa: más hojas palmadas que la vieja
  const hojas = useMemo(() => {
    const r = crearRng(semilla + 100);
    return Array.from({ length: 8 }, (_, i) => ({
      pos: [Math.sin(i * 2.1) * 0.14, (1.6 + Math.cos(i) * 0.18) * esc, Math.cos(i * 2.1) * 0.14],
      giro: i * 1.6 + r(),
      incl: -0.05 - r() * 0.3,
      esc: (0.9 + r() * 0.35) * esc,
    }));
  }, [esc, semilla]);
  const tuberculos = [
    { ang: 0.4, largo: 0.62, baja: 0.28 },
    { ang: 1.9, largo: 0.55, baja: 0.24 },
    { ang: 3.3, largo: 0.66, baja: 0.3 },
    { ang: 4.7, largo: 0.5, baja: 0.22 },
    { ang: 5.6, largo: 0.58, baja: 0.26 },
  ];
  return (
    <group position={[pos[0], groundY, pos[2]]} rotation={[0, giroBase, 0]}>
      {tuberculos.map((tb, i) => (
        <group key={i} rotation={[0, tb.ang, 0]}>
          <group position={[0.28 * esc, 0.02, 0]} rotation={[0, 0, -1.05]}>
            <mesh position={[0, -tb.baja * 0.4, 0]} scale={[0.11 * esc, tb.largo * esc, 0.11 * esc]}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshLambertMaterial color={P.yucaTuberPiel} flatShading />
            </mesh>
            <mesh position={[0, -tb.baja * 0.4 - tb.largo * 0.75 * esc, 0]} scale={[0.08 * esc, 0.1 * esc, 0.08 * esc]}>
              <sphereGeometry args={[1, 7, 6]} />
              <meshLambertMaterial color={P.yucaTuber} flatShading />
            </mesh>
          </group>
        </group>
      ))}
      {tramos.map((tr, i) => (
        <group key={i}>
          <mesh position={[tr.x, tr.y, 0]} rotation={[0, 0, tr.incl]}>
            <cylinderGeometry args={[(0.07 - i * 0.012) * esc, (0.085 - i * 0.012) * esc, tr.h, 7]} />
            <meshLambertMaterial color={P.yucaTallo} flatShading />
          </mesh>
          <mesh position={[tr.x, tr.y + tr.h * 0.5, 0]}>
            <sphereGeometry args={[(0.08 - i * 0.012) * esc, 7, 5]} />
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

/* ═══════════════════════════════════════════════════════════════════════════
   LA QUINUA EN GRUPO: una parcela de tallos con hojas de pata de ganso y las
   PANOJAS densas de color arriba (rojas / doradas / moradas). Tallos y hojas
   instanciados; TODOS los granos de TODAS las panojas en UN InstancedMesh.
   ═══════════════════════════════════════════════════════════════════════════ */
function sembrarQuinuar(seed, filas, porFila, cx, cz, paso) {
  const rng = crearRng(seed);
  const colores = [P.quinuaRojo, P.quinuaDorado, P.quinuaMorado];
  const plantas = [];
  for (let f = 0; f < filas; f++) {
    for (let k = 0; k < porFila; k++) {
      const wx = cx + (k - (porFila - 1) / 2) * paso + (rng() - 0.5) * 0.35;
      const wz = cz + (f - (filas - 1) / 2) * paso + (rng() - 0.5) * 0.35;
      plantas.push({
        wx, wz, y: alturaCampo(wx, wz),
        alto: 1.05 + rng() * 0.7,
        giro: rng() * Math.PI * 2,
        color: colores[Math.floor(rng() * colores.length)],
        semilla: Math.floor(rng() * 9999),
      });
    }
  }
  return plantas;
}

function Quinuar({ plantas, granosPorPanoja, reducedMotion }) {
  const tallosRef = useRef(null);
  const hojasRef = useRef(null);
  const granosRef = useRef(null);
  const cabezasRef = useRef(null); // grupo que mece las panojas

  const hojas = useMemo(() => {
    const rng = crearRng(321);
    const lista = [];
    plantas.forEach((p) => {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const t = 0.25 + (i / n) * 0.6;
        const a = p.giro + i * 1.9 + rng();
        lista.push({
          x: p.wx + Math.sin(a) * 0.1, y: p.y + t * p.alto, z: p.wz + Math.cos(a) * 0.1,
          giro: a, esc: 0.85 - i * 0.06,
        });
      }
    });
    return lista;
  }, [plantas]);

  // granos: todos los de todas las panojas, con su color por instancia
  const granos = useMemo(() => {
    const lista = [];
    plantas.forEach((p) => {
      const rng = crearRng(p.semilla);
      const baseCol = new THREE.Color(p.color);
      const altoP = 0.65 + p.alto * 0.12;
      const radioP = 0.19;
      for (let i = 0; i < granosPorPanoja; i++) {
        const t = rng();
        const rad = radioP * (1 - t * 0.72) * (0.35 + rng() * 0.65);
        const ang = rng() * Math.PI * 2;
        const c = baseCol.clone().offsetHSL((rng() - 0.5) * 0.03, (rng() - 0.5) * 0.1, (rng() - 0.5) * 0.14);
        lista.push({
          x: p.wx + Math.cos(ang) * rad,
          y: p.y + p.alto + t * altoP,
          z: p.wz + Math.sin(ang) * rad,
          s: 0.032 + rng() * 0.03,
          col: c,
        });
      }
    });
    return lista;
  }, [plantas, granosPorPanoja]);

  useEffect(() => {
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    if (tallosRef.current) {
      plantas.forEach((p, i) => {
        d.position.set(p.wx, p.y + p.alto * 0.5, p.wz);
        d.rotation.set(0, p.giro, 0);
        d.scale.set(1, p.alto / 1.1, 1);
        d.updateMatrix();
        tallosRef.current.setMatrixAt(i, d.matrix);
      });
      tallosRef.current.instanceMatrix.needsUpdate = true;
    }
    if (hojasRef.current) {
      hojas.forEach((h, i) => {
        d.position.set(h.x, h.y, h.z);
        d.rotation.set(-0.5, h.giro, 0.3);
        d.scale.set(0.13 * h.esc, 0.02, 0.15 * h.esc);
        d.updateMatrix();
        hojasRef.current.setMatrixAt(i, d.matrix);
      });
      hojasRef.current.instanceMatrix.needsUpdate = true;
    }
    if (granosRef.current) {
      granos.forEach((g, i) => {
        d.position.set(g.x, g.y, g.z);
        d.rotation.set(0, 0, 0);
        d.scale.setScalar(g.s);
        d.updateMatrix();
        granosRef.current.setMatrixAt(i, d.matrix);
        col.copy(g.col);
        granosRef.current.setColorAt(i, col);
      });
      granosRef.current.instanceMatrix.needsUpdate = true;
      if (granosRef.current.instanceColor) granosRef.current.instanceColor.needsUpdate = true;
    }
  }, [plantas, hojas, granos]);

  useFrame(({ clock }) => {
    if (reducedMotion || !cabezasRef.current) return;
    cabezasRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.02;
  });

  return (
    <group>
      <instancedMesh ref={tallosRef} args={[undefined, undefined, plantas.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.03, 0.055, 1.1, 6]} />
        <meshLambertMaterial color={P.quinuaTallo} flatShading />
      </instancedMesh>
      <instancedMesh ref={hojasRef} args={[undefined, undefined, hojas.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 5]} />
        <meshLambertMaterial color={P.quinuaHoja} flatShading />
      </instancedMesh>
      <group ref={cabezasRef}>
        <instancedMesh ref={granosRef} args={[undefined, undefined, granos.length]} frustumCulled={false}>
          <sphereGeometry args={[1, 6, 5]} />
          <meshLambertMaterial flatShading />
        </instancedMesh>
      </group>
    </group>
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

  // geometría de vid compartida por TODO el fríjol (frijolar + milpa + héroe)
  const vineGeo = useMemo(
    () => new THREE.TubeGeometry(curvaVid(3.2, 2.0, 0.18), 40, 0.03, 5, false),
    [],
  );
  useEffect(() => () => vineGeo.dispose(), [vineGeo]);

  // presupuestos por tier (denso arriba, digno abajo)
  const denso = tier === 'alto' ? 1 : tier === 'medio' ? 0.62 : 0.4;
  const nCobertura = tier === 'alto' ? 150 : tier === 'medio' ? 90 : 45;
  const nPiedras = tier === 'alto' ? 120 : tier === 'medio' ? 70 : 30;
  const granosPanoja = tier === 'alto' ? 55 : tier === 'medio' ? 36 : 20;
  const filasFrijol = tier === 'bajo' ? 2 : 3;
  const porFilaFrijol = tier === 'alto' ? 6 : tier === 'medio' ? 5 : 4;
  const filasMilpa = tier === 'bajo' ? 2 : 3;
  const porFilaMilpa = tier === 'alto' ? 5 : 4;
  const filasQuinua = tier === 'bajo' ? 2 : 3;
  const porFilaQuinua = tier === 'alto' ? 5 : 4;

  // siembras deterministas
  const frijolarA = useMemo(() => sembrarFrijolar(11, filasFrijol, porFilaFrijol, -7.5, 2.2, 1.5, 2.2), [filasFrijol, porFilaFrijol]);
  const frijolarB = useMemo(() => sembrarFrijolar(29, filasFrijol, porFilaFrijol - 1, -8.5, 7.0, 1.5, 2.0), [filasFrijol, porFilaFrijol]);
  const milpa = useMemo(() => sembrarMilpa(43, filasMilpa, porFilaMilpa, 2.0, -7.0, 1.9), [filasMilpa, porFilaMilpa]);
  const quinuar = useMemo(() => sembrarQuinuar(61, filasQuinua, porFilaQuinua, -1.5, -3.0, 1.35), [filasQuinua, porFilaQuinua]);

  // Fauna del kit (billboards SVG), por rol ecológico. Recortada al presupuesto.
  const faunaItems = [
    { tipo: 'mariposa', rol: 'polinizador', base: [-6.5, 1.9, 3.6], size: 30, fase: 0.4, title: 'Mariposa polinizando el fríjol' },
    { tipo: 'colibri', rol: 'polinizador', base: [1.5, 2.4, -2.6], size: 32, fase: 1.6, title: 'Colibrí en las flores de la milpa' },
    { tipo: 'mariposa', rol: 'polinizador', base: [-1.0, 1.6, -1.4], size: 26, fase: 2.9, title: 'Mariposa entre las panojas de quinua' },
    { tipo: 'escarabajo', rol: 'descomponedor', base: [4.2, 0.2, 1.6], size: 26, fase: 2.4, title: 'Escarabajo cerrando el ciclo del abono' },
    { tipo: 'lombriz', rol: 'descomponedor', base: [-4.0, 0.12, 5.6], size: 24, fase: 0.9, title: 'Lombriz aireando la tierra' },
  ].slice(0, perfil.criaturas);

  /* `color`/`fog` se adjuntan a la ESCENA: hijos directos, nunca en <group>. */
  return (
    <>
      <color attach="background" args={[DORADA.fondo]} />
      {perfil.fog && <fog attach="fog" args={[DORADA.niebla, DORADA.nieblaCerca + 6, DORADA.nieblaLejos]} />}
      <LucesDoradas />
      <SolBajo />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      <Cobertura n={nCobertura} />
      <Piedritas n={nPiedras} />

      {/* EL FRIJOLAR: dos parcelas de hileras a la izquierda del lote */}
      <Frijolar plan={frijolarA} vineGeo={vineGeo} />
      <Frijolar plan={frijolarB} vineGeo={vineGeo} />

      {/* LA MATA HÉROE: el corte con los nódulos, al frente e izquierda */}
      <MataFrijolHeroe pos={[-6.0, 0, 5.6]} reducedMotion={reducedMotion} saber={saber} vineGeo={vineGeo} />

      {/* LA MILPA de las tres hermanas, al fondo-centro */}
      <Milpa golpes={milpa} vineGeo={vineGeo} />

      {/* LA QUINUA en grupo, centro */}
      <Quinuar plantas={quinuar} granosPorPanoja={granosPanoja} reducedMotion={reducedMotion} />

      {/* LAS YUCAS frondosas, a la derecha */}
      <MataYuca pos={[6.6, 0, 1.4]} esc={1.15} semilla={3} />
      <MataYuca pos={[8.4, 0, -1.2]} esc={0.95} semilla={7} />
      {denso > 0.5 && <MataYuca pos={[5.2, 0, 4.4]} esc={0.85} semilla={13} />}

      {perfil.criaturas > 0 && faunaItems.map((it, i) => (
        <Bicho key={i} {...it} reducedMotion={reducedMotion} />
      ))}

      {/* el polen dorado en suspensión (kit de partículas) */}
      <ParticulasAmbientales tipo="polen" tier={tier} reducedMotion={reducedMotion} position={[-3, 1.1, 2]} semilla={23} />
      <ParticulasAmbientales tipo="polen" densidad={0.7} tier={tier} reducedMotion={reducedMotion} position={[2, 1.4, -4]} semilla={31} />
      <ParticulasAmbientales tipo="polen" densidad={0.5} tier={tier} reducedMotion={reducedMotion} position={[6, 1.0, 1]} semilla={47} />
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
.legum-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem; max-width: 38rem; }
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
  'El frijolar, la milpa, la quinua y la yuca: un lote que le da de comer a la familia y a la tierra. Toque el botón para ver, bajo el fríjol de adelante, los nódulos rosados que fijan el nitrógeno.';
const COPY_SABER =
  'Esas pelotitas rosadas en la raíz del fríjol son fábricas de nitrógeno (bacterias Rhizobium): abono gratis del aire. Por eso siembre la milpa: el maíz da la vara, el fríjol le abona la tierra y la calabaza le tapa el suelo.';

const CHIPS = [
  { emoji: '🫘', txt: <>Fríjol: <b>fija nitrógeno gratis</b></> },
  { emoji: '🌽', txt: <>Milpa: <b>maíz + fríjol + calabaza</b></> },
  { emoji: '🌾', txt: <>Quinua: <b>proteína de la altura</b></> },
  { emoji: '🌿', txt: <>Yuca: <b>aguanta el suelo pobre</b></> },
];

/**
 * MundoLeguminosas3D — el mundo de leguminosas y raíces andinas, DENSO, montable
 * con su propio `<Canvas>`. Sin lógica de negocio: es una vitrina
 * (#/mockups/mundo-leguminosas-3d). El tier y reduced-motion se detectan aquí
 * (mockup standalone), igual que sus pares (MundoBoticaCana3D).
 */
export default function MundoLeguminosas3D() {
  const [listo, setListo] = useState(false);
  const [saber, setSaber] = useState(false);
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
    <section
      className="legum-root"
      data-tier={tier}
      aria-label="El lote de leguminosas y raíces andinas: frijolar, milpa, quinua y yuca, con los nódulos del fríjol"
    >
      <style>{CSS_LEGUM}</style>
      <Canvas
        className={`legum-canvas${listo ? ' legum-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [2.5, 4.6, 13.5], fov: 46 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <EscenaLeguminosas tier={tier} reducedMotion={reducedMotion} saber={saber} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={7}
          maxDistance={22}
          target={[-1.5, 1.3, 0.4]}
          minPolarAngle={0.4}
          maxPolarAngle={1.44}
          minAzimuthAngle={-0.75}
          maxAzimuthAngle={0.75}
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
          <small>Frijolar que abona · milpa de tres hermanas · quinua · yuca</small>
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
