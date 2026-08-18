import { useEffect, useRef, useState } from 'react';
import {
  CARPETA_LAMINA, ARCHIVO_LAMINA, ANCHO, ALTO,
  CABEZA, OREJA_IZQ, OREJA_DER, MANDIBULA, BOCA,
  BRAZO_LAPIZ, BRAZO_BRUJULA, COLA, CUERPO_PIVOTE,
} from './zariguyaLamina/anatomia.js';
import { hornearZariguya, haySoporteCanvas } from './zariguyaLamina/capas.js';
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

/* Pivote del PESO en el suelo, entre las dos patas (px de lámina): el
   esqueleto de PIE carga el peso de una pata a la otra girando desde aquí
   — medido sobre las patas de la lámina (izq x 125-210, der x 290-335,
   contacto y≈425-435). Vive aquí y no en anatomia.js porque no corta capa:
   es un hueso del rig, no una pieza de la piel. */
const PESO_PIVOTE = [230, 430];

/* ═══ DESGUANTE — manos de zarigüeya reales (pedido de Julieta) ═════════════
   La lámina trae guantes blancos tipo Cuphead/Mickey; Julieta pidió manos de
   verdad. NO se redibuja nada: se RETIÑE el blanco-papel del guante al tono
   carne MEDIDO en las patas de la propia lámina (210,180,152 en los deditos),
   conservando tinta, sombreado y lo que la mano sostiene. La matemática es
   PARIDAD copy-paste con `_gate/zariguya-lamina/desguante-proto.mjs`, que la
   verificó offline con sharp: 0 píxeles blanco-guante (L>205) residuales en
   las dos manos, brújula y lápiz intactos.
   Regiones y umbrales MEDIDOS (mismo método de anatomia.js):
   - Mano del lápiz: elipse (60,180) r 52×50 — cubre guante + nudillos que
     caen en la cápsula del antebrazo. El lápiz NO se excluye: su madera
     clara comparte tono con el papel y el matiz carne la respeta (excluirlo
     dejaba un halo blanco de guante pegado al eje, medido en el proto v1).
   - Mano de la brújula: elipse (152,262) r 44×40 — incluye el puño. La CARA
     de la brújula (pergamino, blancos hasta x≈128 y solo sobre y≈266) se
     protege con un semiplano medido con fundido de 3.5px: el borde cae
     dentro de la banda de tinta del contorno del dedo, invisible.
   - Solo píxeles CLAROS (rampa de luminancia 170→210): la tinta del grabado
     y el sombreado quedan intactos — la mano resultante es la MISMA mano,
     desnuda. */
const MANOS_DESNUDAS = [
  { elipse: { cx: 60, cy: 180, rx: 52, ry: 50 }, guarda: null },
  { elipse: { cx: 152, cy: 262, rx: 44, ry: 40 },
    guarda: (x, y) => (y < 266 ? suave(129.5, 133, x) : 1) },
];
/* blanco-papel del guante medido (242,226,198) → carne de las patas. */
const CARNE_F = [210 / 242, 180 / 226, 152 / 198];

function suave(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Retiñe in-place los blancos de guante a carne (bloque paridad del proto). */
function desguantar(d, W, H) {
  for (const { elipse, guarda } of MANOS_DESNUDAS) {
    const { cx, cy, rx, ry } = elipse;
    const x0 = Math.max(0, Math.floor(cx - rx));
    const x1 = Math.min(W - 1, Math.ceil(cx + rx));
    const y0 = Math.max(0, Math.floor(cy - ry));
    const y1 = Math.min(H - 1, Math.ceil(cy + ry));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const rn = Math.hypot((x - cx) / rx, (y - cy) / ry);
        if (rn > 1) continue;
        const i = (y * W + x) * 4;
        if (!d[i + 3]) continue;
        const L = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        let t = suave(170, 210, L) * (1 - suave(0.92, 1, rn));
        if (guarda) t *= guarda(x, y);
        if (!t) continue;
        d[i] *= 1 - t * (1 - CARNE_F[0]);
        d[i + 1] *= 1 - t * (1 - CARNE_F[1]);
        d[i + 2] *= 1 - t * (1 - CARNE_F[2]);
      }
    }
  }
}

/**
 * Aplica el desguante a la lámina cargada y devuelve el lienzo listo para
 * hornear. Defensivo como capas.js: sin Canvas2D real (o canvas tainted)
 * devuelve la imagen tal cual — la lámina plana de respaldo (y el primer
 * fotograma mientras hornea) conserva los guantes, honestamente: sin
 * píxeles no hay retinte posible.
 * @param {HTMLImageElement} img
 * @returns {HTMLImageElement|HTMLCanvasElement}
 */
