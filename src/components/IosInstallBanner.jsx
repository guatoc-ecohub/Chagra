import React, { useState } from 'react';
import { Share, X } from 'lucide-react';

const IosInstallBanner = () => {
    // Use lazy initializer to avoid setState in useEffect and satisfy project linting
    const [showBanner, setShowBanner] = useState(() => {
        if (typeof window === 'undefined') return false;

        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
        const isDismissed = localStorage.getItem('chagra-ios-install-dismissed');

        return !!(isIos && !isStandalone && !isDismissed);
    });

    const handleDismiss = () => {
        localStorage.setItem('chagra-ios-install-dismissed', 'true');
        setShowBanner(false);
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden">
                {/* Bio-punk accent */}
                <div className="absolute top-0 left-0 w-1 h-full bg-muzo-glow"></div>

                <div className="bg-muzo-glow/20 p-2 rounded-xl flex-shrink-0">
                    <Share className="text-muzo-glow" size={24} />
                </div>

                <div className="flex-1">
                    <h3 className="text-white font-bold text-sm">Instalá Chagra</h3>
                    <p className="text-slate-400 text-xs">
                        Tocá <span className="text-slate-200">Compartir</span> en Safari y luego <span className="text-slate-200">"Añadir a inicio"</span>.
                    </p>
                </div>

                <button
                    onClick={handleDismiss}
                    className="p-2 text-slate-500 hover:text-white transition-colors"
                    aria-label="Cerrar"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

export default IosInstallBanner;
