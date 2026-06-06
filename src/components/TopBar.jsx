import React, { useState, useEffect, useRef } from 'react';
import { CircleUser, HelpCircle, LogOut } from 'lucide-react';
import { version as APP_VERSION } from '../../package.json';
import OfflineChip from './OfflineChip';
import ChagraAgentAvatar from './ChagraAgentAvatar';
import NotificationsBell from './NotificationsBell';
import useOllamaWarmStore from '../store/useOllamaWarmStore';
import useAssetStore from '../store/useAssetStore';

/**
 * TopBar, header persistente con identidad del operador (DR-030 QW2).
 *
 * Reemplaza el header inline del DashboardView que mostraba info ambiental
 * (msnm/luna/sol) sin identidad del operador. La info ambiental NO se
 * elimina, pasa al `<EnvironmentalCard collapsed />` debajo del top-bar
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
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  // "Respira" animación del logo Chagra cuando hay actividad de fondo
  // (warm-up del agente IA o sync con FarmOS). Sensación de "agente vivo
  // está pensando" estilo iconos pulsantes Apple. Quick-win UX 2026-05-28.
  const warmupStatus = useOllamaWarmStore((s) => s.status);
  const syncProgress = useAssetStore((s) => s.syncProgress);
  const isBreathing = warmupStatus === 'warming' || (syncProgress && !syncProgress.isComplete && !syncProgress.isCancelled);

  // Cerrar menú del avatar cuando se hace click fuera
  useEffect(() => {
    if (!avatarMenuOpen) return undefined;
    function onClickOutside(e) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) {
        setAvatarMenuOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') setAvatarMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [avatarMenuOpen]);

  const avatarMenuRef = useRef(null);

  return (
    <>
      <header
        className="px-3 py-2 border-b border-slate-800 shrink-0 flex items-center gap-2 bg-slate-900/70 backdrop-blur-md sticky top-0 z-50"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
        role="banner"
      >
        {/* Avatar agente (colibrí o maíz según pref) reemplaza el logo casa.
            Click → dashboard. Operador 2026-05-28: "quita el icono de casa y
            pon el colibrí". El avatar comunica que Chagra ES un ser vivo
            (no un app con header genérico). */}
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          aria-label={isBreathing ? 'Chagra está procesando' : 'Volver al inicio'}
          title={isBreathing ? 'Chagra está pensando…' : 'Volver al inicio'}
          className="font-bold flex items-center gap-2 shrink-0 rounded-lg px-1 py-1 hover:bg-slate-800/60 active:bg-slate-700 transition-colors min-h-[44px]"
        >
          <span
            className={isBreathing ? 'chagra-topbar-breathe' : ''}
            style={{ display: 'inline-flex' }}
            aria-hidden="true"
          >
            <ChagraAgentAvatar size={32} state={isBreathing ? 'thinking' : 'idle'} />
          </span>
          <span className="hidden sm:inline text-base">Chagra</span>
          <span className="hidden md:inline text-[10px] text-slate-500 font-mono font-normal">v{APP_VERSION}</span>
        </button>
        <style>{`
          @keyframes chagra-topbar-breathe {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(16,185,129,0)); }
            50% { transform: scale(1.06); filter: drop-shadow(0 0 6px rgba(16,185,129,.55)); }
          }
          .chagra-topbar-breathe { animation: chagra-topbar-breathe 2.4s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .chagra-topbar-breathe { animation: none; }
          }
        `}</style>

        <OfflineChip />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Acciones globales */}
        {/* Manual de uso — primer lugar tras el spacer para máxima
            visibilidad (feedback usuaria piloto 2026-05-19: "debería ser un icono
            principal mejor ubicado"). Fondo amber distintivo para romper
            con la tira de iconos secundarios y comunicar "ayuda" antes de
            la lectura. Tamaño 24px (vs 20-22px del resto) refuerza la
            jerarquía. */}
        <button
          type="button"
          onClick={() => onNavigate('help')}
          aria-label="Manual de uso: cómo usar Chagra"
          title="Manual de uso"
          className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 active:bg-amber-500/40 border border-amber-500/40 text-amber-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <HelpCircle size={24} aria-hidden="true" strokeWidth={2.5} />
        </button>
        {/* UX-27 (#286) 2026-05-27: botón unificado "Agregar planta por
            voz". Reemplaza los dos botones previos (Mic solo + Plus solo)
            que eran:
              - Mic → onNavigate('voz')         → captura genérica por voz
              - Plus → onNavigate('plant_asset') → form planta manual
            Ambos llevaban al MISMO flow de fondo (registro de planta),
            solo cambiaba la modalidad. Feedback operador 2026-05-27:
            "borra el + en su lugar mejora el del micrófono con un icono
            de + y una planta o algo lindo que le permita inferir que es
            para agregar una planta con voz".

            Diseño:
              - Mic (lime) como icono principal — comunica "voz".
              - Sprout decorativo abajo-derecha — comunica "planta".
              - Halo lime sutil + bg degrado de lime-900/40 → emerald-900/40
                para que destaque del resto de iconos slate.
              - Tamaño botón mantenido en 44x44 (touch target iOS).
              - aria-label explícito "Agregar planta por voz".
              - Navega a 'voz' (el flow de voz YA permite registrar
                plantas; ver VoiceCapture + VoiceConfirmation). */}
        {/* NotificationsBell — vivo. Pulsa rojo si crítico, ámbar si warning,
            slate si info/empty. Reemplaza el mic+sprout del TopBar
            (operador 2026-05-28: el agregar-planta-por-voz lo hace ahora
            el agente Chagra directamente). */}
        <NotificationsBell onNavigate={onNavigate} />
        {/* Botón Settings (icono ⚙) eliminado, Feedback piloto #115: era duplicado del
            botón operator name de arriba (ambos onNavigate('perfil')). El
            operator name button es más explícito + el NAV_TILE Perfil del
            dashboard sigue accesible. */}

        {/* Avatar/menú de usuario (operador 2026-06-06): reemplaza el botón
            de salir. Muestra ícono de usuario por defecto; al tocarlo → menú
            flotante con "Ajustes" (→ perfil) y "Salir" (logout). */}
        <div className="relative shrink-0" ref={avatarMenuRef}>
          <button
            type="button"
            onClick={() => setAvatarMenuOpen((v) => !v)}
            aria-label="Menú de usuario"
            aria-expanded={avatarMenuOpen}
            className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-slate-800 border-2 border-slate-700 hover:border-teal-500/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <CircleUser size={20} aria-hidden="true" />
          </button>

          {avatarMenuOpen && (
            <div
              role="menu"
              aria-label="Opciones de usuario"
              className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAvatarMenuOpen(false);
                  onNavigate('perfil');
                }}
                className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors flex items-center gap-3"
              >
                <CircleUser size={16} aria-hidden="true" className="shrink-0 text-teal-400" />
                Ajustes
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAvatarMenuOpen(false);
                  onLogout();
                }}
                className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors flex items-center gap-3 border-t border-slate-700/50"
              >
                <LogOut size={16} aria-hidden="true" className="shrink-0 text-rose-400" />
                Salir
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Letrero "🌙 Ambiente · altitud · efemérides" + EnvironmentalCard
          colapsable REMOVIDO 2026-06-06 (operador: "no le veo utilidad" en el
          home del agente). La altitud sigue visible en el chip de ubicación
          bajo el nombre del operador (arriba) y en la escena del AgentHero. */}
    </>
  );
}
