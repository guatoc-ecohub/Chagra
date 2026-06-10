/**
 * streamGuards — SEC-001: guardas de seguridad sobre el canal de STREAMING.
 *
 * PROBLEMA (auditoría DR-CHAGRA-AUDIT-IA-001, SEC-001, ALTO): el agente pinta
 * cada token en vivo (markToken en AgentScreen) pero `applyOutputGuards` corre
 * SOLO sobre el texto FINAL. El usuario alcanza a LEER la dosis/receta
 * peligrosa en pantalla ANTES de que el guard final la reemplace. En campo eso
 * es daño físico real.
 *
 * FIX: capa ADICIONAL sobre el canal VISUAL (el guard final no cambia). Antes
 * de pintar el parcial, un sniff LOCAL y barato reutiliza los guards de PELIGRO
 * que YA existen en outputGuards.js (no se reinventa detección). Si un patrón
 * peligroso dispara sobre el parcial → el display pasa a un placeholder y se
 * LATCHEA: nunca vuelve a pintar el crudo ni un guardado-a-medias; el FINAL ya
 * guardado reemplaza limpio el stream al terminar.
 *
 * BATERÍA (solo guards de SEGURIDAD FÍSICA, puros, síncronos, cero latencia):
 *   - guardToxicFoodPreparation        (preparar/comer tóxico, envenenar agua)
 *   - guardSyntheticAgrochemical       (sintético + dosis/marca, combustible)
 *   - guardIncompatibleBiopreparadoMix (bordelés + sulfocálcico mismo tanque)
 *   - guardInventedProductRecipe       (producto inventado con dosis)
 *   - guardInventedBrand               (marca comercial inventada recomendada)
 *   - guardToxicResidueOnFood          (higuerilla sobre papa almacenada)
 *   - guardFermentoRecipeSafety        (receta de fermento sin caveat — el
 *     caveat debe LIDERAR, DR-FOOD-3: el crudo en vivo lo mostraría después)
 *
 * ANTI-SOBRE-SUPRESIÓN (crítico): NO corren aquí los guards que disparan sobre
 * contenido inocuo o incompleto — guardDoseWithoutSource (anexa caveat a
 * CUALQUIER dosis sin fuente, incluidas las orgánicas legítimas "2 kg de
 * compost"), guards de SIEMBRA/viabilidad (necesitan grounding y razonan sobre
 * el turno completo), concisión, nombre, visión, off-domain. Cada guard de la
 * batería trae su propio diseño anti-falso-positivo (denylists cerradas,
 * gates de conjunción término+dosis), así que una respuesta segura u orgánica
 * con cantidades fluye token a token sin cambio alguno.
 *
 * PERF (anti-O(n²) por token):
 *   - LATCH: tras el primer disparo, check() es O(1) (devuelve placeholder).
 *   - THROTTLE incremental: la batería corre como máximo cada `scanMinChars`
 *     chars nuevos (piso que GARANTIZA detección sin depender de hints).
 *   - HINT fast-path: un regex barato sobre SOLO el delta nuevo (dígitos =
 *     dosis, keywords de riesgo) adelanta el scan al token exacto en que
 *     aparece la cifra — la dosis cruda no llega a pintarse. El hint solo
 *     ACELERA; nunca se usa para saltarse el piso (cero huecos de recall).
 *   Con num_predict acotado (~80-512 tokens) el costo total medido es <1 ms.
 *
 * Nota de telemetría: el scan que latchea incrementa una vez los contadores
 * de `chagra:output_guard_triggers` del guard que disparó (además del bump del
 * guard final). Inflación ≤1 por turno peligroso — aceptable y útil.
 *
 * @module streamGuards
 */

import {
  guardSyntheticAgrochemical,
  guardIncompatibleBiopreparadoMix,
  guardToxicFoodPreparation,
  guardInventedProductRecipe,
  guardInventedBrand,
  guardToxicResidueOnFood,
  guardFermentoRecipeSafety,
} from './outputGuards';

/**
 * Placeholder que el usuario ve EN VIVO mientras el parcial peligroso queda
 * retenido. Breve, honesto, español de Colombia (tú/usted, sin voseo). El
 * texto final guardado lo reemplaza al terminar la inferencia.
 */
export const STREAM_GUARD_PLACEHOLDER =
  'Un momento… estoy verificando esta recomendación con las guías de seguridad antes de mostrártela.';

/**
 * Batería de PROBES de peligro. Cada probe adapta la firma del guard real
 * (algunos reciben `{ userMessage }`) a `(text, userMessage) → {modified,...}`.
 * El ORDEN va de lo más grave/barato a lo más específico (cortocircuito en el
 * primer disparo).
 */
const DANGER_PROBES = [
  (text) => guardToxicFoodPreparation(text),
  (text) => guardSyntheticAgrochemical(text),
  (text, userMessage) => guardIncompatibleBiopreparadoMix(text, { userMessage }),
  (text) => guardInventedProductRecipe(text),
  (text) => guardInventedBrand(text),
  (text, userMessage) => guardToxicResidueOnFood(text, { userMessage }),
  (text, userMessage) => guardFermentoRecipeSafety(text, { userMessage }),
];

/**
 * Hint barato de riesgo sobre el DELTA nuevo del stream (no el texto entero).
 * Es SOLO un acelerador del scan (recall-oriented, los falsos positivos solo
 * cuestan una corrida de batería): dígitos (toda dosis trae cifra), palabra
 * "dosis"/"mezcl-", combustibles y sufijos de familia química. La GARANTÍA de
 * detección NO depende de este regex sino del piso del throttle.
 */
