import React, { useRef, useState, useEffect, Suspense, lazy } from 'react';

/**
 * ChagraColibri3DLite — colibrí 3D LIGERO y PULIDO (Three.js + react-three-fiber)
 * pensado para correr en TELÉFONOS DE GAMA BAJA (usuarios campesinos) sin drenar
 * batería ni pegar la GPU.
 *
 * Es la versión de PRUEBA gateada por `VITE_COLIBRI_3D` (colibri3dFlag.js),
 * dev-only. Se usa en dos sitios:
 *   - Home "Finca Viva": revolotea sobre la escena (variant="home"), con un arco
 *     de vuelo suave y aleteo rápido tipo colibrí real.
 *   - Botón del agente (FAB): mini colibrí en vuelo estacionario (variant="fab"),
 *     aleteo sutil que invita a tocar.
 *
 * REUSO: comparte la receta de geometría/materiales del avatar
 * `ChagraAgentAvatarColibri3D` (torpedo iridiscente esmeralda → cyan, gorget
 * carmesí, pico largo, ojo con catchlight), pero recortado para performance:
 *   - menos segmentos de esfera, sin halo ni partículas (el avatar grande sí los
 *     tiene; aquí estorban en un sprite pequeño y cuestan GPU),
 *   - 1 sola luz direccional + ambiente (no 4 luces),
 *   - `frameloop="demand"` con un loop controlado que invalida el canvas a un
 *     ritmo fijo (no "always" → no quema GPU cuando no se ve).
 *
 * PERFORMANCE (crítico):
 *   - dpr capeado [1, 1.5] (no [1, 2]).
 *   - `frameloop="demand"`: el canvas SOLO renderiza cuando `invalidate()` corre.
 *     Un loop interno (Driver) llama invalidate() a ~máx 45 fps mientras está
 *     VISIBLE; al salir de viewport (IntersectionObserver) o con el tab oculto
 *     (visibilitychange) el loop se PAUSA → 0 trabajo de GPU.
 *   - `prefers-reduced-motion`: colibrí ESTÁTICO (un solo frame, sin loop).
 *   - powerPreference 'low-power', antialias off en el FAB (sprite chico).
 *   - lazy-load del Canvas: Three.js no entra al bundle principal; solo se baja
 *     cuando la flag está ON y el componente se monta.
 *
 * Español de Colombia (tú/usted), sin voseo. SVG/3D rsvg-irrelevante (corre en
 * la GPU del cliente, no en el render del servidor).
 */

// Lazy: separa Three.js / R3F en su propio chunk. Con la flag OFF (prod) este
// import nunca se evalúa, así que el peso de three NO entra al bundle servido.
const Colibri3DCanvas = lazy(() => import('./ChagraColibri3DCanvas'));

/** Fallback 2D mínimo mientras carga el chunk 3D (o si WebGL no está). */
function FallbackDot({ size }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background:
          'radial-gradient(circle at 35% 30%, #34d399 0%, #10b981 45%, #06b6d4 100%)',
        opacity: 0.85,
      }}
    />
  );
}

/** Lee prefers-reduced-motion de forma reactiva (SSR-safe). */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(!!mq.matches);
    update();
    // addEventListener moderno con fallback a addListener (Safari viejo).
    if (mq.addEventListener) mq.addEventListener('change', update);
    else if (mq.addListener) mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else if (mq.removeListener) mq.removeListener(update);
    };
  }, []);
  return reduced;
}

/**
 * Observa si el contenedor está en viewport y si el tab está visible. El Canvas
 * lo usa para PAUSAR el loop de animación cuando no se ve (0 GPU).
 */
function useVisibility(ref) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    let inViewport = true;
    let tabVisible = typeof document === 'undefined' || !document.hidden;
    const recompute = () => setVisible(inViewport && tabVisible);

    let io;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          inViewport = entries.some((e) => e.isIntersecting);
          recompute();
        },
        { threshold: 0.05 },
      );
      io.observe(el);
    }

    const onVis = () => {
      tabVisible = !document.hidden;
      recompute();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVis);
    }

    return () => {
      if (io) io.disconnect();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVis);
      }
    };
  }, [ref]);
  return visible;
}

/**
 * @param {Object} props
 * @param {'home'|'fab'} [props.variant='home']  preset de tamaño/animación.
 * @param {number} [props.size]                  px del lado (default por variant).
 * @param {'idle'|'thinking'|'speaking'} [props.state='idle']  estado del agente.
 * @param {string} [props.className]
 * @param {string} [props.ariaLabel]
 */
export default function ChagraColibri3DLite({
  variant = 'home',
  size,
  state = 'idle',
  className = '',
  ariaLabel,
}) {
  const wrapRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();
  const visible = useVisibility(wrapRef);
  const px = size || (variant === 'fab' ? 52 : 96);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
        width: px,
        height: px,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
      role="img"
      aria-label={ariaLabel || 'Colibrí Chagra'}
    >
      <Suspense fallback={<FallbackDot size={Math.round(px * 0.55)} />}>
        <Colibri3DCanvas
          variant={variant}
          state={state}
          reducedMotion={reducedMotion}
          active={visible}
        />
      </Suspense>
    </div>
  );
}
