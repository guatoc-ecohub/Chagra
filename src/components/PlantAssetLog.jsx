import React, { useState, useEffect } from 'react';
import { ArrowLeft, Camera, MapPin } from 'lucide-react';
import { savePayload } from '../services/payloadService';

const ASSET_TYPES = [
  { id: 'type-1', name: 'Árbol Frutal' },
  { id: 'type-2', name: 'Arbusto' },
  { id: 'type-3', name: 'Sensor IoT' },
  { id: 'type-4', name: 'Estructura' }
];

const HEALTH_STATUSES = [
  "Sano", "En recuperación", "Plaga detectada"
];

export default function PlantAssetLog({ onBack, onSave }) {
  const [formData, setFormData] = useState({
    assetType: 'type-1',
    species: '',
    variety: '',
    healthStatus: 'Sano'
  });
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [location, setLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

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

  const captureLocation = () => {
    setIsLocating(true);
    setLocation(null);

    if (!("geolocation" in navigator)) {
      onSave("Geolocalización no soportada", true);
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          acc: pos.coords.accuracy,
          wkt: `POINT (${pos.coords.longitude} ${pos.coords.latitude})`
        });
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        onSave("Error obteniendo ubicación", true);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSave = async () => {
    if (!formData.species || !location) {
      onSave('Completa Especie/Nombre y captura la coordenada', true);
      return;
    }

    const payload = {
      _multipartFile: photo ? {
        name: photo.name,
        type: photo.type,
        size: photo.size,
        file: photo
      } : null,

      data: {
        type: "asset--plant",
        attributes: {
          name: `${formData.species} - ${formData.variety || 'N/A'}`,
          status: "active",
          intrinsic_geometry: location.wkt,
          notes: `Estado Sanitario: ${formData.healthStatus}`
        },
        relationships: {
          plant_type: {
            data: [{ type: "taxonomy_term--plant_type", id: formData.assetType }]
          },
        }
      }
    };

    const result = await savePayload('plant_asset', payload);
    onSave(result.message, !result.success);

    setFormData({ assetType: 'type-1', species: '', variety: '', healthStatus: 'Sano' });
    setPhoto(null);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    setLocation(null);
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
      <header className="p-4 sticky top-0 bg-slate-950 border-b border-slate-800 flex items-center gap-4 z-10 shrink-0 shadow-md">
        <button onClick={onBack} aria-label="Volver" className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[56px] min-w-[56px] flex justify-center items-center shrink-0">
          <ArrowLeft size={32} aria-hidden="true" />
        </button>
        <h2 className="text-3xl font-bold truncate">Mapear Planta</h2>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-6 pb-24">
        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Tipo de Activo</span>
          <select name="assetType" value={formData.assetType} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
            {ASSET_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Especie / Nombre</span>
          <input type="text" name="species" value={formData.species} onChange={handleInput} placeholder="Ej: Limón Tahití" className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white placeholder-slate-500 min-h-[64px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Variedad (Opcional)</span>
          <input type="text" name="variety" value={formData.variety} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Estado Sanitario Inicial</span>
          <select name="healthStatus" value={formData.healthStatus} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
            {HEALTH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xl font-bold">Coordenadas Exactas (WKT)</span>
          <button onClick={captureLocation} disabled={isLocating} className="p-5 rounded-xl text-2xl font-bold flex justify-center items-center gap-3 shadow-md min-h-[80px] bg-slate-800 border-2 border-slate-600 active:bg-slate-700 disabled:opacity-50">
            <MapPin size={32} />
            {isLocating ? 'Obteniendo GPS...' : 'Capturar Coordenada'}
          </button>
          {location && (
            <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl mt-2 text-sm overflow-x-auto text-yellow-300">
              <p>Precisión: ±{location.acc.toFixed(1)} metros</p>
              <p className="font-mono mt-1 whitespace-nowrap">{location.wkt}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xl font-bold">Fotografía del Activo</span>
          <label className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-slate-900 border-2 border-dashed border-slate-600 active:bg-slate-800 cursor-pointer min-h-[120px] overflow-hidden relative">
            {photoUrl ? (
              <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            ) : null}
            <div className="z-10 flex flex-col items-center gap-2 drop-shadow-md">
              <Camera size={48} />
              <span className="text-xl font-bold">{photo ? 'Cambiar Foto' : 'Tomar Foto'}</span>
            </div>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
          </label>
        </div>

        <button onClick={handleSave} className="mt-4 p-6 rounded-xl bg-purple-600 active:bg-purple-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-purple-800">
          Guardar Activo
        </button>
      </div>
    </div>
  );
}
