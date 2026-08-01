/**
 * roleService.js - Lógica pura para roles y permisos de seguridad.
 */

import { getActiveTenantId } from './tenantContext.js';
import {
  PERMISOS,
  ROLE_CEILING,
  ROLE_DEFAULTS,
  ROLE_IDS,
} from '../config/roleCatalog.js';

const SECURITY_ROLE_KEYS = [
  'chagra:security:role',
  'chagra:security_role',
  'chagra:current_security_role',
];

function hasStorage() {
  return typeof localStorage !== 'undefined';
}

function readStorage(key) {
  try {
    return hasStorage() ? localStorage.getItem(key) : null;
  } catch (_) {
    return null;
  }
}

function normalizeRoleId(roleId) {
  if (typeof roleId !== 'string') return null;
  const normalized = roleId.trim().toLowerCase();
  return ROLE_IDS.includes(normalized) ? normalized : null;
}

function normalizePermiso(permiso) {
  if (typeof permiso !== 'string') return null;
  const normalized = permiso.trim().toLowerCase();
  return PERMISOS.includes(normalized) ? normalized : null;
}

function getActorIdentityValues(actor) {
  if (!actor || typeof actor !== 'object') return [];
  return [
    actor.did,
    actor.id,
    actor.login,
    actor.username,
    actor.tenantId,
    actor.name,
  ]
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase());
}

function resourceOwnedByActor(actor, resourceOwnerDid) {
  if (!resourceOwnerDid || typeof resourceOwnerDid !== 'string') return false;
  const target = resourceOwnerDid.trim().toLowerCase();
  if (!target) return false;
  return getActorIdentityValues(actor).includes(target);
}

function resolvePermissionCandidates(permiso, ownsResource) {
  const normalized = typeof permiso === 'string' ? permiso.trim().toLowerCase() : '';
  if (!normalized) return [];
  if (normalized.endsWith(':own')) {
    const base = normalized.slice(0, -4);
    return ownsResource ? [normalized, `${base}:any`] : [normalized];
  }
  if (normalized.endsWith(':any')) {
    return [normalized];
  }
  return ownsResource
    ? [normalized, `${normalized}:own`, `${normalized}:any`]
    : [normalized, `${normalized}:any`];
}

function hasEffectivePerm(effectivePerms, permiso, ownsResource) {
  const candidates = resolvePermissionCandidates(permiso, ownsResource);
  for (const candidate of candidates) {
    if (effectivePerms.has(candidate)) return true;
  }
  return false;
}

function readFallbackSecurityRole() {
  for (const key of SECURITY_ROLE_KEYS) {
    const candidate = normalizeRoleId(readStorage(key));
    if (candidate) return candidate;
  }
  return null;
}

function readRosterForActiveFinca() {
  const fincaSlug = getActiveFincaSlug();
  if (!fincaSlug) return null;
  try {
    const raw = readStorage(`chagra:finca_roster:${fincaSlug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}

function getActiveFincaSlug() {
  try {
    const store = readStorage('chagra:active-finca');
    if (store) {
      const parsed = JSON.parse(store);
      const slug = parsed?.state?.activeFincaSlug;
      if (typeof slug === 'string' && slug.trim()) {
        return slug.trim();
      }
    }
  } catch (_) {
    // ignore
  }
  return null;
}

function normalizeSubUser(subUser) {
  if (!subUser || typeof subUser !== 'object') return null;
  const rol = normalizeRoleId(subUser.rol || subUser.role);
  if (!rol) return null;
  return {
    ...subUser,
    rol,
  };
}

function currentSubUserFromRoster() {
  const roster = readRosterForActiveFinca();
  if (!roster || !Array.isArray(roster.usuarios)) return null;
  const tenantId = getActiveTenantId();
  const normalizedTenant = typeof tenantId === 'string' ? tenantId.trim().toLowerCase() : '';
  const users = roster.usuarios
    .map(normalizeSubUser)
    .filter(Boolean)
    .filter((user) => user.status !== 'revoked');

  if (normalizedTenant) {
    const matched = users.find((user) => {
      const values = getActorIdentityValues(user);
      return values.includes(normalizedTenant);
    });
    if (matched) return matched;
  }

  const currentId = roster.currentSubUserId;
  if (typeof currentId === 'string' && currentId.trim().length > 0) {
    const matched = users.find((user) => user.id === currentId.trim());
    if (matched) return matched;
  }

  if (users.length === 1) {
    return users[0];
  }

  return null;
}

export function resolvePermisos(subUser) {
  const normalized = normalizeSubUser(subUser);
  if (!normalized) return new Set();

  const base = ROLE_DEFAULTS[normalized.rol] || [];
  const ceiling = new Set(ROLE_CEILING[normalized.rol] || []);
  const effective = new Set(base);
  const overrides = Array.isArray(normalized.permisos) ? normalized.permisos : [];

  for (const permiso of overrides) {
    const normalizedPermiso = normalizePermiso(permiso);
    if (!normalizedPermiso) continue;
    if (ceiling.has(normalizedPermiso)) {
      effective.add(normalizedPermiso);
    }
  }

  return effective;
}

export function can(actor, permiso, resourceOwnerDid) {
  const normalizedActor = normalizeSubUser(actor) || currentSubUserFromRoster();
  if (!normalizedActor) return false;
  const normalizedPermiso = normalizePermiso(permiso) || (
    typeof permiso === 'string' ? permiso.trim().toLowerCase() : ''
  );
  if (!normalizedPermiso) return false;

  const effectivePerms = resolvePermisos(normalizedActor);
  const ownsResource = resourceOwnedByActor(normalizedActor, resourceOwnerDid);

  if (effectivePerms.has(normalizedPermiso)) {
    if (normalizedPermiso.endsWith(':own')) {
      return ownsResource || effectivePerms.has(normalizedPermiso.replace(/:own$/, ':any'));
    }
    return true;
  }

  return hasEffectivePerm(effectivePerms, normalizedPermiso, ownsResource);
}

export function canManage(actorRole, targetRole) {
  const normalizedActor = normalizeRoleId(actorRole);
  const normalizedTarget = normalizeRoleId(targetRole);
  if (!normalizedActor || !normalizedTarget) return false;
  if (normalizedActor === 'dueno') return true;
  if (normalizedActor === 'esposa') {
    return normalizedTarget === 'trabajador' || normalizedTarget === 'nina';
  }
  return false;
}

export function currentSecurityRole() {
  const currentSubUser = currentSubUserFromRoster();
  if (currentSubUser) return currentSubUser.rol;
  return readFallbackSecurityRole();
}

export function isNina(subUser) {
  const candidate = normalizeSubUser(subUser) || currentSubUserFromRoster();
  return !!candidate && candidate.rol === 'nina';
}
