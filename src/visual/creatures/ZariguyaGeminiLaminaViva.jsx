import { useEffect, useRef, useState } from 'react';
import {
  CARPETA_LAMINA, ARCHIVO_LAMINA, ANCHO, ALTO,
  CABEZA, OREJA_IZQ, OREJA_DER, MANDIBULA, BOCA,
  BRAZO_LAPIZ, BRAZO_BRUJULA, CUERPO_PIVOTE, CUERPO_VIDA_PIVOTE,
  PARTE_COLA, POSES, ESCUCHA_CICLO, ESCUCHA_PASO_MS, UMBRAL_CLOSEUP,
} from './zariguyaGeminiLamina/anatomia.js';
import { hornearZariguyaGemini } from './zariguyaGeminiLamina/capas.js';
import { useVidaIdle, useRitmoPropio, useMiradaUsted, prefiereQuietud } from './useVidaIdle.js';
import { ZARIGUYA_SLUG } from './zariguyaIdentidad.js';
import './zariguyaGeminiLamina/zariguyaGeminiLamina.css';

/* Estados del contrato de avatar → forma canónica interna (mismo mapa que
   Jaguar/ZariguyaLaminaViva: data-agt-estado viaja crudo para paridad de
   API/accesibilidad; esto solo decide el comportamiento). */
const ESTADO_CANON = {
  idle: 'idle', reposo: 'idle', acompana: 'idle',
  thinking: 'thinking', pensando: 'thinking',
  speaking: 'speaking', respondiendo: 'speaking', hablando: 'speaking',
  listening: 'listening', escuchando: 'listening',
  caminando: 'caminando', walking: 'caminando', anda: 'caminando',
};

/* Apertura de mandíbula por visema (0..1). V1 = 0 → la lámina exacta (que ya
   sonríe con la boca abierta — abrir es abrir MÁS). */
const JAW_DE_VISEMA = { V1: 0, V2: 0.42, V3: 1, V4: 0.36 };

/**
 * ZariguyaGeminiLaminaViva — el SET GEMINI aprobado por el operador
 * (2026-08-23, estilo grabado/tinta naturalista) como CARA VIVA del agente:
 * la HERO (`zariguya-gemini-hero.png`: erguida, lápiz en la pata alzada,
 * brújula en la otra) horneada en capas por alfa sobre el rig lámina-viva de
 * la casa, MÁS las POSES PLENAS del mismo set cuando el estado pide un
 * cuerpo que un solo dibujo no da.
 *
 * DE DÓNDE SALE CADA COSA (reúso, no reinvento):
 *   · El MÉTODO de corte/rig: `JaguarLaminaViva` → `ZariguyaLaminaViva`
 *     (hermana directa; misma matemática de máscaras, mismos pivotes — la
 *     hero Gemini es EL MISMO ENCUADRE que `zariguya.png`, ver
 *     `zariguyaGeminiLamina/anatomia.js` para la herencia medida).
 *   · La VIDA: los MISMOS hooks de Angelita/el jaguar (`useVidaIdle.js`).
 *   · Lo NUEVO del set (esta rama):
 *       - COLA de rig (`rig/cola.png` del despiece aprobado): pieza completa
 *         dibujada aparte → se enrosca con amplitud real (la horneada queda
 *         de respaldo hasta que la pieza carga).
 *       - POSES PLENAS por crossfade: `listening` → ciclo escucha 02→03→04
 *         (o el close-up 01 en avatar chico); `thinking` → ver-lupa;
 *         idle/'tanatosis' → MUERTA (el gag firma, lengua afuera);
 *         idle/'reposo' → de-frente cute; idle/'crias' → LAS CRÍAS AL LOMO
 *         (la firma de identidad como momento OCASIONAL — orden del
 *         operador 2026-08-24: NO en la hero; el host puede forzarla en
 *         momentos positivos vía `vidaForzada='crias'`). Ninguna pose se
 *         inventa: todas son láminas del set aprobado.
 *
 * QUÉ SÍ ARTICULA (en la lámina-rig): parpadeo real de ambos ojos con ritmo
 * propio; mirada por giro de cabeza; orejas que se mecen; mandíbula con
 * lip-sync sobre la sonrisa abierta; el lápiz que gesticula; la cola de rig
 * que SE ENROSCA de verdad; husmeo del idle-cerebro; y al CAMINAR el
 * BAMBOLEO plantígrado portado de la hermana (`.zgl-cuerpoVida`: rock de
 * peso pie-a-pie + cadera + manitos en oposición + cola de contrapeso —
 * las patas traseras no son pieza: la alternancia se LEE del peso que
 * rueda, lección "3-4 patas" del jaguar).
 *
 * HONESTIDAD (lo que el material NO da — no se disfraza):
 *   · Los cambios de pose son CROSSFADE entre dibujos (no interpolación de
 *     esqueleto): un cambio de encuadre honesto, como viñetas.
 *   · El ciclo de escucha son 3 dibujos discretos (02→03→04→03): lee como
 *     "la oreja crece", no como 24fps.
 *   · El interior de boca al abrir MÁS que la lámina es sintético (mismo
 *     trato que el jaguar). Detrás de la pata de la brújula el pecho va
 *     inpaintado con lanilla clonada de la propia lámina.
 *   · Una pose que aún no cargó NO se muestra a medias: se queda la
 *     lámina-rig hasta que el PNG esté listo (peor caso: el primer
 *     listening tarda unos ms en cambiar de cuerpo).
 *
 * DEGRADACIÓN: mientras carga la imagen o sin Canvas2D (jsdom) se muestra
 * la lámina plana — nunca un hueco.
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
 * @param {string|null} [props.vidaForzada]  fuerza un momento de vida
 *   ('husmea'|'tanatosis'|'reposo'|'crias') por encima del idle-cerebro —
 *   para la vitrina de verificación y para gags a demanda del host (solo
 *   pesa en idle, igual que el momento natural). 'crias' es el canal del
 *   momento POSITIVO: al celebrar, el host la fuerza y aparecen las crías.
 * @param {(e: React.MouseEvent) => void} [props.onClick]
 * @param {(e: React.MouseEvent) => void} [props.onDoubleClick]
 */
