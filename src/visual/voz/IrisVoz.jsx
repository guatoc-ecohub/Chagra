/*
 * IrisVoz — LA VOZ CON FORMA: la identidad visual de la voz de Chagra.
 *
 * Cuando el campesino dice «hola, Chagra», la app no muestra un micrófono
 * genérico: muestra ESTO — un iris orgánico de anillos concéntricos, mitad
 * ondas de agua en una totuma, mitad anillos de crecimiento de un tronco.
 * Cálido y de tierra (brasa, miel, musgo), NO sci-fi: es deliberadamente lo
 * opuesto al astrolabio holográfico del overlay de escucha (EscuchaOverlay).
 *
 * LA REGLA DE ORO — el movimiento tiene dirección SEMÁNTICA:
 *   · escuchando → las ondas viajan HACIA ADENTRO (la voz de usted entra
 *     hasta la brasa; el anillo de afuera reacciona primero).
 *   · hablando   → las ondas NACEN en la brasa y salen HACIA AFUERA
 *     (ahora la voz es de Chagra).
 *   · pensando   → los anillos se trenzan: dos grupos contra-rotan despacio,
 *     como agua que da vueltas antes de aclararse.
 *   · reposo     → apenas respira al ritmo de la casa (--vfx-beat) y la
 *     brasa queda en rescoldo. Se aquieta; no pide atención.
 *
 * NADA DE ANIMACIÓN FINGIDA: el brillo y la escala reaccionan a un NIVEL
 * (0..1). En producción se le pasa el RMS real del micrófono vía `getNivel`;
 * sin él usa la simulación orgánica de vozViva.js (nivelSimulado).
 *
 * Reglas de la casa (src/visual/effects/README.md):
 *   · Solo transform/opacity animados; el glow (GlowFilter) es estático.
 *   · Cero setState por frame: un solo rAF escribe transform/opacity
 *     imperativamente sobre refs (mismo patrón GPU-friendly del repo).
 *   · prefers-reduced-motion: el rAF NO arranca y el CSS pinta un fotograma
 *     estático digno por estado (color + opacidad cuentan el momento).
 *
 * Geometría y simulación (deterministas, sin React) en ./vozViva.js.
 */
import React, { useEffect, useId, useRef } from 'react';
import { GlowFilter } from '../effects';
import { ANILLOS_IRIS, IRIS_VB, IRIS_C, N_ANILLOS, nivelSimulado } from './vozViva';
import './irisVoz.css';

/**
 * El iris. Decorativo por contrato (aria-hidden): el ESTADO se anuncia con
 * texto fuera del iris (aria-live del consumidor), nunca solo con color.
 *
 * @param {object}   props
 * @param {string}  [props.estado='reposo']  reposo | escuchando | pensando | hablando
 * @param {number}  [props.size=180]         lado en px (la firma sobrevive desde ~22px)
 * @param {Function}[props.getNivel]         () => 0..1 leído cada frame (RMS real del
 *                                           mic en producción). Si no se pasa, usa la
 *                                           simulación orgánica según el estado.
 * @param {string}  [props.className]
 */
