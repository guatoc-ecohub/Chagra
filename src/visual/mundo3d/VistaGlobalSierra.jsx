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
 * ── RENDIMIENTO (gama baja + offline, DR render §B/§6) ──────────────────────
 * Terreno 100% procedural (heightmap por función determinista; cero DEM/GLTF/
 * HDR remoto → cachea limpio en el service worker). Un solo material
 * `MeshLambert` con colores por vértice (banding por altitud) — sin shaders
 * propios, sin post-proceso, sin shadow-map. Presupuesto por `tier`
 * (`perfilDeTier`): segmentos de malla, flat vs. smooth, niebla y densidad de
 * nubes. `reducedMotion` congela nubes/brillos y pasa a `frameloop='demand'`.
 * La luz es la de `sierra/luzSierra.js`: el MISMO sol bajo de la hora dorada de
 * `atmosferaMadre` (dirección y calidez), pero con cielo y bruma AZULES —la
 * lámpara dorada compartida multiplicaba el azul por 0,57 y volvía caqui cinco
 * de las siete bandas (medido 2026-09-05; ver la cabecera de luzSierra.js).
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
 *   // p.ej. ruta mockup #/mockups/sierra-global o nodo maestro del registro:
 *   <VistaGlobalSierra
 *     tier={tier}                 // de decidirTier() (deviceTier.js)
 *     reducedMotion={reducedMotion}
 *     pisoUsuario="frio"          // opcional: resalta el piso de la finca
 *   />                            // 'calido'|'templado'|'frio'|'paramo'|'superparamo'|'nival'
 *
 *   // O componer el grupo dentro de un Canvas propio (encuadre inmersivo:
 *   // desde el mar mirando al sur; target ≈ [0, 2.3, 2.5]):
 *   import { SierraDiorama } from './visual/mundo3d/VistaGlobalSierra.jsx';
 *   <Canvas camera={{ position: [-1.5, 5.2, -11], fov: 48 }}>
 *     <SierraDiorama tier={tier} reducedMotion={reducedMotion} />
 *   </Canvas>
 *
 * El contenedor padre define el alto (como `.mundo-root`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Billboard, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { ATMOSFERA_SIERRA, SOL_SIERRA, RELLENO_SIERRA } from './sierra/luzSierra.js';
import { perfilDeTier } from './deviceTier.js';
import PisosTermicosBandas from './PisosTermicosBandas.jsx';
import TransicionSierraMundo from './TransicionSierraMundo.jsx';
import { BANDAS_SIERRA, CLAVE_PISOS_SIERRA, PISOS_TERMICOS_SIERRA } from './pisosTermicos.js';
import { franjaCondensacion, leerGateDescenso } from './sierra/descensoSierra.js';
import {
  NIEVE, anadirAtributoNieve, crearInyectorNieve, muestreadorFacetas, contornoNivel, geometriaCinta, texturaCinta, texturaNubeMasa,
} from './sierra/nieveSierra.js';
import { faseEnsoViva } from './sierra/aterrizajeDescenso.js';
import { datoPisoPorId, TOTAL_ESPECIES_CATALOGO } from '../../services/sierraPisosDatos.js';

/* ── Geografía del macizo (validada contra el DR: mar al norte, macizo al sur,
      cumbres gemelas + Simmonds, costa de Palomino). Coordenadas de MUNDO:
      X = oriente-occidente, Y = altura, Z = norte(mar, −) → sur(cumbres, +). ── */
const CIMA = 5.0; // altura de referencia (≈ 5.775 m escalados con drama sobrio)
const COSTA_Z = -3; // latitud de la línea de costa en Z
const ANCHO = 22; // extensión E-O del terreno
const FONDO = 20; // extensión N-S del terreno
// La cota de "nieve perpetua" (≈ 4.800 msnm → topeWorldY 4.15) ya NO se declara
// acá: llega dentro de `BANDAS_SIERRA` como el tope del superpáramo. Tenerla
// suelta en esta vista era otra copia de la misma cota, esperando a desincronizarse.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function gauss(wx, wz, cx, cz, sx, sz) {
  const dx = wx - cx, dz = wz - cz;
  return Math.exp(-((dx * dx) / (2 * sx * sx) + (dz * dz) / (2 * sz * sz)));
}
/* Ruido determinista (hash de senos): mismo macizo siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.9 + wz * 0.7) * 0.5 +
    Math.sin(wx * 1.7 - wz * 1.3 + 2.1) * 0.28 +
    Math.sin(wx * 2.9 + wz * 2.3 + 4.7) * 0.16
  );
}
/* Altura del terreno en un punto de mundo. El mar (Z < costa) queda a ~0. */
function alturaSierra(wx, wz) {
  if (wz < COSTA_Z - 0.2) return -0.15;
  const s = clamp((wz - COSTA_Z) / (10 - COSTA_Z), 0, 1); // rampa costa→interior
  let h = Math.pow(s, 0.9) * CIMA * 0.42;
  h += gauss(wx, wz, 0.6, 3.8, 1.9, 2.4) * CIMA * 0.4; // Pico Cristóbal Colón
  h += gauss(wx, wz, -1.4, 4.4, 1.8, 2.2) * CIMA * 0.38; // Pico Simón Bolívar
  h += gauss(wx, wz, 2.9, 2.9, 1.7, 2.1) * CIMA * 0.42; // Pico Simmonds
  h += gauss(wx, wz, -4.5, 0.6, 3.0, 3.0) * CIMA * 0.16; // estribación occidental
  h += gauss(wx, wz, 5.0, -0.4, 3.0, 3.0) * CIMA * 0.13; // estribación oriental
  h += ruido(wx, wz) * CIMA * 0.07 * s; // crestas/vaguadas, solo tierra adentro
  h *= smoothstep(COSTA_Z - 1.2, COSTA_Z + 1.0, wz); // aplana hacia la costa
  return h;
}

