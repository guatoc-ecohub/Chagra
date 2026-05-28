import { useState, useEffect, useCallback } from 'react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    TouchSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import AgentHero from './AgentHero';
import ClimaStrip from './ClimaStrip';
import SensorInsightCard from './SensorInsightCard';
import useAssetStore from '../../store/useAssetStore';
import {
    PlantasCard,
    ZonasCard,
    InsumosCard,
    BitacoraCard,
    HoyCard,
    PlagasCard,
    BiodiversidadCard,
    InformesCard,
} from './FincaCards';

/**
 * DashboardLive — el dashboard rediseñado 2026-05-28 cervezas-test.
 *
 * Layout:
 *   - AgentHero (fijo arriba, no draggable — el agente es protagonista)
 *   - Secciones (draggables): clima, plantas, zonas, insumos, bitácora,
 *     hoy, plagas, biodiversidad, informes.
 *
 * Persiste orden en localStorage `chagra:dashboard-order:v1`.
 */

const STORAGE_KEY = 'chagra:dashboard-order:v1';

const DEFAULT_ORDER = [
    'clima',
    'plantas',
    'hoy',
    'zonas',
    'insumos',
    'plagas',
    'bitacora',
    'biodiversidad',
    'informes',
];

const SECTION_COMPONENTS = {
    clima: { Component: ClimaStrip, full: true },
    plantas: { Component: PlantasCard },
    zonas: { Component: ZonasCard },
    insumos: { Component: InsumosCard },
    bitacora: { Component: BitacoraCard },
    hoy: { Component: HoyCard },
    plagas: { Component: PlagasCard },
    biodiversidad: { Component: BiodiversidadCard },
    informes: { Component: InformesCard },
};

function readOrder() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_ORDER;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return DEFAULT_ORDER;
        // Filter to known sections + append any missing (new sections added post-deploy)
        const valid = parsed.filter((id) => SECTION_COMPONENTS[id]);
        const missing = DEFAULT_ORDER.filter((id) => !valid.includes(id));
        return [...valid, ...missing];
    } catch {
        return DEFAULT_ORDER;
    }
}

function writeOrder(order) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)); } catch { /* ignore */ }
}

function SortableSection({ id, onNavigate }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 20 : 'auto',
    };

    const entry = SECTION_COMPONENTS[id];
    if (!entry) return null;
    const { Component } = entry;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
        >
            {/* Drag handle — visible siempre pero discreto, agarra-y-mueve */}
            <button
                type="button"
                {...attributes}
                {...listeners}
                aria-label="Mover sección"
                className="absolute top-1/2 -translate-y-1/2 -left-1.5 z-10 p-1 rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/5 active:bg-white/10 cursor-grab active:cursor-grabbing touch-none"
                style={{ touchAction: 'none' }}
            >
                <GripVertical size={16} aria-hidden="true" />
            </button>
            <div className="pl-3">
                <Component onNavigate={onNavigate} />
            </div>
        </div>
    );
}

export default function DashboardLive({ onNavigate }) {
    const [order, setOrder] = useState(readOrder);
    const iotAlerts = useAssetStore((s) => s.iotAlerts) || [];

    useEffect(() => {
        writeOrder(order);
    }, [order]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setOrder((items) => {
            const oldIndex = items.indexOf(active.id);
            const newIndex = items.indexOf(over.id);
            if (oldIndex === -1 || newIndex === -1) return items;
            return arrayMove(items, oldIndex, newIndex);
        });
    }, []);

    return (
        <div className="flex flex-col w-full h-full overflow-y-auto pb-24">
            {/* Agente: fijo arriba, no draggable. Protagonista. */}
            <AgentHero onNavigate={onNavigate} />

            {/* Secciones drag-reorder */}
            <div className="px-4 pt-3 pb-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={order} strategy={verticalListSortingStrategy}>
                        <div className="flex flex-col gap-3">
                            {order.map((id) => (
                                <SortableSection key={id} id={id} onNavigate={onNavigate} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>

                {/* Insight IA de sensores — JUSTO debajo del grid de cards.
                    No draggable. Resumen breve curado con icono pulse cyan. */}
                <SensorInsightCard sensors={iotAlerts} onNavigate={onNavigate} />

                <p className="text-[10px] text-slate-600 text-center mt-4 italic">
                    Mantén presionado el ⋮⋮ para reorganizar a tu gusto
                </p>
            </div>
        </div>
    );
}
