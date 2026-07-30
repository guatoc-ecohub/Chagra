/*
 * CorralVivo — el corral como ESPEJO del dato (auditoría FASE 1 §5a+§5c).
 *
 * El hato REAL de la finca se dibuja desde `params.animales`:
 *
 *   [{ especie, nombre, raza, tamano: 'pequeño'|'mediano'|'grande',
 *      estado: 'sano'|'preñada'|'vendido'|'nace'|'muerte' }]
 *
 * Un cambio de estado es un MOMENTO (audit §5a.4), no un salto: `nace` hace
 * APARECER una cría (crece con un brillo cálido), `muerte` la RETIRA con respeto
 * (se apaga suave y deja una piedrita con flor — sin dramatizar) y `vendido`
 * la manda al MERCADO (el mismo dato vive en dos mundos: aquí queda su huella,
 * allá llega caminando). Esos tres los dibuja AnimalMomento; el resto, el hato
 * instanciado. Todo gateado por reduced-motion + device-tier.
 *
 * y cada animal se ve como ES: la especie da la silueta, el TAMAÑO da la
 * escala (3 cerdos pequeños + 4 medianos + 5 grandes se distinguen a golpe de
 * vista), la RAZA da el pelaje (color por instancia), y el ESTADO se ve sin
 * leer: la preñada lleva una señal rosada sobre el lomo, el vendido queda como
 * huella translúcida (el dato persiste, el animal ya no está).
 *
 * ── LA PASADA "MUNDO ABIERTO" (peso real, no figuras de plástico) ──────────
 *
 * 1. ESQUELETO (FK sobre matrices): cada especie declara HUESOS con pivote y
 *    padre (raíz → cuello → cabeza → orejas; cola aparte). Los gestos rotan el
 *    hueso EN SU PIVOTE y la cadena hereda: la vaca baja la cabeza a pastar
 *    con las patas plantadas, la gallina picotea con el CUELLO (no cabeceando
 *    el cuerpo entero desde el piso), la cola espanta moscas con latigazos
 *    esporádicos, las orejas dan su flick. Huesos reales, piel dibujada.
 * 2. PELAJE (parchePelaje sobre Lambert): sombreado SUAVE (no facetado), con
 *    countershading (lomo besado por el sol, panza en sombra fría) y un RIM
 *    dorado de hora dorada en el contorno — el volumen deja de ser "cápsula
 *    plástica" y se vuelve cuerpo a contraluz. Cero luces extra, cero uniforms:
 *    el parche vive en el material y sirve igual instanciado o suelto.
 * 3. ANATOMÍA: masas de hombro y grupa, cuello que une la cabeza al cuerpo,
 *    papada, giba del cebú (`soloRaza`), manchas de pelaje (`tinte` sobre el
 *    color de la raza), ojos, orejas caídas (y RECTAS donde la raza lo pide:
 *    San Pedreño/pietrain via `rotRecta`), borla de cola, pezuñas oscuras.
 * 4. PESO EN EL PISO: SombrasHato — UNA InstancedMesh de sombras de contacto
 *    (el mismo truco claymation de SombraContacto, instanciado) alargadas por
 *    la hora dorada. El fantasma del vendido NO proyecta sombra: es memoria.
 * 5. MUNDO VIVO: la garcita bueyera parada en el lomo de la vaca grande y unas
 *    motas de polvo dorado flotando en la luz (solo tier alto, gateadas).
 *
 * CÓMO se dibuja (escala a N, DR §6 frugal):
 *   · InstancedMesh POR ESPECIE: cada especie es una tabla de PARTES (primitivas
 *     orgánicas, nunca cajas) y cada parte es UN InstancedMesh con N instancias.
 *     Los draw calls son constantes por especie, no crecen con el hato.
 *   · Culling/LOD gama baja: `computeBoundingSphere()` tras posar matrices
 *     (frustum culling correcto) y en tier 'bajo' las partes `fina` (crestas,
 *     picos, orejas, colas) no se montan — queda la silueta legible.
 *   · El idle esquelético reescribe SOLO las matrices de las partes `cuerpo`
 *     (las patas quedan plantadas), gateado por reduced-motion Y device-tier
 *     ('bajo' no anima). Las matrices de hueso se cachean por frame (FK una
 *     vez por animal-hueso, no por parte).
 *
 * El NOMBRE (visión núcleo del operador: "mis animales tienen nombre"):
 *   · Un cartel de madera CLAVADO junto a cada animal con nombre — estaca +
 *     tabla artesanal con `<Text>` de drei (fuente default, trazo a mano por
 *     la tablita torcida), legible por ambas caras.
 *   · Anti-colisión en pantalla (mismo patrón de RotulosLugares del valle):
 *     el cartel más apuntado —o el del animal tocado— muestra su tabla PLENA;
 *     los demás se calman a estaca-con-perilla del color del pelaje; quien pisa
 *     un espacio tomado, cede. Imperativo sobre `visible` (cero re-render).
 *   · Al TOCAR (animal o cartel): placa flotante con nombre + raza + tamaño
 *     (+ estado), el mismo lenguaje de píldora de los hotspots.
 */
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import { PALETA } from '../atmosferaMadre.js';
import AnimalMomento from './AnimalMomento.jsx';

/* ── La escala del TAMAÑO declarado: clases discretas, no continuo (el dato
      del cuaderno dice "pequeño/mediano/grande", el corral lo espeja). ── */
const TAMANOS = { 'pequeño': 0.55, pequeno: 0.55, mediano: 0.8, grande: 1.05 };

/* Pelajes por RAZA conocida de finca andina; una raza no listada cae a una
   paleta de pelajes estable (hash del nombre de la raza — determinista). */
const COLOR_RAZA = {
  zungo: '#4a3a35',
  'sanpedreño': '#6b4a3c',
  sanpedreno: '#6b4a3c',
  // Casco de Mula (criolla AGROSAVIA): capa rojiza-amarillenta, NO negra.
  'casco de mula': '#a8683a',
  cascodemula: '#a8683a',
  duroc: '#a55636',
  landrace: '#e3b6a4',
  normando: '#c9a06a',
  'cebú': '#d9d2c4',
  cebu: '#d9d2c4',
  campesina: '#b5622f',
  ponedora: '#d8b58a',
  criolla: '#efe7d8',
  criollo: '#c98a6a',
};
const PELAJES = ['#c9a06a', '#e7d9c2', '#8a6a55', '#d8b58a', '#efe7d8', '#a55636'];

