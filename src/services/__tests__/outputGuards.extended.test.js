/**
 * outputGuards.extended.test.js
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardDoseWithoutSource,
  guardSyntheticAgrochemical,
  guardFabricatedBeneficialBinomial,
  guardDisguisedGenericAgrochem,
  applyOutputGuards,
  resetOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => {
  resetOutputGuardTelemetry();
});

describe('T105 Dosis inventada', () => {
  it('guardDoseWithoutSource dispara con dosis sin fuente', () => {
    const out = guardDoseWithoutSource('Apply 5L of neem per plant to control the pest.');
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/dosis_sin_fuente/);
    expect(out.text).toMatch(/confirma la dosis/i);
    expect(out.text).toContain('5L');
  });

  it('guardDoseWithoutSource NO dispara si hay cita de fuente', () => {
    const out = guardDoseWithoutSource('Segun la etiqueta del producto, aplica 5L de neem por planta.');
    expect(out.modified).toBe(false);
  });

  it('applyOutputGuards: dosis inventada suavizada en cadena', () => {
    const out = applyOutputGuards('Apply 5L of neem per plant for pest control.', { userMessage: 'How do I control pests?' });
    expect(out.reasons).toContainEqual(expect.stringMatching(/dosis_sin_fuente/));
  });
});

describe('T105 Normativa falsa', () => {
  it('guardSyntheticAgrochemical dispara con ICA + mancozeb', () => {
    const out = guardSyntheticAgrochemical('The ICA has approved mancozeb as a synthetic pesticide for tomatoes.');
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/mancozeb/i);
    expect(out.text).toMatch(/agroecológico/i);
  });

  it('guardSyntheticAgrochemical dispara con ICA + glifosato', () => {
    const out = guardSyntheticAgrochemical('El ICA ha aprobado el glifosato como herbicida seguro para maiz.');
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/glifosato/i);
  });

  it('NO dispara con ICA sin sintetico', () => {
    const out = guardSyntheticAgrochemical('El ICA recomienda el manejo integrado de plagas para tomates.');
    expect(out.modified).toBe(false);
  });
});

describe('T105 Especie inexistente', () => {
  it('guardFabricatedBeneficialBinomial bloquea binomio inventado', () => {
    const text = 'Para controlar las plagas de tus tomates, libera Zargus fructiferus. Es un depredador natural que se alimenta de los pulgones.';
    const out = guardFabricatedBeneficialBinomial(text);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/binomio_benefico_no_confirmado/);
    expect(out.text).toMatch(/Verifica este nombre/i);
  });

  it('guardFabricatedBeneficialBinomial NO dispara sin contexto biologico', () => {
    const out = guardFabricatedBeneficialBinomial('Zargus fructiferus es un insecto que se encuentra en los andes.');
    expect(out.modified).toBe(false);
  });

  it('guardFabricatedBeneficialBinomial respeta binomios del grounding', () => {
    const entities = [{ kind: 'species', nombre_cientifico: 'Trichogramma pretiosum', nombre_comun: 'Trichogramma', companions: [] }];
    const out = guardFabricatedBeneficialBinomial('Trichogramma pretiosum es un agente de control biologico efectivo.', entities);
    expect(out.modified).toBe(false);
  });
});

describe('T105 Biopreparado peligroso', () => {
  it('guardDisguisedGenericAgrochem bloquea plaguicida casero', () => {
    const out = guardDisguisedGenericAgrochem('Prepara un plaguicida casero mezclando lejia con vinagre para eliminar plagas.');
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/veneno_casero/);
  });

  it('guardDisguisedGenericAgrochem bloquea insecticida casero con dosis', () => {
    const out = guardDisguisedGenericAgrochem('Haz un insecticida casero mezclando 100 ml de cloro y 200 ml de vinagre por litro para fumigar.');
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/veneno_casero|dosis_aplicacion/);
  });

  it('NO dispara si desaconseja venenos caseros', () => {
    const out = guardDisguisedGenericAgrochem('No prepares venenos caseros con cloro y vinagre, son peligrosos.');
    expect(out.modified).toBe(false);
  });

  it('applyOutputGuards suprime receta de plaguicida casero', () => {
    const out = applyOutputGuards('Te recomiendo preparar un plaguicida casero mezclando lejia y vinagre.', { userMessage: 'Como elimino plagas?' });
    const suprimido = out.reasons.join(' ').includes('veneno_casero');
    expect(suprimido || out.modified).toBe(true);
  });
});
