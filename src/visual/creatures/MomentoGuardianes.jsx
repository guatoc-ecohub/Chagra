/*
 * MomentoGuardianes — el OVERLAY maestro de EL MOMENTO: dado el id de fase
 * (de useEscenaGuardianes o del propio host), pone en pantalla lo que toca
 * de la parte DIBUJADA de la escena y gobierna la señal hacia el canvas.
 *
 * Es el ÚNICO punto de montaje que necesita el host (DOM puro, cero three):
 *
 *   const fase = useEscenaGuardianes({ activa, reducedMotion });
 *   <div style={{ position:'relative' }}>            // el contenedor del canvas
 *     <Canvas>… valle …</Canvas>
 *     <MomentoGuardianes fase={fase} tier={tier} reducedMotion={rm} />
 *   </div>
 *
 * Qué hace por fase:
 *   'alerta'         → señal: perros 3D a modo 'alerta' mirando al monte
 *                      (HatoMovil los planta y los pone a ladrar). Sin DOM.
 *   'transformacion' → monta PerroTransicion 'heroe' × 2 (Oliver 0ms, Dante
 *                      +ESCALON_PERROS_MS). Cada cruce dispara SU swap.
 *   'guardia'        → PerroHeroe × 2 recorriendo GUION_GUARDIA con timers
 *                      (ladra → señala → arrea, desfasados por perro).
 *   'paso'           → PerroHeroe × 2 en 'vigila' (serenos: el jaguar/oso
 *                      pasa ileso — respeto, no persecución).
 *   'despedida'      → PerroTransicion 'normal' × 2 (el reverso).
 *   null / 'aparece' → nada dibujado; al cerrar (null) resetea la señal.
 *
 * El DEPREDADOR y el CAMPESINO no viven aquí: son del mundo 3D del host
 * (el oso del monte / jaguar aparecido ya existen en composicionValle3D).
 * Este overlay es solo la piel dibujada de los perros.
 */
import { useEffect, useState } from 'react';
import PerroTransicion, { ESCALON_PERROS_MS } from './PerroTransicion.jsx';
import { PerroHeroe } from './PerroHeroe.jsx';
import { GUION_GUARDIA, MONTE_GUARDIANES } from './escenaGuardianes.js';
import {
  setAlertaHacia,
  setModoPerro,
  resetPerrosGuardianes,
} from './senalPerrosGuardianes.js';

/* Anclas en pantalla por perro (defaults dignos para el encuadre del valle:
   el potrero queda al centro-izquierda y el monte a la derecha). El host
   puede pasar las suyas — idealmente la PROYECCIÓN a viewport de cada perro
   3D en el instante del cruce, para que el relevo sea invisible. */
export const POSICIONES_GUARDIANES = Object.freeze({
  dalmata: Object.freeze({ x: '42%', y: '58%' }),
  beagle: Object.freeze({ x: '58%', y: '65%' }),
});

const PAREJA = ['dalmata', 'beagle']; // Oliver manda; Dante lo secunda

/* Recorre el guion de la fase 'guardia' para UN perro, con timers
   deterministas. Con reducedMotion el gesto queda fijo en 'senala' (el aviso
   más digno sin movimiento). */
function useGuionGuardia(perro, activo, reducedMotion) {
  const pasos = GUION_GUARDIA[perro] || [];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setIdx(0);
    if (!activo || reducedMotion || pasos.length <= 1) return undefined;
    const timers = pasos.slice(1).map((p, k) => setTimeout(() => setIdx(k + 1), p.ms));
    return () => timers.forEach(clearTimeout);
    // pasos es tabla congelada por perro: la clave real es (perro, activo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perro, activo, reducedMotion]);
  if (reducedMotion) return 'senala';
  return pasos[Math.min(idx, pasos.length - 1)]?.gesto || 'vigila';
}

/* Un guardián de la fase 'guardia'/'paso' (componente propio: el hook del
   guion no puede vivir dentro de un .map del padre). */
function GuardianEnPantalla({ perro, fase, pos, mira, tier, reducedMotion }) {
  const gestoGuion = useGuionGuardia(perro, fase === 'guardia', reducedMotion);
  const gesto = fase === 'paso' ? 'vigila' : gestoGuion;
  return (
    <PerroHeroe
      perro={perro}
      gesto={gesto}
      x={pos.x}
      y={pos.y}
      mira={mira}
      tier={tier}
      reducedMotion={reducedMotion}
    />
  );
}

export default function MomentoGuardianes({
  /** id de fase de escenaGuardianes (null = tranquilo). */
  fase = null,
  tier = 'alto',
  reducedMotion = false,
  /** { dalmata: {x,y}, beagle: {x,y} } — anclas en pantalla. */
  posiciones = POSICIONES_GUARDIANES,
  /** 1 = el monte queda a la derecha en pantalla; -1 = izquierda. */
  mira = 1,
  /** [x, z] MUNDO hacia donde miran/ladran en alerta (default: el monte). */
  haciaMonte = MONTE_GUARDIANES,
}) {
  /* La señal por fase: alerta enciende el aviso 3D; el swap a 'oculto' /
     'normal' NO se toca aquí (lo cronometran los PerroTransicion — una sola
     fuente de tiempo); al volver a tranquilo, todo a reposo. */
  useEffect(() => {
    if (fase === 'alerta') {
      setAlertaHacia(haciaMonte);
      setModoPerro('dalmata', 'alerta');
      setModoPerro('beagle', 'alerta');
    } else if (fase === null) {
      resetPerrosGuardianes();
    }
    // haciaMonte es config estable del host; la fase es el evento real.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  /* Red de seguridad: desmontar el overlay jamás deja perros invisibles. */
  useEffect(() => () => resetPerrosGuardianes(), []);

  if (fase === 'transformacion' || fase === 'despedida') {
    const sentido = fase === 'transformacion' ? 'heroe' : 'normal';
    return (
      <>
        {PAREJA.map((perro, i) => (
          <PerroTransicion
            key={`${perro}-${sentido}`}
            perro={perro}
            sentido={sentido}
            delayMs={i * ESCALON_PERROS_MS}
            x={(posiciones[perro] || POSICIONES_GUARDIANES[perro]).x}
            y={(posiciones[perro] || POSICIONES_GUARDIANES[perro]).y}
            tier={tier}
            reducedMotion={reducedMotion}
          />
        ))}
      </>
    );
  }

  if (fase === 'guardia' || fase === 'paso') {
    return (
      <>
        {PAREJA.map((perro) => (
          <GuardianEnPantalla
            key={perro}
            perro={perro}
            fase={fase}
            pos={posiciones[perro] || POSICIONES_GUARDIANES[perro]}
            mira={mira}
            tier={tier}
            reducedMotion={reducedMotion}
          />
        ))}
      </>
    );
  }

  return null; // tranquilo / 'aparece': los perros son 3D y el valle sigue
}
