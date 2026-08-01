import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setActiveTenantId,
  getActiveTenantId,
  clearActiveTenantId,
  hasActiveTenant,
  _resetForTests,
} from '../tenantContext';

describe('tenantContext (ADR-036 MVP multi-finca)', () => {
  beforeEach(() => {
    _resetForTests();
    // jsdom localStorage no emite eventos custom solo; los disparamos manual.
  });

  it('persists tenantId in localStorage and reads it back', () => {
    setActiveTenantId('alice');
    expect(getActiveTenantId()).toBe('alice');
    expect(hasActiveTenant()).toBe(true);
  });

  it('returns null before any login', () => {
    expect(getActiveTenantId()).toBeNull();
    expect(hasActiveTenant()).toBe(false);
  });

  it('clearActiveTenantId removes the entry', () => {
    setActiveTenantId('bob');
    clearActiveTenantId();
    expect(getActiveTenantId()).toBeNull();
  });

  it('rejects empty / non-string tenantId', () => {
    expect(() => setActiveTenantId('')).toThrow();
    expect(() => setActiveTenantId('   ')).toThrow();
    expect(() => setActiveTenantId(null)).toThrow();
    expect(() => setActiveTenantId(/** @type {any} */ (123))).toThrow();
  });

  it('trims whitespace from incoming tenantId', () => {
    setActiveTenantId('  alice  ');
    expect(getActiveTenantId()).toBe('alice');
  });

  it('emits tenantChanged when switching between distinct tenants', () => {
    setActiveTenantId('alice');
    const listener = vi.fn();
    window.addEventListener('tenantChanged', listener);
    setActiveTenantId('bob');
    expect(listener).toHaveBeenCalledTimes(1);
    const evt = listener.mock.calls[0][0];
    expect(evt.detail).toEqual({ previous: 'alice', current: 'bob' });
    window.removeEventListener('tenantChanged', listener);
  });

  it('does NOT emit tenantChanged on first login or on same-tenant re-set', () => {
    const listener = vi.fn();
    window.addEventListener('tenantChanged', listener);
    setActiveTenantId('alice'); // primer login, no hay previo
    setActiveTenantId('alice'); // mismo tenant, no debería emitir
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener('tenantChanged', listener);
  });
});
