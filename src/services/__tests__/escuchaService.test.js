/**
 * Tests del trigger desacoplado de escucha: HOY lo llama el tap del FAB,
 * MAÑANA el wake-word "hola Chagra". El contrato es el evento
 * `chagra:escucha` en window — el overlay no sabe quién lo activó.
 */
import { describe, it, expect, vi } from 'vitest';
import { activarEscucha, onEscucha, EVENTO_ESCUCHA } from '../escuchaService.js';

describe('escuchaService — trigger desacoplado', () => {
  it('activarEscucha() despacha el evento con fuente tap por defecto', () => {
    const spy = vi.fn();
    window.addEventListener(EVENTO_ESCUCHA, spy);
    const ok = activarEscucha();
    window.removeEventListener(EVENTO_ESCUCHA, spy);

    expect(ok).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.fuente).toBe('tap');
    expect(typeof spy.mock.calls[0][0].detail.ts).toBe('number');
  });

  it('el wake-word de mañana usa el MISMO trigger con fuente wakeword', () => {
    const recibido = [];
    const off = onEscucha((detail) => recibido.push(detail));
    activarEscucha({ fuente: 'wakeword' });
    off();

    expect(recibido).toHaveLength(1);
    expect(recibido[0].fuente).toBe('wakeword');
  });

  it('onEscucha devuelve un desuscriptor que corta el flujo', () => {
    const cb = vi.fn();
    const off = onEscucha(cb);
    activarEscucha();
    off();
    activarEscucha();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fuente inválida degrada a tap', () => {
    const cb = vi.fn();
    const off = onEscucha(cb);
    activarEscucha({ fuente: '' });
    off();
    expect(cb.mock.calls[0][0].fuente).toBe('tap');
  });
});
