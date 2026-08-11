/*
 * AgentePlanoTransicion — el CRUCE del agente 3D → AGENTE PLANO (el alma que
 * viaja con usted a la pantalla de la gente).
 *
 * Hoy el túnel Odyssey (TunelLamina 'saliendo') cruza la PANTALLA, pero el
 * compañero no: la criatura 3D muere con el canvas (stopSpeak y chao) y la
 * burbuja/avatar 2D nace aparte, sin puente. Dos almas, un corte seco. Este
 * overlay DOM puro (CERO three, seguro en el bundle base) cierra ese hueco
 * CRONOMETRANDO el viaje del agente con el reloj del túnel (una sola fuente,
 * agentePlanoData ← tunelLaminaData):
 *
 *   posar:  la abeja SIENTE la llamada (brinquito + pulso de aura), ANTICIPA
 *           (se echa atrás, coge impulso) y se CLAVA en barrel roll hacia la
 *           boca del túnel — muere SECA en el mismo instante en que el
 *           destello cubre y el host intercambia pantallas debajo
 *           (momentoCubiertoTunel). Cruza el destello convertida en COMETA
 *           de luz dorada; al revelarse la pantalla plana, la estela se
 *           CONDENSA de vuelta en abeja, frena en arco (doble eje: x e y con
 *           easings distintos), ATERRIZA en el ancla del agente con squash &
 *           stretch, y SE APLANA contra el vidrio: la sombra que decía "yo
 *           floto en un mundo" se funde con ella, una onda recorre el
 *           cristal, y queda hecha el avatar plano. Una sola alma que voló
 *           del mundo 3D al vidrio de su pantalla.
 *   alzar:  el reverso — el avatar se DESPEGA del vidrio (la onda lo suelta,
 *           la sombra vuelve a nacer debajo: recupera volumen), anticipa y
 *           se clava al túnel 'entrando'; cruza como cometa y sale del otro
 *           lado a posarse en su percha del mundo.
 *
 * El tiempo lo manejan timers JS deterministas (nunca `animationend`): el
 * mismo contrato de TransicionMundo/TunelLamina — testeable y a prueba de
 * pestañas en segundo plano. El CSS anima "a ciegas" con las mismas
 * variables (--apt-*). `onPosada` dispara cuando el agente ya está posado y
 * plano (el host revela su avatar real debajo); `onFin` cuando el overlay
 * terminó de fundirse ENCIMA de ese avatar (solape a propósito: cubre el
 * relevo de capas sin hueco).
 *
 * `reduced-motion`: no se monta nada y los callbacks disparan de inmediato
 * (corte digno — el avatar plano simplemente aparece). Tier 'bajo': queda el
 * cruce esencial (dos vuelos + aterrizaje con squash) sin barrel roll, sin
 * cometa y sin onda — el CSS gatea por [data-tier].
 *
 * ── ADOPCIÓN (las 3 líneas del host que persiste, p. ej. App) ──────────────
 *   1. Montar una vez: `<AgentePlanoPuente tier={tier} reducedMotion={rm} />`
 *      en una raíz que sobreviva el cambio de pantalla.
 *   2. Al zarpar del 3D a lo plano (junto al túnel):
 *      `posarAgente({ desde: rectDelCompanero, animo, energia })`.
 *   3. Al volver al mundo: `alzarAgente({ desde: rectDelAvatar, hasta: percha })`.
 *   La señal vive en senalAgentePlano.js; sin `hasta`, el agente aterriza en
 *   la esquina estándar del compAI (destinoFabPorDefecto).
 */
import { useEffect, useMemo, useRef } from 'react';
import ChagraAgentAvatar from '../../components/ChagraAgentAvatar.jsx';
import { relojAgentePlano, varsDeCruce, LADO_VUELO } from './agentePlanoData.js';
import { useCruceAgentePlano, limpiarCruceAgente } from './senalAgentePlano.js';
import './agentePlano.css';

