import React, { useEffect, useMemo, useState } from 'react';
import { GroupedVirtuoso } from 'react-virtuoso';
import { Clock, Filter, CheckCircle, Package, ArrowRightLeft, History } from 'lucide-react';
import { openDB, STORES } from '../db/dbCore';

const TYPE_CONFIG = {
    input: { icon: ArrowRightLeft, color: 'text-blue-400', label: 'Consumo' },
    refill: { icon: Package, color: 'text-green-400', label: 'Abastecimiento' },
    production: { icon: Package, color: 'text-emerald-400', label: 'Producción' },
    audit: { icon: CheckCircle, color: 'text-purple-400', label: 'Auditoría' },
    adjustment: { icon: History, color: 'text-amber-400', label: 'Ajuste' },
};

/**
 * InventoryEventTimeline — Visualización cronológica de eventos de inventario.
 * 
 * Basado en react-virtuoso para manejar streams largos de eventos con alto
 * rendimiento. Permite filtrar por tipo de movimiento (consumo, refill, etc).
 */
export default function InventoryEventTimeline({ itemId }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        let isMounted = true;
        async function loadEvents() {
            setLoading(true);
            try {
                const db = await openDB();
                const tx = db.transaction(STORES.INVENTORY_EVENTS, 'readonly');
                const store = tx.objectStore(STORES.INVENTORY_EVENTS);

                // Si hay itemId filtramos por index, si no traemos todo (global audit)
                let request;
                if (itemId) {
                    const index = store.index('item_id');
                    request = index.getAll(IDBKeyRange.only(itemId));
                } else {
                    request = store.getAll();
                }

                const result = await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });

                if (isMounted) {
                    setEvents(result || []);
                    setLoading(false);
                }
            } catch (err) {
                console.error('[Timeline] Error cargando eventos:', err);
                if (isMounted) setLoading(false);
            }
        }
        loadEvents();
        return () => { isMounted = false; };
    }, [itemId]);

    // Transformaciones memoizadas para Virtuoso
    const filteredEvents = useMemo(() => {
        let result = events;
        if (filterType !== 'all') {
            result = result.filter(e => e.event_type === filterType);
        }
        // Orden descendente (más recientes arriba)
        return result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }, [events, filterType]);

    const { flatEvents, groupCounts, groupNames } = useMemo(() => {
        const map = new Map();
        for (const event of filteredEvents) {
            const date = new Date(event.timestamp * 1000);
            const key = `${date.toLocaleString('es-CO', { month: 'long' })} ${date.getFullYear()}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(event);
        }

        const groups = Array.from(map.entries());
        return {
            flatEvents: groups.flatMap(g => g[1]),
            groupCounts: groups.map(g => g[1].length),
            groupNames: groups.map(g => g[0])
        };
    }, [filteredEvents]);

    const renderEvent = (index, event) => {
        const config = TYPE_CONFIG[event.event_type] || { icon: Clock, color: 'text-slate-400', label: 'Evento' };
        const Icon = config.icon;
        const date = new Date(event.timestamp * 1000);

        return (
            <div className="py-2 pr-2">
                <div className="relative p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 transition-all group">
                    <span className={`absolute -left-[26px] top-6 w-4 h-4 rounded-full border-2 border-slate-900 bg-slate-900 flex items-center justify-center z-10 shadow-lg`}>
                        <Icon size={10} className={config.color} />
                    </span>
                    <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 ${config.color}`}>
                                    {config.label}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                    {date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-200 truncate">
                                {event.payload?.name || 'Operación sin nombre'}
                            </h4>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-xs text-slate-400">Cantidad:</span>
                                <span className="text-xs text-slate-100 font-black">
                                    {event.payload?.quantity?.value} {event.payload?.quantity?.label}
                                </span>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="text-[10px] text-slate-500 font-bold bg-slate-800/50 px-2 py-1 rounded">
                                DIA {date.getDate()}
                            </span>
                        </div>
                    </div>
                    {event.payload?.notes && (
                        <p className="text-[11px] text-slate-500 mt-2 italic leading-tight border-t border-slate-800 pt-2">
                            {event.payload.notes}
                        </p>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="p-12 text-center text-slate-500 animate-pulse bg-slate-900/20 rounded-2xl border border-slate-800/50">
                <History size={32} className="mx-auto mb-3 opacity-20 animate-spin-slow" />
                <span className="text-xs font-black tracking-widest uppercase">Consultando Inventario…</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <header className="p-4 border-b border-slate-800 bg-slate-900/40 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <History size={20} className="text-blue-400" />
                    <h3 className="font-black text-slate-100 uppercase tracking-tighter text-sm">
                        Línea de Tiempo
                    </h3>
                </div>

                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-500" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-black uppercase px-2 py-1.5 text-slate-300 outline-none hover:border-slate-600 transition-colors cursor-pointer"
                    >
                        <option value="all">TODOS</option>
                        <option value="input">CONSUMOS</option>
                        <option value="refill">REFILLS</option>
                        <option value="audit">AUDITORÍAS</option>
                    </select>
                </div>
            </header>

            <div className="flex-1 min-h-0 border-l-2 border-slate-800/50 ml-6 my-4 relative">
                {flatEvents.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 px-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 border border-slate-800">
                            <History size={32} className="opacity-20" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest">Sin actividad registrada</p>
                        <p className="text-[10px] mt-1 opacity-50">Los movimientos de este ítem aparecerán aquí.</p>
                    </div>
                ) : (
                    <GroupedVirtuoso
                        groupCounts={groupCounts}
                        data={flatEvents}
                        style={{ height: '100%' }}
                        overscan={400}
                        groupContent={(index) => (
                            <div className="bg-slate-950/95 backdrop-blur-sm py-2.5 px-4 -ml-4 border-b border-slate-800/50 z-20 flex items-center justify-between sticky top-0">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    {groupNames[index]}
                                </span>
                                <span className="text-[9px] font-bold text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded">
                                    {groupCounts[index]} eventos
                                </span>
                            </div>
                        )}
                        itemContent={renderEvent}
                    />
                )}
            </div>
        </div>
    );
}
