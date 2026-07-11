/*
 * REGISTRO CONSOLIDADO de la librería visual reutilizable (`src/visual/`).
 *
 * Índice auto-consultable de TODOS los primitivos visuales del repo, en una
 * sola estructura: `VISUAL_REGISTRY` (categoría → items con nombre, componente,
 * props y descripción). Antes de dibujar cualquier cosa de cero — un bicho, un
 * velo, una lámina de cuaderno, un cielo — consulte aquí (o abra la vitrina
 * viva en `#/mockups/visual-lib`).
 *
 * Se alimenta de los registros propios de cada categoría (CREATURES, LAMINAS,
 * SCENES y el barrel de effects), así que agregar un primitivo a su categoría
 * lo publica aquí sin tocar este archivo — salvo sus metadatos de props, que
 * se declaran abajo por slug.
 *
 * Cada item expone además `variantes`: 1-3 juegos de props etiquetados para que
 * la vitrina dibuje el primitivo en varios estados sin adivinar su contrato.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- este archivo es el CATÁLOGO
   de la librería: sus descripciones/props/estados (incluye 'pensando' de la voz)
   son metadata dev-facing de la vitrina, no copy de UI de producto; no van a
   src/config/messages.js (ADR-050). Mismo patrón que src/visual/scenes/index.js. */
import { CREATURES } from './creatures/index.js';
import { GlowFilter, FiltroAcuarela, AutoDibujo, VFX_PISOS, VFX_BEAT_MS } from './effects/index.js';
import { LAMINAS } from './laminas/index.js';
import CapaCielo from './scenes/CieloParametrico.jsx';
import Parallax from './scenes/Parallax.jsx';
import GuardianEspirituBase from './scenes/GuardianEspirituBase.jsx';
import SceneFincaOrganismo from './scenes/SceneFincaOrganismo.jsx';
import { SCENES, CAPAS_PARALLAX, SCN_BEAT_MS } from './scenes/index.js';
import IrisVoz, { ESTADOS_VOZ } from './voz/index.js';
// Framework de mundos: metadatos three-free (arquetipos + registro + tinte). Los
// dioramas 3D (carpeta escenas/) NO se importan aquí — se cargan perezoso.
import { ARQUETIPOS, ARQUETIPOS_3D } from './mundo3d/arquetipos.js';
import { MUNDO } from './mundo3d/mundoData.js';
import { tinteDeMundo } from './mundo3d/resolverMundo.js';

/* ── Props comunes de las creatures (contrato del barrel de creatures) ────── */
const PROPS_CREATURE = [
  { nombre: 'size', tipo: 'number', defecto: '64', que: 'lado del <svg> standalone en px' },
  { nombre: 'inline', tipo: 'boolean', defecto: 'false', que: 'solo el <g>, para incrustar en una escena SVG que ya define viewBox' },
  { nombre: 'animated', tipo: 'boolean', defecto: 'true', que: 'animaciones idle (alas, antenas, ondulación)' },
  { nombre: 'title', tipo: 'string', defecto: 'nombre común', que: 'rótulo accesible; presente por defecto' },
  { nombre: 'className', tipo: 'string', defecto: '—', que: 'clases extra sobre el nodo raíz' },
];

/* Variantes de vitrina para toda creature: dos tamaños + el estado quieto. */
const VARIANTES_CREATURE = [
  { label: '48 px', props: { size: 48 } },
  { label: '80 px', props: { size: 80 } },
  { label: 'sin animación', props: { size: 80, animated: false } },
];

/* Nota de campo por creature (el registro de la categoría trae nombre + binomio;
   la descripción de una línea va aquí). */
const NOTAS_CREATURE = {
  'abeja-angelita': 'Meliponino sin aguijón, polinizadora de la chagra; alas que baten y antenas vivas.',
  colibri: 'Pico recto y garganta violeta iridiscente; el ave-agente de Chagra.',
  lombriz: 'La ingeniera del suelo; ondula por segmentos con clitelo marcado.',
  mariposa: 'Alas naranjas con venación; poliniza y anuncia buen suelo.',
  escarabajo: 'Estercolero que entierra el abono; élitros con brillo metálico.',
};

