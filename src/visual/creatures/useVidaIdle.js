/*
 * useVidaIdle — el IDLE-CEREBRO species-agnostic de la familia rubber-hose
 * (la vara de Angelita v2, `agente/Angelita.jsx`, aplicada a los 8 bichos).
 *
 * Lo que separa una criatura de un logo es que EXISTE aunque nadie le hable:
 * un reloj con jitter hojea el repertorio de su especie (vidaEstados.js) —
 * el oso resopla y se rasca, el jaguar acecha, la ardilla se cuelga de cabeza,
 * el morrocoy asiente, el borugo olfatea, la rana croa, el colibrí se acicala,
 * el perezoso dormita — y entre gesto y gesto vuelve a su identidad serena.
 * Nunca repite el mismo gesto dos veces seguidas.
 *
 * TRES herramientas, mismas garantías que Angelita v2:
 *   useVidaIdle(slug, activo)   → el momento vigente (null = identidad).
 *   useRitmoPropio()            → vars CSS de parpadeo/dardeo con fase propia
 *                                 por instancia (mata el metrónomo del robot).
 *   useMiradaUsted(ref, activo) → las pupilas SIGUEN su puntero/dedo cuando
 *                                 anda cerca y lo sueltan a los ~2s.
 *
 * GATES (los de la casa, sin excepción): `activo=false` (animated=false, tier
 * 'bajo', gesto manual del host) apaga todo; prefers-reduced-motion apaga el
 * JS entero (la dignidad de la calma es de TODO el cuerpo, timers incluidos).
 * Costo: UN setTimeout vivo por instancia activa; la mirada es un listener
 * passive + rAF-throttle con DOM directo (cero re-renders por mover el mouse).
 */
import { useEffect, useState } from 'react';
import {
  elegirMomentoVida,
  duracionDeMomentoVida,
  duracionDeDescanso,
  crearRitmoPropio,
} from './vidaEstados.js';

/* ¿El usuario pidió quietud? Los sistemas JS se apagan igual que el CSS. */
export function prefiereQuietud() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * El IDLE-CEREBRO: descanso (identidad) → gesto → descanso → otro gesto…
 * Arranca SIEMPRE descansando (el primer render es idéntico al de antes: los
 * consumidores y tests existentes no ven nada nuevo hasta el primer compás).
 *
 * @param {string} slug  especie (clave de VIDA_REPERTORIO).
 * @param {boolean} activo  el gate ya resuelto por el bicho (vivo && tier
 *   !== 'bajo' && sin gesto manual del host).
 * @returns {string|null} el momento vigente ('resopla', 'reposo'…) o null.
 */
export function useVidaIdle(slug, activo) {
  const [momento, setMomento] = useState(/** @type {string|null} */ (null));
  useEffect(() => {
    if (!activo || prefiereQuietud()) return undefined;
    let timer = 0;
    let ultimo = /** @type {string|null} */ (null);
    const descansa = () => {
      setMomento(null);
      timer = window.setTimeout(gesticula, duracionDeDescanso(slug));
    };
    const gesticula = () => {
      ultimo = elegirMomentoVida(slug, ultimo);
      if (!ultimo) return; // especie sin repertorio: identidad para siempre
      setMomento(ultimo);
      timer = window.setTimeout(descansa, duracionDeMomentoVida(slug, ultimo));
    };
    // Arranca al próximo tick (nunca setState síncrono dentro del effect) y
    // SIEMPRE desde el descanso: nadie gesticula nada más nacer.
    timer = window.setTimeout(descansa, 0);
    return () => {
      window.clearTimeout(timer);
      setMomento(null); // al apagar el gate, el gesto no queda colgado
    };
  }, [slug, activo]);
  return momento;
}

/**
 * RITMO PROPIO de parpadeo/dardeo — una vez al montar: duración y fase con
 * azar para que cada instancia parpadee a SU aire (dos bichos en la misma
 * pantalla jamás parpadean al tiempo). El CSS las consume como vars en
 * `.rh-blink` / `.rh-mirada` (creatures.css).
 * @returns {Record<string, string>} vars CSS para el style del nodo raíz.
 */
export function useRitmoPropio() {
  const [ritmo] = useState(crearRitmoPropio);
  return ritmo;
}

/* Hasta dónde "se da cuenta" del puntero (px) y cuánto sostiene la mirada
   después del último movimiento antes de soltarlo (ms) — mismos compases que
   Angelita v2. La deflexión satura a ~150px (más lejos ya es "hacia allá"). */
const RADIO_DE_ATENCION = 340;
const SUELTA_MIRADA_MS = 1900;

/**
 * LA MIRADA QUE LO RECONOCE — si su puntero/dedo anda cerca, las pupilas lo
 * siguen (data-rh-mira='usted' + vars --rh-mx/--rh-my sobre el nodo raíz; la
 * regla CSS vive en creatures.css y pisa el dardeo natural). Al quedarse
 * quieto ~2s lo suelta. DOM directo vía ref (React no administra estos
 * attrs): cero re-renders por mover el mouse.
 *
 * @param {{ current: Element|null }} ref  el nodo raíz del bicho (svg o g).
 * @param {boolean} activo  gate ya resuelto (vivo && tier !== 'bajo').
 */
export function useMiradaUsted(ref, activo) {
  useEffect(() => {
    const raiz = ref.current;
    if (!activo || !raiz || prefiereQuietud()) return undefined;
    let raf = 0;
    let soltar = 0;
    let px = 0;
    let py = 0;
    const liberar = () => raiz.removeAttribute('data-rh-mira');
    const mirar = () => {
      raf = 0;
      const r = raiz.getBoundingClientRect();
      if (!r.width) return;
      // Sus ojos viven arriba del centro del dibujo (la cabeza, no el tronco).
      const dx = px - (r.left + r.width / 2);
      const dy = py - (r.top + r.height * 0.4);
      if (Math.hypot(dx, dy) > RADIO_DE_ATENCION) { liberar(); return; }
      // Deflexión de pupila en unidades del viewBox (la misma amplitud ~0.55
      // del dardeo natural de rh-mirada).
      const mx = Math.max(-1, Math.min(1, dx / 150)) * 0.55;
      const my = Math.max(-1, Math.min(1, dy / 150)) * 0.42;
      raiz.style.setProperty('--rh-mx', `${mx.toFixed(3)}px`);
      raiz.style.setProperty('--rh-my', `${my.toFixed(3)}px`);
      raiz.setAttribute('data-rh-mira', 'usted');
      window.clearTimeout(soltar);
      soltar = window.setTimeout(liberar, SUELTA_MIRADA_MS);
    };
    const onMove = (ev) => {
      px = ev.clientX;
      py = ev.clientY;
      if (!raf) raf = window.requestAnimationFrame(mirar);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      if (raf) window.cancelAnimationFrame(raf);
      window.clearTimeout(soltar);
      liberar();
      raiz.style.removeProperty('--rh-mx');
      raiz.style.removeProperty('--rh-my');
    };
  }, [ref, activo]);
}
