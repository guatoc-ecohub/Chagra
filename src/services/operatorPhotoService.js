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
 *   - Data-URL JPEG redimensionado a 256×256 (calidad 0.82 ≈ 15-40 KB) en
 *     `localStorage[chagra:operator:photo:v1]`. Holgado dentro de la cuota
 *     de ~5 MB por origen.
 *   - La portada (TopBar) lee de aquí: render inmediato sin red.
 *
 * ── Sincronización a FarmOS (cuando hay sesión) ──────────────────────────
 *   Reutiliza el patrón YA existente en el repo (`useBackgroundImage` +
 *   `syncManager`): NO inventa endpoints.
 *     - Subida:  POST /api/file/upload (FormData) → crea un `file--file` con
 *       filename `chagra-operator-photo-<tenantId>-<ts>.jpg`. El prefijo por
 *       usuario evita colisiones entre operadores que comparten backend.
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

import { getActiveTenantId } from './tenantContext';

export const PHOTO_STORAGE_KEY = 'chagra:operator:photo:v1';
// Metadatos de la última sync (UUID del file en FarmOS) — evita re-subir/
// re-descargar la misma foto. Plano en localStorage, separado del data-URL.
export const PHOTO_SYNC_META_KEY = 'chagra:operator:photo:sync:v1';
export const PHOTO_MAX_DIMENSION = 256;
export const PHOTO_JPEG_QUALITY = 0.82;
// Prefijo de filename en FarmOS. El tenantId (username) se concatena para
// scoping por usuario. Mantener estable: cambiarlo huérfana fotos viejas.
const FARMOS_PHOTO_PREFIX = 'chagra-operator-photo';

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage;

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
 * @returns {string} data-URL de la foto local, o '' si no hay.
 */
export function getOperatorPhoto() {
  if (!hasStorage()) return '';
  try {
    return window.localStorage.getItem(PHOTO_STORAGE_KEY) || '';
  } catch (e) {
    console.warn('[operatorPhoto] getOperatorPhoto:', e);
    return '';
  }
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
 * @param {string} dataUrl
 */
export function setOperatorPhotoLocal(dataUrl) {
  if (!hasStorage()) return;
  try {
    if (dataUrl) {
      window.localStorage.setItem(PHOTO_STORAGE_KEY, dataUrl);
    } else {
      window.localStorage.removeItem(PHOTO_STORAGE_KEY);
    }
  } catch (e) {
    // QuotaExceeded u otro — no romper la UI; la foto simplemente no persiste.
    console.warn('[operatorPhoto] setOperatorPhotoLocal:', e);
  }
  emitOperatorUpdate(dataUrl || '');
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
    const { sendToFarmOS } = await import('./apiService.js');
    const blob = dataUrlToBlob(dataUrl);
    const filename = `${FARMOS_PHOTO_PREFIX}-${tenantId}-${Date.now()}.jpg`;
    const formData = new FormData();
    formData.append('file', blob, filename);
    const result = await sendToFarmOS('/api/file/upload', formData, 'POST');
    const fileUuid = result?.data?.id;
    if (fileUuid) {
      writeSyncMeta({ fileUuid, filename, syncedAt: Date.now(), tenantId });
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

export const __test = {
  FARMOS_PHOTO_PREFIX,
  latestPhotoEndpoint,
  dataUrlToBlob,
  readSyncMeta,
  writeSyncMeta,
};
