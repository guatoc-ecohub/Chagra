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

  it('jaguar, oso del bastón y luciérnaga: escena propia (dejaron de ser la abeja)', () => {
    // Fable F26 (2026-08-13): los tres últimos pendienteFable bajaron a false
    // con EscenaComponent + presencia PROPIOS — elegir el jaguar ya no monta
    // una abeja dentro del mundo 3D.
    for (const tipo of ['jaguar', 'oso-baston', 'luciernaga']) {
      const c = resolverCompai(tipo);
      expect(c.avatarType).toBe(tipo);
      expect(c.pendienteFable, `${tipo} sigue marcado pendienteFable`).toBe(false);
      expect(typeof c.EscenaComponent, `${tipo} sin escena propia`).toBe('function');
      expect(c.esFallback).toBe(false);
      expect(c.especie).toBe(tipo);
      // Presencia PROPIA (no la de la abeja), cumpliendo el contrato.
      expect(c.presencia, `${tipo} sigue con la presencia de la abeja`).not.toBe(ABEJA_PRESENCIA);
      expect(typeof c.presencia.billboardBase).toBe('number');
      expect(c.presencia.percha).toMatchObject({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) });
      expect(c.presencia.sombra).toBeTruthy();
    }
  });

  it('los seis compañeros son DISTINTOS entre sí (ni presencia ni escena repetida)', () => {
    const tipos = ['angelita', 'maiz', 'zariguya', 'jaguar', 'oso-baston', 'luciernaga'];
    const presencias = new Set(tipos.map((t) => resolverCompai(t).presencia));
    expect(presencias.size, 'dos tipos comparten la MISMA presencia (recoloreo)').toBe(tipos.length);
    const escenas = tipos.map((t) => resolverCompai(t).EscenaComponent).filter(Boolean);
    expect(new Set(escenas).size).toBe(escenas.length);
  });

  it('la regla del fallback sigue viva: entrada sin escena caería a Angelita sin lanzar', () => {
    // Ya no queda ningún tipo real con EscenaComponent:null salvo angelita
    // (la nativa) — pero el contrato de resolverCompai lo sigue cubriendo:
    // un tipo desconocido resuelve al default con esFallback:true jamás throw.
    const c = resolverCompai('tipo-que-no-existe');
    expect(c.avatarType).toBe('angelita');
    expect(c.EscenaComponent).toBeNull();
    expect(c.esFallback).toBe(true);
  });

  it('el portal cruza el cuerpo del guía elegido', () => {
    expect(cuerpoPortalDe(resolverCompai('angelita'))).toBe(AbejaAngelita);
    expect(cuerpoPortalDe(resolverCompai('maiz'))).toBe(MaizCompai);
    expect(cuerpoPortalDe(resolverCompai('zariguya'))).toBe(Zariguya);
    expect(resolverCompai('maiz').PortalComponent).not.toBe(resolverCompai('angelita').PortalComponent);
    expect(resolverCompai('zariguya').PortalComponent).not.toBe(resolverCompai('angelita').PortalComponent);
  });

  it('jaguar, oso del bastón y luciérnaga: escena 3D propia, pero el portal 2D aún cae a Angelita', () => {
    // F26 (2026-08-13) solo resolvió la presencia 3D de los tres — el cuerpo
    // 2D del portal (PortalComponent) sigue pendiente, así que cuerpoPortalDe
    // debe seguir cayendo a Angelita sin lanzar (regla del fallback en
    // CompaiTransicion.jsx, independiente de pendienteFable/EscenaComponent).
    for (const tipo of ['jaguar', 'oso-baston', 'luciernaga']) {
      expect(() => resolverCompai(tipo)).not.toThrow();
      const c = resolverCompai(tipo);
      expect(c.pendienteFable).toBe(false);
      expect(typeof c.EscenaComponent).toBe('function');
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
