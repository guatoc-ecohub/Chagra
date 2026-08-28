/* eslint-disable react-refresh/only-export-components -- harness dev, sin HMR */
/**
 * vitrinaOso — harness de captura ANTES/DESPUÉS del repaint del oso del
 * bastón (volumen + anteojos). NO es parte de la app: página dev-only
 * (`/vitrina-oso.html`) para GPU-verify con chromium headless.
 *
 * Renderiza el MISMO mapeo estado→pose del adaptador de agente
 * (ChagraAgentAvatarOsoBaston): idle→anda · thinking→anda+resopla ·
 * speaking→celebra+V2 · listening→reposo. Con `vida={false}` para que el
 * idle-cerebro no dispare momentos aleatorios y la captura sea determinista.
 */
import { createRoot } from 'react-dom/client';
import { OsoBaston } from '../visual/creatures/OsoBaston.jsx';

const ESTADOS = [
  { id: 'idle', pose: 'anda', resopla: false, visema: null },
  { id: 'thinking', pose: 'anda', resopla: true, visema: null },
  { id: 'speaking', pose: 'celebra', resopla: false, visema: 'V2' },
  { id: 'listening', pose: 'reposo', resopla: false, visema: null },
];

function Celda({ e, size, fondo, tinta }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ background: fondo, borderRadius: 10, padding: 6, lineHeight: 0 }}>
        <OsoBaston
          pose={e.pose}
          resopla={e.resopla}
          visema={e.visema}
          size={size}
          vida={false}
          title={`oso ${e.id}`}
        />
      </div>
      <span style={{ font: '600 11px/1 ui-monospace, monospace', color: tinta }}>{e.id}</span>
    </div>
  );
}

function Fila({ titulo, size, fondo, tinta }) {
  return (
    <section style={{ marginBottom: 10 }}>
      <h2 style={{ margin: '0 0 4px', font: '700 12px/1 ui-monospace, monospace', color: '#8fa3b8' }}>
        {titulo}
      </h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        {ESTADOS.map((e) => <Celda key={e.id} e={e} size={size} fondo={fondo} tinta={tinta} />)}
      </div>
    </section>
  );
}

function Vitrina() {
  return (
    <main style={{ padding: 12 }}>
      <Fila titulo="200px · fondo oscuro (app)" size={200} fondo="#0f172a" tinta="#cbd5e1" />
      <Fila titulo="200px · fondo claro" size={200} fondo="#f2ead8" tinta="#94a3b8" />
      <Fila titulo="64px · tamaño avatar (oscuro / claro)" size={64} fondo="#0f172a" tinta="#cbd5e1" />
      <div style={{ display: 'flex', gap: 12, marginTop: -6 }}>
        {ESTADOS.map((e) => <Celda key={e.id} e={e} size={64} fondo="#f2ead8" tinta="#94a3b8" />)}
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<Vitrina />);
