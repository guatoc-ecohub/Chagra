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
import { useEffect, useMemo, useRef, useState } from 'react';
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
  wzDeAltura,
} from './sierraRelieve.js';
import { estadoDescenso, estadoEnMsnm } from './descensoSierra.js';
import { crearCieloSylva } from './cieloSylva.js';
import { instalarNieblaAltura } from './vendor/nieblaAltura.js';
import { crearBrumaVolumetrica } from './vendor/brumaVolumetrica.js';
import { crearCSM } from './vendor/csmSylva.js';
import { crearFloraDescenso } from './floraDescenso.js';

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

/* Banda de la escarcha en unidades de mundo (1 u = 1 155 m): frío + páramo,
   2 000-4 000 m, con el cruce suave de 170 m del descenso. */
const ESCARCHA_BANDA = { yMin: 2000 / 1155, yMax: 4000 / 1155, cruce: 170 / 1155 };

function Ladera({ segmentos, refEstado = null }) {
  const geo = useMemo(() => construirLadera(segmentos, segmentos), [segmentos]);
  useEffect(() => () => geo.dispose(), [geo]);
  /* EL MANTO DE LA HELADA (DIRECCION-HELADA-20260904 §4.2, §4.5): un término de
     color en el mismo material de la ladera, cero geometría. El peso por vértice
     es banda (frío/páramo) × PLANITUD (n.y): el aire frío drena como agua y se
     empoza en lo plano; la ladera y la cresta quedan limpias. Sin DEM de finca
     acá el «pozo» se simplifica a bandas (§4.2 último punto). El uniform
     `uEscarcha` lo mueve el piloto con `optica.escarcha` (continuo, nunca
     conmuta). Con uEscarcha = 0 la salida es EXACTAMENTE la de antes. */
  const mat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uEscarcha = { value: 0 };
      sh.uniforms.uMantoCol = { value: new THREE.Color('#c9d6e8') }; // manto en sombra (token `manto.sombra`)
      sh.uniforms.uBandaEscarcha = { value: new THREE.Vector3(ESCARCHA_BANDA.yMin, ESCARCHA_BANDA.yMax, ESCARCHA_BANDA.cruce) };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vEscarchaW;\nuniform vec3 uBandaEscarcha;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          {
            float yb = position.y;
            float enBanda = smoothstep(uBandaEscarcha.x - uBandaEscarcha.z, uBandaEscarcha.x + uBandaEscarcha.z, yb)
                          * (1.0 - smoothstep(uBandaEscarcha.y - uBandaEscarcha.z, uBandaEscarcha.y + uBandaEscarcha.z, yb));
            float plano = smoothstep(0.80, 0.97, normal.y);   // potrero plano sí; talud no
            // sin DEM de finca (DIRECCION-HELADA §4.2, último punto) el pozo se simplifica a BANDAS:
            // el manto vive en la BASE de la banda fría/páramo (el aire frío drena hacia abajo)
            float base = 1.0 - smoothstep(uBandaEscarcha.x, uBandaEscarcha.x + 0.5 * (uBandaEscarcha.y - uBandaEscarcha.x), yb);
            vEscarchaW = enBanda * max(plano, 0.6 * base);   // medido 2026-09-04: con 0,35 el domo (sin plano) casi no lo mostraba
          }`,
        );
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vEscarchaW;\nuniform float uEscarcha;\nuniform vec3 uMantoCol;')
        .replace(
          '#include <color_fragment>',
          '#include <color_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, uMantoCol, clamp(uEscarcha * vEscarchaW, 0.0, 1.0) * 0.85);',
        );
      m.userData.shader = sh;
    };
    m.customProgramCacheKey = () => 'descenso-ladera-escarcha';
    return m;
  }, []);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(() => {
    const sh = mat.userData.shader;
    const est = refEstado?.current;
    if (!est) return;
    // el tier decide si el FX existe; la óptica (banda × dato × Niño × (1 − nube)) cuánto
    const forzado = typeof window !== 'undefined' && Number.isFinite(window.__escarchaForzar) ? window.__escarchaForzar : null;   // solo gate
    const k = forzado ?? ('escarcha' in (est.fx || {}) ? est.optica.escarcha || 0 : 0);
    if (sh) sh.uniforms.uEscarcha.value = k;
    // hook del gate (patrón __csm/__cielo): lo que el manto está recibiendo, leído desde afuera
    if (typeof window !== 'undefined') {
      window.__escarcha = {
        k, optica: est.optica.escarcha ?? null, fxTiene: 'escarcha' in (est.fx || {}), shader: !!sh, msnm: est.msnm,
        parche: sh ? { frag: sh.fragmentShader.includes('uMantoCol'), vert: sh.vertexShader.includes('vEscarchaW') } : null,
      };
    }
  });
  return <mesh geometry={geo} material={mat} name="descenso-ladera" receiveShadow />;
}

function MarCaribe() {
  return (
    <mesh position={[0, 0.02, -9]} rotation={[-Math.PI / 2, 0, 0]} name="descenso-mar">
      <planeGeometry args={[52, 22]} />
      <meshLambertMaterial color="#4c93ab" transparent opacity={0.96} />
    </mesh>
  );
}

/* ─────────────────── la niebla estratificada por ALTURA ─────────────────── */
/*
 * `nieblaAltura.js` es el FX que más imagen da por vatio de todo el lote: la
 * densidad exponencial con la altura resuelta en FORMA CERRADA a lo largo del
 * rayo — cero pasos de marcha, ~12 ALU por fragmento. No es un pase ni un mesh:
 * reemplaza los `#include <fog_*>` de `THREE.ShaderChunk`, así que la ladera, el
 * mar y los jirones la heredan a la vez sin tocar un solo material.
 *
 * SE INSTALA EN EL PRIMER RENDER del componente, antes de que monte un solo
 * hijo: three resuelve los `#include` al COMPILAR, y un programa ya compilado no
 * se recompila solo. Instalarlo en un `useEffect` llegaría tarde para la ladera.
 *
 * LOS PARÁMETROS NO SON LOS DEL VALLE, y no podían serlo: allá la escala es
 * 0,6 u/m y el `H = 45 u` del valle son ~75 m de altura de escala. Acá 1 unidad
 * son 1 155 m, así que ese mismo 45 serían 52 km — la capa taparía el planeta.
 * Reescalado a la Sierra: `H = 1,6 u ≈ 1 850 m` (altura de escala del vapor de
 * agua sobre un macizo tropical) y `y0 = 0` = nivel del mar, que es de verdad
 * donde el aire es más denso. Con eso la capa se extingue sola en la cima
 * (a 5 u la densidad cae ×0,044) sin necesidad de apagarla por banda: la física
 * hace la continuidad, que es justo lo que la puerta del Paso 3 exige.
 *
 * ALCANCE, declarado: el parche es GLOBAL al módulo three de la página. El
 * descenso es una toma de pantalla completa y se desinstala al desmontar, pero
 * mientras corre, cualquier material nuevo de otra escena heredaría la capa.
 */
const NIEBLA_SIERRA = { factor: 1.0, escala: 1.6, base: 0 };

/*
 * RESERVA CON CONTEO, y por qué hizo falta: la primera versión instalaba en el
 * primer render y desinstalaba en la limpieza del efecto. En desarrollo React
 * invoca los efectos DOS veces (montar → limpiar → montar), así que la limpieza
 * restauraba los chunks originales y la capa quedaba apagada sin un solo error.
 * Se detectó midiendo: A/B de 24 celdas, diferencia máxima 0 en las 24 — el
 * parche no estaba puesto. Con conteo de referencias, soltar una reserva no
 * desinstala mientras quede otra viva.
 *
 * §10.2 la marca ✅ en los TRES tiers y §10.3 la pone entre las que «nunca se
 * apagan»: es piso mínimo junto con el gradeo y el follaje de masa.
 */
let nieblaRefs = 0;
let nieblaHook = null;
function reservarNieblaAltura(params) {
  nieblaRefs += 1;
  if (!nieblaHook) nieblaHook = instalarNieblaAltura(THREE, params);
  let soltada = false;
  return () => {
    if (soltada) return;
    soltada = true;
    nieblaRefs -= 1;
    if (nieblaRefs <= 0) {
      nieblaHook?.desinstalar();
      nieblaHook = null;
      nieblaRefs = 0;
    }
  };
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

/* ──────────────── la bruma volumétrica: jirones entre las rosetas ───────── */
/*
 * `brumaVolumetrica.js` es el otro miembro del par estrella de la banda 4
 * (§5.1): la niebla de altura pone el MEDIO y la bruma pone los JIRONES, que es
 * lo que hace que el bosque de niebla se lea como fenómeno y no como una banda
 * de color. Cuesta 2 draw calls — uno para todos los jirones, otro para los
 * haces — porque son billboards instanciados con textura fbm de canvas y borde
 * emplumado, no polígonos. Eso importa: el defecto §2.3.3 de la vista global es
 * justamente «nubes que son polígonos de borde duro», y aquí no se puede
 * reincidir.
 *
 * LAS DISTANCIAS SE REESCALAN, como la niebla. Los `cerca [4,14]` y
 * `lejos [50,95]` del valle son metros de cañón; acá 1 unidad son 1 155 m, así
 * que a esos valores la bruma nunca se disolvería ni colapsaría dentro del
 * cuadro. Van divididos para que el jirón se abra al pasarle al lado y se
 * entregue al FogExp2 en la distancia.
 *
 * ANCLAS: al nivel del suelo, sobre la ladera REAL, repartidas por la franja de
 * condensación. La cota del ancla sale de `wzDeAltura`, la misma ley de altura
 * de la vista global — no de un número inventado.
 */
function anclasDeBruma(cuantas, semilla = 47) {
  const anclas = [];
  let s = semilla >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < cuantas; i++) {
    // Repartidas por la franja 3 200 → 1 900 m: páramo alto, bosque de niebla y
    // el borde de la selva. Es donde la nube vive de verdad.
    const msnm = 3200 - (1300 * i) / Math.max(1, cuantas - 1);
    const y = yDeMsnm(msnm);
    const wz = wzDeAltura(y, 0);
    if (wz == null) continue;
    const x = (rnd() - 0.5) * 9;
    anclas.push({ x, y: alturaSierra(x, wz), z: wz + (rnd() - 0.5) * 0.7 });
  }
  return anclas;
}

function BrumaDescenso({ refEstado, jirones, haces }) {
  const { scene } = useThree();
  const api = useRef(null);
  useEffect(() => {
    if (jirones <= 0) return undefined;
    const b = crearBrumaVolumetrica(THREE, {
      puntos: anclasDeBruma(Math.max(6, Math.round(jirones / 8))),
      jirones,
      haces,
      solDir: solDireccion(),
      seed: 47,
      dispersion: 0.8,
      cerca: [0.3, 1.2],
      lejos: [4.5, 9.5],
      intensidad: 0,
      color: 0xdce7e2,
    });
    b.grupo.name = 'descenso-bruma';
    scene.add(b.grupo);
    api.current = b;
    return () => {
      scene.remove(b.grupo);
      api.current = null;
    };
  }, [scene, jirones, haces]);

  useFrame((_, dt) => {
    const est = refEstado.current;
    const b = api.current;
    if (!est || !b) return;
    b.tick(Math.min(dt, 0.1));
    /* El peso de banda dice SI la bruma vive en esta cota; la niebla óptica
       dice CUÁNTA hay ahí, y ésa ya trae dentro El Niño (la franja sube y se
       adelgaza) y la humedad real. Multiplicarlas es lo que hace que el jirón
       se comporte como el fenómeno y no como un interruptor. */
    b.setIntensidad((est.fx.bruma ?? 0) * est.optica.niebla);
  });

  return null;
}

/* ─────────── CSM: la sombra en cascada de la hora dorada baja ───────────── */
/*
 * §5.1 pide `csmSylva` desde la banda 1 hasta la 6. Acá el que proyecta es EL
 * MACIZO SOBRE SÍ MISMO: con el sol a 14° la ladera de sotavento se apaga y las
 * quebradas se dibujan, que es la lectura de relieve que el sombreado Lambert
 * por normales no da. Sin flora todavía no hay otro proyector, y eso es honesto
 * decirlo: hoy CSM aporta autosombra de terreno, no sombra de árboles.
 *
 * §10.2 lo reparte alto = 2 cascadas · medio = 1 · bajo = ❌ (1 280 KB de mapa
 * es mucho para un Mali). Acá el módulo trae sus 2 cascadas fijas, así que el
 * reparto por tier es encendido/apagado, no número de cascadas — se declara.
 */
function CSMDescenso({ activo, luzRef }) {
  const { scene, gl, camera } = useThree();
  const api = useRef(null);
  useEffect(() => {
    if (!activo || !luzRef.current) return undefined;
    const terreno = scene.getObjectByName('descenso-ladera');
    if (terreno) {
      terreno.castShadow = true;
      terreno.receiveShadow = true;
    }
    const csm = crearCSM(THREE, {
      scene,
      renderer: gl,
      sunLight: luzRef.current,
      camera,
      terrainGroup: terreno ?? undefined,
    });
    api.current = csm;
    if (typeof window !== 'undefined') window.__csm = csm;
    return () => {
      csm.dispose();
      if (terreno) terreno.castShadow = false;
      gl.shadowMap.enabled = false;
      api.current = null;
      if (typeof window !== 'undefined' && window.__csm === csm) delete window.__csm;
    };
  }, [activo, scene, gl, camera, luzRef]);
  useFrame(() => api.current?.update(camera));
  return null;
}

/* ─────────────────────────── la vegetación ──────────────────────────────── */
/*
 * El anillo de cercanía de `floraDescenso.js`. Va DESPUÉS de la ladera en el
 * árbol porque necesita que `descenso-ladera` exista para apoyarse en la misma
 * ley de altura, y se actualiza por cuadro con el estado completo — la mezcla
 * de arquetipos sale de los pesos CONTINUOS de banda, así que cruzar de banda
 * no conmuta nada.
 */
function FloraDescenso({ refEstado, tier, densidad }) {
  const { scene } = useThree();
  const api = useRef(null);
  useEffect(() => {
    if (densidad <= 0) return undefined;
    const f = crearFloraDescenso({ escena: scene, tier, densidad, semilla: 7 });
    api.current = f;
    if (typeof window !== 'undefined') window.__floraDescenso = f;
    return () => {
      f.dispose();
      api.current = null;
      if (typeof window !== 'undefined' && window.__floraDescenso === f) {
        delete window.__floraDescenso;
      }
    };
  }, [scene, tier, densidad]);
  useFrame(() => {
    const est = refEstado.current;
    if (est && api.current) api.current.actualizar(est);
  });
  return null;
}

/* ───────────────────────────── el cielo Sylva ───────────────────────────── */

function SondaGate() {
  /* El gate del Pixel lee `window.__r` para estampar el renderer REAL en la
     evidencia. Sin esto, «medido en Mali» es una afirmación, no un dato.
     Y `window.__gpuMs` existe porque EL MEDIDOR MINTIÓ: contar cuadros con
     `requestAnimationFrame` da 59,2 fps en el Pixel tanto a DPR 4 (5,2 Mpx)
     como a DPR 8 (20,9 Mpx por cuadro), que es físicamente imposible en un
     Mali-G78. Por encima de vsync el contador de rAF se satura y deja de
     medir el render. `__gpuMs` dibuja a mano y SINCRONIZA con `finish()` +
     un `readPixels` de 1 px, así que devuelve tiempo de GPU de verdad. */
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.__r = gl;
    window.__THREE = THREE; // el gate necesita ver el ShaderChunk vivo
    /* `__pr` es la sonda que el A/B del Pixel estampa en cada muestra. Sin ella
       una corrida a «dpr=4» puede no estar dibujando a 4: el instrumento miente
       antes que el sujeto, y ya pasó — dos corridas a DPR distinta dieron el
       mismo número porque la DPR no se estaba aplicando. */
    window.__pr = () => {
      const s = gl.getSize(new THREE.Vector2());
      const r = gl.info.render;
      return {
        dpr: gl.getPixelRatio(),
        css: [s.x, s.y],
        buffer: [gl.domElement.width, gl.domElement.height],
        drawCalls: r.calls,
        triangulos: r.triangles,
      };
    };
    const px = new Uint8Array(4);
    window.__gpuMs = (n = 40) => {
      const ctx = gl.getContext();
      const ms = [];
      gl.render(scene, camera); // calienta: compilación fuera de la muestra
      ctx.finish();
      for (let i = 0; i < n; i++) {
        const t0 = performance.now();
        gl.render(scene, camera);
        ctx.finish();
        // `finish()` solo no basta en ANGLE: el readPixels de 1 px fuerza la
        // sincronía de verdad (el driver no puede devolverlo sin haber pintado).
        ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
        ms.push(performance.now() - t0);
      }
      ms.sort((a, b) => a - b);
      const q = (f) => ms[Math.min(n - 1, Math.floor(n * f))];
      return { n, min: ms[0], p50: q(0.5), p95: q(0.95), max: ms[n - 1] };
    };
    return () => {
      if (window.__r === gl) delete window.__r;
      if (window.__pr) delete window.__pr;
      if (window.__gpuMs) delete window.__gpuMs;
    };
  }, [gl, scene, camera]);
  return null;
}

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

