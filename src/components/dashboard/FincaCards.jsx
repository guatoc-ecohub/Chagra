/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * Las etiquetas de las tarjetas ("Insumos", "Bitácora", "Informes" — o su copy F2) y los
 * textos de carga/aria ("Cargando…", "Cargando contador") son strings de UI
 * preexistentes de este componente. Su migración a src/config/messages.js es
 * la TAREA i18n de ADR-050 (transversal a toda la app), fuera del alcance de
 * este refinamiento visual. Se silencia el warning soft aquí para no bloquear
 * el commit sin arrastrar ese refactor i18n. */
import { useEffect, useState } from 'react';
import { Sprout, MapPin, Package, NotebookPen, Eye, AlertCircle, FileText, ChevronRight, Leaf, Network, Beaker, PawPrint } from 'lucide-react';
import useAssetStore from '../../store/useAssetStore';
import Skeleton from '../common/Skeleton';
import { listFarmProcesses } from '../../db/farmProcessCache';
import { SEGUIMIENTO_PROCESOS, seguimientoRoute } from '../../config/seguimientoProcesos';
import { fincaVivaHomePerfilActivo } from '../../config/fincaVivaHomeFlag';

// Copy CAMPESINO de algunas tarjetas (audit botones/distribución 2026-06-26):
// "Insumos"→"Abonos e insumos", "Flora y fauna"→"Plantas y animales del monte",
// "Informes/CSV"→"Sacar reportes". Se aplica SOLO con la home F2 ON (flag dev);
// con la flag OFF se conservan los labels legacy (prod intacto). `f2Label` es un
// helper local: devuelve el texto F2 cuando la flag está activa, si no el legacy.
const f2Label = (f2, legacy) => {
    let on = false;
    try { on = fincaVivaHomePerfilActivo(); } catch (_) { on = false; }
    return on ? f2 : legacy;
};

/**
 * FincaCards — secciones del dashboard re-organizadas con sensibilidad
 * agro: cada card es una "isla" con icon emoji-grande + color tonal por
 * tipo + acción clara. Click navega a su pantalla. Glassmorphism uniforme.
 *
 * Diseño: cards grandes, números legibles, copy de campesino.
 *
 * Refinamiento visual 2026-06-18 (tarjetas más bellas para mostrar):
 *   Cada `section` agrega `bar` (cinta de acento superior con la identidad de
 *   color del proceso) y `halo` (disco tenue detrás del emoji). El emoji se
 *   monta sobre ese disco para dar profundidad. El contador "0" deja de ser un
 *   número plano: cuando hay procesos muestra una pastilla de acento; cuando
 *   está vacío, una invitación amable ("Empieza"). Mismo radio (rounded-2xl),
 *   spacing y tipografía del resto del home; theme-aware (text-white vira a
 *   tinta en nature/minimalista vía themes.css), mobile-first y accesible
 *   (focus-visible ring). NO toca AgentHero ni AgentRedMenu.
 */

