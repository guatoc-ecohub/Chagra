/**
 * segundaOpinionFoto — EL DIAGNÓSTICO EN DOS PASOS.
 *
 * Decisión del operador (2026-07-26), tomada sobre la medición de esta casa:
 *
 *   > *"`qwen3.5:4b` responde de una para que el usuario no espere, y
 *   > `qwen3-vl:4b` revisa después y avisa si encuentra algo que el primero
 *   > pasó por alto."*
 *
 * Sale de que los errores de los dos modelos son de **tipo opuesto**, medido
 * sobre 19 fotos reales de matas (`scripts/bench-vision-matas.mjs`):
 *
 *   · `qwen3.5:4b`  — nunca alarma de más (sanas 8/8) pero **dejó pasar** la
 *                     broca del café: *"es una semilla o fruto, no una plaga"*.
 *   · `qwen3-vl:4b` — **no deja pasar ninguna enferma** (11/11) pero alarma de
 *                     más, y cuesta 2,3× más tiempo.
 *
 * O sea: el segundo cubre justo el hueco del primero. Por eso no hay que
 * elegir entre 2,75 s y no dejar pasar la broca.
 *
 * ═══ LAS REGLAS DE LA VOZ (esto es lo delicado, no el código) ════════════
 *
 * 1. **La primera respuesta es LA respuesta.** Llega rápido y es la que el
 *    usuario lee. El segundo paso no la reemplaza.
 * 2. **Si coincide, silencio TOTAL.** Nada de "revisé otra vez y sí". Un
 *    compañero que confirma lo que ya dijo es ruido.
 * 3. **Si discrepa, DUDA — no corrige.** *"Me quedé mirando otra vez su
 *    foto…"*. La duda es del compAI, no un error señalado al primero. Es un
 *    compañero, no un corrector.
 * 4. **Con confianza y con qué mirar** (SPEC decisión #3). Un diagnóstico
 *    equivocado sobre una mata real hace daño: la confianza no es adorno, es
 *    lo que evita que el usuario tome como cierto algo que el modelo adivinó.
 *    Y la segunda opinión es creíble **porque la primera nunca sonó tan
 *    segura**.
 * 5. **Mismo canal** (SPEC decisión #2): si le habló, por voz; si escribió,
 *    por texto. La segunda opinión no cambia de canal a mitad de camino.
 * 6. **Sin señal no promete nada** (SPEC decisión #4). Si el segundo paso no
 *    puede correr, no se anuncia: se dice que por ahora es lo que hay.
 *
 * ═══ LA RESTRICCIÓN DE MÁQUINA, MEDIDA (no supuesta) ═════════════════════
 *
 * En la M6000 de 12 GiB los dos modelos **conviven** — `qwen3.5:4b` (6,0 GB)
 * + `qwen3-vl:4b` (4,8 GB) = 9691 de 12288 MiB — y el chat sigue contestando
 * en 0,70 s. **PERO sólo si las llamadas van serializadas.**
 *
 * Disparando la segunda opinión EN PARALELO con el embebedor del RAG
 * (`nomic-embed-text`), medido en `alpha` el 2026-07-26: **el chat pineado FUE
 * DESALOJADO** y el siguiente mensaje pagó **8,56 s de recarga**. Serializado:
 * 0,70 s. Por eso este módulo tiene un cerrojo de un-solo-vuelo y comprueba
 * que el modelo de chat siga residente antes de disparar. No es prudencia
 * teórica: es un desalojo reproducido dos veces.
 *
 * @module services/segundaOpinionFoto
 */

/* Un solo vuelo: JAMÁS dos llamadas de segunda opinión a la vez, y nunca
   compitiendo con otra carga de modelo. El desalojo del chat se produce por
   concurrencia, no por tamaño. */
let enVuelo = false;

/** Para poder apagarlo entero (tests, modo campo, batería). */
let habilitado = true;
export function habilitarSegundaOpinion(v = true) { habilitado = Boolean(v); }
export function segundaOpinionEnVuelo() { return enVuelo; }

/**
 * ¿Las dos lecturas dicen lo mismo? Comparación por VEREDICTO, no por texto:
 * dos frases distintas que concluyen lo mismo NO son una discrepancia, y
 * avisar de ellas sería exactamente el ruido que la regla 2 prohíbe.
 *
 * @param {string} primera
 * @param {string} segunda
 * @returns {boolean}
 */
