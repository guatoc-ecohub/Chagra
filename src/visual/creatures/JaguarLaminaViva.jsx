import { useEffect, useRef, useState } from 'react';
import {
  CARPETA_LAMINA, ARCHIVO_LAMINA, ANCHO, ALTO,
  CABEZA, COLA, CUERPO_PIVOTE,
  OREJA_IZQ, OREJA_DER, MANDIBULA, BOCA,
  CARPETA_RIG, CAPAS_RIG, RIG_MARCHA,
} from './jaguarLamina/anatomia.js';
import { hornearJaguar } from './jaguarLamina/capas.js';
import { periodoMarcha, poseMarcha } from './jaguarLamina/marcha.js';
import { useVidaIdle, useRitmoPropio, useMiradaUsted, prefiereQuietud } from './useVidaIdle.js';
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

/* Rampa de entrada a la marcha (s): mezcla reposo→ciclo para que arrancar a
   andar no dé tirón (la salida la suaviza la transición CSS al limpiar vars). */
const RAMPA_MARCHA_S = 0.4;

/* Vars CSS que escribe el motor de marcha (se limpian al salir). */
const VARS_MARCHA = ['--jlv-anda-bob', '--jlv-anda-paso'].concat(
  Object.keys(RIG_MARCHA).flatMap((clave) => [
    `--jlv-anda-${clave}-cadera`, `--jlv-anda-${clave}-rodilla`,
  ]),
);

