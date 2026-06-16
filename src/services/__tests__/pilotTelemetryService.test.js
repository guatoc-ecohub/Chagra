/**
 * pilotTelemetryService.test.js — Tests para telemetria anonima del piloto (TAREA 55).
 *
 * Verifica:
 *   1. Eventos NO contienen PII (nombres, emails, GPS, phone, conversation text)
 *   2. onboarding_completado tiene vocacion/finca_tipo
 *   3. modulo_abierto tiene modulo_id
 *   4. pregunta_al_agente tiene intent/source/grounded
 *   5. feedback_dado tiene tipo/modulo
 *   6. sync_resultado tiene exitoso/pendientes
 */

import { describe, it, expect } from 'vitest';
import { containsPII, validateEventFields, __TEST__ } from '../pilotTelemetryService.js';

const { PII_FIELDS } = __TEST__;

// ── PII detection ────────────────────────────────────────────────────────────

describe('pilotTelemetryService — no PII', () => {
  it('rechaza payload con nombres', () => {
    expect(containsPII({ nombre: 'Juan' })).toBe(true);
    expect(containsPII({ name: 'Maria' })).toBe(true);
  });

  it('rechaza payload con email', () => {
    expect(containsPII({ email: 'juan@finca.com' })).toBe(true);
    expect(containsPII({ correo: 'maria@campo.org' })).toBe(true);
  });

  it('rechaza payload con coordenadas GPS', () => {
    expect(containsPII({ lat: 4.5, lng: -74.2 })).toBe(true);
    expect(containsPII({ latitud: '4.5' })).toBe(true);
    expect(containsPII({ longitud: '-74.2' })).toBe(true);
    expect(containsPII({ coords: { lat: 4.5, lng: -74.2 } })).toBe(true);
    expect(containsPII({ gps: '4.5,-74.2' })).toBe(true);
  });

  it('rechaza payload con telefono', () => {
    expect(containsPII({ phone: '3115551234' })).toBe(true);
    expect(containsPII({ telefono: '3115551234' })).toBe(true);
    expect(containsPII({ celular: '3115551234' })).toBe(true);
  });

  it('rechaza payload con texto de conversacion', () => {
    expect(containsPII({ conversation: 'hola...' })).toBe(true);
    expect(containsPII({ conversacion: 'hola...' })).toBe(true);
    expect(containsPII({ transcript: '...' })).toBe(true);
    expect(containsPII({ transcripcion: '...' })).toBe(true);
    expect(containsPII({ texto: 'mi finca...' })).toBe(true);
    expect(containsPII({ text: 'my farm...' })).toBe(true);
    expect(containsPII({ message: '...' })).toBe(true);
    expect(containsPII({ mensaje: '...' })).toBe(true);
    expect(containsPII({ query: '...' })).toBe(true);
    expect(containsPII({ prompt: '...' })).toBe(true);
  });

  it('rechaza payload con IDs personales', () => {
    expect(containsPII({ user_id: '123' })).toBe(true);
    expect(containsPII({ operator_id: 'abc' })).toBe(true);
    expect(containsPII({ finca_id: 'finca-1' })).toBe(true);
  });

  it('acepta payload limpio con campos permitidos', () => {
    expect(containsPII({ vocacion: 'caficultor', finca_tipo: 'familiar' })).toBe(false);
    expect(containsPII({ modulo_id: 'dashboard', ts: Date.now() })).toBe(false);
    expect(containsPII({ intent: 'consulta_plaga', source: 'texto', grounded: true })).toBe(false);
    expect(containsPII({ tipo: 'positivo', modulo: 'agente' })).toBe(false);
    expect(containsPII({ exitoso: 5, pendientes: 2 })).toBe(false);
  });

  it('detecta PII en objetos anidados', () => {
    expect(containsPII({ metadata: { user: { name: 'Juan' } } })).toBe(true);
    expect(containsPII({ data: { location: { lat: 4.5 } } })).toBe(true);
  });

  it('detecta PII en arrays de objetos', () => {
    expect(containsPII({ items: [{ name: 'Juan' }] })).toBe(true);
    expect(containsPII({ results: [{ email: 'x@y.com' }] })).toBe(true);
  });

  it('null, undefined, y primitivos no contienen PII', () => {
    expect(containsPII(null)).toBe(false);
    expect(containsPII(undefined)).toBe(false);
    expect(containsPII(42)).toBe(false);
    expect(containsPII('string')).toBe(false);
    expect(containsPII([])).toBe(false);
    expect(containsPII({})).toBe(false);
  });

  it('PII_FIELDS contiene todos los campos prohibidos esperados', () => {
    const expected = [
      'nombre', 'name', 'email', 'correo', 'phone', 'telefono', 'celular',
      'gps', 'lat', 'lng', 'latitud', 'longitud', 'coords', 'coordenadas',
      'conversation', 'conversacion', 'transcript', 'transcripcion',
      'texto', 'text', 'message', 'mensaje', 'query', 'prompt',
      'user_id', 'operator_id', 'finca_id', 'device_id',
    ];
    for (const field of expected) {
      expect(PII_FIELDS.has(field)).toBe(true);
    }
  });
});

// ── Event field validation ───────────────────────────────────────────────────

