/**
 * operatorPhotoService — foto de perfil del operador con persistencia local
 * (localStorage) + sincronización opcional a FarmOS (cross-device).
 *
 * Separado de `userProfileService` a propósito: ese módulo es, por contrato,
 * 100% client-side ("NADA se envía a ningún backend", soberanía ADR-007). La
 * foto de perfil SÍ se sincroniza al servidor cuando hay sesión, así que vive
 * en su propio módulo para no romper esa garantía.
 *
 * ── Persistencia local (siempre, offline-first) ──────────────────────────
 *   - Data-URL JPEG redimensionado a 256×256 (calidad 0.82 ≈ 15-40 KB).
 *   - Store DURABLE = IndexedDB vía localforage, clave `chagra:operator:photo:v1`
 *     (mismo motor offline que el resto de la app: authService, dataBackup,
 *     conversationMemory). Cuota holgada (cientos de MB), NUNCA compite con el
 *     presupuesto síncrono de ~5 MB de localStorage.
 *
 *   BUG HISTÓRICO (2026-07-05, "la foto no persiste al recargar"): antes la foto
 *   se guardaba SOLO como base64 en `localStorage`. Ese cubo tiene ~5 MB por
 *   origen, es síncrono y ya lo llenan 50+ claves `chagra:*` + el fondo elegido;
 *   base64 infla el blob ~33%. Cuando el `setItem` reventaba con
 *   `QuotaExceededError`, se tragaba en silencio (console.warn) → la foto NO se
 *   guardaba y al recargar `getOperatorPhoto()` devolvía '' (la foto "desaparecía").
 *   Rompía además la regla del propio repo ("Blobs grandes → IndexedDB, NO
 *   localStorage", dbCore v16/v17, ADR-030 Regla 8). Fix: la fuente de verdad
 *   pasó a localforage/IndexedDB; localStorage queda como ESPEJO best-effort
 *   opcional (solo pinta sin flash en la recarga; si revienta la cuota, no pasa
 *   nada porque la durabilidad la garantiza IndexedDB).
 *
 *   - Render inmediato (offline-first, sin flash): `getOperatorPhoto()` es
 *     SÍNCRONO — devuelve un cache en memoria (o el espejo de localStorage la
 *     primera vez) y dispara la hidratación desde IndexedDB en segundo plano.
 *     Al resolver, emite `chagra:operator-update` y los consumidores (TopBar,
 *     ProfileScreen) re-leen. La portada (TopBar) lee de aquí sin red.
 *
 * ── Sincronización a FarmOS (cuando hay sesión) ──────────────────────────
 *   Usa el flujo NATIVO de Drupal 10 JSON:API (`uploadBinaryToFarmOS`):
 *     - Subida:  POST /api/log/observation/file (octet-stream +
 *       Content-Disposition) → crea un `file--file` con filename
 *       `chagra-operator-photo-<tenantId>-<ts>.jpg` (el prefijo por usuario
 *       evita colisiones entre operadores que comparten backend) y se adjunta
 *       a un log--observation estable por usuario para que Drupal lo marque
 *       PERMANENTE (bug 2026-07-08: la ruta vieja /api/file/upload no existe
 *       → 404 silencioso, la foto nunca subía).
 *     - Carga:   GET /api/file/file?filter[filename][operator]=CONTAINS
 *       &filter[filename][value]=chagra-operator-photo-<tenantId>-&sort=-created
 *       &page[limit]=1 → descarga el blob más reciente con Bearer token y lo
 *       persiste local como data-URL.
 *
 *   Por qué `file--file` y no un campo del user de FarmOS (`user_picture`):
 *   FarmOS 4.x expone los usuarios en `/api/user/user`, pero el password-grant
 *   token de Chagra no garantiza permiso de PATCH sobre el propio user, y el
 *   campo `user_picture` no está habilitado por defecto en el perfil JSON:API.
 *   El recurso `file--file` SÍ está disponible (lo usa el sync de evidencia y
 *   los fondos), así que es la vía verificable HOY. Si en el futuro el backend
 *   habilita `user_picture` editable, migrar `uploadToFarmOS`/`loadFromFarmOS`
 *   a PATCH /api/user/user/<id> + relación `user_picture` (TODO abajo).
 *
 * Español colombiano (tú/usted, SIN voseo). Repo público: sin hostnames/IPs/
 * tokens internos (SOP §2) — todo va por rutas relativas / VITE_*.
 *
 * @module operatorPhotoService
 */

