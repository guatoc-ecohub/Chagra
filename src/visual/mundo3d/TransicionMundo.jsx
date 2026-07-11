/*
 * TransicionMundo — el VIAJE entre el valle y un mundo, guiado por Angelita.
 *
 * Overlay DOM puro (CERO three): un velo con la luz del mundo destino que se
 * cierra con profundidad mientras la abeja vuela hacia adentro (entrar) o de
 * regreso hacia usted (volver). Por ser DOM funciona IGUAL sobre el valle 3D,
 * el valle 2D o cualquier arquetipo — y no toca el chunk `vendor-three`.
 *
 * El tiempo lo maneja un timer (no `animationend`): determinista, testeable y
 * a prueba de pestañas en segundo plano. Al cumplirse llama `onFin` UNA vez —
 * ahí el host (via `useNavegacionMundos.completarViaje`) hace el intercambio
 * de escena DEBAJO del velo.
 *
 * `prefers-reduced-motion`: no dibuja nada y llama `onFin` de inmediato
 * (corte simple). Normalmente ni se monta: el hook ya salta las fases.
 */
import { useEffect, useRef } from 'react';
import { AbejaAngelita } from '../creatures/AbejaAngelita.jsx';
import { tinteDeMundo, tituloDeMundo } from './resolverMundo.js';
import './mundo.css';

/** Duración del viaje (ms) — igual a las keyframes de `mundo.css`. */
export const VIAJE_MS = 1050;

export default function TransicionMundo({
  mundoId,
  sentido = 'entrar', // 'entrar' (valle → mundo) | 'volver' (mundo → valle)
  animo = 'sereno',
  energia = 1,
  reducedMotion = false,
  onFin,
}) {
  const finRef = useRef(onFin);
  finRef.current = onFin;

  useEffect(() => {
    let hecho = false;
    const t = setTimeout(
      () => {
        if (!hecho) {
          hecho = true;
          finRef.current?.();
        }
      },
      reducedMotion ? 0 : VIAJE_MS,
    );
    return () => {
      hecho = true;
      clearTimeout(t);
    };
  }, [mundoId, sentido, reducedMotion]);

  if (reducedMotion) return null;

  const tinte = tinteDeMundo(mundoId);
  const entra = sentido === 'entrar';
  return (
    <div
      className={`mundo-viaje mundo-viaje--${entra ? 'entrar' : 'volver'}`}
      style={{ '--mv-a': tinte[0], '--mv-b': tinte[1] }}
      role="status"
      aria-live="polite"
    >
      <div className="mundo-viaje__velo" aria-hidden="true" />
      <div className="mundo-viaje__abeja" aria-hidden="true">
        <AbejaAngelita size={72} animo={animo} energia={energia} animated />
      </div>
      <p className="mundo-viaje__txt">
        {entra ? `Angelita lo lleva a ${tituloDeMundo(mundoId)}…` : 'De vuelta al valle…'}
      </p>
    </div>
  );
}
