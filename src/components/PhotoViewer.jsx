import React, { useState, useRef, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import useCinemaMode from '../hooks/useCinemaMode';

export default function PhotoViewer({
  src,
  alt = '',
  className = '',
  children,
  calloutOverlay,
}) {
  const { isCinema, toggleCinema } = useCinemaMode();
  const [showCallouts, setShowCallouts] = useState(true);
  const lastTapRef = useRef(0);
  const containerRef = useRef(null);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double-tap: exit cinema
      toggleCinema();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    setShowCallouts((prev) => !prev);
  }, [toggleCinema]);

  if (isCinema) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
        onClick={handleTap}
        role="presentation"
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
          style={{ pointerEvents: 'none' }}
        />

        {/* Backdrop callout overlay (optional, shown/hidden on tap) */}
        {calloutOverlay && showCallouts && (
          <div className="absolute inset-0 pointer-events-none">
            {calloutOverlay}
          </div>
        )}

        {/* Close button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleCinema();
          }}
          className={`absolute top-4 right-4 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition-opacity ${
            showCallouts ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Salir de modo presentación"
        >
          <Minimize2 size={20} />
        </button>

        {/* Instruction hint */}
        <span
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/50 text-white/70 text-xs font-medium transition-opacity duration-700 ${
            showCallouts ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Toca para {showCallouts ? 'ocultar' : 'mostrar'} controles · Doble toca para salir
        </span>
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover rounded-lg"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleCinema();
        }}
        className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Modo presentación"
      >
        <Maximize2 size={16} />
      </button>
      {children}
    </div>
  );
}
