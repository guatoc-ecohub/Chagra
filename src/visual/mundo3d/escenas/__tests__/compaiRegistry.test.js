import { describe, it, expect } from 'vitest';
import { resolverCompai, COMPAI_REGISTRO } from '../compaiRegistry.js';
import { cuerpoPortalDe } from '../CompaiTransicion.jsx';
import { ABEJA_PRESENCIA } from '../../../creatures/abejaIdentidad.js';
import { AbejaAngelita } from '../../../creatures/AbejaAngelita.jsx';
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

  it('zarigüeya: arte 3D propio registrado (ya NO cae a Angelita)', () => {
    // Fable #5 (2026-07-29): ZariguyaCompaiEscena registrada con presencia
    // propia — el mundo refleja la elección.
    const c = resolverCompai('zariguya');
    expect(c.avatarType).toBe('zariguya');
    expect(c.pendienteFable).toBe(false);
    expect(typeof c.EscenaComponent).toBe('function');
    expect(c.esFallback).toBe(false);
    expect(c.especie).toBe('zariguya');
    // Presencia PROPIA (no la de la abeja), cumpliendo el contrato.
    expect(c.presencia).not.toBe(ABEJA_PRESENCIA);
    expect(typeof c.presencia.billboardBase).toBe('number');
    expect(c.presencia.sombra).toBeTruthy();
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

  it('dante, oliver y chivito-punk: cuerpo 2.5D en la PWA, PERO todavía pendientes en 3D (caen a Angelita)', () => {
    // Roster-8 (2026-08-14): dante y oliver entraron sin arte 3D propio (es de
    // Fable, hoy en hold del operador). chivito-punk tiene cuerpo 2.5D reusando
    // el rig F24 del valle (ChivitoPunk.jsx). Los tres están pendientes de
    // coreografía 3D propia — mismo estado transitorio que jaguar/oso-baston/
    // luciernaga ANTES de F26.
    for (const tipo of ['dante', 'oliver', 'chivito-punk']) {
      const c = resolverCompai(tipo);
      expect(c.avatarType).toBe(tipo);
      expect(c.pendienteFable, `${tipo} debería seguir pendienteFable`).toBe(true);
      expect(c.EscenaComponent).toBeNull();
      expect(c.esFallback).toBe(true);
      expect(c.especie).toBe(tipo);
      // Cae a la presencia de la abeja (regla del fallback) — no lanza.
      expect(c.presencia).toBe(ABEJA_PRESENCIA);
    }
  });

  it('los cinco compañeros con escena propia son DISTINTOS entre sí (ni presencia ni escena repetida)', () => {
    const tipos = ['angelita', 'zariguya', 'jaguar', 'oso-baston', 'luciernaga'];
    const presencias = new Set(tipos.map((t) => resolverCompai(t).presencia));
    expect(presencias.size, 'dos tipos comparten la MISMA presencia (recoloreo)').toBe(tipos.length);
    const escenas = tipos.map((t) => resolverCompai(t).EscenaComponent).filter(Boolean);
    expect(new Set(escenas).size).toBe(escenas.length);
  });

  it('la regla del fallback sigue viva: entrada sin escena caería a Angelita sin lanzar', () => {
    // Un tipo real (dante/oliver/chivito-punk, pendientes de Fable) o inventado,
    // cae al default con esFallback:true, jamás throw.
    const c = resolverCompai('tipo-que-no-existe');
    expect(c.avatarType).toBe('angelita');
    expect(c.EscenaComponent).toBeNull();
    expect(c.esFallback).toBe(true);
  });

  it('el portal cruza el cuerpo del guía elegido', () => {
    expect(cuerpoPortalDe(resolverCompai('angelita'))).toBe(AbejaAngelita);
    expect(cuerpoPortalDe(resolverCompai('zariguya'))).toBe(Zariguya);
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

  it('maiz y guacamaya se retiraron del roster (2026-08-14): resuelven como tipos desconocidos, caen a Angelita', () => {
    // AVATAR_TYPES ya no incluye 'maiz' ni 'guacamaya' — resolverCompai los
    // trata igual que 'colibri'/'oso' (basura/retirado), nunca lanza.
    for (const retirado of ['maiz', 'guacamaya']) {
      const c = resolverCompai(retirado);
      expect(c.avatarType).toBe('angelita');
      expect(c.EscenaComponent).toBeNull();
      expect(c.esFallback).toBe(true);
    }
  });

  it('tipo desconocido, retirado o vacío → default Angelita (nunca lanza)', () => {
    for (const basura of ['colibri', 'oso', 'maiz', 'guacamaya', '', null, undefined]) {
      const c = resolverCompai(basura);
      expect(c.avatarType).toBe('angelita');
      expect(c.EscenaComponent).toBeNull();
    }
  });

  it('dante y oliver están en el roster (2026-08-14) y se comportan como pendientes de Fable', () => {
    // Ambos entran con pendienteFable:true (sin arte 3D propio) y caen a
    // Angelita por el fallback de CompaiTransicion.jsx.
    for (const tipo of ['dante', 'oliver']) {
      const c = resolverCompai(tipo);
      expect(c.avatarType).toBe(tipo);
      expect(c.pendienteFable).toBe(true);
      expect(c.EscenaComponent).toBeNull();
      expect(c.esFallback).toBe(true);
      expect(c.especie).toBe(tipo);
      // Cae a la presencia de la abeja (regla del fallback) — no lanza.
      expect(c.presencia).toBe(ABEJA_PRESENCIA);
    }
  });

  it('guacamaya se retiró del roster (2026-08-14): resuelve como tipo desconocido, cae a Angelita', () => {
    // AVATAR_TYPES ya no incluye 'guacamaya' — resolverCompai lo trata como
    // basura/retirado, nunca lanza.
    const c = resolverCompai('guacamaya');
    expect(c.avatarType).toBe('angelita');
    expect(c.EscenaComponent).toBeNull();
    expect(c.esFallback).toBe(true);
  });

  it('siempre devuelve una entrada usable (presencia + especie presentes)', () => {
    const c = resolverCompai('zariguya');
    expect(c.presencia).toBeTruthy();
    expect(typeof c.especie).toBe('string');
    expect(typeof c.presencia.billboardBase).toBe('number');
    expect(c.presencia.percha).toMatchObject({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) });
  });
});
