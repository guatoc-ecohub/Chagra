/*
 * TunelLamina — la transición TÚNEL ODYSSEY 2D↔3D: entrar a un mundo 3D
 * DESDE una lámina 2D (una hoja del cuaderno de campo, un mural, un portal
 * plano) y volver a ella. El referente es el tubo de Odyssey: la lámina no es
 * una miniatura del mundo — ES la boca del mundo.
 *
 * CÓMO SE SIENTE
 *   ENTRAR ('entrando'): la hoja se recoge (anticipación), DESPEGA de su
 *   lugar en la página y se incrusta en la pantalla ladeándose un pelo
 *   (rotateX: papel entrando al vidrio, no solo creciendo); un túnel de
 *   anillos con los colores del mundo destino pasa de largo; el destello del
 *   destino cubre TODO (meseta) — ahí el host monta la escena 3D debajo — y
 *   se disuelve con overshoot: el mundo aterriza.
 *
 *   VOLVER ('saliendo'): la luz del mundo se junta y cubre (el 3D se va a la
 *   luz), los anillos corren en reversa (el túnel lo escupe a uno), y la hoja
 *   ATERRIZA de vuelta exactamente en su rect del cuaderno, exhalando sin
 *   rebote, hasta fundirse con la lámina real. Asimetría del lenguaje:
 *   volver es más corto y más tibio que entrar.
 *
 * GEOMETRÍA (FLIP): la hoja se maqueta ESTÁTICA en el rect de la lámina de
 * origen (prop `rect`, capturado por el host o por useTunelLamina) y todo el
 * vuelo es transform/opacity — compositor puro, cero animación de layout.
 * Sin rect: fallback digno centrado (la hoja nace del punto de fuga).
 *
 * CONTRATO TEMPORAL (el de TransicionMundo/VeloOdyssey — timers JS
 * deterministas, NUNCA `animationend`; el CSS anima "a ciegas" con --tl-ms):
 *   · `onCubierto` — pantalla 100% cubierta (54% del viaje): el host
 *     intercambia lámina 2D ↔ escena 3D DEBAJO del túnel;
 *   · `onFin`      — cruce resuelto: el host apaga la fase (fase=null).
 *   Cada uno se llama a lo sumo UNA vez por activación.
 *
 * TIER-SAFE: 'bajo' conserva hoja + destello (la identidad del cruce) sin
 * anillos ni motas, 30% más corto. `reducedMotion` colapsa a un corte simple
 * digno con el tinte del destino (REDUCIDA_MS del lenguaje).
 *
 * Overlay DOM puro (CERO three): seguro en el bundle base. Si el host además
 * tiene canvas 3D y quiere que la cámara acompañe, puede leer `curvaCruce`
 * de velosData con los mismos tiempos — pero NO es requisito.
 *
 * PROPS
 *   fase          null | 'entrando' | 'saliendo' — null no monta nada.
 *   destino       mundoId o familia ('microsuelo', 'bosque_vivo', 'sierra'…):
 *                 decide la tríada de color (velo del destino).
 *   rect          {x,y,width,height} de la lámina de origen (viewport coords,
 *                 p.ej. de getBoundingClientRect) — o null (fallback centrado).
 *   lamina        ReactNode: el ARTE que vuela (idealmente el mismo SVG de la
 *                 lámina tocada, p.ej. <LaminaCafeto/>). Sin él: hoja de papel
 *                 con el tinte del destino.
 *   tier          'alto'|'medio'|'bajo' (deviceTier.decidirTier().tier).
 *   reducedMotion bool.
 *   letrero       texto bajo el túnel. Default: entrar nada (que hable el
 *                 mundo); volver "De vuelta al cuaderno…". Pase '' para mudo.
 *   onCubierto / onFin  callbacks del contrato temporal.
 */
import { useEffect, useMemo, useRef } from 'react';
import { duracionTunel, momentoCubiertoTunel, varsDeTunel, tintaDeTunel } from './tunelLaminaData.js';
import './tunelLamina.css';

