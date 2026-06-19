import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Clock, Beaker, ShieldAlert, Apple } from 'lucide-react';
import { getAllFermentos } from '../db/catalogDB';

/**
 * FermentosView — galería de fermentos alimentarios y vetos de seguridad.
 *
 * Muestra:
 * - 18 fermentos alimentarios tradicionales colombianos con sus pasos de preparación
 * - 6 VETOS CRÍTICOS de seguridad (botulismo, plomo, cianuro, etc.) en ROJO destacado
 *
 * La sección de vetos es IMPOSIBLE de ignorar: alerta roja, ícono de triángulo,
 * advertencias claras sobre consecuencias (MUERTE, DAÑO NEUROLÓGICO IRREVERSIBLE).
 * Estos no son "consejos": son RIESGOS VITALES documentados.
 */
export default function FermentosView() {
  const [fermentos, setFermentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => getAllFermentos())
      .then((list) => {
        if (alive) setFermentos(list || []);
      })
      .catch((err) => {
        console.error('[FermentosView] Error cargando fermentos:', err);
        if (alive) setFermentos([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400 text-sm">Cargando fermentos...</div>
      </div>
    );
  }

  const alimentarios = fermentos.filter((f) => f.tipo === 'alimentario');
  const vetos = fermentos.filter((f) => f.tipo === 'veto');

  return (
    <div className="space-y-6">
      {/* ── VETOS DE SEGURIDAD: PRIMERO, IMPOSIBLE DE IGNORAR ─────────────────── */}
      {vetos.length > 0 && (
        <section
          aria-label="Advertencias de seguridad críticas"
          className="border-2 border-red-700 bg-red-950/40 rounded-2xl p-5 space-y-4"
        >
          <header className="flex items-center gap-3">
            <ShieldAlert size={28} className="text-red-400 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-black text-red-100 uppercase tracking-wide">
                ADVERTENCIAS DE SEGURIDAD CRÍTICAS
              </h2>
              <p className="text-xs text-red-300/80 mt-0.5">
                Lea atentamente. Riesgos documentados de MUERTE y DAÑO IRREVERSIBLE.
              </p>
            </div>
          </header>

          <div className="space-y-3">
            {vetos.map((veto) => (
              <article
                key={veto.id}
                data-testid={`veto-${veto.id}`}
                className="bg-red-950/60 border border-red-800 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    size={24}
                    className="text-red-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <header className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-base font-bold text-red-100 leading-tight">
                        {veto.nombre.replace(/^VETO:\s*/i, '')}
                      </h3>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          veto.riesgo_nivel === 'CRÍTICO'
                            ? 'bg-red-900 text-red-100 border-red-700'
                            : 'bg-orange-900 text-orange-100 border-orange-700'
                        }`}
                      >
                        {veto.riesgo_nivel}
                      </span>
                    </header>
                    <p className="text-sm text-red-200 leading-snug mb-2">
                      {veto.descripcion}
                    </p>
                    <div className="bg-red-950/80 rounded-lg p-3 border border-red-900/50">
                      <p className="text-xs text-red-100 leading-relaxed">
                        <strong className="text-red-400">Por qué:</strong> {veto.razon_veto}
                      </p>
                    </div>
                    {veto.consecuencia_potencial && (
                      <p className="text-[10px] text-red-300 mt-2 font-semibold">
                        Consecuencia: {veto.consecuencia_potencial}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── FERMENTOS ALIMENTARIOS ─────────────────────────────────────────────── */}
      <section aria-label="Fermentos alimentarios tradicionales">
        <header className="flex items-center gap-2 mb-4">
          <Apple size={24} className="text-emerald-400 shrink-0" aria-hidden="true" />
          <h2 className="text-lg font-black text-slate-100">
            Fermentos alimentarios ({alimentarios.length})
          </h2>
        </header>

        {alimentarios.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No hay fermentos registrados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alimentarios.map((fermento) => (
              <article
                key={fermento.id}
                data-testid={`fermento-${fermento.id}`}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 hover:bg-slate-900/80 transition-colors"
              >
                <header className="flex items-center gap-2 mb-3">
                  <Beaker size={18} className="text-emerald-400 shrink-0" aria-hidden="true" />
                  <h3 className="text-base font-bold text-slate-100">{fermento.nombre}</h3>
                </header>

                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                  {fermento.descripcion}
                </p>

                {fermento.pasos && fermento.pasos.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
                      Pasos de preparación
                    </p>
                    <ol className="space-y-1.5">
                      {fermento.pasos.map((paso, i) => (
                        <li key={i} className="text-xs text-slate-300 pl-4">
                          <span className="text-emerald-400 mr-2">{i + 1}.</span>
                          {paso}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800">
                  {fermento.tiempo_elaboracion_horas && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock size={12} aria-hidden="true" />
                      <span>
                        {fermento.tiempo_elaboracion_horas < 24
                          ? `${fermento.tiempo_elaboracion_horas}h`
                          : `${Math.ceil(fermento.tiempo_elaboracion_horas / 24)}d`}
                      </span>
                    </div>
                  )}
                  {fermento.tiempo_elaboracion_dias && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock size={12} aria-hidden="true" />
                      <span>{fermento.tiempo_elaboracion_dias}d</span>
                    </div>
                  )}
                  {fermento.vida_util_dias && (
                    <span className="text-[10px] text-slate-500">
                      Vida útil: {fermento.vida_util_dias}d
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
