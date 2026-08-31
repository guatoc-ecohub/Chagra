/**
 * PaginaTiempo2D.jsx — Dashboard de clima con 3 horizontes temporales.
 *
 * Muestra:
 * - HOY: condiciones actuales y alertas inmediatas
 * - 7-16 días: pronóstico extendido con índices agronómicos
 * - ENSO: estado del ciclo climático y proyección estacional
 *
 * Índices nuevos estimados por Chagra con Open-Meteo:
 * - ETo (Evapotranspiración de referencia)
 * - VPD (Déficit de presión de vapor)
 * - Horas de frío (acumulado < 7°C y < 13°C)
 * - THI (Temperature Humidity Index - estrés térmico animal)
 * - Semáforo de enfermedad (riesgo fisiológico)
 *
 * Consume el snapshot del sidecar (F0+motores) vía climaService.
 * Pedagogía: Julieta - UI clara para agricultores.
 */

/* eslint-disable chagra-i18n/no-hardcoded-spanish -- copy es-CO del módulo de clima; migración a messages.js queda fuera de este rescate */

import React, { useState, useEffect } from 'react';
import {
  CloudSun, Thermometer, Droplets, Wind,
  AlertTriangle, Info, Calendar, TrendingUp,
  Eye, Activity, Snowflake, Shield,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import { fetchClimaSnapshot, getCachedClimaSnapshot, CLIMA_UPDATED_EVENT } from '../../services/climaService';
import GraficoClimaSemanal from './GraficoClimaSemanal';
import './clima.css';

/**
 * Mapeo de códigos de condición a iconos y labels legibles.
 */
const CONDICION_MAP = {
  despejado: { icon: Sun, label: 'Despejado', color: 'text-amber-300' },
  nublado: { icon: Cloud, label: 'Nublado', color: 'text-slate-300' },
  lluvia: { icon: CloudRain, label: 'Lluvia', color: 'text-sky-300' },
  niebla: { icon: CloudFog, label: 'Niebla', color: 'text-slate-400' },
  tormenta: { icon: CloudLightning, label: 'Tormenta', color: 'text-purple-300' },
};

const { Sun, Cloud, CloudRain, CloudFog, CloudLightning } = { 
  Sun: () => <span className="text-amber-300">☀️</span>,
  Cloud: () => <span className="text-slate-300">☁️</span>,
  CloudRain: () => <span className="text-sky-300">🌧️</span>,
  CloudFog: () => <span className="text-slate-400">🌫️</span>,
  CloudLightning: () => <span className="text-purple-300">⛈️</span>,
};

/**
 * Semáforo de riesgo → colores consistentes.
 */
const SEMAFORO_COLORS = {
  bajo: { bg: 'bg-emerald-900/30', border: 'border-emerald-700/50', text: 'text-emerald-200', badge: 'bg-emerald-600' },
  medio: { bg: 'bg-amber-900/30', border: 'border-amber-700/50', text: 'text-amber-200', badge: 'bg-amber-500' },
  alto: { bg: 'bg-red-900/30', border: 'border-red-700/50', text: 'text-red-200', badge: 'bg-red-600' },
};

/**
 * Tooltip educativo para cada índice.
 */
const INDICES_INFO = {
  eto: {
    titulo: 'Evapotranspiración (ETo)',
    descripcion: 'Pérdida de agua por evaporación del suelo y transpiración de las plantas. Útil para programar riego.',
    unidad: 'mm/día',
  },
  vpd: {
    titulo: 'Déficit de Presión de Vapor (VPD)',
    descripcion: 'Diferencia entre el vapor de agua que el aire puede contener y lo que realmente contiene. Afecta apertura de estomas.',
    unidad: 'kPa',
  },
  horas_frio: {
    titulo: 'Horas de Frío',
    descripcion: 'Horas acumuladas bajo umbral de temperatura. Importante para cultivos que necesitan frío para florecer (vernalización).',
    unidad: 'horas',
  },
  thi: {
    titulo: 'Índice Térmico de Humedad (THI)',
    titulo_corto: 'THI',
    descripcion: 'Combina temperatura y humedad para medir estrés térmico en animales. <72:normal, 72-79:alerta, ≥80:peligro.',
    unidad: 'índice',
  },
  semaforo_enfermedad: {
    titulo: 'Riesgo de Enfermedad',
    descripcion: 'Estimación de riesgo fisiológico basado en humedad y temperatura. Alto riesgo = condiciones favorables para hongos.',
    unidad: 'nivel',
  },
};

/**
 * Componente de tarjeta de índice con tooltip.
 */
function IndiceCard({ indice, valor, semaforo, onClick }) {
  const info = INDICES_INFO[indice];
  if (!info) return null;

  const semaforoColor = SEMAFORO_COLORS[semaforo] || SEMAFORO_COLORS.bajo;
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 p-3 rounded-xl border border-slate-700/60 bg-slate-900/50 hover:bg-slate-800/60 transition-colors text-left w-full"
      data-testid={`indice-${indice}`}
    >
      <span className={`shrink-0 w-10 h-10 rounded-lg ${semaforoColor.bg} grid place-items-center ${semaforoColor.text}`}>
        <Activity size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-400 uppercase">{info.titulo_corto || info.titulo}</p>
        <p className={`text-lg font-black ${semaforoColor.text}`}>
          {typeof valor === 'number' ? valor.toFixed(1) : valor} <span className="text-xs font-normal text-slate-500">{info.unidad}</span>
        </p>
      </div>
      <Info size={16} className="shrink-0 text-slate-500" />
    </button>
  );
}

