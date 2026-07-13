/*
 * FaunaAmbiental — el VALLE VIVO como capa DOM pura (cero three, cero canvas).
 *
 * Los personajes de la chagra asoman A LO LEJOS en el valle y en la galería de
 * mundos: entran con fade, hacen UN gesto de llamar la atención (saltito, seña
 * con la manita, guiño coqueto) y se van con fade. Rotan por un pool de slots
 * FIJOS — nunca más de 2–3 a la vez, nunca el mismo repetido — mientras EL
 * CENTRAL (el avatar elegido) sigue mandando en primer plano, grande y pleno.
 *
 * ES UN OVERLAY: se monta SOBRE la escena (el canvas 3D del valle, la galería
 * de portales, o la rejilla 2D de gama baja) con `position:absolute` y
 * `pointer-events:none`. No sabe de three ni de cámaras: la lejanía se dice
 * con TAMAÑO (los ambientales miden 32–46 px; el central 100+) y con puntos de
 * anclaje en los bordes/horizonte que el host puede afinar por escena.
 *
 * PERFORMANCE (el requisito duro — "que no carguen el mundo"):
 *   - POOLING: los slots son nodos fijos que se REUSAN; el personaje solo se
 *     swapea al re-entrar (una vez cada ~8–12 s). Cero churn de montaje.
 *   - LOD: los ambientales van con `animated={false}` — el SVG interno queda
 *     ESTÁTICO (sin aleteo, sin boil, sin filtros); el único movimiento es el
 *     gesto del wrapper, transform/opacity-only (composición pura, cero
 *     layout). Solo el central, que vive fuera de esta capa, va full-detail.
 *   - TIER: alto=3, medio=2, bajo=1 (y en bajo el gesto se apaga por CSS:
 *     queda solo el fade — `data-tier='bajo'` reduce todo).
 *   - REDUCED-MOTION: la capa NI SE MONTA (limite 0). Sin entradas ni salidas.
 *   - CULLING: los timers se PAUSAN cuando la capa sale de pantalla
 *     (IntersectionObserver), cuando la pestaña se oculta (visibilitychange)
 *     y cuando el host la declara inactiva (`activo={false}`, p. ej. durante
 *     el dolly del túnel, que ya tiene la GPU ocupada).
 *
 * La LÓGICA del ritmo (fases, límites, cast) vive pura en faunaAmbiental.js.
 * UI en usted colombiano; la capa es decorativa → aria-hidden.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CREATURES } from './index.js';
import {
  castAmbiental,
  crearEstado,
  avanzar,
  duracionFase,
  limiteAmbiental,
  esMagico,
  ladoDePunto,
  CENTRAL_DEFECTO,
  PUNTOS_DEFECTO,
} from './faunaAmbiental.js';

/* CSS de la capa (vive aquí: patrón CSS_CIELO de EscenaValle — un archivo).
   TODO transform/opacity-only: nada que dispare layout ni paint pesado. */
