import React from 'react';
import { Mountain, Thermometer, Droplets } from 'lucide-react';
import { PISOS_TERMICOS, altitudToPct, __ALTITUD_TECHO_M } from '../../services/directorioEspecies.js';

// Clases Tailwind estáticas por tono (el JIT necesita literales para purgar).
const TONE = {
  orange: { band: 'bg-orange-500/70', chip: 'bg-orange-500/20 text-orange-200 border-orange-500/40', dot: 'bg-orange-400' },
  amber: { band: 'bg-amber-500/70', chip: 'bg-amber-500/20 text-amber-200 border-amber-500/40', dot: 'bg-amber-400' },
  emerald: { band: 'bg-emerald-500/70', chip: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40', dot: 'bg-emerald-400' },
  indigo: { band: 'bg-indigo-500/70', chip: 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40', dot: 'bg-indigo-400' },
};

const ZONE_LABEL = { calido: 'Cálido', templado: 'Templado', frio: 'Frío', paramo: 'Páramo' };

/**
 * PisoTermicoBand — franja vertical de piso térmico + rango de altitud donde
 * prospera la especie. Datos REALES del catálogo (altitud_msnm + thermal_zones
 * + temperatura_c). Si no hay rango de altitud, cae a las zonas térmicas; si no
 * hay ninguno, muestra deflección honesta.
 *
 * @param {object} props
 * @param {{ thermalZones: string[], altitud: object|null, temperatura: object|null, agua: string|null }} props.pisoTermico
 */
export default function PisoTermicoBand({ pisoTermico }) {
  const { thermalZones = [], altitud = null, temperatura = null, agua = null } = pisoTermico || {};
  const zonesSet = new Set(thermalZones);

  const sinDato = !altitud && thermalZones.length === 0;
  if (sinDato) {
    return (
      <p className="text-sm text-slate-400 italic" data-testid="piso-sin-dato">
        Sin datos de piso térmico todavía para esta especie.
      </p>
    );
  }

  // Banda visual: 0 (abajo) → techo (arriba). Posicionamos la franja óptima
  // y los absolutos cuando hay altitud real.
  const top = altitud?.max_absoluto ?? altitud?.optimo_max ?? null;
  const bottom = altitud?.min_absoluto ?? altitud?.optimo_min ?? null;
  const optTop = altitud?.optimo_max ?? null;
  const optBottom = altitud?.optimo_min ?? null;

  const pctTop = altitudToPct(top);
  const pctOptTop = altitudToPct(optTop);
  const pctOptBottom = altitudToPct(optBottom);

  return (
    <div data-testid="piso-termico-band">
      <div className="flex gap-3">
        {/* Banda vertical de pisos térmicos */}
        <div className="relative w-16 shrink-0 h-44 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900">
          {/* Estratos de fondo (techo arriba → cálido abajo) */}
          <div className="absolute inset-0 flex flex-col-reverse">
            {PISOS_TERMICOS.map((p) => {
              const frac = (p.maxM - p.minM) / __ALTITUD_TECHO_M;
              const active = zonesSet.has(p.id);
              const tone = TONE[p.tone];
              return (
                <div
                  key={p.id}
                  className={`relative ${active ? tone.band : 'bg-slate-800/40'} transition-colors`}
                  style={{ flexGrow: frac }}
                  title={`${p.label} · ${p.minM}–${p.maxM} msnm`}
                >
                  {active && (
                    <span className="piso-band-label absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-tight uppercase">
                      {p.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Marcador del rango óptimo de altitud de la especie */}
          {pctOptBottom !== null && pctOptTop !== null && (
            <div
              className="absolute left-0 right-0 border-y-2 border-white/80 bg-white/10"
              style={{
                bottom: `${pctOptBottom}%`,
                height: `${Math.max(2, pctOptTop - pctOptBottom)}%`,
              }}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Lectura del rango */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
          {altitud ? (
            <div className="flex items-start gap-2">
              <Mountain size={18} className="text-slate-300 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="text-sm leading-tight">
                <p className="font-bold text-slate-100">
                  {fmtRange(optBottom, optTop)} <span className="font-normal text-slate-400">óptimo</span>
                </p>
                {(bottom !== null || top !== null) && (
                  <p className="text-xs text-slate-400">
                    Tolera {fmtRange(bottom, top)} msnm
                  </p>
                )}
                {pctTop !== null && (
                  <p className="text-[10px] text-slate-500 mt-0.5">en la franja sobre el nivel del mar</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Sin rango de altitud exacto; pisos térmicos referenciales.</p>
          )}

          {temperatura && (temperatura.optimo_min != null || temperatura.optimo_max != null) && (
            <div className="flex items-center gap-2 text-sm text-slate-200">
              <Thermometer size={16} className="text-rose-300 shrink-0" aria-hidden="true" />
              <span>
                {fmtTemp(temperatura.optimo_min, temperatura.optimo_max)}
                {typeof temperatura.helada_letal === 'number' && (
                  <span className="text-xs text-slate-400"> · helada letal {temperatura.helada_letal} °C</span>
                )}
              </span>
            </div>
          )}

          {agua && (
            <div className="flex items-center gap-2 text-sm text-slate-200">
              <Droplets size={16} className="text-sky-300 shrink-0" aria-hidden="true" />
              <span className="capitalize">Requerimiento de agua: {agua}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chips de pisos donde prospera */}
      {thermalZones.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {thermalZones.map((z) => {
            const piso = PISOS_TERMICOS.find((p) => p.id === z);
            const tone = piso ? TONE[piso.tone] : TONE.emerald;
            return (
              <span
                key={z}
                className={`px-2.5 py-1 rounded-md border text-xs font-bold ${tone.chip}`}
              >
                {ZONE_LABEL[z] || z}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fmtRange(a, b) {
  if (a != null && b != null) return `${a.toLocaleString('es-CO')}–${b.toLocaleString('es-CO')}`;
  if (a != null) return `desde ${a.toLocaleString('es-CO')}`;
  if (b != null) return `hasta ${b.toLocaleString('es-CO')}`;
  return '—';
}

function fmtTemp(a, b) {
  if (a != null && b != null) return `${a}–${b} °C óptimo`;
  if (a != null) return `desde ${a} °C`;
  if (b != null) return `hasta ${b} °C`;
  return '—';
}
