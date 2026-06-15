/**
 * caseStudyLessonsSummarizer.js — LLM resume al cerrar caso (DR-044 sub-viii F5)
 * ================================================================
 * Toma el state_history + treatments_applied + outcome de un caso y
 * propone un borrador de `lessons_learned` (3-5 frases, español Colombia).
 *
 * Privacy: NUNCA sale del host local. Si Ollama down → null (UI cae a
 * input manual).
 *
 * Audit trail: cada respuesta retorna `_audit` para vincular a
 * case.event_log_ids.
 */

const CASE_STUDY_CTX_SIZE = 4096;

import { streamOllama } from './ollamaStream';
import { retrieve } from './ragRetriever';

const OLLAMA_CHAT_URL = '/api/ollama/api/chat';
const MODEL = 'qwen2.5:7b';
const TIMEOUT_MS = 60000;
const PROMPT_VERSION = 'v1.1-2026-05-19-rag';

const RAG_TOP_K = 5;
const RAG_CONTEXT_HEADER = '=== INFORMACIÓN AGRONÓMICA DE REFERENCIA ===';
const RAG_CONTEXT_FOOTER = '=== FIN INFORMACIÓN AGRONÓMICA DE REFERENCIA ===';

const SYSTEM_PROMPT = `Eres un curador agronómico que resume lecciones de un caso de estudio. Recibes el historial de un caso (estados, tratamientos, outcome) y devuelves un párrafo claro y útil para el operador campesino.

OUTPUT: texto plano (NO JSON, NO markdown), 3-5 frases máximo, español Colombia register agroecológico.

Estructura sugerida:
1. Qué funcionó (tratamiento + dosis + frecuencia que dio resultado).
2. Qué NO funcionó o tiempo perdido.
3. Recomendación para próxima vez (preventivo, momento ideal, sinergia).

Reglas:
- NO inventes datos no presentes en el historial.
- NO incluyas nombres de personas (privacy ADR-020 Ley 1581).
- NO incluyas coordenadas exactas si la finca/zona aparece.
- Foco en aprendizaje accionable: "Próxima vez aplicar BT 1g/L al primer signo".
- Si el caso falló (closed_failed), explicita por qué probablemente.
- Si el caso fue muy corto o sin tratamientos, sé honesto: "Caso cerrado sin intervención registrada, observación inicial fue exagerada."
- Si recibes un bloque "=== INFORMACIÓN AGRONÓMICA DE REFERENCIA ===", úsalo SOLO como apoyo agronómico (dosis típicas, sinergias, manejo). NO lo cites como si el operador te lo hubiera dicho. NO inventes nada que NO esté ni en el historial ni en ese bloque.
`;

/**
 * Construye el bloque RAG con passages del corpus. Devuelve string vacío
 * si no hay nada útil. Mismo formato que `caseStudyTreatmentRecommender`
 * para consistencia entre prompts.
 */
function buildRagBlock(passages) {
  if (!Array.isArray(passages) || passages.length === 0) return '';
  const lines = [RAG_CONTEXT_HEADER];
  lines.push('(NO viene del usuario, NO citarla como si el operador te lo hubiera contado)');
  passages.forEach((p, i) => {
    const slug = p?.species || 'unknown';
    const text = typeof p?.text === 'string' ? p.text.trim() : '';
    if (!text) return;
    lines.push(`[${i + 1}] (${slug}) ${text}`);
  });
  lines.push(RAG_CONTEXT_FOOTER);
  return lines.join('\n');
}

/**
 * Construye la query RAG a partir del caso: problema + biopreparados
 * aplicados + (opcional) species_id. Esto le da al BM25 los términos más
 * distintivos del corpus para recuperar pasajes relevantes.
 */
export function buildRagQuery(caseObj) {
  if (!caseObj) return '';
  const parts = [];
  const prob = caseObj.problem?.name_freetext;
  if (typeof prob === 'string' && prob.trim()) parts.push(prob.trim());
  const sci = caseObj.problem?.pest_scientific_candidate;
  if (typeof sci === 'string' && sci.trim()) parts.push(sci.trim());
  const sp = caseObj.subject?.species_id || caseObj.species_id;
  if (typeof sp === 'string' && sp.trim()) parts.push(sp.trim().replace(/_/g, ' '));
  (caseObj.treatments_applied || []).forEach((t) => {
    if (t?.biopreparado_id) parts.push(String(t.biopreparado_id).replace(/_/g, ' '));
  });
  return parts.join(' ').trim();
}

/**
 * Construye payload narrativo desde la estructura del caso.
 */
