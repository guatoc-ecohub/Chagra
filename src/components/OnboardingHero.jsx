import React from 'react';
import { Camera, Mic, Pencil } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import { FARM_CONFIG } from '../config/defaults';

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
 *   - Sin zonas creadas Y sin FARM_CONFIG → "primera vez en Chagra"
 *   - Con zonas pero sin plantas → "ya tenés zonas listas, falta la primera planta"
 *   - Sin zonas pero con FARM_CONFIG → "tu finca está configurada"
 *
 * Refs: deepresearch/chagra-ux/decisions/ux-clarity-2026-05.md
 */
export default function OnboardingHero({ onNavigate }) {
  const lands = useAssetStore((s) => s.lands);
  const hasZones = lands.length > 0;
  const hasFarmContext = !!(FARM_CONFIG.ALTITUD_MSNM || (FARM_CONFIG.THERMAL_ZONES || []).length > 0);

  // Copy adaptive según señales detectadas del operador.
  // Tono "usted" cordial colombiano (memoria feedback_colombian_tone).
  let title;
  let subtitle;
  if (hasZones) {
    title = `Tiene ${lands.length} ${lands.length === 1 ? 'zona' : 'zonas'} lista${lands.length === 1 ? '' : 's'}. Falta su primera planta.`;
    subtitle = 'Elija cómo registrarla. Las tres rutas guardan lo mismo.';
  } else if (hasFarmContext) {
    title = 'Su finca está configurada. Sembremos la primera planta.';
    subtitle = 'Tip: tras la primera, puede crear zonas (parcelas, camas) para organizarlas.';
  } else {
    title = 'Bienvenido a Chagra. Empiece registrando su primera planta.';
    subtitle = 'Elija cómo registrarla. Las tres rutas guardan lo mismo.';
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ctas.map((cta) => (
          <button
            key={cta.id}
            type="button"
            onClick={() => onNavigate(cta.id)}
            aria-label={`${cta.label}: ${cta.desc}`}
            className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-slate-950 border-2 ${cta.accent} min-h-[140px] transition-colors`}
          >
            <span className="text-4xl" aria-hidden="true">
              {cta.emoji}
            </span>
            <span className="text-2xl font-black">{cta.label}</span>
            <span className="text-xs text-slate-500">{cta.desc}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
