/*
 * maizIdentidad — LA IDENTIDAD VISUAL DEL MAÍZ COMPAÑERO, COMO DATOS.
 *
 * Hermana de `abejaIdentidad.js` / `zariguyaIdentidad.js`: la PLANTA DE MAÍZ
 * (Zea mays, la mata madre de la milpa andina) es la opción de avatar
 * `'maiz'` — la alternativa cultural ancestral al bicho. Rubber-hose
 * (Cuphead + Miss Minutes) con calidez campesina: el MISMO lenguaje de goma
 * de la abeja y la zarigüeya, pero es una PLANTA y eso lo cambia todo:
 * ARRAIGADA (no viaja de lugar — el único personaje del elenco que no se
 * desplaza), mecida por la brisa, LA QUE ALIMENTA (la mazorca al costado es
 * su carga, como las crías son la carga de la zarigüeya).
 *
 * ── SU FIRMA ES DE FORMA, NO DE COLOR (lección del borugo) ──────────────────
 * Los rasgos diagnósticos sobreviven al test de negro sobre blanco
 * (ver MAIZ_FIRMA abajo):
 *   1. EL PENACHO — la espiga en plumero asimétrico que corona el tallo.
 *      Ningún otro personaje del elenco remata en espiga.
 *   2. HOJAS-CINTA que arquean y caen en punta — los brazos de manguera
 *      vegetales, uno alzado y otro caído (asimetría de brisa).
 *   3. LA MAZORCA AL COSTADO con su mechón de barbas — el bulto lateral que
 *      rompe el eje del tallo.
 *   4. EL ARRAIGO — nace de un montículo de tierra; no tiene pies. La base
 *      ancha triangular la separa de todo bicho del elenco.
 * Y la POSTURA: eje VERTICAL esbelto que SE MECE. El contraste interno de la
 * casa es el Ent frailejón (roseta GORDA, masa baja y ancha, quieto de viejo
 * sabio); el maíz es esbelto, joven y bailarín.
 *
 * REGLA DE ORO (idéntica a abejaIdentidad/zariguyaIdentidad): SOLO datos.
 * Cero three, cero react. La creature del bundle base lo importa; jamás debe
 * arrastrar `vendor-three`. La CADENCIA (brisa asimétrica, penacho que vibra)
 * vive en `maizCompai.css`; el DIBUJO compone el KIT `_rubberhose.jsx`; la
 * COREOGRAFÍA 3D (arraigo + inclinarse al foco) en `MaizCompaiEscena.jsx`.
 */

/* La tinta cálida del contorno es de TODA la familia rubber-hose. */
export { RH_INK as MAIZ_TINTA } from './_rubberhose.jsx';

/* Slug estable (data-creature, registro CREATURES, compaiRegistry). Coincide
   con el avatarType 'maiz' de useAgentAvatarType. */
export const MAIZ_SLUG = 'maiz';

/*
 * MAIZ_FIRMA — EL CONTRATO DE SILUETA, COMO DATOS (patrón ZARIGUYA_FIRMA).
 * La prueba obligatoria de la casa es `pruebaSilueta`: la figura rellena de
 * negro sobre blanco, legible a tamaño billboard.
 */
export const MAIZ_FIRMA = Object.freeze({
  rasgos: Object.freeze([
    Object.freeze({
      id: 'penacho-espiga', forma: true,
      que: 'La espiga masculina en plumero asimétrico coronando el tallo: cinco plumas que abren en abanico irregular, con las anteras como bombillos en las puntas.',
      porque: 'Ningún otro personaje del elenco remata en espiga. A 40 px el plumero se lee antes que cualquier detalle — y es el que VIBRA cuando la planta reacciona.',
    }),
    Object.freeze({
      id: 'hojas-cinta', forma: true,
      que: 'Hojas largas como cintas que arquean desde el tallo y caen en punta — una alzada al sol y otra vencida (asimetría de brisa), como brazos de manguera vegetales.',
      porque: 'La curva caída de la hoja de maíz es inconfundible: nace arqueando hacia arriba y la punta se rinde. Es el squash & stretch hecho botánica.',
    }),
    Object.freeze({
      id: 'mazorca-al-costado', forma: true,
      que: 'La mazorca envuelta en su amero, pegada al costado del tallo, con el mechón de barbas asomando por la punta.',
      porque: 'El bulto lateral rompe el eje limpio del tallo — como las crías rompen el lomo de la zarigüeya. Es su carga y su regalo: LA QUE ALIMENTA.',
    }),
    Object.freeze({
      id: 'arraigo-monticulo', forma: true,
      que: 'La base es un montículo de tierra aporcada del que sale el tallo; no hay pies ni patas — hay raíces que asoman como deditos.',
      porque: 'El único personaje del elenco que NO viaja: su silueta termina en tierra, no en zapatos. El arraigo es identidad, no limitación.',
    }),
  ]),
  pruebaSilueta: Object.freeze({
    obligatoria: true,
    como: 'Rellenar la figura entera de negro sobre blanco, sin color ni detalle interno, y mirarla a 48 px.',
    contraste: 'Ent frailejón (Espeletia): roseta gorda de masa baja y ancha, quieto — el maíz es esbelto, vertical y coronado en espiga',
    criterio: 'Si no se reconoce sin color, la silueta falló y se rehace.',
  }),
});

