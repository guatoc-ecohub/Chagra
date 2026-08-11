/*
 * luciernagaIdentidad — LA IDENTIDAD VISUAL DE LA LUCIÉRNAGA, COMO DATOS.
 *
 * Hermana de `zariguyaIdentidad.js` / `jaguarIdentidad.js` / `abejaIdentidad.js`:
 * la LUCIÉRNAGA (cocuyo) tiene aquí su silueta canónica. Rubber-hose (Cuphead +
 * Miss Minutes) con calidez campesina — el MISMO lenguaje de goma de la abeja
 * Angelita (misma familia de personaje-GUÍA), otro animal y otro CARÁCTER:
 * NOCTURNA, científica, y BIOINDICADORA — la que "lee la noche".
 *
 * ── FIDELIDAD DE ESPECIE (el error que NO se puede cometer) ───────────────────
 * La luciérnaga NO es una mosca ni una avispa: es un ESCARABAJO (Coleoptera,
 * familia Lampyridae), pariente de las mariquitas. Dibujarla como escarabajo es
 * innegociable (DR-luciernaga.md):
 *   · ÉLITROS — las alas anteriores endurecidas que cubren el abdomen (con
 *     margen lateral pálido, rasgo de muchas Lampyridae), y alas membranosas
 *     borrosas debajo.
 *   · PRONOTO — el escudo que ENCAPUCHA la cabeza, con borde cálido rojo-coral y
 *     mancha oscura central (patrón real Lampyridae — el rasgo icónico).
 *   · ANTENAS filiformes con bulbo (no mazas de mariposa).
 *   · LA LINTERNA — el órgano bioluminiscente en los últimos segmentos del
 *     abdomen, luz amarillo-verde FRÍA. Es su rasgo estrella y su alma.
 *
 * ── SU FIRMA ES DE FORMA, NO DE COLOR ────────────────────────────────────────
 * Lección de la casa (el borugo fue archivado porque su firma eran las motas
 * crema, que mueren al quitarle el color): la luciérnaga se reconoce en negro
 * sobre blanco por su SILUETA — el pronoto-escudo, los élitros compactos, las
 * antenas filiformes con bulbo y el abdomen que remata en la linterna. El COLOR
 * de la linterna es su alma, pero la silueta la delata aunque esté apagada.
 *
 * ── BIOINDICADORA (el carácter científico del personaje) ──────────────────────
 * Su brillo (o su ausencia) revela la SALUD DEL ENTORNO. Donde brilla fuerte:
 * humedad, vegetación nativa, agua pura, poca luz artificial. Donde se apaga:
 * paisaje seco, iluminado, intervenido. La luz artificial apaga su señal (los
 * machos no ven a las hembras → cae el apareamiento) y su declive global es
 * alarmante — cambio climático, contaminación lumínica, pesticidas. Por eso su
 * LINTERNA es un MEDIDOR VIVO (ver LUCIERNAGA_ESTADOS_ECO): late fuerte cuando
 * el ecosistema está sano, titila débil cuando hay degradación. Es un indicador
 * visual del cambio climático dentro de la app — el mismo espíritu del chivito
 * con el páramo. (DR-luciernaga.md, 2026-07-23; UNAL: 98 especies en Colombia.)
 *
 * Su color de poder es el VERDE-LINTERNA (#c7ff4e) — el amarillo-verde frío de
 * la bioluminiscencia, distinto de los demás: dorado (abeja), púrpura (jaguar),
 * rosa de luna (zarigüeya), menta lunar (oso guardián)…
 *
 * REGLA DE ORO (idéntica a zariguyaIdentidad/jaguarIdentidad): SOLO datos. Cero
 * three, cero react. La creature del bundle base lo importa; jamás debe arrastrar
 * `vendor-three`. La CADENCIA (animación) vive en `creatures.css` (clases
 * `rh-*`/`crt-*`/`luci-*`); el DIBUJO compone el KIT `_rubberhose.jsx`.
 */

/* La tinta cálida del contorno es de TODA la familia rubber-hose. */
export { RH_INK as LUCIERNAGA_TINTA } from './_rubberhose.jsx';

/* Slug estable de la luciérnaga (data-creature, aura, perfiles). ASCII sin
   tilde, como el id del elenco (compai/nucleo/elenco.js) y las capturas
   `valle-compai-*-luciernaga.png`. */
export const LUCIERNAGA_SLUG = 'luciernaga';

/*
 * LUCIERNAGA_FIRMA — EL CONTRATO DE SILUETA, COMO DATOS.
 * Campo `firma` del patrón de identidades, explícito: qué rasgos la hacen
 * reconocible y si sobreviven a que le quiten el color (`forma: true`). La
 * prueba obligatoria es `pruebaSilueta`: la figura rellena de NEGRO sobre
 * BLANCO, sin color ni detalle interno. La luciérnaga NO confía su lectura al
 * verde de la linterna (ese es su alma, no su silueta): se reconoce por la
 * forma de escarabajo con escudo, aunque esté apagada.
 */
