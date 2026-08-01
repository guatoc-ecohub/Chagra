/**
 * streamDeadline.test.js — TDD test-first para el deadline stream-aware del
 * agente (FIX prod P0 2026-06-02).
 *
 * Contexto del bug: el cliente de chat abortaba respuestas largas con "Tiempo
 * agotado" porque el deadline TOTAL (60s) tumbaba completions de granite que
 * bajo carga rozan 20-29s + cold-load + RAG + tool-chain, AUNQUE el stream
 * estuviera avanzando token a token. Bench prod 2026-06-02: 4 de 6 prompts
 * murieron por este abort.
 *
 * Fix: el deadline debe ser un IDLE-timeout (se reinicia con cada token). Un
 * stream que avanza NUNCA se aborta por deadline; solo un STALL real (el
 * backend dejó de emitir) o el techo absoluto (backstop extremo) abortan.
 *
 * Estos tests verifican la lógica pura del factory `createStreamDeadline`
 * con fake timers (sin red, sin React, sin Ollama).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createStreamDeadline,
  IDLE_TIMEOUT_MS,
  FIRST_TOKEN_TIMEOUT_MS,
  HARD_CEILING_MS,
} from '../streamDeadline.js';

describe('streamDeadline — constantes de política', () => {
  it('idle-timeout tolera ~40-60s de generación bajo carga (>= 35s)', () => {
    // El idle-timeout es el GAP máximo entre tokens. granite bajo carga sigue
    // emitiendo dentro de ese gap; solo un stall real (backend mudo) lo supera.
    expect(IDLE_TIMEOUT_MS).toBeGreaterThanOrEqual(35000);
  });

  it('techo absoluto es generoso pero NO infinito (entre 120s y 360s)', () => {
    // Backstop extremo subido a 300s: tolera respuestas largas bajo contención
    // de GPU única sin colgar la UI para siempre.
    expect(HARD_CEILING_MS).toBeGreaterThanOrEqual(120000);
    expect(HARD_CEILING_MS).toBeLessThanOrEqual(360000);
  });

  it('el techo absoluto es estrictamente mayor que el idle-timeout', () => {
    expect(HARD_CEILING_MS).toBeGreaterThan(IDLE_TIMEOUT_MS);
  });
});

describe('streamDeadline — comportamiento idle (no abortar mientras streamea)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('aborta con "first_token" si NUNCA llega un token y pasa el presupuesto del primer token', () => {
    const onTimeout = vi.fn();
    const dl = createStreamDeadline(/** @type {any} */ ({ firstTokenMs: 1000, idleMs: 1000, ceilingMs: 5000, onTimeout }));
    dl.start();
    vi.advanceTimersByTime(1000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledWith('first_token');
    dl.stop();
  });

  it('NO aborta un stream que avanza token a token, aunque el total supere el idle-timeout', () => {
    const onTimeout = vi.fn();
    const dl = createStreamDeadline({ idleMs: 1000, ceilingMs: 100000, onTimeout });
    dl.start();
    // 10 tokens, uno cada 800ms (< idle 1000ms). Total transcurrido = 8000ms,
    // muy por encima del idle-timeout de 1000ms. Un deadline TOTAL habría
    // abortado a los 1000ms; el idle-timeout NO porque cada token lo reinicia.
    for (let i = 0; i < 10; i += 1) {
      vi.advanceTimersByTime(800);
      dl.onToken();
    }
    expect(onTimeout).not.toHaveBeenCalled();
    dl.stop();
  });

  it('aborta con razón "idle" cuando el stream avanza y luego SE ESTANCA', () => {
    const onTimeout = vi.fn();
    const dl = createStreamDeadline({ idleMs: 1000, ceilingMs: 100000, onTimeout });
    dl.start();
    // Avanza 3 tokens vivos...
    for (let i = 0; i < 3; i += 1) {
      vi.advanceTimersByTime(500);
      dl.onToken();
    }
    expect(onTimeout).not.toHaveBeenCalled();
    // ...y luego el backend se queda mudo: el idle-timeout dispara.
    vi.advanceTimersByTime(1000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledWith('idle');
    dl.stop();
  });

  it('cada token reinicia el idle-timer (no se acumulan disparos)', () => {
    const onTimeout = vi.fn();
    const dl = createStreamDeadline({ idleMs: 1000, ceilingMs: 100000, onTimeout });
    dl.start();
    vi.advanceTimersByTime(900);
    dl.onToken(); // reset
    vi.advanceTimersByTime(900);
    dl.onToken(); // reset
    vi.advanceTimersByTime(900);
    // En total pasaron 2700ms pero nunca 1000ms seguidos sin token.
    expect(onTimeout).not.toHaveBeenCalled();
    dl.stop();
  });
});

