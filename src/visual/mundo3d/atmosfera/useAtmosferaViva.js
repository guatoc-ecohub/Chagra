/*
 * useAtmosferaViva — EL MOMENTO VIVO de la finca como hook (three-free).
 *
 * Une las dos ruedas del tiempo real en un solo valor consumible:
 *   - la HORA, del reloj vivo compartido (useCicloDia: hora real del
 *     dispositivo refrescada cada minuto, con sus overrides `?ciclo=demo`
 *     día-acelerado y `?ciclo=17.5` hora fija — mismas perillas de QA que ya
 *     usa el ciclo diurno; aquí no se inventan otras).
 *   - la TEMPORADA, del calendario real bimodal (temporadaDeFecha), con
 *     override propio `?temporada=lluvia|seca` para fotografiar el verde de
 *     lluvia en pleno enero.
 *
 * Devuelve `{ hora, franja, temporada, demo, preset }` donde `preset` ya trae
 * TODO montado (arco continuo de la hora + modificador de temporada): luces,
 * niebla, paleta, pasto y extras (rocio/ventanas/charcos/polvo/estrellas…).
 *
 * QUIÉN LO USA: cualquier mundo (2D o 3D). El 3D normalmente no lo llama
 * directo sino vía <AtmosferaViva/> (que además anima la transición); el 2D
 * digno o un panel pueden leer aquí la paleta sin pagar three.
 *
 * Rendimiento: el preset se memoiza por (hora-al-minuto, temporada) — en
 * tiempo real recalcula una vez por minuto; en `?ciclo=demo` una por segundo.
 * Es aritmética pura de enteros (~40 lerps), sin alocación THREE.
 */
import { useMemo } from 'react';
import useCicloDia from '../useCicloDia.js';
import { franjaViva, presetAtmosferaViva, temporadaDeFecha } from './atmosferaVivaData.js';

/**
 * Lee el override `?temporada=` de una location (hash y search — la app
 * enruta por hash: #/ruta?temporada=lluvia). Perilla de dev/QA, nunca UI.
 * @returns {'lluvia'|'seca'|null}
 */
export function leerTemporadaParam(loc = typeof window !== 'undefined' ? window.location : null) {
  if (!loc) return null;
  const m = `${loc.hash || ''}${loc.search || ''}`.match(/[?&]temporada=(lluvia|seca)/);
  return m ? /** @type {'lluvia'|'seca'} */ (m[1]) : null;
}

/**
 * El momento vivo de la finca, listo para vestir un mundo.
 *
 * @param {object} [opts]
 * @param {number|null} [opts.hora=null]        hora decimal FIJA (0..24) para
 *        escenas congeladas o QA; null = el reloj real (útil de verdad).
 * @param {'lluvia'|'seca'|'auto'} [opts.temporada='auto']  temporada explícita
 *        o 'auto' (URL override → calendario bimodal real).
 * @param {boolean} [opts.reducedMotion=false]  apaga el día-acelerado demo.
 * @returns {{ hora: number, franja: 'madrugada'|'manana'|'mediodia'|'tarde'|'atardecer'|'noche', temporada: 'lluvia'|'seca', demo: boolean, preset: Record<string, any> }}
 */
export default function useAtmosferaViva({
  hora = null,
  temporada = 'auto',
  reducedMotion = false,
} = {}) {
  const ciclo = useCicloDia({ reducedMotion });
  const h = typeof hora === 'number' ? ((hora % 24) + 24) % 24 : ciclo.hora;

  const paramTemporada = useMemo(() => leerTemporadaParam(), []);
  const temporadaViva =
    temporada === 'lluvia' || temporada === 'seca'
      ? temporada
      : paramTemporada || temporadaDeFecha();

  /* Cuantizada al minuto: memo estable (el arco continuo no se nota más fino
     que esto y el recálculo queda en 1/min). */
  const hMinuto = Math.round(h * 60) / 60;
  const preset = useMemo(
    () => presetAtmosferaViva(hMinuto, temporadaViva),
    [hMinuto, temporadaViva],
  );

  return {
    hora: h,
    franja: franjaViva(h),
    temporada: temporadaViva,
    demo: ciclo.demo,
    preset,
  };
}
