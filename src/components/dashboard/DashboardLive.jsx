/*
 * i18n (ADR-050): DashboardLive.jsx contiene etiquetas de navegación de la home
 * en español Colombia (títulos de tiles/bloques: Suelo, Semilleros, Cosechar,
 * Insumos aplicados, "Registrar en la finca"…) pendientes de migrar a
 * src/config/messages.js. La regla chagra-i18n es soft (warn); se desactiva a
 * nivel de archivo para no bloquear el pre-commit con deuda preexistente —
 * mismo criterio que App.jsx. Los errores reales de ESLint siguen activos.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
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
import { GripVertical, Snowflake, ChevronRight, Layers, TestTube, ShieldAlert, BookOpen, ClipboardList, Recycle, FlaskConical, Wheat, Droplets, Wrench, Eye, CalendarDays, Sprout, HelpCircle, Store, Mic, CloudRain, Leaf, Gauge, Stethoscope } from 'lucide-react';
import AgentHero from './AgentHero';
import OnboardingHero from '../OnboardingHero';
import BienvenidaFinca, { bienvenidaYaVista } from '../BienvenidaFinca';
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
import { esExtensionistaRealActual } from '../../config/extensionistaAccess';
import { fincaVivaHomePerfilActivo } from '../../config/fincaVivaHomeFlag';
import { registroUnificadoActivo } from '../../config/registroUnificadoFlag';
import { PRIMARY_WORKER_NAME } from '../../config/workerConfig';
import SelectedBackgroundReveal from './SelectedBackgroundReveal';
import MiFincaVivaHomeCard from './MiFincaVivaHomeCard';
import FincaRedInstitucional from './FincaRedInstitucional';
import './finca-viva-resto.css';
import './dashboard-resto-redistribucion.css';
// Rescate huérfano 2026-06-24 (descubribilidad): CaseStudyTopWidget vivía solo
// en el DashboardView MUERTO de App.jsx (única vía a `casos`). Se trae a la home
// viva; se auto-oculta si no hay casos activos (KISS, zero footprint). Ref:
// CAPABILITIES_STATUS.md §2.
import CaseStudyTopWidget from '../CaseStudyTopWidget';
import CicloVivoWidget from '../CicloVivo/CicloVivoWidget';
// LOS MUNDOS DE MI FINCA (reestructuración 2.0, V4): el contenedor que agrupa
// las funciones dispersas del home F2 en 9 mundos coherentes (mundosFinca.js).
// Solo se monta con la flag F2 ON; el legacy conserva sus tiles.
import MundosDeMiFinca from './MundosDeMiFinca';
// SELECTOR DEL GUARDIÁN (espíritu de la finca) — portado del mockup aprobado
// #/mockups/avatar-biopunk. Fauna nativa colombiana REAL (grounded), la elección
// persiste en el perfil (userProfileService: guardian_especie). Vive en el menú
// vivo (ambos layouts) para que sea público, no huérfano.
import GuardianEspiritu from './GuardianEspiritu';
import ArbolDeMundos from './ArbolDeMundos';
import ClimaStrip from './ClimaStrip';
import HoyEnFincaStrip from './HoyEnFincaStrip';
import AIStatusFooter from './AIStatusFooter';
import AnalisisProactivoIA from './AnalisisProactivoIA';
// Consolidación BLOQUE 1 (bug UX operador 2026-07-04): las TRES tarjetas del
// estado del día (Hoy en finca + Clima 7d + Análisis IA) se funden en UN card
// compacto — el clima salía DOS veces y "Registrar" quedaba bajo el fold.
import EstadoDelDiaCard from './EstadoDelDiaCard';
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

// PERF-1 (medido 2026-07): FincaVivaHero es dev-only (flag
// VITE_FINCA_VIVA_HOME_PERFIL, ver fincaVivaHomeFlag.js) pero un import
// estático la mete siempre en el chunk de DashboardLive — el home de TODO
// operador en prod, la primera pantalla tras login. Lazy-load: en prod
// (flag OFF, caso normal) su peso nunca se descarga; en dev, se paga una
// sola vez al montar con la flag ON.
const FincaVivaHero = lazy(() => import('./FincaVivaHero'));

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

// Secciones que ya viven FUNDIDAS en la cabecera del día (EstadoDelDiaCard,
// BLOQUE 1). Se excluyen de la grilla de secciones arrastrables para no
// pintarlas dos veces — incluso en perfiles existentes cuyo `modulos_orden`
// guardado aún las lista (redundancia clima+análisis "encimados", #2054).
const FUSED_EN_ESTADO_DEL_DIA = new Set(['hoyfinca', 'clima', 'analisis']);

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

// ───────────────────────────────────────────────────────────────────────────
// REORGANIZACIÓN DEL HOME F2 EN 5 BLOQUES (auditoría botones/distribución
// 2026-06-26, docs/audit-botones-distribucion-2026-06-26.md). Antes el "resto de
// su finca" eran ~44 botones en 10 bloques bajo el fold: un índice del producto,
// no un home. La auditoría lo reordena por el FLUJO MENTAL DEL CAMPESINO
// (estado → tengo → hago → consulto → vendo), con copy concreto campesino:
//
//   BLOQUE 1 "Cómo va su finca hoy" → el día + clima + el aviso de Chagra,
//            FUNDIDOS (antes: dos paneles de IA duplicados — AnalisisProactivoIA
//            "IA local" + AIStatusFooter "Status proactivo IA" — y "Hoy en finca"
//            DUPLICADO: strip `hoyfinca` + tile `hoy`). Sube ARRIBA.
//   BLOQUE 2 "Sus plantas y animales" → plantas, zonas, plagas, asociaciones,
//            flora/fauna + animales (antes 5 superficies de plantas revueltas).
//   BLOQUE 3 "Registrar en la finca" → semilleros, cosechar, abonos e insumos
//            (UNIFICADO), labores, bitácora (GESTION_TILES, el ancla #finca-gestion).
//   BLOQUE 4 "Consultar y aprender" → especies/catálogo, calendario, casos,
//            biopreparados, suelo, seguridad, sacar reportes, FAQ
//            (DESTACADO + APRENDER + reportes). De consulta ocasional.
//   BLOQUE 5 "Vender y comprar" → Mercado (al fondo, ya estaba bien).
//   CONDICIONAL, MÁS ABAJO: "Sus proyectos de finca" (Reforestación /
//            Silvopastoreo / Páramo / Cerdos) — gateado por perfil, BAJADO.
//
// GATE: TODO lo nuevo va tras `fincaVivaHomePerfilActivo()` (flag ON dev / OFF
// prod). Con la flag OFF el home queda EXACTO como hoy (layout legacy intacto:
// grid draggable + AIStatusFooter + los rótulos viejos). Las tablas de tiles
// llevan `labelF2`/`descF2` que SOLO se usan con la flag ON, para que el copy
// campesino no toque prod. Cada tile navega con onNavigate(view, data) →
// currentView (la pantalla real ya existe en App.jsx).
// ───────────────────────────────────────────────────────────────────────────

// 1) DESTACADO — lo más sólido y grounded de Chagra, elevado (§7.2). El
//    directorio (721 especies con clima/asociaciones/plagas groundeadas) y el
//    calendario unificado son superficies 100% AGE/catálogo: el campesino debe
//    distinguirlas como el núcleo fuerte. Se renderizan en tiles GRANDES.
// `labelF2`/`descF2` (opcionales): copy CAMPESINO que se usa SOLO con la home F2
// activa (flag ON). Con la flag OFF se conserva `label`/`desc` tal cual (el
// dashboard legacy queda intacto, audit "flag OFF = home actual"). Así el copy de
// la auditoría no rompe el layout de prod ni sus tests.
const DESTACADO_TILES = [
    // "Mi mata está enferma" — fix de huérfana (auditoría 2026-07: la pantalla
    // SanidadSintomaScreen existía con case 'sanidad_sintoma' + hash #sanidad
    // pero SIN entrada visible en el layout de prod; solo la home F2 flag-ON la
    // listaba en mundosFinca.js). Es la necesidad #1 del campesino y una
    // superficie 100% groundeada (AGROSAVIA/Cenicafé), así que va PRIMERA y a
    // fila completa (span: 2) en el bloque destacado. En F2 NO se duplica: ese
    // layout ya la trae dentro del mundo "Sanidad de la mata".
    { view: 'sanidad_sintoma', span: 2, label: 'Mi mata está enferma', icon: Stethoscope, desc: 'Diga qué le ve — "gota", "polvillo", "amarilla" — y sepa qué es y cómo manejarla sin veneno', accent: 'text-orange-400 border-l-orange-500' },
    { view: 'directorio', label: 'Especies', labelF2: 'Qué puedo sembrar', icon: Sprout, desc: 'Directorio: clima, asociaciones, plagas y biopreparados por especie', descF2: 'Qué crece en su clima, con qué se lleva y sus plagas', accent: 'text-lime-400 border-l-lime-500' },
    // Calendario de finca: UN solo calendario que unifica por planta fenología,
    // nutrición, siembra, cosecha, sanidad y ciclo perenne (App.jsx case
    // 'calendario_finca' → CalendarioFincaScreen). Groundeado en
    // farmCalendarService; reusa los ciclos de la finca y el catálogo.
    { view: 'calendario_finca', label: 'Calendario', labelF2: 'Calendario de la finca', icon: CalendarDays, desc: 'Siembra, abono, plagas y cosecha de su finca en una sola línea de tiempo', descF2: 'Cuándo sembrar, abonar y cosechar, todo junto', accent: 'text-violet-400 border-l-violet-500' },
];

// 2) APRENDER — hub único de contenido/aprendizaje (§7.4 #2). Consolida todas
//    las superficies de aprendizaje que antes vivían sueltas:
//      · aprende        → 5 lecciones agroecológicas con fuente (el hub; sólo en
//                         layout legacy: con F2 el portal "Aprender" del hero ya
//                         entra al hub, así que aquí se filtra para no duplicarlo).
//      · casos          → casos de estudio (antes solo en el DashboardView muerto).
//      · ciclo_nutrientes → ciclo cerrado animal→suelo→planta (antes dentro de
//                         AnimalesScreen).
//      · biopreparados  → galería de recetas paso a paso (antes solo desde el
//                         juego). `data:{back:'dashboard'}` para que Volver regrese
//                         aquí y no al juego (corrige el onBack huérfano).
//      · suelo          → diagnóstico y salud del suelo / micorrizas (contenido).
//      · toxicologia    → seguridad/toxicidad de insumos (contenido de manejo).
//      · faq            → preguntas frecuentes sobre Chagra.
const APRENDER_TILES = [
    { view: 'aprende', label: 'Aprender', icon: BookOpen, desc: 'Lecciones agroecológicas con fuente', accent: 'text-emerald-400 border-l-emerald-500' },
    { view: 'casos', label: 'Casos de estudio', labelF2: 'Casos reales', icon: ClipboardList, desc: 'Problemas reales y su tratamiento', descF2: 'Problemas de otras fincas y cómo los resolvieron', accent: 'text-amber-400 border-l-amber-500' },
    { view: 'ciclo_nutrientes', label: 'Ciclo de nutrientes', icon: Recycle, desc: 'Del animal al suelo y la planta', accent: 'text-emerald-400 border-l-emerald-500' },
    // "Del corral al abono" — mini-app de aprovechamiento del estiércol
    // (olores/gallinaza · biodigestor con calculadora · abonos). Ruta App.jsx
    // 'estiercol'. Vecino natural del ciclo de nutrientes: lo hace accionable.
    { view: 'estiercol', label: 'Del corral al abono', labelF2: 'Del corral al abono', icon: Leaf, desc: 'Aproveche el estiércol: sin olores, biogás y abono', descF2: 'Quítele el olor al estiércol y sáquele abono y gas', accent: 'text-lime-400 border-l-lime-500' },
    { view: 'biopreparados', label: 'Biopreparados', icon: FlaskConical, desc: 'Recetas caseras paso a paso', accent: 'text-lime-400 border-l-lime-500', data: { back: 'dashboard' } },
    { view: 'suelo', label: 'Suelo', icon: Layers, desc: 'Salud del suelo y micorrizas', descF2: 'Cómo está su tierra y cómo cuidarla', accent: 'text-amber-400 border-l-amber-500' },
    // Módulo "Agua de la finca" (cosecha de lluvia + riego con medida +
    // cuidar el nacimiento). Ruta real: App.jsx case 'agua' / #agua.
    { view: 'agua', label: 'Agua', labelF2: 'El agua de su finca', icon: CloudRain, desc: 'Cosechar lluvia, regar con medida y cuidar el nacimiento', descF2: 'Coseche la lluvia, riegue con medida y cuide su nacimiento', accent: 'text-cyan-400 border-l-cyan-500' },
    // Cuaderno del Suelo (módulo Salud del Suelo): leer el análisis de laboratorio
    // (pH, MO, N-P-K, aluminio), calculadora de encalado determinista y mejora del
    // suelo. Complementa la ruta 'suelo' (diagnóstico folk sin laboratorio) y
    // enlaza a la cromatografía + micorrizas del grafo, sin reimplementarlas.
    { view: 'salud_suelo', label: 'Cuaderno del Suelo', icon: Gauge, desc: 'Leer el análisis, encalar y mejorar la tierra', descF2: 'Cómo está su tierra, corregir la acidez y mejorarla', accent: 'text-emerald-400 border-l-emerald-500' },
    { view: 'toxicologia', label: 'Seguridad', icon: ShieldAlert, desc: 'Toxicidad de insumos y riesgo', descF2: 'Qué es peligroso y cómo cuidarse', accent: 'text-rose-400 border-l-rose-500' },
    { view: 'faq', label: 'Preguntas frecuentes', icon: HelpCircle, desc: 'Cómo funciona Chagra', accent: 'text-violet-400 border-l-violet-500' },
];

// Reportes ("Sacar reportes", ruta 'informes'): con la reestructuración 2.0
// vive DENTRO del mundo "Mercado y despensa" (mundosFinca.js) — ya no es un
// tile suelto del home F2. El legacy (flag OFF) lo conserva vía InformesCard.

// 3) GESTIÓN — "Mi finca": registros y acciones de manejo, sin launcher directo
//    antes (huérfanas o solo por la mano). Semilleros entra aquí (es gestión de
//    siembra, no contenido). Accesible pero de-enfatizado respecto a lo fuerte.
// El copy campesino (labelF2/descF2) SOLO aplica con la home F2 ON; con OFF se
// conservan label/desc legacy intactos (prod no cambia).
const GESTION_TILES = [
    { view: 'germinacion', label: 'Semilleros', icon: TestTube, desc: 'Prueba de semillas y germinación', descF2: 'Pruebe sus semillas y vea cuáles nacen', accent: 'text-teal-400 border-l-teal-500' },
    { view: 'cosechar', label: 'Cosechar', icon: Wheat, desc: 'Registrar una cosecha', descF2: 'Anote lo que recogió', accent: 'text-amber-400 border-l-amber-500' },
    // "Abonos e insumos" (F2) UNIFICA lo que antes eran dos puertas solapadas
    // (audit §3.1): "Insumos aplicados" (registrar la aplicación) y la tarjeta
    // "Insumos" del vistazo (ver el inventario). Una sola entrada, dos acciones.
    { view: 'insumos', label: 'Insumos aplicados', labelF2: 'Abonos e insumos', icon: Droplets, desc: 'Registrar una aplicación de bioinsumo', descF2: 'Anote un abono o aplicación y vea lo que tiene', accent: 'text-sky-400 border-l-sky-500' },
    { view: 'mantenimiento', label: 'Mantenimiento', labelF2: 'Labores de la finca', icon: Wrench, desc: 'Labores de mantenimiento de la finca', descF2: 'Arreglos, limpias y mantenimiento', accent: 'text-slate-300 border-l-slate-500' },
];

// 4) MERCADO — marketplace de circuitos cortos. BAJADO (§7.2): la fachada de
//    precio (SIPSA) es la capa más delgada hoy, así que va al fondo, en su
//    propio rótulo discreto, no mezclado con lo fuerte. Sigue siendo el segundo
//    punto de entrada además de la rama "Vender" de la mano radial.
const MERCADO_TILE = { view: 'mercado', label: 'Mercado', icon: Store, desc: 'Vende y compra directo entre fincas, sin intermediarios', accent: 'text-emerald-400 border-l-emerald-500' };

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

export default function DashboardLive({ onNavigate, regionalGreeting = null, onLogout = null }) {
    // `onLogout` solo lo recibe el shell F2 (la barra del hero gestiona perfil);
    // el dashboard legacy lo ignora. Lo referenciamos para no marcar unused.
    void onLogout;
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
    // Rescate huérfano 2026-06-24 (descubribilidad): el panel "Campo,
    // <trabajador>" (WorkerDashboard) era HUÉRFANO — solo accesible desde el
    // NAV_TILES del DashboardView muerto o por #campo_trabajador. Es una vista de
    // SUPERVISOR/trabajador (nicho), así que la exponemos gateada al OPERADOR (no
    // se la mostramos al campesino dueño para no ensuciar la home). La ruta
    // #campo_trabajador sigue viva en el router. Ref: CAPABILITIES_STATUS.md §2.
    const [mostrarCampoPanel] = useState(() => {
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
    // Bienvenida de PRIMERA VEZ (BienvenidaFinca): recorrido de 5 momentos
    // (colibrí + capacidades estrella + "hola Chagra" manos-libres +
    // instalar la app + ubicación mágica) que se muestra UNA
    // sola vez, con la MISMA señal de primer uso del banner compacto (sin
    // plantas y sin piso) + flag persistente "ya la vi". Capa 100% visual:
    // "Ubicar mi finca" delega en la ruta existente 'ubicacion-detectada';
    // al saltar queda el flujo de siempre (banner del piso térmico).
    const [showBienvenida, setShowBienvenida] = useState(
        () => plantsCount === 0 && needsPisoCapture && !bienvenidaYaVista(),
    );

    // HOME "Finca Viva" por perfil (flag VITE_FINCA_VIVA_HOME_PERFIL). Se evalúa
    // una vez al montar. Con la flag ON: (1) la escena de la finca se muestra
    // SIEMPRE — incluso con 0 plantas, que la propia escena cubre con su estado
    // "por sembrar" (fix UX: la escena por perfil orienta desde el primer uso);
    // (2) si el usuario es extensionista REAL (flag + whitelist, SIN bypass de
    // operador), se monta la RED institucional de fincas en vez de la escena de
    // finca única. Con la flag OFF (default), el home conserva su comportamiento
    // actual.
    const [fincaVivaFlag] = useState(() => fincaVivaHomePerfilActivo());
    // Registro unificado (#23): con la flag ON, el bloque "Registrar en la finca"
    // muestra UNA sola puerta (→ registro_unificado) en vez de los tiles sueltos.
    const [registroUnifFlag] = useState(() => registroUnificadoActivo());
    // HOTFIX P0 2026-07-04 (escena del home VACÍA en prod): aquí va el rol REAL
    // (esExtensionistaRealActual), NO esExtensionistaActual. El bypass del
    // operador de esExtensionista() convertía al operador en "extensionista" en
    // el build de prod (VITE_OPERATOR_USERNAME baked) y su home montaba la red
    // institucional (vacía para él) en vez de la escena de SU finca → área de
    // escena en blanco en TODOS los temas. El bypass sigue vigente donde
    // corresponde: la ruta #extensionista (App.jsx) y su entrada en Perfil.
    const [esExtensionista] = useState(() => {
        try { return esExtensionistaRealActual(); } catch (_) { return false; }
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

    // Portal "Gestionar" del hero F2 → la GESTIÓN de la finca (registrar y cuidar
    // siembras, zonas y animales) vive como la sección #finca-gestion en ESTA
    // misma página, bajo el hero. La revelamos con un scroll suave (no es otra
    // vista; antes el portal navegaba por error al juego). Movemos también el
    // foco al rótulo de la sección para teclado y lector de pantalla.
    const revelarGestion = useCallback(() => {
        if (typeof document === 'undefined') return;
        const seccion = document.getElementById('finca-gestion');
        if (!seccion) return;
        if (seccion.scrollIntoView) seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (seccion.focus) {
            try { seccion.focus({ preventScroll: true }); } catch (_) { /* preventScroll no soportado */ }
        }
    }, []);

    // LOS MUNDOS PLEGADOS (usabilidad campesina #5): la grilla completa de
    // mundos (~13 tarjetas + ~35 chips) ya no está siempre abierta en el home
    // — el primer pantallazo son las 6 PUERTAS del hero. "Toda mi finca" (la
    // sexta puerta) o el botón ancho del bloque la despliegan. Todo sigue
    // alcanzable con UN toque; MundosDeMiFinca no cambia.
    const [mundosAbiertos, setMundosAbiertos] = useState(false);
    const revelarMundos = useCallback(() => {
        setMundosAbiertos(true);
        if (typeof document === 'undefined') return;
        // El scroll corre tras el render del bloque expandido.
        requestAnimationFrame(() => {
            const seccion = document.getElementById('bloque-mundos');
            if (seccion?.scrollIntoView) seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, []);

    // ── Helpers de render (compartidos entre el layout F2 y el legacy) ────────
    // Rótulo de bloque con la barrita de color. Función pura que DEVUELVE JSX (no
    // un componente, para no violar react-hooks/static-components al definirlo
    // dentro del render). Con F2 ON usa la tinta clara de la hoja
    // (.fvh-block-label); con OFF, el gris legacy. `bar` es la clase de gradiente
    // COMPLETA y ESTÁTICA (no construida con template) para que el scanner de
    // Tailwind la detecte y no la purgue del build.
    const blockLabel = (children, bar = 'from-emerald-400 to-teal-400') => (
        <p className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2.5 ${fincaVivaFlag ? 'fvh-block-label' : 'text-slate-400'}`}>
            <span aria-hidden="true" className={`h-3.5 w-1 rounded-full bg-gradient-to-b ${bar}`} />
            {children}
        </p>
    );

    // El texto del tile: copy CAMPESINO (labelF2/descF2) solo con la home F2 ON;
    // con OFF, el label/desc original (audit: "flag OFF = home actual intacto").
    const tileLabel = (tile) => (fincaVivaFlag && tile.labelF2) ? tile.labelF2 : tile.label;
    const tileDesc = (tile) => (fincaVivaFlag && tile.descF2) ? tile.descF2 : tile.desc;

    // Tile estándar (chico) — reusa el ESTILO único de los tiles del resto
    // (mismo fix de contraste F2: .fvh-tile-label/.fvh-tile-desc fuerzan tinta
    // oscura sobre el pastel claro). `size` cambia ícono y altura.
    // `i` = índice dentro de su grid: escalona la entrada (anim-brota, mismo
    // lenguaje "brota" de las tarjetas de Mundos) y anim-press da el
    // hundimiento sutil al tocar. Ambos se apagan con prefers-reduced-motion.
    const renderTile = (tile, { large = false, i = 0 } = {}) => (
        <button
            key={tile.view}
            type="button"
            onClick={() => onNavigate(tile.view, tile.data)}
            aria-label={`${tileLabel(tile)}: ${tileDesc(tile)}`}
            style={{ '--i': i }}
            className={`dash-tile anim-brota anim-press ${large ? 'dash-tile--destacado ' : ''}${tile.span === 2 ? 'col-span-2 ' : ''}${fincaVivaFlag ? 'fvh-tile-claro' : 'bg-slate-900/60'} border border-slate-800 border-l-4 ${tile.accent} ${large ? 'rounded-2xl p-4 min-h-[112px]' : 'rounded-xl p-3 min-h-[88px]'} text-left active:bg-slate-800/70 transition-colors flex flex-col`}
        >
            <tile.icon size={large ? 30 : 24} strokeWidth={2} className={`${large ? 'mb-2' : 'mb-1.5'} ${tile.accent.split(' ')[0]}`} aria-hidden="true" />
            <span className={`${large ? 'text-base' : 'text-sm'} font-black block leading-tight fvh-tile-label ${tile.accent.split(' ')[0]}`}>{tileLabel(tile)}</span>
            {/* a11y AA: la desc era text-slate-500 sobre slate-900 (~3.4:1, falla
                contraste en texto pequeño). slate-400 da ~7:1 sin cambiar jerarquía. */}
            <span className={`${large ? 'text-xs mt-1 leading-snug' : 'text-2xs mt-0.5 leading-tight'} block fvh-tile-desc ${fincaVivaFlag ? '' : 'text-slate-400'}`}>{tileDesc(tile)}</span>
        </button>
    );

    // El bloque de Mercado (tile ancho) — idéntico en ambos layouts.
    const renderMercado = () => (
        <div className={`px-4 pt-3 ${fincaVivaFlag ? 'fvh-resto-block' : ''}`}>
            {blockLabel('Vender y comprar', 'from-emerald-400 to-lime-400')}
            <div className="grid grid-cols-1 gap-3" data-testid="mercado-tiles">
                <button
                    type="button"
                    onClick={() => onNavigate(MERCADO_TILE.view, MERCADO_TILE.data)}
                    aria-label={`${MERCADO_TILE.label}: ${MERCADO_TILE.desc}`}
                    className={`dash-tile anim-brota anim-press ${fincaVivaFlag ? 'fvh-tile-claro' : 'bg-slate-900/60'} border border-slate-800 border-l-4 ${MERCADO_TILE.accent} rounded-xl p-3.5 text-left active:bg-slate-800/70 transition-colors flex items-center gap-3`}
                >
                    <MERCADO_TILE.icon size={26} strokeWidth={2} className={`${MERCADO_TILE.accent.split(' ')[0]} shrink-0`} aria-hidden="true" />
                    <span className="flex-1 min-w-0">
                        <span className={`text-sm font-black block leading-tight fvh-tile-label ${MERCADO_TILE.accent.split(' ')[0]}`}>{MERCADO_TILE.label}</span>
                        <span className={`text-2xs block mt-0.5 leading-tight fvh-tile-desc ${fincaVivaFlag ? '' : 'text-slate-400'}`}>{MERCADO_TILE.desc}</span>
                    </span>
                    <ChevronRight size={18} className={`shrink-0 ${MERCADO_TILE.accent.split(' ')[0]} opacity-70`} aria-hidden="true" />
                </button>
            </div>
        </div>
    );

    // Banner "Campo, <trabajador>" (gateado al operador) — idéntico en ambos layouts.
    const renderCampoPanel = () => (mostrarCampoPanel && (
        <div className={`px-4 pt-3 ${fincaVivaFlag ? 'fvh-resto-block' : ''}`}>
            <button
                type="button"
                onClick={() => onNavigate('campo_trabajador')}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-700/60 bg-slate-900/40 hover:bg-slate-800/50 active:scale-[0.99] transition text-left"
                aria-label={`Campo, ${PRIMARY_WORKER_NAME}: panel de trabajo en finca`}
            >
                <span className="shrink-0 w-11 h-11 rounded-xl bg-emerald-500/15 grid place-items-center">
                    <Eye size={24} className="text-emerald-300" />
                </span>
                <span className="flex-1 min-w-0">
                    <span className="block font-bold text-slate-100 leading-tight">Campo, {PRIMARY_WORKER_NAME}</span>
                    <span className="block text-xs text-slate-400 leading-tight">
                        Panel de trabajo: tareas por proximidad y registro en finca
                    </span>
                </span>
                <ChevronRight size={20} className="text-slate-400/70 shrink-0" />
            </button>
        </div>
    ));

    // Bloque CONDICIONAL "Sus proyectos de finca" (antes "Seguimiento de
    // procesos"): Reforestación · Silvopastoreo · Páramo · Cerdos. Gateado por
    // perfil (un urbano no lo ve). En F2 BAJA (audit: es de nicho, no roba el
    // primer scroll); con OFF conserva su posición/rótulo legacy.
    const renderSeguimiento = ({ f2 } = /** @type {any} */ ({})) => ((seguimientoKeys === null || seguimientoKeys.length > 0) && (
        <div className={`px-4 pt-3 ${fincaVivaFlag ? 'fvh-resto-block' : ''}`}>
            {blockLabel(f2 ? 'Sus proyectos de finca' : 'Seguimiento de procesos', 'from-emerald-400 to-teal-400')}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="seguimiento-cards">
                <SeguimientoCards onNavigate={onNavigate} variant="grid" keys={seguimientoKeys} />
            </div>
        </div>
    ));

    return (
        <div
            className="relative flex flex-col w-full h-full overflow-y-auto pb-6"
            data-scroll-key="dashboard-live"
        >
            {/* BIENVENIDA de primera vez — overlay a pantalla completa SOBRE
                cualquiera de las dos portadas (AgentHero / Finca Viva). Solo
                se monta en el verdadero primer uso y una sola vez (flag en
                localStorage dentro del componente). */}
            {showBienvenida && (
                <BienvenidaFinca
                    onUbicar={() => {
                        setShowBienvenida(false);
                        onNavigate('ubicacion-detectada');
                    }}
                    onClose={() => setShowBienvenida(false)}
                    onExplorarEjemplo={async () => {
                        // SKIP rico: sembrar la finca de ejemplo (multi-piso,
                        // grounded al catálogo) y quedarse en el home, que la
                        // renderiza POBLADA sin recargar (seedExampleFinca
                        // re-hidrata el asset store). Import perezoso: no pesa en
                        // el bundle del dashboard salvo que se use.
                        try {
                            const { seedExampleFinca } = await import('../../services/demoFincaEjemplo');
                            await seedExampleFinca();
                        } catch (err) {
                            console.error('[DashboardLive] No se pudo sembrar la finca de ejemplo:', err);
                        }
                        setShowBienvenida(false);
                    }}
                />
            )}
            {/* PORTADA del home — depende de la flag VITE_FINCA_VIVA_HOME_PERFIL:
                ─────────────────────────────────────────────────────────────────
                · Flag ON  → la ESCENA ISOMÉTRICA "Finca Viva" (mockup F2) es el
                  HERO inmersivo: lo PRIMERO que se ve (≈100dvh), con los 4
                  portales como lugares y el agente DEGRADADO a un acceso flotante
                  ("Pregúntale a Chagra"). El AgentHero deja de ser la portada.
                  Para el extensionista la escena se reemplaza por la RED
                  institucional (mismo shell F2). El estado vacío (0 plantas) se ve
                  igual de inmersivo ("por sembrar"), nunca como una tarjeta.
                · Flag OFF → comportamiento ACTUAL intacto (prod seguro): el
                  AgentHero es la PORTADA INMERSIVA a pantalla completa (≈100dvh) y
                  el banner de onboarding flota sobre él.
                ───────────────────────────────────────────────────────────────── */}
            {fincaVivaFlag ? (
                <Suspense fallback={<div className="h-[100dvh]" />}>
                    <FincaVivaHero
                        onNavigate={onNavigate}
                        onOpenAgent={() => onNavigate('agente')}
                        onGestionar={revelarGestion}
                        onTodaMiFinca={revelarMundos}
                        titulo={esExtensionista ? 'Red de fincas que acompaño' : 'Mi finca viva'}
                    >
                        {esExtensionista ? (
                            <div className="absolute inset-0 overflow-y-auto px-3 pt-[calc(env(safe-area-inset-top)+108px)] pb-4">
                                <FincaRedInstitucional onNavigate={onNavigate} />
                            </div>
                        ) : null}
                    </FincaVivaHero>
                </Suspense>
            ) : (
                <>
                    {/* Primer uso sin piso confirmado: BANNER compacto del Paso 1
                        (piso térmico) flotando SOBRE la zona decorativa superior
                        del AgentHero, justo bajo el TopBar flotante. Es un OVERLAY
                        (absolute) a propósito (regresión 2026-06-13): montarlo en
                        el flujo flex EMPUJABA el AgentHero ≈100dvh hacia arriba y,
                        al abrir la araña, su fila superior de nodos quedaba TAPADA
                        por el TopBar flotante (los clics aterrizaban en el
                        TopBar). Como overlay no desplaza al hero: la araña
                        conserva su geometría y sigue alcanzable. Las 3 rutas de
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
                </>
            )}

            {/* ════════════════════════════════════════════════════════════════
                "EL RESTO DE SU FINCA" — la hoja cohesiva bajo el hero.
                ────────────────────────────────────────────────────────────────
                Con la flag F2 ON, TODO lo que sigue se consolida en UNA hoja
                clara (.fvh-resto) que sube desde el hero — sin un segundo
                AgentHero, sin un segundo set de portales (los 4 viven en el
                hero), sin un segundo saludo. Sólo el INVENTARIO de un vistazo +
                herramientas + casos + seguimiento + animales. Con la flag OFF,
                el wrapper es pass-through (clase vacía): el dashboard legacy
                queda intacto.

                El extensionista/operador ve la RED institucional como PORTADA
                del hero y, DEBAJO, esta MISMA hoja (aditiva) con "Los mundos de
                mi finca": la red no reemplaza ni oculta el home — se suma. Antes
                un gate `esExtensionista ? null` borraba la hoja completa y el
                operador (que es extensionista por bypass) se quedaba SIN los
                mundos; ahora la hoja se renderiza para todos los perfiles.
                ════════════════════════════════════════════════════════════ */}
            <div className={fincaVivaFlag ? 'fvh-resto' : 'contents'} data-testid={fincaVivaFlag ? 'fvh-resto' : undefined}>
            <div className={fincaVivaFlag ? 'fvh-resto-shell' : 'contents'}>

            {/* Acceso al módulo "Reporte de Punto Glaciar" (guías de glaciar).
                Ruta #glaciar. ACCESO RESTRINGIDO a los beta testers de "La
                Cordada": el banner solo se renderiza si el usuario logueado
                está en la whitelist (src/config/glaciarAccess.js). Para el resto
                de usuarios el módulo es invisible. Offline-first (lee el usuario
                ya guardado en login, sin red). Va arriba en ambos layouts. */}
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

            {/* SU GUARDIÁN — el espíritu de la finca (mockup #/mockups/avatar-biopunk).
                Vive en el menú vivo en AMBOS layouts (F2 y legacy/prod) para que sea
                público y no huérfano. Especies nativas colombianas REALES (grounded);
                la elección PERSISTE en el perfil (guardian_especie) y re-tiñe su
                propio HUD + emite chagra:guardian-changed para el saludo/espíritu. */}
            <div className="px-4 pt-3 fvh-resto-block" data-testid="bloque-guardian">
                {blockLabel('Su guardián', 'from-teal-400 to-violet-400')}
                <GuardianEspiritu />
            </div>

            {fincaVivaFlag ? (
            /* ════════════════════════════════════════════════════════════════
               HOME F2 — REESTRUCTURACIÓN 2.0 "LOS MUNDOS DE MI FINCA" (V4).
               Flujo: cómo va la finca (estado) → registrar (la acción diaria,
               voz-primero, ancla del portal "Mi finca") → LOS MUNDOS (todas las
               herramientas agrupadas en 9 lugares coherentes, mundosFinca.js)
               → ciclo vivo + casos → pie (FAQ/Ayuda). Reemplaza los 5 bloques
               del audit 2026-06-26 (las tiles de consultar/aprender, mercado,
               inventario suelto y seguimiento viven ahora DENTRO de sus
               mundos). Solo activo con la flag ON; el legacy (else) intacto.
               ════════════════════════════════════════════════════════════════ */
            <>
                {/* ── BLOQUE 1 · "Cómo va su finca hoy" ───────────────────────
                    UN solo card compacto (EstadoDelDiaCard, bug UX 2026-07-04):
                    antes eran TRES tarjetas apiladas (HoyEnFincaStrip +
                    ClimaStrip + AnalisisProactivoIA) que repetían el clima DOS
                    veces y empujaban "Registrar en la finca" bajo el fold.
                    Ahora: cabecera del día (clima HOY una sola vez) + tira de
                    7 días colapsable + el aviso de Chagra con CTA al agente,
                    todo dentro de una sola cáscara. El AIStatusFooter sigue
                    SIN montarse en F2 (su idea ES este bloque). Los tres
                    componentes viven intactos en modo `embedded` — misma
                    lógica de datos, solo cambió la capa visual. */}
                <div className="px-4 pt-3 fvh-resto-block" data-testid="bloque-finca-hoy">
                    {blockLabel('Cómo va su finca hoy', 'from-cyan-400 to-emerald-400')}
                    <EstadoDelDiaCard onNavigate={onNavigate} sensors={iotAlerts} />
                </div>

                {/* ── BLOQUE 2 · "Registrar en la finca" ──────────────────────
                    El bloque de ACCIÓN: semilleros, cosechar, abonos e insumos
                    (UNIFICA los dos insumos que se solapaban, audit §3.1), labores
                    y la bitácora. Conserva el ancla #finca-gestion: el portal "Mi
                    finca" del hero hace scroll hasta aquí (revelarGestion). El
                    botón único de voz (#23) no se toca: solo cambia la
                    organización/labels. */}
                <div
                    id="finca-gestion"
                    tabIndex={-1}
                    style={{ scrollMarginTop: '88px', outline: 'none' }}
                    className="px-4 pt-3 fvh-resto-block"
                    data-testid="bloque-registrar"
                >
                    {blockLabel('Registrar en la finca', 'from-sky-400 to-emerald-400')}
                    {registroUnifFlag ? (
                        // PUERTA ÚNICA (#23): una sola "Registrar" voz-primero
                        // reemplaza Cosechar/Insumos/Labores. Semilleros (prueba de
                        // germinación, una herramienta, no un "registrar lo que hice")
                        // queda como acceso secundario. El bloque pasa a tener UNA
                        // entrada visible de registro, no cinco.
                        <>
                            <button
                                type="button"
                                onClick={() => onNavigate('registro_unificado')}
                                aria-label="Registrar: cuéntame qué hiciste en la finca por voz o a mano"
                                data-testid="tile-registrar-unificado"
                                className={`w-full dash-tile ${fincaVivaFlag ? 'fvh-tile-claro' : 'bg-slate-900/60'} border border-slate-800 border-l-4 border-l-lime-500 rounded-2xl p-4 min-h-[112px] text-left active:bg-slate-800/70 transition-colors flex items-center gap-4`}
                            >
                                <span aria-hidden="true" className="shrink-0 w-14 h-14 rounded-2xl bg-lime-700/20 border border-lime-600/40 flex items-center justify-center">
                                    <Mic size={28} className="text-lime-400" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="text-lg font-black block leading-tight fvh-tile-label text-lime-400">Registrar</span>
                                    <span className={`text-xs mt-1 leading-snug block fvh-tile-desc ${fincaVivaFlag ? '' : 'text-slate-400'}`}>
                                        Cuéntame qué hiciste hoy: cosecha, abono, labor, lo que vio o una plaga. Por voz o a mano.
                                    </span>
                                </span>
                                <ChevronRight size={22} className="shrink-0 text-slate-500" aria-hidden="true" />
                            </button>
                            <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-3 mt-3" data-testid="gestion-tiles">
                                {GESTION_TILES.filter((t) => t.view === 'germinacion').map((tile, i) => renderTile(tile, { i }))}
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-3" data-testid="gestion-tiles">
                            {GESTION_TILES.map((tile, i) => renderTile(tile, { i }))}
                        </div>
                    )}
                    <div className="mt-3">
                        <BitacoraCard onNavigate={onNavigate} variant="list" />
                    </div>
                </div>

                {/* ── BLOQUE 3 · LOS MUNDOS DE SU FINCA (reestructuración 2.0) ─
                    EL contenedor: reemplaza la caja de herramientas regada de
                    antes (tiles de consultar/aprender + inventario suelto +
                    mercado + seguimiento) por 9 mundos coherentes. Cada función
                    vieja vive DENTRO de su mundo (mundosFinca.js es la fuente
                    única; el test de reachability congela el contrato). El gate
                    de Animales por perfil se conserva (mostrarAnimales). */}
                <div id="bloque-mundos" className="px-4 pt-4 fvh-resto-block" data-testid="bloque-mundos" style={{ scrollMarginTop: '88px' }}>
                    {mundosAbiertos ? (
                        <>
                            {/* EL ÁRBOL DE SU FINCA (vista rica del tema biopunk,
                                mockup aprobado #/mockups/avatar-biopunk): los mismos
                                mundos como RAMAS VIVAS que brotan del corazón + el
                                RELOJ DEL FRAILEJÓN (años reales, un anillo por año).
                                Fuente única y rutas = mundosFinca.js; en temas
                                no-biopunk devuelve null. La grilla de abajo queda
                                INTACTA (fallback simple y contrato de
                                reachability). */}
                            <ArbolDeMundos
                                onNavigate={onNavigate}
                                mostrarAnimales={mostrarAnimales}
                                plantsCount={plantsCount}
                            />
                            <MundosDeMiFinca
                                onNavigate={onNavigate}
                                mostrarAnimales={mostrarAnimales}
                                plantsCount={plantsCount}
                            />
                        </>
                    ) : (
                        // PLEGADO (default): una sola puerta ancha ≥96px. La
                        // grilla completa se abre aquí o desde la puerta "Toda
                        // mi finca" del hero (revelarMundos).
                        <button
                            type="button"
                            data-testid="abrir-mundos"
                            onClick={revelarMundos}
                            aria-expanded={false}
                            aria-label="Toda mi finca: abrir todos los mundos de su finca"
                            className={`w-full dash-tile ${fincaVivaFlag ? 'fvh-tile-claro' : 'bg-slate-900/60'} border border-slate-800 border-l-4 border-l-teal-500 rounded-2xl p-4 min-h-[96px] text-left active:bg-slate-800/70 transition-colors flex items-center gap-4`}
                        >
                            <span aria-hidden="true" className="shrink-0 w-14 h-14 rounded-2xl bg-teal-700/20 border border-teal-600/40 flex items-center justify-center text-3xl">
                                🏡
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="text-lg font-black block leading-tight fvh-tile-label text-teal-500">Toda mi finca</span>
                                <span className={`text-xs mt-1 leading-snug block fvh-tile-desc ${fincaVivaFlag ? '' : 'text-slate-400'}`}>
                                    Todos los mundos: suelo, agua, sanidad, mercado y más
                                </span>
                            </span>
                            <ChevronRight size={22} className="shrink-0 text-slate-500" aria-hidden="true" />
                        </button>
                    )}
                </div>

                {/* El Ciclo Vivo: portal a la rueda de las 7 fases. Estado real
                    por función desde chagra-stats.json (se enciende solo). */}
                <div className="px-4 pt-3 fvh-resto-block">
                    {blockLabel('El ciclo de su cultivo', 'from-amber-400 to-lime-400')}
                    <CicloVivoWidget onNavigate={onNavigate} />
                </div>

                {/* Top problemas activos (casos de estudio, DR-044). Se auto-oculta
                    si no hay casos → zero footprint. */}
                <div className="px-4 pt-3 fvh-resto-block">
                    <CaseStudyTopWidget onNavigate={onNavigate} maxItems={3} />
                </div>

                {/* "Campo, <trabajador>" (gateado al operador), al fondo. */}
                {renderCampoPanel()}

                {/* Pie del cuaderno: ayuda y preguntas frecuentes, discretas
                    pero siempre alcanzables (antes "Preguntas frecuentes" era
                    un tile de Consultar; el mundo no las necesita). */}
                <div className="px-4 pt-4 pb-2 flex items-center justify-center gap-2 fvh-resto-block" data-testid="footer-ayuda">
                    <button
                        type="button"
                        onClick={() => onNavigate('faq')}
                        className="text-xs font-bold underline underline-offset-2 fvh-block-label"
                    >
                        Preguntas frecuentes
                    </button>
                    <span aria-hidden="true" className="fvh-block-label">·</span>
                    <button
                        type="button"
                        onClick={() => onNavigate('ayuda')}
                        className="text-xs font-bold underline underline-offset-2 fvh-block-label"
                    >
                        Ayuda
                    </button>
                    <span aria-hidden="true" className="fvh-block-label">·</span>
                    {/* "Jugar" conserva su entrada en el home: antes era uno de
                        los 4 portales del hero (reemplazados por las 6 puertas);
                        el juego sigue alcanzable desde aquí. */}
                    <button
                        type="button"
                        onClick={() => onNavigate('juego')}
                        className="text-xs font-bold underline underline-offset-2 fvh-block-label"
                    >
                        Jugar
                    </button>
                </div>
            </>
            ) : (
            /* ════════════════════════════════════════════════════════════════
               LAYOUT LEGACY (flag OFF) — EXACTAMENTE como hoy en prod. NO tocar:
               el grid draggable + AIStatusFooter + los rótulos y el orden viejos.
               ════════════════════════════════════════════════════════════════ */
            <>
            {/* Paisaje elegido — la foto de biodiversidad seleccionada. */}
            <SelectedBackgroundReveal />

            {/* MI FINCA VIVA — la escena 2D fenológica como TARJETA, solo cuando
                ya hay algo sembrado (plantsCount > 0). */}
            {plantsCount > 0 && (
                <div className="px-4 pt-3">
                    <MiFincaVivaHomeCard onNavigate={onNavigate} />
                </div>
            )}

            {/* El Ciclo Vivo: portal a la rueda de las 7 fases (estado real por
                función desde chagra-stats.json). */}
            <div className="px-4 pt-3">
                <CicloVivoWidget onNavigate={onNavigate} />
            </div>

            {/* Top problemas activos (casos de estudio). */}
            <div className="px-4 pt-3">
                <CaseStudyTopWidget onNavigate={onNavigate} maxItems={3} />
            </div>

            {/* Seguimiento de procesos — gateado por perfil. */}
            {renderSeguimiento()}

            {/* DESTACADO — "Lo más sólido de Chagra": especies + calendario. */}
            <div className="px-4 pt-3">
                {blockLabel('Lo más sólido de Chagra', 'from-lime-400 to-emerald-400')}
                <div className="grid grid-cols-2 gap-3" data-testid="destacado-tiles">
                    {DESTACADO_TILES.map((tile, i) => renderTile(tile, { large: true, i }))}
                </div>
            </div>

            {/* APRENDER — hub único de contenido (con OFF SÍ incluye 'aprende'). */}
            <div className="px-4 pt-3">
                {blockLabel('Aprender', 'from-emerald-400 to-teal-400')}
                <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-3" data-testid="aprender-tiles">
                    {APRENDER_TILES.map((tile, i) => renderTile(tile, { i }))}
                </div>
            </div>

            {/* GESTIÓN — "Mi finca · gestión" (ancla #finca-gestion). */}
            <div
                id="finca-gestion"
                tabIndex={-1}
                style={{ scrollMarginTop: '88px', outline: 'none' }}
                className="px-4 pt-3"
            >
                {blockLabel('Mi finca · gestión', 'from-sky-400 to-emerald-400')}
                <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-3" data-testid="gestion-tiles">
                    {GESTION_TILES.map((tile, i) => renderTile(tile, { i }))}
                </div>
            </div>

            {/* MERCADO. */}
            {renderMercado()}

            {/* "Campo, <trabajador>" (gateado al operador). */}
            {renderCampoPanel()}

            {/* MÓDULO ANIMALES — gateado por perfil. */}
            {mostrarAnimales && (
                <div className="px-4 pt-3">
                    {blockLabel('Animales de la finca', 'from-rose-400 to-pink-400')}
                    <AnimalesCard onNavigate={onNavigate} variant="list" />
                </div>
            )}

            {/* Saludo regional dismissible — bajo el fold. */}
            {regionalGreeting}

            {/* Primer uso con piso ya confirmado: las 3 rutas de registro. */}
            {plantsCount === 0 && !needsPisoCapture && (
                <div className="px-4 pt-3">
                    <OnboardingHero onNavigate={onNavigate} />
                </div>
            )}

            {/* Secciones drag-reorder — el INVENTARIO de un vistazo. */}
            <div className="px-4 pt-3 pb-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={order} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {order
                                .filter((id) => !FUSED_EN_ESTADO_DEL_DIA.has(id))
                                .filter((id) => moduleVisibility[id] !== false)
                                .map((id) => (
                                    <SortableSection key={id} id={id} onNavigate={onNavigate} sensors={iotAlerts} />
                                ))}
                        </div>
                    </SortableContext>
                </DndContext>

                {/* a11y AA: slate-600 a 10px daba ~2.7:1 de contraste. slate-400
                    + 11px mantiene el tono discreto pero legible. */}
                <p className="text-[11px] text-center mt-4 italic text-slate-400">
                    Mantenga presionado el ⋮⋮ para reorganizar a su gusto
                </p>

                {/* AIStatusFooter — barra inferior con status proactivo IA. */}
                <AIStatusFooter sensors={iotAlerts} onNavigate={onNavigate} />
            </div>
            </>
            )}

            {/* /fvh-resto-shell + /fvh-resto (o /contents con flag OFF) */}
            </div>
            </div>
        </div>
    );
}
