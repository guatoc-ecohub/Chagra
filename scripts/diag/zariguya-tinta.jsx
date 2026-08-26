/*
 * zariguya-tinta — ARNÉS DE DIAGNÓSTICO (fase 1 DE-CERO 2026-08-26):
 * fidelidad a la lámina Gemini (color/kipá/bigote) + marcha articulada.
 *
 * BLOQUE 0 (arriba, en (0,0)): el reposo 1:1 — contenedor 545×500 = el
 * viewBox exacto (-30,-25 545×500), así que px de página = px de viewBox y
 * el px (x,y) de la LÁMINA cae en (x+30, y+25) de la captura. De ahí salen
 * los deltas NUMÉRICOS por región contra zariguya-gemini-hero.png y el
 * recorte de coronilla para el juez. QUIETO (animaciones pausadas en t=0):
 * el frame de identidad, sin fase de respiración de por medio.
 *
 * BLOQUE 1: reposo vivo + caminando vivo.
 * BLOQUE 2: tira de 4 fases del ciclo de .8s congeladas (delay negativo +
 * paused) — la prueba de ALTERNANCIA por pixel-diff, un frame no prueba nada.
 * BLOQUE 3: mirada -9° en marcha y giro idle -10° congelados — anti-kipá /
 * anti-decapitación en los extremos del giro.
 *
 * Uso: npm run dev → http://127.0.0.1:5199/scripts/diag/zariguya-tinta.html
 * Captura: shot3d --headed --tipo lamina "<url>" _gate/….png
 * NO va al bundle de prod: nada lo importa desde src/.
 */
/* eslint-disable react-refresh/only-export-components -- arnés de diag, no
   módulo de app: monta con createRoot, no exporta nada */
import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import ZariguyaTrazado from '../../src/visual/creatures/ZariguyaTrazado.jsx';

/* Congela TODAS las animaciones CSS del bloque EXACTAMENTE en el instante
   `enS`. No basta pausar con delay negativo: las animaciones ya corrieron ε
   segundos entre el mount y el effect (con la página pesada ε>1s) y el
   frame quedaba en enS+ε — el gate capturaba fases equivocadas (párpados
   cerrados leídos como "mancha en el ojo", jitter entre capturas). Receta
   determinística: animation:none → reflow (mata los relojes) → rearmar con
   paused + delay -enS: renacen YA pausadas, clavadas en enS exacto. */
function Congelada({ enS, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const els = [...ref.current.querySelectorAll('*')];
    /* 1. Leer el delay COMPUTADO de cada elemento ANTES de tocar nada: los
       huesos traen desfases propios (contrafase de patas −paso/2, cola en
       cascada). Pisarlos con un delay uniforme ROMPÍA la marcha congelada:
       ambas patas quedaban en fase (falso maniquí). El delay final = el
       suyo − enS (todo el conjunto retratado en el instante global enS;
       las instancias del arnés llevan --zh-fase:0s para que el hash por
       instancia no meta azar). */
    const delays = els.map((el) => getComputedStyle(el).animationDelay || '0s');
    for (const el of els) el.style.setProperty('animation', 'none', 'important');
    void ref.current.offsetWidth; // reflow: descarta el tiempo ya corrido
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
      {children}
      <figcaption style={{ fontSize: 13, fontWeight: 600 }}>{nombre}</figcaption>
    </figure>
  );
}

