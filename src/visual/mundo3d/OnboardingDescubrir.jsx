/*
 * OnboardingDescubrir — el PRIMER viaje al valle, SIN voz y sin afán.
 *
 * Un recorrido de descubrimiento para quien no usa micrófono: una tarjeta
 * pequeña (abajo, al centro) presenta los lugares del valle uno por uno, con
 * pistas suaves que invitan a tocar. NO es modal ni un tutorial de videojuego:
 * el valle queda tocable todo el tiempo, y "Ya lo conozco" está siempre a un
 * toque. Tono: usted colombiano, cálido y paciente.
 *
 * CÓMO MONTARLO (el host lo cablea; este archivo NO toca Mundo.jsx):
 *
 *   import OnboardingDescubrir from './visual/mundo3d/OnboardingDescubrir.jsx';
 *   import { hotspotsDeValle, valleYaDescubierto } from './visual/mundo3d/onboardingDatos.js';
 *
 *   // Dentro del contenedor del valle (.mundo-root es position:relative),
 *   // como HERMANO del canvas — p. ej. junto al <SalirBtn> del host:
 *   {mundoId === 'valle' && !valleYaDescubierto() && (
 *     <OnboardingDescubrir
 *       hotspots={hotspotsDeValle()}          // o una lista propia
 *       reducedMotion={reducedMotion}
 *       onDestacar={(id) => setFocoId(id)}    // opcional → focoId de Valle3D
 *       onListo={(motivo) => setFocoId(null)} // 'completado' | 'saltado'
 *     />
 *   )}
 *
 * · `onDestacar(id|null)` es el puente con la escena: Valle3D ya sabe orbitar
 *   y ponerle halo al landmark activo vía su prop `focoId` (hoy EscenaValle le
 *   pasa null fijo). Sin ese cable el recorrido funciona igual, solo con la
 *   tarjeta. El componente lo llama con null al terminar y al desmontarse.
 * · Persistencia: al terminar (o saltar) marca localStorage; el host decide el
 *   montaje con `valleYaDescubierto()` (helpers en `onboardingDatos.js`;
 *   `olvidarValleDescubierto()` resetea, útil para "volver a ver el recorrido").
 * · `reducedMotion` (o prefers-reduced-motion) → pistas estáticas, cero animación.
 * · Cero three/vendor: es DOM puro, seguro en el bundle base.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { marcarValleDescubierto, PISTA_GENERICA } from './onboardingDatos.js';
import './onboardingDescubrir.css';

/**
 * @param {Object} props
 * @param {Array<{id:string, label:string, emoji?:string, pista?:string, tinte?:string}>} props.hotspots
 *   Paradas del recorrido, en orden. Vacío → no monta nada.
 * @param {(motivo:'completado'|'saltado')=>void} [props.onListo] Al cerrar (fin o salto).
 * @param {(id:string|null)=>void} [props.onDestacar] Puente con la escena (→ focoId).
 * @param {boolean} [props.reducedMotion] Pistas estáticas, sin animación.
 */
export default function OnboardingDescubrir({
  hotspots = [], onListo, onDestacar, reducedMotion = false,
}) {
  // paso -1 = bienvenida; 0..n-1 = paradas; cerrado = ya no se pinta.
  const [paso, setPaso] = useState(-1);
  const [cerrado, setCerrado] = useState(false);

  // El callback vive en un ref (actualizado en efecto, no en render) para que
  // el puente con la escena no dependa de la identidad de la prop.
  const onDestacarRef = useRef(onDestacar);
  useEffect(() => {
    onDestacarRef.current = onDestacar;
  }, [onDestacar]);

  const actual = paso >= 0 ? hotspots[paso] : null;

  // El puente con la escena: destacar la parada actual; limpiar al desmontar.
  useEffect(() => {
    onDestacarRef.current?.(actual ? actual.id : null);
  }, [actual]);
  useEffect(() => () => onDestacarRef.current?.(null), []);

  const terminar = useCallback((motivo) => {
    marcarValleDescubierto(motivo);
    setCerrado(true);
    onDestacarRef.current?.(null); // suelta el foco de la escena al cerrar
    onListo?.(motivo);
  }, [onListo]);

  // Escape = "Ya lo conozco" (la salida amable siempre disponible).
  useEffect(() => {
    if (cerrado) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') terminar('saltado'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cerrado, terminar]);

  if (cerrado || hotspots.length === 0) return null;

  const ultimo = paso === hotspots.length - 1;
  const tinte = (actual && actual.tinte) || '#3f8f4e';

  return (
    <div
      className="onbdesc"
      data-estatico={reducedMotion ? 'si' : undefined}
      style={{ '--od-tinte': tinte }}
    >
      <section className="onbdesc__tarjeta" aria-label="Descubra su valle">
        {paso === -1 ? (
          <>
            <div className="onbdesc__medallon" aria-hidden="true">
              <span className="onbdesc__anillo" />
              <span className="onbdesc__emoji">🏞️</span>
            </div>
            <h2 className="onbdesc__titulo">Este es su valle</h2>
            <p className="onbdesc__pista">
              Cada lugar que ve guarda una parte de su finca. Si quiere, se lo
              presento paso a paso; también puede recorrerlo a su aire, tocando
              lo que le llame la atención.
            </p>
            <div className="onbdesc__acciones">
              <button type="button" className="onbdesc__btn onbdesc__btn--principal" onClick={() => setPaso(0)}>
                Muéstremelo
              </button>
              <button type="button" className="onbdesc__btn" onClick={() => terminar('saltado')}>
                Ya lo conozco
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="onbdesc__medallon" aria-hidden="true">
              <span className="onbdesc__anillo" />
              <span className="onbdesc__emoji">{actual.emoji || '🌱'}</span>
            </div>
            <div aria-live="polite">
              <h2 className="onbdesc__titulo">{actual.label}</h2>
              <p className="onbdesc__pista">{actual.pista || PISTA_GENERICA}</p>
              <p className="onbdesc__toque">Tóquelo en el valle cuando quiera entrar.</p>
            </div>
            <ol className="onbdesc__semillas" aria-label={`Lugar ${paso + 1} de ${hotspots.length}`}>
              {hotspots.map((h, i) => (
                <li
                  key={h.id}
                  className={`onbdesc__semilla${i <= paso ? ' onbdesc__semilla--brotada' : ''}`}
                  aria-current={i === paso ? 'step' : undefined}
                />
              ))}
            </ol>
            <div className="onbdesc__acciones">
              <button
                type="button"
                className="onbdesc__btn onbdesc__btn--principal"
                onClick={() => (ultimo ? terminar('completado') : setPaso(paso + 1))}
              >
                {ultimo ? 'Listo, a recorrer' : 'Siguiente'}
              </button>
              {!ultimo && (
                <button type="button" className="onbdesc__btn onbdesc__btn--quieto" onClick={() => terminar('saltado')}>
                  Ya lo conozco
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