export default function IrisVoz({ estado = 'reposo', size = 180, getNivel, className = '' }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const anillosRef = useRef([]);
  const brasaRef = useRef(null);
  const auraRef = useRef(null);
  const haloRef = useRef(null);

  /* refs espejo: el rAF lee SIEMPRE lo último sin recrearse por render. */
  const estadoRef = useRef(estado);
  const getNivelRef = useRef(getNivel);
  useEffect(() => { estadoRef.current = estado; }, [estado]);
  useEffect(() => { getNivelRef.current = getNivel; }, [getNivel]);

  useEffect(() => {
    /* reduced-motion: sin rAF — el CSS pinta el fotograma estático por estado. */
    if (typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }
    const niveles = new Float32Array(N_ANILLOS);
    let lead = 0;
    let raf = 0;
    const t0 = performance.now();

    const tick = (now) => {
      const t = (now - t0) / 1000;
      const est = estadoRef.current;
      const crudo = getNivelRef.current
        ? (getNivelRef.current() || 0)
        : nivelSimulado(t, est);
      /* suavizado asimétrico: sube rápido con la voz, cae lento (el iris
         "retiene" un instante lo que oyó — mismo gesto que EscuchaOverlay). */
      lead += (crudo - lead) * (crudo > lead ? 0.32 : 0.1);

      /* LA DIRECCIÓN: cada anillo persigue a su vecino. hablando → el de
         adentro manda (la onda sale); resto → el de afuera manda (la voz
         entra). El lag de la persecución ES el viaje de la onda. */
      if (est === 'hablando') {
        for (let i = 0; i < N_ANILLOS; i++) {
          const objetivo = i === 0 ? lead : niveles[i - 1];
          niveles[i] += (objetivo - niveles[i]) * 0.24;
        }
      } else {
        for (let i = N_ANILLOS - 1; i >= 0; i--) {
          const objetivo = i === N_ANILLOS - 1 ? lead : niveles[i + 1];
          niveles[i] += (objetivo - niveles[i]) * 0.24;
        }
      }

      for (let i = 0; i < N_ANILLOS; i++) {
        const el = anillosRef.current[i];
        if (!el) continue;
        const a = ANILLOS_IRIS[i];
        el.style.transform = `scale(${(1 + niveles[i] * a.amp).toFixed(4)})`;
        el.style.opacity = Math.min(1, a.base + niveles[i] * 0.5).toFixed(3);
      }
      if (brasaRef.current) {
        brasaRef.current.style.transform = `scale(${(1 + lead * 0.24).toFixed(4)})`;
      }
      if (auraRef.current) {
        auraRef.current.style.opacity = (0.35 + lead * 0.6).toFixed(3);
        auraRef.current.style.transform = `scale(${(1 + lead * 0.36).toFixed(4)})`;
      }
      if (haloRef.current) {
        haloRef.current.style.opacity = (0.5 + lead * 0.5).toFixed(3);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`iris-voz ${className}`.trim()}
      data-estado={estado}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div className="iv-halo" ref={haloRef} />
      <div className="iv-respira">
        <svg viewBox={`0 0 ${IRIS_VB} ${IRIS_VB}`} focusable="false">
          <defs>
            <GlowFilter id={`${uid}-glow`} std={2.6} />
            <radialGradient id={`${uid}-brasa`} cx="50%" cy="46%" r="55%">
              <stop offset="0%" stopColor="var(--iris-brasa-luz)" />
              <stop offset="62%" stopColor="var(--iris-brasa)" />
              <stop offset="100%" stopColor="var(--iris-brasa-borde)" />
            </radialGradient>
          </defs>

          {/* Anillos en dos grupos (pares/impares) que solo en `pensando`
              contra-rotan — animation-play-state, así al salir del estado la
              trenza se CONGELA donde iba (nada salta). */}
          <g className="iv-giro iv-giro-a">
            {ANILLOS_IRIS.map((a, i) => (i % 2 === 0 ? (
              <path
                key={i}
                ref={(el) => { anillosRef.current[i] = el; }}
                className="iv-anillo iv-anillo-par"
                d={a.d}
                style={{ '--iv-op-base': a.base }}
                strokeWidth={a.grosor}
              />
            ) : null))}
          </g>
          <g className="iv-giro iv-giro-b">
            {ANILLOS_IRIS.map((a, i) => (i % 2 === 1 ? (
              <path
                key={i}
                ref={(el) => { anillosRef.current[i] = el; }}
                className="iv-anillo iv-anillo-impar"
                d={a.d}
                style={{ '--iv-op-base': a.base }}
                strokeWidth={a.grosor}
              />
            ) : null))}
          </g>

          {/* La brasa: el rescoldo donde la voz vive. Glow ESTÁTICO
              (GlowFilter); lo que se anima es transform/opacity. */}
          <g filter={`url(#${uid}-glow)`}>
            <circle
              ref={auraRef}
              className="iv-brasa-aura"
              cx={IRIS_C}
              cy={IRIS_C}
              r={17.5}
            />
            <circle
              ref={brasaRef}
              className="iv-brasa"
              cx={IRIS_C}
              cy={IRIS_C}
              r={10}
              fill={`url(#${uid}-brasa)`}
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
