/**
 * voiceService.ts — Orquestador de transcripción de audio vía Whisper local.
 *
 * Envía el Blob grabado al proxy Nginx /api/whisper/asr con AbortController
 * (timeout 15s). El backend es openai-whisper-asr-webservice; el endpoint
 * /asr acepta task/language/output como query params y el audio como campo
 * multipart `audio_file`. Si Whisper no responde o hay fallo de red, el
 * audio se persiste en pending_voice_recordings para reintento posterior.
 */

import { syncManager } from './syncManager';

const WHISPER_URL = '/api/whisper/asr';
const TIMEOUT_MS = 15000;

interface TranscribeOptions {
  language?: string;
}

interface QueueMetadata {
  reason?: string;
  durationMs?: number;
}

/**
 * Transcribe un Blob de audio a texto usando Whisper.
 */
export async function transcribe(blob: Blob, options: TranscribeOptions = {}): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const form = new FormData();
  const filename = `recording.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`;
  form.append('audio_file', blob, filename);

  const params = new URLSearchParams({
    task: 'transcribe',
    language: options.language || 'es',
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
      try {
        detail = await res.text();
      } catch (_) {
        /* noop */
      }
      throw new Error(`Whisper ${res.status}: ${detail.slice(0, 200)}`);
    }

    const data = (await res.json()) as { text?: string };
    const text = (data.text || '').trim();
    if (!text) throw new Error('Transcripción vacía');
    return text;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Tiempo agotado al transcribir audio');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Encola un Blob de audio en pending_voice_recordings para reintento posterior.
 */
export async function queueForRetry(
  blob: Blob,
  metadata: QueueMetadata = {}
): Promise<Record<string, unknown>> {
  return syncManager.saveVoiceRecording(blob, {
    status: 'pending',
    lastError: metadata.reason || null,
    durationMs: metadata.durationMs || 0,
  });
}
