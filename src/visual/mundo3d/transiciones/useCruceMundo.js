/*
 * useCruceMundo — la máquina de estados del cruce Odyssey, lista para cablear.
 *
 * Envuelve el ciclo completo de un viaje entre mundos para que el host no
 * cronometre nada a mano:
 *
 *   quieto ──entrar(destino)──▶ entrando ──(velo cubre, onSwap)──▶ entrando
 *          ◀──────(velo revela: onFin)────────────────────────────┘
 *   quieto ──volver()─────────▶ saliendo ──(velo cubre, onSwap)──▶ …
 *
 * El swap REAL de escena lo hace el host en `onSwap(destino|null)` — se
 * dispara exactamente cuando la pantalla está 100% cubierta (contrato del
 * velo). `destino=null` significa "de vuelta a casa".
 *
 * USO
 *   const cruce = useCruceMundo({ tier, reducedMotion, onSwap });
 *   …
 *   <button onClick={() => cruce.entrar('bosque_vivo')}>al bosque</button>
 *   <button onClick={cruce.volver}>a casa</button>
 *   <VeloOdyssey {...cruce.propsVelo} />
 *
 * `cruce.fase` ('quieto'|'entrando'|'saliendo') y `cruce.destino` sirven de
 * insumo para la CamaraCruce si el host tiene canvas 3D. DOM puro, cero three.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * @param {Object} [opciones]
 * @param {'alto'|'medio'|'bajo'} [opciones.tier]
 * @param {boolean} [opciones.reducedMotion]
 * @param {(destino: string|null) => void} [opciones.onSwap]  se dispara con la
 *   pantalla 100% cubierta; destino=null significa "de vuelta a casa".
 */
export function useCruceMundo({ tier = 'medio', reducedMotion = false, onSwap } = {}) {
  const [estado, setEstado] = useState(
    /** @type {{ fase: 'quieto'|'entrando'|'saliendo', destino: string|null }} */
    ({ fase: 'quieto', destino: null }),
  );
  const swapRef = useRef(onSwap);
  const estadoRef = useRef(estado);
  // Sincroniza los refs DESPUÉS del render (no durante): los callbacks de abajo
  // los leen fuera del ciclo de render (en eventos async del velo), así que no
  // hace falta useLayoutEffect — solo evitar la mutación en el cuerpo del render.
  useEffect(() => {
    swapRef.current = onSwap;
    estadoRef.current = estado;
  });

  const entrar = useCallback((destino) => {
    setEstado((e) => (e.fase === 'quieto' ? { fase: 'entrando', destino } : e));
  }, []);

  const volver = useCallback(() => {
    setEstado((e) => (e.fase === 'quieto' ? { fase: 'saliendo', destino: e.destino } : e));
  }, []);

  const alCubierto = useCallback(() => {
    const e = estadoRef.current;
    swapRef.current?.(e.fase === 'saliendo' ? null : e.destino);
  }, []);

  const alFin = useCallback(() => {
    setEstado((e) =>
      e.fase === 'saliendo' ? { fase: 'quieto', destino: null } : { fase: 'quieto', destino: e.destino },
    );
  }, []);

  const propsVelo = useMemo(
    () => ({
      fase: estado.fase === 'quieto' ? null : estado.fase,
      destino: estado.destino || 'valle',
      tier,
      reducedMotion,
      onCubierto: alCubierto,
      onFin: alFin,
    }),
    [estado, tier, reducedMotion, alCubierto, alFin],
  );

  return {
    /** 'quieto' | 'entrando' | 'saliendo' */
    fase: estado.fase,
    /** mundoId del destino del viaje en curso (o del mundo donde se está). */
    destino: estado.destino,
    /** ¿hay un cruce corriendo? (útil para inhibir toques). */
    viajando: estado.fase !== 'quieto',
    entrar,
    volver,
    /** Spread directo sobre <VeloOdyssey {...propsVelo} />. */
    propsVelo,
  };
}
