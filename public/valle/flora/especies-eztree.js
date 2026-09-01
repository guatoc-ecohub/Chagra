/**
 * especies-eztree.js — mapa especie → TreeOptions (generador ez-tree).
 *
 * Capa de mapeo sobre `flora/ez-tree/` (vendorizado de dgreenheck/ez-tree,
 * MIT). Cada entrada es un `TreeOptions` completo — se pasa a
 * `new Tree(options); tree.generate()` y sale un THREE.Group con dos meshes
 * (branchesMesh, leavesMesh), determinista por `seed`.
 *
 * Por qué existe esto aparte de `flora/ArbolFabrica.js` (fábrica propia,
 * atlas+billboard-cruz, 18 especies ya en el valle): son DOS generadores
 * distintos con el mismo objetivo (silueta botánica real por piso térmico,
 * look Humboldt plano). ArbolFabrica es el que corre HOY en el valle
 * (~63 draw calls, gate pasado). ez-tree es una segunda fuente — su fuerte es
 * el esqueleto L-system-like (niveles de rama recursivos + LOD nativo vía
 * THREE.LOD + shader de viento incluido) — para evaluar/mezclar más adelante,
 * NO reemplaza ArbolFabrica todavía. Los valores de altura/color/silueta de
 * abajo se alinearon a mano contra las mismas especies ya validadas en
 * `ArbolFabrica.js::ESPECIES` (gate visual ya pasado ahí) para que ambos
 * generadores queden consistentes si conviven en el mismo mundo.
 *
 * Piso térmico (Colombia, msnm aprox — mismas franjas que el grafo AGE
 * `chagra_kg` PisoTermico):
 *   calido   0–1000 m   (24–30°C)
 *   templado 1000–2000 m (18–24°C)
 *   frio     2000–3000 m (12–18°C)
 *   paramo   3000+ m     (<12°C)
 *
 * Escala: ez-tree trabaja en unidades de "longitud de rama" arbitrarias que
 * SÍ corresponden a metros de forma razonable con radios ~0.3–1.5 y alturas
 * de tronco 3–20 — se calibró `branch.length[0]` para que la altura total
 * aproximada (suma de longitudes de nivel 0..1 para deciduous, o length[0]
 * para evergreen/copa-única) quede en el rango real de cada especie.
 *
 * Determinismo: cada especie fija una `seed` entera propia. Mismo seed +
 * mismos parámetros = mismo árbol siempre (RNG multiply-with-carry en
 * `ez-tree/rng.js`). Para variantes de una misma especie, derivar semillas
 * con un offset fijo (ver `semillaVariante` al final).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ARQUETIPO Y RUTEO DE RENDER (fix 2026-08-02):
 * ez-tree genera ÁRBOLES (tronco + ramas recursivas). Forzar por ahí una
 * hierba rastrera (fresa) o una roseta de páramo (frailejón) produce un
 * "bollo sobre un palito" — la silueta sale mal sin importar el ajuste de
 * parámetros porque el algoritmo asume tronco+rama y esas plantas no lo
 * tienen. Cada entrada de `ESPECIES_EZTREE` ahora declara `arquetipo`:
 *   'arbol'   → pasa por ez-tree (`options` es un `TreeOptions`), como antes.
 *   'hierba'  → `crearHierbaBaja` (`plantas-bajas.js`) — manojo de hojas
 *               basales al ras del suelo, sin fuste leñoso. Cubre fresa +
 *               tubérculos/hortalizas bajas (papa, oca, ulluco, arracacha,
 *               quinua, arveja, cilantro, manzanilla, romero, ruda, agraz
 *               de páramo, romero de páramo).
 *   'roseta'  → `crearRoseta` — tronco corto + corona de hojas rígidas
 *               irradiando (frailejón).
 *   'pajonal' → `crearPajonal` — macolla de gramínea sin tronco (pasto de
 *               páramo).
 * Usar `crearPlanta(clave)` (exportada al final de este archivo) en vez de
 * instanciar `Tree` directamente — ella enruta según `arquetipo`.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * EXCLUSIÓN DE ESPECIES ANTAGONISTAS (fix 2026-08-02):
 * Chagra enseña agroecología CONTRA el monocultivo de plantación exótica —
 * es literalmente el tema del jefe "Monstruo del Monocultivo/Veneno" en el
 * juego. Ninguna especie de `ESPECIES_EXCLUIDAS` (ver export abajo) puede
 * aparecer en este mapa ni en futuros mapeos derivados del catálogo 742.
 */
import { Billboard, TreeType } from './ez-tree/enums.js';
import { crearHierbaBaja, crearRoseta, crearPajonal } from './plantas-bajas.js';

/**
 * @typedef {import('./ez-tree/options.js').default} TreeOptions
 */

/**
 * Especies EXCLUIDAS de por vida de `ESPECIES_EZTREE` y de cualquier mapeo
 * futuro que escale hacia las 742 especies del grafo `chagra_kg` — son el
 * villano pedagógico del juego (monocultivo de plantación / exótica-
 * invasora), nunca decoración neutra del valle. Detectado en gate visual
 * 2026-08-02: `eucalipto` estaba en el mapa como si fuera una especie más.
 *
 * @type {Record<string, string>} nombreCientifico → por qué se excluye
 */
export const ESPECIES_EXCLUIDAS = {
  'Eucalyptus globulus': 'Monocultivo de plantación exótico-invasor; alelopático, seca acuíferos/páramo. Antagonista pedagógico central (jefe "Monstruo del Monocultivo").',
  'Eucalyptus grandis': 'Idem Eucalyptus globulus — género completo excluido.',
  'Pinus patula': 'Conífera de plantación exótico-invasora en páramo/subpáramo andino; acidifica suelo, desplaza flora nativa.',
  'Pinus radiata': 'Idem Pinus patula — género Pinus de plantación excluido.',
  'Ulex europaeus': 'Retamo espinoso — invasora agresiva de páramo, catalogada como tal en el catálogo Chagra (`especies_invasoras`), antagonista documentado de especies de valor (ver `erythrina_edulis.antagonists`).',
  'Acacia melanoxylon': 'Acacia negra — invasora de plantación forestal, desplaza bosque andino nativo.',
  'Acacia decurrens': 'Acacia negra/mimosa — invasora de plantación forestal en zona cafetera/andina.',
  'Acacia mearnsii': 'Mimosa negra — invasora de plantación forestal, fija N de forma agresiva y desplaza nativas.',
};

/**
 * @type {Record<string, { pisoTermico: string, nombreComun: string, nombreCientifico: string, arquetipo: 'arbol'|'hierba'|'roseta'|'pajonal', options: object }>}
 */
