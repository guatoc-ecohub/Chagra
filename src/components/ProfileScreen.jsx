import React, { useState, useEffect, useRef } from 'react';
import { User, Palette, Briefcase, Save, Check, Mic, MapPin, Home, Volume2, Wrench, Sprout, ChevronRight, ChevronDown, Bell, Users, Camera, Trash2, RotateCcw } from 'lucide-react';
import { version as APP_VERSION } from '../../package.json';
import { ScreenShell } from './common/ScreenShell';
import { esExtensionistaActual } from '../config/extensionistaAccess';
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
import { getNotificationStyle, setNotificationStyle, getTelemetryConsent, setTelemetryConsent, HOME_MODULES, getModuleVisibility, setModuleVisibility, hasManualModuleVisibility, getProfile } from '../services/userProfileService';
import { selectHomeModuleVisibilityMap } from '../services/homeModuleSelector';
import { tieneAccesoGlaciarActual, esOperadorActual, operatorOverrideActivo, setOperatorOverride } from '../config/glaciarAccess';
import { getOperatorPhoto, setOperatorPhotoFromFile, removeOperatorPhotoLocal } from '../services/operatorPhotoService';
import ProfileSwitcher from './Settings/ProfileSwitcher';
import { MSG } from '../config/messages';

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
 * larga. Ahora se agrupa en pestañas con una tab bar sticky arriba (sin
 * librería nueva: estado local `activeTab` + render condicional):
 *   - 👤 Perfil:     nombre, rol, CTAs onboarding + ubicación.
 *   - 🎨 Apariencia: tema, fondo, avatar del agente.
 *   - 🔊 Voz y finca: voz del agente + selector de voz + multifinca/GPS.
 *   - 📦 Módulos:    visibilidad de módulos del home.
 *   - ⚙️ Avanzado:   modo técnico (HYTA), telemetría, copia de seguridad, PDF.
 * Ningún breaking change funcional: todas las opciones siguen accesibles.
 *
 * Pasada visual (2026-07-03): lenguaje visual unificado con SectionCard /
 * ToggleRow / Toggle locales (mismos radios/sombras via tokens.css), switches
 * de 52×32 con fila completa tappable (dedos con tierra), selects con flecha
 * visible, jerarquía de encabezados con chip de ícono, tono usted en el copy.
 * Sin cambios de lógica ni persistencia.
 */

const ROLES = [
  { id: 'operador_campo', label: MSG.perfilScreen.rolOperadorCampo },
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
  { id: 'perfil', emoji: '👤', label: MSG.nav.perfil },
  { id: 'apariencia', emoji: '🎨', label: 'Apariencia' },
  { id: 'voz', emoji: '🔊', label: 'Voz y finca' },
  { id: 'modulos', emoji: '📦', label: 'Módulos' },
  { id: 'avanzado', emoji: '⚙️', label: 'Avanzado' },
];

/* ──────────────────────────────────────────────────────────────────────────
 * Piezas visuales compartidas de la pantalla (solo presentación, cero lógica).
 * Antes cada sección repetía a mano la card, el header y el switch — con
 * pequeñas derivas entre sí (paddings, tamaños de texto, radios). Centralizado
 * aquí para que TODA la configuración se lea con la misma gramática visual.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * SectionCard — card de sección con encabezado (chip de ícono + título) y
 * descripción opcional. Radio/sombra desde tokens.css (--r-lg / --sombra-1).
 */
