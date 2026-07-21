/*
 * osoAnteojosIdentidad — LA IDENTIDAD VISUAL DEL OSO DE ANTEOJOS (negro
 * biopunk), COMO DATOS.
 *
 * Hermana de `jaguarIdentidad.js` / `dantaIdentidad.js`: el OSO DE ANTEOJOS
 * (Tremarctos ornatus, el único oso de Suramérica, VU) tiene aquí su silueta
 * canónica EN SU VERSIÓN BUENA — la aprobada por el operador en el selector del
 * guardián (dashboard/GuardianEspiritu → AvatarOso): pelaje NEGRO-AZABACHE con
 * subtono azul de noche andina, ANTEOJOS crema-blancos LUMINOSOS alrededor de
 * los ojos (la firma inequívoca de la especie), media luna crema en el pecho,
 * hocico corto tan claro y acentos menta bioluminiscentes MEDIDOS (biopunk
 * sutil, como el jaguar místico — nunca kitsch). NO es el oso café plano
 * (OsoAndino.jsx, archivado por decisión del operador): mismo animal, otra
 * dirección de arte.
 *
 * CARÁCTER: gigante GENTIL. Casi herbívoro (bromelias, frutos), tímido y noble
 * — impone respeto por su MOLE, jamás por amenaza. Ojos grandes con alma,
 * cachetes, squash&stretch pesado y lento (la masa asienta despacio). Su color
 * de poder es el MENTA bioluminiscente (abeja=dorado, jaguar=púrpura,
 * oso café=rojo — éste NO lo hereda).
 *
 * REGLA DE ORO (idéntica a jaguarIdentidad): SOLO datos. Cero three, cero
 * react. La creature del bundle base lo importa; jamás debe arrastrar
 * `vendor-three`. La CADENCIA vive en `creatures.css` (clases `rh-*`/`crt-*`/
 * `oso-*`/`osoa-*`); el DIBUJO compone el KIT `_rubberhose.jsx`; el
 * CLIMA→cuerpo, en `creatureClimaCuerpo.js` (perfil de páramo abajo). El aura
 * de poder (menta) vive en `transformacion.js` (AURA_POR_BICHO fila
 * 'oso-anteojos').
 */

/* La tinta cálida del contorno es de TODA la familia rubber-hose. */
export { RH_INK as OSO_ANTEOJOS_TINTA } from './_rubberhose.jsx';

/* Slug estable (data-creature, aura, CSS). Distinto de 'oso-andino' (el café
   archivado) a propósito: los consumidores viejos no cambian; el cableado del
   reemplazo lo decide el orquestador. */
export const OSO_ANTEOJOS_SLUG = 'oso-anteojos';

/* ── OSO DE ANTEOJOS — Tremarctos ornatus en negro biopunk. El pelaje es
   AZABACHE AZULADO con brillo dorsal frío (gradiente en el componente: luz de
   luna sobre el lomo → sombra ventral casi negra); los ANTEOJOS son AROS
   crema-blancos que BRILLAN suave (la firma que ilumina la cara); el patrón es
   ASIMÉTRICO (único por individuo, como en el animal real: el aro derecho se
   abre y derrama hacia el hocico/pecho). Acentos menta = bioluminiscencia del
   bosque nublado: rim-light tenue en la silueta y esporas que flotan lento. */
export const OSO_ANTEOJOS_PALETA = {
  cuerpo: '#1c1338',        // pelaje azabache azulado (el negro rico aprobado)
  cuerpoLuz: '#332a58',     // brillo dorsal frío (luz de luna sobre el lomo)
  cuerpoSombra: '#0f0a20',  // sombra ventral (casi negro)
  cuerpoGlow: 'rgba(45,255,196,0.22)', // halo menta tenue de la silueta (biopunk medido)
  pecho: '#eafff6',         // la media luna crema del pecho (baja de la garganta)
  pechoSombra: '#bfe8d8',   // borde/penumbra de la media luna
  anteojo: '#eafff6',       // los AROS crema-blancos (LA firma de la especie)
  anteojoGlow: 'rgba(234,255,246,0.85)', // el brillo suave de los aros
  hocico: '#d8b48a',        // hocico corto tan claro (del avatar aprobado)
  hocicoSombra: '#b8946e',  // sombra del morro
  trufa: '#120b1e',         // nariz (casi negra, subtono violeta)
  oreja: '#332a58',         // pabellón interno de la oreja
  ceja: '#cfe8dd',          // cejas nobles (pelo claro que agarra la luz)
  menta: '#2dffc4',         // el acento bioluminiscente de la casa biopunk
  espora: '#9fffe0',        // esporas/luciérnagas del bosque nublado
  planta: '#e4f5ea',        // mitones/plantas (crema frío, no el crema cálido de la abeja)
  garra: '#0f0a20',         // garras (plantígrado con garras, dibujadas chiquitas)
  sombraSuelo: 'rgba(6,10,24,0.42)', // la sombra bajo las plantas (peso real)
};

export const OSO_ANTEOJOS_PROPORCION = {
  troncoRx: 10.8,           // MOLE: el más ancho de la familia (gigante gentil)
  troncoRy: 8.0,
  cabezaR: 6.5,             // cabeza grande, hocico CORTO (anti-perro)
  orejaR: 2.35,             // orejas redondas de peluche
  anteojoR: 2.4,            // radio medio de los aros crema
};

/*
 * PERFIL_OSO_ANTEOJOS — perfil CLIMA→cuerpo para `cuerpoDeClima`
 * (creatureClimaCuerpo.js), pasado vía `opts.perfil` (anti-conflicto: no toca
 * el archivo compartido). Mismos valores que PERFIL_OSO — es el MISMO animal
 * de páramo/bosque altoandino: pelaje que empapa despacio, mole que la niebla
 * apenas difumina, robusto ante la seca. Sin alas. NUNCA suda.
 */
export const PERFIL_OSO_ANTEOJOS = Object.freeze({
  alas: false,
  humedad: 0.7,
  difusa: 0.45,
  sequia: 0.4,
});
