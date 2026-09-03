import React, { useState } from 'react';
import { X, ArrowRight, CheckCircle2, AlertTriangle, Layers, User, Info, Loader2 } from 'lucide-react';
import { previewSplit, executeSplit } from '../services/splitService';
import useAssetStore from '../store/useAssetStore';

/**
 * Asistente multi-paso para dividir o juntar activos (split/merge).
 * Soporta dos flujos: individual a agregado (juntar en grupo) y
 * agregado a individual (dividir en plantas individuales).
 *
 * Pasos del flujo:
 * 1. Selección de modo y cantidad
 * 2. Vista previa del resultado
 * 3. Confirmación humana (gate de seguridad)
 * 4. Resultado final
 *
 * @param {Object} props - Propiedades del componente.
 * @param {Object} props.asset - El activo a dividir o juntar.
 * @param {Function} props.onClose - Callback para cerrar el flujo.
 */
export const SplitFlow = ({ asset, onClose }) => {
    const [step, setStep] = useState(1);
    const [qty, setQty] = useState(2);
    const [rationale, setRationale] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [error, setError] = useState(null);
    const [, setResult] = useState(null);

    const addLog = useAssetStore(s => s.addLog);
    const addAssetsBulk = useAssetStore(s => s.addAssetsBulk);

    const trackingMode = asset.attributes?.tracking_mode || 'individual';
    const targetMode = trackingMode === 'individual' ? 'aggregate' : 'individual';

    // @ts-ignore
    const { childrenToCreate } = previewSplit(asset,
        trackingMode === 'individual' ? 'individual_to_aggregate' : 'aggregate_to_individual',
        { qty, rationale }
    );

    const handleExecute = async () => {
        setIsExecuting(true);
        setError(null);
        try {
            const res = await executeSplit(asset,
                trackingMode === 'individual' ? 'individual_to_aggregate' : 'aggregate_to_individual',
                { qty, rationale },
                // @ts-ignore
                { addLog, addAssetsBulk }
            );
            setResult(res);
            setStep(4);
        } catch (e) {
            setError(e.message);
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex flex-col p-6 animate-in fade-in duration-300" role="dialog" aria-modal="true" aria-label="Dividir activo">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Layers className="text-emerald-400" />
                    {trackingMode === 'individual' ? 'Juntar en grupo' : 'Dividir en plantas individuales'}
                </h2>
                <button onClick={/** @type {React.MouseEventHandler<HTMLButtonElement>} */ (onClose)} aria-label="Cerrar" className="p-2 text-slate-400 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
                {/* Progress Dots */}
                <div className="flex gap-2 mb-8 justify-center">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className={`h-1.5 rounded-full transition-all ${step >= s ? 'w-8 bg-emerald-500' : 'w-4 bg-slate-800'}`} />
                    ))}
                </div>

                {/* Step 1: Modes & Qty */}
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
                            <p className="text-sm text-slate-400 mb-4">Vas a cambiar cómo registras este activo:</p>
                            <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl">
                                <div className="text-center flex-1">
                                    <div className="inline-flex p-3 bg-slate-700 rounded-full mb-2">
                                        {trackingMode === 'individual' ? <User size={20} /> : <Layers size={20} />}
                                    </div>
                                    <p className="text-[10px] uppercase font-bold text-slate-500">{trackingMode}</p>
                                </div>
                                <ArrowRight className="text-slate-600" />
                                <div className="text-center flex-1">
                                    <div className="inline-flex p-3 bg-emerald-900/30 text-emerald-400 rounded-full mb-2">
                                        {targetMode === 'individual' ? <User size={20} /> : <Layers size={20} />}
                                    </div>
                                    <p className="text-[10px] uppercase font-bold text-emerald-500">{targetMode}</p>
                                </div>
                            </div>
                        </div>

                        {trackingMode === 'aggregate' && (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 px-1">¿Cuántas plantas individuales crear?</label>
                                <input
                                    type="number"
                                    min="2"
                                    max="50"
                                    value={qty}
                                    onChange={(e) => setQty(Number(e.target.value))}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white text-lg font-black focus:border-emerald-500 transition-colors"
                                />
                                <p className="text-[10px] text-slate-600 italic px-1">Se crearán {qty} nuevos activos con tracking individual.</p>
                            </div>
                        )}

                        <button
                            onClick={() => setStep(2)}
                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-900/20 active:scale-95 transition-transform"
                        >
                            Continuar a Vista previa
                        </button>
                    </div>
                )}

                {/* Step 2: Preview */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Info size={14} /> Resumen del Split
                            </h3>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Se crearán <strong>{childrenToCreate.length}</strong> nuevos activos.</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Los hijos heredarán <strong>toda la historia</strong> de "{asset.attributes?.name}".</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <span>El activo actual quedará marcado como <strong>"Spliteado"</strong> pero visible.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-300 px-1">Razón del cambio (opcional)</label>
                            <textarea
                                value={rationale}
                                onChange={(e) => setRationale(e.target.value)}
                                placeholder="Ej: error al sembrar, cambio de estrategia..."
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-emerald-500 transition-colors"
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-2xl font-bold">Atrás</button>
                            <button onClick={() => setStep(3)} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black">Confirmar</button>
                        </div>
                    </div>
                )}

                {/* Step 3: Human Gate */}
                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="p-6 bg-amber-900/10 border border-amber-900/50 rounded-2xl space-y-4">
                            <div className="flex items-center gap-2 text-amber-500 font-black">
                                <AlertTriangle size={20} />
                                <span>ADVERTENCIA</span>
                            </div>
                            <p className="text-sm text-amber-200/80 leading-relaxed">
                                El split es una operación **append-only**. Aunque no borra nada, genera nuevos registros permanentes.
                                ¿Seguro que quieres proceder?
                            </p>
                            <label className="flex items-center gap-3 p-4 bg-amber-900/20 rounded-xl border border-amber-900/40 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isConfirmed}
                                    onChange={(e) => setIsConfirmed(e.target.checked)}
                                    className="w-5 h-5 rounded border-amber-900 text-amber-600 focus:ring-amber-500 bg-slate-950"
                                />
                                <span className="text-xs font-bold text-amber-200">Entiendo: es irreversible al estado anterior sin otro split.</span>
                            </label>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-xl text-xs text-red-400">
                                ERROR: {error}
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button onClick={() => setStep(2)} className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-2xl font-bold">Atrás</button>
                            <button
                                onClick={handleExecute}
                                disabled={!isConfirmed || isExecuting}
                                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isExecuting ? <Loader2 className="animate-spin" /> : 'SÍ, EJECUTAR'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Result */}
                {step === 4 && (
                    <div className="space-y-6 animate-in zoom-in-95 duration-500 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="p-6 bg-emerald-500/10 rounded-full">
                                <CheckCircle2 size={64} className="text-emerald-500" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-white">¡Split completado!</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Se han creado los nuevos activos. Los encontrarás pronto en tu dashboard.
                            El activo original ha sido marcado como padre del split.
                        </p>
                        <button
                            onClick={/** @type {React.MouseEventHandler<HTMLButtonElement>} */ (onClose)}
                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black mt-8"
                        >
                            Listo, volver
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