import localforage from 'localforage';
import { getActiveTenantId } from './tenantContext';

export const PHOTO_STORAGE_KEY = 'chagra:operator:photo:v1';
// Metadatos de la última sync (UUID del file en FarmOS) — evita re-subir/
// re-descargar la misma foto. Plano en localStorage (es pequeño, sin blob).
export const PHOTO_SYNC_META_KEY = 'chagra:operator:photo:sync:v1';
export const PHOTO_MAX_DIMENSION = 256;
export const PHOTO_JPEG_QUALITY = 0.82;
// Prefijo de filename en FarmOS. El tenantId (username) se concatena para
// scoping por usuario. Mantener estable: cambiarlo huérfana fotos viejas.
const FARMOS_PHOTO_PREFIX = 'chagra-operator-photo';

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage;

// ── Cache en memoria = fuente SÍNCRONA para render inmediato ─────────────
// null = aún no hidratado desde IndexedDB; '' = hidratado sin foto; string = foto.
let _memoryPhoto = null;
// Promesa de hidratación (idempotente): la primera lectura la dispara.
let _hydratePromise = null;

/**
 * Lee el ESPEJO de localStorage (síncrono). Sirve para (a) pintar sin flash la
 * primera vez antes de que responda IndexedDB y (b) migrar fotos de usuarios
 * que ya la tenían en localStorage antes de esta versión. NO es la fuente de
 * verdad (lo es IndexedDB).
 */
function readMirror() {
  if (!hasStorage()) return '';
  try {
    return window.localStorage.getItem(PHOTO_STORAGE_KEY) || '';
  } catch (e) {
    console.warn('[operatorPhoto] readMirror:', e);
    return '';
  }
}

/**
 * Escribe el espejo síncrono best-effort. Si la cuota de localStorage está
 * llena (el bug histórico), se ignora SIN romper: la durabilidad ya la
 * garantiza localforage/IndexedDB; el espejo es solo un acelerador de pintado.
 */
function writeMirror(dataUrl) {
  if (!hasStorage()) return;
  try {
    if (dataUrl) window.localStorage.setItem(PHOTO_STORAGE_KEY, dataUrl);
    else window.localStorage.removeItem(PHOTO_STORAGE_KEY);
  } catch (e) {
    // QuotaExceededError — precisamente lo que motivó mover el store a IndexedDB.
    console.warn('[operatorPhoto] espejo localStorage lleno (no fatal):', e?.name || e);
  }
}

/** Dispara la hidratación desde IndexedDB una sola vez (idempotente). */
function ensureHydrated() {
  if (!_hydratePromise) _hydratePromise = hydrateOperatorPhoto();
  return _hydratePromise;
}

/**
 * Hidrata `_memoryPhoto` desde el store DURABLE (localforage/IndexedDB) y, si
 * hiciera falta, MIGRA una foto legada que viviera solo en localStorage. Emite
 * `chagra:operator-update` si el valor cambió, para que TopBar/ProfileScreen
 * re-lean en vivo. No-throw. Llamar al bootstrap y/o perezosamente desde
 * `getOperatorPhoto`. Segura de correr varias veces.
 *
 * @returns {Promise<string>} el data-URL efectivo tras hidratar ('' si no hay).
 */
export async function hydrateOperatorPhoto() {
  let durable = '';
  try {
    const raw = await localforage.getItem(PHOTO_STORAGE_KEY);
    if (typeof raw === 'string') durable = raw;
  } catch (e) {
    console.warn('[operatorPhoto] hydrate localforage falló:', e?.message || e);
  }

  if (durable) {
    const changed = _memoryPhoto !== durable;
    _memoryPhoto = durable;
    writeMirror(durable); // mantener el espejo síncrono al día
    if (changed) emitOperatorUpdate(durable);
    return durable;
  }

  // IndexedDB vacío: ¿hay una foto legada en localStorage (versiones previas)?
  // Migrarla al store durable de una vez.
  const legacy = readMirror();
  if (legacy) {
    try {
      await localforage.setItem(PHOTO_STORAGE_KEY, legacy);
    } catch (e) {
      console.warn('[operatorPhoto] migración a localforage falló:', e?.message || e);
    }
    _memoryPhoto = legacy;
    return legacy;
  }

  _memoryPhoto = '';
  return '';
}

