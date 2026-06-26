// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * Prueba del CAMINO MANUAL del registro unificado (#23).
 *
 * El respaldo a mano de la puerta única arma un registro EN BLANCO
 * (source='manual', sin transcripción) y lo edita con RegistroVozConfirm; al
 * confirmar lo escribe con la MISMA tubería que la voz: buildVoicePayload →
 * savePayload. Esta prueba verifica que un registro manual (no de voz):
 *   - produce el saveType/entidad FarmOS correcto por tipo,
 *   - persiste los campos que el formulario adaptativo captura (insumo, labor,
 *     plaga, cantidad), y
 *   - la nota de procedencia dice "a mano" (no "por voz: ''").
 *
 * Es la garantía anti-cáscara: el flujo unificado escribe registros REALES y
 * correctos, no un shell visual.
 */
import { describe, it, expect } from 'vitest';
import { buildVoicePayload } from '../voiceRecordPayload';
import { INTENTS } from '../voiceFieldExtractor';

const NOW = Date.UTC(2026, 5, 25, 12, 0, 0);

/** Registro en blanco igual al que arma RegistroUnificadoScreen.blankRecord. */
const blank = (intent, over = {}) => ({
  intent,
  secondary: null,
  confidence: 1,
  source: 'manual',
  transcription: '',
  species: [],
  speciesHint: null,
  measures: {},
  phenology: [],
  symptoms: [],
  pest: null,
  labors: [],
  input: null,
  position: { raw: '', locative: false },
  time: { raw: '', offsetDays: 0 },
  timestampMs: NOW,
  ...over,
});

describe('manual: nota de procedencia', () => {
  it('dice "Registrado a mano", no "por voz" con comillas vacías', () => {
    const { payload } = buildVoicePayload(blank(INTENTS.OBSERVACION));
    const notes = payload.data.attributes.notes.value;
    expect(notes).toMatch(/Registrado a mano/);
    expect(notes).not.toMatch(/por voz: ""/);
  });
});

describe('manual cosecha → log--harvest', () => {
  const { saveType, payload } = buildVoicePayload(
    blank(INTENTS.COSECHA, {
      species: [{ common: 'Mora', slug: 'rubus_glaucus', raw: 'mora' }],
      measures: { cantidad: 3, unidad: 'arroba' },
    }),
    { locationAssetId: 'land-1' },
  );
  it('es un log--harvest con quantity de peso', () => {
    expect(saveType).toBe('harvest');
    expect(payload.data.type).toBe('log--harvest');
    expect(payload.data.relationships.quantity.data[0].attributes.measure).toBe('weight');
  });
  it('nombra la cosecha con la especie elegida', () => {
    expect(payload.data.attributes.name).toBe('Cosecha de Mora');
  });
  it('hila la zona seleccionada (location)', () => {
    expect(payload.data.relationships.location.data[0].id).toBe('land-1');
  });
});

describe('manual insumo → log--input', () => {
  const { saveType, payload } = buildVoicePayload(
    blank(INTENTS.INSUMO, { input: 'caldo bordelés', measures: { cantidad: 2, unidad: 'litro' } }),
  );
  it('es un log--input con el material aplicado como categoría', () => {
    expect(saveType).toBe('input');
    expect(payload.data.type).toBe('log--input');
    expect(payload.data.relationships.category.data[0].attributes.name).toBe('caldo bordelés');
  });
  it('nombra la aplicación con el insumo', () => {
    expect(payload.data.attributes.name).toBe('Aplicación de caldo bordelés');
  });
  it('persiste la cantidad como quantity', () => {
    expect(payload.data.relationships.quantity.data[0].attributes.value.decimal).toBe('2');
  });
});

describe('manual mantenimiento → log--task', () => {
  const { saveType, payload } = buildVoicePayload(
    blank(INTENTS.MANTENIMIENTO, { labors: ['poda', 'deshierbe'] }),
  );
  it('es un log--task que nombra las labores', () => {
    expect(saveType).toBe('task');
    expect(payload.data.type).toBe('log--task');
    expect(payload.data.attributes.name).toBe('Mantenimiento: poda + deshierbe');
  });
});

describe('manual plaga → log--observation', () => {
  const { saveType, payload } = buildVoicePayload(
    blank(INTENTS.PLAGA, { pest: 'hormiga arriera' }),
    { wkt: 'POINT(-76.6 2.4)' },
  );
  it('es un log--observation reportado con severidad alta y geometría', () => {
    expect(saveType).toBe('observation');
    expect(payload.data.type).toBe('log--observation');
    expect(payload.data.attributes.status).toBe('reported');
    expect(payload.data.attributes.severity).toBe('high');
    expect(payload.data.attributes.name).toBe('Reporte: hormiga arriera');
    expect(payload.data.attributes.geometry).toBe('POINT(-76.6 2.4)');
  });
});
