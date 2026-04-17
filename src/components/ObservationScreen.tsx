import { useState } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import { syncManager } from '../services/syncManager';

interface ObservationScreenProps {
  onBack: () => void;
  onSave: (message: string, isError?: boolean) => void;
}

interface FormState {
  date: string;
  observationType: string;
  description: string;
  locationId: string;
  severity: string;
  notes?: string;
}

export default function ObservationScreen({ onBack, onSave }: ObservationScreenProps) {
  const [formData, setFormData] = useState<FormState>({
    date: new Date().toISOString().split('T')[0] ?? '',
    observationType: 'general',
    description: '',
    locationId: '',
    severity: 'info',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const handleInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoUrl(URL.createObjectURL(file));
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (!formData.description || !formData.locationId) {
        onSave('Completa descripcion y ubicacion', true);
        return;
      }

      const payload = {
        data: {
          type: 'log--observation',
          attributes: {
            name: formData.description,
            timestamp: new Date(formData.date).toISOString().split('.')[0] + '+00:00',
            status: 'done',
            notes: formData.notes || '',
            severity: formData.severity,
          },
          relationships: {
            location: {
              data: [{ type: 'asset--land', id: formData.locationId }],
            },
          },
        },
      };

      await syncManager.saveTransaction({
        type: 'observation',
        payload: { ...payload, endpoint: '/api/log/observation' },
      });

      onSave('Registro guardado localmente (Pendiente de sincronización)', false);

      setFormData({
        date: new Date().toISOString().split('T')[0] ?? '',
        observationType: 'general',
        description: '',
        locationId: '',
        severity: 'info',
      });
      setPhoto(null);
      setPhotoUrl(null);
      setTimeout(() => onBack(), 500);
    } catch (error) {
      console.error('Error en ObservationScreen handleSave:', error);
      onSave('Error al guardar registro', true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
      <header className="p-4 sticky top-0 bg-slate-950 border-b border-slate-800 flex items-center gap-4 z-10 shrink-0 shadow-md">
        <button onClick={onBack} className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[56px] min-w-[56px] flex justify-center items-center shrink-0">
          <ArrowLeft size={32} />
        </button>
        <h2 className="text-3xl font-bold">Observacion</h2>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-6 pb-24">
        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Tipo de Observacion</span>
          <select name="observationType" value={formData.observationType} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
            <option value="general">General</option>
            <option value="health">Salud</option>
            <option value="environmental">Ambiental</option>
            <option value="infrastructure">Infraestructura</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Descripcion</span>
          <textarea name="description" value={formData.description} onChange={handleInput} rows={4} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[80px]" placeholder="Describe la observacion..." />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Severidad</span>
          <select name="severity" value={formData.severity} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
            <option value="info">Informacion</option>
            <option value="warning">Advertencia</option>
            <option value="error">Error</option>
            <option value="critical">Critico</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Fecha</span>
          <input type="date" name="date" value={formData.date} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Notas Adicionales</span>
          <textarea name="notes" value={formData.notes ?? ''} onChange={handleInput} rows={2} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[80px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Foto</span>
          <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
          <button
            onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement | null)?.click()}
            className="p-5 rounded-xl text-2xl font-bold flex justify-center items-center gap-3 shadow-md min-h-[80px] bg-slate-800 border-2 border-slate-600 active:bg-slate-700"
          >
            <Camera size={32} />
            <span>{photo ? photo.name.substring(0, 15) + '...' : 'Capturar Foto'}</span>
          </button>
        </label>

        <button onClick={handleSave} disabled={isSaving} aria-busy={isSaving} className="mt-4 p-6 rounded-xl bg-purple-600 active:bg-purple-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-purple-800 disabled:opacity-60 disabled:active:bg-purple-600">
          {isSaving ? 'Guardando…' : 'Guardar Observacion'}
        </button>
      </div>
    </div>
  );
}
