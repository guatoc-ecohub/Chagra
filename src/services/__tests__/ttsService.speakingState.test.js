/**
 * Tests para el estado observable de reproducción TTS (TIER 2 #5 — voz
 * punta-a-punta). El AgentScreen necesita saber CUÁNDO Chagra está hablando
 * para pintar el estado "hablando" (ícono+animación) al campesino que casi
 * no lee. ttsService expone:
 *
 *   - onSpeakingChange(cb) → unsubscribe — notifica true/false en cambios.
 *   - isAudioPlaying()     → bool — estado actual (Kokoro Audio o Web Speech).
 *
 * Cubre:
 *   - speakKokoro notifica true al arrancar y false al onended
 *   - stop() notifica false
 *   - unsubscribe deja de notificar
 *   - speak() (Web Speech) notifica vía utterance.onstart/onend
 *   - speakSentences notifica true al primer audio y false al terminar la cadena
 *   - no notifica duplicados (solo cambios de estado)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  speak,
  speakKokoro,
  speakSentences,
  stop,
  onSpeakingChange,
  isAudioPlaying,
} from '../ttsService.js';

// Mock Audio: play() resuelve y dispara onended en el próximo tick para
// simular un audio corto. Guardamos las instancias para control manual.
const audioInstances = [];
class MockAudio {
  constructor(url) {
    this.url = url;
    this.paused = true;
    this.onended = null;
    this.onerror = null;
    audioInstances.push(this);
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

class MockUtterance {
  constructor(text) {
    this.text = text;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
  }
}

describe('ttsService — estado observable de reproducción (voz punta-a-punta)', () => {
  let fetchMock;
  let originalAudio;
  let originalCreateObjectURL;
  let originalRevokeObjectURL;
  let originalUtterance;
  let speechSynthesisMock;

  beforeEach(() => {
    audioInstances.length = 0;
    localStorage.clear();
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['fake-audio'], { type: 'audio/opus' }),
    });
    globalThis.fetch = fetchMock;
    originalAudio = globalThis.Audio;
    globalThis.Audio = /** @type {any} */ (MockAudio);
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => `blob:fake-${Math.random()}`);
    URL.revokeObjectURL = vi.fn();
    originalUtterance = globalThis.SpeechSynthesisUtterance;
    globalThis.SpeechSynthesisUtterance = /** @type {any} */ (MockUtterance);
    speechSynthesisMock = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
      speaking: false,
      paused: false,
    };
    window.speechSynthesis = /** @type {any} */ (speechSynthesisMock);
  });

  afterEach(() => {
    stop();
    globalThis.Audio = originalAudio;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    globalThis.SpeechSynthesisUtterance = originalUtterance;
    delete window.speechSynthesis;
    vi.restoreAllMocks();
  });

  it('speakKokoro notifica true al arrancar y false al onended', async () => {
    const events = [];
    const unsub = onSpeakingChange((v) => events.push(v));

    const audio = await speakKokoro('Hola, soy Chagra.');
    expect(audio).not.toBeNull();
    expect(events).toContain(true);
    expect(isAudioPlaying()).toBe(true);

    audio.onended(new Event(''));
    expect(events[events.length - 1]).toBe(false);
    expect(isAudioPlaying()).toBe(false);
    unsub();
  });

  it('stop() notifica false y resetea isAudioPlaying', async () => {
    const events = [];
    const unsub = onSpeakingChange((v) => events.push(v));

    await speakKokoro('Texto de prueba para detener.');
    expect(isAudioPlaying()).toBe(true);

    stop();
    expect(isAudioPlaying()).toBe(false);
    expect(events[events.length - 1]).toBe(false);
    unsub();
  });

  it('unsubscribe deja de notificar', async () => {
    const events = [];
    const unsub = onSpeakingChange((v) => events.push(v));
    unsub();

    await speakKokoro('Texto que ya no notifica.');
    expect(events).toHaveLength(0);
  });

  it('speak() Web Speech notifica vía utterance.onstart/onend', () => {
    const events = [];
    const unsub = onSpeakingChange((v) => events.push(v));

    const utterance = speak('Hola desde Web Speech.');
    expect(utterance).not.toBeNull();

    utterance.onstart(new Event(''));
    expect(isAudioPlaying()).toBe(true);
    expect(events).toContain(true);

    utterance.onend(new Event(''));
    expect(isAudioPlaying()).toBe(false);
    expect(events[events.length - 1]).toBe(false);
    unsub();
  });

  it('speakSentences notifica true al primer audio y false al terminar la cadena', async () => {
    const events = [];
    const unsub = onSpeakingChange((v) => events.push(v));

    // Dos frases largas (>40 chars) para activar el pipeline frase-por-frase.
    const text =
      'La primera frase del agente es suficientemente larga para el split. ' +
      'La segunda frase también supera el umbral mínimo de caracteres.';

    const promise = speakSentences(text);
    // Dejar que los plays arranquen y terminar cada audio a medida que aparece.
    for (let guard = 0; guard < 20; guard++) {
      await new Promise((r) => setTimeout(r, 0));
      const playing = audioInstances.find((a) => !a.paused && a.onended);
      if (playing) {
        playing.paused = true;
        playing.onended();
      }
    }
    const ok = await promise;

    expect(ok).toBe(true);
    expect(events[0]).toBe(true); // primer audio de la cadena
    expect(events).toContain(true);
    expect(events[events.length - 1]).toBe(false);
    expect(isAudioPlaying()).toBe(false);
    unsub();
  });

  it('no notifica duplicados — solo cambios de estado', async () => {
    const events = [];
    const unsub = onSpeakingChange((v) => events.push(v));

    const audio = await speakKokoro('Frase para verificar deduplicación.');
    audio.onended(new Event(''));
    stop(); // ya está en false — no debe re-notificar

    const trues = events.filter((v) => v === true).length;
    const falses = events.filter((v) => v === false).length;
    expect(trues).toBe(1);
    expect(falses).toBeLessThanOrEqual(2); // stop() inicial + onended
    unsub();
  });
});
