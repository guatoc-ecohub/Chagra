import { useState, useEffect, useCallback, useRef } from 'react';

function isFullscreenApiAvailable() {
  return typeof document !== 'undefined' &&
    typeof document.documentElement !== 'undefined' &&
    document.documentElement.requestFullscreen != null;
}

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
    isFullscreenApi: fullscreenApiRef.current,
  };
}

export default useCinemaMode;
