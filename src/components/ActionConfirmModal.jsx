import React, { useState } from 'react';
import { X, Check, Pencil, AlertTriangle, Loader2 } from 'lucide-react';

export default function ActionConfirmModal({
  isOpen,
  toolName,
  description,
  parameters,
  intent,
  llm_response,
  onApprove,
  onReject,
  onEdit,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedParams, setEditedParams] = useState(parameters);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    await onApprove(editedParams);
    setIsProcessing(false);
  };

  const handleReject = async () => {
    setIsProcessing(true);
    await onReject();
    setIsProcessing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setIsProcessing(true);
    await onEdit(editedParams);
    setIsProcessing(false);
  };

  const toolLabels = {
    crear_log: 'Crear registro',
    actualizar_planta: 'Actualizar planta',
    agendar_riego: 'Programar riego',
    query_corpus_dr034: 'Buscar en corpus',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleReject} />
      
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <AlertTriangle size={20} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                {toolLabels[toolName] || toolName}
              </h3>
              <p className="text-xs text-slate-400">Confirmar antes de ejecutar</p>
            </div>
          </div>
          <button
            onClick={handleReject}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {intent && (
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Tu solicitud:</p>
              <p className="text-sm text-slate-200">{intent}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-slate-400 mb-2">Descripción de la IA:</p>
            <p className="text-sm text-slate-300">{description}</p>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-2">
              Parámetros {isEditing ? '(editando)' : ''}:
            </p>
            {isEditing ? (
              <div className="space-y-2">
                {Object.entries(editedParams).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <label htmlFor={`action-param-${key}`} className="text-xs text-slate-500 mb-1">{key}</label>
                    <input
                      id={`action-param-${key}`}
                      type={typeof value === 'number' ? 'number' : 'text'}
                      value={value || ''}
                      onChange={(e) =>
                        setEditedParams((prev) => ({
                          ...prev,
                          [key]: typeof value === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                        }))
                      }
                      className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <pre className="text-xs text-slate-300 bg-slate-800 p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(parameters, null, 2)}
              </pre>
            )}
          </div>

          {llm_response && (
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Respuesta de la IA:</p>
              <p className="text-xs text-slate-500 line-clamp-3">{llm_response}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-sm bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-sm bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Guardar y ejecutar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-sm bg-red-900/30 text-red-400 hover:bg-red-800/50 disabled:opacity-50"
              >
                Rechazar
              </button>
              <button
                onClick={handleEdit}
                disabled={isProcessing}
                className="py-3 px-4 rounded-xl font-medium text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 flex items-center gap-2"
              >
                <Pencil size={16} />
                Editar
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-sm bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Aprobar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}