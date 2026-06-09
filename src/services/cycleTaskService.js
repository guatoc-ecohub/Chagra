import tasksV1 from '../data/cycle-task-templates/tasks.v1.json';

/**
 * Generador básico de tareas por etapa fenológica.
 * Task 29: crea sugerencias desde plantillas versionadas.
 * No persiste — el caller decide qué hacer con las sugerencias.
 */

/**
 * @typedef {Object} TaskSuggestion
 * @property {string} task — nombre corto
 * @property {string} description — explicación
 * @property {'alta'|'media'|'baja'} priority
 */

/**
 * Retorna tareas sugeridas para una etapa específica.
 * @param {string} stageCode
 * @returns {TaskSuggestion[]}
 */
export function getTasksForStage(stageCode) {
  if (!stageCode) return [];
  return tasksV1.stage_tasks[stageCode] || [];
}

/**
 * Retorna todas las tareas de un ciclo, ordenadas por prioridad.
 * Recorre el rango de etapas desde la actual hasta closed.
 *
 * @param {Object} process — FarmProcess con attributes.current_stage
 * @param {Array<{code:string, label:string}>} stageOrder — orden de etapas del template phenology
 * @returns {TaskSuggestion[]}
 */
export function getTasksForCycle(process, stageOrder = []) {
  if (!process?.attributes?.current_stage) return [];

  const currentStage = process.attributes.current_stage;
  const relevantStages = [];

  if (stageOrder.length > 0) {
    const idx = stageOrder.findIndex((s) => s.code === currentStage);
    if (idx >= 0) {
      for (let i = idx; i < stageOrder.length; i++) {
        relevantStages.push(stageOrder[i].code);
      }
    }
  } else {
    relevantStages.push(currentStage);
  }

  const tasks = [];
  for (const stage of relevantStages) {
    const stageTasks = getTasksForStage(stage);
    for (const t of stageTasks) {
      tasks.push({ ...t, stage });
    }
  }

  const priorityOrder = { alta: 0, media: 1, baja: 2 };
  tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return tasks;
}

/**
 * Filtra tareas urgentes para hoy (prioridad alta).
 * @param {TaskSuggestion[]} tasks
 * @returns {TaskSuggestion[]}
 */
export function getUrgentTasks(tasks) {
  return tasks.filter((t) => t.priority === 'alta');
}
