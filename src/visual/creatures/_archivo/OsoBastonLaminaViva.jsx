import { useEffect, useRef, useState } from 'react';
import {
  CARPETA_LAMINA, ARCHIVO_LAMINA, ANCHO, ALTO,
  CABEZA, OREJA_IZQ, OREJA_DER, MANDIBULA, CORONA, CUERPO_PIVOTE, BOCA,
} from '../osoLamina/anatomia.js';
import { hornearOso } from '../osoLamina/capas.js';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from '../useVidaIdle.js';
import { OSO_BASTON_SLUG } from '../osoBastonIdentidad.js';
import '../osoLamina/osoLamina.css';

/* Estados del contrato de avatar → forma canónica interna. El host escribe
   'idle'|'thinking'|'speaking'|'listening' (o 'caminando'); esto los
   normaliza para decidir el COMPORTAMIENTO (el atributo data-agt-estado
   viaja crudo, para paridad de API/accesibilidad y para que los tests y el
   host lo lean tal cual). Mismo mapa que JaguarLaminaViva. */
const ESTADO_CANON = {
  idle: 'idle', reposo: 'idle', acompana: 'idle',
  thinking: 'thinking', pensando: 'thinking',
  speaking: 'speaking', respondiendo: 'speaking', hablando: 'speaking',
  listening: 'listening', escuchando: 'listening',
  caminando: 'caminando', walking: 'caminando', anda: 'caminando',
};

/* Nivel de apertura de la mandíbula por visema (0..1) — alimenta el lip-sync.
   V1 (cerrada) = 0 → se ve EXACTO como la lámina aprobada (sonrisa cerrada). */
const JAW_DE_VISEMA = { V1: 0, V2: 0.42, V3: 1, V4: 0.36 };

/**
 * OsoBastonLaminaViva — la LÁMINA real aprobada del oso del bastón
 * (`oso.png`: el caminante ERGUIDO sobre su roca, brazo en jarra, el bastón
 * coronado de frailejón y orquídeas) recortada en capas por alfa y montada
 * sobre un rig con la VIDA de Angelita — el mismo trasplante piel+vida que
 * `JaguarLaminaViva.jsx`, a cuya doctrina se ciñe todo este archivo.
 *
 * DE DÓNDE SALE CADA COSA (reúso, no reinvento):
 *   · La PIEL y el corte por alfa: `osoLamina/capas.js` + `anatomia.js`
 *     (método del jaguar: cero dibujo nuevo, todo el color sale del PNG).
 *   · La VIDA: los MISMOS hooks de Angelita y los bichos rubber-hose:
 *       - `useRitmoPropio()`  → parpadea a SU aire (vars --rh-blink-*).
 *       - `useVidaIdle('oso-baston', …)` → el idle-cerebro del caminante
 *         (vidaEstados.js: florece/resopla/reposo). Viaja como `data-vida`.
 *       - `useMiradaUsted(raíz, …)` → la cabeza SIGUE su puntero/dedo.
 *       - `visema` (prop, el host corre `useLipSync`) → mueve la mandíbula.
 *   · El ESTADO conversacional actúa por CSS (osoLamina.css): escuchando
 *     PARA LAS OREJAS e inclina la testa; hablando mueve la mandíbula;
 *     pensando mira arriba; idle vive (respira desde los apoyos, la corona
 *     del bastón cabecea).
 *
 * QUÉ SÍ ARTICULA: parpadeo real del único ojo en cuadro con ritmo propio;
 * mirada que sigue al usuario (giro de cabeza); orejas que se paran al
 * escuchar y se mecen en idle; mandíbula con lip-sync; el repertorio del
 * caminante (la corona late EN FLOR al florecer, el huff del pecho al
 * resoplar, el sacudón del reposo); respiración plantada en la roca.
 *
 * HONESTIDAD (lo que el dibujo plano NO da — no se disfraza):
 *   · BOCA ABIERTA: la lámina es una sonrisota CERRADA. Al bajar la
 *     mandíbula-pieza el hueco lo tapa un INTERIOR DE BOCA SINTÉTICO
 *     (`.olv-bocaInterior`, el ÚNICO píxel que no sale del PNG).
 *   · UN SOLO OJO: la pose ¾ deja el ojo lejano fuera de la lámina (medido
 *     con zoom 6× — solo mechones). Parpadea el que está: anatomía, no guiño.
 *   · SIN VAHO al resoplar (serían píxeles inventados) y SIN gait por-pata
 *     (el oso va plantado; el andar del compai lo pone el roaming del host).
 *
 * DEGRADACIÓN: mientras la imagen carga, o si el navegador no hornea canvas
 * 2D (jsdom de los tests), se muestra la lámina PLANA — nunca un hueco.
 *
 * @param {Object} props
 * @param {string} [props.estado='idle']  'idle'|'thinking'|'speaking'|
 *   'listening' (o 'caminando'). Viaja crudo como data-agt-estado.
 * @param {number} [props.size=48]
 * @param {boolean} [props.animated=true]  false = fotograma digno, sin vida.
 * @param {string} [props.className]
 * @param {Object} [props.style]
 * @param {string} [props.title]
 * @param {string|null} [props.visema]  'V1'..'V4' de useLipSync (el host lo
 *   corre y lo pasa) — mueve la mandíbula al hablar.
 * @param {string} [props.tier]  'bajo' apaga el idle-cerebro y la mirada.
 * @param {(e: React.MouseEvent) => void} [props.onClick]
 * @param {(e: React.MouseEvent) => void} [props.onDoubleClick]
 */
