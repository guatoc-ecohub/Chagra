import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, AlertCircle, TrendingUp, CheckCircle } from 'lucide-react';
import DateField from './DateField';
import { savePayload } from '../services/payloadService';
import { logCache } from '../db/logCache';

// Bug 069.10 — sanity caps para evitar typos absurdos (ej. "100kg" → 100000)
// que rompan analítica downstream sin que el operador lo note.
const MAX_QTY_KG = 50000;     // 50 toneladas en una sola cosecha → ya implausible
const MAX_QTY_UNITS = 1000000; // 1 millón de unidades / huevos / manojos
const MIN_PRODUCT_LEN = 2;

// Autopilot #7 (2026-05-03): mediana de cosechas pasadas como sugerencia
// de cantidad. Reduce friction en cosechas repetitivas (fresa cada semana,
// huevo diario) sin imponer, operador siempre puede sobreescribir.
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
  const [syncedOffline, setSyncedOffline] = useState(false);
  const [view, setView] = useState('form'); // 'form' | 'success'
  const [touched, setTouched] = useState({});

  // Bug 069.10 — validación inline (subArea, product, quantity, date)
  const errors = useMemo(() => {
    const e = {};
    const today = new Date().toISOString().split('T')[0];
    if (!formData.subArea) e.subArea = 'Selecciona el sub-área';
    if (!formData.product.trim()) e.product = 'Indica el producto';
    else if (formData.product.trim().length < MIN_PRODUCT_LEN) e.product = `Mínimo ${MIN_PRODUCT_LEN} caracteres`;
    const qty = Number(formData.quantity);
    const cap = formData.unit === 'Gramos' ? MAX_QTY_KG * 1000
              : formData.unit === 'Kilogramos' ? MAX_QTY_KG
              : MAX_QTY_UNITS;
    if (formData.quantity === '' || formData.quantity === null) e.quantity = 'Indica la cantidad';
    else if (!Number.isFinite(qty)) e.quantity = 'Cantidad inválida';
    else if (qty <= 0) e.quantity = 'Debe ser mayor que cero';
    else if (qty > cap) e.quantity = `Máximo ${cap.toLocaleString()} ${formData.unit.toLowerCase()}`;
    if (!formData.date) e.date = 'Indica la fecha';
    else if (formData.date > today) e.date = 'La fecha no puede ser futura';
    return e;
  }, [formData]);

  const hasErrors = Object.keys(errors).length > 0;
  const markTouched = (field) => setTouched((t) => ({ ...t, [field]: true }));

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
    // Bug 069.10 — re-validar antes de enviar
    if (hasErrors) {
      setTouched({ subArea: true, product: true, quantity: true, date: true });
      onSave('Revisa los campos marcados', true);
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
      const isOfflineFallback = (result.message || '').toLowerCase().includes('local');
      setSyncedOffline(isOfflineFallback);
      onSave(result.message || 'Registro guardado localmente (Pendiente de sincronización)', !result.success);

      setFormData(prev => ({ ...prev, quantity: '', notes: '' }));
      setView('success');
      setTimeout(() => {
        setView('form');
        onBack();
      }, 1500);
    } catch (error) {
      console.error('Error en HarvestLog handleSave:', error);
      onSave('Error al guardar registro', true);
    } finally {
      setIsSaving(false);
    }
  };

  if (view === 'success') {
    return (
      <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col p-6 items-center justify-center gap-6">
        <div className="text-center animate-in fade-in zoom-in duration-300">
          <CheckCircle size={64} className="text-emerald-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold">Cosecha registrada</h3>
          <p className="text-sm text-slate-400 mt-2">
            {syncedOffline ? (
              <>Se sincronizará con FarmOS cuando haya conexión. Mientras tanto, lo encuentra en <strong className="text-slate-200">Bitácora → Recientes</strong>.</>
            ) : (
              <>Sincronizado con FarmOS.</>
            )}
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {syncedOffline && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'historial' } }))}
              className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-2"
            >
              Ver en Bitácora
            </button>
          )}
          <button
            onClick={() => { setView('form'); setSyncedOffline(false); }}
            className="p-4 rounded-xl bg-orange-700 hover:bg-orange-600 text-white font-bold flex items-center justify-center gap-2"
          >
            Nueva Cosecha
          </button>
        </div>
      </div>
    );
  }

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
          onChange={(val) => { setFormData(p => ({ ...p, date: val })); markTouched('date'); }}
          required
        />
        {touched.date && errors.date && (
          <p className="text-sm text-red-400 -mt-4 flex items-center gap-1.5">
            <AlertCircle size={14} aria-hidden="true" /> {errors.date}
          </p>
        )}

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
            <select
              name="subArea"
              value={formData.subArea}
              onChange={handleInput}
              onBlur={() => markTouched('subArea')}
              aria-invalid={touched.subArea && !!errors.subArea}
              className={`p-4 rounded-xl bg-slate-900 border text-2xl text-white min-h-[64px] appearance-none ${
                touched.subArea && errors.subArea ? 'border-red-700' : 'border-slate-700'
              }`}
            >
              <option value="">-- Seleccionar --</option>
              {MOCK_SUB_AREAS[formData.mainArea]?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {touched.subArea && errors.subArea && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <AlertCircle size={14} aria-hidden="true" /> {errors.subArea}
              </p>
            )}
          </label>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Producto</span>
          <input
            type="text"
            name="product"
            value={formData.product}
            onChange={handleInput}
            onBlur={() => markTouched('product')}
            aria-invalid={touched.product && !!errors.product}
            placeholder="Ej: Fresa Monterrey"
            className={`p-4 rounded-xl bg-slate-900 border text-2xl text-white min-h-[64px] placeholder-slate-500 ${
              touched.product && errors.product ? 'border-red-700' : 'border-slate-700'
            }`}
          />
          {touched.product && errors.product && (
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <AlertCircle size={14} aria-hidden="true" /> {errors.product}
            </p>
          )}
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xl font-bold">Cantidad</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="quantity"
              value={formData.quantity}
              onChange={handleInput}
              onBlur={() => markTouched('quantity')}
              aria-invalid={touched.quantity && !!errors.quantity}
              className={`p-4 rounded-xl bg-slate-900 border text-2xl text-white min-h-[64px] ${
                touched.quantity && errors.quantity ? 'border-red-700' : 'border-slate-700'
              }`}
              placeholder="0.00"
            />
            {touched.quantity && errors.quantity && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <AlertCircle size={14} aria-hidden="true" /> {errors.quantity}
              </p>
            )}
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
          disabled={isSaving || hasErrors}
          aria-busy={isSaving}
          aria-disabled={hasErrors || undefined}
          title={hasErrors ? 'Completa los campos correctamente' : undefined}
          className="mt-4 p-6 rounded-xl bg-orange-600 active:bg-orange-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-orange-800 disabled:opacity-60 disabled:active:bg-orange-600 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Guardando…' : 'Guardar Cosecha'}
        </button>
      </div>
    </div>
  );
}
