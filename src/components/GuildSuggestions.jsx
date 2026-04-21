import React, { useState, useEffect, useMemo } from 'react';
import { Sprout, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { getSuggestedCompanions, buildGuildPrompt } from '../services/guildService';
import { SPECIES_DEFAULTS } from '../config/speciesDefaults';
import { CROP_TAXONOMY } from '../config/taxonomy';

/**
 * GuildSuggestions — Panel de compañeros sugeridos y antagonistas (Fase 18).
 *
 * Renderiza resultados de las 3 capas del motor de gremios:
 *   1. Compañeros directos (speciesDefaults.companions)
 *   2. Complementos estructurales (estrato + gremio)
 *   3. Inferencia IA (Ollama/Gemma 4) — bajo demanda
 *
 * Props:
 *   - speciesId:       id de la especie seleccionada
 *   - onSelectCompanion: callback(speciesName, speciesId?) para siembra rápida.
 *                        Capas 1/2 (companions de speciesDefaults) pasan id
 *                        garantizado; capa 3 (IA) pasa solo name (free-form).
 *                        Los callers legacy que solo usan el primer arg
 *                        siguen funcionando (AssetsDashboard).
 */

const ALL_SPECIES = Object.entries(CROP_TAXONOMY).flatMap(([, group]) => group.species);

export const GuildSuggestions = ({ speciesId, onSelectCompanion }) => {
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Capas 1 + 2: estáticas + estructurales
  const { companions, antagonists } = useMemo(() => {
    if (!speciesId) return { companions: [], antagonists: [] };
    return getSuggestedCompanions(speciesId);
  }, [speciesId]);

  // Reset IA al cambiar de especie
  useEffect(() => {
    setAiSuggestions([]);
    setAiError(null);
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
      {/* Compañeros sugeridos (Capas 1 + 2) */}
      {companions.length > 0 && (
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
            <Sprout size={12} /> Compañeros sugeridos
          </label>
          <div className="flex flex-wrap gap-1.5">
            {companions.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCompanion && onSelectCompanion(c.name, c.id)}
                className="text-xs px-3 py-2 rounded-full bg-lime-900/30 text-lime-400 border border-lime-800 hover:bg-lime-800/40 transition-all active:scale-95"
                title={c.reason}
              >
                {c.name.split(' (')[0]}
              </button>
            ))}
          </div>
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

      {/* Capa 3 — Consulta IA */}
      <div>
        <button
          type="button"
          onClick={handleAiQuery}
          disabled={aiLoading || !navigator.onLine}
          className="text-xs px-3 py-2 rounded-lg bg-purple-900/30 text-purple-400 border border-purple-800 hover:bg-purple-800/40 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
        >
          {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {aiLoading ? 'Consultando Gemma 4…' : 'Consultar Gremio IA'}
        </button>

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
                title={s.reason}
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