export default function OsoBastonLaminaViva({
  estado = 'idle',
  size = 48,
  animated = true,
  className = '',
  style = undefined,
  title = 'Oso del bastón',
  visema = null,
  tier = undefined,
  onClick = undefined,
  onDoubleClick = undefined,
  ...rest
}) {
  const raizRef = useRef(null);
  const cuerpoHostRef = useRef(null);
  const cabezaHostRef = useRef(null);
  const orejaIzqHostRef = useRef(null);
  const orejaDerHostRef = useRef(null);
  const mandibulaHostRef = useRef(null);
  const coronaHostRef = useRef(null);
  const parpadoHostRef = useRef(null);
  const [listo, setListo] = useState(false);

  const canon = ESTADO_CANON[estado] || 'idle';
  const enIdle = canon === 'idle';

  // ═══ LA VIDA (los MISMOS hooks de Angelita/el jaguar) ═════════════════════
  const ritmoPropio = useRitmoPropio();
  const activoVida = animated && tier !== 'bajo';
  const momento = useVidaIdle(OSO_BASTON_SLUG, activoVida && enIdle);
  useMiradaUsted(raizRef, activoVida && canon !== 'speaking');

  // Apertura de mandíbula: el visema manda; el resoplido no abre la boca (el
  // huff del oso es de pecho, no de fauces — ver osoLamina.css).
  const jaw = JAW_DE_VISEMA[visema] ?? 0;

  useEffect(() => {
    let vivo = true;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (!vivo) return;
      const capas = hornearOso(img, { ancho: ANCHO, altoPx: ALTO });
      if (!capas || !vivo) return; // sin soporte de canvas → lámina plana
      const capaCompleta = (cv) => {
        cv.style.position = 'absolute';
        cv.style.inset = '0';
        cv.style.width = '100%';
        cv.style.height = '100%';
        cv.style.display = 'block';
      };
      const montar = (cv, host) => { capaCompleta(cv); host.current?.replaceChildren(cv); };
      montar(capas.cuerpo, cuerpoHostRef);
      montar(capas.corona, coronaHostRef);
      montar(capas.cabeza, cabezaHostRef);
      montar(capas.mandibula, mandibulaHostRef);
      montar(capas.orejaIzq, orejaIzqHostRef);
      montar(capas.orejaDer, orejaDerHostRef);

      /* El parche de párpado horneado (`{cv,x0,y0,w,h}`): el HOST se
         posiciona EN EL OJO (no inset:0 — la lección del bug 0×0 del jaguar)
         para que el cierre escale alrededor del ojo. */
      const parche = capas.parpado;
      const cv = parche.cv;
      cv.className = 'olv-parpado';
      cv.style.position = 'absolute';
      cv.style.inset = '0';
      cv.style.width = '100%';
      cv.style.height = '100%';
      cv.style.display = 'block';
      if (!animated) cv.style.animation = 'none';
      const h = parpadoHostRef.current;
      if (h) {
        h.style.position = 'absolute';
        h.style.inset = 'auto';
        h.style.left = `${(parche.x0 / capas.W) * 100}%`;
        h.style.top = `${(parche.y0 / capas.H) * 100}%`;
        h.style.width = `${(parche.w / capas.W) * 100}%`;
        h.style.height = `${(parche.h / capas.H) * 100}%`;
        h.replaceChildren(cv);
      }

      setListo(true);
    };
    img.onerror = () => { /* degrada a la lámina plana ya montada; sin crash */ };
    img.src = CARPETA_LAMINA + ARCHIVO_LAMINA;
    return () => { vivo = false; };
  }, [animated]);

  const aspecto = ANCHO / ALTO;
  const anchoStage = aspecto >= 1 ? size : size * aspecto;
  const altoStage = aspecto >= 1 ? size / aspecto : size;

  /** @param {number[]} punto  → "x% y%" para transform-origin. */
  const pctOf = (punto) => `${(punto[0] / ANCHO) * 100}% ${(punto[1] / ALTO) * 100}%`;
  const cls = (c) => (animated ? c : undefined);

  const estiloRaiz = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    '--olv-mira-k': (size / 12).toFixed(2),
    '--olv-jaw': String(jaw),
    '--olv-boca-giro': `${BOCA.giro}deg`,
    ...ritmoPropio,
    ...style,
  };

  const contenedor = (
    <div
      ref={raizRef}
      role="img"
      aria-label={title}
      data-creature={OSO_BASTON_SLUG}
      data-agt-estado={estado}
      data-visema={visema || undefined}
      data-vida={animated && momento ? momento : undefined}
      data-tier={tier || undefined}
      title={title}
      className={className || undefined}
      style={estiloRaiz}
      {...rest}
    >
      <div
        className={cls('olv-stage')}
        style={{ position: 'relative', width: anchoStage, height: altoStage }}
      >
        {/* Lámina plana — respaldo permanente si Canvas2D no está disponible
            (jsdom de los tests) y mientras la imagen carga. */}
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
        <div style={{ position: 'absolute', inset: 0, display: listo ? 'block' : 'none' }}>
          {/* respira desde LOS APOYOS: el pecho hincha, los pies no se
              despegan de la roca (transform-origin entre las dos plantas). */}
          <div
            className={cls('olv-cuerpoPivote')}
            style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CUERPO_PIVOTE) }}
          >
            <div ref={cuerpoHostRef} className="olv-capa" />

            {/* LA CORONA del bastón — cabecea desde su base en el palo (el
                respaldo del cuerpo tapa la costura). Late EN FLOR al florecer. */}
            <div className={cls('olv-coronaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CORONA.pivote) }}>
              <div ref={coronaHostRef} className="olv-capa" />
            </div>

            {/* LA CABEZA — tres envoltorios anidados (gesto → mira → cabeceo)
                que se COMPONEN sin pisarse, igual que el jaguar. */}
            <div className={cls('olv-cabezaGesto')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CABEZA.pivote) }}>
              <div className={cls('olv-cabezaMira')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CABEZA.pivote) }}>
                <div className={cls('olv-cabezaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CABEZA.pivote) }}>
                  <div ref={cabezaHostRef} className="olv-capa" />

                  {/* INTERIOR DE BOCA SINTÉTICO (el único píxel no-lámina):
                      detrás de la mandíbula, girado con la diagonal real de
                      la sonrisa; se revela cuando la mandíbula baja. */}
                  <div
                    className={cls('olv-bocaInterior')}
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: `${((BOCA.cx - BOCA.ancho / 2) / ANCHO) * 100}%`,
                      top: `${(BOCA.cy / ALTO) * 100}%`,
                      width: `${(BOCA.ancho / ANCHO) * 100}%`,
                      height: `${((BOCA.ancho * 0.6) / ALTO) * 100}%`,
                      transformOrigin: '50% 0%',
                    }}
                  />

                  {/* MANDÍBULA-lámina: baja con el lip-sync. */}
                  <div className={cls('olv-mandibulaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(MANDIBULA.pivote) }}>
                    <div ref={mandibulaHostRef} className="olv-capa" />
                  </div>

                  {/* OREJAS-lámina: se paran al escuchar, se mecen en idle. */}
                  <div className={cls('olv-orejaIzqPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(OREJA_IZQ.pivote) }}>
                    <div ref={orejaIzqHostRef} className="olv-capa" />
                  </div>
                  <div className={cls('olv-orejaDerPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(OREJA_DER.pivote) }}>
                    <div ref={orejaDerHostRef} className="olv-capa" />
                  </div>

                  {/* PÁRPADO: parpadeo real del único ojo en cuadro, con
                      ritmo propio. El host se reposiciona en el ojo al montar. */}
                  <div ref={parpadoHostRef} style={{ position: 'absolute' }} />
                </div>
              </div>
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
