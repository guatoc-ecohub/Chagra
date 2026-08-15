import { useEffect, useRef, useState } from 'react';
import {
  CARPETA_LAMINA, ARCHIVO_LAMINA, ANCHO, ALTO,
  CABEZA, PATA_DEL_CERCA, PATA_DEL_LEJANA, PATA_TRASERA, COLA, CUERPO_PIVOTE,
} from './jaguarLamina/anatomia.js';
import { hornearJaguar } from './jaguarLamina/capas.js';
import './jaguarLamina/jaguarLamina.css';

const JAGUAR_SLUG = 'jaguar';

/**
 * JaguarLaminaViva — la LÁMINA real de Humboldt (`jaguar-natural.png`,
 * `~/demos/3d/compai/laminas/`) recortada en capas por alfa (cuerpo, cabeza,
 * patas delanteras ×2, pata trasera, cola) y montada sobre el ESQUELETO real
 * del rig (`~/demos/3d/compai/rigs/jaguar.rig.svg` + `jaguar.css`, variante
 * de perfil `#jaguarLado` — la que le corresponde a esta pose de jaguar
 * caminando de lado).
 *
 * LA FUSIÓN, en una frase: el rig aporta los HUESOS (pivotes + curvas de
 * animación reales, portadas 1:1 a `jaguarLamina.css`); la lámina aporta la
 * PIEL (cada píxel en pantalla sale del PNG — cero dibujo nuevo, cero forma
 * vectorial visible). Ver `jaguarLamina/anatomia.js` (cómo se cortó) y
 * `jaguarLamina/jaguarLamina.css` (qué transform de qué keyframe del rig le
 * toca a cada pieza, con la conversión de unidad documentada).
 *
 * QUÉ SE MUEVE: cuerpo (bóveda del paso), cabeza (bob en contratiempo), las
 * DOS patas delanteras + la pata trasera (péndulo desde el hombro/cadera,
 * cada una con la fase REAL del rig — `#jaguarLado` en jaguar.css: delCerca
 * 0s, delLejos -.66s, trasCerca -.52s — así que ya alternan de verdad en vez
 * de moverse en bloque), cola (ondea desde la base), LOS DOS ojos (parpadeo
 * real y sincronizado — un parche de la propia piel se desliza sobre cada
 * ojo, nunca un dibujo nuevo). Bob ambiental del cuerpo entero (asentado con
 * peso), calcado de `.flota` del rig.
 *
 * PULIDO `feat/jaguar-pulido` (2026-08-14) sobre `feat/jaguar-lamina-sobre-
 * esqueleto` (372a3a8c): las dos patas delanteras se separaron (antes un
 * bloque único, ver `SOLAPE_PATA_DEL_CERCA` en anatomia.js para el respaldo
 * anti-hueco que hizo falta) y el parpadeo — que en la rama anterior NO
 * RENDERIZABA (bug real: el host del párpado tenía `position:absolute` sin
 * `inset:0`, así que el `<canvas>` con ancho/alto en % resolvía a 0×0;
 * encontrado con `getBoundingClientRect` en Chromium real, no era un tema de
 * tamaño) — ahora parpadea de VERDAD, con los DOS ojos sincronizados, parche
 * más grande y un ciclo con hold real (ver `jaguarLamina.css`, `jlv-blink`).
 * Ver el reporte de la tarea para el detalle de qué se verificó y qué límite
 * del dibujo plano sigue de pie.
 *
 * QUÉ NO SE LOGRÓ (documentado, no escondido — ver el reporte de la tarea):
 *   - La pata trasera-lejana sigue sin separarse: no es distinguible del
 *     cuerpo/la trasera-cercana en el alfa de esta lámina.
 *   - Sin marcha real (foot-plant/lift): es un péndulo de amplitud reducida
 *     alrededor de la pose ya caminando de la foto, no un ciclo de zancada
 *     completo — la lámina es UNA pose fija, no un sprite-sheet de marcha.
 *   - Sin gruñido/fauces (el rig lo tiene en `#jaguarLado`): la lámina es un
 *     retrato de boca cerrada, no hay píxeles de fauces abiertas que robar.
 *
 * DEGRADACIÓN: mientras la imagen carga, o si el navegador no puede hornear
 * canvas 2D (jsdom de los tests), se muestra la lámina PLANA (`<img>`, la
 * imagen real completa) — nunca un hueco, nunca una forma inventada.
 *
 * @param {Object} props
 * @param {string} [props.estado='idle']  vocabulario del contrato de avatar
 *   del agente ('idle'|'thinking'|'speaking'|'listening'); solo se expone
 *   como `data-agt-estado` — el rig de perfil no tiene variantes por estado
 *   (`#jaguarLado` en jaguar.css SOLO define la pose de marcha, sin ramas
 *   por `data-estado`), así que no hay transform real que cambiar por
 *   estado; inventar uno sería redibujar el comportamiento, no el arte,
 *   pero el SPEC pide ceñirse a transforms que EXISTEN en el rig.
 * @param {number} [props.size=48]
 * @param {boolean} [props.animated=true]
 * @param {string} [props.className]
 * @param {Object} [props.style]
 * @param {string} [props.title]
 * @param {string|null} [props.visema]  aceptado por paridad de API con los
 *   avatares hermanos (se expone como `data-visema`); sin efecto visual —
 *   la lámina es boca cerrada, no se midió mandíbula.
 * @param {(e: React.MouseEvent) => void} [props.onClick]
 * @param {(e: React.MouseEvent) => void} [props.onDoubleClick]
 */
