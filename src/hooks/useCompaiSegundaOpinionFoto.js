/**
 * useCompaiSegundaOpinionFoto — cablea EL DIAGNÓSTICO EN DOS PASOS (#67/#43)
 * a una llamada real al modelo de revisión.
 *
 * `services/segundaOpinionFoto.js` ya tenía toda la lógica y la voz del
 * segundo paso (cuándo callar, cómo redactar la duda, el cerrojo anti-
 * desalojo de GPU) — construida y con tests, pero sin un solo call-site que
 * la disparara con una `mirarDeNuevo` real. Este hook es ese cableado:
 *
 *   1. Toma la primera lectura (issues de `analyzeFoliage`, ya mostrada al
 *      usuario) y el mismo blob de foto.
 *   2. `mirarDeNuevo` llama a Ollama con `ENV.VISION_REVIEW_MODEL`
 *      (`qwen3-vl:4b`) y el prompt EXACTO medido en
 *      `scripts/bench-vision-matas.mjs` (SANA/ENFERMA + una frase) — el
 *      mismo texto con el que se decidió que este modelo cubre el hueco
 *      del primero (11/11 enfermas vs 8/8 sanas de qwen3.5:4b).
 *   3. `puedeCorrerSegundoPaso` consulta qué modelos siguen residentes
 *      (`getGpuSnapshot`, ya cacheado 5s) ANTES de disparar — la guarda
 *      documentada contra el desalojo del chat pineado (medido: 8,56s de
 *      recarga si corre en paralelo con el embebedor del RAG).
 *   4. Si discrepa, `avisar` inserta el mensaje en el MISMO canal por el
 *      que preguntó el usuario (burbuja de chat si escribió/mandó foto).
 *
 * Anti-molestia intacta: como el propio módulo documenta, si coincide con
 * la primera lectura queda en silencio TOTAL — un compañero que confirma lo
 * que ya dijo es ruido, no honestidad extra.
 *
 * @module hooks/useCompaiSegundaOpinionFoto
 */
import { useCallback } from 'react';
import { streamOllama } from '../services/ollamaStream';
import { getGpuSnapshot } from '../services/gpuTelemetryService';
import { ENV } from '../config/env';
import {
  pedirSegundaOpinion,
  segundaOpinionEnVuelo,
} from '../services/segundaOpinionFoto';

const OLLAMA_URL = '/api/ollama/api/generate';

// Mismo prompt medido en scripts/bench-vision-matas.mjs (2026-07-26): pide
// veredicto en una palabra primero (para poder leerlo sin juez) y la razón
// después (para que redactarSegundaOpinion tenga con qué armar "qué mirar").
const PROMPT_SEGUNDA_MIRADA = [
  'Mire la foto de esta planta de una finca campesina.',
  '¿Tiene algún problema sanitario visible (plaga o enfermedad)?',
  'Responda EXACTAMENTE así, en dos líneas:',
  'Línea 1: una sola palabra, SANA o ENFERMA.',
  'Línea 2: una frase corta con lo que ve, qué mirar para confirmarlo.',
].join(' ');

/** issues[] de analyzeFoliage → un texto de veredicto comparable con la 2ª mirada. */
function textoDePrimeraLectura(finding) {
  if (!finding) return '';
  const issues = Array.isArray(finding.issues) ? finding.issues : [];
  if (issues.length === 0) return `SANA. Estado ${finding.score ?? 'n/d'}/100, sin hallazgos.`;
  return `ENFERMA. ${issues.join('. ')}.`;
}

/** Segunda línea de la respuesta del modelo → { hallazgo, queMirar } best-effort. */
function extraerHallazgo(crudo) {
  const lineas = String(crudo || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const frase = lineas[1] || lineas[0] || '';
  // "X, para confirmar Y" / "X. Y" — best-effort, sin partir si no hay separador claro.
  const corte = frase.search(/,\s*(para|revise|mire|fíjese|abra)/i);
  if (corte > 0) {
    return { hallazgo: frase.slice(0, corte), queMirar: frase.slice(corte + 1).trim() };
  }
  return { hallazgo: frase, queMirar: null };
}

/**
 * @returns {{ pedirRevision: (p: {imageBlob: Blob, finding: Object|null, canal?: 'voz'|'texto', avisar: (texto:string, meta:{canal:string}) => void}) => Promise<void>, enVuelo: () => boolean }}
 */
export function useCompaiSegundaOpinionFoto() {
  /** @param {{imageBlob: Blob, finding: Object|null, canal?: 'voz'|'texto', avisar: (texto:string, meta:{canal:string}) => void}} p */
  const pedirRevision = useCallback(async ({ imageBlob, finding, canal = /** @type {'voz'|'texto'} */ ('texto'), avisar }) => {
    if (!imageBlob || typeof avisar !== 'function') return;
    const primeraLectura = textoDePrimeraLectura(finding);
    if (!primeraLectura) return; // sin diagnóstico previo no hay con qué comparar

    let base64;
    try {
      base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = /** @type {string} */ (reader.result);
          resolve(result.split(',')[1] || result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(imageBlob);
      });
    } catch {
      return; // blob no legible: degradar en silencio, la primera lectura ya cumplió
    }

    await pedirSegundaOpinion({
      primeraLectura,
      canal,
      avisar,
      extraer: extraerHallazgo,
      guardas: {
        modelosResidentes: async () => {
          const snap = await getGpuSnapshot();
          return snap?.available ? snap.models.map((m) => m.name) : null;
        },
        modeloChat: ENV.VISION_MODEL,
      },
      // Sin `flujo` explícito en el body: streamOllama infiere 'vision' por
      // la URL /api/generate (mismo comportamiento que analyzeFoliage). No
      // hay precedente en el repo de mandar `flujo` dentro del body a Ollama
      // — se reenvía tal cual en el POST y no vale la pena el riesgo de un
      // campo desconocido para el servidor.
      mirarDeNuevo: async () => streamOllama(
        OLLAMA_URL,
        {
          model: ENV.VISION_REVIEW_MODEL,
          prompt: PROMPT_SEGUNDA_MIRADA,
          images: [base64],
          options: { temperature: 0.1, num_predict: 700 },
        },
        undefined,
      ),
    });
  }, []);

  return { pedirRevision, enVuelo: segundaOpinionEnVuelo };
}

export default useCompaiSegundaOpinionFoto;

// Test-only exports: helpers puros internos, testeables sin montar React.
export const __TEST__ = { textoDePrimeraLectura, extraerHallazgo, PROMPT_SEGUNDA_MIRADA };
