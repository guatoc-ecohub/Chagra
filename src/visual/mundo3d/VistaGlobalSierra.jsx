/*
 * VistaGlobalSierra — la MONTAÑA MAESTRA: la Sierra Nevada de Santa Marta
 * emergiendo del Caribe como portada y mapa vertical de todo Chagra.
 *
 * Es el establishing shot de más alto calibre del mundo 3D: el único macizo
 * litoral que reúne TODOS los pisos térmicos, del mar a la nieve perpetua en
 * ~42 km. Aquí se lee el gradiente altitudinal que estructura al agente y al
 * grafo (cross_thermal): playa y bosque seco → selva húmeda → bosque de niebla
 * → páramo y frailejones → superpáramo → nieve. La silueta es reconocible:
 * cumbres nevadas (Cristóbal Colón · Simón Bolívar), el **Pico Simmonds** al
 * flanco, **Palomino** al pie sobre el Caribe, y el mar abierto al norte.
 *
 * ── TERRITORIO SAGRADO Y HABITADO (regla no negociable, DR cultural) ────────
 * La Sierra es el Corazón del Mundo para los pueblos Kogui, Arhuaco (Iku),
 * Wiwa y Kankuamo, dentro de la Línea Negra. NO es un decorado. Esta escena la
 * representa con dignidad y sobriedad: reverencia, no exotización. Cero
 * iconografía ceremonial (poporo, tejidos rituales, sitios de pagamento), cero
 * "tierra vacía", cero estética mística de adorno. Un pie de texto acredita a
 * los cuatro pueblos SIEMPRE (viaja con la escena: DOM en el modo con Canvas,
 * `Html` en el grupo componible). Cualquier uso público de identidad cultural
 * exige consulta y consentimiento previo, libre e informado (CLPI) con la CIT y
 * las autoridades tradicionales — es decisión de producto, no de esta escena.
 *
 * ── LO QUE TRAJO EL MUNDO COSTERO (2026-09-05, FABLE-SIERRA-COSTERO) ────────
 * El operador puso la vara en `mundo-costero.guatoc.co` («ESTAMOS LEJOS»). De
 * ese mundo se trajeron, adaptadas a esta escala (1 u = 1 155 m):
 *   · el MAR: `sierra/marSierra.js` (la superficie Gerstner de `costero/Mar.js`
 *     hecha escalable) — banda turquesa de la plataforma, rompiente sobre la
 *     costa, chispeo del sol, fresnel del MISMO cielo del domo. Y su segunda
 *     instancia en modo espejo: dos LAGUNAS DE PÁRAMO (Naboba, Sintana);
 *   · la COSTA con forma y el LECHO marino: `sierra/sierraRelieve.js` (costaZ,
 *     plataforma, promontorio de Tayrona, delta de Palomino), ley ÚNICA que
 *     esta vista ahora IMPORTA (murió la copia local);
 *   · las CRESTAS: ruido simplex `ridged` del `RNG.js` del costero en la ley
 *     de altura — cordales y vaguadas en vez de tres gaussianas lisas;
 *   · el CIELO como función (`sierra/aireSierra.js`): domo HDR que reproduce
 *     los colores ya afinados, con el sol donde la luz viene, y BRUMA POR
 *     ALTURA (la capa húmeda de los alisios abajo, cumbre nítida arriba)
 *     inyectada en terreno, nubes y mar: un solo aire;
 *   · las NUBES con volumen (`sierra/nubesSierra.js`): cúmulos de geometría
 *     iluminados por la escena, base plana en su cota, sombra sobre la ladera
 *     en tier alto — cúmulos de alisios sobre el Caribe (cuántos y a qué base
 *     lo decide la fase ENSO) y orográficas en la franja de condensación;
 *   · SOMBRAS proyectadas (solo `perfil.sombras`, tier alto): el sol bajo
 *     modela las crestas y las nubes marcan la ladera.
 *
 * ── RENDIMIENTO (gama baja + offline, DR render §B/§6) ──────────────────────
 * Terreno 100% procedural (heightmap por función determinista; cero DEM/GLTF/
 * HDR remoto → cachea limpio en el service worker). Presupuesto por `tier`:
 *   alto  → terreno 96², mar calidad 2, 15 nubes, sombras, bruma por altura;
 *   medio → terreno 48², mar calidad 1, 10 nubes, sin sombras, bruma;
 *   bajo  → terreno 32², mar calidad 0, 7 nubes, sin sombras, sin bruma.
 * El sombreado es SUAVE en todos los tiers (el costero es suave; las facetas
 * leían como decorado — tensión T4 del informe anterior, resuelta hacia el
 * mandato de realismo). `reducedMotion` congela mar/nubes y pasa a `demand`.
 * 🔴 Costo en Mali-G78: ver el informe del carril (medido en el Pixel 6 Pro).
 *
 * ── EXPORTS ─────────────────────────────────────────────────────────────────
 *   default  VistaGlobalSierra  → escena montable con su propio <Canvas> + pie
 *                                 de crédito DOM + clave de pisos accesible.
 *   named    SierraDiorama      → grupo r3f puro para COMPONER dentro de otro
 *                                 <Canvas> (trae luces/niebla/crédito por props).
 *
 * ── CABLEO (lo hace el host / otra fable / Opus; este archivo NO toca App.jsx
 *    ni mundoData.js) ─────────────────────────────────────────────────────────
 *
 *   import VistaGlobalSierra from './visual/mundo3d/VistaGlobalSierra.jsx';
 *   <VistaGlobalSierra tier={tier} reducedMotion={reducedMotion} pisoUsuario="frio" />
 *
 *   import { SierraDiorama } from './visual/mundo3d/VistaGlobalSierra.jsx';
 *   <Canvas camera={{ position: [-1.5, 6.6, -12.8], fov: 48 }} shadows>
 *     <SierraDiorama tier={tier} reducedMotion={reducedMotion} />
 *   </Canvas>
 *
 * El contenedor padre define el alto (como `.mundo-root`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { ATMOSFERA_SIERRA, SOL_SIERRA, RELLENO_SIERRA } from './sierra/luzSierra.js';
import { perfilDeTier } from './deviceTier.js';
import PisosTermicosBandas from './PisosTermicosBandas.jsx';
import TransicionSierraMundo from './TransicionSierraMundo.jsx';
import { BANDAS_SIERRA, CLAVE_PISOS_SIERRA, PISOS_TERMICOS_SIERRA, altitudFincaValida, bandaDeMsnm } from './pisosTermicos.js';
import { franjaCondensacion, leerGateDescenso } from './sierra/descensoSierra.js';
import {
  NIEVE, anadirAtributoNieve, crearInyectorNieve, muestreadorFacetas, contornoNivel, geometriaCinta, texturaCinta,
} from './sierra/nieveSierra.js';
import {
  alturaSierra, alturaFaldon, ruido, smoothstep, CIMA, COSTA_Z, ANCHO, FONDO, LAGUNAS_PARAMO, exposicionMar, pesoPromontorio, yDeMsnm,
} from './sierra/sierraRelieve.js';
import { atmosferaLinealSierra, crearMaterialDomo, crearInyectorBruma, BRUMA_SIERRA } from './sierra/aireSierra.js';
import { MarSierra, PERFIL_PLAYA, PERFIL_PARAMO } from './sierra/marSierra.js';
import { NUBES_POR_TIER, nubesAlisios, nubesOrograficas, nubesInterior, geometriaCumulos } from './sierra/nubesSierra.js';
import { faseEnsoViva } from './sierra/aterrizajeDescenso.js';
import { datoPisoPorId, TOTAL_ESPECIES_CATALOGO } from '../../services/sierraPisosDatos.js';
import useClima3DVivo from '../../hooks/useClima3DVivo.js';

/* ── Geografía del macizo: la ley de altura, la costa y las cotas viven en
      `sierra/sierraRelieve.js` (una sola montaña para la vista global, el
      descenso y la bóveda). Aquí solo los puntos de referencia de los rótulos. ── */
