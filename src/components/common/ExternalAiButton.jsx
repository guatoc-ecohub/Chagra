/**
 * ExternalAiButton.jsx, R5
 * Botón reutilizable que copia un prompt portátil al clipboard.
 * Si el clipboard API falla, muestra un modal con textarea seleccionable.
 * AGPL-3.0 © Chagra
 */

import React, { useState } from 'react';
import { Clipboard, Share2, X } from 'lucide-react';
import { getDeviceAltitude } from '../../services/altitudeService';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

const TOAST_NORMAL = '✓ Prompt copiado. Pégalo en Gemini, ChatGPT o Claude.';
const TOAST_DEMO = '✓ Prompt copiado para demostrar portabilidad. Pégalo en Gemini gratis o ChatGPT.';

/** Pequeño modal de fallback cuando clipboard API no está disponible */
function ClipboardFallbackModal({ prompt, onClose }) {
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Copiar prompt manualmente"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-lg w-full shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-slate-200">Copiar prompt manualmente</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-200 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X size={16} />
                    </button>
                </div>
                <p className="text-xs text-slate-400 mb-2">Selecciona todo con <kbd className="bg-slate-800 px-1 rounded">Ctrl+A</kbd> y copia con <kbd className="bg-slate-800 px-1 rounded">Ctrl+C</kbd></p>
                <textarea
                    readOnly
                    value={prompt}
                    className="w-full h-48 text-xs bg-slate-800 text-slate-300 border border-slate-700 rounded-lg p-3 resize-none font-mono"
                    onFocus={(e) => e.target.select()}
                    aria-label="Prompt para IA externa"
                />
            </div>
        </div>
    );
}

/**
 * ExternalAiButton, Componente reutilizable R5.
 *
 * Props:
 *   - context: { speciesName, scientificName, companions, ... } pasado al builder
 *   - buildPrompt: fn(context) → string, constructor de prompt apropiado
 *   - label: texto del botón (por defecto 'Copiar para IA externa')
 *   - variant: 'share' | 'clipboard', selección de icono (por defecto 'clipboard')
 *   - className: clases CSS adicionales
 */
export function ExternalAiButton({ context, buildPrompt, label = 'Copiar para IA externa', variant = 'clipboard', className = '' }) {
    const [toast, setToast] = useState(null);
    const [fallbackPrompt, setFallbackPrompt] = useState(null);

    const handleClick = async () => {
        // Enriquecer context con altitud detectada por GPS si no viene
        // explícita (Miguel 2026-05-04: el AltitudeBadge mostraba 2550 msnm
        // pero el prompt decía "altitud no especificada" porque
        // FARM_CONFIG.ALTITUD_MSNM solo lee env, no GPS).
        let enrichedContext = context;
        if (context && (context.altitudMsnm == null)) {
            try {
                const detected = await getDeviceAltitude();
                if (typeof detected === 'number' && Number.isFinite(detected)) {
                    enrichedContext = { ...context, altitudMsnm: detected };
                }
            } catch (err) {
                // Silent fail, getDeviceAltitude tiene su propio fallback;
                // si retorna null el builder cae a "altitud no especificada"
                // que es el comportamiento previo aceptable.
                console.warn('[ExternalAiButton] altitude resolution failed:', err);
            }
        }

        const prompt = buildPrompt(enrichedContext);

        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(prompt);
                const msg = isDemoMode ? TOAST_DEMO : TOAST_NORMAL;
                setToast(msg);
                setTimeout(() => setToast(null), 3500);

                // Telemetría mínima: increment en sync_meta (best-effort, no bloquea)
                try {
                    const meta = JSON.parse(localStorage.getItem('chagra:sync_meta') || '{}');
                    meta.external_ai_prompt_count = (meta.external_ai_prompt_count || 0) + 1;
                    localStorage.setItem('chagra:sync_meta', JSON.stringify(meta));
                } catch { /* telemetría no crítica */ }

                return;
            } catch {
                /* fallback below */
            }
        }

        // Clipboard API no disponible o permission denied → modal
        setFallbackPrompt(prompt);
    };

    const Icon = variant === 'share' ? Share2 : Clipboard;

    return (
        <>
            <div className="relative inline-flex flex-col items-start">
                <button
                    type="button"
                    id="external-ai-prompt-btn"
                    onClick={handleClick}
                    title="Genera un prompt completo para copiar en Gemini, ChatGPT o Claude"
                    className={`text-xs px-3 py-2 rounded-lg bg-amber-900/30 text-amber-400 border border-amber-800 hover:bg-amber-800/40 flex items-center gap-1.5 transition-colors ${className}`}
                >
                    <Icon size={12} />
                    {label}
                </button>

                {toast && (
                    <span
                        role="status"
                        aria-live="polite"
                        className="absolute top-full mt-1 left-0 z-20 text-[10px] text-amber-300 bg-amber-900/80 border border-amber-700 px-2.5 py-1 rounded-lg whitespace-nowrap shadow-lg"
                    >
                        {toast}
                    </span>
                )}
            </div>

            {fallbackPrompt && (
                <ClipboardFallbackModal prompt={fallbackPrompt} onClose={() => setFallbackPrompt(null)} />
            )}
        </>
    );
}

export default ExternalAiButton;
