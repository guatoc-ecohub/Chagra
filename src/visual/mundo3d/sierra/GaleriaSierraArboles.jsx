/*
 * GaleriaSierraArboles — la VISTA GLOBAL de la Sierra como GALERÍA DE MUNDOS por
 * piso térmico. Uno se aleja del valle y ve la cordillera andina escalonada; cada
 * franja de altitud muestra su mundo como un DIORAMA anclado en su ÁRBOL MAYOR
 * —el hito del piso—: la queñua arriba en el páramo, el roble en el frío, el
 * guayacán en el templado, la ceiba abajo en el cálido. Desde cada árbol se
 * entra a su mundo.
 *
 * ── LO QUE APORTA (sobre VistaGlobalSierra, que es el establishing del macizo) ──
 *   1. El ÁRBOL MAYOR por piso como ancla de navegación (ArbolMayor.jsx), cada
 *      uno con su VIÑETA de vida propia: palmas y costa junto a la ceiba, la
 *      alfombra dorada y los cafetos bajo el guayacán, el robledal de niebla,
 *      la laguna y los frailejones del páramo. Cada diorama invita a entrar.
 *   2. Un SLIDER CLIMÁTICO hoy→2050 que muestra el CORRIMIENTO de los pisos: con
 *      el calentamiento las bandas suben, el páramo se contrae y la nieve
 *      retrocede. Los árboles MIGRAN cuesta arriba con su piso (animados, no a
 *      saltos). Sin alarmismo: "su área se reduce", no "se acaba".
 *   3. La LEYENDA vertical de pisos (DOM): un perfil de la montaña que respira
 *      con el slider — las mismas bandas del monte, legibles y clicables.
 *   4. Fauna de fondo REALISTA (los secundarios NO van rubber-hose): el cóndor
 *      andino planea en círculos lentos sobre la nieve, alas fijas.
 *
 * ── GEOGRAFÍA (DR sierra-geo-render) ────────────────────────────────────────────
 * La silueta inconfundible: PICOS GEMELOS nevados (Cristóbal Colón / Simón
 * Bolívar, 5 775 m ambos, IGAC) con su silla alta, y el macizo que se levanta
 * DIRECTO del mar Caribe — es la montaña litoral más alta del mundo, y por eso
 * el mar toca el pie del diorama. La roca asoma donde la ladera es empinada;
 * la nieve queda en lo llano de las cumbres (mezcla por pendiente, sin texturas).
 *
 * ── ORIENTACIÓN (fix de cámara) ─────────────────────────────────────────────────
 * El monte se modela subiendo hacia +z (la ladera-galería mira a −z); ANTES la
 * cámara del <Canvas> quedaba en +z: tres de los cuatro árboles mayores quedaban
 * OCLUIDOS tras el propio macizo (verificado por línea de vista). El diorama
 * ahora se envuelve en un giro π sobre Y, de modo que la galería mira a +z,
 * donde vive la cámara por defecto — y cualquier consumidor del named export
 * la ve de frente sin acrobacias de azimuth.
 *
 * ── RESPETO (regla no negociable) ──────────────────────────────────────────────
 * La Sierra Nevada es territorio sagrado y habitado (Kogui, Arhuaco/Iku, Wiwa,
 * Kankuamo — el Corazón del Mundo, dentro de la Línea Negra). Se acredita SIEMPRE,
 * con sobriedad; cero iconografía ceremonial. Los árboles son emblemas ecológicos
 * del piso, no adorno.
 *
 * ── RENDIMIENTO (gama baja + offline) ───────────────────────────────────────────
 * Monte 100% procedural (heightmap determinista, cero DEM/GLTF/HDR remoto). Un
 * material Lambert con colores por vértice (banding por altitud + roca por
 * pendiente, calculados UNA vez por paso de clima, no por frame). Presupuesto
 * por `tier` (perfilDeTier): las viñetas densas solo en 'alto'; 'medio' guarda
 * la alfombra del guayacán y la laguna; 'bajo' deja el claro y el hito.
 * `reducedMotion` congela cóndor, niebla, mecido, deriva de cámara y migración.
 *
 * ── EXPORTS ─────────────────────────────────────────────────────────────────────
 *   default GaleriaSierraArboles — escena con su <Canvas> + slider + leyenda + crédito.
 *   named   SierraArbolesDiorama — grupo r3f puro para componer en otro <Canvas>.
 *
 * Montar SOLO dentro de un <Canvas> (el named); el default trae el suyo.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { ATMOSFERA } from '../atmosferaMadre.js';
import { perfilDeTier } from '../deviceTier.js';
import { PISOS_TERMICOS } from '../pisosTermicos.js';
import ArbolMayor from './ArbolMayor.jsx';
import { arbolDePiso, frailejonar, FRAILEJON } from './arbolesMayores.js';

/* ── Geometría del monte (coords propias del macizo). X=E-O, Y=altura, Z=pie(−9)
      →cumbre(+1.6). La ladera-galería mira a −z; el diorama entero se gira π en
      Y al montarse, así la galería queda de frente a la cámara (+z). ── */
const CIMA = 6.2; // altura nominal del macizo en unidades de mundo
const ANCHO = 24; // extensión E-O
const Z_FRENTE = -9; // pie de la ladera (el mar empieza aquí)
const Z_CUMBRE = 1.6; // latitud de las cumbres

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function gauss(wx, wz, cx, cz, sx, sz) {
  const dx = wx - cx, dz = wz - cz;
  return Math.exp(-((dx * dx) / (2 * sx * sx) + (dz * dz) / (2 * sz * sz)));
}
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.6 - wz * 1.2 + 2.1) * 0.28 +
    Math.sin(wx * 2.7 + wz * 2.1 + 4.7) * 0.16
  );
}
/* Altura del monte: rampa mar→cumbre + PICOS GEMELOS (Colón/Bolívar) unidos por
   un hombro, dos estribaciones, crestas de ruido y desvanecido a los flancos.
   La silla entre picos queda a ~0.95·CIMA: nevada, pero con el filo legible. */
function alturaMonte(wx, wz) {
  const s = clamp((wz - Z_FRENTE) / (Z_CUMBRE - Z_FRENTE), 0, 1);
  let h = Math.pow(s, 1.15) * CIMA * 0.5;
  h += gauss(wx, wz, -2.4, 0.75, 1.6, 2.4) * CIMA * 0.46; // pico occidental
  h += gauss(wx, wz, 2.5, 1.0, 1.55, 2.5) * CIMA * 0.44; // pico oriental
  h += gauss(wx, wz, 0, 0.6, 3.6, 3.2) * CIMA * 0.14; // hombro que une el macizo
  h += gauss(wx, wz, -7, -1.2, 3.2, 3.0) * CIMA * 0.24; // estribo occidental
  h += gauss(wx, wz, 7, -1.0, 3.2, 3.0) * CIMA * 0.22; // estribo oriental
  h += ruido(wx, wz) * CIMA * 0.05 * s;
  h *= smoothstep(ANCHO / 2, ANCHO / 2 - 3, Math.abs(wx)); // faldas a los lados
  return Math.max(0, h);
}
/* El primer z (desde el mar) donde la ladera alcanza una altura dada, a una X
   fija. Para colgar la niebla del bosque de niebla EN su franja. */
