import React, { useMemo } from 'react';
import { ClipboardList, AlertTriangle, Calendar, Sprout, CheckCircle } from 'lucide-react';
import { getTasksForCycle, getUrgentTasks } from '../services/cycleTaskService';

const priorityColors = {
  alta: 'text-red-400 border-red-800 bg-red-900/20',
  media: 'text-amber-400 border-amber-800 bg-amber-900/20',
  baja: 'text-slate-400 border-slate-700 bg-slate-800/40',
};

const stageIcons = {
  sowing: '🌱',
  emergence: '🌿',
  vegetative: '🌳',
  flowering: '🌸',
  fruiting: '🍎',
  harvest_window: '🧺',
  closed: '🏁',
};

/**
 * DailyTasksView — Vista "Qué debo hacer hoy" (Task 28).
 *
 * Props:
 *   - processes: FarmProcess[] — ciclos activos
 *   - stageOrder: Array<{code, label}> — orden fenológico
 *   - onCompleteTask: (task) => void — opcional
 */
/** @param {{ processes?: any[], stageOrder?: any[], onCompleteTask?: (task: object) => void }} props */
export default function DailyTasksView({ processes = [], stageOrder = [], onCompleteTask }) {
  const allTasks = useMemo(() => {
    const grouped = [];
    for (const proc of processes) {
      const tasks = getTasksForCycle(proc, stageOrder);
      if (tasks.length > 0) {
        grouped.push({
          process: proc,
          tasks,
          urgent: getUrgentTasks(tasks),
        });
      }
    }
    return grouped;
  }, [processes, stageOrder]);

  const totalUrgent = useMemo(
    () => allTasks.reduce((acc, g) => acc + g.urgent.length, 0),
    [allTasks]
  );

  if (allTasks.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
        <ClipboardList size={24} className="text-slate-500 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No hay tareas pendientes para hoy.</p>
        <p className="text-xs text-slate-500 mt-1">Registra un ciclo de siembra para generar sugerencias.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {totalUrgent > 0 && (
        <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200">
            Tienes <strong>{totalUrgent} tarea{totalUrgent > 1 ? 's' : ''} urgente{totalUrgent > 1 ? 's' : ''}</strong> para hoy.
          </p>
        </div>
      )}

      {allTasks.map(({ process, tasks }) => (
        <div key={process.process_id} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sprout size={14} className="text-lime-400" />
            <span className="text-sm font-bold text-slate-200">
              {process.attributes.subject_label || 'Ciclo'}
            </span>
            <span className="text-2xs text-slate-500">
              · {stageIcons[process.attributes.current_stage] || ''} {process.attributes.current_stage}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            {tasks.map((t, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs border ${priorityColors[t.priority]}`}
              >
                <span className="flex-1">
                  <span className="font-medium text-slate-200">{t.task}</span>
                  <span className="text-slate-500 ml-1">· {t.description}</span>
                </span>
                <span className="text-2xs uppercase shrink-0">{t.priority}</span>
                {onCompleteTask && (
                  <button
                    onClick={() => onCompleteTask(t)}
                    className="text-slate-500 hover:text-emerald-400 p-0.5"
                    aria-label={`Completar ${t.task}`}
                  >
                    <CheckCircle size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-3xs text-slate-600 flex items-center gap-1">
        <Calendar size={9} />
        Las tareas son sugerencias basadas en la etapa del ciclo. No representan diagnóstico profesional.
      </p>
    </div>
  );
}
