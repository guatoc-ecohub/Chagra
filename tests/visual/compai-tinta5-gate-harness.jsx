/* eslint-disable react-refresh/only-export-components --
 * Harness de gate (no es módulo de app): monta y no exporta nada. */
/**
 * compai-tinta5-gate-harness.jsx — gate visual de los 5 compai del selector
 * de avatar (Ajustes → Apariencia) que monta AgentAvatarSelector.jsx, en
 * TINTA. Mismo contrato que el selector: los adaptadores ChagraAgentAvatarX
 * (cuerpo `*Trazado`), no los cuerpos pelados.
 *
 * `?compai=<slug>` aísla un compai (angelita|jaguar|zariguya|oso-baston|
 * luciernaga); `?estado=<estado>` elige el estado (default caminando). Cada
 * compai se muestra sobre papel (`#f4efe2`) en 3 tamaños: grande (anatomía),
 * 150 (plano medio) y 64 (tamaño real de avatar del selector).
 */
import { createRoot } from 'react-dom/client';
import ChagraAgentAvatarAngelita from '../../src/components/ChagraAgentAvatarAngelita.jsx';
import ChagraAgentAvatarZariguya from '../../src/components/ChagraAgentAvatarZariguya.jsx';
import ChagraAgentAvatarJaguar from '../../src/components/ChagraAgentAvatarJaguar.jsx';
import ChagraAgentAvatarOsoBaston from '../../src/components/ChagraAgentAvatarOsoBaston.jsx';
import ChagraAgentAvatarLuciernaga from '../../src/components/ChagraAgentAvatarLuciernaga.jsx';

const ROSTER = {
  angelita: { C: ChagraAgentAvatarAngelita },
  zariguya: { C: ChagraAgentAvatarZariguya },
  jaguar: { C: ChagraAgentAvatarJaguar },
  'oso-baston': { C: ChagraAgentAvatarOsoBaston },
  luciernaga: { C: ChagraAgentAvatarLuciernaga },
};

function parseParams() {
  const p = new URLSearchParams(window.location.search);
  const compai = (p.get('compai') || 'angelita').trim();
  const estado = (p.get('estado') || 'caminando').trim();
  return { compai, estado };
}

function Panel({ C, size, estado }) {
  return (
    <div
      style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <C estado={estado} size={size} />
    </div>
  );
}

function Gate() {
  const { compai, estado } = parseParams();
  const R = ROSTER[compai] || ROSTER.angelita;
  return (
    <main
      data-compai={compai}
      data-agt-estado={estado}
      style={{
        width: 560,
        height: 560,
        background: '#f4efe2',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        padding: '8px 0',
        boxSizing: 'border-box',
      }}
    >
      <Panel C={R.C} size={330} estado={estado} />
      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-end' }}>
        <Panel C={R.C} size={150} estado={estado} />
        <Panel C={R.C} size={64} estado={estado} />
      </div>
    </main>
  );
}

createRoot(document.getElementById('compai-root')).render(<Gate />);
