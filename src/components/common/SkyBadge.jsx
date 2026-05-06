import { useEffect, useState } from 'react';
import { lunarPhase, solarTimes, formatLocalHM, formatDayLength } from '../../utils/skyEphemeris';
import { FARM_CONFIG } from '../../config/defaults';

/**
 * SkyBadge, fase lunar + horas solares en el header.
 *
 * Muestra: 🌗 Cuarto · ☀ 5:42-17:53
 * Hover/title revela detalle: nombre completo, iluminación, día/noche, día.
 *
 * Cálculo determinístico local (utils/skyEphemeris). Se refresca cada hora.
 * No emite recomendaciones agronómicas (literatura no robusta).
 */
export default function SkyBadge() {
  const [snapshot, setSnapshot] = useState(() => computeSnapshot());

  useEffect(() => {
    const id = setInterval(() => setSnapshot(computeSnapshot()), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const { lunar, solar } = snapshot;
  const lunarTitle = `${lunar.name} · ${Math.round(lunar.illumination * 100)}% iluminación · ${Math.round(lunar.daysSinceNewMoon)}d desde luna nueva`;
  const solarTitle = solar.sunrise && solar.sunset
    ? `Salida ${formatLocalHM(solar.sunrise)} · puesta ${formatLocalHM(solar.sunset)} · día ${formatDayLength(solar.dayLengthMinutes)} · ${solar.isDaylight ? 'sol arriba' : 'sol abajo'}`
    : 'Coordenadas no configuradas, sin cálculo solar';

  return (
    <span
      className="text-[10px] text-slate-500 font-mono font-normal inline-flex items-center gap-1 ml-1"
      aria-label="Información lunar y solar"
    >
      <span title={lunarTitle} className="inline-flex items-center gap-0.5 cursor-help">
        <span aria-hidden="true">{lunar.icon}</span>
        <span className="hidden sm:inline">{shortLunarName(lunar.name)}</span>
      </span>
      {solar.sunrise && (
        <span title={solarTitle} className="inline-flex items-center gap-0.5 cursor-help">
          <span aria-hidden="true">{solar.isDaylight ? '☀' : '🌙'}</span>
          <span>{formatLocalHM(solar.sunrise)}-{formatLocalHM(solar.sunset)}</span>
        </span>
      )}
    </span>
  );
}

function computeSnapshot() {
  const now = new Date();
  const lat = FARM_CONFIG.LATITUDE;
  const lon = FARM_CONFIG.LONGITUDE;
  const lunar = lunarPhase(now, { latitude: lat ?? 0 });
  const solar = lat != null && lon != null
    ? solarTimes(now, lat, lon)
    : { sunrise: null, sunset: null, solarNoon: null, dayLengthMinutes: 0, isDaylight: false };
  return { lunar, solar };
}

function shortLunarName(name) {
  return name
    .replace('Luna ', '')
    .replace('Cuarto ', '¼ ')
    .replace('Gibosa ', 'Gib. ');
}
