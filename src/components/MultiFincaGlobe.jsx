import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useFincaActiveStore } from '../services/fincaActiveStore';
import { ArrowRight, Info } from 'lucide-react';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Fases del entry: 'initial' (zoom-out Colombia) → 'highlighted' (zoom Choachí + pulse) → 'faded' (marker semi-oculto).
// Hover sobre el marker activo restaura visualmente la fase highlighted hasta mouseout.
const PHASE_INITIAL_MS = 500;
const PHASE_HIGHLIGHT_MS = 2500;
const FADED_OPACITY = 0.4;

// Vista contextual de entrada: Colombia centro-andino para que se reconozcan otras fincas registradas
// (Choachí, Boyacá, Santa Marta, etc.) cuando existan. flyTo a Choachí tras PHASE_INITIAL_MS.
const COLOMBIA_VIEW = { center: [4.5, -74.5], zoom: 6 };
const CHOACHI_VIEW = { center: [4.5167, -73.9333], zoom: 9 };

// Etiquetas legibles para `biocultural_zone` en la UI pública del globo de fincas.
// El dato interno conserva el slug (snake_case); aquí lo presentamos como "tu
// zona ecológica" para evitar leak de jerga.
const ZONE_LABELS = {
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

function MapEntryFlyTo({ phase }) {
    const map = useMap();
    useEffect(() => {
        if (phase === 'highlighted') {
            map.flyTo(CHOACHI_VIEW.center, CHOACHI_VIEW.zoom, { duration: 1.4 });
        }
    }, [phase, map]);
    return null;
}

/**
 * Mapa Leaflet multi-finca que muestra un globo con las fincas registradas.
 * Incluye una secuencia de entrada animada (Colombia, zoom a Choachí) y
 * marcadores interactivos con popups que permiten seleccionar una finca activa.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {Function} props.onSelect - Callback invocado al seleccionar una finca desde el popup.
 */
export const MultiFincaGlobe = ({ onSelect }) => {
    const { activeFincaSlug, setActiveFinca, setFincas, fincas } = useFincaActiveStore();
    const [loading, setLoading] = useState(fincas.length === 0);
    const [entryPhase, setEntryPhase] = useState('initial');
    const [hoveredSlug, setHoveredSlug] = useState(null);
    const markerRefs = useRef({});

    useEffect(() => {
        const loadFincas = async () => {
            try {
                const res = await fetch('/fincas-publicas.json');
                if (!res.ok) throw new Error('No se pudo cargar el registro de fincas');
                const data = await res.json();
                setFincas(data);
            } catch (err) {
                console.error('Error cargando catálogo de fincas:', err);
            } finally {
                setLoading(false);
            }
        };
        loadFincas();
    }, [setFincas]);

    // Secuencia de entrada — solo al primer mount cuando ya hay fincas cargadas.
    useEffect(() => {
        if (loading || fincas.length === 0) return;
        const t1 = setTimeout(() => setEntryPhase('highlighted'), PHASE_INITIAL_MS);
        const t2 = setTimeout(() => setEntryPhase('faded'), PHASE_INITIAL_MS + PHASE_HIGHLIGHT_MS);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [loading, fincas.length]);

    // El marker activo está "destacado" durante highlighted, o cuando el operador lo sobrevuela.
    const isActiveHighlighted = (slug) => {
        if (slug !== activeFincaSlug) return false;
        if (entryPhase === 'initial' || entryPhase === 'highlighted') return true;
        return hoveredSlug === slug;
    };

    const createActiveIcon = (finca, highlighted) => L.divIcon({
        className: 'bg-transparent',
        html: `<div class="flex flex-col items-center" style="opacity:${highlighted ? 1 : FADED_OPACITY}; transition: opacity 350ms ease;">
            <div class="px-2 py-0.5 bg-emerald-900/90 text-white text-[10px] font-bold rounded-md shadow-lg mb-1 whitespace-nowrap">${finca.nombre}</div>
            <div class="p-1 bg-emerald-600 rounded-full border-2 border-white shadow-xl ${highlighted ? 'scale-125 animate-pulse' : ''}">
                <div class="w-3 h-3 bg-white rounded-full"></div>
            </div>
        </div>`,
        iconSize: [24, 40],
        iconAnchor: [12, 38]
    });

    const createDefaultIcon = (finca) => L.divIcon({
        className: 'bg-transparent',
        html: `<div class="flex flex-col items-center">
            <div class="px-2 py-0.5 bg-slate-800/90 text-white text-[10px] font-bold rounded-md shadow-lg mb-1 whitespace-nowrap">${finca.nombre}</div>
            <div class="p-1 bg-slate-600 rounded-full border-2 border-white shadow-md">
                <div class="w-3 h-3 bg-white rounded-full"></div>
            </div>
        </div>`,
        iconSize: [24, 40],
        iconAnchor: [12, 38]
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 bg-slate-800/20 rounded-xl animate-pulse">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-slate-400 font-medium italic">Buscando fincas aliadas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-emerald-900/10 rounded-xl border border-emerald-700/20 text-sm text-emerald-400">
                <Info size={18} />
                <p>Toca un punto para conocer una finca y entrar a ver su estado.</p>
            </div>

            <div className="h-[400px] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700 relative z-0">
                <MapContainer
                    center={COLOMBIA_VIEW.center}
                    zoom={COLOMBIA_VIEW.zoom}
                    className="h-full w-full"
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        url="https://{s}.tile.osm.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://osm.org/copyright">OSM</a>'
                    />
                    <MapEntryFlyTo phase={entryPhase} />
                    {fincas.map((finca) => {
                        const isActive = finca.slug === activeFincaSlug;
                        const highlighted = isActive && isActiveHighlighted(finca.slug);
                        return (
                            <Marker
                                key={finca.slug}
                                position={finca.coords || [0, 0]}
                                icon={isActive ? createActiveIcon(finca, highlighted) : createDefaultIcon(finca)}
                                ref={(ref) => { if (ref) markerRefs.current[finca.slug] = ref; }}
                                eventHandlers={{
                                    mouseover: () => isActive && setHoveredSlug(finca.slug),
                                    mouseout: () => isActive && setHoveredSlug(null),
                                }}
                            >
                            <Popup className="custom-popup" minWidth={220}>
                                <div className="p-1 space-y-3 font-sans text-slate-200">
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight text-white">{finca.nombre}</h3>
                                        <p className="text-[10px] text-emerald-500 uppercase font-bold tracking-widest mt-0.5">
                                            {ZONE_LABELS[finca.biocultural_zone] || finca.biocultural_zone?.replace(/_/g, ' ')}
                                        </p>
                                    </div>

                                    {finca.operador && (
                                        <p className="text-xs text-slate-400">
                                            Operador: <span className="text-white">{finca.operador}</span>
                                        </p>
                                    )}

                                    <p className="text-sm italic leading-snug text-slate-400">
                                        "{finca.descripcion_corta}"
                                    </p>

                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                            finca.estado === 'activo' ? 'bg-emerald-900/40 text-emerald-400' :
                                            finca.estado === 'piloto' ? 'bg-amber-900/40 text-amber-400' :
                                            'bg-slate-800 text-slate-400'
                                        }`}>
                                            {finca.estado}
                                        </span>
                                        {finca.farmos_endpoint ? (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-900/40 text-emerald-400">
                                                FarmOS configurado
                                            </span>
                                        ) : (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-900/40 text-amber-400">
                                                Pendiente FarmOS
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => {
                                            setActiveFinca(finca.slug);
                                            if (onSelect) onSelect(finca);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 active:scale-95 transition-all shadow-lg group"
                                    >
                                        Entrar a esta finca
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>
        </div>
    );
};

export default MultiFincaGlobe;
