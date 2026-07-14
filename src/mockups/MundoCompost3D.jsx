/*
 * MundoCompost3D — el MUNDO DEL COMPOST: el ciclo del abono contado en 3D, del
 * residuo al suelo vivo, como un ANILLO que se cierra. No es un montón de basura
 * que se pudre: es el órgano que devuelve al suelo lo que la cocina y la huerta
 * dejan de usar, y así vuelve a nacer la próxima planta.
 *
 * La escena es un ANILLO de cuatro estaciones sobre la tierra dorada, recorrido
 * por puntos ámbar que marcan el sentido del ciclo (nada se bota, todo vuelve):
 *   1. RESIDUOS   — lo que sobra: verdes (frescos, nitrógeno) y marrones (secos,
 *                   carbono) esperando en un canasto.
 *   2. LA PILA    — la pila de compost por CAPAS (verde/marrón alternadas), con el
 *                   CALOR de la descomposición saliendo en vapor sutil (la fase
 *                   termófila) y la horquilla al lado para VOLTEARLA (airear).
 *   3. LOMBRICULTURA — la cama de la lombriz roja californiana: madera, humus
 *                   oscuro y las lombrices trabajando; al lado, una MUESTRA de
 *                   cerca (se reutiliza el diorama del framework) de la vida que
 *                   hace el humus.
 *   4. SUELO VIVO — el humus terminado, tierra negra donde ya asoma un brote: el
 *                   anillo se cierra, porque esa planta dará nuevos residuos.
 *
 * DIRECCIÓN DE ARTE (todo dentro del framework, nada inventado por fuera):
 *   - Atmósfera: la MISMA hora dorada del valle (`CIELOS_HORA.dorada`, espejo de
 *     `atmosferaMadre`). Entrar aquí se siente como acercarse dentro del mismo
 *     atardecer, no como abrir otra app.
 *   - Materiales: parten de `PALETA` (atmosferaMadre) entintados hacia la niebla
 *     dorada con `mezclar` — la ley de coherencia del framework.
 *   - El polvo en suspensión y el polen del atardecer son las
 *     `ParticulasAmbientales` del kit, sin tocarlas.
 *   - La vida de cerca es el `DioramaMicrofaunaSuelo` reutilizado, no re-escrito.
 *
 * RENDIMIENTO (frugal por contrato, DR §6): SOLO `meshLambert`/`meshBasic`, sin
 * shadow-map; chunks, castings y puntos del anillo INSTANCIADOS (pocos draw
 * calls), PRNG determinista (misma escena siempre). Presupuestos por `tier`;
 * `reducedMotion` congela el vapor, el flujo del anillo, la peristalsis de las
 * lombrices, la horquilla y el vaivén del brote, y pasa el frameloop a demanda.
 * La muestra de cerca no monta en gama baja.
 *
 * Ruta mockup: la cablea Opus en App.jsx (este archivo NO toca App.jsx).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Html } from '@react-three/drei';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';
import { DioramaMicrofaunaSuelo } from '../visual/mundo3d/MicrofaunaSuelo.jsx';

/* La hora dorada canónica (espejo de ATMOSFERA): única fuente de la atmósfera. */
const DORADA = CIELOS_HORA.dorada;
const TINTE = DORADA.niebla; // el tinte cálido que unifica todos los mundos

/* La paleta del framework entintada hacia la hora dorada. El compost es cálido y
   terroso de suyo; se le da apenas el tinte del atardecer para que el ojo lea "el
   mismo lugar" que el resto de los mundos. */
const P = {
  tierra: mezclar(PALETA.tierra, TINTE, 0.24), // la plataforma de trabajo
  tierraClara: mezclar(PALETA.tierraClara, TINTE, 0.24),
  verde: mezclar('#5f8a37', TINTE, 0.2), // capa VERDE: restos frescos (nitrógeno)
  verdeAlt: mezclar('#72a047', TINTE, 0.2),
  marron: mezclar('#8a6a34', TINTE, 0.24), // capa MARRÓN: secos (carbono)
  marronAlt: mezclar('#a5834a', TINTE, 0.24),
  maduro: mezclar('#2a1c12', TINTE, 0.12), // compost terminado, tierra negra
  maduroAlt: mezclar('#3a281a', TINTE, 0.14),
  cascara: mezclar('#8fbf4a', TINTE, 0.12), // cáscara/hoja fresca (acento verde)
  cascaraAlt: mezclar('#d9a13b', TINTE, 0.1), // resto de fruta (ámbar amable)
  hojaSeca: mezclar('#b08640', TINTE, 0.18), // hoja seca en la capa marrón
  madera: mezclar(PALETA.madera, TINTE, 0.18), // la cama de lombrices, canasto
  maderaClara: mezclar(PALETA.maderaClara, TINTE, 0.18),
  maderaOscura: mezclar(PALETA.maderaOscura, TINTE, 0.16),
  lamina: mezclar(PALETA.lamina, TINTE, 0.2), // horquilla (herraje gris cálido)
  lombriz: '#c65a4a', // la lombriz roja californiana (Eisenia fetida)
  lombrizAlt: '#ac4638',
  pasto: mezclar('#5f8a3f', TINTE, 0.22), // el brote del suelo vivo
  brote: '#8fc25a',
  broteClaro: '#a3d067',
  ambar: PALETA.ambar, // el anillo del ciclo
  ambarVivo: '#f0b850',
  vapor: '#fff2dd', // el calor termófilo hecho vapor
};