function frenteDeAltura(wx, yObj) {
  for (let z = Z_FRENTE + 0.3; z <= Z_CUMBRE; z += 0.06) {
    if (alturaMonte(wx, z) >= yObj) return z;
  }
  return Z_CUMBRE;
}
/* Pendiente frontal (dh/dz) en un punto: para acostar los claros sobre la ladera. */
function pendienteEn(wx, wz) {
  return (alturaMonte(wx, wz + 0.35) - alturaMonte(wx, wz - 0.35)) / 0.7;
}

/* ── Pisos térmicos como BANDAS de color por fracción de altura (0..1). El orden
      es de abajo (cálido) a arriba (nival). Con el clima, los umbrales SUBEN. ── */
const BANDAS = [
  { id: 'calido', top: 0.16, c: new THREE.Color('#98ab4b'), factor: 1.0 },
  { id: 'templado', top: 0.34, c: new THREE.Color('#63a447'), factor: 1.05 },
  { id: 'frio', top: 0.52, c: new THREE.Color('#3f7358'), factor: 1.5 }, // sube rápido → aprieta el páramo
  { id: 'paramo', top: 0.7, c: new THREE.Color('#a5975c'), factor: 0.9 },
  { id: 'superparamo', top: 0.84, c: new THREE.Color('#83836f'), factor: 0.7 },
  { id: 'nival', top: Infinity, c: new THREE.Color('#e9eef2'), factor: 0.0 },
];
const NIEVE = new THREE.Color('#f4f7fb');
const ROCA = new THREE.Color('#6f6357'); // el risco que asoma donde es empinado
const SNOWLINE_BASE = 0.8;
const SUBIDA_MAX = 0.14; // en 2050 los pisos trepan ~14% del monte

/* El umbral superior de una banda, desplazado por el clima `d` (0=hoy, 1=2050). */
function topDesplazado(banda, d) {
  if (!Number.isFinite(banda.top)) return Infinity;
  return clamp(banda.top + d * SUBIDA_MAX * banda.factor, 0, 0.97);
}
/* Color del monte en una fracción de altura `yf`, según el clima `d`. */
function colorMonte(yf, d, out) {
  const snow = clamp(SNOWLINE_BASE + d * SUBIDA_MAX * 1.1, 0, 0.95);
  if (yf >= snow) {
    const t = smoothstep(snow - 0.03, snow + 0.03, yf);
    return out.lerpColors(BANDAS[4].c, NIEVE, t);
  }
  let i = 0;
  while (i < BANDAS.length - 1 && yf > topDesplazado(BANDAS[i], d)) i++;
  if (i === 0) return out.copy(BANDAS[0].c);
  const borde = topDesplazado(BANDAS[i - 1], d);
  const t = smoothstep(borde - 0.05, borde + 0.05, yf);
  return out.lerpColors(BANDAS[i - 1].c, BANDAS[i].c, t);
}

/* Fracción de altura del centro de cada banda (para posar su árbol mayor). Sube
   con el clima igual que los umbrales de la banda. */
const CENTROS = {
  calido: { base: 0.09, factor: 1.0, x: -6.5 },
  templado: { base: 0.26, factor: 1.05, x: -2.4 },
  frio: { base: 0.44, factor: 1.2, x: 2.4 },
  paramo: { base: 0.61, factor: 1.0, x: 6.4 },
};
/* Punto de la LADERA FRONTAL donde una fracción de altura se posa, a una X dada.
   Busca en el frente (z creciente) el z cuya altura iguala el objetivo. */
function anclaLadera(wx, fraccion, d, factor) {
  const yObj = clamp(fraccion + d * SUBIDA_MAX * factor, 0, 0.92) * CIMA;
  let mejorZ = Z_FRENTE + 0.5, mejor = 1e9;
  for (let z = Z_FRENTE + 0.4; z <= Z_CUMBRE + 0.5; z += 0.12) {
    const dd = Math.abs(alturaMonte(wx, z) - yObj);
    if (dd < mejor) { mejor = dd; mejorZ = z; }
  }
  return [wx, alturaMonte(wx, mejorZ), mejorZ];
}

/* ── Terreno: geometría fija; el color se recalcula al mover el clima. Además
      del banding por altura, la ROCA asoma por PENDIENTE (normal.y baja =
      risco): las caras empinadas de los picos quedan de piedra y la nieve se
      recuesta en lo llano — la técnica clásica de snow-caps, sin texturas. ── */
function useMonte(segmentos, plano, d) {
  const geo = useMemo(() => {
    const nx = segmentos + 1;
    const nz = segmentos + 1;
    const pos = new Float32Array(nx * nz * 3);
    const col = new Float32Array(nx * nz * 3);
    let p = 0;
    for (let iz = 0; iz < nz; iz++) {
      const wz = Z_FRENTE + ((Z_CUMBRE + 3 - Z_FRENTE) * iz) / segmentos;
      for (let ix = 0; ix < nx; ix++) {
        const wx = -ANCHO / 2 + (ANCHO * ix) / segmentos;
        const y = alturaMonte(wx, wz);
        pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
        p += 3;
      }
    }
    const idx = [];
    for (let iz = 0; iz < segmentos; iz++) {
      for (let ix = 0; ix < segmentos; ix++) {
        const a = iz * nx + ix, b = a + 1, c = a + nx, e = c + 1;
        idx.push(a, c, b, b, c, e);
      }
    }
    let g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    if (plano) g = g.toNonIndexed();
    g.computeVertexNormals();
    return g;
  }, [segmentos, plano]);

  // Recoloreo por clima: solo cuando `d` cambia de paso (no por frame).
  useEffect(() => {
    const posAttr = geo.getAttribute('position');
    const norAttr = geo.getAttribute('normal');
    const colAttr = geo.getAttribute('color');
    const c = new THREE.Color();
    for (let i = 0; i < posAttr.count; i++) {
      const yf = posAttr.getY(i) / CIMA;
      colorMonte(yf, d, c);
      // roca por pendiente: solo pesa en la mitad alta (los riscos de cumbre);
      // abajo la vegetación cubre la ladera aunque empine
      const llano = smoothstep(0.45, 0.75, norAttr.getY(i));
      const pesoRoca = (1 - llano) * smoothstep(0.35, 0.6, yf);
      if (pesoRoca > 0) c.lerp(ROCA, pesoRoca * 0.85);
      colAttr.setXYZ(i, c.r, c.g, c.b);
    }
    colAttr.needsUpdate = true;
  }, [geo, d]);

  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

/* ── El cielo de la hora dorada: domo BackSide con degradado por vértice
      (horizonte encendido → cenit más hondo). Cero texturas; fog apagado en el
      material para que el degradado mande. ── */
function CieloGradiente() {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(58, 24, 12);
    const pos = g.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const horizonte = new THREE.Color('#ffe6ba');
    const cenit = new THREE.Color('#e5b98c');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = Math.pow(clamp(pos.getY(i) / 58, 0, 1), 0.6);
      c.lerpColors(horizonte, cenit, t);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
}

/* El sol bajo, asomado entre las cordilleras del fondo: disco + halo doble. */
function SolDorado() {
  return (
    <group position={[-12.5, 6.6, 9.2]}>
      <mesh>
        <circleGeometry args={[1.35, 32]} />
        <meshBasicMaterial color="#fff4d4" transparent opacity={0.98} depthWrite={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[2.7, 32]} />
        <meshBasicMaterial color="#ffdd96" transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[4.6, 32]} />
        <meshBasicMaterial color="#ffce7d" transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
    </group>
  );
}

