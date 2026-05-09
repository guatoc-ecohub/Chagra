import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useFincaActiveStore } from '../services/fincaActiveStore';
import { ArrowRight, Info } from 'lucide-react';
import L from 'leaflet';

/**
 * MultiFincaGlobe - Seleccionador de fincas interactivo.
 * Tono cercano colombiano (P1). 
 */
const MultiFincaGlobe = ({ onSelect }) => {
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

    const defaultIcon = L.divIcon({
        className: 'bg-transparent',
        html: `<div class="p-1 bg-primary rounded-full border-2 border-white shadow-md">
            <div class="w-3 h-3 bg-white rounded-full"></div>
           </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const activeIcon = L.divIcon({
        className: 'bg-transparent',
        html: `<div class="p-1 bg-green-600 rounded-full border-2 border-white shadow-xl scale-125 animate-pulse">
            <div class="w-3 h-3 bg-white rounded-full"></div>
           </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 bg-secondary/20 rounded-xl animate-pulse">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-muted-foreground font-medium italic">Buscando fincas aliadas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20 text-sm text-primary">
                <Info size={18} />
                <p>Toca un punto para conocer una finca y entrar a ver su estado.</p>
            </div>

            <div className="h-[400px] w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white relative z-0">
                <MapContainer
                    center={[4.5167, -73.9333]}
                    zoom={7}
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
                                <div className="p-3 space-y-3 font-sans text-slate-900">
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight">{finca.nombre}</h3>
                                        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                                            {finca.biocultural_zone?.replace(/_/g, ' ')}
                                        </p>
                                    </div>

                                    <p className="text-sm italic leading-snug">
                                        "{finca.descripcion_corta}"
                                    </p>

                                    <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${finca.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {finca.estado}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setActiveFinca(finca.slug);
                                            if (onSelect) onSelect(finca);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-[0.98] active:scale-95 transition-all shadow-md group"
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
