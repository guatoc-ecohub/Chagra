import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createStreamDeadline,
  FIRST_TOKEN_TIMEOUT_MS,
  IDLE_TIMEOUT_MS,
  HARD_CEILING_MS,
} from '../streamDeadline';

// Fix 2026-06-13: el idle de 40s abortaba ANTES del primer token (95-151s bajo
// carga) → "Tiempo agotado". Ahora el primer token tiene presupuesto separado.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('streamDeadline — presupuesto del primer token', () => {
  it('NO aborta esperando el primer token aunque pase el idle (40s)', () => {
    const onTimeout = vi.fn();
    const d = createStreamDeadline({ onTimeout });
    d.start();
    vi.advanceTimersByTime(IDLE_TIMEOUT_MS + 5000); // 45s: > idle, < firstToken
    expect(onTimeout).not.toHaveBeenCalled();
    d.stop();
  });

  it('aborta con "first_token" si el primer token nunca llega', () => {
    const onTimeout = vi.fn();
    const d = createStreamDeadline({ onTimeout });
    d.start();
    vi.advanceTimersByTime(FIRST_TOKEN_TIMEOUT_MS + 1000);
    expect(onTimeout).toHaveBeenCalledWith('first_token');
  });

  it('tras el primer token aplica el idle de 40s entre tokens', () => {
    const onTimeout = vi.fn();
    const d = createStreamDeadline({ onTimeout });
    d.start();
    vi.advanceTimersByTime(60000); // 60s sin token: ok (< firstToken)
    d.onToken();                    // primer token a los 60s → cambia a idle
    vi.advanceTimersByTime(IDLE_TIMEOUT_MS + 1000); // gap > idle
    expect(onTimeout).toHaveBeenCalledWith('idle');
  });

  it('el techo absoluto dispara aunque sigan llegando tokens', () => {
    const onTimeout = vi.fn();
    const d = createStreamDeadline({ onTimeout });
    d.start();
    for (let t = 0; t < HARD_CEILING_MS + 10000; t += 10000) {
      vi.advanceTimersByTime(10000);
      d.onToken();
    }
    expect(onTimeout).toHaveBeenCalledWith('ceiling');
  });
});