/* La geometría del anillo: cuatro estaciones sobre un círculo de radio R. El
   ángulo crece en el sentido del ciclo (residuo → pila → lombriz → suelo). */
const R_ANILLO = 4.0;
const pos = (theta, y = 0) => [R_ANILLO * Math.cos(theta), y, R_ANILLO * Math.sin(theta)];
const EST = {
  residuos: Math.PI, // izquierda
  pila: 1.5 * Math.PI, // fondo
  lombrices: 0, // derecha
  suelo: 0.5 * Math.PI, // frente
};

/* PRNG determinista (misma escena siempre, sin azar por frame). */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
/* ── Las luces de la hora dorada del kit ──────────────────────────────────── */
function LucesDoradas() {
  return (
    <>
      <hemisphereLight intensity={DORADA.hemisferio} color={DORADA.cielo} groundColor={DORADA.suelo} />
      <ambientLight intensity={DORADA.ambiente} color={DORADA.luz} />
      <directionalLight position={/** @type {[number, number, number]} */ (DORADA.solPos)} intensity={DORADA.sol} color={DORADA.luz} />
      <directionalLight position={[-7, 5, -8]} intensity={DORADA.rellenoInt} color={DORADA.relleno} />
    </>
  );
}

/* El sol bajo del atardecer: ancla visual de la hora (no ilumina; de eso se
   encargan las luces). Disco tibio con halo, del lado del solPos. */
function SolBajo() {
  return (
    <group position={[10, 8, -14]}>
      <mesh>
        <circleGeometry args={[1.6, 40]} />
        <meshBasicMaterial color="#fff0cf" transparent opacity={0.95} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[3, 40]} />
        <meshBasicMaterial color={DORADA.luz} transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[5, 40]} />
        <meshBasicMaterial color={DORADA.cielo} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ── Chunks dispersos dentro de una caja (1 draw call): motas de residuo, hoja
      seca, grumos de humus. Sesgo opcional hacia una cúpula para vestir la pila. */
