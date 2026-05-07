import React, { useState, useEffect, useMemo } from 'react';
import { Sprout, AlertTriangle, Sparkles, Loader2, Check } from 'lucide-react';
import { getSuggestedCompanions, buildGuildPrompt } from '../services/guildService';
import { SPECIES_DEFAULTS } from '../config/speciesDefaults';
import { CROP_TAXONOMY } from '../config/taxonomy';
import { registry } from '../core/moduleRegistry';
import useAssetStore from '../store/useAssetStore';
import ExternalAiButton from './common/ExternalAiButton';
import { buildGuildExternalPrompt } from '../services/externalAiPromptBuilder';

// Autopilot #8 (2026-05-03): re-rank companions putting existing plants first.
// Reduce friction de "tengo que comprar otra especie", mostrar primero las
// que el operador ya tiene es más accionable.
function normName(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+#\d+$/, '').trim();
}

function buildExistingSpeciesSet(plants) {
  const set = new Set();
  for (const p of plants || []) {
    const name = p.attributes?.name || p.name || '';
    if (name) set.add(normName(name));
  }
  return set;
}

function isCompanionInFinca(companionName, existingSet) {
  if (!existingSet || existingSet.size === 0) return false;
  const target = normName(companionName.split(' (')[0]);
  if (!target) return false;
  for (const existing of existingSet) {
    if (existing === target || existing.includes(target) || target.includes(existing)) {
      return true;
    }
  }
  return false;
}

/**
 * GuildSuggestions, Panel de compañeros sugeridos y antagonistas (Fase 18).
 *
 * Renderiza resultados de las 3 capas del motor de gremios:
 *   1. Compañeros directos (speciesDefaults.companions)
 *   2. Complementos estructurales (estrato + gremio)
 *   3. Inferencia IA (Ollama/Gemma 4), bajo demanda
 *
 * Props:
 *   - speciesId:       id de la especie seleccionada
 *   - onSelectCompanion: callback(speciesName) para siembra rápida
 */

const ALL_SPECIES = Object.entries(CROP_TAXONOMY).flatMap(([, group]) => group.species);

