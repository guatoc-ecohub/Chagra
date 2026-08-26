/*
 * zariguya-camina — ARNÉS DE DIAGNÓSTICO VISUAL (scripts/diag, regla de la
 * casa: scripts versionados, no pegotes por SSH). FASE 1 del protocolo
 * zariguya-camina (2026-08-26): la MARCHA del trazado sobre la piel APROBADA
 * intacta (5eab6dff1) — patas que ARTICULAN (cadera+rodilla cercanas,
 * cadera+tobillo lejanas), cabeza SIEMPRE unida, coronilla SIN parche (fix
 * kipá: casquete acotado a la juntura + bob de cabeza suave).
 *
 * Muestra: reposo (control de identidad) · caminando VIVO · tira de 4 FASES
 * congeladas a cuartos del ciclo 0.8s (animation-delay negativo + paused):
 * un frame NO prueba que camina; cuatro a T/4 prueban alternancia de patas
 * y cabeza pegada en TODO el ciclo. Todo con modo="normal" (sin la ventana
 * actuando del 70/30, que metería boil fuerte a la evidencia).
 *
 * Uso (vite dev):  npm run dev  →
 *   http://127.0.0.1:5199/scripts/diag/zariguya-camina.html
 * Captura GPU:     shot3d --headed --tipo lamina "<url>" _gate/….png
 * NO va al bundle de prod: nada lo importa desde src/.
 */
/* eslint-disable react-refresh/only-export-components -- arnés de diag, no
   módulo de app: monta con createRoot, no exporta nada */
import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import ZariguyaTrazado from '../../src/visual/creatures/ZariguyaTrazado.jsx';

/* Congela TODAS las animaciones CSS del bloque en el instante `enS` (delay
   negativo + paused): la tira de fases muestra CUATRO instantes exactos del
   ciclo de marcha en UNA captura — evidencia cruda, no palabra. */
function Congelada({ enS, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    for (const el of ref.current.querySelectorAll('*')) {
      el.style.setProperty('animation-delay', `${-enS}s`, 'important');
      el.style.setProperty('animation-play-state', 'paused', 'important');
    }
  }, [enS]);
  return <div ref={ref}>{children}</div>;
}

function Fig({ nombre, children }) {
  return (
    <figure style={{ margin: 0, textAlign: 'center' }}>
      {children}
      <figcaption style={{ fontSize: 13, fontWeight: 600 }}>{nombre}</figcaption>
    </figure>
  );
}

const FILA = { display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap', padding: 12 };

function Diag() {
  return (
    <div>
      <div style={{ font: '600 13px ui-monospace, monospace', padding: '6px 10px', background: '#1d130b', color: '#ffd9a0' }}>
        zariguya-camina · FASE 1 (walk sobre piel aprobada) · {new Date().toISOString()}
      </div>
      <div style={FILA}>
        <Fig nombre="reposo (control identidad)">
          <ZariguyaTrazado estado="idle" modo="normal" size={340} />
        </Fig>
        <Fig nombre="caminando (vivo)">
          <ZariguyaTrazado estado="caminando" modo="normal" size={340} />
        </Fig>
      </div>
      <h3 style={{ margin: '4px 8px' }}>tira de fases del ciclo .8s (congeladas)</h3>
      <div style={FILA}>
        {[0.05, 0.25, 0.45, 0.65].map((t) => (
          <Fig key={t} nombre={`t=${t}s`}>
            <Congelada enS={t}>
              <ZariguyaTrazado estado="caminando" modo="normal" size={252} />
            </Congelada>
          </Fig>
        ))}
      </div>
      <h3 style={{ margin: '4px 8px' }}>mirada en marcha (zhMiraAnda al extremo −9°, congelada) — prueba anti-kipá/anti-decapitación</h3>
      <div style={FILA}>
        {[4.5, 4.9].map((t) => (
          <Fig key={t} nombre={`t=${t}s (mira a cámara andando)`}>
            <Congelada enS={t}>
              <ZariguyaTrazado estado="caminando" modo="normal" size={252} />
            </Congelada>
          </Fig>
        ))}
        <Fig nombre="control: idle giro sereno −10° (t=2.5s) — el gate aprobado no regresa">
          <Congelada enS={2.5}>
            <ZariguyaTrazado estado="idle" modo="normal" size={252} />
          </Congelada>
        </Fig>
      </div>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Diag />);