/* Puntos de referencia (world XYZ) para las etiquetas y marcadores. */
const CUMBRE = { x: -0.4, y: 5.0, z: 4.1 }; // Colón · Bolívar (gemelas nevadas)
const SIMMONDS = { x: 2.9, y: 4.36, z: 2.9 };
const PALOMINO = { x: 5.0, y: 0.2, z: -2.85 }; // desembocadura sobre el Caribe

/* ── Banding de pisos térmicos por altitud. El bosque de niebla es la banda
      donde se enganchan las nubes.

      🔴 UNIFICADO (2026-09-02): las 7 bandas —cota, nombre y COLOR— salen
      enteras de `BANDAS_SIERRA` (`pisosTermicos.js`). Antes esta lista se
      escribía a mano leyendo colores de `PISOS_TERMICOS` piso por piso y
      añadiendo playa y nieve como literales; la bóveda mientras tanto leía el
      OTRO juego de colores de la misma tabla, y los dos «leían la canónica».
      Ya no hay dos juegos: el color de cada banda lo decide la tabla, incluida
      la playa (arena, no es un piso) y el nival (blanco frío, override de
      render para que la cima lea NIEVE y no ocre bajo la hora dorada, §6-B).
      La separación entre bandas se afina angostando el smoothstep (para que se
      lean 7, no 3), abajo.

      🔴 EL ORDEN IMPORTA: `BANDAS_SIERRA` llega MAR→CIMA con `Infinity` de
      último, que es justo lo que `colorPorAltura` necesita para avanzar. La
      tabla nativa va al revés (cima→mar); alimentarla cruda dejaría el índice
      en 0 y pintaría crema nival toda la ladera. `pisosTermicosUnificados.test.js`
      fija ese sentido. ── */
/* 2026-09-04 (arte): la NIEVE ya no es color de vértice. Bajo la lámpara dorada el
   `#eef2f4` nival salía ARENA (medido (212,196,166), más oscuro que el cielo): el
   casquete va como capa con luz propia (`aNieve` + `inyectarNieve`, ver
   sierra/nieveSierra.js). Lo que queda de vértice en la banda nival es la ROCA
   entre parches. El swatch de la leyenda sigue saliendo de la tabla canónica. */
