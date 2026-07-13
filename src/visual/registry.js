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
import { CREATURES } from './creatures/index.js';
import { GlowFilter, FiltroAcuarela, AutoDibujo, VFX_PISOS, VFX_BEAT_MS } from './effects/index.js';
import { LAMINAS } from './laminas/index.js';
import CapaCielo from './scenes/CieloParametrico.jsx';
import Parallax from './scenes/Parallax.jsx';
import GuardianEspirituBase from './scenes/GuardianEspirituBase.jsx';
import SceneFincaOrganismo from './scenes/SceneFincaOrganismo.jsx';
import { SCENES, CAPAS_PARALLAX, SCN_BEAT_MS } from './scenes/index.js';

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

/* La Angelita estrena los GESTOS con carácter (rubber-hose Cuphead/Miss-Minutes):
   celebra (salto + brazos en V con overshoot), reposo (respira lento) y señala
   (se inclina al POI y apunta). La vitrina los muestra como variantes propias. */
const VARIANTES_ABEJA = [
  { label: '48 px', props: { size: 48 } },
  { label: 'vuela', props: { size: 80 } },
  { label: 'celebra', props: { size: 80, pose: 'celebra' } },
  { label: 'reposo', props: { size: 80, pose: 'reposo' } },
  { label: 'señala', props: { size: 80, pose: 'señala' } },
  { label: 'sin animación', props: { size: 80, animated: false } },
];

/* El trío andino rubber-hose (oso / colibrí / rana) estrena los MISMOS gestos
   species-agnostic que Angelita: celebra (brinco + V con overshoot), reposo
   (respira) y señala (se inclina al POI y apunta). Base 'vuela' para el colibrí
   (alado) y 'anda' para el oso y la rana (de suelo). */
const VARIANTES_TRIO_AIRE = [
  { label: '48 px', props: { size: 48 } },
  { label: 'vuela', props: { size: 80 } },
  { label: 'celebra', props: { size: 80, pose: 'celebra' } },
  { label: 'reposo', props: { size: 80, pose: 'reposo' } },
  { label: 'señala', props: { size: 80, pose: 'señala' } },
  { label: 'sin animación', props: { size: 80, animated: false } },
];
const VARIANTES_TRIO_SUELO = [
  { label: '48 px', props: { size: 48 } },
  { label: 'anda', props: { size: 80 } },
  { label: 'celebra', props: { size: 80, pose: 'celebra' } },
  { label: 'reposo', props: { size: 80, pose: 'reposo' } },
  { label: 'señala', props: { size: 80, pose: 'señala' } },
  { label: 'sin animación', props: { size: 80, animated: false } },
];
/* Variantes de vitrina por slug (las que difieren del set genérico). */
/* El OSO ANDINO completo estrena TODA la fundación transversal (espejo de la
   abeja, con su carácter): peso y line-boil, gruñido (resopla), rascado, ruana
   del páramo, modo poder ROJO y prop por mundo. La vitrina lo luce con todo. */
const VARIANTES_OSO = [
  { label: '48 px', props: { size: 48 } },
  { label: 'anda', props: { size: 88 } },
  { label: 'celebra', props: { size: 88, pose: 'celebra' } },
  { label: 'reposo', props: { size: 88, pose: 'reposo' } },
  { label: 'señala', props: { size: 88, pose: 'señala' } },
  { label: 'gruñe (resopla)', props: { size: 88, resopla: true } },
  { label: 'se rasca', props: { size: 88, rasca: true } },
  { label: 'ruana de noche', props: { size: 88, vestuario: true, clima: 'noche' } },
  { label: 'con lupa (suelo)', props: { size: 88, mundoId: 'suelo' } },
  { label: 'poder ROJO', props: { size: 88, poder: true } },
  { label: 'línea que hierve', props: { size: 88, lineBoil: true } },
  { label: 'sin animación', props: { size: 88, animated: false } },
];
/* El JAGUAR completo estrena TODA la fundación transversal (espejo de la abeja/
   oso, con su carácter): acecho de hombros + cola pesada + line-boil, rugido
   corporal (ruge), modo acecho (acecha), ruana de noche, modo poder PÚRPURA y
   prop por mundo. La vitrina lo luce con todo. */
const VARIANTES_JAGUAR = [
  { label: '48 px', props: { size: 48 } },
  { label: 'anda', props: { size: 88 } },
  { label: 'celebra', props: { size: 88, pose: 'celebra' } },
  { label: 'reposo', props: { size: 88, pose: 'reposo' } },
  { label: 'señala', props: { size: 88, pose: 'señala' } },
  { label: 'ruge', props: { size: 88, ruge: true } },
  { label: 'acecha', props: { size: 88, acecha: true } },
  { label: 'ruana de noche', props: { size: 88, vestuario: true, clima: 'noche' } },
  { label: 'con lupa (suelo)', props: { size: 88, mundoId: 'suelo' } },
  { label: 'poder PÚRPURA', props: { size: 88, poder: true } },
  { label: 'línea que hierve', props: { size: 88, lineBoil: true } },
  { label: 'sin animación', props: { size: 88, animated: false } },
];

