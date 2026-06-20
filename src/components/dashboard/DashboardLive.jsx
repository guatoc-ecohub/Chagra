import { useState, useEffect, useCallback, useRef } from 'react';
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
import {
    getProfile,
    getModuleVisibility,
    hasManualModuleVisibility,
    getModuleOrder,
    setModuleOrder,
    HOME_MODULE_DEFAULT_ORDER,
} from '../../services/userProfileService';
import {
    selectHomeModuleVisibilityMap,
    selectHomeModules,
} from '../../services/homeModuleSelector';
import { tieneAccesoGlaciarActual, esOperadorActual } from '../../config/glaciarAccess';
import SelectedBackgroundReveal from './SelectedBackgroundReveal';
import MiFincaVivaHomeCard from './MiFincaVivaHomeCard';
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
    AsociacionesCard,
    InformesCard,
    FermentosCard,
    SeguimientoCards,
} from './FincaCards';

/**
 * DashboardLive — el dashboard rediseñado 2026-05-28 cervezas-test.
 *
 * Layout:
 *   - AgentHero (fijo arriba, no draggable — el agente es protagonista)
 *   - Secciones (draggables): clima, plantas, zonas, insumos, bitácora,
 *     hoy, plagas, biodiversidad, informes.
 *
 * Persiste el orden en el perfil del usuario (userProfileService:
 * getModuleOrder/setModuleOrder, campo `modulos_orden`). Migrado desde la
 * clave localStorage legada `chagra:dashboard-order:v3` (2026-06-15) para
 * unificar la persistencia del home junto a la visibilidad de módulos.
 */