function Chunks({ n, caja, centro = [0, 0, 0], rMin, rMax, colores, forma = 'mota', domo = 0, seed }) {
  const ref = useRef(null);
  const datos = useMemo(() => {
    const r = rng(seed);
    const [cx, cy, cz] = centro;
    const [ax, ay, az] = caja;
    return Array.from({ length: n }, () => {
      const u = r();
      const v = r();
      // domo>0 empuja los chunks hacia una cúpula (la superficie de la pila)
      const rad = domo ? Math.sqrt(u) : u; // reparto radial más denso al borde si domo
      const ang = v * Math.PI * 2;
      const x = cx + (domo ? Math.cos(ang) * rad * ax : (u - 0.5) * ax);
      const z = cz + (domo ? Math.sin(ang) * rad * az : (v - 0.5) * az);
      const y = cy + (domo ? domo * (1 - rad * rad) + r() * 0.08 : r() * ay);
      return {
        x,
        y,
        z,
        s: rMin + r() * (rMax - rMin),
        giro: [r() * Math.PI, r() * Math.PI, r() * Math.PI],
        col: colores[Math.floor(r() * colores.length)],
      };
    });
  }, [n, caja, centro, rMin, rMax, colores, domo, seed]);

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const c = new THREE.Color();
    datos.forEach((d, i) => {
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(d.giro[0], d.giro[1], d.giro[2]);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      c.set(d.col);
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [datos]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      {forma === 'hoja' ? (
        <tetrahedronGeometry args={[1, 0]} />
      ) : forma === 'grumo' ? (
        <dodecahedronGeometry args={[1, 0]} />
      ) : (
        <boxGeometry args={[1, 0.7, 1]} />
      )}
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/* ── La pila de compost por CAPAS: verde/marrón alternadas, forma de mound ───── *
   Cajas apiladas que menguan hacia arriba (corte de lasaña) para que las capas
   se lean; una falda de compost maduro en la base y chunks vistiendo la cúpula. */
const CAPAS = [
  { y0: 0.0, h: 0.30, w: 2.7, d: 2.1, verde: false }, // base seca (drenaje)
  { y0: 0.30, h: 0.28, w: 2.5, d: 1.95, verde: true }, // verde
  { y0: 0.58, h: 0.28, w: 2.25, d: 1.75, verde: false }, // marrón
  { y0: 0.86, h: 0.26, w: 1.95, d: 1.5, verde: true }, // verde
  { y0: 1.12, h: 0.24, w: 1.6, d: 1.2, verde: false }, // marrón
  { y0: 1.36, h: 0.22, w: 1.15, d: 0.85, verde: true }, // verde (corona)
];
const PILA_TOPE = 1.58; // y del tope de la pila (de donde sube el vapor)

function PilaCompost({ tier, centro }) {
  return (
    <group position={centro}>
      {/* falda de compost maduro en la base */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[1.85, 2.15, 0.16, 14]} />
        <meshLambertMaterial color={P.maduro} flatShading />
      </mesh>
      {/* las capas alternadas */}
      {CAPAS.map((c, i) => (
        <mesh key={i} position={[0, c.y0 + c.h / 2 + 0.12, 0]}>
          <boxGeometry args={[c.w, c.h, c.d]} />
          <meshLambertMaterial color={c.verde ? P.verde : P.marron} flatShading />
        </mesh>
      ))}
      {/* chunks vistiendo la cúpula: verdes frescos y ámbar de fruta arriba,
          hojas secas marrones intercaladas (rompe la caja, da textura de residuo) */}
      <Chunks
        n={tier === 'bajo' ? 26 : tier === 'medio' ? 44 : 70}
        caja={[1.2, 0, 0.95]}
        centro={[0, PILA_TOPE + 0.02, 0]}
        rMin={0.06}
        rMax={0.13}
        colores={[P.cascara, P.cascaraAlt, P.verdeAlt]}
        forma="mota"
        domo={0.55}
        seed={71}
      />
      <Chunks
        n={tier === 'bajo' ? 18 : tier === 'medio' ? 30 : 46}
        caja={[1.3, 0, 1.05]}
        centro={[0, PILA_TOPE - 0.02, 0]}
        rMin={0.08}
        rMax={0.16}
        colores={[P.hojaSeca, P.marronAlt]}
        forma="hoja"
        domo={0.48}
        seed={83}
      />
    </group>
  );
}

/* ── El vapor termófilo: el calor de la descomposición hecho penacho sutil ──── *
   Un THREE.Points (1 draw call) que asciende desde el tope de la pila y se
   desvanece; al VOLTEAR (airear) sube más rápido y más ancho (el oxígeno reaviva
   la fase termófila). reducedMotion lo deja repartido y quieto en la columna. */
let vaporSprite = null;
function spriteVapor() {
  if (vaporSprite) return vaporSprite;
  if (typeof document === 'undefined') return null;
  const lienzo = document.createElement('canvas');
  lienzo.width = 64;
  lienzo.height = 64;
  const ctx = lienzo.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.32)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  vaporSprite = new THREE.CanvasTexture(lienzo);
  return vaporSprite;
}
const COLUMNA = 2.0; // alto del penacho

function VaporTermofilo({ tier, reducedMotion, activo, position }) {
  const ref = useRef(null);
  const n = tier === 'bajo' ? 0 : tier === 'medio' ? 16 : 28;
  const datos = useMemo(() => {
    const r = rng(211);
    const posArr = new Float32Array(Math.max(1, n) * 3);
    const col = new Float32Array(Math.max(1, n) * 3);
    const semilla = [];
    const base = new THREE.Color(P.vapor);
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      const rad = 0.15 + r() * 0.55;
      const ang = r() * Math.PI * 2;
      const fase = r();
      semilla.push({ rad, ang, fase, vel: 0.6 + r() * 0.7, deriva: (r() - 0.5) * 0.5 });
      const y = fase * COLUMNA;
      posArr[j] = Math.cos(ang) * rad;
      posArr[j + 1] = y;
      posArr[j + 2] = Math.sin(ang) * rad;
      const fade = 1 - (y / COLUMNA) * 0.9;
      col[j] = base.r * fade;
      col[j + 1] = base.g * fade;
      col[j + 2] = base.b * fade;
    }
    return { posArr, col, semilla, base };
  }, [n]);

  useFrame(({ clock }) => {
    if (reducedMotion || !ref.current || n === 0) return;
    const t = clock.elapsedTime;
    const geo = ref.current.geometry;
    const pArr = geo.attributes.position.array;
    const cArr = geo.attributes.color.array;
    const sube = activo ? 0.5 : 0.28; // voltear airea → más calor, sube más rápido
    const ancho = activo ? 0.9 : 0.6;
    for (let i = 0; i < datos.semilla.length; i++) {
      const s = datos.semilla[i];
      const j = i * 3;
      const y = ((s.fase + t * sube * s.vel) % 1) * COLUMNA;
      const expand = 1 + (y / COLUMNA) * ancho; // el penacho se abre al subir
      pArr[j] = Math.cos(s.ang) * s.rad * expand + Math.sin(t * s.vel + s.fase * 9) * 0.08 * s.deriva;
      pArr[j + 1] = y;
      pArr[j + 2] = Math.sin(s.ang) * s.rad * expand + Math.cos(t * s.vel + s.fase * 7) * 0.08 * s.deriva;
      const fade = (1 - (y / COLUMNA) * 0.92) * (activo ? 1 : 0.8);
      cArr[j] = datos.base.r * fade;
      cArr[j + 1] = datos.base.g * fade;
      cArr[j + 2] = datos.base.b * fade;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });

  if (n === 0) return null;
  return (
    <points ref={ref} position={position} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[datos.posArr, 3]} />
        <bufferAttribute attach="attributes-color" args={[datos.col, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={spriteVapor()}
        size={0.42}
        vertexColors
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

/* ── La horquilla de voltear: mango + cabezal + púas. En reposo, clavada junto a
      la pila; al VOLTEAR, hace el arco de levantar y airear. ─────────────────── */
function Horquilla({ centro, activo, reducedMotion }) {
  const grupo = useRef(null);
  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g) return;
    if (reducedMotion) {
      g.rotation.z = activo ? -0.5 : -0.28;
      return;
    }
    if (activo) {
      // el gesto de voltear: levanta y gira en arco
      const t = clock.elapsedTime * 1.6;
      g.rotation.z = -0.28 - (0.4 + 0.4 * Math.sin(t)) * 0.7;
      g.position.y = centro[1] + Math.max(0, Math.sin(t)) * 0.25;
    } else {
      g.rotation.z = -0.28;
      g.position.y = centro[1];
    }
  });
  return (
    <group ref={grupo} position={centro}>
      <group position={[0, 0, 0]}>
        {/* mango de madera */}
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 1.9, 6]} />
          <meshLambertMaterial color={P.maderaClara} flatShading />
        </mesh>
        {/* cabezal metálico */}
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.5, 0.08, 0.08]} />
          <meshLambertMaterial color={P.lamina} flatShading />
        </mesh>
        {/* cuatro púas */}
        {[-0.21, -0.07, 0.07, 0.21].map((x, i) => (
          <mesh key={i} position={[x, -0.24, 0]}>
            <cylinderGeometry args={[0.02, 0.008, 0.5, 5]} />
            <meshLambertMaterial color={P.lamina} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ── La lombriz roja californiana: cadena de esferas con onda peristáltica ──── */
function LombrizRoja({ base, largo = 1.0, seed = 1, reducedMotion }) {
  const segs = useRef([]);
  const puntos = useMemo(() => {
    const r = rng(seed);
    const rumbo = r() * Math.PI * 2;
    const N = 8;
    return Array.from({ length: N }, (_, i) => {
      const u = i / (N - 1);
      return {
        x: Math.cos(rumbo) * (u - 0.5) * largo,
        z: Math.sin(rumbo) * (u - 0.5) * largo,
        y: Math.sin(u * Math.PI * 1.1) * 0.06,
        r: 0.045 + 0.028 * Math.sin(u * Math.PI),
      };
    });
  }, [largo, seed]);
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime * 2.0 + seed;
    for (let i = 0; i < segs.current.length; i++) {
      const g = segs.current[i];
      if (!g) continue;
      const w = Math.sin(t - i * 0.55);
      g.position.y = puntos[i].y + w * 0.03;
      g.scale.set(1 - w * 0.08, 1 + w * 0.16, 1 - w * 0.08);
    }
  });
  return (
    <group position={base}>
      {puntos.map((p, i) => (
        <group key={i} ref={(el) => { segs.current[i] = el; }} position={[p.x, p.y, p.z]}>
          <mesh>
            <sphereGeometry args={[p.r, 8, 6]} />
            <meshLambertMaterial color={i % 2 === 0 ? P.lombriz : P.lombrizAlt} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── La cama de lombrices: bin de madera con humus oscuro, castings y lombrices ─ */
function CamaLombrices({ tier, centro, reducedMotion }) {
  const AW = 2.4;
  const AD = 1.7;
  const h = 0.5;
  const t = 0.09; // grosor de la tabla
  return (
    <group position={centro}>
      {/* piso del bin */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[AW, 0.08, AD]} />
        <meshLambertMaterial color={P.maderaOscura} flatShading />
      </mesh>
      {/* cuatro paredes de tabla */}
      <mesh position={[0, h / 2, AD / 2 - t / 2]}>
        <boxGeometry args={[AW, h, t]} />
        <meshLambertMaterial color={P.madera} flatShading />
      </mesh>
      <mesh position={[0, h / 2, -AD / 2 + t / 2]}>
        <boxGeometry args={[AW, h, t]} />
        <meshLambertMaterial color={P.madera} flatShading />
      </mesh>
      <mesh position={[AW / 2 - t / 2, h / 2, 0]}>
        <boxGeometry args={[t, h, AD]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
      <mesh position={[-AW / 2 + t / 2, h / 2, 0]}>
        <boxGeometry args={[t, h, AD]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
      {/* el lecho de humus oscuro (compost trabajado) */}
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[AW - 2 * t, 0.42, AD - 2 * t]} />
        <meshLambertMaterial color={P.maduro} flatShading />
      </mesh>
      {/* grumos de humus (castings) sobre la superficie */}
      <Chunks
        n={tier === 'bajo' ? 22 : tier === 'medio' ? 40 : 64}
        caja={[AW - 0.35, 0.05, AD - 0.35]}
        centro={[0, 0.54, 0]}
        rMin={0.04}
        rMax={0.09}
        colores={[P.maduro, P.maduroAlt]}
        forma="grumo"
        seed={131}
      />
      {/* las lombrices trabajando la superficie */}
      <LombrizRoja base={[0.35, 0.55, 0.2]} largo={0.9} seed={3} reducedMotion={reducedMotion} />
      <LombrizRoja base={[-0.45, 0.55, -0.25]} largo={0.8} seed={9} reducedMotion={reducedMotion} />
      {tier !== 'bajo' && (
        <LombrizRoja base={[0.1, 0.55, -0.4]} largo={0.75} seed={17} reducedMotion={reducedMotion} />
      )}
    </group>
  );
}

/* ── La muestra de cerca: se reutiliza el diorama del framework como "la vida que
      hace el humus, bajo la lupa". Va sobre un pedestal, junto a la cama. No monta
      en gama baja (segunda escena = más draw calls). ─────────────────────────── */
function MuestraDeCerca({ tier, reducedMotion }) {
  return (
    <group position={[6.3, -0.55, 0.6]}>
      {/* pedestal */}
      <mesh position={[0, -1.15, 0]}>
        <cylinderGeometry args={[1.1, 1.3, 0.5, 8]} />
        <meshLambertMaterial color={P.marron} flatShading />
      </mesh>
      {/* halo cálido de "bajo la lupa" */}
      <mesh position={[0, 0.3, -0.9]}>
        <circleGeometry args={[1.9, 32]} />
        <meshBasicMaterial color={DORADA.luz} transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <group scale={0.6}>
        <DioramaMicrofaunaSuelo tier={tier} reducedMotion={reducedMotion} vida={0.92} mostrarNombres={false} />
      </group>
      <Html position={[0, 1.9, 0]} center distanceFactor={13} zIndexRange={[30, 0]}>
        <span className="compost-lupa">
          <span className="compost-lupa__emoji" aria-hidden="true">🔬</span>
          La vida que hace el humus
        </span>
      </Html>
    </group>
  );
}

/* ── El brote del suelo vivo: tallo + hojas que respiran (cierra el anillo) ──── */
function BroteVivo({ reducedMotion }) {
  const copa = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !copa.current) return;
    copa.current.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.06;
  });
  return (
    <group ref={copa}>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.84, 6]} />
        <meshLambertMaterial color={P.pasto} flatShading />
      </mesh>
      <mesh position={[-0.11, 0.22, 0.02]} rotation={[0, 0, 0.9]} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshLambertMaterial color={mezclar(P.pasto, P.brote, 0.5)} flatShading />
      </mesh>
      <mesh position={[0.11, 0.22, 0.02]} rotation={[0, 0, -0.9]} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshLambertMaterial color={mezclar(P.pasto, P.brote, 0.5)} flatShading />
      </mesh>
      <mesh position={[-0.16, 0.76, 0.03]} rotation={[0.2, 0.3, 0.5]} scale={[1.3, 0.5, 1]}>
        <sphereGeometry args={[0.14, 8, 6]} />
        <meshLambertMaterial color={P.brote} flatShading />
      </mesh>
      <mesh position={[0.16, 0.8, -0.02]} rotation={[0.2, -0.3, -0.5]} scale={[1.3, 0.5, 1]}>
        <sphereGeometry args={[0.13, 8, 6]} />
        <meshLambertMaterial color={P.brote} flatShading />
      </mesh>
      <mesh position={[0, 0.92, 0.02]} rotation={[-0.3, 0, 0]} scale={[1, 0.5, 1.2]}>
        <sphereGeometry args={[0.11, 8, 6]} />
        <meshLambertMaterial color={P.broteClaro} flatShading />
      </mesh>
    </group>
  );
}

/* La estación del SUELO VIVO: mound de compost terminado con el brote encima. */
function SueloVivo({ tier, centro, reducedMotion }) {
  return (
    <group position={centro}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.95, 1.25, 0.34, 16]} />
        <meshLambertMaterial color={P.maduro} flatShading />
      </mesh>
      <Chunks
        n={tier === 'bajo' ? 16 : 34}
        caja={[1.5, 0, 1.5]}
        centro={[0, 0.33, 0]}
        rMin={0.03}
        rMax={0.07}
        colores={[P.maduro, P.maduroAlt]}
        forma="grumo"
        domo={0.16}
        seed={151}
      />
      <group position={[0, 0.32, 0]}>
        <BroteVivo reducedMotion={reducedMotion} />
      </group>
    </group>
  );
}

