import { useState, useEffect, useCallback } from 'react';
import { useScrollRestoration } from '../../hooks/useScrollRestoration';
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
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import AgentHero from './AgentHero';
import OnboardingHero from '../OnboardingHero';
import { getProfile } from '../../services/userProfileService';
import SelectedBackgroundReveal from './SelectedBackgroundReveal';
import ClimaStrip from './ClimaStrip';
import AIStatusFooter from './AIStatusFooter';
import AnalisisProactivoIA from './AnalisisProactivoIA';
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

// v2 (2026-05-30): 'analisis' (AnalisisProactivoIA) pasó de fijo-abajo a
// sección draggable, por defecto justo debajo de 'clima'. Bump de versión
// para que usuarios con orden v1 reciban el nuevo default en vez de que se
// les agregue al final.
const STORAGE_KEY = 'chagra:dashboard-order:v2';

const DEFAULT_ORDER = [
    'clima',
    'analisis',
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
    analisis: { Component: AnalisisProactivoIA, full: true },
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

function SortableSection({ id, onNavigate, sensors }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const entry = SECTION_COMPONENTS[id];
    if (!entry) return null;
    const { Component, full } = entry;

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 20 : 'auto',
        gridColumn: full ? '1 / -1' : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
        >
            {/* Drag handle — visible siempre pero discreto. En grid cards
                cuadrados, el handle vive arriba a la izquierda en lugar
                del lateral, para no comerle ancho a la celda. */}
            <button
                type="button"
                {...attributes}
                {...listeners}
                aria-label="Mover sección"
                className={`${full
                    ? 'absolute top-1/2 -translate-y-1/2 -left-1.5'
                    : 'absolute top-1 left-1'} z-10 p-1 rounded-md text-slate-500/70 hover:text-slate-300 hover:bg-white/10 active:bg-white/20 cursor-grab active:cursor-grabbing touch-none`}
                style={{ touchAction: 'none' }}
            >
                <GripVertical size={14} aria-hidden="true" />
            </button>
            <div className={full ? 'pl-3' : ''}>
                {/* `sensors` solo lo consume la sección 'analisis' (AnalisisProactivoIA);
                    el resto de cards lo ignoran (prop extra inocua). */}
                <Component onNavigate={onNavigate} variant={full ? 'list' : 'grid'} sensors={sensors} />
            </div>
        </div>
    );
}

export default function DashboardLive({ onNavigate, regionalGreeting = null }) {
    const [order, setOrder] = useState(readOrder);
    const iotAlerts = useAssetStore((s) => s.iotAlerts) || [];
    // Primer uso (feat/onboarding-ayuda): sin plantas registradas se re-monta
    // el OnboardingHero existente (quedó huérfano del DashboardView legacy al
    // pasar a DashboardLive 2026-05-28). Trae el Paso 1 "piso térmico" —
    // filtro maestro de todos los módulos — + las 3 rutas de registro.
    // Si falta capturar/confirmar el piso, va ARRIBA del AgentHero (above
    // the fold — el hero mide ~100dvh y el paso crítico no puede quedar
    // escondido tras un scroll); ya confirmado, baja al flujo normal.
    const plantsCount = useAssetStore((s) => s.plants.length);
    const [needsPisoCapture] = useState(() => {
        const p = getProfile();
        const alt = Number(p.finca_altitud);
        const hasAltitud = p.finca_altitud !== '' && p.finca_altitud != null && Number.isFinite(alt);
        return !hasAltitud || p.piso_confirmado !== '1';
    });

    // Persist scroll position al volver de detalle (mismo bug que App.jsx
    // resolvió para Dashboard clásico). Quick-win UX 2026-05-28 demo Diana.
    useScrollRestoration('dashboard-live', '[data-scroll-key="dashboard-live"]');

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
        <div
            className="flex flex-col w-full h-full overflow-y-auto pb-24"
            data-scroll-key="dashboard-live"
        >
            {/* Agente: PORTADA INMERSIVA a pantalla completa (≈100dvh).
                Protagonista absoluto, primera pantalla. El resto del dashboard
                (saludo regional + secciones) queda DEBAJO del fold y se llega
                scrolleando. */}
            {plantsCount === 0 && needsPisoCapture && (
                <div className="px-4 pt-3" data-testid="dashboard-onboarding-top">
                    <OnboardingHero onNavigate={onNavigate} />
                </div>
            )}

            <AgentHero onNavigate={onNavigate} />

            {/* Paisaje elegido — la foto de biodiversidad seleccionada, JUSTO
                bajo el hero, visible en todos los temas (operador 2026-06-09). */}
            <SelectedBackgroundReveal />

            {/* Panel inline de capacidades RETIRADO (operador 2026-06-10): el
                menú vive solo en el despliegue de la Ⓐ del AgentHero (la red
                nueva AgentRedMenu). El home queda limpio. */}

            {/* Saludo regional dismissible — bajo el fold, ya no sobre el hero
                (que tiene su propio saludo "Soy Chagra"). */}
            {regionalGreeting}

            {/* Primer uso con piso ya confirmado: las 3 rutas de registro
                bajo el fold. Desaparece al registrar la primera planta. */}
            {plantsCount === 0 && !needsPisoCapture && (
                <div className="px-4 pt-3">
                    <OnboardingHero onNavigate={onNavigate} />
                </div>
            )}

            {/* Secciones drag-reorder */}
            <div className="px-4 pt-3 pb-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={order} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {order.map((id) => (
                                <SortableSection key={id} id={id} onNavigate={onNavigate} sensors={iotAlerts} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>

                <p className="text-[10px] text-slate-600 text-center mt-4 italic">
                    Mantén presionado el ⋮⋮ para reorganizar a tu gusto
                </p>

                {/* AIStatusFooter — barra inferior con status proactivo IA:
                    SENSORES + CLIMA + AGENTE. Operador 2026-05-28: "el analisis
                    de ia que da el status proactivo en general ponlo en la parte
                    de abajo e integralo de la mejor manera acorde a los ultimos
                    cambios aplicados". Movido del medio del scroll al footer +
                    expandido de solo-sensores a 3 ejes IA. */}
                <AIStatusFooter sensors={iotAlerts} onNavigate={onNavigate} />

                {/* AnalisisProactivoIA (#331) — Operador 2026-05-30: "que el
                    análisis de IA quede justo debajo del clima y que también
                    pueda moverse". Pasó de render fijo acá-abajo a sección
                    DRAGGABLE en SECTION_COMPONENTS, default order = bajo 'clima'
                    (ver DEFAULT_ORDER + STORAGE_KEY v2). Recibe `sensors` vía
                    SortableSection. */}
            </div>
        </div>
    );
}
