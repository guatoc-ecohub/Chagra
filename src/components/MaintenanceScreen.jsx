import React, { useState } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import { syncManager } from '../services/syncManager';

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

  const handleInput = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoUrl(URL.createObjectURL(file));
    }
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

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Fecha</span>
          <input type="date" name="date" value={formData.date} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Notas</span>
          <textarea name="notes" value={formData.notes} onChange={handleInput} rows="2" className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[80px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Foto</span>
          <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
          <button onClick={() => document.querySelector('input[type="file"]').click()} className="p-5 rounded-xl text-2xl font-bold flex justify-center items-center gap-3 shadow-md min-h-[80px] bg-slate-800 border-2 border-slate-600 active:bg-slate-700">
            <Camera size={32} />
            <span>{photo ? photo.name.substring(0, 15) + '...' : 'Capturar Foto'}</span>
          </button>
        </label>

        <button onClick={handleSave} className="mt-4 p-6 rounded-xl bg-slate-600 active:bg-slate-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-slate-800">
          Guardar Mantenimiento
        </button>
      </div>
    </div>
  );
}

export default MaintenanceScreen;