// ── EL MUNDO DE LOS ANIMALES, SOBRE EL VALLE REAL (`?mundo=animales`) ────────
// «Un HUB con gallinero + vacas + cerdos como LUGARES del corral, no un stub.»
//
// El corral del catálogo (49,-49 · 2520 msnm · banco llano al costado de la
// casa) deja de ser un mojón con cuatro varas AoE y se vuelve EL LUGAR: se
// entra a escala de persona y el corral es sus tres lugares de verdad:
//
//   · EL GALLINERO QUE CAMINA — el arte APROBADO de MundoGallinero3D.jsx:
//     el tractor de gallinas móvil (techo naranja, ruedas, rampa) y las
//     parcelas del pastoreo rotativo, con la parvada picoteando la del turno.
//   · LAS VACAS / LA LECHERÍA — el hato estilo mundo-abierto de la rama
//     `fable/vacas-red-dead` (CorralVivo.jsx): esqueleto FK con gestos de
//     peso real, pelaje con countershading + rim de hora dorada, la garcita
//     bueyera en el lomo. Razas de LECHERÍA DE ALTURA (VacasScreen.jsx:
//     Normando, Holstein, BON criolla — 2520 msnm es tierra fría).
//   · LOS CERDOS CRIOLLOS — la cochera y el revolcadero: Petra la zunga con
//     sus lechones pegados y Pacho el San Pedreño de oreja PARADA (Agrosavia:
//     «orejas rectas y medianas» — el detalle es fidelidad, no capricho).
//
// Y el CICLO CERRADO como geografía: la pila de boñiga con su carretilla
// apunta al mundo del abono, que está a 55 m porque ESA es la lección
// (catalogo.js). La ubicación enseña la relación.
//
// ── LAS CUATRO MIRADAS ──────────────────────────────────────────────────────
//   Jackson       el corral está HABITADO: 15 animales con nombre, la garcita,
//                 los perros que pasan en su ronda, el cañón de fondo.
//   Nolan         el rim dorado del pelaje a contraluz + las motas de polvo en
//                 la luz del establo: la imagen que se queda.
//   Zelda         parcelas verdes vibrantes, techo naranja del tractor,
//                 cuatro estaciones que dan ganas de recorrer.
//   agroecólogo   pastoreo rotativo real, silvopastoreo (el aliso DENTRO del
//                 potrero), razas del piso térmico correcto, boñiga → biol.
//   instruccional la niña (11) y el campesino, en usted: cada estación una
//                 frase corta; cada animal, su nombre y su nota al tocarlo.
//
// ── REGLAS DE LA CASA QUE ESTE MÓDULO HONRA ─────────────────────────────────
//   · TODO anclado con height(x,z): cada poste de la cerca cae en SU punto del
//     DEM y los travesaños van de cabeza a cabeza siguiendo la ladera; cada
//     animal, cartel, árbol y parcela lee su propia altura. CERO flotando.
//   · Autocontenido (patrón noche.js/minimapa.js): rAF propio, UI propia,
//     main.js solo enchufa en su bloque marcado. Anti-tangle.
//   · Huesos reales, piel dibujada: el terreno es el DEM exacto; los animales
//     son rubber-hose de gesto (holds, latigazos, flicks) sobre esqueleto FK.
//   · Frugal: InstancedMesh por (especie × parte) — los draw calls no crecen
//     con el hato; la obra civil entera va FUSIONADA en un solo mesh.
import * as THREE from 'three';
import { height } from './terrain.js';
// CSS2DRenderer de lib3d: la ficha flotante del animal, anclada al cuerpo en
// world-space (mira a cámara, sigue al animal, oclusión correcta) — antes era
// una tarjeta fija abajo, sin relación con el bicho tocado.
import { CSS2DRenderer, CSS2DObject } from './lib3d/render/CSS2DRenderer.js';
// ez-tree: el aliso de sombra del potrero (silvopastoreo) deja de ser un domo
// icosaedro y pasa a ser aliso andino (Alnus acuminata) ez-tree VIVO.
import { crearHeroe } from './flora-eztree-bake.js';

// ── el puesto canónico del mundo (catalogo.js: 2520 msnm, pendiente 3,9°) ──
const CX = 49, CZ = -49;

// ═══════════════════════════════════════════════════════════════════════════
//  HERRAMIENTAS (copiadas de elementos.js — allá no están exportadas y este
//  módulo es autocontenido a propósito; misma semántica, mismos traps evitados)
// ═══════════════════════════════════════════════════════════════════════════
function prng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const _c = new THREE.Color();
function pintar(g, color) {
  const gg = g.index ? g.toNonIndexed() : g;      // ⚠️ el trap del merge
  const n = gg.attributes.position.count;
  const col = new Float32Array(n * 3);
  _c.set(color);
  for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  gg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return gg;
}
function poner(g, [x, y, z], rot, esc) {
  if (esc) g.scale(esc[0], esc[1], esc[2]);
  if (rot) { g.rotateX(rot[0] || 0); g.rotateY(rot[1] || 0); g.rotateZ(rot[2] || 0); }
  g.translate(x, y, z);
  return g;
}
// fusión manual (BufferGeometryUtils no está vendorizado y `mergeGeometries`
// con indexadas+no-indexadas devuelve null EN SILENCIO): todo desindexado,
// columnas position+color, normales recalculadas.
function fusion(lista, etiqueta) {
  const gs = lista.map((x) => (x.index ? x.toNonIndexed() : x));
  let n = 0;
  for (const g of gs) {
    if (!g.attributes.position) throw new Error('animales: pieza sin position en ' + etiqueta);
    n += g.attributes.position.count;
  }
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of gs) {
    const P = g.attributes.position.array, C = g.attributes.color ? g.attributes.color.array : null;
    for (let i = 0; i < g.attributes.position.count; i++) {
      pos[(o + i) * 3] = P[i * 3]; pos[(o + i) * 3 + 1] = P[i * 3 + 1]; pos[(o + i) * 3 + 2] = P[i * 3 + 2];
      if (C) { col[(o + i) * 3] = C[i * 3]; col[(o + i) * 3 + 1] = C[i * 3 + 1]; col[(o + i) * 3 + 2] = C[i * 3 + 2]; }
      else { col[(o + i) * 3] = 1; col[(o + i) * 3 + 1] = 1; col[(o + i) * 3 + 2] = 1; }
    }
    o += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeVertexNormals();
  out.computeBoundingSphere();
  return out;
}
const suave01 = (x) => { const t = x < 0 ? 0 : x > 1 ? 1 : x; return t * t * (3 - 2 * t); };

