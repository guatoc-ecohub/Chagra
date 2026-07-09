import React, { useState } from 'react';
import { Share, X } from 'lucide-react';
import { isIosDevice, isStandaloneDisplay } from '../hooks/usePwaInstall';
import { MSG } from '../config/messages.js';

/**
 * IosInstallBanner — instrucciones de instalación manual para iOS Safari.
 *
 * iOS jamás emite `beforeinstallprompt`: la única vía es el flujo manual
 * "Compartir → Añadir a pantalla de inicio". La detección de plataforma y
 * el copy de los pasos se comparten con el recorrido de bienvenida
 * (usePwaInstall.isIosDevice + MSG.instalarApp) para no duplicarlos.
 */
const IosInstallBanner = () => {
    // Lazy initializer: evita setState en useEffect y respeta el linting.
    const [showBanner, setShowBanner] = useState(() => {
        if (typeof window === 'undefined') return false;
        const isDismissed = localStorage.getItem('chagra-ios-install-dismissed');
        return !!(isIosDevice() && !isStandaloneDisplay() && !isDismissed);
    });

    const handleDismiss = () => {
        localStorage.setItem('chagra-ios-install-dismissed', 'true');
        setShowBanner(false);
    };

    if (!showBanner) return null;

    return (
        <div className="pwa-install-banner fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in fade-in slide-in-from-bottom-5 duration-500">
            {/* Footprint compacto (QA-VISUAL-MUNDOS 2026-07-08): mismo ajuste que
                el banner de Android — bajado y compactado para no tapar los CTAs
                del final de página en móvil. */}
            <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-2.5 flex items-center gap-2.5 relative overflow-hidden">
                {/* Bio-punk accent */}
                <div className="absolute top-0 left-0 w-1 h-full bg-muzo-glow"></div>

                <div className="bg-muzo-glow/20 p-1.5 rounded-xl flex-shrink-0">
                    <Share className="text-muzo-glow" size={20} />
                </div>

                <div className="flex-1">
                    <h3 className="text-white font-bold text-sm">{MSG.instalarApp.titulo}</h3>
                    <p className="text-slate-400 text-xs">
                        <span className="text-slate-200">{MSG.instalarApp.iosPaso1}</span>{' '}
                        {MSG.instalarApp.iosPaso2}
                    </p>
                </div>

                <button
                    onClick={handleDismiss}
                    className="p-2 text-slate-500 hover:text-white transition-colors"
                    aria-label={MSG.instalarApp.cerrarAria}
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

export default IosInstallBanner;
