import React, { useEffect, useMemo, useState } from 'react';
import { Sprout, Droplets, Apple, Leaf, RefreshCw, Clock, Bot, Sparkles, Check, X, Camera } from 'lucide-react';
import { GroupedVirtuoso } from 'react-virtuoso';
import { useLogStore } from '../store/useLogStore';
import { parseAiInference, parseAiReview } from '../utils/aiInferenceParser';
import { savePayload } from '../services/payloadService';
import { PRIMARY_WORKER_NAME } from '../config/workerConfig';
import { usePhotoUrl } from '../hooks/usePhotoUrl';
import BeforeAfterPhoto from './BeforeAfterPhoto';

/**
 * AssetTimeline, Línea de tiempo agroecológica de un activo (plant).
 *
 * Consume logs desde useLogStore (alimentado por logCache + pullRecentLogs).
 * Agrupa por mes/año para facilitar lectura secuencial. Los logs _pending
 * se muestran con opacidad reducida + badge "Sincronizando…".
 *
 * En agricultura orgánica, el orden cronológico de los eventos determina la
 * validez de periodos de carencia y la eficacia de los biopreparados (Jairo
 * Restrepo), por lo que se prioriza densidad informativa sobre decoración.
 */

const TYPE_CONFIG = {
  'log--seeding': {
    icon: Sprout,
    label: 'Siembra',
    color: 'text-lime-400',
    bg: 'bg-lime-900/30',
    border: 'border-lime-800',
  },
  'log--planting': {
    icon: Sprout,
    label: 'Trasplante',
    color: 'text-green-400',
    bg: 'bg-green-900/30',
    border: 'border-green-800',
  },
  'log--input': {
    icon: Droplets,
    label: 'Aplicación (biopreparado)',
    color: 'text-blue-400',
    bg: 'bg-blue-900/30',
    border: 'border-blue-800',
  },
  'log--harvest': {
    icon: Apple,
    label: 'Cosecha',
    color: 'text-amber-400',
    bg: 'bg-amber-900/30',
    border: 'border-amber-800',
  },
};