const CUMBRE = { x: -0.4, y: 5.0, z: 4.1 }; // Colón · Bolívar (gemelas nevadas)
const SIMMONDS = { x: 2.9, y: 4.36, z: 2.9 };
const PALOMINO = { x: 5.0, y: 0.2, z: -2.85 }; // desembocadura sobre el Caribe

/* Resolución del terreno por tier. Con crestas reales (paso ≈ 2,4 u y dos
   octavas más finas) y una costa con bahías de ~2 u, los 56² de antes daban
   0,39 u por segmento: las vaguadas no se resolvían. Indexada y suave: 96² son
   9,4 k vértices (los 56² de-indexados con flat shading eran 19 k). */
const SEGMENTOS_SIERRA = { alto: 96, medio: 48, bajo: 32 };
const CALIDAD_MAR = { alto: 2, medio: 1, bajo: 0 };

/* ── Banding de pisos térmicos por altitud. El bosque de niebla es la banda
      donde se enganchan las nubes.

      🔴 UNIFICADO (2026-09-02): las 7 bandas —cota, nombre y COLOR— salen
      enteras de `BANDAS_SIERRA` (`pisosTermicos.js`). La separación entre
      bandas se afina angostando el smoothstep (para que se lean 7, no 3).

      🔴 EL ORDEN IMPORTA: `BANDAS_SIERRA` llega MAR→CIMA con `Infinity` de
      último, que es justo lo que `colorPorAltura` necesita para avanzar. ── */
/* 2026-09-04 (arte): la NIEVE ya no es color de vértice: el casquete va como capa
   con luz propia (`aNieve` + `inyectarNieve`, ver sierra/nieveSierra.js). Lo que
   queda de vértice en la banda nival es la ROCA entre parches. */
const BANDAS = BANDAS_SIERRA.map((b, i, arr) => ({
  tope: b.tope,
  c: new THREE.Color(i === arr.length - 1 ? NIEVE.roca : b.hexColor),
}));
/* La línea de hielo CANÓNICA (4 800 m = tope del superpáramo): hasta aquí llegaba. */
const LINEA_HIELO = BANDAS_SIERRA.find((b) => b.id === 'superparamo')?.tope ?? 4.15;
/* La dirección del sol de la hora dorada (= la posición de la direccional principal). */
const SOL_DIR = SOL_SIERRA;
/* UNA sola instancia de cada inyector: r3f no recompila el material si la identidad no cambia. */
const inyectarNieve = crearInyectorNieve({ lineaHielo: LINEA_HIELO });
const inyectarBruma = crearInyectorBruma(BRUMA_SIERRA);
const inyectarNieveYBruma = (sh) => { inyectarNieve(sh); inyectarBruma(sh); };

/* El GROSOR de la transición entre bandas. Interior: angosto (~±0.09 world Y)
   para que cada piso se lea separado. La línea de nieve (última) MUCHO más
   angosta (±0.02): un filo nevado nítido, no un difuminado ocre. */
function colorPorAltura(y, out) {
  let i = 0;
  while (i < BANDAS.length - 1 && y > BANDAS[i].tope) i++;
  if (i === 0) return out.copy(BANDAS[0].c);
  const borde = BANDAS[i - 1].tope;
  const esNieve = i === BANDAS.length - 1;
  const ancho = esNieve ? 0.02 : 0.09;
  const t = smoothstep(borde - ancho, borde + ancho, y); // filo nítido por banda
  return out.lerpColors(BANDAS[i - 1].c, BANDAS[i].c, t);
}

/* Lo que NO es un piso térmico y el costero pinta aparte (paleta de
   `TerrenoCostero.js`): la arena bajo el agua (más oscura que la seca: la
   lección del costero contra la «manta blanca» somera), el lecho hondo, la
   roca del promontorio y la turba del fondo de las lagunas. */
const PALETA_COSTA = {
  arenaSumergida: new THREE.Color('#9c855a'),
  lechoHondo: new THREE.Color('#5f6a58'),
  roca: new THREE.Color('#8d8578'),
  rocaOscura: new THREE.Color('#6e6858'),
  lechoLaguna: new THREE.Color('#3a3b2c'),
  morrena: new THREE.Color('#77715f'),
};

/* La clave de pisos accesible (DOM del modo con Canvas). */
const CLAVE_PISOS = CLAVE_PISOS_SIERRA;

/* Altitud representativa de cada piso (world Y), para el marcador "usted". */
const PISOS_Y = {
  calido: 0.6, templado: 1.4, frio: 2.2, paramo: 3.0, superparamo: 3.9, nival: 4.6,
};

/* MOTEADO del manto (2026-09-05, arte): un dosel no es un degradado liso. Una
   modulación de VALOR por vértice, determinista (el mismo `ruido` del relieve, a
   otra escala), ±10 % en los bosques, menos en los pisos abiertos, nada en la
   arena ni bajo el mar. Cero costo: se hornea en el color de vértice. */
function amplitudMoteado(y) {
  if (y < 0.12) return 0; // arena a ras del mar y fondo marino
  if (y < BANDAS[0].tope) return 0.04; // playa
  if (y < BANDAS[3].tope) return 0.1; // bosque seco · selva húmeda · bosque de niebla
  if (y < BANDAS[4].tope) return 0.07; // páramo: pajonal y frailejonal
  if (y < BANDAS[5].tope) return 0.06; // superpáramo: roca, cojines y líquenes
  return 0.05; // la roca nival entre parches
}

