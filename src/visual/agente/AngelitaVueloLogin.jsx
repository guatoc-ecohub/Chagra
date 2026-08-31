import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Angelita } from './Angelita.jsx';
import BurbujaAngelita from './BurbujaAngelita.jsx';
import './angelita-vuelo-login.css';

/*
 * AngelitaVueloLogin — la misma presencia que nace dentro del círculo y
 * aterriza en el puesto natural del compai.
 *
 * No es una entrada nueva ni una despedida: el wrapper conserva el personaje
 * y solo cambia de ancla cuando la brecha de CirculoRotoMilpa está abierta.
 * La posición de origen se mide en viewport para que el vuelo siga siendo
 * correcto si la pantalla de login se desplazó antes de los 9 segundos.
 */
export default function AngelitaVueloLogin({
  volando = false,
  asentada = false,
  origen = null,
  mensaje = null,
  estado = 'acompana',
  animated = true,
  aura = false,
  onAterrizaje,
}) {
  const ref = useRef(null);
  const [delta, setDelta] = useState(null);
  const [vueloListo, setVueloListo] = useState(false);

  useLayoutEffect(() => {
    if (!volando || !origen || !ref.current) return undefined;

    setVueloListo(false);
    const destino = ref.current.getBoundingClientRect();
    const siguienteFrame = window.requestAnimationFrame(() => {
      setDelta({
        x: origen.x - destino.left,
        y: origen.y - destino.top,
      });
      setVueloListo(true);
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        onAterrizaje?.();
      }
    });

    return () => window.cancelAnimationFrame(siguienteFrame);
  }, [volando, origen, onAterrizaje]);

  const estilo = delta
    ? { '--login-vuelo-dx': `${delta.x.toFixed(2)}px`, '--login-vuelo-dy': `${delta.y.toFixed(2)}px` }
    : undefined;

  const enPuesto = volando || asentada;
  const claseAncla = volando ? 'is-volando' : asentada ? 'is-asentada' : 'is-en-orbe';
  const contenido = (
    <span
      ref={ref}
      className={`login-angelita-presencia ${claseAncla}${aura ? ' is-con-aura' : ''}${vueloListo ? ' is-vuelo-listo' : ''}`}
      style={estilo}
      data-login-angelita={volando ? 'volando' : asentada ? 'asentada' : 'en-orbe'}
      onAnimationEnd={(event) => {
        if (event.animationName === 'login-angelita-vuela') onAterrizaje?.();
      }}
    >
      <Angelita
        estado={estado}
        size={enPuesto ? 82 : 88}
        animated={animated}
        idleCerebro={animated}
        lineBoil={volando}
        title="Angelita, compañera de Chagra"
      />
      {volando && mensaje && (
        <BurbujaAngelita
          mensaje={mensaje}
          tipo="informativa"
          className="login-angelita-burbuja"
        />
      )}
    </span>
  );

  /* El orbe de Fase 1 usa backdrop-filter, que crea un containing block para
     descendientes fixed. El portal conserva esta misma entidad React y evita
     que el puesto natural termine relativo al círculo. */
  return enPuesto && typeof document !== 'undefined'
    ? createPortal(contenido, document.body)
    : contenido;
}
