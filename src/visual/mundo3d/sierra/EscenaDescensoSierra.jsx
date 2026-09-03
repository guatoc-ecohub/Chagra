/*
 * EscenaDescensoSierra — la escena 3D que corre DEBAJO de la tapa de
 * `TransicionSierraMundo`. Es el modo `escena3d` del PASO 3.
 *
 * Qué es y qué NO es. La transición ya existía y era honesta como transición de
 * UI, pero su «transecto» era un `linear-gradient` de 14 paradas sobre una
 * columna de 300vh: una cortina que DICE ser un descenso. Esto es el descenso:
 * la misma ladera de la vista global (misma ley de altura, mismos colores
 * canónicos), recorrida por una cámara, con el cielo cambiando por FÍSICA.
 *
 * EL EFECTO CENTRAL, y por qué es el central: `cieloSylva` toma `msnm` como
 * entrada y integra el scattering Rayleigh + Mie + ozono a escala planetaria.
 * Animar esa altitud a lo largo del descenso no «tiñe» el cielo: cambia cuánta
 * atmósfera hay sobre la cámara. Arriba, poca columna → cenit casi violeta y
 * sol duro; abajo, mucha → azul pleno y luego blanquecino. Es la respuesta
 * VISIBLE a «¿por qué hace más frío arriba?», que es la prueba instruccional
 * del diseño (§8.6). Y como `crearCieloSylva` MUTA EN SITIO el material del
 * `Sky` existente, quien mande los uniforms después (clima-vivo, en el
 * aterrizaje) sigue mandando sobre los mismos.
 *
 * CONTINUIDAD: esta escena no decide nada. Consulta `estadoDescenso(ms)` de
 * `descensoSierra.js`, donde toda magnitud óptica es función continua de la
 * altitud. Si hubiera un salto de luz o de niebla entre bandas, estaría allá y
 * el test lo mediría — no acá.
 *
 * REGLA ANTI-LOW-POLY: la ladera va con normales suaves SIEMPRE (la vista
 * global usa `flatShading` en tier alto; de cerca eso serían facetas grandes,
 * justo lo prohibido). La degradación por tier es de DENSIDAD (segmentos,
 * estratos de nube, DPR), nunca de forma.
 */
/* eslint-disable react-hooks/immutability -- R3F ejecuta el
   viaje IMPERATIVAMENTE dentro de useFrame: cámara, niebla de escena y luces se
   mutan por cuadro sobre los objetos three que `useThree()` devuelve. Es el
   mismo patrón ya aceptado en `escenas/useEntradaAbeja.jsx` y en el aplane de
   `mockups/valle/Valle3D.jsx`. */
/* eslint-disable react-refresh/only-export-components -- este módulo se importa
   SIEMPRE perezoso desde la transición; junto a la escena viaja el conteo de
   estratos que el gate consulta, y separarlo en otro archivo solo para el
   linter escondería el número que hay que contar. */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky as SkyImpl } from 'three/addons/objects/Sky.js';
import { ATMOSFERA } from '../atmosferaMadre.js';
import { perfilDeTier } from '../deviceTier.js';
import {
  ANCHO,
  COSTA_Z,
  FONDO,
  alturaSierra,
  colorPorAlturaRGB,
  yDeMsnm,
} from './sierraRelieve.js';
import { estadoDescenso } from './descensoSierra.js';
import { crearCieloSylva } from './cieloSylva.js';

/* ─────────────────────────── la ladera del macizo ───────────────────────── */

/*
 * OJO CON EL ESPACIO DE COLOR — acá se perdió el gate una vez y la medición lo
 * delató: `colorPorAlturaRGB` devuelve sRGB (es lo que dice la tabla canónica),
 * y el atributo `color` de una geometría se interpreta en espacio LINEAL. Meter
 * sRGB crudo aclara y DESATURA todo: la primera captura midió croma ~9 donde las
 * bandas canónicas tienen ~60 — el macizo entero salió gris. `setRGB(..., SRGB)`
 * hace la conversión, que es exactamente lo que hace `new THREE.Color(hex)` en
 * la vista global. Sin esto, las 7 bandas no se leen: se leen cero.
 */
