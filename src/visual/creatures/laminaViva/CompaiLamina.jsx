import { useEffect, useRef, useState } from 'react';
import { CARPETA_LAMINAS, LAMINA_ANATOMIA } from './laminaAnatomia.js';
import { hornearLamina } from './laminaCapas.js';
import { poseDeLamina, crearParpadeo, canonizarEstado, semillaDe } from './laminaIdle.js';

/**
 * CompaiLamina — el compAI como LÁMINA EN MOVIMIENTO: la ilustración Humboldt
 * real (`~/demos/3d/compai/laminas/*.png`, copiada verbatim a
 * `public/compai/laminas/`), recortada en capas por alfa (cuerpo/cabeza +
 * párpados) y rigeada rubber-hose — misma técnica que
 * `~/demos/3d/juegos/chagra-kart/js/piloto-lamina.js` («el piloto es la
 * LÁMINA, y la lámina ESTÁ VIVA»), portada de Three.js a DOM/Canvas2D. Ver
 * `laminaCapas.js` (el recorte) y `laminaIdle.js` (la pose por cuadro).
 *
 * REGLA DURA del SPEC: la apariencia NUNCA se redibuja, ni a mano ni a
 * vector — cada píxel en pantalla sale del PNG. Lo único que este componente
 * calcula son MÁSCARAS DE ALFA (qué parte pertenece a cada capa) y
 * TRANSFORMACIONES (dónde va cada capa este cuadro).
 *
 * IDLE MÍNIMO (obligatorio por SPEC, siempre activo salvo animated=false o
 * prefers-reduced-motion): ojos (parpadeo determinista) + cabeza (mirada +
 * gesto por estado) + respiración (squash&stretch del cuerpo). El "caminar"
 * NO está — estas 6 láminas son ilustraciones de cuerpo entero en una sola
 * pose fija (no hay arte de ciclo de marcha); mover las piernas exigiría
 * redibujar, que el SPEC prohíbe. Alcance: busto vivo, cuerpo entero quieto.
 *
 * DEGRADACIÓN: mientras la imagen carga, o si el navegador no puede hornear
 * canvas 2D (jsdom de los tests, algún entorno exótico), se muestra la
 * lámina PLANA (un solo `<img>`, la imagen real, sin recortar) — nunca un
 * hueco ni un dibujo inventado.
 *
 * @param {Object} props
 * @param {string} props.tipo  slug del elenco (ver `LAMINA_ANATOMIA` en
 *   laminaAnatomia.js); un slug sin lámina medida (p.ej. 'guacamaya') hace
 *   que el componente no renderice nada — el llamador decide el respaldo.
 * @param {string} [props.estado='idle']  cualquier token del vocabulario
 *   angosto ('idle'|'thinking'|'speaking'|'listening') o del rico de
 *   Angelita ('acompana'|'escuchando'|'pensando'|'respondiendo'|'contenta'|
 *   'invita'|...) — ver `canonizarEstado` en laminaIdle.js.
 * @param {number} [props.size=48]
 * @param {boolean} [props.animated=true]
 * @param {'derecha'|'izquierda'} [props.direccion='derecha']
 * @param {string} [props.className]
 * @param {Object} [props.style]
 * @param {string} [props.title]
 * @param {string|null} [props.visema]  aceptado por paridad de API con los
 *   adaptadores hermanos; SIN EFECTO — no se midió boca/mandíbula en ninguna
 *   lámina (fuera del alcance mínimo del SPEC). No se inventa articulación.
 */
