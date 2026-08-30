import { describe, expect, it } from 'vitest';
import { ELENCO } from '../../../compai/nucleo/elenco.js';
import {
  AVATAR_TYPES_PWA,
  COMPAI_ESPECIES,
  ESTADOS_COMPAI_REGISTRADOS,
  obtenerEspecieCompai,
  resolverEspecieCompai,
} from '../compaiEspecies.js';
import { ESTADOS_DE_PERFIL } from '../angelitaEstados.js';
import { IDLE_PERFILES } from '../../creatures/creatureIdle.js';
import { PERFILES as PERFILES_CLIMA } from '../../creatures/creatureClimaCuerpo.js';

const CAPACIDADES = ['cara', 'visema', 'clima', 'guia', 'entrada', 'marcha'];

describe('COMPAI_ESPECIES', () => {
  it('tiene exactamente las siete entradas enPWA del elenco', () => {
    const roster = Object.entries(ELENCO)
      .filter(([, ficha]) => ficha.enPWA)
      .map(([slug]) => slug);

    expect(AVATAR_TYPES_PWA).toEqual(roster);
    expect(Object.keys(COMPAI_ESPECIES)).toEqual(roster);
    expect(Object.keys(COMPAI_ESPECIES)).toHaveLength(7);
  });

  it('cubre 11 poses y seis capacidades con estrategias explícitas', () => {
    for (const perfil of Object.values(COMPAI_ESPECIES)) {
      expect(Object.keys(perfil.posePorEstado)).toEqual(ESTADOS_DE_PERFIL);
      expect(perfil.posePorEstado.caminando).toBe(perfil.medio === 'aire' ? 'vuela' : 'camina');
      expect(Object.keys(perfil.capacidades)).toEqual(CAPACIDADES);
      for (const capacidad of Object.values(perfil.capacidades)) {
        expect(typeof capacidad.estrategia).toBe('string');
        expect(capacidad.estrategia.length).toBeGreaterThan(0);
      }
      expect(perfil.anclas).toEqual(expect.objectContaining({ cara: expect.any(Object), boca: expect.any(Object), poi: expect.any(Object), escala: expect.any(Number) }));
      expect(perfil.variables).toEqual(expect.objectContaining({ '--agt-cara-x': expect.any(String), '--agt-boca-x': expect.any(String), '--agt-poi-x': expect.any(String) }));
    }
  });

  it('no deja slugs huérfanos en clima o idle', () => {
    expect(ESTADOS_COMPAI_REGISTRADOS).toBe(ESTADOS_DE_PERFIL);
    for (const perfil of Object.values(COMPAI_ESPECIES)) {
      expect(IDLE_PERFILES[perfil.idlePerfil]).toBeTruthy();
      expect(PERFILES_CLIMA[perfil.climaPerfil]).toBeTruthy();
      expect(perfil.idlePerfil).toBe(perfil.creatureSlug);
    }
    expect(COMPAI_ESPECIES.angelita.idlePerfil).toBe('abeja-angelita');
  });

  it('resuelve por avatarType y por creatureSlug, con fallback seguro', () => {
    expect(obtenerEspecieCompai('oso-baston')).toBe(COMPAI_ESPECIES['oso-baston']);
    expect(obtenerEspecieCompai('abeja-angelita')).toBe(COMPAI_ESPECIES.angelita);
    expect(obtenerEspecieCompai('no-existe')).toBeNull();
    expect(resolverEspecieCompai('no-existe')).toBe(COMPAI_ESPECIES.angelita);
  });
});
