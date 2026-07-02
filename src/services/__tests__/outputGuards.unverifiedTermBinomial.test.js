/**
 * outputGuards.unverifiedTermBinomial.test.js — fix #95.
 *
 * Verifica que guardUnverifiedTermBinomial intercepte binomios latinos
 * inventados para términos regionales desconocidos (pacharaca, yumbolo,
 * coincyes) y que NO toque respuestas con grounding legítimo (gulupa, café).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardUnverifiedTermBinomial,
  applyOutputGuards,
  resetOutputGuardTelemetry,
  getOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => resetOutputGuardTelemetry());

// ── Casos de alucinación que DEBEN interceptarse ────────────────────────────

describe('guardUnverifiedTermBinomial — términos regionales desconocidos', () => {
  it('intercepta binomio inventado para "coincyes" (caso original bug #95)', () => {
    const userMsg = 'me ofrecen semilla de coincyes';
    const llmResp =
      'La cointzia (Momordica charantia) es una planta trepadora de la familia Cucurbitaceae. ' +
      'Se puede cultivar bien en climas cálidos y produce frutos amargos con propiedades medicinales.';
    const out = guardUnverifiedTermBinomial(llmResp, {
      userMessage: userMsg,
      resolvedMentions: new Set(), // sin grounding
    });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/binomio_no_verificado/);
    // El guard suprime el contenido hallucinated original ("planta trepadora de la familia
    // Cucurbitaceae", "frutos amargos"). Puede mencionar el binomio en su aclaración.
    expect(out.text).not.toMatch(/planta trepadora de la familia Cucurbitaceae|frutos amargos/i);
    expect(out.text).toMatch(/no puedo confirmar/i);
    expect(out.text).toMatch(/foto/i);
    expect(getOutputGuardTelemetry().unverified_term_binomial).toBe(1);
  });

  it('intercepta binomio inventado para "pacharaca"', () => {
    const userMsg = 'tengo plantas de pacharaca en mi finca';
    const llmResp =
      'La pacharaca (Solanum sessiliflorum) es un frutal amazónico muy apreciado. ' +
      'Se adapta bien a climas cálidos entre los 200 y 1200 msnm.';
    const out = guardUnverifiedTermBinomial(llmResp, {
      userMessage: userMsg,
      resolvedMentions: new Set(),
    });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/binomio_no_verificado/);
    // El guard puede mencionar el binomio en su respuesta de aclaración ("no lo voy a
    // tratar como X sin evidencia"), pero NO debe reproducir el contenido hallucinated
    // original ("es un frutal amazónico muy apreciado", "200 y 1200 msnm").
    expect(out.text).not.toMatch(/frutal amazónico muy apreciado|200 y 1200 msnm/i);
    expect(out.text).toMatch(/no puedo confirmar/i);
  });

  it('intercepta binomio inventado para "yumbolo"', () => {
    const userMsg = 'me dijeron que la yumbolo es buena para el ganado';
    const llmResp =
      'La yumbolo (Tithonia diversifolia) es una planta forrajera de alto valor nutritivo. ' +
      'Se usa ampliamente en sistemas silvopastoriles en Colombia.';
    const out = guardUnverifiedTermBinomial(llmResp, {
      userMessage: userMsg,
      resolvedMentions: new Set(),
    });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/binomio_no_verificado/);
    // El guard suprime el contenido hallucinated pero puede mencionar el binomio
    // en la frase de aclaración ("no lo voy a tratar como X sin evidencia").
    expect(out.text).not.toMatch(/alto valor nutritivo|silvopastoriles en Colombia/i);
    expect(out.text).toMatch(/no puedo confirmar/i);
  });

  it('no actúa si la respuesta ya pide identificar la planta (ya es honesta)', () => {
    const userMsg = 'me ofrecen semilla de coincyes';
    const honest =
      'No puedo confirmar qué es "coincyes" porque ese término no está en el catálogo Chagra. ' +
      '¿Podrías describirlo o enviarme una foto de la semilla?';
    const out = guardUnverifiedTermBinomial(honest, {
      userMessage: userMsg,
      resolvedMentions: new Set(),
    });
    expect(out.modified).toBe(false);
  });

  it('no actúa si la respuesta ya tiene marcador cuéntame/foto', () => {
    const userMsg = 'tengo plantas de pacharaca';
    const honest = 'No reconozco el término "pacharaca". ¿Podrías describirlo o enviarme una foto?';
    const out = guardUnverifiedTermBinomial(honest, {
      userMessage: userMsg,
      resolvedMentions: new Set(),
    });
    expect(out.modified).toBe(false);
  });
});

// ── Casos legítimos que NO deben interceptarse ──────────────────────────────

describe('guardUnverifiedTermBinomial — grounding legítimo no debe tocarse', () => {
  it('no toca respuesta sobre gulupa con grounding de alta confianza', () => {
    const userMsg = 'tengo gulupa en mi finca, qué distancia uso para sembrar';
    const llmResp =
      'La gulupa (Passiflora edulis f. edulis) se siembra típicamente a 3×3 metros en clima frío andino. ' +
      'Requiere entre 1800 y 2300 msnm para fructificar bien.';
    // El resolver devolvió "gulupa" con confidence 1.0 → está en resolvedMentions
    const out = guardUnverifiedTermBinomial(llmResp, {
      userMessage: userMsg,
      resolvedMentions: new Set(['gulupa']),
    });
    expect(out.modified).toBe(false);
  });

  it('no toca respuesta sobre café con grounding de alta confianza', () => {
    const userMsg = 'mis matas de cafe estan amarillas';
    const llmResp =
      'El café (Coffea arabica) puede amarillar por deficiencia de nitrógeno o hierro quelado. ' +
      'Te recomiendo análisis de suelo.';
    const out = guardUnverifiedTermBinomial(llmResp, {
      userMessage: userMsg,
      resolvedMentions: new Set(['cafe']),
    });
    expect(out.modified).toBe(false);
  });

  it('no actúa si la respuesta no contiene binomio latino', () => {
    const userMsg = 'me ofrecen semilla de coincyes';
    const noLatin =
      'No reconozco ese nombre. Cuéntame más sobre la planta: hoja, fruto, cómo crece.';
    const out = guardUnverifiedTermBinomial(noLatin, {
      userMessage: userMsg,
      resolvedMentions: new Set(),
    });
    expect(out.modified).toBe(false);
  });

  it('no actúa si userMessage es null', () => {
    const llmResp = 'La pacharaca (Solanum sp.) es nativa de Amazonia.';
    const out = guardUnverifiedTermBinomial(llmResp, {
      userMessage: null,
      resolvedMentions: new Set(),
    });
    expect(out.modified).toBe(false);
  });
});

// ── Pipeline completo vía applyOutputGuards ──────────────────────────────────

describe('applyOutputGuards — pipeline con guardUnverifiedTermBinomial', () => {
  it('intercepta "coincyes → Momordica" en el pipeline completo', () => {
    const userMsg = 'me ofrecen semilla de coincyes';
    const llmResp =
      'La cointzia (Momordica charantia) es una planta de la familia Cucurbitaceae. ' +
      'Se puede cultivar en hileras con distancia de 2 metros.';
    const out = applyOutputGuards(llmResp, {
      userMessage: userMsg,
      resolvedEntities: [], // sin entidades de alta confianza
    });
    expect(out.modified).toBe(true);
    // El guard suprime el contenido hallucinated. Puede mencionar el binomio
    // en su aclaración pero no el texto hallucinated original.
    expect(out.text).not.toMatch(/Cucurbitaceae|cultivar en hileras/i);
    expect(out.text).toMatch(/no puedo confirmar/i);
  });

  it('pipeline: gulupa con entidad de alta confianza pasa sin tocar', () => {
    const userMsg = 'tengo gulupa en mi finca';
    const llmResp =
      'La gulupa (Passiflora edulis f. edulis) requiere clima frío. ' +
      'Siembra a 3×3 metros con buen drenaje.';
    const out = applyOutputGuards(llmResp, {
      userMessage: userMsg,
      resolvedEntities: [
        {
          mentioned: 'gulupa',
          kind: 'species',
          canonical_id: 'passiflora_edulis_morada',
          nombre_comun: 'Gulupa',
          nombre_cientifico: 'Passiflora edulis f. edulis Sims',
          confidence: 1,
        },
      ],
    });
    // El guard no debe modificar esto porque gulupa tiene grounding
    expect(out.text).not.toMatch(/no puedo confirmar/i);
    // No debe bloquear respuesta legítima
    expect(out.text).toMatch(/Passiflora|gulupa/i);
  });
});
