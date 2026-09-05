/*
 * aterrizajeDescenso — el FINAL del descenso: dónde frena, qué se le dice al
 * usuario cuando frena, y quién se lo dice. Dato puro (cero three, cero React).
 *
 * PASO 4 del diseño `DISENO-TRANSICION-CLIMAS-20260902.md`. Tres reglas duras
 * que este módulo existe para hacer cumplir:
 *
 * 1. 🔴 LA FASE ENSO SE LEE VIVA, NUNCA DE UNA CONSTANTE. `ensoService.js` es la
 *    fuente única (GR-9, auditoría 2026-06-10) y se alimenta del sidecar
 *    NOAA/IDEAM. `ENSO_WATCH_2026` de `ensoContext.js` es un SNAPSHOT de DR,
 *    útil como contexto documentado y venenoso como fuente: el operador reporta
 *    "El Niño moderado · ONI 1.4" en dev mientras esa constante dice "Neutral
 *    con vigilancia". Si las dos difieren, la viva manda.
 *
 * 2. 🔴 EL NIÑO EN PISO FRÍO HACE **MÁS** HELADAS, NO MENOS. Es la corrección
 *    del climatólogo (§7.2) y no es un matiz de redacción: es la diferencia
 *    entre un consejo útil y un consejo PELIGROSO para una finca a 2 200 m. El
 *    cielo despejado del Niño aumenta la pérdida de calor nocturna y dispara la
 *    helada; el Niño 2015-16 costó ~25 000 t de papa por esto (IDEAM/Cenicafé,
 *    DR-MISSION-4). Lo visualmente obvio —"más sol, más calor"— es lo
 *    incorrecto. La ciencia de respaldo NO se inventa acá: sale literal de
 *    `REGION_IMPACTS` vía `ensoRegionalLine()`, y este módulo solo elige QUÉ
 *    consejo corresponde al piso del usuario.
 *
 * 3. 🔴 EL COMPAI SE LEE, NUNCA SE ESCRIBE. El compañero del usuario es el suyo
 *    en toda la app; el relevo por piso es de PRESENTACIÓN, temporal y local a
 *    esta pantalla. Basta un `escribirCompanero()` de más para que alguien
 *    salga del descenso con otro compañero (riesgo 6 del diseño). Este módulo
 *    no importa `escribirCompanero`: no puede llamarlo ni por accidente.
 *
 * Y la regla de siempre: SIN DATO NO SE INVENTA. Sin ubicación confirmada el
 * viaje para en la banda templada y lo DICE; sin clima del día no se pinta un
 * clima (regla ya escrita en `clima-vivo.js`).
 */
import { getEnsoPhase } from '../../../services/ensoService.js';
import { ensoRegionalLine } from '../../../services/ensoContext.js';
/*
 * ⚠️ DOS `ensoFamily` EN EL REPO, CON VOCABULARIOS DISTINTOS — y hay que usar
 * la buena. `services/ensoContext.js` normaliza con `startsWith('nino')`, o sea
 * entiende los slugs del sidecar (`nino_fuerte`) pero **NO** los del servicio
 * canónico: `ensoFamily('el_nino')` devuelve **'neutral'**. Medido acá el
 * 2026-09-02. `compai/nucleo/ensoCanal.js` usa `includes` y entiende los dos.
 *
 * Este módulo usa la de `ensoCanal` y le pasa a `ensoRegionalLine` la familia
 * ya normalizada — que es el mismo apaño que `ClimaBoletinScreen.jsx:704` hace
 * en línea. Es el patrón «control ciego por identificador»: el mismo concepto
 * escrito de dos formas, y el chequeo que falla en silencio.
 */
import { ensoFamily } from '../../../compai/nucleo/ensoCanal.js';
import { COMPANERO_DEFECTO, ELENCO, leerCompanero } from '../../../compai/nucleo/elenco.js';
import { pisoPorAltitud } from '../pisosTermicos.js';
import { COTA_SIN_UBICACION } from './descensoSierra.js';

/* ─────────────────────────── la fase, siempre viva ─────────────────────────── */

/**
 * La fase ENSO que manda. Envuelve `getEnsoPhase()` para que ningún consumidor
 * del descenso tenga excusa para leer la constante. Si el servicio falla,
 * 'neutral' — que es la fase que no da consejo fuerte, no una fase inventada.
 */
export function faseEnsoViva() {
  try {
    const f = getEnsoPhase();
    return typeof f === 'string' && f ? f : 'neutral';
  } catch {
    return 'neutral';
  }
}

/* ──────────────── la línea de El Niño, MODULADA POR PISO ─────────────────── */

