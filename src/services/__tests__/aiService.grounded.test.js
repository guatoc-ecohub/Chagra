/**
 * Tests para `recognizeSpeciesGrounded` y `scientificToSpeciesId` —
 * wiring de validate_visual_match al pipeline de foto. Anti-hallucination
 * visión (PR chagra-pro #48 expuso la tool, este PR la consume).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock del sidecarClient ANTES de importar aiService.
vi.mock('../sidecarClient.js', () => ({
  isSidecarEnabled: vi.fn(() => true),
  callTool: vi.fn(),
  planNlu: vi.fn(),
}));

// Mock de recognizeSpecies para no llamar a Ollama. recognizeSpeciesGrounded
// es wrapper sobre recognizeSpecies — verificamos el wiring sin pegar al modelo.
vi.mock('../ollamaStream', () => ({
  streamOllama: vi.fn(),
}));
vi.mock('../ragRetriever', () => ({
  retrieve: vi.fn().mockResolvedValue([]),
}));

import { recognizeSpeciesGrounded } from '../aiService.js';
import * as sidecarClient from '../sidecarClient.js';
import * as ollamaStream from '../ollamaStream.js';

function mockVisionResponse(json) {
  ollamaStream.streamOllama.mockResolvedValueOnce(JSON.stringify(json));
}

describe('recognizeSpeciesGrounded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sidecarClient.isSidecarEnabled.mockReturnValue(true);
    // Browser online por default.
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cuando el vision identifica species válida del catálogo, marca _grounded:true', async () => {
    mockVisionResponse({
      common_name_es: 'café',
      scientific_name: 'Coffea arabica L.',
      confidence: 0.92,
      alternatives: [],
    });
    sidecarClient.callTool.mockResolvedValueOnce({
      available: true,
      results: [
        {
          species_id: 'coffea_arabica',
          valid: true,
          confidence_input: 0.92,
          confidence_adjusted: 0.92,
          nombre_comun: 'Café',
          nombre_cientifico: 'Coffea arabica L.',
        },
      ],
    });

    const blob = new Blob(['fake'], { type: 'image/jpeg' });
    const result = await recognizeSpeciesGrounded(blob);

    expect(result).toBeTruthy();
    expect(result._grounded).toBe(true);
    expect(result._validation.valid).toBe(true);
    expect(sidecarClient.callTool).toHaveBeenCalledWith(
      'validate_visual_match',
      expect.objectContaining({
        candidates: expect.arrayContaining([
          expect.objectContaining({ species_id: 'coffea_arabica', confidence: 0.92 }),
        ]),
      }),
    );
  });

  it('cuando el vision alucina una especie inexistente, marca _grounded:false', async () => {
    mockVisionResponse({
      common_name_es: 'planta inventada',
      scientific_name: 'Mangosteenia colombiana',
      confidence: 0.78,
      alternatives: [],
    });
    sidecarClient.callTool.mockResolvedValueOnce({
      available: true,
      results: [
        {
          species_id: 'mangosteenia_colombiana',
          valid: false,
          confidence_input: 0.78,
          confidence_adjusted: 0,
          reason: 'not_in_catalog',
        },
      ],
    });

    const blob = new Blob(['fake'], { type: 'image/jpeg' });
    const result = await recognizeSpeciesGrounded(blob);

    expect(result._grounded).toBe(false);
    expect(result._validation.valid).toBe(false);
    expect(result._validation.confidence_adjusted).toBe(0);
  });

  it('si el sidecar está disabled, degrada a recognizeSpecies sin validar', async () => {
    sidecarClient.isSidecarEnabled.mockReturnValue(false);
    mockVisionResponse({
      common_name_es: 'tomate',
      scientific_name: 'Solanum lycopersicum',
      confidence: 0.85,
      alternatives: [],
    });

    const blob = new Blob(['fake'], { type: 'image/jpeg' });
    const result = await recognizeSpeciesGrounded(blob);

    expect(result._grounded).toBeNull();
    expect(sidecarClient.callTool).not.toHaveBeenCalled();
  });

  it('si offline, degrada sin validar', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      configurable: true,
    });
    mockVisionResponse({
      common_name_es: 'lechuga',
      scientific_name: 'Lactuca sativa',
      confidence: 0.88,
      alternatives: [],
    });

    const blob = new Blob(['fake'], { type: 'image/jpeg' });
    const result = await recognizeSpeciesGrounded(blob);

    expect(result._grounded).toBeNull();
    expect(sidecarClient.callTool).not.toHaveBeenCalled();
  });

  it('si scientific_name está vacío o malformado, no llama al sidecar', async () => {
    mockVisionResponse({
      common_name_es: 'desconocido',
      scientific_name: '', // vacío
      confidence: 0.4,
      alternatives: [],
    });

    const blob = new Blob(['fake'], { type: 'image/jpeg' });
    const result = await recognizeSpeciesGrounded(blob);

    expect(result._grounded).toBeNull();
    expect(sidecarClient.callTool).not.toHaveBeenCalled();
  });

  it('incluye alternativas en candidates cuando el vision las devuelve', async () => {
    mockVisionResponse({
      common_name_es: 'café',
      scientific_name: 'Coffea arabica',
      confidence: 0.6,
      alternatives: [
        { scientific_name: 'Coffea canephora', confidence: 0.3 },
        { scientific_name: 'Coffea liberica', confidence: 0.15 },
      ],
    });
    sidecarClient.callTool.mockResolvedValueOnce({
      available: true,
      results: [
        { species_id: 'coffea_arabica', valid: true, confidence_adjusted: 0.6 },
        { species_id: 'coffea_canephora', valid: false, confidence_adjusted: 0 },
        { species_id: 'coffea_liberica', valid: false, confidence_adjusted: 0 },
      ],
    });

    const blob = new Blob(['fake'], { type: 'image/jpeg' });
    const result = await recognizeSpeciesGrounded(blob);

    expect(result._grounded).toBe(true);
    expect(result._all_validations).toHaveLength(3);
    expect(sidecarClient.callTool).toHaveBeenCalledWith(
      'validate_visual_match',
      expect.objectContaining({
        candidates: expect.arrayContaining([
          expect.objectContaining({ species_id: 'coffea_arabica' }),
          expect.objectContaining({ species_id: 'coffea_canephora' }),
          expect.objectContaining({ species_id: 'coffea_liberica' }),
        ]),
      }),
    );
  });

  it('si el sidecar tool falla (devuelve null), degrada', async () => {
    mockVisionResponse({
      common_name_es: 'aguacate',
      scientific_name: 'Persea americana',
      confidence: 0.95,
      alternatives: [],
    });
    sidecarClient.callTool.mockResolvedValueOnce(null);

    const blob = new Blob(['fake'], { type: 'image/jpeg' });
    const result = await recognizeSpeciesGrounded(blob);

    expect(result._grounded).toBeNull();
    expect(result.scientific_name).toBe('Persea americana');
  });
});
