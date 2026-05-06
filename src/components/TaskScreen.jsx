import React, { useState, useMemo } from 'react';
import { ArrowLeft, FileText, Tag, Briefcase, Layout } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import DateField from './DateField';
import StatusBadge from './StatusBadge';
import { TASK_STATUSES } from '../constants/assetStatuses';

// Autopilot A (2026-05-03): pre-fill priority + location desde último uso.
// Reduce friction al crear tareas repetitivas (riego matinal, monitoreo,
// poda) sin imponer, el usuario sigue editando libremente.
const LAST_USED_KEY = 'chagra:taskscreen_last';
function readLastUsed() {
    try {
        const raw = localStorage.getItem(LAST_USED_KEY);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        // Sanity check: rechaza si más viejo que 30 días para que el "último"
        // no contamine UX si el usuario abandonó la app.
        if (obj.ts && Date.now() - obj.ts > 30 * 24 * 60 * 60 * 1000) return null;
        return obj;
    } catch {
        return null;
    }
}

function TaskScreen({ onBack, onSave, initialData }) {
    const plants = useAssetStore((s) => s.plants);
    const structures = useAssetStore((s) => s.structures);
    const lands = useAssetStore((s) => s.lands);
    const addTaskLog = useAssetStore((s) => s.addTaskLog);
    const updateTaskLog = useAssetStore((s) => s.updateTaskLog);

    const allAssets = useMemo(() => [
        ...plants.map(p => ({ id: p.id, name: p.attributes?.name || p.name, type: 'plant' })),
        ...structures.map(s => ({ id: s.id, name: s.attributes?.name || s.name, type: 'structure' })),
        ...lands.map(l => ({ id: l.id, name: l.attributes?.name || l.name, type: 'land' }))
    ], [plants, structures, lands]);

    // Modo edición: si initialData trae .id, estamos editando una tarea
    // existente. Si no, crear nueva. Lili #106.
    const isEdit = !!initialData?.id;

    const [formData, setFormData] = useState(() => {
        // En edit mode no aplicamos last-used (ya hay datos canónicos del log).
        const lastUsed = isEdit ? null : readLastUsed();
        // Solo aplicamos last-used location si la zona aún existe (evita
        // referencias zombi a lands borradas).
        const lastLocationStillExists = lastUsed?.locationId
            && lands.some((l) => l.id === lastUsed.locationId);
        return {
            name: initialData?.name || initialData?.attributes?.name || '',
            assetId: initialData?.asset_id || '',
            locationId: lastLocationStillExists ? lastUsed.locationId : '',
            notes: initialData?.attributes?.notes?.value || '',
            due: initialData?.attributes?.timestamp
                ? initialData.attributes.timestamp.split('T')[0]
                : new Date().toISOString().split('T')[0],
            severity: initialData?.severity || lastUsed?.severity || 'medium',
            status: initialData?.attributes?.status || initialData?.status || 'pending'
        };
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleInput = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        if (!formData.name) {
            onSave('El nombre de la tarea es obligatorio', true);
            return;
        }

        setIsSaving(true);
        try {
            const taskData = {
                name: formData.name,
                notes: formData.notes,
                assetIds: formData.assetId ? [formData.assetId] : [],
                locationId: formData.locationId || null,
                due: new Date(formData.due).toISOString().split('.')[0] + '+00:00',
                severity: formData.severity,
                status: formData.status
            };

            if (isEdit) {
                await updateTaskLog(initialData.id, taskData);
                onSave('Tarea actualizada (Offline-First)', false);
            } else {
                await addTaskLog(taskData);
                // Persistir last-used solo en create (no en edit) para que
                // la próxima tarea nueva pre-fillee con prioridad + zona usadas.
                try {
                    localStorage.setItem(LAST_USED_KEY, JSON.stringify({
                        severity: formData.severity,
                        locationId: formData.locationId || null,
                        ts: Date.now(),
                    }));
                } catch { /* localStorage no disponible / quota, silent */ }
                onSave('Tarea agendada exitosamente (Offline-First)', false);
            }
            setTimeout(() => onBack(), 500);
        } catch (error) {
            console.error('[TaskScreen] Error saving task:', error);
            onSave(isEdit ? 'Error al actualizar tarea' : 'Error al agendar tarea', true);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
            <header className="p-4 sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center gap-4 z-10 shrink-0 shadow-lg">
                <button
                    onClick={onBack}
                    className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[56px] min-w-[56px] flex justify-center items-center shrink-0 border border-slate-700"
                >
                    <ArrowLeft size={32} />
                </button>
                <h2 className="text-3xl font-black tracking-tight">{isEdit ? 'Editar Tarea' : 'Agendar Tarea'}</h2>
            </header>

            <div className="flex-1 p-5 flex flex-col gap-6 pb-24 max-w-2xl mx-auto w-full">
                <section className="space-y-4">
                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <FileText size={14} /> Título de la Operación
                        </span>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInput}
                            placeholder="Ej: Riego fertiorgánico"
                            className="p-4 rounded-xl bg-slate-900 border-2 border-slate-800 focus:border-muzo outline-none text-2xl text-white transition-all shadow-inner"
                        />
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <Tag size={14} /> Prioridad
                            </span>
                            <select
                                name="severity"
                                value={formData.severity}
                                onChange={handleInput}
                                className="p-4 rounded-xl bg-slate-900 border-2 border-slate-800 text-xl text-white appearance-none"
                            >
                                <option value="low">Baja (Rutinaria)</option>
                                <option value="medium">Media (Preventiva)</option>
                                <option value="high">Alta (Urgente)</option>
                                <option value="critical">Crítica (Emergencia)</option>
                            </select>
                        </label>

                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-bold uppercase tracking-wider text-slate-500">
                                Estado de la Tarea
                            </span>
                            <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-slate-900 border-2 border-slate-800">
                                {TASK_STATUSES.map(s => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, status: s.id }))}
                                        className={`transition-all ${formData.status === s.id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950 scale-105' : 'opacity-60 hover:opacity-100'}`}
                                    >
                                        <StatusBadge status={s.id} type="task" />
                                    </button>
                                ))}
                            </div>
                        </label>

                        <DateField
                            label="Fecha Programada"
                            value={formData.due}
                            onChange={(val) => setFormData(p => ({ ...p, due: val }))}
                            required
                            className="w-full"
                        />
                    </div>
                </section>

                <section className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Briefcase size={14} /> Activo Objetivo
                        </span>
                        <select
                            name="assetId"
                            value={formData.assetId}
                            onChange={handleInput}
                            className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-lg text-white appearance-none"
                        >
                            <option value="">Seleccionar activo (opcional)</option>
                            {allAssets.map(a => (
                                <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Layout size={14} /> Ubicación
                        </span>
                        <select
                            name="locationId"
                            value={formData.locationId}
                            onChange={handleInput}
                            className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-lg text-white appearance-none"
                        >
                            <option value="">Seleccionar ubicación (opcional)</option>
                            {lands.map(l => (
                                <option key={l.id} value={l.id}>{l.attributes?.name || l.name}</option>
                            ))}
                        </select>
                    </label>
                </section>

                <label className="flex flex-col gap-2">
                    <span className="text-sm font-bold uppercase tracking-wider text-slate-500">Notas Adicionales</span>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInput}
                        rows="3"
                        placeholder="Instrucciones específicas para el operario..."
                        className="p-4 rounded-xl bg-slate-900 border-2 border-slate-800 text-lg text-white outline-none focus:border-slate-600"
                    />
                </label>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="mt-4 p-6 rounded-xl bg-muzo text-slate-950 text-2xl font-black shadow-neon-muzo active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                >
                    {isSaving ? (isEdit ? 'ACTUALIZANDO...' : 'AGENDANDO...') : (isEdit ? 'GUARDAR CAMBIOS' : 'PROGRAMAR TAREA')}
                </button>
            </div>
        </div>
    );
}

export default TaskScreen;