export const GuildSuggestions = ({ speciesId, onSelectCompanion }) => {
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [EnrichedComp, setEnrichedComp] = useState(null);

  // Plantas existentes en finca para re-ranking de companions (Autopilot #8).
  const userPlants = useAssetStore((s) => s.plants);
  const existingSpeciesSet = useMemo(() => buildExistingSpeciesSet(userPlants), [userPlants]);

  // Capas 1 + 2: estáticas + estructurales, re-ranked con companions existentes primero.
  const { companions, antagonists } = useMemo(() => {
    if (!speciesId) return { companions: [], antagonists: [] };
    const raw = getSuggestedCompanions(speciesId);
    // Anotar cada companion con flag isInFinca y ordenar (existentes primero).
    const annotated = raw.companions.map((c) => ({
      ...c,
      isInFinca: isCompanionInFinca(c.name, existingSpeciesSet),
    }));
    annotated.sort((a, b) => {
      if (a.isInFinca !== b.isInFinca) return a.isInFinca ? -1 : 1;
      return 0; // mantener orden original dentro de cada grupo
    });
    return { companions: annotated, antagonists: raw.antagonists };
  }, [speciesId, existingSpeciesSet]);

  const inFincaCount = useMemo(() => companions.filter((c) => c.isInFinca).length, [companions]);

  // Reset IA al cambiar de especie
  useEffect(() => {
    setAiSuggestions([]);
    setAiError(null);
  }, [speciesId]);

  // Capa 3 enriquecida por módulo Pro si está registrado (ADR-002/011).
  // Si no hay módulo Pro, la capa 3 cae al path OSS Ollama existente.
  useEffect(() => {
    let alive = true;
    const mods = registry.byCapability('enriched-guild-suggestions');
    if (mods.length === 0) {
      setEnrichedComp(null);
      return;
    }
    mods[0].mount().then((m) => {
      if (alive && m && m.default) setEnrichedComp(() => m.default);
    }).catch(() => { /* módulo no montable, seguir con OSS */ });
    return () => { alive = false; };
  }, [speciesId]);

  if (!speciesId || !SPECIES_DEFAULTS[speciesId]) return null;

  const defaults = SPECIES_DEFAULTS[speciesId];
  const speciesName = ALL_SPECIES.find((sp) => sp.id === speciesId)?.name || speciesId;

  // Capa 3: Consulta cognitiva (streaming para evitar timeout de Cloudflare)
  const handleAiQuery = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const prompt = buildGuildPrompt(speciesName, defaults.estrato);
      const res = await fetch('/api/ollama/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3.5:4b',
          think: false,
          stream: false,
          messages: [
            { role: 'system', content: 'Asistente de diseño de gremios agroecológicos. Responde SOLO en JSON válido, sin texto adicional.' },
            { role: 'user', content: prompt }
          ],
          options: { num_predict: 300, temperature: 0.3 }
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        console.warn(`[GuildAI] Ollama ${res.status}. Body: ${detail.slice(0, 200)}`);
        throw new Error(`Ollama ${res.status}`);
      }

      const data = await res.json();
      const fullText = data.message?.content || '';
      const cleaned = fullText.replace(/```json\s*/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        setAiSuggestions(parsed.slice(0, 5));
      }
    } catch (err) {
      console.error('[GuildAI] Error:', err);
      setAiError('IA no disponible. Usa las sugerencias estáticas.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Compañeros sugeridos (Capas 1 + 2), Autopilot #8: existentes primero */}
      {companions.length > 0 && (
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
            <Sprout size={12} /> Compañeros sugeridos
            {inFincaCount > 0 && (
              <span className="text-[10px] font-normal text-emerald-400 ml-1">
                · {inFincaCount} ya en tu finca
              </span>
            )}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {companions.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCompanion && onSelectCompanion(c.name)}
                className={`text-xs px-3 py-2 rounded-full border transition-all active:scale-95 inline-flex items-center gap-1 ${
                  c.isInFinca
                    ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700 hover:bg-emerald-800/50'
                    : 'bg-lime-900/30 text-lime-400 border-lime-800 hover:bg-lime-800/40'
                }`}
                title={c.isInFinca ? `${c.reason} · Ya tenés esta especie` : c.reason}
              >
                {c.isInFinca && <Check size={10} />}
                {c.name.split(' (')[0]}
              </button>
            ))}
          </div>
          {/* Detalles colapsables: razón por companion. Visible en mobile sin
              hover (donde title= no funciona). Default cerrado para no
              saturar; el operador expande si quiere entender el filtro. */}
          <details className="mt-2 text-[11px] text-slate-500">
            <summary className="cursor-pointer hover:text-slate-300 select-none">
              ¿Por qué estos compañeros?
            </summary>
            <ul className="mt-1.5 pl-3 space-y-0.5 list-disc marker:text-slate-700">
              {companions.map((c) => (
                <li key={c.id}>
                  <span className="text-slate-300">{c.name.split(' (')[0]}</span>
                  <span className="text-slate-500">: {c.reason}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[10px] italic text-slate-600">
              Filtros funcionales aplicados: estrato, ciclo, sombra (ADR-034). Especies de gran porte se excluyen para hortalizas anuales.
            </p>
          </details>
        </div>
      )}

      {/* Antagonistas */}
      {antagonists.length > 0 && (
        <div>
          <label className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1 mb-1">
            <AlertTriangle size={12} /> Incompatibles
          </label>
          <div className="flex flex-wrap gap-1.5">
            {antagonists.map((a) => (
              <span
                key={a.id}
                className="text-xs px-2.5 py-1 rounded-full bg-red-900/30 text-red-400 border border-red-800"
                title={a.reason}
              >
                ⚠ {a.name.split(' (')[0]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Capa 3 enriquecida, Pro module si está registrado */}
      {EnrichedComp && (
        <EnrichedComp
          speciesId={speciesId}
          speciesName={speciesName}
          onSelectCompanion={onSelectCompanion}
        />
      )}

      {/* Capa 3, Consulta IA en vivo (siempre disponible, OSS) */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAiQuery}
            disabled={aiLoading || !navigator.onLine}
            className="text-xs px-3 py-2 rounded-lg bg-purple-900/30 text-purple-400 border border-purple-800 hover:bg-purple-800/40 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {aiLoading ? 'Consultando Gemma 4…' : 'Consultar Gremio IA'}
          </button>

          <ExternalAiButton
            buildPrompt={buildGuildExternalPrompt}
            context={{
              speciesName,
              estrato: defaults.estrato,
              companions: companions.map((c) => c.name),
              antagonists: antagonists.map((a) => a.name),
              thermalZones: defaults.thermalZones || [],
              altitudMsnm: defaults.altitud_msnm?.optimo_min,
            }}
          />
        </div>

        {aiError && (
          <p className="text-[10px] text-red-400 mt-1">{aiError}</p>
        )}

        {aiSuggestions.length > 0 && (
          <div className="mt-2 space-y-1">
            {aiSuggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectCompanion && onSelectCompanion(s.name)}
                className="w-full text-left p-2 rounded-lg bg-purple-900/20 border border-purple-800/50 hover:bg-purple-900/40 transition-colors"
              >
                <span className="text-xs text-purple-300 font-medium block">{s.name}</span>
                <span className="text-[10px] text-slate-500">{s.reason}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuildSuggestions;
