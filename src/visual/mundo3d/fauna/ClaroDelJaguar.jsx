/*
 * ClaroDelJaguar — EL CLARO DEL MONTE donde el jaguar camina de verdad.
 *
 * La escena existe para probar UNA cosa que un dibujo quieto nunca prueba: que
 * el felino PISA. Por eso el claro es deliberadamente sobrio — una vaguada de
 * monte templado con su sendero de tierra, el monte cerrando al fondo, matas de
 * hierba y piedra — y toda la atención se la lleva el animal andando.
 *
 * LEY DE LA CASA, sin excepciones:
 *   - Color: SOLO de la paleta madre (`../paleta`). Ni un hex de vegetación
 *     inventado acá; lo que falta se deriva con `mezclar` desde el pariente.
 *   - Luz: `<LuzMadre>` con la familia `CIELOS.sotobosque` mezclada 60% hacia la
 *     madre por `mezclarCielo`. Cero rig propio, cero números calcados.
 *   - Geometría fusionada: `fusionarSeguro` SIEMPRE. Mezclar una geometría
 *     indexada con una no indexada hace que `mergeGeometries` devuelva null EN
 *     SILENCIO y la especie no se dibuje — acá truena y dice quién falló.
 *   - La fauna es SVG colgado como billboard (`JaguarBillboard`), nunca un
 *     felino de geometría procedural.
 *
 * RENDIMIENTO: el monte entero son 3 InstancedMesh (árbol, mata, piedra) sobre
 * geometrías ya fusionadas → 3 draw calls; Lambert flatShading sin shadow-map;
 * los conteos salen de `perfilDeTier`. Con `reducedMotion` el frameloop pasa a
 * demanda y el jaguar queda quieto y digno.
 *
 * Vive en el chunk perezoso `vendor-three` (importa three/@react-three).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { VERDES, TIERRAS, CORTEZAS, CIELOS, mezclar, mezclarCielo, LuzMadre } from '../paleta/index.js';
import { perfilDeTier } from '../deviceTier.js';
import { fusionarSeguro, poner } from '../bosque/sombreadoVegetal.js';
import { crearRng } from '../particulasData.js';
import JaguarBillboard from './JaguarBillboard.jsx';

/* La familia de cielo del sotobosque, ya mezclada hacia la madre (ley del 60%). */
const CIELO = CIELOS.sotobosque;

/* Paleta del claro: TODO derivado de la paleta madre. El piso es templado (la
   franja donde el monte todavía es cerrado), tinteado apenas hacia la niebla
   del sotobosque para que no se despegue del resto de los mundos. */
const NIEBLA = mezclarCielo(CIELO).niebla;
const P = {
  pastoSol: mezclar(VERDES.brote, NIEBLA, 0.2),
  pasto: mezclar(VERDES.trabajo, NIEBLA, 0.24),
  pastoSombra: mezclar(VERDES.monte, NIEBLA, 0.26),
  sendero: mezclar(TIERRAS.camino, NIEBLA, 0.22),
  hojarasca: mezclar(TIERRAS.mantillo, NIEBLA, 0.2),
  copa: mezclar(VERDES.monte, NIEBLA, 0.3),
  copaSol: mezclar(VERDES.templado, NIEBLA, 0.26),
  tronco: mezclar(CORTEZAS.roble, NIEBLA, 0.22),
  piedra: mezclar(TIERRAS.piedra, NIEBLA, 0.3),
};

const ANCHO = 30;
const FONDO = 26;

/* Ruido determinista (hash de senos): el mismo claro en cada visita. */
function ruido(x, z) {
  return (
    Math.sin(x * 0.7 + z * 0.5) * 0.5 +
    Math.sin(x * 1.7 - z * 1.3 + 2.1) * 0.32 +
    Math.sin(x * 3.3 + z * 2.5 + 4.7) * 0.18
  );
}

/* La geografía: una VAGUADA — el claro se hunde apenas en el centro y el monte
   sube por los bordes. Eso es lo que hace que el felino se lea "adentro" del
   monte y no parado en una mesa. */
function alturaClaro(x, z) {
  const r = Math.hypot(x / (ANCHO * 0.5), z / (FONDO * 0.5));
  // el monte sube alrededor — suave, para que la cámara no quede ENTERRADA
  // en el borde de la vaguada (con el reborde empinado el claro se comía la toma).
  const borde = Math.max(0, r - 0.55) ** 2 * 4.2;
  return borde + ruido(x * 0.3, z * 0.3) * 0.2;
}