const BANDAS = BANDAS_SIERRA.map((b, i, arr) => ({
  tope: b.tope,
  c: new THREE.Color(i === arr.length - 1 ? NIEVE.roca : b.hexColor),
}));
/* La línea de hielo CANÓNICA (4 800 m = tope del superpáramo): hasta aquí llegaba. */
const LINEA_HIELO = BANDAS_SIERRA.find((b) => b.id === 'superparamo')?.tope ?? 4.15;
/* La dirección del sol de la hora dorada (= la posición de la direccional principal). */
const SOL_DIR = SOL_SIERRA;
/* UNA sola instancia del inyector: r3f no recompila el material si la identidad no cambia. */
const inyectarNieve = crearInyectorNieve({ lineaHielo: LINEA_HIELO });
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

/* La clave de pisos accesible (DOM del modo con Canvas). Nombres de piso, sin
   palabras-gatillo del linter i18n; el color acompaña a la etiqueta. Sale de la
   MISMA tabla que pinta la ladera —antes era una copia a mano de esos colores,
   que es como se destiñen las leyendas—, en orden cima→mar, que es como se lee
   una montaña de arriba abajo. */
const CLAVE_PISOS = CLAVE_PISOS_SIERRA;

/* Altitud representativa de cada piso (world Y), para el marcador "usted". */
const PISOS_Y = {
  calido: 0.6, templado: 1.4, frio: 2.2, paramo: 3.0, superparamo: 3.9, nival: 4.6,
};

/* MOTEADO del manto (2026-09-05, arte): un dosel no es un degradado liso —el pie
   ocre salía CALVO, medido al 300 %—. Una modulación de VALOR por vértice,
   determinista (el mismo `ruido` del relieve, a otra escala), ±10 % en los
   bosques, menos en los pisos abiertos, nada en la arena ni bajo el mar. Cero
   costo: se hornea en el color de vértice. La LEY de bandas (`colorPorAltura`) no
   cambia; esto es detalle del manto de la vista global — el descenso
   (`sierraRelieve.colorPorAlturaRGB`) no lo lleva, a propósito: allí el detalle
   lo pone la flora instanciada. */
function amplitudMoteado(y) {
  if (y < 0.12) return 0; // arena a ras del mar y fondo marino
  if (y < BANDAS[0].tope) return 0.04; // playa
  if (y < BANDAS[3].tope) return 0.1; // bosque seco · selva húmeda · bosque de niebla
  if (y < BANDAS[4].tope) return 0.07; // páramo: pajonal y frailejonal
  if (y < BANDAS[5].tope) return 0.06; // superpáramo: roca, cojines y líquenes
  return 0.05; // la roca nival entre parches
}

/* Construye la malla del terreno en coordenadas de mundo. `plano` = flat-shading
   (des-indexa: caras facetadas, look low-poly de alto gusto en tier alto). */
function construirTerreno(segX, segZ, plano) {
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
      colorPorAltura(y, c);
      const m = 1 + amplitudMoteado(y) * ruido(wx * 2.2 + 1.3, wz * 2.2 - 0.6);
      col[p] = c.r * m; col[p + 1] = c.g * m; col[p + 2] = c.b * m;
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
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  anadirAtributoNieve(geo, alturaSierra, { lineaHielo: LINEA_HIELO, sol: SOL_DIR });   // el casquete, antes de de-indexar
  if (plano) geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  return geo;
}

/* El mar Caribe al norte: lámina baja y ancha que se pierde en la bruma azul del
   horizonte. (2026-09-05, arte) Se quitó el «destello de sol»: era un rectángulo
   plano de 7×12 u con borde recto, y estaba donde el reflejo del sol NO cae (el
   sol está al occidente, detrás de la cámara); con el mar ahora en primer plano
   habría salido como una mancha con borde duro. El brillo del agua, si vuelve,
   tiene que caer donde la física lo pone. */
