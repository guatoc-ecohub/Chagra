/*
 * jaguar-camina — ARNÉS DE DIAGNÓSTICO VISUAL (scripts/diag, regla de la casa:
 * scripts versionados, no pegotes por SSH). Sirve para VER y CAPTURAR la
 * MARCHA del jaguar lámina-viva (estado 'caminando': gait cuadrúpedo IK +
 * foot-plant de jaguarLamina/marcha.js) junto a los 4 estados
 * conversacionales de control (idle/thinking/speaking/listening).
 *
 * La franja de telemetría pinta EN VIVO el reloj y las vars CSS que escribe
 * el motor de marcha (bob + cadera de las 4 patas), leídas del style inline
 * de la raíz del jaguar: cada screenshot PRUEBA qué instante del ciclo y qué
 * pose corría — evidencia cruda, no palabra.
 *
 * Uso (vite dev):  npm run dev  →  http://127.0.0.1:5173/scripts/diag/jaguar-camina.html
 * Captura:         node scripts/diag/jaguar-camina-shot.mjs <dirSalida>
 * NO va al bundle de prod: nada lo importa desde src/.
 */
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import JaguarLaminaViva from '../../src/visual/creatures/JaguarLaminaViva.jsx';

const ESTADOS_CONTROL = ['idle', 'thinking', 'speaking', 'listening'];
const VARS_TELEMETRIA = [
  ['bob', '--jlv-anda-bob'],
  ['delC', '--jlv-anda-delCercana-cadera'],
  ['delL', '--jlv-anda-delLejana-cadera'],
  ['trasC', '--jlv-anda-trasCercana-cadera'],
  ['trasL', '--jlv-anda-trasLejana-cadera'],
];

export default function Diag() {
  const hostRef = useRef(null);
  const [linea, setLinea] = useState('esperando motor…');
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const raiz = hostRef.current?.querySelector('[data-agt-estado="caminando"]');
      const val = (v) => (raiz && raiz.style.getPropertyValue(v)) || '·';
      const t = ((performance.now() - t0) / 1000).toFixed(2);
      setLinea(`t=${t}s  ${VARS_TELEMETRIA.map(([n, v]) => `${n}=${val(v)}`).join('  ')}`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={hostRef}>
      <div
        data-telemetria="1"
        style={{
          fontFamily: 'ui-monospace, monospace', fontSize: 13, padding: '6px 10px',
          background: '#1d130b', color: '#ffd9a0', whiteSpace: 'pre',
        }}
      >
        {linea}
      </div>
      <div style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 8px' }}>estado=&apos;caminando&apos; (velocidadPxS=34, la del roam)</h3>
        <JaguarLaminaViva estado="caminando" size={560} />
      </div>
      <div style={{ display: 'flex', gap: 12, padding: 16, alignItems: 'flex-end' }}>
        {ESTADOS_CONTROL.map((estado) => (
          <figure key={estado} style={{ margin: 0 }}>
            <JaguarLaminaViva estado={estado} size={190} />
            <figcaption style={{ fontSize: 12, textAlign: 'center' }}>{estado}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Diag />);
