import React, { useCallback, useEffect, useState } from 'react';
import { Mic, MicOff, Loader2, AlertTriangle } from 'lucide-react';
import useVoiceRecorder from '../hooks/useVoiceRecorder';
import { transcribe } from '../services/voiceService';
import { streamOllama } from '../services/ollamaStream';
import { applyRegionalismOverlay, getRegionFromDepartment } from '../services/regionalismsService';
import usePrefsStore from '../store/usePrefsStore';
import { ENV } from '../config/env';
import { detectOffTopicResponse, logRejection } from '../services/llmGuardrails';

const OLLAMA_CHAT_URL = '/api/ollama/api/chat';
const TIMEOUT_MS = 90000;
const HELP_IA_LOG_KEY = 'chagra:help_corpus_ia_log';

function flattenCorpusStrings(value, out = []) {
  if (value == null) return out;
  if (typeof value === 'string' && value.trim()) {
    out.push(value.trim());
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((v) => flattenCorpusStrings(v, out));
    return out;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((v) => flattenCorpusStrings(v, out));
  }
  return out;
}

function normalizeMatch(s) {
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/,/g, '.')
    .trim();
}

/** Respuestas de honestidad: no exigir coincidencia numérica literal. */
function isHonestNonAnswer(text) {
  const t = normalizeMatch(text);
  return /no lo se|no sé|no esta en el corpus|no está en el corpus|no tengo|no puedo afirmar|consulte|agrosavia|cenicafé|unal|peer|revisad|institution/i.test(t);
}

/**
 * Detecta canti-dades con unidad en la respuesta que no aparecen en el corpus
 * (anti-alucinación de dosis).
 */
function findUnsupportedDoseFragments(answerText, corpusBlob) {
  if (isHonestNonAnswer(answerText)) return null;
  const blob = normalizeMatch(corpusBlob);
  const ans = normalizeMatch(answerText);
  const patterns = [
    /\d+[.,]?\d*\s*(?:%|ml|m\s*l|l|g|kg)\b/gi,
    /\d+\s*:\s*\d+/g,
    /\d+[.,]?\d*\s*kg\s*\/\s*m(?:²|2)/gi,
    /\d+[.,]?\d*\s*kg\s*\/\s*m\s*²/gi,
  ];
  for (const re of patterns) {
    const r = new RegExp(re.source, re.flags);
    let m;
    while ((m = r.exec(ans)) !== null) {
      const frag = normalizeMatch(m[0]);
      if (frag.length > 1 && !blob.includes(frag)) {
        return m[0].trim();
      }
    }
  }
  return null;
}

function appendHelpCorpusLog(entry) {
  try {
    const prev = JSON.parse(localStorage.getItem(HELP_IA_LOG_KEY) || '[]');
    prev.push({ ...entry, t: Date.now() });
    localStorage.setItem(HELP_IA_LOG_KEY, JSON.stringify(prev.slice(-50)));
  } catch (_) {
    /* noop */
  }
}

