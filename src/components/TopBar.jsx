import React, { useState, useEffect } from 'react';
import { CircleUser, Mic, Plus, ChevronDown, ChevronUp, Home } from 'lucide-react';
import { version as APP_VERSION } from '../../package.json';
import EnvironmentalCard from './EnvironmentalCard';

/**
 * TopBar — header persistente con identidad del operador (DR-030 QW2).
 *
 * Reemplaza el header inline del DashboardView que mostraba info ambiental
 * (msnm/luna/sol) sin identidad del operador. La info ambiental NO se
 * elimina — pasa al `<EnvironmentalCard collapsed />` debajo del top-bar
 * (progressive disclosure: agrónomo experto puede expandir, novato no se
 * satura).
 *
 * Identidad operador:
 *   - Lectura primaria: localStorage 'chagra:operator:name' (placeholder
 *     hasta integrar authService real en PR follow-up)
 *   - Fallback: "Operador"
 *   - Tap → navigate('perfil') para editar (existing screen)
 *
 * Acciones globales (en el orden visual):
 *   - Logo + nombre app + version (izquierda)
 *   - Avatar/operador (centro-izq)
 *   - 🎤 Voz quick-access (centro-der)
 *   - ⊕ Capturar planta (der)
 *   - ⚙ Settings (extremo derecho)
 *
 * Refs:
 *   - Decisión: deepresearch/chagra-ux/decisions/ux-clarity-2026-05.md (D2)
 *   - Síntesis 3 LLMs: Claude+Gemini convergen "reemplazar info ambiental
 *     por identidad operador, ambiental → card colapsable"
 *
 * iOS-specific: usa `env(safe-area-inset-top)` para respetar Dynamic Island
 * / notch. El meta apple-mobile-web-app-status-bar-style debe estar en
 * index.html (TODO: agregar en PR follow-up junto con apple-touch-icon
 * para destrabar PWA install Safari iOS).
 */
export default function TopBar({ onNavigate, onLogout }) {
  const [envOpen, setEnvOpen] = useState(false);
  const [operatorName, setOperatorName] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('chagra:operator:name') || 'Operador'
      : 'Operador'
  );

  // Re-leer si cambia desde otro tab (sync entre instancias PWA).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'chagra:operator:name') {
        setOperatorName(e.newValue || 'Operador');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <>
      <header
        className="px-3 py-2 border-b border-slate-800 shrink-0 flex items-center gap-2 bg-slate-900/70 backdrop-blur-md sticky top-0 z-50"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
        role="banner"
      >
        {/* Logo clickable → Home (DR-030 + Lili #16: botón claro a inicio).
            Patrón estándar PWA: el logo siempre vuelve al dashboard. Lili
            reportó "navegación rocosa, falta botón claro a inicio" — el
            logo discreto sin affordance hacía que no se descubriera. Ahora
            es <button> con cursor + hover + icono Home explícito. */}
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          aria-label="Volver al inicio"
          title="Volver al inicio"
          className="font-bold text-lg flex items-baseline gap-1.5 shrink-0 rounded-lg px-2 py-1 -mx-2 hover:bg-slate-800/60 active:bg-slate-700 transition-colors min-h-[44px]"
        >
          <Home size={16} aria-hidden="true" className="text-muzo self-center" />
          <span>Chagra</span>
          <span className="text-[10px] text-slate-500 font-mono font-normal">v{APP_VERSION}</span>
        </button>

        {/* Operador (tap → perfil) */}
        <button
          type="button"
          onClick={() => onNavigate('perfil')}
          aria-label={`Perfil del operador: ${operatorName}`}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 active:bg-slate-700 text-slate-200 min-h-[44px] truncate"
        >
          <CircleUser size={20} aria-hidden="true" className="shrink-0 text-teal-400" />
          <span className="text-sm font-semibold truncate max-w-[8rem]">{operatorName}</span>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Acciones globales */}
        <button
          type="button"
          onClick={() => onNavigate('voz')}
          aria-label="Captura por voz"
          className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 active:bg-slate-700 text-lime-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Mic size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('plant_asset')}
          aria-label="Capturar planta"
          className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 active:bg-slate-700 text-purple-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Plus size={22} aria-hidden="true" strokeWidth={2.5} />
        </button>
        {/* Botón Settings (icono ⚙) eliminado — Lili #115: era duplicado del
            botón operator name de arriba (ambos onNavigate('perfil')). El
            operator name button es más explícito + el NAV_TILE Perfil del
            dashboard sigue accesible. */}

        {/* Salir (mantiene el comportamiento actual) */}
        <button
          type="button"
          onClick={onLogout}
          aria-label="Cerrar sesión"
          className="text-slate-400 hover:text-white px-3 min-h-[44px] bg-slate-800 rounded text-sm shrink-0"
        >
          Salir
        </button>
      </header>

      {/* Toggle de info ambiental (msnm/luna/sol) — colapsado por default */}
      <button
        type="button"
        onClick={() => setEnvOpen((v) => !v)}
        aria-expanded={envOpen}
        aria-controls="environmental-card"
        className="w-full px-3 py-1 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 bg-slate-900/40 border-b border-slate-800/50"
      >
        <span className="font-mono">🌙 Ambiente · altitud · efemérides</span>
        {envOpen ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
      </button>
      {envOpen && (
        <div id="environmental-card">
          <EnvironmentalCard />
        </div>
      )}
    </>
  );
}
