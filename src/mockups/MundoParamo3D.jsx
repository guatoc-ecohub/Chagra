/*
 * MundoParamo3D — el BOSQUE ALTOANDINO / PÁRAMO: el ecosistema de la niebla.
 *
 * No es paisaje decorativo: es la FÁBRICA DE AGUA de Colombia contada en 3D.
 * Los frailejones (Espeletia) atrapan la niebla con sus hojas velludas; el
 * musgo y la turba la guardan como una esponja; y del hondón, gota a gota,
 * NACE el agua que baja a las veredas. La escena existe para que se entienda
 * —sin una sola cifra— por qué el páramo se cuida: si se seca, se seca el río.
 *
 * DIRECCIÓN DE ARTE (todo dentro del framework, nada inventado por fuera):
 *   - La atmósfera es la MISMA hora dorada del valle: preset `CIELOS_HORA.dorada`
 *     (espejo exacto de `ATMOSFERA` / atmosferaMadre). Entrar al páramo se siente
 *     como acercarse dentro del mismo atardecer, no como abrir otra app.
 *   - Los materiales salen de `PALETA` (atmosferaMadre) entintados hacia la
 *     niebla dorada con `mezclar` — la ley de coherencia del framework. La
 *     identidad plateada del páramo (frailejón, musgo, roca) sobrevive sin
 *     romper la paleta común.
 *   - El polen/rocío en suspensión son las `ParticulasAmbientales` del kit
 *     (tipo=polen), sin tocar: mismo presupuesto por tier.
 *
 * ECOSISTEMA (low-poly, cada pieza con propósito didáctico):
 *   - Frailejones : el héroe. Tallo velludo de hojas marcescentes + roseta
 *     plateada; los cercanos florecen amarillo. Campo instanciado (2 draw calls)
 *     + un frailejón protagonista con detalle, junto al nacimiento.
 *   - Pajonal     : la paja del páramo, macollas dobladas por el viento
 *     (instanciadas, 1 draw call).
 *   - Musgo       : cojines de musgo, las esponjas que guardan el agua
 *     (instanciados).
 *   - Quenuas     : árboles de páramo (Polylepis) de tronco rojizo papiroso;
 *     la niebla se les engancha en las copas.
 *   - Niebla      : el `fog` de la hora dorada + jirones que se enganchan y
 *     derivan despacio entre los árboles.
 *   - Nacimiento  : el hondón húmedo donde brota el agua — laguna que espeja el
 *     cielo, piedras y un halo que respira. El botón didáctico lo enciende.
 *   - Aves         : un cóndor que planea alto y aves pequeñas del páramo; una
 *     posada en la piedra para la lectura en calma (reduced-motion no las vuela).
 *
 * RENDIMIENTO: frailejones/paja/musgo instanciados (pocos draw calls), un Points
 * para el polen, materiales Lambert sin shadow-map. Presupuestos por
 * `perfilDeTier`; `reducedMotion` congela deriva de niebla, oleaje y vuelo y
 * pasa el frameloop a demanda. Gama baja cae al 2D digno antes de montar esto.
 *
 * Ruta mockup: #/mockups/mundo-paramo-3d (cableada en App.jsx, sin auth).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';
import { crearRng } from '../visual/mundo3d/particulasData.js';

/* La hora dorada canónica (espejo de ATMOSFERA): única fuente de la atmósfera. */
const DORADA = CIELOS_HORA.dorada;

/* La paleta del framework entintada hacia la niebla dorada del páramo. El
   páramo es plateado y frío de suyo; se le da apenas el tinte cálido de la hora
   para que el ojo lea "el mismo atardecer", conservando su identidad de bruma. */
