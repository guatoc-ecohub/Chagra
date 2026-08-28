/* ojo-ver — vista limpia (uncommitted): avatar REAL zarigüeya en pose base,
   grande, sin overlay, para juzgar el ojo cercano tras la cirugía en fuente. */
/* eslint-disable */
import { createRoot } from 'react-dom/client';
import ChagraAgentAvatarZariguya from '../../src/components/ChagraAgentAvatarZariguya.jsx';
const SZ = 800;
function App() {
  return (
    <div data-ver style={{ padding: 12, background: '#faf4e6', width: SZ + 24 }}>
      <style>{`[data-ver] svg.zariguyaHuesos{ width:${SZ}px !important; height:${SZ}px !important; }`}</style>
      <ChagraAgentAvatarZariguya state="idle" size={SZ} animated={false} />
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
