import { useEffect, useRef, useState } from 'react';
import {
  CARPETA_LAMINA, ARCHIVO_LAMINA, ANCHO, ALTO,
  CABEZA, MANDIBULA, BOCA, MANO_LAPIZ, CUERPO_PIVOTE,
} from './chivitoLamina/anatomia.js';
import { hornearChivito } from './chivitoLamina/capas.js';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import { CHIVITO_SLUG, CHIVITO_NOMBRE } from './chivitoIdentidad.js';
import './chivitoLamina/chivitoLamina.css';

/* Estados del contrato de avatar → forma canónica interna. El host escribe
   'idle'|'thinking'|'speaking'|'listening' (o 'caminando' para andar); esto
   los normaliza para decidir el COMPORTAMIENTO (el atributo data-agt-estado
   viaja crudo, para paridad de API/accesibilidad). */
const ESTADO_CANON = {
  idle: 'idle', reposo: 'idle', acompana: 'idle',
  thinking: 'thinking', pensando: 'thinking',
  speaking: 'speaking', respondiendo: 'speaking', hablando: 'speaking',
  listening: 'listening', escuchando: 'listening',
  caminando: 'caminando', walking: 'caminando', anda: 'caminando',
};

/* Nivel de apertura del pico por visema (0..1) — alimenta el lip-sync: el
   pico-inferior-lámina baja y el interior sintético se revela en ese grado.
   V1 (cerrado) = 0 → se ve EXACTO como la lámina aprobada. */
const JAW_DE_VISEMA = { V1: 0, V2: 0.42, V3: 1, V4: 0.36 };

/**
 * ChivitoPunkLaminaViva — la LÁMINA aprobada del chivito de páramo punk
 * (`chivito-punk.png`: la cresta mohawk de puntas moradas, la barba-gorguera
 * verde, la pañoleta, el lápiz alzado y la libreta abrazada) recortada en
 * capas por alfa y montada sobre el MISMO sistema de vida del jaguar
 * lámina-viva, la luciérnaga y Angelita.
 *
 * DE DÓNDE SALE CADA COSA (reúso, no reinvento):
 *   · La PIEL y el corte por alfa: `chivitoLamina/capas.js` + `anatomia.js`
 *     (puerto del motor del jaguar vía la luciérnaga, aprobado por el
 *     operador — cara intacta, cresta entera, cero dibujo nuevo).
 *   · La VIDA: los MISMOS hooks que usan Angelita, los bichos rubber-hose,
 *     el jaguar y la luciérnaga (`useVidaIdle.js`):
 *       - `useRitmoPropio()`  → cada instancia parpadea a SU aire (vars
 *         --rh-blink-dur/-delay; sin esto todas parpadean como metrónomo).
 *       - `useVidaIdle('chivito-punk', …)` → el idle-cerebro con el
 *         repertorio punk (vidaEstados.js: rockea/apunta/reposo) — EXISTE
 *         aunque nadie le hable. Viaja como `data-vida`.
 *       - `useMiradaUsted(raíz, …)` → la cabeza SIGUE su puntero/dedo cuando
 *         anda cerca (data-rh-mira + vars --rh-mx/--rh-my) y lo suelta a ~2s.
 *       - `visema` (prop, el host corre `useLipSync` y lo pasa) → mueve el
 *         pico inferior al hablar.
 *   · El ESTADO conversacional actúa con el cuerpo por CSS
 *     (chivitoLamina.css): escuchando ladea la testa atento; hablando abre
 *     el pico en tijera con énfasis de canto; pensando mira arriba y
 *     golpetea el lápiz; idle vive (rockea/apunta/reposo).
 *
 * QUÉ SÍ ARTICULA (verificable en el gate 2.5D DOM): parpadeo real de los
 * dos ojos juntos con ritmo propio; mirada que sigue al usuario (giro de
 * cabeza); pico inferior que baja con el lip-sync; la mano del lápiz que
 * gesticula (apunta/escribe/saluda); headbang punk con la cresta entera;
 * respiración.
 *
 * HONESTIDAD (lo que el dibujo plano NO da — no se disfraza):
 *   · PICO ABIERTO: la lámina tiene el pico cerrado. Al bajar el pico-pieza
 *     se abre un hueco sin fauces detrás; lo tapa un INTERIOR SINTÉTICO
 *     (`.clv-bocaInterior`, el ÚNICO píxel que no sale del PNG).
 *   · PUPILA: recortarla y moverla obligaría a repintar el ojo que destapa
 *     (prohibido) — la mirada es giro de cabeza.
 *   · CRESTA: no es pieza aparte (regla dura: no se recorta de la cabeza ni
 *     se aplana) — azota porque el headbang mueve la testa completa.
 *   · PATAS/LIBRETA/COLA: plantadas / abrazada / base oculta tras la
 *     libreta — se mueven CON el cuerpo, nunca por su cuenta. Límites
 *     documentados en `anatomia.js`.
 *
 * DEGRADACIÓN: mientras la imagen carga, o si el navegador no hornea canvas
 * 2D (jsdom de los tests), se muestra la lámina PLANA — nunca un hueco.
 *
 * @param {Object} props
 * @param {string} [props.estado='idle']  'idle'|'thinking'|'speaking'|
 *   'listening' (o 'caminando' para andar). Viaja crudo como data-agt-estado.
 * @param {number} [props.size=48]
 * @param {boolean} [props.animated=true]  false = fotograma digno, sin vida.
 * @param {string} [props.className]
 * @param {Object} [props.style]
 * @param {string} [props.title]
 * @param {string|null} [props.visema]  'V1'..'V4' de useLipSync (el host lo
 *   corre y lo pasa) — mueve el pico al hablar.
 * @param {string} [props.tier]  'bajo' apaga el idle-cerebro y la mirada.
 * @param {(e: React.MouseEvent) => void} [props.onClick]
 * @param {(e: React.MouseEvent) => void} [props.onDoubleClick]
 */