const TINTE = DORADA.niebla;
const P = {
  turba: mezclar('#4a4028', TINTE, 0.3), // suelo húmedo de turba, junto al agua
  paja: mezclar('#c0a35a', TINTE, 0.32), // pajonal, la paja dorada del páramo
  pajaSol: mezclar('#dcc078', TINTE, 0.28), // macolla donde pega el sol rasante
  roca: mezclar('#9a917b', TINTE, 0.4), // afloramiento de roca, gris pardo alto
  frailejonTallo: mezclar('#b3a37c', TINTE, 0.3), // tallo velludo (hoja marcescente)
  frailejonHoja: mezclar('#9db081', TINTE, 0.32), // roseta plateada verde-salvia
  frailejonFlor: mezclar('#e6c24a', TINTE, 0.15), // los capítulos amarillos
  quenuaTronco: mezclar('#8a5236', TINTE, 0.3), // Polylepis: corteza rojiza papirosa
  quenuaHoja: mezclar('#7d9463', TINTE, 0.4), // copa plateada de páramo
  musgo: mezclar('#6f8a49', TINTE, 0.3), // cojín de musgo, la esponja del agua
  musgoClaro: mezclar('#8aa85c', TINTE, 0.28),
  piedra: mezclar(PALETA.piedra, TINTE, 0.35), // piedra del nacimiento
  agua: mezclar('#5aa6b4', DORADA.cielo, 0.32), // el agua que espeja el cielo dorado
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
/* Ruido determinista (hash de senos): mismo páramo siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/* La geografía del páramo: una meseta alta ondulada, cuchillas que suben al
   fondo y un HONDÓN húmedo al frente donde se junta y NACE el agua. */
const ANCHO = 32;
const FONDO = 32;
const AGUA_CX = 0;
const AGUA_CZ = 4.6; // el hondón, al frente-centro (cerca de la cámara)
function alturaParamo(wx, wz) {
  let h = 1.2; // la meseta base, alta
  h += ruido(wx * 0.45, wz * 0.45) * 0.55; // ondulación suave del moor
  h += gauss(wx, wz, -10, -11, 5.6, 4.6) * 2.3; // cuchilla occidental
  h += gauss(wx, wz, 10, -12, 6.2, 4.4) * 2.8; // cuchilla oriental (más alta)
  h += gauss(wx, wz, 0, -15, 8.5, 3.6) * 1.7; // el fondo que cierra el cuenco
  h -= gauss(wx, wz, AGUA_CX, AGUA_CZ, 5.0, 3.4) * 2.0; // el hondón del nacimiento
  return h;
}
const Y_AGUA = alturaParamo(AGUA_CX, AGUA_CZ) + 0.05;
/* "Humedad" de un punto: 1 en el hondón, 0 en las cuchillas. Tiñe la turba y
   decide dónde crece el musgo. */
const humedad = (wx, wz) => gauss(wx, wz, AGUA_CX, AGUA_CZ, 5.2, 3.8);

/* Malla del páramo con colores por vértice: pajonal dorado en las faldas, roca
   plateada arriba, turba húmeda y oscura alrededor del nacimiento. */
function construirTerreno(seg, plano) {
  const nx = seg + 1, nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cTurba = new THREE.Color(P.turba);
  const cPaja = new THREE.Color(P.paja);
  const cPajaSol = new THREE.Color(P.pajaSol);
  const cRoca = new THREE.Color(P.roca);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaParamo(wx, wz);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      // base: pajonal → roca según la altura, con motas de paja al sol
      c.lerpColors(cPaja, cPajaSol, smoothstep(-0.4, 1.1, ruido(wx, wz)));
      c.lerp(cRoca, smoothstep(2.4, 4.4, y));
      // el agua y la turba oscurecen y humedecen las orillas del hondón
      c.lerp(cTurba, clamp(humedad(wx, wz) * 0.9, 0, 0.85));
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
      <directionalLight position={/** @type {[number, number, number]} */ (DORADA.solPos)} intensity={DORADA.sol} color={DORADA.luz} />
      <directionalLight position={[-6, 4, -7]} intensity={DORADA.rellenoInt} color={DORADA.relleno} />
    </>
  );
}

/* El sol bajo del atardecer: un disco tibio con halo, del lado del solPos.
   No ilumina (de eso se encargan las luces); es el ancla visual de la hora. */
