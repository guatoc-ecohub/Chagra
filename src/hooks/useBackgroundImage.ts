/**
 * useBackgroundImage — Hook para obtener una imagen de fondo configurable
 * desde FarmOS, con cache offline en IndexedDB (store sync_meta).
 */
import { useEffect, useState } from 'react';
import { fetchFromFarmOS } from '../services/apiService';
import { openDB, STORES } from '../db/dbCore';

const CACHE_TTL_MS = 10 * 60 * 1000;

interface CachedRecord {
  key?: string;
  blob?: Blob;
  filename?: string;
  fileUuid?: string;
  mimeType?: string;
  cachedAt?: number;
}

interface WriteRecord {
  blob: Blob;
  filename?: string | undefined;
  fileUuid: string;
  mimeType: string;
  cachedAt: number;
}

interface QueryResult {
  url: string;
  filename?: string | undefined;
  fileUuid: string;
}

interface BackgroundImageState {
  url: string | null;
  loading: boolean;
  error: string | null;
}

const readCache = async (prefix: string): Promise<CachedRecord | null> => {
  try {
    const db = await openDB();
    return await new Promise<CachedRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_META, 'readonly');
      const req = tx.objectStore(STORES.SYNC_META).get(`bg_${prefix}`);
      req.onsuccess = () => resolve((req.result as CachedRecord | undefined) || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[useBackgroundImage] readCache error:', err);
    return null;
  }
};

const writeCache = async (prefix: string, record: WriteRecord): Promise<void> => {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_META, 'readwrite');
      tx.objectStore(STORES.SYNC_META).put({ key: `bg_${prefix}`, ...record });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[useBackgroundImage] writeCache error:', err);
  }
};

interface FileResourceAttributes {
  filename?: string;
  uri?: { url?: string; value?: string };
  [key: string]: unknown;
}

interface FileResource {
  id: string;
  attributes?: FileResourceAttributes;
}

const queryLatestFile = async (prefix: string): Promise<QueryResult | null> => {
  const endpoint =
    `/api/file/file` +
    `?filter[filename][operator]=CONTAINS` +
    `&filter[filename][value]=${encodeURIComponent(prefix)}` +
    `&sort=-created` +
    `&page[limit]=1`;

  const response = (await fetchFromFarmOS(endpoint)) as { data?: FileResource[] };
  const items = response?.data || [];
  if (items.length === 0) return null;

  const file = items[0];
  if (!file) return null;
  const attrs = file.attributes || {};
  const uri = attrs.uri?.url || attrs.uri?.value;
  if (!uri) return null;

  const base = import.meta.env.VITE_FARMOS_URL || '';
  const fullUrl = uri.startsWith('http') ? uri : `${base}${uri}`;

  return { url: fullUrl, filename: attrs.filename, fileUuid: file.id };
};

const downloadBlob = async (url: string): Promise<Blob> => {
  const { getAccessToken } = await import('../services/authService');
  const token = await getAccessToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
};

export const useBackgroundImage = (prefix: string | null | undefined): BackgroundImageState => {
  const [state, setState] = useState<BackgroundImageState>({
    url: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!prefix) return undefined;
    let cancelled = false;
    let objectUrl: string | null = null;

    const serveFromCache = async (): Promise<CachedRecord | null> => {
      const cached = await readCache(prefix);
      if (cached?.blob && !cancelled) {
        objectUrl = URL.createObjectURL(cached.blob);
        setState({ url: objectUrl, loading: false, error: null });
        return cached;
      }
      return null;
    };

    const revalidate = async (cached: CachedRecord | null): Promise<void> => {
      if (!navigator.onLine) return;
      try {
        const latest = await queryLatestFile(prefix);
        if (!latest || cancelled) return;

        const fresh =
          cached?.fileUuid === latest.fileUuid &&
          cached?.cachedAt !== undefined &&
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

        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl, loading: false, error: null });
      } catch (err) {
        const message = (err as Error).message;
        console.warn(`[useBackgroundImage] revalidate failed for ${prefix}:`, message);
        if (!cancelled) {
          setState((s) => (s.url ? s : { ...s, loading: false, error: message }));
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
  }, [prefix]);

  return state;
};

export default useBackgroundImage;
