import React, { useState, useEffect } from 'react';
import { User, Palette, Briefcase, Save, Check } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import ThemeSelector from './common/ThemeSelector';
import { PRIMARY_WORKER_NAME } from '../config/workerConfig';

/**
 * ProfileScreen, perfil del operador.
 *
 * Lili #120: "debería poderse registrar los datos del 'Trabajador -
 * Operador de Campo'". Antes era display-only con nombre hardcoded.
 * Ahora editable con persistencia localStorage:
 *   - chagra:operator:name (string, ya leído por TopBar)
 *   - chagra:operator:role (enum)
 *
 * TopBar muestra el rol además del nombre cuando está disponible.
 */

const ROLES = [
  { id: 'operador_campo', label: 'Operador de Campo' },
  { id: 'asistente', label: 'Asistente' },
  { id: 'auditor', label: 'Auditor / Inspector' },
  { id: 'administrador', label: 'Administrador' },
  { id: 'agronomo', label: 'Agrónomo / Asesor' },
  { id: 'otro', label: 'Otro' },
];

export default function ProfileScreen({ onBack }) {
  const [name, setName] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('chagra:operator:name') || PRIMARY_WORKER_NAME
      : PRIMARY_WORKER_NAME
  );
  const [role, setRole] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('chagra:operator:role') || 'operador_campo'
      : 'operador_campo'
  );
  const [savedFlash, setSavedFlash] = useState(false);

  // Persistir cambios al storage en cada modificación + emitir custom event
  // (CodeQL flag #36/#37 contra StorageEvent ctor, migrado a CustomEvent
  // que es el patrón canónico para same-tab pub/sub. TopBar escucha ambos
  // 'storage' (cross-tab nativo) y 'chagra:operator-update' (same-tab).
  useEffect(() => {
    localStorage.setItem('chagra:operator:name', name);
    window.dispatchEvent(new CustomEvent('chagra:operator-update', {
      detail: { key: 'chagra:operator:name', value: name },
    }));
  }, [name]);

  useEffect(() => {
    localStorage.setItem('chagra:operator:role', role);
    window.dispatchEvent(new CustomEvent('chagra:operator-update', {
      detail: { key: 'chagra:operator:role', value: role },
    }));
  }, [role]);

  const handleSave = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const currentRoleLabel = ROLES.find(r => r.id === role)?.label || 'Operador de Campo';

  return (
    <ScreenShell title="Perfil de Usuario" icon={User} onBack={onBack}>
      <div className="flex flex-col gap-6 pb-8">
        {/* ID Card / User Info, header con datos sintetizados */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 border-2 border-emerald-500/30">
            <User size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white">{name}</h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">{currentRoleLabel}</p>
        </div>

        {/* Edit Form */}
        <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 px-1">
            <Briefcase size={18} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Datos del trabajador</h3>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Nombre completo</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Javier Andrés Rojas"
              className="p-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none text-white text-base min-h-[48px]"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Rol</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="p-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none text-white text-base min-h-[48px] appearance-none"
            >
              {ROLES.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleSave}
            className={`w-full p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all min-h-[48px] ${
              savedFlash ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
            }`}
          >
            {savedFlash ? <><Check size={18} /> Guardado</> : <><Save size={18} /> Guardar cambios</>}
          </button>
          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
            Los cambios se persisten localmente. Sin sincronización con FarmOS aún (planeado v1.x).
          </p>
        </div>

        {/* Theme Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Palette size={18} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Personalización</h3>
          </div>
          <ThemeSelector />
        </div>

        {/* App Info Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
          <p className="text-[10px] text-slate-600 font-mono tracking-tighter uppercase">
            Chagra Eco-OS • v0.8.4
          </p>
          <p className="text-[9px] text-slate-700 mt-1 max-w-[200px] mx-auto leading-tight">
            Diseñado para la soberanía alimentaria y la regeneración ecosistémica.
          </p>
        </div>
      </div>
    </ScreenShell>
  );
}
