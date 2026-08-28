import React from 'react';
import { createRoot } from 'react-dom/client';
import { AngelitaEntrada } from '../visual/agente/AngelitaEntrada.jsx';
import { AngelitaSalida, MotasMisticas } from '../visual/agente/AngelitaSalida.jsx';
import { Angelita } from '../visual/agente/Angelita.jsx';
import ChagraAgentAvatarAngelita from '../components/ChagraAgentAvatarAngelita.jsx';

function Card({ title, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div style={{ width:240, height:240, display:'flex', alignItems:'center', justifyContent:'center',
        background:'radial-gradient(circle,#20242e,#0d0f14)', borderRadius:16 }}>
        {children}
      </div>
      <span style={{ fontSize:13, color:'#cbd5e1', fontFamily:'monospace' }}>{title}</span>
    </div>
  );
}

function App() {
  return (
    <div style={{ padding:24, fontFamily:'system-ui,sans-serif', color:'#e5e7eb' }}>
      <h1 style={{ fontSize:20 }}>Angelita — épico + místico entrada/salida + presencia</h1>
      <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
        {/* Frame ESTÁTICO del místico (forzado visible) para ver el look */}
        <Card title="místico (frame estático)">
          <span className="ang-entrada ang-entrada--crece demo-freeze" style={{ width:180, height:180 }}>
            <MotasMisticas />
            <span className="ang-entrada__escala"><Angelita estado="contenta" size={180} /></span>
            <span className="ang-entrada__aro" />
            <span className="ang-entrada__brillo" />
          </span>
        </Card>
        <Card title="entrada (vivo)">
          <AngelitaEntrada activa size={180} />
        </Card>
        <Card title="salida (vivo)">
          <AngelitaSalida activa size={180} />
        </Card>
        <Card title="presencia (hover/touch→natural)">
          <ChagraAgentAvatarAngelita reaccionaPresencia size={180} />
        </Card>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
