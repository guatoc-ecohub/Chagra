import { useEffect, useRef } from 'react';
import './revelacionMistica.css';

/*
 * RevelacionMistica — aparecer/desaparecer con un barrido MÍSTICO, genérico
 * para CUALQUIER compai (el operador lo pidió para el jaguar; sirve para
 * cualquier bicho del roster, envuelve `children` sin saber qué hay adentro).
 *
 * Técnica inspirada en el skill `build-wireframe-scan-reveal` de MengTo/Skills
 * (MIT) — adaptación 2D propia con CSS `mask-image`, NO se copió código
 * fuente: donde el original barre un wireframe 3D con un shader, acá se
 * captura la MISMA ESENCIA (un barrido de luz que revela o disuelve
 * progresivamente la silueta) con herramientas 2D — nada de WebGL:
 *
 *   1. `mask-image` con un degradado duro (opaco/transparente) más ANCHO que
 *      el elemento (`mask-size` ~260%), animando `mask-position` de un
 *      extremo al otro — el "wipe reveal" estándar de CSS: en un extremo el
 *      elemento cae entero en la zona opaca (visible), en el otro entero en
 *      la transparente (oculto), y el borde entre ambas BARRE el elemento al
 *      moverse.
 *   2. Una barra de SCAN (glow vía `box-shadow`) que viaja sincronizada con
 *      el mismo timing, para que se lea como un barrido de luz de verdad y no
 *      solo una cortina lisa.
 *
 * Contrato "controlado + onFin" (mismo de AbejaTransicion.jsx):
 *   activo=null      → no anima, `children` tal cual (cero costo, sin mask).
 *   activo='aparece'    → revela de invisible a visible en `duracionMs`.
 *   activo='desaparece' → disuelve de visible a invisible en `duracionMs`.
 *   tier='bajo'  → SIN scan-line, solo un fade simple de opacidad (mismo
 *   criterio que AbejaTransicion con [data-tier='bajo']: menos capas
 *   animando a la vez en gama baja).
 *   reducedMotion (o prefers-reduced-motion) → salta directo al estado final
 *   (visible si 'aparece', invisible si 'desaparece') y avisa `onFin` ya.
 */

function prefiereQuietud() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param {Object} props
 * @param {'aparece'|'desaparece'|null} [props.activo=null]  dispara el
 *   barrido; null = sin animar, `children` se ve tal cual.
 * @param {number} [props.duracionMs=900]  duración del barrido — la misma
 *   que usan el CSS (vía var `--rev-dur`) y el timer que dispara `onFin`.
 * @param {string} [props.tier]  'bajo' apaga el scan-line y cambia el barrido
 *   por un fade simple de opacidad.
 * @param {boolean} [props.reducedMotion=false]  fuerza el salto al estado
 *   final (además de respetar `prefers-reduced-motion` del sistema).
 * @param {string} [props.color='#ffd66a']  color del scan-line (default: el
 *   mismo ámbar de `.ang-entrada__aro`).
 * @param {() => void} [props.onFin]  el barrido terminó (o se saltó por RM).
 * @param {import('react').ReactNode} props.children  el compai a revelar.
 */
export function RevelacionMistica({
  activo = null,
  duracionMs = 900,
  tier = undefined,
  reducedMotion = false,
  color = '#ffd66a',
  onFin = undefined,
  children,
}) {
  const sinTeatro = reducedMotion || prefiereQuietud();
  const finRef = useRef(onFin);
  useEffect(() => { finRef.current = onFin; });

  useEffect(() => {
    if (!activo) return undefined;
    let hecho = false;
    const t = window.setTimeout(
      () => {
        if (!hecho) {
          hecho = true;
          finRef.current?.();
        }
      },
      sinTeatro ? 0 : duracionMs,
    );
    return () => {
      hecho = true;
      window.clearTimeout(t);
    };
  }, [activo, sinTeatro, duracionMs]);

  // El scan-line es decoración de tier alto/medio; en gama baja el barrido
  // queda como fade simple (gate CSS por [data-tier='bajo']).
  const escaner = !sinTeatro && !!activo && tier !== 'bajo';
  // RM + 'desaparece': el fotograma final es invisible YA — sin transición.
  const ocultoDeGolpe = sinTeatro && activo === 'desaparece';

  return (
    <span
      className={`rev-mistica${ocultoDeGolpe ? ' rev-mistica--oculto' : ''}`}
      data-activo={!sinTeatro && activo ? activo : undefined}
      data-tier={tier || undefined}
      style={activo ? { '--rev-dur': `${duracionMs}ms`, '--rev-color': color } : undefined}
    >
      <span className="rev-mistica__mask">{children}</span>
      {escaner && <span className="rev-mistica__scan" aria-hidden="true" />}
    </span>
  );
}

export default RevelacionMistica;
