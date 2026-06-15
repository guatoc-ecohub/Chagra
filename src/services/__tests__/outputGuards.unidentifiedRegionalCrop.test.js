/**
 * outputGuards.unidentifiedRegionalCrop.test.js — BORDE-027.
 *
 * Evita que un nombre local no identificado ("coincyes") se convierta en una
 * especie latina y en una recomendación de siembra sin evidencia.
 */
import { describe, it, expect } from 'vitest';
import {
  guardUnidentifiedRegionalCrop,
  applyOutputGuards,
  getOutputGuardTelemetry,
} from '../outputGuards.js';
import { installOutputGuardTestReset } from '../../test-utils/outputGuardTestUtils.js';

installOutputGuardTestReset();

const USER_BORDE_027 =
  'Hermano, en Leticia (Amazonia, ~100 metros sobre el nivel del mar) me ofrecen semilla de coincyes ' +
  'para exportar; ¿la siembro en la finca y qué distancia uso?';

const BENCH_FAIL =
  'Coincyes, también conocido como Piper aduncum, es una especie de planta que pertenece a la familia ' +
  'Piperaceae. Aunque no es común su cultivo en la región de Leticia, Amazonas, Colombia, debido a las ' +
  'condiciones climáticas y de suelo específicas que requiere, no se puede descartar completamente su ' +
  'posibilidad bajo condiciones óptimas. Para cultivar Coincyes en Leticia, es fundamental considerar las ' +
  'condiciones climáticas, el suelo y las semillas. Para obtener una buena cosecha, se recomienda el cultivo ' +
  'en hileras.';

describe('guardUnidentifiedRegionalCrop — BORDE-027 (coincyes)', () => {
  it('suprime identidad Piper aduncum y recomendación de siembra sin identificar la especie', () => {
    const out = guardUnidentifiedRegionalCrop(BENCH_FAIL, { userMessage: USER_BORDE_027 });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/cultivo_regional_no_identificado/);
    expect(out.text).not.toMatch(/Piperaceae|buena cosecha|se recomienda el cultivo/i);
    expect(out.text).toMatch(/No lo voy a tratar como Piper aduncum/i);
    expect(out.text).toMatch(/no puedo confirmar qué es "coincyes"/i);
    expect(out.text).toMatch(/Foto de la semilla, hoja, fruto y planta completa/i);
    expect(out.text).toMatch(/no comprar semilla/i);
    expect(getOutputGuardTelemetry().unidentified_regional_crop).toBe(1);
  });

  it('pipeline completo: reemplaza la respuesta antes de llegar al usuario', () => {
    const out = applyOutputGuards(BENCH_FAIL, {
      userMessage: USER_BORDE_027,
      resolvedEntities: [],
    });
    expect(out.modified).toBe(true);
    expect(out.reasons).toContain(
      'cultivo_regional_no_identificado: coincyes (identidad_no_grounded, siembra_validada_sin_identificar)',
    );
    expect(out.text).not.toMatch(/Piperaceae|condiciones óptimas|hileras/i);
    expect(out.text).toMatch(/No lo voy a tratar como Piper aduncum/i);
    expect(out.text).toMatch(/no puedo confirmar qué es "coincyes"/i);
  });

  it('no toca una respuesta que ya pide identificar coincyes', () => {
    const good =
      'Primero hay que aclarar qué es coincyes en tu zona. No lo voy a tratar como Piper aduncum sin foto ' +
      'ni muestra; manda hoja, fruto y semilla antes de hablar de siembra.';
    const out = guardUnidentifiedRegionalCrop(good, { userMessage: USER_BORDE_027 });
    expect(out.modified).toBe(false);
  });
});