export const ESPECIES_EZTREE = {
  // ─────────────────────────────────────────────────────────────────────
  // Cacao (Theobroma cacao) — piso CÁLIDO. Árbol bajo (4.5–6.5 m), copa
  // densa y REDONDA, hoja grande. Sombra de dosel bajo típica de chagra
  // cacaotera. Referencia silueta: ArbolFabrica.ESPECIES.cacao
  // (altura 4.6–6.4, copaChata 0.92 ≈ casi esférica, colHoja verde oscuro-cálido).
  // ─────────────────────────────────────────────────────────────────────
  cacao: {
    pisoTermico: 'calido',
    nombreComun: 'Cacao',
    nombreCientifico: 'Theobroma cacao',
    arquetipo: 'arbol',
    options: {
      seed: 10001,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x8a5a3c,          // corteza rojiza-parda, tronco corto
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 2,               // fuste corto + copa densa (no 3 niveles: se ve bajo y compacto)
        angle: { 1: 62, 2: 60, 3: 60 },
        children: { 0: 6, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.01 },
        gnarliness: { 0: 0.12, 1: 0.22, 2: 0.15, 3: 0.05 },
        // Nivel 0 = tronco corto (~2.2), nivel 1 = ramas de copa (~2.6) → altura total ~4.8, en rango.
        length: { 0: 2.2, 1: 2.6, 2: 1.2, 3: 1 },
        radius: { 0: 0.42, 1: 0.30, 2: 0.22, 3: 0.15 },
        sections: { 0: 8, 1: 8, 2: 6, 3: 4 },
        segments: { 0: 7, 1: 6, 2: 5, 3: 3 },
        start: { 1: 0.30, 2: 0.15, 3: 0.2 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.6, 3: 0.6 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'cacao',
        map: null,
        billboard: Billboard.Double,
        angle: 38,
        count: 16,                // copa densa
        start: 0.15,
        size: 1.05,                // hoja grande de cacao
        sizeVariance: 0.5,
        tint: 0x3f7a2e,            // verde oscuro cálido (ArbolFabrica colHoja ~[0.50,0.80,0.38])
        alphaTest: 0.5,
        roundedNormals: true,      // copa redonda llena
      },
      trellis: { enabled: false },
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // Café (Coffea arabica) — piso TEMPLADO. Arbusto-árbol pequeño (2–3.5 m),
  // hoja brillante. Referencia: ArbolFabrica.ESPECIES.cafe (altura 2.2–3.4).
  // ─────────────────────────────────────────────────────────────────────
  cafe: {
    pisoTermico: 'templado',
    nombreComun: 'Café',
    nombreCientifico: 'Coffea arabica',
    arquetipo: 'arbol',
    options: {
      seed: 10002,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x6e5138,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 2,
        angle: { 1: 55, 2: 50, 3: 50 },
        children: { 0: 5, 1: 4, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.015 },
        gnarliness: { 0: 0.10, 1: 0.16, 2: 0.12, 3: 0.04 },
        // Arbusto pequeño: tronco 1.0, ramas 1.4 → altura total ~2.4
        length: { 0: 1.0, 1: 1.4, 2: 0.7, 3: 0.5 },
        radius: { 0: 0.20, 1: 0.14, 2: 0.09, 3: 0.06 },
        sections: { 0: 6, 1: 6, 2: 5, 3: 3 },
        segments: { 0: 6, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.25, 2: 0.2, 3: 0.2 },
        taper: { 0: 0.5, 1: 0.5, 2: 0.55, 3: 0.55 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'cafe',
        map: null,
        billboard: Billboard.Double,
        angle: 32,
        count: 20,                 // follaje denso de arbusto
        start: 0.1,
        size: 0.42,                 // hoja pequeña brillante
        sizeVariance: 0.45,
        tint: 0x3a8a3f,             // verde brillante café (ArbolFabrica colHoja ~[0.48,0.82,0.42])
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // Aguacate (Persea americana) — piso CÁLIDO-TEMPLADO. Copa ancha
  // redondeada, verde oscuro. Referencia: ArbolFabrica.ESPECIES.aguacate
  // (altura 8.5–11.5, copaChata 0.74 = redondeada no aplastada).
  // ─────────────────────────────────────────────────────────────────────
  aguacate: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Aguacate',
    nombreCientifico: 'Persea americana',
    arquetipo: 'arbol',
    options: {
      seed: 10003,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x7a5f45,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 3,
        angle: { 1: 58, 2: 55, 3: 50 },
        children: { 0: 6, 1: 4, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.012 },
        gnarliness: { 0: 0.10, 1: 0.15, 2: 0.14, 3: 0.06 },
        // Tronco 4.5 + rama nivel1 3.2 + nivel2 1.8 → altura total ~9.5
        length: { 0: 4.5, 1: 3.2, 2: 1.8, 3: 0.8 },
        radius: { 0: 0.55, 1: 0.36, 2: 0.22, 3: 0.12 },
        sections: { 0: 10, 1: 9, 2: 7, 3: 4 },
        segments: { 0: 8, 1: 6, 2: 5, 3: 3 },
        start: { 1: 0.38, 2: 0.28, 3: 0.25 },
        taper: { 0: 0.6, 1: 0.6, 2: 0.6, 3: 0.6 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'aguacate',
        map: null,
        billboard: Billboard.Double,
        angle: 30,
        count: 18,
        start: 0.2,
        size: 0.85,
        sizeVariance: 0.55,
        tint: 0x357033,             // verde oscuro (ArbolFabrica colHoja ~[0.46,0.74,0.36])
        alphaTest: 0.5,
        roundedNormals: true,       // copa ancha redondeada
      },
      trellis: { enabled: false },
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // Guayacán rosado (Tabebuia rosea / Handroanthus roseus) — piso
  // CÁLIDO-TEMPLADO. Copa en SOMBRILLA plana (silueta parasol), floración
  // rosada llamativa. Referencia: ArbolFabrica.ESPECIES.guayacan
  // (copaChata 0.46 = muy aplastada, colHoja rosado).
  // ─────────────────────────────────────────────────────────────────────
  guayacan_rosado: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Guayacán rosado',
    nombreCientifico: 'Handroanthus roseus',
    arquetipo: 'arbol',
    options: {
      seed: 10004,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x9c8264,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 2,
        // Ángulo de rama alto → ramas casi horizontales = silueta sombrilla
        angle: { 1: 80, 2: 78, 3: 70 },
        children: { 0: 7, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.006 },
        gnarliness: { 0: 0.08, 1: 0.10, 2: 0.10, 3: 0.05 },
        // Fuste alto 6.5 + copa plana extendida 3.5 → altura total ~10, dosel ancho
        length: { 0: 6.5, 1: 3.5, 2: 1.6, 3: 0.8 },
        radius: { 0: 0.40, 1: 0.24, 2: 0.15, 3: 0.09 },
        sections: { 0: 10, 1: 8, 2: 6, 3: 4 },
        segments: { 0: 8, 1: 6, 2: 4, 3: 3 },
        start: { 1: 0.55, 2: 0.2, 3: 0.2 },
        taper: { 0: 0.55, 1: 0.5, 2: 0.55, 3: 0.55 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'guayacan_rosado',
        map: null,
        billboard: Billboard.Double,
        angle: 55,                  // hojas/flores muy horizontales → refuerza sombrilla
        count: 15,
        start: 0.35,
        size: 0.75,
        sizeVariance: 0.5,
        tint: 0xe08cc4,              // rosado floración (ArbolFabrica colHoja ~[1.02,0.86,0.98] sobre tile rosa)
        alphaTest: 0.5,
        roundedNormals: false,       // copa plana: normales de cara, NO redondeadas
      },
      trellis: { enabled: false },
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // Aliso andino (Alnus acuminata) — piso FRÍO. Árbol alto y esbelto
  // (13–18 m), copa vertical estrecha (ripario, borde de quebrada).
  // Referencia: ArbolFabrica.ESPECIES.aliso (copaRadio angosto, copaChata 1.02).
  // ─────────────────────────────────────────────────────────────────────
  aliso_andino: {
    pisoTermico: 'frio',
    nombreComun: 'Aliso andino',
    nombreCientifico: 'Alnus acuminata',
    arquetipo: 'arbol',
    options: {
      seed: 10005,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark002',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0xb8b3a0,             // corteza clara grisácea, como abedul
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 2,
        // Ángulos bajos → ramas pegadas al eje = columna vertical esbelta
        angle: { 1: 28, 2: 22, 3: 18 },
        children: { 0: 5, 1: 3, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.02 },
        gnarliness: { 0: 0.03, 1: 0.05, 2: 0.05, 3: 0.02 },
        // Fuste 9.5 + copa alta angosta 5.5 → altura total ~15, en rango 13-18
        length: { 0: 9.5, 1: 5.5, 2: 2.2, 3: 1 },
        radius: { 0: 0.38, 1: 0.22, 2: 0.13, 3: 0.08 },
        sections: { 0: 12, 1: 10, 2: 7, 3: 4 },
        segments: { 0: 8, 1: 6, 2: 4, 3: 3 },
        start: { 1: 0.5, 2: 0.3, 3: 0.2 },
        taper: { 0: 0.4, 1: 0.35, 2: 0.4, 3: 0.4 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'aliso',
        map: null,
        billboard: Billboard.Double,
        angle: 15,                  // hojas casi verticales → refuerza silueta columnar
        count: 12,
        start: 0.35,
        size: 0.55,
        sizeVariance: 0.4,
        tint: 0x4f9450,              // verde claro-frío (ArbolFabrica colHoja ~[0.76,1.04,0.58])
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // Palma de coco (Cocos nucifera) — piso CÁLIDO (costero). Tronco único
  // sin ramificar, penacho de frondas en la copa. ez-tree no tiene un tipo
  // "palma" nativo (branch.levels=0 + muchas hojas largas en la punta
  // simula el penacho razonablemente — igual que ArbolFabrica usa copa
  // tipo 'palma' con niveles:0).
  // ─────────────────────────────────────────────────────────────────────
  palma_coco: {
    pisoTermico: 'calido',
    nombreComun: 'Palma de coco',
    nombreCientifico: 'Cocos nucifera',
    arquetipo: 'arbol',
    options: {
      seed: 10006,
      type: TreeType.Evergreen,     // evergreen: sin rama terminal, taper=1 → tronco liso hasta la punta
      bark: {
        type: 'Bark003',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0xc9b48a,              // tronco anillado claro
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 0,                  // SOLO tronco: sin ramas, el penacho lo dan las hojas
        angle: { 1: 60, 2: 60, 3: 60 },
        children: { 0: 0, 1: 0, 2: 0 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.03 }, // fuste curvo típico de coco
        gnarliness: { 0: 0.10, 1: 0, 2: 0, 3: 0 },
        length: { 0: 9.5, 1: 1, 2: 1, 3: 1 },
        radius: { 0: 0.22, 1: 0.1, 2: 0.1, 3: 0.1 },
        sections: { 0: 14, 1: 6, 2: 6, 3: 4 },
        segments: { 0: 7, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.9, 2: 0.9, 3: 0.9 },
        taper: { 0: 0.15, 1: 0.15, 2: 0.15, 3: 0.15 }, // tronco casi cilíndrico, apenas afila
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'palma_coco',
        map: null,
        billboard: Billboard.Double,
        angle: 45,                  // frondas arqueadas hacia afuera desde la punta
        count: 11,                  // penacho de frondas
        start: 0.94,                 // TODAS nacen cerca de la punta del tronco → penacho, no follaje disperso
        size: 2.4,                   // frondas largas
        sizeVariance: 0.25,
        tint: 0x4c8a3e,               // verde palma cálido
        alphaTest: 0.5,
        roundedNormals: false,        // frondas planas rígidas, no copa esférica
      },
      trellis: { enabled: false },
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // ── EXTENSIÓN 2026-08-02: 6 → 50 especies (brief Angelita v2) ──
  // Las 44 especies siguientes cubren variedad de FORMA (árbol grande,
  // arbolito, arbusto, palma, hierba/tubérculo de porte bajo, roseta de
  // páramo) x PISO TÉRMICO (cálido → páramo), tomadas del catálogo real
  // `chagra/catalog/chagra-catalog-oss-subset-v3.2.json` (581 especies).
  // Mismo criterio que las 6 originales: TreeOptions calibrado a mano por
  // especie, altura aproximada verificada contra bibliografía agronómica
  // básica (rangos de porte conocidos), seed entera fija (20001-20046,
  // sin colisión con 10001-10006 de las 6 originales), sin texturas
  // (look ilustrado plano). Generación verificada 44/44 sin excepciones
  // (`Tree.generate()` corrido headless en Node antes de integrar) — ver
  // alturas/radios/vértices resultantes en BITACORA-flora-eztree.md.
  //
  // Hierbas/tubérculos bajos (papa, oca, quinua, cilantro…) y roseta de
  // páramo (frailejón, pajonal) usan `branch.levels:0` + muchas "hojas"
  // grandes desde la base — ez-tree no tiene un tipo roseta/mata nativo;
  // esta es la MISMA aproximación que ya usaba `palma_coco` (tronco corto
  // o nulo + penacho de hojas). Da silueta reconocible y determinista sin
  // sumar otra librería; documentado como aproximación, no solución ideal
  // (ver TODO punto 3 más abajo — sigue pendiente un generador de roseta
  // dedicado si se necesita más fidelidad en el páramo).
  // ═══════════════════════════════════════════════════════════════════

  mango: {
    pisoTermico: 'calido',
    nombreComun: 'Mango',
    nombreCientifico: 'Mangifera indica',
    // copa densa muy redonda, verde oscuro brillante; dosel de sombra clásico
    arquetipo: 'arbol',
    options: {
      seed: 20001,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x6b4a30,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 3,
        angle: { 1: 56, 2: 52, 3: 48 },
        children: { 0: 7, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.012 },
        gnarliness: { 0: 0.1, 1: 0.16, 2: 0.14, 3: 0.06 },
        length: { 0: 6.0, 1: 3.8, 2: 2.0, 3: 0.9 },
        radius: { 0: 0.62, 1: 0.38, 2: 0.24, 3: 0.14 },
        sections: { 0: 11, 1: 9, 2: 7, 3: 4 },
        segments: { 0: 8, 1: 6, 2: 5, 3: 3 },
        start: { 1: 0.34, 2: 0.26, 3: 0.22 },
        taper: { 0: 0.6, 1: 0.6, 2: 0.6, 3: 0.6 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'mango',
        map: null,
        billboard: Billboard.Double,
        angle: 32,
        count: 20,
        start: 0.18,
        size: 0.95,
        sizeVariance: 0.5,
        tint: 0x2f6b2e,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  ceiba: {
    pisoTermico: 'calido',
    nombreComun: 'Ceiba algodón',
    nombreCientifico: 'Ceiba pentandra',
    // gigante emergente (hasta 25-40m), fuste recto grueso, copa alta aplanada tipo paraguas
    arquetipo: 'arbol',
    options: {
      seed: 20002,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark002',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x8f8a78,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 3,
        angle: { 1: 62, 2: 58, 3: 52 },
        children: { 0: 8, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.008 },
        gnarliness: { 0: 0.06, 1: 0.1, 2: 0.12, 3: 0.05 },
        length: { 0: 11.0, 1: 5.5, 2: 2.6, 3: 1.0 },
        radius: { 0: 0.95, 1: 0.5, 2: 0.28, 3: 0.15 },
        sections: { 0: 14, 1: 10, 2: 7, 3: 4 },
        segments: { 0: 9, 1: 6, 2: 5, 3: 3 },
        start: { 1: 0.55, 2: 0.3, 3: 0.22 },
        taper: { 0: 0.5, 1: 0.5, 2: 0.55, 3: 0.55 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'ceiba',
        map: null,
        billboard: Billboard.Double,
        angle: 45,
        count: 14,
        start: 0.4,
        size: 1.1,
        sizeVariance: 0.5,
        tint: 0x4a7a3a,
        alphaTest: 0.5,
        roundedNormals: false,
      },
      trellis: { enabled: false },
    },
  },

  samán: {
    pisoTermico: 'calido',
    nombreComun: 'Campano / Samán',
    nombreCientifico: 'Samanea saman',
    // copa EXTENDIDA horizontal (sombrilla ancha icónica de potrero), fuste corto grueso
    arquetipo: 'arbol',
    options: {
      seed: 20003,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x7a6248,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 2,
        angle: { 1: 78, 2: 72, 3: 65 },
        children: { 0: 8, 1: 6, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.006 },
        gnarliness: { 0: 0.08, 1: 0.1, 2: 0.1, 3: 0.05 },
        length: { 0: 5.5, 1: 5.0, 2: 2.2, 3: 1.0 },
        radius: { 0: 0.6, 1: 0.34, 2: 0.2, 3: 0.12 },
        sections: { 0: 11, 1: 9, 2: 6, 3: 4 },
        segments: { 0: 8, 1: 6, 2: 4, 3: 3 },
        start: { 1: 0.5, 2: 0.22, 3: 0.2 },
        taper: { 0: 0.5, 1: 0.48, 2: 0.55, 3: 0.55 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'samán',
        map: null,
        billboard: Billboard.Double,
        angle: 58,
        count: 18,
        start: 0.3,
        size: 1.15,
        sizeVariance: 0.5,
        tint: 0x4c7d3f,
        alphaTest: 0.5,
        roundedNormals: false,
      },
      trellis: { enabled: false },
    },
  },

  papaya: {
    pisoTermico: 'calido',
    nombreComun: 'Papaya',
    nombreCientifico: 'Carica papaya',
    // palmoide: tronco único sin ramas, penacho grande de hojas palmeadas en la punta
    arquetipo: 'arbol',
    options: {
      seed: 20004,
      type: TreeType.Evergreen,
      bark: {
        type: 'Bark003',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x8fae7c,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 0,
        angle: { 1: 60, 2: 60, 3: 60 },
        children: { 0: 0, 1: 0, 2: 0 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.02 },
        gnarliness: { 0: 0.06, 1: 0, 2: 0, 3: 0 },
        length: { 0: 4.2, 1: 1, 2: 1, 3: 1 },
        radius: { 0: 0.16, 1: 0.08, 2: 0.08, 3: 0.08 },
        sections: { 0: 9, 1: 5, 2: 5, 3: 4 },
        segments: { 0: 6, 1: 4, 2: 4, 3: 3 },
        start: { 1: 0.9, 2: 0.9, 3: 0.9 },
        taper: { 0: 0.2, 1: 0.2, 2: 0.2, 3: 0.2 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'papaya',
        map: null,
        billboard: Billboard.Double,
        angle: 40,
        count: 10,
        start: 0.9,
        size: 1.7,
        sizeVariance: 0.3,
        tint: 0x3f8a3a,
        alphaTest: 0.5,
        roundedNormals: false,
      },
      trellis: { enabled: false },
    },
  },

  banano: {
    pisoTermico: 'calido',
    nombreComun: 'Banano / Guineo',
    nombreCientifico: 'Musa acuminata',
    // pseudotallo sin ramas + hojas MUY grandes y largas colgantes en la punta
    arquetipo: 'arbol',
    options: {
      seed: 20005,
      type: TreeType.Evergreen,
      bark: {
        type: 'Bark003',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x7a9a5e,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 0,
        angle: { 1: 60, 2: 60, 3: 60 },
        children: { 0: 0, 1: 0, 2: 0 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.015 },
        gnarliness: { 0: 0.04, 1: 0, 2: 0, 3: 0 },
        length: { 0: 2.8, 1: 1, 2: 1, 3: 1 },
        radius: { 0: 0.22, 1: 0.1, 2: 0.1, 3: 0.1 },
        sections: { 0: 9, 1: 5, 2: 5, 3: 4 },
        segments: { 0: 6, 1: 4, 2: 4, 3: 3 },
        start: { 1: 0.85, 2: 0.85, 3: 0.85 },
        taper: { 0: 0.1, 1: 0.1, 2: 0.1, 3: 0.1 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'banano',
        map: null,
        billboard: Billboard.Double,
        angle: 25,
        count: 8,
        start: 0.85,
        size: 2.6,
        sizeVariance: 0.2,
        tint: 0x4c9a3f,
        alphaTest: 0.5,
        roundedNormals: false,
      },
      trellis: { enabled: false },
    },
  },

  guamo: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Guamo',
    nombreCientifico: 'Inga edulis',
    // sombra clásica del cafetal: copa media redondeada, hoja compuesta fina (densidad alta compensa)
    arquetipo: 'arbol',
    options: {
      seed: 20006,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x746048,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 2,
        angle: { 1: 60, 2: 55, 3: 50 },
        children: { 0: 6, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.012 },
        gnarliness: { 0: 0.1, 1: 0.16, 2: 0.13, 3: 0.05 },
        length: { 0: 4.8, 1: 3.6, 2: 1.8, 3: 0.9 },
        radius: { 0: 0.42, 1: 0.26, 2: 0.16, 3: 0.1 },
        sections: { 0: 9, 1: 8, 2: 6, 3: 4 },
        segments: { 0: 7, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.4, 2: 0.25, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'guamo',
        map: null,
        billboard: Billboard.Double,
        angle: 34,
        count: 17,
        start: 0.2,
        size: 0.7,
        sizeVariance: 0.45,
        tint: 0x3d7a37,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  zapote: {
    pisoTermico: 'calido',
    nombreComun: 'Zapote / Mamey zapote',
    nombreCientifico: 'Pouteria sapota',
    // árbol columnar alto, copa piramidal densa verde muy oscuro
    arquetipo: 'arbol',
    options: {
      seed: 20007,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x5f4530,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 3,
        angle: { 1: 52, 2: 48, 3: 45 },
        children: { 0: 6, 1: 4, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.01 },
        gnarliness: { 0: 0.08, 1: 0.12, 2: 0.1, 3: 0.05 },
        length: { 0: 7.5, 1: 4.2, 2: 2.0, 3: 0.9 },
        radius: { 0: 0.55, 1: 0.32, 2: 0.19, 3: 0.11 },
        sections: { 0: 11, 1: 9, 2: 6, 3: 4 },
        segments: { 0: 8, 1: 6, 2: 4, 3: 3 },
        start: { 1: 0.36, 2: 0.25, 3: 0.2 },
        taper: { 0: 0.6, 1: 0.58, 2: 0.6, 3: 0.6 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'zapote',
        map: null,
        billboard: Billboard.Double,
        angle: 28,
        count: 16,
        start: 0.2,
        size: 0.9,
        sizeVariance: 0.4,
        tint: 0x36622f,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  palma_vino: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Palma de vino',
    nombreCientifico: 'Attalea butyracea',
    // palma gruesa monumental, fuste grueso, penacho amplio de frondas largas arqueadas
    arquetipo: 'arbol',
    options: {
      seed: 20008,
      type: TreeType.Evergreen,
      bark: {
        type: 'Bark003',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0xc2a878,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 0,
        angle: { 1: 60, 2: 60, 3: 60 },
        children: { 0: 0, 1: 0, 2: 0 },
        force: { direction: { x: 0, y: 1, z: 0.5 }, strength: 0.03 },
        gnarliness: { 0: 0.08, 1: 0, 2: 0, 3: 0 },
        length: { 0: 10.5, 1: 1, 2: 1, 3: 1 },
        radius: { 0: 0.24, 1: 0.11, 2: 0.11, 3: 0.11 },
        sections: { 0: 15, 1: 6, 2: 6, 3: 4 },
        segments: { 0: 7, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.93, 2: 0.93, 3: 0.93 },
        taper: { 0: 0.15, 1: 0.15, 2: 0.15, 3: 0.15 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'palma_vino',
        map: null,
        billboard: Billboard.Double,
        angle: 42,
        count: 13,
        start: 0.94,
        size: 2.6,
        sizeVariance: 0.25,
        tint: 0x568a3f,
        alphaTest: 0.5,
        roundedNormals: false,
      },
      trellis: { enabled: false },
    },
  },

  nogal_cafetero: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Nogal cafetero',
    nombreCientifico: 'Cordia alliodora',
    // fuste recto muy alto y esbelto, copa alta pequeña abierta — sombra rala del cafetal
    arquetipo: 'arbol',
    options: {
      seed: 20009,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x8a6b45,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 3,
        angle: { 1: 48, 2: 45, 3: 42 },
        children: { 0: 5, 1: 4, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.014 },
        gnarliness: { 0: 0.07, 1: 0.1, 2: 0.1, 3: 0.04 },
        length: { 0: 8.5, 1: 3.6, 2: 1.8, 3: 0.8 },
        radius: { 0: 0.32, 1: 0.19, 2: 0.12, 3: 0.08 },
        sections: { 0: 11, 1: 8, 2: 6, 3: 4 },
        segments: { 0: 7, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.42, 2: 0.28, 3: 0.22 },
        taper: { 0: 0.62, 1: 0.6, 2: 0.6, 3: 0.6 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'nogal_cafetero',
        map: null,
        billboard: Billboard.Double,
        angle: 34,
        count: 13,
        start: 0.28,
        size: 0.6,
        sizeVariance: 0.4,
        tint: 0x5f8a4a,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  guayacan_amarillo: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Guayacán amarillo',
    nombreCientifico: 'Tabebuia chrysantha',
    // sombrilla como el rosado pero floración AMARILLA intensa (oro), silueta gemela
    arquetipo: 'arbol',
    options: {
      seed: 20010,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x9c8264,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 2,
        angle: { 1: 76, 2: 72, 3: 66 },
        children: { 0: 7, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.007 },
        gnarliness: { 0: 0.08, 1: 0.1, 2: 0.1, 3: 0.05 },
        length: { 0: 6.0, 1: 3.2, 2: 1.5, 3: 0.8 },
        radius: { 0: 0.38, 1: 0.22, 2: 0.14, 3: 0.09 },
        sections: { 0: 10, 1: 8, 2: 6, 3: 4 },
        segments: { 0: 8, 1: 6, 2: 4, 3: 3 },
        start: { 1: 0.52, 2: 0.2, 3: 0.2 },
        taper: { 0: 0.55, 1: 0.5, 2: 0.55, 3: 0.55 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'guayacan_amarillo',
        map: null,
        billboard: Billboard.Double,
        angle: 52,
        count: 15,
        start: 0.35,
        size: 0.72,
        sizeVariance: 0.5,
        tint: 0xe8c23a,
        alphaTest: 0.5,
        roundedNormals: false,
      },
      trellis: { enabled: false },
    },
  },

  limon: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Limón común',
    nombreCientifico: 'Citrus aurantiifolia',
    // arbusto-arbolito pequeño (2.5-4m), copa densa muy redonda, verde brillante
    arquetipo: 'arbol',
    options: {
      seed: 20011,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x5f7a44,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 2,
        angle: { 1: 58, 2: 54, 3: 50 },
        children: { 0: 6, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.012 },
        gnarliness: { 0: 0.1, 1: 0.14, 2: 0.12, 3: 0.05 },
        length: { 0: 1.6, 1: 1.6, 2: 1.0, 3: 0.6 },
        radius: { 0: 0.16, 1: 0.1, 2: 0.07, 3: 0.05 },
        sections: { 0: 7, 1: 6, 2: 5, 3: 3 },
        segments: { 0: 6, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.3, 2: 0.22, 3: 0.2 },
        taper: { 0: 0.5, 1: 0.5, 2: 0.55, 3: 0.55 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'limon',
        map: null,
        billboard: Billboard.Double,
        angle: 34,
        count: 20,
        start: 0.15,
        size: 0.4,
        sizeVariance: 0.5,
        tint: 0x3f8a3f,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  yarumo: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Yarumo plateado',
    nombreCientifico: 'Cecropia telealba',
    // pionera de guadua: fuste hueco recto, ramas escasas en candelabro, hoja grande palmeada plateada (tinte claro)
    arquetipo: 'arbol',
    options: {
      seed: 20012,
      type: TreeType.Evergreen,
      bark: {
        type: 'Bark002',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0xb0aa96,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 1,
        angle: { 1: 66, 2: 60, 3: 55 },
        children: { 0: 5, 1: 0, 2: 0 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.01 },
        gnarliness: { 0: 0.05, 1: 0.08, 2: 0, 3: 0 },
        length: { 0: 7.5, 1: 1.4, 2: 1, 3: 1 },
        radius: { 0: 0.24, 1: 0.1, 2: 0.08, 3: 0.08 },
        sections: { 0: 11, 1: 6, 2: 5, 3: 4 },
        segments: { 0: 7, 1: 4, 2: 4, 3: 3 },
        start: { 1: 0.6, 2: 0.5, 3: 0.5 },
        taper: { 0: 0.4, 1: 0.4, 2: 0.4, 3: 0.4 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'yarumo',
        map: null,
        billboard: Billboard.Double,
        angle: 50,
        count: 9,
        start: 0.55,
        size: 1.3,
        sizeVariance: 0.35,
        tint: 0xb7c47a,
        alphaTest: 0.5,
        roundedNormals: false,
      },
      trellis: { enabled: false },
    },
  },

  yuca: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Yuca dulce',
    nombreCientifico: 'Manihot esculenta',
    // arbusto bajo (1.5-2.5m) de tallo leñoso ralo, hoja palmeada — silueta simple de tubérculo
    arquetipo: 'arbol',
    options: {
      seed: 20013,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x9c7a52,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 1,
        angle: { 1: 55, 2: 50, 3: 0 },
        children: { 0: 4, 1: 0, 2: 0 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.02 },
        gnarliness: { 0: 0.1, 1: 0.14, 2: 0, 3: 0 },
        length: { 0: 1.8, 1: 0.9, 2: 1, 3: 1 },
        radius: { 0: 0.09, 1: 0.05, 2: 0.05, 3: 0.05 },
        sections: { 0: 6, 1: 5, 2: 4, 3: 3 },
        segments: { 0: 5, 1: 4, 2: 3, 3: 3 },
        start: { 1: 0.35, 2: 0.3, 3: 0.3 },
        taper: { 0: 0.45, 1: 0.45, 2: 0.45, 3: 0.45 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'yuca',
        map: null,
        billboard: Billboard.Double,
        angle: 30,
        count: 10,
        start: 0.2,
        size: 0.5,
        sizeVariance: 0.45,
        tint: 0x4a8a3a,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  ceiba_tolua: {
    pisoTermico: 'calido',
    nombreComun: 'Ceiba tolúa',
    nombreCientifico: 'Bombacopsis quinata',
    // maderable emergente, copa redondeada alta, más compacta que la ceiba algodón
    arquetipo: 'arbol',
    options: {
      seed: 20014,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark002',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x8a7a5f,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 3,
        angle: { 1: 58, 2: 54, 3: 50 },
        children: { 0: 7, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.009 },
        gnarliness: { 0: 0.08, 1: 0.12, 2: 0.11, 3: 0.05 },
        length: { 0: 9.0, 1: 4.4, 2: 2.0, 3: 0.9 },
        radius: { 0: 0.65, 1: 0.36, 2: 0.2, 3: 0.12 },
        sections: { 0: 12, 1: 9, 2: 6, 3: 4 },
        segments: { 0: 8, 1: 6, 2: 4, 3: 3 },
        start: { 1: 0.4, 2: 0.26, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'ceiba_tolua',
        map: null,
        billboard: Billboard.Double,
        angle: 36,
        count: 16,
        start: 0.25,
        size: 0.85,
        sizeVariance: 0.4,
        tint: 0x437a38,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  lulo: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Lulo',
    nombreCientifico: 'Solanum quitoense',
    // arbusto bajo (1-2m), hoja MUY grande aterciopelada — silueta simple de sotobosque
    arquetipo: 'arbol',
    options: {
      seed: 20016,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x4a6b3a,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 1,
        angle: { 1: 52, 2: 0, 3: 0 },
        children: { 0: 5, 1: 0, 2: 0 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.02 },
        gnarliness: { 0: 0.12, 1: 0.1, 2: 0, 3: 0 },
        length: { 0: 1.1, 1: 0.7, 2: 1, 3: 1 },
        radius: { 0: 0.08, 1: 0.05, 2: 0.05, 3: 0.05 },
        sections: { 0: 6, 1: 5, 2: 4, 3: 3 },
        segments: { 0: 5, 1: 4, 2: 3, 3: 3 },
        start: { 1: 0.3, 2: 0.3, 3: 0.3 },
        taper: { 0: 0.4, 1: 0.4, 2: 0.4, 3: 0.4 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'lulo',
        map: null,
        billboard: Billboard.Double,
        angle: 40,
        count: 12,
        start: 0.15,
        size: 0.75,
        sizeVariance: 0.4,
        tint: 0x4a7d3a,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  tomate_arbol: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Tomate de árbol',
    nombreCientifico: 'Solanum betaceum',
    // arbolito bajo (2-3m) de copa rala, ya en ArbolFabrica como tomatedearbol — aquí variante ez-tree
    arquetipo: 'arbol',
    options: {
      seed: 20017,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x5f6b3f,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 1,
        angle: { 1: 50, 2: 0, 3: 0 },
        children: { 0: 5, 1: 0, 2: 0 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.018 },
        gnarliness: { 0: 0.1, 1: 0.1, 2: 0, 3: 0 },
        length: { 0: 1.8, 1: 1.0, 2: 1, 3: 1 },
        radius: { 0: 0.12, 1: 0.07, 2: 0.05, 3: 0.05 },
        sections: { 0: 6, 1: 5, 2: 4, 3: 3 },
        segments: { 0: 5, 1: 4, 2: 3, 3: 3 },
        start: { 1: 0.32, 2: 0.3, 3: 0.3 },
        taper: { 0: 0.45, 1: 0.45, 2: 0.45, 3: 0.45 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'tomate_arbol',
        map: null,
        billboard: Billboard.Double,
        angle: 36,
        count: 14,
        start: 0.18,
        size: 0.55,
        sizeVariance: 0.45,
        tint: 0x3f7a3f,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  curuba: {
    pisoTermico: 'templado',
    nombreComun: 'Curuba india',
    nombreCientifico: 'Passiflora tarminiana',
    // trepadora de espaldera: usa trellis desactivado pero fuerza lateral simula guía; hoja lobulada
    arquetipo: 'arbol',
    options: {
      seed: 20018,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x5a6b3a,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 1,
        angle: { 1: 35, 2: 0, 3: 0 },
        children: { 0: 6, 1: 0, 2: 0 },
        force: { direction: { x: 0, y: 0.6, z: 0.3 }, strength: 0.04 },
        gnarliness: { 0: 0.2, 1: 0.15, 2: 0, 3: 0 },
        length: { 0: 2.2, 1: 1.4, 2: 1, 3: 1 },
        radius: { 0: 0.05, 1: 0.03, 2: 0.03, 3: 0.03 },
        sections: { 0: 6, 1: 4, 2: 3, 3: 3 },
        segments: { 0: 4, 1: 3, 2: 3, 3: 3 },
        start: { 1: 0.25, 2: 0.3, 3: 0.3 },
        taper: { 0: 0.6, 1: 0.6, 2: 0.6, 3: 0.6 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'curuba',
        map: null,
        billboard: Billboard.Double,
        angle: 42,
        count: 16,
        start: 0.1,
        size: 0.55,
        sizeVariance: 0.5,
        tint: 0x5a9a4a,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  chirimoya: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Chirimoya',
    nombreCientifico: 'Annona cherimola',
    // arbolito mediano (4-6m) de copa densa redondeada, hoja aterciopelada
    arquetipo: 'arbol',
    options: {
      seed: 20019,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x6b5a3f,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 2,
        angle: { 1: 54, 2: 50, 3: 46 },
        children: { 0: 6, 1: 4, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.012 },
        gnarliness: { 0: 0.09, 1: 0.13, 2: 0.11, 3: 0.05 },
        length: { 0: 3.2, 1: 2.2, 2: 1.2, 3: 0.6 },
        radius: { 0: 0.22, 1: 0.14, 2: 0.09, 3: 0.06 },
        sections: { 0: 8, 1: 7, 2: 5, 3: 3 },
        segments: { 0: 6, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.36, 2: 0.26, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'chirimoya',
        map: null,
        billboard: Billboard.Double,
        angle: 32,
        count: 16,
        start: 0.2,
        size: 0.6,
        sizeVariance: 0.45,
        tint: 0x3f7038,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  cedro_real: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Cedro real',
    nombreCientifico: 'Cedrela odorata',
    // maderable noble alto (18-25m), fuste recto largo, copa abierta rala — silueta clásica cedro
    arquetipo: 'arbol',
    options: {
      seed: 20020,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x7a5638,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 3,
        angle: { 1: 46, 2: 42, 3: 40 },
        children: { 0: 5, 1: 4, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.013 },
        gnarliness: { 0: 0.06, 1: 0.1, 2: 0.09, 3: 0.04 },
        length: { 0: 9.5, 1: 3.8, 2: 1.8, 3: 0.8 },
        radius: { 0: 0.44, 1: 0.24, 2: 0.14, 3: 0.09 },
        sections: { 0: 12, 1: 9, 2: 6, 3: 4 },
        segments: { 0: 8, 1: 6, 2: 4, 3: 3 },
        start: { 1: 0.42, 2: 0.26, 3: 0.22 },
        taper: { 0: 0.6, 1: 0.6, 2: 0.6, 3: 0.6 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'cedro_real',
        map: null,
        billboard: Billboard.Double,
        angle: 30,
        count: 12,
        start: 0.25,
        size: 0.65,
        sizeVariance: 0.4,
        tint: 0x527a3f,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  mora: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Mora andina',
    nombreCientifico: 'Rubus glaucus',
    // arbusto arqueado espinoso bajo (1.5-2.5m), zarzamora andina, follaje denso
    arquetipo: 'arbol',
    options: {
      seed: 20022,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x4a5a2f,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 1,
        angle: { 1: 48, 2: 0, 3: 0 },
        children: { 0: 6, 1: 0, 2: 0 },
        force: { direction: { x: 0, y: 0.7, z: 0.2 }, strength: 0.03 },
        gnarliness: { 0: 0.18, 1: 0.14, 2: 0, 3: 0 },
        length: { 0: 1.4, 1: 1.0, 2: 1, 3: 1 },
        radius: { 0: 0.05, 1: 0.03, 2: 0.03, 3: 0.03 },
        sections: { 0: 5, 1: 4, 2: 3, 3: 3 },
        segments: { 0: 4, 1: 3, 2: 3, 3: 3 },
        start: { 1: 0.3, 2: 0.3, 3: 0.3 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.55, 3: 0.55 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'mora',
        map: null,
        billboard: Billboard.Double,
        angle: 38,
        count: 18,
        start: 0.12,
        size: 0.32,
        sizeVariance: 0.5,
        tint: 0x4a7a3a,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  uchuva: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Uchuva',
    nombreCientifico: 'Physalis peruviana',
    // arbusto herbáceo muy bajo (0.8-1.2m), hoja acorazonada — el más pequeño de los frutales
    arquetipo: 'arbol',
    options: {
      seed: 20023,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x5a6b3a,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 1,
        angle: { 1: 45, 2: 0, 3: 0 },
        children: { 0: 5, 1: 0, 2: 0 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.025 },
        gnarliness: { 0: 0.15, 1: 0.12, 2: 0, 3: 0 },
        length: { 0: 0.8, 1: 0.5, 2: 1, 3: 1 },
        radius: { 0: 0.04, 1: 0.025, 2: 0.025, 3: 0.025 },
        sections: { 0: 5, 1: 4, 2: 3, 3: 3 },
        segments: { 0: 4, 1: 3, 2: 3, 3: 3 },
        start: { 1: 0.3, 2: 0.3, 3: 0.3 },
        taper: { 0: 0.4, 1: 0.4, 2: 0.4, 3: 0.4 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'uchuva',
        map: null,
        billboard: Billboard.Double,
        angle: 42,
        count: 16,
        start: 0.15,
        size: 0.28,
        sizeVariance: 0.5,
        tint: 0x6a9a3f,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  fresa: {
    pisoTermico: 'frio-templado',
    nombreComun: 'Fresa silvestre andina',
    nombreCientifico: 'Fragaria vesca',
    // planta rastrera diminuta — casi solo hojas basales, sin fuste leñoso
    // visible. RENDER FIX 2026-08-02: antes pasaba por ez-tree y salía como
    // un arbolito-bollo (tronquito + copa esférica) — una fresa real es un
    // manojo de 3-5 hojas trifoliadas pegadas al suelo + el fruto rojo
    // asomando. Ahora usa `crearHierbaBaja` vía `crearPlanta()`.
    arquetipo: 'hierba',
    paramsBajos: {
      seed: 20024,
      count: 7,
      size: 0.1,
      sizeVariance: 0.4,
      tint: 0x5a9a3f,
      alturaTallo: 0.015,
      anguloHoja: 30,       // MUY rastrera — casi pegada al suelo, no erguida
      conFruto: true,
      colorFruto: 0xc9243a, // fresa roja madura
      tamanoFruto: 0.022,
    },
  },

  feijoa: {
    pisoTermico: 'frio-templado',
    nombreComun: 'Feijoa',
    nombreCientifico: 'Acca sellowiana',
    // arbusto-arbolito (3-5m), hoja plateada por el envés — tinte verde grisáceo distintivo
    arquetipo: 'arbol',
    options: {
      seed: 20025,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark002',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x8a8266,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 2,
        angle: { 1: 56, 2: 52, 3: 48 },
        children: { 0: 6, 1: 4, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.012 },
        gnarliness: { 0: 0.09, 1: 0.12, 2: 0.11, 3: 0.05 },
        length: { 0: 2.6, 1: 1.8, 2: 1.0, 3: 0.5 },
        radius: { 0: 0.16, 1: 0.1, 2: 0.07, 3: 0.05 },
        sections: { 0: 7, 1: 6, 2: 5, 3: 3 },
        segments: { 0: 5, 1: 4, 2: 4, 3: 3 },
        start: { 1: 0.36, 2: 0.26, 3: 0.22 },
        taper: { 0: 0.5, 1: 0.5, 2: 0.55, 3: 0.55 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'feijoa',
        map: null,
        billboard: Billboard.Double,
        angle: 30,
        count: 18,
        start: 0.2,
        size: 0.42,
        sizeVariance: 0.45,
        tint: 0x6f8f5f,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  arracacha: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Arracacha',
    nombreCientifico: 'Arracacia xanthorrhiza',
    // roseta de hojas grandes tipo apio gigante — tubérculo de porte herbáceo bajo
    arquetipo: 'hierba',
    paramsBajos: {
      seed: 20026,
      count: 9,
      size: 0.42,
      sizeVariance: 0.35,
      tint: 0x4a8a4a,
      alturaTallo: 0.03,
      anguloHoja: 60,
    },
  },

  roble_negro: {
    pisoTermico: 'frio',
    nombreComun: 'Roble negro andino',
    nombreCientifico: 'Quercus humboldtii',
    // el árbol emblemático andino: copa alta densa y redondeada, fuste grueso robusto (18-25m)
    arquetipo: 'arbol',
    options: {
      seed: 20027,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x5f4a35,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 3,
        angle: { 1: 54, 2: 50, 3: 46 },
        children: { 0: 6, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.011 },
        gnarliness: { 0: 0.09, 1: 0.13, 2: 0.11, 3: 0.05 },
        length: { 0: 9.0, 1: 4.0, 2: 1.9, 3: 0.9 },
        radius: { 0: 0.6, 1: 0.34, 2: 0.2, 3: 0.12 },
        sections: { 0: 12, 1: 9, 2: 7, 3: 4 },
        segments: { 0: 8, 1: 6, 2: 4, 3: 3 },
        start: { 1: 0.38, 2: 0.26, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'roble_negro',
        map: null,
        billboard: Billboard.Double,
        angle: 34,
        count: 17,
        start: 0.22,
        size: 0.55,
        sizeVariance: 0.42,
        tint: 0x3a5c2e,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  encenillo: {
    pisoTermico: 'frio',
    nombreComun: 'Encenillo',
    nombreCientifico: 'Weinmannia tomentosa',
    // bosque altoandino, hoja compuesta rojiza al brote — tinte rojo-cobrizo distintivo
    arquetipo: 'arbol',
    options: {
      seed: 20028,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x8a6f52,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 2,
        angle: { 1: 50, 2: 46, 3: 42 },
        children: { 0: 6, 1: 4, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.013 },
        gnarliness: { 0: 0.1, 1: 0.14, 2: 0.12, 3: 0.05 },
        length: { 0: 4.5, 1: 2.8, 2: 1.4, 3: 0.7 },
        radius: { 0: 0.3, 1: 0.18, 2: 0.11, 3: 0.07 },
        sections: { 0: 9, 1: 7, 2: 5, 3: 3 },
        segments: { 0: 6, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.4, 2: 0.27, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'encenillo',
        map: null,
        billboard: Billboard.Double,
        angle: 36,
        count: 20,
        start: 0.22,
        size: 0.35,
        sizeVariance: 0.5,
        tint: 0x8a5a3f,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  chachafruto: {
    pisoTermico: 'frio-templado',
    nombreComun: 'Chachafruto / Balú',
    nombreCientifico: 'Erythrina edulis',
    // REEMPLAZA a Eucalyptus globulus (ver ESPECIES_EXCLUIDAS) — mismo slot de
    // piso térmico, valor real: fijador de nitrógeno (Fabaceae), sombra de
    // café/aliso, cerca viva, semilla comestible alta en proteína (lisina/
    // triptófano). Árbol mediano (8-11m), copa media redondeada abierta, hoja
    // compuesta trifoliada, floración/vainas rojo-anaranjadas características.
    // Fuente: catálogo Chagra `erythrina_edulis` (companions: alnus_acuminata,
    // cordia_alliodora, coffea_arabica; antagonists: ulex_europaeus — el
    // retamo espinoso, otro exótico-invasor ya en ESPECIES_EXCLUIDAS).
    arquetipo: 'arbol',
    options: {
      seed: 20029,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x7a6248,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 2,
        angle: { 1: 58, 2: 54, 3: 48 },
        children: { 0: 6, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.012 },
        gnarliness: { 0: 0.1, 1: 0.15, 2: 0.13, 3: 0.05 },
        // Fuste 4.2 + copa media 3.4 → altura total ~8.5, en rango 8-11
        length: { 0: 4.2, 1: 3.4, 2: 1.7, 3: 0.8 },
        radius: { 0: 0.34, 1: 0.2, 2: 0.13, 3: 0.08 },
        sections: { 0: 9, 1: 8, 2: 6, 3: 4 },
        segments: { 0: 7, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.36, 2: 0.25, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'chachafruto',
        map: null,
        billboard: Billboard.Double,
        angle: 34,
        count: 16,
        start: 0.22,
        size: 0.65,
        sizeVariance: 0.45,
        tint: 0x3f7a3a,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  nogal_andino: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Nogal andino',
    nombreCientifico: 'Juglans neotropica',
    // maderable alto andino (15-25m), copa redondeada densa, hoja compuesta fina
    arquetipo: 'arbol',
    options: {
      seed: 20030,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x5f4530,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 3,
        angle: { 1: 50, 2: 46, 3: 42 },
        children: { 0: 6, 1: 4, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.011 },
        gnarliness: { 0: 0.08, 1: 0.12, 2: 0.1, 3: 0.05 },
        length: { 0: 8.5, 1: 3.6, 2: 1.7, 3: 0.8 },
        radius: { 0: 0.48, 1: 0.27, 2: 0.16, 3: 0.1 },
        sections: { 0: 11, 1: 8, 2: 6, 3: 4 },
        segments: { 0: 8, 1: 6, 2: 4, 3: 3 },
        start: { 1: 0.4, 2: 0.27, 3: 0.22 },
        taper: { 0: 0.58, 1: 0.58, 2: 0.6, 3: 0.6 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'nogal_andino',
        map: null,
        billboard: Billboard.Double,
        angle: 30,
        count: 15,
        start: 0.24,
        size: 0.55,
        sizeVariance: 0.42,
        tint: 0x3f6b32,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  papa: {
    pisoTermico: 'frio-paramo',
    nombreComun: 'Papa parda pastusa',
    nombreCientifico: 'Solanum tuberosum',
    // planta herbácea baja de surco (0.3-0.6m), follaje denso compacto
    arquetipo: 'hierba',
    paramsBajos: {
      seed: 20031,
      count: 10,
      size: 0.3,
      sizeVariance: 0.4,
      tint: 0x4a7a3a,
      alturaTallo: 0.04,
      anguloHoja: 55,
    },
  },

  oca: {
    pisoTermico: 'frio',
    nombreComun: 'Oca / Hibia',
    nombreCientifico: 'Oxalis tuberosa',
    // tubérculo andino muy bajo (0.2-0.35m), matojo pequeño de hoja trifoliada rojiza
    arquetipo: 'hierba',
    paramsBajos: {
      seed: 20032,
      count: 9,
      size: 0.2,
      sizeVariance: 0.45,
      tint: 0x7a9a3a,
      alturaTallo: 0.02,
      anguloHoja: 45,
    },
  },

  ulluco: {
    pisoTermico: 'frio',
    nombreComun: 'Ulluco / Chugua',
    nombreCientifico: 'Ullucus tuberosus',
    // rastrero-postrado muy bajo (0.2-0.3m), hoja carnosa redondeada brillante
    arquetipo: 'hierba',
    paramsBajos: {
      seed: 20033,
      count: 8,
      size: 0.16,
      sizeVariance: 0.4,
      tint: 0x5a9a5a,
      alturaTallo: 0.015,
      anguloHoja: 20,
    },
  },

  mortino: {
    pisoTermico: 'frio',
    nombreComun: 'Mortino / Agraz',
    nombreCientifico: 'Vaccinium meridionale',
    // arbusto bajo denso (0.8-1.3m), hoja pequeña dura, típico de borde de bosque altoandino
    arquetipo: 'arbol',
    options: {
      seed: 20034,
      type: TreeType.Evergreen,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x5a5038,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 1,
        angle: { 1: 44, 2: 0, 3: 0 },
        children: { 0: 6, 1: 0, 2: 0 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.02 },
        gnarliness: { 0: 0.14, 1: 0.1, 2: 0, 3: 0 },
        length: { 0: 0.9, 1: 0.5, 2: 1, 3: 1 },
        radius: { 0: 0.05, 1: 0.03, 2: 0.03, 3: 0.03 },
        sections: { 0: 5, 1: 4, 2: 3, 3: 3 },
        segments: { 0: 4, 1: 3, 2: 3, 3: 3 },
        start: { 1: 0.3, 2: 0.3, 3: 0.3 },
        taper: { 0: 0.45, 1: 0.45, 2: 0.45, 3: 0.45 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'mortino',
        map: null,
        billboard: Billboard.Double,
        angle: 40,
        count: 20,
        start: 0.15,
        size: 0.24,
        sizeVariance: 0.5,
        tint: 0x3f6b32,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  quinua: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Quinua',
    nombreCientifico: 'Chenopodium quinoa',
    // tallo único erguido con panícula terminal (grano) — silueta espiga, tinte rojizo-dorado
    arquetipo: 'hierba',
    paramsBajos: {
      seed: 20035,
      count: 10,
      size: 0.28,
      sizeVariance: 0.4,
      tint: 0x9a6a4a,
      alturaTallo: 0.03,
      anguloHoja: 65,
    },
  },

  arveja: {
    pisoTermico: 'frio',
    nombreComun: 'Arveja andina',
    nombreCientifico: 'Pisum sativum',
    // trepadora herbácea de guía baja (0.6-1m), follaje fino y claro
    arquetipo: 'hierba',
    paramsBajos: {
      seed: 20036,
      count: 10,
      size: 0.22,
      sizeVariance: 0.4,
      tint: 0x5a9a4a,
      alturaTallo: 0.03,
      anguloHoja: 50,
    },
  },

  romero: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Romero',
    nombreCientifico: 'Rosmarinus officinalis',
    // arbustico aromático bajo (0.4-0.8m), follaje aciculado fino denso, verde grisáceo
    arquetipo: 'hierba',
    paramsBajos: {
      seed: 20037,
      count: 14,
      size: 0.16,
      sizeVariance: 0.4,
      tint: 0x4a6a4a,
      alturaTallo: 0.03,
      anguloHoja: 50,
    },
  },

  ruda: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Ruda',
    nombreCientifico: 'Ruta graveolens',
    // matojo pequeño (0.3-0.5m), hoja azul-verdosa glauca característica
    arquetipo: 'hierba',
    paramsBajos: {
      seed: 20038,
      count: 12,
      size: 0.13,
      sizeVariance: 0.4,
      tint: 0x8aa060,
      alturaTallo: 0.02,
      anguloHoja: 45,
    },
  },

  cilantro: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Cilantro',
    nombreCientifico: 'Coriandrum sativum',
    // hortaliza de hoja MUY baja (0.2-0.4m), matojo tierno de huerta
    arquetipo: 'hierba',
    paramsBajos: {
      seed: 20039,
      count: 10,
      size: 0.11,
      sizeVariance: 0.4,
      tint: 0x5a9a4a,
      alturaTallo: 0.015,
      anguloHoja: 40,
    },
  },

  manzanilla: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Manzanilla',
    nombreCientifico: 'Matricaria chamomilla',
    // hierba muy baja (0.2-0.4m) de flor blanca-amarilla, tinte pálido crema-verde de flor
    arquetipo: 'hierba',
    paramsBajos: {
      seed: 20040,
      count: 10,
      size: 0.1,
      sizeVariance: 0.4,
      tint: 0xa8c060,
      alturaTallo: 0.015,
      anguloHoja: 35,
    },
  },

  agraz_paramo: {
    pisoTermico: 'frio-paramo',
    nombreComun: 'Agraz de páramo',
    nombreCientifico: 'Vaccinium floribundum',
    // arbusto rastrero achaparrado (0.4-0.7m), forma compacta pegada al pajonal
    arquetipo: 'hierba',
    paramsBajos: {
      seed: 20041,
      count: 12,
      size: 0.18,
      sizeVariance: 0.4,
      tint: 0x4a5c30,
      alturaTallo: 0.03,
      anguloHoja: 35,
    },
  },

  romero_paramo: {
    pisoTermico: 'frio-paramo',
    nombreComun: 'Romero de páramo',
    nombreCientifico: 'Diplostephium revolutum',
    // arbusto de páramo bajo (0.5-0.8m), follaje plateado-grisáceo compacto (asterácea andina)
    arquetipo: 'hierba',
    paramsBajos: {
      seed: 20042,
      count: 14,
      size: 0.15,
      sizeVariance: 0.4,
      tint: 0x9ab0a0,
      alturaTallo: 0.03,
      anguloHoja: 45,
    },
  },

  laurel_paramo: {
    pisoTermico: 'paramo',
    nombreComun: 'Laurel de páramo',
    nombreCientifico: 'Clethra kalbreyeri',
    // árbol de borde de páramo, pequeño y resistente (4-6m), único "árbol" leñoso alto del grupo páramo
    arquetipo: 'arbol',
    options: {
      seed: 20043,
      type: TreeType.Deciduous,
      bark: {
        type: 'Bark001',
        maps: { color: null, ao: null, normal: null, roughness: null },
        tint: 0x7a6248,
        flatShading: false,
        textured: false,
        textureScale: { x: 1, y: 1 },
      },
      branch: {
        levels: 2,
        angle: { 1: 44, 2: 40, 3: 36 },
        children: { 0: 5, 1: 4, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.014 },
        gnarliness: { 0: 0.08, 1: 0.11, 2: 0.1, 3: 0.05 },
        length: { 0: 3.0, 1: 1.8, 2: 0.9, 3: 0.5 },
        radius: { 0: 0.18, 1: 0.11, 2: 0.07, 3: 0.05 },
        sections: { 0: 7, 1: 6, 2: 4, 3: 3 },
        segments: { 0: 5, 1: 4, 2: 4, 3: 3 },
        start: { 1: 0.38, 2: 0.27, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: {
        type: 'laurel_paramo',
        map: null,
        billboard: Billboard.Double,
        angle: 30,
        count: 15,
        start: 0.22,
        size: 0.32,
        sizeVariance: 0.45,
        tint: 0x33552c,
        alphaTest: 0.5,
        roundedNormals: true,
      },
      trellis: { enabled: false },
    },
  },

  frailejon_mayor: {
    pisoTermico: 'paramo',
    nombreComun: 'Frailejón mayor',
    nombreCientifico: 'Espeletia grandiflora',
    // ROSETA basal densa de hojas pubescentes grisáceas-plateadas sobre
    // tronco corto — la firma visual del páramo. RENDER FIX 2026-08-02: usa
    // `crearRoseta` (tronco corto + corona de hojas rígidas irradiando), no
    // ez-tree — un frailejón no tiene ramas, tiene UNA corona.
    arquetipo: 'roseta',
    paramsBajos: {
      seed: 20044,
      alturaTronco: 0.9,
      radioTronco: 0.09,
      count: 22,
      size: 0.5,
      sizeVariance: 0.35,
      tintHoja: 0xb8c090,
      tintTronco: 0xd8cfa8,
    },
  },

  frailejon_plateado: {
    pisoTermico: 'paramo',
    nombreComun: 'Frailejón plateado',
    nombreCientifico: 'Espeletia argentea',
    // variante MÁS plateada y de tronco más alto — hoja aún más
    // pubescente-blanquecina que el mayor. Misma familia de builder que
    // `frailejon_mayor` (`crearRoseta`), tronco más alto, hoja más clara.
    arquetipo: 'roseta',
    paramsBajos: {
      seed: 20045,
      alturaTronco: 1.3,
      radioTronco: 0.1,
      count: 24,
      size: 0.55,
      sizeVariance: 0.3,
      tintHoja: 0xc9d0b0,
      tintTronco: 0xd8cfa8,
    },
  },

  pajonal_paramo: {
    pisoTermico: 'paramo',
    nombreComun: 'Pajonal de páramo',
    nombreCientifico: 'Festuca sp.',
    // macolla de gramínea perenne — sin tronco, penacho de "hojas" desde la
    // base, muy bajo (0.15-0.4m). RENDER FIX 2026-08-02: usa `crearPajonal`
    // (briznas finas arqueadas naciendo al ras del suelo), no ez-tree —
    // una macolla de pasto no es un árbol enano, es una mata sin fuste.
    arquetipo: 'pajonal',
    paramsBajos: {
      seed: 20046,
      count: 30,
      size: 0.32,
      sizeVariance: 0.4,
      tint: 0xb8a850,
      radioMata: 0.1,
    },
  },
};

/**
 * Lista de claves en orden de piso térmico (cálido → páramo), útil para la
 * fila de la test page o cualquier UI que quiera recorrerlas ordenadas.
 * 50 especies (extensión 2026-08-02, ver sección arriba).
 */
export const ORDEN_PISO_TERMICO = [
  'cacao',
  'mango',
  'ceiba',
  'samán',
  'papaya',
  'banano',
  'zapote',
  'ceiba_tolua',
  'palma_coco',
  'guamo',
  'palma_vino',
  'nogal_cafetero',
  'guayacan_amarillo',
  'limon',
  'yarumo',
  'yuca',
  'cedro_real',
  'aguacate',
  'guayacan_rosado',
  'cafe',
  'curuba',
  'lulo',
  'tomate_arbol',
  'chirimoya',
  'mora',
  'uchuva',
  'quinua',
  'romero',
  'ruda',
  'cilantro',
  'manzanilla',
  'nogal_andino',
  'arracacha',
  'fresa',
  'feijoa',
  'chachafruto',
  'roble_negro',
  'aliso_andino',
  'encenillo',
  'oca',
  'ulluco',
  'mortino',
  'arveja',
  'papa',
  'agraz_paramo',
  'romero_paramo',
  'laurel_paramo',
  'frailejon_mayor',
  'frailejon_plateado',
  'pajonal_paramo',
];

/**
 * Agrupación por piso térmico (para selectores con filtro/tabs). Deriva de
 * `ESPECIES_EZTREE[clave].pisoTermico` — usa el PRIMER piso listado cuando
 * la especie cruza rango (ej. 'calido-templado' → grupo 'calido').
 * @type {Record<'calido'|'templado'|'frio'|'paramo', string[]>}
 */
export const POR_PISO_TERMICO = { calido: [], templado: [], frio: [], paramo: [] };
for (const clave of ORDEN_PISO_TERMICO) {
  const primerPiso = ESPECIES_EZTREE[clave].pisoTermico.split('-')[0];
  const grupo = POR_PISO_TERMICO[primerPiso] ? primerPiso : 'templado';
  POR_PISO_TERMICO[grupo].push(clave);
}

/**
 * Deriva una semilla de variante determinista a partir de la semilla base de
 * la especie + un índice de instancia (para plantar muchos individuos de la
 * misma especie sin que salgan clones idénticos, pero reproducible).
 * @param {number} seedBase
 * @param {number} indice
 * @returns {number}
 */
export function semillaVariante(seedBase, indice) {
  return (seedBase + indice * 7919) >>> 0; // 7919 = primo, buena dispersión para índices chicos
}

/**
 * Instancia la planta correcta para una clave de `ESPECIES_EZTREE`, enrutando
 * por `arquetipo` en vez de forzar todo por ez-tree (fix 2026-08-02, ver
 * comentario grande al inicio del archivo). Este es el punto de entrada que
 * debe usar cualquier caller (test page, siembra del valle) — NO instanciar
 * `Tree` directamente para una clave sin antes confirmar que su arquetipo es
 * `'arbol'`.
 * @param {string} clave clave en `ESPECIES_EZTREE`
 * @param {{ Tree: typeof import('./ez-tree/tree.js').Tree, TreeOptions: typeof import('./ez-tree/options.js').default }} eztree
 *   clases de ez-tree — se pasan por parámetro (no se importan aquí) para
 *   que este módulo no dependa de three/ez-tree cuando solo se usan los
 *   arquetipos bajos (`plantas-bajas.js` sí importa three directamente).
 * @returns {THREE.Group}
 */
export function crearPlanta(clave, { Tree, TreeOptions }) {
  const def = ESPECIES_EZTREE[clave];
  if (!def) throw new Error(`crearPlanta: especie desconocida "${clave}"`);

  switch (def.arquetipo) {
    case 'hierba':
      return crearHierbaBaja(def.paramsBajos);
    case 'roseta':
      return crearRoseta(def.paramsBajos);
    case 'pajonal':
      return crearPajonal(def.paramsBajos);
    case 'arbol':
    default: {
      const options = new TreeOptions();
      options.copy(def.options);
      const tree = new Tree(options);
      tree.generate();
      return tree;
    }
  }
}

/**
 * TODO para escalar a las 742 especies del grafo AGE `chagra_kg`
 * (actualizado 2026-08-02: el mapa pasó de 6 → 50 entradas curadas a mano,
 * seleccionadas del subset OSS v3.2 (581 especies) con variedad de forma
 * -árbol grande/mediano, arbusto, palma, hierba/tubérculo, roseta de
 * páramo- y de piso térmico. Sigue siendo curaduría manual, NO generativa):
 * 1. Para escalar de 50 a las 742, generar por PisoTermico + Habito (grafo
 *    ya tiene ambos: `GROWS_IN`→PisoTermico, `HAS_HABIT`→Habito de 5
 *    valores) un TreeOptions "arquetipo" por combinación (piso × hábito ≈
 *    20 arquetipos — las 50 entradas actuales YA son ~10-12 arquetipos de
 *    facto, ver comentarios por especie), y que cada especie nueva herede
 *    el arquetipo de su piso+hábito con jitter de seed determinista
 *    (semillaVariante) + tinte derivado de su color de flor/fruto si el
 *    grafo lo tiene.
 * 2. Añadir mapeo de la clave del catálogo (slug del grafo, ej.
 *    `theobroma_cacao`) → esta clave (`cacao`) — hoy son manuales y no
 *    necesariamente coinciden con los slugs canónicos del grafo. Con 50
 *    entradas el mapeo manual ya vale la pena escribirlo una vez (id del
 *    catálogo `chagra-catalog-oss-subset-v3.2.json` → clave de este
 *    archivo): la mayoría de las claves nuevas SON el nombre común en
 *    minúsculas sin tilde (`mango`, `ceiba`, `roble_negro`…), pero no es
 *    regla general (`samán` con tilde, `zapote`=Pouteria sapota).
 * 3. RESUELTO 2026-08-02: el páramo puro (frailejón, pajonal) y las
 *    hierbas/rastreras bajas (fresa, papa, oca, ulluco, arracacha, quinua,
 *    arveja, romero, ruda, cilantro, manzanilla, agraz/romero de páramo) ya
 *    NO pasan por ez-tree — tienen builders propios en `plantas-bajas.js`
 *    (`crearHierbaBaja`/`crearRoseta`/`crearPajonal`), enrutados vía
 *    `crearPlanta()` según el campo `arquetipo` de cada entrada. Motivo:
 *    forzarlas por ez-tree (tronco+ramas) daba un "arbolito-bollo" en vez de
 *    la silueta real (gate visual 2026-08-02 detectó la fresa saliendo como
 *    árbol). Si se agregan especies nuevas de porte bajo/roseta/pasto al
 *    escalar hacia 742, deben declarar el `arquetipo` correcto, NO
 *    default a `'arbol'`.
 * 4. Validar altura real contra unidades del terreno del valle (terreno/terrain.js)
 *    antes de plantar en escala 1:1 — hoy los largos están calibrados contra
 *    rangos de altura (metros) conocidos por bibliografía agronómica básica
 *    por especie, pero no se verificó contra la malla del DEM real.
 * 5. `ESPECIES_EXCLUIDAS` (ver export cerca del inicio del archivo) es la
 *    lista negra de especies antagonistas (exótico-invasoras de plantación:
 *    eucalipto, pino pátula, retamo espinoso, acacia negra/mimosa) — CUALQUIER
 *    mapeo futuro que escale hacia las 742 especies debe filtrar contra esa
 *    lista antes de generar un arquetipo para una especie nueva del grafo.
 */
