/*
 * i18n (ADR-050): DashboardLive.jsx contiene etiquetas de navegación de la home
 * en español Colombia (títulos de tiles/bloques: Suelo, Semilleros, Cosechar,
 * Insumos aplicados, "Registrar en la finca"…) pendientes de migrar a
 * src/config/messages.js. La regla chagra-i18n es soft (warn); se desactiva a
 * nivel de archivo para no bloquear el pre-commit con deuda preexistente —
 * mismo criterio que App.jsx. Los errores reales de ESLint siguen activos.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
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
import { GripVertical, Snowflake, ChevronRight, Layers, TestTube, ShieldAlert, BookOpen, ClipboardList, Recycle, FlaskConical, Wheat, Droplets, Wrench, Eye } from 'lucide-react';
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
    esPerfilUrbano,
} from '../../services/homeModuleSelector';
import { tieneAccesoGlaciarActual, esOperadorActual } from '../../config/glaciarAccess';
import { esExtensionistaActual } from '../../config/extensionistaAccess';
import { fincaVivaHomePerfilActivo } from '../../config/fincaVivaHomeFlag';
import SelectedBackgroundReveal from './SelectedBackgroundReveal';
import MiFincaVivaHomeCard from './MiFincaVivaHomeCard';
import FincaRedInstitucional from './FincaRedInstitucional';
// Rescate huérfano 2026-06-24 (descubribilidad): CaseStudyTopWidget vivía solo
// en el DashboardView MUERTO de App.jsx (única vía a `casos`). Se trae a la home
// viva; se auto-oculta si no hay casos activos (KISS, zero footprint). Ref:
// CAPABILITIES_STATUS.md §2.
import CaseStudyTopWidget from '../CaseStudyTopWidget';
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
    AnimalesCard,
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

// Herramientas de finca que NO son secciones-módulo del grid (no tienen
// componente en SECTION_COMPONENTS): son TILES de acceso directo a una pantalla
// completa (Suelo · Semilleros · Seguridad). El commit #1827 las metió por
// error en NAV_TILES (la pantalla de navegación de App.jsx), que NO es este
// home dashboard — por eso no aparecían al loguear ("Semilleros=0"). Acá viven
// como su propio bloque de tiles navegables (onNavigate(view) → currentView),
// reusando label/icon/desc de NAV_TILES. Universales: las ve todo perfil (igual
// que en NAV_TILES, sin gating por rol — son herramientas básicas de manejo).
const HERRAMIENTAS_TILES = [
    { view: 'suelo', label: 'Suelo', icon: Layers, desc: 'Diagnóstico y salud del suelo', accent: 'text-amber-400 border-l-amber-500' },
    { view: 'germinacion', label: 'Semilleros', icon: TestTube, desc: 'Prueba de semillas y germinación', accent: 'text-teal-400 border-l-teal-500' },
    { view: 'toxicologia', label: 'Seguridad', icon: ShieldAlert, desc: 'Toxicidad de insumos y riesgo de suelo', accent: 'text-rose-400 border-l-rose-500' },
    { view: 'aprende', label: 'Aprende', icon: BookOpen, desc: 'Lecciones agroecológicas con fuente', accent: 'text-emerald-400 border-l-emerald-500' },
    // Huérfanos rescatados 2026-06-24 (descubribilidad). Eran rutas vivas en el
    // router pero sin entrada en la home viva (CAPABILITIES_STATUS.md §2):
    //  · biopreparados → galería de recetas paso a paso (antes solo desde el juego).
    //  · ciclo_nutrientes → plan de alimentación / ciclo cerrado (antes solo
    //    desde dentro de AnimalesScreen).
    //  · casos → casos de estudio (antes solo desde el DashboardView muerto / #casos).
    // `data: { back: 'dashboard' }`: la galería de biopreparados también se abre
    // desde el juego (misión, sin back → vuelve al juego). Desde la home pasamos
    // back:'dashboard' para que el botón Volver regrese acá y no al juego
    // (corrige el onBack huérfano). Ver App.jsx case 'biopreparados'.
    { view: 'biopreparados', label: 'Biopreparados', icon: FlaskConical, desc: 'Recetas caseras paso a paso', accent: 'text-lime-400 border-l-lime-500', data: { back: 'dashboard' } },
    { view: 'ciclo_nutrientes', label: 'Nutrientes', icon: Recycle, desc: 'Ciclo cerrado: del animal al suelo y la planta', accent: 'text-emerald-400 border-l-emerald-500' },
    { view: 'casos', label: 'Casos', icon: ClipboardList, desc: 'Seguimiento de problemas y tratamientos', accent: 'text-amber-400 border-l-amber-500' },
];

// Acciones de gestión sin launcher directo en la home (huérfanas):
// cosechar / insumos / mantenimiento. Eran alcanzables solo por back-nav interno
// o por la mano. Se exponen como tiles propios (CAPABILITIES_STATUS.md §2).
const GESTION_TILES = [
    { view: 'cosechar', label: 'Cosechar', icon: Wheat, desc: 'Registrar una cosecha', accent: 'text-amber-400 border-l-amber-500' },
    { view: 'insumos', label: 'Insumos aplicados', icon: Droplets, desc: 'Registrar una aplicación de bioinsumo', accent: 'text-sky-400 border-l-sky-500' },
    { view: 'mantenimiento', label: 'Mantenimiento', icon: Wrench, desc: 'Labores de mantenimiento de la finca', accent: 'text-slate-300 border-l-slate-500' },
];

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
    // Acceso al MÓDULO ANIMALES en el home. Mismo criterio "el usuario solo ve
    // lo que necesita": un urbano de balcón/terraza NO maneja animales, así que
    // no le mostramos la tarjeta (salvo que haya tomado control manual de su
    // home, en cuyo caso respetamos #1560 y la mostramos). El operador la ve
    // siempre (bypass de demos/debug). Se calcula una vez al montar.
    const [mostrarAnimales] = useState(() => {
        try {
            if (esOperadorActual()) return true;
            if (hasManualModuleVisibility()) return true;
            return !esPerfilUrbano(getProfile());
        } catch (_) {
            return true; // Fail-open: no esconder el módulo por un error.
        }
    });
    // Rescate huérfano 2026-06-24 (descubribilidad): "Campo, Javier"
    // (WorkerDashboard) era HUÉRFANO — solo accesible desde el NAV_TILES del
    // DashboardView muerto o por #javier. Es una vista de SUPERVISOR/trabajador
    // (nicho), así que la exponemos gateada al OPERADOR (no se la mostramos al
    // campesino dueño para no ensuciar la home). La ruta #javier sigue viva en el
    // router. Ref: CAPABILITIES_STATUS.md §2.
    const [mostrarJavier] = useState(() => {
        try {
            return esOperadorActual();
        } catch (_) {
            return false; // Fail-closed: vista de nicho, no exponer por error.
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

    // HOME "Finca Viva" por perfil (flag VITE_FINCA_VIVA_HOME_PERFIL). Se evalúa
    // una vez al montar. Con la flag ON: (1) la escena de la finca se muestra
    // SIEMPRE — incluso con 0 plantas, que la propia escena cubre con su estado
    // "por sembrar" (fix UX: la escena por perfil orienta desde el primer uso);
    // (2) si el usuario es extensionista (rol supervisor, con bypass de operador),
    // se monta la RED institucional de fincas en vez de la escena de finca única.
    // Con la flag OFF (default), el home conserva su comportamiento actual.
    const [fincaVivaFlag] = useState(() => fincaVivaHomePerfilActivo());
    const [esExtensionista] = useState(() => {
        try { return esExtensionistaActual(); } catch (_) { return false; }
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
                    className="absolute inset-x-0 top-[132px] z-[6] px-4 pointer-events-none"
                    data-testid="dashboard-onboarding-top"
                >
                    <div className="pointer-events-auto mx-auto w-full max-w-[26rem]">
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

            {/* MI FINCA VIVA / RED INSTITUCIONAL — la escena del home.
                ─────────────────────────────────────────────────────────────
                Flag VITE_FINCA_VIVA_HOME_PERFIL (fincaVivaHomePerfilActivo):
                  · ON  + extensionista → RED institucional de fincas
                          (FincaRedInstitucional): agregados + mini-escenas por
                          finca supervisada (no la escena de finca única).
                  · ON  + resto          → escena "Finca Viva" por PERFIL,
                          mostrada SIEMPRE (incluso con 0 plantas: la escena lo
                          cubre con su estado "por sembrar" — fix UX; el backdrop
                          por perfil orienta desde el primer uso).
                  · OFF (default)        → comportamiento actual intacto: la
                          escena 2D fenológica solo cuando ya hay algo sembrado
                          (plantsCount > 0), para no competir con el OnboardingHero.
                La tarjeta es autocontenida: lee sus datos de farmProcessCache /
                del tablero del extensionista (offline-first) y abre el destino al
                tocarla. */}
            {fincaVivaFlag ? (
                esExtensionista ? (
                    <div className="px-4 pt-3">
                        <FincaRedInstitucional onNavigate={onNavigate} />
                    </div>
                ) : (
                    <div className="px-4 pt-3">
                        <MiFincaVivaHomeCard onNavigate={onNavigate} />
                    </div>
                )
            ) : (
                plantsCount > 0 && (
                    <div className="px-4 pt-3">
                        <MiFincaVivaHomeCard onNavigate={onNavigate} />
                    </div>
                )
            )}

            {/* Top problemas activos (casos de estudio, DR-044). Rescate huérfano
                2026-06-24: vivía solo en el DashboardView muerto. Se auto-oculta
                si no hay casos activos (retorna null) → zero footprint. Abre
                'casos' al tocarlo. */}
            <div className="px-4 pt-3">
                <CaseStudyTopWidget onNavigate={onNavigate} maxItems={3} />
            </div>

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

            {/* HERRAMIENTAS DE FINCA (Suelo · Semilleros · Seguridad): tiles de
                acceso directo a pantallas completas que NO son secciones del
                grid draggable (no tienen componente en SECTION_COMPONENTS). El
                commit #1827 las agregó por error a NAV_TILES (pantalla de
                navegación de App.jsx), no a ESTE home → no aparecían al loguear
                ("Semilleros=0"). Acá van como su propio bloque navegable. Cada
                tile llama onNavigate(view) → currentView (suelo/germinacion/
                toxicologia), que monta la pantalla real ya existente. */}
            <div className="px-4 pt-3">
                <p className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    <span
                        aria-hidden="true"
                        className="h-3.5 w-1 rounded-full bg-gradient-to-b from-amber-400 to-rose-400"
                    />
                    Herramientas de finca
                </p>
                <div className="grid grid-cols-3 gap-3" data-testid="herramientas-tiles">
                    {HERRAMIENTAS_TILES.map((tile) => (
                        <button
                            key={tile.view}
                            type="button"
                            onClick={() => onNavigate(tile.view, tile.data)}
                            aria-label={`${tile.label}: ${tile.desc}`}
                            className={`bg-slate-900/60 border border-slate-800 border-l-4 ${tile.accent} rounded-xl p-3 text-left min-h-[88px] active:bg-slate-800/70 transition-colors flex flex-col`}
                        >
                            <tile.icon size={24} strokeWidth={2} className={`mb-1.5 ${tile.accent.split(' ')[0]}`} aria-hidden="true" />
                            <span className={`text-sm font-black block leading-tight ${tile.accent.split(' ')[0]}`}>{tile.label}</span>
                            <span className="text-2xs text-slate-500 block mt-0.5 leading-tight">{tile.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* GESTIÓN — acciones de registro sin launcher directo en la home
                (cosechar · insumos aplicados · mantenimiento). Rescate huérfano
                2026-06-24: eran alcanzables solo por back-nav interno o la mano
                (CAPABILITIES_STATUS.md §2). Las rutas ya existen en App.jsx. */}
            <div className="px-4 pt-3">
                <p className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    <span
                        aria-hidden="true"
                        className="h-3.5 w-1 rounded-full bg-gradient-to-b from-sky-400 to-emerald-400"
                    />
                    Registrar en la finca
                </p>
                <div className="grid grid-cols-3 gap-3" data-testid="gestion-tiles">
                    {GESTION_TILES.map((tile) => (
                        <button
                            key={tile.view}
                            type="button"
                            onClick={() => onNavigate(tile.view)}
                            aria-label={`${tile.label}: ${tile.desc}`}
                            className={`bg-slate-900/60 border border-slate-800 border-l-4 ${tile.accent} rounded-xl p-3 text-left min-h-[88px] active:bg-slate-800/70 transition-colors flex flex-col`}
                        >
                            <tile.icon size={24} strokeWidth={2} className={`mb-1.5 ${tile.accent.split(' ')[0]}`} aria-hidden="true" />
                            <span className={`text-sm font-black block leading-tight ${tile.accent.split(' ')[0]}`}>{tile.label}</span>
                            <span className="text-2xs text-slate-500 block mt-0.5 leading-tight">{tile.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* "Campo, Javier" (WorkerDashboard) — rescate huérfano 2026-06-24,
                gateado al OPERADOR (vista de supervisor/trabajador, nicho). La
                ruta #javier sigue viva en el router. Ref: CAPABILITIES_STATUS §2. */}
            {mostrarJavier && (
                <div className="px-4 pt-3">
                    <button
                        type="button"
                        onClick={() => onNavigate('javier')}
                        className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-700/60 bg-slate-900/40 hover:bg-slate-800/50 active:scale-[0.99] transition text-left"
                        aria-label="Campo, Javier: panel de trabajo en finca"
                    >
                        <span className="shrink-0 w-11 h-11 rounded-xl bg-emerald-500/15 grid place-items-center">
                            <Eye size={24} className="text-emerald-300" />
                        </span>
                        <span className="flex-1 min-w-0">
                            <span className="block font-bold text-slate-100 leading-tight">Campo, Javier</span>
                            <span className="block text-xs text-slate-400 leading-tight">
                                Panel de trabajo: tareas por proximidad y registro en finca
                            </span>
                        </span>
                        <ChevronRight size={20} className="text-slate-400/70 shrink-0" />
                    </button>
                </div>
            )}

            {/* MÓDULO ANIMALES (finca integrada): gallinas, cerdos y abejas, con
                el ciclo cerrado (estiércol → biopreparado → suelo → planta) y la
                polinización. Bloque propio, fuera del grid draggable. Gateado por
                perfil: un urbano de balcón no lo ve (mismo criterio del resto). */}
            {mostrarAnimales && (
                <div className="px-4 pt-3">
                    <p className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                        <span
                            aria-hidden="true"
                            className="h-3.5 w-1 rounded-full bg-gradient-to-b from-rose-400 to-pink-400"
                        />
                        Animales de la finca
                    </p>
                    <AnimalesCard onNavigate={onNavigate} variant="list" />
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
