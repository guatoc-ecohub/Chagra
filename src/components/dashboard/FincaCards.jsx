import { Sprout, MapPin, Package, NotebookPen, Eye, AlertCircle, FileText, ChevronRight, Leaf } from 'lucide-react';
import useAssetStore from '../../store/useAssetStore';

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

function Card({ section, title, subtitle, value, onClick, badge }) {
    const style = SECTION_STYLES[section] || SECTION_STYLES.plantas;
    return (
        <button
            type="button"
            onClick={onClick}
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
                    {subtitle && (
                        <p className="text-xs text-slate-300/80 mt-0.5 truncate">{subtitle}</p>
                    )}
                </div>
                {value != null && (
                    <div className="shrink-0 text-right">
                        <div className="text-2xl font-black text-white leading-none tabular-nums">{value}</div>
                    </div>
                )}
                <ChevronRight size={18} className="shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors" aria-hidden="true" />
            </div>
        </button>
    );
}

export function PlantasCard({ onNavigate }) {
    const plants = useAssetStore((s) => s.plants);
    const count = plants.length;
    return (
        <Card
            section="plantas"
            title="Mis plantas"
            subtitle={count > 0 ? `${count === 1 ? 'planta sembrada' : 'plantas sembradas'}` : 'Aún no has registrado nada'}
            value={count}
            onClick={() => onNavigate('activos')}
        />
    );
}

export function ZonasCard({ onNavigate }) {
    const lands = useAssetStore((s) => s.lands);
    const count = lands.length;
    return (
        <Card
            section="zonas"
            title="Mis zonas"
            subtitle={count > 0 ? `${count === 1 ? 'área de tu finca' : 'áreas de tu finca'}` : 'Define dónde cultivas'}
            value={count}
            onClick={() => onNavigate('mapa')}
        />
    );
}

export function InsumosCard({ onNavigate }) {
    const materials = useAssetStore((s) => s.materials);
    const count = materials.length;
    return (
        <Card
            section="insumos"
            title="Insumos"
            subtitle={count > 0 ? 'Biopreparados y materiales' : 'Lleva control de lo que tienes'}
            value={count}
            onClick={() => onNavigate('bodega')}
        />
    );
}

export function BitacoraCard({ onNavigate }) {
    return (
        <Card
            section="bitacora"
            title="Bitácora"
            subtitle="Todo lo que has hecho en tu finca"
            onClick={() => onNavigate('historial')}
        />
    );
}

export function HoyCard({ onNavigate }) {
    return (
        <Card
            section="hoy"
            title="Hoy en finca"
            subtitle="Lo que toca hacer cerca tuyo"
            onClick={() => onNavigate('javier')}
        />
    );
}

export function PlagasCard({ onNavigate }) {
    return (
        <Card
            section="plagas"
            title="Plagas"
            subtitle="Reporta y consulta"
            onClick={() => onNavigate('reportar_invasora')}
        />
    );
}

export function BiodiversidadCard({ onNavigate }) {
    return (
        <Card
            section="biodiversidad"
            title="Flora y fauna"
            subtitle="Ecosistema de tu chagra"
            onClick={() => onNavigate('biodiversidad')}
        />
    );
}

export function InformesCard({ onNavigate }) {
    return (
        <Card
            section="informes"
            title="Informes"
            subtitle="Descarga reportes en CSV"
            onClick={() => onNavigate('informes')}
        />
    );
}