/* Razas de OREJA RECTA verificadas (San Pedreño: "orejas rectas y medianas",
   Agrosavia/SciELO; pietrain también las lleva paradas). El resto de cerdos
   del corral quedan con la oreja caída criolla de siempre. */
const OREJA_RECTA = new Set(['sanpedreño', 'sanpedreno', 'pietrain']);

/* Tonos fijos de anatomía compartidos (hocico, pezuña, cara de oveja…). */
const TONO = {
  hocico: '#e8d3bf',
  rosado: '#d99a8a',
  pezuna: '#2e2018',
  cuerno: '#d9cbb0',
  caraOveja: '#4a3c30',
  cresta: '#c85a44',
  pico: '#e0a63a',
  borla: '#3a2a20',
};

/*
 * EL PELAJE — parche de shader sobre MeshLambert (per-fragment en three moderno).
 * Tres jugadas, cero uniforms (dirección de arte como constantes, una sola
 * compilación para todo el hato):
 *   · countershading: lo que mira ARRIBA se entibia (sol dorado), lo que mira
 *     ABAJO se enfría y oscurece (rebote de tierra en sombra) → volumen.
 *   · rim de hora dorada: fresnel cálido en el contorno — el contraluz del
 *     atardecer sobre el pelo. Más fuerte arriba (de donde viene el sol).
 *   · funciona igual en InstancedMesh (hato) y meshes sueltas (AnimalMomento):
 *     la normal se lleva a mundo pasando por instanceMatrix si existe.
 */