/* ── Props por lámina (contrato del barrel de laminas) ────────────────────── */
const PROP_CLASSNAME = { nombre: 'className', tipo: 'string', defecto: '—', que: 'clases extra sobre el <svg> raíz' };
const PROPS_LAMINA = {
  siembra: [
    { nombre: 'activo', tipo: "'tuberculo' | 'esqueje' | 'colino' | null", defecto: 'null', que: 'resalta una forma de siembra; null = las tres parejas' },
    PROP_CLASSNAME,
  ],
  aporque: [PROP_CLASSNAME],
  maiz: [PROP_CLASSNAME],
  cafeto: [PROP_CLASSNAME],
  'mata-etapa': [
    { nombre: 'etapa', tipo: "'semilla' | 'plantula' | 'juvenil' | 'adulto' | 'floracion' | 'cosecha'", defecto: "'semilla'", que: 'etapa de vida que dibuja la lámina' },
    PROP_CLASSNAME,
  ],
};

/* Variantes de vitrina por lámina: donde hay prop de dominio, se recorren sus
   valores; donde la lámina es fija, una sola vista. */
const VARIANTES_LAMINA = {
  siembra: [
    { label: 'las tres', props: {} },
    { label: 'tubérculo', props: { activo: 'tuberculo' } },
    { label: 'colino', props: { activo: 'colino' } },
  ],
  aporque: [{ label: 'en corte', props: {} }],
  maiz: [{ label: 'la mata', props: {} }],
  cafeto: [{ label: 'el cafeto', props: {} }],
  'mata-etapa': [
    { label: 'semilla', props: { etapa: 'semilla' } },
    { label: 'juvenil', props: { etapa: 'juvenil' } },
    { label: 'cosecha', props: { etapa: 'cosecha' } },
  ],
};

