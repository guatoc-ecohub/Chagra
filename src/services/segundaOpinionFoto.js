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
  redactarSegundaOpinion,
  coincidenLasLecturas,
  puedeCorrerSegundoPaso,
  habilitarSegundaOpinion,
};
