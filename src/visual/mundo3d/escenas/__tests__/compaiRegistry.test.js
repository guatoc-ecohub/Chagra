import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { resolverCompai, COMPAI_REGISTRO } from '../compaiRegistry.js';
import { cuerpoPortalDe } from '../CompaiTransicion.jsx';
import AbejaTransicion from '../../../creatures/AbejaTransicion.jsx';
import { ABEJA_PRESENCIA } from '../../../creatures/abejaIdentidad.js';
import { AbejaAngelita } from '../../../creatures/AbejaAngelita.jsx';
import ZariguyaTrazado from '../../../creatures/ZariguyaTrazado.jsx';
import LuciernagaTrazado from '../../../creatures/LuciernagaTrazado.jsx';
import ChivitoTrazado from '../../../creatures/ChivitoTrazado.jsx';
import OsoBaston from '../../../creatures/OsoBaston.jsx';
import { AVATAR_TYPES } from '../../../../hooks/useAgentAvatarType.js';

afterEach(cleanup);

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

  it('guacamaya y chivito-punk: cuerpo 2.5D en la PWA, PERO todavía pendientes en 3D (caen a Angelita)', () => {
    // Roster-7 (2026-08-14): entraron con cuerpo 2.5D reusando el rig F24 del
    // valle (GuacamayaCompai.jsx/ChivitoPunk.jsx), sin coreografía 3D propia
    // aún — mismo estado transitorio que jaguar/oso-baston/luciernaga ANTES de F26.
    for (const tipo of ['guacamaya', 'chivito-punk']) {
      const c = resolverCompai(tipo);
      expect(c.avatarType).toBe(tipo);
      expect(c.pendienteFable, `${tipo} no debería quedar pendiente`).toBe(false);
      expect(typeof c.EscenaComponent).toBe('function');
      expect(c.esFallback).toBe(false);
      expect(c.especie).toBe(tipo);
      expect(c.presencia).not.toBe(ABEJA_PRESENCIA);
    }
  });

  it('los siete compañeros con escena propia son DISTINTOS entre sí', () => {
    const tipos = ['angelita', 'zariguya', 'jaguar', 'oso-baston', 'luciernaga', 'guacamaya', 'chivito-punk'];
    const presencias = new Set(tipos.map((t) => resolverCompai(t).presencia));
    expect(presencias.size, 'dos tipos comparten la MISMA presencia (recoloreo)').toBe(tipos.length);
    const escenas = tipos.map((t) => resolverCompai(t).EscenaComponent).filter(Boolean);
    expect(new Set(escenas).size).toBe(escenas.length);
  });

  it('la regla del fallback sigue viva: entrada sin escena caería a Angelita sin lanzar', () => {
    // Un tipo real (guacamaya/chivito-punk) o inventado, cae al default con
    // esFallback:true, jamás throw.
    const c = resolverCompai('tipo-que-no-existe');
    expect(c.avatarType).toBe('angelita');
    expect(c.EscenaComponent).toBeNull();
    expect(c.esFallback).toBe(true);
  });

  it('cada canónico registra su propio cuerpo de portal', () => {
    for (const tipo of AVATAR_TYPES) {
      const c = resolverCompai(tipo);
      expect(c.PortalComponent, `${tipo} sin PortalComponent`).toBeTruthy();
      expect(cuerpoPortalDe(c)).toBe(c.PortalComponent);
    }
    expect(cuerpoPortalDe(resolverCompai('angelita'))).toBe(AbejaAngelita);
  });

  it('el portal 2D→3D de zarigüeya/luciérnaga/chivito es la TINTA Trazado, NO la piel vieja', () => {
    // Migración 097 (2026-09-04): el agente PWA y el selector del usuario ya
    // visten `*Trazado.jsx`; el portal del Valle 3D se quedó montando la piel
    // rubber-hose vieja y el handoff 2D→3D cambiaba de especie. Este test es
    // el control negativo real: si alguien revierte UN import del registro a
    // `Zariguya.jsx`/`Luciernaga.jsx`/`ChivitoPunk.jsx`, este caso ROJO.
    expect(resolverCompai('zariguya').PortalComponent, 'zariguya volvió a la piel vieja').toBe(ZariguyaTrazado);
    expect(resolverCompai('luciernaga').PortalComponent, 'luciernaga volvió a la piel vieja').toBe(LuciernagaTrazado);
    expect(resolverCompai('chivito-punk').PortalComponent, 'chivito-punk volvió a la piel vieja').toBe(ChivitoTrazado);
    // El OSO DEL BASTÓN queda FUERA de la migración a propósito: su lámina
    // musculosa está aprobada (SKIN CONSERVADA) y no existe OsoTrazado.
    expect(resolverCompai('oso-baston').PortalComponent, 'oso-baston cambió de piel sin decisión de arte').toBe(OsoBaston);
  });

  it('entrada y vuelta conservan el slug del cuerpo elegido', () => {
    for (const tipo of AVATAR_TYPES) {
      const c = resolverCompai(tipo);
      for (const sentido of ['entrar', 'volver']) {
        const { container } = render(createElement(AbejaTransicion, {
          sentido,
          // Los portales comparten el contrato runtime de AbejaTransicion,
          // aunque cada rig declara props JSDoc más estrechas que el default.
          // La prueba valida el handoff real, no la firma estática del SVG.
          // @ts-expect-error Componentes de portal heterogéneos bajo contrato común.
          Cuerpo: c.PortalComponent,
          onFin: () => {},
        }));
        expect(
          container.querySelector(`[data-creature="${c.especie}"]`),
          `${tipo} perdió su cuerpo durante ${sentido}`,
        ).toBeTruthy();
        cleanup();
      }
    }
  });

  it('usa Angelita solo como fallback para una entrada inválida', () => {
    expect(cuerpoPortalDe(null)).toBe(AbejaAngelita);
    expect(cuerpoPortalDe({ avatarType: 'inventado' })).toBe(AbejaAngelita);
  });

  it('maiz se retiró del roster (2026-08-14): resuelve como cualquier tipo desconocido, cae a Angelita', () => {
    // AVATAR_TYPES ya no incluye 'maiz' — resolverCompai lo trata igual que
    // 'colibri'/'oso' (basura/retirado), nunca lanza.
    const c = resolverCompai('maiz');
    expect(c.avatarType).toBe('angelita');
    expect(c.EscenaComponent).toBeNull();
    expect(c.esFallback).toBe(true);
  });

  it('tipo desconocido, retirado o vacío → default Angelita (nunca lanza)', () => {
    for (const basura of ['colibri', 'oso', 'maiz', '', null, undefined]) {
      const c = resolverCompai(basura);
      expect(c.avatarType).toBe('angelita');
      expect(c.EscenaComponent).toBeNull();
    }
  });

  it('siempre devuelve una entrada usable (presencia + especie presentes)', () => {
    const c = resolverCompai('zariguya');
    expect(c.presencia).toBeTruthy();
    expect(typeof c.especie).toBe('string');
    expect(typeof c.presencia.billboardBase).toBe('number');
    expect(c.presencia.percha).toMatchObject({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) });
  });
});