/* Cordillera de fondo: crestas hazy en gris CÁLIDO (nunca azul frío: regla de
   atmosferaMadre) que escalonan la profundidad tras el macizo. */
function CordilleraFondo() {
  return (
    <group>
      {[
        { x: -8.5, z: 4.8, s: [11, 3.6, 5], c: '#c9b593' },
        { x: 6.5, z: 6, s: [13, 4.4, 5], c: '#d3c1a0' },
        { x: -1, z: 8.5, s: [17, 5.6, 6], c: '#ddccab' },
        { x: 10, z: 10, s: [14, 4.8, 6], c: '#e3d4b4' },
      ].map((r, i) => (
        <mesh key={i} position={/** @type {[number, number, number]} */ ([r.x, 0, r.z])} scale={/** @type {[number, number, number]} */ (r.s)}>
          <sphereGeometry args={[1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshLambertMaterial color={r.c} />
        </mesh>
      ))}
    </group>
  );
}

/* ── El mar Caribe al pie: la Sierra es la montaña litoral más alta del mundo,
      y ese contraste ES su silueta. Lámina de agua con degradado por vértice
      (honda cerca del ojo → verde claro en la orilla), línea de espuma y una
      franja de playa que la vegetación va tapando ladera arriba. Estático:
      cero costo por frame. ── */
function MarCaribe() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(60, 16, 1, 4);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -17.2); // z −25.2 (mar adentro) … −9.2 (orilla)
    const pos = g.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const hondo = new THREE.Color('#5d8d97');
    const orilla = new THREE.Color('#a8cbb4');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = clamp((pos.getZ(i) + 25.2) / 16, 0, 1);
      c.lerpColors(hondo, orilla, t * t);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group>
      <mesh geometry={geo} position={[0, 0.005, 0]}>
        <meshBasicMaterial vertexColors />
      </mesh>
      {/* la línea de espuma donde el mar toca la Sierra */}
      <mesh position={[0, 0.02, -9.28]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[58, 0.18]} />
        <meshBasicMaterial color="#fdf7e8" transparent opacity={0.75} depthWrite={false} />
      </mesh>
      {/* la playa, que la vegetación cubre apenas arranca la ladera */}
      <mesh position={[0, 0.045, -8.95]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[58, 0.9]} />
        <meshLambertMaterial color="#e6d2a0" />
      </mesh>
    </group>
  );
}

/* ── La niebla que se ENGANCHA en el bosque de niebla (franja del piso frío):
      penachos suaves que derivan despacio pegados a la ladera. Es la firma
      climática del piso — y da escala (DR sierra-geo-render §B.2). ── */
