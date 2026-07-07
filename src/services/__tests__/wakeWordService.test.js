/**
 * wakeWordService.test.js — cubre la lógica PURA de umbral/cooldown de
 * `startListening()` con un `transfer` recognizer simulado (sin TF.js real
 * — eso lo cubre tests/e2e-real/modo-campo-wakeword.smoke.mjs contra el
 * modelo shippeado de verdad, con audio held-out). Acá el objetivo es
 * blindar la regla de negocio: "hola chagra" >= WAKE_THRESHOLD dispara
 * onWake exactamente una vez por ventana de WAKE_COOLDOWN_MS.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startListening, WAKE_THRESHOLD, WAKE_COOLDOWN_MS } from '../wakeWordService';

function makeFakeTransfer() {
  let callback;
  return {
    listen: vi.fn((cb) => { callback = cb; return Promise.resolve(); }),
    stopListening: vi.fn(() => Promise.resolve()),
    emit(scores) { callback({ scores }); },
  };
}

describe('wakeWordService — startListening (umbral + cooldown)', () => {
  /** @type {import('vitest').MockInstance<() => number>} */
  let nowSpy;

  beforeEach(() => {
    nowSpy = vi.spyOn(performance, 'now').mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('NO llama onWake si el score está bajo WAKE_THRESHOLD', () => {
    const transfer = makeFakeTransfer();
    const onWake = vi.fn();
    startListening({ transfer, wakeIndex: 0, onWake });
    transfer.emit([WAKE_THRESHOLD - 0.01]);
    expect(onWake).not.toHaveBeenCalled();
  });

  it('llama onWake cuando el score alcanza WAKE_THRESHOLD', () => {
    const transfer = makeFakeTransfer();
    const onWake = vi.fn();
    startListening({ transfer, wakeIndex: 0, onWake });
    transfer.emit([WAKE_THRESHOLD]);
    expect(onWake).toHaveBeenCalledTimes(1);
  });

  it('usa el índice correcto (wakeIndex) cuando hay varias clases', () => {
    const transfer = makeFakeTransfer();
    const onWake = vi.fn();
    // wakeIndex=1: la clase "hola chagra" es la SEGUNDA del array de scores.
    startListening({ transfer, wakeIndex: 1, onWake });
    transfer.emit([0.99, 0.1]); // alta en otra clase, baja en la del wake-word
    expect(onWake).not.toHaveBeenCalled();
    transfer.emit([0.1, 0.99]);
    expect(onWake).toHaveBeenCalledTimes(1);
  });

  it('aplica cooldown anti doble-disparo (no re-dispara dentro de WAKE_COOLDOWN_MS)', () => {
    const transfer = makeFakeTransfer();
    const onWake = vi.fn();
    startListening({ transfer, wakeIndex: 0, onWake });

    nowSpy.mockReturnValue(0);
    transfer.emit([WAKE_THRESHOLD]);
    expect(onWake).toHaveBeenCalledTimes(1);

    // Todavía dentro del cooldown: no debe re-disparar.
    nowSpy.mockReturnValue(WAKE_COOLDOWN_MS - 1);
    transfer.emit([WAKE_THRESHOLD]);
    expect(onWake).toHaveBeenCalledTimes(1);

    // Pasado el cooldown: puede volver a disparar.
    nowSpy.mockReturnValue(WAKE_COOLDOWN_MS + 1);
    transfer.emit([WAKE_THRESHOLD]);
    expect(onWake).toHaveBeenCalledTimes(2);
  });

  it('reporta el score en cada frame vía onScore, dispare o no', () => {
    const transfer = makeFakeTransfer();
    const onScore = vi.fn();
    startListening({ transfer, wakeIndex: 0, onWake: () => {}, onScore });
    transfer.emit([0.42]);
    expect(onScore).toHaveBeenCalledWith(0.42);
  });

  it('devuelve una función stop() que llama transfer.stopListening()', async () => {
    const transfer = makeFakeTransfer();
    const stop = startListening({ transfer, wakeIndex: 0, onWake: () => {} });
    await stop();
    expect(transfer.stopListening).toHaveBeenCalledTimes(1);
  });
});