function SolBajo() {
  return (
    <group position={[10, 7.5, -14]}>
      <mesh>
        <circleGeometry args={[1.6, 40]} />
        <meshBasicMaterial color="#fff0cf" transparent opacity={0.95} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[3.0, 40]} />
        <meshBasicMaterial color={DORADA.luz} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[5.2, 40]} />
        <meshBasicMaterial color={DORADA.cielo} transparent opacity={0.13} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ── Frailejón protagonista: el detalle que enseña la planta. Tallo velludo
      (cilindro + falda de hojas secas marcescentes), roseta plateada de hojas
      lanceoladas y, arriba, la vara con capítulos amarillos. Junto al agua. ── */
function FrailejonHeroe({ pos, reducedMotion }) {
  const flor = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !flor.current) return;
    // la vara florida se mece apenas con el viento del páramo
    flor.current.rotation.z = Math.sin(clock.elapsedTime * 0.7) * 0.06;
  });
  const hojas = useMemo(() => {
    const rng = crearRng(77);
    return Array.from({ length: 9 }, (_, i) => ({
      ang: (i / 9) * Math.PI * 2,
      inc: 0.55 + rng() * 0.25,
      largo: 0.62 + rng() * 0.18,
    }));
  }, []);
  return (
    <group position={pos}>
      {/* tallo velludo: cilindro claro + falda cónica de hojas secas colgantes */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.24, 1.24, 9]} />
        <meshLambertMaterial color={P.frailejonTallo} flatShading />
      </mesh>
      <mesh position={[0, 0.86, 0]}>
        <coneGeometry args={[0.34, 0.9, 9, 1, true]} />
        <meshLambertMaterial color={mezclar(P.frailejonTallo, TINTE, 0.25)} flatShading side={THREE.DoubleSide} />
      </mesh>
      {/* la roseta: hojas lanceoladas radiando hacia arriba-afuera */}
      <group position={[0, 1.28, 0]}>
        {hojas.map((h, i) => (
          <mesh
            key={i}
            position={[Math.cos(h.ang) * 0.12, 0.04, Math.sin(h.ang) * 0.12]}
            rotation={[h.inc, -h.ang, 0]}
          >
            <coneGeometry args={[0.075, h.largo, 4]} />
            <meshLambertMaterial color={P.frailejonHoja} flatShading />
          </mesh>
        ))}
        {/* el cogollo central */}
        <mesh position={[0, 0.06, 0]}>
          <sphereGeometry args={[0.13, 8, 6]} />
          <meshLambertMaterial color={mezclar(P.frailejonHoja, '#c8d2ad', 0.4)} flatShading />
        </mesh>
        {/* la vara con capítulos amarillos (Espeletia florece amarillo) */}
        <group ref={flor} position={[0.16, 0.1, 0.05]}>
          <mesh position={[0, 0.28, 0]} rotation={[0, 0, -0.2]}>
            <cylinderGeometry args={[0.02, 0.028, 0.6, 5]} />
            <meshLambertMaterial color={mezclar(P.frailejonHoja, TINTE, 0.4)} flatShading />
          </mesh>
          {[
            [0.02, 0.52, 0.05],
            [0.1, 0.46, -0.02],
            [-0.05, 0.44, 0.04],
          ].map((f, i) => (
            <mesh key={i} position={/** @type {[number, number, number]} */ (f)}>
              <sphereGeometry args={[0.06, 7, 5]} />
              <meshLambertMaterial color={P.frailejonFlor} flatShading />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/* ── El campo de frailejones: la colonia. Dos InstancedMesh (tallos + rosetas)
      = 2 draw calls para todo el frailejonal. Sembrado determinista sobre el
      relieve, evitando el agua; roseta un pelín ladeada por instancia. ── */
function FrailejonalInstanciado({ n }) {
  const tallos = useRef(null);
  const rosetas = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(203);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 12) {
      intentos += 1;
      const wx = (rng() - 0.5) * (ANCHO - 8);
      const wz = -6 + (rng() - 0.5) * (FONDO - 14); // detrás y a los lados del agua
      if (humedad(wx, wz) > 0.35) continue; // el frailejón no crece en el charco
      const y = alturaParamo(wx, wz);
      if (y > 3.2) continue; // ni en la roca pelada de las cuchillas
      lista.push({ wx, wz, y, esc: 0.75 + rng() * 0.7, giro: rng() * Math.PI * 2, ladeo: (rng() - 0.5) * 0.3 });
    }
    return lista;
  }, [n]);

  useEffect(() => {
    const mt = tallos.current, mr = rosetas.current;
    if (!mt || !mr) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const baseTallo = new THREE.Color(P.frailejonTallo);
    const baseHoja = new THREE.Color(P.frailejonHoja);
    sitios.forEach((s, i) => {
      // tallo
      dummy.position.set(s.wx, s.y + 0.5 * s.esc, s.wz);
      dummy.rotation.set(s.ladeo, s.giro, 0);
      dummy.scale.set(s.esc, s.esc, s.esc);
      dummy.updateMatrix();
      mt.setMatrixAt(i, dummy.matrix);
      tinte.copy(baseTallo).offsetHSL(0, 0, (i % 5) * 0.012 - 0.024);
      mt.setColorAt(i, tinte);
      // roseta, sobre el tallo
      dummy.position.set(s.wx, s.y + 1.02 * s.esc, s.wz);
      dummy.rotation.set(s.ladeo, s.giro, 0);
      dummy.scale.set(s.esc, s.esc * 0.7, s.esc);
      dummy.updateMatrix();
      mr.setMatrixAt(i, dummy.matrix);
      tinte.copy(baseHoja).offsetHSL(0, 0, (i % 4) * 0.014 - 0.02);
      mr.setColorAt(i, tinte);
    });
    mt.instanceMatrix.needsUpdate = true;
    mr.instanceMatrix.needsUpdate = true;
    if (mt.instanceColor) mt.instanceColor.needsUpdate = true;
    if (mr.instanceColor) mr.instanceColor.needsUpdate = true;
  }, [sitios]);

  return (
    <group>
      <instancedMesh ref={tallos} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.16, 0.22, 1.0, 7]} />
        <meshLambertMaterial flatShading />
      </instancedMesh>
      {/* la roseta como cono facetado: sus caras leen como hojas radiantes */}
      <instancedMesh ref={rosetas} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
        <coneGeometry args={[0.5, 0.5, 9]} />
        <meshLambertMaterial flatShading />
      </instancedMesh>
    </group>
  );
}

