import { describe, it, expect } from 'vitest';
import { resolverCompai, COMPAI_REGISTRO } from '../compaiRegistry.js';
import { cuerpoPortalDe } from '../CompaiTransicion.jsx';
import { ABEJA_PRESENCIA } from '../../../creatures/abejaIdentidad.js';
import { AbejaAngelita } from '../../../creatures/AbejaAngelita.jsx';
import { MaizCompai } from '../../../creatures/MaizCompai.jsx';
import { Zariguya } from '../../../creatures/Zariguya.jsx';
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

  it('maíz y zarigüeya: arte 3D propio registrado (ya NO caen a Angelita)', () => {
    // Fable #5 (2026-07-29): MaizCompaiEscena + ZariguyaCompaiEscena
    // registradas con presencia propia — el mundo refleja la elección.
    for (const tipo of ['maiz', 'zariguya']) {
      const c = resolverCompai(tipo);
      expect(c.avatarType).toBe(tipo);
      expect(c.pendienteFable).toBe(false);
      expect(typeof c.EscenaComponent).toBe('function');
      expect(c.esFallback).toBe(false);
      expect(c.especie).toBe(tipo);
      // Presencia PROPIA (no la de la abeja), cumpliendo el contrato.
      expect(c.presencia).not.toBe(ABEJA_PRESENCIA);
      expect(typeof c.presencia.billboardBase).toBe('number');
      expect(c.presencia.sombra).toBeTruthy();
    }
  });

  it('el portal cruza el cuerpo del guía elegido', () => {
    expect(cuerpoPortalDe(resolverCompai('angelita'))).toBe(AbejaAngelita);
    expect(cuerpoPortalDe(resolverCompai('maiz'))).toBe(MaizCompai);
    expect(cuerpoPortalDe(resolverCompai('zariguya'))).toBe(Zariguya);
    expect(resolverCompai('maiz').PortalComponent).not.toBe(resolverCompai('angelita').PortalComponent);
    expect(resolverCompai('zariguya').PortalComponent).not.toBe(resolverCompai('angelita').PortalComponent);
  });

  it('un tipo pendienteFable cae a Angelita en el portal sin lanzar', () => {
    for (const tipo of ['jaguar', 'oso-baston', 'luciernaga']) {
      expect(() => resolverCompai(tipo)).not.toThrow();
      const c = resolverCompai(tipo);
      expect(c.pendienteFable).toBe(true);
      expect(cuerpoPortalDe(c)).toBe(AbejaAngelita);
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