const FILA = { display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap', padding: 12 };

function Diag() {
  return (
    <div>
      {/* BLOQUE 0 — 1:1 (px página = px viewBox): izquierda el QUIETO
          (animated=false, frame de identidad para los deltas numéricos),
          derecha el VIVO (idle animado) al MISMO 1:1 — así el juez compara
          sin el emborronado del re-muestreo del navegador a tamaños chicos. */}
      <div style={{ display: 'flex' }}>
        <div style={{ width: 545, height: 500, overflow: 'hidden' }}>
          <ZariguyaTrazado estado="idle" modo="normal" animated={false} size={545} style={{ width: 545, height: 500 }} />
        </div>
        {/* vivo pero CONGELADO en t=7.4s — instante REPRESENTATIVO y
            reproducible con TODOS los relojes cerca de base: cola 3.7s en
            ciclo exacto (2.0), giro 7.9s en ~94% (≈0°), blink 5.6s en 32%
            (ojo abierto). Capturar el pane vivo suelto era lotería
            (blink/giro/coletazo/momento-de-vida aleatorio) y cada gate
            juzgaba un frame distinto. */}
        <Congelada enS={7.4}>
          <div style={{ width: 545, height: 500, overflow: 'hidden' }}>
            <ZariguyaTrazado estado="idle" modo="normal" size={545} style={{ width: 545, height: 500, '--zh-fase': '0s' }} />
          </div>
        </Congelada>
      </div>
      <div style={{ font: '600 13px ui-monospace, monospace', padding: '6px 10px', background: '#1d130b', color: '#ffd9a0' }}>
        zariguya-tinta · fase 1 DE-CERO (fidelidad + marcha) · {new Date().toISOString()}
      </div>
      <div style={FILA}>
        <Fig nombre="reposo (vivo)">
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
              <ZariguyaTrazado estado="caminando" modo="normal" size={252} style={{ '--zh-fase': '0s' }} />
            </Congelada>
          </Fig>
        ))}
      </div>
      <h3 style={{ margin: '4px 8px' }}>extremos de giro (anti-kipá / anti-decapitación)</h3>
      <div style={FILA}>
        {/* 5.0/5.3: zhMiraAnda (6.3s) está clavado en −9° (68-86%) y zhBlink
            (5.6s) tiene el ojo ABIERTO — 4.5s congelaba en pleno parpadeo y
            el frame mostraba párpados cerrados como parches (falso positivo
            del gate, no defecto). */}
        {[5.0, 5.3].map((t) => (
          <Fig key={t} nombre={`t=${t}s (mira a cámara andando)`}>
            <Congelada enS={t}>
              <ZariguyaTrazado estado="caminando" modo="normal" size={252} style={{ '--zh-fase': '0s' }} />
            </Congelada>
          </Fig>
        ))}
        <Fig nombre="idle giro sereno −10° (t=2.5s)">
          <Congelada enS={2.5}>
            <ZariguyaTrazado estado="idle" modo="normal" size={252} style={{ '--zh-fase': '0s' }} />
          </Congelada>
        </Fig>
      </div>

      {/* ═══ FASE 2 — POSES PLENAS, una lámina a la vez con gate ═══
          Viñetas CLAVADAS con poseForzada (determinista: el ciclo React de
          escucha no depende del reloj de captura); el "vivo" al lado muestra
          el ciclo real. El bloque 1:1 (545×500 = viewBox) da el frame para
          el lado-a-lado del juez contra la lámina Gemini cruda. */}
      <h3 style={{ margin: '4px 8px' }}>FASE 2 · escucha (listening) — ciclo 02→03→04→03</h3>
      <div style={{ display: 'flex' }} data-gate="escucha-1a1">
        <div style={{ width: 545, height: 500, overflow: 'hidden' }}>
          <ZariguyaTrazado estado="listening" poseForzada="escucha-03" modo="normal" animated={false} size={545} style={{ width: 545, height: 500 }} />
        </div>
      </div>
      <div style={FILA} data-gate="escucha-fila">
        {['escucha-02', 'escucha-03', 'escucha-04'].map((p) => (
          <Fig key={p} nombre={`viñeta ${p}`}>
            <ZariguyaTrazado estado="listening" poseForzada={p} modo="normal" animated={false} size={300} />
          </Fig>
        ))}
        <Fig nombre="listening VIVO (ciclo real)">
          <ZariguyaTrazado estado="listening" modo="normal" size={300} />
        </Fig>
        <Fig nombre="chico 100px → close-up 01">
          <ZariguyaTrazado estado="listening" modo="normal" size={100} />
        </Fig>
      </div>

      <h3 style={{ margin: '4px 8px' }}>FASE 2 · ver-lupa (thinking)</h3>
      <div style={{ display: 'flex' }} data-gate="verlupa-1a1">
        <div style={{ width: 545, height: 500, overflow: 'hidden' }}>
          <ZariguyaTrazado estado="thinking" modo="normal" animated={false} size={545} style={{ width: 545, height: 500 }} />
        </div>
        <Fig nombre="thinking VIVO (lee)">
          <ZariguyaTrazado estado="thinking" modo="normal" size={340} />
        </Fig>
      </div>

      <h3 style={{ margin: '4px 8px' }}>FASE 2 · se-hace-la-muerta (vida tanatosis)</h3>
      <div style={{ display: 'flex' }} data-gate="muerta-1a1">
        <div style={{ width: 545, height: 500, overflow: 'hidden' }}>
          <ZariguyaTrazado estado="idle" vidaForzada="tanatosis" modo="normal" animated={false} size={545} style={{ width: 545, height: 500 }} />
        </div>
        <Fig nombre="tanatosis VIVA (finge respirar)">
          <ZariguyaTrazado estado="idle" vidaForzada="tanatosis" modo="normal" size={340} />
        </Fig>
      </div>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Diag />);
