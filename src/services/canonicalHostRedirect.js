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

export function isAllowedHost(hostname) {
  return isCanonicalHost(hostname) || isLocalDevHost(hostname) || isPreviewHost(hostname);
}

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
