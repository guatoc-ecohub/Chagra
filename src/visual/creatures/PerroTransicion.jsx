/*
 * PerroTransicion — el CRUCE de capa 3D ↔ 2D de los perros guardianes
 * (Dante el beagle y Oliver el dálmata): el handoff del MOMENTO.
 *
 * Mismo contrato que AbejaTransicion (el molde del cruce de Angelita), con el
 * sentido invertido: aquí el que anticipa es el perro 3D (fase 'alerta' de la
 * escena: se planta y ladra — HatoMovil), y el overlay DOM hace el resto:
 *
 *   'heroe' (3D→2D): el DESTELLO del aura del perro crece sobre su posición
 *            (la anticipación del cruce) → en PERRO_APAGA_3D_MS el flash pica,
 *            este componente dispara la señal 'oculto' (el mesh 3D se apaga
 *            SECO y queda congelado donde está) y del flash BROTA el héroe
 *            dibujado, MÁS GRANDE y con su aura de poder, con overshoot
 *            elástico. Una sola criatura que cambió de piel.
 *   'normal' (2D→1D… no: 2D→3D): el reverso digno — el héroe se RECOGE (la
 *            venia del trabajo cumplido), se encoge hacia el punto del
 *            renacer, y en PERRO_RENACE_3D_MS la figura muere SECA mientras
 *            la señal 'normal' enciende otra vez el perrito 3D en el MISMO
 *            punto donde se transformó. El destello se disuelve.
 *
 * El tiempo lo maneja un TIMER (no `animationend`): determinista, testeable y
 * a prueba de pestañas en segundo plano. ESTE componente es la única fuente
 * del instante del swap: él mismo llama la señal (setModoPerro) — el host solo
 * lo monta y ya quedó cronometrado.
 *
 * `reducedMotion`: cruce instantáneo digno — no se dibuja nada, la señal se
 * dispara al montar y `onFin` de inmediato. Tier 'bajo': queda el swap con
 * fundido simple (sin destello, sin puff, sin overshoot) — gates por
 * [data-tier] en perroTransicion.css.
 *
 * NADA de violencia: esto es un cambio de piel para AVISAR y arrear, no un
 * power-up de pelea.
 */
import { useEffect, useRef } from 'react';
import { Dalmata } from './Dalmata.jsx';
import { Beagle } from './Beagle.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';
import { setModoPerro } from './senalPerrosGuardianes.js';
import './perroTransicion.css';

/** Instante del APAGÓN 3D al ir a héroe (ms desde el montaje + delayMs): el
    destello pica, el mesh se apaga SECO y brota el héroe 2D. */
export const PERRO_APAGA_3D_MS = 460;
/** Vida total del cruce a héroe (deja asentar el overshoot del pop). */
export const PERRO_CRUCE_HEROE_MS = 1150;
/** Instante del RENACER 3D al volver (ms): la figura 2D muere SECA y el
    perrito 3D enciende en el mismo punto. */
export const PERRO_RENACE_3D_MS = 480;
/** Vida total del reverso (corto: la vuelta a la vida normal no se estira). */
export const PERRO_CRUCE_NORMAL_MS = 760;
/** Escalón entre los dos perros (Oliver primero, Dante detrás): dos pops
    simultáneos se leen como un glitch; escalonados, como una pareja. */
export const ESCALON_PERROS_MS = 260;

/* El registro local de las dos formas dibujadas. El héroe es MÁS GRANDE que
   el vecino de a pie (su forma "de trabajo"): px generosos, el host los puede
   pisar con la prop `px`. Oliver alto y atlético; Dante bajito y orejón. */
const PERROS_2D = {
  dalmata: { Comp: Dalmata, px: 170 },
  beagle: { Comp: Beagle, px: 148 },
};

