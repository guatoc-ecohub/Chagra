import React, { useEffect, useState } from 'react';
import { MapPin, X, AlertTriangle } from 'lucide-react';
import { detectFincaByGps } from '../services/gpsFincaDetector';
import { useFincaActiveStore } from '../services/fincaActiveStore';

/**
 * GpsFincaBanner — banner contextual que aparece cuando GPS detecta que el
 * operador está en una finca distinta a la activa, o cuando la auto-detección
 * falló y el operador puede beneficiarse de saberlo.
 *
 * Implementa 062.3 del roadmap GPS context-aware
 * (queue/062-gps-context-aware-multi-finca.md).
 *
 * UX:
 *  - Estado A (match found ≠ activa): banner verde "Estás en Los Sitios.
 *    ¿Cambiar de finca?" [Sí] [No, mantener Guatoc] [Dismiss]
 *  - Estado B (match found == activa): NO mostrar banner (todo OK).
 *  - Estado C (out_of_range): banner gris "No estás cerca de ninguna finca
 *    registrada. Finca activa: Guatoc."
 *  - Estado D (permission_denied): banner amarillo "Activa permiso GPS para
 *    detección automática de finca."
 *  - Estado E (gpsOverride=true): NO consultar GPS (operador escogió manual).
 *
 * Privacy: GPS coords nunca se persisten ni envían a server (queue/062 D4).
 */
export default function GpsFincaBanner({ autoDetectOnMount = true }) {
  const {
    activeFincaSlug,
    fincas,
    gpsOverride,
    setActiveFincaFromGps,
    setActiveFincaManual,
  } = useFincaActiveStore();

  const [detection, setDetection] = useState(null); // {finca, distanceKm, reason}
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  const runDetection = async () => {
    if (gpsOverride || fincas.length === 0) return;
    setLoading(true);
    try {
      const result = await detectFincaByGps(fincas);
      setDetection(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoDetectOnMount) runDetection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDetectOnMount, fincas.length, gpsOverride]);

  if (dismissed) return null;
  if (gpsOverride) return null;
  // Mientras detecta primera vez: spinner discreto en lugar de null
  // (evita layout shift cuando aparece el banner final).
  if (loading && !detection) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
        <MapPin size={14} className="text-slate-500 animate-pulse" />
        <span className="text-xs text-slate-500">Detectando ubicación…</span>
      </div>
    );
  }
  if (!detection) return null;

  const { finca, distanceKm, reason } = detection;

  // Estado B: GPS match == active. No banner.
  if (finca && finca.slug === activeFincaSlug) return null;

  // Estado A: GPS sugiere otra finca.
  if (finca && finca.slug !== activeFincaSlug) {
    return (
      <div className="bg-emerald-900/40 border border-emerald-700 rounded-xl p-3 mb-3 flex items-start gap-3">
        <MapPin size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-slate-100 font-medium">
            Estás en <strong className="text-emerald-300">{finca.nombre}</strong>{' '}
            <span className="text-xs text-slate-400">({distanceKm.toFixed(1)} km)</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Finca activa actual: {activeFincaSlug}
          </p>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                setActiveFincaFromGps(finca.slug);
                setDismissed(true);
              }}
              className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500"
            >
              Cambiar a {finca.nombre}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFincaManual(activeFincaSlug);
                setDismissed(true);
              }}
              className="px-3 py-1 rounded-lg bg-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-600"
            >
              Mantener {activeFincaSlug}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 rounded text-slate-500 hover:text-slate-300"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // Estado D: permiso denegado o GPS error.
  if (reason === 'permission_denied' || reason === 'geolocation_unavailable') {
    return (
      <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-3 mb-3 flex items-start gap-3">
        <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-slate-100">
            Permiso GPS no concedido. Detección automática de finca desactivada.
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Activa el permiso en el navegador para que Chagra reconozca dónde estás.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 rounded text-slate-500 hover:text-slate-300"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // Estado C: out_of_range — operador fuera de cualquier finca registrada.
  if (reason === 'out_of_range') {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 mb-3 flex items-start gap-3">
        <MapPin size={20} className="text-slate-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-slate-200">
            No estás cerca de ninguna finca registrada.
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Finca activa: <strong>{activeFincaSlug}</strong>.{' '}
            {distanceKm && `Distancia: ${distanceKm.toFixed(1)} km`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 rounded text-slate-500 hover:text-slate-300"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // Otros errores: timeout, position_unavailable — silenciar.
  return null;
}
