/*
 * useTunelLamina — la máquina de estados del cruce lámina 2D ↔ mundo 3D,
 * lista para cablear (hermana de useCruceMundo, con GEOMETRÍA: además de la
 * fase, recuerda el RECT de la lámina de origen para que la hoja despegue de
 * su lugar exacto y, al volver, aterrice en el mismo sitio).
 *
 *   quieto ──entrar(destino, origen)──▶ entrando ──(túnel cubre: onSwap)──▶ …
 *          ◀──────(túnel resuelve: fase→quieto)──────────────────────────┘
 *   quieto ──volver()────────────────▶ saliendo ──(túnel cubre: onSwap(null))▶ …
 *
 * El swap REAL lo hace el host en `onSwap(destino|null)` — se dispara
 * exactamente cuando la pantalla está 100% cubierta (contrato del túnel).
 * `destino=null` significa "de vuelta a la lámina/cuaderno".
 *
 * USO
 *   const tunel = useTunelLamina({ tier, reducedMotion, onSwap });
 *   …
 *   <button onClick={(ev) => tunel.entrar('microsuelo', ev)}>
 *     <LaminaAporque />
 *   </button>
 *   <button onClick={tunel.volver}>al cuaderno</button>
 *   <TunelLamina {...tunel.propsTunel} lamina={<LaminaAporque />} />
 *
 * `entrar` acepta como origen un evento (usa currentTarget), un elemento DOM
 * o un rect plano — rectDeOrigen normaliza. Al volver se reutiliza el rect
 * capturado a la ida (si el host re-maquetó, puede pasar uno fresco:
 * `volver(origenNuevo)`). DOM mínimo (solo getBoundingClientRect), cero three.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { rectDeOrigen } from './tunelLaminaData.js';

export function useTunelLamina({ tier = 'medio', reducedMotion = false, onSwap = undefined } = {}) {
  const [estado, setEstado] = useState({ fase: 'quieto', destino: null, rect: null });
  // Refs "última versión": se actualizan en un effect (no en render) para que
  // los callbacks del túnel lean siempre lo más fresco sin re-armarse.
  const swapRef = useRef(onSwap);
  const estadoRef = useRef(estado);
  useEffect(() => {
    swapRef.current = onSwap;
    estadoRef.current = estado;
  });

  const entrar = useCallback((destino, origen = null) => {
    const rect = rectDeOrigen(origen);
    setEstado((e) => (e.fase === 'quieto' ? { fase: 'entrando', destino, rect } : e));
  }, []);

  const volver = useCallback((origen = null) => {
    const rectFresco = rectDeOrigen(origen);
    setEstado((e) =>
      e.fase === 'quieto'
        ? { fase: 'saliendo', destino: e.destino, rect: rectFresco || e.rect }
        : e,
    );
  }, []);

  const alCubierto = useCallback(() => {
    const e = estadoRef.current;
    swapRef.current?.(e.fase === 'saliendo' ? null : e.destino);
  }, []);

  const alFin = useCallback(() => {
    setEstado((e) =>
      e.fase === 'saliendo'
        ? { fase: 'quieto', destino: null, rect: null }
        : { fase: 'quieto', destino: e.destino, rect: e.rect },
    );
  }, []);

  const propsTunel = useMemo(
    () => ({
      fase: estado.fase === 'quieto' ? null : estado.fase,
      destino: estado.destino || 'valle',
      rect: estado.rect,
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
    /** mundoId del viaje en curso (o del mundo donde se está). */
    destino: estado.destino,
    /** Rect de la lámina de origen capturado a la ida (o null). */
    rect: estado.rect,
    /** ¿hay un cruce corriendo? (útil para inhibir toques). */
    viajando: estado.fase !== 'quieto',
    entrar,
    volver,
    /** Spread directo sobre <TunelLamina {...propsTunel} />. */
    propsTunel,
  };
}
