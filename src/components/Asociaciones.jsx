import { useState } from 'react';
import arquetipos from '../data/asociaciones-arquetipos.json';
import { filterAsociacionesByRole } from '../services/asociacionesFilter';

export default function Asociaciones({ profile = {}, esOperador = false }) {
  const visibles = filterAsociacionesByRole(arquetipos, profile, { esOperador });
  const [abierta, setAbierta] = useState(null);

  return (
    <section className="space-y-4" aria-labelledby="asociaciones-title">
      <div className="rounded-2xl border border-emerald-700 bg-emerald-800 p-4 sm:p-5 dark:border-emerald-700/40 dark:bg-emerald-950/40">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">
          Capa de relación entre especies
        </p>
        <h2 id="asociaciones-title" className="mt-1 text-2xl sm:text-3xl font-black leading-tight text-white">
          Asociaciones / Policultivos
        </h2>
        <p className="mt-2 text-base sm:text-lg leading-relaxed text-emerald-50">
          Toca cada tarjeta para ver por qué esas especies se acompañan.
        </p>
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-slate-300 bg-white p-5 text-base text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200">
          No hay asociaciones sugeridas para este perfil todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibles.map((item) => {
            const expandida = abierta === item.id;
            return (
              <article
                key={item.id}
                aria-label={item.nombre}
                className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-lg shadow-black/5 dark:border-emerald-700/40 dark:bg-slate-900 dark:shadow-black/20"
              >
                <button
                  type="button"
                  aria-expanded={expandida}
                  onClick={() => setAbierta(expandida ? null : item.id)}
                  className="block w-full cursor-pointer p-4 text-left transition-colors hover:bg-emerald-50 sm:p-5 dark:hover:bg-slate-800/60"
                >
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-4xl dark:bg-emerald-400/15"
                    >
                      {item.icono}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl font-black leading-tight text-slate-900 dark:text-white">{item.nombre}</h3>
                      <p className="mt-1 text-base font-bold leading-snug text-emerald-700 dark:text-emerald-300">
                        {item.especies.join(' + ')}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`mt-1 shrink-0 text-lg text-emerald-600 transition-transform dark:text-emerald-300 ${expandida ? 'rotate-180' : ''}`}
                    >
                      ▾
                    </span>
                  </div>

                  <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-100">{item.beneficio}</p>

                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                      {item.rol.join(', ')}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-black/25 dark:text-slate-300">
                      Fuente: {item.fuente}
                    </span>
                  </div>

                  {!expandida && (
                    <p className="mt-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">Ver por qué funciona →</p>
                  )}
                </button>

                {expandida && (
                  <div className="border-t border-emerald-200 px-4 pb-4 pt-3 sm:px-5 dark:border-emerald-700/40">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Especies</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.especies.map((e) => (
                        <span
                          key={e}
                          className="rounded-lg bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-100"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                    {item.detalle && (
                      <>
                        <p className="mt-3 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          Por qué funciona
                        </p>
                        <p className="mt-1 text-base leading-relaxed text-slate-700 dark:text-slate-100">{item.detalle}</p>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
