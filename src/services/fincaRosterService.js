/**
 * fincaRosterService.js - CRUD local de roster por finca.
 */

import { newUlid } from '../utils/id.js';
import { getActiveTenantId } from './tenantContext.js';
import useFincaActiveStore from './fincaActiveStore.js';
import { canManage } from './roleService.js';
import { ROLE_IDS } from '../config/roleCatalog.js';
import { canAddSubUser, tierAllowsDelegation, tierAllowsRole } from './tierService.js';

/**
 * @typedef {'dueno'|'esposa'|'trabajador'|'nina'|'asesor'} RoleId
 * @typedef {'free'|'familiar'|'cuadrilla'|'cooperativa'} TierId
 */

/**
 * Un miembro del roster de una finca. Forma canónica producida por
 * `normalizeSubUser` (ver DISENO-FEDERACION-USUARIOS.md §1.1).
 * @typedef {Object} SubUser
 * @property {string} id            ULID local estable.
 * @property {string} nombre        display name (PII).
 * @property {RoleId} rol           rol de seguridad.
 * @property {string} fincaSlug     finca a la que pertenece.
 * @property {string|null} did      did:key Ed25519 (null hasta que se genera).
 * @property {string[]} permisos    override opcional sobre el default del rol.
 * @property {string|null} createdBy did del dueño que lo creó.
 * @property {string|null} createdAt ISO8601.
 * @property {'active'|'revoked'} status
 * @property {string|null} ucanRef  CID del UCAN que respalda su acceso.
 * @property {string|null} avatar   guardian_especie cosmético.
 * @property {string|null} login    username farmOS.
 */

/**
 * El conjunto de usuarios de UNA finca. Forma canónica producida por
 * `normalizeRoster` (ver DISENO-FEDERACION-USUARIOS.md §1.2).
 * @typedef {Object} FincaRoster
 * @property {string} fincaSlug
 * @property {string|null} ownerDid
 * @property {TierId|string} tier
 * @property {SubUser[]} usuarios
 * @property {number} schemaVersion
 * @property {string|null} updatedAt
 * @property {string|null} sig
 * @property {string|null} currentSubUserId
 */

const ROSTER_PREFIX = 'chagra:finca_roster:';
const ROSTER_SCHEMA_VERSION = 2;

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

function writeStorage(key, value) {
  try {
    if (!hasStorage()) return;
    localStorage.setItem(key, value);
  } catch (_) {
    // noop
  }
}

function normalizeRoleId(roleId) {
  if (typeof roleId !== 'string') return null;
  const normalized = roleId.trim().toLowerCase();
  return ROLE_IDS.includes(normalized) ? normalized : null;
}

