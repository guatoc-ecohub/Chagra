import React from 'react';
import { Activity } from 'lucide-react';
import Sparkline from './common/Sparkline';

/**
 * IoTSensorCard, card de lectura de sensor IoT en estilo HUD industrial.
 *
 * Objetivo visual: distinguir claramente la telemetria IoT (datos crudos,
 * frios, deterministas) del panel cyberpunk de IA (generativo, orchid,
 * terminal CRT verde). Se usa un esquema "control de nave": acento morpho
 * cyan lateral, esquinas diagonales recortadas via clip-path, tipografia
 * monoespaciada para los readouts numericos y labels tecnicos.
 *
 * Pasada visual 2026-07 (legibilidad al sol + temas claros):
 *   - Readouts mas grandes (text-3xl) con etiqueta de estado explicita
 *     ("Optima" / "Critica" / "Sin dato") — el estado no depende solo del
 *     color, se lee tambien como texto (sol directo / daltonismo).
 *   - El contenedor de cada readout cambia con el estado (tone):
 *     ok = borde emerald sutil, warn = sky, alert = rose + fondo tintado,
 *     nodata = borde punteado gris. Todas las clases son del safe set
 *     theme-aware (tokens CSS-var u overrides en themes.css).
 *
 * Props:
 *   - title               string    encabezado descriptivo ("INVERNADERO, ZONA A").
 *   - deviceId            string    identificador tecnico en mono ("matera_cocina · zigbee").
 *   - humidity, temperature          valores crudos de Home Assistant (string|null).
 *   - humidityHistory, temperatureHistory   arrays de HA history para las sparklines.
 *   - getHumidityMeta, getTemperatureMeta   helpers que devuelven { tone, cls, label }
 *                                           segun el valor (critico/optimo/etc).
 */

// Estilo del contenedor de cada readout segun el estado semantico (tone).
// alert lleva fondo tintado + borde fuerte para que la celda entera grite,
// no solo el numero. nodata usa borde punteado = "aqui falta señal".
const TONE_BOX = {
  ok: 'bg-slate-950/60 border border-emerald-500/30',
  warn: 'bg-sky-950/40 border border-sky-500/40',
  alert: 'bg-rose-950/20 border border-rose-500/50',
  nodata: 'bg-slate-950/40 border border-dashed border-slate-600',
};

// Punto de estado junto a la etiqueta — refuerza el semaforo del readout.
const TONE_DOT = {
  ok: 'bg-emerald-400',
  warn: 'bg-sky-400',
  alert: 'bg-rose-400 motion-safe:animate-pulse',
  nodata: 'bg-slate-600',
};

function SensorReadout({ label, value, unit, meta }) {
  const { tone = 'nodata', cls = 'text-slate-400', label: stateLabel = '' } = meta || {};
  const offline = tone === 'nodata';
  return (
    <div className={`rounded px-2.5 py-2 min-h-[64px] ${TONE_BOX[tone] || TONE_BOX.nodata}`}>
      <span className="block text-[9px] text-slate-400 font-mono tracking-widest uppercase mb-0.5">
        {label}
      </span>
      {offline ? (
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black font-mono leading-none text-slate-600" aria-hidden="true">
            --
          </span>
        </div>
      ) : (
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-black font-mono tabular-nums leading-none ${cls}`}>
            {value}
          </span>
          <span className="text-sm text-slate-400 font-mono">{unit}</span>
        </div>
      )}
      <span className="mt-1.5 flex items-center gap-1.5">
        <span aria-hidden="true" className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${TONE_DOT[tone] || TONE_DOT.nodata}`} />
        <span className={`text-[9px] font-mono font-bold uppercase tracking-widest ${offline ? 'text-slate-500' : cls}`}>
          {stateLabel}
        </span>
      </span>
    </div>
  );
}

export default function IoTSensorCard({
  title,
  deviceId,
  humidity,
  temperature,
  humidityHistory,
  temperatureHistory,
  getHumidityMeta,
  getTemperatureMeta,
}) {
  const isMissing = (v) => v === null || v === undefined || v === 'unavailable' || v === 'unknown';
  const humMeta = isMissing(humidity)
    ? { tone: 'nodata', cls: 'text-slate-400', label: 'Sin dato' }
    : getHumidityMeta(humidity);
  const tempMeta = isMissing(temperature)
    ? { tone: 'nodata', cls: 'text-slate-400', label: 'Sin dato' }
    : getTemperatureMeta(temperature);
  const online = humMeta.tone !== 'nodata' || tempMeta.tone !== 'nodata';
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
              <span className="text-morpho text-2xs font-bold tracking-[0.2em] uppercase">
                {title}
              </span>
            </div>
            <span className="block text-[10px] text-slate-500 font-mono tracking-wide truncate">
              {deviceId}
            </span>
          </div>
          <span className="text-[9px] text-morpho/70 font-mono uppercase tracking-widest shrink-0">
            <Activity size={10} className="inline mb-0.5 mr-0.5" />
            IoT
          </span>
        </div>

        {/* Readouts numericos grandes en mono. El estado (optimo/critico/
            saturado/sin dato) se comunica por COLOR + ETIQUETA + contenedor
            tintado — nunca solo por el color del numero. Si el sensor no
            reporta (null/undefined/unavailable/unknown) se muestra "--" con
            borde punteado y etiqueta "Sin dato". */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <SensorReadout label="Humedad" value={humidity} unit="%" meta={humMeta} />
          <SensorReadout label="Temperatura" value={temperature} unit="°C" meta={tempMeta} />
        </div>

        {/* Sparklines de 24h: en mobile apilados (grid-cols-1), en desktop
            md+ lado a lado (grid-cols-2) para aprovechar el ancho disponible
            y reducir la altura total de la tarjeta. Sparkline es ahora
            fluido (width="100%" capado por viewBox) y escala con el
            contenedor preservando aspect ratio. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
          <div className="text-slate-300 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[10px] text-morpho/80 font-mono tracking-widest uppercase">Humedad</span>
              <span className="text-[9px] text-slate-500 font-mono">últimas 24h</span>
            </div>
            <Sparkline
              data={humidityHistory}
              values={null}
              color="#3b82f6"
              timeLabel="24h"
              unit="%"
              width={320}
              height={72}
              responsive
            />
          </div>
          <div className="text-slate-300 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[10px] text-morpho/80 font-mono tracking-widest uppercase">Temperatura</span>
              <span className="text-[9px] text-slate-500 font-mono">últimas 24h</span>
            </div>
            <Sparkline
              data={temperatureHistory}
              values={null}
              color="#f97316"
              timeLabel="24h"
              unit="°"
              width={320}
              height={72}
              responsive
            />
          </div>
        </div>
      </div>
    </div>
  );
}