/* ── La estación de RESIDUOS: canasto con verdes frescos y marrones secos ───── */
function Residuos({ tier, centro }) {
  const D = 1.15;
  return (
    <group position={centro}>
      {/* canasto de mimbre (cilindro abierto, doble cara) */}
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[D, D * 0.82, 0.68, 16, 1, true]} />
        <meshLambertMaterial color={P.maderaClara} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[D * 0.82, D * 0.82, 0.06, 16]} />
        <meshLambertMaterial color={P.maderaOscura} flatShading />
      </mesh>
      {/* borde superior */}
      <mesh position={[0, 0.68, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[D, 0.05, 6, 20]} />
        <meshLambertMaterial color={P.madera} flatShading />
      </mesh>
      {/* la mezcla de residuos: verdes frescos y ámbar de fruta */}
      <Chunks
        n={tier === 'bajo' ? 20 : 40}
        caja={[D * 1.3, 0.1, D * 1.3]}
        centro={[0, 0.55, 0]}
        rMin={0.06}
        rMax={0.13}
        colores={[P.cascara, P.cascaraAlt, P.verdeAlt]}
        forma="mota"
        domo={0.18}
        seed={191}
      />
      {/* unas hojas secas asomando (los marrones) */}
      <Chunks
        n={tier === 'bajo' ? 8 : 16}
        caja={[D * 1.2, 0.05, D * 1.2]}
        centro={[0, 0.6, 0]}
        rMin={0.1}
        rMax={0.17}
        colores={[P.hojaSeca, P.marronAlt]}
        forma="hoja"
        domo={0.12}
        seed={197}
      />
    </group>
  );
}