function SectionCard({ icon: Icon, iconClass = 'text-emerald-400', iconBgClass = 'bg-emerald-900/40 border-emerald-700/40', title, hint, children, className = '' }) {
  return (
    <section
      className={`bg-slate-900/40 border border-slate-800 p-5 space-y-4 ${className}`}
      style={{ borderRadius: 'var(--r-lg, 20px)', boxShadow: 'var(--sombra-1, 0 1px 2px rgb(8 30 22 / 0.18))' }}
    >
      <header className="flex items-center gap-3">
        {Icon && (
          <span
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconBgClass}`}
            aria-hidden="true"
          >
            <Icon size={18} className={iconClass} />
          </span>
        )}
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{title}</h3>
      </header>
      {hint && <p className="text-xs text-slate-400 leading-relaxed">{hint}</p>}
      {children}
    </section>
  );
}

/**
 * Toggle — switch accesible (role=switch). 52×32 con knob de 28px: más área
 * táctil que el 48×28 anterior y estado ON/OFF legible al sol. Focus ring
 * explícito (la regla global de index.css solo cubre a/input/select/textarea).
 * La transición del knob queda cubierta por el guard global de
 * prefers-reduced-motion (index.css).
 */
function Toggle({ checked, onClick, activeClass = 'bg-emerald-600', ariaLabel, testId }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      data-testid={testId}
      onClick={onClick}
      className={`relative w-[52px] h-8 rounded-full border transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
        checked ? `${activeClass} border-transparent` : 'bg-slate-700 border-slate-600/60'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/**
 * ToggleRow — fila título + descripción + switch. TODA la fila dispara el
 * toggle (área táctil generosa para campo); el click del botón interno
 * burbujea a la fila, por eso el handler vive solo en la fila (sin doble
 * disparo). El botón role=switch sigue siendo el control accesible/focusable.
 */
function ToggleRow({ title, desc, checked, onClick, activeClass, ariaLabel, testId }) {
  return (
    // El control accesible es el Toggle interno (role=switch, focusable, con
    // aria-label); la fila solo amplía el área táctil y el click del botón
    // burbujea hasta aquí (un solo handler → sin doble disparo).
    <div
      onClick={onClick}
      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 min-h-[56px] cursor-pointer hover:bg-slate-800/70 transition-colors"
    >
      <div className="flex flex-col gap-0.5 flex-1">
        <span className="text-sm font-bold text-slate-200">{title}</span>
        {desc && <span className="text-xs text-slate-400 leading-snug">{desc}</span>}
      </div>
      <Toggle checked={checked} activeClass={activeClass} ariaLabel={ariaLabel} testId={testId} />
    </div>
  );
}

/**
 * SelectField — select nativo con flecha visible. El `appearance-none`
 * anterior borraba la flecha del SO y el control parecía un input muerto.
 */
function SelectField({ value, onChange, children, ariaLabel }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        className="w-full p-3 pr-10 rounded-xl bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none text-white text-base min-h-[48px] appearance-none"
      >
        {children}
      </select>
      <ChevronDown
        size={18}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}

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

  // Foto de perfil del operador (feature recuperada 2026-06-15). Persiste
  // local (localStorage) + sincroniza a FarmOS cuando hay sesión, vía
  // operatorPhotoService. Render inmediato desde localStorage (offline-first).
  const [photoData, setPhotoData] = useState(() => getOperatorPhoto());
  const [photoError, setPhotoError] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInputRef = useRef(null);

  const handlePhotoSelected = async (e) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('El archivo no parece una imagen.');
      return;
    }
    setPhotoBusy(true);
    try {
      // Redimensiona + persiste local + dispara sync a FarmOS en segundo plano.
      const dataUrl = await setOperatorPhotoFromFile(file);
      setPhotoData(dataUrl);
    } catch (err) {
      console.warn('[ProfileScreen] photo upload falló:', err);
      setPhotoError('No pudimos procesar la imagen. Intente con otra.');
    } finally {
      setPhotoBusy(false);
      // Reset para permitir re-elegir el mismo archivo si quiere.
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handlePhotoRemove = () => {
    removeOperatorPhotoLocal();
    setPhotoData('');
    setPhotoError(null);
  };

  const [savedFlash, setSavedFlash] = useState(false);
  const [telemetryEnabled, setTelemetryEnabled] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('chagra:voice:telemetry:enabled') !== '0'
      : true
  );
  // Tarea #8 — consentimiento para ENVIAR la telemetría del agente al servidor.
  // OFF por defecto (privacidad). Distinto de la telemetría de voz local de
  // arriba (que solo graba en el dispositivo): este toggle autoriza el envío
  // de metadatos anónimos (NUNCA prompt ni respuesta) al sidecar para mejorar
  // el producto.
  const [telemetryConsent, setTelemetryConsentState] = useState(() => getTelemetryConsent());
  const [telemetryTtl, setTelemetryTtl] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('chagra:voice:telemetry:ttl') || '7d'
      : '7d'
  );

  // Visibilidad de módulos del Home (#7003 + gating por perfil 2026-06-15).
  // Permite activar/desactivar cada módulo individualmente. Estado inicial =
  // visibilidad EFECTIVA del home: si el usuario ya guardó una preferencia
  // MANUAL, esa gana (#1560); si no, partimos del DEFAULT derivado del perfil
  // (homeModuleSelector) para que los toggles coincidan con lo que el home
  // realmente muestra. Así un urbano ve aquí 'zonas/insumos' ya en OFF (no un
  // todo-ON que contradiga su home).
  const [moduleVisibility, setModuleVisibilityState] = useState(() => {
    try {
      if (hasManualModuleVisibility()) return getModuleVisibility();
      return selectHomeModuleVisibilityMap(getProfile(), {
        esGuiaGlaciar: tieneAccesoGlaciarActual(),
      });
    } catch (_) {
      return getModuleVisibility();
    }
  });

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

  // Visión total del operador (bug demo 2026-06-19: "faltan varios botones en mi
  // usuario"). La whitelist de operador se inyecta SOLO por VITE_OPERATOR_USERNAME
  // en el build de prod (anti-leak); en un build de demo sin esa env, el bypass
  // de gating nunca se activa y al operador le faltan módulos/botones. Este toggle
  // enciende el override LOCAL (localStorage, sin leakear username) para que el
  // operador vea TODO. Cambiar el flag re-deriva el home (chagra:profile-changed).
  const [verTodo, setVerTodo] = useState(() => {
    try { return operatorOverrideActivo() || esOperadorActual(); } catch (_) { return false; }
  });
  const handleVerTodo = () => {
    const next = !verTodo;
    setOperatorOverride(next);
    setVerTodo(next);
    // Re-derivar el gating del home en vivo (mismo evento que el switch de perfil).
    try {
      window.dispatchEvent(new CustomEvent('chagra:profile-changed', { detail: { operatorOverride: next } }));
    } catch (_) { /* noop */ }
  };

  // Estilo de notificación de alertas (operador 2026-06-06): 'demo' (chip
  // llamativo estilo demo en la portada del agente, POR DEFECTO) o 'actual'
  // (campanita del TopBar). Persiste en el perfil (userProfileService).
  const [notifStyle, setNotifStyle] = useState(() => getNotificationStyle());
  const handleNotifStyle = (style) => {
    setNotifStyle(style);
    setNotificationStyle(style);
  };

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

  // Sincronizar visibilidad de módulos con el perfil y notificar al Home
  // para actualización en tiempo real.
  useEffect(() => {
    setModuleVisibility(moduleVisibility);
    try {
      window.dispatchEvent(new CustomEvent('chagra:module-visibility-changed', {
        detail: { visibility: moduleVisibility },
      }));
    } catch (_) { /* noop */ }
  }, [moduleVisibility]);

  const handleSave = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const currentRoleLabel = ROLES.find(r => r.id === role)?.label || MSG.perfilScreen.rolOperadorCampo;

  return (
    <ScreenShell title={MSG.perfilScreen.tituloPantalla} icon={User} onBack={onBack} onHome={onHome}>
      {/* Tab bar sticky arriba. Scroll horizontal en móvil si no caben todas
          (overflow-x-auto + whitespace-nowrap). La pestaña activa lleva ring +
          texto emerald como indicador visual. role=tablist para a11y. */}
      <div
        role="tablist"
        aria-label="Secciones del perfil"
        className="sticky top-0 z-20 flex gap-2 overflow-x-auto bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-3 py-2"
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
              className={`shrink-0 whitespace-nowrap px-4 rounded-xl text-sm font-bold transition-colors min-h-[48px] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                isActive
                  ? 'bg-emerald-900/40 text-emerald-200 ring-2 ring-emerald-500/50 shadow-[0_1px_8px_rgb(16_185_129/0.15)]'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 active:bg-slate-700'
              }`}
            >
              <span aria-hidden="true">{tab.emoji}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-5 px-4 pt-4 pb-8 max-w-2xl mx-auto w-full">
        {/* ── PESTAÑA: PERFIL ───────────────────────────────────────── */}
        {activeTab === 'perfil' && (
          <div
            role="tabpanel"
            id="profile-panel-perfil"
            aria-labelledby="profile-tab-perfil"
            className="flex flex-col gap-5"
          >
            {/* ID Card / User Info, header con datos sintetizados.
                Avatar editable: el operador sube su foto (cámara/galería). La
                imagen se guarda local (offline) y se sincroniza a FarmOS para
                verla en otros dispositivos (operatorPhotoService). */}
            <div
              className="bg-slate-900/60 border border-slate-800 p-6 flex flex-col items-center"
              style={{ borderRadius: 'var(--r-lg, 20px)', boxShadow: 'var(--sombra-2, 0 6px 18px rgb(8 30 22 / 0.22))' }}
            >
              <div className="relative mb-4">
                {/* Anillo degradado alrededor del avatar: le da presencia de
                    "carné" al header sin depender de la foto. */}
                <div className="p-[3px] rounded-full bg-gradient-to-br from-emerald-400/70 via-emerald-600/40 to-sky-500/40">
                  <div className="w-24 h-24 bg-slate-800 rounded-full overflow-hidden flex items-center justify-center border-2 border-slate-900">
                    {photoData ? (
                      <img
                        src={photoData}
                        alt={`Foto de ${name}`}
                        className="w-full h-full object-cover"
                        data-testid="profile-photo-img"
                      />
                    ) : (
                      <User size={44} className="text-emerald-400" aria-hidden="true" />
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoBusy}
                  data-testid="profile-photo-button"
                  className="absolute -bottom-1.5 -right-1.5 w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-60 text-white flex items-center justify-center shadow-lg border-2 border-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                  aria-label={photoData ? 'Cambiar foto de perfil' : MSG.perfilScreen.agregarFotoPerfil}
                  title={photoData ? 'Cambiar foto' : MSG.perfilScreen.agregarFoto}
                >
                  <Camera size={18} aria-hidden="true" />
                </button>
                {/* SIN `capture` (operador 2026-06-15): el atributo `capture`
                    forzaba la cámara y ocultaba la galería en móvil. Quitándolo,
                    el SO ofrece AMBOS — cámara y galería/archivos — que es lo que
                    el operador espera para elegir una foto ya existente. */}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelected}
                  className="hidden"
                  aria-hidden="true"
                  data-testid="profile-photo-input"
                />
              </div>
              {photoError && (
                <p className="text-xs text-amber-400 mb-2" role="alert">{photoError}</p>
              )}
              <h2 className="text-2xl font-black text-white text-center">{name}</h2>
              <span className="mt-2 px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 text-[11px] font-bold uppercase tracking-widest">
                {currentRoleLabel}
              </span>
              {photoData && (
                <button
                  type="button"
                  onClick={handlePhotoRemove}
                  className="mt-3 px-3 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 inline-flex items-center gap-1.5 min-h-[40px] transition-colors"
                >
                  <Trash2 size={13} aria-hidden="true" /> Quitar foto
                </button>
              )}
            </div>

            {/* Selector de PERFIL activo (tarea #33). Cambia el rol activo —
                campesino / cafetero / cacaotero / corporativo — afectando chips,
                módulos del home y asociaciones por rol. Operador 2026-06-19:
                "nunca he visto cómo switchear a los perfiles corporativos". */}
            <ProfileSwitcher />

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
                className="text-left rounded-2xl bg-emerald-900/20 border border-emerald-800/40 p-4 hover:bg-emerald-900/30 active:bg-emerald-900/40 transition-colors flex items-center gap-3 min-h-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
              >
                <div className="p-2.5 rounded-xl bg-emerald-900/40 border border-emerald-700/40 shrink-0">
                  <Sprout size={20} className="text-emerald-400" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Personalizar mi agente</p>
                  <p className="text-xs text-slate-400 mt-0.5">Cuéntele de su cultivo para respuestas a su medida</p>
                </div>
                <ChevronRight size={18} className="text-slate-500 shrink-0" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => {
                  try {
                    window.dispatchEvent(new CustomEvent('chagra:nav', { detail: { view: 'ubicacion-detectada', data: { back: 'perfil' } } }));
                  } catch (_) { /* noop */ }
                }}
                className="text-left rounded-2xl bg-sky-900/20 border border-sky-800/40 p-4 hover:bg-sky-900/30 active:bg-sky-900/40 transition-colors flex items-center gap-3 min-h-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
              >
                <div className="p-2.5 rounded-xl bg-sky-900/40 border border-sky-700/40 shrink-0">
                  <MapPin size={20} className="text-sky-400" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Configurar ubicación</p>
                  <p className="text-xs text-slate-400 mt-0.5">{MSG.perfilScreen.ubicacionDesc}</p>
                </div>
                <ChevronRight size={18} className="text-slate-500 shrink-0" aria-hidden="true" />
              </button>
            </div>

            {/* Edit Form */}
            <SectionCard icon={Briefcase} title="Datos del trabajador">
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
                <SelectField value={role} onChange={(e) => setRole(e.target.value)} ariaLabel="Rol del trabajador">
                  {ROLES.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </SelectField>
              </label>

              <button
                type="button"
                onClick={handleSave}
                className={`w-full p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors min-h-[48px] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
                  savedFlash ? 'bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
                }`}
              >
                {savedFlash ? <><Check size={18} aria-hidden="true" /> Guardado</> : <><Save size={18} aria-hidden="true" /> {MSG.perfilScreen.guardarCambios}</>}
              </button>
              <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                El nombre y el rol se guardan en su dispositivo. Su foto de perfil
                se sincroniza con el servidor para verla en otros dispositivos.
              </p>
            </SectionCard>
          </div>
        )}

        {/* ── PESTAÑA: APARIENCIA ───────────────────────────────────── */}
        {activeTab === 'apariencia' && (
          <div
            role="tabpanel"
            id="profile-panel-apariencia"
            aria-labelledby="profile-tab-apariencia"
            className="flex flex-col gap-5"
          >
            <div className="flex items-center gap-3 px-1">
              <span className="w-9 h-9 rounded-xl border bg-emerald-900/40 border-emerald-700/40 flex items-center justify-center shrink-0" aria-hidden="true">
                <Palette size={18} className="text-emerald-400" />
              </span>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Personalización</h3>
            </div>
            <ThemeSelector />
            <BackgroundSelector />
            <AgentAvatarSelector />

            {/* Estilo de notificación (operador 2026-06-06 + 2026-06-11).
                Decide CUÁL campana única se muestra (bug "dos campanas"):
                'demo' = campana de la portada del agente + aviso destacado
                (por defecto). 'actual' = campanita clásica del encabezado.
                Persiste en el perfil. */}
            <SectionCard
              icon={Bell}
              title="Botón de avisos"
              hint="Elija cuál campana le muestra los avisos (alertas, tareas y sincronización). Solo se muestra una."
            >
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Estilo de avisos">
                {[
                  { id: 'demo', label: 'Campana de la portada', desc: 'Vive en la portada del agente, con aviso destacado de clima' },
                  { id: 'actual', label: 'Campana clásica', desc: 'El ícono de arriba, con notificaciones y clima' },
                ].map((opt) => {
                  const selected = notifStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => handleNotifStyle(opt.id)}
                      className={`text-left rounded-2xl p-4 border transition-colors min-h-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                        selected
                          ? 'bg-emerald-900/30 border-emerald-600/60'
                          : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800/70 active:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-bold text-white">{opt.label}</span>
                        {/* Indicador radio explícito: el borde solo era muy
                            sutil bajo sol directo. */}
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            selected ? 'border-emerald-400' : 'border-slate-600'
                          }`}
                        >
                          {selected && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                        </span>
                      </span>
                      <span className="block text-xs text-slate-400 mt-1 leading-snug">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── PESTAÑA: VOZ Y FINCA ──────────────────────────────────── */}
        {activeTab === 'voz' && (
          <div
            role="tabpanel"
            id="profile-panel-voz"
            aria-labelledby="profile-tab-voz"
            className="flex flex-col gap-5"
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

        {/* ── PESTAÑA: MÓDULOS (#7003) ───────────────────────────────── */}
        {activeTab === 'modulos' && (
          <div
            role="tabpanel"
            id="profile-panel-modulos"
            aria-labelledby="profile-tab-modulos"
            className="flex flex-col gap-5"
          >
            <SectionCard
              icon={Sprout}
              title="Módulos del Home"
              hint="Elija qué módulos quiere ver en su pantalla de inicio. Puede ocultar los que no usa para tener una vista más limpia. Todos los módulos están activados por defecto."
            >
              {/* Agrupar módulos por categoría */}
              {(() => {
                const grouped = {};
                for (const module of HOME_MODULES) {
                  if (!grouped[module.category]) {
                    grouped[module.category] = [];
                  }
                  grouped[module.category].push(module);
                }
                return Object.entries(grouped).map(([category, modules]) => (
                  <div key={category} className="mt-4 first:mt-0">
                    {/* Encabezado de categoría con línea divisoria — separa
                        visualmente los grupos en listas largas. */}
                    <div className="flex items-center gap-3 mb-2 px-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide shrink-0">
                        {category}
                      </p>
                      <span className="h-px bg-slate-800 flex-1" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                      {modules.map((module) => (
                        <ToggleRow
                          key={module.id}
                          title={module.label}
                          desc={module.description}
                          checked={moduleVisibility[module.id] !== false}
                          ariaLabel={`Mostrar u ocultar ${module.label}`}
                          onClick={() => setModuleVisibilityState((prev) => ({
                            ...prev,
                            [module.id]: prev[module.id] === false ? true : false,
                          }))}
                        />
                      ))}
                    </div>
                  </div>
                ));
              })()}

              <div className="mt-4 pt-4 border-t border-slate-800/50">
                <button
                  type="button"
                  onClick={() => {
                    const allVisible = Object.fromEntries(HOME_MODULES.map(m => [m.id, true]));
                    setModuleVisibilityState(allVisible);
                  }}
                  className="w-full p-3 rounded-xl bg-slate-800/50 hover:bg-slate-700/60 active:bg-slate-700 border border-slate-700/60 transition-colors flex items-center justify-center gap-2 min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
                >
                  <RotateCcw size={16} className="text-emerald-400" aria-hidden="true" />
                  <span className="text-sm font-bold text-slate-200">Restaurar todos los módulos</span>
                </button>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── PESTAÑA: AVANZADO ─────────────────────────────────────── */}
        {activeTab === 'avanzado' && (
          <div
            role="tabpanel"
            id="profile-panel-avanzado"
            aria-labelledby="profile-tab-avanzado"
            className="flex flex-col gap-5"
          >
            {/* Modo técnico toggle — Free 7→10 fix-pack (hipótesis #4).
                HYTA (GPU/Ollama) es jerga ingenieril que asusta al campesino
                target. Lo ocultamos detrás de un switch off-by-default para
                usuarios curiosos sin imponerlo a la mayoría. */}
            <SectionCard
              icon={Wrench}
              iconClass="text-slate-300"
              iconBgClass="bg-slate-800/70 border-slate-700"
              title="Modo técnico"
            >
              <ToggleRow
                title="Mostrar información GPU"
                desc="Para curiosos: muestra qué modelos de IA están cargados en GPU y cuánta memoria usan. No es necesario para usar Chagra."
                checked={modoTecnico}
                activeClass="bg-slate-500"
                ariaLabel="Activar o desactivar modo técnico"
                onClick={() => setModoTecnico((v) => !v)}
              />

              {modoTecnico && (
                <div className="mt-2">
                  <HytaPanel />
                </div>
              )}
            </SectionCard>

            {/* Visión total del operador (tarea bug demo 2026-06-19). Bypass del
                gating del home: enciende TODOS los módulos, las 4 tarjetas de
                seguimiento y el catálogo completo de chips. Pensado para el
                operador/admin del producto y para demos. NO leakea identidad: es
                una bandera booleana local (ver glaciarAccess.setOperatorOverride). */}
            <SectionCard
              icon={Wrench}
              iconClass="text-amber-400"
              iconBgClass="bg-amber-900/30 border-amber-700/40"
              title="Visión total (operador)"
            >
              <ToggleRow
                title="Mostrar todas las capacidades"
                desc="Activa todos los módulos, tarjetas de seguimiento y opciones del home, saltándose el filtrado por perfil. Útil para demos y para el administrador del producto."
                checked={verTodo}
                activeClass="bg-amber-600"
                ariaLabel="Activar o desactivar la visión total del operador"
                testId="operator-override-toggle"
                onClick={handleVerTodo}
              />
            </SectionCard>

            {/* Modo extensionista (ADR-048 MVP): entrada al panel supervisor
                multi-finca. Solo se RENDERIZA si el usuario tiene el rol
                (feature flag VITE_FEATURE_EXTENSIONISTA + whitelist). Para el
                resto de usuarios esta sección no existe. Navega vía 'chagra:nav'
                (patrón CSP-safe, sin onClick inline-string). */}
            {esExtensionistaActual() && (
              <SectionCard icon={Users} title="Acompañamiento">
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('chagra:nav', { detail: { view: 'extensionista' } }));
                  }}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/60 active:bg-slate-700 transition-colors min-h-[56px] text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
                >
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className="text-sm font-bold text-slate-200">Fincas que acompaño</span>
                    <span className="text-xs text-slate-400 leading-snug">
                      Panel del extensionista: revise el estado de las fincas que
                      supervisa. Vista previa con datos de ejemplo.
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 shrink-0" aria-hidden="true" />
                </button>
              </SectionCard>
            )}

            {/* Telemetry Section */}
            <SectionCard icon={Mic} iconClass="text-morpho" iconBgClass="bg-slate-800/70 border-slate-700" title="Telemetría de Voz">
              <ToggleRow
                title="Habilitar telemetría"
                desc={MSG.perfilScreen.telemetriaVozDesc}
                checked={telemetryEnabled}
                ariaLabel="Habilitar telemetría de voz"
                onClick={() => setTelemetryEnabled((v) => !v)}
              />

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Período de retención</span>
                <SelectField value={telemetryTtl} onChange={(e) => setTelemetryTtl(e.target.value)} ariaLabel="Período de retención de telemetría">
                  {TTL_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </SelectField>
              </label>

              <p className="text-[11px] text-slate-500 px-1 leading-relaxed">
                La telemetría sigue grabándose en el dispositivo (privacy-safe, NUNCA prompt ni respuesta).
                El dashboard de visualización se migró al panel privado del operador (ADR-020 anti-leak / ADR-029 Capa C).
              </p>
            </SectionCard>

            {/* Tarea #8 — Consentimiento de envío de telemetría al servidor.
                Default OFF (privacidad). Autoriza enviar SOLO metadatos
                anónimos (modelo, ruta, latencias, tokens) — NUNCA el prompt ni
                la respuesta ni datos de ubicación. */}
            <SectionCard icon={Wrench} iconClass="text-morpho" iconBgClass="bg-slate-800/70 border-slate-700" title="Compartir telemetría del agente">
              <ToggleRow
                title="Enviar métricas anónimas"
                desc={MSG.perfilScreen.telemetriaAgenteDesc}
                checked={telemetryConsent}
                ariaLabel="Enviar métricas anónimas del agente"
                testId="telemetry-consent-toggle"
                onClick={() => {
                  const next = !telemetryConsent;
                  setTelemetryConsent(next);
                  setTelemetryConsentState(next);
                }}
              />

              <p className="text-[11px] text-slate-500 px-1 leading-relaxed">
                Si lo activa, se envían al servidor métricas agregadas de sus consultas (modelo usado, tipo de
                consulta, tiempos de respuesta y conteo de tokens). Nunca se envían el texto de sus preguntas ni
                las respuestas, ni su ubicación. Puede desactivarlo cuando quiera.
              </p>
            </SectionCard>

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

        {/* App Info Footer — común a todas las pestañas. La versión sale del
            package.json (auto-bump), antes decía "v1.0.0" fijo y mentía. */}
        <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
          <p className="text-[11px] text-slate-500 font-mono tracking-tight uppercase">
            Chagra • v{APP_VERSION}
          </p>
          <p className="text-[10px] text-slate-600 mt-1 max-w-[220px] mx-auto leading-snug">
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
    <SectionCard icon={Volume2} iconClass="text-violet-400" iconBgClass="bg-violet-900/30 border-violet-700/40" title="Voz del agente">
      <ToggleRow
        title="Voz del agente activa"
        desc="Cuando está activa, Chagra IA lee en voz alta sus respuestas (Kokoro TTS, con respaldo al sintetizador del navegador). Doble click en el avatar colibrí silencia o reactiva sin abrir esta pantalla."
        checked={ttsEnabled}
        activeClass="bg-violet-600"
        ariaLabel="Activar o silenciar la voz del agente"
        onClick={handleToggle}
      />
    </SectionCard>
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
    <SectionCard icon={MapPin} title="Multifinca y GPS">
      <p className="text-xs text-slate-400 leading-relaxed">
        {MSG.perfilScreen.fincaActivaLabel} <strong className="text-slate-200">{activeFincaSlug}</strong>.
        {' '}Cámbiela en el banner GPS o el selector de fincas.
      </p>

      {/* 062.3 / 062.7: si gpsOverride activo, ofrecer volver a auto-detect */}
      {gpsOverride && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-900/20 border border-amber-700/40">
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-sm font-bold text-amber-200">Modo manual activo</span>
            <span className="text-xs text-amber-300/70 leading-snug">
              El banner GPS no consultará su ubicación hasta que vuelva a modo auto.
            </span>
          </div>
          <button
            type="button"
            onClick={clearGpsOverride}
            className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 active:bg-amber-800 text-amber-50 text-xs font-bold whitespace-nowrap min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            Volver a auto
          </button>
        </div>
      )}

      {/* 062.7: indoor invernadero override */}
      <label className="flex flex-col gap-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <Home size={12} aria-hidden="true" /> Zona indoor (invernadero)
        </span>
        <span className="text-xs text-slate-400 leading-relaxed">
          Cuando está bajo techo y el GPS pierde señal, Chagra recuerda esta zona
          para no volver a "fuera de rango". Vacío = sin zona indoor activa.
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            value={indoorInput}
            onChange={(e) => setIndoorInput(e.target.value)}
            placeholder="Ej: Invernadero 1, Vivero norte"
            className="flex-1 min-w-0 p-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none text-white text-base min-h-[48px]"
          />
          <button
            type="button"
            onClick={handleSaveIndoor}
            className="px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-bold min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            {MSG.perfilScreen.guardar}
          </button>
        </div>
        {indoorZone && (
          <p className="text-xs text-emerald-400/90">
            Activo: <strong>{indoorZone}</strong>
          </p>
        )}
      </label>

      {/* 062.8: privacy opt-in GPS history */}
      <ToggleRow
        title="Sincronizar histórico GPS"
        desc="Desactivado por defecto. Cuando está activo, Chagra envía su ubicación al servidor para análisis multifinca. Desactivado = solo consulta local sin persistencia."
        checked={gpsHistoryEnabled}
        ariaLabel="Sincronizar histórico GPS con el servidor"
        onClick={() => setGpsHistoryEnabled(!gpsHistoryEnabled)}
      />
    </SectionCard>
  );
}