const CSS_FAUNA_AMB = `
.fauna-amb { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 2; }
.fauna-amb__slot {
  position: absolute;
  opacity: 0;
  transition: opacity 0.7s ease, transform 0.7s ease;
  will-change: opacity;
  filter: drop-shadow(0 2px 3px rgba(30, 30, 20, 0.22));
}
/* COHERENCIA: cada animal VIENE de algún lado y SE VA por donde vino.
   Del costado izquierdo/derecho: se desliza entrando a escena. Del bosque:
   asoma SUBIENDO tras la vegetación del horizonte. El estado oculto define
   la procedencia; el visible es siempre su puesto (transform none). */
.fauna-amb__slot[data-entrada='izq'] { transform: translateX(-160%) translateY(6px); }
.fauna-amb__slot[data-entrada='der'] { transform: translateX(160%) translateY(6px); }
.fauna-amb__slot[data-entrada='bosque'] { transform: translateY(60%) scale(0.92); }
/* El JAGUAR es el único que aparece MÁGICO: surge de la nada donde está,
   condensándose (escala desde chiquito, sin viaje) — espíritu del monte. */
.fauna-amb__slot[data-magico='1'] { transform: scale(0.35) rotate(-6deg); }
.fauna-amb__slot[data-fase='entra'],
.fauna-amb__slot[data-fase='gesto'] { opacity: 0.88; transform: none; }
.fauna-amb__slot[data-fase='sale'] { opacity: 0; }
.fauna-amb__gesto { transform-origin: 50% 100%; }
.fauna-amb__cara--voltea { transform: scaleX(-1); }
/* Los tres gestos de "¡venga, míreme!" — corren SOLO en la fase gesto. */
.fauna-amb__slot[data-fase='gesto'][data-gesto='saltito'] .fauna-amb__gesto {
  animation: fauna-amb-salto 1.3s cubic-bezier(0.34, 1.56, 0.64, 1) 2;
}
.fauna-amb__slot[data-fase='gesto'][data-gesto='sena'] .fauna-amb__gesto {
  animation: fauna-amb-sena 0.65s ease-in-out 4;
}
.fauna-amb__slot[data-fase='gesto'][data-gesto='guino'] .fauna-amb__gesto {
  animation: fauna-amb-guino 2.6s ease-in-out 1;
}
/* Saltito rubber-hose: dos brincos con squash & stretch y overshoot. */
@keyframes fauna-amb-salto {
  0%, 100% { transform: none; }
  25% { transform: translateY(-16%) scaleY(1.06) scaleX(0.96); }
  45% { transform: translateY(0) scaleY(0.92) scaleX(1.08); }
  62% { transform: translateY(-9%) scaleY(1.04); }
  80% { transform: translateY(0) scaleY(0.97); }
}
/* Seña con la manita: el cuerpo entero se mece desde los pies, llamando. */
@keyframes fauna-amb-sena {
  0%, 100% { transform: rotate(0deg); }
  35% { transform: rotate(-11deg); }
  70% { transform: rotate(8deg); }
}
/* Guiño/asomo coqueto: se ladea, se estira un pelito hacia usted y vuelve. */
@keyframes fauna-amb-guino {
  0%, 100% { transform: none; }
  22% { transform: rotate(-6deg) scale(1.06); }
  48% { transform: rotate(-6deg) scale(1.06) translateY(-4%); }
  74% { transform: rotate(3deg) scale(1.01); }
}
/* Gama baja: el gesto se apaga — queda apenas el fade (compañía sin costo). */
.fauna-amb[data-tier='bajo'] .fauna-amb__gesto { animation: none !important; }
/* Host inactivo (dolly/túnel en curso): todos se apagan de una. */
.fauna-amb[data-activo='0'] .fauna-amb__slot { opacity: 0 !important; }
/* Cinturón y tirantes: si el gate de reduced-motion no llegó por props. */
@media (prefers-reduced-motion: reduce) {
  .fauna-amb__slot, .fauna-amb__gesto { transition: none !important; animation: none !important; }
}
`;

/**
 * La capa de fauna ambiental. Montarla como hija de un contenedor
 * `position:relative` que cubra la escena (el host del valle, la vitrina…).
 *
 * @param {object} p
 * @param {string}  [p.central]  slug del avatar protagonista — se EXCLUYE del
 *   elenco ambiental (el central manda, nadie lo duplica al fondo). El host
 *   lo saca de `useAvatarCreature()` (src/hooks).
 * @param {string[]} [p.excluir]  slugs extra fuera del coro (p. ej. Angelita
 *   donde ella ya vuela en primer plano como acompañante).
 * @param {'alto'|'medio'|'bajo'} [p.tier]  gama del equipo (deviceTier).
 * @param {boolean} [p.reducedMotion]  true → la capa ni se monta.
 * @param {boolean} [p.activo]  false → pausa timers y apaga los slots (p. ej.
 *   durante el viaje de túnel). Default true.
 * @param {Array<{estilo: object, tam?: number, voltear?: boolean}>} [p.puntos]
 *   anclajes por slot (estilos absolutos: left/right/top/bottom en %).
 * @param {object}  [p.registro]  slug → { Component, nombre } (tests).
 * @param {string}  [p.className]
 */
