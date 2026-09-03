import { describe, expect, it } from 'vitest';
import { applyOutputGuards, guardMissingYield } from '../outputGuards.js';

const speciesEvidence = (species) => ({
  tool: 'get_species',
  result: { found: true, species },
});

describe('guardMissingYield', () => {
  it('reemplaza una cifra inventada por SlotPendiente cuando falta rendimiento', () => {
    const result = guardMissingYield(
      'La rúcula produce 18 t/ha en cada ciclo.',
      {
        userMessage: '¿Qué rendimiento tiene la rúcula?',
        toolEvidence: speciesEvidence({ nombre_comun: 'Rúcula', rendimiento: null }),
      },
    );

    expect(result.modified).toBe(true);
    expect(result.reason).toBe('rendimiento_sin_dato_verificado');
    expect(result.text).toContain('SlotPendiente');
    expect(result.text).toContain('Fuente: catálogo Chagra');
    expect(result.text).not.toContain('18 t/ha');
  });

  it('deja pasar una cifra que sí viene en la evidencia', () => {
    const response = 'La ficha reporta 12 t/ha para este sistema.';
    const result = guardMissingYield(response, {
      userMessage: '¿Qué rendimiento tiene el cultivo?',
      toolEvidence: speciesEvidence({
        nombre_comun: 'Rúcula',
        rendimiento: { valor: 12, unidad: 't/ha', fuente: 'ensayo identificado' },
      }),
    });

    expect(result).toEqual({ text: response, modified: false, reason: null });
  });

  it('se integra en applyOutputGuards para una consulta de rendimiento', () => {
    const result = applyOutputGuards('Produce 9 kg/m2.', {
      userMessage: '¿Cuál es el rendimiento de la rúcula?',
      toolEvidence: speciesEvidence({ nombre_comun: 'Rúcula' }),
    });

    expect(result.modified).toBe(true);
    expect(result.text).toContain('cifra verificada');
    expect(result.reasons).toContain('rendimiento_sin_dato_verificado');
  });

  it('no dispara sobre una recomendación general para mejorar el rendimiento', () => {
    const response = 'Mejora el rendimiento con monitoreo y riego uniforme.';
    const result = guardMissingYield(response, {
      userMessage: '¿Cómo mejoro el rendimiento de la rúcula?',
      toolEvidence: speciesEvidence({ nombre_comun: 'Rúcula' }),
    });

    expect(result).toEqual({ text: response, modified: false, reason: null });
  });
});
