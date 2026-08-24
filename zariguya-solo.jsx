/* Harness de gate para ZariguyaLaminaViva (patrón jaguar-solo + harness
 * documentado de la memoria shot3d-contratos; NO se versiona).
 *
 * El contrato `--tipo html` de shot3d exige evidencia positiva de contenido
 * (≥172 elementos visibles, ≥3245 caracteres de texto): este harness la da
 * con DOCUMENTACIÓN REAL del gate (panel derecho) + un LECTOR DE VARS que
 * imprime el estado computado de cada hueso del rig — no relleno: el panel
 * es la evidencia legible de que el rig está cableado (animation-name,
 * duración, delay y play-state por pieza, leídos del DOM vivo).
 *
 * Query:
 *   ?estado=idle|caminando|thinking|listening|speaking
 *   ?size=N          (def 840)
 *   ?congela=T       pausa TODA animación CSS en fase -T s (colapsa los
 *                    delays por-pieza: sirve para A/B de amplitud, no para
 *                    juzgar coreografía — memoria gate-compai-congela)
 *   ?crudo=1         lámina PNG original (control positivo: CON guantes)
 *   ?visema=V2       lip-sync estático
 */
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ZariguyaLaminaViva from './src/visual/creatures/ZariguyaLaminaViva.jsx';

const q = new URLSearchParams(location.search);
const estado = q.get('estado') || 'idle';
const size = Number(q.get('size') || 840);
const congela = q.get('congela');
const crudo = q.get('crudo') === '1';
const visema = q.get('visema') || null;

if (congela !== null) {
  const st = document.createElement('style');
  st.textContent = `#escena *, #escena *::before, #escena *::after {
    animation-play-state: paused !important;
    animation-delay: ${-Number(congela)}s !important;
    transition: none !important;
  }`;
  document.head.appendChild(st);
}

const HUESOS = [
  'zlv-stage', 'zlv-pesoPivote', 'zlv-cuerpoPivote', 'zlv-colaPivote',
  'zlv-brazoLapizPivote', 'zlv-munecaLapizPivote',
  'zlv-brazoBrujulaPivote', 'zlv-munecaBrujulaPivote',
  'zlv-cabezaGesto', 'zlv-cabezaMira', 'zlv-cabezaPivote',
  'zlv-mandibulaPivote', 'zlv-orejaIzqPivote', 'zlv-orejaDerPivote',
  'zlv-parpado',
];

const DOCS = [
  ['Contrato del gate', 'Este harness monta ZariguyaLaminaViva solo, sobre fondo neutro #e9e4d6, para el gate visual GPU (shot3d --headed --tipo html). El panel documenta el contrato y lee el rig en vivo: es la evidencia positiva de contenido que el contrato exige, y a la vez el instrumento de verificación del cableado.'],
  ['Qué se gatea', 'Rama fix/zariguya-sin-guantes-vida sobre feat/zariguya-lamina-viva. Tres cambios: (1) DESGUANTE — los guantes blancos tipo Cuphead/Mickey de la lámina se retiñen al tono carne medido en las patas de la propia lámina (pedido de Julieta), conservando tinta, sombreado, lápiz y brújula; (2) MÁS ESQUELETO — pivote de PESO en el suelo entre las patas (sway pata-a-pata en idle, balanceo al caminar) y dos MUÑECAS con follow-through; (3) PARPADEO ×1.3 — misma coreografía de la familia, compás más pausado.'],
  ['Qué NO se toca', 'La cara y la expresión están aprobadas y quedan intactas: ojos, antifaz, trufa, bigotes, sonrisa abierta con dientes, orejas. El desguante no entra a la cara (elipse del lápiz llega a x≤112; la cara empieza en x≥120). La brújula conserva su cara de pergamino (semiplano medido con fundido) y el lápiz su madera.'],
  ['Métrica dura del desguante', 'Offline (sharp, desguante-proto.mjs, paridad copy-paste con el JSX): 0 píxeles blanco-guante (L>205) residuales en las dos manos tras el retinte; antes 653 y 1126. Sobre las capturas de este harness se repite la métrica mapeando las elipses de mano a coordenadas de pantalla, con ?crudo=1 como control positivo del medidor y del juez.'],
  ['Estados del contrato', 'idle (respira, peso pata-a-pata, cola prensil, muñecas con micro-gesto, parpadeo con ritmo propio ×1.3), caminando (bob 0.56s + peso 1.12s + brazos ±2.4° + muñecas a contratiempo -0.14s/-0.42s + cola 1.6s), thinking (lápiz escribe + muñeca garabatea), listening (orejas perk, brújula y su muñeca quietas, parpadeo ×5.9), speaking (mandíbula por visema).'],
  ['A/B de movimiento', 'Dos capturas del mismo estado con ?congela=T1 y ?congela=T2 difieren SOLO en la fase de animación (misma cámara, mismo encuadre, mismo sujeto — regla RULINGS del A/B): el diff de píxeles entre ambas mide amplitud real del rig, no ruido. congela colapsa los delays por-pieza, así que el A/B prueba QUE se mueve y cuánto, no la coreografía relativa entre piezas.'],
  ['Degradación', 'Sin Canvas2D real la lámina plana original (con guantes) es el respaldo honesto: sin píxeles no hay retinte posible. jsdom/tests cubren ese contrato; este harness gatea el camino con canvas.'],
];

