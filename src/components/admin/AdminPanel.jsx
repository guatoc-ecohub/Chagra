/**
 * AdminPanel.jsx — Panel de administración para el operador de Chagra.
 *
 * Ruta oculta (#admin), solo accesible con código de acceso.
 * Muestra: estado del deploy, métricas del agente, últimos crashes, feature toggles.
 */
import { useState, useEffect } from 'react';

const CODIGO = 'chagra-admin-2026';
const FEATURES_KEY = 'chagra:admin-features';

/** @type {Record<string, {label: string, default: boolean}>} */
const FEATURES = {
  juegos_habilitados: { label: 'Juegos (Milpa, Defensores, Metal Slug)', default: true },
  modo_demo_publico: { label: 'Modo demo público (explorar sin login)', default: true },
  debug_console: { label: 'Debug console (solo desarrollo)', default: false },
};

export default function AdminPanel() {
  const [autenticado, setAutenticado] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [features, setFeatures] = useState(/** @type {Record<string, boolean>} */ ({}));
  const [buildInfo, setBuildInfo] = useState(/** @type {{sha: string, ts: string}|null} */ (null));
  const [logs, setLogs] = useState(/** @type {string[]} */ ([]));

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FEATURES_KEY) || '{}');
      const merged = { ...FEATURES };
      for (const [k, v] of Object.entries(FEATURES)) {
        merged[k] = { ...v, default: saved[k] ?? v.default };
      }
      setFeatures(Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, v.default])));
    } catch {}
  }, []);

  const login = () => {
    if (codigo === CODIGO) setAutenticado(true);
    else setCodigo('');
  };

  const toggleFeature = (key) => {
    const next = { ...features, [key]: !features[key] };
    setFeatures(next);
    try { localStorage.setItem(FEATURES_KEY, JSON.stringify(next)); } catch {}
  };

  const refresh = async () => {
    try {
      const res = await fetch('/version.json', { cache: 'no-store' });
      if (res.ok) setBuildInfo(await res.json());
    } catch {}
    setLogs([`[${new Date().toLocaleTimeString()}] Panel refrescado`, ...logs.slice(0, 9)]);
  };

  useEffect(() => { if (autenticado) refresh(); }, [autenticado]);

  if (!autenticado) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <input type="password" value={codigo} onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && login()}
          placeholder="Código de acceso" autoFocus
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 text-sm w-64 mb-3 focus:outline-none focus:border-emerald-600" />
        <button onClick={login} className="px-4 py-2 rounded-xl bg-slate-700 text-slate-200 text-sm">Acceder</button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 text-slate-200 text-sm max-w-lg">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold">⚙️ Panel de Administración</h2>
        <button onClick={refresh} className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-400 hover:text-slate-200">Refrescar</button>
      </div>

      {buildInfo && (
        <div className="bg-slate-800 rounded-lg p-3 space-y-1">
          <div className="text-xs text-slate-500">Deploy</div>
          <div className="font-mono text-xs text-emerald-400">SHA: {buildInfo.sha?.substring(0, 8) || '—'}</div>
          <div className="text-xs text-slate-500">Build: {buildInfo.builtAt || '—'}</div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs text-slate-500">Feature Toggles</div>
        {Object.entries(FEATURES).map(([key, f]) => (
          <label key={key} className="flex items-center gap-3 bg-slate-800 rounded-lg p-3 cursor-pointer">
            <input type="checkbox" checked={features[key] || false} onChange={() => toggleFeature(key)}
              className="w-4 h-4 accent-emerald-600" />
            <span className="text-slate-300">{f.label}</span>
          </label>
        ))}
      </div>

      <div className="bg-slate-800 rounded-lg p-3">
        <div className="text-xs text-slate-500 mb-2">Logs</div>
        <div className="font-mono text-xs text-slate-600 space-y-0.5 max-h-32 overflow-y-auto">
          {logs.length === 0 && <div className="text-slate-700">Sin eventos</div>}
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}
