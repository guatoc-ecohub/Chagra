import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export const DISMISS_KEY = 'chagra-android-install-dismissed';

/**
 * AndroidInstallBanner — botón claro "Instalar Chagra" para Android Chrome.
 *
 * Bug operador 2026-06-10: Chrome Android cumple los criterios de
 * instalabilidad (manifest + íconos + SW fetch + HTTPS) pero sin handler de
 * `beforeinstallprompt` la única vía era el menú ⋮, que el campesino no
 * encuentra. Capturamos el evento y lo re-disparamos desde un botón visible.
 *
 * Detección de plataforma por CAPACIDAD: solo Chromium (Android Chrome /
 * Samsung Internet / Edge) emite `beforeinstallprompt`. iOS Safari jamás lo
 * dispara — su flujo manual ("Compartir → Añadir a inicio") vive en
 * IosInstallBanner. Por construcción los dos banners no colisionan.
 *
 * Theme-aware: las clases slate y muzo-glow pasan por la indirección CSS-var
 * de tailwind.config.js (--c-slate-*, --c-muzo-glow), igual que los demás
 * banners.
 */
const AndroidInstallBanner = () => {
  // El evento beforeinstallprompt diferido. null = sin banner.
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    // Ya instalada (corre standalone) o descartada antes → no escuchar.
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return undefined;
    let dismissed = null;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY);
    } catch (_) { /* modo privado — tratamos como no descartado */ }
    if (dismissed) return undefined;

    const onBeforeInstallPrompt = (event) => {
      // Cancela el mini-infobar de Chrome y guarda el prompt para dispararlo
      // desde un botón grande y en español (baja alfabetización digital).
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const onAppInstalled = () => setDeferredPrompt(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const promptEvent = deferredPrompt;
    if (!promptEvent) return;
    // prompt() solo se puede llamar UNA vez por evento → soltamos la ref ya.
    setDeferredPrompt(null);
    try {
      promptEvent.prompt();
      // 'accepted' → Chrome instala y dispara appinstalled.
      // 'dismissed' → ocultamos igual; Chrome no re-emite el evento pronto.
      await promptEvent.userChoice;
    } catch (_) {
      /* prompt ya consumido o bloqueado por el navegador — silencioso */
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, 'true');
    } catch (_) { /* modo privado — solo oculta esta sesión */ }
    setDeferredPrompt(null);
  };

  if (!deferredPrompt) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden">
        {/* Acento bio-punk, igual que IosInstallBanner */}
        <div className="absolute top-0 left-0 w-1 h-full bg-muzo-glow" />

        <div className="bg-muzo-glow/20 p-2 rounded-xl flex-shrink-0">
          <Download className="text-muzo-glow" size={24} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-sm">Instala Chagra</h3>
          <p className="text-slate-400 text-xs leading-snug">
            Tenla en tu pantalla de inicio, como una aplicación.
          </p>
        </div>

        <button
          onClick={handleInstall}
          className="px-3 py-2 bg-muzo-glow/20 hover:bg-muzo-glow/30 text-muzo-glow text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
          type="button"
        >
          Instalar Chagra
        </button>

        <button
          onClick={handleDismiss}
          className="p-1.5 text-slate-500 hover:text-white transition-colors flex-shrink-0"
          aria-label="Cerrar"
          type="button"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default AndroidInstallBanner;
