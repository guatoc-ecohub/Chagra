import React, { useState } from 'react';
import { Sprout, AlertTriangle, ChevronDown, ChevronUp, Bug, Wrench } from 'lucide-react';
import { GUIAS_DEMO } from '../../data/aprendizaje/guias-demo.js';
import { IconoEtapaCiclo } from '../../visual/icons/index.js';

/**
 * GuiaEspecieCards — tarjetas visuales del módulo de APRENDIZAJE.
 *
 * Renderiza las etapas fenológicas de una especie como tarjetas en orden
 * (germinación → vegetativo → floración → fructificación → cosecha → producto).
 *
 * Cada tarjeta muestra:
 *   - Nombre de la etapa
 *   - Días desde siembra
 *   - Qué hacer (manejo)
 *   - Qué vigilar (plaga de la ventana)
 *
 * Pensado para voz: textos cortos, claros, sin tecnicismos innecesarios.
 * Móvil-first: responsive, touch-friendly, colapsable para ahorrar espacio.
 *
 * Props:
 *   - especie: string — 'papa' | 'cafe' | (futuro: cualquier slug del catálogo)
 *   - etapas: array<Object> — (opcional) si se pasa, usa este en vez del demo.
 *     Cada objeto debe tener: {orden, nombre, dias, manejo, plaga_ventana}
 *
 * Español colombiano (tú/usted), nunca voseo argentino.
 */
export default function GuiaEspecieCards({ especie = 'papa', etapas: etapasProp = null }) {
  const [expanded, setExpanded] = useState(true);

  // Si se pasan etapas como prop, usarlas; si no, usar demo
  const etapas = etapasProp || GUIAS_DEMO[especie] || GUIAS_DEMO.papa;

  if (!etapas || etapas.length === 0) {
    return (
      <div
        data-testid="guia-especie-cards"
        className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 mt-2 text-sm text-slate-400"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle size={14} aria-hidden="true" />
          No hay información de guías para esta especie.
        </span>
      </div>
    );
  }

  const getEtapaColor = (orden) => {
    const colors = [
      'border-lime-600 bg-lime-900/20 text-lime-200',    // Germinación
      'border-green-600 bg-green-900/20 text-green-200',  // Vegetativo
      'border-pink-600 bg-pink-900/20 text-pink-200',    // Floración
      'border-amber-600 bg-amber-900/20 text-amber-200',  // Fructificación
      'border-yellow-600 bg-yellow-900/20 text-yellow-200', // Cosecha
      'border-slate-600 bg-slate-900/20 text-slate-200'  // Producto
    ];
    return colors[orden - 1] || colors[colors.length - 1];
  };

  return (
    <div
      data-testid="guia-especie-cards"
      className="rounded-xl border border-slate-700 bg-slate-900 mt-2 overflow-hidden"
    >
      {/* Header del card — siempre visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        data-testid="guia-especie-cards-toggle"
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-lime-400/60"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Sprout size={14} className="text-lime-400" aria-hidden="true" />
          Guía de la especie
          <span className="text-slate-500 font-normal normal-case"> · {especie}</span>
        </span>
        <span className="flex items-center gap-2">
          {expanded ? (
            <ChevronUp size={14} className="text-slate-400" aria-hidden="true" />
          ) : (
            <ChevronDown size={14} className="text-slate-400" aria-hidden="true" />
          )}
        </span>
      </button>

      {/* Cuerpo colapsable */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3">
          {etapas.map((etapa) => (
            <div
              key={etapa.orden}
              data-testid={`guia-especie-etapa-${etapa.orden}`}
              className={`border-l-4 ${getEtapaColor(etapa.orden).split(' ')[0]} rounded-r-lg bg-slate-800/40 p-3`}
            >
              {/* Header de la tarjeta */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${getEtapaColor(etapa.orden)}`}>
                    <IconoEtapaCiclo orden={etapa.orden} size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      {etapa.nombre}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {etapa.dias}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contenido: manejo y plaga */}
              <div className="space-y-2">
                {/* Qué hacer (manejo) */}
                <div className="flex items-start gap-2">
                  <Wrench size={12} className="text-sky-400 mt-0.5 shrink-0" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-sky-200 mb-0.5">Qué hacer</p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {etapa.manejo}
                    </p>
                  </div>
                </div>

                {/* Qué vigilar (plaga) */}
                <div className="flex items-start gap-2">
                  <Bug size={12} className="text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-amber-200 mb-0.5">Qué vigilar</p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {etapa.plaga_ventana}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}