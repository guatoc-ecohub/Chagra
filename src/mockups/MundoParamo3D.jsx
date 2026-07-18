/*
 * MundoParamo3D — el BOSQUE ALTOANDINO / PÁRAMO: el ecosistema de la niebla.
 *
 * No es paisaje decorativo: es la FÁBRICA DE AGUA de Colombia contada en 3D.
 * Los frailejones (Espeletia) atrapan la niebla con sus hojas velludas; el
 * musgo y la turba la guardan como una esponja; y del hondón, gota a gota,
 * NACE el agua que baja a las veredas. La escena existe para que se entienda
 * —sin una sola cifra— por qué el páramo se cuida: si se seca, se seca el río.
 *
 * DIRECCIÓN DE ARTE — PASADA 2 (dentro del framework, entintado hacia el frío):
 *   - La atmósfera es la BRUMA FRÍA ALTOANDINA: el CONTRASTE deliberado con la
 *     hora dorada del valle. Se deriva del preset `CIELOS_HORA.dorada` (su
 *     presupuesto de luz) entintando cada color hacia el azul-plata con la propia
 *     `mezclaHex` del kit; la luz se aplana (sol débil velado, mucho ambiente) y
 *     la niebla se cierra. Entrar al páramo se siente como SUBIR: del atardecer
 *     tibio a la neblina húmeda y fría de los 3.500 m.
 *   - Los materiales salen de `PALETA`/hexes de planta, entintados hacia la
 *     niebla FRÍA con `mezclar` — la ley de coherencia del framework. La
 *     identidad plateada del páramo (frailejón, musgo, roca) se refuerza.
 *   - El rocío/llovizna frío en suspensión es un `RocioFrio` local (páramo puro):
 *     puntos azul-plata que caen despacio, la humedad del aire hecha visible.
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
import { CIELOS_HORA, mezclaHex } from '../visual/mundo3d/cielosHoraData.js';
import { PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { crearRng } from '../visual/mundo3d/particulasData.js';

/* LA BRUMA FRÍA DEL PÁRAMO (pasada 2) — el CONTRASTE deliberado con la hora
   dorada del valle. El páramo altoandino no vive el atardecer tibio: vive su
   propia atmósfera húmeda, azul-plata y encapotada, a 3.500 m. Para no salirnos
   del kit, partimos del PRESUPUESTO DE LUZ de la hora madre (`CIELOS_HORA.dorada`)
   y entintamos cada color hacia el azul-plata frío con la propia `mezclaHex` del
   framework: misma lógica de luz (hemisferio + ambiente + sol + relleno), piel
   fría. Además la luz se aplana (más ambiente, sol débil velado por nube) y la
   niebla se cierra: el páramo se siente mojado, alto y frío. */
const FRIO = '#b7c9d6'; // el azul-plata de la niebla altoandina, el norte de todo
const AZUL_HONDO = '#8ba0b4'; // el fondo frío de las cuchillas lejanas
const ATMO = {
  ...CIELOS_HORA.dorada,
  fondo: mezclaHex(CIELOS_HORA.dorada.fondo, FRIO, 0.86),
  cielo: mezclaHex(CIELOS_HORA.dorada.cielo, '#a6bccd', 0.82),
  suelo: mezclaHex(CIELOS_HORA.dorada.suelo, '#586460', 0.58),
  luz: mezclaHex(CIELOS_HORA.dorada.luz, '#dcebf1', 0.74), // sol difuso, casi blanco-azul
  relleno: mezclaHex(CIELOS_HORA.dorada.relleno, AZUL_HONDO, 0.5),
  niebla: mezclaHex(CIELOS_HORA.dorada.niebla, FRIO, 0.88), // la bruma, el alma de la escena
  sombra: mezclaHex(CIELOS_HORA.dorada.sombra, '#242f39', 0.62),
  // luz de páramo encapotado: mucho ambiente, sol tenue (a menudo tras la nube)
  hemisferio: 0.64,
  ambiente: 0.46,
  sol: 0.5,
  rellenoInt: 0.34,
  // la humedad cierra la distancia: la niebla se come el fondo mucho antes
  nieblaCerca: 5,
  nieblaLejos: 24,
};

