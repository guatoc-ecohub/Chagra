/*
 * useCicloDia — EL RELOJ del ciclo diurno vivo (hook compartido, three-free).
 *
 * Una sola fuente de "qué hora es en el valle" para la entrada 3D y para los
 * mundos (EscenaBase3D): deriva la FRANJA del día (amanecer → mañana → mediodía
 * → tarde → atardecer → noche, cielosHoraData.franjaDeHoraDecimal) de la hora
 * REAL del dispositivo y se refresca sola cada minuto — el valle amanece,
 * atardece y anochece sin botonera (auditoría B8/S8: el clima es atmósfera,
 * no un selector).
 *
 * OVERRIDE por URL (dev/demo/QA, nunca UI de producto): `?ciclo=`
 *   · `ciclo=demo` (o `rapido`)  → día ACELERADO: las 24 h pasan en ~3 min,
 *     arrancando en la hora real (continuidad, no un salto). Para VER el ciclo
 *     girar completo en una demo.
 *   · `ciclo=6` / `ciclo=17.5`   → hora FIJA (decimal). Para fotografiar una
 *     franja exacta o depurar una paleta.
 * Se lee del hash o del search (la app enruta por hash: #/ruta?ciclo=demo).
 *
 * reducedMotion: el modo demo se APAGA (la franja real del reloj, digna y
 * fija, sin día-timelapse); la hora fija explícita sí se respeta (es estática).
 */
import { useEffect, useMemo, useState } from 'react';
import { franjaDeHoraDecimal } from './cielosHoraData.js';

/* Un día completo del modo demo, en ms (~7.5 s por hora: cada franja se ve). */
const DIA_DEMO_MS = 180000;

/** Hora decimal (0..24) del reloj real. */
export function horaDecimal(fecha = new Date()) {
  return fecha.getHours() + fecha.getMinutes() / 60 + fecha.getSeconds() / 3600;
}

/**
 * Lee el override `ciclo=` de una location (hash y search).
 * @returns {{ modo: 'demo' } | { modo: 'fijo', hora: number } | null}
 */
export function leerCicloParam(loc = typeof window !== 'undefined' ? window.location : null) {
  if (!loc) return null;
  const m = `${loc.hash || ''}${loc.search || ''}`.match(/[?&]ciclo=([^&#]+)/);
  if (!m) return null;
  const v = decodeURIComponent(m[1]);
  if (v === 'demo' || v === 'rapido') return { modo: 'demo' };
  const n = Number(v);
  if (Number.isFinite(n)) return { modo: 'fijo', hora: ((n % 24) + 24) % 24 };
  return null;
}

/**
 * La franja del día, viva: se re-evalúa sola (cada minuto en tiempo real; cada
 * segundo en el día acelerado del modo demo).
 *
 * @param {object} [opts]
 * @param {boolean} [opts.reducedMotion=false]  apaga el modo demo (franja fija).
 * @returns {{ hora: number, franja: 'amanecer'|'manana'|'mediodia'|'tarde'|'atardecer'|'noche', demo: boolean }}
 */
export default function useCicloDia({ reducedMotion = false } = {}) {
  const param = useMemo(() => leerCicloParam(), []);
  const demo = !reducedMotion && param?.modo === 'demo';
  const [hora, setHora] = useState(() => (param?.modo === 'fijo' ? param.hora : horaDecimal()));

  useEffect(() => {
    if (param?.modo === 'fijo') return undefined;
    if (demo) {
      // Día acelerado, anclado a la hora real de arranque (continuidad).
      const t0 = Date.now();
      const h0 = horaDecimal();
      const id = setInterval(
        () => setHora((h0 + ((Date.now() - t0) / DIA_DEMO_MS) * 24) % 24),
        1000,
      );
      return () => clearInterval(id);
    }
    const id = setInterval(() => setHora(horaDecimal()), 60000);
    return () => clearInterval(id);
  }, [demo, param]);

  return { hora, franja: franjaDeHoraDecimal(hora), demo };
}
