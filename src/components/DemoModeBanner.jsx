import React, { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DEMO_PROFILES, applyDemoProfile, clearDemoProfile, isDemoActive } from '../services/demoProfile';

export default function DemoModeBanner() {
  const [_active, setActive] = useState(isDemoActive);
  const [currentIndex, setCurrentIndex] = useState(0);
  const hidden = !(
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEMO_MODE === 'true') ||
    (typeof window !== 'undefined' && window.localStorage.getItem('chagra:demo:switch-active') === '1')
  );

  useEffect(() => {
    const handler = () => {
      setActive(isDemoActive());
      const stored = (() => {
        try {
          const raw = window.localStorage.getItem('chagra:profile:v1');
          return raw ? JSON.parse(raw) : null;
        } catch (_) {
          return null;
        }
      })();
      if (stored) {
        const idx = DEMO_PROFILES.findIndex(
          (p) => JSON.stringify(p.profile) === JSON.stringify(stored)
        );
        if (idx >= 0) setCurrentIndex(idx);
      }
    };
    window.addEventListener('chagra:profile:demo-switched', handler);
    return () => window.removeEventListener('chagra:profile:demo-switched', handler);
  }, []);

  const goPrev = useCallback(() => {
    const next = currentIndex === 0 ? DEMO_PROFILES.length - 1 : currentIndex - 1;
    setCurrentIndex(next);
    applyDemoProfile(DEMO_PROFILES[next].id);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    const next = (currentIndex + 1) % DEMO_PROFILES.length;
    setCurrentIndex(next);
    applyDemoProfile(DEMO_PROFILES[next].id);
  }, [currentIndex]);

  const handleExit = useCallback(() => {
    clearDemoProfile();
    setActive(false);
  }, []);

  if (hidden) return null;

  const current = DEMO_PROFILES[currentIndex];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 border-t border-slate-700/60 px-4 py-3 flex items-center justify-between gap-3 text-white shadow-[0_-4px_24px_rgba(0,0,0,0.5)]"
      role="region"
      aria-label="Selector de perfil demo"
      style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wide shrink-0">
          Demo
        </span>
        <span className="text-lg shrink-0" aria-hidden="true">{current.emoji}</span>
        <span className="text-sm font-semibold truncate">{current.label}</span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={goPrev}
          className="p-1.5 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
          aria-label="Perfil demo anterior"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>

        <span className="text-xs text-slate-400 w-16 text-center tabular-nums">
          {currentIndex + 1} / {DEMO_PROFILES.length}
        </span>

        <button
          type="button"
          onClick={goNext}
          className="p-1.5 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
          aria-label="Perfil demo siguiente"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleExit}
          className="ml-2 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 active:bg-red-700 text-xs font-bold uppercase tracking-wide transition-colors border border-red-500/50 flex items-center gap-1"
          aria-label="Salir del modo demo"
        >
          <X size={14} aria-hidden="true" />
          Salir del demo
        </button>
      </div>
    </div>
  );
}
