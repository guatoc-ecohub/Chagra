/* gate4 — vista (uncommitted): los 4 compai TINTA con los componentes del
   agente REAL, estados idle/caminando/listening/thinking/speaking. */
/* eslint-disable */
import { createRoot } from 'react-dom/client';
import ChagraAgentAvatarJaguar from '../../src/components/ChagraAgentAvatarJaguar.jsx';
import ChagraAgentAvatarZariguya from '../../src/components/ChagraAgentAvatarZariguya.jsx';
import ChagraAgentAvatarOsoBaston from '../../src/components/ChagraAgentAvatarOsoBaston.jsx';
import ChagraAgentAvatarGuacamaya from '../../src/components/ChagraAgentAvatarGuacamaya.jsx';

const ESTADOS = ['idle', 'caminando', 'listening', 'thinking', 'speaking'];
const CELDA = { width: 250, height: 250, display: 'grid', placeItems: 'center', background: '#faf4e6', borderRadius: 12, border: '1px solid #d8c8a8' };
const CAP = { fontSize: 12, fontWeight: 600, marginTop: 4, textAlign: 'center', fontFamily: 'system-ui' };

function Fila({ nombre, Comp }) {
  return (
    <section style={{ padding: '8px 12px' }}>
      <h3 style={{ fontFamily: 'system-ui', fontSize: 15, margin: '4px 0' }}>{nombre}</h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {ESTADOS.map((e) => (
          <figure key={e} style={{ margin: 0 }}>
            <div style={CELDA}><Comp state={e} size={220} /></div>
            <figcaption style={CAP}>{e}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function App() {
  return (
    <div data-gate style={{ padding: 8, background: '#eee6d2' }}>
      <Fila nombre="Jaguar (tinta)" Comp={ChagraAgentAvatarJaguar} />
      <Fila nombre="Zarigüeya (tinta) — ojo cercano corregido" Comp={ChagraAgentAvatarZariguya} />
      <Fila nombre="Oso del bastón (tinta)" Comp={ChagraAgentAvatarOsoBaston} />
      <Fila nombre="Guacamaya (tinta) — sin tocar" Comp={ChagraAgentAvatarGuacamaya} />
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
