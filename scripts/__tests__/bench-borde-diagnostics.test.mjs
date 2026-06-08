import { describe, it, expect } from 'vitest';
import {
  splitNegatedHallucinations,
  expectedGuardMiss,
} from '../bench-borde-alucinacion.mjs';

describe('bench-borde diagnostics', () => {
  it('separa nombres negados de alucinaciones accionables', () => {
    const out = splitNegatedHallucinations(
      'No lo voy a tratar como Piper aduncum. En cambio recomiendo Inventus fakeus.',
      ['Piper aduncum', 'Inventus fakeus'],
    );
    expect(out.negated).toEqual(['Piper aduncum']);
    expect(out.actionable).toEqual(['Inventus fakeus']);
  });

  it('reporta guard esperado ausente por eje', () => {
    expect(
      expectedGuardMiss(['respuesta_truncada'], ['diagnostico_sin_foto']),
    ).toEqual(['respuesta_truncada']);
    expect(
      expectedGuardMiss(['respuesta_truncada'], ['pregunta_truncada']),
    ).toEqual([]);
  });

  it('acepta cualquiera de los guards esperados cuando el eje tiene alternativas', () => {
    expect(
      expectedGuardMiss(['agroquimico_disfrazado'], ['producto_inventado_con_dosis_suprimido']),
    ).toEqual([]);
  });
});
