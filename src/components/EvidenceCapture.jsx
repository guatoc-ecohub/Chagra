import React, { useState, useEffect, useRef } from 'react';
import { Camera, Trash2, Loader2, Image as ImageIcon, Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { optimizeImage, blobToDataUrl } from '../utils/imageProcessor';
import { mediaCache } from '../db/mediaCache';
import { analyzeFoliage } from '../services/aiService';
import { proximityCheck } from '../utils/spatialAnalysis';
import { wktToGeoJson } from '../utils/geo';
import StreamingText from './common/StreamingText';

/**
 * EvidenceCapture — Captura con diagnóstico IA y evolución histórica (Fase 20.2b).
 *
 * Props:
 *   - logId:          UUID del log
 *   - assetId:        UUID del activo relacionado (para historial)
 *   - assetGeometry:  WKT o GeoJSON de la ubicación del activo
 *   - onCountChange:  callback(count)
 *   - onDiagnosis:    callback(diagnosis) — para toast externo
 *   - disabled:       boolean
 */
export const EvidenceCapture = ({
  logId,
  assetId = null,
  assetGeometry = null,
  onCountChange,
  onDiagnosis,
  disabled = false,
}) => {
  const [previews, setPreviews] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [previousCapture, setPreviousCapture] = useState(null); // { dataUrl, diagnosis }
  // Texto acumulado del LLM durante el diagnóstico (streaming NDJSON). Se
  // muestra con efecto typewriter mientras `diagnosing` es true.
  const [liveDiagnosis, setLiveDiagnosis] = useState('');
  const inputRef = useRef(null);

  // Cargar evidencias existentes + historial anterior del asset
  useEffect(() => {
    if (!logId) return;
    (async () => {
      try {
        const existing = await mediaCache.getByLogId(logId);
        const withPreviews = await Promise.all(
          existing.map(async (item) => ({
            id: item.id,
            dataUrl: await blobToDataUrl(item.blob),
            ai_diagnosis: item.ai_diagnosis,
          }))
        );
        setPreviews(withPreviews);
        onCountChange?.(withPreviews.length);
        if (withPreviews.length > 0 && withPreviews[0].ai_diagnosis) {
          setDiagnosis(withPreviews[0].ai_diagnosis);
        }
      } catch (err) {
        console.error('[EvidenceCapture] Error cargando existentes:', err);
      }
    })();

    // Historial: buscar captura anterior de este asset
    if (assetId) {
      (async () => {
        try {
          const history = await mediaCache.getByAssetId(assetId);
          // Filtrar capturas de OTROS logs (no el actual)
          const prev = history.find((h) => h.logId !== logId && h.blob);
          if (prev) {
            const dataUrl = await blobToDataUrl(prev.blob);
            setPreviousCapture({ dataUrl, diagnosis: prev.ai_diagnosis });
          }
        } catch (err) {
          console.warn('[EvidenceCapture] Sin historial previo:', err.message);
        }
      })();
    }
  }, [logId, assetId]);

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !logId) return;

    // Proximity gate: verificar que el operario esté cerca del activo
    if (assetGeometry && navigator.geolocation) {
      try {
        const gpsPos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 })
        );
        const rawGeo = typeof assetGeometry === 'string' ? wktToGeoJson(assetGeometry) : assetGeometry;
        if (rawGeo) {
          const { distance, isClose } = proximityCheck(gpsPos, rawGeo);
          if (!isClose) {
            const ok = window.confirm(
              `Ubicación a ${distance}m del activo (>50m). ¿Confirmas captura remota?`
            );
            if (!ok) { if (inputRef.current) inputRef.current.value = ''; return; }
          }
        }
      } catch (gpsErr) {
        console.warn('[EvidenceCapture] GPS no disponible para proximity gate.');
      }
    }

    setProcessing(true);
    try {
      const optimized = await optimizeImage(file);
      const mediaId = await mediaCache.save(logId, optimized, { assetId });
      const dataUrl = await blobToDataUrl(optimized);

      const next = [...previews, { id: mediaId, dataUrl, ai_diagnosis: null }];
      setPreviews(next);
      onCountChange?.(next.length);

      console.info(`[Evidence] Foto ${mediaId} guardada (${(optimized.size / 1024).toFixed(0)} KB).`);

      // Diagnóstico IA async — solo si no existe diagnóstico cacheado
      if (navigator.onLine && !diagnosis) {
        setDiagnosing(true);
        setLiveDiagnosis('');
        try {
          const result = await analyzeFoliage(optimized, {
            onToken: (_chunk, full) => setLiveDiagnosis(full),
          });
          if (result) {
            setDiagnosis(result);
            await mediaCache.updateDiagnosis(mediaId, result);
            onDiagnosis?.(result);
            console.info(`[Evidence] Diagnóstico IA: score=${result.score}, issues=${result.issues.length}.`);
          }
        } finally {
          setDiagnosing(false);
        }
      } else if (diagnosis) {
        console.info('[Evidence] Diagnóstico cacheado, omitiendo inferencia.');
      }
    } catch (err) {
      console.error('[EvidenceCapture] Error procesando imagen:', err);
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async (mediaId) => {
    try {
      await mediaCache.remove(mediaId);
      const next = previews.filter((p) => p.id !== mediaId);
      setPreviews(next);
      onCountChange?.(next.length);
      if (next.length === 0) setDiagnosis(null);
    } catch (err) {
      console.error('[EvidenceCapture] Error eliminando:', err);
    }
  };

  // Diferencial de score entre captura actual y anterior
  const scoreDelta = diagnosis && previousCapture?.diagnosis
    ? diagnosis.score - previousCapture.diagnosis.score
    : null;

  return (
    <div className="space-y-3">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
        <Camera size={12} /> Evidencia fotográfica
      </label>

      {/* Panel de evolución: foto anterior vs actual */}
      {previousCapture && previews.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Evolución</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <img src={previousCapture.dataUrl} alt="Anterior" className="w-full h-20 object-cover rounded" />
              <p className="text-[10px] text-slate-500 text-center mt-1">
                Anterior {previousCapture.diagnosis ? `(${previousCapture.diagnosis.score}/100)` : ''}
              </p>
            </div>
            <div className="flex-1">
              <img src={previews[previews.length - 1].dataUrl} alt="Actual" className="w-full h-20 object-cover rounded" />
              <p className="text-[10px] text-slate-500 text-center mt-1">
                Actual {diagnosis ? `(${diagnosis.score}/100)` : ''}
              </p>
            </div>
            {scoreDelta !== null && (
              <div className="flex flex-col items-center justify-center px-2">
                {scoreDelta > 0 ? (
                  <TrendingUp size={20} className="text-green-400" />
                ) : scoreDelta < 0 ? (
                  <TrendingDown size={20} className="text-red-400" />
                ) : (
                  <Minus size={20} className="text-slate-400" />
                )}
                <span className={`text-xs font-black tabular-nums ${scoreDelta > 0 ? 'text-green-400' : scoreDelta < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                  {scoreDelta > 0 ? '+' : ''}{scoreDelta}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Previews */}
      {previews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {previews.map((p) => (
            <div key={p.id} className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-slate-700 group">
              <img src={p.dataUrl} alt="Evidencia" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(p.id)}
                className="absolute top-1 right-1 p-1 bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Eliminar foto"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Diagnóstico IA */}
      {diagnosis && (
        <div className={`p-3 rounded-lg border ${diagnosis.score >= 60 ? 'bg-green-900/20 border-green-800/50' : 'bg-red-900/20 border-red-800/50'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <Brain size={12} /> Diagnóstico IA
            </span>
            <span className={`text-lg font-black tabular-nums ${diagnosis.score >= 60 ? 'text-green-400' : 'text-red-400'}`}>
              {diagnosis.score}/100
            </span>
          </div>
          {diagnosis.issues.length > 0 && (
            <ul className="text-[10px] text-slate-400 list-disc list-inside mb-1">
              {diagnosis.issues.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
          )}
          {diagnosis.treatment_suggestion && (
            <p className="text-[10px] text-amber-400 italic mt-1">
              Recomendación: {diagnosis.treatment_suggestion}
            </p>
          )}
        </div>
      )}

      {diagnosing && (
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-bold">
            <Loader2 size={14} className="animate-spin text-lime-400" />
            Analizando follaje…
          </div>
          <div className="text-[11px] font-mono text-lime-300 break-all min-h-[2.5rem] whitespace-pre-wrap">
            <StreamingText text={liveDiagnosis} active />
          </div>
        </div>
      )}

      {/* Botón de captura */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || processing}
        className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-slate-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors min-h-[44px] border border-slate-700"
      >
        {processing ? (
          <Loader2 size={16} className="animate-spin" />
        ) : previews.length === 0 ? (
          <Camera size={16} />
        ) : (
          <ImageIcon size={16} />
        )}
        {processing ? 'Optimizando…' : previews.length === 0 ? 'Capturar Evidencia' : 'Agregar otra foto'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />

      {previews.length === 0 && (
        <p className="text-[10px] text-amber-400 italic">
          Se requiere al menos una foto para completar la tarea.
        </p>
      )}
    </div>
  );
};

export default EvidenceCapture;
