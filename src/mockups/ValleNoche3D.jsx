/*
 * ValleNoche3D — el VALLE DE NOCHE: la variante nocturna mágica del valle.
 *
 * No es oscuridad triste: es la finca EN REPOSO. Luna de plata sobre el
 * páramo, cielo estrellado andino que titila sin prisa, luciérnagas velando
 * los surcos, la casita con una ventana tibia todavía encendida y Angelita
 * dormida en su flor. Refuerza la dirección educativa de Chagra
 * (anti-ansiedad): la noche no es tiempo perdido — la finca también descansa.
 *
 * DIRECCIÓN DE ARTE (nada inventado por fuera del framework):
 *   - El preset `CIELOS_HORA.noche` (cielosHoraData) manda TODA la atmósfera:
 *     fondo índigo, luna plata, relleno tibio de fogata, fog que cierra el
 *     valle. Es la misma noche del kit de cielos — no una noche nueva.
 *   - Los materiales salen de `PALETA` (atmosferaMadre) entintados hacia la
 *     niebla nocturna con `mezclar` — la ley de coherencia del framework.
 *   - Las luciérnagas son las de `ParticulasAmbientales` (tipo=luciernagas),
 *     sin tocar: mismo pulso, mismo presupuesto por tier.
 *   - Angelita es la creature rubber-hose real (`AbejaAngelita`) en pose de
 *     reposo, anclada con `Html` — la misma abeja de ValleEnCalma, dormida.
 *
 * GRILLOS 0 KB (opcionales): coro sintetizado con WebAudio (osciladores puros,
 * cero assets, cero red — cachea limpio offline). SIEMPRE opt-in con botón
 * (nunca autoplay); al silenciar o desmontar se cierra el AudioContext.
 *
 * RENDIMIENTO: un Points para estrellas (1 draw call, buffers mutados en
 * sitio), cultivos instanciados (1 draw call), materiales Lambert sin
 * shadow-map. Presupuestos por `perfilDeTier`; `reducedMotion` congela
 * titileo/humo/vaivén y pasa el frameloop a demanda.
 *
 * Ruta mockup: #/mockups/valle-noche-3d (cableada en App.jsx, sin auth).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';
import { crearRng } from '../visual/mundo3d/particulasData.js';
import { AbejaAngelita } from '../visual/creatures/AbejaAngelita.jsx';

/* La noche canónica del kit de cielos: única fuente de la atmósfera. */
const NOCHE = CIELOS_HORA.noche;

/* La paleta diurna del framework, entintada hacia la niebla nocturna. La luna
   desatura y azulea; el ojo sigue leyendo "el mismo valle", pero dormido. */
