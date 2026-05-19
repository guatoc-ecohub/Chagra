import React from 'react';
import ChagraAgentAvatar from './ChagraAgentAvatar';

/**
 * AgentFab — Floating Action Button para abrir el agente Chagra IA.
 *
 * 2026-05-19 operator: integrar ChagraAgentAvatar (colibri libando del
 * abutilon) en lugar del icono Sparkles generico. Estado idle = vuelo
 * estacionario + alas batiendo, da vida al CTA flotante sin distraer.
 *
 * El FAB sigue siendo circular 56x56, con el avatar inscrito (svg 200x200
 * escalado). Bordes y glow se mantienen para mantener affordance de boton.
 */
export default function AgentFab({ onNavigate }) {
  return (
    <button
      type="button"
      aria-label="Asistente Chagra IA"
      title="Hablar con Chagra IA"
      onClick={() => onNavigate('agente')}
      style={{
        position: 'fixed',
        bottom: 'max(90px, calc(env(safe-area-inset-bottom) + 90px))',
        right: 18,
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: '2px solid rgba(16,185,129,.55)',
        background: 'radial-gradient(circle at 30% 25%, #1e293b 0%, #0f172a 70%)',
        color: 'white',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 0 14px rgba(16,185,129,.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <ChagraAgentAvatar state="idle" size={48} ariaLabel="Chagra IA" />
    </button>
  );
}
