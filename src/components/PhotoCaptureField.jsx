import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, RotateCcw, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { captureAndCompress } from '../services/photoService';
import { compressImage, IMAGE_TOO_LARGE_MESSAGE } from '../utils/imageCompress';
import { sanitizeBlobUrl } from '../utils/blobUrl';
import { warmVisionModel } from '../services/visionWarmService';

/**
 * PhotoCaptureField, Componente reutilizable para captura de fotos en campo.
 * Soporta: captura con cámara, previsualización, compresión automática,
 * re-toma y eliminación (Issue #86, #87).
 *
 * @param {Object} props
 * @param {Function} props.onPhoto - callback(blob) - Foto procesada/comprimida
 * @param {Function} [props.onRemove] - callback() - Limpieza de estado
 * @param {string}   [props.label] - Etiqueta del botón/campo
 * @param {Blob}     [props.value] - El blob actual (opcional, para persistencia en forms)
 * @param {string}   [props.className] - Estilos extra
 */
const PhotoCaptureField = ({ onPhoto, onRemove, label = "Capturar Foto", value = null, className = "" }) => {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    // Dual capture (2026-05-27): cámara prominente (capture=environment) +
    // galería como secundario. En mobile el `capture` fuerza la cámara nativa
    // sin picker intermedio; en desktop solo se renderiza el de galería.
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    // Sincronizar preview con el valor prop
    useEffect(() => {
        let active = true;
        let url = null;

        if (value) {
            url = URL.createObjectURL(value);
            const safeUrl = sanitizeBlobUrl(url);
            if (active && safeUrl) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setPreviewUrl(safeUrl);
            } else {
                URL.revokeObjectURL(url);
            }
        } else {
            setPreviewUrl(null);
        }

        return () => {
            active = false;
            if (url) URL.revokeObjectURL(url);
        };
    }, [value]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Solo se permiten imágenes');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Pre-compresión cliente-lado (operador 2026-05-27): 1600 px / JPEG
            // 0.85 → fallback 0.7 → reject > 2 MB. Aplica ANTES de
            // captureAndCompress para garantizar que el blob persistido nunca
            // venga del path full-size de la cámara.
            const preCompressed = await compressImage(file);
            if (!preCompressed.ok) {
                if (/** @type {any} */ (preCompressed).reason === 'too_large') {
                    setError(IMAGE_TOO_LARGE_MESSAGE);
                } else {
                    setError('No se pudo procesar la foto. Reintenta.');
                }
                return;
            }
            const { blob } = await captureAndCompress(/** @type {File} */ (/** @type {any} */ (preCompressed.blob)));
            onPhoto(blob);
        } catch (err) {
            console.error('[PhotoField] Error procesando foto:', err);
            setError('Error al procesar la foto. Reintenta.');
        } finally {
            setIsProcessing(false);
            // Reset inputs para permitir seleccionar la misma foto si se desea tras eliminar
            if (cameraInputRef.current) cameraInputRef.current.value = '';
            if (galleryInputRef.current) galleryInputRef.current.value = '';
        }
    };

    const handleRemove = () => {
        if (window.confirm('¿Eliminar esta foto?')) {
            onRemove();
            setError(null);
        }
    };

    const handleRetake = () => {
        // Por defecto re-tomar usa la cámara — coherente con el botón primario.
        cameraInputRef.current?.click();
    };

    /**
     * Warm vision on-click (decisión operador 2026-05-27 opción A).
     * Dispara warm del modelo de visión en background cuando el operador
     * toca el botón cámara. Mientras enfoca foto/galería (3-5s humano), el
     * modelo carga en GPU. Idempotente + fire-and-forget.
     */
    const handleClickCamera = () => {
        warmVisionModel().catch(() => {}); // fire-and-forget, ignora errores
        cameraInputRef.current?.click();
    };

    const handleClickGallery = () => {
        warmVisionModel().catch(() => {}); // fire-and-forget, ignora errores
        galleryInputRef.current?.click();
    };

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {/* Dual input (2026-05-27): cámara con capture="environment" (mobile
                abre cámara nativa) + galería sin capture (picker SO). */}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                ref={cameraInputRef}
                className="hidden"
                aria-label="Tomar foto con camara"
            />
            <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                ref={galleryInputRef}
                className="hidden"
                aria-label="Seleccionar foto de galeria"
            />

            {!previewUrl && !isProcessing && (
                // Mobile-first: dos botones lado a lado. Cámara primario (más
                // grande visualmente, color brand) + galería secundario.
                // Se mantienen ambos en desktop — algunos navegadores ignoran
                // `capture` y el de cámara cae a picker normal igual.
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={handleClickCamera}
                        className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-emerald-900/30 hover:bg-emerald-800/40 active:bg-emerald-800/60 border-2 border-emerald-700/60 transition-all min-h-[160px] text-emerald-200"
                    >
                        <Camera size={40} className="text-emerald-300" />
                        <span className="text-base font-bold leading-tight text-center">Tomar foto</span>
                        <span className="text-[10px] text-emerald-400/80 uppercase tracking-wider">Cámara</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleClickGallery}
                        className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 border-2 border-dashed border-slate-700 transition-all min-h-[160px] text-slate-400"
                    >
                        <ImageIcon size={40} className="opacity-60" />
                        <span className="text-base font-bold leading-tight text-center">Subir desde galería</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
                    </button>
                </div>
            )}

            {isProcessing && (
                <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl bg-slate-900 border-2 border-slate-800 min-h-[160px]">
                    <Loader2 size={48} className="animate-spin text-muzo-glow" />
                    <span className="text-xl font-bold text-slate-500 text-animate-pulse">Procesando...</span>
                </div>
            )}

            {previewUrl && !isProcessing && (
                <div className="relative group rounded-2xl overflow-hidden border-2 border-slate-800 bg-slate-900 animate-in fade-in zoom-in duration-300">
                    <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-48 object-cover opacity-80"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent flex items-end p-4 gap-2">
                        <button
                            type="button"
                            onClick={handleRetake}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-600 active:scale-95 transition-transform"
                        >
                            <RotateCcw size={20} />
                            <span>Re-tomar</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="bg-red-900/40 hover:bg-red-900/60 text-red-200 p-3 rounded-xl border border-red-800/50 active:scale-95 transition-transform"
                            aria-label="Eliminar"
                        >
                            <Trash2 size={24} />
                        </button>
                    </div>

                    <div className="absolute top-4 right-4 bg-emerald-500 text-slate-950 p-1 rounded-full">
                        <CheckCircle size={20} />
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800/50 rounded-xl text-red-400 text-sm animate-in slide-in-from-top-1">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                    <button
                        onClick={handleClickCamera}
                        className="ml-auto underline font-bold"
                    >
                        Reintentar
                    </button>
                </div>
            )}
        </div>
    );
};

export default PhotoCaptureField;
