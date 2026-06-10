import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { captureAndCompress, savePhoto, getPhotoById } from '../services/photoService';
import { attachPhotoToCycle } from '../services/photoCycleService';
import { getFarmEvents } from '../db/farmProcessCache';
import PhotoViewer from './PhotoViewer';

/**
 * CicloFotos — fotos atadas a un ciclo (FarmProcess). Cablea photoCycleService
 * (antes huérfano): captura una foto, la guarda en media_cache (photoService),
 * y la asocia al ciclo (attachPhotoToCycle → evento photo_attached). Muestra las
 * fotos del ciclo en miniatura + PhotoViewer (cinema-mode) al tocar.
 *
 * NOTA: el análisis de visión EN VIVO está deshabilitado por límite de VRAM
 * (M6000 12GB — el bench de visión falla con "kv cache"). La foto se adjunta
 * como evidencia con visionResult vacío; cuando la GPU lo permita, se conecta
 * recognizeSpeciesGrounded/analyzeFoliage acá.
 */
export default function CicloFotos({ processId }) {
  const inputRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const events = (await getFarmEvents(processId)) || [];
      const photoEvents = events.filter((e) => e?.attributes?.event_type === 'photo_attached');
      const out = [];
      for (const ev of photoEvents) {
        const hash = ev?.attributes?.payload?.image_hash;
        if (!hash) continue;
        const p = await getPhotoById(hash);
        if (p?.url) out.push({ hash, url: p.url, revoke: p.revoke });
      }
      setPhotos((prev) => { prev.forEach((p) => p.revoke?.()); return out; });
    } catch (e) { console.warn('[CicloFotos] load:', e.message); }
  }, [processId]);

  useEffect(() => {
    load();
    return () => setPhotos((prev) => { prev.forEach((p) => p.revoke?.()); return []; });
  }, [load]);

  const handlePick = useCallback(async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const { blob } = await captureAndCompress(file);
      const photoId = await savePhoto({ blob, meta: {} });
      await attachPhotoToCycle({
        processId,
        imageHash: String(photoId),
        visionResult: { diagnosis: null, confidence: 0, is_out_of_domain: false },
        actor: 'operator',
      });
      await load();
    } catch (e2) { setErr(`No se pudo agregar la foto: ${e2.message}`); }
    finally { setBusy(false); }
  }, [processId, load]);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xs uppercase font-bold text-slate-500">Fotos del ciclo</h2>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="text-xs font-bold text-lime-400 px-2.5 py-1.5 rounded-lg border border-lime-800/60 flex items-center gap-1 disabled:opacity-50"
        >
          <Camera size={13} /> {busy ? 'Subiendo…' : 'Agregar foto'}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handlePick} aria-label="Agregar foto al ciclo" />
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {photos.map((p) => (
            <button key={p.hash} type="button" onClick={() => setViewing(p.url)} className="aspect-square rounded-lg overflow-hidden border border-slate-800">
              <img src={p.url} alt="Foto del ciclo" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {photos.length === 0 && !err && (
        <p className="text-xs text-slate-500">Aún no hay fotos. Toma una para dejar registro del cultivo.</p>
      )}
      {err && <p className="text-xs text-amber-400 mt-1">{err}</p>}
      {viewing && (
        <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center" onClick={() => setViewing(null)}>
          <button type="button" className="absolute top-4 right-4 text-white z-10" onClick={() => setViewing(null)} aria-label="Cerrar foto"><X size={24} /></button>
          <PhotoViewer src={viewing} alt="Foto del ciclo" />
        </div>
      )}
    </section>
  );
}
