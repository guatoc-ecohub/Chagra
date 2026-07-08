/**
 * usageTelemetryService.test.js — cobertura de los envoltorios de telemetría
 * ANÓNIMA de uso (src/services/usageTelemetryService.js).
 *
 * Este servicio NUNCA tenía test propio: solo aparecía mockeado en pruebas de
 * componentes (temas-fase2-1-contraste.test.jsx), que no ejercitan su lógica
 * real (validación de entrada, filtrado de `extra`, no-throw). Se cubre acá:
 *
 *   - Cada función valida el id/categoría requerido (string no vacío tras
 *     trim) y NO llama a `recordPilotEvent` si falla la validación.
 *   - `safeExtra` (privacidad, defensa extra): solo deja pasar valores
 *     number/boolean/string; descarta objetos, arrays, funciones, undefined.
 *   - `recordAgentQueryCategory` solo manda la CATEGORÍA, nunca texto libre.
 *   - [BUG documentado, no se toca el fuente] el try/catch de cada wrapper es
 *     SÍNCRONO: envuelve la llamada a `recordPilotEvent`, no la promesa que
 *     ésta devuelve. Si `recordPilotEvent` (async) rechazara, el catch NO lo
 *     atraparía, pese a que el header del archivo documenta "no-throw". En
 *     producción no se manifiesta porque `recordPilotEvent` real tiene su
 *     propio try/catch interno y nunca rechaza — pero el wrapper no ofrece
 *     la protección extra que promete si esa garantía cambiara.
 *
 * Nota tsc: `vi.mocked(fn)` en vez de `.mockX` directo sobre el import, y
 * casts `/** @type {any} *\/` en los valores deliberadamente inválidos que
 * pasamos a funciones tipadas por JSDoc (memoria
 * feedback-tsc-gate-bottleneck-nuevos-archivos).
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../pilotTelemetryService.js', () => ({
  recordPilotEvent: vi.fn(),
}));

import { recordPilotEvent } from '../pilotTelemetryService.js';
import {
  recordGameStart,
  recordGameComplete,
  recordScreenView,
  recordFeatureUse,
  recordAgentQueryCategory,
} from '../usageTelemetryService.js';

beforeEach(() => {
  vi.mocked(recordPilotEvent).mockReset();
  vi.mocked(recordPilotEvent).mockResolvedValue({ id: 'pt_1' });
});

describe('recordGameStart', () => {
  it('registra game_start con el game_id dado', async () => {
    await recordGameStart('milpa');
    expect(recordPilotEvent).toHaveBeenCalledWith({
      event_type: 'game_start',
      metadata: { game_id: 'milpa' },
    });
  });

  /** @type {Array<[unknown, string]>} */
  const gameIdsInvalidos = [
    ['', 'vacío'],
    ['   ', 'solo espacios'],
    [null, 'null'],
    [undefined, 'undefined'],
    [123, 'numero (no-string)'],
  ];

  it.each(gameIdsInvalidos)('gameId inválido (%s: %s) → null sin llamar a recordPilotEvent', async (bad) => {
    const out = await recordGameStart(/** @type {any} */ (bad));
    expect(out).toBeNull();
    expect(recordPilotEvent).not.toHaveBeenCalled();
  });

  it('[BUG] promete no-throw pero el try/catch síncrono no atrapa el rechazo async de recordPilotEvent', async () => {
    vi.mocked(recordPilotEvent).mockRejectedValue(new Error('IndexedDB no disponible'));
    await expect(recordGameStart('milpa')).rejects.toThrow('IndexedDB no disponible');
  });
});

describe('recordGameComplete', () => {
  it('registra game_complete con game_id y extra sanitizado', async () => {
    await recordGameComplete('milpa', { score: 42, won: true, level: 'facil' });
    expect(recordPilotEvent).toHaveBeenCalledWith({
      event_type: 'game_complete',
      metadata: { game_id: 'milpa', score: 42, won: true, level: 'facil' },
    });
  });

  it('sin extra → metadata solo con game_id', async () => {
    await recordGameComplete('doom_finca');
    expect(recordPilotEvent).toHaveBeenCalledWith({
      event_type: 'game_complete',
      metadata: { game_id: 'doom_finca' },
    });
  });

  it('descarta valores no primitivos de extra (objetos, arrays, funciones, undefined)', async () => {
    await recordGameComplete('milpa', /** @type {any} */ ({
      score: 10,
      nested: { a: 1 },
      list: [1, 2, 3],
      cb: () => {},
      missing: undefined,
      raw: null,
    }));
    const [{ metadata }] = vi.mocked(recordPilotEvent).mock.calls[0];
    expect(metadata).toEqual({ game_id: 'milpa', score: 10 });
  });

  it('gameId inválido → null, no llama recordPilotEvent', async () => {
    const out = await recordGameComplete('');
    expect(out).toBeNull();
    expect(recordPilotEvent).not.toHaveBeenCalled();
  });
});

describe('recordScreenView', () => {
  it('registra screen_view con el screen dado', async () => {
    await recordScreenView('activos');
    expect(recordPilotEvent).toHaveBeenCalledWith({
      event_type: 'screen_view',
      metadata: { screen: 'activos' },
    });
  });

  it('screen vacío/blanco → null', async () => {
    expect(await recordScreenView('')).toBeNull();
    expect(await recordScreenView('   ')).toBeNull();
    expect(recordPilotEvent).not.toHaveBeenCalled();
  });
});

describe('recordFeatureUse', () => {
  it('registra feature_use con feature y extra sanitizado', async () => {
    await recordFeatureUse('foto_diagnostico', { confidence: 0.87, plaga_detectada: true });
    expect(recordPilotEvent).toHaveBeenCalledWith({
      event_type: 'feature_use',
      metadata: { feature: 'foto_diagnostico', confidence: 0.87, plaga_detectada: true },
    });
  });

  it('feature inválido (no-string) → null sin llamar a recordPilotEvent', async () => {
    const out = await recordFeatureUse(/** @type {any} */ (undefined));
    expect(out).toBeNull();
    expect(recordPilotEvent).not.toHaveBeenCalled();
  });
});

describe('recordAgentQueryCategory — privacidad', () => {
  it('registra agent_query con SOLO la categoría (ninguna otra clave)', async () => {
    await recordAgentQueryCategory('controladores_plagas');
    expect(recordPilotEvent).toHaveBeenCalledTimes(1);
    const [{ event_type, metadata }] = vi.mocked(recordPilotEvent).mock.calls[0];
    expect(event_type).toBe('agent_query');
    expect(Object.keys(metadata)).toEqual(['category']);
    expect(metadata.category).toBe('controladores_plagas');
  });

  it('NO tiene forma de adjuntar texto libre del usuario: solo acepta un string y lo manda tal cual como category', async () => {
    // Esta función no recibe un objeto `extra` (a diferencia de game_complete
    // y feature_use) — por diseño, no hay superficie para colar texto de
    // prompt/respuesta. Verificamos que la firma es (category) => ..., y que
    // pasar algo que no sea string no-vacío se descarta.
    expect(await recordAgentQueryCategory(/** @type {any} */ (null))).toBeNull();
    expect(await recordAgentQueryCategory(/** @type {any} */ (42))).toBeNull();
    expect(recordPilotEvent).not.toHaveBeenCalled();
  });

  it('[BUG] promete no-throw pero el try/catch síncrono no atrapa el rechazo async de recordPilotEvent', async () => {
    vi.mocked(recordPilotEvent).mockRejectedValue(new Error('boom'));
    await expect(recordAgentQueryCategory('fenologia')).rejects.toThrow('boom');
  });
});
