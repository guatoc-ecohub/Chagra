/**
 * roleCatalog.js - Catalogo de roles y permisos de seguridad.
 *
 * Fuente de verdad para la federacion de usuarios en Fase 1 client-side.
 * Los permisos son atomicos y se expresan como verbo:recurso[:scope].
 */

const PERMISO_LIST = [
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
];

export const PERMISOS = Object.freeze(PERMISO_LIST.slice());

export const ROLE_IDS = Object.freeze([
  'dueno',
  'esposa',
  'trabajador',
  'nina',
  'asesor',
]);

function freezePermissions(list) {
  return Object.freeze(list.slice());
}

const ALL_PERMISOS = freezePermissions(PERMISOS);

export const ROLE_DEFAULTS = Object.freeze({
  dueno: ALL_PERMISOS,
  esposa: freezePermissions([
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
    'finca:settings',
  ]),
  trabajador: freezePermissions([
    'asset:read',
    'asset:create',
    'asset:update:own',
    'asset:delete:own',
    'log:create',
    'log:read:own',
    'log:read:any',
    'log:update:own',
    'log:delete:own',
  ]),
  nina: freezePermissions([
    'asset:read',
    'asset:create',
    'asset:update:own',
    'log:create',
    'log:read:own',
    'log:read:any',
    'log:update:own',
  ]),
  asesor: freezePermissions([
    'asset:read',
    'log:create',
    'log:read:own',
    'log:read:any',
  ]),
});

export const ROLE_CEILING = Object.freeze({
  dueno: ALL_PERMISOS,
  esposa: freezePermissions([
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
    'finca:settings',
  ]),
  trabajador: freezePermissions([
    'asset:read',
    'asset:create',
    'asset:update:own',
    'asset:delete:own',
    'log:create',
    'log:read:own',
    'log:read:any',
    'log:update:own',
    'log:delete:own',
  ]),
  nina: freezePermissions([
    'asset:read',
    'asset:create',
    'asset:update:own',
    'log:create',
    'log:read:own',
    'log:read:any',
    'log:update:own',
  ]),
  asesor: freezePermissions([
    'asset:read',
    'log:create',
    'log:read:own',
    'log:read:any',
  ]),
});