/* El sendero: una banda de tierra pisada que cruza el claro. Devuelve 0..1 (1 =
   plena huella). Es lo que le da al claro una dirección de lectura. */
function sendero(x, z) {
  const d = Math.abs(x * 0.36 + z * 0.24);
  return Math.max(0, 1 - d / 1.5);
}

/* Malla del claro con color por vértice. Indexada y luego desindexada en bloque
   (todo el atributo uniforme): sale del taller, no del ojo. */
function construirClaro(seg) {
  const nx = seg + 1;
  const pos = new Float32Array(nx * nx * 3);
  const col = new Float32Array(nx * nx * 3);
  const cSol = new THREE.Color(P.pastoSol);
  const cPasto = new THREE.Color(P.pasto);
  const cSombra = new THREE.Color(P.pastoSombra);
  const cSendero = new THREE.Color(P.sendero);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nx; iz++) {
    const z = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const x = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaClaro(x, z);
      pos[p] = x; pos[p + 1] = y; pos[p + 2] = z;
      // el pasto se apaga hacia el monte (menos sol adentro del bosque)
      c.lerpColors(cSol, cPasto, Math.min(1, Math.max(0, ruido(x, z) * 0.5 + 0.5)));
      c.lerp(cSombra, Math.min(1, y * 0.42));
      c.lerp(cSendero, sendero(x, z) * 0.85);
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iz = 0; iz < seg; iz++) {
    for (let ix = 0; ix < seg; ix++) {
      const a = iz * nx + ix; const b = a + 1; const d = a + nx; const e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  return geo;
}

/* ── UN ÁRBOL DEL MONTE en una sola geometría ────────────────────────────────
   Tronco (cilindro: INDEXADO) + tres bloques de copa (icosaedros: NO indexados).
   Justo la mezcla que hace que `mergeGeometries` devuelva null sin decir nada.
   Por eso pasa por `fusionarSeguro`, que desindexa todo y truena si algo falla.
   El color va por vértice para que UN InstancedMesh baste. */
function construirArbol() {
  const partes = [];
  const pintar = (g, hex) => {
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    const c = new THREE.Color(hex);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  };
  // el tronco (indexado de fábrica)
  partes.push(pintar(poner(new THREE.CylinderGeometry(0.16, 0.26, 2.6, 6), [0, 1.3, 0]), P.tronco));
  // la copa en tres masas desiguales (no indexadas de fábrica)
  const masas = [
    { pos: [0, 3.1, 0], r: 1.25, hex: P.copaSol },
    { pos: [-0.72, 2.5, 0.34], r: 0.92, hex: P.copa },
    { pos: [0.66, 2.62, -0.38], r: 0.85, hex: P.copa },
  ];
  masas.forEach((m) => {
    const g = new THREE.IcosahedronGeometry(m.r, 0);
    g.scale(1, 0.82, 1);
    partes.push(pintar(poner(g, m.pos), m.hex));
  });
  return fusionarSeguro(partes, 'arbol-del-claro');
}

/* Una mata de hierba: dos cuñas cruzadas, color por vértice (mismo atributo que
   el árbol para que la ley de fusión se cumpla también acá). */
function construirMata() {
  const partes = [];
  const pintar = (g, hex) => {
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    const c = new THREE.Color(hex);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  };
  partes.push(pintar(poner(new THREE.ConeGeometry(0.16, 0.5, 4), [0, 0.25, 0]), P.pastoSol));
  partes.push(pintar(poner(new THREE.ConeGeometry(0.13, 0.38, 4), [0.11, 0.19, 0.08], [0, 0.7, 0.3]), P.pasto));
  return fusionarSeguro(partes, 'mata-del-claro');
}

function construirPiedra() {
  const g = new THREE.DodecahedronGeometry(1, 0);
  g.scale(1, 0.66, 0.9);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  const c = new THREE.Color(P.piedra);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return fusionarSeguro([g], 'piedra-del-claro');
}

/* Siembra instanciada genérica: coloca `n` copias con la geometría dada,
   evitando el corredor del sendero (por donde anda el felino). */
function Sembrado({ geo, n, semilla, escala, aparta = 0, sinFrente = null, sobreSuelo = 0 }) {
  const ref = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(semilla);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 12) {
      intentos += 1;
      const x = (rng() - 0.5) * (ANCHO - 2);
      const z = (rng() - 0.5) * (FONDO - 2);
      // deja libre el claro central si `aparta` lo pide (los árboles no crecen
      // en la mitad del claro: por eso es un claro)
      if (aparta && Math.hypot(x / (ANCHO * 0.5), z / (FONDO * 0.5)) < aparta) continue;
      // NADA DE ÁRBOLES DELANTE DEL FELINO: el billboard <Html> se dibuja
      // SIEMPRE encima de la geometría (no hay test de profundidad contra el
      // 3D), así que un árbol en primer plano no lo tapa — lo atraviesa, y se
      // ve como un sticker pegado al vidrio. La cura es de composición: se deja
      // libre la banda del frente por donde mira la cámara.
      if (sinFrente != null && z > sinFrente) continue;
      if (sendero(x, z) > 0.55) continue; // ni encima de la huella
      lista.push({
        x, z, y: alturaClaro(x, z),
        esc: escala[0] + rng() * (escala[1] - escala[0]),
        giro: rng() * Math.PI * 2,
        ladeo: (rng() - 0.5) * 0.16,
      });
    }
    return lista;
  }, [n, semilla, escala, aparta, sinFrente]);

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    sitios.forEach((s, i) => {
      dummy.position.set(s.x, s.y + sobreSuelo * s.esc, s.z);
      dummy.rotation.set(s.ladeo, s.giro, s.ladeo * 0.6);
      dummy.scale.setScalar(s.esc);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [sitios, sobreSuelo]);

  if (!sitios.length) return null;
  return (
    <instancedMesh ref={ref} args={[geo, undefined, sitios.length]} frustumCulled={false}>
      <meshLambertMaterial vertexColors flatShading />
    </instancedMesh>
  );
}