/* ── El pajonal: macollas de paja instanciadas (1 draw call), un poco dobladas.
      El manto que cubre el páramo entre frailejones. ── */
function Pajonal({ n }) {
  const ref = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(51);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 8) {
      intentos += 1;
      const wx = (rng() - 0.5) * (ANCHO - 4);
      const wz = (rng() - 0.5) * (FONDO - 6);
      if (humedad(wx, wz) > 0.6) continue; // menos paja en el barro del hondón
      const y = alturaParamo(wx, wz);
      if (y > 3.6) continue;
      lista.push({ wx, wz, y, esc: 0.6 + rng() * 0.8, giro: rng() * Math.PI, ladeo: (rng() - 0.5) * 0.4 });
    }
    return lista;
  }, [n]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const base = new THREE.Color(P.paja);
    const sol = new THREE.Color(P.pajaSol);
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y + 0.16 * s.esc, s.wz);
      dummy.rotation.set(s.ladeo, s.giro, s.ladeo * 0.5);
      dummy.scale.set(s.esc, s.esc, s.esc);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tinte.copy(base).lerp(sol, (i % 7) / 7);
      m.setColorAt(i, tinte);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [sitios]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
      <coneGeometry args={[0.16, 0.62, 5]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* ── Cojines de musgo: hemisferios instanciados alrededor del agua — las
      esponjas que atrapan y guardan la humedad. Densos en la turba húmeda. ── */
function CojinesMusgo({ n }) {
  const ref = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(89);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 14) {
      intentos += 1;
      const wx = AGUA_CX + (rng() - 0.5) * 12;
      const wz = AGUA_CZ + (rng() - 0.5) * 9;
      if (humedad(wx, wz) < 0.28) continue; // solo donde hay humedad
      const y = alturaParamo(wx, wz);
      if (y < Y_AGUA + 0.02) continue; // no dentro de la laguna
      lista.push({ wx, wz, y, esc: 0.4 + rng() * 0.7, aplana: 0.45 + rng() * 0.25, verde: rng() });
    }
    return lista;
  }, [n]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const base = new THREE.Color(P.musgo);
    const claro = new THREE.Color(P.musgoClaro);
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y, s.wz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(s.esc, s.esc * s.aplana, s.esc);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tinte.copy(base).lerp(claro, s.verde);
      m.setColorAt(i, tinte);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [sitios]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
      <sphereGeometry args={[0.5, 8, 5]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* ── Quenua (Polylepis): árbol de páramo de tronco rojizo retorcido y copa
      plateada baja. La niebla se le engancha (jirón propio junto a la copa). ── */
function Quenua({ pos, esc = 1 }) {
  return (
    <group position={pos} scale={esc}>
      <mesh position={[0, 0.5, 0]} rotation={[0.06, 0, 0.08]}>
        <cylinderGeometry args={[0.08, 0.14, 1.0, 6]} />
        <meshLambertMaterial color={P.quenuaTronco} flatShading />
      </mesh>
      <mesh position={[0.18, 0.95, 0.05]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.05, 0.08, 0.6, 5]} />
        <meshLambertMaterial color={P.quenuaTronco} flatShading />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.6, 8, 6]} />
        <meshLambertMaterial color={P.quenuaHoja} flatShading />
      </mesh>
      <mesh position={[0.34, 0.98, 0.12]}>
        <sphereGeometry args={[0.38, 7, 5]} />
        <meshLambertMaterial color={mezclar(P.quenuaHoja, TINTE, 0.25)} flatShading />
      </mesh>
    </group>
  );
}

