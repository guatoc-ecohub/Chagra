import React, { useState } from 'react';
import { ArrowLeft, Droplets } from 'lucide-react';
import DateField from './DateField';
import { savePayload } from '../services/payloadService';
import { FARM_CONFIG } from '../config/defaults';
import { fincaVivaHomePerfilActivo } from '../config/fincaVivaHomeFlag';
import RegistroShell from './registro/RegistroShell';
import { SelectField, NumberField, TextAreaField } from './registro/RegistroFields';

const INPUT_MATERIALS = [
  { id: 'mat-bio', name: 'Bioactivador Lácteo' },
  { id: 'mat-lombri', name: 'Lombricompost' },
  { id: 'mat-agua', name: 'Agua de Riego' },
  { id: 'mat-galli', name: 'Gallinaza' }
];

const defaultLocation = {
  id: FARM_CONFIG.LOCATION_ID,
  name: FARM_CONFIG.FARM_NAME
};

const REAL_LAND_ASSETS = [defaultLocation];

const APPLICATION_METHODS = [
  "Foliar", "Drench/Al suelo", "Inoculación de semillas", "Incorporación"
];

/**
 * Formulario legacy para registrar aplicaciones de insumos agrícolas.
 * Permite seleccionar ubicación, tipo de insumo, método de aplicación,
 * cantidad y notas. Guarda mediante el servicio de payloads con soporte
 * offline-first.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {() => void} props.onBack - Callback para volver a la pantalla anterior.
 * @param {(mensaje: string, esError: boolean) => void} props.onSave - Callback invocado tras guardar: onSave(mensaje, esError).
 */
