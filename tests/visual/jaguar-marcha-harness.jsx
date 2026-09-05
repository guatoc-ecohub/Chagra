/* eslint-disable react-refresh/only-export-components -- Harness visual aislado. */
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import ChagraAgentAvatarJaguar from '../../src/components/ChagraAgentAvatarJaguar.jsx';

function JaguarMarchaHarness() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f6efe2' }}>
      <section aria-label="Compai jaguar caminando" style={{ display: 'grid', justifyItems: 'center', gap: 14 }}>
        <ChagraAgentAvatarJaguar state="caminando" size={64} animated reaccionaPresencia={false} />
        <p style={{ margin: 0, color: '#6b5d4f', font: '600 12px/1.2 system-ui, sans-serif' }}>Compai · caminando</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('jaguar-marcha-root')).render(<JaguarMarchaHarness />);
