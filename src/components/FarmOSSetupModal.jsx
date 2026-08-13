import React, { useState } from 'react';
import { ArrowRight, ChevronDown, ExternalLink, Server, X } from 'lucide-react';

/** Configuración específica de FarmOS para una finca de la red. */
export default function FarmOSSetupModal({ finca, onClose, onConfigureLater }) {
  const [showTech, setShowTech] = useState(false);
  if (!finca) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="farmos-setup-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto bg-amber-900/30 rounded-full flex items-center justify-center">
              <Server size={28} className="text-amber-400" />
            </div>
            <h2 id="farmos-setup-title" className="text-xl font-bold text-white">
              Configurar FarmOS
            </h2>
            <p className="text-sm text-slate-400">
              Para usar <span className="text-white font-medium">{finca.nombre}</span> con Chagra,
              necesita conectar su servidor FarmOS.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              Chagra se conecta a un servidor FarmOS para guardar los datos de su finca.
              Si usted no administra el servidor, pídale a su técnico de confianza que lo configure.
            </p>
            <button
              type="button"
              onClick={() => setShowTech((visible) => !visible)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ChevronDown size={14} className={`transition-transform ${showTech ? 'rotate-180' : ''}`} />
              {showTech ? 'Ocultar opciones técnicas' : 'Ver opciones técnicas'}
            </button>
            {showTech ? (
              <ul className="text-xs text-slate-400 space-y-2">
                <li>1. Instale FarmOS en un servidor local o VPS.</li>
                <li>2. Use el servicio Hosted FarmOS.</li>
                <li>3. Configure el endpoint en los ajustes de Chagra.</li>
              </ul>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <a
              href="https://farmos.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-500 active:scale-95 transition-all"
            >
              <ExternalLink size={16} /> Visitar FarmOS.org <ArrowRight size={16} />
            </a>
            <button
              type="button"
              onClick={onConfigureLater}
              className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Configurar más tarde
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
