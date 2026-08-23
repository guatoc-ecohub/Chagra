import { useEffect, useRef, useState } from 'react';
import { MS_CUADRO_LENTO, clasificarFps, hudHabilitado } from './valleFpsHud.logic.js';
import './valleFpsHud.css';

/**
 * ValleFpsHud — HUD de FPS a nivel de página para depurar el valle 3D en el
 * campo. Muestreo por ventanas de 1s (ROBO de ThreeUI PreviewFpsMeter, MIT),
 * conteo de cuadros lentos (>25ms) y auto-apagado cuando la pestaña se oculta o
 * el HUD sale de viewport (IntersectionObserver + visibilitychange).
 *
 * DEV-ONLY: renderiza `null` salvo opt-in con `?fps=1` o
 * `localStorage['chagra:fps-hud']='1'`. En producción es inerte.
 *
 * Complementa (no reemplaza) a usePerformanceMonitor.jsx: ese mide el loop de
 * render del <Canvas>; éste mide la cadencia real de la página. Ver
 * valleFpsHud.logic.js.
 */
export default function ValleFpsHud() {
  const [habilitado] = useState(() =>
    hudHabilitado(
      typeof window !== 'undefined' ? window.location.search : '',
      typeof window !== 'undefined' ? window.localStorage : null,
    ),
  );
  const [muestra, setMuestra] = useState({ fps: 0, lentos: 0, rating: 'pending' });
  const nodoRef = useRef(null);

  useEffect(() => {
    if (!habilitado || typeof window === 'undefined') return undefined;
    const nodo = nodoRef.current;
    let raf = 0;
    let visible = true;
    let inicio = 0;
    let anterior = 0;
    let cuadros = 0;
    let lentos = 0;

    const reset = () => {
      inicio = 0;
      anterior = 0;
      cuadros = 0;
      lentos = 0;
    };

    const tick = (ahora) => {
      if (!inicio) {
        inicio = ahora;
        anterior = ahora;
      } else {
        const dur = ahora - anterior;
        anterior = ahora;
        cuadros += 1;
        if (dur > MS_CUADRO_LENTO) lentos += 1;
        const transcurrido = ahora - inicio;
        if (transcurrido >= 1000) {
          const fps = (cuadros * 1000) / transcurrido;
          setMuestra({ fps: Math.round(fps), lentos, rating: clasificarFps(fps) });
          reset();
        }
      }
      raf = visible && !document.hidden ? window.requestAnimationFrame(tick) : 0;
    };

    const arrancar = () => {
      if (visible && !document.hidden && !raf) {
        reset();
        raf = window.requestAnimationFrame(tick);
      }
    };
    const parar = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      reset();
    };

    const io = nodo
      ? new IntersectionObserver(([entrada]) => {
          visible = entrada?.isIntersecting ?? true;
          if (visible) arrancar();
          else parar();
        })
      : null;
    const onVis = () => {
      if (document.hidden) parar();
      else arrancar();
    };

    if (io && nodo) io.observe(nodo);
    document.addEventListener('visibilitychange', onVis);
    arrancar();

    return () => {
      parar();
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [habilitado]);

  if (!habilitado) return null;

  const { fps, lentos, rating } = muestra;
  return (
    <output
      ref={nodoRef}
      className="valle-fps-hud"
      data-rating={rating}
      aria-label="FPS del valle 3D"
      title={`FPS: ${fps}. Cuadros lentos (>${MS_CUADRO_LENTO}ms) en la última ventana: ${lentos}.`}
    >
      {rating === 'pending' ? '-- FPS' : `${fps} FPS`}
      {lentos > 0 ? <span className="valle-fps-hud__lentos">{` · ${lentos} lentos`}</span> : null}
    </output>
  );
}
