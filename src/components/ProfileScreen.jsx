import React, { useState, useEffect, useRef } from 'react';
import {
  User, Palette, Briefcase, Save, Check, Mic, MapPin, Home, Volume2, Wrench,
  Sprout, ChevronRight, ChevronLeft, Bell, Users, Camera, Trash2, Shield,
  Archive, LifeBuoy, LayoutGrid, GraduationCap, Vibrate, Waves, Mountain,
} from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import { esExtensionistaActual } from '../config/extensionistaAccess';
import ThemeSelector from './common/ThemeSelector';
import ThemeLivePreview from './common/ThemeLivePreview';
import AgentAvatarSelector from './Settings/AgentAvatarSelector';
import AvatarSelector from './Settings/AvatarSelector';
import useAvatarCreature from '../hooks/useAvatarCreature';
import BackgroundSelector from './Settings/BackgroundSelector';
import BackupExportButton from './BackupExportButton';
import CuadernoPDFButton from './CuadernoPDFButton';
import VoiceSelector from './Settings/VoiceSelector';
import ModoCampoPanel from './modoCampo/ModoCampoPanel';
import { modoCampoDisponible } from '../config/modoCampoFlag';
import HytaPanel from './HytaPanel';
import { PRIMARY_WORKER_NAME } from '../config/workerConfig';
import useFincaActiveStore from '../services/fincaActiveStore';
import usePrefsStore from '../store/usePrefsStore';
/* FASE 0 game-dev: tiering del equipo para el aviso honesto del toggle 3D
   (import directo, three-free — no arrastra el framework de mundos). */
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier';
import { stop as stopTTS } from '../services/ttsService';
import {
  getNotificationStyle, setNotificationStyle, getTelemetryConsent,
  setTelemetryConsent, HOME_MODULES, getModuleVisibility, setModuleVisibility,
  hasManualModuleVisibility, getProfile, saveProfile, getProfileMunicipio,
} from '../services/userProfileService';
import { selectHomeModuleVisibilityMap } from '../services/homeModuleSelector';
import { tieneAccesoGlaciarActual, esOperadorActual, operatorOverrideActivo, setOperatorOverride } from '../config/glaciarAccess';
import { getOperatorPhoto, setOperatorPhotoFromFile, removeOperatorPhotoLocal } from '../services/operatorPhotoService';
import ProfileSwitcher from './Settings/ProfileSwitcher';
import { useTheme, getSelectableThemes } from '../hooks/useTheme';
import { fincaVivaHomePerfilActivo } from '../config/fincaVivaHomeFlag';
import { MSG } from '../config/messages';

const TTL_OPTIONS = [
  { id: '1d', label: '1 día' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'never', label: 'Nunca' },
];

/**
 * ProfileScreen — "Mi Chagra", el morral del usuario.
 *
 * REDISEÑO HUB-AND-SPOKE BENTO (2026-07-05, "reinventar el panel de perfil"):
 * el operador pidió mejorar la navegabilidad por TODAS las opciones y añadir
 * previsualización de temas. Se exploraron 4 conceptos (cédula-lista, morral
 * bento vivo, tabs 2.0, sendero-acordeón); ganó "El Morral":
 *
 *   HUB (portada) → cédula de identidad (foto/nombre/rol/ubicación) + rejilla
 *   bento donde CADA tarjeta resume su sección con ESTADO VIVO (tema actual
 *   con mini-previews, voz on/off + nivel de respuestas, finca activa, N de M
 *   módulos, privacidad on/off). Tocar una tarjeta enfoca su SECCIÓN, con
 *   volver-al-morral. Ventaja sobre las 5 pestañas anteriores: el mapa
 *   completo de opciones se ve de un vistazo (las tabs se truncaban en móvil
 *   y escondían el estado).
 *
 * Secciones (todo lo que estaba regado, unificado):
 *   - datos       → nombre, rol, cambio de perfil activo (ProfileSwitcher).
 *   - apariencia  → GALERÍA DE TEMAS con preview (nuevo), fondo, avatar,
 *                   estilo de avisos.
 *   - agente      → nivel de respuestas simple/detallado/maestro (antes solo
 *                   en onboarding), personalizar agente, voz TTS + selector.
 *   - finca       → ubicación, multifinca, GPS indoor, histórico GPS.
 *   - inicio      → visibilidad de módulos del home.
 *   - privacidad  → telemetría de voz local + consentimiento de envío.
 *   - respaldo    → copia de seguridad JSON + cuaderno de campo PDF.
 *   - avanzado    → modo técnico (HYTA), visión total, extensionista.
 *   - ayuda       → acción directa al manual de uso (chagra:nav).
 *
 * Historia previa que se conserva (sin breaking change funcional):
 *   - Feedback piloto #120: nombre/rol editables (chagra:operator:name/role).
 *   - Pestañas 2026-05-28 ("difícil de navegar") → superadas por este hub.
 *   - Foto de perfil 2026-06-15 (operatorPhotoService, testids intactos).
 *   - Todos los toggles/keys de localStorage y eventos CustomEvent idénticos.
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
 * Nivel de respuestas del agente (3 modos, memoria
 * reference-agente-modos-experto-campesino-maestro). Antes SOLO se podía
 * elegir en el onboarding (OnboardingProfile) o con el switch parcial
 * simple/detallado del hero finca viva — aquí queda el control COMPLETO,
 * persistido en el perfil (`nivel_respuestas`, mismo campo que arma el
 * system-prompt del LLM en agentPromptBase).
 */