const DEFAULT_CONFIG = {
  icon: Leaf,
  label: 'Evento',
  color: 'text-slate-400',
  bg: 'bg-slate-800',
  border: 'border-slate-700',
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const formatMonthKey = (ts) => {
  if (!ts) return 'Sin fecha';
  const d = new Date(ts * 1000);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

const formatDayLabel = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

const extractNotes = (log) => {
  const raw = log.attributes?.notes;
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  return raw.value || '';
};

// Detector PHOTO_ATTACHMENT (Fase 1 wiring): los logs de adjuntar foto a un
// evento se modelan como log--task con marker [PHOTO_ATTACHMENT] +
// target_log_id + photo_ref (id numérico en media_cache). Patrón append-only
// definido en useAssetStore.attachPhotoToLog.
const parsePhotoAttachment = (notes) => {
  if (!notes || !notes.includes('[PHOTO_ATTACHMENT]')) return null;
  const photoRefMatch = notes.match(/photo_ref:\s*(\d+)/);
  const targetMatch = notes.match(/target_log_id:\s*(\S+)/);
  if (!photoRefMatch) return null;
  return {
    photoId: Number(photoRefMatch[1]),
    targetLogId: targetMatch ? targetMatch[1] : null,
  };
};

// Sub-componente con su propio hook usePhotoUrl para no llamarlo dentro del map().
const PhotoAttachmentThumb = ({ photoId, timestamp, pending }) => {
  const photo = usePhotoUrl({ photoId });
  return (
    <li
      className={`relative p-3 rounded-xl border bg-fuchsia-900/10 border-fuchsia-700/40 ${pending ? 'opacity-60' : ''}`}
    >
      <span className="absolute -left-[26px] top-4 w-4 h-4 rounded-full bg-fuchsia-900 border-2 border-fuchsia-700 flex items-center justify-center">
        <Camera size={10} className="text-fuchsia-400" />
      </span>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {photo.loading ? (
            <div className="w-16 h-16 rounded bg-slate-800 shrink-0 animate-pulse" />
          ) : photo.url ? (
            <img
              src={photo.url}
              alt="Foto adjunta al evento"
              className="w-16 h-16 rounded object-cover bg-slate-800 shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-16 rounded bg-slate-800 shrink-0 flex items-center justify-center text-slate-600">
              <Camera size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-fuchsia-400 block">Foto adjunta</span>
            <p className="text-xs text-slate-500 mt-0.5">
              {photo.source === 'specific' ? 'Evidencia visual capturada' : 'Foto no encontrada en cache local'}
            </p>
          </div>
        </div>
        <span className="text-xs text-slate-500 shrink-0 whitespace-nowrap">
          {timestamp ? new Date(timestamp * 1000).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—'}
        </span>
      </div>
    </li>
  );
};

// PhotoEvolutionSection — comparador antes/después (FEAT-C #294, descubribilidad
// 2026-06-30): reusa las dos fotos MÁS ANTIGUA y MÁS RECIENTE adjuntadas a esta
// misma planta (marcadores [PHOTO_ATTACHMENT] del propio timeline) para que el
// productor vea la evolución del cultivo con el slider de BeforeAfterPhoto, sin
// tener que ir foto por foto. Solo se muestra si hay al menos 2 fotos distintas
// Y ambas URLs resuelven (usePhotoUrl); si falta alguna, no se renderiza nada
// (degrada limpio, no deja un hueco roto).
const PhotoEvolutionSection = ({ oldest, newest }) => {
  const beforePhoto = usePhotoUrl({ photoId: oldest.photoId });
  const afterPhoto = usePhotoUrl({ photoId: newest.photoId });

  if (beforePhoto.loading || afterPhoto.loading) return null;
  if (!beforePhoto.url || !afterPhoto.url) return null;

  return (
    <div className="mb-4 shrink-0" data-testid="asset-timeline-before-after">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Camera size={12} /> Evolución de la planta
      </h4>
      <BeforeAfterPhoto
        before={{ url: beforePhoto.url, taken_at: oldest.timestamp ? oldest.timestamp * 1000 : null }}
        after={{ url: afterPhoto.url, taken_at: newest.timestamp ? newest.timestamp * 1000 : null }}
      />
    </div>
  );
};

const extractQuantity = (log) => {
  const qty = log.relationships?.quantity?.data?.[0]?.attributes;
  if (!qty) return '';
  const value = qty.value?.decimal ?? qty.value ?? '';
  const label = qty.label || '';
  return value ? `${value} ${label}`.trim() : '';
};

// Referencia estable para el fallback: evita que `|| []` cree un array nuevo en
// cada llamada del selector, lo cual dispararía re-render infinito (React #185)
// cuando el asset aún no tiene logs cargados.
const EMPTY_LOGS = [];

export default function AssetTimeline({ assetId }) {
  const logs = useLogStore((state) => state.logsByAsset[assetId] || EMPTY_LOGS);
  const isSyncing = useLogStore((state) => state.isSyncing);
  const loadLogsForAsset = useLogStore((state) => state.loadLogsForAsset);
  const [visibleMonths, setVisibleMonths] = useState(2);

  // Generador dev-only de 1000 logs para stress test (ADR-030 Regla 4)
  useEffect(() => {
    if (import.meta.env.DEV && assetId && logs.length > 0 && logs.length < 100) {
      console.info('[Dev] Simulando 1000 logs para stress test de virtualización...');
      const firstLog = logs[0];
      const fakeLogs = [];
      const baseTs = firstLog.timestamp || Math.floor(Date.now() / 1000);

      for (let i = 0; i < 1000; i++) {
        fakeLogs.push({
          ...firstLog,
          id: `fake-${i}`,
          timestamp: baseTs - (i * 3600 * 2), // 2 horas entre cada uno
          attributes: {
            ...firstLog.attributes,
            name: `Log Simulado #${1000 - i}`,
            notes: {
              value: i % 10 === 0
                ? 'Nota larga para probar alturas variables. '.repeat(15)
                : 'Nota corta de actividad diaria en la chagra.',
              format: 'plain_text'
            }
          }
        });
      }

      // Inyectar al store para que Virtuoso tenga qué virtualizar
      useLogStore.setState((state) => ({
        logsByAsset: {
          ...state.logsByAsset,
          [assetId]: [...logs, ...fakeLogs]
        }
      }));
    }
  }, [assetId, logs.length, logs]);

  useEffect(() => {
    if (assetId) loadLogsForAsset(assetId);
  }, [assetId, loadLogsForAsset]);

  useEffect(() => {
    // Reset deliberado al cambiar asset — ESLint nuevo rule no entiende el patrón
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleMonths(2);
  }, [assetId]);

  // Preparación de datos para GroupedVirtuoso (queue/036)
  const { flatLogs, groupCounts, groupNames, reviewByTarget } = useMemo(() => {
    const map = new Map();
    // Asegurar orden descendente por timestamp
    const sortedLogs = [...logs].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    for (const log of sortedLogs) {
      const key = formatMonthKey(log.timestamp);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(log);
    }

    const availableGroups = Array.from(map.entries());
    const visible = availableGroups.slice(0, visibleMonths);

    const flat = [];
    const counts = [];
    const names = [];
    const reviews = new Map();

    for (const [name, monthLogs] of visible) {
      names.push(name);
      counts.push(monthLogs.length);
      for (const log of monthLogs) {
        flat.push(log);
        const review = parseAiReview(extractNotes(log));
        if (review?.target_log_id) reviews.set(review.target_log_id, review);
      }
    }

    return { flatLogs: flat, groupCounts: counts, groupNames: names, reviewByTarget: reviews };
  }, [logs, visibleMonths]);

  const canLoadMoreMonths = useMemo(() => {
    const totalGroups = new Set(logs.map(l => formatMonthKey(l.timestamp))).size;
    return totalGroups > visibleMonths;
  }, [logs, visibleMonths]);

  // Fotos adjuntas ([PHOTO_ATTACHMENT]) de ESTE activo, ordenadas cronológicamente.
  // Se derivan de TODOS los logs (no solo los meses visibles/paginados) para que
  // la comparación antes/después no dependa de cuántos meses haya cargado el
  // operador. oldestPhoto/newestPhoto alimentan PhotoEvolutionSection.
  const photoAttachments = useMemo(() => {
    const found = [];
    for (const log of logs) {
      const attachment = parsePhotoAttachment(extractNotes(log));
      if (attachment) found.push({ photoId: attachment.photoId, timestamp: log.timestamp });
    }
    return found.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [logs]);
  const oldestPhoto = photoAttachments[0];
  const newestPhoto = photoAttachments[photoAttachments.length - 1];
  const showPhotoEvolution = photoAttachments.length >= 2 && oldestPhoto !== newestPhoto;

  if (!assetId) {
    return (
      <div className="p-4 text-slate-500 text-sm italic border border-slate-800 rounded-2xl bg-slate-900/50">
        Selecciona un activo para ver su línea de tiempo.
      </div>
    );
  }

  const renderLog = (index, log) => {
    const config = TYPE_CONFIG[log.type] || DEFAULT_CONFIG;
    const notes = extractNotes(log);
    const aiData = parseAiInference(notes);
    const isAi = !!aiData;

    const photoAttachment = parsePhotoAttachment(notes);
    if (photoAttachment) {
      return (
        <div className="py-2 pr-2">
          <PhotoAttachmentThumb
            key={log.id}
            photoId={photoAttachment.photoId}
            timestamp={log.timestamp}
            pending={log._pending}
          />
        </div>
      );
    }

    const reviewData = isAi ? reviewByTarget.get(log.id) : null;
    const Icon = isAi ? (aiData.needs_human_review ? Sparkles : Bot) : config.icon;
    const qty = extractQuantity(log);
    const pending = log._pending;

    const handleReview = async (verdict) => {
      const payload = {
        data: {
          type: 'log--observation',
          attributes: {
            name: `Revisión IA: ${verdict === 'confirmed' ? 'Confirmado' : 'Rechazado'}`,
            timestamp: Math.floor(Date.now() / 1000),
            status: "done",
            notes: {
              value: [
                '[AI_REVIEW]',
                `target_log_id: ${log.id}`,
                `verdict: ${verdict}`,
                `reviewer_id: ${PRIMARY_WORKER_NAME}`,
                `reviewed_at: ${new Date().toISOString()}`,
                'notes: Revisión desde timeline local'
              ].join('\n'),
              format: 'plain_text'
            }
          },
          relationships: {
            asset: { data: [{ type: 'asset--plant', id: assetId }] }
          }
        }
      };
      await savePayload('observation', payload);
      useLogStore.getState().loadLogsForAsset(assetId);
    };

    return (
      <div className="py-2 pr-2">
        <div
          className={`relative p-3 rounded-xl border transition-all ${isAi ? 'bg-indigo-900/10 border-indigo-500/30' : config.bg + ' ' + config.border} ${pending ? 'opacity-60' : ''
            } ${isAi && aiData.needs_human_review && !reviewData ? 'border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : ''}`}
        >
          <span
            className={`absolute -left-[26px] top-4 w-4 h-4 rounded-full ${isAi ? 'bg-indigo-900 border-indigo-500' : config.bg + ' border-2 ' + config.border} flex items-center justify-center z-10`}
          >
            <Icon size={10} className={isAi ? 'text-indigo-400' : config.color} />
          </span>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs font-bold ${isAi ? 'text-indigo-400' : config.color}`}>
                  {isAi ? 'Inferencia IA' : config.label}
                </span>

                {isAi && (
                  <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/40">
                    {Math.round(aiData.confidence * 100)}% Conf.
                  </span>
                )}

                {reviewData && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border flex items-center gap-1 ${reviewData.verdict === 'confirmed'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-red-500/20 text-red-400 border-red-500/40'
                    }`}>
                    {reviewData.verdict === 'confirmed' ? <Check size={8} /> : <X size={8} />}
                    {reviewData.verdict === 'confirmed' ? 'Confirmado' : 'Rechazado'}
                  </span>
                )}

                {!reviewData && isAi && aiData.needs_human_review && (
                  <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/40 animate-pulse">
                    Pendiente revisión
                  </span>
                )}

                {pending && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-900/40 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <RefreshCw size={8} className="animate-spin" />
                    Sincronizando…
                  </span>
                )}
              </div>
              <h4 className={`text-sm font-semibold truncate ${isAi ? 'text-indigo-100' : 'text-slate-200'}`}>
                {log.attributes?.name || 'Evento sin nombre'}
              </h4>

              {isAi ? (
                <div className="mt-2 space-y-2">
                  {aiData.findings.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {aiData.findings.map((f, i) => (
                        <span key={i} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 italic">
                    {aiData.treatment}
                  </p>

                  {!reviewData && aiData.needs_human_review && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleReview('confirmed')}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center justify-center gap-1 active:bg-emerald-600/40 transition-colors"
                      >
                        <Check size={12} /> Confirmar
                      </button>
                      <button
                        onClick={() => handleReview('rejected')}
                        className="flex-1 py-1.5 rounded-lg bg-red-600/20 border border-red-500/40 text-red-400 text-[10px] font-bold flex items-center justify-center gap-1 active:bg-red-600/40 transition-colors"
                      >
                        <X size={12} /> Rechazar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {qty && (
                    <div className="text-xs text-slate-400 mt-0.5">{qty}</div>
                  )}
                  {notes && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">{notes}</p>
                  )}
                </>
              )}
            </div>
            <span className="text-xs text-slate-500 shrink-0 tabular-nums">
              {formatDayLabel(log.timestamp)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
          <Clock size={18} className="text-slate-400" />
          Línea de tiempo
        </h3>
        {isSyncing && (
          <span className="text-xs text-blue-400 flex items-center gap-1">
            <RefreshCw size={12} className="animate-spin" />
            Actualizando…
          </span>
        )}
      </div>

      {showPhotoEvolution && (
        <PhotoEvolutionSection oldest={oldestPhoto} newest={newestPhoto} />
      )}

      {logs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 min-h-[300px]">
          <Leaf size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Sin eventos registrados en los últimos 30 días.</p>
          <p className="text-xs mt-1 opacity-70">
            Los registros de siembra, insumos y cosecha aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 border-l-2 border-slate-800 ml-2">
          <GroupedVirtuoso
            groupCounts={groupCounts}
            data={flatLogs}
            overscan={600}
            style={{ height: '70vh' }}
            groupContent={(index) => (
              <div className="bg-slate-950/90 backdrop-blur-sm py-3 px-4 -ml-4 border-b border-slate-800/50 z-20">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  {groupNames[index]}
                </span>
              </div>
            )}
            itemContent={renderLog}
            components={{
              Footer: () => (
                canLoadMoreMonths ? (
                  <div className="py-6 pr-2 ml-4">
                    <button
                      type="button"
                      onClick={() => setVisibleMonths((prev) => prev + 2)}
                      className="w-full py-3.5 px-4 rounded-xl bg-slate-800/50 hover:bg-slate-700 active:bg-slate-900 text-slate-300 text-xs font-black transition-all border border-slate-700 shadow-xl"
                    >
                      CARGAR MESES ANTERIORES
                    </button>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-600 text-[10px] uppercase font-bold tracking-widest">
                    Fin de la historia del activo
                  </div>
                )
              )
            }}
          />
        </div>
      )}
    </div>
  );
}
