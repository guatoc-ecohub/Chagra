/*
 * AbejaTransicion — el CRUCE de capa 2D → 3D de Angelita (el handoff).
 *
 * Hoy el viaje del host (TransicionMundo) deja a la abeja 2D en el centro de la
 * pantalla y, al montar el mundo, el mesh (useEntradaAbeja) aparecía en su
 * percha SIN puente: dos abejas, ninguna continuidad. Este overlay DOM puro
 * (CERO three, seguro en el bundle base) cierra ese hueco CRONOMETRANDO el
 * cruce con la coreografía del mesh:
 *
 *   entrar:  la 2D retoma donde el velo la soltó → ANTICIPA (se echa atrás,
 *            coge impulso) → se CLAVA en barrel roll hacia el punto de atrape
 *            (centro, ~36% de alto) encogiéndose → se apaga SECA en
 *            CRUCE_ATRAPA_MS — el instante EXACTO en que el mesh de
 *            useEntradaAbeja nace alto sobre el foco y baja en picada a su
 *            percha. Una sola abeja que voló de la capa DOM al mundo 3D.
 *   volver:  el reverso corto — brota chiquita del punto de atrape (el mundo
 *            "la soltó") y crece hacia usted, fundiéndose donde el velo del
 *            viaje del host la recoge con su propia abeja.
 *
 * El tiempo lo maneja un timer (no `animationend`): determinista, testeable y
 * a prueba de pestañas en segundo plano (mismo contrato que TransicionMundo).
 * `reduced-motion`: el que monta ya lo salta (cruce instantáneo); si llega
 * montado igual, llama `onFin` de inmediato y el CSS no dibuja nada.
 * Device-tier 'bajo': queda el cruce simple (posición + timing) sin barrel
 * roll ni puff — el CSS gatea por [data-tier].
 *
 * ── CABLEADO EN EL HOST (Mundo.jsx / quien navega) — para Opus ──────────────
 * El lado MESH ya es AUTÓNOMO: al montar una escena, `useEntradaAbeja` corre el
 * cruce de ENTRADA solo (nace oculta y aparece en CRUCE_ATRAPA_MS). Falta solo
 * el overlay 2D y la señal de vuelta, dos puntos:
 *
 *   1. ENTRAR — dentro del `<Suspense>` de Mundo.jsx, HERMANO de la escena
 *      perezosa: `<AlMontarEscena onMonta={() => setCruce('entrar')} />`. Con
 *      `cruce === 'entrar'` el host monta `<AbejaTransicion sentido="entrar"
 *      tier={tier} reducedMotion={rm} onFin={() => setCruce(null)} />` como
 *      overlay del contenedor del mundo (posición absoluta sobre el canvas).
 *      Con `reducedMotion` NO montar nada (el mesh ya aparece al instante).
 *   2. VOLVER — cuando la navegación pasa a 'regresando' (volverAlValle, SIN
 *      reducedMotion): llamar `avisarSalidaAbeja()` (el mesh vuela al punto de
 *      suelta y se apaga en CRUCE_SUELTA_MS) y montar `<AbejaTransicion
 *      sentido="volver" …/>` en el mismo instante — el overlay brota de ese
 *      mismo punto ~100 ms después: empalme de capas. La señal se auto-resetea
 *      al montar la siguiente escena (no hay que limpiarla a mano).
 *
 * ── GENERALIZACIÓN A OTROS BICHOS (props `criatura` / `size`) ───────────────
 * La coreografía CSS (`.abeja-cruce*`, creatures.css ~525-633) es genérica —
 * anticipación, barrel roll, atrape — nada de ella asume que el dibujo sea
 * una abeja. `criatura` (nodo o función `(props) => ReactNode`) deja que
 * CUALQUIER bicho del roster (Jaguar, OsoAndino…) reuse este mismo cruce sin
 * duplicar el componente; default = sigue siendo `<AbejaAngelita>` (retro-
 * compatible con los 2 consumidores actuales, que no pasan la prop). `size`
 * agranda el bicho en TODO el recorrido (default subido de 76 a 88 — pedido
 * del operador; las keyframes ya escalan por `scale()` sobre este tamaño
 * base, así que no hace falta tocar ni un valor de creatures.css).
 */