// eslint-disable-next-line react-refresh/only-export-components -- parche de material compartido con AnimalMomento (misma piel en hato y momentos)
export function parchePelaje(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying float vArribaPel;')
    .replace(
      '#include <defaultnormal_vertex>',
      `#include <defaultnormal_vertex>
	vec3 nPel = objectNormal;
	#ifdef USE_INSTANCING
		nPel = ( instanceMatrix * vec4( nPel, 0.0 ) ).xyz;
	#endif
	vArribaPel = normalize( ( modelMatrix * vec4( nPel, 0.0 ) ).xyz ).y;`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vArribaPel;')
    .replace(
      '#include <opaque_fragment>',
      `float arribaPel = smoothstep( -0.85, 0.9, vArribaPel );
	float rimPel = pow( 1.0 - clamp( dot( normalize( normal ), normalize( vViewPosition ) ), 0.0, 1.0 ), 2.2 );
	outgoingLight *= mix( vec3( 0.46, 0.43, 0.47 ), vec3( 1.22, 1.12, 0.98 ), arribaPel );
	outgoingLight += vec3( 1.0, 0.83, 0.55 ) * rimPel * ( 0.16 + 0.62 * arribaPel );
	#include <opaque_fragment>`,
    );
}

/*
 * Cada ESPECIE = altura de referencia + ESQUELETO (huesos con pivote/padre/
 * gesto) + tabla de PARTES.
 * Hueso:  { padre?, pivote: [x,y,z], gesto, fase? } — `raiz` siempre existe.
 * Parte:  { geo, pos, rot?, rotRecta? (variante oreja parada), escala?,
 *          color? | porRaza, tinte? (multiplica el pelaje: manchas), hueso?
 *          (a qué hueso va pegada; sin hueso = raíz), cuerpo? (se reanima por
 *          frame), fina? (LOD: fuera en gama baja), vientre? (la preñez la
 *          ensancha), respira? (late con el aliento), soloRaza? (solo esas
 *          razas la llevan: la giba del cebú), pata? (índice para el ciclo de
 *          marcha de AnimalMomento) }.
 * Todas las especies miran a +x. Siluetas: los animales low-poly validados del
 * recinto, con la pasada de anatomía de mundo abierto (masas, cuello, ojos).
 */
// eslint-disable-next-line react-refresh/only-export-components -- tabla de datos compartida con EscenaRecinto/EscenaMercado/AnimalMomento (export pre-existente)
export const ESPECIES = {
  gallina: {
    alto: 0.5,
    sombra: 0.24,
    huesos: {
      raiz: { pivote: [0, 0.22, 0], gesto: 'peso' },
      cuello: { padre: 'raiz', pivote: [0.11, 0.26, 0], gesto: 'picotea' },
      cabeza: { padre: 'cuello', pivote: [0.175, 0.36, 0], gesto: 'mira' },
      cola: { padre: 'raiz', pivote: [-0.16, 0.28, 0], gesto: 'colaPluma' },
    },
    partes: [
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
    ],
  },
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
      // el barril del cuerpo + masas de hombro y grupa (la grupa un pelo más
      // alta: la estampa del ganado de verdad, no un tubo con patas)
      { geo: ['capsula', [0.23, 0.4, 6, 12]], pos: [0, 0.48, 0], rot: [0, 0, Math.PI / 2], porRaza: true, cuerpo: true, vientre: true, respira: true },
      { geo: ['esfera', [0.2, 14, 10]], pos: [0.25, 0.5, 0], escala: [1.05, 1.08, 0.96], porRaza: true, cuerpo: true },
      { geo: ['esfera', [0.205, 14, 10]], pos: [-0.25, 0.52, 0], escala: [1.05, 1.02, 0.98], porRaza: true, cuerpo: true },
      // manchas de pelaje (tinte sobre el color de la raza), asimétricas
      { geo: ['esfera', [0.14, 10, 8]], pos: [0.07, 0.52, 0.175], escala: [1.3, 0.9, 0.45], porRaza: true, tinte: 0.62, cuerpo: true, fina: true },
      { geo: ['esfera', [0.13, 10, 8]], pos: [-0.13, 0.47, -0.175], escala: [1.25, 0.95, 0.45], porRaza: true, tinte: 0.68, cuerpo: true, fina: true },
      // la giba del cebú (solo esa raza la lleva)
      { geo: ['esfera', [0.11, 12, 9]], pos: [0.16, 0.7, 0], escala: [1.15, 0.95, 0.85], porRaza: true, soloRaza: ['cebú', 'cebu'], cuerpo: true },
      // cuello que UNE (la cabeza ya no flota) + papada
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
      // patas del color del pelaje + pezuñas oscuras (plantadas: sin `cuerpo`)
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
  oveja: {
    alto: 0.62,
    sombra: 0.36,
    huesos: {
      raiz: { pivote: [0, 0.37, 0], gesto: 'peso' },
      cabeza: { padre: 'raiz', pivote: [0.27, 0.42, 0], gesto: 'pasta' },
      orejaI: { padre: 'cabeza', pivote: [0.315, 0.462, 0.088], gesto: 'flick' },
      orejaD: { padre: 'cabeza', pivote: [0.315, 0.462, -0.088], gesto: 'flick', fase: 1.4 },
      cola: { padre: 'raiz', pivote: [-0.33, 0.4, 0], gesto: 'colaCorta' },
    },
    partes: [
      // el vellón por LOMOS (tres masas): silueta de lana, no icosaedro suelto
      { geo: ['icosaedro', [0.24, 1]], pos: [0, 0.37, 0], escala: [1.3, 1.02, 1.06], porRaza: true, cuerpo: true, vientre: true, respira: true },
      { geo: ['icosaedro', [0.15, 1]], pos: [-0.2, 0.42, 0], porRaza: true, cuerpo: true, fina: true },
      { geo: ['icosaedro', [0.135, 1]], pos: [0.19, 0.35, 0], porRaza: true, cuerpo: true, fina: true },
      // cara oscura con copete de lana, ojos ámbar, orejas de lado
      { geo: ['esfera', [0.095, 12, 9]], pos: [0.34, 0.43, 0], escala: [1.25, 1, 0.85], color: TONO.caraOveja, hueso: 'cabeza', cuerpo: true },
      { geo: ['esfera', [0.062, 8, 6]], pos: [0.315, 0.505, 0], porRaza: true, hueso: 'cabeza', cuerpo: true, fina: true },
      { geo: ['esfera', [0.016, 6, 5]], pos: [0.375, 0.462, 0.06], color: '#d8b06a', hueso: 'cabeza', cuerpo: true, fina: true },
      { geo: ['esfera', [0.016, 6, 5]], pos: [0.375, 0.462, -0.06], color: '#d8b06a', hueso: 'cabeza', cuerpo: true, fina: true },
      { geo: ['cono', [0.026, 0.09, 5]], pos: [0.315, 0.462, 0.088], rot: [1.65, 0, 0], color: TONO.caraOveja, hueso: 'orejaI', cuerpo: true, fina: true },
      { geo: ['cono', [0.026, 0.09, 5]], pos: [0.315, 0.462, -0.088], rot: [-1.65, 0, 0], color: TONO.caraOveja, hueso: 'orejaD', cuerpo: true, fina: true },
      { geo: ['esfera', [0.05, 8, 6]], pos: [-0.335, 0.4, 0], porRaza: true, hueso: 'cola', cuerpo: true, fina: true },
      { geo: ['cilindro', [0.026, 0.023, 0.26, 6]], pos: [0.16, 0.13, 0.09], color: TONO.caraOveja, pata: 0 },
      { geo: ['cilindro', [0.026, 0.023, 0.26, 6]], pos: [0.16, 0.13, -0.09], color: TONO.caraOveja, pata: 1 },
      { geo: ['cilindro', [0.026, 0.023, 0.26, 6]], pos: [-0.16, 0.13, 0.09], color: TONO.caraOveja, pata: 2 },
      { geo: ['cilindro', [0.026, 0.023, 0.26, 6]], pos: [-0.16, 0.13, -0.09], color: TONO.caraOveja, pata: 3 },
    ],
  },
  /* El cerdo criollo: rechoncho de verdad — jamón y paletilla como masas,
     orejas volcadas sobre los ojos (o RECTAS: San Pedreño/pietrain via
     rotRecta), cola en tirabuzón, mancha de barro. */
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
  /* Fallback esquemático (retrocompat): una especie desconocida se dibuja como
     el Animalito de siempre — cuerpo + cabeza + ojos, nunca una caja huérfana. */
  animal: {
    alto: 0.6,
    sombra: 0.32,
    huesos: {
      raiz: { pivote: [0, 0.3, 0], gesto: 'peso' },
      cabeza: { padre: 'raiz', pivote: [0.18, 0.4, 0], gesto: 'mira' },
    },
    partes: [
      { geo: ['capsula', [0.18, 0.34, 6, 10]], pos: [0, 0.28, 0], porRaza: true, cuerpo: true, vientre: true, respira: true },
      { geo: ['esfera', [0.14, 12, 9]], pos: [0.24, 0.42, 0], porRaza: true, hueso: 'cabeza', cuerpo: true },
      { geo: ['esfera', [0.018, 6, 5]], pos: [0.31, 0.47, 0.07], color: '#241a10', hueso: 'cabeza', cuerpo: true, fina: true },
      { geo: ['esfera', [0.018, 6, 5]], pos: [0.31, 0.47, -0.07], color: '#241a10', hueso: 'cabeza', cuerpo: true, fina: true },
    ],
  },
};

export function GeometriaParte({ geo }) {
  const [tipo, args] = geo;
  if (tipo === 'esfera') return <sphereGeometry args={args} />;
  if (tipo === 'capsula') return <capsuleGeometry args={args} />;
  if (tipo === 'cono') return <coneGeometry args={args} />;
  if (tipo === 'cilindro') return <cylinderGeometry args={args} />;
  if (tipo === 'toro') return <torusGeometry args={args} />;
  return <icosahedronGeometry args={args} />;
}

/* La matriz LOCAL de una parte, compuesta una sola vez y cacheada en la tabla.
   Una parte con `rotRecta` (orejas) tiene DOS variantes cacheadas: la caída de
   siempre y la recta de las razas de oreja parada (San Pedreño, pietrain). */
const _euler = new THREE.Euler();
function matrizParte(parte, recta = false) {
  const usaRecta = recta && parte.rotRecta;
  const clave = usaRecta ? '_mRecta' : '_m';
  if (!parte[clave]) {
    const esc = /** @type {[number, number, number]} */ (Array.isArray(parte.escala) ? parte.escala : [1, 1, 1]);
    const pPos = /** @type {[number, number, number]} */ (parte.pos || [0, 0, 0]);
    const pRot = /** @type {[number, number, number]} */ ((usaRecta ? parte.rotRecta : parte.rot) || [0, 0, 0]);
    parte[clave] = new THREE.Matrix4().compose(
      new THREE.Vector3(...pPos),
      new THREE.Quaternion().setFromEuler(_euler.set(...pRot)),
      new THREE.Vector3(...esc),
    );
  }
  return parte[clave];
}

function colorDe(a, i) {
  if (a.color) return a.color;
  const raza = (a.raza || '').toLowerCase().trim();
  if (COLOR_RAZA[raza]) return COLOR_RAZA[raza];
  if (!raza) return PELAJES[i % PELAJES.length];
  let h = 0;
  for (const ch of raza) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return PELAJES[h % PELAJES.length];
}

/*
 * Normaliza `params.animales` a la forma interna. Acepta la interfaz NUEVA
 * ({especie, nombre, raza, tamano, estado}) y la VIEJA ({tipo, color, pos})
 * sin romper datos existentes. Sin `pos`, los sitios salen de una espiral
 * áurea determinista dentro de la cerca (aire entre animales, sin montoneras).
 */
const ORO = 2.39996323; // ángulo áureo: la espiral del girasol
const EJE_Y = new THREE.Vector3(0, 1, 0);
// eslint-disable-next-line react-refresh/only-export-components -- normalizador compartido entre mundos (export pre-existente)
export function normalizarAnimales(lista) {
  const n = Math.max(lista.length, 1);
  return lista.map((a, i) => {
    const clave = a.especie || a.tipo;
    const especie = ESPECIES[clave] ? clave : 'animal';
    const escala = TAMANOS[(a.tamano || 'mediano').toLowerCase()] ?? TAMANOS.mediano;
    const angulo = i * ORO + 0.9;
    const radio = 0.78 + 0.72 * Math.sqrt((i + 0.5) / n);
    const pos = a.pos || [Math.cos(angulo) * radio, 0, Math.sin(angulo) * radio];
    // rumbo pseudo-aleatorio pero DETERMINISTA (mismo hato, mismo corral)
    const rumbo = a.pos ? 0 : (Math.sin((i + 1) * 12.9898) * 43758.5453) % (Math.PI * 2);
    const estado = (a.estado || 'sano').toLowerCase();
    // El MOMENTO (audit §5a.4): un cambio de estado no es un salto brusco sino un
    // instante memorable que se ANIMA. `nace` (aparece una cría), `muerte` (se
    // retira con respeto) y `vendido` (viaja al mercado — mismo dato, dos mundos)
    // se sacan del hato instanciado y los dibuja AnimalMomento uno por uno.
    const momento =
      estado === 'nace' ? 'nace' : estado === 'muerte' ? 'muerte' : estado === 'vendido' ? 'vendido' : null;
    const color = new THREE.Color(colorDe(a, i));
    return {
      id: `${i}-${a.nombre || especie}`,
      especie,
      nombre: a.nombre || '',
      raza: a.raza || '',
      orejaRecta: OREJA_RECTA.has((a.raza || '').toLowerCase().trim()),
      tamano: a.tamano || 'mediano',
      estado,
      momento,
      escala,
      pos,
      rumbo,
      fase: i * 1.7,
      vientre: estado.startsWith('pre') ? 1.18 : 1,
      color,
      colorCss: `#${color.getHexString()}`,
      mat: new THREE.Matrix4().compose(
        new THREE.Vector3(...pos),
        new THREE.Quaternion().setFromAxisAngle(EJE_Y, rumbo),
        new THREE.Vector3(escala, escala, escala),
      ),
    };
  });
}

/* ── La POSE del corral (NO exportada: solo el hato del corral; el mercado
   posa sus vendidos aparte en AnimalMomento) ────────────────────────────────
   El rumbo pseudo-aleatorio de normalizarAnimales es honesto pero CIEGO a la
   cámara: a un animal le puede tocar quedar exactamente de espaldas al encuadre
   de entrada y su silueta muere (QA visual 2026-07-30: Camilo, el cebú vendido,
   leía "medio piedra" de espaldas — un lomo translúcido sin cabeza ni patas
   visibles). Aquí cada animal se orienta TANGENTE al anillo del ciclo — el hato
   CAMINA el anillo del abono, que es la tesis del mundo — con un jitter
   determinista por animal (vida, no formación). En tangente, desde cualquier
   borde del corral el animal queda de perfil o tres cuartos: la silueta
   (cabeza, lomo, patas) siempre lee. Muta los objetos frescos que devuelve
   normalizarAnimales; la función compartida no cambia. */
const _posV = new THREE.Vector3();
const _posQ = new THREE.Quaternion();
const _posE = new THREE.Vector3();
function posarHatoCorral(animales) {
  for (const a of animales) {
    const angulo = Math.atan2(a.pos[2], a.pos[0]);
    const jitter = Math.sin(a.fase * 7.3) * 0.35;
    const rumbo = -(angulo + Math.PI / 2) + jitter;
    a.rumbo = rumbo; // la garcita (y quien monte algo sobre el lomo) lo hereda
    a.mat.compose(
      _posV.set(a.pos[0], a.pos[1], a.pos[2]),
      _posQ.setFromAxisAngle(EJE_Y, rumbo),
      _posE.set(a.escala, a.escala, a.escala),
    );
  }
  return animales;
}

/* suavizado con clamp (el smoothstep de toda la vida, en JS) */
const suave01 = (x) => {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
};

/*
 * EL GESTO DE UN HUESO como rotación local (se aplica EN EL PIVOTE del hueso).
 * Peso real = amplitudes chicas, ritmos lentos con HOLDS (pastar sostiene la
 * cabeza abajo, la cola da latigazos esporádicos, la oreja da un flick raro):
 * vida de potrero, no metrónomo.
 */
const _eGesto = new THREE.Euler();
function matrizGestoHueso(m, gesto, t, fase) {
  if (gesto === 'peso') {
    // el cuerpo VIVO: traslada el peso apenas, dos ritmos que no engranan
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
    // meneo en ráfagas (la colita de la oveja/cerdo cuando está contenta)
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

/*
 * FK del esqueleto: la matriz MUNDO de un hueso = padre × T(pivote) × R(gesto)
 * × T(-pivote). Cacheada por (animal, hueso) y recalculada solo si cambió `t`:
 * cada hueso se compone UNA vez por frame aunque lo compartan muchas partes.
 */
const _huesoCache = new Map();
const _mPiv = new THREE.Matrix4();
const _mRot = new THREE.Matrix4();
function matrizHueso(animal, esp, nombre, t) {
  const clave = `${animal.id}|${nombre}`;
  let e = _huesoCache.get(clave);
  if (!e) {
    if (_huesoCache.size > 600) _huesoCache.clear(); // hatos que rotan: sin fuga
    _huesoCache.set(clave, (e = { t: NaN, m: new THREE.Matrix4() }));
  }
  if (e.t === t) return e.m;
  e.t = t;
  const h = esp.huesos?.[nombre];
  if (!h) return e.m.copy(animal.mat);
  const base = h.padre ? matrizHueso(animal, esp, h.padre, t) : animal.mat;
  matrizGestoHueso(_mRot, h.gesto, t, animal.fase + (h.fase || 0));
  const [px, py, pz] = h.pivote || [0, 0, 0];
  e.m
    .copy(base)
    .multiply(_mPiv.makeTranslation(px, py, pz))
    .multiply(_mRot)
    .multiply(_mPiv.makeTranslation(-px, -py, -pz));
  return e.m;
}

const _mTmp = new THREE.Matrix4();
const _mVientre = new THREE.Matrix4();
const _mResp = new THREE.Matrix4();
const _cTinte = new THREE.Color();

/* matriz final de una instancia: hueso(FK) × (vientre) × parte × (aliento).
   El vientre de la preñada ensancha SOLO las partes `vientre` (el cuerpo),
   en el espacio del animal (z = los flancos; todas las especies miran a +x).
   El ALIENTO late en el espacio local de la parte (la panza se hincha radial,
   las patas y la cabeza no laten): respiración de barriga, no globo. */
function componer(destino, animal, parte, conGesto, t) {
  const esp = ESPECIES[animal.especie];
  if (conGesto && esp.huesos) {
    destino.copy(matrizHueso(animal, esp, parte.hueso || 'raiz', t));
  } else {
    destino.copy(animal.mat);
  }
  if (parte.vientre && animal.vientre !== 1) {
    destino.multiply(_mVientre.makeScale(1, 1.05, animal.vientre));
  }
  destino.multiply(matrizParte(parte, animal.orejaRecta));
  if (conGesto && parte.respira) {
    const r = Math.sin(t * 0.9 + animal.fase) * 0.022;
    destino.multiply(_mResp.makeScale(1 + r, 1 + r * 0.25, 1 + r));
  }
}

/*
 * UNA parte de UNA especie como InstancedMesh de N instancias. El pelaje por
 * raza va como color de instancia (material blanco × instanceColor; `tinte`
 * lo oscurece para manchas) con el parche de pelaje (smooth + countershading +
 * rim dorado). Los vendidos llegan en su propio grupo `fantasma` (translúcido,
 * y el rim les da un brillo espectral que les queda bien de memoria).
 */
function ParteInstanciada({ parte, lista, fantasma, animar, onPick }) {
  const ref = useRef(null);
  // `soloRaza`: la giba del cebú solo la llevan los cebú — la parte filtra su
  // propia lista y su InstancedMesh tiene exactamente esas instancias.
  const listaP = useMemo(
    () =>
      parte.soloRaza
        ? lista.filter((a) => parte.soloRaza.includes((a.raza || '').toLowerCase().trim()))
        : lista,
    [lista, parte],
  );

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    listaP.forEach((a, i) => {
      componer(_mTmp, a, parte, false, 0);
      m.setMatrixAt(i, _mTmp);
      if (parte.porRaza) {
        m.setColorAt(i, parte.tinte ? _cTinte.copy(a.color).multiplyScalar(parte.tinte) : a.color);
      }
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    // culling correcto: la esfera envolvente se calcula DESDE las instancias
    m.computeBoundingSphere();
  }, [listaP, parte]);

  // Idle esquelético instanciado: solo partes `cuerpo` (patas plantadas), solo
  // si el gate reduced-motion + device-tier lo permite. N chico → costo trivial.
  useFrame((state) => {
    const m = ref.current;
    if (!animar || !parte.cuerpo || !m) return;
    const t = state.clock.elapsedTime;
    listaP.forEach((a, i) => {
      componer(_mTmp, a, parte, true, t);
      m.setMatrixAt(i, _mTmp);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  if (!listaP.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, listaP.length]}
      onClick={(e) => {
        e.stopPropagation();
        const a = listaP[e.instanceId];
        if (a) onPick(a);
      }}
    >
      <GeometriaParte geo={parte.geo} />
      <meshLambertMaterial
        color={parte.porRaza ? '#ffffff' : parte.color}
        onBeforeCompile={parchePelaje}
        transparent={fantasma}
        /* 0.35 sobre el piso de madera clara dejaba al fantasma casi invisible
           (pelaje cebú #d9d2c4 ≈ el piso); 0.45 conserva la poética de la
           huella pero la silueta vuelve a leer (QA visual 2026-07-30). */
        opacity={fantasma ? 0.45 : 1}
        depthWrite={!fantasma}
      />
    </instancedMesh>
  );
}

/* ── EL PESO EN EL PISO: sombras de contacto del hato, UNA InstancedMesh ──── */

let _texSombraHato = null;
function texturaSombraHato() {
  if (!_texSombraHato) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    _texSombraHato = new THREE.CanvasTexture(c);
  }
  return _texSombraHato;
}

/* plano acostado (-90° en X), compuesto una vez */
const _qSombra = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const _vSombraP = new THREE.Vector3();
const _vSombraS = new THREE.Vector3();

/* La sombra que POSA cada animal en el piso (el truco claymation de
   SombraContacto, instanciado: un solo draw call para todo el hato), alargada
   hacia -x como toda sombra de hora dorada. El fantasma del vendido NO la
   proyecta (es memoria, no cuerpo) y los momentos traen la suya propia. */
function SombrasHato({ animales }) {
  const ref = useRef(null);
  const lista = useMemo(
    () => animales.filter((a) => !a.momento && a.estado !== 'vendido'),
    [animales],
  );
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    lista.forEach((a, i) => {
      const r = (ESPECIES[a.especie].sombra || 0.3) * a.escala;
      _mTmp.compose(
        _vSombraP.set(a.pos[0] - r * 0.3, 0.006, a.pos[2]),
        _qSombra,
        _vSombraS.set(r * 2.6, r * 1.7, 1),
      );
      m.setMatrixAt(i, _mTmp);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [lista]);
  if (!lista.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, lista.length]} renderOrder={1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texturaSombraHato()}
        color="#2e2012"
        transparent
        opacity={0.42}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/* ── MUNDO VIVO: motas de polvo dorado flotando en la luz (tier alto) ─────── */
function MotasDoradas({ animar }) {
  const ref = useRef(null);
  const N = 14;
  const posar = (m, t) => {
    for (let i = 0; i < N; i++) {
      const r = 0.6 + ((i * 0.37) % 1) * 1.1;
      const a = i * ORO * 2.1 + t * 0.05;
      const y = 0.25 + ((t * 0.045 + i * 0.171) % 1) * 1.05;
      const s = 0.7 + 0.5 * Math.sin(t * 0.9 + i * 2.3);
      _mTmp.compose(
        _vSombraP.set(Math.cos(a) * r, y, Math.sin(a) * r),
        _qSombra,
        _vSombraS.set(s, s, s),
      );
      m.setMatrixAt(i, _mTmp);
    }
    m.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    if (!ref.current) return;
    posar(ref.current, 0.5);
    ref.current.computeBoundingSphere();
  });
  useFrame((state) => {
    if (!animar || !ref.current) return;
    posar(ref.current, state.clock.elapsedTime);
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]}>
      <octahedronGeometry args={[0.016, 0]} />
      <meshBasicMaterial color="#ffdf9e" transparent opacity={0.45} depthWrite={false} />
    </instancedMesh>
  );
}

/* La GARCITA BUEYERA parada en el lomo de la vaca más grande: la compañía de
   potrero de toda la vida (ella le espulga las moscas). Mira alrededor con
   pausas. Pocas primitivas, solo tier alto — mundo abierto vivo, no adorno. */
function GarcitaBueyera({ animales, animar }) {
  const cabeza = useRef(null);
  const vaca = useMemo(
    () =>
      animales
        .filter((a) => a.especie === 'vaca' && !a.momento && a.estado !== 'vendido')
        .sort((a, b) => b.escala - a.escala)[0] || null,
    [animales],
  );
  const sitio = useMemo(() => {
    if (!vaca) return null;
    return new THREE.Vector3(-0.22, 0.73, 0.02).applyMatrix4(vaca.mat);
  }, [vaca]);
  useFrame((state) => {
    if (!animar || !cabeza.current) return;
    const t = state.clock.elapsedTime;
    const g = Math.sin(t * 0.31 + 1.2);
    cabeza.current.rotation.y = Math.sign(g) * suave01(Math.abs(g) * 1.7 - 0.7) * 0.8;
    cabeza.current.position.y = 0.055 + Math.max(0, Math.sin(t * 0.9)) * 0.008;
  });
  if (!vaca || !sitio) return null;
  const esc = 0.85 * vaca.escala;
  return (
    <group position={sitio} rotation={[0, vaca.rumbo + 0.5, 0]} scale={esc}>
      {/* patas de palillo */}
      <mesh position={[0, -0.045, 0.012]}>
        <cylinderGeometry args={[0.005, 0.005, 0.09, 4]} />
        <meshLambertMaterial color={TONO.pico} />
      </mesh>
      <mesh position={[0.012, -0.045, -0.012]}>
        <cylinderGeometry args={[0.005, 0.005, 0.09, 4]} />
        <meshLambertMaterial color={TONO.pico} />
      </mesh>
      {/* cuerpo blanco con colita */}
      <mesh position={[0, 0.01, 0]} scale={[1.5, 1, 0.85]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshLambertMaterial color="#f2ede2" onBeforeCompile={parchePelaje} />
      </mesh>
      <mesh position={[-0.085, 0.03, 0]} rotation={[0, 0, 0.9]}>
        <coneGeometry args={[0.028, 0.07, 5]} />
        <meshLambertMaterial color="#e8e2d2" onBeforeCompile={parchePelaje} />
      </mesh>
      {/* cabeza con cuello en S y pico ámbar */}
      <group ref={cabeza} position={[0.05, 0.055, 0]}>
        <mesh position={[0.01, 0.01, 0]} rotation={[0, 0, -0.5]}>
          <cylinderGeometry args={[0.012, 0.016, 0.06, 5]} />
          <meshLambertMaterial color="#f2ede2" onBeforeCompile={parchePelaje} />
        </mesh>
        <mesh position={[0.035, 0.045, 0]}>
          <sphereGeometry args={[0.026, 8, 6]} />
          <meshLambertMaterial color="#f2ede2" onBeforeCompile={parchePelaje} />
        </mesh>
        <mesh position={[0.07, 0.042, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.009, 0.045, 4]} />
          <meshLambertMaterial color={TONO.pico} />
        </mesh>
        <mesh position={[0.045, 0.055, 0.019]}>
          <sphereGeometry args={[0.006, 5, 4]} />
          <meshBasicMaterial color="#241a10" />
        </mesh>
      </group>
    </group>
  );
}

/* La señal de PREÑADA: una gota rosada suave que flota sobre el lomo (se ve
   sin leer, y la placa lo dice con palabras). Instanciada y con vaivén gateado. */
function MarcadoresPrenada({ animales, animar }) {
  const lista = useMemo(() => animales.filter((a) => a.estado.startsWith('pre')), [animales]);
  const ref = useRef(null);
  const posarlas = (m, t) => {
    lista.forEach((a, i) => {
      const alza = animar && t > 0 ? Math.sin(t * 1.4 + a.fase) * 0.03 : 0;
      _mTmp.makeTranslation(a.pos[0], ESPECIES[a.especie].alto * a.escala + 0.16 + alza, a.pos[2]);
      m.setMatrixAt(i, _mTmp);
    });
    m.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    if (!ref.current) return;
    posarlas(ref.current, 0);
    ref.current.computeBoundingSphere();
  });
  useFrame((state) => {
    if (!animar || !ref.current) return;
    posarlas(ref.current, state.clock.elapsedTime);
  });
  if (!lista.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, lista.length]}>
      <octahedronGeometry args={[0.055, 0]} />
      <meshBasicMaterial color="#d98fa0" transparent opacity={0.9} />
    </instancedMesh>
  );
}

/* ── El cartel de madera con el NOMBRE, clavado junto a su animal ─────────── */

/* El sitio del cartel: corrido hacia afuera del animal (radial), sin pasarse
   de la cerca (r=1.9), y mirando hacia afuera (se lee caminando el corral). */
function sitioCartel(a) {
  const r = Math.hypot(a.pos[0], a.pos[2]);
  const rc = Math.min(r + 0.34, 1.78);
  const dx = r > 0.001 ? a.pos[0] / r : 1;
  const dz = r > 0.001 ? a.pos[2] / r : 0;
  return { x: dx * rc, z: dz * rc, giro: Math.atan2(dx, dz) };
}

function CartelNombre({ animal, registrar, onPick, conTabla }) {
  const { x, z, giro } = sitioCartel(animal);
  // tablita torcida a mano (determinista por animal): lo artesanal del trazo
  const torcida = Math.sin(animal.fase * 3.1) * 0.05;
  const apagado = animal.estado === 'vendido';
  return (
    <group
      position={[x, 0, z]}
      rotation={[0, giro, 0]}
      ref={(el) => registrar(animal.id, 'raiz', el)}
      onClick={(e) => {
        e.stopPropagation();
        onPick(animal);
      }}
    >
      {/* la estaca: siempre presente — una estaca por animal, el conteo se ve */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.018, 0.026, 0.4, 5]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>
      {/* modo punto: la perilla con el color del pelaje (¿de quién es? del que
          tiene este pelaje) — el anti-colisión la muestra cuando la tabla cede */}
      <mesh position={[0, 0.43, 0]} ref={(el) => registrar(animal.id, 'punto', el)}>
        <sphereGeometry args={[0.045, 8, 6]} />
        <meshLambertMaterial color={animal.colorCss} flatShading />
      </mesh>
      {/* modo plena: la tabla con el nombre, legible por ambas caras. En gama
          baja no se monta (LOD): la placa del toque sigue dando el nombre. */}
      {conTabla && (
        <group
          position={[0, 0.46, 0]}
          rotation={[0, 0, torcida]}
          ref={(el) => {
            registrar(animal.id, 'plena', el);
            if (el) el.visible = false; // arranca en punto; el 1er frame decide
          }}
        >
          <mesh>
            <boxGeometry args={[0.56, 0.2, 0.035]} />
            <meshLambertMaterial color={PALETA.maderaClara} flatShading />
          </mesh>
          {[0.022, -0.022].map((lado) => (
            <Text
              key={lado}
              position={[0, 0, lado]}
              rotation={[0, lado < 0 ? Math.PI : 0, 0]}
              fontSize={0.1}
              maxWidth={0.5}
              color={apagado ? '#6a5a44' : '#241a10'}
              anchorX="center"
              anchorY="middle"
            >
              {animal.nombre}
            </Text>
          ))}
        </group>
      )}
    </group>
  );
}

/*
 * Anti-colisión de carteles: el MISMO juicio de RotulosLugares del valle
 * (SPEC-UX-01), adaptado de botones-Html a maderos 3D: por foco/proximidad
 * solo el cartel más apuntado (o el del animal tocado) muestra su tabla plena
 * con histéresis anti-parpadeo; los demás se calman a perilla; quien pisa un
 * espacio ya tomado en PANTALLA, cede. Se escribe imperativo sobre `visible`
 * (~12 pasadas/s, cero re-render por frame; corre en el PRIMER frame, que es
 * el que importa con frameloop='demand' de reduced-motion).
 */
const _proj = new THREE.Vector3();

function CartelesNombres({ animales, seleccionId, onPick, conTabla }) {
  const nodos = useRef({});
  const plena = useRef(null);
  const tick = useRef(0);
  const registrar = (id, capa, el) => {
    (nodos.current[id] ||= {})[capa] = el;
  };
  const conNombre = useMemo(() => animales.filter((a) => a.nombre), [animales]);
  const anclas = useMemo(
    () =>
      conNombre.map((a) => {
        const { x, z } = sitioCartel(a);
        return { a, v: new THREE.Vector3(x, 0.46, z) };
      }),
    [conNombre],
  );

  useFrame(({ camera: cam, size }) => {
    if (tick.current++ % 5 !== 0) return;
    const perspCam = /** @type {import('three').PerspectiveCamera} */ (cam);
    // px por metro a cada distancia (cámara en perspectiva): para estimar el
    // rect EN PANTALLA de una tabla de tamaño constante EN MUNDO.
    const foco = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(perspCam.fov) * 0.5));
    const pts = anclas.map(({ a, v }) => {
      _proj.copy(v).project(perspCam);
      const x = (_proj.x * 0.5 + 0.5) * size.width;
      const y = (0.5 - _proj.y * 0.5) * size.height;
      return {
        id: a.id,
        x,
        y,
        pxm: foco / Math.max(perspCam.position.distanceTo(v), 0.1),
        dc: Math.hypot(x - size.width / 2, y - size.height / 2),
        elegible: _proj.z <= 1,
      };
    });

    // foco/proximidad: manda el animal tocado; si no, el cartel más apuntado,
    // con histéresis (cambia solo si otro queda 20% más centrado).
    let candidata = null;
    if (seleccionId && pts.some((p) => p.id === seleccionId)) {
      candidata = seleccionId;
    } else {
      const previa = pts.find((p) => p.id === plena.current && p.elegible);
      const cercana = pts.filter((p) => p.elegible).sort((a, b) => a.dc - b.dc)[0];
      candidata =
        previa && cercana && cercana.dc > previa.dc * 0.8 ? previa.id : (cercana?.id ?? null);
    }
    plena.current = candidata;

    const MARGEN = 6;
    const tomados = [];
    const rectoDe = (x, y, w, h) => ({
      x0: x - w / 2 - MARGEN,
      x1: x + w / 2 + MARGEN,
      y0: y - h / 2 - MARGEN,
      y1: y + h / 2 + MARGEN,
    });
    const pisa = (r) =>
      tomados.some((o) => r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0);
    const orden = [...pts].sort((a, b) =>
      a.id === candidata ? -1 : b.id === candidata ? 1 : a.dc - b.dc,
    );
    for (const p of orden) {
      let modo = 'oculto';
      if (p.elegible) {
        const esPlena = conTabla && p.id === candidata;
        const w = Math.max((esPlena ? 0.62 : 0.1) * p.pxm, 14);
        const h = Math.max((esPlena ? 0.24 : 0.1) * p.pxm, 14);
        const r = rectoDe(p.x, p.y, w, h);
        if (!pisa(r)) {
          tomados.push(r);
          modo = esPlena ? 'plena' : 'punto';
        }
      }
      const nd = nodos.current[p.id];
      if (!nd) continue;
      if (nd.raiz) nd.raiz.visible = modo !== 'oculto';
      if (nd.plena) nd.plena.visible = modo === 'plena';
      if (nd.punto) nd.punto.visible = modo === 'punto';
    }
  });

  return conNombre.map((a) => (
    <CartelNombre key={a.id} animal={a} registrar={registrar} onPick={onPick} conTabla={conTabla} />
  ));
}