// ═══════════════════════════════════════════════════════════════════════════
//  EL PELAJE — parche de shader sobre Lambert, portado ÍNTEGRO de
//  CorralVivo.jsx (rama fable/vacas-red-dead). Tres jugadas, cero uniforms:
//    · countershading: lomo besado por el sol, panza en sombra fría → volumen
//    · rim de hora dorada: fresnel cálido en el contorno — el contraluz
//    · grano determinista del pelo — el cuerpo deja de ser cápsula plástica
//  Funciona igual en InstancedMesh (hato) y meshes sueltas (la garcita).
// ═══════════════════════════════════════════════════════════════════════════
function parchePelaje(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying float vArribaPel;\nvarying vec3 vPosPel;')
    .replace(
      '#include <defaultnormal_vertex>',
      `#include <defaultnormal_vertex>
	vec3 nPel = objectNormal;
	#ifdef USE_INSTANCING
		nPel = ( instanceMatrix * vec4( nPel, 0.0 ) ).xyz;
	#endif
	vArribaPel = normalize( ( modelMatrix * vec4( nPel, 0.0 ) ).xyz ).y;
	vPosPel = position;`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vArribaPel;\nvarying vec3 vPosPel;')
    .replace(
      '#include <opaque_fragment>',
      `float arribaPel = smoothstep( -0.85, 0.9, vArribaPel );
	// ⚠️ retune para ESTE valle (dos golpes medidos con captura + bisección):
	//  1. el sol acá es 2.7 + ACES 1.38 (el diorama original tenía 1.15): el
	//     multiplicador de lomo baja de 1.22 a 0.92 o el pelaje se quema.
	//  2. el RIM ADITIVO con falloff pow(2) es ANCHO: en un cuerpo redondo
	//     oscuro (zungo #4a3a35) casi toda la superficie queda rasante y el
	//     cerdo entero salía CREMA con la cara oscura — probado apagando mesh
	//     por mesh. pow(4.5) + media amplitud = halo dorado FINO de contraluz.
	float rimPel = pow( 1.0 - clamp( dot( normalize( normal ), normalize( vViewPosition ) ), 0.0, 1.0 ), 4.5 );
	float granoPel = fract( sin( dot( floor( vPosPel * 64.0 ), vec3( 127.1, 311.7, 74.7 ) ) ) * 43758.5453 );
	outgoingLight *= mix( vec3( 0.44, 0.41, 0.45 ), vec3( 0.92, 0.87, 0.80 ), arribaPel );
	outgoingLight *= 0.965 + 0.07 * granoPel;
	outgoingLight += vec3( 1.0, 0.83, 0.55 ) * rimPel * ( 0.10 + 0.30 * arribaPel );
	#include <opaque_fragment>`,
    );
}

// ═══════════════════════════════════════════════════════════════════════════
//  LAS ESPECIES — tablas de esqueleto + partes portadas de CorralVivo.jsx
//  (la pasada «mundo abierto» de fable/vacas-red-dead). Escala: con K=0,6 u/m
//  del valle, la vaca `grande` (×1,05) da ~0,80 u = 1,33 m a la cruz — las
//  unidades del diorama original calzan 1:1 con las del valle, medido.
//  Hueso: { padre?, pivote, gesto, fase? } · Parte: { geo, pos, rot?,
//  rotRecta? (oreja parada S.Pedreño), escala?, color?|porRaza, tinte?
//  (manchas), hueso?, cuerpo? (se reanima), fina?, vientre? (preñez),
//  respira?, soloRaza?, pata? }. Todas las especies miran a +x.
// ═══════════════════════════════════════════════════════════════════════════
const TAMANOS = { 'pequeño': 0.55, pequeno: 0.55, mediano: 0.8, grande: 1.05 };
const COLOR_RAZA = {
  normando: '#c9a06a',
  holstein: '#e8e3da',       // las manchas las pone el `tinte` por parte
  bon: '#efe7d8',            // Blanco Orejinegro: la criolla de tierra fría
  zungo: '#4a3a35',
  'sanpedreño': '#6b4a3c', sanpedreno: '#6b4a3c',
  campesina: '#b5622f',
  ponedora: '#d8b58a',
  criolla: '#efe7d8',
  gallo: '#33303e',          // negro azulado de gallo fino
};
const PELAJES = ['#c9a06a', '#e7d9c2', '#8a6a55', '#d8b58a', '#efe7d8', '#a55636'];
const OREJA_RECTA = new Set(['sanpedreño', 'sanpedreno', 'pietrain']);
const TONO = {
  hocico: '#e8d3bf', rosado: '#d99a8a', pezuna: '#2e2018', cuerno: '#d9cbb0',
  cresta: '#c85a44', pico: '#e0a63a', borla: '#3a2a20', golilla: '#d9a54a',
  plumaCola: '#1f4a38',
};

const GALLINA_PARTES = [
  { geo: ['esfera', [0.165, 14, 10]], pos: [0, 0.22, 0], escala: [1.28, 1, 0.92], porRaza: true, cuerpo: true, vientre: true, respira: true },
  { geo: ['esfera', [0.1, 10, 8]], pos: [0.1, 0.185, 0], porRaza: true, cuerpo: true, fina: true },
  { geo: ['esfera', [0.095, 10, 8]], pos: [-0.01, 0.245, 0.115], escala: [1.35, 0.75, 0.5], porRaza: true, tinte: 0.8, cuerpo: true, fina: true },
  { geo: ['esfera', [0.095, 10, 8]], pos: [-0.01, 0.245, -0.115], escala: [1.35, 0.75, 0.5], porRaza: true, tinte: 0.8, cuerpo: true, fina: true },
  { geo: ['cono', [0.085, 0.22, 7]], pos: [-0.2, 0.315, 0], rot: [0, 0, 1.0], porRaza: true, tinte: 0.85, hueso: 'cola', cuerpo: true },
  { geo: ['cilindro', [0.042, 0.055, 0.13, 8]], pos: [0.145, 0.315, 0], rot: [0, 0, -0.35], porRaza: true, hueso: 'cuello', cuerpo: true },
  { geo: ['esfera', [0.075, 12, 9]], pos: [0.19, 0.4, 0], porRaza: true, hueso: 'cabeza', cuerpo: true },
  { geo: ['cono', [0.032, 0.075, 5]], pos: [0.185, 0.475, 0], color: TONO.cresta, hueso: 'cabeza', cuerpo: true, fina: true },
  { geo: ['esfera', [0.024, 6, 5]], pos: [0.245, 0.345, 0], color: TONO.cresta, hueso: 'cabeza', cuerpo: true, fina: true },
  { geo: ['cono', [0.026, 0.075, 5]], pos: [0.27, 0.395, 0], rot: [0, 0, -Math.PI / 2], color: TONO.pico, hueso: 'cabeza', cuerpo: true },
  { geo: ['esfera', [0.014, 6, 5]], pos: [0.21, 0.425, 0.058], color: '#241a10', hueso: 'cabeza', cuerpo: true, fina: true },
  { geo: ['esfera', [0.014, 6, 5]], pos: [0.21, 0.425, -0.058], color: '#241a10', hueso: 'cabeza', cuerpo: true, fina: true },
  { geo: ['cilindro', [0.012, 0.012, 0.15, 5]], pos: [0.02, 0.075, 0.06], color: TONO.pico, pata: 0 },
  { geo: ['cilindro', [0.012, 0.012, 0.15, 5]], pos: [0.02, 0.075, -0.06], color: TONO.pico, pata: 1 },
];
const GALLINA_HUESOS = {
  raiz: { pivote: [0, 0.22, 0], gesto: 'peso' },
  cuello: { padre: 'raiz', pivote: [0.11, 0.26, 0], gesto: 'picotea' },
  cabeza: { padre: 'cuello', pivote: [0.175, 0.36, 0], gesto: 'mira' },
  cola: { padre: 'raiz', pivote: [-0.16, 0.28, 0], gesto: 'colaPluma' },
};

// EL GALLO: la gallina con estampa — cresta doblada grande, golilla dorada,
// las tres plumas de hoz verde petróleo arqueadas sobre la cola. Aurelio.
const GALLO_PARTES = GALLINA_PARTES.map((p) => ({ ...p })); // sin cache compartida
GALLO_PARTES[5] = { ...GALLO_PARTES[5], color: TONO.golilla, porRaza: false };       // golilla
GALLO_PARTES[7] = { ...GALLO_PARTES[7], pos: [0.18, 0.49, 0], escala: [1.5, 1.9, 1.2] }; // crestón
GALLO_PARTES[8] = { ...GALLO_PARTES[8], escala: [1.4, 1.7, 1.4] };                   // barbillas
GALLO_PARTES.push(
  { geo: ['cono', [0.05, 0.3, 6]], pos: [-0.26, 0.42, 0.02], rot: [0.25, 0, 2.25], color: TONO.plumaCola, hueso: 'cola', cuerpo: true, fina: true },
  { geo: ['cono', [0.045, 0.27, 6]], pos: [-0.27, 0.4, -0.035], rot: [-0.3, 0, 2.05], color: TONO.plumaCola, hueso: 'cola', cuerpo: true, fina: true },
  { geo: ['cono', [0.035, 0.22, 5]], pos: [-0.24, 0.44, 0], rot: [0, 0, 2.45], color: '#2c5a44', hueso: 'cola', cuerpo: true, fina: true },
);

const ESPECIES = {
  gallina: { alto: 0.5, sombra: 0.24, huesos: GALLINA_HUESOS, partes: GALLINA_PARTES },
  gallo: { alto: 0.56, sombra: 0.26, huesos: GALLINA_HUESOS, partes: GALLO_PARTES },
  vaca: {
    alto: 0.95,
    sombra: 0.5,
    huesos: {
      raiz: { pivote: [0, 0.48, 0], gesto: 'peso' },
      cuello: { padre: 'raiz', pivote: [0.36, 0.52, 0], gesto: 'pasta' },
      cabeza: { padre: 'cuello', pivote: [0.47, 0.6, 0], gesto: 'mira' },
      orejaI: { padre: 'cabeza', pivote: [0.48, 0.665, 0.135], gesto: 'flick' },
      orejaD: { padre: 'cabeza', pivote: [0.48, 0.665, -0.135], gesto: 'flick', fase: 2.1 },
      cola: { padre: 'raiz', pivote: [-0.45, 0.58, 0], gesto: 'cola' },
    },
    partes: [
      // el barril + masas de hombro y grupa (la grupa un pelo más alta: la
      // estampa del ganado de verdad, no un tubo con patas)
      { geo: ['capsula', [0.23, 0.4, 6, 12]], pos: [0, 0.48, 0], rot: [0, 0, Math.PI / 2], porRaza: true, cuerpo: true, vientre: true, respira: true },
      { geo: ['esfera', [0.2, 14, 10]], pos: [0.25, 0.5, 0], escala: [1.05, 1.08, 0.96], porRaza: true, cuerpo: true },
      { geo: ['esfera', [0.205, 14, 10]], pos: [-0.25, 0.52, 0], escala: [1.05, 1.02, 0.98], porRaza: true, cuerpo: true },
      // manchas de pelaje (tinte sobre el color de la raza), asimétricas
      { geo: ['esfera', [0.14, 10, 8]], pos: [0.07, 0.52, 0.175], escala: [1.3, 0.9, 0.45], porRaza: true, tinte: 0.62, cuerpo: true, fina: true },
      { geo: ['esfera', [0.13, 10, 8]], pos: [-0.13, 0.47, -0.175], escala: [1.25, 0.95, 0.45], porRaza: true, tinte: 0.68, cuerpo: true, fina: true },
      // cuello que UNE (la cabeza no flota) + papada
      { geo: ['capsula', [0.1, 0.16, 5, 10]], pos: [0.4, 0.56, 0], rot: [0, 0, -1.0], porRaza: true, hueso: 'cuello', cuerpo: true },
      { geo: ['capsula', [0.04, 0.14, 4, 8]], pos: [0.42, 0.42, 0], rot: [0, 0, -1.15], porRaza: true, hueso: 'cuello', cuerpo: true, fina: true },
      // cabeza, hocico, ojos, orejas caídas, cuernos cortos
      { geo: ['esfera', [0.135, 14, 10]], pos: [0.52, 0.63, 0], escala: [1.2, 1, 0.82], porRaza: true, hueso: 'cabeza', cuerpo: true },
      { geo: ['esfera', [0.085, 12, 9]], pos: [0.63, 0.575, 0], escala: [1.15, 0.85, 0.9], color: TONO.hocico, hueso: 'cabeza', cuerpo: true, fina: true },
      { geo: ['esfera', [0.021, 6, 5]], pos: [0.565, 0.68, 0.092], color: '#241a10', hueso: 'cabeza', cuerpo: true, fina: true },
      { geo: ['esfera', [0.021, 6, 5]], pos: [0.565, 0.68, -0.092], color: '#241a10', hueso: 'cabeza', cuerpo: true, fina: true },
      { geo: ['cono', [0.05, 0.14, 6]], pos: [0.48, 0.665, 0.135], rot: [1.85, 0, -0.15], porRaza: true, hueso: 'orejaI', cuerpo: true, fina: true },
      { geo: ['cono', [0.05, 0.14, 6]], pos: [0.48, 0.665, -0.135], rot: [-1.85, 0, -0.15], porRaza: true, hueso: 'orejaD', cuerpo: true, fina: true },
      { geo: ['cono', [0.026, 0.11, 6]], pos: [0.485, 0.735, 0.075], rot: [0.75, 0, -0.35], color: TONO.cuerno, hueso: 'cabeza', cuerpo: true, fina: true },
      { geo: ['cono', [0.026, 0.11, 6]], pos: [0.485, 0.735, -0.075], rot: [-0.75, 0, -0.35], color: TONO.cuerno, hueso: 'cabeza', cuerpo: true, fina: true },
      // cola con borla (espanta moscas — hueso propio)
      { geo: ['capsula', [0.02, 0.3, 4, 6]], pos: [-0.46, 0.44, 0], rot: [0, 0, 0.32], porRaza: true, hueso: 'cola', cuerpo: true, fina: true },
      { geo: ['esfera', [0.045, 8, 6]], pos: [-0.515, 0.275, 0], color: TONO.borla, hueso: 'cola', cuerpo: true, fina: true },
      // patas plantadas + pezuñas oscuras
      { geo: ['cilindro', [0.052, 0.042, 0.36, 7]], pos: [0.26, 0.2, 0.135], porRaza: true, pata: 0 },
      { geo: ['cilindro', [0.052, 0.042, 0.36, 7]], pos: [0.26, 0.2, -0.135], porRaza: true, pata: 1 },
      { geo: ['cilindro', [0.052, 0.042, 0.36, 7]], pos: [-0.26, 0.2, 0.135], porRaza: true, pata: 2 },
      { geo: ['cilindro', [0.052, 0.042, 0.36, 7]], pos: [-0.26, 0.2, -0.135], porRaza: true, pata: 3 },
      { geo: ['cilindro', [0.048, 0.054, 0.055, 7]], pos: [0.26, 0.028, 0.135], color: TONO.pezuna, fina: true },
      { geo: ['cilindro', [0.048, 0.054, 0.055, 7]], pos: [0.26, 0.028, -0.135], color: TONO.pezuna, fina: true },
      { geo: ['cilindro', [0.048, 0.054, 0.055, 7]], pos: [-0.26, 0.028, 0.135], color: TONO.pezuna, fina: true },
      { geo: ['cilindro', [0.048, 0.054, 0.055, 7]], pos: [-0.26, 0.028, -0.135], color: TONO.pezuna, fina: true },
    ],
  },
  // El cerdo criollo: rechoncho de verdad — jamón y paletilla como masas,
  // orejas volcadas sobre los ojos (o RECTAS via rotRecta: San Pedreño),
  // cola en tirabuzón, mancha de barro.
  cerdo: {
    alto: 0.62,
    sombra: 0.4,
    huesos: {
      raiz: { pivote: [0, 0.31, 0], gesto: 'peso' },
      cabeza: { padre: 'raiz', pivote: [0.28, 0.35, 0], gesto: 'hocica' },
      orejaI: { padre: 'cabeza', pivote: [0.36, 0.46, 0.095], gesto: 'flick' },
      orejaD: { padre: 'cabeza', pivote: [0.36, 0.46, -0.095], gesto: 'flick', fase: 3.3 },
      cola: { padre: 'raiz', pivote: [-0.355, 0.37, 0], gesto: 'colaCorta', fase: 0.8 },
    },
    partes: [
      { geo: ['capsula', [0.21, 0.32, 6, 12]], pos: [0, 0.31, 0], rot: [0, 0, Math.PI / 2], porRaza: true, cuerpo: true, vientre: true, respira: true },
      { geo: ['esfera', [0.175, 14, 10]], pos: [-0.18, 0.325, 0], escala: [1, 1, 1.06], porRaza: true, cuerpo: true },
      { geo: ['esfera', [0.16, 14, 10]], pos: [0.16, 0.33, 0], porRaza: true, cuerpo: true },
      { geo: ['esfera', [0.13, 10, 8]], pos: [-0.06, 0.32, 0.165], escala: [1.2, 0.85, 0.5], porRaza: true, tinte: 0.62, cuerpo: true, fina: true },
      { geo: ['esfera', [0.14, 12, 9]], pos: [0.35, 0.36, 0], escala: [1.05, 0.95, 0.88], porRaza: true, hueso: 'cabeza', cuerpo: true },
      { geo: ['cilindro', [0.05, 0.062, 0.09, 10]], pos: [0.48, 0.335, 0], rot: [0, 0, Math.PI / 2], color: TONO.rosado, hueso: 'cabeza', cuerpo: true },
      { geo: ['esfera', [0.018, 6, 5]], pos: [0.415, 0.425, 0.082], color: '#241a10', hueso: 'cabeza', cuerpo: true, fina: true },
      { geo: ['esfera', [0.018, 6, 5]], pos: [0.415, 0.425, -0.082], color: '#241a10', hueso: 'cabeza', cuerpo: true, fina: true },
      { geo: ['cono', [0.05, 0.13, 5]], pos: [0.36, 0.475, 0.095], rot: [0.55, 0, 0.95], rotRecta: [0.14, 0, 0.06], porRaza: true, hueso: 'orejaI', cuerpo: true, fina: true },
      { geo: ['cono', [0.05, 0.13, 5]], pos: [0.36, 0.475, -0.095], rot: [-0.55, 0, 0.95], rotRecta: [-0.14, 0, 0.06], porRaza: true, hueso: 'orejaD', cuerpo: true, fina: true },
      { geo: ['toro', [0.032, 0.011, 6, 12]], pos: [-0.36, 0.37, 0], rot: [0, 0.4, 0], color: TONO.rosado, hueso: 'cola', cuerpo: true, fina: true },
      { geo: ['cilindro', [0.04, 0.035, 0.22, 6]], pos: [0.18, 0.11, 0.105], porRaza: true, pata: 0 },
      { geo: ['cilindro', [0.04, 0.035, 0.22, 6]], pos: [0.18, 0.11, -0.105], porRaza: true, pata: 1 },
      { geo: ['cilindro', [0.04, 0.035, 0.22, 6]], pos: [-0.18, 0.11, 0.105], porRaza: true, pata: 2 },
      { geo: ['cilindro', [0.04, 0.035, 0.22, 6]], pos: [-0.18, 0.11, -0.105], porRaza: true, pata: 3 },
    ],
  },
};

function geomDe([tipo, args]) {
  if (tipo === 'esfera') return new THREE.SphereGeometry(...args);
  if (tipo === 'capsula') return new THREE.CapsuleGeometry(...args);
  if (tipo === 'cono') return new THREE.ConeGeometry(...args);
  if (tipo === 'cilindro') return new THREE.CylinderGeometry(...args);
  if (tipo === 'toro') return new THREE.TorusGeometry(...args);
  return new THREE.IcosahedronGeometry(...args);
}

// ═══════════════════════════════════════════════════════════════════════════
//  EL HATO — quince animales CON NOMBRE (visión núcleo del operador: «mis
//  animales tienen nombre»). Razas del piso térmico REAL: a 2520 msnm van la
//  Normando, la Holstein de altura y la BON criolla (VacasScreen.jsx), no el
//  cebú de tierra caliente. Los rumbos están puestos A MANO para que cada
//  silueta lea de perfil o tres cuartos desde las estaciones (lección QA de
//  CorralVivo: un animal de espaldas a cámara muere como «media piedra»).
// ═══════════════════════════════════════════════════════════════════════════
const HATO = [
  // ── las vacas, dentro del corral (centro 49,-49 · cerca R 9,5) ──
  { especie: 'vaca', nombre: 'La Mona', raza: 'normando', tamano: 'grande', x: 46, z: -46.5, rumbo: 1.95,
    nota: 'Normando de doble propósito. La que más leche da — y la que manda en el corral.' },
  { especie: 'vaca', nombre: 'Lucero', raza: 'holstein', tamano: 'grande', x: 52.5, z: -49.5, rumbo: -1.25, estado: 'preñada',
    nota: 'Holstein de lechería de altura. Espera cría: pasto de descanso y ordeño limpio.' },
  { especie: 'vaca', nombre: 'Esperanza', raza: 'bon', tamano: 'mediano', x: 47.5, z: -53.2, rumbo: 2.7,
    nota: 'Blanco Orejinegro — criolla colombiana, rústica y bien adaptada a la tierra fría.' },
  { especie: 'vaca', nombre: 'Canela', raza: 'bon', tamano: 'pequeño', x: 50.4, z: -52.3, rumbo: -2.1,
    nota: 'La ternera de Esperanza. Anda siempre a media cola de la mamá.' },
  // ── los cerdos, en la cochera y el revolcadero ──
  { especie: 'cerdo', nombre: 'Petra', raza: 'zungo', tamano: 'grande', x: 57.6, z: -66, rumbo: 0.7,
    nota: 'Zunga criolla. Hocica el barro del revolcadero: así se refresca y espanta parásitos.' },
  { especie: 'cerdo', nombre: 'Pacho', raza: 'sanpedreño', tamano: 'mediano', x: 60.2, z: -64.6, rumbo: -2.2,
    nota: 'San Pedreño: oreja RECTA y mediana (Agrosavia). Criollo antioqueño de finca fría.' },
  { especie: 'cerdo', nombre: 'Rosita', raza: 'zungo', tamano: 'pequeño', x: 56.6, z: -65.1, rumbo: 1.3,
    nota: 'Lechona de Petra. A donde va la mamá, va ella.' },
  { especie: 'cerdo', nombre: 'Pepe', raza: 'zungo', tamano: 'pequeño', x: 58.5, z: -66.9, rumbo: 0.2,
    nota: 'El lechón curioso de la camada. Siempre con el hocico metido en algo.' },
  // ── la parvada, en la parcela del turno del pastoreo rotativo ──
  // (⛔ NO ponerlo en (29.3,-52.6): ahí flora.js tiene un arbusto grande y el
  //  gallo quedaba ADENTRO — verificado en captura. Va con su parvada.)
  { especie: 'gallo', nombre: 'Aurelio', raza: 'gallo', tamano: 'mediano', x: 24.2, z: -52.8, rumbo: -0.6,
    nota: 'El gallo. Canta al amanecer y vigila la parvada — el primero en avisar del gavilán.' },
  { especie: 'gallina', nombre: 'Turuleca', raza: 'campesina', tamano: 'pequeño', x: 25.4, z: -50.6, rumbo: 0.9,
    nota: 'Campesina colorada. Pone en el nidal del tractor, no donde le da la gana (casi).' },
  { especie: 'gallina', nombre: 'Pepa', raza: 'ponedora', tamano: 'pequeño', x: 27.4, z: -52.4, rumbo: -1.8,
    nota: 'La mejor ponedora. Un huevo al día, criolla y a pastoreo.' },
  { especie: 'gallina', nombre: 'Caramelo', raza: 'campesina', tamano: 'pequeño', x: 24.6, z: -53, rumbo: 2.2,
    nota: 'Le gusta escarbar al pie de las flechas del ciclo. Ahí el pasto está recién abonado.' },
  { especie: 'gallina', nombre: 'Ceniza', raza: 'criolla', tamano: 'pequeño', x: 27.9, z: -49.9, rumbo: -0.4,
    nota: 'Criolla gris. La que más insectos caza: control de plagas con patas.' },
  { especie: 'gallina', nombre: 'Mote', raza: 'ponedora', tamano: 'pequeño', x: 26, z: -54.2, rumbo: 1.6,
    nota: 'Clueca a ratos. Cuando el tractor se corre de parcela, ella va de primeras.' },
  { especie: 'gallina', nombre: 'Flor', raza: 'campesina', tamano: 'pequeño', x: 23.7, z: -51.8, rumbo: -2.6,
    nota: 'La más nueva de la parvada. Todavía anda pegada a Turuleca.' },
];

function colorDe(a, i) {
  const raza = (a.raza || '').toLowerCase().trim();
  if (COLOR_RAZA[raza]) return COLOR_RAZA[raza];
  if (!raza) return PELAJES[i % PELAJES.length];
  let h = 0;
  for (const ch of raza) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return PELAJES[h % PELAJES.length];
}

/* El animal normalizado y ANCLADO: su `mat` compone (x, height−hundimiento, z)
   + rumbo + escala. En la ladera de 3,9° las cuatro patas no caen en la misma
   cota: se toma la MENOR de tres muestras bajo el cuerpo (nada flota; a lo
   sumo una pezuña se entierra unos mm, como en un potrero de verdad). */
const EJE_Y = new THREE.Vector3(0, 1, 0);
function normalizarHato(lista) {
  return lista.map((a, i) => {
    const escala = TAMANOS[(a.tamano || 'mediano').toLowerCase()] ?? TAMANOS.mediano;
    const dx = Math.cos(a.rumbo || 0) * 0.3 * escala, dz = -Math.sin(a.rumbo || 0) * 0.3 * escala;
    const y = Math.min(
      height(a.x, a.z),
      height(a.x + dx, a.z + dz),
      height(a.x - dx, a.z - dz),
    ) - 0.015;
    const estado = (a.estado || 'sano').toLowerCase();
    const color = new THREE.Color(colorDe(a, i));
    return {
      id: `${i}-${a.nombre}`,
      ...a,
      especie: a.especie,
      orejaRecta: OREJA_RECTA.has((a.raza || '').toLowerCase().trim()),
      estado,
      escala,
      pos: [a.x, y, a.z],
      fase: i * 1.7,
      vientre: estado.startsWith('pre') ? 1.18 : 1,
      color,
      colorCss: `#${color.getHexString()}`,
      mat: new THREE.Matrix4().compose(
        new THREE.Vector3(a.x, y, a.z),
        new THREE.Quaternion().setFromAxisAngle(EJE_Y, a.rumbo || 0),
        new THREE.Vector3(escala, escala, escala),
      ),
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  EL ESQUELETO — FK sobre matrices, portado de CorralVivo. El gesto rota el
//  hueso EN SU PIVOTE y la cadena hereda: la vaca pasta con las patas
//  plantadas, la gallina picotea con el CUELLO, la cola da latigazos
//  esporádicos. Peso real = amplitudes chicas, ritmos lentos CON HOLDS
//  (rubber-hose de gesto: anticipación y golpe, no metrónomo).
// ═══════════════════════════════════════════════════════════════════════════
const _euler = new THREE.Euler();
function matrizParte(parte, recta = false) {
  const usaRecta = recta && parte.rotRecta;
  const clave = usaRecta ? '_mRecta' : '_m';
  if (!parte[clave]) {
    const esc = Array.isArray(parte.escala) ? parte.escala : [1, 1, 1];
    const pPos = parte.pos || [0, 0, 0];
    const pRot = (usaRecta ? parte.rotRecta : parte.rot) || [0, 0, 0];
    parte[clave] = new THREE.Matrix4().compose(
      new THREE.Vector3(...pPos),
      new THREE.Quaternion().setFromEuler(_euler.set(...pRot)),
      new THREE.Vector3(...esc),
    );
  }
  return parte[clave];
}

const _eGesto = new THREE.Euler();
function matrizGestoHueso(m, gesto, t, fase) {
  if (gesto === 'peso') {
    _eGesto.set(Math.sin(t * 0.31 + fase) * 0.013, 0, Math.sin(t * 0.52 + fase * 1.3) * 0.02);
    m.makeRotationFromEuler(_eGesto);
  } else if (gesto === 'pasta') {
    // pastar con HOLD: baja, arranca pasto (mordiscos), sube — ciclo largo
    const baja = suave01((Math.sin(t * 0.14 + fase) - 0.15) / 0.5);
    const mordisco = Math.max(0, Math.sin(t * 2.3 + fase)) ** 2 * 0.06 * baja;
    m.makeRotationZ(-(baja * 1.05 + mordisco));
  } else if (gesto === 'picotea') {
    // el picoteo vive en el CUELLO: el cuerpo queda quieto (peso real)
    const p = Math.max(0, Math.sin(t * 1.7 + fase));
    m.makeRotationZ(-(p ** 6) * 1.25);
  } else if (gesto === 'hocica') {
    // hocicar: baja el morro y lo sacude de lado (busca raíces)
    const p = Math.max(0, Math.sin(t * 1.05 + fase));
    _eGesto.set(0, Math.sin(t * 4.3 + fase) * 0.12 * p, -(p ** 4) * 0.55);
    m.makeRotationFromEuler(_eGesto);
  } else if (gesto === 'mira') {
    // la cabeza mira alrededor: giros con PAUSA (atención, no péndulo)
    const g = Math.sin(t * 0.23 + fase * 2.7);
    m.makeRotationY(Math.sign(g) * suave01(Math.abs(g) * 1.6 - 0.6) * 0.38);
  } else if (gesto === 'cola') {
    // vaivén perezoso + latigazo espanta-moscas esporádico
    const flick = Math.max(0, Math.sin(t * 0.19 + fase * 3)) ** 24 * Math.sin(t * 11) * 0.9;
    m.makeRotationX(Math.sin(t * 1.15 + fase) * 0.3 + flick);
  } else if (gesto === 'colaCorta') {
    // meneo en ráfagas (la colita del cerdo cuando está contento)
    const rafaga = Math.max(0, Math.sin(t * 0.3 + fase * 2)) ** 8;
    m.makeRotationX(Math.sin(t * 6 + fase) * rafaga * 0.5);
  } else if (gesto === 'colaPluma') {
    m.makeRotationZ(Math.sin(t * 1.3 + fase) * 0.1);
  } else if (gesto === 'flick') {
    // la oreja: quieta casi siempre, un flick nervioso de vez en cuando
    const p = Math.max(0, Math.sin(t * 0.27 + fase * 5)) ** 30;
    m.makeRotationX(p * Math.sin(t * 17) * 0.5);
  } else {
    m.identity();
  }
}

/* FK: matriz MUNDO de un hueso = padre × T(pivote) × R(gesto) × T(−pivote).
   Cacheada por (animal, hueso) y recalculada solo si cambió `t`. */
const _huesoCache = new Map();
const _mPiv = new THREE.Matrix4();
const _mRot = new THREE.Matrix4();
function matrizHueso(animal, esp, nombre, t) {
  const clave = `${animal.id}|${nombre}`;
  let e = _huesoCache.get(clave);
  if (!e) _huesoCache.set(clave, (e = { t: NaN, m: new THREE.Matrix4() }));
  if (e.t === t) return e.m;
  e.t = t;
  const h = esp.huesos?.[nombre];
  if (!h) return e.m.copy(animal.mat);
  const base = h.padre ? matrizHueso(animal, esp, h.padre, t) : animal.mat;
  matrizGestoHueso(_mRot, h.gesto, t, animal.fase + (h.fase || 0));
  const [px, py, pz] = h.pivote || [0, 0, 0];
  e.m.copy(base)
    .multiply(_mPiv.makeTranslation(px, py, pz))
    .multiply(_mRot)
    .multiply(_mPiv.makeTranslation(-px, -py, -pz));
  return e.m;
}

const _mTmp = new THREE.Matrix4();
const _mVientre = new THREE.Matrix4();
const _mResp = new THREE.Matrix4();
const _cTinte = new THREE.Color();

/* LA POSE VIVA: cada animal congela su esqueleto en un instante DISTINTO
   (determinista por fase) — en una foto fija el hato no es un ejército de
   clones. El reloj animado ARRANCA desde ese instante: cero salto. */
const tPose = (a) => a.fase * 5.21;

function componer(destino, animal, parte, t) {
  const esp = ESPECIES[animal.especie];
  destino.copy(matrizHueso(animal, esp, parte.hueso || 'raiz', t));
  if (parte.vientre && animal.vientre !== 1) {
    destino.multiply(_mVientre.makeScale(1, 1.05, animal.vientre));
  }
  destino.multiply(matrizParte(parte, animal.orejaRecta));
  if (parte.respira) {
    const r = Math.sin(t * 0.9 + animal.fase) * 0.022;
    destino.multiply(_mResp.makeScale(1 + r, 1 + r * 0.25, 1 + r));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  EL HATO INSTANCIADO — un InstancedMesh por (especie × parte): los draw
//  calls no crecen con el hato. Materiales compartidos por color (una sola
//  compilación del parche de pelaje para todo el corral).
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ material PROPIO por InstancedMesh (NO compartido): con un solo Lambert
// blanco compartido entre ~40 meshes, el programa GPU salía sin
// USE_INSTANCING_COLOR para parte de ellos y medio hato renderizaba BLANCO
// aunque los buffers instanceColor tuvieran los pelajes correctos (verificado
// con sonda Playwright). Así lo hacía R3F en CorralVivo —un material por
// mesh— y el caché de programas de three dedupe el shader igual: costo cero.
function matPelaje(color) {
  return new THREE.MeshLambertMaterial({ color, onBeforeCompile: parchePelaje });
}

function armarHato(grupo, animales) {
  const porEspecie = new Map();
  for (const a of animales) {
    if (!porEspecie.has(a.especie)) porEspecie.set(a.especie, []);
    porEspecie.get(a.especie).push(a);
  }
  const vivos = [];   // [{ mesh, parte, lista }] — solo partes `cuerpo` se reaniman
  const clicables = []; // para el raycast del toque
  for (const [nombre, lista] of porEspecie) {
    const esp = ESPECIES[nombre];
    for (const parte of esp.partes) {
      const m = new THREE.InstancedMesh(geomDe(parte.geo), matPelaje(parte.porRaza ? '#ffffff' : parte.color), lista.length);
      lista.forEach((a, i) => {
        componer(_mTmp, a, parte, tPose(a));
        m.setMatrixAt(i, _mTmp);
        if (parte.porRaza) {
          m.setColorAt(i, parte.tinte ? _cTinte.copy(a.color).multiplyScalar(parte.tinte) : a.color);
        }
      });
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
      m.userData.animales = lista;
      grupo.add(m);
      clicables.push(m);
      if (parte.cuerpo) vivos.push({ m, parte, lista });
    }
  }
  return { vivos, clicables };
}

/* el idle esquelético, por frame: solo partes `cuerpo` (patas plantadas) */
function animarHato(vivos, t) {
  for (const v of vivos) {
    for (let i = 0; i < v.lista.length; i++) {
      const a = v.lista[i];
      componer(_mTmp, a, v.parte, tPose(a) + t);
      v.m.setMatrixAt(i, _mTmp);
    }
    v.m.instanceMatrix.needsUpdate = true;
  }
}

// ── EL PESO EN EL PISO: sombras de contacto, UNA InstancedMesh ─────────────
function texturaSombra() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.4)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const _qSombra = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const _vP = new THREE.Vector3();
const _vS = new THREE.Vector3();
function armarSombras(grupo, animales) {
  const m = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: texturaSombra(), color: '#2e2012', transparent: true, opacity: 0.42, depthWrite: false }),
    animales.length,
  );
  m.renderOrder = 1;
  animales.forEach((a, i) => {
    const r = (ESPECIES[a.especie].sombra || 0.3) * a.escala;
    // alargada hacia −x: toda sombra de hora dorada apunta lejos del sol
    _mTmp.compose(
      _vP.set(a.pos[0] - r * 0.3, a.pos[1] + 0.07, a.pos[2]),
      _qSombra,
      _vS.set(r * 2.6, r * 1.7, 1),
    );
    m.setMatrixAt(i, _mTmp);
  });
  m.instanceMatrix.needsUpdate = true;
  m.computeBoundingSphere();
  grupo.add(m);
}

// ── LA GARCITA BUEYERA en el lomo de la vaca más grande: la compañía de
//    potrero de toda la vida (le espulga las moscas). Mira con pausas. ──────
function armarGarcita(grupo, animales) {
  const vaca = animales
    .filter((a) => a.especie === 'vaca')
    .sort((a, b) => b.escala - a.escala)[0];
  if (!vaca) return null;
  const sitio = new THREE.Vector3(-0.22, 0.73, 0.02).applyMatrix4(vaca.mat);
  const G = new THREE.Group();
  G.position.copy(sitio);
  G.rotation.y = (vaca.rumbo || 0) + 0.5;
  G.scale.setScalar(0.85 * vaca.escala);
  const lamb = (c) => new THREE.MeshLambertMaterial({ color: c, onBeforeCompile: parchePelaje });
  const mesh = (geo, mat, pos, rot, esc) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    if (esc) m.scale.set(...esc);
    return m;
  };
  // patas de palillo + cuerpo blanco con colita
  G.add(mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.09, 4), lamb(TONO.pico), [0, -0.045, 0.012]));
  G.add(mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.09, 4), lamb(TONO.pico), [0.012, -0.045, -0.012]));
  G.add(mesh(new THREE.SphereGeometry(0.055, 10, 8), lamb('#f2ede2'), [0, 0.01, 0], null, [1.5, 1, 0.85]));
  G.add(mesh(new THREE.ConeGeometry(0.028, 0.07, 5), lamb('#e8e2d2'), [-0.085, 0.03, 0], [0, 0, 0.9]));
  // cabeza con cuello en S y pico ámbar (grupo propio: es la que mira)
  const cabeza = new THREE.Group();
  cabeza.position.set(0.05, 0.055, 0);
  cabeza.add(mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.06, 5), lamb('#f2ede2'), [0.01, 0.01, 0], [0, 0, -0.5]));
  cabeza.add(mesh(new THREE.SphereGeometry(0.026, 8, 6), lamb('#f2ede2'), [0.035, 0.045, 0]));
  cabeza.add(mesh(new THREE.ConeGeometry(0.009, 0.045, 4), lamb(TONO.pico), [0.07, 0.042, 0], [0, 0, -Math.PI / 2]));
  cabeza.add(mesh(new THREE.SphereGeometry(0.006, 5, 4), new THREE.MeshBasicMaterial({ color: '#241a10' }), [0.045, 0.055, 0.019]));
  G.add(cabeza);
  grupo.add(G);
  return { cabeza };
}

