import { describe, it, expect, beforeEach } from 'vitest';
import {
  getOrCreateAccountUUID,
  setAccountUUID,
  computeOperatorHash,
  setCurrentOperator,
  getCurrentOperatorHash,
  clearCurrentOperator,
  verifyOperatorIdentity,
  _resetForTests,
} from '../operatorIdentityService.js';

/**
 * Tests de pseudonimización determinista (ADR-027.v Habeas Data).
 * Usa crypto.subtle (PBKDF2 + HMAC-SHA256) disponible en el entorno de test,
 * y localStorage para el account_uuid_master.
 */

const FIXED_UUID = 'chagra-test-account-uuid-1234567890';

beforeEach(() => {
  _resetForTests();
});

describe('account_uuid_master', () => {
  it('getOrCreateAccountUUID genera y persiste el mismo UUID', () => {
    const a = getOrCreateAccountUUID();
    const b = getOrCreateAccountUUID();
    expect(a).toBe(b);
    expect(typeof a).toBe('string');
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it('setAccountUUID acepta un UUID válido y rechaza inválidos', () => {
    expect(() => setAccountUUID(FIXED_UUID)).not.toThrow();
    expect(getOrCreateAccountUUID()).toBe(FIXED_UUID);
    expect(() => setAccountUUID('corto')).toThrow();
    expect(() => setAccountUUID(123)).toThrow();
  });
});

describe('computeOperatorHash', () => {
  beforeEach(() => setAccountUUID(FIXED_UUID));

  it('retorna 64 chars hex', async () => {
    const h = await computeOperatorHash('miguel@guatoc.co');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('es determinista: mismo operador + mismo account_uuid → mismo hash', async () => {
    const h1 = await computeOperatorHash('miguel@guatoc.co');
    const h2 = await computeOperatorHash('miguel@guatoc.co');
    expect(h1).toBe(h2);
  });

  it('operadores distintos → hashes distintos', async () => {
    const h1 = await computeOperatorHash('miguel@guatoc.co');
    const h2 = await computeOperatorHash('lili@guatoc.co');
    expect(h1).not.toBe(h2);
  });

  it('distinto account_uuid_master → distinto hash para el mismo operador', async () => {
    const hA = await computeOperatorHash('miguel@guatoc.co');
    _resetForTests();
    setAccountUUID('otro-account-uuid-distinto-9876543210');
    const hB = await computeOperatorHash('miguel@guatoc.co');
    expect(hA).not.toBe(hB);
  });

  it('rechaza operatorId vacío o no-string', async () => {
    await expect(computeOperatorHash('')).rejects.toThrow();
    await expect(computeOperatorHash(null)).rejects.toThrow();
  });
});

describe('operador actual de sesión', () => {
  beforeEach(() => setAccountUUID(FIXED_UUID));

  it('setCurrentOperator guarda el hash y getCurrentOperatorHash lo lee', async () => {
    const hash = await setCurrentOperator('miguel@guatoc.co');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(getCurrentOperatorHash()).toBe(hash);
  });

  it('clearCurrentOperator borra el hash', async () => {
    await setCurrentOperator('miguel@guatoc.co');
    clearCurrentOperator();
    expect(getCurrentOperatorHash()).toBeNull();
  });
});

describe('verifyOperatorIdentity', () => {
  beforeEach(() => setAccountUUID(FIXED_UUID));

  it('true cuando el hash coincide, false cuando no', async () => {
    const hash = await computeOperatorHash('miguel@guatoc.co');
    expect(await verifyOperatorIdentity('miguel@guatoc.co', hash)).toBe(true);
    expect(await verifyOperatorIdentity('lili@guatoc.co', hash)).toBe(false);
  });
});
