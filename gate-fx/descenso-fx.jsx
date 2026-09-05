/*
 * GATE del descenso — banco de medición, NO producto.
 *
 * Por qué existe: el viaje dura 4 200 ms. Medir FPS sobre un viaje que termina
 * no da una muestra estable, y medir «el descenso entero» mezcla siete bandas
 * en un número que no dice de quién es el costo. Acá el viaje se CONGELA en una
 * cota (`?msnm=`) y se fuerza cada FX a 0 o a 1 (`?fxOn=` / `?fxOff=`), así que
 * el A/B pareado compara el MISMO cuadro con el FX como única diferencia.
 *
 * No entra en el build: `vite.config.js` declara los inputs uno por uno
 * (index/mercado/species-visor/rigged-preview). Esta página solo la sirve el
 * dev-server. Tampoco toca el default de la entrada pública: los 12 FX siguen
 * apagados ahí hasta el gate móvil (Paso 7).
 *
 * uso:
 *   /gate-fx/descenso-fx.html?msnm=2500&tier=alto&fxOff=csm,godRays
 *   /gate-fx/descenso-fx.html?viaje=1                (el viaje real, en bucle)
 */
import { useCallback, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import EscenaDescensoSierra from '../src/visual/mundo3d/sierra/EscenaDescensoSierra.jsx';
import { planDescenso, cotaDestino } from '../src/visual/mundo3d/sierra/descensoSierra.js';

const q = new URLSearchParams(location.search);
const num = (k, d) => {
  const v = Number(q.get(k));
  return Number.isFinite(v) && q.get(k) !== null && q.get(k) !== '' ? v : d;
};
const lista = (k) => (q.get(k) ? q.get(k).split(',').map((s) => s.trim()).filter(Boolean) : []);

const TIER = q.get('tier') || 'alto';
const FASE = q.get('fase') || 'neutral';
const HUMEDAD = q.get('humedad') === null ? null : num('humedad', null);
const COTA = num('cota', 2640); // la cota de la finca de referencia
const MSNM_FIJO = q.get('viaje') === '1' ? null : num('msnm', 2500);
const FX_FORZADO = { on: lista('fxOn'), off: lista('fxOff') };
const DENSIDAD = num('densidadFlora', 1);
/* Con vsync el FPS se CUANTIZA: a 59,3 fps capados no se distingue un efecto
   que cuesta 2 ms de uno que cuesta 9. `?dpr=` sube la resolución hasta dejar
   la escena GPU-bound, que es donde el costo se vuelve visible y atribuible.
   El número que sale de ahí es RELATIVO; el veredicto de «cabe o no cabe» se
   toma a la DPR real del tier. Las dos corridas van en el informe. */
const DPR = q.get('dpr') === null ? null : num('dpr', null);
/* CONTROL POSITIVO del instrumento: los pasos del rayo del cielo son el único
   mando con costo conocido y monótono que hay a mano. Si subirlos 20× tampoco
   mueve el número, el que está ciego es el MEDIDOR, y ningún «este FX es
   gratis» de esta sesión valdría nada. */
const CIELO_PASOS = q.get('cieloPasos') === null ? null : num('cieloPasos', null);
const NIEBLA_ALTURA = q.get('nieblaAltura') !== '0';
const BRUMA = q.get('bruma') !== '0';
const CSM = q.get('csm') === null ? null : q.get('csm') === '1';

const hud = document.getElementById('hud');

function App() {
  const [plan] = useState(() => planDescenso(cotaDestino(COTA).cota, TIER));
  const inicioRef = useRef(0);
  const marcado = useRef(false);
  const cada = useRef(0);

  const onEstado = useCallback((est) => {
    // El viaje real corre en BUCLE para que la sonda tenga muestra larga.
    if (MSNM_FIJO == null && est.progreso >= 1) {
      inicioRef.current = performance.now();
    }
    if (!marcado.current) {
      marcado.current = true;
      window.__ARRANQUE_OK = true; // lo que espera medir-ab-fps.mjs
    }
    window.__descenso = {
      msnm: est.rotuloMsnm,
      banda: est.banda?.id,
      fx: est.fx,
      niebla: Number(est.optica.niebla.toFixed(4)),
      nieblaDensidad: Number(est.optica.nieblaDensidad.toFixed(5)),
      flora: window.__floraDescenso?.conteo?.() ?? null,
    };
    if (++cada.current % 15 === 0 && hud) {
      const d = window.__descenso;
      const encendidos = Object.entries(d.fx)
        .filter(([, v]) => v > 0.01)
        .map(([k, v]) => `${k}:${v.toFixed(2)}`)
        .join(' ');
      hud.textContent =
        `${d.msnm} m · ${d.banda} · tier=${TIER} · fase=${FASE}\n` +
        `fx  ${encendidos || '(ninguno)'}\n` +
        `flora ${d.flora ? `inst=${d.flora.instancias} dc=${d.flora.drawCalls}` : '(sin montar)'} · nieblaAltura=${NIEBLA_ALTURA ? 'ON' : 'OFF'} bruma=${BRUMA ? 'ON' : 'OFF'} csm=${CSM === null ? 'tier' : CSM ? 'ON' : 'OFF'}`;
    }
  }, []);

  if (MSNM_FIJO == null) inicioRef.current = inicioRef.current || performance.now();

  return (
    <EscenaDescensoSierra
      plan={plan}
      fase={FASE}
      humedad={HUMEDAD}
      tier={TIER}
      inicioRef={MSNM_FIJO == null ? inicioRef : null}
      msnmFijo={MSNM_FIJO}
      fxForzado={FX_FORZADO}
      densidadFlora={DENSIDAD}
      onEstado={onEstado}
      dprForzada={DPR}
      cieloPasos={CIELO_PASOS}
      conNieblaAltura={NIEBLA_ALTURA}
      conBruma={BRUMA}
      conCSM={CSM}
    />
  );
}

window.addEventListener('error', (e) => {
  window.__ARRANQUE_FALLO = String(e?.message || e);
});
/* SIN StrictMode a propósito: su doble invocación de efectos altera el montaje
   que se está midiendo (fue la que apagó la niebla de altura sin decir nada).
   El banco mide la escena que corre, no una simulación de ella. */
createRoot(document.getElementById('raiz')).render(<App />);