// ── LA SEÑAL DE PREÑADA: gota rosada suave sobre el lomo (se ve sin leer;
//    la placa lo dice con palabras al tocar) ────────────────────────────────
function armarPrenadas(grupo, animales) {
  const lista = animales.filter((a) => a.estado.startsWith('pre'));
  if (!lista.length) return null;
  const m = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.055, 0),
    new THREE.MeshBasicMaterial({ color: '#d98fa0', transparent: true, opacity: 0.9 }),
    lista.length,
  );
  grupo.add(m);
  return {
    m, lista,
    posar(t) {
      lista.forEach((a, i) => {
        const alza = Math.sin(t * 1.4 + a.fase) * 0.03;
        _mTmp.makeTranslation(a.pos[0], a.pos[1] + ESPECIES[a.especie].alto * a.escala + 0.16 + alza, a.pos[2]);
        m.setMatrixAt(i, _mTmp);
      });
      m.instanceMatrix.needsUpdate = true;
    },
  };
}

// ── MOTAS DE POLVO DORADO flotando en la luz del establo (momento Nolan) ───
function armarMotas(grupo, cx, cz) {
  const N = 14;
  const y0 = height(cx, cz);
  const m = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.016, 0),
    new THREE.MeshBasicMaterial({ color: '#ffdf9e', transparent: true, opacity: 0.45, depthWrite: false }),
    N,
  );
  grupo.add(m);
  const ORO = 2.39996323;
  return {
    posar(t) {
      for (let i = 0; i < N; i++) {
        const r = 0.6 + ((i * 0.37) % 1) * 1.4;
        const a = i * ORO * 2.1 + t * 0.05;
        const y = y0 + 0.4 + ((t * 0.045 + i * 0.171) % 1) * 1.3;
        const s = 0.7 + 0.5 * Math.sin(t * 0.9 + i * 2.3);
        _mTmp.compose(_vP.set(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r), _qSombra, _vS.set(s, s, s));
        m.setMatrixAt(i, _mTmp);
      }
      m.instanceMatrix.needsUpdate = true;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  LA OBRA CIVIL — cada poste cae en SU height() y los travesaños van de
//  cabeza a cabeza: la cerca SIGUE la ladera como una cerca de verdad. Todo
//  fusionado en un solo mesh (1 draw call para el corral entero).
// ═══════════════════════════════════════════════════════════════════════════
const MADERA = '#6b4a28', MADERA2 = '#8a6136', PIEDRA = '#5b6169', TECHO = '#8f3f34';
const LAMINA = '#aeb6bd', AMBAR = '#e0a341', CAL = '#efe7d0';

/* poste hincado: la base se entierra 0,25 bajo su punto del DEM */
function posteAnclado(x, z, alto, r = 0.07) {
  const y = height(x, z);
  return pintar(poner(new THREE.CylinderGeometry(r, r * 1.3, alto + 0.25, 5), [x, y + alto / 2 - 0.12, z]), MADERA);
}
/* travesaño de cabeza a cabeza entre dos postes (cada uno en su cota) */
function travesano(x1, z1, x2, z2, h, grosor = 0.055, col = MADERA2) {
  const y1 = height(x1, z1) + h, y2 = height(x2, z2) + h;
  const dxz = Math.hypot(x2 - x1, z2 - z1);
  const g = new THREE.BoxGeometry(Math.hypot(dxz, y2 - y1) + 0.12, grosor, grosor);
  g.rotateZ(Math.atan2(y2 - y1, dxz));
  g.rotateY(-Math.atan2(z2 - z1, x2 - x1));
  g.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  return pintar(g, col);
}
/* la cerca de varas circular, con un vano para la tranquera */
function cercaAnclada(cx, cz, radio, n, alto, gapAng, gapMedio) {
  const p = [];
  const enGap = (a) => Math.abs(((a - gapMedio + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < gapAng / 2;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push({ a, x: cx + Math.cos(a) * radio, z: cz + Math.sin(a) * radio });
  }
  for (let i = 0; i < n; i++) {
    const P0 = pts[i], P1 = pts[(i + 1) % n];
    if (!enGap(P0.a)) p.push(posteAnclado(P0.x, P0.z, alto));
    if (enGap(P0.a) || enGap(P1.a)) continue;   // el vano queda abierto
    for (const h of [alto * 0.78, alto * 0.45]) p.push(travesano(P0.x, P0.z, P1.x, P1.z, h));
  }
  // la tranquera: dos postes altos a los bordes del vano y el VARAL RECOSTADO
  // — la vara de la talanquera abierta descansa del poste al pasto, hacia
  // afuera (la versión en diagonal alta leía como tirolesa, no como puerta)
  const bA = gapMedio - gapAng / 2, bB = gapMedio + gapAng / 2;
  const TA = { x: cx + Math.cos(bA) * radio, z: cz + Math.sin(bA) * radio };
  const TB = { x: cx + Math.cos(bB) * radio, z: cz + Math.sin(bB) * radio };
  p.push(posteAnclado(TA.x, TA.z, alto * 1.5, 0.09));
  p.push(posteAnclado(TB.x, TB.z, alto * 1.5, 0.09));
  {
    const yA = height(TA.x, TA.z) + alto * 0.9;               // apoyada en el poste
    const fx = cx + Math.cos(gapMedio) * (radio + 2.6);       // el pie, afuera
    const fz = cz + Math.sin(gapMedio) * (radio + 2.6);
    const fy = height(fx, fz) + 0.05;
    const dxz = Math.hypot(fx - TA.x, fz - TA.z);
    const vara = new THREE.CylinderGeometry(0.045, 0.055, Math.hypot(dxz, yA - fy), 5);
    vara.rotateZ(Math.PI / 2);
    vara.rotateZ(Math.atan2(yA - fy, dxz));
    vara.rotateY(-Math.atan2(fz - TA.z, fx - TA.x));
    vara.translate((TA.x + fx) / 2, (yA + fy) / 2, (TA.z + fz) / 2);
    p.push(pintar(vara, MADERA2));
  }
  return p;
}
/* parche de suelo pegado al DEM: abanico radial con cada vértice en height()
   — la parcela ABRAZA la ladera en vez de flotar como una tabla */
function parcheSuelo(cx, cz, r, color, alza = 0.1) {
  const SEG = 18;
  const hy = (x, z) => height(x, z) + alza;
  const pos = [];
  const pt = (ri, a) => { const x = cx + Math.cos(a) * ri, z = cz + Math.sin(a) * ri; return [x, hy(x, z), z]; };
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
    const c = [cx, hy(cx, cz), cz];
    const m0 = pt(r * 0.55, a0), m1 = pt(r * 0.55, a1);
    const e0 = pt(r, a0), e1 = pt(r, a1);
    pos.push(...c, ...m1, ...m0, ...m0, ...m1, ...e1, ...m0, ...e1, ...e0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  return pintar(g, color);
}
/* cobertizo abierto: 4 postes gruesos en SUS cotas, techo piramidal con alero
   corto, vigas de amarre y MEDIA PARED de tablas al fondo (sin ella leía como
   pérgola flotante, no como cobertizo de finca — verificado en captura) */
function cobertizo(cx, cz, w, d, altoPared, colTecho) {
  const p = [];
  let yMax = -1e9;
  const esquinas = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => {
    const x = cx + sx * w / 2, z = cz + sz * d / 2;
    yMax = Math.max(yMax, height(x, z));
    p.push(posteAnclado(x, z, altoPared, 0.11));
    return { x, z };
  });
  // vigas de amarre de cabeza a cabeza (el techo no flota: se APOYA)
  for (let i = 0; i < 4; i++) {
    const A = esquinas[i], B = esquinas[(i + 1) % 4];
    p.push(travesano(A.x, A.z, B.x, B.z, altoPared * 0.96, 0.085, MADERA));
  }
  // pirámide con alero de 0,35 u por lado (los flancos del cono(4) girado 45°
  // quedan a radio·cos45: se despeja la escala para que el alero MIDA eso)
  const hyp = Math.hypot(w, d);
  const t = new THREE.ConeGeometry(hyp * 0.62, altoPared * 0.5, 4);
  t.rotateY(Math.PI / 4);
  t.scale((w + 0.7) / (0.88 * hyp), 1, (d + 0.7) / (0.88 * hyp));
  t.translate(cx, yMax + altoPared * 1.12, cz);
  p.push(pintar(t, colTecho || TECHO));
  // la media pared del fondo (lado norte: +z, de espaldas a la vista de entrada)
  const yTab = Math.min(height(cx - w / 2, cz + d / 2), height(cx + w / 2, cz + d / 2));
  p.push(pintar(poner(new THREE.BoxGeometry(w, altoPared * 0.55, 0.06), [cx, yTab + altoPared * 0.3, cz + d / 2 - 0.03]), MADERA2));
  return p;
}
/* caja apoyada en el terreno: la cota sale del MÍNIMO de las cuatro esquinas
   (en ladera, una caja puesta a la cota del centro deja aire bajo el borde
   cuesta abajo — el saladero salió flotando en captura; así, se hunde apenas) */
function cajaAnclada(cx, cz, w, h, d, col) {
  const y = Math.min(
    height(cx - w / 2, cz - d / 2), height(cx + w / 2, cz - d / 2),
    height(cx - w / 2, cz + d / 2), height(cx + w / 2, cz + d / 2),
  );
  return pintar(poner(new THREE.BoxGeometry(w, h, d), [cx, y + h / 2 - 0.04, cz]), col);
}
// (arbolAnclado —domo icosaedro sobre palo— quedó ELIMINADO por la purga
//  AUDIT-ARBOLES-HUMBOLDT. El aliso de sombra del potrero ahora es aliso andino
//  ez-tree VIVO, añadido como Group aparte; ver 'animales-aliso-potrero'.)

/* EL TRACTOR DE GALLINAS — el arte aprobado de MundoGallinero3D.jsx, anclado:
   casita de madera abierta, techo piramidal naranja, dos ruedas, la rampa y
   el nidal con sus tres huevos. Parqueado en la parcela del traslado. */
function tractorGallinas(cx, cz, giro) {
  const p = [];
  const y = height(cx, cz);
  // coordenadas locales del tractor → mundo (girado, piso 0,1 sobre su cota)
  const loc = (lx, ly, lz) => [cx + Math.cos(giro) * lx + Math.sin(giro) * lz, y + 0.1 + ly, cz - Math.sin(giro) * lx + Math.cos(giro) * lz];
  // caja de la casita (madera clara, medio abierta) + 4 parales
  p.push(pintar(poner(new THREE.BoxGeometry(1.7, 0.75, 1.25), loc(0, 0.62, 0), [0, giro, 0]), '#b08d57'));
  for (const [lx, lz] of [[-0.78, -0.52], [0.78, -0.52], [-0.78, 0.52], [0.78, 0.52]]) {
    p.push(pintar(poner(new THREE.BoxGeometry(0.08, 0.95, 0.08), loc(lx, 0.48, lz), [0, giro, 0]), MADERA));
  }
  // techo piramidal NARANJA (la seña del gallinero aprobado)
  const techo = new THREE.ConeGeometry(1.25, 0.5, 4);
  techo.rotateY(Math.PI / 4 + giro);
  p.push(pintar(poner(techo, loc(0, 1.22, 0)), '#b86b3d'));
  // las dos ruedas (el gallinero CAMINA: eso enseña)
  for (const lado of [-0.68, 0.68]) {
    const rueda = new THREE.TorusGeometry(0.19, 0.05, 6, 10);
    p.push(pintar(poner(rueda, loc(lado, 0.16, 0.66), [Math.PI / 2, giro, 0]), '#3a2c1c'));
  }
  // la rampa: ANCLADA — del borde del piso de la casita al punto REAL del
  // terreno (dos cotas medidas, como los travesaños de la cerca; la primera
  // versión la dejaba flotando 0,3 u sobre el pasto — verificado en captura)
  {
    const [ax, ay, az] = loc(0, 0.28, -0.62);          // borde del piso
    const [bx, , bz] = loc(0, 0, -1.55);               // pie en el pasto
    const by = height(bx, bz) + 0.03;
    const dxz = Math.hypot(bx - ax, bz - az);
    const g = new THREE.BoxGeometry(Math.hypot(dxz, ay - by), 0.045, 0.34);
    g.rotateZ(Math.atan2(ay - by, dxz));
    g.rotateY(-Math.atan2(bz - az, bx - ax));
    g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    p.push(pintar(g, MADERA2));
  }
  // el nidal asomado con tres huevos (esferas de cal)
  for (const dxH of [-0.2, 0, 0.2]) {
    p.push(pintar(poner(new THREE.SphereGeometry(0.055, 8, 6), loc(dxH, 0.34, 0.72), null, [0.85, 1, 0.85]), CAL));
  }
  // bebedero de campana (lámina + agua ámbar)
  p.push(pintar(poner(new THREE.CylinderGeometry(0.16, 0.13, 0.16, 10), loc(1.35, 0.12, -0.3)), LAMINA));
  p.push(pintar(poner(new THREE.CylinderGeometry(0.05, 0.1, 0.18, 10), loc(1.35, 0.28, -0.3)), AMBAR));
  return p;
}

/* la carretilla del ciclo cerrado, apuntando AL MUNDO DEL ABONO (la pila de
   boñiga viaja 55 m: esa distancia corta ES la lección del catálogo) */
function carretilla(cx, cz, giro) {
  const p = [];
  const y = height(cx, cz);
  const loc = (lx, ly, lz) => [cx + Math.cos(giro) * lx + Math.sin(giro) * lz, y + ly, cz - Math.sin(giro) * lx + Math.cos(giro) * lz];
  p.push(pintar(poner(new THREE.BoxGeometry(0.75, 0.3, 0.5), loc(0, 0.42, 0), [0, giro, 0.06]), '#7a4a2a'));
  p.push(pintar(poner(new THREE.SphereGeometry(0.14, 8, 6), loc(0.1, 0.6, 0), null, [1.4, 0.5, 1]), '#4f3a22')); // la boñiga
  const rueda = new THREE.TorusGeometry(0.16, 0.045, 6, 10);
  p.push(pintar(poner(rueda, loc(0.48, 0.18, 0), [Math.PI / 2, giro, 0]), '#3a2c1c'));
  for (const lado of [-0.2, 0.2]) {
    p.push(pintar(poner(new THREE.BoxGeometry(0.7, 0.05, 0.05), loc(-0.45, 0.34, lado), [0, giro, 0.1]), MADERA));
  }
  return p;
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOS CARTELES CON NOMBRE — la tablita de madera clavada junto al animal
//  (estaca + perilla del color del pelaje van FUSIONADAS; el texto va en un
//  ATLAS canvas y TODOS los letreros son UN solo mesh transparente: 15
//  nombres, 1 draw call). Legible por ambas caras.
// ═══════════════════════════════════════════════════════════════════════════
function armarCarteles(grupo, piezasFusion, letreros) {
  const N = letreros.length;
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 64 * N;
  const g2 = cv.getContext('2d');
  g2.clearRect(0, 0, cv.width, cv.height);
  letreros.forEach((L, i) => {
    g2.font = '700 46px Georgia, "Times New Roman", serif';
    g2.textAlign = 'center'; g2.textBaseline = 'middle';
    g2.fillStyle = '#241708';
    g2.fillText(L.texto, 256, i * 64 + 34, 490);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const quads = [];
  letreros.forEach((L, i) => {
    const y = height(L.x, L.z);
    // la estaca y la tablita torcida a mano (determinista por letrero)
    const torcida = Math.sin(i * 3.1) * 0.05;
    piezasFusion.push(pintar(poner(new THREE.CylinderGeometry(0.022, 0.03, 0.62, 5), [L.x, y + 0.22, L.z]), MADERA));
    const tabla = new THREE.BoxGeometry(0.62, 0.2, 0.035);
    tabla.rotateZ(torcida);
    tabla.rotateY(L.giro);
    tabla.translate(L.x, y + 0.52, L.z);
    piezasFusion.push(pintar(tabla, '#caa46a'));
    if (L.color) {
      piezasFusion.push(pintar(poner(new THREE.SphereGeometry(0.035, 8, 6), [L.x, y + 0.66, L.z]), L.color));
    }
    // el texto: dos quads (uno por cara) apuntando a su fila del atlas
    for (const lado of [1, -1]) {
      const q = new THREE.PlaneGeometry(0.56, 0.15).toNonIndexed();
      const uv = q.attributes.uv;
      for (let k = 0; k < uv.count; k++) {
        uv.setY(k, 1 - (i + 1 - uv.getY(k)) * (64 / cv.height));
      }
      q.rotateZ(torcida * lado);
      q.rotateY(L.giro + (lado < 0 ? Math.PI : 0));
      q.translate(L.x + Math.sin(L.giro) * 0.022 * lado, y + 0.52, L.z + Math.cos(L.giro) * 0.022 * lado);
      quads.push(q);
    }
  });
  // fusión position+uv (los quads no llevan color: material con map)
  let n = 0;
  for (const q of quads) n += q.attributes.position.count;
  const pos = new Float32Array(n * 3), uvs = new Float32Array(n * 2);
  let o = 0;
  for (const q of quads) {
    pos.set(q.attributes.position.array, o * 3);
    uvs.set(q.attributes.uv.array, o * 2);
    o += q.attributes.position.count;
    q.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  mesh.renderOrder = 2;
  grupo.add(mesh);
}

// ═══════════════════════════════════════════════════════════════════════════
//  LA UI — chips de estación + frase + placa del animal tocado. Sobrio, en
//  usted, mismo lenguaje que la lección del agua (leccion-agua.js).
// ═══════════════════════════════════════════════════════════════════════════
const CSS = `
#mundoAnimales { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%);
  z-index: 30; display: flex; flex-direction: column; align-items: center; gap: 8px;
  width: min(94vw, 720px); font-family: system-ui, -apple-system, sans-serif; }
#mundoAnimales .maFrase { margin: 0; text-align: center; color: #f6f2e4;
  background: rgba(26, 20, 10, 0.62); backdrop-filter: blur(3px);
  border-radius: 10px; padding: 7px 14px; font-size: 0.86rem; line-height: 1.4;
  text-shadow: 0 1px 3px rgba(0,0,0,0.6); }
#mundoAnimales .maChips { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px;
  list-style: none; margin: 0; padding: 0; }
#mundoAnimales .maChips button { border: 0; border-radius: 999px; cursor: pointer;
  padding: 6px 12px; font: 600 0.74rem/1 system-ui, sans-serif;
  color: #f0e8d4; background: rgba(26, 20, 10, 0.55); }
#mundoAnimales .maChips button[aria-pressed="true"] { background: rgba(224, 163, 65, 0.9); color: #241a08; }
#maCabecera { position: fixed; left: 14px; top: 12px; z-index: 30; max-width: min(60vw, 340px);
  color: #f6f2e4; font-family: Georgia, serif; text-shadow: 0 1px 4px rgba(0,0,0,0.65);
  pointer-events: none; }
#maCabecera .maKicker { margin: 0; font: 700 0.62rem/1.2 system-ui, sans-serif;
  letter-spacing: 0.14em; text-transform: uppercase; color: #e0c98f; }
#maCabecera h1 { margin: 0.1em 0 0; font-size: clamp(1.2rem, 3vw, 1.8rem); line-height: 1; }
#maPlaca { position: fixed; left: 50%; bottom: 96px; transform: translateX(-50%);
  z-index: 31; max-width: min(92vw, 480px); border: 0; border-radius: 12px;
  padding: 9px 16px; text-align: left; cursor: pointer;
  background: rgba(250, 243, 224, 0.94); color: #2c2012; font-family: system-ui, sans-serif;
  box-shadow: 0 6px 22px rgba(20, 12, 4, 0.4); border-left: 5px solid var(--tinte, #e0a341); }
#maPlaca strong { display: block; font-size: 0.98rem; }
#maPlaca .maMeta { display: block; font-size: 0.74rem; opacity: 0.75; margin-top: 1px; }
#maPlaca .maNota { display: block; font-size: 0.8rem; line-height: 1.35; margin-top: 5px; }
#maPlaca .maEstado { display: inline-block; margin-top: 4px; padding: 2px 8px;
  border-radius: 999px; font: 700 0.68rem/1.2 system-ui, sans-serif;
  background: rgba(217, 143, 160, 0.35); color: #7a3346; }
@media (max-width: 700px) { #mundoAnimales .maFrase { font-size: 0.78rem; } }
/* ── FICHA FLOTANTE (CSS2DObject anclada al cuerpo del animal) ─────────────────
   OJO: NUNCA poner un "transform" propio en .maFicha: el CSS2DRenderer controla
   el style.transform inline para proyectar y seguir a cámara. La animación de
   entrada va en un HIJO (.maFichaIn), no en el elemento anclado. */
#maCss2d { position: absolute; inset: 0; z-index: 29; pointer-events: none; overflow: hidden; }
#maCss2d .maFicha { pointer-events: none; }
#maCss2d .maFichaIn { pointer-events: auto; cursor: pointer; user-select: none;
  position: relative; display: block;
  min-width: 108px; max-width: 200px; text-align: left; border: 0; border-radius: 11px;
  padding: 7px 12px 8px; background: rgba(250, 243, 224, 0.96); color: #2c2012;
  font-family: system-ui, sans-serif; border-left: 5px solid var(--tinte, #e0a341);
  box-shadow: 0 6px 20px rgba(20, 12, 4, 0.4);
  animation: maFichaIn 0.22s ease both; }
#maCss2d .maFichaIn::after { content: ''; position: absolute; left: 16px; bottom: -7px;
  width: 12px; height: 12px; background: rgba(250, 243, 224, 0.96);
  transform: rotate(45deg); box-shadow: 3px 3px 8px rgba(20, 12, 4, 0.18); }
#maCss2d .maFichaIn strong { display: block; font-size: 0.94rem; line-height: 1.1; }
#maCss2d .maFichaIn .maMeta { display: block; font-size: 0.72rem; opacity: 0.75; margin-top: 1px; }
#maCss2d .maFichaIn .maNota { display: block; font-size: 0.76rem; line-height: 1.32; margin-top: 5px; }
#maCss2d .maFichaIn .maEstado { display: inline-block; margin-top: 4px; padding: 2px 8px;
  border-radius: 999px; font: 700 0.66rem/1.2 system-ui, sans-serif;
  background: rgba(217, 143, 160, 0.35); color: #7a3346; }
@keyframes maFichaIn { from { opacity: 0; transform: translateY(6px) scale(0.9); }
  to { opacity: 1; transform: translateY(0) scale(1); } }
/* en el corral los overlays del valle callan (mismo trato que la lección) */
body[data-mundo-animales] #capaLugares, body[data-mundo-animales] #guiaSel { display: none !important; }
`;

// ═══════════════════════════════════════════════════════════════════════════
//  EL MUNDO — makeMundoAnimales({ scene, camera, controls, elementos, mundos })
//  main.js solo enchufa (bloque marcado). rAF propio: cero líneas en el loop
//  del valle (patrón noche.js/minimapa.js).
// ═══════════════════════════════════════════════════════════════════════════
export function makeMundoAnimales({ scene, camera, controls, elementos, mundos }) {
  document.body.dataset.mundoAnimales = '1';

  // ── el clúster AoE y el rebaño sobredimensionado de elementos.js CEDEN el
  //    puesto (a escala de persona serían vacas de 3 m): se ocultan, no se
  //    tocan — al salir del modo todo vuelve como estaba ──
  if (elementos?.grupo) {
    const aoe = elementos.grupo.getObjectByName('elem-animales');
    if (aoe) aoe.visible = false;
    // los dos únicos InstancedMesh directos del grupo son el hato AoE
    for (const ch of elementos.grupo.children) {
      if (ch.isInstancedMesh) ch.visible = false;
    }
  }
  // el mojón de navegación del mundo también: estamos DENTRO del mundo
  const mojon = mundos?.mojones?.find((m) => m.M?.id === 'animales');
  if (mojon) {
    mojon.g.visible = false;
    if (mojon.et?.style) mojon.et.style.display = 'none';
  }

  const grupo = new THREE.Group();
  grupo.name = 'mundo-animales';
  scene.add(grupo);

  // ── LOS LUGARES (todo derivado de CX,CZ y del catálogo, nada horneado
  //    contra el paisaje: si el corral se mueve, el hub entero se mueve) ──
  const GALLI = { x: 30, z: -56 };        // parcela del traslado: ahí parquea el tractor
  const P_PAST = { x: 25.5, z: -52 };     // 1. pastoreo (la parvada AQUÍ)
  const P_DESC = { x: 35, z: -60.5 };     // 3. descanso (rebrotando)
  const COCHERA = { x: 61, z: -62.5 };
  const BARRO = { x: 57.4, z: -66.3 };
  const ESTABLO = { x: 58.5, z: -43.5 };
  const PILA = { x: 55.5, z: -37.5 };
  // la carretilla apunta AL ABONO (catalogo.js: 60,-20 — a 55 m: la lección)
  const giroAbono = Math.atan2(60 - PILA.x, -20 - PILA.z);

  // ── la obra civil, fusionada ──
  const piezas = [];
  // el corral: cerca circular de varas con la tranquera mirando a la casa
  const angCasa = Math.atan2(0 - CZ, 0 - CX); // ≈ 3π/4: la casa está al NO
  piezas.push(...cercaAnclada(CX, CZ, 9.5, 22, 1.35, 0.55, angCasa));
  // bebedero y saladero dentro del corral
  piezas.push(pintar(poner(new THREE.CylinderGeometry(0.55, 0.62, 0.4, 10), [52, height(52, -47) + 0.18, -47]), PIEDRA));
  piezas.push(pintar(poner(new THREE.CylinderGeometry(0.09, 0.09, 0.36, 8), [52.7, height(52.7, -47.2) + 0.55, -47.2]), '#e7d9c2'));
  piezas.push(cajaAnclada(46, -51.8, 1.5, 0.3, 0.55, MADERA2));
  // el aliso de sombra DENTRO del potrero (silvopastoreo: la vaca come mejor
  // bajo árbol) — ahora aliso andino ez-tree VIVO (ver alisoPotrero abajo,
  // añadido como Group aparte porque un Tree no se fusiona al batch de vértices)
  // + dos matas de botón de oro arrimadas a la cerca
  for (const [bx, bz] of [[55.2, -55.6], [40.6, -52.8]]) {
    const yB = height(bx, bz);
    piezas.push(pintar(poner(new THREE.IcosahedronGeometry(0.55, 0), [bx, yB + 0.45, bz]), '#4c7a3a'));
    for (let i = 0; i < 5; i++) {
      const aB = i * 1.26;
      piezas.push(pintar(poner(new THREE.SphereGeometry(0.06, 5, 4), [bx + Math.cos(aB) * 0.5, yB + 0.62 + Math.sin(aB * 2) * 0.14, bz + Math.sin(aB) * 0.5]), AMBAR));
    }
  }
  // LA LECHERÍA: cobertizo abierto de ordeño con sus dos cantinas y el banco
  piezas.push(...cobertizo(ESTABLO.x, ESTABLO.z, 3.4, 2.8, 2.1, TECHO));
  const yE = height(ESTABLO.x, ESTABLO.z);
  piezas.push(pintar(poner(new THREE.CylinderGeometry(0.22, 0.26, 0.72, 10), [ESTABLO.x - 0.9, yE + 0.36, ESTABLO.z + 0.7]), LAMINA));
  piezas.push(pintar(poner(new THREE.CylinderGeometry(0.22, 0.26, 0.72, 10), [ESTABLO.x - 0.35, yE + 0.36, ESTABLO.z + 0.85]), LAMINA));
  piezas.push(cajaAnclada(ESTABLO.x + 0.8, ESTABLO.z - 0.4, 0.5, 0.32, 0.3, MADERA));
  // EL CICLO CERRADO: la pila de boñiga + carretilla apuntando al abono
  const yP = height(PILA.x, PILA.z);
  piezas.push(pintar(poner(new THREE.ConeGeometry(0.85, 0.7, 7), [PILA.x, yP + 0.33, PILA.z]), '#4f3a22'));
  piezas.push(pintar(poner(new THREE.ConeGeometry(0.55, 0.2, 7), [PILA.x, yP + 0.72, PILA.z]), '#8a7a3f'));
  piezas.push(...carretilla(PILA.x + 1.4, PILA.z - 0.6, giroAbono));
  // EL GALLINERO QUE CAMINA: las tres parcelas del ciclo (verdes del arte
  // aprobado), las estacas bajas, el tractor y las flechas del turno
  // (los verdes van MÁS claros que el arte aprobado: la luz dorada + el
  // StandardMaterial los apagan un punto — medido contra captura)
  piezas.push(parcheSuelo(P_PAST.x, P_PAST.z, 4.2, '#85b84a'));
  piezas.push(parcheSuelo(GALLI.x, GALLI.z, 4.2, '#a8c25a'));
  piezas.push(parcheSuelo(P_DESC.x, P_DESC.z, 4.2, '#c2cc74'));
  for (const P of [P_PAST, GALLI, P_DESC]) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      piezas.push(posteAnclado(P.x + Math.cos(a) * 4.2, P.z + Math.sin(a) * 4.2, 0.55, 0.035));
    }
  }
  piezas.push(...tractorGallinas(GALLI.x, GALLI.z, 0.45));
  // flechas del ciclo 1→2→3: DECAL sobre el pasto (franja + punta pegadas al
  // DEM, como las parcelas — la versión de palo salía flotando en captura)
  for (const [A, B] of [[P_PAST, GALLI], [GALLI, P_DESC]]) {
    const dx = B.x - A.x, dz = B.z - A.z;
    const L2 = Math.hypot(dx, dz);
    const ux = dx / L2, uz = dz / L2;          // a lo largo
    const px = -uz, pz = ux;                    // a lo ancho
    const P3 = (x, z) => [x, height(x, z) + 0.14, z];
    const pos = [];
    // la franja: del 42% al 74% del tramo (no invade las parcelas)
    const t0 = 0.42, t1 = 0.74, wF = 0.26;
    const A0 = [A.x + dx * t0, A.z + dz * t0], A1 = [A.x + dx * t1, A.z + dz * t1];
    const q = [
      P3(A0[0] + px * wF, A0[1] + pz * wF), P3(A0[0] - px * wF, A0[1] - pz * wF),
      P3(A1[0] - px * wF, A1[1] - pz * wF), P3(A1[0] + px * wF, A1[1] + pz * wF),
    ];
    pos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
    // la punta: triángulo ancho cerrando en el 90% del tramo
    const tb = t1 + 0.02, wP = 0.62;
    const Bp = [A.x + dx * 0.9, A.z + dz * 0.9], Bb = [A.x + dx * tb, A.z + dz * tb];
    pos.push(
      ...P3(Bb[0] + px * wP, Bb[1] + pz * wP),
      ...P3(Bb[0] - px * wP, Bb[1] - pz * wP),
      ...P3(Bp[0], Bp[1]),
    );
    const gF = new THREE.BufferGeometry();
    gF.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    piezas.push(pintar(gF, AMBAR));
  }
  // LOS CERDOS: la cochera con su comedero y el revolcadero de barro
  piezas.push(...cobertizo(COCHERA.x, COCHERA.z, 2.6, 2.2, 1.35, '#7d452c'));
  piezas.push(cajaAnclada(COCHERA.x - 0.4, COCHERA.z + 1.4, 1.1, 0.28, 0.45, MADERA2));
  // el barro va CLARO (rojizo de arcilla) para que Petra y los lechones zungos
  // —oscuros— no se fundan con él: contraste, no camuflaje
  piezas.push(parcheSuelo(BARRO.x, BARRO.z, 2.7, '#7d5c3c', 0.12));
  piezas.push(parcheSuelo(BARRO.x - 0.3, BARRO.z - 0.2, 1.3, '#5c422c', 0.16)); // el charco hondo

  // ── el hato ──
  const animales = normalizarHato(HATO);
  const { vivos, clicables } = armarHato(grupo, animales);
  armarSombras(grupo, animales);
  const garcita = armarGarcita(grupo, animales);
  const prenadas = armarPrenadas(grupo, animales);
  const motas = armarMotas(grupo, ESTABLO.x, ESTABLO.z + 1.2);

  // ── los carteles: vacas, cerdos adultos y el gallo llevan tablita (la
  //    parvada entera con letrero sería una feria: sus nombres viven en la
  //    placa del toque). El del abono señala el ciclo. ──
  const cartelDe = (nombre, giro, dx, dz) => {
    const a = animales.find((q) => q.nombre === nombre);
    return { texto: a.nombre, x: a.x + dx, z: a.z + dz, giro, color: a.colorCss };
  };
  armarCarteles(grupo, piezas, [
    cartelDe('La Mona', 2.4, -0.5, 0.85),
    cartelDe('Lucero', -1.1, 0.8, -0.55),
    cartelDe('Esperanza', 2.9, -0.75, -0.5),
    cartelDe('Canela', -2.3, 0.65, -0.6),
    cartelDe('Petra', 0.9, -0.7, 0.6),
    cartelDe('Pacho', -2.0, 0.75, 0.55),
    cartelDe('Aurelio', -0.5, -0.65, -0.5),
    { texto: 'el abono →', x: PILA.x + 0.9, z: PILA.z + 1.1, giro: giroAbono + Math.PI / 2, color: null },
  ]);

  // la obra civil entera: UN mesh
  const civil = new THREE.Mesh(
    fusion(piezas, 'corral'),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, side: THREE.DoubleSide }),
  );
  civil.name = 'animales-civil';
  grupo.add(civil);

  // EL ALISO DE SOMBRA del potrero (silvopastoreo) — aliso andino ez-tree VIVO
  // en vez del domo icosaedro. Group aparte (un Tree no entra al batch de
  // vértices), escalado a ~7 m con la disciplina Box3.
  {
    const alisoPotrero = crearHeroe('aliso_andino');
    const box = new THREE.Box3().setFromObject(alisoPotrero);
    const alturaNatural = Math.max(0.001, box.max.y - box.min.y);
    alisoPotrero.scale.setScalar(7 / alturaNatural);
    alisoPotrero.rotation.y = Math.random() * Math.PI * 2;
    alisoPotrero.position.set(42.6, height(42.6, -44.2) - 0.2, -44.2);
    alisoPotrero.name = 'animales-aliso-potrero';
    grupo.add(alisoPotrero);
  }

  // ── LAS ESTACIONES — cámara + mirada + frase, todas derivadas de height()
  //    (`&est=<id>` planta una: el gate captura cuadros deterministas) ──
  const V = (x, z, dy) => new THREE.Vector3(x, height(x, z) + dy, z);
  const EST = [
    {
      id: 'corral', titulo: 'El corral',
      frase: 'El corral de la finca: cada animal tiene su nombre y su historia. Tóquelos — quien conoce su hato por el nombre, lo cuida mejor.',
      // desde el nor-nororiente, alto (⛔ NO correr la cámara al oriente: el
      // biodigestor AoE del mundo del abono —tubo de 16 u a escala ×3— vive
      // en (55,-34) y desde allá come el cuadro entero, verificado en captura)
      pos: () => V(41, -30.5, 7.5),
      mira: () => V(49.5, -52, 1.2),
    },
    {
      id: 'gallinero', titulo: 'El gallinero',
      frase: 'El gallinero que camina: el refugio se corre de parcela, las gallinas abonan y desplagan la del turno mientras las otras descansan y rebrotan.',
      pos: () => V(21, -47, 2.8),
      mira: () => V(29.5, -55.2, 0.7),
    },
    {
      id: 'vacas', titulo: 'Las vacas',
      frase: 'Lechería de altura: Normando, Holstein y la BON criolla pastan con árbol y agua. Y la boñiga no se bota — a 55 metros se vuelve biol para las matas.',
      pos: () => V(57, -59, 2.4),
      mira: () => V(49, -46, 1.2),
    },
    {
      id: 'cerdos', titulo: 'Los cerdos',
      frase: 'Cerdos criollos: Pacho es San Pedreño, de oreja parada. Y el revolcadero no es mugre — es como se refrescan y se quitan los parásitos de encima.',
      // desde el sursureste (encuadre PROBADO con sonda acam): el revolcadero
      // con Petra y los lechones al centro, la cochera al costado — desde el
      // nororiente la cochera oclúia el barro, y de cerca el techo comía todo
      pos: () => V(63.5, -70, 2.8),
      mira: () => V(58, -64.8, 0.5),
    },
  ];

  // ── la UI ──
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const cab = document.createElement('header');
  cab.id = 'maCabecera';
  cab.innerHTML = '<p class="maKicker">El corral de Guatoc</p><h1>🐔 Los animales</h1>';
  document.body.appendChild(cab);
  const ui = document.createElement('div');
  ui.id = 'mundoAnimales';
  ui.innerHTML = '<ul class="maChips"></ul><p class="maFrase"></p>';
  document.body.appendChild(ui);
  const lista = ui.querySelector('.maChips');
  const botones = [];
  const st = { idx: 0, pedida: null, vuelo: null, mira: new THREE.Vector3() };
  EST.forEach((e, i) => {
    const li = document.createElement('li');
    const bt = document.createElement('button');
    bt.type = 'button';
    bt.textContent = e.titulo;
    bt.addEventListener('click', () => { st.pedida = i; });
    li.appendChild(bt);
    lista.appendChild(li);
    botones.push(bt);
  });
  function frase(i) {
    ui.querySelector('.maFrase').textContent = EST[i].frase;
    botones.forEach((b, j) => b.setAttribute('aria-pressed', j === i ? 'true' : 'false'));
  }

  // ── LA FICHA FLOTANTE (CSS2DRenderer de lib3d): un renderer HTML paralelo al
  //    WebGL, montado encima del canvas con pointer-events:none. La ficha se
  //    ancla a un Object3D world-space sobre el cuerpo del animal, así SIGUE al
  //    bicho y respeta la profundidad sin proyección manual. ──
  const css2dRenderer = new CSS2DRenderer();
  css2dRenderer.setSize(innerWidth, innerHeight);
  css2dRenderer.domElement.id = 'maCss2d';
  document.body.appendChild(css2dRenderer.domElement);
  addEventListener('resize', () => css2dRenderer.setSize(innerWidth, innerHeight));

  // ── EL TOQUE: raycast al hato → ficha con nombre + raza + nota (la hoja de
  //    vida del animal, en chiquito), anclada a su lomo. Umbral de arrastre:
  //    orbitar no toca. ──
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let fichaObj = null;             // el CSS2DObject actualmente abierto
  let downXY = null;
  function cerrarPlaca() {
    if (fichaObj) { fichaObj.parent?.remove(fichaObj); fichaObj = null; }
  }
  function abrirPlaca(a) {
    cerrarPlaca();
    // outer = elemento anclado (SIN transform propio, lo maneja CSS2DRenderer);
    // inner = la tarjeta visible con su animación de entrada.
    const el = document.createElement('div');
    el.className = 'maFicha';
    const card = document.createElement('div');
    card.className = 'maFichaIn';
    card.style.setProperty('--tinte', a.colorCss);
    const meta = [a.raza, a.tamano].filter(Boolean).join(' · ');
    card.innerHTML = `<strong>${a.nombre}</strong><span class="maMeta">${meta}</span>`
      + (a.nota ? `<span class="maNota">${a.nota}</span>` : '')
      + (a.estado.startsWith('pre') ? '<span class="maEstado">Preñada</span>' : '');
    card.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
    card.addEventListener('click', cerrarPlaca);
    el.appendChild(card);
    fichaObj = new CSS2DObject(el);
    // anclar sobre el lomo: pos del animal + alto de la especie por su escala
    const alto = (ESPECIES[a.especie]?.alto ?? 0.5) * (a.escala ?? 1);
    fichaObj.position.set(a.pos[0], a.pos[1] + alto + 0.35, a.pos[2]);
    fichaObj.center.set(0.14, 1);   // la punta del bocadillo apunta al animal
    scene.add(fichaObj);
  }
  const onDown = (ev) => { downXY = [ev.clientX, ev.clientY]; };
  const onUp = (ev) => {
    if (!downXY || Math.hypot(ev.clientX - downXY[0], ev.clientY - downXY[1]) > 6) return;
    ndc.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(clicables, false)[0];
    if (hit && hit.object.userData.animales) {
      const a = hit.object.userData.animales[hit.instanceId];
      if (a) { abrirPlaca(a); return; }
    }
    cerrarPlaca();
  };
  addEventListener('pointerdown', onDown);
  addEventListener('pointerup', onUp);

  // ── el rAF propio (patrón noche/minimapa: ni una línea en el loop del valle) ──
  const VUELO_S = 2.6;
  let activa = true;
  function tick() {
    if (!activa) return;
    const t = performance.now() / 1000;
    if (st.pedida !== null) {
      st.idx = st.pedida;
      st.pedida = null;
      if (controls.enabled) st.mira.copy(controls.target);
      st.vuelo = { p0: camera.position.clone(), p1: EST[st.idx].pos(), m0: st.mira.clone(), m1: EST[st.idx].mira(), t0: t };
      controls.enabled = false;
      frase(st.idx);
      cerrarPlaca();
    }
    if (st.vuelo) {
      const k = Math.min((t - st.vuelo.t0) / VUELO_S, 1);
      const e = k * k * k * (k * (k * 6 - 15) + 10);
      camera.position.lerpVectors(st.vuelo.p0, st.vuelo.p1, e);
      st.mira.lerpVectors(st.vuelo.m0, st.vuelo.m1, e);
      camera.lookAt(st.mira);
      if (k >= 1) {
        controls.target.copy(st.mira);
        controls.enabled = true;
        controls.update();
        st.vuelo = null;
      }
    }
    animarHato(vivos, t);
    if (garcita) {
      const g = Math.sin(t * 0.31 + 1.2);
      garcita.cabeza.rotation.y = Math.sign(g) * suave01(Math.abs(g) * 1.7 - 0.7) * 0.8;
      garcita.cabeza.position.y = 0.055 + Math.max(0, Math.sin(t * 0.9)) * 0.008;
    }
    if (prenadas) prenadas.posar(t);
    motas.posar(t);
    css2dRenderer.render(scene, camera);   // la ficha flotante sigue a cámara
    requestAnimationFrame(tick);
  }

  return {
    activa: () => activa,
    arrancar() {
      // el corral pide acercarse: el tope de órbita del valle (25 u) queda
      // corto a escala de persona
      controls.minDistance = 4;
      // ── sonda del gate: `&acam=x,z,dy&amira=x,z,dy` planta una cámara libre
      //    (dy sobre height del punto) — para MEDIR encuadres, no para el uso ──
      const qs = new URLSearchParams(location.search);
      const acam = (qs.get('acam') || '').split(',').map(Number);
      const amira = (qs.get('amira') || '').split(',').map(Number);
      if (acam.length === 3 && amira.length === 3 && acam.every(Number.isFinite) && amira.every(Number.isFinite)) {
        camera.position.copy(V(acam[0], acam[1], acam[2]));
        st.mira.copy(V(amira[0], amira[1], amira[2]));
        camera.lookAt(st.mira);
        controls.target.copy(st.mira);
        controls.enabled = false;
        frase(0);
        requestAnimationFrame(tick);
        return;
      }
      const pedida = new URLSearchParams(location.search).get('est');
      const i0 = Math.max(0, EST.findIndex((e) => e.id === pedida));
      st.idx = i0;
      const e = EST[i0];
      camera.position.copy(e.pos());
      st.mira.copy(e.mira());
      camera.lookAt(st.mira);
      controls.target.copy(st.mira);
      controls.enabled = false;
      frase(i0);
      setTimeout(() => { if (!st.vuelo) { controls.enabled = true; controls.update(); } }, 900);
      // sonda del gate: `&ficha=<nombre>` abre la ficha flotante de ese animal
      // (para capturar el CSS2DObject de forma determinista, sin tap manual)
      const fichaPedida = new URLSearchParams(location.search).get('ficha');
      if (fichaPedida) {
        const a = animales.find((q) => q.nombre.toLowerCase() === fichaPedida.toLowerCase());
        if (a) setTimeout(() => abrirPlaca(a), 300);
      }
      requestAnimationFrame(tick);
    },
  };
}