/* ── El anillo del ciclo: el aro ámbar en la tierra + puntos que fluyen en el
      sentido del compost (residuo → pila → lombriz → suelo → residuo). El flujo
      DICE que nada se bota: todo vuelve al suelo. reducedMotion lo deja quieto. ── */
function AnilloCiclo({ tier, reducedMotion }) {
  const ref = useRef(null);
  const n = tier === 'bajo' ? 10 : tier === 'medio' ? 18 : 30;
  const datos = useMemo(() => {
    const r = rng(233);
    return Array.from({ length: n }, (_, i) => ({
      ang0: (i / n) * Math.PI * 2,
      s: 0.06 + r() * 0.05,
      vel: 0.9 + r() * 0.25,
    }));
  }, [n]);

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const c = new THREE.Color(P.ambarVivo);
    datos.forEach((d, i) => {
      dummy.position.set(R_ANILLO * Math.cos(d.ang0), 0.07, R_ANILLO * Math.sin(d.ang0));
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [datos]);

  useFrame(({ clock }) => {
    if (reducedMotion || !ref.current) return;
    const t = clock.elapsedTime * 0.22;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < datos.length; i++) {
      const d = datos[i];
      const a = d.ang0 + t * d.vel;
      dummy.position.set(R_ANILLO * Math.cos(a), 0.07 + Math.sin(t * 3 + i) * 0.015, R_ANILLO * Math.sin(a));
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* el aro grabado en la tierra */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R_ANILLO, 0.05, 6, 80]} />
        <meshBasicMaterial color={P.ambar} transparent opacity={0.5} />
      </mesh>
      {/* los puntos que fluyen marcando el sentido del ciclo */}
      <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 7]} />
        <meshBasicMaterial color={P.ambarVivo} transparent opacity={0.9} />
      </instancedMesh>
    </group>
  );
}

