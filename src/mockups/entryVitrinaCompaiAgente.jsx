import React from 'react';
import { createRoot } from 'react-dom/client';
import ChagraAgentAvatarAngelita from '../components/ChagraAgentAvatarAngelita';
import ChagraAgentAvatarJaguar from '../components/ChagraAgentAvatarJaguar';
import ChagraAgentAvatarOsoBaston from '../components/ChagraAgentAvatarOsoBaston';
import ChagraAgentAvatarZariguya from '../components/ChagraAgentAvatarZariguya';
import ChagraAgentAvatarLuciernaga from '../components/ChagraAgentAvatarLuciernaga';
import ChagraAgentAvatarChivitoPunk from '../components/ChagraAgentAvatarChivitoPunk';
import GuacamayaCompai from '../visual/creatures/GuacamayaCompai';

const STATES = ['idle', 'thinking', 'speaking', 'listening'];
// guacamaya usa vocabulario rico (estado), el resto el angosto (state)
const RICO = { idle: 'acompana', thinking: 'pensando', speaking: 'respondiendo', listening: 'escuchando' };

const FILAS = [
  { slug: 'angelita',  Comp: ChagraAgentAvatarAngelita,  rico: true },
  { slug: 'jaguar',    Comp: ChagraAgentAvatarJaguar,     rico: false },
  { slug: 'oso-baston',Comp: ChagraAgentAvatarOsoBaston,  rico: false },
  { slug: 'zariguya',  Comp: ChagraAgentAvatarZariguya,   rico: false },
  { slug: 'luciernaga',Comp: ChagraAgentAvatarLuciernaga, rico: false },
  { slug: 'chivito-punk', Comp: null, guaca: false },
  { slug: 'guacamaya', Comp: null, guaca: true },
];

function Celda({ fila, st }) {
  const size = 200;
  let cuerpo;
  if (fila.guaca) {
    cuerpo = <GuacamayaCompai estado={RICO[st]} size={size} />;
  } else if (fila.slug === 'chivito-punk') {
    // el agente usa ChivitoPunk (rig valle) via su adaptador
    const C = ChagraAgentAvatarChivitoPunk;
    cuerpo = <C state={st} size={size} />;
  } else if (fila.rico) {
    const C = fila.Comp;
    cuerpo = <C estado={RICO[st]} size={size} />;
  } else {
    const C = fila.Comp;
    cuerpo = <C state={st} size={size} />;
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, width:size+24, minHeight:size+40 }}>
      <div style={{ width:size, height:size, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.03)', borderRadius:12, overflow:'hidden' }} data-estado={st}>
        {cuerpo}
      </div>
      <span style={{ fontSize:12, color:'#666', fontFamily:'monospace' }}>{st}</span>
    </div>
  );
}

function App() {
  return (
    <div style={{ padding:24, fontFamily:'system-ui,sans-serif' }}>
      <h1 style={{ fontSize:20 }}>Vitrina compai-agente — 7 avatares × 4 estados (dev HEAD 0d11e1895)</h1>
      <p style={{ fontSize:13, color:'#888' }}>Cada fila = cuerpo REAL del agente conversacional (el que ve el usuario). guacamaya/angelita = vocab rico; jaguar/oso/zariguya/luciérnaga/chivito = vocab angosto.</p>
      {FILAS.map((fila) => (
        <section key={fila.slug} style={{ marginBottom:28 }}>
          <h2 style={{ fontSize:15, margin:'8px 0', textTransform:'capitalize' }}>{fila.slug}</h2>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            {STATES.map((st) => <Celda key={st} fila={fila} st={st} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
