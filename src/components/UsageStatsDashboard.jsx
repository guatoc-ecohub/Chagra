import { useEffect, useState } from 'react';
import { ArrowLeft, Home, BarChart3, Users, Activity, Calendar, Gamepad2, AlertTriangle, Star } from 'lucide-react';
import { fetchUsageSummary } from '../services/usageTelemetrySync';
import { esOperadorActual } from '../config/glaciarAccess';

/**
 * UsageStatsDashboard — Panel de ANALÍTICA ANÓNIMA de producto (solo operador).
 *
 * Muestra el agregado anónimo del sidecar (/telemetry/usage): pantallas y
 * funciones más usadas, categorías más consultadas al agente, ranking de juegos
 * (favorito → más abandonado) y métricas de sesiones/eventos.
 *
 * Privacy (innegociable):
 * - 100% ANÓNIMO. NUNCA muestra nombres, email, GPS, finca_id ni texto de
 *   prompts. La tarjeta "Top usuarios por nombre" es un placeholder DESACTIVADO.
 * - Gate de operador: si no es el operador, no se muestra ningún dato.
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 *
 * @param {{ onBack: Function, onHome?: Function|null, summary?: object|null }} props
 */

// Etiquetas amigables en español para los ids de juego.
const GAME_LABELS = {
  milpa: 'Milpa',
  doom_finca: 'Doom Finca',
  defensores: 'Defensores de la finca',
  mi_finca_viva: 'Mi Finca Viva',
  mundo_subsuelo: 'Mundo Subsuelo',
  mario: 'Mario agroecológico',
};

const gameLabel = (id) => GAME_LABELS[id] || id;