/* ── Niebla enganchada: jirones que se atoran entre las copas y derivan despacio.
      Esferas planas muy tenues, tinte niebla. reduced-motion las deja quietas
      (presencia sin movimiento). Es el páramo respirando. ── */
function NieblaEnganchada({ n, reducedMotion }) {
  const grupo = useRef(null);
  const jirones = useMemo(() => {
    const rng = crearRng(131);
    return Array.from({ length: n }, () => ({
      x: (rng() - 0.5) * (ANCHO - 8),
      y: 1.0 + rng() * 1.8,
      z: -4 + (rng() - 0.5) * (FONDO - 12),
      esc: 1.6 + rng() * 2.2,
      vel: 0.2 + rng() * 0.4,
      fase: rng() * Math.PI * 2,
      op: 0.05 + rng() * 0.07,
    }));
  }, [n]);
  useFrame(({ clock }) => {
    if (reducedMotion || !grupo.current) return;
    const t = clock.elapsedTime;
    grupo.current.children.forEach((m, i) => {
      const j = jirones[i];
      m.position.x = j.x + Math.sin(t * j.vel * 0.3 + j.fase) * 1.4;
      m.position.y = j.y + Math.sin(t * j.vel * 0.5 + j.fase) * 0.18;
      m.material.opacity = j.op * (0.7 + 0.3 * Math.sin(t * 0.4 + j.fase));
    });
  });
  return (
    <group ref={grupo}>
      {jirones.map((j, i) => (
        <mesh key={i} position={[j.x, j.y, j.z]} scale={[j.esc, j.esc * 0.4, j.esc]}>
          <sphereGeometry args={[1, 7, 5]} />
          <meshBasicMaterial color={DORADA.niebla} transparent opacity={j.op} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ── El nacimiento del agua: el hondón húmedo. Laguna que espeja el cielo dorado
      (leve oleaje por vértices), piedras alrededor y un halo que respira. Con el
      modo didáctico encendido, el halo brilla más y sube: "de aquí NACE". ── */
function NacimientoAgua({ reducedMotion, fabrica }) {
  const laguna = useRef(null);
  const halo = useRef(null);
  const geo = useMemo(() => new THREE.CircleGeometry(2.6, 40), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const base = useMemo(() => {
    // guarda las coordenadas base del disco para ondular sin acumular
    const arr = geo.attributes.position.array;
    return Float32Array.from(arr);
  }, [geo]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // oleaje suave del espejo de agua
    if (!reducedMotion && laguna.current) {
      const attr = laguna.current.geometry.attributes.position;
      const a = attr.array;
      for (let i = 0; i < a.length; i += 3) {
        const x = base[i], y = base[i + 1];
        a[i + 2] = Math.sin(x * 1.6 + t * 1.1) * 0.03 + Math.cos(y * 1.9 - t * 0.9) * 0.03;
      }
      attr.needsUpdate = true;
    }
    // el halo del nacimiento respira; en modo fábrica brilla más fuerte
    if (halo.current) {
      const objetivo = fabrica ? 0.34 : 0.12;
      const pulso = reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(t * 1.4);
      halo.current.material.opacity = objetivo * pulso;
      halo.current.scale.setScalar(fabrica ? 1.25 : 1);
    }
  });

  return (
    <group position={[AGUA_CX, 0, AGUA_CZ]}>
      {/* el espejo de agua */}
      <mesh ref={laguna} geometry={geo} position={[0, Y_AGUA, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshLambertMaterial color={P.agua} transparent opacity={0.9} />
      </mesh>
      {/* brillo del cielo sobre el agua (aditivo, sutil) */}
      <mesh position={[0, Y_AGUA + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.9, 1]}>
        <circleGeometry args={[1.9, 32]} />
        <meshBasicMaterial color={DORADA.cielo} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* el halo del nacimiento: crece y brilla en modo fábrica */}
      <mesh ref={halo} position={[0, Y_AGUA + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.9, 2.7, 40]} />
        <meshBasicMaterial color="#dff3ef" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      {/* piedras del manantial */}
      {[
        [1.9, 0.3, -0.6, 0.4],
        [-1.7, 0.2, 0.9, 0.34],
        [0.4, 0.15, 2.0, 0.3],
        [-2.1, 0.18, -1.0, 0.26],
        [1.4, 0.12, 1.7, 0.22],
      ].map((r, i) => (
        <mesh key={i} position={[r[0], Y_AGUA + r[3] * 0.4, r[2]]} rotation={[r[1], i, r[1]]}>
          <dodecahedronGeometry args={[r[3]]} />
          <meshLambertMaterial color={P.piedra} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Un ave pequeña de páramo, silueta a contraluz: dos alas con bisagra + cuerpo.
   Se arma como grupo para que el vuelo la coloque; el aleteo rota las bisagras. */
function alaGeom(w, d) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  g.translate(w / 2, 0, 0);
  return g;
}

/* ── Aves del páramo: un cóndor que planea alto y aves menores en arco. Cada ave
      es un grupo (ala izq/der con bisagra + cuerpo); el vuelo las mueve y el
      aleteo rota las alas. No montan en reduced-motion (un ave quieta en el
      cielo lee como calcomanía, no como calma) — para eso está la posada. ── */
function AvesParamo({ n }) {
  const grupo = useRef(null);
  const aves = useMemo(() => {
    const rng = crearRng(311);
    return Array.from({ length: n }, (_, i) => {
      const condor = i === 0;
      return {
        condor,
        radio: condor ? 9 : 4 + rng() * 3,
        altura: condor ? 8.5 : 4 + rng() * 2.5,
        cx: (rng() - 0.5) * 5,
        cz: -5 + (rng() - 0.5) * 5,
        vel: condor ? 0.12 : 0.28 + rng() * 0.18,
        aleteo: condor ? 1.1 : 4 + rng() * 2,
        amp: condor ? 0.18 : 0.55,
        fase: rng() * Math.PI * 2,
        w: condor ? 1.0 : 0.32 + rng() * 0.1,
        d: condor ? 0.42 : 0.16,
        color: condor ? '#2a2620' : '#3a352c',
      };
    });
  }, [n]);
  const geos = useMemo(
    () => aves.map((a) => ({ izq: alaGeom(a.w, a.d), der: alaGeom(-a.w, a.d) })),
    [aves],
  );
  useEffect(() => {
    return () => geos.forEach((g) => { g.izq.dispose(); g.der.dispose(); });
  }, [geos]);

  useFrame(({ clock }) => {
    if (!grupo.current) return;
    const t = clock.elapsedTime;
    grupo.current.children.forEach((g, i) => {
      const a = aves[i];
      const ang = t * a.vel + a.fase;
      g.position.set(
        a.cx + Math.cos(ang) * a.radio,
        a.altura + Math.sin(t * 0.4 + a.fase) * 0.5,
        a.cz + Math.sin(ang) * a.radio * 0.75,
      );
      g.rotation.y = -ang; // encara el rumbo del arco
      const flap = Math.sin(t * a.aleteo + a.fase) * a.amp;
      g.children[0].rotation.z = flap; // bisagra izquierda
      g.children[1].rotation.z = -flap; // bisagra derecha
    });
  });

  return (
    <group ref={grupo}>
      {aves.map((a, i) => (
        <group key={i}>
          <group>
            <mesh geometry={geos[i].izq}>
              <meshBasicMaterial color={a.color} side={THREE.DoubleSide} />
            </mesh>
          </group>
          <group>
            <mesh geometry={geos[i].der}>
              <meshBasicMaterial color={a.color} side={THREE.DoubleSide} />
            </mesh>
          </group>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[a.d * 0.4, a.w * 1.1, 5]} />
            <meshBasicMaterial color={a.color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Un ave posada en la piedra del nacimiento: siempre presente (también en
   reduced-motion), da vida sin movimiento. Silueta simple mirando al agua. */
function AvePosada() {
  return (
    <group position={[AGUA_CX + 1.9, Y_AGUA + 0.42, AGUA_CZ - 0.6]} rotation={[0, -0.8, 0]}>
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.11, 7, 6]} />
        <meshLambertMaterial color="#3a352c" flatShading />
      </mesh>
      <mesh position={[0.02, 0.2, 0.02]}>
        <sphereGeometry args={[0.07, 7, 6]} />
        <meshLambertMaterial color="#453f34" flatShading />
      </mesh>
      <mesh position={[-0.12, 0.06, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.05, 0.22, 5]} />
        <meshLambertMaterial color="#2f2b23" flatShading />
      </mesh>
    </group>
  );
}

/* La escena completa (grupo r3f interno; el default la monta en su Canvas). */
function EscenaParamo({ tier, reducedMotion, fabrica }) {
  const perfil = perfilDeTier(tier);
  const geo = useMemo(
    () => construirTerreno(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  // presupuestos de la colonia por tier
  const nFrailejones = tier === 'alto' ? 16 : 10;
  const nPaja = tier === 'alto' ? 150 : 90;
  const nMusgo = tier === 'alto' ? 46 : 28;
  const nNiebla = tier === 'alto' ? 9 : 6;
  const nAves = tier === 'alto' ? 3 : 2;

  /* `color`/`fog` se adjuntan a la ESCENA: hijos directos, nunca en <group>. */
  return (
    <>
      <color attach="background" args={[DORADA.fondo]} />
      {perfil.fog && <fog attach="fog" args={[DORADA.niebla, DORADA.nieblaCerca + 2, DORADA.nieblaLejos]} />}
      <LucesDoradas />
      <SolBajo />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      <NacimientoAgua reducedMotion={reducedMotion} fabrica={fabrica} />
      <FrailejonHeroe pos={[-2.2, alturaParamo(-2.2, 2.4), 2.4]} reducedMotion={reducedMotion} />
      <FrailejonalInstanciado n={nFrailejones} />
      <Pajonal n={nPaja} />
      <CojinesMusgo n={nMusgo} />

      {/* quenuas dispersas en las faldas; la niebla se les engancha */}
      <Quenua pos={[-8.2, alturaParamo(-8.2, -4.5), -4.5]} esc={1.25} />
      <Quenua pos={[7.6, alturaParamo(7.6, -5.2), -5.2]} esc={1.1} />
      <Quenua pos={[9.0, alturaParamo(9.0, 2.0), 2.0]} esc={0.9} />
      <Quenua pos={[-9.4, alturaParamo(-9.4, 1.6), 1.6]} esc={1.0} />

      <NieblaEnganchada n={nNiebla} reducedMotion={reducedMotion} />
      <AvePosada />
      {!reducedMotion && <AvesParamo n={nAves} />}

      {/* el polen/rocío dorado en suspensión (kit de partículas) */}
      <ParticulasAmbientales
        tipo="polen"
        tier={tier}
        reducedMotion={reducedMotion}
        position={[0, 0.5, 1]}
        semilla={17}
      />
      <ParticulasAmbientales
        tipo="polen"
        densidad={0.6}
        tier={tier}
        reducedMotion={reducedMotion}
        position={[-4, 0.8, -3]}
        semilla={29}
      />
    </>
  );
}

/* Estilos de ESTA escena (chrome DOM sobre el Canvas). */
const CSS_PARAMO = `
.paramo-root { position: relative; width: 100%; height: 100dvh; min-height: 320px; overflow: hidden; background: ${DORADA.fondo}; }
.paramo-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.paramo-canvas--lista { opacity: 1; }
.paramo-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.paramo-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #4a3418; text-shadow: 0 1px 8px rgba(255,244,214,0.7); font: 700 1.18rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.paramo-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.82; margin-top: 0.15rem; }
.paramo-pie { padding: 0 1rem 0.9rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem; }
.paramo-carta { margin: 0; max-width: 32rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(74,52,24,0.62); backdrop-filter: blur(3px); color: #fbf3e2; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.paramo-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(74,52,24,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(255,247,228,0.82); color: #5a3f1c; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.paramo-boton:hover, .paramo-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(74,52,24,0.6); outline: none; }
.paramo-boton[aria-pressed='true'] { background: #ffe8b0; border-color: rgba(90,63,28,0.75); color: #4a3418; }
@media (prefers-reduced-motion: reduce) { .paramo-canvas { transition: none; } }
`;

/* La copia didáctica: en calma, la invitación; en modo fábrica, cómo nace. */
const COPY_CALMA =
  'El páramo es la fábrica de agua. Toque el botón para ver de dónde nace el agua que baja a las veredas.';
const COPY_FABRICA =
  'Los frailejones peinan la niebla con sus hojas velludas; el musgo y la turba la guardan como una esponja. Del hondón, gota a gota, nace el agua. Por eso el páramo se cuida: si se seca, se seca el río.';

/**
 * MundoParamo3D — el páramo altoandino, montable con su propio `<Canvas>`.
 * Sin lógica de negocio: es una vitrina (#/mockups/mundo-paramo-3d). El tier y
 * reduced-motion se detectan aquí (mockup standalone), igual que sus pares.
 */
export default function MundoParamo3D() {
  const [listo, setListo] = useState(false);
  const [fabrica, setFabrica] = useState(false);
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
      className="paramo-root"
      data-tier={tier}
      aria-label="El páramo altoandino: el ecosistema de la niebla, la fábrica de agua"
    >
      <style>{CSS_PARAMO}</style>
      <Canvas
        className={`paramo-canvas${listo ? ' paramo-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [0, 5, 14], fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <EscenaParamo tier={tier} reducedMotion={reducedMotion} fabrica={fabrica} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={7}
          maxDistance={20}
          target={[0, 1.2, 0]}
          minPolarAngle={0.5}
          maxPolarAngle={1.42}
          minAzimuthAngle={-1.1}
          maxAzimuthAngle={1.1}
          enableDamping
          dampingFactor={0.08}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.1}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      <div className="paramo-chrome">
        <h2 className="paramo-titulo">
          El páramo: la fábrica de agua
          <small>Bosque altoandino de niebla — frailejones, musgo y el nacimiento del agua</small>
        </h2>
        <div className="paramo-pie">
          <button
            type="button"
            className="paramo-boton"
            aria-pressed={fabrica}
            onClick={() => setFabrica((v) => !v)}
          >
            {fabrica ? 'Ver el páramo en calma' : 'Ver cómo nace el agua'}
          </button>
          <p className="paramo-carta" role="status">
            {fabrica ? COPY_FABRICA : COPY_CALMA}
          </p>
        </div>
      </div>
    </section>
  );
}