/* ── EL MAÍZ — Zea mays de la milpa andina: culmo verde con nudos, hojas
   cinta, mazorca amarilla en su amero con barbas cobrizas, espiga dorada-
   verdosa, y la carita de grano tierno (crema) asomando entre dos brácteas
   — el choclo que sonríe. */
export const MAIZ_PALETA = {
  cuerpo: '#7ca84f',        // el culmo (tallo) verde vivo
  cuerpoGlow: 'rgba(143,191,99,0.55)',
  nudo: '#5e8a3e',          // los nudos del culmo (las rodillas de la caña)
  hoja: '#69a04a',          // la lámina de la hoja-cinta
  hojaClara: '#8fbf63',     // el haz con luz (y las brácteas que abrazan la cara)
  vena: '#4c7a33',          // la nervadura central de cada hoja
  cara: '#f2ecc9',          // LA CARA DE GRANO TIERNO (crema del choclo)
  penacho: '#d9c25f',       // la espiga dorada-verdosa (el plumero)
  polen: '#f0d879',         // anteras y motitas de polen
  mazorca: '#f5cf5c',       // el amarillo del grano
  grano: '#dfae3a',         // el sombreado de las hileras de granos
  amero: '#a8c979',         // las hojas del amero (capacho) que envuelven
  barba: '#c9855a',         // las barbas (sedas) cobrizas de la mazorca
  tierra: '#8a6844',        // el montículo aporcado del que nace
  tierraOscura: '#6d5136',  // sombra y terrones del montículo
  raiz: '#d9c9a8',          // raicitas que asoman como deditos
};

/* Silueta canónica en unidades del viewBox del SVG ('-16 -26 32 46'). */
export const MAIZ_PROPORCION = {
  talloAlto: 24,            // del montículo a la base del penacho (eje vertical)
  talloAncho: 3.2,          // el culmo esbelto
  caraR: 4.7,               // la carita de choclo entre brácteas
  penachoLargo: 7.5,        // cuánto sube el plumero sobre la cabeza (firma)
  hojas: 4,                 // dos brazos-cinta arriba + dos hojas caídas abajo
  mazorcaRx: 2.55,          // la mazorca al costado (firma)
  mazorcaRy: 4.7,
  monticuloRx: 8.8,         // la base de tierra (el arraigo, firma)
  monticuloRy: 3.4,
};

/*
 * MAIZ_PRESENCIA — cómo ocupa una escena 3D (el molde es ABEJA_PRESENCIA:
 * mismos campos, otro personaje). La diferencia de fondo: el maíz está
 * ARRAIGADO — `percha.y` y `rondaAltura` son la altura del CENTRO de su
 * billboard sobre el PISO (no sobre el foco: una planta no vuela ni persigue;
 * se siembra junto al foco inicial y desde ahí se INCLINA hacia donde pasa la
 * acción). Su sombra casi no cambia: nunca se despega del suelo.
 */
export const MAIZ_PRESENCIA = {
  /* Billboard <Html>: px base + ganancia por energía (0..1) y el
     distanceFactor con el que la cámara lo escala. Más grande que la abeja:
     es una mata entera, no un bichito. */
  billboardBase: 58,
  billboardPorEnergia: 10,
  distancia: 7,
  /* Dónde se SIEMBRA respecto del foco con el que nace la escena (x/z), y a
     qué altura sobre el piso queda el centro del billboard (y). */
  percha: { x: 0.62, y: 0.52, z: 0.55 },
  /* Arraigada: su "ronda" es quedarse — misma altura de centro. */
  rondaAltura: 0.52,
  /* Sombra de contacto: ancha (mata con falda de hojas) y estable (jamás se
     eleva; atenúa/ensancha casi nada). */
  sombra: {
    radio: 0.34,
    opacidad: 0.26,
    opacidadBase: 0.28,
    opacidadMin: 0.16,
    atenuaPorAltura: 0.02,
    ensanchaPorAltura: 0.04,
  },
};

/*
 * PERFIL_MAIZ — el perfil de CLIMA→cuerpo para `cuerpoDeClima`
 * (creatureClimaCuerpo.js), mismo shape que PERFIL_ZARIGUYA.
 *   alas    false → sin aleteo.
 *   humedad 0.55 → las hojas-canal están HECHAS para la lluvia (la embudan
 *                  hacia el tallo): se moja con dignidad.
 *   difusa  0.6  → mata mediana: la niebla la vela sin tragársela.
 *   sequia  0.95 → LA MÁS sensible del elenco: sin agua el maíz se enrolla
 *                  (las hojas se acanalan) — la seca se le nota de una.
 */
export const PERFIL_MAIZ = Object.freeze({
  alas: false,
  humedad: 0.55,
  difusa: 0.6,
  sequia: 0.95,
});
