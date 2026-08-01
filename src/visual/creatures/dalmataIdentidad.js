/*
 * dalmataIdentidad — LA IDENTIDAD VISUAL DEL DÁLMATA, COMO DATOS.
 *
 * Hermana de `jaguarIdentidad.js` y `borugoIdentidad.js`: el DÁLMATA (Canis
 * lupus familiaris), el perro ATLÉTICO de la casa, tiene aquí su silueta
 * canónica. Rubber-hose (Cuphead + Miss Minutes) con calidez campesina — el
 * MISMO lenguaje de goma de la abeja y el jaguar, otro animal y otro CARÁCTER:
 * alegre, leal, INCANSABLE. La SEÑA INEQUÍVOCA de la raza (fidelidad primero):
 * pelaje BLANCO PURO con MANCHAS NEGRAS REDONDAS bien definidas y SEPARADAS
 * (nunca rosetas con centro como el jaguar, nunca motas crema como el borugo),
 * cuerpo casi CUADRADO y atlético, PATAS LARGAS, HOCICO LARGO, orejas caídas
 * MOTEADAS y collar rojo de perro de finca. Alto y esbelto donde el beagle es
 * bajito y orejón: las dos siluetas jamás se confunden. Su color de poder es el
 * AZUL COBALTO leal (abeja=dorado, jaguar=púrpura, borugo=plata lunar).
 *
 * REGLA DE ORO (idéntica a jaguarIdentidad/borugoIdentidad): SOLO datos. Cero
 * three, cero react. La creature del bundle base lo importa; jamás debe
 * arrastrar `vendor-three`. La CADENCIA (animación) vive en `creatures.css`
 * (clases `rh-*`/`crt-*`/`dalmata-*`); el DIBUJO compone el KIT
 * `_rubberhose.jsx`; el CLIMA→cuerpo, en `creatureClimaCuerpo.js` (consumiendo
 * el PERFIL_DALMATA de abajo). El aura de poder (azul cobalto) vive en
 * `transformacion.js` (AURA_POR_BICHO) y la ropa por clima en
 * `creatureClimaCuerpo.js` (ROPA_PERFIL_POR_BICHO) — este archivo NO las
 * duplica, solo la silueta.
 */

/* La tinta cálida del contorno es de TODA la familia rubber-hose. */
export { RH_INK as DALMATA_TINTA } from './_rubberhose.jsx';

/* Slug estable del dálmata (data-creature, aura, ropa, perfiles). */
export const DALMATA_SLUG = 'dalmata';

/* ── DÁLMATA — Canis lupus familiaris (el perro atlético moteado). Nace BLANCO
   y las manchas le salen después: acá lo dibujamos adulto, con su firma plena —
   manchas negras REDONDAS, bien definidas y SEPARADAS sobre blanco puro
   (distribuidas por todo el cuerpo, orejas caídas moteadas, hasta la cola).
   Ojos café alerta y amables, trufa negra, lengüita rosada que jadea feliz. */
export const DALMATA_PALETA = {
  cuerpo: '#fdfaf2',        // pelaje BLANCO puro (cálido, no clínico — tono medio del gradiente)
  cuerpoLuz: '#ffffff',     // luz dorsal del pelaje (el sol sobre el lomo — volumen)
  cuerpoSombra: '#e7dcc4',  // sombra ventral del blanco (marfil en penumbra — volumen, no gris sucio)
  cuerpoGlow: 'rgba(253,250,242,0.75)',
  vientre: '#ffffff',       // pecho aún más claro (brillo del blanco)
  mancha: '#241608',        // la mancha NEGRA redonda (tinta oscura cálida — SIN centro: no es roseta)
  oreja: '#f3ecdd',         // oreja caída (blanca, moteada por encima)
  hocico: '#fbf5e8',        // hocico largo claro
  nariz: '#241608',         // trufa negra grande
  iris: '#9c6527',          // ojo ámbar-café GRANDE, vivo y amable (con alma, nunca vacío)
  lengua: '#ef8398',        // lengüita rosada del jadeo feliz
  lenguaHondo: '#d76a82',   // el pliegue central de la lengua (volumen del jadeo)
  collar: '#d64541',        // collar ROJO clásico de perro de finca/bombero
  placa: '#d9a848',         // la plaquita de LATÓN del collar (gemela de la de Dante — la misma del 3D)
  sombraSuelo: 'rgba(36,22,8,0.32)', // la sombra blanda bajo las patas (peso real)
};

export const DALMATA_PROPORCION = {
  troncoRx: 7.3,            // ATLÉTICO: cuerpo casi CUADRADO (rx≈ry, ~1:1) con pecho PROFUNDO
  troncoRy: 8.2,
  cabezaRx: 5.7,            // cráneo apenas más ancho que alto (perro fino, no carita-círculo)
  cabezaRy: 5.2,
  cabezaR: 5.45,            // radio medio (lo consumen ropa/accesorios)
  hocicoLargo: 6.5,         // el HOCICO LARGO de la raza (baja bien por debajo de la cara)
  pataLarga: 13.3,          // hasta dónde llegan las PATAS LARGAS y FINAS (y del pie)
};

/*
 * PERFIL_DALMATA — el perfil de CLIMA→cuerpo del dálmata para `cuerpoDeClima`
 * (creatureClimaCuerpo.js). Mismo shape que PERFIL_JAGUAR/PERFIL_BORUGO — se
 * pasa vía la opción `perfil`, así NO hay que tocar el archivo compartido
 * (anti-conflicto).
 *   alas    false → sin aleteo (velocidadAlas siempre 1).
 *   humedad 0.5  → pelo CORTO: se moja notorio pero se sacude rápido.
 *   difusa  0.45 → talla media: la niebla lo difumina moderado.
 *   sequia  0.4  → perro de casa: la seca lo apaga un poco (depende del agua del patio).
 */
export const PERFIL_DALMATA = Object.freeze({
  alas: false,
  humedad: 0.5,
  difusa: 0.45,
  sequia: 0.4,
});
