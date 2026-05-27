import React, { useState, useRef } from 'react';
import { ArrowLeft, Camera, Image as ImageIcon } from 'lucide-react';
import DateField from './DateField';
import { syncManager } from '../services/syncManager';
import { compressImage, IMAGE_TOO_LARGE_MESSAGE } from '../utils/imageCompress';

function MaintenanceScreen({ onBack, onSave }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    maintenanceType: 'routine',
    description: '',
    duration: '',
    cost: ''
  });
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const handleInput = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Pre-compresión cliente-lado (operador 2026-05-27): 1600 px / JPEG 0.85
    // → fallback 0.7 → reject > 2 MB.
    const compressed = await compressImage(file);
    if (!compressed.ok) {
      if (compressed.reason === 'too_large') {
        window.dispatchEvent(new CustomEvent('chagraToast', {
          detail: { message: IMAGE_TOO_LARGE_MESSAGE },
        }));
      }
      if (e.target) e.target.value = '';
      return;
    }
    setPhoto(compressed.blob);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(compressed.blob));
    if (e.target) e.target.value = '';
  };

  const handleSave = async () => {
    try {
      if (!formData.maintenanceType || !formData.description) {
        onSave('Completa tipo de mantenimiento y descripcion', true);
        return;
      }

      const payload = {
        data: {
          type: "log--maintenance",
          attributes: {
            name: `Mantenimiento: ${formData.maintenanceType}`,
            timestamp: new Date(formData.date).toISOString().split('.')[0] + '+00:00',
            status: "done",
            notes: formData.notes || "",
            description: formData.description,
            duration: formData.duration,
            cost: formData.cost
          }
        }
      };

      // Guardar en IndexedDB usando syncManager
      await syncManager.saveTransaction({
        type: 'maintenance',
        payload: { ...payload, endpoint: '/api/log/maintenance' }
      });

      onSave('Registro guardado localmente (Pendiente de sincronización)', false);

      // Reset partial state and navigate back
      setFormData({
        date: new Date().toISOString().split('T')[0],
        maintenanceType: 'routine',
        description: '',
        duration: '',
        cost: ''
      });
      setPhoto(null);
      setPhotoUrl(null);
      setTimeout(() => onBack(), 500); // Pequeño delay para feedback visual
    } catch (error) {
      console.error('Error en MaintenanceScreen handleSave:', error);
      onSave('Error al guardar registro', true);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
      <header className="p-4 sticky top-0 bg-slate-950 border-b border-slate-800 flex items-center gap-4 z-10 shrink-0 shadow-md">
        <button onClick={onBack} className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[56px] min-w-[56px] flex justify-center items-center shrink-0">
          <ArrowLeft size={32} />
        </button>
        <h2 className="text-3xl font-bold">Mantenimiento</h2>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-6 pb-24">
        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Tipo de Mantenimiento</span>
          <select name="maintenanceType" value={formData.maintenanceType} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
            <option value="routine">Rutinario</option>
            <option value="preventive">Preventivo</option>
            <option value="corrective">Correctivo</option>
            <option value="emergency">Emergencia</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Descripcion</span>
          <textarea name="description" value={formData.description} onChange={handleInput} rows="4" className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[80px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Duracion</span>
          <input type="text" name="duration" value={formData.duration} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" placeholder="Ej: 2 horas" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Costo</span>
          <input type="text" name="cost" value={formData.cost} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" placeholder="Ej: $5000" />
        </label>

        <DateField
          label="Fecha"
          value={formData.date}
          onChange={(val) => setFormData(p => ({ ...p, date: val }))}
          required
        />

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Notas</span>
          <textarea name="notes" value={formData.notes} onChange={handleInput} rows="2" className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[80px]" />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xl font-bold">Foto</span>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
          <input ref={galleryInputRef} type="file" accept="image/*" onChange={handlePhotoCapture} className="hidden" />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="p-4 rounded-xl text-lg font-bold flex justify-center items-center gap-2 shadow-md min-h-[80px] bg-emerald-900/40 border-2 border-emerald-700/60 text-emerald-100 active:bg-emerald-800/60"
            >
              <Camera size={28} />
              <span>Tomar foto</span>
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
          {photo && (
            <p className="text-sm text-emerald-300">Foto lista ({Math.round(photo.size / 1024)} KB).</p>
          )}
        </div>

        <button onClick={handleSave} className="mt-4 p-6 rounded-xl bg-slate-600 active:bg-slate-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-slate-800">
          Guardar Mantenimiento
        </button>
      </div>
    </div>
  );
}

export default MaintenanceScreen;