/**
 * operatorIdentityService — pseudonimización determinista de operadores
 * conforme ADR-027.v (Compliance Ley 1581 Habeas Data Colombia).
 *
 * Capa 1 de las 4 capas de privacidad:
 *   operator_id_hash = HMAC-SHA256(operator_id, salt)
 *   salt = PBKDF2(account_uuid_master, "chagra-salt-v1", iterations=10000)
 *
 * Determinista: mismo operador → mismo hash. Preserva trazabilidad cross-device.
 * No reversible: requiere account_uuid_master para mapear hash → identidad.
 *
 * El account_uuid_master es PRIVADO del owner. NUNCA se sincroniza al
 * backend Pro multi-finca. Vive solo en el device del owner.
 *
 * Capa 2 (mapping table operator_identity_map en SQLite local cifrada
 * con AES-GCM) está en operatorIdentityMap.js (a implementar cuando
 * llegue UI de captura de consentimiento).
 */

const TEXT_ENCODER = new TextEncoder();
const SALT_NAMESPACE = 'chagra-salt-v1';
const PBKDF2_ITERATIONS = 10000;

const ACCOUNT_UUID_KEY = 'chagra:account_uuid_master';
let _saltCache = null;

// ─── Account UUID master (privado del owner, en localStorage) ────────

/**
 * Retorna el account_uuid_master, generándolo si no existe.
 * Este UUID es CRÍTICO — perderlo significa perder la capacidad de
 * mapear hashes a identidades. Backup recomendado.
 */
export function getOrCreateAccountUUID() {
  let uuid = localStorage.getItem(ACCOUNT_UUID_KEY);
  if (uuid) return uuid;
  uuid = crypto.randomUUID();
  localStorage.setItem(ACCOUNT_UUID_KEY, uuid);
  console.log('[operatorIdentity] Generated NEW account_uuid_master. Backup recommended.');
  return uuid;
}

/**
 * Para tests / setup inicial.
 * Permite inyectar un account_uuid externo (ej. importado de backup).
 */
export function setAccountUUID(uuid) {
  if (typeof uuid !== 'string' || uuid.length < 32) {
    throw new Error('Invalid account_uuid_master');
  }
  localStorage.setItem(ACCOUNT_UUID_KEY, uuid);
  _saltCache = null; // invalidate cached salt
}

// ─── PBKDF2 salt derivation ──────────────────────────────────────────

async function deriveSalt() {
  if (_saltCache) return _saltCache;
  const accountUUID = getOrCreateAccountUUID();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    TEXT_ENCODER.encode(accountUUID),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const saltBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: TEXT_ENCODER.encode(SALT_NAMESPACE),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    256 // 256 bits = 32 bytes
  );
  _saltCache = new Uint8Array(saltBits);
  return _saltCache;
}

// ─── HMAC-SHA256 hash determinista ────────────────────────────────────

/**
 * Calcula operator_id_hash determinista para un operator_id dado.
 * Mismo input + mismo account_uuid_master → mismo hash siempre.
 *
 * @param {string} operatorId — identidad cruda del operador (ej. "kortux@gmail.com",
 *   nombre completo, cédula, o cualquier identificador estable elegido por el owner).
 * @returns {Promise<string>} — 64 chars hex (256 bits)
 */
export async function computeOperatorHash(operatorId) {
  if (typeof operatorId !== 'string' || operatorId.length === 0) {
    throw new Error('operatorId must be non-empty string');
  }
  const salt = await deriveSalt();
  const key = await crypto.subtle.importKey(
    'raw',
    salt,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    TEXT_ENCODER.encode(operatorId)
  );
  const bytes = new Uint8Array(sig);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Cache del operator_id_hash actual ───────────────────────────────

const CURRENT_OPERATOR_KEY = 'chagra:current_operator_hash';

/**
 * Setea el operator_id_hash del usuario activo de la sesión PWA.
 * Llamar al login. Debe persistir entre sesiones del mismo device.
 */
export async function setCurrentOperator(operatorId) {
  const hash = await computeOperatorHash(operatorId);
  localStorage.setItem(CURRENT_OPERATOR_KEY, hash);
  return hash;
}

export function getCurrentOperatorHash() {
  return localStorage.getItem(CURRENT_OPERATOR_KEY);
}

export function clearCurrentOperator() {
  localStorage.removeItem(CURRENT_OPERATOR_KEY);
}

// ─── Verificación / autoauditoría ────────────────────────────────────

/**
 * Permite al operador owner ver su propio hash (right of access ADR-027.v).
 * Útil para autoauditoría y debug.
 */
export async function verifyOperatorIdentity(operatorId, expectedHash) {
  const computed = await computeOperatorHash(operatorId);
  return computed === expectedHash;
}

// ─── Reset para tests / desarrollo ────────────────────────────────────

/**
 * Solo para entornos de testing. NO llamar en producción.
 */
export function _resetForTests() {
  _saltCache = null;
  localStorage.removeItem(ACCOUNT_UUID_KEY);
  localStorage.removeItem(CURRENT_OPERATOR_KEY);
}