function getRosterKey(fincaSlug) {
  const normalized = typeof fincaSlug === 'string' ? fincaSlug.trim() : '';
  return normalized ? `${ROSTER_PREFIX}${normalized}` : ROSTER_PREFIX;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeSubUser(subUser, fincaSlug) {
  if (!subUser || typeof subUser !== 'object') return null;
  const rol = normalizeRoleId(subUser.rol || subUser.role);
  if (!rol) return null;
  const login = typeof subUser.login === 'string' && subUser.login.trim().length > 0
    ? subUser.login.trim()
    : (typeof subUser.username === 'string' && subUser.username.trim().length > 0
      ? subUser.username.trim()
      : null);
  const permisos = Array.isArray(subUser.permisos)
    ? subUser.permisos.filter((permiso) => typeof permiso === 'string' && permiso.trim().length > 0)
    : [];
  return {
    ...subUser,
    id: typeof subUser.id === 'string' && subUser.id.trim().length > 0 ? subUser.id.trim() : newUlid(),
    nombre: typeof subUser.nombre === 'string' ? subUser.nombre : '',
    rol,
    fincaSlug: typeof subUser.fincaSlug === 'string' && subUser.fincaSlug.trim().length > 0
      ? subUser.fincaSlug.trim()
      : fincaSlug,
    did: typeof subUser.did === 'string' && subUser.did.trim().length > 0 ? subUser.did.trim() : null,
    permisos,
    createdBy: typeof subUser.createdBy === 'string' && subUser.createdBy.trim().length > 0
      ? subUser.createdBy.trim()
      : null,
    createdAt: typeof subUser.createdAt === 'string' && subUser.createdAt.trim().length > 0
      ? subUser.createdAt.trim()
      : null,
    status: subUser.status === 'revoked' ? 'revoked' : 'active',
    ucanRef: typeof subUser.ucanRef === 'string' && subUser.ucanRef.trim().length > 0
      ? subUser.ucanRef.trim()
      : null,
    avatar: typeof subUser.avatar === 'string' && subUser.avatar.trim().length > 0
      ? subUser.avatar.trim()
      : null,
    login,
  };
}

function normalizeRoster(roster, fincaSlug) {
  const source = roster && typeof roster === 'object' ? roster : {};
  const slug = typeof source.fincaSlug === 'string' && source.fincaSlug.trim().length > 0
    ? source.fincaSlug.trim()
    : fincaSlug;
  const usuarios = Array.isArray(source.usuarios)
    ? source.usuarios.map((subUser) => normalizeSubUser(subUser, slug)).filter(Boolean)
    : [];
  return {
    fincaSlug: slug,
    ownerDid: typeof source.ownerDid === 'string' && source.ownerDid.trim().length > 0
      ? source.ownerDid.trim()
      : null,
    tier: typeof source.tier === 'string' && source.tier.trim().length > 0
      ? source.tier.trim()
      : 'free',
    usuarios,
    schemaVersion: Number.isFinite(Number(source.schemaVersion))
      ? Number(source.schemaVersion)
      : ROSTER_SCHEMA_VERSION,
    updatedAt: typeof source.updatedAt === 'string' && source.updatedAt.trim().length > 0
      ? source.updatedAt.trim()
      : null,
    sig: typeof source.sig === 'string' && source.sig.trim().length > 0
      ? source.sig.trim()
      : null,
    currentSubUserId: typeof source.currentSubUserId === 'string' && source.currentSubUserId.trim().length > 0
      ? source.currentSubUserId.trim()
      : null,
  };
}

function readRosterRaw(fincaSlug) {
  const raw = readStorage(getRosterKey(fincaSlug));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function saveRoster(roster) {
  const normalized = normalizeRoster(roster, roster?.fincaSlug);
  writeStorage(getRosterKey(normalized.fincaSlug), JSON.stringify(normalized));
  // Notifica a la UI (useSecurityRole, GestionUsuariosScreen) que el roster
  // cambió, para que se re-hidrate sin recargar (mismo patrón que
  // 'chagra:profile-changed' en userProfileService).
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('chagra:roster-changed', {
      detail: { fincaSlug: normalized.fincaSlug },
    }));
  }
  return normalized;
}

/**
 * Bootstrap del primer usuario: si el roster de la finca NO tiene todavía
 * ningún usuario activo, el tenant logueado (quien hizo login en farmOS,
 * dueño de facto de la finca — ADR-036 sub-viii "Responsable del
 * Tratamiento") se auto-provisiona como `dueno` la primera vez que se
 * consulta el actor. Sin esto, `addSubUser`/`revokeSubUser` fallan siempre
 * con "roster actor not available" — nadie podría crear el primer usuario.
 * Es una escritura idempotente y solo ocurre cuando `usuarios` está vacío.
 */
function ensureOwnerBootstrap(fincaSlug) {
  const roster = getRoster(fincaSlug);
  const activeUsers = roster.usuarios.filter((user) => user.status !== 'revoked');
  if (activeUsers.length > 0) return roster;

  const tenantId = getActiveTenantId();
  if (!tenantId) return roster;

  const owner = normalizeSubUser({
    nombre: tenantId,
    rol: 'dueno',
    fincaSlug: roster.fincaSlug,
    login: tenantId,
    ownerDid: undefined,
    status: 'active',
    createdAt: nowIso(),
  }, roster.fincaSlug);

  const nextRoster = {
    ...roster,
    usuarios: roster.usuarios.concat(owner),
    updatedAt: nowIso(),
  };
  return saveRoster(nextRoster);
}

function getActorForFinca(fincaSlug) {
  ensureOwnerBootstrap(fincaSlug);
  return currentSubUser(fincaSlug);
}

/**
 * API pública del bootstrap (ver `ensureOwnerBootstrap`): quien lee el
 * roster ANTES de mutar (UI, hooks) debe llamar esto primero para
 * garantizar que el tenant logueado exista como `dueno` si el roster está
 * vacío. `addSubUser`/`updateSubUserRole`/`revokeSubUser` ya lo hacen
 * internamente vía `getActorForFinca`; esto es para lectores externos
 * (`useSecurityRole`, `GestionUsuariosScreen`) que necesitan el roster
 * poblado ANTES de la primera mutación.
 * @param {string} fincaSlug
 * @returns {FincaRoster}
 */
export function ensureOwnerBootstrapped(fincaSlug) {
  return ensureOwnerBootstrap(fincaSlug);
}

function assertActorCanManage(actor, targetRole) {
  if (!actor) {
    throw new Error('roster actor not available');
  }
  if (!canManage(actor.rol, targetRole)) {
    throw new Error('actor cannot manage this role');
  }
}

