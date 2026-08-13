/**
 * angelitaVariedad — telemetría plantilla-vs-LLM (#62).
 *
 * Contratos que cuidamos:
 *   - registrarOrigenVariante acumula por origen ('base'|'plantilla'|'llm').
 *   - un origen inválido no rompe ni cuenta nada.
 *   - resumenTelemetriaVariedad suma los tres al `total`.
 *   - variarMensaje() SIEMPRE registra algún origen (nunca queda sin contar).
 *   - _resetVariedad() también limpia el contador de telemetría.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  variarMensaje,
  registrarOrigenVariante,
  resumenTelemetriaVariedad,
  _resetVariedad,
} from '../angelitaVariedad';

describe('telemetría plantilla-vs-LLM (#62)', () => {
  beforeEach(() => {
    _resetVariedad();
  });

  it('arranca en cero', () => {
    expect(resumenTelemetriaVariedad()).toEqual({ base: 0, plantilla: 0, llm: 0, total: 0 });
  });

  it('registrarOrigenVariante acumula por origen', () => {
    registrarOrigenVariante('plantilla');
    registrarOrigenVariante('plantilla');
    registrarOrigenVariante('llm');
    const r = resumenTelemetriaVariedad();
    expect(r).toEqual({ base: 0, plantilla: 2, llm: 1, total: 3 });
  });

  it('un origen inválido no cuenta ni lanza', () => {
    registrarOrigenVariante('lo-que-sea');
    expect(resumenTelemetriaVariedad().total).toBe(0);
  });

  it('variarMensaje() siempre registra algún origen — el total sube', () => {
    variarMensaje('Tiene café registrado en su finca.', 'informativa', { sinLLM: true });
    expect(resumenTelemetriaVariedad().total).toBe(1);
    variarMensaje('Tiene café registrado en su finca.', 'informativa', { sinLLM: true });
    expect(resumenTelemetriaVariedad().total).toBe(2);
  });

  it('_resetVariedad() limpia también el contador de telemetría', () => {
    registrarOrigenVariante('llm');
    expect(resumenTelemetriaVariedad().total).toBe(1);
    _resetVariedad();
    expect(resumenTelemetriaVariedad().total).toBe(0);
  });
});
