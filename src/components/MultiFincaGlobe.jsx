import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useFincaActiveStore } from '../services/fincaActiveStore';
import { ArrowRight, Info, MapPin } from 'lucide-react';
import L from 'leaflet';

// Fix for default marker icons in Leaflet + Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

/**
 * MultiFincaGlobe - Seleccionador de fincas interactivo.
 * Tono cercano colombiano (P1). 
 */
export const MultiFincaGlobe = ({ onSelect }) => {
    const { activeFincaSlug, setActiveFinca, setFincas, fincas } = useFincaActiveStore();
    const [loading, setLoading] = useState(fincas.length === 0);

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

    const activeIcon = L.divIcon({
        className: 'bg-transparent',
        html: `<div class="p-1 bg-emerald-600 rounded-full border-2 border-white shadow-xl scale-125 animate-pulse">
            <div class="w-3 h-3 bg-white rounded-full"></div>
           </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const defaultIcon = L.divIcon({
        className: 'bg-transparent',
        html: `<div class="p-1 bg-slate-600 rounded-full border-2 border-white shadow-md">
            <div class="w-3 h-3 bg-white rounded-full"></div>
           </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
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
                    center={[4.5167, -73.9333]} // Centro: Choachí
                    zoom={9}
                    className="h-full w-full"
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        url="https://{s}.tile.osm.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />
                    {fincas.map((finca) => (
                        <Marker
                            key={finca.slug}
                            position={finca.coords || [0, 0]}
                            icon={finca.slug === activeFincaSlug ? activeIcon : defaultIcon}
                        >
                            <Popup className="custom-popup" minWidth={220}>
                                <div className="p-1 space-y-3 font-sans text-slate-200">
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight text-white">{finca.nombre}</h3>
                                        <p className="text-[10px] text-emerald-500 uppercase font-bold tracking-widest mt-0.5">
                                            {finca.biocultural_zone?.replace(/_/g, ' ')}
                                        </p>
                                    </div>

                                    <p className="text-sm italic leading-snug text-slate-400">
                                        "{finca.descripcion_corta}"
                                    </p>

                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${finca.estado === 'activo' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-800 text-slate-400'
                                            }`}>
                                            {finca.estado}
                                        </span>
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
                    ))}
                </MapContainer>
            </div>
        </div>
    );
};

export default MultiFincaGlobe;