export default function CompaiLamina({
  tipo,
  estado = 'idle',
  size = 48,
  animated = true,
  direccion = 'derecha',
  className = '',
  style = undefined,
  title = undefined,
  // eslint-disable-next-line no-unused-vars -- paridad de API, ver docstring
  visema = null,
  ...rest
}) {
  const anatomia = LAMINA_ANATOMIA[tipo];
  const stageRef = useRef(null);
  const cabezaWrapRef = useRef(null);
  const cuerpoHostRef = useRef(null);
  const cabezaHostRef = useRef(null);
  const parpadosRef = useRef([]); // elementos <canvas> de cada párpado, en orden de anatomia.ojos
  const [listo, setListo] = useState(false);

  // ── 1. cargar + hornear (una vez por tipo; el navegador cachea el PNG) ────
  useEffect(() => {
    if (!anatomia) return undefined;
    let vivo = true;
    // NOTA: no se resetea `listo` a false aquí al cambiar `tipo` — en la
    // práctica cada adaptador monta CompaiLamina con un `tipo` FIJO (el
    // dispatcher desmonta/remonta un adaptador distinto al cambiar de
    // compAI, nunca cambia el prop en la misma instancia), así que el caso
    // "tipo cambia en caliente" es raro; degradar por un instante a las
    // capas del tipo anterior mientras el nuevo hornea es preferible a
    // parpadear de vuelta a la lámina plana en cada cambio.
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (!vivo) return;
      const capas = hornearLamina(img, anatomia);
      if (!capas || !vivo) return; // sin soporte de canvas → se queda en el <img> plano
      // Cuerpo y cabeza: canvases del tamaño completo del PNG, se estiran al
      // 100%/100% del stage vía CSS — comparten encuadre, cero cuentas de UV.
      const estiloCapaCompleta = (cv) => {
        cv.style.position = 'absolute';
        cv.style.inset = '0';
        cv.style.width = '100%';
        cv.style.height = '100%';
        cv.style.display = 'block';
      };
      estiloCapaCompleta(capas.cuerpo);
      estiloCapaCompleta(capas.cabeza);
      if (cuerpoHostRef.current) {
        cuerpoHostRef.current.replaceChildren(capas.cuerpo);
      }
      if (cabezaHostRef.current) {
        cabezaHostRef.current.replaceChildren(capas.cabeza);
      }
      // Párpados: canvases pequeños, posicionados en % del encuadre completo
      // (cuelgan del wrap de cabeza: heredan su rotación).
      const nodosParpados = capas.parpados.map((p) => {
        const cv = p.cv;
        cv.style.position = 'absolute';
        cv.style.left = `${(p.x0 / capas.W) * 100}%`;
        cv.style.top = `${(p.y0 / capas.H) * 100}%`;
        cv.style.width = `${(p.w / capas.W) * 100}%`;
        cv.style.height = `${(p.h / capas.H) * 100}%`;
        cv.style.transformOrigin = 'top center';
        cv.style.display = 'block';
        cv.style.visibility = 'hidden';
        return cv;
      });
      if (cabezaHostRef.current) {
        for (const cv of nodosParpados) cabezaHostRef.current.appendChild(cv);
      }
      parpadosRef.current = nodosParpados;
      setListo(true);
    };
    img.onerror = () => { /* degrada a la lámina plana ya montada; sin crash */ };
    img.src = CARPETA_LAMINAS + anatomia.archivo;
    return () => { vivo = false; };
  }, [tipo, anatomia]);

  // ── 2. rAF: pose por cuadro (respira + mira + gesto + parpadeo) ──────────
  useEffect(() => {
    if (!anatomia) return undefined;
    const reduce = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // jsdom (tests) y algún navegador exótico no implementan rAF — degrada
    // al fotograma quieto, igual que reduced-motion, en vez de reventar.
    const hayRaf = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function';
    if (!animated || reduce || !hayRaf) {
      // fotograma digno y quieto: sin RAF, sin coste — pero la cabeza vuelve
      // a su sitio (no se queda a mitad de gesto de un render previo).
      if (cabezaWrapRef.current) cabezaWrapRef.current.style.transform = '';
      if (stageRef.current) stageRef.current.style.transform = '';
      return undefined;
    }
    const semilla = semillaDe(tipo);
    const parpadeo = crearParpadeo(semilla);
    const familia = canonizarEstado(estado);
    let raf = 0;
    const cuadro = () => {
      const t = performance.now() / 1000;
      const pose = poseDeLamina(t, { perfil: tipo, semilla, familia });
      const blink = parpadeo(t, familia);
      if (stageRef.current) {
        stageRef.current.style.transform = `scale(${pose.sxCuerpo.toFixed(4)}, ${pose.syCuerpo.toFixed(4)})`;
      }
      if (cabezaWrapRef.current) {
        cabezaWrapRef.current.style.transform = `rotate(${pose.rotCabeza.toFixed(2)}deg) translate(${(pose.dxCabeza * 100).toFixed(2)}%, ${(pose.dyCabeza * 100).toFixed(2)}%)`;
      }
      for (const cv of parpadosRef.current) {
        if (blink > 0.02) {
          cv.style.visibility = 'visible';
          cv.style.transform = `scaleY(${blink.toFixed(3)})`;
        } else {
          cv.style.visibility = 'hidden';
        }
      }
      raf = window.requestAnimationFrame(cuadro);
    };
    raf = window.requestAnimationFrame(cuadro);
    return () => { if (raf) window.cancelAnimationFrame(raf); };
  }, [tipo, estado, animated, anatomia]);

  if (!anatomia) return null; // slug sin lámina medida (p.ej. guacamaya) — el llamador decide el respaldo

  const aspecto = anatomia.ancho / anatomia.altoPx;
  const anchoStage = aspecto >= 1 ? size : size * aspecto;
  const altoStage = aspecto >= 1 ? size / aspecto : size;
  const pivPctX = (anatomia.pivCuello[0] / anatomia.ancho) * 100;
  const pivPctY = (anatomia.pivCuello[1] / anatomia.altoPx) * 100;

  return (
    <div
      role="img"
      aria-label={title || tipo}
      data-creature={tipo}
      data-lamina-viva="1"
      data-agt-estado={canonizarEstado(estado)}
      title={title}
      className={className || undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        ...(direccion === 'izquierda' ? { transform: 'scaleX(-1)' } : null),
        ...style,
      }}
      {...rest}
    >
      <div
        ref={stageRef}
        style={{
          position: 'relative',
          width: anchoStage,
          height: altoStage,
          transformOrigin: '50% 92%', // mismo ancla de respiración que laminaFallback.js del valle
        }}
      >
        {/* Lámina plana — SIEMPRE montada: es lo único visible hasta que
            `listo` reemplaza el interior con las capas horneadas, y el
            respaldo permanente si hornear() no está disponible. */}
        {!listo && (
          <img
            src={CARPETA_LAMINAS + anatomia.archivo}
            alt=""
            aria-hidden="true"
            width={anatomia.ancho}
            height={anatomia.altoPx}
            decoding="async"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        )}
        <div ref={cuerpoHostRef} style={{ position: 'absolute', inset: 0, display: listo ? 'block' : 'none' }} />
        <div
          ref={cabezaWrapRef}
          style={{ position: 'absolute', inset: 0, display: listo ? 'block' : 'none', transformOrigin: `${pivPctX}% ${pivPctY}%` }}
        >
          <div ref={cabezaHostRef} style={{ position: 'absolute', inset: 0 }} />
        </div>
      </div>
    </div>
  );
}
