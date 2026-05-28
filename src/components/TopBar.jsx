import React, { useState, useEffect } from 'react';
import { CircleUser, ChevronDown, ChevronUp, HelpCircle, LogOut, MapPin } from 'lucide-react';
import { version as APP_VERSION } from '../../package.json';
import EnvironmentalCard from './EnvironmentalCard';
import AltitudeBadge from './AltitudeBadge';
import OfflineChip from './OfflineChip';
import ChagraAgentAvatar from './ChagraAgentAvatar';
import NotificationsBell from './NotificationsBell';
import useFincaActiveStore from '../services/fincaActiveStore';
import { FARM_CONFIG } from '../config/defaults';

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
  const [envOpen, setEnvOpen] = useState(false);
  const [operatorName, setOperatorName] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('chagra:operator:name') || 'Mi finca'
      : 'Mi finca'
  );
  const activeFincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);
  const fincas = useFincaActiveStore((s) => s.fincas);
  const activeFinca = fincas.find((f) => f.slug === activeFincaSlug);
  const municipio = activeFinca?.municipio || FARM_CONFIG?.MUNICIPIO || null;
  const vereda = activeFinca?.vereda || null;
  const altitud = activeFinca?.altitud || FARM_CONFIG?.ALTITUD_MSNM || null;

  // Re-leer si cambia desde otro tab (storage event nativo) O desde el mismo
  // tab via ProfileScreen (chagra:operator-update CustomEvent).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'chagra:operator:name') {
        setOperatorName(e.newValue || 'Operador');
      }
    };
    const onOperatorUpdate = (e) => {
      if (e.detail?.key === 'chagra:operator:name') {
        setOperatorName(e.detail.value || 'Operador');
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('chagra:operator-update', onOperatorUpdate);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('chagra:operator-update', onOperatorUpdate);
    };
  }, []);

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
          aria-label="Volver al inicio"
          title="Volver al inicio"
          className="font-bold flex items-center gap-2 shrink-0 rounded-lg px-1 py-1 hover:bg-slate-800/60 active:bg-slate-700 transition-colors min-h-[44px]"
        >
          <ChagraAgentAvatar size={32} state="idle" />
          <span className="hidden sm:inline text-base">Chagra</span>
          <span className="hidden md:inline text-[10px] text-slate-500 font-mono font-normal">v{APP_VERSION}</span>
        </button>

        {/* Operador + ubicación (tap → perfil). Nombre real grande + ubicación
            municipio · vereda · msnm en pill pequeño debajo. */}
        <button
          type="button"
          onClick={() => onNavigate('perfil')}
          aria-label={`Perfil del operador: ${operatorName}`}
          className="flex flex-col items-start gap-0.5 px-2 py-1 rounded-lg bg-slate-800/40 hover:bg-slate-700/50 active:bg-slate-700 text-slate-200 min-h-[44px] flex-1 min-w-0"
        >
          <div className="flex items-center gap-1.5 w-full">
            <CircleUser size={16} aria-hidden="true" className="shrink-0 text-teal-400" />
            <span className="text-sm font-bold truncate flex-1 text-left">{operatorName}</span>
          </div>
          {(municipio || altitud) && (
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium leading-none w-full">
              <MapPin size={10} className="shrink-0 text-slate-500" aria-hidden="true" />
              <span className="truncate">
                {municipio && <span>{municipio.split(',')[0]}</span>}
                {vereda && <span> · {vereda}</span>}
                {altitud && <span> · {altitud}m</span>}
              </span>
            </div>
          )}
        </button>

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

        {/* Salir: en mobile estrecho muestra sólo icono LogOut (ahorra ~50px
            de ancho). Desde sm muestra texto "Salir" tradicional. */}
        <button
          type="button"
          onClick={onLogout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="text-slate-400 hover:text-white px-2 sm:px-3 min-h-[44px] min-w-[44px] bg-slate-800 rounded text-sm shrink-0 flex items-center justify-center"
        >
          <LogOut size={18} aria-hidden="true" className="sm:hidden" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </header>

      {/* Toggle de info ambiental (msnm/luna/sol), colapsado por default */}
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
