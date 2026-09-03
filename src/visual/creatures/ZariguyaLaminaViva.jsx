import { useEffect, useRef, useState } from 'react';
import {
  CARPETA_LAMINA, ARCHIVO_LAMINA, ANCHO, ALTO,
  CABEZA, OREJA_IZQ, OREJA_DER, MANDIBULA, BOCA,
  BRAZO_LAPIZ, BRAZO_BRUJULA, COLA, CUERPO_PIVOTE,
} from './zariguyaLamina/anatomia.js';
import { hornearZariguya } from './zariguyaLamina/capas.js';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import { ZARIGUYA_SLUG } from './zariguyaIdentidad.js';
import './zariguyaLamina/zariguyaLamina.css';

/* Estados del contrato de avatar → forma canónica interna (mismo mapa que
   JaguarLaminaViva: el atributo data-agt-estado viaja crudo para paridad de
   API/accesibilidad; esto solo decide el comportamiento). */
const ESTADO_CANON = {
  idle: 'idle', reposo: 'idle', acompana: 'idle',
  thinking: 'thinking', pensando: 'thinking',
  speaking: 'speaking', respondiendo: 'speaking', hablando: 'speaking',
  listening: 'listening', escuchando: 'listening',
  caminando: 'caminando', walking: 'caminando', anda: 'caminando',
};

/* Apertura de mandíbula por visema (0..1). V1 = 0 → se ve EXACTO como la
   lámina aprobada (que ya sonríe con la boca abierta — abrir es abrir MÁS). */
const JAW_DE_VISEMA = { V1: 0, V2: 0.42, V3: 1, V4: 0.36 };

/**
 * ZariguyaLaminaViva — la LÁMINA aprobada de la zarigüeya (`zariguya.png`,
 * estilo grabado: erguida, guante blanco con lápiz en la mano alzada,
 * brújula en la otra, cola prensil en C) recortada en capas por alfa y
 * montada sobre un rig con la VIDA de Angelita — hermana 1:1 de
 * `JaguarLaminaViva.jsx` (leer su docstring para el porqué del método).
 *
 * DE DÓNDE SALE CADA COSA (reúso, no reinvento):
 *   · La PIEL y el corte por alfa: `zariguyaLamina/capas.js` + `anatomia.js`
 *     (recomposición verificada offline: 0.000% de píxeles perdidos).
 *   · La VIDA: los MISMOS hooks de Angelita/el jaguar (`useVidaIdle.js`):
 *     useRitmoPropio (parpadeo con fase propia), useVidaIdle('zariguya', …)
 *     → husmea/tanatosis/reposo (vidaEstados.js — el repertorio que ya
 *     existía para la zarigüeya vector), useMiradaUsted (la testa sigue su
 *     puntero), y `visema` que el host pasa igual que a Angelita.
 *   · El ESTADO conversacional actúa por CSS (zariguyaLamina.css):
 *     escuchando PARA LAS OREJAS y ladea la testa; hablando mueve la
 *     mandíbula; pensando alza el LÁPIZ y escribe en el aire (para eso
 *     carga lápiz); idle vive (respira, la cola prensil se enrosca sola).
 *
 * QUÉ SÍ ARTICULA: parpadeo real de los dos ojos juntos con ritmo propio;
 * mirada por giro de cabeza; orejas que se paran al escuchar; mandíbula con
 * lip-sync sobre la sonrisa abierta; el brazo del lápiz que escribe al
 * pensar; la manito de la brújula con micro-vaivén; la cola prensil que se
 * enrosca y mece; tanatosis (el gag: se hace la muerta un instante, ojos
 * cerrados) y husmeo del idle-cerebro.
 *
 * HONESTIDAD (lo que el dibujo plano NO da — no se disfraza):
 *   · Al abrir MÁS la boca se destapa una franja sin píxeles: la tapa el
 *     interior de boca SINTÉTICO (`.zlv-bocaInterior`, único píxel no-PNG
 *     del dibujo — mismo trato que el jaguar).
 *   · Detrás del guante de la brújula hay pecho: el cuerpo lo rellena
 *     `capas.js` CLONANDO la lanilla del propio vientre (INPAINT_PECHO) —
 *     píxeles de la lámina, movidos.
 *   · Las patas NO se cortan (lección "3-4 patas" del jaguar): el caminar
 *     se lee del desplazamiento del host + bob del cuerpo + la cola.
 *
 * DEGRADACIÓN: mientras carga la imagen o sin Canvas2D (jsdom) se muestra
 * la lámina PLANA — nunca un hueco.
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
 *   corre y lo pasa) — abre la mandíbula al hablar.
 * @param {string} [props.tier]  'bajo' apaga el idle-cerebro y la mirada.
 * @param {(e: React.MouseEvent) => void} [props.onClick]
 * @param {(e: React.MouseEvent) => void} [props.onDoubleClick]
 */
