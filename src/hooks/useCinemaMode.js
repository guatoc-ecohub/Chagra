import { useState, useEffect, useCallback, useRef } from 'react';

function isFullscreenApiAvailable() {
  return typeof document !== 'undefined' &&
    typeof document.documentElement !== 'undefined' &&
    document.documentElement.requestFullscreen != null;
}

/**
 * Hook que gestiona el modo cine usando la API Fullscreen del navegador.
 * Sincroniza el estado con eventos nativos de fullscreen (F11, toolbar) y
 * permite salir con la tecla Escape. Funciona incluso si la API no está disponible.
 *
 * @returns {{isCinema: boolean, toggleCinema: Function, isFullscreenApi: boolean}} Estado y control del modo cine.
 */
export function useCinemaMode() {
  const [isCinema, setIsCinema] = useState(false);
  const fullscreenApiRef = useRef(isFullscreenApiAvailable());
  const cinemaRef = useRef(false);

  const toggleCinema = useCallback(() => {
    const next = !cinemaRef.current;
    cinemaRef.current = next;

    if (fullscreenApiRef.current) {
      if (next) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }

    setIsCinema(next);
  }, []);

  // Sync with fullscreen API changes (browser toolbar, F11, etc.)
  useEffect(() => {
    if (!fullscreenApiRef.current) return;

    const handleChange = () => {
      const active = !!document.fullscreenElement;
      cinemaRef.current = active;
      setIsCinema(active);
    };

    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  // Exit cinema mode on Escape (handles both fullscreen and fallback)
  useEffect(() => {
    if (!isCinema) return;

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (fullscreenApiRef.current && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }

        cinemaRef.current = false;
        setIsCinema(false);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isCinema]);

  return {
    isCinema,
    toggleCinema,
    isFullscreenApi: /* eslint-disable-line react-hooks/refs */ fullscreenApiRef.current,
  };
}

export default useCinemaMode;