export default function TunelLamina({
  fase = null,
  destino = 'valle',
  rect = null,
  lamina = undefined,
  tier = 'medio',
  reducedMotion = false,
  letrero = undefined,
  onCubierto = undefined,
  onFin = undefined,
}) {
  const cubiertoRef = useRef(onCubierto);
  const finRef = useRef(onFin);
  // Refs "última versión": se actualizan en un effect (no en render) para que
  // los timers llamen siempre al callback más fresco sin re-armarse.
  useEffect(() => {
    cubiertoRef.current = onCubierto;
    finRef.current = onFin;
  });

  const activo = fase === 'entrando' || fase === 'saliendo';

  useEffect(() => {
    if (!activo) return undefined;
    let hechoCubierto = false;
    let hechoFin = false;
    const f = /** @type {'entrando'|'saliendo'} */ (fase);
    const t = /** @type {'alto'|'medio'|'bajo'} */ (tier);
    const tCubierto = setTimeout(() => {
      if (!hechoCubierto) {
        hechoCubierto = true;
        cubiertoRef.current?.();
      }
    }, momentoCubiertoTunel(f, t, reducedMotion));
    const tFin = setTimeout(() => {
      if (!hechoFin) {
        hechoFin = true;
        finRef.current?.();
      }
    }, duracionTunel(f, t, reducedMotion));
    return () => {
      hechoCubierto = true;
      hechoFin = true;
      clearTimeout(tCubierto);
      clearTimeout(tFin);
    };
  }, [activo, fase, tier, reducedMotion]);

  // El FLIP del vuelo: se congela por activación (rect es un snapshot del
  // host; el viewport se lee una vez — un resize a mitad de un cruce de ~1.5s
  // no amerita re-coreografía).
  const vuelo = useMemo(() => {
    if (!activo) return null;
    const viewport =
      typeof window === 'undefined'
        ? { ancho: 1, alto: 1 }
        : { ancho: window.innerWidth, alto: window.innerHeight };
    return varsDeTunel(rect, viewport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, fase, rect]);

  if (!activo || !vuelo) return null;

  const { claro, medio, profundo } = tintaDeTunel(destino);
  const total = duracionTunel(
    /** @type {'entrando'|'saliendo'} */ (fase),
    /** @type {'alto'|'medio'|'bajo'} */ (tier),
    reducedMotion,
  );
  const estilo = {
    '--tl-claro': claro,
    '--tl-medio': medio,
    '--tl-profundo': profundo,
    '--tl-ms': `${total}ms`,
    '--tl-dx': `${vuelo.dx.toFixed(1)}px`,
    '--tl-dy': `${vuelo.dy.toFixed(1)}px`,
    '--tl-s': vuelo.s.toFixed(3),
  };
  const rectHoja = {
    left: `${vuelo.rect.x.toFixed(1)}px`,
    top: `${vuelo.rect.y.toFixed(1)}px`,
    width: `${vuelo.rect.width.toFixed(1)}px`,
    height: `${vuelo.rect.height.toFixed(1)}px`,
  };
  // Asimetría del texto: volver acoge; entrar deja que hable el mundo.
  const texto =
    letrero !== undefined ? letrero : fase === 'saliendo' ? 'De vuelta al cuaderno…' : '';
  const conAnillos = tier !== 'bajo' && !reducedMotion;
  const conMotas = tier === 'alto' && !reducedMotion;

  if (reducedMotion) {
    return (
      <div
        className="tl"
        data-fase={fase}
        data-tier={tier}
        data-reducida="1"
        style={estilo}
        role="status"
        aria-live="polite"
        data-testid="tunel-lamina"
      >
        <div className="tl__corte" aria-hidden="true" />
        {texto ? (
          <p className="tl__letrero" style={{ opacity: 1, animation: 'none' }}>
            {texto}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="tl"
      data-fase={fase}
      data-tier={tier}
      data-reducida="0"
      style={estilo}
      role="status"
      aria-live="polite"
      data-testid="tunel-lamina"
    >
      <div className="tl__vineta" aria-hidden="true" />

      {conAnillos && (
        <div className="tl__tunel" aria-hidden="true">
          <span className="tl__anillo tl__anillo--1" />
          <span className="tl__anillo tl__anillo--2" />
          <span className="tl__anillo tl__anillo--3" />
          {conMotas && (
            <>
              <span className="tl__mota tl__mota--1" />
              <span className="tl__mota tl__mota--2" />
              <span className="tl__mota tl__mota--3" />
              <span className="tl__mota tl__mota--4" />
            </>
          )}
        </div>
      )}

      <div className="tl__hoja" style={rectHoja} aria-hidden="true">
        <div className={`tl__papel${lamina ? '' : ' tl__papel--muda'}`}>{lamina || null}</div>
      </div>

      <div className="tl__destello" aria-hidden="true" />

      {texto ? <p className="tl__letrero">{texto}</p> : null}
    </div>
  );
}
