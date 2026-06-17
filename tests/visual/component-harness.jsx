/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * Harness visual de test: strings fijas intencionales para baselines. */
/* eslint-disable react-refresh/only-export-components --
 * Este archivo es el entry point del harness visual. No exporta componentes
 * porque createRoot monta directamente en el DOM. Fast-refresh es irrelevante
 * aqui (la pagina se recarga entera para ver cambios visuales). */
/**
 * component-harness.jsx — Entry del harness visual de la gallery de componentes.
 *
 * Monta los componentes REALES con todas sus variantes (props/states) para
 * inspeccion visual. No entra al bundle de produccion — solo se usa en
 * tests/visual.
 *
 * Uso: npx vite tests/visual/component-harness.html?type=<colibri|colibri_svg|maiz>
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import ChagraAgentAvatar from '../../src/components/ChagraAgentAvatar.jsx';
import StatusBadge from '../../src/components/StatusBadge.jsx';
import OfflineChip from '../../src/components/OfflineChip.jsx';
import SyncIndicator from '../../src/components/SyncIndicator.jsx';
import CriticalAlertBanner from '../../src/components/CriticalAlertBanner.jsx';
import AIBetaBadge from '../../src/components/AIBetaBadge.jsx';
import { PLANT_STATUSES, TASK_STATUSES, PEST_STATUSES } from '../../src/constants/assetStatuses';

const params = new URLSearchParams(window.location.search);
const forcedType = params.get('type');

// Forzar tipo de avatar via localStorage para el harness sin tocar prefs reales.
if (forcedType && ['colibri', 'colibri_svg', 'maiz'].includes(forcedType)) {
  try {
    localStorage.setItem('chagra:agent-avatar-type', forcedType);
  } catch { /* no-op */ }
}

const AGENT_STATES = ['idle', 'thinking', 'speaking', 'listening'];

const STATUS_SETS = [
  { type: 'plant', label: 'Plantas', statuses: PLANT_STATUSES },
  { type: 'task', label: 'Tareas', statuses: TASK_STATUSES },
  { type: 'pest', label: 'Plagas', statuses: PEST_STATUSES },
];

const AIBETA_LEVELS = [
  { confidence: undefined, label: 'default' },
  { confidence: 0.95, label: 'high' },
  { confidence: 0.6, label: 'mid' },
  { confidence: 0.2, label: 'low' },
];

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-emerald-300 mb-4 uppercase tracking-wider border-b border-slate-800 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ComponentGallery() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10">
      <h1 className="text-2xl font-black text-white uppercase tracking-widest text-center">
        Component Gallery
      </h1>

      {/* ===== ChagraAgentAvatar ===== */}
      <Section title="ChagraAgentAvatar (todas las variantes)">
        <p className="text-xs text-slate-500 mb-3">
          Forzar tipo via query: <code>?type=colibri</code>,{' '}
          <code>?type=colibri_svg</code>, <code>?type=maiz</code>. Default: colibri (foto).
        </p>
        <div className="flex flex-wrap items-end gap-6">
          {AGENT_STATES.map((state) => (
            <div key={state} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold">{state}</span>
              <ChagraAgentAvatar state={state} size={56} withLabel />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-[10px] text-slate-400 uppercase font-bold">
            glow + idle
          </span>
          <ChagraAgentAvatar state="idle" size={40} glow />
        </div>
      </Section>

      {/* ===== StatusBadge ===== */}
      <Section title="StatusBadge (todos los tipos y estados)">
        {STATUS_SETS.map(({ type, label, statuses }) => (
          <div key={type} className="mb-4">
            <h3 className="text-xs font-bold text-slate-500 mb-2">{label}</h3>
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => (
                <StatusBadge key={s.id} status={s.id} type={type} />
              ))}
            </div>
          </div>
        ))}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500">editable:</span>
          <StatusBadge status="growing" type="plant" editable />
        </div>
      </Section>

      {/* ===== OfflineChip ===== */}
      <Section title="OfflineChip">
        <p className="text-xs text-slate-500 mb-2">
          Visible solo cuando navigator.onLine === false. Para visualizarlo, usa
          DevTools: Network tab, Throttling: Offline.
        </p>
        <OfflineChip />
      </Section>

      {/* ===== SyncIndicator ===== */}
      <Section title="SyncIndicator">
        <p className="text-xs text-slate-500 mb-2">
          Muestra estado online/offline + pendientes de sync (lee syncManager en vivo).
        </p>
        <SyncIndicator />
      </Section>

      {/* ===== CriticalAlertBanner ===== */}
      <Section title="CriticalAlertBanner">
        <p className="text-xs text-slate-500 mb-2">
          Aparece cuando hay alertas criticas activas (useAlertStore o
          notificationsService). Para activar una demo:
          <br />
          <code>
            sessionStorage.setItem(&quot;chagra:demo:seed-helada&quot;, &quot;1&quot;);
            window.dispatchEvent(new Event(&quot;alertTriggered&quot;));
          </code>
        </p>
        <CriticalAlertBanner />
      </Section>

      {/* ===== AIBetaBadge ===== */}
      <Section title="AIBetaBadge (todos los niveles de confianza)">
        <div className="flex flex-wrap items-center gap-4">
          {AIBETA_LEVELS.map(({ confidence, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold">
                {label}
              </span>
              <AIBetaBadge confidence={confidence} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase font-bold">
            title override:
          </span>
          <AIBetaBadge
            title="Identificacion via IA, verifica antes de actuar"
            confidence={0.3}
          />
        </div>
      </Section>
    </div>
  );
}

createRoot(document.getElementById('gallery-root')).render(<ComponentGallery />);