export default function ChivitoPunkLaminaViva({
  estado = 'idle',
  size = 48,
  animated = true,
  className = '',
  style = undefined,
  title = CHIVITO_NOMBRE,
  visema = null,
  tier = undefined,
  onClick = undefined,
  onDoubleClick = undefined,
  ...rest
}) {
  const raizRef = useRef(null);
  const cuerpoHostRef = useRef(null);
  const manoHostRef = useRef(null);
  const cabezaHostRef = useRef(null);
  const mandibulaHostRef = useRef(null);
  const parpadoHostRef = useRef(null);
  const parpado2HostRef = useRef(null);
  const [listo, setListo] = useState(false);

  const canon = ESTADO_CANON[estado] || 'idle';
  const enIdle = canon === 'idle';

  // ═══ LA VIDA (los MISMOS hooks de Angelita/el jaguar/la luciérnaga) ═══════
  const ritmoPropio = useRitmoPropio();
  const activoVida = animated && tier !== 'bajo';
  const momento = useVidaIdle(CHIVITO_SLUG, activoVida && enIdle);
  useMiradaUsted(raizRef, activoVida && canon !== 'speaking');

  const jaw = JAW_DE_VISEMA[visema] ?? 0;

  useEffect(() => {
    let vivo = true;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (!vivo) return;
      const capas = hornearChivito(img, { ancho: ANCHO, altoPx: ALTO });
      if (!capas || !vivo) return; // sin soporte de canvas → lámina plana
      const montar = (cv, host) => {
        cv.style.position = 'absolute';
        cv.style.inset = '0';
        cv.style.width = '100%';
        cv.style.height = '100%';
        cv.style.display = 'block';
        host.current?.replaceChildren(cv);
      };
      montar(capas.cuerpo, cuerpoHostRef);
      montar(capas.manoLapiz, manoHostRef);
      montar(capas.cabeza, cabezaHostRef);
      montar(capas.mandibula, mandibulaHostRef);

      /* Monta un parche de párpado horneado (`{cv,x0,y0,w,h}`): el HOST se
         posiciona EN EL OJO (no inset:0) para que el cierre escale alrededor
         del ojo; el canvas llena el host y lleva el parpadeo. (El inset:0 del
         canvas es el fix del bug 0×0 del jaguar — no quitarlo.) */
      const montarParpado = (parche, host) => {
        const cv = parche.cv;
        cv.className = 'clv-parpado';
        cv.style.position = 'absolute';
        cv.style.inset = '0';
        cv.style.width = '100%';
        cv.style.height = '100%';
        cv.style.display = 'block';
        if (!animated) {
          // Fotograma digno = ojos ABIERTOS: sin la animación de parpadeo el
          // transform por defecto es scaleY(1) (párpado TAPANDO el ojo, por
          // la polaridad invertida del parche) — hay que retraerlo explícito.
          // (Misma política que prefers-reduced-motion en el CSS.)
          cv.style.animation = 'none';
          cv.style.transform = 'scaleY(0)';
        }
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
      // Los dos ojos comparten el mismo ritmo (vars en la raíz) → parpadean
      // JUNTOS (parpadeo real, no un guiño).
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

  /** @param {number[]} punto  → "x% y%" para transform-origin. */
  const pctOf = (punto) => `${(punto[0] / ANCHO) * 100}% ${(punto[1] / ALTO) * 100}%`;
  const cls = (c) => (animated ? c : undefined);

  const estiloRaiz = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    '--clv-mira-k': (size / 12).toFixed(2),
    '--clv-jaw': String(jaw),
    ...ritmoPropio,
    ...style,
  };

  const contenedor = (
    <div
      ref={raizRef}
      role="img"
      aria-label={title}
      data-creature={CHIVITO_SLUG}
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
        className={cls('clv-stage')}
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
          <div
            className={cls('clv-cuerpoPivote')}
            style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CUERPO_PIVOTE) }}
          >
            <div ref={cuerpoHostRef} className="clv-capa" />

            {/* LA MANO DEL LÁPIZ — gesticula desde la muñeca. */}
            <div className={cls('clv-manoPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(MANO_LAPIZ.pivote) }}>
              <div ref={manoHostRef} className="clv-capa" />
            </div>

            {/* LA CABEZA — tres envoltorios anidados: gesto (idle-cerebro/
                estado) → mira (giro hacia el usuario) → bob. Se COMPONEN sin
                pisarse (cada uno su transform). La cresta va DENTRO de la
                pieza cabeza (entera, regla dura) — azota con la testa. */}
            <div className={cls('clv-cabezaGesto')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CABEZA.pivote) }}>
              <div className={cls('clv-cabezaMira')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CABEZA.pivote) }}>
                <div className={cls('clv-cabezaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CABEZA.pivote) }}>
                  <div ref={cabezaHostRef} className="clv-capa" />

                  {/* INTERIOR DE BOCA SINTÉTICO (el único píxel no-lámina):
                      detrás del pico inferior, se revela cuando éste baja. */}
                  <div
                    className={cls('clv-bocaInterior')}
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: `${((BOCA.cx - BOCA.ancho / 2) / ANCHO) * 100}%`,
                      top: `${(BOCA.cy / ALTO) * 100}%`,
                      width: `${(BOCA.ancho / ANCHO) * 100}%`,
                      height: `${(BOCA.alto / ALTO) * 100}%`,
                      transformOrigin: '50% 0%',
                    }}
                  />

                  {/* PICO-INFERIOR-lámina: baja con el lip-sync (abre en
                      tijera desde la comisura). */}
                  <div className={cls('clv-mandibulaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(MANDIBULA.pivote) }}>
                    <div ref={mandibulaHostRef} className="clv-capa" />
                  </div>

                  {/* PÁRPADOS: parpadeo real con ritmo propio; los dos ojos
                      cierran juntos. El host se reposiciona en el ojo al montar. */}
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