/*
 * Las dos lecturas que el diseño fija (§7.3), cada una con el mecanismo por el
 * que es cierta. Son cortas a propósito: la ciencia larga (con su cita) viaja
 * aparte en `respaldo`, para el chip pedagógico, no en la línea de la pantalla.
 */
const CONSEJO_ENSO = {
  el_nino: {
    frio: {
      titular: 'El Niño. Va a llover menos — y va a helar MÁS de madrugada, no menos.',
      accion: 'Guarde agua para el riego nocturno.',
      mecanismo:
        'El cielo despejado deja escapar el calor de noche: por eso el piso frío se hiela justo cuando hace más sol de día.',
    },
    calido: {
      titular: 'El Niño. Más calor y menos lluvia.',
      accion: 'Riego por goteo, mulch y sombrío en lo joven.',
      mecanismo: 'Menos nubes de día es más sol directo sobre la hoja y más agua que se va por evaporación.',
    },
  },
  la_nina: {
    frio: {
      titular: 'La Niña. Más lluvia y suelo saturado.',
      accion: 'Cuide el drenaje en ladera y vigile la gota en la papa.',
      mecanismo: 'La nube baja y engorda: menos helada, pero el agua no alcanza a irse y el hongo encuentra su clima.',
    },
    calido: {
      titular: 'La Niña. Más lluvia de la habitual.',
      accion: 'Revise drenajes y no siembre en lo que se encharca.',
      mecanismo: 'El aire llega más húmedo del mar y descarga antes de subir.',
    },
  },
};

/** Los pisos donde la paradoja de la helada aplica (§7.2: altiplano frío). */
const PISOS_FRIOS = new Set(['frio', 'paramo', 'superparamo', 'nival']);

/**
 * ¿Qué se le dice a ESTE usuario, en SU piso, con la fase que hay hoy?
 *
 * @param {object} [opts]
 * @param {string} [opts.fase]    fase viva; si falta se lee de `ensoService`.
 * @param {string} [opts.pisoId]  id de piso (`pisosTermicos.PISOS_TERMICOS`);
 *                                si falta se trata como piso no frío.
 * @param {string} [opts.region]  región de `regionFromProfile()`, para el respaldo.
 * @returns {{fase, familia, esPisoFrio, titular, accion, mecanismo, respaldo}}
 *          En fase neutral `titular` es '' (no se fuerza ruido) y el respaldo
 *          trae el mensaje de vigilancia de la región, si la hay.
 */
export function lineaEnsoPorPiso({ fase, pisoId, region = 'andina' } = {}) {
  const f = fase ?? faseEnsoViva();
  const familia = ensoFamily(f); // 'nino' | 'nina' | 'neutral' (el normalizador bueno)
  const esPisoFrio = PISOS_FRIOS.has(pisoId);
  // Se le pasa la FAMILIA, no la fase: `ensoRegionalLine` normaliza por dentro
  // con el `startsWith` frágil, y 'el_nino' se le cae a 'neutral'.
  const respaldo = ensoRegionalLine(familia, region); // literal del DR, no inventado

  const clave = familia === 'nino' ? 'el_nino' : familia === 'nina' ? 'la_nina' : null;
  if (!clave) {
    return { fase: f, familia, esPisoFrio, titular: '', accion: '', mecanismo: '', respaldo };
  }
  const grupo = CONSEJO_ENSO[clave];
  const c = esPisoFrio ? grupo.frio : grupo.calido;
  return { fase: f, familia, esPisoFrio, ...c, respaldo };
}

/* ───────────────────── el aterrizaje: dónde y qué se dice ───────────────── */

/**
 * Resuelve el aterrizaje completo. NUNCA inventa: sin cota confirmada para en
 * la banda templada y lo declara; sin clima del día no describe un clima.
 *
 * @param {object} [opts]
 * @param {number|string|null} [opts.msnmUsuario]  cota real de la finca; se
 *                                        acepta string numérico por defensa.
 * @param {{descripcion?: string, temperatura?: number}|null} [opts.clima]
 *                                        { descripcion, temperatura } del dato
 *                                        vivo, o null si no hay.
 * @param {string} [opts.fase]            fase ENSO viva.
 * @param {string} [opts.region]          región para el respaldo del DR.
 */
