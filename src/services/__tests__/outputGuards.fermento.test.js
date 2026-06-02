/**
 * outputGuards.fermento.test.js — DR-FOOD-3, guard de salida de fermentos
 * (capa 2 de defensa-en-profundidad del PWA). SAFETY-CRITICAL · FAIL-SAFE.
 *
 * Ground-truth: Chagra-strategy/deepresearch/DR-FOOD-3-CONSOLIDADO-2026-06-02.md
 * §3.3 (veto de claims de salud — catálogo canónico de frase segura).
 *
 * Cubre:
 *   (a) veto-total / refusal lo hace el sidecar; ACÁ el guard de salida redirige
 *       claims de salud sobre fermentos a la frase segura del catálogo.
 *   (b) claim de salud sobre fermento → redirigido (alimento ≠ medicamento).
 *   (c) query/respuesta NO-fermento NO se ve afectada (anti-falso-positivo).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardFermentoHealthClaim,
  applyOutputGuards,
  getOutputGuardTelemetry,
  resetOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => {
  resetOutputGuardTelemetry();
});

const SAFE_PHRASE = 'un fermento es un alimento, no un medicamento';

describe('guardFermentoHealthClaim', () => {
  it('(b) "la kombucha cura la gastritis" → redirige a la frase segura', () => {
    const llm =
      'Sí, la kombucha cura la gastritis y limpia el hígado; tómala en ayunas todos los días.';
    const r = guardFermentoHealthClaim(llm, { userMessage: '¿la kombucha cura la gastritis?' });
    expect(r.modified).toBe(true);
    expect(r.text.toLowerCase()).toContain(SAFE_PHRASE);
    expect(r.text.toLowerCase()).toContain('puesto de salud');
    expect(r.reason).toMatch(/claim_salud_fermento/);
  });

  it('(b2) "el guarapo cura el cáncer" → redirigido', () => {
    const r = guardFermentoHealthClaim('El guarapo cura el cáncer si lo tomas a diario.', {
      userMessage: 'sirve el guarapo para el cancer',
    });
    expect(r.modified).toBe(true);
    expect(r.text.toLowerCase()).toContain(SAFE_PHRASE);
  });

  it('(b3) "este fermento desintoxica el hígado" → redirigido', () => {
    const r = guardFermentoHealthClaim('Este fermento desintoxica el hígado y depura la sangre.', {
      userMessage: 'el masato desintoxica?',
    });
    expect(r.modified).toBe(true);
    expect(r.text.toLowerCase()).toContain(SAFE_PHRASE);
  });

  it('(b4) gate por la PREGUNTA: respuesta sin término de fermento pero pregunta de kombucha', () => {
    // El LLM responde sin nombrar el fermento pero afirma el claim; el gate de
    // intención lo cubre por el userMessage.
    const r = guardFermentoHealthClaim('Sí, cura la gastritis sin problema.', {
      userMessage: '¿la kombucha cura la gastritis?',
    });
    expect(r.modified).toBe(true);
    expect(r.text.toLowerCase()).toContain(SAFE_PHRASE);
  });

  it('(c) ANTI-FALSO-POSITIVO: claim de salud SIN fermento en juego NO dispara', () => {
    // "previene" sobre una práctica agronómica, no un fermento.
    const r = guardFermentoHealthClaim(
      'Rotar el cultivo previene plagas y enfermedades del suelo.',
      { userMessage: 'cómo evito plagas en el maíz' },
    );
    expect(r.modified).toBe(false);
    expect(r.text).toContain('Rotar el cultivo');
  });

  it('(c2) ANTI-FALSO-POSITIVO: fermento mencionado SIN claim de salud NO dispara', () => {
    const r = guardFermentoHealthClaim(
      'El chucrut se hace con repollo y sal al 2%; déjalo fermentar tapado.',
      { userMessage: 'cómo hago chucrut' },
    );
    expect(r.modified).toBe(false);
    expect(r.text).toContain('chucrut');
  });

  it('(c3) ANTI-FALSO-POSITIVO: query de precio NO-fermento intacta', () => {
    const r = guardFermentoHealthClaim('La papa está a 80 mil el bulto en la plaza.', {
      userMessage: '¿a cómo está la papa?',
    });
    expect(r.modified).toBe(false);
  });

  it('idempotente: no re-anexa la frase segura si ya está', () => {
    const ya =
      'La kombucha cura la gastritis.\n\nUna aclaración importante: un fermento es un alimento, no un medicamento. No cura nada.';
    const r = guardFermentoHealthClaim(ya, { userMessage: 'kombucha gastritis' });
    expect(r.modified).toBe(false);
  });

  it('texto vacío / no-string → no-op seguro', () => {
    expect(guardFermentoHealthClaim('', { userMessage: 'kombucha' }).modified).toBe(false);
    expect(guardFermentoHealthClaim(null, { userMessage: 'kombucha' }).modified).toBe(false);
  });

  it('cuenta telemetría al disparar', () => {
    guardFermentoHealthClaim('La chicha combate la anemia.', { userMessage: 'chicha anemia' });
    expect(getOutputGuardTelemetry().fermentoHealthClaim).toBe(1);
  });
});

describe('applyOutputGuards — integración guard de fermentos', () => {
  it('redirige un claim de salud sobre fermento dentro del pipeline completo', () => {
    const res = applyOutputGuards('La kombucha cura la gastritis, tómala en ayunas.', {
      userMessage: '¿la kombucha cura la gastritis?',
    });
    expect(res.modified).toBe(true);
    expect(res.text.toLowerCase()).toContain(SAFE_PHRASE);
    expect(res.reasons.some((r) => /claim_salud_fermento/.test(r))).toBe(true);
  });

  it('ANTI-FALSO-POSITIVO: respuesta agronómica normal pasa sin el bloque de fermentos', () => {
    const res = applyOutputGuards(
      'Para el maíz a 1800 msnm, siembra en abril y rota con frijol; eso previene plagas.',
      { userMessage: 'cuándo siembro maíz', fincaAltitud: 1800 },
    );
    expect(res.text.toLowerCase()).not.toContain(SAFE_PHRASE);
  });
});