/**
 * JaguarLaminaViva — la LÁMINA real de Humboldt (`jaguar-natural.png`)
 * ensamblada sobre el set de capas 2.5D del rig, con la VIDA de Angelita
 * (`agente/Angelita.jsx`) Y una MARCHA cuadrúpeda real por-pata.
 *
 * DE DÓNDE SALE CADA COSA (reúso, no reinvento):
 *   · La PIEL: capas PRE-CORTADAS del set de arte (`jaguar-rig/`:
 *     cuerpo-inpaint SIN patas + 3 patas con alfa propio) + cortes por alfa
 *     de la lámina con las rectas medidas (`capas.js`/`anatomia.js`): cabeza
 *     face-safe, cola, pata delantera naranja. Base sin patas ⇒ EXACTAMENTE
 *     4 patas montadas — el fantasma "3-4 patas" del corte-por-color no
 *     puede volver (su filo compartido ya no existe).
 *   · La MARCHA (`jaguarLamina/marcha.js`): ciclo cuadrúpedo en secuencia
 *     lateral con pisada ANCLADA (el período se deriva de la velocidad real
 *     de pantalla — `useCompaiRoam` desplaza a 34 px/s — para que el pie
 *     apoyado quede clavado, cero moonwalk) + IK analítico de 2 huesos por
 *     pata (articulación→rodilla→pie, puntos medidos): cada pata son DOS
 *     segmentos rígidos que rotan por hueso — doblan por la rodilla, nunca
 *     se estiran ni deforman. El motor rAF escribe la pose como vars CSS
 *     (cero re-render por frame, mismo patrón que useMiradaUsted).
 *   · La VIDA: los MISMOS hooks que usa la abeja Angelita y los 8 bichos
 *     rubber-hose (`useVidaIdle.js`): useRitmoPropio (parpadeo a su aire),
 *     useVidaIdle (idle-cerebro acecha/ruge/reposo), useMiradaUsted (la
 *     cabeza sigue el puntero), visema (prop, el host corre useLipSync).
 *
 * HONESTIDAD (lo que el dibujo plano NO da — no se disfraza):
 *   · BOCA ABIERTA: la lámina es un retrato de BOCA CERRADA. El hueco al
 *     bajar la mandíbula lo tapa un INTERIOR SINTÉTICO (`.jlv-bocaInterior`,
 *     el ÚNICO píxel que no sale de los PNG del set).
 *   · PUPILA: la mirada es GIRO DE CABEZA (recortar la pupila obligaría a
 *     repintar el iris que destapa — prohibido).
 *   · Piezas COMPLETADAS offline (garra blanca por espejo, muslo lejano
 *     sintético): documentadas en el NOTAS.md del set de arte.
 *
 * DEGRADACIÓN: mientras las imágenes cargan, o si falta Canvas2D (jsdom de
 * los tests) o alguna de las 5 imágenes, se muestra la lámina PLANA — nunca
 * un hueco.
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
 * @param {number} [props.velocidadPxS=34]  px/s del desplazamiento real del
 *   host mientras `estado='caminando'` (default = PX_POR_SEG de
 *   useCompaiRoam): ancla la pisada a la velocidad de pantalla.
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
  velocidadPxS = 34,
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
  const colaHostRef = useRef(null);
  const parpadoHostRef = useRef(null);
  const parpado2HostRef = useRef(null);
  // Hosts de los 8 segmentos de pata (4 patas × superior/inferior), por clave.
  const patasHostsRef = useRef({});
  const [listo, setListo] = useState(false);

  const canon = ESTADO_CANON[estado] || 'idle';
  const enIdle = canon === 'idle';
  const andando = canon === 'caminando';

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
    const cargar = (src) => new Promise((resolver) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolver(img);
      img.onerror = () => resolver(null); // degrada a la lámina plana; sin crash
      img.src = src;
    });
    Promise.all([
      cargar(CARPETA_LAMINA + ARCHIVO_LAMINA),
      cargar(CARPETA_RIG + CAPAS_RIG.cuerpo),
      cargar(CARPETA_RIG + CAPAS_RIG.delLejana),
      cargar(CARPETA_RIG + CAPAS_RIG.trasCercana),
      cargar(CARPETA_RIG + CAPAS_RIG.trasLejana),
    ]).then(([lamina, cuerpo, delLejana, trasCercana, trasLejana]) => {
      if (!vivo) return;
      const capas = hornearJaguar(
        { lamina, cuerpo, delLejana, trasCercana, trasLejana },
        { ancho: ANCHO, altoPx: ALTO },
      );
      if (!capas || !vivo) return; // sin soporte/imagen → se queda en la lámina plana
      const montar = (cv, host) => {
        cv.style.position = 'absolute';
        cv.style.inset = '0';
        cv.style.width = '100%';
        cv.style.height = '100%';
        cv.style.display = 'block';
        if (host) host.replaceChildren(cv);
      };
      montar(capas.cuerpo, cuerpoHostRef.current);
      montar(capas.cola, colaHostRef.current);
      montar(capas.cabeza, cabezaHostRef.current);
      montar(capas.orejaIzq, orejaIzqHostRef.current);
      montar(capas.orejaDer, orejaDerHostRef.current);
      montar(capas.mandibula, mandibulaHostRef.current);
      for (const clave of Object.keys(RIG_MARCHA)) {
        montar(capas.patas[clave].superior, patasHostsRef.current[`${clave}-sup`]);
        montar(capas.patas[clave].inferior, patasHostsRef.current[`${clave}-inf`]);
      }

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
    });
    return () => { vivo = false; };
  }, [animated]);

  const aspecto = ANCHO / ALTO;
  const anchoStage = aspecto >= 1 ? size : size * aspecto;
  const altoStage = aspecto >= 1 ? size / aspecto : size;

  // ═══ EL MOTOR DE MARCHA (rAF → vars CSS; cero re-render por frame) ════════
  useEffect(() => {
    const raiz = raizRef.current;
    if (!raiz) return undefined;
    const limpiar = () => { for (const v of VARS_MARCHA) raiz.style.removeProperty(v); };
    if (!animated || !listo || !andando || prefiereQuietud()) {
      limpiar();
      return undefined;
    }
    const escala = anchoStage / ANCHO;
    const T = periodoMarcha(escala, velocidadPxS);
    // El paso (medio ciclo) sincroniza el cabeceo CSS de la testa con las patas.
    raiz.style.setProperty('--jlv-anda-paso', `${(T / 2).toFixed(3)}s`);
    let raf = 0;
    let t0 = 0;
    const paso = (ahora) => {
      if (!t0) t0 = ahora;
      const t = (ahora - t0) / 1000;
      const pose = poseMarcha(t, T, Math.min(1, t / RAMPA_MARCHA_S));
      raiz.style.setProperty('--jlv-anda-bob', `${(pose.bob * escala).toFixed(2)}px`);
      for (const [clave, ang] of Object.entries(pose.patas)) {
        raiz.style.setProperty(`--jlv-anda-${clave}-cadera`, `${ang.cadera.toFixed(2)}deg`);
        raiz.style.setProperty(`--jlv-anda-${clave}-rodilla`, `${ang.rodilla.toFixed(2)}deg`);
      }
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => {
      cancelAnimationFrame(raf);
      limpiar(); // la transición CSS (fuera de marcha) suaviza la vuelta al reposo
    };
  }, [andando, animated, listo, anchoStage, velocidadPxS]);

  /** @param {number[]} punto  → "x% y%" para transform-origin. */
  const pctOf = (punto) => `${(punto[0] / ANCHO) * 100}% ${(punto[1] / ALTO) * 100}%`;
  const cls = (c) => (animated ? c : undefined);

  /* Una pata = masa (bob compartido) > pivote de cadera (rota por hueso) >
     [segmento superior, pivote de rodilla > segmento inferior]. La rodilla
     va ANIDADA en la cadera: cadena FK estándar — rotar piezas rígidas por
     hueso dobla la pata sin estirarla ni deformarla. */
  const renderPata = (clave) => {
    const rig = RIG_MARCHA[clave];
    return (
      <div className="jlv-masa">
        <div
          className={cls('jlv-pataPivote')}
          data-pata={clave}
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: pctOf(rig.articulacion),
            transform: `rotate(var(--jlv-anda-${clave}-cadera, 0deg))`,
          }}
        >
          <div
            ref={(el) => { patasHostsRef.current[`${clave}-sup`] = el; }}
            className="jlv-capa"
          />
          <div
            className={cls('jlv-rodillaPivote')}
            style={{
              position: 'absolute',
              inset: 0,
              transformOrigin: pctOf(rig.rodilla),
              transform: `rotate(var(--jlv-anda-${clave}-rodilla, 0deg))`,
            }}
          >
            <div
              ref={(el) => { patasHostsRef.current[`${clave}-inf`] = el; }}
              className="jlv-capa"
            />
          </div>
        </div>
      </div>
    );
  };

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
      data-anda={animated && andando ? '' : undefined}
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
            (jsdom de los tests) y mientras las imágenes cargan. */}
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
        {/* El ensamble, en el orden Z del set de arte (NOTAS.md): la trasera
            lejana DETRÁS del cuerpo (se ve por la ventana del muslo), y la
            naranja + cabeza encima de todo. */}
        <div style={{ position: 'absolute', inset: 0, display: listo ? 'block' : 'none' }}>
          {renderPata('trasLejana')}

          <div className="jlv-masa">
            <div
              className={cls('jlv-cuerpoPivote')}
              style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(CUERPO_PIVOTE) }}
            >
              <div ref={cuerpoHostRef} className="jlv-capa" />
            </div>
          </div>

          {renderPata('delLejana')}
          {renderPata('trasCercana')}

          <div className="jlv-masa">
            <div
              className={cls('jlv-colaPivote')}
              style={{ position: 'absolute', inset: 0, transformOrigin: pctOf(COLA.pivote) }}
            >
              <div ref={colaHostRef} className="jlv-capa" />
            </div>
          </div>

          {renderPata('delCercana')}

          {/* LA CABEZA — tres envoltorios anidados: gesto (acecho/rugido/
              estado) → mira (giro hacia el usuario) → bob (cabeceo del paso).
              Así los tres se COMPONEN sin pisarse (cada uno su transform). */}
          <div className="jlv-masa">
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