function Claro({ tier, reducedMotion }) {
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);
  const rico = tier === 'alto';

  const geoClaro = useMemo(() => construirClaro(rico ? 76 : 46), [rico]);
  const geoArbol = useMemo(() => construirArbol(), []);
  const geoMata = useMemo(() => construirMata(), []);
  const geoPiedra = useMemo(() => construirPiedra(), []);
  useEffect(() => () => {
    geoClaro.dispose(); geoArbol.dispose(); geoMata.dispose(); geoPiedra.dispose();
  }, [geoClaro, geoArbol, geoMata, geoPiedra]);

  const nArbol = rico ? 54 : tier === 'medio' ? 34 : 20;
  const nMata = rico ? 170 : tier === 'medio' ? 90 : 40;

  return (
    <>
      <LuzMadre cielo={CIELO} perfil={perfil} solPos={[7, 8, 5]} />
      <mesh geometry={geoClaro} receiveShadow={false}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>
      <Sembrado geo={geoArbol} n={nArbol} semilla={17} escala={[0.85, 1.65]} aparta={0.72} sinFrente={2.5} />
      <Sembrado geo={geoMata} n={nMata} semilla={53} escala={[0.6, 1.35]} />
      <Sembrado geo={geoPiedra} n={rico ? 26 : 12} semilla={91} escala={[0.14, 0.4]} sobreSuelo={0.4} />

      {/* EL FELINO: el SVG de la casa, pisando el terreno del claro. */}
      <JaguarBillboard
        centro={[0, 0, 1]}
        radio={3.8}
        suelo={alturaClaro}
        alto={0.02}
        px={168}
        factor={5.4}
        animated={!reducedMotion}
        tier={tier}
      />
    </>
  );
}

export default function ClaroDelJaguar({ tier = 'alto', reducedMotion = false }) {
  const cielo = useMemo(() => mezclarCielo(CIELO), []);
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);
  return (
    <Canvas
      camera={{ position: [0, 3.2, 10.6], fov: 40 }}
      dpr={perfil.dpr}
      frameloop={reducedMotion ? 'demand' : 'always'}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[cielo.fondo]} />
      {perfil.fog && <fog attach="fog" args={[cielo.niebla, 16, 44]} />}
      <Claro tier={tier} reducedMotion={reducedMotion} />
      <OrbitControls
        enablePan={false}
        target={[0, 1.1, 0.5]}
        minDistance={5}
        maxDistance={16}
        maxPolarAngle={Math.PI * 0.49}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.28}
      />
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}
