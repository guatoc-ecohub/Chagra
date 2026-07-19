/*
 * atmosferaVivaData — el ARCO CONTINUO del día andino + la TEMPORADA bimodal
 * (datos puros, sin three). Pieza A4 del ciclo día-vivo.
 *
 * cielosHoraData ya trae seis franjas discretas del día; este módulo las
 * convierte en un DÍA QUE GIRA: keyframes anclados a horas decimales que se
 * interpolan suave (el sol no salta de "mañana" a "mediodía": sube). Y agrega
 * lo que a la finca le faltaba para respirar con el reloj REAL del campesino:
 *
 *   1. LA MADRUGADA (4-6 am) como momento propio — azul frío pre-alba, la
 *      niebla más pesada del día, rocío pleno, el gallo y LA COCINA ENCENDIDA
 *      (a las 4:30 ya hay tinto). Es la hora a la que el campesino de verdad
 *      abre la app antes de salir al campo; hoy el valle lo recibía con la
 *      misma hora eterna de siempre.
 *
 *   2. LA TEMPORADA según el régimen REAL colombiano. Aquí NO hay primavera ni
 *      otoño: el año andino es BIMODAL — temporada de LLUVIA ("invierno":
 *      verde intenso, charcos, cielo cargado que se come las estrellas) y
 *      temporada SECA ("verano": pasto amarillo, polvo en el camino, cielo
 *      limpio que deja ver lejos). Esa distinción es de identidad: en Colombia
 *      "invierno" es lluvia, no nieve.
 *
 * FORMA DEL PRESET: la misma de CIELOS_HORA (fondo/cielo/suelo/luz/relleno/
 * niebla/sombra + intensidades + solPos + niebla near/far + estrellas +
 * luciernagas) MÁS los extras vivos que un mundo puede leer para vestirse:
 *
 *   rocio     0..1  — brillo húmedo del amanecer (la mañana lo quema)
 *   ventanas  0..1  — la casa encendida (noche y madrugada del tinto)
 *   gallo     0..1  — la hora del gallo (gancho para audio/UI; dato, no sonido)
 *   calina    0..1  — el aire que vibra del mediodía (heat shimmer sugerido)
 *
 * Y tras aplicar temporada:
 *
 *   pasto     hex   — el color del pasto/follaje de la temporada (verde
 *                     intenso en lluvia, amarillo paja en seca)
 *   charcos   0..1  — agua empozada en el camino (lluvia)
 *   polvo     0..1  — polvo seco levantado (verano)
 *   cargado   0..1  — cielo encapotado (apaga estrellas y aplana la luz)
 *
 * Todo es string+número interpolable: lo consumen el hook (useAtmosferaViva),
 * el componente r3f (AtmosferaViva), el 2D digno o un test, sin pagar three.
 * La única aritmética es mezclaHex (reusada de cielosHoraData).
 */
import { CIELOS_HORA, mezclaHex } from '../cielosHoraData.js';

/* ------------------------------------------------------------------ */
/* FRANJAS — las seis horas del campesino (mapa A4, hora decimal 0..24) */
/* ------------------------------------------------------------------ */

export const FRANJAS_VIVAS = [
  'madrugada',
  'manana',
  'mediodia',
  'tarde',
  'atardecer',
  'noche',
];

/**
 * Franja viva de una hora decimal. A diferencia de franjaDeHoraDecimal
 * (cielosHoraData), aquí la MADRUGADA existe como momento propio: 4-6 am,
 * la hora real del campesino, no un pedazo de "noche".
 * @param {number} h hora decimal 0..24
 * @returns {'madrugada'|'manana'|'mediodia'|'tarde'|'atardecer'|'noche'}
 */
export function franjaViva(h) {
  const x = ((h % 24) + 24) % 24;
  if (x < 4) return 'noche';
  if (x < 6) return 'madrugada';
  if (x < 11) return 'manana';
  if (x < 15) return 'mediodia';
  /* Crepúsculo ecuatorial CORTO (misma verdad que franjaDeHoraDecimal): el
     sol se esconde ~18:00-18:15 todo el año y a las 18:40 ya es noche —
     el atardecer andino es una franja breve, no una hora europea. */
  if (x < 17.5) return 'tarde';
  if (x < 18.6) return 'atardecer';
  return 'noche';
}

/* ------------------------------------------------------------------ */
/* MADRUGADA — el preset nuevo (los demás keyframes reusan CIELOS_HORA) */
/* ------------------------------------------------------------------ */

/* Azul frío pre-alba: todavía no hay sol (la "luz" es el cielo mismo que
   clarea por el oriente), la niebla del valle está en su punto más pesado
   (near 3.5: la quebrada se come el fondo) y quedan estrellas despidiéndose.
   El rebote de suelo casi negro: la tierra aún no devuelve nada. */
