import { useEffect, useRef, useState } from 'react';

/**
 * useInteraccionUsuario — señal de "el usuario está usando la pantalla AHORA".
 *
 * Escucha actividad global (puntero, scroll, tacto, teclado) y devuelve
 * `interactuando=true` mientras haya habido actividad reciente; vuelve a
 * `false` tras `quietMs` de quietud. Es la base de la política dura del compai
 * (POLITICA-COMPAI-COMPORTAMIENTO-2D-3D.md):
 *   - R2 "se quita al interactuar": el compai se oculta cuando interactuando=true.
 *   - R3 "enseña en idle": el compai enseña cuando interactuando=false.
 *
 * Al MONTAR arranca en `false` (el usuario acaba de llegar a la pantalla y aún
 * no la toca) → el compai puede enseñar de una. Las escuchas son `passive` para
 * no frenar el scroll, y sólo re-renderiza en las TRANSICIONES quieto↔activo
 * (no en cada `pointermove`).
 */
export default function useInteraccionUsuario(quietMs = 3500) {
  const [interactuando, setInteractuando] = useState(false);
  const timerRef = useRef(null);
  const activoRef = useRef(false);

  useEffect(() => {
    const marcarQuieto = () => {
      activoRef.current = false;
      setInteractuando(false);
    };
    const marcarActivo = () => {
      if (!activoRef.current) {
        activoRef.current = true;
        setInteractuando(true);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(marcarQuieto, quietMs);
    };

    const eventos = ['mouseover', 'pointerdown', 'pointermove', 'wheel', 'touchstart', 'touchmove', 'keydown', 'scroll'];
    const opts = { passive: true, capture: true };
    eventos.forEach((ev) => window.addEventListener(ev, marcarActivo, opts));

    return () => {
      eventos.forEach((ev) => window.removeEventListener(ev, marcarActivo, opts));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [quietMs]);

  return interactuando;
}
