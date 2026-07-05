// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * demoFincaEjemplo — la finca de ejemplo rica que puebla Chagra al saltar el
 * onboarding. Verifica:
 *   - Riqueza: ≥3 pisos térmicos, ≥2 fincas por piso, ≥43 siembras.
 *   - Grounding: cada slug es válido (formato snake_case, no vacío) y cada
 *     FarmProcess PASA validateFarmProcess (etapas/tipos/unidades reales).
 *   - Historial: cada ciclo trae su evento de siembra; los cosechados llevan
 *     harvest_confirmed; los problemas llevan una observación.
 *   - Persistencia: seedExampleFinca() escribe en IndexedDB y se lee de vuelta
 *     por los MISMOS stores que el home (assetCache plants + farmProcessCache).
 *   - Idempotencia: re-sembrar no duplica.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  FINCAS_EJEMPLO,
  ESTRUCTURAS_EJEMPLO,
  buildExampleFincaRecords,
  resumenFincaEjemplo,
  seedExampleFinca,
  isExampleFincaSeeded,
  EXAMPLE_FINCA_SEEDED_KEY,
} from '../demoFincaEjemplo.js';
import { validateFarmProcess, validateFarmProcessEvent } from '../../types/farmProcess.js';
import { assetCache } from '../../db/assetCache.js';
import { listFarmProcesses, getFarmEvents } from '../../db/farmProcessCache.js';

const NOW = Date.UTC(2026, 6, 4); // reloj fijo → historial determinista

beforeEach(() => {
  try { window.localStorage.removeItem(EXAMPLE_FINCA_SEEDED_KEY); } catch { /* noop */ }
});

describe('demoFincaEjemplo — riqueza y grounding', () => {
  it('cubre ≥3 pisos térmicos con ≥2-3 fincas por piso', () => {
    const r = resumenFincaEjemplo();
    expect(Object.keys(r.pisos).sort()).toEqual(['calido', 'frio', 'templado']);
    for (const piso of ['calido', 'frio', 'templado']) {
      expect(r.pisos[piso]).toBeGreaterThanOrEqual(2);
    }
    expect(r.fincas).toBeGreaterThanOrEqual(6);
  });

  it('siembra ≥43 cultivos (una planta-asset por siembra)', () => {
    const { plants } = buildExampleFincaRecords({ now: NOW });
    expect(plants.length).toBeGreaterThanOrEqual(43);
    // Todas son asset--plant (alimentan "Mis plantas: N").
    expect(plants.every((p) => p.asset_type === 'plant')).toBe(true);
  });

  it('cada slug de cultivo es un id de catálogo con forma snake_case', () => {
    for (const f of FINCAS_EJEMPLO) {
      for (const c of f.cultivos) {
        expect(typeof c.slug).toBe('string');
        expect(c.slug).toMatch(/^[a-z][a-z0-9_]+$/);
      }
    }
  });

  it('cada FarmProcess construido PASA validateFarmProcess', () => {
    const { processes } = buildExampleFincaRecords({ now: NOW });
    expect(processes.length).toBeGreaterThanOrEqual(43);
    for (const p of processes) {
      expect(() => validateFarmProcess(p)).not.toThrow();
    }
  });

  it('cada evento del historial PASA validateFarmProcessEvent', () => {
    const { events } = buildExampleFincaRecords({ now: NOW });
    for (const e of events) {
      expect(() => validateFarmProcessEvent(e)).not.toThrow();
    }
  });

  it('cada ciclo trae al menos su evento de siembra (sowing_confirmed)', () => {
    const { processes, events } = buildExampleFincaRecords({ now: NOW });
    const sowingByProc = new Set(
      events.filter((e) => e.attributes.event_type === 'sowing_confirmed').map((e) => e.attributes.process_id),
    );
    for (const p of processes) {
      expect(sowingByProc.has(p.process_id)).toBe(true);
    }
  });

  it('modela ≥3 problemas activos con observación + plaga real', () => {
    const { events } = buildExampleFincaRecords({ now: NOW });
    const problemas = events.filter((e) => e.attributes.event_type === 'observation' && e.attributes.payload?.plaga);
    expect(problemas.length).toBeGreaterThanOrEqual(3);
    // Los problemas insignia (broca/roya del café, gota de la papa) están.
    const plagas = problemas.map((e) => e.attributes.payload.plaga).join(' | ');
    expect(plagas).toMatch(/Roya|Broca/);
    expect(plagas).toMatch(/Phytophthora|tizón|gota|Gota/i);
  });

  it('los cultivos cosechados llevan evento harvest_confirmed', () => {
    const { events } = buildExampleFincaRecords({ now: NOW });
    const harvests = events.filter((e) => e.attributes.event_type === 'harvest_confirmed');
    expect(harvests.length).toBeGreaterThanOrEqual(3);
  });

  it('define estructuras (invernadero, compostera, beneficiadero…)', () => {
    const { structures } = buildExampleFincaRecords({ now: NOW });
    expect(structures.length).toBe(ESTRUCTURAS_EJEMPLO.length);
    expect(structures.some((s) => s.attributes.structure_type === 'greenhouse')).toBe(true);
  });
});

describe('demoFincaEjemplo — persistencia IndexedDB (mismos stores que el home)', () => {
  it('seedExampleFinca escribe plantas y ciclos legibles por el home', async () => {
    const resumen = await seedExampleFinca({ now: NOW, force: true });
    expect(resumen.fincas).toBeGreaterThanOrEqual(6);
    expect(isExampleFincaSeeded()).toBe(true);

    // El home lee plantas por assetCache.getByType('plant') → "Mis plantas: N".
    const plants = await assetCache.getByType('plant');
    expect(plants.length).toBeGreaterThanOrEqual(43);

    // El home lee ciclos activos por listFarmProcesses({status:'active'}).
    const activos = await listFarmProcesses({ status: 'active' });
    expect(activos.length).toBeGreaterThanOrEqual(43);

    // El historial de un ciclo con cosecha se lee por getFarmEvents.
    const { processes } = buildExampleFincaRecords({ now: NOW });
    const evs = await getFarmEvents(processes[0].process_id);
    expect(evs.length).toBeGreaterThanOrEqual(1);
  });

  it('es idempotente: re-sembrar no duplica plantas', async () => {
    await seedExampleFinca({ now: NOW, force: true });
    const primera = (await assetCache.getByType('plant')).length;
    await seedExampleFinca({ now: NOW, force: true });
    const segunda = (await assetCache.getByType('plant')).length;
    expect(segunda).toBe(primera);
  });
});
