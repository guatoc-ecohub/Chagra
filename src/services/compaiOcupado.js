/**
 * compaiOcupado — ¿EL CAMPESINO ESTÁ A MITAD DE ALGO?
 *
 * La señal `ocupado` existía en el motor desde el principio
 * (`angelitaInteligencia.debeHablar`: *"Nunca interrumpe a mitad de una tarea,
 * salvo urgencia real"* — la lección Clippy hecha código) y **ninguna pantalla
 * la alimentaba**. Este módulo es el sensor que faltaba.
 *
 * Es prerrequisito duro del paseo por la pantalla, no un extra: sin él, un
 * compAI que se mueve el 35% del tiempo va a interrumpir a alguien escribiendo.
 *
 * DOS FUENTES, y ninguna cuesta un timer:
 *
 *   1. **Automática, a demanda**: se lee `document.activeElement` en el
 *      momento de preguntar. Si el foco está en un campo de texto, un
 *      `select`, o algo editable, el usuario está escribiendo. Cero
 *      listeners, cero suscripciones, cero fugas — la respuesta se calcula
 *      cuando alguien pregunta y no un milisegundo antes.
 *   2. **Explícita**: lo que el DOM no puede ver — grabando voz, un
 *      formulario a medio llenar, una foto subiendo. La pantalla lo declara
 *      con `marcarOcupado('voz', true)` y lo suelta al terminar. Es un
 *      conjunto de razones: dos pantallas pueden ocuparlo a la vez sin
 *      pisarse, y sólo queda libre cuando todas soltaron.
 *
 * REGLA: esto NO decide si el compAI habla — sólo informa. Quien decide sigue
 * siendo `debeHablar`, que ya sabe dejar pasar la urgencia real.
 *
 * @module services/compaiOcupado
 */

/** Razones activas de ocupación explícita. Vacío = nadie lo reclamó. */
const razones = new Set();

/** Etiquetas cuyo foco significa "está escribiendo". */
const CAMPOS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Tipos de `<input>` que NO son escritura: tocar un checkbox o un botón no es
 * estar a mitad de una frase.
 */
const INPUTS_NO_ESCRITURA = new Set([
  'button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'range', 'color',
]);

/**
 * ¿Hay un campo de escritura enfocado ahora mismo?
 * @param {Document} [doc] — inyectable para tests.
 * @returns {boolean}
 */
export function escribiendo(doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  const el = d?.activeElement;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (!CAMPOS.has(tag)) return false;
  if (tag === 'INPUT') {
    const tipo = String(el.getAttribute('type') || 'text').toLowerCase();
    if (INPUTS_NO_ESCRITURA.has(tipo)) return false;
  }
  return true;
}

/**
 * Declara (o suelta) una ocupación que el DOM no puede ver: grabar voz, subir
 * una foto, un formulario a medio llenar.
 * @param {string} razon — id estable de quien ocupa ('voz', 'foto', 'form:mata'…).
 * @param {boolean} [ocupado=true]
 */
export function marcarOcupado(razon, ocupado = true) {
  if (!razon) return;
  if (ocupado) razones.add(razon);
  else razones.delete(razon);
}

/** Suelta TODAS las ocupaciones explícitas. Para desmontajes y tests. */
export function liberarOcupacion() {
  razones.clear();
}

/** Las razones activas ahora mismo (diagnóstico / telemetría). */
export function razonesOcupado() {
  return [...razones];
}

/**
 * LA PREGUNTA: ¿el campesino está a mitad de algo?
 * @param {Document} [doc]
 * @returns {boolean}
 */
export function estaOcupado(doc) {
  return razones.size > 0 || escribiendo(doc);
}

export default { estaOcupado, marcarOcupado, liberarOcupacion, escribiendo, razonesOcupado };
