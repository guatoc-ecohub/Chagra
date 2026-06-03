/**
 * outputGuards.variedadViabilidad.test.js — DOS guards del bench borde-alucinación
 * (2026-06-03): anti-VARIEDAD-INVENTADA (BORDE-007) y viabilidad-altitud-CON-RIESGO
 * (BORDE-012).
 *
 * ── GUARD A · BORDE-007 (anti-variedad-inventada) ───────────────────────────
 * Caso bench: "...un primo en Bogotá dice que él tiene 'chontaduro de clima frío'
 * en el patio a 2.600, ¿es la misma mata y la subo allá?" → granite VALIDA una
 * "accesión Pacífico resistente hasta 2.600 msnm" que NO existe (el chontaduro,
 * Bactris gasipaes, es palma TROPICAL de tierra caliente; no hay variedad de
 * páramo). El guard detecta el patrón "<especie tropical> de clima frío/páramo"
 * (o "<especie de frío> de tierra caliente") cuando la respuesta VALIDA esa
 * variedad/accesión inventada y SUPRIME-Y-REEMPLAZA con una neutralización honesta
 * ("no me consta una variedad de X para ese clima; X es de clima Y").
 *
 * Anti-FP: variedades REALES (papa criolla, café variedad Castillo) NO deben
 * dispararse; una respuesta que YA niega la variedad inventada tampoco.
 *
 * ── GUARD B · BORDE-012 (viabilidad-altitud-con-riesgo) ─────────────────────
 * Caso bench: "...en Sibundoy a 2.100 quiero gulupa..., pero un vecino jura que
 * arriba en el alto a 2.700 paga mejor por el frío; ¿en cuál de las dos alturas la
 * siembro y aguanta helada?" → granite presenta el alto (2.700 m) como "opción
 * viable" SIN el caveat de RIESGO de helada en el caso límite. El guard, cuando la
 * respuesta declara viable/se da una especie en una altitud al BORDE de su rango
 * (cerca del techo / con riesgo de helada), INYECTA el caveat de riesgo ("está en
 * el límite; a esa altura hay riesgo de helada que puede afectarla").
 *
 * Anti-FP: altitudes claramente DENTRO del rango óptimo NO reciben caveat; una
 * respuesta que YA advierte el riesgo de helada tampoco se re-toca. Coordina con
 * `guardFalseInviability` (#350): no afirma viabilidad inventada, solo añade el
 * caveat de RIESGO cuando el texto ya la dio por viable al borde.
 *
 * Ground-truth: Chagra-strategy/deepresearch/
 *   TEST_PROMPTS_BORDE_ALUCINACION_2026-06-03.json → BORDE-007, BORDE-012.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardInventedVariety,
  guardAltitudeRiskCaveat,
  applyOutputGuards,
  resetOutputGuardTelemetry,
  getOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => {
  resetOutputGuardTelemetry();
});

// Marcadores de neutralización / caveat (para chequear que lideran la salida).
const VARIETY_NEUTRALIZER = /no\s+me\s+consta|no\s+existe\s+una\s+variedad|no\s+hay\s+una\s+variedad/i;
const HELADA_CAVEAT = /riesgo\s+de\s+helada|en\s+el\s+l[ií]mite/i;

// ── GUARD A · BORDE-007 ──────────────────────────────────────────────────────

describe('guardInventedVariety — BORDE-007 (chontaduro de clima frío)', () => {
  const userBorde007 =
    "Hermano, en el Caquetá me dieron semilla de chontaduro y un primo en Bogotá dice que él tiene " +
    "'chontaduro de clima frío' en el patio a 2.600, ¿es la misma mata y la subo allá?";

  it('CASO BENCH: el agente VALIDA la "accesión resistente hasta 2.600 m" → suprime y neutraliza', () => {
    const llmFail =
      'Existen diferentes accesiones de chontaduro. En el caso del "chontaduro de clima frío" que ' +
      'mencionas, probablemente se refiera a una accesión más tolerante al frío, como la variedad ' +
      'Pacífico, que es resistente hasta 2.600 metros sobre el nivel del mar según el catálogo Chagra.';
    const out = guardInventedVariety(llmFail, { userMessage: userBorde007 });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/variedad_inventada|variedad/);
    // SUPRIME: la validación de la accesión inventada NO sobrevive.
    expect(out.text).not.toMatch(/resistente\s+hasta\s+2\.?600/i);
    expect(out.text.toLowerCase()).not.toContain('más tolerante al frío'.normalize('NFC').toLowerCase());
    // NEUTRALIZA: dice que no consta esa variedad y recuerda el clima real.
    expect(out.text).toMatch(VARIETY_NEUTRALIZER);
    expect(out.text.toLowerCase()).toMatch(/clima\s+c[aá]lido|tierra\s+caliente|tropical/);
  });

  it('VARIANTE: detecta el patrón en el propio userMessage aunque la respuesta lo eco', () => {
    const llm =
      'El chontaduro de clima frío sí se puede subir a 2.600 m, es la misma mata y aguanta bien la altura.';
    const out = guardInventedVariety(llm, { userMessage: userBorde007 });
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(VARIETY_NEUTRALIZER);
  });

  it('VARIANTE: especie de FRÍO presentada como variedad de tierra caliente → neutraliza', () => {
    const user = 'Tengo papa de tierra caliente que da en el Magdalena a 200 metros, ¿la siembro?';
    const llm =
      'Sí, la papa de tierra caliente que mencionas es una variedad adaptada al calor que se da bien ' +
      'a 200 metros; es la misma papa pero tropicalizada.';
    const out = guardInventedVariety(llm, { userMessage: user });
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(VARIETY_NEUTRALIZER);
    expect(out.text.toLowerCase()).toMatch(/clima\s+fr[ií]o|tierra\s+fr[ií]a|altura/);
  });

  it('telemetría: registra el gatillo del guard de variedad inventada', () => {
    const llmFail =
      'Se refiere a una accesión de chontaduro tolerante al frío, resistente hasta 2.600 metros.';
    guardInventedVariety(llmFail, { userMessage: userBorde007 });
    const tel = getOutputGuardTelemetry();
    expect(tel.invented_variety).toBeGreaterThanOrEqual(1);
  });

  // ── CONTROLES anti-falso-positivo ──────────────────────────────────────────

  it('CONTROL: variedad REAL (papa criolla) NO dispara', () => {
    const user = '¿Qué tal la papa criolla para mi finca fría a 2.700 m?';
    const llm =
      'La papa criolla (Solanum phureja) es excelente para clima frío; a 2.700 m se da muy bien y es ' +
      'precoz. Te recomiendo sembrarla.';
    const out = guardInventedVariety(llm, { userMessage: user });
    expect(out.modified).toBe(false);
  });

  it('CONTROL: café variedad Castillo (variedad real) NO dispara', () => {
    const user = '¿Sirve el café variedad Castillo para mi zona templada?';
    const llm =
      'La variedad Castillo es una de las más sembradas en Colombia por su resistencia a la roya; ' +
      'va muy bien en zonas cafeteras templadas.';
    const out = guardInventedVariety(llm, { userMessage: user });
    expect(out.modified).toBe(false);
  });

  it('CONTROL: respuesta que YA niega la variedad inventada NO se re-toca', () => {
    const llmOk =
      'No me consta que exista un "chontaduro de clima frío": el chontaduro (Bactris gasipaes) es una ' +
      'palma tropical de tierra caliente y no hay una variedad de páramo. Subirlo a 2.600 m casi seguro ' +
      'fracasa por el frío.';
    const out = guardInventedVariety(llmOk, { userMessage: userBorde007 });
    expect(out.modified).toBe(false);
  });

  it('CONTROL: consulta normal sin variedad inventada NO dispara', () => {
    const user = '¿Cómo cuido el chontaduro en el Caquetá?';
    const llm =
      'El chontaduro se da muy bien en el Caquetá, en tierra caliente y húmeda. Necesita buen drenaje ' +
      'y riego en verano.';
    const out = guardInventedVariety(llm, { userMessage: user });
    expect(out.modified).toBe(false);
  });
});

// ── GUARD B · BORDE-012 ──────────────────────────────────────────────────────

describe('guardAltitudeRiskCaveat — BORDE-012 (gulupa 2.700 m caso límite)', () => {
  const userBorde012 =
    'Sumerce, en Sibundoy a 2.100 quiero gulupa para exportar, pero un vecino jura que arriba en el ' +
    'alto a 2.700 paga mejor por el frío; ¿en cuál de las dos alturas la siembro y aguanta helada?';

  it('CASO BENCH: el agente da el alto (2.700 m) como viable SIN caveat → inyecta riesgo de helada', () => {
    const llmFail =
      'La gulupa (Passiflora edulis f. edulis) prefiere temperaturas cálidas. Sin embargo, en las zonas ' +
      'altas entre 2700 y 3000 msnm se pueden encontrar microclimas más cálidos y protegidos que ' +
      'permitan su cultivo. Si tu vecino refiere a una zona con microclima cálido y protegido, podría ' +
      'ser una opción viable para cultivar la gulupa en altitudes superiores a 2700 msnm.';
    const out = guardAltitudeRiskCaveat(llmFail, { userMessage: userBorde012 });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/altitud_riesgo|caveat|helada/);
    // El cuerpo del modelo se conserva (es un caveat inyectado, no una supresión)…
    expect(out.text).toContain('microclimas más cálidos');
    // …pero ahora lleva el caveat de RIESGO de helada al borde.
    expect(out.text).toMatch(HELADA_CAVEAT);
  });

  it('VARIANTE: "a 2700 m la gulupa se da bien" sin caveat → inyecta caveat', () => {
    const user = '¿La gulupa se da a 2700 metros?';
    const llm = 'Sí, la gulupa se da bien a 2700 metros, es una opción viable para esa altura.';
    const out = guardAltitudeRiskCaveat(llm, { userMessage: user });
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(HELADA_CAVEAT);
  });

  it('telemetría: registra el gatillo del caveat de altitud al borde', () => {
    const user = '¿La gulupa es viable a 2700 m?';
    const llm = 'Sí, a 2700 msnm la gulupa es una opción viable si la proteges.';
    guardAltitudeRiskCaveat(llm, { userMessage: user });
    const tel = getOutputGuardTelemetry();
    expect(tel.altitude_risk_caveat).toBeGreaterThanOrEqual(1);
  });

  // ── CONTROLES anti-falso-positivo ──────────────────────────────────────────

  it('CONTROL: altitud DENTRO del rango óptimo (gulupa a 2.000 m) NO recibe caveat', () => {
    const user = '¿La gulupa se da a 2000 metros en Sibundoy?';
    const llm = 'Sí, a 2000 msnm la gulupa se da muy bien, es una altura ideal para exportación.';
    const out = guardAltitudeRiskCaveat(llm, { userMessage: user });
    expect(out.modified).toBe(false);
  });

  it('CONTROL: respuesta que YA advierte el riesgo de helada NO se re-toca', () => {
    const llmOk =
      'A 2700 m la gulupa está en el límite de su rango: a esa altura hay riesgo de helada que puede ' +
      'afectarla. Mejor siémbrala más abajo, a 2100 m, donde el clima le sirve.';
    const out = guardAltitudeRiskCaveat(llmOk, { userMessage: userBorde012 });
    expect(out.modified).toBe(false);
  });

  it('CONTROL: respuesta que declara INVIABLE el alto (no la promueve) NO inyecta caveat redundante', () => {
    const user = '¿Siembro gulupa a 2700 metros?';
    const llm = 'No, a 2700 m la gulupa no es viable: es demasiado frío para una especie tropical.';
    const out = guardAltitudeRiskCaveat(llm, { userMessage: user });
    expect(out.modified).toBe(false);
  });

  it('CONTROL: especie sin banda conocida NO dispara', () => {
    const user = '¿El maíz se da a 2700 metros?';
    const llm = 'Sí, hay maíces de altura que se dan a 2700 m sin problema.';
    const out = guardAltitudeRiskCaveat(llm, { userMessage: user });
    expect(out.modified).toBe(false);
  });
});

// ── Integración a través de applyOutputGuards ───────────────────────────────

describe('applyOutputGuards — integra los dos guards del borde', () => {
  it('BORDE-007: la variedad inventada se neutraliza vía applyOutputGuards', () => {
    const user =
      "un primo dice que él tiene 'chontaduro de clima frío' a 2.600, ¿es la misma mata y la subo allá?";
    const llm =
      'Probablemente sea una accesión de chontaduro más tolerante al frío, resistente hasta 2.600 metros.';
    const out = applyOutputGuards(llm, { userMessage: user });
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(VARIETY_NEUTRALIZER);
  });

  it('BORDE-012: el caveat de helada se inyecta vía applyOutputGuards', () => {
    const user = '¿siembro gulupa a 2700 metros y aguanta helada?';
    const llm = 'Sí, la gulupa se da a 2700 msnm, es una opción viable en microclimas cálidos.';
    const out = applyOutputGuards(llm, { userMessage: user });
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(HELADA_CAVEAT);
  });

  it('CONTROL integración: respuesta agronómica correcta pasa intacta', () => {
    const user = '¿Qué tal la papa criolla a 2700 m?';
    const llm = 'La papa criolla se da muy bien a 2700 m en clima frío; te la recomiendo.';
    const out = applyOutputGuards(llm, { userMessage: user });
    // No debe disparar ninguno de los dos guards nuevos.
    expect(out.reasons.join(' ')).not.toMatch(/variedad_inventada|altitud_riesgo/);
  });
});
