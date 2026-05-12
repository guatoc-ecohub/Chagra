import React from 'react';
import { Sparkles } from 'lucide-react';
import useIdleVisibility from '../hooks/useIdleVisibility';

export default function AgentFab({ onNavigate }) {
  const isVisible = useIdleVisibility(2000);

  if (!isVisible) return null;

  return (
    <button
      type="button"
      aria-label="Asistente IA"
      title="Hablar con el asistente IA"
      onClick={() => onNavigate('agente')}
      style={{
        position: 'fixed',
        bottom: 'max(18px, env(safe-area-inset-bottom))',
        right: 18,
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: '2px solid #a78bfa',
        background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
        color: 'white',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 0 14px #a78bfa55',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
      }}
    >
      <Sparkles size={24} />
    </button>
  );
}