describe('streamDeadline — techo absoluto (backstop extremo)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('aborta con razón "ceiling" si el stream avanza eternamente más allá del techo', () => {
    const onTimeout = vi.fn();
    const dl = createStreamDeadline({ idleMs: 5000, ceilingMs: 10000, onTimeout });
    dl.start();
    // Tokens cada 1s (< idle 5s) → idle nunca dispara. Pero pasa el techo 10s.
    for (let i = 0; i < 15; i += 1) {
      vi.advanceTimersByTime(1000);
      dl.onToken();
    }
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledWith('ceiling');
    dl.stop();
  });

  it('el techo NO se reinicia con tokens (es absoluto desde start)', () => {
    const onTimeout = vi.fn();
    const dl = createStreamDeadline({ idleMs: 100000, ceilingMs: 3000, onTimeout });
    dl.start();
    dl.onToken();
    vi.advanceTimersByTime(1500);
    dl.onToken();
    vi.advanceTimersByTime(1500); // total 3000ms desde start → techo dispara
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledWith('ceiling');
    dl.stop();
  });
});

describe('streamDeadline — ciclo de vida y limpieza', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('stop() limpia ambos timers — no dispara onTimeout tras completar', () => {
    const onTimeout = vi.fn();
    const dl = createStreamDeadline({ idleMs: 1000, ceilingMs: 5000, onTimeout });
    dl.start();
    dl.onToken();
    dl.stop(); // respuesta completa → limpiar
    vi.advanceTimersByTime(60000);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('onToken() después de stop() es no-op (no re-arma timers)', () => {
    const onTimeout = vi.fn();
    const dl = createStreamDeadline({ idleMs: 1000, ceilingMs: 5000, onTimeout });
    dl.start();
    dl.stop();
    dl.onToken();
    vi.advanceTimersByTime(60000);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('onTimeout dispara una sola vez aunque ambos plazos se crucen', () => {
    const onTimeout = vi.fn();
    // idle y ceiling muy cercanos: tras disparar uno, el otro NO debe re-disparar.
    const dl = createStreamDeadline({ idleMs: 1000, ceilingMs: 1000, onTimeout });
    dl.start();
    vi.advanceTimersByTime(5000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    dl.stop();
  });

  it('usa los defaults: antes del primer token el presupuesto es FIRST_TOKEN_TIMEOUT_MS (el idle de 40s ya no aborta)', () => {
    const onTimeout = vi.fn();
    const dl = createStreamDeadline({ onTimeout });
    dl.start();
    // El idle (40s) ya NO aborta antes del primer token; hay que pasar firstToken.
    vi.advanceTimersByTime(FIRST_TOKEN_TIMEOUT_MS - 1);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledWith('first_token');
    dl.stop();
  });

  it('start() es idempotente — doble start no deja timers huérfanos', () => {
    const onTimeout = vi.fn();
    const dl = createStreamDeadline(/** @type {any} */ ({ firstTokenMs: 1000, idleMs: 1000, ceilingMs: 5000, onTimeout }));
    dl.start();
    dl.start(); // re-arranque: no debe acumular dos timers
    vi.advanceTimersByTime(1000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    dl.stop();
  });
});
