/**
 * useBackgroundImage — Hook para obtener una imagen de fondo configurable
 * desde FarmOS, con cache offline en IndexedDB (store sync_meta).
 *
 * Patrón: la imagen de fondo se sube a FarmOS con filename que CONTIENE un
 * prefijo conocido (ej. "chagra-bg-biodiversidad-"). El hook consulta el
 * archivo más reciente con ese patrón, lo descarga como blob y lo sirve
 * como Object URL. En offline o fallo, devuelve null (el consumidor
 * aplica el fallback visual).
 *
 * Uso:
 *   const { url, loading } = useBackgroundImage('chagra-bg-biodiversidad');
 *   <div style={{ backgroundImage: url ? `url(${url})` : undefined }} />
 */
import { useEffect, useState } from 'react';
import { fetchFromFarmOS } from '../services/apiService';
import { openDB, STORES } from '../db/dbCore';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min — revalida tras este intervalo

/**
 * Lee el cache de sync_meta para un prefijo dado.
 */
const readCache = async (prefix) => {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_META, 'readonly');
      const req = tx.objectStore(STORES.SYNC_META).get(`bg_${prefix}`);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[useBackgroundImage] readCache error:', err);
    return null;
  }
};

/**
 * Guarda el blob + metadatos en sync_meta.
 */
const writeCache = async (prefix, record) => {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_META, 'readwrite');
      tx.objectStore(STORES.SYNC_META).put({ key: `bg_${prefix}`, ...record });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[useBackgroundImage] writeCache error:', err);
  }
};

/**
 * Busca en FarmOS el archivo más reciente cuyo filename contenga el prefijo.
 * Devuelve { url, filename, fileUuid } o null si no hay coincidencia.
 */
const queryLatestFile = async (prefix) => {
  const endpoint =
    `/api/file/file` +
    `?filter[filename][operator]=CONTAINS` +
    `&filter[filename][value]=${encodeURIComponent(prefix)}` +
    `&sort=-created` +
    `&page[limit]=1`;

  const response = await fetchFromFarmOS(endpoint);
  const items = response?.data || [];
  if (items.length === 0) return null;

  const file = items[0];
  const attrs = file.attributes || {};
  const uri = attrs.uri?.url || attrs.uri?.value;
  if (!uri) return null;

  const base = import.meta.env.VITE_FARMOS_URL || '';
  const fullUrl = uri.startsWith('http') ? uri : `${base}${uri}`;

  return { url: fullUrl, filename: attrs.filename, fileUuid: file.id };
};

/**
 * Descarga el archivo como blob aplicando el Bearer token.
 */
const downloadBlob = async (url) => {
  const { getAccessToken } = await import('../services/authService');
  const token = await getAccessToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
};

export const useBackgroundImage = (prefix) => {
  const [state, setState] = useState({ url: null, loading: true, error: null });

  useEffect(() => {
    if (!prefix) return undefined;
    let cancelled = false;
    let objectUrl = null;

    const serveFromCache = async () => {
      const cached = await readCache(prefix);
      if (cached?.blob && !cancelled) {
        objectUrl = URL.createObjectURL(cached.blob);
        setState({ url: objectUrl, loading: false, error: null });
        return cached;
      }
      return null;
    };

    const revalidate = async (cached) => {
      if (!navigator.onLine) return;
      try {
        const latest = await queryLatestFile(prefix);
        if (!latest || cancelled) return;

        // Si el UUID coincide con el caché y no expiró el TTL, conservamos.
        const fresh =
          cached?.fileUuid === latest.fileUuid &&
          cached?.cachedAt &&
          Date.now() - cached.cachedAt < CACHE_TTL_MS;
        if (fresh) return;

        const blob = await downloadBlob(latest.url);
        if (cancelled) return;

        await writeCache(prefix, {
          blob,
          filename: latest.filename,
          fileUuid: latest.fileUuid,
          mimeType: blob.type,
          cachedAt: Date.now(),
        });

        // Revocar URL anterior y emitir la nueva.
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl, loading: false, error: null });
      } catch (err) {
        console.warn(`[useBackgroundImage] revalidate failed for ${prefix}:`, err.message);
        if (!cancelled && !state.url) {
          setState((s) => ({ ...s, loading: false, error: err.message }));
        }
      }
    };

    (async () => {
      const cached = await serveFromCache();
      await revalidate(cached);
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix]);

  return state;
};

export default useBackgroundImage;
