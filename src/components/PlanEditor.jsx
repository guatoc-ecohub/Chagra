import React, { useState, useEffect } from 'react';
import { getPlanForAsset, generatePlanForPlant, updatePlanStep, markStepExecuted } from '../services/planGeneratorService';
import { getCurrentOperatorHash } from '../services/operatorIdentityService';
import { create } from 'zustand';

// Mock simple de userStore para cumplir la regla: (leer de userStore)
// En la implementacion real el dev lo ajustará como prefiera.
// eslint-disable-next-line react-refresh/only-export-components
export const useUserStore = create((set) => ({
    user: { role: 'asesor', name: 'Asesor Prueba' },
    setRole: (role) => set((state) => ({ user: { ...state.user, role } }))
}));

export default function PlanEditor({ assetId, speciesSlug, plantingDate, climateZone = 'frio', lunarPhase = 'creciente' }) {
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useUserStore();
    // 'now' como state — lazy init evita la regla react-hooks/purity.
    // Refresca cada minuto para que isPast sea preciso sin re-render forzado.
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            const p = await getPlanForAsset(assetId);
            if (cancelled) return;
            setPlan(p);
            setLoading(false);
        };
        run();
        return () => { cancelled = true; };
    }, [assetId]);


    const handleGenerate = async () => {
        setLoading(true);
        const p = await generatePlanForPlant({
            assetId,
            speciesSlug,
            plantingDate: plantingDate || Date.now(),
            climateZone,
            lunarPhase
        });
        setPlan(p);
        setLoading(false);
    };

    const handleMarkExecuted = async (stepId) => {
        try {
            const hash = getCurrentOperatorHash() || 'default-hash-00000000000000000000000000000000000000000000000000000';
            const updated = await markStepExecuted(plan.id, stepId, hash);
            setPlan({ ...updated });
        } catch (e) {
            alert("Error al marcar ejecutado: " + e.message);
        }
    };

    const handleEditStep = async (stepId, changes) => {
        if (user?.role !== 'asesor') return;
        try {
            const hash = getCurrentOperatorHash() || 'default-hash-00000000000000000000000000000000000000000000000000000';
            const updated = await updatePlanStep(plan.id, stepId, changes, hash);
            setPlan({ ...updated });
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <div className="p-4 text-gray-500">Cargando plan...</div>;

    if (!plan || !plan.steps || plan.steps.length === 0) {
        return (
            <div className="p-4 border rounded-lg bg-gray-50 text-center shadow-sm">
                <h3 className="text-lg font-bold mb-2">Plan de Alimentación</h3>
                <p className="text-gray-600 mb-4">Sin plan — ¿generar uno sugerido?</p>
                <button onClick={handleGenerate} className="bg-green-600 text-white px-4 py-2 rounded shadow font-medium hover:bg-green-700 transition">
                    Generar Plan
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 border rounded-lg bg-white shadow-sm mt-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Plan de Alimentación ({plan.species_slug})</h3>
                <button onClick={handleGenerate} className="text-sm text-blue-600 underline hover:text-blue-800">
                    Regenerar plan
                </button>
            </div>

            <div className="space-y-4">
                {plan.steps.map(step => {
                    const isAdvisor = user?.role === 'asesor';
                    const isCompleted = step.status === 'completed';
                    const dateObj = new Date(step.scheduled_date);
                    const dateStr = dateObj.toLocaleDateString();
                    const isPast = dateObj.getTime() < now;

                    let colorClass = "border-l-4 border-cyan-500 bg-cyan-50"; // future
                    if (isCompleted) colorClass = "border-l-4 border-green-500 bg-green-50";
                    else if (isPast) colorClass = "border-l-4 border-red-500 bg-red-50"; // past pending

                    return (
                        <div key={step.id} className={`p-3 rounded shadow-sm flex flex-col gap-2 ${colorClass}`}>
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-800">{dateStr} - {step.action_type.replace('_', ' ').toUpperCase()}</span>
                                <span className={`text-xs px-2 py-1 rounded font-bold uppercase tracking-wide ${isCompleted ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                                    {step.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700 mt-1">
                                <div className="flex items-center">
                                    <span className="font-medium w-24">Insumo:</span>
                                    {isAdvisor && !isCompleted ? (
                                        <input
                                            type="text"
                                            className="ml-2 border rounded px-2 py-1 w-full max-w-[150px] shadow-inner"
                                            defaultValue={step.biofertilizer_slug}
                                            onBlur={(e) => handleEditStep(step.id, { biofertilizer_slug: e.target.value })}
                                        />
                                    ) : (
                                        <span className="ml-2 bg-white px-2 py-0.5 rounded border">{step.biofertilizer_slug}</span>
                                    )}
                                    {step.stock_unavailable && !isCompleted && (
                                        <span className="ml-2 text-xs text-red-600 font-bold bg-white px-1 border border-red-200 rounded">Sin stock</span>
                                    )}
                                </div>
                                <div className="flex items-center">
                                    <span className="font-medium w-24">Dosis (ml):</span>
                                    {isAdvisor && !isCompleted ? (
                                        <input
                                            type="number"
                                            className="ml-2 border rounded px-2 py-1 flex-grow max-w-[100px] shadow-inner"
                                            defaultValue={step.dose_ml}
                                            onBlur={(e) => handleEditStep(step.id, { dose_ml: Number(e.target.value) })}
                                        />
                                    ) : (
                                        <span className="ml-2 font-mono bg-white px-2 py-0.5 rounded border">{step.dose_ml}</span>
                                    )}
                                </div>
                            </div>

                            {step.notes && <p className="text-xs text-gray-500 italic mt-1 border-t pt-1 border-gray-200">{step.notes}</p>}

                            {!isCompleted && (
                                <div className="mt-2 text-right">
                                    <button
                                        onClick={() => handleMarkExecuted(step.id)}
                                        className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-1.5 rounded shadow transition"
                                    >
                                        ✓ Marcar ejecutado
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
