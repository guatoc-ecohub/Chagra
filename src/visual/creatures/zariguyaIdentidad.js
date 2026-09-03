/*
 * zariguyaIdentidad — LA IDENTIDAD VISUAL DE LA ZARIGÜEYA, COMO DATOS.
 *
 * Hermana de `dantaIdentidad.js` / `borugoIdentidad.js` / `jaguarIdentidad.js`:
 * la ZARIGÜEYA (chucha, fara, runcho — Didelphis, el marsupial nocturno de la
 * finca andina) tiene aquí su silueta canónica. Rubber-hose (Cuphead + Miss
 * Minutes) con calidez campesina — el MISMO lenguaje de goma de la abeja, el
 * oso y la danta, otro animal y otro CARÁCTER: NOCTURNA, husmeadora, humilde y
 * MADRE. LA QUE CARGA: sale de noche, limpia la huerta de babosas, insectos y
 * roedores, dispersa semillas de frutales… y hace todo eso con las CRÍAS AL
 * LOMO.
 *
 * ── SU FIRMA ES DE FORMA, NO DE COLOR ────────────────────────────────────────
 * Lección dura de la casa: el borugo fue archivado porque su firma eran las
 * MOTAS CREMA — un rasgo que muere al quitarle el color. La zarigüeya no
 * depende de un solo pigmento: sus cuatro rasgos diagnósticos son SILUETA pura
 * y sobreviven al test de negro sobre blanco (ver ZARIGUYA_FIRMA abajo):
 *   1. LAS CRÍAS AL LOMO — el contorno se llena de bultos escalonados. Ninguna
 *      otra criatura del elenco tiene esa línea de espalda. Es la firma mayor,
 *      y no es capricho: es conducta real (cuando ya no caben en el marsupio
 *      viajan agarradas al pelo del lomo de la madre).
 *   2. HOCICO LARGO Y PUNTIAGUDO — una cuña que sale de la cabeza, no un morro.
 *   3. COLA PRENSIL DESNUDA que nace BAJA en la grupa, barre el suelo y remata
 *      en GANCHO enroscado — la S que ningún armadillo tiene (la del gurre es
 *      cónica y rígida).
 *   4. OREJAS GRANDES, redondas y desnudas, altas en el contorno.
 * Y la POSTURA: husmea ERGUIDA, incorporada sobre los cuartos traseros (masa
 * VERTICAL). El gurre escarba pegado al suelo (masa HORIZONTAL). Ese contraste
 * de eje es lo que los separa a 64 px — el error que hundió el primer intento
 * (PR #2613: "la zarigüeya deja de ser el gurre") fue dibujarla horizontal.
 *
 * Su color de poder es el ROSA DE LUNA (el rosado desnudo de sus orejas, su
 * trufa y su cola, encendido de noche) — distinto de los demás: dorado (abeja),
 * menta lunar (oso guardián), verde-zen (rana), celeste (colibrí), púrpura
 * (jaguar), ámbar (ardilla), turquesa (perezoso), ámbar-rojizo (morrocoy),
 * verde semilla (danta), celeste de altura (cóndor), cobalto (dálmata) y canela
 * (beagle). Nadie tenía el rosa: es el color de la que carga.
 *
 * REGLA DE ORO (idéntica a dantaIdentidad/faunaAndina): SOLO datos. Cero three,
 * cero react. La creature del bundle base lo importa; jamás debe arrastrar
 * `vendor-three`. La CADENCIA (animación) vive en `creatures.css` (clases
 * `rh-*`/`crt-*`/`zari-*`); el DIBUJO compone el KIT `_rubberhose.jsx`; el
 * CLIMA→cuerpo, en `creatureClimaCuerpo.js` (consumiendo PERFIL_ZARIGUYA). El
 * aura de poder (rosa de luna) vive en `transformacion.js` (AURA_POR_BICHO) y
 * su perfil idle en `creatureIdle.js` — este archivo NO los duplica.
 */

/* La tinta cálida del contorno es de TODA la familia rubber-hose. */
export { RH_INK as ZARIGUYA_TINTA } from './_rubberhose.jsx';

/* Slug estable de la zarigüeya (data-creature, aura, ropa, perfiles). ASCII sin
   diéresis, como el id del roster nocturno de CriaturasNocturnas.jsx. */