const TINTE = NOCHE.niebla;
const P = {
  pasto: mezclar('#4c7147', TINTE, 0.5),
  pastoLuna: mezclar('#6c9a5b', TINTE, 0.38), // el claro donde pega la luna
  monte: mezclar(PALETA.follajeOscuro, TINTE, 0.6),
  copa: mezclar(PALETA.follajeOscuro, TINTE, 0.42),
  tronco: mezclar(PALETA.maderaOscura, TINTE, 0.4),
  cal: mezclar(PALETA.cal, TINTE, 0.55),
  teja: mezclar('#9a5a36', TINTE, 0.5),
  madera: mezclar(PALETA.madera, TINTE, 0.45),
  mata: mezclar(PALETA.follaje, TINTE, 0.42),
  tierra: mezclar(PALETA.tierra, TINTE, 0.38),
  camino: mezclar(PALETA.tierraClara, TINTE, 0.42),
  ambar: '#ffd98f', // la ventana encendida: el único calor franco de la escena
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
/* Ruido determinista (hash de senos): mismo valle siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/* El cuenco del valle: centro plano (ahí duermen la casa y los surcos) y lomas
   que suben hacia los bordes, más altas al fondo — el abrazo del páramo. */
const ANCHO = 30;
const FONDO = 30;
function alturaValle(wx, wz) {
  const borde = smoothstep(6.5, 13.5, Math.hypot(wx, wz));
  let h = borde * 2.1;
  h += gauss(wx, wz, -10, -8, 4.6, 4.2) * 2.1; // loma occidental
  h += gauss(wx, wz, 10, -8.5, 5.0, 4.4) * 2.5; // loma oriental
  h += gauss(wx, wz, 0, -13, 6.0, 3.4) * 1.8; // el fondo del valle
  h += ruido(wx, wz) * 0.22 * borde; // crestas suaves, solo en las faldas
  return h;
}

/* Malla del terreno con colores por vértice: el fondo del cuenco recibe el
   claro de luna; las faldas se hunden en el monte azulado. */
function construirTerreno(seg, plano) {
  const nx = seg + 1, nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cBajo = new THREE.Color(P.pastoLuna);
  const cMedio = new THREE.Color(P.pasto);
  const cAlto = new THREE.Color(P.monte);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaValle(wx, wz);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      const t = clamp(y / 3.4, 0, 1);
      if (t < 0.35) c.lerpColors(cBajo, cMedio, t / 0.35);
      else c.lerpColors(cMedio, cAlto, (t - 0.35) / 0.65);
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

/* Sprite radial suave para las estrellas (64px, generado una vez, cacheado a
   nivel de módulo, con guarda SSR) — sin él los Points son cuadrados duros. */
let spriteCache = null;
function spriteEstrella() {
  if (spriteCache) return spriteCache;
  if (typeof document === 'undefined') return null;
  const lienzo = document.createElement('canvas');
  lienzo.width = 64;
  lienzo.height = 64;
  const ctx = lienzo.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  spriteCache = new THREE.CanvasTexture(lienzo);
  return spriteCache;
}

/* Colores de estrella: plata fría en su mayoría, unas pocas tibias (las
   "fogatas del cielo") — mismo contraste frío/cálido del preset noche. */
const TONOS_ESTRELLA = ['#dfe6ff', '#dfe6ff', '#c9d4f2', '#fff3d6'];

/* ── Cielo estrellado: UN Points sobre el domo; titileo por mutación del buffer
      de color (cero asignaciones por frame). reduced-motion = firmamento
      quieto a brillo sembrado. ── */
function CieloEstrellado({ n, reducedMotion }) {
  const puntos = useRef(null);
  const datos = useMemo(() => {
    const rng = crearRng(41);
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const colBase = new Float32Array(n * 3);
    const fase = new Float32Array(n);
    const vel = new Float32Array(n);
    const color = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      const az = rng() * Math.PI * 2;
      const el = 0.08 + rng() * 1.32; // del horizonte alto al cenit
      const r = 30 + rng() * 7;
      pos[j] = Math.cos(el) * Math.cos(az) * r;
      pos[j + 1] = Math.sin(el) * r + 1.2;
      pos[j + 2] = Math.cos(el) * Math.sin(az) * r;
      color.set(TONOS_ESTRELLA[Math.floor(rng() * TONOS_ESTRELLA.length)]);
      const brillo = 0.45 + rng() * 0.55;
      colBase[j] = color.r * brillo;
      colBase[j + 1] = color.g * brillo;
      colBase[j + 2] = color.b * brillo;
      col[j] = colBase[j];
      col[j + 1] = colBase[j + 1];
      col[j + 2] = colBase[j + 2];
      fase[i] = rng() * Math.PI * 2;
      vel[i] = 0.35 + rng() * 1.1;
    }
    return { pos, col, colBase, fase, vel };
  }, [n]);

  useFrame(({ clock }) => {
    if (reducedMotion || !puntos.current) return;
    const t = clock.elapsedTime;
    const geo = puntos.current.geometry;
    const c = geo.attributes.color.array;
    const { colBase, fase, vel } = datos;
    for (let i = 0; i < fase.length; i++) {
      const j = i * 3;
      const pulso = 0.72 + 0.28 * Math.sin(t * vel[i] + fase[i]);
      c[j] = colBase[j] * pulso;
      c[j + 1] = colBase[j + 1] * pulso;
      c[j + 2] = colBase[j + 2] * pulso;
    }
    geo.attributes.color.needsUpdate = true;
  });

  return (
    <points ref={puntos} key={`estrellas:${n}`} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[datos.pos, 3]} />
        <bufferAttribute attach="attributes-color" args={[datos.col, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={spriteEstrella()}
        size={0.55}
        vertexColors
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

/* ── La luna andina: disco de plata con dos halos y un par de mares suaves.
      Da la dirección de la luz principal (la direccional sale de aquí). ── */
function LunaAndina() {
  return (
    <group position={[-3.1, 8.3, -15]}>
      <mesh>
        <circleGeometry args={[1.35, 40]} />
        <meshBasicMaterial color="#f2f0e2" transparent opacity={0.98} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* mares: sombras suaves que hacen luna, no plato */}
      <mesh position={[-0.35, 0.3, 0.01]}>
        <circleGeometry args={[0.34, 20]} />
        <meshBasicMaterial color="#d4d2c2" transparent opacity={0.55} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.4, -0.32, 0.01]}>
        <circleGeometry args={[0.22, 18]} />
        <meshBasicMaterial color="#d9d7c6" transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[2.4, 40]} />
        <meshBasicMaterial color={NOCHE.luz} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[4.0, 40]} />
        <meshBasicMaterial color={NOCHE.cielo} transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* Las luces de la noche del kit: hemisferio índigo, ambiente mínimo, la luna
   como direccional plata y un relleno tibio bajo (la fogata lejana). */
function LucesNocturnas() {
  return (
    <>
      <hemisphereLight intensity={NOCHE.hemisferio} color={NOCHE.cielo} groundColor={NOCHE.suelo} />
      <ambientLight intensity={NOCHE.ambiente} color={NOCHE.luz} />
      <directionalLight position={[-9, 9, -9]} intensity={NOCHE.sol} color={NOCHE.luz} />
      <directionalLight position={[8, 3, 9]} intensity={NOCHE.rellenoInt} color={NOCHE.relleno} />
      {/* relleno de luna suave desde donde ELLA está: sin esto el pasto del
          primer plano se iba a negro plano y la finca no se leía dormida sino
          apagada. Tenue a propósito: sigue siendo noche. */}
      <directionalLight position={[-3, 8, -12]} intensity={0.18} color={NOCHE.luz} />
    </>
  );
}

/* Humo de la chimenea: tres volutas que suben sin prisa y se disuelven.
   reduced-motion las deja sembradas quietas (presencia sin movimiento). */
function HumoChimenea({ reducedMotion }) {
  const grupo = useRef(null);
  const volutas = useMemo(
    () => [0, 1, 2].map((i) => ({ fase: i * 1.1, x: 0.06 * i })),
    [],
  );
  useFrame(({ clock }) => {
    if (reducedMotion || !grupo.current) return;
    const t = clock.elapsedTime;
    grupo.current.children.forEach((m, i) => {
      const ciclo = ((t * 0.22 + volutas[i].fase) % 1.6) / 1.6;
      m.position.y = ciclo * 1.5;
      m.position.x = volutas[i].x + Math.sin(t * 0.5 + volutas[i].fase) * 0.1;
      const esc = 0.1 + ciclo * 0.2;
      m.scale.setScalar(esc);
      m.material.opacity = 0.3 * (1 - ciclo);
    });
  });
  return (
    <group ref={grupo}>
      {volutas.map((v, i) => (
        <mesh key={v.fase} position={[v.x, 0.25 + i * 0.45, 0]} scale={0.12 + i * 0.04}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#9aa4c0" transparent opacity={0.18 - i * 0.05} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ── La casita dormida: paredes de cal azulada, teja, chimenea con humo y UNA
      ventana ámbar encendida — el corazón cálido de la escena. La luz de la
      ventana respira apenas (vela adentro); en calma queda fija. ── */
function CasaDormida({ reducedMotion }) {
  const vela = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !vela.current) return;
    const t = clock.elapsedTime;
    vela.current.intensity = 0.85 + Math.sin(t * 1.3) * 0.05 + Math.sin(t * 7.7) * 0.04;
  });
  return (
    <group position={[1.3, 0, 0.1]}>
      {/* paredes + techo a cuatro aguas (cono de 4 lados girado 45°) */}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[2.3, 1.44, 1.9]} />
        <meshLambertMaterial color={P.cal} flatShading />
      </mesh>
      <mesh position={[0, 1.86, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.95, 0.95, 4]} />
        <meshLambertMaterial color={P.teja} flatShading />
      </mesh>
      {/* chimenea + humo */}
      <mesh position={[0.62, 2.14, -0.3]}>
        <boxGeometry args={[0.24, 0.6, 0.24]} />
        <meshLambertMaterial color={P.tierra} flatShading />
      </mesh>
      <group position={[0.62, 2.48, -0.3]}>
        <HumoChimenea reducedMotion={reducedMotion} />
      </group>
      {/* la puerta, dormida */}
      <mesh position={[-0.5, 0.5, 0.96]}>
        <planeGeometry args={[0.5, 1.0]} />
        <meshLambertMaterial color={P.madera} />
      </mesh>
      {/* la ventana encendida + su vela (luz puntual tibia, radio corto) */}
      <mesh position={[0.5, 0.86, 0.96]}>
        <planeGeometry args={[0.46, 0.5]} />
        <meshBasicMaterial color={P.ambar} />
      </mesh>
      <mesh position={[0.5, 0.86, 0.965]}>
        <planeGeometry args={[0.05, 0.5]} />
        <meshBasicMaterial color={P.madera} />
      </mesh>
      <mesh position={[0.5, 0.86, 0.965]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[0.05, 0.46]} />
        <meshBasicMaterial color={P.madera} />
      </mesh>
      {/* el resplandor de la vela sobre el aire: un halo suave (el mismo
          sprite radial de las estrellas, entintado ámbar) para que la ventana
          se lea encendida desde lejos, no como un rectángulo pegado */}
      <mesh position={[0.5, 0.86, 1.0]}>
        <planeGeometry args={[1.6, 1.6]} />
        <meshBasicMaterial
          map={spriteEstrella()}
          color={P.ambar}
          transparent
          opacity={0.38}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight ref={vela} position={[0.5, 0.9, 1.4]} intensity={0.85} distance={5.5} color={P.ambar} />
    </group>
  );
}

/* ── Las lomas lejanas del páramo: crestas recortadas contra el cielo. Dos
      capas de ShapeGeometry barata (1 draw call cada una); el fog las entinta
      hacia la niebla nocturna y las separa en profundidad. Sin ellas el
      horizonte era una raya y el valle no tenía abrazo. ── */
function SiluetaLomas({ z, base, amp, semilla, color }) {
  const geo = useMemo(() => {
    const rng = crearRng(semilla);
    const fase = rng() * Math.PI * 2;
    const forma = new THREE.Shape();
    forma.moveTo(-36, -2);
    const pasos = 26;
    for (let i = 0; i <= pasos; i++) {
      const x = -36 + (72 * i) / pasos;
      const y = base
        + Math.sin(x * 0.16 + fase) * amp
        + Math.sin(x * 0.37 + fase * 2.3) * amp * 0.45;
      forma.lineTo(x, Math.max(0.4, y));
    }
    forma.lineTo(36, -2);
    forma.closePath();
    return new THREE.ShapeGeometry(forma, 1);
  }, [base, amp, semilla]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={[0, 0, z]}>
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

/* Fincas vecinas veladas a lo lejos: puntitos ámbar sobre la falda de la loma
   cercana. El valle duerme acompañado — otras cocinas también quedaron con la
   vela puesta. fog=false para que el punto pinche la niebla como luz real. */
const FINCAS_LEJANAS = [
  [-6.4, 2.35, -13.6],
  [5.6, 1.95, -13.6],
  [10.4, 3.0, -13.7],
];
function FincasLejanas() {
  return FINCAS_LEJANAS.map(([x, y, z]) => (
    <group key={`${x}:${z}`} position={[x, y, z]}>
      <mesh>
        <circleGeometry args={[0.09, 8]} />
        <meshBasicMaterial color={P.ambar} fog={false} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[0.7, 0.7]} />
        <meshBasicMaterial
          map={spriteEstrella()}
          color={P.ambar}
          fog={false}
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  ));
}

/* La cerca de palos junto al camino: cuatro postes y dos largueros. Lo mínimo
   para que el sendero se lea de finca y no de parque. */
const POSTES = [1.5, 2.6, 3.7, 4.8];
function CercaDelCamino() {
  return (
    <group position={[0.18, 0, 0]}>
      {POSTES.map((z) => (
        <mesh key={z} position={[0, 0.28, z]}>
          <cylinderGeometry args={[0.035, 0.045, 0.56, 5]} />
          <meshLambertMaterial color={P.tronco} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.44, 3.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 3.5, 4]} />
        <meshLambertMaterial color={P.madera} flatShading />
      </mesh>
      <mesh position={[0, 0.24, 3.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 3.5, 4]} />
        <meshLambertMaterial color={P.madera} flatShading />
      </mesh>
    </group>
  );
}

/* Un árbol dormido: tronco + dos copas azuladas, sin ceremonia. */
function Arbol({ pos, esc = 1 }) {
  return (
    <group position={pos} scale={esc}>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.09, 0.14, 0.9, 6]} />
        <meshLambertMaterial color={P.tronco} flatShading />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.62, 8, 6]} />
        <meshLambertMaterial color={P.copa} flatShading />
      </mesh>
      <mesh position={[0.3, 0.85, 0.15]}>
        <sphereGeometry args={[0.4, 7, 6]} />
        <meshLambertMaterial color={P.monte} flatShading />
      </mesh>
    </group>
  );
}