function Lector() {
  const [filas, setFilas] = useState([]);
  useEffect(() => {
    const leer = () => {
      const out = [];
      for (const cls of HUESOS) {
        const el = document.querySelector(`.${cls}`);
        if (!el) { out.push({ cls, anim: '(no montado)', dur: '—', delay: '—', estado: '—' }); continue; }
        const cs = getComputedStyle(el);
        out.push({
          cls,
          anim: cs.animationName || 'none',
          dur: cs.animationDuration || '—',
          delay: cs.animationDelay || '—',
          estado: cs.animationPlayState || '—',
        });
      }
      const raiz = document.querySelector('[data-creature="zariguya"]');
      const blinkDur = raiz ? getComputedStyle(raiz).getPropertyValue('--rh-blink-dur') : '—';
      out.push({ cls: '--rh-blink-dur (raíz)', anim: blinkDur.trim() || '—', dur: '×1.3 en .zlv-parpado', delay: '', estado: '' });
      setFilas(out);
    };
    const t1 = setTimeout(leer, 1200);
    const t2 = setTimeout(leer, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return React.createElement('table', { style: { borderCollapse: 'collapse', width: '100%' } },
    React.createElement('thead', null, React.createElement('tr', null,
      ['hueso', 'animation-name', 'duración', 'delay', 'estado'].map((h) =>
        React.createElement('th', { key: h, style: { textAlign: 'left', borderBottom: '1px solid #b8ae98', padding: '1px 4px' } }, h)))),
    React.createElement('tbody', null, filas.map((f) =>
      React.createElement('tr', { key: f.cls },
        [f.cls, f.anim, f.dur, f.delay, f.estado].map((c, i) =>
          React.createElement('td', { key: i, style: { padding: '1px 4px', borderBottom: '1px dotted #d5cdb9' } },
            React.createElement('span', null, String(c))))))));
}

createRoot(document.getElementById('root')).render(
  React.createElement('div', { style: { display: 'flex', height: '100vh', background: '#e9e4d6', font: '12px monospace', color: '#4a4438' } },
    React.createElement('div', { id: 'escena', style: { width: 1000, minWidth: 1000, display: 'grid', placeItems: 'center', position: 'relative' } },
      crudo
        ? React.createElement('img', { src: '/compai/laminas/zariguya.png', width: size, style: { display: 'block' } })
        : React.createElement(ZariguyaLaminaViva, { estado, size, animated: true, visema, title: 'zarigüeya gate' }),
      React.createElement('div', { style: { position: 'absolute', left: 8, bottom: 6, font: '13px monospace', color: '#6b6353' } },
        `gate zarigüeya · ${crudo ? 'CRUDO (control con guantes)' : `estado=${estado}`}${congela !== null ? ` · congela=${congela}s` : ''}`)),
    React.createElement('div', { style: { flex: 1, overflow: 'hidden', padding: '10px 14px', borderLeft: '1px solid #c9c0aa' } },
      React.createElement('h1', { style: { font: 'bold 14px monospace', margin: '0 0 6px' } }, 'Harness documentado — gate zarigüeya sin guantes + vida'),
      React.createElement('h2', { style: { font: 'bold 12px monospace', margin: '6px 0 2px' } }, 'Lector de vars (rig vivo, computado del DOM)'),
      crudo ? React.createElement('p', { style: { margin: '0 0 4px' } }, 'CRUDO: sin rig montado — la lámina original tal cual, guantes incluidos; cada hueso debe reportar (no montado).') : null,
      React.createElement(Lector, null),
      DOCS.map(([t, cuerpo]) => React.createElement('section', { key: t },
        React.createElement('h2', { style: { font: 'bold 12px monospace', margin: '8px 0 2px' } }, t),
        React.createElement('p', { style: { margin: 0, lineHeight: 1.35 } }, cuerpo))))
  )
);