function desguantarLamina(img) {
  if (!haySoporteCanvas()) return img;
  const cv = document.createElement('canvas');
  cv.width = ANCHO;
  cv.height = ALTO;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, ANCHO, ALTO);
  let im;
  try {
    im = g.getImageData(0, 0, ANCHO, ALTO);
  } catch {
    return img;
  }
  desguantar(im.data, ANCHO, ALTO);
  g.putImageData(im, 0, 0);
  return cv;
}

/**
 * ZariguyaLaminaViva — la LÁMINA aprobada de la zarigüeya (`zariguya.png`,
 * estilo grabado: erguida, lápiz en la mano alzada, brújula en la otra,
 * cola prensil en C) recortada en capas por alfa y montada sobre un rig con
 * la VIDA de Angelita — hermana 1:1 de `JaguarLaminaViva.jsx` (leer su
 * docstring para el porqué del método). Los guantes blancos tipo Mickey de
 * la lámina original se RETIÑEN a manos de zarigüeya reales al hornear
 * (DESGUANTE, pedido de Julieta — ver el bloque arriba).
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
 * QUÉ SÍ ARTICULA: parpadeo real de los dos ojos juntos con ritmo propio
 * (cadencia un poco más pausada que la familia — pedido del operador);
 * mirada por giro de cabeza; orejas que se paran al escuchar; mandíbula con
 * lip-sync sobre la sonrisa abierta; el brazo del lápiz que escribe al
 * pensar; la manito de la brújula con micro-vaivén; la cola prensil que se
 * enrosca y mece; tanatosis (el gag: se hace la muerta un instante, ojos
 * cerrados) y husmeo del idle-cerebro.
 *
 * EL ESQUELETO DE PIE (huesos del rig, no piezas de la piel): además de los
 * pivotes que cortan capa, el rig monta (a) el PESO — un pivote en el suelo
 * entre las patas desde el que todo el cuerpo carga el peso de una pata a la
 * otra, en idle como sway lento y en `caminando` como balanceo al compás del
 * paso — y (b) dos MUÑECAS (pivote en el centro de cada mano) que dan
 * follow-through a lo que sostiene: el lápiz tantea, la brújula se consulta.
 * Amplitudes chicas a propósito (≤2°): la muñeca mueve el codo-costura tan
 * poco como el hombro mueve la mano (misma tolerancia ya gateada).
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
      // DESGUANTE antes de hornear: TODAS las capas (y el inpaint de pecho,
      // que clona del mismo origen) heredan las manos desnudas coherentes.
      const capas = hornearZariguya(desguantarLamina(img), { ancho: ANCHO, altoPx: ALTO });
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
          {/* EL PESO — hueso raíz del esqueleto de pie: gira desde el suelo,
              entre las patas (sway de peso en idle; balanceo al caminar). */}
          <div
            className={cls('zlv-pesoPivote')}
            style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(PESO_PIVOTE) }}
          >
          <div
            className={cls('zlv-cuerpoPivote')}
            style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CUERPO_PIVOTE) }}
          >
            {/* LA COLA PRENSIL — detrás de todo: se enrosca sola en idle. */}
            <div className={cls('zlv-colaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(COLA.pivote) }}>
              <div ref={colaHostRef} className="zlv-capa" />
            </div>

            <div ref={cuerpoHostRef} className="zlv-capa" />

            {/* LA BRÚJULA en la manito contra el pecho — micro-vaivén del
                hombro + MUÑECA que la consulta; el pecho detrás va
                inpaintado (capas.js), no se abre hueco. */}
            <div className={cls('zlv-brazoBrujulaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(BRAZO_BRUJULA.pivote) }}>
              <div className={cls('zlv-munecaBrujulaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf([BRAZO_BRUJULA.guante.cx, BRAZO_BRUJULA.guante.cy]) }}>
                <div ref={brazoBrujulaHostRef} className="zlv-capa" />
              </div>
            </div>

            {/* EL LÁPIZ en la mano alzada — escribe en el aire al pensar;
                la MUÑECA tantea con follow-through. */}
            <div className={cls('zlv-brazoLapizPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(BRAZO_LAPIZ.pivote) }}>
              <div className={cls('zlv-munecaLapizPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf([BRAZO_LAPIZ.guante.cx, BRAZO_LAPIZ.guante.cy]) }}>
                <div ref={brazoLapizHostRef} className="zlv-capa" />
              </div>
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
