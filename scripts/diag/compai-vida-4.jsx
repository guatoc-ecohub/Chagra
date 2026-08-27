/*
 * compai-vida-4 — ARNÉS DE DIAGNÓSTICO (2026-08-27): los 4 compai foco del
 * operador (jaguar TINTA, oso del bastón, zarigüeya TINTA, guacamaya) VIVOS,
 * con su MARCHA (patas articulando) y sus estados conversacionales.
 *
 * Cada bloque: una tira de 4 FOTOGRAMAS CONGELADOS del ciclo de marcha
 * (caminando) a fases distintas — la prueba de que las patas ALTERNAN, no
 * que se deslizan ni se quedan plantadas — más una fila VIVA con los estados
 * (idle/caminando/listening/thinking/speaking).
 *
 * Uso: npm run dev → http://127.0.0.1:5199/scripts/diag/compai-vida-4.html
 * Captura: shot3d --headed --tipo lamina "<url>" _gate/….png
 * NO va al bundle de prod: nada lo importa desde src/.
 */
/* eslint-disable react-refresh/only-export-components -- arnés de diag, no
   módulo de app: monta con createRoot, no exporta nada */
import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import JaguarTrazado from '../../src/visual/creatures/JaguarTrazado.jsx';
import ZariguyaTrazado from '../../src/visual/creatures/ZariguyaTrazado.jsx';
import { OsoBaston } from '../../src/visual/creatures/OsoBaston.jsx';
import { GuacamayaCompai } from '../../src/visual/creatures/GuacamayaCompai.jsx';

/* Congela TODAS las animaciones CSS del bloque en el instante `enS` (misma
   receta determinística de zariguya-tinta.jsx: animation:none → reflow →
   rearmar con paused + delay -enS, respetando el delay propio de cada hueso
   para no aplanar la contrafase de las patas). */
function Congelada({ enS, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const els = [...ref.current.querySelectorAll('*')];
    const delays = els.map((el) => getComputedStyle(el).animationDelay || '0s');
    for (const el of els) el.style.setProperty('animation', 'none', 'important');
    void ref.current.offsetWidth;
    els.forEach((el, i) => {
      el.style.removeProperty('animation');
      const corrido = delays[i].split(',').map((d) => `${(parseFloat(d) || 0) - enS}s`).join(',');
      el.style.setProperty('animation-delay', corrido, 'important');
      el.style.setProperty('animation-play-state', 'paused', 'important');
    });
  }, [enS]);
  return <div ref={ref}>{children}</div>;
}

function Fig({ nombre, children }) {
  return (
    <figure style={{ margin: 0, textAlign: 'center' }}>
      <div style={{ width: 190, height: 190, display: 'grid', placeItems: 'center', background: '#faf4e6', borderRadius: 10, border: '1px solid #d8c8a8' }}>
        {children}
      </div>
      <figcaption style={{ fontSize: 12, fontWeight: 600, marginTop: 3 }}>{nombre}</figcaption>
    </figure>
  );
}

const FILA = { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', padding: '4px 12px 14px' };
const SZ = 150;

/* ── Render por especie: el MISMO cableado que el avatar de agente ──────────── */
function Jaguar({ estado }) {
  return <JaguarTrazado estado={estado} animated size={SZ} title="Jaguar" />;
}
function Zariguya({ estado }) {
  return <ZariguyaTrazado estado={estado} animated size={SZ} title="Zarigüeya" />;
}
/* Oso: el avatar mapea el estado a la pose de OsoBaston (POSE_DE_STATE). */
const POSE_OSO = { idle: 'anda', caminando: 'camina', listening: 'reposo', thinking: 'anda', speaking: 'celebra' };
function Oso({ estado }) {
  return (
    <OsoBaston
      pose={POSE_OSO[estado] || 'anda'}
      resopla={estado === 'thinking'}
      visema={estado === 'speaking' ? 'V2' : null}
      animated
      vida
      size={SZ}
      title="Oso del bastón"
    />
  );
}
/* Guacamaya: voladora — su vocabulario rico (angelitaEstados). No camina. */
const EST_GUACA = { idle: 'acompana', caminando: 'acompana', listening: 'escuchando', thinking: 'pensando', speaking: 'respondiendo' };
function Guaca({ estado }) {
  return <GuacamayaCompai estado={EST_GUACA[estado] || 'acompana'} luces="realza" size={SZ} title="Guacamaya" />;
}

const ESPECIES = [
  { slug: 'jaguar', nombre: '🐆 Jaguar TINTA', Comp: Jaguar, camina: true },
  { slug: 'oso', nombre: '🐻 Oso del bastón', Comp: Oso, camina: true },
  { slug: 'zariguya', nombre: '🐀 Zarigüeya TINTA', Comp: Zariguya, camina: true },
  { slug: 'guacamaya', nombre: '🦜 Guacamaya (vuela)', Comp: Guaca, camina: false },
];

/* Fases del ciclo de marcha a congelar (s). Los ciclos rondan 0.6–1.3s; estos
   4 instantes caen en cuartos distintos de un período de ~1.4s → capturan las
   patas en posiciones claramente distintas. */
const FASES = [0, 0.35, 0.7, 1.05];

function Bloque({ slug, nombre, Comp, camina }) {
  return (
    <section>
      <h2>{nombre}</h2>
      {camina ? (
        <>
          <p className="nota">Marcha «caminando» congelada en 4 fases — las patas deben ALTERNAR (no deslizarse, no plantarse):</p>
          <div style={FILA} data-tira={`${slug}-marcha`}>
            {FASES.map((s, i) => (
              <Fig key={i} nombre={`caminando · fase ${i + 1} (${s}s)`}>
                <Congelada enS={s}><Comp estado="caminando" /></Congelada>
              </Fig>
            ))}
          </div>
        </>
      ) : (
        <p className="nota">Voladora: respeta su locomoción aérea (no recibe «caminando»); aquí en vuelo idle con luces místicas.</p>
      )}
      <p className="nota">Estados vivos:</p>
      <div style={FILA} data-tira={`${slug}-estados`}>
        {['idle', 'caminando', 'listening', 'thinking', 'speaking'].map((e) => (
          <Fig key={e} nombre={e}><Comp estado={e} /></Fig>
        ))}
      </div>
    </section>
  );
}

function Diag() {
  return (
    <div style={{ paddingBottom: 40 }}>
      <h1 style={{ margin: '14px 12px 2px' }}>compai vida 4 — marcha + estados (dev fix/compai-vida-3070)</h1>
      <p className="nota">Verificación GPU-headed: jaguar/oso/zarigüeya CAMINAN con patas articulando; guacamaya vuela. Todos respiran/parpadean/gesticulan.</p>
      {ESPECIES.map((e) => <Bloque key={e.slug} {...e} />)}
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Diag />);