import { useEffect, useRef } from 'react';
import { AbejaAngelita } from './AbejaAngelita.jsx';
import './creatures.css';

/** Instante del ATRAPE (ms): la 2D se apaga y el mesh aparece. La coreografía
    del mesh (useEntradaAbeja) importa ESTA constante — una sola fuente. */
export const CRUCE_ATRAPA_MS = 760;
/** Vida total del overlay al entrar (deja terminar el puff del atrape). */
export const CRUCE_ENTRAR_MS = 980;
/** Vida del reverso al volver (corto: la vuelta no debe sentirse lenta). */
export const CRUCE_VOLVER_MS = 620;
/** Instante de la SUELTA al volver (ms desde `avisarSalidaAbeja()`): el mesh
    vuela hacia el punto de suelta y se APAGA aquí, cuando el overlay 'volver'
    (que el host monta en el mismo instante) ya brotó (~100 ms). El pequeño
    solape es a propósito: cubre el relevo de capas sin hueco. */
export const CRUCE_SUELTA_MS = 180;
/* La SEÑAL de salida (avisarSalidaAbeja / useSalidaAbeja) vive en
   `senalSalidaAbeja.js` — módulo propio para que este archivo de componentes
   quede fast-refresh-limpio. */

/**
 * Centinela de montaje: se coloca DENTRO del `<Suspense>` junto a la escena
 * perezosa — Suspense revela a todos los hijos juntos, así que su `useEffect`
 * dispara exactamente cuando el chunk 3D resolvió y la escena montó. Es lo que
 * permite arrancar el cruce sincronizado con el nacimiento del mesh (y no con
 * un chunk que quizá sigue bajando con la señal del campo).
 */
export function AlMontarEscena({ onMonta }) {
  const cb = useRef(onMonta);
  useEffect(() => {
    cb.current?.();
  }, []);
  return null;
}

export default function AbejaTransicion({
  sentido = 'entrar', // 'entrar' (2D se clava al mundo) | 'volver' (brota del mundo)
  animo = 'sereno',
  energia = 1,
  tier = 'alto',
  reducedMotion = false,
  size = 88, // tamaño base del bicho (px) — sube uniformemente por todo el cruce
  criatura, // nodo o (props) => ReactNode: reemplaza a AbejaAngelita (default abajo)
  onFin,
}) {
  const finRef = useRef(onFin);
  useEffect(() => {
    finRef.current = onFin;
  });

  useEffect(() => {
    let hecho = false;
    const dura = sentido === 'entrar' ? CRUCE_ENTRAR_MS : CRUCE_VOLVER_MS;
    const t = setTimeout(
      () => {
        if (!hecho) {
          hecho = true;
          finRef.current?.();
        }
      },
      reducedMotion ? 0 : dura,
    );
    return () => {
      hecho = true;
      clearTimeout(t);
    };
  }, [sentido, reducedMotion]);

  if (reducedMotion) return null;

  // Props que AbejaAngelita recibe hoy — mismas para `criatura` cuando es
  // función, así cualquier bicho del roster puede leer size/animo/energia/tier
  // sin que este componente sepa nada de su forma interna.
  const propsBicho = { size, animo, energia, animated: true, tier };
  const bicho = typeof criatura === 'function'
    ? criatura(propsBicho)
    : (criatura ?? <AbejaAngelita {...propsBicho} />);

  return (
    <div className={`abeja-cruce abeja-cruce--${sentido}`} data-tier={tier} aria-hidden="true">
      <div className="abeja-cruce__pos">
        <div className="abeja-cruce__vuelo">
          <div className="abeja-cruce__giro">
            {bicho}
          </div>
        </div>
        {sentido === 'entrar' && <span className="abeja-cruce__puff" />}
      </div>
    </div>
  );
}
