/*
 * ojo-medir — ARNÉS DE MEDICIÓN (uncommitted, NO va al bundle): rinde el
 * avatar REAL (ChagraAgentAvatarZariguya, animated=false → pose base limpia)
 * y ENCIMA una grilla SVG con el MISMO viewBox/preserveAspectRatio → cada
 * línea es una coord del calco 1:1. Fuerza el <svg> interno a 800x800 para
 * que el overlay calce exacto. Para leer el centro de la pupila del ojo
 * CERCANO sin estimar a ojo.
 */
/* eslint-disable */
import { createRoot } from 'react-dom/client';
import ChagraAgentAvatarZariguya from '../../src/components/ChagraAgentAvatarZariguya.jsx';

const SZ = 800;

function GridOverlay() {
  const lineas = [];
  for (let x = 100; x <= 300; x += 10) {
    const g = x % 50 === 0;
    lineas.push(<line key={'x' + x} x1={x} y1={20} x2={x} y2={170} stroke={g ? '#e11' : '#e1180055'} strokeWidth={g ? 0.7 : 0.3} />);
    if (g) lineas.push(<text key={'xt' + x} x={x + 1} y={28} fontSize={7} fill="#c00">{x}</text>);
  }
  for (let y = 30; y <= 160; y += 10) {
    const g = y % 50 === 0;
    lineas.push(<line key={'y' + y} x1={100} y1={y} x2={300} y2={y} stroke={g ? '#11e' : '#1118e055'} strokeWidth={g ? 0.7 : 0.3} />);
    if (g) lineas.push(<text key={'yt' + y} x={101} y={y - 1} fontSize={7} fill="#00c">{y}</text>);
  }
  return (
    <svg width={SZ} height={SZ} viewBox="-30 -25 545 500" preserveAspectRatio="xMidYMid meet"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {lineas}
      <circle cx={176} cy={80} r={1.6} fill="#0a0" />
      <text x={140} y={95} fontSize={6} fill="#0a0">halo-cerca 176,80</text>
      <circle cx={245} cy={74} r={1.6} fill="#a0a" />
      <text x={247} y={74} fontSize={6} fill="#a0a">halo-lejos 245,74</text>
    </svg>
  );
}

function App() {
  return (
    <div style={{ padding: 12, background: '#faf4e6' }}>
      {/* Fuerza el <svg> interno del avatar al mismo box que el overlay. */}
      <style>{`[data-calibrar] svg.zariguyaHuesos{ width:${SZ}px !important; height:${SZ}px !important; }`}</style>
      <div data-calibrar data-medir style={{ position: 'relative', width: SZ, height: SZ }}>
        <ChagraAgentAvatarZariguya state="idle" size={SZ} animated={false} />
        <GridOverlay />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