export const ZARIGUYA_SLUG = 'zariguya';

/*
 * ZARIGUYA_FIRMA — EL CONTRATO DE SILUETA, COMO DATOS.
 *
 * Campo `firma` del patrón de identidades, hecho explícito: qué rasgos hacen
 * reconocible a este personaje y —lo que importa— si sobreviven a que le
 * quiten el color. La prueba obligatoria de la casa es `pruebaSilueta`: la
 * misma figura rellena de NEGRO sobre BLANCO, sin color ni detalle interno. Si
 * la criatura necesita su pigmento para reconocerse, la silueta falló y se
 * rehace (ese fue el veredicto del borugo, cuya firma eran las motas crema).
 */
export const ZARIGUYA_FIRMA = Object.freeze({
  /* Los rasgos, en orden de peso en el contorno. `forma: true` = sobrevive al
     negro sobre blanco; `forma: false` sería un rasgo dependiente del color
     (prohibido como firma principal). */
  rasgos: Object.freeze([
    Object.freeze({
      id: 'crias-al-lomo', forma: true,
      que: 'Tres crías escalonadas sobre el lomo: el contorno de la espalda deja de ser una curva limpia y se vuelve una escalerita de bultos con valles entre ellos.',
      porque: 'Ninguna otra criatura del elenco tiene esa línea de espalda; a 64 px se lee antes que cualquier detalle. Y es conducta real: cuando no caben en el marsupio, viajan agarradas al pelo del lomo.',
    }),
    Object.freeze({
      id: 'hocico-cuna', forma: true,
      que: 'Hocico largo y puntiagudo que sale de la cabeza como una cuña (más largo que el radio del cráneo), con la trufa al final.',
      porque: 'Convierte la cabeza redonda en una punta: la lectura de "marsupial" empieza ahí.',
    }),
    Object.freeze({
      id: 'cola-prensil', forma: true,
      que: 'Cola desnuda que nace BAJA en la grupa, barre el suelo y remata en gancho enroscado (una S larga con espiral).',
      porque: 'Es el rasgo que la separa del gurre, cuya cola es corta, cónica y rígida. Naciendo alta se leía como un ala flotando — el error del primer intento.',
    }),
    Object.freeze({
      id: 'orejas-grandes', forma: true,
      que: 'Dos orejas grandes, redondas y desnudas, altas y separadas en el contorno de la cabeza.',
      porque: 'Contra la oreja tubular y chica del armadillo. Redondas y grandes = marsupial.',
    }),
    Object.freeze({
      id: 'postura-erguida', forma: true,
      que: 'Husmea INCORPORADA sobre los cuartos traseros, con el eje del cuerpo en diagonal y las manitos recogidas contra el pecho.',
      porque: 'Masa VERTICAL contra la masa HORIZONTAL del gurre que escarba. La acción diferencia antes que la forma.',
    }),
  ]),
  /* La prueba que hay que pasar antes de entregar (no es decorativa: es el
     gate). `contraste` nombra a la criatura de la que hay que diferenciarse. */
  pruebaSilueta: Object.freeze({
    obligatoria: true,
    como: 'Rellenar la figura entera de negro sobre blanco, sin color ni detalle interno, y mirarla a 64 px.',
    contraste: 'gurre / armadillo (Dasypus novemcinctus): masa horizontal baja con lomo rígido y cola cónica',
    criterio: 'Si no se reconoce sin color, la silueta falló y se rehace.',
  }),
});

/* ── ZARIGÜEYA — Didelphis (chucha/fara/runcho). El marsupial NOCTURNO de la
   finca: pelaje ceniza de guardia largo y desgreñado sobre lanilla clara, CARA
   PÁLIDA (la máscara blancuzca del hocico contra el antifaz oscuro de los
   ojos), orejas y cola DESNUDAS de piel rosada. Humilde, trabajadora, madre. */