function construirLadera(segX, segZ) {
  const nx = segX + 1;
  const nz = segZ + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / segZ;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / segX;
      const y = alturaSierra(wx, wz);
      pos[p] = wx;
      pos[p + 1] = y;
      pos[p + 2] = wz;
      const [r, g, b] = colorPorAlturaRGB(y);
      c.setRGB(r, g, b, THREE.SRGBColorSpace);
      col[p] = c.r;
      col[p + 1] = c.g;
      col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * nx + ix;
      const b = a + 1;
      const d = a + nx;
      const e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals(); // SIEMPRE suave: nunca facetas de cerca
  return geo;
}

function Ladera({ segmentos }) {
  const geo = useMemo(() => construirLadera(segmentos, segmentos), [segmentos]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} name="descenso-ladera" receiveShadow>
      <meshLambertMaterial vertexColors />
    </mesh>
  );
}

function MarCaribe() {
  return (
    <mesh position={[0, 0.02, -9]} rotation={[-Math.PI / 2, 0, 0]} name="descenso-mar">
      <planeGeometry args={[52, 22]} />
      <meshLambertMaterial color="#4c93ab" transparent opacity={0.96} />
    </mesh>
  );
}

/* ──────────────────────── estratos de nube (parallax) ───────────────────── */
/*
 * §3.2 pide AL MENOS 3 estratos a velocidades distintas para que la altura se
 * lea. Y §2.3.3 prohíbe el defecto de la vista global: nubes que son polígonos
 * de borde duro. Por eso la textura es una mancha fbm con borde MUY emplumado
 * generada en canvas (offline, determinista, cero binarios) — el patrón de
 * `brumaVolumetrica.js` — y cada estrato es UN mesh instanciado: 3 draw calls
 * en total, no una nube por polígono.
 */
function texturaJironSuave(semilla = 7) {
  const tam = 128;
  const cv = document.createElement('canvas');
  cv.width = tam;
  cv.height = tam;
  const ctx = cv.getContext('2d');
  /* En jsdom (y en cualquier entorno sin canvas 2D) `getContext` devuelve null.
     Sin este guardia el módulo revienta al montarse en un test — le pasó al
     Paso 2 el 2026-09-02, que dejó `vistaGlobalSierra.cableado.test.jsx` en rojo
     por exactamente esta línea. Sin contexto se devuelve un jirón liso: la
     escena pierde textura, no se cae. */
  if (!ctx) {
    const lisa = new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 180]),
      1,
      1,
      THREE.RGBAFormat,
    );
    lisa.needsUpdate = true;
    return lisa;
  }
  const img = ctx.createImageData(tam, tam);
  const px = img.data;
  const o = semilla * 11.3;
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      const dx = (x / tam - 0.5) / 0.5;
      const dy = (y / tam - 0.5) / 0.3;
      const r = Math.sqrt(dx * dx + dy * dy);
      const n =
        Math.sin(x * 0.09 + o) * 0.5 +
        Math.sin(x * 0.19 - y * 0.13 + o * 1.7) * 0.3 +
        Math.sin(x * 0.05 + y * 0.15 + o * 2.3) * 0.2;
      const borde = Math.max(0, Math.min(1, (1.05 - r + n * 0.28) / 0.85));
      const a = borde * borde * (3 - 2 * borde); // smoothstep: sin filo
      const i = (y * tam + x) * 4;
      px[i] = 255;
      px[i + 1] = 255;
      px[i + 2] = 255;
      px[i + 3] = Math.round(a * 235);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Cotas (msnm) y velocidad relativa de cada estrato. El cercano cruza rápido. */
