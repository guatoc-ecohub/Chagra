import { useCallback, useMemo, useState } from 'react';
import {
  Mic, Sprout, FlaskConical, Ban, RotateCcw, ChevronLeft,
  Leaf, AlertTriangle, GitBranch, RefreshCw,
} from 'lucide-react';
import VoiceCapture from './VoiceCapture';
import PhenologyTimeline from './PhenologyTimeline';
import CicloDetalle from './CicloDetalle';
import ChagraGrowLoader from './ChagraGrowLoader';
import { buildPlantDossier } from '../services/plantDossierService';
import { getProfile } from '../services/userProfileService';

/**
 * PlantaPorVozScreen — MÓDULO UNIFICADO de ingreso por voz de una planta.
 *
 * Único punto de entrada desde la mano (Ⓐ / AgentRedMenu, capacidad `voz`).
 * Reúne en un solo flujo lo que estaba fragmentado en pantallas separadas
 * (voz, ciclo, biopreparados, procesos):
 *
 *   PASO 1 (CAPTURA) — reusa VoiceCapture TAL CUAL: grabar audio, transcripción
 *   visible, extracción de ENTIDADES visible (streaming), y la confirmación con
 *   SUGERENCIAS (companions) + ANTAGONISTAS del RAG. NADA de esto se pierde.
 *
 *   PASO 2 (DOSSIER) — tras guardar, sobre la MISMA planta muestra:
 *     · CICLO GENEALÓGICO (fenología: etapas siembra→cosecha) — PhenologyTimeline
 *     · BIOINSUMOS/biopreparados aplicables — plantDossierService (grafo AGE + catálogo)
 *     · TODOS los CICLOS asociados (FarmProcess) — CicloDetalle
 *     · COMPAÑEROS + ANTAGONISTAS — plantDossierService (grafo AGE + gremios + RAG)
 *
 * No reimplementa servicios: orquesta los existentes (verify-first, audit
 * 2026-06-15). Degrada con gracia offline — el dossier siempre muestra algo.
 */

const altitudeFromProfile = () => {
  const v = getProfile()?.finca_altitud;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function SectionTitle({ icon: Icon, children, hint }) {
  return (
    <h2 className="flex items-center gap-2 text-2xs uppercase font-bold text-slate-500 mb-2">
      {Icon && <Icon size={13} className="text-slate-400" />}
      <span>{children}</span>
      {hint && <span className="ml-auto normal-case font-normal text-slate-600">{hint}</span>}
    </h2>
  );
}

/** Lista de especies (companion/antagonista) como chips legibles. */
function SpeciesChips({ list, tone }) {
  const palette = tone === 'bad'
    ? 'bg-red-900/25 border-red-800/50 text-red-200'
    : 'bg-emerald-900/20 border-emerald-800/50 text-emerald-200';
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((s, i) => (
        <span
          key={s.slug || s.name || i}
          title={s.reason || ''}
          className={`text-xs font-semibold rounded-full border px-2.5 py-1 ${palette}`}
        >
          {s.name}
        </span>
      ))}
    </div>
  );
}

