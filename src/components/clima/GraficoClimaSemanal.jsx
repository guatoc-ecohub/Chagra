/**
 * T44 — Gráfico de clima semanal (SVG puro, sin librerías).
 *
 * Dos bandas apiladas que comparten el eje de días (NO dual-axis en un mismo
 * plot): arriba temperatura (máx roja / mín azul + relleno del rango del día +
 * los valores en grados), abajo lluvia (barras en mm). Etiquetas de día REALES
 * derivadas de la fecha (no hardcodeadas) y el día de HOY marcado. Cada columna
 * tiene un <title> nativo para ver el detalle al pasar/tocar.
 * Datos de Open-Meteo via climaService.
 */
import { fincaDateISO } from '../../utils/farmDate.js';
/** @typedef {{ dia: string, tempMax: number, tempMin: number, lluviaMm: number }} DiaClima */

const C = {
  max: '#f87171', // rojo — temperatura máxima (línea superior)
  min: '#60a5fa', // azul — temperatura mínima (línea inferior)
  lluvia: '#38bdf8', // celeste — barras de lluvia (banda propia)
  rango: 'rgba(148,163,184,0.14)', // relleno del rango diario
  grid: 'rgba(148,163,184,0.18)',
  ink: '#e2e8f0', // texto principal (slate-200)
  inkTenue: '#94a3b8', // texto secundario (slate-400)
  hoy: 'rgba(56,189,248,0.12)', // resalte de la columna de hoy
};

function etiquetaDia(iso) {
  const dt = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return { dow: '', dnum: '', esHoy: false };
  const dow = dt.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '');
  // BUG TODAY-UTC-HELADA-20260905: "Hoy" se decide en el calendario de la
  // FINCA, no en la zona del runtime/UTC (los `date` del forecast son locales
  // de la finca).
  const esHoy = iso === fincaDateISO();
  return { dow: dow.charAt(0).toUpperCase() + dow.slice(1, 2), dnum: String(dt.getDate()), esHoy };
}

/**
 * @param {{ datos: DiaClima[], ancho?: number, alto?: number }} props
 */