/*
 * GATE: forzar un FX a 0 o a 1 sin tocar la coreografía. Sirve para el A/B
 * PAREADO — misma cota, mismo cuadro, el FX es la ÚNICA diferencia. Sin esto
 * el «costo» de un efecto se mide contra otra escena y no vale nada.
 */
function aplicarFxForzado(fx, { on = [], off = [] } = {}) {
  for (const k of on) if (k in fx) fx[k] = 1;
  for (const k of off) if (k in fx) fx[k] = 0;
  return fx;
}

/* ─────────────────────────── el piloto del viaje ────────────────────────── */
/*
 * El reloj es `performance.now()` desde el montaje, NO el reloj de r3f: el
 * contrato temporal de la transición son timers deterministas y esta escena
 * tiene que ir sincronizada con ellos aunque el navegador estrangule cuadros.
 */
function Piloto({ plan, fase, humedad, tier, refEstado, onEstado, t0, inicioRef, msnmFijo = null, fxForzado = null, luzRef = null, helada = null }) {
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
    /* GATE: con `msnmFijo` el viaje se CONGELA en una cota. Es lo que hace
       atribuible la medición en el Mali — «el descenso entero» mezcla siete
       bandas en un solo número que no dice de quién es el costo. El viaje real
       no lo usa nunca (default null). */
    const est =
      msnmFijo == null
        ? estadoDescenso(ms, { plan, fase, humedad, tier, helada })
        : estadoEnMsnm(msnmFijo, { fase, humedad, tier, helada });
    if (fxForzado) aplicarFxForzado(est.fx, fxForzado);
    refEstado.current = est;

    camera.position.set(est.camara.pos[0], est.camara.pos[1], est.camara.pos[2]);
    objetivo.set(est.camara.objetivo[0], est.camara.objetivo[1], est.camara.objetivo[2]);
    camera.lookAt(objetivo);
    // El Canvas crea una PerspectiveCamera (fov 48) y el tween de fov solo
    // tiene sentido ahí; el instanceof lo declara en tipos, no en un cast.
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== est.camara.fov) {
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
      // Este componente monta FogExp2; la densidad solo existe en esa clase.
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.density = est.optica.nieblaDensidad;
      }
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
      <directionalLight
        ref={(o) => {
          dirLuz.current = o;
          if (luzRef) luzRef.current = o;
        }}
        position={[-12, 6, -4]}
        intensity={1.25}
      />
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
 * ── Arnés de medición móvil (gate paso 7, PR #3103) ──────────────────────
 * @param {number|null}  [props.msnmFijo]       cota en msnm que CONGELA el viaje
 *                                              (gate en terreno); null = libre.
 * @param {object|null}  [props.fxForzado]      fx impuestos `{ on: string[], off: string[] }`
 *                                              (ver aplicarFxForzado); null = natural.
 * @param {number}       [props.densidadFlora]  0..1, escala las instancias de flora (def 1).
 * @param {number|null}  [props.dprForzada]     devicePixelRatio impuesto por el arnés.
 * @param {number|null}  [props.cieloPasos]     pasos del cielo Sylva; null = por tier.
 * @param {boolean}      [props.conNieblaAltura] reserva de niebla por altura (def true).
 * @param {boolean}      [props.conBruma]       jirones de bruma encendidos (def true).
 * @param {boolean|null} [props.conCSM]         fuerza CSM (`?csm=1`); null = apagado
 *                                              (veredicto medido, ver §5.1 abajo).
 * @param {object|null}  [props.helada]         gate único de la helada de la finca
 *                                              (`{ nivel, intensidad }` de `hayHelada`);
 *                                              null = sin dato → solo «aviso» bajo Niño.
 */
export default function EscenaDescensoSierra({
  plan,
  fase = 'neutral',
  humedad = null,
  tier = 'alto',
  t0,
  inicioRef = null,
  onEstado,
  msnmFijo = null,
  fxForzado = null,
  densidadFlora = 1,
  dprForzada = null,
  cieloPasos = null,
  conNieblaAltura = true,
  conBruma = true,
  conCSM = null,
  helada = null,
}) {
  const perfil = perfilDeTier(tier);
  /* La reserva se toma en el PRIMER render de este componente — antes de que
     monte ningún hijo y, por tanto, antes de que se compile un solo material.
     Es el único punto del ciclo de React donde el parche llega a tiempo:
     three resuelve los `#include` al compilar y un programa ya compilado no se
     recompila solo. El efecto toma su propia reserva y suelta la del render,
     de modo que el saldo neto sea 1 mientras la escena viva y 0 al desmontar. */
  const soltarRender = useRef(null);
  // La lectura del ref EN RENDER es deliberada (ver párrafo de arriba): la reserva
  // tiene que existir antes de que three compile el primer material.
  // eslint-disable-next-line react-hooks/refs
  if (soltarRender.current === null && conNieblaAltura !== false) {
    soltarRender.current = reservarNieblaAltura(NIEBLA_SIERRA);
  }
  useEffect(() => {
    const soltar = conNieblaAltura !== false ? reservarNieblaAltura(NIEBLA_SIERRA) : null;
    soltarRender.current?.();
    soltarRender.current = null;
    return () => soltar?.();
  }, [conNieblaAltura]);
  const refEstado = useRef(null);
  const luzPrincipal = useRef(null);
  const segmentos = tier === 'alto' ? 96 : tier === 'medio' ? 64 : 40;
  const estratos = tier === 'bajo' ? 3 : 4;
  /* §10.2: alto = jirones + haces · medio = solo jirones · bajo = jirones a la
     mitad de densidad. Nunca se apaga del todo — es lo que sostiene la banda 4. */
  const jironesBruma = conBruma === false ? 0 : tier === 'alto' ? 88 : tier === 'medio' ? 56 : 30;
  /* HACES = 0 EN TODOS LOS TIERS, y no es economía: es un defecto MIRADO. Con
     los haces encendidos la banda 4 sale con franjas verticales pálidas de
     borde recto que cruzan el CIELO por encima del macizo, donde no hay bruma
     ninguna. Es exactamente el defecto §2.3.2 que este mismo plan le reprocha a
     la vista global («cuña translúcida con bordes rectos duros… lee como fuga
     de luz, no como marcador»). Los haces de Sylva están calibrados para un
     dosel de bosque a metros de la cámara; a 1 155 m por unidad no hay dosel
     que los recorte y quedan como rayas. Los jirones SÍ se quedan: son el
     fenómeno. Evidencia cruda: `desk-bruma-1.png` (con haces) del gate. */
  const hacesBruma = 0;
  /*
   * CSM APAGADO POR DEFECTO, y es un veredicto medido, no economía. §5.1 lo
   * pide de la banda 1 a la 6, pero hoy en el descenso NO HAY QUIEN PROYECTE:
   * la ladera es un domo suave que el término Lambert ya oscurece en el lado de
   * sotavento, y las instancias de flora todavía no llevan `castShadow`. El A/B
   * pareado a 3 600 m da diferencia máxima de 3 niveles sobre 24 celdas — o sea
   * nada — a cambio de 1 280 KB de mapa de sombras y dos pasadas extra
   * (+0,4 ms, dentro del ruido pero no gratis). Se enciende cuando la flora
   * proyecte: ahí sí tiene de qué hacer sombra. `?csm=1` lo fuerza.
   */
  const csmActivo = conCSM ?? false;
  const pasosCielo = cieloPasos ?? (tier === 'bajo' ? 8 : 12); // §10.2: en Mali, 8 pasos

  return (
    <Canvas
      className="tsm__lienzo"
      dpr={dprForzada ?? perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      camera={{ position: [-1.5, 5.6, -13.2], fov: 48, near: 0.1, far: 900 }}
      frameloop="always"
      data-testid="tsm-lienzo"
    >
      <SondaGate />
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
        msnmFijo={msnmFijo}
        fxForzado={fxForzado}
        luzRef={luzPrincipal}
        helada={helada}
      />
      <Ladera segmentos={segmentos} refEstado={refEstado} />
      <MarCaribe />
      <EstratosNube cuantos={estratos} refEstado={refEstado} />
      <BrumaDescenso refEstado={refEstado} jirones={jironesBruma} haces={hacesBruma} />
      <CSMDescenso activo={csmActivo} luzRef={luzPrincipal} />
      <FloraDescenso refEstado={refEstado} tier={tier} densidad={densidadFlora} />
    </Canvas>
  );
}

/* Exportado para el gate: cuántos estratos de nube se montan por tier. Que el
   conteo sea consultable evita «contar nubes a ojo», que es exactamente cómo
   se cuelan los duplicados. */
export function estratosPorTier(tier) {
  return tier === 'bajo' ? 3 : 4;
}