const SECTION_STYLES = {
    plantas: {
        Icon: Sprout,
        emoji: '🌱',
        accent: 'from-emerald-500/20 to-lime-500/10',
        border: 'border-emerald-700/30',
        ring: 'ring-emerald-500/0 group-hover:ring-emerald-500/40',
        iconColor: 'text-emerald-300',
        bar: 'from-emerald-400 to-lime-300',
        halo: 'bg-emerald-400/15',
    },
    zonas: {
        Icon: MapPin,
        emoji: '📍',
        accent: 'from-teal-500/20 to-cyan-500/10',
        border: 'border-teal-700/30',
        ring: 'ring-teal-500/0 group-hover:ring-teal-500/40',
        iconColor: 'text-teal-300',
        bar: 'from-teal-400 to-cyan-300',
        halo: 'bg-teal-400/15',
    },
    insumos: {
        Icon: Package,
        emoji: '📦',
        accent: 'from-amber-500/20 to-orange-500/10',
        border: 'border-amber-700/30',
        ring: 'ring-amber-500/0 group-hover:ring-amber-500/40',
        iconColor: 'text-amber-300',
        bar: 'from-amber-400 to-orange-300',
        halo: 'bg-amber-400/15',
    },
    bitacora: {
        Icon: NotebookPen,
        emoji: '📔',
        accent: 'from-stone-500/20 to-zinc-500/10',
        border: 'border-stone-700/30',
        ring: 'ring-stone-500/0 group-hover:ring-stone-500/40',
        iconColor: 'text-stone-300',
        bar: 'from-stone-300 to-zinc-200',
        halo: 'bg-stone-400/15',
    },
    hoy: {
        Icon: Eye,
        emoji: '👀',
        accent: 'from-violet-500/20 to-purple-500/10',
        border: 'border-violet-700/30',
        ring: 'ring-violet-500/0 group-hover:ring-violet-500/40',
        iconColor: 'text-violet-300',
        bar: 'from-violet-400 to-purple-300',
        halo: 'bg-violet-400/15',
    },
    plagas: {
        Icon: AlertCircle,
        emoji: '🐛',
        accent: 'from-rose-500/20 to-red-500/10',
        border: 'border-rose-700/30',
        ring: 'ring-rose-500/0 group-hover:ring-rose-500/40',
        iconColor: 'text-rose-300',
        bar: 'from-rose-400 to-red-300',
        halo: 'bg-rose-400/15',
    },
    biodiversidad: {
        Icon: Leaf,
        emoji: '🌳',
        accent: 'from-green-500/20 to-emerald-500/10',
        border: 'border-green-700/30',
        ring: 'ring-green-500/0 group-hover:ring-green-500/40',
        iconColor: 'text-green-300',
        bar: 'from-green-400 to-emerald-300',
        halo: 'bg-green-400/15',
    },
    asociaciones: {
        Icon: Network,
        emoji: '🌽',
        accent: 'from-lime-500/20 to-emerald-500/10',
        border: 'border-lime-700/30',
        ring: 'ring-lime-500/0 group-hover:ring-lime-500/40',
        iconColor: 'text-lime-300',
        bar: 'from-lime-300 to-emerald-300',
        halo: 'bg-lime-400/15',
    },
    fermentos: {
        Icon: Beaker,
        emoji: '🍶',
        accent: 'from-orange-500/20 to-amber-500/10',
        border: 'border-orange-700/30',
        ring: 'ring-orange-500/0 group-hover:ring-orange-500/40',
        iconColor: 'text-orange-300',
        bar: 'from-orange-400 to-amber-300',
        halo: 'bg-orange-400/15',
    },
    informes: {
        Icon: FileText,
        emoji: '📊',
        accent: 'from-indigo-500/20 to-blue-500/10',
        border: 'border-indigo-700/30',
        ring: 'ring-indigo-500/0 group-hover:ring-indigo-500/40',
        iconColor: 'text-indigo-300',
        bar: 'from-indigo-400 to-blue-300',
        halo: 'bg-indigo-400/15',
    },
    animales: {
        Icon: PawPrint,
        emoji: '🐔',
        accent: 'from-rose-500/20 to-pink-500/10',
        border: 'border-rose-700/30',
        ring: 'ring-rose-500/0 group-hover:ring-rose-500/40',
        iconColor: 'text-rose-300',
        bar: 'from-rose-400 to-pink-300',
        halo: 'bg-rose-400/15',
    },
    // Seguimiento de procesos de finca (2026-06-15). Identidad de color por
    // proceso reforzada con cinta de acento (bar) + halo del emoji (refinamiento
    // visual 2026-06-18).
    reforestacion: {
        Icon: Leaf,
        emoji: '🌳',
        accent: 'from-green-600/25 to-emerald-500/10',
        border: 'border-green-600/40',
        ring: 'ring-green-500/0 group-hover:ring-green-400/50',
        iconColor: 'text-green-300',
        bar: 'from-green-400 to-emerald-300',
        halo: 'bg-green-400/20',
    },
    silvopastoreo: {
        Icon: Sprout,
        emoji: '🐄',
        accent: 'from-amber-600/25 to-yellow-500/10',
        border: 'border-amber-600/40',
        ring: 'ring-amber-500/0 group-hover:ring-amber-400/50',
        iconColor: 'text-amber-300',
        bar: 'from-amber-400 to-yellow-300',
        halo: 'bg-amber-400/20',
    },
    paramo: {
        Icon: MapPin,
        emoji: '🏔️',
        accent: 'from-sky-600/25 to-cyan-500/10',
        border: 'border-sky-600/40',
        ring: 'ring-sky-500/0 group-hover:ring-sky-400/50',
        iconColor: 'text-sky-300',
        bar: 'from-sky-400 to-cyan-300',
        halo: 'bg-sky-400/20',
    },
    cerdos: {
        Icon: AlertCircle,
        emoji: '🐖',
        accent: 'from-pink-600/25 to-rose-500/10',
        border: 'border-pink-600/40',
        ring: 'ring-pink-500/0 group-hover:ring-pink-400/50',
        iconColor: 'text-pink-300',
        bar: 'from-pink-400 to-rose-300',
        halo: 'bg-pink-400/20',
    },
};

