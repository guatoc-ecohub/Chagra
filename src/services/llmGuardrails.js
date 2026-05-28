/**
 * llmGuardrails.js — Capa de seguridad transversal para llamadas LLM en Chagra.
 *
 * Implementa queue/042: anti-hallucination guardrails centralizados.
 * Toda llamada LLM (Ollama/Gemma) debe pasar por safeLLMQuery para garantizar:
 *   1. System prompt obligatorio con scope agroecológico.
 *   2. Validación post-respuesta heurística (whitelist/blacklist de términos).
 *   3. Rejection responses pre-armadas cuando se detecta drift off-topic.
 *   4. Telemetría local (localStorage) de rechazos para auditoría mensual.
 *
 * REGLAS CRÍTICAS (queue/042):
 *   - Failure mode SEGURO: si heurística falla → retornar respuesta original
 *     (NOT rejection). Preferir respuesta sospechosa que abortar UX.
 *   - Streaming onToken: heurística corre AL FINALIZAR, no token-a-token.
 *   - Caps de telemetría: máximo 50 samples en localStorage.
 *   - Verbose telemetry OFF en producción.
 */

import { streamOllama } from './ollamaStream';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES PÚBLICAS
// ─────────────────────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT_BASE = `\
Eres asistente agroecológico de Chagra. SOLO respondes sobre:
- Agricultura orgánica / agroecológica
- Especies del catálogo Chagra (lista pasada como contexto)
- Biopreparados, manejo de plagas con biológicos
- Suelos, riego, polinización, gremios de cultivos
- Catálogo curado por agrónomos colombianos

REGLAS DURAS:
1. Pregunta fuera de scope (política, salud humana, programación, etc.)
   → "No sé de ese tema. Solo puedo ayudarte con agricultura orgánica."
2. Especie NO en catálogo Chagra → "No tengo información curada sobre esa especie."
3. Especie en catálogo pero pregunta específica fuera del corpus curado →
   "Esto no está en mi información curada. Prueba el botón 'Consultar IA externa'."
