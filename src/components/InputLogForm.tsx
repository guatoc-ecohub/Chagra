import { useState, useEffect } from 'react';
import { Droplets, Send, Info } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import { MATERIAL_PRESETS, UNIT_OPTIONS } from '../config/materials';

/**
 * InputLogForm — Registro de aplicación de bio-insumos.
 */
interface InputLogFormProps {
  assetId: string;
  onComplete?: () => void;
}

interface FormState {
  material: string;
  value: string;
  unit: string;
  notes: string;
}

const DEFAULT_PRESET = MATERIAL_PRESETS[0]!;

export const InputLogForm: React.FC<InputLogFormProps> = ({ assetId, onComplete }) => {
  const addInputLog = useAssetStore((state) => state.addInputLog);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<FormState>({
    material: DEFAULT_PRESET.name,
    value: '',
    unit: DEFAULT_PRESET.unit,
    notes: '',
  });

  const currentMaterial = formData.material;
  useEffect(() => {
    const selected = MATERIAL_PRESETS.find((m) => m.name === currentMaterial);
    if (selected) {
      setFormData((prev) =>
        prev.unit === selected.unit ? prev : { ...prev, unit: selected.unit }
      );
    }
  }, [currentMaterial]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assetId || !formData.value) return;

    setLoading(true);
    try {
      await addInputLog(assetId, {
        name: `Aplicación de ${formData.material}`,
        label: 'Cantidad aplicada',
        value: formData.value,
        unit: formData.unit,
        notes: formData.notes,
      });
      setFormData((prev) => ({ ...prev, value: '', notes: '' }));
      if (onComplete) onComplete();
    } catch (err) {
      console.error('[InputLogForm] Error registrando insumo:', err);
      window.dispatchEvent(
        new CustomEvent('syncError', {
          detail: { message: 'Error registrando aplicación de insumo.' },
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedInfo = MATERIAL_PRESETS.find((m) => m.name === formData.material);

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-slate-900/50 rounded-xl border border-slate-700 space-y-4"
    >
      <div className="flex items-center gap-2 text-blue-400">
        <Droplets size={20} />
        <h3 className="font-bold text-sm uppercase tracking-wider">Registro de Aplicación</h3>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 font-bold uppercase">
            Biopreparado / Insumo
          </label>
          <select
            value={formData.material}
            onChange={(e) => setFormData({ ...formData, material: e.target.value })}
            className="bg-slate-800 border border-slate-700 rounded-lg text-sm p-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none"
          >
            {MATERIAL_PRESETS.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
          {selectedInfo && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1 px-1 mt-1">
              <Info size={10} className="shrink-0" />
              <span>{selectedInfo.desc}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase">Cantidad</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="bg-slate-800 border border-slate-700 rounded-lg text-sm p-2.5 text-white outline-none focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase">Unidad</label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="bg-slate-800 border border-slate-700 rounded-lg text-sm p-2.5 text-white outline-none"
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 font-bold uppercase">
            Observaciones Técnicas
          </label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="bg-slate-800 border border-slate-700 rounded-lg text-sm p-2.5 text-white resize-none outline-none focus:border-blue-500"
            placeholder="Dosis, clima, método de aplicación…"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !formData.value}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
      >
        {loading ? (
          <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" />
        ) : (
          <Send size={18} />
        )}
        {loading ? 'Sincronizando Offline…' : 'Registrar en Bitácora'}
      </button>
    </form>
  );
};

export default InputLogForm;