function ensureTierCapacity(roster) {
  if (!canAddSubUser(roster)) {
    throw new Error('tier capacity exceeded');
  }
}

function ensureRoleAllowed(roster, roleId) {
  if (!tierAllowsRole(roster.tier, roleId)) {
    throw new Error('tier does not allow this role');
  }
  if (roleId === 'asesor' && !tierAllowsDelegation(roster.tier)) {
    throw new Error('tier does not allow delegation');
  }
}

function findCurrentSubUser(roster) {
  const tenantId = getActiveTenantId();
  const normalizedTenant = typeof tenantId === 'string' ? tenantId.trim().toLowerCase() : '';
  const activeUsers = roster.usuarios.filter((user) => user.status !== 'revoked');

  if (normalizedTenant) {
    const matched = activeUsers.find((user) => {
      const haystack = [
        user.login,
        user.username,
        user.did,
        user.id,
        user.nombre,
      ]
        .filter((value) => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim().toLowerCase());
      return haystack.includes(normalizedTenant);
    });
    if (matched) return matched;
  }

  if (typeof roster.currentSubUserId === 'string' && roster.currentSubUserId.trim().length > 0) {
    const matched = activeUsers.find((user) => user.id === roster.currentSubUserId.trim());
    if (matched) return matched;
  }

  if (activeUsers.length === 1) {
    return activeUsers[0];
  }

  return null;
}

export function getRoster(fincaSlug) {
  const normalizedSlug = typeof fincaSlug === 'string' ? fincaSlug.trim() : '';
  const raw = readRosterRaw(normalizedSlug);
  return normalizeRoster(raw, normalizedSlug);
}

export function currentSubUser(fincaSlug) {
  const activeFincaSlug = typeof fincaSlug === 'string' && fincaSlug.trim().length > 0
    ? fincaSlug.trim()
    : useFincaActiveStore.getState().activeFincaSlug;
  const roster = getRoster(activeFincaSlug);
  return findCurrentSubUser(roster);
}

export function addSubUser(fincaSlug, draft) {
  const roster = getRoster(fincaSlug);
  const actor = getActorForFinca(fincaSlug);
  const roleId = normalizeRoleId(draft && (draft.rol || draft.role));
  if (!roleId) {
    throw new Error('invalid role');
  }
  assertActorCanManage(actor, roleId);
  ensureTierCapacity(roster);
  ensureRoleAllowed(roster, roleId);

  const subUser = normalizeSubUser({
    ...draft,
    rol: roleId,
    fincaSlug: roster.fincaSlug,
    status: 'active',
  }, roster.fincaSlug);

  const nextRoster = {
    ...roster,
    usuarios: roster.usuarios.concat(subUser),
    updatedAt: nowIso(),
  };

  saveRoster(nextRoster);
  return subUser;
}

export function updateSubUserRole(fincaSlug, id, rol) {
  const roster = getRoster(fincaSlug);
  const actor = getActorForFinca(fincaSlug);
  const targetId = typeof id === 'string' ? id.trim() : '';
  const roleId = normalizeRoleId(rol);
  if (!targetId) {
    throw new Error('invalid subuser id');
  }
  if (!roleId) {
    throw new Error('invalid role');
  }
  ensureRoleAllowed(roster, roleId);

  const index = roster.usuarios.findIndex((user) => user.id === targetId);
  if (index === -1) {
    throw new Error('subuser not found');
  }

  const target = roster.usuarios[index];
  assertActorCanManage(actor, target.rol);
  if (target.status === 'revoked') {
    throw new Error('subuser revoked');
  }

  const updated = normalizeSubUser({
    ...target,
    rol: roleId,
  }, roster.fincaSlug);

  const usuarios = roster.usuarios.slice();
  usuarios[index] = updated;
  saveRoster({
    ...roster,
    usuarios,
    updatedAt: nowIso(),
  });
  return updated;
}

export function revokeSubUser(fincaSlug, id) {
  const roster = getRoster(fincaSlug);
  const actor = getActorForFinca(fincaSlug);
  const targetId = typeof id === 'string' ? id.trim() : '';
  if (!targetId) {
    throw new Error('invalid subuser id');
  }

  const index = roster.usuarios.findIndex((user) => user.id === targetId);
  if (index === -1) {
    throw new Error('subuser not found');
  }

  const target = roster.usuarios[index];
  assertActorCanManage(actor, target.rol);

  const usuarios = roster.usuarios.slice();
  usuarios[index] = normalizeSubUser({
    ...target,
    status: 'revoked',
  }, roster.fincaSlug);

  saveRoster({
    ...roster,
    usuarios,
    updatedAt: nowIso(),
  });
}
