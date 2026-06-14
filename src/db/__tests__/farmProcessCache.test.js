import { describe, it, expect } from 'vitest';
import { DB_VERSION, STORES } from '../dbCore';
import { validateFarmProcessEvent } from '../../types/farmProcess';

/**
 * Bug A: el indice process_id de farm_process_events en v18 usaba keyPath
 * a nivel raiz, pero los eventos guardan process_id en attributes.process_id.
 *
 * Correccion: DB_VERSION sube a 19 con migracion que elimina el indice viejo
 * y lo recrea con keyPath 'attributes.process_id'.
 *
 * Tests de regresion: verifican el schema de evento y la version.
 */

describe('farmProcessCache - Bug A: schema process_id (DB_VERSION vigente)', () => {
  it('DB_VERSION es 21 (esquema vigente; v19 introdujo el indice process_id)', () => {
    expect(DB_VERSION).toBe(21);
  });

  it('STORES.FARM_PROCESS_EVENTS existe', () => {
    expect(STORES.FARM_PROCESS_EVENTS).toBe('farm_process_events');
  });

  it('validateFarmProcessEvent espera process_id en attributes (no en raiz)', () => {
    // Si process_id estuviera en raiz, este evento pasaria validacion
    const eventWithProcessIdInAttributes = {
      event_id: 'evt-01',
      type: 'farm_process_event',
      attributes: {
        process_id: 'proc-01',
        event_type: 'sowing_confirmed',
        occurred_at: Date.now(),
      },
    };
    expect(() => validateFarmProcessEvent(eventWithProcessIdInAttributes)).not.toThrow();

    // Si process_id esta en raiz pero NO en attributes, debe fallar
    const eventWithProcessIdAtRoot = {
      event_id: 'evt-02',
      type: 'farm_process_event',
      process_id: 'proc-02',
      attributes: {
        event_type: 'sowing_confirmed',
        occurred_at: Date.now(),
      },
    };
    expect(() => validateFarmProcessEvent(eventWithProcessIdAtRoot)).toThrow('Missing process_id');
  });

  it('un evento bien formado pasa validacion completa', () => {
    const event = {
      event_id: '01JABC1234567890',
      type: 'farm_process_event',
      attributes: {
        process_id: '01JABC1234567890-PROC',
        event_type: 'stage_transition',
        occurred_at: Date.now(),
        actor: 'operator',
        source: 'operator',
        payload: { from_stage: 'vegetative', to_stage: 'flowering' },
      },
    };
    expect(() => validateFarmProcessEvent(event)).not.toThrow();
  });
});
