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
import { GripVertical, Snowflake, ChevronRight } from 'lucide-react';
import AgentHero from './AgentHero';
import OnboardingHero from '../OnboardingHero';
import { getProfile } from '../../services/userProfileService';
import { tieneAccesoGlaciarActual } from '../../config/glaciarAccess';
import SelectedBackgroundReveal from './SelectedBackgroundReveal';
import ClimaStrip from './ClimaStrip';
import HoyEnFincaStrip from './HoyEnFincaStrip';
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
// v3 (2026-06-11): 'hoyfinca' (HoyEnFincaStrip) — resumen proactivo del día
// (clima honesto + alertas + tareas + próximo evento de agenda) como PRIMERA
// sección bajo el hero. Toque → vista completa 'hoy_finca'. Bump para que
// usuarios con orden v2 lo reciban arriba y no apendizado al final.
const STORAGE_KEY = 'chagra:dashboard-order:v3';

const DEFAULT_ORDER = [
    'hoyfinca',
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
    hoyfinca: { Component: HoyEnFincaStrip, full: true },
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
    // Si falta capturar/confirmar el piso, el Paso 1 se muestra como banner
    // compacto flotando SOBRE el AgentHero (overlay, no empuja el hero — ver
    // el bloque de render); ya confirmado, las 3 rutas bajan al flujo normal.
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
            className="relative flex flex-col w-full h-full overflow-y-auto pb-24"
            data-scroll-key="dashboard-live"
        >
            {/* Agente: PORTADA INMERSIVA a pantalla completa (≈100dvh).
                Protagonista absoluto, primera pantalla. El resto del dashboard
                (saludo regional + secciones) queda DEBAJO del fold y se llega
                scrolleando. */}
            {/* Primer uso sin piso confirmado: BANNER compacto del Paso 1
                (piso térmico) flotando SOBRE la zona decorativa superior del
                AgentHero, justo bajo el TopBar flotante. Es un OVERLAY (absolute)
                a propósito (regresión 2026-06-13): montarlo en el flujo flex
                EMPUJABA el AgentHero ≈100dvh hacia arriba y, al abrir la araña, su
                fila superior de nodos quedaba TAPADA por el TopBar flotante (los
                clics aterrizaban en el TopBar). Como overlay no desplaza al hero:
                la araña conserva su geometría y sigue alcanzable. Las 3 rutas de
                registro viven en el hero completo bajo el fold, una vez
                confirmado el piso. */}
            {plantsCount === 0 && needsPisoCapture && (
                <div
                    className="absolute inset-x-0 top-[64px] z-20 px-4 pointer-events-none"
                    data-testid="dashboard-onboarding-top"
                >
                    <div className="pointer-events-auto">
                        <OnboardingHero onNavigate={onNavigate} compact />
                    </div>
                </div>
            )}

            <AgentHero onNavigate={onNavigate} />

            {/* Paisaje elegido — la foto de biodiversidad seleccionada, JUSTO
                bajo el hero, visible en todos los temas (operador 2026-06-09). */}
            <SelectedBackgroundReveal />

            {/* Acceso al módulo "Reporte de Punto Glaciar" (guías de glaciar).
                Ruta #glaciar. ACCESO RESTRINGIDO a los beta testers de "La
                Cordada": el banner solo se renderiza si el usuario logueado
                está en la whitelist (src/config/glaciarAccess.js). Para el resto
                de usuarios el módulo es invisible. Offline-first (lee el usuario
                ya guardado en login, sin red). */}
            {tieneAccesoGlaciarActual() && (
                <div className="px-4 pt-3">
                    <button
                        type="button"
                        onClick={() => onNavigate('glaciar')}
                        className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-sky-700/50 bg-sky-900/25 hover:bg-sky-900/40 active:scale-[0.99] transition text-left"
                    >
                        <span className="shrink-0 w-11 h-11 rounded-xl bg-sky-500/20 grid place-items-center">
                            <Snowflake size={24} className="text-sky-300" />
                        </span>
                        <span className="flex-1 min-w-0">
                            <span className="block font-bold text-slate-100 leading-tight">Reporte de Punto Glaciar</span>
                            <span className="block text-xs text-slate-400 leading-tight">
                                Dureza del hielo, GPS y foto — funciona sin internet
                            </span>
                        </span>
                        <ChevronRight size={20} className="text-sky-300/70 shrink-0" />
                    </button>
                </div>
            )}

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
