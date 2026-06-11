/**
 * caseStudyVoiceExtractor.js — Voice → Case Study extraction
 * ================================================================
 * Toma una transcripción en español (Whisper output) y devuelve campos
 * estructurados para pre-fill del CaseStudyScreen NewCaseForm.
 *
 * Pipeline (referenced en DR-044 sub-viii Feature 1):
 *   1. Operator dicta caso → Whisper transcribe.
 *   2. extractCaseFromText(transcript) → Ollama, structured JSON.
 *   3. UI pre-fill form, operator confirma.
 *
 * Patrón espejado de `entityExtractor.js` (modelo de extracción simple).
 * Para casos de estudio se usa el modelo configurado por su mejor razonamiento
 * con campos múltiples + reasoning sobre pest taxonomy + count parsing.
 *
 * Privacy: el prompt + transcripción NUNCA salen del host local. Si
 * Ollama no responde (down, timeout), retorna `null` y la UI cae a modo
 * manual (offline-first compliant DR-044 restricciones).
 *
 * Audit trail: cada call retorna también { model, prompt_hash, timestamp }
 * para que CaseStudy log en event_log_ids referenciado.
 */

import { streamOllama } from './ollamaStream';

const OLLAMA_CHAT_URL = '/api/ollama/api/chat';
// Modelo configurado: mejor estructura JSON sobre campos múltiples que el
// modelo de extracción simple. Fallback al modelo simple si no responde
// (ver llmRouter pattern).
const MODEL = 'qwen2.5:7b';
const TIMEOUT_MS = 90000; // 90s CPU; ajustar post-GPU
const PROMPT_VERSION = 'v1.0-2026-05-17';

const SEVERITY_VOCAB = {
  critical: ['crítico', 'crítica', 'gravísim', 'urgente', 'emergencia', 'catástrofe'],
  high: ['alto', 'alta', 'grave', 'serio', 'preocupante'],
  medium: ['medio', 'media', 'moderado', 'algo'],
  low: ['bajo', 'baja', 'leve', 'pequeño', 'poco'],
};

// Sistema prompt focado en case study domain (no general entity).
const SYSTEM_PROMPT = `Eres un extractor estructurado de casos de estudio agronómicos chagra colombianos. Recibes la transcripción de un operador describiendo un PROBLEMA en su finca (plaga, enfermedad, déficit, anomalía).

Devuelves EXCLUSIVAMENTE un objeto JSON válido sin texto adicional, sin markdown, sin backticks.

Schema:
{
  "title": "<resumen breve, máx 60 chars, formato 'Pest en zona — fecha o lugar'>",
  "problem_name": "<nombre del problema en lenguaje del operador>",
  "pest_scientific_candidate": "<binomio latín si reconocible, ej. 'Agrotis ipsilon'; null si no aplica>",
  "severity": "low|medium|high|critical",
  "count_total": <entero o null>,
  "count_affected": <entero o null>,
  "subzone": "<lugar dentro de la finca tal como lo dice el operador, o cadena vacía>",
  "species_candidates": ["<id_species_si_se_menciona>"],
  "symptoms": ["<lista de signos clínicos observados, cada uno frase corta>"]
}

Reglas estrictas:

1. NUMERAL → entero: "diez"=10, "cien"=100, "mil"=1000, "1000"=1000, "doce"=12.
2. CONTEO afectado vs total: "10 de 1000 plantas atacadas" → {count_affected:10, count_total:1000}. Si solo dice "10 plantas atacadas" → {count_affected:10, count_total:null}.
3. SEVERIDAD por palabras clave (caso prevalece sobre keyword):
   - "crítico"/"crítica"/"gravísimo"/"urgente"/"catástrofe"/"emergencia" → critical
   - "grave"/"serio"/"preocupante"/"alto"/"alta" → high
   - "moderado"/"medio"/"algo" → medium
   - "leve"/"poco"/"bajo"/"pequeño" → low
   - Sin keyword: usa "medium" default.
4. PESTS comunes Colombia (mapeo a binomio):
   - trozador, gusano cortador → Agrotis ipsilon
   - cogollero → Spodoptera frugiperda
   - mosca blanca → Bemisia tabaci o Trialeurodes vaporariorum
   - polilla del tomate, palomilla tomate → Tuta absoluta
   - áfidos, pulgones → Aphis spp. o Myzus persicae
   - ácaros, arañita roja → Tetranychus urticae
   - tizón tardío → Phytophthora infestans
   - antracnosis → Colletotrichum spp.
   - oídio, blanco → Erysiphales
5. SPECIES candidatas (Colombian crops, mapeo a chagra catalog ids cuando reconocible):
   - tomate, tomatera → solanum_lycopersicum_cerasiforme
   - tomate cherry → solanum_lycopersicum_cerasiforme
   - tomate san marzano → solanum_lycopersicum_san_marzano
   - papa, papa criolla → solanum_phureja o solanum_tuberosum
   - ají, chile, capsicum → capsicum_annuum
   - café, cafeto → coffea_arabica
   - lechuga → lactuca_sativa_*
   - cebolla larga → allium_fistulosum
   - ajo → allium_sativum
   - frijol → phaseolus_vulgaris
6. SUBZONE: extraer descripción literal ("entrada del invernadero", "cama 3 del cuadrante norte", "esquina sureste"). Si no se menciona, "".
7. SYMPTOMS: cada signo como frase corta separada. Ej: "tallo cortado a nivel del cuello", "manchas amarillas hojas viejas", "polvo blanco hojas".
8. TITLE: generar conciso. Ej "Trozador invernadero entrada — 10 plantas". Máx 60 chars.

Si el operador NO está reportando un problema sino otro tipo de log (siembra, cosecha, mantenimiento), retorna {"_not_case": true}.
`;

const truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');

/**
 * Extrae campos de caso desde transcripción. Devuelve null si Ollama falla
 * (operator-friendly UX: cae a modo manual).
 *
 * @param {string} transcript - Texto en español.
 * @param {Object} opts
 * @param {AbortSignal} [opts.signal]
 * @param {(chunk, fullText) => void} [opts.onToken] - Para typewriter UI.
 * @returns {Promise<Object|null>} estructura caso o null si falla.
 */
export async function extractCaseFromText(transcript, opts = {}) {
  if (!transcript || transcript.trim().length < 5) {
    return null;
  }

  const userMsg = `Transcripción del operador:\n${transcript.trim()}`;
  const body = {
    model: MODEL,
    stream: true,
    format: 'json',
    keep_alive: '5m',
    options: { temperature: 0.1, num_ctx: 4096 },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMsg },
    ],
  };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const signal = opts.signal
    ? mergeSignals(opts.signal, ctrl.signal)
    : ctrl.signal;

  try {
    const fullText = await streamOllama(OLLAMA_CHAT_URL, body, opts.onToken, { signal });
    clearTimeout(t);
    if (!fullText) return null;

    const parsed = parseLLMJson(fullText);
    if (!parsed || parsed._not_case) return null;

    // Sanitize: ensure severity in vocab, counts are integers.
    const sev = String(parsed.severity || '').toLowerCase();
    const finalSev = ['low', 'medium', 'high', 'critical'].includes(sev) ? sev : 'medium';

    const toInt = (v) => {
      if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    };

    return {
      title: truncate(parsed.title, 80),
      problem_name: parsed.problem_name || '',
      pest_scientific_candidate: parsed.pest_scientific_candidate || null,
      severity: finalSev,
      count_total: toInt(parsed.count_total),
      count_affected: toInt(parsed.count_affected),
      subzone: parsed.subzone || '',
      species_candidates: Array.isArray(parsed.species_candidates) ? parsed.species_candidates : [],
      symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
      // Audit trail metadata
      _audit: {
        model: MODEL,
        prompt_version: PROMPT_VERSION,
        extracted_at: new Date().toISOString(),
        transcript_length: transcript.length,
      },
    };
  } catch (e) {
    clearTimeout(t);
    if (e?.name === 'AbortError') {
      console.warn('[caseStudyVoiceExtractor] timeout/abort tras', TIMEOUT_MS, 'ms');
    } else {
      console.warn('[caseStudyVoiceExtractor] error:', e?.message || e);
    }
    return null;
  }
}

/**
 * Parse JSON tolerante: LLM puede envolver en markdown o trailing junk.
 */
function parseLLMJson(text) {
  if (!text) return null;
  // Strip markdown fences si LLM los agregó
  let cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  // Find first { ... matching }
  const start = cleaned.indexOf('{');
  if (start === -1) return null;
  // Match braces simple (asume LLM no anida deep + queries simples)
  let depth = 0;
  let end = -1;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

function mergeSignals(a, b) {
  // Combine AbortSignal: any abort propagates.
  const ctrl = new AbortController();
  if (a.aborted || b.aborted) ctrl.abort();
  else {
    a.addEventListener('abort', () => ctrl.abort(), { once: true });
    b.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  return ctrl.signal;
}

// Exports adicionales para tests
export const __TEST__ = { parseLLMJson, SEVERITY_VOCAB, PROMPT_VERSION, MODEL };

export default extractCaseFromText;
