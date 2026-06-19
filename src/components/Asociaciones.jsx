import arquetipos from '../data/asociaciones-arquetipos.json';
import { filterAsociacionesByRole } from '../services/asociacionesFilter';

export default function Asociaciones({ profile = {}, esOperador = false }) {
  const visibles = filterAsociacionesByRole(arquetipos, profile, { esOperador });

  return (
    <section className="space-y-4" aria-labelledby="asociaciones-title">
      <div className="rounded-2xl border border-emerald-700/30 bg-emerald-950/30 p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
          Capa de relación entre especies
        </p>
        <h2 id="asociaciones-title" className="mt-1 text-2xl sm:text-3xl font-black leading-tight text-white">
          Asociaciones / Policultivos
        </h2>
        <p className="mt-2 text-base sm:text-lg leading-relaxed text-slate-200">
          Mira combinaciones conocidas para sembrar especies que se acompañan. Cada tarjeta muestra el beneficio corto y la fuente.
        </p>
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 text-base text-slate-200">
          No hay asociaciones sugeridas para este perfil todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibles.map((item) => (
            <article
              key={item.id}
              aria-label={item.nombre}
              className="rounded-2xl border border-emerald-700/30 bg-gradient-to-br from-emerald-500/15 via-slate-900/85 to-lime-500/10 p-4 sm:p-5 shadow-lg shadow-black/20"
            >
              <div className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-400/15 text-4xl"
                >
                  {item.icono}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-black leading-tight text-white">{item.nombre}</h3>
                  <p className="mt-1 text-base font-semibold leading-snug text-emerald-100">
                    {item.especies.join(' + ')}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-base leading-relaxed text-slate-100">
                <p>{item.beneficio}</p>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-lg bg-white/10 px-2.5 py-1 font-semibold text-slate-200">
                    {item.rol.join(', ')}
                  </span>
                  <span className="rounded-lg bg-black/25 px-2.5 py-1 text-slate-300">
                    Fuente: {item.fuente}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
