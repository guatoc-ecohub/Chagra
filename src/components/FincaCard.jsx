import React from 'react';
import { MapPin, Mountain, Leaf, ArrowRight, Settings } from 'lucide-react';

const estadoColors = {
    activo: 'bg-emerald-900/40 text-emerald-400 border-emerald-700/30',
    piloto: 'bg-amber-900/40 text-amber-400 border-amber-700/30',
    pendiente: 'bg-slate-800 text-slate-400 border-slate-700/30',
};

// Etiquetas legibles para `biocultural_zone`. La clave del dato sigue siendo
// el slug interno (snake_case), pero al usuario público le mostramos un
// nombre natural de "tu zona ecológica" para evitar leak de jerga.
const zoneLabels = {
    andino_alto_páramo: 'Alto Andino - Páramo',
    andino_alto: 'Alto Andino',
    andino_medio: 'Andino Medio',
    andino_medio_invernadero: 'Andino Medio (invernadero)',
    valle_caucano: 'Valle del Cauca',
    cafetero: 'Eje Cafetero',
    caribe: 'Caribe',
    llanos: 'Llanos',
    amazonia: 'Amazonía',
    pacifico: 'Pacífico',
    nariño: 'Nariño',
    santander: 'Santanderes',
    tolima_huila: 'Tolima - Huila',
};

export function FincaCard({finca, onSelect, onConfigure}) {
    const hasEndpoint = !!finca.farmos_endpoint;
    const estadoClass = estadoColors[finca.estado] || estadoColors.pendiente;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-colors" data-testid={`multifinca-card-${finca.slug}`}>
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h3 className="font-bold text-lg text-white leading-tight">
                        {finca.nombre}
                    </h3>
                    <p className="text-xs text-slate-500">{finca.operador}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase border ${estadoClass}`}>
                    {finca.estado}
                </span>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                {finca.altitud && (
                    <span className="flex items-center gap-1">
                        <Mountain size={12} />
                        {finca.altitud} msnm
                    </span>
                )}
                {finca.biocultural_zone && (
                    <span className="flex items-center gap-1">
                        <Leaf size={12} />
                        {zoneLabels[finca.biocultural_zone] || finca.biocultural_zone.replace(/_/g, ' ')}
                    </span>
                )}
                {finca.coords && (
                    <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {finca.coords[0].toFixed(2)}, {finca.coords[1].toFixed(2)}
                    </span>
                )}
            </div>

            {finca.descripcion_corta && (
                <p className="text-sm text-slate-400 italic leading-snug">
                    "{finca.descripcion_corta}"
                </p>
            )}

            <div className="pt-2">
                {hasEndpoint ? (
                    <button
                        onClick={() => onSelect?.(finca)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-500 active:scale-95 transition-all"
                        data-testid={`multifinca-enter-${finca.slug}`}
                    >
                        Entrar a la finca
                        <ArrowRight size={16} />
                    </button>
                ) : (
                    <button
                        onClick={() => onConfigure?.(finca)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-500 active:scale-95 transition-all"
                        data-testid={`multifinca-configure-${finca.slug}`}
                    >
                        <Settings size={16} />
                        Configurar FarmOS
                    </button>
                )}
            </div>
        </div>
    );
}

export function FincaGrid({fincas, onSelect, onConfigure}) {
    if (!fincas || fincas.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                No hay fincas registradas.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fincas.map((finca) => (
                <FincaCard
                    key={finca.slug}
                    finca={finca}
                    onSelect={onSelect}
                    onConfigure={onConfigure}
                />
            ))}
        </div>
    );
}

export default FincaCard;