export default function ZariguyaLaminaViva({
  estado = 'idle',
  size = 48,
  animated = true,
  className = '',
  style = undefined,
  title = 'Zarigüeya (chucha)',
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
  const brazoLapizHostRef = useRef(null);
  const brazoBrujulaHostRef = useRef(null);
  const colaHostRef = useRef(null);
  const parpadoHostRef = useRef(null);
  const parpado2HostRef = useRef(null);
  const [listo, setListo] = useState(false);

  const canon = ESTADO_CANON[estado] || 'idle';
  const enIdle = canon === 'idle';

  // ═══ LA VIDA (los MISMOS hooks de Angelita/el jaguar) ═════════════════════
  const ritmoPropio = useRitmoPropio();
  const activoVida = animated && tier !== 'bajo';
  // Idle-cerebro de la zarigüeya (husmea/tanatosis/reposo) — SOLO en idle.
  const momento = useVidaIdle(ZARIGUYA_SLUG, activoVida && enIdle);
  // La testa sigue al usuario cuando el puntero anda cerca (menos al hablar).
  useMiradaUsted(raizRef, activoVida && canon !== 'speaking');

  // Apertura extra de mandíbula: el visema manda (V1/reposo = lámina exacta).
  const jaw = JAW_DE_VISEMA[visema] ?? 0;

  useEffect(() => {
    let vivo = true;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (!vivo) return;
      const capas = hornearZariguya(img, { ancho: ANCHO, altoPx: ALTO });
      if (!capas || !vivo) return; // sin canvas → se queda en la lámina plana
      const montar = (cv, host) => {
        cv.style.position = 'absolute';
        cv.style.inset = '0';
        cv.style.width = '100%';
        cv.style.height = '100%';
        cv.style.display = 'block';
        host.current?.replaceChildren(cv);
      };
      montar(capas.cola, colaHostRef);
      montar(capas.cuerpo, cuerpoHostRef);
      montar(capas.brazoBrujula, brazoBrujulaHostRef);
      montar(capas.brazoLapiz, brazoLapizHostRef);
      montar(capas.cabeza, cabezaHostRef);
      montar(capas.mandibula, mandibulaHostRef);
      montar(capas.orejaIzq, orejaIzqHostRef);
      montar(capas.orejaDer, orejaDerHostRef);

      /* Párpados: el HOST se posiciona EN EL OJO (no inset:0 — el bug 0×0
         del jaguar, ya aprendido) y el canvas lleva el parpadeo. */
      const montarParpado = (parche, host, claseExtra) => {
        const cv = parche.cv;
        cv.className = claseExtra ? `zlv-parpado ${claseExtra}` : 'zlv-parpado';
        cv.style.position = 'absolute';
        cv.style.inset = '0';
        cv.style.width = '100%';
        cv.style.height = '100%';
        cv.style.display = 'block';
        if (!animated) cv.style.animation = 'none';
        const h = host.current;
        if (h) {
          h.style.position = 'absolute';
          h.style.inset = 'auto';
          h.style.left = `${(parche.x0 / capas.W) * 100}%`;
          h.style.top = `${(parche.y0 / capas.H) * 100}%`;
          h.style.width = `${(parche.w / capas.W) * 100}%`;
          h.style.height = `${(parche.h / capas.H) * 100}%`;
          h.replaceChildren(cv);
        }
      };
      montarParpado(capas.parpado, parpadoHostRef, 'zlv-parpado-izq');
      montarParpado(capas.parpado2, parpado2HostRef);

      setListo(true);
    };
    img.onerror = () => { /* degrada a la lámina plana; sin crash */ };
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
    '--zlv-mira-k': (size / 12).toFixed(2),
    '--zlv-jaw': String(jaw),
    ...ritmoPropio,
    ...style,
  };

  const contenedor = (
    <div
      ref={raizRef}
      role="img"
      aria-label={title}
      data-creature={ZARIGUYA_SLUG}
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
        className={cls('zlv-stage')}
        style={{ position: 'relative', width: anchoStage, height: altoStage }}
      >
        {/* Lámina plana — respaldo permanente mientras carga / sin canvas. */}
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
          <div
            className={cls('zlv-cuerpoPivote')}
            style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CUERPO_PIVOTE) }}
          >
            {/* LA COLA PRENSIL — detrás de todo: se enrosca sola en idle. */}
            <div className={cls('zlv-colaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(COLA.pivote) }}>
              <div ref={colaHostRef} className="zlv-capa" />
            </div>

            <div ref={cuerpoHostRef} className="zlv-capa" />

            {/* LA BRÚJULA en la manito contra el pecho — micro-vaivén; el
                pecho detrás va inpaintado (capas.js), no se abre hueco. */}
            <div className={cls('zlv-brazoBrujulaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(BRAZO_BRUJULA.pivote) }}>
              <div ref={brazoBrujulaHostRef} className="zlv-capa" />
            </div>

            {/* EL LÁPIZ en la mano alzada — escribe en el aire al pensar. */}
            <div className={cls('zlv-brazoLapizPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(BRAZO_LAPIZ.pivote) }}>
              <div ref={brazoLapizHostRef} className="zlv-capa" />
            </div>

            {/* LA CABEZA — tres envoltorios anidados (gesto → mira → idle),
                igual que el jaguar, para que se COMPONGAN sin pisarse. */}
            <div className={cls('zlv-cabezaGesto')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CABEZA.pivote) }}>
              <div className={cls('zlv-cabezaMira')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CABEZA.pivote) }}>
                <div className={cls('zlv-cabezaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CABEZA.pivote) }}>
                  <div ref={cabezaHostRef} className="zlv-capa" />

                  {/* INTERIOR DE BOCA SINTÉTICO (el único píxel no-lámina):
                      detrás de la mandíbula, se revela al abrir MÁS. */}
                  <div
                    className={cls('zlv-bocaInterior')}
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: `${((BOCA.cx - BOCA.ancho / 2) / ANCHO) * 100}%`,
                      top: `${(BOCA.cy / ALTO) * 100}%`,
                      width: `${(BOCA.ancho / ANCHO) * 100}%`,
                      height: `${((BOCA.ancho * 0.5) / ALTO) * 100}%`,
                      transformOrigin: '50% 0%',
                    }}
                  />

                  {/* MANDÍBULA-lámina: abre MÁS con el lip-sync. */}
                  <div className={cls('zlv-mandibulaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(MANDIBULA.pivote) }}>
                    <div ref={mandibulaHostRef} className="zlv-capa" />
                  </div>

                  {/* OREJAS-lámina: se paran al escuchar, se mecen en idle. */}
                  <div className={cls('zlv-orejaIzqPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(OREJA_IZQ.pivote) }}>
                    <div ref={orejaIzqHostRef} className="zlv-capa" />
                  </div>
                  <div className={cls('zlv-orejaDerPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(OREJA_DER.pivote) }}>
                    <div ref={orejaDerHostRef} className="zlv-capa" />
                  </div>

                  {/* PÁRPADOS: parpadeo real, los dos ojos JUNTOS (vars de
                      ritmo propio en la raíz); cierran sostenido en la
                      tanatosis. El host se reposiciona en el ojo al montar. */}
                  <div ref={parpadoHostRef} style={{ position: 'absolute' }} />
                  <div ref={parpado2HostRef} style={{ position: 'absolute' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Paridad con los avatares hermanos: con handlers, botón real.
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