/* ── Pin didáctico de estación (billboard: emoji + nombre + subtítulo) ──────── */
function PinEstacion({ posicion, emoji, nombre, sub }) {
  return (
    <Html position={posicion} center distanceFactor={14} zIndexRange={[30, 0]}>
      <span className="compost-pin">
        <span className="compost-pin__badge" aria-hidden="true">{emoji}</span>
        <span className="compost-pin__txt">
          {nombre}
          <small>{sub}</small>
        </span>
      </span>
    </Html>
  );
}

/* La escena completa (grupo r3f interno; el default la monta en su Canvas). */
function EscenaCompost({ tier, reducedMotion, volteo }) {
  const perfil = perfilDeTier(tier);
  const cResiduos = pos(EST.residuos);
  const cPila = pos(EST.pila);
  const cLombrices = pos(EST.lombrices);
  const cSuelo = pos(EST.suelo);

  return (
    <>
      <color attach="background" args={[DORADA.fondo]} />
      {perfil.fog && <fog attach="fog" args={[DORADA.niebla, 16, 52]} />}
      <LucesDoradas />
      <SolBajo />

      {/* la plataforma de tierra donde vive el ciclo */}
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[R_ANILLO + 2.4, R_ANILLO + 2.8, 0.2, 40]} />
        <meshLambertMaterial color={P.tierra} flatShading />
      </mesh>

      <AnilloCiclo tier={tier} reducedMotion={reducedMotion} />

      {/* 1 — Residuos (entrada del ciclo) */}
      <Residuos tier={tier} centro={cResiduos} />
      <PinEstacion posicion={[cResiduos[0], 1.5, cResiduos[2]]} emoji="🍂" nombre="Residuos" sub="verdes frescos y marrones secos" />

      {/* 2 — La pila caliente + su vapor + la horquilla de voltear */}
      <PilaCompost tier={tier} centro={cPila} />
      <VaporTermofilo
        tier={tier}
        reducedMotion={reducedMotion}
        activo={volteo}
        position={[cPila[0], cPila[1] + PILA_TOPE + 0.1, cPila[2]]}
      />
      <Horquilla centro={[cPila[0] + 2.1, 0, cPila[2] + 0.6]} activo={volteo} reducedMotion={reducedMotion} />
      <PinEstacion posicion={[cPila[0], PILA_TOPE + 2.5, cPila[2]]} emoji="♨️" nombre="La pila caliente" sub="capas y calor de descomposición" />

      {/* 3 — Lombricultura + la muestra de cerca reutilizada */}
      <CamaLombrices tier={tier} centro={cLombrices} reducedMotion={reducedMotion} />
      <PinEstacion posicion={[cLombrices[0], 1.7, cLombrices[2]]} emoji="🪱" nombre="Lombricultura" sub="la lombriz roja hace humus" />
      {tier !== 'bajo' && <MuestraDeCerca tier={tier} reducedMotion={reducedMotion} />}

      {/* 4 — El suelo vivo: el humus terminado con el brote (cierra el anillo) */}
      <SueloVivo tier={tier} centro={cSuelo} reducedMotion={reducedMotion} />
      <PinEstacion posicion={[cSuelo[0], 1.7, cSuelo[2]]} emoji="🌱" nombre="Suelo vivo" sub="el humus que alimenta la planta" />

      {/* aire de la hora dorada: polvo tibio sobre la pila + polen sobre el anillo */}
      <ParticulasAmbientales
        tipo="polvo"
        tier={tier}
        reducedMotion={reducedMotion}
        position={[cPila[0], 0.4, cPila[2]]}
        area={[2.4, 3, 2.4]}
        semilla={23}
      />
      <ParticulasAmbientales
        tipo="polen"
        tier={tier}
        reducedMotion={reducedMotion}
        densidad={0.6}
        position={[0, 0.2, 0]}
        area={[R_ANILLO * 2.2, 3.2, R_ANILLO * 2.2]}
        semilla={41}
      />
    </>
  );
}