export function coincidenLasLecturas(primera, segunda) {
  const v = (t) => {
    const s = String(t || '').toLowerCase();
    if (!s.trim()) return null;
    const iMal = s.search(/enferm|plaga|hongo|plagad|da[ñn]ad|plaga|infest|mancha|pudric/);
    const iBien = s.search(/\bsana\b|\bsano\b|saludable|sin problema|no (se )?(ve|observa|aprecia)/);
    if (iMal < 0 && iBien < 0) return null;
    if (iMal < 0) return 'sana';
    if (iBien < 0) return 'problema';
    return iMal < iBien ? 'problema' : 'sana';
  };
  const a = v(primera);
  const b = v(segunda);
  // Si alguna no se deja leer, se trata como coincidencia: ante la duda,
  // CALLAR. Un aviso disparado por un parseo fallido asusta sin motivo.
  if (!a || !b) return true;
  return a === b;
}

/**
 * Arma lo que el compAI dice cuando la segunda mirada no coincide.
 *
 * Pura y exportada a propósito: la voz del personaje es lo que hay que poder
 * probar. Nunca desmiente al primero — duda en primera persona, pone la
 * confianza por delante y termina en **qué mirar para confirmarlo**, que es
 * lo que convierte un diagnóstico en algo accionable en vez de un veredicto.
 *
 * @param {Object} p
 * @param {string} p.hallazgo — lo que vio la segunda mirada.
 * @param {string} [p.queMirar] — la seña concreta para confirmar en campo.
 * @param {'baja'|'media'|'alta'} [p.confianza='media']
 * @returns {string}
 */
export function redactarSegundaOpinion({ hallazgo, queMirar, confianza = 'media' } = {}) {
  const que = String(hallazgo || '').trim().replace(/^[.\s]+|[.\s]+$/g, '');
  if (!que) return '';
  // La apertura SIEMPRE es una duda propia, nunca "me equivoqué" ni "en
  // realidad": el compAI se quedó pensando, no está corrigiendo a nadie.
  const apertura = 'Me quedé mirando otra vez su foto';
  const matiz = {
    baja: 'y no estoy segura, pero me quedó la duda de si',
    media: 'y ahora me parece que',
    alta: 'y creo que sí vale la pena que mire esto:',
  }[confianza] || 'y ahora me parece que';
  const cuerpo = confianza === 'alta' ? `${que}` : `${que.charAt(0).toLowerCase()}${que.slice(1)}`;
  const cierre = queMirar
    ? ` Para salir de dudas, ${String(queMirar).trim().replace(/\.$/, '')}.`
    : ' Écheles un ojo con calma antes de aplicar nada.';
  return `${apertura} ${matiz} ${cuerpo}.${cierre}`;
}

/**
 * Convierte el hallazgo crudo del PRIMER paso (`analyzeFoliage`, que devuelve
 * `{score, issues[], treatment_suggestion}`) en la frase que se compara con la
 * segunda lectura. Sin esto se estarían comparando peras con manzanas: JSON
 * contra prosa.
 *
 * @param {{issues?: string[], score?: number}|null} hallazgo
 * @returns {string}
 */
export function lecturaDesdeHallazgo(hallazgo) {
  if (!hallazgo) return '';
  const issues = Array.isArray(hallazgo.issues) ? hallazgo.issues.filter(Boolean) : [];
  if (issues.length) return `ENFERMA. ${issues.join('; ')}`;
  // Sin problemas listados, el primer paso está diciendo que la ve sana.
  return 'SANA. No se observa problema.';
}

/* Fórmulas con las que el modelo se cubre: si aparecen, la confianza BAJA.
   Se leen de SUS palabras, no se inventan — la confianza que se le dice al
   usuario tiene que salir de algo, o es adorno (SPEC decisión #3). */
const DUDA = /no estoy segur|no se distingue|no se aprecia con claridad|no es (del todo )?clar|dif[íi]cil de|posiblemente|podr[íi]a|puede que|tal vez|quiz[áa]s?|parece(r[íi]a)? que|sospech|aparent/i;
/* Y las que indican que lo vio sin dudar. */
const CERTEZA = /claramente|con claridad|evidente|sin duda|definitivamente|inconfundible|es clar[oa] que|se observa n[íi]tid/i;
/* El arranque de la seña de campo: la frase que le dice al usuario QUÉ mirar.
   Va anclada al principio de la oración para no cazar un "mire" a mitad de
   una descripción. */
