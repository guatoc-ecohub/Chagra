import React, { useState, useMemo } from 'react';
import { ArrowLeft, Calendar, FileText, Tag, Briefcase, Layout } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import DateField from './DateField';

function TaskScreen({ onBack, onSave }) {
    const plants = useAssetStore((s) => s.plants);
    const structures = useAssetStore((s) => s.structures);
    const lands = useAssetStore((s) => s.lands);
    const addTaskLog = useAssetStore((s) => s.addTaskLog);

    const allAssets = useMemo(() => [
        ...plants.map(p => ({ id: p.id, name: p.attributes?.name || p.name, type: 'plant' })),
        ...structures.map(s => ({ id: s.id, name: s.attributes?.name || s.name, type: 'structure' })),
        ...lands.map(l => ({ id: l.id, name: l.attributes?.name || l.name, type: 'land' }))
    ], [plants, structures, lands]);

    const [formData, setFormData] = useState({
        name: '',
        assetId: '',
        locationId: '',
        notes: '',
        due: new Date().toISOString().split('T')[0],
        severity: 'medium'
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
                severity: formData.severity
            };

            await addTaskLog(taskData);
            onSave('Tarea agendada exitosamente (Offline-First)', false);
            setTimeout(() => onBack(), 500);
        } catch (error) {
            console.error('[TaskScreen] Error saving task:', error);
            onSave('Error al agendar tarea', true);
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
                <h2 className="text-3xl font-black tracking-tight">Agendar Tarea</h2>
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
                    {isSaving ? 'AGENDANDO...' : 'PROGRAMAR TAREA'}
                </button>
            </div>
        </div>
    );
}

export default TaskScreen;
