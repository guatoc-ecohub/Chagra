/*
 * atmosfera/ — el SISTEMA DE ATMÓSFERAS del ciclo día-vivo (pieza A4).
 *
 * La finca respira con el reloj y el calendario REALES del campesino:
 * madrugada azul de niebla pesada a las 4:30, mediodía vertical, atardecer
 * que sube de la quebrada, noche de estrellas de montaña — y la temporada
 * bimodal colombiana (lluvia verde vs seca de pasto paja; aquí "invierno"
 * es lluvia, no primavera/otoño).
 *
 * Tres capas, cada una consumible sola:
 *   - atmosferaVivaData  → datos puros three-free (arco continuo del día,
 *                          temporadas, presetAtmosferaViva(h, temporada)).
 *   - useAtmosferaViva   → hook (reloj real + calendario + overrides QA).
 *   - AtmosferaViva      → componente r3f: EL cielo de una escena (reemplaza
 *                          su bloque fondo/fog/luces). Tier-safe.
 *   - DemoAtmosferaViva  → viñeta aislada de QA/arte (no cableada a rutas).
 */
export { default as AtmosferaViva } from './AtmosferaViva.jsx';
export { default as useAtmosferaViva, leerTemporadaParam } from './useAtmosferaViva.js';
export { default as DemoAtmosferaViva } from './DemoAtmosferaViva.jsx';
export {
  FRANJAS_VIVAS,
  franjaViva,
  MADRUGADA,
  ARCO_DIA,
  mezclarVivos,
  presetVivoDeHora,
  TEMPORADAS,
  aplicarTemporada,
  MESES_LLUVIA,
  temporadaDeFecha,
  presetAtmosferaViva,
} from './atmosferaVivaData.js';