export const MADRUGADA = {
  fondo: '#27334f',
  cielo: '#31436b',
  suelo: '#141a24',
  luz: '#8fa7cf',
  relleno: '#3d4f76',
  niebla: '#22304c',
  sombra: '#04060c',
  intensidad: 0.62,
  hemisferio: 0.36,
  ambiente: 0.16,
  sol: 0.4,
  rellenoInt: 0.14,
  solPos: /** @type {[number, number, number]} */ ([8, 1.2, 5]),
  nieblaCerca: 3.5,
  nieblaLejos: 20,
  estrellas: 0.5,
  luciernagas: 0.25,
};

/* ------------------------------------------------------------------ */
/* EL ARCO — keyframes del día completo, interpolados suave             */
/* ------------------------------------------------------------------ */

/** Completa un preset base con los extras vivos (default 0 + override). */
const vivo = (base, extras = {}) => ({
  rocio: 0,
  ventanas: 0,
  gallo: 0,
  calina: 0,
  ...base,
  ...extras,
});

/* Cada parada del día, anclada a su hora decimal. Entre la última (20:00,
   noche temprana con la casa encendida) y la primera (03:00, noche honda con
   las ventanas ya casi apagadas) el arco cruza la medianoche interpolando:
   la casa se va durmiendo y el rocío se va formando SOLO, sin keyframe extra.
   El orden por `hora` es contrato (presetVivoDeHora lo recorre en orden). */
export const ARCO_DIA = [
  /* noche honda: casi todos duermen, el rocío ya se asienta */
  { hora: 3.0, preset: vivo(CIELOS_HORA.noche, { rocio: 0.35, ventanas: 0.2 }) },
  /* LA MADRUGADA: el gallo, el tinto, la niebla más pesada del día */
  { hora: 4.6, preset: vivo(MADRUGADA, { rocio: 1, ventanas: 1, gallo: 1 }) },
  /* amanecer durazno: el sol asoma rasante, el rocío brilla */
  { hora: 6.0, preset: vivo(CIELOS_HORA.amanecer, { rocio: 0.7, ventanas: 0.35, gallo: 0.55 }) },
  /* mañana dorada baja: la niebla se quema, sombras largas de trabajo */
  { hora: 8.5, preset: vivo(CIELOS_HORA.manana, { rocio: 0.15 }) },
  /* mediodía: sol vertical casi blanco, sombras cortas, el aire vibra */
  { hora: 13.0, preset: vivo(CIELOS_HORA.mediodia, { calina: 1 }) },
  /* la tarde: la luz se dora otra vez — el mejor momento del páramo */
  { hora: 16.0, preset: vivo(CIELOS_HORA.tarde) },
  /* atardecer naranja/violeta: la niebla vuelve a subir de la quebrada */
  { hora: 18.4, preset: vivo(CIELOS_HORA.atardecer, { ventanas: 0.5 }) },
  /* noche temprana: luna, estrellas de montaña, la casa encendida */
  { hora: 20.0, preset: vivo(CIELOS_HORA.noche, { rocio: 0.1, ventanas: 1 }) },
];

/* Campos de color del preset vivo (los demás se interpolan como número). */
const CAMPOS_COLOR = ['fondo', 'cielo', 'suelo', 'luz', 'relleno', 'niebla', 'sombra'];

/**
 * Interpola dos presets VIVOS hacia t (0=a, 1=b): colores por canal, solPos
 * componente a componente y CUALQUIER otro campo numérico linealmente (a
 * diferencia de mezclarPresets de cielosHoraData, aquí los campos numéricos
 * se descubren del preset — los extras vivos viajan sin lista blanca).
 * @param {Record<string, any>} a
 * @param {Record<string, any>} b
 * @param {number} t 0..1
 */
export function mezclarVivos(a, b, t) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const campo of Object.keys(a)) {
    const va = a[campo];
    if (CAMPOS_COLOR.includes(campo)) out[campo] = mezclaHex(va, b[campo], t);
    else if (campo === 'solPos') out[campo] = va.map((v, i) => v + (b.solPos[i] - v) * t);
    else if (typeof va === 'number') out[campo] = va + (b[campo] - va) * t;
    else out[campo] = t < 0.5 ? va : b[campo];
  }
  return out;
}

/**
 * El preset CONTINUO de una hora decimal cualquiera: encuentra el tramo del
 * arco y mezcla sus dos keyframes con smoothstep (las transiciones respiran,
 * no marcan esquinas). Es la función madre del día-vivo: llamarla con la hora
 * real cada minuto hace que el valle amanezca solo.
 * @param {number} h hora decimal 0..24 (se normaliza)
 * @returns {Record<string, any>} preset vivo interpolado (nueva alocación)
 */
export function presetVivoDeHora(h) {
  const H = ((h % 24) + 24) % 24;
  const inicio = ARCO_DIA[0].hora;
  /* eje desplazado para que el arco sea monótono: [inicio, inicio+24) */
  const x = H < inicio ? H + 24 : H;
  for (let i = 0; i < ARCO_DIA.length; i++) {
    const a = ARCO_DIA[i];
    const b = ARCO_DIA[(i + 1) % ARCO_DIA.length];
    const ha = a.hora;
    const hb = i + 1 < ARCO_DIA.length ? b.hora : b.hora + 24; // cierre por medianoche
    if (x >= ha && x < hb) {
      const t = (x - ha) / (hb - ha);
      const suave = t * t * (3 - 2 * t); // smoothstep
      return mezclarVivos(a.preset, b.preset, suave);
    }
  }
  return { ...ARCO_DIA[0].preset }; // inalcanzable (el arco cubre las 24 h)
}

