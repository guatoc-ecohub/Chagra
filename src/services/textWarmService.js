/**
 * textWarmService.js — pre-warm de los modelos de texto Ollama on-login.
 * AGPL-3.0 © Chagra
 *
 * QUICK-4 (Tier S iter 2, 2026-05-27): la primera query texto al chat agente
 * cold-startea ~50s porque Ollama carga el modelo bajo demanda. Para llevarla
 * a ~5s, disparamos un POST `/api/generate` con prompt vacío y
 * `keep_alive: '10m'` al login success (fire-and-forget, mientras el operador
 * navega del LoginScreen al dashboard tarda ~5-15s humanos).
 *
 * Modelos warmeados:
 *   - `gemma3:4b`           — modelo primario chat agente (4B params, ~3 GB VRAM).
 *     Nota: `useOllamaWarmStore` (NN4 fix) ya lo warmea con keep_alive=30m.
 *     Este servicio NO duplica esa request — corre lock interno y la
 *     primera llamada exitosa marca el timestamp; pero por defecto el
 *     caller debe usar el store cuando aplique gemma3 dedicado al
 *     agente. Aquí lo incluimos por idempotencia y para escenarios en
 *     los que el store esté offline (ej. tests, alternativos).
 *   - `granite3.1-dense:8b` — modelo secundario ranking #1 bench 2026-05-24
 *     (56% AH, 0 alucinaciones). Se invoca desde llmRouter cuando la query
 *     es sensible a alucinación. ~5.5 GB VRAM.
 *
 * Constraint VRAM (M6000 12 GB): la suma de gemma3:4b + granite3.1-dense:8b
 * (~8.5 GB) deja ~3.5 GB para vision si el operador la usa después. Ollama
 * gestiona el swap automáticamente — si el VRAM se acerca al límite,
 * desaloja el modelo menos recientemente usado.
 *
 * Fire-and-forget: el caller (LoginScreen) NO espera la promesa. Si falla
 * (Ollama down, red intermitente, modelo no instalado), degrada silencioso
 * al cold-start clásico en la primera query del agente.
 *
 * Idempotente: usar `warmTextModels()` múltiples veces no dispara N requests.
 * Un lock interno previene calls concurrentes y un timestamp de último warm
 * <8min skipea la repetición (el keep_alive=10m garantiza que el modelo
 * sigue caliente con margen de 2min antes de evict).
 */

const OLLAMA_URL = '/api/ollama/api/generate';
// keep_alive 10min: balance entre VRAM ocupada y latencia subsecuente. Si el
// operador deja la app abierta más de 10min sin tocar agente, Ollama libera.
const KEEP_ALIVE = '10m';
// Timeout defensivo por modelo. La primera carga de granite3.1-dense:8b en
// M6000 tarda ~35-50s. 60s permite margen sin colgar promesas indefinidas.
const WARMUP_TIMEOUT_MS = 60000;

const TEXT_MODELS = ['gemma3:4b', 'granite3.1-dense:8b'];

// Threshold para skipear re-warm reciente: 8min < keep_alive=10m. Defensivo:
// damos 2min de margen para que el próximo warm refresque el timer ANTES de
// que Ollama desaloje el modelo.
const SKIP_IF_RECENT_MS = 8 * 60 * 1000;

let _warmInFlight = false;
let _lastWarmAt = 0;

const warmOne = async (model, signal) => {
  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: '',
        stream: false,
        keep_alive: KEEP_ALIVE,
        options: { num_predict: 1 },
      }),
      signal,
    });
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Dispara warm en paralelo de los modelos texto. Idempotente, no-bloqueante.
 *
 * @returns {Promise<boolean>} true si disparó (o ya estaba warm), false si
 *   hubo error genérico. El caller normalmente ignora el retorno.
 */
export async function warmTextModels() {
  if (_warmInFlight) return true;
  const now = Date.now();
  if (now - _lastWarmAt < SKIP_IF_RECENT_MS) return true;

  _warmInFlight = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WARMUP_TIMEOUT_MS);

  try {
    // Paralelo: warm de N modelos en simultáneo. Ollama serializa internamente
    // si VRAM se acerca al límite, pero la HTTP call no bloquea.
    const results = await Promise.all(
      TEXT_MODELS.map((m) => warmOne(m, controller.signal)),
    );
    // Si al menos un modelo warmó OK, marcamos el timestamp. Si todos fallan,
    // el siguiente intento (post-SKIP_IF_RECENT_MS) re-disparará desde cero.
    if (results.some(Boolean)) {
      _lastWarmAt = Date.now();
      return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    _warmInFlight = false;
  }
}

/**
 * Reset interno — para tests solamente.
 * @internal
 */
export function __resetTextWarmState() {
  _warmInFlight = false;
  _lastWarmAt = 0;
}

/**
 * Exposed test helper — para verificar contenido del array.
 * @internal
 */
export const __TEST__ = {
  TEXT_MODELS,
  KEEP_ALIVE,
  SKIP_IF_RECENT_MS,
};
