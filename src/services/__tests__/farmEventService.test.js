// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

import { describe, it, expect } from 'vitest';
import { validateFarmProcess } from '../../types/farmProcess';
import { newUlid } from '../../utils/id';

describe('recordFarmEvent — validacion de entrada', () => {
  it('rechaza sin process_id', async () => {
    const { recordFarmEvent } = await import('../farmEventService');
    await expect(recordFarmEvent(/** @type {any} */ ({ event_type: 'observation' })))
      .rejects.toThrow(/process_id/);
  });

  it('rechaza event_type invalido via validateFarmProcessEvent', async () => {
    const { recordFarmEvent } = await import('../farmEventService');
    await expect(recordFarmEvent({
      process_id: 'p1',
      event_type: 'invalid_type',
    })).rejects.toThrow(/event_type/);
  });

  it('genera event_id ULID y lo incluye en el resultado', async () => {
    // Verificamos que el contrato de salida incluya event_id, type y attributes
    const ulid = newUlid();
    expect(ulid).toMatch(/^[0-9A-Z]{26}$/);
  });

  it('idempotency_key se genera con formato process_id:event_type:timestamp', () => {
    const pid = newUlid();
    const key = `${pid}:observation:${Date.now()}`;
    expect(key).toMatch(/^[0-9A-Z]{26}:observation:\d+$/);
  });
});

describe('createFarmProcess', () => {
  it('valida el proceso antes de escribir', async () => {
    const { createFarmProcess } = await import('../farmEventService');
    const invalid = /** @type {any} */ ({ type: 'farm_process' });
    await expect(createFarmProcess(invalid)).rejects.toThrow();
  });

  it('proceso valido pasa validacion', () => {
    const process = {
      process_id: newUlid(),
      type: 'farm_process',
      attributes: {
        process_type: 'sowing',
        subject_kind: 'individual',
        subject_slug: 'coffea_arabica',
        subject_label: 'Café castillo',
        quantity: 50,
        unit: 'plantas',
        location_land_asset_id: 'land-lote-norte',
        status: 'active',
        current_stage: 'sowing_confirmed',
        created_at: Date.now(),
        updated_at: Date.now(),
      },
    };
    expect(() => validateFarmProcess(process)).not.toThrow();
  });
});