/* ── Effects: los tres helpers SVG del barrel, declarados a mano ──────────── */
const ITEMS_EFFECTS = [
  {
    slug: 'glow-filter',
    nombre: 'GlowFilter',
    detalle: 'glow neón orgánico (§13.16)',
    Component: GlowFilter,
    render: 'filter',
    descripcion:
      'El <filter> canónico de glow: blur fundido con el original vía feMerge, más un blur suelto opcional para halos/estelas. Va dentro de su propio <defs>; referencie con filter="url(#id)".',
    props: [
      { nombre: 'id', tipo: 'string', defecto: '(requerida)', que: 'id del filtro de glow; páselo único (useId)' },
      { nombre: 'std', tipo: 'number', defecto: '2.1', que: 'desenfoque del glow (stdDeviation)' },
      { nombre: 'blurId', tipo: 'string', defecto: '—', que: 'si llega, emite además un blur suelto con este id' },
      { nombre: 'blurStd', tipo: 'number', defecto: '3', que: 'desenfoque del blur suelto' },
      { nombre: 'bounds', tipo: 'string', defecto: "'-80%'", que: 'origen del box del filtro (x/y)' },
    ],
    variantes: [
      { label: 'suave (std 2.1)', props: { std: 2.1 } },
      { label: 'fuerte (std 4.5)', props: { std: 4.5 } },
    ],
  },
  {
    slug: 'filtro-acuarela',
    nombre: 'FiltroAcuarela',
    detalle: 'borde pintado a la acuarela',
    Component: FiltroAcuarela,
    render: 'filter',
    descripcion:
      'feTurbulence + feDisplacementMap: le da a un trazo o relleno el borde húmedo e irregular de la acuarela. Estático (reduced-motion-safe por construcción). Va dentro de su propio <defs>.',
    props: [
      { nombre: 'id', tipo: 'string', defecto: '(requerida)', que: 'id del filtro; páselo único (useId)' },
      { nombre: 'frequency', tipo: 'number', defecto: '0.012', que: 'baseFrequency del ruido; más alto = borde más nervioso' },
      { nombre: 'scale', tipo: 'number', defecto: '6', que: 'fuerza del desplazamiento en px' },
      { nombre: 'octaves', tipo: 'number', defecto: '2', que: 'numOctaves del fractalNoise' },
      { nombre: 'seed', tipo: 'number', defecto: '7', que: 'semilla del ruido (determinista)' },
      { nombre: 'bounds', tipo: 'string', defecto: "'-20%'", que: 'origen del box del filtro (x/y)' },
    ],
    variantes: [
      { label: 'sutil (scale 5)', props: { scale: 5, frequency: 0.012 } },
      { label: 'marcado (scale 12)', props: { scale: 12, frequency: 0.02 } },
    ],
  },
  {
    slug: 'auto-dibujo',
    nombre: 'AutoDibujo',
    detalle: 'trazo que se dibuja solo (§13.11)',
    Component: AutoDibujo,
    render: 'draw',
    descripcion:
      'El auto-dibujado orquestado: pathLength normalizado + dashoffset a 0 + etapas con delay escalonado (clases vfx-draw/vfx-fade/vfx-t1…t9 de effects.css — impórtela una vez).',
    props: [
      { nombre: 'as', tipo: "'path' | 'line' | 'circle' | …", defecto: "'path'", que: 'elemento SVG a renderizar' },
      { nombre: 'stage', tipo: 'number 1..9', defecto: '—', que: 'etapa del dibujo (delay escalonado)' },
      { nombre: 'fade', tipo: 'boolean', defecto: 'false', que: 'aparece en fundido en vez de trazarse (planos de color)' },
      { nombre: 'className', tipo: 'string', defecto: '—', que: 'clases extra' },
      { nombre: '…rest', tipo: 'atributos SVG', defecto: '—', que: 'd, stroke, strokeWidth, fill, cx… pasan tal cual' },
    ],
    variantes: [
      { label: 'trazo (stage 1)', props: { stage: 1 } },
      { label: 'trazo tardío (stage 5)', props: { stage: 5 } },
    ],
  },
];

/* ── Scenes: los cuatro decorados base del barrel ─────────────────────────── */
const PROPS_SCENE = {
  'capa-cielo': [
    { nombre: 'cielo', tipo: '{ luz, condicion, tema? }', defecto: '(requerida)', que: "estado del cielo real: luz 'dia'|'noche'|'amanecer'|'atardecer', condicion 'despejado'|'nublado'|'lluvia'|'niebla'" },
    { nombre: 'cx / cy / r', tipo: 'number', defecto: '(requeridas)', que: 'centro y radio del astro en coords del viewBox' },
    { nombre: 'lluviaY', tipo: 'number', defecto: '150', que: 'altura desde donde cae la lluvia/niebla' },
    { nombre: 'w / h', tipo: 'number', defecto: '390 / 360', que: 'caja de la veladura de sol bajo' },
    { nombre: 'wash', tipo: 'boolean', defecto: 'true', que: 'montar la veladura cálida de sol bajo' },
  ],
  parallax: [
    { nombre: 'camara', tipo: '{ tx, ty, s }', defecto: '(requerida)', que: 'cámara base; la calcula la escena consumidora' },
    { nombre: 'capas', tipo: '[{ id?, f, contenido, clase?, interactiva?, style? }]', defecto: '[]', que: 'capas de fondo a frente; f < 1 lejos, f > 1 cerca (use CAPAS_PARALLAX)' },
    { nombre: 'alturaCapa', tipo: 'number', defecto: '—', que: 'alto en px de cada capa' },
    { nombre: 'className', tipo: 'string', defecto: '—', que: 'clases extra del contenedor' },
  ],
  'guardian-espiritu': [
    { nombre: 'children', tipo: 'ReactNode', defecto: '(requerida)', que: 'el <g> del avatar de fauna (p. ej. una creature inline)' },
    { nombre: 'size', tipo: 'number|string', defecto: '78', que: 'lado del disco/SVG en px' },
    { nombre: 'acc / accRgb', tipo: 'string', defecto: "'#ffb54f' / '255, 181, 79'", que: 'acento del halo (hex + su versión "r, g, b")' },
    { nombre: 'viewBox', tipo: 'string', defecto: "'-26 -24 52 46'", que: 'viewBox del SVG del avatar' },
    { nombre: 'glowId / blurId', tipo: 'string', defecto: "'scn-ge-glow' / 'scn-ge-blur'", que: 'ids de los filtros (páselos únicos si repite guardianes)' },
    { nombre: 'title', tipo: 'string', defecto: '—', que: 'rótulo accesible; sin él, decorativo' },
    { nombre: 'className', tipo: 'string', defecto: '—', que: 'clases extra del disco' },
  ],
  'finca-organismo': [
    { nombre: 'estructura', tipo: '{ tiene, forma }', defecto: '—', que: 'cubierta declarada en el perfil; monta el marcador del invernadero' },
    { nombre: 'onAnimales', tipo: '() => void', defecto: '—', que: 'tap en el potrero → mundo animales; sin handler queda decorativo' },
    { nombre: 'onPregunte', tipo: '() => void', defecto: '—', que: 'tap en el corazón-semilla → abre el agente; sin handler queda arte' },
  ],
};