export default function HelpVoiceQuestion({ speciesSlug = null }) {
  const [corpus, setCorpus] = useState(null);
  const [corpusError, setCorpusError] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  const [gateError, setGateError] = useState(null);
  const [localErr, setLocalErr] = useState(null);

  const {
    isRecording,
    durationMs,
    error: recErr,
    start,
    stop,
    reset,
    hardLimitMs,
  } = useVoiceRecorder();

  useEffect(() => {
    const ctrl = new AbortController();
    setCorpus(null);
    setCorpusError(null);

    if (!speciesSlug || speciesSlug === 'null' || speciesSlug === 'undefined') {
      setCorpus(null);
      return;
    }

    fetch(`${import.meta.env.BASE_URL}cycle-content/${speciesSlug}.json`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`No se cargó el corpus de ${speciesSlug}`);
        return r.json();
      })
      .then(setCorpus)
      .catch((e) => {
        if (e.name !== 'AbortError') setCorpusError(e.message || 'Error al cargar corpus');
      });
    return () => ctrl.abort();
  }, [speciesSlug]);

  const runRag = useCallback(async (questionText, corpusObj) => {
    if (!questionText?.trim() || !corpusObj) return;
    setPhase('thinking');
    setAnswer('');
    setGateError(null);
    setLocalErr(null);

    const corpusJson = JSON.stringify(corpusObj);
    const corpusBlob = flattenCorpusStrings(corpusObj).join('\n');

    const system = speciesSlug
      ? `Usted es asistente agroecológico de Chagra (modo ayuda, corpus estricto).
Reglas obligatorias:
1) Use ÚNICAMENTe el CONTEXTO JSON que el usuario adjunta en su mensaje. No use conocimiento externo.
2) Si la pregunta no puede responderse con ese CONTEXTO, diga con claridad que no lo sabe y sugiera consultar fuentes revisadas por pares, Agrosavia, Cenicafé o material de extensión de la UNAL, según aplique.
3) NO invente dosis, porcentajes ni recetas numéricas que no estén escritas en el CONTEXTO. Si le piden una dosis que no aparece allí, diga que no puede improvisar dosis y que debe seguir recetas validadas en documentación técnica o extensión oficial.
4) Cuando afirme un dato presente en el CONTEXTO, cite de forma breve, por ejemplo: "según el corpus DR-034 para esta especie, …".
5) Responda en español, tratamiento de "usted", tono colombiano cordial.
6) No hable de política, salud humana ni temas fuera de agricultura.

Formato: párrafo breve (máximo unas 8 oraciones). Sin listas largas salvo que el usuario pida enumeración.`
      : 'Eres un asistente agroecológico colombiano. Responde preguntas sobre cultivos, suelos, biopreparados, ciclos lunares, cosecha. Usa el corpus DR-034 cuando esté disponible. NO inventes dosis exactas si no están en corpus — di "consulta con sabedor local" en su lugar.';

    const userMsg = corpusJson
      ? `CONTEXTO (única fuente, JSON):\n${corpusJson}\n\nPREGUNTA:\n${questionText.trim()}`
      : `PREGUNTA:\n${questionText.trim()}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let full = '';
    try {
      full = await streamOllama(
        OLLAMA_CHAT_URL,
        {
          model: ENV.NLU_MODEL || 'gemma4:e2b',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userMsg },
          ],
          options: { temperature: 0.05, num_predict: 1200 },
        },
        (_chunk, acc) => {
          full = acc;
          setAnswer(acc);
        },
        { signal: controller.signal },
      );
    } catch (e) {
      clearTimeout(timer);
      const msg = e.name === 'AbortError' ? 'Tiempo agotado con la IA local.' : (e.message || 'IA local no respondió');
      setLocalErr(msg);
      setPhase('idle');
      appendHelpCorpusLog({
        species_slug: speciesSlug,
        query: questionText,
        response: null,
        error: msg,
        gateOk: false,
      });
      console.info('[HelpCorpusIA]', { species_slug: speciesSlug, query: questionText, error: msg });
      return;
    }
    clearTimeout(timer);

    const invalidFrag = findUnsupportedDoseFragments(full, corpusBlob);
    if (invalidFrag) {
      setGateError('Respuesta inválida, fuera de corpus: parece una dosis o cantidad no respaldada por el texto curado.');
      setAnswer('');
      appendHelpCorpusLog({
        species_slug: speciesSlug,
        query: questionText,
        response: full,
        gateOk: false,
        gateReason: `unsupported_fragment:${invalidFrag}`,
      });
      // Telemetría compartida con guardrails (queue/042)
      logRejection({ prompt: questionText, response: full, reason: 'out_of_corpus' });
      console.info('[HelpCorpusIA]', { species_slug: speciesSlug, query: questionText, gateOk: false, fragment: invalidFrag });
    } else {
      // Validación adicional: off-topic check del guardrails sobre la respuesta completa
      const offTopic = detectOffTopicResponse(full, 'general');
      if (offTopic) {
        logRejection({ prompt: questionText, response: full, reason: offTopic });
      }
      appendHelpCorpusLog({
        species_slug: speciesSlug,
        query: questionText,
        response: full,
        gateOk: true,
      });
      console.info('[HelpCorpusIA]', { species_slug: speciesSlug, query: questionText, gateOk: true });
      const voiceRegionPref = usePrefsStore.getState().voiceRegion;
      const intensity = usePrefsStore.getState().voiceRegionIntensity;
      const region =
        voiceRegionPref === 'auto'
          ? getRegionFromDepartment('cundiboyacense')
          : voiceRegionPref;
      const finalAnswer = applyRegionalismOverlay(full, region, intensity);
      setAnswer(finalAnswer);
    }
    setPhase('idle');
  }, [speciesSlug]);

  const handleMic = async () => {
    setLocalErr(null);
    setGateError(null);
    if (isRecording) {
      const result = await stop();
      if (!result?.blob || result.blob.size === 0) {
        setLocalErr('Grabación vacía. Intente de nuevo.');
        return;
      }
      setPhase('transcribing');
      try {
        const text = await transcribe(result.blob);
        setTranscript(text);
        if (corpus) await runRag(text, corpus);
        else setLocalErr('Corpus aún no cargado. Espere un momento e intente otra vez.');
      } catch (e) {
        setLocalErr(e.message || 'No se pudo transcribir');
      } finally {
        setPhase('idle');
      }
      return;
    }
    try {
      await start();
    } catch (_) { /* error en hook */ }
  };

  if (corpusError) {
    return (
      <div className="mt-4 p-3 rounded-xl bg-rose-900/20 border border-rose-800/40 text-xs text-rose-200">
        {corpusError}
      </div>
    );
  }

  return (
    <div className="mt-4 p-3 rounded-xl bg-amber-900/15 border border-amber-800/40">
      <p className="text-xs font-bold text-amber-200 uppercase tracking-wider mb-2">
        Pregunta por voz sobre esta especie
      </p>
      <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
        Toque el micrófono, hable su pregunta y suelte. Solo usamos el corpus que ve arriba: si algo no está ahí,
        la IA debe decir que no lo sabe.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleMic}
          disabled={phase === 'transcribing' || phase === 'thinking' || (speciesSlug !== null && !corpus)}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm min-h-[44px] transition-colors ${isRecording
            ? 'bg-red-600 hover:bg-red-500 text-white'
            : 'bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
        >
          {phase === 'transcribing' || phase === 'thinking' ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {phase === 'transcribing' ? 'Transcribiendo…' : 'Consultando IA…'}
            </>
          ) : isRecording ? (
            <>
              <MicOff size={18} /> Detener ({Math.ceil((hardLimitMs - durationMs) / 1000)}s)
            </>
          ) : (
            <>
              <Mic size={18} /> Hablar
            </>
          )}
        </button>
        {!isRecording && transcript && (
          <button
            type="button"
            onClick={() => { reset(); setTranscript(''); setAnswer(''); setGateError(null); }}
            className="text-[11px] text-slate-500 underline"
          >
            Borrar y repetir
          </button>
        )}
      </div>

      {(recErr || localErr) && (
        <div className="text-[11px] text-amber-300 mt-2 flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>
            <p>{localErr || recErr}</p>
            {(/ollama|Ollama|tiempo agotado|abort|fetch|IA local|no respond/i.test(localErr || recErr || '')) && (
              <p className="text-slate-500 mt-1">
                IA local no disponible, ver corpus directo en la sección anterior.
              </p>
            )}
          </div>
        </div>
      )}

      {transcript && (
        <div className="mt-3 p-2 rounded-lg bg-slate-950/60 border border-slate-800">
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Usted dijo</p>
          <p className="text-xs text-slate-300 italic">&ldquo;{transcript}&rdquo;</p>
        </div>
      )}

      {gateError && (
        <div className="mt-3 p-2 rounded-lg bg-rose-900/25 border border-rose-800/50 text-xs text-rose-200">
          {gateError}
        </div>
      )}

      {answer && !gateError && (
        <div className="mt-3 p-2 rounded-lg bg-slate-950/70 border border-emerald-800/30">
          <p className="text-[10px] text-emerald-500 font-bold uppercase mb-1">Respuesta (corpus estricto)</p>
          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{answer}</p>
        </div>
      )}
    </div>
  );
}