export const ZARIGUYA_PALETA = {
  cuerpo: '#8a8073',        // pelaje ceniza cálido (guardia gris sobre lanilla)
  cuerpoGlow: 'rgba(138,128,115,0.6)',
  lomo: '#6b6257',          // el dorso, un tono más hondo (donde van las crías)
  panza: '#c9bda4',         // lanilla clara del vientre (asoma bajo el guardia)
  guardia: '#5d554b',       // los pelos de guardia largos que rompen la silueta
  cara: '#f3e8d2',          // LA CARA PÁLIDA del marsupial (máscara clara)
  antifaz: '#5d554b',       // la banda oscura que le cruza los ojos
  oreja: '#3b322b',         // oreja desnuda oscura (grande y redonda)
  orejaPiel: '#e9a3bb',     // el rosado desnudo del interior de la oreja
  trufa: '#e8879b',         // la trufa rosada al final de la cuña del hocico
  cola: '#d9b4a4',          // la COLA DESNUDA (piel, no pelo): rosada-parda
  colaBase: '#6b6257',      // la base PELUDA de la cola (la ancla al cuerpo)
  mitones: '#f0e2c6',       // manitos/pies claros (el mitón de la casa)
  cria: '#9a9083',          // las crías, un pelín más claras que la madre
  /* ── La que carga (el rosa de luna) ── */
  luna: '#ff9ecb',          // su aura de poder: el rosado desnudo encendido
  rocio: '#ffd9ec',         // el brillo tierno de ese rosa (chispas de noche)
};

export const ZARIGUYA_PROPORCION = {
  troncoRx: 7.6,            // cuerpo en pera, ERGUIDO (eje mayor vertical)
  troncoRy: 8.8,
  cabezaR: 4.5,
  orejaR: 2.75,             // orejas GRANDES y redondas (firma)
  hocicoLargo: 7.2,         // la CUÑA: más larga que el radio del cráneo (firma)
  colaLargo: 15.0,          // la S prensil que barre el suelo (firma)
  criaR: 2.5,               // el bultito de cada cría sobre el lomo (firma)
  crias: 3,                 // cuántas viajan al lomo por defecto
};

/*
 * ZARIGUYA_PRESENCIA — cómo ocupa una escena 3D (el molde es ABEJA_PRESENCIA:
 * mismos campos, otro animal). La diferencia de fondo: la zarigüeya CAMINA
 * POR EL PISO — `percha.y` y `rondaAltura` son la altura del CENTRO de su
 * billboard sobre el SUELO mientras trota (cuerpo bajito de marsupial), no
 * una altura de vuelo. Se ENCARAMA cuando el foco está en alto (sube al
 * hotspot como a un tronco) — eso lo decide su coreografía
 * (ZariguyaCompaiEscena), no estos números.
 */
export const ZARIGUYA_PRESENCIA = {
  /* Billboard <Html>: px base + ganancia por energía (0..1) y el
     distanceFactor con el que la cámara la escala. Un pelo más grande que la
     abeja (mamífero con tres crías encima). */
  billboardBase: 52,
  billboardPorEnergia: 10,
  distancia: 7,
  /* Su percha junto al foco (llega TROTANDO, no volando) y la altura del
     centro del billboard mientras anda por el piso. */
  percha: { x: 0.55, y: 0.16, z: 0.7 },
  rondaAltura: 0.16,
  /* Sombra de contacto: pegada a ella casi siempre (anda por el suelo); solo
     se atenúa/ensancha cuando se encarama a un hotspot en alto. */
  sombra: {
    radio: 0.3,
    opacidad: 0.26,
    opacidadBase: 0.3,
    opacidadMin: 0.12,
    atenuaPorAltura: 0.08,
    ensanchaPorAltura: 0.1,
  },
};

/*
 * PERFIL_ZARIGUYA — el perfil de CLIMA→cuerpo para `cuerpoDeClima`
 * (creatureClimaCuerpo.js). Mismo shape que PERFIL_DANTA/PERFIL_BORUGO — se
 * pasa vía la opción `perfil`, así NO hay que tocar el archivo compartido
 * (anti-conflicto).
 *   alas    false → sin aleteo (velocidadAlas siempre 1).
 *   humedad 0.8  → el pelo de guardia se empapa rápido y se apelmaza (se le ve
 *                  el cuerpo flaco bajo el pelo mojado: es lo que pasa de
 *                  verdad).
 *   difusa  0.7  → bicho chico y nocturno: la niebla se la traga.
 *   sequia  0.35 → oportunista total (come de todo): la seca casi no la toca.
 */
export const PERFIL_ZARIGUYA = Object.freeze({
  alas: false,
  humedad: 0.8,
  difusa: 0.7,
  sequia: 0.35,
});