export default function PerroTransicion({
  /** 'dalmata' (Oliver) | 'beagle' (Dante) — también es la clave de la señal. */
  perro = 'dalmata',
  /** 'heroe' (3D se apaga, nace el dibujado) | 'normal' (el reverso). */
  sentido = 'heroe',
  /** Corrimiento de TODO el cronómetro (el escalón de la pareja). */
  delayMs = 0,
  /** Ancla en pantalla del punto de cruce (el host puede proyectar la
      posición real del perro 3D a coords de viewport y pasarla aquí). */
  x = '50%',
  y = '60%',
  tier = 'alto',
  reducedMotion = false,
  /** onFin(perro) al morir el overlay (el host desmonta / avanza fase). */
  onFin,
}) {
  const finRef = useRef(onFin);
  useEffect(() => {
    finRef.current = onFin;
  });

  useEffect(() => {
    const aHeroe = sentido === 'heroe';
    const tSwap = reducedMotion ? 0 : delayMs + (aHeroe ? PERRO_APAGA_3D_MS : PERRO_RENACE_3D_MS);
    const tFin = reducedMotion ? 0 : delayMs + (aHeroe ? PERRO_CRUCE_HEROE_MS : PERRO_CRUCE_NORMAL_MS);
    /* La ÚNICA fuente del instante del swap: la señal cruza al canvas y
       HatoMovil apaga/enciende el mesh. Con reducedMotion, al montar. */
    const t1 = setTimeout(() => setModoPerro(perro, aHeroe ? 'oculto' : 'normal'), tSwap);
    let hecho = false;
    const t2 = setTimeout(() => {
      if (!hecho) {
        hecho = true;
        finRef.current?.(perro);
      }
    }, tFin);
    return () => {
      hecho = true;
      clearTimeout(t1);
      clearTimeout(t2);
      /* OJO: el cleanup NO revierte la señal (un desmonte a mitad de vuelo no
         debe teletransportar el mesh). El dueño de la escena resetea:
         MomentoGuardianes llama resetPerrosGuardianes() al cerrar. */
    };
  }, [perro, sentido, delayMs, reducedMotion]);

  if (reducedMotion) return null;

  const reg = PERROS_2D[perro] || PERROS_2D.dalmata;
  const { Comp, px } = reg;
  const aura = auraDeBicho(perro);
  const delay = delayMs ? `${delayMs}ms` : undefined;
  const delayPuff = `${delayMs + (sentido === 'heroe' ? PERRO_APAGA_3D_MS : PERRO_RENACE_3D_MS)}ms`;

  return (
    <div
      className={`perro-cruce perro-cruce--${sentido}`}
      data-tier={tier}
      data-perro={perro}
      aria-hidden="true"
    >
      <div
        className="perro-cruce__pos"
        style={{ '--px': x, '--py': y, '--aura-color': aura }}
      >
        {/* el DESTELLO del aura: la anticipación del cruce sobre el perro 3D
            (a héroe) o el brillo que lo recoge (a normal) */}
        <span className="perro-cruce__destello" style={{ animationDelay: delay }} />
        {/* el anillo que revienta en el instante EXACTO del swap (vende el
            "pop" del cambio de capa — calca del puff de la abeja) */}
        <span className="perro-cruce__puff" style={{ animationDelay: delayPuff }} />
        {/* la figura dibujada: nace del flash (heroe) o se recoge y muere
            seca en el renacer (normal). El aura de poder de 4 capas es la
            de su bicho (cobalto Oliver, canela Dante). */}
        <div className="perro-cruce__figura" style={{ animationDelay: delay }}>
          <span
            className="is-powered-up perro-cruce__poder"
            data-creature-poder={perro}
            style={{ display: 'inline-flex' }}
          >
            <Comp
              size={px}
              animated
              tier={tier}
              vida={false}
              menea={perro === 'dalmata'}
            />
            {tier !== 'bajo' && <AuraPoder />}
          </span>
        </div>
      </div>
    </div>
  );
}
