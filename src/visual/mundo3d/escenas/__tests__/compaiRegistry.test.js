import { describe, it, expect } from 'vitest';
import { resolverCompai, COMPAI_REGISTRO } from '../compaiRegistry.js';
import { ABEJA_PRESENCIA } from '../../../creatures/abejaIdentidad.js';
import { AVATAR_TYPES } from '../../../../hooks/useAgentAvatarType.js';

describe('compaiRegistry.resolverCompai', () => {
  it('cubre TODOS los tipos de avatar reales (sin huérfanos)', () => {
    for (const tipo of AVATAR_TYPES) {
      expect(COMPAI_REGISTRO[tipo], `falta ${tipo} en el registro`).toBeDefined();
    }
  });

  it('angelita = compañero nativo (sin fallback, no pendiente)', () => {
    const c = resolverCompai('angelita');
    expect(c.avatarType).toBe('angelita');
    expect(c.especie).toBe('abeja-angelita');
    expect(c.pendienteFable).toBe(false);
    expect(c.presencia).toBe(ABEJA_PRESENCIA);
  });

  it('maíz y zarigüeya: pendientes de Fable → fallback a Angelita (sin regresión)', () => {
    for (const tipo of ['maiz', 'zariguya']) {
      const c = resolverCompai(tipo);
      expect(c.avatarType).toBe(tipo);
      expect(c.pendienteFable).toBe(true);
      // Hoy caen a la abeja: sin escena propia y con la presencia de Angelita.
      expect(c.EscenaComponent).toBeNull();
      expect(c.esFallback).toBe(true);
      expect(c.presencia).toBe(ABEJA_PRESENCIA);
    }
  });

  it('tipo desconocido o vacío → default Angelita (nunca lanza)', () => {
    for (const basura of ['colibri', 'oso', '', null, undefined]) {
      const c = resolverCompai(basura);
      expect(c.avatarType).toBe('angelita');
      expect(c.EscenaComponent).toBeNull();
    }
  });

  it('siempre devuelve una entrada usable (presencia + especie presentes)', () => {
    const c = resolverCompai('maiz');
    expect(c.presencia).toBeTruthy();
    expect(typeof c.especie).toBe('string');
    expect(typeof c.presencia.billboardBase).toBe('number');
    expect(c.presencia.percha).toMatchObject({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) });
  });
});