function NieblaBosque({ cuantos, reducedMotion }) {
  const grupo = useRef(null);
  const puffs = useMemo(() => {
    const xs = [-6.2, -3.4, -0.4, 2.8, 5.6];
    return xs.slice(0, cuantos).map((x, i) => {
      const yObj = 2.35 + (i % 3) * 0.28;
      const z = frenteDeAltura(x, yObj) - 0.65;
      return { x, y: yObj + 0.18, z, e: 0.85 + (i % 3) * 0.22 };
    });
  }, [cuantos]);
  useFrame((st) => {
    if (reducedMotion || !grupo.current) return;
    const t = st.clock.elapsedTime;
    grupo.current.children.forEach((ch, i) => {
      ch.position.x = puffs[i].x + Math.sin(t * 0.05 + i * 2.1) * 0.7;
    });
  });
  return (
    <group ref={grupo}>
      {puffs.map((p, i) => (
        <group key={i} position={[p.x, p.y, p.z]}>
          <mesh scale={[p.e * 1.7, p.e * 0.5, p.e * 0.9]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#fbf3df" transparent opacity={0.4} depthWrite={false} />
          </mesh>
          <mesh position={[p.e * 1.2, -p.e * 0.06, 0.2]} scale={[p.e * 0.9, p.e * 0.34, p.e * 0.6]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#fbf3df" transparent opacity={0.28} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── El cóndor andino: fauna de fondo REALISTA (no rubber-hose). Cuerpo negro,
      gorguera blanca, parches blancos en el dorso del ala, cabeza desnuda rojiza.
      Planea en círculos LENTOS sobre la nieve, alas casi fijas en leve diedro y
      primarias abiertas como dedos. `reducedMotion` lo deja quieto en planeo. ── */
function CondorAndino({ radio = 6, altura = 7.2, fase = 0, reducedMotion, escala = 1 }) {
  const orbita = useRef(null);
  const cuerpo = useRef(null);
  useFrame((st) => {
    if (reducedMotion) return;
    const t = st.clock.elapsedTime;
    if (orbita.current) orbita.current.rotation.y = fase + t * 0.11; // giro amplio y lento
    if (cuerpo.current) cuerpo.current.position.y = Math.sin(t * 0.35 + fase) * 0.25; // planeo que respira
  });
  const negro = '#1c1a1e';
  const blanco = '#efece4';
  return (
    <group ref={orbita} position={[0, altura, -0.5]} rotation={[0, fase, 0]}>
      {/* el cóndor, en el borde del círculo, mirando la tangente (+Z), banqueado
          hacia adentro del giro (roll fijo, como un planeador realista) */}
      <group ref={cuerpo} position={[radio, 0, 0]} rotation={[0, 0, -0.22]} scale={escala}>
        {/* cuerpo alargado */}
        <mesh scale={[0.16, 0.16, 0.5]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshLambertMaterial color={negro} />
        </mesh>
        {/* gorguera blanca en la base del cuello */}
        <mesh position={[0, 0.03, 0.34]} scale={[0.17, 0.12, 0.12]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshLambertMaterial color={blanco} />
        </mesh>
        {/* cabeza desnuda rojiza */}
        <mesh position={[0, 0.05, 0.5]} scale={[0.09, 0.09, 0.12]}>
          <sphereGeometry args={[1, 7, 6]} />
          <meshLambertMaterial color="#a9663f" />
        </mesh>
        {/* alas: dos planos anchos barridos, en leve diedro; parche blanco arriba
            y tres "dedos" (primarias) en la punta */}
        {[-1, 1].map((lado) => (
          <group key={lado} rotation={[0, 0, lado * 0.14]}>
            <mesh position={[lado * 0.62, 0.01, -0.02]} rotation={[0, lado * -0.28, 0]}>
              <boxGeometry args={[1.15, 0.03, 0.42]} />
              <meshLambertMaterial color={negro} />
            </mesh>
            {/* parche blanco del dorso del ala */}
            <mesh position={[lado * 0.5, 0.03, -0.02]} rotation={[0, lado * -0.28, 0]}>
              <boxGeometry args={[0.7, 0.02, 0.2]} />
              <meshLambertMaterial color={blanco} />
            </mesh>
            {/* primarias abiertas: dedos en la punta del ala */}
            {[0, 1, 2].map((k) => (
              <mesh
                key={k}
                position={[lado * (1.12 + k * 0.06), 0.01, -0.14 + k * 0.1]}
                rotation={[0, lado * -0.28, lado * (0.1 + k * 0.05)]}
              >
                <boxGeometry args={[0.22, 0.02, 0.06]} />
                <meshLambertMaterial color={negro} />
              </mesh>
            ))}
          </group>
        ))}
        {/* cola corta en cuña */}
        <mesh position={[0, 0, -0.42]} scale={[0.14, 0.02, 0.2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshLambertMaterial color={negro} />
        </mesh>
      </group>
    </group>
  );
}

/* Los frailejones del páramo, alrededor de la queñua: tronco columnar + roseta
   lanuda plateada + flor amarilla. Baratos, instanciados a mano (~pocos). */
function Frailejones({ centro, cuantos }) {
  const items = useMemo(() => {
    const base = frailejonar(cuantos, 2.2, 7);
    return base.map((f) => {
      const wx = centro[0] + f.pos[0];
      const wz = centro[2] + f.pos[2];
      return { ...f, world: [wx, alturaMonte(wx, wz), wz] };
    });
  }, [centro, cuantos]);
  return (
    <group>
      {items.map((f, i) => (
        <group key={i} position={/** @type {[number, number, number]} */ (f.world)} rotation={[0, f.giro, 0]}>
          <mesh position={[0, f.alto / 2, 0]}>
            <cylinderGeometry args={[0.05, 0.07, f.alto, 6]} />
            <meshLambertMaterial color={FRAILEJON.tronco} flatShading />
          </mesh>
          <mesh position={[0, f.alto, 0]}>
            <sphereGeometry args={[0.13, 7, 5]} />
            <meshLambertMaterial color={FRAILEJON.roseta} flatShading />
          </mesh>
          <mesh position={[0, f.alto + 0.09, 0]}>
            <sphereGeometry args={[0.045, 6, 5]} />
            <meshLambertMaterial color={FRAILEJON.flor} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Una palma costera low-poly: tronco fino ladeado + corona de hojas caídas.
   Acompaña a la ceiba en el piso cálido (el mar está a un paso). */
function Palma({ alto = 0.9, giro = 0 }) {
  return (
    <group rotation={[0, giro, 0.09]}>
      <mesh position={[alto * 0.06, alto / 2, 0]} rotation={[0, 0, 0.12]}>
        <cylinderGeometry args={[0.032, 0.052, alto, 5]} />
        <meshLambertMaterial color="#9a7c52" />
      </mesh>
      <group position={[alto * 0.13, alto, 0]}>
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <group key={k} rotation={[0, (k / 6) * Math.PI * 2 + 0.4, 0]}>
            <mesh position={[0.21, 0.04, 0]} rotation={[0, 0, -0.55]}>
              <boxGeometry args={[0.44, 0.018, 0.1]} />
              <meshLambertMaterial color="#5f9447" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/* Color del "claro" (el respiro de suelo donde se posa cada árbol mayor). */
const CLARO_PISO = {
  calido: '#bcb96e',
  templado: '#95b167',
  frio: '#6f9a70',
  paramo: '#b5a874',
};

/* ── La VIÑETA de cada piso: lo que vuelve al hito un LUGAR. Un claro acostado
      sobre la pendiente + la vida firma del piso. Vive DENTRO del grupo del
      árbol (migra con él cuando el clima lo empuja cuesta arriba).
      Presupuesto: 'alto' todo; 'medio' claro + alfombra + laguna; 'bajo' claro. ── */
function VinetaPiso({ pisoId, ancla, def, tier, reducedMotion }) {
  const rica = tier === 'alto';
  const media = rica || tier === 'medio';
  const flat = tier === 'alto';

  /* offsets relativos al ancla, con la Y muestreada del monte (el compañero se
     posa en SU punto de la ladera, no flota a la altura del héroe) */
  const rel = (ox, oz) => /** @type {[number, number, number]} */ ([ox, alturaMonte(ancla[0] + ox, ancla[2] + oz) - ancla[1], oz]);
  const tilt = -Math.PI / 2 - Math.atan(pendienteEn(ancla[0], ancla[2]));
  const claroR = def.alto * 0.85;

  return (
    <group>
      {/* el claro: un respiro de suelo propio, acostado sobre la ladera */}
      <mesh position={[0, 0.05, 0]} rotation={[tilt, 0, 0]}>
        <circleGeometry args={[claroR, 22]} />
        <meshBasicMaterial
          color={CLARO_PISO[pisoId] || '#a9a06a'}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>

      {/* CÁLIDO: palmas costeras junto a la ceiba */}
      {pisoId === 'calido' && rica && (
        <>
          <group position={rel(-1.15, 0.5)}>
            <Palma alto={0.95} giro={0.7} />
          </group>
          <group position={rel(1.3, -0.35)}>
            <Palma alto={0.75} giro={2.4} />
          </group>
        </>
      )}

      {/* TEMPLADO: la ALFOMBRA DORADA del guayacán (florece pelado y suelta su
          flor al suelo: es su firma) + cafetos con su grano rojo */}
      {pisoId === 'templado' && media && (
        <mesh position={[0, 0.075, 0]} rotation={[tilt, 0, 0]}>
          <circleGeometry args={[def.alto * 0.6, 20]} />
          <meshBasicMaterial color="#eec045" transparent opacity={0.78} depthWrite={false} />
        </mesh>
      )}
      {pisoId === 'templado' && rica &&
        [[-1.25, 0.45], [-0.95, -0.5], [1.2, 0.35], [1.45, -0.4]].map(([ox, oz], i) => (
          <group key={i} position={rel(ox, oz)}>
            <mesh position={[0, 0.13, 0]}>
              <icosahedronGeometry args={[0.14, 0]} />
              <meshLambertMaterial color="#33532f" flatShading />
            </mesh>
            <mesh position={[0.09, 0.17, 0.05]}>
              <sphereGeometry args={[0.032, 6, 5]} />
              <meshLambertMaterial color="#b23a2c" />
            </mesh>
          </group>
        ))}

      {/* FRÍO: robledal (el roble nunca anda solo) + su jirón de niebla propio */}
      {pisoId === 'frio' && rica && (
        <>
          <group position={rel(-1.25, 0.55)}>
            <ArbolMayor tipo="roble" escala={0.42} semilla={7.3} blobs={4} flat={flat} reducedMotion={reducedMotion} />
          </group>
          <group position={rel(1.2, -0.4)}>
            <ArbolMayor tipo="roble" escala={0.3} semilla={4.6} blobs={3} flat={flat} reducedMotion={reducedMotion} />
          </group>
          <mesh position={[0.4, def.alto * 0.55, 0.9]} scale={[1.5, 0.4, 0.7]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#fbf3df" transparent opacity={0.22} depthWrite={false} />
          </mesh>
        </>
      )}

      {/* PÁRAMO: la laguna glaciar (la fábrica de agua) + una queñua joven */}
      {pisoId === 'paramo' && media && (
        <group position={rel(-2.6, -0.9)} scale={[1.3, 1, 0.78]}>
          <mesh position={[0, 0.05, 0]} rotation={[tilt, 0, 0]}>
            <circleGeometry args={[0.62, 20]} />
            <meshBasicMaterial color="#6ba4ab" transparent opacity={0.92} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.045, 0]} rotation={[tilt, 0, 0]}>
            <ringGeometry args={[0.62, 0.74, 20]} />
            <meshBasicMaterial color="#cabf94" transparent opacity={0.6} depthWrite={false} />
          </mesh>
        </group>
      )}
      {pisoId === 'paramo' && rica && (
        <group position={rel(-1.2, 0.35)}>
          <ArbolMayor tipo="quenua" escala={0.52} semilla={9.1} blobs={3} flat={flat} reducedMotion={reducedMotion} />
        </group>
      )}
    </group>
  );
}

/* El árbol mayor de un piso con su viñeta, posado en su banda, con rótulo y
   HITBOX clicable (entra a su mundo). MIGRA animado cuesta arriba cuando el
   clima empuja su piso; al pasar el dedo/cursor, el diorama respira (escala
   sutil) y el rótulo abre su invitación. */
function HeroArbol({ pisoId, d, tier, reducedMotion, onEntrar, resaltado }) {
  const cfg = CENTROS[pisoId];
  const def = arbolDePiso(pisoId);
  const piso = PISOS_TERMICOS.find((p) => p.id === pisoId);
  const [viva, setViva] = useState(false);
  const nodo = useRef(null);
  const puesto = useRef(false);

  const ancla = useMemo(
    () => anclaLadera(cfg.x, cfg.base, d, cfg.factor),
    [cfg, d],
  );
  const objetivo = useMemo(() => new THREE.Vector3(ancla[0], ancla[1], ancla[2]), [ancla]);

  // primer posado inmediato (sin viaje desde el origen)
  useEffect(() => {
    if (nodo.current && !puesto.current) {
      nodo.current.position.copy(objetivo);
      puesto.current = true;
    }
  }, [objetivo]);

  // migración suave hacia el ancla nueva + respiración del hover
  useFrame((_, dt) => {
    const g = nodo.current;
    if (!g) return;
    const paso = Math.min(dt, 0.05);
    if (reducedMotion) g.position.copy(objetivo);
    else g.position.lerp(objetivo, 1 - Math.exp(-paso * 2.6));
    const sObj = viva ? 1.07 : 1;
    const s = g.scale.x + (sObj - g.scale.x) * (1 - Math.exp(-paso * 9));
    g.scale.setScalar(reducedMotion ? sObj : s);
  });

  if (!def || !piso) return null;
  const blobs = tier === 'alto' ? undefined : tier === 'medio' ? 4 : 3;
  const escala = tier === 'bajo' ? 0.85 : 1;
  return (
    <group
      ref={nodo}
      onClick={(e) => { e.stopPropagation(); onEntrar?.(pisoId); }}
      onPointerOver={(e) => { e.stopPropagation(); setViva(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setViva(false); document.body.style.cursor = ''; }}
    >
      {/* hitbox transparente (opacity 0, no `visible=false`: así SÍ recibe el
          raycast): facilita el toque del árbol en pantallas chicas */}
      <mesh position={[0, def.alto * 0.6, 0]}>
        <cylinderGeometry args={[def.alto * 0.7, def.alto * 0.7, def.alto * 1.4, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <ArbolMayor
        tipo={tipoDeArbol(pisoId)}
        escala={escala}
        reducedMotion={reducedMotion}
        semilla={pisoId.length + cfg.x}
        blobs={blobs}
        flat={tier === 'alto'}
      />
      <VinetaPiso pisoId={pisoId} ancla={ancla} def={def} tier={tier} reducedMotion={reducedMotion} />
      {/* anillo sutil de "aquí está su árbol mayor" cuando es el piso del usuario */}
      {resaltado && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[def.alto * 0.55, def.alto * 0.72, 28]} />
          <meshBasicMaterial color="#ffdf9c" transparent opacity={0.6} depthWrite={false} />
        </mesh>
      )}
      <Html
        center
        position={[0, def.alto * 1.28, 0]}
        distanceFactor={16}
        zIndexRange={[30, 10]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`gsierra-rotulo${viva ? ' gsierra-rotulo--viva' : ''}${resaltado ? ' gsierra-rotulo--suyo' : ''}`}
          aria-hidden="true"
        >
          <span className="gsierra-rotulo__piso">{piso.nombre}</span>
          <span className="gsierra-rotulo__arbol">{def.nombre}</span>
          <em className="gsierra-rotulo__cient">{def.cientifico}</em>
          <span className="gsierra-rotulo__rasgo">{def.rasgo}</span>
          <span className="gsierra-rotulo__entrar">Toque para entrar</span>
          {resaltado && <span className="gsierra-rotulo__mio">Su piso</span>}
        </div>
      </Html>
    </group>
  );
}

/* Mapa piso→arquetipo de árbol (la clave del catálogo arbolesMayores). */
function tipoDeArbol(pisoId) {
  return { paramo: 'quenua', frio: 'roble', templado: 'guayacan', calido: 'ceiba' }[pisoId] || 'roble';
}

/* Luces de la hora dorada: el sol rasante entra por la derecha-atrás (donde
   asoma el disco), el cielo dorado rellena de frente. Coherentes con el giro π
   del diorama: viven DENTRO del grupo girado. */
function LucesDoradas() {
  return (
    <>
      <hemisphereLight intensity={0.85} color={ATMOSFERA.cielo} groundColor={ATMOSFERA.suelo} />
      <ambientLight intensity={0.32} color="#fff1d6" />
      <directionalLight position={[-11, 8, 4]} intensity={1.3} color={ATMOSFERA.luz} />
      <directionalLight position={[9, 5, -7]} intensity={0.42} color={ATMOSFERA.relleno} />
    </>
  );
}

/**
 * SierraArbolesDiorama — el grupo r3f puro de la galería (para componer dentro de
 * un <Canvas> propio). Trae cielo, mar, monte de picos gemelos, cordillera de
 * fondo, sol, árboles mayores con sus viñetas, frailejones, niebla del bosque
 * de niebla y cóndores; luces y crédito por props. La galería queda mirando a
 * +z (la cámara por defecto de three la ve de frente).
 *
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier='alto']
 * @param {boolean} [props.reducedMotion=false]
 * @param {number}  [props.clima=0]        0=hoy … 1=2050 (corrimiento de pisos).
 * @param {string}  [props.pisoUsuario]    piso a resaltar (opcional).
 * @param {(pisoId:string)=>void} [props.onEntrarPiso]  navegar al mundo del piso.
 * @param {boolean} [props.luces=true]
 * @param {boolean} [props.atmosfera=true]
 */
export function SierraArbolesDiorama({
  tier = 'alto',
  reducedMotion = false,
  clima = 0,
  pisoUsuario,
  onEntrarPiso,
  luces = true,
  atmosfera = true,
}) {
  const perfil = perfilDeTier(tier);
  // el clima se cuantiza a pasos para no recolorear el monte en cada píxel del slider
  const d = Math.round(clamp(clima, 0, 1) * 20) / 20;
  const geo = useMonte(perfil.segmentosTerreno, perfil.flatShading, d);
  const condores = tier === 'alto' ? 2 : tier === 'medio' ? 1 : 0;
  const frailejones = tier === 'alto' ? 16 : tier === 'medio' ? 9 : 0;
  const nubes = tier === 'alto' ? 5 : tier === 'medio' ? 3 : 0;

  const anclaParamo = useMemo(
    () => anclaLadera(CENTROS.paramo.x, CENTROS.paramo.base, d, CENTROS.paramo.factor),
    [d],
  );

  return (
    <>
      {atmosfera && <color attach="background" args={[ATMOSFERA.fondo]} />}
      {atmosfera && perfil.fog && <fogExp2 attach="fog" args={[ATMOSFERA.niebla, 0.028]} />}
      {/* giro π: la ladera-galería (modelada mirando a −z) queda de frente a la
          cámara estándar (+z). Las luces giran con ella: el cuadro es EL MISMO
          que se compuso, solo que bien orientado. */}
      <group rotation={[0, Math.PI, 0]}>
        {luces && <LucesDoradas />}
        <CieloGradiente />
        <SolDorado />
        <CordilleraFondo />
        <MarCaribe />

        <mesh geometry={geo}>
          <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
        </mesh>

        {/* frailejonar del páramo, junto a la queñua */}
        {frailejones > 0 && <Frailejones centro={anclaParamo} cuantos={frailejones} />}

        {/* la niebla enganchada al bosque de niebla (piso frío) */}
        {nubes > 0 && <NieblaBosque cuantos={nubes} reducedMotion={reducedMotion} />}

        {/* el ÁRBOL MAYOR de cada piso, con su viñeta, resaltado y clicable */}
        {['calido', 'templado', 'frio', 'paramo'].map((pid) => (
          <HeroArbol
            key={pid}
            pisoId={pid}
            d={d}
            tier={tier}
            reducedMotion={reducedMotion}
            onEntrar={onEntrarPiso}
            resaltado={pisoUsuario === pid}
          />
        ))}

        {/* el cóndor andino, planeando sobre la nieve (fauna realista) */}
        {Array.from({ length: condores }).map((_, i) => (
          <CondorAndino
            key={i}
            radio={5.8 + i * 1.7}
            altura={7.2 + i * 0.6}
            fase={i * 2.3}
            reducedMotion={reducedMotion}
            escala={1 - i * 0.15}
          />
        ))}
      </group>
    </>
  );
}

/* ── Deriva de cámara: el establishing respira en ping-pong dentro de los topes
      de azimuth (autoRotate se pegaba a un límite y moría ahí). Se pausa cuando
      el usuario toma el control y retoma al soltar. `reducedMotion` la apaga. ── */
const EJE_Y = new THREE.Vector3(0, 1, 0);
function DerivaCamara({ controles, reducedMotion }) {
  const dir = useRef(1);
  const quieto = useRef(false);
  const enganchado = useRef(false);
  useEffect(() => () => {
    const c = controles.current;
    if (c && enganchado.current) {
      c.removeEventListener('start', c.__gsierraParar);
      c.removeEventListener('end', c.__gsierraSoltar);
    }
  }, [controles]);
  useFrame((_, dt) => {
    const c = controles.current;
    if (!c) return;
    if (!enganchado.current) {
      c.__gsierraParar = () => { quieto.current = true; };
      c.__gsierraSoltar = () => { quieto.current = false; };
      c.addEventListener('start', c.__gsierraParar);
      c.addEventListener('end', c.__gsierraSoltar);
      enganchado.current = true;
    }
    if (quieto.current || reducedMotion) return;
    const az = c.getAzimuthalAngle();
    if (az > 0.36) dir.current = -1;
    else if (az < -0.36) dir.current = 1;
    const paso = dir.current * Math.min(dt, 0.05) * 0.02;
    c.object.position.sub(c.target).applyAxisAngle(EJE_Y, paso).add(c.target);
  });
  return null;
}

/* Estilos de la galería (viven aquí: son de ESTA escena). Familia visual de
   VistaGlobalSierra: marfil cálido, rótulos redondeados, pie sobrio. */
const CSS = `
.gsierra-root { position: relative; width: 100%; height: 100dvh; min-height: 340px; overflow: hidden; background: ${ATMOSFERA.fondo}; }
.gsierra-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.7s ease; }
.gsierra-canvas--lista { opacity: 1; }
.gsierra-vineta { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(120% 105% at 50% 40%, transparent 58%, rgba(58,42,24,0.2) 100%); }
.gsierra-rotulo { display: flex; flex-direction: column; align-items: center; gap: 0.06rem; padding: 0.26rem 0.6rem 0.3rem; border-radius: 0.65rem; background: rgba(255,248,233,0.92); border: 1px solid rgba(181,118,58,0.25); box-shadow: 0 2px 8px rgba(60,42,24,0.22); white-space: nowrap; transition: box-shadow 0.25s ease, border-color 0.25s ease; }
.gsierra-rotulo--viva { border-color: rgba(181,118,58,0.7); box-shadow: 0 6px 18px rgba(60,42,24,0.3); }
.gsierra-rotulo--suyo { border: 2px solid #d9a13b; }
.gsierra-rotulo__piso { font: 600 0.6rem/1 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.09em; color: #8a6a3a; }
.gsierra-rotulo__arbol { font: 700 0.92rem/1.1 system-ui, sans-serif; color: #33240f; }
.gsierra-rotulo__cient { font: italic 500 0.68rem/1.1 Georgia, serif; color: #5a4326; opacity: 0.85; }
.gsierra-rotulo__rasgo { display: none; font: 500 0.66rem/1.25 system-ui, sans-serif; color: #4a3720; max-width: 13rem; white-space: normal; text-align: center; margin-top: 0.1rem; }
.gsierra-rotulo__entrar { display: none; font: 700 0.6rem/1 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.07em; color: #fff8e9; background: #b5763a; padding: 0.22rem 0.5rem; border-radius: 99px; margin-top: 0.22rem; }
.gsierra-rotulo--viva .gsierra-rotulo__rasgo, .gsierra-rotulo--viva .gsierra-rotulo__entrar { display: block; }
.gsierra-rotulo__mio { font: 700 0.56rem/1 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; color: #8a5a1f; margin-top: 0.14rem; }
.gsierra-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.gsierra-titulo { margin: 0; padding: 0.95rem 1rem 0; color: #3a2a18; text-shadow: 0 1px 4px rgba(255,246,224,0.85); font: 700 clamp(1.12rem, 3.4vw, 1.4rem)/1.2 system-ui, sans-serif; }
.gsierra-titulo__cejilla { display: block; font: 600 0.66rem/1 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.16em; color: #8a5a1f; margin-bottom: 0.3rem; }
.gsierra-titulo small { display: block; font: 500 0.82rem/1.35 system-ui, sans-serif; opacity: 0.8; margin-top: 0.18rem; max-width: 30rem; }
.gsierra-abajo { display: flex; flex-direction: column; gap: 0.55rem; padding: 0 0.85rem 0.85rem; }
.gsierra-clima { pointer-events: auto; align-self: stretch; max-width: 34rem; margin: 0 auto; width: 100%; padding: 0.65rem 0.9rem 0.55rem; border-radius: 0.85rem; background: rgba(255,248,233,0.88); backdrop-filter: blur(4px); border: 1px solid rgba(181,118,58,0.22); box-shadow: 0 4px 16px rgba(60,42,24,0.18); }
.gsierra-clima__fila { display: flex; align-items: baseline; justify-content: space-between; gap: 0.6rem; margin-bottom: 0.35rem; }
.gsierra-clima__label { font: 600 0.78rem/1.1 system-ui, sans-serif; color: #3a2a18; }
.gsierra-clima__anio { font: 700 1.1rem/1 system-ui, sans-serif; font-variant-numeric: tabular-nums; transition: color 0.3s ease; }
.gsierra-clima input[type=range] { -webkit-appearance: none; appearance: none; width: 100%; height: 24px; margin: 0; background: transparent; cursor: pointer; }
.gsierra-clima input[type=range]::-webkit-slider-runnable-track { height: 8px; border-radius: 99px; background: linear-gradient(90deg, #7fae62 0%, #d9a13b 55%, #b03a1f 100%); box-shadow: inset 0 1px 2px rgba(60,42,24,0.28); }
.gsierra-clima input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #fff8e9; border: 3px solid #b5763a; margin-top: -7px; box-shadow: 0 2px 6px rgba(60,42,24,0.35); }
.gsierra-clima input[type=range]::-moz-range-track { height: 8px; border-radius: 99px; background: linear-gradient(90deg, #7fae62 0%, #d9a13b 55%, #b03a1f 100%); box-shadow: inset 0 1px 2px rgba(60,42,24,0.28); }
.gsierra-clima input[type=range]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #fff8e9; border: 3px solid #b5763a; box-shadow: 0 2px 6px rgba(60,42,24,0.35); }
.gsierra-clima__extremos { display: flex; justify-content: space-between; font: 600 0.64rem/1 system-ui, sans-serif; color: #8a6a3a; margin-top: 0.15rem; }
.gsierra-clima__nota { margin: 0.3rem 0 0; font: 500 0.72rem/1.35 system-ui, sans-serif; color: #4a3720; opacity: 0.9; }
.gsierra-leyenda { pointer-events: auto; position: absolute; right: 0.85rem; top: 50%; transform: translateY(-56%); display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; }
.gsierra-leyenda__cota { font: 600 0.6rem/1 system-ui, sans-serif; color: #5a4326; text-shadow: 0 1px 3px rgba(255,246,224,0.8); }
.gsierra-leyenda__barra { display: flex; flex-direction: column-reverse; width: 0.8rem; height: min(44vh, 300px); border-radius: 0.5rem; overflow: hidden; box-shadow: 0 2px 10px rgba(60,42,24,0.3); border: 1px solid rgba(90,67,38,0.35); }
.gsierra-leyenda__banda { position: relative; width: 100%; padding: 0; margin: 0; border: none; display: block; transition: height 0.5s ease, filter 0.15s ease; }
button.gsierra-leyenda__banda { cursor: pointer; }
button.gsierra-leyenda__banda:hover, button.gsierra-leyenda__banda:focus-visible { filter: brightness(1.12); outline: none; }
button.gsierra-leyenda__banda:focus-visible .gsierra-leyenda__nombre, button.gsierra-leyenda__banda:hover .gsierra-leyenda__nombre { font-weight: 700; }
.gsierra-leyenda__nombre { position: absolute; right: calc(100% + 0.45rem); top: 50%; transform: translateY(-50%); font: 600 0.62rem/1 system-ui, sans-serif; color: #4a3720; white-space: nowrap; text-shadow: 0 1px 3px rgba(255,246,224,0.85); }
.gsierra-leyenda__mio { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 0.32rem; height: 0.32rem; border-radius: 50%; background: #fff8e9; box-shadow: 0 0 0 1.5px rgba(90,67,38,0.6); }
.gsierra-pie { pointer-events: none; display: flex; justify-content: center; }
.gsierra-pie p { margin: 0; max-width: 42rem; text-align: center; padding: 0.42rem 0.85rem; border-radius: 0.7rem; background: rgba(24,16,7,0.5); backdrop-filter: blur(3px); color: #f4ecdd; font: 500 0.74rem/1.4 system-ui, sans-serif; }
@media (max-width: 640px) { .gsierra-leyenda { display: none; } }
@media (prefers-reduced-motion: reduce) { .gsierra-canvas { transition: none; } .gsierra-leyenda__banda { transition: none; } }
`;

/* ── La LEYENDA de pisos: el perfil de la montaña en DOM, con las MISMAS bandas
      del monte (mismos umbrales, mismo corrimiento por clima): al deslizar
      hoy→2050 la leyenda respira igual que la ladera — la lectura queda doble.
      Las bandas con árbol mayor son botones que entran a su mundo. ── */
function LeyendaPisos({ clima, pisoUsuario, onEntrarPiso }) {
  const d = clamp(clima, 0, 1);
  let base = 0;
  const bandas = BANDAS.map((b) => {
    const top = Number.isFinite(b.top) ? topDesplazado(b, d) : 1;
    const seg = { id: b.id, alto: Math.max(0.02, top - base), base };
    base = Math.min(top, 1);
    return seg;
  });
  const conArbol = new Set(['calido', 'templado', 'frio', 'paramo']);
  return (
    <div className="gsierra-leyenda" role="group" aria-label="Pisos térmicos de la Sierra, del mar a la nieve. Las bandas con árbol entran a su mundo.">
      <span className="gsierra-leyenda__cota">5 775 m</span>
      <div className="gsierra-leyenda__barra">
        {bandas.map((b) => {
          const piso = PISOS_TERMICOS.find((p) => p.id === b.id);
          const arbol = arbolDePiso(b.id);
          const esBoton = conArbol.has(b.id);
          const estilo = { height: `${b.alto * 100}%`, background: piso?.color || '#ccc' };
          const contenido = (
            <>
              {esBoton && <span className="gsierra-leyenda__nombre">{piso?.nombre}</span>}
              {pisoUsuario === b.id && <span className="gsierra-leyenda__mio" aria-hidden="true" />}
            </>
          );
          return esBoton ? (
            <button
              key={b.id}
              type="button"
              className="gsierra-leyenda__banda"
              style={estilo}
              title={`${piso?.nombre} (${piso?.min}–${piso?.max} m) — ${arbol?.nombre || ''}`}
              aria-label={`Entrar al mundo del piso ${piso?.nombre}, el del ${arbol?.nombre || 'árbol mayor'}${pisoUsuario === b.id ? ' (su piso)' : ''}`}
              onClick={() => onEntrarPiso?.(b.id)}
            >
              {contenido}
            </button>
          ) : (
            <div
              key={b.id}
              className="gsierra-leyenda__banda"
              style={estilo}
              title={`${piso?.nombre} (${piso?.min}–${piso?.max} m)`}
            >
              {contenido}
            </div>
          );
        })}
      </div>
      <span className="gsierra-leyenda__cota">0 m · mar</span>
    </div>
  );
}

/* Mezcla simple de dos hex por t (para el color del año que "calienta"). */
function hexLerp(a, b, t) {
  const ca = parseInt(a.slice(1), 16), cb = parseInt(b.slice(1), 16);
  const r = Math.round(((ca >> 16) & 255) + (((cb >> 16) & 255) - ((ca >> 16) & 255)) * t);
  const g = Math.round(((ca >> 8) & 255) + (((cb >> 8) & 255) - ((ca >> 8) & 255)) * t);
  const bl = Math.round((ca & 255) + ((cb & 255) - (ca & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}

/**
 * GaleriaSierraArboles — la vista global montable con su propio <Canvas>. Trae la
 * cámara de establishing con deriva viva, la órbita acotada al frente del macizo,
 * el título, el SLIDER CLIMÁTICO hoy→2050, la LEYENDA de pisos y el pie de
 * crédito a los cuatro pueblos.
 *
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier='alto']
 * @param {boolean} [props.reducedMotion=false]
 * @param {string}  [props.pisoUsuario]  piso de la finca a resaltar (opcional).
 * @param {(pisoId:string)=>void} [props.onEntrarPiso]  navegar al mundo del piso.
 * @param {string}  [props.className]
 * @param {(view: string, data?: any) => void} [props.onNavigate]  inyectada por el shell de prod; fallback de onEntrarPiso.
 */
export default function GaleriaSierraArboles({
  tier = 'alto',
  reducedMotion = false,
  pisoUsuario,
  onEntrarPiso,
  className = '',
  // Inyectada por el shell de prod (barrido de controles 2026-07-15): nadie
  // cableaba onEntrarPiso → los árboles héroe y las bandas de la leyenda eran
  // taps muertos. Sin prop específica, entrar al piso lleva a la navegación
  // de mundos por piso térmico (montaña), con el piso tocado como dato.
  onNavigate = undefined,
}) {
  const entrarPiso = onEntrarPiso
    ?? (onNavigate ? (pisoId) => onNavigate('montana_mundos', { piso: pisoId }) : undefined);
  const [listo, setListo] = useState(false);
  const [clima, setClima] = useState(0);
  const controles = useRef(null);
  const perfil = perfilDeTier(tier);
  const anio = Math.round(2026 + clima * 24); // hoy(2026) → 2050

  return (
    <section
      className={`gsierra-root${className ? ` ${className}` : ''}`}
      data-tier={tier}
      aria-label="Vista global de la Sierra: galería de mundos por piso térmico, con el árbol mayor de cada piso"
    >
      <style>{CSS}</style>
      <Canvas
        className={`gsierra-canvas${listo ? ' gsierra-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [0, 5.2, 16.6], fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <SierraArbolesDiorama
          tier={tier}
          reducedMotion={reducedMotion}
          clima={clima}
          pisoUsuario={pisoUsuario}
          onEntrarPiso={entrarPiso}
        />
        <OrbitControls
          ref={controles}
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={10.5}
          maxDistance={20}
          target={[0, 2.7, 0.2]}
          minPolarAngle={0.95}
          maxPolarAngle={1.42}
          minAzimuthAngle={-0.5}
          maxAzimuthAngle={0.5}
          enableDamping
          dampingFactor={0.08}
        />
        <DerivaCamara controles={controles} reducedMotion={reducedMotion} />
        <AdaptiveDpr pixelated />
      </Canvas>
      <div className="gsierra-vineta" aria-hidden="true" />

      <div className="gsierra-chrome">
        <h2 className="gsierra-titulo">
          <span className="gsierra-titulo__cejilla">Sierra Nevada de Santa Marta</span>
          La Sierra, piso por piso
          <small>Del mar Caribe a la nieve: toque el árbol mayor de un piso para entrar a su mundo.</small>
        </h2>

        <LeyendaPisos clima={clima} pisoUsuario={pisoUsuario} onEntrarPiso={entrarPiso} />

        <div className="gsierra-abajo">
          {/* SLIDER CLIMÁTICO: el corrimiento de los pisos hoy→2050 */}
          <div className="gsierra-clima">
            <div className="gsierra-clima__fila">
              <span className="gsierra-clima__label">El clima que viene</span>
              <span
                className="gsierra-clima__anio"
                style={{ color: hexLerp('#8a5a1f', '#b03a1f', clima) }}
                aria-live="polite"
              >
                {anio <= 2026 ? 'Hoy' : anio}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={clima}
              onChange={(e) => setClima(Number(e.target.value))}
              aria-label={`Año de proyección climática: ${anio}. Deslice para ver cómo suben los pisos térmicos.`}
            />
            <div className="gsierra-clima__extremos" aria-hidden="true">
              <span>Hoy</span>
              <span>2050</span>
            </div>
            <p className="gsierra-clima__nota">
              {clima < 0.06
                ? 'Los pisos térmicos hoy. Deslice hacia 2050 para ver cómo el calor los empuja cuesta arriba.'
                : 'Con el calentamiento, cada piso trepa la montaña: el páramo reduce su área y la nieve retrocede. Los árboles migran buscando su clima.'}
            </p>
          </div>

          <div className="gsierra-pie">
            <p role="contentinfo">
              Territorio ancestral y sagrado de los pueblos Kogui, Arhuaco (Iku),
              Wiwa y Kankuamo — el Corazón del Mundo, dentro de la Línea Negra.
              Representado con respeto; su uso público requiere consulta con las
              comunidades.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
