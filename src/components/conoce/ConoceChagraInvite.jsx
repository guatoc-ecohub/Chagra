/**
 * ConoceChagraInvite — la auto-oferta de PRIMERA VEZ del recorrido.
 *
 * Tarjeta pequeña y descartable (NO un modal que tape el home) que aparece
 * UNA sola vez en el dashboard si el usuario nunca ha visto ni omitido el
 * recorrido "Conoce Chagra" (huella CONOCE_VISTO_KEY en localStorage).
 *
 * Diseño deliberado para convivir con el onboarding de perfil (#2078, en
 * integración) sin tocarlo: esto solo se monta en el dashboard (App.jsx la
 * gatea a currentView === 'dashboard'), con un retraso de cortesía para no
 * competir con la carga del home, y cualquier interacción la silencia para
 * siempre. Cero estado compartido con ese flujo.
 *
 * Props:
 *   - onStart(): abrir el recorrido (navigate('conoce')).
 */
import React, { useEffect, useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import ManoChagraGlyph from '../dashboard/ManoChagraGlyph.jsx';
import { conoceYaVisto, marcarConoceVisto } from './conoceVisto.js';

/** Retraso de cortesía antes de ofrecer (el home respira primero). */
const INVITE_DELAY_MS = 1600;

export default function ConoceChagraInvite({ onStart }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (conoceYaVisto()) return undefined;
    const t = setTimeout(() => setVisible(true), INVITE_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const abrir = () => {
    setVisible(false);
    // El tour marca su propia huella al montar; esto cubre el caso de que
    // la navegación falle a mitad de camino (no volver a insistir).
    marcarConoceVisto('abierto');
    if (typeof onStart === 'function') onStart();
  };

  const omitir = () => {
    setVisible(false);
    marcarConoceVisto('omitido');
  };

  return (
    <div
      role="complementary"
      aria-label="Invitación al recorrido Conoce Chagra"
      data-testid="conoce-invite"
      className="fixed left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-md rounded-2xl border shadow-2xl p-4 flex items-center gap-3"
      style={{
        bottom: 'calc(96px + env(safe-area-inset-bottom))',
        backgroundColor: 'rgb(var(--c-surface-card))',
        borderColor: 'rgba(var(--t-accent-rgb), 0.5)',
      }}
    >
      <span
        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 border"
        style={{
          color: 'rgb(var(--t-accent-rgb))',
          borderColor: 'rgba(var(--t-accent-rgb), 0.5)',
          backgroundColor: 'rgba(var(--t-accent-rgb), 0.1)',
        }}
        aria-hidden="true"
      >
        <ManoChagraGlyph size={24} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-tight" style={{ color: 'rgb(var(--c-slate-100))' }}>
          ¿Primera vez por aquí?
        </p>
        <p className="text-xs mt-0.5 leading-snug" style={{ color: 'rgb(var(--c-slate-300))' }}>
          Conozca Chagra en un recorrido de un minuto.
        </p>
      </div>
      <button
        type="button"
        onClick={abrir}
        data-testid="conoce-invite-ver"
        className="agent-send-accent shrink-0 min-h-[40px] px-3 rounded-xl text-sm font-extrabold flex items-center gap-1 active:scale-[0.97] motion-reduce:active:scale-100"
      >
        Verlo <ArrowRight size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={omitir}
        aria-label="Ahora no"
        data-testid="conoce-invite-cerrar"
        className="shrink-0 p-1.5 rounded-lg"
        style={{ color: 'rgb(var(--c-slate-400))' }}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