export function buildCaseSummaryInput(caseObj) {
  if (!caseObj) return null;
  const parts = [];
  parts.push(`Problema: ${caseObj.problem?.name_freetext || 'sin nombre'}`);
  if (caseObj.problem?.severity) parts.push(`Severidad inicial: ${caseObj.problem.severity}`);
  if (caseObj.subject?.count_total) {
    parts.push(`Cohort: ${caseObj.subject.count_affected ?? '?'}/${caseObj.subject.count_total} afectadas`);
  }
  if (caseObj.zone_freetext) parts.push(`Zona: ${caseObj.zone_freetext}`);

  parts.push('\nHistorial de estados (cronológico):');
  for (const h of caseObj.state_history || []) {
    parts.push(`- [${h.at}] → ${h.state}${h.notes ? ` (${h.notes})` : ''}`);
  }

  if ((caseObj.treatments_applied || []).length > 0) {
    parts.push('\nTratamientos aplicados:');
    for (const t of caseObj.treatments_applied) {
      parts.push(`- [${t.applied_at}] ${t.biopreparado_id}${t.dose ? ' · ' + t.dose : ''}${t.notes ? ' · ' + t.notes : ''}`);
    }
  } else {
    parts.push('\nSin tratamientos registrados.');
  }

  if (caseObj.outcome) {
    parts.push(`\nOutcome:`);
    if (caseObj.outcome.final_count_affected != null) {
      parts.push(`- Afectadas finales: ${caseObj.outcome.final_count_affected}`);
    }
    if (caseObj.outcome.closed_at) parts.push(`- Cerrado: ${caseObj.outcome.closed_at}`);
  }

  return parts.join('\n');
}

/**
 * Llama Ollama para generar lessons_learned. Devuelve {text, _audit} o null.
 *
 * Pipeline:
 *   1. Construye narrativa del caso (`buildCaseSummaryInput`).
 *   2. Hace `retrieve(query, RAG_TOP_K)` con problema + treatments + species.
 *      Si falla o no hay hits, sigue sin contexto (degrade gracefully).
 *   3. Prepende el bloque RAG al user message, delimitado para evitar
 *      alucinación (lección incidente tomates 2026-05-19).
 *   4. Llama streamOllama con messages [system, user].
 *
 * El `_audit` incluye `rag_passages` (slugs + score) para trazabilidad.
 */
export async function summarizeLessons(caseObj, opts = {}) {
  const input = buildCaseSummaryInput(caseObj);
  if (!input) return null;

  // RAG retrieval — best effort, nunca lanza.
  let ragPassages = [];
  const ragQuery = buildRagQuery(caseObj);
  if (ragQuery) {
    try {
      const hits = await retrieve(ragQuery, RAG_TOP_K);
      if (Array.isArray(hits)) ragPassages = hits;
    } catch (err) {
      console.warn('[caseStudyLessonsSummarizer] retrieve failed, sin contexto RAG:', err?.message || err);
      ragPassages = [];
    }
  }

  const ragBlock = buildRagBlock(ragPassages);
  const userContent = ragBlock
    ? `${ragBlock}\n\n--- HISTORIAL DEL CASO ---\n${input}`
    : input;

  const body = {
    model: MODEL,
    stream: true,
    keep_alive: '5m',
    options: { temperature: 0.3, num_ctx: CASE_STUDY_CTX_SIZE },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
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
    if (!fullText || fullText.trim().length < 30) return null;

    return {
      text: fullText.trim(),
      _audit: {
        model: MODEL,
        prompt_version: PROMPT_VERSION,
        generated_at: new Date().toISOString(),
        rag_passages: ragPassages.map((p) => ({
          species: p?.species || null,
          key: p?.key || null,
          score: typeof p?.score === 'number' ? p.score : null,
        })),
        rag_used: ragPassages.length > 0,
      },
    };
  } catch (e) {
    clearTimeout(t);
    if (e?.name === 'AbortError') {
      console.warn('[caseStudyLessonsSummarizer] timeout/abort');
    } else {
      console.warn('[caseStudyLessonsSummarizer] error:', e?.message || e);
    }
    return null;
  }
}

function mergeSignals(a, b) {
  const ctrl = new AbortController();
  if (a.aborted || b.aborted) ctrl.abort();
  else {
    a.addEventListener('abort', () => ctrl.abort(), { once: true });
    b.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  return ctrl.signal;
}

export const __TEST__ = {
  buildCaseSummaryInput,
  buildRagBlock,
  buildRagQuery,
  SYSTEM_PROMPT,
  PROMPT_VERSION,
  RAG_CONTEXT_HEADER,
};

export default summarizeLessons;
