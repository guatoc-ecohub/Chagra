import React from 'react';
import { Activity } from 'lucide-react';
import Sparkline from './common/Sparkline';
import Badge from './common/Badge';

/**
 * IoTSensorCard — card de lectura de sensor IoT en estilo HUD industrial.
 *
 * Objetivo visual: distinguir claramente la telemetria IoT (datos crudos,
 * frios, deterministas) del panel cyberpunk de IA (generativo, orchid,
 * terminal CRT verde). Se usa un esquema "control de nave": acento morpho
 * cyan lateral, esquinas diagonales recortadas via clip-path, tipografia
 * monoespaciada para los readouts numericos y labels tecnicos.
 *
 * Props:
 *   - title               string    encabezado descriptivo ("INVERNADERO — ZONA A").
 *   - deviceId            string    identificador tecnico en mono ("matera_cocina · zigbee").
 *   - humidity, temperature          valores crudos de Home Assistant (string|null).
 *   - humidityHistory, temperatureHistory   arrays de HA history para las sparklines.
 *   - getHumidityColor, getTemperatureColor   helpers que devuelven clase Tailwind
 *                                             de color segun el valor (critico/optimo/etc).
 */
export default function IoTSensorCard({
  title,
  deviceId,
  humidity,
  temperature,
  humidityHistory,
  temperatureHistory,
  getHumidityColor,
  getTemperatureColor,
}) {
  const isMissing = (v) => v === null || v === undefined || v === 'unavailable' || v === 'unknown';
  const humOffline = isMissing(humidity);
  const tempOffline = isMissing(temperature);
  const online = !humOffline;
  // Clip-path recorta la esquina superior-derecha en diagonal (~14px),
  // estetica HUD de pantalla de control industrial.
  const hudClip = {
    clipPath:
      'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)',
  };

  return (
    <div
      className="relative bg-slate-900/60 border-l-[3px] border-morpho/70 shadow-[inset_1px_0_0_rgba(6,182,212,0.25)]"
      style={hudClip}
    >
      {/* Esquina HUD: linea diagonal que sigue el clip-path para que se vea como corte neon */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 w-[20px] h-[20px]"
        style={{
          background:
            'linear-gradient(225deg, rgba(6,182,212,0.8) 0%, rgba(6,182,212,0.8) 1.5px, transparent 2px)',
        }}
      />

      <div className="p-3 pr-4">
        {/* Header con status dot + title + device ID */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                aria-hidden="true"
                className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                  online ? 'bg-morpho motion-safe:animate-pulse' : 'bg-slate-600'
                }`}
              />
              <span className="text-morpho/90 text-2xs font-bold tracking-[0.2em] uppercase">
                {title}
              </span>
            </div>
            <span className="block text-[10px] text-slate-500 font-mono tracking-wide truncate">
              {deviceId}
            </span>
          </div>
          <span className="text-[9px] text-morpho/60 font-mono uppercase tracking-widest shrink-0">
            <Activity size={10} className="inline mb-0.5 mr-0.5" />
            IoT
          </span>
        </div>

        {/* Readouts numericos grandes en mono. Si el sensor no reporta
            (null/undefined/unavailable/unknown) se muestra un Badge OFFLINE
            en lugar del numero+unidad — evita concatenaciones sin sentido
            tipo "---%" o "null°C". */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-slate-950/60 border border-slate-800 rounded px-2.5 py-1.5 min-h-[56px]">
            <span className="block text-[9px] text-slate-500 font-mono tracking-widest uppercase mb-0.5">
              Humedad
            </span>
            {humOffline ? (
              <Badge variant="outline" className="text-slate-500 border-slate-700">
                OFFLINE
              </Badge>
            ) : (
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-2xl font-black font-mono tabular-nums leading-none ${getHumidityColor(humidity)}`}
                >
                  {humidity}
                </span>
                <span className="text-xs text-slate-500 font-mono">%</span>
              </div>
            )}
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded px-2.5 py-1.5 min-h-[56px]">
            <span className="block text-[9px] text-slate-500 font-mono tracking-widest uppercase mb-0.5">
              Temperatura
            </span>
            {tempOffline ? (
              <Badge variant="outline" className="text-slate-500 border-slate-700">
                OFFLINE
              </Badge>
            ) : (
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-2xl font-black font-mono tabular-nums leading-none ${getTemperatureColor(temperature)}`}
                >
                  {temperature}
                </span>
                <span className="text-xs text-slate-500 font-mono">°C</span>
              </div>
            )}
          </div>
        </div>

        {/* Sparklines con ejes legibles (envueltos en contenedor
            `text-slate-400` para que los labels de ejes del SVG, que
            usan currentColor, sean grises mientras el trazo mantiene
            su color semantico). */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-slate-400 flex items-center gap-1.5">
            <span className="text-[9px] text-morpho/70 font-mono shrink-0 tracking-wider">H%</span>
            <Sparkline
              data={humidityHistory}
              color="#3b82f6"
              timeLabel="24h"
              unit="%"
              width={140}
              height={44}
            />
          </div>
          <div className="text-slate-400 flex items-center gap-1.5">
            <span className="text-[9px] text-morpho/70 font-mono shrink-0 tracking-wider">T°</span>
            <Sparkline
              data={temperatureHistory}
              color="#f97316"
              timeLabel="24h"
              unit="°"
              width={140}
              height={44}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
