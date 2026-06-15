import { describe, it, expect } from 'vitest';
import { newUlid, newId } from '../id.js';

describe('newUlid', () => {
  it('genera un string de 26 caracteres', () => {
    const id = newUlid();
    expect(typeof id).toBe('string');
    expect(id.length).toBe(26);
  });

  it('genera IDs unicos', () => {
    const ids = new Set(Array.from({ length: 10 }, () => newUlid()));
    expect(ids.size).toBe(10);
  });
});

describe('newId', () => {
  it('genera ULID para log--task', () => {
    const id = newId('log--task');
    expect(id.length).toBe(26);
  });

  it('genera ULID para log--ai_inference', () => {
    const id = newId('log--ai_inference');
    expect(id.length).toBe(26);
  });

  it('genera UUID para bundles desconocidos', () => {
    const id = newId('asset--plant');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('genera UUID para log--observation', () => {
    const id = newId('log--observation');
    expect(id).toMatch(/^[0-9a-f]{8}-/);
  });
});
