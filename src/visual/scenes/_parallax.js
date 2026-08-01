/*
 * Helpers del motor de parallax (interno de la librería). Vive aparte del
 * componente para no romper el fast-refresh de Vite. Lo consume `Parallax` y se
 * re-exporta desde el barrel.
 */
import { useEffect, useState } from 'react';

/**
 * Factores de parallax por capa (semilla MontanaMundosCine): cuánto viaja cada
 * capa respecto a la principal. `< 1` = lejos (se mueve menos) · `> 1` = más
 * cerca que el plano principal. De lejos a cerca.
 */
export const CAPAS_PARALLAX = {
  cielo: 0.1,
  lejos: 0.22,
  medio: 0.45,
  principal: 1,
  niebla: 1.12,
  cerca: 1.3,
};

/**
 * Transform de una capa dada la cámara base `{ tx, ty, s }` y su factor `f`.
 * La cámara viaja completa (f = 1); cada capa la sigue multiplicada por su
 * factor en el eje Y — el efecto parallax. `translate3d` fuerza capa GPU.
 */
export function transformCapa(camara, f) {
  return `translate3d(${camara.tx}px, ${camara.ty * f}px, 0) scale(${camara.s})`;
}

/**
 * Mide el viewport de un contenedor (para que el consumidor calcule la cámara).
 * Reacciona a `resize`. Devuelve `{ w, h }`.
 * @param {import('react').RefObject<HTMLElement>} ref
 * @param {{w:number, h:number}} [inicial]
 */
export function useViewport(ref, inicial = { w: 390, h: 700 }) {
  const [vp, setVp] = useState(inicial);
  useEffect(() => {
    const medir = () => {
      const el = ref.current;
      if (el) setVp({ w: el.clientWidth, h: el.clientHeight });
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [ref]);
  return vp;
}
