/**
 * creatureClimaCuerpo.ropa.test.js — VESTUARIO por clima+hora
 * (biblia de personajes). El caso clave: la abeja NO suda de noche.
 */
import { describe, it, expect } from 'vitest';
import {
  ropaDeClima,
  ropaDeClimaBicho,
  ropaPerfilDeBicho,
  ROPA_NEUTRA,
  ROPA_PERFIL_DEFECTO,
} from '../creatureClimaCuerpo.js';

describe('ropaDeClima — gates de clima/hora', () => {
  it('sin clima → vestuario neutro (nada puesto)', () => {
    expect(ropaDeClima(null)).toEqual(ROPA_NEUTRA);
    expect(ropaDeClima(undefined)).toEqual(ROPA_NEUTRA);
  });

  it('DE NOCHE → ruana, y NUNCA sudor (el bug muerto)', () => {
    const r = ropaDeClima('noche');
    expect(r.ruana).toBe(true);
    expect(r.sudor).toBe(false);
    expect(r.sombrero).toBe(false);
  });

  it('de noche calurosa (tempC alta) sigue sin sudar — la noche manda', () => {
    const r = ropaDeClima('noche', { tempC: 30 });
    expect(r.ruana).toBe(true);
    expect(r.sudor).toBe(false);
  });

  it('sol de día (perfil que suda) → sombrero + sudor, sin ruana', () => {
    const r = ropaDeClima('soleado', { perfil: ROPA_PERFIL_DEFECTO });
    expect(r.sombrero).toBe(true);
    expect(r.sudor).toBe(true);
    expect(r.ruana).toBe(false);
  });

  it('hora dorada cuenta como sol de día', () => {
    expect(ropaDeClima('dorada').sudor).toBe(true);
  });

  it('sol pero bicho que NO suda al sol (páramo, sin temp) → sin sombrero', () => {
    const danta = ropaPerfilDeBicho('danta');
    const r = ropaDeClima('soleado', { perfil: danta });
    expect(r.sombrero).toBe(false);
    expect(r.sudor).toBe(false);
  });

  it('temperatura real manda: sol + calor sobre calorC → suda aunque el perfil sea de páramo', () => {
    const danta = ropaPerfilDeBicho('danta'); // calorC 18
    const r = ropaDeClima('soleado', { perfil: danta, tempC: 22 });
    expect(r.sudor).toBe(true);
  });

  it('día soleado pero FRÍO (tempC bajo frioC) → ruana, sin sudor', () => {
    const r = ropaDeClima('soleado', { tempC: 2 }); // frioC default 12
    expect(r.ruana).toBe(true);
    expect(r.sudor).toBe(false);
    expect(r.sombrero).toBe(false);
  });

  it('lluvia → mojado; niebla → niebla; sin sombrero en ninguna', () => {
    const ll = ropaDeClima('lluvia');
    expect(ll.mojado).toBe(true);
    expect(ll.sombrero).toBe(false);
    const nb = ropaDeClima('niebla');
    expect(nb.niebla).toBe(true);
    expect(nb.sombrero).toBe(false);
  });

  it('ruana y sombrero son mutuamente excluyentes', () => {
    for (const clima of ['noche', 'soleado', 'dorada', 'lluvia', 'niebla']) {
      for (const tempC of [undefined, 0, 15, 35]) {
        const r = ropaDeClima(/** @type {any} */ (clima), { tempC });
        expect(r.ruana && r.sombrero).toBe(false);
      }
    }
  });
});

describe('ropaDeClimaBicho — por slug', () => {
  it('danta de noche → ruana', () => {
    expect(ropaDeClimaBicho('danta', 'noche').ruana).toBe(true);
  });
  it('abeja al sol → suda', () => {
    expect(ropaDeClimaBicho('abeja-angelita', 'soleado').sudor).toBe(true);
  });
  it('slug desconocido usa perfil neutro (no explota)', () => {
    expect(ropaDeClimaBicho('bicho-fantasma', 'soleado').sudor).toBe(true);
  });
});
