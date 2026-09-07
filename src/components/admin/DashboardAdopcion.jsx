/**
 * T50 — Dashboard de adopción para el operador.
 *
 * Métricas agregadas de uso (sin PII): usuarios activos, siembras/día,
 * mundos más visitados, tasa de retorno. Datos del flywheel de telemetría.
 */
import { useState, useEffect } from 'react';

export default function DashboardAdopcion() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    import('../../services/agentTelemetryFlywheel.js').then(({ exportarJSONL }) => {
      exportarJSONL().then(jsonl => {
        if (!jsonl) return;
        const interacciones = jsonl.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));

        // Sesiones únicas
        const sesiones = new Set(interacciones.map(i => i.sesion_id).filter(Boolean));

        // Siembras por día (aproximado: preguntas que mencionan "siembra" o "sembrar")
        const siembras = interacciones.filter(i =>
          i.pregunta?.toLowerCase().includes('siembra') || i.pregunta?.toLowerCase().includes('sembrar')
        );

        // Mundos más visitados (vía intención que empieza con nombre de mundo)
        const mundos = {};
        for (const i of interacciones) {
          const m = i.intencion?.split('_')[0];
          if (m) mundos[m] = (mundos[m] || 0) + 1;
        }
        const topMundos = Object.entries(mundos).sort((a, b) => b[1] - a[1]).slice(0, 5);

        // Tasa de retorno: sesiones con >1 interacción
        const sesionesConMultiples = interacciones.reduce((acc, i) => {
          acc[i.sesion_id] = (acc[i.sesion_id] || 0) + 1;
          return acc;
        }, {});
        const retornantes = Object.values(sesionesConMultiples).filter(v => v > 1).length;

        setStats({
          sesiones: sesiones.size,
          siembras: siembras.length,
          retornantes,
          topMundos,
          totalInteracciones: interacciones.length,
        });
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  if (!stats) return <div className="p-4 text-slate-500 text-sm">Cargando métricas de adopción...</div>;

  return (
    <div className="p-4 space-y-4 text-slate-200 text-sm max-w-md">
      <h2 className="text-base font-semibold text-slate-100">📈 Adopción</h2>
      <div className="grid grid-cols-2 gap-2">
        <MiniCard label="Sesiones" value={stats.sesiones} />
        <MiniCard label="Siembras" value={stats.siembras} color="text-emerald-400" />
        <MiniCard label="Retornantes" value={stats.retornantes} color="text-amber-400" />
        <MiniCard label="Interacciones" value={stats.totalInteracciones} />
      </div>
      {stats.topMundos.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 mb-1">Mundos más visitados</div>
          {stats.topMundos.map(([m, n]) => (
            <div key={m} className="flex justify-between text-xs"><span className="text-slate-400">{m}</span><span className="text-slate-300">{n}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniCard({ label, value, color = 'text-slate-200' }) {
  return (
    <div className="bg-slate-800 rounded-lg p-2 text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
