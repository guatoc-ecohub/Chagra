/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * Harness de test: strings fijas intencionales, solo para verificacion manual. */
/**
 * zariguya-cuello-harness.jsx — reproduccion manual del bug "gorro en la
 * coronilla al mover el cuello" (LANE Claude, 2026-08-25). Monta
 * ZariguyaTrazado (huesos reales, misma pielTrazado.js de produccion) y
 * pisa con estilo inline forzado (mayor especificidad que la CSS canonica)
 * los tres angulos de la cadena cuello->cabezaGiro->cabeza, para barrer el
 * rango completo sin depender de que el reloj CSS pase por el frame malo.
 *
 * Temporal — no se importa desde ningun otro archivo del repo.
 */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ZariguyaTrazado from '../../src/visual/creatures/ZariguyaTrazado.jsx';

function Slider({ label, value, onChange, min = -30, max = 30 }) {
  return (
    <div className="row">
      <label>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step="0.5"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output>{value}°</output>
    </div>
  );
}

const presets = {
  reposo: [0, 0, 0],
  'giro-sereno-pico': [-3.2, -10, 2],   // 27%,42% de zhGiroSereno + zhCuelloVida + zhLadeo pico
  husmea: [-3.2, -12, -1.8],             // zhHusmea pico + cuello vivo
  'mira-anda': [-0.8, -9, 0.6],          // caminando: zhMiraAnda pico
  'double-take': [-3.2, 10, 2],          // actuando: smear zhDoubleTake
  extremo: [-3.2, -13, 2],
};

const qs = new URLSearchParams(window.location.search);
const qNum = (k, d) => (qs.has(k) ? Number(qs.get(k)) : d);
const qPreset = qs.get('preset');
const inicial = qPreset && presets[qPreset] ? presets[qPreset] : [qNum('cuello', 0), qNum('giro', 0), qNum('cabeza', 0)];

/* Modo LIVE: fuerza la animacion CSS real (con scale/translateY, no solo
   rotate) sobre las clases del rig, ignorando el gate de atributos
   (data-agt-estado / data-vida) — asi se puede barrer wait_ms sobre el
   keyframe REAL sin depender del reloj aleatorio de useVidaIdle. */
const qAnim = qs.get('anim'); // 'husmea' | 'doubletake' | 'giroSereno' | 'cuelloVida' | 'miraAnda'
const ANIM_CSS = {
  husmea: '.zariguyaHuesos .zh-cabezaGiro{ animation: zhHusmea 1.05s ease-in-out infinite !important; }',
  doubletake: '.zariguyaHuesos .zh-cabezaGiro{ animation: zhDoubleTake 7.9s ease-in-out infinite !important; }',
  giroSereno: '.zariguyaHuesos .zh-cabezaGiro{ animation: zhGiroSereno 7.9s cubic-bezier(.34,1.56,.64,1) infinite !important; } .zariguyaHuesos .zh-cuello{ animation: zhCuelloVida 7.9s ease-in-out .09s infinite !important; }',
  cuelloVida: '.zariguyaHuesos .zh-cuello{ animation: zhCuelloVida 7.9s ease-in-out infinite !important; }',
  miraAnda: '.zariguyaHuesos .zh-cabezaGiro{ animation: zhMiraAnda 6.3s ease-in-out infinite !important; }',
};

function Harness() {
  const [cuello, setCuello] = useState(inicial[0]);
  const [cabezaGiro, setCabezaGiro] = useState(inicial[1]);
  const [cabeza, setCabeza] = useState(inicial[2]);
  const [preset, setPreset] = useState(qPreset || 'manual');

  const aplicar = (k) => {
    setPreset(k);
    const [c, g, h] = presets[k];
    setCuello(c); setCabezaGiro(g); setCabeza(h);
  };

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>
        Zarigüeya — diagnóstico gorro en la coronilla
      </h1>
      <p style={{ fontSize: 12, color: '#aaa', maxWidth: 480 }}>
        Sliders pisan --override en zh-cuello / zh-cabezaGiro / zh-cabeza
        (misma jerarquía de huesos de producción, animación CSS apagada).
        Presets = combinaciones reales de las keyframes canónicas.
      </p>
      <div className="row">
        {Object.keys(presets).map((k) => (
          <button key={k} onClick={() => aplicar(k)} style={{ marginRight: 6 }}>
            {k}
          </button>
        ))}
      </div>
      <Slider label="zh-cuello" value={cuello} onChange={(v) => { setPreset('manual'); setCuello(v); }} />
      <Slider label="zh-cabezaGiro" value={cabezaGiro} onChange={(v) => { setPreset('manual'); setCabezaGiro(v); }} min={-20} max={20} />
      <Slider label="zh-cabeza (ladeo)" value={cabeza} onChange={(v) => { setPreset('manual'); setCabeza(v); }} min={-15} max={15} />
      <p style={{ fontSize: 11, color: '#888' }}>preset: {preset} {qAnim ? `· anim=${qAnim} (LIVE)` : ''}</p>
      {qs.has('debug') && (
        <style>{`
          .zariguyaHuesos .zh-casquete-cabeza ellipse{ fill: magenta !important; opacity: 1 !important; }
          .zariguyaHuesos .zh-casquete-cuello ellipse{ fill: cyan !important; opacity: 1 !important; }
          .zariguyaHuesos .zh-casquete-mandibula rect,
          .zariguyaHuesos .zh-casquete-mandibula path{ fill: yellow !important; opacity: 1 !important; }
        `}</style>
      )}
      {qAnim ? (
        <style>{ANIM_CSS[qAnim] || ''}</style>
      ) : (
        <style>{`
          #stage .zariguyaHuesos .zh-cuello{ animation: none !important; transform: rotate(${cuello}deg) !important; }
          #stage .zariguyaHuesos .zh-cabezaGiro{ animation: none !important; transform: rotate(${cabezaGiro}deg) !important; }
          #stage .zariguyaHuesos .zh-cabeza{ animation: none !important; transform: rotate(${cabeza}deg) !important; }
        `}</style>
      )}
      <div id="stage">
        <ZariguyaTrazado estado={qs.get('estado') || 'idle'} modo={qs.get('modo') || 'normal'} size={480} animated title="diagnóstico" />
      </div>
      {qs.has('crown') && (
        <div id="crown-crop" style={{ width: 400, height: 360, overflow: 'hidden', position: 'relative', border: '1px solid #666', marginTop: 12 }}>
          <div style={{ position: 'absolute', top: -70, left: -270, transform: 'scale(2.2)', transformOrigin: 'top left' }}>
            <ZariguyaTrazado estado={qs.get('estado') || 'idle'} modo={qs.get('modo') || 'normal'} size={480} animated title="diagnóstico-corona" />
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Harness />);