// Orden por defecto + fuente del orden persistido: viven en userProfileService
// (HOME_MODULE_DEFAULT_ORDER / getModuleOrder / setModuleOrder). DEFAULT_ORDER
// se mantiene acá como alias para el fail-open de la visibilidad por perfil.
const DEFAULT_ORDER = HOME_MODULE_DEFAULT_ORDER;

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
    asociaciones: { Component: AsociacionesCard },
    fermentos: { Component: FermentosCard },
    informes: { Component: InformesCard },
};

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
    const [order, setOrder] = useState(getModuleOrder);
    const [moduleVisibility, setModuleVisibility] = useState(() => {
        // GATING DEL HOME POR PERFIL (2026-06-15): el perfil del onboarding
        // (rol/vocacion/finca_tipo/animales/objetivo) fija QUÉ módulos se ven
        // por DEFECTO — "el usuario solo ve lo que necesita".
        //
        // RESPETO A #1560: si el usuario ya guardó una preferencia MANUAL en
        // ProfileScreen, esa GANA — el perfil solo decide el default. Si no hay
        // preferencia manual, derivamos la visibilidad por perfil con
        // homeModuleSelector (reusa deriveRole de profileChipSelector).
        try {
            // El override "Visión total" del operador GANA sobre prefs manuales:
            // si está activo, mostramos TODO (esOperador=true). Sin esto, un
            // operador que antes ocultó módulos a mano activaba el toggle y NO
            // veía nada (bug demo 2026-06-19).
            if (hasManualModuleVisibility() && !esOperadorActual()) {
                // El usuario eligió a mano: respetar su configuración tal cual.
                return getModuleVisibility();
            }
            // Primer load sin elección manual: default por perfil.
            // El operador (esOperadorActual) hace BYPASS → ve TODOS los módulos
            // (selectHomeModules ignora el rol/urbano cuando esOperador=true).
            return selectHomeModuleVisibilityMap(getProfile(), {
                esOperador: esOperadorActual(),
                esGuiaGlaciar: tieneAccesoGlaciarActual(),
            });
        } catch (_) {
            // Fail-open: ante cualquier problema, todo visible (no romper el home).
            const visibility = {};
            for (const id of DEFAULT_ORDER) visibility[id] = true;
            return visibility;
        }
    });
    // Tarjetas de SEGUIMIENTO permitidas por perfil (Reforestación · Silvopastoreo
    // · Páramo · Cerdos). Mismo gating "el usuario solo ve lo que necesita": un
    // urbano (sin preferencia manual) NUNCA ve Cerdos. Se calcula una vez al
    // montar; el perfil no cambia dentro de la sesión del home.
    //
    // RESPETO A #1560: si el usuario ya tomó control MANUAL de su home
    // (hasManualModuleVisibility), NO le ocultamos tarjetas por perfil — el
    // perfil solo fija el DEFAULT. Devolvemos null (= mostrar las 4), igual que
    // el comportamiento histórico. Un urbano FRESCO (sin manual) sí queda
    // gateado: no ve ninguna (criterio de éxito #1).
    // null = mostrar todas; [] = ocultar el bloque; [k…] = filtrar.
    const [seguimientoKeys] = useState(() => {
        try {
            if (hasManualModuleVisibility()) return null;
            // El operador ve las 4 tarjetas (incluida Cerdos) por el bypass.
            return selectHomeModules(getProfile(), {
                esOperador: esOperadorActual(),
                esGuiaGlaciar: tieneAccesoGlaciarActual(),
            }).seguimiento;
        } catch (_) {
            return null; // Fail-open: el componente muestra las 4 por defecto.
        }
    });
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

    // Escuchar cambios en visibilidad de módulos desde ProfileScreen (#7003)
    useEffect(() => {
        const handler = (e) => {
            const { visibility } = e.detail;
            if (visibility && typeof visibility === 'object') {
                setModuleVisibility(visibility);
            }
        };
        try {
            window.addEventListener('chagra:module-visibility-changed', handler);
            return () => {
                try {
                    window.removeEventListener('chagra:module-visibility-changed', handler);
                } catch (_) { /* noop */ }
            };
        } catch (_) {
            // Tests sin window
            return () => {};
        }
    }, []);

    // Escuchar cambios de PERFIL en vivo (tarea #33 selector de perfil +
    // override de visión total del operador). Al cambiar el perfil/rol o el
    // bypass del operador, re-derivamos el gating del home SIN recargar:
    // recalculamos la visibilidad por defecto del perfil nuevo. Respeta #1560:
    // si el usuario tomó control MANUAL de sus módulos, NO lo pisamos.
    useEffect(() => {
        const handler = () => {
            try {
                // El override del operador GANA sobre prefs manuales (ver arriba).
                if (hasManualModuleVisibility() && !esOperadorActual()) return;
                setModuleVisibility(
                    selectHomeModuleVisibilityMap(getProfile(), {
                        esOperador: esOperadorActual(),
                        esGuiaGlaciar: tieneAccesoGlaciarActual(),
                    })
                );
            } catch (_) { /* fail-open: dejar el home como está */ }
        };
        try {
            window.addEventListener('chagra:profile-changed', handler);
            return () => {
                try {
                    window.removeEventListener('chagra:profile-changed', handler);
                } catch (_) { /* noop */ }
            };
        } catch (_) {
            return () => {};
        }
    }, []);

    // Restaurar scroll SOLO al volver de un detalle/sub-ruta (operador
    // 2026-06-15): en una entrada NUEVA (mount inicial / post-login) el home
    // debe quedar ARRIBA (scroll 0), no en la posición baja que dejó la sesión
    // anterior. `restoreOnReturnOnly` distingue ambos casos: la primera vez que
    // se monta en este page-load NO restaura (entrada fresca → top); al volver
    // de un detalle (mount posterior) SÍ restaura. Conserva el fix #103 (no
    // perder la posición al ir a un detalle y regresar).
    useScrollRestoration('dashboard-live', '[data-scroll-key="dashboard-live"]', {
        restoreOnReturnOnly: true,
    });

    // Persistir el orden en el perfil SOLO tras una reorganización real del
    // usuario (no en el mount inicial): evita reescribir el perfil en cada
    // entrada al home. `orderDirtyRef` se marca en handleDragEnd.
    const orderDirtyRef = useRef(false);
    useEffect(() => {
        if (!orderDirtyRef.current) return;
        setModuleOrder(order);
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
            // Reorganización real del usuario → habilitar la persistencia.
            orderDirtyRef.current = true;
            return arrayMove(items, oldIndex, newIndex);
        });
    }, []);

    return (
        <div
            className="relative flex flex-col w-full h-full overflow-y-auto pb-6"
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

            {/* MI FINCA VIVA — la finca REAL del usuario como escena 2D viva
                (cultivos por etapa fenológica + animales + vitalidad). Solo se
                muestra cuando ya hay algo sembrado, para no competir con el
                OnboardingHero del primer uso (que ya invita a sembrar). La
                tarjeta es autocontenida: lee sus datos de farmProcessCache
                (offline-first) y abre el juego completo al tocarla. */}
            {plantsCount > 0 && (
                <div className="px-4 pt-3">
                    <MiFincaVivaHomeCard onNavigate={onNavigate} />
                </div>
            )}

            {/* Seguimiento de procesos de finca (2026-06-15): TARJETAS en el
                home — Reforestación · Silvopastoreo · Páramo · Cerdos — al estilo
                de "Mis plantas". Cada una abre su VISTA de seguimiento (iniciar
                el proceso, ver etapas con fechas, agregar registros/fotos y ver
                el avance). El operador las pidió visibles en el home (no escondidas
                tras la Ⓐ ni iniciables solo por voz). Bloque propio, fuera del
                grid draggable de módulos.

                GATING POR PERFIL: `seguimientoKeys` filtra qué tarjetas se ven
                ("el usuario solo ve lo que necesita" — un urbano NUNCA ve Cerdos
                ni Silvopastoreo). Si el perfil no permite ninguna (ej. urbano de
                balcón), el bloque entero se oculta. null = fail-open (las 4). */}
            {(seguimientoKeys === null || seguimientoKeys.length > 0) && (
                <div className="px-4 pt-3">
                    <p className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                        <span
                            aria-hidden="true"
                            className="h-3.5 w-1 rounded-full bg-gradient-to-b from-emerald-400 to-teal-400"
                        />
                        Seguimiento de procesos
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="seguimiento-cards">
                        <SeguimientoCards onNavigate={onNavigate} variant="grid" keys={seguimientoKeys} />
                    </div>
                </div>
            )}

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
                            {order
                                .filter((id) => moduleVisibility[id] !== false)
                                .map((id) => (
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
                    (ver HOME_MODULE_DEFAULT_ORDER en userProfileService). Recibe
                    `sensors` vía SortableSection. */}
            </div>
        </div>
    );
}
