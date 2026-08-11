import React, { useCallback, useEffect, useState } from 'react';
import { Images, X, Camera } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import { listRecentUserPhotos } from '../services/photoService';

function revokePhotos(photos) {
  photos.forEach((photo) => photo.revoke?.());
}

/**
 * Visor local de fotos relevantes del compai.
 * Solo lee media_cache. Cuando no hay una foto propia lo dice claramente en
 * vez de rellenar la lámina con una imagen ajena.
 */
export default function CompaiFotosOverlay({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [pantalla, setPantalla] = useState(null);
  const plants = useAssetStore((state) => state.plants);

  const close = useCallback(() => {
    setOpen(false);
    setPhotos((current) => {
      revokePhotos(current);
      return [];
    });
  }, []);

  useEffect(() => {
    const onOpen = async (event) => {
      const nextPantalla = event.detail?.pantalla || null;
      setPantalla(nextPantalla);
      setOpen(true);
      const assetIds = new Set((plants || []).map((plant) => String(plant.id)).filter(Boolean));
      const speciesSlugs = new Set((plants || [])
        .map((plant) => plant.attributes?._speciesSlug || plant.attributes?.species_slug)
        .filter(Boolean));
      const next = await listRecentUserPhotos({ assetIds, speciesSlugs, limit: 12 });
      setPhotos((current) => {
        revokePhotos(current);
        return next;
      });
    };
    window.addEventListener('chagra:compai-fotos', onOpen);
    return () => window.removeEventListener('chagra:compai-fotos', onOpen);
  }, [plants]);

  useEffect(() => () => revokePhotos(photos), [photos]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center bg-slate-950/70 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compai-fotos-titulo"
      data-testid="compai-fotos-overlay"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar fotos" onClick={close} />
      <section className="relative max-h-[86dvh] w-full max-w-2xl overflow-auto rounded-[28px] border border-emerald-300/20 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
              <Images size={15} aria-hidden="true" /> Fotos de su finca
            </p>
            <h2 id="compai-fotos-titulo" className="mt-1 text-xl font-bold text-white">Lo que ya tiene guardado</h2>
            {pantalla && <p className="mt-1 text-sm text-slate-400">Relevantes para {pantalla.replaceAll('_', ' ')}.</p>}
          </div>
          <button type="button" onClick={close} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Cerrar fotos">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {photos.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <figure key={photo.id} className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
                <img src={photo.url} alt={photo.alt || 'Foto guardada de la finca'} className="aspect-square w-full object-cover" loading="lazy" />
                <figcaption className="truncate px-3 py-2 text-xs text-slate-400">{photo.label || 'Foto de la finca'}</figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-5 text-center">
            <p className="text-sm leading-relaxed text-slate-300">Todavía no hay fotos propias guardadas para mostrar aquí.</p>
            <button
              type="button"
              onClick={() => { close(); onNavigate?.('agente', { autoOpenCamera: true, desdePantalla: pantalla, spatialContext: { pantalla } }); }}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-500 px-4 text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              <Camera size={17} aria-hidden="true" /> Tomar una foto
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

