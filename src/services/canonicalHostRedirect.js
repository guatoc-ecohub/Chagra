export const CANONICAL_HOSTNAME = 'chagra.app';
export const CANONICAL_REDIRECT_GUARD_KEY = 'chagra:canonical-host-redirected';

function normalizeHostname(hostname) {
  return String(hostname || '').trim().toLowerCase();
}

function getDefaultLocation() {
  try {
    return typeof window !== 'undefined' ? window.location : null;
  } catch (_) {
    return null;
  }
}

function getDefaultSessionStorage() {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch (_) {
    return null;
  }
}

export function isCanonicalHost(hostname) {
  return normalizeHostname(hostname) === CANONICAL_HOSTNAME;
}

export function isLocalDevHost(hostname) {
  const host = normalizeHostname(hostname);
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    /(^|[.-])dev([.-]|$)/.test(host)
  );
}

export function isPreviewHost(hostname) {
  const host = normalizeHostname(hostname);
  return (
    /(^|[.-])preview([.-]|$)/.test(host) ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.cloudflarepages.dev')
  );
}

export function isProdAppHost(hostname) {
  // prod.chagra.app = ambiente 3D-first (build app-3d), NO debe redirigir al canónico.
  return normalizeHostname(hostname) === 'prod.chagra.app';
}

const STAGING_HOSTS = new Set([
  'preprod.chagra.app',
  'chagra-dev.guatoc.co',
  'localhost',
  '127.0.0.1',
]);

export function isStagingHost(hostname) {
  // preprod.chagra.app = ambiente de STAGING que sirve la rama dev antes de que
  // llegue a main/prod. Si rebotara al canónico (chagra.app), el staging mandaría
  // a producción y no probaría nada. La lista es exacta: no se acepta un host
  // tercero solo porque contenga el token `preprod`.
  return STAGING_HOSTS.has(normalizeHostname(hostname));
}

export function isThreeDWorldHost(hostname) {
  // 3d.guatoc.co = despliegue standalone de los mundos 3D auditados (build
  // app-3d), fuera del dominio chagra.app. Igual que prod.chagra.app, NO debe
  // redirigir al canónico. Host EXACTO (no wildcard *.guatoc.co): otros
  // subdominios de guatoc.co — p.ej. chagra.guatoc.co, el dominio legado de
  // producción — deben seguir rebotando a chagra.app (ver test de
  // canonicalHostRedirect que lo asume explícitamente).
  return normalizeHostname(hostname) === '3d.guatoc.co';
}

export function isCampesinoHost(hostname) {
  // campesino.guatoc.co = despliegue standalone de la HomeCampesinoB (preview
  // pública campesina en su propio dominio propio, servida por microapp
  // estática). Como prod.chagra.app / 3d.guatoc.co, NO debe rebotar al
  // canónico chagra.app: si lo hiciera, el dominio serviría el PWA de prod en
  // vez de la home campesina. Host EXACTO.
  return normalizeHostname(hostname) === 'campesino.guatoc.co';
}

export function isAllowedHost(hostname) {
  return (
    isCanonicalHost(hostname) ||
    isLocalDevHost(hostname) ||
    isPreviewHost(hostname) ||
    isProdAppHost(hostname) ||
    isStagingHost(hostname) ||
    isThreeDWorldHost(hostname) ||
    isCampesinoHost(hostname)
  );
}

/**
 * Construye la URL canónica preservando path, search y hash de la ubicación
 * dada. Solo consume `pathname`/`search`/`hash`, así que acepta cualquier
 * objeto tipo-Location (incluido un mock parcial de tests).
 *
 * @param {{ pathname?: string, search?: string, hash?: string } | null} [location]
 * @returns {string}
 */
export function buildCanonicalUrl(location = getDefaultLocation()) {
  const pathname = location?.pathname || '/';
  const search = location?.search || '';
  const hash = location?.hash || '';
  return `https://${CANONICAL_HOSTNAME}${pathname}${search}${hash}`;
}

function readRedirectGuard(storage) {
  if (!storage) return false;
  try {
    return storage.getItem(CANONICAL_REDIRECT_GUARD_KEY) === '1';
  } catch (_) {
    return false;
  }
}

function writeRedirectGuard(storage) {
  if (!storage) return;
  try {
    storage.setItem(CANONICAL_REDIRECT_GUARD_KEY, '1');
  } catch (_) {
    /* storage unavailable, keep going */
  }
}

export function runCanonicalHostRedirectGuard(options = {}) {
  const location = options.location ?? getDefaultLocation();
  const sessionStorage = options.sessionStorage ?? getDefaultSessionStorage();
  const redirect = options.redirect || ((url) => location?.replace(url));

  if (!location || isAllowedHost(location.hostname)) {
    return { redirected: false, reason: 'allowed-host' };
  }

  if (readRedirectGuard(sessionStorage)) {
    return { redirected: false, reason: 'already-redirected' };
  }

  writeRedirectGuard(sessionStorage);
  redirect(buildCanonicalUrl(location));
  return { redirected: true, reason: 'redirected-to-canonical' };
}
