/**
 * outputGuards.confusionWarning.test.js — guard SAFETY-CRITICAL que SUPERFICIE
 * (surface) la ConfusionWarning del grounding en la RESPUESTA del agente.
 *
 * Contexto (BORDE-001, bench borde-alucinación 2026-06-03): el resolver de
 * entidades del sidecar (#172) YA adjunta a cada entidad un `confusion_warning`
 * (array de objetos con `severity`, `meaning_correct`, `meaning_wrong`,
 * `explanation`). Para "yuca brava" la ConfusionWarning es `severity: critical`
 * y avisa del CIANURO (yuca amarga tóxica que requiere detoxificación). PERO el
 * dato vivía solo en el GROUNDING (system prompt): granite NO lo repetía de
 * forma confiable → la respuesta a "la doy rallada en jugo crudo" salía SIN la
 * advertencia tóxica (must 0/3: faltaban cianuro / no cruda / procesar).
 *
 * Este guard NO depende de que el LLM repita el riesgo: cuando el grounding
 * trae una ConfusionWarning CRITICAL (priorizando las TÓXICAS) y la respuesta no
 * la cubre, INYECTA la advertencia de forma determinística y prominente
 * (prefijo "⚠️ Ojo de seguridad: …").
 *
 * Ground-truth del shape (verificado vivo contra /resolve-entities, 2026-06-03):
 *   confusion_warning: [{ id:'cw:yuca_brava', severity:'critical',
 *     meaning_correct:'Yuca amarga (alta cianuro) requiere detoxificación …',
 *     meaning_wrong:['Yuca dulce …'], explanation:'Yuca brava es TÓXICA …' }]
 *
 * Cubre:
 *   (a) BORDE-001 yuca brava → respuesta SIN riesgo + CW critical → inyecta
 *       cianuro + no consumir cruda + procesar/detoxificar.
 *   (b) otra tóxica (escopolamina/borrachero) → inyecta el riesgo.
 *   (c) anti-FP: la respuesta YA advierte (cianuro/detoxificar) → no duplica.
 *   (d) anti-FP: entidad SIN confusion_warning → no dispara.
 *   (e) anti-FP: CW de severity NO-critical → no inyecta el prefijo de seguridad.
 *   (f) idempotencia + integración en applyOutputGuards (no lo pisan los otros
 *       guards de safety; el prefijo queda prominente).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardSurfaceConfusionWarning,
  applyOutputGuards,
  getOutputGuardTelemetry,
  resetOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => {
  resetOutputGuardTelemetry();
});

// Shape REAL devuelto por el sidecar /resolve-entities para "yuca brava"
// (verificado vivo 2026-06-03). El campo crítico es confusion_warning[].
const YUCA_BRAVA_ENTITY = {
  mentioned: 'yuca brava',
  kind: 'species',
  canonical_id: 'manihot_esculenta',
  nombre_comun: 'Yuca brava amazónica',
  nombre_cientifico: 'Manihot esculenta Crantz',
  confidence: 1,
  categoria: 'tuberculos_raices',
  confusion_warning: [
    {
      id: 'cw:yuca_brava',
      severity: 'critical',
      label_ambiguo: 'yuca_brava',
      meaning_correct: 'Yuca amarga (alta cianuro) requiere detoxificación rayado+lavado',
      meaning_wrong: ['Yuca dulce de consumo directo', 'Yuca industrial'],
      explanation:
        'Yuca brava es TÓXICA si no se detoxifica. Confundirla con yuca dulce puede causar envenenamiento por cianuro.',
    },
  ],
};

// Otra confusión TÓXICA: borrachero/escopolamina (alcaloides tropánicos).
const BORRACHERO_ENTITY = {
  mentioned: 'borrachero',
  kind: 'species',
  canonical_id: 'brugmansia_arborea',
  nombre_comun: 'Borrachero',
  nombre_cientifico: 'Brugmansia arborea',
  confidence: 1,
  confusion_warning: [
    {
      id: 'cw:borrachero',
      severity: 'critical',
      label_ambiguo: 'borrachero',
      meaning_correct: 'Brugmansia tóxica por escopolamina, nunca para consumo',
      meaning_wrong: ['Planta ornamental inofensiva'],
      explanation: 'El borrachero contiene escopolamina; ingerirlo puede ser mortal.',
    },
  ],
};

describe('guardSurfaceConfusionWarning', () => {
  it('(a) BORDE-001: yuca brava cruda → inyecta cianuro + no cruda + procesar', () => {
    // Respuesta tipo "granite sin la advertencia": habla de la yuca pero NO
    // menciona el riesgo tóxico ni la detoxificación.
    const llm =
      'La yuca brava es una raíz amazónica muy nutritiva. Rállala y prepárala como prefieras; ' +
      'a los niños les gusta el jugo fresco. Es buena fuente de carbohidratos.';
    const r = guardSurfaceConfusionWarning(llm, [YUCA_BRAVA_ENTITY]);
    expect(r.modified).toBe(true);
    // El cuerpo original del LLM sigue presente (ADITIVO, no reemplaza).
    expect(r.text).toContain('raíz amazónica');
    const low = r.text.toLowerCase();
    // Los 3 must de BORDE-001:
    expect(low).toContain('cianuro'); // riesgo
    expect(low).toMatch(/no.{0,20}(consum|com|dar|tom)\w*.{0,20}crud|nunca.{0,20}crud|crud\w*.{0,20}no\b/); // no consumir cruda
    expect(low).toMatch(/detoxif|procesa|rayad|lavad|hervi|coc\w/); // procesar/detoxificar
    // Prefijo prominente de seguridad arriba.
    expect(r.text.startsWith('⚠️')).toBe(true);
    expect(r.reason).toMatch(/confusion_warning_critical/);
    expect(r.reason).toMatch(/cw:yuca_brava/);
  });

  it('(b) otra tóxica (borrachero/escopolamina) → inyecta el riesgo', () => {
    const llm = 'El borrachero es un arbusto de flores grandes y vistosas, común en climas frescos.';
    const r = guardSurfaceConfusionWarning(llm, [BORRACHERO_ENTITY]);
    expect(r.modified).toBe(true);
    const low = r.text.toLowerCase();
    expect(low).toContain('escopolamina');
    expect(low).toMatch(/toxic|tóxic|mortal|no.{0,15}consum|nunca/);
    expect(r.text.startsWith('⚠️')).toBe(true);
    expect(r.reason).toMatch(/cw:borrachero/);
  });

  it('(c) anti-FP: la respuesta YA advierte del cianuro/detoxificar → no duplica', () => {
    const llm =
      'Ojo: la yuca brava es TÓXICA por su alto contenido de cianuro. No se debe consumir cruda; ' +
      'hay que detoxificarla rallándola, lavándola y cocinándola bien antes de comerla.';
    const r = guardSurfaceConfusionWarning(llm, [YUCA_BRAVA_ENTITY]);
    expect(r.modified).toBe(false);
    expect(r.text).toBe(llm);
  });

  it('(d) anti-FP: entidad SIN confusion_warning → no dispara', () => {
    const sinCW = {
      mentioned: 'yuca',
      kind: 'species',
      canonical_id: 'manihot_glaziovii',
      nombre_comun: 'Yuca de árbol',
      confidence: 0.95,
    };
    const llm = 'La yuca de árbol crece en clima cálido y sirve como cerca viva.';
    const r = guardSurfaceConfusionWarning(llm, [sinCW]);
    expect(r.modified).toBe(false);
    expect(r.text).toBe(llm);
  });

  it('(e) anti-FP: confusion_warning de severity NO-critical → no inyecta prefijo de seguridad', () => {
    const lulo = {
      mentioned: 'naranjilla',
      kind: 'species',
      canonical_id: 'solanum_quitoense',
      nombre_comun: 'Lulo',
      confidence: 1,
      confusion_warning: [
        {
          id: 'cw:naranjilla',
          severity: 'info',
          label_ambiguo: 'naranjilla',
          meaning_correct: 'Naranjilla = lulo (Solanum quitoense), misma especie',
          meaning_wrong: ['Otra especie distinta'],
          explanation: 'Naranjilla y lulo son nombres de la misma especie.',
        },
      ],
    };
    const llm = 'El lulo se da bien en clima medio y necesita sombra parcial.';
    const r = guardSurfaceConfusionWarning(llm, [lulo]);
    // severity no-critical NO dispara el inyector de seguridad (es opcional/suave).
    expect(r.modified).toBe(false);
    expect(r.text.startsWith('⚠️ Ojo de seguridad')).toBe(false);
  });

  it('(f) idempotencia: corre dos veces, no duplica el prefijo', () => {
    const llm = 'La yuca brava es nutritiva, dásela rallada en jugo a los chinos.';
    const once = guardSurfaceConfusionWarning(llm, [YUCA_BRAVA_ENTITY]);
    expect(once.modified).toBe(true);
    const twice = guardSurfaceConfusionWarning(once.text, [YUCA_BRAVA_ENTITY]);
    expect(twice.modified).toBe(false);
    expect(twice.text).toBe(once.text);
  });

  it('(g) entidades nulas/vacías → no-op graceful', () => {
    expect(guardSurfaceConfusionWarning('hola', null).modified).toBe(false);
    expect(guardSurfaceConfusionWarning('hola', []).modified).toBe(false);
    expect(guardSurfaceConfusionWarning('', [YUCA_BRAVA_ENTITY]).modified).toBe(false);
  });

  it('telemetría: registra el gatillo del guard', () => {
    guardSurfaceConfusionWarning('La yuca brava es rica en jugo crudo.', [YUCA_BRAVA_ENTITY]);
    const t = getOutputGuardTelemetry();
    expect(t.confusionWarningSurface).toBeGreaterThanOrEqual(1);
  });
});

describe('applyOutputGuards — integración ConfusionWarning (BORDE-001)', () => {
  it('superficie la advertencia tóxica end-to-end con el shape real del sidecar', () => {
    const llm =
      'La yuca brava es una raíz amazónica muy nutritiva. La puedes rallar y dar en jugo a los niños.';
    const out = applyOutputGuards(llm, {
      resolvedEntities: [YUCA_BRAVA_ENTITY],
      profileName: null,
      userMessage: 'cogí yuca brava en el monte, la rallo y la doy en jugo crudo a los chinos',
    });
    expect(out.modified).toBe(true);
    const low = out.text.toLowerCase();
    expect(low).toContain('cianuro');
    expect(low).toMatch(/crud/);
    expect(low).toMatch(/detoxif|procesa|rayad|lavad|hervi|coc\w/);
    // El prefijo de seguridad lidera la respuesta (lo primero que oye el campesino).
    expect(out.text.trimStart().startsWith('⚠️')).toBe(true);
    expect(out.reasons.some((r) => /confusion_warning_critical/.test(r))).toBe(true);
  });

  it('no inyecta cuando no hay ConfusionWarning en el grounding', () => {
    const llm = 'El maíz se siembra en surcos a 80 cm; abónalo con compost bien curado.';
    const out = applyOutputGuards(llm, {
      resolvedEntities: [
        { mentioned: 'maiz', kind: 'species', canonical_id: 'zea_mays', nombre_comun: 'Maíz', confidence: 1 },
      ],
      userMessage: '¿cómo siembro maíz?',
    });
    // El cuerpo de maíz no debe ganar un prefijo de seguridad tóxica.
    expect(out.text.trimStart().startsWith('⚠️ Ojo de seguridad')).toBe(false);
  });
});
