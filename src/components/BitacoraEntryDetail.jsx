import React from 'react';
import { ArrowLeft, Edit2, Calendar, MapPin, FileText, Cpu, Hash } from 'lucide-react';
import StatusBadge from './StatusBadge';

/**
 * BitacoraEntryDetail — vista detalle de una entrada de Bitácora/Historial.
 *
 * Lili #104: "Bitácora / Historial: Aquí no permite ingresar a ninguno de
 * los registros pendientes." Faltaba la screen detalle al tap en cualquier
 * item del historial.
 *
 * Acepta cualquier shape de entry (transaction pendiente con `payload`,
 * task completada con `attributes`, log--task del store, etc.) y muestra:
 * - Tipo + status badge
 * - Fecha completa + autor (si aplica)
 * - Notas/descripción
 * - Coordinates / location si presente
 * - Payload JSON colapsable (debug)
 * - Botón Editar si la entry es task pendiente (callback edit)
 *
 * Props:
 *   entry: object — la entry a mostrar
 *   onBack: fn — volver a listado
 *   onEdit: fn(entry) — opcional, abrir edit screen (solo para tareas pending)
 */
function getEntryTitle(entry) {
  return (
    entry?.title ||
    entry?.name ||
    entry?.attributes?.name ||
    entry?.payload?.data?.attributes?.name ||
    'Entrada sin título'
  );
}

function getEntryType(entry) {
  return entry?.type || entry?.payload?.data?.type || 'desconocido';
}

function getEntryStatus(entry) {
  return (
    entry?.status ||
    entry?.attributes?.status ||
    entry?.payload?.data?.attributes?.status ||
    null
  );
}

function getEntryNotes(entry) {
  return (
    entry?.notes ||
    entry?.attributes?.notes?.value ||
    entry?.payload?.data?.attributes?.notes?.value ||
    null
  );
}

function getEntryTimestamp(entry) {
  const ts =
    entry?.attributes?.timestamp ||
    entry?.payload?.data?.attributes?.timestamp ||
    entry?.timestamp;
  if (!ts) return null;
  if (typeof ts === 'number') return new Date(ts * (ts < 1e12 ? 1000 : 1));
  return new Date(ts);
}

function getEntryGeo(entry) {
  return (
    entry?.attributes?.intrinsic_geometry ||
    entry?.payload?.data?.attributes?.intrinsic_geometry ||
    null
  );
}

function getStatusBadgeType(entry) {
  const t = getEntryType(entry);
  if (t.startsWith('asset--plant')) return 'plant';
  if (t.includes('observation')) return 'pest';
  return 'task';
}

function isEditableTask(entry) {
  const status = getEntryStatus(entry);
  const type = getEntryType(entry);
  // Editable si es log--task con status pending o in_progress
  if (!type.includes('task')) return false;
  return status === 'pending' || status === 'in_progress' || entry?._pending === true;
}

export default function BitacoraEntryDetail({ entry, onBack, onEdit }) {
  if (!entry) {
    return (
      <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <p className="text-lg text-slate-400 mb-4">Entrada no disponible</p>
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-700"
        >
          Volver
        </button>
      </div>
    );
  }

  const title = getEntryTitle(entry);
  const type = getEntryType(entry);
  const status = getEntryStatus(entry);
  const notes = getEntryNotes(entry);
  const timestamp = getEntryTimestamp(entry);
  const geo = getEntryGeo(entry);
  const badgeType = getStatusBadgeType(entry);
  const showEdit = isEditableTask(entry) && typeof onEdit === 'function';

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
      <header className="p-4 sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center gap-4 z-10 shrink-0 shadow-lg">
        <button
          onClick={onBack}
          aria-label="Volver al historial"
          className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[56px] min-w-[56px] flex justify-center items-center shrink-0 border border-slate-700"
        >
          <ArrowLeft size={28} />
        </button>
        <h2 className="text-2xl font-black tracking-tight truncate flex-1">{title}</h2>
        {showEdit && (
          <button
            onClick={() => onEdit(entry)}
            aria-label="Editar tarea"
            className="p-3 bg-blue-900/40 hover:bg-blue-800/60 active:bg-blue-700 rounded-full min-h-[48px] min-w-[48px] flex items-center justify-center text-blue-300"
            title="Editar tarea"
          >
            <Edit2 size={20} />
          </button>
        )}
      </header>

      <div className="flex-1 p-5 flex flex-col gap-4 max-w-2xl mx-auto w-full pb-24">
        {/* Status + tipo */}
        <section className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} type={badgeType} />
          <span className="text-xs font-mono text-slate-500 px-2 py-1 rounded-full bg-slate-900 border border-slate-800">
            {type.replace('log--', '').replace('--', ' ')}
          </span>
          {entry?._pending && (
            <span className="text-xs font-bold text-amber-400 px-2 py-1 rounded-full bg-amber-900/30 border border-amber-800/50">
              Sin sincronizar
            </span>
          )}
        </section>

        {/* Timestamp */}
        {timestamp && (
          <section className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <Calendar size={18} className="text-slate-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Fecha</p>
              <p className="text-base text-slate-200">
                {timestamp.toLocaleString('es-CO', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          </section>
        )}

        {/* Notas */}
        {notes && (
          <section className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <FileText size={18} className="text-slate-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Notas</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{notes}</p>
            </div>
          </section>
        )}

        {/* Geo */}
        {geo && (
          <section className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <MapPin size={18} className="text-slate-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Ubicación</p>
              <p className="text-xs text-slate-300 font-mono break-all">
                {typeof geo === 'object' ? geo.value || JSON.stringify(geo) : geo}
              </p>
            </div>
          </section>
        )}

        {/* ID */}
        {entry?.id && (
          <section className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <Hash size={18} className="text-slate-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">ID</p>
              <p className="text-xs text-slate-300 font-mono break-all">{entry.id}</p>
            </div>
          </section>
        )}

        {/* Payload técnico (colapsable) */}
        <details className="rounded-xl bg-slate-900 border border-slate-800">
          <summary className="cursor-pointer p-3 flex items-center gap-3 hover:bg-slate-800/60 active:bg-slate-800 rounded-xl">
            <Cpu size={18} className="text-slate-400" />
            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold flex-1 text-left">
              Payload técnico (debug)
            </span>
          </summary>
          <pre className="p-3 text-[10px] font-mono text-slate-400 overflow-x-auto border-t border-slate-800 bg-slate-950">
            {JSON.stringify(entry, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
