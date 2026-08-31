/**
 * angelitaVariedad — precalentarPoolIdle (ítem #60 del GAP compAI,
 * 2026-08-13: "precalentar el pool de variantes en idle").
 *
 * Contratos que cuidamos:
 *   - respeta el cupo por llamada (default 3, configurable).
 *   - acepta strings sueltos O {base, tipo}.
 *   - reutiliza el MISMO cooldown por base que refrescarPoolLLM (no dispara
 *     dos peticiones para el mismo mensaje en la ventana de 6h).
 *   - nunca lanza (array vacío/basura, fetch caído, lo que sea).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../apiService', () => ({
  fetchWithAuthRetry: vi.fn(async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: 'Café listo para cosechar en dos semanas.' } }] }),
  })),
}));

import { fetchWithAuthRetry } from '../apiService';
import { precalentarPoolIdle, _resetVariedad } from '../angelitaVariedad';

describe('precalentarPoolIdle (#60)', () => {
  beforeEach(() => {
    _resetVariedad();
    vi.mocked(fetchWithAuthRetry).mockClear();
  });

  it('array vacío o basura: no dispara nada y no lanza', async () => {
    await expect(precalentarPoolIdle([])).resolves.toBeUndefined();
    await expect(precalentarPoolIdle(null)).resolves.toBeUndefined();
    await expect(precalentarPoolIdle(undefined)).resolves.toBeUndefined();
    expect(fetchWithAuthRetry).not.toHaveBeenCalled();
  });

  it('respeta el cupo por defecto (3): 5 candidatos → solo 3 peticiones', async () => {
    const mensajes = ['Tiene café registrado.', 'Tiene plátano registrado.', 'Tiene maíz registrado.', 'Tiene fríjol registrado.', 'Tiene tomate registrado.'];
    await precalentarPoolIdle(mensajes);
    expect(fetchWithAuthRetry).toHaveBeenCalledTimes(3);
  });

  it('maxPorLlamada configurable: cupo de 1 dispara solo 1 petición', async () => {
    const mensajes = ['Tiene café registrado.', 'Tiene plátano registrado.'];
    await precalentarPoolIdle(mensajes, { maxPorLlamada: 1 });
    expect(fetchWithAuthRetry).toHaveBeenCalledTimes(1);
  });

  it('acepta objetos {base, tipo} tal como strings sueltos', async () => {
    await precalentarPoolIdle([{ base: 'Su café va bien esta semana.', tipo: 'celebracion' }]);
    expect(fetchWithAuthRetry).toHaveBeenCalledTimes(1);
  });

  it('filtra candidatos sin base usable, sin lanzar', async () => {
    await precalentarPoolIdle([{ tipo: 'informativa' }, { base: '   ' }, 'Su café va bien esta semana.']);
    expect(fetchWithAuthRetry).toHaveBeenCalledTimes(1);
  });

  it('cooldown compartido con refrescarPoolLLM: la MISMA base no dispara dos veces seguidas', async () => {
    const msg = 'Su café va bien esta semana, la broca sigue controlada.';
    await precalentarPoolIdle([msg]);
    expect(fetchWithAuthRetry).toHaveBeenCalledTimes(1);
    // Repetir de inmediato: el cooldown de 6h de refrescarPoolLLM lo frena.
    await precalentarPoolIdle([msg]);
    expect(fetchWithAuthRetry).toHaveBeenCalledTimes(1);
  });

  it('mensajes distintos no comparten cooldown entre sí', async () => {
    await precalentarPoolIdle(['Su café va bien.', 'Su plátano va bien.']);
    expect(fetchWithAuthRetry).toHaveBeenCalledTimes(2);
  });
});
