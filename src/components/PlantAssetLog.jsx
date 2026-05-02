import React, { useState, useEffect } from 'react';
import { ArrowLeft, Camera, MapPin } from 'lucide-react';
import { savePayload } from '../services/payloadService';
import { savePhoto } from '../services/photoService';
import GeolocationButton from './GeolocationButton';
import PhotoCaptureField from './PhotoCaptureField';
import DateField from './DateField';

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
    healthStatus: 'Sano',
    recordDate: new Date().toISOString().split('T')[0]
  });
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // No-op cleanup as PhotoCaptureField handles its own previews
  }, []);

  const handleInput = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // handlePhotoCapture removed in favor of PhotoCaptureField

  const handleLocationCapture = (lat, lon) => {
    setLocation({
      lat,
      lon,
      wkt: `POINT (${lon} ${lat})`
    });
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!formData.species || !location) {
      onSave('Completa Especie/Nombre y captura la coordenada', true);
      return;
    }

    setIsSaving(true);
    try {
      let photoRefId = null;
      if (photo) {
        try {
          photoRefId = await savePhoto({
            blob: photo,
            speciesSlug: formData.species
              ? formData.species.toLowerCase().replace(/\s+/g, '_')
              : null,
            meta: {
              capturedAt: new Date().toISOString(),
              // location SIEMPRE truthy aquí — el guard `if (!location) return`
              // de arriba garantiza no llegar a este bloque sin coords. CodeQL
              // #29 flagged `location ? {...} : null` como useless conditional.
              gps: { lat: location.lat, lon: location.lon },
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
          type: "asset--plant",
          attributes: {
            name: `${formData.species} - ${formData.variety || 'N/A'}`,
            status: "active",
            timestamp: `${formData.recordDate}T00:00:00+00:00`,
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

      setFormData({
        assetType: 'type-1',
        species: '',
        variety: '',
        healthStatus: 'Sano',
        recordDate: new Date().toISOString().split('T')[0]
      });
      setPhoto(null);
      setLocation(null);
    } catch (error) {
      console.error('Error en PlantAssetLog handleSave:', error);
      onSave('Error al guardar activo', true);
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
        <h2 className="text-3xl font-bold truncate">Mapear Planta</h2>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-6 pb-24">
        {/* Hero foto — primer paso del flujo (DR-030 QW3) */}
        <PhotoCaptureField
          label="Foto de la planta"
          value={photo}
          onPhoto={(blob) => setPhoto(blob)}
          onRemove={() => setPhoto(null)}
        />

        <DateField
          label="Fecha de registro"
          value={formData.recordDate}
          onChange={(val) => setFormData(p => ({ ...p, recordDate: val }))}
          required
        />

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
          <GeolocationButton
            onCoords={handleLocationCapture}
            label={location ? "Cambiar ubicación" : "Capturar Coordenada"}
          />
          {location && (
            <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl mt-2 text-sm overflow-x-auto text-yellow-300">
              <p className="font-mono whitespace-nowrap">{location.wkt}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          aria-busy={isSaving}
          className="mt-4 p-6 rounded-xl bg-purple-600 active:bg-purple-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-purple-800 disabled:opacity-60 disabled:active:bg-purple-600"
        >
          {isSaving ? 'Guardando…' : 'Guardar Activo'}
        </button>
      </div>
    </div>
  );
}