export const LUCIERNAGA_FIRMA = Object.freeze({
  rasgos: Object.freeze([
    Object.freeze({
      id: 'pronoto-escudo', forma: true,
      que: 'Pronoto: un escudo ancho que ENCAPUCHA la cabeza como una visera, más ancho que la propia cabeza, con mancha oscura central.',
      porque: 'Es el rasgo diagnóstico de Lampyridae que se lee antes que nada a 64 px: la cabeza no asoma libre, va bajo el escudo. Ningún otro bicho del elenco tiene esa visera.',
    }),
    Object.freeze({
      id: 'elitros-compactos', forma: true,
      que: 'Élitros (alas endurecidas) que forman un cuerpo MACIZO, compacto y achatado —linaje de altura fría—, con sutura central y margen lateral pálido.',
      porque: 'La convierte en escarabajo y no en mosca/abeja: el cuerpo es un caparazón con costura al medio, no un tórax peludo con alas membranosas a la vista.',
    }),
    Object.freeze({
      id: 'linterna-abdomen', forma: true,
      que: 'El abdomen ventral pálido asoma bajo los élitros y remata en la LINTERNA (los últimos segmentos), un lóbulo redondeado.',
      porque: 'La silueta termina en un bulbo bajo el caparazón — la forma del órgano de luz existe aunque la luz esté apagada. Es su alma hecha contorno.',
    }),
    Object.freeze({
      id: 'antenas-filiformes', forma: true,
      que: 'Dos antenas filiformes (hilos finos, no mazas) que nacen bajo el pronoto y rematan en un bulbo pequeño.',
      porque: 'Antena de escarabajo, no de mariposa (maza) ni de abeja (codo). El hilo con bulbo la ancla a Coleoptera.',
    }),
  ]),
  pruebaSilueta: Object.freeze({
    obligatoria: true,
    como: 'Rellenar la figura entera de negro sobre blanco, sin color ni detalle interno, y mirarla a 64 px.',
    contraste: 'abeja/mosca (cuerpo blando con alas membranosas a la vista) y mariposa (antenas en maza)',
    criterio: 'Si se lee como mosca o abeja, la silueta falló: falta el escudo del pronoto o la costura de los élitros.',
  }),
});

/* ── LUCIÉRNAGA — Lampyridae (cocuyo). El escarabajo BIOLUMINISCENTE de la finca:
   cuerpo oscuro compacto de altura fría, pronoto-escudo de borde coral, élitros
   con margen pálido, y la linterna amarillo-verde en el abdomen. Paleta calcada
   del arte aprobado (demos/luciernaga). */
export const LUCIERNAGA_PALETA = {
  tinta: '#140d07',         // el contorno de la cutícula (más hondo que la tinta de casa)
  elitroLuz: '#3d3427',     // luz dorsal del élitro (gradiente)
  elitro: '#2c2418',        // tono medio del élitro
  elitroSombra: '#1e1810',  // sombra ventral del élitro
  elitroBrillo: '#59503c',  // el brillo de volumen sobre cada élitro
  margen: '#c79a52',        // margen lateral pálido (rasgo Lampyridae)
  sutura: '#0e0904',        // la costura central de los élitros
  escutelo: '#1a140c',      // el triangulito entre la base de los élitros
  cabeza: '#241c13',        // la testa oscura bajo el pronoto
  abdomen: '#d8c489',       // el abdomen ventral pálido que asoma
  pronoto: '#df7360',       // el escudo coral (luz)
  pronotoSombra: '#b6473a', // el escudo coral (sombra — gradiente)
  pronotoMancha: '#211a12', // la mancha oscura central del pronoto (patrón real)
  pronotoVentana: '#f0a48c',// las dos ventanas cálidas a los lados de la mancha
  pronotoBorde: '#f6c3b0',  // el reflejo del borde superior del escudo
  cachete: '#e5866a',       // chapetas campesinas (calidez, como la abeja)
  mano: '#efe1af',          // las manitas cálidas de los bracitos
  /* ── LA LINTERNA (su alma) ── */
  linternaNucleo: '#fbffe4',// el corazón blanco-cálido de la luz
  linternaMedio: '#e6ff7a', // el amarillo-verde de la bioluminiscencia
  linternaBorde: '#a9e04a', // el verde del borde de la luz
  haloDentro: '#eaff86',    // el halo grande, centro
  haloFuera: '#8fd23c',     // el halo grande, borde (se desvanece)
  /* ── El verde-linterna (su aura de poder) ── */
  luz: '#c7ff4e',           // VERDE-LINTERNA: el amarillo-verde frío encendido
  chispa: '#eaff86',        // el titileo tierno de esa luz
};

