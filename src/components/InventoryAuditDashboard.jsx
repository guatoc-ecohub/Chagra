import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, Save, History, Scale } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import { openDB, STORES } from '../db/dbCore';
import { reconcileAllItems } from '../services/inventoryReconcile';
import { savePayload } from '../services/payloadService';

/**
 * InventoryAuditDashboard — Centro de control para integridad de inventario.
 * 
 * Compara el stock 'declarativo' (el campo inventory_value en el Asset) contra
 * el stock 'reconciliado' (la reducción del stream de eventos). Permite al
 * operador emitir eventos de 'audit' para fijar la verdad de campo cuando
 * hay discrepancias.
 */
export default function InventoryAuditDashboard() {
    const materials = useAssetStore((state) => state.materials);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDiffOnly, setIsDiffOnly] = useState(false);
    const [reconciling, setReconciling] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const db = await openDB();
            const tx = db.transaction(STORES.INVENTORY_EVENTS, 'readonly');
            const store = tx.objectStore(STORES.INVENTORY_EVENTS);
            const allEvents = await new Promise((resolve, reject) => {
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            setEvents(allEvents || []);
        } catch (err) {
            console.error('[Dashboard] Error cargando eventos:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const reconciliation = useMemo(() => {
        return reconcileAllItems(events);
    }, [events]);

    const stats = useMemo(() => {
        const list = materials.map(m => {
            const rec = reconciliation[m.id] || { currentStock: 0, issues: [] };
            const cachedStock = parseFloat(m.attributes?.inventory_value) || 0;
            const diff = Math.abs(rec.currentStock - cachedStock);
            const hasDiff = diff > 0.001;

            return {
                id: m.id,
                name: m.attributes?.name || m.name || 'Sin nombre',
                cachedStock,
                reconciledStock: rec.currentStock,
                diff,
                hasDiff,
                issues: rec.issues,
                unit: m.attributes?.inventory_unit || 'unid'
            };
        });

        if (isDiffOnly) return list.filter(item => item.hasDiff || item.issues.length > 0);
        return list;
    }, [materials, reconciliation, isDiffOnly]);

    const handleAudit = async (item) => {
        if (!confirm(`¿Deseas fijar el stock de ${item.name} en ${item.reconciledStock} ${item.unit}? Esto emitirá un evento de auditoría.`)) {
            return;
        }

        setReconciling(true);
        const auditLogId = crypto.randomUUID(); // Simplificado para el dashboard
        const payload = {
            data: {
                type: 'log--audit', // Custom type for inventory event sourcing
                id: auditLogId,
                attributes: {
                    name: `Auditoría: ${item.name} (Sincronización manual)`,
                    timestamp: Math.floor(Date.now() / 1000),
                    status: 'done',
                    notes: `Stock verificado y reconciliado manualmente desde el dashboard de auditoría.`
                },
                relationships: {
                    asset: { data: [{ type: 'asset--material', id: item.id }] }
                },
                // Extensiones para el reducir de reconciliación
                _inventory_meta: {
                    item_id: item.id,
                    event_type: 'audit',
                    quantity: { value: item.reconciledStock, label: item.unit }
                }
            }
        };

        try {
            // En un flujo real, esto debería ir a STORES.INVENTORY_EVENTS también.
            // Por ahora usamos savePayload que encola la transacción de red.
            // El syncManager debería eventualmente persistir esto de vuelta al log de eventos.
            await savePayload('observation', payload); // Usamos observation como contenedor genérico
            alert('Evento de auditoría encolado. Sincroniza para ver cambios.');
            loadData();
        } catch (err) {
            console.error('[Audit] Error al emitir audit:', err);
            alert('Error al emitir auditoría.');
        } finally {
            setReconciling(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse uppercase font-black">Escaneando bodega…</div>;

    return (
        <div className="flex flex-col h-full bg-slate-950 p-6 space-y-6 overflow-hidden">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter flex items-center gap-3">
                        <Scale className="text-indigo-400" size={28} />
                        Auditoría de Inventario
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Reconciliación de eventos vs snapshot de activos FarmOS.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsDiffOnly(!isDiffOnly)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${isDiffOnly ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                    >
                        {isDiffOnly ? 'Ver Todos' : 'Ver solo discrepancias'}
                    </button>
                    <button
                        type="button"
                        onClick={loadData}
                        aria-label="Recargar datos de auditoría"
                        className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 active:scale-95 transition-all"
                    >
                        <RefreshCw size={18} aria-hidden="true" />
                    </button>
                </div>
            </header>

            <main className="flex-1 min-h-0 bg-slate-900/30 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-inner">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                                <th className="px-6 py-4">Insumo / Material</th>
                                <th className="px-6 py-4">Snapshot (Asset)</th>
                                <th className="px-6 py-4">Sourced (Events)</th>
                                <th className="px-6 py-4">Alertas</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {stats.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-600 italic text-sm">
                                        No hay materiales para auditar o filtros muy restrictivos.
                                    </td>
                                </tr>
                            ) : (
                                stats.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-800/20 transition-colors group">
                                        <td className="px-6 py-5">
                                            <span className="text-sm font-bold text-slate-100 block">{item.name}</span>
                                            <span className="text-[10px] text-slate-600 font-mono">{item.id.split('-')[0]}…</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-sm font-mono text-slate-300">{item.cachedStock}</span>
                                            <span className="text-[10px] text-slate-500 ml-1">{item.unit}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-black font-mono ${item.hasDiff ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                    {item.reconciledStock}
                                                </span>
                                                {item.hasDiff && (
                                                    <div className="bg-amber-500/10 text-amber-500 p-0.5 rounded" title="Discrepancia detectada">
                                                        <AlertCircle size={10} />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {item.issues.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {item.issues.map((issue, idx) => (
                                                        <span key={idx} className="bg-red-500/20 text-red-500 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-red-500/30">
                                                            {issue.type.replace('_', ' ')}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <CheckCircle2 size={16} className="text-emerald-900/50" />
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button
                                                onClick={() => handleAudit(item)}
                                                disabled={reconciling}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg shadow-lg active:scale-95 disabled:opacity-50"
                                                title="Emitir auditoría para fijar stock"
                                            >
                                                <Save size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            <footer className="shrink-0 flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-slate-900/20 p-4 rounded-2xl border border-slate-800">
                <div className="flex gap-6">
                    <span className="flex items-center gap-1.5"><History size={12} /> Eventos totales: {events.length}</span>
                    <span className="flex items-center gap-1.5 text-amber-500/70">
                        <AlertCircle size={12} />
                        Discrepancias: {stats.filter(s => s.hasDiff).length}
                    </span>
                </div>
                <div>
                    Sincronización: Local-Only (Event Sourcing Ready)
                </div>
            </footer>
        </div>
    );
}
