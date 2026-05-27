/**
 * Tests para `recognizeSpeciesGrounded` y `scientificToSpeciesId` —
 * wiring de validate_visual_match al pipeline de foto. Anti-hallucination
 * visión (PR chagra-pro #48 expuso la tool, este PR la consume).
 *
 * V-05 (audit-vision-chagra-2026-05-26): `_grounded` ahora es objeto
 * estructurado `{ status, reason, validation }` con 6 statuses posibles:
 *   verified, rejected, sidecar-disabled, offline, no-binomial, sidecar-error.
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

  it('status:verified cuando el vision identifica species válida del catálogo', async () => {
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
    expect(result._grounded.status).toBe('verified');
    expect(result._grounded.reason).toMatch(/catálogo/i);
    expect(result._grounded.validation).toBeTruthy();
    expect(result._grounded.validation.valid).toBe(true);
    // backwards-compat alias
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

  it('status:rejected cuando el vision alucina una especie inexistente', async () => {
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

    expect(result._grounded.status).toBe('rejected');
    expect(result._grounded.reason).toMatch(/no encontrada/i);
    expect(result._grounded.validation.valid).toBe(false);
    expect(result._validation.valid).toBe(false);
    expect(result._validation.confidence_adjusted).toBe(0);
  });

  it('status:sidecar-disabled si el sidecar está apagado vía feature flag', async () => {
    sidecarClient.isSidecarEnabled.mockReturnValue(false);
    mockVisionResponse({
      common_name_es: 'tomate',
      scientific_name: 'Solanum lycopersicum',
      confidence: 0.85,
      alternatives: [],
    });

    const blob = new Blob(['fake'], { type: 'image/jpeg' });
    const result = await recognizeSpeciesGrounded(blob);

    expect(result._grounded.status).toBe('sidecar-disabled');
    expect(result._grounded.reason).toMatch(/deshabilitada/i);
    expect(result._grounded.validation).toBeNull();
    expect(sidecarClient.callTool).not.toHaveBeenCalled();
  });

  it('status:offline si el browser no tiene conexión', async () => {
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

    expect(result._grounded.status).toBe('offline');
    expect(result._grounded.reason).toMatch(/conexión/i);
    expect(result._grounded.validation).toBeNull();
    expect(sidecarClient.callTool).not.toHaveBeenCalled();
  });

  it('status:no-binomial si scientific_name está vacío o malformado', async () => {
    mockVisionResponse({
      common_name_es: 'desconocido',
      scientific_name: '', // vacío
      confidence: 0.4,
      alternatives: [],
    });

    const blob = new Blob(['fake'], { type: 'image/jpeg' });
    const result = await recognizeSpeciesGrounded(blob);

    expect(result._grounded.status).toBe('no-binomial');
    expect(result._grounded.reason).toMatch(/ambiguo/i);
    expect(result._grounded.validation).toBeNull();
    expect(sidecarClient.callTool).not.toHaveBeenCalled();
  });

  // QUICK-17 (Tier S iter 2, 2026-05-27): pre-validate species_id ASCII +
  // snake_case ANTES de pegar al sidecar. Bench V-03 detectó `Fragaria ×
  // ananassa` (hybrid notation) que produce HTTP 400 después de un network
  // roundtrip desperdiciado.
  it('status:no-binomial cuando scientific_name tiene hybrid notation (Fragaria × ananassa)', async () => {
    mockVisionResponse({
      common_name_es: 'fresa',
      scientific_name: 'Fragaria × ananassa', // × no es ASCII letra
      confidence: 0.8,
      alternatives: [],
    });

    const blob = new Blob(['fake'], { type: 'image/jpeg' });
    const result = await recognizeSpeciesGrounded(blob);

    expect(result._grounded.status).toBe('no-binomial');
    expect(result._grounded.reason).toMatch(/ambiguo/i);
    expect(result._grounded.validation).toBeNull();
    // No debe haber llamado al sidecar — la pre-validación en frontend lo
    // evita y ahorra el roundtrip + el 400 del sidecar.
    expect(sidecarClient.callTool).not.toHaveBeenCalled();
  });

  it('status:no-binomial cuando scientific_name tiene caracteres unicode (Solanum tubérosum)', async () => {
    mockVisionResponse({
      common_name_es: 'papa',
      scientific_name: 'Solanum tubérosum', // tilde en é
      confidence: 0.75,
      alternatives: [],
    });

    const blob = new Blob(['fake'], { type: 'image/jpeg' });
    const result = await recognizeSpeciesGrounded(blob);

    expect(result._grounded.status).toBe('no-binomial');
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

    expect(result._grounded.status).toBe('verified');
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

  it('status:sidecar-error si el sidecar tool falla (devuelve null)', async () => {
    mockVisionResponse({
      common_name_es: 'aguacate',
      scientific_name: 'Persea americana',
      confidence: 0.95,
      alternatives: [],
    });
    sidecarClient.callTool.mockResolvedValueOnce(null);

    const blob = new Blob(['fake'], { type: 'image/jpeg' });
    const result = await recognizeSpeciesGrounded(blob);

    expect(result._grounded.status).toBe('sidecar-error');
    expect(result._grounded.reason).toMatch(/temporal/i);
    expect(result._grounded.validation).toBeNull();
    expect(result.scientific_name).toBe('Persea americana');
  });

  // V-12 2026-05-27: telemetría de audit visión.
  describe('telemetryState V-12 — meta thunk a streamOllama', () => {
    it('pasa meta como función (thunk) que resuelve confidence + grounded_status="verified"', async () => {
      mockVisionResponse({
        common_name_es: 'café',
        scientific_name: 'Coffea arabica',
        confidence: 0.88,
        alternatives: [],
      });
      sidecarClient.callTool.mockResolvedValueOnce({
        available: true,
        results: [{ species_id: 'coffea_arabica', valid: true, confidence_adjusted: 0.88 }],
      });

      const blob = new Blob(['fake'], { type: 'image/jpeg' });
      await recognizeSpeciesGrounded(blob);

      // El 4to argumento de streamOllama es options. meta debe ser función.
      const [, , , opts] = ollamaStream.streamOllama.mock.calls[0];
      expect(typeof opts.meta).toBe('function');

      // Resolver el thunk DESPUÉS del flujo completo: debe contener
      // confidence (set por runSpeciesRecognition) y grounded_status='verified'
      // (set por recognizeSpeciesGrounded tras validar).
      const resolved = opts.meta();
      expect(resolved.confidence).toBeCloseTo(0.88);
      expect(resolved.grounded_status).toBe('verified');
    });

    it('thunk resuelve grounded_status="rejected" cuando el catálogo rechaza la especie', async () => {
      mockVisionResponse({
        common_name_es: 'inventada',
        scientific_name: 'Mangosteenia colombiana',
        confidence: 0.7,
        alternatives: [],
      });
      sidecarClient.callTool.mockResolvedValueOnce({
        available: true,
        results: [{ species_id: 'mangosteenia_colombiana', valid: false, confidence_adjusted: 0, reason: 'not_in_catalog' }],
      });

      const blob = new Blob(['fake'], { type: 'image/jpeg' });
      await recognizeSpeciesGrounded(blob);

      const [, , , opts] = ollamaStream.streamOllama.mock.calls[0];
      const resolved = opts.meta();
      expect(resolved.confidence).toBeCloseTo(0.7);
      expect(resolved.grounded_status).toBe('rejected');
    });

    it('thunk resuelve grounded_status=null cuando sidecar disabled (degraded path)', async () => {
      sidecarClient.isSidecarEnabled.mockReturnValue(false);
      mockVisionResponse({
        common_name_es: 'tomate',
        scientific_name: 'Solanum lycopersicum',
        confidence: 0.6,
        alternatives: [],
      });

      const blob = new Blob(['fake'], { type: 'image/jpeg' });
      await recognizeSpeciesGrounded(blob);

      const [, , , opts] = ollamaStream.streamOllama.mock.calls[0];
      const resolved = opts.meta();
      expect(resolved.confidence).toBeCloseTo(0.6);
      expect(resolved.grounded_status).toBeNull();
    });
  });
});
