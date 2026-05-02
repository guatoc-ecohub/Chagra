import React, { useEffect } from 'react';
import { MapPin, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';

const GeolocationButton = ({ onCoords, label = "Capturar ubicación", icon: _Icon = MapPin, className = "" }) => {
    const Icon = _Icon;
    const { position, error, loading, request } = useGeolocation();

    useEffect(() => {
        if (position && !error) {
            onCoords(position.lat, position.lon);
        }
    }, [position, error, onCoords]);

    const renderError = () => {
        if (!error) return null;

        let message = "Error al obtener ubicación";
        let subMessage = "Reintentá con mejor señal cielo abierto.";

        if (error === 'denied') {
            message = "Permiso denegado";
            const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
            subMessage = isIos
                ? "iOS Safari → Ajustes → Privacidad → Localización → Permitir para chagra.guatoc.co"
                : "Habilitá el permiso de ubicación en los ajustes de tu navegador.";
        } else if (error === 'timeout') {
            message = "Tiempo agotado";
            subMessage = "El GPS tardó demasiado. Reintentá a cielo abierto.";
        } else if (error === 'unsupported') {
            message = "No compatible";
            subMessage = "Tu dispositivo o conexión HTTPS no soporta geolocalización.";
        }

        return (
            <div className="mt-2 p-3 bg-amber-900/20 border border-amber-800/50 rounded-xl flex gap-3 animate-in fade-in slide-in-from-top-1">
                <AlertCircle size={20} className="text-amber-500 shrink-0" />
                <div>
                    <p className="text-sm font-bold text-amber-500">{message}</p>
                    <p className="text-xs text-amber-500/70 leading-tight">{subMessage}</p>
                </div>
            </div>
        );
    };

    return (
        <div className={`w-full ${className}`}>
            <button
                type="button"
                onClick={() => request()}
                disabled={loading}
                className={`w-full p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all active:scale-95 ${loading
                    ? 'bg-slate-800 border-slate-700 text-slate-500'
                    : position && !error
                        ? 'bg-green-900/20 border-green-700 text-green-400'
                        : 'bg-slate-900 border-slate-800 text-muzo-glow hover:bg-slate-800'
                    }`}
            >
                {loading ? (
                    <Loader2 size={24} className="animate-spin" />
                ) : error ? (
                    <RotateCcw size={24} />
                ) : (
                    <Icon size={24} />
                )}

                <span className="font-black text-lg uppercase tracking-tight">
                    {loading ? "Capturando..." : error ? "Reintentar" : position ? "Ubicación capturada" : label}
                </span>
            </button>

            {renderError()}

            {position && !error && (
                <p className="mt-2 text-center text-2xs text-slate-500 font-mono">
                    {position.lat.toFixed(6)}, {position.lon.toFixed(6)} (±{Math.round(position.accuracy)}m)
                </p>
            )}
        </div>
    );
};

export default GeolocationButton;