/* Color de un vértice: la ley de bandas más lo que el costero pinta aparte. */
function colorVertice(wx, wz, y, c) {
  if (y < 0) {
    // lecho marino: arena sumergida → más parda y verdosa al hondo
    c.copy(PALETA_COSTA.arenaSumergida).lerp(PALETA_COSTA.lechoHondo, smoothstep(0.006, 0.08, -y));
    return c;
  }
  colorPorAltura(y, c);
  // roca del promontorio (Tayrona), por zona y por altura sobre la playa
  const pp = pesoPromontorio(wx);
  if (pp > 0.02) {
    const r = ruido(wx * 3.1, wz * 3.1) > 0 ? PALETA_COSTA.roca : PALETA_COSTA.rocaOscura;
    c.lerp(r, Math.min(1, pp * 1.2 * smoothstep(0.03, 0.14, y)));
  }
  // las lagunas de páramo: morrena OSCURA en el anillo (roca y turba, no pajonal
  // claro: el labio claro se leía como un ala blanca, medido al 300 %) y turba en el fondo
  for (const L of LAGUNAS_PARAMO) {
    const rl = Math.hypot(wx - L.x, wz - L.z);
    if (rl < L.radio * 1.45) {
      c.lerp(PALETA_COSTA.morrena, 0.75 * smoothstep(L.radio * 1.45, L.radio * 1.1, rl));
      if (y < L.nivel) c.lerp(PALETA_COSTA.lechoLaguna, smoothstep(0.003, 0.02, L.nivel - y));
    }
  }
  const m = 1 + amplitudMoteado(y) * ruido(wx * 2.2 + 1.3, wz * 2.2 - 0.6);
  c.multiplyScalar(m);
  return c;
}

