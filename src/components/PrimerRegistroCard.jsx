import React from 'react';
import { Camera, MapPin, Mic, Pencil } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import { getContextoGeoFinca } from '../services/perfilFincaService';
import { useAutosave } from '../hooks/useAutosave';
import { MSG } from '../config/messages.js';

/**
 * Estado vacío del dashboard para orientar el primer registro.
 *
 * La configuración inicial pertenece exclusivamente a OnboardingCondensado.
 * Este componente conserva las tres entradas operativas para registrar una
 * planta que antes estaban mezcladas dentro de OnboardingHero.
 */
export default function PrimerRegistroCard({ onNavigate, compact = false }) {
  const lands = useAssetStore((state) => state.lands);
  const geoFinca = getContextoGeoFinca();
  const { save } = useAutosave('primer-registro', { lastCta: null });

  const navegar = (route) => {
    save({ lastCta: route });
    onNavigate(route);
  };

  if (compact) {
    return (
      <section
        aria-label="Configure su finca"
        className="onboarding-piso-card onboarding-piso-card-compact"
        data-testid="primer-registro-configurar"
      >
        <div className="flex items-start gap-3">
          <MapPin size={28} className="shrink-0 text-emerald-300" aria-hidden="true" />
          <div>
            <p className="onboarding-piso-title">Primero, cuéntenos de su finca</p>
            <p className="onboarding-piso-copy">
              En un solo recorrido guardamos su ubicación, escala, invernadero y agua.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navegar('onboarding-perfil')}
          className="onboarding-piso-primary"
        >
          <MapPin size={22} aria-hidden="true" /> Configurar mi finca
        </button>
      </section>
    );
  }

  const hasZones = lands.length > 0;
  const hasFarmContext = Boolean(
    geoFinca.altitudMsnm || geoFinca.thermalZones.length > 0,
  );
  const title = hasZones
    ? MSG.onboarding.zonasListas(lands.length)
    : hasFarmContext
      ? MSG.onboarding.fincaConfigurada
      : MSG.onboarding.primeraPlanta;
  const subtitle = hasFarmContext && !hasZones
    ? MSG.onboarding.tipZonas
    : MSG.onboarding.elegirRegistro;
  const actions = [
    {
      id: 'plant_asset',
      Icon: Camera,
      label: 'Foto',
      description: 'Tomar foto de una planta',
      className: 'border-purple-500 active:bg-purple-900/30 text-purple-300',
    },
    {
      id: 'voz',
      Icon: Mic,
      label: 'Voz',
      description: 'Dictar registro',
      className: 'border-lime-500 active:bg-lime-900/30 text-lime-300',
    },
    {
      id: 'sembrar',
      Icon: Pencil,
      label: 'Escribir',
      description: 'Formulario manual',
      className: 'border-emerald-500 active:bg-emerald-900/30 text-emerald-300',
    },
  ];

  return (
    <section
      aria-label="Comenzar a registrar plantas"
      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col gap-4"
      data-testid="primer-registro-card"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map(({ id, Icon, label, description, className }) => (
          <button
            key={id}
            type="button"
            onClick={() => navegar(id)}
            className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-slate-950 border-2 ${className} min-h-[140px] transition-colors`}
          >
            {React.createElement(Icon, { size: 34, 'aria-hidden': true })}
            <span className="text-2xl font-black">{label}</span>
            <span className="text-xs text-slate-400">{description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
