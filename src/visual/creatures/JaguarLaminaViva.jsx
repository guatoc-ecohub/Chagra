import { useEffect, useRef, useState } from 'react';
import {
  CARPETA_LAMINA, ARCHIVO_LAMINA, ANCHO, ALTO,
  CABEZA, PATAS_DELANTERAS, PATA_TRASERA, COLA, CUERPO_PIVOTE,
} from './jaguarLamina/anatomia.js';
import { hornearJaguar } from './jaguarLamina/capas.js';
import './jaguarLamina/jaguarLamina.css';

const JAGUAR_SLUG = 'jaguar';

/**
 * JaguarLaminaViva — la LÁMINA real de Humboldt (`jaguar-natural.png`,
 * `~/demos/3d/compai/laminas/`) recortada en 5 capas por alfa (cuerpo,
 * cabeza, patas delanteras, pata trasera, cola) y montada sobre el
 * ESQUELETO real del rig (`~/demos/3d/compai/rigs/jaguar.rig.svg` +
 * `jaguar.css`, variante de perfil `#jaguarLado` — la que le corresponde a
 * esta pose de jaguar caminando de lado).
 *
 * LA FUSIÓN, en una frase: el rig aporta los HUESOS (pivotes + curvas de
 * animación reales, portadas 1:1 a `jaguarLamina.css`); la lámina aporta la
 * PIEL (cada píxel en pantalla sale del PNG — cero dibujo nuevo, cero forma
 * vectorial visible). Ver `jaguarLamina/anatomia.js` (cómo se cortó) y
 * `jaguarLamina/jaguarLamina.css` (qué transform de qué keyframe del rig le
 * toca a cada pieza, con la conversión de unidad documentada).
 *
 * QUÉ SE MUEVE: cuerpo (bóveda del paso), cabeza (bob en contratiempo),
 * patas delanteras y pata trasera (péndulo desde el hombro/cadera, en fase
 * diagonal como un cuadrúpedo real), cola (ondea desde la base), ojo
 * (parpadeo real — un parche de la propia piel se desliza sobre el ojo,
 * nunca un dibujo nuevo). Bob ambiental del cuerpo entero (asentado con
 * peso), calcado de `.flota` del rig.
 *
 * QUÉ NO SE LOGRÓ (documentado, no escondido — ver el reporte de la tarea):
 *   - Patas delantera y trasera-lejana no se separaron: en esta lámina no
 *     hay borde de alfa limpio entre ellas, así que las delanteras rotan
 *     como UN bloque (pierden la alternancia de zancada individual).
 *   - Solo la pata trasera CERCANA se recortó; la lejana no es separable
 *     del cuerpo con confianza en este PNG.
 *   - Sin marcha real (foot-plant/lift): es un péndulo de amplitud reducida
 *     alrededor de la pose ya caminando de la foto, no un ciclo de zancada
 *     completo — la lámina es UNA pose fija, no un sprite-sheet de marcha.
 *   - Sin gruñido/fauces (el rig lo tiene en `#jaguarLado`): la lámina es un
 *     retrato de boca cerrada, no hay píxeles de fauces abiertas que robar.
 *   - Solo un ojo (el visible en esta pose ¾); el otro no se midió.
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
  const patasDelHostRef = useRef(null);
  const pataTrasHostRef = useRef(null);
  const colaHostRef = useRef(null);
  const parpadoHostRef = useRef(null);
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
      capaCompleta(capas.patasDelanteras);
      capaCompleta(capas.pataTrasera);
      capaCompleta(capas.cola);
      cuerpoHostRef.current?.replaceChildren(capas.cuerpo);
      cabezaHostRef.current?.replaceChildren(capas.cabeza);
      patasDelHostRef.current?.replaceChildren(capas.patasDelanteras);
      pataTrasHostRef.current?.replaceChildren(capas.pataTrasera);
      colaHostRef.current?.replaceChildren(capas.cola);

      const p = capas.parpado;
      const cv = p.cv;
      cv.className = 'jlv-parpado';
      cv.style.left = `${(p.x0 / capas.W) * 100}%`;
      cv.style.top = `${(p.y0 / capas.H) * 100}%`;
      cv.style.width = `${(p.w / capas.W) * 100}%`;
      cv.style.height = `${(p.h / capas.H) * 100}%`;
      cv.style.display = 'block';
      if (!animated) cv.style.animation = 'none';
      parpadoHostRef.current?.replaceChildren(cv);

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
              className={animated ? 'jlv-patasDelPivote' : undefined}
              style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(PATAS_DELANTERAS.pivote) }}
            >
              <div ref={patasDelHostRef} className="jlv-capa" />
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
              <div ref={parpadoHostRef} style={{ position: 'absolute' }} />
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