/* Construye la malla del terreno en coordenadas de mundo (indexada, normales suaves). */
function construirTerreno(segX, segZ) {
  const nx = segX + 1, nz = segZ + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / segZ;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / segX;
      const y = alturaSierra(wx, wz);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      colorVertice(wx, wz, y, c);
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * nx + ix, b = a + 1, d = a + nx, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  anadirAtributoNieve(geo, alturaSierra, { lineaHielo: LINEA_HIELO, sol: SOL_DIR });   // el casquete
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/* EL FALDÓN (2026-09-05): la ley de altura es analítica y global, así que el
   macizo CONTINÚA fuera de la malla principal en una malla barata (1 u por
   segmento, solo el anillo exterior: ~2,7 k triángulos) que cae hacia el valle
   del Cesar. Antes el borde de la malla cortaba la ladera en seco contra el
   cielo (medido arriba a la izquierda). Sin nieve ni curvas: es fondo hazado. */
function construirFaldon() {
  const X1 = 22, Z1 = 20, PASO = 1;                 // exterior: [-22,22]×[-20,20]
  const IX = ANCHO / 2, IZ = FONDO / 2;             // interior (la malla principal)
  const nx = Math.round((2 * X1) / PASO) + 1, nz = Math.round((2 * Z1) / PASO) + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -Z1 + iz * PASO;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -X1 + ix * PASO;
      const y = alturaFaldon(wx, wz);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      colorVertice(wx, wz, y, c);
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  const dentro = (x, z) => x > -IX - 1e-6 && x < IX + 1e-6 && z > -IZ - 1e-6 && z < IZ + 1e-6;
  for (let iz = 0; iz < nz - 1; iz++) {
    for (let ix = 0; ix < nx - 1; ix++) {
      const x0 = -X1 + ix * PASO, z0 = -Z1 + iz * PASO;
      // una celda se omite solo si sus CUATRO esquinas caen dentro de la malla principal
      if (dentro(x0, z0) && dentro(x0 + PASO, z0) && dentro(x0, z0 + PASO) && dentro(x0 + PASO, z0 + PASO)) continue;
      const a = iz * nx + ix, b = a + 1, d = a + nx, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/* La atmósfera en radiancia lineal HDR, UNA vez: la comparten el domo y las aguas. */
let _atm = null;
const atmosfera = () => (_atm ??= atmosferaLinealSierra());

/* EL MAR CARIBE y LAS LAGUNAS DE PÁRAMO (2026-09-05, del costero): la misma
   superficie, dos perfiles. El mar en calidad por tier; las lagunas en modo
   espejo (uEscalaOla 0,07, perfil de turba, espuma casi nula), nunca por encima
   de calidad 1. `reducedMotion` congela el reloj del agua. */
/** @param {{ calidad: 0|1|2, conBruma: boolean, reducedMotion: boolean }} props */
function AguasSierra({ calidad, conBruma, reducedMotion }) {
  const aguas = useMemo(() => {
    const atm = atmosfera();
    const bruma = conBruma ? BRUMA_SIERRA : { densidad: 0, alturaEscala: 1, color: BRUMA_SIERRA.color };
    const mar = new MarSierra({
      alturaFn: alturaSierra, fetchFn: exposicionMar,
      tam: ANCHO, nivel: 0, margen: 20, seg: 48, escala: 10, calidad,
      zAguaFuera: COSTA_Z - 0.4,    // fuera del mapa el Caribe sigue al E y al O; al sur, tierra
      escalaRizo: 1.5, chispa: 0, grano: 0.12,  // el chispeo de textura se apaga (celosía al 300 %); grano procedural
      suavizarN: 0.55, cabrillas: 0.08, trenesFragment: 2, // de avión: dos trenes largos = líneas de mar de fondo; borregos del alisio
      escalaRompe: 0.12,            // la ola rompe a 1,3× su altura de fondo REAL: la ventana no se exagera ×10
      rugDistancia: 0.00012,        // el brillo del sol no se ensancha hasta blanquear el mar (costero: 0.0004)
      resCampo: calidad >= 2 ? 512 : 256,
      perfil: PERFIL_PLAYA,
      // más cuerpo de agua en lo somero (el costero: sin esto la playa tendida
      // salía como arena blanca mojada hasta 45 m mar adentro)
      // detalle 0: a escala de avión el rizado de textura (periodo 12 px) dibujaba una
      // CELOSÍA (medido al 300 %); la normal es Gerstner suavizado + estadística GGX
      escalares: { turbiedad: 1.35, causticas: 0.5, detalle: 0 },
      atmosfera: atm, bruma, semilla: 21,
      debug: Number(new URLSearchParams(globalThis.location?.search ?? '').get('marDebug') ?? 0),   // solo el gate
    });
    const lagunas = LAGUNAS_PARAMO.map((L, i) => new MarSierra({
      // fuera de su cuenco la altura se clava en TIERRA: el campo jamás inventa agua ladera abajo
      // fuera del ESPEJO (1,02 R) la altura se clava en TIERRA: sin dique, la ladera
      // aguas abajo queda bajo el nivel y el campo inventaba una lámina ladera abajo
      alturaFn: (x, z) => (Math.hypot(x - L.x, z - L.z) > L.radio * 1.02 ? L.nivel + 0.02 : alturaSierra(x, z)),
      tam: L.radio * 3.2, nivel: L.nivel, margen: 0, seg: 16, escala: 10,
      centro: { x: L.x, z: L.z }, resCampo: 128,
      profExterior: -2,          // fuera del mapa: TIERRA (recorta la lámina)
      zAguaFuera: -Infinity, escalaRizo: 1.5, chispa: 0, suavizarN: 0.7,
      escalaOla: 0.07,           // casi quieta: espejo
      calidad: /** @type {0|1|2} */ (Math.min(calidad, 1)),
      perfil: PERFIL_PARAMO,
      // espejo de páramo: sin espuma (0,14 dibujaba una «pluma» blanca, medido al 300 %)
      escalares: { rugosidad: 0.03, causticas: 0.25, turbiedad: 1.6, detalle: 0, espuma: 0.02 },
      atmosfera: atm, bruma, semilla: 22 + i,
    }));
    return { mar, lagunas };
  }, [calidad, conBruma]);
  useEffect(() => () => { aguas.mar.dispose(); aguas.lagunas.forEach((l) => l.dispose()); }, [aguas]);
  useFrame((_, dt) => {
    if (reducedMotion) return;
    const paso = Math.min(dt, 0.05);
    aguas.mar.cada(paso);
    for (const l of aguas.lagunas) l.cada(paso);
  });
  return (
    <group name="aguas-sierra">
      <primitive object={aguas.mar.malla} />
      {aguas.lagunas.map((l, i) => <primitive key={LAGUNAS_PARAMO[i].id} object={l.malla} />)}
    </group>
  );
}

/* EL DOMO DEL CIELO (2026-09-05, del costero): esfera con el MISMO `cieloAprox`
   que refleja el mar, en radiancia lineal HDR con el ACES al final. Reproduce en
   pantalla los hex ya afinados de `luzSierra.js` (inversa numérica del ACES) y
   añade el sol donde la luz VIENE (los tres lóbulos del costero). Sigue a la
   cámara: el horizonte del domo es el horizonte de verdad. UN draw call; el
   fragmento son tres `pow`. Solo con `perfil.fog` (el tier bajo conserva el
   color plano). */
function DomoCielo() {
  const mat = useMemo(() => crearMaterialDomo(atmosfera()), []);
  const ref = useRef(null);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((st) => { if (ref.current) ref.current.position.copy(st.camera.position); });
  return (
    <mesh ref={ref} material={mat} renderOrder={-2} frustumCulled={false}>
      <sphereGeometry args={[60, 24, 12]} />
    </mesh>
  );
}

/* LAS NUBES (2026-09-05, del costero): cúmulos de geometría iluminados por la
   escena. Dos poblaciones, dos causas: alisios sobre el Caribe (cuántos y a qué
   base lo decide la fase ENSO) y orográficas en la franja de condensación de
   `franjaCondensacion(fase, humedad)` — la MISMA función que consume el descenso.
   Una malla, un draw call; sombra en tier alto. Derivan sin prisa en bloque. */
function NubesSierra({ tier, reducedMotion, fase = 'neutral', humedad = null, sombras, conBruma }) {
  const grupo = useRef(null);
  const geo = useMemo(() => {
    const cfg = NUBES_POR_TIER[tier] ?? NUBES_POR_TIER.medio;
    const franja = franjaCondensacion(fase, humedad);
    const alisios = nubesAlisios({ cuantas: cfg.alisios, fase, lobulos: cfg.lobulos, costaZ: COSTA_Z });
    const orog = nubesOrograficas({ cuantas: cfg.orograficas, franja, alturaFn: alturaSierra, costaZ: COSTA_Z, lobulos: cfg.lobulos })
      .map((n) => ({ ...n, alto: n.alto * (0.75 + 0.25 * (n.amplitud ?? 1)) }));
    const interior = nubesInterior({ cuantas: cfg.interior, fase, lobulos: cfg.lobulos });
    return geometriaCumulos([...alisios, ...orog, ...interior], { detalle: cfg.detalle });
  }, [tier, fase, humedad]);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((st) => {
    if (reducedMotion || !grupo.current) return;
    grupo.current.position.x = Math.sin(st.clock.elapsedTime * 0.03) * 0.5;
  });
  return (
    <group ref={grupo} name="nubes-sierra">
      {/* castShadow=false: la sombra de una nube de 1 u sobre la ladera salía como un
          agujero negro de borde duro (medido al 300 %). El terreno sí se sombrea a sí mismo. */}
      <mesh geometry={geo} castShadow={false} receiveShadow={sombras}>
        {/* una nube DISPERSA la luz: la emisión pone el blanco del lomo que Lambert
            no da con el sol a 25° (N·L = 0,42 en un lomo horizontal); la sombra propia
            queda al hemisferio (azul-gris) */}
        <meshLambertMaterial color="#e9e6df" emissive="#fff8ee" emissiveIntensity={0.42} onBeforeCompile={conBruma ? inyectarBruma : undefined} />
      </mesh>
    </group>
  );
}

/* El sol bajo de la hora dorada: disco cálido con dos halos, sobre el horizonte
   del mar, al occidente. Da la dirección de luz y la reverencia del atardecer. */
function SolDorado() {
  return (
    <group position={[-13, 4.4, -6]}>
      <mesh>
        <circleGeometry args={[1.15, 32]} />
        <meshBasicMaterial color="#fff2cf" transparent opacity={0.98} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[2.1, 32]} />
        <meshBasicMaterial color="#ffd98f" transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[3.6, 32]} />
        <meshBasicMaterial color="#f7c66b" transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* Las luces de la Sierra (`sierra/luzSierra.js`): el MISMO sol bajo y cálido de
   la hora madre, y un cielo AZUL que rellena las sombras. Con `sombras` (tier
   alto) la direccional proyecta: shadow-map 2048² ortográfico sobre los 22×20 u
   del terreno — el sol a 25° modela las crestas y las nubes marcan la ladera. */
function LucesSierra({ sombras = false }) {
  const k = ATMOSFERA_SIERRA.intensidad;
  return (
    <>
      <hemisphereLight intensity={k.hemisferio} color={ATMOSFERA_SIERRA.cielo} groundColor={ATMOSFERA_SIERRA.suelo} />
      <ambientLight intensity={k.ambiente} color={ATMOSFERA_SIERRA.ambiente} />
      <directionalLight
        position={SOL_SIERRA}
        intensity={k.sol}
        color={ATMOSFERA_SIERRA.luz}
        castShadow={sombras}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.06}
        shadow-radius={4}
      />
      <directionalLight position={RELLENO_SIERRA} intensity={k.relleno} color={ATMOSFERA_SIERRA.relleno} />
    </>
  );
}

/* Etiqueta sobria de un lugar, con LEADER LINE: el grupo se ancla en el punto
   geográfico (cima, desembocadura) y una línea fina sube hasta el rótulo. El
   `alto` se ESCALONA entre rótulos vecinos para que nunca colisionen en
   pantalla (Cristóbal Colón·Bolívar arriba, Simmonds a media asta, Palomino a
   ras de costa), sin importar el barrido de la órbita. */
function Rotulo({ pos, texto, sub, distancia = 12, alto = 0.6 }) {
  return (
    <group position={pos}>
      {/* punto de anclaje sobre el lugar */}
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshBasicMaterial color="#fff3cf" depthWrite={false} />
      </mesh>
      {/* la línea guía hasta el rótulo */}
      <mesh position={[0, alto / 2, 0]}>
        <cylinderGeometry args={[0.014, 0.014, alto, 6]} />
        <meshBasicMaterial color="#5a4326" transparent opacity={0.65} depthWrite={false} />
      </mesh>
      <Html center position={[0, alto + 0.12, 0]} distanceFactor={distancia} zIndexRange={[30, 10]} style={{ pointerEvents: 'none' }}>
        <div className="vsierra-rotulo" aria-hidden="true">
          <span className="vsierra-rotulo__txt">
            {texto}
            {sub ? <em className="vsierra-rotulo__sub">{sub}</em> : null}
          </span>
        </div>
      </Html>
    </group>
  );
}

/* Marcador "usted está aquí": punto de luz suave + aro fino pegado al suelo, a la
   altitud del piso de la finca. Sobrio, sin gamificación. Solo si `pisoUsuario`
   es válido. */
function MarcadorPiso({ piso }) {
  const punto = useMemo(() => {
    const objetivo = PISOS_Y[piso];
    if (objetivo == null) return null;
    const wx = -4.2; // flanco occidental, cara norte visible
    let wz = COSTA_Z + 0.5, mejor = 99;
    for (let z = COSTA_Z + 0.3; z < 8; z += 0.2) {
      const d = Math.abs(alturaSierra(wx, z) - objetivo);
      if (d < mejor) { mejor = d; wz = z; }
    }
    return [wx, alturaSierra(wx, wz), wz];
  }, [piso]);
  if (!punto) return null;
  return (
    <group position={/** @type {[number, number, number]} */ (punto)}>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.72, 24]} />
        <meshBasicMaterial color="#ffdf9c" transparent opacity={0.7} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <circleGeometry args={[0.22, 24]} />
        <meshBasicMaterial color="#fff0c2" transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <Html center distanceFactor={16} position={[0, 0.9, 0]} zIndexRange={[40, 20]} style={{ pointerEvents: 'none' }}>
        <div className="vsierra-aqui" aria-hidden="true">Aquí está usted</div>
      </Html>
    </group>
  );
}

/* EL MAPA VERTICAL, dibujado como mapa (2026-09-04, arte): curvas de nivel finas
   sobre el relieve en los topes de cada banda, con la tinta de los rótulos, y la
   LÍNEA ÁMBAR de la cota canónica del hielo (4 800 m) con su rótulo — «hasta aquí
   llegaba». Las cintas se apoyan en las FACETAS del terreno tal como se dibujan
   (muestreadorFacetas), no en la función suave: no se hunden. Si hay
   `pisoUsuario`, las dos curvas de su banda van en el color del piso.

   P1 de DIRECCION-NUMEROS-VIVOS (2026-09-05): con `msnm` CONFIRMADO se dibuja la
   curva EXACTA de la cota de la finca (`yDeMsnm(msnm)`, no una representativa de
   banda) en el color del piso donde vive, con su rótulo «a la altura de su
   finca» colgado del punto más oriental. Sin altitud confirmada NO se dibuja
   nada de la finca (el hueco es honesto): las bandas siguen igual. */
function MapaDeNivel({ segmentos, pisoUsuario, msnm }) {
  const capas = useMemo(() => {
    const hF = muestreadorFacetas(alturaSierra, { ancho: ANCHO, fondo: FONDO, segX: segmentos, segZ: segmentos });
    const region = { x0: -ANCHO / 2 + 0.2, x1: ANCHO / 2 - 0.2, z0: COSTA_Z - 1.2, z1: FONDO / 2 - 0.2, paso: 0.08 };
    const msnmValido = altitudFincaValida(msnm);
    const out = [];
    BANDAS_SIERRA.forEach((b, i) => {
      if (!Number.isFinite(b.tope)) return;
      const lineas = contornoNivel(alturaSierra, b.tope, region);
      if (!lineas.length) return;
      const esHielo = b.id === 'superparamo';
      const suya = !msnmValido && pisoUsuario && (b.id === pisoUsuario || BANDAS_SIERRA[i + 1]?.id === pisoUsuario);
      out.push({
        key: b.id,
        geo: geometriaCinta(lineas, hF, { ancho: esHielo ? 0.06 : suya ? 0.045 : 0.03 }),
        color: esHielo ? NIEVE.ambar : suya ? b.hexColor : NIEVE.tinta,
        opacidad: esHielo ? 0.92 : suya ? 0.85 : 0.34,
        ancla: esHielo ? lineas.flat().reduce((m, q) => (q[0] < m[0] ? q : m)) : null,   // el punto más oriental (screen-right): lejos de las etiquetas de banda, que van al occidente
      });
    });
    /* P1 — la curva de la cota REAL de la finca. Solo con altitud confirmada. */
    if (msnmValido) {
      const y = yDeMsnm(msnmValido);
      const lineas = contornoNivel(alturaSierra, y, region);
      if (lineas.length) {
        const banda = bandaDeMsnm(msnmValido);
        const color = banda?.color ?? NIEVE.tinta;
        const puntos = lineas.flat();
        const ancla = puntos.reduce((m, q) => (q[0] < m[0] ? q : m), puntos[0]);
        out.push({
          key: 'finca',
          geo: geometriaCinta(lineas, hF, { ancho: 0.045 }),
          color,
          opacidad: 0.88,
          ancla,
          esFinca: true,
          cotaMsnm: msnmValido,
          yCota: y,
        });
      }
    }
    return out;
  }, [segmentos, pisoUsuario, msnm]);
  useEffect(() => () => capas.forEach((c) => c.geo.dispose()), [capas]);
  const tex = texturaCinta();
  return (
    <group name="mapa-de-nivel">
      {capas.map((c) => (
        <mesh key={c.key} geometry={c.geo}>
          <meshBasicMaterial
            map={tex} alphaMap={tex} color={c.color} transparent opacity={c.opacidad}
            depthWrite={false} side={THREE.DoubleSide} toneMapped={false}
            polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2}
          />
        </mesh>
      ))}
      {capas.filter((c) => c.ancla && c.key === 'superparamo').map((c) => (
        <group key={`${c.key}-rotulo`} position={[c.ancla[0], LINEA_HIELO + 0.22, c.ancla[1]]}>{/* +0,22: con la cámara nueva, a +0,06 el rótulo rozaba el de «Nival» */}
          <Html center distanceFactor={13} zIndexRange={[28, 8]} style={{ pointerEvents: 'none' }}>
            <div className="vsierra-hielo" aria-hidden="true">Hasta aquí llegaba el hielo · 4.800 m</div>
          </Html>
        </group>
      ))}
      {capas.filter((c) => c.esFinca).map((c) => (
        <group key="finca-rotulo" position={[c.ancla[0], c.yCota + 0.2, c.ancla[1]]}>
          <Html center distanceFactor={13} zIndexRange={[28, 8]} style={{ pointerEvents: 'none' }}>
            <div className="vsierra-finca" style={{ '--finca': c.color }} aria-hidden="true">
              {c.cotaMsnm.toLocaleString('es-CO')} m · a la altura de su finca
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

/* El pie de crédito a los cuatro pueblos, anclado en 3D (para el grupo
   componible). El modo con Canvas usa además el pie DOM accesible. */
function CreditoPueblos() {
  return (
    <group position={[0, 0.4, -8.5]}>
      <Html center distanceFactor={26} zIndexRange={[20, 5]} style={{ pointerEvents: 'none' }}>
        <p className="vsierra-credito vsierra-credito--3d">
          Territorio ancestral y sagrado de los pueblos Kogui, Arhuaco (Iku),
          Wiwa y Kankuamo — el Corazón del Mundo, dentro de la Línea Negra.
        </p>
      </Html>
    </group>
  );
}

/* Panel de DATOS REALES por piso térmico (2026-09-04, sierra-datos-por-piso):
   cuando hay un piso activo (banda tocada o `?viaje=`), muestra qué crece ahí
   con números verificables —catálogo (`thermal_zones`) y grafo (`_piso_termico`)—
   en vez de prosa. Un piso sin especie documentada (superpáramo y nival en el
   catálogo) dice "Sin datos para este piso", que es la verdad medida. */
function PanelDatosPiso({ pisoId }) {
  const dato = datoPisoPorId(pisoId);
  if (!dato) return null;

  const maxMostrar = 8;
  const visibles = dato.representativos.slice(0, maxMostrar);
  const restantes = dato.representativos.length - visibles.length;
  const vacioDeDatos = !dato.con_dato;

  const clima = [
    dato.altitud_m?.min ?? null,
    dato.altitud_m?.max ?? null,
  ].every((v) => typeof v === 'number') && dato.temperatura_media_c?.min != null && dato.temperatura_media_c?.max != null
    ? `${dato.altitud_m.min}–${dato.altitud_m.max} m · ${dato.temperatura_media_c.min}–${dato.temperatura_media_c.max} °C`
    : null;

  return (
    <aside className="vsierra-datos" data-testid="panel-datos-piso" aria-live="polite">
      {vacioDeDatos ? (
        <>
          <p className="vsierra-datos__tit">{dato.nombre || pisoId}</p>
          <p className="vsierra-datos__vacio">Sin datos para este piso: sin especies documentadas en el catálogo.</p>
          {dato.formacion ? <p className="vsierra-datos__formacion">{dato.formacion}</p> : null}
        </>
      ) : (
        <>
          <p className="vsierra-datos__tit">
            {dato.nombre}
            {clima ? <span>{clima}</span> : null}
          </p>
          <p className="vsierra-datos__num">
            <strong>{dato.catalogo_total}</strong> especies documentadas en el catálogo
            <small>· {dato.grafo_rango} del grafo en este rango</small>
          </p>
          {dato.formacion ? <p className="vsierra-datos__formacion">{dato.formacion}</p> : null}
          {visibles.length > 0 ? (
            <>
              <ul className="vsierra-datos__lista">
                {visibles.map((r) => (
                  <li key={r.id}>{r.nombre}</li>
                ))}
              </ul>
              {restantes > 0 ? <p className="vsierra-datos__mas">y {restantes} más</p> : null}
            </>
          ) : null}
          <p className="vsierra-datos__nota">
            De las {TOTAL_ESPECIES_CATALOGO} especies del catálogo. Fuente: catálogo de especies y grafo de Chagra.
          </p>
        </>
      )}
    </aside>
  );
}

/**
 * SierraDiorama — el grupo r3f puro de la Sierra, para COMPONER dentro de un
 * `<Canvas>` propio (otra escena, un mockup, un preview). Trae el terreno, las
 * aguas, las nubes, el sol, los rótulos y —por defecto— sus luces, su aire y su
 * crédito; el que compone puede apagarlos por props si ya los aporta.
 *
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier='alto']  presupuesto de render.
 * @param {boolean} [props.reducedMotion=false]  congela aguas/nubes.
 * @param {string}  [props.pisoUsuario]  'calido'|'templado'|'frio'|'paramo'|'superparamo'|'nival'.
 * @param {number|null} [props.msnm]  altitud CONFIRMADA de la finca en metros:
 *        dibuja la curva exacta P1 «a la altura de su finca». Sin ella no se
 *        dibuja nada de la finca (guard anti-fabricación).
 * @param {boolean} [props.luces=true]  monta las luces de la hora dorada.
 * @param {boolean} [props.atmosfera=true]  fondo + domo + bruma por altura.
 * @param {boolean} [props.credito=true]  pie de crédito 3D a los cuatro pueblos.
 * @param {(piso:object)=>void} [props.onSeleccionPiso]  avisa al host al llegar a un piso.
 * @param {string|null} [props.pisoActivo=null]  piso resaltado desde el host.
 */
export function SierraDiorama({
  tier = 'alto',
  reducedMotion = false,
  pisoUsuario,
  msnm = null,
  luces = true,
  atmosfera: conAtmosfera = true,
  credito = true,
  onSeleccionPiso,
  pisoActivo = null,
}) {
  const perfil = perfilDeTier(tier);
  const segmentos = SEGMENTOS_SIERRA[tier] ?? SEGMENTOS_SIERRA.medio;
  const conBruma = conAtmosfera && perfil.fog;
  const sombras = perfil.sombras;
  /* P1 — solo una altitud CONFIRMADA dibuja la curva de la finca. El guard se
     respeta: sin ella, `MarcadorPiso` sigue el piso representativo de antes. */
  const msnmConfirmado = altitudFincaValida(msnm);
  const geo = useMemo(() => construirTerreno(segmentos, segmentos), [segmentos]);
  useEffect(() => () => geo.dispose(), [geo]);
  const faldon = useMemo(() => construirFaldon(), []);
  useEffect(() => () => faldon.dispose(), [faldon]);

  const faseEnso = useMemo(() => leerGateDescenso().fase ?? faseEnsoViva(), []);   // `?enso=` solo para el gate; la app lee la fase VIVA

  /* `color` se adjunta a la ESCENA: va como hijo directo (fragment), nunca envuelto
     en un <group>. La niebla de three ya no se usa: la bruma por altura va
     inyectada en cada material (terreno, nubes, mar) con el mismo color. */
  return (
    <>
      {conAtmosfera && <color attach="background" args={[ATMOSFERA_SIERRA.fondo]} />}
      {conAtmosfera && perfil.fog && <DomoCielo />}
      {luces && <LucesSierra sombras={sombras} />}
      <SolDorado />

      <mesh geometry={geo} castShadow={sombras} receiveShadow={sombras}>
        <meshLambertMaterial vertexColors onBeforeCompile={conBruma ? inyectarNieveYBruma : inyectarNieve} />
      </mesh>
      <mesh geometry={faldon} receiveShadow={sombras} name="faldon">
        <meshLambertMaterial vertexColors onBeforeCompile={conBruma ? inyectarBruma : undefined} />
      </mesh>

      <AguasSierra calidad={/** @type {0|1|2} */ (CALIDAD_MAR[tier] ?? 1)} conBruma={conBruma} reducedMotion={reducedMotion} />
      <NubesSierra tier={tier} reducedMotion={reducedMotion} fase={faseEnso} sombras={sombras} conBruma={conBruma} />

      {/* Rótulos sobrios de los lugares exigidos por el encargo. Los `alto`
          escalonados (1.25 / 0.6 / 0.45) separan los rótulos verticalmente en
          pantalla — antes se encimaban ilegibles sobre las cumbres. */}
      <Rotulo pos={[CUMBRE.x, CUMBRE.y, CUMBRE.z]} texto="Cristóbal Colón · Simón Bolívar" sub="5.775 m" distancia={13} alto={1.25} />
      <Rotulo pos={[SIMMONDS.x, SIMMONDS.y, SIMMONDS.z]} texto="Pico Simmonds" sub="5.560 m" distancia={12} alto={0.6} />
      <Rotulo pos={[PALOMINO.x, PALOMINO.y, PALOMINO.z]} texto="Palomino" sub="Caribe · 0 m" distancia={11} alto={0.45} />

      {pisoUsuario && !msnmConfirmado && <MarcadorPiso piso={pisoUsuario} />}
      <MapaDeNivel
        segmentos={segmentos}
        pisoUsuario={msnmConfirmado ? null : pisoUsuario}
        msnm={msnmConfirmado}
      />
      <PisosTermicosBandas
        aura={false}
        pisoUsuario={pisoUsuario}
        tier={tier}
        reducedMotion={reducedMotion}
        alturaCumbre={CIMA}
        radioBase={4}
        radioCumbre={0.35}
        onSeleccionPiso={onSeleccionPiso}
        pisoActivo={pisoActivo}
      />
      {credito && <CreditoPueblos />}
    </>
  );
}

/* Estilos de los rótulos y pie de crédito (viven aquí: son de ESTA escena). */
const CSS_SIERRA = `
.vsierra-root { position: relative; width: 100%; height: 100dvh; min-height: 320px; overflow: hidden; background: ${ATMOSFERA_SIERRA.fondo}; }
.vsierra-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.7s ease; }
.vsierra-canvas--lista { opacity: 1; }
.vsierra-rotulo { white-space: nowrap; font: 600 0.78rem/1.15 system-ui, sans-serif; color: #402c16; padding: 0.16rem 0.5rem; border-radius: 999px; background: rgba(255,248,233,0.82); box-shadow: 0 1px 5px rgba(60,42,24,0.22); }
.vsierra-rotulo__txt { display: inline-flex; align-items: baseline; gap: 0.3rem; }
.vsierra-rotulo__sub { font-weight: 500; font-style: normal; opacity: 0.72; font-size: 0.9em; }
.vsierra-hielo { padding: 0.16rem 0.5rem; border-radius: 999px; background: rgba(255,248,233,0.86); color: #6a4a12; border: 1px solid rgba(224,168,74,0.9); font: 600 0.68rem/1.1 system-ui, sans-serif; white-space: nowrap; box-shadow: 0 1px 5px rgba(60,42,24,0.2); }
.vsierra-finca { padding: 0.18rem 0.6rem; border-radius: 999px; background: rgba(255,248,233,0.9); color: #3a2a18; border: 1px solid rgba(64,44,22,0.3); border-left: 4px solid var(--finca, #4f8f7d); font: 600 0.72rem/1.15 system-ui, sans-serif; white-space: nowrap; box-shadow: 0 1px 6px rgba(60,42,24,0.22); }
.vsierra-aqui { padding: 0.2rem 0.55rem; border-radius: 999px; background: rgba(64,44,22,0.82); color: #fff3d6; font: 600 0.72rem/1.1 system-ui, sans-serif; white-space: nowrap; box-shadow: 0 2px 8px rgba(30,18,6,0.3); }
.vsierra-credito { margin: 0; max-width: min(90vw, 40rem); text-align: center; font: 500 0.78rem/1.4 system-ui, sans-serif; color: #f4ecdd; }
.vsierra-credito--3d { padding: 0.4rem 0.8rem; border-radius: 0.7rem; background: rgba(24,16,7,0.44); backdrop-filter: blur(3px); }
.vsierra-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.vsierra-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #3a2a18; text-shadow: 0 1px 4px rgba(255,246,224,0.85); font: 700 1.15rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.vsierra-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.78; margin-top: 0.15rem; }
.vsierra-clave { align-self: flex-end; margin: 0 0.8rem 0.55rem; display: flex; flex-direction: column; gap: 0.24rem; padding: 0.5rem 0.65rem; border-radius: 0.7rem; background: rgba(255,248,233,0.72); backdrop-filter: blur(3px); box-shadow: 0 4px 14px rgba(60,42,24,0.16); }
.vsierra-datos { align-self: flex-end; margin: 0.55rem 0.8rem 0 0; max-width: min(19rem, calc(100vw - 2rem)); padding: 0.62rem 0.78rem; border-radius: 0.7rem; background: rgba(255,248,233,0.8); backdrop-filter: blur(3px); box-shadow: 0 4px 14px rgba(60,42,24,0.16); font: 500 0.72rem/1.35 system-ui, sans-serif; color: #3a2a18; }
.vsierra-datos__tit { margin: 0; font-weight: 700; font-size: 0.85rem; }
.vsierra-datos__tit span { display: block; font-weight: 500; opacity: 0.72; font-size: 0.72rem; }
.vsierra-datos__num { margin: 0.18rem 0 0.1rem; }
.vsierra-datos__num strong { font-size: 1.12rem; }
.vsierra-datos__num small { display: block; opacity: 0.72; }
.vsierra-datos__formacion { margin: 0.1rem 0 0; opacity: 0.8; }
.vsierra-datos__lista { margin: 0.18rem 0 0; padding: 0 0 0 1rem; }
.vsierra-datos__lista li { margin: 0.04rem 0; }
.vsierra-datos__mas { margin: 0.12rem 0 0; opacity: 0.7; }
.vsierra-datos__nota { margin: 0.28rem 0 0; padding-top: 0.28rem; border-top: 1px solid rgba(60,42,24,0.14); opacity: 0.62; font-size: 0.66rem; }
.vsierra-datos__vacio { margin: 0.18rem 0 0; }
.vsierra-clave li { display: flex; align-items: center; gap: 0.42rem; list-style: none; font: 500 0.72rem/1.1 system-ui, sans-serif; color: #3a2a18; }
.vsierra-clave b { width: 12px; height: 12px; border-radius: 3px; flex: 0 0 auto; box-shadow: inset 0 0 0 1px rgba(60,42,24,0.18); }
.vsierra-clave ul { margin: 0; padding: 0; }
.vsierra-abajo { display: flex; flex-direction: column; align-items: stretch; }
.vsierra-pie { pointer-events: none; padding: 0 1rem 0.85rem; display: flex; justify-content: center; }
.vsierra-pie p { margin: 0; max-width: 42rem; text-align: center; padding: 0.42rem 0.85rem; border-radius: 0.7rem; background: rgba(24,16,7,0.5); backdrop-filter: blur(3px); color: #f4ecdd; font: 500 0.76rem/1.4 system-ui, sans-serif; }
@media (prefers-reduced-motion: reduce) { .vsierra-canvas { transition: none; } }
`;

/**
 * VistaGlobalSierra — la vista global montable con su propio `<Canvas>`.
 * Trae la cámara de establishing shot, órbita suave acotada, título, clave de
 * pisos accesible y el pie de crédito DOM a los cuatro pueblos. El host decide
 * cuándo mostrarla (no monta lógica de negocio).
 *
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier='alto']  presupuesto de render.
 * @param {boolean} [props.reducedMotion=false]  sin órbita ni nubes; frameloop a demanda.
 * @param {string}  [props.pisoUsuario]  piso de la finca a resaltar (opcional).
 * @param {number|null} [props.msnm]  altitud CONFIRMADA de la finca (metros).
 *        Sin la prop, se lee `?msnm=` (gate): si tampoco, nada de la finca se
 *        dibuja (P1, guard anti-fabricación).
 * @param {(piso:object)=>void} [props.onSeleccionPiso]  se llama al llegar al piso seleccionado.
 * @param {string}  [props.className]  clases extra del contenedor.
 * @param {Array}   [props.sugerencias]  salida de `buildClimaCultivoSuggestions`
 *        si el host ya la calculó (sin plantas no hay tiza de SU cultivo).
 */
export default function VistaGlobalSierra({
  tier = 'alto',
  reducedMotion = false,
  pisoUsuario,
  msnm = null,
  onSeleccionPiso,
  className = '',
  sugerencias = [],
}) {
  const [listo, setListo] = useState(false);
  /* El clima de la finca entra por el MISMO hook que la vitrina 2D y la Página
     del Tiempo (`useClima3DVivo`): lee la cache compartida y escucha el evento.
     Se baja al aterrizaje del descenso para que la Sierra absorba el dato que
     ya existe, sin armar un camino paralelo a `climaService`. */
  const climaVivo = useClima3DVivo();
  /* P1 — la altitud de la finca que manda: la prop del host gana; sin ella, el
     parámetro de gate `?msnm=` (que el descenso ya usa) puebla la curva para
     capturas/demo. En el viaje real sin ninguno de los dos, no se dibuja. */
  const msnmPortada = msnm ?? leerGateDescenso().msnmFijo ?? null;
  /* GATE (2026-09-04): `?viaje=<id de banda>` (antes del hash) arranca el viaje a
     ese piso sin clic — es lo que permite capturar el descenso congelado con
     `?msnm=`. Estado INICIAL perezoso (nada de setState en un efecto); sin el
     parámetro, null, como siempre. */
  const [viajeInicial] = useState(() => {
    const id = new URLSearchParams(globalThis.location?.search ?? '').get('viaje');
    if (!id) return null;
    const banda = PISOS_TERMICOS_SIERRA.find((b) => b.id === id || b.piso === id);
    return banda ? { id: banda.piso, nombre: banda.nombre, minMsnm: banda.minMsnm, maxMsnm: banda.maxMsnm, banda } : null;
  });
  const [pisoActivo, setPisoActivo] = useState(viajeInicial ? viajeInicial.id : null);
  const [viaje, setViaje] = useState(viajeInicial ? { piso: viajeInicial, activa: true } : null);
  const perfil = perfilDeTier(tier);
  const seleccionarPiso = useCallback((piso) => {
    setPisoActivo(piso.id);
    setViaje({ piso, activa: true });
  }, []);
  const llegarAPiso = useCallback(() => {
    if (viaje?.piso) onSeleccionPiso?.(viaje.piso);
  }, [onSeleccionPiso, viaje]);
  const terminarViaje = useCallback(() => setViaje(null), []);
  return (
    <section
      className={`vsierra-root${className ? ` ${className}` : ''}`}
      data-tier={tier}
      aria-label="Vista global de la Sierra Nevada de Santa Marta: portada y mapa por pisos térmicos"
    >
      <style>{CSS_SIERRA}</style>
      <Canvas
        className={`vsierra-canvas${listo ? ' vsierra-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        shadows={perfil.sombras ? { type: THREE.PCFShadowMap } : false}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [-1.5, 6.6, -12.8], fov: 48 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        {/* Cámara PARADA sobre el mar Caribe (−Z, norte), mirando al SUR (+Z) y
            un poco hacia arriba: el mar llena el primer plano y las cumbres
            nevadas suben en el tercio superior. Distancia 15,4 < max 16; polar
            1,27 rad dentro de [1,05, 1,45]; los clamps de azimuth abrazan el
            azimuth natural (≈ −3.0 rad). El `fov` vertical (48°) encuadra igual
            en portrait y en landscape. */}
        <SierraDiorama
          tier={tier}
          reducedMotion={reducedMotion}
          pisoUsuario={pisoUsuario}
          msnm={msnmPortada}
          credito={false}
          onSeleccionPiso={seleccionarPiso}
          pisoActivo={pisoActivo}
        />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={9}
          maxDistance={16}
          target={[0, 2.1, 2.2]}
          minPolarAngle={1.05}
          maxPolarAngle={1.45}
          minAzimuthAngle={-Math.PI}
          maxAzimuthAngle={-2.75}
          enableDamping
          dampingFactor={0.08}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.09}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      <TransicionSierraMundo
        activa={viaje?.activa ?? false}
        pisoDestino={viaje?.piso.id}
        tier={tier}
        reducedMotion={reducedMotion}
        onMitad={llegarAPiso}
        onFin={terminarViaje}
        climaVivo={climaVivo}
        sugerencias={sugerencias}
      />

      {/* Chrome DOM anclado a la composición: título arriba; abajo la clave de
          pisos (accesible) y el pie de crédito, apoyados sobre la playa/mar del
          encuadre — nada flota fuera de la escena. */}
      <div className="vsierra-chrome">
        <h2 className="vsierra-titulo">
          Sierra Nevada de Santa Marta
          <small>Del Caribe a la nieve: todos los pisos térmicos en un solo macizo</small>
        </h2>
        <PanelDatosPiso pisoId={pisoActivo} />
        <div className="vsierra-abajo">
          <ul className="vsierra-clave" aria-label="Pisos térmicos, de la nieve al mar">
            {CLAVE_PISOS.map((b) => (
              <li key={b.t}>
                <b style={{ background: b.c }} aria-hidden="true" />
                {b.t}
              </li>
            ))}
          </ul>
          <div className="vsierra-pie">
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