const NOTAS_SCENE = {
  'capa-cielo': 'Cielo paramétrico: sol/luna, estrellas, nubes, niebla y lluvia según la hora y el clima reales de la vereda.',
  parallax: 'Motor de cámara multicapa: apila planos que viajan a distinta velocidad (lejos amortiguado, cerca adelantado).',
  'guardian-espiritu': 'El avatar-espíritu en su disco con halo por acento; envuelve cualquier creature inline como su alma.',
  'finca-organismo': 'La finca de noche vuelta organismo bioluminiscente: corazón-semilla que late y red de micorrizas.',
};

/* Variantes de vitrina por escena. Cada escena tiene su propio contrato, así que
   la vitrina resuelve el andamiaje (SVG, cámara, hijo) por slug; aquí van los
   estados a mostrar como props sueltas de dominio. */
const VARIANTES_SCENE = {
  'capa-cielo': [
    { label: 'día despejado', props: { luz: 'dia', condicion: 'despejado' } },
    { label: 'atardecer', props: { luz: 'atardecer', condicion: 'despejado' } },
    { label: 'noche', props: { luz: 'noche', condicion: 'despejado' } },
  ],
  parallax: [{ label: 'tres capas', props: {} }],
  'guardian-espiritu': [
    { label: 'acento verde', props: { acc: '#2dffc4', accRgb: '45, 255, 196' } },
    { label: 'acento ámbar', props: { acc: '#ffb54f', accRgb: '255, 181, 79' } },
    { label: 'acento violeta', props: { acc: '#b28dff', accRgb: '178, 141, 255' } },
  ],
  'finca-organismo': [{ label: 'escena base', props: {} }],
};

const SCENE_COMPONENTS = {
  'capa-cielo': CapaCielo,
  parallax: Parallax,
  'guardian-espiritu': GuardianEspirituBase,
  'finca-organismo': SceneFincaOrganismo,
};

/* Cómo dibuja la vitrina cada escena (andamiaje que no es una prop). */
const SCENE_RENDER = {
  'capa-cielo': 'cielo',
  parallax: 'parallax',
  'guardian-espiritu': 'guardian',
  'finca-organismo': 'finca',
};

