import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import usePwaInstall from '../hooks/usePwaInstall';
import { MSG } from '../config/messages.js';

export const DISMISS_KEY = 'chagra-android-install-dismissed';
// El descarte EXPIRA (operador 2026-06-11: "Chrome no me ofrece instalar" —
// los criterios de instalabilidad PASAN en Chrome; la causa era el descarte
// PERMANENTE de este banner en localStorage, mientras Brave —perfil sin
// descarte previo— sí lo mostraba). Tras la ventana, re-ofrecemos.
export const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 días

/**
 * ¿Hay un descarte vigente? Se guarda el timestamp del descarte; el valor
 * legado 'true' (descarte sin fecha, pre-2026-06-11) se trata como expirado
 * para volver a ofrecer la instalación una vez.
 */
function isDismissalActive() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false; // legado 'true' → expirado
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch (_) {
    return false; // modo privado — tratamos como no descartado
  }
}

/**
 * AndroidInstallBanner — botón claro "Instalar Chagra" para Android Chrome.
 *
 * Bug operador 2026-06-10: Chrome Android cumple los criterios de
 * instalabilidad (manifest + íconos + SW fetch + HTTPS) pero sin handler de
 * `beforeinstallprompt` la única vía era el menú ⋮, que el campesino no
 * encuentra. El manejo del evento vive ahora en usePwaInstall (compartido
 * con el recorrido de bienvenida — BienvenidaFinca): capturamos el evento y
 * lo re-disparamos desde un botón visible.
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
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => isDismissalActive());

  const handleInstall = () => {
    // El hook suelta la ref del evento de inmediato → el banner se oculta ya.
    promptInstall();
  };

  const handleDismiss = () => {
    try {
      // Timestamp, no 'true': el descarte expira (DISMISS_TTL_MS) y el
      // banner vuelve a ofrecerse — un "ahora no" de hace meses no debe
      // esconder la instalación para siempre.
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (_) { /* modo privado — solo oculta esta sesión */ }
    setDismissed(true);
  };

  if (installed || dismissed || !canInstall) return null;

  return (
    <div className="pwa-install-banner fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in fade-in slide-in-from-bottom-5 duration-500">
      {/* Footprint compacto (QA-VISUAL-MUNDOS 2026-07-08): el banner tapaba
          ~150px del contenido inferior en móvil. Se bajó (bottom-24→bottom-20) y
          se compactó (p-4→p-2.5, ícono 24→20) para que quepa dentro del pb del
          contenido y deje de tapar los CTAs del final de página. */}
      <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-2.5 flex items-center gap-2.5 relative overflow-hidden">
        {/* Acento bio-punk, igual que IosInstallBanner */}
        <div className="absolute top-0 left-0 w-1 h-full bg-muzo-glow" />

        <div className="bg-muzo-glow/20 p-1.5 rounded-xl flex-shrink-0">
          <Download className="text-muzo-glow" size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-sm">{MSG.instalarApp.titulo}</h3>
          <p className="text-slate-400 text-xs leading-snug">
            {MSG.instalarApp.subtituloAndroid}
          </p>
        </div>

        <button
          onClick={handleInstall}
          className="px-3 py-2 bg-muzo-glow/20 hover:bg-muzo-glow/30 text-muzo-glow text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
          type="button"
        >
          {MSG.instalarApp.cta}
        </button>

        <button
          onClick={handleDismiss}
          className="p-1.5 text-slate-500 hover:text-white transition-colors flex-shrink-0"
          aria-label={MSG.instalarApp.cerrarAria}
          type="button"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default AndroidInstallBanner;