/* ------------------------------------------------------------------ */
/* TEMPORADA — el régimen bimodal colombiano (lluvia / seca)            */
/* ------------------------------------------------------------------ */

/*
 * Cada temporada es un MODIFICADOR sobre el preset de la hora, no una paleta
 * aparte: el mismo día gira, pero bajo un cielo distinto. Campos:
 *   tinteCielo/pesoCielo — mezcla de fondo+cielo+niebla hacia el gris cargado
 *   tinteSuelo/pesoSuelo — el rebote de tierra (verde hondo vs paja)
 *   solF/intensidadF     — la lluvia aplana la luz; el verano la abre
 *   nieblaCercaF/LejosF  — lluvia acerca el fog (aire de agua); seca lo aleja
 *   estrellasF           — el cielo cargado se come las estrellas
 *   luciernagasF         — la humedad las alegra; el polvo seco las apaga
 *   pasto                — hex del follaje/pasto de temporada (para mundos)
 *   charcos/polvo/cargado— extras 0..1 que el mundo puede vestir
 */
export const TEMPORADAS = {
  lluvia: {
    nombre: 'lluvia',
    tinteCielo: '#93a49b',
    pesoCielo: 0.38,
    tinteSuelo: '#46663a',
    pesoSuelo: 0.32,
    solF: 0.78,
    intensidadF: 0.92,
    nieblaCercaF: 0.8,
    nieblaLejosF: 0.72,
    estrellasF: 0.15,
    luciernagasF: 1.15,
    pasto: '#3f7d2f',
    charcos: 1,
    polvo: 0,
    cargado: 1,
  },
  seca: {
    nombre: 'seca',
    tinteCielo: '#e8ddb8',
    pesoCielo: 0.06,
    tinteSuelo: '#a3894c',
    pesoSuelo: 0.35,
    solF: 1.05,
    intensidadF: 1.03,
    nieblaCercaF: 1.2,
    nieblaLejosF: 1.35,
    estrellasF: 1,
    luciernagasF: 0.7,
    pasto: '#b7a24e',
    charcos: 0,
    polvo: 1,
    cargado: 0,
  },
};

/**
 * Aplica una temporada al preset de la hora. Devuelve un preset nuevo con los
 * campos de temporada montados (pasto/charcos/polvo/cargado/temporada).
 * @param {Record<string, any>} p preset vivo (presetVivoDeHora)
 * @param {'lluvia'|'seca'} [temporada='seca']
 */
export function aplicarTemporada(p, temporada = 'seca') {
  const t = TEMPORADAS[temporada] || TEMPORADAS.seca;
  return {
    ...p,
    fondo: mezclaHex(p.fondo, t.tinteCielo, t.pesoCielo),
    cielo: mezclaHex(p.cielo, t.tinteCielo, t.pesoCielo),
    niebla: mezclaHex(p.niebla, t.tinteCielo, t.pesoCielo),
    suelo: mezclaHex(p.suelo, t.tinteSuelo, t.pesoSuelo),
    sol: p.sol * t.solF,
    intensidad: p.intensidad * t.intensidadF,
    nieblaCerca: p.nieblaCerca * t.nieblaCercaF,
    nieblaLejos: p.nieblaLejos * t.nieblaLejosF,
    estrellas: p.estrellas * t.estrellasF,
    luciernagas: p.luciernagas * t.luciernagasF,
    pasto: t.pasto,
    charcos: t.charcos,
    polvo: t.polvo,
    cargado: t.cargado,
    temporada: t.nombre,
  };
}

/* Meses (0-based, Date.getMonth) de temporada de LLUVIA en el altiplano
   cundiboyacense: régimen bimodal — mar-abr-may y sep-oct-nov. El resto
   (dic-feb y el veranillo jun-ago) es temporada seca. Es un default honesto
   para el páramo de Choachí; una finca en otro régimen puede pasar la
   temporada explícita por prop y este mapa no manda. */
export const MESES_LLUVIA = [2, 3, 4, 8, 9, 10];

/**
 * Temporada según la fecha real (régimen bimodal andino).
 * @param {Date} [fecha]
 * @returns {'lluvia'|'seca'}
 */
export function temporadaDeFecha(fecha = new Date()) {
  return MESES_LLUVIA.includes(fecha.getMonth()) ? 'lluvia' : 'seca';
}

/**
 * EL preset completo del momento vivo: hora continua + temporada aplicada.
 * Una llamada, un objeto listo para pintar luces, fog y paleta.
 * @param {number} h hora decimal 0..24
 * @param {'lluvia'|'seca'} [temporada]
 */
export function presetAtmosferaViva(h, temporada = 'seca') {
  return aplicarTemporada(presetVivoDeHora(h), temporada);
}
