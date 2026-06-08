/**
 * Tests del armado del mensaje de análisis de foto (FEAT-2 #291).
 *
 * Foco unit-puro sobre `buildPhotoAnalysisMessage` — sin llamar al modelo de
 * visión. Verifica que combina ID de especie + diagnóstico, respeta el shape
 * de metadata para el badge de fuente, y degrada con gracia cuando una de las
 * dos (o ambas) salidas de la pipeline vienen null.
 */
import { describe, it, expect } from 'vitest';
import { buildPhotoAnalysisMessage } from '../photoAnalysis';

describe('buildPhotoAnalysisMessage', () => {
  it('combina especie verificada + diagnóstico, marca grounded:true', () => {
    const { content, metadata } = buildPhotoAnalysisMessage({
      species: {
        common_name_es: 'café',
        scientific_name: 'Coffea arabica',
        confidence: 0.92,
        _grounded: { status: 'verified', reason: 'Verificado en catálogo Chagra.' },
      },
      diagnosis: {
        score: 72,
        issues: ['Manchas amarillas en hojas inferiores'],
        treatment_suggestion: 'Aplica caldo bordelés cada 8 días',
      },
    });

    expect(content).toContain('Café');
    expect(content).toContain('Coffea arabica');
    expect(content).toContain('92%');
    expect(content).toContain('72/100');
    expect(content).toContain('Manchas amarillas en hojas inferiores');
    expect(content).toContain('caldo bordelés');
    expect(metadata).toEqual({ tool_used: 'validate_visual_match', grounded: true });
  });

  it('especie rechazada por catálogo → grounded:false', () => {
    const { metadata } = buildPhotoAnalysisMessage({
      species: {
        common_name_es: 'planta rara',
        scientific_name: 'Mangosteenia colombiana',
        confidence: 0.4,
        _grounded: { status: 'rejected', reason: 'Sugerencia no encontrada en catálogo.' },
      },
      diagnosis: { score: 50, issues: [], treatment_suggestion: '' },
    });
    expect(metadata.grounded).toBe(false);
  });

  it('partial-match cuenta como grounded:true', () => {
    const { metadata } = buildPhotoAnalysisMessage({
      species: {
        common_name_es: 'papa',
        scientific_name: 'Solanum tuberosum Pastusa',
        confidence: 0.8,
        _grounded: { status: 'partial-match', reason: 'Base verificada; variedad no validada.' },
      },
      diagnosis: null,
    });
    expect(metadata.grounded).toBe(true);
  });

  it('sin issues en el diagnóstico → mensaje sin hallazgos', () => {
    const { content } = buildPhotoAnalysisMessage({
      species: {
        common_name_es: 'tomate',
        scientific_name: 'Solanum lycopersicum',
        confidence: 0.85,
        _grounded: { status: 'verified' },
      },
      diagnosis: { score: 95, issues: [], treatment_suggestion: '' },
    });
    expect(content).toContain('No detecté problemas evidentes');
  });

  it('solo especie (diagnóstico null) — no crashea, omite bloque follaje útil', () => {
    const { content, metadata } = buildPhotoAnalysisMessage({
      species: {
        common_name_es: 'maíz',
        scientific_name: 'Zea mays',
        confidence: 0.9,
        _grounded: { status: 'verified' },
      },
      diagnosis: null,
    });
    expect(content).toContain('Maíz');
    expect(content).toContain('No pude evaluar el estado del follaje');
    expect(metadata.grounded).toBe(true);
  });

  it('solo diagnóstico (especie null) — no crashea', () => {
    const { content, metadata } = buildPhotoAnalysisMessage({
      species: null,
      diagnosis: { score: 60, issues: ['Hojas marchitas'], treatment_suggestion: 'Riega más seguido' },
    });
    expect(content).toContain('No logré identificar la especie');
    expect(content).toContain('60/100');
    expect(content).toContain('Hojas marchitas');
    expect(metadata.grounded).toBe(false);
  });

  it('pipeline entera caída (ambos null) — mensaje amable, grounded:false', () => {
    const { content, metadata } = buildPhotoAnalysisMessage({ species: null, diagnosis: null });
    expect(content).toContain('No logré identificar la especie');
    expect(content).toContain('Tampoco pude analizar el estado del follaje');
    expect(metadata).toEqual({ tool_used: 'validate_visual_match', grounded: false });
  });

  it('no emite ningún marcador de voseo argentino', () => {
    const { content } = buildPhotoAnalysisMessage({
      species: {
        common_name_es: 'aguacate',
        scientific_name: 'Persea americana',
        confidence: 0.7,
        _grounded: { status: 'verified' },
      },
      diagnosis: { score: 40, issues: ['Antracnosis'], treatment_suggestion: 'Poda las ramas afectadas' },
    });
    // Marcadores voseo prohibidos en output al campesino colombiano.
    expect(content).not.toMatch(/\b(vos|ten[ée]s|quer[ée]s|pod[ée]s|mir[áa]|dale|ac[áa])\b/i);
  });
});