/* ── Ensamble de items por categoría ──────────────────────────────────────── */
const ITEMS_CREATURES = Object.entries(CREATURES).map(([slug, meta]) => ({
  slug,
  nombre: meta.nombre,
  cientifico: meta.cientifico,
  Component: meta.Component,
  render: 'component',
  dim: '2d',
  role: 'creature',
  // Angelita es 2D (SVG) pero es el AVATAR del framework 3D: la abeja que "entra"
  // a cada mundo. `capaz3d` la marca como pieza 3D-capaz sin cambiar su `dim`.
  capaz3d: slug === 'abeja-angelita',
  descripcion: NOTAS_CREATURE[slug] || '',
  props: PROPS_CREATURE,
  variantes: VARIANTES_CREATURE,
}));

const ITEMS_LAMINAS = Object.entries(LAMINAS).map(([slug, meta]) => ({
  slug,
  nombre: meta.nombre,
  cientifico: meta.especie,
  Component: meta.Component,
  render: 'component',
  dim: '2d',
  role: 'lamina',
  descripcion:
    meta.accesible === 'enseña'
      ? `Lámina que enseña con rótulos (role=img) — ${meta.especie}.`
      : `Lámina decorativa (aria-hidden) — ${meta.especie}.`,
  props: PROPS_LAMINA[slug] || [PROP_CLASSNAME],
  variantes: VARIANTES_LAMINA[slug] || [{ label: 'lámina', props: {} }],
}));

const ITEMS_SCENES = Object.entries(SCENES).map(([slug, meta]) => ({
  slug,
  nombre: meta.nombre,
  cientifico: meta.origen,
  Component: SCENE_COMPONENTS[slug],
  render: SCENE_RENDER[slug] || 'component',
  dim: '2d',
  role: 'scene',
  descripcion: NOTAS_SCENE[slug] || meta.clave || '',
  props: PROPS_SCENE[slug] || [],
  variantes: VARIANTES_SCENE[slug] || [{ label: 'base', props: {} }],
}));

/* ── Effects: se etiquetan 2D/effect sobre los literales de arriba ─────────── */
const ITEMS_EFFECTS_TAG = ITEMS_EFFECTS.map((it) => ({ dim: '2d', role: 'effect', ...it }));

/* ── Voz: IrisVoz, la identidad "la voz con forma" ────────────────────────── */
const PROPS_VOZ = [
  { nombre: 'estado', tipo: "'reposo'|'escuchando'|'pensando'|'hablando'", defecto: "'reposo'", que: 'dirección semántica del movimiento (ondas entran/salen/se trenzan)' },
  { nombre: 'size', tipo: 'number', defecto: '180', que: 'lado en px (la firma sobrevive desde ~22px)' },
  { nombre: 'getNivel', tipo: '() => number', defecto: '—', que: 'RMS real del micrófono (0..1) leído cada frame; sin él usa pseudo-habla determinista' },
  { nombre: 'className', tipo: 'string', defecto: '—', que: 'clases extra sobre el nodo raíz' },
];
const ITEMS_VOZ = [
  {
    slug: 'iris-voz',
    nombre: 'IrisVoz',
    cientifico: 'la voz con forma',
    Component: IrisVoz,
    render: 'voz',
    dim: '2d',
    role: 'voz',
    capaz3d: true, // la identidad de la voz que acompaña a los mundos (2D+3D)
    descripcion:
      'La IDENTIDAD de la voz de Chagra: un iris de anillos concéntricos (ondas de agua + anillos de tronco) con una brasa. El movimiento tiene dirección semántica: escuchando entra, hablando sale, pensando se trenza.',
    props: PROPS_VOZ,
    variantes: ESTADOS_VOZ.map((estado) => ({ label: estado, props: { estado, size: 132 } })),
  },
];

