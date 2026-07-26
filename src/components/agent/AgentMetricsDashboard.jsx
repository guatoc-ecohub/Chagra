/**
 * AgentMetricsDashboard.jsx — Dashboard de métricas del agente para el operador.
 *
 * Consume la telemetría del flywheel (agentTelemetryFlywheel) y muestra:
 *   - Preguntas totales
 *   - Distribución de señal (👍 vs 👎)
 *   - Intenciones más frecuentes
 *   - Guards más disparados
 *   - Latencia promedio
 *
 * Solo visible para el operador. Sin PII. Datos agregados.
 */
import { useState, useEffect } from 'react';
import { exportarJSONL } from '../../services/agentTelemetryFlywheel.js';

export default function AgentMetricsDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    exportarJSONL().then(jsonl => {
      if (!jsonl) { setError(true); return; }
      const lineas = jsonl.trim().split('\n').filter(Boolean);
      const interacciones = lineas.map(l => JSON.parse(l));

      const senal = { explicita_buena: 0, explicita_mala: 0, implicita_buena: 0, implicita_mala: 0, ambigua: 0 };
      const intenciones = {};
      const guards = {};
      let latenciaTotal = 0;
      let conLatencia = 0;

      for (const i of interacciones) {
        const s = i.senal_calidad || 'ambigua';
        senal[s] = (senal[s] || 0) + 1;
        if (i.intencion) intenciones[i.intencion] = (intenciones[i.intencion] || 0) + 1;
        for (const g of (i.guards_disparados || [])) guards[g] = (guards[g] || 0) + 1;
        if (i.latencia_ms) { latenciaTotal += i.latencia_ms; conLatencia++; }
      }

      setStats({
        total: interacciones.length,
        buenas: senal.explicita_buena + senal.implicita_buena,
        malas: senal.explicita_mala + senal.implicita_mala,
        topIntenciones: Object.entries(intenciones).sort((a, b) => b[1] - a[1]).slice(0, 5),
        topGuards: Object.entries(guards).sort((a, b) => b[1] - a[1]).slice(0, 5),
        latenciaPromedio: conLatencia > 0 ? Math.round(latenciaTotal / conLatencia) : null,
      });
    }).catch(() => setError(true));
  }, []);

  if (error) return <div className="p-4 text-slate-400 text-sm">Sin datos de telemetría todavía.</div>;
  if (!stats) return <div className="p-4 text-slate-500 text-sm">Cargando métricas...</div>;

  return (
    <div className="p-4 space-y-4 text-slate-200 text-sm max-w-md">
      <h2 className="text-base font-semibold text-slate-100">📊 Métricas del agente</h2>

      <div className="grid grid-cols-3 gap-2">
        <Metrica label="Preguntas" value={stats.total} />
        <Metrica label="👍 Buenas" value={stats.buenas} color="text-emerald-400" />
        <Metrica label="👎 Malas" value={stats.malas} color="text-rose-400" />
      </div>

      {stats.latenciaPromedio && (
        <div className="text-xs text-slate-400">
          ⏱️ Latencia promedio: <span className="text-slate-200">{stats.latenciaPromedio}ms</span>
        </div>
      )}

      {stats.topIntenciones.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 mb-1">Intenciones más frecuentes</div>
          {stats.topIntenciones.map(([int, n]) => (
            <div key={int} className="flex justify-between text-xs">
              <span className="text-slate-400 truncate mr-2">{int}</span>
              <span className="text-slate-300">{n}</span>
            </div>
          ))}
        </div>
      )}

      {stats.topGuards.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 mb-1">Guards disparados</div>
          {stats.topGuards.map(([g, n]) => (
            <div key={g} className="flex justify-between text-xs">
              <span className="text-amber-400 truncate mr-2">{g}</span>
              <span className="text-slate-300">{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metrica({ label, value, color = 'text-slate-200' }) {
  return (
    <div className="bg-slate-800 rounded-lg p-2 text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