function Mar() {
  return (
    <mesh position={[0, 0.02, -9]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[46, 20]} />
      {/* un punto más claro y azul que el #4c93ab de antes: bajo la luz corregida salía
          (47,106,120), teal apagado; el Caribe visto desde el aire es más claro */}
      <meshLambertMaterial color="#58a4c2" transparent opacity={0.96} />
    </mesh>
  );
}

/* EL DOMO DEL CIELO (2026-09-05, arte): un `<color>` plano lee como cartulina, y con
   la cámara por encima de la cumbre el casquete se ve contra el horizonte. Esfera
   con COLOR DE VÉRTICE —horizonte abajo, cenit arriba—, el patrón de
   `bosque/fondoParamo.jsx`: cero GLSL propio, UN draw call, sin niebla ni
   tonemapping. Costo: el relleno del área de cielo (≈25-30 % del cuadro) con un
   fragment trivial; en el Mali-G78 NO está medido. Solo con `perfil.fog` (el tier
   bajo conserva el color plano: fill-rate al mínimo). La niebla usa el color del
   horizonte: la ladera lejana se disuelve en el mismo aire. */
function DomoCielo() {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(60, 24, 12);
    const pos = g.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const h = new THREE.Color(ATMOSFERA_SIERRA.fondo), z = new THREE.Color(ATMOSFERA_SIERRA.cenit), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = smoothstep(0, 0.22, pos.getY(i) / 60); // cenit pleno a ≈13° sobre el horizonte
      c.lerpColors(h, z, t);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={[0, 5, 0]} renderOrder={-1}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} fog={false} toneMapped={false} />
    </mesh>
  );
}

/* Las texturas de nube: RGBA con lomo/panza/honda (nieveSierra.texturaNubeMasa),
   cacheadas una sola vez. DOS semillas que alternan (una con torre, una en pan):
   con una sola, siete nubes idénticas se delataban como calcos. Antes era una
   mancha blanca de un solo tono × alfa (`textoNubeSuave`): sin polígonos, pero
   SÁBANA. `null` sin contexto 2D (jsdom): billboard liso, nunca tumba la Sierra. */
let _nubeTex = /** @type {Array<THREE.Texture|null>} */ ([null, null]);
let _nubeTexIntentada = false;
function nubeTextura(i = 0) {
  if (!_nubeTexIntentada) {
    _nubeTexIntentada = true;
    _nubeTex = [texturaNubeMasa(5), texturaNubeMasa(9)];
  }
  return _nubeTex[i % 2];
}

/* Nubes bajas que se ENGANCHAN en el bosque de niebla (banda ~1.8–2.4): planos
   billboard con textura de borde emplumado, anclados a la ladera, que derivan
   sin prisa. Cero polígonos contables: cada nube es un sprite suave. */
/* LA COTA DE LA NUBE ES UN FENÓMENO, NO UN NÚMERO HORNEADO (integración clima
   2026-09-04, DIRECCION-CIELO-Y-NUBE §3.5): antes `1.9 + (i % 3)·0.22`. Ahora
   sale de `franjaCondensacion(fase, humedad)` — la MISMA función que consume
   el descenso — con la fase ENSO VIVA (`getEnsoPhase`, fuente única GR-9):
   bajo El Niño la banda SUBE 380 m y se adelgaza (amplitud ×0,62: el bosque
   de niebla quedándose sin niebla); bajo La Niña baja 260 m y engorda. Y la
   nube va EN EL AIRE delante del talud, no pegada a la ladera; relación
   ancho/alto ≤ 3:1 (sábana = mentira visual). `humedad` = null: sin dato de
   finca no se inventa. */