/* La ARDILLA completa estrena TODA la fundación transversal (espejo de la abeja
   y del oso, con su CARÁCTER pizpireta): boil veloz + line-boil, INSPECCIÓN
   INVERTIDA (su firma), roer, ruana, modo poder ÁMBAR y prop por mundo. La
   vitrina la luce con todo. */
const VARIANTES_ARDILLA = [
  { label: '48 px', props: { size: 48 } },
  { label: 'anda', props: { size: 88 } },
  { label: 'celebra', props: { size: 88, pose: 'celebra' } },
  { label: 'reposo', props: { size: 88, pose: 'reposo' } },
  { label: 'señala', props: { size: 88, pose: 'señala' } },
  { label: 'inspección invertida', props: { size: 88, inspecciona: true } },
  { label: 'roe una semilla', props: { size: 88, roe: true } },
  { label: 'ruana de noche', props: { size: 88, vestuario: true, clima: 'noche' } },
  { label: 'con lupa (suelo)', props: { size: 88, mundoId: 'suelo' } },
  { label: 'poder ÁMBAR', props: { size: 88, poder: true } },
  { label: 'línea que hierve', props: { size: 88, lineBoil: true } },
  { label: 'sin animación', props: { size: 88, animated: false } },
];

/* El PEREZOSO completo estrena TODA la fundación transversal con su carácter de
   QUIETUD ZEN: mecerse lentísimo colgado de la rama, line-boil en cámara lenta,
   dormita (las "Z" del sueño), estiramiento sostenido, ruana de noche, modo poder
   TURQUESA y prop por mundo. La vitrina lo luce con todo. */
const VARIANTES_PEREZOSO = [
  { label: '48 px', props: { size: 48 } },
  { label: 'cuelga', props: { size: 88 } },
  { label: 'celebra', props: { size: 88, pose: 'celebra' } },
  { label: 'reposo', props: { size: 88, pose: 'reposo' } },
  { label: 'señala', props: { size: 88, pose: 'señala' } },
  { label: 'dormita (Zzz)', props: { size: 88, dormita: true } },
  { label: 'estira (lento)', props: { size: 88, estira: true } },
  { label: 'ruana de noche', props: { size: 88, vestuario: true, clima: 'noche' } },
  { label: 'con lupa (suelo)', props: { size: 88, mundoId: 'suelo' } },
  { label: 'poder TURQUESA', props: { size: 88, poder: true } },
  { label: 'línea que hierve', props: { size: 88, lineBoil: true } },
  { label: 'sin animación', props: { size: 88, animated: false } },
];

const VARIANTES_POR_SLUG = {
  'abeja-angelita': VARIANTES_ABEJA,
  colibri: VARIANTES_TRIO_AIRE,
  'oso-andino': VARIANTES_OSO,
  'rana-andina': VARIANTES_TRIO_SUELO,
  perezoso: VARIANTES_PEREZOSO,
  ardilla: VARIANTES_ARDILLA,
  jaguar: VARIANTES_JAGUAR,
};

/* Nota de campo por creature (el registro de la categoría trae nombre + binomio;
   la descripción de una línea va aquí). */
const NOTAS_CREATURE = {
  'abeja-angelita': 'Meliponino sin aguijón, polinizadora de la chagra; alas que baten y antenas vivas.',
  colibri: 'Pico recto y garganta violeta iridiscente; el ave-agente de Chagra, ya en rubber-hose.',
  'oso-andino': 'Oso de anteojos, guardián del páramo; mole parda entrañable con los anteojos crema (su firma).',
  'rana-andina': 'Rana arlequín del páramo, guardiana del agua; verde húmedo con manchas ocre y ojos saltones.',
  perezoso: 'Perezoso de tres dedos, la calma total; cuelga de la rama por sus garras largas, antifaz y tinte verdoso de algas. Todo en cámara lenta.',
  ardilla: 'Ardilla de cola roja del templado; rufa con la línea dorsal oscura (su firma), cola tupida y su inspección invertida.',
  jaguar: 'Felino de tierra cálida, majestuoso y acechador; leonado con rosetas de centro ocre (su firma), aura púrpura.',
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
  descripcion: NOTAS_CREATURE[slug] || '',
  props: PROPS_CREATURE,
  variantes: VARIANTES_POR_SLUG[slug] || VARIANTES_CREATURE,
}));

const ITEMS_LAMINAS = Object.entries(LAMINAS).map(([slug, meta]) => ({
  slug,
  nombre: meta.nombre,
  cientifico: meta.especie,
  Component: meta.Component,
  render: 'component',
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
  descripcion: NOTAS_SCENE[slug] || meta.clave || '',
  props: PROPS_SCENE[slug] || [],
  variantes: VARIANTES_SCENE[slug] || [{ label: 'base', props: {} }],
}));

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
    items: ITEMS_EFFECTS,
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
};

/* Orden canónico de las categorías en la vitrina y la navegación por anclas. */
export const VISUAL_CATEGORIES = ['creatures', 'effects', 'laminas', 'scenes'];

/* Conteo de primitivos por categoría (para el encabezado de la vitrina y el PR). */
export const VISUAL_COUNTS = VISUAL_CATEGORIES.reduce((acc, key) => {
  acc[key] = VISUAL_REGISTRY[key].items.length;
  return acc;
}, /** @type {Record<string, number>} */ ({}));

export default VISUAL_REGISTRY;
