export const PLANT_STATUSES = [
    { id: 'seedling', label: 'Plántula', color: '#86efac', textColor: '#064e3b' },
    { id: 'growing', label: 'En crecimiento', color: '#22c55e', textColor: '#064e3b' },
    { id: 'flowering', label: 'Floración', color: '#f9a8d4', textColor: '#831843' },
    { id: 'fruiting', label: 'Fructificación', color: '#fdba74', textColor: '#7c2d12' },
    { id: 'harvested', label: 'Cosechada', color: '#fcd34d', textColor: '#78350f' },
    { id: 'dormant', label: 'Descanso', color: '#94a3b8', textColor: '#1e293b' },
    { id: 'dead', label: 'Muerta/Baja', color: '#ef4444', textColor: '#ffffff' },
    { id: 'unknown', label: 'Desconocido', color: '#64748b', textColor: '#ffffff' }
];

export const TASK_STATUSES = [
    { id: 'pending', label: 'Pendiente', color: '#64748b', textColor: '#ffffff' },
    { id: 'in_progress', label: 'En curso', color: '#3b82f6', textColor: '#ffffff' },
    { id: 'completed', label: 'Terminado', color: '#22c55e', textColor: '#064e3b' },
    { id: 'urgent', label: 'Urgente', color: '#ef4444', textColor: '#ffffff' },
    { id: 'cancelled', label: 'Cancelado', color: '#475569', textColor: '#ffffff' },
    { id: 'blocked', label: 'Bloqueado', color: '#f59e0b', textColor: '#ffffff' }
];

export const PEST_STATUSES = [
    { id: 'reported', label: 'Reportado', color: '#fcd34d', textColor: '#78350f' },
    { id: 'inspecting', label: 'Evaluación', color: '#3b82f6', textColor: '#ffffff' },
    { id: 'treating', label: 'Tratamiento', color: '#f97316', textColor: '#ffffff' },
    { id: 'resolved', label: 'Controlado', color: '#22c55e', textColor: '#064e3b' },
    { id: 'escalated', label: 'Crítico', color: '#ef4444', textColor: '#ffffff' }
];

export const STATUS_MAP = {
    plant: PLANT_STATUSES,
    task: TASK_STATUSES,
    pest: PEST_STATUSES
};

export const STATUS_DEFAULT_FOR_TYPE = {
    'asset--plant': 'growing',
    'log--maintenance': 'pending',
    'log--seeding': 'completed',
    'log--harvest': 'completed',
    'log--input': 'completed',
    'log--observation': 'pending'
};