function NubesDeNiebla({ cuantas, reducedMotion, fase = 'neutral', humedad = null }) {
  const grupo = useRef(null);
  const franja = useMemo(() => franjaCondensacion(fase, humedad), [fase, humedad]);
  const nubes = useMemo(() => {
    const out = [];
    const cotaY = franja.cota / 1155;               // 1 u = 1 155 m (escala canónica §2.2)
    const sigmaY = (franja.sigma / 1155) * 0.6;
    for (let i = 0; i < cuantas; i++) {
      const wx = -7 + (14 * (i + 0.5)) / cuantas + Math.sin(i * 2.3) * 0.7; // jitter corto: vecinas que no se montan
      const y = cotaY + (((i * 7) % 5) - 2) * 0.5 * sigmaY;  // jitter determinista dentro de la franja
      // la Z de la ladera norte donde el terreno alcanza ESA cota; la nube cuelga delante (en el aire)
      let wz = COSTA_Z + 1.2, mejor = 99;
      for (let z = COSTA_Z + 0.5; z < 6; z += 0.25) {
        const d = Math.abs(alturaSierra(wx, z) - y);
        if (d < mejor) { mejor = d; wz = z; }
      }
      // (2026-09-05, arte) CUERPOS, no sábana. Lo de 2026-09-04 («~1,9-3,1 u») medía en
      // realidad 1,9-4,5 u (ancho × esc × 2,4) a 2 u de paso: en el cuadro completo los
      // siete seguían fundidos en UNA franja blanca de x≈180 a x≈1070. Ahora cada nube
      // mide 1,3-2,3 u de ancho y ≈2:1 de relación; se tocan a veces, no se funden. La
      // silueta (lomos arriba, base plana en su cota) la pone la textura.
      out.push({
        key: `n${i}`,
        base: [wx, y, wz - 0.9],
        ancho: 1.3 + ((i * 53) % 7) / 6, // 1,3 … 2,3 u
        alto: (1.3 + ((i * 53) % 7) / 6) * (0.56 + ((i * 37) % 10) / 90), // ≈1,8:1 … 1,5:1 — cúmulo, no placa
        opacidad: (0.62 + 0.28 * (((i * 3) % 4) / 3)) * franja.amplitud,
        fase: (i * 1.7) % (Math.PI * 2),
      });
    }
    return out;
  }, [cuantas, franja]);

  useFrame((st) => {
    if (reducedMotion || !grupo.current) return;
    const t = st.clock.elapsedTime;
    grupo.current.children.forEach((n, i) => {
      n.position.x = nubes[i].base[0] + Math.sin(t * 0.045 + nubes[i].fase) * 0.9;
    });
  });

  return (
    <group ref={grupo}>
      {nubes.map((n, i) => {
        const tex = nubeTextura(i);
        return (
          <Billboard key={n.key} position={/** @type {[number, number, number]} */ (n.base)}>
            <mesh scale={[n.ancho / 2.4, n.alto / 1.6, 1]}>
              <planeGeometry args={[2.4, 1.6]} />
              {/* el color viene horneado (tres tonos); sin tonemapping, como el cielo de fondo,
                  para que el lomo pueda ser MÁS claro que el cielo */}
              <meshBasicMaterial map={tex} color={tex ? "#ffffff" : "#e9e6df"} transparent opacity={n.opacidad} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
          </Billboard>
        );
      })}
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
   la hora madre, y un cielo AZUL que rellena las sombras —antes el domo era
   dorado y el ambiente cálido: 2,42 de intensidad cálida contra 0,28 de fría,
   que mataba el azul de cinco bandas (medido). Sin shadow-map: es una vista
   lejana, el costo no se justifica en gama baja. */
function LucesSierra() {
  const k = ATMOSFERA_SIERRA.intensidad;
  return (
    <>
      <hemisphereLight intensity={k.hemisferio} color={ATMOSFERA_SIERRA.cielo} groundColor={ATMOSFERA_SIERRA.suelo} />
      <ambientLight intensity={k.ambiente} color={ATMOSFERA_SIERRA.ambiente} />
      <directionalLight position={SOL_SIERRA} intensity={k.sol} color={ATMOSFERA_SIERRA.luz} />
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

/* Marcador "usted está aquí": haz de luz suave sobre la ladera, a la altitud del
   piso de la finca. Sobrio, sin gamificación. Solo si `pisoUsuario` es válido.

   Quitado el haz vertical (cono/aro translúcido grande): sus bordes rectos se
   leían como fuga de luz y LAVABAN el color de las bandas altas (defecto §2.3.2).
   Ahora es un punto de luz suave + un aro fino pegado al suelo, SOBRE la banda y
   casi sin área de cobertura: marca sin tapar el piso que señala. */
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
      {/* aro fino pegado al suelo: "esto es donde está" sin elevarse */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.72, 24]} />
        <meshBasicMaterial color="#ffdf9c" transparent opacity={0.7} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* núcleo suave: pequeño resplandor sobre la banda, sin área de cobertura */}
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
   llegaba» (§6-B: casquete mordido + cicatriz, nunca cima llena). Reemplaza la
   cuña de conos translúcidos de `PisosTermicosBandas` (bordes rectos que lavaban
   las bandas altas). Las cintas se apoyan en las FACETAS del terreno tal como se
   dibujan (muestreadorFacetas), no en la función suave: no se hunden. Si hay
   `pisoUsuario`, las dos curvas de su banda van en el color del piso. */
function MapaDeNivel({ segmentos, pisoUsuario }) {
  const capas = useMemo(() => {
    const hF = muestreadorFacetas(alturaSierra, { ancho: ANCHO, fondo: FONDO, segX: segmentos, segZ: segmentos });
    const region = { x0: -ANCHO / 2 + 0.2, x1: ANCHO / 2 - 0.2, z0: COSTA_Z + 0.4, z1: FONDO / 2 - 0.2, paso: 0.08 };
    const out = [];
    BANDAS_SIERRA.forEach((b, i) => {
      if (!Number.isFinite(b.tope)) return;
      const lineas = contornoNivel(alturaSierra, b.tope, region);
      if (!lineas.length) return;
      const esHielo = b.id === 'superparamo';
      const suya = pisoUsuario && (b.id === pisoUsuario || BANDAS_SIERRA[i + 1]?.id === pisoUsuario);
      out.push({
        key: b.id,
        geo: geometriaCinta(lineas, hF, { ancho: esHielo ? 0.06 : suya ? 0.045 : 0.03 }),
        color: esHielo ? NIEVE.ambar : suya ? b.hexColor : NIEVE.tinta,
        opacidad: esHielo ? 0.92 : suya ? 0.85 : 0.34,
        ancla: esHielo ? lineas.flat().reduce((m, q) => (q[0] < m[0] ? q : m)) : null,   // el punto más oriental (screen-right): lejos de las etiquetas de banda, que van al occidente
      });
    });
    return out;
  }, [segmentos, pisoUsuario]);
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
      {capas.filter((c) => c.ancla).map((c) => (
        <group key={`${c.key}-rotulo`} position={[c.ancla[0], LINEA_HIELO + 0.22, c.ancla[1]]}>{/* +0,22: con la cámara nueva, a +0,06 el rótulo rozaba el de «Nival» */}
          <Html center distanceFactor={13} zIndexRange={[28, 8]} style={{ pointerEvents: 'none' }}>
            <div className="vsierra-hielo" aria-hidden="true">Hasta aquí llegaba el hielo · 4.800 m</div>
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
 * `<Canvas>` propio (otra escena, un mockup, un preview). Trae el terreno, el
 * mar, las nubes, el sol, los rótulos y —por defecto— sus luces, su niebla y su
 * crédito; el que compone puede apagarlos por props si ya los aporta.
 *
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier='alto']  presupuesto de render.
 * @param {boolean} [props.reducedMotion=false]  congela nubes/brillos.
 * @param {string}  [props.pisoUsuario]  'calido'|'templado'|'frio'|'paramo'|'superparamo'|'nival'.
 * @param {boolean} [props.luces=true]  monta las luces de la hora dorada.
 * @param {boolean} [props.atmosfera=true]  fondo + niebla dorada de la escena.
 * @param {boolean} [props.credito=true]  pie de crédito 3D a los cuatro pueblos.
 * @param {(piso:object)=>void} [props.onSeleccionPiso]  avisa al host al llegar a un piso.
 * @param {string|null} [props.pisoActivo=null]  piso resaltado desde el host.
 */
export function SierraDiorama({
  tier = 'alto',
  reducedMotion = false,
  pisoUsuario,
  luces = true,
  atmosfera = true,
  credito = true,
  onSeleccionPiso,
  pisoActivo = null,
}) {
  const perfil = perfilDeTier(tier);
  const geo = useMemo(
    () => construirTerreno(perfil.segmentosTerreno, perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  const nubes = tier === 'alto' ? 7 : tier === 'medio' ? 5 : 3;
  const faseEnso = useMemo(() => leerGateDescenso().fase ?? faseEnsoViva(), []);   // `?enso=` solo para el gate; la app lee la fase VIVA

  /* `color`/`fogExp2` se adjuntan a la ESCENA: van como hijos directos (fragment),
     nunca envueltos en un <group> (adjuntaría al grupo y no pintaría). */
  return (
    <>
      {atmosfera && <color attach="background" args={[ATMOSFERA_SIERRA.fondo]} />}
      {atmosfera && perfil.fog && <fogExp2 attach="fog" args={[ATMOSFERA_SIERRA.niebla, ATMOSFERA_SIERRA.densidadNiebla]} />}
      {atmosfera && perfil.fog && <DomoCielo />}
      {luces && <LucesSierra />}
      <SolDorado />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} onBeforeCompile={inyectarNieve} />
      </mesh>

      <Mar />
      <NubesDeNiebla cuantas={nubes} reducedMotion={reducedMotion} fase={faseEnso} />

      {/* Rótulos sobrios de los lugares exigidos por el encargo. Los `alto`
          escalonados (1.25 / 0.6 / 0.45) separan los rótulos verticalmente en
          pantalla — antes se encimaban ilegibles sobre las cumbres. */}
      <Rotulo pos={[CUMBRE.x, CUMBRE.y, CUMBRE.z]} texto="Cristóbal Colón · Simón Bolívar" sub="5.775 m" distancia={13} alto={1.25} />
      <Rotulo pos={[SIMMONDS.x, SIMMONDS.y, SIMMONDS.z]} texto="Pico Simmonds" sub="5.560 m" distancia={12} alto={0.6} />
      <Rotulo pos={[PALOMINO.x, PALOMINO.y, PALOMINO.z]} texto="Palomino" sub="Caribe · 0 m" distancia={11} alto={0.45} />

      {pisoUsuario && <MarcadorPiso piso={pisoUsuario} />}
      <MapaDeNivel segmentos={perfil.segmentosTerreno} pisoUsuario={pisoUsuario} />
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
 * @param {(piso:object)=>void} [props.onSeleccionPiso]  se llama al llegar al piso seleccionado.
 * @param {string}  [props.className]  clases extra del contenedor.
 */
export default function VistaGlobalSierra({
  tier = 'alto',
  reducedMotion = false,
  pisoUsuario,
  onSeleccionPiso,
  className = '',
}) {
  const [listo, setListo] = useState(false);
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
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [-1.5, 6.6, -12.8], fov: 48 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        {/* Cámara PARADA sobre el mar Caribe (−Z, norte), mirando al SUR (+Z) y
            un poco hacia arriba: el mar llena el primer plano y las cumbres
            nevadas suben en el tercio superior. (2026-09-05, arte) Esa intención
            estaba escrita y NO se cumplía: con la cámara en y=5,2 el borde
            inferior del cuadro caía en z≈−3,9 y el Caribe era un hilo del 6 % del
            alto, verde por la luz (medido). Más alta y más atrás —distancia 15,4
            < max 16; polar 1,27 rad dentro de [1,05, 1,45]— el mar ocupa ≈14 % y
            la cumbre sigue en el tercio superior. El encuadre roto anterior venía
            de clamps de azimuth centrados en 0 (lado equivocado) con la cámara
            en −Z (azimuth ≈ ±π): OrbitControls la teletransportaba fuera del
            macizo. Aquí los clamps abrazan el azimuth natural (≈ −3.0 rad). El
            `fov` vertical (48°) encuadra igual en portrait y en landscape. */}
        <SierraDiorama
          tier={tier}
          reducedMotion={reducedMotion}
          pisoUsuario={pisoUsuario}
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