const NIVELES_RESPUESTA = [
  { value: 'simple', label: 'Simple y al grano', desc: 'Respuestas cortas y claras, sin enredos.' },
  { value: 'detallado', label: 'Detallado', desc: 'Con explicación técnica y sus datos.' },
  { value: 'maestro', label: 'Maestro', desc: 'Le enseña el porqué de cada cosa.' },
];

/** Catálogo de secciones del morral. El orden define la rejilla del hub. */
const SECTIONS = [
  { id: 'apariencia', label: 'Apariencia', icon: Palette, tint: 'text-amber-400', tintBg: 'bg-amber-900/30 border-amber-700/40', desc: 'Tema, fondo y avatar' },
  { id: 'agente', label: 'Mi agente', icon: Sprout, tint: 'text-emerald-400', tintBg: 'bg-emerald-900/30 border-emerald-700/40', desc: 'Respuestas y voz' },
  { id: 'datos', label: 'Mis datos', icon: User, tint: 'text-teal-300', tintBg: 'bg-teal-900/30 border-teal-700/40', desc: 'Nombre, rol y perfil' },
  { id: 'finca', label: 'Finca y ubicación', icon: MapPin, tint: 'text-sky-400', tintBg: 'bg-sky-900/30 border-sky-700/40', desc: 'Mapa, GPS y multifinca' },
  { id: 'inicio', label: 'Pantalla de inicio', icon: LayoutGrid, tint: 'text-cyan-300', tintBg: 'bg-cyan-900/30 border-cyan-700/40', desc: 'Módulos visibles' },
  { id: 'privacidad', label: 'Privacidad', icon: Shield, tint: 'text-violet-300', tintBg: 'bg-violet-900/30 border-violet-700/40', desc: 'Telemetría y permisos' },
  { id: 'respaldo', label: 'Respaldo', icon: Archive, tint: 'text-orange-300', tintBg: 'bg-orange-900/30 border-orange-700/40', desc: 'Copia de datos y PDF' },
  { id: 'ayuda', label: 'Ayuda', icon: LifeBuoy, tint: 'text-amber-300', tintBg: 'bg-amber-900/30 border-amber-700/40', desc: 'Manual de uso', action: true },
  { id: 'avanzado', label: 'Avanzado', icon: Wrench, tint: 'text-slate-400', tintBg: 'bg-slate-800/60 border-slate-700', desc: 'Modo técnico y más' },
];

const SECTION_LABELS = Object.fromEntries(SECTIONS.map((s) => [s.id, s.label]));