// Formatea una fecha ISO/epoch corta (es-CO). Devuelve '—' si no es válida.
function shortDate(value) {
  if (!value && value !== 0) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

/** Barra horizontal simple (ancho relativo al máximo). */
function BarRow({ label, count, max }) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-300 truncate">{label}</span>
        <span className="text-slate-400 tabular-nums shrink-0">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500/80" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Sección con barras a partir de una lista [{key,count}]. */
function BarSection({ title, icon: Icon, items }) {
  const list = Array.isArray(items) ? items : [];
  const max = list.reduce((m, it) => Math.max(m, it?.count || 0), 0);
  return (
    <section className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
        {Icon ? <Icon size={16} className="text-emerald-400" /> : null}
        {title}
      </h3>
      {list.length === 0 ? (
        <p className="text-xs text-slate-500">Sin datos todavía.</p>
      ) : (
        <div className="space-y-2.5">
          {list.map((it) => (
            <BarRow key={it.key} label={it.key} count={it.count || 0} max={max} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Tarjeta de métrica simple. */
function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex-1 min-w-[8rem]">
      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
        {Icon ? <Icon size={14} /> : null}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-black text-white tabular-nums">{value}</div>
    </div>
  );
}

export default function UsageStatsDashboard({ onBack, onHome = null, summary = null }) {
  const esOperador = esOperadorActual();
  // Si llega un `summary` por prop (tests/capturas), úsalo sin pedir red. El
  // gate de operador o el summary inyectado resuelven el estado inicial sin
  // setState síncrono en el efecto.
  const [data, setData] = useState(summary || null);
  const [loading, setLoading] = useState(!summary && esOperador);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Solo se busca por red si NO hay summary inyectado y es operador.
    if (summary || !esOperador) return undefined;
    let cancelado = false;
    (async () => {
      const result = await fetchUsageSummary();
      if (cancelado) return;
      if (!result) {
        setError(true);
        setData(null);
      } else {
        setData(result);
        setError(false);
      }
      setLoading(false);
    })();
    return () => { cancelado = true; };
  }, [summary, esOperador]);

  // ── Gate de operador ──────────────────────────────────────────────────────
  if (!esOperador) {
    return (
      <div className="p-4 pb-20 max-w-3xl mx-auto">
        <Header onBack={onBack} onHome={onHome} />
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 text-center">
          <p className="text-slate-300 font-bold">Panel solo para el operador</p>
          <p className="text-slate-500 text-sm mt-1">Esta vista de analítica está reservada.</p>
        </div>
      </div>
    );
  }

  // ── Estados de carga / error ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 pb-20 max-w-3xl mx-auto">
        <Header onBack={onBack} onHome={onHome} />
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 text-center text-slate-400">
          Cargando estadísticas…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 pb-20 max-w-3xl mx-auto">
        <Header onBack={onBack} onHome={onHome} />
        <div className="rounded-2xl bg-amber-900/20 border border-amber-800/50 p-6 text-center text-amber-300">
          No se pudieron cargar las estadísticas. Revisa la conexión con el sidecar.
        </div>
      </div>
    );
  }

  const totalEvents = data.total_events || 0;
  const window = data.window || {};
  const topScreens = Array.isArray(data.top_screens) ? data.top_screens : [];
  const topFeatures = Array.isArray(data.top_features) ? data.top_features : [];
  const topAgent = Array.isArray(data.top_agent_categories) ? data.top_agent_categories : [];
  const games = Array.isArray(data.games) ? data.games : [];
  const favoriteGame = data.favorite_game || null;
  const mostAbandonedGame = data.most_abandoned_game || null;

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto space-y-4">
      <Header onBack={onBack} onHome={onHome} />

      {/* Estado vacío */}
      {totalEvents === 0 ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 text-center text-slate-400">
          Aún no hay datos de uso.
        </div>
      ) : (
        <>
          {/* Fila de métricas */}
          <div className="flex flex-wrap gap-3">
            <StatCard icon={Users} label="Sesiones activas" value={data.active_sessions ?? 0} />
            <StatCard icon={Activity} label="Eventos totales" value={totalEvents} />
            <StatCard
              icon={Calendar}
              label="Ventana"
              value={`${shortDate(window.from)} → ${shortDate(window.to)}`}
            />
          </div>

          <BarSection title="Pantallas más usadas" icon={BarChart3} items={topScreens} />
          <BarSection title="Funciones más usadas" icon={BarChart3} items={topFeatures} />
          <BarSection title="Lo más consultado al agente" icon={BarChart3} items={topAgent} />

          {/* Ranking de juegos: favorito → más abandonado */}
          <section className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Gamepad2 size={16} className="text-emerald-400" />
              Juegos: favorito → más abandonado
            </h3>
            {games.length === 0 ? (
              <p className="text-xs text-slate-500">Sin partidas registradas todavía.</p>
            ) : (
              <ul className="space-y-2">
                {games.map((g) => {
                  const abandonPct = Math.round((g.abandon_rate || 0) * 100);
                  const esFavorito = favoriteGame && g.game_id === favoriteGame;
                  const esMasAbandonado = mostAbandonedGame && g.game_id === mostAbandonedGame;
                  return (
                    <li
                      key={g.game_id}
                      className="rounded-xl bg-slate-950/40 border border-slate-800 p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-200 font-bold text-sm truncate">{gameLabel(g.game_id)}</span>
                          {esFavorito ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-900/30 rounded-full px-2 py-0.5">
                              <Star size={10} /> favorito
                            </span>
                          ) : null}
                          {esMasAbandonado ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-900/30 rounded-full px-2 py-0.5">
                              <AlertTriangle size={10} /> más abandonado
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {(g.starts || 0)} inicios · {(g.completes || 0)} completados
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold tabular-nums rounded-full px-2.5 py-1 shrink-0 ${
                          abandonPct >= 50
                            ? 'text-rose-300 bg-rose-900/30'
                            : abandonPct >= 25
                              ? 'text-amber-300 bg-amber-900/30'
                              : 'text-emerald-300 bg-emerald-900/30'
                        }`}
                      >
                        {abandonPct}% abandono
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {/*
        FEATURE-FLAG OFF (STATS_NAMED_USERS): nombres pendientes de OK del operador; excluiría menores.
        Placeholder DESACTIVADO: la telemetría es 100% anónima, así que NO se
        renderiza ningún nombre. `named_users_enabled` viene en false desde el
        sidecar y aquí se respeta siempre.
      */}
      <section className="rounded-2xl bg-slate-900/40 border border-dashed border-slate-700 p-4">
        <h3 className="text-sm font-bold text-slate-400">
          Top usuarios por nombre — pendiente de tu OK de privacidad
        </h3>
        <p className="text-xs text-slate-600 mt-1">
          Función desactivada (telemetría anónima). Pendiente de decisión de privacidad del operador.
        </p>
      </section>
    </div>
  );
}

/** Encabezado con botón de regreso (y opcional de inicio). */
function Header({ onBack, onHome = null }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver"
        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
      >
        <ArrowLeft size={18} />
      </button>
      <div className="flex-1">
        <h2 className="text-xl font-black text-white">Estadísticas de uso</h2>
        <p className="text-xs text-slate-500">Analítica anónima de producto</p>
      </div>
      {onHome ? (
        <button
          type="button"
          onClick={onHome}
          aria-label="Inicio"
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
        >
          <Home size={18} />
        </button>
      ) : null}
    </div>
  );
}