export default function ZariguyaGeminiLaminaViva({
  estado = 'idle',
  size = 48,
  animated = true,
  className = '',
  style = undefined,
  title = 'Zarigüeya (chucha)',
  visema = null,
  tier = undefined,
  vidaForzada = null,
  onClick = undefined,
  onDoubleClick = undefined,
  ...rest
}) {
  const raizRef = useRef(null);
  const posesRef = useRef(null);
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
  const [colaRigLista, setColaRigLista] = useState(false);
  const [cargadas, setCargadas] = useState({});
  const [tickEscucha, setTickEscucha] = useState(0);

  const canon = ESTADO_CANON[estado] || 'idle';
  const enIdle = canon === 'idle';
  const sizeChico = size < UMBRAL_CLOSEUP;

  // ═══ LA VIDA (los MISMOS hooks de Angelita/el jaguar) ═════════════════════
  const ritmoPropio = useRitmoPropio();
  const activoVida = animated && tier !== 'bajo';
  // Idle-cerebro (husmea/tanatosis/reposo/crias) — SOLO en idle. Aquí husmea
  // vive en la lámina-rig; tanatosis, reposo y crias son POSES PLENAS del set.
  const momentoNatural = useVidaIdle(ZARIGUYA_SLUG, activoVida && enIdle && !vidaForzada);
  // La vida forzada (vitrina/gag a demanda) pesa SOLO en idle, como la natural.
  const momento = enIdle && vidaForzada ? vidaForzada : momentoNatural;
  // La testa sigue al usuario cuando el puntero anda cerca (menos al hablar).
  useMiradaUsted(raizRef, activoVida && canon !== 'speaking');

  // Apertura extra de mandíbula: el visema manda (V1/reposo = lámina exacta).
  const jaw = JAW_DE_VISEMA[visema] ?? 0;

  // ═══ HORNEADO de la hero en capas (idéntico a la lámina hermana) ══════════
  useEffect(() => {
    let vivo = true;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (!vivo) return;
      const capas = hornearZariguyaGemini(img, { ancho: ANCHO, altoPx: ALTO });
      if (!capas || !vivo) return; // sin canvas → se queda en la lámina plana
      const montar = (cv, host) => {
        cv.style.position = 'absolute';
        cv.style.inset = '0';
        cv.style.width = '100%';
        cv.style.height = '100%';
        cv.style.display = 'block';
        host.current?.replaceChildren(cv);
      };
      // La cola HORNEADA se monta de RESPALDO: se apaga cuando la pieza de
      // rig (cola completa, amplitud real) confirma su carga — ver abajo.
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
        cv.className = claseExtra ? `zgl-parpado ${claseExtra}` : 'zgl-parpado';
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
      montarParpado(capas.parpado, parpadoHostRef, 'zgl-parpado-izq');
      montarParpado(capas.parpado2, parpado2HostRef);

      setListo(true);
    };
    img.onerror = () => { /* degrada a la lámina plana; sin crash */ };
    img.src = CARPETA_LAMINA + ARCHIVO_LAMINA;
    return () => { vivo = false; };
  }, [animated]);

  // ═══ POSES: registro de carga (una pose solo entra COMPLETA) ══════════════
  const marcarCargada = (k) => setCargadas((c) => (c[k] ? c : { ...c, [k]: true }));
  useEffect(() => {
    // Barrido post-montaje: imágenes ya en caché disparan load antes de que
    // React cuelgue el listener — `complete` las recoge.
    const nodo = posesRef.current;
    if (!nodo) return;
    for (const img of nodo.querySelectorAll('img[data-pose-key]')) {
      if (img.complete && img.naturalWidth > 0) marcarCargada(img.dataset.poseKey);
    }
  }, []);

  // ═══ EL CICLO DE ESCUCHA (02→03→04→03) — solo cuerpo entero y con vida.
  // El tick NO se resetea al salir: el ciclo es un vaivén sin fotograma
  // "inicial" — re-entrar a mitad de vuelta es tan válido como en 02 (y así
  // el efecto solo administra el interval, sin setState síncrono). ═══
  useEffect(() => {
    if (canon !== 'listening' || !animated || sizeChico || prefiereQuietud()) return undefined;
    const id = setInterval(() => setTickEscucha((t) => t + 1), ESCUCHA_PASO_MS);
    return () => clearInterval(id);
  }, [canon, animated, sizeChico]);

  // ═══ QUÉ POSE PIDE EL ESTADO (null = lámina-rig articulada) ═══════════════
  const poseDeseada = (() => {
    if (canon === 'listening') {
      return sizeChico ? 'escucha-01' : ESCUCHA_CICLO[tickEscucha % ESCUCHA_CICLO.length];
    }
    if (canon === 'thinking') return 'verlupa';
    if (canon === 'idle') {
      if (momento === 'tanatosis') return 'muerta';
      if (momento === 'reposo') return 'cute';
      if (momento === 'crias') return 'crias';
    }
    return null;
  })();
  // Solo se muestra si su PNG ya llegó (honestidad: nunca media pose).
  const pose = poseDeseada && cargadas[poseDeseada] ? poseDeseada : null;
  const modo = pose ? 'pose' : 'lamina';

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
    '--zgl-mira-k': (size / 12).toFixed(2),
    '--zgl-jaw': String(jaw),
    ...ritmoPropio,
    ...style,
  };

  /* La pieza de rig de la cola: caja posicionada en coordenadas de LÁMINA
     (anatomia.PARTE_COLA), pivote de giro en la emergencia de la grupa. */
  const colaRigBox = {
    position: 'absolute',
    left: `${(PARTE_COLA.x / ANCHO) * 100}%`,
    top: `${(PARTE_COLA.y / ALTO) * 100}%`,
    width: `${(PARTE_COLA.w / ANCHO) * 100}%`,
    height: `${(PARTE_COLA.h / ALTO) * 100}%`,
    transformOrigin: `${(((PARTE_COLA.pivote[0]) - PARTE_COLA.x) / PARTE_COLA.w) * 100}% ${(((PARTE_COLA.pivote[1]) - PARTE_COLA.y) / PARTE_COLA.h) * 100}%`,
  };

  const contenedor = (
    <div
      ref={raizRef}
      role="img"
      aria-label={title}
      data-creature={ZARIGUYA_SLUG}
      data-lamina="gemini"
      data-agt-estado={estado}
      data-modo={modo}
      data-pose={pose || undefined}
      data-visema={visema || undefined}
      data-vida={animated && momento ? momento : undefined}
      data-tier={tier || undefined}
      data-quieto={animated ? undefined : 'si'}
      title={title}
      className={className || undefined}
      style={estiloRaiz}
      {...rest}
    >
      <div
        className={cls('zgl-stage')}
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

        {/* ═══ PLANO 1: la LÁMINA-RIG articulada (hero horneada). ═══ */}
        <div className="zgl-lamina" style={{ display: listo ? 'block' : 'none' }}>
          {/* VIDA DE CUERPO al andar — hermano del `.zlv-cuerpoVida` del
              waddle auditado: al CAMINAR corre el BAMBOLEO plantígrado
              (rock de peso pie-a-pie + bob + squash) plantado en los APOYOS
              (anatomia.CUERPO_VIDA_PIVOTE). Envuelve al pivote de respiro/
              cadera para que ambas capas COMPONGAN sin pisarse (mismo truco
              que la cabeza anidada). En idle no anima (CSS). */}
          <div
            className={cls('zgl-cuerpoVida')}
            style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CUERPO_VIDA_PIVOTE) }}
          >
          <div
            className={cls('zgl-cuerpoPivote')}
            style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CUERPO_PIVOTE) }}
          >
            {/* LA COLA — detrás de todo. Pieza de RIG (cola completa del
                despiece aprobado): se enrosca con amplitud real. La horneada
                queda de respaldo hasta que la pieza confirma su carga. */}
            <div
              className={cls('zgl-colaPivote')}
              style={{ position: 'absolute', inset: 0, transformOrigin: pctOf([358, 360]), display: colaRigLista ? 'none' : 'block' }}
            >
              <div ref={colaHostRef} className="zgl-capa" />
            </div>
            <div className={cls('zgl-colaRigPivote')} style={colaRigBox}>
              <img
                src={CARPETA_LAMINA + PARTE_COLA.archivo}
                alt=""
                aria-hidden="true"
                width={PARTE_COLA.W}
                height={PARTE_COLA.H}
                decoding="async"
                onLoad={() => setColaRigLista(true)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: colaRigLista ? 'block' : 'none' }}
              />
            </div>

            <div ref={cuerpoHostRef} className="zgl-capa" />

            {/* LA BRÚJULA en la patita contra el pecho — micro-vaivén; el
                pecho detrás va inpaintado (capas.js), no se abre hueco. */}
            <div className={cls('zgl-brazoBrujulaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(BRAZO_BRUJULA.pivote) }}>
              <div ref={brazoBrujulaHostRef} className="zgl-capa" />
            </div>

            {/* EL LÁPIZ en la pata alzada — gesticula al hablar. */}
            <div className={cls('zgl-brazoLapizPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(BRAZO_LAPIZ.pivote) }}>
              <div ref={brazoLapizHostRef} className="zgl-capa" />
            </div>

            {/* LA CABEZA — tres envoltorios anidados (gesto → mira → idle),
                igual que el jaguar, para que se COMPONGAN sin pisarse. */}
            <div className={cls('zgl-cabezaGesto')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CABEZA.pivote) }}>
              <div className={cls('zgl-cabezaMira')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CABEZA.pivote) }}>
                <div className={cls('zgl-cabezaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CABEZA.pivote) }}>
                  <div ref={cabezaHostRef} className="zgl-capa" />

                  {/* INTERIOR DE BOCA SINTÉTICO (el único píxel no-lámina):
                      detrás de la mandíbula, se revela al abrir MÁS. */}
                  <div
                    className={cls('zgl-bocaInterior')}
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
                  <div className={cls('zgl-mandibulaPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(MANDIBULA.pivote) }}>
                    <div ref={mandibulaHostRef} className="zgl-capa" />
                  </div>

                  {/* OREJAS-lámina: se mecen en idle, acompañan el husmeo. */}
                  <div className={cls('zgl-orejaIzqPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(OREJA_IZQ.pivote) }}>
                    <div ref={orejaIzqHostRef} className="zgl-capa" />
                  </div>
                  <div className={cls('zgl-orejaDerPivote')} style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(OREJA_DER.pivote) }}>
                    <div ref={orejaDerHostRef} className="zgl-capa" />
                  </div>

                  {/* PÁRPADOS: parpadeo real, los dos ojos JUNTOS (vars de
                      ritmo propio en la raíz). */}
                  <div ref={parpadoHostRef} style={{ position: 'absolute' }} />
                  <div ref={parpado2HostRef} style={{ position: 'absolute' }} />
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* ═══ PLANO 2: las POSES PLENAS del set (crossfade). Se montan
            todas de una (precarga temprana); solo la activa se ve. ═══ */}
        <div ref={posesRef} className="zgl-poses" aria-hidden="true">
          {Object.entries(POSES).map(([k, p]) => (
            <img
              key={k}
              data-pose-key={k}
              src={CARPETA_LAMINA + p.archivo}
              alt=""
              className="zgl-pose"
              data-activa={pose === k ? 'si' : undefined}
              width={p.W}
              height={p.H}
              decoding="async"
              onLoad={() => marcarCargada(k)}
            />
          ))}
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