/* ── Mundos 3D: los ARQUETIPOS de escena del framework `src/visual/mundo3d` ─── */
const PROPS_MUNDO3D = [
  { nombre: 'mundoId', tipo: 'string', defecto: '(requerida)', que: 'clave del registro MUNDO[] que este arquetipo dibuja' },
  { nombre: 'tier', tipo: "'alto'|'medio'|'bajo'|'2d'", defecto: "'alto'", que: 'device-tier: bajo/2d cae al espejo 2D del arquetipo' },
  { nombre: 'reducedMotion', tipo: 'boolean', defecto: 'false', que: 'congela el useFrame a un fotograma digno' },
  { nombre: 'onHotspot', tipo: '(view, data) => void', defecto: '—', que: 're-rutea a una vista 2D real de App.jsx (regla de oro: nunca reimplementa)' },
  { nombre: 'onSalir', tipo: '() => void', defecto: '—', que: 'volver al valle' },
];
/* Cargadores PEREZOSOS de cada diorama 3D (three vive en `vendor-three`, fuera del
   bundle base; el storybook los monta a demanda con el botón "Ver en 3D"). */
const CARGAR_ESCENA_3D = {
  cutaway: () => import('./mundo3d/escenas/EscenaCutaway.jsx'),
  flujo: () => import('./mundo3d/escenas/EscenaFlujo.jsx'),
  recinto: () => import('./mundo3d/escenas/EscenaRecinto.jsx'),
  estratos: () => import('./mundo3d/escenas/EscenaEstratos.jsx'),
  valle: () => import('./mundo3d/escenas/EscenaValle.jsx'),
};
const ITEMS_MUNDO3D = ARQUETIPOS_3D.map((slug) => {
  const a = ARQUETIPOS[slug];
  const ejemplo = a.ejemplo;
  const m = MUNDO[ejemplo] || {};
  return {
    slug,
    nombre: a.nombre,
    cientifico: `espejo 2D: ${a.espejo}`,
    render: 'mundo',
    dim: '3d',
    role: 'mundo3d-archetype',
    descripcion: a.clave,
    motivo: a.motivo,
    ejemplo,
    espejo: a.espejo,
    tambien: a.tambien || [],
    cargar3d: CARGAR_ESCENA_3D[slug],
    params: m.params || {},
    hotspots: m.hotspots || [],
    entrada: m.entrada || {},
    tinte: tinteDeMundo(ejemplo),
    props: PROPS_MUNDO3D,
    variantes: [{ label: `espejo 2D (${a.espejo})`, props: {} }],
  };
});

