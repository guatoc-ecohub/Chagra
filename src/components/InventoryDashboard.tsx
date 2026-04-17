import React, { useState } from 'react';
import { Package, AlertTriangle, Plus, X, Download } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import { UNIT_OPTIONS } from '../config/materials';
import { useConsumptionMetrics } from '../hooks/useConsumptionMetrics';
import { Sparkline } from './charts/Sparkline';
import { exportTraceabilityCsv } from '../services/exportService';
import type { FarmOSEnrichedAsset } from '../types';

/**
 * InventoryDashboard — Bodega de biofábrica (Fase 13.2 / refactor 13.6).
 */

const LOW_THRESHOLD = 5;
const BAR_CAPACITY = 50;

interface MaterialCardProps {
  item: FarmOSEnrichedAsset;
  onRefill: (item: FarmOSEnrichedAsset) => void;
}

const MaterialCard = ({ item, onRefill }: MaterialCardProps) => {
  const name = item.attributes?.name || item.name || 'Insumo sin nombre';
  const stock = parseFloat(String(item.attributes?.inventory_value ?? 0)) || 0;
  const unit = item.attributes?.inventory_unit || 'unidades';
  const isLow = stock < LOW_THRESHOLD;
  const progressPct = Math.min((stock / BAR_CAPACITY) * 100, 100);
  const isPending = item._pending;

  const { values: trend } = useConsumptionMetrics(name, 7);

  return (
    <div
      className={`bg-slate-900 border rounded-2xl p-5 space-y-4 transition-all ${
        isPending ? 'border-dashed border-slate-600 opacity-80' : 'border-slate-800'
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-bold text-slate-200 truncate flex-1">{name}</h3>
        {isLow && (
          <AlertTriangle
            size={18}
            className="text-amber-500 animate-pulse shrink-0"
            aria-label="Stock bajo"
          />
        )}
      </div>

      <div className="flex justify-between items-end gap-3">
        <div className="flex items-end gap-2 min-w-0">
          <span className="text-4xl font-black text-white tabular-nums">
            {stock % 1 === 0 ? stock : stock.toFixed(2)}
          </span>
          <span className="text-slate-500 font-bold mb-1 uppercase text-xs">{unit}</span>
        </div>
        {trend && trend.length >= 2 && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[10px] text-slate-500 uppercase font-bold text-right">
              Consumo 7d
            </span>
            <Sparkline
              data={trend}
              color={isLow ? '#f59e0b' : '#3b82f6'}
              width={72}
              height={22}
              showArea
            />
          </div>
        )}
      </div>

      <div
        className="w-full bg-slate-800 h-2 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={stock}
        aria-valuemin={0}
        aria-valuemax={BAR_CAPACITY}
      >
        <div
          className={`h-full transition-all ${isLow ? 'bg-amber-500' : 'bg-blue-500'}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => onRefill(item)}
        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors min-h-[40px]"
      >
        <Plus size={16} /> Abastecer
      </button>
    </div>
  );
};

export const InventoryDashboard = () => {
  const materialsRaw = useAssetStore((s) => s.materials);
  const materials = materialsRaw as unknown as FarmOSEnrichedAsset[];
  const refillMaterial = useAssetStore((s) => s.refillMaterial);

  const [refillTarget, setRefillTarget] = useState<FarmOSEnrichedAsset | null>(null);
  const [refillAmount, setRefillAmount] = useState<string>('');
  const [refillUnit, setRefillUnit] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await exportTraceabilityCsv();
      console.info(
        `[Export] Reporte generado: ${result.rowCount} registros (${result.pendingCount} pendientes de sync).`
      );
    } catch (err) {
      console.error('[Export] Error generando CSV:', err);
      window.dispatchEvent(new CustomEvent('syncError', {
        detail: { message: 'No se pudo generar el reporte CSV.' },
      }));
    } finally {
      setExporting(false);
    }
  };

  const openRefillModal = (material: FarmOSEnrichedAsset) => {
    setRefillTarget(material);
    setRefillAmount('');
    setRefillUnit(String(material.attributes?.inventory_unit ?? material.unit ?? 'kg'));
  };

  const closeRefillModal = () => {
    setRefillTarget(null);
    setRefillAmount('');
    setRefillUnit('');
  };

  const submitRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refillTarget || !refillAmount) return;
    const amount = parseFloat(refillAmount);
    if (!amount || amount <= 0) return;

    setSubmitting(true);
    try {
      await refillMaterial(refillTarget.id, amount, refillUnit);
      closeRefillModal();
    } catch (err) {
      console.error('[InventoryDashboard] Error en refill:', err);
      window.dispatchEvent(new CustomEvent('syncError', {
        detail: { message: 'No se pudo abastecer el insumo. Verifique el almacenamiento.' },
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 pb-20 space-y-6">
      <header className="flex justify-between items-center gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 min-w-0">
          <Package className="text-blue-400 shrink-0" /> Biofábrica / Bodega
        </h1>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-500 hidden sm:inline">
            {materials.length} {materials.length === 1 ? 'insumo' : 'insumos'}
          </span>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors min-h-[40px]"
            aria-label="Exportar reporte CSV"
          >
            {exporting ? (
              <div className="animate-spin h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full" />
            ) : (
              <Download size={14} />
            )}
            <span className="hidden sm:inline">
              {exporting ? 'Generando…' : 'Exportar CSV'}
            </span>
          </button>
        </div>
      </header>

      {materials.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <Package size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay insumos registrados en bodega.</p>
          <p className="text-xs mt-1 opacity-70">
            Agrega un material desde el panel de Activos para comenzar a trackear el inventario.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((item) => (
            <MaterialCard key={item.id} item={item} onRefill={openRefillModal} />
          ))}
        </div>
      )}

      {/* Modal de abastecimiento */}
      {refillTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closeRefillModal}
        >
          <form
            onSubmit={submitRefill}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Registrar Producción</h3>
                <p className="text-xs text-slate-400 mt-1 truncate">
                  {refillTarget.attributes?.name || refillTarget.name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeRefillModal}
                className="p-2 hover:bg-slate-800 rounded-full text-slate-400"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="text-xs text-slate-500 bg-slate-800/50 p-3 rounded-lg">
              Stock actual:{' '}
              <span className="text-slate-200 font-bold tabular-nums">
                {parseFloat(String(refillTarget.attributes?.inventory_value ?? 0)) || 0}
              </span>{' '}
              {refillTarget.attributes?.inventory_unit || 'unidades'}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Cantidad producida</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  autoFocus
                  value={refillAmount}
                  onChange={(e) => setRefillAmount(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg text-sm p-2.5 text-white outline-none focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Unidad</label>
                <select
                  value={refillUnit}
                  onChange={(e) => setRefillUnit(e.target.value)}
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

            {refillUnit !== (refillTarget.attributes?.inventory_unit || refillTarget.unit) && (
              <p className="text-[11px] text-amber-400 italic">
                Se convertirá a {refillTarget.attributes?.inventory_unit || refillTarget.unit} automáticamente.
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={closeRefillModal}
                disabled={submitting}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !refillAmount}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {submitting ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" />
                ) : (
                  <Plus size={16} />
                )}
                {submitting ? 'Registrando…' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default InventoryDashboard;
