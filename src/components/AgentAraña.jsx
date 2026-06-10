import React, { useMemo } from 'react';
import NatureAraña from './NatureAraña';
import BiopunkAraña from './BiopunkAraña';
import { useTheme } from '../hooks/useTheme';
import { CAPABILITY_MANIFEST } from '../services/agentCapabilities';

/**
 * AgentAraña — Visualización principal de las capacidades del agente.
 *
 * Adapta el tipo de visualización según el tema activo:
 *   - nature: árbol orgánico
 *   - biopunk: red micorrizal
 *   - minimalista: lista minimal (sin araña visual)
 *
 * Cada capacidad se muestra con su estado de conectividad real:
 *   ✅ Conectada y probada
 *   ⏳ Pendiente de conectar
 *   🔒 Pro (requiere tier)
 *
 * Integración: se usa en el AgentHero o en un panel inferior al compositor.
 */
export default function AgentAraña({ activeCapability, onSelect, showMinimal = false }) {
  const { theme } = useTheme();
  const resolved = theme === 'auto' ? 'nature' : theme; // default para render

  const capabilities = useMemo(() => {
    // Mapeo del manifiesto a datos visualizables
    return CAPABILITY_MANIFEST.map((cap) => {
      // Determinar estado real de conectividad
      const isConnected = cap.tool !== null && cap.stubMessage === null;
      const isPending = cap.stubMessage !== null;
      const isPro = cap.id === 'deep'; // Deep Research es Pro

      return {
        id: cap.id,
        intent: cap.intent,
        label: cap.label,
        icon: cap.icon,
        desc: cap.desc,
        connected: isConnected,
        pending: isPending,
        isPro,
        hero: cap.hero,
      };
    });
  }, []);

  // En minimalista mostrar lista simple
  if (showMinimal || resolved === 'minimalista') {
    return (
      <div className="w-full px-4 py-3" data-testid="agent-araña-minimal">
        <div className="flex flex-wrap gap-2 justify-center">
          {capabilities.map((cap) => {
            const isActive = activeCapability === cap.id;
            const isPending = cap.pending;
            return (
              <button
                key={cap.id}
                onClick={() => !isPending && onSelect?.(cap.id)}
                disabled={isPending}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : isPending
                      ? 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={isPending ? `${cap.desc} — Próximamente` : cap.desc}
              >
                <span>{cap.icon}</span>
                <span>{cap.label}</span>
                {isPending && <span className="text-[8px] opacity-50">(Próx.)</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Nature o biopunk: araña visual
  return (
    <div className="w-full" data-testid="agent-araña-visual">
      {resolved === 'nature' ? (
        <NatureAraña
          capabilities={capabilities}
          activeCapability={activeCapability}
          onSelect={onSelect}
        />
      ) : (
        <BiopunkAraña
          capabilities={capabilities}
          activeCapability={activeCapability}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}
