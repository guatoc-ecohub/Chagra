import React, { useState } from 'react';
import { Camera, Mic, Pencil, MapPin, Check } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import { getContextoGeoFinca } from '../services/perfilFincaService';
import { getProfile, saveProfile } from '../services/userProfileService';
import { getPisoTermicoInfo } from '../services/locationService';
import { useAutosave } from '../hooks/useAutosave';
import { MSG } from '../config/messages.js';

/**
 * OnboardingHero, empty-state cold-start del dashboard (DR-030 QW5).
 *
 * Se renderiza cuando plantsCount === 0 (sin plantas registradas localmente).
 * Reemplaza la telemetría densa de TelemetryAlerts (que sin sensores cableados
 * y sin contexto agronómico es ruido informacional para usuario 0-contexto).
 *
 * 3 CTA hero, equivalentes en peso visual, mapean a las 3 modalidades de
 * captura disponibles. La foto va primero por convención camera-first
 * (Pl@ntNet/Seek), pero las 3 son first-class, el usuario elige sin
 * jerarquía impuesta.
 *
 * Adaptive (Autopilot 2026-05-06): el copy del header se ajusta al contexto
 * detectado del operador para reducir ambigüedad cold-start:
 *   - Sin zonas creadas Y sin contexto de finca → "primera vez en Chagra"
 *   - Con zonas pero sin plantas → "ya tienes zonas listas, falta la primera planta"
 *   - Sin zonas pero con contexto de finca → "tu finca está configurada"
 *
 * Piso térmico primero (feat/onboarding-ayuda): la altitud es el FILTRO
 * MAESTRO de todos los módulos (suelo/agua/animal/restauración/clima).
 * Si el perfil no la tiene, el hero antepone el "Paso 1: ubicar la finca"
 * (→ LocationDetectedScreen, que ya resuelve GPS + municipio + montaña de
 * pisos térmicos). Si ya hay altitud pero no está confirmada, muestra la
 * confirmación visual llana ("clima Frío, ~2200 m — ¿correcto?").
 *
 * Refs: deepresearch/chagra-ux/decisions/ux-clarity-2026-05.md
 */
/**
 * @param {object}   props
 * @param {Function} props.onNavigate
 * @param {boolean} [props.compact] - Variante banner: solo el paso "piso
 *   térmico" (CTA o confirmación), SIN el título ni las 3 rutas de registro.
 *   Se usa above-the-fold en DashboardLive para no empujar el AgentHero fuera
 *   del viewport (regresión 2026-06-13): el agente debe seguir alcanzable
 *   mientras el primer uso captura el piso. Las 3 rutas viven en el hero
 *   completo bajo el fold.
 */
