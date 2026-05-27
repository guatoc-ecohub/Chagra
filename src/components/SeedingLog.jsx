import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, AlertCircle, Camera, Image as ImageIcon, MapPin, CheckCircle } from 'lucide-react';
import { savePayload } from '../services/payloadService';
import { captureAndCompress, savePhoto } from '../services/photoService';
import { compressImage, IMAGE_TOO_LARGE_MESSAGE } from '../utils/imageCompress';
import { sanitizeBlobUrl } from '../utils/blobUrl';
import DateField from './DateField';

// Bug 069.10 — validación client-side: límites razonables para evitar
// payloads inválidos sincronizándose con FarmOS.
const MAX_QUANTITY = 100000; // sanity cap: 100k plántulas en una siembra es ya raro
const MIN_CROP_LEN = 2;

export default function SeedingLog({ onBack, onSave, initialData = {} }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    crop: initialData.crop || '', // String para UI legacy o label
    plant_type: initialData.plant_type || null, // ADR-019: { type: 'taxonomy_term--plant_type', id: '...' }
    variety: initialData.variety || '',
    quantity: initialData.quantity || ''
  });
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [coordinates, setCoordinates] = useState(initialData.coordinates ? [initialData.coordinates] : []);
  const [notes, setNotes] = useState(initialData.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [syncedOffline, setSyncedOffline] = useState(false);
  const [view, setView] = useState('form');
  const [touched, setTouched] = useState({});
  const watchIdRef = useRef(null);

  // Bug 069.10 — validación inline (no bloquea submit existente, pero deshabilita el botón
  // y muestra errores para que el operador corrija antes de guardar).
  const errors = useMemo(() => {
    const e = {};
    const today = new Date().toISOString().split('T')[0];
    if (!formData.crop.trim()) e.crop = 'Indica el cultivo';
    else if (formData.crop.trim().length < MIN_CROP_LEN) e.crop = `Mínimo ${MIN_CROP_LEN} caracteres`;
    const qty = Number(formData.quantity);
    if (formData.quantity === '' || formData.quantity === null) e.quantity = 'Indica la cantidad';
    else if (!Number.isFinite(qty)) e.quantity = 'Cantidad inválida';
    else if (qty <= 0) e.quantity = 'Debe ser mayor que cero';
    else if (qty > MAX_QUANTITY) e.quantity = `Máximo ${MAX_QUANTITY.toLocaleString()} plántulas`;
    if (!formData.date) e.date = 'Indica la fecha';
    else if (formData.date > today) e.date = 'La fecha no puede ser futura';
    return e;
  }, [formData]);

  const hasErrors = Object.keys(errors).length > 0;
  const markTouched = (field) => setTouched((t) => ({ ...t, [field]: true }));

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const handleInput = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onSave('Archivo no es una imagen válida', true);
      return;
    }
    try {
      // Pre-compresión cliente-lado (operador 2026-05-27): 1600 px / JPEG 0.85
      // → fallback 0.7 → reject > 2 MB.
      const preCompressed = await compressImage(file);
      if (!preCompressed.ok) {
        if (preCompressed.reason === 'too_large') {
          window.dispatchEvent(new CustomEvent('chagraToast', {
            detail: { message: IMAGE_TOO_LARGE_MESSAGE },
          }));
        } else {
          onSave('Error procesando foto', true);
        }
        return;
      }
      const { blob } = await captureAndCompress(preCompressed.blob);
      setPhoto(blob);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error('Error comprimir foto:', err);
      onSave('Error procesando foto', true);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsRecording(false);
    } else {
      setCoordinates([]);
      setIsRecording(true);
      if ("geolocation" in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => setCoordinates(prev => [...prev, [pos.coords.longitude, pos.coords.latitude]]),
          (err) => console.error(err),
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          }
        );
      }
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    // Bug 069.10 — re-validar antes de enviar; marca todos los campos como touched
    // para que los errores se vean si el operador llegó acá con el botón deshabilitado vencido.
    if (hasErrors) {
      setTouched({ crop: true, quantity: true, date: true });
      onSave('Revisa los campos marcados', true);
      return;
    }

    setIsSaving(true);
    try {
      let photoRefId = null;
      if (photo) {
        try {
          photoRefId = await savePhoto({
            blob: photo,
            speciesSlug: formData.crop
              ? formData.crop.toLowerCase().replace(/\s+/g, '_')
              : null,
            meta: {
              capturedAt: new Date().toISOString(),
              gps: coordinates.length > 0
                ? { lat: coordinates[0][1], lon: coordinates[0][0] }
                : null,
            },
          });
        } catch (err) {
          console.error('Error guardar foto en media_cache:', err);
          onSave('Foto no se pudo guardar localmente', true);
          setIsSaving(false);
          return;
        }
      }

      const payload = {
        _photoRefId: photoRefId,
        data: {
          type: "log--seeding",
          attributes: {
            name: `Siembra de ${formData.crop} - ${formData.variety || 'N/A'}`,
            timestamp: new Date(formData.date).toISOString().split('.')[0] + '+00:00',
            status: "done",
            ...(coordinates.length >= 3 ? {
              geometry: {
                type: "Polygon",
                coordinates: [[...coordinates, coordinates[0]]]
              }
            } : {})
          },
          relationships: {
            quantity: {
              data: [{
                type: "quantity--standard",
                attributes: {
                  measure: "count",
                  value: { decimal: String(formData.quantity) },
                  label: "Plántulas"
                }
              }]
            },
            plant_type: formData.plant_type ? { data: formData.plant_type } : undefined
          }
        }
      };

      if (notes) payload.data.attributes.notes = { value: notes, format: 'plain_text' };

      const result = await savePayload('seeding', payload);
      onSave(result.message || 'Registro guardado localmente (Pendiente de sincronización)', !result.success);

      setFormData({ date: new Date().toISOString().split('T')[0], crop: '', variety: '', quantity: '' });
      setPhoto(null);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoUrl(null);
      setCoordinates([]);
      setTimeout(() => onBack(), 500);
    } catch (error) {
      console.error('Error en SeedingLog handleSave:', error);
      onSave('Error al guardar registro', true);
    } finally {
      setIsSaving(false);
    }
  };

  if (view === 'success') {
    return (
      <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col p-6 items-center justify-center gap-6">
        <div className="text-center animate-in fade-in zoom-in duration-300">
          <CheckCircle size={64} className="text-emerald-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold">Registro guardado</h3>
          <p className="text-sm text-slate-400 mt-2">
            {syncedOffline ? (
              <>Se sincronizará con FarmOS cuando haya conexión. Mientras tanto, lo encuentra en <strong className="text-slate-200">Bitácora → Recientes</strong>.</>
            ) : (
              <>Sincronizado con FarmOS.</>
            )}
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {syncedOffline && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'historial' } }))}
              className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-2"
            >
              Ver en Bitácora
            </button>
          )}
          <button
            onClick={() => { setView('form'); setSyncedOffline(false); }}
            className="p-4 rounded-xl bg-lime-700 hover:bg-lime-600 text-white font-bold flex items-center justify-center gap-2"
          >
            Nueva Siembra
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
      <header className="p-4 sticky top-0 bg-slate-950 border-b border-slate-800 flex items-center gap-4 z-10 shrink-0 shadow-md">
        <button onClick={onBack} aria-label="Volver" className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[56px] min-w-[56px] flex justify-center items-center shrink-0">
          <ArrowLeft size={32} aria-hidden="true" />
        </button>
        <h2 className="text-3xl font-bold truncate">Sembrar</h2>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-6 pb-24">
        {/* Hero foto, primer paso del flujo (DR-030 QW3) */}
        <div className="flex flex-col gap-2">
          <span className="text-xl font-bold">Foto de la planta</span>
          {/* Dual capture (2026-05-27): cámara con capture="environment" +
              galería. La preview vive arriba; los botones abajo. */}
          {sanitizeBlobUrl(photoUrl) && (
            <div className="relative w-full h-40 rounded-xl overflow-hidden border-2 border-slate-700">
              <img src={sanitizeBlobUrl(photoUrl)} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
          <input ref={galleryInputRef} type="file" accept="image/*" onChange={handlePhotoCapture} className="hidden" />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="p-4 rounded-xl text-lg font-bold flex justify-center items-center gap-2 shadow-md min-h-[80px] bg-emerald-900/40 border-2 border-emerald-700/60 text-emerald-100 active:bg-emerald-800/60"
            >
              <Camera size={28} />
              <span>{photo ? 'Cambiar' : 'Tomar foto'}</span>
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="p-4 rounded-xl text-lg font-bold flex justify-center items-center gap-2 shadow-md min-h-[80px] bg-slate-800 border-2 border-slate-600 active:bg-slate-700"
            >
              <ImageIcon size={28} />
              <span>Subir desde galería</span>
            </button>
          </div>
        </div>

        <DateField
          label="Fecha"
          value={formData.date}
          onChange={(val) => { setFormData(p => ({ ...p, date: val })); markTouched('date'); }}
          required
        />
        {touched.date && errors.date && (
          <p className="text-sm text-red-400 -mt-4 flex items-center gap-1.5">
            <AlertCircle size={14} aria-hidden="true" /> {errors.date}
          </p>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Cultivo</span>
          <input
            type="text"
            name="crop"
            placeholder="Ej: Fresa"
            value={formData.crop}
            onChange={handleInput}
            onBlur={() => markTouched('crop')}
            aria-invalid={touched.crop && !!errors.crop}
            className={`p-4 rounded-xl bg-slate-900 border text-2xl text-white placeholder-slate-500 min-h-[64px] ${
              touched.crop && errors.crop ? 'border-red-700' : 'border-slate-700'
            }`}
          />
          {touched.crop && errors.crop && (
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <AlertCircle size={14} aria-hidden="true" /> {errors.crop}
            </p>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Variedad</span>
          <input type="text" name="variety" value={formData.variety} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Notas</span>
          <textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[80px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Cantidad de Plántulas</span>
          <input
            type="number"
            name="quantity"
            min="1"
            max={MAX_QUANTITY}
            step="1"
            value={formData.quantity}
            onChange={handleInput}
            onBlur={() => markTouched('quantity')}
            aria-invalid={touched.quantity && !!errors.quantity}
            className={`p-4 rounded-xl bg-slate-900 border text-2xl text-white min-h-[64px] ${
              touched.quantity && errors.quantity ? 'border-red-700' : 'border-slate-700'
            }`}
          />
          {touched.quantity && errors.quantity && (
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <AlertCircle size={14} aria-hidden="true" /> {errors.quantity}
            </p>
          )}
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xl font-bold">Mapeo Geoespacial</span>
          <button onClick={toggleRecording} className={`p-5 rounded-xl text-2xl font-bold flex justify-center items-center gap-3 shadow-md min-h-[80px] ${isRecording ? 'bg-red-600 text-white border-b-4 border-red-800' : 'bg-slate-800 border-2 border-slate-600'}`}>
            <MapPin size={32} />
            {isRecording ? 'Detener Trazado' : 'Definir Área'}
          </button>
          {isRecording && <div className="text-yellow-400 font-bold text-xl text-center animate-pulse mt-2">Grabando ruta... {coordinates.length} puntos registrados</div>}
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || hasErrors}
          aria-busy={isSaving}
          aria-disabled={hasErrors || undefined}
          title={hasErrors ? 'Completa los campos correctamente' : undefined}
          className="mt-4 p-6 rounded-xl bg-green-600 active:bg-green-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-green-800 disabled:opacity-60 disabled:active:bg-green-600 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Guardando…' : 'Guardar Registro'}
        </button>
      </div>
    </div>
  );
}
