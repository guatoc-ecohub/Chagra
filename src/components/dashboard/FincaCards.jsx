import { Sprout, MapPin, Package, NotebookPen, Eye, AlertCircle, FileText, ChevronRight, Leaf } from 'lucide-react';
import useAssetStore from '../../store/useAssetStore';
import Skeleton from '../common/Skeleton';

/**
 * FincaCards — secciones del dashboard re-organizadas con sensibilidad
 * agro: cada card es una "isla" con icon emoji-grande + color tonal por
 * tipo + acción clara. Click navega a su pantalla. Glassmorphism uniforme.
 *
 * Diseño: cards grandes, números legibles, copy de campesino.
 */

const SECTION_STYLES = {
    plantas: {
        Icon: Sprout,
        emoji: '🌱',
        accent: 'from-emerald-500/20 to-lime-500/10',
        border: 'border-emerald-700/30',
        ring: 'ring-emerald-500/0 group-hover:ring-emerald-500/40',
        iconColor: 'text-emerald-300',
    },
    zonas: {
        Icon: MapPin,
        emoji: '📍',
        accent: 'from-teal-500/20 to-cyan-500/10',
        border: 'border-teal-700/30',
        ring: 'ring-teal-500/0 group-hover:ring-teal-500/40',
        iconColor: 'text-teal-300',
    },
    insumos: {
        Icon: Package,
        emoji: '📦',
        accent: 'from-amber-500/20 to-orange-500/10',
        border: 'border-amber-700/30',
        ring: 'ring-amber-500/0 group-hover:ring-amber-500/40',
        iconColor: 'text-amber-300',
    },
    bitacora: {
        Icon: NotebookPen,
        emoji: '📔',
        accent: 'from-stone-500/20 to-zinc-500/10',
        border: 'border-stone-700/30',
        ring: 'ring-stone-500/0 group-hover:ring-stone-500/40',
        iconColor: 'text-stone-300',
    },
    hoy: {
        Icon: Eye,
        emoji: '👀',
        accent: 'from-violet-500/20 to-purple-500/10',
        border: 'border-violet-700/30',
        ring: 'ring-violet-500/0 group-hover:ring-violet-500/40',
        iconColor: 'text-violet-300',
    },
    plagas: {
        Icon: AlertCircle,
        emoji: '🐛',
        accent: 'from-rose-500/20 to-red-500/10',
        border: 'border-rose-700/30',
        ring: 'ring-rose-500/0 group-hover:ring-rose-500/40',
        iconColor: 'text-rose-300',
    },
    biodiversidad: {
        Icon: Leaf,
        emoji: '🌳',
        accent: 'from-green-500/20 to-emerald-500/10',
        border: 'border-green-700/30',
        ring: 'ring-green-500/0 group-hover:ring-green-500/40',
        iconColor: 'text-green-300',
    },
    informes: {
        Icon: FileText,
        emoji: '📊',
        accent: 'from-indigo-500/20 to-blue-500/10',
        border: 'border-indigo-700/30',
        ring: 'ring-indigo-500/0 group-hover:ring-indigo-500/40',
        iconColor: 'text-indigo-300',
    },
};

function Card({ section, title, subtitle, value, onClick, badge, variant = 'list', loading = false, tooltip }) {
    const style = SECTION_STYLES[section] || SECTION_STYLES.plantas;
    // Tooltip nativo (title) funciona bien en desktop hover y NO bloquea
    // touch en mobile (Safari/Chrome lo muestran on long-press). Sin libs.
    const titleAttr = tooltip || (subtitle ? `${title} — ${subtitle}` : title);

    // GRID variant: layout cuadrado, emoji grande centrado arriba, title abajo,
    // value en corner top-right. Optimizado para cuadrícula 2-col/3-col que
    // deja respirar el fondo biopunk entre cards.
    if (variant === 'grid') {
        return (
            <button
                type="button"
                onClick={onClick}
                title={titleAttr}
                aria-label={titleAttr}
                className={`group relative w-full text-left rounded-2xl bg-gradient-to-br ${style.accent} backdrop-blur-xl border ${style.border} p-4 ring-2 ${style.ring} transition-all active:scale-[0.96] hover:-translate-y-0.5 aspect-square flex flex-col items-center justify-between min-h-[120px]`}
            >
                {/* Contador top-right — GRANDE y legible de un vistazo: el
                    conteo de plantas/zonas es la info más importante de la
                    card (feedback operador 2026-05-30). Pill con número
                    text-xl, padding generoso y buen contraste. */}
                {loading ? (
                    <div className="absolute top-2 right-2">
                        <Skeleton variant="rect" width={40} height={32} rounded="lg" ariaLabel="Cargando contador" />
                    </div>
                ) : (value != null || badge != null) && (
                    <div
                        data-testid="finca-card-count"
                        className="absolute top-2 right-2 min-w-[2rem] px-2.5 py-1 rounded-lg text-lg sm:text-xl font-black leading-none text-center bg-black/55 backdrop-blur ring-1 ring-white/20 text-white tabular-nums shadow-md"
                    >
                        {value != null ? value : badge}
                    </div>
                )}
                {/* Emoji grande centrado */}
                <div className="flex-1 flex items-center justify-center text-5xl sm:text-6xl select-none filter drop-shadow-md group-hover:scale-110 transition-transform">
                    {style.emoji}
                </div>
                {/* Title abajo */}
                <h3 className="text-sm font-bold text-white text-center leading-tight w-full truncate">
                    {title}
                </h3>
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
            title="Insumos"
            subtitle={subtitle}
            value={isHydrated ? count : null}
            loading={!isHydrated}
            tooltip="Bioinsumos (bocashi, biol, caldos), semillas, herramientas. Stock disponible en bodega."
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
    return (
        <Card
            variant={variant}
            section="hoy"
            title="Hoy en finca"
            subtitle="Lo que toca hacer cerca tuyo"
            tooltip="Tareas pendientes ordenadas por cercanía a tu ubicación actual."
            onClick={() => onNavigate('javier')}
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
            title="Flora y fauna"
            subtitle="Ecosistema de tu chagra"
            tooltip="Catálogo de especies nativas, endémicas y polinizadores que viven en tu finca."
            onClick={() => onNavigate('biodiversidad')}
        />
    );
}

export function InformesCard({ onNavigate, variant }) {
    return (
        <Card
            variant={variant}
            section="informes"
            title="Informes"
            subtitle="Descarga reportes en CSV"
            tooltip="Exporta cuaderno de campo, inventario, registros de cosecha y aplicaciones a CSV/PDF."
            onClick={() => onNavigate('informes')}
        />
    );
}