/** Tarjeta-dossier de UNA planta agregada por voz. */
function PlantDossierCard({ dossier, altitudeM, onReloadCycles }) {
  const { label, slug, cycle, bioinsumos, relations, cycles, sowingDate } = dossier;
  const companions = relations?.companions || [];
  const antagonists = relations?.antagonists || [];
  const bios = bioinsumos?.items || [];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-5">
      {/* Encabezado de la planta */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-lime-700/30 border border-lime-700/50 flex items-center justify-center shrink-0">
          <Leaf size={22} className="text-lime-300" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-lime-200 truncate">{label}</p>
          <p className="text-xs text-slate-500">Registrada por voz</p>
        </div>
      </div>

      {/* 1 · CICLO GENEALÓGICO (fenología) */}
      <section>
        <SectionTitle icon={GitBranch} hint={cycle ? 'fuente: catálogo' : null}>
          Ciclo de vida de la planta
        </SectionTitle>
        {cycle ? (
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-2">
            <PhenologyTimeline speciesSlug={slug} sowingDate={sowingDate} altitudeM={altitudeM} />
          </div>
        ) : (
          <p className="text-xs text-slate-500 bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2">
            Aún no hay una plantilla de etapas para esta especie. Cuando registres
            su ciclo, lo verás aquí con sus labores por etapa.
          </p>
        )}
      </section>

      {/* 2 · BIOINSUMOS / BIOPREPARADOS aplicables */}
      <section>
        <SectionTitle icon={FlaskConical} hint={bioinsumos?.fromGraph ? 'grafo + catálogo' : 'catálogo'}>
          Bioinsumos que le puedes poner
        </SectionTitle>
        {bios.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {bios.map((b, i) => (
              <li
                key={b.nombre || i}
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 flex items-start gap-2"
              >
                <FlaskConical size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-sm text-slate-200">
                  <strong>{b.nombre}</strong>
                  {b.uso ? <span className="text-slate-400"> — {b.uso}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">Sin biopreparados sugeridos por ahora.</p>
        )}
      </section>

      {/* 4 (parte) · COMPAÑEROS + ANTAGONISTAS */}
      {(companions.length > 0 || antagonists.length > 0) && (
        <section className="flex flex-col gap-3">
          {companions.length > 0 && (
            <div>
              <SectionTitle icon={Sprout} hint={relations?.fromGraph ? 'grafo + gremios' : 'gremios'}>
                Va bien sembrada junto a
              </SectionTitle>
              <SpeciesChips list={companions} tone="good" />
            </div>
          )}
          {antagonists.length > 0 && (
            <div>
              <SectionTitle icon={Ban} hint={null}>Evita sembrarla junto a</SectionTitle>
              <SpeciesChips list={antagonists} tone="bad" />
            </div>
          )}
        </section>
      )}

      {/* 3 · TODOS LOS CICLOS asociados (FarmProcess) */}
      <section>
        <SectionTitle
          icon={RefreshCw}
          hint={cycles.length > 0 ? `${cycles.length} ciclo${cycles.length > 1 ? 's' : ''}` : null}
        >
          Ciclos de esta planta en tu finca
        </SectionTitle>
        {cycles.length > 0 ? (
          <div className="flex flex-col gap-3">
            {cycles.map((c) => (
              <div
                key={c.process_id || c.id}
                className="bg-slate-950/40 border border-slate-800 rounded-xl overflow-hidden"
              >
                <CicloDetalle cycle={c} altitudeM={altitudeM} onReload={onReloadCycles} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2">
            El ciclo se está creando a partir de tu siembra. Si no aparece de
            inmediato, vuelve a entrar; quedará registrado en "Ciclo del cultivo".
          </p>
        )}
      </section>
    </div>
  );
}

export default function PlantaPorVozScreen({ onBack, onSave }) {
  // 'capture' = flujo VoiceCapture; 'loading' = armando dossier; 'dossier' = resultado.
  const [phase, setPhase] = useState('capture');
  const [dossiers, setDossiers] = useState([]);
  const altitudeM = useMemo(() => altitudeFromProfile(), []);

  // Reconstruye el dossier (re-lee ciclos asociados). Usado tras guardar y al
  // recargar una etapa desde CicloDetalle. `sowingDate` se fija aquí (no en
  // render) para que la timeline fenológica sea estable entre re-renders.
  const buildDossiers = useCallback(async (plants) => {
    const valid = (Array.isArray(plants) ? plants : []).filter((p) => p && (p.cropSlug || p.slug));
    // Dedupe por slug: si el usuario dijo "5 tomates" expandido, basta un dossier
    // por especie.
    const bySlug = new Map();
    for (const p of valid) {
      const k = p.cropSlug || p.slug;
      if (!bySlug.has(k)) bySlug.set(k, p);
    }
    const list = Array.from(bySlug.values());
    if (list.length === 0) return [];
    const built = await Promise.all(list.map((p) => buildPlantDossier(p).catch(() => null)));
    return built.filter(Boolean).map((d) => {
      // Fecha de siembra para la fenología: la del ciclo asociado más reciente,
      // o ahora si aún no hay ciclo persistido (recién guardado).
      const created = d.cycles?.[0]?.attributes?.created_at;
      const ts = created ? Date.parse(created) : Date.now();
      return { ...d, sowingDate: Number.isFinite(ts) ? ts : Date.now() };
    });
  }, []);

  const handlePlantsSaved = useCallback(async (plants) => {
    setPhase('loading');
    // Pequeño respiro para que farmEventService.createFarmProcess (disparado por
    // el guardado de la siembra) persista el FarmProcess antes de leerlo.
    await new Promise((r) => setTimeout(r, 350));
    const built = await buildDossiers(plants);
    // Si ninguna planta resolvió a una ficha de catálogo, no hay dossier que
    // mostrar → volvemos directo a la captura (sin pasar por el efecto, que
    // dispararía un render en cascada — react-hooks/set-state-in-effect).
    if (built.length === 0) {
      setPhase('capture');
      return;
    }
    setDossiers(built);
    setPhase('dossier');
  }, [buildDossiers]);

  // Recarga los ciclos asociados (p.ej. tras confirmar una etapa en CicloDetalle).
  const reloadCycles = useCallback(async () => {
    const plants = dossiers.map((d) => ({ cropSlug: d.slug, canonical: d.label }));
    const rebuilt = await buildDossiers(plants);
    if (rebuilt.length > 0) setDossiers(rebuilt);
  }, [dossiers, buildDossiers]);

  const startOver = useCallback(() => {
    setDossiers([]);
    setPhase('capture');
  }, []);

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col" data-testid="planta-por-voz">
      <header className="flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={phase === 'dossier' ? startOver : onBack}
          aria-label="Volver"
          className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <Mic size={18} className="text-lime-400 shrink-0" />
          <h1 className="text-base font-bold truncate">Agregar planta por voz</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {phase === 'capture' && (
          <>
            <p className="px-4 text-sm text-slate-400">
              Dime qué sembraste. Te muestro lo que entendí, y al guardar verás su
              ciclo de vida, los bioinsumos que le puedes poner y con qué plantas
              va bien o mal.
            </p>
            <VoiceCapture onSave={onSave} onPlantsSaved={handlePlantsSaved} hideDoneScreen />
          </>
        )}

        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="text-lime-400"><ChagraGrowLoader size={64} /></div>
            <p className="text-sm text-slate-400">Armando la ficha de tu planta…</p>
          </div>
        )}

        {phase === 'dossier' && dossiers.length > 0 && (
          <div className="px-4 pb-12 flex flex-col gap-5">
            <div className="flex items-center gap-2 bg-green-900/20 border border-green-800/50 rounded-xl px-3 py-2">
              <Sprout size={16} className="text-green-400 shrink-0" />
              <p className="text-sm text-green-200">
                Listo. {dossiers.length === 1 ? 'Tu planta quedó registrada.' : `${dossiers.length} plantas quedaron registradas.`}
              </p>
            </div>

            {dossiers.map((d) => (
              <PlantDossierCard
                key={d.slug || d.label}
                dossier={d}
                altitudeM={altitudeM}
                onReloadCycles={reloadCycles}
              />
            ))}

            <div className="flex flex-wrap gap-2 justify-center pt-1">
              <button
                type="button"
                onClick={startOver}
                className="px-6 py-3 min-h-[44px] bg-lime-700 hover:bg-lime-600 rounded-xl font-bold flex items-center gap-2"
              >
                <Mic size={18} /> Agregar otra planta
              </button>
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 min-h-[44px] bg-slate-800 hover:bg-slate-700 rounded-xl font-bold flex items-center gap-2 text-slate-200"
              >
                <RotateCcw size={18} /> Volver al inicio
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
