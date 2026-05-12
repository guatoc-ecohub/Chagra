import React, { useState } from 'react';
import { Sprout, CheckCircle } from 'lucide-react';
import useAssetStore from '../../store/useAssetStore';
import { getSpeciesByIdSync } from '../../db/catalogDB';

const ESCALA_LABELS = {
  apartment: '1 a 10 plantas (balcon/apto)',
  small_farm: '10 a 100 plantas (huerto kecil)',
  farm: '100 a 1000 plantas (finca)',
  commercial: '1000 a 10000 plantas (comercial)',
};

const TIPO_ESPACIO_LABELS = {
  apartment: 'Balcon o apartamento',
  small_farm: 'Huerto pequeno',
  farm: 'Finca',
  commercial: 'Produccion comercial',
};

const TEXTURA_LABELS = {
  arena: 'Arena',
  arcilla: 'Arcilla',
  limo: 'Limo',
  mezcla: 'Mezcla',
};

const MO_LABELS = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
};

export default function SummaryStep({ data, onComplete }) {
  const addAsset = useAssetStore((s) => s.addAsset);
const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const selectedSpeciesData = (data.selectedSpecies || [])
    .map((id) => getSpeciesByIdSync(id))
    .filter(Boolean);

  const handleCreateFirstPlant = async () => {
    if (selectedSpeciesData.length === 0) {
      onComplete();
      return;
    }
    setCreating(true);
    try {
      const primarySpecies = selectedSpeciesData[0];
      // eslint-disable-next-line react-hooks/purity
      const timestamp = Date.now();
      const asset = {
        id: `onboarding-${timestamp}`,
        name: primarySpecies.nombre_comun || primarySpecies.id,
        asset_type: 'plant',
        attributes: {
          name: primarySpecies.nombre_comun || primarySpecies.id,
          species_slug: primarySpecies.id,
          notes: `Configuracion inicial. Escala: ${data.tipo_espacio}. Suelo pH: ${data.soil.ph || 'no registrado'}, textura: ${data.soil.textura || 'no registrada'}, MO: ${data.soil.materia_organica || 'no registrada'}.`,
        },
        relationships: {},
        _createdAt: timestamp,
      };
      await addAsset('plant', asset);
      setCreated(true);
      setTimeout(() => onComplete(), 1500);
    } catch (err) {
      console.error('[SummaryStep] Fallo al crear planta:', err);
      setCreating(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-white">Resumen de configuracion</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Tu configuracion inicial esta lista. Puedes ajustar estos datos
          mas adelante desde Ajustes.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <SummaryCard title="Escala">
          <p className="text-sm font-bold text-white">{ESCALA_LABELS[data.escala] || data.escala}</p>
          <p className="text-xs text-slate-500">Tipo de espacio: {TIPO_ESPACIO_LABELS[data.tipo_espacio] || data.tipo_espacio}</p>
        </SummaryCard>

        <SummaryCard title="Analisis de suelo">
          {data.soil.ph ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-white">pH: {data.soil.ph}</p>
              <p className="text-xs text-slate-500">
                Textura: {TEXTURA_LABELS[data.soil.textura] || data.soil.textura} | MO: {MO_LABELS[data.soil.materia_organica] || data.soil.materia_organica}
              </p>
              {data.soil.notas && (
                <p className="text-xs text-slate-400 mt-1">Notas: {data.soil.notas}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No registrado. Puedes agregarlo despues desde el perfil.</p>
          )}
        </SummaryCard>

        <SummaryCard title={`Especies seleccionadas (${selectedSpeciesData.length})`}>
          {selectedSpeciesData.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {selectedSpeciesData.map((sp) => (
                <div key={sp.id} className="flex items-center gap-2">
                  <Sprout size={14} className="text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">{sp.nombre_comun || sp.id}</p>
                    {sp.nombre_cientifico && (
                      <p className="text-[10px] text-slate-500 italic">{sp.nombre_cientifico}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Ninguna especie seleccionada.</p>
          )}
        </SummaryCard>
      </div>

      <div className="flex flex-col gap-3 mt-2">
        {created ? (
          <div className="p-4 rounded-xl bg-emerald-900/30 border border-emerald-700/50 flex items-center gap-3 min-h-[64px]">
            <CheckCircle size={24} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-black text-emerald-300">Primera planta creada</p>
              <p className="text-xs text-emerald-400/70">Redirigiendo al dashboard...</p>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={handleCreateFirstPlant}
              disabled={creating}
              className="w-full p-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black flex items-center justify-center gap-2 min-h-[56px] transition-all disabled:opacity-60"
            >
              {creating ? 'Creando...' : 'Crear mi primera planta'}
              <Sprout size={20} />
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="w-full p-3 text-center text-sm text-slate-500 hover:text-slate-400 transition-colors min-h-[44px]"
            >
              Omitir por ahora
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, children }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}