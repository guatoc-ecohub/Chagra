/**
 * outputGuards.diagnosisSuppress.test.js — #348 (HARDENING, prod 2026-06-03).
 *
 * Contexto (RUNBOOK-NOCTURNO S5): el guard #1280/#348 estaba MERGEADO pero NO
 * actuaba en el path PWA real. Q6 "manchas en el tomate" (sin foto) seguía
 * enumerando patógenos con binomio latino sin pedir la foto. Dos huecos:
 *
 *   1. CONDICIÓN MUY ESTRECHA — el guard solo disparaba con ≥2 patógenos o
 *      fraseo "puede ser X o Y". Una respuesta CONFIADA con UN solo patógeno
 *      ("Es tizón tardío, Phytophthora infestans, aplica…") se le escapaba — y
 *      ese es justamente el caso más dañino (manda al campesino a tratar a
 *      ciegas la enfermedad equivocada con plena seguridad). El binomio latino
 *      en paréntesis también debe contar como diagnóstico específico.
 *
 *   2. APPEND, NO SUPPRESS — anteponía una nota pero DEJABA el binomio latino y
 *      la receta de fungicida legibles debajo. El campesino igual los leía. La
 *      regla del system prompt es PROHIBIDO nombrar un patógeno/binomio sin foto
 *      → hay que SUPRIMIR el cuerpo y reemplazarlo por un diferencial sin latín
 *      + pedido de foto (suppress-and-replace, como con los agroquímicos #351b).
 *
 * Ground-truth: AgentScreen.jsx "REGLA CRÍTICA DIAGNÓSTICO-SIN-EVIDENCIA" (~700)
 * y Chagra-strategy/ops/RUNBOOK-NOCTURNO-2026-06-03.md (S5).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardDiagnosisWithoutPhoto,
  applyOutputGuards,
  resetOutputGuardTelemetry,
  getOutputGuardTelemetry,
} from '../outputGuards.js';

// Binomios/patógenos latinos que NUNCA deben sobrevivir a la supresión. NO es un
// matcher genérico de "Capitalizada + minúsculas" (eso marcaría prosa española
// como "Mientras tanto"); es una lista de los géneros/epítetos concretos usados
// en los fixtures.
const NO_LATIN =
  /Phytophthora|infestans|Alternaria|solani|Fusarium|oxysporum|Septoria|Golovinomyces|Cladosporium|fulvum/i;

beforeEach(() => {
  resetOutputGuardTelemetry();
});

describe('#348 guardDiagnosisWithoutPhoto — suppress-and-replace (síntoma vago sin foto)', () => {
  // ── Hueco 1: UN solo patógeno confiado (no enumera) ──────────────────────
  it('CASO REAL: "manchas en el tomate" + UN patógeno confiado con binomio → suprime y pide foto', () => {
    const llmFail =
      'Las manchas en el tomate son tizón tardío (Phytophthora infestans). Aplica un fungicida ' +
      'preventivo cada 8 días y elimina las hojas afectadas.';
    const out = guardDiagnosisWithoutPhoto(llmFail, {
      userMessage: 'tengo manchas en el tomate',
      hadVision: false,
    });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/diagnostico_sin_foto/);
    // SUPRIME: el binomio latino y el patógeno específico NO sobreviven.
    expect(out.text).not.toMatch(NO_LATIN);
    expect(out.text.toLowerCase()).not.toContain('phytophthora');
    expect(out.text.toLowerCase()).not.toContain('tizon tardio');
    expect(out.text.toLowerCase()).not.toContain('tizón tardío'.normalize('NFC'));
    // PIDE la foto y da un diferencial sencillo.
    expect(out.text).toMatch(/foto|c[aá]mara/i);
    expect(out.text).toMatch(/puede|varias?\s+causas|diferentes|sin verla?/i);
  });

  it('"se me está secando la planta" (sin especie, sin foto) → diferencial sin latín + foto', () => {
    const llmFail =
      'Se está secando por Fusarium oxysporum, un hongo del suelo que tapa los vasos. Aplica ' +
      'Trichoderma al sustrato y reduce el riego.';
    const out = guardDiagnosisWithoutPhoto(llmFail, {
      userMessage: 'se me está secando la planta',
      hadVision: false,
    });
    expect(out.modified).toBe(true);
    expect(out.text.toLowerCase()).not.toContain('fusarium');
    expect(out.text).not.toMatch(NO_LATIN);
    expect(out.text).toMatch(/foto|c[aá]mara/i);
  });

  it('binomio latino SUELTO (sin nombre común en denylist) también dispara la supresión', () => {
    // "Cladosporium fulvum" no está en PATHOGEN_NAME_TERMS, pero es un binomio
    // latino en contexto de síntoma sin foto → es un diagnóstico específico a
    // ciegas igual de dañino.
    const llmFail =
      'Esas manchas son moho de la hoja, causado por Cladosporium fulvum. Mejora la ventilación ' +
      'del invernadero y aplica azufre.';
    const out = guardDiagnosisWithoutPhoto(llmFail, {
      userMessage: 'manchas raras en las hojas',
      hadVision: false,
    });
    expect(out.modified).toBe(true);
    expect(out.text.toLowerCase()).not.toContain('cladosporium');
    expect(out.text).not.toMatch(/Cladosporium\s+fulvum/);
  });

  // ── Hueco 1bis: el caso de la lista (≥2) ahora también SE SUPRIME ─────────
  it('lista de patógenos (≥2) → suprime la lista entera y reemplaza por diferencial + foto', () => {
    const llmFail =
      'Las manchas en el tomate pueden ser tizón tardío (Phytophthora infestans), alternaria o ' +
      'septoria. Para el tizón aplica preventivos; para alternaria mejora la aireación.';
    const out = guardDiagnosisWithoutPhoto(llmFail, {
      userMessage: 'tengo manchas en el tomate',
      hadVision: false,
    });
    expect(out.modified).toBe(true);
    // Ya NO conservamos la lista latina debajo (cambio vs comportamiento previo).
    expect(out.text.toLowerCase()).not.toContain('phytophthora');
    expect(out.text.toLowerCase()).not.toContain('septoria');
    expect(out.text).not.toMatch(NO_LATIN);
    expect(out.text).toMatch(/foto|c[aá]mara/i);
  });

  // ── Controles: NO debe disparar ──────────────────────────────────────────
  it('CONTROL: con especie clara + FOTO adjunta → SÍ puede diagnosticar (no toca)', () => {
    const ok =
      'En tu foto se ve tizón tardío (Phytophthora infestans) en las hojas bajas del tomate. ' +
      'Aplica caldo bordelés preventivo y retira los focos.';
    const out = guardDiagnosisWithoutPhoto(ok, {
      userMessage: 'qué le pasa al tomate, te mando foto',
      hadVision: true,
    });
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });

  it('CONTROL: respuesta que YA pide foto y no nombra patógeno → no-op', () => {
    const ok =
      'Para saber qué tiene tu tomate necesito ver una foto de las manchas. Mientras tanto, riega por ' +
      'la base y evita mojar las hojas.';
    const out = guardDiagnosisWithoutPhoto(ok, {
      userMessage: 'manchas en el tomate',
      hadVision: false,
    });
    expect(out.modified).toBe(false);
  });

  it('CONTROL: manejo cultural genérico SIN patógeno ni binomio → no-op', () => {
    const ok =
      'Para que tu cultivo no se enferme, mejora el drenaje, no mojes las hojas al regar y deja ' +
      'buena distancia entre plantas para que circule el aire.';
    const out = guardDiagnosisWithoutPhoto(ok, {
      userMessage: 'se me está secando la planta',
      hadVision: false,
    });
    expect(out.modified).toBe(false);
  });

  it('CONTROL anti-FP: pregunta de PREVENCIÓN ("cómo evito plagas") + biocontrol latino NO se suprime', () => {
    // "cómo evito plagas" es prevención, no un síntoma a ciegas. La respuesta cita
    // Bacillus thuringiensis (binomio legítimo de biocontrol) → NO debe suprimirse.
    const ok = 'Para el gusano de la papa usa Bacillus thuringiensis y monitoreo del foco.';
    const out = applyOutputGuards(ok, {
      userMessage: 'cómo evito plagas en el maíz',
      hadVision: false,
    });
    expect(out.reasons).not.toContain('diagnostico_sin_foto');
    expect(out.text).toContain('Bacillus thuringiensis');
  });

  it('CONTROL anti-FP: "qué le echo para el gusano" (manejo) + biocontrol → no-op', () => {
    const ok = 'Para el gusano de la papa usa Bacillus thuringiensis y monitoreo del foco.';
    const out = guardDiagnosisWithoutPhoto(ok, {
      userMessage: 'qué le echo a la papa para el gusano',
      hadVision: false,
    });
    expect(out.modified).toBe(false);
  });

  it('CONTROL: pregunta que NO es de síntomas (cosecha) → no-op aunque nombre un binomio', () => {
    const resp =
      'El tomate (Solanum lycopersicum) a 1923 msnm va bien bajo invernadero; cosechas en ~4 meses.';
    const out = guardDiagnosisWithoutPhoto(resp, {
      userMessage: 'cuándo cosecho el tomate',
      hadVision: false,
    });
    expect(out.modified).toBe(false);
    expect(out.text).toBe(resp);
  });

  // ── Idempotencia + telemetría ────────────────────────────────────────────
  it('idempotente: no re-suprime sobre su propio mensaje de reemplazo', () => {
    const llmFail = 'Es tizón tardío (Phytophthora infestans), aplica fungicida.';
    const ctx = { userMessage: 'manchas en el tomate', hadVision: false };
    const first = guardDiagnosisWithoutPhoto(llmFail, ctx);
    expect(first.modified).toBe(true);
    const second = guardDiagnosisWithoutPhoto(first.text, ctx);
    expect(second.modified).toBe(false);
  });

  it('emite telemetría diagnosis_without_photo', () => {
    guardDiagnosisWithoutPhoto('Es alternaria, aplica clorotalonil.', {
      userMessage: 'manchas en el tomate',
      hadVision: false,
    });
    expect(getOutputGuardTelemetry().diagnosis_without_photo).toBe(1);
  });

  it('maneja entrada vacía / no-string', () => {
    expect(
      guardDiagnosisWithoutPhoto('', { userMessage: 'manchas', hadVision: false }).modified,
    ).toBe(false);
    expect(
      guardDiagnosisWithoutPhoto(null, { userMessage: 'manchas', hadVision: false }).text,
    ).toBe('');
  });
});

describe('#348 applyOutputGuards — integración path PWA (síntoma vago sin foto)', () => {
  it('"manchas amarillas en el tomate" sin foto → la salida final NO nombra patógeno y pide foto', () => {
    const llmFail =
      'Las manchas amarillas en el tomate son tizón temprano (Alternaria solani). Aplica mancozeb ' +
      'cada 7 días.';
    const out = applyOutputGuards(llmFail, {
      userMessage: 'tengo manchas amarillas en el tomate',
      hadVision: false,
    });
    expect(out.modified).toBe(true);
    expect(out.reasons).toContain('diagnostico_sin_foto');
    expect(out.text.toLowerCase()).not.toContain('alternaria');
    expect(out.text).not.toMatch(/Alternaria\s+solani/);
    expect(out.text).toMatch(/foto|c[aá]mara/i);
  });

  it('"se está secando" sin foto → diferencial + foto en la salida final', () => {
    const llmFail = 'Se está secando por Phytophthora, un hongo de raíz. Aplica fungicida sistémico.';
    const out = applyOutputGuards(llmFail, {
      userMessage: 'se me está secando la planta, ayuda',
      hadVision: false,
    });
    expect(out.modified).toBe(true);
    expect(out.reasons).toContain('diagnostico_sin_foto');
    expect(out.text.toLowerCase()).not.toContain('phytophthora');
    expect(out.text).toMatch(/foto|c[aá]mara/i);
  });

  it('CONTROL integración: con foto (hadVision=true) NO suprime el diagnóstico', () => {
    const ok =
      'En la foto se ve tizón tardío (Phytophthora infestans) en las hojas. Retira focos y aplica ' +
      'caldo bordelés.';
    const out = applyOutputGuards(ok, {
      userMessage: 'qué le pasa, mando foto',
      hadVision: true,
    });
    // El guard de diagnóstico-sin-foto no debe disparar con foto real.
    expect(out.reasons).not.toContain('diagnostico_sin_foto');
  });
});
