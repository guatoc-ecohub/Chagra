import React, { useState, useEffect } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { getAllBiopreparados } from '../db/catalogDB';
import { tieneDiagrama } from '../data/biopreparado-diagramas';
import BiopreparadoDiagrama from './BiopreparadoDiagrama';

/**
 * BiopreparadoRecetasGallery — galería browsable de las recetas de biopreparados
 * con diagrama gráfico paso-a-paso (BiopreparadoDiagrama).
 *
 * Antes, los diagramas SOLO salían vía BiopreparadoSuggestionModal al agregar un
 * material que matcheara un ingrediente — inalcanzables si la Bodega estaba vacía
 * (bug operador 2026-06-11: "solo veo Biofábrica vacía y no me deja hacer nada").
 * Esto los hace visibles directo, sin tener que registrar nada en el inventario.
 *
 * Carga la lista de biopreparados (catálogo) y filtra a los que tienen diagrama.
 * Tolera que listAllBiopreparados sea sync o async (Promise.resolve). Si no hay
 * recetas con diagrama, el botón no se renderiza.
 */
export default function BiopreparadoRecetasGallery() {
  const [open, setOpen] = useState(false);
  const [bps, setBps] = useState([]);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => getAllBiopreparados())
      .then((list) => {
        if (alive) setBps((list || []).filter((bp) => bp && bp.id && tieneDiagrama(bp.id)));
      })
      .catch(() => { /* sin recetas → el botón no aparece, no rompe la Bodega */ });
    return () => { alive = false; };
  }, []);

  if (bps.length === 0) return null;

  return (
    <>
      <button
        type="button"
        data-testid="ver-recetas-biopreparados"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 min-h-[var(--tap-min,44px)] px-4 py-2 rounded-[var(--r-pill,999px)] bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-[var(--sombra-2,0_6px_18px_rgb(8_30_22/0.22))] motion-safe:transition-all motion-safe:active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
      >
        <FlaskConical size={16} aria-hidden="true" />
        Ver recetas de biopreparados ({bps.length})
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Recetas de biopreparados"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-t-[var(--r-xl,24px)] sm:rounded-[var(--r-xl,24px)] w-full sm:max-w-2xl max-h-[88vh] overflow-y-auto shadow-[var(--sombra-3,0_16px_44px_rgb(8_30_22/0.30))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">Recetas de biopreparados</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {bps.map((bp) => (
                <BiopreparadoDiagrama key={bp.id} biopreparado={bp} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
