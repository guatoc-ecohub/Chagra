/*
 * morrocoyIdentidad — LA IDENTIDAD VISUAL DEL MORROCOY, COMO DATOS.
 *
 * Hermano de `jaguarIdentidad.js`, `abejaIdentidad.js` y `faunaAndina.js`: el
 * MORROCOY de patas rojas (Chelonoidis carbonarius), el galápago de tierra
 * cálida, tiene aquí su silueta canónica. Rubber-hose (Cuphead + Miss Minutes)
 * con calidez campesina — el MISMO lenguaje de goma de la abeja, el oso y el
 * jaguar, otro animal y otro CARÁCTER: ANCESTRAL, LENTO, SABIO y PACIENTE (el
 * anciano tranquilo de la chagra). Se mueve con paso pesado, la cabeza asoma con
 * calma y su seña de vida es la RETRACCIÓN ELÁSTICA: mete cabeza y patas al
 * caparazón estirando y encogiendo con squash&stretch de goma. Su color de poder
 * es el BRONCE/COBRE cálido (abeja=dorado, oso=rojo, rana=verde,
 * colibrí=iridiscente, jaguar=púrpura, ardilla=ámbar, perezoso=turquesa).
 *
 * REGLA DE ORO (idéntica a jaguarIdentidad/faunaAndina): SOLO datos. Cero three,
 * cero react. La creature del bundle base lo importa; jamás debe arrastrar
 * `vendor-three`. La CADENCIA (animación) vive en `creatures.css` (clases
 * `rh-*`/`crt-*`/`morrocoy-*`); el DIBUJO compone el KIT `_rubberhose.jsx`; el
 * CLIMA→cuerpo, en `creatureClimaCuerpo.js` (consumiendo el PERFIL_MORROCOY de
 * abajo). El aura de poder (bronce) vive en `transformacion.js` (AURA_POR_BICHO)
 * y la ropa por clima en `creatureClimaCuerpo.js` (ROPA_PERFIL_POR_BICHO): ambos
 * ya traen la fila 'morrocoy' — este archivo NO la duplica, solo la silueta.
 */

/* La tinta cálida del contorno es de TODA la familia rubber-hose. */
export { RH_INK as MORROCOY_TINTA } from './_rubberhose.jsx';

/* Slug estable del morrocoy (data-creature, aura, ropa, perfiles). */
export const MORROCOY_SLUG = 'morrocoy';

/* ── MORROCOY — Chelonoidis carbonarius (galápago de patas rojas de tierra
   cálida). Caparazón de DOMO GEOMÉTRICO bronce-oliva con escudos HEXAGONALES
   (su firma — cada escudo con anillos de edad), patas y cabeza ROJIZAS con
   escamas naranja-fuego (la marca de la especie), cabeza que asoma serena.
   Ancestral y sabio. */
export const MORROCOY_PALETA = {
  caparazon: '#8a6a3a',       // domo bronce-oliva del caparazón
  caparazonGlow: 'rgba(176,118,58,0.7)',
  caparazonAlto: '#a4823f',   // cara alta del domo (luz cenital)
  escudo: '#6b4f28',          // borde/surco entre escudos hexagonales
  escudoCentro: '#9c7838',    // centro del escudo (el domo de cada hexágono)
  anillo: '#5a3f20',          // anillos de edad grabados en cada escudo (lo ancestral)
  marginal: '#5a3f20',        // escudos marginales del reborde
  plastron: '#c9a35c',        // peto/plastrón crema-tierra
  pata: '#b0562e',            // pata rojiza (patas rojas)
  pataEscama: '#e07a38',      // escama naranja-fuego (la marca carbonarius)
  cabeza: '#7a4f2c',          // cabeza parda
  cabezaEscama: '#e07a38',    // escamas rojo-naranja de la testa (la firma)
  nariz: '#2f1d10',           // fosas nasales / pico
  pico: '#4a3418',            // borde del pico (boca de tortuga)
  ojoAnillo: '#c8862f',       // anillo ámbar del ojo (mirada serena)
  /* ── Ancestral (el anciano de la chagra: la piedra viva, el petroglifo) ── */
  resplandor: '#e0a84a',      // resplandor cobrizo del caparazón (calor ancestral)
  brasa: '#ffcf8a',           // el destello tibio del domo (brasa apacible)
};

export const MORROCOY_PROPORCION = {
  caparazonRx: 11.2,          // domo ancho y bajo (más ancho que alto)
  caparazonRy: 8.2,
  cabezaR: 3.5,               // cabeza pequeña y serena
  cuelloAncho: 3.0,           // cuello grueso que asoma
  pataAncho: 3.6,             // patas robustas y cortas (paso pesado)
};

/*
 * PERFIL_MORROCOY — el perfil de CLIMA→cuerpo del morrocoy para `cuerpoDeClima`
 * (creatureClimaCuerpo.js). Mismo shape que PERFIL_JAGUAR/PERFIL_OSO — se pasa
 * vía la opción `perfil`, así NO hay que tocar el archivo compartido
 * (anti-conflicto).
 *   alas    false → sin aleteo (velocidadAlas siempre 1).
 *   humedad 0.4  → el caparazón córneo escurre el agua (apenas se ve mojado).
 *   difusa  0.5  → cuerpo compacto y bajo: la niebla lo difumina a medias.
 *   sequia  0.25 → de tierra cálida, reptil paciente: muy robusto ante la seca.
 */
export const PERFIL_MORROCOY = Object.freeze({
  alas: false,
  humedad: 0.4,
  difusa: 0.5,
  sequia: 0.25,
});
