// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

import { describe, it, expect } from 'vitest';
import { _scientificToSpeciesId as toId, _scientificToMatchInfo as toMatch } from '../aiService';

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

describe('scientificToMatchInfo (V-03 #241/#242 — granularidad del match)', () => {
  it('matchType="exact" para binomial puro sin stripping', () => {
    expect(toMatch('Coffea arabica')).toEqual({ id: 'coffea_arabica', matchType: 'exact' });
    expect(toMatch('Solanum betaceum')).toEqual({ id: 'solanum_betaceum', matchType: 'exact' });
  });

  it('matchType="stripped-authority" cuando se quita autoría taxonómica', () => {
    expect(toMatch('Coffea arabica L.')).toEqual({ id: 'coffea_arabica', matchType: 'stripped-authority' });
    expect(toMatch('Erythrina edulis Triana ex Micheli')).toEqual({
      id: 'erythrina_edulis',
      matchType: 'stripped-authority',
    });
  });

  it('matchType="stripped-variety" cuando se quita cultivar/variedad/grupo', () => {
    expect(toMatch("Solanum tuberosum 'Pastusa'")).toEqual({
      id: 'solanum_tuberosum',
      matchType: 'stripped-variety',
    });
    expect(toMatch('Solanum tuberosum Grupo Phureja')).toEqual({
      id: 'solanum_tuberosum',
      matchType: 'stripped-variety',
    });
    expect(toMatch('Coffea arabica var. typica')).toEqual({
      id: 'coffea_arabica',
      matchType: 'stripped-variety',
    });
    expect(toMatch('Coffea arabica cv. Bourbon')).toEqual({
      id: 'coffea_arabica',
      matchType: 'stripped-variety',
    });
    expect(toMatch('Brassica oleracea subsp. capitata')).toEqual({
      id: 'brassica_oleracea',
      matchType: 'stripped-variety',
    });
  });

  it('matchType="stripped-hybrid" cuando se quita el marcador × o x separador', () => {
    expect(toMatch('Citrus × paradisi')).toEqual({
      id: 'citrus_paradisi',
      matchType: 'stripped-hybrid',
    });
    expect(toMatch('Fragaria x ananassa')).toEqual({
      id: 'fragaria_ananassa',
      matchType: 'stripped-hybrid',
    });
  });

  it('retorna null para inputs inválidos consistente con scientificToSpeciesId', () => {
    expect(toMatch('')).toBe(null);
    expect(toMatch('SoloUnaPalabra')).toBe(null);
    expect(toMatch(null)).toBe(null);
    expect(toMatch(undefined)).toBe(null);
  });
});
