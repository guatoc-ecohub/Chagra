/**
 * AdminPanel.jsx — Panel de administración para el operador de Chagra.
 *
 * Ruta oculta (#admin). Expone SOLO feature toggles en localStorage
 * (juegos, modo demo, debug console) + build info público de /version.json.
 *
 * NO expone datos sensibles, métricas reales, ni credenciales.
 * El panel es abierto porque lo que expone no es sensible.
 * Si en el futuro se agregan métricas del flywheel o estado de Ollama,
 * el gate DEBE ser server-side (Nginx basic auth o token en header).
 */
import { useState, useEffect } from 'react';

const FEATURES_KEY = 'chagra:admin-features';

/** @type {Record<string, {label: string, default: boolean}>} */
const FEATURES = {
  juegos_habilitados: { label: 'Juegos (Milpa, Defensores, Metal Slug)', default: true },
  modo_demo_publico: { label: 'Modo demo público (explorar sin login)', default: true },
  debug_console: { label: 'Debug console (solo desarrollo)', default: false },
};

export default function AdminPanel() {
  const [features, setFeatures] = useState(/** @type {Record<string, boolean>} */ ({}));
  const [buildInfo, setBuildInfo] = useState(/** @type {{sha: string, ts: string}|null} */ (null));
  const [logs, setLogs] = useState(/** @type {string[]} */ ([]));

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FEATURES_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      const merged = {};
      for (const k of Object.keys(FEATURES)) {
        merged[k] = parsed[k] ?? FEATURES[k].default;
      }
      setFeatures(merged);
    } catch {}
  }, []);

  useEffect(() => {
    fetch('/version.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(setBuildInfo)
      .catch(() => {});
  }, []);

  const toggleFeature = (key) => {
    const next = { ...features, [key]: !features[key] };
    setFeatures(next);
    try { localStorage.setItem(FEATURES_KEY, JSON.stringify(next)); } catch {}
  };

  const refresh = () => {
    setLogs(l => [`[${new Date().toLocaleTimeString()}] Panel refrescado`, ...l.slice(0, 9)]);
  };

  return (
    <div className="p-4 space-y-5 text-slate-200 text-sm max-w-lg">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold">Panel de Administración</h2>
        <button onClick={refresh} className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-400 hover:text-slate-200">Refrescar</button>
      </div>

      <div className="text-xs text-slate-500 bg-slate-800/50 rounded-lg p-2">
        Este panel controla ajustes locales. Nada de lo que ve aquí contiene datos personales de campesinos ni credenciales. Los cambios se guardan en este dispositivo.
      </div>

      {buildInfo && (
        <div className="bg-slate-800 rounded-lg p-3 space-y-1">
          <div className="text-xs text-slate-500">Deploy</div>
          <div className="font-mono text-xs text-emerald-400">SHA: {buildInfo.sha?.substring(0, 8) || '—'}</div>
          <div className="text-xs text-slate-500">Build: {buildInfo.builtAt || '—'}</div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs text-slate-500">Ajustes de la app</div>
        {Object.entries(FEATURES).map(([key, f]) => (
          <label key={key} className="flex items-center gap-3 bg-slate-800 rounded-lg p-3 cursor-pointer">
            <input type="checkbox" checked={features[key] || false} onChange={() => toggleFeature(key)}
              className="w-4 h-4 accent-emerald-600" />
            <span className="text-slate-300">{f.label}</span>
          </label>
        ))}
      </div>

      <div className="bg-slate-800 rounded-lg p-3">
        <div className="text-xs text-slate-500 mb-2">Registro de actividad</div>
        <div className="font-mono text-xs text-slate-600 space-y-0.5 max-h-32 overflow-y-auto">
          {logs.length === 0 && <div className="text-slate-700">Sin eventos</div>}
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}
