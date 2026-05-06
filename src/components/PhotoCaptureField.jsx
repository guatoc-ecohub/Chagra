import React, { useState, useRef, useEffect } from 'react';
import { Camera, RotateCcw, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { captureAndCompress } from '../services/photoService';
import { sanitizeBlobUrl } from '../utils/blobUrl';

/**
 * PhotoCaptureField, Componente reutilizable para captura de fotos en campo.
 * Soporta: captura con cámara, previsualización, compresión automática,
 * re-toma y eliminación (Issue #86, #87).
 *
 * @param {Object} props
 * @param {Function} props.onPhoto - callback(blob) - Foto procesada/comprimida
 * @param {Function} props.onRemove - callback() - Limpieza de estado
 * @param {string}   props.label - Etiqueta del botón/campo
 * @param {Blob}     props.value - El blob actual (opcional, para persistencia en forms)
 * @param {string}   props.className - Estilos extra
 */
const PhotoCaptureField = ({ onPhoto, onRemove, label = "Capturar Foto", value = null, className = "" }) => {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    // Sincronizar preview con el valor prop
    useEffect(() => {
        let active = true;
        let url = null;

        if (value) {
            url = URL.createObjectURL(value);
            const safeUrl = sanitizeBlobUrl(url);
            if (active && safeUrl) {
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
            const { blob } = await captureAndCompress(file);
            onPhoto(blob);
        } catch (err) {
            console.error('[PhotoField] Error procesando foto:', err);
            setError('Error al procesar la foto. Reintenta.');
        } finally {
            setIsProcessing(false);
            // Reset input para permitir seleccionar la misma foto si se desea tras eliminar
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemove = () => {
        if (window.confirm('¿Eliminar esta foto?')) {
            onRemove();
            setError(null);
        }
    };

    const handleRetake = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
            />

            {!previewUrl && !isProcessing && (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 hover:border-slate-500 active:bg-slate-800 transition-all min-h-[160px] text-slate-400"
                >
                    <Camera size={48} className="opacity-50" />
                    <span className="text-xl font-bold">{label}</span>
                </button>
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
                        onClick={() => fileInputRef.current?.click()}
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