export default function InputLog({ onBack, onSave }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    locationId: FARM_CONFIG.LOCATION_ID,
    materialId: '',
    method: 'Foliar',
    quantity: '',
    unit: 'Litros',
    notes: ''
  });

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      if (!formData.locationId || !formData.materialId || !formData.quantity) {
        onSave('Completa Ubicación, Tipo de Insumo y Cantidad', true);
        return;
      }

      const materialName = INPUT_MATERIALS.find(m => m.id === formData.materialId)?.name;
      const inventoryValue = -Math.abs(parseFloat(formData.quantity));

      const payload = {
        data: {
          type: "log--input",
          attributes: {
            name: `Aplicación de ${materialName}`,
            timestamp: new Date(formData.date).toISOString().split('.')[0] + '+00:00',
            status: "done",
            notes: `${formData.notes}\nMétodo: ${formData.method}`.trim()
          },
          relationships: {
            location: {
              data: [{ type: "asset--land", id: formData.locationId }]
            },
            category: {
              data: [{
                type: "taxonomy_term--material",
                attributes: { name: materialName }
              }]
            },
            quantity: {
              data: [{
                type: "quantity--standard",
                attributes: {
                  measure: formData.unit === "Litros" || formData.unit === "Mililitros" ? "volume" : "weight",
                  value: { decimal: String(inventoryValue) },
                  label: `Extracción (${formData.unit})`
                }
              }]
            }
          }
        }
      };

      const result = await savePayload('input', payload);
      onSave(result.message || 'Registro guardado localmente (Pendiente de sincronización)', !result.success);

      setFormData(prev => ({ ...prev, quantity: '', notes: '' }));
      setTimeout(() => onBack(), 500);
    } catch (error) {
      console.error('Error en InputLog handleSave:', error);
      onSave('Error al guardar registro', true);
    }
  };

  // ── REDISEÑO (gated): caparazón Chagra theme-aware ──────────────────────
  if (fincaVivaHomePerfilActivo()) {
    return (
      <RegistroShell
        title="Abonos e insumos"
        subtitle="Qué le echaste a la finca y cuánto gastaste"
        Icon={Droplets}
        onBack={onBack}
        footer={
          <button onClick={handleSave} className="registro-cta">
            Registrar aplicación
          </button>
        }
      >
        <div className="registro-tip">
          <Droplets size={18} className="registro-tip__icon" aria-hidden="true" />
          <span>Anota cada aplicación de abono, biopreparado o riego. Así controlas la bodega y sabes qué le funciona a cada lote.</span>
        </div>

        <DateField
          label="¿Qué día aplicaste?"
          value={formData.date}
          onChange={(val) => setFormData(p => ({ ...p, date: val }))}
          required
        />

        <SelectField
          label="Ubicación o lote"
          name="locationId"
          value={formData.locationId}
          onChange={handleInput}
          options={REAL_LAND_ASSETS.map(a => ({ value: a.id, label: a.name }))}
        />

        <SelectField
          label="¿Qué aplicaste?"
          name="materialId"
          value={formData.materialId}
          onChange={handleInput}
          placeholder="-- Escoge el insumo --"
          options={INPUT_MATERIALS.map(m => ({ value: m.id, label: m.name }))}
        />

        <SelectField
          label="¿Cómo lo aplicaste?"
          name="method"
          value={formData.method}
          onChange={handleInput}
          options={APPLICATION_METHODS.map(m => ({ value: m, label: m }))}
        />

        <div className="grid grid-cols-2 gap-3">
          {/* @ts-expect-error NumberField doesn't expose placeholder in its props type */}
          <NumberField
            label="Cantidad"
            step="0.01"
            name="quantity"
            value={formData.quantity}
            onChange={handleInput}
            placeholder="0.00"
          />
          <SelectField
            label="Unidad"
            name="unit"
            value={formData.unit}
            onChange={handleInput}
            options={[
              { value: 'Litros', label: 'Litros' },
              { value: 'Kilogramos', label: 'Kilogramos' },
            ]}
          />
        </div>

        {/* @ts-expect-error TextAreaField doesn't expose placeholder in its props type */}
        <TextAreaField
          label="Notas"
          hint="opcional"
          name="notes"
          rows={3}
          value={formData.notes}
          onChange={handleInput}
          placeholder="Ej: el suelo estaba seco, dosis baja…"
        />
      </RegistroShell>
    );
  }

  // ── LEGACY (flag OFF): markup 0.1 sin cambios visuales ──────────────────
  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
      <header className="p-4 sticky top-0 bg-slate-950 border-b border-slate-800 flex items-center gap-4 z-10 shrink-0 shadow-md">
        <button onClick={onBack} aria-label="Volver" className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[56px] min-w-[56px] flex justify-center items-center shrink-0">
          <ArrowLeft size={32} aria-hidden="true" />
        </button>
        <h2 className="text-3xl font-bold truncate">Insumos</h2>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-6 pb-24">
        <DateField
          label="Fecha de Aplicación"
          value={formData.date}
          onChange={(val) => setFormData(p => ({ ...p, date: val }))}
          required
        />

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Ubicación / Polígono</span>
          <select name="locationId" value={formData.locationId} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
            {REAL_LAND_ASSETS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Tipo de Insumo</span>
          <select name="materialId" value={formData.materialId} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[64px] appearance-none">
            <option value="">-- Seleccionar --</option>
            {INPUT_MATERIALS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Método de Aplicación</span>
          <select name="method" value={formData.method} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[64px] appearance-none">
            {APPLICATION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xl font-bold">Cantidad</span>
            <input type="number" step="0.01" name="quantity" value={formData.quantity} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" placeholder="0.00" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xl font-bold">Unidad</span>
            <select name="unit" value={formData.unit} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[64px] appearance-none">
              <option value="Litros">Litros</option>
              <option value="Kilogramos">Kilogramos</option>
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Notas Adicionales</span>
          <textarea name="notes" rows={3} value={formData.notes} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[80px]" placeholder="Ej: Observaciones sobre el estado del suelo..." />
        </label>

        <button onClick={handleSave} className="mt-4 p-6 rounded-xl bg-blue-600 active:bg-blue-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-blue-800">
          Registrar Aplicación
        </button>
      </div>
    </div>
  );
}
