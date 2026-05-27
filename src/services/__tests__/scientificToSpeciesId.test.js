// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

import { describe, it, expect } from 'vitest';
import { _scientificToSpeciesId as toId } from '../aiService';

describe('scientificToSpeciesId (QUICK-17)', () => {
  it('canónicos simples', () => {
    expect(toId('Coffea arabica L.')).toBe('coffea_arabica');
    expect(toId('Solanum betaceum')).toBe('solanum_betaceum');
    expect(toId('Erythrina edulis Triana ex Micheli')).toBe('erythrina_edulis');
  });

  it('hybrid mark × (Citrus × paradisi)', () => {
    expect(toId('Citrus × paradisi')).toBe('citrus_paradisi');
    expect(toId('Fragaria x ananassa')).toBe('fragaria_ananassa');
  });

  it('diacríticos normalizados (vision puede emitir "Solanum quitoensé")', () => {
    expect(toId('Solanum quitoense')).toBe('solanum_quitoense');
    expect(toId('Solanum quitoensé')).toBe('solanum_quitoense');
  });

  it('null para input inválido', () => {
    expect(toId('')).toBe(null);
    expect(toId('SoloUnaPalabra')).toBe(null);
    expect(toId(null)).toBe(null);
    expect(toId(undefined)).toBe(null);
    expect(toId(123)).toBe(null);
  });

  it('rechaza species_id con caracteres no ASCII tras pipeline', () => {
    // Si el modelo emite caracteres raros que sobreviven NFD, el regex final
    // debe rechazar igual.
    expect(toId('Plantæ andina')).toBe(null);
  });

  it('rechaza autoría taxonómica que parezca epíteto', () => {
    // Caso ambiguo: "Solanum L." — autoría L. no es epíteto, debe rechazar.
    expect(toId('Solanum L.')).toBe(null);
  });

  it('preserva caso real con grupo cultivar suprimido', () => {
    expect(toId('Solanum tuberosum Grupo Phureja')).toBe('solanum_tuberosum');
  });
});