export function resolverAterrizaje({ msnmUsuario = null, clima = null, fase, region = 'andina' } = {}) {
  const hay =
    msnmUsuario !== null &&
    msnmUsuario !== undefined &&
    msnmUsuario !== '' &&
    Number.isFinite(Number(msnmUsuario)) &&
    Number(msnmUsuario) >= 0;

  const cota = hay ? Number(msnmUsuario) : COTA_SIN_UBICACION;
  const piso = pisoPorAltitud(cota);
  const pisoId = piso?.id ?? 'templado';

  const enso = lineaEnsoPorPiso({ fase, pisoId, region });

  // La línea del clima de hoy: solo si el dato existe. Ni una palabra si no.
  let lineaClima = '';
  if (hay && clima && (clima.descripcion || Number.isFinite(clima.temperatura))) {
    const trozos = [];
    if (clima.descripcion) trozos.push(String(clima.descripcion));
    if (Number.isFinite(clima.temperatura)) trozos.push(`${Math.round(clima.temperatura)}°`);
    lineaClima = `Hoy en su predio: ${trozos.join(', ')}.`;
  }

  const lineaCota = hay
    ? `${Math.round(cota).toLocaleString('es-CO')} m · su predio`
    : 'sin su ubicación todavía';

  const lineaPiso = hay && piso ? `Está en el piso ${piso.nombre.toLowerCase()}.` : '';

  return {
    conUbicacion: hay,
    cota,
    piso,
    pisoId,
    lineaCota,
    lineaClima,
    lineaPiso,
    enso,
  };
}

/* ───────────────────── compai: SOLO LECTURA, sin excepción ──────────────── */

/*
 * El mapeo banda → anfitrión de §8.4, con las decisiones del operador ya
 * aplicadas:
 *   · banda 4 (bosque de niebla) = `chivito-punk`, NO `angelita`. El operador
 *     lo decidió y manda sobre el criterio técnico; además es la opción
 *     ecológicamente más estricta que el propio diseño marcaba como alterna
 *     (la abeja a 2 000–3 000 m está en el borde de su rango, no en su centro).
 *   · bandas 1 y 2 SIN anfitrión: nadie del elenco vive sobre 4 000 m. Fingir
 *     pertenencia sería peor que el vacío, y el vacío ES la lección.
 *   · banda 7 (aterrizaje): cierra el compai del usuario, siempre.
 */
const ANFITRION_POR_BANDA = Object.freeze({
  nival: null,
  superparamo: null,
  paramo: 'oso-baston',
  frio: 'chivito-punk',
  templado: 'zariguya',
  calido_seco: 'jaguar',
  playa: 'guacamaya',
});

/** Una idea causal por banda. No narran el paisaje: entregan un mecanismo. */
const IDEA_POR_BANDA = Object.freeze({
  nival: '',
  superparamo: 'Aquí ya casi nada aguanta.',
  paramo:
    'Aquí el frailejón le peina el agua a la nube y la suelta despacio. Por eso su quebrada tiene agua en verano.',
  frio:
    'Esta nube no está encima: usted está adentro. Aquí el aire se enfría lo justo para soltar el agua.',
  templado: 'Aquí abajo el aire ya viene tibio y cargado. Por eso el café quiere sombra.',
  calido_seco: 'Menos altura, menos agua. Lo que crece aquí aprendió a esperar.',
  playa: 'Al pie de la montaña el mar le pone el agua al aire que sube.',
});

/**
 * El compañero del usuario. **SOLO LECTURA.** Este módulo no importa
 * `escribirCompanero`, así que no puede escribirlo ni por accidente.
 */
export function companeroDelUsuario(storage) {
  try {
    return leerCompanero(storage) || COMPANERO_DEFECTO;
  } catch {
    return COMPANERO_DEFECTO;
  }
}

/**
 * Quién enseña en esta banda, y cómo se lee.
 *
 * Regla de colisión (§8.4): si el anfitrión de la banda ES el compai del
 * usuario, NO hay relevo — nunca se le presenta a alguien como visita a su
 * propio compañero. Y el compai del usuario no desaparece jamás: viaja en
 * `companero` en todas las bandas, incluidas las que no tienen anfitrión.
 */
export function anfitrionDeBanda(bandaId, companero) {
  const suyo = companero || COMPANERO_DEFECTO;
  const candidato = ANFITRION_POR_BANDA[bandaId] ?? null;
  const existe = candidato != null && Object.prototype.hasOwnProperty.call(ELENCO, candidato);
  const anfitrion = existe && candidato !== suyo ? candidato : null;
  return {
    companero: suyo,
    anfitrion,
    hayRelevo: anfitrion != null,
    idea: IDEA_POR_BANDA[bandaId] ?? '',
    // El rótulo del patrón `QueEsEsto`: "X vino a contarle".
    rotulo: anfitrion ? `${ELENCO[anfitrion]?.nombre ?? anfitrion} vino a contarle` : '',
  };
}

/** El elenco de anfitriones, para tests y para el gate. */
export const ANFITRIONES = ANFITRION_POR_BANDA;
