/* eslint-disable react-hooks/set-state-in-effect --
 * El hook hace async fetch desde IndexedDB (photoService.getPhotoUrl /
 * getPhotoById) y necesita seteear state tras cada await. Es el patrón
 * "fetch + setState in effect" estándar; sin alternativa razonable salvo
 * useReducer (overkill aquí) o suspense (no aplicable a IndexedDB sync).
 * El alive flag previene memory leaks por unmount durante el await.
 */
import { useEffect, useState } from 'react';
import { getPhotoUrl, getPhotoById } from '../services/photoService';

/**
 * usePhotoUrl — Hook que envuelve photoService para resolver URLs de foto
 * desde React. Maneja el ciclo Blob ObjectURL + revoke automático al
 * desmontar o cambiar parámetros.
 *
 * Tres modos de uso:
 *   - { assetId, speciesSlug }: resuelve la mejor foto disponible (4-tier
 *     fallback definido en photoService.getPhotoUrl).
 *   - { speciesSlug }: usa solo el catálogo / placeholder (útil para
 *     SpeciesSelect cuando aún no hay asset creado).
 *   - { photoId }: trae UNA foto específica de media_cache por id (usado
 *     por AssetTimeline para renderizar PHOTO_ATTACHMENT markers).
 *
 * Retorna { url, source, loading } donde source es 'user' | 'catalog'
 * | 'placeholder' | 'specific' (cuando vino de photoId).
 */
export function usePhotoUrl({ assetId, speciesSlug, photoId } = {}) {
  const [state, setState] = useState({
    url: null,
    source: null,
    loading: true,
  });

  useEffect(() => {
    let alive = true;
    let revokeFn = null;
    setState((s) => ({ ...s, loading: true }));

    const run = async () => {
      try {
        if (photoId != null) {
          const result = await getPhotoById(photoId);
          if (!alive) {
            result?.revoke?.();
            return;
          }
          if (result) {
            revokeFn = result.revoke;
            setState({ url: result.url, source: 'specific', loading: false });
          } else {
            setState({ url: null, source: 'missing', loading: false });
          }
          return;
        }

        const result = await getPhotoUrl({ assetId, speciesSlug });
        if (!alive) {
          result?.revoke?.();
          return;
        }
        revokeFn = result.revoke || null;
        setState({ url: result.url, source: result.source, loading: false });
      } catch (err) {
        if (alive) {
          console.warn('[usePhotoUrl] Error:', err?.message || err);
          setState({ url: null, source: 'error', loading: false });
        }
      }
    };

    run();

    return () => {
      alive = false;
      if (revokeFn) revokeFn();
    };
  }, [assetId, speciesSlug, photoId]);

  return state;
}

export default usePhotoUrl;