export default function GraficoClimaSemanal({ datos, ancho = 340, alto = 194 }) {
  if (!datos || datos.length === 0) {
    return <div className="text-xs text-slate-400 py-4 text-center">Sin datos de clima de la finca todavía.</div>;
  }

  const padL = 30, padR = 12;
  const plotW = ancho - padL - padR;
  const col = plotW / datos.length;
  const cx = (i) => padL + (i + 0.5) * col;

  // Banda de temperatura (arriba)
  const legendH = 20;
  const tTop = legendH + 8;
  const tH = 82;
  const temps = datos.flatMap((d) => [d.tempMax, d.tempMin]);
  const tMin = Math.floor(Math.min(...temps) - 1);
  const tMax = Math.ceil(Math.max(...temps) + 1);
  const tRango = tMax - tMin || 1;
  const yT = (t) => tTop + tH - ((t - tMin) / tRango) * tH;
  const ticks = [tMin, Math.round((tMin + tMax) / 2), tMax];

  // Banda de lluvia (abajo)
  const rTop = tTop + tH + 20;
  const rH = 32;
  const maxLl = Math.max(...datos.map((d) => d.lluviaMm), 1);
  const yLl = (v) => rTop + rH - (v / maxLl) * rH;

  const dias = datos.map((d) => ({ ...d, ...etiquetaDia(d.dia) }));
  const resumen = dias
    .map((d) => `${d.dow}${d.dnum}: máx ${Math.round(d.tempMax)}°, mín ${Math.round(d.tempMin)}°, lluvia ${Math.round(d.lluviaMm)} mm`)
    .join('. ');

  return (
    <svg width="100%" viewBox={`0 0 ${ancho} ${alto}`} role="img"
      aria-label={`Temperatura y lluvia de 7 días. ${resumen}`}
      style={{ display: 'block' }}>
      {/* Leyenda */}
      <g fontSize="9" fill={C.inkTenue}>
        <circle cx={padL + 3} cy={10} r={3} fill={C.max} />
        <text x={padL + 10} y={13}>Máx</text>
        <circle cx={padL + 42} cy={10} r={3} fill={C.min} />
        <text x={padL + 49} y={13}>Mín</text>
        <rect x={padL + 78} y={7} width={7} height={7} rx={1.5} fill={C.lluvia} />
        <text x={padL + 89} y={13}>Lluvia (mm)</text>
      </g>

      {/* Resalte de hoy (ambas bandas) */}
      {dias.map((d, i) => d.esHoy ? (
        <rect key={`hoy-${i}`} x={cx(i) - col / 2} y={tTop - 2} width={col} height={rTop + rH - tTop + 4} fill={C.hoy} rx={4} />
      ) : null)}

      {/* Grid + ejes °C de la banda de temperatura */}
      {ticks.map((t, k) => (
        <g key={`tk-${k}`}>
          <line x1={padL} y1={yT(t)} x2={ancho - padR} y2={yT(t)} stroke={C.grid} strokeWidth="1" />
          <text x={padL - 4} y={yT(t) + 3} textAnchor="end" fontSize="8" fill={C.inkTenue}>{t}°</text>
        </g>
      ))}

      {/* Relleno del rango diario (entre máx y mín) */}
      <polygon fill={C.rango}
        points={`${dias.map((d, i) => `${cx(i)},${yT(d.tempMax)}`).join(' ')} ${dias.slice().reverse().map((d, i) => `${cx(dias.length - 1 - i)},${yT(d.tempMin)}`).join(' ')}`} />

      {/* Líneas máx / mín */}
      <polyline fill="none" stroke={C.max} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        points={dias.map((d, i) => `${cx(i)},${yT(d.tempMax)}`).join(' ')} />
      <polyline fill="none" stroke={C.min} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        points={dias.map((d, i) => `${cx(i)},${yT(d.tempMin)}`).join(' ')} />

      {/* Puntos + valores de temperatura */}
      {dias.map((d, i) => (
        <g key={`tp-${i}`}>
          <circle cx={cx(i)} cy={yT(d.tempMax)} r={2.4} fill={C.max} />
          <circle cx={cx(i)} cy={yT(d.tempMin)} r={2.4} fill={C.min} />
          <text x={cx(i)} y={yT(d.tempMax) - 5} textAnchor="middle" fontSize="9" fontWeight="700" fill={C.ink}>{Math.round(d.tempMax)}°</text>
          <text x={cx(i)} y={yT(d.tempMin) + 11} textAnchor="middle" fontSize="9" fill={C.inkTenue}>{Math.round(d.tempMin)}°</text>
        </g>
      ))}

      {/* Barras de lluvia + mm */}
      <line x1={padL} y1={rTop + rH} x2={ancho - padR} y2={rTop + rH} stroke={C.grid} strokeWidth="1" />
      {dias.map((d, i) => {
        const mm = Math.round(d.lluviaMm);
        return (
          <g key={`ll-${i}`}>
            {d.lluviaMm > 0 && (
              <rect x={cx(i) - 5} y={yLl(d.lluviaMm)} width={10} height={rTop + rH - yLl(d.lluviaMm)} rx={2} fill={C.lluvia} opacity="0.85" />
            )}
            {mm > 0 && (
              <text x={cx(i)} y={yLl(d.lluviaMm) - 3} textAnchor="middle" fontSize="8" fill={C.lluvia}>{mm}</text>
            )}
          </g>
        );
      })}
      <text x={padL - 4} y={rTop + 4} textAnchor="end" fontSize="8" fill={C.inkTenue}>mm</text>

      {/* Etiquetas de día reales + hoy en negrita */}
      {dias.map((d, i) => (
        <text key={`dl-${i}`} x={cx(i)} y={alto - 4} textAnchor="middle" fontSize="9"
          fontWeight={d.esHoy ? '800' : '500'} fill={d.esHoy ? C.ink : C.inkTenue}>
          {d.esHoy ? 'Hoy' : `${d.dow} ${d.dnum}`}
        </text>
      ))}

      {/* Zona de toque/hover por columna con detalle nativo */}
      {dias.map((d, i) => (
        <rect key={`hit-${i}`} x={cx(i) - col / 2} y={tTop - 2} width={col} height={rTop + rH - tTop + 4} fill="transparent">
          <title>{`${d.esHoy ? 'Hoy' : `${d.dow} ${d.dnum}`} · máx ${Math.round(d.tempMax)}° / mín ${Math.round(d.tempMin)}° · lluvia ${Math.round(d.lluviaMm)} mm`}</title>
        </rect>
      ))}
    </svg>
  );
}