/* ── El índice único que consume la vitrina ───────────────────────────────── */
export const VISUAL_REGISTRY = {
  creatures: {
    titulo: 'Creatures',
    subtitulo: 'Fauna de la chagra',
    ancla: 'creatures',
    barrel: 'src/visual/creatures',
    importa: "import { Colibri } from 'src/visual/creatures';",
    descripcion:
      'Personajes de fauna en SVG parametrizable. Modo standalone (su propio <svg>) para avatares y catálogo, o modo inline (solo el <g>) para incrustar en una escena.',
    items: ITEMS_CREATURES,
  },
  effects: {
    titulo: 'Effects',
    subtitulo: 'Técnicas de cine (§13)',
    ancla: 'effects',
    barrel: 'src/visual/effects',
    importa: "import { GlowFilter } from 'src/visual/effects';",
    descripcion:
      'Las técnicas reutilizables del catálogo: glow, acuarela y auto-dibujado como helpers SVG; velos/viñetas/grades/pulso como clases vfx-* en effects.css. Solo transform/opacity animados; filtros estáticos.',
    items: ITEMS_EFFECTS_TAG,
    extras: {
      titulo: 'Pisos térmicos (vfx-grade)',
      nota: 'Grade de luz por piso térmico, de nevado a río (clases modificadoras de .vfx-grade).',
      pisos: VFX_PISOS,
      beatMs: VFX_BEAT_MS,
    },
  },
  laminas: {
    titulo: 'Láminas',
    subtitulo: 'Cuaderno de campo',
    ancla: 'laminas',
    barrel: 'src/visual/laminas',
    importa: "import { LaminaMaiz } from 'src/visual/laminas';",
    descripcion:
      'Hojas de papel enteras: la mata o la labor dibujada a mano, con su propio viewBox y relación de aspecto. Se dibujan a width:100%; cada una expone className + su prop de dominio.',
    items: ITEMS_LAMINAS,
  },
  scenes: {
    titulo: 'Scenes',
    subtitulo: 'Decorados base',
    ancla: 'scenes',
    barrel: 'src/visual/scenes',
    importa: "import { CapaCielo, Parallax } from 'src/visual/scenes';",
    descripcion:
      'Los decorados que se repiten en el home vivo y los mockups: cielo paramétrico, motor de parallax, guardián-espíritu y la finca-organismo. Componente parametrizable + scenes.css compartida.',
    items: ITEMS_SCENES,
    extras: {
      titulo: 'Constantes de escena',
      nota: 'Ritmo del latido compartido y factores de parallax por capa.',
      beatMs: SCN_BEAT_MS,
      capasParallax: CAPAS_PARALLAX,
    },
  },
  voz: {
    titulo: 'Voz',
    subtitulo: 'La voz con forma',
    ancla: 'voz',
    barrel: 'src/visual/voz',
    importa: "import IrisVoz from 'src/visual/voz';",
    descripcion:
      'La identidad visual de la voz de Chagra: un solo primitivo (IrisVoz), cuatro estados con dirección semántica. Es el gesto de la voz que acompaña a los mundos (2D y 3D).',
    items: ITEMS_VOZ,
  },
  mundo3d: {
    titulo: 'Mundos 3D',
    subtitulo: 'Arquetipos de escena (framework)',
    ancla: 'mundo3d',
    barrel: 'src/visual/mundo3d',
    importa: "import Mundo, { MUNDO } from 'src/visual/mundo3d';",
    descripcion:
      'Los ARQUETIPOS de escena del framework de mundos: dioramas 3D low-poly (cutaway/flujo/recinto/estratos/valle) que un mundo elige POR DATOS. Cada uno cae a su espejo 2D digno en equipos humildes. Se previsualiza el espejo 2D; toque "Ver en 3D" para montar el diorama (chunk perezoso). Sus compañeros: la abeja Angelita (Creatures, avatar 3D-capaz) e IrisVoz (Voz).',
    items: ITEMS_MUNDO3D,
  },
};

/* Orden canónico de las categorías en la vitrina y la navegación por anclas. */
export const VISUAL_CATEGORIES = ['creatures', 'effects', 'laminas', 'scenes', 'voz', 'mundo3d'];

/* Conteo de primitivos por categoría (para el encabezado de la vitrina y el PR). */
export const VISUAL_COUNTS = VISUAL_CATEGORIES.reduce((acc, key) => {
  acc[key] = VISUAL_REGISTRY[key].items.length;
  return acc;
}, /** @type {Record<string, number>} */ ({}));

/* ── Filtros por TAG ──────────────────────────────────────────────────────
   Los metadatos filtrables (`dim: '2d'|'3d'`, `role`, `capaz3d`) dejan que el
   framework y el storybook listen "lo 3D-capaz" sin adivinar. */

/** Todos los items del registro, aplanados con su categoría. */
export function piezas(filtro) {
  const out = [];
  VISUAL_CATEGORIES.forEach((categoria) => {
    VISUAL_REGISTRY[categoria].items.forEach((item) => {
      if (!filtro || filtro(item, categoria)) out.push({ categoria, ...item });
    });
  });
  return out;
}

/** Piezas de dimensión 3D (los arquetipos de escena del framework de mundos). */
export function piezas3D() {
  return piezas((item) => item.dim === '3d');
}

/** Piezas que PARTICIPAN del framework 3D: los arquetipos + los 3D-capaces
    (la abeja avatar, la voz). Útil para la sección "3D" del storybook. */
export function piezasCapaces3D() {
  return piezas((item) => item.dim === '3d' || item.capaz3d === true);
}

/** Piezas por `role` (creature|effect|lamina|scene|voz|mundo3d-archetype). */
export const piezasPorRole = (role) => piezas((item) => item.role === role);

export default VISUAL_REGISTRY;