export function FaunaAmbiental({
  central = CENTRAL_DEFECTO,
  excluir = undefined,
  tier = 'alto',
  reducedMotion = false,
  activo = true,
  puntos = PUNTOS_DEFECTO,
  registro = CREATURES,
  className = '',
}) {
  const limite = limiteAmbiental(tier, reducedMotion);
  const cast = useMemo(
    () => castAmbiental(central, registro, excluir || []),
    [central, registro, excluir],
  );
  const [estado, setEstado] = useState(() => crearEstado(cast, limite));
  const estadoRef = useRef(estado);
  const raizRef = useRef(null);
  /* Culling: fuera de pantalla o pestaña oculta → el reloj se detiene. */
  const [enPantalla, setEnPantalla] = useState(true);
  const [pestanaViva, setPestanaViva] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );

  /* Si cambian cast o límite (avatar nuevo, tier), el pool se rearma limpio. */
  useEffect(() => {
    estadoRef.current = crearEstado(cast, limite);
    setEstado(estadoRef.current);
  }, [cast, limite]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const alCambiar = () => setPestanaViva(!document.hidden);
    document.addEventListener('visibilitychange', alCambiar);
    return () => document.removeEventListener('visibilitychange', alCambiar);
  }, []);

  useEffect(() => {
    const el = raizRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entrada]) => setEnPantalla(entrada.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [limite]);

  const corriendo = activo && enPantalla && pestanaViva && !reducedMotion && limite > 0;

  /* El RELOJ del pool: una cadena de timeouts POR SLOT (independientes — cada
     uno respira a su compás determinista). Pausa = cleanup; reanudar rearma la
     fase actual completa. Nada corre fuera de pantalla. */
  useEffect(() => {
    if (!corriendo || estadoRef.current.slots.length === 0) return undefined;
    let vivo = true;
    const timers = new Array(estadoRef.current.slots.length);
    const programar = (i) => {
      timers[i] = setTimeout(() => {
        if (!vivo) return;
        estadoRef.current = avanzar(estadoRef.current, i);
        setEstado(estadoRef.current);
        programar(i);
      }, duracionFase(estadoRef.current.slots[i], i));
    };
    estadoRef.current.slots.forEach((_, i) => programar(i));
    return () => {
      vivo = false;
      timers.forEach(clearTimeout);
    };
  }, [corriendo, cast, limite]);

  /* Reduced-motion o sin cupo/elenco: la capa NI SE MONTA (cero costo). */
  if (limite === 0 || estado.slots.length === 0) return null;

  return (
    <div
      ref={raizRef}
      className={`fauna-amb${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      data-tier={tier}
      data-activo={activo ? '1' : '0'}
    >
      <style>{CSS_FAUNA_AMB}</style>
      {estado.slots.map((slot, i) => {
        const punto = puntos[i % puntos.length] || PUNTOS_DEFECTO[0];
        const def = slot.slug ? registro[slot.slug] : null;
        const Cuerpo = def?.Component;
        const magico = esMagico(slot.slug);
        return (
          <div
            key={i}
            className="fauna-amb__slot"
            data-fase={slot.fase}
            data-gesto={slot.gesto}
            data-slug={slot.slug || undefined}
            data-entrada={ladoDePunto(punto)}
            data-magico={magico ? '1' : undefined}
            style={punto.estilo}
          >
            {Cuerpo && (
              <div className="fauna-amb__gesto">
                <div className={punto.voltear ? 'fauna-amb__cara fauna-amb__cara--voltea' : 'fauna-amb__cara'}>
                  {/* LOD lejano: cuerpo ESTÁTICO (animated=false) — el gesto lo
                      pone el wrapper. Solo el central, afuera, va full-detail. */}
                  <Cuerpo size={punto.tam ?? 40} animated={false} title={def.nombre} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default FaunaAmbiental;
