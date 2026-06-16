/* eslint-disable react-refresh/only-export-components */
/**
 * component-harness.jsx — Entry del harness visual de galeria de componentes.
 *
 * Monta TODOS los componentes de UI reutilizables de Chagra (avatar, badges,
 * alertas, indicadores de sync/conexion) en un grid navegable para inspeccion
 * visual en navegador. No depende del router/auth de la app completa.
 *
 * Uso: abre tests/visual/component-harness.html en el navegador.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import ChagraAgentAvatar from '../../src/components/ChagraAgentAvatar.jsx';
import StatusBadge from '../../src/components/StatusBadge.jsx';
import CriticalAlertBanner from '../../src/components/CriticalAlertBanner.jsx';
import SyncIndicator from '../../src/components/SyncIndicator.jsx';
import OfflineChip from '../../src/components/OfflineChip.jsx';
import NetworkStatusBar from '../../src/components/NetworkStatusBar.jsx';
import { PLANT_STATUSES, TASK_STATUSES, PEST_STATUSES } from '../../src/constants/assetStatuses.js';

try {
  const avType = new URLSearchParams(window.location.search).get('avatar') || 'colibri';
  localStorage.setItem('chagra:agent-avatar-type', avType);
} catch (_) {
  /* noop — localStorage not available */
}

const AVATAR_STATES = ['idle', 'thinking', 'speaking', 'listening'];
const AVATAR_SIZES = [32, 56, 80, 120];

const STATUS_MATRIX = [
  { type: 'plant', statuses: PLANT_STATUSES.map((s) => s.id) },
  { type: 'task', statuses: TASK_STATUSES.map((s) => s.id) },
  { type: 'pest', statuses: PEST_STATUSES.map((s) => s.id) },
];

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 800, marginBottom: 12, paddingBottom: 4, borderBottom: '1px solid #334155' }}>{title}</h2>
      {children}
    </section>
  );
}

function Card({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 16, background: '#1e293b', borderRadius: 12, border: '1px solid #334155', minWidth: 120 }}>
      {children}
      <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

function App() {
  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto', background: '#0f172a', minHeight: '100vh' }}>
      <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 900, marginBottom: 24 }}>
        Chagra Component Gallery
      </h1>

      <Section title="ChagraAgentAvatar — Variants &amp; Sizes">
        {AVATAR_STATES.map((state) => (
          <div key={state} style={{ marginBottom: 20 }}>
            <h3 style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>{state}</h3>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              {AVATAR_SIZES.map((size) => (
                <Card key={size} label={`${size}px`}>
                  <ChagraAgentAvatar state={state} size={size} />
                </Card>
              ))}
              <Card label="withLabel">
                <ChagraAgentAvatar state={state} size={56} withLabel />
              </Card>
              <Card label="glow">
                <ChagraAgentAvatar state={state} size={56} glow />
              </Card>
            </div>
          </div>
        ))}
      </Section>

      <Section title="StatusBadge — All Types &amp; Statuses">
        {STATUS_MATRIX.map(({ type, statuses }) => (
          <div key={type} style={{ marginBottom: 16 }}>
            <h3 style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>{type}</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {statuses.map((s) => (
                <StatusBadge key={s} type={type} status={s} />
              ))}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 8 }}>
          <h3 style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>editable</h3>
          <StatusBadge type="plant" status="growing" editable onChange={() => {}} />
        </div>
      </Section>

      <Section title="CriticalAlertBanner — Example">
        <div style={{ position: 'relative', minHeight: 80 }}>
          <CriticalAlertBanner onNavigate={(v) => console.log('navigate', v)} />
        </div>
        <p style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
          Se renderiza solo cuando hay alertas criticas activas.
        </p>
      </Section>

      <Section title="SyncIndicator">
        <SyncIndicator />
      </Section>

      <Section title="OfflineChip — Ambient indicator">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <OfflineChip />
          <button type="button" onClick={() => { window.dispatchEvent(new Event('offline')); }} style={{ padding: '4px 12px', background: '#334155', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            Simulate offline
          </button>
          <button type="button" onClick={() => { window.dispatchEvent(new Event('online')); }} style={{ padding: '4px 12px', background: '#334155', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            Simulate online
          </button>
        </div>
      </Section>

      <Section title="NetworkStatusBar — Connection States">
        <div style={{ maxWidth: 600 }}>
          <NetworkStatusBar />
        </div>
      </Section>
    </div>
  );
}

createRoot(document.getElementById('gallery-root')).render(<App />);
