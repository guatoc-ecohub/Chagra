import React from 'react';
import { Mic } from 'lucide-react';
import useIdleVisibility from '../hooks/useIdleVisibility';

/**
 * MicFab, Floating Action Button global para captura por voz (DR-030 QW4).
 *
 * FAB extendido (pill con ícono + label) anclado abajo-IZQUIERDA. La derecha
 * está ocupada por FieldFeedback (💬). El label visible permanente "Voz"
 * mitiga el problema clásico del FAB iOS: discoverability cero sin
 * affordance textual (Apple HIG no formaliza el FAB; la mitigación
 * convergida en el DR triple es etiquetarlo siempre).
 *
 * Visible en todas las rutas excepto loading/login (mismo patrón que
 * FieldFeedback). Toca → navigate('voz') abre VoiceCapture screen.
 *
 * Auto-hide tras 2s sin interacción (feedback usuario externo 2026-05-06,
 * bug #2 baseline): los FAB tapaban el widget "Cola de tareas" en home.
 * Reaparecen con cualquier mousemove/touch/scroll/keydown.
 *
 * Refs: deepresearch/chagra-ux/decisions/ux-clarity-2026-05.md (D1)
 */
export default function MicFab({ onNavigate }) {
  const COLOR_PRIMARY = '#84cc16';   // lime-500 (matches NAV_TILE 'voz' accent)
  const COLOR_ACCENT = '#bef264';    // lime-300
  const isVisible = useIdleVisibility(2000);

  return (
    <button
      type="button"
      aria-label="Capturar por voz"
      title="Registrar por voz"
      onClick={() => onNavigate('voz')}
      style={{
        position: 'fixed',
        bottom: 'max(18px, env(safe-area-inset-bottom))',
        left: 18,
        minHeight: 56,
        paddingLeft: 20,
        paddingRight: 24,
        paddingTop: 8,
        paddingBottom: 8,
        borderRadius: 28,
        border: `2px solid ${COLOR_ACCENT}`,
        background: `linear-gradient(135deg, ${COLOR_PRIMARY} 0%, #4d7c0f 100%)`,
        color: '#0f172a',
        fontSize: 16,
        fontWeight: 800,
        cursor: 'pointer',
        boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 14px ${COLOR_ACCENT}55`,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'opacity 250ms ease',
      }}
    >
      <Mic size={22} strokeWidth={2.5} aria-hidden="true" />
      <span>Voz</span>
    </button>
  );
}