const SENA = /^(?:y\s+)?(?:f[íi]jese|revise|mire|obs[eé]rve|observe|busque|compruebe|verifique|confirme|[áa]bral|abra|levante|raspe|corte|toque|acerque|compare|para confirmar|para salir de dudas|le sugiero|le recomiendo|recomiendo|sugiero)\b/i;

/**
 * De la respuesta CRUDA del segundo modelo a las tres piezas con las que habla
 * el compAI: `{hallazgo, queMirar, confianza}`.
 *
 * Es el `extraer` que `pedirSegundaOpinion` recibe por parámetro. Sin él la
 * segunda opinión salía como un bloque de texto del modelo pegado tal cual —
 * y el SPEC pide justo lo contrario: **qué vio, qué mirar para confirmarlo, y
 * qué tan seguro está** (decisión #3).
 *
 * ⚠️ Lo primero que hace es **quitar el bloque `<think>`**: `qwen3-vl:4b`
 * IGNORA `think:false` y razona igual (medido — es lo que vaciaba las
 * respuestas cuando el presupuesto era corto). Ese razonamiento no es para el
 * usuario; si se colara, el compAI le leería en voz alta su propio monólogo.
 *
 * Tolerante a las dos formas en que contesta: veredicto + descripción + seña
 * en tres líneas, o todo junto en un párrafo.
 *
 * @param {string} crudo
 * @returns {{hallazgo: string, queMirar: string|null, confianza: 'baja'|'media'|'alta'}}
 */
