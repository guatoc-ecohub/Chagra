import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import DateField from './DateField';
import { savePayload } from '../services/payloadService';
import { logCache } from '../db/logCache';

// Autopilot #7 (2026-05-03): mediana de cosechas pasadas como sugerencia
// de cantidad. Reduce friction en cosechas repetitivas (fresa cada semana,
// huevo diario) sin imponer — operador siempre puede sobreescribir.
function median(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Normaliza el nombre del producto para matching fuzzy (lowercase + sin tildes).
function normProduct(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

async function computeMedianForProduct(productName) {
  if (!productName || productName.trim().length < 3) return null;
  try {
    const allHarvests = await logCache.getByType('log--harvest');
    const target = normProduct(productName);
    const matching = allHarvests.filter((log) => {
      const name = log.name || log.attributes?.name || '';
      return normProduct(name).includes(target);
    });
    if (matching.length === 0) return null;
    const quantities = matching
      .map((log) => {
        const qty = log.quantity?.[0] || log.attributes?.quantity?.[0];
        const val = parseFloat(qty?.value?.decimal ?? qty?.value);
        return Number.isFinite(val) ? val : null;
      })
      .filter((v) => v !== null && v > 0);
    if (quantities.length === 0) return null;
    return { median: median(quantities), count: quantities.length };
  } catch (err) {
    console.warn('[HarvestLog] median lookup failed:', err);
    return null;
  }
}

const MOCK_AREAS = [
  { id: 'area-1', name: 'Invernadero Principal' },
  { id: 'area-2', name: 'Lote Fresa Zona 1' },
  { id: 'area-3', name: 'Lote Mora Norte' },
];

const MOCK_SUB_AREAS = {
  'area-1': [
    { id: 'sub-1-1', name: 'Cama 1 - Tomate', suggest: 'Tomate Chonto' },
    { id: 'sub-1-2', name: 'Cama 2 - Pimiento', suggest: 'Pimiento Rojo' }
  ],
  'area-2': [
    { id: 'sub-2-1', name: 'Sector Norte', suggest: 'Fresa Monterrey' },
    { id: 'sub-2-2', name: 'Sector Sur', suggest: 'Fresa Albión' }
  ],
  'area-3': [
    { id: 'sub-3-1', name: 'Borde', suggest: 'Mora Castilla' },
    { id: 'sub-3-2', name: 'Interior', suggest: 'Mora Sin Espinas' }
  ]
};

export default function HarvestLog({ onBack, onSave }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mainArea: '',
    subArea: '',
    product: '',
    quantity: '',
    unit: 'Kilogramos',
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [medianHint, setMedianHint] = useState(null); // { median, count } | null

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'mainArea') {
        next.subArea = '';
        next.product = '';
      }
      if (name === 'subArea') {
        const subs = MOCK_SUB_AREAS[next.mainArea] || [];
        const selected = subs.find(s => s.id === value);
        if (selected) next.product = selected.suggest;
      }
      return next;
    });
  };

  // Lookup mediana cuando product cambia. Sugerencia, no override forzoso —
  // solo pre-fillea quantity si el operador NO ha escrito nada todavía.
  useEffect(() => {
    let alive = true;
    if (!formData.product) {
      setMedianHint(null);
      return;
    }
    computeMedianForProduct(formData.product).then((result) => {
      if (!alive) return;
      setMedianHint(result);
      if (result && !formData.quantity) {
        setFormData((prev) => ({ ...prev, quantity: String(result.median) }));
      }
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intencional: no incluir formData.quantity para evitar loop (sólo queremos disparar al cambiar product, no en cada keystroke de cantidad)
  }, [formData.product]);

  const handleSave = async () => {
    if (isSaving) return;
    if (!formData.subArea || !formData.quantity || !formData.product) {
      onSave('Completa Sub-área, Producto y Cantidad', true);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        data: {
          type: "log--harvest",
          attributes: {
            name: `Cosecha de ${formData.product}`,
            timestamp: new Date(formData.date).toISOString().split('.')[0] + '+00:00',
            status: "done",
            notes: formData.notes || ""
          },
          relationships: {
            asset: {
              data: [{ type: "asset--plant", id: formData.subArea }]
            },
            quantity: {
              data: [{
                type: "quantity--standard",
                attributes: {
                  measure: "weight",
                  value: { decimal: String(formData.quantity) },
                  label: formData.unit
                }
              }]
            }
          }
        }
      };

      const result = await savePayload('harvest', payload);
      onSave(result.message || 'Registro guardado localmente (Pendiente de sincronización)', !result.success);

      setFormData(prev => ({ ...prev, quantity: '', notes: '' }));
      setTimeout(() => onBack(), 500);
    } catch (error) {
      console.error('Error en HarvestLog handleSave:', error);
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
        <h2 className="text-3xl font-bold truncate">Cosechar</h2>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-6 pb-24">
        <DateField
          label="Fecha"
          value={formData.date}
          onChange={(val) => setFormData(p => ({ ...p, date: val }))}
          required
        />

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Área Principal</span>
          <select name="mainArea" value={formData.mainArea} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
            <option value="">-- Seleccionar --</option>
            {MOCK_AREAS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>

        {formData.mainArea && (
          <label className="flex flex-col gap-2">
            <span className="text-xl font-bold">Segmento / Sub-área</span>
            <select name="subArea" value={formData.subArea} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
              <option value="">-- Seleccionar --</option>
              {MOCK_SUB_AREAS[formData.mainArea]?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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
            {medianHint && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 px-1">
                <TrendingUp size={12} />
                Mediana de {medianHint.count} cosecha{medianHint.count > 1 ? 's' : ''} pasada{medianHint.count > 1 ? 's' : ''}: {medianHint.median} {formData.unit.toLowerCase()}
              </span>
            )}
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
          <textarea name="notes" rows="3" value={formData.notes} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[80px] placeholder-slate-500" placeholder="Ej: Fruta de tamaño pequeño o picada..." />
        </label>

        <button
          onClick={handleSave}
          disabled={isSaving}
          aria-busy={isSaving}
          className="mt-4 p-6 rounded-xl bg-orange-600 active:bg-orange-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-orange-800 disabled:opacity-60 disabled:active:bg-orange-600"
        >
          {isSaving ? 'Guardando…' : 'Guardar Cosecha'}
        </button>
      </div>
    </div>
  );
}