/* La paleta del framework, ahora entintada hacia la BRUMA FRÍA (no la dorada):
   el páramo es plateado y frío de suyo, y la pasada 2 lo lleva a su verdad
   altoandina. La identidad de cada planta (paja tostada, tallo velludo, roseta
   salvia) sobrevive; el aire la enfría, la humedece y la platea. */
const TINTE = ATMO.niebla;
const P = {
  turba: mezclar('#3f3a2c', TINTE, 0.28), // suelo húmedo de turba negra, junto al agua
  paja: mezclar('#bfa863', TINTE, 0.4), // pajonal (Calamagrostis), paja tostada
  pajaSol: mezclar('#d8c584', TINTE, 0.34), // macolla donde se cuela la poca luz
  roca: mezclar('#8f9088', TINTE, 0.46), // afloramiento de roca, gris frío alto
  frailejonTallo: mezclar('#b0a27f', TINTE, 0.36), // tallo velludo (hoja marcescente)
  frailejonHoja: mezclar('#93a97f', TINTE, 0.4), // roseta plateada verde-salvia
  frailejonFlor: mezclar('#e6c24a', TINTE, 0.2), // los capítulos amarillos
  quenuaTronco: mezclar('#8a5236', TINTE, 0.34), // Polylepis: corteza rojiza papirosa
  quenuaHoja: mezclar('#7a9166', TINTE, 0.46), // copa plateada de páramo
  musgo: mezclar('#5f8048', TINTE, 0.32), // cojín de musgo, la esponja del agua
  musgoClaro: mezclar('#83a35a', TINTE, 0.3),
  piedra: mezclar(PALETA.piedra, TINTE, 0.42), // piedra fría del nacimiento
  agua: mezclar('#4f8fa8', ATMO.cielo, 0.4), // el agua que espeja el cielo frío
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

/* Las luces del páramo frío: hemisferio azul-plata, mucho ambiente (día
   encapotado), el sol débil velado como direccional principal y un relleno frío
   opuesto. La lógica es la del kit; los números vienen aplanados hacia el frío. */
function LucesParamo() {
  return (
    <>
      <hemisphereLight intensity={ATMO.hemisferio} color={ATMO.cielo} groundColor={ATMO.suelo} />
      <ambientLight intensity={ATMO.ambiente} color={ATMO.luz} />
      <directionalLight position={/** @type {[number, number, number]} */ (ATMO.solPos)} intensity={ATMO.sol} color={ATMO.luz} />
      <directionalLight position={[-6, 4, -7]} intensity={ATMO.rellenoInt} color={ATMO.relleno} />
    </>
  );
}

/* El sol VELADO del páramo: no un disco franco, sino una mancha pálida y fría
   difuminada tras la niebla — apenas se adivina dónde está detrás de la nube.
   No ilumina (de eso se encargan las luces); es el ancla del cielo encapotado. */
function SolVelado() {
  return (
    <group position={[8, 8.5, -14]}>
      <mesh>
        <circleGeometry args={[1.9, 40]} />
        <meshBasicMaterial color="#eaf1f5" transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[3.6, 40]} />
        <meshBasicMaterial color={ATMO.luz} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[6.4, 40]} />
        <meshBasicMaterial color={ATMO.cielo} transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} />
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

/* ── El frailejonal POR EDADES: la colonia contada como un rodal real, donde
      conviven las tres generaciones del frailejón (Espeletia crece ~1 cm/año, así
      que un tallo alto es un ANCIANO de siglos):
        · JÓVENES  — rosetas plateadas a ras de suelo, aún sin tallo, las crías.
        · ADULTOS  — tallo medio y roseta plena, el grueso del rodal.
        · ANCIANOS — tallo alto y velludo con roseta imponente, los patriarcas.
      Dos InstancedMesh (tallos + rosetas) = 2 draw calls para TODO el campo.
      La altura del tallo se escala por instancia (scale.y), de ahí las edades. ── */
