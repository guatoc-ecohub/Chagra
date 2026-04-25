import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Camera, MapPin } from 'lucide-react';
import { savePayload } from '../services/payloadService';

export default function SeedingLog({ onBack, onSave, initialData = {} }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    crop: initialData.crop || '', // String para UI legacy o label
    plant_type: initialData.plant_type || null, // ADR-019: { type: 'taxonomy_term--plant_type', id: '...' }
    variety: initialData.variety || '',
    quantity: initialData.quantity || ''
  });
  const [photo, setPhoto] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [coordinates, setCoordinates] = useState(initialData.coordinates ? [initialData.coordinates] : []);
  const [notes, setNotes] = useState(initialData.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const watchIdRef = useRef(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleInput = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
          { enableHighAccuracy: true }
        );
      }
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!formData.crop || !formData.quantity) {
      onSave('Completa Cultivo y Cantidad', true);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        data: {
          type: "log--seeding",
          attributes: {
            name: `Siembra de ${formData.crop} - ${formData.variety || 'N/A'}`,
            timestamp: new Date(formData.date).toISOString().split('.')[0] + '+00:00',
            status: "done",
            _localPhotoName: photo ? photo.name : null,
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
      setCoordinates([]);
      setTimeout(() => onBack(), 500);
    } catch (error) {
      console.error('Error en SeedingLog handleSave:', error);
      onSave('Error al guardar registro', true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
      <header className="p-4 sticky top-0 bg-slate-950 border-b border-slate-800 flex items-center gap-4 z-10 shrink-0 shadow-md">
        <button onClick={onBack} aria-label="Volver" className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[56px] min-w-[56px] flex justify-center items-center shrink-0">
          <ArrowLeft size={32} aria-hidden="true" />
        </button>
        <h2 className="text-3xl font-bold truncate">Sembrar</h2>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-6 pb-24">
        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Fecha</span>
          <input type="date" name="date" value={formData.date} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Cultivo</span>
          <input type="text" name="crop" placeholder="Ej: Fresa" value={formData.crop} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white placeholder-slate-500 min-h-[64px]" />
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
          <input type="number" name="quantity" min="1" value={formData.quantity} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xl font-bold">Evidencia Fotográfica</span>
          <label className="flex items-center justify-center gap-3 p-6 rounded-xl bg-slate-900 border-2 border-dashed border-slate-600 active:bg-slate-800 text-2xl cursor-pointer min-h-[80px]">
            <Camera size={36} />
            <span className="truncate">{photo ? photo.name : 'Tomar Foto'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={e => setPhoto(e.target.files[0])} className="hidden" />
          </label>
        </div>

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
          disabled={isSaving}
          aria-busy={isSaving}
          className="mt-4 p-6 rounded-xl bg-green-600 active:bg-green-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-green-800 disabled:opacity-60 disabled:active:bg-green-600"
        >
          {isSaving ? 'Guardando…' : 'Guardar Registro'}
        </button>
      </div>
    </div>
  );
}