describe('pilotTelemetryService — field validation', () => {
  it('onboarding_completado requiere vocacion y finca_tipo', () => {
    const valid = validateEventFields('onboarding_completado', {
      vocacion: 'caficultor',
      finca_tipo: 'familiar',
    });
    expect(valid.valid).toBe(true);
    expect(valid.missing).toEqual([]);
  });

  it('onboarding_completado falla si falta vocacion', () => {
    const result = validateEventFields('onboarding_completado', { finca_tipo: 'familiar' });
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('vocacion');
  });

  it('onboarding_completado falla si falta finca_tipo', () => {
    const result = validateEventFields('onboarding_completado', { vocacion: 'caficultor' });
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('finca_tipo');
  });

  it('modulo_abierto requiere modulo_id', () => {
    const valid = validateEventFields('modulo_abierto', { modulo_id: 'dashboard' });
    expect(valid.valid).toBe(true);

    const invalid = validateEventFields('modulo_abierto', { ts: Date.now() });
    expect(invalid.valid).toBe(false);
    expect(invalid.missing).toContain('modulo_id');
  });

  it('pregunta_al_agente requiere intent, source, grounded', () => {
    const valid = validateEventFields('pregunta_al_agente', {
      intent: 'consulta_plaga',
      source: 'texto',
      grounded: true,
    });
    expect(valid.valid).toBe(true);

    const missingIntent = validateEventFields('pregunta_al_agente', {
      source: 'texto',
      grounded: true,
    });
    expect(missingIntent.valid).toBe(false);
    expect(missingIntent.missing).toContain('intent');

    const missingGrounded = validateEventFields('pregunta_al_agente', {
      intent: 'x',
      source: 'texto',
    });
    expect(missingGrounded.valid).toBe(false);
    expect(missingGrounded.missing).toContain('grounded');
  });

  it('feedback_dado requiere tipo y modulo', () => {
    const valid = validateEventFields('feedback_dado', {
      tipo: 'positivo',
      modulo: 'agente',
    });
    expect(valid.valid).toBe(true);

    const invalid = validateEventFields('feedback_dado', { tipo: 'negativo' });
    expect(invalid.valid).toBe(false);
    expect(invalid.missing).toContain('modulo');
  });

  it('sync_resultado requiere exitoso y pendientes', () => {
    const valid = validateEventFields('sync_resultado', {
      exitoso: 5,
      pendientes: 2,
    });
    expect(valid.valid).toBe(true);

    const invalid = validateEventFields('sync_resultado', { exitoso: 0 });
    expect(invalid.valid).toBe(false);
    expect(invalid.missing).toContain('pendientes');
  });

  it('payload invalido (null/undefined/string) retorna missing', () => {
    const result = validateEventFields('modulo_abierto', null);
    expect(result.valid).toBe(false);

    const result2 = validateEventFields('modulo_abierto', 'no-soy-objeto');
    expect(result2.valid).toBe(false);
  });

  it('tipo desconocido retorna error', () => {
    const result = validateEventFields('tipo_inventado', { x: 1 });
    expect(result.valid).toBe(false);
    expect(result.missing[0]).toContain('desconocido');
  });
});

// ── Combined: PII-free + valid fields ────────────────────────────────────────

describe('pilotTelemetryService — combined checks', () => {
  it('onboarding payload valido NO contiene PII', () => {
    const payload = { vocacion: 'caficultor', finca_tipo: 'familiar' };
    expect(containsPII(payload)).toBe(false);
    expect(validateEventFields('onboarding_completado', payload).valid).toBe(true);
  });

  it('modulo_abierto valido NO contiene PII', () => {
    const payload = { modulo_id: 'mapa' };
    expect(containsPII(payload)).toBe(false);
    expect(validateEventFields('modulo_abierto', payload).valid).toBe(true);
  });

  it('pregunta_al_agente valida NO contiene PII', () => {
    const payload = { intent: 'plaga', source: 'voz', grounded: true };
    expect(containsPII(payload)).toBe(false);
    expect(validateEventFields('pregunta_al_agente', payload).valid).toBe(true);
  });

  it('feedback_dado valido NO contiene PII', () => {
    const payload = { tipo: 'positivo', modulo: 'siembra' };
    expect(containsPII(payload)).toBe(false);
    expect(validateEventFields('feedback_dado', payload).valid).toBe(true);
  });

  it('sync_resultado valido NO contiene PII', () => {
    const payload = { exitoso: 10, pendientes: 0 };
    expect(containsPII(payload)).toBe(false);
    expect(validateEventFields('sync_resultado', payload).valid).toBe(true);
  });

  it('payload con campo extra (no PII) sigue siendo valido', () => {
    const payload = { modulo_id: 'siembra', duracion_ms: 5000, tema: 'oscuro' };
    expect(containsPII(payload)).toBe(false);
    expect(validateEventFields('modulo_abierto', payload).valid).toBe(true);
  });

  it('payload con PII y campos validos es rechazado', () => {
    const payload = {
      intent: 'plaga',
      source: 'texto',
      grounded: false,
      query: 'tengo broca en el cafe', // PII: texto de conversacion
    };
    expect(containsPII(payload)).toBe(true);
    // Aunque los campos requeridos esten, el PII debe bloquear el evento
  });
});
