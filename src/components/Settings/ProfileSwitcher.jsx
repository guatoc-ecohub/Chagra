import React, { useState } from 'react';
import { UserCog, Check } from 'lucide-react';
import { PROFILE_PRESETS, getActivePresetId, applyProfilePreset } from '../../services/profilePresets';
import { MSG } from '../../config/messages';

/**
 * ProfileSwitcher — selector de PERFIL activo in-app (tarea #33).
 *
 * Control claro y accesible para cambiar entre perfiles (campesino, cafetero,
 * cacaotero, corporativo). Al elegir uno, cambia el `rol` activo del perfil —
 * lo que afecta los chips del agente, los módulos del home y las asociaciones
 * por rol (ver profilePresets para el mapeo a roles REALES).
 *
 * Operador (demo 2026-06-19): "nunca he visto cómo switchear a los perfiles
 * corporativos". Este control lo expone donde el operador ya va a configurar su
 * perfil (pestaña Perfil de ProfileScreen).
 *
 * mobile-first: tarjetas grandes (min-h 64px) apilables, radiogroup accesible.
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */
export default function ProfileSwitcher() {
  const [activeId, setActiveId] = useState(() => {
    try { return getActivePresetId(); } catch (_) { return 'campesino'; }
  });
  const [flash, setFlash] = useState(false);

  const handleSelect = (presetId) => {
    if (presetId === activeId) return;
    applyProfilePreset(presetId);
    setActiveId(presetId);
    setFlash(true);
    setTimeout(() => setFlash(false), 1500);
  };

  return (
    <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 px-1">
        <UserCog size={18} className="text-emerald-400" aria-hidden="true" />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{MSG.perfil.perfilActivo}</h3>
        {flash && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
            <Check size={13} aria-hidden="true" /> Cambiado
          </span>
        )}
      </div>

      <p className="text-[11px] text-slate-500 leading-snug px-1">
        Cambia tu perfil para ver las herramientas, los módulos y las asociaciones
        pensadas para tu actividad. Puedes cambiarlo cuando quieras.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label={MSG.perfil.perfilActivo}>
        {PROFILE_PRESETS.map((preset) => {
          const isActive = activeId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              data-testid={`profile-preset-${preset.id}`}
              onClick={() => handleSelect(preset.id)}
              className={`text-left rounded-2xl p-4 border transition-colors min-h-[72px] flex items-start gap-3 ${
                isActive
                  ? 'bg-emerald-900/30 border-emerald-600/60 ring-2 ring-emerald-500/40'
                  : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800/70'
              }`}
            >
              <span aria-hidden="true" className="text-2xl shrink-0 leading-none mt-0.5">{preset.emoji}</span>
              <span className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  {preset.label}
                  {isActive && <Check size={14} className="text-emerald-400 shrink-0" aria-hidden="true" />}
                </span>
                <span className="text-[11px] text-slate-400 leading-snug">{preset.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
