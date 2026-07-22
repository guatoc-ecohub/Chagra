/**
 * ExtensionistaDashboard.jsx — Dashboard multi-finca para el extensionista.
 *
 * Muestra un resumen agregado de todas las fincas que asesora:
 *   - Total de fincas activas
 *   - Alertas agregadas (heladas, plagas, sequía)
 *   - Progreso de siembras (cuántas fincas sembraron esta semana)
 *   - Tabla de fincas con su estado
 *
 * DATOS MOCK mientras no haya backend de extensionista. La estructura
 * está lista para consumir un endpoint real (`/api/extensionista/fincas`).
 */
import { useState, useEffect } from 'react';

/** @typedef {{ id: string, nombre: string, vereda: string, municipio: string, plantas: number, animales: number, alertas: string[], ultimaActividad: string }} FincaResumen */

/** @type {FincaResumen[]} */
const MOCK_FINCAS = [
  { id: '1', nombre: 'El Naranjal', vereda: 'La Esperanza', municipio: 'Santuario', plantas: 45, animales: 3, alertas: ['broca_cafe'], ultimaActividad: '2026-07-14' },
  { id: '2', nombre: 'Buena Vista', vereda: 'La Maria', municipio: 'Apia', plantas: 120, animales: 8, alertas: [], ultimaActividad: '2026-07-13' },
  { id: '3', nombre: 'Los Naranjos', vereda: 'Alto Cauca', municipio: 'Balboa', plantas: 28, animales: 0, alertas: ['sequia', 'roya'], ultimaActividad: '2026-07-10' },
  { id: '4', nombre: 'Villa Maria', vereda: 'La Floresta', municipio: 'Pereira', plantas: 67, animales: 5, alertas: ['helada'], ultimaActividad: '2026-07-14' },
];

export default function ExtensionistaDashboard() {
  const [fincas] = useState(MOCK_FINCAS);
  const [stats, setStats] = useState({ total: 0, conAlertas: 0, activasHoy: 0 });

  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];
    setStats({
      total: fincas.length,
      conAlertas: fincas.filter(f => f.alertas.length > 0).length,
      activasHoy: fincas.filter(f => f.ultimaActividad === hoy).length,
    });
  }, [fincas]);

  return (
    <div className="p-4 space-y-4 text-slate-200 text-sm max-w-2xl">
      <h2 className="text-base font-semibold text-slate-100">🌾 Panel del extensionista</h2>

      <div className="grid grid-cols-3 gap-2">
        <MiniCard label="Fincas" value={stats.total} />
        <MiniCard label="Con alertas" value={stats.conAlertas} color={stats.conAlertas > 0 ? 'text-amber-400' : 'text-emerald-400'} />
        <MiniCard label="Activas hoy" value={stats.activasHoy} color="text-emerald-400" />
      </div>

      <div className="space-y-2">
        {fincas.map(f => (
          <div key={f.id} className="bg-slate-800 rounded-lg p-3 flex justify-between items-center">
            <div>
              <div className="font-medium text-slate-200">{f.nombre}</div>
              <div className="text-xs text-slate-500">{f.vereda}, {f.municipio}</div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span title="Plantas">{f.plantas} 🌱</span>
              <span title="Animales">{f.animales} 🐄</span>
              {f.alertas.length > 0 && (
                <span className="text-amber-400" title={f.alertas.join(', ')}>⚠️ {f.alertas.length}</span>
              )}
            </div>
          </div>
        ))}
      </div>
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
