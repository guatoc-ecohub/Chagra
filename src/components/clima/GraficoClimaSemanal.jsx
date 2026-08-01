/**
 * T44 — Micro-gráfico de clima semanal (SVG puro, sin librerías).
 *
 * Barras de precipitación + línea de temperatura máx/mín.
 * Datos de Open-Meteo via climaService.
 */
/** @typedef {{ dia: string, tempMax: number, tempMin: number, lluviaMm: number }} DiaClima */

/**
 * @param {{ datos: DiaClima[], ancho?: number, alto?: number }} props
 */
export default function GraficoClimaSemanal({ datos, ancho = 320, alto = 120 }) {
  if (!datos || datos.length === 0) return <div className="text-xs text-slate-500 py-4 text-center">Sin datos de clima.</div>;

  const margen = { top: 10, right: 10, bottom: 18, left: 32 };
  const w = ancho - margen.left - margen.right;
  const h = alto - margen.top - margen.bottom;

  const maxLluvia = Math.max(...datos.map(d => d.lluviaMm), 1);
  const temps = datos.flatMap(d => [d.tempMax, d.tempMin]);
  const minTemp = Math.min(...temps) - 2;
  const maxTemp = Math.max(...temps) + 2;
  const rangoTemp = maxTemp - minTemp || 1;

  const x = (i) => margen.left + (i + 0.5) * (w / datos.length);
  const yLluvia = (v) => alto - margen.bottom - (v / maxLluvia) * h * 0.8;
  const yTemp = (t) => alto - margen.bottom - ((t - minTemp) / rangoTemp) * h;

  return (
    <svg width={ancho} height={alto} className="w-full" viewBox={`0 0 ${ancho} ${alto}`}>
      {/* Barras de lluvia */}
      {datos.map((d, i) => (
        <rect key={`ll-${i}`} x={x(i) - 4} y={yLluvia(d.lluviaMm)} width={8}
          height={alto - margen.bottom - yLluvia(d.lluviaMm)} rx={2} fill="#38bdf8" opacity="0.6" />
      ))}
      {/* Línea temp max */}
      <polyline fill="none" stroke="#f87171" strokeWidth="1.5"
        points={datos.map((d, i) => `${x(i)},${yTemp(d.tempMax)}`).join(' ')} />
      {/* Línea temp min */}
      <polyline fill="none" stroke="#60a5fa" strokeWidth="1.5"
        points={datos.map((d, i) => `${x(i)},${yTemp(d.tempMin)}`).join(' ')} />
      {/* Labels día */}
      {datos.map((d, i) => (
        <text key={`dl-${i}`} x={x(i)} y={alto - 2} textAnchor="middle" className="text-[8px]" fill="#64748b">
          {['Do','Lu','Ma','Mi','Ju','Vi','Sá'][i]}
        </text>
      ))}
    </svg>
  );
}
