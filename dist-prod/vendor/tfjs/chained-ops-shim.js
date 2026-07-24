/* global tf */
/**
 * chained-ops-shim.js — registra la API "encadenada" de tensores
 * (`tensor.argMax()`, `tensor.cast()`, etc.) sobre el `tf` self-hosted del
 * MODO CAMPO (core+layers+data+backend-wasm — ver src/services/wakeWordService.js).
 *
 * ARCHIVO ESCRITO A MANO (NO se copia desde node_modules — a diferencia de
 * los demás archivos de esta carpeta, `scripts/wake-word/vendor-libs.mjs`
 * NO lo toca; vive aquí porque es parte del self-host, pero es código fuente
 * de Chagra, no un vendor de terceros).
 *
 * POR QUÉ EXISTE: el build oficial de @tensorflow/tfjs-core (`tf-core.min.js`,
 * el mismo que apunta unpkg/jsdelivr) NO registra la API encadenada por
 * defecto — esa parte vive en archivos fuente separados
 * (dist/public/chained_ops/*.js) pensados para bundlers (imports ESM
 * sueltos), no usables como <script> plano. El paquete COMPLETO
 * `@tensorflow/tfjs` sí la registra, pero ese paquete hace `eval()` al
 * cargar (registro de kernels cpu/webgl) y VIOLA la CSP real de Chagra
 * (script-src sin 'unsafe-eval' — ver index.html, Task 112 / incidente
 * #1631). speech-commands SÍ usa la forma encadenada (ej. `y.argMax(-1)`
 * en su loop de reconocimiento) — sin este shim, `transfer.listen()`
 * truena con "argMax is not a function" (de-riskeado en vivo contra la
 * CSP real, scripts/wake-word/train-model.mjs).
 *
 * Genérico y defensivo: envuelve toda función de primer nivel de `tf` como
 * método de instancia de Tensor (si no existe ya), asumiendo la firma común
 * `tf.opName(tensor, ...resto)` — válida para el 100% de los ops
 * elementwise/reducción/forma que existen en TF.js. Bajo riesgo: solo se
 * invocan encadenados los que el código realmente llama así.
 *
 * Cargar DESPUÉS de tf-core/tf-layers/tf-data/tf-backend-wasm y ANTES de
 * speech-commands.min.js.
 */
(function () {
  if (typeof tf === 'undefined' || !tf.Tensor) return;
  var proto = tf.Tensor.prototype;
  Object.keys(tf).forEach(function (name) {
    if (typeof tf[name] !== 'function') return;
    if (proto[name]) return; // ya registrado o nombre reservado
    proto[name] = function () {
      var args = Array.prototype.slice.call(arguments);
      return tf[name].apply(tf, [this].concat(args));
    };
  });
})();
