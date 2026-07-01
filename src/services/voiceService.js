/**
 * voiceService.js — Orquestador de transcripción de audio vía Whisper local.
 *
 * Envía el Blob grabado al proxy Nginx /api/whisper/asr con AbortController
 * (timeout 15s). El backend es openai-whisper-asr-webservice; el endpoint
 * /asr acepta task/language/output como query params y el audio como campo
 * multipart `audio_file`. Si Whisper no responde o hay fallo de red, el
 * audio se persiste en pending_voice_recordings para reintento posterior.
 *
 * NOTA: Este servicio usa Whisper (modelo local), NO Web Speech API del navegador.
 * SpeechGrammarList solo está disponible en Web Speech API y está deprecado en
 * Chromium moderno. Whisper es superior para español colombiano porque:
 * - Soporta lang='es-CO' (español Colombia) explícito
 * - Tiene mejor precisión en toponímicos (Choachí, Fómeque, Ubaque, Guatoc, etc.)
 * - Entiende términos agro (café arábica, Borbón, Castillo, Cenicafé, biopreparado)
 * - No requiere listas de gramática explícitas (aprende del contexto del audio)
 */

import { syncManager } from './syncManager';

const WHISPER_URL = '/api/whisper/asr';
const TIMEOUT_MS = 15000;

/**
 * Transcribe un Blob de audio a texto usando Whisper.
 *
 * @param {Blob} blob - audio/webm;codecs=opus (tipicamente de MediaRecorder).
 * @param {Object} [options]
 * @param {string} [options.language='es'] - códigos ISO-639-1 sin región (whisper rechaza 'es-CO', solo acepta 'es')
 * @returns {Promise<string>} texto transcrito (trim).
 * @throws {Error} si la red falla, el servidor responde no-2xx o el texto esta vacio.
 * @example
 * const text = await transcribe(audioBlob, { language: 'qu' });
 * // text => "wakichay tukuy imata"
 */
export async function transcribe(blob, options = {}) {
  // Guard: un Blob vacío o diminuto (captura fallida en móvil — MediaRecorder
  // a veces produce un webm de 0 bytes o truncado) hace que Whisper responda
  // HTTP 500 "Failed to load audio: End of file / invalid EBML number". Cortar
  // aquí con un mensaje claro al usuario en vez del round-trip + 500 críptico.
  const MIN_AUDIO_BYTES = 1024;
  if (!blob || typeof blob.size !== 'number' || blob.size < MIN_AUDIO_BYTES) {
    throw new Error('No se grabó audio. Mantén presionado el botón y habla cerca del micrófono.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const form = new FormData();
  const filename = `recording.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`;
  form.append('audio_file', blob, filename);

  // Whisper acepta solo códigos ISO-639-1 sin región. 'es-CO' lanza HTTP 500
  // ValueError: Unsupported language. Normalizar a base.
  const lang = (options.language || 'es').split('-')[0];

  const params = new URLSearchParams({
    task: 'transcribe',
    language: lang,
    output: 'json',
    encode: 'true',
  });

  try {
    const res = await fetch(`${WHISPER_URL}?${params.toString()}`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch (_) { /* noop */ }
      throw new Error(`Whisper ${res.status}: ${detail.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = (data.text || '').trim();
    if (!text) throw new Error('Transcripción vacía');
    return text;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Tiempo agotado al transcribir audio');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Encola un Blob de audio en pending_voice_recordings para reintento posterior.
 *
 * @param {Blob} blob
 * @param {Object} [metadata]
 * @param {string} [metadata.reason] - motivo del encolado (error del upstream).
 * @param {number} [metadata.durationMs]
 * @returns {Promise<void>}
 * @throws {Error} si syncManager.saveVoiceRecording falla.
 * @example
 * await queueForRetry(blob, { reason: "Whisper 503", durationMs: 4500 });
 */
export async function queueForRetry(blob, metadata = {}) {
  return syncManager.saveVoiceRecording(blob, {
    status: 'pending',
    lastError: metadata.reason || null,
    durationMs: metadata.durationMs || 0,
  });
}