/**
 * Panel de horizonte HOY: condiciones actuales + alertas.
 */
function HorizonteHoy({ snapshot }) {
  const hoy = snapshot?.openmeteo?.forecast_7d?.[0];
  if (!hoy) {
    return (
      <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4">
        <p className="text-sm text-amber-200">Datos de hoy no disponibles. Verifica tu conexión.</p>
      </div>
    );
  }

  const condicion = hoy.condicion || 'despejado';
  const condInfo = CONDICION_MAP[condicion] || CONDICION_MAP.despejado;
  const CondIcon = condInfo.icon;

  return (
    <div className="space-y-3">
      {/* Tarjeta principal de HOY */}
      <div className={`rounded-2xl border p-4 ${condInfo.color.replace('text-', 'border-')} bg-slate-900/50`}>
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-14 h-14 rounded-xl bg-slate-800/70 grid place-items-center text-3xl">
            <CondIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Hoy</p>
            <p className={`text-xl font-black leading-tight ${condInfo.color}`}>{condInfo.label}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Máxima</p>
            <p className="text-base font-bold text-red-200">{Math.round(hoy.temp_max_c)}°C</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Mínima</p>
            <p className="text-base font-bold text-sky-200">{Math.round(hoy.temp_min_c)}°C</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Lluvia</p>
            <p className="text-base font-bold text-sky-300">{hoy.precip_mm?.toFixed(1) || 0}mm</p>
          </div>
        </div>
      </div>

      {/* Alertas locales */}
      {snapshot?.alertas_locales && snapshot.alertas_locales.length > 0 && (
        <div className="space-y-2">
          {snapshot.alertas_locales.map((alerta, i) => {
            const alertaColor = SEMAFORO_COLORS[alerta.severidad === 'critical' ? 'alto' : alerta.severidad === 'warning' ? 'medio' : 'bajo'];
            return (
              <div key={i} className={`rounded-xl border p-3 ${alertaColor.border} ${alertaColor.bg} flex items-start gap-2`}>
                <AlertTriangle size={16} className={alertaColor.text + ' shrink-0 mt-0.5'} />
                <div className="min-w-0">
                  <p className={`text-xs font-bold ${alertaColor.text}`}>{alerta.tipo}</p>
                  <p className="text-xs text-slate-300 mt-0.5">{alerta.mensaje}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fuente */}
      <p className="text-[10px] italic text-slate-500 text-center">
        Estimado por Chagra con Open-Meteo
      </p>
    </div>
  );
}

/**
 * Panel de horizonte 7-16 días: pronóstico + índices.
 */
function HorizonteMedioPlazo({ snapshot, toggleIndice }) {
  const forecast = snapshot?.openmeteo?.forecast_7d || [];
  
  if (forecast.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4">
        <p className="text-sm text-amber-200">Pronóstico extendido no disponible. Verifica tu conexión.</p>
      </div>
    );
  }

  // Datos para el gráfico
  const datosGrafico = forecast.slice(0, 7).map(d => ({
    dia: new Date(d.date).toLocaleDateString('es-CO', { weekday: 'short' }),
    tempMax: d.temp_max_c,
    tempMin: d.temp_min_c,
    lluviaMm: d.precip_mm || 0,
  }));

  // Datos de índices para hoy (promedio de los próximos 3 días para vista extendida)
  const indicesHoy = forecast[0] || {};
  const indiceEto = indicesHoy.eto_mm ?? null;
  const indiceVpd = indicesHoy.vpd_kpa ?? null;
  const indiceHorasFrio = indicesHoy.horas_frio ?? null;
  const indiceThi = indicesHoy.thi ?? null;
  const indiceSemaforo = indicesHoy.semaforo_enfermedad ?? 'bajo';

  return (
    <div className="space-y-4">
      {/* Gráfico de tendencia */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4">
        <p className="text-sm font-black text-slate-100 mb-3">Tendencia 7 días</p>
        <GraficoClimaSemanal datos={datosGrafico} ancho={300} alto={120} />
      </div>

      {/* Índices agronómicos */}
      <div>
        <p className="text-sm font-black text-slate-100 mb-2">Índices agronómicos</p>
        <div className="grid grid-cols-2 gap-2">
          {indiceEto !== null && (
            <IndiceCard 
              indice="eto" 
              valor={indiceEto} 
              semaforo={indiceEto > 5 ? 'alto' : indiceEto > 3 ? 'medio' : 'bajo'}
              onClick={() => toggleIndice('eto')}
            />
          )}
          {indiceVpd !== null && (
            <IndiceCard 
              indice="vpd" 
              valor={indiceVpd} 
              semaforo={indiceVpd > 1.5 ? 'alto' : indiceVpd > 0.8 ? 'medio' : 'bajo'}
              onClick={() => toggleIndice('vpd')}
            />
          )}
          {indiceHorasFrio !== null && (
            <IndiceCard 
              indice="horas_frio" 
              valor={indiceHorasFrio} 
              semaforo={indiceHorasFrio > 10 ? 'bajo' : indiceHorasFrio > 5 ? 'medio' : 'alto'}
              onClick={() => toggleIndice('horas_frio')}
            />
          )}
          {indiceThi !== null && (
            <IndiceCard 
              indice="thi" 
              valor={indiceThi} 
              semaforo={indiceThi >= 80 ? 'alto' : indiceThi >= 72 ? 'medio' : 'bajo'}
              onClick={() => toggleIndice('thi')}
            />
          )}
        </div>
        <div className="mt-2">
          <IndiceCard 
            indice="semaforo_enfermedad" 
            valor={indiceSemaforo === 'alto' ? 'ALTO' : indiceSemaforo === 'medio' ? 'MEDIO' : 'BAJO'}
            semaforo={indiceSemaforo}
            onClick={() => toggleIndice('semaforo_enfermedad')}
          />
        </div>
      </div>

      {/* Fuente */}
      <p className="text-[10px] italic text-slate-500 text-center">
        Estimado por Chagra con Open-Meteo
      </p>
    </div>
  );
}

/**
 * Panel de horizonte ENSO: estado estacional.
 */
function HorizonteENSO({ snapshot }) {
  const enso = snapshot?.enso_status;
  
  if (!enso) {
    return (
      <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4">
        <p className="text-sm text-amber-200">Estado ENSO no disponible. Verifica tu conexión.</p>
      </div>
    );
  }

  const phase = enso.phase || 'neutral';
  const severity = enso.severity || 'neutral';
  const severidadColor = SEMAFORO_COLORS[severity === 'critical' ? 'alto' : severity === 'warning' ? 'medio' : 'bajo'];
  
  return (
    <div className="space-y-3">
      {/* Tarjeta ENSO */}
      <div className={`rounded-2xl border p-4 ${severidadColor.border} ${severidadColor.bg}`}>
        <div className="flex items-center gap-3">
          <span className={`shrink-0 w-12 h-12 rounded-xl ${severidadColor.badge} grid place-items-center text-white font-black text-lg`}>
            {phase === 'neutral' ? 'N' : phase.includes('nino') ? 'N' : 'L'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Ciclo climático</p>
            <p className={`text-lg font-black leading-tight ${severidadColor.text}`}>{enso.label || phase}</p>
          </div>
        </div>

        {enso.oni_value !== null && (
          <div className="mt-2">
            <p className="text-xs text-slate-300">Índice ONI: <span className="font-bold">{enso.oni_value.toFixed(1)}°C</span></p>
          </div>
        )}

        {enso.trend && (
          <div className="mt-2 flex items-center gap-1">
            <TrendingUp size={14} className={enso.trend === 'rising' ? 'text-red-300' : enso.trend === 'falling' ? 'text-sky-300' : 'text-slate-400'} />
            <p className="text-xs text-slate-300">
              Tendencia: {enso.trend === 'rising' ? 'ascendente' : enso.trend === 'falling' ? 'descendente' : 'estable'}
            </p>
          </div>
        )}
      </div>

      {/* Fuentes */}
      {enso.sources && enso.sources.length > 0 && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fuentes</p>
          <ul className="space-y-0.5">
            {enso.sources.map((source, i) => (
              <li key={i} className="text-[10px] text-slate-300 flex items-start gap-1">
                <span className="text-sky-400">•</span>
                {source}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Probabilidades IDEAM si están disponibles */}
      {enso.ideam_probabilities && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Probabilidades IDEAM</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] w-16">El Niño:</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500" 
                  style={{ width: `${enso.ideam_probabilities.nino_pct || 0}%` }}
                />
              </div>
              <span className="text-[10px] w-8 text-right">{enso.ideam_probabilities.nino_pct || 0}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] w-16">Neutral:</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500" 
                  style={{ width: `${enso.ideam_probabilities.neutral_pct || 0}%` }}
                />
              </div>
              <span className="text-[10px] w-8 text-right">{enso.ideam_probabilities.neutral_pct || 0}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] w-16">La Niña:</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sky-500" 
                  style={{ width: `${enso.ideam_probabilities.nina_pct || 0}%` }}
                />
              </div>
              <span className="text-[10px] w-8 text-right">{enso.ideam_probabilities.nina_pct || 0}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Fuente */}
      <p className="text-[10px] italic text-slate-500 text-center">
        Datos de NOAA, IDEAM y CIIFEN
      </p>
    </div>
  );
}

/**
 * Modal educativo para índices.
 */
function IndiceDetalleModal({ indice, onClose }) {
  const info = INDICES_INFO[indice];
  if (!info) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div 
        className="bg-slate-900 rounded-2xl border border-slate-700 p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-black text-slate-100">{info.titulo}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg">
            ×
          </button>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{info.descripcion}</p>
        <div className="mt-4 p-3 rounded-xl bg-slate-800/50">
          <p className="text-xs text-slate-400">
            Unidad: <span className="font-bold text-slate-200">{info.unidad}</span>
          </p>
        </div>
        <p className="mt-4 text-[10px] italic text-slate-500">
          Estimado por Chagra con Open-Meteo
        </p>
      </div>
    </div>
  );
}

/**
 * Componente principal.
 */
export default function PaginaTiempo2D({ onBack }) {
  const [horizonte, setHorizonte] = useState('hoy');
  const [snapshot, setSnapshot] = useState(getCachedClimaSnapshot());
  const [loading, setLoading] = useState(false);
  const [modalIndice, setModalIndice] = useState(null);
  const [error, setError] = useState(null);

  // Cargar snapshot al montar
  useEffect(() => {
    let mounted = true;
    
    const loadSnapshot = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchClimaSnapshot();
        if (mounted) {
          setSnapshot(data);
          if (!data) {
            setError('No se pudo cargar el clima. Verifica tu conexión.');
          }
        }
      } catch (err) {
        console.error('Error cargando snapshot:', err);
        if (mounted) {
          setError('Error de conexión al cargar el clima.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSnapshot();

    // Escuchar actualizaciones en vivo
    const handleUpdate = (detail) => {
      if (mounted) setSnapshot(detail);
    };
    window.addEventListener(CLIMA_UPDATED_EVENT, (e) => handleUpdate(e.detail));

    return () => {
      mounted = false;
      window.removeEventListener(CLIMA_UPDATED_EVENT, handleUpdate);
    };
  }, []);

  const toggleIndice = (indice) => {
    setModalIndice(indice);
  };

  const closeModal = () => {
    setModalIndice(null);
  };

  const horizontes = [
    { id: 'hoy', label: 'Hoy', desc: 'Ahora', icon: Sun },
    { id: 'medio_plazo', label: '7-16 días', desc: 'Pronóstico', icon: Calendar },
    { id: 'enso', label: 'ENSO', desc: 'Estación', icon: Activity },
  ];

  return (
    <ScreenShell title="El Tiempo" icon={CloudSun} onBack={onBack}>
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Navegación de horizontes */}
        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Horizontes temporales">
          {horizontes.map((h) => {
            const Icon = h.icon;
            const activo = horizonte === h.id;
            return (
              <button
                key={h.id}
                type="button"
                role="tab"
                aria-selected={activo}
                data-testid={`horizonte-${h.id}`}
                onClick={() => setHorizonte(h.id)}
                className={`rounded-xl border px-2 py-3 text-center transition-colors ${
                  activo
                    ? 'border-sky-500/70 bg-sky-500/15 text-sky-200'
                    : 'border-slate-700 bg-slate-900/50 text-slate-300 active:bg-slate-800/70'
                }`}
              >
                <span className="flex items-center justify-center gap-1">
                  <Icon size={16} />
                  <span className="block text-sm font-black leading-tight">{h.label}</span>
                </span>
                <span className={`block text-[10px] leading-tight mt-1 ${activo ? 'text-sky-300/90' : 'text-slate-500'}`}>
                  {h.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-6 text-center">
            <div className="inline-block w-8 h-8 border-2 border-slate-600 border-t-sky-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-300">Cargando clima...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4">
            <p className="text-sm text-amber-200">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs text-amber-300 underline"
            >
              Recargar
            </button>
          </div>
        )}

        {/* Contenido del horizonte seleccionado */}
        {!loading && !error && (
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4">
            {horizonte === 'hoy' && <HorizonteHoy snapshot={snapshot} />}
            {horizonte === 'medio_plazo' && (
              <HorizonteMedioPlazo 
                snapshot={snapshot} 
                toggleIndice={toggleIndice}
              />
            )}
            {horizonte === 'enso' && <HorizonteENSO snapshot={snapshot} />}
          </div>
        )}

        {/* Nota pedagógica */}
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/30 p-3">
          <p className="text-[10px] text-slate-400 leading-snug">
            💡 Los índices agronómicos (ETo, VPD, horas de frío, THI, semáforo de enfermedad) 
            son estimaciones calculadas por Chagra usando datos de Open-Meteo. Son referencias 
            para la toma de decisiones, no reemplazan el juicio del agricultor.
          </p>
        </div>

        {/* Modal de detalle de índice */}
        {modalIndice && (
          <IndiceDetalleModal 
            indice={modalIndice} 
            onClose={closeModal}
          />
        )}
      </div>
    </ScreenShell>
  );
}