export default function OnboardingHero({ onNavigate, compact = false }) {
  const lands = useAssetStore((s) => s.lands);
  const hasZones = lands.length > 0;
  const geoFinca = getContextoGeoFinca();
  const hasFarmContext = !!(geoFinca.altitudMsnm || geoFinca.thermalZones.length > 0);

  const { savedState: obState, save: obSave } = useAutosave('onboarding-hero', { lastCta: null, pisoConfirmed: false });
  const [profile] = useState(() => getProfile());
  const [pisoConfirmado, setPisoConfirmado] = useState(() => obState.pisoConfirmed || profile.piso_confirmado === '1');
  const altitud = Number(profile.finca_altitud);
  const pisoInfo = Number.isFinite(altitud) && profile.finca_altitud !== '' && profile.finca_altitud != null
    ? getPisoTermicoInfo(altitud)
    : null;
  const needsLocation = !pisoInfo;

  const confirmPiso = () => {
    saveProfile({ piso_confirmado: '1', ...(pisoInfo ? { piso_termico: pisoInfo.slug } : {}) });
    setPisoConfirmado(true);
    obSave({ pisoConfirmed: true });
  };
  const navAuto = (route) => { obSave({ lastCta: route }); onNavigate(route); };

  // Copy adaptive según señales detectadas del operador.
  // Tono "usted" cordial colombiano (memoria feedback_colombian_tone).
  let title;
  let subtitle;
  if (hasZones) {
    title = MSG.onboarding.zonasListas(lands.length);
    subtitle = MSG.onboarding.elegirRegistro;
  } else if (hasFarmContext) {
    title = MSG.onboarding.fincaConfigurada;
    subtitle = MSG.onboarding.tipZonas;
  } else {
    title = MSG.onboarding.primeraPlanta;
    subtitle = MSG.onboarding.elegirRegistro;
  }

  const ctas = [
    {
      id: 'plant_asset',
      icon: Camera,
      emoji: '📸',
      label: 'Foto',
      desc: 'Tomar foto de una planta',
      accent: 'border-purple-500 active:bg-purple-900/30 text-purple-300',
    },
    {
      id: 'voz',
      icon: Mic,
      emoji: '🎤',
      label: 'Voz',
      desc: 'Dictar registro',
      accent: 'border-lime-500 active:bg-lime-900/30 text-lime-300',
    },
    {
      id: 'sembrar',
      icon: Pencil,
      emoji: '✍',
      label: 'Escribir',
      desc: 'Formulario manual',
      accent: 'border-emerald-500 active:bg-emerald-900/30 text-emerald-300',
    },
  ];

  // Bloques del "Paso 1: piso térmico". Se reúsan en el banner compacto
  // (above-the-fold) y en el hero completo (bajo el fold).
  const pisoCardClass = compact
    ? 'onboarding-piso-card onboarding-piso-card-compact'
    : 'onboarding-piso-card';

  const pisoStep = (
    <>
      {/* ── Paso 1: piso térmico (filtro maestro de TODOS los módulos) ── */}
      {needsLocation && (
        <div
          data-testid="onboarding-piso-cta"
          className={pisoCardClass}
        >
          <div className="flex items-start gap-3">
            <span className="onboarding-piso-pin" aria-hidden="true">📍</span>
            <div className="min-w-0 flex-1">
              <p className="onboarding-piso-title">
                Primero: ¿dónde está su finca?
              </p>
              <p className="onboarding-piso-copy">
                Con la altura de su tierra sabemos si su clima es
                {' '}<span aria-hidden="true">🌴</span> caliente,
                {' '}<span aria-hidden="true">🌤️</span> templado o
                {' '}<span aria-hidden="true">⛅</span> frío, y todos los
                consejos le salen acertados.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('ubicacion-detectada')}
            className="onboarding-piso-primary"
          >
            <MapPin size={22} aria-hidden="true" /> Ubicar mi finca
          </button>
          <button
            type="button"
            onClick={() => onNavigate('onboarding-perfil')}
            className="onboarding-piso-secondary"
          >
            Prefiero contarle de mi finca con preguntas
          </button>
        </div>
      )}

      {/* Confirmación visual del piso detectado — un solo toque. */}
      {!needsLocation && !pisoConfirmado && (
        <div
          data-testid="onboarding-piso-confirm"
          className="rounded-xl bg-slate-950 border-2 border-emerald-600/60 p-4 flex flex-col gap-3"
        >
          <div className="flex items-start gap-3">
            <span className="text-4xl shrink-0" aria-hidden="true">{pisoInfo.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-black text-white leading-tight">
                Su finca está en clima {pisoInfo.label.toLowerCase()}, a unos {Math.round(altitud)} m de altura.
              </p>
              <p className="text-sm text-slate-400 mt-1">¿Es correcto?</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={confirmPiso}
              className="min-h-[52px] rounded-xl bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-black flex items-center justify-center gap-2 transition-colors"
            >
              <Check size={20} aria-hidden="true" /> Sí, es correcto
            </button>
            <button
              type="button"
              onClick={() => onNavigate('ubicacion-detectada')}
              className="min-h-[52px] rounded-xl bg-slate-900 border border-slate-600 hover:border-slate-500 text-slate-200 font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Pencil size={18} aria-hidden="true" /> Corregir
            </button>
          </div>
        </div>
      )}
    </>
  );

  // Banner compacto (above-the-fold): SOLO el paso del piso, sin chrome ni las
  // 3 rutas grandes. Mantiene el primer uso "piso primero" sin desplazar el
  // AgentHero fuera del viewport. Si el piso ya está confirmado, no renderiza
  // nada (DashboardLive deja de montarlo, pero por las dudas devolvemos null).
  if (compact) {
    if (!needsLocation && pisoConfirmado) return null;
    return (
      <section
        aria-label="Primer paso: ubicar su finca"
        className="w-full flex flex-col gap-3"
      >
        {pisoStep}
      </section>
    );
  }

  return (
    <section
      aria-label="Comenzar a registrar plantas"
      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-white">
          {title}
        </h2>
        <p className="text-sm text-slate-400">
          {subtitle}
        </p>
      </div>

      {pisoStep}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ctas.map((cta) => (
          <button
            key={cta.id}
            type="button"
            onClick={() => navAuto(cta.id)}
            aria-label={`${cta.label}: ${cta.desc}`}
            className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-slate-950 border-2 ${cta.accent} min-h-[140px] transition-colors`}
          >
            <span className="text-4xl" aria-hidden="true">
              {cta.emoji}
            </span>
            <span className="text-2xl font-black">{cta.label}</span>
            <span className="text-xs text-slate-400">{cta.desc}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