const ESTRATOS = [
  { msnm: 3450, escala: 7.2, velocidad: 0.22, opacidad: 0.5, semilla: 3 },
  { msnm: 2700, escala: 9.5, velocidad: 0.46, opacidad: 0.75, semilla: 7 },
  { msnm: 2150, escala: 12.0, velocidad: 0.95, opacidad: 0.9, semilla: 13 },
  { msnm: 1450, escala: 14.0, velocidad: 1.35, opacidad: 0.5, semilla: 19 },
];

function EstratosNube({ cuantos, refEstado }) {
  const tex = useMemo(() => texturaJironSuave(7), []);
  useEffect(() => () => tex.dispose(), [tex]);
  const capas = ESTRATOS.slice(0, Math.max(3, cuantos)); // NUNCA menos de 3
  const grupos = useRef([]);
  useFrame((_, dt) => {
    const est = refEstado.current;
    if (!est) return;
    for (let i = 0; i < grupos.current.length; i++) {
      const g = grupos.current[i];
      if (!g) continue;
      const capa = capas[i];
      g.position.x += dt * capa.velocidad * 1.6;
      if (g.position.x > 9) g.position.x = -9;
      // La opacidad del estrato sigue la niebla REAL de esa cota: bajo El Niño
      // la franja sube y se adelgaza, y estos estratos se adelgazan con ella.
      const d = (capa.msnm - est.optica.franja.cota) / est.optica.franja.sigma;
      const dens = est.optica.franja.amplitud * Math.exp(-d * d);
      g.children[0].material.opacity = capa.opacidad * (0.18 + 0.82 * dens);
    }
  });
  return (
    <group name="descenso-estratos">
      {capas.map((c, i) => (
        <group
          key={c.msnm}
          name={`descenso-estrato-${i + 1}`}
          ref={(o) => {
            grupos.current[i] = o;
          }}
          position={[i * 2.4 - 4, yDeMsnm(c.msnm), 1.2 + i * 0.9]}
        >
          <mesh rotation={[-Math.PI / 2.15, 0, i * 0.7]}>
            <planeGeometry args={[c.escala, c.escala * 0.42]} />
            <meshBasicMaterial
              map={tex}
              transparent
              depthWrite={false}
              opacity={c.opacidad}
              color="#f4f8fb"
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ───────────────────────────── el cielo Sylva ───────────────────────────── */

function CieloSylva({ refEstado, pasos }) {
  const { scene, camera } = useThree();
  const hook = useRef(null);
  const sky = useMemo(() => {
    const s = new SkyImpl();
    s.scale.setScalar(4.5e5);
    s.name = 'descenso-cielo';
    return s;
  }, []);

  useEffect(() => {
    scene.add(sky);
    // Hora dorada baja y lateral, la misma luz que la vista global (§3.2).
    const u = sky.material.uniforms;
    u.turbidity.value = 4.2;
    u.rayleigh.value = 2.0;
    u.mieCoefficient.value = 0.02;
    u.mieDirectionalG.value = 0.82;
    u.sunPosition.value.copy(solDireccion());
    hook.current = crearCieloSylva({
      sky,
      params: {
        expo: 60,
        pasos,
        msnm: 5775,
        escala: 1155, // metros por unidad de mundo: la escala canónica de §2.2
        y0: 0,
        g: 0.76,
        sol: 20,
        halo: 1.7,
        mie: 1,
        rayleigh: 1,
        ozono: 1,
      },
    });
    return () => {
      hook.current?.set(false);
      hook.current = null;
      scene.remove(sky);
      sky.material.dispose();
      sky.geometry.dispose();
    };
  }, [scene, sky, pasos]);

  useFrame(() => {
    const est = refEstado.current;
    const h = hook.current;
    if (!est || !h) return;
    const u = sky.material.uniforms;
    // Los mandos «Preetham» siguen vivos: clima-vivo manda sobre ESTOS mismos.
    u.turbidity.value = est.optica.turbidez;
    u.rayleigh.value = est.optica.rayleigh * 2.6;
    u.mieCoefficient.value = 0.012 + 0.016 * est.optica.mie;
    // EL EFECTO CENTRAL: la altitud del observador entra en la física.
    h.ajustar({ msnm: est.msnm, ozono: est.optica.ozono });
    h.preparar(camera);
  });

  return null;
}

/** Sol bajo y lateral, a la espalda de la cámara en la caída (§3.2). */
function solDireccion() {
  const v = new THREE.Vector3();
  const phi = THREE.MathUtils.degToRad(90 - 14); // 14° sobre el horizonte
  const theta = THREE.MathUtils.degToRad(-38);
  v.setFromSphericalCoords(1, phi, theta);
  return v;
}

/* ─────────────────────────── el piloto del viaje ────────────────────────── */
/*
 * El reloj es `performance.now()` desde el montaje, NO el reloj de r3f: el
 * contrato temporal de la transición son timers deterministas y esta escena
 * tiene que ir sincronizada con ellos aunque el navegador estrangule cuadros.
 */
function Piloto({ plan, fase, humedad, tier, refEstado, onEstado, t0, inicioRef }) {
  const { camera, scene } = useThree();
  /* El instante cero, por orden de precedencia: (1) la ref que comparte el
     host — el cero REAL del viaje, escrito cuando se armaron los timers del
     contrato; (2) un `t0` numérico explícito; (3) el primer cuadro de esta
     escena, que va 400-500 ms tarde porque el módulo se carga perezoso y hay
     que crear el contexto WebGL. Sin (1) el viaje se corta antes del frenazo:
     medido. Leer el reloj en el render sería impuro (react-hooks/purity), por
     eso la resolución ocurre en el primer cuadro. */
  const t0Ref = useRef(0);
  const sol = useMemo(() => solDireccion(), []);
  const dirLuz = useRef(null);
  const hemi = useRef(null);
  const objetivo = useMemo(() => new THREE.Vector3(), []);
  const colorNiebla = useMemo(() => new THREE.Color(), []);
  const colorLuz = useMemo(() => new THREE.Color(), []);
  /* La paleta es la de la casa (`atmosferaMadre.js`): la hora dorada baja y
     lateral que la vista global ya usa. Lo que el descenso agrega no es otra
     paleta, es el RECORRIDO por ella: arriba la luz llega fría y limpia (poca
     atmósfera que la caliente), abajo dorada y tamizada. */
  const FRIA = useMemo(() => new THREE.Color('#e8f2fb'), []);
  const CALIDA = useMemo(() => new THREE.Color(ATMOSFERA.luz), []);
  const NIEBLA_ALTA = useMemo(() => new THREE.Color('#cfe0ea'), []);
  const NIEBLA_BAJA = useMemo(() => new THREE.Color(ATMOSFERA.niebla), []);

  useEffect(() => {
    scene.fog = new THREE.FogExp2('#cfe0ea', 0.012);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  useFrame(() => {
    const ahora = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!t0Ref.current) {
      const compartido = inicioRef?.current;
      t0Ref.current =
        compartido > 0 ? compartido : Number.isFinite(t0) && t0 > 0 ? t0 : ahora;
    }
    const ms = ahora - t0Ref.current;
    const est = estadoDescenso(ms, { plan, fase, humedad, tier });
    refEstado.current = est;

    camera.position.set(est.camara.pos[0], est.camara.pos[1], est.camara.pos[2]);
    objetivo.set(est.camara.objetivo[0], est.camara.objetivo[1], est.camara.objetivo[2]);
    camera.lookAt(objetivo);
    if (camera.fov !== est.camara.fov) {
      camera.fov = est.camara.fov;
      camera.updateProjectionMatrix();
    }

    colorLuz.copy(FRIA).lerp(CALIDA, est.optica.luzCalidez);
    if (dirLuz.current) {
      dirLuz.current.intensity = 1.25 * est.optica.luzIntensidad;
      dirLuz.current.color.copy(colorLuz);
      dirLuz.current.position
        .copy(sol)
        .multiplyScalar(14)
        .add(new THREE.Vector3(0, est.camara.pos[1], 0));
    }
    if (hemi.current) {
      // Dentro de la nube la luz llega de todas partes: sube el hemisférico.
      hemi.current.intensity = 0.72 + 0.5 * est.optica.niebla;
    }
    if (scene.fog) {
      colorNiebla.copy(NIEBLA_ALTA).lerp(NIEBLA_BAJA, est.optica.luzCalidez);
      scene.fog.color.copy(colorNiebla);
      scene.fog.density = est.optica.nieblaDensidad;
    }
    onEstado?.(est);
  });

  return (
    <>
      {/* Misma receta de cuatro luces que la vista global, para que el macizo se
          vea IGUAL en las dos pantallas; lo que cambia por cuadro es la
          intensidad y el color de la principal, y el peso del hemisférico
          cuando se entra en la nube. */}
      <hemisphereLight
        ref={hemi}
        args={[ATMOSFERA.cielo, ATMOSFERA.suelo, 0.85]}
        intensity={0.85}
      />
      <ambientLight intensity={0.32} color="#fff1d6" />
      <directionalLight ref={dirLuz} position={[-12, 6, -4]} intensity={1.25} />
      <directionalLight position={[8, 4, 10]} intensity={0.28} color={ATMOSFERA.relleno} />
    </>
  );
}

/* ───────────────────────────── el montaje ───────────────────────────────── */

/**
 * @param {object}   props
 * @param {object}   props.plan       plan de `planDescenso()` (cota + reloj).
 * @param {string}   props.fase       fase ENSO VIVA ('neutral'|'el_nino'|'la_nina').
 * @param {number}   [props.humedad]  humedad relativa real (0..100) o null.
 * @param {string}   props.tier       'alto'|'medio'|'bajo'.
 * @param {number}   [props.t0]       instante cero explícito (ms de performance.now()).
 * @param {object}   [props.inicioRef] ref al instante cero REAL del viaje, que
 *                                     escribe la transición al armar sus timers.
 *                                     Gana sobre `t0`: sin ella la escena mide
 *                                     desde su propio montaje y llega tarde.
 * @param {Function} [props.onEstado] se llama por cuadro con el estado (rótulo).
 */
export default function EscenaDescensoSierra({
  plan,
  fase = 'neutral',
  humedad = null,
  tier = 'alto',
  t0,
  inicioRef = null,
  onEstado,
}) {
  const perfil = perfilDeTier(tier);
  const refEstado = useRef(null);
  const segmentos = tier === 'alto' ? 96 : tier === 'medio' ? 64 : 40;
  const estratos = tier === 'bajo' ? 3 : 4;
  const pasosCielo = tier === 'bajo' ? 8 : 12; // §10.2: en Mali, 8 pasos

  return (
    <Canvas
      className="tsm__lienzo"
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      camera={{ position: [-1.5, 5.6, -13.2], fov: 48, near: 0.1, far: 900 }}
      frameloop="always"
      data-testid="tsm-lienzo"
    >
      <CieloSylva refEstado={refEstado} pasos={pasosCielo} />
      <Piloto
        plan={plan}
        fase={fase}
        humedad={humedad}
        tier={tier}
        t0={t0}
        inicioRef={inicioRef}
        refEstado={refEstado}
        onEstado={onEstado}
      />
      <Ladera segmentos={segmentos} />
      <MarCaribe />
      <EstratosNube cuantos={estratos} refEstado={refEstado} />
    </Canvas>
  );
}

/* Exportado para el gate: cuántos estratos de nube se montan por tier. Que el
   conteo sea consultable evita «contar nubes a ojo», que es exactamente cómo
   se cuelan los duplicados. */
export function estratosPorTier(tier) {
  return tier === 'bajo' ? 3 : 4;
}