4. NUNCA inventar datos. Mejor 'no sé' que un dato falso.
5. Tono "tú" cercano colombiano en todas las respuestas.
6. CONCISIÓN OBLIGATORIA: responde en MÁXIMO 30 palabras o 2 oraciones.
   La voz de Chagra es agronómica directa, no académica. Si necesitas
   detalle adicional, termina con "¿Quieres que profundice en X?" para que
   el operador pida más, en vez de soltar toda la información de una.
   (Razón técnica: TTS local es CPU, latencia escala lineal con caracteres
   de salida — 30 palabras ≈ 3s, 150 palabras ≈ 23s; experiencia del
   usuario rural en voz se rompe sobre 5s. Cap operativo, no estilístico.)`;

/**
 * Respuestas de rechazo pre-armadas. Usar lenguaje natural, sin jerga técnica.
 * Las claves son el `reason` que retorna detectOffTopicResponse().
 */
export const REJECTION_RESPONSES = {
    off_topic:
        'No sé de ese tema. Solo puedo ayudarte con agricultura orgánica y agroecología.',
    out_of_catalog:
        'No tengo información curada sobre esa especie. Prueba con las especies del catálogo Chagra.',
    out_of_corpus:
        'Esto no está en mi información curada. Prueba el botón "Consultar IA externa" que prepara la pregunta para Gemini, ChatGPT o Claude con tu contexto.',
    insufficient_context:
        'Necesito más información para responderte bien. ¿Puedes decirme la especie y en qué fase del ciclo está?',
};

// ─────────────────────────────────────────────────────────────────────────────
// HEURÍSTICAS DE DETECCIÓN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Términos que deben aparecer en respuestas legítimas sobre agroecología.
 * Al menos 1 de estos debe estar presente en la respuesta para considerarla válida.
 */
const AGRO_WHITELIST = [
    'planta', 'suelo', 'riego', 'fertilizante', 'biopreparado', 'gremio',
    'ciclo', 'especie', 'compost', 'microorganismo', 'nematodo', 'hortaliza',
    'cultivo', 'siembra', 'cosecha', 'orgánico', 'bocashi', 'melaza',
    'biol', 'lombricompuesto', 'agroecolog', 'semilla', 'poda', 'arraigar',
    'trasplante', 'abono', 'humus', 'materia orgánica', 'biodiversidad',
    'poliniza', 'agroforestal',
];

/**
 * Términos off-topic que NO deben aparecer como tema central.
 * Si alguno aparece > 2 veces y no hay términos agro → off_topic.
 */
const OFF_TOPIC_BLACKLIST = {
    programming: ['function(', 'for(', 'while(', 'python', 'javascript',
        'typescript', 'import ', 'export ', 'console.log', 'let ', 'const ',
        'return ', 'async ', 'await ', 'npm ', 'git '],
    politics: ['presidente', 'gobierno', 'petro', 'senado', 'congreso',
        'partido político', 'elecciones', 'candidato', 'reforma tributaria'],
    human_health: ['medicamento', 'antibiótico', 'vacuna', 'diagnóstico médico',
        'hospital', 'clínica', 'doctor', 'enfermedad crónica', 'diabetes',
        'hipertensión', 'cáncer humano'],
};

/** Máximo de párrafos antes de considerar drift (length sanity) */
const MAX_PARAGRAPHS = 10;

/**
 * Detecta si una respuesta se salió del scope agroecológico.
 *
 * @param {string} response - Texto completo de respuesta del LLM.
 * @param {string} domain   - 'disease' | 'species' | 'guild' | 'general'
 * @returns {string|null} La razón de rechazo o null si la respuesta es válida.
 */
export function detectOffTopicResponse(response, domain = 'general') {
    if (!response || typeof response !== 'string') return null;

    const lower = response.toLowerCase();

    try {
        // Heurística 1: Length sanity — respuesta extremadamente larga para pregunta simple
        const paragraphs = response.split(/\n{2,}/).filter((p) => p.trim().length > 20);
        if (paragraphs.length > MAX_PARAGRAPHS) {
            return 'off_topic'; // probablemente drift o respuesta genérica de LLM
        }

        // Heurística 2: Blacklist de términos off-topic (se cuentan ocurrencias)
        for (const [category, terms] of Object.entries(OFF_TOPIC_BLACKLIST)) {
            const hits = terms.filter((term) => lower.includes(term.toLowerCase()));
            if (hits.length >= 3) {
                // Solo off_topic si además NO hay términos agro que contextualicen el uso
                const hasAgro = AGRO_WHITELIST.some((term) => lower.includes(term));
                if (!hasAgro) {
                    if (import.meta.env.DEV) {
                        console.warn(`[guardrails] off_topic detectado (${category}):`, hits);
                    }
                    return 'off_topic';
                }
            }
        }

        // Heurística 3: Whitelist — para domain 'disease' y 'species',
        // la respuesta DEBE mencionar al menos 1 término agro.
        // Para 'general' y 'guild' el LLM puede decir "no sé" sin términos agro.
        if (domain === 'disease' || domain === 'species') {
            const hasAgro = AGRO_WHITELIST.some((term) => lower.includes(term));
            if (!hasAgro && lower.length > 100) {
                return 'off_topic';
            }
        }

        return null; // respuesta OK
    } catch (_) {
        // Failure mode seguro: si la heurística tiene un error, retornar null (no reject)
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEMETRÍA LOCAL
// ─────────────────────────────────────────────────────────────────────────────

const REJECTION_STORAGE_KEY = 'chagra:llm_rejections';

/**
 * Persiste un rechazo en localStorage para auditoría mensual.
 * Máximo 50 muestras (rotación tipo circular).
 * Solo activo en producción — en DEV también loguea a consola.
 *
 * @param {{ prompt: string, response: string, reason: string }} params
 */
export function logRejection({ prompt, response, reason }) {
    try {
        const existing = JSON.parse(localStorage.getItem(REJECTION_STORAGE_KEY) || '[]');
        existing.unshift({
            ts: new Date().toISOString(),
            prompt: (prompt || '').slice(0, 200),
            reason,
            response_preview: (response || '').slice(0, 200),
        });
        localStorage.setItem(REJECTION_STORAGE_KEY, JSON.stringify(existing.slice(0, 50)));
    } catch (_) { /* localStorage no disponible (SSR, incognito estricto) */ }

    if (import.meta.env.DEV) {
        console.warn('[guardrails] Rechazo LLM:', { reason, prompt_preview: prompt?.slice(0, 80) });
    }
}

/**
 * Recupera los últimos N rechazos del localStorage para la UI de telemetría.
 * @param {number} limit - Cuántos rechazos mostrar (default 5)
 */
export function getRecentRejections(limit = 5) {
    try {
        const stored = JSON.parse(localStorage.getItem(REJECTION_STORAGE_KEY) || '[]');
        return stored.slice(0, limit);
    } catch (_) {
        return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// WRAPPER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const OLLAMA_BASE = '/api/ollama';
const OLLAMA_GENERATE_URL = `${OLLAMA_BASE}/api/generate`;

/**
 * Wrapper seguro para llamadas LLM de texto (no multimodal).
 *
 * Para llamadas con imagen (analyzeFoliage, recognizeSpecies), esas usan
 * streamOllama directamente con prompt estructurado JSON — no pasan por aquí
 * porque la respuesta es JSON parseado, no texto libre.
 *
 * @param {string} userPrompt - Pregunta del operador en texto libre.
 * @param {Object} options
 * @param {string}   [options.model='qwen2.5:3b']       - Modelo Ollama a usar.
 * @param {string}   [options.domain='general']          - Dominio para heurísticas.
 * @param {Object}   [options.catalogContext]             - { species: string[] }
 * @param {Function} [options.onToken]                   - Streaming token callback.
 * @param {AbortSignal} [options.signal]                 - Cancelación externa.
 * @param {string}   [options.systemPromptOverride]      - Reemplaza SYSTEM_PROMPT_BASE si se pasa.
 * @returns {Promise<string>} - Respuesta final del LLM (o rejection response).
 */
export async function safeLLMQuery(userPrompt, options = {}) {
    const {
        model = 'qwen2.5:3b',
        domain = 'general',
        catalogContext = null,
        onToken = null,
        signal = null,
        systemPromptOverride = null,
    } = options;

    const systemPrompt = systemPromptOverride || SYSTEM_PROMPT_BASE;

    const catalogSection = catalogContext?.species?.length
        ? `\nCATÁLOGO DISPONIBLE: ${catalogContext.species.join(', ')}`
        : '';

    const fullPrompt = `${systemPrompt}${catalogSection}\n\nPREGUNTA DEL OPERADOR: ${userPrompt}`;

    let rawResponse = '';
    try {
        rawResponse = await streamOllama(
            OLLAMA_GENERATE_URL,
            { model, prompt: fullPrompt },
            onToken,
            { signal },
        );
    } catch (err) {
        // AbortError es esperado (cancelación user) — propagar para que el caller
        // distinga. Otros errores (red, Ollama caído) → respuesta de fallback
        // amigable en lugar de crashear la UI del operador.
        if (err?.name === 'AbortError') throw err;
        console.error('[safeLLMQuery] streamOllama failed:', err);
        return 'Lo siento, no pude consultar al asistente en este momento. Verifica tu conexión y reintenta.';
    }

    // Post-processing: heurística corre DESPUÉS del stream completo
    // para no bloquear la UX con onToken.
    const flaggedReason = detectOffTopicResponse(rawResponse, domain);
    if (flaggedReason) {
        logRejection({ prompt: userPrompt, response: rawResponse, reason: flaggedReason });
        const rejectionText = REJECTION_RESPONSES[flaggedReason] || REJECTION_RESPONSES.off_topic;
        // Si hay streaming activo, el texto ya se mostró. En ese caso retornamos
        // el rejection para que el caller lo maneje (ej. sobrescribir el texto mostrado).
        return rejectionText;
    }

    return rawResponse;
}

export default safeLLMQuery;