/* La placa flotante del TOQUE: nombre + raza + tamaño (+ estado con palabras).
   Mismo lenguaje de píldora de papel de los hotspots; tocar de nuevo cierra. */
function PlacaAnimal({ animal, onCerrar }) {
  const alto = ESPECIES[animal.especie].alto * animal.escala + 0.5;
  const meta = [animal.raza, animal.tamano].filter(Boolean).join(' · ');
  const especial = animal.estado !== 'sano';
  const claseEstado = animal.estado.startsWith('pre')
    ? 'prenada'
    : animal.estado === 'nace'
      ? 'nace'
      : animal.estado === 'muerte'
        ? 'muerte'
        : 'vendido';
  const textoEstado = animal.estado.startsWith('pre')
    ? 'Preñada'
    : animal.estado === 'nace'
      ? 'Recién nacida'
      : animal.estado === 'muerte'
        ? 'En memoria'
        : animal.estado === 'vendido'
          ? 'Vendido'
          : animal.estado;
  return (
    <group position={[animal.pos[0], alto, animal.pos[2]]}>
      <Html center distanceFactor={8.5} zIndexRange={[25, 0]}>
        <button
          type="button"
          className="mundo-placa"
          style={{ '--placa-tinte': animal.colorCss }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onCerrar();
          }}
          aria-label={`${animal.nombre || 'Animal'}${meta ? `, ${meta}` : ''}${especial ? `, ${textoEstado}` : ''}. Toque para cerrar.`}
        >
          <strong className="mundo-placa__nombre">{animal.nombre || 'Sin nombre'}</strong>
          {meta && <span className="mundo-placa__meta">{meta}</span>}
          {especial && (
            <span className={`mundo-placa__estado mundo-placa__estado--${claseEstado}`}>
              {textoEstado}
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}

/*
 * El HATO completo: instancias por especie (vivos y vendidos-fantasma en
 * grupos aparte), sombras de contacto que lo POSAN en el piso, señales de
 * preñez, carteles con nombre, la placa del toque y la vida de potrero
 * (garcita en el lomo, polvo dorado en la luz — solo tier alto).
 */
export default function CorralVivo({ animales: lista, reducedMotion, tier = 'alto' }) {
  const animales = useMemo(() => posarHatoCorral(normalizarAnimales(lista || [])), [lista]);
  const [seleccion, setSeleccion] = useState(null);
  // GATE doble: reduced-motion apaga el idle; gama baja tampoco lo paga.
  const animar = !reducedMotion && tier !== 'bajo';
  // LOD gama baja: sin tablas con Text (queda estaca+perilla; la placa nombra)
  const conTabla = tier !== 'bajo';
  // El hato instanciado NO incluye los que están viviendo su momento (nace/
  // muerte): esos los dibuja AnimalMomento, uno por uno, para animarles el
  // instante (escala/opacidad/gesto propios que la instancia compartida no da).
  // `vendido` SÍ se queda aquí, como huella-fantasma (su vida está en el mercado).
  const { grupos, momentos } = useMemo(() => {
    const g = new Map();
    const mm = [];
    for (const a of animales) {
      if (a.momento === 'nace' || a.momento === 'muerte') {
        mm.push(a);
        continue;
      }
      const k = `${a.especie}${a.estado === 'vendido' ? '|fantasma' : ''}`;
      if (!g.has(k)) g.set(k, { clave: k, especie: a.especie, fantasma: a.estado === 'vendido', lista: [] });
      g.get(k).lista.push(a);
    }
    return { grupos: [...g.values()], momentos: mm };
  }, [animales]);
  const alPicar = (a) => setSeleccion((s) => (s?.id === a.id ? null : a));

  return (
    <group>
      <SombrasHato animales={animales} />
      {grupos.map((g) => (
        <Fragment key={g.clave}>
          {ESPECIES[g.especie].partes
            .filter((p) => !p.fina || tier !== 'bajo')
            .map((p, j) => (
              <ParteInstanciada
                key={j}
                parte={p}
                lista={g.lista}
                fantasma={g.fantasma}
                animar={animar && !g.fantasma}
                onPick={alPicar}
              />
            ))}
        </Fragment>
      ))}
      {/* Los MOMENTOS del corral: la cría que nace, el que se despide con respeto.
          Cada uno vive su instante; tocarlo abre su placa igual que a los demás. */}
      {momentos.map((a) => (
        <AnimalMomento
          key={a.id}
          animal={a}
          modo={a.momento}
          destino={a.pos}
          origen={a.pos}
          reducedMotion={reducedMotion}
          tier={tier}
          onPick={alPicar}
        />
      ))}
      {tier === 'alto' && <GarcitaBueyera animales={animales} animar={animar} />}
      {tier === 'alto' && <MotasDoradas animar={animar} />}
      <MarcadoresPrenada animales={animales} animar={animar} />
      <CartelesNombres
        animales={animales}
        seleccionId={seleccion?.id}
        onPick={alPicar}
        conTabla={conTabla}
      />
      {seleccion && <PlacaAnimal animal={seleccion} onCerrar={() => setSeleccion(null)} />}
    </group>
  );
}