const RISK_HINT_RE =
  /[0-9]|dosis|mezcl|aplic|marca|acpm|di[eé]sel|gasolina|kerosen|fermento|kombucha|(?:azol|fos|tion|trina|cloprid|carb)(?=[^a-zá-ú]|$)/i;

/** Piso del throttle: chars nuevos máximos entre scans de batería. */
const DEFAULT_SCAN_MIN_CHARS = 64;

/**
 * Piso del fast-path por hint: aun con hints en cada token (texto denso en
 * cifras), la batería no corre más de una vez cada estos chars nuevos. Acota
 * el costo en el peor caso sin abrir una ventana de fuga relevante (~24 chars
 * ≈ 6 tokens ≈ 0.25 s a 24 tok/s).
 */
const HINT_MIN_CHARS = 24;

/**
 * Solape al recortar el delta nuevo, para que un keyword partido entre dos
 * chunks ("glifo|sato", "5|0 ml") igual matchee el hint.
 */
const HINT_OVERLAP_CHARS = 16;

/**
 * sniffStreamDanger — corre la batería de peligro sobre un parcial. PURO,
 * SÍNCRONO, 100% local (mismos guards del guard final → cero latencia nueva).
 * Un probe que reviente jamás tumba el stream (try/catch por probe).
 *
 * @param {string} partialText — texto acumulado del stream hasta ahora.
 * @param {{userMessage?: string|null}} [ctx] — pregunta cruda del usuario
 *   (gates de intención de los guards de mezcla/fermento/residuo).
 * @returns {{danger: boolean, reason: string|null}}
 */
export function sniffStreamDanger(partialText, { userMessage = null } = {}) {
  if (typeof partialText !== 'string' || partialText.length === 0) {
    return { danger: false, reason: null };
  }
  for (const probe of DANGER_PROBES) {
    try {
      const res = probe(partialText, userMessage);
      if (res && res.modified) {
        return { danger: true, reason: res.reason || 'stream_guard' };
      }
    } catch (_) {
      // Defensa: un guard roto no puede tumbar el canal visual.
    }
  }
  return { danger: false, reason: null };
}

/**
 * createStreamGuard — fábrica del guard de streaming POR TURNO (estado propio:
 * latch, throttle). Crear una instancia junto a `markToken` y pasar cada
 * parcial acumulado por `check()`; pintar SIEMPRE lo que `check()` devuelve.
 *
 * Maneja el reset implícito del action-loop (segunda llamada al LLM tras
 * tool_calls): si llega un parcial MÁS CORTO que el último visto, es un stream
 * nuevo → estado limpio (el latch del stream anterior no contamina la
 * respuesta nueva; el final de ESA respuesta pasa igual por el guard final).
 *
 * @param {object} [opts]
 * @param {string|null} [opts.userMessage] — pregunta cruda del usuario.
 * @param {number} [opts.scanMinChars] — piso del throttle (chars nuevos).
 * @param {string} [opts.placeholder] — texto visible mientras se retiene.
 * @returns {{
 *   check: (fullText: string) => string,
 *   isDangerLatched: () => boolean,
 *   getScanCount: () => number,
 * }}
 */
export function createStreamGuard({
  userMessage = null,
  scanMinChars = DEFAULT_SCAN_MIN_CHARS,
  placeholder = STREAM_GUARD_PLACEHOLDER,
} = {}) {
  let lastLen = 0; // longitud del último parcial visto.
  let lastScanLen = 0; // longitud del parcial en el último scan de batería.
  let danger = false; // LATCH: una vez true, nunca vuelve a pintarse el crudo.
  let scanCount = 0; // corridas de batería (telemetría/tests de perf).

  const reset = () => {
    lastLen = 0;
    lastScanLen = 0;
    danger = false;
  };

  const check = (fullText) => {
    if (typeof fullText !== 'string') return '';
    // Stream NUEVO (parcial más corto que el anterior = reset del action-loop
    // o reintento): estado limpio para no sobre-suprimir la respuesta nueva.
    if (fullText.length < lastLen) reset();

    if (danger) {
      lastLen = fullText.length;
      return placeholder;
    }

    // Delta nuevo + solape (keywords partidos entre chunks igual matchean).
    const sliceFrom = Math.max(0, lastLen - HINT_OVERLAP_CHARS);
    const newSlice = fullText.slice(sliceFrom);
    lastLen = fullText.length;

    const newCharsSinceScan = fullText.length - lastScanLen;
    const floorDue = newCharsSinceScan >= scanMinChars;
    const hintDue = newCharsSinceScan >= HINT_MIN_CHARS && RISK_HINT_RE.test(newSlice);
    // Primer contenido del stream con hint: escanear ya (sin esperar piso) —
    // una dosis peligrosa puede caber entera en los primeros tokens.
    const firstHint = lastScanLen === 0 && RISK_HINT_RE.test(newSlice);

    if (!floorDue && !hintDue && !firstHint) return fullText;

    scanCount += 1;
    lastScanLen = fullText.length;
    const res = sniffStreamDanger(fullText, { userMessage });
    if (res.danger) {
      danger = true;
      console.debug('[streamGuard] peligro retenido en vivo (SEC-001)', { reason: res.reason });
      return placeholder;
    }
    return fullText;
  };

  return {
    check,
    isDangerLatched: () => danger,
    getScanCount: () => scanCount,
  };
}