/* Estilos de ESTA escena (chrome DOM sobre el Canvas). */
const CSS_COMPOST = `
.compost-root { position: relative; width: 100%; height: 100dvh; min-height: 320px; overflow: hidden; background: ${DORADA.fondo}; }
.compost-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.compost-canvas--lista { opacity: 1; }
.compost-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.compost-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #3a2a15; text-shadow: 0 1px 8px rgba(255,244,214,0.7); font: 700 1.18rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.compost-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.82; margin-top: 0.15rem; }
.compost-pie { padding: 0 1rem 0.9rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem; }
.compost-carta { margin: 0; max-width: 34rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(58,42,21,0.64); backdrop-filter: blur(3px); color: #fbf3e2; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.compost-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(58,42,21,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(255,247,228,0.82); color: #533a17; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.compost-boton:hover, .compost-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(58,42,21,0.6); outline: none; }
.compost-boton[aria-pressed='true'] { background: #f4dcae; border-color: rgba(140,90,30,0.7); color: #5a3a10; }
.compost-pin { display: inline-flex; align-items: center; gap: 0.4rem; white-space: nowrap; user-select: none; }
.compost-pin__badge { display: inline-grid; place-items: center; width: 1.6rem; height: 1.6rem; border-radius: 50%; background: rgba(255,247,228,0.9); font-size: 0.95rem; box-shadow: 0 1px 6px rgba(0,0,0,0.3); border: 1.5px solid rgba(140,90,30,0.5); }
.compost-pin__txt { display: inline-flex; flex-direction: column; color: #3a2a15; font: 700 0.8rem/1.05 system-ui, sans-serif; text-shadow: 0 1px 5px rgba(255,244,214,0.85); }
.compost-pin__txt small { font: 500 0.62rem/1.1 system-ui, sans-serif; opacity: 0.8; }
.compost-lupa { display: inline-flex; align-items: center; gap: 0.35rem; white-space: nowrap; padding: 0.22rem 0.6rem; border-radius: 999px; background: rgba(58,42,21,0.7); color: #fbf3e2; font: 700 0.72rem/1.1 system-ui, sans-serif; box-shadow: 0 1px 6px rgba(0,0,0,0.3); }
.compost-lupa__emoji { font-size: 0.85rem; }
@media (prefers-reduced-motion: reduce) { .compost-canvas { transition: none; } }
`;

