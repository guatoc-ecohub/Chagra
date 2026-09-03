/*
 * LineaTiempo — el control donde uno agarra el tiempo con el dedo.
 *
 * Esta es la pieza donde se juega todo. Un deslizador malo convierte cincuenta
 * años en un truco de magia; uno bueno los hace SENTIR. Las decisiones:
 *
 * · EL RIEL NO ES LINEAL. Los primeros años ocupan más riel del que les tocaría
 *   (ahí es donde todo cambia) y los últimos treinta se comen casi la mitad. Al
 *   arrastrar, uno siente cómo la ladera se le acelera al principio y después se
 *   le pone pesada: los años pasan y el monte apenas respira. Esa resistencia en
 *   el dedo ES el mensaje. La cifra sube sola: 20... 30... 40...
 *
 * · LAS ETAPAS SON PARADAS, NO PANTALLAS. Se puede tocar cualquiera y el monte va
 *   creciendo HASTA allá (nunca aparece de golpe: el reloj lo lleva). Son señales
 *   en el camino, no cinco escenas distintas.
 *
 * · "AÑO 50+" CON EL MÁS. Porque a los cincuenta no se acaba nada. Ahí apenas
 *   empieza el bosque maduro.
 *
 * · NADIE DICE "CARGANDO" NI "FELICITACIONES". No hay premio al final ni barra de
 *   progreso: hay una ladera y unos años. La dirección educativa de Chagra es
 *   observación, fracaso y paciencia — no gamificación. El único "logro" acá es
 *   que el agua volvió, y volvió porque alguien esperó.
 *
 * En "usted", como toda la UI. Se maneja con el dedo, con las flechas del teclado
 * o tocando una etapa: es un <input type=range> de verdad, no un div con drag —
 * accesible por defecto, y en un teléfono humilde no cuesta nada.
 */
import { useCallback, useEffect, useRef } from 'react';
import {
  ETAPAS,
  ANIO_MAX,
  anioDesdePosicion,
  posicionDesdeAnio,
  etapaDeAnio,
  rotuloAnio,
} from './tiempoSucesion.js';
import './lineaTiempo.css';

/* Cuánto tarda el recorrido completo si uno lo deja andar solo (ms). Lento a
   propósito: cuarenta segundos para cincuenta años ya es una insolencia. */
const DURACION_SOLO = 42000;

/**
 * @param {{
 *   anio: number,
 *   onAnio: (anio: number) => void,
 *   andando?: boolean,
 *   onAndando?: (v: boolean) => void,
 *   reducedMotion?: boolean,
 * }} props
 */
export default function LineaTiempo({ anio, onAnio, andando = false, onAndando, reducedMotion = false }) {
  const etapa = etapaDeAnio(anio);
  const pos = posicionDesdeAnio(anio);
  const enMarcha = useRef(0);

  /* El paseo solo: avanza por el RIEL (no por los años), así cada etapa alcanza
     a verse. Si avanzara por años, el año 1 —cuando nacen las pioneras— pasaría
     en un parpadeo y es justo el que hay que ver. */
  useEffect(() => {
    if (!andando) return undefined;
    let vivo = true;
    let anterior = performance.now();
    enMarcha.current = posicionDesdeAnio(anio) >= 0.999 ? 0 : posicionDesdeAnio(anio);

    const paso = (ahora) => {
      if (!vivo) return;
      const dt = ahora - anterior;
      anterior = ahora;
      enMarcha.current = Math.min(1, enMarcha.current + dt / DURACION_SOLO);
      onAnio(anioDesdePosicion(enMarcha.current));
      if (enMarcha.current >= 1) {
        onAndando?.(false);
        return;
      }
      requestAnimationFrame(paso);
    };
    const id = requestAnimationFrame(paso);
    return () => {
      vivo = false;
      cancelAnimationFrame(id);
    };
    // `anio` a propósito fuera: el paseo lleva su propio riel y no se re-arranca
    // en cada cuadro. Solo importa dónde estaba cuando le dieron al botón.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [andando]);

  const arrastrar = useCallback(
    (e) => {
      onAndando?.(false);
      onAnio(anioDesdePosicion(Number(e.target.value) / 1000));
    },
    [onAnio, onAndando],
  );

  const irAEtapa = useCallback(
    (e) => {
      onAndando?.(false);
      onAnio(e.anio);
    },
    [onAnio, onAndando],
  );

  return (
    <div className="lt">
      {/* El año, grande. Es la cifra la que tiene que pesar. */}
      <div className="lt__cabeza">
        <div className="lt__anio" aria-live="polite">
          {rotuloAnio(anio)}
        </div>
        <div className="lt__nombre">{etapa.titulo}</div>
      </div>

      {/* Lo que está pasando en la ladera, ahora. */}
      <p className="lt__texto">{etapa.texto}</p>

      {/* El riel. */}
      <div className="lt__riel">
        <div className="lt__pista" aria-hidden="true">
          <div className="lt__crecido" style={{ width: `${pos * 100}%` }} />
          {ETAPAS.map((e) => (
            <span key={e.clave} className="lt__hito" style={{ left: `${e.pos * 100}%` }} />
          ))}
        </div>
        <input
          className="lt__input"
          type="range"
          min={0}
          max={1000}
          step={1}
          value={Math.round(pos * 1000)}
          onChange={arrastrar}
          aria-label="Años desde que empezó la restauración"
          aria-valuetext={`${rotuloAnio(anio)}. ${etapa.titulo}`}
        />
      </div>

      {/* Las paradas del camino. */}
      <div className="lt__etapas">
        {ETAPAS.map((e) => (
          <button
            key={e.clave}
            type="button"
            className={`lt__etapa${e.clave === etapa.clave ? ' lt__etapa--aqui' : ''}`}
            style={{ left: `${e.pos * 100}%` }}
            onClick={() => irAEtapa(e)}
            aria-current={e.clave === etapa.clave ? 'step' : undefined}
          >
            {e.anio === ANIO_MAX ? '50+' : e.anio === 1.5 ? '1-2' : String(e.anio)}
          </button>
        ))}
      </div>

      <div className="lt__pie">
        {/* Con `reducedMotion` no hay botón de andar: pedir calma es pedir que
            nada se mueva solo. La ladera sigue entera — se recorre a mano. */}
        {!reducedMotion && (
          <button
            type="button"
            className="lt__andar"
            onClick={() => onAndando?.(!andando)}
            aria-pressed={andando}
          >
            {andando ? '❚❚  Pare' : '▶  Véalo pasar'}
          </button>
        )}
        {/*
          La tesis, en letra chica y sin subrayarla. Si la pieza está bien hecha,
          para cuando uno lee esto ya lo sabía.
        */}
        <p className="lt__tesis">
          {reducedMotion
            ? 'Toque una etapa para ver la ladera en ese año.'
            : 'Restaurar es lento. Cada año de estos es un año de verdad.'}
        </p>
      </div>
    </div>
  );
}
