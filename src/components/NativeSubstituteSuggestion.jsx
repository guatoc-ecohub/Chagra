/**
 * NativeSubstituteSuggestion.jsx — R9
 * Muestra sustitutos nativos curados tras la extracción de una especie invasora.
 * AGPL-3.0 © Chagra
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Leaf, Sprout, X, RefreshCw } from 'lucide-react';
import ChagraGrowLoader from './ChagraGrowLoader';
import { getNativeSubstitutesForInvasive } from '../db/catalogDB';

// Watchdog para evitar "ciclo eterno" en pantalla post-reporte (Miguel
// 2026-05-02): si initCatalog() o el fetch de /catalog.sqlite cuelgan
// (offline + Service Worker frío, OPFS bloqueado, WASM init lento), el
// spinner queda forever. 10s es generoso pero acotado.
const QUERY_TIMEOUT_MS = 10000;

const ESTRATO_LABEL = {
    bajo: 'Bajo',
    medio: 'Medio',
    alto: 'Alto',
};

const ESTRATO_COLOR = {
    bajo: 'bg-lime-900/40 text-lime-400 border-lime-800',
    medio: 'bg-emerald-900/40 text-emerald-400 border-emerald-800',
    alto: 'bg-teal-900/40 text-teal-400 border-teal-800',
};

/**
 * NativeSubstituteSuggestion
 *
 * Props:
 *   - invasiveSpeciesId: string — ID en el catálogo (ej: "ulex_europaeus")
 *   - invasiveName: string — nombre común para mostrar al usuario
 *   - coordinates: string | null — WKT o cadena de coords para pre-cargar en seeding log
 *   - thermalZone: string | null — piso térmico para filtrar ("frio", "paramo", etc.)
 *   - onSelectNative: fn({ id, nombre_comun, nombre_cientifico, estrato, coordinates, inversiveSourceName }) → void
 *   - onDismiss: fn() → void
 */
export function NativeSubstituteSuggestion({
    invasiveSpeciesId,
    invasiveName = 'especie invasora',
    coordinates = null,
    thermalZone = null,
    onSelectNative,
    onDismiss,
}) {
    const [substitutes, setSubstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryNonce, setRetryNonce] = useState(0);

    const handleRetry = useCallback(() => {
        setRetryNonce((n) => n + 1);
    }, []);

    useEffect(() => {
        let alive = true;
        // Reset intencional al cambiar invasiveSpeciesId/thermalZone/retry:
        // el usuario espera ver el loader nuevamente si salta entre especies
        // distintas o pulsa "reintentar".
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        setError(null);

        const timeoutId = setTimeout(() => {
            if (alive) {
                console.warn('[NativeSubstituteSuggestion] Catalog query timeout — likely offline + SW frío.');
                setError('Catálogo local tardó demasiado en responder. Probablemente sin red o cargando aún.');
                setLoading(false);
            }
        }, QUERY_TIMEOUT_MS);

        getNativeSubstitutesForInvasive(invasiveSpeciesId, { thermalZone })
            .then((results) => {
                if (alive) {
                    clearTimeout(timeoutId);
                    setSubstitutes(results);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (alive) {
                    clearTimeout(timeoutId);
                    console.warn('[NativeSubstituteSuggestion] Catalog query failed:', err);
                    setError('No se pudo consultar el catálogo local.');
                    setLoading(false);
                }
            });

        return () => {
            alive = false;
            clearTimeout(timeoutId);
        };
    }, [invasiveSpeciesId, thermalZone, retryNonce]);

    const handleSelect = (native) => {
        if (onSelectNative) {
            onSelectNative({
                ...native,
                coordinates,
                invasiveSourceName: invasiveName,
            });
        }
    };

    return (
        <div
            role="region"
            aria-label="Sugerencia de sustituto nativo"
            className="mt-3 rounded-2xl border border-emerald-800/50 bg-slate-950 overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-emerald-900/20 border-b border-emerald-800/40">
                <div className="flex items-center gap-2">
                    <Leaf size={16} className="text-emerald-400 shrink-0" />
                    <span className="text-sm font-bold text-emerald-300">
                        Sustitutos nativos para <em className="not-italic text-emerald-200">{invasiveName}</em>
                    </span>
                </div>
                {onDismiss && (
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded"
                        aria-label="Cerrar sugerencias"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Body */}
            <div className="p-3 space-y-2">
                {loading && (
                    <div className="flex items-center justify-between gap-2 text-slate-400 py-2">
                        <div className="flex items-center gap-2">
                            <ChagraGrowLoader size={20} />
                            <span className="text-xs">Consultando catálogo local…</span>
                        </div>
                        {onDismiss && (
                            <button
                                type="button"
                                onClick={onDismiss}
                                className="text-[10px] text-slate-500 hover:text-slate-300 underline"
                            >
                                saltar
                            </button>
                        )}
                    </div>
                )}

                {error && (
                    <div className="py-2 space-y-2">
                        <p className="text-xs text-red-400">{error}</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleRetry}
                                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 active:scale-95 transition-all flex items-center gap-1.5"
                            >
                                <RefreshCw size={12} />
                                Reintentar
                            </button>
                            {onDismiss && (
                                <button
                                    type="button"
                                    onClick={onDismiss}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-transparent text-slate-400 border border-slate-800 hover:text-slate-200"
                                >
                                    Cerrar
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {!loading && !error && substitutes.length === 0 && (
                    <p className="text-xs text-slate-400 py-2 italic">
                        Aún no tenemos sustitutos nativos curados para esta especie.
                    </p>
                )}

                {!loading && substitutes.map((native) => (
                    <div
                        key={native.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-800/60 transition-colors"
                    >
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-100 leading-tight truncate">
                                {native.nombre_comun}
                            </p>
                            <p className="text-[10px] text-slate-400 italic truncate">
                                {native.nombre_cientifico}
                            </p>
                            {native.estrato && (
                                <span
                                    className={`mt-1 inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded border ${ESTRATO_COLOR[native.estrato] || 'bg-slate-800 text-slate-400 border-slate-700'}`}
                                >
                                    {ESTRATO_LABEL[native.estrato] || native.estrato}
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            id={`sembrar-nativa-${native.id}`}
                            onClick={() => handleSelect(native)}
                            className="shrink-0 flex items-center gap-1 text-xs px-3 py-2 rounded-lg bg-emerald-900/40 text-emerald-400 border border-emerald-800 hover:bg-emerald-800/50 active:scale-95 transition-all font-semibold"
                            title={`Iniciar siembra de ${native.nombre_comun} en la misma ubicación`}
                        >
                            <Sprout size={12} />
                            Sembrar aquí
                        </button>
                    </div>
                ))}

                {!loading && substitutes.length > 0 && (
                    <p className="text-[9px] text-slate-600 mt-1 px-1">
                        ⚑ Sustitutos filtrados para piso {thermalZone || 'cualquier zona'} · Curación BORRADOR_IA — validar con agrónomo antes del transplante.
                    </p>
                )}
            </div>
        </div>
    );
}

export default NativeSubstituteSuggestion;
