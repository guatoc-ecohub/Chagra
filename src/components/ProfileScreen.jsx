import React, { useState, useEffect } from 'react';
import { User, Palette, Briefcase, Save, Check, Mic, MapPin, Home, Volume2, Wrench, Sprout, ChevronRight } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import ThemeSelector from './common/ThemeSelector';
import AgentAvatarSelector from './Settings/AgentAvatarSelector';
import BackgroundSelector from './Settings/BackgroundSelector';
import BackupExportButton from './BackupExportButton';
import CuadernoPDFButton from './CuadernoPDFButton';
import VoiceSelector from './Settings/VoiceSelector';
import HytaPanel from './HytaPanel';
import { PRIMARY_WORKER_NAME } from '../config/workerConfig';
import useFincaActiveStore from '../services/fincaActiveStore';
import usePrefsStore from '../store/usePrefsStore';
import { stop as stopTTS } from '../services/ttsService';

const TTL_OPTIONS = [
  { id: '1d', label: '1 día' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'never', label: 'Nunca' },
];

/**
 * ProfileScreen, perfil del operador.
 *
 * Feedback piloto #120: "debería poderse registrar los datos del 'Trabajador -
 * Operador de Campo'". Antes era display-only con nombre hardcoded.
 * Ahora editable con persistencia localStorage:
 *   - chagra:operator:name (string, ya leído por TopBar)
 *   - chagra:operator:role (enum)
 *
 * TopBar muestra el rol además del nombre cuando está disponible.
 *
 * Reorganización en PESTAÑAS (2026-05-28): el operador reportó "está difícil
 * de navegar, muchas opciones" — todo vivía en una sola columna scrolleable
 * larga. Ahora se agrupa en 4 pestañas con una tab bar sticky arriba (sin
 * librería nueva: estado local `activeTab` + render condicional):
 *   - 👤 Perfil:     nombre, rol, CTAs onboarding + ubicación.
 *   - 🎨 Apariencia: tema, fondo, avatar del agente.
 *   - 🔊 Voz y finca: voz del agente + selector de voz + multifinca/GPS.
 *   - ⚙️ Avanzado:   modo técnico (HYTA), telemetría, copia de seguridad, PDF.
 * Ningún breaking change funcional: todas las opciones siguen accesibles.
 */

const ROLES = [
  { id: 'operador_campo', label: 'Operador de Campo' },
  { id: 'asistente', label: 'Asistente' },
  { id: 'auditor', label: 'Auditor / Inspector' },
  { id: 'administrador', label: 'Administrador' },
  { id: 'agronomo', label: 'Agrónomo / Asesor' },
  { id: 'otro', label: 'Otro' },
];

/**
 * Definición de las pestañas. El emoji acompaña al label corto para que se
 * reconozcan de un vistazo en la tab bar (especialmente en móvil donde el
 * espacio es escaso). El icono lucide se usa en el encabezado de la sección.
 */
const TABS = [
  { id: 'perfil', emoji: '👤', label: 'Perfil' },
  { id: 'apariencia', emoji: '🎨', label: 'Apariencia' },
  { id: 'voz', emoji: '🔊', label: 'Voz y finca' },
  { id: 'avanzado', emoji: '⚙️', label: 'Avanzado' },
];

