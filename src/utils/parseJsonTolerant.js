// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * parseJsonTolerant — parser JSON robusto para output de LLMs locales.
 *
 * Los modelos locales en Ollama a veces
 * envuelven el JSON en markdown fences, agregan prosa antes/después, truncan
 * por num_predict, o emiten trailing commas. `JSON.parse` directo rompe en
 * esos casos y la respuesta del agente se pierde, aunque el contenido sea
 * casi-recuperable.
 *
 * Estrategia (en cascada, devuelve el primer parse exitoso):
 *   1. Limpia fences markdown ` ```json ... ``` ` y prosa fuera del balance.
 *   2. Intenta `JSON.parse` directo.
 *   3. Busca el primer `{` o `[` y el último `}` o `]` balanceado y parsea
 *      esa sub-cadena (rescata JSON con prosa pegada).
 *   4. Repara fallas comunes: trailing commas, comillas simples → dobles,
 *      `True`/`False`/`None` (Python) → `true`/`false`/`null`.
 *   5. Trailing brace insertion: si el texto queda con `{` o `[` sin cerrar
 *      (truncado por num_predict), agrega `}` o `]` faltantes y reintenta.
 *
 * Si todas las estrategias fallan, retorna `{ ok: false, error, raw }` —
 * el caller decide si mostrar error al user, fallback texto, o reintentar.
 *
 * NO usa eval ni Function — todo es parser puro.
 *
 * ⚠️ ANTI-ALUCINACIÓN (QUICK-6 #269): las reparaciones SOLO cierran/recortan
 * estructura — NUNCA inventan campos ni valores. Si el modelo trunca un par
 * `"clave":` sin valor, el resultado queda inválido y el parse FALLA
 * (`ok:false`); jamás se rellena con `null`/`""` para "salvar" el objeto. El
 * caller DEBE validar que los campos requeridos existan tras un parse
 * reparado y tratar la ausencia como fallo, no como dato. El flag `repaired`
 * (true cuando `strategy !== 'direct'`) permite loguear telemetría y, si se
 * desea, ser más estricto en la validación de un objeto reparado.
 *
 * @param {string} text - output del LLM (potencialmente "sucio")
 * @returns {{ ok: true, value: unknown, strategy: string, repaired: boolean } | { ok: false, error: string, raw: string }}
 */
export function parseJsonTolerant(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return { ok: false, error: 'empty_input', raw: '' };
  }

  const stripFences = (s) => s.replace(/```(?:json|JSON)?\s*/g, '').replace(/```/g, '').trim();

  /**
   * @param {string} s
   * @param {string} strategy
   * @returns {null | { ok: true, value: unknown, strategy: string, repaired: boolean }}
   */
  const tryParse = (s, strategy) => {
    try {
      return /** @type {const} */ ({ ok: true, value: JSON.parse(s), strategy, repaired: strategy !== 'direct' });
    } catch {
      return null;
    }
  };

  const cleaned = stripFences(text);

  // Strategy 1: parse directo del texto limpio
  const direct = tryParse(cleaned, 'direct');
  if (direct) return direct;

  // Strategy 2: extraer subcadena desde el primer opener (balanceado, o si
  // no, desde el opener hasta el final — para que las siguientes etapas
  // reparen el cierre faltante).
  const startIdx = cleaned.search(/[{[]/);
  const fromOpener = startIdx >= 0 ? cleaned.slice(startIdx) : cleaned;
  const balanced = extractBalanced(cleaned);
  if (balanced) {
    const r = tryParse(balanced, 'balanced_extract');
    if (r) return r;
  }

  // Strategy 3: reparar fallas comunes sobre la subcadena más probable.
  const candidate = balanced || fromOpener;
  const repaired = applyCommonRepairs(candidate);
  const repairResult = tryParse(repaired, 'common_repairs');
  if (repairResult) return repairResult;

  // Strategy 4: agregar cierres faltantes (truncado por num_predict)
  const closed = autoCloseBraces(repaired);
  const closeResult = tryParse(closed, 'auto_close_braces');
  if (closeResult) return closeResult;

  return {
    ok: false,
    error: 'json_unparseable',
    raw: text.length > 500 ? `${text.slice(0, 500)}…` : text,
  };
}

/**
 * Busca el primer carácter de apertura (`{` o `[`) y devuelve la subcadena
 * hasta el cierre balanceado correspondiente, respetando strings escapados.
 *
 * Si nunca se balancea (faltan cierres), devuelve null.
 */
function extractBalanced(s) {
  const startIdx = s.search(/[{[]/);
  if (startIdx === -1) return null;

  const open = s[startIdx];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return s.slice(startIdx, i + 1);
    }
  }
  return null;
}

/**
 * Aplica las reparaciones más comunes en output LLM:
 *   - trailing commas: `,}` → `}`, `,]` → `]`
 *   - comillas simples a dobles (sólo cuando no rompen un string ya válido —
 *     heurística simple: reemplazo en líneas donde no hay `"`)
 *   - keywords Python: True/False/None → true/false/null (whole word)
 */
function applyCommonRepairs(s) {
  if (!s) return s;
  let out = s;

  // trailing commas antes de cierre
  out = out.replace(/,(\s*[}\]])/g, '$1');

  // Python booleans/None → JSON
  out = out.replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null');

  // Comillas simples a dobles solo si no aparecen comillas dobles en la
  // misma línea (heurística defensiva, no perfect pero atrapa el caso común
  // de un modelo que olvida cambiar entre Python-style y JSON).
  out = out.split('\n').map((line) => {
    if (line.includes('"')) return line;
    return line.replace(/'/g, '"');
  }).join('\n');

  return out;
}

/**
 * Si el balance de llaves/corchetes queda abierto (truncado por
 * `num_predict` o stream cortado), añade los cierres faltantes en el orden
 * inverso de apertura. NO inventa valores: si el último token abierto es un
 * string o un par clave-sin-valor, queda inválido y la siguiente etapa
 * fallará — pero al menos lo intenta.
 */
function autoCloseBraces(s) {
  if (!s) return s;
  const stack = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' && stack[stack.length - 1] === '{') stack.pop();
    else if (ch === ']' && stack[stack.length - 1] === '[') stack.pop();
  }

  if (stack.length === 0 && !inString) return s;

  let body = s;
  let suffix = '';

  if (inString) {
    // Quedó un string abierto (truncado mid-value). Lo cerramos tal cual:
    // los caracteres finales son contenido legítimo del string, así que NO
    // recortamos coma/dos-puntos/espacios (estarían DENTRO del string).
    suffix += '"';
  } else {
    // Fuera de string: si terminó con coma o dos puntos colgando (clave sin
    // valor, último elemento truncado), recortar para no dejar sintaxis rota.
    // NOTA: si tras recortar queda un `:` (clave sin valor), el JSON seguirá
    // siendo inválido y el parse fallará — correcto: NO inventamos el valor.
    body = body.replace(/[,:\s]+$/, '');
  }

  while (stack.length > 0) {
    const opener = stack.pop();
    suffix += opener === '{' ? '}' : ']';
  }
  return body + suffix;
}
