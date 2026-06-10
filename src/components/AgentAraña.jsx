import AgentMano from './dashboard/AgentMano';

/**
 * AgentAraña — panel INLINE de capacidades del agente, bajo el AgentHero en el
 * home (DashboardLive). Decisión operador 2026-06-09 ("las dos"): usa la MANO
 * compartida (AgentMano), el mismo componente del bottom-sheet Ⓐ del AgentHero,
 * para que la metáfora sea una sola en sus dos accesos.
 *
 * Reemplaza las visualizaciones radiales previas (Nature/Biopunk araña), que
 * quedaron superadas por la mano. La mano es theme-aware vía data-theme:
 *   - nature   → rama de árbol + hojas
 *   - biopunk  → micorriza neón + esporas
 *   - minimalista → silueta sobria
 *
 * Rutea cada capacidad de verdad (igual que el sheet): nav → su vista, ask →
 * agente con la intención/prompt, foto → agente. Las `soon` no rutean.
 */
export default function AgentAraña({ onNavigate, onSelect }) {
  const pick = (cap) => {
    const r = cap && cap.route;
    if (!cap || cap.status === 'soon' || !r || r.kind === 'unavailable') return;
    if (onNavigate) {
      if (r.kind === 'nav') onNavigate(r.view);
      else if (r.kind === 'ask') onNavigate('agente', { intent: cap.intent, prompt: r.prompt });
      else onNavigate('agente', { intent: cap.intent || cap.id });
    } else {
      // Compat con el contrato legado onSelect(id).
      onSelect?.(cap.intent || cap.id);
    }
  };

  return (
    <section className="agent-mano-panel" aria-label="Todo lo que sabe hacer Chagra">
      <header className="agent-mano-panel-h">
        <span className="t">Todo lo que sé hacer</span>
        <span className="s">Cada rama es una ayuda para tu finca. Las opacas llegan pronto.</span>
      </header>
      <AgentMano onPick={pick} />
      <style>{`
        .agent-mano-panel {
          margin: 8px 0 4px; padding-top: 8px; border-top: 1px solid rgb(var(--c-surface-border) / .6);
        }
        .agent-mano-panel-h { display: block; text-align: center; padding: 4px 18px 2px; }
        .agent-mano-panel-h .t {
          display: block; font-size: 1.05rem; font-weight: 800; letter-spacing: -.01em;
          color: rgb(var(--c-slate-100));
        }
        .agent-mano-panel-h .s {
          display: block; margin-top: 3px; font-size: .82rem; line-height: 1.4;
          color: rgb(var(--c-slate-300));
        }
      `}</style>
    </section>
  );
}
