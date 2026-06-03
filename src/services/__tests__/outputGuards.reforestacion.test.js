/**
 * outputGuards.reforestacion.test.js — guard fail-safe de RESTAURACIÓN.
 * SAFETY ecológica. Ground-truth: consolidado
 * Chagra-strategy/deepresearch/DR-RESTAURACION-INCENDIOS-CONSOLIDADO-2026-06-02.md
 * (§"Flag invasora_combustible" + reglas operativas anti-invasoras).
 *
 * Las especies marcadas `invasora_combustible=true` en el grafo (Leucaena,
 * Ulex/retamo espinoso, Genista/retamo liso, Melinis/pasto gordura, Pinus
 * patula/pino pátula, Eucalyptus globulus) NO se recomiendan para restauración
 * de bosque nativo. Cuando el usuario pregunta por reforestación/restauración y
 * el LLM nombra una de estas, el guard ADVIERTE (no la borra).
 *
 * Cubre:
 *   (a) query reforestación + invasora → advertencia anexada.
 *   (b) query NORMAL (no reforestación) → sin tocar (anti-falso-positivo).
 *   (c) query reforestación + especie NATIVA → sin tocar.
 *   (d) idempotencia + integración en applyOutputGuards.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardReforestacionInvasora,
  applyOutputGuards,
  getOutputGuardTelemetry,
  resetOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => {
  resetOutputGuardTelemetry();
});

const NOTE_MARK = 'no se recomienda para restauración';

describe('guardReforestacionInvasora', () => {
  it('(a) query reforestación + retamo (Ulex) → advierte y NO lo borra', () => {
    const llm =
      'Para reforestar tu predio puedes empezar con retamo espinoso, que crece rápido y cubre el suelo.';
    const r = guardReforestacionInvasora(llm, {
      userMessage: '¿qué siembro para reforestar el bosque nativo?',
    });
    expect(r.modified).toBe(true);
    // No la elimina: el texto original sigue presente.
    expect(r.text).toContain('retamo espinoso');
    // Anexa la advertencia.
    expect(r.text.toLowerCase()).toContain(NOTE_MARK);
    expect(r.text.toLowerCase()).toContain('invasora');
    expect(r.reason).toMatch(/reforestacion_invasora/);
    expect(r.reason).toMatch(/Ulex europaeus/);
  });

  it('(a2) detecta Leucaena por nombre común y sugiere nativas', () => {
    const r = guardReforestacionInvasora(
      'Te recomiendo sembrar leucaena para recuperar el bosque y dar sombra.',
      { userMessage: 'quiero restaurar el ecosistema de mi finca' },
    );
    expect(r.modified).toBe(true);
    expect(r.reason).toMatch(/Leucaena leucocephala/);
    // Sugiere al menos una nativa del consolidado.
    expect(r.text.toLowerCase()).toMatch(/nativ/);
    expect(r.text).toMatch(/Alnus acuminata|Inga|Trichanthera/);
  });

  it('(a3) detecta Pinus patula y Eucalyptus en la misma respuesta', () => {
    const r = guardReforestacionInvasora(
      'Para restaurar el páramo siembra pino pátula y eucalipto, crecen rápido.',
      { userMessage: 'cómo reforesto el páramo' },
    );
    expect(r.modified).toBe(true);
    expect(r.reason).toMatch(/Pinus patula/);
    expect(r.reason).toMatch(/Eucalyptus globulus/);
  });

  it('(b) ANTI-FALSO-POSITIVO: query NO de reforestación → no toca aunque mencione la invasora', () => {
    // Silvopastoreo / sombra de ganado: leucaena es legítima ahí (consolidado D3).
    const r = guardReforestacionInvasora(
      'La leucaena sirve como forraje y sombra para el ganado en silvopastoreo.',
      { userMessage: '¿la leucaena sirve de sombra para las vacas?' },
    );
    expect(r.modified).toBe(false);
    expect(r.text.toLowerCase()).not.toContain(NOTE_MARK);
  });

  it('(b2) sin userMessage → no-op (fail-closed, no contamina siembra agrícola)', () => {
    const r = guardReforestacionInvasora('Puedes sembrar eucalipto si quieres madera rápida.', {});
    expect(r.modified).toBe(false);
  });

  it('(c) query reforestación pero especie NATIVA → no toca', () => {
    const r = guardReforestacionInvasora(
      'Para reforestar usa roble andino (Quercus humboldtii) y aliso, son nativos.',
      { userMessage: 'qué siembro para reforestar' },
    );
    expect(r.modified).toBe(false);
    expect(r.text.toLowerCase()).not.toContain(NOTE_MARK);
  });

  it('(d) idempotente: no re-dispara si la nota ya está', () => {
    const ya =
      'Para reforestar siembra retamo.\n\n⚠️ Aclaración importante de restauración: Ulex europaeus ' +
      'es una especie INVASORA y combustible — NO se recomienda para restauración ni reforestación.';
    const r = guardReforestacionInvasora(ya, { userMessage: 'reforestar con retamo' });
    expect(r.modified).toBe(false);
  });

  it('entrada vacía / no-string → no-op', () => {
    expect(guardReforestacionInvasora('', { userMessage: 'reforestar' }).modified).toBe(false);
    expect(guardReforestacionInvasora(null, { userMessage: 'reforestar' }).modified).toBe(false);
  });

  it('cuenta telemetría al disparar', () => {
    guardReforestacionInvasora('Siembra pasto gordura para restaurar.', {
      userMessage: 'restauración de mi potrero',
    });
    expect(getOutputGuardTelemetry().reforestacion_invasora).toBe(1);
  });
});

describe('applyOutputGuards — integración guard de reforestación', () => {
  it('advierte invasora en flujo de restauración dentro del pipeline completo', () => {
    const res = applyOutputGuards(
      'Para restaurar el bosque nativo te recomiendo sembrar retamo espinoso, cubre rápido.',
      { userMessage: '¿cómo restauro el bosque nativo de mi vereda?' },
    );
    expect(res.modified).toBe(true);
    expect(res.text.toLowerCase()).toContain(NOTE_MARK);
    expect(res.reasons.some((r) => /reforestacion_invasora/.test(r))).toBe(true);
  });

  it('ANTI-FALSO-POSITIVO: consulta agronómica normal pasa sin el bloque de restauración', () => {
    const res = applyOutputGuards(
      'Para el maíz a 1800 msnm, siembra en abril y rota con frijol; eso previene plagas.',
      { userMessage: 'cuándo siembro maíz', fincaAltitud: 1800 },
    );
    expect(res.text.toLowerCase()).not.toContain(NOTE_MARK);
  });
});