export function extraerDeRevision(crudo) {
  const texto = String(crudo || '')
    // El monólogo del modelo, fuera. Con y sin cierre (respuesta truncada).
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/<think>[\s\S]*$/i, ' ')
    // Etiquetas que a veces repite del propio prompt.
    .replace(/^\s*l[íi]nea\s*\d\s*[:.-]\s*/gim, '')
    .trim();

  const confianza = DUDA.test(texto) ? 'baja' : CERTEZA.test(texto) ? 'alta' : 'media';

  // Un renglón que es SÓLO el veredicto no aporta nada al usuario: ya se lo
  // dice la frase de apertura. Se descarta.
  const soloVeredicto = /^\W*(sana|sano|enferma|enfermo|saludable)\W*$/i;
  const lineas = texto
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter((l) => l && !soloVeredicto.test(l));

  if (lineas.length >= 2) {
    // Si la última línea es la seña de campo, se separa; si no, todo es hallazgo.
    const ultima = lineas[lineas.length - 1];
    if (SENA.test(ultima)) {
      return { hallazgo: lineas.slice(0, -1).join(' '), queMirar: despuntar(ultima), confianza };
    }
    return { hallazgo: lineas.join(' '), queMirar: null, confianza };
  }

  const unico = lineas[0] || '';
  if (!unico) return { hallazgo: '', queMirar: null, confianza };

  // Todo en un párrafo: se busca la oración que da la seña de campo.
  const oraciones = unico.split(/(?<=[.;!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const i = oraciones.findIndex((s) => SENA.test(s));
  if (i > 0) {
    return {
      hallazgo: oraciones.slice(0, i).join(' '),
      queMirar: despuntar(oraciones.slice(i).join(' ')),
      confianza,
    };
  }
  return { hallazgo: unico, queMirar: null, confianza };
}

/* La seña se va a insertar tras "Para salir de dudas, …": se le quita su
   propio arranque imperativo y la mayúscula para que no quede "Para salir de
   dudas, Fíjese si…". */
function despuntar(s) {
  const t = String(s || '').trim().replace(/^y\s+/i, '');
  return t ? `${t.charAt(0).toLowerCase()}${t.slice(1)}`.replace(/\.$/, '') : '';
}

/**
 * ¿Se puede correr el segundo paso ahora mismo? Comprueba, en este orden:
 * red, que no haya otro vuelo, y que el modelo de chat siga residente (si se
 * fue, la GPU está peleada y meter otra carga sólo empeora las cosas).
 *
 * @param {Object} [deps] — inyectables para test.
 * @returns {Promise<{puede: boolean, razon: string}>}
 */
export async function puedeCorrerSegundoPaso({
  enLinea = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
  modelosResidentes = null,
  modeloChat = null,
} = {}) {
  // OJO: aquí NO se mira `enVuelo`. El cerrojo lo toma `pedirSegundaOpinion`
  // de forma síncrona antes de llamar a esta función — si se comprobara aquí,
  // que es async, dos llamadas simultáneas pasarían las dos.
  if (!habilitado) return { puede: false, razon: 'apagada' };
  if (!enLinea()) return { puede: false, razon: 'sin-senal' };
  if (typeof modelosResidentes === 'function' && modeloChat) {
    try {
      const vivos = await modelosResidentes();
      if (Array.isArray(vivos) && vivos.length && !vivos.includes(modeloChat)) {
        // El chat NO está residente: la GPU ya está apretada. Pedir la
        // segunda opinión ahora es empujar el desalojo que se midió.
        return { puede: false, razon: 'gpu-apretada' };
      }
    } catch {
      /* si no se puede consultar, se sigue: el peor caso es una carga más */
    }
  }
  return { puede: true, razon: 'ok' };
}

/**
 * Pide la segunda mirada, EN SEGUNDO PLANO, y avisa SÓLO si discrepa.
 *
 * Nunca lanza y nunca bloquea: si algo falla, el usuario se queda con la
 * primera respuesta —que es la buena por diseño— y no se entera de nada. Es
 * lo correcto: el segundo paso es una red de seguridad, no una promesa.
 *
 * @param {Object} p
 * @param {string} p.primeraLectura — lo que ya se le dijo al usuario.
 * @param {Function} p.mirarDeNuevo — `async () => string`: la llamada al
 *   modelo de visión. La inyecta el caller para no acoplar este módulo a la
 *   pipeline (y para poder testear sin GPU).
 * @param {Function} p.avisar — `(texto, {canal}) => void`. Sólo se llama si
 *   hay discrepancia REAL.
 * @param {'voz'|'texto'} [p.canal='texto'] — el mismo por el que preguntó.
 * @param {Function} [p.extraer] — de la respuesta cruda a
 *   `{hallazgo, queMirar, confianza}`. Por defecto, la respuesta entera.
 * @param {Object} [p.guardas] — se pasa a `puedeCorrerSegundoPaso`.
 * @returns {Promise<{aviso: string|null, razon: string}>}
 */
export async function pedirSegundaOpinion({
  primeraLectura,
  mirarDeNuevo,
  avisar,
  canal = 'texto',
  extraer = (crudo) => ({ hallazgo: crudo, queMirar: null, confianza: 'media' }),
  guardas = {},
} = {}) {
  /* EL CERROJO SE TOMA ANTES DE CUALQUIER `await`. Si se comprobara dentro de
     `puedeCorrerSegundoPaso` —que es async— dos llamadas simultáneas pasarían
     las dos la guarda antes de que ninguna marcara el vuelo, y se dispararían
     DOS cargas de modelo a la vez: exactamente la concurrencia que desaloja el
     chat pineado (medido: 8,56 s de recarga). Lo cazó su propio test. */
  if (enVuelo) return { aviso: null, razon: 'ya-hay-una' };
  enVuelo = true;
  try {
    const permiso = await puedeCorrerSegundoPaso(guardas);
    if (!permiso.puede) return { aviso: null, razon: permiso.razon };
    const crudo = await mirarDeNuevo();
    if (!crudo || !String(crudo).trim()) return { aviso: null, razon: 'sin-respuesta' };
    // REGLA 2: si coinciden, callado. Ni un "confirmado".
    if (coincidenLasLecturas(primeraLectura, crudo)) {
      return { aviso: null, razon: 'coinciden' };
    }
    const { hallazgo, queMirar, confianza } = extraer(crudo) || {};
    const texto = redactarSegundaOpinion({ hallazgo, queMirar, confianza });
    if (!texto) return { aviso: null, razon: 'sin-texto' };
    // REGLA 5: el mismo canal por el que preguntó, sin sorpresas de audio.
    if (typeof avisar === 'function') avisar(texto, { canal });
    return { aviso: texto, razon: 'discrepa' };
  } catch {
    // Degrada en silencio: la primera respuesta ya cumplió.
    return { aviso: null, razon: 'error' };
  } finally {
    enVuelo = false;
  }
}

export default {
  pedirSegundaOpinion,
  lecturaDesdeHallazgo,
  extraerDeRevision,
  redactarSegundaOpinion,
  coincidenLasLecturas,
  puedeCorrerSegundoPaso,
  habilitarSegundaOpinion,
};