/* ── Los surcos dormidos: matas instanciadas (1 draw call) sobre su cama de
      tierra. Quietas a propósito: de noche nada se agita. ── */
const FILAS = 4;
const POR_FILA = 12;
function CultivosDormidos() {
  const ref = useRef(null);
  useEffect(() => {
    const malla = ref.current;
    if (!malla) return;
    const rng = crearRng(31);
    const dummy = new THREE.Object3D();
    let i = 0;
    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < POR_FILA; c++) {
        dummy.position.set(
          -2.1 + c * 0.42 + (rng() - 0.5) * 0.08,
          0.15,
          -0.2 + f * 0.62 + (rng() - 0.5) * 0.08,
        );
        dummy.rotation.set(0, rng() * Math.PI, 0);
        dummy.scale.setScalar(0.75 + rng() * 0.5);
        dummy.updateMatrix();
        malla.setMatrixAt(i, dummy.matrix);
        i += 1;
      }
    }
    malla.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group position={[-2.5, 0, 2.4]}>
      <mesh position={[0, 0.02, 0.75]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.4, 3.1]} />
        <meshLambertMaterial color={P.tierra} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, FILAS * POR_FILA]}>
        <coneGeometry args={[0.15, 0.34, 6]} />
        <meshLambertMaterial color={P.mata} flatShading />
      </instancedMesh>
    </group>
  );
}

