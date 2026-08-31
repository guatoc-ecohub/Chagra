import { useEffect, useRef, useState } from 'react';
import {
  CARPETA_LAMINA, ARCHIVO_LAMINA, ANCHO, ALTO,
  CABEZA, PATAS_DEL, PATA_TRASERA, COLA, CUERPO_PIVOTE,
  OREJA_IZQ, OREJA_DER, MANDIBULA, BOCA,
} from './jaguarLamina/anatomia.js';
import { hornearJaguar } from './jaguarLamina/capas.js';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import './jaguarLamina/jaguarLamina.css';

const JAGUAR_SLUG = 'jaguar';

/* Estados del contrato de avatar → forma canónica interna. El host escribe
   'idle'|'thinking'|'speaking'|'listening' (o 'caminando' para andar); esto
   los normaliza para decidir el COMPORTAMIENTO (el atributo data-agt-estado
   viaja crudo, para paridad de API/accesibilidad y para que los tests y el
   host lo lean tal cual). */
const ESTADO_CANON = {
  idle: 'idle', reposo: 'idle', acompana: 'idle',
  thinking: 'thinking', pensando: 'thinking',
  speaking: 'speaking', respondiendo: 'speaking', hablando: 'speaking',
  listening: 'listening', escuchando: 'listening',
  caminando: 'caminando', walking: 'caminando', anda: 'caminando',
};

/* Nivel de apertura de la mandíbula por visema (0..1) — alimenta el lip-sync:
   la mandíbula-lámina baja y el interior sintético se revela en ese grado.
   V1 (cerrada) = 0 → se ve EXACTO como la lámina aprobada (boca cerrada). */
const JAW_DE_VISEMA = { V1: 0, V2: 0.42, V3: 1, V4: 0.36 };

