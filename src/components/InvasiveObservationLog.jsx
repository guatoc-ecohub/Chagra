/**
 * InvasiveObservationLog.jsx — Flow de reporte de especies invasoras (ADR-019 Phase 1)
 * AGPL-3.0 © Chagra
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Camera, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { savePayload } from '../services/payloadService';
import { getAllSpecies } from '../db/catalogDB';
import PhotoCaptureField from './PhotoCaptureField';
import NativeSubstituteSuggestion from './NativeSubstituteSuggestion';
import GeolocationButton from './GeolocationButton';
import StatusBadge from './StatusBadge';
import { PEST_STATUSES } from '../constants/assetStatuses';

export default function InvasiveObservationLog({ onBack, onSave, initialLocationId = null, initialWkt = null }) {
    const [formData, setFormData] = useState({
        speciesId: '',
        notes: '',
        locationId: initialLocationId || '',
        status: 'reported'
    });
    const [speciesList, setSpeciesList] = useState([]);
    // 'loading' | 'ready' | 'error' — refleja el estado del fetch del catálogo.
    // Sin esto, un fallo silencioso dejaba el selector vacío sin diagnóstico
    // y el usuario quedaba bloqueado (no podía guardar).
    const [catalogStatus, setCatalogStatus] = useState('loading');
    const [photo, setPhoto] = useState(null);
    const [location, setLocation] = useState(initialWkt ? { wkt: initialWkt } : null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [selectedInvasive, setSelectedInvasive] = useState(null);

    useEffect(() => {
        // Cargar especies invasoras del catálogo. Manejo defensivo contra
        // fallo de inicialización SQLite WASM: si /catalog.sqlite no responde
        // o OPFS está bloqueado, la promesa rechaza y antes el usuario veía
        // un selector vacío sin diagnóstico. Ahora exponemos el error.
        let cancelled = false;
        getAllSpecies()
            .then((all) => {
                if (cancelled) return;
                const invasoras = all.filter((s) => s.category === 'especies_invasoras');
                setSpeciesList(invasoras);
                setCatalogStatus('ready');
                if (invasoras.length === 0) {
                    console.warn('[InvasiveObservationLog] Catálogo cargado pero sin especies invasoras (filter category=especies_invasoras devolvió 0).');
                }
            })
            .catch((err) => {
                if (cancelled) return;
                console.error('[InvasiveObservationLog] Falló carga del catálogo:', err);
                setCatalogStatus('error');
            });
        return () => { cancelled = true; };
    }, []);

    const handleInput = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'speciesId') {
            const sp = speciesList.find(s => s.id === value);
            setSelectedInvasive(sp);
        }
    };

    // handlePhotoCapture removed in favor of PhotoCaptureField

    const handleLocationCapture = (lat, lon) => {
        setLocation({
            wkt: `POINT(${lon} ${lat})`,
            coords: [lon, lat]
        });
    };

    const handleSave = async () => {
        if (isSaving || !formData.speciesId) return;

        setIsSaving(true);
        try {
            const sp = speciesList.find(s => s.id === formData.speciesId);

            // ADR-019: la metadata invasiva debe persistir dentro de data.attributes
            // (FarmOS y nuestra capa de sync solo procesan data, no campos al root).
            // La encodeamos en notes.value con marcador parseable [INVASIVE_REPORT]
            // para que un parser futuro pueda extraerla. El campo geometry va como
            // attribute estándar (mismo patrón que log--seeding).
            const noteLines = [
                '[INVASIVE_REPORT]',
                `species_id: ${sp.id}`,
                `nombre_comun: ${sp.nombre_comun}`,
                `nombre_cientifico: ${sp.nombre_cientifico}`,
                `action: ${formData.status}`
            ];
            if (formData.notes) {
                noteLines.push('', '--- Notas operador ---', formData.notes);
            }

            const payload = {
                data: {
                    type: "log--observation",
                    attributes: {
                        name: `Reporte invasora: ${sp.nombre_comun}`,
                        timestamp: new Date().toISOString().split('.')[0] + '+00:00',
                        status: formData.status,
                        notes: { value: noteLines.join('\n'), format: 'plain_text' },
                        ...(location?.wkt && { geometry: location.wkt })
                    },
                    relationships: formData.locationId ? {
                        location: { data: [{ type: "asset--land", id: formData.locationId }] }
                    } : undefined
                }
            };

            const result = await savePayload('observation', payload);
            onSave(result.message, !result.success);

            if (result.success) {
                setSaveSuccess(true);
            } else {
                // En offline también consideramos éxito local para mostrar sugerencia
                setSaveSuccess(true);
            }
        } catch (error) {
            console.error('Error saving invasive observation:', error);
            onSave('Error al guardar reporte', true);
        } finally {
            setIsSaving(false);
        }
    };

    if (saveSuccess && selectedInvasive) {
        return (
            <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col p-6 items-center justify-center gap-6">
                <div className="text-center animate-in fade-in zoom-in duration-300">
                    <CheckCircle size={64} className="text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold">Reporte Guardado</h3>
                    <p className="text-slate-400 mt-2">Se ha registrado la presencia de {selectedInvasive.nombre_comun}.</p>
                </div>

                <div className="w-full max-w-sm">
                    <NativeSubstituteSuggestion
                        invasiveSpeciesId={selectedInvasive.id}
                        invasiveName={selectedInvasive.nombre_comun}
                        coordinates={location?.wkt}
                        onSelectNative={(native) => {
                            // ADR-019: solo incluir plant_type si el catálogo lo mapea
                            // explícitamente. native.id (string del catálogo, ej. 'aliso')
                            // NO es taxonomy_term UUID de FarmOS — un fallback con ese id
                            // crearía referencia fantasma y rompería el sync.
                            const initialData = {
                                crop: native.nombre_comun,
                                notes: `Siembra de sustituto nativo tras reporte de invasora ${selectedInvasive.nombre_comun}.`,
                                coordinates: location?.coords
                            };
                            if (native.plant_type) {
                                initialData.plant_type = native.plant_type;
                            }
                            window.dispatchEvent(new CustomEvent('chagraNavigate', {
                                detail: { view: 'sembrar', initialData }
                            }));
                        }}
                        onDismiss={onBack}
                    />
                </div>

                <button onClick={onBack} className="mt-4 text-slate-500 font-bold hover:text-slate-300">
                    Cerrar
                </button>
            </div>
        );
    }

    return (
        <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
            <header className="p-4 sticky top-0 bg-slate-950 border-b border-slate-800 flex items-center gap-4 z-10 shrink-0 shadow-md">
                <button onClick={onBack} className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[56px] min-w-[56px] flex justify-center items-center shrink-0">
                    <ArrowLeft size={32} />
                </button>
                <h2 className="text-3xl font-bold truncate">Reportar Invasora</h2>
            </header>

            <div className="flex-1 p-5 flex flex-col gap-6 pb-24">
                <div className="bg-amber-900/10 border border-amber-800/30 p-4 rounded-xl flex gap-3">
                    <AlertCircle className="text-amber-500 shrink-0" size={24} />
                    <p className="text-sm text-amber-200">
                        Este reporte ayuda a planear la restauración del ecosistema. Las invasoras no se registran como activos de la finca.
                    </p>
                </div>

                <label className="flex flex-col gap-2">
                    <span className="text-xl font-bold text-slate-400">Especie Detectada</span>
                    <select
                        name="speciesId"
                        value={formData.speciesId}
                        onChange={handleInput}
                        disabled={catalogStatus !== 'ready' || speciesList.length === 0}
                        className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none disabled:opacity-50"
                    >
                        {catalogStatus === 'loading' && (
                            <option value="">Cargando catálogo…</option>
                        )}
                        {catalogStatus === 'error' && (
                            <option value="">Error cargando catálogo — recarga la app</option>
                        )}
                        {catalogStatus === 'ready' && speciesList.length === 0 && (
                            <option value="">No hay especies invasoras en el catálogo</option>
                        )}
                        {catalogStatus === 'ready' && speciesList.length > 0 && (
                            <>
                                <option value="">Selecciona especie…</option>
                                {speciesList.map((s) => (
                                    <option key={s.id} value={s.id}>{s.nombre_comun}</option>
                                ))}
                            </>
                        )}
                    </select>
                    {catalogStatus === 'error' && (
                        <p className="text-sm text-red-400 mt-1">
                            No se pudo cargar el catálogo de especies. Verifica conexión y refresca.
                            Si persiste, revisa la consola del navegador.
                        </p>
                    )}
                </label>

                <div className="flex flex-col gap-2">
                    <span className="text-xl font-bold text-slate-400">Ubicación / GPS</span>
                    <GeolocationButton
                        onCoords={handleLocationCapture}
                        label={location ? "Cambiar ubicación" : "Capturar GPS"}
                    />
                </div>

                <label className="flex flex-col gap-2">
                    <span className="text-xl font-bold text-slate-400">Estado del Reporte</span>
                    <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-slate-900 border border-slate-700">
                        {PEST_STATUSES.map(s => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, status: s.id }))}
                                className={`transition-all ${formData.status === s.id ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-950 scale-105' : 'opacity-60 hover:opacity-100'}`}
                            >
                                <StatusBadge status={s.id} type="pest" />
                            </button>
                        ))}
                    </div>
                </label>

                <label className="flex flex-col gap-2">
                    <span className="text-xl font-bold text-slate-400">Notas de Extracción</span>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInput}
                        rows="3"
                        className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[100px]"
                        placeholder="Participantes, biomasa extraída, método..."
                    />
                </label>

                <PhotoCaptureField
                    label="Foto de Evidencia"
                    value={photo}
                    onPhoto={(blob) => setPhoto(blob)}
                    onRemove={() => setPhoto(null)}
                />

                <button
                    onClick={handleSave}
                    disabled={isSaving || !formData.speciesId}
                    className="mt-4 p-6 rounded-xl bg-emerald-600 active:bg-emerald-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-emerald-800 disabled:opacity-50"
                >
                    {isSaving ? 'Guardando...' : 'Guardar Reporte'}
                </button>
            </div>
        </div>
    );
}