function FrailejonalInstanciado({ n }) {
  const tallos = useRef(null);
  const rosetas = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(203);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 12) {
      intentos += 1;
      const wx = (rng() - 0.5) * (ANCHO - 6);
      const wz = -5 + (rng() - 0.5) * (FONDO - 12); // detrás y a los lados del agua
      if (humedad(wx, wz) > 0.38) continue; // el frailejón no crece en el charco
      const y = alturaParamo(wx, wz);
      if (y > 3.4) continue; // ni en la roca pelada de las cuchillas
      // sorteo de EDAD: pocos ancianos, muchos adultos, una camada de jóvenes
      const d = rng();
      let esc, alto, edad;
      if (d < 0.3) {
        edad = 0; // joven: roseta a ras de suelo, casi sin tallo
        esc = 0.34 + rng() * 0.22;
        alto = 0.05 + rng() * 0.12;
      } else if (d < 0.78) {
        edad = 1; // adulto: el grueso del rodal
        esc = 0.66 + rng() * 0.34;
        alto = 0.7 + rng() * 0.55;
      } else {
        edad = 2; // anciano: tallo alto, roseta imponente
        esc = 0.95 + rng() * 0.4;
        alto = 1.45 + rng() * 0.85;
      }
      lista.push({ wx, wz, y, esc, alto, edad, giro: rng() * Math.PI * 2, ladeo: (rng() - 0.5) * 0.28 });
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
      const stemH = s.esc * s.alto; // altura visible del tallo (cilindro h=1.0)
      // tallo: los ancianos más curtidos (oscurecen), los jóvenes casi ocultos
      dummy.position.set(s.wx, s.y + stemH * 0.5, s.wz);
      dummy.rotation.set(s.ladeo, s.giro, 0);
      dummy.scale.set(s.esc, Math.max(s.esc * s.alto, 0.02), s.esc);
      dummy.updateMatrix();
      mt.setMatrixAt(i, dummy.matrix);
      tinte.copy(baseTallo).offsetHSL(0, 0, -0.03 * s.edad + ((i % 5) * 0.01 - 0.02));
      mt.setColorAt(i, tinte);
      // roseta sobre el tallo; los ancianos la lucen algo más plateada (clara)
      dummy.position.set(s.wx, s.y + stemH + 0.14 * s.esc, s.wz);
      dummy.rotation.set(s.ladeo, s.giro, 0);
      dummy.scale.set(s.esc, s.esc * 0.7, s.esc);
      dummy.updateMatrix();
      mr.setMatrixAt(i, dummy.matrix);
      tinte.copy(baseHoja).offsetHSL(0, -0.02 * s.edad, 0.02 * s.edad + ((i % 4) * 0.012 - 0.018));
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

/* ── Niebla enganchada: BANCOS de bruma húmeda que se pegan al suelo del páramo
      y jirones que se atoran entre las copas, todos derivando despacio. Esferas
      planas y anchas, azul-plata frío; las bajas casi lamen el pajonal (la
      humedad que sube de la turba). reduced-motion las deja quietas (presencia
      sin movimiento). Es el páramo respirando, mojado y frío. ── */
function NieblaEnganchada({ n, reducedMotion }) {
  const grupo = useRef(null);
  const jirones = useMemo(() => {
    const rng = crearRng(131);
    return Array.from({ length: n }, (_, i) => {
      const bajo = i % 2 === 0; // la mitad son bancos que se pegan al suelo
      return {
        x: (rng() - 0.5) * (ANCHO - 6),
        y: bajo ? 0.35 + rng() * 0.7 : 1.3 + rng() * 1.7,
        z: -3 + (rng() - 0.5) * (FONDO - 10),
        esc: bajo ? 2.6 + rng() * 2.6 : 1.8 + rng() * 2.0,
        aplana: bajo ? 0.24 : 0.42, // los bancos bajos, más chatos
        vel: 0.16 + rng() * 0.34,
        fase: rng() * Math.PI * 2,
        op: (bajo ? 0.09 : 0.06) + rng() * 0.07,
      };
    });
  }, [n]);
  useFrame(({ clock }) => {
    if (reducedMotion || !grupo.current) return;
    const t = clock.elapsedTime;
    grupo.current.children.forEach((m, i) => {
      const j = jirones[i];
      m.position.x = j.x + Math.sin(t * j.vel * 0.3 + j.fase) * 1.5;
      m.position.y = j.y + Math.sin(t * j.vel * 0.5 + j.fase) * 0.16;
      m.material.opacity = j.op * (0.7 + 0.3 * Math.sin(t * 0.4 + j.fase));
    });
  });
  return (
    <group ref={grupo}>
      {jirones.map((j, i) => (
        <mesh key={i} position={[j.x, j.y, j.z]} scale={[j.esc, j.esc * j.aplana, j.esc]}>
          <sphereGeometry args={[1, 7, 5]} />
          <meshBasicMaterial color={ATMO.niebla} transparent opacity={j.op} depthWrite={false} />
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
        <meshBasicMaterial color={ATMO.cielo} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
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

/* ── EL ENT-FRAILEJÓN: el GUARDIÁN-MAESTRO del páramo ──────────────────────
      Un frailejón MONUMENTAL (Espeletia hecha anciano) que se alza sobre el
      frailejonal y enseña: columna velluda vestida de enagua marcescente, un
      ROSTRO sereno que emerge del tallo (ojos ámbar hundidos bajo cejas
      afelpadas, boca-grieta amable) y la gran ROSETA plateada por corona. Un
      brazo florido (escapo de capítulos amarillos) que hace ademán de señalar,
      y un halo de páramo a sus pies. Es el par del Ent-queñua del bosque: aquí,
      arriba, el maestro es el frailejón. Digno, quieto, sabio. ── */
function EntFrailejonMaestro({ pos, esc = 1, reducedMotion }) {
  const cuerpo = useRef(null);
  const brazo = useRef(null);
  const halo = useRef(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // respira/mece apenas (anciano sereno, no bailarín)
    if (!reducedMotion) {
      if (cuerpo.current) cuerpo.current.rotation.z = Math.sin(t * 0.4) * 0.02;
      if (brazo.current) brazo.current.rotation.z = -0.5 + Math.sin(t * 0.6) * 0.06;
    }
    if (halo.current) {
      const pulso = reducedMotion ? 1 : 0.72 + 0.28 * Math.sin(t * 0.9);
      halo.current.material.opacity = 0.16 * pulso;
    }
  });

  // La enagua: anillos de hojas secas colgantes (conos abiertos) a lo largo del
  // tallo — le da CUERPO de fraile, no palo. Recientes arriba, curtidas abajo.
  const enagua = useMemo(() => {
    const arr = [];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1); // 0 base(vieja) → 1 arriba(reciente)
      arr.push({
        y: 0.5 + f * 1.7,
        r: 0.44 - f * 0.06,
        col: f < 0.4 ? P.frailejonTallo : mezclar(P.frailejonTallo, TINTE, 0.3),
      });
    }
    return arr;
  }, []);

  // La roseta: un POMPÓN plateado pleno — TRES coronas de hojas anchas y
  // afelpadas sobre un domo pálido, para que se lea como la roseta gorda del
  // frailejón (no un mohawk) y RESALTE como el punto más claro del oro.
  const hojasRoseta = useMemo(() => {
    const rng = crearRng(707);
    const corona = (n, incMin, incSpan, largoMin, largoSpan, ancho, claroMin, fase) =>
      Array.from({ length: n }, (_, i) => ({
        ang: (i / n) * Math.PI * 2 + fase + rng() * 0.12,
        inc: incMin + rng() * incSpan,
        largo: largoMin + rng() * largoSpan,
        ancho,
        claro: claroMin + rng() * 0.35,
      }));
    return [
      // externa: ancha y arqueada afuera (el faldón de la roseta)
      ...corona(20, 1.0, 0.28, 0.62, 0.2, 0.19, 0.1, 0),
      // media: intermedia
      ...corona(16, 0.6, 0.3, 0.52, 0.18, 0.17, 0.4, 0.4),
      // interna: corta y erguida (el cogollo, la más pálida)
      ...corona(10, 0.2, 0.24, 0.34, 0.14, 0.14, 0.7, 0.8),
    ];
  }, []);

  // Colores plateados de la roseta: brillan claro para RESALTAR en la niebla
  // dorada (la firma plateada del frailejón, el punto más luminoso de la escena).
  const PLATA = mezclar('#c3ceb0', TINTE, 0.12);
  const PLATA_CLARO = mezclar('#e4ead8', TINTE, 0.08);

  return (
    <group position={pos} scale={esc}>
      {/* halo de maestro a los pies (aditivo, respira) */}
      <mesh ref={halo} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 1.5, 32]} />
        <meshBasicMaterial color="#f2e6c4" transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>

      <group ref={cuerpo}>
        {/* el TALLO velludo, grueso y alto */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.34, 0.44, 2.4, 11]} />
          <meshLambertMaterial color={P.frailejonTallo} flatShading />
        </mesh>
        {/* la enagua de hojas muertas (marcescentes) por anillos */}
        {enagua.map((e, i) => (
          <mesh key={i} position={[0, e.y, 0]}>
            <coneGeometry args={[e.r, 0.5, 11, 1, true]} />
            <meshLambertMaterial color={e.col} flatShading side={THREE.DoubleSide} />
          </mesh>
        ))}

        {/* ── EL ROSTRO que emerge del tallo (a ~1.6 de alto) ── */}
        <group position={[0, 1.62, 0.28]}>
          {/* frente/mejilla: una cáscara suave sobre el tallo (más clara) */}
          <mesh position={[0, 0.05, -0.06]} scale={[1, 1.1, 0.7]}>
            <sphereGeometry args={[0.3, 14, 12]} />
            <meshLambertMaterial color={mezclar(P.frailejonTallo, '#c8b483', 0.35)} flatShading />
          </mesh>
          {/* cejas afelpadas (dos tufos claros sobre los ojos) */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.12, 0.13, 0.16]} rotation={[0, 0, -s * 0.3]} scale={[1.2, 0.5, 0.6]}>
              <sphereGeometry args={[0.08, 8, 6]} />
              <meshLambertMaterial color={P.frailejonHoja} flatShading />
            </mesh>
          ))}
          {/* ojos: cuenca honda + iris ámbar-miel que asoma de la sombra */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.12, 0.0, 0.18]}>
              <mesh position={[0, 0, -0.02]} scale={[1, 1.05, 0.8]}>
                <sphereGeometry args={[0.075, 12, 10]} />
                <meshLambertMaterial color="#4a3115" flatShading />
              </mesh>
              <mesh position={[0, 0, 0.03]}>
                <sphereGeometry args={[0.05, 12, 10]} />
                <meshLambertMaterial color="#e0ad4c" emissive="#a5702a" emissiveIntensity={0.35} flatShading />
              </mesh>
              <mesh position={[0, 0, 0.06]}>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshLambertMaterial color="#2a1c0a" flatShading />
              </mesh>
              <mesh position={[s * 0.015, 0.02, 0.075]}>
                <sphereGeometry args={[0.008, 6, 6]} />
                <meshBasicMaterial color="#fff6e2" />
              </mesh>
            </group>
          ))}
          {/* nariz de nudo */}
          <mesh position={[0, -0.1, 0.2]} scale={[0.8, 1.1, 0.9]}>
            <sphereGeometry args={[0.06, 8, 7]} />
            <meshLambertMaterial color={mezclar(P.frailejonTallo, '#8a6a44', 0.4)} flatShading />
          </mesh>
          {/* boca-grieta amable (leve arco) */}
          <mesh position={[0, -0.22, 0.17]} rotation={[0.2, 0, 0]} scale={[1.5, 0.32, 0.5]}>
            <sphereGeometry args={[0.09, 10, 6]} />
            <meshLambertMaterial color="#3a2712" flatShading />
          </mesh>
        </group>

        {/* ── LA ROSETA plateada: pompón pleno de tres coronas sobre un domo ── */}
        <group position={[0, 2.4, 0]}>
          {/* domo pálido: el cuerpo de la roseta bajo las hojas (le da bulto) */}
          <mesh position={[0, 0.12, 0]} scale={[1, 0.72, 1]}>
            <sphereGeometry args={[0.42, 14, 10]} />
            <meshLambertMaterial color={mezclar('#cdd6bd', TINTE, 0.12)} flatShading />
          </mesh>
          {hojasRoseta.map((h, i) => (
            <mesh
              key={i}
              position={[Math.cos(h.ang) * 0.2, 0.06, Math.sin(h.ang) * 0.2]}
              rotation={[h.inc, -h.ang, 0]}
              castShadow
            >
              <coneGeometry args={[h.ancho, h.largo, 4]} />
              <meshLambertMaterial color={new THREE.Color(PLATA).lerp(new THREE.Color(PLATA_CLARO), h.claro)} flatShading />
            </mesh>
          ))}
          {/* cogollo velloso central (el punto más pálido, el corazón afelpado) */}
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.16, 12, 9]} />
            <meshLambertMaterial color={mezclar('#eef2e6', TINTE, 0.08)} flatShading />
          </mesh>
        </group>

        {/* ── EL BRAZO florido: escapo que sale del costado y hace ademán de
             señalar (el maestro que enseña) con capítulos amarillos ── */}
        <group ref={brazo} position={[0.4, 1.8, 0.12]} rotation={[0, 0, -0.5]}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.03, 0.045, 0.95, 6]} />
            <meshLambertMaterial color={P.frailejonHoja} flatShading />
          </mesh>
          {[[0, 0.92, 0.05], [0.09, 0.86, -0.03], [-0.07, 0.84, 0.05], [0.03, 0.98, -0.02]].map((f, i) => (
            <mesh key={i} position={/** @type {[number, number, number]} */ (f)}>
              <sphereGeometry args={[0.07, 8, 6]} />
              <meshLambertMaterial color={P.frailejonFlor} emissive="#7a5e18" emissiveIntensity={0.2} flatShading />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/* ── CHUSQUE (Chusquea, el bambú del páramo): macollas de culmos finos y
      ARQUEADOS que se doblan con el viento. Cero copa: es fino y plumoso. ── */
function Chusque({ pos, esc = 1, seed = 5 }) {
  const rng = useMemo(() => crearRng(seed), [seed]);
  const culmos = useMemo(
    () => Array.from({ length: 7 }, () => ({
      ang: rng() * Math.PI * 2,
      inc: 0.2 + rng() * 0.35,
      alto: 0.9 + rng() * 0.7,
      verde: rng(),
    })),
    [rng],
  );
  return (
    <group position={pos} scale={esc}>
      {culmos.map((c, i) => (
        <group key={i} rotation={[Math.cos(c.ang) * c.inc, 0, Math.sin(c.ang) * c.inc]}>
          <mesh position={[0, c.alto / 2, 0]}>
            <cylinderGeometry args={[0.012, 0.02, c.alto, 4]} />
            <meshLambertMaterial color={mezclar('#8a9a55', TINTE, 0.25 + c.verde * 0.15)} flatShading />
          </mesh>
          {/* penacho de hoja fina arriba */}
          <mesh position={[0, c.alto + 0.06, 0]}>
            <coneGeometry args={[0.07, 0.28, 4]} />
            <meshLambertMaterial color={mezclar('#9caf5f', TINTE, 0.28)} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── CARDÓN (Puya, la bromelia gigante del páramo): roseta de hojas duras
      espinosas en corona baja y, a veces, una vara-inflorescencia alta. ── */
function Cardon({ pos, esc = 1, vara = true, seed = 9 }) {
  const rng = useMemo(() => crearRng(seed), [seed]);
  const hojas = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({
      ang: (i / 14) * Math.PI * 2 + rng() * 0.2,
      inc: 0.7 + rng() * 0.4,
      largo: 0.4 + rng() * 0.2,
    })),
    [rng],
  );
  return (
    <group position={pos} scale={esc}>
      {hojas.map((h, i) => (
        <mesh
          key={i}
          position={[Math.cos(h.ang) * 0.06, 0.06, Math.sin(h.ang) * 0.06]}
          rotation={[h.inc, -h.ang, 0]}
        >
          <coneGeometry args={[0.05, h.largo, 3]} />
          <meshLambertMaterial color={mezclar('#7e9a58', TINTE, 0.32)} flatShading />
        </mesh>
      ))}
      {vara && (
        <group position={[0, 0.1, 0]}>
          <mesh position={[0, 0.65, 0]}>
            <cylinderGeometry args={[0.03, 0.05, 1.3, 6]} />
            <meshLambertMaterial color={mezclar('#9a8a5a', TINTE, 0.3)} flatShading />
          </mesh>
          <mesh position={[0, 1.35, 0]}>
            <sphereGeometry args={[0.16, 8, 7]} />
            <meshLambertMaterial color={mezclar('#5f7d4a', TINTE, 0.28)} flatShading />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* ── ROMERO DE PÁRAMO (Diplostephium): arbustillo bajo, denso y aromático, de
      follaje fino gris-verde. El sotobosque leñoso del moor, instanciado. ── */
function RomeroParamo({ n }) {
  const ref = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(163);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 10) {
      intentos += 1;
      const wx = (rng() - 0.5) * (ANCHO - 8);
      const wz = (rng() - 0.5) * (FONDO - 10);
      if (humedad(wx, wz) > 0.5) continue;
      const y = alturaParamo(wx, wz);
      if (y > 3.4) continue;
      lista.push({ wx, wz, y, esc: 0.5 + rng() * 0.6, giro: rng() * Math.PI, verde: rng() });
    }
    return lista;
  }, [n]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const base = new THREE.Color(mezclar('#6f8a52', TINTE, 0.3));
    const claro = new THREE.Color(mezclar('#8aa565', TINTE, 0.28));
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y + 0.16 * s.esc, s.wz);
      dummy.rotation.set(0, s.giro, 0);
      dummy.scale.set(s.esc, s.esc * 1.15, s.esc);
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
      <dodecahedronGeometry args={[0.26]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* ── ROCÍO FRÍO EN SUSPENSIÓN: la humedad del páramo hecha visible. Un `Points`
      de motas azul-plata que caen MUY despacio y reaparecen arriba —el aire de
      3.500 m siempre está mojado, cargado de bruma que se condensa. Reemplaza al
      polen dorado del valle: aquí no hay oro flotando, hay agua. Aditivo y sutil;
      determinista por semilla; reduced-motion lo deja quieto (presencia sin
      caída). Es geometría propia del páramo, ligera (un solo draw call). ── */
function RocioFrio({ tier, reducedMotion, semilla = 17 }) {
  const ref = useRef(null);
  const n = tier === 'alto' ? 130 : tier === 'bajo' ? 30 : 70;
  const ANCHA = 26, ALTA = 6, HONDA = 22;
  const datos = useMemo(() => {
    const rng = crearRng(semilla);
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rng() - 0.5) * ANCHA;
      pos[i * 3 + 1] = rng() * ALTA;
      pos[i * 3 + 2] = -3 + (rng() - 0.5) * HONDA;
      vel[i] = 0.12 + rng() * 0.22; // la gota fría baja lento entre la bruma
    }
    return { pos, vel };
  }, [n, semilla]);
  useFrame((_, delta) => {
    if (reducedMotion || !ref.current) return;
    const arr = ref.current.geometry.attributes.position.array;
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < n; i++) {
      const yi = i * 3 + 1;
      arr[yi] -= datos.vel[i] * dt;
      if (arr[yi] < 0.05) arr[yi] = ALTA; // reaparece arriba
      arr[i * 3] += Math.sin((arr[yi] + i) * 0.6) * dt * 0.08; // deriva lateral leve
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[datos.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#dbe9f0"
        size={0.07}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
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

  // presupuestos de la colonia por tier — PASADA 2 sube la densidad del rodal
  const nFrailejones = tier === 'alto' ? 38 : 22; // frailejonal poblado, por edades
  const nPaja = tier === 'alto' ? 180 : 110;
  const nMusgo = tier === 'alto' ? 64 : 38; // más cojines: páramo húmedo
  const nNiebla = tier === 'alto' ? 14 : 9; // más bancos de bruma fría
  const nAves = tier === 'alto' ? 3 : 2;
  const nRomero = tier === 'alto' ? 34 : 18; // sotobosque leñoso más denso

  /* `color`/`fog` se adjuntan a la ESCENA: hijos directos, nunca en <group>. */
  return (
    <>
      <color attach="background" args={[ATMO.fondo]} />
      {perfil.fog && <fog attach="fog" args={[ATMO.niebla, ATMO.nieblaCerca + 2, ATMO.nieblaLejos]} />}
      <LucesParamo />
      <SolVelado />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      <NacimientoAgua reducedMotion={reducedMotion} fabrica={fabrica} />

      {/* ══ EL GUARDIÁN-MAESTRO ══ el Ent-frailejón MONUMENTAL que se alza sobre
          el frailejonal y enseña. Pasada 2 lo hace más imponente (esc 2.0):
          elevado y adelantado a la izquierda para que domine el cuadro sin tapar
          el nacimiento del agua. */}
      <EntFrailejonMaestro pos={[-2.1, alturaParamo(-2.1, 1.3) - 0.1, 1.3]} esc={2.0} reducedMotion={reducedMotion} />

      {/* el frailejón "de detalle" pasa a acompañante, más al costado */}
      <FrailejonHeroe pos={[2.7, alturaParamo(2.7, 1.5), 1.5]} reducedMotion={reducedMotion} />
      <FrailejonalInstanciado n={nFrailejones} />
      <Pajonal n={nPaja} />
      <CojinesMusgo n={nMusgo} />
      <RomeroParamo n={nRomero} />

      {/* chusque (Chusquea, el bambú del páramo) en macollas en las faldas húmedas */}
      <Chusque pos={[-5.4, alturaParamo(-5.4, 3.2), 3.2]} esc={1.15} seed={5} />
      <Chusque pos={[4.6, alturaParamo(4.6, -3.4), -3.4]} esc={0.95} seed={13} />
      <Chusque pos={[6.0, alturaParamo(6.0, 3.0), 3.0]} esc={1.05} seed={44} />
      {tier === 'alto' && <Chusque pos={[-6.8, alturaParamo(-6.8, -1.2), -1.2]} esc={1.0} seed={21} />}
      {tier === 'alto' && <Chusque pos={[-3.3, alturaParamo(-3.3, 5.0), 5.0]} esc={0.85} seed={57} />}

      {/* cardón (Puya) — la bromelia gigante del páramo, roseta espinosa + vara */}
      <Cardon pos={[3.4, alturaParamo(3.4, 3.6), 3.6]} esc={1.05} vara seed={9} />
      <Cardon pos={[-4.2, alturaParamo(-4.2, 5.2), 5.2]} esc={0.85} vara={false} seed={31} />
      <Cardon pos={[5.4, alturaParamo(5.4, -1.4), -1.4]} esc={0.9} vara seed={63} />

      {/* quenuas dispersas en las faldas; la niebla se les engancha */}
      <Quenua pos={[-8.2, alturaParamo(-8.2, -4.5), -4.5]} esc={1.25} />
      <Quenua pos={[7.6, alturaParamo(7.6, -5.2), -5.2]} esc={1.1} />
      <Quenua pos={[9.0, alturaParamo(9.0, 2.0), 2.0]} esc={0.9} />
      <Quenua pos={[-9.4, alturaParamo(-9.4, 1.6), 1.6]} esc={1.0} />

      <NieblaEnganchada n={nNiebla} reducedMotion={reducedMotion} />
      <AvePosada />
      {!reducedMotion && <AvesParamo n={nAves} />}

      {/* el ROCÍO FRÍO en suspensión: la humedad del páramo, no el polen dorado */}
      <RocioFrio tier={tier} reducedMotion={reducedMotion} semilla={17} />
    </>
  );
}

/* Estilos de ESTA escena (chrome DOM sobre el Canvas). */
const CSS_PARAMO = `
.paramo-root { position: relative; width: 100%; height: 100dvh; min-height: 320px; overflow: hidden; background: ${ATMO.fondo}; }
.paramo-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.paramo-canvas--lista { opacity: 1; }
.paramo-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.paramo-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #22303c; text-shadow: 0 1px 8px rgba(226,238,245,0.75); font: 700 1.18rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.paramo-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.84; margin-top: 0.15rem; }
.paramo-pie { padding: 0 1rem 0.9rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem; }
.paramo-carta { margin: 0; max-width: 32rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(30,44,56,0.62); backdrop-filter: blur(3px); color: #eef5f9; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.paramo-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(30,44,56,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(233,242,247,0.85); color: #26333d; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.paramo-boton:hover, .paramo-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(30,44,56,0.6); outline: none; }
.paramo-boton[aria-pressed='true'] { background: #cfe3ee; border-color: rgba(38,51,61,0.75); color: #22303c; }
@media (prefers-reduced-motion: reduce) { .paramo-canvas { transition: none; } }
`;

/* La copia didáctica: en calma, la invitación; en modo fábrica, cómo nace. */
const COPY_CALMA =
  'Este es el páramo altoandino: aire frío y húmedo, niebla azul que no se va, y su guardián, el frailejón-maestro. Toque el botón para ver de dónde nace el agua que baja a las veredas.';
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
  // decidirTier() devuelve { tier, motivo, reducedMotion }: hay que sacar el
  // tier (si no, `tier === 'alto'` nunca es cierto y el rodal cae a `medio`).
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
          <small>El frailejón-maestro, el frailejonal, el chusque y el nacimiento del agua</small>
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
