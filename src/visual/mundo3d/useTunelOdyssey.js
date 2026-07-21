/* Máquina de fases del cruce Odyssey, independiente de escenas y destinos. */
import { useCallback, useEffect, useState } from 'react';

export const ODYSSEY_IRIS_MS = 640;

const ESPERA_IRIS_MS = 40;

/** El intercambio de escenas siempre ocurre debajo del iris. */
export function useTunelOdyssey({ reducedMotion = false, sinCanvas = false, irisMs = ODYSSEY_IRIS_MS } = {}) {
  const [fase, setFase] = useState('valle3d');

  const entrar = useCallback(() => {
    if (reducedMotion) setFase('juego2d');
    else if (sinCanvas) setFase('iris-abre');
    else setFase('acercando');
  }, [reducedMotion, sinCanvas]);

  const salir = useCallback(() => {
    setFase(reducedMotion ? 'valle3d' : 'iris-cierra');
  }, [reducedMotion]);

  const alLlegarCamara = useCallback((faseViaje) => {
    if (faseViaje === 'acercando') setFase('iris-abre');
    else if (faseViaje === 'saliendo') setFase('valle3d');
  }, []);

  useEffect(() => {
    if (fase !== 'iris-abre' && fase !== 'iris-cierra') return undefined;
    const t = setTimeout(
      () => setFase(fase === 'iris-abre' ? 'juego2d' : sinCanvas ? 'valle3d' : 'saliendo'),
      irisMs + ESPERA_IRIS_MS,
    );
    return () => clearTimeout(t);
  }, [fase, irisMs, sinCanvas]);

  return {
    fase,
    entrar,
    salir,
    alLlegarCamara,
    mostrar3d: !sinCanvas && fase !== 'juego2d',
    mostrarPortada: sinCanvas && fase !== 'juego2d' && fase !== 'iris-abre',
    mostrar2d: fase === 'juego2d' || fase === 'iris-abre' || fase === 'iris-cierra',
    enValle: fase === 'valle3d',
    iris: fase === 'iris-abre' ? 'abre' : fase === 'iris-cierra' ? 'cierra' : 'no',
  };
}
