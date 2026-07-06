import { useCallback, useEffect, useState } from 'react';

/**
 * usePwaInstall — estado compartido de instalación de la PWA.
 *
 * Extraído de AndroidInstallBanner (bug operador 2026-06-10) para que el
 * banner y el recorrido de bienvenida (BienvenidaFinca) usen EL MISMO manejo
 * de `beforeinstallprompt` sin duplicarlo:
 *
 *  - Solo Chromium (Android Chrome / Samsung Internet / Edge) emite
 *    `beforeinstallprompt`. Se captura con preventDefault() (mata el
 *    mini-infobar de Chrome) y se guarda para dispararlo desde un botón
 *    grande y en español (baja alfabetización digital).
 *  - iOS Safari JAMÁS lo emite: su flujo manual ("Compartir → Añadir a
 *    pantalla de inicio") se detecta con `isIos` y el copy vive en
 *    MSG.instalarApp (compartido con IosInstallBanner).
 *  - `installed` arranca true si ya corre standalone y se enciende al
 *    recibir `appinstalled` (la instalación terminó con éxito).
 *
 * Cada consumidor registra sus propios listeners (sin estado de módulo):
 * así los tests quedan aislados y el evento —que es el mismo objeto para
 * todos los listeners— se comparte de forma natural. prompt() solo puede
 * llamarse UNA vez por evento; promptInstall suelta la referencia de este
 * consumidor de inmediato y los demás se limpian con `appinstalled`.
 */

/** ¿La app ya corre instalada (modo standalone)? */
export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  try {
    // `navigator.standalone` es propietario de iOS Safari (no está en el DOM lib).
    const nav = /** @type {Navigator & { standalone?: boolean }} */ (window.navigator);
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      nav.standalone === true
    );
  } catch (_) {
    return false;
  }
}

/** ¿Es un equipo iOS (Safari y familia, sin beforeinstallprompt)? */
export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  // `window.MSStream` descarta el falso positivo de IE11 en Windows Phone.
  const win = /** @type {Window & { MSStream?: unknown }} */ (window);
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !win.MSStream;
}

export default function usePwaInstall() {
  // El evento beforeinstallprompt diferido. null = no hay prompt nativo.
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandaloneDisplay());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  /**
   * Dispara el prompt nativo de instalación (Android/Chromium).
   * Devuelve 'accepted' | 'dismissed' | 'unavailable'.
   */
  const promptInstall = useCallback(async () => {
    const promptEvent = deferredPrompt;
    if (!promptEvent) return 'unavailable';
    // prompt() solo se puede llamar UNA vez por evento → soltamos la ref ya.
    setDeferredPrompt(null);
    try {
      promptEvent.prompt();
      // 'accepted' → el navegador instala y luego dispara appinstalled.
      const choice = await promptEvent.userChoice;
      return choice?.outcome || 'dismissed';
    } catch (_) {
      // prompt ya consumido (otro consumidor) o bloqueado — silencioso.
      return 'dismissed';
    }
  }, [deferredPrompt]);

  return {
    canInstall: !!deferredPrompt,
    installed,
    isIos: isIosDevice(),
    promptInstall,
  };
}