/**
 * Redimensiona un File de imagen a un data-URL JPEG ≤256px lado mayor.
 * Client-side (canvas) — no toca red. Lanza si el archivo no es imagen válida.
 *
 * @param {File|Blob} file
 * @returns {Promise<string>} data-URL `data:image/jpeg;base64,...`
 */
export async function resizePhotoToDataUrl(file) {
  if (!file || (file.type && !file.type.startsWith('image/'))) {
    throw new Error('El archivo no parece una imagen.');
  }
  const fileDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('FileReader falló'));
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Imagen inválida'));
    i.src = fileDataUrl;
  });
  const maxSide = Math.max(img.width, img.height) || 1;
  const scale = Math.min(1, PHOTO_MAX_DIMENSION / maxSide);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D no disponible');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY);
}

/**
 * @returns {string} data-URL de la foto local, o '' si no hay. SÍNCRONO
 * (offline-first, render inmediato): devuelve el cache en memoria si ya se
 * hidrató; si no, dispara la hidratación desde IndexedDB en segundo plano y
 * devuelve el espejo síncrono de localStorage para pintar sin flash. Cuando la
 * hidratación resuelve, emite `chagra:operator-update` y los consumidores re-leen.
 */
export function getOperatorPhoto() {
  if (_memoryPhoto !== null) return _memoryPhoto;
  ensureHydrated();
  return readMirror();
}

/**
 * Emite el evento same-tab que TopBar/ProfileScreen escuchan para re-leer la
 * foto en vivo. `storage` (cross-tab nativo) lo cubre el navegador aparte.
 */
function emitOperatorUpdate(value) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('chagra:operator-update', {
      detail: { key: PHOTO_STORAGE_KEY, value },
    }));
  } catch (_) { /* SSR/tests sin window — el valor ya quedó persistido */ }
}

/**
 * Persiste la foto local (sin tocar red) y notifica a los consumidores.
 * Fuente de verdad = localforage/IndexedDB (durable, cuota holgada). El cache
 * en memoria se actualiza SÍNCRONO para render inmediato; el espejo de
 * localStorage es best-effort (no fatal si la cuota está llena).
 * @param {string} dataUrl
 */
export function setOperatorPhotoLocal(dataUrl) {
  const value = dataUrl || '';
  _memoryPhoto = value;
  _hydratePromise = Promise.resolve(value); // ya está hidratado con este valor
  // Durable primero (IndexedDB) — fire-and-forget, no-throw.
  const durableWrite = value
    ? localforage.setItem(PHOTO_STORAGE_KEY, value)
    : localforage.removeItem(PHOTO_STORAGE_KEY);
  Promise.resolve(durableWrite)
    .catch((e) => console.warn('[operatorPhoto] persist localforage falló:', e?.message || e));
  // Espejo síncrono best-effort (pinta sin flash en la próxima recarga).
  writeMirror(value);
  emitOperatorUpdate(value);
}

/**
 * Borra la foto local. La sync remota (file--file) NO se borra por ahora
 * (FarmOS conserva el histórico de files; un re-login en otro device volvería
 * a bajar la última subida). Para "olvidar en todos lados" haría falta DELETE
 * /api/file/file/<uuid> — anotado como mejora futura.
 */
export function removeOperatorPhotoLocal() {
  setOperatorPhotoLocal('');
  try {
    if (hasStorage()) window.localStorage.removeItem(PHOTO_SYNC_META_KEY);
  } catch (_) { /* noop */ }
}