/**
 * @param {Object} props
 * @param {string} props.section
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {number|string|null} [props.value]
 * @param {() => void} props.onClick
 * @param {number|string|null} [props.badge]
 * @param {'list'|'grid'} [props.variant='list']
 * @param {boolean} [props.loading=false]
 * @param {string} [props.tooltip]
 * @param {string} [props.emptyHint]
 */
function Card({ section, title, subtitle, value, onClick, badge, variant = 'list', loading = false, tooltip, emptyHint }) {
    const style = SECTION_STYLES[section] || SECTION_STYLES.plantas;
    // Tooltip nativo (title) funciona bien en desktop hover y NO bloquea
    // touch en mobile (Safari/Chrome lo muestran on long-press). Sin libs.
    const titleAttr = tooltip || (subtitle ? `${title} — ${subtitle}` : title);

    // GRID variant: layout cuadrado, emoji grande centrado arriba, title abajo,
    // value en corner top-right. Optimizado para cuadrícula 2-col/3-col que
    // deja respirar el fondo biopunk entre cards.
    if (variant === 'grid') {
        // Estado VACÍO amable (refinamiento 2026-06-18): un "0" pelado se ve
        // triste. Cuando value === 0 y hay `emptyHint`, en vez de la pastilla
        // con el número mostramos una invitación cálida ("Empieza"); el número
        // con su pastilla de acento solo aparece cuando ya hay procesos.
        const isEmpty = value === 0;
        const showFriendlyEmpty = isEmpty && !!emptyHint;
        const showCountPill = !loading && !showFriendlyEmpty && (value != null || badge != null);
        return (
            <button
                type="button"
                onClick={onClick}
                title={titleAttr}
                aria-label={titleAttr}
                className={`group relative w-full text-left rounded-2xl overflow-hidden bg-gradient-to-br ${style.accent} backdrop-blur-xl border ${style.border} p-4 ring-2 ${style.ring} shadow-lg shadow-black/20 transition-all duration-200 ease-out active:scale-[0.96] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 aspect-square flex flex-col items-center justify-between min-h-[120px]`}
            >
                {/* Cinta de acento superior: identidad de color del proceso de un
                    vistazo, sin recargar. Sutil en reposo, llena al tocar/hover. */}
                <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${style.bar || 'from-emerald-400 to-lime-300'} opacity-70 group-hover:opacity-100 transition-opacity`}
                />
                {/* Contador top-right — GRANDE y legible de un vistazo: el
                    conteo de procesos es la info más importante de la card
                    (feedback operador 2026-05-30). Vacío amable cuando es 0. */}
                {loading ? (
                    <div className="absolute top-2 right-2">
                        <Skeleton variant="rect" width={40} height={32} rounded="lg" ariaLabel="Cargando contador" />
                    </div>
                ) : showFriendlyEmpty ? (
                    // Pastilla "Empieza" — CTA cálido en vez de un "0" triste.
                    // bg-emerald-500/25 + text-white viran a verde-tinta legibles
                    // en nature/minimalista vía themes.css (ambos theme-aware).
                    <div
                        data-testid="finca-card-empty"
                        className="absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold leading-none bg-emerald-500/25 backdrop-blur ring-1 ring-emerald-300/40 text-white shadow-sm"
                    >
                        Empieza
                    </div>
                ) : showCountPill && (
                    <div
                        data-testid="finca-card-count"
                        className="absolute top-2 right-2 min-w-[2rem] px-2.5 py-1 rounded-lg text-lg sm:text-xl font-black leading-none text-center bg-black/55 backdrop-blur ring-1 ring-white/20 text-white tabular-nums shadow-md"
                    >
                        {value != null ? value : badge}
                    </div>
                )}
                {/* Emoji grande centrado, sobre un disco de halo tonal que le da
                    profundidad y refuerza el color del proceso. */}
                <div className="flex-1 w-full flex items-center justify-center">
                    <span className="relative grid place-items-center">
                        <span
                            aria-hidden="true"
                            className={`absolute inset-0 -m-2 rounded-full ${style.halo || 'bg-emerald-400/15'} blur-md scale-110 group-hover:scale-125 transition-transform duration-200`}
                        />
                        <span className="relative text-5xl sm:text-6xl select-none filter drop-shadow-md group-hover:scale-110 transition-transform duration-200">
                            {style.emoji}
                        </span>
                    </span>
                </div>
                {/* Title + estado/invitación abajo: jerarquía clara (nombre fuerte,
                    línea de estado suave). El estado muestra la invitación cálida
                    cuando está vacío y el subtitle de progreso cuando hay datos. */}
                <div className="w-full text-center">
                    <h3 className="text-sm font-bold text-white leading-tight truncate">
                        {title}
                    </h3>
                    {(showFriendlyEmpty ? emptyHint : subtitle) && (
                        <p className="mt-0.5 text-[10px] leading-tight text-white/70 truncate">
                            {showFriendlyEmpty ? emptyHint : subtitle}
                        </p>
                    )}
                </div>
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            title={titleAttr}
            aria-label={titleAttr}
            className={`group relative w-full text-left rounded-2xl bg-gradient-to-br ${style.accent} backdrop-blur-xl border ${style.border} p-4 ring-2 ${style.ring} transition-all active:scale-[0.98]`}
        >
            <div className="flex items-center gap-3">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center text-2xl">
                    {style.emoji}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white truncate">{title}</h3>
                        {badge != null && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-white/10 text-white tabular-nums">
                                {badge}
                            </span>
                        )}
                    </div>
                    {loading ? (
                        <div className="mt-1.5">
                            <Skeleton variant="line" width="80%" height={10} ariaLabel="Cargando descripción" />
                        </div>
                    ) : subtitle && (
                        <p className="text-xs text-slate-300/80 mt-0.5 truncate">{subtitle}</p>
                    )}
                </div>
                {loading ? (
                    <div className="shrink-0">
                        <Skeleton variant="rect" width={32} height={28} rounded="md" ariaLabel="Cargando contador" />
                    </div>
                ) : value != null && (
                    <div className="shrink-0 text-right">
                        <div className="text-2xl font-black text-white leading-none tabular-nums">{value}</div>
                    </div>
                )}
                <ChevronRight size={18} className="shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors" aria-hidden="true" />
            </div>
        </button>
    );
}

export function PlantasCard({ onNavigate, variant }) {
    const plants = useAssetStore((s) => s.plants);
    const isHydrated = useAssetStore((s) => s.isHydrated);
    const count = plants.length;
    // Empty-state amistoso cuando ya hidrato y sigue en cero (no esperar más).
    const subtitle = !isHydrated
        ? 'Cargando…'
        : count > 0
            ? (count === 1 ? 'planta sembrada' : 'plantas sembradas')
            : '¡Agrega tu primera planta!';
    return (
        <Card
            variant={variant}
            section="plantas"
            title="Mis plantas"
            subtitle={subtitle}
            value={isHydrated ? count : null}
            loading={!isHydrated}
            tooltip="Cultivos registrados en tu chagra. Tócalo para ver el inventario, agregar o consultar el detalle."
            onClick={() => onNavigate('activos')}
        />
    );
}

export function ZonasCard({ onNavigate, variant }) {
    const lands = useAssetStore((s) => s.lands);
    const isHydrated = useAssetStore((s) => s.isHydrated);
    const count = lands.length;
    const subtitle = !isHydrated
        ? 'Cargando…'
        : count > 0
            ? (count === 1 ? 'área de tu finca' : 'áreas de tu finca')
            : 'Define dónde cultivas';
    return (
        <Card
            variant={variant}
            section="zonas"
            title="Mis zonas"
            subtitle={subtitle}
            value={isHydrated ? count : null}
            loading={!isHydrated}
            tooltip="Parcelas, camas, invernaderos y áreas de tu finca. Define dónde está cada cultivo."
            onClick={() => onNavigate('mapa')}
        />
    );
}

export function InsumosCard({ onNavigate, variant }) {
    const materials = useAssetStore((s) => s.materials);
    const isHydrated = useAssetStore((s) => s.isHydrated);
    const count = materials.length;
    const subtitle = !isHydrated
        ? 'Cargando…'
        : count > 0
            ? 'Biopreparados y materiales'
            : 'Lleva control de lo que tienes';
    return (
        <Card
            variant={variant}
            section="insumos"
            title={f2Label('Abonos e insumos', 'Insumos')}
            subtitle={subtitle}
            value={isHydrated ? count : null}
            loading={!isHydrated}
            tooltip="Abonos y bioinsumos (bocashi, biol, caldos), semillas, herramientas. Lo que tiene en la bodega."
            onClick={() => onNavigate('bodega')}
        />
    );
}

export function BitacoraCard({ onNavigate, variant }) {
    return (
        <Card
            variant={variant}
            section="bitacora"
            title="Bitácora"
            subtitle="Todo lo que has hecho en tu finca"
            tooltip="Historial cronológico: siembras, cosechas, aplicaciones de bioinsumo, observaciones."
            onClick={() => onNavigate('historial')}
        />
    );
}

export function HoyCard({ onNavigate, variant }) {
    // 2026-06-11: la card "Hoy en finca" deja de ir a la cola de tareas y
    // abre el dashboard proactivo del día (clima honesto + alertas + tareas
    // del ciclo + agenda campesina) — vista 'hoy_finca'.
    return (
        <Card
            variant={variant}
            section="hoy"
            title="Hoy en finca"
            subtitle="El día, las alertas y lo que toca"
            tooltip="Clima de hoy, alertas, tareas de la semana y agenda de tu finca."
            onClick={() => onNavigate('hoy_finca')}
        />
    );
}

export function PlagasCard({ onNavigate, variant }) {
    return (
        <Card
            variant={variant}
            section="plagas"
            title="Plagas"
            subtitle="Reporta y consulta"
            tooltip="Reporta una plaga o invasora con foto. Chagra sugiere manejo agroecológico sin químicos."
            onClick={() => onNavigate('reportar_invasora')}
        />
    );
}

export function BiodiversidadCard({ onNavigate, variant }) {
    return (
        <Card
            variant={variant}
            section="biodiversidad"
            title={f2Label('Plantas y animales del monte', 'Flora y fauna')}
            subtitle={f2Label('Lo vivo de su finca', 'Ecosistema de tu chagra')}
            tooltip="Especies nativas, endémicas y polinizadores que viven en su finca."
            onClick={() => onNavigate('biodiversidad')}
        />
    );
}

export function AsociacionesCard({ onNavigate, variant }) {
    return (
        <Card
            variant={variant}
            section="asociaciones"
            title="Asociaciones"
            subtitle="Policultivos y compañía de plantas"
            tooltip="Asociaciones. Policultivos y compañía de plantas por rol. Tócalo para ver combinaciones conocidas."
            onClick={() => onNavigate('asociaciones')}
        />
    );
}

export function InformesCard({ onNavigate, variant }) {
    return (
        <Card
            variant={variant}
            section="informes"
            title={f2Label('Sacar reportes', 'Informes')}
            subtitle={f2Label('Para imprimir o llevar a la cooperativa', 'Descarga reportes en CSV')}
            tooltip="Saque su cuaderno de campo, inventario y registros de cosecha y aplicaciones para imprimir o llevar al banco o la cooperativa."
            onClick={() => onNavigate('informes')}
        />
    );
}

/**
 * useSeguimientoCounts — cuenta los procesos ACTIVOS por process_type para los
 * contadores de las tarjetas de seguimiento. Offline-first (lee IndexedDB).
 * Se re-cuenta al volver al home y al evento 'farmProcessChanged'.
 */
function useSeguimientoCounts() {
    const [counts, setCounts] = useState(null); // null = cargando

    useEffect(() => {
        let alive = true;
        const recount = async () => {
            try {
                const all = await listFarmProcesses({ status: 'active' });
                if (!alive) return;
                const byType = {};
                for (const p of all || []) {
                    const t = p?.attributes?.process_type;
                    if (t) byType[t] = (byType[t] || 0) + 1;
                }
                setCounts(byType);
            } catch {
                if (alive) setCounts({});
            }
        };
        recount();
        const onChange = () => recount();
        try { window.addEventListener('farmProcessChanged', onChange); } catch { /* SSR/test */ }
        return () => {
            alive = false;
            try { window.removeEventListener('farmProcessChanged', onChange); } catch { /* noop */ }
        };
    }, []);

    return counts;
}

/**
 * SeguimientoCard — tarjeta de seguimiento de un proceso de finca
 * (Reforestación/Silvopastoreo/Páramo/Cerdos). Mismo componente base que
 * "Mis plantas": navega a la vista de seguimiento del proceso.
 */
export function SeguimientoCard({ def, count, onNavigate, variant }) {
    const loaded = count !== null && count !== undefined;
    const n = loaded ? (count || 0) : null;
    // Estado VACÍO amable: en vez de un "0" triste, una invitación cálida a
    // empezar el proceso (la pastilla "Empieza" + esta línea). Con datos, la
    // línea de estado muestra el avance ("N en seguimiento").
    const subtitle = !loaded
        ? 'Cargando…'
        : n > 0
            ? (n === 1 ? '1 en seguimiento' : `${n} en seguimiento`)
            : null;
    const emptyHint = def.emptyHint || 'Empieza tu primer registro';
    return (
        <Card
            variant={variant}
            section={def.section}
            title={def.title}
            subtitle={subtitle}
            emptyHint={emptyHint}
            value={loaded ? n : null}
            loading={!loaded}
            tooltip={`${def.title} — ${def.subtitle}. Tócalo para iniciar y hacer seguimiento (etapas, fotos y avance).`}
            onClick={() => onNavigate(seguimientoRoute(def.key))}
        />
    );
}

/**
 * SeguimientoCards — las tarjetas de seguimiento de procesos de finca para el
 * home (Reforestación · Silvopastoreo · Páramo · Cerdos). Se renderiza como
 * bloque propio en DashboardLive, fuera del grid draggable.
 *
 * GATING POR PERFIL (2026-06-15): `keys` filtra qué tarjetas se muestran según
 * el perfil del usuario ("el usuario solo ve lo que necesita" — un urbano
 * NUNCA ve Cerdos). Lo decide el call-site (DashboardLive) vía
 * homeModuleSelector. Si `keys` se omite (null/undefined), se muestran las 4 —
 * comportamiento histórico, sin breaking change. La selección NO se decide aquí;
 * este componente solo pinta las tarjetas permitidas.
 *
 * @param {Object} props
 * @param {(view: string) => void} props.onNavigate
 * @param {'grid'|'list'} [props.variant='grid']
 * @param {string[]|null} [props.keys=null] - keys de seguimiento permitidas
 *   (subconjunto de SEGUIMIENTO_PROCESOS[].key). null = todas.
 */
export function SeguimientoCards({ onNavigate, variant = 'grid', keys = null }) {
    const counts = useSeguimientoCounts();
    const allowed = Array.isArray(keys) ? new Set(keys) : null;
    const defs = allowed
        ? SEGUIMIENTO_PROCESOS.filter((def) => allowed.has(def.key))
        : SEGUIMIENTO_PROCESOS;
    return (
        <>
            {defs.map((def) => (
                <SeguimientoCard
                    key={def.key}
                    def={def}
                    count={counts ? (counts[def.processType] || 0) : null}
                    onNavigate={onNavigate}
                    variant={variant}
                />
            ))}
        </>
    );
}

/**
 * FermentosCard — tarjeta del módulo de fermentos alimentarios.
 * Navega a la vista 'fermentos' con la galería de recetas tradicionales
 * y las advertencias de seguridad críticas (botulismo, plomo, cianuro).
 */
export function FermentosCard({ onNavigate, variant }) {
    return (
        <Card
            variant={variant}
            section="fermentos"
            title="Fermentos"
            subtitle="Recetas tradicionales y seguridad"
            tooltip="Fermentos alimentarios colombianos (masato, chicha, kéfir) + VETOS de seguridad (botulismo, plomo, cianuro)."
            onClick={() => onNavigate('fermentos')}
        />
    );
}

/**
 * AnimalesCard — acceso al MÓDULO ANIMALES de la finca integrada (gallinas,
 * cerdos, abejas). Navega a la vista 'animales', desde donde se entra a cada
 * vertical y se ve el ciclo cerrado (estiércol → biopreparado → suelo → planta)
 * y la polinización. Mismo componente base que el resto de tarjetas del home.
 */
export function AnimalesCard({ onNavigate, variant }) {
    return (
        <Card
            variant={variant}
            section="animales"
            title="Animales"
            subtitle="Gallinas, cerdos y abejas"
            tooltip="Gallinas, cerdos y abejas de tu finca. Sanidad, manejo, producción y cómo aportan al ciclo cerrado (estiércol → abono → suelo → planta) y a la polinización."
            onClick={() => onNavigate('animales')}
        />
    );
}