/**
 * JaguarLaminaViva — la LÁMINA real de Humboldt (`jaguar-natural.png`)
 * recortada en capas por alfa y montada sobre un rig, PERO ahora con la VIDA
 * de Angelita (`agente/Angelita.jsx`), no un loop de marcha.
 *
 * DE DÓNDE SALE CADA COSA (reúso, no reinvento):
 *   · La PIEL y el corte por alfa: `jaguarLamina/capas.js` + `anatomia.js`
 *     (`feat/jaguar-pulido`, aprobado por el operador). Esta rama SOLO agrega
 *     tres piezas que la vida necesita y el corte no separaba: las dos OREJAS
 *     y la MANDÍBULA.
 *   · La VIDA: los MISMOS hooks que usa la abeja Angelita y los 8 bichos
 *     rubber-hose (ver `Jaguar.jsx`, `useVidaIdle.js`):
 *       - `useRitmoPropio()`  → cada instancia parpadea a SU aire (vars
 *         --rh-blink-dur/-delay; sin esto todos parpadean como metrónomo).
 *       - `useVidaIdle('jaguar', …)` → el idle-cerebro: un reloj con jitter
 *         hojea el repertorio del jaguar (vidaEstados.js: acecha/ruge/reposo)
 *         — EXISTE aunque nadie le hable. Viaja como `data-vida`.
 *       - `useMiradaUsted(raíz, …)` → la cabeza SIGUE su puntero/dedo cuando
 *         anda cerca (data-rh-mira + vars --rh-mx/--rh-my) y lo suelta a ~2s.
 *       - `visema` (prop, el host corre `useLipSync` y lo pasa, igual que a
 *         Angelita y a `Jaguar.jsx`) → mueve la mandíbula al hablar.
 *   · El ESTADO conversacional (idle/thinking/speaking/listening) actúa con el
 *     cuerpo por CSS (jaguarLamina.css): escuchando PARA LA OREJA e inclina la
 *     testa; hablando mueve la mandíbula; pensando mira arriba; idle vive.
 *
 * QUÉ SÍ ARTICULA (verificable con GPU por el operador): parpadeo real de los
 * dos ojos juntos con ritmo propio (cadencia rh, como Angelita); mirada que sigue al
 * usuario (giro de cabeza — ver la nota de honestidad de la pupila abajo);
 * orejas que se paran al escuchar y se mecen en idle; mandíbula que baja con
 * el lip-sync; gestos de vida (acecho, bostezo/rugido) que agachan/levantan la
 * testa y mueven orejas y cola; cola de contrapeso; respiración en reposo.
 *
 * HONESTIDAD (lo que el dibujo plano NO da — no se disfraza):
 *   · BOCA ABIERTA: la lámina es un retrato de BOCA CERRADA. Al bajar la
 *     mandíbula-pieza se abre un hueco y detrás NO hay píxeles de fauces. Ese
 *     hueco lo tapa un INTERIOR DE BOCA SINTÉTICO (`.jlv-bocaInterior`, el
 *     ÚNICO píxel que no sale del PNG). Lee como "hablando" a tamaño de
 *     avatar, pero para una boca abierta 100% fiel al trazo de Humboldt haría
 *     falta un dibujito de fauces del operador (las láminas `jaguar-actuando`/
 *     `jaguar-gesto` tienen boca abierta pero en estilo caricatura — no pegan
 *     con esta cabeza realista).
 *   · PUPILA: en la lámina la pupila es un punto oscuro DENTRO del iris ámbar;
 *     recortarla y moverla dejaría un hueco (habría que REPINTAR el iris que
 *     destapa, prohibido). Así que la mirada se hace con GIRO DE CABEZA (más
 *     creíble en una cara realista que un desplazamiento de 1px de pupila) —
 *     la pupila NO se mueve suelta. Documentado, no inventado.
 *
 * DEGRADACIÓN: mientras la imagen carga, o si el navegador no hornea canvas 2D
 * (jsdom de los tests), se muestra la lámina PLANA — nunca un hueco.
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
 *   corre y lo pasa) — mueve la mandíbula al hablar.
 * @param {string} [props.tier]  'bajo' apaga el idle-cerebro y la mirada.
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
  const patasDelHostRef = useRef(null);
  const pataTrasHostRef = useRef(null);
  const colaHostRef = useRef(null);
  const parpadoHostRef = useRef(null);
  const parpado2HostRef = useRef(null);
  const [listo, setListo] = useState(false);

  const canon = ESTADO_CANON[estado] || 'idle';
  const enIdle = canon === 'idle';

  // ═══ LA VIDA (los MISMOS hooks de Angelita/los 8 bichos) ══════════════════
  // Ritmo propio (parpadeo/guiño por instancia): vars CSS en la raíz.
  const ritmoPropio = useRitmoPropio();
  // Idle-cerebro del jaguar (acecha/ruge/reposo) — SOLO en idle: cuando el host
  // dirige (escuchando/hablando/pensando/andando) manda el estado, no el idle.
  const activoVida = animated && tier !== 'bajo';
  const momento = useVidaIdle('jaguar', activoVida && enIdle);
  // La cabeza sigue al usuario cuando su puntero anda cerca (menos al hablar:
  // ahí atiende de frente). Setea data-rh-mira + --rh-mx/--rh-my en la raíz.
  useMiradaUsted(raizRef, activoVida && canon !== 'speaking');

  // Apertura de mandíbula: el visema manda; ruge (bostezo) la abre del todo.
  const jaw = momento === 'ruge' ? 1 : (JAW_DE_VISEMA[visema] ?? 0);

  useEffect(() => {
    let vivo = true;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (!vivo) return;
      const capas = hornearJaguar(img, { ancho: ANCHO, altoPx: ALTO });
      if (!capas || !vivo) return; // sin soporte de canvas → se queda en la lámina plana
      const capaCompleta = (cv) => {
        cv.style.position = 'absolute';
        cv.style.inset = '0';
        cv.style.width = '100%';
        cv.style.height = '100%';
        cv.style.display = 'block';
      };
      const montar = (cv, host) => { capaCompleta(cv); host.current?.replaceChildren(cv); };
      montar(capas.cuerpo, cuerpoHostRef);
      montar(capas.cabeza, cabezaHostRef);
      montar(capas.orejaIzq, orejaIzqHostRef);
      montar(capas.orejaDer, orejaDerHostRef);
      montar(capas.mandibula, mandibulaHostRef);
      montar(capas.patasDel, patasDelHostRef);
      montar(capas.pataTrasera, pataTrasHostRef);
      montar(capas.cola, colaHostRef);

      /* Monta un parche de párpado horneado (`{cv,x0,y0,w,h}`): el HOST se
         posiciona EN EL OJO (no inset:0) para que el guiño escale alrededor del
         ojo; el canvas llena el host y lleva el parpadeo. */
      const montarParpado = (parche, host, claseExtra) => {
        const cv = parche.cv;
        cv.className = claseExtra ? `jlv-parpado ${claseExtra}` : 'jlv-parpado';
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
      // Los dos ojos comparten el mismo ritmo (vars en la raíz) → parpadean
      // JUNTOS (parpadeo real, cadencia rh — ver jaguarLamina.css jlv-blink).
      montarParpado(capas.parpado, parpadoHostRef, 'jlv-parpado-der');
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

  // La mirada escala con el tamaño (px del hook × factor); el interior de boca
  // y el nivel de apertura viajan como vars que el CSS consume.
  const estiloRaiz = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    '--jlv-mira-k': (size / 12).toFixed(2),
    '--jlv-jaw': String(jaw),
    ...ritmoPropio,
    ...style,
  };

  const contenedor = (
    <div
      ref={raizRef}
      role="img"
      aria-label={title}
      data-creature={JAGUAR_SLUG}
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
        className={cls('jlv-stage')}
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
            className={cls('jlv-cuerpoPivote')}
            style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CUERPO_PIVOTE) }}
          >
            <div ref={cuerpoHostRef} className="jlv-capa" />

            {/* PATAS DELANTERAS — un SOLO bloque (sin corte interno que
                fantasmee "3-4 patas"): balanceo sutil sincronizado con el bob. */}
            <div className={cls('jlv-patasDelPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(PATAS_DEL.pivote) }}>
              <div ref={patasDelHostRef} className="jlv-capa" />
            </div>
            <div className={cls('jlv-pataTrasPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(PATA_TRASERA.pivote) }}>
              <div ref={pataTrasHostRef} className="jlv-capa" />
            </div>
            <div className={cls('jlv-colaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(COLA.pivote) }}>
              <div ref={colaHostRef} className="jlv-capa" />
            </div>

            {/* LA CABEZA — tres envoltorios anidados: gesto (acecho/rugido/
                estado) → mira (giro hacia el usuario) → bob (cabeceo del paso).
                Así los tres se COMPONEN sin pisarse (cada uno su transform). */}
            <div className={cls('jlv-cabezaGesto')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CABEZA.pivote) }}>
              <div className={cls('jlv-cabezaMira')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CABEZA.pivote) }}>
                <div className={cls('jlv-cabezaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CABEZA.pivote) }}>
                  <div ref={cabezaHostRef} className="jlv-capa" />

                  {/* INTERIOR DE BOCA SINTÉTICO (el único píxel no-lámina):
                      detrás de la mandíbula, se revela cuando ésta baja. */}
                  <div
                    className={cls('jlv-bocaInterior')}
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: `${((BOCA.cx - BOCA.ancho / 2) / ANCHO) * 100}%`,
                      top: `${(BOCA.cy / ALTO) * 100}%`,
                      width: `${(BOCA.ancho / ANCHO) * 100}%`,
                      height: `${((BOCA.ancho * 0.66) / ALTO) * 100}%`,
                      transformOrigin: '50% 0%',
                    }}
                  />

                  {/* MANDÍBULA-lámina: baja con el lip-sync / el bostezo. */}
                  <div className={cls('jlv-mandibulaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(MANDIBULA.pivote) }}>
                    <div ref={mandibulaHostRef} className="jlv-capa" />
                  </div>

                  {/* OREJAS-lámina: se paran al escuchar, se mecen en idle. */}
                  <div className={cls('jlv-orejaIzqPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(OREJA_IZQ.pivote) }}>
                    <div ref={orejaIzqHostRef} className="jlv-capa" />
                  </div>
                  <div className={cls('jlv-orejaDerPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(OREJA_DER.pivote) }}>
                    <div ref={orejaDerHostRef} className="jlv-capa" />
                  </div>

                  {/* PÁRPADOS: parpadeo real con ritmo propio; los dos ojos
                      cierran juntos y el ojo central pica el ojo (guiño) de vez
                      en cuando. El host se reposiciona en el ojo al montar. */}
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