export default function JaguarLaminaViva({
  estado = 'idle',
  size = 48,
  animated = true,
  className = '',
  style = undefined,
  title = 'Jaguar',
  visema = null,
  onClick = undefined,
  onDoubleClick = undefined,
  ...rest
}) {
  const cuerpoHostRef = useRef(null);
  const cabezaHostRef = useRef(null);
  const patasDelCercaHostRef = useRef(null);
  const patasDelLejanaHostRef = useRef(null);
  const pataTrasHostRef = useRef(null);
  const colaHostRef = useRef(null);
  const parpadoHostRef = useRef(null);
  const parpado2HostRef = useRef(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vivo = true;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (!vivo) return;
      const capas = hornearJaguar(img, { ancho: ANCHO, altoPx: ALTO });
      if (!capas || !vivo) return; // sin soporte de canvas → se queda en el <img> plano
      const capaCompleta = (cv) => {
        cv.style.position = 'absolute';
        cv.style.inset = '0';
        cv.style.width = '100%';
        cv.style.height = '100%';
        cv.style.display = 'block';
      };
      capaCompleta(capas.cuerpo);
      capaCompleta(capas.cabeza);
      capaCompleta(capas.patasDelCerca);
      capaCompleta(capas.patasDelLejana);
      capaCompleta(capas.pataTrasera);
      capaCompleta(capas.cola);
      cuerpoHostRef.current?.replaceChildren(capas.cuerpo);
      cabezaHostRef.current?.replaceChildren(capas.cabeza);
      patasDelCercaHostRef.current?.replaceChildren(capas.patasDelCerca);
      patasDelLejanaHostRef.current?.replaceChildren(capas.patasDelLejana);
      pataTrasHostRef.current?.replaceChildren(capas.pataTrasera);
      colaHostRef.current?.replaceChildren(capas.cola);

      /** Monta un parche de párpado ya horneado (`{cv,x0,y0,w,h}`) en su host. */
      const montarParpado = (parche, host) => {
        const cv = parche.cv;
        cv.className = 'jlv-parpado';
        cv.style.left = `${(parche.x0 / capas.W) * 100}%`;
        cv.style.top = `${(parche.y0 / capas.H) * 100}%`;
        cv.style.width = `${(parche.w / capas.W) * 100}%`;
        cv.style.height = `${(parche.h / capas.H) * 100}%`;
        cv.style.display = 'block';
        if (!animated) cv.style.animation = 'none';
        host.current?.replaceChildren(cv);
      };
      montarParpado(capas.parpado, parpadoHostRef);
      montarParpado(capas.parpado2, parpado2HostRef);

      setListo(true);
    };
    img.onerror = () => { /* degrada a la lámina plana ya montada; sin crash */ };
    img.src = CARPETA_LAMINA + ARCHIVO_LAMINA;
    return () => { vivo = false; };
  }, [animated]);

  const aspecto = ANCHO / ALTO;
  const anchoStage = aspecto >= 1 ? size : size * aspecto;
  const altoStage = aspecto >= 1 ? size / aspecto : size;

  /** @param {number[]} punto */
  const pctOf = (punto) => `${(punto[0] / ANCHO) * 100}% ${(punto[1] / ALTO) * 100}%`;

  const contenedor = (
    <div
      role="img"
      aria-label={title}
      data-creature={JAGUAR_SLUG}
      data-agt-estado={estado}
      data-visema={visema || undefined}
      title={title}
      className={className || undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        ...style,
      }}
      {...rest}
    >
      <div
        className={animated ? 'jlv-stage' : undefined}
        style={{ position: 'relative', width: anchoStage, height: altoStage }}
      >
        {/* Lámina plana — SIEMPRE montada hasta que `listo` la reemplaza por
            las capas horneadas; respaldo permanente si Canvas2D no está
            disponible (jsdom de los tests, navegador exótico). */}
        {!listo && (
          <img
            src={CARPETA_LAMINA + ARCHIVO_LAMINA}
            alt=""
            aria-hidden="true"
            width={ANCHO}
            height={ALTO}
            decoding="async"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        )}
        <div
          style={{
            position: 'absolute', inset: 0, display: listo ? 'block' : 'none',
          }}
        >
          <div
            className={animated ? 'jlv-cuerpoPivote' : undefined}
            style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CUERPO_PIVOTE) }}
          >
            <div ref={cuerpoHostRef} className="jlv-capa" />

            <div
              className={animated ? 'jlv-patasDelCercaPivote' : undefined}
              style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(PATA_DEL_CERCA.pivote) }}
            >
              <div ref={patasDelCercaHostRef} className="jlv-capa" />
            </div>

            <div
              className={animated ? 'jlv-patasDelLejanaPivote' : undefined}
              style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(PATA_DEL_LEJANA.pivote) }}
            >
              <div ref={patasDelLejanaHostRef} className="jlv-capa" />
            </div>

            <div
              className={animated ? 'jlv-pataTrasPivote' : undefined}
              style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(PATA_TRASERA.pivote) }}
            >
              <div ref={pataTrasHostRef} className="jlv-capa" />
            </div>

            <div
              className={animated ? 'jlv-colaPivote' : undefined}
              style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(COLA.pivote) }}
            >
              <div ref={colaHostRef} className="jlv-capa" />
            </div>

            <div
              className={animated ? 'jlv-cabezaPivote' : undefined}
              style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CABEZA.pivote) }}
            >
              <div ref={cabezaHostRef} className="jlv-capa" />
              {/* `inset: 0` es OBLIGATORIO acá — sin él, este wrapper (position:
                  absolute sin más) no tiene tamaño definido, y el <canvas> del
                  párpado (ancho/alto en %, ver montarParpado) resuelve esos
                  porcentajes contra un contenedor sin tamaño → 0×0 real (medido
                  con getBoundingClientRect en Chromium: width=0, height=0). Bug
                  encontrado en el pulido `feat/jaguar-pulido`: el párpado NO
                  "se veía chico" a 48px como se pensaba — no se veía PORQUE NO
                  RENDERIZABA, con o sin `inset:0` el bug era el mismo en la
                  versión sin pulir. Con `inset:0` el wrapper hereda el tamaño
                  completo de `jlv-cabezaPivote` y el % del canvas resuelve bien. */}
              <div ref={parpadoHostRef} style={{ position: 'absolute', inset: 0 }} />
              <div ref={parpado2HostRef} style={{ position: 'absolute', inset: 0 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Paridad con los avatares hermanos: con handlers, botón real (teclado +
  // lector de pantalla); sin handlers, solo el dibujo.
  if (onClick || onDoubleClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        aria-label={title}
        title={title}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}
      >
        {contenedor}
      </button>
    );
  }
  return contenedor;
}
