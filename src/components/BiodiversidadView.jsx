/**
 * BiodiversidadView — Vista del ecosistema y diversidad biológica de la finca.
 *
 * Fondo dinámico servido desde FarmOS: el archivo más reciente cuyo nombre
 * contenga "chagra-bg-biodiversidad" se aplica como background-image. Si no
 * existe tal archivo o el dispositivo está offline sin caché previo, se
 * muestra el patrón biopunk por defecto.
 *
 * El bot de Telegram (OpenFang "Personal_Hand_Kortux") puede actualizar
 * este fondo subiendo una foto a /api/file/upload con el filename
 * "chagra-bg-biodiversidad-<timestamp>.<ext>".
 */
import React, { useMemo } from 'react';
import { Leaf } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import useAssetStore from '../store/useAssetStore';
import { useBackgroundImage } from '../hooks/useBackgroundImage';

const STRATA = [
  { key: 'emergente', label: 'Emergente', color: 'text-emerald-300' },
  { key: 'alto',      label: 'Alto',      color: 'text-lime-300'    },
  { key: 'medio',     label: 'Medio',     color: 'text-amber-300'   },
  { key: 'bajo',      label: 'Bajo',      color: 'text-orange-300'  },
];

export default function BiodiversidadView({ onBack }) {
  const plants = useAssetStore((s) => s.plants || []);
  const { url: bgUrl, loading: bgLoading } = useBackgroundImage('chagra-bg-biodiversidad');

  const { speciesCount, strataCount, guildsCount, byStratum } = useMemo(() => {
    const species = new Set();
    const guilds = new Set();
    const strata = new Set();
    const perStratum = Object.fromEntries(STRATA.map((s) => [s.key, 0]));

    // formatNotes() en AssetsDashboard guarda así:
    //   "Notas usuario | Estrato: Medio (2-10m) | Gremio: Productivo principal"
    // Delimitador: " | " (NO saltos de línea). El regex debe detenerse en "|".
    const FIELD_RE = (key) => new RegExp(`${key}:\\s*([^|]+?)\\s*(?:\\||$)`, 'i');

    for (const p of plants) {
      const attrs = p.attributes || {};
      // Especie se guarda en attributes.name (no en notes).
      const name = (attrs.name || '').trim();
      if (name) species.add(name.toLowerCase());

      const notesValue =
        (typeof attrs.notes === 'object' ? attrs.notes?.value : attrs.notes) || '';

      const gremio = notesValue.match(FIELD_RE('Gremio'))?.[1]?.trim();
      if (gremio) guilds.add(gremio.toLowerCase());

      const stratumRaw = notesValue.match(FIELD_RE('Estrato'))?.[1]?.trim().toLowerCase();
      if (stratumRaw) {
        strata.add(stratumRaw);
        // El label guardado es "Medio (2-10m)"; comparamos por prefijo de la palabra clave.
        const key = STRATA.find((s) => stratumRaw.startsWith(s.key) || stratumRaw.includes(` ${s.key} `))?.key;
        if (key) perStratum[key] += 1;
      }
    }

    return {
      speciesCount: species.size,
      strataCount: strata.size,
      guildsCount: guilds.size,
      byStratum: perStratum,
    };
  }, [plants]);

  const customBgStyle = bgUrl
    ? {
        backgroundImage: `linear-gradient(rgba(2,6,23,0.72), rgba(2,6,23,0.82)), url(${bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }
    : undefined;

  return (
    <ScreenShell title="Biodiversidad" icon={Leaf} onBack={onBack}>
      <div
        className={`min-h-full p-4 flex flex-col gap-4 ${bgUrl ? '' : 'bg-biopunk-pattern'}`}
        style={customBgStyle}
      >
        <section className="grid grid-cols-3 gap-2">
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-3 text-center">
            <p className="text-3xl font-black text-emerald-300 tabular-nums">{speciesCount}</p>
            <p className="text-2xs text-slate-400 uppercase font-bold mt-1">Especies</p>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-3 text-center">
            <p className="text-3xl font-black text-amber-300 tabular-nums">{strataCount}</p>
            <p className="text-2xs text-slate-400 uppercase font-bold mt-1">Estratos</p>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-3 text-center">
            <p className="text-3xl font-black text-lime-300 tabular-nums">{guildsCount}</p>
            <p className="text-2xs text-slate-400 uppercase font-bold mt-1">Gremios</p>
          </div>
        </section>

        <section className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Leaf size={16} className="text-emerald-400" aria-hidden="true" />
            Distribución por estrato ecológico
          </h2>
          <div className="flex flex-col gap-2">
            {STRATA.map((s) => {
              const count = byStratum[s.key] || 0;
              const pct = plants.length > 0 ? Math.round((count / plants.length) * 100) : 0;
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-20 ${s.color}`}>{s.label}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/60"
                      style={{ width: `${pct}%` }}
                      aria-label={`${pct}% de los cultivos`}
                    />
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums w-12 text-right">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
          {plants.length === 0 && (
            <p className="text-xs text-slate-500 italic mt-3">
              Aún no hay cultivos registrados. Registra un activo de tipo Cultivo desde Activos →
              Cultivos para empezar a poblar esta vista.
            </p>
          )}
        </section>

        <section className="bg-slate-900/70 backdrop-blur-sm border border-slate-800/60 rounded-xl p-4 mt-auto">
          <p className="text-2xs text-slate-500 leading-relaxed">
            El fondo de esta vista se actualiza desde Telegram enviando una foto al bot con la
            indicación <span className="text-slate-300 font-mono">fondo biodiversidad</span>.
            {bgLoading && !bgUrl && ' Cargando fondo…'}
          </p>
        </section>
      </div>
    </ScreenShell>
  );
}
