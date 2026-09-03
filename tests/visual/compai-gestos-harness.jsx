/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * Harness de test: strings fijas intencionales, solo para verificacion manual. */
/**
 * compai-gestos-harness.jsx — verificacion visual manual/secuencial del
 * repertorio de micro-gestos ociosos del compAI (2026-07-26).
 *
 * Monta UNA Angelita grande en estado 'acompana' con el idle-cerebro apagado
 * (idleCerebro={false}: el reloj interno no compite) y deja que el harness
 * fuerce cada gesto via `window.__setGesto('guino')` — el atributo
 * data-agt-idle llega por {...rest} al <svg> y el CSS dispara el one-shot,
 * exactamente igual que cuando el scheduler real lo pone.
 *
 * Temporal — no se importa desde ningun otro archivo del repo.
 */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { Angelita } from '../../src/visual/agente/Angelita.jsx';

function Gestos() {
  const [gesto, setGesto] = useState(null);
  // Canal del harness: forzar un gesto (o null para soltar). Reponer el mismo
  // gesto = soltar y volver a poner en el siguiente frame (reinicia el CSS).
  window.__setGesto = (g) => {
    setGesto(null);
    if (g) requestAnimationFrame(() => setGesto(g));
  };
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#f6efe2',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <Angelita
          estado="acompana"
          size={420}
          idleCerebro={false}
          data-agt-idle={gesto || undefined}
        />
        <p data-testid="gesto-activo" style={{ fontFamily: 'monospace', color: '#6b5d4f' }}>
          {gesto || '(sereno)'}
        </p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('gestos-root')).render(<Gestos />);