export default function AgentePlanoTransicion({
  sentido = 'posar', // 'posar' (3D → vidrio) | 'alzar' (vidrio → 3D)
  desde = null,
  hasta = null,
  animo = 'sereno',
  energia = 1,
  tier = 'alto',
  reducedMotion = false,
  onPosada = undefined,
  onFin = undefined,
}) {
  const posadaRef = useRef(onPosada);
  const finRef = useRef(onFin);
  useEffect(() => {
    posadaRef.current = onPosada;
    finRef.current = onFin;
  });

  const reloj = useMemo(
    () =>
      relojAgentePlano(
        /** @type {'posar'|'alzar'} */ (sentido),
        /** @type {'alto'|'medio'|'bajo'} */ (tier),
        reducedMotion,
      ),
    [sentido, tier, reducedMotion],
  );

  // La geometría se congela por activación (rect y viewport son un snapshot:
  // un resize a mitad de un cruce de ~2 s no amerita re-coreografía).
  const geo = useMemo(() => {
    const viewport =
      typeof window === 'undefined'
        ? { ancho: 1, alto: 1 }
        : { ancho: window.innerWidth, alto: window.innerHeight };
    return varsDeCruce(desde, hasta, viewport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentido, desde, hasta]);

  useEffect(() => {
    let hechoPosada = false;
    let hechoFin = false;
    const tPosada = setTimeout(() => {
      if (!hechoPosada) {
        hechoPosada = true;
        posadaRef.current?.();
      }
    }, reloj.posada);
    const tFin = setTimeout(() => {
      if (!hechoFin) {
        hechoFin = true;
        finRef.current?.();
      }
    }, reloj.total);
    return () => {
      hechoPosada = true;
      hechoFin = true;
      clearTimeout(tPosada);
      clearTimeout(tFin);
    };
  }, [reloj]);

  if (reducedMotion) return null;

  const estilo = {
    '--apt-x0': `${geo.x0.toFixed(1)}px`,
    '--apt-y0': `${geo.y0.toFixed(1)}px`,
    '--apt-bx': `${geo.bx.toFixed(1)}px`,
    '--apt-by': `${geo.by.toFixed(1)}px`,
    '--apt-dx-ida': `${geo.dxIda.toFixed(1)}px`,
    '--apt-dy-ida': `${geo.dyIda.toFixed(1)}px`,
    '--apt-dx-lleg': `${geo.dxLleg.toFixed(1)}px`,
    '--apt-dy-lleg': `${geo.dyLleg.toFixed(1)}px`,
    '--apt-ang': `${geo.ang.toFixed(1)}deg`,
    '--apt-s1': (geo.ladoPosada / LADO_VUELO).toFixed(3),
    '--apt-ida-ms': `${reloj.ida}ms`,
    '--apt-cometa-ini': `${reloj.cometaIni}ms`,
    '--apt-cometa-ms': `${reloj.cometaMs}ms`,
    '--apt-salida-ms': `${reloj.salida}ms`,
    '--apt-vuelo2-ms': `${reloj.vuelo2Ms}ms`,
    '--apt-aplane-ms': `${reloj.aplaneMs}ms`,
    '--apt-empalme-ms': `${reloj.total - reloj.posada}ms`,
  };

  const conCometa = tier !== 'bajo';
  return (
    <div
      className={`apt apt--${sentido}`}
      data-tier={tier}
      style={estilo}
      aria-hidden="true"
      data-testid="agente-plano-transicion"
    >
      {/* TRAMO IDA: la llamada + el clavado a la boca del túnel. */}
      <div className="apt__ida">
        <span className="apt__pulso" />
        <div className="apt__vuelo">
          <div className="apt__giro">
            <ChagraAgentAvatar
              estado={animo}
              size={LADO_VUELO}
              animo={animo}
              energia={energia}
              animated
              ariaLabel="Compañero de Chagra"
            />
          </div>
        </div>
        <span className="apt__puff" />
      </div>

      {/* EL COMETA: la estela de luz que cruza el destello (el alma en tránsito). */}
      {conCometa && (
        <div className="apt__cometa">
          <span className="apt__estela" />
          <span className="apt__nucleo" />
        </div>
      )}

      {/* TRAMO LLEGADA: condensa, frena en arco, aterriza y (al posar) se
          APLANA contra el vidrio. Doble eje: el nodo exterior lleva la X y el
          interior la Y con easings distintos — la recta se vuelve arco. */}
      <div className="apt__llegada">
        <div className="apt__arcoX">
          <div className="apt__arcoY">
            <span className="apt__sombra" />
            <div className="apt__cuerpo">
              <ChagraAgentAvatar
                estado={animo}
                size={LADO_VUELO}
                animo={animo}
                energia={energia}
                animated
                ariaLabel="Compañero de Chagra"
              />
            </div>
            <span className="apt__onda" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * <AgentePlanoPuente> — el puente que SOBREVIVE al swap de pantallas.
 *
 * Se monta UNA vez en una raíz persistente (App, o la raíz de una vitrina) y
 * escucha la señal (senalAgentePlano). Cuando un host zarpa
 * (`posarAgente(...)` / `alzarAgente(...)`), el puente corre el overlay
 * completo por encima del intercambio de pantallas y limpia la señal al
 * terminar. `onPosada`/`onFin` del host del puente reciben el sentido del
 * cruce (para revelar el avatar plano o la percha del mundo).
 */
export function AgentePlanoPuente({
  tier = 'alto',
  reducedMotion = false,
  onPosada = undefined,
  onFin = undefined,
}) {
  const cruce = useCruceAgentePlano();
  const posadaRef = useRef(onPosada);
  const finRef = useRef(onFin);
  useEffect(() => {
    posadaRef.current = onPosada;
    finRef.current = onFin;
  });

  // Con reduced-motion el overlay no monta, pero el contrato se honra igual:
  // posada y fin disparan de inmediato y la señal queda limpia.
  useEffect(() => {
    if (!cruce || !reducedMotion) return;
    posadaRef.current?.(cruce.sentido);
    finRef.current?.(cruce.sentido);
    limpiarCruceAgente();
  }, [cruce, reducedMotion]);

  if (!cruce || reducedMotion) return null;
  return (
    <AgentePlanoTransicion
      sentido={cruce.sentido}
      desde={cruce.desde}
      hasta={cruce.hasta}
      animo={cruce.animo}
      energia={cruce.energia}
      tier={tier}
      reducedMotion={reducedMotion}
      onPosada={() => posadaRef.current?.(cruce.sentido)}
      onFin={() => {
        finRef.current?.(cruce.sentido);
        limpiarCruceAgente();
      }}
    />
  );
}
