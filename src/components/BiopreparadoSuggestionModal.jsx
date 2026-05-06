import React, { useState } from 'react';
import { X, Beaker, Clock, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';

/**
 * BiopreparadoSuggestionModal, Modal sugerencia de biopreparados para un
 * ingrediente que el operador acaba de agregar al inventario.
 *
 * Trigger: post-create asset--material en AssetsDashboard.handleSave si
 * findBiopreparadosByIngredient(material.name) devuelve >= 1 receta.
 *
 * UX: lista colapsable de biopreparados que pueden hacerse con ese material.
 * Tap en uno expande receta (proceso_resumen + tiempo + ingredientes
 * faltantes que el operador necesitaría).
 *
 * Miguel UX 2026-05-03: "si el usuario agrega a la bodega melaza o suero
 * de leche chagra automaticamente sugiere la creacion de biopreparado o
 * en caso de que no sugiere y enseña como se hace".
 *
 * Props:
 *   - ingredientName: string del material que disparó la sugerencia
 *   - biopreparados: array de biopreparado objects desde catalogDB
 *   - onClose: callback cierre modal
 */
export default function BiopreparadoSuggestionModal({ ingredientName, biopreparados, onClose }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!biopreparados || biopreparados.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="w-full max-w-lg bg-slate-950 border border-emerald-800/50 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <header className="p-4 bg-gradient-to-r from-emerald-900/40 to-emerald-950/40 border-b border-emerald-800/40 flex items-start gap-3 shrink-0">
          <Beaker size={22} className="text-emerald-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-emerald-300">¡Ya tiene {ingredientName}!</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Con esto puede preparar {biopreparados.length} biopreparado{biopreparados.length > 1 ? 's' : ''} agroecológico{biopreparados.length > 1 ? 's' : ''}:
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 hover:bg-slate-800 rounded text-slate-400 shrink-0"
          >
            <X size={18} />
          </button>
        </header>

        {/* Body, lista colapsable de biopreparados */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {biopreparados.map((bp) => {
            const isOpen = expandedId === bp.id;
            return (
              <div
                key={bp.id}
                className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : bp.id)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-slate-800/60 active:bg-slate-800 text-left min-h-[56px]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{bp.nombre}</p>
                    <p className="text-[11px] text-slate-500">
                      {bp.tipo} · {bp.tiempo_elaboracion_dias ? `${bp.tiempo_elaboracion_dias} días` : 'tiempo variable'}
                      {Array.isArray(bp.proposito) && ` · ${bp.proposito.slice(0, 2).join(', ')}`}
                    </p>
                  </div>
                  {isOpen ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-300 space-y-3 border-t border-slate-800">
                    {bp.ingredientes && bp.ingredientes.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Ingredientes</p>
                        <div className="flex flex-wrap gap-1">
                          {bp.ingredientes.map((ing, i) => {
                            const isMatch = ing.toLowerCase().includes(ingredientName.toLowerCase());
                            return (
                              <span
                                key={i}
                                className={`text-[11px] px-2 py-0.5 rounded ${
                                  isMatch
                                    ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {ing}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {bp.proceso_resumen && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1 flex items-center gap-1">
                          <BookOpen size={10} /> Proceso
                        </p>
                        <p className="text-xs text-slate-300 leading-relaxed">{bp.proceso_resumen}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
                      {bp.tiempo_elaboracion_dias && (
                        <span className="inline-flex items-center gap-1">
                          <Clock size={10} /> Elaboración: {bp.tiempo_elaboracion_dias} días
                        </span>
                      )}
                      {bp.vida_util_dias && (
                        <span>Vida útil: {bp.vida_util_dias} días</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="p-3 border-t border-slate-800 shrink-0">
          <p className="text-[10px] text-slate-600 italic text-center">
            Recetas curadas por catálogo Chagra. Las cantidades exactas y proporciones se especificarán en futuros field guides.
          </p>
        </footer>
      </div>
    </div>
  );
}