export const LUCIERNAGA_PROPORCION = {
  /* Coordenadas del arte aprobado (viewBox grande): el cuerpo va centrado en el
     origen, la linterna abajo, el pronoto y las antenas arriba. */
  elitroRy: 70,             // medio-alto del caparazón (compacto, achatado)
  elitroRx: 76,             // medio-ancho del caparazón
  pronotoAncho: 66,         // el escudo, MÁS ANCHO que la cabeza (firma)
  cabezaR: 38,              // la testa bajo el escudo
  antenaLargo: 84,          // el hilo filiforme (nace bajo el pronoto)
  linternaY: 150,           // el centro de la linterna en el abdomen
};

/*
 * LUCIERNAGA_ESTADOS_ECO — LA LINTERNA COMO MEDIDOR VIVO DEL ECOSISTEMA.
 *
 * El carácter científico hecho DATOS: cada lectura de la noche que hace la
 * luciérnaga guía tiene un estado de linterna. La CADENCIA de cada uno vive en
 * `creatures.css` como `[data-creature='luciernaga'][data-eco='…']`; este dato
 * dice QUÉ significa cada lectura (para el guion del agente y para quien elija
 * el estado). `normal` es el reposo (no se pasa `eco`): late suave, viva.
 */
export const LUCIERNAGA_ESTADOS_ECO = Object.freeze({
  normal: Object.freeze({
    que: 'Reposo: la linterna late suave y constante. La luciérnaga existe, viva, sin diagnosticar nada aún.',
  }),
  sano: Object.freeze({
    que: 'Ecosistema SANO: late fuerte, grande y regular. Hay humedad, vegetación nativa, agua pura y poca luz artificial — donde las luciérnagas brillan.',
  }),
  leer: Object.freeze({
    que: 'Leyendo la noche: se yergue, las antenas se ponen atentas y la linterna pulsa más rápido mientras mide humedad, agua y luz.',
  }),
  degradado: Object.freeze({
    que: 'Entorno DEGRADADO: la linterna titila débil e irregular, a punto de apagarse — sequía, contaminación lumínica, pérdida de hábitat. El aviso del cambio climático.',
  }),
  pacto: Object.freeze({
    que: 'El pacto de conservar: vuelve a latir fuerte, sostenido y sereno — la promesa de que la próxima generación todavía las vea.',
  }),
});

/*
 * LUCIERNAGA_PRESENCIA — cómo ocupa una escena 3D (el molde es ABEJA_PRESENCIA:
 * mismos campos, otro animal). La luciérnaga VUELA lento y bajo, de noche, y su
 * punto NO es el cuerpo sino la LUZ: por eso ronda cerca del foco como una
 * lucecita. Un pelín más chica que la abeja (bicho menudo cuya presencia es el
 * brillo, no la masa).
 */
export const LUCIERNAGA_PRESENCIA = {
  billboardBase: 46,
  billboardPorEnergia: 12,
  distancia: 7,
  /* Su percha junto al foco (llega VOLANDO lento) y la altura a la que flota. */
  percha: { x: 0.5, y: 0.62, z: 0.65 },
  rondaAltura: 0.6,
  /* Sombra de contacto casi nula: vuela y es de luz, no de peso; solo un
     susurro de sombra cuando baja a posarse. */
  sombra: {
    radio: 0.16,
    opacidad: 0.1,
    opacidadBase: 0.12,
    opacidadMin: 0.04,
    atenuaPorAltura: 0.12,
    ensanchaPorAltura: 0.14,
  },
};

/*
 * PERFIL_LUCIERNAGA — el perfil de CLIMA→cuerpo para `cuerpoDeClima`
 * (creatureClimaCuerpo.js). Mismo shape que PERFIL_ZARIGUYA — se pasa vía la
 * opción `perfil`, así NO hay que tocar el archivo compartido (anti-conflicto).
 *   alas    true  → tiene alas membranosas (bajo los élitros).
 *   humedad 0.2  → PROSPERA con humedad: la lluvia no la apaga, la enciende (al
 *                  revés que el pelo de guardia de la zarigüeya). Poco efecto de
 *                  "empaparse".
 *   difusa  0.85 → bicho diminuto y nocturno: la niebla se la traga casi entera
 *                  (solo queda la lucecita).
 *   sequia  0.95 → la SECA es su mayor amenaza (bioindicador): se le nota de una
 *                  —su hábitat necesita humedad y agua pura—.
 */
export const PERFIL_LUCIERNAGA = Object.freeze({
  alas: true,
  humedad: 0.2,
  difusa: 0.85,
  sequia: 0.95,
});