export default function ProfileScreen({ onBack, onHome }) {
  // null = hub (el morral). string = sección enfocada.
  const [section, setSection] = useState(null);

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

  // La foto vive en IndexedDB (localforage) y se hidrata async. El primer
  // render puede pintar el placeholder antes de que responda IndexedDB (o si el
  // espejo síncrono de localStorage quedó vacío por cuota llena). Al resolver la
  // hidratación —o al subir/quitar la foto en otra pestaña— se emite
  // `chagra:operator-update`; re-leemos para reflejarla sin recargar. Mismo
  // patrón que TopBar (misma foto, misma fuente).
  useEffect(() => {
    const refresh = () => setPhotoData(getOperatorPhoto());
    window.addEventListener('chagra:operator-update', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('chagra:operator-update', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

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
      setPhotoError('No pudimos procesar la imagen. Intenta otra.');
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
  // Estado inicial = visibilidad EFECTIVA del home: preferencia MANUAL gana
  // (#1560); si no, el DEFAULT derivado del perfil (homeModuleSelector).
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
  // técnico". Default OFF (hipótesis #4 project-free-7-10-analysis).
  const [modoTecnico, setModoTecnico] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('chagra:profile:modo-tecnico:v1') === '1'
      : false
  );

  useEffect(() => {
    localStorage.setItem('chagra:profile:modo-tecnico:v1', modoTecnico ? '1' : '0');
  }, [modoTecnico]);

  // Visión total del operador (bug demo 2026-06-19): override LOCAL del
  // gating del home sin leakear username (glaciarAccess.setOperatorOverride).
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

  // Estilo de notificación de alertas (operador 2026-06-06): 'demo' o 'actual'.
  const [notifStyle, setNotifStyle] = useState(() => getNotificationStyle());
  const handleNotifStyle = (style) => {
    setNotifStyle(style);
    setNotificationStyle(style);
  };

  // Nivel de respuestas del agente (NUEVO en perfil 2026-07-05; mismo campo
  // `nivel_respuestas` del onboarding y del hero finca viva).
  const [nivelRespuestas, setNivelRespuestas] = useState(() => {
    try {
      const v = getProfile()?.nivel_respuestas;
      return NIVELES_RESPUESTA.some((n) => n.value === v) ? v : 'simple';
    } catch (_) { return 'simple'; }
  });
  const handleNivel = (value) => {
    setNivelRespuestas(value);
    try { saveProfile({ nivel_respuestas: value }); } catch (_) { /* noop */ }
    try {
      window.dispatchEvent(new CustomEvent('chagra:profile-changed', { detail: { nivel_respuestas: value } }));
    } catch (_) { /* noop */ }
  };

  useEffect(() => {
    localStorage.setItem('chagra:voice:telemetry:enabled', telemetryEnabled ? '1' : '0');
  }, [telemetryEnabled]);

  useEffect(() => {
    localStorage.setItem('chagra:voice:telemetry:ttl', telemetryTtl);
  }, [telemetryTtl]);

  // Persistir cambios al storage en cada modificación + emitir custom event
  // (CodeQL #36/#37: CustomEvent same-tab; TopBar escucha 'storage' +
  // 'chagra:operator-update').
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

  // Sincronizar visibilidad de módulos con el perfil y notificar al Home.
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

  // ── Estado vivo para las tarjetas del morral ────────────────────────────
  const { theme } = useTheme();
  const selectableThemes = getSelectableThemes(fincaVivaHomePerfilActivo());
  const themeLabel = selectableThemes.find((t) => t.id === theme)?.label || theme;
  const ttsEnabled = usePrefsStore((s) => s.ttsEnabled);
  // El animal elegido por la persona (Apariencia → "Su animal de la chagra"):
  // sin foto de perfil, la cédula muestra su bicho en vez del ícono genérico.
  const avatarCreature = useAvatarCreature();
  const activeFincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);
  const municipio = (() => {
    try { return getProfileMunicipio(); } catch (_) { return null; }
  })();
  const modulosVisibles = HOME_MODULES.filter((m) => moduleVisibility[m.id] !== false).length;
  const nivelLabel = NIVELES_RESPUESTA.find((n) => n.value === nivelRespuestas)?.label || 'Simple';

  /** Línea de estado vivo por sección (el "resumen sin entrar"). */
  const SECTION_STATUS = {
    datos: currentRoleLabel,
    apariencia: `Tema: ${themeLabel}`,
    agente: `${ttsEnabled ? 'Voz activa' : 'Voz apagada'} · ${nivelLabel}`,
    finca: municipio ? String(municipio).split(',')[0] : activeFincaSlug,
    inicio: `${modulosVisibles} de ${HOME_MODULES.length} módulos`,
    privacidad: telemetryConsent ? 'Métricas anónimas activas' : 'Solo en tu dispositivo',
    respaldo: 'Copia local + PDF',
    ayuda: 'Manual de uso',
    avanzado: modoTecnico || verTodo ? 'Modo técnico activo' : 'Todo normal',
  };

  /** Secciones con "señal encendida" (punto de acento vivo en la tarjeta). */
  const SECTION_LIT = {
    apariencia: true,
    agente: ttsEnabled,
    finca: true,
    inicio: modulosVisibles > 0,
    privacidad: telemetryConsent,
    avanzado: modoTecnico || verTodo,
  };

  const openSection = (id) => {
    if (id === 'ayuda') {
      // Acción directa: el manual vive en su propia pantalla.
      try {
        window.dispatchEvent(new CustomEvent('chagra:nav', { detail: { view: 'ayuda' } }));
      } catch (_) { /* noop */ }
      return;
    }
    setSection(id);
  };

  // Al enfocar una sección, volver el scroll arriba (el shell scrollea el main).
  const panelTopRef = useRef(null);
  useEffect(() => {
    if (section && panelTopRef.current) {
      try { panelTopRef.current.scrollIntoView({ block: 'start' }); } catch (_) { /* noop */ }
    }
  }, [section]);

  return (
    <ScreenShell
      title={section ? SECTION_LABELS[section] : MSG.perfilScreen.tituloPantalla}
      icon={User}
      onBack={section ? () => setSection(null) : onBack}
      onHome={onHome}
    >
      <div ref={panelTopRef} className="flex flex-col gap-5 px-4 pt-4 pb-8" data-testid="profile-hub-root">

        {/* ════════ EL MORRAL (hub) ════════ */}
        {!section && (
          <>
            {/* Cédula de identidad — foto editable (testids intactos), nombre,
                rol y ubicación de la finca. */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center gap-4" data-testid="profile-identity-card">
              <div className="relative shrink-0">
                <div className="w-20 h-20 bg-slate-800 rounded-full overflow-hidden flex items-center justify-center border-2 border-emerald-500/30">
                  {photoData ? (
                    <img
                      src={photoData}
                      alt={`Foto de ${name}`}
                      className="w-full h-full object-cover"
                      data-testid="profile-photo-img"
                    />
                  ) : (
                    <span data-testid="profile-avatar-creature" className="pointer-events-none">
                      <avatarCreature.Component
                        size={56}
                        animated={false}
                        title={`Su animal: ${avatarCreature.nombre}`}
                      />
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoBusy}
                  data-testid="profile-photo-button"
                  className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-60 text-white flex items-center justify-center shadow-lg border-2 border-slate-900"
                  aria-label={photoData ? 'Cambiar foto de perfil' : MSG.perfilScreen.agregarFotoPerfil}
                  title={photoData ? 'Cambiar foto' : MSG.perfilScreen.agregarFoto}
                >
                  <Camera size={16} aria-hidden="true" />
                </button>
                {/* SIN `capture` (operador 2026-06-15): el SO ofrece cámara Y galería. */}
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
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-black text-white leading-tight break-words">{name}</h2>
                <p className="text-[11px] text-emerald-400 uppercase tracking-widest font-bold mt-0.5">{currentRoleLabel}</p>
                {(municipio || activeFincaSlug) && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin size={11} aria-hidden="true" className="shrink-0" />
                    <span className="truncate">
                      {[activeFincaSlug, municipio ? String(municipio).split(',')[0] : null].filter(Boolean).join(' · ')}
                    </span>
                  </p>
                )}
                {photoError && (
                  <p className="text-xs text-amber-400 mt-1" role="alert">{photoError}</p>
                )}
                {photoData && (
                  <button
                    type="button"
                    onClick={handlePhotoRemove}
                    className="tap-target text-xs text-slate-400 hover:text-slate-300 inline-flex items-center gap-1 mt-1"
                  >
                    <Trash2 size={11} aria-hidden="true" /> Quitar foto
                  </button>
                )}
              </div>
            </div>

            {/* Rejilla bento — la tarjeta de Apariencia va ancha con la tira de
                mini-temas (el avance de la galería); el resto en 2 columnas con
                su estado vivo. nav con aria-label para lectores. */}
            <nav aria-label="Secciones del perfil" className="grid grid-cols-2 gap-3">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                const wide = s.id === 'apariencia';
                const lit = Boolean(SECTION_LIT[s.id]);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openSection(s.id)}
                    data-testid={`profile-section-${s.id}`}
                    aria-label={`${s.label}. ${SECTION_STATUS[s.id]}`}
                    className={`text-left rounded-2xl border bg-slate-900/50 border-slate-800 hover:border-slate-600 hover:bg-slate-900/70 active:scale-[0.98] motion-reduce:active:scale-100 transition-all p-4 min-h-[92px] flex flex-col ${wide ? 'col-span-2' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${s.tintBg}`}>
                        <Icon size={18} className={s.tint} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-white leading-tight">{s.label}</span>
                        <span className="block text-xs text-slate-400 leading-snug mt-0.5">{s.desc}</span>
                      </span>
                      <ChevronRight size={16} className="text-slate-600 shrink-0 mt-1" aria-hidden="true" />
                    </div>

                    {/* Tira de mini-temas SOLO en la tarjeta ancha de Apariencia:
                        el usuario ve las pieles disponibles desde la portada.
                        Cada swatch es un render VIVO del tema (ThemeLivePreview,
                        tokens reales) — no un dibujo con paleta hard-codeada. */}
                    {wide && (
                      <span className="flex gap-2 mt-3" aria-hidden="true">
                        {selectableThemes.filter((t) => t.id !== 'auto').map((t) => {
                          const isActive = theme === t.id;
                          return (
                            <span
                              key={t.id}
                              className={`block w-12 h-16 rounded-lg overflow-hidden border-2 ${
                                isActive ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.45)]' : 'border-slate-700/70'
                              }`}
                            >
                              <ThemeLivePreview themeId={t.id} />
                            </span>
                          );
                        })}
                      </span>
                    )}

                    <span className={`mt-auto pt-2 flex items-center gap-1.5 text-[11px] font-semibold ${lit ? 'text-emerald-400' : 'text-slate-400'}`}>
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${lit ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-slate-600'}`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{SECTION_STATUS[s.id]}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </>
        )}

        {/* ════════ SECCIONES ENFOCADAS ════════ */}
        {section && (
          <button
            type="button"
            onClick={() => setSection(null)}
            data-testid="profile-back-to-hub"
            className="self-start inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400 hover:text-emerald-300 rounded-lg px-2 py-1.5 -ml-2 min-h-[44px]"
          >
            <ChevronLeft size={18} aria-hidden="true" /> Mi perfil
          </button>
        )}

        {/* ── MIS DATOS ─────────────────────────────────────────────── */}
        {section === 'datos' && (
          <div className="flex flex-col gap-6" data-testid="profile-panel-datos">
            {/* Selector de PERFIL activo (tarea #33): campesino / cafetero /
                cacaotero / corporativo — afecta chips, módulos y asociaciones. */}
            <ProfileSwitcher />

            {/* Edit Form (feedback piloto #120: editable con persistencia) */}
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
                {savedFlash ? <><Check size={18} /> Guardado</> : <><Save size={18} /> {MSG.perfilScreen.guardarCambios}</>}
              </button>
              <p className="text-xs text-slate-400 text-center leading-relaxed">
                El nombre y el rol se guardan en tu dispositivo. Tu foto de perfil
                se sincroniza con el servidor para verla en otros dispositivos.
              </p>
            </div>
          </div>
        )}

        {/* ── APARIENCIA ────────────────────────────────────────────── */}
        {section === 'apariencia' && (
          <div className="space-y-5" data-testid="profile-panel-apariencia">
            {/* GALERÍA DE TEMAS con previsualización (pedido explícito del
                operador 2026-07-05): mini-teléfonos que muestran cada tema
                antes de aplicarlo. */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Palette size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Tema de la app</h3>
              </div>
              <p className="text-xs text-slate-400 leading-snug px-1">
                Cada tarjeta muestra cómo se verá Chagra con ese tema. Toca una
                para aplicarla al instante — puedes devolverte cuando quieras.
              </p>
              <ThemeSelector />
            </div>

            <BackgroundSelector />
            {/* El animal del USUARIO (avatar propio, registro de creatures) —
                distinto del avatar del agente IA de abajo. */}
            <AvatarSelector />
            <AgentAvatarSelector />

            {/* Estilo de notificación (operador 2026-06-06 + 2026-06-11):
                decide CUÁL campana única se muestra. */}
            <div className="space-y-3 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 px-1">
                <Bell size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Botón de avisos</h3>
              </div>
              <p className="text-xs text-slate-400 leading-snug px-1">
                Elige cuál campana te muestra los avisos (alertas, tareas y sincronización). Solo se muestra una.
              </p>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Estilo de avisos">
                {[
                  { id: 'demo', label: 'Campana de la portada', desc: 'Vive en la portada del agente, con aviso destacado de clima' },
                  { id: 'actual', label: 'Campana clásica', desc: 'El ícono de arriba, con notificaciones y clima' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={notifStyle === opt.id}
                    onClick={() => handleNotifStyle(opt.id)}
                    className={`text-left rounded-2xl p-4 border transition-colors min-h-[64px] ${
                      notifStyle === opt.id
                        ? 'bg-emerald-900/30 border-emerald-600/60'
                        : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800/70'
                    }`}
                  >
                    <p className="text-sm font-bold text-white">{opt.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-snug">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MI AGENTE ─────────────────────────────────────────────── */}
        {section === 'agente' && (
          <div className="flex flex-col gap-6" data-testid="profile-panel-agente">
            {/* Nivel de respuestas — el control COMPLETO de los 3 modos (antes
                regado entre onboarding y el switch parcial del hero). */}
            <div className="space-y-3 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 px-1">
                <GraduationCap size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Cómo le responde el agente</h3>
              </div>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Nivel de respuestas del agente">
                {NIVELES_RESPUESTA.map((n) => {
                  const active = nivelRespuestas === n.value;
                  return (
                    <button
                      key={n.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      data-testid={`nivel-respuestas-${n.value}`}
                      onClick={() => handleNivel(n.value)}
                      className={`text-left rounded-2xl p-4 border transition-colors min-h-[56px] flex items-center gap-3 ${
                        active
                          ? 'bg-emerald-900/30 border-emerald-600/60'
                          : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800/70'
                      }`}
                    >
                      <span className="flex-1">
                        <span className="block text-sm font-bold text-white">{n.label}</span>
                        <span className="block text-xs text-slate-400 mt-0.5 leading-snug">{n.desc}</span>
                      </span>
                      {active && <Check size={18} className="text-emerald-400 shrink-0" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* #200: CTA para personalizar el agente (onboarding-perfil).
                Navega vía 'chagra:nav' (patrón CSP-safe). */}
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

            {/* Task #122: toggle global TTS del agente. */}
            <AgentVoiceSection />

            {/* Task #124: selector de voz Kokoro + velocidad. Siempre visible
                (UX predictible aunque TTS esté apagado). */}
            <VoiceSelector />

            {/* Modo campo / manos libres (#2088): wake-word "hola chagra" vía
                TF.js speech-commands, on-device. Shippeado "dark" — solo
                aparece con VITE_MODO_CAMPO=true (dev/piloto), ver
                src/config/modoCampoFlag.js. Vive junto a los ajustes de voz. */}
            {modoCampoDisponible() && <ModoCampoPanel />}

            {/* DR-3D-HAPTICA: vibración táctil de los mundos 3D (tri-estado). */}
            <HapticsSection />

            {/* Spec S3: sonido ambiental 0-KB de los mundos (tri-estado). */}
            <SonidoSection />

            {/* FASE 0 game-dev: la entrada 3D del valle desde el home (flag). */}
            <Valle3DSection />
          </div>
        )}

        {/* ── FINCA Y UBICACIÓN ─────────────────────────────────────── */}
        {section === 'finca' && (
          <div className="flex flex-col gap-6" data-testid="profile-panel-finca">
            {/* #201: CTA configurar ubicación (mapa / piso térmico). */}
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
                <p className="text-xs text-slate-400">{MSG.perfilScreen.ubicacionDesc}</p>
              </div>
              <ChevronRight size={18} className="text-slate-500" />
            </button>

            {/* Multifinca + GPS (062.7 indoor override + 062.8 privacy) */}
            <MultifincaGpsSection />
          </div>
        )}

        {/* ── PANTALLA DE INICIO (módulos #7003) ────────────────────── */}
        {section === 'inicio' && (
          <div className="flex flex-col gap-6" data-testid="profile-panel-inicio">
            <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 px-1">
                <LayoutGrid size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Módulos del Home</h3>
              </div>

              <p className="text-xs text-slate-400 leading-snug px-1">
                Elige qué módulos quieres ver en tu pantalla de inicio. Puedes ocultar
                los que no usas para tener una vista más limpia. Todos los módulos están
                activados por defecto.
              </p>

              {(() => {
                const grouped = {};
                for (const module of HOME_MODULES) {
                  if (!grouped[module.category]) {
                    grouped[module.category] = [];
                  }
                  grouped[module.category].push(module);
                }
                return Object.entries(grouped).map(([category, modules]) => (
                  <div key={category} className="mt-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">
                      {category}
                    </p>
                    <div className="space-y-2">
                      {modules.map((module) => (
                        <label
                          key={module.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 cursor-pointer min-h-[48px] hover:bg-slate-800/70 transition-colors"
                        >
                          <div className="flex flex-col gap-0.5 flex-1">
                            <span className="text-sm font-bold text-slate-200">{module.label}</span>
                            <span className="text-xs text-slate-400 leading-snug">{module.description}</span>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={moduleVisibility[module.id] !== false}
                            aria-label={`Mostrar u ocultar ${module.label}`}
                            onClick={() => setModuleVisibilityState((prev) => ({
                              ...prev,
                              [module.id]: prev[module.id] === false ? true : false,
                            }))}
                            className={`tap-target relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                              moduleVisibility[module.id] !== false ? 'bg-emerald-600' : 'bg-slate-700'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                                moduleVisibility[module.id] !== false ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </label>
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
                  className="w-full p-3 rounded-xl bg-slate-800/50 hover:bg-slate-700/60 transition-colors text-center"
                >
                  <span className="text-sm font-bold text-slate-300">Restaurar todos los módulos</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PRIVACIDAD ────────────────────────────────────────────── */}
        {section === 'privacidad' && (
          <div className="flex flex-col gap-6" data-testid="profile-panel-privacidad">
            {/* Telemetría de voz LOCAL (solo en el dispositivo). */}
            <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 px-1">
                <Mic size={18} className="text-morpho" />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Telemetría de Voz</h3>
              </div>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 cursor-pointer min-h-[48px]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-slate-200">Habilitar telemetría</span>
                  <span className="text-xs text-slate-400">{MSG.perfilScreen.telemetriaVozDesc}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={telemetryEnabled}
                  onClick={() => setTelemetryEnabled((v) => !v)}
                  className={`tap-target relative w-12 h-7 rounded-full transition-colors shrink-0 ${
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

              <p className="text-xs text-slate-400 px-1 leading-relaxed">
                La telemetría sigue grabándose en el dispositivo (privacy-safe, NUNCA prompt ni respuesta).
                El dashboard de visualización se migró al panel privado del operador (ADR-020 anti-leak / ADR-029 Capa C).
              </p>
            </div>

            {/* Tarea #8 — Consentimiento de envío de telemetría al servidor.
                Default OFF (privacidad). SOLO metadatos anónimos. */}
            <div className="space-y-3 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 px-1">
                <Shield size={18} className="text-morpho" />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Compartir telemetría del agente</h3>
              </div>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 cursor-pointer min-h-[48px]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-slate-200">Enviar métricas anónimas</span>
                  <span className="text-xs text-slate-400">{MSG.perfilScreen.telemetriaAgenteDesc}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={telemetryConsent}
                  aria-label="Enviar métricas anónimas del agente"
                  data-testid="telemetry-consent-toggle"
                  onClick={() => {
                    const next = !telemetryConsent;
                    setTelemetryConsent(next);
                    setTelemetryConsentState(next);
                  }}
                  className={`tap-target relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                    telemetryConsent ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      telemetryConsent ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>

              <p className="text-xs text-slate-400 px-1 leading-relaxed">
                Si lo activas, se envían al servidor métricas agregadas de tus consultas (modelo usado, tipo de
                consulta, tiempos de respuesta y conteo de tokens). Nunca se envían el texto de tus preguntas ni
                las respuestas, ni tu ubicación. Puedes desactivarlo cuando quieras.
              </p>
            </div>
          </div>
        )}

        {/* ── COPIA Y CUADERNO ──────────────────────────────────────── */}
        {section === 'respaldo' && (
          <div className="flex flex-col gap-6" data-testid="profile-panel-respaldo">
            {/* Copia de seguridad (2026-05-19: operador perdió datos por un
                "Clear cache"). Botón prominente de snapshot JSON. */}
            <BackupExportButton />

            {/* Cuaderno de campo PDF (FEAT-D #295): diferenciador agronómico
                para SNIA / EPSEA / certificación orgánica. */}
            <CuadernoPDFButton />
          </div>
        )}

        {/* ── AVANZADO ──────────────────────────────────────────────── */}
        {section === 'avanzado' && (
          <div className="flex flex-col gap-6" data-testid="profile-panel-avanzado">
            {/* Modo técnico (Free 7→10 fix-pack, hipótesis #4): HYTA detrás
                de un switch off-by-default. */}
            <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 px-1">
                <Wrench size={18} className="text-slate-400" />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Modo técnico</h3>
              </div>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 cursor-pointer min-h-[48px]">
                <div className="flex flex-col gap-0.5 flex-1">
                  <span className="text-sm font-bold text-slate-200">Mostrar información GPU</span>
                  <span className="text-xs text-slate-400 leading-snug">
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
                  className={`tap-target relative w-12 h-7 rounded-full transition-colors shrink-0 ${
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

            {/* Visión total del operador (bug demo 2026-06-19): bypass del
                gating del home. Bandera booleana local, NO leakea identidad. */}
            <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 px-1">
                <Wrench size={18} className="text-amber-400" />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Visión total (operador)</h3>
              </div>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 cursor-pointer min-h-[48px]">
                <div className="flex flex-col gap-0.5 flex-1">
                  <span className="text-sm font-bold text-slate-200">Mostrar todas las capacidades</span>
                  <span className="text-xs text-slate-400 leading-snug">
                    Activa todos los módulos, tarjetas de seguimiento y opciones del
                    home, saltándose el filtrado por perfil. Útil para demos y para
                    el administrador del producto.
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={verTodo}
                  aria-label="Activar o desactivar la visión total del operador"
                  data-testid="operator-override-toggle"
                  onClick={handleVerTodo}
                  className={`tap-target relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                    verTodo ? 'bg-amber-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      verTodo ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </div>

            {/* Modo extensionista (ADR-048 MVP): SOLO se renderiza si el
                usuario tiene el rol (flag + whitelist). */}
            {esExtensionistaActual() && (
              <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 px-1">
                  <Users size={18} className="text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Acompañamiento</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('chagra:nav', { detail: { view: 'extensionista' } }));
                  }}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-700/60 transition-colors min-h-[48px] text-left cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className="text-sm font-bold text-slate-200">Fincas que acompaño</span>
                    <span className="text-xs text-slate-400 leading-snug">
                      Panel del extensionista: revisa el estado de las fincas que
                      supervisas. Vista previa con datos de ejemplo.
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 shrink-0" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* App Info Footer — común a hub y secciones */}
        <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
          <p className="text-[11px] text-slate-500 font-mono tracking-tighter uppercase">
            Chagra • v1.0.0
          </p>
          <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] mx-auto leading-tight">
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
 * `chagra:prefs:tts-enabled`). Al desactivar, stop() inmediato del
 * ttsService. Equivalente al doble-click del avatar colibrí.
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
          <span className="text-xs text-slate-400 leading-snug">
            Cuando está activa, Chagra IA lee en voz alta sus respuestas con una
            sola voz natural. Doble click en el avatar colibrí silencia o
            reactiva sin abrir esta pantalla.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={ttsEnabled}
          aria-label="Activar o silenciar la voz del agente"
          onClick={handleToggle}
          className={`tap-target relative w-12 h-7 rounded-full transition-colors shrink-0 ${
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
 * HapticsSection — DR-3D-HAPTICA (2026-07-11).
 *
 * Toggle tri-estado "Vibración" persistido en usePrefsStore (key
 * `chagra:prefs:haptics`). Controla los pulsos táctiles del framework de
 * mundos 3D (tap en hotspot, la abeja posándose, viajes valle↔mundo):
 *   - Automática (default): vibra si el equipo lo soporta y no hay
 *     preferencia de movimiento reducido en el sistema.
 *   - Siempre: vibra aunque haya movimiento reducido (respeta al usuario
 *     que SÍ quiere el feedback táctil).
 *   - Nunca: apagado total.
 * En equipos sin API de vibración (iPhone/iPad, Firefox) no hay pérdida:
 * cada pulso solo acompaña un momento que ya es visible en pantalla.
 */
const HAPTICS_OPTIONS = [
  { id: 'auto', label: 'Automática' },
  { id: 'on', label: 'Siempre' },
  { id: 'off', label: 'Nunca' },
];

function HapticsSection() {
  const haptics = usePrefsStore((s) => s.haptics ?? 'auto');
  const setHaptics = usePrefsStore((s) => s.setHaptics);
  const soportada = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  return (
    <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 px-1">
        <Vibrate size={18} className="text-amber-400" />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Vibración</h3>
      </div>

      <p className="text-xs text-slate-400 leading-snug px-1">
        Pulsos táctiles sutiles al explorar los mundos 3D de la finca: tocar un
        punto de interés, la abeja posándose, entrar y volver de un mundo.
      </p>

      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Vibración de los mundos 3D">
        {HAPTICS_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={haptics === opt.id}
            onClick={() => setHaptics(opt.id)}
            className={`tap-target px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
              haptics === opt.id
                ? 'bg-amber-600/80 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {!soportada && (
        <p className="text-[11px] text-slate-500 leading-snug px-1">
          Este equipo no admite vibración desde el navegador (por ejemplo,
          iPhone o iPad). No se pierde información: cada pulso solo acompaña
          algo que ya se ve en pantalla.
        </p>
      )}
    </div>
  );
}

/**
 * SonidoSection — spec S3 (2026-07-11).
 *
 * Toggle tri-estado "Sonido de la finca" persistido en usePrefsStore (key
 * `chagra:prefs:sonido`). Controla el ambiente sonoro 0-KB de los mundos
 * (sintetizado con WebAudio, sin descargar un solo archivo):
 *   - Apagado (default): silencio total — el sonido es opt-in.
 *   - Suave: ambiente muy tenue (la brisa apenas se insinúa).
 *   - Presente: ambiente audible, igual bajo y cálido (fondo, no pista).
 * Arranca solo tras un toque (política de autoplay) y respeta la preferencia
 * de movimiento reducido del sistema (fondo estático, sin eventos rítmicos).
 */
const SONIDO_OPTIONS = [
  { id: 'off', label: 'Apagado' },
  { id: 'suave', label: 'Suave' },
  { id: 'on', label: 'Presente' },
];

function SonidoSection() {
  const sonido = usePrefsStore((s) => s.sonido ?? 'off');
  const setSonido = usePrefsStore((s) => s.setSonido);
  const soportado = typeof window !== 'undefined'
    && Boolean(window.AudioContext || window.webkitAudioContext);

  return (
    <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 px-1">
        <Waves size={18} className="text-emerald-400" />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Sonido de la finca</h3>
      </div>

      <p className="text-xs text-slate-400 leading-snug px-1">
        Un ambiente sutil al recorrer los mundos: la quebrada y sus gotas, el
        viento del páramo, las aves del monte, el murmullo del mercado. Se
        genera en su equipo, sin gastar datos.
      </p>

      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Sonido ambiental de los mundos">
        {SONIDO_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={sonido === opt.id}
            onClick={() => setSonido(opt.id)}
            className={`tap-target px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
              sonido === opt.id
                ? 'bg-emerald-600/80 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {!soportado && (
        <p className="text-[11px] text-slate-500 leading-snug px-1">
          Este navegador no admite audio generado. No se pierde información:
          el sonido solo acompaña lo que ya se ve en pantalla.
        </p>
      )}
    </div>
  );
}

/**
 * Valle3DSection — FASE 0 del plan game-dev 3D (2026-07-11).
 *
 * Toggle "El valle en 3D" persistido en usePrefsStore (key
 * `chagra:prefs:valle3d`, default OFF — conservador). Al prenderlo aparece en
 * el home ("Los mundos de su finca") la banda que abre el VALLE 3D real: el
 * mapa navegable de la finca donde cada mundo es un lugar al que se viaja.
 * Doble gate: además del flag, el device-tier (deviceTier.js) decide — en
 * equipos humildes la banda no aparece y el home 2D sigue idéntico. Acá se
 * le dice honesto al usuario qué verá su equipo.
 */
function Valle3DSection() {
  const valle3d = usePrefsStore((s) => s.valle3d ?? false);
  const setValle3d = usePrefsStore((s) => s.setValle3d);
  // El tiering se evalúa una vez al montar la pantalla (crea un canvas WebGL
  // de prueba; barato acá, no en cada home).
  const [equipo] = useState(() => decidirTier());
  const equipoAguanta = permite3D(equipo.tier);

  return (
    <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 px-1">
        <Mountain size={18} className="text-yellow-400" />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">El valle en 3D</h3>
      </div>

      <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 cursor-pointer min-h-[48px]">
        <div className="flex flex-col gap-0.5 flex-1">
          <span className="text-sm font-bold text-slate-200">Entrada al valle 3D en el home</span>
          <span className="text-xs text-slate-400 leading-snug">
            Recorra su finca como un valle en tres dimensiones: cada mundo es
            un lugar al que se viaja. Al activarla, la entrada aparece en
            &quot;Los mundos de su finca&quot;. Es una experiencia nueva: si
            algo no le funciona, apáguela y el home queda como siempre.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={valle3d}
          aria-label="Activar o desactivar la entrada al valle 3D"
          data-testid="valle3d-toggle"
          onClick={() => setValle3d(!valle3d)}
          className={`tap-target relative w-12 h-7 rounded-full transition-colors shrink-0 ${
            valle3d ? 'bg-yellow-600' : 'bg-slate-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
              valle3d ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </label>

      {!equipoAguanta && (
        <p className="text-[11px] text-slate-500 leading-snug px-1">
          Este equipo no alcanza para el 3D con fluidez, así que la entrada no
          se mostrará en el home aunque active la opción. No se pierde nada:
          todos los mundos siguen completos en su versión de siempre.
        </p>
      )}
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
        {MSG.perfilScreen.fincaActivaLabel} <strong className="text-slate-300">{activeFincaSlug}</strong>.
        {' '}Cámbiala en el banner GPS o el selector de fincas.
      </p>

      {/* 062.3 / 062.7: si gpsOverride activo, ofrecer volver a auto-detect */}
      {gpsOverride && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-900/20 border border-amber-700/40">
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-sm font-bold text-amber-200">Modo manual activo</span>
            <span className="text-xs text-amber-200/90">
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
        <span className="text-xs text-slate-400 leading-relaxed">
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
            {MSG.perfilScreen.guardar}
          </button>
        </div>
        {indoorZone && (
          <p className="text-xs text-emerald-400">
            Activo: <strong>{indoorZone}</strong>
          </p>
        )}
      </label>

      {/* 062.8: privacy opt-in GPS history */}
      <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 cursor-pointer min-h-[48px]">
        <div className="flex flex-col gap-0.5 flex-1">
          <span className="text-sm font-bold text-slate-200">Sincronizar histórico GPS</span>
          <span className="text-xs text-slate-400 leading-snug">
            Off por default. Cuando activo, Chagra envía tu ubicación al server
            para análisis multifinca. Off = solo lookup local sin persistencia.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={gpsHistoryEnabled}
          onClick={() => setGpsHistoryEnabled(!gpsHistoryEnabled)}
          className={`tap-target relative w-12 h-7 rounded-full transition-colors shrink-0 ${
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