/* La copia didáctica: en reposo, la invitación al ciclo; al voltear, la lección
   del calor termófilo y la aireación. */
const COPY_CALMA =
  'El compost cierra el anillo: lo que sobra en la cocina y la huerta —verdes (frescos) y marrones (secos)— se apila por capas y se vuelve tierra. La lombriz roja californiana convierte esos restos en humus, el suelo vivo que alimenta la próxima planta. Toque el botón para voltear la pila.';
const COPY_VOLTEO =
  'Al voltear la pila entra aire: los microorganismos termófilos se reactivan y sube el calor —por eso el vapor. Voltearla cada tanto acelera la descomposición y evita malos olores. Del residuo al humus, el anillo se cierra: nada se bota, todo vuelve al suelo.';

/**
 * MundoCompost3D — el ciclo del compost, montable con su propio `<Canvas>`.
 * Sin lógica de negocio: es una vitrina educativa. El tier y reduced-motion se
 * detectan aquí (mockup standalone), igual que sus pares (suelo, agua, páramo).
 */
export default function MundoCompost3D() {
  const [listo, setListo] = useState(false);
  const [volteo, setVolteo] = useState(false);
  const { tier, reducedMotion } = useMemo(() => decidirTier(), []);
  const perfil = perfilDeTier(tier);

  return (
    <section
      className="compost-root"
      data-tier={tier}
      aria-label="El mundo del compost: el ciclo del abono, del residuo al suelo vivo, con la pila por capas, el calor de la descomposición, el volteo y la lombricultura"
    >
      <style>{CSS_COMPOST}</style>
      <Canvas
        className={`compost-canvas${listo ? ' compost-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [8.5, 6, 8.5], fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <EscenaCompost tier={tier} reducedMotion={reducedMotion} volteo={volteo} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={7}
          maxDistance={22}
          target={[0, 0.4, 0]}
          minPolarAngle={0.35}
          maxPolarAngle={1.45}
          enableDamping
          dampingFactor={0.08}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.14}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      <div className="compost-chrome">
        <h2 className="compost-titulo">
          El mundo del compost: el anillo que se cierra
          <small>Del residuo al suelo vivo — capas, calor, volteo y lombricultura</small>
        </h2>
        <div className="compost-pie">
          <button
            type="button"
            className="compost-boton"
            aria-pressed={volteo}
            onClick={() => setVolteo((v) => !v)}
          >
            {volteo ? 'Ver la pila en reposo' : 'Voltear la pila (airear)'}
          </button>
          <p className="compost-carta" role="status">
            {volteo ? COPY_VOLTEO : COPY_CALMA}
          </p>
        </div>
      </div>
    </section>
  );
}