export default function ProfileScreen({ onBack, onHome }) {
  const [activeTab, setActiveTab] = useState('perfil');

  const [name, setName] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('chagra:operator:name') || PRIMARY_WORKER_NAME
      : PRIMARY_WORKER_NAME
  );
  const [role, setRole] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('chagra:operator:role') || 'operador_campo'
      : 'operador_campo'
  );
  const [savedFlash, setSavedFlash] = useState(false);
  const [telemetryEnabled, setTelemetryEnabled] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('chagra:voice:telemetry:enabled') !== '0'
      : true
  );
  const [telemetryTtl, setTelemetryTtl] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('chagra:voice:telemetry:ttl') || '7d'
      : '7d'
  );

  // Free 7→10 fix-pack: HYTA (info GPU/Ollama) detrás de un toggle "Modo
  // técnico". Default OFF para que el campesino-target no vea jerga técnica
  // que le haga sentir que la app no es para él (hipótesis #4 del análisis
  // project-free-7-10-analysis-2026-05-28). Persiste en localStorage.
  const [modoTecnico, setModoTecnico] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('chagra:profile:modo-tecnico:v1') === '1'
      : false
  );

  useEffect(() => {
    localStorage.setItem('chagra:profile:modo-tecnico:v1', modoTecnico ? '1' : '0');
  }, [modoTecnico]);

  useEffect(() => {
    localStorage.setItem('chagra:voice:telemetry:enabled', telemetryEnabled ? '1' : '0');
  }, [telemetryEnabled]);

  useEffect(() => {
    localStorage.setItem('chagra:voice:telemetry:ttl', telemetryTtl);
  }, [telemetryTtl]);

  // Persistir cambios al storage en cada modificación + emitir custom event
  // (CodeQL flag #36/#37 contra StorageEvent ctor, migrado a CustomEvent
  // que es el patrón canónico para same-tab pub/sub. TopBar escucha ambos
  // 'storage' (cross-tab nativo) y 'chagra:operator-update' (same-tab).
  useEffect(() => {
    localStorage.setItem('chagra:operator:name', name);
    window.dispatchEvent(new CustomEvent('chagra:operator-update', {
      detail: { key: 'chagra:operator:name', value: name },
    }));
  }, [name]);

  useEffect(() => {
    localStorage.setItem('chagra:operator:role', role);
    window.dispatchEvent(new CustomEvent('chagra:operator-update', {
      detail: { key: 'chagra:operator:role', value: role },
    }));
  }, [role]);

  const handleSave = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const currentRoleLabel = ROLES.find(r => r.id === role)?.label || 'Operador de Campo';

  return (
    <ScreenShell title="Perfil de Usuario" icon={User} onBack={onBack} onHome={onHome}>
      {/* Tab bar sticky arriba. Scroll horizontal en móvil si no caben los 4
          (overflow-x-auto + whitespace-nowrap). La pestaña activa lleva ring +
          texto emerald como indicador visual. role=tablist para a11y. */}
      <div
        role="tablist"
        aria-label="Secciones del perfil"
        className="sticky top-0 z-20 flex gap-2 overflow-x-auto bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-3 py-2 -mx-0"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`profile-panel-${tab.id}`}
              id={`profile-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all min-h-[44px] flex items-center gap-1.5 ${
                isActive
                  ? 'bg-emerald-900/30 text-emerald-300 ring-2 ring-emerald-500/50'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span aria-hidden="true">{tab.emoji}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-6 px-4 pt-4 pb-8">
        {/* ── PESTAÑA: PERFIL ───────────────────────────────────────── */}
        {activeTab === 'perfil' && (
          <div
            role="tabpanel"
            id="profile-panel-perfil"
            aria-labelledby="profile-tab-perfil"
            className="flex flex-col gap-6"
          >
            {/* ID Card / User Info, header con datos sintetizados */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 border-2 border-emerald-500/30">
                <User size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-white">{name}</h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">{currentRoleLabel}</p>
            </div>

            {/* #200/#201: CTAs para personalizar el agente y configurar ubicación.
                Navegan vía 'chagra:nav' (patrón CSP-safe, sin onClick inline-string).
                ProfileScreen no recibe onNavigate, así que despacha el evento global
                que App.jsx escucha. */}
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  try {
                    window.dispatchEvent(new CustomEvent('chagra:nav', { detail: { view: 'onboarding-perfil', data: { back: 'perfil' } } }));
                  } catch (_) { /* noop */ }
                }}
                className="text-left rounded-2xl bg-emerald-900/20 border border-emerald-800/40 p-4 hover:bg-emerald-900/30 transition-colors flex items-center gap-3"
              >
                <div className="p-2 rounded-xl bg-emerald-900/40 border border-emerald-700/40">
                  <Sprout size={20} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Personalizar mi agente</p>
                  <p className="text-xs text-slate-400">Cuéntale de tu cultivo para respuestas a tu medida</p>
                </div>
                <ChevronRight size={18} className="text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => {
                  try {
                    window.dispatchEvent(new CustomEvent('chagra:nav', { detail: { view: 'ubicacion-detectada', data: { back: 'perfil' } } }));
                  } catch (_) { /* noop */ }
                }}
                className="text-left rounded-2xl bg-sky-900/20 border border-sky-800/40 p-4 hover:bg-sky-900/30 transition-colors flex items-center gap-3"
              >
                <div className="p-2 rounded-xl bg-sky-900/40 border border-sky-700/40">
                  <MapPin size={20} className="text-sky-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Configurar ubicación</p>
                  <p className="text-xs text-slate-400">Mapa, piso térmico y cultivos de tu zona</p>
                </div>
                <ChevronRight size={18} className="text-slate-500" />
              </button>
            </div>

            {/* Edit Form */}
            <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 px-1">
                <Briefcase size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Datos del trabajador</h3>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Nombre completo</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Javier Andrés Rojas"
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none text-white text-base min-h-[48px]"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Rol</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none text-white text-base min-h-[48px] appearance-none"
                >
                  {ROLES.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={handleSave}
                className={`w-full p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all min-h-[48px] ${
                  savedFlash ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
                }`}
              >
                {savedFlash ? <><Check size={18} /> Guardado</> : <><Save size={18} /> Guardar cambios</>}
              </button>
              <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                Los cambios se guardan en tu dispositivo. Subida al servidor pendiente (planeado v1.x).
              </p>
            </div>
          </div>
        )}

        {/* ── PESTAÑA: APARIENCIA ───────────────────────────────────── */}
        {activeTab === 'apariencia' && (
          <div
            role="tabpanel"
            id="profile-panel-apariencia"
            aria-labelledby="profile-tab-apariencia"
            className="space-y-4"
          >
            <div className="flex items-center gap-2 px-1">
              <Palette size={18} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Personalización</h3>
            </div>
            <ThemeSelector />
            <BackgroundSelector />
            <AgentAvatarSelector />
          </div>
        )}

        {/* ── PESTAÑA: VOZ Y FINCA ──────────────────────────────────── */}
        {activeTab === 'voz' && (
          <div
            role="tabpanel"
            id="profile-panel-voz"
            aria-labelledby="profile-tab-voz"
            className="flex flex-col gap-6"
          >
            {/* Task #122 (2026-05-23): toggle global TTS del agente Chagra.
                Persiste en usePrefsStore (localStorage `chagra:prefs:tts-enabled`).
                Default ON. Operador puede silenciar también con doble-click en
                el avatar colibrí (header AgentScreen o FAB global). */}
            <AgentVoiceSection />

            {/* Task #124 (2026-05-24): selector de voz Kokoro + velocidad. Solo
                tiene sentido si TTS está activo, pero lo renderizamos siempre
                (no oculto) para que el operador pueda elegir voz antes de
                activar TTS — UX más predictible que esconder/mostrar. */}
            <VoiceSelector />

            {/* Multifinca + GPS Section (062.7 indoor override + 062.8 privacy) */}
            <MultifincaGpsSection />
          </div>
        )}

        {/* ── PESTAÑA: AVANZADO ─────────────────────────────────────── */}
        {activeTab === 'avanzado' && (
          <div
            role="tabpanel"
            id="profile-panel-avanzado"
            aria-labelledby="profile-tab-avanzado"
            className="flex flex-col gap-6"
          >
            {/* Modo técnico toggle — Free 7→10 fix-pack (hipótesis #4).
                HYTA (GPU/Ollama) es jerga ingenieril que asusta al campesino
                target. Lo ocultamos detrás de un switch off-by-default para
                usuarios curiosos sin imponerlo a la mayoría. */}
            <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 px-1">
                <Wrench size={18} className="text-slate-400" />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Modo técnico</h3>
              </div>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 cursor-pointer min-h-[48px]">
                <div className="flex flex-col gap-0.5 flex-1">
                  <span className="text-sm font-bold text-slate-200">Mostrar información GPU</span>
                  <span className="text-[10px] text-slate-500 leading-snug">
                    Para curiosos: muestra qué modelos de IA están cargados en GPU
                    y cuánta memoria usan. No es necesario para usar Chagra.
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={modoTecnico}
                  aria-label="Activar o desactivar modo técnico"
                  onClick={() => setModoTecnico((v) => !v)}
                  className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                    modoTecnico ? 'bg-slate-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      modoTecnico ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>

              {modoTecnico && (
                <div className="mt-2">
                  <HytaPanel />
                </div>
              )}
            </div>

            {/* Telemetry Section */}
            <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 px-1">
                <Mic size={18} className="text-morpho" />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Telemetría de Voz</h3>
              </div>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 cursor-pointer min-h-[48px]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-slate-200">Habilitar telemetría</span>
                  <span className="text-[10px] text-slate-500">Registrar eventos del pipeline de voz</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={telemetryEnabled}
                  onClick={() => setTelemetryEnabled((v) => !v)}
                  className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                    telemetryEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      telemetryEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Período de retención</span>
                <select
                  value={telemetryTtl}
                  onChange={(e) => setTelemetryTtl(e.target.value)}
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none text-white text-base min-h-[48px] appearance-none"
                >
                  {TTL_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </label>

              <p className="text-[10px] text-slate-500 px-1 leading-relaxed">
                La telemetría sigue grabándose en el dispositivo (privacy-safe, NUNCA prompt ni respuesta).
                El dashboard de visualización se migró al panel privado del operador (ADR-020 anti-leak / ADR-029 Capa C).
              </p>
            </div>

            {/* Copia de seguridad (2026-05-19): operador perdió plantas + 100
                species + túnel por un "Clear cache" en Chrome Android. Botón
                visible y prominente para que descargue snapshot JSON cuando
                quiera. */}
            <BackupExportButton />

            {/* Cuaderno de campo PDF (FEAT-D #295, 2026-05-28): diferenciador
                agronómico para SNIA / EPSEA / certificación orgánica. PDF
                imprimible con inventario + bitácora + cosechas + insumos. */}
            <CuadernoPDFButton />
          </div>
        )}

        {/* App Info Footer — común a todas las pestañas */}
        <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
          <p className="text-[10px] text-slate-600 font-mono tracking-tighter uppercase">
            Chagra • v1.0.0
          </p>
          <p className="text-[9px] text-slate-700 mt-1 max-w-[200px] mx-auto leading-tight">
            Diseñado para la soberanía alimentaria y la regeneración ecosistémica.
          </p>
        </div>
      </div>
    </ScreenShell>
  );
}

/**
 * AgentVoiceSection — Task #122 (2026-05-23).
 *
 * Toggle "Voz del agente activa" persistido en usePrefsStore (key
 * `chagra:prefs:tts-enabled`). Cuando se desactiva, se llama stop()
 * inmediato del ttsService para silenciar cualquier playback en curso.
 *
 * Equivalente al doble-click del avatar colibrí, pero accesible desde
 * Perfil para operadores que prefieran control explícito UI.
 */
function AgentVoiceSection() {
  const ttsEnabled = usePrefsStore((s) => s.ttsEnabled);
  const setTtsEnabled = usePrefsStore((s) => s.setTtsEnabled);

  const handleToggle = () => {
    const next = !ttsEnabled;
    if (!next) {
      // Si desactivamos, cortamos cualquier audio actual de inmediato
      stopTTS();
    }
    setTtsEnabled(next);
  };

  return (
    <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 px-1">
        <Volume2 size={18} className="text-violet-400" />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Voz del agente</h3>
      </div>

      <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 cursor-pointer min-h-[48px]">
        <div className="flex flex-col gap-0.5 flex-1">
          <span className="text-sm font-bold text-slate-200">Voz del agente activa</span>
          <span className="text-[10px] text-slate-500 leading-snug">
            Cuando está activa, Chagra IA lee en voz alta sus respuestas (Kokoro TTS,
            con respaldo al sintetizador del navegador). Doble click en el avatar
            colibrí silencia o reactiva sin abrir esta pantalla.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={ttsEnabled}
          aria-label="Activar o silenciar la voz del agente"
          onClick={handleToggle}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
            ttsEnabled ? 'bg-violet-600' : 'bg-slate-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
              ttsEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </label>
    </div>
  );
}

/**
 * MultifincaGpsSection — 062.7 (indoor override) + 062.8 (privacy opt-in).
 *
 * Settings que viven en fincaActiveStore (persiste en localStorage vía
 * zustand middleware, key 'chagra:active-finca'):
 *   - gpsOverride: si está en true, banner GPS no consulta Geolocation.
 *   - indoorZone: última zona indoor recordada cuando GPS pierde fix.
 *   - gpsHistoryEnabled: opt-in para sync GPS history al server (default off).
 */
function MultifincaGpsSection() {
  const {
    gpsOverride,
    clearGpsOverride,
    indoorZone,
    setIndoorZone,
    gpsHistoryEnabled,
    setGpsHistoryEnabled,
    activeFincaSlug,
  } = useFincaActiveStore();

  const [indoorInput, setIndoorInput] = useState(indoorZone || '');

  const handleSaveIndoor = () => {
    const trimmed = indoorInput.trim();
    setIndoorZone(trimmed.length > 0 ? trimmed : null);
  };

  return (
    <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 px-1">
        <MapPin size={18} className="text-emerald-400" />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Multifinca y GPS
        </h3>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Finca activa: <strong className="text-slate-300">{activeFincaSlug}</strong>.
        {' '}Cámbiala en el banner GPS o el selector de fincas.
      </p>

      {/* 062.3 / 062.7: si gpsOverride activo, ofrecer volver a auto-detect */}
      {gpsOverride && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-900/20 border border-amber-700/40">
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-sm font-bold text-amber-200">Modo manual activo</span>
            <span className="text-[10px] text-amber-300/70">
              El banner GPS no consultará tu ubicación hasta que vuelvas a modo auto.
            </span>
          </div>
          <button
            type="button"
            onClick={clearGpsOverride}
            className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-amber-50 text-xs font-bold whitespace-nowrap"
          >
            Volver a auto
          </button>
        </div>
      )}

      {/* 062.7: indoor invernadero override */}
      <label className="flex flex-col gap-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <Home size={12} /> Zona indoor (invernadero)
        </span>
        <span className="text-[10px] text-slate-500 leading-relaxed">
          Cuando estás bajo techo y el GPS pierde fix, Chagra recuerda esta zona
          para no volver a "out of range". Vacío = sin zona indoor activa.
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            value={indoorInput}
            onChange={(e) => setIndoorInput(e.target.value)}
            placeholder="Ej: Invernadero 1, Vivero norte"
            className="flex-1 p-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none text-white text-base min-h-[48px]"
          />
          <button
            type="button"
            onClick={handleSaveIndoor}
            className="px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-sm font-bold border border-slate-700 min-h-[48px]"
          >
            Guardar
          </button>
        </div>
        {indoorZone && (
          <p className="text-[10px] text-emerald-400/80">
            Activo: <strong>{indoorZone}</strong>
          </p>
        )}
      </label>

      {/* 062.8: privacy opt-in GPS history */}
      <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 cursor-pointer min-h-[48px]">
        <div className="flex flex-col gap-0.5 flex-1">
          <span className="text-sm font-bold text-slate-200">Sincronizar histórico GPS</span>
          <span className="text-[10px] text-slate-500 leading-snug">
            Off por default. Cuando activo, Chagra envía tu ubicación al server
            para análisis multifinca. Off = solo lookup local sin persistencia.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={gpsHistoryEnabled}
          onClick={() => setGpsHistoryEnabled(!gpsHistoryEnabled)}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
            gpsHistoryEnabled ? 'bg-emerald-600' : 'bg-slate-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
              gpsHistoryEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </label>
    </div>
  );
}
