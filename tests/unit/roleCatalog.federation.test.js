import { describe, it, expect } from 'vitest';
import {
  PERMISOS,
  ROLE_CEILING,
  ROLE_DEFAULTS,
  ROLE_IDS,
} from '../../src/config/roleCatalog.js';

describe('roleCatalog', () => {
  it('exports the expected role ids', () => {
    expect(ROLE_IDS).toEqual([
      'dueno',
      'esposa',
      'trabajador',
      'nina',
      'asesor',
    ]);
  });

  it('defines nina without delete or update:any permissions', () => {
    expect(ROLE_DEFAULTS.nina).toContain('asset:update:own');
    expect(ROLE_DEFAULTS.nina).toContain('log:update:own');
    expect(ROLE_DEFAULTS.nina).not.toContain('asset:update:any');
    expect(ROLE_DEFAULTS.nina).not.toContain('asset:delete:own');
    expect(ROLE_DEFAULTS.nina).not.toContain('asset:delete:any');
    expect(ROLE_DEFAULTS.nina).not.toContain('log:delete:own');
    expect(ROLE_DEFAULTS.nina).not.toContain('log:delete:any');
  });

  it('keeps worker ceiling without user management', () => {
    expect(ROLE_CEILING.trabajador).toContain('asset:delete:own');
    expect(ROLE_CEILING.trabajador).not.toContain('user:manage');
    expect(ROLE_CEILING.trabajador).not.toContain('license:manage');
  });

  it('catalogs the atomic permissions used by the role layer', () => {
    expect(PERMISOS).toEqual(expect.arrayContaining([
      'asset:read',
      'asset:create',
      'asset:update:own',
      'asset:update:any',
      'asset:delete:own',
      'asset:delete:any',
      'log:create',
      'log:read:own',
      'log:read:any',
      'log:update:own',
      'log:update:any',
      'log:delete:own',
      'log:delete:any',
      'user:manage',
      'license:manage',
      'finca:settings',
      'ucan:delegate',
    ]));
  });
});