function readSyncMeta() {
  if (!hasStorage()) return {};
  try {
    const raw = window.localStorage.getItem(PHOTO_SYNC_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function writeSyncMeta(meta) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(PHOTO_SYNC_META_KEY, JSON.stringify(meta || {}));
  } catch (_) { /* noop */ }
}

/** Convierte un data-URL a Blob (para subir como multipart). */
function dataUrlToBlob(dataUrl) {
  const [head, b64] = String(dataUrl).split(',');
  const mimeMatch = /data:([^;]+)/.exec(head || '');
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bin = atob(b64 || '');
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Sube la foto a FarmOS como `file--file` con filename scopeado por usuario.
 * No-throw amigable: devuelve { ok, fileUuid } y NUNCA rompe el flujo local
 * (la foto ya está guardada en localStorage por el caller). En offline / sin
 * sesión simplemente devuelve { ok:false, reason }.
 *
 * @param {string} dataUrl
 * @returns {Promise<{ok: boolean, fileUuid?: string, reason?: string}>}
 */
export async function uploadToFarmOS(dataUrl) {
  const tenantId = getActiveTenantId();
  if (!tenantId) return { ok: false, reason: 'no-session' };
  if (!dataUrl) return { ok: false, reason: 'no-photo' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, reason: 'offline' };
  }
  try {
    const { sendToFarmOS, uploadBinaryToFarmOS } = await import('./apiService.js');
    const blob = dataUrlToBlob(dataUrl);
    const filename = `${FARMOS_PHOTO_PREFIX}-${tenantId}-${Date.now()}.jpg`;
    // BUG FIX 2026-07-08 ("no sube a farmOS"): la ruta vieja POST
    // /api/file/upload NO EXISTE en farmOS 4.x / Drupal 10 (404 verificado en
    // vivo) — la subida fallaba en silencio desde siempre. La vía real de
    // Drupal es el upload POR CAMPO: POST /api/log/observation/file con
    // octet-stream + Content-Disposition (403 sin auth = la ruta sí existe).
    const result = await uploadBinaryToFarmOS(blob, filename, {
      entity: 'log', bundle: 'observation', field: 'file',
    });
    const fileUuid = result?.data?.id;
    if (fileUuid) {
      // Durabilidad: un file--file SIN referencia queda "temporal" y el cron
      // de Drupal lo borra (~6 h) → la foto "desaparecía" del server. Se
      // adjunta a UN log--observation por usuario (reusado entre cambios de
      // foto vía logUuid en el sync meta) para marcarlo permanente.
      const logUuid = await attachPhotoToLog(sendToFarmOS, fileUuid, tenantId);
      writeSyncMeta({ fileUuid, filename, logUuid, syncedAt: Date.now(), tenantId });
      return { ok: true, fileUuid };
    }
    return { ok: false, reason: 'no-uuid' };
  } catch (err) {
    // Falla de red/permiso no es fatal: el local sigue funcionando.
    console.warn('[operatorPhoto] uploadToFarmOS falló (no bloqueante):', err?.message || err);
    return { ok: false, reason: 'error' };
  }
}

/**
 * Adjunta el file subido a un `log--observation` estable por usuario
 * (`chagra-operator-photo-<tenantId>`) para que Drupal marque el archivo como
 * PERMANENTE (sin referencia lo garbage-collectea en horas). Reusa el mismo
 * log entre cambios de foto (PATCH); si el log guardado ya no existe (o nunca
 * se creó), crea uno nuevo. No-throw: devuelve el logUuid efectivo o null.
 *
 * @param {Function} sendToFarmOS - inyectado por el caller (ya importado)
 * @param {string} fileUuid
 * @param {string} tenantId
 * @returns {Promise<string|null>}
 */
async function attachPhotoToLog(sendToFarmOS, fileUuid, tenantId) {
  const relationships = {
    file: { data: [{ type: 'file--file', id: fileUuid }] },
  };
  const prevLogUuid = readSyncMeta().logUuid || null;
  if (prevLogUuid) {
    try {
      await sendToFarmOS(`/api/log/observation/${prevLogUuid}`, {
        data: { type: 'log--observation', id: prevLogUuid, relationships },
      }, 'PATCH');
      return prevLogUuid;
    } catch (e) {
      // Log borrado remotamente / permiso — caer a crear uno nuevo.
      console.warn('[operatorPhoto] PATCH log foto falló, creando nuevo:', e?.message || e);
    }
  }
  try {
    const res = await sendToFarmOS('/api/log/observation', {
      data: {
        type: 'log--observation',
        attributes: {
          name: `${FARMOS_PHOTO_PREFIX}-${tenantId}`,
          status: 'done',
        },
        relationships,
      },
    }, 'POST');
    return res?.data?.id || null;
  } catch (e) {
    // No fatal: el file quedó subido; el próximo cambio de foto reintenta.
    console.warn('[operatorPhoto] attach log foto falló (no bloqueante):', e?.message || e);
    return null;
  }
}

/**
 * Construye el endpoint JSON:API para hallar la foto más reciente del usuario.
 * @param {string} tenantId
 * @returns {string}
 */
function latestPhotoEndpoint(tenantId) {
  const prefix = `${FARMOS_PHOTO_PREFIX}-${tenantId}-`;
  return (
    `/api/file/file` +
    `?filter[filename][operator]=CONTAINS` +
    `&filter[filename][value]=${encodeURIComponent(prefix)}` +
    `&sort=-created` +
    `&page[limit]=1`
  );
}

/**
 * Carga desde FarmOS la última foto del usuario y la persiste local. Pensada
 * para correr tras el login en un dispositivo nuevo (cross-device).
 *
 * No pisa una foto local más nueva: si el `fileUuid` remoto coincide con el de
 * la última sync local, no hace nada. Si no hay sesión / offline / sin match,
 * deja el local como esté. No-throw.
 *
 * @returns {Promise<{ok: boolean, updated?: boolean, reason?: string}>}
 */
export async function loadFromFarmOS() {
  const tenantId = getActiveTenantId();
  if (!tenantId) return { ok: false, reason: 'no-session' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, reason: 'offline' };
  }
  try {
    const { fetchFromFarmOS, fetchWithAuthRetry } = await import('./apiService.js');

    const response = await fetchFromFarmOS(latestPhotoEndpoint(tenantId));
    const items = response?.data || [];
    if (items.length === 0) return { ok: true, updated: false, reason: 'no-remote' };

    const file = items[0];
    const fileUuid = file.id;
    const meta = readSyncMeta();
    // Ya tenemos esta foto localmente (mismo UUID) → nada que hacer.
    if (meta.fileUuid && meta.fileUuid === fileUuid && getOperatorPhoto()) {
      return { ok: true, updated: false, reason: 'already-current' };
    }

    const attrs = file.attributes || {};
    const uri = attrs.uri?.url || attrs.uri?.value;
    if (!uri) return { ok: true, updated: false, reason: 'no-uri' };
    const base = import.meta.env.VITE_FARMOS_URL || '';
    const fullUrl = uri.startsWith('http') ? uri : `${base}${uri}`;

    const res = await fetchWithAuthRetry(fullUrl);
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };
    const blob = await res.blob();

    // Normalizamos a data-URL 256px para que TopBar lo consuma igual que una
    // foto subida localmente (y para no guardar un blob grande del server).
    const dataUrl = await resizePhotoToDataUrl(blob);
    setOperatorPhotoLocal(dataUrl);
    writeSyncMeta({ fileUuid, filename: attrs.filename, syncedAt: Date.now(), tenantId });
    return { ok: true, updated: true };
  } catch (err) {
    console.warn('[operatorPhoto] loadFromFarmOS falló (no bloqueante):', err?.message || err);
    return { ok: false, reason: 'error' };
  }
}

/**
 * Flujo completo de "el usuario eligió una foto": redimensiona, persiste local
 * (render inmediato + offline) y dispara la subida a FarmOS en segundo plano.
 * Devuelve el data-URL para que el caller actualice su estado sin esperar red.
 *
 * @param {File|Blob} file
 * @returns {Promise<string>} data-URL persistido
 */
export async function setOperatorPhotoFromFile(file) {
  const dataUrl = await resizePhotoToDataUrl(file);
  setOperatorPhotoLocal(dataUrl);
  // Sync en segundo plano — no bloquea la UI ni propaga errores de red.
  Promise.resolve().then(() => uploadToFarmOS(dataUrl)).catch(() => {});
  return dataUrl;
}

/**
 * Resetea el estado en memoria del módulo (cache + hidratación). Solo para
 * tests: en prod el módulo vive lo que dure la pestaña.
 */
export function _resetForTests() {
  _memoryPhoto = null;
  _hydratePromise = null;
}

export const __test = {
  FARMOS_PHOTO_PREFIX,
  latestPhotoEndpoint,
  dataUrlToBlob,
  readSyncMeta,
  writeSyncMeta,
  readMirror,
  writeMirror,
};