/* ── Angelita dormida en su flor, junto a la casa: la creature rubber-hose
      real del framework (pose reposo, ánimo descansa), anclada con Html.
      Las zetas suben en CSS; reduced-motion las apaga. ── */
function AngelitaDormida({ tier, reducedMotion }) {
  return (
    <group position={[1.95, 0, 3.0]}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.44, 5]} />
        <meshLambertMaterial color={P.mata} flatShading />
      </mesh>
      <mesh position={[0, 0.47, 0]}>
        <sphereGeometry args={[0.14, 8, 6]} />
        <meshLambertMaterial color={mezclar(PALETA.ambar, TINTE, 0.35)} flatShading />
      </mesh>
      <Html center position={[0, 0.78, 0]} distanceFactor={7.5} zIndexRange={[30, 10]} style={{ pointerEvents: 'none' }}>
        <div className="vnoche-abeja" aria-hidden="true">
          <AbejaAngelita
            size={54}
            pose="reposo"
            animo="descansa"
            energia={0.35}
            animated={!reducedMotion}
            tier={tier}
            title="Angelita dormida"
          />
          {!reducedMotion && (
            <span className="vnoche-zzz">
              <i>z</i>
              <i>z</i>
              <i>z</i>
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

/* El claro de luna sobre el pasto: una elipse de plata apenas insinuada. */
function ClaroDeLuna() {
  return (
    <mesh position={[0.3, 0.03, 1.8]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.7, 1.2, 1]}>
      <circleGeometry args={[4.6, 28]} />
      <meshBasicMaterial
        color={NOCHE.luz}
        transparent
        opacity={0.1}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/* La escena completa (grupo r3f interno; el default la monta en su Canvas). */
function EscenaNoche({ tier, reducedMotion }) {
  const perfil = perfilDeTier(tier);
  const geo = useMemo(
    () => construirTerreno(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  const estrellas = Math.round(
    (tier === 'alto' ? 280 : tier === 'medio' ? 170 : 80) * NOCHE.estrellas,
  );

  /* `color`/`fog` se adjuntan a la ESCENA: hijos directos, nunca en <group>. */
  return (
    <>
      <color attach="background" args={[NOCHE.fondo]} />
      {perfil.fog && <fog attach="fog" args={[NOCHE.niebla, NOCHE.nieblaCerca + 4, NOCHE.nieblaLejos]} />}
      <LucesNocturnas />
      <CieloEstrellado n={estrellas} reducedMotion={reducedMotion} />
      <LunaAndina />

      {/* el abrazo del páramo: dos crestas de silueta y las fincas vecinas */}
      <SiluetaLomas z={-22} base={3.9} amp={1.4} semilla={17} color="#0b1024" />
      <SiluetaLomas z={-14} base={2.3} amp={0.95} semilla={53} color="#0a0e20" />
      <FincasLejanas />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>
      <ClaroDeLuna />

      <CasaDormida reducedMotion={reducedMotion} />
      <CultivosDormidos />
      <AngelitaDormida tier={tier} reducedMotion={reducedMotion} />

      {/* el camino que va de la puerta hacia el borde del valle */}
      <mesh position={[0.8, 0.025, 3.4]} rotation={[-Math.PI / 2, 0, -0.08]}>
        <planeGeometry args={[0.85, 5.8]} />
        <meshLambertMaterial color={P.camino} />
      </mesh>
      <CercaDelCamino />

      {/* monte disperso en las faldas (alturas del mismo heightfield) */}
      <Arbol pos={[-7.5, alturaValle(-7.5, -3.5), -3.5]} esc={1.25} />
      <Arbol pos={[6.8, alturaValle(6.8, -4.2), -4.2]} esc={1.1} />
      <Arbol pos={[8.4, alturaValle(8.4, 3.2), 3.2]} esc={0.9} />
      <Arbol pos={[-8.8, alturaValle(-8.8, 2.4), 2.4]} esc={1.05} />
      <Arbol pos={[-4.9, alturaValle(-4.9, -7.5), -7.5]} esc={1.35} />
      {/* monte cercano: los que sí entran al encuadre de retrato */}
      <Arbol pos={[-2.3, alturaValle(-2.3, -1.6), -1.6]} esc={1.15} />
      <Arbol pos={[3.1, alturaValle(3.1, -0.9), -0.9]} esc={0.9} />
      <Arbol pos={[-1.7, alturaValle(-1.7, 4.2), 4.2]} esc={0.75} />

      {/* las luciérnagas del framework, velando surcos y potrero */}
      <ParticulasAmbientales
        tipo="luciernagas"
        tier={tier}
        reducedMotion={reducedMotion}
        position={[-3.5, 0.15, 1.5]}
        semilla={11}
      />
      <ParticulasAmbientales
        tipo="luciernagas"
        densidad={0.7}
        tier={tier}
        reducedMotion={reducedMotion}
        position={[3.5, 0.1, -3]}
        semilla={23}
      />
      {/* tercer enjambre en primer plano: profundidad de campo de a de veras */}
      <ParticulasAmbientales
        tipo="luciernagas"
        densidad={0.8}
        tier={tier}
        reducedMotion={reducedMotion}
        position={[0.4, 0.2, 4.4]}
        semilla={7}
      />
    </>
  );
}

/* ── Grillos 0 KB: coro sintetizado con WebAudio. Cada grillo es un tren de
      pulsos cortos de seno (~4 kHz) con su propio compás; el planificador va
      250 ms por delante del reloj de audio. Devuelve el apagador. ── */
function crearCoroGrillos(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0.045; // fondo, nunca protagonista
  master.connect(ctx.destination);
  const grillos = [
    { f: 4200, pulsos: 4, gap: [0.45, 0.85], t: ctx.currentTime + 0.15 },
    { f: 3700, pulsos: 3, gap: [0.6, 1.15], t: ctx.currentTime + 0.4 },
    { f: 4600, pulsos: 5, gap: [0.9, 1.6], t: ctx.currentTime + 0.7 },
  ];
  const timer = setInterval(() => {
    const horizonte = ctx.currentTime + 0.6;
    for (const g of grillos) {
      while (g.t < horizonte) {
        for (let i = 0; i < g.pulsos; i++) {
          const t0 = g.t + i * 0.062;
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = g.f;
          const gan = ctx.createGain();
          gan.gain.setValueAtTime(0, t0);
          gan.gain.linearRampToValueAtTime(1, t0 + 0.012);
          gan.gain.exponentialRampToValueAtTime(0.001, t0 + 0.05);
          osc.connect(gan).connect(master);
          osc.start(t0);
          osc.stop(t0 + 0.06);
        }
        g.t += g.gap[0] + Math.random() * (g.gap[1] - g.gap[0]);
      }
    }
  }, 250);
  return () => {
    clearInterval(timer);
    master.disconnect();
  };
}

/* Estilos de ESTA escena (chrome DOM + zetas de Angelita). */
const CSS_NOCHE = `
.vnoche-root { position: relative; width: 100%; height: 100dvh; min-height: 320px; overflow: hidden; background: ${NOCHE.fondo}; }
.vnoche-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.vnoche-canvas--lista { opacity: 1; }
.vnoche-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.vnoche-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #e8ebf6; text-shadow: 0 1px 6px rgba(5,7,15,0.8); font: 700 1.15rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.vnoche-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.75; margin-top: 0.15rem; }
.vnoche-pie { padding: 0 1rem 0.9rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem; }
.vnoche-carta { margin: 0; max-width: 30rem; text-align: center; padding: 0.45rem 0.9rem; border-radius: 0.7rem; background: rgba(9,12,26,0.55); backdrop-filter: blur(3px); color: #dfe4f2; font: 500 0.78rem/1.45 system-ui, sans-serif; }
.vnoche-grillos { pointer-events: auto; appearance: none; border: 1px solid rgba(223,230,255,0.35); border-radius: 999px; padding: 0.42rem 0.95rem; background: rgba(9,12,26,0.6); color: #ffe9b8; font: 600 0.78rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.vnoche-grillos:hover, .vnoche-grillos:focus-visible { background: rgba(20,26,50,0.75); border-color: rgba(255,233,184,0.55); outline: none; }
.vnoche-grillos[aria-pressed='true'] { border-color: rgba(255,217,143,0.8); color: #ffd98f; }
.vnoche-abeja { position: relative; display: inline-flex; }
.vnoche-zzz { position: absolute; top: -0.55rem; right: -0.7rem; display: flex; flex-direction: column; align-items: flex-start; pointer-events: none; }
.vnoche-zzz i { font: 700 italic 0.62rem/1 Georgia, serif; color: #cfd9f5; text-shadow: 0 1px 3px rgba(5,7,15,0.7); opacity: 0; animation: vnoche-sube 3.6s ease-in-out infinite; }
.vnoche-zzz i:nth-child(2) { font-size: 0.5rem; margin-left: 0.5rem; animation-delay: 1.2s; }
.vnoche-zzz i:nth-child(3) { font-size: 0.4rem; margin-left: 0.95rem; animation-delay: 2.4s; }
@keyframes vnoche-sube { 0% { opacity: 0; transform: translateY(0.2rem); } 25% { opacity: 0.9; } 100% { opacity: 0; transform: translateY(-0.7rem); } }
@media (prefers-reduced-motion: reduce) { .vnoche-canvas { transition: none; } .vnoche-zzz i { animation: none; opacity: 0.6; } }
`;

/**
 * ValleNoche3D — el valle de noche, montable con su propio `<Canvas>`.
 * Sin lógica de negocio: es una vitrina (#/mockups/valle-noche-3d). El tier y
 * reduced-motion se detectan aquí (mockup standalone), igual que sus pares.
 */
export default function ValleNoche3D() {
  const [listo, setListo] = useState(false);
  const [grillos, setGrillos] = useState(false);
  const tier = useMemo(() => decidirTier().tier, []);
  /* Retrato (teléfono en vertical): el fov angosto del retrato partía la casa
     contra el borde derecho y dejaba el cuadro casi vacío. La casa ahora vive
     cerca del eje, la cámara mira ligeramente a la derecha (target x=0.7) y el
     fov abre a 52°: casa completa con su ventana, camino con cerca, surcos y
     luciérnagas en el tercio bajo; luna y lomas del páramo arriba. */
  const retrato = useMemo(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-aspect-ratio: 19/20)').matches,
    [],
  );
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const perfil = perfilDeTier(tier);

  /* El coro de grillos vive mientras el botón esté activo; al silenciar o
     desmontar se apaga el planificador y se cierra el AudioContext. */
  useEffect(() => {
    if (!grillos || typeof window === 'undefined') return undefined;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return undefined;
    const ctx = new Ctor();
    const apagar = crearCoroGrillos(ctx);
    return () => {
      apagar();
      ctx.close().catch(() => {});
    };
  }, [grillos]);

  return (
    <section
      className="vnoche-root"
      data-tier={tier}
      aria-label="El valle de noche: la finca descansa bajo la luna y las luciérnagas"
    >
      <style>{CSS_NOCHE}</style>
      <Canvas
        className={`vnoche-canvas${listo ? ' vnoche-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={retrato ? { position: [0.7, 3.1, 11.2], fov: 52 } : { position: [0, 4.6, 13.5], fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <EscenaNoche tier={tier} reducedMotion={reducedMotion} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={7}
          maxDistance={19}
          target={retrato ? [0.7, 1.15, 0] : [0, 1.1, 0]}
          minPolarAngle={0.55}
          maxPolarAngle={1.42}
          minAzimuthAngle={-1.0}
          maxAzimuthAngle={1.0}
          enableDamping
          dampingFactor={0.08}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.1}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      <div className="vnoche-chrome">
        <h2 className="vnoche-titulo">
          El valle de noche
          <small>La finca descansa bajo el cielo del páramo</small>
        </h2>
        <div className="vnoche-pie">
          <button
            type="button"
            className="vnoche-grillos"
            aria-pressed={grillos}
            onClick={() => setGrillos((v) => !v)}
          >
            {grillos ? 'Silenciar los grillos' : 'Escuchar los grillos'}
          </button>
          <p className="vnoche-carta" role="status">
            La finca duerme y las luciérnagas velan. Descanse tranquilo: mañana
            el rocío hace su parte.
          </p>
        </div>
      </div>
    </section>
  );
}
