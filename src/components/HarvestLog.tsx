import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { savePayload } from '../services/payloadService';

interface HarvestLogProps {
  onBack: () => void;
  onSave: (message: string, isError?: boolean) => void;
}

interface SubArea {
  id: string;
  name: string;
  suggest: string;
}

const MOCK_AREAS = [
  { id: 'area-1', name: 'Invernadero Principal' },
  { id: 'area-2', name: 'Lote Fresa Zona 1' },
  { id: 'area-3', name: 'Lote Mora Norte' },
];

const MOCK_SUB_AREAS: Record<string, SubArea[]> = {
  'area-1': [
    { id: 'sub-1-1', name: 'Cama 1 - Tomate', suggest: 'Tomate Chonto' },
    { id: 'sub-1-2', name: 'Cama 2 - Pimiento', suggest: 'Pimiento Rojo' },
  ],
  'area-2': [
    { id: 'sub-2-1', name: 'Sector Norte', suggest: 'Fresa Monterrey' },
    { id: 'sub-2-2', name: 'Sector Sur', suggest: 'Fresa Albión' },
  ],
  'area-3': [
    { id: 'sub-3-1', name: 'Borde', suggest: 'Mora Castilla' },
    { id: 'sub-3-2', name: 'Interior', suggest: 'Mora Sin Espinas' },
  ],
};

interface FormState {
  date: string;
  mainArea: string;
  subArea: string;
  product: string;
  quantity: string;
  unit: string;
  notes: string;
}

export default function HarvestLog({ onBack, onSave }: HarvestLogProps) {
  const [formData, setFormData] = useState<FormState>({
    date: new Date().toISOString().split('T')[0] ?? '',
    mainArea: '',
    subArea: '',
    product: '',
    quantity: '',
    unit: 'Kilogramos',
    notes: '',
  });

  const handleInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next: FormState = { ...prev, [name]: value };
      if (name === 'mainArea') {
        next.subArea = '';
        next.product = '';
      }
      if (name === 'subArea') {
        const subs = MOCK_SUB_AREAS[next.mainArea] || [];
        const selected = subs.find((s) => s.id === value);
        if (selected) next.product = selected.suggest;
      }
      return next;
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.subArea || !formData.quantity || !formData.product) {
        onSave('Completa Sub-área, Producto y Cantidad', true);
        return;
      }

      const payload = {
        data: {
          type: 'log--harvest',
          attributes: {
            name: `Cosecha de ${formData.product}`,
            timestamp: new Date(formData.date).toISOString().split('.')[0] + '+00:00',
            status: 'done',
            notes: formData.notes || '',
          },
          relationships: {
            asset: {
              data: [{ type: 'asset--plant', id: formData.subArea }],
            },
            quantity: {
              data: [
                {
                  type: 'quantity--standard',
                  attributes: {
                    measure: 'weight',
                    value: { decimal: String(formData.quantity) },
                    label: formData.unit,
                  },
                },
              ],
            },
          },
        },
      };

      const result = await savePayload('harvest', payload);
      onSave(result.message || 'Registro guardado localmente (Pendiente de sincronización)', !result.success);

      setFormData((prev) => ({ ...prev, quantity: '', notes: '' }));
      setTimeout(() => onBack(), 500);
    } catch (error) {
      console.error('Error en HarvestLog handleSave:', error);
      onSave('Error al guardar registro', true);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
      <header className="p-4 sticky top-0 bg-slate-950 border-b border-slate-800 flex items-center gap-4 z-10 shrink-0 shadow-md">
        <button onClick={onBack} aria-label="Volver" className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[56px] min-w-[56px] flex justify-center items-center shrink-0">
          <ArrowLeft size={32} aria-hidden="true" />
        </button>
        <h2 className="text-3xl font-bold truncate">Cosechar</h2>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-6 pb-24">
        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Fecha</span>
          <input type="date" name="date" value={formData.date} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Área Principal</span>
          <select name="mainArea" value={formData.mainArea} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
            <option value="">-- Seleccionar --</option>
            {MOCK_AREAS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>

        {formData.mainArea && (
          <label className="flex flex-col gap-2">
            <span className="text-xl font-bold">Segmento / Sub-área</span>
            <select name="subArea" value={formData.subArea} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
              <option value="">-- Seleccionar --</option>
              {MOCK_SUB_AREAS[formData.mainArea]?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Producto</span>
          <input type="text" name="product" value={formData.product} onChange={handleInput} placeholder="Ej: Fresa Monterrey" className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] placeholder-slate-500" />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xl font-bold">Cantidad</span>
            <input type="number" step="0.01" name="quantity" value={formData.quantity} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" placeholder="0.00" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xl font-bold">Unidad</span>
            <select name="unit" value={formData.unit} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[64px] appearance-none">
              <option value="Kilogramos">Kilogramos</option>
              <option value="Gramos">Gramos</option>
              <option value="Unidades">Unidades</option>
              <option value="Manojos">Manojos</option>
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Observaciones (Opcional)</span>
          <textarea name="notes" rows={3} value={formData.notes} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[80px] placeholder-slate-500" placeholder="Ej: Fruta de tamaño pequeño o picada..." />
        </label>

        <button onClick={handleSave} className="mt-4 p-6 rounded-xl bg-orange-600 active:bg-orange-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-orange-800">
          Guardar Cosecha
        </button>
      </div>
    </div>
  );
}
